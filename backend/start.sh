#!/bin/bash

# EEG Backend Startup Script

echo "========================================"
echo "Starting EEG Analysis Backend Server"
echo "========================================"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed or not in PATH"
    echo "Please install Go 1.24.4 or higher"
    exit 1
fi

# Check Go version
GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
echo "Go version: $GO_VERSION"

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    echo "Creating uploads directory..."
    mkdir -p uploads
fi

# Build the application
echo "Building EEG backend..."
if go build -buildvcs=false -o eeg-backend .; then
    echo "✓ Build successful"
else
    echo "✗ Build failed"
    exit 1
fi

# Check if PostgreSQL is running (optional)
if command -v psql &> /dev/null; then
    if pg_isready -h localhost -p 5432 &> /dev/null; then
        echo "✓ PostgreSQL is running"
    else
        echo "⚠ Warning: PostgreSQL may not be running on localhost:5432"
        echo "  Make sure your database is accessible"
    fi
else
    echo "⚠ Warning: psql not found. Cannot check PostgreSQL status"
fi

# Start the server
echo "========================================"
echo "Starting server on http://localhost:8080"
echo "========================================"
echo "Press Ctrl+C to stop the server"
echo ""

# Set environment variables if not already set
if [ -z "$JWT_SECRET" ]; then
    export JWT_SECRET="your-super-secure-secret-key-2025"
fi

if [ -z "$DB_HOST" ]; then
    export DB_HOST="localhost"
fi

if [ -z "$DB_USER" ]; then
    export DB_USER="postgres"
fi

if [ -z "$DB_PASSWORD" ]; then
    export DB_PASSWORD="postgres"
fi

if [ -z "$DB_NAME" ]; then
    export DB_NAME="eeg_db"
fi

if [ -z "$DB_PORT" ]; then
    export DB_PORT="5432"
fi

if [ -z "$DB_SSLMODE" ]; then
    export DB_SSLMODE="disable"
fi

# Run the server with environment variables
JWT_SECRET="$JWT_SECRET" DB_HOST="$DB_HOST" DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" DB_NAME="$DB_NAME" DB_PORT="$DB_PORT" DB_SSLMODE="$DB_SSLMODE" ./eeg-backend