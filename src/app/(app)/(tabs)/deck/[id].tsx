import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoundIconButton } from '@/components/buttons';
import { artVariant, CategoryRow } from '@/components/decks';
import { ReadRow } from '@/components/read-row';
import { DeckArtGradient, NightBackground } from '@/components/gradients';
import { NAV_CLEARANCE } from '@/components/screen';
import { LoadError, Loading } from '@/components/status';
import { BodyLight, Eyebrow } from '@/components/text';
import { goBack } from '@/lib/nav';
import { readsForDeck } from '@/lib/reads';
import { getDeckDetail, type DeckType } from '@/lib/data';
import { monthName, parseLocalDate } from '@/lib/dates';
import { useLoad } from '@/lib/use-load';
import { colors, fonts, type } from '@/theme/tokens';

const TYPE_LABEL: Record<DeckType, string> = {
  library: 'Deck',
  monthly: 'Monthly',
  life_season: 'Life season',
  body: 'Body',
};

export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  // Reads are a nice-to-have: never let them stop the deck from loading.
  const { data, error, reload } = useLoad(
    async () => ({ ...(await getDeckDetail(id)), reads: await readsForDeck(id).catch(() => []) }),
    id,
  );
  const deck = data?.deck?.id === id ? data.deck : null;

  const tag = deck?.month ? monthName(parseLocalDate(deck.month)) : null;

  return (
    <View style={{ flex: 1 }}>
      <NightBackground />
      <ScrollView contentContainerStyle={{ paddingBottom: NAV_CLEARANCE }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          {deck ? <DeckArtGradient variant={artVariant(deck.type)} /> : null}
          <RoundIconButton icon={ChevronLeft} size={40} accessibilityLabel="Back" onPress={() => goBack('/library')} />
          {deck ? (
            <View style={{ gap: 12, marginTop: 28 }}>
              <Eyebrow color="rgba(254,252,242,0.8)">
                {TYPE_LABEL[deck.type]}
                {tag ? ` · ${tag}` : ''}
              </Eyebrow>
              <Text style={[type.displayL, { color: colors.paleCream }]}>{deck.name}</Text>
              {deck.description ? (
                <Text style={[type.bodyLight, { color: 'rgba(254,252,242,0.85)' }]}>{deck.description}</Text>
              ) : null}
              <Eyebrow color={colors.lilac}>
                {data!.cardCount} cards · {data!.categories.length} categories
              </Eyebrow>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          {error ? (
            <LoadError onRetry={reload} />
          ) : !data || data.deck?.id !== id ? (
            <Loading />
          ) : !deck ? (
            <BodyLight>This deck isn’t available anymore.</BodyLight>
          ) : (
            <>
              {deck.type === 'body' ? (
                <Text style={[type.bodySm, { color: colors.textSecondary, fontFamily: fonts.sansLight }]}>
                  These questions are for reflection, not medical advice.
                </Text>
              ) : null}
              {data.reads.length ? (
                <View style={{ gap: 10 }}>
                  <Eyebrow>Read first</Eyebrow>
                  {data.reads.map((r) => (
                    <ReadRow key={r.id} read={r} />
                  ))}
                </View>
              ) : null}
              <Eyebrow>Choose a category</Eyebrow>
              <View style={{ gap: 10 }}>
                {data.categories.map((c) => (
                  <CategoryRow
                    key={c.id}
                    name={c.name}
                    answered={c.answered}
                    total={c.total}
                    onPress={() => router.push({ pathname: '/draw', params: { deck: deck.id, category: c.id, at: String(Date.now()) } })}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 22, paddingBottom: 28, overflow: 'hidden' },
  body: { padding: 22, gap: 14 },
});
