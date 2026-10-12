import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors } from '@/theme/colors';

type Tone = 'error' | 'success' | 'info';

interface FormBannerProps {
  message: string | null | undefined;
  tone?: Tone;
}

const STYLES: Record<Tone, { title: string; bg: string; border: string; text: string; color: string; Icon: typeof Info }> = {
  error: { title: 'Something went wrong', bg: '#FEF2F2', border: '#FECACA', text: 'text-error', color: colors.error, Icon: AlertCircle },
  success: { title: 'Done', bg: '#F0FDF4', border: '#BBF7D0', text: 'text-positive-text', color: colors.positiveText, Icon: CheckCircle2 },
  info: { title: 'Good to know', bg: '#F5F6FF', border: '#DCE0FF', text: 'text-primary', color: colors.accent, Icon: Info },
};

/** Form-level message. Always icon + text, never color alone. */
export function FormBanner({ message, tone = 'error' }: FormBannerProps) {
  if (!message) return null;
  const { title, bg, border, text, color, Icon } = STYLES[tone];

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      accessibilityRole="alert"
      className="mb-4 flex-row overflow-hidden rounded-2xl border"
      style={{ backgroundColor: bg, borderColor: border }}>
      <View className="w-1" style={{ backgroundColor: color }} />
      <View className="flex-1 flex-row items-start gap-3 p-3.5">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-white">
          <Icon size={17} color={color} strokeWidth={2.3} />
        </View>
        <View className="flex-1">
          <Text className={`text-[13px] font-bold ${text}`}>{title}</Text>
          <Text className="mt-0.5 text-[13px] leading-[19px] text-ink/80">{message}</Text>
        </View>
      </View>
    </Animated.View>
  );
}
