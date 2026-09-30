import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Check, ChevronDown, ChevronLeft, RotateCw, Send } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { LabeledRoundButton, OutlineButton, PrimaryButton, RoundIconButton, TextButton } from '@/components/buttons';
import { AnswerSheet } from '@/components/answer-sheet';
import { CardStack, QuestionCard } from '@/components/question-card';
import { Screen } from '@/components/screen';
import { SwipeCard } from '@/components/swipe-card';
import { LoadError, Loading } from '@/components/status';
import { BodyLight, Eyebrow } from '@/components/text';
import { useToast } from '@/components/toast';
import { goBack } from '@/lib/nav';
import { takeAnswerSaved } from '@/lib/answer-events';
import {
  getCard,
  getDrawPool,
  getPastAnswers,
  logActivity,
  markReflected,
  type Card,
  type PastAnswer,
} from '@/lib/data';
import { monthName, shortDate } from '@/lib/dates';
import { useSession } from '@/lib/session';
import { shareCard } from '@/lib/share';
import { colors, radius, type } from '@/theme/tokens';

type Params = { deck?: string; category?: string; card?: string; welcome?: string; at?: string };
type Done = 'saved' | 'reflected' | null;

async function fetchPool(params: Params): Promise<Card[]> {
  if (params.card) {
    const one = await getCard(params.card);
    return one ? [one] : [];
  }
  const { pool } = await getDrawPool(params.deck ?? '', params.category ?? null);
  return pool;
}

// Draw stays mounted as a tab, so each new deck/category/card gets a fresh
// instance (and a fresh draw) via `key`.
export default function Draw() {
  const params = useLocalSearchParams<Params>();
  const key = `${params.deck ?? ''}|${params.category ?? ''}|${params.card ?? ''}|${params.at ?? ''}`;
  return <DrawSession key={key} params={params} />;
}

