import { raw } from '../utils/html.js';

/** Static inline icons (trusted markup). Colors use `currentColor` where relevant. */

export const closeIcon = raw(
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 6 L34 34 M34 6 L6 34" ' +
  'stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>',
);

export const html5Icon = raw(
  '<svg class="card__icon" viewBox="0 0 60 80" aria-hidden="true">' +
  '<text x="30" y="11" text-anchor="middle" font-family="Jersey 10, monospace" font-size="13" fill="#8b909c">HTML</text>' +
  '<path d="M3 16 H57 L52 70 L30 77 L8 70 Z" fill="#b7472a"/>' +
  '<path d="M30 20 H53 L49 67 L30 72 Z" fill="#c9553a"/>' +
  '<path d="M18 28 H43 L42 35 H26 L27 42 H41 L39 60 L30 63 L21 60 L20 52 H27 L27 55 L30 56 L33 55 L34 48 H20 Z" fill="#c7c9cf"/>' +
  '</svg>',
);

export const bangIcon = raw(
  '<svg viewBox="0 0 60 60" aria-hidden="true">' +
  '<path d="M22 6 L38 0 L52 44 L42 48 Z" fill="#fbbf24"/>' +
  '<path d="M6 32 L18 26 L32 50 L28 52 Z" fill="#fbbf24"/>' +
  '</svg>',
);

export const fuelWave = raw(
  '<svg class="card__wave" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">' +
  '<path d="M0 70 C 60 60, 110 90, 170 100 C 230 110, 220 20, 300 5 C 340 -2, 380 10, 400 20 L400 300 L0 300 Z" fill="#2c1810"/>' +
  '</svg>',
);
