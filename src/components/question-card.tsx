import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, type } from '@/theme/tokens';

import { BrandGradient, CardBackGradient, CardGradient } from './gradients';

const submark = require('@/assets/images/brand/submark-white.png');

type Props = {
  question: string;
  /** Label at the top of the card (category) and at the bottom (deck · category). */
  topLabel?: string;
  bottomLabel?: string;
  height?: number;
  questionSize?: number;
  style?: StyleProp<ViewStyle>;
};

/** The core object: a question on the brand gradient card. */
export function QuestionCard({ question, topLabel, bottomLabel, height = 300, questionSize = 32, style }: Props) {
  return (
    <View style={[styles.card, { height }, style]}>
      <CardGradient />
      <View style={styles.row}>
        {topLabel ? (
          <Text style={styles.label} numberOfLines={1}>
            {topLabel}
          </Text>
        ) : (
          <Image source={submark} style={styles.submark} contentFit="contain" />
        )}
      </View>
      <Text
        style={[type.cardQuestion, styles.question, { fontSize: questionSize, lineHeight: questionSize * 1.12 }]}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {question}
      </Text>
      <View style={styles.row}>
        {bottomLabel ? (
          <Text style={styles.label} numberOfLines={1}>
            {bottomLabel}
          </Text>
        ) : topLabel ? (
          <Image source={submark} style={styles.submark} contentFit="contain" />
        ) : null}
      </View>
    </View>
  );
}

/** The Draw stage: two tilted cards behind the front card. */
export function CardStack({ children, height = 392 }: { children: React.ReactNode; height?: number }) {
  return (
    <View style={{ height, justifyContent: 'center' }}>
      <View style={[styles.back, { height: height - 20, transform: [{ rotate: '-5deg' }] }]}>
        <CardBackGradient variant={1} />
      </View>
      <View style={[styles.back, { height: height - 30, transform: [{ rotate: '4deg' }, { translateY: 18 }] }]}>
        <CardBackGradient variant={2} />
      </View>
      {children}
    </View>
  );
}

/** Smaller panel used at the top of the Answer screen. */
export function QuestionPanel({ question, label }: { question: string; label: string }) {
  return (
    <View style={styles.panel}>
      <BrandGradient />
      <Text style={[type.label, { color: 'rgba(254,252,242,0.8)' }]}>{label}</Text>
      <Text style={[type.cardQuestion, { color: colors.paleCream, fontSize: 27, lineHeight: 31 }]}>{question}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.questionCard,
    borderWidth: 1,
    borderColor: 'rgba(209,219,255,0.32)',
    padding: 26,
    overflow: 'hidden',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
  },
  row: { height: 20, justifyContent: 'center', alignItems: 'center' },
  label: { ...type.labelSm, letterSpacing: 1.8, color: 'rgba(254,252,242,0.82)' },
  submark: { width: 26, height: 18, opacity: 0.85 },
  question: { color: colors.paleCream, textAlign: 'center' },
  back: {
    position: 'absolute',
    left: 6,
    right: 6,
    borderRadius: radius.questionCard,
    borderWidth: 1,
    borderColor: 'rgba(209,219,255,0.18)',
    overflow: 'hidden',
  },
  panel: {
    borderRadius: 22,
    padding: 22,
    gap: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(209,219,255,0.24)',
  },
});
