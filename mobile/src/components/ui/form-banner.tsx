import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { colors } from '@/theme/colors';

type Tone = 'error' | 'success' | 'info';

interface FormBannerProps {
  message: string | null | undefined;
  tone?: Tone;
}

const STYLES: Record<Tone, { container: string; text: string; color: string; Icon: typeof Info }> = {
  error: { container: 'bg-error-bg', text: 'text-error', color: colors.error, Icon: AlertCircle },
  success: { container: 'bg-positive', text: 'text-positive-text', color: colors.positiveText, Icon: CheckCircle2 },
  info: { container: 'bg-accent-light', text: 'text-primary', color: colors.accent, Icon: Info },
};

/** Form-level message. Always icon + text, never color alone. */
export function FormBanner({ message, tone = 'error' }: FormBannerProps) {
  if (!message) return null;
  const { container, text, color, Icon } = STYLES[tone];

  return (
    <View accessibilityRole="alert" className={`mb-4 flex-row items-start gap-2 rounded-2xl p-3.5 ${container}`}>
      <Icon size={20} color={color} />
      <Text className={`flex-1 text-sm leading-5 ${text}`}>{message}</Text>
    </View>
  );
}
