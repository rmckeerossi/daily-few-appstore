// Reads and writes against Supabase. Row Level Security on the server already
// limits every private table to the signed-in person; nothing here relies on the
// app to enforce privacy.

import { forgetPeriodDays } from './body';
import { addDays, daysBetween, localDate, localMonthStart, parseLocalDate } from './dates';
import { supabase } from './supabase';

export type DeckType = 'library' | 'monthly' | 'life_season' | 'body';

export type Season = { id: string; name: string; description: string | null };

export type Deck = {
  id: string;
  name: string;
  description: string | null;
  type: DeckType;
  month: string | null;
  season_id: string | null;
  sort_order: number;
};

export type DeckWithCount = Deck & { cardCount: number; categoryCount: number };

export type Category = { id: string; deck_id: string; name: string; sort_order: number };

export type Card = {
  id: string;
  question: string;
  deckId: string;
  deckName: string;
  categoryId: string;
  categoryName: string;
};

export type Profile = {
  id: string;
  first_name: string;
  phone: string | null;
  season_id: string | null;
  email_consent: boolean;
  text_consent: boolean;
  reminder_enabled: boolean;
  reminder_time: string | null;
  timezone: string | null;
  /** Added to the card links they share, so signups can be credited to them. */
  referral_code: string | null;
};

export type PastAnswer = {
  id: string;
  body: string | null;
  reflected: boolean;
  answered_on: string;
};

export type AnswerRow = PastAnswer & {
  card_id: string;
  question_text: string;
  deck_name: string;
  category_name: string;
  voice_path: string | null;
  voice_seconds: number | null;
  photo_paths: string[];
  created_at: string;
};

export type ActivityEvent =
  | 'app_open'
  | 'card_viewed'
  | 'read_opened'
  | 'card_drawn'
  | 'card_skipped'
  | 'card_answered'
  | 'card_reflected'
  | 'card_shared'
  | 'card_of_day_answered';

function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export async function getSeasons(): Promise<Season[]> {
  return must(
    await supabase.from('seasons').select('id, name, description').order('sort_order'),
  );
}

export async function getProfile(userId: string): Promise<Profile | null> {
  return must(
    await supabase
      .from('profiles')
      .select('id, first_name, phone, season_id, email_consent, text_consent, reminder_enabled, reminder_time, timezone, referral_code')
      .eq('id', userId)
      .maybeSingle(),
  );
}

/**
 * Published decks that have active cards, with their counts. A monthly deck
 * appears from the 1st of its month and stays in the library afterwards.
 */
export async function getDecks(): Promise<DeckWithCount[]> {
  const thisMonth = localMonthStart();
  const [decks, cards] = await Promise.all([
    supabase.from('decks').select('id, name, description, type, month, season_id, sort_order').order('sort_order'),
    supabase.from('cards').select('deck_id, category_id'),
  ]);
  const cardRows = must(cards) as { deck_id: string; category_id: string }[];
  return (must(decks) as Deck[])
    .map((d) => {
      const mine = cardRows.filter((c) => c.deck_id === d.id);
      return { ...d, cardCount: mine.length, categoryCount: new Set(mine.map((c) => c.category_id)).size };
    })
    .filter((d) => d.cardCount > 0 && !(d.type === 'monthly' && d.month && d.month > thisMonth));
}

/** The monthly deck featured this month, if there is one. */
export function currentMonthlyDeck<T extends Deck>(decks: T[]): T | null {
  const month = localMonthStart();
  return decks.find((d) => d.type === 'monthly' && d.month === month) ?? null;
}

export function seasonDeck<T extends Deck>(decks: T[], seasonId: string | null): T | null {
  if (!seasonId) return null;
  return decks.find((d) => d.type === 'life_season' && d.season_id === seasonId) ?? null;
}

export type CategoryProgress = Category & { total: number; answered: number };

