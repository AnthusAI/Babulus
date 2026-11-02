#!/bin/bash
#
# Build and push Docker image for Babulus render worker to ECR
#
# This script:
# 1. Gets ECR repository URI from AWS
# 2. Builds Docker image
# 3. Tags image for ECR
# 4. Logs in to ECR
# 5. Pushes image to ECR
#
# Prerequisites:
# - Docker installed and running
# - AWS CLI configured with credentials
# - ECR repository "babulus-render-worker" exists
#
# Usage:
#   ./scripts/build-render-worker.sh

set -e  # Exit on error
set -u  # Exit on undefined variable

echo "========================================="
echo "Babulus Render Worker - Docker Build"
echo "========================================="

# Configuration
REPO_NAME="babulus-render-worker"
REGION="${AWS_REGION:-us-east-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Get ECR repository URI
echo ""
echo "Fetching ECR repository URI..."
ECR_REPO_URI=$(aws ecr describe-repositories \
  --repository-names "$REPO_NAME" \
  --region "$REGION" \
  --query 'repositories[0].repositoryUri' \
  --output text 2>/dev/null || echo "")

if [ -z "$ECR_REPO_URI" ]; then
  echo "Error: ECR repository '$REPO_NAME' not found in region $REGION"
  echo ""
  echo "Please create the repository first:"
  echo "  aws ecr create-repository --repository-name $REPO_NAME --region $REGION"
  exit 1
fi

echo "✓ Found repository: $ECR_REPO_URI"

# Build Docker image
echo ""
echo "Building Docker image..."
echo "  Context: $(pwd)"
echo "  Tag: $REPO_NAME:$IMAGE_TAG"
docker build \
  --platform linux/amd64 \
  --tag "$REPO_NAME:$IMAGE_TAG" \
  --file Dockerfile \
  .

echo "✓ Docker image built successfully"

# Tag for ECR
echo ""
echo "Tagging image for ECR..."
docker tag "$REPO_NAME:$IMAGE_TAG" "$ECR_REPO_URI:$IMAGE_TAG"
echo "✓ Image tagged: $ECR_REPO_URI:$IMAGE_TAG"

# Login to ECR
echo ""
echo "Logging in to ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_REPO_URI"
echo "✓ Logged in to ECR"

# Push image
echo ""
echo "Pushing image to ECR..."
docker push "$ECR_REPO_URI:$IMAGE_TAG"
echo "✓ Image pushed successfully"

# Get image digest
IMAGE_DIGEST=$(aws ecr describe-images \
  --repository-name "$REPO_NAME" \
  --region "$REGION" \
  --image-ids imageTag="$IMAGE_TAG" \
  --query 'imageDetails[0].imageDigest' \
  --output text 2>/dev/null || echo "unknown")

echo ""
echo "========================================="
echo "✓ Build and push completed successfully"
echo "========================================="
echo ""
echo "Image details:"
echo "  Repository: $ECR_REPO_URI"
echo "  Tag: $IMAGE_TAG"
echo "  Digest: $IMAGE_DIGEST"
echo ""
echo "To deploy this image, update your ECS task definition or"
echo "run: npx ampx deploy (if using Amplify CDK)"
echo ""
