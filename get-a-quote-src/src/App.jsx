import { useState, useRef, useEffect } from "react";

const FORM_ENDPOINT = "https://flowform.to/submit";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const jobTypes = [
  { id: "trenching",        label: "Trenching",           desc: "Electrical, plumbing,\ndata, irrigation",        icon: "trenching" },
  { id: "service-exposure", label: "Service Exposure",    desc: "Water, gas, electrical,\ncomms",                 icon: "service" },
  { id: "leak-exposure",    label: "Leak Exposure",       desc: "Water, irrigation,\nstormwater",                 icon: "leak" },
  { id: "pit-cleanout",     label: "Pit / Cleanout",      desc: "Service pits, valve pits,\ndrainage",            icon: "pit" },
  { id: "cattle-grid",      label: "Cattle Grid Cleanout",desc: "Full chamber cleanout,\nsludge & debris removal", icon: "cattle" },
  { id: "tunnel-bore",      label: "Tunnel / Bore",       desc: "Under driveways,\npathways, walls",              icon: "tunnel" },
];

const subtypes = {
  trenching:        ["Electrical Trench", "Plumbing Trench", "Data / Comms Trench", "Irrigation Trench", "Custom Trench"],
  "service-exposure": ["Water", "Gas", "Electrical", "Communications", "Unknown Service", "Multiple Services"],
  "leak-exposure":  ["Water Leak", "Irrigation Leak", "Unknown Leak", "Stormwater Issue"],
  "pit-cleanout":   ["Service Pit", "Valve Pit", "Drainage Pit", "Other Cleanout"],
  "cattle-grid":    ["Single Grid", "Double Grid", "Multiple Grids", "Not Sure"],
  "tunnel-bore":    ["Under Driveway", "Under Pathway", "Under Wall", "Under Services", "Custom Bore / Tunnel"],
};

const depthCards   = [
  { id:"300mm",  label:"300 mm",  sub:"Shallow — irrigation" },
  { id:"450mm",  label:"450 mm",  sub:"Comms / data runs" },
  { id:"600mm",  label:"600 mm",  sub:"Electrical / plumbing" },
  { id:"800mm",  label:"800 mm",  sub:"Deep service runs" },
  { id:"custom", label:"Custom",  sub:"I'll specify on the call" },
];
const widthCards   = [
  { id:"narrow",   label:"Narrow",   sub:"~150 mm" },
  { id:"standard", label:"Standard", sub:"200 mm+" },
  { id:"custom",   label:"Custom",   sub:"I'll specify on the call" },
];
const accessCards  = [
  { id:"open",       label:"Open Access",    sub:"Easy drive-up, no restrictions" },
  { id:"side",       label:"Side / Narrow",  sub:"Through gate, path, or tight yard" },
  { id:"difficult",  label:"Tight / Stairs", sub:"Steps, corridor, or very restricted" },
];
const groundCards  = [
  { id:"normal", label:"Normal / Soft", sub:"Standard suburban, sandy or loamy soil" },
  { id:"hard",   label:"Clay / Hard",   sub:"Heavy clay, compacted, rocky or wet ground" },
];
const congCards    = [
  { id:"clear",     label:"Clear",            sub:"No known services in the way" },
  { id:"congested", label:"Services Present", sub:"Pipes, cables or services nearby" },
];
const spoilCards   = [
  { id:"leave",      label:"Leave Onsite",  sub:"Piled at the site — we dig, you deal" },
  { id:"remove-all", label:"Remove All",    sub:"GreenVac confirms disposal details" },
];
const dayCards = [
  { id:"asap",        label:"As Soon As Possible" },
  { id:"this-week",   label:"This Week" },
  { id:"next-week",   label:"Next Week" },
  { id:"choose-date", label:"Choose a Date" },
];
const timeCards = [
  { id:"early",     label:"Early Morning", sub:"7 am – 9 am" },
  { id:"midday",    label:"Midday",        sub:"10 am – 12 pm" },
  { id:"afternoon", label:"Afternoon",     sub:"1 pm – 4 pm" },
  { id:"flexible",  label:"Flexible",      sub:"Whatever suits GreenVac" },
];

// ─── ILLUSTRATED SVG ICONS ────────────────────────────────────────────────────

function IconTrenching({ selected }) {
  const c = selected ? "#2d7a41" : "#6b7c72";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      {/* Ground layers */}
      <rect x="4" y="28" width="32" height="4" rx="1" fill={selected?"#c8e6ce":"#e8eeea"} />
      <rect x="4" y="24" width="32" height="4" rx="1" fill={selected?"#ddf0e1":"#f0f4f1"} />
      {/* Trench cut */}
      <rect x="14" y="16" width="12" height="16" rx="1" fill={selected?"#eaf4ec":"#f7faf7"} stroke={c} strokeWidth="1.5"/>
      {/* Shovel */}
      <path d="M26 8l4 4-10 10-2-2L26 8z" fill={c} opacity="0.9"/>
      <path d="M30 12l2 2-1 1-2-2 1-1z" fill={c}/>
      <rect x="21" y="17" width="2" height="7" rx="1" fill={c} transform="rotate(-45 21 17)"/>
    </svg>
  );
}

function IconService({ selected }) {
  const c = selected ? "#2d7a41" : "#6b7c72";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      {/* Ground */}
      <rect x="4" y="28" width="32" height="5" rx="1" fill={selected?"#c8e6ce":"#e8eeea"} />
      {/* Underground pipe */}
      <rect x="10" y="22" width="20" height="6" rx="3" fill={selected?"#ddf0e1":"#f0f4f1"} stroke={c} strokeWidth="1.5"/>
      {/* Magnifier */}
      <circle cx="22" cy="13" r="6" stroke={c} strokeWidth="2" fill="none"/>
      <path d="M26.5 17.5l4 4" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      {/* Center dot */}
      <circle cx="22" cy="13" r="2" fill={c} opacity="0.4"/>
    </svg>
  );
}

function IconLeak({ selected }) {
  const c = selected ? "#2d7a41" : "#5b8fc9";
  const bg = selected ? "#c8e6ce" : "#ddeeff";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      {/* Ground */}
      <rect x="4" y="30" width="32" height="5" rx="1" fill={selected?"#c8e6ce":"#e8eeea"} />
      {/* Droplet */}
      <path d="M20 6C20 6 12 16 12 22a8 8 0 0016 0C28 16 20 6 20 6z" fill={bg} stroke={c} strokeWidth="1.8"/>
      {/* Shine */}
      <path d="M16 20c0-2 2-5 4-6" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}

function IconPit({ selected }) {
  const c = selected ? "#2d7a41" : "#6b7c72";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      {/* Ground */}
      <rect x="4" y="30" width="32" height="4" rx="1" fill={selected?"#c8e6ce":"#e8eeea"} />
      {/* Pit walls */}
      <rect x="10" y="16" width="20" height="14" rx="1" fill={selected?"#eaf4ec":"#f7faf7"} stroke={c} strokeWidth="1.5"/>
      {/* Grate bars horizontal */}
      <line x1="10" y1="20" x2="30" y2="20" stroke={c} strokeWidth="1.2"/>
      <line x1="10" y1="24" x2="30" y2="24" stroke={c} strokeWidth="1.2"/>
      {/* Grate bars vertical */}
      <line x1="16" y1="16" x2="16" y2="30" stroke={c} strokeWidth="1.2"/>
      <line x1="22" y1="16" x2="22" y2="30" stroke={c} strokeWidth="1.2"/>
      <line x1="28" y1="16" x2="28" y2="30" stroke={c} strokeWidth="1.2"/>
      {/* Rim */}
      <rect x="8" y="14" width="24" height="3" rx="1" fill={c} opacity="0.25"/>
    </svg>
  );
}

function IconTunnel({ selected }) {
  const c = selected ? "#2d7a41" : "#6b7c72";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      {/* Ground block */}
      <rect x="4" y="22" width="32" height="8" rx="1" fill={selected?"#c8e6ce":"#e8eeea"} />
      {/* Tunnel arch */}
      <path d="M10 30 Q10 20 20 20 Q30 20 30 30" stroke={c} strokeWidth="2" fill={selected?"#eaf4ec":"#f7faf7"}/>
      {/* Bore machine body */}
      <rect x="14" y="24" width="12" height="6" rx="2" fill={c} opacity="0.18"/>
      {/* Wheels */}
      <circle cx="17" cy="31" r="2" fill={c} opacity="0.5"/>
      <circle cx="23" cy="31" r="2" fill={c} opacity="0.5"/>
      {/* Arrow indicating direction */}
      <path d="M6 25l3-2-3-2" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M34 25l-3-2 3-2" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconSpoil({ selected }) {
  const c = selected ? "#2d7a41" : "#6b7c72";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      {/* Truck body */}
      <rect x="4" y="20" width="22" height="10" rx="2" fill={selected?"#ddf0e1":"#eef2ef"} stroke={c} strokeWidth="1.5"/>
      {/* Cab */}
      <rect x="26" y="23" width="10" height="7" rx="2" fill={selected?"#ddf0e1":"#eef2ef"} stroke={c} strokeWidth="1.5"/>
      {/* Windscreen */}
      <rect x="27.5" y="24.5" width="6" height="3.5" rx="1" fill={c} opacity="0.2"/>
      {/* Wheels */}
      <circle cx="10" cy="32" r="3" fill={c} opacity="0.5"/>
      <circle cx="22" cy="32" r="3" fill={c} opacity="0.5"/>
      <circle cx="32" cy="32" r="2.5" fill={c} opacity="0.5"/>
      {/* Spoil pile in tray */}
      <path d="M6 20 Q15 12 26 20" fill={selected?"#c8e6ce":"#dde8df"} stroke={c} strokeWidth="1.2"/>
    </svg>
  );
}

function IconCattle({ selected }) {
  const c = selected ? "#2d7a41" : "#6b7c72";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      {/* Ground / road surface */}
      <rect x="3" y="26" width="34" height="5" rx="1" fill={selected?"#c8e6ce":"#e8eeea"}/>
      {/* Pit chamber below road */}
      <rect x="7" y="18" width="26" height="10" rx="1" fill={selected?"#eaf4ec":"#f7faf7"} stroke={c} strokeWidth="1.4"/>
      {/* Grid bars — horizontal */}
      <line x1="7" y1="21" x2="33" y2="21" stroke={c} strokeWidth="1.2"/>
      <line x1="7" y1="24" x2="33" y2="24" stroke={c} strokeWidth="1.2"/>
      {/* Grid bars — vertical slots */}
      <line x1="12" y1="18" x2="12" y2="28" stroke={c} strokeWidth="1.2"/>
      <line x1="17" y1="18" x2="17" y2="28" stroke={c} strokeWidth="1.2"/>
      <line x1="22" y1="18" x2="22" y2="28" stroke={c} strokeWidth="1.2"/>
      <line x1="27" y1="18" x2="27" y2="28" stroke={c} strokeWidth="1.2"/>
      {/* Sludge/debris inside */}
      <path d="M9 27 Q15 23 20 26 Q26 22 33 26" stroke={c} strokeWidth="1" fill={selected?"#b8ddc0":"#d8e8da"} fillOpacity="0.5"/>
      {/* Road kerb lines */}
      <rect x="3" y="24" width="34" height="2" rx="0.5" fill={c} opacity="0.15"/>
      {/* Water droplets suggesting drainage */}
      <circle cx="16" cy="14" r="1.5" fill={c} opacity="0.4"/>
      <circle cx="22" cy="11" r="1" fill={c} opacity="0.3"/>
      <circle cx="27" cy="14" r="1.2" fill={c} opacity="0.35"/>
    </svg>
  );
}

