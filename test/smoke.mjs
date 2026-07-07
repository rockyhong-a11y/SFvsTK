import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(async (e) => {
  return chromium.launch(); // fallback to bundled path resolution
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto('http://localhost:8321/index.html');
await page.waitForTimeout(1500);
await page.screenshot({ path: process.env.SHOT_DIR + '/01-title.png' });

// start VS CPU: mode select -> char select (P1 confirm, CPU auto-picks)
await page.keyboard.press('Digit1');
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(2300); // cpu pick + round intro -> FIGHT
await page.screenshot({ path: process.env.SHOT_DIR + '/02-fight-start.png' });

// P1 walks forward and jabs
await page.keyboard.down('KeyD');
await page.waitForTimeout(700);
await page.keyboard.up('KeyD');
await page.keyboard.press('KeyJ');
await page.waitForTimeout(300);
await page.screenshot({ path: process.env.SHOT_DIR + '/03-jab.png' });

// fireball (neutral skill)
await page.keyboard.press('KeyL');
await page.waitForTimeout(350);
await page.screenshot({ path: process.env.SHOT_DIR + '/04-kikoken.png' });
await page.waitForTimeout(600);

// forward skill (launcher)
await page.keyboard.down('KeyD');
await page.keyboard.press('KeyL');
await page.keyboard.up('KeyD');
await page.waitForTimeout(400);
await page.screenshot({ path: process.env.SHOT_DIR + '/05-launcher.png' });

// low skill
await page.keyboard.down('KeyS');
await page.keyboard.press('KeyL');
await page.keyboard.up('KeyS');
await page.waitForTimeout(500);

// kick + grab + jump kick
await page.keyboard.press('KeyK');
await page.waitForTimeout(400);
await page.keyboard.press('KeyI');
await page.waitForTimeout(700);
await page.keyboard.press('KeyW');
await page.waitForTimeout(200);
await page.keyboard.press('KeyK');
await page.waitForTimeout(400);
await page.screenshot({ path: process.env.SHOT_DIR + '/06-mixed.png' });

// let AI act a while
await page.waitForTimeout(4000);
await page.screenshot({ path: process.env.SHOT_DIR + '/07-ai.png' });

// back skill (multi-hit)
await page.keyboard.down('KeyA');
await page.keyboard.press('KeyL');
await page.keyboard.up('KeyA');
await page.waitForTimeout(600);
await page.screenshot({ path: process.env.SHOT_DIR + '/08-hyakuretsu.png' });

// pause overlay
await page.keyboard.press('KeyP');
await page.waitForTimeout(300);
await page.screenshot({ path: process.env.SHOT_DIR + '/09-pause.png' });
await page.keyboard.press('KeyP');

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
