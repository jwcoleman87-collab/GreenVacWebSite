import { useEffect, useRef, useState } from "react";

const FORM_ENDPOINT = "https://flowform.to/submit";
const TOTAL_STEPS = 7;

// Customer-facing job categories. The first three are deliberately featured;
// the remaining services sit behind one "More job types" choice.
const jobTypes = [
  {
    id: "service-exposure",
    label: "Non-Destructive Digging",
    shortLabel: "NDD",
    desc: "Safely dig around services, roots and structures.",
    image: "/images/ndd-services-and-roots.webp",
    imagePosition: "center 48%",
    featured: true,
  },
  {
    id: "trenching",
    label: "Trenching",
    shortLabel: "Trenching",
    desc: "Narrow trenches for electrical, plumbing and drainage.",
    image: "/images/hero-narrow-trench.webp",
    imagePosition: "center 58%",
    featured: true,
  },
  {
    id: "potholing",
    label: "Potholing",
    shortLabel: "Potholing",
    desc: "Small, targeted digs to locate underground services.",
    image: "/images/service-potholing-card.webp",
    imagePosition: "center 56%",
    featured: true,
  },
  {
    id: "leak-exposure",
    label: "Expose a Leak",
    shortLabel: "Leak exposure",
    desc: "Careful excavation around a suspected leaking pipe.",
    image: "/images/service-leak.webp",
    featured: false,
  },
  {
    id: "tunnel-bore",
    label: "Dig Under an Obstacle",
    shortLabel: "Under an obstacle",
    desc: "Create a route beneath a path, wall, driveway or roots.",
    image: "/images/ndd-tight-access.webp",
    featured: false,
  },
  {
    id: "pit-cleanout",
    label: "Pit or Drain Cleaning",
    shortLabel: "Pit cleaning",
    desc: "Remove silt, debris and sludge from pits and drains.",
    image: "/images/service-cleaning.webp",
    featured: false,
  },
  {
    id: "cattle-grid",
    label: "Cattle Grid Cleaning",
    shortLabel: "Cattle grid",
    desc: "Clean accumulated mud and debris below cattle grids.",
    image: "/images/port-06.webp",
    featured: false,
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
};

const depthCards = [
  { id: "300mm", label: "300 mm", sub: "A shallow run" },
  { id: "450mm", label: "450 mm", sub: "Around 450 mm deep" },
  { id: "600mm", label: "600 mm", sub: "Around 600 mm deep" },
  { id: "800mm", label: "800 mm", sub: "Around 800 mm deep" },
  { id: "custom", label: "Not Sure Yet", sub: "Your trade or plans can confirm it" },
];

const widthCards = [
  { id: "narrow", label: "Narrow", sub: "About 150 mm" },
  { id: "standard", label: "Standard", sub: "About 200 mm or wider" },
  { id: "custom", label: "Not Sure Yet", sub: "We can confirm it with you" },
];

const accessCards = [
  {
    id: "open",
    label: "Open Access",
    sub: "Easy drive-up access",
    image: "/images/rig-access.webp",
  },
  {
    id: "side",
    label: "Narrow Access",
    sub: "Gate, path or tight yard",
    image: "/images/service-trenching-tight-access-card.webp",
  },
  {
    id: "difficult",
    label: "Very Tight",
    sub: "Steps, corridor or restricted area",
    image: "/images/ndd-tight-access.webp",
  },
  {
    id: "unsure",
    label: "Not Sure",
    sub: "A photo will help James assess it",
    image: "/images/tight-access.webp",
  },
];

const groundCards = [
  { id: "normal", label: "Normal / Soft", sub: "Typical soil, sand or loam" },
  { id: "hard", label: "Clay / Hard", sub: "Heavy clay, compacted or rocky" },
  { id: "unsure", label: "Not Sure", sub: "We can allow for uncertainty" },
];

const congestionCards = [
  {
    id: "clear",
    label: "No Known Services",
    sub: "Nothing has been identified nearby",
  },
  {
    id: "congested",
    label: "Services Nearby",
    sub: "Pipes, cables or other services are present",
  },
  {
    id: "unsure",
    label: "Not Sure",
    sub: "Common when services have not been exposed",
  },
];

const spoilCards = [
  {
    id: "leave",
    label: "Leave Onsite",
    sub: "Leave the excavated material at the job",
  },
  {
    id: "remove-all",
    label: "Remove It",
    sub: "GreenVac confirms disposal before final pricing",
  },
  {
    id: "unsure",
    label: "Not Sure",
    sub: "James can recommend the practical option",
  },
];

const urgencyCards = [
  { id: "asap", label: "As Soon As Possible" },
  { id: "this-week", label: "Within a Week" },
  { id: "next-month", label: "Within 2–4 Weeks" },
  { id: "flexible", label: "Flexible / Planning Ahead" },
];

const exposureCountCards = [
  { id: "1-2", label: "1–2 Spots", sub: "One or two targeted areas" },
  { id: "3+", label: "3 or More", sub: "Several separate locations" },
  { id: "unsure", label: "Not Sure", sub: "Give us your best description later" },
];

const exposureDepthCards = [
  { id: "shallow", label: "Under 600 mm", sub: "A shallower exposure" },
  { id: "deep", label: "600 mm or More", sub: "A deeper exposure" },
  { id: "unsure", label: "Not Sure", sub: "James can allow for this" },
];

const leakAreaCards = [
  {
    id: "localised",
    label: "Rough Spot Known",
    sub: "The likely leak area is fairly clear",
  },
  {
    id: "wide",
    label: "Wider Search Area",
    sub: "The general area needs investigation",
  },
  { id: "unsure", label: "Not Sure", sub: "We will review it first" },
];

const pitSizeCards = [
  { id: "small", label: "Standard Pit", sub: "Single valve box or drainage pit" },
  { id: "large", label: "Large Pit", sub: "Multi-bay or oversized cleanout" },
  { id: "unsure", label: "Not Sure", sub: "A photo usually answers this" },
];

const pitFillCards = [
  { id: "light", label: "Light Fill", sub: "Silt, leaves or light debris" },
  { id: "heavy", label: "Heavy Sludge", sub: "Thick mud, clay or compacted buildup" },
  { id: "unsure", label: "Not Sure", sub: "You may not be able to see inside" },
];

const cattleCountCards = [
  { id: "1-2", label: "1–2 Grids", sub: "Single entry or double grid" },
  { id: "3plus", label: "3 or More", sub: "Multiple grids or a long entry" },
  { id: "unsure", label: "Not Sure", sub: "We can confirm from photos" },
];

const cattleFillCards = [
  { id: "light", label: "Light Buildup", sub: "Leaves, dirt and light silt" },
  { id: "moderate", label: "Moderate", sub: "Mud and compacted debris" },
  { id: "heavy", label: "Heavy Sludge", sub: "Thick or solid buildup" },
  { id: "unsure", label: "Not Sure", sub: "You have not looked underneath" },
];

const obstacleDistanceCards = [
  { id: "short", label: "Under 5 m", sub: "A short path or obstacle" },
  { id: "long", label: "5 m or More", sub: "A longer route underneath" },
  { id: "unsure", label: "Not Sure", sub: "We can confirm onsite" },
];

const featuredJobs = jobTypes.filter((job) => job.featured);
const extraJobs = jobTypes.filter((job) => !job.featured);

function getJob(jobType) {
  return jobTypes.find((job) => job.id === jobType);
}

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
  --muted:#667065;
  --border:#d9dfd7;
  --white:#fff;
  --danger:#7d2b2b;
  --radius:16px;
  --radius-sm:11px;
  --shadow:0 8px 28px rgba(25,46,32,.08);
  --shadow-soft:0 2px 10px rgba(25,46,32,.06);
}
html{background:var(--cream-light);}
body{margin:0;background:var(--cream-light);}
button,input,textarea{font:inherit;}
button{-webkit-tap-highlight-color:transparent;}
.app{min-height:100vh;background:linear-gradient(180deg,#fff 0,#f8f5ec 34rem);font-family:'Montserrat',sans-serif;color:var(--ink);}
.topbar{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid rgba(19,111,57,.13);}
.topbar-inner{height:68px;max-width:760px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
.brand-wrap{display:flex;align-items:center;gap:12px;min-width:0;}
.back-btn{width:36px;height:36px;border:1px solid var(--border);border-radius:50%;background:#fff;color:var(--ink);display:grid;place-items:center;cursor:pointer;font-size:24px;line-height:1;flex:0 0 auto;}
.back-btn:hover{border-color:var(--green);color:var(--green);}
.logo-image{display:block;width:auto;height:56px;object-fit:contain;}
.step-label{font-size:11px;font-weight:700;color:var(--muted);white-space:nowrap;}
.progress{height:4px;background:#e7ebe6;}
.progress-fill{height:100%;background:var(--green);transition:width .35s ease;}
.content{width:100%;max-width:720px;margin:0 auto;padding:36px 20px 190px;}
.eyebrow{font-size:11px;line-height:1.2;font-weight:800;color:var(--green);letter-spacing:2.2px;text-transform:uppercase;margin-bottom:8px;}
.heading{font-size:clamp(28px,6vw,42px);line-height:1.08;font-weight:900;letter-spacing:-1.3px;color:var(--ink);margin:0 0 10px;}
.subhead{font-size:15px;line-height:1.65;color:var(--muted);margin:0;max-width:640px;}
.heading-block{margin-bottom:28px;}
.trust-row{display:flex;align-items:center;gap:8px;margin-top:14px;color:var(--green);font-size:12px;font-weight:700;}
.feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
.job-card{position:relative;text-align:left;padding:0;border:1.5px solid var(--border);border-radius:var(--radius);background:#fff;overflow:hidden;cursor:pointer;box-shadow:var(--shadow-soft);transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;}
.job-card:hover{transform:translateY(-2px);border-color:var(--green);box-shadow:var(--shadow);}
.job-card.selected{border-color:var(--green);box-shadow:0 0 0 3px rgba(19,111,57,.13),var(--shadow);}
.job-image{height:138px;width:100%;object-fit:cover;display:block;background:#dfe8df;}
.job-card-copy{padding:14px 14px 16px;min-height:112px;}
.job-label{font-size:15px;line-height:1.25;font-weight:800;color:var(--ink);margin-bottom:6px;}
.job-desc{font-size:11.5px;line-height:1.5;color:var(--muted);}
.selected-badge{position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--green);color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.18);}
.more-mosaic{display:grid;grid-template-columns:1fr 1fr;height:138px;background:var(--green-soft);}
.more-mosaic img{width:100%;height:69px;object-fit:cover;display:block;}
.more-mosaic img:first-child{grid-row:span 2;height:138px;}
.plus-tile{position:absolute;top:50px;left:calc(50% - 22px);width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(19,111,57,.92);color:#fff;font-size:28px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.2);}
.section-panel{margin-top:28px;padding:22px;background:#fff;border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-soft);}
.section-title{font-size:19px;line-height:1.3;font-weight:800;color:var(--ink);margin:0 0 6px;}
.section-help{font-size:12px;line-height:1.55;color:var(--muted);margin:0 0 16px;}
.extra-grid,.choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.extra-card,.choice-card{width:100%;text-align:left;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fff;color:var(--ink);padding:13px;cursor:pointer;transition:border-color .15s ease,background .15s ease,transform .15s ease;box-shadow:0 1px 4px rgba(25,46,32,.04);}
.extra-card:hover,.choice-card:hover{border-color:var(--green);transform:translateY(-1px);}
.extra-card.selected,.choice-card.selected{border-color:var(--green);background:var(--green-soft);box-shadow:0 0 0 2px rgba(19,111,57,.08);}
.extra-label,.choice-label{font-size:13px;line-height:1.35;font-weight:800;color:var(--ink);}
.extra-desc,.choice-sub{font-size:11px;line-height:1.45;color:var(--muted);margin-top:4px;}
.subtype-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;}
.subtype-card{min-height:54px;display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fff;padding:10px 12px;color:var(--ink);cursor:pointer;}
.subtype-card:hover{border-color:var(--green);}
.subtype-card.selected{border-color:var(--green);background:var(--green-soft);}
.subtype-dot{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--border);display:grid;place-items:center;color:#fff;flex:0 0 auto;}
.subtype-card.selected .subtype-dot{border-color:var(--green);background:var(--green);}
.subtype-label{font-size:12px;line-height:1.35;font-weight:700;}
.breadcrumb{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:11px;color:var(--muted);font-weight:600;margin-bottom:18px;}
.breadcrumb strong{color:var(--green);}
.question-block{margin-bottom:28px;}
.question-count{font-size:10px;font-weight:800;color:var(--green);letter-spacing:1.8px;text-transform:uppercase;margin-bottom:7px;}
.question-title{font-size:19px;line-height:1.3;font-weight:800;color:var(--ink);margin:0 0 13px;}
.metre-control{display:flex;align-items:center;border:1.5px solid var(--border);border-radius:var(--radius);background:#fff;overflow:hidden;box-shadow:var(--shadow-soft);}
.metre-btn{width:68px;height:64px;border:0;background:var(--cream-light);color:var(--green);font-size:26px;font-weight:700;cursor:pointer;}
.metre-btn:hover{background:var(--green-soft);}
.metre-value{flex:1;text-align:center;font-size:30px;font-weight:900;color:var(--ink);}
.metre-unit{font-size:14px;font-weight:600;color:var(--muted);margin-left:4px;}
.quick-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px;}
.quick-btn{border:1.5px solid var(--border);border-radius:999px;background:#fff;color:var(--muted);padding:6px 15px;font-size:12px;font-weight:700;cursor:pointer;}
.quick-btn.selected{border-color:var(--green);background:var(--green-soft);color:var(--green);}
.summary-pill{display:flex;gap:18px;flex-wrap:wrap;background:var(--green-soft);border:1px solid var(--green-mid);border-radius:var(--radius-sm);padding:14px 16px;margin-top:10px;}
.summary-key{font-size:9px;line-height:1.2;font-weight:800;color:var(--green);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:4px;}
.summary-value{font-size:12px;line-height:1.4;font-weight:800;color:var(--ink);}
.field-stack{display:flex;flex-direction:column;gap:10px;}
.field-label{display:block;font-size:11px;font-weight:800;color:var(--ink);margin-bottom:7px;}
.field-hint{font-weight:500;color:var(--muted);}
.input{width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fff;color:var(--ink);padding:13px 14px;font-size:15px;line-height:1.4;outline:none;box-shadow:0 1px 4px rgba(25,46,32,.04);}
.input:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(19,111,57,.1);}
.input::placeholder{color:#99a399;}
textarea.input{resize:vertical;min-height:82px;}
.location-panel{padding:18px;background:var(--cream);border-radius:var(--radius);margin-bottom:28px;}
.location-grid{display:grid;grid-template-columns:1fr 150px;gap:10px;}
.access-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.access-card{padding:0;overflow:hidden;}
.access-image{display:block;width:100%;height:100px;object-fit:cover;background:#e5eae4;}
.access-copy{padding:12px 13px 14px;}
.reassure{display:flex;gap:11px;padding:14px 15px;border:1px solid var(--green-mid);border-radius:var(--radius-sm);background:var(--green-soft);color:var(--green-dark);font-size:12px;line-height:1.55;margin:8px 0 20px;}
.reassure strong{display:block;font-size:12px;margin-bottom:2px;}
.footer-wrap{position:fixed;left:0;right:0;bottom:0;z-index:80;padding:26px 20px calc(18px + env(safe-area-inset-bottom));background:linear-gradient(to top,#fff 72%,rgba(255,255,255,0));}
.footer-inner{max-width:720px;margin:0 auto;}
.primary-btn,.secondary-btn{width:100%;border-radius:13px;padding:16px 18px;font-size:14px;font-weight:800;cursor:pointer;transition:background .15s ease,transform .15s ease,box-shadow .15s ease;}
.primary-btn{border:0;background:var(--green);color:#fff;box-shadow:0 5px 18px rgba(19,111,57,.25);}
.primary-btn:hover:not(:disabled){background:var(--green-dark);transform:translateY(-1px);}
.primary-btn:disabled{background:#bdcbbf;color:#738477;box-shadow:none;cursor:not-allowed;}
.secondary-btn{border:1.5px solid var(--border);background:#fff;color:var(--muted);margin-top:9px;}
.secondary-btn:hover{border-color:var(--green);color:var(--green);}
.footer-note{text-align:center;color:var(--muted);font-size:11px;line-height:1.45;margin-top:9px;}
.estimate-hero{position:relative;height:220px;border-radius:var(--radius);overflow:hidden;margin-bottom:14px;box-shadow:var(--shadow);}
.estimate-hero img{width:100%;height:100%;object-fit:cover;display:block;}
.estimate-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(15,36,22,.75));}
.estimate-hero-label{position:absolute;left:20px;right:20px;bottom:18px;z-index:1;color:#fff;font-size:12px;font-weight:800;letter-spacing:.2px;}
.estimate-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow);margin-bottom:14px;}
.estimate-card.main{text-align:center;padding:30px 20px;}
.estimate-kicker{font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:var(--green);margin-bottom:10px;}
.estimate-range{font-size:clamp(34px,9vw,52px);line-height:1;font-weight:900;letter-spacing:-2px;color:var(--green);}
.estimate-gst{font-size:12px;color:var(--muted);margin-top:8px;}
.privacy-proof{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;background:var(--green-soft);color:var(--green-dark);font-size:10px;font-weight:800;margin-top:16px;}
.summary-heading{font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
.summary-row{display:flex;justify-content:space-between;gap:20px;padding:10px 0;border-bottom:1px solid var(--border);font-size:12px;line-height:1.45;}
.summary-row:last-child{border-bottom:0;}
.summary-row span:first-child{color:var(--muted);}
.summary-row strong{text-align:right;color:var(--ink);}
.info-note{padding:13px 15px;background:var(--cream-light);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12px;line-height:1.6;color:var(--muted);margin-bottom:14px;}
.info-note.error{background:#fff5f5;border-color:#e5c2c2;color:var(--danger);}
.photo-zone{display:block;border:2px dashed var(--green-mid);border-radius:var(--radius);background:var(--green-soft);padding:22px 16px;text-align:center;color:var(--green);cursor:pointer;}
.photo-zone:hover{border-color:var(--green);}
.photo-title{font-size:13px;font-weight:800;color:var(--ink);margin-top:7px;}
.photo-help{font-size:11px;line-height:1.5;color:var(--muted);margin-top:4px;}
.photo-examples{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px;}
.photo-example{position:relative;height:92px;border-radius:10px;overflow:hidden;background:#dfe7df;}
.photo-example img{width:100%;height:100%;object-fit:cover;display:block;}
.photo-example::after{content:"";position:absolute;inset:35% 0 0;background:linear-gradient(transparent,rgba(13,42,23,.78));}
.photo-example span{position:absolute;z-index:1;left:8px;right:8px;bottom:7px;color:#fff;font-size:9px;line-height:1.2;font-weight:800;text-shadow:0 1px 4px rgba(0,0,0,.3);}
.checkbox{display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;border:1.5px solid var(--border);border-radius:var(--radius);background:#fff;padding:15px;color:var(--ink);cursor:pointer;margin-top:14px;}
.checkbox.selected{border-color:var(--green);background:var(--green-soft);}
.checkbox-box{width:22px;height:22px;border:2px solid var(--border);border-radius:6px;display:grid;place-items:center;flex:0 0 auto;color:#fff;}
.checkbox.selected .checkbox-box{background:var(--green);border-color:var(--green);}
.checkbox-copy{font-size:12px;line-height:1.55;color:var(--ink);}
.condition-list{display:grid;gap:8px;margin-top:14px;}
.condition-item{display:flex;gap:10px;padding:12px 13px;background:var(--cream-light);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:11px;line-height:1.5;color:var(--muted);}
.condition-item svg{flex:0 0 auto;color:var(--green);}
.phone-row{display:flex;align-items:center;justify-content:center;gap:7px;font-size:11px;color:var(--muted);margin-top:10px;}
.phone-row a{color:var(--green);font-weight:800;text-decoration:none;}
.success-wrap{text-align:center;padding:24px 0;}
.success-icon{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;margin:0 auto 20px;background:var(--green-soft);border:2px solid var(--green-mid);color:var(--green);}
.next-steps{margin:28px 0 20px;text-align:left;background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow-soft);}
.next-step{display:flex;gap:12px;margin-bottom:16px;color:var(--green);}
.next-step:last-child{margin-bottom:0;}
.next-step-copy strong{display:block;color:var(--ink);font-size:12px;margin-bottom:3px;}
.next-step-copy span{display:block;color:var(--muted);font-size:11px;line-height:1.5;}
.fade{animation:fade-in .22s ease;}
@keyframes fade-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (max-width:600px){
  .topbar-inner{height:62px;padding:0 14px;}
  .logo-image{width:auto;height:50px;}
  .content{padding:28px 14px 190px;}
  .heading{font-size:30px;letter-spacing:-.8px;}
  .subhead{font-size:13px;}
  .feature-grid{gap:9px;}
  .job-image,.more-mosaic{height:108px;}
  .more-mosaic img{height:54px;}
  .more-mosaic img:first-child{height:108px;}
  .plus-tile{top:35px;left:calc(50% - 19px);width:38px;height:38px;font-size:24px;}
  .job-card-copy{padding:11px 11px 13px;min-height:116px;}
  .job-label{font-size:12.5px;}
  .job-desc{font-size:10px;}
  .section-panel{padding:16px;margin-top:20px;}
  .extra-grid,.choice-grid,.subtype-grid{gap:7px;}
  .extra-card,.choice-card{padding:11px;}
  .extra-label,.choice-label{font-size:11.5px;}
  .extra-desc,.choice-sub{font-size:9.5px;}
  .subtype-card{padding:9px 10px;}
  .subtype-label{font-size:10.5px;}
  .access-image{height:78px;}
  .location-grid{grid-template-columns:1fr 112px;}
  .input{font-size:16px;}
  .estimate-hero{height:180px;}
  .estimate-card{padding:18px 15px;}
  .summary-row{font-size:11px;}
  .photo-example{height:76px;}
}
@media (max-width:360px){
  .feature-grid{grid-template-columns:1fr;}
  .job-image,.more-mosaic{height:142px;}
  .more-mosaic img{height:71px;}
  .more-mosaic img:first-child{height:142px;}
  .job-card-copy{min-height:0;}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important;}
}
`;

function Shell({ step, onBack, children, footer }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const progress =
    step === TOTAL_STEPS
      ? 100
      : Math.min(100, (step / (TOTAL_STEPS - 1)) * 100);
  return (
    <div className="app">
      <style>{S}</style>
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
          <span className="step-label">{step === TOTAL_STEPS ? "Complete" : `Step ${step} of ${TOTAL_STEPS - 1}`}</span>
        </div>
        <div className="progress" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </header>
      <main className="content">{children}</main>
      {footer && (
        <div className="footer-wrap">
          <div className="footer-inner">{footer}</div>
        </div>
      )}
    </div>
  );
}

function Heading({ eyebrow, title, sub, trust }) {
  return (
    <div className="heading-block">
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

function ChoiceGrid({ cards, value, onChange, className = "choice-grid" }) {
  return (
    <div className={className}>
      {cards.map((card) => {
        const selected = value === card.id;
        return (
          <button
            key={card.id}
            type="button"
            className={`choice-card${selected ? " selected" : ""}`}
            onClick={() => onChange(card.id)}
            aria-pressed={selected}
          >
            <div className="choice-label">{card.label}</div>
            {card.sub && <div className="choice-sub">{card.sub}</div>}
          </button>
        );
      })}
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

// Step 1 — deliberately simple image-led entry point.
function S1({ onNext, ans, setAns }) {
  const selectedJob = getJob(ans.jobType);
  const [showMore, setShowMore] = useState(Boolean(selectedJob && !selectedJob.featured));
  const ready = Boolean(ans.jobType && ans.subtype);

  const chooseJob = (job) => {
    setAns((current) => ({
      metres: current.metres || 5,
      preferredTime: "flexible",
      jobType: job.id,
      subtype: null,
    }));
  };

  return (
    <Shell
      step={1}
      footer={
        <>
          <button className="primary-btn" type="button" disabled={!ready} onClick={onNext}>
            {ready ? "Continue" : "Choose a job type to continue"}
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

      <div className="feature-grid">
        {featuredJobs.map((job) => {
          const selected = ans.jobType === job.id;
          return (
            <button
              key={job.id}
              type="button"
              className={`job-card${selected ? " selected" : ""}`}
              onClick={() => {
                setShowMore(false);
                chooseJob(job);
              }}
              aria-pressed={selected}
            >
              <img
                className="job-image"
                src={job.image}
                alt=""
                style={{ objectPosition: job.imagePosition || "center" }}
              />
              <div className="job-card-copy">
                <div className="job-label">{job.label}</div>
                <div className="job-desc">{job.desc}</div>
              </div>
              {selected && (
                <div className="selected-badge">
                  <CheckIcon size={16} />
                </div>
              )}
            </button>
          );
        })}

        <button
          type="button"
          className={`job-card${showMore ? " selected" : ""}`}
          onClick={() => setShowMore(true)}
          aria-expanded={showMore}
        >
          <div className="more-mosaic" aria-hidden="true">
            <img src="/images/service-leak.webp" alt="" />
            <img src="/images/service-cleaning.webp" alt="" />
            <img src="/images/ndd-tight-access.webp" alt="" />
          </div>
          <div className="plus-tile">+</div>
          <div className="job-card-copy">
            <div className="job-label">More Job Types</div>
            <div className="job-desc">Leaks, cleaning and digging under obstacles.</div>
          </div>
        </button>
      </div>

      {showMore && (
        <section className="section-panel fade">
          <h2 className="section-title">More job types</h2>
          <p className="section-help">Choose the closest match. James will confirm the exact method.</p>
          <div className="extra-grid">
            {extraJobs.map((job) => {
              const selected = ans.jobType === job.id;
              return (
                <button
                  key={job.id}
                  type="button"
                  className={`extra-card${selected ? " selected" : ""}`}
                  onClick={() => chooseJob(job)}
                  aria-pressed={selected}
                >
                  <div className="extra-label">{job.label}</div>
                  <div className="extra-desc">{job.desc}</div>
                </button>
              );
            })}
          </div>
          <div className="info-note" style={{ marginTop: 14, marginBottom: 0 }}>
            Still not sure? Choose the closest option and select “Not sure” on the next question.
          </div>
        </section>
      )}

      {ans.jobType && (
        <section className="section-panel fade">
          <h2 className="section-title">Which description is closest?</h2>
          <p className="section-help">This only guides the estimate. It does not lock you into a service.</p>
          <div className="subtype-grid">
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

function S2({ onNext, onBack, ans, setAns }) {
  const jobType = ans.jobType;
  const metres = ans.metres || 5;
  const isExposure = jobType === "service-exposure" || jobType === "potholing";
  const ready =
    jobType === "trenching"
      ? Boolean(metres > 0 && ans.depth && ans.width)
      : isExposure
        ? Boolean(ans.exposureCount && ans.exposureDepth)
        : jobType === "leak-exposure"
          ? Boolean(ans.leakArea)
          : jobType === "pit-cleanout"
            ? Boolean(ans.pitSize && ans.pitFill)
            : jobType === "cattle-grid"
              ? Boolean(ans.cattleCount && ans.cattleFill)
              : jobType === "tunnel-bore"
                ? Boolean(ans.boreDist)
                : false;

  let questions = null;
  let summary = [];

  if (jobType === "trenching") {
    questions = (
      <>
        <div className="question-block">
          <div className="question-count">Question 1 of 3</div>
          <h2 className="question-title">Roughly how many metres?</h2>
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
              >
                {value} m
              </button>
            ))}
          </div>
        </div>
        <div className="question-block">
          <div className="question-count">Question 2 of 3</div>
          <h2 className="question-title">What depth is expected?</h2>
          <ChoiceGrid
            cards={depthCards}
            value={ans.depth}
            onChange={(depth) => setAns((current) => ({ ...current, depth }))}
          />
        </div>
        <div className="question-block">
          <div className="question-count">Question 3 of 3</div>
          <h2 className="question-title">How wide should it be?</h2>
          <ChoiceGrid
            cards={widthCards}
            value={ans.width}
            onChange={(width) => setAns((current) => ({ ...current, width }))}
          />
        </div>
      </>
    );
    summary = [
      { label: "Length", value: `${metres} m` },
      { label: "Depth", value: depthCards.find((item) => item.id === ans.depth)?.label },
      { label: "Width", value: widthCards.find((item) => item.id === ans.width)?.label },
    ];
  } else if (isExposure) {
    questions = (
      <>
        <div className="question-block">
          <div className="question-count">Question 1 of 2</div>
          <h2 className="question-title">
            {jobType === "potholing" ? "How many potholes are likely?" : "How many areas need digging?"}
          </h2>
          <ChoiceGrid
            cards={exposureCountCards}
            value={ans.exposureCount}
            onChange={(exposureCount) => setAns((current) => ({ ...current, exposureCount }))}
          />
        </div>
        <div className="question-block">
          <div className="question-count">Question 2 of 2</div>
          <h2 className="question-title">What depth is expected?</h2>
          <ChoiceGrid
            cards={exposureDepthCards}
            value={ans.exposureDepth}
            onChange={(exposureDepth) => setAns((current) => ({ ...current, exposureDepth }))}
          />
        </div>
      </>
    );
    summary = [
      { label: jobType === "potholing" ? "Potholes" : "Areas", value: exposureCountCards.find((item) => item.id === ans.exposureCount)?.label },
      { label: "Depth", value: exposureDepthCards.find((item) => item.id === ans.exposureDepth)?.label },
    ];
  } else if (jobType === "leak-exposure") {
    questions = (
      <div className="question-block">
        <div className="question-count">Question 1 of 1</div>
        <h2 className="question-title">How well is the leak location known?</h2>
        <ChoiceGrid
          cards={leakAreaCards}
          value={ans.leakArea}
          onChange={(leakArea) => setAns((current) => ({ ...current, leakArea }))}
        />
      </div>
    );
    summary = [{ label: "Search area", value: leakAreaCards.find((item) => item.id === ans.leakArea)?.label }];
  } else if (jobType === "pit-cleanout") {
    questions = (
      <>
        <div className="question-block">
          <div className="question-count">Question 1 of 2</div>
          <h2 className="question-title">Roughly how big is it?</h2>
          <ChoiceGrid
            cards={pitSizeCards}
            value={ans.pitSize}
            onChange={(pitSize) => setAns((current) => ({ ...current, pitSize }))}
          />
        </div>
        <div className="question-block">
          <div className="question-count">Question 2 of 2</div>
          <h2 className="question-title">What is the material like inside?</h2>
          <ChoiceGrid
            cards={pitFillCards}
            value={ans.pitFill}
            onChange={(pitFill) => setAns((current) => ({ ...current, pitFill }))}
          />
        </div>
      </>
    );
    summary = [
      { label: "Size", value: pitSizeCards.find((item) => item.id === ans.pitSize)?.label },
      { label: "Material", value: pitFillCards.find((item) => item.id === ans.pitFill)?.label },
    ];
  } else if (jobType === "cattle-grid") {
    questions = (
      <>
        <div className="question-block">
          <div className="question-count">Question 1 of 2</div>
          <h2 className="question-title">How many grids need cleaning?</h2>
          <ChoiceGrid
            cards={cattleCountCards}
            value={ans.cattleCount}
            onChange={(cattleCount) => setAns((current) => ({ ...current, cattleCount }))}
          />
        </div>
        <div className="question-block">
          <div className="question-count">Question 2 of 2</div>
          <h2 className="question-title">How full are they?</h2>
          <ChoiceGrid
            cards={cattleFillCards}
            value={ans.cattleFill}
            onChange={(cattleFill) => setAns((current) => ({ ...current, cattleFill }))}
          />
        </div>
      </>
    );
    summary = [
      { label: "Grids", value: cattleCountCards.find((item) => item.id === ans.cattleCount)?.label },
      { label: "Buildup", value: cattleFillCards.find((item) => item.id === ans.cattleFill)?.label },
    ];
  } else if (jobType === "tunnel-bore") {
    questions = (
      <div className="question-block">
        <div className="question-count">Question 1 of 1</div>
        <h2 className="question-title">Roughly how far underneath?</h2>
        <ChoiceGrid
          cards={obstacleDistanceCards}
          value={ans.boreDist}
          onChange={(boreDist) => setAns((current) => ({ ...current, boreDist }))}
        />
      </div>
    );
    summary = [{ label: "Distance", value: obstacleDistanceCards.find((item) => item.id === ans.boreDist)?.label }];
  }

  return (
    <Shell
      step={2}
      onBack={onBack}
      footer={
        <button className="primary-btn" type="button" disabled={!ready} onClick={onNext}>
          {ready ? "Continue" : "Answer the job questions to continue"}
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

function S3({ onNext, onBack, ans, setAns }) {
  const ready = Boolean(
    ans.suburb?.trim() &&
    ans.access &&
    ans.ground &&
    ans.congestion &&
    ans.spoil,
  );
  const uncertain =
    ans.access === "unsure" ||
    ans.ground === "unsure" ||
    ans.congestion === "unsure" ||
    ans.spoil === "unsure";

  return (
    <Shell
      step={3}
      onBack={onBack}
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
            value={ans.postcode || ""}
            onChange={(event) => setAns((current) => ({ ...current, postcode: event.target.value }))}
            autoComplete="postal-code"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="question-block">
        <div className="question-count">Question 1 of 4</div>
        <h2 className="question-title">How is the access?</h2>
        <div className="access-grid">
          {accessCards.map((card) => {
            const selected = ans.access === card.id;
            return (
              <button
                key={card.id}
                type="button"
                className={`choice-card access-card${selected ? " selected" : ""}`}
                onClick={() => setAns((current) => ({ ...current, access: card.id }))}
                aria-pressed={selected}
              >
                <img className="access-image" src={card.image} alt="" />
                <div className="access-copy">
                  <div className="choice-label">{card.label}</div>
                  <div className="choice-sub">{card.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="question-block">
        <div className="question-count">Question 2 of 4</div>
        <h2 className="question-title">What is the ground like?</h2>
        <ChoiceGrid
          cards={groundCards}
          value={ans.ground}
          onChange={(ground) => setAns((current) => ({ ...current, ground }))}
        />
      </div>

      <div className="question-block">
        <div className="question-count">Question 3 of 4</div>
        <h2 className="question-title">Are underground services nearby?</h2>
        <ChoiceGrid
          cards={congestionCards}
          value={ans.congestion}
          onChange={(congestion) => setAns((current) => ({ ...current, congestion }))}
        />
      </div>

      <div className="question-block">
        <div className="question-count">Question 4 of 4</div>
        <h2 className="question-title">What should happen with the spoil?</h2>
        <ChoiceGrid
          cards={spoilCards}
          value={ans.spoil}
          onChange={(spoil) => setAns((current) => ({ ...current, spoil }))}
        />
      </div>

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

// Pricing engine. These values and formulas are intentionally retained from
// the production estimator; the redesign changes presentation and ordering.
const RATE = 235;
const RATE_COMP = 260;
const FLOOR_INT = 650;
const FLOOR_DISP = 790;
const BUFFER = 0.15;

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
const cattleHours = { light: 1.5, moderate: 2.5, heavy: 4.0, unsure: 2.5 };
const obstacleHours = { short: 2.5, long: 5.0, unsure: 3.5 };
const leakHours = { localised: 2.0, wide: 4.5, unsure: 3.0 };

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
      exposureCountCards.find((item) => item.id === ans.exposureCount)?.label,
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
  }

  return rows;
}

function calcEstimate(ans) {
  const jobType = ans.jobType;
  let setupHours = 0;
  let productionHours = 0;
  let rate = RATE;
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
    const count = Number.parseInt(ans.exposureCount, 10) || 1;
    const depthMultiplier =
      ans.exposureDepth === "shallow"
        ? 0.95
        : ans.exposureDepth === "deep"
          ? 1.20
          : 1.00;
    productionHours = count * 0.75 * depthMultiplier;
    if (
      ans.exposureCount === "unsure" ||
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
  } else if (jobType === "cattle-grid") {
    setupHours = 1.5;
    rate = RATE_COMP;
    const count = ans.cattleCount === "3plus" ? 3 : Number.parseInt(ans.cattleCount, 10) || 1;
    productionHours = count * (cattleHours[ans.cattleFill] || 2.5);
    if (ans.cattleCount === "unsure" || ans.cattleFill === "unsure") needsReview = true;
  } else if (jobType === "tunnel-bore") {
    setupHours = 1.5;
    productionHours = obstacleHours[ans.boreDist] || 3.5;
    if (ans.boreDist !== "short" || ans.subtype === "Not Sure") needsReview = true;
  }

  if (ans.spoil === "remove-all" || ans.spoil === "unsure") needsReview = true;
  if (
    ans.access === "unsure" ||
    ans.ground === "unsure" ||
    ans.congestion === "unsure"
  ) {
    needsReview = true;
  }

  const adjustedLabour =
    (setupHours + productionHours) *
    rate *
    combinedMultiplier;

  const locationText = buildLocation(ans);
  const outerArea = /braidwood|goulburn|yass|cooma|bungendore/i.test(locationText);
  const travel = outerArea ? 80 : 0;
  const rawLow = adjustedLabour + travel;
  const internalLow = Math.max(FLOOR_INT, rawLow);
  const low = Math.max(FLOOR_DISP, Math.round(internalLow / 10) * 10);
  const high = Math.round((low * (1 + BUFFER)) / 10) * 10;

  return {
    low,
    high,
    labour: Math.round(adjustedLabour),
    travel,
    needsReview,
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

function S4({ onNext, onBack, ans }) {
  const estimate = calcEstimate(ans);
  const job = getJob(ans.jobType);
  const detailRows = getJobDetailRows(ans);
  const conditionSummary = [
    accessCards.find((item) => item.id === ans.access)?.label,
    groundCards.find((item) => item.id === ans.ground)?.label,
    congestionCards.find((item) => item.id === ans.congestion)?.label,
  ].filter(Boolean).join(" · ");

  return (
    <Shell
      step={4}
      onBack={onBack}
      footer={
        <>
          <button className="primary-btn" type="button" onClick={onNext}>
            Send This Estimate to James
          </button>
          <div className="footer-note">Contact details are only requested after you have seen the price.</div>
        </>
      }
    >
      <Heading
        eyebrow="Your Ballpark Price"
        title="Here is your estimate"
        sub="This range is based on the answers you provided. James will review the actual site details before confirming a final price."
      />

      <div className="estimate-hero">
        <img
          src={job?.image || "/images/ndd-hydrovac-method.webp"}
          alt=""
          style={{ objectPosition: job?.imagePosition || "center" }}
        />
        <div className="estimate-hero-label">{job?.label} by GreenVac</div>
      </div>

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

      {estimate.needsReview && (
        <div className="reassure">
          <CheckIcon size={18} />
          <div>
            <strong>James will personally review this one</strong>
            One or more details are uncertain or site-dependent. That is normal and the range already allows for your current answers.
          </div>
        </div>
      )}

      <div className="estimate-card">
        <div className="summary-heading">Estimate based on</div>
        <SummaryRows
          rows={[
            { label: "Service", value: job?.label },
            { label: "Job type", value: ans.subtype },
            ...detailRows,
            { label: "Location", value: buildLocation(ans) },
            { label: "Site conditions", value: conditionSummary },
            { label: "Spoil", value: spoilCards.find((item) => item.id === ans.spoil)?.label },
            {
              label: "Travel",
              value: estimate.travel ? `$${estimate.travel} outer-area allowance included` : "Included",
            },
          ]}
        />
      </div>

      <div className="info-note">
        This is an indicative estimate, not a formal quote or confirmed booking. Final pricing may change if the actual depth, access, ground, spoil or underground conditions differ from the answers provided.
      </div>
    </Shell>
  );
}

function S5({ onNext, onBack, ans, setAns }) {
  const photoCount = ans.sitePhotos?.length || 0;
  const ready = Boolean(
    ans.name?.trim() &&
    ans.mobile?.trim() &&
    ans.preferredDay,
  );

  const handlePhotos = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5);
    setAns((current) => ({ ...current, sitePhotos: files }));
  };

  return (
    <Shell
      step={5}
      onBack={onBack}
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
            value={ans.name || ""}
            onChange={(event) => setAns((current) => ({ ...current, name: event.target.value }))}
            autoComplete="name"
          />
          <input
            className="input"
            type="tel"
            placeholder="Mobile number *"
            value={ans.mobile || ""}
            onChange={(event) => setAns((current) => ({ ...current, mobile: event.target.value }))}
            autoComplete="tel"
            inputMode="tel"
          />
          <input
            className="input"
            type="email"
            placeholder="Email address (optional)"
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
            value={ans.address || ""}
            onChange={(event) => setAns((current) => ({ ...current, address: event.target.value }))}
            autoComplete="street-address"
          />
          <textarea
            className="input"
            placeholder="Parking, gate width, access instructions or anything else useful..."
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
            { image: "/images/rig-access.webp", label: "Where we can park" },
            { image: "/images/service-trenching-tight-access-card.webp", label: "The access route" },
            { image: "/images/ndd-exposed-pipe.webp", label: "The digging area" },
          ].map((example) => (
            <div className="photo-example" key={example.label}>
              <img src={example.image} alt="" />
              <span>{example.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="estimate-card">
        <div className="summary-heading">How soon do you need it?</div>
        <ChoiceGrid
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
  const access = accessCards.find((item) => item.id === ans.access)?.label;
  const ground = groundCards.find((item) => item.id === ans.ground)?.label;
  const servicesNearby = congestionCards.find((item) => item.id === ans.congestion)?.label;
  const spoil = spoilCards.find((item) => item.id === ans.spoil)?.label;
  const timing = getPreferredDayLabel(ans);
  const address = buildLocation(ans);
  const photoCount = ans.sitePhotos?.length || 0;
  const body = [
    "NEW ESTIMATE REQUEST - GREENVAC",
    "",
    "----------------------------",
    `INDICATIVE ESTIMATE: $${estimate.low.toLocaleString()} - $${estimate.high.toLocaleString()} + GST`,
    estimate.needsReview ? "Flagged for manual review" : "Standard estimate",
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
    timing,
    address,
    body,
    subject: `Estimate Request - ${ans.subtype || "Hydrovac Job"}`,
  };
}

function S6({ onNext, onBack, ans, setAns }) {
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
    formData.append("estimate_low", String(request.estimate.low || ""));
    formData.append("estimate_high", String(request.estimate.high || ""));
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
      const response = await fetch(FORM_ENDPOINT, {
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

      <div className="estimate-card main">
        <div className="estimate-kicker">Your ballpark estimate</div>
        <div className="estimate-range">
          ${request.estimate.low.toLocaleString()} – ${request.estimate.high.toLocaleString()}
        </div>
        <div className="estimate-gst">+ GST · Subject to GreenVac site review</div>
      </div>

      <div className="estimate-card">
        <div className="summary-heading">Request summary</div>
        <SummaryRows
          rows={[
            { label: "Service", value: request.job?.label },
            { label: "Type", value: ans.subtype },
            ...request.detailRows,
            { label: "Site conditions", value: conditionSummary },
            { label: "Spoil", value: request.spoil },
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
        {[
          "The estimate assumes the access, ground and spoil conditions described.",
          "Unknown services, rock, buried obstacles or a different scope may change the final price.",
          "James confirms pricing and availability before any booking is made.",
        ].map((condition) => (
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
          I understand this is an indicative estimate and GreenVac will confirm the final price and availability after reviewing the job.
        </span>
      </button>

      {submitError && (
        <div className="info-note error" style={{ marginTop: 14 }}>
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

  const shared = { ans, setAns, onNext: next, onBack: back };
  if (screen === 1) return <S1 {...shared} />;
  if (screen === 2) return <S2 {...shared} />;
  if (screen === 3) return <S3 {...shared} />;
  if (screen === 4) return <S4 ans={ans} onNext={next} onBack={back} />;
  if (screen === 5) return <S5 {...shared} />;
  if (screen === 6) return <S6 {...shared} />;
  return <S7 onRestart={restart} />;
}
