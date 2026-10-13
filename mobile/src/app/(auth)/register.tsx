import { EmailStart } from '@/features/auth/email-start';

/** Sign up: email first, then a 6-digit code and your name. No password needed. */
export default function RegisterScreen() {
  return <EmailStart mode="signup" />;
}
