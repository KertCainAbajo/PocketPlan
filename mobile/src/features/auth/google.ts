import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { api } from '@/lib/api-client';
import { config } from '@/lib/config';
import type { ApiResource, AuthPayload } from '@/types/api';

/**
 * Browser-based Google sign-in. Works in Expo Go and in installed builds,
 * on Android and iPhone, because it needs no native Google SDK:
 *
 * 1. Open the backend's /auth/google/redirect in a secure browser sheet.
 * 2. The student picks a Google account; Google sends the result to the backend.
 * 3. The backend verifies it and sends the browser back to this app with a one-time code.
 * 4. The app exchanges the code for its API token.
 */
export class GoogleSignInError extends Error {}

export async function signInWithGoogle(deviceName: string): Promise<AuthPayload | null> {
  // exp://…/--/oauth/google in Expo Go, pocketplan://oauth/google in an installed build.
  const returnUrl = Linking.createURL('oauth/google');
  const startUrl = `${config.apiUrl}/auth/google/redirect?${new URLSearchParams({ redirect_uri: returnUrl, terms: '1' })}`;

  // Android cannot close Chrome Custom Tabs from code. The tab therefore runs as its own
  // task (createTask, the default): when Google's return link opens, Android brings
  // PocketPlan to the front automatically. showInRecents: false keeps that tab out of
  // the recent-apps list so an old, already-used sign-in is not reopened later.
  const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl, { createTask: true, showInRecents: false });
  if (result.type !== 'success') return null; // sheet closed

  const { queryParams } = Linking.parse(result.url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  const error = typeof queryParams?.error === 'string' ? queryParams.error : null;

  if (error === 'cancelled') return null;
  if (error || !code) throw new GoogleSignInError(error ?? 'Google sign-in failed. Please try again.');

  const { data } = await api.post<ApiResource<AuthPayload>>('/auth/google/exchange', { code, device_name: deviceName });
  return data.data;
}
