// Optional app lock: Face ID (or Touch ID / the phone's passcode) to open the
// app. It's a setting for this phone, not the account, since it's about who can
// pick up this particular device.

import * as LocalAuthentication from 'expo-local-authentication';

const KEY = 'app-lock';

/** How long the app can be in the background before it locks again. */
export const LOCK_AFTER_MS = 30_000;

export function lockEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setLockEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {}
}

export type LockMethod = 'Face ID' | 'Touch ID' | 'passcode' | null;

/** What this phone can unlock with, or null if nothing is set up. */
export async function lockMethod(): Promise<LockMethod> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) return null;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (level === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG || level === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK) {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Touch ID';
  }
  return 'passcode';
}

/** Face ID, falling back to the phone's passcode if Face ID fails. */
export async function unlock(reason = 'Unlock Daily Few'): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use passcode',
    disableDeviceFallback: false,
  });
  return result.success;
}
