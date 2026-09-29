// Shared card links: https://app.dailyfew.com/c/<card id>
//
// Without the app, the link opens a small web page showing just that question
// with a prompt to get the app (web-share/). With the app installed, iOS opens
// the app straight to that card (universal link), via src/app/c/[id].tsx.
// If they're not signed up yet, the card is remembered here and opened right
// after signup, and the signup is recorded as coming from a shared link.

export const SHARE_HOST = 'app.dailyfew.com';

export const cardLink = (cardId: string) => `https://${SHARE_HOST}/c/${cardId}`;

const PENDING_KEY = 'pending-shared-card';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCardId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function rememberSharedCard(cardId: string) {
  try {
    localStorage.setItem(PENDING_KEY, cardId);
  } catch {}
}

export function pendingSharedCard(): string | null {
  try {
    const id = localStorage.getItem(PENDING_KEY);
    return isCardId(id) ? id : null;
  } catch {
    return null;
  }
}

export function clearSharedCard() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
}
