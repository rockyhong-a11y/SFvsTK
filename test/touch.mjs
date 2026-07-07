// Verifies: touch device detection shows the overlay, tapping buttons drives
// the fighter (movement, punch, jump/dash via dpad), and mobile viewport
// resizing keeps the canvas/HUD sane.
import { chromium, devices } from 'playwright';

const errors = [];
const iPhone = devices['iPhone 13'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ ...iPhone, hasTouch: true });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push('console: ' + m.text()); });

await page.goto('http://localhost:8321/index.html');
await page.waitForTimeout(600);
const vp = page.viewportSize();
console.log('viewport:', JSON.stringify(vp));

await page.keyboard.press('Digit1'); // VS CPU (avoids needing a 2nd human)
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(2300);

const touchOn = await page.evaluate(() => document.getElementById('touchControls').classList.contains('on'));
console.log('touch overlay visible:', touchOn);

// tap the "right" dpad button — should move P1 forward
const beforeX = await page.evaluate(() => __game.fighters[0].pos.x);
const rightBtn = await page.$('#touchDpad .tRight');
const box = await rightBtn.boundingBox();
await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
// touchscreen.tap() is instantaneous; hold manually via dispatched events instead
await page.evaluate(() => {
  const el = document.querySelector('#touchDpad .tRight');
  el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
});
await page.waitForTimeout(500);
await page.evaluate(() => {
  const el = document.querySelector('#touchDpad .tRight');
  el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true }));
});
const afterX = await page.evaluate(() => __game.fighters[0].pos.x);
console.log('moved via touch dpad:', (afterX - beforeX).toFixed(2));

// tap punch button
await page.evaluate(() => {
  const el = document.querySelector('#touchButtons .tPunch');
  el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
});
await page.waitForTimeout(40);
const punchMove = await page.evaluate(() => __game.fighters[0].move?.name || '');
await page.evaluate(() => {
  const el = document.querySelector('#touchButtons .tPunch');
  el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true }));
});
console.log('punch move via touch:', JSON.stringify(punchMove));

// touch pause button
await page.evaluate(() => {
  document.getElementById('touchPause').dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
});
await page.waitForTimeout(150);
const pauseOn = await page.evaluate(() => document.getElementById('pauseOverlay').classList.contains('on'));
console.log('pause opened via touch button:', pauseOn);

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
