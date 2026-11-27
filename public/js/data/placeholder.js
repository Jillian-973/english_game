/**
 * Placeholder content so the interface can be reviewed.
 * TO BE REPLACED by the API (`GET /api/cards`, `GET /api/sessions/:id`): the shapes below
 * already follow the brief, plus `options` / `answer` shown on the charter's cards.
 */

export const cards = [
  { id: '011', deck: 'movement', question: 'What is the purpose of the HTML <strong> tag?', options: ['Underline text.', 'Give text strong importance.', 'Change the font.', 'Center text.'], answer: 'B. Give text strong importance.', hintCount: 2, wrongPenalty: 3 },
  { id: '021', deck: 'movement', question: 'What is the purpose of the HTML <footer> tag?', options: ['Define the bottom section.', 'Add a sidebar.', 'Create a menu.', 'Insert a video.'], answer: 'A. Define the bottom section.', hintCount: 3, wrongPenalty: 2 },
  { id: '031', deck: 'movement', question: 'What is the purpose of the HTML <br> tag?', options: ['Create a horizontal line.', 'Make text bold.', 'Insert a line break.', 'Create a new paragraph.'], answer: 'C. Insert a line break.', hintCount: 3, wrongPenalty: 2 },
  { id: '032', deck: 'movement', question: 'What is the HTML tag <h1> for?', options: ['Create a link.', 'Define the main heading.', 'Insert an image.', 'Make text italic.'], answer: 'B. Define the main heading.', hintCount: 3, wrongPenalty: 2 },
  { id: '047', deck: 'movement', question: 'What is the purpose of the HTML required attribute?', options: ['Hide a field.', 'Make a field mandatory.', 'Disable a field.', 'Style a field.'], answer: 'B. Make a field mandatory.', hintCount: 2, wrongPenalty: 1 },
  { id: '073', deck: 'movement', question: 'What is the function of box-sizing: border-box?', options: ['Add a border.', 'Include padding and border in the width.', 'Remove margins.', 'Round the corners.'], answer: 'B. Include padding and border in the width.', hintCount: 2, wrongPenalty: 2 },

  { id: '001', deck: 'fuel', question: 'What is the purpose of the CSS overflow property?', options: ["Change the element's color.", 'Define the font family.', "Control what happens when content exceeds an element's box.", 'Define the main heading of a page.'], answer: 'C. Control what happens when content exceeds the box.', hintCount: 3, wrongPenalty: 1, fuelReward: 1 },
  { id: '002', deck: 'fuel', question: 'Which CSS property changes the text color?', options: ['font-color', 'color', 'text-style', 'background'], answer: 'B. color', hintCount: 2, wrongPenalty: 1, fuelReward: 2 },
  { id: '003', deck: 'fuel', question: 'What does display: flex do?', options: ['Hides the element.', 'Turns the element into a flex container.', 'Animates the element.', 'Makes text bigger.'], answer: 'B. Turns it into a flex container.', hintCount: 2, wrongPenalty: 2, fuelReward: 3 },
  { id: '007', deck: 'fuel', question: 'What does the CSS z-index property control?', options: ['Zoom level.', 'Stacking order.', 'Font size.', 'Element width.'], answer: 'B. Stacking order.', hintCount: 2, wrongPenalty: 1, fuelReward: 2 },
];

export const events = [
  { id: '001', text: 'A bolt comes loose, and you lose 2 liters of fuel.', effect: '-2 FUEL' },
  { id: '002', text: "You've discovered a hidden energy reserve! Gain 3 Fuel.", effect: '+3 FUEL' },
  { id: '003', text: 'A short circuit has disrupted your system! You lose your next turn.', effect: 'No next turn' },
];

export const session = {
  name: 'Table of Alice',
  status: 'active',
  gauge: 7,
  canUndo: true,
  cards: {
    'movement:031': { hintsRevealed: ['It is a self-closing tag.', 'It moves what follows to the next line.'], result: 'wrong' },
    'movement:047': { hintsRevealed: ['It is used in forms.'], result: null },
    'movement:021': { hintsRevealed: [], result: 'correct' },
    'fuel:003': { hintsRevealed: [], result: 'correct' },
    'fuel:002': { hintsRevealed: ['It is the shortest possible name.'], result: null },
  },
  history: [
    { seq: 1, deck: 'movement', cardId: '031', type: 'hint', hintIndex: 1, appliedDelta: -1 },
    { seq: 2, deck: 'movement', cardId: '031', type: 'hint', hintIndex: 2, appliedDelta: -1 },
    { seq: 3, deck: 'movement', cardId: '031', type: 'wrong', appliedDelta: -2 },
    { seq: 4, deck: 'fuel', cardId: '003', type: 'correct', appliedDelta: 3 },
    { seq: 5, deck: 'movement', cardId: '021', type: 'correct', appliedDelta: 0 },
    { seq: 6, deck: 'movement', cardId: '047', type: 'hint', hintIndex: 1, appliedDelta: -1 },
    { seq: 7, deck: 'fuel', cardId: '002', type: 'hint', hintIndex: 1, appliedDelta: -1 },
  ],
};
