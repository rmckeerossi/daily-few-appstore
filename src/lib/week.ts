// Weekly digest: a calm look back at the week (Monday to Sunday), ready on
// Sunday evening. Everything is worked out on the phone from what they already
// saved: check-ins, answers and period days. The only thing stored for it is
// the intention they carry into the next week (weekly_intentions).

import {
  averages,
  describe,
  findDiscoveries,
  getCheckIns,
  METRICS,
  SYMPTOMS,
  userId,
  type CheckIn,
  type Discovery,
  type MetricKey,
} from './body';
import { getAnswers, type AnswerRow } from './data';
import { addDays, localDate, parseLocalDate } from './dates';
import { supabase } from './supabase';

/** The digest for a week opens from Sunday at this hour. */
export const DIGEST_HOUR = 17;

export function mondayOf(d = new Date()): string {
  const day = d.getDay(); // 0 = Sunday
  return localDate(addDays(d, day === 0 ? -6 : 1 - day));
}

/** The newest week with a digest: this week from Sunday evening, otherwise last week. */
export function latestDigestWeek(now = new Date()): string {
  const thisWeek = mondayOf(now);
  const ready = now.getDay() === 0 && now.getHours() >= DIGEST_HOUR;
  return ready ? thisWeek : localDate(addDays(parseLocalDate(thisWeek), -7));
}

