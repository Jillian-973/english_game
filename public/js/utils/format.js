import { DECKS } from '../config.js';

const ACTION_LABELS = { correct: 'Right', wrong: 'False' };

/** "+3", "−2", "0" (uses the typographic minus sign). */
export function formatDelta(delta) {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return '0';
}

/** "Question 031 — Hint 2" */
export function formatAction({ deck, cardId, type, hintIndex }) {
  const action = type === 'hint' ? `Hint ${hintIndex}` : ACTION_LABELS[type];
  return `${DECKS[deck].recapLabel} ${cardId} — ${action}`;
}

/** Card ids are 3-digit strings printed on the physical cards: "031" → "31". */
export function shortId(id) {
  return String(Number(id));
}
