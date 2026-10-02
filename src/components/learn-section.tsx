import { router } from 'expo-router';
import { BookOpen, Check, Globe, Landmark, X } from 'lucide-react-native';
import { useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { saveGuess, todaysGuess, todaysLearning, type FactOrFiction } from '@/lib/learn';
import { colors, fonts, radius, type } from '@/theme/tokens';

import { OutlineButton } from './buttons';
import { Caption, Eyebrow } from './text';

const SWIPE = 110;

/** Home's "Learn something": today's fact or fiction, a tradition, and weird history. */
export function LearnSection({ day }: { day: string }) {
  const { fact, tradition, history } = todaysLearning(day);
  return (
    <View style={{ gap: 14 }}>
      <Eyebrow>Learn something</Eyebrow>
      <FactOrFictionCard key={day} day={day} item={fact} />

      <View style={styles.card}>
        <View style={styles.tagRow}>
          <Globe size={14} color={colors.lilac} strokeWidth={1.6} />
          <Text style={styles.tag}>Around the world · {tradition.place}</Text>
        </View>
        <Text style={styles.title}>{tradition.name}</Text>
        <Text style={[type.body, { color: colors.textSecondary }]}>{tradition.about}</Text>
        <View style={styles.tryIt}>
          <Text style={[type.labelSm, { color: colors.lilac, textTransform: 'uppercase', letterSpacing: 1.4 }]}>Try it tonight</Text>
          <Text style={[type.body, { color: colors.textPrimary }]}>{tradition.tryIt}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.tagRow}>
          <Landmark size={14} color={colors.lilac} strokeWidth={1.6} />
          <Text style={styles.tag}>Weird history</Text>
        </View>
        <Text style={styles.title}>{history.title}</Text>
        <Text style={[type.body, { color: colors.textSecondary }]}>{history.story}</Text>
        <Caption>{history.source}</Caption>
      </View>
    </View>
  );
}

/**
 * Swipe right for fact, left for fiction (or tap the buttons). The answer
 * stays revealed for the rest of the day.
 */
function FactOrFictionCard({ day, item }: { day: string; item: FactOrFiction }) {
  const [guess, setGuess] = useState<boolean | null>(() => todaysGuess(day));
  const [x] = useState(() => new Animated.Value(0));
  const answer = (fact: boolean) => {
    saveGuess(day, fact);
    setGuess(fact);
  };

  // `day` never changes for this card (Home keys it by day), and setGuess is stable.
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => x.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > SWIPE) {
          const fact = g.dx > 0;
          Animated.timing(x, { toValue: fact ? 420 : -420, duration: 180, useNativeDriver: true }).start(() => {
            saveGuess(day, fact);
            setGuess(fact);
            x.setValue(0);
          });
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );

  if (guess !== null) {
    const right = guess === item.fact;
    return (
      <View style={styles.card}>
        <View style={styles.tagRow}>
          {right ? <Check size={14} color={colors.lilac} strokeWidth={2} /> : <X size={14} color={colors.lilac} strokeWidth={2} />}
          <Text style={styles.tag}>{right ? 'You got it' : 'Not quite'}</Text>
        </View>
        <Text style={[type.bodySm, { color: colors.textTertiary }]}>“{item.statement}”</Text>
        <Text style={styles.verdict}>{item.fact ? 'Fact.' : 'Fiction.'}</Text>
        <Text style={[type.body, { color: colors.textPrimary }]}>{item.truth}</Text>
        {item.read ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/read/[id]', params: { id: item.read! } })}
            style={styles.readLink}>
            <BookOpen size={14} color={colors.lilac} strokeWidth={1.5} />
            <Text style={[type.labelSm, { color: colors.lilac }]}>Read more · 2 min</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const rotate = x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-10deg', '0deg', '10deg'] });
  const factHint = x.interpolate({ inputRange: [0, SWIPE], outputRange: [0, 1], extrapolate: 'clamp' });
  const fictionHint = x.interpolate({ inputRange: [-SWIPE, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Animated.View {...pan.panHandlers} style={[styles.card, { transform: [{ translateX: x }, { rotate }] }]}>
      <View style={styles.tagRow}>
        <Text style={styles.tag}>Fact or fiction?</Text>
      </View>
      <Text style={styles.statement}>{item.statement}</Text>
      <Caption>Swipe right for fact, left for fiction.</Caption>
      <View style={styles.buttons}>
        <OutlineButton label="Fiction" onPress={() => answer(false)} style={{ flex: 1 }} />
        <OutlineButton label="Fact" onPress={() => answer(true)} style={{ flex: 1 }} />
      </View>
      <Animated.Text style={[styles.stamp, styles.stampFact, { opacity: factHint }]}>Fact</Animated.Text>
      <Animated.Text style={[styles.stamp, styles.stampFiction, { opacity: fictionHint }]}>Fiction</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 18,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { ...type.labelSm, color: colors.lilac, textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.textPrimary },
  statement: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, color: colors.textPrimary },
  verdict: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.textPrimary },
  tryIt: { gap: 6, padding: 14, borderRadius: radius.row, backgroundColor: colors.lilacTint },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  readLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stamp: {
    position: 'absolute',
    top: 16,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.lilac,
    borderWidth: 1.5,
    borderColor: colors.lilac,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  stampFact: { right: 16 },
  stampFiction: { right: 16 },
});
