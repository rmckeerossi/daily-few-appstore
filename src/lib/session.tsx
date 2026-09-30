import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { getProfile, logActivity, type Profile } from './data';
import { setMyReferralCode } from './links';
import { localDate } from './dates';
import { supabase } from './supabase';

type SessionState = {
  session: Session | null;
  profile: Profile | null;
  /** True until the stored session (and its profile) has been read at launch. */
  isLoading: boolean;
  /** True while the profile is being fetched after signing in. */
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Set right after signup so the app opens straight onto the first card. */
  justSignedUp: boolean;
  setJustSignedUp: (value: boolean) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

let lastOpenLogged: string | null = null;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);

  const userId = useRef<string | null>(null);

  // `quiet` refreshes the profile without taking the person out of the app.
  const loadProfile = useCallback(async (next: Session | null, quiet = false) => {
    userId.current = next?.user.id ?? null;
    if (!next) {
      setProfile(null);
      return;
    }
    if (!quiet) setProfileLoading(true);
    try {
      const loaded = await getProfile(next.user.id);
      setMyReferralCode(loaded?.referral_code ?? null);
      setProfile(loaded);
    } catch {
      if (!quiet) setProfile(null);
    } finally {
      if (!quiet) setProfileLoading(false);
    }
    const today = localDate();
    if (lastOpenLogged !== today) {
      lastOpenLogged = today;
      logActivity('app_open');
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (active) setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'INITIAL_SESSION') return;
      // Supabase can repeat SIGNED_IN for someone already signed in (e.g. on
      // returning to the app). Only a different person means a fresh load.
      const personChanged = (next?.user.id ?? null) !== userId.current;
      if (personChanged) {
        // Mark loading in the same render as the new session, so the app never
        // briefly thinks a just-signed-in person has no profile.
        if (next) setProfileLoading(true);
        // Load outside the callback: awaiting Supabase calls inside it can deadlock.
        setTimeout(() => loadProfile(next), 0);
      } else if (event === 'USER_UPDATED') {
        setTimeout(() => loadProfile(next, true), 0);
      }
      setSession(next);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(session, !!profile), [loadProfile, session, profile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ session, profile, isLoading, profileLoading, refreshProfile, signOut, justSignedUp, setJustSignedUp }),
    [session, profile, isLoading, profileLoading, refreshProfile, signOut, justSignedUp],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
