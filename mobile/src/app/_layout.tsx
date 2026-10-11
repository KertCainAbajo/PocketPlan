import '@/global.css';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineNotice } from '@/components/offline-notice';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';
import { paperTheme } from '@/theme/paper-theme';

// Keep the native (navy) splash screen up until the saved session is checked.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={paperTheme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
          <RootNavigator />
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    // Token rejected by the server (expired, revoked, account deactivated).
    setUnauthorizedHandler(() => {
      queryClient.clear();
      void clearSession();
    });
    void bootstrap();
    return () => setUnauthorizedHandler(null);
  }, [bootstrap, clearSession]);

  // A new account must never see cached screens or balances from the previous
  // session after logout, including data still inside its stale-time window.
  useEffect(() => {
    if (status === 'signedOut') queryClient.clear();
  }, [status]);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hide();
  }, [status]);

  const signedIn = status === 'signedIn';

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* Public in both states: linked from sign-up and from settings. */}
        <Stack.Screen name="legal" options={{ presentation: 'modal' }} />
      </Stack>
      {status === 'offline' && <OfflineNotice onRetry={bootstrap} />}
    </>
  );
}
