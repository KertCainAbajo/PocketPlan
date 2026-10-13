import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, BadgeCheck, Check, Clock, ExternalLink, Gauge, LockKeyhole, MailCheck, Pencil, RotateCw, ShieldCheck, UserRound, Wallet, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';

import { AuthLayout } from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { TextField } from '@/components/ui/text-field';
import { authApi } from '@/features/auth/api';
import { SignupSteps } from '@/features/auth/signup-steps';
import { getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const CODE_LENGTH = 6;
/** Matches config('pocketplan.email_code.ttl_minutes') on the server. */
const CODE_TTL_SECONDS = 10 * 60;

/** Webmail for well-known providers, so "Open Gmail" can jump straight to the inbox. */
function inboxFor(email: string): { label: string; app?: string; web: string } | null {
  const domain = email.split('@')[1] ?? '';
  if (domain === 'gmail.com' || domain === 'googlemail.com') return { label: 'Open Gmail', app: 'googlegmail://', web: 'https://mail.google.com' };
  if (['outlook.com', 'hotmail.com', 'live.com'].includes(domain)) return { label: 'Open Outlook', app: 'ms-outlook://', web: 'https://outlook.live.com' };
  if (domain.startsWith('yahoo.')) return { label: 'Open Yahoo Mail', web: 'https://mail.yahoo.com' };
  return null;
}

async function openInbox(target: { app?: string; web: string }) {
  if (target.app) {
    try {
      await Linking.openURL(target.app);
      return;
    } catch {
      // App not installed: fall back to the website.
    }
  }
  await Linking.openURL(target.web).catch(() => undefined);
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Soft, navy-tinted elevation for the form card. */
const cardShadow = { shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 };

/**
 * Step two of email sign-in / sign-up: type the 6-digit code from the email.
 * A new email then adds a name and accepts the terms to create the account.
 */
export default function VerifyCodeScreen() {
  const params = useLocalSearchParams<{ email?: string; mode?: string; resend?: string }>();
  const email = params.email ?? '';
  const signIn = useAuthStore((s) => s.signIn);
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'code' | 'name'>('code');
  const [name, setName] = useState('');
  const [terms, setTerms] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [cooldown, setCooldown] = useState(Number(params.resend) || 60);
  const [notice, setNotice] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(CODE_TTL_SECONDS);
  const signup = params.mode === 'signup';
  const inbox = inboxFor(email);

  // Resend and expiry countdowns, ticking once a second.
  useEffect(() => {
    if (cooldown <= 0 && expiresIn <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((value) => Math.max(0, value - 1));
      setExpiresIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown, expiresIn]);

  const verify = useMutation({
    // The code is passed in, not read from state: the last digit's state update hasn't rendered yet when it auto-submits.
    mutationFn: ({ value, withName }: { value: string; withName: boolean }) =>
      authApi.verifyEmailCode({ email, code: value, ...(withName ? { name: name.trim(), terms } : {}) }),
    onSuccess: async (result) => {
      if (result.needsName) {
        setStep('name');
        return;
      }
      await signIn(result.payload.token, result.payload.user);
    },
    onError: () => {
      // A wrong or expired code: clear the boxes so the next try starts fresh.
      if (step === 'code') {
        setCode('');
        input.current?.focus();
      }
    },
  });

  const resend = useMutation({
    mutationFn: () => authApi.requestEmailCode(email),
    onSuccess: ({ resendSeconds }) => {
      setCooldown(resendSeconds);
      setExpiresIn(CODE_TTL_SECONDS);
      setCode('');
      setStep('code');
      verify.reset();
      setNotice('We sent a new code. The old one no longer works.');
    },
  });

  function changeCode(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setNotice(null);
    verify.reset();
    if (digits.length === CODE_LENGTH) verify.mutate({ value: digits, withName: false });
  }

  function createAccount() {
    setAttempted(true);
    if (nameProblem(name) || !terms) return;
    verify.mutate({ value: code, withName: true });
  }

  if (step === 'name') {
    return (
      <NameStep
        email={email}
        name={name}
        onNameChange={setName}
        terms={terms}
        onTermsChange={setTerms}
        attempted={attempted}
        loading={verify.isPending}
        error={verify.isError ? getErrorMessage(verify.error) : null}
        onSubmit={createAccount}
      />
    );
  }

  const expired = expiresIn <= 0;

  return (
    <AuthLayout title="Check your email" subtitle="Enter the 6-digit code we just sent you.">
      {signup && (
        <View className="mb-4">
          <SignupSteps current={0} />
        </View>
      )}

      {/* Where the code went, with a quick way to fix a wrong address. */}
      <View style={cardShadow} className="flex-row items-center rounded-3xl bg-card p-4">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-light">
          <MailCheck size={21} color={colors.accent} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[12px] text-muted">Code sent to</Text>
          <Text numberOfLines={1} className="text-[15px] font-bold text-ink">{email}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Use a different email" onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full bg-background active:opacity-70">
          <Pencil size={15} color={colors.primary} />
        </Pressable>
      </View>

      <View style={cardShadow} className="mt-3 items-center rounded-3xl bg-card px-4 pb-5 pt-6">
        {/* One hidden input drives the six boxes, so paste and email autofill work. */}
        <Pressable accessibilityLabel="Enter the 6-digit code" onPress={() => input.current?.focus()} className="flex-row gap-2">
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const active = i === code.length && !verify.isPending && !expired;
            const filled = i < code.length;
            return (
              <View
                key={i}
                className={`h-[60px] w-[48px] items-center justify-center rounded-2xl border-2 ${
                  verify.isError ? 'border-error bg-error-bg' : active ? 'border-accent bg-accent-light/50' : filled ? 'border-primary bg-card' : 'border-border bg-background'
                }`}>
                <Text className="text-[26px] font-bold text-ink">{code[i] ?? ''}</Text>
                {active && <View className="absolute bottom-3 h-0.5 w-4 rounded-full bg-accent" />}
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={input}
          value={code}
          onChangeText={changeCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          autoFocus
          caretHidden
          editable={!expired}
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        />

        <Text accessibilityLiveRegion="polite" className={`mt-4 text-center text-[13px] ${verify.isError || expired ? 'font-semibold text-error' : 'text-muted'}`}>
          {verify.isPending ? 'Checking your code…' : verify.isError ? getErrorMessage(verify.error) : expired ? 'This code has expired. Send a new one below.' : 'The code fills in by itself as you type.'}
        </Text>

        {/* Live expiry clock */}
        {!expired && (
          <View className="mt-3 flex-row items-center gap-1.5 rounded-full bg-background px-3 py-1.5">
            <Clock size={13} color={expiresIn < 60 ? colors.warningText : colors.textSecondary} />
            <Text className={`text-[12px] font-semibold ${expiresIn < 60 ? 'text-warning-text' : 'text-muted'}`}>Expires in {clock(expiresIn)}</Text>
          </View>
        )}
      </View>

      <View className="mt-4">
        <FormBanner message={notice} tone="success" />
        <FormBanner message={resend.isError ? getErrorMessage(resend.error) : null} />
      </View>

      {inbox && (
        <Pressable
          accessibilityRole="button"
          onPress={() => void openInbox(inbox)}
          style={cardShadow}
          className="h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-card active:opacity-80">
          <ExternalLink size={17} color={colors.primary} />
          <Text className="text-[15px] font-bold text-primary">{inbox.label}</Text>
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={cooldown > 0 || resend.isPending}
        onPress={() => resend.mutate()}
        className={`mt-3 h-[52px] flex-row items-center justify-center gap-2 rounded-2xl ${cooldown > 0 ? 'bg-background' : expired ? 'bg-primary' : 'bg-accent-light'} active:opacity-80`}>
        <RotateCw size={16} color={cooldown > 0 ? colors.textSecondary : expired ? '#FFFFFF' : colors.primary} />
        <Text className={`text-[15px] font-bold ${cooldown > 0 ? 'text-muted' : expired ? 'text-white' : 'text-primary'}`}>
          {resend.isPending ? 'Sending…' : cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
        </Text>
      </Pressable>

      {/* Help for when the email doesn't show up */}
      <View className="mt-6 rounded-3xl bg-accent-light/60 p-4">
        <Text className="text-[12px] font-bold uppercase tracking-[1px] text-primary">Didn’t get it?</Text>
        <HelpItem text="Check your Spam or Promotions folder." />
        <HelpItem text="Make sure the email address above is right." />
        <HelpItem text="Wait a minute, then send a new code." />
      </View>
    </AuthLayout>
  );
}

function HelpItem({ text }: { text: string }) {
  return (
    <View className="mt-2 flex-row items-start gap-2">
      <View className="mt-[7px] h-1.5 w-1.5 rounded-full bg-accent" />
      <Text className="flex-1 text-[13px] leading-5 text-primary">{text}</Text>
    </View>
  );
}

/** Letters (any language), spaces, dots, hyphens and apostrophes; at least 2 characters. */
function nameProblem(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Enter your name.';
  if (name.length < 2) return 'Your name looks too short.';
  if (!/^\p{L}[\p{L} .'-]*$/u.test(name)) return 'Use letters only, no numbers or symbols.';
  return null;
}

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

/** Step 2 of sign-up: name and terms, with a live preview of the profile. */
function NameStep({
  email,
  name,
  onNameChange,
  terms,
  onTermsChange,
  attempted,
  loading,
  error,
  onSubmit,
}: {
  email: string;
  name: string;
  onNameChange: (value: string) => void;
  terms: boolean;
  onTermsChange: (value: boolean) => void;
  attempted: boolean;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const problem = nameProblem(name);
  const firstName = name.trim().split(/\s+/)[0] ?? '';
  const initials = initialsOf(name);
  const ready = !problem && terms;

  return (
    <AuthLayout title="Almost there" subtitle="Tell us your name to finish creating your account.">
      <SignupSteps current={1} />

      <View className="mt-4">
        <FormBanner message={error} />
      </View>

      {/* Live profile preview */}
      <View style={cardShadow} className="flex-row items-center rounded-3xl bg-card p-4">
        <View className={`h-14 w-14 items-center justify-center rounded-full ${initials ? 'bg-primary' : 'bg-accent-light'}`}>
          {initials ? <Text className="text-[20px] font-extrabold text-white">{initials}</Text> : <UserRound size={24} color={colors.accent} />}
        </View>
        <View className="ml-3 flex-1">
          <Text numberOfLines={1} className="text-[16px] font-bold text-ink">
            {firstName && !problem ? `Nice to meet you, ${firstName}! 👋` : 'Your profile'}
          </Text>
          <View className="mt-1 flex-row items-center gap-1.5">
            <BadgeCheck size={14} color={colors.positiveText} />
            <Text numberOfLines={1} className="flex-1 text-[12px] text-muted">{email}</Text>
            <Pressable accessibilityRole="link" accessibilityLabel="Use a different email" hitSlop={8} onPress={() => router.back()}>
              <Text className="text-[12px] font-bold text-accent">Change</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={cardShadow} className="mt-3 rounded-3xl bg-card px-4 pb-1 pt-5">
        <TextField
          label="Full name"
          icon={UserRound}
          value={name}
          onChangeText={onNameChange}
          placeholder="Juan Dela Cruz"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          maxLength={100}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          error={attempted || name.trim().length >= 2 ? problem ?? undefined : undefined}
        />
        <Text className="-mt-2 mb-4 ml-0.5 text-[12px] text-muted">This is how PocketPlan greets you. You can change it later.</Text>
      </View>

      {/* Terms as one big tappable card */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: terms }}
        accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
        onPress={() => onTermsChange(!terms)}
        className={`mt-3 flex-row rounded-3xl border-[1.5px] p-4 active:opacity-80 ${terms ? 'border-primary bg-accent-light/50' : attempted ? 'border-error bg-error-bg' : 'border-border bg-card'}`}>
        <View className={`mt-0.5 h-6 w-6 items-center justify-center rounded-lg border-[1.5px] ${terms ? 'border-primary bg-primary' : 'border-border bg-card'}`}>
          {terms && <Check size={15} color="white" strokeWidth={3} />}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[14px] leading-5 text-ink">
            I agree to the <Text className="font-semibold text-accent" onPress={() => router.push('/legal')}>Terms of Service</Text> and{' '}
            <Text className="font-semibold text-accent" onPress={() => router.push('/legal')}>Privacy Policy</Text>.
          </Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <ShieldCheck size={13} color={colors.positiveText} />
            <Text className="text-[12px] text-muted">We never sell your data or ask for bank logins.</Text>
          </View>
        </View>
      </Pressable>
      {attempted && !terms && <Text className="ml-1 mt-1.5 text-[12px] font-medium text-error">Please accept to continue.</Text>}

      <Button label="Create my account" icon={ArrowRight} loading={loading} disabled={!ready && attempted} onPress={onSubmit} className="mt-5" />

      {/* What happens next */}
      <View className="mt-6 rounded-3xl bg-accent-light/60 p-4">
        <Text className="text-[12px] font-bold uppercase tracking-[1px] text-primary">What’s next</Text>
        <NextItem Icon={Wallet} text="Set your allowance, takes 30 seconds" />
        <NextItem Icon={Gauge} text="See what’s safe to spend each day" />
        <NextItem Icon={LockKeyhole} text="Protect the app with a PIN and fingerprint" />
      </View>
    </AuthLayout>
  );
}

function NextItem({ Icon, text }: { Icon: LucideIcon; text: string }) {
  return (
    <View className="mt-2.5 flex-row items-center gap-2.5">
      <View className="h-7 w-7 items-center justify-center rounded-lg bg-white">
        <Icon size={15} color={colors.accent} />
      </View>
      <Text className="flex-1 text-[13px] text-primary">{text}</Text>
    </View>
  );
}
