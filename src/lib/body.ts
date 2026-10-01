// Body check-in: a quick daily rating of how the body feels, and the patterns
// that show up over a month. Private to the person, never used for marketing,
// never in admin reports. For reflection, not medical advice.
// Ratings and symptoms sync to the server; period days stay on the phone.

import { addDays, localDate, parseLocalDate } from './dates';
import { supabase } from './supabase';

// `steps` names each point on the 1 to 5 scale, so a tap reads as a word.
export const METRICS = [
  { key: 'energy', label: 'Energy', low: 'Drained', high: 'Full', steps: ['Drained', 'Low', 'Okay', 'Good', 'Full'] },
  { key: 'mood', label: 'Mood', low: 'Low', high: 'Bright', steps: ['Low', 'Flat', 'Okay', 'Good', 'Bright'] },
  { key: 'sleep', label: 'Sleep', low: 'Rough', high: 'Rested', steps: ['Rough', 'Restless', 'Okay', 'Good', 'Rested'] },
  { key: 'stress', label: 'Stress', low: 'Calm', high: 'Stretched', steps: ['Calm', 'Mostly calm', 'Some', 'High', 'Stretched'] },
  { key: 'cravings', label: 'Cravings', low: 'None', high: 'Strong', steps: ['None', 'Mild', 'Some', 'Noticeable', 'Strong'] },
] as const;

export type MetricKey = (typeof METRICS)[number]['key'];

/**
 * Optional symptom chips. `line` is the short note shown when one is tapped;
 * `read` is the short read it links to, if there is one.
 * Keep the keys in step with the check in 20261001000009_body_symptoms.sql.
 */
export const SYMPTOMS = [
  {
    key: 'headache',
    label: 'Headache',
    line: 'Headaches can follow short sleep, skipped meals, stress or the days around your period. Your recap will show if yours cluster.',
    read: null,
  },
  {
    key: 'bloating',
    label: 'Bloating',
    line: 'Bloating often tags along with the week before a period, a rushed lunch or a stressful day. Your recap will show which it is for you.',
    read: 'bloating-and-your-cycle',
  },
  {
    key: 'aches',
    label: 'Aches or cramps',
    line: 'Achy days are worth noting. If cramps regularly stop you doing normal things, that’s worth raising with your doctor.',
    read: null,
  },
  {
    key: 'brain-fog',
    label: 'Brain fog',
    line: 'Sleep, stress, low iron and shifting hormones can all turn the lights down. Brain fog usually has a reason.',
    read: 'brain-fog',
  },
  {
    key: 'anxious',
    label: 'Anxious',
    line: 'Anxiety can have a physical side too, like a short night, caffeine or the week before your period. It’s real either way.',
    read: 'anxiety-from-nowhere',
  },
  {
    key: 'hot-flashes',
    label: 'Hot flashes or night sweats',
    line: 'These are one of the best-known signs of shifting hormones in perimenopause, and very treatable. Worth mentioning to your doctor.',
    read: 'perimenopause-signs-people-miss',
  },
  {
    key: 'skin',
    label: 'Skin breakouts',
    line: 'Breakouts often follow your cycle, stress or sleep. If they stick around alongside irregular periods, mention it to your doctor.',
    read: null,
  },
] as const;

export type SymptomKey = (typeof SYMPTOMS)[number]['key'];

/** `period` comes from this phone only; everything else syncs. */
export type CheckIn = { day: string; period: boolean; symptoms: SymptomKey[] } & Record<MetricKey, number | null>;

const SELECT = 'day, energy, mood, sleep, stress, cravings, symptoms';

// ---------------------------------------------------------------------------
// Period days: kept on this phone only, never sent to the server.
// ---------------------------------------------------------------------------

export async function userId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

const periodKey = (uid: string) => `period-days:${uid}`;
const movedKey = (uid: string) => `period-days-moved:${uid}`;

