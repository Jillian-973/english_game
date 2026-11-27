import { GAUGE_MAX } from '../config.js';
import { html } from '../utils/html.js';
import { formatAction, formatDelta } from '../utils/format.js';
import { panelTitle } from './partials.js';

const deltaModifier = (delta) => (delta > 0 ? 'pos' : delta < 0 ? 'neg' : 'zero');

function renderItem(action, index) {
  const deckModifier = action.deck === 'fuel' ? 'fuel' : 'question';
  return html`
    <li class="recap__item">
      <span class="recap__line-no">${index + 1}</span>
      <span class="recap__label--${deckModifier}">${formatAction(action)}</span>
      <span class="recap__delta--${deltaModifier(action.appliedDelta)}">${formatDelta(action.appliedDelta)}</span>
    </li>`;
}

/**
 * Blocking end-of-game summary.
 * @param {{ session: { name: string, gauge: number, history: Array<object> }, onRestart: () => void }} options
 */
export function createRecapView({ session, onRestart }) {
  return {
    blocking: true,

    render() {
      return html`
        <section class="panel" aria-label="Game summary">
          ${panelTitle('Game over', 'text-pink')}
          <div class="recap__head">
            <div>
              <span class="recap__caption">Group</span>
              <p class="recap__name">${session.name}</p>
            </div>
            <div class="recap__fuel">
              <span class="recap__caption">Final fuel</span>
              <span class="recap__fuel-value">${session.gauge}</span>
              <span class="recap__caption">/ ${GAUGE_MAX}</span>
            </div>
          </div>
          <ol class="recap__list">${session.history.map(renderItem)}</ol>
          <button class="btn btn--tan btn--block" type="button" data-action="restart">Start a new game</button>
        </section>`;
    },

    mount(root) {
      root.querySelector('[data-action="restart"]').addEventListener('click', onRestart);
    },
  };
}
