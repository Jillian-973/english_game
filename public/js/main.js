/**
 * Entry point: wires the screens to the API.
 *
 * The server owns the game state (brief §4.7): the client sends intents, then displays the
 * session state it receives. It never computes the gauge itself.
 */
import { FEATURES, GAUGE_MAX } from './config.js';
import { api, ApiError } from './api.js';
import { clearSessionId, loadSessionId, saveSessionId } from './session-storage.js';
import { Gauge } from './components/gauge.js';
import { Modal } from './components/modal.js';
import { Toast } from './components/toast.js';
import { formatAction, formatDelta } from './utils/format.js';
import { events } from './data/events.js';
import { createStartView } from './views/start-view.js';
import { createDeckListView } from './views/deck-list-view.js';
import { createCardView } from './views/card-view.js';
import { createEventView } from './views/event-view.js';
import { createEndConfirmView } from './views/end-confirm-view.js';
import { createRecapView } from './views/recap-view.js';

const CONNECTION_PROBLEM = 'Connection problem, please try again';

const app = document.getElementById('app');
const gameScreen = app.querySelector('.game');
const dialog = document.getElementById('modal');
const undoButton = app.querySelector('[data-action="undo"]');

const gauge = new Gauge(document.getElementById('gauge'));
const toast = new Toast(document.getElementById('toast'));
const modal = new Modal(dialog);

/** Last state received from the server, and the card catalogue. */
const state = {
  session: null,
  cards: [],
};

// ---------- Helpers ----------

/** @param {'start' | 'game'} screen */
function setScreen(screen) {
  app.dataset.screen = screen;
}

/** Displays a session state received from the server. */
function applySession(session) {
  state.session = session;
  gauge.set(session.gauge);
  undoButton.disabled = !session.canUndo;
}

function resetGameDisplay() {
  gauge.set(GAUGE_MAX);
  undoButton.disabled = true;
}

function resetGame() {
  state.session = null;
  clearSessionId();
  resetGameDisplay();
}

/**
 * Runs an API call while the interface is inert (no double clicks).
 * On failure shows a non-blocking message and resolves with null: the screen keeps the
 * last state returned by the server (brief §7.6).
 */
async function request(call) {
  const busy = [gameScreen, dialog.firstElementChild].filter(Boolean);
  busy.forEach((element) => { element.inert = true; });
  try {
    return await call();
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    toast.show(error.isNetworkError ? CONNECTION_PROBLEM : error.message);
    return null;
  } finally {
    busy.forEach((element) => { element.inert = false; });
  }
}

async function ensureCards() {
  if (state.cards.length) return true;
  const cards = await request(() => api.getCards());
  if (cards) state.cards = cards;
  return Boolean(cards);
}

/** Loads the catalogue in the background at start-up; failures are retried on demand. */
function preloadCards() {
  api.getCards().then((cards) => { state.cards = cards; }).catch(() => {});
}

const cardState = (deck, id) => state.session?.cards[`${deck}:${id}`];

// ---------- Screens ----------

function openStart() {
  setScreen('start');
  modal.show(createStartView({
    onSubmit: async (name) => {
      const session = await request(() => api.createSession(name));
      if (!session) return;
      saveSessionId(session.id);
      applySession(session);
      setScreen('game');
      modal.close();
    },
  }));
}

async function openDeck(deck) {
  if (deck === 'event') {
    modal.show(createDeckListView({ deck, items: events, onSelect: openEvent }));
    return;
  }
  if (!(await ensureCards())) return;

  modal.show(createDeckListView({
    deck,
    items: state.cards.filter((card) => card.deck === deck),
    states: state.session.cards,
    onSelect: (card) => openCard(deck, card),
  }));
}

function openCard(deck, card) {
  modal.show(createCardView({
    deck,
    card,
    state: cardState(deck, card.id),
    onBack: () => openDeck(deck),
    onHint: async () => {
      const session = await request(() => api.sendAction(state.session.id, deck, card.id, 'hint'));
      if (!session) return null;
      applySession(session);
      return cardState(deck, card.id);
    },
    onAnswer: async (type) => {
      const session = await request(() => api.sendAction(state.session.id, deck, card.id, type));
      if (!session) return;
      applySession(session);
      modal.close(); // back to the game screen: the gauge animates
    },
  }));
}

function openEvent(event) {
  modal.show(createEventView({ event, onBack: () => openDeck('event') }));
}

function openEndConfirm() {
  modal.show(createEndConfirmView({
    onConfirm: async () => {
      const session = await request(() => api.endSession(state.session.id));
      if (!session) return;
      applySession(session);
      clearSessionId();
      openRecap(session);
    },
  }));
}

function openRecap(session) {
  modal.show(createRecapView({
    session,
    onRestart: () => {
      resetGame();
      openStart();
    },
  }));
}

async function undoLastAction() {
  const undone = state.session.history.at(-1);
  const session = await request(() => api.undo(state.session.id));
  if (!session) return;
  applySession(session);
  if (undone) toast.show(`Undone: ${formatAction(undone)} (${formatDelta(undone.appliedDelta)})`);
}

// ---------- Game screen buttons ----------

const ACTIONS = {
  'open-deck': (button) => openDeck(button.dataset.deck),
  undo: undoLastAction,
  'end-game': openEndConfirm,
};

gameScreen.querySelector('.actions').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button && state.session) ACTIONS[button.dataset.action]?.(button);
});

// ---------- Start-up ----------

/** Resumes the stored session if it is still active, otherwise opens the start form. */
async function boot() {
  // The Event slot keeps its place in the layout even when the feature is off (brief §7.2).
  document.getElementById('event-button').hidden = !FEATURES.event;
  resetGameDisplay();

  const sessionId = loadSessionId();
  if (sessionId) {
    try {
      const session = await api.getSession(sessionId);
      if (session.status === 'active') {
        applySession(session);
        setScreen('game');
        preloadCards();
        return;
      }
      clearSessionId(); // finished
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        clearSessionId();
      } else {
        // Keep the id: a reload once the connection is back resumes the game.
        toast.show(CONNECTION_PROBLEM);
      }
    }
  }

  openStart();
  preloadCards();
}

boot();
