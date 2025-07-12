# EEG Analysis Platform - Complete Integration Guide

## Overview

Your EEG analysis platform is now fully integrated! Here's what has been implemented:

### 🧠 **Backend (Go)** 
- User authentication with JWT
- File upload and management
- EEG analysis job queue
- TimescaleDB integration for time-series data
- Results and report generation
- Real-time API endpoints

### 🎨 **Frontend (Next.js)**
- Authentication pages (login/register)
- Real-time dashboard with statistics
- Drag-and-drop file upload
- Analysis queue monitoring
- EEG data visualization with charts
- TimescaleDB data management

### 🧪 **ML Model Integration**
- Automatic analysis triggering
- CNN-LSTM model execution
- Result processing and storage
- Classification confidence scoring

### 💾 **TimescaleDB**
- EEG time-series data storage
- 36 subjects with ~31,000 data points each
- Real-time querying and visualization
- Hypertable optimization

## Quick Start (3 Steps)

### Step 1: Start TimescaleDB
```bash
# Start Docker container
docker run -d --name timescaledb -p 5432:5432 -e POSTGRES_PASSWORD=postgres timescale/timescaledb:latest-pg14

# Setup database
docker exec -it timescaledb psql -U postgres -c "CREATE DATABASE eeg_db;"
docker exec -it timescaledb psql -U postgres -d eeg_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### Step 2: Start Backend
```bash
cd backend
DB_HOST=127.0.0.1 DB_USER=postgres DB_PASSWORD=postgres ./eeg-backend.exe
```

### Step 3: Start Frontend
```bash
cd frontend

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8080/api" > .env.local

# Start frontend
pnpm dev
```

**🎉 Access your application at: http://localhost:3000**

## Complete Feature Tour

### 1. Authentication System
- **Register**: Create account at `/register` with role selection
- **Login**: Secure login at `/login` with JWT tokens
- **Logout**: Click logout button in sidebar

### 2. Dashboard (`/`)
- **Real-time Stats**: Files processed, pending analyses, accuracy rate
- **Live Queue**: Current processing jobs with progress bars
- **Recent Analyses**: Latest results with status badges
- **Auto-refresh**: Updates every 30 seconds

### 3. File Upload (`/upload`)
- **Patient Info**: Enter Patient ID and select priority
- **Drag & Drop**: Upload EDF, CSV, TXT files (up to 500MB)
- **Progress Tracking**: Real-time upload and analysis progress
- **Auto Analysis**: Files automatically start analysis after upload

### 4. Analysis Queue (`/queue`)
- **Job Monitoring**: Filter by status, priority, or search terms
- **Priority Management**: Change job priorities on the fly
- **Progress Tracking**: See real-time analysis progress
- **Cancel/Retry**: Manage failed or stuck jobs

### 5. Results Library (`/results`)
- **Analysis Results**: View completed analyses with confidence scores
- **Detailed Reports**: Access full analysis reports
- **Download Options**: Export results in various formats
- **Result Navigation**: Easy browsing of historical analyses

### 6. EEG Data Management (`/eeg-data`)
- **Subject Browser**: View all imported EEG subjects
- **Data Viewer**: Query time-series data with filtering
- **Visualization**: Real-time charts of EEG channels
- **Data Management**: Delete subjects or export data

### 7. Reports (`/reports`)
- **Report Generation**: Create clinical or research reports
- **Template Options**: Multiple report formats
- **Download**: PDF and text report downloads
- **Report History**: Access previously generated reports

## ML Model Integration

The system automatically integrates with your ML model:

### Supported Analysis
- **CNN-LSTM Classification**: Automatic neurological disorder detection
- **Confidence Scoring**: AI confidence levels for diagnoses
- **Multi-channel Analysis**: 19-channel EEG processing
- **Real-time Processing**: Background analysis with progress tracking

### Model Execution Flow
1. **File Upload** → Backend receives EEG file
2. **Queue Processing** → Job added to analysis queue
3. **Model Execution** → Python CNN-LSTM model processes data
4. **Result Storage** → Results saved with confidence scores
5. **Notification** → Frontend updates with completion status

## TimescaleDB Integration

### Imported Data
- **36 EEG Subjects**: s00 through s35 from Kaggle dataset
- **~1.1M Data Points**: Approximately 31,000 points per subject
- **19 Channels**: Full EEG channel data per time point
- **Time-series Optimization**: Hypertable partitioning for performance

### Data Management Features
- **Subject Browsing**: View all subjects with metadata
- **Time Filtering**: Query data by date/time ranges
- **Channel Visualization**: Real-time plots of EEG signals
- **Data Export**: Download filtered datasets
- **Performance Queries**: Optimized for large-scale data

### Usage Examples
```sql
-- View subjects
SELECT subject_id, COUNT(*) as record_count 
FROM eeg_data_points 
GROUP BY subject_id;

