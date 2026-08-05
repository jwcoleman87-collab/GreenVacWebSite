/* Estimator experience regression gate.
 *
 * tests/tracking-installation.test.cjs owns the Google Ads and lead-dispatch
 * contract. This file owns the redesigned experience: single selection, the
 * "More Job Types" disclosure, the leave-the-estimator dialog, the diagnostic
 * cancellation analytics, and proof that none of it moved a price.
 *
 * The selection and step rules are imported and executed for real from
 * get-a-quote-src/src/estimator-state.js -- that module is deliberately
 * JSX-free so it can be exercised here without a DOM or a build step.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const url = require("node:url");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const estimator = read("get-a-quote-src/src/App.jsx");
const stateSource = read("get-a-quote-src/src/estimator-state.js");

function loadState() {
  return import(
    url.pathToFileURL(path.join(root, "get-a-quote-src/src/estimator-state.js")).href
  );
}

// Same slice the tracking suite uses, so both files agree on where pricing lives.
function calculateEstimatorPrice(input) {
  const pricingSource = estimator.slice(
    estimator.indexOf("const RATE"),
    estimator.indexOf("function SummaryRows"),
  );
  const context = { input, result: null };
  vm.runInNewContext(`${pricingSource}\nresult = calcEstimate(input);`, context);
  return JSON.parse(JSON.stringify(context.result));
}

function evaluatePricing(expression) {
  const pricingSource = estimator.slice(
    estimator.indexOf("const RATE"),
    estimator.indexOf("function SummaryRows"),
  );
  const context = { out: null };
  vm.runInNewContext(`${pricingSource}\nout = ${expression};`, context);
  return JSON.parse(JSON.stringify(context.out));
}

// Read the shipped data back out of App.jsx so the tests see exactly what the
// customer gets, not a copy that can drift. A top-level `const` inside a vm
// script is a lexical binding rather than a property of the context, so each
// block has to hand its value out explicitly.
function evaluate(startMarker, endMarker, expression) {
  const start = estimator.indexOf(startMarker);
  assert.ok(start > 0, startMarker);
  const block = estimator.slice(start, estimator.indexOf(endMarker, start));
  const context = { out: null };
  vm.runInNewContext(`${block}\nout = ${expression};`, context);
  return context.out;
}

function shippedJobTypes() {
  return evaluate("const jobTypes = [", "const subtypes = {", "jobTypes");
}

function shippedCards() {
  return evaluate(
    "const depthCards = [",
    "const featuredJobs =",
    `({ depthCards, widthCards, accessCards, groundCards, congestionCards, spoilCards,
        urgencyCards, exposureCountCards, exposureDepthCards, leakAreaCards, pitSizeCards,
        pitFillCards, cattleCountCards, cattleFillCards, obstacleDistanceCards })`,
  );
}

/* --- single selection ---------------------------------------------------- */

test("choosing a job replaces the previous one, so two can never be selected", async () => {
  const { selectJobType } = await loadState();

  const first = selectJobType({ metres: 5, preferredTime: "flexible" }, "trenching");
  assert.equal(first.jobType, "trenching");

  const second = selectJobType(first, "potholing");
  assert.equal(second.jobType, "potholing");
  assert.equal(Object.values(second).filter((value) => value === "trenching").length, 0);
});

test("choosing an expanded job deselects the primary job, and the reverse", async () => {
  const { selectJobType, featuredJobs, visibleExtraJobs } = await loadState();
  const jobTypes = shippedJobTypes();
  const primary = featuredJobs(jobTypes)[0];
  const extra = visibleExtraJobs(jobTypes)[0];

  const afterPrimary = selectJobType({}, primary.id);
  const afterExtra = selectJobType(afterPrimary, extra.id);
  assert.equal(afterExtra.jobType, extra.id);
  assert.notEqual(afterExtra.jobType, primary.id);

  const backToPrimary = selectJobType(afterExtra, primary.id);
  assert.equal(backToPrimary.jobType, primary.id);
  assert.notEqual(backToPrimary.jobType, extra.id);
});

test("switching jobs clears the previous job's measurements out of the price", async () => {
  const { selectJobType } = await loadState();
  const trenching = {
    jobType: "trenching",
    subtype: "Electrical Trench",
    metres: 50,
    depth: "800mm",
    width: "standard",
  };

  const switched = selectJobType(trenching, "potholing");
  assert.equal(switched.subtype, null);
  for (const stale of ["depth", "width"]) {
    assert.equal(stale in switched, false, stale);
  }
  // Length is the one deliberate carry-over: it is the shared stepper value.
  assert.equal(switched.metres, 50);
});

test("expanding More Job Types selects nothing on its own", () => {
  // The disclosure is a real toggle with aria-expanded and never takes the
  // selected class, which is what made it look like a fourth job type.
  const control = estimator.slice(
    estimator.indexOf('className="more-bar"'),
    estimator.indexOf("</button>", estimator.indexOf('className="more-bar"')),
  );
  assert.ok(control.includes("aria-expanded={showMore}"));
  assert.ok(control.includes('aria-controls="more-jobs"'));
  assert.ok(control.includes("setShowMore((current) => !current)"));
  assert.equal(/selected/.test(control), false, "the disclosure never renders as selected");
  assert.equal(control.includes("chooseJob"), false, "the disclosure never picks a job");
});

test("a job chosen inside the expanded list stays visible once it closes", () => {
  assert.ok(estimator.includes("selectedExtraJob(jobTypes, ans)"));
  assert.ok(estimator.includes("Selected: {chosenExtra.label}"));
});

/* --- the retired cattle grid --------------------------------------------- */

test("cattle grid is gone from the customer-facing list and cannot calculate", async () => {
  const { visibleExtraJobs, featuredJobs } = await loadState();
  const jobTypes = shippedJobTypes();
  const shown = [...featuredJobs(jobTypes), ...visibleExtraJobs(jobTypes)].map((job) => job.id);

  assert.equal(shown.includes("cattle-grid"), false, "not offered to customers");
  assert.ok(shown.includes("other"), "replaced by a manual-review path");
  assert.ok(jobTypes.some((job) => job.id === "cattle-grid" && job.hidden));

  // Backward compatibility: restored answers reach a friendly manual-review
  // result, never the retired premium-rate pricing branch.
  assert.ok(estimator.includes('jobType === "cattle-grid"'));
  assert.equal(estimator.includes("cattleHours"), false);
  assert.equal(estimator.includes("RATE_COMP"), false);
});

