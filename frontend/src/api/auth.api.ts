import { http, unwrap } from './http';
import type { AuthUser, LoginResult, TokenPair } from './types';

export const authApi = {
  login: (email: string, password: string) => unwrap<LoginResult>(http.post('/auth/login', { email, password })),
  refresh: (refreshToken: string) => unwrap<TokenPair>(http.post('/auth/refresh', { refreshToken })),
  logout: (refreshToken: string | null) => unwrap<{ loggedOut: boolean }>(http.post('/auth/logout', { refreshToken })),
  me: () => unwrap<AuthUser>(http.get('/auth/me')),
  changePassword: (currentPassword: string, newPassword: string) =>
    unwrap<{ changed: boolean }>(http.post('/auth/change-password', { currentPassword, newPassword })),
};
