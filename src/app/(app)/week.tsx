import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, ChevronLeft, ChevronRight, Sun } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RoundIconButton } from '@/components/buttons';
import { DiscoveryCard } from '@/components/discovery-card';
import { Field } from '@/components/form';
import { KeyboardDone } from '@/components/keyboard-done';
import { Screen } from '@/components/screen';
import { LoadError, Loading } from '@/components/status';
import { Caption, Eyebrow } from '@/components/text';
import { useToast } from '@/components/toast';
import { addDays, localDate, parseLocalDate } from '@/lib/dates';
import { currentMonthlyDeck, getDecks } from '@/lib/data';
import { goBack } from '@/lib/nav';
import { scheduleIntentionReminder } from '@/lib/notifications';
import { getReads, type ReadSummary } from '@/lib/reads';
import { useSession } from '@/lib/session';
import { useLoad } from '@/lib/use-load';
import {
  getDigest,
  latestDigestWeek,
  markDigestOpened,
  markDiscoveriesSeen,
  saveIntention,
  setOutcome,
  type Digest,
  type Outcome,
} from '@/lib/week';
import { colors, fonts, radius, type } from '@/theme/tokens';

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: 'mostly', label: 'Mostly' },
  { value: 'a_little', label: 'A little' },
  { value: 'not_this_week', label: 'Not this week' },
];

async function loadWeek(weekStart: string) {
  const [digest, reads, decks] = await Promise.all([
    getDigest(weekStart),
    getReads().catch(() => [] as ReadSummary[]),
    getDecks().catch(() => []),
  ]);
  const read = digest.nextStepRead ? (reads.find((r) => r.id === digest.nextStepRead) ?? null) : null;
  return { digest, read, monthly: currentMonthlyDeck(decks) };
}

/**
 * The weekly digest (Monday to Sunday), ready on Sunday evening. Opened from
 * the Sunday notification or the card on Home. `start` is the week's Monday.
 */
export default function Week() {
  const params = useLocalSearchParams<{ start?: string }>();
  const latest = latestDigestWeek();
  const weekStart = params.start && /^\d{4}-\d{2}-\d{2}$/.test(params.start) && params.start <= latest ? params.start : latest;
  const { profile } = useSession();
  const toast = useToast();
  const { data, error, reload } = useLoad(() => loadWeek(weekStart), weekStart);
  const digest = data?.digest.weekStart === weekStart ? data.digest : null;

  useEffect(() => {
    if (!digest) return;
    markDigestOpened(digest.weekStart);
    // Seen now: they stay in the collection, without the NEW tag next time.
    markDiscoveriesSeen(digest.discoveries.filter((d) => d.isNew).map((d) => d.key));
  }, [digest]);

  const shift = (weeks: number) =>
    router.setParams({ start: localDate(addDays(parseLocalDate(weekStart), weeks * 7)) });

  return (
    <Screen withTopBar keyboard gap={26}>
      <View style={styles.topBar}>
        <RoundIconButton icon={ChevronLeft} size={40} accessibilityLabel="Back" onPress={() => goBack('/')} />
        <Eyebrow>Weekly digest</Eyebrow>
        <KeyboardDone />
      </View>

      {error ? (
        <LoadError onRetry={reload} />
      ) : !digest || !data ? (
        <Loading />
      ) : (
        <WeekBody
          key={digest.weekStart}
          digest={digest}
          name={profile?.first_name ?? ''}
          read={data.read}
          monthlyId={data.monthly?.id ?? null}
          isLatest={weekStart === latest}
          onShift={shift}
          toast={toast}
        />
      )}
    </Screen>
  );
}

