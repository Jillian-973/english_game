import { GameRuleError } from '../game/rules.js';

/** Error with an HTTP status, raised by the routes and the session service. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message) => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);

/** Express error middleware: every error becomes `{ error: message }` (brief §6). */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof GameRuleError) {
    return res.status(409).json({ error: error.message, code: error.code });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  console.error(error);
  return res.status(500).json({ error: 'Internal server error.' });
}
