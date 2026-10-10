import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle, type StatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

/**
 * Sets the status bar icon colour whenever this screen gains focus.
 * 'light' = white icons (navy headers), 'dark' = dark icons (light screens).
 * Every screen declares its own style, so no cleanup is needed.
 */
export function useStatusBarStyle(style: StatusBarStyle) {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style);
    }, [style]),
  );
}
