import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowRight,
  ChevronsRight,
  BadgeCheck,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  LogIn,
  Mail,
  MailCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { showAlert } from '@/components/app-alert';
import { AuthLayout } from '@/components/auth-layout';
import { FormBanner } from '@/components/ui/form-banner';
import { getErrorMessage } from '@/lib/api-client';
import { colors } from '@/theme/colors';

import { authApi, emailCodeMismatch } from './api';
import { forgetLastEmail, getLastEmail } from './last-email';
import { SignupSteps } from './signup-steps';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Common email providers, offered as one-tap endings while typing. */
const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];

/** Frequent typos in those domains, mapped to the domain they were meant to be. */
const TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'yahoo.co': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
};

/** Soft, navy-tinted elevation. */
const shadow = (opacity = 0.08) => ({ shadowColor: colors.primary, shadowOpacity: opacity, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 });

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * First step of sign-in and sign-up: just an email address. We email a
 * 6-digit code and continue on the verify-code screen. Sign-in also offers
 * the last-used email in one tap.
 */
export function EmailStart({ mode }: { mode: 'signin' | 'signup' }) {
  // Prefilled when the other screen sent us here ("No account? Create one").
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const signup = mode === 'signup';
  const cleanEmail = email.trim().toLowerCase();
  const valid = EMAIL_PATTERN.test(cleanEmail);
  const [local, domain = ''] = cleanEmail.split('@');
  const typoFix = TYPOS[domain];
  // Show provider endings once something is typed and no full domain is there yet.
  const suggestions = local && !valid && cleanEmail.split('@').length <= 2
    ? DOMAINS.filter((d) => d.startsWith(domain) && d !== domain)
    : [];
  const showRecent = !signup && Boolean(lastEmail) && !params.email;

  // Sign-in: offer the email last used on this phone.
  useEffect(() => {
    if (signup) return;
    let active = true;
    void getLastEmail().then((value) => { if (active) setLastEmail(value); });
    return () => { active = false; };
  }, [signup]);

  // The target email is passed in so "Continue as …" can send without touching the field.
  const sendCode = useMutation({
    mutationFn: (target: string) => authApi.requestEmailCode(target, mode),
    onSuccess: ({ resendSeconds }, target) =>
      router.push({ pathname: '/verify-code', params: { email: target, mode, resend: String(resendSeconds) } }),
  });
  const target = sendCode.variables ?? cleanEmail;
  const mismatch = sendCode.isError ? emailCodeMismatch(sendCode.error) : null;
  const sendingTyped = sendCode.isPending && sendCode.variables === cleanEmail;

  function change(value: string) {
    setEmail(value.replace(/\s/g, ''));
    sendCode.reset();
  }

  function submit() {
    setTouched(true);
    if (valid) sendCode.mutate(cleanEmail);
  }

  const showError = touched && !valid;
  const border = showError ? colors.error : focused ? colors.accent : valid ? colors.positiveText : '#E3E6EF';

  return (
    <AuthLayout
      eyebrow={signup ? undefined : `${greeting()} 👋`}
      title={signup ? 'Create your account' : 'Welcome back'}
      subtitle={signup ? 'Start with your email. No password to remember.' : 'Sign in with a one-time code sent to your email.'}
      highlights={signup ? [
        { icon: BadgeCheck, label: 'Free forever' },
        { icon: Wallet, label: 'No bank login' },
        { icon: ShieldCheck, label: 'Private' },
      ] : undefined}>
      {signup && (
        <View className="mb-6">
          <SignupSteps current={0} />
        </View>
      )}

      {mismatch ? (
        <MismatchCard
          reason={mismatch}
          email={target}
          onSwitch={() => router.replace({ pathname: mismatch === 'no_account' ? '/register' : '/login', params: { email: target } })}
        />
      ) : (
        <FormBanner message={sendCode.isError ? getErrorMessage(sendCode.error) : null} />
      )}

      {showRecent && lastEmail && (
        <>
          <RecentAccount
            email={lastEmail}
            sending={sendCode.isPending && sendCode.variables === lastEmail}
            disabled={sendCode.isPending}
            onContinue={() => sendCode.mutate(lastEmail)}
            onRemove={() => { void forgetLastEmail(); setLastEmail(null); }}
          />
          <Divider label="or use another email" />
        </>
      )}

      {/* Email field. Only colours change on focus: toggling elevation steals focus on Android. */}
      <Text className="mb-2 ml-1 text-[13px] font-bold text-ink">Email address</Text>
      <View style={[shadow(0.07), { borderColor: border }]} className="h-[60px] flex-row items-center rounded-[20px] border-[1.5px] bg-card pl-2 pr-4">
        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${focused || valid ? 'bg-accent-light' : 'bg-background'}`}>
          <Mail size={20} color={focused || valid ? colors.accent : colors.textSecondary} />
        </View>
        <TextInput
          accessibilityLabel="Email address"
          value={email}
          onChangeText={change}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="you@example.com"
          placeholderTextColor="#A3AABB"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={submit}
          className="ml-3 flex-1 text-[16px] text-ink"
        />
        {valid && <CheckCircle2 size={20} color={colors.positiveText} />}
      </View>

      <View className="ml-1 mt-2.5 min-h-[30px]">
        {showError ? (
          <Text accessibilityRole="alert" className="text-[13px] font-medium text-error">Enter a valid email, like juan@gmail.com.</Text>
        ) : typoFix ? (
          <Pressable accessibilityRole="button" onPress={() => setEmail(`${local}@${typoFix}`)} className="flex-row items-center gap-1.5 self-start rounded-full bg-warning-bg px-3 py-1.5 active:opacity-70">
            <Sparkles size={13} color={colors.warningText} />
            <Text className="text-[12px] text-warning-text">Did you mean <Text className="font-bold">{local}@{typoFix}</Text>?</Text>
          </Pressable>
        ) : suggestions.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {suggestions.map((d) => (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`Use ${local}@${d}`}
                onPress={() => setEmail(`${local}@${d}`)}
                className="rounded-full border border-accent/30 bg-card px-3 py-1.5 active:bg-accent-light">
                <Text className="text-[12px] font-semibold text-primary">@{d}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text className="text-[12px] text-muted">We’ll send a 6-digit code to this address.</Text>
        )}
      </View>

      <GradientButton
        label={sendingTyped ? 'Sending your code…' : signup ? 'Send my code' : 'Send sign-in code'}
        Icon={Send}
        loading={sendingTyped}
        disabled={sendCode.isPending}
        onPress={submit}
      />

      {/* What makes this sign-in different, in one glance */}
      <View style={shadow(0.05)} className="mt-7 flex-row rounded-3xl bg-card py-4">
        <Feature Icon={MailCheck} title="Code by email" />
        <View className="my-1 w-px bg-border" />
        <Feature Icon={KeyRound} title="No password" />
        <View className="my-1 w-px bg-border" />
        <Feature Icon={LockKeyhole} title="Private & secure" />
      </View>

      <View className="flex-1" />

      <SwitchCard signup={signup} />

      {signup && (
        <View className="mt-4 flex-row items-start justify-center gap-1.5 px-4">
          <ShieldCheck size={14} color={colors.positiveText} style={{ marginTop: 2 }} />
          <Text className="flex-1 text-center text-[12px] leading-[18px] text-muted">
            By continuing you agree to our{' '}
            <Text className="font-semibold text-primary underline" onPress={() => router.push('/legal')}>Terms of Service</Text> and{' '}
            <Text className="font-semibold text-primary underline" onPress={() => router.push('/legal')}>Privacy Policy</Text>.
          </Text>
        </View>
      )}
    </AuthLayout>
  );
}

/** Bottom card that switches between Sign in and Create account. */
function SwitchCard({ signup }: { signup: boolean }) {
  const Icon = signup ? LogIn : UserPlus;
  return (
    <Link href={signup ? '/login' : '/register'} replace asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={signup ? 'Already have an account? Sign in' : 'New to PocketPlan? Create an account'}
        style={shadow(0.06)}
        className="mt-7 flex-row items-center rounded-3xl border border-accent/20 bg-card p-4 active:opacity-80">
        <LinearGradient
          colors={['#EEF0FF', '#DDE2FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={21} color={colors.accent} strokeWidth={2.1} />
        </LinearGradient>
        <View className="ml-3.5 flex-1">
          <Text className="text-[15px] font-bold text-ink">{signup ? 'Already have an account?' : 'New to PocketPlan?'}</Text>
          <Text className="mt-0.5 text-[12.5px] text-muted">{signup ? 'Sign in with a code sent to your email' : 'Create your free account in under a minute'}</Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full bg-primary py-2 pl-3.5 pr-2.5">
          <Text className="text-[13px] font-bold text-white">{signup ? 'Sign in' : 'Sign up'}</Text>
          <ArrowRight size={14} color="white" strokeWidth={2.5} />
        </View>
      </Pressable>
    </Link>
  );
}

/** Main action: navy gradient with a soft indigo glow underneath. */
function GradientButton({ label, Icon, loading, disabled, onPress }: { label: string; Icon: LucideIcon; loading: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <View
      className={`mt-2 overflow-hidden rounded-[20px] ${disabled && !loading ? 'opacity-60' : ''}`}
      style={{ shadowColor: colors.accent, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
      <LinearGradient colors={['#3A55A0', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled, busy: loading }}
          disabled={disabled}
          onPress={onPress}
          className="h-[58px] flex-row items-center justify-center gap-2.5 active:opacity-85">
          {loading ? <ActivityIndicator color="white" /> : null}
          <Text className="text-[16px] font-bold text-white">{label}</Text>
          {!loading && <Icon size={18} color="white" strokeWidth={2.3} />}
        </Pressable>
      </LinearGradient>
    </View>
  );
}

function Feature({ Icon, title }: { Icon: LucideIcon; title: string }) {
  return (
    <View className="flex-1 items-center px-1">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-light">
        <Icon size={18} color={colors.accent} strokeWidth={2.1} />
      </View>
      <Text className="mt-2 text-center text-[12px] font-semibold text-ink">{title}</Text>
    </View>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <View className="my-5 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text className="text-[11px] font-semibold uppercase tracking-[1.2px] text-muted">{label}</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}

/**
 * One-tap sign-in for the email last used on this phone. Swipe it right to show
 * Remove on the left, which asks before forgetting the account on this phone.
 */
function RecentAccount({ email, sending, disabled, onContinue, onRemove }: { email: string; sending: boolean; disabled: boolean; onContinue: () => void; onRemove: () => void }) {
  const swipe = useRef<SwipeableMethods>(null);

  function confirmRemove() {
    showAlert(
      'Remove this account?',
      `${email} won’t be suggested on this phone anymore. Your account and data stay safe, and you can sign in again anytime.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => swipe.current?.close() },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ],
      { icon: Trash2 },
    );
  }

  return (
    <View>
      <Swipeable
        ref={swipe}
        friction={1.6}
        leftThreshold={40}
        overshootLeft={false}
        renderLeftActions={(progress) => <RemoveAction progress={progress} onPress={confirmRemove} />}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Continue as ${email}`}
          accessibilityHint="Swipe right to remove this account from this phone"
          accessibilityActions={[{ name: 'remove', label: 'Remove account from this phone' }]}
          onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'remove') confirmRemove(); }}
          disabled={disabled}
          onPress={onContinue}
          style={shadow(0.1)}
          className="flex-row items-center rounded-3xl border border-accent/25 bg-card p-3.5 active:opacity-85">
          <LinearGradient colors={[colors.accent, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Text className="text-[18px] font-extrabold text-white">{email[0]?.toUpperCase()}</Text>
          </LinearGradient>
          <View className="ml-3 flex-1">
            <Text className="text-[11px] font-bold uppercase tracking-[1px] text-accent">Continue as</Text>
            <Text numberOfLines={1} className="mt-0.5 text-[15px] font-bold text-ink">{email}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Not you? Remove this account" hitSlop={8} onPress={confirmRemove} className="mt-0.5 self-start">
              <Text className="text-[12px] font-semibold text-muted underline">Not you?</Text>
            </Pressable>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
            {sending ? <ActivityIndicator size="small" color="white" /> : <ArrowRight size={18} color="white" strokeWidth={2.4} />}
          </View>
        </Pressable>
      </Swipeable>
      <View className="mt-2 flex-row items-center justify-center gap-1">
        <Text className="text-[11px] text-muted">Swipe right to remove</Text>
        <ChevronsRight size={13} color={colors.textSecondary} />
      </View>
    </View>
  );
}

/** Red Remove button revealed behind the card; it grows in as the card slides. */
function RemoveAction({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.6, 1], [0, 0.6, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.7, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <Animated.View style={style} className="mr-3 justify-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove account from this phone"
        onPress={onPress}
        className="h-full w-[88px] items-center justify-center gap-1 rounded-3xl bg-error active:opacity-85">
        <Trash2 size={22} color="white" />
        <Text className="text-[12px] font-bold text-white">Remove</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Shown when the email is on the wrong screen, with a one-tap switch that keeps the email. */
function MismatchCard({ reason, email, onSwitch }: { reason: 'no_account' | 'account_exists'; email: string; onSwitch: () => void }) {
  const noAccount = reason === 'no_account';
  return (
    <View accessibilityRole="alert" className="mb-5 rounded-3xl border-[1.5px] border-warning bg-warning-bg p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">
          {noAccount ? <UserPlus size={19} color={colors.warningText} /> : <LogIn size={19} color={colors.warningText} />}
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-warning-text">{noAccount ? 'No account found' : 'You already have an account'}</Text>
          <Text className="mt-0.5 text-[13px] leading-[19px] text-warning-text/90">
            {noAccount
              ? <>There’s no PocketPlan account for <Text className="font-bold">{email}</Text> yet. Create one first. It only takes a minute.</>
              : <><Text className="font-bold">{email}</Text> is already registered. Sign in instead, we’ll send you a code.</>}
          </Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={onSwitch} className="mt-3 h-11 flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-85">
        {noAccount ? <UserPlus size={16} color="white" /> : <LogIn size={16} color="white" />}
        <Text className="text-[14px] font-bold text-white">{noAccount ? 'Create an account' : 'Sign in instead'}</Text>
      </Pressable>
    </View>
  );
}
