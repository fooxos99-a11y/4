#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <app|worker> <env-file>"
  exit 1
fi

MODE="$1"
ENV_FILE="$2"

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

set -a
. "$ENV_FILE"
set +a

mkdir -p "$(dirname "${WHATSAPP_AUTH_DIR:-$ROOT_DIR/whatsapp-worker/.wwebjs_auth}")"
mkdir -p "${WHATSAPP_AUTH_DIR:-$ROOT_DIR/whatsapp-worker/.wwebjs_auth}"
mkdir -p "$(dirname "${WHATSAPP_STATUS_FILE_PATH:-$ROOT_DIR/whatsapp-worker/status.json}")"
mkdir -p "$(dirname "${WHATSAPP_QR_IMAGE_PATH:-$ROOT_DIR/whatsapp-worker/current-qr.png}")"
mkdir -p "$(dirname "${WHATSAPP_COMMAND_FILE_PATH:-$ROOT_DIR/whatsapp-worker/command.json}")"
mkdir -p "$(dirname "${WHATSAPP_LOCK_FILE_PATH:-$ROOT_DIR/whatsapp-worker/worker.lock}")"

if [ "$MODE" = "app" ]; then
  APP_PORT="${APP_PORT:-${PORT:-3000}}"
  export PORT="$APP_PORT"
  exec pnpm start --port "$APP_PORT"
fi

if [ "$MODE" = "worker" ]; then
  export WORKER_ENV_FILE="$ENV_FILE"
  exec node whatsapp-worker/index.js
fi

echo "Unknown mode: $MODE"
exit 1