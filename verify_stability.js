const puppeteer = require('puppeteer');

async function test(browser, name, path) {
  const page = await browser.newPage();
  const errors = [];
  const reqFailures = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.toString()));
  page.on('requestfailed', req => {
    // ignore tmdb connect resets as they are known network flake on this host
    if (!req.url().includes('themoviedb.org')) {
      reqFailures.push(`${req.url()} - ${req.failure()?.errorText}`);
    }
  });

  try {
    const res = await page.goto(`http://localhost:3000${path}`, { 
      waitUntil: 'networkidle0', timeout: 60000 
    });
    const body = await page.evaluate(() => document.body?.innerText || '');
    const crashed = body.includes('SOMETHING WENT WRONG') || body.includes('encountered an error');
    
    if (crashed) {
      console.log(`❌ ${name} | ${path} | CRASHED`);
    } else if (errors.length > 0 || reqFailures.length > 0) {
      console.log(`⚠️ ${name} | ${path} | WARNINGS`);
      if (errors.length) console.log(`   Errors: ${errors.slice(0, 2).join(' | ')}`);
      if (reqFailures.length) console.log(`   Req fails: ${reqFailures.slice(0, 2).join(' | ')}`);
    } else {
      console.log(`✅ ${name} | ${path} | OK`);
    }
  } catch(e) {
    console.log(`⏱️ ${name} | TIMEOUT | ${e.message.substring(0, 80)}`);
  }
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  console.log("=== RC15 STABILITY VERIFICATION ===\n");
  
  await test(browser, 'Home', '/');
  await test(browser, 'Discover', '/discover');
  await test(browser, 'Search', '/search');
  await test(browser, 'Movie Details', '/movie/550');
  
  console.log("\n=== DONE ===");
  await browser.close();
})();
