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

# Run the server
./eeg-backend 