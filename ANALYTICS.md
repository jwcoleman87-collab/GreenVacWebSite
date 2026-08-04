# Analytics and lead tracking

## Lead definitions

GreenVac has two primary website lead actions:

- **Website phone lead:** a visitor activates a semantic `tel:` link and the browser or device attempts to open its dialler. This is a click-to-call signal, not proof that a call connected or lasted for any particular duration.
- **Estimator completed:** the Flowform submission request passes the estimator flow, returns an HTTP success response without a provider failure result, and the app commits to the success screen.

Opening `/get-a-quote`, starting the estimator, changing steps, failing validation, receiving a rejected server response, viewing a page, or refreshing a page is not a lead.

## Existing architecture

The site uses direct `gtag.js`, not Google Tag Manager. The existing Google tag ID is `GT-WB5M7MK8`, with the existing Google Ads destination `AW-17948622134`. The base tag remains installed once per measured page and continues its existing page-view/audience behavior. The repository contains no `G-...` GA4 measurement ID, `GTM-...` container ID, Meta Pixel loader, Meta Pixel ID, Meta Conversions API client, enhanced-conversions implementation, consent component, or Google forwarding-number phone snippet. Do not invent or add any of these without an intentional configuration change.

Microsoft Clarity project `xmk1qbiqul` and the existing PostHog installation remain unchanged. Clarity's project id and its stock Microsoft loader are exactly as before, but the loader now runs only in an ordinary browser on the production domains: an Electron wrapper or an automated browser pointed at `www.greenvac.com.au` no longer records a session. See [Microsoft Clarity](#microsoft-clarity-production-domains-only) below. The shared lead helper does not read from, write to, or redefine Clarity, Meta, consent, or page-view state.

The estimator retains its existing inline PostHog and Google tag bootstraps. Production verification found that the site CSP previously blocked those two scripts, so `vercel.json` now permits only their exact SHA-256 hashes. This does not allow arbitrary inline JavaScript or change any tracking ID, event, consent behavior, or loader. If either bootstrap is intentionally edited, regenerate and review its CSP hash; the regression suite rejects stale hashes.

## Events and firing points

`js/analytics.js` is the single lead-event helper used by the static site and estimator.

- `phone_call_click` is the existing Google and PostHog event name. One delegated document click listener fires it for a real `tel:` activation and records only a non-personal placement such as `header`, `hero`, `contact_page`, `footer`, `floating_call`, or an estimator placement.
- `form_submit` is the existing Google event name. `S6.handleSubmit` in `get-a-quote-src/src/App.jsx` fires it through the helper only after the awaited Flowform response is accepted.
- `estimator_submit_attempt`, `estimator_submit_success`, `estimator_submit_error`, `estimator_started`, and the existing `estimator_step_*` PostHog names are preserved. Their payloads exclude visitor identity, contact information, addresses, free text, and estimator job answers.
- A Google Ads `conversion` event is sent only when the matching real conversion label below is configured. Phone and estimator leads have separate `send_to` destinations.

The initial estimator CTA/open is not sent to Google Ads as a lead. Existing page views and PostHog estimator engagement events remain observational.

### Estimator cancellation (diagnostic only)

Every estimator stage before the confirmation carries a "Cancel estimate" control that opens a confirmation dialog. Three PostHog-only events record what the visitor did, so drop-off can be read per step:

| Event | Fires when |
| --- | --- |
| `estimator_cancel_clicked` | the visitor activates the cancel control and the dialog opens |
| `estimator_cancel_confirmed` | the visitor confirms and leaves for the main site |
| `estimator_cancel_dismissed` | the visitor closes the dialog (button, Escape or backdrop) and continues |

Each payload is exactly `{ step, step_id }`, where `step_id` is one of `job-type`, `job-details`, `site-conditions`, `estimate`, `contact`, `review`, `sent`. Names, phone numbers, email addresses, suburbs, free text and job answers are never included — `cancelPayload` in `get-a-quote-src/src/estimator-state.js` takes a step number and nothing else.