function WeekBody({ digest, name, read, monthlyId, isLatest, onShift, toast }: {
  digest: Digest;
  name: string;
  read: ReadSummary | null;
  monthlyId: string | null;
  isLatest: boolean;
  onShift: (weeks: number) => void;
  toast: (message: string) => void;
}) {
  const [outcome, setOutcomeState] = useState<Outcome | null>(digest.lastIntention?.outcome ?? null);
  const [intention, setIntention] = useState(digest.nextIntention?.body ?? '');
  const [saving, setSaving] = useState(false);
  const nextWeek = localDate(addDays(parseLocalDate(digest.weekStart), 7));
  const newOnes = digest.discoveries.filter((d) => d.isNew);
  const headline = `${digest.headline}${name ? `, ${name}` : ''}.${digest.gentle ? ' Go gently.' : ''}`;

  const onShiftHome = () => router.replace('/');

  const chooseOutcome = async (value: Outcome) => {
    setOutcomeState(value);
    try {
      await setOutcome(digest.weekStart, value);
    } catch {
      toast('That didn’t save. Try again.');
    }
  };

  const save = async () => {
    const text = intention.trim();
    if (!text) {
      onShiftHome();
      return;
    }
    setSaving(true);
    try {
      await saveIntention(nextWeek, text);
      await scheduleIntentionReminder(nextWeek);
      toast('Saved. We’ll remind you once, on Wednesday.');
      onShiftHome();
    } catch {
      toast('That didn’t save. Try again.');
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
      <View style={{ gap: 12 }}>
        <Eyebrow>Your week · {digest.label}</Eyebrow>
        <Text style={styles.headline}>{headline}</Text>
      </View>

      {digest.words ? (
        <View style={styles.box}>
          <Eyebrow>In your words</Eyebrow>
          <Text style={styles.quote}>“{digest.words.text}”</Text>
          <Caption>
            {digest.words.day}, answering “{digest.words.question}”
          </Caption>
        </View>
      ) : null}

      {digest.quiet ? (
        <View style={styles.box}>
          <Eyebrow>A quiet week</Eyebrow>
          <Text style={[type.body, { color: colors.textPrimary }]}>
            Nothing saved this week, and that’s fine. Here’s one question for whenever you have a minute.
          </Text>
          {monthlyId ? (
            <Pressable accessibilityRole="link" onPress={() => router.push(`/deck/${monthlyId}`)} style={styles.inlineLink}>
              <Text style={[type.labelSm, { color: colors.lilac }]}>Pull a card from this month’s deck</Text>
            </Pressable>
          ) : null}
        </View>
      ) : digest.felt.length ? (
        <View style={styles.box}>
          <Eyebrow>How your week felt</Eyebrow>
          {digest.felt.map((row) => (
            <View key={row.key} style={styles.feltRow}>
              <Text style={[type.body, { color: colors.textPrimary }]}>{row.label}</Text>
              <Text style={[type.body, { color: colors.lilac }]}>{row.text}</Text>
            </View>
          ))}
          {digest.symptoms ? <Caption>Also noted: {digest.symptoms}</Caption> : null}
          <Caption>
            {digest.comparedTo === 'normal'
              ? 'Compared with your own normal, not anyone else’s.'
              : digest.comparedTo === 'last week'
                ? 'Compared with your last week. After a month of check-ins, this compares with your own normal.'
                : 'Keep checking in and this will start comparing with your own normal.'}
          </Caption>
        </View>
      ) : null}

      {digest.helped ? (
        <View style={[styles.box, styles.helped]}>
          <View style={styles.eyebrowRow}>
            <Sun size={13} color={colors.textLabel} strokeWidth={1.7} />
            <Eyebrow>What helped</Eyebrow>
          </View>
          <Text style={[type.bodyLg, { color: colors.textPrimary }]}>{digest.helped.text}</Text>
        </View>
      ) : null}

      {newOnes.length ? (
        <View style={{ gap: 10 }}>
          <Eyebrow>{newOnes.length === 1 ? 'You found something new' : `You found ${newOnes.length} new things`}</Eyebrow>
          <DiscoveryCard discovery={newOnes[0]} isNew reveal />
          <Pressable accessibilityRole="link" onPress={() => router.push('/discoveries')} style={styles.inlineLink}>
            <Text style={[type.labelSm, { color: colors.lilac }]}>
              Saved to What I know about my body · {digest.discoveries.length}{' '}
              {digest.discoveries.length === 1 ? 'discovery' : 'discoveries'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {digest.lastIntention ? (
        <View style={styles.box}>
          <Eyebrow>Last week you wanted</Eyebrow>
          <Text style={[type.body, { color: colors.textPrimary }]}>“{digest.lastIntention.body}” How did it go?</Text>
          <View style={styles.chips}>
            {OUTCOMES.map((o) => (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: outcome === o.value }}
                onPress={() => chooseOutcome(o.value)}
                style={[styles.chip, outcome === o.value && styles.chipOn]}>
                <Text style={[type.bodySm, { color: outcome === o.value ? colors.burgundy : colors.textPrimary }]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {isLatest ? (
        <View style={styles.box}>
          <Eyebrow>Carry into next week</Eyebrow>
          <Field
            label="One small intention"
            value={intention}
            onChangeText={setIntention}
            placeholder="More slow mornings"
            maxLength={200}
            returnKeyType="done"
            hint="We’ll remind you once, on Wednesday."
          />
        </View>
      ) : null}

      {read ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/read/[id]', params: { id: read.id } })}
          style={styles.box}>
          <Eyebrow>One next step</Eyebrow>
          <View style={styles.eyebrowRow}>
            <BookOpen size={16} color={colors.lilac} strokeWidth={1.5} />
            <Text style={[type.body, { color: colors.textPrimary, flex: 1 }]}>{read.title}</Text>
          </View>
          <Caption>{read.minutes} min · picked for how your week went</Caption>
        </Pressable>
      ) : null}

      {isLatest ? <PrimaryButton label="Save my week" onPress={save} loading={saving} /> : null}

      <View style={styles.weekNav}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => onShift(-1)} style={styles.navBtn}>
          <ChevronLeft size={16} color={colors.textSecondary} strokeWidth={1.5} />
          <Text style={[type.bodySm, { color: colors.textSecondary }]}>Earlier week</Text>
        </Pressable>
        {!isLatest ? (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => onShift(1)} style={styles.navBtn}>
            <Text style={[type.bodySm, { color: colors.textSecondary }]}>Later week</Text>
            <ChevronRight size={16} color={colors.textSecondary} strokeWidth={1.5} />
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headline: { fontFamily: fonts.displayLight, fontSize: 36, lineHeight: 39, color: colors.textPrimary },
  box: {
    gap: 10,
    padding: 16,
    borderRadius: radius.row,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  helped: { backgroundColor: 'rgba(242,180,140,0.14)', borderColor: 'rgba(242,180,140,0.32)' },
  quote: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.textPrimary },
  feltRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineLink: { alignSelf: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(254,252,242,0.24)' },
  chipOn: { backgroundColor: colors.lilac, borderColor: colors.lilac },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
