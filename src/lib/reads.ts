// Short reads: plain-language explainers, "for understanding, not medical advice".

import { supabase } from './supabase';

/**
 * Shelves in the Library, in the order they appear. The first four follow the
 * formula's four areas. Keep the ids in step with scripts/reads/build-seed.mjs.
 */
export const TOPICS = [
  { id: 'blood-sugar', label: 'Blood Sugar and Metabolism' },
  { id: 'energy-sleep', label: 'Energy and Sleep' },
  { id: 'stress', label: 'Stress and Cortisol' },
  { id: 'cycle', label: 'Your Cycle' },
  { id: 'pmos', label: 'PMOS (formerly PCOS)' },
  { id: 'perimenopause', label: 'Perimenopause and Beyond' },
  { id: 'fertility', label: 'Fertility and Postpartum' },
  { id: 'birth-control', label: 'Birth Control' },
  { id: 'mood', label: 'Mood and Mind' },
  { id: 'food', label: 'Food and Cravings' },
  { id: 'gut', label: 'Gut Health' },
] as const;

export function topicLabel(id: string | null): string | null {
  return TOPICS.find((t) => t.id === id)?.label ?? null;
}

/**
 * Reads grouped onto shelves. A topic only gets its own shelf once it has two
 * or more reads; the rest sit together at the end ("More reads"), or as a
 * plain list while no topic has two yet.
 */
export function shelve<T extends { topic: string | null }>(reads: T[]): { label: string | null; reads: T[] }[] {
  const shelves = TOPICS.map((t) => ({ label: t.label as string | null, reads: reads.filter((r) => r.topic === t.id) })).filter(
    (s) => s.reads.length >= 2,
  );
  const shelved = new Set(shelves.flatMap((s) => s.reads));
  const rest = reads.filter((r) => !shelved.has(r));
  if (rest.length) shelves.push({ label: shelves.length ? 'More reads' : null, reads: rest });
  return shelves;
}

export type ReadSummary = {
  id: string;
  title: string;
  summary: string | null;
  topic: string | null;
  minutes: number;
  deck_ids: string[];
  patterns: string[];
};

export type Read = ReadSummary & { body: string; card_deck: string | null };

const SUMMARY = 'id, title, summary, topic, minutes, deck_ids, patterns';

export async function getReads(): Promise<ReadSummary[]> {
  const { data, error } = await supabase.from('reads').select(SUMMARY).order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as ReadSummary[];
}

export async function getRead(id: string): Promise<Read | null> {
  const { data, error } = await supabase.from('reads').select(`${SUMMARY}, body, card_deck`).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Read | null;
}

/** Reads to show as "Read first" on a deck. */
export async function readsForDeck(deckId: string): Promise<ReadSummary[]> {
  const { data, error } = await supabase.from('reads').select(SUMMARY).contains('deck_ids', [deckId]).order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as ReadSummary[];
}

/** Pattern key → the read that explains it. */
export async function readsForPatterns(keys: string[]): Promise<Record<string, ReadSummary>> {
  if (keys.length === 0) return {};
  const { data, error } = await supabase.from('reads').select(SUMMARY).overlaps('patterns', keys);
  if (error) throw new Error(error.message);
  const out: Record<string, ReadSummary> = {};
  for (const r of (data ?? []) as ReadSummary[]) for (const p of r.patterns) if (keys.includes(p) && !out[p]) out[p] = r;
  return out;
}
