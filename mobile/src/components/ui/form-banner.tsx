import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { colors } from '@/theme/colors';

interface FormBannerProps {
  message: string | null | undefined;
  tone?: 'error' | 'success';
}

/** Form-level message. Always icon + text, never color alone. */
export function FormBanner({ message, tone = 'error' }: FormBannerProps) {
  if (!message) return null;
  const isError = tone === 'error';

  return (
    <View
      accessibilityRole="alert"
      className={`mb-4 flex-row items-start gap-2 rounded-2xl p-3.5 ${isError ? 'bg-error-bg' : 'bg-positive'}`}>
      {isError ? (
        <AlertCircle size={20} color={colors.error} />
      ) : (
        <CheckCircle2 size={20} color={colors.positiveText} />
      )}
      <Text className={`flex-1 text-sm leading-5 ${isError ? 'text-error' : 'text-positive-text'}`}>{message}</Text>
    </View>
  );
}
