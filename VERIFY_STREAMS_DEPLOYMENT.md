# Verifying DynamoDB Streams Deployment

This document describes how to verify that DynamoDB Streams and Lambda integration have been deployed successfully.

## Step 1: Check CloudFormation Stack Events

Look for the Amplify backend stack deployment in CloudFormation console and verify:

1. **DynamoDB Stream Enabled**
   - Find the Job table resource
   - Check that `StreamSpecification` is set with `StreamViewType: NEW_AND_OLD_IMAGES`
   - Verify `StreamArn` is present

2. **Lambda Event Source Mapping Created**
   - Find the `JobTableStreamMapping` or similar resource
   - Verify it connects the Job table stream to the render-trigger Lambda
   - Check that `StartingPosition` is set to `LATEST`

## Step 2: Check Lambda Configuration

In the AWS Lambda console:

1. Navigate to the `render-trigger` function
2. Click on "Configuration" tab → "Triggers"
3. Verify you see a "DynamoDB" trigger listed
4. Click on the trigger to see details:
   - Source: Job table stream ARN
   - Batch size: 10
   - Starting position: Latest
   - Enabled: Yes
   - Filters: Should show filters for INSERT/MODIFY with status='queued' and kind='render'

## Step 3: Check DynamoDB Table

In the DynamoDB console:

1. Navigate to the Job table
2. Click on "Exports and streams" tab
3. Verify "DynamoDB stream details" shows:
   - Stream enabled: Yes
   - Stream view type: New and old images
   - Stream ARN: arn:aws:dynamodb:...

## Step 4: Check Deployment Logs

In the Amplify console:

1. Go to your app → "Hosting" → "Build history"
2. Click on the latest build (#107 or later)
3. Check the backend build logs for:
   ```
   ✓ Enabling DynamoDB Streams on Job table via AmplifyDynamoDbTableWrapper
   ```
4. If you see errors about table not found, check:
   ```
   Available amplifyDynamoDbTables: [...]
   ```

## Step 5: Test End-to-End

Run the test script to create a job and verify the stream triggers:

```bash
export PATH="/opt/homebrew/bin:$PATH"
export AWS_REGION=us-east-1
export WORKER_EMAIL=render-worker@babulus.internal
export WORKER_PASSWORD=BabulusRenderWorker2026!

npx tsx test-dynamodb-streams.ts
```

Expected behavior:
1. Job is created in DynamoDB with status='queued'
2. DynamoDB Stream sends event to Lambda within 1 second
3. Lambda processes event and starts ECS task
4. CloudWatch Logs show Lambda invocation and ECS task start

## Step 6: Monitor Lambda Execution

In CloudWatch Logs:

1. Find the log group: `/aws/lambda/render-trigger-...`
2. Look for recent log streams (within last minute after creating job)
3. Expected log messages:
   ```
   Render trigger Lambda invoked by DynamoDB Stream (1 records)
   Found 1 queued render job(s) in stream
   Starting ECS task for job <job-id>...
   ✓ ECS task started: arn:aws:ecs:us-east-1:...
   ```

## Step 7: Verify ECS Task Started

In ECS console:

1. Navigate to the render cluster
2. Click on "Tasks" tab
3. Look for recently started task (within last minute)
4. Check tags:
   - JobId: Should match the test job ID
   - VideoId: test-video-123
5. Check task status: RUNNING or STOPPED (if already completed)

## Troubleshooting

### Stream Not Enabled

If stream is not enabled on the table:
- Check backend.ts deployment logs
- Verify `amplifyDynamoDbTables['Job']` exists
- The issue was likely accessing the table - check if cfnResources.amplifyDynamoDbTables is populated

### Lambda Not Triggered

If Lambda doesn't trigger when job is created:
- Verify event source mapping is enabled
- Check filter configuration matches job attributes exactly
- Ensure job has both `status='queued'` and `kind='render'`
- Check Lambda execution role has permissions to read DynamoDB Stream

### Lambda Fails to Start ECS Task

If Lambda is triggered but doesn't start task:
- Check Lambda CloudWatch Logs for error messages
- Verify Lambda has ECS permissions (ecs:RunTask)
- Check ECS task definition exists and is valid
- Verify VPC/subnet/security group configuration

## Success Criteria

✅ All checks pass when:
1. DynamoDB Streams enabled on Job table
2. Lambda event source mapping exists and is enabled
3. Creating a render job triggers Lambda within 1 second
4. Lambda successfully starts an ECS Fargate task
5. ECS task processes the job and completes

## Next Steps After Verification

Once streams are working:
1. Remove the old EventBridge polling rule (if still present)
2. Test with real video rendering jobs
3. Monitor stream processing latency and Lambda costs
4. Consider adjusting batch size and retry settings based on volume
