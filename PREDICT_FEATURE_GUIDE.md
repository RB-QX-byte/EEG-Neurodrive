# EEG Prediction Feature Guide

## Overview

The new **Predict** functionality allows you to run AI-powered predictions on EEG data using the pre-trained CNN-LSTM model (`cnn_lstm_model_efficient.h5`). This feature provides real-time neurological disorder detection with comprehensive statistical analysis.

## What's New

### 🧠 Pre-trained Model Integration
- Loads the existing `cnn_lstm_model_efficient.h5` model
- Fast prediction without retraining
- Statistical analysis of results

### 🎯 Multiple Prediction Entry Points
- **EEG Data Page**: Predict on TimescaleDB subjects
- **Upload Page**: Predict on uploaded files
- **Dashboard**: Quick predict on recent analyses

### 📊 Enhanced Results
- Primary diagnosis with confidence scores
- Risk level assessment
- Class distribution analysis
- Confidence distribution breakdown
- Sample-level predictions

## How to Use

### 1. EEG Data Page Predictions

**Location**: `/eeg-data`

**Steps**:
1. Browse available EEG subjects in TimescaleDB
2. Click **"Predict"** button next to any subject
3. Or select a subject and click **"Run Prediction"** in the Data Viewer

**Use Case**: Predict on existing time-series EEG data

### 2. Upload Page Predictions

**Location**: `/upload`

**Steps**:
1. Upload EEG files (EDF, CSV, TXT)
2. Wait for upload to complete (status: "uploaded" or "completed")
3. Click **"Predict"** button in the Actions column

**Use Case**: Predict on newly uploaded EEG files

### 3. Dashboard Quick Predictions

**Location**: `/` (Dashboard)

**Steps**:
1. View recent analyses in the dashboard table
2. Click **"Predict"** button for completed analyses
3. Monitor prediction progress

**Use Case**: Quick predictions on recently processed files

## Prediction Process

### Backend Flow
1. **File Processing**: Validates and preprocesses EEG data
2. **Model Loading**: Loads the pre-trained CNN-LSTM model
3. **Prediction**: Runs inference on normalized data
4. **Statistical Analysis**: Calculates comprehensive statistics
5. **Result Storage**: Saves results to database

### Frontend Flow
1. **Button Click**: User clicks any predict button
2. **API Call**: Frontend calls `/api/predict` endpoint
3. **Job Creation**: Backend creates prediction job
4. **Progress Tracking**: Real-time status updates
5. **Result Display**: Navigate to results page for details

## Prediction Results

### Primary Diagnosis
- **Normal/Healthy**: No disorders detected
- **Epilepsy**: Seizure-related patterns
- **Parkinson's Disease**: Movement disorder indicators
- **Autism Spectrum Disorder**: Neurodevelopmental patterns
- **Psychiatric Disorders**: Mental health-related patterns

### Confidence Levels
- **High Confidence**: ≥80% (Reliable prediction)
- **Medium Confidence**: 60-79% (Moderate reliability)
- **Low Confidence**: <60% (Requires expert review)

### Risk Assessment
- **High Risk**: Strong indicators of disorder
- **Medium Risk**: Some concerning patterns
- **Low Risk**: Minimal or no risk indicators

## Statistical Analysis

### Class Distribution
- Shows percentage breakdown of predicted disorders
- Helps identify dominant patterns in the data

### Confidence Statistics
- Average, minimum, maximum confidence scores
- Standard deviation of confidence levels
- Distribution of high/medium/low confidence predictions

### Sample Analysis
- Individual predictions for data segments
- Class probabilities for each prediction
- Temporal analysis of confidence changes

## Technical Details

### Supported File Formats
- **EDF/EDF+**: Standard EEG formats
- **CSV**: Comma-separated values with 54 feature columns
- **TXT**: Text files with space-separated data

### Model Architecture
- **Type**: CNN-LSTM (Convolutional Neural Network + Long Short-Term Memory)
- **Version**: 1.0
- **Input**: 54 normalized EEG features
- **Output**: 5-class disorder classification

### Data Preprocessing
- Automatic normalization using StandardScaler
- Missing value handling (NaN → 0)
- Automatic reshaping for CNN-LSTM input
- Feature validation and error checking

## API Reference

### Predict Endpoint
```http
POST /api/predict
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "file_path": "uploads/patient_data.csv",
  "patient_id": "PT-2024-001"
}
```

### Response
```json
{
  "message": "Prediction started",
  "job_id": 123,
  "status": "processing"
}
```

## Troubleshooting

### Common Issues

**1. Model Not Found**
- Error: "Model file cnn_lstm_model_efficient.h5 not found"
- Solution: Ensure model file exists in `/Model` directory

**2. Invalid File Format**
- Error: "Failed to preprocess data"
- Solution: Check file format and data structure

**3. Prediction Failed**
- Error: Various prediction errors
- Solution: Check file integrity and format compatibility

### Error Handling
- All prediction errors are logged in the backend
- Frontend displays user-friendly error messages
- Failed predictions can be retried

## Performance Notes

### Speed Comparison
- **Training**: 10-15 minutes (creates new model)
- **Prediction**: 30 seconds - 2 minutes (uses existing model)

### Resource Usage
- **CPU**: High during prediction processing
- **Memory**: Moderate (model loading + data processing)
- **Storage**: Minimal (results only)

## Best Practices

### For Optimal Results
1. **Data Quality**: Use high-quality, properly formatted EEG data
2. **File Size**: Keep files under 500MB for faster processing
3. **Patient Context**: Provide patient IDs for better tracking
4. **Result Review**: Always review predictions with medical expertise

### Workflow Recommendations
1. **Upload** → **Validate** → **Predict** → **Review Results**
2. Use different prediction entry points for different workflows
3. Monitor prediction jobs in the queue/results pages
4. Export results for external analysis if needed

## Integration with Existing Workflow

### Compatibility
- **Full Integration**: Works with existing upload/analysis workflow
- **Data Sharing**: Uses same file storage and database
- **User Management**: Respects existing authentication and permissions

### Migration
- **Existing Data**: Can predict on previously uploaded files
- **Database**: Uses existing analysis_jobs and analysis_results tables
- **No Breaking Changes**: Existing functionality remains unchanged

## Future Enhancements

### Planned Features
- **Batch Predictions**: Multiple files simultaneously
- **Model Versioning**: Support for multiple model versions
- **Export Options**: PDF/Excel report generation
- **Real-time Streaming**: Live EEG data prediction
- **Custom Models**: User-provided model support

---

**Note**: The predict functionality is designed to complement, not replace, the existing training workflow. Both features can be used depending on your specific needs:
- Use **Training** for developing new models or improving existing ones
- Use **Prediction** for fast analysis with the current best model 