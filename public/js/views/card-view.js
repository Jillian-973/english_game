import { DECKS } from '../config.js';
import { html } from '../utils/html.js';
import { formatDelta, shortId } from '../utils/format.js';
import { fuelWave, html5Icon } from '../ui/icons.js';
import { modalBar } from './partials.js';

const CODE_LINES = 11;

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

function renderTabs(card, hintsRevealed, tab) {
  const left = card.hintCount - hintsRevealed.length;
  const selected = (name) => (tab ? String(tab === name) : 'false');

  return html`
    <div class="tabs ${tab ? 'has-selection' : ''}" role="tablist">
      <button class="tab" type="button" role="tab" data-tab="hint" aria-selected="${selected('hint')}">
        HINT${left > 0 ? html`<span class="tab__count">(${left} left)</span>` : ''}
      </button>
      <button class="tab" type="button" role="tab" data-tab="answer" aria-selected="${selected('answer')}">ANSWERS</button>
    </div>`;
}

function renderHints(hintsRevealed) {
  if (!hintsRevealed.length) return html`<p class="hints__empty">No hint revealed yet.</p>`;
  return html`
    <ul class="hints">
      ${hintsRevealed.map((hint, i) => html`<li class="hints__item"><span class="hints__label">Hint ${i + 1}:</span> ${hint}</li>`)}
    </ul>`;
}

function renderAnswers(deck, card) {
  const rightPoints = deck === 'fuel' ? formatDelta(card.fuelReward) : null;
  return html`
    <p class="answer">${card.answer}</p>
    <div class="answer-btns">
      <button class="answer-btn answer-btn--right" type="button" data-answer="correct">
        Right ${rightPoints ? html`<span class="answer-btn__points">(${rightPoints})</span>` : ''}
      </button>
      <button class="answer-btn answer-btn--false" type="button" data-answer="wrong">
        False <span class="answer-btn__points">(${formatDelta(-card.wrongPenalty)})</span>
      </button>
    </div>`;
}

function renderFoot(deck, card, hintsRevealed, tab) {
  const ribbon = deck === 'fuel' ? `${formatDelta(card.fuelReward)} FUEL` : `${formatDelta(-card.wrongPenalty)} FUEL`;
  return html`
    ${renderTabs(card, hintsRevealed, tab)}
    ${tab === 'hint' ? renderHints(hintsRevealed) : ''}
    ${tab === 'answer' ? renderAnswers(deck, card) : ''}
    <div class="ribbon" aria-hidden="true"><span class="ribbon__text">${ribbon}</span></div>`;
}

/**
 * Detail of a Question or Refuel card, with Hint / Answers tabs.
 * @param {{
 *   deck: 'movement' | 'fuel',
 *   card: object,
 *   state?: { hintsRevealed: string[], result: string | null },
 *   onBack: () => void,
 *   onAnswer: (type: 'correct' | 'wrong') => void,
 * }} options
 */
export function createCardView({ deck, card, state, onBack, onAnswer }) {
  const hintsRevealed = state?.hintsRevealed ?? [];

  return {
    render() {
      return html`
        ${modalBar({ colorClass: DECKS[deck].colorClass, withBack: true })}
        <article class="card ${deck === 'fuel' ? 'card--fuel' : ''}">
          ${deck === 'fuel' ? fuelWave : ''}
          ${renderHead(deck, card)}
          ${renderCode(card)}
          <footer class="card__foot">${renderFoot(deck, card, hintsRevealed, null)}</footer>
        </article>`;
    },

    mount(root) {
      const foot = root.querySelector('.card__foot');

      root.querySelector('[data-action="back"]').addEventListener('click', onBack);

      foot.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-tab]');
        if (tab) {
          foot.classList.toggle('card__foot--answers', tab.dataset.tab === 'answer');
          foot.innerHTML = renderFoot(deck, card, hintsRevealed, tab.dataset.tab);
          return;
        }
        const answer = event.target.closest('[data-answer]');
        if (answer) onAnswer(answer.dataset.answer);
      });
    },
  };
}