/* --- cancellation -------------------------------------------------------- */

test("cancellation reports three distinct actions with a step identifier", async () => {
  const { CANCEL_EVENTS, cancelEventName, cancelPayload, STEP_IDS } = await loadState();

  assert.deepEqual(Object.keys(CANCEL_EVENTS).sort(), ["clicked", "confirmed", "dismissed"]);
  assert.equal(cancelEventName("clicked"), "estimator_cancel_clicked");
  assert.equal(cancelEventName("confirmed"), "estimator_cancel_confirmed");
  assert.equal(cancelEventName("dismissed"), "estimator_cancel_dismissed");
  assert.equal(new Set(Object.values(CANCEL_EVENTS)).size, 3, "three distinct names");

  assert.equal(STEP_IDS.length, 7);
  for (let screen = 1; screen <= 7; screen += 1) {
    assert.deepEqual(cancelPayload(screen), { step: screen, step_id: STEP_IDS[screen - 1] });
  }
});

test("a cancellation payload carries no personal information", async () => {
  const { cancelPayload, STEP_IDS } = await loadState();

  for (let screen = 1; screen <= 7; screen += 1) {
    const payload = cancelPayload(screen);

    // The whole payload is two fields. Anything else would be a leak, so this
    // asserts the exact shape rather than hunting for forbidden substrings.
    assert.deepEqual(Object.keys(payload).sort(), ["step", "step_id"], `step ${screen}`);
    assert.equal(typeof payload.step, "number");
    assert.ok(STEP_IDS.includes(payload.step_id), payload.step_id);
  }

  // And the payload builder cannot even see an answer: it takes only a number.
  assert.equal(cancelPayload.length, 1);
  const withAnswers = cancelPayload(3, { name: "Jo", mobile: "0400000000", suburb: "Kambah" });
  assert.deepEqual(Object.keys(withAnswers).sort(), ["step", "step_id"]);
});

test("no cancellation can reach Google Ads", () => {
  // The dispatcher is PostHog-only by construction.
  const start = estimator.indexOf("const captureCancel");
  const dispatcher = estimator.slice(start, estimator.indexOf("};", start) + 2);
  assert.ok(start > 0);
  assert.ok(dispatcher.includes("window.posthog.capture"));
  assert.equal(
    /gtag|GreenVacAnalytics|conversion|form_submit|trackEstimatorLead/.test(dispatcher),
    false,
    "the cancel dispatcher never touches the lead helper",
  );

  // The cancel handlers themselves only call the dispatcher.
  const handlers = estimator.slice(
    estimator.indexOf("const cancel = {"),
    estimator.indexOf("const shared = {"),
  );
  assert.ok(handlers.includes('captureCancel("clicked")'));
  assert.ok(handlers.includes('captureCancel("dismissed")'));
  assert.ok(handlers.includes('captureCancel("confirmed")'));
  assert.equal(/gtag|GreenVacAnalytics|conversion|form_submit/.test(handlers), false);

  // And the shared lead helper knows nothing about cancellation at all.
  const analytics = read("js/analytics.js");
  assert.equal(/cancel/i.test(analytics), false, "no cancel path exists in the Ads helper");

  // The completion conversion is still dispatched from exactly one place.
  assert.equal((estimator.match(/trackEstimatorLead/g) || []).length, 1);
});

test("the leave dialog is operable by keyboard and screen reader", () => {
  const dialog = estimator.slice(
    estimator.indexOf("function CancelDialog"),
    estimator.indexOf("function Shell"),
  );

  assert.ok(dialog.includes('role="dialog"'));
  assert.ok(dialog.includes('aria-modal="true"'));
  assert.ok(dialog.includes('aria-labelledby="cancel-title"'));
  assert.ok(dialog.includes('aria-describedby="cancel-desc"'));
  assert.ok(dialog.includes("Leave the estimator?"));
  assert.ok(dialog.includes("won’t be saved"));
  assert.ok(dialog.includes("Keep going"));
  assert.ok(dialog.includes("Leave estimator"));

  // Escape dismisses, Tab is trapped, the page behind cannot scroll, and focus
  // goes back to the control that opened it.
  assert.ok(dialog.includes('event.key === "Escape"'));
  assert.ok(dialog.includes('event.key !== "Tab"'));
  assert.ok(dialog.includes('document.body.style.overflow = "hidden"'));
  assert.ok(dialog.includes("opener?.focus()"));
  assert.ok(dialog.includes("stayRef.current?.focus()"));
});

test("every stage before the confirmation offers a way out", () => {
  // Stages 1-6 pass the cancel control through; stage 7 deliberately does not,
  // because the enquiry has already been sent and cannot be taken back.
  for (const screen of ["S1", "S2", "S3", "S5", "S6"]) {
    const component = estimator.slice(estimator.indexOf(`function ${screen}(`));
    assert.ok(component.slice(0, 4000).includes("cancel"), screen);
  }
  assert.ok(estimator.includes("<S4 ans={ans} onNext={next} onBack={back} cancel={cancel} />"));

  const confirmation = estimator.slice(estimator.indexOf("function S7"), estimator.indexOf("export default"));
  assert.equal(confirmation.includes("cancel"), false, "no cancel control after sending");
  assert.ok(estimator.includes("Back to the website"));
});

/* --- results page -------------------------------------------------------- */

test("the primary action never floats over estimator content", () => {
  const stylesheet = estimator.slice(estimator.indexOf("const S = `"), estimator.indexOf("const DEV_STYLES"));

  // Nothing fixed. A fixed bar sat on top of photographs, descriptions and
  // selectable cards on every step.
  const footerRule = stylesheet.match(/\.footer-wrap\{[^}]*\}/)[0];
  assert.equal(/position:\s*fixed/.test(footerRule), false, footerRule);

  // No reserved dead space under the content either -- the action is in flow.
  const contentRule = stylesheet.match(/\.content\{[^}]*\}/)[0];
  assert.equal(/190px/.test(contentRule), false, contentRule);

  // Sticky is mobile-only and gated on the action being usable.
  const stickyRule = stylesheet.match(/\.footer-wrap\.is-sticky\{[^}]*\}/);
  assert.ok(stickyRule, "a sticky rule exists");
  assert.match(stickyRule[0], /position:\s*sticky/);
  const mobileBlock = stylesheet.slice(stylesheet.indexOf("@media (max-width:640px)"));
  assert.ok(mobileBlock.includes(".footer-wrap.is-sticky"), "sticky lives inside the mobile query");

  // The class is only applied when the action is ready, so a disabled action
  // never floats across the questions it is asking about.
  assert.ok(estimator.includes('`footer-wrap${actionReady ? " is-sticky" : ""}`'));

  // Every answerable step passes its own readiness through.
  for (const marker of ["step={1}", "step={2}", "step={3}", "step={5}"]) {
    const at = estimator.indexOf(marker);
    assert.ok(estimator.slice(at, at + 240).includes("actionReady={ready}"), marker);
  }
  const six = estimator.indexOf("step={6}");
  assert.ok(estimator.slice(six, six + 260).includes("actionReady={Boolean(ans.acceptedTerms)"));
});

