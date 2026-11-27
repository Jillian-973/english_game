import { Router } from 'express';
import { toPublicCard } from '../game/cards.js';

/** GET /api/cards — every card without its hint texts. */
export function cardsRouter(cards) {
  const list = [...cards.values()]
    .map(toPublicCard)
    .sort((a, b) => a.deck.localeCompare(b.deck) || a.id.localeCompare(b.id));

  const router = Router();
  router.get('/', (req, res) => res.json(list));
  return router;
}