export async function getDeckDetail(deckId: string) {
  const [deck, categories, cards] = await Promise.all([
    supabase.from('decks').select('id, name, description, type, month, season_id, sort_order').eq('id', deckId).maybeSingle(),
    supabase.from('categories').select('id, deck_id, name, sort_order').eq('deck_id', deckId).order('sort_order'),
    supabase.from('cards').select('id, category_id').eq('deck_id', deckId),
  ]);
  const cardRows = must(cards) as { id: string; category_id: string }[];
  const answered = await answeredCardIds(cardRows.map((c) => c.id));

  const withProgress: CategoryProgress[] = (must(categories) as Category[])
    .map((cat) => {
      const inCat = cardRows.filter((c) => c.category_id === cat.id);
      return { ...cat, total: inCat.length, answered: inCat.filter((c) => answered.has(c.id)).length };
    })
    .filter((c) => c.total > 0);

  return { deck: must(deck) as Deck | null, categories: withProgress, cardCount: cardRows.length };
}

async function answeredCardIds(cardIds: string[]): Promise<Set<string>> {
  if (cardIds.length === 0) return new Set();
  const rows = must(
    await supabase.from('answers').select('card_id').in('card_id', cardIds),
  ) as { card_id: string }[];
  return new Set(rows.map((r) => r.card_id));
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const CARD_SELECT = 'id, question, deck_id, category_id, decks(name), categories(name)';

type CardRow = {
  id: string;
  question: string;
  deck_id: string;
  category_id: string;
  decks: { name: string } | null;
  categories: { name: string } | null;
};

const toCard = (r: CardRow): Card => ({
  id: r.id,
  question: r.question,
  deckId: r.deck_id,
  deckName: r.decks?.name ?? '',
  categoryId: r.category_id,
  categoryName: r.categories?.name ?? '',
});

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Cards to draw from, in random order: unanswered ones first, and every card
 * again once the whole category (or deck) has been answered (PRD §4.2).
 */
export async function getDrawPool(deckId: string, categoryId: string | null) {
  let query = supabase.from('cards').select(CARD_SELECT).eq('deck_id', deckId);
  if (categoryId) query = query.eq('category_id', categoryId);
  const cards = (must(await query) as unknown as CardRow[]).map(toCard);

  const answered = await answeredCardIds(cards.map((c) => c.id));
  const unanswered = cards.filter((c) => !answered.has(c.id));
  const wasReset = cards.length > 0 && unanswered.length === 0;
  return { pool: shuffle(wasReset ? cards : unanswered), wasReset };
}

export async function getCard(cardId: string): Promise<Card | null> {
  const row = must(
    await supabase.from('cards').select(CARD_SELECT).eq('id', cardId).maybeSingle(),
  ) as unknown as CardRow | null;
  return row ? toCard(row) : null;
}

export async function getCardOfTheDay(): Promise<Card | null> {
  const { data, error } = await supabase.rpc('card_of_the_day', { p_day: localDate() });
  if (error) throw new Error(error.message);
  return data ? getCard(data as string) : null;
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export async function getPastAnswers(cardId: string): Promise<PastAnswer[]> {
  return must(
    await supabase
      .from('answers')
      .select('id, body, reflected, answered_on')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false }),
  );
}

const ANSWER_SELECT =
  'id, card_id, question_text, deck_name, category_name, body, reflected, voice_path, voice_seconds, photo_paths, answered_on, created_at';

export async function getAnswers(): Promise<AnswerRow[]> {
  return must(await supabase.from('answers').select(ANSWER_SELECT).order('created_at', { ascending: false }));
}

export async function getAnswer(id: string): Promise<AnswerRow | null> {
  return must(await supabase.from('answers').select(ANSWER_SELECT).eq('id', id).maybeSingle());
}

export type AnswerContent = {
  body: string;
  photoPaths: string[];
  voicePath: string | null;
  voiceSeconds: number | null;
};

