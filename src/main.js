// Bootstrap: renderer, camera, title/char-select flow, gamepad polling, fixed-step loop.
import * as THREE from 'three';
import { buildStage, WALL_X } from './stage.js';
import { CHARACTERS, PILOTS, BOSS_PILOT, NOVA } from './moves.js';
import { Game } from './game.js';
import { FX } from './fx.js';
import { AI } from './ai.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import {
  KeyboardController, PadController, CompositeController, VirtualController,
  P1_KEYS, P2_KEYS, tickInputClock, pollGamepads, padMenuEdges,
} from './input.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false });
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
const CHAR_IDS = ['chunli', 'nina', 'cammy', 'asuka', 'zangief', 'rmika'];
let mode = 'title'; // title | story | charselect | shop | fight | result
let game = null;
let ai = null;
let paused = false;
let pauseIndex = 0;
let menuIndex = 0;
const menuOpts = [...document.querySelectorAll('.menuOpt')];
const csCards = [...document.querySelectorAll('#csGrid .csCard')];
const pilotCards = [...document.querySelectorAll('#pilotGrid .csCard')];
const csTitle = document.getElementById('csTitle');
const charselectEl = document.getElementById('charselect');
const csGridEl = document.getElementById('csGrid');
const pilotGridEl = document.getElementById('pilotGrid');
const storyScreenEl = document.getElementById('storyScreen');
const storyTitleEl = document.getElementById('storyTitle');
const storyTextEl = document.getElementById('storyText');
const shopScreenEl = document.getElementById('shopScreen');
const shopCreditsEl = document.getElementById('shopCredits');
const shopListEl = document.getElementById('shopList');
const resultHintEl = document.getElementById('resultHint');
const pauseOpts = [...document.querySelectorAll('.pauseOpt')];
const pauseRestartOpt = document.getElementById('pauseRestartOpt');

// phase: p1-pilot → p1-har → (p2-pilot → p2-har)
const sel = { mode: 'cpu', phase: 'p1-pilot', p1: 0, p2: 1, p1Pilot: 0, p2Pilot: 1 };

function setMenuSel(i) {
  menuIndex = (i + menuOpts.length) % menuOpts.length;
  menuOpts.forEach((el, k) => el.classList.toggle('sel', k === menuIndex));
}
setMenuSel(0);

function setPauseSel(i) {
  pauseIndex = (i + pauseOpts.length) % pauseOpts.length;
  pauseOpts.forEach((el, k) => el.classList.toggle('sel', k === pauseIndex));
}

// ---------------- tournament career (growth) ----------------
// OMF-style upgrades: arm/leg servo power, drive train, armor plating
const UPGRADES = [
  { key: 'arm',   label: '팔 서보 파워',  desc: '펀치·잡기 데미지 +8%/Lv' },
  { key: 'leg',   label: '다리 서보 파워', desc: '킥 데미지 +8%/Lv' },
  { key: 'drv',   label: '구동계',        desc: '이동·점프 +5%/Lv' },
  { key: 'armor', label: '장갑판',        desc: '최대 내구도 +8%/Lv' },
];
const UP_MAX = 5;
const upCost = (lv) => 350 * (lv + 1);

function loadCareer() {
  try {
    const c = JSON.parse(localStorage.getItem('har2097_career') || 'null');
    if (c && c.up) return c;
  } catch (e) { /* corrupted save → fresh start */ }
  return { credits: 0, up: { arm: 0, leg: 0, drv: 0, armor: 0 } };
}
const career = loadCareer();
function saveCareer() {
  try { localStorage.setItem('har2097_career', JSON.stringify(career)); } catch (e) { /* private mode */ }
}

// ---------------- story (tournament ladder) ----------------
const story = { active: false, stage: 0, ladder: [] };

const STORY_INTRO = `서기 2097년. 국가는 무너졌고, 궤도 기업들이 지구를 나눠 가졌다.
분쟁은 이제 전쟁이 아니라 — 링 위에서 끝난다.

파일럿은 뉴럴 링크로 거대 로봇 HAR과 신경을 동기화해 싸운다.
주최사 WAR가 내건 우승 상품은 단 하나, 가니메데 기지의 운영권.

여섯 명의 파일럿이 초대장을 받았다. 결승 너머에서
총수 크라이색이 비밀 프로토타입과 함께 기다리고 있다는 소문과 함께.`;

