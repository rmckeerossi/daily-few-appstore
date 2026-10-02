// The short intro after signup: shown once per person on this phone.

const key = (uid: string) => `intro-seen:${uid}`;

export function introSeen(uid: string): boolean {
  try {
    return localStorage.getItem(key(uid)) === '1';
  } catch {
    return true;
  }
}

export function markIntroSeen(uid: string) {
  try {
    localStorage.setItem(key(uid), '1');
  } catch {}
}
