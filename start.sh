#!/bin/bash
set -eu

mkdir -p /app/data
chown -R 1000:1000 /app/data || true

# Keep provider credentials encrypted at rest. These values are generated once
# and retained in Cloudron's backed-up local storage across app updates.
encryption_env=/app/data/encryption.env
if [ ! -s "$encryption_env" ]; then
  umask 077
  {
    echo "export ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY=$(openssl rand -hex 32)"
    echo "export ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY=$(openssl rand -hex 32)"
    echo "export ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT=$(openssl rand -hex 32)"
  } > "$encryption_env"
fi
. "$encryption_env"

# Cloudron exposes addon connection details through CLOUDRON_* variables.
export DB_HOST="${CLOUDRON_POSTGRESQL_HOST}"
export DB_PORT="${CLOUDRON_POSTGRESQL_PORT:-5432}"
export POSTGRES_USER="${CLOUDRON_POSTGRESQL_USERNAME}"
export POSTGRES_PASSWORD="${CLOUDRON_POSTGRESQL_PASSWORD}"
export POSTGRES_DB="${CLOUDRON_POSTGRESQL_DATABASE}"
export REDIS_URL="${CLOUDRON_REDIS_URL}"
export SECRET_KEY_BASE="${SECRET_KEY_BASE:-$(head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')}"
export ACTIVE_STORAGE_SERVICE="local"

cd /rails

# Run migrations before starting both processes. The worker shares the same
# application container because Cloudron apps expose one primary HTTP process.
bundle exec rails db:prepare
bundle exec sidekiq &
worker_pid=$!
trap 'kill "$worker_pid" 2>/dev/null || true' TERM INT EXIT

exec bundle exec puma -C config/puma.rb -b "tcp://0.0.0.0:${PORT}"
