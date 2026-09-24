# GreenVac estimator pricing basis

Current implementation: `get-a-quote-src/src/App.jsx`. Customer prices exclude GST.

## Commercial arithmetic

- Onsite labour: $165/hour, three-hour minimum ($495).
- Travel: $110 per automatically priced job, added after the labour buffer.
- Upper range: 15% on onsite labour only.
- Known spoil removal: $85/m³, added unchanged to both ends of the range.
- Round each final total upward to the next $10.
- Standard physical trench width: 300 mm; narrow: 150 mm. The diagrams match these values.
- Trench spoil volume: length × physical width × physical depth. No bulking factor is applied.
- Existing job production rates and site multipliers are retained.

## Automatic pricing limits

Return no price and request James's review when:

- Removal exceeds 1 m³, for **all** job types including measured trenches.
- Removal quantity, trench width or trench depth is unknown when removing spoil.
- Whether spoil is to be left or removed is unknown.
- A trench exceeds 30 m, or calculated attendance exceeds eight hours (one working day).
- Spot count is unknown, invalid or over ten.
- An under-obstacle route is 5 m or longer, or its length is unknown.
- The job is Something Else or a retired cattle-grid selection.
- The suburb is outside the named core area or the optional postcode is invalid/outside its permitted area.

A postcode cannot override an out-of-area suburb; an ambiguous suburb cannot override an out-of-area postcode. This is a conservative service-area check, not address verification. Unrecognised locations go to James.

Unknown access, ground or services still use existing allowances, with a clear warning that the final price may change after review. No claim is made that the range covers every unknown.

## Verified examples, excluding GST

| Scenario | Expected result |
| --- | --- |
| Minimum job, leave spoil onsite | $610–$680 |
| 20 m electrical, 600 mm, standard, open/normal/clear, leave onsite | $820–$930 |
| Same trench, narrow access/hard ground/services nearby | $1,230–$1,390 |
| 9 m electrical, 300 mm, standard, remove 0.81 m³ | $680–$750 |
| Same 9 m trench, narrow, remove 0.405 m³ | $640–$720 |
| 20 m electrical, 600 mm, standard, remove 3.6 m³ | Manual review; no price |
| Remove spoil with unknown quantity or dimensions | Manual review; no price |
| 60 m trench | Manual review; no price |

## Presentation and tracking

Customers see the total range, job selections, removal/left onsite and travel inclusion. Unit rates, spoil calculations and internal assumptions are kept out of customer results. Owner notifications retain known internal workings; manual-review requests do not represent unpriced removal as free.

Every draft receives a `GV-YYYYMMDD-<random identifier>` reference, retained through edits, reloads and retries and included in the owner email, submitted fields and receipt. Starting a new estimate creates a new reference. This is a browser-generated identifier, not a sequential invoice number.

## Verification

From `get-a-quote-src`:

- `npm run build`
- `npm test`
- `npx playwright install chromium` (once, if no browser is installed)
- `npm run test:browser`

Browser verification serves the actual production bundle locally and intercepts all external traffic. Submission failures and success are simulated; no email or advertising conversion is sent. Set `CHROMIUM_PATH` to use an existing Chromium executable.
