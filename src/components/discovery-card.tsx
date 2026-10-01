import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Activity, BookOpen, CalendarDays, Droplet, Moon, Sparkles, Sun, Wind, type LucideIcon } from 'lucide-react-native';
import { useEffect, useId, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinear, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Discovery, DiscoveryTopic } from '@/lib/body';
import { colors, fonts, type } from '@/theme/tokens';

/**
 * Each topic has its own colours on a dark base, so a collection looks varied:
 * two glows per topic, and each card's glow comes from a different corner,
 * picked from its key, so cards of the same topic never look like copies.
 */
const TOPICS: Record<DiscoveryTopic, { label: string; icon: LucideIcon; glows: [string, string]; mid: string; dark: string }> = {
  cycle: { label: 'Your cycle', icon: Droplet, glows: [colors.red, '#F28C9B'], mid: '#8A365A', dark: '#3A1526' },
  'energy-sleep': { label: 'Energy and sleep', icon: Moon, glows: [colors.lilac, '#A9B4F5'], mid: '#5E5FA0', dark: '#241632' },
  stress: { label: 'Stress', icon: Wind, glows: ['#B9CDB4', '#9FC3BE'], mid: '#5F7470', dark: '#22181F' },
  helps: { label: 'What helps you', icon: Sun, glows: ['#F2B48C', '#F6CF8E'], mid: '#B0606A', dark: '#3A1526' },
  signals: { label: 'Body signals', icon: Activity, glows: ['#E9A3C4', '#D7A6E8'], mid: '#7E3F6E', dark: '#2C1428' },
  rhythm: { label: 'Your rhythm', icon: CalendarDays, glows: ['#E9C98B', '#EFB27A'], mid: '#8A5A3E', dark: '#2E1A1A' },
};

const CORNERS = [
  { cx: '0%', cy: '0%' },
  { cx: '100%', cy: '0%' },
  { cx: '100%', cy: '100%' },
  { cx: '0%', cy: '100%' },
];

/** A small stable number from a string, so a card always gets the same look. */
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce, () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

function TopicGlow({ topic, seed }: { topic: DiscoveryTopic; seed: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const t = TOPICS[topic];
  const h = hash(seed);
  const glow = t.glows[h % 2];
  const { cx, cy } = CORNERS[Math.floor(h / 2) % CORNERS.length];
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <SvgLinear id={`l${id}`} x1={cx === '0%' ? '0' : '1'} y1={cy === '0%' ? '0' : '1'} x2={cx === '0%' ? '1' : '0'} y2={cy === '0%' ? '1' : '0'}>
          <Stop offset="0" stopColor={t.mid} />
          <Stop offset="1" stopColor={t.dark} />
        </SvgLinear>
        <RadialGradient id={`r${id}`} cx={cx} cy={cy} rx="110%" ry="85%" fx={cx} fy={cy}>
          <Stop offset="0" stopColor={glow} stopOpacity={0.9} />
          <Stop offset="1" stopColor={glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#l${id})`} />
      <Rect width="100%" height="100%" fill={`url(#r${id})`} />
    </Svg>
  );
}

/** A slow sheen across new cards. Off when the person has Reduce Motion on. */
function Shimmer() {
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1300),
        Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-320, 420] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX }, { rotate: '20deg' }] }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: 120, height: '200%', marginTop: '-50%' }}
      />
    </Animated.View>
  );
}

/**
 * One discovery: something they've learned about their body, with their own
 * evidence. New ones shimmer and carry a red NEW tag; `reveal` flips the card
 * over the first time it's shown (the digest's "You found something new").
 */
export function DiscoveryCard({ discovery, isNew = false, reveal = false }: { discovery: Discovery; isNew?: boolean; reveal?: boolean }) {
  const t = TOPICS[discovery.topic];
  const Icon = t.icon;
  const reduceMotion = useReduceMotion();
  const [flip] = useState(() => new Animated.Value(reveal ? 0 : 1));

  useEffect(() => {
    if (!reveal) return;
    Animated.timing(flip, {
      toValue: 1,
      duration: reduceMotion ? 0 : 700,
      delay: reduceMotion ? 0 : 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [flip, reveal, reduceMotion]);

  const rotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] });
  const opacity = flip.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] });
  const read = discovery.read;

  return (
    <Animated.View style={{ opacity, transform: [{ perspective: 900 }, { rotateY }] }}>
      <Pressable
        accessibilityRole={read ? 'link' : 'text'}
        accessibilityLabel={`${isNew ? 'New discovery. ' : ''}${t.label}. ${discovery.text} ${discovery.evidence}.`}
        disabled={!read}
        onPress={() => read && router.push({ pathname: '/read/[id]', params: { id: read } })}
        style={styles.card}>
        <TopicGlow topic={discovery.topic} seed={discovery.key} />
        {isNew && !reduceMotion ? <Shimmer /> : null}
        <View style={styles.topRow}>
          <View style={styles.tag}>
            <Icon size={13} color={colors.paleCream} strokeWidth={1.7} />
            <Text style={[type.labelSm, styles.tagText]}>{t.label}</Text>
          </View>
          {isNew ? (
            <View style={styles.newTag}>
              <Text style={[type.labelSm, { color: colors.paleCream, letterSpacing: 1 }]}>New</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.text}>{discovery.text}</Text>
        <Text style={[type.caption, { color: 'rgba(254,252,242,0.8)' }]}>{discovery.evidence}</Text>
        <View style={styles.link}>
          {read ? (
            <>
              <BookOpen size={13} color={colors.paleCream} strokeWidth={1.5} />
              <Text style={[type.labelSm, { color: colors.paleCream }]}>Why this happens · 2 min</Text>
            </>
          ) : discovery.topic === 'helps' ? (
            <>
              <Sparkles size={13} color={colors.paleCream} strokeWidth={1.5} />
              <Text style={[type.labelSm, { color: colors.paleCream }]}>Keep doing this</Text>
            </>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    gap: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(254,252,242,0.18)',
    minHeight: 190,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagText: { color: 'rgba(254,252,242,0.85)', textTransform: 'uppercase', letterSpacing: 1.4 },
  newTag: { backgroundColor: colors.red, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  text: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.paleCream },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto' },
});
