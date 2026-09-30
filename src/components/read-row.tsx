import { router } from 'expo-router';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ReadSummary } from '@/lib/reads';
import { colors, fonts, radius, type } from '@/theme/tokens';

/** A short read in a list: title, one line, reading time. */
export function ReadRow({ read, label }: { read: ReadSummary; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${read.title}. ${read.minutes} minute read.`}
      onPress={() => router.push({ pathname: '/read/[id]', params: { id: read.id } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceHover }]}>
      <View style={styles.icon}>
        <BookOpen size={18} color={colors.lilac} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[type.labelSm, { color: colors.lilac }]}>
          {label ?? 'Short read'} · {read.minutes} min
        </Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 21, lineHeight: 25, color: colors.textPrimary }}>{read.title}</Text>
        {read.summary ? (
          <Text style={[type.bodySm, { color: colors.textSecondary }]} numberOfLines={2}>
            {read.summary}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={colors.textTertiary} strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.category,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lilacTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