test("the conditional description question comes before the action", () => {
  const step = estimator.slice(estimator.indexOf("function S1("), estimator.indexOf("function S2("));
  // The action is a Shell prop rendered after {children}, and the subtype panel
  // is the last child, so the question always precedes the Continue control.
  assert.ok(step.indexOf("Which description is closest?") > step.indexOf("footer={"));
  const shell = estimator.slice(estimator.indexOf("function Shell("), estimator.indexOf("function Heading("));
  assert.ok(shell.indexOf("{children}") < shell.indexOf("footer-wrap"), "content renders before the action");
});

test("More Job Types choices sit directly under the disclosure", () => {
  const step = estimator.slice(estimator.indexOf("function S1("), estimator.indexOf("function S2("));
  assert.ok(step.indexOf('className="more-bar"') < step.indexOf('id="more-jobs"'));
  assert.ok(step.includes('className="more-panel'), "joined panel, not a detached card");
  // The bar already says "More Job Types"; the panel must not repeat it.
  const panel = step.slice(step.indexOf('id="more-jobs"'), step.indexOf("</section>", step.indexOf('id="more-jobs"')));
  assert.equal(/<h2/.test(panel), false, "no repeated heading");
});

test("uncertainty options all read Not Sure", () => {
  const cards = shippedCards();
  for (const [group, list] of Object.entries(cards)) {
    for (const card of list) {
      if (card.id !== "unsure" && card.id !== "custom") continue;
      assert.equal(card.label, "Not Sure", `${group}.${card.id} label`);
    }
  }
  assert.equal(estimator.includes("Not Sure Yet"), false, "no leftover variant wording");
});

test("the outstanding photograph request is recorded", () => {
  const note = read("PHOTOS-NEEDED.md");
  assert.match(note, /pit or drain/i);
  assert.match(note, /bore under a driveway/i);
  // The fallback is still wired up, so the note has to stay true.
  assert.ok(estimator.includes('art: "pit"'), "pit diagram is still the fallback");
});

test("the estimate page leads with the price and the agreed copy", () => {
  const results = estimator.slice(estimator.indexOf("function S4"), estimator.indexOf("function S5"));

  assert.ok(results.includes("YOUR NO-OBLIGATION ESTIMATE"));
  assert.ok(results.includes("Thanks — here’s your ballpark estimate"));
  assert.ok(results.includes("There’s no obligation and no sales follow-up"));
  assert.ok(results.includes("Ask James to Review My Estimate"));
  assert.ok(results.includes("mark"), "restrained completion tick");
  assert.ok(results.includes("Price shown before contact details"));

  // The price card comes before the summary, and the tall hero photograph that
  // used to push the number below the fold on a phone is gone.
  assert.ok(results.indexOf("estimate-range") < results.indexOf("Estimate based on"));
  assert.equal(results.includes("estimate-hero"), false);
});

/* --- imagery ------------------------------------------------------------- */

test("every estimator image reserves its slot and loads deliberately", () => {
  const tags = estimator.match(/<img[\s\S]*?\/>/g) || [];
  assert.ok(tags.length >= 2);
  for (const tag of tags) {
    assert.match(tag, /width=/, tag.slice(0, 60));
    assert.match(tag, /height=/, tag.slice(0, 60));
  }

  // Photos below the first choices stay lazy; the ones the customer has to
  // recognise immediately are explicitly eager.
  assert.ok(estimator.includes('loading={priority || eager ? "eager" : "lazy"}'));
  assert.ok(estimator.includes('decoding="async"'));
  assert.ok(estimator.includes("sizes={sizes}"));
  assert.ok(estimator.includes("srcSet={desktop.srcSet}"));
});

test("the generated image manifest matches the files on disk", () => {
  const manifest = read("get-a-quote-src/src/estimator-images.js");
  const context = { ESTIMATOR_IMAGES: null };
  vm.runInNewContext(manifest.replace("export const", "var"), context);
  const entries = Object.values(context.ESTIMATOR_IMAGES);

  assert.ok(entries.length > 0);
  for (const entry of entries) {
    for (const variant of entry.variants) {
      const file = path.join(root, "images", `est-${entry.stem}-${entry.shape}-${variant.width}.webp`);
      assert.ok(fs.existsSync(file), path.basename(file));
    }
  }
});

test("access options show the site, not a close-up of a trench", () => {
  const { accessCards } = shippedCards();
  const byId = Object.fromEntries(accessCards.map((card) => [card.id, card]));
  assert.equal(byId.open.photo, "port-03", "an open yard with nothing in the way");
  assert.equal(byId.side.photo, "rig-access", "a hose threaded past a roller door");
  assert.equal(byId.difficult.photo, "ndd-tight-access", "an enclosed corridor");

  // Every access option shows a different site. Reusing one photo across two
  // options, or showing the rig boxed in beside a wall as "Open", is how a
  // customer ends up choosing the wrong answer.
  const photos = [byId.open.photo, byId.side.photo, byId.difficult.photo];
  assert.equal(new Set(photos).size, 3, "three distinct sites");
  assert.equal(photos.includes("tight-access"), false, "the misleading Open Access shot is gone");

  // "Not sure" always gets the one quiet treatment, never a worksite photo.
  assert.equal(byId.unsure.photo, undefined);
  assert.equal(byId.unsure.art, "unsure");
  assert.equal(byId.unsure.quiet, true);

  // The old mismatch must not come back: that photo is a trench on a lawn and
  // says nothing about how a rig gets to it.
  assert.equal(
    accessCards.some((card) => card.photo === "service-trenching-tight-access-card"),
    false,
  );
});

