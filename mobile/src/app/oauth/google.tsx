import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Text, View } from 'react-native';

import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

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

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-sm text-muted">Signing you in…</Text>
      </View>
    );
  }

  return <Redirect href={status === 'signedOut' ? '/login' : '/'} />;
}
