import { GAUGE_MAX } from '../config.js';

/** Vertical fuel gauge (0–GAUGE_MAX). Display only: the value always comes from outside. */
export class Gauge {
  #root;
  #cells;

  /** @param {HTMLElement} root element holding the drops image */
  constructor(root) {
    this.#root = root;
    this.#cells = this.#buildCells();
  }

  /** @param {number} value integer between 0 and GAUGE_MAX */
  set(value) {
    this.#root.style.setProperty('--level', value);
    this.#root.setAttribute('aria-valuenow', value);

    for (const cell of this.#cells) {
      const level = Number(cell.dataset.level);
      cell.classList.toggle('is-empty', level > value);
      cell.classList.toggle('is-current', level === value);
    }
  }

  #buildCells() {
    const fragment = document.createDocumentFragment();
    const cells = [];

    for (let level = GAUGE_MAX; level >= 1; level -= 1) {
      const cell = document.createElement('div');
      cell.className = 'gauge__cell';
      cell.dataset.level = level;
      cell.textContent = level;
      cells.push(cell);
      fragment.append(cell);
    }

    this.#root.prepend(fragment);
    return cells;
  }
}
