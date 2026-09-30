// Shared card links: https://app.dailyfew.com/c/<card id>
//
// Without the app, the link opens a small web page showing just that question
// with a prompt to get the app (web-share/). With the app installed, iOS opens
// the app straight to that card (universal link), via src/app/c/[id].tsx.
// If they're not signed up yet, the card is remembered here and opened right
// after signup, and the signup is recorded as coming from a shared link.

export const SHARE_HOST = 'app.dailyfew.com';

/** The link for a shared card, with the sharer's referral code if they have one. */
export const cardLink = (cardId: string, ref?: string | null) =>
  `https://${SHARE_HOST}/c/${cardId}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;

// The signed-in person's referral code, set when their profile loads.
let myReferralCode: string | null = null;
export function setMyReferralCode(code: string | null) {
  myReferralCode = code;
}
export const myCode = () => myReferralCode;

// ---------------------------------------------------------------------------
// Attribution: UTM tags and a referral tag from the link someone arrived
// through, kept until they sign up and then saved on their profile once.
// The database cleans and trims them again; this only picks the known keys.
// ---------------------------------------------------------------------------

export const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'] as const;
export type Attribution = Partial<Record<(typeof ATTRIBUTION_KEYS)[number], string>>;
const ATTRIBUTION_KEY = 'pending-attribution';

/** Keeps the first link's tags: a later link doesn't overwrite them before signup. */
export function rememberAttribution(params: Record<string, unknown>) {
  const found: Attribution = {};
  for (const k of ATTRIBUTION_KEYS) {
    const v = params[k];
    const value = Array.isArray(v) ? v[0] : v;
    if (typeof value === 'string' && value.trim()) found[k] = value.trim().slice(0, 100);
  }
  if (Object.keys(found).length === 0) return;
  try {
    if (!localStorage.getItem(ATTRIBUTION_KEY)) localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(found));
  } catch {}
}

export function pendingAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

export function clearAttribution() {
  try {
    localStorage.removeItem(ATTRIBUTION_KEY);
  } catch {}
}

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
