import { router } from 'expo-router';
import { ArrowRight, BookOpen, Check, ChevronRight, Image as ImageIcon, Mic, PenLine, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnswerSheet } from '@/components/answer-sheet';
import { PrimaryButton } from '@/components/buttons';
import { CardGradient } from '@/components/gradients';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { LoadError, Loading } from '@/components/status';
import { BodyLight, Eyebrow, ScreenTitle } from '@/components/text';
import { getAnswers, getEntries, getNotes, type AnswerRow, type Entry, type MonthlyNote } from '@/lib/data';
import { localMonthStart, monthName, parseLocalDate, shortDate } from '@/lib/dates';
import { useLoad } from '@/lib/use-load';
import { colors, fonts, radius, type } from '@/theme/tokens';

// Everything saved, merged newest first: card answers, written entries, moments.
type FeedItem =
  | { kind: 'answer'; row: AnswerRow; date: string; at: string }
  | { kind: 'entry'; row: Entry; date: string; at: string };

type MonthGroup = { key: string; monthStart: string; label: string; items: FeedItem[]; note: MonthlyNote | null };

async function loadHistory() {
  // Entries and notes are secondary: if either can't load, still show answers.
  const [answers, entries, notes] = await Promise.all([
    getAnswers(),
    getEntries().catch((): Entry[] => []),
    getNotes().catch((): MonthlyNote[] => []),
  ]);
  const feed: FeedItem[] = [
    ...answers.map((row): FeedItem => ({ kind: 'answer', row, date: row.answered_on, at: row.created_at })),
    ...entries.map((row): FeedItem => ({ kind: 'entry', row, date: row.entry_on, at: row.created_at })),
  ].sort((a, b) => (a.date === b.date ? b.at.localeCompare(a.at) : b.date.localeCompare(a.date)));
  return { feed, answers, notes };
}

