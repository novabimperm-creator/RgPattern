#!/bin/sh
set -e

if [ -n "${RAILWAY_VOLUME_MOUNT_PATH:-}" ]; then
  DATA_DIR="$RAILWAY_VOLUME_MOUNT_PATH"
fi
DATA_DIR="${DATA_DIR:-/app/data}"
export DATA_DIR

if { [ -n "${RAILWAY_ENVIRONMENT:-}" ] || [ -n "${RAILWAY_PROJECT_ID:-}" ]; } && [ -z "${RAILWAY_VOLUME_MOUNT_PATH:-}" ]; then
  echo "WARNING: Railway Volume is not attached. Cases, images and users will be deleted on the next deploy. Add a Volume mounted at /app/data." >&2
fi

mkdir -p "$DATA_DIR/uploads"

if [ "$(id -u)" = "0" ]; then
  owner="$(stat -c %u "$DATA_DIR" 2>/dev/null || echo "")"
  if [ "$owner" != "1001" ]; then
    chown -R nextjs:nodejs "$DATA_DIR"
  fi
  exec su-exec nextjs "$@"
fi

exec "$@"
