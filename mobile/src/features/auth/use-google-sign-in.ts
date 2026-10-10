import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useState } from 'react';

import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

import { authApi } from './api';
import { getGoogleIdToken, googleAvailability, GOOGLE_UNAVAILABLE_MESSAGE } from './google';

/**
 * "Continue with Google": picks a Google account, exchanges its ID token for a
 * PocketPlan token, and signs in. New students accept the terms by continuing
 * (the button shows that notice).
 */
export function useGoogleSignIn() {
  const signIn = useAuthStore((s) => s.signIn);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const idToken = await getGoogleIdToken();
      if (!idToken) return null; // picker closed
      return authApi.google(idToken);
    },
    onSuccess: (payload) => {
      if (payload) void signIn(payload.token, payload.user);
    },
    onError: (e) => setError(isAxiosError(e) ? getErrorMessage(e) : e instanceof Error ? e.message : getErrorMessage(e)),
  });

  const start = () => {
    setNotice(null);
    setError(null);
    const availability = googleAvailability();
    if (availability !== 'available') {
      setNotice(GOOGLE_UNAVAILABLE_MESSAGE[availability]);
      return;
    }
    mutation.mutate();
  };

  return { start, isPending: mutation.isPending, notice, error };
}
