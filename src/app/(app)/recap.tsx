import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnswerSheet } from '@/components/answer-sheet';
import { OutlineButton, RoundIconButton } from '@/components/buttons';
import { CardGradient, NightBackground } from '@/components/gradients';
import { NoteSheet } from '@/components/note-sheet';
import { LoadError, Loading } from '@/components/status';
import { BodyLight, Eyebrow } from '@/components/text';
import { getMonth, type AnswerRow, type Entry } from '@/lib/data';
import { monthName, parseLocalDate } from '@/lib/dates';
import { goBack } from '@/lib/nav';
import { useLoad } from '@/lib/use-load';
import { colors, fonts, type } from '@/theme/tokens';

type Item = { kind: 'answer'; row: AnswerRow; date: string } | { kind: 'entry'; row: Entry; date: string };

/**
 * Monthly recap (PRD §4.7, design screen 09): cards answered, decks used, the
 * closing reflection, and everything saved that month. Opened from History or
 * the month-end notification. `month` is "YYYY-MM".
 */
export default function Recap() {
  const { month = '' } = useLocalSearchParams<{ month: string }>();
  const insets = useSafeAreaInsets();
  const { data, error, reload } = useLoad(() => getMonth(month), month);
  const [openAnswer, setOpenAnswer] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState(false);

  const date = /^\d{4}-\d{2}$/.test(month) ? parseLocalDate(`${month}-01`) : new Date();
  const label = monthName(date);

  const cardsAnswered = data?.answers.length ?? 0;
  const decksUsed = new Set(data?.answers.map((a) => a.deck_name)).size;
  const items: Item[] = data
    ? [
        ...data.answers.map((row): Item => ({ kind: 'answer', row, date: row.answered_on })),
        ...data.entries.map((row): Item => ({ kind: 'entry', row, date: row.entry_on })),
      ].sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const noteBody = data?.note?.body?.trim() ?? '';

  return (
    <View style={{ flex: 1 }}>
      <NightBackground />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <CardGradient />
          <RoundIconButton icon={ChevronLeft} size={40} accessibilityLabel="Back" onPress={() => goBack('/history')} />
          <View style={{ gap: 14, marginTop: 40 }}>
            <Eyebrow color="rgba(254,252,242,0.8)">Monthly recap · {date.getFullYear()}</Eyebrow>
            <Text style={[type.displayHero, { color: colors.paleCream }]}>
              Your{'\n'}
              <Text style={{ fontFamily: fonts.displayLightItalic }}>{label}</Text>
            </Text>
          </View>
          <View style={styles.tiles}>
            <Stat value={cardsAnswered} label="Cards answered" />
            <Stat value={decksUsed} label="Decks used" />
          </View>
        </View>

        <View style={styles.body}>
          {error ? (
            <LoadError onRetry={reload} />
          ) : !data ? (
            <Loading />
          ) : (
            <>
              <View style={{ gap: 12 }}>
                <View style={styles.labelRow}>
                  <Eyebrow>{label} · closing reflection</Eyebrow>
                  <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setEditingNote(true)}>
                    <Text style={[type.label, { color: colors.lilac }]}>{noteBody ? 'Edit' : 'Add'}</Text>
                  </Pressable>
                </View>
                {noteBody ? (
                  <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 29, color: colors.textPrimary }}>
                    {noteBody}
                  </Text>
                ) : (
                  <BodyLight>As {label} closes, what are you carrying out of it?</BodyLight>
                )}
              </View>

              {items.length === 0 ? (
                <View style={{ gap: 16, alignItems: 'flex-start' }}>
                  <Text style={[type.deckName, { color: colors.textPrimary }]}>Nothing recorded in {label}.</Text>
                  {!noteBody ? <OutlineButton label="Add a note" onPress={() => setEditingNote(true)} /> : null}
                </View>
              ) : (
                <View style={{ gap: 4 }}>
                  <Eyebrow>What you saved</Eyebrow>
                  {items.map((item) => (
                    <RecapLine
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
              )}
            </>
          )}
        </View>
      </ScrollView>

      <AnswerSheet answerId={openAnswer} onClose={() => setOpenAnswer(null)} onDeleted={reload} />
      <NoteSheet
        key={editingNote ? 'open' : 'closed'}
        month={editingNote ? { start: `${month}-01`, label, body: data?.note?.body ?? null } : null}
        onClose={() => setEditingNote(false)}
        onSaved={reload}
      />
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={{ fontFamily: fonts.displayLight, fontSize: 40, lineHeight: 44, color: colors.paleCream }}>{value}</Text>
      <Text style={[type.labelSm, { color: 'rgba(254,252,242,0.85)' }]}>{label}</Text>
    </View>
  );
}

function RecapLine({ item, onPress }: { item: Item; onPress: () => void }) {
  const d = parseLocalDate(item.date);
  const title = item.kind === 'answer' ? item.row.question_text : item.row.kind === 'moment' ? 'Moment' : 'Written entry';
  const body = item.row.body?.trim();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={{ width: 34, alignItems: 'center' }}>
        <Text style={[type.labelSm, { fontSize: 9.5, color: colors.textTertiary }]}>{monthName(d).slice(0, 3)}</Text>
        <Text style={{ fontFamily: fonts.displayLight, fontSize: 24, color: colors.textPrimary }}>{d.getDate()}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[type.listQuestion, { color: colors.textPrimary }]}>{title}</Text>
        {body ? (
          <Text style={[type.bodySm, { color: colors.textSecondary }]} numberOfLines={2}>
            {body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 22, paddingBottom: 30, overflow: 'hidden' },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 28 },
  tile: {
    flex: 1,
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(40,14,26,0.28)',
  },
  body: { padding: 22, gap: 28 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});

