import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '@/theme/tokens';

import { NightBackground } from './gradients';

/** Height the bottom nav takes, so scrolling content clears it. */
export const NAV_CLEARANCE = 124;

type ScreenProps = {
  children: ReactNode;
  /** Leaves room for the bottom nav. */
  withNav?: boolean;
  /** Screens with a back/close button sit a little higher (58 vs 64). */
  withTopBar?: boolean;
  gutter?: number;
  gap?: number;
  scroll?: boolean;
  keyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/** The standard scaffold: night background, safe areas, one scrolling column. */
export function Screen({
  children,
  withNav = false,
  withTopBar = false,
  gutter = space.gutter,
  gap = space.section,
  scroll = true,
  keyboard = false,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + (withTopBar ? 8 : 14),
    paddingBottom: withNav ? NAV_CLEARANCE : insets.bottom + 32,
    paddingHorizontal: gutter,
    gap,
  };

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padding, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.fill}>
      <NightBackground />
      {keyboard ? (
        <KeyboardAvoidingView style={styles.fill} behavior="padding">
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
