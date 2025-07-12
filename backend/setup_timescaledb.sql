-- TimescaleDB Setup Script for EEG Data
-- Run this script with a PostgreSQL superuser (e.g., postgres)

-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE eeg_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'eeg_db')\gexec

-- Connect to the eeg_db database
\c eeg_db

-- Install TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create user if doesn't exist and grant permissions
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'multi') THEN

      CREATE ROLE multi LOGIN PASSWORD 'r2003';
   END IF;
END
$do$;

-- Grant necessary permissions to multi user
GRANT CONNECT ON DATABASE eeg_db TO multi;
GRANT USAGE ON SCHEMA public TO multi;
GRANT CREATE ON SCHEMA public TO multi;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO multi;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO multi;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO multi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO multi;

-- Create the EEG data table structure (will be managed by GORM)
-- This is just for reference - GORM will create the actual tables
/*
CREATE TABLE IF NOT EXISTS eeg_subjects (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    subject_id VARCHAR(50) UNIQUE NOT NULL,
    age INTEGER,
    gender VARCHAR(20),
    condition VARCHAR(100),
    description TEXT
);

CREATE TABLE IF NOT EXISTS eeg_data_points (
    time TIMESTAMPTZ NOT NULL,
    subject_id VARCHAR(50) NOT NULL,
    channel_1 DOUBLE PRECISION,
    channel_2 DOUBLE PRECISION,
    channel_3 DOUBLE PRECISION,
    channel_4 DOUBLE PRECISION,
    channel_5 DOUBLE PRECISION,
    channel_6 DOUBLE PRECISION,
    channel_7 DOUBLE PRECISION,
    channel_8 DOUBLE PRECISION,
    channel_9 DOUBLE PRECISION,
    channel_10 DOUBLE PRECISION,
    channel_11 DOUBLE PRECISION,
    channel_12 DOUBLE PRECISION,
    channel_13 DOUBLE PRECISION,
    channel_14 DOUBLE PRECISION,
    channel_15 DOUBLE PRECISION,
    channel_16 DOUBLE PRECISION,
    channel_17 DOUBLE PRECISION,
    channel_18 DOUBLE PRECISION,
    channel_19 DOUBLE PRECISION,
    PRIMARY KEY (time, subject_id)
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('eeg_data_points', 'time', if_not_exists => TRUE);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_eeg_data_subject_time ON eeg_data_points (subject_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_eeg_subjects_subject_id ON eeg_subjects (subject_id);
*/

-- Display completion message
\echo 'TimescaleDB setup completed successfully!'
\echo 'Database: eeg_db'
\echo 'User: multi'
\echo 'You can now run the Go backend application.' 