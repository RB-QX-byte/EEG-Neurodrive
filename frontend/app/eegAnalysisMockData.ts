// Mock data for EEG analysis components
import { AnalysisStatus, AnalysisPriority, FileUploadStatus, ChartDataType } from '../lib/enums';

// Mock data for queue page
export const mockQueueData = [
  {
    id: 1,
    user_id: 1,
    patient_id: "PAT001",
    file_name: "eeg_recording_001.edf",
    file_path: "/uploads/eeg_recording_001.edf",
    file_size: 52428800,
    status: AnalysisStatus.PROCESSING as const,
    priority: AnalysisPriority.URGENT as const,
    progress: 75,
    estimated_time: 300,
    started_at: "2024-01-15T10:30:00Z",
    created_at: "2024-01-15T10:25:00Z",
    updated_at: "2024-01-15T10:35:00Z"
  },
  {
    id: 2,
    user_id: 2,
    patient_id: "PAT002", 
    file_name: "eeg_data_002.csv",
    file_path: "/uploads/eeg_data_002.csv",
    file_size: 25600000,
    status: AnalysisStatus.QUEUED as const,
    priority: AnalysisPriority.NORMAL as const,
    progress: 0,
    estimated_time: 450,
    created_at: "2024-01-15T11:00:00Z",
    updated_at: "2024-01-15T11:00:00Z"
  }
];

// Mock data for EEG waveform chart
export const mockEEGData = [
  {
    time: "2024-01-15T10:00:00Z",
    channel_1: 12.5,
    channel_2: -8.3,
    channel_3: 15.7,
    channel_4: -12.1,
    channel_5: 9.8,
    channel_6: -6.4,
    channel_7: 18.2,
    channel_8: -15.9
  },
  {
    time: "2024-01-15T10:00:01Z", 
    channel_1: 14.2,
    channel_2: -7.1,
    channel_3: 16.8,
    channel_4: -10.5,
    channel_5: 11.3,
    channel_6: -5.7,
    channel_7: 19.1,
    channel_8: -14.2
  }
];

// Mock data for EEG waveform chart
export const mockEEGData = [
  {
    time: "2024-01-15T10:00:00Z",
    channel_1: 12.5,
    channel_2: -8.3,
    channel_3: 15.7,
    channel_4: -12.1,
    channel_5: 9.8,
    channel_6: -6.4,
    channel_7: 18.2,
    channel_8: -15.9
  },
  {
    time: "2024-01-15T10:00:01Z", 
    channel_1: 14.2,
    channel_2: -7.1,
    channel_3: 16.8,
    channel_4: -10.5,
    channel_5: 11.3,
    channel_6: -5.7,
    channel_7: 19.1,
    channel_8: -14.2
  }
];
// Mock data for analysis trends chart
export const mockTrendsData = [
  {
    date: "2024-01-09",
    completed: 45,
    failed: 3,
    processing: 12
  },
  {
    date: "2024-01-10",
    completed: 52,
    failed: 2,
    processing: 8
  },
  {
    date: "2024-01-11",
    completed: 38,
    failed: 5,
    processing: 15
  }
];

// Mock data for enhanced dropzone
export const mockUploadFiles = [
  {
    id: "file-1",
    name: "patient_001_eeg.edf",
    size: 52428800,
    status: FileUploadStatus.SUCCESS as const,
    progress: 100
  },
  {
    id: "file-2", 
    name: "eeg_session_002.csv",
    size: 25600000,
    status: FileUploadStatus.UPLOADING as const,
    progress: 65
  }
];

export const mockChannels = [
  "channel_1", "channel_2", "channel_3", "channel_4",
  "channel_5", "channel_6", "channel_7", "channel_8"
];