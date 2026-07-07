// Verifies: throw before/after animation, 2 new grapplers + 6-char select, dash,
// pause menu (resume/restart/exit), practice mode (gauge max, dummy cycle, no KO).
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR || '.';
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push('console: ' + m.text()); });

const state = (i) => page.evaluate((idx) => {
  const f = window.__game.fighters[idx];
  return { state: f.state, x: f.pos.x, hasClip: !!f.throwClip, health: f.health };
}, i);

await page.goto('http://localhost:8321/index.html');
await page.waitForTimeout(600);

// ===================== 1) char-select shows 6 cards, pick Zangief/Mika =====================
await page.keyboard.press('Digit2');
await page.waitForTimeout(300);
const cardCount = await page.evaluate(() => document.querySelectorAll('#csGrid .csCard').length);
console.log('char cards:', cardCount);
await page.keyboard.press('Enter'); // P1 pilot
await page.waitForTimeout(250);
await page.keyboard.press('KeyD'); await page.keyboard.press('KeyD');
await page.keyboard.press('KeyD'); await page.keyboard.press('KeyD'); // -> zangief (index 4)
await page.waitForTimeout(120);
await page.screenshot({ path: SHOT + '/30-charselect6.png' });
await page.keyboard.press('Enter'); // P1: zangief(thorn)
await page.waitForTimeout(250);
await page.keyboard.press('Enter'); // P2 pilot
await page.waitForTimeout(250);
await page.keyboard.press('ArrowRight'); // nina -> cammy... move to rmika (index 5): from nina(1)->+4=5
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(120);
await page.keyboard.press('Enter'); // P2: rmika
await page.waitForTimeout(1700);
const names = await page.evaluate(() => [
  document.getElementById('name0').textContent, document.getElementById('name1').textContent,
]);
console.log('fighters:', JSON.stringify(names));

// ===================== 2) throw: before/after animation frames =====================
// close distance then P1 (zangief) grabs P2 (rmika)
for (let i = 0; i < 30; i++) {
  const d = await page.evaluate(() => Math.abs(__game.fighters[0].pos.x - __game.fighters[1].pos.x));
  if (d < 0.9) break;
  const dir = await page.evaluate(() => __game.fighters[1].pos.x > __game.fighters[0].pos.x ? 'KeyD' : 'KeyA');
  await page.keyboard.down(dir); await page.waitForTimeout(140); await page.keyboard.up(dir);
}
await page.keyboard.press('KeyI'); // normal grab
const frames = [];
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(40);
  frames.push(await state(1));
}
const thrownFrames = frames.filter((f) => f.state === 'thrown');
const distinctPoses = new Set(thrownFrames.map((f) => f.x.toFixed(2)));
console.log('thrown-state frame count:', thrownFrames.length, '| had clip:', thrownFrames.every((f) => f.hasClip));
console.log('post-throw victim state reached launched/knockdown:', frames.some((f) => f.state === 'launched' || f.state === 'knockdown' || f.state === 'hitstun'));
await page.screenshot({ path: SHOT + '/31-throw-hold.png' });
await page.waitForTimeout(1200);

// ===================== 3) command grab (piledriver) =====================
for (let i = 0; i < 30; i++) {
  const d = await page.evaluate(() => Math.abs(__game.fighters[0].pos.x - __game.fighters[1].pos.x));
  if (d < 1.0) break;
  const dir = await page.evaluate(() => __game.fighters[1].pos.x > __game.fighters[0].pos.x ? 'KeyD' : 'KeyA');
  await page.keyboard.down(dir); await page.waitForTimeout(140); await page.keyboard.up(dir);
}
await page.keyboard.press('KeyL'); // zangief skillN = spinning piledriver
await page.waitForTimeout(300);
await page.screenshot({ path: SHOT + '/32-piledriver.png' });
const moveName = await page.evaluate(() => document.getElementById('move0').textContent);
console.log('command grab move name shown:', JSON.stringify(moveName));
await page.waitForTimeout(1500);

// ===================== 4) dash: double-tap (realistic hold/release timing) =====================
const beforeX = await page.evaluate(() => __game.fighters[0].pos.x);
await page.keyboard.down('KeyA'); await page.waitForTimeout(40); await page.keyboard.up('KeyA');
await page.waitForTimeout(60);
await page.keyboard.down('KeyA'); await page.waitForTimeout(40);
const dashState = await page.evaluate(() => __game.fighters[0].state);
await page.keyboard.up('KeyA');
await page.waitForTimeout(300);
const afterX = await page.evaluate(() => __game.fighters[0].pos.x);
console.log('dash triggered state:', dashState, '| moved:', (beforeX - afterX).toFixed(2));

