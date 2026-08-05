import { useEffect, useRef, useState } from "react";

import { ESTIMATOR_IMAGES } from "./estimator-images.js";
import {
  cancelEventName,
  cancelPayload,
  featuredJobs as pickFeaturedJobs,
  hasUncertainSiteAnswer,
  isContactStepReady,
  isDetailStepReady,
  isJobStepReady,
  isSiteStepReady,
  selectJobType,
  selectedExtraJob,
  stepIdFor,
  visibleExtraJobs,
} from "./estimator-state.js";

const FORM_ENDPOINT = "https://flowform.to/submit";
const TOTAL_STEPS = 7;
const HOME_URL = "/";

// Development-only submission stub, so the confirmation screen can be reached
// and inspected without sending a real enquiry to James.
//
// `import.meta.env.DEV` is replaced with the literal `false` by `vite build`,
// which makes this a constant-false expression that Rollup folds away and then
// tree-shakes, taking mockSubmission with it. Nothing reaches production --
// tests/estimator-experience.test.cjs greps the shipped bundle to prove it.
//
// FAIL-SAFE BY DESIGN. An earlier version opted *in* to mocking with a query
// flag and sent a real enquiry to James the moment the dev server dropped the
// query string. So a development build now never posts unless someone opts
// explicitly *out*: anything unrecognised, stripped or misspelt means mock.
// The opt-out lookup is written inside the short-circuit on purpose: Rollup
// cannot prove `new URLSearchParams(...)` is side-effect free, so hoisting it to
// its own const would keep the string in the bundle even once it is unused.
const MOCK_SUBMIT =
  import.meta.env.DEV &&
  !new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).has("realSubmit");

async function mockSubmission() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { ok: true, json: async () => ({ success: true }) };
}

// Customer-facing job categories. The first three are deliberately featured;
// everything else sits behind one "More Job Types" disclosure.
//
// `id` values are pricing inputs -- calcEstimate reads them directly -- so they
// are never renamed. `hidden` retires an option from the customer-facing list
// while leaving its id and descriptive fields available for historic state.
const jobTypes = [
  {
    id: "service-exposure",
    label: "Non-Destructive Digging",
    shortLabel: "NDD",
    desc: "Safely dig around services, roots and structures.",
    photo: "ndd-services-and-roots",
    featured: true,
  },
  {
    id: "trenching",
    label: "Trenching",
    shortLabel: "Trenching",
    desc: "Narrow trenches for electrical, plumbing and drainage.",
    photo: "hero-narrow-trench",
    featured: true,
  },
  {
    id: "potholing",
    label: "Potholing",
    shortLabel: "Potholing",
    desc: "Small, targeted digs to locate underground services.",
    photo: "service-potholing-card",
    featured: true,
  },
  {
    id: "leak-exposure",
    label: "Expose a Leak",
    shortLabel: "Leak exposure",
    desc: "Careful excavation around a suspected leaking pipe.",
    photo: "service-leak",
    featured: false,
  },
  {
    id: "tunnel-bore",
    label: "Dig Under an Obstacle",
    shortLabel: "Under an obstacle",
    desc: "A route beneath a path, footing, driveway or root system.",
    photo: "hero-great-trenching",
    featured: false,
  },
  {
    id: "pit-cleanout",
    label: "Pit or Drain Cleaning",
    shortLabel: "Pit cleaning",
    desc: "Remove silt, debris and sludge from pits and drains.",
    // No honest pit cleanout photograph exists yet -- the previous one was
    // actually a cattle grid. A branded diagram stands in until James supplies
    // a real photo of a pit or drain being cleaned.
    art: "pit",
    featured: false,
  },
  {
    id: "other",
    label: "Something Else",
    shortLabel: "Something else",
    desc: "Tell us roughly what it is and James will price it himself.",
    art: "unsure",
    quiet: true,
    featured: false,
  },
  {
    // Retired from the customer-facing list as GreenVac moves to
    // Non-Destructive Trenching. Kept for historic-state compatibility, but it
    // can no longer reach any calculated-pricing branch.
    id: "cattle-grid",
    label: "Cattle Grid Cleaning",
    shortLabel: "Cattle grid",
    desc: "Clean accumulated mud and debris below cattle grids.",
    art: "pit",
    featured: false,
    hidden: true,
  },
];

const subtypes = {
  "service-exposure": [
    "Dig Around Known Services",
    "Expose Unknown Services",
    "Work Around Tree Roots",
    "Expose Around a Structure",
    "Other NDD Job",
    "Not Sure",
  ],
  trenching: [
    "Electrical Trench",
    "Plumbing Trench",
    "Data / Comms Trench",
    "Irrigation Trench",
    "Custom Trench",
    "Not Sure",
  ],
  potholing: [
    "Water Service",
    "Electrical Service",
    "Gas Service",
    "Communications",
    "Multiple Services",
    "Not Sure",
  ],
  "leak-exposure": [
    "Water Leak",
    "Irrigation Leak",
    "Stormwater Issue",
    "Unknown Leak",
  ],
  "pit-cleanout": [
    "Service Pit",
    "Valve Pit",
    "Drainage Pit",
    "Other Cleanout",
  ],
  "cattle-grid": [
    "Single Grid",
    "Double Grid",
    "Multiple Grids",
    "Not Sure",
  ],
  "tunnel-bore": [
    "Under a Path",
    "Under a Driveway",
    "Under a Wall",
    "Under Tree Roots",
    "Under Services",
    "Not Sure",
  ],
  other: [
    "Cleaning or Vacuum Work",
    "Site Preparation",
    "Several Small Jobs",
    "Something Unusual",
    "Not Sure",
  ],
};

const depthCards = [
  { id: "300mm", label: "300 mm", sub: "A shallow run", art: "depth-300" },
  { id: "450mm", label: "450 mm", sub: "Around 450 mm deep", art: "depth-450" },
  { id: "600mm", label: "600 mm", sub: "Around 600 mm deep", art: "depth-600" },
  { id: "800mm", label: "800 mm", sub: "Around 800 mm deep", art: "depth-800" },
  { id: "custom", label: "Not Sure", sub: "Your trade or plans can confirm it", art: "unsure", quiet: true },
];

const widthCards = [
  { id: "narrow", label: "Narrow", sub: "About 150 mm", art: "width-narrow" },
  { id: "standard", label: "Standard — About 300 mm", sub: "Standard trench width", art: "width-standard" },
  { id: "custom", label: "Not Sure", sub: "We can confirm it with you", art: "unsure", quiet: true },
];

// Access imagery has to survive the labels being removed: a customer should be
// able to point at the right picture without reading a word. A close-up of a
// trench cannot do that, so each option shows the surrounding site instead.
const accessCards = [
  {
    id: "open",
    label: "Open Access",
    sub: "Open lawn, yard or driveway to drive straight in",
    // Was tight-access: the rig boxed in beside a block wall, which read as
    // cramped and misled people into the wrong answer. This is an open paddock
    // yard with the hose running free and nothing in the way.
    photo: "port-03",
  },
  {
    id: "side",
    label: "Narrow Access",
    sub: "A side gate or narrow path the hose has to run through",
    // The hose threaded down a passage past a roller door, with the rig left
    // out on the street. The constraint is the subject of the photo.
    photo: "rig-access",
  },
  {
    id: "difficult",
    label: "Very Tight",
    sub: "Steps, a corridor or an enclosed yard - hose only, no rig",
    photo: "ndd-tight-access",
  },
  {
    id: "unsure",
    label: "Not Sure",
    sub: "A photo will help James assess it",
    art: "unsure",
    quiet: true,
  },
];

const groundCards = [
  { id: "normal", label: "Normal / Soft", sub: "Typical soil, sand or loam", art: "ground-soft" },
  { id: "hard", label: "Clay / Hard", sub: "Heavy clay, compacted or rocky", art: "ground-hard" },
  { id: "unsure", label: "Not Sure", sub: "We can allow for uncertainty", art: "unsure", quiet: true },
];

const congestionCards = [
  {
    id: "clear",
    label: "No Known Services",
    sub: "Nothing has been identified nearby",
    art: "services-clear",
  },
  {
    id: "congested",
    label: "Services Nearby",
    sub: "Pipes, cables or other services are present",
    art: "services-near",
  },
  {
    id: "unsure",
    label: "Not Sure",
    sub: "Common when services have not been exposed",
    art: "unsure",
    quiet: true,
  },
];

const spoilCards = [
  {
    id: "leave",
    label: "Leave Onsite",
    sub: "Leave the excavated material at the job",
    art: "spoil-leave",
  },
  {
    id: "remove-all",
    label: "Remove It",
    sub: "Removal priced at $85 + GST per cubic metre",
    art: "spoil-remove",
  },
  {
    id: "unsure",
    label: "Not Sure",
    sub: "James can recommend the practical option",
    art: "unsure",
    quiet: true,
  },
];

const urgencyCards = [
  { id: "asap", label: "As Soon As Possible" },
  { id: "this-week", label: "Within a Week" },
  { id: "next-month", label: "Within 2-4 Weeks" },
  { id: "flexible", label: "Flexible / Planning Ahead" },
];

const exposureCountCards = [
  {
    id: "more-than-10",
    label: "More Than 10",
    sub: "James will review the larger scope",
    art: "spots-many",
  },
  {
    id: "unsure",
    label: "Not Sure",
    sub: "James can help work out the count",
    art: "unsure",
    quiet: true,
  },
];

const exposureDepthCards = [
  { id: "shallow", label: "Under 600 mm", sub: "A shallower exposure", art: "depth-shallow" },
  { id: "deep", label: "600 mm or More", sub: "A deeper exposure", art: "depth-deep" },
  { id: "unsure", label: "Not Sure", sub: "James can allow for this", art: "unsure", quiet: true },
];

const leakAreaCards = [
  {
    id: "localised",
    label: "Rough Spot Known",
    sub: "The likely leak area is fairly clear",
    art: "leak-spot",
  },
  {
    id: "wide",
    label: "Wider Search Area",
    sub: "The general area needs investigation",
    art: "leak-wide",
  },
  { id: "unsure", label: "Not Sure", sub: "We will review it first", art: "unsure", quiet: true },
];

const pitSizeCards = [
  { id: "small", label: "Standard Pit", sub: "Single valve box or drainage pit", art: "pit-standard" },
  { id: "large", label: "Large Pit", sub: "Multi-bay or oversized cleanout", art: "pit-large" },
  { id: "unsure", label: "Not Sure", sub: "A photo usually answers this", art: "unsure", quiet: true },
];

const pitFillCards = [
  { id: "light", label: "Light Fill", sub: "Silt, leaves or light debris", art: "fill-light" },
  { id: "heavy", label: "Heavy Sludge", sub: "Thick mud, clay or compacted buildup", art: "fill-heavy" },
  { id: "unsure", label: "Not Sure", sub: "You may not be able to see inside", art: "unsure", quiet: true },
];

const cattleCountCards = [
  { id: "1-2", label: "1-2 Grids", sub: "Single entry or double grid", art: "spots-few" },
  { id: "3plus", label: "3 or More", sub: "Multiple grids or a long entry", art: "spots-many" },
  { id: "unsure", label: "Not Sure", sub: "We can confirm from photos", art: "unsure", quiet: true },
];

const cattleFillCards = [
  { id: "light", label: "Light Buildup", sub: "Leaves, dirt and light silt", art: "fill-light" },
  { id: "moderate", label: "Moderate", sub: "Mud and compacted debris", art: "fill-light" },
  { id: "heavy", label: "Heavy Sludge", sub: "Thick or solid buildup", art: "fill-heavy" },
  { id: "unsure", label: "Not Sure", sub: "You have not looked underneath", art: "unsure", quiet: true },
];

const obstacleDistanceCards = [
  { id: "short", label: "Under 5 m", sub: "A short path or obstacle", art: "bore-short" },
  { id: "long", label: "5 m or More", sub: "A longer route underneath", art: "bore-long" },
  { id: "unsure", label: "Not Sure", sub: "We can confirm onsite", art: "unsure", quiet: true },
];

const featuredJobs = pickFeaturedJobs(jobTypes);
const extraJobs = visibleExtraJobs(jobTypes);

function getJob(jobType) {
  return jobTypes.find((job) => job.id === jobType);
}

function findLabel(cards, id) {
  return cards.find((item) => item.id === id)?.label;
}

function getExposureCountLabel(value) {
  const exactCount = Number(value);
  if (Number.isInteger(exactCount) && exactCount >= 1 && exactCount <= 10) {
    return `${exactCount} ${exactCount === 1 ? "Spot" : "Spots"}`;
  }
  return findLabel(exposureCountCards, value);
}

