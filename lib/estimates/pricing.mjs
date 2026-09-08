// Shared by the website and server. Prices remain ex-GST internally.
const RATE = 165;
const MINIMUM_ONSITE_HOURS = 3;
const MINIMUM_ONSITE_LABOUR = RATE * MINIMUM_ONSITE_HOURS;
const FIXED_TRAVEL_CHARGE = 110;
const RANGE_BUFFER = 0.15;
const SPOIL_REMOVAL_RATE = 85;
const MINIMUM_SPOIL_VOLUME_M3 = 0.25;

// Physical trench dimensions are used only to calculate spoil volume. The
// separate widthMod and depthMod tables below remain the labour-productivity
// inputs and must not be replaced with these metre values.
const TRENCH_WIDTH_METRES = { narrow: 0.15, standard: 0.30, custom: 0.30 };
const TRENCH_DEPTH_METRES = {
  "300mm": 0.30,
  "450mm": 0.45,
  "600mm": 0.60,
  "800mm": 0.80,
};

const spoilVolumeCards = [
  { id: "small", label: "Small", sub: "0.25 m³", cubicMetres: 0.25, art: "spoil-remove" },
  { id: "medium", label: "Medium", sub: "0.50 m³", cubicMetres: 0.50, art: "spoil-remove" },
  { id: "large", label: "Large", sub: "0.75 m³", cubicMetres: 0.75, art: "spoil-remove" },
  { id: "full-load", label: "Full Load", sub: "1.00 m³", cubicMetres: 1.00, art: "spoil-remove" },
  {
    id: "more-than-1",
    label: "More Than 1.00 m³",
    sub: "James will review the number of loads",
    art: "spots-many",
  },
  {
    id: "unsure",
    label: "Not Sure",
    sub: "Estimate using the minimum 0.25 m³",
    art: "unsure",
    quiet: true,
  },
];

const depthMod = {
  "300mm": 0.90,
  "450mm": 1.00,
  "600mm": 1.10,
  "800mm": 1.20,
  custom: 1.35,
};
const widthMod = { narrow: 1.00, standard: 1.05, wide: 1.15, custom: 1.20 };
const accessMod = { open: 1.00, side: 1.05, difficult: 1.25, unsure: 1.10 };
const groundMod = { normal: 1.00, hard: 1.20, unsure: 1.10 };
const congestionMod = { clear: 1.00, congested: 1.25, unsure: 1.10 };
const exposureDepthMod = { shallow: 0.95, deep: 1.20, unsure: 1.20 };
const trenchRates = {
  "Electrical Trench": 0.12,
  "Plumbing Trench": 0.11,
  "Data / Comms Trench": 0.10,
  "Irrigation Trench": 0.09,
  "Custom Trench": 0.12,
  "Not Sure": 0.12,
};
const pitHours = {
  small: { light: 0.75, heavy: 1.25, unsure: 1.00 },
  medium: { light: 1.00, heavy: 1.75, unsure: 1.25 },
  large: { light: 1.50, heavy: 2.50, unsure: 2.00 },
  unsure: { light: 1.00, heavy: 1.75, unsure: 1.25 },
};
const obstacleShortHours = 2.5;
const leakHours = { localised: 2.0, wide: 4.5, unsure: 3.0 };

function emptySpoilRemoval() {
  return {
    active: false,
    volumeM3: 0,
    ratePerM3: SPOIL_REMOVAL_RATE,
    cost: 0,
    volumeAssumed: false,
    assumptionType: null,
    assumptionNote: null,
    source: null,
  };
}

function trimDecimal(value, places = 3) {
  return Number(value.toFixed(places)).toString();
}

function formatSpoilCost(value) {
  // Customer-facing standalone costs use normal half-up cent rounding. The
  // estimate calculation continues to use the untouched unrounded value.
  return (Math.round((Number(value) + 1e-9) * 100) / 100).toFixed(2);
}

function getSpoilVolumeOption(id) {
  return spoilVolumeCards.find((option) => option.id === id);
}

