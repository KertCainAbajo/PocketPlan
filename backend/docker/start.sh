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
# No Blade templates in this app (the admin panel is static), and Git doesn't keep the empty folder.
if [ -n "$(ls -A resources/views 2>/dev/null)" ]; then
    php artisan view:cache
fi

php artisan migrate --force
# Default categories and the admin account (from ADMIN_* env vars); safe to run every start.
php artisan db:seed --force \
    || echo "WARNING: seeding failed (check ADMIN_EMAIL / ADMIN_PASSWORD). Starting the API anyway." >&2

# Recurring allowances and cleanup, while the service is awake.
php artisan schedule:work > /dev/null 2>&1 &

# Run PHP's server directly, not `artisan serve`: that command parses every output line and exits
# on one it can't read, which takes the whole service down. PHP_CLI_SERVER_WORKERS sets the workers.
cd public
exec php -S "0.0.0.0:${PORT:-8000}" ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
