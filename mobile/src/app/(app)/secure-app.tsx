import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Check, Fingerprint, KeyRound, ScanFace, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cardShadow } from '@/components/settings-ui';
import {
  authenticateWithBiometrics,
  biometricLabel,
  dismissSecurePrompt,
  getBiometricKind,
  getLockSettings,
  recommendedBiometric,
  setBiometrics,
  type BiometricKind,
  type LockSettings,
} from '@/features/security/app-lock';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { colors } from '@/theme/colors';

/**
 * Shown once after signing in: recommends a PocketPlan PIN plus the phone's
 * biometrics (Face ID on iPhone, fingerprint on Android).
 */
export default function SecureAppScreen() {
  useStatusBarStyle('light');
  const [settings, setSettings] = useState<LockSettings | null>(null);
  const [device, setDevice] = useState<{ available: boolean; kind: BiometricKind }>({ available: false, kind: 'none' });
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([getLockSettings(), getBiometricKind()]).then(([lock, bio]) => {
        if (!active) return;
        setSettings(lock);
        setDevice(bio);
      });
      return () => { active = false; };
    }, []),
  );

  const bioName = device.kind === 'none' ? recommendedBiometric() : biometricLabel(device.kind);
  const BioIcon = (Platform.OS === 'ios' && device.kind !== 'fingerprint') || device.kind === 'face' ? ScanFace : Fingerprint;
  const pinDone = Boolean(settings?.hasPin);
  const bioDone = Boolean(settings?.biometrics);

  async function enableBiometrics() {
    if (busy || !pinDone || !device.available) return;
    setBusy(true);
    try {
      if (await authenticateWithBiometrics(`Turn on ${bioName}`)) {
        await setBiometrics(true);
        setSettings((current) => (current ? { ...current, biometrics: true } : current));
      }
    } finally {
      setBusy(false);
    }
  }

  async function later() {
    await dismissSecurePrompt();
    router.back();
  }

  return (
    <View className="flex-1 bg-background">
      <LinearGradient colors={['#34539A', colors.primary, '#16254A']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingBottom: 56 }}>
        <SafeAreaView edges={['top']}>
          <View pointerEvents="none" className="absolute -right-16 -top-10 h-64 w-64 rounded-full bg-accent opacity-20" />
          <View className="items-center px-6 pt-8">
            <View className="h-20 w-20 items-center justify-center rounded-[26px] border border-white/15 bg-white/10">
              <ShieldCheck size={38} color="white" strokeWidth={1.8} />
            </View>
            <Text className="mt-5 text-center text-[26px] font-extrabold tracking-tight text-white">Secure your PocketPlan</Text>
            <Text className="mt-2 text-center text-[14px] leading-[21px] text-white/75">
              Your budget and spending are personal. Add a lock so only you can open the app.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView className="-mt-9 flex-1 rounded-t-[32px] bg-background" contentContainerClassName="px-5 pb-10 pt-6">
        <View className="mb-3 flex-row items-center gap-1.5 self-center rounded-full bg-accent-light px-3 py-1.5">
          <Sparkles size={13} color={colors.accent} />
          <Text className="text-[12px] font-bold text-primary">
            Recommended for your {Platform.OS === 'ios' ? 'iPhone' : 'Android phone'}: PIN + {bioName}
          </Text>
        </View>

        {!settings ? (
          <View className="items-center py-10"><ActivityIndicator color={colors.accent} /></View>
        ) : (
          <>
            <StepCard
              number={1}
              Icon={KeyRound}
              color={colors.accent}
              title="Create a 4-digit PIN"
              body="Your backup way in. It’s just for PocketPlan, not your phone."
              done={pinDone}
              action={pinDone ? undefined : { label: 'Create PIN', onPress: () => router.push({ pathname: '/pin-setup', params: { mode: 'create' } }) }}
            />
            <StepCard
              number={2}
              Icon={BioIcon}
              color="#EC4899"
              title={`Turn on ${bioName}`}
              body={
                !device.available
                  ? `${bioName} isn’t set up on this phone yet. Add it in your phone settings, then turn it on in Profile › App lock.`
                  : pinDone
                    ? 'Open PocketPlan in a second, no typing.'
                    : 'Available after you create your PIN.'
              }
              done={bioDone}
              disabled={!pinDone || !device.available}
              action={bioDone || !device.available ? undefined : { label: busy ? 'Waiting…' : `Turn on`, onPress: () => void enableBiometrics() }}
            />
          </>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => (pinDone ? router.back() : void later())}
          style={pinDone ? [cardShadow, { shadowOpacity: 0.22 }] : undefined}
          className={`mt-6 h-[54px] items-center justify-center rounded-2xl active:opacity-85 ${pinDone ? 'bg-primary' : 'bg-transparent'}`}>
          <Text className={`text-[15px] font-bold ${pinDone ? 'text-white' : 'text-muted'}`}>{pinDone ? 'Done' : 'Maybe later'}</Text>
        </Pressable>
        <Text className="mt-2 text-center text-[12px] leading-[18px] text-muted">You can change this anytime in Profile › App lock.</Text>
      </ScrollView>
    </View>
  );
}

function StepCard({
  number,
  Icon,
  color,
  title,
  body,
  done,
  disabled = false,
  action,
}: {
  number: number;
  Icon: LucideIcon;
  color: string;
  title: string;
  body: string;
  done: boolean;
  disabled?: boolean;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={cardShadow} className={`mb-3 rounded-3xl bg-card p-4 ${disabled && !done ? 'opacity-60' : ''}`}>
      <View className="flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: done ? colors.positive : `${color}1F` }}>
          {done ? <Check size={22} color={colors.positiveText} strokeWidth={2.6} /> : <Icon size={22} color={color} strokeWidth={2} />}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-[1px] text-muted">Step {number}{done ? ' · Done' : ''}</Text>
          <Text className="mt-0.5 text-[16px] font-bold text-ink">{title}</Text>
        </View>
      </View>
      <Text className="mt-2 text-[13px] leading-[19px] text-muted">{body}</Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={action.onPress}
          className={`mt-3 h-11 items-center justify-center rounded-2xl ${disabled ? 'bg-border' : 'bg-primary active:opacity-85'}`}>
          <Text className={`text-[14px] font-bold ${disabled ? 'text-muted' : 'text-white'}`}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}
