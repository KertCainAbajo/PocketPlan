import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { CheckCircle2, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import { AuthLayout } from '@/components/auth-layout';
import { FormField } from '@/components/form-field';
import { GoogleButton } from '@/components/google-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormBanner } from '@/components/ui/form-banner';
import { authApi } from '@/features/auth/api';
import { PasswordStrength } from '@/features/auth/password-strength';
import { registerSchema, serverFieldMap, type RegisterInput } from '@/features/auth/schemas';
import { useGoogleSignIn } from '@/features/auth/use-google-sign-in';
import { applyServerErrors } from '@/lib/form-errors';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme/colors';

const FIELDS = ['name', 'email', 'password', 'passwordConfirmation', 'acceptedTerms'] as const;

export default function RegisterScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const google = useGoogleSignIn();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, setFocus } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirmation: '', acceptedTerms: false },
  });

  const password = useWatch({ control, name: 'password' });
  const confirmation = useWatch({ control, name: 'passwordConfirmation' });
  const passwordsMatch = confirmation.length > 0 && password === confirmation;

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ token, user }) => signIn(token, user),
    onError: (error) => setFormError(applyServerErrors(error, setError, FIELDS, serverFieldMap)),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    register.mutate(values);
  });

  return (
    <AuthLayout title="Create your account" subtitle="Plan your allowance and know what you can spend, in under a minute.">
      <GoogleButton label="Sign up with Google" onPress={google.start} loading={google.isPending} />
      <Text className="mt-2.5 text-center text-xs leading-[18px] text-muted">
        By continuing with Google you agree to the{' '}
        <Text className="font-semibold text-accent" onPress={() => router.push('/legal')}>
          Terms & Privacy
        </Text>
        .
      </Text>
      <View className="mt-3">
        <FormBanner message={google.notice} tone="info" />
        <FormBanner message={google.error} />
      </View>

      <View className="mb-5 mt-2 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs font-medium uppercase tracking-widest text-muted">or with email</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <FormBanner message={formError} />

      <FormField
        control={control}
        name="name"
        label="Full name"
        icon={UserRound}
        placeholder="Juan Dela Cruz"
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => setFocus('email')}
      />
      <FormField
        control={control}
        name="email"
        label="Email"
        icon={Mail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => setFocus('password')}
      />
      <FormField
        control={control}
        name="password"
        label="Password"
        icon={LockKeyhole}
        placeholder="Create a password"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => setFocus('passwordConfirmation')}>
        <PasswordStrength password={password} />
      </FormField>
      <FormField
        control={control}
        name="passwordConfirmation"
        label="Confirm password"
        icon={LockKeyhole}
        placeholder="Type your password again"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}>
        {passwordsMatch && (
          <View className="mt-1.5 flex-row items-center gap-1.5">
            <CheckCircle2 size={14} color={colors.positiveText} />
            <Text className="text-sm font-medium text-positive-text">Passwords match</Text>
          </View>
        )}
      </FormField>

      <Controller
        control={control}
        name="acceptedTerms"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <Checkbox
            checked={value}
            onChange={onChange}
            error={error?.message}
            accessibilityLabel="I agree to the Terms of Service and Privacy Policy">
            <Text className="text-sm leading-5 text-muted">
              I agree to the{' '}
              <Text className="font-semibold text-accent" onPress={() => router.push('/legal')}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text className="font-semibold text-accent" onPress={() => router.push('/legal')}>
                Privacy Policy
              </Text>
              .
            </Text>
          </Checkbox>
        )}
      />

      <Button label="Create account" loading={register.isPending} onPress={onSubmit} className="mt-1" />

      <View className="mt-5 flex-row items-center justify-center gap-1.5">
        <ShieldCheck size={14} color={colors.textSecondary} />
        <Text className="text-xs text-muted">Your data stays private. It is never sold or shared.</Text>
      </View>

      <View className="mt-6 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs text-muted">Already a member?</Text>
        <View className="h-px flex-1 bg-border" />
      </View>
      <Link href="/login" replace asChild>
        <Text accessibilityRole="link" className="mt-3 self-center p-2 text-[15px] font-bold text-accent">
          Sign in instead
        </Text>
      </Link>
    </AuthLayout>
  );
}
