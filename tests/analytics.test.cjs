const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const analyticsSource = fs.readFileSync(
  path.join(__dirname, "..", "js", "analytics.js"),
  "utf8",
);

function createHarness({
  hostname = "www.greenvac.com.au",
  pathname = "/",
  config = {},
  gtag = "stub",
} = {}) {
  const listeners = {};
  const gtagCalls = [];
  const posthogCalls = [];
  const storage = new Map();
  const window = {
    GreenVacAnalyticsConfig: config,
    crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    location: { hostname, pathname },
    posthog: { capture: (...args) => posthogCalls.push(args) },
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
  };

  // "stub" records calls, "missing" models a blocked or not-yet-loaded Google
  // tag, and "throwing" models a tag that is present but fails internally.
  if (gtag === "stub") {
    window.gtag = (...args) => gtagCalls.push(args);
  } else if (gtag === "throwing") {
    window.gtag = () => {
      throw new Error("gtag unavailable");
    };
  }
  const document = {
    addEventListener: (name, handler) => {
      listeners[name] = listeners[name] || [];
      listeners[name].push(handler);
    },
  };

  const context = vm.createContext({ Date, Math, Object, String, document, window });
  vm.runInContext(analyticsSource, context);

  return { context, document, gtagCalls, listeners, posthogCalls, storage, window };
}

function phoneLink({ placement = "hero", selector = ".hero" } = {}) {
  return {
    closest: (value) => value.includes(selector) ? {} : null,
    getAttribute: (name) => name === "data-phone-placement" ? placement : null,
  };
}

test("a production phone activation preserves existing events and sends one configured Ads conversion", () => {
  const harness = createHarness();
  const link = phoneLink();
  const target = { closest: (selector) => selector === 'a[href^="tel:"]' ? link : null };

  assert.equal(harness.listeners.click.length, 1);
  let prevented = false;
  harness.listeners.click[0]({ target, preventDefault: () => { prevented = true; } });

  assert.equal(prevented, false);
  assert.deepEqual(harness.gtagCalls.map((call) => call[1]), ["phone_call_click", "conversion"]);
  assert.equal(harness.gtagCalls[1][2].send_to, "AW-17948622134/Yu01CPve8dQcELb6yO5C");
  assert.equal(harness.gtagCalls[1][2].transaction_id, "phone-00000000-0000-4000-8000-000000000001");
  assert.equal(JSON.stringify(harness.posthogCalls), JSON.stringify([
    ["phone_call_click", { label: "Phone Call", placement: "hero" }],
  ]));
});

test("loading an ordinary page or estimator page does not create a lead", () => {
  const homepage = createHarness();
  const estimator = createHarness({ pathname: "/get-a-quote" });

  assert.deepEqual(homepage.gtagCalls, []);
  assert.deepEqual(homepage.posthogCalls, []);
  assert.deepEqual(estimator.gtagCalls, []);
  assert.deepEqual(estimator.posthogCalls, []);
});

