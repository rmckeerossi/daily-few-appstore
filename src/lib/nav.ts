import { router, type Href } from 'expo-router';

/**
 * Back, or somewhere sensible when there's nothing to go back to (e.g. the
 * app reopened straight onto this screen).
 */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
