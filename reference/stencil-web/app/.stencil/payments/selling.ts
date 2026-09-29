import { redirect } from "../http";
import { requireAuth, getSession } from "~stencil/auth/server";
import { requireSubscription } from "./server";
import type { AppContext } from "../types/context";
import { buyerRefCandidates, guestBuyerRef } from "./buyer-refs";

export { guestBuyerRef };

/**
 * Selling SDK — let *your users* charge *their own* customers (one-time card
 * payments). This is the opposite direction from `~stencil/payments/server.ts`, which
 * is how *you* charge *your* users (subscriptions). Nine functions, no Stripe
 * types or ids ever leak into app code.
 *
 * The seller is one of your app's users who has completed Stripe-hosted
 * onboarding; the buyer is whoever pays them. **Buyers do NOT need an account
 * in your app.** Two modes:
 *
 * - **Guest (the default):** collect the buyer's email on your buy page and pass
 *   it as `buyerEmail`. The email *is* the buyer's identity: entitlement is
 *   answered per (email, reference), so `hasPurchased({ reference, buyerEmail })`
 *   is the gate. How the buyer later proves that email is your design — a link
 *   you email them (`~stencil/email`), an access code, a sign-in — Stencil
 *   stores no token or link for them.
 * - **Signed-in:** if you want buyers to register, put the buy flow behind your
 *   app's auth — a signed-in buyer is identified by their user id, as before.
 *   Roles and gating for registered buyers are then yours to build.
 *
 * `reference` is *your* own id for the thing being sold (a package id, a
 * listing id, …) — it's how you later ask "did this buyer pay for this?".
 *
 * Every call authenticates with the app's own per-app key and talks to the
 * hosted payments worker; you never handle card data or Stripe objects.
 */

const PAYMENTS_BASE = "https://payments.hellostencil.com";

/**
 * The app's `appId`, resolved once and cached. A deployed app worker is a single
 * isolate with a constant bearer key, so one lookup per isolate is enough. The
 * per-app routes are scoped by `appId`, which the app only learns at runtime.
 */
let cachedAppId: string | null = null;

/**
 * Fetch the payments service with the app's per-app bearer key attached.
 *
 * A deployed app must reach the service through its `PAYMENTS` service binding —
 * a plain `fetch()` to `payments.hellostencil.com` doesn't reach it. The plain
 * `fetch()` fallback is only used on the local dev server, which has no binding.
 * The bearer header is set the same way for either transport.
 */
