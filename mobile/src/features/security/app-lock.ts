import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * App lock for this device: an optional 4-digit PocketPlan PIN, plus optional
 * biometrics (fingerprint / face) on top of it. Everything lives in the
 * device's secure storage and is wiped on sign-out.
 */
const PIN_KEY = 'pocketplan.app-pin';
/** Kept from the earlier biometric-only lock so existing users stay locked. */
const BIOMETRIC_KEY = 'pocketplan.biometric-unlock';

export const PIN_LENGTH = 4;

export type BiometricKind = 'fingerprint' | 'face' | 'both' | 'none';

export interface LockSettings {
  hasPin: boolean;
  biometrics: boolean;
}

/** The PIN is stored only as a salted SHA-256 hash: "salt:hash". */
async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function getLockSettings(): Promise<LockSettings> {
  const [pin, biometrics] = await Promise.all([
    SecureStore.getItemAsync(PIN_KEY).catch(() => null),
    SecureStore.getItemAsync(BIOMETRIC_KEY).catch(() => null),
  ]);
  return { hasPin: Boolean(pin), biometrics: biometrics === 'true' };
}

export const isLockEnabled = (settings: LockSettings) => settings.hasPin || settings.biometrics;

export async function setPin(pin: string) {
  const salt = Crypto.randomUUID();
  await SecureStore.setItemAsync(PIN_KEY, `${salt}:${await hashPin(pin, salt)}`);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY).catch(() => null);
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  return (await hashPin(pin, salt)) === hash;
}

/** Removing the PIN also turns biometrics off, since biometrics need a PIN to fall back on. */
export async function removePin() {
  await Promise.all([SecureStore.deleteItemAsync(PIN_KEY), SecureStore.deleteItemAsync(BIOMETRIC_KEY)]);
}

export async function setBiometrics(enabled: boolean) {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, String(enabled));
}

/** Called on sign-out so the next person on this phone starts without a lock. */
export async function clearAppLock() {
  await Promise.all([PIN_KEY, BIOMETRIC_KEY, PROMPT_KEY].map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined)));
}

/** Which biometrics this phone has set up, for labels like "Face ID" or "Fingerprint". */
export async function getBiometricKind(): Promise<{ available: boolean; kind: BiometricKind }> {
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const kind: BiometricKind = face && finger ? 'both' : face ? 'face' : finger ? 'fingerprint' : 'none';
    return { available: hardware && enrolled, kind };
  } catch {
    return { available: false, kind: 'none' };
  }
}

/** The name people know on their phone: Face ID / Touch ID on iPhone, Fingerprint / Face unlock on Android. */
export function biometricLabel(kind: BiometricKind) {
  if (Platform.OS === 'ios') return kind === 'fingerprint' ? 'Touch ID' : 'Face ID';
  if (kind === 'face') return 'Face unlock';
  if (kind === 'fingerprint') return 'Fingerprint';
  return 'Fingerprint or face';
}

/** What we suggest for this platform when none is detected yet. */
export const recommendedBiometric = () => (Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint');

/** "Maybe later" on the secure-your-app prompt; reset on sign-out so it is offered again after the next sign-in. */
const PROMPT_KEY = 'pocketplan.secure-prompt-dismissed';

export async function hasDismissedSecurePrompt() {
  return (await SecureStore.getItemAsync(PROMPT_KEY).catch(() => null)) === 'true';
}

export async function dismissSecurePrompt() {
  await SecureStore.setItemAsync(PROMPT_KEY, 'true').catch(() => undefined);
}

/** Shows the system fingerprint / face prompt. Never falls back to the phone's own passcode. */
export async function authenticateWithBiometrics(prompt = 'Unlock PocketPlan') {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel: 'Use PIN', disableDeviceFallback: true });
    return result.success;
  } catch {
    return false;
  }
}
