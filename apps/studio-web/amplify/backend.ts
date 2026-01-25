import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { storage } from "./storage/resource.js";
import { generationWorker } from "./functions/generation-worker/resource.js";
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = defineBackend({
  auth,
  data,
  storage,
  generationWorker,
});

// Get the S3 bucket from Amplify Storage
const bucket = backend.storage.resources.bucket;

// Create Lambda@Edge function for authorization
const edgeAuth = new lambda.Function(backend.stack, 'EdgeAuthFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, 'edge-functions/auth')),
});

// Create CloudFront distribution
const distribution = new cloudfront.Distribution(backend.stack, 'AssetCDN', {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket),
    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    edgeLambdas: [{
      eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
      functionVersion: edgeAuth.currentVersion,
    }],
  },
});

// Export CloudFront domain for use in app
backend.addOutput({
  custom: {
    assetsDomain: distribution.distributionDomainName,
  },
});

// ==========================================
// Generation Worker Lambda Configuration
// ==========================================

// Grant generation worker access to AppSync GraphQL API
backend.generationWorker.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['appsync:GraphQL'],
    resources: [backend.data.resources.graphqlApi.arn + '/*'],
  })
);

// Grant generation worker access to S3 bucket for artifact upload
bucket.grantReadWrite(backend.generationWorker.resources.lambda);

// Create EventBridge rule to trigger generation worker every 30 seconds
const generationWorkerRule = new events.Rule(backend.stack, 'GenerationWorkerSchedule', {
  schedule: events.Schedule.rate(Duration.seconds(30)),
  description: 'Poll for queued generation jobs every 30 seconds',
});

// Add generation worker Lambda as target
generationWorkerRule.addTarget(
  new targets.LambdaFunction(backend.generationWorker.resources.lambda)
);

console.log('Generation worker Lambda configured with EventBridge scheduler');

// ==========================================
// CloudWatch Monitoring & Alerting
// ==========================================

const workerLambda = backend.generationWorker.resources.lambda;

// Create SNS topic for alerts (optional - can be configured later)
const alertTopic = new sns.Topic(backend.stack, 'GenerationWorkerAlerts', {
  displayName: 'Generation Worker Alerts',
  topicName: 'babulus-generation-worker-alerts',
});

