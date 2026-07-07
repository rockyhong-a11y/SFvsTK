import { chromium, devices } from 'playwright';

const SHOT = process.env.SHOT_DIR || '.';
const iPhone = devices['iPhone 13'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ ...iPhone, hasTouch: true });
const page = await context.newPage();

await page.goto('http://localhost:8321/index.html');
await page.waitForTimeout(600);
await page.screenshot({ path: SHOT + '/40-mobile-title.png' });

await page.keyboard.press('Digit2');
await page.waitForTimeout(400);
await page.screenshot({ path: SHOT + '/41-mobile-charselect.png' });
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.press('Enter');
await page.waitForTimeout(2300);
await page.screenshot({ path: SHOT + '/42-mobile-fight.png' });

// landscape variant
const context2 = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
const page2 = await context2.newPage();
await page2.goto('http://localhost:8321/index.html');
await page2.waitForTimeout(600);
await page2.keyboard.press('Digit1');
await page2.waitForTimeout(400);
await page2.keyboard.press('Enter');
await page2.waitForTimeout(2300);
await page2.screenshot({ path: SHOT + '/43-mobile-landscape-fight.png' });

await browser.close();
