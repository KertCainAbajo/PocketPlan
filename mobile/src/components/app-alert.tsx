import {
  AlertCircle,
  CheckCircle2,
  CircleHelp,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { create } from 'zustand';

import { colors } from '@/theme/colors';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'question';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

interface AlertOptions {
  tone?: AlertTone;
  icon?: LucideIcon;
}

interface AlertRequest extends AlertOptions {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

const TONES: Record<AlertTone, { Icon: LucideIcon; color: string; bg: string }> = {
  info: { Icon: Info, color: colors.accent, bg: colors.accentLight },
  question: { Icon: CircleHelp, color: colors.accent, bg: colors.accentLight },
  success: { Icon: CheckCircle2, color: colors.positiveText, bg: colors.positive },
  warning: { Icon: TriangleAlert, color: colors.warningText, bg: colors.warningBg },
  danger: { Icon: AlertCircle, color: colors.error, bg: colors.errorBg },
};

const useAlertQueue = create<{ queue: AlertRequest[]; push: (alert: AlertRequest) => void; shift: () => void }>((set) => ({
  queue: [],
  push: (alert) => set((state) => ({ queue: [...state.queue, alert] })),
  shift: () => set((state) => ({ queue: state.queue.slice(1) })),
}));

let nextId = 1;

/**
 * Drop-in replacement for React Native's Alert.alert with PocketPlan styling.
 * The tone is guessed from the buttons and title when not given.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[], options: AlertOptions = {}) {
  const list = buttons?.length ? buttons : [{ text: 'OK' }];
  const tone =
    options.tone ??
    (list.some((button) => button.style === 'destructive')
      ? 'danger'
      : /^could not|unavailable|failed/i.test(title)
        ? 'danger'
        : list.length > 1
          ? 'question'
          : 'info');
  useAlertQueue.getState().push({ id: nextId++, title, message, buttons: list, tone, icon: options.icon });
}

/** Renders the current alert. Mount once, at the root of the app. */
export function AlertHost() {
  const current = useAlertQueue((state) => state.queue[0]);
  const shift = useAlertQueue((state) => state.shift);
  if (!current) return null;

  const tone = TONES[current.tone ?? 'info'];
  const Icon = current.icon ?? tone.Icon;
  const cancel = current.buttons.find((button) => button.style === 'cancel');
  const actions = current.buttons.filter((button) => button !== cancel);
  // Two short choices sit side by side; longer lists stack like a menu.
  const stacked = actions.length > 1 || current.buttons.some((button) => button.text.length > 16);

  function press(button?: AlertButton) {
    shift();
    void button?.onPress?.();
  }

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={() => {
      // Android back acts like Cancel, or like OK on a single-button alert.
      if (cancel) press(cancel);
      else if (current.buttons.length === 1) press(current.buttons[0]);
    }}>
      <Animated.View entering={FadeIn.duration(180)} className="flex-1 items-center justify-center bg-[#0B1430]/55 px-7">
        {/* Tapping outside only dismisses when there is a cancel option. */}
        <Pressable accessibilityLabel="Dismiss" onPress={() => cancel && press(cancel)} style={{ position: 'absolute', inset: 0 }} />

        <Animated.View
          entering={ZoomIn.duration(260).withInitialValues({ transform: [{ scale: 0.9 }] })}
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={{ shadowColor: '#0B1430', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 16 }}
          className="w-full max-w-[360px] rounded-[28px] bg-card px-6 pb-5 pt-7">
          <View className="items-center">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-full" style={{ backgroundColor: tone.bg }}>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-white/70">
                <Icon size={26} color={tone.color} strokeWidth={2.2} />
              </View>
            </View>
            <Text className="mt-4 text-center text-[19px] font-extrabold tracking-tight text-ink">{current.title}</Text>
            {current.message ? <Text className="mt-2 text-center text-[14px] leading-[21px] text-muted">{current.message}</Text> : null}
          </View>

          <View className={`mt-6 ${stacked ? 'gap-2.5' : 'flex-row-reverse gap-2.5'}`}>
            {actions.map((button, index) => (
              <AlertActionButton key={button.text} button={button} primary={index === 0} tone={current.tone ?? 'info'} onPress={() => press(button)} flex={!stacked} />
            ))}
            {cancel ? <AlertActionButton button={cancel} primary={false} tone="info" onPress={() => press(cancel)} flex={!stacked} cancel /> : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function AlertActionButton({ button, primary, tone, onPress, flex, cancel = false }: { button: AlertButton; primary: boolean; tone: AlertTone; onPress: () => void; flex: boolean; cancel?: boolean }) {
  const destructive = button.style === 'destructive';
  const filled = primary && !cancel;
  const bg = cancel ? 'bg-background' : destructive ? 'bg-error' : filled ? (tone === 'success' ? 'bg-positive-text' : 'bg-primary') : 'bg-accent-light';
  const text = cancel ? 'text-muted' : filled || destructive ? 'text-white' : 'text-primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`h-[50px] items-center justify-center rounded-2xl px-4 active:opacity-80 ${bg} ${flex ? 'flex-1' : ''}`}>
      <Text numberOfLines={1} className={`text-[15px] font-bold ${text}`}>{button.text}</Text>
    </Pressable>
  );
}
