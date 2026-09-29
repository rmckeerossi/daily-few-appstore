import { Share } from 'react-native';

import { logActivity, type Card } from './data';

// Only the question is ever shared, never an answer (PRD §4.5). The link to the
// card arrives with the shared-card page in a later milestone.
export async function shareCard(card: Card) {
  const result = await Share.share({ message: `${card.question}\n\nA question from Daily Few.` });
  if (result.action === Share.sharedAction) logActivity('card_shared', card);
}