function calculateSpoilRemoval(ans) {
  if (ans.spoil !== "remove-all") return emptySpoilRemoval();

  let volumeM3;
  let volumeAssumed = false;
  let assumptionType = null;
  let assumptionNote = null;
  let source;

  if (ans.jobType === "trenching") {
    const lengthM = Number(ans.metres || 5);
    const widthM = TRENCH_WIDTH_METRES[ans.width];
    const depthM = TRENCH_DEPTH_METRES[ans.depth];

    if (lengthM > 0 && widthM > 0 && depthM > 0) {
      volumeM3 = lengthM * widthM * depthM;
      source = "trench-dimensions";

      if (ans.width === "custom") {
        volumeAssumed = true;
        assumptionType = "standard-width";
        assumptionNote =
          "Spoil removal has been estimated using the standard trench width of 0.30 m because the width was Not Sure. James will confirm the actual width before work begins.";
      }
    } else {
      volumeM3 = MINIMUM_SPOIL_VOLUME_M3;
      volumeAssumed = true;
      assumptionType = "minimum-volume";
      source = "minimum-volume";
    }
  } else {
    const volumeOption = getSpoilVolumeOption(ans.spoilVolume);
    if (volumeOption?.cubicMetres) {
      volumeM3 = volumeOption.cubicMetres;
      source = "selected-volume";
    } else {
      volumeM3 = MINIMUM_SPOIL_VOLUME_M3;
      volumeAssumed = true;
      assumptionType = "minimum-volume";
      source = "minimum-volume";
    }
  }

  if (assumptionType === "minimum-volume") {
    assumptionNote =
      "Spoil removal has been estimated using the minimum volume of 0.25 m³. James will confirm the actual quantity before work begins.";
  }

  return {
    active: true,
    volumeM3,
    ratePerM3: SPOIL_REMOVAL_RATE,
    cost: volumeM3 * SPOIL_REMOVAL_RATE,
    volumeAssumed,
    assumptionType,
    assumptionNote,
    source,
  };
}

function getSpoilRemovalSummaryRows(estimate) {
  const removal = estimate.spoilRemoval;
  if (!removal?.active) return [];

  const rows = [
    {
      label: "Estimated spoil removal",
      value: `${trimDecimal(removal.volumeM3)} m³ × $${removal.ratePerM3} = $${formatSpoilCost(removal.cost)} + GST`,
    },
  ];

  if (removal.assumptionNote) {
    rows.push({ label: "Spoil assumption", value: removal.assumptionNote });
  }

  return rows;
}

// Suburb is mandatory but postcode is optional, so the named ACT localities
// keep ordinary Canberra jobs automatic even when the visitor omits a postcode.
// Exact matching is deliberate: an address such as "Yass Street" must not turn
// a Canberra job into an out-of-area result.
const CORE_AREA_NAMES = new Set([
  "act",
  "acton",
  "ainslie",
  "amaroo",
  "aranda",
  "banks",
  "barton",
  "beard",
  "belconnen",
  "bonner",
  "bonython",
  "braddon",
  "braidwood",
  "bruce",
  "bungendore",
  "calwell",
  "campbell",
  "canberra",
  "canberra airport",
  "canberra city",
  "capital hill",
  "casey",
  "chapman",
  "charnwood",
  "chifley",
  "chisholm",
  "city",
  "civic",
  "conder",
  "cook",
  "coombs",
  "crace",
  "crestwood",
  "curtin",
  "deakin",
  "denman prospect",
  "dickson",
  "downer",
  "duffy",
  "dunlop",
  "duntroon",
  "evatt",
  "fadden",
  "farrer",
  "fisher",
  "florey",
  "flynn",
  "forde",
  "forrest",
  "franklin",
  "fraser",
  "fyshwick",
  "garran",
  "gilmore",
  "googong",
  "gungahlin",
  "gordon",
  "gowrie",
  "greenway",
  "griffith",
  "hackett",
  "hall",
  "harrison",
  "hawker",
  "higgins",
  "holder",
  "holt",
  "hughes",
  "hume",
  "isaacs",
  "isabella plains",
  "jacka",
  "jerrabomberra",
  "kaleen",
  "kambah",
  "karabar",
  "kenny",
  "kingston",
  "latham",
  "lawson",
  "lyneham",
  "lyons",
  "macarthur",
  "macgregor",
  "macnamara",
  "mawson",
  "mckellar",
  "melba",
  "mitchell",
  "molonglo valley",
  "monash",
  "moncrieff",
  "narrabundah",
  "ngunnawal",
  "nicholls",
  "o'connor",
  "o'malley",
  "oaks estate",
  "oxley",
  "page",
  "palmerston",
  "parkes",
  "pearce",
  "phillip",
  "pialligo",
  "queanbeyan",
  "queanbeyan east",
  "queanbeyan west",
  "red hill",
  "reid",
  "richardson",
  "rivett",
  "russell",
  "scullin",
  "spence",
  "stirling",
  "strathnairn",
  "symonston",
  "taylor",
  "theodore",
  "throsby",
  "torrens",
  "tuggeranong",
  "turner",
  "uriarra village",
  "wanniassa",
  "waramanga",
  "watson",
  "weetangera",
  "weston",
  "weston creek",
  "whitlam",
  "woden",
  "woden valley",
  "wright",
  "yarralumla",
]);

