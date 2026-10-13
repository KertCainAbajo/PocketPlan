import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { Fingerprint, LockKeyhole, ScanFace } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showAlert } from '@/components/app-alert';
import { Logo } from '@/components/logo';
import { PinDots, PinKeypad } from '@/components/pin-pad';
import {
  authenticateWithBiometrics,
  getBiometricKind,
  PIN_LENGTH,
  verifyPin,
  type BiometricKind,
  type LockSettings,
} from '@/features/security/app-lock';
import { colors } from '@/theme/colors';

const MAX_ATTEMPTS = 5;

/**
 * Full-screen lock shown over the app while it is locked. Unlocks with the
 * PocketPlan PIN, or fingerprint / face when turned on.
 */
export function AppLockScreen({ settings, name, onUnlock, onSignOut }: { settings: LockSettings; name?: string; onUnlock: () => void; onSignOut: () => void }) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [errorKey, setErrorKey] = useState(0);
  const [checking, setChecking] = useState(false);
  const [kind, setKind] = useState<BiometricKind>('none');
  const locked = attempts >= MAX_ATTEMPTS;
  const BiometricIcon = kind === 'face' ? ScanFace : Fingerprint;

  const tryBiometrics = useCallback(async () => {
    if (await authenticateWithBiometrics()) onUnlock();
  }, [onUnlock]);

  // White status bar icons on the navy lock; the screen underneath sets its own again on focus.
  useEffect(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle('dark');
  }, []);

  // Offer fingerprint / face straight away when it is turned on.
  useEffect(() => {
    if (!settings.biometrics) return;
    void getBiometricKind().then(({ kind: detected }) => setKind(detected));
    void tryBiometrics();
  }, [settings.biometrics, tryBiometrics]);

  async function addDigit(digit: string) {
    if (checking || locked || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length < PIN_LENGTH) return;
    setChecking(true);
    const ok = await verifyPin(next);
    setChecking(false);
    if (ok) {
      onUnlock();
      return;
    }
    setAttempts((count) => count + 1);
    setErrorKey((key) => key + 1);
    setTimeout(() => setPin(''), 350);
  }

  function forgotPin() {
    showAlert('Forgot your PIN?', 'Sign out, then sign back in with a code sent to your email. Your PIN will be removed and your data stays safe.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: onSignOut },
    ], { icon: LockKeyhole });
  }

  const message = locked
    ? 'Too many wrong attempts. Sign out to reset your PIN.'
    : attempts > 0
      ? `Wrong PIN. ${MAX_ATTEMPTS - attempts} ${MAX_ATTEMPTS - attempts === 1 ? 'try' : 'tries'} left.`
      : settings.hasPin
        ? 'Enter your PIN to continue'
        : 'Use your fingerprint or face to continue';

  return (
    <Animated.View entering={FadeIn.duration(150)} className="absolute inset-0 z-50">
      <LinearGradient colors={['#34539A', colors.primary, '#16254A']} locations={[0, 0.55, 1]} style={{ flex: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }}>
        <View pointerEvents="none" className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent opacity-20" />
        <View pointerEvents="none" className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-white opacity-[0.04]" />

        <View className="items-center px-8">
          <View className="h-[76px] w-[76px] items-center justify-center rounded-[24px] border border-white/15 bg-white/10">
            <Logo size={52} variant="dark" />
          </View>
          <Text className="mt-5 text-[24px] font-extrabold tracking-tight text-white">{name ? `Welcome back, ${name}` : 'Welcome back'}</Text>
          <Text accessibilityLiveRegion="polite" className={`mt-2 text-center text-[14px] ${attempts > 0 ? 'font-semibold text-[#FCA5A5]' : 'text-white/70'}`}>{message}</Text>
        </View>

        {settings.hasPin ? (
          <>
            <View className="mt-9">
              <PinDots length={pin.length} errorKey={errorKey} error={attempts > 0 && pin.length === PIN_LENGTH} light />
            </View>
            <View className="mt-auto">
              <PinKeypad
                light
                disabled={checking || locked}
                onDigit={(digit) => void addDigit(digit)}
                onDelete={() => setPin((value) => value.slice(0, -1))}
                extraKey={settings.biometrics ? { Icon: BiometricIcon, label: 'Use fingerprint or face', onPress: () => void tryBiometrics() } : undefined}
              />
            </View>
          </>
        ) : (
          <View className="mt-auto px-8">
            <Pressable accessibilityRole="button" onPress={() => void tryBiometrics()} className="h-[56px] flex-row items-center justify-center gap-2 rounded-2xl bg-white active:opacity-85">
              <BiometricIcon size={20} color={colors.primary} />
              <Text className="text-[15px] font-bold text-primary">Unlock PocketPlan</Text>
            </Pressable>
          </View>
        )}

        <Pressable accessibilityRole="button" onPress={forgotPin} className="mt-6 self-center px-4 py-2">
          <Text className="text-[14px] font-semibold text-white/80">{settings.hasPin ? 'Forgot PIN?' : 'Sign out'}</Text>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}
