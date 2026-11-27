/**
 * Single modal built on the native <dialog>.
 *
 * Only one view is visible at a time: `show()` replaces the current content.
 * A view is a plain object:
 *   {
 *     render(): SafeHtml        // markup of the view
 *     mount?(root, modal): void // wire the view's own events
 *     variant?: 'fit' | 'plain' // fit = never taller than the window, plain = no backdrop
 *     blocking?: boolean        // cannot be dismissed (✕, Esc, backdrop, back gesture)
 *   }
 *
 * The phone's back gesture closes the modal instead of leaving the site:
 * a history entry is pushed when the modal opens (the URL never changes).
 */
export class Modal {
  #dialog;
  #view = null;
  #hasHistoryEntry = false;
  #ignoreNextPop = false;

  /** @param {HTMLDialogElement} dialog */
  constructor(dialog) {
    this.#dialog = dialog;

    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.#requestClose();
    });

    dialog.addEventListener('click', (event) => {
      const clickedBackdrop = event.target === dialog;
      const clickedClose = event.target.closest('[data-modal-close]');
      if (clickedBackdrop || clickedClose) this.#requestClose();
    });

    window.addEventListener('popstate', () => this.#onPopState());
  }

  get isOpen() {
    return this.#dialog.open;
  }

  show(view) {
    const dialog = this.#dialog;
    this.#view = view;

    dialog.className = ['modal', view.variant && `modal--${view.variant}`].filter(Boolean).join(' ');
    dialog.innerHTML = `<div class="modal__content">${view.render()}</div>`;
    dialog.scrollTop = 0;

    if (!dialog.open) {
      dialog.showModal();
      this.#pushHistoryEntry();
    }

    view.mount?.(dialog.firstElementChild, this);
  }

  close() {
    if (!this.#dialog.open) return;
    this.#hide();

    if (this.#hasHistoryEntry) {
      this.#hasHistoryEntry = false;
      this.#ignoreNextPop = true;
      history.back();
    }
  }

  #requestClose() {
    if (!this.#view?.blocking) this.close();
  }

  #hide() {
    this.#dialog.close();
    this.#dialog.replaceChildren();
    this.#view = null;
  }

  #pushHistoryEntry() {
    if (this.#hasHistoryEntry) return;
    history.pushState({ modal: true }, '');
    this.#hasHistoryEntry = true;
  }

  #onPopState() {
    if (this.#ignoreNextPop) {
      this.#ignoreNextPop = false;
      return;
    }
    if (!this.#dialog.open) return;

    this.#hasHistoryEntry = false;
    if (this.#view?.blocking) {
      this.#pushHistoryEntry(); // stay on the page, keep the modal
    } else {
      this.#hide();
    }
  }
}
