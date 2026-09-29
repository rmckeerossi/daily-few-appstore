import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { QuestionCard } from '@/components/question-card';
import { Screen } from '@/components/screen';
import { BodyLight } from '@/components/text';
import { colors, fonts, type } from '@/theme/tokens';

const wordmark = require('@/assets/images/brand/logo-white.png');

/** Welcome: the one call to action is "Start with me" (PRD §4.11). */
export default function Welcome() {
  return (
    <Screen gutter={24} gap={32} contentStyle={{ flexGrow: 1 }}>
      <Image source={wordmark} style={styles.wordmark} contentFit="contain" accessibilityLabel="Daily Few" />

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
  actions: { gap: 20, alignItems: 'center', marginTop: 'auto' },
});