const STAGE_BLURBS = [
  '1회전 — 예선 링. 관중석은 반쯤 비어 있지만, 스폰서의 카메라는 전부 켜져 있다.',
  '2회전 — 상대 진영이 당신의 기체 로그를 사들였다. 같은 수는 두 번 통하지 않는다.',
  '준준결승 — 정비 크루가 속삭인다. "위쪽 경기는 전부 짜여 있어. 이기려면 압도해."',
  '준결승 — 방송 시청률이 행성 기록을 갱신했다. WAR 본사가 당신을 주시하기 시작한다.',
  '결승 — 마지막 공식 경기. 이기면 가니메데로 가는 셔틀이 대기 중이다.',
  '??? — 시상식은 없었다. 격납고 문이 열리고, 크라이색이 프로토타입 NOVA를 기동한다.\n"규정은 내가 만든다. 소유권을 원하면 — 이겨 봐라."',
];

function pilotEnding(pilot) {
  const lines = {
    crystal: '크리스탈은 우승 트로피 대신 WAR의 봉인된 인사 기록을 요구했다. 부모의 이름은, 가니메데 승무원 명단에 있었다.',
    steffan: '스테판은 상금을 전부 옛 정비 크루에게 나눠 주고, 더 무거운 기체의 설계도를 펼쳤다.',
    milano: '밀라노는 시상대에서 내려오자마자 다음 시즌 제로G 레이스에 참가 신청을 냈다. "격투? 워밍업이었지."',
    christian: '크리스천은 빚을 모두 갚고 남은 크레딧을 확인한 뒤, 처음으로 웃었다.',
    shirro: '시로는 가니메데 기지를 구조 훈련 시설로 개조하겠다고 발표했다. 관중은 야유했고, 그는 개의치 않았다.',
    angel: '엔젤은 우승 다음 날 사라졌다. WAR의 기밀 서버에는 접속 흔적만 남았다.',
  };
  return lines[pilot.id] || '챔피언의 이름이 가니메데의 밤하늘에 새겨졌다.';
}

function buildLadder() {
  // 5 regular rungs (random pilot+HAR pairs, no repeat HARs) + NOVA boss
  const hars = [...CHAR_IDS].sort(() => Math.random() - 0.5).slice(0, 5);
  const ladder = hars.map((harId) => ({
    har: harId,
    pilot: PILOTS[Math.floor(Math.random() * PILOTS.length)],
    boss: false,
  }));
  ladder.push({ har: 'nova', pilot: BOSS_PILOT, boss: true });
  return ladder;
}

// ---------------- screens ----------------
let storyNext = null; // Enter callback for the story screen

function showStory(title, text, next) {
  hideAllScreens();
  mode = 'story';
  storyTitleEl.textContent = title;
  storyTextEl.textContent = text;
  storyScreenEl.classList.add('on');
  storyNext = next;
}

function hideAllScreens() {
  UI.showTitle(false);
  UI.showResult(false);
  charselectEl.classList.remove('on');
  storyScreenEl.classList.remove('on');
  shopScreenEl.classList.remove('on');
}

// ---------------- shop ----------------
let shopIndex = 0;

function shopItems() {
  return [...UPGRADES.map((u) => {
    const lv = career.up[u.key];
    return { ...u, lv, cost: lv >= UP_MAX ? null : upCost(lv) };
  }), { key: 'go', label: '▶ 다음 경기 출전', desc: '', lv: null, cost: null }];
}

function renderShop() {
  shopCreditsEl.textContent = `보유 크레딧: ${career.credits} ¢`;
  shopListEl.innerHTML = shopItems().map((it, i) => {
    const lv = it.lv == null ? '' : `<span class="lv">Lv ${it.lv}/${UP_MAX}</span>`;
    const cost = it.key === 'go' ? '' : it.cost == null ? '<span class="cost">MAX</span>' : `<span class="cost">${it.cost} ¢</span>`;
    const maxCls = it.cost == null && it.key !== 'go' ? ' max' : '';
    return `<div class="shopItem${i === shopIndex ? ' sel' : ''}${maxCls}">` +
      `<span>${it.label} <small style="color:#8a7fb0">${it.desc}</small></span><span>${lv} ${cost}</span></div>`;
  }).join('');
}

