import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const documentsApi = {
  list: (params) => api.get('/documents', { params }),
  get: (id) => api.get(`/documents/${id}`),
  upload: (formData, onProgress) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  status: (id) => api.get(`/documents/${id}/status`),
  file: (id) => api.get(`/documents/${id}/file`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/documents/${id}`),
};

export const chatApi = {
  send: (data) => api.post('/chat', data),
  conversations: (params) => api.get('/chat/conversations', { params }),
  messages: (id) => api.get(`/chat/conversations/${id}`),
  feedback: (data) => api.post('/chat/feedback', data),
};

export const metricsApi = {
  summary: (params) => api.get('/metrics/summary', { params }),
};

export const healthApi = {
  check: () => api.get('/health/health'),
  ready: () => api.get('/health/ready'),
};

export default api;
