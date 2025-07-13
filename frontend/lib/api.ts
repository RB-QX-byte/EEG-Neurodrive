// API service for connecting to the Go backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Types for API responses
export interface User {
  id: number;
  username: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AnalysisJob {
  id: number;
  user_id: number;
  user?: {
    username?: string;
  };
  patient_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: 'urgent' | 'normal' | 'routine';
  progress: number;
  estimated_time: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  result?: AnalysisResult;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResult {
  id: number;
  job_id: number;
  primary_diagnosis: string;
  confidence: number;
  risk_level: string;
  processing_time: number;
  model_version: string;
  recording_duration: string;
  abnormal_segments: number;
  detailed_results: string;
  raw_output: string;
  spectral_data: string;
  temporal_data: string;
  created_at: string;
}

export interface EEGSubject {
  id: number;
  subject_id: string;
  age?: number;
  gender?: string;
  condition?: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface EEGDataPoint {
  time: string;
  subject_id: string;
  channel_1: number;
  channel_2: number;
  channel_3: number;
  channel_4: number;
  channel_5: number;
  channel_6: number;
  channel_7: number;
  channel_8: number;
  channel_9: number;
  channel_10: number;
  channel_11: number;
  channel_12: number;
  channel_13: number;
  channel_14: number;
  channel_15: number;
  channel_16: number;
  channel_17: number;
  channel_18: number;
  channel_19: number;
}

export interface DashboardStats {
  files_processed_today: number;
  pending_analyses: number;
  accuracy_rate: number;
  avg_processing_time: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recent_analyses: AnalysisJob[];
  queue_status: AnalysisJob[];
}

export interface Report {
  id: number;
  user_id: number;
  result_id: number;
  template: string;
  title: string;
  content: string;
  patient_info: string;
  generated_at: string;
  file_path?: string;
  result: AnalysisResult;
}

// Auth token management
let authToken: string | null = null;

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
};

export const clearAuthToken = () => {
  authToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
};

// API request helper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Authentication API
export const authAPI = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return response;
  },

  async register(username: string, password: string, role?: string): Promise<{ message: string; user_id: number }> {
    const response = await apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
    return response;
  },

  async checkHealth(): Promise<{ status: string; timestamp: string; version: string }> {
    const response = await apiRequest('/health');
    return response;
  },
};

// Dashboard API
export const dashboardAPI = {
  async getDashboard(): Promise<DashboardResponse> {
    const response = await apiRequest('/dashboard');
    return response;
  },

  async getStats(): Promise<DashboardStats & { total_files: number; completed_jobs: number; pending_jobs: number; failed_jobs: number }> {
    const response = await apiRequest('/stats');
    return response;
  },
};

// File Upload API
export const uploadAPI = {
  async uploadFile(file: File, patientId: string, priority: string = 'normal'): Promise<{ message: string; job_id: number; filename: string; size: number; status: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);
    formData.append('priority', priority);

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  },

  async getFiles(): Promise<{ files: AnalysisJob[]; total: number }> {
    const response = await apiRequest('/files');
    return response;
  },

  async deleteFile(fileId: number): Promise<{ message: string }> {
    const response = await apiRequest(`/files/${fileId}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// Analysis API
export const analysisAPI = {
  async startClassification(filename: string, patientId: string, priority: string = 'normal'): Promise<{ message: string; job_id: number; status: string }> {
    const response = await apiRequest('/classify', {
      method: 'POST',
      body: JSON.stringify({ filename, patient_id: patientId, priority }),
    });
    return response;
  },

  async getQueue(status?: string, priority?: string, search?: string): Promise<{ jobs: AnalysisJob[]; total: number }> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (priority && priority !== 'all') params.append('priority', priority);
    if (search) params.append('search', search);

    const queryString = params.toString();
    const endpoint = `/queue${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiRequest(endpoint);
    return response;
  },

  async updatePriority(jobId: number, priority: string): Promise<{ message: string }> {
    const response = await apiRequest(`/queue/${jobId}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ priority }),
    });
    return response;
  },

  async updateStatus(jobId: number, status: string): Promise<{ message: string }> {
    const response = await apiRequest(`/queue/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return response;
  },

  async cancelJob(jobId: number): Promise<{ message: string }> {
    const response = await apiRequest(`/queue/${jobId}`, {
      method: 'DELETE',
    });
    return response;
  },

  async predict(filePath: string, patientId: string = ''): Promise<{ message: string; job_id: number; status: string }> {
    const response = await apiRequest('/predict', {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath, patient_id: patientId }),
    });
    return response;
  },

  async deleteAnalysis(analysisId: number, status: string): Promise<{ message: string }> {
    // Route to correct endpoint based on analysis status
    if (status === 'processing' || status === 'queued') {
      // Cancel active jobs
      return this.cancelJob(analysisId);
    } else {
      // Delete completed/failed jobs - use results endpoint but it deletes the whole analysis
      const response = await apiRequest(`/results/${analysisId}`, {
        method: 'DELETE',
      });
      return response;
    }
  },
};

// Results API
export const resultsAPI = {
  async getResults(): Promise<{ results: AnalysisJob[]; total: number }> {
    const response = await apiRequest('/results');
    return response;
  },

  async getResultById(resultId: number): Promise<AnalysisJob> {
    const response = await apiRequest(`/results/${resultId}`);
    return response;
  },

  async deleteResult(resultId: number): Promise<{ message: string }> {
    const response = await apiRequest(`/results/${resultId}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// Reports API
export const reportsAPI = {
  async generateReport(resultId: number, template: string, title: string, patientInfo: Record<string, any>): Promise<{ message: string; report_id: number }> {
    const response = await apiRequest('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ result_id: resultId, template, title, patient_info: patientInfo }),
    });
    return response;
  },

  async getReports(): Promise<{ reports: Report[]; total: number }> {
    const response = await apiRequest('/reports');
    return response;
  },

  async getReportById(reportId: number): Promise<Report> {
    const response = await apiRequest(`/reports/${reportId}`);
    return response;
  },

  async deleteReport(reportId: number): Promise<{ message: string }> {
    const response = await apiRequest(`/reports/${reportId}`, {
      method: 'DELETE',
    });
    return response;
  },

  async downloadReport(reportId: number): Promise<Blob> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    return response.blob();
  },
};

// EEG Data API
export const eegDataAPI = {
  async getSubjects(): Promise<{ subjects: EEGSubject[]; total: number }> {
    const response = await apiRequest('/eeg/subjects');
    return response;
  },

  async importEEGData(filePath: string, subjectId: string): Promise<{ message: string; subject_id: string; file_path: string }> {
    const response = await apiRequest('/eeg/import', {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath, subject_id: subjectId }),
    });
    return response;
  },

  async getEEGData(subjectId: string, limit: number = 1000, startTime?: string, endTime?: string): Promise<{ subject_id: string; data_points: EEGDataPoint[]; count: number }> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);

    const queryString = params.toString();
    const endpoint = `/eeg/data/${subjectId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiRequest(endpoint);
    return response;
  },

  async deleteEEGData(subjectId: string): Promise<{ message: string; subject_id: string; rows_deleted: number }> {
    const response = await apiRequest(`/eeg/data/${subjectId}`, {
      method: 'DELETE',
    });
    return response;
  },
};

export default {
  auth: authAPI,
  dashboard: dashboardAPI,
  upload: uploadAPI,
  analysis: analysisAPI,
  results: resultsAPI,
  reports: reportsAPI,
  eegData: eegDataAPI,
}; 