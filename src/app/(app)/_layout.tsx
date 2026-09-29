import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { currentMonthlyDeck, getDecks, seasonDeck } from '@/lib/data';
import { useSession } from '@/lib/session';
import { colors } from '@/theme/tokens';

export default function AppLayout() {
  const { profile, justSignedUp, setJustSignedUp } = useSession();

  // Signup payoff: straight onto the first card, from the deck for their season
  // (or this month's deck), with no tour first (PRD Flow A step 6).
  useEffect(() => {
    if (!justSignedUp || !profile) return;
    setJustSignedUp(false);
    getDecks()
      .then((decks) => {
        const deck =
          seasonDeck(decks, profile.season_id) ??
          currentMonthlyDeck(decks) ??
          decks.find((d) => d.type === 'library') ??
          decks[0];
        if (deck) router.push({ pathname: '/draw', params: { deck: deck.id, welcome: '1', at: String(Date.now()) } });
      })
      .catch(() => {});
  }, [justSignedUp, profile, setJustSignedUp]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="answer" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="entry" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
    </Stack>
  );
}
