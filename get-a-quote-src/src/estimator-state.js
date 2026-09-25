/* Pure estimator state helpers.
 *
 * Deliberately JSX-free, React-free and dependency-free so `node --test` can
 * import this file directly and exercise the real selection, step and
 * cancellation rules instead of asserting on rendered markup.
 *
 * Pricing deliberately does NOT live here. tests/tracking-installation slices
 * App.jsx between `const RATE` and `function SummaryRows` and runs that block in
 * a bare vm context, so the pricing engine has to stay in that file, in that
 * order, with no imports.
 */

// One stable id per screen. These travel with the cancellation events, so they
// must never be renamed casually -- a rename silently splits the funnel report.
export const STEP_IDS = [
  "job-type",
  "job-details",
  "site-conditions",
  "estimate",
  "contact",
  "review",
  "sent",
];

export function stepIdFor(screen) {
  return STEP_IDS[screen - 1] || "unknown";
}

// Cancellation is diagnostic product analytics and nothing else. These names go
// to PostHog only; no Google Ads conversion, no lead event, no shared helper.
export const CANCEL_EVENTS = {
  clicked: "estimator_cancel_clicked",
  confirmed: "estimator_cancel_confirmed",
  dismissed: "estimator_cancel_dismissed",
};

export function cancelEventName(action) {
  return CANCEL_EVENTS[action] || null;
}

// Carries the step only. No name, mobile, email, address, suburb, free text or
// job answer may ever be added here.
export function cancelPayload(screen) {
  return { step: screen, step_id: stepIdFor(screen) };
}

// Re-selecting the current job is a no-op. Changing jobs clears only the
// measurements that no longer apply, retaining the customer's site and contact.
export function selectJobType(current, jobId) {
  if (current.jobType === jobId) return current;
  const next = { ...current, jobType: jobId, subtype: null, acceptedTerms: false };
  for (const key of ["depth", "width", "exposureCount", "exposureDepth", "leakArea",
    "pitSize", "pitFill", "cattleCount", "cattleFill", "boreDist", "otherDescription", "spoilVolume"]) {
    delete next[key];
  }
  next.metres = current.metres || 5;
  next.preferredTime = current.preferredTime || "flexible";
  if (jobId === "service-exposure" || jobId === "potholing") next.exposureCount = 1;
  return next;
}

// Only the supported landing-page shortcut can preselect a job. Measurements
// and the trench subtype still need the customer's answers before continuing.
export function initialAnswers(search = "") {
  const defaults = { metres: 5, preferredTime: "flexible" };
  return new URLSearchParams(search).get("job") === "trenching"
    ? selectJobType(defaults, "trenching")
    : defaults;
}

export function featuredJobs(jobTypes) {
  return jobTypes.filter((job) => job.featured && !job.hidden);
}

// `hidden` retires an option from the customer-facing list without deleting its
// historic id and descriptive fields. Pricing decides whether restored state
// can still calculate or needs James to review it.
export function visibleExtraJobs(jobTypes) {
  return jobTypes.filter((job) => !job.featured && !job.hidden);
}

// Drives the "Selected: ..." chip on the collapsed disclosure control, so a
// choice made inside the expanded list is never invisible once it closes.
export function selectedExtraJob(jobTypes, ans) {
  if (!ans || !ans.jobType) return null;
  return visibleExtraJobs(jobTypes).find((job) => job.id === ans.jobType) || null;
}

export function isJobStepReady(ans) {
  return Boolean(ans.jobType && ans.subtype);
}

export function isDetailStepReady(ans) {
  switch (ans.jobType) {
    case "trenching":
      return Boolean((ans.metres || 5) > 0 && ans.depth && ans.width);
    case "service-exposure":
    case "potholing":
      return Boolean(ans.exposureCount !== undefined && ans.exposureCount !== null && ans.exposureDepth);
    case "leak-exposure":
      return Boolean(ans.leakArea);
    case "pit-cleanout":
      return Boolean(ans.pitSize && ans.pitFill);
    case "cattle-grid":
      return Boolean(ans.cattleCount && ans.cattleFill);
    case "tunnel-bore":
      return Boolean(ans.boreDist);
    // No measured quantity is collected here on purpose -- this job type is
    // never priced automatically, so the description is the whole input.
    case "other":
      return Boolean(ans.otherDescription?.trim());
    default:
      return false;
  }
}

export function isSiteStepReady(ans) {
  const baseQuestionsReady = Boolean(
    ans.suburb?.trim() &&
    ans.access &&
    ans.ground &&
    ans.congestion &&
    ans.spoil,
  );
  const needsSpoilVolume = ans.jobType !== "trenching" && ans.spoil === "remove-all";

  return baseQuestionsReady && (!needsSpoilVolume || Boolean(ans.spoilVolume));
}

export function isContactStepReady(ans) {
  return Boolean(ans.name?.trim() && isValidMobile(ans.mobile) &&
    isValidEmail(ans.email) && ans.preferredDay);
}

export function hasUncertainSiteAnswer(ans) {
  return (
    ans.access === "unsure" ||
    ans.ground === "unsure" ||
    ans.congestion === "unsure" ||
    ans.spoil === "unsure" ||
    ans.spoilVolume === "unsure"
  );
}

export function isValidMobile(value) {
  return /^(?:04[0-9]{8}|\+?614[0-9]{8})$/.test(String(value || "").replace(/[\s()-]/g, ""));
}
export function isValidEmail(value) {
  return !value?.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Earlier steps must be complete before restored/browser-forward navigation.
export function reachableScreen(ans, requested) {
  const target = Math.min(6, Math.max(1, Number(requested) || 1));
  if (!isJobStepReady(ans)) return 1;
  if (target > 2 && !isDetailStepReady(ans)) return 2;
  if (target > 3 && !isSiteStepReady(ans)) return 3;
  if (target > 5 && !isContactStepReady(ans)) return 5;
  return target;
}
