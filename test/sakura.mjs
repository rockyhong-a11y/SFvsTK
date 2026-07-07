// Verifies Sakura (skinned-model character) selects, loads, and fights correctly.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR || '.';
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push('console: ' + m.text()); });

await page.goto('http://localhost:8321/index.html');
await page.waitForTimeout(700);

// P1 = sakura (last card, index 6), P2 = chunli
await page.keyboard.press('Digit2');
await page.waitForTimeout(300);
for (let i = 0; i < 6; i++) await page.keyboard.press('KeyD');
await page.waitForTimeout(100);
const cardCount = await page.evaluate(() => document.querySelectorAll('.csCard').length);
console.log('char cards:', cardCount);
await page.keyboard.press('Enter'); // P1: sakura
await page.waitForTimeout(300);
await page.keyboard.press('Enter'); // P2: chunli (index 0, default)
await page.waitForTimeout(3000);

const names = await page.evaluate(() => [
  document.getElementById('name0').textContent, document.getElementById('name1').textContent,
]);
console.log('fighters:', JSON.stringify(names));
await page.screenshot({ path: SHOT + '/50-sakura-fight-start.png' });

const meshCheck = await page.evaluate(() => {
  let meshCount = 0;
  __game.fighters[0].rig.root.traverse((o) => { if (o.isMesh) meshCount++; });
  return meshCount;
});
console.log('sakura mesh count in scene:', meshCheck);

// jab
await page.keyboard.press('KeyJ');
await page.waitForTimeout(40);
console.log('jab move:', await page.evaluate(() => __game.fighters[0].move?.name || ''));
await page.waitForTimeout(400);
await page.screenshot({ path: SHOT + '/51-sakura-jab.png' });

// hadouken
await page.keyboard.press('KeyL');
await page.waitForTimeout(300);
console.log('skillN move:', await page.evaluate(() => document.getElementById('move0').textContent));
await page.screenshot({ path: SHOT + '/52-sakura-hadouken.png' });
await page.waitForTimeout(700);

// shououken (forward+skill)
await page.keyboard.down('KeyD');
await page.keyboard.press('KeyL');
await page.keyboard.up('KeyD');
await page.waitForTimeout(250);
await page.screenshot({ path: SHOT + '/53-sakura-shououken.png' });
await page.waitForTimeout(900);

// crouch
await page.keyboard.down('KeyS');
await page.waitForTimeout(200);
await page.screenshot({ path: SHOT + '/54-sakura-crouch.png' });
await page.keyboard.up('KeyS');

// walk forward
await page.keyboard.down('KeyD');
await page.waitForTimeout(300);
await page.screenshot({ path: SHOT + '/55-sakura-walk.png' });
await page.keyboard.up('KeyD');

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
