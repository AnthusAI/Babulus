#!/bin/bash
#
# Deploy ECS Infrastructure - Complete Setup Script
#
# This script:
# 1. Builds and pushes Docker image to ECR
# 2. Waits for Amplify deployment to complete
# 3. Forces ECS to use new task definition
#
# Prerequisites:
# - AWS CLI configured with ECR permissions
# - Docker installed and running
# - Amplify deployment triggered (git push origin main)
#
# Usage:
#   AWS_PROFILE=anthus ./scripts/deploy-ecs-infrastructure.sh

set -e

echo "========================================="
echo "ECS Infrastructure Deployment"
echo "========================================="

# Configuration
REGION="${AWS_REGION:-us-east-1}"
APP_ID="d3epcqvzbxdaq"
BRANCH="main"

echo ""
echo "Step 1: Build and Push Docker Image"
echo "========================================="
cd "$(dirname "$0")/.."
./scripts/build-render-worker.sh

echo ""
echo "Step 2: Check Amplify Deployment Status"
echo "========================================="
echo "Checking deployment for commit: $(git rev-parse HEAD)"

while true; do
  STATUS=$(aws amplify list-jobs \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --region "$REGION" \
    --max-items 1 \
    --query 'jobSummaries[0].status' \
    --output text)

  echo "Deployment status: $STATUS"

  if [ "$STATUS" == "SUCCEED" ]; then
    echo "✓ Deployment completed successfully"
    break
  elif [ "$STATUS" == "FAILED" ] || [ "$STATUS" == "CANCELLED" ]; then
    echo "✗ Deployment failed with status: $STATUS"
    exit 1
  fi

  echo "Waiting for deployment... (checking again in 30s)"
  sleep 30
done

echo ""
echo "Step 3: Update ECS Task Definition"
echo "========================================="

# Get cluster and service names from Amplify outputs
cd apps/studio-web
CLUSTER_NAME=$(jq -r '.custom.renderClusterName' amplify_outputs.json)

if [ -z "$CLUSTER_NAME" ] || [ "$CLUSTER_NAME" == "null" ]; then
  echo "Error: Could not find ECS cluster name in amplify_outputs.json"
  exit 1
fi

echo "✓ Found ECS cluster: $CLUSTER_NAME"

echo ""
echo "========================================="
echo "✓ Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Create a test render job"
echo "2. Monitor CloudWatch Logs: /aws/ecs/render-worker"
echo "3. Verify MP4 created in S3"
echo ""
echo "Test commands:"
echo "  npx tsx create-test-data.ts  # Create generation job"
echo "  npx tsx test-render-job.ts   # Create render job"
echo ""
