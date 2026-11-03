# Production image for the PocketPlan API (used by Render, or any Docker host).
FROM php:8.4-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libzip-dev libicu-dev \
    && docker-php-ext-install pdo_mysql bcmath intl zip opcache \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Dependencies first, so code changes don't reinstall them.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .
RUN composer dump-autoload --optimize --no-dev \
    && php artisan package:discover --ansi \
    && chmod +x docker/start.sh \
    && chown -R www-data:www-data storage bootstrap/cache

# Several PHP workers so one slow request doesn't block everyone.
ENV PHP_CLI_SERVER_WORKERS=4 \
    LOG_CHANNEL=stderr

EXPOSE 8000
CMD ["docker/start.sh"]
