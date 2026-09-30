import { router } from 'expo-router';
import { BookOpen, Layers } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { DeckTile } from '@/components/decks';
import { ReadRow } from '@/components/read-row';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { LoadError, Loading } from '@/components/status';
import { BodyLight, Eyebrow, ScreenTitle } from '@/components/text';
import { currentMonthlyDeck, getDecks, type DeckType } from '@/lib/data';
import { getReads, shelve } from '@/lib/reads';
import { useSession } from '@/lib/session';
import { useLoad } from '@/lib/use-load';
import { colors } from '@/theme/tokens';

type Filter = 'all' | 'monthly' | 'season' | 'body' | 'reads';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'season', label: 'Seasons' },
  { value: 'body', label: 'Body' },
  { value: 'reads', label: 'Reads' },
];

const matches: Record<Exclude<Filter, 'reads'>, (t: DeckType) => boolean> = {
  all: () => true,
  monthly: (t) => t === 'monthly',
  season: (t) => t === 'life_season',
  body: (t) => t === 'body',
};

export default function Library() {
  const { profile } = useSession();
  const { data: decks, error, reload } = useLoad(getDecks);
  const [filter, setFilter] = useState<Filter>('all');

  const featured = decks ? currentMonthlyDeck(decks) : null;
  // This month's deck first, then everything else in library order.
  const shown = (decks ?? [])
    .filter((d) => filter !== 'reads' && matches[filter](d.type))
    .sort((a, b) => Number(b.id === featured?.id) - Number(a.id === featured?.id));

  return (
    <Screen withNav gap={24}>
      <View style={{ gap: 12 }}>
        <Eyebrow>Library</Eyebrow>
        <ScreenTitle>{filter === 'reads' ? 'Understand your body' : 'Pick a deck'}</ScreenTitle>
      </View>
      <Segmented options={FILTERS} value={filter} onChange={setFilter} />

      {filter === 'reads' ? (
        <ReadsList />
      ) : error ? (
        <LoadError onRetry={reload} />
      ) : !decks ? (
        <Loading />
      ) : shown.length === 0 ? (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
          <Layers size={48} color={colors.textTertiary} strokeWidth={1.5} />
          <BodyLight style={{ textAlign: 'center' }}>No decks here yet.</BodyLight>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {filter === 'body' ? (
            <BodyLight>Questions for understanding your body. For reflection, not medical advice.</BodyLight>
          ) : null}
          {shown.map((deck) => (
            <DeckTile
              key={deck.id}
              deck={deck}
              large={deck.id === featured?.id}
              badgeAccent={deck.id === featured?.id}
              badge={
                deck.id === featured?.id
                  ? 'This month'
                  : deck.type === 'life_season' && deck.season_id === profile?.season_id
                    ? 'For your season'
                    : null
              }
              onPress={() => router.push(`/deck/${deck.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

/** Short reads: plain-language explainers, "for understanding, not medical advice". */
function ReadsList() {
  const { data: reads, error, reload } = useLoad(getReads);
  if (error) return <LoadError onRetry={reload} />;
  if (!reads) return <Loading />;
  if (reads.length === 0) {
    return (
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
        <BookOpen size={48} color={colors.textTertiary} strokeWidth={1.5} />
        <BodyLight style={{ textAlign: 'center' }}>Short reads are on their way.</BodyLight>
      </View>
    );
  }
  return (
    <View style={{ gap: 24 }}>
      <BodyLight>Two-minute reads on what your body might be telling you. For understanding, not medical advice.</BodyLight>
      {shelve(reads).map((shelf) => (
        <View key={shelf.label ?? 'all'} style={{ gap: 12 }}>
          {shelf.label ? <Eyebrow>{shelf.label}</Eyebrow> : null}
          {shelf.reads.map((r) => (
            // Under a shelf heading the topic is already said: just "Short read".
            <ReadRow key={r.id} read={r} label={shelf.label ? 'Short read' : undefined} />
          ))}
        </View>
      ))}
    </View>
  );
}
