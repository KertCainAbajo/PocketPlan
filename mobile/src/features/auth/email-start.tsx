import { useMutation } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import {
  BadgeCheck,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Mail,
  MailCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthLayout } from '@/components/auth-layout';
import { GoogleButton } from '@/components/google-button';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { getErrorMessage } from '@/lib/api-client';
import { colors } from '@/theme/colors';

import { authApi } from './api';
import { SignupSteps } from './signup-steps';
import { useGoogleSignIn } from './use-google-sign-in';

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

/** Soft, navy-tinted elevation for the form card. */
const cardShadow = { shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * First step of sign-in and sign-up: just an email address. We email a
 * 6-digit code and continue on the verify-code screen. Sign-in also offers
 * Google and a password; sign-up is email only.
 */
export function EmailStart({ mode }: { mode: 'signin' | 'signup' }) {
  const google = useGoogleSignIn();
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const signup = mode === 'signup';
  const cleanEmail = email.trim().toLowerCase();
  const valid = EMAIL_PATTERN.test(cleanEmail);
  const [local, domain = ''] = cleanEmail.split('@');
  const typoFix = TYPOS[domain];
  // Show provider endings once something is typed and no full domain is there yet.
  const suggestions = local && !valid && cleanEmail.split('@').length <= 2
    ? DOMAINS.filter((d) => d.startsWith(domain) && d !== domain)
    : [];

  const sendCode = useMutation({
    mutationFn: () => authApi.requestEmailCode(cleanEmail),
    onSuccess: ({ resendSeconds }) =>
      router.push({ pathname: '/verify-code', params: { email: cleanEmail, mode, resend: String(resendSeconds) } }),
  });

  function change(value: string) {
    setEmail(value.replace(/\s/g, ''));
    sendCode.reset();
  }

  function submit() {
    setTouched(true);
    if (valid) sendCode.mutate();
  }

  const border = touched && !valid ? colors.error : focused ? colors.accent : valid ? colors.positiveText : colors.border;

  return (
    <AuthLayout
      eyebrow={signup ? undefined : `${greeting()} 👋`}
      title={signup ? 'Create your account' : 'Welcome back'}
      subtitle={signup ? 'Start with your email. No password to remember.' : 'Enter your email and we’ll send you a sign-in code.'}
      highlights={signup ? [
        { icon: BadgeCheck, label: 'Free forever' },
        { icon: Wallet, label: 'No bank login' },
        { icon: ShieldCheck, label: 'Private' },
      ] : undefined}>
      {signup && (
        <View className="mb-4">
          <SignupSteps current={0} />
        </View>
      )}

      <FormBanner message={sendCode.isError ? getErrorMessage(sendCode.error) : null} />

      <View style={cardShadow} className="rounded-3xl bg-card p-4">
        <Text className="mb-2 ml-0.5 text-[14px] font-semibold text-ink">Email address</Text>
        <View className="h-14 flex-row items-center rounded-2xl border-[1.5px] px-4" style={{ borderColor: border, backgroundColor: focused ? '#F7F8FF' : colors.card }}>
          <Mail size={20} color={focused ? colors.accent : colors.textSecondary} />
          <TextInput
            accessibilityLabel="Email address"
            value={email}
            onChangeText={change}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="you@example.com"
            placeholderTextColor="#9AA1B3"
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

        {touched && !valid ? (
          <Text accessibilityRole="alert" className="ml-0.5 mt-2 text-[13px] font-medium text-error">Enter a valid email, like juan@gmail.com.</Text>
        ) : typoFix ? (
          <Pressable accessibilityRole="button" onPress={() => setEmail(`${local}@${typoFix}`)} className="mt-2 flex-row items-center gap-1.5 self-start rounded-full bg-warning-bg px-3 py-1.5 active:opacity-70">
            <Sparkles size={13} color={colors.warningText} />
            <Text className="text-[12px] text-warning-text">Did you mean <Text className="font-bold">{local}@{typoFix}</Text>?</Text>
          </Pressable>
        ) : suggestions.length > 0 ? (
          <View className="mt-2.5 flex-row flex-wrap gap-2">
            {suggestions.map((d) => (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`Use ${local}@${d}`}
                onPress={() => setEmail(`${local}@${d}`)}
                className="rounded-full bg-accent-light px-3 py-1.5 active:opacity-70">
                <Text className="text-[12px] font-semibold text-primary">@{d}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text className="ml-0.5 mt-2 text-[12px] text-muted">We’ll send a 6-digit code to this address.</Text>
        )}
      </View>

      <Button
        label={sendCode.isPending ? 'Sending your code…' : signup ? 'Send my code' : 'Send sign-in code'}
        icon={sendCode.isPending ? undefined : Send}
        loading={sendCode.isPending}
        disabled={google.isPending}
        onPress={submit}
        className="mt-5"
      />

      {signup ? (
        <>
          {/* How email sign-up works, so the missing password isn't a surprise. */}
          <View className="mt-6 rounded-3xl bg-accent-light/60 p-4">
            <Text className="text-[12px] font-bold uppercase tracking-[1px] text-primary">How it works</Text>
            <HowItem Icon={Send} text="We email you a 6-digit code" />
            <HowItem Icon={MailCheck} text="Enter it here to confirm it’s you" />
            <HowItem Icon={KeyRound} text="Next time, just your email or your PIN" />
          </View>
          <Text className="mt-4 text-center text-[12px] leading-[18px] text-muted">
            By continuing you agree to the <Text className="font-semibold text-accent" onPress={() => router.push('/legal')}>Terms & Privacy</Text>.
          </Text>
        </>
      ) : (
        <>
          <View className="my-6 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-xs font-medium uppercase tracking-widest text-muted">or</Text>
            <View className="h-px flex-1 bg-border" />
          </View>
          <GoogleButton label="Continue with Google" onPress={google.start} loading={google.isPending} />
          <View className="mt-3">
            <FormBanner message={google.notice} tone="info" />
            <FormBanner message={google.error} />
          </View>
          <Link href="/password-login" asChild>
            <Pressable accessibilityRole="link" className="mt-1 flex-row items-center gap-1.5 self-center p-2 active:opacity-70">
              <KeyRound size={15} color={colors.accent} />
              <Text className="text-[14px] font-semibold text-accent">Use password instead</Text>
            </Pressable>
          </Link>
        </>
      )}

      <View className="mt-5 flex-row items-center justify-center gap-5">
        <TrustItem Icon={ShieldCheck} label="Secure sign-in" />
        <View className="h-3 w-px bg-border" />
        <TrustItem Icon={Fingerprint} label="Private by design" />
      </View>

      <View className="mt-6 flex-row items-center justify-center rounded-2xl bg-accent-light px-4 py-3.5">
        <Text className="text-[14px] text-primary/75">{signup ? 'Already have an account? ' : 'Don’t have an account? '}</Text>
        <Link href={signup ? '/login' : '/register'} replace asChild>
          <Text accessibilityRole="link" className="text-[14px] font-bold text-primary">{signup ? 'Sign in' : 'Create account'}</Text>
        </Link>
      </View>
    </AuthLayout>
  );
}

function HowItem({ Icon, text }: { Icon: LucideIcon; text: string }) {
  return (
    <View className="mt-2.5 flex-row items-center gap-2.5">
      <View className="h-7 w-7 items-center justify-center rounded-lg bg-white">
        <Icon size={15} color={colors.accent} />
      </View>
      <Text className="flex-1 text-[13px] text-primary">{text}</Text>
    </View>
  );
}

function TrustItem({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon size={14} color={colors.positiveText} strokeWidth={2.2} />
      <Text className="text-[12px] font-semibold text-muted">{label}</Text>
    </View>
  );
}