test("missing Ads labels never produce a malformed conversion destination", () => {
  const harness = createHarness({
    config: { phoneConversionLabel: "", estimatorConversionLabel: "" },
  });

  assert.equal(harness.window.GreenVacAnalytics.trackPhoneLead(phoneLink()), true);
  assert.deepEqual(harness.gtagCalls.map((call) => call[1]), ["phone_call_click"]);

  assert.equal(harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" }), true);
  assert.deepEqual(harness.gtagCalls.map((call) => call[1]), ["phone_call_click", "form_submit"]);
  assert.equal(harness.gtagCalls.some((call) => call[1] === "conversion"), false);
});

test("preview and local hosts do not send lead analytics or Ads conversions", () => {
  const harness = createHarness({
    hostname: "fix-google-ads-lead-tracking.vercel.app",
    config: {
      phoneConversionLabel: "phone_label",
      estimatorConversionLabel: "estimator_label",
    },
  });

  assert.equal(harness.window.GreenVacAnalytics.trackPhoneLead(phoneLink()), false);
  assert.equal(harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" }), false);
  assert.deepEqual(harness.gtagCalls, []);
  assert.deepEqual(harness.posthogCalls, []);
  assert.equal(harness.storage.size, 0);
});

test("an accepted estimator event is idempotent across rerenders and page calls", () => {
  const harness = createHarness();

  assert.equal(harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" }), true);
  assert.equal(harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" }), false);
  assert.deepEqual(harness.gtagCalls.map((call) => call[1]), ["form_submit", "conversion"]);
  assert.equal(harness.gtagCalls[1][2].send_to, "AW-17948622134/7zJ6CKGOiNUcELb6yO5C");
  assert.equal(harness.gtagCalls[1][2].transaction_id, "submission-1");
});

test("the accepted estimator conversion uses the exact GreenVac - Estimator completed destination, value and currency", () => {
  const harness = createHarness();

  assert.equal(harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" }), true);

  const conversions = harness.gtagCalls.filter((call) => call[1] === "conversion");
  assert.equal(conversions.length, 1);

  const payload = conversions[0][2];
  assert.equal(payload.send_to, "AW-17948622134/7zJ6CKGOiNUcELb6yO5C");
  assert.equal(payload.value, 1);
  assert.equal(typeof payload.value, "number");
  assert.equal(payload.currency, "AUD");
  assert.equal(payload.transaction_id, "submission-1");
  assert.deepEqual(Object.keys(payload).sort(), ["currency", "send_to", "transaction_id", "value"]);
  assert.equal(harness.window.GreenVacAnalyticsConfig.estimatorConversionLabel, "7zJ6CKGOiNUcELb6yO5C");
});

test("the obsolete estimator conversion label is no longer reachable", () => {
  const harness = createHarness();

  harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" });
  harness.window.GreenVacAnalytics.trackPhoneLead(phoneLink());

  assert.equal(JSON.stringify(harness.gtagCalls).includes("2J6CxGOiNUCELb6yO5C"), false);
});

test("the phone conversion payload is unchanged and carries no value or currency", () => {
  const harness = createHarness();

  assert.equal(harness.window.GreenVacAnalytics.trackPhoneLead(phoneLink()), true);

  const conversions = harness.gtagCalls.filter((call) => call[1] === "conversion");
  assert.equal(conversions.length, 1);

  const payload = conversions[0][2];
  assert.equal(payload.send_to, "AW-17948622134/Yu01CPve8dQcELb6yO5C");
  assert.deepEqual(Object.keys(payload).sort(), ["send_to", "transaction_id"]);
  assert.equal("value" in payload, false);
  assert.equal("currency" in payload, false);
});

test("a blocked or not-yet-loaded Google tag never throws and never blocks the success screen", () => {
  const harness = createHarness({ gtag: "missing" });

  assert.equal(typeof harness.window.gtag, "undefined");
  assert.equal(harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" }), true);
  assert.equal(harness.window.GreenVacAnalytics.trackPhoneLead(phoneLink()), true);
  assert.equal(harness.gtagCalls.length, 0);
});

test("a Google tag that throws internally is swallowed so an accepted enquiry still succeeds", () => {
  const harness = createHarness({ gtag: "throwing" });

  assert.doesNotThrow(() => {
    harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" });
  });
  assert.doesNotThrow(() => {
    harness.window.GreenVacAnalytics.trackPhoneLead(phoneLink());
  });
});

test("localhost sends no estimator conversion", () => {
  for (const hostname of ["localhost", "127.0.0.1", "greenvac-services-abc123.vercel.app"]) {
    const harness = createHarness({ hostname });

    assert.equal(harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" }), false);
    assert.equal(harness.gtagCalls.length, 0, hostname);
    assert.equal(harness.storage.size, 0, hostname);
  }
});

test("a malformed configured value or currency is omitted rather than guessed", () => {
  const harness = createHarness({
    config: { estimatorConversionValue: Number.NaN, estimatorConversionCurrency: "dollars" },
  });

  harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" });
  const payload = harness.gtagCalls.filter((call) => call[1] === "conversion")[0][2];

  assert.equal("value" in payload, false);
  assert.equal("currency" in payload, false);
  assert.equal(payload.send_to, "AW-17948622134/7zJ6CKGOiNUcELb6yO5C");
});

test("reloading the helper does not add a duplicate global phone listener", () => {
  const harness = createHarness();

  vm.runInContext(analyticsSource, harness.context);
  assert.equal(harness.listeners.click.length, 1);
});

test("lead payloads contain no estimator answers or visitor PII", () => {
  // Uses the real shipped configuration so the assertion covers the exact
  // production payload, including the value and currency fields.
  const harness = createHarness();

  harness.window.GreenVacAnalytics.trackEstimatorLead({ eventId: "submission-1" });
  const payloadText = JSON.stringify(harness.gtagCalls);
  for (const forbidden of [
    "name",
    "email",
    "mobile",
    "phone",
    "address",
    "suburb",
    "postcode",
    "message",
    "job_type",
    "subtype",
    "access_notes",
    "notes",
  ]) {
    assert.equal(payloadText.includes(forbidden), false, forbidden);
  }
});
