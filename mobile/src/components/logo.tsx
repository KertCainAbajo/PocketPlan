import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
  /** 'light' for light backgrounds (navy bars), 'dark' for navy backgrounds (white bars). */
  variant?: 'light' | 'dark';
}

/**
 * PocketPlan mark: a "P" whose bowl is a periwinkle ring and whose stem is the
 * first of four rising chart bars, with a globe and an upward trend arrow.
 * Same geometry as the app icon (assets/images/icon.png).
 */
export function Logo({ size = 48, variant = 'light' }: LogoProps) {
  // Unique gradient ids so several logos can render on one screen.
  const id = useId().replace(/:/g, '');
  const bars = variant === 'dark' ? ['#FFFFFF', '#DCE1FF'] : ['#34508C', '#1B2D55'];
  const globe = variant === 'dark' ? '#FFFFFF' : '#8E9BFF';

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityRole="image" accessibilityLabel="PocketPlan logo">
      <Defs>
        <LinearGradient id={`ring${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#97A3FF" />
          <Stop offset="1" stopColor="#5566E8" />
        </LinearGradient>
        <LinearGradient id={`bar${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={bars[0]} />
          <Stop offset="1" stopColor={bars[1]} />
        </LinearGradient>
        <LinearGradient id={`swoosh${id}`} x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#6C7CF7" stopOpacity="0" />
          <Stop offset="0.4" stopColor="#6C7CF7" />
          <Stop offset="1" stopColor="#C3CAFF" />
        </LinearGradient>
      </Defs>

      <Path d="M 52 84 A 54 54 0 1 1 97 137.2" fill="none" stroke={`url(#ring${id})`} strokeWidth={20} strokeLinecap="round" />

      <Rect x={42} y={78} width={20} height={104} rx={5} fill={`url(#bar${id})`} />
      <Rect x={68} y={132} width={17} height={50} rx={4.5} fill={`url(#bar${id})`} />
      <Rect x={91} y={116} width={17} height={66} rx={4.5} fill={`url(#bar${id})`} />
      <Rect x={114} y={100} width={17} height={82} rx={4.5} fill={`url(#bar${id})`} />

      <G fill="none" stroke={globe} strokeWidth={2.6} strokeOpacity={0.85}>
        <Circle cx={106} cy={80} r={15} />
        <Ellipse cx={106} cy={80} rx={6.5} ry={15} />
        <Path d="M91 80 H121 M94 72 H118 M94 88 H118" />
      </G>

      <Path d="M 20 158 C 72 158 116 126 152 66" fill="none" stroke={`url(#swoosh${id})`} strokeWidth={9} strokeLinecap="round" />
      <Path d="M 165 42 L 162 76 L 140 61 Z" fill="#C3CAFF" stroke="#C3CAFF" strokeWidth={3} strokeLinejoin="round" />
    </Svg>
  );
}
