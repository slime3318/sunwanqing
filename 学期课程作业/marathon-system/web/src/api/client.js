import axios from 'axios';

const baseURL = import.meta.env?.VITE_API_BASE_URL || '/api';

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
  const payload = response.data;

  // 后端约定所有接口返回 { success, message, data } 信封。
  // 若拿到 HTML（例如静态托管把未命中的 /api 路径回退到 index.html 并返回 200）
  // 或其它非预期内容，必须在这里抛错，否则下游会把 undefined 当数据而静默崩溃。
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    typeof payload.success !== 'boolean'
  ) {
    throw new ApiRequestError(
      '接口返回了非预期内容，说明请求没有命中后端 API。请检查 VITE_API_BASE_URL 是否已指向后端服务地址。',
      response.status,
    );
  }

  return payload.data ?? null;
}

export async function request(config) {
  const response = await api.request(config);
  return unwrap(response);
}