/* ---------------------------------------------------------------------------
 * Imagery
 *
 * The container accommodates the photograph, not the other way round. Each
 * shape is a purpose-composed crop produced by make_estimator_images.py with a
 * focal point chosen per photo, so `cover` has almost nothing left to cut and
 * the customer still sees the part of the frame that answers the question.
 * ------------------------------------------------------------------------ */

function imageSet(stem, shape) {
  const entry = ESTIMATOR_IMAGES[`${stem}:${shape}`];
  if (!entry || !entry.variants.length) return null;
  const largest = entry.variants[entry.variants.length - 1];
  return {
    src: `/images/est-${stem}-${shape}-${largest.width}.webp`,
    srcSet: entry.variants
      .map((variant) => `/images/est-${stem}-${shape}-${variant.width}.webp ${variant.width}w`)
      .join(", "),
    width: largest.width,
    height: largest.height,
  };
}

function Photo({ stem, shape, mobileShape, sizes, mobileSizes, priority = false, eager = false }) {
  const desktop = imageSet(stem, shape);
  if (!desktop) return null;
  const mobile = mobileShape ? imageSet(stem, mobileShape) : null;

  // Explicit width/height plus the CSS aspect-ratio box means the slot is
  // reserved before the bytes arrive, so nothing shifts as photos load. The
  // job choices are the first thing the customer has to recognise, so they load
  // eagerly; only the first also asks for priority. Everything further down the
  // page stays lazy.
  const img = (
    <img
      className="pick-image"
      src={desktop.src}
      srcSet={desktop.srcSet}
      sizes={sizes}
      width={desktop.width}
      height={desktop.height}
      alt=""
      loading={priority || eager ? "eager" : "lazy"}
      decoding="async"
      fetchpriority={priority ? "high" : "auto"}
    />
  );

  if (!mobile) return img;
  return (
    <picture>
      <source media="(max-width:640px)" srcSet={mobile.srcSet} sizes={mobileSizes || sizes} />
      {img}
    </picture>
  );
}

/* ---------------------------------------------------------------------------
 * Icons and explanatory artwork
 *
 * Every diagram shares one flat palette, one 160x90 frame and one ground
 * section, so the whole estimator reads as a single system rather than a pile
 * of unrelated icons. Blue is the real DBYD marking blue from the photographs.
 * ------------------------------------------------------------------------ */

// Values, not just hues. An earlier pass drew the excavation void in the page
// colour on soil -- only a few percent apart, so "No Known Services" rendered as
// an empty beige box that explained nothing. The void is now dark, which is what
// makes a hole read as a hole at 124px wide.
const ART = {
  page: "#f4efe3",
  turf: "#c6dcc4",
  turfEdge: "#8fb891",
  soil: "#e0d2b8",
  soilDeep: "#b99f78",
  void: "#5f5646",
  rock: "#7c8479",
  pipe: "#4f5f56",
  mark: "#3f6fa3",
  green: "#136f39",
  water: "#7fb0cd",
  line: "#6f7a6f",
};

function CheckIcon({ size = 18, colour = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colour}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

function ChevronIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  );
}

function CameraIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9a2 2 0 0 1 2-2h2l1.5-2h7L19 7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function PhoneIcon({ size = 19 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1A19.5 19.5 0 0 1 4.7 12 19.8 19.8 0 0 1 1.6 3.4 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.6a2 2 0 0 1-.5 2.1L7.1 9a16 16 0 0 0 6 6l1.5-1.7a2 2 0 0 1 2.1-.5c.8.4 1.7.6 2.6.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

function ChatIcon({ size = 19 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-5A8 8 0 1 1 21 11.5z" />
    </svg>
  );
}

function TruckIcon({ size = 19 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 6.5h11v9H2zM13 9.5h4l3 3v3h-7z" />
      <circle cx="6" cy="17.5" r="1.6" />
      <circle cx="17" cy="17.5" r="1.6" />
    </svg>
  );
}

// Cross-section base: sky band, turf line, soil body. 60px of soil reads as
// roughly 900 mm, which is what makes the depth diagrams comparable.
function Section({ children }) {
  return (
    <>
      <rect x="0" y="0" width="160" height="30" fill={ART.page} />
      <rect x="0" y="30" width="160" height="60" fill={ART.soil} />
      <rect x="0" y="30" width="160" height="5" fill={ART.turfEdge} />
      {children}
    </>
  );
}

// Coerced on the way in. Passing x="44" width="72" as JSX strings once produced
// `M44 30 L4472 30 ...` -- string concatenation instead of addition -- which drew
// a wedge off the side of every diagram. Geometry checks cannot see that; only
// looking at the rendered art did.
function Dig({ x = 58, width = 44, depth = 30, taper = 6 }) {
  const left = Number(x);
  const span = Number(width);
  const drop = Number(depth);
  const slope = Number(taper);
  const base = 30 + drop;
  return (
    <path
      d={`M${left} 30 L${left + span} 30 L${left + span - slope} ${base} L${left + slope} ${base} Z`}
      fill={ART.void}
      stroke={ART.soilDeep}
      strokeWidth="1.5"
    />
  );
}

function DepthRule({ depth, label }) {
  return (
    <>
      <line x1="118" y1="30" x2="118" y2={30 + depth} stroke={ART.green} strokeWidth="1.6" />
      <line x1="114" y1="30" x2="122" y2="30" stroke={ART.green} strokeWidth="1.6" />
      <line x1="114" y1={30 + depth} x2="122" y2={30 + depth} stroke={ART.green} strokeWidth="1.6" />
      <text x="126" y={33 + depth / 2} fill={ART.green} fontSize="12" fontWeight="700">
        {label}
      </text>
    </>
  );
}

function Spot({ x, y, r = 7 }) {
  return (
    <>
      <ellipse cx={x} cy={y} rx={r + 2} ry={r * 0.86} fill={ART.soilDeep} />
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.66} fill={ART.void} />
      <line x1={x - r - 6} y1={y} x2={x + r + 6} y2={y} stroke={ART.mark} strokeWidth="2.4" />
      <line x1={x} y1={y - r - 5} x2={x} y2={y + r + 5} stroke={ART.mark} strokeWidth="2.4" />
    </>
  );
}

function Bar({ filled }) {
  return [0, 1, 2, 3].map((index) => (
    <rect
      key={index}
      x={16 + index * 33}
      y="38"
      width="27"
      height="16"
      rx="4"
      fill={index < filled ? ART.green : "#dfe6dd"}
    />
  ));
}

function Art({ name }) {
  const body = (() => {
    switch (name) {
      case "depth-300":
        return <Section><Dig depth={20} /><DepthRule depth={20} label="300" /></Section>;
      case "depth-450":
        return <Section><Dig depth={30} /><DepthRule depth={30} label="450" /></Section>;
      case "depth-600":
        return <Section><Dig depth={40} /><DepthRule depth={40} label="600" /></Section>;
      case "depth-800":
        return <Section><Dig depth={53} /><DepthRule depth={53} label="800" /></Section>;

      case "depth-shallow":
        return (
          <Section>
            <line x1="0" y1="70" x2="160" y2="70" stroke={ART.line} strokeWidth="1.4" strokeDasharray="5 4" />
            <text x="4" y="83" fill={ART.line} fontSize="11" fontWeight="700">600 mm</text>
            <Dig x={46} width={52} depth={26} />
          </Section>
        );
      case "depth-deep":
        return (
          <Section>
            <line x1="0" y1="70" x2="160" y2="70" stroke={ART.line} strokeWidth="1.4" strokeDasharray="5 4" />
            <text x="4" y="83" fill={ART.line} fontSize="11" fontWeight="700">600 mm</text>
            <Dig x={46} width={52} depth={52} />
          </Section>
        );

      case "width-narrow":
        return (
          <Section>
            <Dig x={70} width={18} depth={44} taper={2} />
            <line x1="70" y1="22" x2="88" y2="22" stroke={ART.green} strokeWidth="1.6" />
            <text x="94" y="26" fill={ART.green} fontSize="12" fontWeight="700">150</text>
          </Section>
        );
      case "width-standard":
        return (
          <Section>
            <Dig x={62} width={34} depth={44} taper={3} />
            <line x1="62" y1="22" x2="96" y2="22" stroke={ART.green} strokeWidth="1.6" />
            <text x="102" y="26" fill={ART.green} fontSize="12" fontWeight="700">200+</text>
          </Section>
        );

      // Loose, even, diggable ground: fine crumb, no layering, no obstructions.
      case "ground-soft":
        return (
          <Section>
            {[[20, 46], [34, 60], [50, 50], [64, 70], [80, 54], [96, 66], [110, 48], [126, 62], [142, 52],
              [26, 76], [58, 82], [88, 78], [118, 82], [148, 72]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" fill={ART.soilDeep} />
            ))}
          </Section>
        );
      // Banded clay with rock through it -- the thing that slows a dig down.
      case "ground-hard":
        return (
          <Section>
            <rect x="0" y="44" width="160" height="12" fill={ART.soilDeep} />
            <rect x="0" y="66" width="160" height="12" fill={ART.soilDeep} />
            <polygon points="24,58 40,53 48,63 38,71 26,68" fill={ART.rock} />
            <polygon points="82,38 100,36 105,47 90,52" fill={ART.rock} />
            <polygon points="112,70 132,67 136,80 118,84" fill={ART.rock} />
            <polygon points="56,78 74,75 78,87 60,89" fill={ART.rock} />
            <polygon points="140,50 156,47 158,58 142,60" fill={ART.rock} />
          </Section>
        );

      // Same hole in both, so the only difference the eye has to catch is
      // whether there is anything buried in it.
      case "services-clear":
        return (
          <Section>
            <Dig x={44} width={72} depth={44} />
          </Section>
        );
      case "services-near":
        return (
          <Section>
            <Dig x={44} width={72} depth={44} />
            <rect x="0" y="58" width="52" height="9" rx="4.5" fill={ART.green} />
            <rect x="108" y="58" width="52" height="9" rx="4.5" fill={ART.green} />
            <circle cx="62" cy="62" r="7" fill={ART.pipe} stroke={ART.page} strokeWidth="1.6" />
            <circle cx="80" cy="67" r="8" fill={ART.pipe} stroke={ART.page} strokeWidth="1.6" />
            <circle cx="98" cy="61" r="6" fill={ART.pipe} stroke={ART.page} strokeWidth="1.6" />
          </Section>
        );

      // The spoil stays put, in a heap beside the hole.
      case "spoil-leave":
        return (
          <Section>
            <Dig x={26} width={46} depth={36} />
            <path d="M88 30 Q114 2 140 30 Z" fill={ART.soilDeep} stroke={ART.void} strokeWidth="1.4" />
          </Section>
        );
      // The spoil leaves in the tank. Drawn solid so it reads as a vehicle
      // rather than the empty outline it used to be.
      case "spoil-remove":
        return (
          <Section>
            <Dig x={12} width={40} depth={34} />
            {/* Everything stays inside the 0-90 box: an earlier arc reached
                y=-6 and the tank sat flush to the top, so both were clipped. */}
            <rect x="86" y="4" width="64" height="20" rx="10" fill={ART.green} />
            <circle cx="102" cy="29" r="4.5" fill={ART.void} />
            <circle cx="136" cy="29" r="4.5" fill={ART.void} />
            <path d="M40 27 Q62 7 86 16" fill="none" stroke={ART.soilDeep} strokeWidth="6" strokeLinecap="round" />
          </Section>
        );

      case "spots-few":
        return (
          <>
            <rect x="0" y="0" width="160" height="90" fill={ART.turf} />
            <Spot x={56} y={46} />
            <Spot x={104} y={56} />
          </>
        );
      case "spots-many":
        return (
          <>
            <rect x="0" y="0" width="160" height="90" fill={ART.turf} />
            <Spot x={30} y={30} r={5} />
            <Spot x={72} y={24} r={5} />
            <Spot x={118} y={38} r={5} />
            <Spot x={48} y={66} r={5} />
            <Spot x={104} y={70} r={5} />
          </>
        );

      case "leak-spot":
        return (
          <>
            <rect x="0" y="0" width="160" height="90" fill={ART.turf} />
            <Spot x={80} y={48} r={9} />
            <circle cx="80" cy="48" r="20" fill="none" stroke={ART.water} strokeWidth="2.5" />
            <circle cx="80" cy="48" r="30" fill="none" stroke={ART.water} strokeWidth="1.8" opacity="0.7" />
          </>
        );
      case "leak-wide":
        return (
          <>
            <rect x="0" y="0" width="160" height="90" fill={ART.turf} />
            <rect
              x="14"
              y="14"
              width="132"
              height="62"
              rx="8"
              fill="none"
              stroke={ART.mark}
              strokeWidth="2.4"
              strokeDasharray="7 5"
            />
            <Spot x={48} y={38} r={5} />
            <Spot x={92} y={54} r={5} />
            <Spot x={118} y={32} r={5} />
          </>
        );

      // A chamber with its lid lifted off and a suction hose going in. Stands in
      // until James supplies a real pit-cleanout photograph.
      case "pit":
      case "pit-standard":
        return (
          <Section>
            <rect x="50" y="30" width="58" height="46" fill={ART.void} stroke={ART.rock} strokeWidth="3" />
            <rect x="50" y="64" width="58" height="12" fill={ART.soilDeep} />
            <rect x="8" y="20" width="34" height="7" rx="2" fill={ART.rock} transform="rotate(-16 25 23)" />
            <path d="M136 4 Q140 40 100 44" fill="none" stroke={ART.soilDeep} strokeWidth="6" strokeLinecap="round" />
          </Section>
        );
      case "pit-large":
        return (
          <Section>
            <rect x="22" y="30" width="52" height="50" fill={ART.void} stroke={ART.rock} strokeWidth="3" />
            <rect x="86" y="30" width="52" height="50" fill={ART.void} stroke={ART.rock} strokeWidth="3" />
            <rect x="22" y="66" width="52" height="14" fill={ART.soilDeep} />
            <rect x="86" y="66" width="52" height="14" fill={ART.soilDeep} />
          </Section>
        );
      case "fill-light":
        return (
          <Section>
            <rect x="44" y="30" width="72" height="52" fill={ART.void} stroke={ART.rock} strokeWidth="3" />
            <rect x="44" y="72" width="72" height="10" fill={ART.soilDeep} />
          </Section>
        );
      case "fill-heavy":
        return (
          <Section>
            <rect x="44" y="30" width="72" height="52" fill={ART.void} stroke={ART.rock} strokeWidth="3" />
            <rect x="44" y="42" width="72" height="40" fill={ART.soilDeep} />
            <circle cx="62" cy="56" r="5" fill={ART.rock} />
            <circle cx="92" cy="64" r="6" fill={ART.rock} />
            <circle cx="104" cy="50" r="4" fill={ART.rock} />
          </Section>
        );

      case "bore-short":
        return (
          <Section>
            <rect x="52" y="24" width="56" height="10" fill={ART.rock} />
            <path d="M44 40 Q80 76 116 40" fill="none" stroke={ART.green} strokeWidth="3.5" strokeDasharray="7 5" />
            <Dig x={26} width={20} depth={26} taper={2} />
            <Dig x={114} width={20} depth={26} taper={2} />
          </Section>
        );
      case "bore-long":
        return (
          <Section>
            <rect x="30" y="24" width="100" height="10" fill={ART.rock} />
            <path d="M20 42 Q80 86 140 42" fill="none" stroke={ART.green} strokeWidth="3.5" strokeDasharray="7 5" />
            <Dig x={6} width={16} depth={28} taper={2} />
            <Dig x={138} width={16} depth={28} taper={2} />
          </Section>
        );

      case "scale-small":
        return <><rect x="0" y="0" width="160" height="90" fill={ART.page} /><Bar filled={1} /></>;
      case "scale-half":
        return <><rect x="0" y="0" width="160" height="90" fill={ART.page} /><Bar filled={2} /></>;
      case "scale-full":
        return <><rect x="0" y="0" width="160" height="90" fill={ART.page} /><Bar filled={4} /></>;

      case "more":
        return (
          <>
            <rect x="0" y="0" width="160" height="90" fill={ART.page} />
            <rect x="34" y="22" width="38" height="20" rx="4" fill={ART.turfEdge} />
            <rect x="34" y="48" width="38" height="20" rx="4" fill={ART.turfEdge} />
            <rect x="88" y="22" width="38" height="20" rx="4" fill={ART.turfEdge} />
            <line x1="107" y1="50" x2="107" y2="68" stroke={ART.green} strokeWidth="4" strokeLinecap="round" />
            <line x1="98" y1="59" x2="116" y2="59" stroke={ART.green} strokeWidth="4" strokeLinecap="round" />
          </>
        );

      // One quiet mark for every "Not sure" in the estimator. Never a worksite
      // photograph -- uncertainty should look calm, not like a specific job.
      case "unsure":
      default:
        return (
          <>
            <rect x="0" y="0" width="160" height="90" fill={ART.page} />
            <circle cx="80" cy="45" r="21" fill="none" stroke={ART.line} strokeWidth="2.6" />
            <path
              d="M73 38 Q73 30 80 30 Q88 30 88 37 Q88 43 80 46 L80 51"
              fill="none"
              stroke={ART.line}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <circle cx="80" cy="58" r="2.2" fill={ART.line} />
          </>
        );
    }
  })();

  return (
    <svg className="pick-image" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {body}
    </svg>
  );
}

