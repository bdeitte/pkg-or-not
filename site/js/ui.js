// Screens, rendering and input for the game.

import { ECOSYSTEMS, ECOSYSTEM_IDS } from './shared/ecosystems.js';
import { loadEcosystem } from './data.js';
import { ROUNDS, planFakes, buildRounds, createSourcePicker, score, isCorrect } from './game.js';
import { pickSayingIndex, sayingAt, pickFakeCaught, pickFakeMissed } from './sayings.js';
import { encodeResults, decodeResults } from './share.js';
import { confettiFor, launchConfetti, stopConfetti } from './confetti.js';

const $ = (sel) => document.querySelector(sel);
const SCREENS = ['pick', 'loading', 'play', 'results'];
const rng = Math.random;

let state = null; // { choice, rounds, index, revealed, sayingIndex, shared }
let gameId = 0; // bumped on every start or reset so a stale load can't take over

function show(screen) {
  for (const s of SCREENS) $(`#${s}`).hidden = s !== screen;
  if (screen !== 'results') stopConfetti();
}

const PICKER_IDS = [...ECOSYSTEM_IDS, 'mixed'];

function renderPicker() {
  const list = $('#eco-list');
  list.replaceChildren();
  for (const [i, id] of PICKER_IDS.entries()) {
    const btn = document.createElement('button');
    btn.className = 'eco-card';
    const label = document.createElement('span');
    label.className = 'eco-label';
    label.textContent = ECOSYSTEMS[id].label;
    const kbd = document.createElement('kbd');
    kbd.textContent = String(i + 1);
    label.append(' ', kbd);
    const teaser = document.createElement('span');
    teaser.className = 'eco-teaser';
    teaser.textContent = ECOSYSTEMS[id].teaser;
    btn.append(label, teaser);
    btn.addEventListener('click', () => startGame(id));
    list.append(btn);
  }
}

