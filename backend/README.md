# EEG Analysis Backend API

A comprehensive Go backend for EEG (Electroencephalogram) analysis using CNN-LSTM machine learning models. This backend provides user authentication, file management, analysis queue management, and report generation capabilities.

## Features

- **User Authentication**: JWT-based authentication with user registration and login
- **File Upload**: Secure file upload with metadata extraction and validation
- **Analysis Queue**: Real-time job queue management with priority levels
- **Machine Learning Integration**: Integration with Python CNN-LSTM model for EEG classification
- **Results Management**: Comprehensive storage and retrieval of analysis results
- **Report Generation**: Clinical and research report generation with multiple templates
- **Dashboard Analytics**: Real-time statistics and monitoring
- **CORS Support**: Frontend integration ready

## Prerequisites

- Go 1.24.4 or higher
- PostgreSQL database
- Python 3.x with TensorFlow/Keras (for ML model)
- Git

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd EEG/backend
   ```

2. **Install Go dependencies**:
   ```bash
   go mod tidy
   ```

3. **Set up PostgreSQL database**:
   ```sql
   CREATE DATABASE eeg_db;
   CREATE USER postgres WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE eeg_db TO postgres;
   ```

4. **Update database configuration** in `main.go`:
   ```go
   dsn := "host=localhost user=postgres password=your_password dbname=eeg_db port=5432 sslmode=disable TimeZone=UTC"
   ```

5. **Build the application**:
   ```bash
   go build -buildvcs=false -o eeg-backend .
   ```

6. **Run the server**:
   ```bash
   ./eeg-backend
   ```

The server will start on `http://localhost:8080`

## API Documentation

### Authentication

#### Register User
```http
POST /api/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure_password123",
  "role": "user" // optional, defaults to "user"
}
```

**Response**:
```json
{
  "message": "User registered successfully",
  "user_id": 1
}
```

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure_password123"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "role": "user"
  }
}
```

#### Health Check
```http
GET /api/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### File Management

All file endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

#### Upload File
```http
POST /api/upload
Content-Type: multipart/form-data

file: <eeg-file.edf>
patient_id: PT-2024-001
priority: normal // optional: urgent, normal, routine
```

**Response**:
```json
{
  "message": "File uploaded successfully",
  "job_id": 1,
  "filename": "eeg-file.edf",
  "size": 4200000,
  "status": "queued"
}
```

#### List Files
```http
GET /api/files
```

**Response**:
```json
{
  "files": [
    {
      "id": 1,
      "user_id": 1,
      "patient_id": "PT-2024-001",
      "file_name": "eeg-file.edf",
      "file_path": "uploads/1642234567_eeg-file.edf",
      "file_size": 4200000,
      "status": "completed",
      "priority": "normal",
      "progress": 100,
      "estimated_time": 5,
      "created_at": "2024-01-15T10:30:00Z",
      "started_at": "2024-01-15T10:31:00Z",
      "completed_at": "2024-01-15T10:35:00Z"
    }
  ],
  "total": 1
}
```

#### Delete File
```http
DELETE /api/files/{id}
```

**Response**:
```json
{
  "message": "File deleted successfully"
}
```

### Analysis Operations

#### Start Classification
```http
POST /api/classify
Content-Type: application/json

{
  "filename": "eeg-file.edf",
  "patient_id": "PT-2024-001", // optional
  "priority": "normal" // optional
}
```

**Response**:
```json
{
  "message": "Classification started",
  "job_id": 1,
  "status": "processing"
}
```

#### Get Analysis Queue
```http
GET /api/queue?status=all&priority=all&search=
```

**Query Parameters**:
- `status`: Filter by status (queued, processing, completed, failed, cancelled, all)
- `priority`: Filter by priority (urgent, normal, routine, all)
- `search`: Search in filename or patient ID

**Response**:
```json
{
  "jobs": [
    {
      "id": 1,
      "user_id": 1,
      "patient_id": "PT-2024-001",
      "file_name": "eeg-file.edf",
      "status": "processing",
      "priority": "normal",
      "progress": 75,
      "estimated_time": 5,
      "started_at": "2024-01-15T10:31:00Z",
      "result": null
    }
  ],
  "total": 1
}
```

#### Update Job Priority
```http
PUT /api/queue/{id}/priority
Content-Type: application/json

{
  "priority": "urgent"
}
```

#### Update Job Status
```http
PUT /api/queue/{id}/status
Content-Type: application/json

{
  "status": "cancelled"
}
```

#### Cancel Job
```http
DELETE /api/queue/{id}
```

### Results Management

#### Get All Results
```http
GET /api/results
```

**Response**:
```json
{
  "results": [
    {
      "id": 1,
      "patient_id": "PT-2024-001",
      "file_name": "eeg-file.edf",
      "status": "completed",
      "completed_at": "2024-01-15T10:35:00Z",
      "result": {
        "id": 1,
        "job_id": 1,
        "primary_diagnosis": "Epilepsy",
        "confidence": 94.2,
        "risk_level": "High",
        "processing_time": 240.5,
        "model_version": "CNN-LSTM v1.0",
        "abnormal_segments": 12,
        "created_at": "2024-01-15T10:35:00Z"
      }
    }
  ],
  "total": 1
}
```

#### Get Specific Result
```http
GET /api/results/{id}
```

#### Delete Result
```http
DELETE /api/results/{id}
```

### Dashboard & Analytics

#### Get Dashboard Data
```http
GET /api/dashboard
```

