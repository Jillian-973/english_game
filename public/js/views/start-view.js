import { html } from '../utils/html.js';
import { panelTitle } from './partials.js';

const NAME_MAX_LENGTH = 40;

/**
 * Blocking start form ("New game").
 * @param {{ onSubmit: (name: string) => void }} handlers
 */
export function createStartView({ onSubmit }) {
  return {
    variant: 'plain',
    blocking: true,

    render() {
      return html`
        <form class="start" novalidate>
          ${panelTitle('New game', 'text-pink')}
          <label class="start__label" for="session-name">Group Name</label>
          <input class="start__input" id="session-name" name="name" type="text"
                 maxlength="${NAME_MAX_LENGTH}" autocomplete="off" required>
          <div class="start__submit-row">
            <button class="start__submit" type="submit" aria-label="Start game">
              <img src="assets/send-arrow.png" alt="">
            </button>
          </div>
        </form>`;
    },

    mount(root) {
      const form = root.querySelector('form');
      const input = form.elements.name;

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = input.value.trim();
        if (!name) {
          input.focus();
          return;
        }
        onSubmit(name);
      });
    },
  };
}