test("every Not sure option uses the same quiet treatment", () => {
  const cards = shippedCards();
  let checked = 0;

  for (const [group, list] of Object.entries(cards)) {
    if (group === "urgencyCards") continue; // timing has no honest visual
    for (const card of list) {
      if (card.id !== "unsure" && card.id !== "custom") continue;
      checked += 1;
      assert.equal(card.art, "unsure", `${group}.${card.id} art`);
      assert.equal(card.quiet, true, `${group}.${card.id} quiet`);
      assert.equal(card.photo, undefined, `${group}.${card.id} must not use a worksite photo`);
    }
  }

  assert.ok(checked >= 12, `expected the quiet treatment on many options, saw ${checked}`);
});

/* --- approved pricing revision ------------------------------------------- */

const SITE = { access: "open", ground: "normal", congestion: "clear", spoil: "leave", suburb: "Canberra" };
const ROUGH = { access: "difficult", ground: "hard", congestion: "congested", spoil: "remove-all", suburb: "Goulburn" };

function calculatedShape(estimate) {
  return {
    low: estimate.low,
    high: estimate.high,
    labour: estimate.labour,
    travel: estimate.travel,
    needsReview: estimate.needsReview,
    manualOnly: estimate.manualOnly,
  };
}

// Independently derived from the retained production hours and modifiers, the
// approved $165 onsite rate, three-hour onsite minimum, fixed $110 travel,
// onsite-only 15% buffer and upward $10 rounding.
const REGRESSION_SCENARIOS = [
  ["any floor-priced job", { ...SITE, jobType: "leak-exposure", subtype: "Water Leak", leakArea: "localised" }, { low: 610, high: 680, labour: 495, travel: 110, needsReview: false, manualOnly: false }],
  ["5 m irrigation, 300 mm, easiest", { ...SITE, jobType: "trenching", subtype: "Irrigation Trench", metres: 5, depth: "300mm", width: "narrow" }, { low: 610, high: 680, labour: 314, travel: 110, needsReview: false, manualOnly: false }],
  ["20 m electrical, 600 mm, standard", { ...SITE, jobType: "trenching", subtype: "Electrical Trench", metres: 20, depth: "600mm", width: "standard" }, { low: 820, high: 930, labour: 705, travel: 110, needsReview: false, manualOnly: false }],
  ["same trench, narrow access, hard ground, services", { ...SITE, access: "side", ground: "hard", congestion: "congested", jobType: "trenching", subtype: "Electrical Trench", metres: 20, depth: "600mm", width: "standard" }, { low: 1230, high: 1390, labour: 1110, travel: 110, needsReview: false, manualOnly: false }],
  ["three shallow potholes", { ...SITE, jobType: "potholing", subtype: "Water Service", exposureCount: 3, exposureDepth: "shallow" }, { low: 670, high: 760, labour: 559, travel: 110, needsReview: false, manualOnly: false }],
  ["three deep potholes", { ...SITE, jobType: "potholing", subtype: "Water Service", exposureCount: 3, exposureDepth: "deep" }, { low: 770, high: 860, labour: 652, travel: 110, needsReview: false, manualOnly: false }],
  ["four deep potholes", { ...SITE, jobType: "potholing", subtype: "Water Service", exposureCount: 4, exposureDepth: "deep" }, { low: 920, high: 1040, labour: 800, travel: 110, needsReview: false, manualOnly: false }],
  ["known leak location", { ...SITE, jobType: "leak-exposure", subtype: "Water Leak", leakArea: "localised" }, { low: 610, high: 680, labour: 495, travel: 110, needsReview: false, manualOnly: false }],
  ["large heavily filled pit", { ...SITE, jobType: "pit-cleanout", subtype: "Drainage Pit", pitSize: "large", pitFill: "heavy" }, { low: 730, high: 830, labour: 619, travel: 110, needsReview: false, manualOnly: false }],
  ["under obstacle less than 5 m", { ...SITE, jobType: "tunnel-bore", subtype: "Under a Path", boreDist: "short" }, { low: 770, high: 870, labour: 660, travel: 110, needsReview: false, manualOnly: false }],
  ["60 m electrical, 600 mm, standard", { ...SITE, jobType: "trenching", subtype: "Electrical Trench", metres: 60, depth: "600mm", width: "standard" }, { low: 1730, high: 1980, labour: 1620, travel: 110, needsReview: false, manualOnly: false }],
];

test("all approved commercial regression scenarios calculate independently", () => {
  for (const [label, answers, expected] of REGRESSION_SCENARIOS) {
    assert.deepEqual(calculatedShape(calculateEstimatorPrice(answers)), expected, label);
  }
});

test("the only minimum is three onsite hours at $165, with fixed $110 travel", () => {
  const pricing = estimator.slice(estimator.indexOf("const RATE"), estimator.indexOf("function SummaryRows"));

  assert.match(pricing, /const RATE = 165;/);
  assert.match(pricing, /const MINIMUM_ONSITE_HOURS = 3;/);
  assert.match(pricing, /const MINIMUM_ONSITE_LABOUR = RATE \* MINIMUM_ONSITE_HOURS;/);
  assert.match(pricing, /const FIXED_TRAVEL_CHARGE = 110;/);
  assert.match(pricing, /const RANGE_BUFFER = 0\.15;/);
  assert.match(pricing, /Math\.ceil\(value \/ 10\) \* 10/);
  for (const obsolete of ["RATE_COMP", "FLOOR_INT", "FLOOR_DISP", "MINIMUM_HOURS = 4", "MINIMUM_PRICE", "const RATE = 235", "cattleHours"]) {
    assert.equal(pricing.includes(obsolete), false, obsolete);
  }

  // $704.88 onsite plus $110 becomes $814.88 and rounds to $820. The upper
  // onsite amount is $810.612; adding the same $110 gives $920.612 -> $930.
  const upward = calculateEstimatorPrice(REGRESSION_SCENARIOS[2][1]);
  assert.equal(upward.low, 820);
  assert.equal(upward.high, 930);
  assert.equal(upward.travel, 110);
});

