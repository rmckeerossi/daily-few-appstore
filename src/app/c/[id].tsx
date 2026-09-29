import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { NightBackground } from '@/components/gradients';
import { isCardId, rememberSharedCard } from '@/lib/links';
import { useSession } from '@/lib/session';

/**
 * Where a shared card link lands in the app (https://app.dailyfew.com/c/<id>).
 * Signed in: straight to that card. Not yet: remember it, and signup opens it.
 */
export default function SharedCardLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useSession();
  const signedIn = !!session && !!profile;

  useEffect(() => {
    if (!isCardId(id)) {
      router.replace('/');
    } else if (signedIn) {
      router.replace({ pathname: '/draw', params: { card: id, at: String(Date.now()) } });
    } else {
      rememberSharedCard(id);
      router.replace('/');
    }
  }, [id, signedIn]);

  return <NightBackground />;
}
