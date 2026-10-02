import { router } from 'expo-router';
import { AudioWaveform, Balloon, BookOpen, Check, CloudFog, Droplet, Flame, HeartPulse, Plus, Sparkles, Zap, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCheckIn, METRICS, saveCheckIn, SYMPTOMS, type CheckIn, type MetricKey, type SymptomKey } from '@/lib/body';
import { colors, radius, type } from '@/theme/tokens';

import { PrimaryButton, TextButton } from './buttons';
import { Eyebrow } from './text';
import { useToast } from './toast';

type Values = Omit<CheckIn, 'day'>;

const EMPTY: Values = { energy: null, mood: null, sleep: null, stress: null, cravings: null, period: false, symptoms: [] };

export const SYMPTOM_ICONS: Record<SymptomKey, LucideIcon> = {
  headache: Zap,
  bloating: Balloon,
  aches: AudioWaveform,
  'brain-fog': CloudFog,
  anxious: HeartPulse,
  'hot-flashes': Flame,
  skin: Sparkles,
};

/**
 * Five taps and done: how the body feels today. Every rating is optional.
 * `day` is today's date; Home remounts this with a new key each day, so every
 * day starts with a fresh check-in.
 */
export function BodyCheckIn({ day }: { day: string }) {
  const toast = useToast();
  const [values, setValues] = useState<Values>(EMPTY);
  const [saved, setSaved] = useState<Values | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [lastTapped, setLastTapped] = useState<SymptomKey | null>(null);

  useEffect(() => {
    getCheckIn(day).then(
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
  }, [day]);

  if (!loaded) return null;

  const set = (key: MetricKey, n: number) => setValues((v) => ({ ...v, [key]: v[key] === n ? null : n }));
  const anything = METRICS.some((m) => values[m.key] != null) || values.period || values.symptoms.length > 0;

  const toggleSymptom = (key: SymptomKey) => {
    const on = !values.symptoms.includes(key);
    setValues((v) => ({ ...v, symptoms: on ? [...v.symptoms, key] : v.symptoms.filter((x) => x !== key) }));
    setLastTapped(on ? key : null);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveCheckIn(values, day);
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
                <Text style={[type.labelSm, { color: colors.lilac }]}>{m.steps[(saved[m.key] as number) - 1]}</Text>
              </View>
            ))}
            {SYMPTOMS.filter((sy) => saved.symptoms.includes(sy.key)).map((sy) => {
              const Icon = SYMPTOM_ICONS[sy.key];
              return (
                <View key={sy.key} style={styles.pill}>
                  <Icon size={12} color={colors.lilac} strokeWidth={1.8} />
                  <Text style={[type.labelSm, { color: colors.textSecondary }]}>{sy.label}</Text>
                </View>
              );
            })}
            {saved.period ? (
              <View style={styles.pill}>
                <Droplet size={12} color={colors.red} strokeWidth={1.8} />
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
              {values[m.key] != null ? (
                <Text style={[type.bodySm, { color: colors.lilac }]}>{m.steps[(values[m.key] as number) - 1]}</Text>
              ) : null}
            </View>
            <View style={styles.dots} accessibilityRole="adjustable" accessibilityLabel={`${m.label}, ${values[m.key] != null ? m.steps[(values[m.key] as number) - 1] : 'not set'}`}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = values[m.key] != null && n <= (values[m.key] as number);
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`${m.label}: ${m.steps[n - 1]}`}
                    accessibilityState={{ selected: values[m.key] === n }}
                    hitSlop={6}
                    onPress={() => set(m.key, n)}
                    style={[styles.dot, on && styles.dotOn]}
                  />
                );
              })}
            </View>
            <View style={styles.ends} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <Text style={[type.caption, { color: colors.textTertiary }]}>{m.low}</Text>
              <Text style={[type.caption, { color: colors.textTertiary }]}>{m.high}</Text>
            </View>
          </View>
        ))}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: values.period }}
          onPress={() => setValues((v) => ({ ...v, period: !v.period }))}
          style={[styles.periodChip, values.period && styles.periodChipOn]}>
          <Droplet size={16} color={values.period ? colors.paleCream : colors.textSecondary} strokeWidth={1.6} />
          <Text style={[type.bodySm, { color: colors.textPrimary }]}>Period today</Text>
        </Pressable>

        {showSymptoms || values.symptoms.length > 0 ? (
          <SymptomChips selected={values.symptoms} lastTapped={lastTapped} onToggle={toggleSymptom} />
        ) : (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setShowSymptoms(true)}
            style={({ pressed }) => [styles.addSymptoms, pressed && { opacity: 0.6 }]}>
            <Plus size={16} color={colors.lilac} strokeWidth={1.8} />
            <Text style={[type.bodySm, { color: colors.lilac }]}>Add symptoms</Text>
          </Pressable>
        )}

        <View style={{ gap: 8 }}>
          <PrimaryButton label="Check in" size="md" onPress={save} disabled={!anything} loading={saving} />
          <Text style={[type.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
            Private to you. Period days never leave this phone.
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

/** Optional symptoms, with a short note about the one just tapped. */
function SymptomChips({ selected, lastTapped, onToggle }: {
  selected: SymptomKey[];
  lastTapped: SymptomKey | null;
  onToggle: (key: SymptomKey) => void;
}) {
  const note = SYMPTOMS.find((sy) => sy.key === lastTapped);
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.labelRow}>
        <Text style={[type.body, { color: colors.textPrimary }]}>Anything else today?</Text>
        <Text style={[type.caption, { color: colors.textTertiary }]}>Optional</Text>
      </View>
      <View style={styles.chips}>
        {SYMPTOMS.map((sy) => {
          const on = selected.includes(sy.key);
          const Icon = SYMPTOM_ICONS[sy.key];
          return (
            <Pressable
              key={sy.key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => onToggle(sy.key)}
              style={[styles.periodChip, { alignSelf: 'auto' }, on && styles.periodOn]}>
              <Icon size={15} color={on ? colors.burgundy : colors.lilac} strokeWidth={1.6} />
              <Text style={[type.bodySm, { color: on ? colors.burgundy : colors.textPrimary }]}>{sy.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {note ? (
        <View style={styles.note} accessibilityLiveRegion="polite">
          <Text style={[type.bodySm, { color: colors.textPrimary }]}>{note.line}</Text>
          {note.read ? (
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => router.push({ pathname: '/read/[id]', params: { id: note.read } })}
              style={styles.noteLink}>
              <BookOpen size={14} color={colors.lilac} strokeWidth={1.5} />
              <Text style={[type.labelSm, { color: colors.lilac }]}>Why this happens · 2 min</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addSymptoms: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  note: { gap: 10, padding: 14, borderRadius: radius.row, backgroundColor: colors.lilacTint },
  noteLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  card: {
    padding: 18,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', minHeight: 22 },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 },
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
  periodChipOn: { backgroundColor: colors.red, borderColor: colors.red },
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
