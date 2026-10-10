const palette = require('./src/theme/palette');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: palette.primary,
        accent: palette.accent,
        'accent-light': palette.accentLight,
        background: palette.background,
        card: palette.card,
        ink: palette.text,
        muted: palette.textSecondary,
        positive: palette.positive,
        'positive-text': palette.positiveText,
        warning: palette.warning,
        'warning-bg': palette.warningBg,
        'warning-text': palette.warningText,
        error: palette.error,
        'error-bg': palette.errorBg,
        border: palette.border,
      },
    },
  },
  plugins: [],
};
