// Analysis job status and priority enums
export enum AnalysisStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum AnalysisPriority {
  URGENT = 'urgent',
  NORMAL = 'normal',
  ROUTINE = 'routine'
}

export enum FileUploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading', 
  SUCCESS = 'success',
  ERROR = 'error'
}

export enum ChartDataType {
  COMPLETED = 'completed',
  FAILED = 'failed',
  PROCESSING = 'processing'
}