/** Short, non-blocking message at the bottom of the screen. */
export class Toast {
  #root;
  #timer = null;

  constructor(root) {
    this.#root = root;
  }

  show(message, duration = 2200) {
    this.#root.textContent = message;
    this.#root.classList.add('is-visible');

    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#root.classList.remove('is-visible'), duration);
  }
}
