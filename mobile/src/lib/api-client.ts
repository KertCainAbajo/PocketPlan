import { create as createAxios, isAxiosError, type AxiosError } from 'axios';

import type { ApiErrorBody } from '@/types/api';

import { config } from './config';

export const api = createAxios({
  baseURL: config.apiUrl,
  timeout: 15000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Called when the server rejects our token (expired, revoked or account deactivated). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

api.interceptors.request.use((request) => {
  if (authToken) request.headers.Authorization = `Bearer ${authToken}`;
  return request;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const deactivated = status === 403 && error.response?.data?.message === 'This account has been deactivated.';
    if (authToken && (status === 401 || deactivated)) onUnauthorized?.();
    return Promise.reject(error);
  },
);

/** A user-facing message for any API failure. */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      return error.code === 'ECONNABORTED'
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach PocketPlan. Check your internet connection and try again.';
    }
    if (error.response.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    if (error.response.status >= 500) return 'Something went wrong on our side. Please try again.';
    const firstFieldError = Object.values(error.response.data?.errors ?? {})[0]?.[0];
    return firstFieldError ?? error.response.data?.message ?? 'Request failed. Please try again.';
  }
  return 'Something unexpected happened. Please try again.';
}

/** Laravel 422 field errors, flattened to the first message per field. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isAxiosError<ApiErrorBody>(error) || error.response?.status !== 422) return {};
  const errors = error.response.data?.errors ?? {};
  return Object.fromEntries(Object.entries(errors).map(([field, messages]) => [field, messages[0]]));
}
