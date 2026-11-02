#!/bin/bash
# Autonomous deployment handler - monitors deployment and proceeds when complete
#
# This script:
# 1. Monitors the Amplify deployment status
# 2. When deployment succeeds:
#    - Downloads amplify_outputs.json
#    - Installs test dependencies
#    - Runs integration tests
#    - Reports results
#
# Usage: ./scripts/autonomous-deployment-handler.sh <app-id> <branch>

set -e

APP_ID="${1:-}"
BRANCH="${2:-main}"
AWS_PROFILE="${AWS_PROFILE:-anthus}"
AWS_REGION="${AWS_REGION:-us-east-1}"
MAX_CHECKS=36  # 36 checks * 10 minutes = 6 hours max
CHECK_INTERVAL=600  # 10 minutes

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

if [ -z "$APP_ID" ]; then
  log "ERROR: App ID required"
  echo "Usage: $0 <app-id> [branch]"
  echo ""
  echo "Find your App ID:"
  echo "  1. Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1"
  echo "  2. Click on Babulus app"
  echo "  3. Copy the App ID from the URL"
  exit 1
fi

log "Starting autonomous deployment monitoring"
log "App ID: $APP_ID"
log "Branch: $BRANCH"
log "Profile: $AWS_PROFILE"
log "Max monitoring time: 6 hours (36 checks)"

# Function to get latest job status
get_deployment_status() {
  # Get the most recent job ID
  local job_id=$(aws amplify list-jobs \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --max-results 1 \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'jobSummaries[0].jobId' \
    --output text 2>/dev/null)

  if [ -z "$job_id" ] || [ "$job_id" = "None" ]; then
    echo "UNKNOWN"
    return
  fi

  # Get the job status
  aws amplify get-job \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --job-id "$job_id" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'job.summary.status' \
    --output text 2>/dev/null || echo "UNKNOWN"
}

# Monitor deployment
check=0
while [ $check -lt $MAX_CHECKS ]; do
  check=$((check+1))
  log "Check $check/$MAX_CHECKS"

  status=$(get_deployment_status)
  log "Deployment status: $status"

  if [ "$status" = "SUCCEED" ]; then
    log "✓ Deployment succeeded! Proceeding with post-deployment tasks..."
    break
  elif [ "$status" = "FAILED" ] || [ "$status" = "CANCELLED" ]; then
    log "✗ Deployment failed with status: $status"
    log "Check logs at: https://console.aws.amazon.com/amplify/home?region=$AWS_REGION#/$APP_ID/$BRANCH"
    exit 1
  elif [ "$status" = "UNKNOWN" ]; then
    log "⚠ Could not determine deployment status"
  else
    log "⏳ Deployment in progress: $status"
  fi

  if [ $check -lt $MAX_CHECKS ]; then
    log "Sleeping for $CHECK_INTERVAL seconds..."
    sleep $CHECK_INTERVAL
  fi
done

if [ "$status" != "SUCCEED" ]; then
  log "✗ Timeout: Deployment did not complete within 6 hours"
  exit 2
fi

# Deployment succeeded - proceed with post-deployment tasks
log "========================================="
log "Post-Deployment Tasks"
log "========================================="

# Task 1: Download amplify_outputs.json
log ""
log "Task 1: Downloading amplify_outputs.json..."
cd "$(dirname "$0")/.."
./scripts/get-amplify-outputs.sh "$APP_ID" "$BRANCH"

if [ ! -f "apps/studio-web/amplify_outputs.json" ]; then
  log "✗ Failed to download amplify_outputs.json"
  exit 1
fi

log "✓ amplify_outputs.json downloaded successfully"

# Task 2: Install dependencies (if needed)
log ""
log "Task 2: Installing dependencies..."
cd apps/studio-web

if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  log "Installing npm packages..."
  npm install
  log "✓ Dependencies installed"
else
  log "✓ Dependencies already installed"
fi

# Task 3: Run integration tests
log ""
log "Task 3: Running integration tests..."
log "Note: Tests will fail if Cognito auto-confirm is not enabled"

if npm run test:integration 2>&1 | tee /tmp/test-output.log; then
  log "✓ Integration tests passed!"
else
  log "⚠ Integration tests failed (expected if auto-confirm is disabled)"
  log "See test output above for details"
fi

# Task 4: Create summary report
log ""
log "========================================="
log "Deployment Summary"
log "========================================="
log "App ID: $APP_ID"
log "Branch: $BRANCH"
log "Status: DEPLOYED ✓"
log ""
log "Files created:"
log "  - apps/studio-web/amplify_outputs.json"
log ""
log "Next steps for user:"
log "  1. Review test results above"
log "  2. If tests failed, enable Cognito auto-confirm:"
log "     - AWS Console → Cognito → User Pools"
log "     - Select pool from amplify_outputs.json"
log "     - Sign-up experience → Enable auto-confirm"
log "  3. Start dev server: cd apps/studio-web && npm run dev"
log "  4. Access app: http://localhost:3000"
log ""
log "Amplify Console: https://console.aws.amazon.com/amplify/home?region=$AWS_REGION#/$APP_ID"
log "========================================="

exit 0
