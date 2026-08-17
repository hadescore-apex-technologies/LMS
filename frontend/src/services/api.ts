import axios from 'axios';
import { store } from '../store';
import { loginSuccess, logout } from '../features/authSlice';

export const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    return url.endsWith('/') ? url : `${url}/`;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return `http://${hostname}:8000/api/`;
    }
  }
  return 'https://lms-nv6s.onrender.com/api/';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 300000, // 5 minutes default timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

const setAuthHeader = (headers: any, token: string) => {
  if (!headers) return;
  if (typeof headers.set === 'function') {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers['Authorization'] = `Bearer ${token}`;
    headers['authorization'] = `Bearer ${token}`;
  }
};

const getAuthHeader = (headers: any): string | undefined => {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    return headers.get('Authorization') || headers.get('authorization');
  }
  return headers['Authorization'] || headers['authorization'];
};

// Request Interceptor: Attach JWT Access Token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken;
    const existingAuth = getAuthHeader(config.headers);
    if (token && !existingAuth) {
      setAuthHeader(config.headers, token);
    }
    // Allow up to 10 minutes for multipart file/video uploads
    if (config.headers && (config.headers['Content-Type'] === 'multipart/form-data' || config.data instanceof FormData)) {
      config.timeout = 600000;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refreshing, Auto-Retries & Network Resilience
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 1. Automatic Network / Transient Error Retry (Exponential Backoff)
    const isNetworkError = !error.response && Boolean(error.code);
    const isTransientServerError = error.response?.status >= 502 && error.response?.status <= 504;
    
    if ((isNetworkError || isTransientServerError) && (originalRequest._retryCount || 0) < 3) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      const delayMs = Math.min(1000 * Math.pow(2, originalRequest._retryCount), 3000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(originalRequest);
    }

    // 2. Token Refreshing for 401 Unauthorized errors
    if (error.response?.status === 401) {
      const reqUrl = originalRequest.url || '';
      // Don't attempt token refresh for login, refresh, or logout requests
      if (reqUrl.includes('auth/login') || reqUrl.includes('auth/refresh') || reqUrl.includes('auth/logout')) {
        return Promise.reject(error);
      }

      // If this request already retried after refreshing, stop looping immediately and logout
      if (originalRequest._retry) {
        store.dispatch(logout());
        const loginPath = localStorage.getItem('loginPath') || '/student/login';
        if (typeof window !== 'undefined' && !window.location.pathname.includes('login')) {
          window.location.href = loginPath;
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            setAuthHeader(originalRequest.headers, token as string);
            originalRequest._retry = true;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = store.getState().auth.refreshToken;
      if (!refreshToken) {
        store.dispatch(logout());
        const loginPath = localStorage.getItem('loginPath') || '/student/login';
        if (typeof window !== 'undefined' && !window.location.pathname.includes('login')) {
          window.location.href = loginPath;
        }
        return Promise.reject(error);
      }

      try {
        const refreshUrl = `${getBaseURL()}auth/refresh/`;
        const res = await axios.post(refreshUrl, {
          refresh: refreshToken,
        });

        const { access, refresh } = res.data;
        const currentUser = store.getState().auth.user;
        const activeRefreshToken = refresh || refreshToken;
        
        if (currentUser) {
          const loginPath = store.getState().auth.loginPath || '/student/login';
          store.dispatch(loginSuccess({ user: currentUser, access, refresh: activeRefreshToken, loginPath }));
        }

        processQueue(null, access);
        setAuthHeader(originalRequest.headers, access);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        store.dispatch(logout());
        const loginPath = localStorage.getItem('loginPath') || '/student/login';
        if (typeof window !== 'undefined' && !window.location.pathname.includes('login')) {
          window.location.href = loginPath;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 3. User-friendly error message extraction
    const data = error.response?.data;
    let friendlyMessage = error.message || 'An unexpected error occurred.';
    if (data) {
      if (typeof data === 'string') friendlyMessage = data;
      else if (data.detail) friendlyMessage = data.detail;
      else if (data.error) friendlyMessage = data.error;
      else {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          friendlyMessage = `${firstKey}: ${data[firstKey][0]}`;
        }
      }
    }
    error.userFriendlyMessage = friendlyMessage;

    return Promise.reject(error);
  }
);

export default api;
