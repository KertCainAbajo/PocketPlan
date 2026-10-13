import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

/** Email → Your name → Allowance progress for new accounts. */
export function SignupSteps({ current }: { current: number }) {
  const steps = ['Email', 'Your name', 'Allowance'];
  return (
    <View className="flex-row items-start" accessible accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} className={`flex-row items-start ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <View className="items-center">
              <View className={`h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-positive-text' : active ? 'bg-primary' : 'bg-border'}`}>
                {done ? <Check size={14} color="white" strokeWidth={3} /> : <Text className={`text-[12px] font-bold ${active ? 'text-white' : 'text-muted'}`}>{i + 1}</Text>}
              </View>
              <Text className={`mt-1 text-[11px] ${active ? 'font-bold text-ink' : 'font-semibold text-muted'}`}>{label}</Text>
            </View>
            {i < steps.length - 1 && <View className={`mx-1.5 mt-3.5 h-0.5 flex-1 rounded-full ${done ? 'bg-positive-text' : 'bg-border'}`} />}
          </View>
        );
      })}
    </View>
  );
}
