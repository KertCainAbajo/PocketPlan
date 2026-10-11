import { useMutation } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useState } from 'react';

import { getErrorMessage } from '@/lib/api-client';
import { GoogleSignInError, signInWithGoogle } from './google';

const deviceName = Device.modelName ?? Device.osName ?? 'mobile';

/**
 * "Continue with Google". New students accept the terms by continuing
 * (the button shows that notice); existing students simply sign in.
 */
export function useGoogleSignIn() {
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => signInWithGoogle(deviceName),
    onSuccess: (payload) => {
      if (payload) router.replace('/');
    },
    onError: (e) => setError(e instanceof GoogleSignInError ? e.message : getErrorMessage(e)),
  });

  const start = () => {
    setError(null);
    mutation.mutate();
  };

  return { start, isPending: mutation.isPending, error, notice: null as string | null };
}
