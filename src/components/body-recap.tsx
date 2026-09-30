import { router } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { averages, describe, findPatterns, getCheckIns, METRICS, type CheckIn } from '@/lib/body';
import { addDays, localDate, parseLocalDate } from '@/lib/dates';
import { readsForPatterns, type ReadSummary } from '@/lib/reads';
import { colors, fonts, radius, type } from '@/theme/tokens';

import { Caption, Eyebrow } from './text';

const CHART_HEIGHT = 56;

/**
 * "Your body in September": averages, a day-by-day view of energy and mood with
 * period days marked, and patterns from their own check-ins. Hidden entirely
 * when they didn't check in that month.
 */
export function BodyRecap({ month, label }: { month: string; label: string }) {
  const [data, setData] = useState<{ month: CheckIn[]; recent: CheckIn[] } | null>(null);
  const [reads, setReads] = useState<Record<string, ReadSummary>>({});

  useEffect(() => {
    const start = parseLocalDate(`${month}-01`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    // Three months back, so cycle patterns have a few cycles to compare.
    const recentFrom = localDate(addDays(start, -62));
    getCheckIns(recentFrom, localDate(end)).then(
      (recent) => {
        const monthCheckIns = recent.filter((c) => c.day.startsWith(month));
        setData({ month: monthCheckIns, recent });
        const keys = [...new Set(findPatterns(monthCheckIns, recent).map((p) => p.key))];
        readsForPatterns(keys).then(setReads, () => {});
      },
      () => setData({ month: [], recent: [] }),
    );
  }, [month]);

  if (!data || data.month.length === 0) return null;

  const avgs = averages(data.month);
  const patterns = findPatterns(data.month, data.recent);
  const start = parseLocalDate(`${month}-01`);
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const byDay = new Map(data.month.map((c) => [Number(c.day.slice(8, 10)), c]));

  return (
    <View style={{ gap: 16 }}>
      <Eyebrow>Your body in {label}</Eyebrow>

      <View style={styles.tiles}>
        {METRICS.map((m) => (
          <View key={m.key} style={styles.tile}>
            <Text style={[type.labelSm, { color: colors.textTertiary }]}>{m.label}</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.textPrimary }}>
              {describe(m.key, avgs[m.key])}
            </Text>
          </View>
        ))}
      </View>

      {(['energy', 'mood'] as const).map((key) => (
        <View key={key} style={{ gap: 6 }}>
          <Text style={[type.labelSm, { color: colors.textSecondary }]}>{key === 'energy' ? 'Energy' : 'Mood'} by day</Text>
          <View style={styles.chart} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const c = byDay.get(i + 1);
              const v = c?.[key];
              return (
                <View key={i} style={styles.column}>
                  <View style={[styles.bar, { height: v ? (v / 5) * CHART_HEIGHT : 2, opacity: v ? 1 : 0.25 }]} />
                  <View style={[styles.periodMark, { opacity: c?.period ? 1 : 0 }]} />
                </View>
              );
            })}
          </View>
        </View>
      ))}
      <Caption>Lilac marks under the bars are period days.</Caption>

      <View style={{ gap: 10 }}>
        {patterns.length ? (
          patterns.map((p) => (
            <View key={p.text} style={styles.pattern}>
              <Text style={[type.body, { color: colors.textPrimary }]}>{p.text}</Text>
              {reads[p.key] ? (
                <Pressable
                  accessibilityRole="link"
                  hitSlop={8}
                  onPress={() => router.push({ pathname: '/read/[id]', params: { id: reads[p.key].id } })}
                  style={styles.why}>
                  <BookOpen size={14} color={colors.lilac} strokeWidth={1.5} />
                  <Text style={[type.labelSm, { color: colors.lilac }]}>Why this happens · {reads[p.key].minutes} min</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        ) : (
          <Caption>Check in on a few more days and patterns will start to show here.</Caption>
        )}
        <Caption>For reflection, not medical advice. Worth mentioning to your doctor if something stands out.</Caption>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: CHART_HEIGHT + 8 },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  bar: { width: '100%', borderRadius: 2, backgroundColor: colors.lilac },
  periodMark: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lilac },
  why: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  pattern: {
    padding: 14,
    borderRadius: radius.row,
    backgroundColor: colors.lilacTint,
  },
});
