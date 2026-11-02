import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { storage } from "./storage/resource.js";
import { generationWorker } from "./functions/generation-worker/resource.js";
// import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
// import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
// import { experimental } from 'aws-cdk-lib/aws-cloudfront';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Duration } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const backend = defineBackend({
  auth,
  data,
  storage,
  generationWorker,
});

// Get the S3 bucket from Amplify Storage
const bucket = backend.storage.resources.bucket;

// TODO: Re-enable CloudFront distribution with Lambda@Edge
// Currently disabled to avoid cross-region deployment issues in Amplify sandbox
// See: https://github.com/aws-amplify/amplify-category-api/issues/xxxx
//
// To re-enable:
// 1. Ensure us-east-1 region is bootstrapped: npx cdk bootstrap aws://ACCOUNT/us-east-1
// 2. Uncomment the EdgeFunction and CloudFront distribution code below
//
// // Create Lambda@Edge function for authorization
// const edgeAuth = new experimental.EdgeFunction(backend.stack, 'EdgeAuthFunction', {
//   runtime: lambda.Runtime.NODEJS_20_X,
//   handler: 'index.handler',
//   code: lambda.Code.fromAsset(path.join(__dirname, 'edge-functions/auth')),
//   stackId: 'EdgeAuth',
// });
//
// // Create CloudFront distribution
// const distribution = new cloudfront.Distribution(backend.stack, 'AssetCDN', {
//   defaultBehavior: {
//     origin: new origins.S3Origin(bucket),
//     allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
//     viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
//     cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
//     edgeLambdas: [{
//       eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
//       functionVersion: edgeAuth.currentVersion,
//     }],
//   },
// });
//
// // Export CloudFront domain for use in app
// backend.addOutput({
//   custom: {
//     assetsDomain: distribution.distributionDomainName,
//   },
// });

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

// Create EventBridge rule to trigger generation worker every minute
const generationWorkerRule = new events.Rule(backend.stack, 'GenerationWorkerSchedule', {
  schedule: events.Schedule.rate(Duration.minutes(1)),
  description: 'Poll for queued generation jobs every minute',
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
// Rendering is local only
// ==========================================
//
// The Studio backend starts no container compute. Video renders run on a
// worker the user starts themselves (`babulus worker`), so there is no ECS
// cluster, task definition, render trigger or worker credential here, and
// nothing reads the Job table's change stream to launch work.
//
// The Job table's stream stays enabled only so this change does not touch the
// table; no consumer reads it, and turning it off is a separate, reviewed step.
const amplifyJobTable = backend.data.resources.cfnResources.amplifyDynamoDbTables['Job'];
if (amplifyJobTable) {
  amplifyJobTable.streamSpecification = {
    streamViewType: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
  };
}