function readPeriodDays(uid: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(periodKey(uid)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writePeriodDays(uid: string, days: Set<string>) {
  localStorage.setItem(periodKey(uid), JSON.stringify([...days].sort()));
}

/**
 * Period days used to be saved on the server. Once per person on this phone,
 * copy any that are there to the phone, then clear them from the server.
 */
async function movePeriodDaysToPhone(uid: string) {
  if (localStorage.getItem(movedKey(uid))) return;
  const { data, error } = await supabase.from('body_checkins').select('day').eq('period', true);
  if (!error && data?.length) {
    const days = readPeriodDays(uid);
    for (const r of data) days.add(r.day as string);
    writePeriodDays(uid, days);
    const { error: clearError } = await supabase.from('body_checkins').update({ period: false }).eq('period', true);
    if (clearError) return; // Try again next time.
  }
  // An error on the select means the column is gone: nothing left to move.
  localStorage.setItem(movedKey(uid), '1');
}

/** Called when the account is deleted, so nothing is left behind on the phone. */
export function forgetPeriodDays(uid: string) {
  try {
    localStorage.removeItem(periodKey(uid));
    localStorage.removeItem(movedKey(uid));
  } catch {}
}

type Row = Omit<CheckIn, 'period'>;
const EMPTY_ROW = { energy: null, mood: null, sleep: null, stress: null, cravings: null, symptoms: [] as SymptomKey[] };

export async function getCheckIn(day = localDate()): Promise<CheckIn | null> {
  const uid = await userId();
  await movePeriodDaysToPhone(uid);
  const { data, error } = await supabase.from('body_checkins').select(SELECT).eq('day', day).maybeSingle();
  if (error) throw new Error(error.message);
  const period = readPeriodDays(uid).has(day);
  if (!data && !period) return null;
  return { ...EMPTY_ROW, day, ...(data as Row | null), period };
}

export async function saveCheckIn(values: Omit<CheckIn, 'day'>, day = localDate()) {
  const uid = await userId();
  const { period, ...synced } = values;
  if (METRICS.some((m) => synced[m.key] != null) || synced.symptoms.length > 0) {
    const { error } = await supabase.from('body_checkins').upsert({ day, ...synced }, { onConflict: 'user_id,day' });
    if (error) throw new Error(error.message);
  } else {
    // Nothing left to sync for the day: don't keep an empty row.
    const { error } = await supabase.from('body_checkins').delete().eq('day', day);
    if (error) throw new Error(error.message);
  }
  const days = readPeriodDays(uid);
  if (period) days.add(day);
  else days.delete(day);
  writePeriodDays(uid, days);
}

/** Check-ins from `from` to `to` inclusive ("YYYY-MM-DD"), oldest first, with this phone's period days. */
export async function getCheckIns(from: string, to: string): Promise<CheckIn[]> {
  const uid = await userId();
  await movePeriodDaysToPhone(uid);
  const { data, error } = await supabase
    .from('body_checkins')
    .select(SELECT)
    .gte('day', from)
    .lte('day', to)
    .order('day');
  if (error) throw new Error(error.message);
  const period = readPeriodDays(uid);
  const byDay = new Map<string, CheckIn>();
  for (const r of (data ?? []) as Row[]) byDay.set(r.day, { ...r, period: period.has(r.day) });
  for (const d of period) {
    if (d >= from && d <= to && !byDay.has(d)) byDay.set(d, { ...EMPTY_ROW, day: d, period: true });
  }
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}

/**
 * How often each symptom showed up this month, and how many of those days fell
 * in the week before a period.
 */
export function symptomSummary(month: CheckIn[], recent: CheckIn[]) {
  const pre = premenstrualDays(recent);
  return SYMPTOMS.map((s) => {
    const days = month.filter((c) => c.symptoms.includes(s.key));
    return { ...s, count: days.length, beforePeriod: days.filter((c) => pre.has(c.day)).length };
  })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
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
  // The same words as the check-in itself, for the month's average.
  const m = METRICS.find((x) => x.key === key)!;
  return m.steps[Math.min(4, Math.max(0, Math.round(value) - 1))];
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
export type Pattern = { text: string; key: 'sleep-mood' | 'stress-cravings' | 'premenstrual' };

export function findPatterns(month: CheckIn[], recent: CheckIn[]): Pattern[] {
  const patterns: Pattern[] = [];

  if (month.length >= MIN_DAYS) {
    // Sleep is rated about last night, so it's compared with the same day's
    // mood and energy.
    const afterRough = month.filter((c) => c.sleep != null && c.sleep <= 2);
    const afterRested = month.filter((c) => c.sleep != null && c.sleep >= 4);
    const mood = compare(afterRough, afterRested, 'mood');
    if (mood != null && mood <= -MEANINGFUL) patterns.push({ key: 'sleep-mood', text: 'After rough sleep, your mood tended to be lower.' });
    const energy = compare(afterRough, afterRested, 'energy');
    if (energy != null && energy <= -MEANINGFUL) patterns.push({ key: 'sleep-mood', text: 'After rough sleep, your energy tended to be lower.' });

    // Stress and mood on the same day.
    const stressed = month.filter((c) => (c.stress ?? 0) >= 4);
    const calm = month.filter((c) => c.stress != null && c.stress <= 2);
    const stressMood = compare(stressed, calm, 'mood');
    if (stressMood != null && stressMood <= -MEANINGFUL) patterns.push({ key: 'stress-cravings', text: 'On your most stretched days, your mood dipped too.' });
    const stressCravings = compare(stressed, calm, 'cravings');
    if (stressCravings != null && stressCravings >= MEANINGFUL) patterns.push({ key: 'stress-cravings', text: 'Your cravings were stronger on high-stress days.' });
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
      patterns.push({ key: 'premenstrual', text: `In the week before your period, your ${m.label.toLowerCase()} ${verb} ${word} than usual.` });
    }
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// Discoveries: lasting things someone has learned about their body, from their
// own check-ins. Worked out on the phone (some come from period days, which
// never leave it). Stricter than the monthly patterns: each needs enough days
// on both sides of the comparison, and they include what helps, not only
// what's hard. They never diagnose: they describe what her own data shows.
//
// What counts as what (all from the check-in's 1 to 5 taps):
//   rough night    Sleep 1 (Rough) or 2 (Restless)
//   rested night   Sleep 4 (Good) or 5 (Rested)
//   stretched day  Stress 4 (High) or 5 (Stretched)
//   calm day       Stress 1 (Calm) or 2 (Mostly calm)
//   low/high day   Energy or mood 1-2 / 4-5
//   week before    the 7 days before each period start (period days are on the phone)
// A difference counts when the averages differ by at least 0.7 on the 1 to 5
// scale (0.5 for the gentler "what helps" ones), or a symptom is at least 25
// points more likely, with at least 3 days on each side.
// ---------------------------------------------------------------------------

export type DiscoveryTopic = 'cycle' | 'energy-sleep' | 'stress' | 'helps' | 'signals' | 'rhythm';

export type Discovery = {
  key: string;
  topic: DiscoveryTopic;
  text: string;
  evidence: string;
  read: string | null;
};

const SYMPTOM_PHRASE: Record<SymptomKey, string> = {
  headache: 'Headaches tend',
  bloating: 'Bloating tends',
  aches: 'Aches and cramps tend',
  'brain-fog': 'Brain fog tends',
  anxious: 'Feeling anxious tends',
  'hot-flashes': 'Hot flashes and night sweats tend',
  skin: 'Breakouts tend',
};

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const has = (list: CheckIn[], key: MetricKey) => list.filter((c) => c[key] != null).length;
/** Share of these days that had the symptom. */
const rate = (list: CheckIn[], s: SymptomKey) => (list.length ? list.filter((c) => c.symptoms.includes(s)).length / list.length : 0);

/**
 * Everything her check-ins clearly show. `reflectedDays`: days she answered a
 * card or wrote about her day ("YYYY-MM-DD").
 */
export function findDiscoveries(checkIns: CheckIn[], reflectedDays: Set<string> = new Set()): Discovery[] {
  const out: Discovery[] = [];
  const rated = checkIns.filter((c) => METRICS.some((m) => c[m.key] != null) || c.symptoms.length > 0);

  // --- Sleep -----------------------------------------------------------------
  const rough = rated.filter((c) => c.sleep != null && c.sleep <= 2);
  const rested = rated.filter((c) => c.sleep != null && c.sleep >= 4);
  const notRough = rated.filter((c) => c.sleep != null && c.sleep >= 3);
  if (rough.length >= 3 && rested.length >= 3) {
    const mood = compare(rough, rested, 'mood');
    if (mood != null && mood <= -MEANINGFUL) {
      out.push({ key: 'sleep-mood', topic: 'energy-sleep', text: 'After a rough night, your mood tends to dip.', evidence: `Seen across ${plural(rough.length, 'rough night')}`, read: 'sleep-and-mood' });
    }
    const energy = compare(rested, rough, 'energy');
    if (energy != null && energy >= MEANINGFUL) {
      out.push({ key: 'helps-rest', topic: 'helps', text: 'Your best-energy days come after a well-rested night.', evidence: `Seen across ${plural(rested.length, 'rested night')}`, read: null });
    }
    const cravings = compare(rough, rested, 'cravings');
    if (cravings != null && cravings >= MEANINGFUL) {
      out.push({ key: 'sleep-cravings', topic: 'energy-sleep', text: 'After a rough night, your cravings run stronger.', evidence: `Seen across ${plural(rough.length, 'rough night')}`, read: 'whats-behind-a-craving' });
    }
  }
  if (rough.length >= 3 && notRough.length >= 3) {
    for (const s of SYMPTOMS) {
      const days = rated.filter((c) => c.symptoms.includes(s.key)).length;
      if (days >= 3 && rate(rough, s.key) - rate(notRough, s.key) >= 0.25) {
        out.push({ key: `sleep-symptom-${s.key}`, topic: 'energy-sleep', text: `${SYMPTOM_PHRASE[s.key]} to show up after a rough night.`, evidence: `${plural(rough.filter((c) => c.symptoms.includes(s.key)).length, 'time')} after ${plural(rough.length, 'rough night')}`, read: s.read ?? 'sleep-and-mood' });
      }
    }
  }

  // --- Stress ----------------------------------------------------------------
  const stretched = rated.filter((c) => (c.stress ?? 0) >= 4);
  const calm = rated.filter((c) => c.stress != null && c.stress <= 2);
  if (stretched.length >= 3 && calm.length >= 3) {
    const mood = compare(calm, stretched, 'mood');
    if (mood != null && mood >= MEANINGFUL) {
      out.push({ key: 'helps-calm', topic: 'helps', text: 'Your mood is brightest on your calmer days.', evidence: `Seen across ${plural(calm.length, 'calm day')}`, read: null });
    }
    const cravings = compare(stretched, calm, 'cravings');
    if (cravings != null && cravings >= MEANINGFUL) {
      out.push({ key: 'stress-cravings', topic: 'stress', text: 'Your cravings are stronger on your most stretched days.', evidence: `Seen across ${plural(stretched.length, 'stretched day')}`, read: 'stress-and-cravings' });
    }
    const sleep = compare(stretched, calm, 'sleep');
    if (sleep != null && sleep <= -MEANINGFUL) {
      out.push({ key: 'stress-sleep', topic: 'stress', text: 'Your sleep tends to suffer on your most stretched days.', evidence: `Seen across ${plural(stretched.length, 'stretched day')}`, read: 'waking-at-3am' });
    }
    const notStretched = rated.filter((c) => c.stress != null && c.stress <= 3);
    for (const s of SYMPTOMS) {
      const days = rated.filter((c) => c.symptoms.includes(s.key)).length;
      if (days >= 3 && rate(stretched, s.key) - rate(notStretched, s.key) >= 0.25) {
        out.push({ key: `stress-symptom-${s.key}`, topic: 'stress', text: `${SYMPTOM_PHRASE[s.key]} to show up on your most stretched days.`, evidence: `${plural(stretched.filter((c) => c.symptoms.includes(s.key)).length, 'time')} on ${plural(stretched.length, 'stretched day')}`, read: s.read ?? 'stress-and-your-cycle' });
      }
    }
  }

  // --- Energy and mood together ----------------------------------------------
  const lowEnergy = rated.filter((c) => c.energy != null && c.energy <= 2);
  const highEnergy = rated.filter((c) => c.energy != null && c.energy >= 4);
  if (lowEnergy.length >= 3 && highEnergy.length >= 3) {
    const mood = compare(lowEnergy, highEnergy, 'mood');
    if (mood != null && mood <= -1) {
      out.push({ key: 'energy-mood', topic: 'signals', text: 'When your energy runs low, your mood tends to follow.', evidence: `Seen across ${plural(lowEnergy.length, 'low-energy day')}`, read: 'wired-but-tired' });
    }
  }

  // --- Reflecting --------------------------------------------------------------
  const reflected = rated.filter((c) => reflectedDays.has(c.day));
  const notReflected = rated.filter((c) => !reflectedDays.has(c.day));
  if (has(reflected, 'mood') >= 3 && has(notReflected, 'mood') >= 3) {
    const mood = compare(reflected, notReflected, 'mood');
    if (mood != null && mood >= 0.5) {
      out.push({ key: 'helps-reflect', topic: 'helps', text: 'You tend to feel brighter on days you take a few minutes to reflect.', evidence: `Seen across ${plural(reflected.length, 'day')} you answered or wrote`, read: null });
    }
  }

  // --- Weekly rhythm (needs about four weeks) ---------------------------------
  if (rated.length >= 20) {
    const best: Record<string, string[]> = {};
    const worst: Record<string, string[]> = {};
    for (const key of ['energy', 'mood'] as const) {
      const overall = avg(rated.map((c) => c[key]).filter((v): v is number => v != null));
      if (overall == null) continue;
      const scored = WEEKDAYS.map((_, i) => {
        const days = rated.filter((c) => c[key] != null && parseLocalDate(c.day).getDay() === i);
        return { i, n: days.length, v: avg(days.map((c) => c[key] as number)) };
      }).filter((d) => d.n >= 3 && d.v != null) as { i: number; n: number; v: number }[];
      if (scored.length < 4) continue;
      const top = scored.reduce((a, b) => (b.v > a.v ? b : a));
      const low = scored.reduce((a, b) => (b.v < a.v ? b : a));
      if (top.v - overall >= 0.6) (best[WEEKDAYS[top.i]] ??= []).push(key);
      if (overall - low.v >= 0.6) (worst[WEEKDAYS[low.i]] ??= []).push(key);
    }
    const what = (keys: string[]) => (keys.length === 2 ? 'energy and mood' : keys[0]);
    for (const [day, keys] of Object.entries(best)) {
      out.push({ key: 'rhythm-best', topic: 'rhythm', text: `Your ${what(keys)} tend${keys.length === 2 ? '' : 's'} to be at ${keys.length === 2 ? 'their' : 'its'} best on ${day}.`, evidence: 'Across the last few weeks of check-ins', read: null });
    }
    for (const [day, keys] of Object.entries(worst)) {
      out.push({ key: 'rhythm-low', topic: 'rhythm', text: `${day} tend to be your lowest day for ${what(keys)}.`, evidence: 'Across the last few weeks of check-ins', read: keys.includes('energy') ? 'the-afternoon-crash' : null });
    }
  }

  // --- Cycle: only with at least two cycles of check-ins to compare ------------
  const pre = premenstrualDays(checkIns);
  const periodDays = new Set(checkIns.filter((c) => c.period).map((c) => c.day));
  const starts = [...periodDays].filter((d) => !periodDays.has(localDate(addDays(parseLocalDate(d), -1))));
  const cycles = starts.length;
  if (cycles >= 2) {
    const inWeek = rated.filter((c) => pre.has(c.day));
    const rest = rated.filter((c) => !pre.has(c.day) && !c.period);
    const phrases: Record<MetricKey, [string, string]> = {
      energy: ['runs lower', 'runs higher'],
      mood: ['dips', 'lifts'],
      sleep: ['is rougher', 'is better'],
      stress: ['eases', 'runs higher'],
      cravings: ['quiet down', 'get stronger'],
    };
    const shifts: string[] = [];
    for (const m of METRICS) {
      if (has(inWeek, m.key) < 3) continue;
      const d = compare(inWeek, rest, m.key);
      if (d == null || Math.abs(d) < MEANINGFUL) continue;
      shifts.push(`your ${m.label.toLowerCase()} ${phrases[m.key][d > 0 ? 1 : 0]}`);
    }
    if (shifts.length) {
      const list = shifts.length === 1 ? shifts[0] : `${shifts.slice(0, -1).join(', ')} and ${shifts[shifts.length - 1]}`;
      out.push({
        key: 'pre-week',
        topic: 'cycle',
        text: `In the week before your period, ${list}.`,
        evidence: `Across ${plural(cycles, 'cycle')} of check-ins`,
        read: 'the-week-before-your-period',
      });
    }
    for (const s of SYMPTOMS) {
      const days = rated.filter((c) => c.symptoms.includes(s.key));
      const before = days.filter((c) => pre.has(c.day)).length;
      if (days.length < 3 || before / days.length < 0.6) continue;
      out.push({
        key: `pre-symptom-${s.key}`,
        topic: 'cycle',
        text: `${SYMPTOM_PHRASE[s.key]} to show up the week before your period.`,
        evidence: `${before} of ${days.length} times, across ${plural(cycles, 'cycle')}`,
        read: s.read ?? 'the-week-before-your-period',
      });
    }
    // The good news side: energy coming back once a period is over.
    const after = new Set<string>();
    for (const s of starts) {
      let end = parseLocalDate(s);
      while (periodDays.has(localDate(addDays(end, 1)))) end = addDays(end, 1);
      for (let i = 1; i <= 5; i++) after.add(localDate(addDays(end, i)));
    }
    const afterDays = rated.filter((c) => after.has(c.day));
    if (has(afterDays, 'energy') >= 3 && has(inWeek, 'energy') >= 3) {
      const lift = compare(afterDays, inWeek, 'energy');
      if (lift != null && lift >= MEANINGFUL) {
        out.push({ key: 'cycle-after', topic: 'cycle', text: 'Your energy picks back up in the days after your period.', evidence: `Across ${plural(cycles, 'cycle')} of check-ins`, read: 'what-counts-as-a-regular-cycle' });
      }
    }
  }

  return out;
}
