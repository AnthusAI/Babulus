# Alternative Approach: Custom CDK Stack for DynamoDB Streams

If the current approach using `AmplifyDynamoDbTableWrapper` doesn't work, here's an alternative approach using a custom CDK stack similar to the Plexus TaskDispatcherStack pattern.

## Approach: Create RenderTriggerStack

Create a custom CDK stack file that:
1. Accepts the Job table as a parameter
2. Enables streams on the table
3. Creates the Lambda function
4. Configures the event source mapping

### File: amplify/functions/render-trigger/resource.ts

```typescript
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

interface RenderTriggerStackProps extends StackProps {
  jobTable: ITable;
  clusterArn: string;
  taskDefinitionArn: string;
  subnetIds: string[];
  securityGroupId: string;
  containerName: string;
}

export class RenderTriggerStack extends Stack {
  public readonly renderTriggerFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: RenderTriggerStackProps) {
    super(scope, id, props);

    // Create the Lambda function
    this.renderTriggerFunction = new NodejsFunction(this, 'RenderTriggerFunction', {
      entry: path.join(__dirname, 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        CLUSTER_ARN: props.clusterArn,
        TASK_DEFINITION_ARN: props.taskDefinitionArn,
        SUBNET_IDS: props.subnetIds.join(','),
        SECURITY_GROUP_ID: props.securityGroupId,
        CONTAINER_NAME: props.containerName,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'], // AWS SDK v3 is available in Lambda runtime
      },
    });

    // Add ECS permissions
    this.renderTriggerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ecs:RunTask',
          'ecs:DescribeTasks',
          'ecs:ListTasks',
        ],
        resources: ['*'],
      })
    );

    // Add IAM pass role permission (needed to assign task role)
    this.renderTriggerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'iam:PassedToService': 'ecs-tasks.amazonaws.com',
          },
        },
      })
    );

    // Create event source from DynamoDB Stream
    const eventSource = new DynamoEventSource(props.jobTable, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 10,
      retryAttempts: 2,
      bisectBatchOnError: true,
      enabled: true,
      filters: [
        lambda.FilterCriteria.filter({
          eventName: lambda.FilterRule.isEqual('INSERT'),
          dynamodb: {
            NewImage: {
              status: { S: lambda.FilterRule.isEqual('queued') },
              kind: { S: lambda.FilterRule.isEqual('render') },
            },
          },
        }),
        lambda.FilterCriteria.filter({
          eventName: lambda.FilterRule.isEqual('MODIFY'),
          dynamodb: {
            NewImage: {
              status: { S: lambda.FilterRule.isEqual('queued') },
              kind: { S: lambda.FilterRule.isEqual('render') },
            },
          },
        }),
      ],
    });

    // Add the event source to the Lambda function
    this.renderTriggerFunction.addEventSource(eventSource);
  }
}
```

### Update backend.ts

```typescript
import { RenderTriggerStack } from './functions/render-trigger/resource.js';

// ... existing code ...

// Enable DynamoDB Streams on Job table
const jobTable = backend.data.resources.tables['Job'];
const amplifyJobTable = backend.data.resources.cfnResources.amplifyDynamoDbTables['Job'];
if (amplifyJobTable) {
  amplifyJobTable.streamSpecification = {
    streamViewType: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
  };
}

// Create RenderTriggerStack
const renderTriggerStack = new RenderTriggerStack(
  backend.createStack('RenderTriggerStack'),
  'RenderTrigger',
  {
    jobTable,
    clusterArn: renderCluster.clusterArn,
    taskDefinitionArn: renderTaskDefinition.taskDefinitionArn,
    subnetIds: privateSubnets.map(s => s.subnetId),
    securityGroupId: renderSecurityGroup.securityGroupId,
    containerName: 'render-worker',
  }
);

// Remove the old renderTriggerLambda and eventSource code since it's now in the stack
```

## Advantages

1. **Cleaner separation of concerns**: Lambda and event source configuration in one place
2. **Follows Plexus pattern**: Same approach that works in Plexus
3. **Better error handling**: Stack dependencies are managed by CDK
4. **Reusable**: Can be used for other stream-triggered functions

## When to Use This

Use this alternative approach if:
- The current `AmplifyDynamoDbTableWrapper` approach fails
- You see circular dependency errors
- You need more control over Lambda configuration
- You want to follow the proven Plexus pattern exactly

## Implementation Steps

1. Create the `resource.ts` file in `amplify/functions/render-trigger/`
2. Update `backend.ts` to use `RenderTriggerStack`
3. Remove the old Lambda function creation code
4. Deploy and test

## Trade-offs

**Pros:**
- More explicit and easier to debug
- Follows CDK best practices
- Matches working Plexus implementation

**Cons:**
- More code to maintain
- Slightly more complex structure
- Need to manage dependencies manually
