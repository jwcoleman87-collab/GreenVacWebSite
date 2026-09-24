/* Runs the actual production bundle. All external requests are intercepted;
 * submissions are captured locally and can never send an email or conversion.
 * npm run build && npm run test:browser (from get-a-quote-src).
 * Optional CHROMIUM_PATH for a preinstalled browser. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.join(__dirname, '..');
const { chromium } = createRequire(path.join(root, 'get-a-quote-src/package.json'))('playwright');
const mime = { js: 'application/javascript', html: 'text/html', webp: 'image/webp', png: 'image/png', css: 'text/css', woff2: 'font/woff2' };
const server = http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  try {
    res.setHeader('Content-Security-Policy', JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'))).headers.find(h => h.source === '/(.*)').headers.find(h => h.key === 'Content-Security-Policy').value);
    res.setHeader('Content-Type', mime[file.split('.').pop()] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-zygote'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const errors = [], submissions = [];
    let rejectNext = true;
    await context.route('**/*', async route => {
      const url = route.request().url();
      if (url === 'https://flowform.to/submit') {
        submissions.push(route.request().postDataBuffer().toString());
        return route.fulfill({ status: rejectNext ? 503 : 200, contentType: 'application/json', body: JSON.stringify({ success: !rejectNext }) });
      }
      if (url.startsWith(origin)) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const click = name => page.getByRole('button', { name }).click();
    const text = () => page.locator('body').innerText();
    const step = async n => { await page.getByText(`Step ${n} of 6`, { exact: true }).waitFor(); };
    await page.goto(origin + '/get-a-quote/');
    await step(1);
    await click(/More Job Types/);
    for (const label of [/Pit or Drain Cleaning/, /Something Else/]) {
      const img = page.getByRole('button', { name: label }).locator('img');
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
      assert.equal(await img.evaluate(el => el.naturalWidth > 0), true);
    }
    await click(/^Trenching/);
    await click('Electrical Trench');
    await click('Continue to job details');
    await step(2);
    await click('10 m');
    await click('Reduce trench length');
    await click(/^300 mm/);
    await click(/^Standard — About 300 mm/);
    await click('Continue to site details');
    await step(3);
    await page.getByPlaceholder('Suburb *').fill('Canberra');
    await click(/^Open Access/);
    await click(/^Normal \/ Soft/);
    await click(/^No Known Services/);
    await click(/^Remove It/);
    await page.getByLabel('Anything else James should know?').fill('Keep the garden bed intact');
    await click('Show My Ballpark Price');
    await step(4);
    assert.match(await text(), /\$680\s*–\s*\$750/);
    assert.doesNotMatch(await text(), /\$85|0\.81 m³|\$110|0\.25 m³/);
    if (process.env.SCREENSHOT_DIR) { fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'estimator-result.png'), fullPage: true, animations: "disabled" }); }
    const reference = await page.locator('.reference strong').innerText();
    assert.match(reference, /^GV-\d{8}-[A-F0-9]{12}$/);
    await click('Go back');
    await step(3);
    assert.equal(await page.getByPlaceholder('Suburb *').inputValue(), 'Canberra');
    assert.equal(await page.getByLabel('Anything else James should know?').inputValue(), 'Keep the garden bed intact');
    await click('Show My Ballpark Price');
    await click('Send to James');
    await step(5);
    await page.getByLabel('Full name', { exact: true }).fill('Estimator Test');
    await page.getByLabel('Mobile number', { exact: true }).fill('x');
    await click('Flexible / Planning Ahead');
    assert.equal(await page.locator('.primary-btn').isDisabled(), true);
    await page.getByLabel('Mobile number', { exact: true }).fill('0412 345 678');
    await page.getByLabel('Email address', { exact: true }).fill('wrong');
    assert.equal(await page.locator('.primary-btn').isDisabled(), true);
    await page.getByLabel('Email address', { exact: true }).fill('test@example.com');
    await page.setInputFiles('#site-photos', path.join(root, 'images/illustrated-pit-cleaning.webp'));
    await page.setInputFiles('#site-photos', path.join(root, 'images/illustrated-job-planning.webp'));
    await page.locator('.uploaded-photos img').nth(1).waitFor();
    assert.equal(await page.locator('.uploaded-photos img').count(), 2);
    // Wait for the real IndexedDB transaction, not an arbitrary timeout.
    await page.waitForFunction(async () => {
      const fallback = JSON.parse(sessionStorage.getItem('greenvac-estimator-v2'));
      if (fallback?.photoCount !== 2) return false;
      return new Promise(resolve => {
        const open = indexedDB.open('greenvac-estimator-v2');
        open.onsuccess = () => { const request = open.result.transaction('drafts').objectStore('drafts').get(fallback.ans.reference); request.onsuccess = () => { resolve(request.result?.ans?.sitePhotos?.length === 2); open.result.close(); }; };
      });
    });
    await page.reload();
    await step(5);
    assert.equal(await page.getByLabel('Full name', { exact: true }).inputValue(), 'Estimator Test');
    assert.equal(await page.locator('.uploaded-photos img').count(), 2);
    for (const img of await page.locator('.uploaded-photos img').all()) assert.equal(await img.evaluate(el => el.complete && el.naturalWidth > 0), true);
    await click('Review My Request');
    await step(6);
    assert.equal(await page.locator('.reference strong').innerText(), reference);
    assert.equal(await page.locator('.uploaded-photos img').count(), 2);
    await page.goBack();
    await step(5);
    assert.equal(await page.getByLabel('Full name', { exact: true }).inputValue(), 'Estimator Test');
    await page.goForward();
    await step(6);
    await click('Edit job type');
    await step(1);
    await click(/^Trenching/);
    await click('Continue to job details');
    await step(2);
    assert.match(await page.locator('.metre-value').innerText(), /9/);
    assert.equal(await page.getByRole('button', { name: /^300 mm/ }).getAttribute('aria-pressed'), 'true');
    await click('Continue to site details');
    await click('Show My Ballpark Price');
    await click('Send to James');
    await step(5);
    assert.equal(await page.getByLabel('Full name', { exact: true }).inputValue(), 'Estimator Test');
    assert.equal(await page.locator('.uploaded-photos img').count(), 2);
    await click('Remove photo 1');
    assert.equal(await page.locator('.uploaded-photos img').count(), 1);
    await click('Save and leave');
    await page.getByRole('dialog').waitFor();
    await click('Leave estimator');
    await page.waitForURL(origin + '/');
    await page.goto(origin + '/get-a-quote/');
    await step(5);
    assert.equal(await page.locator('.uploaded-photos img').count(), 1);
    await click('Review My Request');
    await click(/I understand this is an indicative estimate/);
    await click('Edit site details');
    await page.getByLabel('Anything else James should know?').fill('Updated note');
    await click('Show My Ballpark Price');
    await click('Send to James');
    await click('Review My Request');
    assert.equal(await page.locator('.primary-btn').isDisabled(), true, 'changed answers require acceptance again');
    await click(/I understand this is an indicative estimate/);
    await click('Send Estimate Request');
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('.reference strong').innerText(), reference);
    assert.equal(submissions.length, 1);
    rejectNext = false;
    await click('Try Sending Again');
    await page.getByRole('heading', { name: 'James has your job details' }).waitFor();
    assert.equal(submissions.length, 2);
    for (const body of submissions) {
      assert.ok(body.includes(reference));
      assert.ok(body.includes('site_photo_1'));
      assert.ok(body.includes('$680 + GST'));
    }
    await page.goBack();
    await page.getByRole('heading', { name: 'James has your job details' }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'James has your job details' }).waitFor();
    assert.equal(submissions.length, 2, 'back and refresh cannot resubmit');
    await click('Start a New Estimate');
    await step(1);
    assert.equal(await page.getByRole('button', { name: /^Trenching/ }).getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'estimator-mobile.png'), fullPage: true, animations: "disabled" });
      await page.setViewportSize({ width: 1280, height: 900 });
      await click(/More Job Types/);
      await page.locator('.more-panel img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
      await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'estimator-desktop.png'), fullPage: true, animations: "disabled" });
    }
    // Verify the repaired manual-review branch in the actual UI and payload.
    await click(/^Trenching/);
    await click('Electrical Trench');
    await click('Continue to job details');
    await click('20 m');
    await click(/^600 mm/);
    await click(/^Standard — About 300 mm/);
    await click('Continue to site details');
    await page.getByPlaceholder('Suburb *').fill('Canberra');
    await click(/^Open Access/);
    await click(/^Normal \/ Soft/);
    await click(/^No Known Services/);
    await click(/^Remove It/);
    await click('Show My Ballpark Price');
    await step(4);
    assert.match(await text(), /additional loads/);
    assert.equal(await page.locator('.estimate-range').count(), 0);
    await click('Send Job Details');
    await page.getByLabel('Full name', { exact: true }).fill('Review Test');
    await page.getByLabel('Mobile number', { exact: true }).fill('0412345678');
    await click('Flexible / Planning Ahead');
    await click('Review My Request');
    await click(/I understand no price has been given yet/);
    await click('Send Estimate Request');
    await page.getByRole('heading', { name: 'James has your job details' }).waitFor();
    assert.match(submissions[2], /Requires review/);
    assert.doesNotMatch(submissions[2], /Spoil removal cost: \$0\.00/);

    // Storage restrictions must not blank the estimator or prevent progress.
    const restricted = await context.newPage();
    await restricted.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', { get() { throw new Error('blocked'); } });
      Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('blocked'); } });
    });
    restricted.on('pageerror', error => errors.push(error.message));
    await restricted.goto(origin + '/get-a-quote/');
    await restricted.getByText('Step 1 of 6', { exact: true }).waitFor();
    await restricted.getByText(/This browser could not save the full draft/).waitFor();
    await restricted.close();
    assert.deepEqual(errors, []);
    console.log('PASS: production browser journey — navigation, reload, same-job reselection, retained photos, validation, reference, edit/re-accept, save/leave, failed submission/retry, receipt and fresh restart. No real enquiries sent.');
    await context.close();
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
