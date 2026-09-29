import { Image } from 'expo-image';
import { Lock } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { LOCK_AFTER_MS, lockEnabled, lockMethod, unlock, type LockMethod } from '@/lib/app-lock';
import { colors, fonts, type } from '@/theme/tokens';

import { PrimaryButton } from './buttons';
import { NightBackground } from './gradients';
import { BodyLight } from './text';

const submark = require('@/assets/images/brand/submark-white.png');

/**
 * Covers the app when the lock is on: at launch, and after it's been in the
 * background for more than 30 seconds. While the app is switching away it
 * also hides what's on screen, so the app switcher never shows an answer.
 * Only applies while someone is signed in.
 */
export function LockGate({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const [locked, setLocked] = useState(() => signedIn && lockEnabled());
  const [covered, setCovered] = useState(false);
  const [method, setMethod] = useState<LockMethod>(null);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const tryUnlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      if (await unlock()) setLocked(false);
    } finally {
      prompting.current = false;
    }
  }, []);

  useEffect(() => {
    lockMethod().then(setMethod, () => setMethod(null));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const enabled = signedIn && lockEnabled();
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'inactive') {
        // Face ID's own prompt also makes the app "inactive", so only cover when unlocked.
        if (enabled && !prompting.current) setCovered(true);
      } else if (state === 'active') {
        setCovered(false);
        const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        backgroundedAt.current = null;
        if (enabled && away > LOCK_AFTER_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [signedIn]);

  // Ask straight away whenever the lock appears.
  useEffect(() => {
    if (locked && signedIn) tryUnlock();
  }, [locked, signedIn, tryUnlock]);

  const showLock = locked && signedIn;

  return (
    <View style={{ flex: 1 }}>
      {children}
      {showLock ? (
        <View style={StyleSheet.absoluteFill}>
          <NightBackground />
          <View style={styles.center}>
            <Image source={submark} style={styles.submark} contentFit="contain" accessibilityLabel="Daily Few" />
            <View style={{ gap: 10, alignItems: 'center' }}>
              <Text style={styles.title}>Daily Few is locked.</Text>
              <BodyLight style={{ textAlign: 'center' }}>Your reflections stay private.</BodyLight>
            </View>
            <PrimaryButton
              label={method && method !== 'passcode' ? `Unlock with ${method}` : 'Unlock'}
              onPress={tryUnlock}
              style={{ alignSelf: 'stretch' }}
            />
          </View>
        </View>
      ) : covered ? (
        <View style={StyleSheet.absoluteFill}>
          <NightBackground />
          <View style={styles.center}>
            <Lock size={28} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32, paddingHorizontal: 32 },
  submark: { width: 56, height: 40, opacity: 0.9 },
  title: { ...type.greeting, fontFamily: fonts.displayLight, color: colors.textPrimary, textAlign: 'center' },
});
