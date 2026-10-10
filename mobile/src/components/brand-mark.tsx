import { Text, View } from 'react-native';

import { Logo } from './logo';

interface BrandMarkProps {
  /** White wordmark for navy backgrounds. */
  inverted?: boolean;
  size?: number;
}

export function BrandMark({ inverted = false, size = 40 }: BrandMarkProps) {
  return (
    <View className="flex-row items-center gap-2" accessible accessibilityLabel="PocketPlan">
      <Logo size={size} variant={inverted ? 'dark' : 'light'} />
      <Text className={`text-[22px] font-bold tracking-tight ${inverted ? 'text-white' : 'text-primary'}`}>
        Pocket<Text className={inverted ? 'text-[#AEB8FF]' : 'text-accent'}>Plan</Text>
      </Text>
    </View>
  );
}
