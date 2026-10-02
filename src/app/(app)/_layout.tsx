import * as Notifications from 'expo-notifications';
import { router, Stack, type Href } from 'expo-router';
import { useEffect } from 'react';

import { introSeen } from '@/lib/intro';
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

  // After signup: Home first, then the short intro slides up a moment later.
  // Arriving from a shared card link: that card comes first (it's why they
  // came), and the intro follows on the card (draw.tsx).
  useEffect(() => {
    if (!profile) return;
    // Saved on the profile at signup; nothing more to keep on the phone.
    clearAttribution();
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
    if (introSeen(profile.id)) {
      setJustSignedUp(false);
      return;
    }
    // Cleared when the intro opens, so this effect re-running doesn't cancel it.
    const timer = setTimeout(() => {
      setJustSignedUp(false);
      router.push('/intro');
    }, 1200);
    return () => clearTimeout(timer);
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
