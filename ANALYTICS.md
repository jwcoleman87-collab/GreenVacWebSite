# Analytics and lead tracking

## Lead definitions

GreenVac has two primary website lead actions:

- **Website phone lead:** a visitor activates a semantic `tel:` link and the browser or device attempts to open its dialler. This is a click-to-call signal, not proof that a call connected or lasted for any particular duration.
- **Estimator completed:** the Flowform submission request passes the estimator flow, returns an HTTP success response without a provider failure result, and the app commits to the success screen.

Opening `/get-a-quote`, starting the estimator, changing steps, failing validation, receiving a rejected server response, viewing a page, or refreshing a page is not a lead.

## Existing architecture

The site uses direct `gtag.js`, not Google Tag Manager. The existing Google tag ID is `GT-WB5M7MK8`, with the existing Google Ads destination `AW-17948622134`. The base tag remains installed once per measured page and continues its existing page-view/audience behavior. The repository contains no `G-...` GA4 measurement ID, `GTM-...` container ID, Meta Pixel loader, Meta Pixel ID, Meta Conversions API client, enhanced-conversions implementation, consent component, or Google forwarding-number phone snippet. Do not invent or add any of these without an intentional configuration change.

Microsoft Clarity project `xmk1qbiqul` and the existing PostHog installation remain unchanged. The shared lead helper does not read from, write to, or redefine Clarity, Meta, consent, or page-view state.

The estimator retains its existing inline PostHog and Google tag bootstraps. Production verification found that the site CSP previously blocked those two scripts, so `vercel.json` now permits only their exact SHA-256 hashes. This does not allow arbitrary inline JavaScript or change any tracking ID, event, consent behavior, or loader. If either bootstrap is intentionally edited, regenerate and review its CSP hash; the regression suite rejects stale hashes.

## Events and firing points

`js/analytics.js` is the single lead-event helper used by the static site and estimator.

- `phone_call_click` is the existing Google and PostHog event name. One delegated document click listener fires it for a real `tel:` activation and records only a non-personal placement such as `header`, `hero`, `contact_page`, `footer`, `floating_call`, or an estimator placement.
- `form_submit` is the existing Google event name. `S6.handleSubmit` in `get-a-quote-src/src/App.jsx` fires it through the helper only after the awaited Flowform response is accepted.
- `estimator_submit_attempt`, `estimator_submit_success`, `estimator_submit_error`, `estimator_started`, and the existing `estimator_step_*` PostHog names are preserved. Their payloads exclude visitor identity, contact information, addresses, free text, and estimator job answers.
- A Google Ads `conversion` event is sent only when the matching real conversion label below is configured. Phone and estimator leads have separate `send_to` destinations.

The initial estimator CTA/open is not sent to Google Ads as a lead. Existing page views and PostHog estimator engagement events remain observational.

## Configuration

This static project has no environment-variable pipeline and the linked Vercel project currently has no environment variables. Public tag configuration therefore lives at the top of `js/analytics.js` and can be overridden before that script loads with `window.GreenVacAnalyticsConfig`.

Configured Google Ads values:

- `googleAdsId`: `AW-17948622134`
- `phoneConversionLabel`: `Yu01CPve8dQcELb6yO5C` for **GreenVac - Website phone lead**
- `estimatorConversionLabel`: `7zJ6CKGOiNUcELb6yO5C` for **GreenVac – Estimator completed**
- `estimatorConversionValue`: `1.0` and `estimatorConversionCurrency`: `AUD`

These public conversion identifiers are stored in the client-side helper, not as secrets. An explicit empty-string override or a malformed label disables the corresponding direct Ads conversion ping without throwing, delaying navigation, or generating a fake destination.

### Estimator conversion (current)

| Item | Value |
| --- | --- |
| Conversion name | **GreenVac – Estimator completed** |
| Destination | `AW-17948622134/7zJ6CKGOiNUcELb6yO5C` |
| Event | `gtag('event', 'conversion', { send_to, transaction_id, value: 1.0, currency: 'AUD' })` |
| Fires when | The awaited Flowform response is accepted (HTTP ok, no provider failure result) inside `S6.handleSubmit`, immediately before the success state commits |
| Deduplication | Non-personal generated `eventId`, reused across retries, latched by an in-page map plus a `greenvac_estimator_lead:<eventId>` session marker written **before** dispatch, and sent as `transaction_id` |
| Environments | `www.greenvac.com.au` and `greenvac.com.au` only |

An earlier configuration used a malformed 19-character estimator label (real labels in this account are 20 characters, as the phone label shows). Google Ads could not match a destination built from it, so estimator conversions sent before this correction were not recorded. The obsolete value is preserved in Git history only; the regression suite fails if it reappears in any shipped, configured or documented asset, so this file deliberately does not repeat it.

