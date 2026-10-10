import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { AuthHeader } from '@/components/auth-header';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { Screen } from '@/components/ui/screen';
import { authApi } from '@/features/auth/api';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { applyServerErrors } from '@/lib/form-errors';
import { useAuthStore } from '@/store/auth-store';

export default function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ token, user }) => signIn(token, user),
    onError: (error) => setFormError(applyServerErrors(error, setError, ['email', 'password'])),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values);
  });

  return (
    <Screen scroll>
      <AuthHeader title="Welcome back" subtitle="Sign in to see today's spending plan." />

      <FormBanner message={formError} />

      <FormField
        control={control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <FormField
        control={control}
        name="password"
        label="Password"
        placeholder="Your password"
        password
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      <Link href="/forgot-password" asChild>
        <Text accessibilityRole="link" className="mb-6 self-end py-1 text-sm font-semibold text-accent">
          Forgot password?
        </Text>
      </Link>

      <Button label="Sign in" loading={login.isPending} onPress={onSubmit} />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-sm text-muted">New to PocketPlan? </Text>
        <Link href="/register" replace asChild>
          <Text accessibilityRole="link" className="text-sm font-semibold text-accent">
            Create an account
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
