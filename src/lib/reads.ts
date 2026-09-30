// Short reads: plain-language explainers, "for understanding, not medical advice".

import { supabase } from './supabase';

export type ReadSummary = {
  id: string;
  title: string;
  summary: string | null;
  minutes: number;
  deck_ids: string[];
  patterns: string[];
};

export type Read = ReadSummary & { body: string; card_deck: string | null };

const SUMMARY = 'id, title, summary, minutes, deck_ids, patterns';

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