const contentColumns = (c: AnswerContent) => ({
  body: c.body.trim() || null,
  photo_paths: c.photoPaths,
  voice_path: c.voicePath,
  voice_seconds: c.voicePath ? Math.min(300, Math.round(c.voiceSeconds ?? 0)) : null,
});

/** The wording, deck and category are captured on the server from the card. */
export async function saveAnswer(cardId: string, content: AnswerContent) {
  must(
    await supabase
      .from('answers')
      .insert({ card_id: cardId, answered_on: localDate(), ...contentColumns(content) })
      .select('id')
      .single(),
  );
}

/** Editing keeps the original date and wording (enforced on the server). */
export async function updateAnswer(id: string, content: AnswerContent) {
  must(await supabase.from('answers').update(contentColumns(content)).eq('id', id).select('id').single());
}

/** Deletes the answer, then its voice memo and photos. */
export async function deleteAnswer(answer: Pick<AnswerRow, 'id' | 'voice_path' | 'photo_paths'>) {
  must(await supabase.from('answers').delete().eq('id', answer.id).select('id'));
  const media = [...answer.photo_paths, ...(answer.voice_path ? [answer.voice_path] : [])];
  if (media.length) await supabase.storage.from('answer-media').remove(media);
}

// "Looking back": a past answer from about a year, six months, three months or
// a month ago (a few days either side), to revisit and maybe answer again.
const LOOK_BACK = [
  { days: 365, label: 'A year ago' },
  { days: 182, label: 'Six months ago' },
  { days: 91, label: 'Three months ago' },
  { days: 30, label: 'A month ago' },
];
const LOOK_BACK_SLACK = 3;

export type LookingBack = { answer: AnswerRow; label: string };

export async function getLookingBack(): Promise<LookingBack | null> {
  const today = localDate();
  const now = new Date();
  const oldest = localDate(addDays(now, -(LOOK_BACK[0].days + LOOK_BACK_SLACK)));
  const newest = localDate(addDays(now, -(LOOK_BACK[LOOK_BACK.length - 1].days - LOOK_BACK_SLACK)));
  const rows = must(
    await supabase
      .from('answers')
      .select(ANSWER_SELECT)
      .gte('answered_on', oldest)
      .lte('answered_on', newest)
      .order('answered_on', { ascending: false }),
  ) as AnswerRow[];

  // Only answers with something to look at, not "reflected" marks on their own.
  const withContent = rows.filter((r) => r.body?.trim() || r.voice_path || r.photo_paths.length > 0);

  for (const w of LOOK_BACK) {
    const matches = withContent.filter((r) => Math.abs(daysBetween(r.answered_on, today) - w.days) <= LOOK_BACK_SLACK);
    if (matches.length) {
      // Same pick all day: choose by today's date rather than at random.
      const pick = matches[Number(today.replace(/-/g, '')) % matches.length];
      return { answer: pick, label: w.label };
    }
  }

  // Development only (never in TestFlight or the App Store): with a new
  // account nothing is a month old yet, so preview the card with the latest answer.
  if (__DEV__) {
    const latest = (must(await supabase.from('answers').select(ANSWER_SELECT).order('created_at', { ascending: false }).limit(10)) as AnswerRow[])
      .find((r) => r.body?.trim() || r.voice_path || r.photo_paths.length > 0);
    if (latest) return { answer: latest, label: 'Preview' };
  }
  return null;
}

/**
 * Answers whose one-year anniversary falls in the next `days` days (from
 * tomorrow), one per day, for "A year ago today you answered…" notifications.
 */
