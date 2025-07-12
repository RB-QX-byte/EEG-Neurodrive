# TimescaleDB Integration for EEG Data

This documentation explains how to set up and use TimescaleDB to store and analyze the EEG Kaggle datasets.

## Overview

The backend now includes TimescaleDB integration to efficiently store and query large volumes of EEG time-series data. TimescaleDB is an extension of PostgreSQL optimized for time-series data.

## Setup Instructions

### 1. Install TimescaleDB

First, you need PostgreSQL with TimescaleDB extension:

**Option A: Using Docker (Recommended)**
```bash
docker run -d --name timescaledb -p 5432:5432 -e POSTGRES_PASSWORD=postgres timescale/timescaledb:latest-pg14
```

**Option B: Install locally**
Follow the [TimescaleDB installation guide](https://docs.timescale.com/install/latest/) for your operating system.

### 2. Setup Database and Permissions

Run the setup script as a PostgreSQL superuser:

```bash
# Connect as postgres user and run setup
psql -U postgres -f setup_timescaledb.sql
```

This script will:
- Create the `eeg_db` database
- Install TimescaleDB extension
- Create the `multi` user with proper permissions
- Set up necessary privileges

### 3. Build and Run the Backend

```bash
# Build the main application
go build -o eeg-backend.exe main.go

# Run the backend (this will create tables and hypertables)
./eeg-backend.exe
```

### 4. Import Kaggle EEG Data

Build and run the import utility:

```bash
# Navigate to scripts directory
cd scripts

# Build the import utility
go build -o import-kaggle.exe import_kaggle_data.go

# Run the import (this will take several minutes)
./import-kaggle.exe
```

The import process will:
- Process all 36 CSV files (s00.csv to s35.csv)
- Create subject records for each dataset
- Import ~31,000 data points per subject
- Store data with proper timestamps in TimescaleDB hypertables

## Data Structure

### EEG Subjects Table
- `id`: Primary key
- `subject_id`: Unique identifier (s00, s01, etc.)
- `age`, `gender`, `condition`: Patient metadata (optional)
- `description`: Import details

### EEG Data Points Hypertable
- `time`: Timestamp (primary key, used for partitioning)
- `subject_id`: Subject identifier (primary key)
- `channel_1` to `channel_19`: EEG channel values

## API Endpoints

### EEG Data Management

#### Get All Subjects
```http
GET /api/eeg/subjects
Authorization: Bearer <token>
```

#### Import EEG Data
```http
POST /api/eeg/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "file_path": "path/to/eeg/file.csv",
  "subject_id": "s00"
}
```

#### Get EEG Data for Subject
```http
GET /api/eeg/data/{subject_id}?limit=1000&start_time=2024-01-01T00:00:00Z&end_time=2024-01-01T01:00:00Z
Authorization: Bearer <token>
```

Parameters:
- `limit`: Number of records (default: 1000, max: 10000)
- `start_time`: Filter by start time (ISO 8601 format)
- `end_time`: Filter by end time (ISO 8601 format)

#### Delete EEG Data
```http
DELETE /api/eeg/data/{subject_id}
Authorization: Bearer <token>
```

## Environment Variables

Configure the following environment variables for database connection:

```bash
export DB_HOST=localhost
export DB_USER=multi
export DB_PASSWORD=r2003
export DB_NAME=eeg_db
export DB_PORT=5432
export DB_SSLMODE=disable
```

## Performance Features

### TimescaleDB Optimizations
- **Hypertables**: Automatic partitioning by time for better query performance
- **Batch Inserts**: Data imported in batches of 2000 records for efficiency
- **Indexes**: Optimized indexes on `(subject_id, time)` for fast queries
- **Compression**: Automatic compression of older data (can be configured)

### Query Examples

**Get recent data for a subject:**
```sql
SELECT * FROM eeg_data_points 
WHERE subject_id = 's00' 
ORDER BY time DESC 
LIMIT 1000;
```

**Get data within time range:**
```sql
SELECT * FROM eeg_data_points 
WHERE subject_id = 's00' 
AND time BETWEEN '2024-01-01' AND '2024-01-02'
ORDER BY time;
```

**Calculate channel averages:**
```sql
SELECT 
  subject_id,
  AVG(channel_1) as avg_ch1,
  AVG(channel_2) as avg_ch2,
  COUNT(*) as total_points
FROM eeg_data_points 
WHERE time >= NOW() - INTERVAL '1 hour'
GROUP BY subject_id;
```

## Data Import Details

The import process creates realistic timestamps:
- Each subject gets a 1-hour window of data
- Data points are spaced 4ms apart (simulating 256 Hz sampling rate)
- Subjects are spread across different time periods
- Invalid records (wrong column count, parsing errors) are skipped

## Monitoring and Maintenance

### Check Import Status
```sql
-- Count records per subject
SELECT subject_id, COUNT(*) as record_count 
FROM eeg_data_points 
GROUP BY subject_id 
ORDER BY subject_id;

-- Check data time ranges
SELECT 
  subject_id,
  MIN(time) as earliest,
  MAX(time) as latest,
  COUNT(*) as total_records
FROM eeg_data_points 
GROUP BY subject_id;
```

### Database Size
```sql
-- Check hypertable size
SELECT pg_size_pretty(pg_total_relation_size('eeg_data_points'));

-- Check compression ratio (if compression is enabled)
SELECT * FROM timescaledb_information.compressed_chunk_stats;
```

## Troubleshooting

### Permission Issues
If you get permission errors, ensure the `multi` user has proper privileges:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO multi;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO multi;
```

### Connection Issues
- Verify PostgreSQL is running
- Check TimescaleDB extension is installed: `SELECT * FROM pg_extension WHERE extname = 'timescaledb';`
- Ensure environment variables are set correctly

### Import Issues
- Check CSV file format (should have exactly 19 columns)
- Verify file paths are correct
- Monitor logs for specific error messages

## Integration with ML Models

The stored EEG data can be easily queried for machine learning workflows:

1. **Feature Extraction**: Query specific time windows and channels
2. **Batch Processing**: Use TimescaleDB's window functions for signal processing
3. **Real-time Analysis**: Stream data using time-based queries
4. **Cross-Subject Analysis**: Compare patterns across all subjects

This TimescaleDB integration provides a robust foundation for storing, querying, and analyzing large-scale EEG datasets efficiently. 