test("the 15% buffer applies to onsite work only, never the fixed travel", () => {
  const pricing = estimator.slice(estimator.indexOf("const RATE"), estimator.indexOf("function SummaryRows"));
  const minimum = calculateEstimatorPrice(REGRESSION_SCENARIOS[0][1]);

  assert.match(pricing, /const onsiteHigh = onsiteLow \* \(1 \+ RANGE_BUFFER\);/);
  assert.match(pricing, /roundUpToTen\(onsiteLow \+ FIXED_TRAVEL_CHARGE \+ spoilRemoval\.cost\)/);
  assert.match(pricing, /roundUpToTen\(onsiteHigh \+ FIXED_TRAVEL_CHARGE \+ spoilRemoval\.cost\)/);
  assert.equal(pricing.includes("low * (1 + RANGE_BUFFER)"), false);
  assert.equal(minimum.low, 610, "$495 onsite + $110 travel = $605 -> $610");
  assert.equal(minimum.high, 680, "$495 x 1.15 + $110 = $679.25 -> $680");
});

test("spoil removal has one $85 per cubic metre rate and separate physical dimensions", () => {
  const pricing = estimator.slice(estimator.indexOf("const RATE"), estimator.indexOf("function SummaryRows"));
  const volumes = evaluatePricing("spoilVolumeCards");

  assert.match(pricing, /const SPOIL_REMOVAL_RATE = 85;/);
  assert.equal((pricing.match(/const SPOIL_REMOVAL_RATE\s*=/g) || []).length, 1);
  assert.deepEqual(
    volumes.map(({ id, cubicMetres }) => [id, cubicMetres ?? null]),
    [
      ["small", 0.25],
      ["medium", 0.5],
      ["large", 0.75],
      ["full-load", 1],
      ["more-than-1", null],
      ["unsure", null],
    ],
  );
  assert.match(pricing, /const TRENCH_WIDTH_METRES = \{ narrow: 0\.15, standard: 0\.30, custom: 0\.30 \};/);
  assert.match(pricing, /const widthMod = \{ narrow: 1\.00, standard: 1\.05, wide: 1\.15, custom: 1\.20 \};/);
  assert.ok(estimator.includes('label: "Standard — About 300 mm"'));
});

test("the spoil-volume selector appears only for non-trench removal", () => {
  const siteStep = estimator.slice(estimator.indexOf("function S3"), estimator.indexOf("function S4"));

  assert.ok(siteStep.includes('ans.jobType !== "trenching" && ans.spoil === "remove-all"'));
  assert.ok(siteStep.includes('id="q-spoil-volume"'));
  assert.ok(siteStep.includes('title="How much spoil should be removed?"'));
  assert.ok(siteStep.includes("$85 + GST per cubic metre"));
  assert.ok(siteStep.includes("cards={spoilVolumeCards}"));
});

test("9 m standard and narrow trenches use physical volume and unrounded spoil cost", () => {
  const base = {
    ...SITE,
    spoil: "remove-all",
    jobType: "trenching",
    subtype: "Electrical Trench",
    metres: 9,
    depth: "300mm",
  };
  const standard = calculateEstimatorPrice({ ...base, width: "standard" });
  const narrow = calculateEstimatorPrice({ ...base, width: "narrow" });

  assert.equal(standard.labour, 416, "retained production calculation stays below the $495 onsite floor");
  assert.ok(Math.abs(standard.spoilRemoval.volumeM3 - 0.81) < 1e-12, "9 x 0.30 x 0.30");
  assert.ok(Math.abs(standard.spoilRemoval.cost - 68.85) < 1e-9);
  assert.deepEqual([standard.low, standard.high], [680, 750]);
  assert.equal(standard.spoilRemoval.volumeAssumed, false);

  assert.ok(Math.abs(narrow.spoilRemoval.volumeM3 - 0.405) < 1e-12, "9 x 0.15 x 0.30");
  assert.ok(Math.abs(narrow.spoilRemoval.cost - 34.425) < 1e-9, "cost remains unrounded in totals");
  assert.deepEqual([narrow.low, narrow.high], [640, 720]);

  const narrowRows = evaluatePricing(
    'getSpoilRemovalSummaryRows(calcEstimate({ access: "open", ground: "normal", congestion: "clear", spoil: "remove-all", suburb: "Canberra", jobType: "trenching", subtype: "Electrical Trench", metres: 9, depth: "300mm", width: "narrow" }))',
  );
  assert.equal(narrowRows[0].value, "0.405 m³ × $85 = $34.43 + GST");
});

test("spoil cost is fixed at both ends and is never increased by the labour buffer", () => {
  const leave = calculateEstimatorPrice({
    ...SITE,
    jobType: "trenching",
    subtype: "Electrical Trench",
    metres: 9,
    depth: "300mm",
    width: "standard",
  });
  const remove = calculateEstimatorPrice({
    ...SITE,
    spoil: "remove-all",
    jobType: "trenching",
    subtype: "Electrical Trench",
    metres: 9,
    depth: "300mm",
    width: "standard",
  });
  const pricing = estimator.slice(estimator.indexOf("const RATE"), estimator.indexOf("function SummaryRows"));

  assert.equal(leave.spoilRemoval.cost, 0);
  assert.deepEqual([leave.low, leave.high], [610, 680]);
  assert.equal(remove.spoilRemoval.cost, 68.85);
  assert.deepEqual([remove.low, remove.high], [680, 750]);
  assert.equal(pricing.includes("spoilRemoval.cost * (1 + RANGE_BUFFER)"), false);
  assert.ok(pricing.indexOf("onsiteHigh = onsiteLow * (1 + RANGE_BUFFER)") < pricing.indexOf("+ spoilRemoval.cost"));
});

test("non-trench removal uses selected volumes and the approved unknown fallback", () => {
  const base = {
    ...SITE,
    spoil: "remove-all",
    jobType: "leak-exposure",
    subtype: "Water Leak",
    leakArea: "localised",
  };
  const known = calculateEstimatorPrice({ ...base, spoilVolume: "full-load" });
  const unsure = calculateEstimatorPrice({ ...base, spoilVolume: "unsure" });

  assert.equal(known.manualOnly, false);
  assert.equal(known.spoilRemoval.volumeM3, 1);
  assert.equal(known.spoilRemoval.cost, 85);
  assert.deepEqual([known.low, known.high], [690, 770]);

  assert.equal(unsure.manualOnly, false);
  assert.equal(unsure.needsReview, true);
  assert.equal(unsure.spoilRemoval.volumeM3, 0.25);
  assert.equal(unsure.spoilRemoval.cost, 21.25);
  assert.deepEqual([unsure.low, unsure.high], [630, 710]);
  assert.equal(unsure.spoilRemoval.volumeAssumed, true);
  assert.equal(
    unsure.spoilRemoval.assumptionNote,
    "Spoil removal has been estimated using the minimum volume of 0.25 m³. James will confirm the actual quantity before work begins.",
  );
});

