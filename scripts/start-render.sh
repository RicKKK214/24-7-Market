#!/usr/bin/env sh
# Render start script.
#
# The filesystem is ephemeral: the SQLite file does NOT survive a restart or redeploy.
# We therefore (re)create the schema on every boot. This is fast (<1s) and idempotent.
# If it fails for any reason the app still starts — persistence is optional and every
# database call degrades gracefully (see src/lib/db.ts).
set -e

: "${PORT:=3000}"
: "${DATABASE_URL:=file:/tmp/dev.db}"
export DATABASE_URL

echo "[start] PORT=$PORT"
echo "[start] DATABASE_URL=$DATABASE_URL"

# Create the schema on the ephemeral disk. Never fatal.
if npx prisma db push --skip-generate --accept-data-loss; then
  echo "[start] database schema ready"
else
  echo "[start] WARNING: could not initialise database - continuing without persistence"
fi

# Bind 0.0.0.0 so Render's proxy can reach us, on the port Render assigns.
exec npx next start -H 0.0.0.0 -p "$PORT"