// Drops a #r= results token from the address bar once the player moves on.
function clearHash() {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

function goHome() {
  gameId++;
  clearHash();
  state = null;
  $('#pick-error').hidden = true;
  show('pick');
}

async function startGame(choice) {
  const id = ++gameId;
  clearHash();
  $('#pick-error').hidden = true;
  show('loading');
  try {
    const ecos = choice === 'mixed' ? ECOSYSTEM_IDS : [choice];
    const nextSource = createSourcePicker(ecos, (eco) => loadEcosystem(eco), rng);
    const rounds = await buildRounds({ plan: planFakes(rng), nextSource, rng });
    if (id !== gameId) return;
    state = { choice, rounds, index: 0, revealed: false };
    show('play');
    renderRound();
  } catch (err) {
    if (id !== gameId) return;
    console.error(err);
    $('#pick-error').textContent = `Couldn't load ${ECOSYSTEMS[choice].label} names. Try another ecosystem.`;
    $('#pick-error').hidden = false;
    show('pick');
  }
}

function renderRound() {
  const round = state.rounds[state.index];
  state.revealed = false;
  $('#badge').textContent = ECOSYSTEMS[round.eco].label;
  $('#badge').dataset.eco = round.eco;
  $('#counter').textContent = `${state.index + 1}/${ROUNDS}`;
  $('#name').textContent = round.name;
  $('#btn-real').disabled = false;
  $('#btn-fake').disabled = false;
  $('#reveal').hidden = true;
}

function guess(answer) {
  if (!state || state.revealed || $('#play').hidden) return;
  const round = state.rounds[state.index];
  round.guess = answer;
  state.revealed = true;
  $('#btn-real').disabled = true;
  $('#btn-fake').disabled = true;

  const right = isCorrect(round);
  const reveal = $('#reveal');
  reveal.classList.toggle('good', right);
  reveal.classList.toggle('bad', !right);
  $('#verdict').textContent = `${right ? 'Correct!' : 'Nope!'} It's ${round.isFake ? 'fake' : 'real'}.`;

  const link = $('#detail-link');
  if (round.isFake) {
    $('#detail').textContent = right ? pickFakeCaught(rng) : pickFakeMissed(rng);
    link.hidden = true;
  } else {
    $('#detail').textContent = round.description || 'No description, just vibes.';
    link.href = round.url;
    link.textContent = `View on ${ECOSYSTEMS[round.eco].linkLabel}`;
    link.hidden = !round.url;
  }
  $('#btn-next .label').textContent = state.index === ROUNDS - 1 ? 'See results' : 'Next';
  reveal.hidden = false;
  $('#btn-next').focus();
}

function next() {
  if (!state || !state.revealed) return;
  state.index++;
  if (state.index >= state.rounds.length) {
    state.sayingIndex = pickSayingIndex(state.choice, score(state.rounds), rng);
    renderResults();
  }
  else renderRound();
}

function renderResults() {
  const s = score(state.rounds);
  $('#final-score').textContent = String(s);
  $('#saying').textContent = sayingAt(state.choice, s, state.sayingIndex);
  $('#shared-note').hidden = !state.shared;
  $('#btn-share').hidden = state.shared;
  $('#btn-share .label').textContent = 'Copy URL to results';
  $('#share-status').textContent = '';
  $('#share-url').hidden = true;
  $('#btn-again .label').textContent = state.shared ? `Play ${ECOSYSTEMS[state.choice].label}` : 'Play again';
  const list = $('#summary');
  list.replaceChildren();
  for (const round of state.rounds) {
    const li = document.createElement('li');
    const right = isCorrect(round);
    const mark = document.createElement('span');
    mark.className = `mark ${right ? 'right' : 'wrong'}`;
    mark.textContent = right ? '✓' : '✗';
    let name;
    if (round.isFake || !round.url) {
      name = document.createElement('span');
    } else {
      name = document.createElement('a');
      name.href = round.url;
      name.target = '_blank';
      name.rel = 'noopener';
    }
    name.className = 'name';
    name.textContent = round.name;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${ECOSYSTEMS[round.eco].label}: ${round.isFake ? 'fake' : 'real'}, you said ${round.guess}`;
    li.append(mark, name, meta);
    list.append(li);
  }
  show('results');
  // The buttons sit below the summary, so focusing them would scroll past the score.
  window.scrollTo(0, 0);
  $('#btn-again').focus({ preventScroll: true });
  launchConfetti(confettiFor(s));
}

async function copyShareUrl() {
  const { choice, sayingIndex, rounds } = state;
  const token = await encodeResults({ choice, sayingIndex, rounds });
  const url = `${location.origin}${location.pathname}#r=${token}`;
  try {
    await navigator.clipboard.writeText(url);
    $('#btn-share .label').textContent = 'Copied!';
    $('#share-status').textContent = 'Link copied to the clipboard.';
    setTimeout(() => ($('#btn-share .label').textContent = 'Copy URL to results'), 2000);
  } catch {
    const input = $('#share-url');
    input.value = url;
    input.hidden = false;
    input.select();
    $('#share-status').textContent = "Couldn't copy automatically. Copy the link below.";
  }
}

// Shows shared results when the page is opened with #r=<token>; otherwise the picker.
function hashToken() {
  return new URLSearchParams(location.hash.slice(1)).get('r');
}

async function showFromHash() {
  const token = hashToken();
  if (!token) {
    // The address no longer points at shared results (for example after Back), so leave them.
    if (state?.shared) goHome();
    return;
  }
  const id = ++gameId;
  const shared = await decodeResults(token);
  // The hash may have changed while decoding; only show results it still points at.
  if (id !== gameId || hashToken() !== token) return;
  if (!shared) {
    goHome();
    return;
  }
  state = { ...shared, index: shared.rounds.length, revealed: true, shared: true };
  renderResults();
}

function onResultsKey(key) {
  if (key === 'p') startGame(state.choice);
  else if (key === 'c' && !$('#btn-share').hidden) copyShareUrl();
  else if (key === 'e') goHome();
}

function onPickKey(key) {
  const id = PICKER_IDS[Number(key) - 1];
  if (/^[1-9]$/.test(key) && id) startGame(id);
}

document.addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target instanceof HTMLInputElement) return;
  const key = e.key.toLowerCase();
  if (!$('#pick').hidden) {
    onPickKey(key);
  } else if (!state) {
    return;
  } else if (!$('#results').hidden) {
    onResultsKey(key);
  } else if ($('#play').hidden) {
    return;
  } else if (!state.revealed) {
    if (key === 'r' || key === 'arrowleft') guess('real');
    else if (key === 'f' || key === 'arrowright') guess('fake');
  } else if (key === 'n') {
    next();
  }
});

$('#btn-real').addEventListener('click', () => guess('real'));
$('#btn-fake').addEventListener('click', () => guess('fake'));
$('#btn-next').addEventListener('click', next);
$('#btn-again').addEventListener('click', () => startGame(state.choice));
$('#btn-share').addEventListener('click', copyShareUrl);
$('#btn-pick').addEventListener('click', goHome);
window.addEventListener('hashchange', showFromHash);
$('#home').addEventListener('click', (e) => {
  e.preventDefault();
  goHome();
});

renderPicker();
show('pick');
showFromHash();
