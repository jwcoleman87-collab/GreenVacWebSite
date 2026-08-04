# GreenVac estimator pricing basis

This document records the estimator pricing basis approved for production in August 2026. It is not a formal customer quote.

All estimator figures are exclusive of GST. The result and review screens state `+ GST`, the enquiry body states `+ GST`, and the submitted low/high fields each state `+ GST`.

## Commercial calculation

- Onsite hourly rate: `$165 + GST`.
- Minimum onsite attendance: `3 hours`.
- Minimum onsite labour: `$165 x 3 = $495 + GST`.
- Fixed travel charge: `$110 + GST` on every automatically calculated job.
- Exact minimum before rounding: `$495 + $110 = $605 + GST`.
- Lower result: the greater of calculated onsite labour and `$495`, plus `$110` travel, rounded upward to the next `$10` increment.
- Upper result: the unrounded lower onsite labour times `1.15`, plus the same `$110` travel, rounded upward to the next `$10` increment.
- Minimum displayed range: `$610-$680 + GST`.
- Normal-area attendance assumes Braidwood, Bungendore, Queanbeyan or Canberra/ACT. Locations outside that area still require review rather than receiving an invented travel price.

The pricing engine remains in `get-a-quote-src/src/App.jsx`, beginning at `const RATE`. Tests execute that production function directly rather than maintaining a second calculator.

## Retained production assumptions

| Constant | Production value | Purpose |
| --- | ---: | --- |
| `RATE` | `$165/onsite hour` | The only executable hourly rate. |
| `MINIMUM_ONSITE_HOURS` | `3` | Minimum onsite rig/operator attendance. |
| `MINIMUM_ONSITE_LABOUR` | `RATE * MINIMUM_ONSITE_HOURS` (`$495`) | The single executable onsite-labour floor. |
| `FIXED_TRAVEL_CHARGE` | `$110` | Added unchanged to both completed figures after the onsite buffer. |
| `RANGE_BUFFER` | `0.15` | Adds 15% to onsite labour only. |
| Rounding increment | `$10` | `Math.ceil(value / 10) * 10`; never rounds down. |
| Trench setup | `1.5 hours` | Retained setup allowance for trenching. |
| NDD/pothole setup | `1.25 hours` | Retained setup allowance for spot work. |
| Leak setup | `1.0 hour` | Retained leak-exposure setup allowance. |
| Pit setup | `1.25 hours` | Retained pit-cleanout setup allowance. |
| Short-obstacle setup | `1.5 hours` | Retained setup allowance for routes under 5 m. |
| Spot production | `0.75 hours/spot` | Applied to the exact selected count from 1 to 10. |
| Exposure depth | shallow `0.95`; deep `1.20`; unsure `1.20` | Known modifiers retained. Unknown uses the deepest known allowance and is flagged for review. |
| Trench depth | 300 mm `0.90`; 450 mm `1.00`; 600 mm `1.10`; 800 mm `1.20`; unsure/custom `1.35` | Retained depth multipliers. |
| Trench width | narrow `1.00`; standard `1.05`; wide `1.15`; unsure/custom `1.20` | Retained width multipliers. |
| Access | open `1.00`; narrow `1.05`; very tight `1.25`; unsure `1.10` | Retained site multiplier. |
| Ground | normal/soft `1.00`; hard `1.20`; unsure `1.10` | Retained site multiplier. |
| Nearby services | clear `1.00`; services nearby `1.25`; unsure `1.10` | Retained site multiplier. |
| Trench production | electrical `0.12`; plumbing `0.11`; data/comms `0.10`; irrigation `0.09`; custom/not sure `0.12` hours/metre | Retained service-specific production rates. |
| Pit production | small: `0.75/1.25/1.00`; medium fallback: `1.00/1.75/1.25`; large: `1.50/2.50/2.00`; unknown size: `1.00/1.75/1.25` hours for light/heavy/unsure fill | Retained pit hours. |
| Leak production | localised `2.0`; wide `4.5`; unsure `3.0` hours | Retained leak hours; non-localised choices remain flagged for review. |
| Short obstacle production | `2.5 hours` | Retained only for confirmed routes under 5 m. |

Site multipliers remain multiplicative: `(setup hours + production hours) x $165 x access x ground x nearby-services`. The result calculation is `onsiteLow = max(calculatedOnsiteLabour, $495)`, `onsiteHigh = onsiteLow x 1.15`, then `$110` is added independently to both before upward rounding.

The retired `$260` cattle-grid rate, `$650` internal floor, `$790` display floor and flat `$80` travel allowance have no executable pricing path.

## Scenario comparison

All figures below exclude GST. “Before” is the production calculation at `a1d3fa1`; “After” is calculated directly by the final revised production function.