// ===================== 5) pause menu: resume / exit =====================
await page.keyboard.press('KeyP');
await page.waitForTimeout(150);
const pauseOn = await page.evaluate(() => document.getElementById('pauseOverlay').classList.contains('on'));
await page.screenshot({ path: SHOT + '/33-pausemenu.png' });
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); // -> exit
await page.waitForTimeout(100);
const selLabel = await page.evaluate(() => document.querySelector('.pauseOpt.sel')?.dataset.act);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const titleOn = await page.evaluate(() => document.getElementById('title').classList.contains('on'));
console.log('pause overlay opened:', pauseOn, '| selected before confirm:', selLabel, '| back at title:', titleOn);

// ===================== 6) practice mode =====================
await page.keyboard.press('Digit3');
await page.waitForTimeout(300);
await page.keyboard.press('Enter'); // P1 pilot
await page.waitForTimeout(250);
await page.keyboard.press('Enter'); // P1 electra
await page.waitForTimeout(250);
await page.keyboard.press('Enter'); // dummy pilot
await page.waitForTimeout(250);
await page.keyboard.press('Enter'); // dummy HAR
await page.waitForTimeout(500);
const practiceHudOn = await page.evaluate(() => document.getElementById('hud').classList.contains('practice'));
console.log('practice hud flag:', practiceHudOn);

// toggle gauge max
await page.keyboard.press('KeyG');
await page.waitForTimeout(100);
const meters = await page.evaluate(() => [__game.fighters[0].meter, __game.fighters[1].meter]);
console.log('meters after gauge-max toggle:', JSON.stringify(meters));

// cycle dummy mode to guard, verify dummy blocks
await page.keyboard.press('Tab');
await page.waitForTimeout(100);
const dummyMode1 = await page.evaluate(() => __game.dummyMode);
// approach & attack the guarding dummy
for (let i = 0; i < 20; i++) {
  const d = await page.evaluate(() => Math.abs(__game.fighters[0].pos.x - __game.fighters[1].pos.x));
  if (d < 1.3) break;
  await page.keyboard.down('KeyD'); await page.waitForTimeout(120); await page.keyboard.up('KeyD');
}
await page.keyboard.press('KeyJ');
await page.waitForTimeout(300);
const dummyState = await page.evaluate(() => __game.fighters[1].state);
console.log('dummy mode:', dummyMode1, '| dummy state after being jabbed:', dummyState);

// switch dummy to STAND (no guard) so hits actually connect, then grind health to the floor
await page.evaluate(() => { __game.dummyMode = 'stand'; });
const dummyMode2 = await page.evaluate(() => __game.dummyMode);
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('KeyL'); // chunli fireball / skill
  await page.waitForTimeout(180);
  const hp = await page.evaluate(() => __game.fighters[1].health);
  if (hp <= 1) break;
}
const dummyHealth = await page.evaluate(() => __game.fighters[1].health);
const koAnnounce = await page.evaluate(() => document.getElementById('announce').textContent);
console.log('dummy mode for grind:', dummyMode2, '| dummy health after grind:', dummyHealth, '| announce text:', JSON.stringify(koAnnounce));

// force near-zero health directly, confirm one more hit floors at 1 (never 0) with no KO
await page.evaluate(() => {
  const [a, b] = __game.fighters;
  a.state = 'idle'; a.move = null; a.pos.x = -0.5;
  b.state = 'idle'; b.move = null; b.pos.x = 0.5; b.health = 5;
});
await page.waitForTimeout(200);
await page.evaluate(() => __game.fighters[0].state); // settle a beat before the input
await page.keyboard.down('KeyK');
await page.waitForTimeout(60);
await page.keyboard.up('KeyK');
await page.waitForTimeout(900);
const flooredHealth = await page.evaluate(() => __game.fighters[1].health);
const phaseAfter = await page.evaluate(() => __game.phase);
const announceAfter = await page.evaluate(() => document.getElementById('announce').textContent);
console.log('health floor test -> health:', flooredHealth, '| phase:', phaseAfter, '| announce:', JSON.stringify(announceAfter));
await page.screenshot({ path: SHOT + '/34-practice.png' });

// M panel toggle
await page.keyboard.press('KeyM');
await page.waitForTimeout(150);
const panelOn = await page.evaluate(() => document.getElementById('practicePanel').classList.contains('on'));
console.log('move panel toggled on:', panelOn);
await page.screenshot({ path: SHOT + '/35-practice-panel.png' });

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