const JobIcons = { trenching: IconTrenching, service: IconService, leak: IconLeak, pit: IconPit, cattle: IconCattle, tunnel: IconTunnel, spoil: IconSpoil };

function SubtypeIcon({ type, selected }) {
  const icons = {
    "Electrical Trench":   () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M10 2l-4 7h4l-2 7 6-9h-4l2-5z" fill={selected?"#2d7a41":"#9ab0a0"} stroke={selected?"#2d7a41":"#9ab0a0"} strokeWidth="0.5"/></svg>,
    "Plumbing Trench":     () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h4v4H3z" rx="1" stroke={selected?"#2d7a41":"#9ab0a0"} strokeWidth="1.4" fill="none"/><path d="M7 11h4" stroke={selected?"#2d7a41":"#9ab0a0"} strokeWidth="1.4" strokeLinecap="round"/><path d="M11 9v4" stroke={selected?"#2d7a41":"#9ab0a0"} strokeWidth="1.4" strokeLinecap="round"/><path d="M11 11h3a1 1 0 000-2H7V6a1 1 0 00-2 0v3" stroke={selected?"#2d7a41":"#9ab0a0"} strokeWidth="1.4" strokeLinecap="round"/></svg>,
  };
  const Default = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="5" stroke={selected?"#2d7a41":"#9ab0a0"} strokeWidth="1.4" fill="none"/><path d="M9 6v3l2 2" stroke={selected?"#2d7a41":"#9ab0a0"} strokeWidth="1.4" strokeLinecap="round"/></svg>;
  const Comp = icons[type] || Default;
  return <Comp />;
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Small inline icons (replace emoji) — hand-built, estimator green, stroke style
const ICO = "#2d7a41";
function IcoCheck({ s = 18 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>); }
function IcoCamera({ s = 22 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9a2 2 0 0 1 2-2h2l1.5-2h7L19 7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/></svg>); }
function IcoLeaf({ s = 18 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20c0-8 6-13 16-13 0 10-6 14-13 14-3 0-3-1-3-1z"/><path d="M9 18c1.5-3 4-5.5 7.5-7"/></svg>); }
function IcoRuler({ s = 18 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 16.5 16.5 3.5 20.5 7.5 7.5 20.5z"/><path d="M7 12l2 2M10.5 8.5l2 2M14 5l2 2"/></svg>); }
function IcoClock({ s = 18 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>); }
function IcoPhone({ s = 18 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1A19.5 19.5 0 0 1 4.7 12 19.8 19.8 0 0 1 1.6 3.4 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.6a2 2 0 0 1-.5 2.1L7.1 9a16 16 0 0 0 6 6l1.5-1.7a2 2 0 0 1 2.1-.5c.8.4 1.7.6 2.6.7a2 2 0 0 1 1.7 2z"/></svg>); }
function IcoChat({ s = 18 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-5A8 8 0 1 1 21 11.5z"/></svg>); }
function IcoTruck({ s = 18 }) { return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={ICO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 6.5h11v9H2zM13 9.5h4l3 3v3h-7z"/><circle cx="6" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/></svg>); }

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --g:#2d7a41; --g-light:#eaf4ec; --g-mid:#b8ddc0; --g-dark:#1f5c2f;
  --ch:#1a2820; --grey:#6b7c72; --border:#dde5df; --bg:#f4f6f4; --white:#fff;
  --r:12px; --r-sm:8px;
  --sh:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --sh-md:0 4px 14px rgba(0,0,0,.08);
}
body{background:var(--bg);}
.app{min-height:100vh;background:var(--bg);font-family:'Montserrat',sans-serif;color:var(--ch);display:flex;flex-direction:column;}

/* TOP BAR */
.topbar{background:var(--white);border-bottom:1px solid var(--border);padding:13px 18px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:var(--sh);}
.logo{display:flex;align-items:center;gap:10px;}
.logo-badge{width:34px;height:34px;border-radius:7px;background:var(--g);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff;letter-spacing:.5px;}
.logo-name{font-weight:800;font-size:15px;color:var(--ch);letter-spacing:.5px;text-transform:uppercase;}
.back-btn{background:none;border:none;color:var(--grey);cursor:pointer;font-size:22px;padding:0 8px 0 0;line-height:1;}
.back-btn:hover{color:var(--ch);}

/* PROGRESS */
.prog{height:3px;background:var(--border);}
.prog-fill{height:100%;background:var(--g);transition:width .4s ease;}

/* CONTENT */
.content{flex:1;padding:24px 16px 200px;max-width:500px;margin:0 auto;width:100%;}

/* HEADINGS */
.eyebrow{font-size:10px;font-weight:700;color:var(--g);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:5px;}
.heading{font-size:24px;font-weight:800;color:var(--ch);line-height:1.2;margin-bottom:6px;}
.subhead{font-size:13px;color:var(--grey);line-height:1.55;margin-bottom:24px;}
.sec-title{font-size:17px;font-weight:700;color:var(--ch);margin-bottom:12px;margin-top:4px;}
.q-lbl{font-size:10px;font-weight:700;color:var(--g);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;}
.sec-block{margin-bottom:28px;scroll-margin-top:20px;}

/* JOB TILE GRID — 2 columns */
.tile-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;}

.job-tile{
  background:var(--white);
  border:1.5px solid var(--border);
  border-radius:var(--r);
  padding:14px 13px 13px;
  cursor:pointer;
  transition:all .15s ease;
  box-shadow:var(--sh);
  display:flex;
  flex-direction:column;
  gap:8px;
  min-height:110px;
}
.job-tile:hover{border-color:var(--g);box-shadow:var(--sh-md);transform:translateY(-1px);}
.job-tile.sel{border-color:var(--g);background:var(--g-light);box-shadow:0 0 0 3px rgba(45,122,65,.1);}

.tile-icon{flex-shrink:0;}
.tile-body{flex:1;}
.tile-label{font-size:13px;font-weight:700;color:var(--ch);line-height:1.2;margin-bottom:3px;}
.job-tile.sel .tile-label{color:var(--g-dark);}
.tile-desc{font-size:11px;color:var(--grey);line-height:1.4;white-space:pre-line;}

/* SUBTYPE GRID */
.sub-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.sub-tile{
  background:var(--white);
  border:1.5px solid var(--border);
  border-radius:var(--r-sm);
  padding:11px 12px;
  cursor:pointer;
  transition:all .15s;
  display:flex;
  align-items:center;
  gap:8px;
  box-shadow:var(--sh);
}
.sub-tile:hover{border-color:var(--g);}
.sub-tile.sel{border-color:var(--g);background:var(--g-light);}
.sub-tile.sel .sub-label{color:var(--g-dark);font-weight:700;}
.sub-label{font-size:12px;font-weight:600;color:var(--ch);line-height:1.3;}
.sub-tile.sel .sub-icon{opacity:1;}
.sub-icon{opacity:.5;}

/* OPTION CARD (depth, width, access, etc) */
.opt-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.opt-grid-1{display:flex;flex-direction:column;gap:8px;}

.opt-card{
  background:var(--white);
  border:1.5px solid var(--border);
  border-radius:var(--r-sm);
  padding:12px 13px;
  cursor:pointer;
  transition:all .15s;
  box-shadow:var(--sh);
}
.opt-card:hover{border-color:var(--g);}
.opt-card.sel{border-color:var(--g);background:var(--g-light);}
.opt-label{font-size:13px;font-weight:700;color:var(--ch);}
.opt-sub{font-size:11px;color:var(--grey);margin-top:2px;}
.opt-card.sel .opt-label{color:var(--g-dark);}

/* METRES */
.m-wrap{display:flex;align-items:center;background:var(--white);border:1.5px solid var(--border);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);}
.m-btn{background:var(--bg);border:none;width:56px;height:58px;font-size:22px;color:var(--g);cursor:pointer;font-weight:700;transition:background .12s;flex-shrink:0;}
.m-btn:hover{background:var(--g-light);}
.m-val{flex:1;text-align:center;font-size:28px;font-weight:800;color:var(--ch);}
.m-unit{font-size:14px;font-weight:500;color:var(--grey);margin-left:3px;}
.quick-row{display:flex;gap:7px;margin-top:9px;justify-content:center;}
.quick{background:var(--white);border:1.5px solid var(--border);border-radius:6px;padding:5px 13px;font-size:12px;font-weight:600;color:var(--grey);cursor:pointer;font-family:'Montserrat',sans-serif;transition:all .12s;}
.quick:hover{border-color:var(--g);color:var(--g);}
.quick.active{border-color:var(--g);background:var(--g-light);color:var(--g);}

/* INPUT */
.inp{background:var(--white);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:12px 13px;font-size:13px;font-family:'Montserrat',sans-serif;color:var(--ch);width:100%;outline:none;transition:border-color .15s;box-shadow:var(--sh);}
.inp:focus{border-color:var(--g);}
.inp::placeholder{color:#b8c8be;}

/* SUMMARY PILL */
.sum-pill{background:var(--g-light);border:1.5px solid var(--g-mid);border-radius:var(--r);padding:13px 15px;margin-bottom:16px;}
.sum-lbl{font-size:10px;font-weight:700;color:var(--g);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:9px;}
.sum-row{display:flex;gap:18px;flex-wrap:wrap;}
.sum-key{font-size:10px;color:var(--grey);text-transform:uppercase;letter-spacing:1px;font-weight:600;}
.sum-val{font-size:13px;font-weight:700;color:var(--ch);}

/* REASSURE BANNER */
.reassure-box{background:var(--g-light);border:1.5px solid var(--g-mid);border-radius:var(--r);padding:12px 14px;display:flex;gap:10px;margin-bottom:16px;font-size:12px;color:#1f5c2f;line-height:1.5;}
.reassure-title{font-weight:700;color:var(--g);margin-bottom:2px;}



/* INFO NOTE */
.info-note{background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:11px 14px;font-size:12px;color:var(--grey);line-height:1.55;margin-bottom:16px;}

/* CONTINUE FOOTER */
.footer-wrap{position:fixed;bottom:0;left:0;right:0;background:linear-gradient(to top,var(--white) 60%,transparent);padding:14px 16px calc(22px + env(safe-area-inset-bottom));z-index:50;}
.footer-inner{max-width:500px;margin:0 auto;}

/* MOBILE — prevent iOS input zoom (font-size must be >= 16px) */
@media (max-width:600px){
  .inp{font-size:16px;}
  select.inp{font-size:16px;}
  .heading{font-size:22px;}
  .content{padding-bottom:220px;}
}
.btn{background:var(--g);color:#fff;border:none;border-radius:var(--r);padding:15px;font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;cursor:pointer;width:100%;transition:all .15s;letter-spacing:.3px;box-shadow:0 2px 8px rgba(45,122,65,.28);}
.btn:hover:not(:disabled){background:var(--g-dark);transform:translateY(-1px);box-shadow:0 4px 14px rgba(45,122,65,.32);}
.btn:disabled{background:#c8d8cc;color:#8fa898;cursor:not-allowed;box-shadow:none;}
.btn.sec{background:var(--white);color:var(--grey);border:1.5px solid var(--border);box-shadow:var(--sh);}
.btn.sec:hover{border-color:var(--g);color:var(--g);transform:none;box-shadow:var(--sh);}

/* ESTIMATE */
.est-card{background:var(--white);border:1.5px solid var(--border);border-radius:var(--r);padding:20px 18px;margin-bottom:16px;box-shadow:var(--sh-md);}
.est-range{font-size:36px;font-weight:800;color:var(--g);line-height:1;}
.est-gst{font-size:11px;color:var(--grey);margin-top:4px;}
.line{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;}
.line:last-child{border-bottom:none;}
.line-lbl{color:var(--grey);}
.line-val{font-weight:600;color:var(--ch);}

/* CHECKBOX */
.chk-row{display:flex;align-items:flex-start;gap:12px;background:var(--white);border:1.5px solid var(--border);border-radius:var(--r);padding:13px 14px;cursor:pointer;transition:border-color .15s;box-shadow:var(--sh);margin-bottom:20px;}
.chk-row:hover{border-color:var(--g);}
.chk-row.chkd{border-color:var(--g);background:var(--g-light);}
.chk-box{width:20px;height:20px;border-radius:5px;border:2px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s;margin-top:1px;}
.chk-row.chkd .chk-box{background:var(--g);border-color:var(--g);}

/* ASSUMPTION CARD */
.assume{background:var(--white);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:13px 14px;display:flex;gap:11px;margin-bottom:8px;box-shadow:var(--sh);}

/* SUCCESS */
.success-icon{width:64px;height:64px;border-radius:50%;background:var(--g-light);border:2px solid var(--g-mid);display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 18px;}
.next-step{display:flex;gap:11px;margin-bottom:13px;}

/* PHOTO */
.photo-zone{border:2px dashed var(--border);border-radius:var(--r);padding:24px 16px;text-align:center;cursor:pointer;background:var(--white);transition:all .15s;}
.photo-zone:hover{border-color:var(--g);background:var(--g-light);}

/* BREADCRUMB */
.bc{display:flex;align-items:center;gap:5px;font-size:11px;color:#b0beba;margin-bottom:16px;flex-wrap:wrap;font-weight:500;}
.bc .act{color:var(--g);font-weight:700;}

/* DIVIDER */
.divider{border:none;border-top:1px solid var(--border);margin:24px 0;}

.fade{animation:fi .2s ease;}
@keyframes fi{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}
`;

// ─── SHELL ────────────────────────────────────────────────────────────────────

function Shell({ step, total, onBack, children, footer }) {
  // Scroll to top on every screen mount — no exceptions
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div className="app">
      <style>{S}</style>
      <div className="topbar">
        <div className="logo">
          {onBack && <button className="back-btn" onClick={onBack}>‹</button>}
          <div className="logo-badge">GV</div>
          <span className="logo-name">Greenvac</span>
        </div>
      </div>
      <div className="prog"><div className="prog-fill" style={{width:`${(step/total)*100}%`}}/></div>
      <div className="content">{children}</div>
      <div className="footer-wrap"><div className="footer-inner">{footer}</div></div>
    </div>
  );
}

// Utility: scroll an element into view after a short delay
function scrollTo(ref, delay=100) {
  setTimeout(() => {
    if (ref?.current) ref.current.scrollIntoView({ behavior:"smooth", block:"start" });
  }, delay);
}

function H({ ey, title, sub }) {
  return (
    <div style={{marginBottom:20}}>
      {ey && <div className="eyebrow">{ey}</div>}
      <h1 className="heading">{title}</h1>
      {sub && <p className="subhead">{sub}</p>}
    </div>
  );
}

function Sum({ items }) {
  return (
    <div className="sum-pill fade">
      <div className="sum-lbl">Your selection</div>
      <div className="sum-row">
        {items.map(i=>(
          <div key={i.l}><div className="sum-key">{i.l}</div><div className="sum-val">{i.v||"—"}</div></div>
        ))}
      </div>
    </div>
  );
}

// ─── SCREEN 1 — JOB TYPE ─────────────────────────────────────────────────────

function S1({ onNext, ans, setAns }) {
  const subRef     = useRef(null);
  const continueRef = useRef(null);
  const ok = !!(ans.jobType && ans.subtype);

  useEffect(()=>{
    if(ans.jobType && subRef.current) scrollTo(subRef, 90);
  },[ans.jobType]);

  useEffect(()=>{
    if(ok && continueRef.current) scrollTo(continueRef, 150);
  },[ok]);

  return (
    <Shell step={1} total={10} footer={
      <div ref={continueRef}>
        <button className="btn" disabled={!ok} onClick={onNext}>
          {!ans.jobType
            ? "Select a job type to continue"
            : !ans.subtype
              ? `Choose a ${jobTypes.find(j => j.id === ans.jobType)?.label.toLowerCase()} type to continue`
              : "Continue →"}
        </button>
      </div>
    }>
      <H ey="Job Details" title="What type of job is it?" sub="Select the category that best matches your job. You'll refine the details on the next screen." />

      <div className="tile-grid">
        {jobTypes.map(job => {
          const Ico = JobIcons[job.icon];
          const sel = ans.jobType === job.id;
          return (
            <div key={job.id} className={`job-tile${sel?" sel":""}`}
              onClick={()=>setAns(a=>({...a,jobType:job.id,subtype:null}))}>
              <div className="tile-icon"><Ico selected={sel}/></div>
              <div className="tile-body">
                <div className="tile-label">{job.label}</div>
                <div className="tile-desc">{job.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {ans.jobType && (
        <div ref={subRef} className="fade" style={{scrollMarginTop:20,marginTop:24}}>
          <hr className="divider" style={{marginTop:0,marginBottom:20}}/>
          <div className="sec-title">What type of {jobTypes.find(j=>j.id===ans.jobType)?.label.toLowerCase()}?</div>
          <div className="sub-grid">
            {subtypes[ans.jobType].map(sub=>{
              const sel = ans.subtype === sub;
              return (
                <div key={sub} className={`sub-tile${sel?" sel":""}`}
                  onClick={()=>setAns(a=>({...a,subtype:sub}))}>
                  <div className="sub-icon"><SubtypeIcon type={sub} selected={sel}/></div>
                  <span className="sub-label">{sub}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Shell>
  );
}

// ─── SCREEN 2 — JOB-SPECIFIC QUESTIONS ───────────────────────────────────────

// Pit / Cleanout size options
const pitSizeCards = [
  { id:"small",  label:"Standard Pit",  sub:"Single valve box or drainage pit" },
  { id:"large",  label:"Large Pit",     sub:"Multi-bay or oversized cleanout" },
];
const pitFillCards = [
  { id:"light",  label:"Light Fill",   sub:"Silt, leaves, light debris" },
  { id:"heavy",  label:"Heavy Sludge", sub:"Thick mud, clay or compacted buildup" },
];

// Service Exposure quantity
const exposureCountCards = [
  { id:"1-2", label:"1–2",   sub:"One or two locations" },
  { id:"3+",  label:"3 or more", sub:"Multiple exposure points" },
];
const exposureDepthCards = [
  { id:"shallow", label:"Shallow", sub:"Less than 600 mm" },
  { id:"deep",    label:"Deep",    sub:"600 mm or more" },
];

// Leak Exposure area
const leakAreaCards = [
  { id:"localised", label:"Localised",  sub:"Isolated spot — rough location known" },
  { id:"wide",      label:"Wide Area",  sub:"General area — needs investigation" },
];

// Tunnel / Bore distance
const boreDistCards = [
  { id:"short", label:"Short",  sub:"Under 5 m — driveway or path" },
  { id:"long",  label:"Long",   sub:"5 m or more — extended bore" },
];

// Spoil Removal volume
const spoilVolCards = [
  { id:"small",  label:"Small Load",    sub:"Wheelbarrow to one trailer" },
  { id:"large",  label:"Large Load",    sub:"Multiple trailer loads" },
];

// Cattle Grid — how many grids
const cattleCountCards = [
  { id:"1-2",   label:"1–2 Grids",  sub:"Single entry or double grid" },
  { id:"3plus", label:"3 or More",  sub:"Multiple grids or long entry" },
];

// Cattle Grid — fill condition
const cattleFillCards = [
  { id:"light",   label:"Light Buildup",  sub:"Mostly leaves, dirt and light silt" },
  { id:"moderate",label:"Moderate",       sub:"Mud and compacted debris" },
  { id:"heavy",   label:"Heavy Sludge",   sub:"Full of thick sludge or solid buildup" },
  { id:"unsure",  label:"Not Sure",       sub:"Haven't looked inside" },
];

function S2({ onNext, onBack, ans, setAns }) {
  const jt  = ans.jobType;
  const m   = ans.metres || 5;

  // Refs for cascading scroll — all declared at top level (React rules)
  const q2Ref      = useRef(null); // second question block
  const q3Ref      = useRef(null); // third question block (trenching width)
  const continueRef = useRef(null); // continue button

  // Scroll to q2 when q1 answered
  useEffect(()=>{
    if (ans.depth || ans.exposureCount || ans.pitSize || ans.cattleCount)
      scrollTo(q2Ref, 100);
  },[ans.depth, ans.exposureCount, ans.pitSize, ans.cattleCount]);

  // Scroll to q3 (width) when depth chosen — trenching only
  useEffect(()=>{
    if (ans.depth && jt==="trenching") scrollTo(q3Ref, 100);
  },[ans.depth]);

  // Scroll to continue when screen complete
  const ok =
    jt==="trenching"        ? !!(m>0 && ans.depth && ans.width) :
    jt==="service-exposure" ? !!(ans.exposureCount && ans.exposureDepth) :
    jt==="leak-exposure"    ? !!ans.leakArea :
    jt==="pit-cleanout"     ? !!(ans.pitSize && ans.pitFill) :
    jt==="cattle-grid"      ? !!(ans.cattleCount && ans.cattleFill) :
    jt==="tunnel-bore"      ? !!ans.boreDist : false;

  useEffect(()=>{
    if (ok) scrollTo(continueRef, 150);
  },[ok]);

  const bc   = <div className="bc"><span>{jobTypes.find(j=>j.id===jt)?.label}</span><span>›</span><span className="act">{ans.subtype}</span></div>;
  const head = <H ey="How Much Work?" title="How much work is involved?" sub="Give us your best estimate — GreenVac will confirm before booking." />;
  const foot = (
    <div ref={continueRef}>
      <button className="btn" disabled={!ok} onClick={onNext}>
        {ok ? "Continue" : "Answer all questions to continue"}
      </button>
    </div>
  );

  // ── TRENCHING ────────────────────────────────────────────────────────────────
  if (jt==="trenching") return (
    <Shell step={2} total={10} onBack={onBack} footer={foot}>
      {bc}{head}
      <div className="sec-block">
        <div className="q-lbl">Question 1 of 3</div>
        <div className="sec-title">How many metres of trench?</div>
        <div className="m-wrap">
          <button className="m-btn" onClick={()=>setAns(a=>({...a,metres:Math.max(1,(a.metres||5)-1)}))}>−</button>
          <div className="m-val">{m}<span className="m-unit">m</span></div>
          <button className="m-btn" onClick={()=>setAns(a=>({...a,metres:(a.metres||5)+1}))}>+</button>
        </div>
        <div className="quick-row">{[5,10,20,50].map(v=>(
          <button key={v} className={`quick${m===v?" active":""}`} onClick={()=>setAns(a=>({...a,metres:v}))}>{v}m</button>
        ))}</div>
      </div>
      <div className="sec-block">
        <div className="q-lbl">Question 2 of 3</div>
        <div className="sec-title">Preferred depth?</div>
        <div className="opt-grid-2">{depthCards.map(c=>(
          <div key={c.id} className={`opt-card${ans.depth===c.id?" sel":""}`}
            onClick={()=>setAns(a=>({...a,depth:c.id,width:null}))}>
            <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
          </div>
        ))}</div>
        {ans.depth==="custom"&&<input className="inp fade" style={{marginTop:8}} placeholder="e.g. 1000 mm" value={ans.customDepth||""} onChange={e=>setAns(a=>({...a,customDepth:e.target.value}))}/>}
      </div>
      {ans.depth&&(
        <div className="sec-block fade" ref={q3Ref} style={{scrollMarginTop:16}}>
          <div className="q-lbl">Question 3 of 3</div>
          <div className="sec-title">Preferred width?</div>
          <div className="opt-grid-2">{widthCards.map(c=>(
            <div key={c.id} className={`opt-card${ans.width===c.id?" sel":""}`}
              onClick={()=>setAns(a=>({...a,width:c.id}))}>
              <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
            </div>
          ))}</div>
          {ans.width==="custom"&&<input className="inp fade" style={{marginTop:8}} placeholder="e.g. 350 mm" value={ans.customWidth||""} onChange={e=>setAns(a=>({...a,customWidth:e.target.value}))}/>}
        </div>
      )}
      {ok&&<Sum items={[{l:"Length",v:`${m} m`},{l:"Depth",v:depthCards.find(d=>d.id===ans.depth)?.label||ans.customDepth},{l:"Width",v:widthCards.find(w=>w.id===ans.width)?.label||ans.customWidth}]}/>}
    </Shell>
  );

  // ── SERVICE EXPOSURE ─────────────────────────────────────────────────────────
  if (jt==="service-exposure") return (
    <Shell step={2} total={10} onBack={onBack} footer={foot}>
      {bc}{head}
      <div className="sec-block">
        <div className="q-lbl">Question 1 of 2</div>
        <div className="sec-title">How many locations need exposing?</div>
        <div className="opt-grid-2">{exposureCountCards.map(c=>(
          <div key={c.id} className={`opt-card${ans.exposureCount===c.id?" sel":""}`}
            onClick={()=>setAns(a=>({...a,exposureCount:c.id}))}>
            <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
          </div>
        ))}</div>
      </div>
      {ans.exposureCount&&(
        <div className="sec-block fade" ref={q2Ref} style={{scrollMarginTop:16}}>
          <div className="q-lbl">Question 2 of 2</div>
          <div className="sec-title">Approximate depth required?</div>
          <div className="opt-grid-2">{exposureDepthCards.map(c=>(
            <div key={c.id} className={`opt-card${ans.exposureDepth===c.id?" sel":""}`}
              onClick={()=>setAns(a=>({...a,exposureDepth:c.id}))}>
              <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
            </div>
          ))}</div>
        </div>
      )}
      {ok&&<Sum items={[{l:"Exposures",v:exposureCountCards.find(c=>c.id===ans.exposureCount)?.label},{l:"Depth",v:exposureDepthCards.find(c=>c.id===ans.exposureDepth)?.label}]}/>}
    </Shell>
  );

  // ── LEAK EXPOSURE ────────────────────────────────────────────────────────────
  if (jt==="leak-exposure") return (
    <Shell step={2} total={10} onBack={onBack} footer={foot}>
      {bc}{head}
      <div className="sec-block">
        <div className="q-lbl">Question 1 of 1</div>
        <div className="sec-title">Approximate area to investigate?</div>
        <div className="opt-grid-2">{leakAreaCards.map(c=>(
          <div key={c.id} className={`opt-card${ans.leakArea===c.id?" sel":""}`}
            onClick={()=>setAns(a=>({...a,leakArea:c.id}))}>
            <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
          </div>
        ))}</div>
      </div>
      {ok&&<Sum items={[{l:"Search area",v:leakAreaCards.find(c=>c.id===ans.leakArea)?.label}]}/>}
    </Shell>
  );

  // ── PIT / CLEANOUT ───────────────────────────────────────────────────────────
  if (jt==="pit-cleanout") return (
    <Shell step={2} total={10} onBack={onBack} footer={foot}>
      {bc}{head}
      <div className="sec-block">
        <div className="q-lbl">Question 1 of 2</div>
        <div className="sec-title">Roughly how big is the pit or cleanout?</div>
        <div className="opt-grid-2">{pitSizeCards.map(c=>(
          <div key={c.id} className={`opt-card${ans.pitSize===c.id?" sel":""}`}
            onClick={()=>setAns(a=>({...a,pitSize:c.id}))}>
            <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
          </div>
        ))}</div>
      </div>
      {ans.pitSize&&(
        <div className="sec-block fade" ref={q2Ref} style={{scrollMarginTop:16}}>
          <div className="q-lbl">Question 2 of 2</div>
          <div className="sec-title">What's the fill like inside?</div>
          <div className="opt-grid-2">{pitFillCards.map(c=>(
            <div key={c.id} className={`opt-card${ans.pitFill===c.id?" sel":""}`}
              onClick={()=>setAns(a=>({...a,pitFill:c.id}))}>
              <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
            </div>
          ))}</div>
        </div>
      )}
      {ok&&<Sum items={[{l:"Pit size",v:pitSizeCards.find(c=>c.id===ans.pitSize)?.label},{l:"Fill",v:pitFillCards.find(c=>c.id===ans.pitFill)?.label}]}/>}
    </Shell>
  );

  // ── CATTLE GRID ──────────────────────────────────────────────────────────────
  if (jt==="cattle-grid") return (
    <Shell step={2} total={10} onBack={onBack} footer={foot}>
      {bc}
      <H ey="Cattle Grid Cleanout" title="Tell us about the grids" sub="Helps GreenVac bring the right gear and give you an accurate estimate." />
      <div className="sec-block">
        <div className="q-lbl">Question 1 of 2</div>
        <div className="sec-title">How many cattle grids need cleaning?</div>
        <div className="opt-grid-2">{cattleCountCards.map(c=>(
          <div key={c.id} className={`opt-card${ans.cattleCount===c.id?" sel":""}`}
            onClick={()=>setAns(a=>({...a,cattleCount:c.id}))}>
            <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
          </div>
        ))}</div>
      </div>
      {ans.cattleCount&&(
        <div className="sec-block fade" ref={q2Ref} style={{scrollMarginTop:16}}>
          <div className="q-lbl">Question 2 of 2</div>
          <div className="sec-title">How full or blocked are they?</div>
          <div className="opt-grid-2">{cattleFillCards.map(c=>(
            <div key={c.id} className={`opt-card${ans.cattleFill===c.id?" sel":""}`}
              onClick={()=>setAns(a=>({...a,cattleFill:c.id}))}>
              <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
            </div>
          ))}</div>
        </div>
      )}
      {ok&&<Sum items={[{l:"Grids",v:cattleCountCards.find(c=>c.id===ans.cattleCount)?.label},{l:"Fill",v:cattleFillCards.find(c=>c.id===ans.cattleFill)?.label}]}/>}
    </Shell>
  );

  // ── TUNNEL / BORE ────────────────────────────────────────────────────────────
  if (jt==="tunnel-bore") return (
    <Shell step={2} total={10} onBack={onBack} footer={foot}>
      {bc}{head}
      <div className="sec-block">
        <div className="q-lbl">Question 1 of 1</div>
        <div className="sec-title">Approximate bore or tunnel distance?</div>
        <div className="opt-grid-2">{boreDistCards.map(c=>(
          <div key={c.id} className={`opt-card${ans.boreDist===c.id?" sel":""}`}
            onClick={()=>setAns(a=>({...a,boreDist:c.id}))}>
            <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
          </div>
        ))}</div>
      </div>
      {ok&&<Sum items={[{l:"Distance",v:boreDistCards.find(c=>c.id===ans.boreDist)?.label}]}/>}
    </Shell>
  );

  return null;
}

// ─── SCREEN 3 — SITE CONDITIONS ──────────────────────────────────────────────

function S3({ onNext, onBack, ans, setAns }) {
  const gRef=useRef(null), cRef=useRef(null), contRef=useRef(null);
  useEffect(()=>{ if(ans.access&&gRef.current) setTimeout(()=>gRef.current.scrollIntoView({behavior:"smooth",block:"start"}),90); },[ans.access]);
  useEffect(()=>{ if(ans.ground&&cRef.current) setTimeout(()=>cRef.current.scrollIntoView({behavior:"smooth",block:"start"}),90); },[ans.ground]);
  useEffect(()=>{ if(ans.congestion&&contRef.current) setTimeout(()=>contRef.current.scrollIntoView({behavior:"smooth",block:"center"}),90); },[ans.congestion]);

  const risk = ans.ground==="hard"||ans.ground==="rocky"||ans.ground==="clay"||ans.access==="difficult"||ans.congestion==="congested";
  const ok = !!(ans.access && ans.ground && ans.congestion);

  return (
    <Shell step={3} total={10} onBack={onBack} footer={
      <div ref={contRef}>
        <button className="btn" disabled={!ok} onClick={onNext}>{ok?"Continue":"Answer all questions to continue"}</button>
      </div>
    }>
      <H ey="Site Conditions" title="What are the site conditions?" sub="Helps GreenVac bring the right gear and give you an accurate estimate." />

      <div className="sec-block">
        <div className="q-lbl">Question 1 of 3</div>
        <div className="sec-title">How's the access?</div>
        <div className="opt-grid-2">
          {accessCards.map(c=>(
            <div key={c.id} className={`opt-card${ans.access===c.id?" sel":""}`} onClick={()=>setAns(a=>({...a,access:c.id}))}>
              <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {ans.access&&(
        <div className="sec-block fade" ref={gRef}>
          <div className="q-lbl">Question 2 of 3</div>
          <div className="sec-title">What's the ground like?</div>
          <div className="opt-grid-2">
            {groundCards.map(c=>(
              <div key={c.id} className={`opt-card${ans.ground===c.id?" sel":""}`} onClick={()=>setAns(a=>({...a,ground:c.id}))}>
                <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ans.ground&&(
        <div className="sec-block fade" ref={cRef}>
          <div className="q-lbl">Question 3 of 3</div>
          <div className="sec-title">Any underground services nearby?</div>
          <div className="opt-grid-2">
            {congCards.map(c=>(
              <div key={c.id} className={`opt-card${ans.congestion===c.id?" sel":""}`} onClick={()=>setAns(a=>({...a,congestion:c.id}))}>
                <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ok&&risk&&(
        <div className="reassure-box fade">
          <div style={{flexShrink:0,lineHeight:0}}><IcoCheck/></div>
          <div><div className="reassure-title">No problem — GreenVac handles this regularly</div>Our compact rig is built for tight access and tough ground. We'll factor all of this into your estimate.</div>
        </div>
      )}
      {ok&&<Sum items={[{l:"Access",v:accessCards.find(c=>c.id===ans.access)?.label},{l:"Ground",v:groundCards.find(c=>c.id===ans.ground)?.label},{l:"Services",v:congCards.find(c=>c.id===ans.congestion)?.label}]}/>}
    </Shell>
  );
}

// ─── SCREEN 4 — SPOIL ────────────────────────────────────────────────────────

function S4({ onNext, onBack, ans, setAns }) {
  const ok = !!ans.spoil;
  return (
    <Shell step={4} total={10} onBack={onBack} footer={
      <button className="btn" disabled={!ok} onClick={onNext}>{ok?"Continue":"Select a spoil option to continue"}</button>
    }>
      <H ey="Spoil Handling" title="What happens with the spoil?" sub="Spoil is the excavated material removed from the trench or pit." />
      <div className="opt-grid-1" style={{marginBottom:16}}>
        {spoilCards.map(c=>(
          <div key={c.id} className={`opt-card${ans.spoil===c.id?" sel":""}`} onClick={()=>setAns(a=>({...a,spoil:c.id}))}>
            <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
          </div>
        ))}
      </div>
      {ans.spoil==="remove-all"&&(
        <div className="reassure-box fade">
          <div style={{flexShrink:0,lineHeight:0}}><IcoCheck/></div>
          <div><div className="reassure-title">Full spoil removal — no problem</div>GreenVac will confirm disposal details before locking in the final price.</div>
        </div>
      )}
      {ans.spoil&&(
        <div className="fade">
          <div className="q-lbl" style={{marginBottom:6}}>Anything else? (Optional)</div>
          <textarea className="inp" rows={3} placeholder="e.g. Remove to back corner, or spoil is very wet..." value={ans.spoilNote||""} onChange={e=>setAns(a=>({...a,spoilNote:e.target.value}))} style={{resize:"none",lineHeight:1.5}}/>
        </div>
      )}
    </Shell>
  );
}

// ─── SCREEN 5a — LOCATION (MAP PIN) ─────────────────────────────────────────

function S5({ onNext, onBack, ans, setAns }) {
  const photoCount = ans.sitePhotos?.length || 0;
  const ok = !!(ans.name?.trim() && ans.mobile?.trim() && ans.suburb?.trim());
  const handlePhotos = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5);
    setAns(a => ({ ...a, sitePhotos: files }));
  };

  return (
    <Shell step={5} total={10} onBack={onBack} footer={
      <button className="btn" disabled={!ok} onClick={onNext}>
        {ok ? "Continue" : "Fill in your details to continue"}
      </button>
    }>
      <H ey="Job Location & Contact" title="Where is the job?" sub="Tell us the suburb and your contact details. James will confirm the exact site when he calls." />

      <div className="sec-block">
        <div className="q-lbl" style={{ marginBottom: 8 }}>Job Site</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="inp" type="text" placeholder="Street address (optional)" value={ans.address || ""} onChange={e => setAns(a => ({ ...a, address: e.target.value }))} />
          <input className="inp" type="text" placeholder="Suburb *" value={ans.suburb || ""} onChange={e => setAns(a => ({ ...a, suburb: e.target.value }))} />
          <input className="inp" type="text" placeholder="Postcode" value={ans.postcode || ""} onChange={e => setAns(a => ({ ...a, postcode: e.target.value }))} inputMode="numeric" />
          <textarea className="inp" rows={2} placeholder="Access notes — gate code, parking, anything useful..." value={ans.accessNotes || ""} onChange={e => setAns(a => ({ ...a, accessNotes: e.target.value }))} style={{ resize: "none", lineHeight: 1.5 }} />
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0 20px" }} />

      <div className="sec-block">
        <div className="q-lbl" style={{ marginBottom: 8 }}>Your Details</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="inp" type="text" placeholder="Full name *" value={ans.name || ""} onChange={e => setAns(a => ({ ...a, name: e.target.value }))} autoComplete="name" />
          <input className="inp" type="tel" placeholder="Mobile number *" value={ans.mobile || ""} onChange={e => setAns(a => ({ ...a, mobile: e.target.value }))} autoComplete="tel" inputMode="tel" />
          <input className="inp" type="email" placeholder="Email address" value={ans.email || ""} onChange={e => setAns(a => ({ ...a, email: e.target.value }))} autoComplete="email" inputMode="email" />
        </div>
      </div>

      <div className="sec-block">
        <div className="q-lbl" style={{ marginBottom: 8 }}>Site Photos (Optional)</div>
        <label className="photo-zone" htmlFor="site-photos">
          <input id="site-photos" type="file" accept="image/*" multiple onChange={handlePhotos} style={{display:"none"}} />
          <div style={{ marginBottom: 6, lineHeight: 0 }}><IcoCamera/></div>
          <div style={{ fontWeight: 700, fontSize: 13, color: photoCount > 0 ? "var(--g)" : "var(--ch)" }}>
            {photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? "s" : ""} selected` : "Add Site Photos"}
          </div>
          <div style={{ fontSize: 11, color: "var(--grey)", marginTop: 3 }}>Up to 5 photos helps GreenVac assess access and site layout</div>
        </label>
      </div>
    </Shell>
  );
}

function S5_UNUSED({ onNext, onBack, ans, setAns }) {
  const [photos, setPhotos] = useState(0);
  const [pinDropped, setPinDropped] = useState(!!ans.pinLat);
  const [searching, setSearching] = useState(false);
  const [searchVal, setSearchVal] = useState(ans.address || "");
  const mapRef = useRef(null);

  // Simulated pin locations around ACT/Braidwood for demo
  const demoLocations = [
    { lat: -35.4532, lng: 149.4037, addr: "14 Wallace St, Braidwood NSW 2622", suburb: "Braidwood", postcode: "2622" },
    { lat: -35.2809, lng: 149.1300, addr: "22 Northbourne Ave, Canberra ACT 2601", suburb: "Canberra", postcode: "2601" },
    { lat: -35.3388, lng: 149.1571, addr: "8 Hindmarsh Dr, Woden ACT 2606", suburb: "Woden", postcode: "2606" },
    { lat: -35.4082, lng: 149.0743, addr: "45 Tuggeranong Pkwy, Greenway ACT 2900", suburb: "Greenway", postcode: "2900" },
  ];

  const [pinPos, setPinPos] = useState(
    pinDropped ? { x: 52, y: 44 } : null
  );

  const handleMapTap = (e) => {
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPinPos({ x, y });
    setPinDropped(true);
    // Pick nearest demo location based on rough x/y
    const idx = Math.floor((x / 100) * demoLocations.length) % demoLocations.length;
    const loc = demoLocations[idx];
    setSearchVal(loc.addr);
    setAns(a => ({ ...a,
      address: loc.addr,
      suburb: loc.suburb,
      postcode: loc.postcode,
      pinLat: loc.lat,
      pinLng: loc.lng,
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    setSearching(true);
    setTimeout(() => {
      // Simulate geocode result
      const loc = demoLocations[Math.floor(Math.random() * demoLocations.length)];
      setPinPos({ x: 30 + Math.random() * 40, y: 25 + Math.random() * 35 });
      setPinDropped(true);
      setSearchVal(loc.addr);
      setAns(a => ({ ...a,
        address: loc.addr,
        suburb: loc.suburb,
        postcode: loc.postcode,
        pinLat: loc.lat,
        pinLng: loc.lng,
      }));
      setSearching(false);
    }, 900);
  };

  const clearPin = () => {
    setPinDropped(false);
    setPinPos(null);
    setSearchVal("");
    setAns(a => ({ ...a, address: "", suburb: "", postcode: "", pinLat: null, pinLng: null }));
  };

  const ok = !!(ans.name?.trim() && ans.mobile?.trim() && ans.email?.trim() && pinDropped);
  const detailsRef = useRef(null);

  // When pin is dropped, scroll down to reveal contact details
  useEffect(() => {
    if (pinDropped && detailsRef.current) {
      setTimeout(() => detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    }
  }, [pinDropped]);

  return (
    <Shell step={5} total={10} onBack={onBack} footer={
      <button className="btn" disabled={!ok} onClick={onNext}>
        {ok ? "Continue" : !pinDropped ? "Drop a pin to continue" : "Fill in your details to continue"}
      </button>
    }>
      <H ey="Job Location" title="Where is the job?" sub="Drop a pin on the map or search your address. Then fill in your details below." />

      {/* Search bar */}
      <div style={{ marginBottom: 12 }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
          <input
            className="inp"
            placeholder="Search address or suburb..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" style={{
            background: "var(--g)", border: "none", borderRadius: "var(--r-sm)",
            color: "#fff", padding: "0 16px", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "Montserrat, sans-serif", flexShrink: 0,
            boxShadow: "0 2px 6px rgba(45,122,65,.25)"
          }}>
            {searching ? "…" : "Go"}
          </button>
        </form>
      </div>

      {/* Map */}
      <div style={{ marginBottom: 12, borderRadius: "var(--r)", overflow: "hidden", border: "1.5px solid var(--border)", boxShadow: "var(--sh-md)", position: "relative" }}>
        {/* OpenStreetMap iframe — centred on ACT/Braidwood region */}
        <div
          ref={mapRef}
          onClick={handleMapTap}
          style={{ position: "relative", cursor: "crosshair", userSelect: "none" }}
        >
          <iframe
            title="Job location map"
            src="https://www.openstreetmap.org/export/embed.html?bbox=148.8%2C-35.7%2C149.7%2C-35.1&layer=mapnik"
            style={{ width: "100%", height: 240, border: "none", display: "block", pointerEvents: "none" }}
          />
          {/* Tap overlay — captures clicks, passes through visually */}
          <div style={{
            position: "absolute", inset: 0, cursor: "crosshair",
          }} onClick={handleMapTap} />

          {/* Dropped pin */}
          {pinPos && (
            <div style={{
              position: "absolute",
              left: `${pinPos.x}%`,
              top: `${pinPos.y}%`,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              animation: "pinDrop .25s cubic-bezier(.2,1.4,.6,1)",
            }}>
              <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
                <path d="M16 0C9 0 3 6 3 13c0 9 13 27 13 27s13-18 13-27C29 6 23 0 16 0z" fill="#2d7a41"/>
                <circle cx="16" cy="13" r="5" fill="white"/>
              </svg>
            </div>
          )}

          {/* Hint overlay when no pin */}
          {!pinDropped && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <div style={{
                background: "rgba(255,255,255,0.92)", borderRadius: 10,
                padding: "10px 16px", display: "flex", alignItems: "center",
                gap: 8, boxShadow: "0 2px 8px rgba(0,0,0,.12)",
              }}>
                <svg width="18" height="22" viewBox="0 0 32 40" fill="none">
                  <path d="M16 0C9 0 3 6 3 13c0 9 13 27 13 27s13-18 13-27C29 6 23 0 16 0z" fill="#2d7a41"/>
                  <circle cx="16" cy="13" r="5" fill="white"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ch)" }}>Tap the map to drop a pin</span>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes pinDrop {
            from { transform: translate(-50%, -200%); opacity: 0; }
            to   { transform: translate(-50%, -100%); opacity: 1; }
          }
        `}</style>
      </div>

      {/* Confirmed address card */}
      {pinDropped && ans.address && (
        <div className="fade" style={{
          background: "var(--g-light)", border: "1.5px solid var(--g-mid)",
          borderRadius: "var(--r)", padding: "12px 14px", marginBottom: 16,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <svg width="18" height="22" viewBox="0 0 32 40" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M16 0C9 0 3 6 3 13c0 9 13 27 13 27s13-18 13-27C29 6 23 0 16 0z" fill="#2d7a41"/>
              <circle cx="16" cy="13" r="5" fill="white"/>
            </svg>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--g)", marginBottom: 2 }}>Job Location</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ch)", lineHeight: 1.4 }}>{ans.address}</div>
            </div>
          </div>
          <button onClick={clearPin} style={{
            background: "none", border: "none", color: "var(--grey)", cursor: "pointer",
            fontSize: 18, lineHeight: 1, flexShrink: 0, padding: 2,
          }}>×</button>
        </div>
      )}

      {/* Access notes */}
      {pinDropped && (
        <div className="sec-block fade">
          <div className="q-lbl" style={{ marginBottom: 6 }}>Access Notes (Optional)</div>
          <textarea className="inp" rows={2} placeholder="Parking, gate code, access instructions..." value={ans.accessNotes || ""} onChange={e => setAns(a => ({ ...a, accessNotes: e.target.value }))} style={{ resize: "none", lineHeight: 1.5 }} />
        </div>
      )}

      {/* Bouncing down arrow — guides user to scroll after pin drop */}
      {!pinDropped && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "8px 0 16px", opacity: 0.55,
        }}>
          <style>{`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(7px); }
            }
          `}</style>
          <svg style={{ animation: "bounce 1.2s ease-in-out infinite" }} width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#2d7a41" strokeWidth="1.5" fill="#eaf4ec"/>
            <path d="M9 12l5 5 5-5" stroke="#2d7a41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 11, color: "var(--g)", fontWeight: 600, marginTop: 5, letterSpacing: 0.3 }}>Scroll down after pinning</span>
        </div>
      )}

      <hr ref={detailsRef} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0 20px", scrollMarginTop: 80 }} />

      {/* Contact details */}
      <div className="sec-block">
        <div className="q-lbl" style={{ marginBottom: 8 }}>Your Details</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[["name","Full name *","text"],["mobile","Mobile number *","tel"],["email","Email address *","email"]].map(([k,p,t]) => (
            <input key={k} className="inp" type={t} placeholder={p} value={ans[k]||""} onChange={e=>setAns(a=>({...a,[k]:e.target.value}))}/>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div className="sec-block">
        <div className="q-lbl" style={{ marginBottom: 8 }}>Site Photos (Optional)</div>
        <div className="photo-zone" onClick={() => setPhotos(p => Math.min(p+1, 5))}>
          <div style={{ marginBottom: 6, lineHeight: 0 }}><IcoCamera/></div>
          <div style={{ fontWeight: 700, fontSize: 13, color: photos > 0 ? "var(--g)" : "var(--ch)" }}>
            {photos > 0 ? `${photos} photo${photos > 1 ? "s" : ""} added — tap to add more` : "Upload Site Photos"}
          </div>
          <div style={{ fontSize: 11, color: "var(--grey)", marginTop: 3 }}>Helps GreenVac assess access and site layout</div>
        </div>
      </div>
    </Shell>
  );
}

// ─── SCREEN 6 — TIMING ───────────────────────────────────────────────────────

function S6({ onNext, onBack, ans, setAns }) {
  const tRef=useRef(null);
  useEffect(()=>{ if(ans.preferredDay&&tRef.current) setTimeout(()=>tRef.current.scrollIntoView({behavior:"smooth",block:"start"}),90); },[ans.preferredDay]);
  const needsDate = ans.preferredDay === "choose-date";
  const ok = !!(ans.preferredDay && ans.preferredTime && (!needsDate || ans.chosenDate));
  return (
    <Shell step={6} total={10} onBack={onBack} footer={
      <button className="btn" disabled={!ok} onClick={onNext}>{ok?"Continue":needsDate && !ans.chosenDate?"Choose a date to continue":"Select day and time to continue"}</button>
    }>
      <H ey="Preferred Timing" title="When would you like it done?" sub="This is a preferred booking request only — GreenVac will confirm availability." />
      <div className="sec-block">
        <div className="q-lbl">Question 1 of 2</div>
        <div className="sec-title">Preferred day?</div>
        <div className="opt-grid-1">
          {dayCards.map(c=>(
            <div key={c.id} className={`opt-card${ans.preferredDay===c.id?" sel":""}`} onClick={()=>setAns(a=>({...a,preferredDay:c.id,chosenDate:c.id==="choose-date"?a.chosenDate:""}))}>
              <div className="opt-label">{c.label}</div>
            </div>
          ))}
        </div>
        {ans.preferredDay==="choose-date"&&<input className="inp fade" type="date" style={{marginTop:8}} value={ans.chosenDate||""} onChange={e=>setAns(a=>({...a,chosenDate:e.target.value}))}/>}
      </div>
      {ans.preferredDay&&(
        <div className="sec-block fade" ref={tRef}>
          <div className="q-lbl">Question 2 of 2</div>
          <div className="sec-title">Preferred time?</div>
          <div className="opt-grid-2">
            {timeCards.map(c=>(
              <div key={c.id} className={`opt-card${ans.preferredTime===c.id?" sel":""}`} onClick={()=>setAns(a=>({...a,preferredTime:c.id}))}>
                <div className="opt-label">{c.label}</div><div className="opt-sub">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="info-note">Your selected time is a <strong>preferred request only</strong> and must be reviewed and approved by GreenVac before it is confirmed.</div>
    </Shell>
  );
}

// ─── PRICING ENGINE ──────────────────────────────────────────────────────────
// Admin variables — edit these without touching any other code
const RATE       = 235;   // Standard hourly rate ex GST
const RATE_COMP  = 260;   // Complex/high-risk hourly rate ex GST
const FLOOR_INT  = 650;   // Internal minimum job floor ex GST
const FLOOR_DISP = 790;   // Customer-facing display minimum ex GST
const BUFFER     = 0.15;  // High-end estimate buffer (15%)
const TRAVEL_INC = 20;    // km included from base (no charge)
const TRAVEL_KM  = 1.50;  // $ per km round trip beyond included radius

// ── Depth modifiers (trenching / service exposure)
const depthMod = { "300mm":0.90, "450mm":1.00, "600mm":1.10, "800mm":1.20, "custom":1.35 };

// ── Width modifiers (trenching)
const widthMod = { narrow:1.00, standard:1.05, wide:1.15, custom:1.20 };

// ── Access modifiers
const accessMod = { open:1.00, side:1.05, "tight-backyard":1.15, "narrow-path":1.15, difficult:1.25, unsure:1.10 };

// ── Ground modifiers
const groundMod = { soft:0.95, normal:1.00, hard:1.20, clay:1.20, rocky:1.35, wet:1.15, unsure:1.10 };

// ── Congestion modifiers
const congMod = { clear:1.00, some:1.10, congested:1.25, unsure:1.10 };

// ── Trenching production rates (hrs/m) by subtype
const trenchRates = {
  "Electrical Trench":   0.12,
  "Plumbing Trench":     0.11,
  "Data / Comms Trench": 0.10,
  "Irrigation Trench":   0.09,
  "Custom Trench":       0.12,
};

// ── Pit/cleanout hours by size + fill
const pitHours = {
  small:  { light:0.75, heavy:1.25, unsure:1.00 },
  medium: { light:1.00, heavy:1.75, unsure:1.25 },
  large:  { light:1.50, heavy:2.50, unsure:2.00 },
  custom: { light:1.00, heavy:1.75, unsure:1.25 },
};

// ── Cattle grid hours by blockage level
const cattleHours = { light:1.5, moderate:2.5, heavy:4.0, unsure:2.5 };

// ── Tunnel/bore hours by distance band
const boreHours = { short:2.5, long:5.0, under2:2.5, "2to5":3.5, "5to10":5.0, "10plus":6.5 };

// ── Leak area hours
const leakHours = { localised:2.0, wide:4.5, small:2.0, medium:3.0, large:4.5, unsure:3.0 };

function buildLocation(ans) {
  const streetAndSuburb = [ans.address?.trim(), ans.suburb?.trim()].filter(Boolean).join(", ");
  return [streetAndSuburb, ans.postcode?.trim()].filter(Boolean).join(" ").trim() || "--";
}

function getPreferredDayLabel(ans) {
  if (ans.preferredDay === "choose-date") return ans.chosenDate || "Date to be confirmed";
  return dayCards.find(d => d.id === ans.preferredDay)?.label;
}

function getJobDetailRows(ans) {
  const rows = [];
  const add = (label, value) => {
    if (value) rows.push({ l: label, v: value });
  };

  if (ans.jobType === "trenching") {
    add("Length", `${ans.metres || 5}m`);
    add("Depth", ans.depth === "custom" ? ans.customDepth || "Custom" : depthCards.find(d => d.id === ans.depth)?.label);
    add("Width", ans.width === "custom" ? ans.customWidth || "Custom" : widthCards.find(w => w.id === ans.width)?.label);
  } else if (ans.jobType === "service-exposure") {
    add("Exposures", exposureCountCards.find(c => c.id === ans.exposureCount)?.label);
    add("Depth", exposureDepthCards.find(c => c.id === ans.exposureDepth)?.label);
  } else if (ans.jobType === "leak-exposure") {
    add("Search area", leakAreaCards.find(c => c.id === ans.leakArea)?.label);
  } else if (ans.jobType === "pit-cleanout") {
    add("Pit size", pitSizeCards.find(c => c.id === ans.pitSize)?.label);
    add("Fill", pitFillCards.find(c => c.id === ans.pitFill)?.label);
  } else if (ans.jobType === "cattle-grid") {
    add("Grids", cattleCountCards.find(c => c.id === ans.cattleCount)?.label);
    add("Fill", cattleFillCards.find(c => c.id === ans.cattleFill)?.label);
  } else if (ans.jobType === "tunnel-bore") {
    add("Distance", boreDistCards.find(c => c.id === ans.boreDist)?.label);
  }

  return rows;
}

function calcEstimate(ans) {
  const jt = ans.jobType;
  let setupHrs = 0;
  let prodHrs  = 0;
  let rate     = RATE;
  let needsReview = false;
  const lines  = [];

  // ── Access / ground / congestion modifiers (where applicable)
  const am = accessMod[ans.access]  || 1.00;
  const gm = groundMod[ans.ground]  || 1.00;
  const cm = congMod[ans.congestion] || 1.00;
  const combinedMod = am * gm * cm;

  if (jt === "trenching") {
    setupHrs = 1.5;
    const m = ans.metres || 5;
    const hpm = trenchRates[ans.subtype] || 0.12;
    const dm  = depthMod[ans.depth]   || 1.00;
    const wm  = widthMod[ans.width]   || 1.00;
    prodHrs = m * hpm * dm * wm;
    if (ans.depth === "custom") needsReview = true;
    lines.push({ l:`${ans.subtype} — ${m}m`, v: null });
    lines.push({ l:`Depth modifier (${ans.depth})`, v: null });
  }

  else if (jt === "service-exposure") {
    setupHrs = 1.25;
    const count = parseInt(ans.exposureCount) || 1;
    const dm = ans.exposureDepth === "shallow" ? 0.95 : ans.exposureDepth === "deep" ? 1.20 : 1.00;
    prodHrs = count * 0.75 * dm;
    lines.push({ l:`${count} exposure point${count>1?"s":""}`, v: null });
  }

  else if (jt === "leak-exposure") {
    setupHrs = 1.0;
    prodHrs = leakHours[ans.leakArea] || 3.0;
    if (ans.leakArea === "wide" || ans.leakArea === "unsure") needsReview = true;
    lines.push({ l:`Leak investigation — ${ans.leakArea} area`, v: null });
  }

  else if (jt === "pit-cleanout") {
    setupHrs = 1.25;
    const ph = (pitHours[ans.pitSize] || pitHours.medium)[ans.pitFill] || 1.0;
    prodHrs = ph;
    lines.push({ l:`Pit cleanout — ${ans.pitSize} / ${ans.pitFill} fill`, v: null });
  }

  else if (jt === "cattle-grid") {
    setupHrs = 1.5;
    rate = RATE_COMP; // Cattle grids: do not underprice
    const count = ans.cattleCount === "3plus" ? 3 : parseInt(ans.cattleCount) || 1;
    const hpg = cattleHours[ans.cattleFill] || 2.5;
    prodHrs = count * hpg;
    lines.push({ l:`${count} cattle grid${count>1?"s":""}`, v: null });
    lines.push({ l:`Blockage level — ${ans.cattleFill}`, v: null });
  }

  else if (jt === "tunnel-bore") {
    setupHrs = 1.5;
    prodHrs = boreHours[ans.boreDist] || 3.5;
    if (ans.boreDist === "long" || ans.boreDist === "10plus") needsReview = true;
    lines.push({ l:`Bore / tunnel — ${ans.boreDist}`, v: null });
  }

  if (ans.spoil === "remove-all") {
    needsReview = true;
    lines.push({ l:"Spoil removal requested", v: null });
  }

  // Labour calc with modifiers
  const baseLabour = (setupHrs + prodHrs) * rate;
  const adjLabour  = baseLabour * combinedMod;

  const locationText = buildLocation(ans);
  const isOuterArea = /braidwood|goulburn|yass|cooma|bungendore/i.test(locationText);
  const travelCharge = isOuterArea ? 80 : 0;

  // Floor check
  const rawLow = adjLabour + travelCharge;
  const low    = Math.max(FLOOR_INT, rawLow);
  const dispLow = Math.max(FLOOR_DISP, Math.round(low / 10) * 10);
  const dispHigh = Math.round(dispLow * (1 + BUFFER) / 10) * 10;

  return {
    low: dispLow,
    high: dispHigh,
    labour: Math.round(adjLabour),
    travel: travelCharge,
    needsReview,
    lines,
    am, gm, cm,
  };
}

// ─── SCREEN 7 — ESTIMATE ─────────────────────────────────────────────────────

function S7({ onNext, onBack, ans }) {
  const est = calcEstimate(ans);
  const jt  = jobTypes.find(j => j.id === ans.jobType);
  const detailRows = getJobDetailRows(ans);

  // Site condition summary tags
  const condTags = [
    accessCards.find(c=>c.id===ans.access)?.label,
    groundCards.find(c=>c.id===ans.ground)?.label,
    congCards.find(c=>c.id===ans.congestion)?.label,
  ].filter(Boolean);

  return (
    <Shell step={7} total={10} onBack={onBack} footer={
      <button className="btn" onClick={onNext}>Review & Submit</button>
    }>
      <H ey="Indicative Estimate" title="Here's your estimate" sub="Based on the details you've provided. GreenVac will review and confirm before booking." />

      {/* Main estimate range card */}
      <div className="est-card" style={{textAlign:"center", paddingTop:24, paddingBottom:24}}>
        <div style={{fontSize:10,fontWeight:700,color:"var(--grey)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Indicative Estimate</div>
        <div className="est-range">${est.low.toLocaleString()} – ${est.high.toLocaleString()}</div>
        <div className="est-gst">+ GST &nbsp;·&nbsp; Subject to site review</div>
        {est.needsReview && (
          <div className="reassure-box fade" style={{marginTop:16, textAlign:"left"}}>
            <div style={{lineHeight:0}}><IcoCheck/></div>
            <div><div className="reassure-title">GreenVac will personally review this one</div>Your job has some details we want to look at before confirming — we'll be in touch quickly.</div>
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="est-card">
        <div style={{fontSize:10,fontWeight:700,color:"var(--grey)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>Breakdown</div>
        <div className="line"><span className="line-lbl">Labour & equipment</span><span className="line-val">${est.labour.toLocaleString()}</span></div>
        {est.travel > 0 && <div className="line"><span className="line-lbl">Travel (outside local area)</span><span className="line-val">${est.travel}</span></div>}
        {est.travel === 0 && <div className="line"><span className="line-lbl">Travel</span><span className="line-val" style={{color:"var(--g)"}}>Included</span></div>}
        <div style={{borderTop:"1px solid var(--border)", marginTop:10, paddingTop:10}}>
          <div className="line">
            <span className="line-lbl" style={{fontWeight:700,color:"var(--ch)"}}>Estimate (excl. GST)</span>
            <span className="line-val" style={{fontWeight:700,color:"var(--ch)"}}>${est.low.toLocaleString()} – ${est.high.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Job summary */}
      <div className="est-card">
        <div style={{fontSize:10,fontWeight:700,color:"var(--grey)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>Your Job Summary</div>
        <div className="line"><span className="line-lbl">Service</span><span className="line-val">{jt?.label}</span></div>
        <div className="line"><span className="line-lbl">Type</span><span className="line-val">{ans.subtype}</span></div>
        {detailRows.map(i => (
          <div key={i.l} className="line"><span className="line-lbl">{i.l}</span><span className="line-val">{i.v}</span></div>
        ))}
        {condTags.length > 0 && <div className="line"><span className="line-lbl">Site conditions</span><span className="line-val">{condTags.join(" · ")}</span></div>}
        {buildLocation(ans) !== "--" && <div className="line"><span className="line-lbl">Location</span><span className="line-val">{buildLocation(ans)}</span></div>}
      </div>

      <div className="info-note" style={{marginTop:4}}>This is an indicative estimate only. Final pricing is confirmed by GreenVac after reviewing your request and site details.</div>
    </Shell>
  );
}

// ─── SCREEN 8 — CONDITIONS ───────────────────────────────────────────────────

function S8({ onNext, onBack, ans, setAns }) {
  return (
    <Shell step={8} total={10} onBack={onBack} footer={
      <button className="btn" disabled={!ans.acceptedTerms} onClick={onNext}>{ans.acceptedTerms?"Continue to Submit":"Please accept the conditions above"}</button>
    }>
      <H ey="Almost Done" title="Before you submit" sub="Please review the assumptions your estimate is based on." />
      {[
        {i:<IcoCheck/>,t:"Access as described",b:"This estimate assumes the site is accessible as described. Significant access issues may affect pricing."},
        {i:<IcoLeaf/>,t:"Ground as selected",b:"Based on the ground type you selected. Unexpected rock, rubble or buried obstructions may vary the cost."},
        {i:<IcoRuler/>,t:"Known services only",b:"No uncharted underground services or buried obstacles have been assumed."},
        {i:<IcoClock/>,t:"Standard working hours",b:"Applies to standard weekday hours. After-hours or urgent work may attract additional charges."},
      ].map(a=>(
        <div key={a.t} className="assume">
          <div style={{flexShrink:0,lineHeight:0}}>{a.i}</div>
          <div><div style={{fontWeight:700,fontSize:12,color:"var(--ch)",marginBottom:3}}>{a.t}</div><div style={{fontSize:12,color:"var(--grey)",lineHeight:1.5}}>{a.b}</div></div>
        </div>
      ))}
      <div className="info-note" style={{marginTop:16}}>Final pricing may change if actual site conditions, access, depth, spoil volume or underground congestion differ from what was provided.</div>
      <div className={`chk-row${ans.acceptedTerms?" chkd":""}`} onClick={()=>setAns(a=>({...a,acceptedTerms:!a.acceptedTerms}))}>
        <div className="chk-box">{ans.acceptedTerms&&<CheckIcon/>}</div>
        <div style={{fontSize:13,color:"var(--ch)",lineHeight:1.5}}>I understand this is an indicative estimate only and is subject to GreenVac review and actual site conditions.</div>
      </div>
    </Shell>
  );
}

// ─── SCREEN 9 — REVIEW ───────────────────────────────────────────────────────

function S9({ onNext, onBack, ans }) {
  const [submitState, setSubmitState] = useState("idle");
  const [submitError, setSubmitError] = useState("");
  const submitLockRef = useRef(false);
  const submissionEventIdRef = useRef(null);
  const isSubmitting = submitState === "submitting";
  const reviewRows = getJobDetailRows(ans);

  function buildRequestDetails() {
    const jobRows = getJobDetailRows(ans);
    const service = jobTypes.find(j => j.id === ans.jobType)?.label;
    const access = accessCards.find(c => c.id === ans.access)?.label;
    const ground = groundCards.find(c => c.id === ans.ground)?.label;
    const servicesNearby = congCards.find(c => c.id === ans.congestion)?.label;
    const spoil = spoilCards.find(c => c.id === ans.spoil)?.label;
    const day = getPreferredDayLabel(ans);
    const time = timeCards.find(t => t.id === ans.preferredTime)?.label;
    const address = buildLocation(ans);
    const photoCount = ans.sitePhotos?.length || 0;
    const est = calcEstimate(ans);
    const body = [
      "NEW ESTIMATE REQUEST - GREENVAC",
      "",
      "----------------------------",
      `INDICATIVE ESTIMATE: $${est.low.toLocaleString()} - $${est.high.toLocaleString()} + GST`,
      est.needsReview ? "Flagged for manual review" : "Standard estimate",
      "----------------------------",
      "",
      "CUSTOMER",
      `Name: ${ans.name || "--"}`,
      `Mobile: ${ans.mobile || "--"}`,
      `Email: ${ans.email || "--"}`,
      "",
      "JOB DETAILS",
      `Service: ${service || "--"}`,
      `Type: ${ans.subtype || "--"}`,
      ...jobRows.map(row => `${row.l}: ${row.v || "--"}`),
      `Access: ${access || "--"}`,
      `Ground conditions: ${ground || "--"}`,
      `Services nearby: ${servicesNearby || "--"}`,
      `Spoil removal: ${spoil || "--"}`,
      "",
      "SITE",
      `Address: ${address}`,
      `Access notes: ${ans.accessNotes || "--"}`,
      `Site photos selected: ${photoCount}`,
      "",
      "SCHEDULING",
      `Preferred time: ${day || "--"} - ${time || "--"}`,
    ].join("\n");

    return {
      service,
      access,
      ground,
      servicesNearby,
      spoil,
      day,
      time,
      address,
      est,
      body,
      subject: `Estimate Request - ${ans.subtype || "Hydrovac Job"}`,
    };
  }

  async function handleSubmit() {
    if (submitLockRef.current) return;

    submitLockRef.current = true;
    if (!submissionEventIdRef.current) {
      submissionEventIdRef.current = window.GreenVacAnalytics?.createEventId("estimator")
        || `estimator-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    }

    const request = buildRequestDetails();
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
    formData.append("estimate_low", String(request.est.low || ""));
    formData.append("estimate_high", String(request.est.high || ""));
    formData.append("needs_review", request.est.needsReview ? "yes" : "no");
    formData.append("address", request.address || "");
    formData.append("suburb", ans.suburb || "");
    formData.append("postcode", ans.postcode || "");
    formData.append("access_notes", ans.accessNotes || "");
    formData.append("site_photo_count", String(ans.sitePhotos?.length || 0));
    formData.append("preferred_day", request.day || "");
    formData.append("preferred_time", request.time || "");
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
        const providerMessage = payload?.message || payload?.errors?.map(err => err.message).join(" ");
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
      setSubmitError("Could not send your request right now. Please try again, call James direct, or use the email fallback below.");
    }
  }

  const fallbackRequest = buildRequestDetails();
  const fallbackMailto = `mailto:james@greenvac.com.au?subject=${encodeURIComponent(fallbackRequest.subject)}&body=${encodeURIComponent(fallbackRequest.body)}`;

  return (
    <Shell step={9} total={10} onBack={onBack} footer={
      <div>
        <button className="btn" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Sending Request..." : submitState === "error" ? "Try Sending Again" : "Request Estimate & Preferred Booking"}
        </button>
        <div style={{textAlign:"center",marginTop:10,fontSize:12,color:"var(--grey)"}}>Urgent? <a href="tel:0408362590" data-phone-placement="estimator_review" style={{color:"var(--g)",fontWeight:600}}>Call 0408 362 590</a></div>
      </div>
    }>
      <H ey="Final Check" title="Ready to submit?" sub="Review your request before it goes to GreenVac." />
      <div className="est-card">
        <div style={{fontSize:10,fontWeight:700,color:"var(--grey)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>Your Request Summary</div>
        {[
          {l:"Job type",v:ans.subtype},
          ...reviewRows,
          {l:"Access",v:accessCards.find(c=>c.id===ans.access)?.label},
          {l:"Ground",v:groundCards.find(c=>c.id===ans.ground)?.label},
          {l:"Services nearby",v:congCards.find(c=>c.id===ans.congestion)?.label},
          {l:"Spoil",v:spoilCards.find(c=>c.id===ans.spoil)?.label},
          {l:"Name",v:ans.name},
          {l:"Mobile",v:ans.mobile},
          {l:"Address",v:buildLocation(ans)},
          {l:"Photos",v:ans.sitePhotos?.length ? `${ans.sitePhotos.length} selected` : "None"},
          {l:"Preferred time",v:`${getPreferredDayLabel(ans)} - ${timeCards.find(t=>t.id===ans.preferredTime)?.label}`},
        ].map(i=>(
          <div key={i.l} className="line"><span className="line-lbl">{i.l}</span><span className="line-val" style={{textAlign:"right",maxWidth:"55%"}}>{i.v||"--"}</span></div>
        ))}
      </div>
      <div className="info-note">Your selected time is a <strong>preferred booking request only</strong>. This request is submitted directly to GreenVac from this form, and James will contact you to confirm pricing and availability.</div>
      {submitError && (
        <div className="info-note" style={{marginTop:12,borderColor:"#e5c2c2",background:"#fff5f5",color:"#7d2b2b"}}>
          {submitError}{" "}
          <a href={fallbackMailto} style={{color:"var(--g)",fontWeight:700}}>Open Email Instead</a>
        </div>
      )}
    </Shell>
  );
}
// ─── SCREEN 10 — CONFIRMATION ────────────────────────────────────────────────

function S10({ onRestart }) {
  return (
    <Shell step={10} total={10} footer={
      <button className="btn sec" onClick={onRestart}>Start a New Quote</button>
    }>
      <div style={{textAlign:"center",paddingTop:28}}>
        <div className="success-icon"><IcoCheck s={30}/></div>
        <h1 style={{fontFamily:"Montserrat,sans-serif",fontSize:24,fontWeight:800,color:"var(--ch)",marginBottom:10}}>Request Sent</h1>
        <p style={{fontSize:13,color:"var(--grey)",lineHeight:1.65,maxWidth:320,margin:"0 auto 28px"}}>Your estimate request and preferred booking time have been sent to GreenVac. We'll review the details and be in touch to confirm pricing and availability.</p>
        <div style={{background:"var(--white)",border:"1.5px solid var(--border)",borderRadius:12,padding:"18px 16px",marginBottom:24,textAlign:"left",boxShadow:"var(--sh)"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--grey)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:14}}>What happens next</div>
          {[
            {i:<IcoPhone/>,t:"GreenVac reviews your request",b:"We check your job details, site conditions and preferred timing."},
            {i:<IcoChat/>,t:"We'll be in touch",b:"Expect a call or message to confirm your quote and lock in a time."},
            {i:<IcoTruck/>,t:"Job confirmed",b:"Once approved, your booking is confirmed and the team is scheduled."},
          ].map(s=>(
            <div key={s.t} className="next-step">
              <div style={{flexShrink:0,lineHeight:0,marginTop:1}}>{s.i}</div>
              <div><div style={{fontWeight:700,fontSize:12,color:"var(--ch)",marginBottom:2}}>{s.t}</div><div style={{fontSize:11,color:"var(--grey)",lineHeight:1.5}}>{s.b}</div></div>
            </div>
          ))}
        </div>
        <div style={{fontSize:12,color:"var(--grey)"}}>Urgent? <a href="tel:0408362590" data-phone-placement="estimator_success" style={{color:"var(--g)",fontWeight:600}}>Call GreenVac directly</a></div>
      </div>
    </Shell>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [scr, setScr] = useState(1);
  const [ans, setAns] = useState({ metres:5 });
  const next = () => {
    if (typeof window.posthog !== 'undefined') {
      if (scr === 1) {
        window.posthog.capture('estimator_started');
      }
      window.posthog.capture('estimator_step_' + (scr + 1), { from_step: scr });
    }
    setScr(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => { setScr(s=>s-1); window.scrollTo({top:0,behavior:"smooth"}); };
  const restart = () => { setScr(1); setAns({metres:5}); window.scrollTo({top:0}); };
  const props = { ans, setAns, onNext:next, onBack:back };
  if(scr===1)  return <S1  {...props}/>;
  if(scr===2)  return <S2  {...props}/>;
  if(scr===3)  return <S3  {...props}/>;
  if(scr===4)  return <S4  {...props}/>;
  if(scr===5)  return <S5  {...props}/>;
  if(scr===6)  return <S6  {...props}/>;
  if(scr===7)  return <S7  ans={ans} onNext={next} onBack={back}/>;
  if(scr===8)  return <S8  {...props}/>;
  if(scr===9)  return <S9  ans={ans} onNext={next} onBack={back}/>;
  if(scr===10) return <S10 onRestart={restart}/>;
}
