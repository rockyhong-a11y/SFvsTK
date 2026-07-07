import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); // no hasTouch -> desktop
await page.goto('http://localhost:8321/index.html');
await page.waitForTimeout(600);
await page.keyboard.press('Digit1');
await page.waitForTimeout(400);
await page.keyboard.press('Enter'); // skip story intro
await page.waitForTimeout(250);
await page.keyboard.press('Enter'); // P1 pilot
await page.waitForTimeout(250);
await page.keyboard.press('Enter');
await page.waitForTimeout(2300);
const visible = await page.evaluate(() => {
  const el = document.getElementById('touchControls');
  return getComputedStyle(el).display !== 'none' && el.classList.contains('on');
});
console.log('touch overlay visible on desktop (should be false):', visible);
await browser.close();