export async function getUpcomingAnniversaries(days: number): Promise<{ date: string; cardId: string; question: string }[]> {
  const now = new Date();
  const from = localDate(addDays(now, 1 - 365));
  const to = localDate(addDays(now, days - 365));
  const rows = must(
    await supabase
      .from('answers')
      .select('card_id, question_text, answered_on, body, voice_path, photo_paths')
      .gte('answered_on', from)
      .lte('answered_on', to)
      .order('answered_on'),
  ) as Pick<AnswerRow, 'card_id' | 'question_text' | 'answered_on' | 'body' | 'voice_path' | 'photo_paths'>[];

  const byDay = new Map<string, { date: string; cardId: string; question: string }>();
  for (const r of rows) {
    if (!(r.body?.trim() || r.voice_path || r.photo_paths.length > 0)) continue;
    const anniversary = localDate(addDays(parseLocalDate(r.answered_on), 365));
    if (!byDay.has(anniversary)) byDay.set(anniversary, { date: anniversary, cardId: r.card_id, question: r.question_text });
  }
  return [...byDay.values()];
}

/** Days of the current month (1–31) with an answer, entry or reflection saved. */
export async function daysWithSomethingSaved(): Promise<Set<number>> {
  const since = localMonthStart();
  const [answers, entries] = await Promise.all([
    supabase.from('answers').select('answered_on').gte('answered_on', since),
    supabase.from('entries').select('entry_on').gte('entry_on', since),
  ]);
  // The ring is a nice-to-have: if entries can't be read, count answers alone
  // rather than failing the whole Home screen.
  const dates = [
    ...(must(answers) as { answered_on: string }[]).map((r) => r.answered_on),
    ...((entries.data ?? []) as { entry_on: string }[]).map((r) => r.entry_on),
  ];
  return new Set(dates.map((d) => Number(d.slice(8, 10))));
}

export async function answeredToday(cardId: string): Promise<'answered' | 'reflected' | null> {
  const rows = must(
    await supabase
      .from('answers')
      .select('reflected')
      .eq('card_id', cardId)
      .eq('answered_on', localDate()),
  ) as { reflected: boolean }[];
  if (rows.length === 0) return null;
  return rows.some((r) => !r.reflected) ? 'answered' : 'reflected';
}

export async function markReflected(cardId: string) {
  must(
    await supabase
      .from('answers')
      .insert({ card_id: cardId, reflected: true, answered_on: localDate() })
      .select('id')
      .single(),
  );
}

/**
 * Where "Draw a card" in the + menu starts: this month's deck, else the main
 * library deck, else any deck, at its first category.
 */
export async function getQuickDrawTarget(): Promise<{ deck: string; category: string } | null> {
  const decks = await getDecks();
  const deck = currentMonthlyDeck(decks) ?? decks.find((d) => d.type === 'library') ?? decks[0];
  if (!deck) return null;
  const first = must(
    await supabase
      .from('categories')
      .select('id')
      .eq('deck_id', deck.id)
      .order('sort_order')
      .limit(1)
      .maybeSingle(),
  ) as { id: string } | null;
  return first ? { deck: deck.id, category: first.id } : null;
}

// ---------------------------------------------------------------------------
// Entries: "Write about today" and "Add a moment" from the + menu.
// ---------------------------------------------------------------------------

export type EntryKind = 'write' | 'moment';

export type Entry = {
  id: string;
  kind: EntryKind;
  body: string | null;
  photo_paths: string[];
  entry_on: string;
  created_at: string;
};

const ENTRY_SELECT = 'id, kind, body, photo_paths, entry_on, created_at';

export async function getEntries(): Promise<Entry[]> {
  return must(await supabase.from('entries').select(ENTRY_SELECT).order('created_at', { ascending: false }));
}

export async function getEntry(id: string): Promise<Entry | null> {
  return must(await supabase.from('entries').select(ENTRY_SELECT).eq('id', id).maybeSingle());
}

export async function createEntry(kind: EntryKind, body: string, photoPaths: string[]) {
  must(
    await supabase
      .from('entries')
      .insert({ kind, body: body.trim() || null, photo_paths: photoPaths, entry_on: localDate() })
      .select('id')
      .single(),
  );
}

export async function updateEntry(id: string, body: string, photoPaths: string[]) {
  must(
    await supabase
      .from('entries')
      .update({ body: body.trim() || null, photo_paths: photoPaths })
      .eq('id', id)
      .select('id')
      .single(),
  );
}

