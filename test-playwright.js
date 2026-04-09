import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

async function testScrape() {
  const targetUrl = 'https://www.yad2.co.il/realestate/item/tel-aviv-area/zrg9e7r2';
  console.log('Testing Stealth Playwright on:', targetUrl);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'he-IL'
  });
  const page = await context.newPage();
  
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  console.log('Waiting for elements (just static wait)');
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    let nextDataStr = '';
    const nextTag = document.getElementById('__NEXT_DATA__');
    if (nextTag) {
      nextDataStr = nextTag.innerText;
    }
    return JSON.parse(nextDataStr);
  });
  
  const fs = await import('fs');
  fs.writeFileSync('yad2_next_data.json', JSON.stringify(data, null, 2));
  console.log('Saved to yad2_next_data.json');

  console.log('Result:', JSON.stringify(data, null, 2));
  await page.screenshot({ path: '/Users/itayissashar/.gemini/antigravity/scratch/apartment-hunter/yad2-stealth-screenshot.png' });
  console.log('Screenshot saved');
  await browser.close();
}

testScrape();
