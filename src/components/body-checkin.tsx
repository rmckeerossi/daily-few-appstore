import { Check, Droplet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCheckIn, METRICS, saveCheckIn, type CheckIn, type MetricKey } from '@/lib/body';
import { colors, radius, type } from '@/theme/tokens';

import { PrimaryButton, TextButton } from './buttons';
import { Eyebrow } from './text';
import { useToast } from './toast';

type Values = Omit<CheckIn, 'day'>;

const EMPTY: Values = { energy: null, mood: null, sleep: null, stress: null, cravings: null, period: false };

/** Five taps and done: how the body feels today. Every rating is optional. */
export function BodyCheckIn() {
  const toast = useToast();
  const [values, setValues] = useState<Values>(EMPTY);
  const [saved, setSaved] = useState<Values | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCheckIn().then(
      (c) => {
        if (c) {
          const { day: _day, ...v } = c;
          setValues(v);
          setSaved(v);
        }
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, []);

  if (!loaded) return null;

  const set = (key: MetricKey, n: number) => setValues((v) => ({ ...v, [key]: v[key] === n ? null : n }));
  const anything = METRICS.some((m) => values[m.key] != null) || values.period;

  const save = async () => {
    setSaving(true);
    try {
      await saveCheckIn(values);
      setSaved(values);
      setEditing(false);
      toast('Checked in for today.');
    } catch {
      toast('That didn’t save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // Done for today: a quiet summary, tap to change.
  if (saved && !editing) {
    const logged = METRICS.filter((m) => saved[m.key] != null);
    return (
      <View style={{ gap: 14 }}>
        <Eyebrow>Your body today</Eyebrow>
        <View style={[styles.card, { gap: 12 }]}>
          <View style={styles.doneRow}>
            <Check size={16} color={colors.lilac} strokeWidth={1.8} />
            <Text style={[type.body, { color: colors.textPrimary, flex: 1 }]}>Checked in</Text>
            <TextButton label="Change" color={colors.lilac} onPress={() => setEditing(true)} />
          </View>
          <View style={styles.summary}>
            {logged.map((m) => (
              <View key={m.key} style={styles.pill}>
                <Text style={[type.labelSm, { color: colors.textSecondary }]}>{m.label}</Text>
                <Text style={[type.data, { color: colors.lilac }]}>{saved[m.key]}/5</Text>
              </View>
            ))}
            {saved.period ? (
              <View style={styles.pill}>
                <Droplet size={12} color={colors.lilac} strokeWidth={1.8} />
                <Text style={[type.labelSm, { color: colors.textSecondary }]}>Period</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Eyebrow>How’s your body today?</Eyebrow>
      <View style={[styles.card, { gap: 18 }]}>
        {METRICS.map((m) => (
          <View key={m.key} style={{ gap: 8 }}>
            <View style={styles.labelRow}>
              <Text style={[type.body, { color: colors.textPrimary }]}>{m.label}</Text>
              <Text style={[type.caption, { color: colors.textTertiary }]}>
                {m.low} · {m.high}
              </Text>
            </View>
            <View style={styles.dots} accessibilityRole="adjustable" accessibilityLabel={`${m.label}, ${values[m.key] ?? 'not set'} of 5`}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = values[m.key] != null && n <= (values[m.key] as number);
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`${m.label} ${n} of 5`}
                    accessibilityState={{ selected: values[m.key] === n }}
                    hitSlop={6}
                    onPress={() => set(m.key, n)}
                    style={[styles.dot, on && styles.dotOn]}
                  />
                );
              })}
            </View>
          </View>
        ))}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: values.period }}
          onPress={() => setValues((v) => ({ ...v, period: !v.period }))}
          style={[styles.periodChip, values.period && styles.periodOn]}>
          <Droplet size={16} color={values.period ? colors.burgundy : colors.textSecondary} strokeWidth={1.6} />
          <Text style={[type.bodySm, { color: values.period ? colors.burgundy : colors.textPrimary }]}>Period today</Text>
        </Pressable>

        <View style={{ gap: 8 }}>
          <PrimaryButton label="Check in" size="md" onPress={save} disabled={!anything} loading={saving} />
          <Text style={[type.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
            Private to you. Patterns show up in your monthly recap.
          </Text>
        </View>
        {editing ? (
          <View style={{ alignItems: 'center' }}>
            <TextButton label="Cancel" onPress={() => { setValues(saved ?? EMPTY); setEditing(false); }} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  dot: {
    flex: 1,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(254,252,242,0.24)',
  },
  dotOn: { backgroundColor: colors.lilac, borderColor: colors.lilac },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(254,252,242,0.24)',
  },
  periodOn: { backgroundColor: colors.lilac, borderColor: colors.lilac },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.lilacTint,
  },
});
