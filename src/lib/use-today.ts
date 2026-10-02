import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { localDate } from './dates';

/**
 * Today's local date ("YYYY-MM-DD"), kept current: it updates when the app
 * comes back from the background on a new day, and at midnight if it's open.
 * Screens key off it so a new day starts fresh (a new check-in, a new card).
 */
export function useToday(): string {
  const [today, setToday] = useState(() => localDate());

  useEffect(() => {
    const check = () => setToday(localDate());
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const timer = setTimeout(check, midnight.getTime() - now.getTime());
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [today]);

  return today;
}