function normalizeArea(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s+(?:australian capital territory|new south wales|act|nsw)$/i, "")
    .trim();
}

function isCoreOperatingArea(ans) {
  const postcodeMatch = String(ans.postcode || "").match(/\b\d{4}\b/);
  if (postcodeMatch) {
    const postcode = Number(postcodeMatch[0]);
    if (
      (postcode >= 2600 && postcode <= 2618) ||
      (postcode >= 2900 && postcode <= 2920) ||
      postcode === 2620 ||
      postcode === 2621 ||
      postcode === 2622
    ) {
      return true;
    }
  }

  return CORE_AREA_NAMES.has(normalizeArea(ans.suburb));
}

function manualEstimate(reviewReason) {
  return {
    low: null,
    high: null,
    labour: 0,
    travel: 0,
    spoilRemoval: emptySpoilRemoval(),
    needsReview: true,
    manualOnly: true,
    reviewReason,
  };
}

function getManualReviewReason(ans) {
  if (ans.jobType === "other") {
    return "This job sits outside the work the estimator can measure reliably. James will read the details and work out a useful ballpark himself.";
  }

  if (ans.jobType === "cattle-grid") {
    return "Cattle grid cleaning is not available through the estimator. James needs to review the job before discussing price or availability.";
  }

  if (ans.jobType === "trenching" && Number(ans.metres || 5) > 100) {
    return "Trenches over 100 metres need a scope review before pricing. James will check the route, staging and site conditions rather than guess at a number.";
  }

  if (ans.jobType === "service-exposure" || ans.jobType === "potholing") {
    const count = Number(ans.exposureCount);
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      return ans.exposureCount === "more-than-10" || count > 10
        ? "More than 10 spots needs a scope review so James can assess the locations and likely staging before pricing it."
        : "An exact approximate count from 1 to 10 is needed for a reliable ballpark. James can help work that out from the job details.";
    }
  }

  if (ans.jobType === "tunnel-bore" && ans.boreDist !== "short") {
    return "Routes of 5 metres or more, or an uncertain distance, need James to review the obstacle and site before working out a useful ballpark.";
  }

  if (
    ans.spoil === "remove-all" &&
    ans.jobType !== "trenching" &&
    ans.spoilVolume === "more-than-1"
  ) {
    return "More than 1.00 cubic metre of spoil may require additional loads. James will review the quantity before pricing removal.";
  }

  if (ans.spoil === "unsure") {
    return "Whether spoil should stay onsite or be removed is not yet known. James will review that choice before pricing the job.";
  }

  const hasLocation = Boolean(ans.suburb?.trim() || ans.postcode?.trim());
  if (hasLocation && !isCoreOperatingArea(ans)) {
    return "This location is outside GreenVac's normal Braidwood, Bungendore, Queanbeyan and Canberra/ACT operating area. James will review the travel before pricing it.";
  }

  return null;
}

