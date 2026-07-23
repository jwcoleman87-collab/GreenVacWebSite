const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function activeHtmlFiles(directory = root) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".vercel", "cold-email", "get-a-quote-src", "node_modules", "partials"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...activeHtmlFiles(fullPath));
    if (entry.isFile() && entry.name.endsWith(".html")) found.push(fullPath);
  }
  return found;
}

function estimatorTrackingHashes(relativePath) {
  const html = read(relativePath);
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((body) => body.includes("posthog.init(") || body.includes("gtag('config'"))
    .map((body) => `'sha256-${crypto.createHash("sha256").update(body).digest("base64")}'`);
}

function calculateEstimatorPrice(input) {
  const estimator = read("get-a-quote-src/src/App.jsx");
  const pricingSource = estimator.slice(
    estimator.indexOf("const RATE"),
    estimator.indexOf("function SummaryRows"),
  );
  const context = { input, result: null };
  vm.runInNewContext(`${pricingSource}\nresult = calcEstimate(input);`, context);
  return JSON.parse(JSON.stringify(context.result));
}

test("every active page with a telephone link loads one shared phone helper", () => {
  const pages = activeHtmlFiles().filter((file) => read(path.relative(root, file)).includes('href="tel:'));
  assert.ok(pages.length > 20);

  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");
    assert.equal((html.match(/\/js\/analytics\.min\.js/g) || []).length, 1, path.relative(root, file));
  }
});

test("Clarity and the existing Google tag stay single-installed on measured pages", () => {
  for (const file of activeHtmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    const relative = path.relative(root, file);
    assert.equal((html.match(/\/js\/clarity\.js/g) || []).length, 1, `Clarity ${relative}`);
    assert.equal((html.match(/googletagmanager\.com\/gtag\/js\?id=GT-WB5M7MK8/g) || []).length, 1, `Google tag ${relative}`);
  }
});

test("the audit does not introduce or duplicate GA4, GTM, Meta Pixel, Meta CAPI, or consent code", () => {
  const webAssets = [
    ...activeHtmlFiles().map((file) => fs.readFileSync(file, "utf8")),
    read("js/analytics.js"),
    read("js/main.js"),
    read("vercel.json"),
  ].join("\n");

  assert.equal(/GTM-[A-Z0-9]+/.test(webAssets), false);
  assert.equal(/\bG-[A-Z0-9]{6,}\b/.test(webAssets), false);
  assert.equal(/connect\.facebook\.net|facebook\.com\/tr|\bfbq\s*\(/i.test(webAssets), false);
  assert.equal(/meta.{0,20}(?:conversions api|capi)|(?:conversions api|capi).{0,20}meta/i.test(webAssets), false);
  assert.equal(/gtag\s*\(\s*["']consent["']|ad_storage|analytics_storage/.test(webAssets), false);
});

test("Google tag IDs and existing event names are preserved", () => {
  const main = read("js/main.js");
  const analytics = read("js/analytics.js");
  const estimator = read("get-a-quote-src/src/App.jsx");

  assert.equal((main.match(/gtag\('config', 'GT-WB5M7MK8'\)/g) || []).length, 1);
  assert.equal((main.match(/gtag\('config', 'AW-17948622134'\)/g) || []).length, 1);
  assert.match(analytics, /"phone_call_click"/);
  assert.match(analytics, /"form_submit"/);
  for (const eventName of [
    "estimator_submit_attempt",
    "estimator_submit_success",
    "estimator_submit_error",
    "estimator_started",
    "estimator_step_",
  ]) {
    assert.ok(estimator.includes(eventName), eventName);
  }
});

test("CSP permits only the exact existing estimator tracking bootstraps", () => {
  const sourceHashes = estimatorTrackingHashes("get-a-quote-src/index.html");
  const builtHashes = estimatorTrackingHashes("get-a-quote/index.html");
  const config = JSON.parse(read("vercel.json"));
  const csp = config.headers
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === "Content-Security-Policy").value;
  const scriptPolicy = csp.match(/script-src[^;]+/)[0];

  assert.equal(sourceHashes.length, 2);
  assert.deepEqual(builtHashes, sourceHashes);
  for (const hash of sourceHashes) assert.ok(scriptPolicy.includes(hash), hash);
  assert.equal(scriptPolicy.includes("'unsafe-inline'"), false);
});

test("estimator lead dispatch remains after accepted response and outside render paths", () => {
  const estimator = read("get-a-quote-src/src/App.jsx");
  const responseGuard = estimator.indexOf("if (!response.ok");
  const leadDispatch = estimator.indexOf("trackEstimatorLead");
  const successState = estimator.indexOf('setSubmitState("success")');
  const confirmationComponent = estimator.indexOf("function S7");

  assert.ok(responseGuard > 0);
  assert.ok(leadDispatch > responseGuard);
  assert.ok(successState > leadDispatch);
  assert.ok(confirmationComponent > successState);
  assert.equal(estimator.slice(confirmationComponent).includes("trackEstimatorLead"), false);
  assert.ok(estimator.indexOf("submitLockRef.current = true") < estimator.indexOf("fetch(FORM_ENDPOINT"));
  assert.ok(estimator.indexOf("submitLockRef.current = false") > estimator.indexOf("catch {"));
});

test("estimator shows the price before requesting contact details", () => {
  const estimator = read("get-a-quote-src/src/App.jsx");
  const estimateComponent = estimator.indexOf("function S4");
  const contactComponent = estimator.indexOf("function S5");

  assert.ok(estimateComponent > 0);
  assert.ok(contactComponent > estimateComponent);
  assert.ok(estimator.includes("Price shown before contact details"));
  assert.ok(estimator.includes("No name or phone number is needed to see your estimate."));
});

test("estimator keeps the first choice focused on three featured services plus more", () => {
  const estimator = read("get-a-quote-src/src/App.jsx");

  assert.ok(estimator.includes('label: "Non-Destructive Digging"'));
  assert.ok(estimator.includes('label: "Trenching"'));
  assert.ok(estimator.includes('label: "Potholing"'));
  assert.ok(estimator.includes("More Job Types"));
  assert.ok(estimator.includes('label: "Not Sure"'));
  assert.equal(estimator.includes("function S5_UNUSED"), false);
  assert.ok(estimator.includes("/fonts/montserrat-latin.woff2"));
  assert.equal(estimator.includes("fonts.googleapis.com"), false);
});

test("standard and uncertain NDD depth preserve the production price calculation", () => {
  const baseAnswers = {
    jobType: "service-exposure",
    subtype: "Dig Around Known Services",
    exposureCount: "3",
    access: "open",
    ground: "normal",
    congestion: "clear",
    spoil: "leave-onsite",
    suburb: "Canberra",
  };

  for (const exposureDepth of ["standard", "unsure"]) {
    const estimate = calculateEstimatorPrice({ ...baseAnswers, exposureDepth });
    assert.deepEqual(
      { low: estimate.low, high: estimate.high, labour: estimate.labour, travel: estimate.travel },
      { low: 820, high: 940, labour: 823, travel: 0 },
    );
  }
});