function byMonth(feed: FeedItem[], notes: MonthlyNote[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const item of feed) {
    const key = item.date.slice(0, 7);
    let g = groups.at(-1);
    if (!g || g.key !== key) {
      const monthStart = `${key}-01`;
      g = {
        key,
        monthStart,
        label: monthName(parseLocalDate(item.date)),
        items: [],
        note: notes.find((n) => n.month === monthStart) ?? null,
      };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}

type CardGroup = { cardId: string; question: string; count: number; last: string };

function byCard(answers: AnswerRow[]): CardGroup[] {
  const map = new Map<string, CardGroup>();
  for (const a of answers) {
    const g = map.get(a.card_id);
    if (g) g.count += 1;
    else map.set(a.card_id, { cardId: a.card_id, question: a.question_text, count: 1, last: a.answered_on });
  }
  return [...map.values()];
}

export default function History() {
  const { data, error, reload } = useLoad(loadHistory);
  const [view, setView] = useState<'month' | 'card'>('month');
  const [openAnswer, setOpenAnswer] = useState<string | null>(null);

  const empty = data && data.feed.length === 0;

  return (
    <Screen withNav gap={24}>
      <View style={{ gap: 12 }}>
        <Eyebrow>Look back</Eyebrow>
        <ScreenTitle>Your history</ScreenTitle>
      </View>

      {error ? (
        <LoadError onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : empty ? (
        <View style={styles.empty}>
          <BookOpen size={52} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[type.deckName, { color: colors.textPrimary }]}>Nothing to look back on yet</Text>
          <BodyLight style={{ textAlign: 'center' }}>
            Pull a card, write about today, or add a moment. It will all gather here.
          </BodyLight>
          <PrimaryButton label="Pull a card" size="md" onPress={() => router.navigate('/library')} />
        </View>
      ) : (
        <>
          <Segmented
            options={[
              { value: 'month', label: 'By month' },
              { value: 'card', label: 'By card' },
            ]}
            value={view}
            onChange={setView}
          />

          {view === 'month'
            ? byMonth(data.feed, data.notes).map((g) => (
                <View key={g.key} style={{ gap: 4 }}>
                  <View style={styles.monthHead}>
                    <Text style={[type.deckName, { color: colors.textPrimary, fontSize: 26 }]}>{g.label}</Text>
                    <Text style={[type.labelSm, { color: colors.lilac }]}>{g.items.length} saved</Text>
                  </View>
                  {/* The closing reflection belongs to months that have ended. */}
                  {g.monthStart < localMonthStart() ? <RecapCard group={g} /> : null}
                  {g.items.map((item) => (
                    <FeedLine
                      key={`${item.kind}-${item.row.id}`}
                      item={item}
                      onPress={() =>
                        item.kind === 'answer'
                          ? setOpenAnswer(item.row.id)
                          : router.push({ pathname: '/entry', params: { id: item.row.id } })
                      }
                    />
                  ))}
                </View>
              ))
            : byCard(data.answers).map((c) => (
                <Pressable
                  key={c.cardId}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/draw', params: { card: c.cardId, at: String(Date.now()) } })}
                  style={({ pressed }) => [styles.cardRow, pressed && { backgroundColor: colors.surfaceHover }]}>
                  <View style={{ flex: 1, gap: 8 }}>
                    <Text style={[type.listQuestion, { color: colors.textPrimary, fontSize: 20 }]}>{c.question}</Text>
                    <Text style={[type.labelSm, { color: colors.lilac }]}>
                      {c.count} {c.count === 1 ? 'answer' : 'answers'} · last {shortDate(c.last)}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={colors.textTertiary} strokeWidth={1.5} />
                </Pressable>
              ))}
        </>
      )}

      <AnswerSheet answerId={openAnswer} onClose={() => setOpenAnswer(null)} onDeleted={reload} />
    </Screen>
  );
}

function FeedLine({ item, onPress }: { item: FeedItem; onPress: () => void }) {
  const d = parseLocalDate(item.date);
  const row = item.row;
  const icons = (
    item.kind === 'answer'
      ? [
          item.row.body?.trim() ? PenLine : null,
          item.row.voice_path ? Mic : null,
          item.row.photo_paths.length ? ImageIcon : null,
          item.row.reflected ? Check : null,
        ]
      : [item.row.kind === 'write' ? PenLine : null, item.row.photo_paths.length ? ImageIcon : null]
  ).filter(Boolean) as LucideIcon[];

  const title = item.kind === 'answer' ? item.row.question_text : item.row.kind === 'moment' ? 'Moment' : 'Written entry';

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={{ width: 34, alignItems: 'center' }}>
        <Text style={[type.labelSm, { fontSize: 9.5, color: colors.textTertiary }]}>{monthName(d).slice(0, 3)}</Text>
        <Text style={{ fontFamily: fonts.displayLight, fontSize: 24, color: colors.textPrimary }}>{d.getDate()}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[type.listQuestion, { color: colors.textPrimary }]}>{title}</Text>
        {row.body?.trim() ? (
          <Text style={[type.bodySm, { color: colors.textSecondary }]} numberOfLines={2}>
            {row.body.trim()}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {icons.map((Icon, i) => (
            <Icon key={i} size={14} color={colors.lilac} strokeWidth={1.5} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

/** Past months: the recap card, which opens that month's recap and closing reflection. */
function RecapCard({ group }: { group: MonthGroup }) {
  const body = group.note?.body?.trim();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/recap', params: { month: group.key } })}
      style={styles.reflection}>
      <CardGradient />
      <Text style={[type.labelSm, { color: 'rgba(254,252,242,0.85)' }]}>Monthly recap</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.paleCream }}>
          Your {group.label}, looked back on
        </Text>
        <ArrowRight size={20} color={colors.paleCream} strokeWidth={1.5} />
      </View>
      {body ? (
        <Text style={[type.bodySm, { color: 'rgba(254,252,242,0.85)' }]} numberOfLines={2}>
          {body}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 14, paddingVertical: 48 },
  monthHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 6 },
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderRadius: radius.category,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  reflection: {
    gap: 10,
    padding: 18,
    marginBottom: 8,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(209,219,255,0.24)',
  },
});
