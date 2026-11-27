/**
 * Entry point: builds the components and wires the screens together.
 * No game logic here: the server will own the state (brief §4.7). Until the API exists,
 * the interface reads placeholder content.
 */
import { FEATURES, GAUGE_MAX } from './config.js';
import { Gauge } from './components/gauge.js';
import { Modal } from './components/modal.js';
import { Toast } from './components/toast.js';
import { formatAction, formatDelta } from './utils/format.js';
import { cards, events, session } from './data/placeholder.js';
import { createStartView } from './views/start-view.js';
import { createDeckListView } from './views/deck-list-view.js';
import { createCardView } from './views/card-view.js';
import { createEventView } from './views/event-view.js';
import { createEndConfirmView } from './views/end-confirm-view.js';
import { createRecapView } from './views/recap-view.js';

const app = document.getElementById('app');
const gauge = new Gauge(document.getElementById('gauge'));
const toast = new Toast(document.getElementById('toast'));
const modal = new Modal(document.getElementById('modal'));

/** @param {'start' | 'game'} screen */
function setScreen(screen) {
  app.dataset.screen = screen;
}

// ---------- Screens ----------

function openStart() {
  setScreen('start');
  gauge.set(GAUGE_MAX);
  modal.show(createStartView({
    onSubmit: () => {
      setScreen('game');
      gauge.set(session.gauge);
      modal.close();
    },
  }));
}

function openDeck(deck) {
  const items = deck === 'event' ? events : cards.filter((card) => card.deck === deck);

  modal.show(createDeckListView({
    deck,
    items,
    states: session.cards,
    onSelect: (item) => (deck === 'event' ? openEvent(item) : openCard(deck, item)),
  }));
}

function openCard(deck, card) {
  modal.show(createCardView({
    deck,
    card,
    state: session.cards[`${deck}:${card.id}`],
    onBack: () => openDeck(deck),
    onAnswer: () => modal.close(),
  }));
}

function openEvent(event) {
  modal.show(createEventView({ event, onBack: () => openDeck('event') }));
}

function openEndConfirm() {
  modal.show(createEndConfirmView({ onConfirm: openRecap }));
}

function openRecap() {
  modal.show(createRecapView({ session, onRestart: openStart }));
}

function showUndoToast() {
  const last = session.history.at(-1);
  if (last) toast.show(`Undone: ${formatAction(last)} (${formatDelta(last.appliedDelta)})`);
}

// ---------- Game screen buttons ----------

const ACTIONS = {
  'open-deck': (button) => openDeck(button.dataset.deck),
  undo: showUndoToast,
  'end-game': openEndConfirm,
};

document.querySelector('.actions').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button) ACTIONS[button.dataset.action]?.(button);
});

// Event slot keeps its place in the layout even when the feature is off (brief §7.2).
document.getElementById('event-button').hidden = !FEATURES.event;

openStart();