// Alarm: High error rate (>10% failures)
const errorRateAlarm = new cloudwatch.Alarm(backend.stack, 'WorkerHighErrorRate', {
  alarmName: 'babulus-worker-high-error-rate',
  alarmDescription: 'Generation worker error rate exceeds 10%',
  metric: new cloudwatch.MathExpression({
    expression: "100 * errors / invocations",
    usingMetrics: {
      errors: workerLambda.metricErrors({ period: Duration.minutes(5) }),
      invocations: workerLambda.metricInvocations({ period: Duration.minutes(5) }),
    },
    period: Duration.minutes(5),
    label: "Error Rate (%)",
  }),
  threshold: 10, // 10% error rate
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

// Add SNS action to alarm
errorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

// Alarm: Long execution time (>5 minutes)
const durationAlarm = new cloudwatch.Alarm(backend.stack, 'WorkerLongExecution', {
  alarmName: 'babulus-worker-long-execution',
  alarmDescription: 'Generation worker execution time exceeds 5 minutes',
  metric: workerLambda.metricDuration({
    period: Duration.minutes(5),
    statistic: 'Maximum',
  }),
  threshold: Duration.minutes(5).toMilliseconds(),
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

durationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

// Alarm: No successful completions (dead worker)
const successMetric = new cloudwatch.Metric({
  namespace: 'AWS/Lambda',
  metricName: 'Invocations',
  dimensionsMap: {
    FunctionName: workerLambda.functionName,
  },
  statistic: 'Sum',
  period: Duration.minutes(10),
});

const noSuccessAlarm = new cloudwatch.Alarm(backend.stack, 'WorkerNoSuccess', {
  alarmName: 'babulus-worker-no-completions',
  alarmDescription: 'No successful generation completions in 10 minutes',
  metric: successMetric,
  threshold: 0,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.BREACHING, // Alarm if no data
});

noSuccessAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

// CloudWatch Dashboard
const dashboard = new cloudwatch.Dashboard(backend.stack, 'GenerationWorkerDashboard', {
  dashboardName: 'babulus-generation-worker',
});

// Add widgets to dashboard
dashboard.addWidgets(
  // Row 1: Lambda metrics
  new cloudwatch.GraphWidget({
    title: 'Lambda Invocations',
    left: [workerLambda.metricInvocations()],
    width: 12,
  }),
  new cloudwatch.GraphWidget({
    title: 'Lambda Errors',
    left: [workerLambda.metricErrors()],
    width: 12,
  })
);

dashboard.addWidgets(
  // Row 2: Performance metrics
  new cloudwatch.GraphWidget({
    title: 'Execution Duration',
    left: [
      workerLambda.metricDuration({
        statistic: 'Average',
        label: 'Average',
      }),
      workerLambda.metricDuration({
        statistic: 'Maximum',
        label: 'Maximum',
      }),
    ],
    width: 12,
  }),
  new cloudwatch.GraphWidget({
    title: 'Throttles',
    left: [workerLambda.metricThrottles()],
    width: 12,
  })
);

console.log('CloudWatch monitoring configured:');
console.log('- SNS Topic:', alertTopic.topicArn);
console.log('- Dashboard:', dashboard.dashboardName);
console.log('- Alarms: error rate, long execution, no completions');

// ==========================================
// Render Worker ECS Fargate Configuration
// ==========================================

// Create ECR repository for render worker Docker image
const renderWorkerEcr = new ecr.Repository(backend.stack, 'RenderWorkerRepository', {
  repositoryName: 'babulus-render-worker',
  removalPolicy: RemovalPolicy.RETAIN, // Keep images on stack deletion
  imageScanOnPush: true,
});

// Create VPC for ECS tasks (or use default VPC)
const vpc = new ec2.Vpc(backend.stack, 'RenderWorkerVPC', {
  maxAzs: 2, // Use 2 availability zones
  natGateways: 1, // One NAT gateway for cost optimization
});

// Create ECS cluster
const renderCluster = new ecs.Cluster(backend.stack, 'RenderWorkerCluster', {
  vpc,
  clusterName: 'babulus-render-cluster',
  containerInsights: true, // Enable CloudWatch Container Insights
});

// Create task execution role (for pulling images and logging)
const taskExecutionRole = new iam.Role(backend.stack, 'RenderTaskExecutionRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
  ],
});

// Create task role (for accessing AWS services from the container)
const taskRole = new iam.Role(backend.stack, 'RenderTaskRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
});

// Grant task role access to AppSync GraphQL API
taskRole.addToPolicy(
  new iam.PolicyStatement({
    actions: ['appsync:GraphQL'],
    resources: [backend.data.resources.graphqlApi.arn + '/*'],
  })
);

// Grant task role access to S3 bucket
bucket.grantReadWrite(taskRole);

// Define Fargate task definition
const renderTaskDefinition = new ecs.FargateTaskDefinition(backend.stack, 'RenderTaskDefinition', {
  cpu: 4096, // 4 vCPU (needed for video rendering)
  memoryLimitMiB: 16384, // 16 GB (needed for Playwright + ffmpeg)
  executionRole: taskExecutionRole,
  taskRole: taskRole,
});

// Add container to task definition
const renderContainer = renderTaskDefinition.addContainer('RenderWorkerContainer', {
  image: ecs.ContainerImage.fromEcrRepository(renderWorkerEcr, 'latest'),
  logging: ecs.LogDrivers.awsLogs({
    streamPrefix: 'render-worker',
    logRetention: logs.RetentionDays.ONE_WEEK,
  }),
  environment: {
    AWS_REGION: backend.stack.region,
    NODE_ENV: 'production',
  },
  // Secrets would be added here for API keys
  // secrets: {
  //   OPENAI_API_KEY: ecs.Secret.fromSecretsManager(openAiSecret),
  // },
});

// Create Lambda function to trigger ECS task when render job is created
const renderTriggerLambda = new lambda.Function(backend.stack, 'RenderTriggerFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
    const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
    const ecs = new ECSClient({});

    exports.handler = async (event) => {
      console.log('Render trigger invoked', { event });

      // This Lambda would poll for render jobs and start ECS tasks
      // For now, it's a placeholder for the trigger mechanism

      const command = new RunTaskCommand({
        cluster: process.env.CLUSTER_ARN,
        taskDefinition: process.env.TASK_DEFINITION_ARN,
        launchType: 'FARGATE',
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: process.env.SUBNETS.split(','),
            assignPublicIp: 'ENABLED',
          },
        },
      });

      try {
        const response = await ecs.send(command);
        console.log('ECS task started', { response });
        return { statusCode: 200, body: 'Task started' };
      } catch (error) {
        console.error('Failed to start ECS task', { error });
        return { statusCode: 500, body: error.message };
      }
    };
  `),
  timeout: Duration.seconds(30),
  environment: {
    CLUSTER_ARN: renderCluster.clusterArn,
    TASK_DEFINITION_ARN: renderTaskDefinition.taskDefinitionArn,
    SUBNETS: vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
  },
});

// Grant Lambda permission to run ECS tasks
renderTriggerLambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['ecs:RunTask', 'ecs:DescribeTasks'],
    resources: [renderTaskDefinition.taskDefinitionArn],
  })
);

renderTriggerLambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['iam:PassRole'],
    resources: [taskExecutionRole.roleArn, taskRole.roleArn],
  })
);

// Create EventBridge rule to trigger render worker periodically
const renderWorkerRule = new events.Rule(backend.stack, 'RenderWorkerSchedule', {
  schedule: events.Schedule.rate(Duration.minutes(1)), // Poll every minute
  description: 'Poll for queued render jobs every minute',
});

renderWorkerRule.addTarget(new targets.LambdaFunction(renderTriggerLambda));

// Export ECR repository URI for Docker build/push
backend.addOutput({
  custom: {
    renderWorkerEcrUri: renderWorkerEcr.repositoryUri,
    renderClusterName: renderCluster.clusterName,
  },
});

console.log('Render worker ECS Fargate configured:');
console.log('- ECR Repository:', renderWorkerEcr.repositoryName);
console.log('- ECS Cluster:', renderCluster.clusterName);
console.log('- Task Definition: 4 vCPU, 16 GB RAM');
console.log('- Trigger: EventBridge rule every 1 minute');
