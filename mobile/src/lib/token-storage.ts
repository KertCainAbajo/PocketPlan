import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'pocketplan.auth-token';

// SecureStore is native-only. The web build is not a supported target, so on
// web the token lives in memory and is lost on reload rather than being
// written to insecure storage.
let memoryToken: string | null = null;
const isNative = Platform.OS !== 'web';

export const tokenStorage = {
  async get(): Promise<string | null> {
    return isNative ? SecureStore.getItemAsync(TOKEN_KEY) : memoryToken;
  },
  async set(token: string): Promise<void> {
    if (isNative) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else memoryToken = token;
  },
  async clear(): Promise<void> {
    if (isNative) await SecureStore.deleteItemAsync(TOKEN_KEY);
    else memoryToken = null;
  },
};
