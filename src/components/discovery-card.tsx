import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Activity, BookOpen, CalendarDays, Droplet, Moon, Sparkles, Sun, Wind, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Discovery, DiscoveryTopic } from '@/lib/body';

import { CardGradient } from './gradients';
import { colors, fonts, type } from '@/theme/tokens';

/** Each topic is shown by a small icon and label; every card uses the app's own card style. */
const TOPICS: Record<DiscoveryTopic, { label: string; icon: LucideIcon }> = {
  cycle: { label: 'Your cycle', icon: Droplet },
  'energy-sleep': { label: 'Energy and sleep', icon: Moon },
  stress: { label: 'Stress', icon: Wind },
  helps: { label: 'What helps you', icon: Sun },
  signals: { label: 'Body signals', icon: Activity },
  rhythm: { label: 'Your rhythm', icon: CalendarDays },
};

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce, () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
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
        <CardGradient />
        {isNew && !reduceMotion ? <Shimmer /> : null}
        <View style={styles.topRow}>
          <View style={styles.tag}>
            <Icon size={13} color={colors.lilac} strokeWidth={1.7} />
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
  tagText: { color: colors.lilac, textTransform: 'uppercase', letterSpacing: 1.4 },
  newTag: { backgroundColor: colors.red, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  text: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.paleCream },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto' },
});
