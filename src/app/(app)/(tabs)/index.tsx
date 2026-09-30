import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Check, Send } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RoundIconButton, TextButton } from '@/components/buttons';
import { AnswerSheet } from '@/components/answer-sheet';
import { BodyCheckIn } from '@/components/body-checkin';
import { DeckRow } from '@/components/decks';
import { LookingBackCard } from '@/components/looking-back';
import { MonthRing } from '@/components/month-ring';
import { QuestionCard } from '@/components/question-card';
import { Screen } from '@/components/screen';
import { LoadError, Loading } from '@/components/status';
import { Caption, Eyebrow, Greeting } from '@/components/text';
import { useToast } from '@/components/toast';
import {
  answeredToday,
  currentMonthlyDeck,
  daysWithSomethingSaved,
  getCardOfTheDay,
  getDecks,
  getLookingBack,
  getSeasons,
  logActivity,
  logCardViewed,
  markReflected,
  seasonDeck,
} from '@/lib/data';
import { checkInShown } from '@/lib/body';
import { dayLabel, greetingFor, localMonthStart } from '@/lib/dates';
import { useSession } from '@/lib/session';
import { shareCard } from '@/lib/share';
import { useLoad } from '@/lib/use-load';
import { colors, radius, type } from '@/theme/tokens';

const submark = require('@/assets/images/brand/submark-white.png');

async function loadHome(seasonId: string | null) {
  const [decks, card, seasons, reflectedDays, lookingBack] = await Promise.all([
    getDecks(),
    getCardOfTheDay(),
    getSeasons(),
    daysWithSomethingSaved(),
    // A nice-to-have: never let it stop Home from loading.
    getLookingBack().catch(() => null),
  ]);
  return {
    card,
    lookingBack,
    showCheckIn: checkInShown(),
    reflectedDays,
    todayStatus: card ? await answeredToday(card.id) : null,
    monthly: currentMonthlyDeck(decks),
    forSeason: seasonDeck(decks, seasonId),
    seasonName: seasons.find((s) => s.id === seasonId)?.name ?? null,
  };
}

export default function Home() {
  const { profile } = useSession();
  const toast = useToast();
  const { data, error, reload, setData } = useLoad(() => loadHome(profile?.season_id ?? null), profile?.season_id ?? '');
  const [reflecting, setReflecting] = useState(false);
  const [openAnswer, setOpenAnswer] = useState<string | null>(null);
  const now = new Date();

  const card = data?.card ?? null;

  useEffect(() => {
    if (card) logCardViewed(card);
  }, [card]);

  const answer = () => {
    if (!card) return;
    router.push({ pathname: '/answer', params: { card: card.id, cardOfDay: '1' } });
  };

  const reflect = async () => {
    if (!card || !data) return;
    setReflecting(true);
    try {
      await markReflected(card.id);
      logActivity('card_reflected', card);
      logActivity('card_of_day_answered', card);
      setData({
        ...data,
        todayStatus: data.todayStatus ?? 'reflected',
        reflectedDays: new Set([...data.reflectedDays, now.getDate()]),
      });
      toast('Marked as reflected.');
    } catch {
      toast('That didn’t save. Try again.');
    } finally {
      setReflecting(false);
    }
  };

  return (
    <Screen withNav>
      <View style={styles.header}>
        <View style={{ gap: 8, flex: 1 }}>
          <Eyebrow>{dayLabel(now)}</Eyebrow>
          <Greeting>
            {greetingFor(now)}, {profile?.first_name}.
          </Greeting>
        </View>
        <Image source={submark} style={styles.submark} contentFit="contain" accessibilityLabel="Daily Few" />
      </View>

      {error ? (
        <LoadError onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <View style={{ gap: 14 }}>
            <Eyebrow>The month so far</Eyebrow>
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Opens this month's recap so far"
              onPress={() => router.push({ pathname: '/recap', params: { month: localMonthStart(now).slice(0, 7) } })}>
              <MonthRing today={now} reflectedDays={data.reflectedDays} />
            </Pressable>
          </View>

          {card ? (
            <View style={{ gap: 14 }}>
              <View style={styles.labelRow}>
                <Eyebrow>Card of the day</Eyebrow>
                <Caption>Same card for everyone</Caption>
              </View>
              <QuestionCard question={card.question} bottomLabel={`${card.deckName} · ${card.categoryName}`} />
              {data.todayStatus ? (
                <View style={styles.doneRow}>
                  <View style={styles.donePill}>
                    <Check size={16} color={colors.lilac} strokeWidth={1.5} />
                    <Text style={[type.bodySm, { color: colors.textPrimary }]}>
                      {data.todayStatus === 'answered' ? 'Answered today' : 'Reflected today'}
                    </Text>
                  </View>
                  <TextButton label="Add another" onPress={answer} color={colors.lilac} />
                </View>
              ) : (
                <View style={styles.actions}>
                  <PrimaryButton label="Answer" onPress={answer} style={{ flex: 1 }} />
                  <RoundIconButton icon={Check} accessibilityLabel="Mark as reflected" onPress={reflect} disabled={reflecting} />
                  <RoundIconButton icon={Send} accessibilityLabel="Share this question" onPress={() => shareCard(card)} />
                </View>
              )}
            </View>
          ) : null}

          {data.showCheckIn ? <BodyCheckIn /> : null}

          {data.lookingBack ? <LookingBackCard item={data.lookingBack} onOpenAnswer={setOpenAnswer} /> : null}

          {data.monthly ? (
            <View style={{ gap: 14 }}>
              <Eyebrow>This month’s deck</Eyebrow>
              <DeckRow deck={data.monthly} onPress={() => router.push(`/deck/${data.monthly!.id}`)} />
            </View>
          ) : null}

          {data.forSeason ? (
            <View style={{ gap: 14 }}>
              <Eyebrow>For your season · {data.seasonName}</Eyebrow>
              <DeckRow deck={data.forSeason} onPress={() => router.push(`/deck/${data.forSeason!.id}`)} />
            </View>
          ) : null}
        </>
      )}
      <AnswerSheet answerId={openAnswer} onClose={() => setOpenAnswer(null)} onDeleted={reload} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  submark: { width: 30, height: 21, marginTop: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(209,219,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    height: 44,
  },
});
