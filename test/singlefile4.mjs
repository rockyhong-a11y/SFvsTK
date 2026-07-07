// Standalone-file check: Sakura (skinned model, embedded as base64 GLB) loads and fights.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOT = process.env.SHOT_DIR || '.';
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('file://' + resolve(root, 'SFvsTK.html'));
await page.waitForTimeout(1200);
await page.keyboard.press('Digit2');
await page.waitForTimeout(400);
for (let i = 0; i < 6; i++) await page.keyboard.press('KeyD');
await page.keyboard.press('Enter'); // P1: sakura
await page.waitForTimeout(300);
await page.keyboard.press('Enter'); // P2: nina
await page.waitForTimeout(3200);

const names = await page.evaluate(() => [
  document.getElementById('name0').textContent, document.getElementById('name1').textContent,
]);
console.log('fighters:', JSON.stringify(names));
const meshCount = await page.evaluate(() => {
  let n = 0;
  __game.fighters[0].rig.root.traverse((o) => { if (o.isMesh) n++; });
  return n;
});
console.log('sakura mesh count:', meshCount);

await page.keyboard.press('KeyJ');
await page.waitForTimeout(60);
console.log('jab move:', await page.evaluate(() => __game.fighters[0].move?.name || ''));
await page.waitForTimeout(400);
await page.screenshot({ path: SHOT + '/60-standalone-sakura.png' });

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
