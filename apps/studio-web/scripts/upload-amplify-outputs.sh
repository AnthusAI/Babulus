#!/bin/bash
# Upload amplify_outputs.json to S3 for ECS tasks to download at runtime
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_FILE="$SCRIPT_DIR/../amplify_outputs.json"

if [ ! -f "$OUTPUTS_FILE" ]; then
  echo "Error: amplify_outputs.json not found at $OUTPUTS_FILE"
  exit 1
fi

# Extract bucket name from amplify_outputs.json
BUCKET=$(jq -r '.storage.buckets[0].bucket_name' "$OUTPUTS_FILE")

if [ -z "$BUCKET" ] || [ "$BUCKET" = "null" ]; then
  echo "Error: Could not extract bucket name from amplify_outputs.json"
  exit 1
fi

echo "Uploading amplify_outputs.json to s3://$BUCKET/config/amplify_outputs.json"
aws s3 cp "$OUTPUTS_FILE" "s3://$BUCKET/config/amplify_outputs.json" \
  --region us-east-1 \
  --profile anthus

echo "✓ Uploaded amplify_outputs.json to S3"
