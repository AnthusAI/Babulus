# DynamoDB Streams Solution for Amplify Gen 2

## Problem

Need to trigger render jobs instantly when they're created in DynamoDB, replacing 1-minute EventBridge polling with event-driven DynamoDB Streams.

## Solution Overview

Enable DynamoDB Streams on the Job table and connect it to a Lambda function that starts ECS Fargate tasks.

## Key Challenge

In Amplify Gen 2, tables created by `defineData` use a custom resource type `Custom::AmplifyDynamoDBTable` wrapped in `AmplifyDynamoDbTableWrapper`. The standard CDK pattern of accessing `table.node.defaultChild` doesn't work with these tables.

## Working Solution

### Step 1: Enable Streams via AmplifyDynamoDbTableWrapper

```typescript
// In amplify/backend.ts

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

// Access the table through cfnResources.amplifyDynamoDbTables (not resources.tables)
const amplifyJobTable = backend.data.resources.cfnResources.amplifyDynamoDbTables['Job'];

if (amplifyJobTable) {
  // Use the streamSpecification setter provided by AmplifyDynamoDbTableWrapper
  amplifyJobTable.streamSpecification = {
    streamViewType: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
  };
}
```

### Step 2: Create Event Source Mapping

```typescript
// Get the ITable reference (for DynamoEventSource)
const jobTable = backend.data.resources.tables['Job'];

// Create event source with filters
const eventSource = new DynamoEventSource(jobTable, {
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

// Add to Lambda function
renderTriggerLambda.addEventSource(eventSource);
```

## Why Other Approaches Don't Work

### ❌ Approach 1: node.defaultChild (Plexus pattern)

```typescript
const jobCfnTable = jobTable.node.defaultChild as dynamodb.CfnTable;
// Returns undefined - doesn't work with AmplifyDynamoDbTableWrapper
```

**Why it fails:** Amplify tables use a custom resource, not standard CfnTable.

### ❌ Approach 2: Direct CfnTable modification

```typescript
const cfnTable = backend.data.resources.tables['Job'] as dynamodb.CfnTable;
cfnTable.streamSpecification = { ... };
// Type error - not a CfnTable
```

**Why it fails:** Type mismatch, table is ITable interface, not CfnTable.

### ✅ Approach 3: AmplifyDynamoDbTableWrapper (CORRECT)

```typescript
const amplifyJobTable = backend.data.resources.cfnResources.amplifyDynamoDbTables['Job'];
amplifyJobTable.streamSpecification = { ... };
```

**Why it works:** Uses the proper API provided by Amplify for customizing generated tables.

## Key Insights

1. **Two different table references needed:**
   - `backend.data.resources.cfnResources.amplifyDynamoDbTables['Job']` - for enabling streams
   - `backend.data.resources.tables['Job']` - for creating event source (ITable interface)

2. **AmplifyDynamoDbTableWrapper provides setters:**
   - `streamSpecification`
   - `billingMode`
   - `timeToLiveAttribute`
   - `sseSpecification`
   - `deletionProtectionEnabled`
   - etc.

3. **Internal implementation:**
   ```typescript
   set streamSpecification(streamSpecification: StreamSpecification) {
     this.resource.addPropertyOverride('streamSpecification', streamSpecification);
   }
   ```

## Version Differences

- **Plexus (Amplify 1.8.0):** `table.node.defaultChild` works
- **Babulus (Amplify 1.20.0):** Must use `cfnResources.amplifyDynamoDbTables`

The API changed between versions to better encapsulate the custom resource implementation.

## Lambda Handler

The Lambda function processes DynamoDB Stream events:

```typescript
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export const handler = async (event: DynamoDBStreamEvent) => {
  // Extract jobs from stream records
  const jobs = event.Records
    .map(record => {
      if (!record.dynamodb?.NewImage) return null;
      const job = unmarshall(record.dynamodb.NewImage as any);
      if (job.kind !== 'render' || job.status !== 'queued') return null;
      return job;
    })
    .filter(Boolean);

  // Start ECS task for each job
  for (const job of jobs) {
    await ecs.send(new RunTaskCommand({ ... }));
  }
};
```

## Benefits Over Polling

- **Instant processing:** Stream triggers within ~1 second vs up to 1 minute delay
- **Cost savings:** Pay per event instead of per-minute Lambda invocations
- **Better UX:** Users see renders start immediately
- **Scalability:** Automatically handles bursts of jobs

## Testing

1. Deploy with streams enabled
2. Create a render job in DynamoDB
3. Verify Lambda triggered within 1 second
4. Check ECS task started
5. Monitor CloudWatch Logs

See `test-dynamodb-streams.ts` for automated test.

## References

- [AmplifyDynamoDbTableWrapper source](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-api-construct/src/amplify-dynamodb-table-wrapper.ts)
- [DynamoEventSource docs](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources.DynamoEventSource.html)
- [Amplify Gen 2 custom resources](https://docs.amplify.aws/react/build-a-backend/add-aws-services/custom-resources/)
