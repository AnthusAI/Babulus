#!/bin/bash

# Quick script to check DynamoDB Streams status in AWS
# Usage: ./check-streams-status.sh

set -e

echo "=========================================="
echo "DynamoDB Streams Status Check"
echo "=========================================="
echo ""

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured or invalid."
    echo "Run: aws configure"
    exit 1
fi

REGION="${AWS_REGION:-us-east-1}"
echo "Using region: $REGION"
echo ""

# Find Job table (it will have a stack-specific name)
echo "🔍 Finding Job table..."
JOB_TABLE=$(aws dynamodb list-tables --region $REGION --query "TableNames[?contains(@, 'Job')]" --output text | head -1)

if [ -z "$JOB_TABLE" ]; then
    echo "❌ Job table not found"
    echo "Available tables:"
    aws dynamodb list-tables --region $REGION --query "TableNames" --output table
    exit 1
fi

echo "✓ Found table: $JOB_TABLE"
echo ""

# Check if streams are enabled
echo "🔍 Checking if streams are enabled..."
STREAM_ARN=$(aws dynamodb describe-table \
    --table-name "$JOB_TABLE" \
    --region $REGION \
    --query "Table.LatestStreamArn" \
    --output text 2>/dev/null || echo "None")

if [ "$STREAM_ARN" == "None" ] || [ -z "$STREAM_ARN" ]; then
    echo "❌ DynamoDB Streams NOT enabled on table"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check Amplify build logs for errors"
    echo "2. Verify backend.ts deployed successfully"
    echo "3. Check if 'amplifyDynamoDbTables[\"Job\"]' exists in cfnResources"
    exit 1
fi

echo "✅ Streams ENABLED"
echo "Stream ARN: $STREAM_ARN"
echo ""

# Get stream details
echo "🔍 Stream details..."
STREAM_VIEW_TYPE=$(aws dynamodb describe-table \
    --table-name "$JOB_TABLE" \
    --region $REGION \
    --query "Table.StreamSpecification.StreamViewType" \
    --output text)

echo "View Type: $STREAM_VIEW_TYPE"
if [ "$STREAM_VIEW_TYPE" != "NEW_AND_OLD_IMAGES" ]; then
    echo "⚠️  Expected NEW_AND_OLD_IMAGES, got $STREAM_VIEW_TYPE"
fi
echo ""

# Find Lambda function
echo "🔍 Finding render-trigger Lambda..."
LAMBDA_FUNCTION=$(aws lambda list-functions --region $REGION \
    --query "Functions[?contains(FunctionName, 'render-trigger')].FunctionName" \
    --output text | head -1)

if [ -z "$LAMBDA_FUNCTION" ]; then
    echo "❌ render-trigger Lambda not found"
    echo "Available functions:"
    aws lambda list-functions --region $REGION --query "Functions[].FunctionName" --output table
    exit 1
fi

echo "✓ Found Lambda: $LAMBDA_FUNCTION"
echo ""

# Check event source mappings
echo "🔍 Checking event source mappings..."
MAPPING=$(aws lambda list-event-source-mappings \
    --function-name "$LAMBDA_FUNCTION" \
    --region $REGION \
    --query "EventSourceMappings[?contains(EventSourceArn, 'dynamodb')]" \
    --output json)

if [ "$MAPPING" == "[]" ]; then
    echo "❌ No DynamoDB event source mapping found for Lambda"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if DynamoEventSource was added to Lambda in backend.ts"
    echo "2. Verify backend deployment completed successfully"
    echo "3. Check CloudFormation stack for event source mapping resource"
    exit 1
fi

echo "✅ Event source mapping exists"
echo ""

# Show mapping details
STATE=$(echo "$MAPPING" | jq -r '.[0].State')
BATCH_SIZE=$(echo "$MAPPING" | jq -r '.[0].BatchSize')
STARTING_POSITION=$(echo "$MAPPING" | jq -r '.[0].StartingPosition')

echo "State: $STATE"
echo "Batch Size: $BATCH_SIZE"
echo "Starting Position: $STARTING_POSITION"

if [ "$STATE" != "Enabled" ]; then
    echo "⚠️  Event source mapping is not enabled!"
fi
echo ""

# Count recent Lambda invocations
echo "🔍 Checking recent Lambda invocations (last 1 hour)..."
START_TIME=$(($(date +%s) - 3600))000
INVOCATIONS=$(aws logs filter-log-events \
    --log-group-name "/aws/lambda/$LAMBDA_FUNCTION" \
    --start-time $START_TIME \
    --region $REGION \
    --filter-pattern "Render trigger Lambda invoked" \
    --query "events" \
    --output json 2>/dev/null || echo "[]")

INVOCATION_COUNT=$(echo "$INVOCATIONS" | jq '. | length')
echo "Invocations in last hour: $INVOCATION_COUNT"

if [ "$INVOCATION_COUNT" -gt 0 ]; then
    echo "✅ Lambda has been triggered by streams"
    echo ""
    echo "Most recent invocation:"
    echo "$INVOCATIONS" | jq -r '.[0].message' | head -5
else
    echo "⚠️  No stream-triggered invocations found in last hour"
    echo "   This is normal if no jobs were created"
fi
echo ""

# Check ECS cluster
echo "🔍 Checking ECS cluster..."
CLUSTER_NAME="babulus-render-cluster"
CLUSTER_ARN=$(aws ecs describe-clusters \
    --clusters "$CLUSTER_NAME" \
    --region $REGION \
    --query "clusters[0].clusterArn" \
    --output text 2>/dev/null || echo "None")

if [ "$CLUSTER_ARN" == "None" ]; then
    echo "❌ ECS cluster not found"
else
    echo "✓ Found cluster: $CLUSTER_ARN"

    # Check recent tasks
    RECENT_TASKS=$(aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --region $REGION \
        --query "taskArns" \
        --output json 2>/dev/null || echo "[]")

    TASK_COUNT=$(echo "$RECENT_TASKS" | jq '. | length')
    echo "Currently running tasks: $TASK_COUNT"
fi
echo ""

# Summary
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""

ALL_GOOD=true

if [ "$STREAM_ARN" == "None" ]; then
    echo "❌ Streams not enabled"
    ALL_GOOD=false
else
    echo "✅ Streams enabled"
fi

if [ "$STATE" == "Enabled" ]; then
    echo "✅ Event source mapping enabled"
else
    echo "❌ Event source mapping not enabled"
    ALL_GOOD=false
fi

if [ "$INVOCATION_COUNT" -gt 0 ]; then
    echo "✅ Lambda has been triggered"
elif [ "$ALL_GOOD" == "true" ]; then
    echo "ℹ️  Lambda not triggered (no jobs created yet)"
fi

echo ""

if [ "$ALL_GOOD" == "true" ]; then
    echo "🎉 Everything looks good!"
    echo ""
    echo "Next steps:"
    echo "1. Create a test job: npx tsx test-dynamodb-streams.ts"
    echo "2. Watch CloudWatch Logs for Lambda execution"
    echo "3. Check ECS tasks start within 1-2 seconds"
else
    echo "⚠️  Some issues found - see above for details"
    echo ""
    echo "Check documentation:"
    echo "- MORNING_CHECK.md for verification steps"
    echo "- STREAMS_STATUS.md for troubleshooting"
fi

echo ""
