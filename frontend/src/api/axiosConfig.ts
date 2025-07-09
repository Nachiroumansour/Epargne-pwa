import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors globally
api.interceptors.response.use(
  response => response,
  error => {
    const { response } = error;
    
    if (response) {
      const { status, data } = response;
      
      // Handle authentication errors
      if (status === 401) {
        localStorage.removeItem('token');
        toast.error(data?.message || 'Session expirée ou accès non autorisé.');
        // window.location.href = '/login'; // TEMPORAIREMENT COMMENTÉ POUR DEBUG
      }
      
      // Handle validation errors
      if (status === 422) {
        if (data.errors) {
          Object.values(data.errors).forEach((message: any) => {
            toast.error(message as string);
          });
        } else {
          toast.error(data.message || 'Validation error');
        }
      }
      
      // Handle server errors
      if (status >= 500) {
        toast.error('Server error. Please try again later.');
      }
    } else {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// API modules
export const authApi = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getSelf: () => api.get('/auth/me'),
};

export const membersApi = {
  getAll: (page = 1) => api.get(`/members?page=${page}`),
  getById: (id: string) => api.get(`/members/${id}`),
  create: (data: any) => api.post('/members', data),
  update: (id: string, data: any) => api.put(`/members/${id}`, data),
  delete: (id: string) => api.delete(`/members/${id}`),
};

export const contributionsApi = {
  getAll: (page = 1) => api.get(`/contributions?page=${page}`),
  getMyContributions: () => api.get('/contributions/my-contributions'),
  getByMember: (memberId: number) => api.get(`/members/${memberId}/contributions`),
  create: (data: any) => api.post('/contributions', data),
  createBulk: (data: any) => api.post('/contributions/bulk', data),
  update: (id: number, data: any) => api.put(`/contributions/${id}`, data),
  delete: (id: number) => api.delete(`/contributions/${id}`),
};

export const loansApi = {
  getAll: (page = 1) => api.get(`/loans?page=${page}`),
  getById: (id: string) => api.get(`/loans/${id}`),
  getByMember: (memberId: string) => api.get(`/members/${memberId}/loans`),
  getMyLoans: () => api.get('/loans/my-loans'),
  create: (data: any) => api.post('/loans', data),
  update: (id: string, data: any) => api.put(`/loans/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/loans/${id}/status`, typeof status === 'string' ? { status } : status),
  addRepayment: (id: string, data: any) => api.post(`/loans/${id}/repayments`, data),
  delete: (id: string) => api.delete(`/loans/${id}`),
  approve: (id: string) => api.patch(`/loans/${id}/approve`),
  reject: (id: string) => api.patch(`/loans/${id}/reject`),
};

export const statisticsApi = {
  getAdminStats: () => api.get('/statistics/admin'),
  getMemberStats: (memberId: number) => api.get(`/statistics/members/${memberId}`),
  getAccompteReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get(`/statistics/accompte?${params.toString()}`);
  },
};

export const notificationsApi = {
  getAll: () => api.get('/auth/notifications'),
  markAsRead: (id: string) => api.patch(`/auth/notifications/${id}/read`),
};

export default api;