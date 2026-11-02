import { Annotations, Duration, Fn, RemovalPolicy, type Stack } from "aws-cdk-lib";
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { AttributeType, BillingMode, Table, TableEncryption } from "aws-cdk-lib/aws-dynamodb";
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Architecture, CfnPermission, CfnUrl, Function as LambdaFunction, type Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { FilterPattern, LogGroup, MetricFilter, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Topic } from "aws-cdk-lib/aws-sns";
import { CLI_APPROVE_PATH, CLI_CALLBACK_PATH } from "./callbacks";

export type CliRemoteLoginPlan = {
  /** The Studio's public https origin: where the approval pages are served and the Cognito return URL is registered. */
  origin: string;
  approvalUrl: string;
  callbackUri: string;
  /** The Amplify compute role the Studio's Next.js app runs as; it alone may invoke the pages function. */
  invokerRoleArn: string;
};

/**
 * `babulus login --remote` is off unless the deployment turns it on. With it off this returns nothing, and nothing else
 * in the backend (no broker, no pages function, no Cognito return URL, no output) changes.
 *
 * Every value comes from the deployment's environment (set in the Amplify app), never from this repository.
 */
export function planCliRemoteLogin(enabled: boolean, environment: Record<string, string | undefined>): CliRemoteLoginPlan | undefined {
  if (!enabled) return undefined;
  const origin = planAppOrigin(environment);
  if (!origin) {
    throw new Error("Remote CLI login needs BABULUS_APP_ORIGIN, the Studio's public https origin.");
  }
  const invokerRoleArn = (environment.BABULUS_CLI_INVOKER_ROLE_ARN ?? "").trim();
  if (!/^arn:aws[a-z-]*:iam::\d{12}:role\/.+$/.test(invokerRoleArn)) {
    throw new Error("Remote CLI login needs BABULUS_CLI_INVOKER_ROLE_ARN, the ARN of the Studio's Amplify compute role.");
  }
  return {
    origin,
    approvalUrl: `${origin}${CLI_APPROVE_PATH}`,
    callbackUri: `${origin}${CLI_CALLBACK_PATH}`,
    invokerRoleArn,
  };
}

/** The Studio's public https origin from BABULUS_APP_ORIGIN, or nothing when it is not set. A set but malformed value is an error. */
export function planAppOrigin(environment: Record<string, string | undefined>): string | undefined {
  const text = (environment.BABULUS_APP_ORIGIN ?? "").trim();
  if (text === "") return undefined;
  let origin: URL;
  try {
    origin = new URL(text);
  } catch {
    throw new Error(`BABULUS_APP_ORIGIN must be the Studio's public https origin, got ${text}.`);
  }
  if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search !== "" || origin.username !== "") {
    throw new Error(`BABULUS_APP_ORIGIN must be a plain https origin, got ${text}.`);
  }
  return origin.origin;
}

/** The jobs API the command talks to. The broker serves only this target, and the command sends its token only there. */
export function planCliApiEndpoint(environment: Record<string, string | undefined>): string | undefined {
  const text = (environment.BABULUS_JOBS_API_ENDPOINT ?? "").trim();
  if (text === "") return undefined;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error("BABULUS_JOBS_API_ENDPOINT must be the jobs API's https URL.");
  }
  if (url.protocol !== "https:" || url.username !== "" || url.search !== "" || url.hash !== "") {
    throw new Error("BABULUS_JOBS_API_ENDPOINT must be a plain https URL with no credentials, query or fragment.");
  }
  return text.replace(/\/+$/, "");
}

export type CliRemoteLoginProps = {
  plan: CliRemoteLoginPlan;
  /** The Cognito app client the command signs in with (the one `babulus-cli.json` publishes). */
  clientId: string;
  /** The jobs API the command signs in to; the broker serves only this target. */
  apiEndpoint: string;
  /** The Cognito hosted UI's `/oauth2/authorize` URL. */
  authorizeEndpoint: string;
  /** The product's name on the approval page. */
  product: string;
  brokerCode: Code;
  pagesCode: Code;
  /** The deployment's alarm topic. Both broker alarms notify it on alarm and on recovery; without it nobody is notified and synth warns. */
  alarmTopicArn?: string;
  /** The most broker invocations at once; bounds what an abusive caller can cause. */
  reservedConcurrency?: number;
};

export type CliRemoteLogin = {
  brokerEndpoint: string;
  brokerFunctionArn: string;
  pagesFunctionArn: string;
  remoteCallbackUri: string;
};

/**
 * One cli-login broker for the deployment, ported from cli-login's infra/broker.yaml with its security properties kept:
 * - the function URL takes no credentials, and the public permission covers only calls through that URL;
 * - the private operations (describe, bind, complete, deny) may be invoked only by the pages function's role;
 * - the broker may read and write only its own table, and its concurrency is reserved;
 * - a start-ceiling metric filter feeds an alarm, and so does throttling.
 * Plus the approval pages function, run from the same pinned cli-login release, that only the Studio's compute role may invoke.
 */
