import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyRound, LockKeyhole, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthLayout } from '@/components/auth-layout';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { FormBanner } from '@/components/ui/form-banner';
import { authApi } from '@/features/auth/api';
import { resetPasswordSchema, serverFieldMap, type ResetPasswordInput } from '@/features/auth/schemas';
import { applyServerErrors } from '@/lib/form-errors';

const FIELDS = ['email', 'token', 'password', 'passwordConfirmation'] as const;

/** Opened from the emailed link (pocketplan://reset-password?token=…&email=…) or manually. */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: params.email ?? '',
      token: params.token ?? '',
      password: '',
      passwordConfirmation: '',
    },
  });

  const reset = useMutation({
    mutationFn: authApi.resetPassword,
    onError: (error) => setFormError(applyServerErrors(error, setError, FIELDS, serverFieldMap)),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    reset.mutate(values);
  });

  return (
    <AuthLayout title="Choose a new password" subtitle="This signs you out on all your other devices.">

      <FormBanner message={formError} />
      <FormBanner message={reset.data} tone="success" />

      {reset.isSuccess ? (
        <Button label="Go to sign in" onPress={() => router.replace('/login')} />
      ) : (
        <>
          <FormField
            control={control}
            name="email"
            label="Email"
            icon={Mail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          {!params.token && (
            <FormField control={control} name="token" label="Reset code" icon={KeyRound} placeholder="Paste the code from the email" autoCapitalize="none" />
          )}
          <FormField
            control={control}
            name="password"
            label="New password"
            icon={LockKeyhole}
            placeholder="At least 8 characters, with a number"
            password
            textContentType="newPassword"
          />
          <FormField
            control={control}
            name="passwordConfirmation"
            label="Confirm new password"
            icon={LockKeyhole}
            password
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
          <Button label="Reset password" loading={reset.isPending} onPress={onSubmit} className="mt-2" />
        </>
      )}
    </AuthLayout>
  );
}
