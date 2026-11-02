#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[ci-predeploy] Using app root: ${ROOT_DIR}"

cd "${ROOT_DIR}"

echo "[ci-predeploy] Installing root dependencies"
npm ci --cache .npm --prefer-offline

echo "[ci-predeploy] Installing render-trigger dependencies"
(
  cd amplify/functions/render-trigger
  npm ci
)

echo "[ci-predeploy] Running Next.js build"
npm run build

echo "[ci-predeploy] Success"
