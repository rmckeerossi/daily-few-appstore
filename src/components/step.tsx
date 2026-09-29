import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { goBack } from '@/lib/nav';
import { colors, type } from '@/theme/tokens';

import { RoundIconButton } from './buttons';
import { Screen } from './screen';
import { BodyLight, Eyebrow } from './text';

/** Shared frame for the three signup steps and the email code screen. */
export function StepScreen({ step, title, subtitle, children }: {
  step?: string;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Screen withTopBar keyboard gutter={24} gap={28}>
      <View style={styles.topBar}>
        <RoundIconButton icon={ChevronLeft} size={40} accessibilityLabel="Back" onPress={() => goBack()} />
        {step ? <Eyebrow>{step}</Eyebrow> : null}
        <View style={{ width: 40 }} />
      </View>
      <View style={{ gap: 14 }}>
        <Text style={[type.displayL, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? <BodyLight>{subtitle}</BodyLight> : null}
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
