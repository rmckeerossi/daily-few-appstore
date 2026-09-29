import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, type } from '@/theme/tokens';

/**
 * Bottom sheet: pale cream, rounded top, grabber, over a plum veil.
 * Tapping the veil closes it. Sheets are the one light surface in the app.
 */
export function Sheet({ open, onClose, title, description, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.fill}>
        <Pressable style={styles.veil} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
          <View style={styles.grabber} />
          <Text style={[type.sheetTitle, { color: colors.burgundy }]} accessibilityRole="header">
            {title}
          </Text>
          {description ? <Text style={[type.body, { color: colors.burgundy600 }]}>{description}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** A tappable option row inside a sheet: dark icon disc, title and one line. */
export function SheetOption({ icon, title, body, onPress }: {
  icon: ReactNode;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && { backgroundColor: 'rgba(76,28,49,0.07)' }]}>
      <View style={styles.optionIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 21, lineHeight: 24, color: colors.burgundy }}>{title}</Text>
        <Text style={[type.bodySm, { color: colors.burgundy600, marginTop: 2 }]}>{body}</Text>
      </View>
    </Pressable>
  );
}

/** Buttons for light sheets. */
export function SheetButton({ label, onPress, variant = 'primary' }: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
}) {
  const border = variant === 'destructive' ? colors.error : colors.burgundy;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary'
          ? { backgroundColor: pressed ? colors.burgundy600 : colors.burgundy }
          : { borderWidth: 1, borderColor: border, backgroundColor: pressed ? 'rgba(76,28,49,0.06)' : 'transparent' },
      ]}>
      <Text style={[type.buttonLg, { color: variant === 'primary' ? colors.paleCream : border }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  veil: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(40,14,26,0.55)' },
  sheet: {
    backgroundColor: colors.paleCream,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 14,
    paddingHorizontal: 24,
    gap: 18,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.cream300 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(76,28,49,0.15)',
    backgroundColor: 'rgba(76,28,49,0.03)',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: { height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
