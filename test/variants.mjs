// Test: model variant selection (keyboard cycling, variant display, model loads)
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

await page.goto('http://localhost:8000/index.html');
await page.waitForTimeout(800);

// Enter character select (CPU mode, digit 1)
await page.keyboard.press('Digit1');
await page.waitForTimeout(300);

// Select Sakura (move down 6 times from Chun-Li using S key)
for (let i = 0; i < 6; i++) await page.keyboard.press('KeyS');
await page.waitForTimeout(200);

// Check initial variant is shown (should be "Box" or first variant)
const variantLabel1 = await page.textContent('body');
console.log('After selecting Sakura, page contains variant info:', variantLabel1.includes('Box') || variantLabel1.includes('Juri') ? 'YES' : 'NO');

// Cycle through variants (press ArrowRight/D 2 times to cycle)
const beforeVariant = await page.evaluate(() => document.querySelectorAll('[style*="color: #7fd0ff"]')[0]?.textContent || 'unknown');
console.log('Before variant cycling:', beforeVariant);

await page.keyboard.press('KeyD');
await page.waitForTimeout(200);
const afterVariant1 = await page.evaluate(() => document.querySelectorAll('[style*="color: #7fd0ff"]')[0]?.textContent || 'unknown');
console.log('After pressing D (right) once:', afterVariant1, '(changed:', beforeVariant !== afterVariant1, ')');

await page.keyboard.press('KeyD');
await page.waitForTimeout(200);
const afterVariant2 = await page.evaluate(() => document.querySelectorAll('[style*="color: #7fd0ff"]')[0]?.textContent || 'unknown');
console.log('After pressing D (right) twice:', afterVariant2, '(changed:', afterVariant1 !== afterVariant2, ')');

// Press Enter to confirm character (P1 selection)
console.log('Pressing Enter to confirm P1...');
await page.keyboard.press('Enter');
await page.waitForTimeout(500);

// Select P2 (random CPU pick, but we'll press Enter to auto-pick)
console.log('Pressing Enter to confirm P2...');
await page.keyboard.press('Enter');
await page.waitForTimeout(3000); // wait longer for models to load

// Verify game started (check for HUD elements)
const p1Name = await page.textContent('#name0');
const p2Name = await page.textContent('#name1');
console.log('P1:', p1Name, 'P2:', p2Name);

// Check if game mode is "fight"
const gameMode = await page.evaluate(() => window.__debug?.mode || 'unknown');
console.log('Game mode:', gameMode);

// Try to check if __game exists
const gameExists = await page.evaluate(() => typeof window.__game !== 'undefined');
console.log('Game exists:', gameExists);

if (gameExists) {
  // Check mesh count for the selected variant
  const meshCount = await page.evaluate(() => {
    let n = 0;
    window.__game.fighters[0].rig.root.traverse((o) => { if (o.isMesh) n++; });
    return n;
  });
  console.log('P1 mesh count:', meshCount);

  // Test that a move works with the variant
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(100);
  const moveNameText = await page.evaluate(() => window.__game.fighters[0].move?.name || 'not detected');
  console.log('P1 move after pressing J:', moveNameText);
}

// Take screenshot
await page.screenshot({ path: SHOT + '/70-variants-select.png' });

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
