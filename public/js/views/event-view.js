import { DECKS } from '../config.js';
import { html } from '../utils/html.js';
import { bangIcon } from '../ui/icons.js';
import { modalBar } from './partials.js';

const trace = html`<img class="event-card__trace" src="assets/trace-diagonal.png" alt="">`;

/**
 * Event ("Story") card. Display only: events have no game logic yet.
 * @param {{ event: { id: string, text: string, effect: string }, onBack: () => void }} options
 */
export function createEventView({ event, onBack }) {
  return {
    render() {
      return html`
        ${modalBar({ colorClass: DECKS.event.colorClass, withBack: true })}
        <article class="event-card">
          <div class="event-card__top">
            ${trace}
            <header class="event-card__head">
              <h2 class="event-card__title">DEVOT... EVENTS</h2>
              <img class="event-card__icon" src="assets/warning.png" alt="">
            </header>
            <span class="event-card__bang event-card__bang--left">${bangIcon}</span>
            <span class="event-card__bang event-card__bang--right">${bangIcon}</span>
            <p class="event-card__text">${event.text}</p>
          </div>
          <div class="event-card__bottom">
            ${trace}
            <p class="event-card__effect">${event.effect}</p>
          </div>
        </article>`;
    },

    mount(root) {
      root.querySelector('[data-action="back"]').addEventListener('click', onBack);
    },
  };
}
