import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Pipeline {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  pipeline_json: {
    nodes: PipelineNode[];
    edges: PipelineEdge[];
  };
  created_at: string;
  updated_at: string;
}

export interface PipelineListItem {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  last_run_status?: string;
  last_run_at?: string;
}

export interface PipelineNode {
  id: string;
  type: 'SOURCE' | 'TRANSFORM' | 'LOAD';
  subtype: string;
  config: Record<string, any>;
  position_x: number;
  position_y: number;
}

export interface PipelineEdge {
  from: string;
  to: string;
}

export interface PipelineCreate {
  name: string;
  description?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface Run {
  id: number;
  pipeline_id: number;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  started_at?: string;
  finished_at?: string;
  result_location?: string;
  triggered_by: number;
  error_message?: string;
  created_at: string;
}

export interface RunDetail extends Run {
  logs: RunLog[];
  pipeline_name?: string;
}

export interface RunLog {
  id: number;
  run_id: number;
  node_id?: string;
  level: string;
  message: string;
  rows_in?: number;
  rows_out?: number;
  created_at: string;
}

export interface FileUploadResponse {
  file_id: string;
  filename: string;
  file_path: string;
  size: number;
  uploaded_at: string;
}

export interface UploadedFile {
  id: number;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: number;
  created_at: string;
}

export interface FileSample {
  filename: string;
  columns: string[];
  sample_data: Record<string, any>[];
  total_rows: number;
  column_stats: Record<string, any>;
}

export interface Suggestion {
  type: string;
  column?: string;
  suggestion: string;
  config: Record<string, any>;
  priority: number;
}

// Create axios instance
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (data: RegisterData): Promise<User> => {
    const response = await api.post<User>('/api/v1/auth/register', data);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/api/v1/auth/login', credentials);
    // Store tokens
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/api/v1/auth/me');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// Pipeline API
export const pipelineAPI = {
  create: async (pipeline: PipelineCreate): Promise<Pipeline> => {
    const response = await api.post<Pipeline>('/api/v1/pipelines/', pipeline);
    return response.data;
  },

  list: async (skip = 0, limit = 20): Promise<PipelineListItem[]> => {
    const response = await api.get<PipelineListItem[]>('/api/v1/pipelines/', {
      params: { skip, limit },
    });
    return response.data;
  },

  get: async (id: number): Promise<Pipeline> => {
    const response = await api.get<Pipeline>(`/api/v1/pipelines/${id}`);
    return response.data;
  },

  update: async (id: number, data: Partial<PipelineCreate>): Promise<Pipeline> => {
    const response = await api.put<Pipeline>(`/api/v1/pipelines/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/pipelines/${id}`);
  },

  run: async (id: number): Promise<Run> => {
    const response = await api.post<Run>(`/api/v1/pipelines/${id}/runs?sync=true`);
    return response.data;
  },

  triggerRun: async (id: number): Promise<Run> => {
    const response = await api.post<Run>(`/api/v1/pipelines/${id}/runs`);
    return response.data;
  },

  getRuns: async (id: number, skip = 0, limit = 20): Promise<Run[]> => {
    const response = await api.get<Run[]>(`/api/v1/pipelines/${id}/runs`, {
      params: { skip, limit },
    });
    return response.data;
  },

  validate: async (id: number): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> => {
    const response = await api.post<{ valid: boolean; errors: string[]; warnings: string[] }>(
      `/api/v1/pipelines/${id}/validate`
    );
    return response.data;
  },
};

// Run API
export const runAPI = {
  trigger: async (pipelineId: number, sync: boolean = true): Promise<Run> => {
    const response = await api.post<Run>(
      `/api/v1/pipelines/${pipelineId}/runs?sync=${sync}`
    );
    return response.data;
  },

  list: async (pipelineId: number): Promise<Run[]> => {
    const response = await api.get<Run[]>(`/api/v1/pipelines/${pipelineId}/runs`);
    return response.data;
  },

  listAll: async (): Promise<Run[]> => {
    const response = await api.get<Run[]>('/api/v1/runs/');
    return response.data;
  },

  get: async (id: number): Promise<RunDetail> => {
    const response = await api.get<RunDetail>(`/api/v1/runs/${id}`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/runs/${id}`);
  },
};

// File API
export const fileAPI = {
  upload: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<FileUploadResponse>('/api/v1/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  list: async (): Promise<UploadedFile[]> => {
    const response = await api.get<UploadedFile[]>('/api/v1/files');
    return response.data;
  },

  getSample: async (fileId: string, rows = 10): Promise<FileSample> => {
    const response = await api.get<FileSample>(`/api/v1/files/${fileId}/sample`, {
      params: { rows },
    });
    return response.data;
  },

  delete: async (fileId: number): Promise<void> => {
    await api.delete(`/api/v1/files/${fileId}`);
  },
};

// Suggestions API
export const suggestionsAPI = {
  fromSample: async (columnStats: Record<string, any>): Promise<Suggestion[]> => {
    const response = await api.post<{ suggestions: Suggestion[] }>(
      '/api/v1/suggestions/from-sample',
      { column_stats: columnStats }
    );
    return response.data.suggestions;
  },
};

export default api;