**Response**:
```json
{
  "stats": {
    "files_processed_today": 5,
    "pending_analyses": 2,
    "accuracy_rate": 94.2,
    "avg_processing_time": 3.5
  },
  "recent_analyses": [...],
  "queue_status": [...]
}
```

#### Get Statistics
```http
GET /api/stats
```

**Response**:
```json
{
  "total_files": 25,
  "completed_jobs": 20,
  "pending_jobs": 3,
  "failed_jobs": 2,
  "accuracy_rate": 94.2,
  "avg_processing": 3.5
}
```

### Report Generation

#### Generate Report
```http
POST /api/reports/generate
Content-Type: application/json

{
  "result_id": 1,
  "template": "clinical", // clinical, research, basic
  "title": "EEG Analysis Report - PT-2024-001",
  "patient_info": {
    "patient_id": "PT-2024-001",
    "age": "45",
    "gender": "M",
    "recording_date": "2024-01-15",
    "clinical_history": "History of seizures"
  }
}
```

**Response**:
```json
{
  "message": "Report generated successfully",
  "report_id": 1
}
```

#### Get All Reports
```http
GET /api/reports
```

#### Get Specific Report
```http
GET /api/reports/{id}
```

#### Download Report
```http
GET /api/reports/{id}/download
```

#### Delete Report
```http
DELETE /api/reports/{id}
```

## Data Models

### User
```go
type User struct {
    ID           uint      `json:"id"`
    Username     string    `json:"username"`
    Role         string    `json:"role"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}
```

### AnalysisJob
```go
type AnalysisJob struct {
    ID            uint      `json:"id"`
    UserID        uint      `json:"user_id"`
    PatientID     string    `json:"patient_id"`
    FileName      string    `json:"file_name"`
    FilePath      string    `json:"file_path"`
    FileSize      int64     `json:"file_size"`
    Status        string    `json:"status"`        // queued, processing, completed, failed, cancelled
    Priority      string    `json:"priority"`      // urgent, normal, routine
    Progress      int       `json:"progress"`      // 0-100
    EstimatedTime int       `json:"estimated_time"` // minutes
    StartedAt     *time.Time `json:"started_at"`
    CompletedAt   *time.Time `json:"completed_at"`
    ErrorMessage  string    `json:"error_message"`
    ResultID      *uint     `json:"result_id"`
    Result        *AnalysisResult `json:"result,omitempty"`
    CreatedAt     time.Time `json:"created_at"`
    UpdatedAt     time.Time `json:"updated_at"`
}
```

### AnalysisResult
```go
type AnalysisResult struct {
    ID                uint    `json:"id"`
    JobID             uint    `json:"job_id"`
    PrimaryDiagnosis  string  `json:"primary_diagnosis"`
    Confidence        float64 `json:"confidence"`
    RiskLevel         string  `json:"risk_level"`
    ProcessingTime    float64 `json:"processing_time"`
    ModelVersion      string  `json:"model_version"`
    RecordingDuration string  `json:"recording_duration"`
    AbnormalSegments  int     `json:"abnormal_segments"`
    DetailedResults   string  `json:"detailed_results"`
    SpectralData      string  `json:"spectral_data"`
    TemporalData      string  `json:"temporal_data"`
    CreatedAt         time.Time `json:"created_at"`
}
```

## Machine Learning Integration

The backend integrates with a Python CNN-LSTM model located at `../Model/EEG_Classification_report.py`. 

### Model Requirements
- Input: EEG data files (CSV, EDF formats)
- Output: JSON response with classification results
- Expected output format:
```json
{
  "diagnosis": "Epilepsy",
  "confidence": 94.2,
  "abnormal_segments": 12
}
```

### Processing Flow
1. File uploaded and queued
2. Background goroutine starts classification
3. Python script executed with file path
4. Results parsed and stored in database
5. Job status updated to completed/failed

## Security Considerations

- **JWT Authentication**: All protected endpoints require valid JWT tokens
- **User Isolation**: Users can only access their own data
- **File Security**: Uploaded files are stored with unique names to prevent conflicts
- **CORS**: Configured for frontend integration
- **Input Validation**: All inputs are validated before processing

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `409` - Conflict (username already exists)
- `500` - Internal Server Error

Error responses include descriptive messages:
```json
{
  "error": "Invalid credentials"
}
```

## Development & Testing

### Running in Development
```bash
go run main.go
```

### Building for Production
```bash
go build -buildvcs=false -o eeg-backend .
```

### Environment Variables
For production, set these environment variables:
```bash
export JWT_SECRET="your-super-secure-secret-key"
export DB_HOST="localhost"
export DB_USER="postgres"
export DB_PASSWORD="your-password"
export DB_NAME="eeg_db"
export DB_PORT="5432"
```

## Frontend Integration

The backend is designed to work with the React/Next.js frontend located in the `../frontend` directory. Key integration points:

1. **Authentication**: Frontend stores JWT tokens and includes them in API calls
2. **File Upload**: Drag-and-drop upload interface
3. **Real-time Updates**: Frontend polls queue status for progress updates
4. **Dashboard**: Real-time statistics and job monitoring
5. **Results Visualization**: Charts and graphs for EEG analysis results

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify connection string
   - Ensure database exists

2. **Python Model Not Found**
   - Verify `../Model/EEG_Classification_report.py` exists
   - Check Python environment and dependencies
   - Ensure script has proper permissions

3. **File Upload Issues**
   - Check `uploads/` directory exists and is writable
   - Verify file size limits
   - Ensure proper file formats

4. **CORS Issues**
   - Frontend and backend URLs must match CORS configuration
   - Check browser developer tools for CORS errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request

## License

This project is part of the EEG Analysis System for neurological disorder detection. 