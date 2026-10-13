import '@/global.css';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlertHost } from '@/components/app-alert';
import { AppLockScreen } from '@/components/app-lock-screen';
import { OfflineNotice } from '@/components/offline-notice';
import { claimAppLock, clearAppLock, getLockSettings, isLockEnabled, type LockSettings } from '@/features/security/app-lock';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';
import { paperTheme } from '@/theme/paper-theme';

/** How long the app can be in the background before it locks again. */
const LOCK_GRACE_MS = 15_000;

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
    // Gesture root for swipeable rows (e.g. the recent account on Sign in).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={paperTheme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
            <RootNavigator />
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const clearSession = useAuthStore((s) => s.clearSession);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [lock, setLock] = useState<LockSettings | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const backgroundedAt = useRef<number | null>(null);

  // Reset the lock whenever the auth status changes. Signing in (from signed out)
  // already proved who you are, so that session starts unlocked; opening the app
  // with a saved session (from loading) is what asks for the PIN.
  const [lockStatus, setLockStatus] = useState(status);
  const [justSignedIn, setJustSignedIn] = useState(false);
  if (status !== lockStatus) {
    setJustSignedIn(lockStatus === 'signedOut' && status === 'signedIn');
    setLockStatus(status);
    setLock(null);
    setUnlocked(false);
  }

  /** Reads the saved lock and locks the app if a PIN or biometrics is set. */
  const lockIfEnabled = useCallback(async () => {
    const settings = await getLockSettings();
    setLock(settings);
    setUnlocked(!isLockEnabled(settings));
  }, []);

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

  // Lock on launch when a PIN or biometrics is set. The lock is kept across
  // sign-out for the same account, and cleared if a different account signs in.
  const userId = user?.id;
  useEffect(() => {
    if (status !== 'signedIn' || userId === undefined) return;
    let active = true;
    void claimAppLock(userId)
      .then(getLockSettings)
      .then((settings) => {
        if (!active) return;
        setLock(settings);
        setUnlocked(justSignedIn || !isLockEnabled(settings));
      });
    return () => { active = false; };
  }, [status, userId, justSignedIn]);

  // Lock again after the app has been in the background for a while. The short
  // grace period keeps quick trips (share sheet, fingerprint prompt) from locking.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackgrounded = appState.current.match(/inactive|background/) !== null;
      appState.current = nextState;
      if (nextState === 'background') backgroundedAt.current = Date.now();
      if (status !== 'signedIn' || nextState !== 'active' || !wasBackgrounded) return;
      const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
      backgroundedAt.current = null;
      if (away >= LOCK_GRACE_MS) void lockIfEnabled();
    });
    return () => subscription.remove();
  }, [status, lockIfEnabled]);

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
      {/* Keep Expo Router's navigator mounted while the lock covers it. */}
      {signedIn && !unlocked && (lock ? (
        <AppLockScreen
          settings={lock}
          name={user?.name.split(' ')[0]}
          onUnlock={() => setUnlocked(true)}
          // Forgot PIN: remove it, then sign in again with an email code.
          onSignOut={() => void clearAppLock().then(signOut)}
        />
      ) : (
        <View className="absolute inset-0 z-50 bg-primary" />
      ))}
    </>
  );
}