export function weekLabel(weekStart: string): string {
  const start = parseLocalDate(weekStart);
  const end = addDays(start, 6);
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()} to ${end.getDate()}`
    : `${month(start)} ${start.getDate()} to ${month(end)} ${end.getDate()}`;
}

// ---------------------------------------------------------------------------
// Intentions (synced, private)
// ---------------------------------------------------------------------------

export type Outcome = 'mostly' | 'a_little' | 'not_this_week';
export type Intention = { week_start: string; body: string; outcome: Outcome | null };

export async function getIntention(weekStart: string): Promise<Intention | null> {
  const { data, error } = await supabase
    .from('weekly_intentions')
    .select('week_start, body, outcome')
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Intention | null;
}

export async function saveIntention(weekStart: string, body: string) {
  const { error } = await supabase
    .from('weekly_intentions')
    .upsert({ week_start: weekStart, body: body.trim() }, { onConflict: 'user_id,week_start' });
  if (error) throw new Error(error.message);
}

export async function setOutcome(weekStart: string, outcome: Outcome) {
  const { error } = await supabase.from('weekly_intentions').update({ outcome }).eq('week_start', weekStart);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Discoveries: worked out on the phone; which ones they've seen is kept here too
// ---------------------------------------------------------------------------

export type SavedDiscovery = Discovery & { firstSeen: string | null; isNew: boolean };

const seenKey = (uid: string) => `discoveries-seen:${uid}`;

function readSeen(uid: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(seenKey(uid)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export async function markDiscoveriesSeen(keys: string[]) {
  if (keys.length === 0) return;
  const uid = await userId();
  const seen = readSeen(uid);
  for (const k of keys) seen[k] ??= localDate();
  try {
    localStorage.setItem(seenKey(uid), JSON.stringify(seen));
  } catch {}
}

const answeredDaysOf = (answers: AnswerRow[]) => new Set(answers.map((a) => a.answered_on));

/** Everything they've discovered so far, newest first; unseen ones are marked new. */
export async function getDiscoveries(): Promise<SavedDiscovery[]> {
  const uid = await userId();
  const today = new Date();
  const [checkIns, answers] = await Promise.all([
    getCheckIns(localDate(addDays(today, -120)), localDate(today)),
    getAnswers().catch(() => [] as AnswerRow[]),
  ]);
  const seen = readSeen(uid);
  return findDiscoveries(checkIns, answeredDaysOf(answers))
    .map((d) => ({ ...d, firstSeen: seen[d.key] ?? null, isNew: !seen[d.key] }))
    .sort((a, b) => Number(b.isNew) - Number(a.isNew) || (b.firstSeen ?? '').localeCompare(a.firstSeen ?? ''));
}

// ---------------------------------------------------------------------------
// The digest
// ---------------------------------------------------------------------------

export type FeltRow = { key: MetricKey; label: string; text: string };

export type Digest = {
  weekStart: string;
  label: string;
  quiet: boolean;
  headline: string;
  gentle: boolean;
  words: { text: string; question: string; day: string } | null;
  felt: FeltRow[];
  comparedTo: 'normal' | 'last week' | null;
  symptoms: string | null;
  helped: Discovery | null;
  discoveries: SavedDiscovery[];
  lastIntention: Intention | null;
  nextIntention: Intention | null;
  nextStepRead: string | null;
};

const HIGHER: Record<MetricKey, string> = {
  energy: 'Higher',
  mood: 'Brighter',
  sleep: 'More rested',
  stress: 'More stretched',
  cravings: 'Stronger',
};
const LOWER: Record<MetricKey, string> = {
  energy: 'Lower',
  mood: 'Lower',
  sleep: 'Rougher',
  stress: 'Calmer',
  cravings: 'Quieter',
};

/** A line of their own words: the first sentence of something they wrote. */
function firstLine(body: string): string {
  const text = body.trim().replace(/\s+/g, ' ');
  const sentence = /^.+?[.!?](\s|$)/.exec(text)?.[0].trim() ?? text;
  if (sentence.length <= 160) return sentence;
  return `${sentence.slice(0, 157).replace(/\s+\S*$/, '')}…`;
}

const inRange = (day: string, from: string, to: string) => day >= from && day <= to;

export async function getDigest(weekStart: string): Promise<Digest> {
  const start = parseLocalDate(weekStart);
  const weekEnd = localDate(addDays(start, 6));
  const nextWeek = localDate(addDays(start, 7));
  const [checkIns, answers, lastIntention, nextIntention, discoveries] = await Promise.all([
    getCheckIns(localDate(addDays(start, -35)), weekEnd),
    getAnswers().catch(() => [] as AnswerRow[]),
    getIntention(weekStart).catch(() => null),
    getIntention(nextWeek).catch(() => null),
    getDiscoveries().catch(() => [] as SavedDiscovery[]),
  ]);

  const week = checkIns.filter((c) => inRange(c.day, weekStart, weekEnd));
  const lastWeek = checkIns.filter((c) => inRange(c.day, localDate(addDays(start, -7)), localDate(addDays(start, -1))));
  const normal = checkIns.filter((c) => inRange(c.day, localDate(addDays(start, -28)), localDate(addDays(start, -1))));
  const weekAnswers = answers.filter((a) => inRange(a.answered_on, weekStart, weekEnd));
  const quiet = week.length === 0 && weekAnswers.length === 0;

  // Compare with their own normal once there's a month of it; until then, last week.
  const count = (list: CheckIn[], key: MetricKey) => list.filter((c) => c[key] != null).length;
  const baseline = count(normal, 'mood') >= 8 ? normal : count(lastWeek, 'mood') >= 3 ? lastWeek : null;
  const comparedTo = baseline === normal ? 'normal' : baseline ? 'last week' : null;
  const now = averages(week);
  const before = baseline ? averages(baseline) : null;
  const diff = (key: MetricKey) => (before && now[key] != null && before[key] != null ? now[key]! - before[key]! : null);

  const roughNights = week.filter((c) => c.sleep != null && c.sleep <= 2).length;
  const felt: FeltRow[] = (['energy', 'mood', 'sleep', 'stress'] as MetricKey[])
    .filter((key) => now[key] != null)
    .map((key) => {
      const label = METRICS.find((m) => m.key === key)!.label;
      if (key === 'sleep' && roughNights >= 3) return { key, label, text: `Rough on ${roughNights} nights` };
      const d = diff(key);
      const than = comparedTo === 'normal' ? 'than usual' : 'than last week';
      if (d == null) return { key, label, text: `Mostly ${describe(key, now[key]).toLowerCase()}` };
      if (d >= 0.5) return { key, label, text: `${HIGHER[key]} ${than}` };
      if (d <= -0.5) return { key, label, text: `${LOWER[key]} ${than}` };
      return { key, label, text: comparedTo === 'normal' ? 'Usual for you' : 'About the same as last week' };
    });

  const symptomCounts = SYMPTOMS.map((s) => ({ label: s.label, n: week.filter((c) => c.symptoms.includes(s.key)).length }))
    .filter((s) => s.n > 0)
    .sort((a, b) => b.n - a.n);
  const symptoms = symptomCounts.length ? symptomCounts.map((s) => `${s.label} (${s.n})`).join(', ') : null;

  // Headline: how the week went, kindly.
  const mood = diff('mood');
  const energy = diff('energy');
  let headline = 'A steady week';
  let gentle = false;
  if (quiet) headline = 'A quiet week';
  else if (mood != null && mood >= 0.5) headline = 'A brighter week';
  else if (energy != null && energy >= 0.5) headline = 'A more energetic week';
  else if ((mood != null && mood <= -0.5) || (energy != null && energy <= -0.5)) {
    headline = 'A harder week';
    gentle = true;
  }

  const written = weekAnswers.filter((a) => a.body?.trim()).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const words = written
    ? {
        text: firstLine(written.body!),
        question: written.question_text,
        day: parseLocalDate(written.answered_on).toLocaleDateString('en-US', { weekday: 'long' }),
      }
    : null;

  // What helped: the strongest "what helps you" from the last few weeks.
  const helped = findDiscoveries(checkIns, answeredDaysOf(answers)).find((d) => d.topic === 'helps') ?? null;

  // One next step: a read that fits the week.
  const newWithRead = discoveries.find((d) => d.isNew && d.read);
  const weekSymptomRead = SYMPTOMS.find((s) => s.read && week.some((c) => c.symptoms.includes(s.key)))?.read ?? null;
  const nextStepRead =
    newWithRead?.read ??
    (roughNights >= 3 ? 'sleep-and-mood' : null) ??
    ((now.stress ?? 0) >= 3.5 ? 'stress-and-cravings' : null) ??
    weekSymptomRead;

  return {
    weekStart,
    label: weekLabel(weekStart),
    quiet,
    headline,
    gentle,
    words,
    felt,
    comparedTo,
    symptoms,
    helped,
    discoveries,
    lastIntention,
    nextIntention,
    nextStepRead,
  };
}

// Whether they've opened the newest digest yet (for the "Your week is ready" card on Home).
const openedKey = (weekStart: string) => `digest-opened:${weekStart}`;

export function digestOpened(weekStart: string): boolean {
  try {
    return localStorage.getItem(openedKey(weekStart)) === '1';
  } catch {
    return true;
  }
}

export function markDigestOpened(weekStart: string) {
  try {
    localStorage.setItem(openedKey(weekStart), '1');
  } catch {}
}

/** Whether anything was saved that week, so Home only offers a digest with something in it. */
export async function weekHasActivity(weekStart: string): Promise<boolean> {
  const end = localDate(addDays(parseLocalDate(weekStart), 6));
  const [checkIns, answers] = await Promise.all([
    getCheckIns(weekStart, end).catch(() => [] as CheckIn[]),
    supabase.from('answers').select('id', { count: 'exact', head: true }).gte('answered_on', weekStart).lte('answered_on', end),
  ]);
  return checkIns.length > 0 || (answers.count ?? 0) > 0;
}
