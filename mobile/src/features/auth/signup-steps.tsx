import { Text, View } from 'react-native';

const STEPS = ['Email', 'Your name', 'Allowance'];

/** Email → Your name → Allowance progress for new accounts, as a slim segmented bar. */
export function SignupSteps({ current }: { current: number }) {
  return (
    <View accessible accessibilityLabel={`Step ${current + 1} of ${STEPS.length}: ${STEPS[current]}`}>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-accent">Step {current + 1} of {STEPS.length}</Text>
        <Text className="text-[13px] font-semibold text-ink">{STEPS[current]}</Text>
      </View>
      <View className="mt-2.5 flex-row gap-1.5">
        {STEPS.map((label, i) => (
          <View key={label} className={`h-1.5 flex-1 rounded-full ${i < current ? 'bg-positive-text' : i === current ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </View>
    </View>
  );
}
