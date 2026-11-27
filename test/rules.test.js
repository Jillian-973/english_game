import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAUGE_MAX,
  GameRuleError,
  applyAction,
  assertActive,
  createSession,
  deriveCardStates,
  undoLast,
} from '../src/game/rules.js';

const NOW = new Date('2026-11-27T10:00:00Z');

const movement = Object.freeze({ id: '001', deck: 'movement', hints: ['m1', 'm2', 'm3'], wrongPenalty: 2 });
const fuel = Object.freeze({ id: '001', deck: 'fuel', hints: ['f1', 'f2', 'f3'], wrongPenalty: 1, fuelReward: 3 });
const twoHints = Object.freeze({ id: '002', deck: 'movement', hints: ['a', 'b'], wrongPenalty: 1 });

/** Applies a list of [card, type] actions, as the server would persist them. */
function play(session, actions) {
  return actions.reduce((current, [card, type]) => {
    const { event, gauge } = applyAction(current, card, type, NOW);
    return { ...current, gauge, events: [...current.events, event] };
  }, session);
}

function undo(session) {
  const { index, gauge } = undoLast(session);
  const events = session.events.map((event, i) => (i === index ? { ...event, undone: true } : event));
  return { ...session, gauge, events };
}

const fresh = (gauge = GAUGE_MAX) => ({ ...createSession({ id: 's1', name: 'Table', now: NOW }), gauge });

const assertRule = (fn, code) => assert.throws(fn, (error) => error instanceof GameRuleError && error.code === code);

describe('gauge', () => {
  test('starts at 10', () => {
    assert.equal(createSession({ id: 's1', name: 'T', now: NOW }).gauge, 10);
  });

  test('movement correct leaves the gauge unchanged, wrong costs wrongPenalty', () => {
    assert.equal(play(fresh(), [[movement, 'correct']]).gauge, 10);
    assert.equal(play(fresh(), [[movement, 'wrong']]).gauge, 8);
  });

  test('fuel correct adds fuelReward, capped at 10', () => {
    assert.equal(play(fresh(5), [[fuel, 'correct']]).gauge, 8);
    const capped = play(fresh(9), [[fuel, 'correct']]);
    assert.equal(capped.gauge, 10);
    assert.equal(capped.events[0].appliedDelta, 1);
  });

  test('each hint costs exactly 1 point', () => {
    const session = play(fresh(), [[movement, 'hint'], [movement, 'hint']]);
    assert.equal(session.gauge, 8);
    assert.deepEqual(session.events.map((e) => e.appliedDelta), [-1, -1]);
    assert.deepEqual(session.events.map((e) => e.hintIndex), [1, 2]);
  });

  test('3 hints then wrong: -3 - wrongPenalty, clamped at 0', () => {
    assert.equal(play(fresh(), [[movement, 'hint'], [movement, 'hint'], [movement, 'hint'], [movement, 'wrong']]).gauge, 5);
    assert.equal(play(fresh(4), [[movement, 'hint'], [movement, 'hint'], [movement, 'hint'], [movement, 'wrong']]).gauge, 0);
  });

  test('N hints then correct: only the hint costs (plus the fuel reward)', () => {
    assert.equal(play(fresh(), [[movement, 'hint'], [movement, 'hint'], [movement, 'correct']]).gauge, 8);
    assert.equal(play(fresh(5), [[fuel, 'hint'], [fuel, 'correct']]).gauge, 7);
  });

  test('never goes below 0 and appliedDelta reflects the clamping', () => {
    const session = play(fresh(1), [[movement, 'wrong']]);
    assert.equal(session.gauge, 0);
    assert.equal(session.events[0].appliedDelta, -1);
    assert.equal(session.events[0].gaugeAfter, 0);
  });

  test('0 does not end the game: the gauge can go up again', () => {
    const session = play(fresh(0), [[fuel, 'correct']]);
    assert.equal(session.status, 'active');
    assert.equal(session.gauge, 3);
  });
});

describe('card sequence', () => {
  test('a 4th hint is refused, and hints beyond the card hint count too', () => {
    const three = play(fresh(), [[movement, 'hint'], [movement, 'hint'], [movement, 'hint']]);
    assertRule(() => applyAction(three, movement, 'hint', NOW), 'NO_HINT_LEFT');

    const two = play(fresh(), [[twoHints, 'hint'], [twoHints, 'hint']]);
    assertRule(() => applyAction(two, twoHints, 'hint', NOW), 'NO_HINT_LEFT');
  });

  test('hint after an answer and a second answer are refused', () => {
    const answered = play(fresh(), [[movement, 'correct']]);
    assertRule(() => applyAction(answered, movement, 'hint', NOW), 'CARD_ANSWERED');
    assertRule(() => applyAction(answered, movement, 'wrong', NOW), 'CARD_ANSWERED');
  });

  test('movement:001 and fuel:001 are independent', () => {
    const session = play(fresh(), [[movement, 'correct'], [fuel, 'hint'], [fuel, 'wrong']]);
    const states = deriveCardStates(session.events);
    assert.deepEqual(states.get('movement:001'), { hintsRevealed: 0, result: 'correct' });
    assert.deepEqual(states.get('fuel:001'), { hintsRevealed: 1, result: 'wrong' });
  });

  test('unknown action type is refused', () => {
    assertRule(() => applyAction(fresh(), movement, 'skip', NOW), 'INVALID_ACTION');
  });
});

describe('undo', () => {
  test('restores the gauge exactly, including after clamping at 0 and 10', () => {
    const low = play(fresh(1), [[movement, 'wrong']]);
    assert.equal(undo(low).gauge, 1);

    const high = play(fresh(9), [[fuel, 'correct']]);
    assert.equal(undo(high).gauge, 9);
  });

  test('un-greys the card and hides the last revealed hint', () => {
    const session = undo(undo(play(fresh(), [[movement, 'hint'], [movement, 'hint'], [movement, 'wrong']])));
    assert.deepEqual(deriveCardStates(session.events).get('movement:001'), { hintsRevealed: 1, result: null });
    assert.equal(session.gauge, 9);
    // the hint can be taken again, with the same index
    assert.equal(applyAction(session, movement, 'hint', NOW).event.hintIndex, 2);
  });

  test('is repeatable and keeps undone events (marked, not deleted)', () => {
    const session = undo(undo(play(fresh(), [[movement, 'hint'], [fuel, 'hint']])));
    assert.equal(session.gauge, 10);
    assert.equal(session.events.length, 2);
    assert.ok(session.events.every((e) => e.undone));
  });

  test('is refused when there is nothing to undo', () => {
    assertRule(() => undoLast(fresh()), 'NOTHING_TO_UNDO');
    assertRule(() => undoLast(undo(play(fresh(), [[movement, 'hint']]))), 'NOTHING_TO_UNDO');
  });
});

describe('finished session', () => {
  const finished = { ...play(fresh(), [[movement, 'hint']]), status: 'finished' };

  test('any action, undo or end after the end is refused', () => {
    assertRule(() => applyAction(finished, movement, 'hint', NOW), 'SESSION_FINISHED');
    assertRule(() => undoLast(finished), 'SESSION_FINISHED');
    assertRule(() => assertActive(finished), 'SESSION_FINISHED');
  });
});

describe('events', () => {
  test('are numbered chronologically and timestamped', () => {
    const session = play(fresh(), [[movement, 'hint'], [fuel, 'correct']]);
    assert.deepEqual(session.events.map((e) => e.seq), [1, 2]);
    assert.ok(session.events.every((e) => e.at.getTime() === NOW.getTime() && e.undone === false));
  });
});
