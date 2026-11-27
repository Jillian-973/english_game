/**
 * Use cases of a game session: load → apply the rules → persist → return the state.
 * The routes only translate HTTP to these calls.
 */
import { randomUUID } from 'node:crypto';
import { cardKey, DECKS } from '../game/cards.js';
import { ACTION_TYPES, applyAction, assertActive, createSession, undoLast } from '../game/rules.js';
import { toSessionView } from '../game/session-view.js';
import { badRequest, conflict, notFound } from '../http/errors.js';

export const NAME_MAX_LENGTH = 40;

const CONCURRENT_WRITE = 'The game was updated at the same time, please try again.';

export class SessionService {
  #store;
  #cards;
  #now;
  #newId;

  /**
   * @param {{ store: object, cards: Map<string, object>, now?: () => Date, newId?: () => string }} deps
   */
  constructor({ store, cards, now = () => new Date(), newId = randomUUID }) {
    this.#store = store;
    this.#cards = cards;
    this.#now = now;
    this.#newId = newId;
  }

  async create(rawName) {
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name || name.length > NAME_MAX_LENGTH) {
      throw badRequest(`Session name must be 1 to ${NAME_MAX_LENGTH} characters.`);
    }

    const session = createSession({ id: this.#newId(), name, now: this.#now() });
    await this.#store.insert(session);
    return this.#view(session);
  }

  async get(id) {
    return this.#view(await this.#load(id));
  }

  async act(id, { deck, cardId, type } = {}) {
    if (!DECKS.includes(deck)) throw badRequest(`deck must be one of: ${DECKS.join(', ')}.`);
    if (!ACTION_TYPES.includes(type)) throw badRequest(`type must be one of: ${ACTION_TYPES.join(', ')}.`);

    const card = this.#cards.get(cardKey(deck, cardId));
    if (!card) throw badRequest('Unknown card.');

    const session = await this.#load(id);
    const { event, gauge } = applyAction(session, card, type, this.#now());
    await this.#write(() => this.#store.appendEvent(session, event, gauge));
    return this.get(id);
  }

  async undo(id) {
    const session = await this.#load(id);
    const { index, gauge } = undoLast(session);
    await this.#write(() => this.#store.markUndone(session, index, gauge));
    return this.get(id);
  }

  async end(id) {
    const session = await this.#load(id);
    assertActive(session);
    await this.#write(() => this.#store.finish(session, this.#now()));
    return this.get(id);
  }

  async #load(id) {
    const session = typeof id === 'string' ? await this.#store.findById(id) : null;
    if (!session) throw notFound('Session not found.');
    return session;
  }

  async #write(operation) {
    if (!(await operation())) throw conflict(CONCURRENT_WRITE);
  }

  #view(session) {
    return toSessionView(session, this.#cards);
  }
}