-- Query recent data
SELECT * FROM eeg_data_points 
WHERE subject_id = 's00' 
AND time >= NOW() - INTERVAL '1 hour'
ORDER BY time DESC 
LIMIT 1000;
```

## API Integration

### Authentication Endpoints
```bash
# Register new user
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"doctor","password":"password","role":"Clinical Neurologist"}'

# Login
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"doctor","password":"password"}'
```

### File Upload & Analysis
```bash
# Upload EEG file
curl -X POST http://localhost:8080/api/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@path/to/eeg_file.csv" \
  -F "patient_id=PT-2024-001" \
  -F "priority=normal"

# Start analysis
curl -X POST http://localhost:8080/api/classify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"eeg_file.csv","patient_id":"PT-2024-001"}'
```

### TimescaleDB Data Access
```bash
# Get EEG subjects
curl -X GET http://localhost:8080/api/eeg/subjects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get EEG time-series data
curl -X GET "http://localhost:8080/api/eeg/data/s00?limit=1000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Backend Issues
```bash
# Check backend status
curl http://localhost:8080/api/health

# View backend logs
./eeg-backend.exe 2>&1 | tee backend.log
```

### Frontend Issues
```bash
# Check frontend build
pnpm build

# Clear Next.js cache
rm -rf .next
pnpm dev
```

### Database Issues
```bash
# Check TimescaleDB connection
docker exec -it timescaledb psql -U postgres -d eeg_db -c "SELECT version();"

# Check hypertable status
docker exec -it timescaledb psql -U postgres -d eeg_db -c "SELECT * FROM timescaledb_information.hypertables;"
```

## Production Deployment

For production deployment:

### Environment Variables
```bash
# Backend
export DB_HOST=your-timescaledb-host
export DB_USER=your-db-user
export DB_PASSWORD=your-secure-password
export JWT_SECRET=your-secure-jwt-secret

# Frontend
export NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

### Security Considerations
- Use strong JWT secrets
- Enable HTTPS in production
- Implement rate limiting
- Regular database backups
- Monitor system logs

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   TimescaleDB   │
│   (Next.js)     │────│   (Go/Gin)      │────│   (PostgreSQL)  │
│   - Auth UI     │    │   - JWT Auth    │    │   - EEG Data    │
│   - Dashboard   │    │   - File Upload │    │   - Hypertables │
│   - EEG Viewer  │    │   - Job Queue   │    │   - Time-series │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   ML Model      │
                       │   (Python)      │
                       │   - CNN-LSTM    │
                       │   - Classification│
                       └─────────────────┘
```

## NEW: AI Prediction Feature ⚡

Added comprehensive predict functionality using the pre-trained `cnn_lstm_model_efficient.h5` model:

### Key Features
- **Multiple Entry Points**: Predict buttons on EEG Data page, Upload page, and Dashboard
- **Pre-trained Model**: Fast predictions using existing CNN-LSTM model (30s-2min vs 10-15min training)
- **Statistical Analysis**: Comprehensive confidence, risk, and class distribution analysis
- **Real-time Processing**: Background prediction with progress tracking

### Usage Locations
1. **EEG Data Page** (`/eeg-data`): Click "Predict" on any TimescaleDB subject
2. **Upload Page** (`/upload`): Click "Predict" on uploaded files  
3. **Dashboard** (`/`): Quick predict on recent analyses

### API Endpoint
```bash
# Run prediction
curl -X POST http://localhost:8080/api/predict \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"file_path":"uploads/eeg_file.csv","patient_id":"PT-2024-001"}'
```

### Benefits
- **Speed**: Fast inference without model retraining
- **Integration**: Seamless with existing workflow
- **Accuracy**: Uses proven pre-trained model
- **Convenience**: Multiple access points for different use cases

See `PREDICT_FEATURE_GUIDE.md` for detailed usage instructions.

## Success! 🎉

Your EEG analysis platform is now fully operational with enhanced AI capabilities:
- ✅ Real-time user authentication
- ✅ File upload and analysis workflow
- ✅ **NEW: AI Prediction with pre-trained model**
- ✅ ML model integration (training + prediction modes)
- ✅ TimescaleDB time-series data management
- ✅ Interactive data visualization
- ✅ Complete API integration
- ✅ Production-ready architecture

The system is ready for clinical or research use with both training and fast prediction capabilities! 