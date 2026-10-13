import { useEffect, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Small, shared motion building blocks. All of them respect the phone's
 * "Remove animations" setting: looping effects stop and entrances skip.
 */

/** Grey placeholder block that gently pulses while content loads. */
export function Skeleton({ className = '', style }: { className?: string; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 750, easing: Easing.inOut(Easing.ease) })), -1));
  }, [pulse, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.get() * 0.45 }));

  return <Animated.View style={[animated, style]} className={`bg-[#E6E9F2] ${className}`} />;
}

/**
 * Fades its content up into place when it first appears. `index` staggers a
 * list so items arrive one after another.
 */
export function FadeInItem({ index = 0, children, className, style }: { index?: number; children: ReactNode; className?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(420).easing(Easing.out(Easing.cubic))} className={className} style={style}>
      {children}
    </Animated.View>
  );
}

/** A Pressable that shrinks slightly while held and springs back on release. */
export function PressableScale({
  children,
  scaleTo = 0.96,
  containerClassName,
  containerStyle,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps & { children: ReactNode; scaleTo?: number; containerClassName?: string; containerStyle?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={[animated, containerStyle]} className={containerClassName}>
      <Pressable
        {...props}
        onPressIn={(event) => { scale.set(withSpring(scaleTo, { damping: 18, stiffness: 320 })); onPressIn?.(event); }}
        onPressOut={(event) => { scale.set(withSpring(1, { damping: 14, stiffness: 260 })); onPressOut?.(event); }}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Endless gentle up-and-down drift for decorative pieces. */
export function Float({ children, distance = 6, duration = 2200, delay = 0, style }: { children: ReactNode; distance?: number; duration?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const half = { duration: duration / 2, easing: Easing.inOut(Easing.sin) };
    const loop = () => withRepeat(withSequence(withTiming(-distance, half), withTiming(0, half)), -1);
    const timer = setTimeout(() => y.set(loop()), delay);
    return () => clearTimeout(timer);
  }, [delay, distance, duration, reduceMotion, y]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}
