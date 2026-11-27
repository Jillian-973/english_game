import { html } from '../utils/html.js';
import { modalBar, panelTitle } from './partials.js';

/**
 * "Are you sure?" before ending the game.
 * @param {{ onConfirm: () => void }} handlers
 */
export function createEndConfirmView({ onConfirm }) {
  return {
    render() {
      return html`
        ${modalBar({ colorClass: 'text-pink' })}
        <section class="panel" aria-label="End game">
          ${panelTitle('End game', 'text-pink')}
          <p class="confirm__text">Are you sure you want to end the game?</p>
          <div class="btn-group">
            <button class="btn btn--pink" type="button" data-action="confirm">Yes, end the game</button>
            <button class="btn btn--grey" type="button" data-modal-close>Cancel</button>
          </div>
        </section>`;
    },

    mount(root) {
      root.querySelector('[data-action="confirm"]').addEventListener('click', onConfirm);
    },
  };
}
