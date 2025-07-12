-- EEG Backend Database Setup Script
-- Run this script as a PostgreSQL superuser (usually postgres)

-- Create the database
CREATE DATABASE eeg_db;

-- Create a user for the application (optional - you can use the postgres user)
-- Uncomment and modify these lines if you want a dedicated user:
-- CREATE USER eeg_user WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE eeg_db TO eeg_user;

-- Connect to the database
\c eeg_db;

-- The Go application will automatically create tables using GORM migrations
-- No need to create tables manually

-- Grant permissions (if using dedicated user)
-- GRANT ALL ON SCHEMA public TO eeg_user;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO eeg_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO eeg_user;

-- Show current settings
SELECT current_database(), current_user;

-- Done!
\echo 'Database setup complete! You can now run the Go application.' 