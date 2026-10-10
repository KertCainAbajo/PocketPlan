import { Wallet } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View className={`h-11 w-11 items-center justify-center rounded-2xl ${inverted ? 'bg-white/15' : 'bg-accent-light'}`}>
        <Wallet size={24} color={inverted ? colors.card : colors.accent} />
      </View>
      <Text className={`text-2xl font-bold ${inverted ? 'text-white' : 'text-primary'}`}>PocketPlan</Text>
    </View>
  );
}
