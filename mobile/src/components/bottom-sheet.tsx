import { Check, X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Portal } from 'react-native-paper';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

/**
 * Panel that slides up from the bottom over a dimmed backdrop. Rendered in a
 * Portal so it covers the whole app, down to the very bottom edge.
 * Tapping outside, the ✕ or Android back closes it.
 */
export function BottomSheet({ visible, title, subtitle, onClose, children }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Portal>
      <Animated.View entering={FadeIn.duration(180)} style={{ position: 'absolute', inset: 0 }} className="justify-end bg-[#0B1430]/50">
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', inset: 0 }} />
        <Animated.View entering={SlideInDown.duration(280)} accessibilityViewIsModal className="max-h-[82%] rounded-t-[32px] bg-card px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-border" />
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[20px] font-extrabold tracking-tight text-ink">{title}</Text>
              {subtitle ? <Text className="mt-0.5 text-[13px] text-muted">{subtitle}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-background">
              <X size={17} color={colors.textSecondary} />
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </Animated.View>
    </Portal>
  );
}

export interface SheetOption<K extends string | number> {
  key: K;
  label: string;
  /** Renders the icon tile for this option, given whether it is selected. */
  icon: (selected: boolean) => ReactNode;
}

/** A single-choice list in a bottom sheet. */
export function OptionSheet<K extends string | number>({
  visible,
  title,
  subtitle,
  options,
  selected,
  accent = colors.accent,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: SheetOption<K>[];
  selected: K | null;
  accent?: string;
  onSelect: (key: K) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} title={title} subtitle={subtitle} onClose={onClose}>
      <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
        {options.map((option) => {
          const active = option.key === selected;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onSelect(option.key)}
              className={`mb-1 flex-row items-center rounded-2xl px-3 py-3 active:opacity-70 ${active ? 'bg-background' : ''}`}>
              {option.icon(active)}
              <Text className={`ml-3 flex-1 text-[15px] text-ink ${active ? 'font-bold' : 'font-semibold'}`}>{option.label}</Text>
              {active ? (
                <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
                  <Check size={14} color="white" strokeWidth={3} />
                </View>
              ) : (
                <View className="h-6 w-6 rounded-full border-2 border-border" />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const ITEM = 48;
const VISIBLE_ROWS = 5;
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

/**
 * Time picker with scroll wheels for hour and minute and an AM/PM switch.
 * `value` and the result are 24-hour "HH:MM".
 */
export function TimeSheet({ visible, value, onConfirm, onClose }: { visible: boolean; value: string; onConfirm: (time: string) => void; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} title="Set the time" subtitle="When did this happen?" onClose={onClose}>
      {/* Remount on every open so the wheels start at the current value. */}
      {visible ? <TimeWheels value={value} onConfirm={onConfirm} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function TimeWheels({ value, onConfirm, onClose }: { value: string; onConfirm: (time: string) => void; onClose: () => void }) {
  const [h24, m] = value.split(':').map(Number);
  const [hourIndex, setHourIndex] = useState(((h24 % 12) || 12) - 1);
  const [minuteIndex, setMinuteIndex] = useState(Number.isFinite(m) ? m : 0);
  const [pm, setPm] = useState(h24 >= 12);

  const hour12 = hourIndex + 1;
  const hours24 = (hour12 % 12) + (pm ? 12 : 0);
  const result = `${String(hours24).padStart(2, '0')}:${MINUTES[minuteIndex]}`;

  return (
    <>
      <View className="mt-4 items-center rounded-2xl bg-background py-3">
        <Text className="text-[34px] font-extrabold tracking-tight text-ink">
          {hour12}:{MINUTES[minuteIndex]} <Text className="text-[20px] font-bold text-muted">{pm ? 'PM' : 'AM'}</Text>
        </Text>
      </View>

      <View className="mt-4 flex-row items-center">
        {/* Highlight band behind the selected row */}
        <View pointerEvents="none" className="absolute left-0 right-0 rounded-2xl bg-accent-light" style={{ top: ITEM * 2, height: ITEM }} />
        <Wheel values={HOURS} index={hourIndex} onChange={setHourIndex} label="Hour" />
        <Text className="px-1 text-[26px] font-bold text-ink">:</Text>
        <Wheel values={MINUTES} index={minuteIndex} onChange={setMinuteIndex} label="Minute" />
        <View className="ml-3 gap-2">
          {(['AM', 'PM'] as const).map((period) => {
            const active = (period === 'PM') === pm;
            return (
              <Pressable
                key={period}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setPm(period === 'PM')}
                className={`h-12 w-16 items-center justify-center rounded-xl ${active ? 'bg-primary' : 'bg-background'}`}>
                <Text className={`text-[15px] font-bold ${active ? 'text-white' : 'text-muted'}`}>{period}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mt-5 flex-row gap-2.5">
        <Pressable accessibilityRole="button" onPress={onClose} className="h-[52px] flex-1 items-center justify-center rounded-2xl bg-background active:opacity-80">
          <Text className="text-[15px] font-bold text-muted">Cancel</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onConfirm(result)} className="h-[52px] flex-[2] items-center justify-center rounded-2xl bg-primary active:opacity-85">
          <Text className="text-[15px] font-bold text-white">Set time</Text>
        </Pressable>
      </View>
    </>
  );
}

/** One snapping column of a scroll wheel. */
function Wheel({ values, index, onChange, label }: { values: string[]; index: number; onChange: (index: number) => void; label: string }) {
  const ref = useRef<ScrollView>(null);
  const positioned = useRef(false);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.max(0, Math.min(values.length - 1, Math.round(event.nativeEvent.contentOffset.y / ITEM)));
    if (next !== index) onChange(next);
  };

  return (
    <View className="flex-1" style={{ height: ITEM * VISIBLE_ROWS }} accessibilityLabel={`${label} ${values[index]}`}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: ITEM * 2 }}
        onLayout={() => {
          if (positioned.current) return;
          positioned.current = true;
          ref.current?.scrollTo({ y: index * ITEM, animated: false });
        }}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}>
        {values.map((item, i) => {
          const distance = Math.abs(i - index);
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${item}`}
              onPress={() => { ref.current?.scrollTo({ y: i * ITEM, animated: true }); onChange(i); }}
              style={{ height: ITEM }}
              className="items-center justify-center">
              <Text
                className={distance === 0 ? 'text-[24px] font-extrabold text-primary' : 'text-[19px] font-semibold text-muted'}
                style={{ opacity: distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3 }}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
