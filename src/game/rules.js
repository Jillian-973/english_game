/**
 * Game rules engine — PURE: no database, no clock, no I/O.
 * Functions take the current session state and return what must be persisted.
 */
import { cardKey } from './cards.js';

export const GAUGE_MIN = 0;
export const GAUGE_MAX = 10;
export const HINT_COST = 1;
export const ACTION_TYPES = Object.freeze(['hint', 'correct', 'wrong']);

/** Business rule violation. `code` is stable and can be tested; the API maps it to 409. */
export class GameRuleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GameRuleError';
    this.code = code;
  }
}

const clamp = (value) => Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, value));

/** New session document (before persistence). */
export function createSession({ id, name, now }) {
  return {
    _id: id,
    name,
    status: 'active',
    gauge: GAUGE_MAX,
    createdAt: now,
    endedAt: null,
    events: [],
  };
}

export function assertActive(session) {
  if (session.status !== 'active') {
    throw new GameRuleError('SESSION_FINISHED', 'The game is over.');
  }
}

/**
 * State of every touched card, derived from the events that are not undone.
 * @returns {Map<string, { hintsRevealed: number, result: 'correct' | 'wrong' | null }>}
 */
export function deriveCardStates(events) {
  const states = new Map();
  for (const event of events) {
    if (event.undone) continue;
    const key = cardKey(event.deck, event.cardId);
    const state = states.get(key) ?? { hintsRevealed: 0, result: null };
    if (event.type === 'hint') state.hintsRevealed += 1;
    else state.result = event.type;
    states.set(key, state);
  }
  return states;
}

function nominalDelta(card, type) {
  if (type === 'hint') return -HINT_COST;
  if (type === 'wrong') return -card.wrongPenalty;
  return card.deck === 'fuel' ? card.fuelReward : 0; // correct
}

/**
 * Applies a player action on a card.
 * @returns {{ event: object, gauge: number }} the event to append and the new gauge
 * @throws {GameRuleError}
 */
export function applyAction(session, card, type, now) {
  assertActive(session);
  if (!ACTION_TYPES.includes(type)) {
    throw new GameRuleError('INVALID_ACTION', `Unknown action "${type}".`);
  }

  const state = deriveCardStates(session.events).get(cardKey(card.deck, card.id)) ?? { hintsRevealed: 0, result: null };
  if (state.result) {
    throw new GameRuleError('CARD_ANSWERED', 'This card has already been answered.');
  }
  if (type === 'hint' && state.hintsRevealed >= card.hints.length) {
    throw new GameRuleError('NO_HINT_LEFT', 'No hint left on this card.');
  }

  const gauge = clamp(session.gauge + nominalDelta(card, type));
  const event = {
    seq: session.events.length + 1,
    deck: card.deck,
    cardId: card.id,
    type,
    ...(type === 'hint' && { hintIndex: state.hintsRevealed + 1 }),
    appliedDelta: gauge - session.gauge,
    gaugeAfter: gauge,
    at: now,
    undone: false,
  };

  return { event, gauge };
}

/**
 * Cancels the last action that is not undone yet.
 * @returns {{ index: number, event: object, gauge: number }} index of the event to mark as undone
 * @throws {GameRuleError}
 */
export function undoLast(session) {
  assertActive(session);
  const index = session.events.findLastIndex((event) => !event.undone);
  if (index === -1) {
    throw new GameRuleError('NOTHING_TO_UNDO', 'There is nothing to undo.');
  }
  const event = session.events[index];
  return { index, event, gauge: session.gauge - event.appliedDelta };
}
