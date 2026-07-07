// Bootstrap: renderer, camera, title/char-select flow, gamepad polling, fixed-step loop.
import * as THREE from 'three';
import { buildStage, WALL_X } from './stage.js';
import { CHARACTERS } from './moves.js';
import { Game } from './game.js';
import { FX } from './fx.js';
import { AI } from './ai.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import {
  KeyboardController, PadController, CompositeController,
  P1_KEYS, P2_KEYS, tickInputClock, pollGamepads, padMenuEdges,
} from './input.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
app.prepend(renderer.domElement);

const scene = new THREE.Scene();
buildStage(scene);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.9, 7.5);
camera.lookAt(0, 1.1, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const fx = new FX(scene);
UI.init();

// ---------------- app state ----------------
const CHAR_IDS = ['chunli', 'nina', 'cammy', 'asuka'];
let mode = 'title'; // title | charselect | fight | result
let game = null;
let ai = null;
let paused = false;

let menuIndex = 0;
const menuOpts = [...document.querySelectorAll('.menuOpt')];
const csCards = [...document.querySelectorAll('.csCard')];
const csTitle = document.getElementById('csTitle');
const charselectEl = document.getElementById('charselect');

const sel = { mode: 'cpu', phase: 'p1', p1: 0, p2: 1 };

function setMenuSel(i) {
  menuIndex = (i + menuOpts.length) % menuOpts.length;
  menuOpts.forEach((el, k) => el.classList.toggle('sel', k === menuIndex));
}
setMenuSel(0);

function showCharSelect(vsMode) {
  sel.mode = vsMode;
  sel.phase = 'p1';
  sel.p1 = 0;
  sel.p2 = 1;
  mode = 'charselect';
  UI.showTitle(false);
  charselectEl.classList.add('on');
  csTitle.textContent = 'P1 — 캐릭터 선택';
  renderCsCursor();
}

function renderCsCursor() {
  csCards.forEach((el, i) => {
    el.classList.toggle('selP1', i === sel.p1);
    el.classList.toggle('selP2', mode === 'charselect' && sel.phase !== 'p1' && i === sel.p2);
  });
}

function csMove(who, delta) {
  Sound.beep();
  if (who === 'p1') sel.p1 = (sel.p1 + delta + 4) % 4;
  else sel.p2 = (sel.p2 + delta + 4) % 4;
  renderCsCursor();
}

function csConfirm() {
  Sound.announce();
  if (sel.phase === 'p1') {
    if (sel.mode === 'cpu') {
      sel.phase = 'cpu';
      csTitle.textContent = 'CPU 상대 결정 중...';
      sel.p2 = Math.floor(Math.random() * 4);
      renderCsCursor();
      setTimeout(() => { if (mode === 'charselect') startFight(); }, 550);
    } else {
      sel.phase = 'p2';
      csTitle.textContent = 'P2 — 캐릭터 선택';
      renderCsCursor();
    }
  } else if (sel.phase === 'p2') {
    startFight();
  }
}

function fillPauseTable() {
  const [a, b] = game.fighters;
  const label = ['PLAYER 1', sel.mode === 'cpu' ? 'CPU' : 'PLAYER 2'];
  const moveKeys = [['skillN', '스킬'], ['skillF', '앞+스킬'], ['skillB', '뒤+스킬'], ['skillD', '↓+스킬'], ['superN', '슈퍼']];
  [a, b].forEach((f, i) => {
    const el = document.getElementById(i === 0 ? 'pauseP1' : 'pauseP2');
    const rows = moveKeys
      .map(([k, lab]) => f.char.moves[k] ? `${f.char.moves[k].name} <span style="color:#8a7fb0">— ${lab}</span>` : '')
      .filter(Boolean).join('<br>');
    el.innerHTML = `<b>${label[i]} — ${f.char.displayName} (${f.char.nameKo})</b>${rows}`;
  });
}

function startFight() {
  if (game) game.dispose();
  charselectEl.classList.remove('on');
  const p1 = new CompositeController(new KeyboardController(P1_KEYS), new PadController(0));
  const p2 = new CompositeController(new KeyboardController(P2_KEYS), new PadController(1));
  const charA = CHARACTERS[CHAR_IDS[sel.p1]];
  const charB = CHARACTERS[CHAR_IDS[sel.p2]];
  game = new Game(scene, fx, charA, charB, p1, p2);
  game.camera = camera;
  window.__game = game; // dev/test hook
  ai = sel.mode === 'cpu' ? new AI(game.fighters[1], game.fighters[0]) : null;
  game.onMatchEnd = (champ) => {
    mode = 'result';
    UI.showResult(true, `${champ.char.displayName} WINS!`);
  };
  UI.setNames(charA.displayName, charB.displayName + (sel.mode === 'cpu' ? ' (CPU)' : ''));
  UI.showResult(false);
  UI.showHud(true);
  fillPauseTable();
  mode = 'fight';
}

function backToTitle() {
  if (game) { game.dispose(); game = null; }
  ai = null;
  paused = false;
  UI.showHud(false);
  UI.showResult(false);
  UI.showPause(false);
  charselectEl.classList.remove('on');
  UI.showTitle(true);
  mode = 'title';
}

window.addEventListener('keydown', (e) => {
  Sound.unlock();
  if (mode === 'title') {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { setMenuSel(menuIndex - 1); Sound.beep(); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { setMenuSel(menuIndex + 1); Sound.beep(); }
    if (e.code === 'Digit1') showCharSelect('cpu');
    else if (e.code === 'Digit2') showCharSelect('2p');
    else if (e.code === 'Enter' || e.code === 'Space') showCharSelect(menuOpts[menuIndex].dataset.mode);
  } else if (mode === 'charselect') {
    const p1Turn = sel.phase === 'p1';
    if (['KeyA', 'ArrowLeft'].includes(e.code)) csMove(p1Turn ? 'p1' : 'p2', -1);
    else if (['KeyD', 'ArrowRight'].includes(e.code)) csMove(p1Turn ? 'p1' : 'p2', 1);
    else if (p1Turn && ['Enter', 'KeyJ', 'Space'].includes(e.code)) csConfirm();
    else if (!p1Turn && sel.phase === 'p2' && ['Enter', 'Numpad1', 'KeyN'].includes(e.code)) csConfirm();
    else if (e.code === 'Escape') backToTitle();
  } else if (mode === 'fight') {
    if (e.code === 'KeyP') {
      paused = !paused;
      UI.showPause(paused);
    } else if (e.code === 'Escape') {
      if (paused) backToTitle();
      else { paused = true; UI.showPause(true); }
    }
  } else if (mode === 'result') {
    if (e.code === 'Enter') showCharSelect(sel.mode);
    if (e.code === 'Escape') backToTitle();
  }
});

menuOpts.forEach((el, i) => {
  el.style.pointerEvents = 'auto';
  el.addEventListener('mouseenter', () => setMenuSel(i));
  el.addEventListener('click', () => { Sound.unlock(); showCharSelect(el.dataset.mode); });
});
csCards.forEach((el, i) => {
  el.style.pointerEvents = 'auto';
  el.addEventListener('click', () => {
    if (mode !== 'charselect') return;
    if (sel.phase === 'p1') { sel.p1 = i; renderCsCursor(); csConfirm(); }
    else if (sel.phase === 'p2') { sel.p2 = i; renderCsCursor(); csConfirm(); }
  });
});

// gamepad navigation in menus
function padMenus() {
  const e0 = padMenuEdges(0);
  const e1 = padMenuEdges(1);
  if (mode === 'title') {
    if (e0.up) { setMenuSel(menuIndex - 1); Sound.beep(); }
    if (e0.down) { setMenuSel(menuIndex + 1); Sound.beep(); }
    if (e0.confirm) showCharSelect(menuOpts[menuIndex].dataset.mode);
  } else if (mode === 'charselect') {
    if (sel.phase === 'p1') {
      if (e0.left) csMove('p1', -1);
      if (e0.right) csMove('p1', 1);
      if (e0.confirm) csConfirm();
    } else if (sel.phase === 'p2') {
      const e = sel.mode === '2p' ? e1 : e0;
      if (e.left) csMove('p2', -1);
      if (e.right) csMove('p2', 1);
      if (e.confirm) csConfirm();
    }
  } else if (mode === 'result') {
    if (e0.confirm) showCharSelect(sel.mode);
  }
}

// ---------------- camera follow ----------------
const camTarget = new THREE.Vector3(0, 1.1, 0);
const camPos = new THREE.Vector3(0, 1.9, 7.5);

function updateCamera(dt) {
  let midX = 0, midY = 1.1, dist = 4;
  if (game) {
    const [a, b] = game.fighters;
    midX = (a.pos.x + b.pos.x) / 2;
    midY = 1.0 + Math.max(a.pos.y, b.pos.y) * 0.35;
    dist = Math.abs(a.pos.x - b.pos.x);
  }
  const z = THREE.MathUtils.clamp(4.6 + dist * 0.62, 5.4, 9.4);
  const maxX = WALL_X + 1.2 - z * 0.62; // keep walls composed
  const tx = THREE.MathUtils.clamp(midX * 0.85, -Math.max(0, maxX), Math.max(0, maxX));

  camPos.x += (tx - camPos.x) * Math.min(1, dt * 6);
  camPos.y += (1.7 + midY * 0.25 - camPos.y) * Math.min(1, dt * 4);
  camPos.z += (z - camPos.z) * Math.min(1, dt * 5);
  camTarget.x += (tx - camTarget.x) * Math.min(1, dt * 6);
  camTarget.y += (midY - camTarget.y) * Math.min(1, dt * 4);

  camera.position.copy(camPos).add(fx.shakeVec);
  camera.lookAt(camTarget.x + fx.shakeVec.x * 0.5, camTarget.y, 0);
}

// ---------------- main loop (fixed step) ----------------
const STEP = 1 / 120;
let last = performance.now();
let acc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  pollGamepads();
  const fighterDt = fx.step(dt);

  if (!paused) {
    tickInputClock(dt);
    if (mode === 'title' || mode === 'charselect' || mode === 'result') padMenus();
    if (game && mode !== 'result') {
      acc += fighterDt;
      while (acc >= STEP) {
        ai?.update(STEP);
        game.update(STEP);
        acc -= STEP;
      }
    }
    fx.update(dt, camera);
    if (game) UI.update(dt, game.fighters);
  }

  updateCamera(paused ? 0 : dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
