/**
 * In-memory session store with the same contract as MongoSessionStore.
 * Used by the API tests (no database needed).
 */
export class MemorySessionStore {
  #sessions = new Map();

  async insert(session) {
    this.#sessions.set(session._id, structuredClone({ ...session, revision: 0 }));
  }

  async findById(id) {
    const session = this.#sessions.get(id);
    return session ? structuredClone(session) : null;
  }

  async appendEvent(session, event, gauge) {
    return this.#update(session, (stored) => {
      stored.events.push(structuredClone(event));
      stored.gauge = gauge;
    });
  }

  async markUndone(session, index, gauge) {
    return this.#update(session, (stored) => {
      stored.events[index].undone = true;
      stored.gauge = gauge;
    });
  }

  async finish(session, endedAt) {
    return this.#update(session, (stored) => {
      stored.status = 'finished';
      stored.endedAt = endedAt;
    });
  }

  async #update(session, apply) {
    const stored = this.#sessions.get(session._id);
    if (!stored || stored.status !== 'active' || stored.revision !== session.revision) return false;
    apply(stored);
    stored.revision += 1;
    return true;
  }
}
