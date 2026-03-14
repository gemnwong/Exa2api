import apiClient from './client'
import type {
  LoginRequest,
  LoginResponse,
  AuthMeResponse,
  RegisterResponse,
  UserApiKey,
  UserLimitSnapshot,
  AuthOptionsResponse,
} from '@/types/api'

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginRequest, LoginResponse>('/auth/login', data),

  register: async (_data: { username: string; password: string }): Promise<RegisterResponse> => {
    throw new Error('Registration is disabled')
  },

  logout: () =>
    apiClient.post('/auth/logout'),

  legacyLogout: () =>
    apiClient.post('/logout'),

  me: () =>
    apiClient.get('/auth/me') as Promise<AuthMeResponse>,

  options: () =>
    apiClient.get('/auth/options') as Promise<AuthOptionsResponse>,

  changePassword: (data: { old_password: string; new_password: string }) =>
    apiClient.post('/auth/password', data),

  redeem: (data: { code: string }) =>
    apiClient.post('/auth/redeem', data),

  listApiKeys: () =>
    apiClient.get('/auth/apikeys') as Promise<{ total: number; keys: UserApiKey[]; limits: UserLimitSnapshot }>,

  createApiKey: (data: { name: string }) =>
    apiClient.post<{ name: string }, { success: boolean; api_key: string; key: UserApiKey }>('/auth/apikeys/new', data),

  revokeApiKey: (data: { key_id: string }) =>
    apiClient.post<{ key_id: string }, { success: boolean }>('/auth/apikeys/revoke', data),
}
