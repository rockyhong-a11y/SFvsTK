// Bootstrap: renderer, camera, menu flow, fixed-step game loop.
import * as THREE from 'three';
import { buildStage, WALL_X } from './stage.js';
import { CHARACTERS } from './moves.js';
import { Game } from './game.js';
import { FX } from './fx.js';
import { AI } from './ai.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { KeyboardController, P1_KEYS, P2_KEYS, tickInputClock, keyDown } from './input.js';

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
let mode = 'title'; // title | fight | result | pause
let game = null;
let ai = null;
let menuIndex = 0;
const menuOpts = [...document.querySelectorAll('.menuOpt')];

function setMenuSel(i) {
  menuIndex = (i + menuOpts.length) % menuOpts.length;
  menuOpts.forEach((el, k) => el.classList.toggle('sel', k === menuIndex));
}
setMenuSel(0);

function startFight(vsMode) {
  if (game) game.dispose();
  const p1 = new KeyboardController(P1_KEYS);
  const p2 = new KeyboardController(P2_KEYS);
  game = new Game(scene, fx, CHARACTERS.chunli, CHARACTERS.nina, p1, p2);
  game.camera = camera;
  ai = vsMode === 'cpu' ? new AI(game.fighters[1], game.fighters[0]) : null;
  game.onMatchEnd = (champ) => {
    mode = 'result';
    UI.showResult(true, `${champ.char.displayName} WINS!`);
  };
  UI.setNames(CHARACTERS.chunli.displayName, vsMode === 'cpu' ? 'NINA (CPU)' : 'NINA');
  UI.showTitle(false);
  UI.showResult(false);
  UI.showHud(true);
  mode = 'fight';
}

function backToTitle() {
  if (game) { game.dispose(); game = null; }
  ai = null;
  UI.showHud(false);
  UI.showResult(false);
  UI.showPause(false);
  UI.showTitle(true);
  mode = 'title';
}

let paused = false;
window.addEventListener('keydown', (e) => {
  Sound.unlock();
  if (mode === 'title') {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { setMenuSel(menuIndex - 1); Sound.beep(); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { setMenuSel(menuIndex + 1); Sound.beep(); }
    if (e.code === 'Digit1') { startFight('cpu'); }
    if (e.code === 'Digit2') { startFight('2p'); }
    if (e.code === 'Enter' || e.code === 'Space') {
      startFight(menuOpts[menuIndex].dataset.mode);
    }
  } else if (mode === 'fight') {
    if (e.code === 'KeyP') {
      paused = !paused;
      UI.showPause(paused);
    } else if (e.code === 'Escape') {
      if (paused) { paused = false; backToTitle(); }
      else { paused = true; UI.showPause(true); }
    }
  } else if (mode === 'result') {
    if (e.code === 'Enter') { startFight(ai ? 'cpu' : '2p'); }
    if (e.code === 'Escape') backToTitle();
  }
});
menuOpts.forEach((el, i) => {
  el.style.pointerEvents = 'auto';
  el.addEventListener('mouseenter', () => setMenuSel(i));
  el.addEventListener('click', () => { Sound.unlock(); startFight(el.dataset.mode); });
});

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

  const fighterDt = fx.step(dt);

  if (!paused) {
    tickInputClock(dt);
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
