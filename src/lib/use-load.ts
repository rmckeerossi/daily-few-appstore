import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Loads data when the screen comes into view, and again each time it's
 * revisited, so counts and "answered today" stay current after the person
 * answers something elsewhere. `key` should change whenever `load` would
 * fetch something different (e.g. a route param).
 */
export function useLoad<T>(load: () => Promise<T>, key = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    setError(false);
    load().then(setData, (e) => {
      if (__DEV__) console.warn('Load failed:', e instanceof Error ? e.message : e);
      setError(true);
    });
    // `load` is usually an inline closure; `key` says when it really changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useFocusEffect(reload);

  return { data, error, reload, setData };
}
