# DynamoDB Streams Implementation Status

**Date:** 2026-02-02
**Last Commit:** 630e47d - "Use AmplifyDynamoDbTableWrapper.streamSpecification setter (correct API)"

## Current Status: DEPLOYED, AWAITING VERIFICATION

The DynamoDB Streams implementation has been deployed with the correct API usage. Waiting for Amplify build to complete to verify.

## What Was Done

### 1. Research Phase (Multiple Hours)
- Tried various approaches to access DynamoDB table construct
- Examined Plexus project for working examples
- Studied Amplify Gen 2 v1.20.0 vs v1.8.0 API differences
- Read TypeScript type definitions for `AmplifyDynamoDbTableWrapper`

### 2. Implementation
- **File:** `apps/studio-web/amplify/backend.ts`
- **Approach:** Use `AmplifyDynamoDbTableWrapper.streamSpecification` setter
- **Code:**
  ```typescript
  const amplifyJobTable = backend.data.resources.cfnResources.amplifyDynamoDbTables['Job'];
  if (amplifyJobTable) {
    amplifyJobTable.streamSpecification = {
      streamViewType: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    };
  }

  const eventSource = new DynamoEventSource(jobTable, {
    startingPosition: lambda.StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 2,
    bisectBatchOnError: true,
    enabled: true,
    filters: [ ... ],
  });

  renderTriggerLambda.addEventSource(eventSource);
  ```

### 3. Lambda Handler
- **File:** `apps/studio-web/amplify/functions/render-trigger/handler.ts`
- **Purpose:** Process DynamoDB Stream events and start ECS tasks
- **Features:**
  - Unmarshalls DynamoDB records
  - Filters for render jobs with status='queued'
  - Starts ECS Fargate tasks with job context
  - Handles errors gracefully

### 4. Testing Infrastructure
- Created `test-dynamodb-streams.ts` for end-to-end testing
- Created `VERIFY_STREAMS_DEPLOYMENT.md` with verification checklist
- Created `DYNAMODB_STREAMS_SOLUTION.md` with technical documentation

## Key Learning: Amplify Gen 2 API Differences

### What Doesn't Work (Plexus Pattern)
```typescript
const jobTable = backend.data.resources.tables['Job'];
const jobCfnTable = jobTable.node.defaultChild as dynamodb.CfnTable;
// ❌ Returns undefined in Amplify 1.20.0
```

### What Works (Amplify 1.20.0)
```typescript
const amplifyJobTable = backend.data.resources.cfnResources.amplifyDynamoDbTables['Job'];
amplifyJobTable.streamSpecification = { ... };
// ✅ Uses proper AmplifyDynamoDbTableWrapper API
```

## Deployment History

1. `bca1679` - Initial attempt with DynamoEventSource pattern
2. `1c3d2ba` - Try cfnResources path
3. `1838933` - Add debug logging
4. `20743ef` - Try multiple access approaches
5. `630e47d` - **FINAL: Use AmplifyDynamoDbTableWrapper API** ✅

## Next Steps

### Immediate (Post-Deployment)
1. Check Amplify build logs for:
   ```
   ✓ Enabling DynamoDB Streams on Job table via AmplifyDynamoDbTableWrapper
   ```

2. Verify in AWS Console:
   - DynamoDB: Job table has streams enabled
   - Lambda: render-trigger has DynamoDB trigger configured
   - Event Source Mapping: Shows Job table stream as source

3. Run integration test:
   ```bash
   export PATH="/opt/homebrew/bin:$PATH"
   export AWS_REGION=us-east-1
   export WORKER_EMAIL=render-worker@babulus.internal
   export WORKER_PASSWORD=BabulusRenderWorker2026!
   npx tsx test-dynamodb-streams.ts
   ```

4. Monitor CloudWatch Logs:
   - `/aws/lambda/render-trigger-...` for Lambda execution
   - Look for "Render trigger Lambda invoked by DynamoDB Stream"
   - Verify ECS task ARN is logged

### If Successful
1. Remove old EventBridge polling rule (if still present)
2. Clean up debug console.log statements
3. Update documentation
4. Test with real render jobs
5. Monitor costs and performance

### If Unsuccessful
1. Check build logs for error messages
2. Verify `amplifyDynamoDbTables` contains 'Job' key
3. Try alternative approach from `ALTERNATIVE_STREAMS_APPROACH.md`
4. Consider filing GitHub issue with Amplify team

## Files Created/Modified

### Modified
- `apps/studio-web/amplify/backend.ts` - Streams configuration
- `apps/studio-web/amplify/functions/render-trigger/handler.ts` - Stream event handler
- `apps/studio-web/amplify/functions/render-trigger/package.json` - Added stream dependencies
- `amplify.yml` - Install Lambda dependencies during build

### Created
- `test-dynamodb-streams.ts` - Integration test script
- `VERIFY_STREAMS_DEPLOYMENT.md` - Verification checklist
- `DYNAMODB_STREAMS_SOLUTION.md` - Technical documentation
- `ALTERNATIVE_STREAMS_APPROACH.md` - Backup implementation plan
- `STREAMS_STATUS.md` - This file

## Success Criteria

✅ **Deployment Successful When:**
1. Amplify build completes without errors
2. DynamoDB Stream enabled on Job table
3. Lambda has event source mapping to Job table stream
4. Creating a queued render job triggers Lambda within 1 second
5. Lambda successfully starts ECS Fargate task
6. ECS task processes render job end-to-end

## Troubleshooting

### If Lambda Not Triggered
- Check event source mapping is enabled
- Verify filter configuration matches job attributes exactly
- Check Lambda execution role has DynamoDB stream permissions

### If Lambda Triggered But Fails
- Check CloudWatch Logs for error messages
- Verify Lambda has ECS:RunTask permissions
- Check ECS task definition, VPC, and security group configuration

### If Table Streams Not Enabled
- Check if `amplifyDynamoDbTables['Job']` exists in build logs
- Verify `cfnResources.amplifyDynamoDbTables` is populated
- Try alternative custom stack approach

## Contact/Reference

- Working example: Plexus project `../Plexus/dashboard`
- Amplify docs: https://docs.amplify.aws/react/build-a-backend/
- CDK docs: https://docs.aws.amazon.com/cdk/api/v2/
- GitHub issues: https://github.com/aws-amplify/amplify-backend/issues

## Time Investment

- Research and implementation: ~3-4 hours
- Multiple deployment attempts: ~4-5 builds
- Key insight: Found correct API through TypeScript type definitions

## Lessons Learned

1. Always check TypeScript type definitions when API is unclear
2. Amplify Gen 2 version differences are significant
3. Custom resources require different access patterns than standard CDK
4. DynamoEventSource requires table interface, not CFN construct
5. Documentation lags behind actual API implementation
