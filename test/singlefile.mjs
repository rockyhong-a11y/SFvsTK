// Standalone-file verification: SFvsTK.html must boot from file:// with zero errors.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOT = process.env.SHOT_DIR || '.';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('file://' + resolve(root, 'SFvsTK.html'));
await page.waitForTimeout(1500);
console.log('canvas:', await page.evaluate(() => document.querySelectorAll('canvas').length));

// boot a CPU match with Asuka (P1 cursor right x3)
await page.keyboard.press('Digit1');
await page.waitForTimeout(300);
await page.keyboard.press('KeyD');
await page.keyboard.press('KeyD');
await page.keyboard.press('KeyD');
await page.keyboard.press('Enter');
await page.waitForTimeout(2400);
const hudOn = await page.evaluate(() => document.getElementById('hud').classList.contains('on'));
console.log('hud on (fight started):', hudOn);

// play a few seconds
await page.keyboard.down('KeyD');
await page.waitForTimeout(800);
await page.keyboard.up('KeyD');
await page.keyboard.press('KeyJ');
await page.waitForTimeout(300);
await page.keyboard.press('KeyL'); // asuka parry stance
await page.waitForTimeout(1200);
await page.keyboard.down('KeyD');
await page.keyboard.press('KeyL');
await page.keyboard.up('KeyD'); // launcher
await page.waitForTimeout(2000);
await page.screenshot({ path: SHOT + '/23-singlefile.png' });

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
