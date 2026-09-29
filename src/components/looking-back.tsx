import { router } from 'expo-router';
import { History } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LookingBack } from '@/lib/data';
import { localDate, shortDate } from '@/lib/dates';

import { colors, fonts, radius, type } from '@/theme/tokens';

import { OutlineButton, PrimaryButton, TextButton } from './buttons';
import { Eyebrow } from './text';

const DISMISSED_KEY = 'looking-back-dismissed';

function dismissedToday(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === localDate();
  } catch {
    return false;
  }
}

/**
 * Home's "Looking back": a past answer to revisit. The old answer stays behind
 * a tap ("See what you said"), so the question can be met fresh first.
 */
export function LookingBackCard({ item, onOpenAnswer }: { item: LookingBack; onOpenAnswer: (id: string) => void }) {
  const [hidden, setHidden] = useState(dismissedToday);
  if (hidden) return null;

  const { answer, label } = item;

  const notToday = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, localDate());
    } catch {}
    setHidden(true);
  };

  return (
    <View style={{ gap: 14 }}>
      <Eyebrow>Looking back</Eyebrow>
      <View style={styles.card}>
        <View style={styles.meta}>
          <History size={14} color={colors.lilac} strokeWidth={1.5} />
          <Text style={[type.labelSm, { color: colors.lilac }]}>
            {label} · you answered on {shortDate(answer.answered_on)}
          </Text>
        </View>
        <Text style={styles.question}>{answer.question_text}</Text>
        <Text style={[type.bodySm, { color: colors.textSecondary }]}>
          Has your answer changed? Look back at what you said, or meet the question fresh.
        </Text>
        <View style={{ gap: 10 }}>
          <PrimaryButton
            label="Answer again"
            size="md"
            onPress={() => router.push({ pathname: '/answer', params: { card: answer.card_id } })}
          />
          <OutlineButton label="See what you said" onPress={() => onOpenAnswer(answer.id)} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <TextButton label="Not today" onPress={notToday} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
    padding: 20,
    borderRadius: radius.card,
    backgroundColor: colors.lilacTint,
    borderWidth: 1,
    borderColor: 'rgba(209,219,255,0.2)',
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  question: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.textPrimary },
});
