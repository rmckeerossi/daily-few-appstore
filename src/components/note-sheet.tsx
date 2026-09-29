import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { saveNote } from '@/lib/data';
import { colors, fonts, radius } from '@/theme/tokens';

import { Sheet, SheetButton } from './sheet';
import { useToast } from './toast';

/**
 * The month's closing reflection (the monthly note): one per month, editable
 * any time. `month` is null when closed; the sheet remounts per open (give it
 * a `key`) so it always starts from what's saved.
 */
export function NoteSheet({ month, onClose, onSaved }: {
  month: { start: string; label: string; body: string | null } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [text, setText] = useState(month?.body ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!month) return;
    setSaving(true);
    try {
      await saveNote(month.start, text);
      toast('Reflection saved.');
      onSaved();
      onClose();
    } catch {
      toast('That didn’t save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={!!month}
      onClose={onClose}
      title="Your closing reflection"
      description={
        month
          ? `Look back on the whole of ${month.label}: what it held, what it asked of you, and what you’re leaving behind.`
          : undefined
      }>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Looking back on the whole month…"
        placeholderTextColor={colors.cream500}
        multiline
        textAlignVertical="top"
        accessibilityLabel="Your closing reflection"
        style={styles.input}
      />
      <SheetButton label={saving ? 'Saving…' : 'Save reflection'} onPress={save} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.input,
    padding: 12,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.burgundy,
  },
});