| Scenario | Before | After |
| --- | ---: | ---: |
| Any floor-priced job | `$790-$910` | `$610-$680` |
| 5 m irrigation trench, 300 mm, easiest conditions | `$790-$910` | `$610-$680` |
| 20 m electrical trench, 600 mm, standard width, open/normal/clear | `$1,000-$1,150` | `$820-$930` |
| Same 20 m trench, narrow access, hard ground and services nearby | `$1,580-$1,820` | `$1,230-$1,390` |
| Three shallow potholes, neutral conditions | `$800-$920` | `$670-$760` |
| Three deep potholes, neutral conditions | `$930-$1,070` | `$770-$860` |
| Four deep potholes, neutral conditions | `$1,140-$1,310` | `$920-$1,040` |
| Known leak location, neutral conditions | `$790-$910` | `$610-$680` |
| Large heavily filled pit, neutral conditions | `$880-$1,010` | `$730-$830` |
| Under obstacle, less than 5 metres, neutral conditions | `$940-$1,080` | `$770-$870` |
| 60 m electrical trench, 600 mm, standard width, open/normal/clear | `$2,310-$2,660` | `$1,730-$1,980` |

## Revised scenario arithmetic

Every final rounding operation is upward to a `$10` increment.

1. Any floor-priced job: `onsiteLow = $495`; `onsiteHigh = $495 x 1.15 = $569.25`; totals are `$605 -> $610` and `$679.25 -> $680` after adding `$110` travel.
2. 5 m irrigation, 300 mm, narrow/easiest: production `= 5 x 0.09 x 0.90 x 1.00 = 0.405 h`; calculated onsite labour `= (1.5 + 0.405) x $165 = $314.325`; onsite floor gives `$495/$569.25`; plus `$110` gives `$610-$680`.
3. 20 m electrical, 600 mm, standard, open/normal/clear: production `= 20 x 0.12 x 1.10 x 1.05 = 2.772 h`; onsite labour `= 4.272 x $165 = $704.88`; upper onsite `= $810.612`; plus `$110` gives `$814.88 -> $820` and `$920.612 -> $930`.
4. Same 20 m trench, narrow access/hard/services: base onsite labour `= $704.88`; site multiplier `= 1.05 x 1.20 x 1.25 = 1.575`; adjusted onsite labour `= $1,110.186`; upper onsite `= $1,276.7139`; plus `$110` gives `$1,220.186 -> $1,230` and `$1,386.7139 -> $1,390`.
5. Three shallow potholes: production `= 3 x 0.75 x 0.95 = 2.1375 h`; onsite labour `= (1.25 + 2.1375) x $165 = $558.9375`; upper onsite `= $642.778125`; plus `$110` gives `$668.9375 -> $670` and `$752.778125 -> $760`.
6. Three deep potholes: production `= 3 x 0.75 x 1.20 = 2.70 h`; onsite labour `= 3.95 x $165 = $651.75`; upper onsite `= $749.5125`; plus `$110` gives `$761.75 -> $770` and `$859.5125 -> $860`.
7. Four deep potholes: production `= 4 x 0.75 x 1.20 = 3.60 h`; onsite labour `= 4.85 x $165 = $800.25`; upper onsite `= $920.2875`; plus `$110` gives `$910.25 -> $920` and `$1,030.2875 -> $1,040`.
8. Known leak location: onsite labour `= (1.0 + 2.0) x $165 = $495`; upper onsite `= $569.25`; plus `$110` gives `$605 -> $610` and `$679.25 -> $680`.
9. Large heavily filled pit: onsite labour `= (1.25 + 2.5) x $165 = $618.75`; upper onsite `= $711.5625`; plus `$110` gives `$728.75 -> $730` and `$821.5625 -> $830`.
10. Under obstacle, less than 5 m: onsite labour `= (1.5 + 2.5) x $165 = $660`; upper onsite `= $759`; plus `$110` gives `$770` and `$869 -> $870`.
11. 60 m electrical, 600 mm, standard, open/normal/clear: production `= 60 x 0.12 x 1.10 x 1.05 = 8.316 h`; onsite labour `= 9.816 x $165 = $1,619.64`; upper onsite `= $1,862.586`; plus `$110` gives `$1,729.64 -> $1,730` and `$1,972.586 -> $1,980`.

## No-price manual-review routes

These results have `low: null` and `high: null`, display no price, submit empty low/high fields, and explain why James needs to review them:

- Something Else.
- More than 10 potholes/NDD spots.
- Unknown or historically ambiguous spot counts.
- Spoil removal or uncertainty about spoil handling; disposal depends on volume, material and tipping arrangements.
- Digging under an obstacle for 5 metres or more, or an uncertain distance.
- Trenching over 100 metres.
- Retired cattle-grid state.
- Locations outside Braidwood, Bungendore, Queanbeyan and Canberra/ACT, so travel can be reviewed without inventing a charge.

Unknown access, ground, nearby services, trench dimensions and pothole depth continue through the retained conservative multiplier structure and are visibly flagged for James to review. Unknown pothole depth uses `1.20`, matching the deepest known choice, so it cannot produce a cheaper estimate.
