import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const TOKEN_KEY = 'marathon.token';

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class ApiRequestError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data;
    const message =
      payload?.message ||
      (error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '网络异常，请检查后端服务是否已启动');

    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }

    return Promise.reject(new ApiRequestError(message, status, payload?.details));
  },
);

export function unwrap(response) {
  return response.data?.data ?? response.data;
}

export async function request(config) {
  const response = await api.request(config);
  return unwrap(response);
}
