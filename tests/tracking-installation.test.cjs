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
  const pricingSource = read("lib/estimates/pricing.mjs").replace(/export \{[^}]+\};/g, "");
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

test("opening the estimator and moving between steps sends no Google Ads conversion", () => {
  const estimator = read("get-a-quote-src/src/App.jsx");

  // Step navigation and the estimator-open signal are PostHog-only engagement.
  const navigation = estimator.slice(
    estimator.indexOf("const next = () => {"),
    estimator.indexOf("const back = () => {"),
  );
  assert.ok(navigation.includes("estimator_started"));
  assert.ok(navigation.includes("estimator_step_"));
  assert.equal(/gtag|GreenVacAnalytics|conversion|form_submit/.test(navigation), false);

  // Exactly one lead dispatch exists in the whole estimator application.
  assert.equal((estimator.match(/trackEstimatorLead/g) || []).length, 1);
});

test("the estimator submit handler refuses to dispatch before validation and acceptance", () => {
  const estimator = read("get-a-quote-src/src/App.jsx");
  const handler = estimator.indexOf("async function handleSubmit()");
  const validationGuard = estimator.indexOf("!ans.acceptedTerms) return;", handler);
  const request = estimator.indexOf("fetch(FORM_ENDPOINT", handler);
  const acceptanceGuard = estimator.indexOf("if (!response.ok", handler);
  const leadDispatch = estimator.indexOf("trackEstimatorLead", handler);

  assert.ok(handler > 0);
  assert.ok(validationGuard > handler);
  assert.ok(validationGuard < request, "validation gate precedes the request");
  assert.ok(request < acceptanceGuard, "request precedes the acceptance check");
  assert.ok(acceptanceGuard < leadDispatch, "acceptance check precedes the lead dispatch");

  // Only a non-personal generated id crosses into the shared helper.
  const dispatch = estimator.slice(leadDispatch, estimator.indexOf("}", leadDispatch) + 1);
  assert.match(dispatch, /trackEstimatorLead\(\{\s*eventId:/);
  for (const field of ["ans.name", "ans.email", "ans.mobile", "ans.suburb", "request.body"]) {
    assert.equal(dispatch.includes(field), false, field);
  }
});

test("the shipped helper carries the corrected estimator destination and no obsolete label", () => {
  const OBSOLETE_ESTIMATOR_LABEL = "2J6CxGOiNUCELb6yO5C";
  const source = read("js/analytics.js");
  const minified = read("js/analytics.min.js");

  for (const [name, contents] of [["source", source], ["minified", minified]]) {
    assert.ok(contents.includes("7zJ6CKGOiNUcELb6yO5C"), `${name} estimator label`);
    assert.ok(contents.includes("Yu01CPve8dQcELb6yO5C"), `${name} phone label preserved`);
    assert.ok(contents.includes("AW-17948622134"), `${name} Ads id preserved`);
    assert.equal(contents.includes(OBSOLETE_ESTIMATOR_LABEL), false, `${name} obsolete label`);
  }

  // The obsolete destination must not survive anywhere that ships or documents.
  const shipped = [
    ...activeHtmlFiles().map((file) => fs.readFileSync(file, "utf8")),
    source,
    minified,
    read("js/main.js"),
    read("js/main.min.js"),
    read("ANALYTICS.md"),
  ].join("\n");
  assert.equal(shipped.includes(OBSOLETE_ESTIMATOR_LABEL), false);

  // Conversion labels stay in the shared helper, never inlined into UI bundles.
  const bundle = fs
    .readdirSync(path.join(root, "get-a-quote", "assets"))
    .filter((entry) => entry.endsWith(".js"))
    .map((entry) => fs.readFileSync(path.join(root, "get-a-quote", "assets", entry), "utf8"))
    .join("\n");
  assert.ok(bundle.length > 0);
  assert.equal(/AW-\d+\//.test(bundle), false, "no raw Ads destination inside the estimator bundle");
  assert.equal(bundle.includes("7zJ6CKGOiNUcELb6yO5C"), false);
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
  const estimator = read("get-a-quote-src/src/App.jsx") + read("lib/estimates/catalog.mjs");

  assert.ok(estimator.includes('label: "Non-Destructive Digging"'));
  assert.ok(estimator.includes('label: "Trenching"'));
  assert.ok(estimator.includes('label: "Potholing"'));
  assert.ok(estimator.includes("More Job Types"));
  assert.ok(estimator.includes('label: "Not Sure"'));
  assert.equal(estimator.includes("function S5_UNUSED"), false);
  assert.ok(estimator.includes("/fonts/montserrat-latin.woff2"));
  assert.equal(estimator.includes("fonts.googleapis.com"), false);
});

test("uncertain NDD depth is conservatively priced and remains a review", () => {
  const baseAnswers = {
    jobType: "service-exposure",
    subtype: "Dig Around Known Services",
    exposureCount: 4,
    access: "open",
    ground: "normal",
    congestion: "clear",
    spoil: "leave",
    suburb: "Canberra",
  };

  const deep = calculateEstimatorPrice({ ...baseAnswers, exposureDepth: "deep" });
  const unsure = calculateEstimatorPrice({ ...baseAnswers, exposureDepth: "unsure" });

  assert.deepEqual(
    { low: deep.low, high: deep.high, labour: deep.labour, travel: deep.travel, needsReview: deep.needsReview },
    { low: 920, high: 1040, labour: 800, travel: 110, needsReview: false },
  );
  assert.deepEqual(
    { low: unsure.low, high: unsure.high, labour: unsure.labour, travel: unsure.travel, needsReview: unsure.needsReview },
    { low: 920, high: 1040, labour: 800, travel: 110, needsReview: true },
  );
});