test("Not Sure trench width uses 0.30 m physically without changing its labour multiplier", () => {
  const estimate = calculateEstimatorPrice({
    ...SITE,
    spoil: "remove-all",
    jobType: "trenching",
    subtype: "Electrical Trench",
    metres: 9,
    depth: "300mm",
    width: "custom",
  });

  assert.ok(Math.abs(estimate.spoilRemoval.volumeM3 - 0.81) < 1e-12);
  assert.equal(estimate.spoilRemoval.assumptionType, "standard-width");
  assert.match(estimate.spoilRemoval.assumptionNote, /standard trench width of 0\.30 m/);
  assert.equal(estimate.needsReview, true);
  assert.equal(estimate.labour, 440, "the retained custom widthMod 1.20 still drives labour");
});

test("exact spot quantities drive production hours without label parsing", () => {
  const base = { ...SITE, jobType: "potholing", subtype: "Water Service", exposureDepth: "deep" };
  const two = calculateEstimatorPrice({ ...base, exposureCount: 2 });
  const four = calculateEstimatorPrice({ ...base, exposureCount: 4 });

  assert.equal(two.labour, 503, "(1.25 + 2 x 0.75 x 1.20) x $165");
  assert.equal(four.labour, 800, "(1.25 + 4 x 0.75 x 1.20) x $165");
  assert.equal(four.low, 920);
  assert.equal(/parseInt\(ans\.exposureCount/.test(estimator), false);
  assert.ok(estimator.includes("[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"));
});

test("the exact spot selector has native, named controls and an announced value", () => {
  const details = estimator.slice(estimator.indexOf("function S2"), estimator.indexOf("function S3"));

  assert.ok(details.includes('role="group" aria-label="Approximate number of spots"'));
  assert.ok(details.includes('aria-label="Reduce spot count"'));
  assert.ok(details.includes('aria-label="Increase spot count"'));
  assert.ok(details.includes('aria-live="polite"'));
  assert.ok(details.includes("&minus;"));
  assert.ok(details.includes('{" "}'), "count and unit have an accessible space");
});

test("unknown pothole depth is never cheaper than a known depth and is flagged", () => {
  const base = { ...SITE, jobType: "potholing", subtype: "Water Service", exposureCount: 4 };
  const shallow = calculateEstimatorPrice({ ...base, exposureDepth: "shallow" });
  const deep = calculateEstimatorPrice({ ...base, exposureDepth: "deep" });
  const unsure = calculateEstimatorPrice({ ...base, exposureDepth: "unsure" });

  assert.ok(unsure.low >= shallow.low);
  assert.ok(unsure.low >= deep.low);
  assert.equal(unsure.labour, deep.labour);
  assert.equal(unsure.needsReview, true);
});

test("Something Else refuses to invent a price", () => {
  // This job type has no measured quantity behind it, so any number would be a
  // guess wearing the same clothes as the grounded estimates.
  for (const answers of [
    { ...SITE, jobType: "other", subtype: "Not Sure" },
    { ...ROUGH, jobType: "other", subtype: "Something Unusual", otherDescription: "Big messy job" },
    { ...SITE, jobType: "other", subtype: "Site Preparation", metres: 50, depth: "800mm" },
  ]) {
    const estimate = calculateEstimatorPrice(answers);
    assert.equal(estimate.manualOnly, true);
    assert.equal(estimate.low, null, "no low figure");
    assert.equal(estimate.high, null, "no high figure");
    assert.equal(estimate.labour, 0);
    assert.equal(estimate.travel, 0);
    assert.equal(estimate.needsReview, true);
    assert.equal(estimate.manualOnly, true);
    assert.match(estimate.reviewReason, /outside the work the estimator can measure reliably/);
  }

  // Site conditions must not leak a number in through the multipliers either:
  // the manual result is identical however the site questions were answered.
  const plain = calculateEstimatorPrice({ jobType: "other" });
  const loaded = calculateEstimatorPrice({ ...ROUGH, jobType: "other", suburb: "Braidwood" });
  assert.deepEqual(plain, loaded);
});

test("all remaining open-ended, multi-load and travel branches stop without a price", () => {
  const manualCases = [
    ["something else", { ...SITE, jobType: "other", subtype: "Something Unusual" }, /outside the work/],
    ["more than 10 spots", { ...SITE, jobType: "potholing", subtype: "Water Service", exposureCount: "more-than-10", exposureDepth: "deep" }, /More than 10 spots/],
    ["numeric count over 10", { ...SITE, jobType: "service-exposure", subtype: "Dig Around Known Services", exposureCount: 11, exposureDepth: "shallow" }, /More than 10 spots/],
    ["unknown spot count", { ...SITE, jobType: "potholing", subtype: "Water Service", exposureCount: "unsure", exposureDepth: "deep" }, /exact approximate count/],
    ["historic ambiguous spot count", { ...SITE, jobType: "potholing", subtype: "Water Service", exposureCount: "3+", exposureDepth: "deep" }, /exact approximate count/],
    ["more than one cubic metre", { ...SITE, spoil: "remove-all", spoilVolume: "more-than-1", jobType: "leak-exposure", subtype: "Water Leak", leakArea: "localised" }, /additional loads/],
    ["unknown spoil handling", { ...SITE, spoil: "unsure", jobType: "leak-exposure", subtype: "Water Leak", leakArea: "localised" }, /Whether spoil should stay onsite or be removed/],
    ["obstacle 5 m or more", { ...SITE, jobType: "tunnel-bore", subtype: "Under a Driveway", boreDist: "long" }, /5 metres or more/],
    ["unknown obstacle distance", { ...SITE, jobType: "tunnel-bore", subtype: "Under a Driveway", boreDist: "unsure" }, /uncertain distance/],
    ["trench over 100 m", { ...SITE, jobType: "trenching", subtype: "Electrical Trench", metres: 101, depth: "450mm", width: "narrow" }, /over 100 metres/],
    ["retired cattle grid", { ...SITE, jobType: "cattle-grid", subtype: "Single Grid", cattleCount: "1-2", cattleFill: "light" }, /not available through the estimator/],
    ["outside normal area", { ...SITE, suburb: "Cooma", jobType: "leak-exposure", subtype: "Water Leak", leakArea: "localised" }, /review the travel/],
  ];

  for (const [label, answers, reason] of manualCases) {
    const estimate = calculateEstimatorPrice(answers);
    assert.equal(estimate.manualOnly, true, label);
    assert.equal(estimate.low, null, label);
    assert.equal(estimate.high, null, label);
    assert.equal(estimate.labour, 0, label);
    assert.equal(estimate.travel, 0, label);
    assert.equal(estimate.needsReview, true, label);
    assert.match(estimate.reviewReason, reason, label);
  }
});

test("normal-area matching is exact and never reads the later street address", () => {
  const job = { ...SITE, jobType: "leak-exposure", subtype: "Water Leak", leakArea: "localised" };

  for (const location of [
    { suburb: "Braidwood" },
    { suburb: "Bungendore" },
    { suburb: "Queanbeyan" },
    { suburb: "Jerrabomberra" },
    { suburb: "Kambah" },
    { suburb: "", postcode: "2600" },
    { suburb: "", postcode: "2622" },
  ]) {
    assert.equal(calculateEstimatorPrice({ ...job, ...location }).manualOnly, false, JSON.stringify(location));
  }

  const displayed = calculateEstimatorPrice(job);
  const submitted = calculateEstimatorPrice({ ...job, address: "80 Yass Street" });
  assert.deepEqual(submitted, displayed, "street address added after display cannot alter the amount");
  assert.equal(calculateEstimatorPrice({ ...job, suburb: "Yass" }).manualOnly, true);
  assert.equal(calculateEstimatorPrice({ ...job, suburb: "Cooma" }).manualOnly, true);

  const pricing = estimator.slice(estimator.indexOf("const RATE"), estimator.indexOf("function SummaryRows"));
  assert.equal(pricing.includes("outerArea"), false);
  assert.equal(pricing.includes("travel ="), false);
  assert.equal(/braidwood\|goulburn\|yass\|cooma\|bungendore/i.test(pricing), false);
});

test("no invented pricing constants survive for manual-review work", () => {
  const pricing = estimator.slice(
    estimator.indexOf("const RATE"),
    estimator.indexOf("function SummaryRows"),
  );

  assert.equal(/otherHours|otherScale/.test(pricing), false, "the invented hours table is gone");
  // The bail-out happens before any hours, rate or multiplier is touched.
  assert.ok(pricing.indexOf("if (manualReviewReason)") < pricing.indexOf("let setupHours"));
  assert.equal(estimator.includes("otherScaleCards"), false, "the invented size buckets are gone");
  assert.equal(pricing.includes("cattleHours"), false, "retired cattle-grid hours are gone");
});

test("the manual-review result is honest on every screen it appears", () => {
  const results = estimator.slice(estimator.indexOf("function S4"), estimator.indexOf("function S5"));
  assert.ok(results.includes("NO AUTOMATIC ESTIMATE"));
  assert.ok(results.includes("James will price this one himself"));
  assert.ok(results.includes("isn’t going to guess at a number"));
  assert.ok(results.includes("Ask James to Price This Job"));
  assert.ok(results.includes("No guessed price shown"));

  // The number is rendered only on the priced branch.
  const priceRender = results.indexOf("estimate.low.toLocaleString()");
  assert.ok(priceRender > results.indexOf("estimate.manualOnly ? ("), "price sits inside the non-manual branch");

  // The enquiry that reaches James says plainly that nothing was priced.
  const email = estimator.slice(estimator.indexOf("function buildRequestDetails"), estimator.indexOf("function S6"));
  assert.ok(email.includes("NO AUTOMATIC ESTIMATE - NEEDS PRICING BY JAMES"));
  assert.ok(email.includes("The customer was shown no price"));

  // And the review screen does not print a range it does not have.
  const review = estimator.slice(estimator.indexOf("function S6"), estimator.indexOf("function S7"));
  assert.ok(review.includes("request.estimate.manualOnly ? ("));
  assert.ok(review.includes("No automatic estimate for this one"));
  assert.ok(review.includes("no price has been given yet"));
});

test("displayed and submitted amounts are identical and explicitly + GST", () => {
  const results = estimator.slice(estimator.indexOf("function S4"), estimator.indexOf("function S5"));
  const requestBuilder = estimator.slice(
    estimator.indexOf("function buildRequestDetails"),
    estimator.indexOf("function S6"),
  );
  const submit = estimator.slice(estimator.indexOf("async function handleSubmit"), estimator.indexOf("const fallbackMailto"));

  assert.ok(results.includes("estimate.low.toLocaleString()"));
  assert.ok(results.includes("estimate.high.toLocaleString()"));
  assert.ok(results.includes("+ GST"));
  assert.ok(results.includes("$${estimate.travel} + GST fixed travel included"));
  assert.ok(results.includes("getSpoilRemovalSummaryRows(estimate)"));
  assert.ok(requestBuilder.includes("estimate.low.toLocaleString()"));
  assert.ok(requestBuilder.includes("estimate.high.toLocaleString()"));
  assert.ok(requestBuilder.includes("+ GST"));
  assert.ok(requestBuilder.includes("$${estimate.travel} + GST fixed travel included"));
  assert.ok(requestBuilder.includes("Estimated spoil volume:"));
  assert.ok(requestBuilder.includes("Spoil removal rate: $${estimate.spoilRemoval.ratePerM3}/m³ + GST"));
  assert.ok(requestBuilder.includes("Spoil removal cost: $${formatSpoilCost(estimate.spoilRemoval.cost)} + GST"));
  assert.ok(requestBuilder.includes("Spoil volume assumed:"));
  assert.ok(requestBuilder.includes("Spoil assumption:"));
  assert.ok(requestBuilder.includes("estimate.spoilRemoval.assumptionNote"));
  assert.ok(submit.includes("request.estimate.low.toLocaleString()"));
  assert.ok(submit.includes("request.estimate.high.toLocaleString()"));
  for (const field of [
    '"spoil_volume_m3"',
    '"spoil_rate_per_m3"',
    '"spoil_cost"',
    '"spoil_volume_assumed"',
    '"spoil_assumption_note"',
  ]) {
    assert.ok(submit.includes(field), `${field} is included in the Flowform payload`);
  }
  assert.ok(submit.includes('request.estimate.manualOnly ? ""'), "manual requests submit no price");
});

test("reaching a manual-review result cannot fire the Ads conversion", () => {
  const pricingAndResult = estimator.slice(
    estimator.indexOf("function getManualReviewReason"),
    estimator.indexOf("function S5"),
  );

  assert.equal(/gtag|trackEstimatorLead|GreenVacAnalytics/.test(pricingAndResult), false);
  assert.equal((estimator.match(/trackEstimatorLead/g) || []).length, 1);
  assert.ok(estimator.indexOf("trackEstimatorLead") > estimator.indexOf("if (!response.ok"));
});

test("the development submission stub cannot reach production", () => {
  assert.ok(estimator.includes("import.meta.env.DEV"));

  // Fail-safe, not fail-open: a development build mocks by default and only
  // posts for real on an explicit opt-out. A stripped or misspelt query string
  // must mean "mock", never "send a real enquiry to James".
  assert.ok(estimator.includes('has("realSubmit")'));
  assert.equal(estimator.includes('has("mockSubmit")'), false, "opt-in gating must not come back");

  // The gate reads "DEV and NOT opted out". If the query lookup were ever moved
  // ahead of the DEV check the default would flip back to sending for real.
  const gate = estimator.slice(estimator.indexOf("const MOCK_SUBMIT ="), estimator.indexOf(";", estimator.indexOf("const MOCK_SUBMIT =")));
  assert.match(gate, /import\.meta\.env\.DEV\s*&&\s*!/);
  assert.ok(gate.indexOf("import.meta.env.DEV") < gate.indexOf("realSubmit"), "DEV is checked first");

  // The real endpoint is still the only network path in the source.
  assert.equal((estimator.match(/fetch\(FORM_ENDPOINT/g) || []).length, 1);
  assert.ok(estimator.indexOf("submitLockRef.current = true") < estimator.indexOf("fetch(FORM_ENDPOINT"));

  // Nothing survives the build.
  const bundles = fs
    .readdirSync(path.join(root, "get-a-quote", "assets"))
    .filter((entry) => entry.endsWith(".js"));
  assert.equal(bundles.length, 1, "one shipped bundle");
  const shipped = fs.readFileSync(path.join(root, "get-a-quote", "assets", bundles[0]), "utf8");

  for (const trace of [
    "realSubmit",
    "mockSubmission",
    "MOCK_SUBMIT",
    "ALLOW_REAL_SUBMIT_IN_DEV",
    "import.meta.env",
    "Dev preview",
    "dev-badge",
  ]) {
    assert.equal(shipped.includes(trace), false, `${trace} leaked into the production bundle`);
  }
  assert.ok(shipped.includes("flowform.to/submit"), "the real endpoint still ships");
});

/* --- shared logic is really shared --------------------------------------- */

test("the state module stays importable, pure and free of tracking", () => {
  // Comments are stripped first: this is about what the module *does*, and the
  // header comment legitimately mentions React, JSX and PostHog.
  const code = stateSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  assert.equal(/document\.|window\.|from "react"|require\(/.test(code), false, "no DOM or React");
  assert.equal(/gtag|GreenVacAnalytics|posthog\.|capture\(/i.test(code), false, "no dispatch");
  assert.ok(estimator.includes('from "./estimator-state.js"'), "App.jsx uses the shared rules");
});

test("the contrast gate is checking the colours the estimator actually ships", () => {
  // check_contrast.py is a curated list, so it is only as good as its mirror of
  // the inline stylesheet. Every estimator colour it gates must exist in App.jsx.
  const gate = read("check_contrast.py");
  const declared = [...gate.matchAll(/"(est-[a-z-]+)":\s*"(#[0-9a-f]{6})"/g)];

  assert.ok(declared.length >= 10, "the estimator palette is gated");
  const stylesheet = estimator.slice(estimator.indexOf("const S = `"), estimator.indexOf("function CancelDialog"));
  for (const [, name, hex] of declared) {
    assert.ok(stylesheet.includes(hex), `${name} (${hex}) is not in the estimator stylesheet`);
  }
});

test("readiness rules gate each step the same way the screens do", async () => {
  const state = await loadState();

  assert.equal(state.isJobStepReady({ jobType: "trenching" }), false);
  assert.equal(state.isJobStepReady({ jobType: "trenching", subtype: "Electrical Trench" }), true);

  assert.equal(state.isDetailStepReady({ jobType: "trenching", depth: "450mm" }), false);
  assert.equal(state.isDetailStepReady({ jobType: "trenching", metres: 5, depth: "450mm", width: "narrow" }), true);
  const potholing = state.selectJobType({}, "potholing");
  assert.equal(potholing.exposureCount, 1, "the exact-count stepper starts at one");
  assert.equal(state.isDetailStepReady(potholing), false, "depth is still required");
  assert.equal(state.isDetailStepReady({ ...potholing, exposureDepth: "deep" }), true);
  assert.equal(state.isDetailStepReady({ jobType: "other" }), false);
  assert.equal(state.isDetailStepReady({ jobType: "other", otherDescription: "   " }), false);
  assert.equal(state.isDetailStepReady({ jobType: "other", otherDescription: "Vacuum out a crawlspace" }), true);

  assert.equal(state.isSiteStepReady({ suburb: "  ", access: "open", ground: "normal", congestion: "clear", spoil: "leave" }), false);
  assert.equal(state.isSiteStepReady({ suburb: "Kambah", access: "open", ground: "normal", congestion: "clear", spoil: "leave" }), true);
  assert.equal(state.isSiteStepReady({ suburb: "Kambah", access: "open", ground: "normal", congestion: "clear", spoil: "remove-all", jobType: "leak-exposure" }), false);
  assert.equal(state.isSiteStepReady({ suburb: "Kambah", access: "open", ground: "normal", congestion: "clear", spoil: "remove-all", spoilVolume: "unsure", jobType: "leak-exposure" }), true);
  assert.equal(state.isSiteStepReady({ suburb: "Kambah", access: "open", ground: "normal", congestion: "clear", spoil: "remove-all", jobType: "trenching" }), true);

  assert.equal(state.isContactStepReady({ name: "Jo", mobile: " " }), false);
  assert.equal(state.isContactStepReady({ name: "Jo", mobile: "0400000000", preferredDay: "asap" }), true);

  assert.equal(state.hasUncertainSiteAnswer({ access: "open", ground: "normal" }), false);
  assert.equal(state.hasUncertainSiteAnswer({ access: "open", ground: "unsure" }), true);
  assert.equal(state.hasUncertainSiteAnswer({ access: "open", ground: "normal", spoilVolume: "unsure" }), true);
});
