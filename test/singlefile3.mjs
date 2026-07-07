// Standalone-file check: touch controls + directional command normals from file://.
import { chromium, devices } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const iPhone = devices['iPhone 13'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ ...iPhone, hasTouch: true });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('file://' + resolve(root, 'SFvsTK.html'));
await page.waitForTimeout(1000);
await page.keyboard.press('Digit1');
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);

const touchOn = await page.evaluate(() => document.getElementById('touchControls').classList.contains('on'));
console.log('touch overlay on (standalone):', touchOn);

await page.evaluate(() => {
  document.querySelector('#touchButtons .tPunch').dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
});
await page.waitForTimeout(80);
const punchName = await page.evaluate(() => __game.fighters[0].move?.name || '');
console.log('touch punch move:', JSON.stringify(punchName));

// directional command normal via keyboard on the standalone build
await page.keyboard.down('KeyD');
await page.waitForTimeout(20);
await page.keyboard.press('KeyK');
await page.waitForTimeout(30);
const fwdKick = await page.evaluate(() => __game.fighters[0].move?.name || '');
await page.keyboard.up('KeyD');
console.log('forward+kick move:', JSON.stringify(fwdKick));

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