const S = `
@font-face{
  font-family:'Montserrat';
  src:url('/fonts/montserrat-latin.woff2') format('woff2');
  font-style:normal;
  font-weight:100 900;
  font-display:swap;
}
*{box-sizing:border-box;}
:root{
  --green:#136f39;
  --green-dark:#0d552a;
  --green-soft:#e8f2e9;
  --green-mid:#bad5c0;
  --cream:#efe7d3;
  --cream-light:#f8f5ec;
  --ink:#232a20;
  --muted:#5c665b;
  --border:#d9dfd7;
  --white:#fff;
  --danger:#7d2b2b;
  --radius:16px;
  --radius-sm:11px;
  --shadow:0 8px 28px rgba(25,46,32,.08);
  --shadow-soft:0 2px 10px rgba(25,46,32,.06);
  --ring:0 0 0 3px rgba(19,111,57,.32);
}
html{background:var(--cream-light);}
body{margin:0;background:var(--cream-light);}
button,input,textarea{font:inherit;}
button{-webkit-tap-highlight-color:transparent;}
:focus-visible{outline:3px solid var(--green);outline-offset:2px;}
.app{min-height:100vh;background:linear-gradient(180deg,#fff 0,#f8f5ec 34rem);font-family:'Montserrat',sans-serif;color:var(--ink);}

/* --- frame ------------------------------------------------------------- */
.topbar{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid rgba(19,111,57,.13);}
.topbar-inner{min-height:68px;max-width:760px;margin:0 auto;padding:6px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.brand-wrap{display:flex;align-items:center;gap:12px;min-width:0;}
.back-btn{width:44px;height:44px;border:1px solid var(--border);border-radius:50%;background:#fff;color:var(--ink);display:grid;place-items:center;cursor:pointer;font-size:24px;line-height:1;flex:0 0 auto;}
.back-btn:hover{border-color:var(--green);color:var(--green);}
.logo-image{display:block;width:auto;height:56px;object-fit:contain;clip-path:inset(24% 4% round 4px);}
.topbar-right{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:0 0 auto;}
.step-label{font-size:11px;font-weight:700;color:var(--muted);white-space:nowrap;}
/* Red text, never a solid red box, and never louder than the primary action.
   The 44px target is on the button; the underline sits on the inner span so the
   rule stays tight against the words instead of floating at the hit-area edge. */
.cancel-btn,.home-link{display:inline-flex;align-items:center;min-height:44px;padding:0;border:0;background:none;font-size:12.5px;font-weight:700;line-height:1.2;cursor:pointer;white-space:nowrap;text-decoration:none;}
.cancel-btn{color:var(--danger);}
.home-link{color:var(--green);}
.cancel-btn span,.home-link span{border-bottom:1px solid transparent;}
.cancel-btn:hover span{border-bottom-color:var(--danger);}
.home-link:hover span{border-bottom-color:var(--green);}
.progress{height:4px;background:#e7ebe6;}
.progress-fill{height:100%;background:var(--green);transition:width .35s ease;}
.content{width:100%;max-width:720px;margin:0 auto;padding:24px 20px 8px;}

/* --- headings ----------------------------------------------------------- */
.eyebrow{font-size:11px;line-height:1.2;font-weight:800;color:var(--green);letter-spacing:2.2px;text-transform:uppercase;margin-bottom:8px;}
.heading{font-size:clamp(28px,6vw,42px);line-height:1.08;font-weight:900;letter-spacing:-1.3px;color:var(--ink);margin:0 0 10px;}
.subhead{font-size:15px;line-height:1.65;color:var(--muted);margin:0;max-width:640px;}
.heading-block{margin-bottom:18px;}
.trust-row{display:flex;align-items:center;gap:8px;margin-top:11px;color:var(--green);font-size:12px;font-weight:700;}

/* --- the one choice-card system ---------------------------------------- */
.pick{position:relative;display:flex;flex-direction:column;width:100%;text-align:left;padding:0;border:1.5px solid var(--border);border-radius:var(--radius);background:#fff;overflow:hidden;cursor:pointer;box-shadow:var(--shadow-soft);transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease,background .16s ease;}
.pick:hover{transform:translateY(-2px);border-color:var(--green);box-shadow:var(--shadow);}
.pick:active{transform:translateY(0);box-shadow:var(--shadow-soft);}
.pick.selected{border-color:var(--green);background:var(--green-soft);box-shadow:var(--ring),var(--shadow);}
.pick[disabled]{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none;}
.pick-media{position:relative;width:100%;background:var(--green-soft);overflow:hidden;flex:0 0 auto;}
.pick-image{display:block;width:100%;height:100%;object-fit:cover;}
.pick-media picture{display:contents;}
.pick.quiet .pick-media{background:var(--cream-light);}
.pick-body{display:block;padding:13px 14px 15px;flex:1 1 auto;}
.pick-label{display:block;font-size:14px;line-height:1.3;font-weight:800;color:var(--ink);}
.pick-sub{display:block;font-size:12px;line-height:1.5;color:var(--muted);margin-top:5px;}
.pick-tick{position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--green);color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.2);}

.job-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
/* Square on desktop so the row plus the More control clear a 1280x800 fold. */
.pick--job .pick-media{aspect-ratio:1;}
.pick--job .pick-body{min-height:92px;}
.pick--job .pick-label{font-size:15px;}

.access-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
.pick--context .pick-media{aspect-ratio:4/3;}

.art-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
.pick--art .pick-media{aspect-ratio:16/9;}
.pick--art .pick-label{font-size:13px;}
.pick--art .pick-sub{font-size:12px;}
.pick--art .pick-body{padding:11px 12px 13px;}

/* horizontal card: thumbnail left, title and explanation right */
.row-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.pick--row{flex-direction:row;align-items:stretch;min-height:96px;}
.pick--row .pick-media{flex:0 0 96px;width:96px;align-self:stretch;}
.pick--row .pick-body{padding:12px 14px;display:flex;flex-direction:column;justify-content:center;}
.pick--row .pick-tick{top:8px;right:8px;width:24px;height:24px;}

.text-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.pick--text{min-height:56px;justify-content:center;}
.pick--text .pick-body{padding:14px;}

/* --- more-job-types disclosure ----------------------------------------- */
.more-bar{display:flex;align-items:center;gap:14px;width:100%;margin-top:14px;padding:12px 16px;min-height:72px;text-align:left;border:1.5px solid var(--border);border-radius:var(--radius);background:var(--cream-light);color:var(--ink);cursor:pointer;transition:border-color .15s ease,background .15s ease;}
.more-bar:hover{border-color:var(--green);background:#fff;}
/* Expanded, the bar and its choices are one object: joined edges, no repeated
   heading, choices immediately beneath the control that revealed them. */
.more-bar[aria-expanded="true"]{border-color:var(--green-mid);background:#fff;border-bottom-color:transparent;border-radius:var(--radius) var(--radius) 0 0;}
.more-panel{margin-top:0;padding:4px 12px 12px;border:1.5px solid var(--green-mid);border-top:0;border-radius:0 0 var(--radius) var(--radius);background:#fff;}
.more-mark{width:56px;height:40px;border-radius:8px;overflow:hidden;flex:0 0 auto;}
.more-copy{display:block;flex:1 1 auto;min-width:0;}
.more-title{display:block;font-size:14px;font-weight:800;line-height:1.3;}
.more-sub{display:block;font-size:12px;line-height:1.5;color:var(--muted);margin-top:3px;}
.more-chip{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:3px 9px;border-radius:999px;background:var(--green-soft);color:var(--green-dark);font-size:11px;font-weight:800;}
.more-chevron{flex:0 0 auto;color:var(--green);transition:transform .2s ease;}
.more-bar[aria-expanded="true"] .more-chevron{transform:rotate(180deg);}

/* --- panels, questions, subtypes ---------------------------------------- */
.section-panel{margin-top:16px;padding:20px;background:#fff;border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-soft);}
.section-title{font-size:18px;line-height:1.3;font-weight:800;color:var(--ink);margin:0 0 6px;}
.section-help{font-size:12.5px;line-height:1.55;color:var(--muted);margin:0 0 14px;}
.subtype-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;}
.subtype-card{min-height:48px;display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fff;padding:10px 12px;color:var(--ink);cursor:pointer;transition:border-color .15s ease,background .15s ease;}
.subtype-card:hover{border-color:var(--green);}
.subtype-card.selected{border-color:var(--green);background:var(--green-soft);}
.subtype-dot{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--border);display:grid;place-items:center;color:#fff;flex:0 0 auto;}
.subtype-card.selected .subtype-dot{border-color:var(--green);background:var(--green);}
.subtype-label{font-size:12.5px;line-height:1.35;font-weight:700;}
.breadcrumb{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:11.5px;color:var(--muted);font-weight:600;margin-bottom:16px;}
.breadcrumb strong{color:var(--green);}
.question-block{margin-bottom:26px;}
.question-count{font-size:10px;font-weight:800;color:var(--green);letter-spacing:1.8px;text-transform:uppercase;margin-bottom:7px;}
.question-title{font-size:19px;line-height:1.3;font-weight:800;color:var(--ink);margin:0 0 13px;}

/* --- metre stepper ------------------------------------------------------ */
.metre-control{display:flex;align-items:center;border:1.5px solid var(--border);border-radius:var(--radius);background:#fff;overflow:hidden;box-shadow:var(--shadow-soft);}
.metre-btn{width:68px;height:64px;border:0;background:var(--cream-light);color:var(--green);font-size:26px;font-weight:700;cursor:pointer;}
.metre-btn:hover{background:var(--green-soft);}
.metre-value{flex:1;text-align:center;font-size:30px;font-weight:900;color:var(--ink);}
.metre-unit{font-size:14px;font-weight:600;color:var(--muted);margin-left:4px;}
.quick-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px;}
.quick-btn{min-height:44px;border:1.5px solid var(--border);border-radius:999px;background:#fff;color:var(--muted);padding:6px 18px;font-size:13px;font-weight:700;cursor:pointer;}
.quick-btn.selected{border-color:var(--green);background:var(--green-soft);color:var(--green);}
.count-review-grid{margin-top:10px;}

/* --- summaries and fields ----------------------------------------------- */
.summary-pill{display:flex;gap:18px;flex-wrap:wrap;background:var(--green-soft);border:1px solid var(--green-mid);border-radius:var(--radius-sm);padding:14px 16px;margin-top:10px;}
.summary-key{font-size:9.5px;line-height:1.2;font-weight:800;color:var(--green);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:4px;}
.summary-value{font-size:12.5px;line-height:1.4;font-weight:800;color:var(--ink);}
.field-stack{display:flex;flex-direction:column;gap:10px;}
.field-label{display:block;font-size:11.5px;font-weight:800;color:var(--ink);margin-bottom:7px;}
.field-hint{font-weight:500;color:var(--muted);}
.input{width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fff;color:var(--ink);padding:13px 14px;font-size:15px;line-height:1.4;outline:none;box-shadow:0 1px 4px rgba(25,46,32,.04);}
.input:focus{border-color:var(--green);box-shadow:var(--ring);}
.input::placeholder{color:#6b766b;}
textarea.input{resize:vertical;min-height:82px;}
.location-panel{padding:18px;background:var(--cream);border-radius:var(--radius);margin-bottom:26px;}
.location-grid{display:grid;grid-template-columns:1fr 150px;gap:10px;}
.reassure{display:flex;gap:11px;padding:14px 15px;border:1px solid var(--green-mid);border-radius:var(--radius-sm);background:var(--green-soft);color:var(--green-dark);font-size:12.5px;line-height:1.55;margin:8px 0 20px;}
.reassure strong{display:block;font-size:12.5px;margin-bottom:2px;}
.reassure svg{flex:0 0 auto;}

/* --- footer ------------------------------------------------------------- */
/* In flow. Never fixed: a floating bar sat on top of photographs, descriptions
   and selectable cards on every step. */
.footer-wrap{padding:8px 20px calc(28px + env(safe-area-inset-bottom));background:transparent;}
.footer-inner{max-width:720px;margin:0 auto;}
.primary-btn,.secondary-btn{width:100%;min-height:52px;border-radius:13px;padding:16px 18px;font-size:14.5px;font-weight:800;cursor:pointer;transition:background .15s ease,transform .15s ease,box-shadow .15s ease;}
.primary-btn{border:0;background:var(--green);color:#fff;box-shadow:0 5px 18px rgba(19,111,57,.25);}
.primary-btn:hover:not(:disabled){background:var(--green-dark);transform:translateY(-1px);}
.primary-btn:active:not(:disabled){transform:translateY(0);box-shadow:0 2px 8px rgba(19,111,57,.25);}
/* The disabled label carries real instruction ("Choose a job type to continue"),
   so it is held to AA rather than treated as incidental. */
.primary-btn:disabled{background:#dfe6dd;color:#4a564b;box-shadow:none;cursor:not-allowed;}
.secondary-btn{border:1.5px solid var(--border);background:#fff;color:var(--muted);margin-top:9px;}
.secondary-btn:hover{border-color:var(--green);color:var(--green);}
.footer-note{text-align:center;color:var(--muted);font-size:11.5px;line-height:1.45;margin-top:9px;}

/* --- estimate ----------------------------------------------------------- */
.done-mark{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--green-soft);border:2px solid var(--green-mid);color:var(--green);margin-bottom:14px;}
.estimate-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow);margin-bottom:14px;}
.estimate-card.main{text-align:center;padding:26px 20px;}
.estimate-kicker{font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:var(--green);margin-bottom:10px;}
.estimate-range{font-size:clamp(34px,9vw,52px);line-height:1;font-weight:900;letter-spacing:-2px;color:var(--green);}
/* Manual-review result. Deliberately shaped like the price card so it reads as
   a real answer rather than a failure, but it never shows a number. */
.estimate-card.main.manual{border-color:var(--green-mid);background:var(--green-soft);}
.manual-line{font-size:clamp(20px,5vw,26px);line-height:1.2;font-weight:900;letter-spacing:-.6px;color:var(--green-dark);}
.estimate-card.main.manual .estimate-gst{margin-top:10px;max-width:34ch;margin-left:auto;margin-right:auto;}
.estimate-card.main.manual .privacy-proof{background:#fff;}
.estimate-gst{font-size:12.5px;color:var(--muted);margin-top:8px;}
.privacy-proof{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:999px;background:var(--green-soft);color:var(--green-dark);font-size:11px;font-weight:800;margin-top:16px;}
.summary-heading{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
.summary-thumb{width:38px;height:38px;border-radius:8px;overflow:hidden;flex:0 0 auto;background:var(--green-soft);}
.summary-row{display:flex;justify-content:space-between;gap:20px;padding:10px 0;border-bottom:1px solid var(--border);font-size:12.5px;line-height:1.45;}
.summary-row:last-child{border-bottom:0;}
.summary-row span:first-child{color:var(--muted);}
.summary-row strong{text-align:right;color:var(--ink);}
.info-note{padding:13px 15px;background:var(--cream-light);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12.5px;line-height:1.6;color:var(--muted);margin-bottom:14px;}
.info-note.error{background:#fff5f5;border-color:#e5c2c2;color:var(--danger);}

/* --- photos, terms, success --------------------------------------------- */
.photo-zone{display:block;border:2px dashed var(--green-mid);border-radius:var(--radius);background:var(--green-soft);padding:22px 16px;text-align:center;color:var(--green);cursor:pointer;}
.photo-zone:hover{border-color:var(--green);}
.photo-zone:focus-within{border-color:var(--green);box-shadow:var(--ring);}
.photo-title{font-size:13.5px;font-weight:800;color:var(--ink);margin-top:7px;}
.photo-help{font-size:12px;line-height:1.5;color:var(--muted);margin-top:4px;}
.photo-examples{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px;}
.photo-example{position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--green-soft);}
.photo-example img{width:100%;height:100%;object-fit:cover;display:block;}
.photo-example::after{content:"";position:absolute;inset:35% 0 0;background:linear-gradient(transparent,rgba(13,42,23,.82));}
.photo-example span{position:absolute;z-index:1;left:8px;right:8px;bottom:7px;color:#fff;font-size:10px;line-height:1.25;font-weight:800;text-shadow:0 1px 4px rgba(0,0,0,.4);}
.checkbox{display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;border:1.5px solid var(--border);border-radius:var(--radius);background:#fff;padding:15px;color:var(--ink);cursor:pointer;margin-top:14px;}
.checkbox.selected{border-color:var(--green);background:var(--green-soft);}
.checkbox-box{width:22px;height:22px;border:2px solid var(--border);border-radius:6px;display:grid;place-items:center;flex:0 0 auto;color:#fff;}
.checkbox.selected .checkbox-box{background:var(--green);border-color:var(--green);}
.checkbox-copy{font-size:12.5px;line-height:1.55;color:var(--ink);}
.condition-list{display:grid;gap:8px;margin-top:14px;}
.condition-item{display:flex;gap:10px;padding:12px 13px;background:var(--cream-light);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12px;line-height:1.5;color:var(--muted);}
.condition-item svg{flex:0 0 auto;color:var(--green);}
.phone-row{display:flex;align-items:center;justify-content:center;gap:7px;font-size:12px;color:var(--muted);margin-top:10px;}
.phone-row a{display:inline-flex;align-items:center;min-height:44px;color:var(--green);font-weight:800;text-decoration:none;}
.success-wrap{text-align:center;padding:20px 0;}
.success-icon{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;margin:0 auto 20px;background:var(--green-soft);border:2px solid var(--green-mid);color:var(--green);}
.next-steps{margin:28px 0 20px;text-align:left;background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow-soft);}
.next-step{display:flex;gap:12px;margin-bottom:16px;color:var(--green);}
.next-step:last-child{margin-bottom:0;}
.next-step svg{flex:0 0 auto;}
.next-step-copy strong{display:block;color:var(--ink);font-size:12.5px;margin-bottom:3px;}
.next-step-copy span{display:block;color:var(--muted);font-size:12px;line-height:1.5;}

/* --- leave-the-estimator dialog ----------------------------------------- */
.modal-backdrop{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px;background:rgba(20,32,22,.55);}
.modal{width:100%;max-width:420px;background:#fff;border-radius:var(--radius);padding:24px;box-shadow:0 24px 60px rgba(12,26,16,.32);}
.modal-title{font-size:20px;line-height:1.25;font-weight:900;color:var(--ink);margin:0 0 8px;}
.modal-copy{font-size:13.5px;line-height:1.6;color:var(--muted);margin:0 0 20px;}
.modal-actions{display:flex;flex-direction:column;gap:10px;}
.modal-stay{width:100%;min-height:52px;border:0;border-radius:13px;background:var(--green);color:#fff;font-size:14.5px;font-weight:800;cursor:pointer;}
.modal-stay:hover{background:var(--green-dark);}
.modal-leave{width:100%;min-height:48px;border:1.5px solid #e3cccc;border-radius:13px;background:#fff;color:var(--danger);font-size:14px;font-weight:800;cursor:pointer;}
.modal-leave:hover{border-color:var(--danger);background:#fdf6f6;}

.fade{animation:fade-in .22s ease;}
@keyframes fade-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

@media (max-width:900px){
  .job-grid{gap:12px;}
}
@media (max-width:640px){
  .topbar-inner{min-height:62px;padding:6px 14px;}
  .logo-image{height:46px;}
  .content{padding:20px 16px 8px;}
  /* Sticky only once the action is usable, and only on mobile. Sticky stays in
     the flow, so the space beneath the content is the bar's own box -- content
     always scrolls completely clear of it. */
  .footer-wrap.is-sticky{position:sticky;bottom:0;z-index:80;background:linear-gradient(to top,#fff 62%,rgba(255,255,255,.92) 88%,rgba(255,255,255,0));}
  .heading{font-size:30px;letter-spacing:-.8px;}
  .subhead{font-size:14px;}
  /* Mobile is its own composition: one full-width card per row with a crop
     composed for a wide frame, never a shrunken copy of the desktop grid. */
  .job-grid{grid-template-columns:1fr;gap:12px;}
  .pick--job .pick-media{aspect-ratio:3/2;}
  /* One card per row means the grid cannot equalise heights for us, so the copy
     block reserves the tallest description. Ragged card bottoms otherwise. */
  .pick--job .pick-body{padding:13px 16px 15px;min-height:88px;}
  .footer-note{font-size:12px;}
  .access-grid{grid-template-columns:1fr;gap:10px;}
  .row-grid{grid-template-columns:1fr;}
  .pick--row{min-height:84px;}
  .pick--row .pick-media{flex-basis:84px;width:84px;}
  .art-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;}
  .pick--art .pick-label{font-size:12.5px;}
  .pick--art .pick-sub{font-size:12px;}
  .section-panel{padding:16px;}
  .subtype-grid{gap:8px;}
  .subtype-label{font-size:12px;}
  .location-grid{grid-template-columns:1fr 112px;}
  .input{font-size:16px;}
  .estimate-card{padding:18px 15px;}
  .estimate-card.main{padding:22px 16px;}
  .summary-row{font-size:12px;}
  .more-bar{gap:12px;padding:12px 14px;}
  .more-mark{width:48px;height:36px;}
}
@media (max-width:380px){
  .text-grid{grid-template-columns:1fr;}
  .quick-btn{padding:6px 14px;}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important;}
}
`;

