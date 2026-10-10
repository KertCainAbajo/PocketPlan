import { isAxiosError } from 'axios';
import { create } from 'zustand';

import { authApi } from '@/features/auth/api';
import { setAuthToken } from '@/lib/api-client';
import { tokenStorage } from '@/lib/token-storage';
import type { User } from '@/types/api';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'offline';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** Restore the session from SecureStore when the app opens. */
  bootstrap: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  /** Drop the local session without calling the API (token already invalid). */
  clearSession: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  async bootstrap() {
    const token = await tokenStorage.get();
    if (!token) {
      set({ status: 'signedOut', user: null });
      return;
    }

    setAuthToken(token);
    try {
      const user = await authApi.me();
      set({ status: 'signedIn', user });
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        // 401/403: the token is no longer valid on the server.
        await get().clearSession();
      } else {
        // Network problem: keep the token and let the user retry.
        set({ status: 'offline' });
      }
    }
  },

  async signIn(token, user) {
    await tokenStorage.set(token);
    setAuthToken(token);
    set({ status: 'signedIn', user });
  },

  async signOut() {
    try {
      await authApi.logout();
    } catch {
      // Even if the server is unreachable, the local session must end.
    }
    await get().clearSession();
  },

  async clearSession() {
    await tokenStorage.clear();
    setAuthToken(null);
    set({ status: 'signedOut', user: null });
  },

  setUser(user) {
    set({ user });
  },
}));
