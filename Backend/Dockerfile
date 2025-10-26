FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    postgresql-dev \
    oniguruma-dev \
    icu-dev \
    linux-headers \
    tzdata \
    $PHPIZE_DEPS

# Set timezone to Peru
RUN cp /usr/share/zoneinfo/America/Lima /etc/localtime && \
    echo "America/Lima" > /etc/timezone && \
    echo "date.timezone = America/Lima" > /usr/local/etc/php/conf.d/timezone.ini

# Install PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    pgsql \
    mbstring \
    zip \
    exif \
    pcntl \
    bcmath \
    intl

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Install OPcache for performance
RUN docker-php-ext-install opcache

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files first for better caching
COPY composer.* ./

# Install PHP dependencies (if composer files exist)
RUN if [ -f "composer.json" ]; then \
    composer install --no-dev --optimize-autoloader --no-interaction --no-scripts; \
    fi

# PHP-FPM Configuration for performance
RUN echo 'pm = dynamic' > /usr/local/etc/php-fpm.d/performance.conf && \
    echo 'pm.max_children = 20' >> /usr/local/etc/php-fpm.d/performance.conf && \
    echo 'pm.start_servers = 5' >> /usr/local/etc/php-fpm.d/performance.conf && \
    echo 'pm.min_spare_servers = 3' >> /usr/local/etc/php-fpm.d/performance.conf && \
    echo 'pm.max_spare_servers = 10' >> /usr/local/etc/php-fpm.d/performance.conf && \
    echo 'pm.process_idle_timeout = 10s' >> /usr/local/etc/php-fpm.d/performance.conf && \
    echo 'pm.max_requests = 500' >> /usr/local/etc/php-fpm.d/performance.conf && \
    echo 'request_terminate_timeout = 60s' >> /usr/local/etc/php-fpm.d/performance.conf

# OPcache Configuration
RUN echo 'opcache.enable=1' > /usr/local/etc/php/conf.d/opcache.ini && \
    echo 'opcache.enable_cli=1' >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo 'opcache.memory_consumption=256' >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo 'opcache.interned_strings_buffer=16' >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo 'opcache.max_accelerated_files=20000' >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo 'opcache.use_cwd=0' >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo 'opcache.validate_timestamps=0' >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo 'opcache.revalidate_freq=0' >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo 'opcache.fast_shutdown=1' >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo 'opcache.jit=1205' >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo 'opcache.jit_buffer_size=100M' >> /usr/local/etc/php/conf.d/opcache.ini

# Copy application files
COPY . .

# Run composer scripts if needed
RUN if [ -f "composer.json" ]; then \
    composer dump-autoload --optimize; \
    fi

# Set permissions
RUN mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache

# Configure PHP-FPM for performance
RUN echo "pm = dynamic" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_children = 40" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.start_servers = 10" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.min_spare_servers = 5" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_spare_servers = 15" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_requests = 500" >> /usr/local/etc/php-fpm.d/www.conf

# Configure PHP-FPM access logging with detailed format
RUN echo "[www]" > /usr/local/etc/php-fpm.d/zzz-custom.conf \
    && echo "access.log = /proc/self/fd/2" >> /usr/local/etc/php-fpm.d/zzz-custom.conf \
    && echo 'access.format = "%R - %t \"%m %{REQUEST_URI}e\" %s"' >> /usr/local/etc/php-fpm.d/zzz-custom.conf

# Expose port 9000
EXPOSE 9000

CMD ["php-fpm"]
