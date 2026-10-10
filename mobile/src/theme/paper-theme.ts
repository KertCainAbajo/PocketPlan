import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { colors } from './colors';

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.card,
    primaryContainer: colors.accentLight,
    onPrimaryContainer: colors.primary,
    secondary: colors.accent,
    onSecondary: colors.card,
    secondaryContainer: colors.accentLight,
    onSecondaryContainer: colors.primary,
    background: colors.background,
    onBackground: colors.text,
    surface: colors.card,
    onSurface: colors.text,
    surfaceVariant: colors.accentLight,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    error: colors.error,
  },
};
