---
name: custom-auth
description: Customizing authentication — magic link, email OTP, passwordless, custom login/signup flows, auth hooks, "login without a password", "email me a code", or any change to how app users sign in or sign up. Load BEFORE touching auth. The platform's auth already includes email+password, Stencil OAuth, magic link, and email OTP; you almost never need new auth code, and you must NEVER instantiate betterAuth() yourself — doing so silently severs the app from platform signup tracking and email marketing sync.
metadata:
  agents: [chat, builder]
---

# Custom auth

The platform layer (`app/.stencil/auth/`) owns authentication. Its `createAuth`
already ships, enabled and wired to the app's email sender:

- **Email + password** (`emailAndPassword`)
- **Stencil OAuth** (the "continue with Stencil" flow)
- **Magic link** (`magicLink` — passwordless sign-in links)
- **Email OTP** (`emailOTP` — one-time sign-in codes)

A request for "magic link login" or "sign in with a code" is a **UI change, not an
auth change**: build the login form against the existing Better Auth client routes
(`/api/auth/*` — e.g. `signIn.magicLink`, `emailOtp`) and, if asked, hide the
password fields. The server needs nothing.

## The one hard rule

**Never call `betterAuth()` yourself, and never bypass or reimplement the layer's
`createAuth`.** The layer's auth carries `databaseHooks` that report every signup
and session to the platform. A parallel Better Auth instance looks identical to
the app user but silently severs the app from:

- the platform's app-user analytics (the builder's App users tiles stop updating), and
- the builder's Flodesk email-marketing sync.

Nothing errors. The data is simply gone, permanently. Deploys warn when a bundle
has auth but lost this wiring — treat that warning as a defect in your change.

## Extension points that ARE yours

- **Hooks on auth events** (welcome flows, provisioning a profile row, sending a
  notification): create `app/auth-hooks.server.ts` default-exporting Better Auth
  `databaseHooks` (or `(env) => databaseHooks`). The layer merges them over its
  own — both run, platform first. Never edit `app/.stencil/auth/` for this.
- **Login/signup UI**: fully yours. Any combination of the four built-in methods.
  A "Continue with Google" button must call `signInWithGoogle({ callbackURL })` from
  `~stencil/auth/browser.client`, never `signIn.oauth2` directly: the App preview runs
  the app in a frame and Google refuses to load in one, so the helper opens Google in a
  popup and resolves with `{ error }` (`null` on success, an error code such as
  `signup_disabled` for the page to show).
- **Gating signups**: the app's `allowSignup` setting already controls whether the
  passwordless methods accept unknown addresses — don't rebuild it.

## If a method is genuinely missing

A capability the four built-ins can't express (SMS OTP, a third-party social
login) is **platform work, not app code**: say so in your build summary and stop,
rather than instantiating a second auth system that works today and orphans the
app's data forever.
