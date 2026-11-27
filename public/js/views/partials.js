import { html } from '../utils/html.js';
import { closeIcon } from '../ui/icons.js';

/**
 * Bar above a modal panel: optional "← Back" on the left, ✕ on the right.
 * @param {{ colorClass: string, withBack?: boolean }} options
 */
export function modalBar({ colorClass, withBack = false }) {
  return html`
    <div class="modal__bar">
      ${withBack ? html`<button class="modal__back" type="button" data-action="back">← Back</button>` : html`<span></span>`}
      <button class="modal__close ${colorClass}" type="button" data-modal-close aria-label="Close">${closeIcon}</button>
    </div>`;
}

/** Title in the charter's "< Title >" style. */
export function panelTitle(text, colorClass) {
  return html`<h2 class="panel__title ${colorClass}">&lt; ${text} &gt;</h2>`;
}
