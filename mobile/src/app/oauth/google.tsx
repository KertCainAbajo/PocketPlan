import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';
import { completeGoogleSignIn } from '@/features/auth/google';

// On Android the Google sign-in return link can arrive as a normal deep link
// (exp://…/--/oauth/google?code=…). Let any waiting browser session finish.
WebBrowser.maybeCompleteAuthSession();

/**
 * Landing screen for the Google sign-in return link. It must not redirect while
 * the saved session is still loading, or the redirect lands on a guarded route
 * that is not available yet and the app shows a blank screen.
 */
export default function GoogleOAuthReturn() {
  const status = useAuthStore((s) => s.status);
  const { code, error } = useLocalSearchParams<{ code?: string; error?: string }>();
  const [returnError, setReturnError] = useState<string | null>(null);
  const [completedCode, setCompletedCode] = useState<string | null>(null);
  const deviceName = Device.modelName ?? Device.osName ?? 'mobile';

  useEffect(() => {
    if (!code || typeof code !== 'string') return;
    if (status === 'loading') return;
    if (status === 'signedIn') {
      router.replace('/');
      return;
    }

    let active = true;
    void completeGoogleSignIn(code, deviceName)
      .then(() => {
        if (active) {
          setCompletedCode(code);
          router.replace('/');
        }
      })
      .catch((cause: unknown) => {
        if (active) setReturnError(getErrorMessage(cause));
      });

    return () => {
      active = false;
    };
  }, [code, deviceName, status]);

  if (returnError || (error && error !== 'cancelled')) {
    return (
      <View className="flex-1 justify-center bg-background px-6">
        <Text className="mb-4 text-center text-xl font-bold text-ink">Google sign-in didn&apos;t finish</Text>
        <FormBanner message={returnError ?? error} />
        <Button label="Back to sign in" onPress={() => router.replace('/login')} className="mt-5" />
      </View>
    );
  }

  if (code && completedCode !== code) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-sm text-muted">Finishing Google sign-in…</Text>
      </View>
    );
  }

  if (error === 'cancelled') return <Redirect href="/login" />;

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-sm text-muted">Signing you in…</Text>
      </View>
    );
  }

  return <Redirect href={status === 'signedIn' ? '/' : '/login'} />;
}