function DrawSession({ params }: { params: Params }) {
  const { profile } = useSession();
  const toast = useToast();

  const [pool, setPool] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [past, setPast] = useState<PastAnswer[]>([]);
  const [done, setDone] = useState<Done>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openAnswer, setOpenAnswer] = useState<string | null>(null);
  // Bumps on every new card, so a repeat of the same card still animates in.
  const [turn, setTurn] = useState(0);

  const [fade] = useState(() => new Animated.Value(1));
  const [drop] = useState(() => new Animated.Value(0));

  const card = pool?.[index] ?? null;

  useEffect(() => {
    let active = true;
    fetchPool(params).then(
      (next) => active && setPool(next),
      () => active && setError(true),
    );
    return () => {
      active = false;
    };
    // Runs once per instance; a new deck/category/card is a new instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A fresh draw from the same deck/category (retry, or the pool ran out).
  const load = () => {
    setError(false);
    setPool(null);
    setIndex(0);
    setDone(null);
    fetchPool(params).then(setPool, () => setError(true));
  };

  // Past answers for the card on screen, newest first.
  useEffect(() => {
    if (!card) return;
    logActivity('card_drawn', card);
    logActivity('card_viewed', card);
    getPastAnswers(card.id).then(setPast, () => setPast([]));
  }, [card]);

  // Back from the Answer screen after saving.
  useFocusEffect(
    useCallback(() => {
      if (!card) return;
      if (takeAnswerSaved(card.id)) setDone('saved');
      // Also picks up edits made from the answer sheet.
      getPastAnswers(card.id).then(setPast, () => {});
    }, [card]),
  );

  const swap = (apply: () => void) => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(drop, { toValue: 14, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      apply();
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(drop, { toValue: 0, duration: 420, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }),
      ]).start();
    });
  };

  // `animated` is false after a swipe: the card has already flown off.
  const skip = (animated = true) => {
    if (!pool || !card) return;
    logActivity('card_skipped', card);
    const next = () => {
      setIndex((i) => (i + 1) % pool.length);
      setTurn((t) => t + 1);
    };
    if (animated) swap(next);
    else next();
  };

  const drawAnother = (animated = true) => {
    if (params.card && card) {
      // Opened on one specific card: carry on drawing from its category.
      router.push({ pathname: '/draw', params: { deck: card.deckId, category: card.categoryId, at: String(Date.now()) } });
      return;
    }
    const next =
      !pool || pool.length <= 1 || index + 1 >= pool.length
        ? // Everything in the pool has had its turn: start a fresh draw.
          () => load()
        : () => {
            setDone(null);
            setIndex((i) => i + 1);
            setTurn((t) => t + 1);
          };
    if (animated) swap(next);
    else next();
  };

  const reflect = async () => {
    if (!card) return;
    setBusy(true);
    try {
      await markReflected(card.id);
      logActivity('card_reflected', card);
      setDone('reflected');
      getPastAnswers(card.id).then(setPast, () => {});
    } catch {
      toast('That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const answer = () => {
    if (card) router.push({ pathname: '/answer', params: { card: card.id } });
  };

  const deckId = params.deck || card?.deckId || '';
  const categoryTitle = params.category || params.card ? (card?.categoryName ?? ' ') : 'All categories';
  const month = monthName(new Date());

  return (
    <Screen withNav withTopBar gap={24}>
      <View style={styles.topBar}>
        <RoundIconButton icon={ChevronLeft} size={40} accessibilityLabel="Back" onPress={() => goBack('/library')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch category"
          onPress={() => router.push(`/deck/${deckId}`)}
          style={styles.title}>
          <Eyebrow numberOfLines={1}>{card?.deckName ?? ' '}</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[type.body, { color: colors.textPrimary }]} numberOfLines={1}>
              {categoryTitle}
            </Text>
            {params.card ? null : <ChevronDown size={16} color={colors.textPrimary} strokeWidth={1.5} />}
          </View>
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      {params.welcome ? (
        <Text style={[type.greeting, { color: colors.textPrimary, textAlign: 'center' }]}>
          This one’s for you, {profile?.first_name}.
        </Text>
      ) : null}

      {error ? (
        <LoadError onRetry={load} />
      ) : !pool ? (
        <Loading />
      ) : !card ? (
        <BodyLight>There aren’t any cards here right now.</BodyLight>
      ) : (
        <>
          <CardStack>
            <Animated.View style={{ opacity: fade, transform: [{ translateY: drop }] }}>
              {/* Swipe either way for another card (same as Skip, or Draw another once answered). */}
              <SwipeCard
                cardKey={`${card.id}-${turn}`}
                enabled={!busy}
                onSwiped={() => (done ? drawAnother(false) : skip(false))}>
                <QuestionCard question={card.question} topLabel={card.categoryName} height={372} questionSize={34} />
              </SwipeCard>
            </Animated.View>
          </CardStack>

          {done ? (
            <View style={styles.donePanel}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={styles.doneDisc}>
                  <Check size={18} color={colors.burgundy} strokeWidth={2} />
                </View>
                <Text style={[type.deckName, { color: colors.textPrimary, flex: 1 }]}>
                  {done === 'saved' ? `Saved to ${month}.` : 'Marked as reflected.'}
                </Text>
              </View>
              <PrimaryButton label="Draw another" onPress={() => drawAnother()} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <OutlineButton label="Switch category" onPress={() => router.push(`/deck/${deckId}`)} />
                <TextButton label="Home" onPress={() => router.navigate('/')} />
              </View>
            </View>
          ) : (
            <View style={{ gap: 24 }}>
              <View style={styles.roundRow}>
                <LabeledRoundButton label="Skip" icon={RotateCw} accessibilityLabel="Skip this card" onPress={() => skip()} />
                <LabeledRoundButton
                  label="Reflected"
                  icon={Check}
                  accessibilityLabel="Mark as reflected"
                  onPress={reflect}
                  disabled={busy}
                />
                <LabeledRoundButton
                  label="Share"
                  icon={Send}
                  accessibilityLabel="Share this question"
                  onPress={() => shareCard(card)}
                />
              </View>
              <PrimaryButton label="Answer" onPress={answer} />
            </View>
          )}

          {past.length > 0 ? (
            <View style={{ gap: 12 }}>
              <Eyebrow>
                You’ve answered this {past.length} {past.length === 1 ? 'time' : 'times'}
              </Eyebrow>
              {past.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  onPress={() => setOpenAnswer(a.id)}
                  style={({ pressed }) => [styles.pastRow, pressed && { backgroundColor: colors.surfaceHover }]}>
                  <Text style={[type.data, { color: colors.lilac, width: 48 }]}>{shortDate(a.answered_on).toUpperCase()}</Text>
                  <Text style={[type.bodySm, { color: colors.textSecondary, flex: 1, fontSize: 14 }]} numberOfLines={2}>
                    {a.body?.trim() || (a.reflected ? 'Reflected' : 'Voice memo or photos')}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <AnswerSheet
            answerId={openAnswer}
            onClose={() => setOpenAnswer(null)}
            onDeleted={() => card && getPastAnswers(card.id).then(setPast, () => {})}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  roundRow: { flexDirection: 'row', justifyContent: 'center', gap: 34 },
  donePanel: {
    backgroundColor: 'rgba(209,219,255,0.10)',
    borderRadius: 22,
    padding: 22,
    gap: 18,
  },
  doneDisc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.row,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
});
