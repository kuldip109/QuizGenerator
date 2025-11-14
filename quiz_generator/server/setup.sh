#!/bin/bash

# AI Quiz Application - Quick Setup Script
# This script helps you set up the application quickly

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     AI Quiz Application - Setup Script               ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "✓ .env file found"
else
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your Groq API key"
    echo "   Get your API key from: https://console.groq.com"
    echo ""
    read -p "Press Enter to continue after adding your API key..."
fi

# Check if using Docker
echo ""
echo "Choose deployment method:"
echo "1) Docker (Recommended - includes PostgreSQL)"
echo "2) Local (Requires PostgreSQL installed)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    echo ""
    echo "Starting with Docker..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        echo "   Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        echo "   Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    echo "✓ Docker found"
    
    # Build and start containers
    echo ""
    echo "Building and starting containers..."
    docker-compose up -d
    
    echo ""
    echo "Waiting for database to be ready..."
    sleep 10
    
    echo ""
    echo "✓ Application started successfully!"
    echo ""
    echo "Access your API at: http://localhost:3001"
    echo "Health check: http://localhost:3001/health"
    echo ""
    echo "View logs: docker-compose logs -f api"
    echo "Stop app: docker-compose down"
    
elif [ "$choice" == "2" ]; then
    echo ""
    echo "Setting up local development..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 18+."
        echo "   Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
        exit 1
    fi
    
    echo "✓ Node.js $(node -v) found"
    
    # Check if PostgreSQL is installed
    if ! command -v psql &> /dev/null; then
        echo "❌ PostgreSQL is not installed."
        echo ""
        echo "Please install PostgreSQL 15+ first:"
        echo "  macOS: brew install postgresql@15"
        echo "  Ubuntu: sudo apt-get install postgresql-15"
        echo "  Windows: https://www.postgresql.org/download/windows/"
        exit 1
    fi
    
    echo "✓ PostgreSQL found"
    
    # Install dependencies
    echo ""
    echo "Installing dependencies..."
    npm install
    
    echo "✓ Dependencies installed"
    
    # Create database
    echo ""
    echo "Creating database..."
    read -p "Enter PostgreSQL username (default: postgres): " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    # Try to create database
    createdb -U "$DB_USER" quiz_db 2>/dev/null || echo "Database may already exist"
    
    # Run migrations
    echo ""
    echo "Running database migrations..."
    npm run migrate
    
    echo "✓ Database setup complete"
    
    # Start server
    echo ""
    echo "Starting server..."
    echo ""
    echo "✓ Setup complete!"
    echo ""
    echo "To start the server, run:"
    echo "  npm start      (production)"
    echo "  npm run dev    (development with auto-reload)"
    echo ""
    echo "Access your API at: http://localhost:3001"
    
else
    echo "Invalid choice. Exiting."
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║              Setup Complete! 🎉                       ║"
echo "║                                                       ║"
echo "║  Next steps:                                          ║"
echo "║  1. Import Postman collection to test APIs           ║"
echo "║  2. Check README.md for API documentation            ║"
echo "║  3. See DEPLOYMENT.md for deployment options         ║"
echo "╚═══════════════════════════════════════════════════════╝"
