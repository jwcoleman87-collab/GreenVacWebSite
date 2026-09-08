// Customer choices and labels; IDs retain their original pricing meanings.
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
    sub: "Include removal in my estimate",
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


export { jobTypes, subtypes, depthCards, widthCards, accessCards, groundCards, congestionCards, spoilCards, urgencyCards, exposureCountCards, exposureDepthCards, leakAreaCards, pitSizeCards, pitFillCards, cattleCountCards, cattleFillCards, obstacleDistanceCards, getJob, findLabel, getExposureCountLabel, buildLocation, getPreferredDayLabel, getJobDetailRows };
