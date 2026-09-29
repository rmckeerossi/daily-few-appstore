import { Share } from 'react-native';

import { logActivity, type Card } from './data';
import { cardLink } from './links';

// Only the question is ever shared, never an answer (PRD §4.5).
export async function shareCard(card: Card) {
  const result = await Share.share({
    message: `${card.question}\n\nA question from Daily Few: ${cardLink(card.id)}`,
  });
  if (result.action === Share.sharedAction) logActivity('card_shared', card);
}
