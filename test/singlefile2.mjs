// Standalone-file check for the newer systems: practice mode + grappler command grab.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('file://' + resolve(root, 'SFvsTK.html'));
await page.waitForTimeout(1000);

// practice mode with zangief
await page.keyboard.press('Digit3');
await page.waitForTimeout(300);
await page.keyboard.press('KeyD'); await page.keyboard.press('KeyD');
await page.keyboard.press('KeyD'); await page.keyboard.press('KeyD'); // -> zangief
await page.keyboard.press('Enter');
await page.waitForTimeout(250);
await page.keyboard.press('Enter'); // dummy: nina
await page.waitForTimeout(600);

const names = await page.evaluate(() => [
  document.getElementById('name0').textContent, document.getElementById('name1').textContent,
]);
console.log('practice fighters:', JSON.stringify(names));

// close distance, command grab
for (let i = 0; i < 25; i++) {
  const d = await page.evaluate(() => Math.abs(__game.fighters[0].pos.x - __game.fighters[1].pos.x));
  if (d < 1.1) break;
  const dir = await page.evaluate(() => __game.fighters[1].pos.x > __game.fighters[0].pos.x ? 'KeyD' : 'KeyA');
  await page.keyboard.down(dir); await page.waitForTimeout(140); await page.keyboard.up(dir);
}
await page.keyboard.press('KeyL');
await page.waitForTimeout(300);
const moveName = await page.evaluate(() => document.getElementById('move0').textContent);
console.log('command grab shown:', JSON.stringify(moveName));
await page.waitForTimeout(1000);
const dummyState = await page.evaluate(() => __game.fighters[1].state);
console.log('dummy state after piledriver:', dummyState);

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