function roundUpToTen(value) {
  return Math.ceil(value / 10) * 10;
}

function calcEstimate(ans) {
  const jobType = ans.jobType;

  // Open-ended, disposal-heavy, retired and out-of-area work stops before any
  // rate, hours or multiplier is touched. These jobs get a useful explanation,
  // not a partial price that omits the uncertain part.
  const manualReviewReason = getManualReviewReason(ans);
  if (manualReviewReason) return manualEstimate(manualReviewReason);

  let setupHours = 0;
  let productionHours = 0;
  let needsReview = false;

  const accessMultiplier = accessMod[ans.access] || 1.00;
  const groundMultiplier = groundMod[ans.ground] || 1.00;
  const congestionMultiplier = congestionMod[ans.congestion] || 1.00;
  const combinedMultiplier = accessMultiplier * groundMultiplier * congestionMultiplier;

  if (jobType === "trenching") {
    setupHours = 1.5;
    const metres = ans.metres || 5;
    const hoursPerMetre = trenchRates[ans.subtype] || 0.12;
    productionHours =
      metres *
      hoursPerMetre *
      (depthMod[ans.depth] || 1.00) *
      (widthMod[ans.width] || 1.00);
    if (ans.depth === "custom" || ans.width === "custom" || ans.subtype === "Not Sure") {
      needsReview = true;
    }
  } else if (jobType === "service-exposure" || jobType === "potholing") {
    setupHours = 1.25;
    const count = Number(ans.exposureCount);
    // The unknown choice deliberately uses the deepest known allowance. It is
    // therefore never cheaper than either known depth and remains flagged for
    // James to review.
    const depthMultiplier = exposureDepthMod[ans.exposureDepth] || exposureDepthMod.unsure;
    productionHours = count * 0.75 * depthMultiplier;
    if (
      ans.exposureDepth === "unsure" ||
      ans.subtype === "Not Sure"
    ) {
      needsReview = true;
    }
  } else if (jobType === "leak-exposure") {
    setupHours = 1.0;
    productionHours = leakHours[ans.leakArea] || 3.0;
    if (ans.leakArea !== "localised") needsReview = true;
  } else if (jobType === "pit-cleanout") {
    setupHours = 1.25;
    productionHours = (pitHours[ans.pitSize] || pitHours.medium)[ans.pitFill] || 1.0;
    if (ans.pitSize === "unsure" || ans.pitFill === "unsure") needsReview = true;
  } else if (jobType === "tunnel-bore") {
    setupHours = 1.5;
    productionHours = obstacleShortHours;
    if (ans.subtype === "Not Sure") needsReview = true;
  }

  if (
    ans.access === "unsure" ||
    ans.ground === "unsure" ||
    ans.congestion === "unsure"
  ) {
    needsReview = true;
  }

  const adjustedLabour =
    (setupHours + productionHours) *
    RATE *
    combinedMultiplier;

  const spoilRemoval = calculateSpoilRemoval(ans);
  if (spoilRemoval.volumeAssumed) needsReview = true;

  const onsiteLow = Math.max(MINIMUM_ONSITE_LABOUR, adjustedLabour);
  const onsiteHigh = onsiteLow * (1 + RANGE_BUFFER);
  const low = roundUpToTen(onsiteLow + FIXED_TRAVEL_CHARGE + spoilRemoval.cost);
  const high = roundUpToTen(onsiteHigh + FIXED_TRAVEL_CHARGE + spoilRemoval.cost);

  return {
    low,
    high,
    labour: Math.round(adjustedLabour),
    travel: FIXED_TRAVEL_CHARGE,
    spoilRemoval,
    needsReview,
    manualOnly: false,
    reviewReason: null,
  };
}

export { calcEstimate, spoilVolumeCards, getSpoilVolumeOption, trimDecimal, formatSpoilCost };
