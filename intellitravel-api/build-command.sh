#!/bin/bash
# Install PHP and dependencies
apt-get update
apt-get install -y php php-mbstring php-xml php-curl php-sqlite3 php-zip unzip

# Install Composer
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install PHP dependencies
composer install --no-interaction --no-dev --optimize-autoloader

# Setup Laravel
cp .env.example .env
php artisan key:generate --force
touch database/database.sqlite
php artisan migrate --force
php artisan config:cache
php artisan route:cache
