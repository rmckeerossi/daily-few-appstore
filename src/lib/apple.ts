// Sign in with Apple, then Supabase. Apple only hands over a name the very first
// time someone signs in, so it's kept to prefill the profile.
//
// Apple's sign-in only works in a real build of the app (TestFlight/App
// Store), not in Expo Go, so the button is hidden there.

import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { localDate, timeZone } from './dates';
import { pendingAttribution, pendingSharedCard } from './links';
import type { SignupDraft } from './signup';
import { supabase } from './supabase';

export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false; // Expo Go
  return AppleAuthentication.isAvailableAsync();
}

let appleGivenName: string | null = null;
let pendingSignup: SignupDraft | null = null;

/** The first name Apple shared on first sign-in, if any. */
export const appleName = () => appleGivenName;

/**
 * Signup step 3 chose Apple: keep what they filled in, so the profile can be
 * completed as soon as the Apple account exists (see app/finish-setup.tsx).
 */
export function rememberSignupForApple(draft: SignupDraft) {
  pendingSignup = draft;
}

/** Returns false if they cancelled Apple's sheet. Throws on real failures. */
export async function signInWithApple(): Promise<boolean> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
  if (!credential.identityToken) throw new Error('No identity token from Apple');
  appleGivenName = credential.fullName?.givenName ?? null;
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
  if (error) throw new Error(error.message);
  return true;
}

/** Whether this account was created with, or has used, Sign in with Apple. */
export function usesAppleSignIn(user: { app_metadata?: { provider?: string; providers?: string[] } }): boolean {
  const m = user.app_metadata ?? {};
  return m.provider === 'apple' || (m.providers ?? []).includes('apple');
}

/**
 * Before deleting an Apple account: a quick confirm with Apple gives a fresh
 * one-time code, which the apple-revoke function uses to cancel Daily Few's
 * access to their Apple ID (App Store guideline 5.1.1(v)).
 * Returns false if they cancelled Apple's sheet. Throws if revoking failed.
 */
export async function revokeAppleSignIn(): Promise<boolean> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
  if (!credential.authorizationCode) throw new Error('No authorization code from Apple');
  const { error } = await supabase.functions.invoke('apple-revoke', {
    body: { authorizationCode: credential.authorizationCode },
  });
  if (error) throw new Error(error.message);
  return true;
}

/** Creates the profile for an account that doesn't have one yet (18+ enforced on the server). */
export async function completeProfile(d: SignupDraft) {
  if (!d.birthday) throw new Error('Birthday missing');
  const phone = d.phone.replace(/\D/g, '');
  const { error } = await supabase.rpc('complete_profile', {
    p_first_name: d.firstName,
    p_birthday: localDate(d.birthday),
    p_phone: phone || null,
    p_season_id: d.seasonId,
    p_email_consent: d.emailConsent,
    p_text_consent: !!phone && d.textConsent,
    p_timezone: timeZone(),
    p_shared_card_id: pendingSharedCard(),
    p_attribution: pendingAttribution(),
  });
  if (error) throw new Error(error.message);
}

let tooYoung = false;

/** Their Apple account was removed for being under 18: show the gate next. */
export function markTooYoung() {
  tooYoung = true;
}

export function takeTooYoung(): boolean {
  const was = tooYoung;
  tooYoung = false;
  return was;
}

/** A signup that chose Apple, waiting to become a profile. Taken once. */
export function takePendingSignup(): SignupDraft | null {
  const d = pendingSignup;
  pendingSignup = null;
  return d;
}
