import { useId } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

const svgId = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, '');

type Glow = { color: string; opacity: number; cx: string; cy: string; rx: string; ry: string; stop: number };

// CSS "linear-gradient(160deg, …)" runs top-left to bottom-right, mostly downward.
function GradientFill({ from, to, glow }: { from: string; to: string; glow?: Glow }) {
  const id = svgId(useId());
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`l${id}`} x1="0.32" y1="0" x2="0.68" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
        {glow ? (
          <RadialGradient id={`r${id}`} cx={glow.cx} cy={glow.cy} rx={glow.rx} ry={glow.ry} fx={glow.cx} fy={glow.cy}>
            <Stop offset="0" stopColor={glow.color} stopOpacity={glow.opacity} />
            <Stop offset={glow.stop} stopColor={glow.color} stopOpacity={0} />
          </RadialGradient>
        ) : null}
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#l${id})`} />
      {glow ? <Rect width="100%" height="100%" fill={`url(#r${id})`} /> : null}
    </Svg>
  );
}

/** gradient.card: brand gradient with a lilac glow rising from the bottom. */
export function CardGradient() {
  return (
    <GradientFill
      from={colors.gradientStart}
      to={colors.gradientEnd}
      glow={{ color: colors.lilac, opacity: 0.55, cx: '50%', cy: '115%', rx: '120%', ry: '70%', stop: 0.62 }}
    />
  );
}

/** gradient.brand: plain brand gradient (answer question panel, avatars). */
export function BrandGradient() {
  return <GradientFill from={colors.gradientStart} to={colors.gradientEnd} />;
}

/** Deck art: monthly/library decks glow from below, season and body decks from the top-left. */
export function DeckArtGradient({ variant }: { variant: 'monthly' | 'season' }) {
  if (variant === 'monthly') {
    return (
      <GradientFill
        from={colors.gradientStart}
        to={colors.gradientEnd}
        glow={{ color: colors.lilac, opacity: 0.55, cx: '50%', cy: '120%', rx: '110%', ry: '80%', stop: 0.6 }}
      />
    );
  }
  return (
    <GradientFill
      from={colors.burgundy600}
      to={colors.burgundy800}
      glow={{ color: colors.lilac, opacity: 0.5, cx: '20%', cy: '0%', rx: '120%', ry: '90%', stop: 0.6 }}
    />
  );
}

export function CardBackGradient({ variant }: { variant: 1 | 2 }) {
  return <GradientFill from={variant === 1 ? colors.burgundy800 : colors.burgundy} to={colors.burgundy600} />;
}

// A fixed star field: same positions on every screen, no twinkle.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const STARS = (() => {
  const rand = seeded(20260926);
  return Array.from({ length: 46 }, () => ({
    x: rand(),
    y: rand(),
    r: rand() < 0.7 ? 0.5 : 1,
    o: 0.18 + rand() * 0.5,
  }));
})();

/** The app's night background: plum glow at the top over a sparse star field. */
export function NightBackground() {
  const { width, height } = useWindowDimensions();
  const id = svgId(useId());
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.night }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={`g${id}`} cx="50%" cy="0%" rx="90%" ry="42%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={colors.burgundy500} stopOpacity={0.45} />
            <Stop offset="1" stopColor={colors.burgundy500} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill={`url(#g${id})`} />
        {STARS.map((s, i) => (
          <Circle key={i} cx={s.x * width} cy={s.y * height} r={s.r} fill={colors.paleCream} opacity={s.o} />
        ))}
      </Svg>
    </View>
  );
}
