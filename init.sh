#!/bin/bash

echo "========================================="
echo "Academic Management System - Initialization"
echo "========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please edit .env file with your configuration before continuing."
    echo "Press Enter when ready..."
    read
fi

# Check if Backend/.env exists
if [ ! -f Backend/.env ]; then
    echo "Creating Backend/.env file..."
    cp .env Backend/.env
fi

# Generate Laravel application key
echo "Generating Laravel application key..."
docker-compose run --rm app php artisan key:generate

# Build and start containers
echo "Building Docker containers..."
docker-compose build

echo "Starting Docker containers..."
docker-compose up -d

# Wait for databases to be ready
echo "Waiting for databases to be ready..."
sleep 10

# Run migrations for OLTP
echo "Running OLTP database migrations..."
docker-compose exec app php artisan migrate --database=pgsql --force

# Run migrations for OLAP
echo "Running OLAP database migrations..."
docker-compose exec app php artisan migrate --database=olap --path=database/migrations/olap --force

# Seed database (optional)
read -p "Do you want to seed the database with test data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    docker-compose exec app php artisan db:seed
fi

# Clear and cache config
echo "Optimizing Laravel..."
docker-compose exec app php artisan config:cache
docker-compose exec app php artisan route:cache
docker-compose exec app php artisan view:cache

# Start queue workers
echo "Starting queue workers..."
docker-compose exec -d app php artisan queue:work redis --tries=3 --timeout=300

echo "========================================="
echo "Initialization complete!"
echo "========================================="
echo "API: http://localhost/api"
echo "Frontend: http://localhost:8080"
echo "PostgreSQL OLTP: localhost:5432"
echo "PostgreSQL OLAP: localhost:5433"
echo "Redis: localhost:6379"
echo "PgBouncer: localhost:6432"
echo "========================================="
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
echo "========================================="
