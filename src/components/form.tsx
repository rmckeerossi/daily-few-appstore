import { Check } from 'lucide-react-native';
import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius, type } from '@/theme/tokens';

import { Eyebrow } from './text';

type FieldProps = TextInputProps & { label: string; error?: string | null; hint?: string };

export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, error, hint, style, ...input }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Eyebrow>{label}</Eyebrow>
      <TextInput
        ref={ref}
        placeholderTextColor="rgba(254,252,242,0.38)"
        selectionColor={colors.lilac}
        keyboardAppearance="dark"
        {...input}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? { borderColor: colors.errorOnDark } : null,
          style,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

/** Looks like a Field but opens something (e.g. the date picker) when tapped. */
export function FieldButton({ label, value, placeholder, onPress, error }: {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  error?: string | null;
}) {
  return (
    <View style={styles.field}>
      <Eyebrow>{label}</Eyebrow>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        onPress={onPress}
        style={[styles.input, styles.fieldButton, error ? { borderColor: colors.errorOnDark } : null]}>
        <Text style={[styles.inputText, !value && { color: 'rgba(254,252,242,0.38)' }]}>{value ?? placeholder}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : null]}>
      <Text style={[type.bodySm, { color: selected ? colors.burgundy : colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function Checkbox({ checked, onChange, children, disabled }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.checkRow, disabled && { opacity: 0.45 }]}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Check size={14} color={colors.burgundy} strokeWidth={2} /> : null}
      </View>
      <Text style={[type.body, { color: colors.textPrimary, flex: 1 }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 12 },
  input: {
    height: 48,
    borderRadius: radius.input,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.lilac,
    boxShadow: '0 0 0 3px rgba(209,219,255,0.22)',
  },
  fieldButton: { justifyContent: 'center' },
  inputText: { fontFamily: fonts.sans, fontSize: 16, color: colors.textPrimary },
  error: { ...type.caption, color: colors.errorOnDark },
  hint: { ...type.caption, color: colors.textTertiary },
  chip: {
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(254,252,242,0.24)',
  },
  chipSelected: { backgroundColor: colors.lilac, borderColor: colors.lilac },
  checkRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  box: {
    width: 20,
    height: 20,
    marginTop: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(254,252,242,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.lilac, borderColor: colors.lilac },
});
