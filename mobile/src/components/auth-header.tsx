import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-7 pt-2">
      {router.canGoBack() && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => router.back()}
          className="mb-6 h-11 w-11 items-center justify-center rounded-full bg-card">
          <ArrowLeft size={22} color={colors.primary} />
        </Pressable>
      )}
      <Text className="text-3xl font-bold text-ink">{title}</Text>
      {subtitle ? <Text className="mt-2 text-base leading-6 text-muted">{subtitle}</Text> : null}
    </View>
  );
}
