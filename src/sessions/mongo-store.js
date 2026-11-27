/**
 * Session persistence on MongoDB.
 *
 * Every write is a single atomic `updateOne` guarded by `status: "active"` and by the
 * `revision` read before computing the change (optimistic locking). A write that matches
 * nothing means the session changed or ended in between: the caller reports a conflict.
 */
export class MongoSessionStore {
  #collection;
  #indexesReady = null;

  /** @param {() => Promise<import('mongodb').Db>} getDb */
  constructor(getDb) {
    this.#collection = async () => {
      const db = await getDb();
      const collection = db.collection('sessions');
      this.#indexesReady ??= collection.createIndex({ createdAt: 1 });
      await this.#indexesReady;
      return collection;
    };
  }

  async insert(session) {
    const collection = await this.#collection();
    await collection.insertOne({ ...session, revision: 0 });
  }

  async findById(id) {
    const collection = await this.#collection();
    return collection.findOne({ _id: id });
  }

  async appendEvent(session, event, gauge) {
    return this.#update(session, { $push: { events: event }, $set: { gauge } });
  }

  async markUndone(session, index, gauge) {
    return this.#update(session, { $set: { [`events.${index}.undone`]: true, gauge } });
  }

  async finish(session, endedAt) {
    return this.#update(session, { $set: { status: 'finished', endedAt } });
  }

  async #update(session, update) {
    const collection = await this.#collection();
    const result = await collection.updateOne(
      { _id: session._id, status: 'active', revision: session.revision },
      { ...update, $inc: { revision: 1 } },
    );
    return result.matchedCount === 1;
  }
}
