#!/bin/bash

set -e

echo "========================================="
echo "Academic Management System - Installation"
echo "========================================="

# Step 1: Install Laravel if not exists
if [ ! -f "Backend/artisan" ]; then
    echo ""
    echo "Step 1: Installing Laravel 11..."
    echo "========================================="
    
    docker run --rm -v $(pwd):/app -w /app composer:latest \
        bash -c "composer create-project laravel/laravel Backend-temp '11.*' --prefer-dist --no-interaction && \
                 mv Backend-temp/* Backend/ && \
                 mv Backend-temp/.* Backend/ 2>/dev/null || true && \
                 rm -rf Backend-temp"
    
    echo "✓ Laravel installed successfully!"
else
    echo "✓ Laravel already installed"
fi

# Step 2: Create .env files
echo ""
echo "Step 2: Setting up environment files..."
echo "========================================="

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✓ Created .env file"
    echo "⚠ Please edit .env with your DB_PASSWORD before continuing"
    read -p "Press Enter when ready..."
else
    echo "✓ .env file exists"
fi

if [ ! -f "Backend/.env" ]; then
    cp Backend/.env.example Backend/.env
    
    # Update Backend/.env with our configuration
    sed -i.bak 's/DB_CONNECTION=sqlite/DB_CONNECTION=pgsql/' Backend/.env
    sed -i.bak 's/# DB_HOST=127.0.0.1/DB_HOST=pgbouncer/' Backend/.env
    sed -i.bak 's/# DB_PORT=3306/DB_PORT=6432/' Backend/.env
    sed -i.bak 's/# DB_DATABASE=laravel/DB_DATABASE=academic_oltp/' Backend/.env
    sed -i.bak 's/# DB_USERNAME=root/DB_USERNAME=academic/' Backend/.env
    
    echo "✓ Created Backend/.env file"
else
    echo "✓ Backend/.env file exists"
fi

# Step 3: Build Docker containers
echo ""
echo "Step 3: Building Docker containers..."
echo "========================================="
docker-compose build

# Step 4: Start services
echo ""
echo "Step 4: Starting services..."
echo "========================================="
docker-compose up -d

# Step 5: Wait for PostgreSQL
echo ""
echo "Step 5: Waiting for PostgreSQL to be ready..."
echo "========================================="
sleep 10

# Step 6: Generate Laravel key
echo ""
echo "Step 6: Generating Laravel application key..."
echo "========================================="
docker-compose exec -T app php artisan key:generate --force

# Step 7: Run migrations (will be done in next task)
echo ""
echo "========================================="
echo "✓ Installation complete!"
echo "========================================="
echo ""
echo "Services running:"
echo "  - API Backend: http://localhost/api"
echo "  - PostgreSQL: localhost:5432"
echo "    - Database OLTP: academic_oltp"
echo "    - Database OLAP: academic_olap"
echo "  - PgBouncer: localhost:6432"
echo "  - Redis: localhost:6379"
echo ""
echo "Next steps:"
echo "  1. Run migrations: docker-compose exec app php artisan migrate"
echo "  2. View logs: docker-compose logs -f"
echo "  3. Stop services: docker-compose down"
echo "========================================="
