/**
 * Short, non-blocking message at the bottom of the screen.
 * Uses the Popover API so it is drawn in the top layer, above an open <dialog>.
 */
export class Toast {
  #root;
  #timer = null;

  /** @param {HTMLElement} root element with the `popover="manual"` attribute */
  constructor(root) {
    this.#root = root;
  }

  show(message, duration = 2600) {
    const root = this.#root;
    root.textContent = message;

    // Re-opening moves the toast above a modal opened after it.
    if (root.matches(':popover-open')) root.hidePopover();
    root.showPopover();
    requestAnimationFrame(() => root.classList.add('is-visible'));

    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      root.classList.remove('is-visible');
      this.#timer = setTimeout(() => root.hidePopover(), 250);
    }, duration);
  }
}
