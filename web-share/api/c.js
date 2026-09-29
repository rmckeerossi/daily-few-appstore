// Shared card page: https://app.dailyfew.com/c/<card id>  (design screen 07)
//
// Rendered on the server so text-message link previews show the question.
// Reads the one card through Supabase's public `shared_card` function, which
// returns only the question, deck and category, never anyone's answer.

const SUPABASE_URL = 'https://tiphmwlrniocvmcetjfj.supabase.co';
// Publishable key: designed to be public (same one the app ships with).
const SUPABASE_KEY = 'sb_publishable_hcCrXxSZabdQkOidbdrtAg_Hg3hiFmA';
// Set APP_STORE_URL in Vercel once the app is live; until then the page says "coming soon".
const APP_STORE_URL = process.env.APP_STORE_URL || '';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function loadCard(id) {
  if (!UUID.test(id)) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/shared_card`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_id: id }),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

export default async function handler(req, res) {
  const id = String(req.query.id ?? '');
  let card = null;
  try {
    card = await loadCard(id);
  } catch {
    card = null;
  }
  const available = !!card?.available;
  const title = available ? card.question : 'This card is no longer available.';
  const description = 'Someone sent you a question. Answer it privately in the Daily Few app.';

  const cta = APP_STORE_URL
    ? `<a class="button" href="${esc(APP_STORE_URL)}">Get the app to answer</a>`
    : `<span class="button soon">Coming soon to the App Store</span>`;

  const cardHtml = available
    ? `<div class="card">
        <img class="submark" src="/assets/submark-white.png" alt="" width="52" height="37">
        <p class="question">${esc(card.question)}</p>
        <p class="deck">${esc(card.deck_name)}</p>
      </div>`
    : `<div class="card unavailable"><p class="question">This card is no longer available.</p></div>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.status(available ? 200 : 404).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · Daily Few</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:site_name" content="Daily Few">
<meta property="og:type" content="website">
<meta property="og:image" content="https://app.dailyfew.com/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FEFCF2">
<link rel="icon" href="/assets/submark-white.png">
<style>
@font-face { font-family: 'Ivar'; src: url('/assets/IvarDisplayCondensed-Medium.woff2') format('woff2'); font-display: swap; }
:root { --cream: #FEFCF2; --burgundy: #4C1C31; --burgundy-600: #6B2743; --muted: #7C7663; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--cream); color: var(--burgundy); font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; }
main { max-width: 430px; margin: 0 auto; padding: 40px 24px 56px; display: flex; flex-direction: column; align-items: center; gap: 28px; text-align: center; }
.wordmark { width: 126px; height: auto; }
.eyebrow { margin: -8px 0 0; font: 500 11px/1.2 ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.card { width: 100%; min-height: 330px; border-radius: 24px; padding: 28px 26px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; color: var(--cream);
  background: radial-gradient(120% 70% at 50% 115%, rgba(209,219,255,.55), rgba(209,219,255,0) 62%), linear-gradient(160deg, #531832 0%, #8A365A 100%);
  border: 1px solid rgba(209,219,255,.32); box-shadow: 0 20px 50px rgba(40,14,26,.25); }
.card.unavailable { justify-content: center; }
.submark { width: 26px; height: auto; opacity: .85; }
.question { margin: 0; font-family: 'Ivar', Georgia, serif; font-size: 34px; line-height: 1.12; letter-spacing: -.01em; text-wrap: balance; }
.deck { margin: 0; font: 500 10px/1.2 ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: .18em; text-transform: uppercase; opacity: .82; }
.body { margin: 0; font-size: 16px; line-height: 1.6; color: var(--burgundy-600); }
.button { display: block; width: 100%; padding: 19px 24px; border-radius: 999px; background: var(--burgundy); color: var(--cream); text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: .04em; text-transform: uppercase; }
.button.soon { background: transparent; color: var(--burgundy); border: 1px solid var(--burgundy); }
.open { color: var(--burgundy); font-size: 15px; }
</style>
</head>
<body>
<main>
  <img class="wordmark" src="/assets/logo-burgundy.png" alt="Daily Few" width="126" height="40">
  <p class="eyebrow">Someone sent you a question</p>
  ${cardHtml}
  <p class="body">Answer it privately in the Daily Few app. Your answer stays with you. Nobody else sees it, including whoever sent this.</p>
  ${cta}
  ${available ? `<a class="open" href="dailyfew://c/${esc(id)}">Already have it? Open in app</a>` : ''}
</main>
</body>
</html>`);
}
