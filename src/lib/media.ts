// Photos (and later voice memos) live in the private "answer-media" bucket,
// always under the owner's own folder: {user_id}/{kind}/{uuid}.{ext}.
// Storage rules only let a person read or write inside their own folder.

import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

const BUCKET = 'answer-media';

export type PickedPhoto = { uri: string; mimeType: string };

/** Opens the photo library. Returns up to `limit` photos, or [] if cancelled. */
export async function pickPhotos(limit: number): Promise<PickedPhoto[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.7,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' }));
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
};

/** Uploads one photo into the person's folder and returns its storage path. */
export async function uploadPhoto(photo: PickedPhoto, userId: string, folder: 'answers' | 'entries' | 'notes') {
  const body = await fetch(photo.uri).then((r) => r.arrayBuffer());
  const path = `${userId}/${folder}/${randomUUID()}.${EXT[photo.mimeType] ?? 'jpg'}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: photo.mimeType });
  if (error) throw new Error(error.message);
  return path;
}

/** Uploads a finished voice memo (AAC in an .m4a file) and returns its path. */
export async function uploadVoice(uri: string, userId: string) {
  const body = await fetch(uri).then((r) => r.arrayBuffer());
  const path = `${userId}/answers/voice-${randomUUID()}.m4a`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'audio/mp4' });
  if (error) throw new Error(error.message);
  return path;
}

export async function removeMedia(paths: string[]) {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

/** Short-lived links for showing private photos. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}
