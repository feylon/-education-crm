import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiEnvelope, ApiError, TokenPair } from './types';

export const ACCESS_TOKEN_KEY = 'crm.accessToken';
export const REFRESH_TOKEN_KEY = 'crm.refreshToken';

export const tokenStorage = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  set(pair: Pick<TokenPair, 'accessToken' | 'refreshToken'>): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, pair.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, pair.refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export class HttpError extends Error {
  readonly statusCode: number;
  readonly errors: string[];

  constructor(payload: Partial<ApiError>, fallback: string) {
    super(payload.message ?? fallback);
    this.statusCode = payload.statusCode ?? 0;
    this.errors = payload.errors ?? [];
  }
}

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export const registerSessionExpiredHandler = (handler: SessionExpiredHandler): void => {
  onSessionExpired = handler;
};

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const http: AxiosInstance = axios.create({ baseURL, timeout: 20000 });

http.interceptors.request.use((config) => {
  const token = tokenStorage.access;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = tokenStorage.refresh;
  if (!refreshToken) {
    return null;
  }
  try {
    const response = await axios.post<ApiEnvelope<TokenPair>>(`${baseURL}/auth/refresh`, { refreshToken });
    tokenStorage.set(response.data.data);
    return response.data.data.accessToken;
  } catch (error) {
    const rotatedElsewhere = tokenStorage.refresh !== refreshToken && tokenStorage.access;
    if (rotatedElsewhere) {
      return tokenStorage.access;
    }
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      tokenStorage.clear();
    }
    return null;
  }
};

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const isAuthRoute = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    if (status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      }
      if (!tokenStorage.refresh) {
        onSessionExpired?.();
      }
    }
    if (error.response?.data) {
      throw new HttpError(error.response.data, error.message);
    }
    throw new HttpError({ statusCode: 0, message: 'Network error' }, error.message);
  },
);

export const unwrap = <T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> => promise.then((response) => response.data.data);

export const cleanQuery = <T extends object>(query: T): Record<string, string | number | boolean> => {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value as string | number | boolean;
    }
  }
  return result;
};
