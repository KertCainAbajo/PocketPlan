import { EmailStart } from '@/features/auth/email-start';

/** Sign in: email first, then a 6-digit code (or Google, or a password). */
export default function LoginScreen() {
  return <EmailStart mode="signin" />;
}
