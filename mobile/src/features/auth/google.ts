import Constants, { ExecutionEnvironment } from 'expo-constants';

/** "Web application" OAuth client ID from Google Cloud; the backend accepts tokens issued for it. */
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export type GoogleAvailability = 'available' | 'expo-go' | 'not-configured';

/**
 * Google sign-in needs native code, so it works in a development or store
 * build of PocketPlan but never inside Expo Go.
 */
export function googleAvailability(): GoogleAvailability {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'expo-go';
  if (!webClientId) return 'not-configured';
  return 'available';
}

export const GOOGLE_UNAVAILABLE_MESSAGE: Record<Exclude<GoogleAvailability, 'available'>, string> = {
  'expo-go': 'Google sign-in works in the installed PocketPlan app, not in Expo Go. Use your email and password here.',
  'not-configured': 'Google sign-in has not been set up for this build yet. Use your email and password for now.',
};

// The native module is loaded on first use only, so merely importing this file is safe in Expo Go.
async function loadSdk() {
  const sdk = await import('@react-native-google-signin/google-signin');
  sdk.GoogleSignin.configure({ webClientId });
  return sdk;
}

/**
 * Shows Google's account picker and returns an ID token for the backend,
 * or null if the student closed the picker.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await loadSdk();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;

    const token = response.data.idToken;
    if (!token) throw new Error('Google did not return an ID token. Check the web client ID.');
    return token;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return null;
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play services are not available on this device.');
    }
    throw error;
  }
}

/** Forget the chosen Google account so the picker appears again next time. */
export async function signOutOfGoogle(): Promise<void> {
  if (googleAvailability() !== 'available') return;
  try {
    const { GoogleSignin } = await loadSdk();
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google; nothing to do.
  }
}
