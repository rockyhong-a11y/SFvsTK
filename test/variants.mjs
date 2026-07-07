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

// Step 1: Select Sakura (move right 6 times from Chun-Li using D key)
for (let i = 0; i < 6; i++) await page.keyboard.press('KeyD');
await page.waitForTimeout(200);
console.log('Selected Sakura character');

// Step 2: Confirm character selection → moves to model selection
console.log('Pressing Enter to move to model selection...');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);

const title2 = await page.textContent('#csTitle');
console.log('Title after character confirm:', title2);

// Step 3: Try to select model (up/down arrows - W/S keys)
// Should skip non-selectable variants automatically
await page.keyboard.press('KeyW');
await page.waitForTimeout(200);
console.log('Pressed W to cycle through models');

// Step 4: Confirm model selection → moves to P2 character selection
console.log('Pressing Enter to confirm model and move to P2...');
await page.keyboard.press('Enter');
await page.waitForTimeout(500);

const title3 = await page.textContent('#csTitle');
console.log('Title after model confirm:', title3);

// Step 5: Select random character for P2 (just press Enter to auto-select)
console.log('Pressing Enter to auto-select P2 character...');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);

// Step 6: Select P2 model
console.log('Pressing Enter to confirm P2 model...');
await page.keyboard.press('Enter');
await page.waitForTimeout(3000); // wait for models to load

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