**These are not conversions and must never become conversions.** The dispatcher `captureCancel` in `App.jsx` calls `window.posthog.capture` only; it does not touch `gtag`, `window.GreenVacAnalytics` or `trackEstimatorLead`, and `js/analytics.js` has no cancellation path at all. A visitor abandoning the estimator is the opposite of a lead, so counting one in Google Ads would corrupt bidding. `tests/estimator-experience.test.cjs` asserts the isolation in both directions.

## Configuration

This static project has no environment-variable pipeline and the linked Vercel project currently has no environment variables. Public tag configuration therefore lives at the top of `js/analytics.js` and can be overridden before that script loads with `window.GreenVacAnalyticsConfig`.

Configured Google Ads values:

- `googleAdsId`: `AW-17948622134`
- `phoneConversionLabel`: `Yu01CPve8dQcELb6yO5C` for **GreenVac - Website phone lead**
- `estimatorConversionLabel`: `7zJ6CKGOiNUcELb6yO5C` for **GreenVac - Estimator completed**
- `estimatorConversionValue`: `1.0` and `estimatorConversionCurrency`: `AUD`

These public conversion identifiers are stored in the client-side helper, not as secrets. An explicit empty-string override or a malformed label disables the corresponding direct Ads conversion ping without throwing, delaying navigation, or generating a fake destination.

### Estimator conversion (current)

| Item | Value |
| --- | --- |
| Conversion name | **GreenVac - Estimator completed** |
| Destination | `AW-17948622134/7zJ6CKGOiNUcELb6yO5C` |
| Event | `gtag('event', 'conversion', { send_to, transaction_id, value: 1.0, currency: 'AUD' })` |
| Fires when | The awaited Flowform response is accepted (HTTP ok, no provider failure result) inside `S6.handleSubmit`, immediately before the success state commits |
| Deduplication | Two layers: a `greenvac_estimator_lead:<eventId>` marker (same accepted submission, including retries, which reuse the id) and a `greenvac_estimator_lead_sent` latch capping the visit at one estimator conversion. Both are written **before** dispatch and held in an in-page map plus `sessionStorage`. The id is also sent as `transaction_id` |
| Environments | `www.greenvac.com.au` and `greenvac.com.au` only |

An earlier configuration used a malformed 19-character estimator label (real labels in this account are 20 characters, as the phone label shows). Google Ads could not match a destination built from it, so estimator conversions sent before this correction were not recorded. The obsolete value is preserved in Git history only; the regression suite fails if it reappears in any shipped, configured or documented asset, so this file deliberately does not repeat it.

`value` is a flat comparability figure, not a quoted job price, and no estimator answer or contact detail is ever sent. The value and currency are attached to the estimator action only; the phone conversion payload is unchanged and deliberately carries neither. A non-numeric value or a currency that is not a three-letter uppercase code is omitted rather than guessed.

Opening `/get-a-quote`, clicking a "Get a Quote" button, and moving between estimator steps are PostHog-only engagement signals and are never sent to Google Ads as a lead. Ordinary Google page views remain analytics and audience signals only; they do not trigger this conversion.

The phone conversion is a separate action with its own destination, label, and payload, and no estimator label, value, currency, or session latch touches it. One shared detail did change for both leads: `gtagEvent` now swallows an exception thrown by the Google tag itself. That guard exists because the estimator calls the helper from inside its submission `try` block, but `gtagEvent` is shared, so on the phone path a throwing tag is now contained instead of escaping the document click handler, and the PostHog `phone_call_click` capture that follows it is now reached. The Google payload, destination, event names, and listener are untouched. Note that `trackPhoneLead` and `trackEstimatorLead` return `true` once they have run, which indicates dispatch was attempted, not that Google received it.

### Microsoft Clarity (production domains only)

Clarity project `xmk1qbiqul` is unchanged and still loads through `js/clarity.js`, which is the only Clarity initialisation in the repository and which every measured page includes exactly once. That file now decides at runtime whether to install the tag at all.

| Item | Value |
| --- | --- |
| Project | `xmk1qbiqul`, unchanged |
| Entry point | `js/clarity.js`; no page has an inline loader or a direct tag URL |
| Allowed hosts | `greenvac.com.au` and `www.greenvac.com.au`, matched exactly, over `https:` only. A trailing DNS root dot and hostname casing are normalised away first |
| Also required | Not Electron, and not an automated browser |
| Blocked | `localhost`, `127.0.0.1`, every `*.vercel.app` deployment including previews, subdomains such as `staging.greenvac.com.au`, any `http:` or `file:` origin, and any other hostname |
| On a blocked host | No tag download, no request to `clarity.ms`, and `window.clarity` is never created |