// The badge's style travels with the badge. In a production build this folds to
// an empty string, so the rule is not merely unused -- it is not there.
const DEV_STYLES = import.meta.env.DEV
  ? `
.dev-badge{position:fixed;left:50%;transform:translateX(-50%);bottom:8px;z-index:300;padding:6px 14px;border-radius:999px;background:#7d2b2b;color:#fff;font-size:11px;font-weight:800;letter-spacing:.3px;box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none;}
`
  : "";

/* ---------------------------------------------------------------------------
 * Leaving the estimator
 * ------------------------------------------------------------------------ */

function CancelDialog({ onLeave, onStay, triggerRef }) {
  const dialogRef = useRef(null);
  const stayRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const opener = triggerRef.current;
    document.body.style.overflow = "hidden";
    stayRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onStay();
        return;
      }
      if (event.key !== "Tab") return;

      // Keep Tab inside the dialog so the page behind it stays unreachable.
      const focusable = dialogRef.current?.querySelectorAll("button");
      if (!focusable || !focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [onStay, triggerRef]);

  return (
    <div
      className="modal-backdrop fade"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onStay();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        aria-describedby="cancel-desc"
        ref={dialogRef}
      >
        <h2 className="modal-title" id="cancel-title">Leave the estimator?</h2>
        <p className="modal-copy" id="cancel-desc">Your answers won’t be saved.</p>
        <div className="modal-actions">
          <button className="modal-stay" type="button" ref={stayRef} onClick={onStay}>
            Keep going
          </button>
          <button className="modal-leave" type="button" onClick={onLeave}>
            Leave estimator
          </button>
        </div>
      </div>
    </div>
  );
}

