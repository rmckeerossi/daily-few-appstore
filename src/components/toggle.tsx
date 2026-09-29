import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/theme/tokens';

/** Switch: 46×28 track, 22 knob. On = lilac track, burgundy knob. */
export function Toggle({ value, onChange, disabled, accessibilityLabel }: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => onChange(!value)}
      style={[styles.track, { backgroundColor: value ? colors.lilac : 'rgba(254,252,242,0.18)', opacity: disabled ? 0.45 : 1 }]}>
      <View
        style={[
          styles.knob,
          { backgroundColor: value ? colors.burgundy : colors.paleCream, transform: [{ translateX: value ? 18 : 0 }] },
        ]}
      />
    </Pressable>
  );
}

/** A settings row: label + description on the left, switch on the right. */
export function ToggleRow({ label, description, value, onChange, disabled, children }: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[type.body, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[type.caption, { color: colors.textSecondary }]}>{description}</Text>
        </View>
        <Toggle value={value} onChange={onChange} disabled={disabled} accessibilityLabel={label} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11 },
  row: { gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
