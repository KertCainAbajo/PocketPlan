import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { api } from '@/lib/api-client';
import { config } from '@/lib/config';
import { useAuthStore } from '@/store/auth-store';
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

const inFlightSignIns = new Map<string, Promise<AuthPayload>>();

/** Exchange a return code once, even if Android delivers it through both the
 * browser session result and the app's deep-link route. */
export function completeGoogleSignIn(code: string, deviceName: string): Promise<AuthPayload> {
  const cached = inFlightSignIns.get(code);
  if (cached) return cached;

  const promise = api
    .post<ApiResource<AuthPayload>>('/auth/google/exchange', { code, device_name: deviceName })
    .then(async ({ data }) => {
      const payload = data.data;
      await useAuthStore.getState().signIn(payload.token, payload.user);
      return payload;
    });

  inFlightSignIns.set(code, promise);
  const clearInFlight = () => {
    if (inFlightSignIns.get(code) === promise) inFlightSignIns.delete(code);
  };
  void promise.then(clearInFlight, clearInFlight);
  return promise;
}

export async function signInWithGoogle(deviceName: string): Promise<AuthPayload | null> {
  // exp://…/--/oauth/google in Expo Go, pocketplan://oauth/google in an installed build.
  const returnUrl = Linking.createURL('oauth/google');
  const startUrl = `${config.apiUrl}/auth/google/redirect?${new URLSearchParams({ redirect_uri: returnUrl, terms: '1' })}`;

  let resolveReturnUrl!: (url: string) => void;
  const returnedUrl = new Promise<string>((resolve) => {
    resolveReturnUrl = resolve;
  });
  const returnSubscription = Linking.addEventListener('url', ({ url }) => {
    if (url.startsWith(returnUrl)) resolveReturnUrl(url);
  });

  // Keep the Custom Tab out of Recents and discard its task when it closes. Expo's
  // proxy activity otherwise forces old Google tabs to remain reopenable on Android.
  let resultUrl: string | null = null;
  try {
    const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl, {
      createTask: true,
      showInRecents: false,
      useProxyActivity: false,
    });
    if (result.type === 'success') {
      resultUrl = result.url;
    } else {
      // The Android browser can report dismissal as the app resumes, just before
      // the matching deep-link event arrives. Give that event a short chance to win.
      let timeout: ReturnType<typeof setTimeout> | undefined;
      resultUrl = await Promise.race([
        returnedUrl,
        new Promise<null>((resolve) => {
          timeout = setTimeout(() => resolve(null), 5000);
        }),
      ]);
      if (timeout) clearTimeout(timeout);
    }
  } finally {
    returnSubscription.remove();
  }

  if (!resultUrl) return null; // browser closed without a return link

  const { queryParams } = Linking.parse(resultUrl);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  const error = typeof queryParams?.error === 'string' ? queryParams.error : null;

  if (error === 'cancelled') return null;
  if (error || !code) throw new GoogleSignInError(error ?? 'Google sign-in failed. Please try again.');

  return completeGoogleSignIn(code, deviceName);
}
