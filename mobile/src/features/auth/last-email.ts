import * as SecureStore from 'expo-secure-store';

/**
 * The email last used to sign in on this phone, so Sign in can offer
 * "Continue as …". Kept after sign-out on purpose; "Not you?" forgets it.
 */
const KEY = 'pocketplan.last-email';

export async function getLastEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY).catch(() => null);
}

export async function rememberEmail(email: string) {
  await SecureStore.setItemAsync(KEY, email.trim().toLowerCase()).catch(() => undefined);
}

export async function forgetLastEmail() {
  await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
}
