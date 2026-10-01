// Reminders are scheduled on the phone itself ("local" notifications), so they
// fire at the person's own local time, even offline, with no server involved.
//
//   Daily reminder   every day at their chosen time, if they turned it on.
//                    "Today's card is waiting." → opens Home (card of the day).
//   Month-end recap  on the 1st of each month at 9:00, for the month that just
//                    ended. "Your September is ready." → opens that recap.
//
// Everything is rescheduled from the profile whenever the app opens or a
// setting changes, so it stays right after reinstalling or changing phones.

import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

import { getUpcomingAnniversaries, type Profile } from './data';
import { monthName } from './dates';

const DAILY_ID = 'daily-reminder';
const RECAP_PREFIX = 'recap-';
const RECAP_HOUR = 9;
/** How many month-ends ahead to schedule, in case the app isn't opened for a while. */
const RECAP_MONTHS_AHEAD = 3;

//   Anniversary      "A year ago today you answered …" on the day, at 10:00,
//                    for answers with something written, recorded or photographed.
//                    → opens that card with its past answers. On by default.
const ANNIVERSARY_PREFIX = 'anniversary-';
const ANNIVERSARY_HOUR = 10;
const ANNIVERSARY_DAYS_AHEAD = 30;
/** iOS keeps at most 64 scheduled notifications per app; stay well inside that. */
const ANNIVERSARY_MAX = 20;
const ANNIVERSARY_KEY = 'anniversaries';

//   Weekly digest    Sundays at 18:00: "Your week is ready." → opens the digest.
//                    Nothing personal on the lock screen. On by default.
//   Intention        once, on the Wednesday of the week they set one, at 9:30.
//                    Scheduled when they save it, not by syncReminders.
const DIGEST_ID = 'weekly-digest';
const DIGEST_KEY = 'weekly-digest-off';
const INTENTION_PREFIX = 'intention-';

export function weeklyDigestEnabled(): boolean {
  try {
    return localStorage.getItem(DIGEST_KEY) !== '1';
  } catch {
    return true;
  }
}

export function setWeeklyDigestEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(DIGEST_KEY);
    else localStorage.setItem(DIGEST_KEY, '1');
  } catch {}
}

/** One gentle reminder of this week's intention, on its Wednesday morning. */
export async function scheduleIntentionReminder(weekStart: string) {
  if (!(await notificationsAllowed())) return;
  const [y, m, d] = weekStart.split('-').map(Number);
  const when = new Date(y, m - 1, d + 2, 9, 30, 0);
  if (when <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: `${INTENTION_PREFIX}${weekStart}`,
    content: { title: 'Daily Few', body: 'A small reminder of what you wanted this week.', data: { url: '/week' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
}

/** A setting on this phone, like the app lock. */
export function anniversariesEnabled(): boolean {
  try {
    return localStorage.getItem(ANNIVERSARY_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setAnniversariesEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(ANNIVERSARY_KEY);
    else localStorage.setItem(ANNIVERSARY_KEY, 'off');
  } catch {}
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function notificationsAllowed(): Promise<boolean> {
  const s = await Notifications.getPermissionsAsync();
  return s.granted || s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Asks once (iOS only shows the system prompt the first time). */
export async function askForNotifications(): Promise<boolean> {
  if (await notificationsAllowed()) return true;
  const s = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return s.granted;
}

/** True if we've never asked, so a gentle ask in context is worth it. */
export async function neverAskedForNotifications(): Promise<boolean> {
  const s = await Notifications.getPermissionsAsync();
  return s.status === Notifications.PermissionStatus.UNDETERMINED;
}

const OFFERED_KEY = 'notifications-offered';

/**
 * After someone saves their first reflection, offer the month-end nudge once,
 * in our own words before iOS's prompt. "Not now" is remembered on this phone.
 */
export async function offerNotificationsOnce(onAllowed: () => void) {
  try {
    if (localStorage.getItem(OFFERED_KEY) || !(await neverAskedForNotifications())) return;
    localStorage.setItem(OFFERED_KEY, '1');
  } catch {
    return;
  }
  Alert.alert(
    'A nudge when your month is ready?',
    'On the 1st of each month we’ll let you know your recap is ready to look back on. You can add a daily reminder in Profile.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Yes, please', onPress: () => askForNotifications().then((ok) => ok && onAllowed()) },
    ],
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Brings scheduled reminders in line with the profile. Safe to call often. */
export async function syncReminders(profile: Profile | null) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (n) =>
          n.identifier === DAILY_ID ||
          n.identifier === DIGEST_ID ||
          n.identifier.startsWith(RECAP_PREFIX) ||
          n.identifier.startsWith(ANNIVERSARY_PREFIX),
      )
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!profile || !(await notificationsAllowed())) return;

  if (profile.reminder_enabled && profile.reminder_time) {
    const [hour, minute] = profile.reminder_time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: { title: 'Daily Few', body: 'Today’s card is waiting.', data: { url: '/' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }

  if (weeklyDigestEnabled()) {
    await Notifications.scheduleNotificationAsync({
      identifier: DIGEST_ID,
      content: { title: 'Daily Few', body: 'Your week is ready.', data: { url: '/week' } },
      // Weekday 1 is Sunday.
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 18, minute: 0 },
    });
  }

  // "A year ago today you answered…", for the coming month. Rescheduled on
  // every app open, so later anniversaries get added as they come into range.
  if (anniversariesEnabled()) {
    try {
      for (const a of (await getUpcomingAnniversaries(ANNIVERSARY_DAYS_AHEAD)).slice(0, ANNIVERSARY_MAX)) {
        const [y, m, d] = a.date.split('-').map(Number);
        await Notifications.scheduleNotificationAsync({
          identifier: `${ANNIVERSARY_PREFIX}${a.date}`,
          content: {
            title: 'A year ago today',
            body: `You answered “${a.question}” Has your answer changed?`,
            data: { url: `/draw?card=${a.cardId}` },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(y, m - 1, d, ANNIVERSARY_HOUR, 0, 0) },
        });
      }
    } catch {
      // Anniversaries are a nice-to-have; never let them block the others.
    }
  }

  // One notification per upcoming month-end, each naming its own month.
  const now = new Date();
  for (let i = 1; i <= RECAP_MONTHS_AHEAD; i++) {
    const fires = new Date(now.getFullYear(), now.getMonth() + i, 1, RECAP_HOUR, 0, 0);
    const ended = new Date(fires.getFullYear(), fires.getMonth() - 1, 1);
    const month = `${ended.getFullYear()}-${pad(ended.getMonth() + 1)}`;
    await Notifications.scheduleNotificationAsync({
      identifier: `${RECAP_PREFIX}${month}`,
      content: {
        title: 'Daily Few',
        body: `Your ${monthName(ended)} is ready. Take a look back.`,
        data: { url: `/recap?month=${month}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fires },
    });
  }
}