function showShop() {
  hideAllScreens();
  mode = 'shop';
  shopIndex = shopItems().length - 1; // default on "next match"
  shopScreenEl.classList.add('on');
  renderShop();
}

function shopConfirm() {
  const it = shopItems()[shopIndex];
  if (it.key === 'go') {
    Sound.announce();
    startStoryFight();
    return;
  }
  if (it.cost != null && career.credits >= it.cost) {
    career.credits -= it.cost;
    career.up[it.key]++;
    saveCareer();
    Sound.announce();
  } else {
    Sound.beep();
  }
  renderShop();
}

// ---------------- selection flow ----------------
function showCharSelect(vsMode) {
  sel.mode = vsMode;
  sel.p1 = 0; sel.p2 = 1;
  sel.p1Pilot = 0; sel.p2Pilot = 1;
  hideAllScreens();
  if (vsMode === 'cpu') {
    story.active = true;
    story.stage = 0;
    story.ladder = buildLadder();
    showStory('2097 — 침공 없는 전쟁', STORY_INTRO, openPilotSelect);
    return;
  }
  story.active = false;
  openPilotSelect();
}

function openPilotSelect() {
  hideAllScreens();
  mode = 'charselect';
  sel.phase = 'p1-pilot';
  charselectEl.classList.add('on');
  renderCsCursor();
}

function csLabel() {
  const who = sel.phase.startsWith('p1') ? 'P1' : (sel.mode === 'practice' ? '더미' : 'P2');
  return sel.phase.endsWith('-pilot') ? `${who} — 파일럿 선택` : `${who} — HAR(로봇) 선택`;
}

function renderCsCursor() {
  const pilotPhase = sel.phase.endsWith('-pilot');
  pilotGridEl.style.display = pilotPhase ? 'flex' : 'none';
  csGridEl.style.display = pilotPhase ? 'none' : 'flex';
  csTitle.textContent = csLabel();
  const isP2 = sel.phase.startsWith('p2');
  pilotCards.forEach((el, i) => {
    el.classList.toggle('selP1', !isP2 && i === sel.p1Pilot);
    el.classList.toggle('selP2', isP2 && i === sel.p2Pilot);
  });
  csCards.forEach((el, i) => {
    el.classList.toggle('selP1', !isP2 && i === sel.p1);
    el.classList.toggle('selP2', isP2 && i === sel.p2);
  });
}

function csKey() {
  // index key for the active phase
  return sel.phase === 'p1-pilot' ? 'p1Pilot' : sel.phase === 'p1-har' ? 'p1'
    : sel.phase === 'p2-pilot' ? 'p2Pilot' : 'p2';
}

function csMove(delta) {
  Sound.beep();
  const n = sel.phase.endsWith('-pilot') ? PILOTS.length : CHAR_IDS.length;
  const k = csKey();
  sel[k] = (sel[k] + delta + n) % n;
  renderCsCursor();
}

function csConfirm() {
  Sound.announce();
  if (sel.phase === 'p1-pilot') { sel.phase = 'p1-har'; renderCsCursor(); return; }
  if (sel.phase === 'p1-har') {
    if (sel.mode === 'cpu') { startStoryFight(); return; }
    sel.phase = 'p2-pilot'; renderCsCursor(); return;
  }
  if (sel.phase === 'p2-pilot') { sel.phase = 'p2-har'; renderCsCursor(); return; }
  if (sel.phase === 'p2-har') {
    if (sel.mode === 'practice') startPractice(); else startFight();
  }
}

// ---------------- loadout: pilot stats + upgrades onto a HAR ----------------
function applyLoadout(charDef, pilot, ups) {
  const drv = ups ? 1 + 0.05 * ups.drv : 1;
  const hpUp = ups ? 1 + 0.08 * ups.armor : 1;
  const armUp = ups ? 1 + 0.08 * ups.arm : 1;
  const legUp = ups ? 1 + 0.08 * ups.leg : 1;
  return {
    ...charDef,
    health: Math.round(charDef.health * pilot.endurance * hpUp),
    walkF: charDef.walkF * pilot.agility * drv,
    walkB: charDef.walkB * pilot.agility * drv,
    jumpVy: charDef.jumpVy * (0.94 + 0.06 * pilot.agility * drv),
    mods: { arm: pilot.power * armUp, leg: pilot.power * legUp },
    pilot,
  };
}

