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
  KeyboardController, PadController, CompositeController, VirtualController,
  P1_KEYS, P2_KEYS, tickInputClock, pollGamepads, padMenuEdges,
} from './input.js';
import { preloadSkinnedModels, isSkinnedModelReady } from './skinnedRig.js';

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

function applySize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', applySize);
window.addEventListener('orientationchange', () => setTimeout(applySize, 200));
if (window.visualViewport) window.visualViewport.addEventListener('resize', applySize);

const fx = new FX(scene);
UI.init();

// ---------------- app state ----------------
const CHAR_IDS = ['chunli', 'nina', 'cammy', 'asuka', 'zangief', 'rmika', 'sakura'];
let mode = 'title'; // title | charselect | fight | result
let game = null;
let ai = null;
let paused = false;
let pauseIndex = 0;

// Sakura uses a real rigged model (fetched async) instead of the procedural box rig.
const skinnedModelsReady = preloadSkinnedModels(['sakura'])
  .catch((e) => console.error('skinned model preload failed', e));

let menuIndex = 0;
const menuOpts = [...document.querySelectorAll('.menuOpt')];
const csCards = [...document.querySelectorAll('.csCard')];
const csTitle = document.getElementById('csTitle');
const charselectEl = document.getElementById('charselect');
const pauseOpts = [...document.querySelectorAll('.pauseOpt')];
const pauseRestartOpt = document.getElementById('pauseRestartOpt');

const sel = { mode: 'cpu', phase: 'p1', p1: 0, p2: 1 };

function setMenuSel(i) {
  menuIndex = (i + menuOpts.length) % menuOpts.length;
  menuOpts.forEach((el, k) => el.classList.toggle('sel', k === menuIndex));
}
setMenuSel(0);

function setPauseSel(i) {
  pauseIndex = (i + pauseOpts.length) % pauseOpts.length;
  pauseOpts.forEach((el, k) => el.classList.toggle('sel', k === pauseIndex));
}

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
  const n = CHAR_IDS.length;
  if (who === 'p1') sel.p1 = (sel.p1 + delta + n) % n;
  else sel.p2 = (sel.p2 + delta + n) % n;
  renderCsCursor();
}

function csConfirm() {
  Sound.announce();
  if (sel.phase === 'p1') {
    if (sel.mode === 'cpu') {
      sel.phase = 'cpu';
      csTitle.textContent = 'CPU 상대 결정 중...';
      sel.p2 = Math.floor(Math.random() * CHAR_IDS.length);
      renderCsCursor();
      setTimeout(() => { if (mode === 'charselect') startFight(); }, 550);
    } else {
      sel.phase = 'p2';
      csTitle.textContent = sel.mode === 'practice' ? '더미 — 캐릭터 선택' : 'P2 — 캐릭터 선택';
      renderCsCursor();
    }
  } else if (sel.phase === 'p2') {
    if (sel.mode === 'practice') startPractice(); else startFight();
  }
}

function moveListHtml(fighter, label) {
  const moveKeys = [
    ['punchF', '앞+펀치'], ['punchB', '뒤+펀치'], ['kickF', '앞+킥'], ['kickB', '뒤+킥'],
    ['skillN', '스킬'], ['skillF', '앞+스킬'], ['skillB', '뒤+스킬'], ['skillD', '↓+스킬'], ['superN', '슈퍼'],
  ];
  const rows = moveKeys
    .map(([k, lab]) => fighter.char.moves[k] ? `${fighter.char.moves[k].name} <span style="color:#8a7fb0">— ${lab}</span>` : '')
    .filter(Boolean).join('<br>');
  return `<b>${label} — ${fighter.char.displayName} (${fighter.char.nameKo})</b>${rows}`;
}

