/**
 * Event ("Story") cards: display only, no game logic and no API yet (brief §15).
 * Texts taken from the author's charter (docs/design/Event Card*.png).
 */
export const events = [
  { id: '001', text: 'A bolt comes loose, and you lose 2 liters of fuel.', effect: '-2 FUEL' },
  { id: '002', text: "You've discovered a hidden energy reserve! Gain 3 Fuel.", effect: '+3 FUEL' },
  { id: '003', text: 'A short circuit has disrupted your system! You lose your next turn.', effect: 'No next turn' },
];
