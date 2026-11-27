import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCardIndex, CardValidationError, loadCards, toPublicCard } from '../src/game/cards.js';

const validCard = (overrides = {}) => ({
  id: '001',
  deck: 'movement',
  level: 'easy',
  question: 'Q?',
  options: ['a', 'b', 'c', 'd'],
  answer: 'A',
  hints: ['h1', 'h2', 'h3'],
  wrongPenalty: 2,
  ...overrides,
});

test('the shipped data/cards.json is valid', () => {
  const cards = loadCards(new URL('../data/cards.json', import.meta.url));
  assert.ok(cards.size > 0);
});

test('same id in both decks is allowed', () => {
  const index = buildCardIndex([validCard(), validCard({ deck: 'fuel', wrongPenalty: undefined, fuelReward: 1 })]);
  assert.ok(index.has('movement:001'));
  assert.ok(index.has('fuel:001'));
});

test('rejects duplicates, bad ids, wrong point fields and too many hints', () => {
  const bad = [
    validCard(),
    validCard(),
    validCard({ id: '1' }),
    validCard({ id: '002', deck: 'fuel', wrongPenalty: undefined }),
    validCard({ id: '003', hints: ['1', '2', '3', '4'] }),
    validCard({ id: '004', wrongPenalty: 4 }),
    validCard({ id: '005', answer: 'E' }),
    validCard({ id: '006', deck: 'fuel', fuelReward: 1 }),
  ];
  assert.throws(() => buildCardIndex(bad), (error) => {
    assert.ok(error instanceof CardValidationError);
    assert.equal(error.problems.length, 7);
    return true;
  });
});

test('public cards hide hint texts', () => {
  const [card] = buildCardIndex([validCard()]).values();
  const publicCard = toPublicCard(card);
  assert.equal(publicCard.hints, undefined);
  assert.equal(publicCard.hintCount, 3);
});