function fillPauseTable() {
  const [a, b] = game.fighters;
  const labelB = sel.mode === 'cpu' ? 'CPU' : sel.mode === 'practice' ? '더미' : 'PLAYER 2';
  document.getElementById('pauseP1').innerHTML = moveListHtml(a, 'PLAYER 1');
  document.getElementById('pauseP2').innerHTML = moveListHtml(b, labelB);
  pauseRestartOpt.textContent = game.practiceMode ? '위치 · 체력 초기화' : '라운드 재시작';
}

function neededCharIds() {
  return [CHAR_IDS[sel.p1], CHAR_IDS[sel.p2]].filter((id) => CHARACTERS[id].rig.type === 'skinned');
}

async function ensureModelsReady() {
  const pending = neededCharIds().filter((id) => !isSkinnedModelReady(id));
  if (!pending.length) return;
  csTitle.textContent = '로딩 중...';
  await skinnedModelsReady;
}

async function startFight() {
  await ensureModelsReady();
  if (game) game.dispose();
  charselectEl.classList.remove('on');
  const p1 = new CompositeController(new KeyboardController(P1_KEYS), new PadController(0), touchCtrl);
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
  UI.setPracticeMode(false);
  UI.setNames(charA.displayName, charB.displayName + (sel.mode === 'cpu' ? ' (CPU)' : ''));
  UI.showResult(false);
  UI.showHud(true);
  fillPauseTable();
  mode = 'fight';
}

async function startPractice() {
  await ensureModelsReady();
  if (game) game.dispose();
  charselectEl.classList.remove('on');
  const p1 = new CompositeController(new KeyboardController(P1_KEYS), new PadController(0), touchCtrl);
  const dummyCtrl = new VirtualController();
  const charA = CHARACTERS[CHAR_IDS[sel.p1]];
  const charB = CHARACTERS[CHAR_IDS[sel.p2]];
  game = new Game(scene, fx, charA, charB, p1, dummyCtrl, { practice: true });
  game.camera = camera;
  window.__game = game;
  ai = null; // dummy AI (if enabled) is driven internally by Game in practice mode
  UI.setPracticeMode(true);
  UI.setNames(charA.displayName, charB.displayName + ' (더미)');
  UI.showResult(false);
  UI.showHud(true);
  UI.setPracticeStatus(game.dummyMode, game.forceGaugeMax);
  UI.setPracticePanel(moveListHtml(game.fighters[0], 'PLAYER 1'), false);
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
  UI.setPracticeMode(false);
  charselectEl.classList.remove('on');
  UI.showTitle(true);
  mode = 'title';
}

function openPause() {
  paused = true;
  setPauseSel(0);
  UI.showPause(true);
}

function runPauseAction(act) {
  if (act === 'resume') {
    paused = false;
    UI.showPause(false);
  } else if (act === 'restart') {
    if (game.practiceMode) {
      game.resetPracticePositions();
      UI.setPracticeStatus(game.dummyMode, game.forceGaugeMax);
    } else {
      startFight();
    }
    paused = false;
    UI.showPause(false);
  } else if (act === 'exit') {
    backToTitle();
  }
}

// ---------------- touch controls ----------------
const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const touchCtrl = new VirtualController();
const touchControlsEl = document.getElementById('touchControls');
const touchPauseEl = document.getElementById('touchPause');

