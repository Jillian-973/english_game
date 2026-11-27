import { DECKS } from '../config.js';
import { html } from '../utils/html.js';
import { modalBar, panelTitle } from './partials.js';

const RESULT_BADGES = {
  correct: html`<span class="badge badge--right">✓ Right</span>`,
  wrong: html`<span class="badge badge--false">✗ False</span>`,
};

/** Text shown for an item: question for cards, description for events. */
const itemText = (item) => item.question ?? item.text;

function renderMeta(item, state) {
  if (!state) return '';
  const badges = [];
  if (state.hintsRevealed.length) {
    badges.push(html`<span class="badge badge--hints">${state.hintsRevealed.length}/${item.hintCount} hints</span>`);
  }
  if (state.result) badges.push(RESULT_BADGES[state.result]);
  return badges.length ? html`<span class="deck-row__meta">${badges}</span>` : '';
}

function renderRow(item, state) {
  return html`
    <li data-search="${item.id} ${itemText(item).toLowerCase()}">
      <button class="deck-row ${state?.result ? 'is-answered' : ''}" type="button" data-id="${item.id}">
        <span class="deck-row__id">&lt;${item.id}&gt;</span>
        <span class="deck-row__text">${itemText(item)}</span>
        ${renderMeta(item, state)}
      </button>
    </li>`;
}

/** "1", "01" and "001" all match card "001". */
function matches(entry, query) {
  if (!query) return true;
  const [id] = entry.split(' ', 1);
  if (/^\d+$/.test(query)) return id.endsWith(query) || Number(id) === Number(query);
  return entry.includes(query);
}

/**
 * List of one deck with an id/text search.
 * @param {{
 *   deck: 'movement' | 'fuel' | 'event',
 *   items: Array<object>,
 *   states?: Record<string, { hintsRevealed: string[], result: string | null }>,
 *   onSelect: (item: object) => void,
 * }} options
 */
export function createDeckListView({ deck, items, states = {}, onSelect }) {
  const { listTitle, colorClass } = DECKS[deck];
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  const stateOf = (item) => states[`${deck}:${item.id}`];

  return {
    variant: 'fit',

    render() {
      return html`
        ${modalBar({ colorClass })}
        <section class="panel" aria-label="${listTitle}">
          ${panelTitle(listTitle, colorClass)}
          <input class="search" type="search" inputmode="numeric" enterkeyhint="search"
                 placeholder="search by ID or Name..." aria-label="Search a card by ID">
          <ul class="deck-list">${sorted.map((item) => renderRow(item, stateOf(item)))}</ul>
          <p class="deck-list__empty" hidden>No card found.</p>
        </section>`;
    },

    mount(root) {
      const rows = [...root.querySelectorAll('.deck-list > li')];
      const empty = root.querySelector('.deck-list__empty');

      root.querySelector('.search').addEventListener('input', (event) => {
        const query = event.target.value.trim().toLowerCase();
        let visible = 0;
        for (const row of rows) {
          row.hidden = !matches(row.dataset.search, query);
          if (!row.hidden) visible += 1;
        }
        empty.hidden = visible > 0;
      });

      root.querySelector('.deck-list').addEventListener('click', (event) => {
        const button = event.target.closest('.deck-row');
        if (button) onSelect(sorted.find((item) => item.id === button.dataset.id));
      });
    },
  };
}
