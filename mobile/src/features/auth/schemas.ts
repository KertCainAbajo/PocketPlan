import { z } from 'zod';

const email = z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.');

// Mirrors the backend rule: at least 8 characters with letters and numbers.
const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Full name is required.').max(100, 'Name is too long.'),
    email,
    password: newPassword,
    passwordConfirmation: z.string().min(1, 'Please confirm your password.'),
    acceptedTerms: z.boolean().refine((v) => v, 'Please accept the Terms of Service and Privacy Policy to continue.'),
  })
  .refine((v) => v.password === v.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Passwords do not match.',
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    email,
    token: z.string().trim().min(1, 'Reset code is required.'),
    password: newPassword,
    passwordConfirmation: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((v) => v.password === v.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Passwords do not match.',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Maps backend (snake_case) field names to form field names. */
export const serverFieldMap: Record<string, string> = {
  password_confirmation: 'passwordConfirmation',
  terms: 'acceptedTerms',
};
