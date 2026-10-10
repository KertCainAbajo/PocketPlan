import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthHeader } from '@/components/auth-header';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { Screen } from '@/components/ui/screen';
import { authApi } from '@/features/auth/api';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/schemas';
import { applyServerErrors } from '@/lib/form-errors';

export default function ForgotPasswordScreen() {
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, getValues } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const request = useMutation({
    mutationFn: authApi.forgotPassword,
    onError: (error) => setFormError(applyServerErrors(error, setError, ['email'])),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    request.mutate(values);
  });

  return (
    <Screen scroll>
      <AuthHeader title="Reset your password" subtitle="Enter your account email and we'll send you a reset link." />

      <FormBanner message={formError} />
      <FormBanner message={request.data} tone="success" />

      <FormField
        control={control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={onSubmit}
      />

      <Button
        label={request.isSuccess ? 'Send again' : 'Send reset link'}
        loading={request.isPending}
        onPress={onSubmit}
        className="mt-2"
      />

      {request.isSuccess && (
        <Button
          label="I have a reset code"
          variant="secondary"
          className="mt-3"
          onPress={() => router.push({ pathname: '/reset-password', params: { email: getValues('email') } })}
        />
      )}
    </Screen>
  );
}