The decision reads `window.location.hostname` in the browser. A build-time flag is deliberately not the gate: Vercel preview deployments run production builds, so `NODE_ENV` alone would let preview traffic and internal review clicks record into the live Clarity project. The `https:` requirement costs nothing on production, which is always served over TLS, and closes the case of a local server reached through a hosts-file mapping of the real domain name.

Electron is detected by an `Electron/` user agent or a `process.versions.electron` runtime, and automation by `navigator.webdriver` or a `window.Cypress` harness. Both checks matter because either environment can be pointed at the real production hostname. **Both are best effort.** An Electron app with the default `contextIsolation: true` does not expose `process` to the page, so in practice its user agent is the only signal, and a wrapper that overrides its user agent is indistinguishable from an ordinary browser. Likewise, a tool that attaches to an already-running browser over CDP, or a Chrome started with `--disable-blink-features=AutomationControlled`, leaves `navigator.webdriver` false. The hostname and scheme checks are exact; treat these two as filters, not guarantees.

`window.GreenVacClarity` reports the decision as `{ enabled, projectId }` and is also the single-installation guard: the file returns immediately if it has already run in this document, so including it twice installs one tag. It deliberately does not inspect `window.clarity`, because treating a foreign queue as "already installed" would let an unrelated global silently stop recording on production.

#### Changing the allow list or the loader

- The host list lives in `js/clarity.js` (`PRODUCTION_HOSTS`) and, separately, in `js/analytics.js` (`productionHosts`). Clarity loads *before* the lead helper, so it cannot read that config and keeps its own copy. `tests/clarity.test.cjs` fails if the two lists stop naming the same hosts, so add a new domain to **both**.
- The script URL carries a `?v=` cache-busting marker (`?v=xmk1qbiqul-prod-20260731`) so a cached copy of a previous loader is not reused. `js/clarity.js` is served unminified and no build step regenerates it, so that marker is the only cache control it has. **Bump it whenever `js/clarity.js` changes**, in all three hand-maintained sources — `partials/header.html`, `404.html` and `get-a-quote-src/index.html` — then run `python bake.py` and the estimator build. The test suite pins the exact value and fails on any page carrying a stale one.

This gate is self-contained. Clarity loads before `js/analytics.min.js` and shares no state with it, so Google Ads, phone-call conversions, estimator conversions and PostHog are untouched by it.

## Duplicate and environment protection

