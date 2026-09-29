import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, type } from '@/theme/tokens';

type ButtonProps = {
  label: string;
  onPress: () => void;
  size?: 'lg' | 'md';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const tap = () => Haptics.selectionAsync().catch(() => {});

export function PrimaryButton({ label, onPress, size = 'lg', disabled, loading, style }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        { height: size === 'lg' ? 54 : 44 },
        {
          backgroundColor: disabled ? colors.cream300 : pressed ? colors.cream : colors.paleCream,
          transform: [{ translateY: pressed ? 1 : 0 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.burgundy} />
      ) : (
        <Text style={[size === 'lg' ? type.buttonLg : type.button, { color: disabled ? colors.cream500 : colors.burgundy }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function OutlineButton({ label, onPress, size = 'md', disabled, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        styles.outline,
        { height: size === 'lg' ? 54 : 44, backgroundColor: pressed ? colors.paleCream : 'transparent' },
        style,
      ]}>
      {({ pressed }) => (
        <Text style={[size === 'lg' ? type.buttonLg : type.button, { color: pressed ? colors.burgundy : colors.paleCream }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function TextButton({ label, onPress, color = colors.textSecondary }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Text style={[type.button, { color }]}>{label}</Text>
    </Pressable>
  );
}

type RoundProps = {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  size?: 54 | 40;
  disabled?: boolean;
};

export function RoundIconButton({ icon: Icon, accessibilityLabel, onPress, size = 54, disabled }: RoundProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.round,
        {
          width: size,
          height: size,
          backgroundColor: pressed ? colors.surfaceHover : size === 40 ? 'rgba(40,14,26,0.2)' : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}>
      <Icon size={size === 40 ? 18 : 20} color={colors.paleCream} strokeWidth={1.5} />
    </Pressable>
  );
}

/** Round icon with a mono caption underneath (Draw: Skip · Reflected · Share). */
export function LabeledRoundButton({ label, ...props }: RoundProps & { label: string }) {
  return (
    <View style={styles.labeled}>
      <RoundIconButton {...props} />
      <Text style={[type.labelSm, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, gap = 10, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  outline: {
    borderWidth: 1,
    borderColor: 'rgba(254,252,242,0.40)',
  },
  round: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labeled: {
    alignItems: 'center',
    gap: 10,
  },
});
