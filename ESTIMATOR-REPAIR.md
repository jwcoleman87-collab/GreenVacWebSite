# Estimator customer-flow repair — September 2026

## Behaviour

- Same-job reselection preserves all answers. A different job clears only incompatible measurements and acceptance, retaining contact, site and photos.
- Browser history follows estimator screens. Direct Edit buttons lead to job, measurement, site and contact sections.
- Drafts are scoped to the browser tab and expire after 24 hours. IndexedDB stores photos; sessionStorage keeps text fallback and the draft reference. Restricted-storage failures are explained. Sent drafts retain only the reference/receipt, not customer details/photos.
- Adding photos appends rather than replaces. Up to five supported images, 5 MB each. Real thumbnails appear on contact and review screens; each can be removed.
- Australian mobile numbers and optional emails are validated. Answer changes require acceptance again. Sending is locked against duplicate clicks and navigation during the request.
- Existing rates are retained; missing scope/disposal review gates are repaired. See ESTIMATOR-PRICING.md.

## Generated image assets

Created with the built-in image-generation tool. These are examples, not photographs of completed GreenVac jobs; their cards say “Illustrative example”. Existing real service photographs and precise measurement diagrams are retained.

- `images/illustrated-pit-cleaning.webp`: landscape pit/drain cleaning illustration, concrete stormwater pit in an Australian residential driveway, lifted grate, black vacuum hose removing silt; muted eucalyptus/earth palette, no people, text or branding.
- `images/illustrated-job-planning.webp`: landscape gouache illustration, clipboard with unlabelled garden digging-route sketch, tape measure and green work gloves on a timber workbench; eucalyptus background, no people, branding or lettering.

Responsive crops are reproducible with `python make_estimator_images.py` and the image manifest records actual dimensions.

## Limits

The browser test intercepts delivery; it verifies the payload and success/error handling, not the external mail provider's inbox delivery. The external provider does not expose an idempotency contract here; a retry after an ambiguous network failure can still create a duplicate email, identifiable by the same estimate reference.
