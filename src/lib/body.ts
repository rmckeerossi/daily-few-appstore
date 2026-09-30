// Body check-in: a quick daily rating of how the body feels, and the patterns
// that show up over a month. Private to the person, never used for marketing,
// never in admin reports. For reflection, not medical advice.

import { addDays, localDate, parseLocalDate } from './dates';
import { supabase } from './supabase';

export const METRICS = [
  { key: 'energy', label: 'Energy', low: 'Drained', high: 'Full' },
  { key: 'mood', label: 'Mood', low: 'Low', high: 'Bright' },
  { key: 'sleep', label: 'Sleep', low: 'Rough', high: 'Rested' },
  { key: 'stress', label: 'Stress', low: 'Calm', high: 'Stretched' },
  { key: 'cravings', label: 'Cravings', low: 'None', high: 'Strong' },
] as const;

export type MetricKey = (typeof METRICS)[number]['key'];

export type CheckIn = { day: string; period: boolean } & Record<MetricKey, number | null>;

const SELECT = 'day, energy, mood, sleep, stress, cravings, period';

export async function getCheckIn(day = localDate()): Promise<CheckIn | null> {
  const { data, error } = await supabase.from('body_checkins').select(SELECT).eq('day', day).maybeSingle();
  if (error) throw new Error(error.message);
  return data as CheckIn | null;
}

export async function saveCheckIn(values: Omit<CheckIn, 'day'>, day = localDate()) {
  const { error } = await supabase.from('body_checkins').upsert({ day, ...values }, { onConflict: 'user_id,day' });
  if (error) throw new Error(error.message);
}

/** Check-ins from `from` to `to` inclusive ("YYYY-MM-DD"), oldest first. */
export async function getCheckIns(from: string, to: string): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('body_checkins')
    .select(SELECT)
    .gte('day', from)
    .lte('day', to)
    .order('day');
  if (error) throw new Error(error.message);
  return (data ?? []) as CheckIn[];
}

// Showing it on Home is a setting on this phone.
const HIDDEN_KEY = 'body-checkin-hidden';

export function checkInShown(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) !== '1';
  } catch {
    return true;
  }
}

export function setCheckInShown(shown: boolean) {
  try {
    if (shown) localStorage.removeItem(HIDDEN_KEY);
    else localStorage.setItem(HIDDEN_KEY, '1');
  } catch {}
}

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function averages(checkIns: CheckIn[]): Record<MetricKey, number | null> {
  const out = {} as Record<MetricKey, number | null>;
  for (const m of METRICS) out[m.key] = avg(checkIns.map((c) => c[m.key]).filter((v): v is number => v != null));
  return out;
}

/** Words for an average, so the recap reads like a sentence, not a score. */
export function describe(key: MetricKey, value: number | null): string {
  if (value == null) return 'Not logged';
  const m = METRICS.find((x) => x.key === key)!;
  if (value <= 2) return m.low;
  if (value >= 4) return m.high;
  return 'In between';
}

const MIN_DAYS = 5;
/** A difference smaller than this on a 1–5 scale is noise, not a pattern. */
const MEANINGFUL = 0.7;

/** Days in the week before each period start (not counting the start itself). */
function premenstrualDays(checkIns: CheckIn[]): Set<string> {
  const periodDays = new Set(checkIns.filter((c) => c.period).map((c) => c.day));
  const starts = [...periodDays].filter((d) => !periodDays.has(localDate(addDays(parseLocalDate(d), -1))));
  const days = new Set<string>();
  for (const s of starts) {
    for (let i = 1; i <= 7; i++) days.add(localDate(addDays(parseLocalDate(s), -i)));
  }
  return days;
}

function compare(a: CheckIn[], b: CheckIn[], key: MetricKey) {
  const va = avg(a.map((c) => c[key]).filter((v): v is number => v != null));
  const vb = avg(b.map((c) => c[key]).filter((v): v is number => v != null));
  if (va == null || vb == null) return null;
  const aCount = a.filter((c) => c[key] != null).length;
  const bCount = b.filter((c) => c[key] != null).length;
  if (aCount < 2 || bCount < 2) return null;
  return va - vb;
}

/**
 * Plain-language observations from their own check-ins. Only reported when the
 * difference is meaningful and there's enough data. Never advice.
 * `recent` should cover about three months, so cycle patterns have room to show.
 */
export function findPatterns(month: CheckIn[], recent: CheckIn[]): string[] {
  const patterns: string[] = [];

  if (month.length >= MIN_DAYS) {
    // Sleep is rated about last night, so it's compared with the same day's
    // mood and energy.
    const afterRough = month.filter((c) => c.sleep != null && c.sleep <= 2);
    const afterRested = month.filter((c) => c.sleep != null && c.sleep >= 4);
    const mood = compare(afterRough, afterRested, 'mood');
    if (mood != null && mood <= -MEANINGFUL) patterns.push('After rough sleep, your mood tended to be lower.');
    const energy = compare(afterRough, afterRested, 'energy');
    if (energy != null && energy <= -MEANINGFUL) patterns.push('After rough sleep, your energy tended to be lower.');

    // Stress and mood on the same day.
    const stressed = month.filter((c) => (c.stress ?? 0) >= 4);
    const calm = month.filter((c) => c.stress != null && c.stress <= 2);
    const stressMood = compare(stressed, calm, 'mood');
    if (stressMood != null && stressMood <= -MEANINGFUL) patterns.push('On your most stretched days, your mood dipped too.');
    const stressCravings = compare(stressed, calm, 'cravings');
    if (stressCravings != null && stressCravings >= MEANINGFUL) patterns.push('Your cravings were stronger on high-stress days.');
  }

  // The week before a period, across the last few months.
  const pre = premenstrualDays(recent);
  if (pre.size > 0 && recent.length >= MIN_DAYS * 2) {
    const inWeek = recent.filter((c) => pre.has(c.day));
    const rest = recent.filter((c) => !pre.has(c.day) && !c.period);
    const phrases: Record<MetricKey, [string, string]> = {
      energy: ['lower', 'higher'],
      mood: ['lower', 'brighter'],
      sleep: ['rougher', 'better'],
      stress: ['calmer', 'higher'],
      cravings: ['quieter', 'stronger'],
    };
    for (const m of METRICS) {
      const d = compare(inWeek, rest, m.key);
      if (d == null || Math.abs(d) < MEANINGFUL) continue;
      const word = d > 0 ? phrases[m.key][1] : phrases[m.key][0];
      const verb = m.key === 'cravings' ? 'were' : 'was';
      patterns.push(`In the week before your period, your ${m.label.toLowerCase()} ${verb} ${word} than usual.`);
    }
  }

  return patterns;
}
