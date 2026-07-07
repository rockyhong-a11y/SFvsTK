// New-feature verification: Cammy/Asuka pick, super gauge, wakeup mixups, reversal.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR || '.';
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(e.message));

const sub = () => page.evaluate(() => document.getElementById('subAnnounce').textContent);

await page.goto('http://localhost:8321/index.html');
await page.waitForTimeout(800);

// --- char select: P1 = Cammy (index 2), P2 = Asuka (index 3) ---
await page.keyboard.press('Digit2');
await page.waitForTimeout(300);
await page.keyboard.press('Enter'); // P1 pilot
await page.waitForTimeout(250);
await page.keyboard.press('KeyD');
await page.keyboard.press('KeyD');
await page.waitForTimeout(150);
await page.screenshot({ path: SHOT + '/20-charselect.png' });
await page.keyboard.press('Enter'); // P1: cammy(jaguar)
await page.waitForTimeout(250);
await page.keyboard.press('Enter'); // P2 pilot
await page.waitForTimeout(250);
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight'); // nina -> asuka
await page.waitForTimeout(150);
await page.keyboard.press('Enter'); // P2: asuka
await page.waitForTimeout(1800);

const names = await page.evaluate(() => [
  document.getElementById('name0').textContent,
  document.getElementById('name1').textContent,
]);
console.log('fighters:', JSON.stringify(names));

// --- super art: fill gauge via dev hook, press P1 super macro ---
await page.evaluate(() => { __game.fighters[0].meter = 100; });
await page.waitForTimeout(150);
await page.keyboard.down('KeyD'); // approach a bit while supering
await page.keyboard.press('KeyU');
await page.keyboard.up('KeyD');
await page.waitForTimeout(500);
await page.screenshot({ path: SHOT + '/21-super.png' });
const meterAfter = await page.evaluate(() => __game.fighters[0].meter);
const superAnnounce = await page.evaluate(() => document.getElementById('announce').textContent);
console.log('super announce:', JSON.stringify(superAnnounce), '| meter after:', meterAfter);
await page.waitForTimeout(1600);

// --- wakeup attack: P2 sweeps P1 down, P1 holds punch for rising mid ---
// close distance first
await page.keyboard.down('ArrowLeft');
await page.keyboard.down('KeyD');
await page.waitForTimeout(900);
await page.keyboard.up('KeyD');
await page.keyboard.up('ArrowLeft');
// P2 asuka low sweep (down+skill)
await page.keyboard.down('ArrowDown');
await page.keyboard.press('Numpad3');
await page.keyboard.up('ArrowDown');
// P1 buffers punch for wakeup mid
await page.keyboard.down('KeyJ');
let wakeupSeen = '';
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(100);
  const mv = await page.evaluate(() => __game.fighters[0].move?.name || '');
  if (mv.startsWith('기상')) { wakeupSeen = mv; break; }
}
await page.keyboard.up('KeyJ');
console.log('wakeup attack:', JSON.stringify(wakeupSeen));
await page.waitForTimeout(1000);

// --- reversal: P2 asuka parries P1 jab ---
// walk P1 until the two are adjacent (body-push distance)
for (let i = 0; i < 40; i++) {
  const d = await page.evaluate(() =>
    Math.abs(__game.fighters[0].pos.x - __game.fighters[1].pos.x));
  if (d < 1.0) break;
  const dir = await page.evaluate(() =>
    __game.fighters[1].pos.x > __game.fighters[0].pos.x ? 'KeyD' : 'KeyA');
  await page.keyboard.down(dir);
  await page.waitForTimeout(160);
  await page.keyboard.up(dir);
}
let reversalSeen = '';
for (let tries = 0; tries < 6 && !reversalSeen; tries++) {
  await page.keyboard.press('Numpad3'); // asuka neutral skill = parry stance
  await page.waitForTimeout(120);
  await page.keyboard.press('KeyJ'); // P1 jab into the parry
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(100);
    const t = await sub();
    if (t === 'REVERSAL!') { reversalSeen = t; break; }
  }
  await page.waitForTimeout(700);
}
console.log('reversal:', JSON.stringify(reversalSeen));
await page.screenshot({ path: SHOT + '/22-reversal.png' });

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
