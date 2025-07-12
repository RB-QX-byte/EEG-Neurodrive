#!/bin/bash

# EEG Backend Setup Script

echo "========================================"
echo "EEG Backend Database Setup"
echo "========================================"

# Function to test database connection
test_connection() {
    local host=${1:-localhost}
    local port=${2:-5432}
    local user=${3:-postgres}
    local dbname=${4:-eeg_db}
    
    echo "Testing connection to PostgreSQL..."
    if command -v psql &> /dev/null; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$host" -p "$port" -U "$user" -d postgres -c "\q" 2>/dev/null; then
            echo "✓ Successfully connected to PostgreSQL server"
            return 0
        else
            echo "✗ Failed to connect to PostgreSQL server"
            return 1
        fi
    else
        echo "⚠ psql command not found. Cannot test connection."
        return 1
    fi
}

# Function to create database
setup_database() {
    echo "Setting up database..."
    if command -v psql &> /dev/null; then
        echo "Creating database 'eeg_db'..."
        PGPASSWORD="$DB_PASSWORD" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d postgres -f setup_db.sql
        if [ $? -eq 0 ]; then
            echo "✓ Database setup completed"
        else
            echo "✗ Database setup failed"
        fi
    else
        echo "⚠ psql not found. Please install PostgreSQL client tools."
    fi
}

echo "This script will help you set up PostgreSQL for the EEG backend."
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL client (psql) is not installed."
    echo ""
    echo "Please install PostgreSQL:"
    echo "- Windows: Download from https://www.postgresql.org/download/windows/"
    echo "- macOS: brew install postgresql"
    echo "- Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "- CentOS/RHEL: sudo yum install postgresql postgresql-server"
    echo ""
    exit 1
fi

echo "PostgreSQL client found ✓"
echo ""

# Configuration options
echo "Choose your setup option:"
echo "1. Use default PostgreSQL settings (user: postgres, password: postgres)"
echo "2. Set custom database configuration"
echo "3. Use environment variables"
echo "4. Test existing configuration"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo "Using default settings..."
        export DB_HOST="localhost"
        export DB_PORT="5432"
        export DB_USER="postgres"
        export DB_PASSWORD="postgres"
        export DB_NAME="eeg_db"
        
        if test_connection; then
            setup_database
        else
            echo ""
            echo "Connection failed with default settings."
            echo "Please check if:"
            echo "1. PostgreSQL is running"
            echo "2. The postgres user password is 'postgres'"
            echo "3. PostgreSQL is listening on localhost:5432"
            echo ""
            echo "To set postgres user password:"
            echo "sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'postgres';\""
        fi
        ;;
    2)
        echo "Enter custom database configuration:"
        read -p "Host (localhost): " DB_HOST
        read -p "Port (5432): " DB_PORT
        read -p "Username (postgres): " DB_USER
        read -s -p "Password: " DB_PASSWORD
        echo ""
        read -p "Database name (eeg_db): " DB_NAME
        
        # Set defaults
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-5432}
        DB_USER=${DB_USER:-postgres}
        DB_NAME=${DB_NAME:-eeg_db}
        
        export DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME
        
        if test_connection; then
            setup_database
        else
            echo "Connection failed with provided settings."
        fi
        ;;
    3)
        echo "Using environment variables..."
        echo "Please set these environment variables:"
        echo "export DB_HOST=\"localhost\""
        echo "export DB_PORT=\"5432\""
        echo "export DB_USER=\"postgres\""
        echo "export DB_PASSWORD=\"your_password\""
        echo "export DB_NAME=\"eeg_db\""
        echo ""
        echo "Then run the backend with: go run main.go"
        ;;
    4)
        echo "Testing current configuration..."
        if test_connection "${DB_HOST:-localhost}" "${DB_PORT:-5432}" "${DB_USER:-postgres}" "${DB_NAME:-eeg_db}"; then
            echo "✓ Database connection successful!"
            echo "You can now run: go run main.go"
        else
            echo "✗ Database connection failed"
            echo "Please check your configuration"
        fi
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Setup complete!"
echo ""
echo "To start the backend server:"
echo "1. Set environment variables (if using option 3)"
echo "2. Run: ./start.sh"
echo "   or: go run main.go"
echo ""
echo "The server will start on http://localhost:8080" 