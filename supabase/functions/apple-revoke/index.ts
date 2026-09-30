// apple-revoke: when someone who signed in with Apple deletes their account,
// tell Apple to cancel Daily Few's access (App Store guideline 5.1.1(v)).
//
// The app gets a fresh one-time code from Apple (a quick Face ID confirm),
// sends it here, and this function swaps it for a token and revokes that
// token. Nothing is stored.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   APPLE_KEY_ID       the Key ID of the "Sign in with Apple" key
//   APPLE_PRIVATE_KEY  the full contents of that key's .p8 file
//
// Deployed with JWT verification off: it checks the caller itself below.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'npm:jose@5';

const TEAM_ID = 'SLD5B37GPZ';
const BUNDLE_ID = 'com.onyxroots.dailyfew';
// Public key, safe to include: it's the same one inside the app.
const PUBLISHABLE_KEY = 'sb_publishable_hcCrXxSZabdQkOidbdrtAg_Hg3hiFmA';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const form = (fields: Record<string, string>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(fields),
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Only a signed-in person can ask, and only for their own Apple sign-in.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'not_signed_in' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, PUBLISHABLE_KEY);
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: 'not_signed_in' }, 401);

  const { authorizationCode } = await req.json().catch(() => ({}));
  if (typeof authorizationCode !== 'string' || !authorizationCode) return json({ error: 'missing_code' }, 400);

  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');
  if (!keyId || !privateKey) return json({ error: 'not_configured' }, 500);

  // Apple's "client secret": a short-lived token signed with the .p8 key.
  const key = await importPKCS8(privateKey.replace(/\\n/g, '\n').trim(), 'ES256');
  const clientSecret = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(TEAM_ID)
    .setSubject(BUNDLE_ID)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);

  // Swap the one-time code for a token...
  const tokenRes = await fetch(
    'https://appleid.apple.com/auth/token',
    form({ client_id: BUNDLE_ID, client_secret: clientSecret, code: authorizationCode, grant_type: 'authorization_code' }),
  );
  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) return json({ error: 'token_exchange_failed', apple: tokens.error ?? null }, 502);

  // ...and revoke it, which ends Daily Few's access to their Apple ID.
  const refresh = tokens.refresh_token as string | undefined;
  const revokeRes = await fetch(
    'https://appleid.apple.com/auth/revoke',
    form({
      client_id: BUNDLE_ID,
      client_secret: clientSecret,
      token: refresh ?? tokens.access_token,
      token_type_hint: refresh ? 'refresh_token' : 'access_token',
    }),
  );
  if (!revokeRes.ok) return json({ error: 'revoke_failed' }, 502);

  return json({ ok: true });
});
