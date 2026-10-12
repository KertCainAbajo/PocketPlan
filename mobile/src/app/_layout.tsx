import '@/global.css';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Fingerprint } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlertHost } from '@/components/app-alert';
import { OfflineNotice } from '@/components/offline-notice';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';
import { paperTheme } from '@/theme/paper-theme';

const BIOMETRIC_KEY = 'pocketplan.biometric-unlock';

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
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const appState = useRef(AppState.currentState);

  async function unlockWithBiometrics() {
    setUnlocking(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock PocketPlan', cancelLabel: 'Cancel' });
      setUnlocked(result.success);
    } catch {
      setUnlocked(false);
    } finally {
      setUnlocking(false);
    }
  }

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

  useEffect(() => {
    let cancelled = false;
    async function checkBiometricLock() {
      if (status !== 'signedIn') {
        setUnlocked(true);
        return;
      }
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_KEY).catch(() => null);
      if (cancelled) return;
      if (enabled !== 'true') {
        setUnlocked(true);
        return;
      }
      setUnlocked(false);
      await unlockWithBiometrics();
    }
    void checkBiometricLock();
    return () => { cancelled = true; };
  }, [status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      const wasBackgrounded = appState.current.match(/inactive|background/) !== null;
      appState.current = nextState;
      if (status !== 'signedIn' || nextState !== 'active' || !wasBackgrounded) return;
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_KEY).catch(() => null);
      if (enabled === 'true') {
        setUnlocked(false);
        await unlockWithBiometrics();
      }
    });
    return () => subscription.remove();
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
      <AlertHost />
      {/* Keep Expo Router's navigator mounted while the biometric lock covers it. */}
      {signedIn && !unlocked && <View className="absolute inset-0 z-50 items-center justify-center bg-background px-8">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-accent-light"><Fingerprint size={30} color={colors.primary} /></View>
        <Text className="mt-5 text-[22px] font-bold text-primary">PocketPlan is locked</Text>
        <Text className="mt-2 text-center text-[12px] leading-5 text-muted">Use your device biometrics to continue.</Text>
        <Pressable accessibilityRole="button" onPress={() => void unlockWithBiometrics()} disabled={unlocking} className="mt-6 min-h-12 w-full items-center justify-center rounded-xl bg-primary"><Text className="text-[12px] font-bold text-white">{unlocking ? 'Checking…' : 'Unlock PocketPlan'}</Text></Pressable>
      </View>}
    </>
  );
}
