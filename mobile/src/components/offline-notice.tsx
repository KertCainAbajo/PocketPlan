import { WifiOff } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

import { Button } from './ui/button';

/** Shown when a saved session exists but the server could not be reached. */
export function OfflineNotice({ onRetry }: { onRetry: () => Promise<void> }) {
  const [retrying, setRetrying] = useState(false);

  return (
    <SafeAreaView className="absolute inset-0 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-accent-light">
          <WifiOff size={30} color={colors.accent} />
        </View>
        <Text className="mb-2 text-center text-xl font-bold text-ink">Can&apos;t reach PocketPlan</Text>
        <Text className="mb-8 text-center text-base leading-6 text-muted">
          Check your internet connection. Your account is still signed in on this device.
        </Text>
        <Button
          label="Try again"
          loading={retrying}
          className="w-full"
          onPress={async () => {
            setRetrying(true);
            await onRetry();
            setRetrying(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