function paymentsFetch(
  env: Env,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${env.BACKEND_SERVICE_API_KEY ?? ""}`);
  if (typeof init?.body === "string") headers.set("Content-Type", "application/json");
  const req = new Request(`${PAYMENTS_BASE}${path}`, { ...init, headers });
  return env.PAYMENTS ? env.PAYMENTS.fetch(req) : fetch(req);
}

async function resolveAppId(env: Env): Promise<string> {
  if (cachedAppId) return cachedAppId;
  const res = await paymentsFetch(env, "/v1/whoami");
  if (!res.ok) throw new Error("Could not reach the payments service");
  const { appId } = await res.json<{ appId: string }>();
  cachedAppId = appId;
  return appId;
}

export type SellerStatus = {
  /**
   * `none` — never started · `onboarding` — Stripe KYC incomplete ·
   * `active` — can accept charges · `restricted` — Stripe needs more info.
   * Show selling UI only when `active`.
   */
  status: "none" | "onboarding" | "active" | "restricted";
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  /** Requirement keys Stripe is still waiting on (drives a "finish setup" nudge). */
  currentlyDue: string[];
  disabledReason: string | null;
};

export type Purchase = {
  orderId: string;
  /** Your own id for the thing that was sold. */
  reference: string;
  description: string;
  /** Amount paid, in cents. */
  amount: number;
  currency: string;
  /** ISO timestamp, or null if not yet captured. */
  purchasedAt: string | null;
};

/**
 * Start (or resume) Stripe-hosted seller onboarding for the current user, then
 * throw a redirect to Stripe's hosted KYC. Also the "fix it" entry point when a
 * seller is `restricted` — Stripe re-collects whatever is missing.
 *
 * Gated on an active subscription: only a paying subscriber of this app may
 * become a seller, so this throws a redirect to `/upgrade` if the user isn't
 * subscribed.
 *
 * The first time a seller onboards you MUST pass their `country` (ISO 3166-1
 * alpha-2, e.g. "GB") — collect it in your own UI, because a Stripe account's
 * country is fixed at creation and can never change afterwards. An unsupported
 * country throws an error; surface it and let them pick another. `country` is
 * ignored once the account exists (resuming/fixing onboarding). Call from a
 * form action:
 *
 *   export async function action({ request, context }: Route.ActionArgs) {
 *     const form = await request.formData();
 *     await onboardSeller(request, context, { country: String(form.get("country")) });
 *   }
 *
 * After Stripe, the seller returns to `returnUrl` (defaults to `/app/sell`) —
 * re-check `getSellerStatus()` there, since onboarding may still be pending.
 */
export async function onboardSeller(
  request: Request,
  context: AppContext,
  opts?: { country?: string; returnUrl?: string; refreshUrl?: string },
): Promise<never> {
  const env = context.cloudflare.env;
  const { user } = await requireSubscription(request, context);
  const appId = await resolveAppId(env);
  const base = new URL(request.url).origin;

  const res = await paymentsFetch(
    env,
    `/v1/apps/${appId}/sellers/${encodeURIComponent(user.id)}/onboard`,
    {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        displayName: user.name,
        country: opts?.country,
        returnUrl: opts?.returnUrl ?? `${base}/app/sell`,
        refreshUrl: opts?.refreshUrl ?? `${base}/app/sell`,
      }),
    },
  );
  if (!res.ok) {
    const err = await res
      .json<{ error?: string }>()
      .catch(() => ({}) as { error?: string });
    throw new Error(err.error ?? "Failed to start seller onboarding");
  }
  const { url } = await res.json<{ url: string }>();
  throw redirect(url);
}

/**
 * The current user's seller status. Never redirects — use it to decide what
 * selling UI to render (a "Start accepting payments" button when `none`, a
 * "finish setup" nudge when `onboarding`/`restricted`, the seller tools when
 * `active`).
 *
 *   export async function loader({ request, context }: Route.LoaderArgs) {
 *     const seller = await getSellerStatus(request, context);
 *     return { canSell: seller.status === "active" };
 *   }
 */
export async function getSellerStatus(
  request: Request,
  context: AppContext,
): Promise<SellerStatus> {
  const env = context.cloudflare.env;
  const { user } = await requireAuth(request, env);
  const appId = await resolveAppId(env);

  const res = await paymentsFetch(
    env,
    `/v1/apps/${appId}/sellers/${encodeURIComponent(user.id)}`,
  );
  if (!res.ok) throw new Error("Failed to load seller status");
  const data = await res.json<Partial<SellerStatus>>();
  return {
    status: data.status ?? "none",
    chargesEnabled: data.chargesEnabled ?? false,
    payoutsEnabled: data.payoutsEnabled ?? false,
    detailsSubmitted: data.detailsSubmitted ?? false,
    currentlyDue: data.currentlyDue ?? [],
    disabledReason: data.disabledReason ?? null,
  };
}

/**
 * Can this seller take a payment right now? The buyer-side readiness check for
 * public buy pages: `getSellerStatus` reads the *current* user, so a buyer's
 * loader can't use it to ask about the seller — this one takes any seller's
 * user id and never authenticates or redirects. Fails closed: any lookup
 * problem reports `{ ready: false }`.
 *
 * Gate the buy button on it — when the seller isn't ready, render a "not
 * accepting payments yet" notice instead of a checkout that would be rejected.
 *
 *   export async function loader({ context, params }: Route.LoaderArgs) {
 *     const item = await loadItem(params.reference);
 *     const { ready } = await getSellerReadiness(context, {
 *       sellerUserId: item.sellerUserId,
 *     });
 *     return { item, sellerReady: ready };
 *   }
 */
export async function getSellerReadiness(
  context: AppContext,
  opts: { sellerUserId: string },
): Promise<{ ready: boolean }> {
  const env = context.cloudflare.env;
  try {
    const appId = await resolveAppId(env);
    const res = await paymentsFetch(
      env,
      `/v1/apps/${appId}/sellers/${encodeURIComponent(opts.sellerUserId)}`,
    );
    if (!res.ok) return { ready: false };
    const data = await res.json<{ chargesEnabled?: boolean }>();
    return { ready: data.chargesEnabled === true };
  } catch {
    return { ready: false };
  }
}

/**
 * Start a card checkout: the buyer pays the given seller for `reference`.
 * Throws a redirect to Stripe Checkout; after payment the buyer is sent to
 * `successUrl`. Enforces a $5 USD minimum on the server.
 *
 * The buyer needs no account. Signed in, they're identified by their user id.
 * Signed out, they check out as a guest and you MUST pass `buyerEmail` — collect
 * it on the buy page (it also pre-fills Stripe). A guest checkout without an
 * email redirects back to `cancelUrl` with `?checkout_error=buyer_required`.
 *
 * If this buyer already owns `reference` this resolves cleanly by redirecting
 * to `successUrl` — they keep their access, they're never charged twice.
 *
 * Put whatever your success/purchase page needs to identify the buyer into
 * `successUrl` yourself (e.g. `?ref=<reference>&buyer=<email>`); Stencil adds
 * nothing to it.
 *
 * Expected rejections never crash the page: when the checkout can't start —
 * the seller isn't charge-ready yet (`seller_not_onboarded` /
 * `seller_not_ready`), the price is below the minimum (`below_minimum`), or
 * the request is otherwise invalid — this redirects back to `cancelUrl` with
 * `?checkout_error=<code>` appended. Read that param in the buy page's loader
 * and render it as a notice. Gate the buy button with `getSellerReadiness` so
 * buyers rarely reach a checkout that would bounce.
 *
 *   export async function action({ request, context }: Route.ActionArgs) {
 *     const form = await request.formData();
 *     await sellerCheckout(request, context, {
 *       sellerUserId: String(form.get("sellerId")),
 *       reference: String(form.get("packageId")),
 *       amountCents: 2500,
 *       description: "Spring photo package",
 *       buyerEmail: String(form.get("email") || "") || undefined,
 *       successUrl: new URL("/app/purchases/success", request.url).toString(),
 *     });
 *   }
 */
export async function sellerCheckout(
  request: Request,
  context: AppContext,
  opts: {
    sellerUserId: string;
    amountCents: number;
    reference: string;
    description?: string;
    successUrl?: string;
    cancelUrl?: string;
    /** The guest buyer's email — required when nobody is signed in. */
    buyerEmail?: string;
  },
): Promise<never> {
  const env = context.cloudflare.env;
  const session = await getSession(request, env);
  const appId = await resolveAppId(env);
  const base = new URL(request.url).origin;
  const successUrl = opts.successUrl ?? `${base}/app/purchases/success`;
  const cancelUrl = opts.cancelUrl ?? `${base}/app`;

  const buyerEmail = session?.user.email ?? opts.buyerEmail?.trim();
  if (!session && !buyerEmail) {
    // A guest is identified by email alone — without one there is nobody to
    // sell to. Same shape as every other expected rejection: back with a code.
    const back = new URL(cancelUrl, base);
    back.searchParams.set("checkout_error", "buyer_required");
    throw redirect(back.toString());
  }

  const res = await paymentsFetch(
    env,
    `/v1/apps/${appId}/sellers/${encodeURIComponent(opts.sellerUserId)}/checkout`,
    {
      method: "POST",
      body: JSON.stringify({
        buyerRef: session?.user.id,
        buyerEmail,
        amountCents: opts.amountCents,
        reference: opts.reference,
        description: opts.description,
        successUrl,
        cancelUrl,
      }),
    },
  );
  const data = await res
    .json<{ url?: string; error?: string; code?: string }>()
    .catch(() => ({}) as { url?: string; error?: string; code?: string });

  if (res.ok && data.url) throw redirect(data.url);
  // Already owned — clean, idempotent: keep access, don't double-charge.
  if (res.status === 409 && data.code === "already_purchased") {
    throw redirect(successUrl);
  }
  // Every other 4xx is an expected business state (seller not charge-ready,
  // price below minimum, …), not a crash: send the buyer back with a
  // machine-readable code the page can render as a notice. A thrown Error here
  // would hit the root ErrorBoundary, which hides messages in production — the
  // buyer would see a blank "unexpected error" page.
  if (res.status >= 400 && res.status < 500) {
    const back = new URL(cancelUrl, base);
    back.searchParams.set("checkout_error", data.code ?? "checkout_failed");
    throw redirect(back.toString());
  }
  throw new Error(data.error ?? "Failed to start checkout");
}

/** The buyer identities a purchase read runs as: an explicit `buyerRef` alone,
 *  else a guest's `buyerEmail` and the signed-in user, whichever exist. Never
 *  redirects — a visitor with no identity simply has no purchases. */
async function resolveBuyerRefs(
  request: Request,
  env: Env,
  opts?: { buyerRef?: string; buyerEmail?: string },
): Promise<string[]> {
  const session = opts?.buyerRef ? null : await getSession(request, env);
  return buyerRefCandidates({
    buyerRef: opts?.buyerRef,
    buyerEmail: opts?.buyerEmail,
    sessionUserId: session?.user.id,
  });
}

/**
 * Has the buyer paid for `reference`? The one-line entitlement gate. The buyer
 * resolves from an explicit `buyerRef`, else from a guest's `buyerEmail` and the
 * signed-in user together (a buyer who paid while signed in is found either
 * way) — and reports `false` when none exists, never redirecting to login. Reads
 * live from paid orders, so a refunded or disputed-lost purchase reports `false`
 * automatically — no revocation bookkeeping on your side. Fails closed (returns
 * `false`) if the check can't be completed.
 *
 * For a guest, *you* decide how they prove their email before you call this
 * with it — a link you emailed, an access code, a sign-in. Never read the email
 * straight from an untrusted query string on a page that delivers the purchase.
 *
 *   export async function loader({ request, context }: Route.LoaderArgs) {
 *     if (!(await hasPurchased(request, context, { reference: packageId }))) {
 *       throw redirect("/app/buy/" + packageId);
 *     }
 *     return { unlocked: true };
 *   }
 */
export async function hasPurchased(
  request: Request,
  context: AppContext,
  opts: { reference: string; buyerRef?: string; buyerEmail?: string },
): Promise<boolean> {
  const env = context.cloudflare.env;
  const buyerRefs = await resolveBuyerRefs(request, env, opts);
  if (!buyerRefs.length) return false;
  const appId = await resolveAppId(env);

  const results = await Promise.all(
    buyerRefs.map(async (buyerRef) => {
      try {
        const res = await paymentsFetch(
          env,
          `/v1/apps/${appId}/buyers/${encodeURIComponent(buyerRef)}/purchases/${encodeURIComponent(opts.reference)}`,
        );
        if (!res.ok) return false;
        const { purchased } = await res.json<{ purchased: boolean }>();
        return purchased === true;
      } catch {
        return false;
      }
    }),
  );
  return results.some(Boolean);
}

/**
 * Every current paid purchase for a buyer. The buyer resolves like
 * `hasPurchased` (explicit `buyerRef`, else guest `buyerEmail` and signed-in
 * user together), and a visitor with no identity gets `[]` — never a login
 * redirect. Like `hasPurchased`, refunds and lost disputes drop out
 * automatically. Use it for a "My purchases" screen.
 *
 *   export async function loader({ request, context }: Route.LoaderArgs) {
 *     return { purchases: await getPurchases(request, context) };
 *   }
 */
export async function getPurchases(
  request: Request,
  context: AppContext,
  opts?: { buyerRef?: string; buyerEmail?: string },
): Promise<Purchase[]> {
  const env = context.cloudflare.env;
  const buyerRefs = await resolveBuyerRefs(request, env, opts);
  if (!buyerRefs.length) return [];
  const appId = await resolveAppId(env);

  const perBuyer = await Promise.all(
    buyerRefs.map(async (buyerRef): Promise<Purchase[]> => {
      try {
        const res = await paymentsFetch(
          env,
          `/v1/apps/${appId}/buyers/${encodeURIComponent(buyerRef)}/purchases`,
        );
        if (!res.ok) return [];
        const { purchases } = await res.json<{ purchases: Purchase[] }>();
        return purchases ?? [];
      } catch {
        return [];
      }
    }),
  );
  const byOrder = new Map<string, Purchase>();
  for (const purchase of perBuyer.flat()) byOrder.set(purchase.orderId, purchase);
  return [...byOrder.values()].sort((a, b) => {
    if (a.purchasedAt === b.purchasedAt) return 0;
    if (a.purchasedAt === null) return 1;
    if (b.purchasedAt === null) return -1;
    return b.purchasedAt.localeCompare(a.purchasedAt);
  });
}

/**
 * Remove the current user's seller account entirely — closes their Stripe
 * account so they can start over (for example after onboarding in the wrong
 * country, which Stripe can't change). Re-onboarding afterwards mints a
 * brand-new Stripe account. Returns `{ removed: false, reason }` without
 * deleting anything if the seller has already taken payments — surface `reason`
 * to them rather than treating it as an error.
 *
 *   export async function action({ request, context }: Route.ActionArgs) {
 *     return await disconnectSeller(request, context); // render reason when removed === false
 *   }
 */
export async function disconnectSeller(
  request: Request,
  context: AppContext,
): Promise<{ removed: boolean; reason?: string }> {
  const env = context.cloudflare.env;
  const { user } = await requireAuth(request, env);
  const appId = await resolveAppId(env);

  const res = await paymentsFetch(
    env,
    `/v1/apps/${appId}/sellers/${encodeURIComponent(user.id)}`,
    { method: "DELETE" },
  );
  if (res.ok) return { removed: true };

  const data = await res
    .json<{ error?: string; code?: string }>()
    .catch(() => ({}) as { error?: string; code?: string });
  if (res.status === 409 && data.code === "has_transactions") {
    return {
      removed: false,
      reason: data.error ?? "You have already taken payments, so this account can't be removed.",
    };
  }
  throw new Error(data.error ?? "Could not remove the seller account");
}

/**
 * Mint a single-use, short-lived magic link for the current user (a seller) and
 * throw a redirect straight into their hosted seller dashboard — one click, no
 * password, no email. The dashboard is where sellers see revenue and sales and
 * issue refunds / respond to disputes (all panel-only, not in this SDK).
 *
 *   export async function action({ request, context }: Route.ActionArgs) {
 *     await sellerPanelLink(request, context);
 *   }
 *
 * `panelPath` is an optional page inside the hosted dashboard to open (e.g. "/payouts").
 * It is never an app URL: the dashboard lives on its own origin, and a URL outside it is
 * ignored. Unlike `onboardSeller`'s `returnUrl`, the seller is not sent back to the app.
 */
export async function sellerPanelLink(
  request: Request,
  context: AppContext,
  opts?: { panelPath?: string },
): Promise<never> {
  const env = context.cloudflare.env;
  const { user } = await requireAuth(request, env);
  const appId = await resolveAppId(env);

  const res = await paymentsFetch(
    env,
    `/v1/apps/${appId}/sellers/${encodeURIComponent(user.id)}/panel-link`,
    {
      method: "POST",
      body: JSON.stringify({ callbackURL: opts?.panelPath }),
    },
  );
  const data = await res
    .json<{ url?: string; error?: string }>()
    .catch(() => ({}) as { url?: string; error?: string });

  if (res.ok && data.url) throw redirect(data.url);
  throw new Error(data.error ?? "Could not open the seller dashboard");
}
