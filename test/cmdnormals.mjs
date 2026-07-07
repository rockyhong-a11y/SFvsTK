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
await page.keyboard.press('Enter'); // P1 pilot
await page.waitForTimeout(250);
await page.keyboard.press('Enter'); // P1 electra
await page.waitForTimeout(300);
await page.keyboard.press('Enter'); // P2 pilot
await page.waitForTimeout(250);
await page.keyboard.press('Enter'); // P2 katana
// wait for the round to actually go live (slow software-GL frames make fixed
// waits unreliable — first frames also pay shader compilation)
for (let i = 0; i < 100; i++) {
  const live = await page.evaluate(() => window.__game && __game.phase === 'fight' && __game.fighters[0].state === 'idle');
  if (live) break;
  await page.waitForTimeout(100);
}

// wait until P1 can act again, press (optionally with a held direction), then
// poll until the buffered press turns into a move
async function pressAndRead(key, holdKey) {
  for (let i = 0; i < 40; i++) {
    const ready = await page.evaluate(() => !__game.fighters[0].move && __game.fighters[0].canAct());
    if (ready) break;
    await page.waitForTimeout(80);
  }
  if (holdKey) { await page.keyboard.down(holdKey); await page.waitForTimeout(60); }
  await page.evaluate(() => { __game.fighters[0].lastMoveName = ''; });
  await page.keyboard.press(key);
  let name = '';
  for (let i = 0; i < 20; i++) {
    // lastMoveName survives fast moves that start+finish inside one slow frame
    name = await page.evaluate(() => __game.fighters[0].lastMoveName || '');
    if (name) break;
    await page.waitForTimeout(60);
  }
  if (holdKey) await page.keyboard.up(holdKey);
  return name;
}

const neutralPunch = await pressAndRead('KeyJ');
const fwdPunch = await pressAndRead('KeyJ', 'KeyD'); // P1 faces right, so forward = D
const backPunch = await pressAndRead('KeyJ', 'KeyA');
const neutralKick = await pressAndRead('KeyK');
const fwdKick = await pressAndRead('KeyK', 'KeyD');
const backKick = await pressAndRead('KeyK', 'KeyA');
const crouchPunch = await pressAndRead('KeyJ', 'KeyS'); // existing behavior not broken

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
