#!/bin/bash
# Test script to simulate ECS worker locally

export AWS_REGION=us-east-1
export NODE_ENV=production
export WORKER_EMAIL=render-worker@babulus.internal
: "${WORKER_PASSWORD:?WORKER_PASSWORD must be set in the environment (the render-worker password)}"
export WORKER_PASSWORD
export JOB_ID=$1

if [ -z "$JOB_ID" ]; then
  echo "Usage: $0 <JOB_ID>"
  exit 1
fi

echo "Running ECS worker locally for job: $JOB_ID"
npx tsx src/worker-ecs.ts
