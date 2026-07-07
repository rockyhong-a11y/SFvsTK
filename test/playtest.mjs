// Full-flow playtest: 2P mode, wall splat, KO, round transitions, match end.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR || '.';
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });

const sub = () => page.evaluate(() => document.getElementById('subAnnounce').textContent);
const ann = () => page.evaluate(() => document.getElementById('announce').textContent);

await page.goto('http://localhost:8321/index.html');
await page.waitForTimeout(800);
await page.keyboard.press('Digit2'); // 2P mode: P2 is a human dummy we control
await page.waitForTimeout(400);
await page.keyboard.press('Enter'); // P1 confirms Chun-Li
await page.waitForTimeout(300);
await page.keyboard.press('Enter'); // P2 confirms Nina
await page.waitForTimeout(1600);

// --- Scenario 1: wall splat ---
// P1 walks to left wall
await page.keyboard.down('KeyA');
await page.waitForTimeout(2200);
await page.keyboard.up('KeyA');
// P2 approaches P1
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(2600);
await page.keyboard.up('ArrowLeft');
// P2 blonde bomb (neutral skill) — big knockback into the wall
await page.keyboard.press('Numpad3');
await page.waitForTimeout(500);
await page.screenshot({ path: SHOT + '/10-wallsplat.png' });
const wallText = await sub();
console.log('sub after blonde bomb:', JSON.stringify(wallText));
await page.waitForTimeout(1500);

// --- Scenario 2: P2 launcher juggle on P1 ---
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(1200);
await page.keyboard.up('ArrowLeft');
await page.keyboard.down('ArrowLeft'); // face P1 (P1 at left wall) then f+skill = ArrowLeft is fwd for P2
await page.keyboard.press('Numpad3');
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(350);
await page.screenshot({ path: SHOT + '/11-launcher.png' });
await page.waitForTimeout(1200);

// --- Scenario 3: grind P1 down to KO with kicks ---
for (let i = 0; i < 40; i++) {
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(260);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('Numpad2'); // kick
  await page.waitForTimeout(420);
  const a = await ann();
  if (a === 'K.O.') break;
}
console.log('announce:', JSON.stringify(await ann()));
await page.screenshot({ path: SHOT + '/12-ko.png' });
await page.waitForTimeout(2500);
await page.screenshot({ path: SHOT + '/13-round2.png' });
const pips = await page.evaluate(() =>
  [...document.querySelectorAll('#pips1 .pip')].map((p) => p.classList.contains('won')));
console.log('nina pips:', JSON.stringify(pips));

// --- Scenario 4: round 2 KO -> match end ---
await page.waitForTimeout(1600); // wait FIGHT!
for (let i = 0; i < 45; i++) {
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(260);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('Numpad2');
  await page.waitForTimeout(420);
  const resultOn = await page.evaluate(() => document.getElementById('result').classList.contains('on'));
  if (resultOn) break;
}
await page.waitForTimeout(2000);
await page.screenshot({ path: SHOT + '/14-result.png' });
console.log('result on:', await page.evaluate(() => document.getElementById('result').classList.contains('on')));
console.log('result text:', await page.evaluate(() => document.getElementById('resultText').textContent));

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
