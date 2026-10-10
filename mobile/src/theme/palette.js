/**
 * Official PocketPlan palette. Single source of truth for the mobile app:
 * consumed by tailwind.config.js (NativeWind classes) and src/theme/colors.ts.
 * Keep in sync with backend/public/admin/admin.css (:root --pp-* variables).
 */
module.exports = {
  primary: '#243B6B',
  accent: '#6C7CF7',
  accentLight: '#EEF0FF',
  background: '#F7F8FC',
  card: '#FFFFFF',
  text: '#202534',
  textSecondary: '#687086',
  positive: '#DDF7E8',
  warning: '#F59E0B',
  error: '#DC2626',
  border: '#E5E7EB',

  // Derived for readable text on the pale status backgrounds (WCAG AA).
  positiveText: '#166534',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  errorBg: '#FEE2E2',
};
