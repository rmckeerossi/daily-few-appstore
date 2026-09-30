import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { NightBackground } from '@/components/gradients';
import { isCardId, rememberAttribution, rememberSharedCard } from '@/lib/links';
import { useSession } from '@/lib/session';

/**
 * Where a shared card link lands in the app (https://app.dailyfew.com/c/<id>).
 * Signed in: straight to that card. Not yet: remember it, and signup opens it.
 */
export default function SharedCardLink() {
  const params = useLocalSearchParams<{ id: string }>();
  const { id } = params;
  const { session, profile } = useSession();
  const signedIn = !!session && !!profile;

  useEffect(() => {
    if (!isCardId(id)) {
      router.replace('/');
    } else if (signedIn) {
      router.replace({ pathname: '/draw', params: { card: id, at: String(Date.now()) } });
    } else {
      rememberSharedCard(id);
      // UTM tags and the sharer's referral code, saved on the profile at signup.
      rememberAttribution(params);
      router.replace('/');
    }
    // Only the id decides where to go; the tags are read once with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signedIn]);

  return <NightBackground />;
}
