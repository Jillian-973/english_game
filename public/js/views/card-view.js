import { DECKS } from '../config.js';
import { html } from '../utils/html.js';
import { formatDelta, shortId } from '../utils/format.js';
import { fuelWave, html5Icon } from '../ui/icons.js';
import { modalBar } from './partials.js';

const CODE_LINES = 11;
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const RESULT_LABELS = { correct: 'Answered: Right', wrong: 'Answered: False' };
const EMPTY_STATE = Object.freeze({ hintsRevealed: [], result: null });

/** Splits the question over two "code" lines, like on the printed card. */
function splitQuestion(question) {
  const words = question.split(' ');
  const middle = Math.ceil(words.length / 2);
  return [words.slice(0, middle).join(' '), words.slice(middle).join(' ')];
}

function renderCode(card) {
  const [first, second] = splitQuestion(card.question);
  const lines = [
    html`<span class="code__question">&lt; ${first}</span>`,
    html`<span class="code__question">${second} &gt;</span>`,
    html`<span class="code__keyword">Answer</span> <span class="code__punct">: {</span>`,
    ...card.options.map((option) => html`<span class="code__option"><span class="code__dash">-</span><span>${option}</span></span>`),
    html`<span class="code__punct">}</span>`,
  ];
  while (lines.length < CODE_LINES) lines.push('');

  return html`
    <div class="code">
      ${lines.map((line, i) => html`<div class="code__line"><span class="code__no">${i + 1}</span><span>${line}</span></div>`)}
    </div>`;
}

function renderHead(deck, card) {
  if (deck === 'fuel') {
    return html`
      <header class="card__head">
        <h2 class="card__title"><span class="text-grey">DEVOT...</span> <span class="card__title-fuel">REFUEL.${shortId(card.id)}</span></h2>
        <img class="card__icon card__icon--drops" src="assets/drops-group.png" alt="">
      </header>`;
  }
  return html`
    <header class="card__head">
      <h2 class="card__title">
        <span class="text-grey">&lt;!</span> <span class="text-pink">QUESTION</span>
        <span class="text-grey">:</span> <span class="text-tan">${shortId(card.id)}</span> <span class="text-grey">&gt;</span>
      </h2>
      ${html5Icon}
    </header>`;
}

function renderTabs(hintsLeft, tab) {
  const selected = (name) => String(tab === name);
  return html`
    <div class="tabs ${tab ? 'has-selection' : ''}" role="tablist">
      <button class="tab" type="button" role="tab" data-tab="hint" aria-selected="${selected('hint')}">
        HINT${hintsLeft > 0 ? html`<span class="tab__count">(${hintsLeft} left)</span>` : ''}
      </button>
      <button class="tab" type="button" role="tab" data-tab="answer" aria-selected="${selected('answer')}">ANSWERS</button>
    </div>`;
}

function renderHints(state, hintsLeft) {
  const canReveal = hintsLeft > 0 && !state.result;
  return html`
    ${state.hintsRevealed.length
      ? html`<ul class="hints">
          ${state.hintsRevealed.map((hint, i) => html`<li class="hints__item"><span class="hints__label">Hint ${i + 1}:</span> ${hint}</li>`)}
        </ul>`
      : html`<p class="hints__empty">No hint revealed yet.</p>`}
    ${canReveal ? html`<button class="hint-btn" type="button" data-hint>Reveal hint ${state.hintsRevealed.length + 1} <span class="hint-btn__cost">(${formatDelta(-1)})</span></button>` : ''}`;
}

function renderAnswers(deck, card, state) {
  const letter = card.answer;
  const text = card.options[OPTION_LETTERS.indexOf(letter)];
  const rightPoints = deck === 'fuel' ? formatDelta(card.fuelReward) : null;

  return html`
    <p class="answer">${letter}. ${text}</p>
    ${state.result
      ? html`<p class="answer__result answer__result--${state.result}">${RESULT_LABELS[state.result]}</p>`
      : html`<div class="answer-btns">
          <button class="answer-btn answer-btn--right" type="button" data-answer="correct">
            Right ${rightPoints ? html`<span class="answer-btn__points">(${rightPoints})</span>` : ''}
          </button>
          <button class="answer-btn answer-btn--false" type="button" data-answer="wrong">
            False <span class="answer-btn__points">(${formatDelta(-card.wrongPenalty)})</span>
          </button>
        </div>`}`;
}

function renderFoot(deck, card, state, tab) {
  const hintsLeft = card.hintCount - state.hintsRevealed.length;
  const ribbon = deck === 'fuel' ? `${formatDelta(card.fuelReward)} FUEL` : `${formatDelta(-card.wrongPenalty)} FUEL`;
  return html`
    ${renderTabs(hintsLeft, tab)}
    ${tab === 'hint' ? renderHints(state, hintsLeft) : ''}
    ${tab === 'answer' ? renderAnswers(deck, card, state) : ''}
    <div class="ribbon" aria-hidden="true"><span class="ribbon__text">${ribbon}</span></div>`;
}

/**
 * Detail of a Question or Refuel card, with Hint / Answers tabs.
 * @param {{
 *   deck: 'movement' | 'fuel',
 *   card: object,                       // public card from GET /api/cards
 *   state?: { hintsRevealed: string[], result: 'correct' | 'wrong' | null },
 *   onBack: () => void,
 *   onHint: () => Promise<object | null>, // resolves with the card's new state, null on failure
 *   onAnswer: (type: 'correct' | 'wrong') => void,
 * }} options
 */
export function createCardView({ deck, card, state = EMPTY_STATE, onBack, onHint, onAnswer }) {
  let current = state;
  let tab = null;

  return {
    render() {
      return html`
        ${modalBar({ colorClass: DECKS[deck].colorClass, withBack: true })}
        <article class="card ${deck === 'fuel' ? 'card--fuel' : ''}">
          ${deck === 'fuel' ? fuelWave : ''}
          ${renderHead(deck, card)}
          ${renderCode(card)}
          <footer class="card__foot">${renderFoot(deck, card, current, tab)}</footer>
        </article>`;
    },

    mount(root) {
      const foot = root.querySelector('.card__foot');
      const refresh = () => {
        foot.classList.toggle('card__foot--answers', tab === 'answer');
        foot.innerHTML = renderFoot(deck, card, current, tab);
      };

      root.querySelector('[data-action="back"]').addEventListener('click', onBack);

      foot.addEventListener('click', async (event) => {
        const tabButton = event.target.closest('[data-tab]');
        if (tabButton) {
          tab = tabButton.dataset.tab;
          refresh();
          return;
        }
        if (event.target.closest('[data-hint]')) {
          const next = await onHint();
          if (next) {
            current = next;
            refresh();
          }
          return;
        }
        const answer = event.target.closest('[data-answer]');
        if (answer) onAnswer(answer.dataset.answer);
      });
    },
  };
}
