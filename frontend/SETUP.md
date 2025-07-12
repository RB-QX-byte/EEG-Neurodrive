# Frontend Setup Instructions

## Overview

This Next.js frontend is now fully integrated with the Go backend and ML model capabilities. It provides a complete EEG analysis platform with user authentication, file upload, real-time analysis tracking, and TimescaleDB data management.

## Features Implemented

### ✅ Authentication System
- User registration and login
- JWT token management
- Protected routes
- Role-based access

### ✅ Dashboard
- Real-time statistics from backend
- Recent analyses display
- Queue status monitoring
- Auto-refresh every 30 seconds

### ✅ File Upload & Analysis
- Drag-and-drop file upload
- Patient ID and priority selection
- Real-time upload progress
- Automatic analysis triggering
- Support for EDF, CSV, TXT files

### ✅ EEG Data Management
- TimescaleDB integration
- Subject browsing and management
- Time-series data viewer
- Real-time data visualization
- Data filtering by time range

### ✅ Analysis Queue
- Job status monitoring
- Priority management
- Progress tracking
- Result viewing

### ✅ Results & Reports
- Analysis result viewing
- Report generation
- Download functionality

## Environment Setup

Create a `.env.local` file in the frontend directory:

```bash
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Application Configuration
NEXT_PUBLIC_APP_NAME=NeuroClassify
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Running the Application

### 1. Start the Backend
```bash
cd ../backend
./eeg-backend.exe
```

### 2. Start the Frontend
```bash
# Install dependencies (if not already done)
pnpm install

# Start development server
pnpm dev
```

### 3. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api

## Usage Flow

### First-Time Setup
1. **Register Account**: Visit `/register` to create a new account
2. **Login**: Use your credentials at `/login`
3. **Upload Files**: Go to `/upload` to upload EEG files
4. **Monitor Progress**: Check `/queue` for analysis progress
5. **View Results**: Access `/results` for completed analyses
6. **Manage Data**: Use `/eeg-data` for TimescaleDB datasets

### Key Pages

#### Dashboard (`/`)
- Overview statistics
- Recent analysis results
- Real-time queue status
- Quick navigation

#### Upload (`/upload`)
- Patient information form
- Drag-and-drop file upload
- Upload progress monitoring
- Automatic analysis start

#### Analysis Queue (`/queue`)
- Job status filtering
- Priority management
- Progress tracking
- Cancel/retry options

#### Results (`/results`)
- Completed analysis results
- Confidence scores
- Detailed reports
- Result navigation

#### EEG Data (`/eeg-data`)
- Subject management
- Time-series data viewing
- Data visualization
- TimescaleDB integration

## Integration Points

### Backend API Integration
- All API calls use JWT authentication
- Real-time data updates
- Error handling and retry logic
- File upload with progress tracking

### ML Model Integration
- Automatic analysis triggering
- Result processing and display
- Confidence score visualization
- Report generation

### TimescaleDB Integration
- EEG subject management
- Time-series data queries
- Real-time visualization
- Data filtering and export

## Technical Features

### State Management
- React Context for authentication
- Local state for component data
- Automatic token refresh
- Session persistence

### UI/UX
- Responsive design with Tailwind CSS
- shadcn/ui component library
- Loading states and error handling
- Real-time updates
- Drag-and-drop interfaces

### Performance
- Lazy loading for large datasets
- Efficient data pagination
- Chart optimization for large datasets
- Background data fetching

## API Endpoints Used

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/health` - Health check

### File Management
- `POST /api/upload` - File upload
- `GET /api/files` - List files
- `DELETE /api/files/:id` - Delete file

### Analysis
- `POST /api/classify` - Start analysis
- `GET /api/queue` - Get analysis queue
- `PUT /api/queue/:id/priority` - Update priority
- `DELETE /api/queue/:id` - Cancel job

### Results
- `GET /api/results` - Get results
- `GET /api/results/:id` - Get specific result
- `DELETE /api/results/:id` - Delete result

### Reports
- `POST /api/reports/generate` - Generate report
- `GET /api/reports` - List reports
- `GET /api/reports/:id/download` - Download report

### EEG Data (TimescaleDB)
- `GET /api/eeg/subjects` - List subjects
- `POST /api/eeg/import` - Import data
- `GET /api/eeg/data/:subject_id` - Get time-series data
- `DELETE /api/eeg/data/:subject_id` - Delete data

### Dashboard
- `GET /api/dashboard` - Dashboard data
- `GET /api/stats` - Statistics

## Error Handling

The frontend includes comprehensive error handling:
- Network errors with retry options
- Authentication failures with redirect
- Form validation with user feedback
- API error display with detailed messages
- Loading states for all async operations

## Security Features

- JWT token authentication
- Protected route middleware
- Automatic logout on token expiry
- Secure API communication
- Role-based access control

## Next Steps

The frontend is now fully functional and integrated. You can:

1. **Add User Accounts**: Register and login with different roles
2. **Upload EEG Files**: Test the upload and analysis workflow
3. **View Results**: Monitor analysis progress and results
4. **Manage Data**: Use the TimescaleDB integration for data management
5. **Generate Reports**: Create and download analysis reports

The system is production-ready with all major features implemented and integrated with your Go backend and ML model. 