`value` is a flat comparability figure, not a quoted job price, and no estimator answer or contact detail is ever sent. The value and currency are attached to the estimator action only; the phone conversion payload is unchanged and deliberately carries neither. A non-numeric value or a currency that is not a three-letter uppercase code is omitted rather than guessed.

Opening `/get-a-quote`, clicking a "Get a Quote" button, and moving between estimator steps are PostHog-only engagement signals and are never sent to Google Ads as a lead. Ordinary Google page views remain analytics and audience signals only; they do not trigger this conversion. The phone conversion is a separate action with its own destination and is not affected by estimator changes.

## Duplicate and environment protection

- The phone tracker uses one delegated listener, so React-rendered and static links use the same path. It never calls `preventDefault`, so semantic link, keyboard, and screen-reader behavior is preserved.
- The estimator has a synchronous ref lock before `fetch`, preventing rapid double submissions before React state updates.
- Each estimator attempt receives a non-personal generated event ID. A retry reuses it, the helper stores a session marker, and the same value is supplied to Google Ads as `transaction_id` when configured.
- The success event is sent from the accepted-response branch, not a success-component effect or route render. Refreshing the app starts at step one and cannot replay a lead.
- Dispatch never surfaces as a user-facing failure. A blocked, absent or internally throwing Google tag is swallowed by the helper, so an enquiry the server already accepted still reaches its success screen and is never resubmitted.
- Lead dispatch is allowed only on `www.greenvac.com.au` and `greenvac.com.au`. Localhost, automated tests, and Vercel preview hostnames send no lead analytics or Google Ads conversion events.

## Safe verification

1. Run `node --test tests/*.test.cjs` for the whole tracking and pricing regression suite.
2. Run `python deploy.py --dry-run` to rebuild the estimator and minified assets, bake shared partials, and execute repository gates.
3. On a preview deployment, use Tag Assistant to confirm the existing Google tag, Clarity, PostHog, and page views still load, while phone/estimator lead sends remain disabled by the hostname guard.
4. Inspect the served helper without submitting anything: `curl -s https://www.greenvac.com.au/js/analytics.min.js` must contain `7zJ6CKGOiNUcELb6yO5C`, `Yu01CPve8dQcELb6yO5C`, and `AW-17948622134`. The regression suite separately proves the superseded label is absent everywhere.
5. In a browser console on production, `window.GreenVacAnalyticsConfig.estimatorConversionLabel` reports the live label, and loading `/get-a-quote` plus stepping through questions must add no `conversion` event to `window.dataLayer`. This is read-only and sends nothing.
6. Only if a genuine test enquiry is authorised, use Tag Assistant Preview for one controlled phone-link click and one estimator submission. Confirm exactly one labeled `conversion` event per action, that the estimator event carries `value: 1`, `currency: 'AUD'`, and the generated `transaction_id`, and that no conversion appeared before the success screen.
7. Do not test by refreshing a success screen, and do not claim that a `tel:` click proves a completed call.
8. Google Ads may report the action as "Inactive" or "Unverified" until it records its first real conversion and its reporting pipeline catches up. That delay is a dashboard state, not evidence of a broken installation; code verification and dashboard detection are separate things.

## Google Ads dashboard checklist

In **Goals > Conversions > Summary**:

1. Create or identify **GreenVac - Website phone lead** with category **Contact**, source **Website**, count **One**, no invented value, and currency AUD only if the UI requires a currency.
2. Create or identify **GreenVac – Estimator completed** with category **Submit lead form**, source **Website**, and count **One**. Its event sends `value: 1.0` with `currency: AUD`, so leave the action's own value settings consistent with that or set the action to not use a value; do not add a second different value in the UI.
3. Verify the two configured event-snippet labels still match their Google Ads conversion actions. The estimator label must read exactly `7zJ6CKGOiNUcELb6yO5C`; if Google Ads shows a different label for **GreenVac – Estimator completed**, update `estimatorConversionLabel` in `js/analytics.js` rather than editing any page. Keep the existing `AW-17948622134` ID.
4. Make the two actions **Primary** for bidding unless verified completed-call tracking is intentionally the stronger phone source.
5. Edit the **Page views** goal: turn off **Account default** and set its actions to **Secondary (observe only)**, or remove it from the campaign's selected goals. Page views must not be a primary lead goal.
6. Check the **Search - Hydro Excavation - Canberra** campaign's goal settings. It should optimize for the Contact and Submit lead form actions, not Page views or estimator opening.
7. If Google forwarding-number website-call tracking or Google Ads call-asset reporting is enabled, decide which phone action is primary so a click and a later completed/qualified call are not both used as duplicate primary outcomes. Call-asset duration rules are configured in Google Ads and are separate from this website click signal.
8. Do not also import the same phone/estimator events from GA4 while the direct labeled Ads events are primary. If the account later moves to GA4-imported conversions, disable the corresponding direct Ads destinations first.
