/** Front-end configuration. */

export const GAUGE_MAX = 10;

/** Feature flags. `event` shows the Story Card button (no game logic behind it yet). */
export const FEATURES = Object.freeze({
  event: true,
});

/**
 * Display settings per deck. Internal deck names follow the API (`movement`, `fuel`),
 * labels follow the author's charter.
 */
export const DECKS = Object.freeze({
  movement: { listTitle: 'Question Card', recapLabel: 'Question', colorClass: 'text-green' },
  fuel:     { listTitle: 'Refuel Card',   recapLabel: 'Refuel',   colorClass: 'text-orange' },
  event:    { listTitle: 'Events Card',   recapLabel: 'Event',    colorClass: 'text-yellow' },
});
