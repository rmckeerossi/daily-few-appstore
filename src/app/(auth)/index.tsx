import { Image } from 'expo-image';
import { router } from 'expo-router';
import { MailOpen } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { QuestionCard } from '@/components/question-card';
import { Screen } from '@/components/screen';
import { BodyLight } from '@/components/text';
import { takeTooYoung } from '@/lib/apple';
import { pendingSharedCard } from '@/lib/links';
import { colors, fonts, type } from '@/theme/tokens';

const wordmark = require('@/assets/images/brand/logo-white.png');

/** Welcome: the one call to action is "Start with me" (PRD §4.11). */
export default function Welcome() {
  // An Apple signup that turned out to be under 18 lands on the gate.
  useEffect(() => {
    if (takeTooYoung()) router.push('/too-young');
  }, []);

  return (
    <Screen gutter={24} gap={32} contentStyle={{ flexGrow: 1 }}>
      <Image source={wordmark} style={styles.wordmark} contentFit="contain" accessibilityLabel="Daily Few" />

      {pendingSharedCard() ? (
        <View style={styles.banner}>
          <MailOpen size={18} color={colors.lilac} strokeWidth={1.5} />
          <Text style={[type.bodySm, { color: colors.textPrimary, flex: 1 }]}>
            Sign up and we’ll open the card you were sent.
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 16 }}>
        <Text style={[type.displayL, { color: colors.textPrimary }]}>
          When’s the last time someone{' '}
          <Text style={{ fontFamily: fonts.displayLightItalic }}>asked about you?</Text>
        </Text>
        <BodyLight>Pull a card, answer privately, and look back month by month.</BodyLight>
      </View>

      <QuestionCard
        question="What are you still holding that was never yours to carry?"
        bottomLabel="Somewhere in between"
        height={260}
        questionSize={28}
      />

      <View style={styles.actions}>
        <PrimaryButton label="Start with me" onPress={() => router.push('/name')} style={{ alignSelf: 'stretch' }} />
        <TextButton label="I already have an account" onPress={() => router.push('/sign-in')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wordmark: { width: 63, height: 20 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(209,219,255,0.12)',
  },
  actions: { gap: 20, alignItems: 'center', marginTop: 'auto' },
});
