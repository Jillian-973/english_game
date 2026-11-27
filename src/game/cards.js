import { readFileSync } from 'node:fs';

export const DECKS = Object.freeze(['movement', 'fuel']);
export const LEVELS = Object.freeze(['easy', 'medium', 'hard']);
export const OPTION_LETTERS = Object.freeze(['A', 'B', 'C', 'D']);
export const MAX_HINTS = 3;

const ID_PATTERN = /^\d{3}$/;

export class CardValidationError extends Error {
  constructor(problems) {
    super(`Invalid cards file:\n  - ${problems.join('\n  - ')}`);
    this.name = 'CardValidationError';
    this.problems = problems;
  }
}

/** Internal key of a card: the same id can exist in both decks. */
export function cardKey(deck, id) {
  return `${deck}:${id}`;
}

const isPoints = (value) => Number.isInteger(value) && value >= 1 && value <= 3;
const isText = (value) => typeof value === 'string' && value.trim().length > 0;

function validateCard(card, index) {
  const where = `card #${index + 1}${card?.id ? ` (${card.deck}:${card.id})` : ''}`;
  const problems = [];

  if (!card || typeof card !== 'object') return [`${where}: must be an object`];
  if (!DECKS.includes(card.deck)) problems.push(`${where}: deck must be one of ${DECKS.join(', ')}`);
  if (typeof card.id !== 'string' || !ID_PATTERN.test(card.id)) problems.push(`${where}: id must be a 3-digit string such as "007"`);
  if (!LEVELS.includes(card.level)) problems.push(`${where}: level must be one of ${LEVELS.join(', ')}`);
  if (!isText(card.question)) problems.push(`${where}: question is required`);

  if (!Array.isArray(card.options) || card.options.length !== OPTION_LETTERS.length || !card.options.every(isText)) {
    problems.push(`${where}: options must contain ${OPTION_LETTERS.length} texts`);
  }
  if (!OPTION_LETTERS.includes(card.answer)) problems.push(`${where}: answer must be one of ${OPTION_LETTERS.join(', ')}`);

  if (!Array.isArray(card.hints) || card.hints.length < 1 || card.hints.length > MAX_HINTS || !card.hints.every(isText)) {
    problems.push(`${where}: hints must contain 1 to ${MAX_HINTS} texts`);
  }

  if (!isPoints(card.wrongPenalty)) problems.push(`${where}: wrongPenalty must be an integer from 1 to 3`);
  if (card.deck === 'fuel' && !isPoints(card.fuelReward)) problems.push(`${where}: fuelReward must be an integer from 1 to 3`);
  if (card.deck === 'movement' && card.fuelReward !== undefined) problems.push(`${where}: movement cards have no fuelReward`);

  return problems;
}

/**
 * Validates the card list and indexes it by key.
 * @returns {Map<string, object>} frozen cards by `deck:id`
 * @throws {CardValidationError}
 */
export function buildCardIndex(cards) {
  if (!Array.isArray(cards)) throw new CardValidationError(['the file must contain an array of cards']);

  const problems = cards.flatMap(validateCard);
  const index = new Map();

  cards.forEach((card) => {
    const key = cardKey(card?.deck, card?.id);
    if (index.has(key)) problems.push(`duplicate card ${key}`);
    index.set(key, Object.freeze({ ...card, options: Object.freeze([...card.options ?? []]), hints: Object.freeze([...card.hints ?? []]) }));
  });

  if (problems.length) throw new CardValidationError(problems);
  return index;
}

/** Reads and validates a cards JSON file. Fails loudly so a bad file never reaches production. */
export function loadCards(fileUrl) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(fileUrl, 'utf8'));
  } catch (error) {
    throw new CardValidationError([`cannot read ${fileUrl}: ${error.message}`]);
  }
  return buildCardIndex(parsed);
}

/** Public shape of a card: hint texts stay on the server until revealed. */
export function toPublicCard(card) {
  const { hints, ...rest } = card;
  return { ...rest, hintCount: hints.length };
}