export function addCliRemoteLogin(stack: Stack, props: CliRemoteLoginProps): CliRemoteLogin {
  const transactions = new Table(stack, "Transactions", {
    partitionKey: { name: "pk", type: AttributeType.STRING },
    billingMode: BillingMode.PAY_PER_REQUEST,
    timeToLiveAttribute: "expires_at",
    encryption: TableEncryption.AWS_MANAGED,
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const brokerRole = new Role(stack, "BrokerRole", {
    assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
  });
  brokerRole.addToPolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"],
    resources: [transactions.tableArn],
  }));

  const brokerLogs = new LogGroup(stack, "BrokerLogs", { retention: RetentionDays.ONE_MONTH, removalPolicy: RemovalPolicy.DESTROY });
  const broker = new LambdaFunction(stack, "Broker", {
    runtime: Runtime.PYTHON_3_12,
    architecture: Architecture.ARM_64,
    handler: "cli_login.broker.handler.lambda_handler",
    code: props.brokerCode,
    role: brokerRole,
    timeout: Duration.seconds(10),
    memorySize: 256,
    reservedConcurrentExecutions: props.reservedConcurrency ?? 10,
    logGroup: brokerLogs,
    environment: {
      BROKER_TABLE: transactions.tableName,
      BROKER_CLIENT_ID: props.clientId,
      BROKER_TARGETS: Fn.join("", ['["', props.apiEndpoint, '"]']),
      BROKER_APPROVAL_URL: props.plan.approvalUrl,
      BROKER_CALLBACK_URI: props.plan.callbackUri,
    },
  });

  const brokerUrl = new CfnUrl(stack, "BrokerUrl", { targetFunctionArn: broker.functionArn, authType: "NONE" });
  new CfnPermission(stack, "PublicUrlPermission", {
    functionName: broker.functionName, action: "lambda:InvokeFunctionUrl", principal: "*", functionUrlAuthType: "NONE",
  });
  new CfnPermission(stack, "PublicUrlInvokePermission", {
    functionName: broker.functionName, action: "lambda:InvokeFunction", principal: "*", invokedViaFunctionUrl: true,
  });

  const pagesLogs = new LogGroup(stack, "PagesLogs", { retention: RetentionDays.ONE_MONTH, removalPolicy: RemovalPolicy.DESTROY });
  const pages = new LambdaFunction(stack, "Pages", {
    runtime: Runtime.PYTHON_3_12,
    architecture: Architecture.ARM_64,
    handler: "handler.handler",
    code: props.pagesCode,
    timeout: Duration.seconds(10),
    memorySize: 256,
    logGroup: pagesLogs,
    environment: {
      BROKER_FUNCTION_ARN: broker.functionArn,
      AUTHORIZE_ENDPOINT: props.authorizeEndpoint,
      PRODUCT: props.product,
      PRIVILEGES: "create and manage speech and video jobs for the Accounts you belong to, as you, until you sign out",
      IDENTITY_PROVIDER: "Google",
    },
  });
  new CfnPermission(stack, "PagesInvokePermission", {
    functionName: broker.functionName, action: "lambda:InvokeFunction", principal: pages.role!.roleArn,
  });
  new CfnPermission(stack, "SiteInvokePagesPermission", {
    functionName: pages.functionName, action: "lambda:InvokeFunction", principal: props.plan.invokerRoleArn,
  });

  new MetricFilter(stack, "StartCeilingFilter", {
    logGroup: brokerLogs,
    filterPattern: FilterPattern.literal('{ $.event = "cli_login_start_ceiling" }'),
    metricNamespace: "cli-login",
    metricName: "StartCeilingReached",
    metricValue: "1",
    defaultValue: 0,
  });
  const startCeilingAlarm = new Alarm(stack, "StartCeilingAlarm", {
    alarmDescription: "The cli-login broker refused starts at its ceiling across all callers (a flood from many addresses)",
    metric: new Metric({ namespace: "cli-login", metricName: "StartCeilingReached", statistic: "Sum", period: Duration.minutes(5) }),
    evaluationPeriods: 1,
    threshold: 0,
    comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    treatMissingData: TreatMissingData.NOT_BREACHING,
  });
  const throttledAlarm = new Alarm(stack, "ThrottledAlarm", {
    alarmDescription: "The cli-login broker is being throttled at its reserved concurrency",
    metric: broker.metricThrottles({ statistic: "Sum", period: Duration.minutes(5) }),
    evaluationPeriods: 1,
    threshold: 0,
    comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    treatMissingData: TreatMissingData.NOT_BREACHING,
  });

  if (props.alarmTopicArn) {
    const alarmAction = new SnsAction(Topic.fromTopicArn(stack, "AlarmTopic", props.alarmTopicArn));
    for (const alarm of [startCeilingAlarm, throttledAlarm]) {
      alarm.addAlarmAction(alarmAction);
      alarm.addOkAction(alarmAction);
    }
  } else {
    Annotations.of(stack).addWarning(
      "The remote-login broker alarms (StartCeilingAlarm, ThrottledAlarm) notify nobody: set BABULUS_ALARM_TOPIC_ARN to an SNS topic ARN.",
    );
  }

  return {
    brokerEndpoint: brokerUrl.attrFunctionUrl,
    brokerFunctionArn: broker.functionArn,
    pagesFunctionArn: pages.functionArn,
    remoteCallbackUri: props.plan.callbackUri,
  };
}