function bindTouchButton(el) {
  const act = el.dataset.act;
  const onStart = (e) => {
    e.preventDefault();
    Sound.unlock();
    el.classList.add('active');
    touchCtrl.hold(act, true);
    touchCtrl.tap(act); // also buffer as a one-shot press (jump/attack buttons need this)
  };
  const onEnd = (e) => {
    e.preventDefault();
    el.classList.remove('active');
    touchCtrl.hold(act, false);
  };
  el.addEventListener('touchstart', onStart, { passive: false });
  el.addEventListener('touchend', onEnd, { passive: false });
  el.addEventListener('touchcancel', onEnd, { passive: false });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
document.querySelectorAll('#touchControls .tBtn').forEach(bindTouchButton);
touchPauseEl.addEventListener('touchstart', (e) => {
  e.preventDefault();
  Sound.unlock();
  if (mode === 'fight' && !paused) openPause();
});
touchPauseEl.addEventListener('contextmenu', (e) => e.preventDefault());

function updateTouchVisibility() {
  touchControlsEl.classList.toggle('on', isTouchDevice && mode === 'fight' && !paused);
  touchPauseEl.style.display = (isTouchDevice && mode === 'fight') ? 'flex' : 'none';
}

window.addEventListener('keydown', (e) => {
  Sound.unlock();
  if (mode === 'title') {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { setMenuSel(menuIndex - 1); Sound.beep(); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { setMenuSel(menuIndex + 1); Sound.beep(); }
    if (e.code === 'Digit1') showCharSelect('cpu');
    else if (e.code === 'Digit2') showCharSelect('2p');
    else if (e.code === 'Digit3') showCharSelect('practice');
    else if (e.code === 'Enter' || e.code === 'Space') showCharSelect(menuOpts[menuIndex].dataset.mode);
  } else if (mode === 'charselect') {
    const p1Turn = sel.phase === 'p1';
    const soloTurn = sel.mode !== '2p'; // cpu/practice: P1 controls both picks
    if (['KeyA', 'ArrowLeft'].includes(e.code)) csMove(p1Turn ? 'p1' : 'p2', -1);
    else if (['KeyD', 'ArrowRight'].includes(e.code)) csMove(p1Turn ? 'p1' : 'p2', 1);
    else if (p1Turn && ['Enter', 'KeyJ', 'Space'].includes(e.code)) csConfirm();
    else if (!p1Turn && sel.phase === 'p2' &&
      (['Enter', 'Numpad1', 'KeyN'].includes(e.code) || (soloTurn && ['KeyJ', 'Space'].includes(e.code)))) csConfirm();
    else if (e.code === 'Escape') backToTitle();
  } else if (mode === 'fight') {
    if (paused) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { setPauseSel(pauseIndex - 1); Sound.beep(); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { setPauseSel(pauseIndex + 1); Sound.beep(); }
      else if (e.code === 'Enter' || e.code === 'Space') runPauseAction(pauseOpts[pauseIndex].dataset.act);
      else if (e.code === 'KeyP') { paused = false; UI.showPause(false); }
      else if (e.code === 'Escape') { paused = false; UI.showPause(false); }
      return;
    }
    if (e.code === 'KeyP') openPause();
    else if (e.code === 'Escape') openPause();
    else if (game?.practiceMode) {
      if (e.code === 'KeyR') {
        game.resetPracticePositions();
        UI.setPracticeStatus(game.dummyMode, game.forceGaugeMax);
      } else if (e.code === 'KeyG') {
        game.forceGaugeMax = !game.forceGaugeMax;
        if (game.forceGaugeMax) { game.fighters[0].meter = 100; game.fighters[1].meter = 100; }
        UI.setPracticeStatus(game.dummyMode, game.forceGaugeMax);
      } else if (e.code === 'Tab') {
        e.preventDefault();
        const m = game.cycleDummyMode();
        UI.setPracticeStatus(m, game.forceGaugeMax);
        Sound.beep();
      } else if (e.code === 'KeyM') {
        const on = !document.getElementById('practicePanel').classList.contains('on');
        UI.setPracticePanel(moveListHtml(game.fighters[0], 'PLAYER 1'), on);
      }
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
pauseOpts.forEach((el, i) => {
  el.style.pointerEvents = 'auto';
  el.addEventListener('mouseenter', () => setPauseSel(i));
  el.addEventListener('click', () => runPauseAction(el.dataset.act));
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
  } else if (mode === 'fight' && paused) {
    if (e0.up) { setPauseSel(pauseIndex - 1); Sound.beep(); }
    if (e0.down) { setPauseSel(pauseIndex + 1); Sound.beep(); }
    if (e0.confirm) runPauseAction(pauseOpts[pauseIndex].dataset.act);
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
  updateTouchVisibility();
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
  } else {
    padMenus();
  }

  updateCamera(paused ? 0 : dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
