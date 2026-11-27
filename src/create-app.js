import express from 'express';
import { cardsRouter } from './routes/cards.js';
import { sessionsRouter } from './routes/sessions.js';
import { SessionService } from './sessions/session-service.js';
import { errorHandler, notFound } from './http/errors.js';

/**
 * Builds the Express application. Dependencies are injected so the tests can use an
 * in-memory store instead of MongoDB.
 *
 * @param {{
 *   cards: Map<string, object>,
 *   store: object,
 *   staticDir?: string | URL,   // serve the front-end locally (Vercel serves public/ itself)
 *   now?: () => Date,
 *   newId?: () => string,
 * }} options
 */
export function createApp({ cards, store, staticDir, now, newId }) {
  const app = express();
  const sessions = new SessionService({ store, cards, now, newId });

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.use('/api/cards', cardsRouter(cards));
  app.use('/api/sessions', sessionsRouter(sessions));
  app.use('/api', (req, res, next) => next(notFound('Route not found.')));

  if (staticDir) app.use(express.static(staticDir));

  app.use(errorHandler);
  return app;
}
