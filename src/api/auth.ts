import apiClient from './client';
import { User } from '../types';

export interface AuthResponse {
  token: string;
  user: User;
  accessToken?: string;
  refreshToken?: string;
}

export interface RegisterPayload {
  email: string;
  password?: string;
  displayName: string;
  role: 'MANAGER' | 'EMPLOYEE';
  restaurantId: string | null;
}

export interface LoginPayload {
  email: string;
  password?: string;
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    return response.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
