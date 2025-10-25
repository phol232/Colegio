#!/bin/bash

echo "========================================="
echo "Setting up Laravel Backend"
echo "========================================="

# Check if Backend has Laravel files
if [ ! -f "Backend/artisan" ]; then
    echo "Laravel not found in Backend folder. Installing..."
    
    # Use composer Docker image to create Laravel project
    docker run --rm -v $(pwd):/app -w /app composer:latest \
        create-project laravel/laravel Backend-temp "11.*" --prefer-dist --no-interaction
    
    # Move files from Backend-temp to Backend
    echo "Moving Laravel files to Backend folder..."
    cp -r Backend-temp/* Backend/
    cp Backend-temp/.env.example Backend/
    cp Backend-temp/.gitignore Backend/
    
    # Clean up
    rm -rf Backend-temp
    
    echo "Laravel installed successfully!"
else
    echo "Laravel already installed in Backend folder."
fi

# Copy .env file
if [ ! -f "Backend/.env" ]; then
    echo "Creating Backend/.env file..."
    cp .env.example Backend/.env
fi

echo "========================================="
echo "Laravel setup complete!"
echo "========================================="
echo "Next steps:"
echo "1. Edit Backend/.env with your database credentials"
echo "2. Run: docker-compose build"
echo "3. Run: docker-compose up -d"
echo "========================================="