- The phone tracker uses one delegated listener, so React-rendered and static links use the same path. It never calls `preventDefault`, so semantic link, keyboard, and screen-reader behavior is preserved.
- The estimator has a synchronous ref lock before `fetch`, preventing rapid double submissions before React state updates.
- Each estimator attempt receives a non-personal generated event ID. A retry reuses it, the helper stores a session marker, and the same value is supplied to Google Ads as `transaction_id` when configured.
- That lock and event ID live in component refs, so an estimator remount resets them. Tapping the header back arrow while a submission is in flight is the known route: the in-flight request still resolves and reports its lead, then the remounted step-six screen offers an enabled send button again. The `greenvac_estimator_lead_sent` latch in the helper therefore caps Google Ads at **one estimator conversion per browser session**, which no fresh event ID can bypass. A visitor who deliberately sends two different jobs in one session is counted once in Google Ads; PostHog still records every submission, and James still receives every enquiry email. Capping is the correct direction for lead counting and matches the **Count: One** setting on the conversion action.
- The success event is sent from the accepted-response branch, not a success-component effect or route render. Refreshing the app starts at step one and cannot replay a lead.
- Dispatch never surfaces as a user-facing failure. A blocked, absent or internally throwing Google tag is swallowed by the helper, so an enquiry the server already accepted still reaches its success screen and is never resubmitted.
- Lead dispatch is allowed only on `www.greenvac.com.au` and `greenvac.com.au`, compared against `window.location.hostname` exactly. Localhost and Vercel preview hostnames therefore send no lead analytics or Google Ads conversion events, and automated tests send none **while they run against those hosts**. The lead helper has no automation or Electron detection of its own: a Playwright or Selenium run pointed at the live domain would still fire real phone and estimator conversions, so do not point one at production.
- Clarity shares the production-host list but not the whole rule, and applies it one step earlier: on any other host the tag is never loaded, so those environments make no `clarity.ms` request at all. It additionally refuses Electron and automated browsers, which the lead helper does not. `js/clarity.js` is the single initialisation point, and it refuses to install twice. See [Microsoft Clarity](#microsoft-clarity-production-domains-only).

## Safe verification

1. Run `node --test tests/*.test.cjs` for the whole tracking and pricing regression suite.
2. Run `python deploy.py --dry-run` to rebuild the estimator and minified assets, bake shared partials, and execute repository gates.
3. On a preview deployment, use Tag Assistant to confirm the existing Google tag, PostHog, and page views still load, while phone/estimator lead sends remain disabled by the hostname guard. Clarity must **not** load there: the network panel shows no `clarity.ms` request, `window.clarity` is `undefined`, and `window.GreenVacClarity.enabled` is `false`. The same three checks on `https://www.greenvac.com.au/` must show the opposite.
4. Inspect the served helper without submitting anything: `curl -s https://www.greenvac.com.au/js/analytics.min.js` must contain `7zJ6CKGOiNUcELb6yO5C`, `Yu01CPve8dQcELb6yO5C`, and `AW-17948622134`. The regression suite separately proves the superseded label is absent everywhere.
5. In a browser console on production, `window.GreenVacAnalyticsConfig.estimatorConversionLabel` reports the live label, and loading `/get-a-quote` plus stepping through questions must add no `conversion` event to `window.dataLayer`. This is read-only and sends nothing.
6. Only if a genuine test enquiry is authorised, use Tag Assistant Preview for one controlled phone-link click and one estimator submission. Confirm exactly one labeled `conversion` event per action, that the estimator event carries `value: 1`, `currency: 'AUD'`, and the generated `transaction_id`, and that no conversion appeared before the success screen.
7. Do not test by refreshing a success screen, and do not claim that a `tel:` click proves a completed call.
8. Google Ads may report the action as "Inactive" or "Unverified" until it records its first real conversion and its reporting pipeline catches up. That delay is a dashboard state, not evidence of a broken installation; code verification and dashboard detection are separate things.

## Google Ads dashboard checklist

In **Goals > Conversions > Summary**:

1. Create or identify **GreenVac - Website phone lead** with category **Contact**, source **Website**, count **One**, no invented value, and currency AUD only if the UI requires a currency.
2. Create or identify **GreenVac - Estimator completed** with category **Submit lead form**, source **Website**, and count **One**. Its event sends `value: 1.0` with `currency: AUD`, so leave the action's own value settings consistent with that or set the action to not use a value; do not add a second different value in the UI.
3. Verify the two configured event-snippet labels still match their Google Ads conversion actions. The estimator label must read exactly `7zJ6CKGOiNUcELb6yO5C`; if Google Ads shows a different label for **GreenVac - Estimator completed**, update `estimatorConversionLabel` in `js/analytics.js` rather than editing any page. Keep the existing `AW-17948622134` ID.
4. Make the two actions **Primary** for bidding unless verified completed-call tracking is intentionally the stronger phone source.
5. Edit the **Page views** goal: turn off **Account default** and set its actions to **Secondary (observe only)**, or remove it from the campaign's selected goals. Page views must not be a primary lead goal.
6. Check the **Search - Hydro Excavation - Canberra** campaign's goal settings. It should optimize for the Contact and Submit lead form actions, not Page views or estimator opening.
7. If Google forwarding-number website-call tracking or Google Ads call-asset reporting is enabled, decide which phone action is primary so a click and a later completed/qualified call are not both used as duplicate primary outcomes. Call-asset duration rules are configured in Google Ads and are separate from this website click signal.
8. Do not also import the same phone/estimator events from GA4 while the direct labeled Ads events are primary. If the account later moves to GA4-imported conversions, disable the corresponding direct Ads destinations first.
