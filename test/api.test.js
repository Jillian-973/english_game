import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/create-app.js';
import { loadCards } from '../src/game/cards.js';
import { MemorySessionStore } from '../src/sessions/memory-store.js';

const cards = loadCards(new URL('../data/cards.json', import.meta.url));
let server;
let baseUrl;

before(async () => {
  const app = createApp({ cards, store: new MemorySessionStore() });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function call(method, path, body) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

const newSession = async (name = 'Table of Alice') => (await call('POST', '/sessions', { name })).body;

describe('GET /api/cards', () => {
  test('lists every card without hint texts', async () => {
    const { status, body } = await call('GET', '/cards');
    assert.equal(status, 200);
    assert.equal(body.length, cards.size);
    assert.ok(body.every((card) => card.hints === undefined && card.hintCount >= 1));
    assert.ok(body.find((card) => card.deck === 'fuel').fuelReward >= 1);
  });
});

describe('POST /api/sessions', () => {
  test('creates a session with a trimmed name and a full gauge', async () => {
    const { status, body } = await call('POST', '/sessions', { name: '  Table 3  ' });
    assert.equal(status, 201);
    assert.equal(body.name, 'Table 3');
    assert.equal(body.gauge, 10);
    assert.equal(body.status, 'active');
    assert.equal(body.canUndo, false);
    assert.match(body.id, /^[0-9a-f-]{36}$/);
  });

  test('rejects an empty or too long name', async () => {
    assert.equal((await call('POST', '/sessions', { name: '   ' })).status, 400);
    assert.equal((await call('POST', '/sessions', { name: 'x'.repeat(41) })).status, 400);
    assert.equal((await call('POST', '/sessions', {})).status, 400);
  });

  test('rejects malformed JSON', async () => {
    const { status, body } = await call('POST', '/sessions', '{bad json');
    assert.equal(status, 400);
    assert.ok(body.error);
  });
});

describe('GET /api/sessions/:id', () => {
  test('returns 404 for an unknown session', async () => {
    assert.equal((await call('GET', '/sessions/unknown')).status, 404);
  });
});

describe('a full game', () => {
  test('hints, answers, undo, end and recap', async () => {
    const { id } = await newSession();

    let state = (await call('POST', `/sessions/${id}/actions`, { deck: 'movement', cardId: '001', type: 'hint' })).body;
    assert.equal(state.gauge, 9);
    assert.deepEqual(state.cards['movement:001'], { hintsRevealed: ['It displays text.'], result: null });

    state = (await call('POST', `/sessions/${id}/actions`, { deck: 'movement', cardId: '001', type: 'wrong' })).body;
    assert.equal(state.gauge, 8);
    assert.equal(state.cards['movement:001'].result, 'wrong');

    const again = await call('POST', `/sessions/${id}/actions`, { deck: 'movement', cardId: '001', type: 'hint' });
    assert.equal(again.status, 409);

    state = (await call('POST', `/sessions/${id}/undo`)).body;
    assert.equal(state.gauge, 9);
    assert.equal(state.cards['movement:001'].result, null);

    state = (await call('POST', `/sessions/${id}/actions`, { deck: 'fuel', cardId: '050', type: 'correct' })).body;
    assert.equal(state.gauge, 10);

    // reloading returns exactly the same state
    assert.deepEqual((await call('GET', `/sessions/${id}`)).body, state);

    const ended = (await call('POST', `/sessions/${id}/end`)).body;
    assert.equal(ended.status, 'finished');
    assert.ok(ended.endedAt);
    assert.equal(ended.canUndo, false);
    assert.deepEqual(
      ended.history.map(({ deck, cardId, type, appliedDelta }) => [deck, cardId, type, appliedDelta]),
      [['movement', '001', 'hint', -1], ['fuel', '050', 'correct', 1]],
    );

    assert.equal((await call('POST', `/sessions/${id}/actions`, { deck: 'fuel', cardId: '016', type: 'hint' })).status, 409);
    assert.equal((await call('POST', `/sessions/${id}/undo`)).status, 409);
    assert.equal((await call('POST', `/sessions/${id}/end`)).status, 409);
  });

  test('rejects invalid actions with 400', async () => {
    const { id } = await newSession();
    assert.equal((await call('POST', `/sessions/${id}/actions`, { deck: 'event', cardId: '001', type: 'hint' })).status, 400);
    assert.equal((await call('POST', `/sessions/${id}/actions`, { deck: 'fuel', cardId: '999', type: 'hint' })).status, 400);
    assert.equal((await call('POST', `/sessions/${id}/actions`, { deck: 'fuel', cardId: '016', type: 'skip' })).status, 400);
  });

  test('undo with nothing to undo is a conflict', async () => {
    const { id } = await newSession();
    assert.equal((await call('POST', `/sessions/${id}/undo`)).status, 409);
  });

  test('10 tables can play at the same time', async () => {
    const sessions = await Promise.all(Array.from({ length: 10 }, (_, i) => newSession(`Table ${i + 1}`)));
    const results = await Promise.all(
      sessions.map(({ id }) => call('POST', `/sessions/${id}/actions`, { deck: 'movement', cardId: '002', type: 'wrong' })),
    );
    assert.ok(results.every(({ status, body }) => status === 200 && body.gauge === 9));
  });
});

test('unknown API routes return a JSON 404', async () => {
  const { status, body } = await call('GET', '/nope');
  assert.equal(status, 404);
  assert.ok(body.error);
});
