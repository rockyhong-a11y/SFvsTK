// Focused wall-splat verification: P1 cornered, P2 lands blonde bomb.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR || '.';
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://localhost:8321/index.html');
await page.waitForTimeout(800);
await page.keyboard.press('Digit2');
await page.waitForTimeout(400);
await page.keyboard.press('Enter'); // P1: Chun-Li
await page.waitForTimeout(300);
await page.keyboard.press('Enter'); // P2: Nina
await page.waitForTimeout(1600);

// P1 backs into left wall; P2 chases until close
await page.keyboard.down('KeyA');
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(4500);
await page.keyboard.up('KeyA');
await page.waitForTimeout(1200); // P2 keeps closing in
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(200);

// neutral skill = blonde bomb
await page.keyboard.press('Numpad3');
// watch subAnnounce for WALL SPLAT during the next second
let found = '';
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(100);
  const t = await page.evaluate(() => ({
    on: document.getElementById('subAnnounce').classList.contains('on'),
    txt: document.getElementById('subAnnounce').textContent,
  }));
  if (t.on && t.txt) { found = t.txt; break; }
}
await page.screenshot({ path: SHOT + '/15-wallsplat.png' });
console.log('subAnnounce:', JSON.stringify(found));

// juggle after splat: divine cannon follow-up
await page.keyboard.down('ArrowLeft');
await page.keyboard.press('Numpad3');
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(400);
await page.screenshot({ path: SHOT + '/16-wall-juggle.png' });

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