function fighterLabel(charDef) {
  return `${charDef.displayName} · ${charDef.pilot ? charDef.pilot.name : '?'}`;
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

// ---------------- fight starts ----------------
function beginMatch(charA, charB, opts = {}) {
  if (game) game.dispose();
  hideAllScreens();
  const p1 = new CompositeController(new KeyboardController(P1_KEYS), new PadController(0), touchCtrl);
  const p2ctrl = opts.practice
    ? new VirtualController()
    : new CompositeController(new KeyboardController(P2_KEYS), new PadController(1));
  game = new Game(scene, fx, charA, charB, p1, p2ctrl, opts.practice ? { practice: true } : undefined);
  game.camera = camera;
  window.__game = game; // dev/test hook
  ai = opts.cpu ? new AI(game.fighters[1], game.fighters[0]) : null;
  game.onMatchEnd = opts.onEnd || ((champ) => {
    mode = 'result';
    resultHintEl.innerHTML = '<kbd>Enter</kbd> 다시 대전 &nbsp;|&nbsp; <kbd>Esc</kbd> 타이틀로';
    UI.showResult(true, `${champ.char.displayName} WINS!`);
  });
  UI.setPracticeMode(!!opts.practice);
  UI.setNames(fighterLabel(charA), fighterLabel(charB) + (opts.cpu ? ' (CPU)' : opts.practice ? ' (더미)' : ''));
  UI.showResult(false);
  UI.showHud(true);
  if (opts.practice) {
    UI.setPracticeStatus(game.dummyMode, game.forceGaugeMax);
    UI.setPracticePanel(moveListHtml(game.fighters[0], 'PLAYER 1'), false);
  }
  fillPauseTable();
  mode = 'fight';
}

function startStoryFight() {
  const rung = story.ladder[story.stage];
  const meChar = applyLoadout(CHARACTERS[CHAR_IDS[sel.p1]], PILOTS[sel.p1Pilot], career.up);
  // CPU scales gently with ladder height; the boss brings a heavier chassis
  const cpuBase = rung.har === 'nova' ? NOVA : CHARACTERS[rung.har];
  const cpuUps = { arm: story.stage, leg: story.stage, drv: Math.min(2, story.stage), armor: story.stage };
  const cpuChar = applyLoadout(cpuBase, rung.pilot, cpuUps);
  beginMatch(meChar, cpuChar, { cpu: true, onEnd: (champ) => onStoryMatchEnd(champ) });
}

function onStoryMatchEnd(champ) {
  const playerWon = champ === game.fighters[0];
  mode = 'result';
  if (!playerWon) {
    resultHintEl.innerHTML = '<kbd>Enter</kbd> 재도전 &nbsp;|&nbsp; <kbd>Esc</kbd> 타이틀로';
    UI.showResult(true, `${champ.char.displayName} WINS!`);
    return;
  }
  // credits: base + ladder bonus + perfect bonus
  const me = game.fighters[0];
  const reward = 300 + story.stage * 80 + (me.health >= me.maxHealth ? 200 : 0);
  career.credits += reward;
  saveCareer();
  const wasBoss = story.ladder[story.stage].boss;
  story.stage++;
  if (wasBoss) {
    const pilot = PILOTS[sel.p1Pilot];
    story.active = false;
    showStory('CHAMPION OF GANYMEDE', `${pilotEnding(pilot)}\n\n(+${reward} ¢)`, backToTitle);
    return;
  }
  const blurb = STAGE_BLURBS[Math.min(story.stage, STAGE_BLURBS.length - 1)];
  showStory(`${story.stage}승 — 보상 +${reward} ¢`, blurb, showShop);
}

async function startFight() {
  const charA = applyLoadout(CHARACTERS[CHAR_IDS[sel.p1]], PILOTS[sel.p1Pilot], null);
  const charB = applyLoadout(CHARACTERS[CHAR_IDS[sel.p2]], PILOTS[sel.p2Pilot], null);
  beginMatch(charA, charB, {});
}

async function startPractice() {
  const charA = applyLoadout(CHARACTERS[CHAR_IDS[sel.p1]], PILOTS[sel.p1Pilot], null);
  const charB = applyLoadout(CHARACTERS[CHAR_IDS[sel.p2]], PILOTS[sel.p2Pilot], null);
  beginMatch(charA, charB, { practice: true });
}

function backToTitle() {
  if (game) { game.dispose(); game = null; }
  ai = null;
  paused = false;
  story.active = false;
  UI.showHud(false);
  UI.showPause(false);
  hideAllScreens();
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
    } else if (story.active && sel.mode === 'cpu') {
      startStoryFight();
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
  } else if (mode === 'story') {
    if (['Enter', 'KeyJ', 'Space'].includes(e.code)) { const fn = storyNext; storyNext = null; fn?.(); }
    else if (e.code === 'Escape') backToTitle();
  } else if (mode === 'shop') {
    if (['KeyW', 'ArrowUp'].includes(e.code)) { shopIndex = (shopIndex + shopItems().length - 1) % shopItems().length; Sound.beep(); renderShop(); }
    else if (['KeyS', 'ArrowDown'].includes(e.code)) { shopIndex = (shopIndex + 1) % shopItems().length; Sound.beep(); renderShop(); }
    else if (['Enter', 'KeyJ', 'Space'].includes(e.code)) shopConfirm();
    else if (e.code === 'Escape') backToTitle();
  } else if (mode === 'charselect') {
    if (['KeyA', 'ArrowLeft'].includes(e.code)) csMove(-1);
    else if (['KeyD', 'ArrowRight'].includes(e.code)) csMove(1);
    else if (['Enter', 'KeyJ', 'Space'].includes(e.code)) csConfirm();
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
    if (e.code === 'Enter') {
      if (story.active && sel.mode === 'cpu') startStoryFight(); // retry the rung
      else showCharSelect(sel.mode);
    }
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
    if (mode !== 'charselect' || !sel.phase.endsWith('-har')) return;
    sel[sel.phase.startsWith('p1') ? 'p1' : 'p2'] = i;
    renderCsCursor(); csConfirm();
  });
});
pilotCards.forEach((el, i) => {
  el.style.pointerEvents = 'auto';
  el.addEventListener('click', () => {
    if (mode !== 'charselect' || !sel.phase.endsWith('-pilot')) return;
    sel[sel.phase.startsWith('p1') ? 'p1Pilot' : 'p2Pilot'] = i;
    renderCsCursor(); csConfirm();
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
    const e = sel.mode === '2p' && sel.phase.startsWith('p2') ? e1 : e0;
    if (e.left) csMove(-1);
    if (e.right) csMove(1);
    if (e.confirm) csConfirm();
  } else if (mode === 'story') {
    if (e0.confirm) { const fn = storyNext; storyNext = null; fn?.(); }
  } else if (mode === 'shop') {
    if (e0.up) { shopIndex = (shopIndex + shopItems().length - 1) % shopItems().length; Sound.beep(); renderShop(); }
    if (e0.down) { shopIndex = (shopIndex + 1) % shopItems().length; Sound.beep(); renderShop(); }
    if (e0.confirm) shopConfirm();
  } else if (mode === 'fight' && paused) {
    if (e0.up) { setPauseSel(pauseIndex - 1); Sound.beep(); }
    if (e0.down) { setPauseSel(pauseIndex + 1); Sound.beep(); }
    if (e0.confirm) runPauseAction(pauseOpts[pauseIndex].dataset.act);
  } else if (mode === 'result') {
    if (e0.confirm) {
      if (story.active && sel.mode === 'cpu') startStoryFight();
      else showCharSelect(sel.mode);
    }
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
  // clamp guards against huge catch-ups after tab suspend, but stays generous
  // enough that slow renderers (software GL/CI) keep wall-accurate game time —
  // the fixed-step loop below just runs more physics steps per frame
  let dt = Math.min(0.25, (now - last) / 1000);
  last = now;

  pollGamepads();
  updateTouchVisibility();
  const fighterDt = fx.step(dt);

  if (!paused) {
    tickInputClock(dt);
    if (['title', 'charselect', 'result', 'story', 'shop'].includes(mode)) padMenus();
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
