// The Answer screen is a modal on top of Draw/Home. When it saves, it leaves a
// note here so the screen underneath can show "Saved to September." on return.

let lastSaved: { cardId: string; at: number } | null = null;

export function noteAnswerSaved(cardId: string) {
  lastSaved = { cardId, at: Date.now() };
}

/** Returns true (once) if this card was just answered. */
export function takeAnswerSaved(cardId: string): boolean {
  if (lastSaved?.cardId === cardId && Date.now() - lastSaved.at < 10 * 60 * 1000) {
    lastSaved = null;
    return true;
  }
  return false;
}
