#!/bin/sh
# Container entrypoint: prepare the app, update the database, then serve the API.
set -e

# Hosted MySQL (e.g. Aiven) requires TLS with its own CA certificate, passed in as an env var.
if [ -n "$DB_SSL_CA_PEM" ]; then
    printf '%s\n' "$DB_SSL_CA_PEM" > /tmp/db-ca.pem
    export MYSQL_ATTR_SSL_CA=/tmp/db-ca.pem
fi

php artisan config:cache
php artisan route:cache
php artisan view:cache

php artisan migrate --force
# Default categories and the admin account (from ADMIN_* env vars); safe to run every start.
php artisan db:seed --force

# Recurring allowances and cleanup, while the service is awake.
php artisan schedule:work > /dev/null 2>&1 &

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
