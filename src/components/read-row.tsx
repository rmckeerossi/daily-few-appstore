import { router } from 'expo-router';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { topicLabel, type ReadSummary } from '@/lib/reads';
import { colors, fonts, radius, type } from '@/theme/tokens';

const open = (id: string) => router.push({ pathname: '/read/[id]', params: { id } });

/** One slim line for a short read, used where the read is an extra (deck pages). */
export function ReadLink({ read }: { read: ReadSummary }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${read.title}. ${read.minutes} minute read.`}
      onPress={() => open(read.id)}
      style={({ pressed }) => [styles.link, pressed && { backgroundColor: colors.surfaceHover }]}>
      <BookOpen size={16} color={colors.lilac} strokeWidth={1.5} />
      <Text style={[type.bodySm, { flex: 1, color: colors.textPrimary }]} numberOfLines={1}>
        {read.title}
      </Text>
      <Text style={[type.labelSm, { color: colors.textTertiary }]}>{read.minutes} min</Text>
      <ChevronRight size={16} color={colors.textTertiary} strokeWidth={1.5} />
    </Pressable>
  );
}

/** A short read in a list: title, one line, reading time. */
export function ReadRow({ read, label }: { read: ReadSummary; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${read.title}. ${read.minutes} minute read.`}
      onPress={() => open(read.id)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceHover }]}>
      <View style={styles.icon}>
        <BookOpen size={18} color={colors.lilac} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[type.labelSm, { color: colors.lilac }]}>
          {label ?? topicLabel(read.topic) ?? 'Short read'} · {read.minutes} min
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
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.row,
    backgroundColor: colors.lilacTint,
  },
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
