/**
 * Builds the session state returned by the API (brief §6) from the stored document.
 * Pure function: the client never computes the gauge itself.
 */
import { deriveCardStates } from './rules.js';

const HISTORY_FIELDS = ['seq', 'deck', 'cardId', 'type', 'hintIndex', 'appliedDelta', 'gaugeAfter', 'at'];

function pick(object, fields) {
  return Object.fromEntries(fields.filter((field) => object[field] !== undefined).map((field) => [field, object[field]]));
}

/**
 * @param {object} session stored session document
 * @param {Map<string, object>} cards card index by `deck:id`
 */
export function toSessionView(session, cards) {
  const active = session.events.filter((event) => !event.undone);

  const cardStates = {};
  for (const [key, state] of deriveCardStates(session.events)) {
    cardStates[key] = {
      hintsRevealed: cards.get(key)?.hints.slice(0, state.hintsRevealed) ?? [],
      result: state.result,
    };
  }

  return {
    id: session._id,
    name: session.name,
    status: session.status,
    gauge: session.gauge,
    createdAt: session.createdAt,
    endedAt: session.endedAt,
    canUndo: session.status === 'active' && active.length > 0,
    cards: cardStates,
    history: active.map((event) => pick(event, HISTORY_FIELDS)),
  };
}