// `actionReady` decides whether the primary action is allowed to stick on
// mobile. A disabled action never sticks: floating "Answer the questions to
// continue" across the questions it is asking about is worse than useless.
function Shell({ step, onBack, cancel, children, footer, actionReady = false }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const progress =
    step === TOTAL_STEPS
      ? 100
      : Math.min(100, (step / (TOTAL_STEPS - 1)) * 100);
  return (
    <div className="app">
      <style>{S}{DEV_STYLES}</style>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-wrap">
            {onBack && (
              <button className="back-btn" type="button" onClick={onBack} aria-label="Go back">
                ‹
              </button>
            )}
            <img
              className="logo-image"
              src="/images/logo.webp"
              alt="GreenVac Services"
              width="260"
              height="183"
            />
          </div>
          <div className="topbar-right">
            <span className="step-label">{step === TOTAL_STEPS ? "Complete" : `Step ${step} of ${TOTAL_STEPS - 1}`}</span>
            {cancel ? (
              <button
                className="cancel-btn"
                type="button"
                ref={cancel.triggerRef}
                onClick={cancel.onRequest}
              >
                <span>Cancel estimate</span>
              </button>
            ) : (
              // The enquiry has already been sent on the final screen, so a red
              // cancel control would imply it can still be taken back.
              <a className="home-link" href={HOME_URL}><span>Back to the website</span></a>
            )}
          </div>
        </div>
        <div className="progress" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </header>
      {/* The action lives in the document flow, after the questions it acts on.
          It is a sibling of the content rather than a fixed overlay, so every
          card, description and input scrolls clear of it. On mobile it may
          additionally stick once it is usable -- sticky keeps its own space in
          the flow, so the reserved gap and the bar are the same box. */}
      <main className="content">{children}</main>
      {footer && (
        <div className={`footer-wrap${actionReady ? " is-sticky" : ""}`}>
          <div className="footer-inner">{footer}</div>
        </div>
      )}
      {cancel?.open && (
        <CancelDialog
          onLeave={cancel.onLeave}
          onStay={cancel.onStay}
          triggerRef={cancel.triggerRef}
        />
      )}
      {MOCK_SUBMIT && (
        // Compiled out of the production bundle with the stub itself. Its job is
        // to make "this will not email James" impossible to misread while the
        // estimator is being inspected locally.
        <div className="dev-badge">Dev preview — submission is mocked, James gets nothing</div>
      )}
    </div>
  );
}

function Heading({ eyebrow, title, sub, trust, mark }) {
  return (
    <div className="heading-block">
      {mark && (
        <div className="done-mark">
          <CheckIcon size={24} />
        </div>
      )}
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1 className="heading">{title}</h1>
      {sub && <p className="subhead">{sub}</p>}
      {trust && (
        <div className="trust-row">
          <CheckIcon size={15} />
          <span>{trust}</span>
        </div>
      )}
    </div>
  );
}

