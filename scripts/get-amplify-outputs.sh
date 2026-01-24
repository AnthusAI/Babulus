#!/bin/bash
# Script to download amplify_outputs.json from deployed Amplify app
#
# Usage:
#   ./scripts/get-amplify-outputs.sh <app-id> [branch]
#
# Arguments:
#   app-id  - Amplify app ID (e.g., d3abc123xyz)
#   branch  - Git branch name (default: main)
#
# Environment:
#   AWS_PROFILE - AWS profile to use (default: anthus)
#   AWS_REGION  - AWS region (default: us-east-1)
#
# Example:
#   ./scripts/get-amplify-outputs.sh d3abc123xyz
#   AWS_PROFILE=anthus ./scripts/get-amplify-outputs.sh d3abc123xyz main

set -e

# Parse arguments
APP_ID="${1:-}"
BRANCH="${2:-main}"
AWS_PROFILE="${AWS_PROFILE:-anthus}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [ -z "$APP_ID" ]; then
  echo "Error: Missing required argument <app-id>"
  echo ""
  echo "Usage: $0 <app-id> [branch]"
  echo ""
  echo "To find your Amplify app ID:"
  echo "  1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/home?region=us-east-1"
  echo "  2. Click on your app (Babulus)"
  echo "  3. Copy the App ID from the URL (e.g., d3abc123xyz)"
  echo ""
  exit 1
fi

echo "Downloading amplify_outputs.json..."
echo "  App ID: $APP_ID"
echo "  Branch: $BRANCH"
echo "  Profile: $AWS_PROFILE"
echo "  Region: $AWS_REGION"
echo ""

# Change to studio-web directory
cd "$(dirname "$0")/../apps/studio-web" || exit 1

# Use ampx to generate outputs
npx --yes @aws-amplify/backend-cli@latest generate outputs \
  --branch "$BRANCH" \
  --app-id "$APP_ID" \
  --profile "$AWS_PROFILE"

if [ -f "amplify_outputs.json" ]; then
  echo ""
  echo "✓ Success! amplify_outputs.json downloaded to apps/studio-web/"
  echo ""
  echo "Next steps:"
  echo "  1. Verify the file: cat apps/studio-web/amplify_outputs.json | jq"
  echo "  2. Run dev server: cd apps/studio-web && npm run dev"
  echo "  3. Run integration tests: cd apps/studio-web && npm run test:integration"
else
  echo ""
  echo "✗ Failed to download amplify_outputs.json"
  echo ""
  echo "Troubleshooting:"
  echo "  - Verify the App ID is correct"
  echo "  - Check that the branch has been deployed"
  echo "  - Ensure AWS profile '$AWS_PROFILE' has access"
  echo "  - Try manually from AWS console: Amplify > App > Hosting > Download outputs"
  exit 1
fi
