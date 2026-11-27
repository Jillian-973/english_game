/**
 * Minimal safe HTML templating.
 *
 * `html` is a tagged template: every interpolated value is escaped, except values
 * already produced by `html` or explicitly wrapped with `raw`. Arrays are joined.
 *
 *   html`<p>${userText}</p>`          // escaped
 *   html`<ul>${items.map(renderItem)}</ul>`
 */

class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** Marks a trusted string (static markup only, never user or server data). */
export function raw(markup) {
  return new SafeHtml(markup);
}

function serialize(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(serialize).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => {
    out += serialize(value) + strings[i + 1];
  });
  return new SafeHtml(out);
}
