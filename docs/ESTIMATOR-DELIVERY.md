# Branded estimator delivery

Implementation based on main commit `6cbe245608f1609c9f5375035d4f41ac2fbba428`.

## What changed

The result, review and receipt screens use a GreenVac estimate sheet: original logo, GST-inclusive price range, selected job dimensions and conditions, plain-English inclusions and cost reasons. Customer output is an explicit allow-list, not the raw calculation. The estimate remains non-binding and does not book a job. Manual-pricing jobs display no price or implied inclusions.

The site has a Print / save as PDF control. Standard sample estimates fit one A4 page; unusually long free-text descriptions may flow onto another page rather than being silently cut off. PDF saving uses the customer's print dialog. This implementation does **not** attach a generated PDF automatically to emails.

The new server route sends two separate HTML/plain-text emails. James receives an actionable job card, real resized photo attachments, and a clearly labelled **private** JSON job/calculation record. Customers receive only the customer sheet, never the private record or site-photo attachments. No CRM or persistent quote-link storage has been introduced. The retained record is in James's email, not a new database.

The calculator was moved, without arithmetic changes, to `lib/estimates/pricing.mjs` and is used by both browser and server. The server ignores client-supplied prices, recipients, HTML and unrelated fields. Site images, the questionnaire, cancellation and lead analytics remain in place. The estimator alone stops using generic FlowForm delivery; other website forms are unchanged.

## Release gate — do not merge and launch with sending disabled

No production credentials, sender-domain settings, real customer emails or production deployment were used during implementation. The branch is for review. Existing production remains unchanged.

Before merging, configure and verify the server-only settings in `.env.example` on the correct Vercel project/environment:

- A Resend API key and **verified GreenVac sender** in `ESTIMATOR_FROM`. Do not use a customer address as From. Do not expose the key to Vite/browser code.
- An Upstash Redis REST URL and token, plus a strong random `ESTIMATOR_RATE_LIMIT_SALT`. These are used only for short-lived hashed-IP/global request counters, not job storage. Default limits are five submissions per IP per 15 minutes and 100 globally per hour. Review these limits before launch.
- Exact permitted origins in `ESTIMATOR_ALLOWED_ORIGINS`. Add a specific non-production URL for controlled testing, never `*`. IP handling assumes Vercel's trusted `x-real-ip` header; another host requires a trusted-proxy adapter.
- Set `ESTIMATOR_EMAILS_ENABLED=true` only after the settings above are present. Missing settings or a failed limiter fail closed with a visible error and a manual email/phone option. The site never claims a request was received when this happens.

Use an approved test recipient to check sender authentication, customer/admin rendering, reply addresses, photo attachments, no-email submissions, manual pricing, rate-limit behavior and provider failures. This is a transactional customer copy, not consent to marketing. Do not replace the live sending path before these checks succeed. Provider acceptance is not proof of mailbox delivery; inspect delivery/bounce events and actual inboxes.

Resend idempotency keys prevent duplicate provider requests within its documented 24-hour window. They are distinct for the customer and James, and deterministic for unchanged retry payloads. This is not permanent exactly-once storage. A failed customer copy after James's message is accepted shows partial success and tells the customer not to resubmit the job.

No paid service was provisioned and no subscription or billing change was made. Verify the chosen provider accounts and plans before activation.

## Verification

```sh
npm ci --prefix get-a-quote-src
npm run build --prefix get-a-quote-src
node --test tests/*.test.cjs
```

109 tests pass locally, including 19 new delivery/presentation tests. The golden regression check compares all fields of 15,552 calculation results against the original main commit; every result matches. Existing lead and cancellation tests remain. Tests which previously required internal pricing formulas on customer screens were replaced with the approved customer-only/GST-inclusive contract, not removed without replacement.

Browser checks use the actual built bundle in Chromium with local embedded assets and mocked submission responses; no external request is sent. Run `python tests/estimate-browser-review.py` in an environment with Python Playwright and `/usr/bin/chromium`. It writes to ignored `review-output/`. Checked: 320/390/768/1440px layouts, no horizontal overflow, price visible before contact entry, ordinary/manual results and receipts, photo serialization, failure/retry, and partial customer-email failure. The standard example PDF was rendered, inspected and verified to be one A4 page. Both email templates were also rendered at 320px and 700px; no horizontal overflow.

These checks do not certify live delivery, iOS Safari, Gmail/Outlook rendering, provider account configuration or production Vercel function packaging. The recorded browser checks are local, not a claim that they run in GitHub CI.

The GitHub workflow rebuilds the checked-in estimator assets, runs Node tests, and checks that a rebuild does not change the shipped bundle. No merge or production deployment is part of that workflow.

## Files

- `lib/estimates/catalog.mjs`: unchanged choice IDs and shared display labels.
- `lib/estimates/pricing.mjs`: original ex-GST pricing calculation.
- `lib/estimates/presentation.mjs`: customer allow-list, job card and email renderers.
- `lib/estimates/delivery.mjs`: validation, limits, authoritative calculation and separate sends.
- `api/estimate.js`: Vercel Node adapter.
- `get-a-quote-src/src/EstimateSheet.jsx` and `estimate-sheet.css`: customer screen/print layout.
- `get-a-quote-src/src/estimate-delivery.js`: allow-listed submission and photo resizing.
- `tests/estimate-delivery.test.cjs`: delivery, isolation, validation and pricing parity.

## Provider references

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://upstash.com/docs/redis/features/restapi
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/headers/request-headers
- https://vercel.com/kb/guide/handling-node-request-body
