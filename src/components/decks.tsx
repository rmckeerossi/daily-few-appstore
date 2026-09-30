import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DeckType, DeckWithCount } from '@/lib/data';
import { colors, radius, type } from '@/theme/tokens';

import { DeckArtGradient } from './gradients';

const TYPE_LABEL: Record<DeckType, string> = {
  library: 'Deck',
  monthly: 'Monthly',
  life_season: 'Life season',
  body: 'Body',
};

export const artVariant = (t: DeckType) => (t === 'monthly' || t === 'library' ? 'monthly' : 'season');

export function deckMeta(deck: Pick<DeckWithCount, 'type' | 'cardCount'>) {
  return `${TYPE_LABEL[deck.type]} · ${deck.cardCount} cards`;
}

/** Deck row card (Home): two stacked mini cards on the left, text on the right. */
export function DeckRow({ deck, onPress }: { deck: DeckWithCount; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceHover }]}>
      <View style={styles.miniStack}>
        <View style={[styles.mini, { transform: [{ rotate: '-8deg' }], opacity: 0.7 }]}>
          <DeckArtGradient variant={artVariant(deck.type)} />
        </View>
        <View style={[styles.mini, { position: 'absolute' }]}>
          <DeckArtGradient variant={artVariant(deck.type)} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[type.deckName, { color: colors.textPrimary }]}>{deck.name}</Text>
        {deck.description ? (
          <Text style={[type.bodySm, { color: colors.textSecondary }]} numberOfLines={2}>
            {deck.description}
          </Text>
        ) : null}
        <Text style={[type.labelSm, { color: colors.lilac }]}>{deckMeta(deck)}</Text>
      </View>
    </Pressable>
  );
}

/** Library tile: art band with the name, then description and meta. */
export function DeckTile({ deck, badge, badgeAccent, large, onPress }: {
  deck: DeckWithCount;
  badge?: string | null;
  /** The red badge, for this month's deck. */
  badgeAccent?: boolean;
  large?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { transform: [{ translateY: -2 }] }]}>
      <View style={[styles.art, { height: large ? 170 : 120 }]}>
        <DeckArtGradient variant={artVariant(deck.type)} />
        {badge ? (
          <View style={[styles.badge, badgeAccent && { backgroundColor: colors.red }]}>
            <Text style={[type.labelSm, { color: badgeAccent ? colors.paleCream : colors.burgundy, letterSpacing: 1 }]}>{badge}</Text>
          </View>
        ) : null}
        <Text style={[type.sheetTitle, styles.tileName]}>{deck.name}</Text>
      </View>
      <View style={styles.tileBody}>
        {deck.description ? (
          <Text style={[type.bodySm, { color: colors.textSecondary }]}>{deck.description}</Text>
        ) : null}
        <Text style={[type.labelSm, { color: colors.lilac }]}>{deckMeta(deck)}</Text>
      </View>
    </Pressable>
  );
}

/** Category row on the Deck screen, with answered progress. */
export function CategoryRow({ name, answered, total, onPress }: {
  name: string;
  answered: number;
  total: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${answered} of ${total} answered`}
      onPress={onPress}
      style={({ pressed }) => [styles.category, pressed && { backgroundColor: colors.surfaceHover }]}>
      <View style={{ flex: 1, gap: 12 }}>
        <Text style={[type.categoryName, { color: colors.textPrimary }]}>{name}</Text>
        <View style={styles.progressRow}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${total ? (answered / total) * 100 : 0}%` }]} />
          </View>
          <Text style={[type.data, { color: colors.textTertiary }]}>
            {answered} of {total}
          </Text>
        </View>
      </View>
      <ChevronRight size={20} color={colors.textTertiary} strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  miniStack: { width: 62, height: 86, marginLeft: 4 },
  mini: {
    width: 62,
    height: 86,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(209,219,255,0.24)',
  },
  tile: {
    borderRadius: radius.deckTile,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  art: { justifyContent: 'flex-end', paddingHorizontal: 18, paddingVertical: 16 },
  tileName: { color: colors.paleCream },
  badge: {
    position: 'absolute',
    top: 14,
    left: 16,
    backgroundColor: colors.paleCream,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tileBody: { paddingTop: 14, paddingHorizontal: 18, paddingBottom: 18, gap: 10 },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.category,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(254,252,242,0.14)', overflow: 'hidden' },
  fill: { height: 3, backgroundColor: colors.lilac },
});
