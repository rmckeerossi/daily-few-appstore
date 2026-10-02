import * as Notifications from 'expo-notifications';
import { router, Stack, type Href } from 'expo-router';
import { useEffect } from 'react';

import { currentMonthlyDeck, getDecks, seasonDeck } from '@/lib/data';
import { clearAttribution, clearSharedCard, pendingSharedCard } from '@/lib/links';
import { syncReminders } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { colors } from '@/theme/tokens';

let lastHandledNotification: string | null = null;

export default function AppLayout() {
  const { profile, justSignedUp, setJustSignedUp } = useSession();
  const lastResponse = Notifications.useLastNotificationResponse();

  // Keep scheduled reminders in step with the profile's settings.
  useEffect(() => {
    syncReminders(profile).catch(() => {});
  }, [profile]);

  // Tapping a reminder opens today's card; a recap notification opens that month.
  useEffect(() => {
    if (!lastResponse || lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = lastResponse.notification.request.identifier + lastResponse.notification.date;
    if (id === lastHandledNotification) return;
    lastHandledNotification = id;
    const url = lastResponse.notification.request.content.data?.url;
    if (typeof url === 'string') router.push(url as Href);
  }, [lastResponse]);

  // Signup payoff: straight onto the first card, from the deck for their season
  // (or this month's deck). The short intro slides up a few seconds later (draw.tsx).
  useEffect(() => {
    if (!profile) return;
    // Saved on the profile at signup; nothing more to keep on the phone.
    clearAttribution();
    // Arrived from a shared card link: that card comes first, whether they
    // just signed up or signed back in.
    const shared = pendingSharedCard();
    if (shared) {
      clearSharedCard();
      setJustSignedUp(false);
      router.push({
        pathname: '/draw',
        params: { card: shared, at: String(Date.now()), ...(justSignedUp ? { welcome: '1' } : {}) },
      });
      return;
    }
    if (!justSignedUp) return;
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
      <Stack.Screen name="recap" />
      <Stack.Screen name="week" />
      <Stack.Screen name="discoveries" />
      <Stack.Screen name="intro" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