function Question({ id, count, title, children }) {
  return (
    <section className="question-block" role="group" aria-labelledby={`${id}-title`}>
      {count && <div className="question-count">{count}</div>}
      <h2 className="question-title" id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}

// One card, one set of states. Photography, diagram or plain text all get the
// same hover, focus, selected, pressed and disabled treatment, and the selected
// state is never signalled by colour alone -- there is always a tick.
function Pick({ card, selected, onSelect, variant, sizes, mobileSizes, priority, eager }) {
  const media = card.photo ? (
    <Photo
      stem={card.photo}
      shape={variant === "job" ? "card" : variant === "context" ? "context" : "thumb"}
      mobileShape={variant === "job" ? "wide" : undefined}
      sizes={sizes}
      mobileSizes={mobileSizes}
      priority={priority}
      eager={eager}
    />
  ) : card.art ? (
    <Art name={card.art} />
  ) : null;

  return (
    <button
      type="button"
      className={`pick pick--${variant}${selected ? " selected" : ""}${card.quiet ? " quiet" : ""}`}
      onClick={() => onSelect(card.id)}
      aria-pressed={selected}
    >
      {media && <span className="pick-media">{media}</span>}
      <span className="pick-body">
        <span className="pick-label">{card.label}</span>
        {card.sub && <span className="pick-sub">{card.sub}</span>}
        {card.desc && <span className="pick-sub">{card.desc}</span>}
      </span>
      {selected && (
        <span className="pick-tick">
          <CheckIcon size={16} />
        </span>
      )}
    </button>
  );
}

function ArtGrid({ cards, value, onChange }) {
  return (
    <div className="art-grid">
      {cards.map((card) => (
        <Pick
          key={card.id}
          card={card}
          variant={card.art ? "art" : "text"}
          selected={value === card.id}
          onSelect={onChange}
          sizes="(max-width:640px) 45vw, 220px"
        />
      ))}
    </div>
  );
}

function TextGrid({ cards, value, onChange }) {
  return (
    <div className="text-grid">
      {cards.map((card) => (
        <Pick
          key={card.id}
          card={card}
          variant="text"
          selected={value === card.id}
          onSelect={onChange}
        />
      ))}
    </div>
  );
}

function SummaryPill({ items }) {
  return (
    <div className="summary-pill fade">
      {items.map((item) => (
        <div key={item.label}>
          <div className="summary-key">{item.label}</div>
          <div className="summary-value">{item.value || "Not sure"}</div>
        </div>
      ))}
    </div>
  );
}

function JobBreadcrumb({ ans }) {
  return (
    <div className="breadcrumb">
      <span>{getJob(ans.jobType)?.label}</span>
      <span>›</span>
      <strong>{ans.subtype}</strong>
    </div>
  );
}

// Step 1 -- deliberately simple image-led entry point.
function S1({ onNext, ans, setAns, cancel }) {
  const selectedJob = getJob(ans.jobType);
  const [showMore, setShowMore] = useState(Boolean(selectedJob && !selectedJob.featured));
  const ready = isJobStepReady(ans);
  const chosenExtra = selectedExtraJob(jobTypes, ans);

  const chooseJob = (job) => {
    setAns((current) => selectJobType(current, job.id));
  };

  return (
    <Shell
      step={1}
      cancel={cancel}
      actionReady={ready}
      footer={
        <>
          <button className="primary-btn" type="button" disabled={!ready} onClick={onNext}>
            {ready ? "Continue to job details" : "Choose a job type to continue"}
          </button>
          <div className="footer-note">No name or phone number is needed to see your estimate.</div>
        </>
      }
    >
      <Heading
        eyebrow="GreenVac Job Estimator"
        title="What do you need help with?"
        sub="Choose the closest match. You can select “Not sure” anywhere you do not know the technical answer."
        trust="Ballpark price in under two minutes"
      />

      <div className="job-grid">
        {featuredJobs.map((job, index) => (
          <Pick
            key={job.id}
            card={job}
            variant="job"
            selected={ans.jobType === job.id}
            onSelect={() => {
              setShowMore(false);
              chooseJob(job);
            }}
            priority={index === 0}
            eager
            sizes="(max-width:640px) 100vw, 220px"
            mobileSizes="100vw"
          />
        ))}
      </div>

      {/* An expansion control, never a job. Opening it selects nothing, and a
          choice made inside it stays visible once the panel closes. */}
      <button
        type="button"
        className="more-bar"
        aria-expanded={showMore}
        aria-controls="more-jobs"
        onClick={() => setShowMore((current) => !current)}
      >
        <span className="more-mark">
          <Art name="more" />
        </span>
        <span className="more-copy">
          <span className="more-title">More Job Types</span>
          <span className="more-sub">Leaks, digging under obstacles, pit cleaning and anything else.</span>
          {!showMore && chosenExtra && (
            <span className="more-chip">
              <CheckIcon size={12} />
              Selected: {chosenExtra.label}
            </span>
          )}
        </span>
        <span className="more-chevron">
          <ChevronIcon size={20} />
        </span>
      </button>

      {/* Attached directly to the disclosure, with no repeated heading -- the
          control above it already says "More Job Types". */}
      {showMore && (
        <section className="more-panel fade" id="more-jobs" aria-label="More job types">
          <div className="row-grid">
            {extraJobs.map((job) => (
              <Pick
                key={job.id}
                card={job}
                variant="row"
                selected={ans.jobType === job.id}
                onSelect={() => chooseJob(job)}
                sizes="96px"
              />
            ))}
          </div>
        </section>
      )}

      {ans.jobType && (
        <section className="section-panel fade">
          <h2 className="section-title" id="subtype-title">Which description is closest?</h2>
          <p className="section-help">This only guides the estimate. It does not lock you into a service.</p>
          <div className="subtype-grid" role="group" aria-labelledby="subtype-title">
            {(subtypes[ans.jobType] || []).map((subtype) => {
              const selected = ans.subtype === subtype;
              return (
                <button
                  key={subtype}
                  type="button"
                  className={`subtype-card${selected ? " selected" : ""}`}
                  onClick={() => setAns((current) => ({ ...current, subtype }))}
                  aria-pressed={selected}
                >
                  <span className="subtype-dot">{selected && <CheckIcon size={12} />}</span>
                  <span className="subtype-label">{subtype}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </Shell>
  );
}

function S2({ onNext, onBack, ans, setAns, cancel }) {
  const jobType = ans.jobType;
  const metres = ans.metres || 5;
  const isExposure = jobType === "service-exposure" || jobType === "potholing";
  const exactExposureCount = Number(ans.exposureCount);
  const exposureCount =
    Number.isInteger(exactExposureCount) && exactExposureCount >= 1 && exactExposureCount <= 10
      ? exactExposureCount
      : null;
  const ready = isDetailStepReady(ans);

  const set = (key) => (value) => setAns((current) => ({ ...current, [key]: value }));

  let questions = null;
  let summary = [];

  if (jobType === "trenching") {
    questions = (
      <>
        <Question id="q-metres" count="Question 1 of 3" title="Roughly how many metres?">
          <div className="metre-control">
            <button
              className="metre-btn"
              type="button"
              onClick={() => setAns((current) => ({ ...current, metres: Math.max(1, (current.metres || 5) - 1) }))}
              aria-label="Reduce trench length"
            >
              −
            </button>
            <div className="metre-value">
              {metres}<span className="metre-unit">m</span>
            </div>
            <button
              className="metre-btn"
              type="button"
              onClick={() => setAns((current) => ({ ...current, metres: (current.metres || 5) + 1 }))}
              aria-label="Increase trench length"
            >
              +
            </button>
          </div>
          <div className="quick-row">
            {[5, 10, 20, 50].map((value) => (
              <button
                key={value}
                type="button"
                className={`quick-btn${metres === value ? " selected" : ""}`}
                onClick={() => setAns((current) => ({ ...current, metres: value }))}
                aria-pressed={metres === value}
              >
                {value} m
              </button>
            ))}
          </div>
        </Question>
        <Question id="q-depth" count="Question 2 of 3" title="What depth is expected?">
          <ArtGrid cards={depthCards} value={ans.depth} onChange={set("depth")} />
        </Question>
        <Question id="q-width" count="Question 3 of 3" title="How wide should it be?">
          <ArtGrid cards={widthCards} value={ans.width} onChange={set("width")} />
        </Question>
      </>
    );
    summary = [
      { label: "Length", value: `${metres} m` },
      { label: "Depth", value: findLabel(depthCards, ans.depth) },
      { label: "Width", value: findLabel(widthCards, ans.width) },
    ];
  } else if (isExposure) {
    questions = (
      <>
        <Question
          id="q-count"
          count="Question 1 of 2"
          title={jobType === "potholing" ? "How many potholes are likely?" : "How many areas need digging?"}
        >
          <div className="metre-control" role="group" aria-label="Approximate number of spots">
            <button
              className="metre-btn"
              type="button"
              onClick={() => set("exposureCount")(Math.max(1, (exposureCount || 1) - 1))}
              aria-label="Reduce spot count"
              disabled={exposureCount === 1}
            >
              &minus;
            </button>
            <div className="metre-value" aria-live="polite">
              {exposureCount || "\u2014"}{" "}
              <span className="metre-unit">{exposureCount === 1 ? "spot" : "spots"}</span>
            </div>
            <button
              className="metre-btn"
              type="button"
              onClick={() => set("exposureCount")(Math.min(10, (exposureCount || 0) + 1))}
              aria-label="Increase spot count"
              disabled={exposureCount === 10}
            >
              +
            </button>
          </div>
          <div className="quick-row" aria-label="Choose an exact spot count">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <button
                key={value}
                type="button"
                className={`quick-btn${exposureCount === value ? " selected" : ""}`}
                onClick={() => set("exposureCount")(value)}
                aria-pressed={exposureCount === value}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="art-grid count-review-grid">
            {exposureCountCards.map((card) => (
              <Pick
                key={card.id}
                card={card}
                variant="art"
                selected={ans.exposureCount === card.id}
                onSelect={set("exposureCount")}
              />
            ))}
          </div>
        </Question>
        <Question id="q-exposure-depth" count="Question 2 of 2" title="What depth is expected?">
          <ArtGrid cards={exposureDepthCards} value={ans.exposureDepth} onChange={set("exposureDepth")} />
        </Question>
      </>
    );
    summary = [
      {
        label: jobType === "potholing" ? "Potholes" : "Areas",
        value: getExposureCountLabel(ans.exposureCount),
      },
      { label: "Depth", value: findLabel(exposureDepthCards, ans.exposureDepth) },
    ];
  } else if (jobType === "leak-exposure") {
    questions = (
      <Question id="q-leak" count="Question 1 of 1" title="How well is the leak location known?">
        <ArtGrid cards={leakAreaCards} value={ans.leakArea} onChange={set("leakArea")} />
      </Question>
    );
    summary = [{ label: "Search area", value: findLabel(leakAreaCards, ans.leakArea) }];
  } else if (jobType === "pit-cleanout") {
    questions = (
      <>
        <Question id="q-pit-size" count="Question 1 of 2" title="Roughly how big is it?">
          <ArtGrid cards={pitSizeCards} value={ans.pitSize} onChange={set("pitSize")} />
        </Question>
        <Question id="q-pit-fill" count="Question 2 of 2" title="What is the material like inside?">
          <ArtGrid cards={pitFillCards} value={ans.pitFill} onChange={set("pitFill")} />
        </Question>
      </>
    );
    summary = [
      { label: "Size", value: findLabel(pitSizeCards, ans.pitSize) },
      { label: "Material", value: findLabel(pitFillCards, ans.pitFill) },
    ];
  } else if (jobType === "cattle-grid") {
    questions = (
      <>
        <Question id="q-grids" count="Question 1 of 2" title="How many grids need cleaning?">
          <ArtGrid cards={cattleCountCards} value={ans.cattleCount} onChange={set("cattleCount")} />
        </Question>
        <Question id="q-grid-fill" count="Question 2 of 2" title="How full are they?">
          <ArtGrid cards={cattleFillCards} value={ans.cattleFill} onChange={set("cattleFill")} />
        </Question>
      </>
    );
    summary = [
      { label: "Grids", value: findLabel(cattleCountCards, ans.cattleCount) },
      { label: "Buildup", value: findLabel(cattleFillCards, ans.cattleFill) },
    ];
  } else if (jobType === "tunnel-bore") {
    questions = (
      <Question id="q-bore" count="Question 1 of 1" title="Roughly how far underneath?">
        <ArtGrid cards={obstacleDistanceCards} value={ans.boreDist} onChange={set("boreDist")} />
      </Question>
    );
    summary = [{ label: "Distance", value: findLabel(obstacleDistanceCards, ans.boreDist) }];
  } else if (jobType === "other") {
    // No cards here on purpose. This path exists precisely because the job is
    // outside what the estimator can size, so asking the customer to pick a
    // bucket would only manufacture an input for a number we refuse to invent.
    questions = (
      <Question id="q-other" count="Question 1 of 1" title="What do you need done?">
        <p className="section-help" style={{ marginTop: -4 }}>
          A couple of lines is plenty. James reads this himself.
        </p>
        <textarea
          className="input"
          id="other-description"
          placeholder="What the job involves, roughly where it is, and anything that makes it unusual..."
          value={ans.otherDescription || ""}
          onChange={(event) => setAns((current) => ({ ...current, otherDescription: event.target.value }))}
        />
      </Question>
    );
    summary = [{ label: "Pricing", value: "James will assess it" }];
  }

  return (
    <Shell
      step={2}
      onBack={onBack}
      cancel={cancel}
      actionReady={ready}
      footer={
        <button className="primary-btn" type="button" disabled={!ready} onClick={onNext}>
          {ready ? "Continue to site details" : "Answer the job questions to continue"}
        </button>
      }
    >
      <JobBreadcrumb ans={ans} />
      <Heading
        eyebrow="Job Details"
        title="Tell us about the dig"
        sub="A rough answer is enough. James will confirm the technical details before the job."
      />
      {questions}
      {ready && <SummaryPill items={summary} />}
    </Shell>
  );
}

function S3({ onNext, onBack, ans, setAns, cancel }) {
  const ready = isSiteStepReady(ans);
  const uncertain = hasUncertainSiteAnswer(ans);
  const requiresSpoilVolume = ans.jobType !== "trenching" && ans.spoil === "remove-all";
  const questionTotal = requiresSpoilVolume ? 5 : 4;
  const set = (key) => (value) => setAns((current) => ({ ...current, [key]: value }));
  const setSpoil = (value) =>
    setAns((current) => ({
      ...current,
      spoil: value,
      ...(value === "remove-all" ? {} : { spoilVolume: null }),
    }));

  return (
    <Shell
      step={3}
      onBack={onBack}
      cancel={cancel}
      actionReady={ready}
      footer={
        <button className="primary-btn" type="button" disabled={!ready} onClick={onNext}>
          {ready ? "Show My Ballpark Price" : "Complete the site questions"}
        </button>
      }
    >
      <Heading
        eyebrow="Site Conditions"
        title="What is the site like?"
        sub="These details affect how quickly the work can be completed. “Not sure” is always a valid answer."
      />

      <div className="location-panel">
        <label className="field-label" htmlFor="suburb">
          Job location <span className="field-hint">— contact details come later</span>
        </label>
        <div className="location-grid">
          <input
            id="suburb"
            className="input"
            type="text"
            placeholder="Suburb *"
            value={ans.suburb || ""}
            onChange={(event) => setAns((current) => ({ ...current, suburb: event.target.value }))}
            autoComplete="address-level2"
          />
          <input
            className="input"
            type="text"
            placeholder="Postcode"
            aria-label="Postcode"
            value={ans.postcode || ""}
            onChange={(event) => setAns((current) => ({ ...current, postcode: event.target.value }))}
            autoComplete="postal-code"
            inputMode="numeric"
          />
        </div>
      </div>

      <Question id="q-access" count={`Question 1 of ${questionTotal}`} title="How is the access?">
        <div className="access-grid">
          {accessCards.map((card) => (
            <Pick
              key={card.id}
              card={card}
              variant="context"
              selected={ans.access === card.id}
              onSelect={set("access")}
              eager
              sizes="(max-width:640px) 100vw, 330px"
            />
          ))}
        </div>
      </Question>

      <Question id="q-ground" count={`Question 2 of ${questionTotal}`} title="What is the ground like?">
        <ArtGrid cards={groundCards} value={ans.ground} onChange={set("ground")} />
      </Question>

      <Question id="q-services" count={`Question 3 of ${questionTotal}`} title="Are underground services nearby?">
        <ArtGrid cards={congestionCards} value={ans.congestion} onChange={set("congestion")} />
      </Question>

      <Question id="q-spoil" count={`Question 4 of ${questionTotal}`} title="What should happen with the spoil?">
        <ArtGrid cards={spoilCards} value={ans.spoil} onChange={setSpoil} />
      </Question>

      {requiresSpoilVolume && (
        <Question id="q-spoil-volume" count="Question 5 of 5" title="How much spoil should be removed?">
          <p className="section-help" style={{ marginTop: -4 }}>
            A rough volume is enough. GreenVac charges $85 + GST per cubic metre.
          </p>
          <ArtGrid cards={spoilVolumeCards} value={ans.spoilVolume} onChange={set("spoilVolume")} />
        </Question>
      )}

      <label className="field-label" htmlFor="site-notes">
        Anything else James should know? <span className="field-hint">(optional)</span>
      </label>
      <textarea
        id="site-notes"
        className="input"
        placeholder="Roots, nearby services, access concerns, very wet spoil or anything unusual..."
        value={ans.siteNotes || ""}
        onChange={(event) => setAns((current) => ({ ...current, siteNotes: event.target.value }))}
      />

      {uncertain && (
        <div className="reassure fade">
          <CheckIcon size={18} />
          <div>
            <strong>Not knowing is completely fine</strong>
            GreenVac deals with unknown services, tight access and uncertain ground conditions every day. James will review the risk before confirming a final price.
          </div>
        </div>
      )}
    </Shell>
  );
}

// Pricing engine. GreenVac charges one onsite hourly rate, with a three-hour
// onsite minimum plus one fixed travel charge for every automatically priced
// job. The 15% range buffer applies to onsite work only; the fixed travel
// amount is added unchanged to both ends before upward rounding.
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

function buildLocation(ans) {
  const streetAndSuburb = [ans.address?.trim(), ans.suburb?.trim()].filter(Boolean).join(", ");
  return [streetAndSuburb, ans.postcode?.trim()].filter(Boolean).join(" ").trim() || "Not provided";
}

function getPreferredDayLabel(ans) {
  return urgencyCards.find((item) => item.id === ans.preferredDay)?.label || "Not provided";
}

function getJobDetailRows(ans) {
  const rows = [];
  const add = (label, value) => {
    if (value) rows.push({ label, value });
  };

  if (ans.jobType === "trenching") {
    add("Length", `${ans.metres || 5} m`);
    add("Depth", depthCards.find((item) => item.id === ans.depth)?.label);
    add("Width", widthCards.find((item) => item.id === ans.width)?.label);
  } else if (ans.jobType === "service-exposure" || ans.jobType === "potholing") {
    add(
      ans.jobType === "potholing" ? "Potholes" : "Areas",
      getExposureCountLabel(ans.exposureCount),
    );
    add("Depth", exposureDepthCards.find((item) => item.id === ans.exposureDepth)?.label);
  } else if (ans.jobType === "leak-exposure") {
    add("Search area", leakAreaCards.find((item) => item.id === ans.leakArea)?.label);
  } else if (ans.jobType === "pit-cleanout") {
    add("Pit size", pitSizeCards.find((item) => item.id === ans.pitSize)?.label);
    add("Material", pitFillCards.find((item) => item.id === ans.pitFill)?.label);
  } else if (ans.jobType === "cattle-grid") {
    add("Grids", cattleCountCards.find((item) => item.id === ans.cattleCount)?.label);
    add("Buildup", cattleFillCards.find((item) => item.id === ans.cattleFill)?.label);
  } else if (ans.jobType === "tunnel-bore") {
    add("Distance", obstacleDistanceCards.find((item) => item.id === ans.boreDist)?.label);
  } else if (ans.jobType === "other") {
    add("What is needed", ans.otherDescription?.trim());
  }

  return rows;
}

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

function SummaryRows({ rows }) {
  return rows.map((row) => (
    <div className="summary-row" key={row.label}>
      <span>{row.label}</span>
      <strong>{row.value || "Not provided"}</strong>
    </div>
  ));
}

function S4({ onNext, onBack, ans, cancel }) {
  const estimate = calcEstimate(ans);
  const job = getJob(ans.jobType);
  const detailRows = getJobDetailRows(ans);
  const conditionSummary = [
    findLabel(accessCards, ans.access),
    findLabel(groundCards, ans.ground),
    findLabel(congestionCards, ans.congestion),
  ].filter(Boolean).join(" · ");

  return (
    <Shell
      step={4}
      onBack={onBack}
      cancel={cancel}
      actionReady
      footer={
        <>
          <button className="primary-btn" type="button" onClick={onNext}>
            {estimate.manualOnly ? "Ask James to Price This Job" : "Ask James to Review My Estimate"}
          </button>
          <div className="footer-note">
            {estimate.manualOnly
              ? "Contact details are only requested after you have seen where you stand."
              : "Contact details are only requested after you have seen the price."}
          </div>
        </>
      }
    >
      <Heading
        mark
        eyebrow={estimate.manualOnly ? "NO AUTOMATIC ESTIMATE" : "YOUR NO-OBLIGATION ESTIMATE"}
        title={estimate.manualOnly ? "Thanks — James will price this one himself" : "Thanks — here’s your ballpark estimate"}
        sub={
          estimate.manualOnly
            ? "This one sits outside the jobs the estimator can price honestly, so it isn’t going to guess at a number. Send the details through and James will work out a ballpark once he has looked at them. There’s no obligation either way."
            : "You’ve given us a good picture of the job. There’s no obligation and no sales follow-up unless you choose to send the estimate to James for review."
        }
      />

      {/* The price comes first. A tall hero photograph here used to push the
          number below the fold on a 375px phone. */}
      {estimate.manualOnly ? (
        <div className="estimate-card main manual">
          <div className="estimate-kicker">Priced by James</div>
          <div className="manual-line">A ballpark needs a proper look</div>
          <div className="estimate-gst">
            {estimate.reviewReason}
          </div>
          <div className="privacy-proof">
            <CheckIcon size={13} />
            No guessed price shown
          </div>
        </div>
      ) : (
        <div className="estimate-card main">
          <div className="estimate-kicker">Indicative estimate</div>
          <div className="estimate-range">
            ${estimate.low.toLocaleString()} – ${estimate.high.toLocaleString()}
          </div>
          <div className="estimate-gst">+ GST · Subject to GreenVac site review</div>
          <div className="privacy-proof">
            <CheckIcon size={13} />
            Price shown before contact details
          </div>
        </div>
      )}

      {/* The uncertainty note is about a range that already exists, so it only
          belongs on the priced path. */}
      {estimate.needsReview && !estimate.manualOnly && (
        <div className="reassure">
          <CheckIcon size={18} />
          <div>
            <strong>James will personally review this one</strong>
            One or more details are uncertain or site-dependent. That is normal and the range already allows for your current answers.
          </div>
        </div>
      )}

      <div className="estimate-card">
        <div className="summary-heading">
          {job?.photo && (
            <span className="summary-thumb">
              <Photo stem={job.photo} shape="thumb" sizes="38px" />
            </span>
          )}
          {estimate.manualOnly ? "What James will look at" : "Estimate based on"}
        </div>
        <SummaryRows
          rows={[
            { label: "Service", value: job?.label },
            { label: "Job type", value: ans.subtype },
            ...detailRows,
            { label: "Location", value: buildLocation(ans) },
            { label: "Site conditions", value: conditionSummary },
            { label: "Spoil", value: findLabel(spoilCards, ans.spoil) },
            ...getSpoilRemovalSummaryRows(estimate),
            ...(estimate.manualOnly
              ? []
              : [{ label: "Travel", value: `$${estimate.travel} + GST fixed travel included` }]),
          ]}
        />
      </div>

      <div className="info-note">
        {estimate.manualOnly
          ? "Nothing is booked and no price has been set. James will look at these details and come back to you with a ballpark and what he needs to confirm it."
          : "This is an indicative estimate, not a formal quote or confirmed booking. Final pricing may change if the actual depth, access, ground, spoil or underground conditions differ from the answers provided."}
      </div>
    </Shell>
  );
}

function S5({ onNext, onBack, ans, setAns, cancel }) {
  const photoCount = ans.sitePhotos?.length || 0;
  const ready = isContactStepReady(ans);

  const handlePhotos = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5);
    setAns((current) => ({ ...current, sitePhotos: files }));
  };

  return (
    <Shell
      step={5}
      onBack={onBack}
      cancel={cancel}
      actionReady={ready}
      footer={
        <button className="primary-btn" type="button" disabled={!ready} onClick={onNext}>
          {ready ? "Review My Request" : "Add your name, mobile and timing"}
        </button>
      }
    >
      <Heading
        eyebrow="Send It to James"
        title="Want GreenVac to review it?"
        sub="Add your details so James can check the estimate against your site and confirm the next step."
      />

      <div className="estimate-card">
        <div className="summary-heading">Your details</div>
        <div className="field-stack">
          <input
            className="input"
            type="text"
            placeholder="Full name *"
            aria-label="Full name"
            value={ans.name || ""}
            onChange={(event) => setAns((current) => ({ ...current, name: event.target.value }))}
            autoComplete="name"
          />
          <input
            className="input"
            type="tel"
            placeholder="Mobile number *"
            aria-label="Mobile number"
            value={ans.mobile || ""}
            onChange={(event) => setAns((current) => ({ ...current, mobile: event.target.value }))}
            autoComplete="tel"
            inputMode="tel"
          />
          <input
            className="input"
            type="email"
            placeholder="Email address (optional)"
            aria-label="Email address"
            value={ans.email || ""}
            onChange={(event) => setAns((current) => ({ ...current, email: event.target.value }))}
            autoComplete="email"
            inputMode="email"
          />
        </div>
      </div>

      <div className="estimate-card">
        <div className="summary-heading">Job address</div>
        <div className="field-stack">
          <input
            className="input"
            type="text"
            placeholder="Street address (optional)"
            aria-label="Street address"
            value={ans.address || ""}
            onChange={(event) => setAns((current) => ({ ...current, address: event.target.value }))}
            autoComplete="street-address"
          />
          <textarea
            className="input"
            placeholder="Parking, gate width, access instructions or anything else useful..."
            aria-label="Access notes"
            value={ans.accessNotes || ""}
            onChange={(event) => setAns((current) => ({ ...current, accessNotes: event.target.value }))}
          />
        </div>
      </div>

      <div className="estimate-card">
        <div className="summary-heading">Site photos (optional)</div>
        <label className="photo-zone" htmlFor="site-photos">
          <input
            id="site-photos"
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotos}
            style={{ display: "none" }}
          />
          <CameraIcon />
          <div className="photo-title">
            {photoCount
              ? `${photoCount} photo${photoCount === 1 ? "" : "s"} selected`
              : "Add Up to 5 Photos"}
          </div>
          <div className="photo-help">Photos often let James confirm access and scope much faster.</div>
        </label>
        <div className="photo-examples" aria-label="Useful photo examples">
          {[
            { stem: "tight-access", label: "Where we can park" },
            { stem: "service-access", label: "The access route" },
            { stem: "ndd-exposed-pipe", label: "The digging area" },
          ].map((example) => (
            <div className="photo-example" key={example.label}>
              <Photo stem={example.stem} shape="thumb" sizes="(max-width:640px) 30vw, 210px" />
              <span>{example.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="estimate-card">
        <div className="summary-heading" id="timing-title">How soon do you need it?</div>
        <div role="group" aria-labelledby="timing-title">
          <TextGrid
            cards={urgencyCards}
            value={ans.preferredDay}
            onChange={(preferredDay) =>
              setAns((current) => ({
                ...current,
                preferredDay,
                preferredTime: "flexible",
              }))
            }
          />
        </div>
        <label className="field-label" htmlFor="timing-notes" style={{ marginTop: 16 }}>
          Timing notes <span className="field-hint">(optional)</span>
        </label>
        <input
          id="timing-notes"
          className="input"
          type="text"
          placeholder="A deadline, preferred day or access restriction..."
          value={ans.timingNotes || ""}
          onChange={(event) => setAns((current) => ({ ...current, timingNotes: event.target.value }))}
        />
        <div className="info-note" style={{ marginTop: 12, marginBottom: 0 }}>
          This tells James your urgency. It does not book a day or time.
        </div>
      </div>
    </Shell>
  );
}

function buildRequestDetails(ans) {
  const job = getJob(ans.jobType);
  const detailRows = getJobDetailRows(ans);
  const estimate = calcEstimate(ans);
  const access = findLabel(accessCards, ans.access);
  const ground = findLabel(groundCards, ans.ground);
  const servicesNearby = findLabel(congestionCards, ans.congestion);
  const spoil = findLabel(spoilCards, ans.spoil);
  const spoilVolume = getSpoilVolumeOption(ans.spoilVolume)?.label;
  const timing = getPreferredDayLabel(ans);
  const address = buildLocation(ans);
  const photoCount = ans.sitePhotos?.length || 0;
  const body = [
    "NEW ESTIMATE REQUEST - GREENVAC",
    "",
    "----------------------------",
    estimate.manualOnly
      ? "NO AUTOMATIC ESTIMATE - NEEDS PRICING BY JAMES"
      : `INDICATIVE ESTIMATE: $${estimate.low.toLocaleString()} - $${estimate.high.toLocaleString()} + GST`,
    estimate.manualOnly
      ? `The customer was shown no price. Review reason: ${estimate.reviewReason}`
      : estimate.needsReview ? "Flagged for manual review" : "Standard estimate",
    "----------------------------",
    "",
    "CUSTOMER",
    `Name: ${ans.name || "Not provided"}`,
    `Mobile: ${ans.mobile || "Not provided"}`,
    `Email: ${ans.email || "Not provided"}`,
    "",
    "JOB DETAILS",
    `Service: ${job?.label || "Not provided"}`,
    `Type: ${ans.subtype || "Not provided"}`,
    ...detailRows.map((row) => `${row.label}: ${row.value || "Not provided"}`),
    `Access: ${access || "Not provided"}`,
    `Ground conditions: ${ground || "Not provided"}`,
    `Services nearby: ${servicesNearby || "Not provided"}`,
    `Spoil: ${spoil || "Not provided"}`,
    ...(estimate.spoilRemoval.active
      ? [
          `Estimated spoil volume: ${trimDecimal(estimate.spoilRemoval.volumeM3)} m³`,
          `Spoil removal rate: $${estimate.spoilRemoval.ratePerM3}/m³ + GST`,
          `Spoil removal cost: $${formatSpoilCost(estimate.spoilRemoval.cost)} + GST`,
          `Spoil volume assumed: ${estimate.spoilRemoval.volumeAssumed ? "Yes" : "No"}`,
          ...(estimate.spoilRemoval.assumptionNote
            ? [`Spoil assumption: ${estimate.spoilRemoval.assumptionNote}`]
            : []),
        ]
      : ["Spoil removal cost: $0.00 + GST"]),
    estimate.manualOnly
      ? "Travel: Requires James's review"
      : `Travel: $${estimate.travel} + GST fixed travel included`,
    `Site notes: ${ans.siteNotes || "Not provided"}`,
    "",
    "SITE",
    `Address: ${address}`,
    `Access notes: ${ans.accessNotes || "Not provided"}`,
    `Site photos selected: ${photoCount}`,
    "",
    "TIMING",
    `Urgency: ${timing}`,
    `Timing notes: ${ans.timingNotes || "Not provided"}`,
  ].join("\n");

  return {
    job,
    detailRows,
    estimate,
    access,
    ground,
    servicesNearby,
    spoil,
    spoilVolume,
    timing,
    address,
    body,
    subject: `Estimate Request - ${ans.subtype || "Hydrovac Job"}`,
  };
}

function S6({ onNext, onBack, ans, setAns, cancel }) {
  const [submitState, setSubmitState] = useState("idle");
  const [submitError, setSubmitError] = useState("");
  const submitLockRef = useRef(false);
  const submissionEventIdRef = useRef(null);
  const isSubmitting = submitState === "submitting";
  const request = buildRequestDetails(ans);

  async function handleSubmit() {
    if (submitLockRef.current || !ans.acceptedTerms) return;

    submitLockRef.current = true;
    if (!submissionEventIdRef.current) {
      submissionEventIdRef.current =
        window.GreenVacAnalytics?.createEventId("estimator") ||
        `estimator-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    }

    setSubmitState("submitting");
    setSubmitError("");

    if (typeof window.posthog !== "undefined") {
      window.posthog.capture("estimator_submit_attempt");
    }

    const formData = new FormData();
    formData.append("_to", "james@greenvac.com.au");
    formData.append("_subject", request.subject);
    formData.append("_replyto", ans.email || "");
    formData.append("form_type", "Job Estimator");
    formData.append("lead_type", "estimate_request");
    formData.append("entrypoint", "job_estimator");
    formData.append("name", ans.name || "");
    formData.append("mobile", ans.mobile || "");
    formData.append("email", ans.email || "");
    formData.append("job_type", ans.jobType || "");
    formData.append("subtype", ans.subtype || "");
    formData.append(
      "estimate_low",
      request.estimate.manualOnly ? "" : `$${request.estimate.low.toLocaleString()} + GST`,
    );
    formData.append(
      "estimate_high",
      request.estimate.manualOnly ? "" : `$${request.estimate.high.toLocaleString()} + GST`,
    );
    formData.append(
      "spoil_volume_m3",
      request.estimate.spoilRemoval.active
        ? trimDecimal(request.estimate.spoilRemoval.volumeM3)
        : "0",
    );
    formData.append(
      "spoil_rate_per_m3",
      `$${request.estimate.spoilRemoval.ratePerM3}/m³ + GST`,
    );
    formData.append(
      "spoil_cost",
      `$${formatSpoilCost(request.estimate.spoilRemoval.cost)} + GST`,
    );
    formData.append(
      "spoil_volume_assumed",
      request.estimate.spoilRemoval.volumeAssumed ? "yes" : "no",
    );
    formData.append(
      "spoil_assumption_note",
      request.estimate.spoilRemoval.assumptionNote || "",
    );
    formData.append("needs_review", request.estimate.needsReview ? "yes" : "no");
    formData.append("address", request.address || "");
    formData.append("suburb", ans.suburb || "");
    formData.append("postcode", ans.postcode || "");
    formData.append("access_notes", ans.accessNotes || "");
    formData.append("site_photo_count", String(ans.sitePhotos?.length || 0));
    formData.append("preferred_day", request.timing || "");
    formData.append("preferred_time", "Flexible");
    formData.append("message", request.body);
    formData.append("source_page", window.location.pathname);
    formData.append("analytics_event_id", submissionEventIdRef.current);
    (ans.sitePhotos || []).forEach((file, index) => {
      formData.append(`site_photo_${index + 1}`, file);
    });

    try {
      // The acceptance check, the lead dispatch and the success transition below
      // are identical either way -- the stub only stands in for the network.
      const response = MOCK_SUBMIT
        ? await mockSubmission()
        : await fetch(FORM_ENDPOINT, {
            method: "POST",
            body: formData,
            headers: { Accept: "application/json" },
          });

      let payload = null;
      try {
        payload = await response.json();
      } catch (_error) {
        payload = null;
      }

      if (!response.ok || payload?.success === "false" || payload?.success === false) {
        const providerMessage =
          payload?.message ||
          payload?.errors?.map((error) => error.message).join(" ");
        throw new Error(providerMessage || `Request failed with status ${response.status}`);
      }

      window.GreenVacAnalytics?.trackEstimatorLead({
        eventId: submissionEventIdRef.current,
      });

      if (typeof window.posthog !== "undefined") {
        window.posthog.capture("estimator_submit_success");
      }

      setSubmitState("success");
      onNext();
    } catch {
      if (typeof window.posthog !== "undefined") {
        window.posthog.capture("estimator_submit_error", {
          reason: "submission_failed",
        });
      }

      submitLockRef.current = false;
      setSubmitState("error");
      setSubmitError(
        "Could not send your request right now. Please try again, call James direct, or use the email fallback below.",
      );
    }
  }

  const fallbackMailto =
    `mailto:james@greenvac.com.au?subject=${encodeURIComponent(request.subject)}` +
    `&body=${encodeURIComponent(request.body)}`;

  const conditionSummary = [
    request.access,
    request.ground,
    request.servicesNearby,
  ].filter(Boolean).join(" · ");

  return (
    <Shell
      step={6}
      onBack={onBack}
      cancel={cancel}
      actionReady={Boolean(ans.acceptedTerms) && !isSubmitting}
      footer={
        <>
          <button
            className="primary-btn"
            type="button"
            onClick={handleSubmit}
            disabled={!ans.acceptedTerms || isSubmitting}
          >
            {isSubmitting
              ? "Sending Request..."
              : submitState === "error"
                ? "Try Sending Again"
                : "Send Estimate Request"}
          </button>
          <div className="phone-row">
            <PhoneIcon size={14} />
            <span>Urgent?</span>
            <a href="tel:0408362590" data-phone-placement="estimator_review">
              Call 0408 362 590
            </a>
          </div>
        </>
      }
    >
      <Heading
        eyebrow="Final Check"
        title="Review your request"
        sub="Nothing is booked yet. This sends your answers and ballpark estimate to James for a personal review."
      />

      {request.estimate.manualOnly ? (
        <div className="estimate-card main manual">
          <div className="estimate-kicker">Priced by James</div>
          <div className="manual-line">No automatic estimate for this one</div>
          <div className="estimate-gst">{request.estimate.reviewReason}</div>
        </div>
      ) : (
        <div className="estimate-card main">
          <div className="estimate-kicker">Your ballpark estimate</div>
          <div className="estimate-range">
            ${request.estimate.low.toLocaleString()} – ${request.estimate.high.toLocaleString()}
          </div>
          <div className="estimate-gst">+ GST · Subject to GreenVac site review</div>
        </div>
      )}

      <div className="estimate-card">
        <div className="summary-heading">Request summary</div>
        <SummaryRows
          rows={[
            { label: "Service", value: request.job?.label },
            { label: "Type", value: ans.subtype },
            ...request.detailRows,
            { label: "Site conditions", value: conditionSummary },
            { label: "Spoil", value: request.spoil },
            ...getSpoilRemovalSummaryRows(request.estimate),
            { label: "Name", value: ans.name },
            { label: "Mobile", value: ans.mobile },
            { label: "Location", value: request.address },
            {
              label: "Photos",
              value: ans.sitePhotos?.length
                ? `${ans.sitePhotos.length} selected`
                : "None",
            },
            { label: "Timing", value: request.timing },
          ]}
        />
      </div>

      <div className="condition-list">
        {(request.estimate.manualOnly
          ? [
              "No price has been calculated for this job, and none is implied.",
              "James reads the description himself and works out a ballpark from it.",
              "He confirms pricing and availability with you before any booking is made.",
            ]
          : [
              "The estimate assumes the access, ground and spoil conditions described.",
              "Unknown services, rock, buried obstacles or a different scope may change the final price.",
              "James confirms pricing and availability before any booking is made.",
            ]
        ).map((condition) => (
          <div className="condition-item" key={condition}>
            <CheckIcon size={16} />
            <span>{condition}</span>
          </div>
        ))}
      </div>

      <button
        className={`checkbox${ans.acceptedTerms ? " selected" : ""}`}
        type="button"
        onClick={() =>
          setAns((current) => ({
            ...current,
            acceptedTerms: !current.acceptedTerms,
          }))
        }
        aria-pressed={Boolean(ans.acceptedTerms)}
      >
        <span className="checkbox-box">
          {ans.acceptedTerms && <CheckIcon size={14} />}
        </span>
        <span className="checkbox-copy">
          {request.estimate.manualOnly
            ? "I understand no price has been given yet and GreenVac will come back to me with a ballpark after reviewing the job."
            : "I understand this is an indicative estimate and GreenVac will confirm the final price and availability after reviewing the job."}
        </span>
      </button>

      {submitError && (
        <div className="info-note error" style={{ marginTop: 14 }} role="alert">
          {submitError}{" "}
          <a href={fallbackMailto} style={{ color: "var(--green)", fontWeight: 800 }}>
            Open Email Instead
          </a>
        </div>
      )}
    </Shell>
  );
}

function S7({ onRestart }) {
  return (
    <Shell
      step={7}
      footer={
        <button className="secondary-btn" type="button" onClick={onRestart}>
          Start a New Estimate
        </button>
      }
    >
      <div className="success-wrap">
        <div className="success-icon">
          <CheckIcon size={34} />
        </div>
        <Heading
          eyebrow="Request Sent"
          title="James has your job details"
          sub="GreenVac will review the site information and contact you to confirm the price, scope and availability."
        />

        <div className="next-steps">
          {[
            {
              icon: <PhoneIcon />,
              title: "James reviews the request",
              text: "He checks the job details, access, photos and estimate assumptions.",
            },
            {
              icon: <ChatIcon />,
              title: "GreenVac contacts you",
              text: "You can clarify the scope and confirm the final price.",
            },
            {
              icon: <TruckIcon />,
              title: "A time is agreed",
              text: "The job is only booked once you and GreenVac have confirmed it.",
            },
          ].map((item) => (
            <div className="next-step" key={item.title}>
              {item.icon}
              <div className="next-step-copy">
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="phone-row">
          <span>Need to speak sooner?</span>
          <a href="tel:0408362590" data-phone-placement="estimator_success">
            Call James directly
          </a>
        </div>
      </div>
    </Shell>
  );
}

export default function App() {
  const [screen, setScreen] = useState(1);
  const [ans, setAns] = useState({
    metres: 5,
    preferredTime: "flexible",
  });
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelTriggerRef = useRef(null);

  const next = () => {
    if (typeof window.posthog !== "undefined") {
      if (screen === 1) {
        window.posthog.capture("estimator_started");
      }
      window.posthog.capture(`estimator_step_${screen + 1}`, {
        from_step: screen,
      });
    }
    setScreen((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setScreen((current) => Math.max(1, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restart = () => {
    setScreen(1);
    setAns({ metres: 5, preferredTime: "flexible" });
    window.scrollTo({ top: 0 });
  };

  // Cancelling is diagnostic product analytics and nothing more. It stays on
  // PostHog, carries only the step, and deliberately never touches the shared
  // lead helper -- a customer leaving must never look like a converted lead.
  const captureCancel = (action) => {
    if (typeof window.posthog === "undefined") return;
    window.posthog.capture(cancelEventName(action), cancelPayload(screen));
  };

  const cancel = {
    triggerRef: cancelTriggerRef,
    open: cancelOpen,
    stepId: stepIdFor(screen),
    onRequest: () => {
      captureCancel("clicked");
      setCancelOpen(true);
    },
    onStay: () => {
      captureCancel("dismissed");
      setCancelOpen(false);
    },
    onLeave: () => {
      captureCancel("confirmed");
      window.location.href = HOME_URL;
    },
  };

  const shared = { ans, setAns, onNext: next, onBack: back, cancel };
  if (screen === 1) return <S1 {...shared} />;
  if (screen === 2) return <S2 {...shared} />;
  if (screen === 3) return <S3 {...shared} />;
  if (screen === 4) return <S4 ans={ans} onNext={next} onBack={back} cancel={cancel} />;
  if (screen === 5) return <S5 {...shared} />;
  if (screen === 6) return <S6 {...shared} />;
  return <S7 onRestart={restart} />;
}
