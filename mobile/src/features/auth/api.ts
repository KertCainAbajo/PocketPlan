import * as Device from 'expo-device';

import { api } from '@/lib/api-client';
import type { ApiResource, AuthPayload, MessageResponse, User } from '@/types/api';

import type { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from './schemas';

const deviceName = Device.modelName ?? Device.osName ?? 'mobile';

export const authApi = {
  async login(input: LoginInput): Promise<AuthPayload> {
    const { data } = await api.post<ApiResource<AuthPayload>>('/login', { ...input, device_name: deviceName });
    return data.data;
  },

  async register(input: RegisterInput): Promise<AuthPayload> {
    const { data } = await api.post<ApiResource<AuthPayload>>('/register', {
      name: input.name,
      email: input.email,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
      device_name: deviceName,
    });
    return data.data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<ApiResource<User>>('/me');
    return data.data;
  },

  async logout(): Promise<void> {
    await api.post('/logout');
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<string> {
    const { data } = await api.post<MessageResponse>('/forgot-password', input);
    return data.message;
  },

  async resetPassword(input: ResetPasswordInput): Promise<string> {
    const { data } = await api.post<MessageResponse>('/reset-password', {
      email: input.email,
      token: input.token,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    });
    return data.message;
  },
};
