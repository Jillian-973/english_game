/** Remembers the current session id so a reload resumes the game (brief §7.1). */

const KEY = 'devot.sessionId';

export function loadSessionId() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // storage disabled (private mode): no resume, the game still works
  }
}

export function saveSessionId(id) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearSessionId() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
