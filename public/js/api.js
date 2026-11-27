/**
 * HTTP client of the companion API (brief §6).
 * The server is the source of truth: every call returns the full session state.
 */

/** Error returned by the API (`{ error }` body) or raised when the network fails. */
export class ApiError extends Error {
  /** @param {number} status HTTP status, 0 when the request never reached the server */
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Network error');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? `HTTP ${response.status}`);
  }
  return data;
}

const sessionPath = (id) => `/sessions/${encodeURIComponent(id)}`;

export const api = {
  getCards: () => request('GET', '/cards'),
  createSession: (name) => request('POST', '/sessions', { name }),
  getSession: (id) => request('GET', sessionPath(id)),
  sendAction: (id, deck, cardId, type) => request('POST', `${sessionPath(id)}/actions`, { deck, cardId, type }),
  undo: (id) => request('POST', `${sessionPath(id)}/undo`),
  endSession: (id) => request('POST', `${sessionPath(id)}/end`),
};
