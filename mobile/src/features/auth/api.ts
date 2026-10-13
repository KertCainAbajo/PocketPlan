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
      terms: input.acceptedTerms,
      device_name: deviceName,
    });
    return data.data;
  },


  /** Emails a 6-digit sign-in code. Works the same for new and existing emails. */
  async requestEmailCode(email: string): Promise<{ message: string; resendSeconds: number }> {
    const { data } = await api.post<MessageResponse & { resend_seconds: number }>('/auth/email-code', { email });
    return { message: data.message, resendSeconds: data.resend_seconds };
  },

  /**
   * Checks the code. Signs in an existing student, or for a new email returns
   * `needsName` until a name (and accepted terms) is sent with the same code.
   */
  async verifyEmailCode(input: { email: string; code: string; name?: string; terms?: boolean }): Promise<{ needsName: true } | { needsName: false; payload: AuthPayload }> {
    const { data } = await api.post<ApiResource<AuthPayload | { needs_name: true }>>('/auth/email-code/verify', { ...input, device_name: deviceName });
    if ('needs_name' in data.data) return { needsName: true };
    return { needsName: false, payload: data.data };
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