export async function deleteEntry(id: string) {
  must(await supabase.from('entries').delete().eq('id', id).select('id'));
}

// ---------------------------------------------------------------------------
// Monthly notes: one per person per month, shown as the closing reflection.
// ---------------------------------------------------------------------------

export type MonthlyNote = { id: string; month: string; body: string | null };

export async function getNotes(): Promise<MonthlyNote[]> {
  return must(await supabase.from('monthly_notes').select('id, month, body'));
}

/** Everything saved in one month ("YYYY-MM"), for its recap. */
export async function getMonth(month: string) {
  const start = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const [answers, entries, note] = await Promise.all([
    supabase
      .from('answers')
      .select(ANSWER_SELECT)
      .gte('answered_on', start)
      .lt('answered_on', next)
      .order('created_at', { ascending: false }),
    supabase.from('entries').select(ENTRY_SELECT).gte('entry_on', start).lt('entry_on', next).order('created_at', { ascending: false }),
    supabase.from('monthly_notes').select('id, month, body').eq('month', start).maybeSingle(),
  ]);
  return {
    answers: must(answers) as AnswerRow[],
    entries: (entries.data ?? []) as Entry[],
    note: (note.data ?? null) as MonthlyNote | null,
  };
}

/** `month` is the first day of the month, "YYYY-MM-01". */
export async function saveNote(month: string, body: string) {
  must(
    await supabase
      .from('monthly_notes')
      .upsert({ month, body: body.trim() || null }, { onConflict: 'user_id,month' })
      .select('id')
      .single(),
  );
}

// ---------------------------------------------------------------------------
// Profile and account
// ---------------------------------------------------------------------------

export type ProfilePatch = Partial<
  Pick<Profile, 'first_name' | 'phone' | 'season_id' | 'email_consent' | 'text_consent' | 'reminder_enabled' | 'reminder_time' | 'timezone'>
>;

/** Only these columns can be changed from the app; birthday is fixed. */
export async function updateProfile(userId: string, patch: ProfilePatch) {
  must(await supabase.from('profiles').update(patch).eq('id', userId).select('id').single());
}

/**
 * Permanently deletes the account: every photo and voice memo in their storage
 * folder, then the account itself, which takes their profile, answers, entries
 * and notes with it (PRD §4.10).
 */
export async function deleteMyAccount(userId: string) {
  for (const folder of ['answers', 'entries', 'notes']) {
    const prefix = `${userId}/${folder}`;
    // Storage lists at most `limit` files per call, so keep going until empty.
    for (;;) {
      const { data, error } = await supabase.storage.from('answer-media').list(prefix, { limit: 100 });
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;
      const { error: removeError } = await supabase.storage
        .from('answer-media')
        .remove(data.map((f) => `${prefix}/${f.name}`));
      if (removeError) throw new Error(removeError.message);
    }
  }
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
  forgetPeriodDays(userId);
  // The account no longer exists; just clear the session on this phone.
  await supabase.auth.signOut({ scope: 'local' });
}

// ---------------------------------------------------------------------------
// Activity for the admin's anonymous metrics. Never blocks the person.
// ---------------------------------------------------------------------------

// Events carry which card or read, never anything the person wrote.
// Signups and marketing opt-ins/outs are logged by the database itself.
export function logActivity(event: ActivityEvent, card?: { id: string; deckId: string } | null, readId?: string) {
  supabase
    .from('activity')
    .insert({ event, card_id: card?.id ?? null, deck_id: card?.deckId || null, read_id: readId ?? null })
    .then(({ error }) => {
      if (error && __DEV__) console.warn(`activity ${event}: ${error.message}`);
    });
}

// Card of the day is on Home, which reloads often: count one view per card per day.
const viewed = new Set<string>();

export function logCardViewed(card: { id: string; deckId: string }) {
  const key = `${localDate()}|${card.id}`;
  if (viewed.has(key)) return;
  viewed.add(key);
  logActivity('card_viewed', card);
}
