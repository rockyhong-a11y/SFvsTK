// Verifies directional punch/kick command normals fire the right move per direction.
import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });

await page.goto('http://localhost:8321/index.html');
await page.waitForTimeout(600);
await page.keyboard.press('Digit2');
await page.waitForTimeout(400);
await page.keyboard.press('Enter'); // P1 chunli
await page.waitForTimeout(300);
await page.keyboard.press('Enter'); // P2 nina
await page.waitForTimeout(2300);

const moveName = () => page.evaluate(() => __game.fighters[0].move?.name || '');

// neutral punch
await page.keyboard.press('KeyJ');
await page.waitForTimeout(50);
const neutralPunch = await moveName();
await page.waitForTimeout(300);

// forward+punch (P1 faces right, so forward = D)
await page.keyboard.down('KeyD');
await page.waitForTimeout(20);
await page.keyboard.press('KeyJ');
await page.waitForTimeout(30);
const fwdPunch = await moveName();
await page.keyboard.up('KeyD');
await page.waitForTimeout(300);

// back+punch
await page.keyboard.down('KeyA');
await page.waitForTimeout(20);
await page.keyboard.press('KeyJ');
await page.waitForTimeout(30);
const backPunch = await moveName();
await page.keyboard.up('KeyA');
await page.waitForTimeout(300);

// neutral kick
await page.keyboard.press('KeyK');
await page.waitForTimeout(30);
const neutralKick = await moveName();
await page.waitForTimeout(400);

// forward+kick
await page.keyboard.down('KeyD');
await page.waitForTimeout(20);
await page.keyboard.press('KeyK');
await page.waitForTimeout(30);
const fwdKick = await moveName();
await page.keyboard.up('KeyD');
await page.waitForTimeout(400);

// back+kick
await page.keyboard.down('KeyA');
await page.waitForTimeout(20);
await page.keyboard.press('KeyK');
await page.waitForTimeout(30);
const backKick = await moveName();
await page.keyboard.up('KeyA');
await page.waitForTimeout(400);

// crouch+punch still works (existing behavior not broken)
await page.keyboard.down('KeyS');
await page.waitForTimeout(20);
await page.keyboard.press('KeyJ');
await page.waitForTimeout(30);
const crouchPunch = await moveName();
await page.keyboard.up('KeyS');

console.log('neutral punch:', JSON.stringify(neutralPunch));
console.log('forward punch:', JSON.stringify(fwdPunch));
console.log('back punch:', JSON.stringify(backPunch));
console.log('neutral kick:', JSON.stringify(neutralKick));
console.log('forward kick:', JSON.stringify(fwdKick));
console.log('back kick:', JSON.stringify(backKick));
console.log('crouch punch (should be unchanged 앉아 잽):', JSON.stringify(crouchPunch));
const allDistinct = new Set([neutralPunch, fwdPunch, backPunch]).size === 3 &&
  new Set([neutralKick, fwdKick, backKick]).size === 3;
console.log('all directional variants distinct:', allDistinct);

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
