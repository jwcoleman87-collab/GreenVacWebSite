import { calcEstimate } from './pricing.mjs';
import { getJob, getJobDetailRows, buildLocation, getPreferredDayLabel, findLabel, accessCards, groundCards, congestionCards } from './catalog.mjs';
export const BRAND = Object.freeze({
  name: 'GreenVac Services',
  phone: '0408 362 590',
  tel: '+61408362590',
  email: 'james@greenvac.com.au',
  site: 'https://greenvac.com.au',
  logo: 'https://greenvac.com.au/images/estimate-logo.png',
  abn: '21 786 181 535'
});
export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
const money = value => new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
}).format(value);
const gst = value => Math.round(value * 110) / 100;
const row = (label, value) => value ? {
  label,
  value: String(value)
} : null;
function reviewMessage(ans, estimate) {
  if (!estimate.manualOnly) return estimate.needsReview ? 'Some details need checking. James will confirm them with you before quoting.' : '';
  if (ans.spoil === 'unsure') return 'James will help confirm whether excavated material should stay onsite or be removed before pricing your job.';
  if (ans.spoilVolume === 'more-than-1') return 'The material removal needs a closer look before James can price the job.';
  if (ans.jobType === 'other') return 'James will read your description and price the work personally.';
  if (ans.jobType === 'trenching' && Number(ans.metres) > 100) return 'James will check the longer trench route and site conditions before pricing it.';
  if (['potholing', 'service-exposure'].includes(ans.jobType) && (!Number.isInteger(Number(ans.exposureCount)) || Number(ans.exposureCount) > 10)) return 'James will confirm the number and location of the digging areas before pricing.';
  if (ans.jobType === 'tunnel-bore' && ans.boreDist !== 'short') return 'James will check the route beneath the obstacle before pricing it.';
  return 'James needs to check the scope, location and travel before giving you a price.';
}

// An explicit customer allow-list: never spread the calculation or raw answers into this object.
export function createCustomerSummary(ans, {
  reference = '',
  submitted = false
} = {}) {
  const estimate = calcEstimate(ans);
  const job = getJob(ans.jobType);
  const material = ans.spoil === 'leave' ? 'Excavated material left onsite' : ans.spoil === 'remove-all' ? 'Removal of excavated material requested' : 'Material handling to be confirmed';
  const selected = [row('Access', findLabel(accessCards, ans.access)), row('Ground', findLabel(groundCards, ans.ground)), row('Nearby services', findLabel(congestionCards, ans.congestion)), row('Excavated material', material)].filter(Boolean);
  const inclusions = estimate.manualOnly ? [] : ['Hydro excavation for the work described', 'Equipment setup and travel to your location', ans.spoil === 'remove-all' ? estimate.spoilRemoval.volumeAssumed ? 'Material removal allowance; amount to be confirmed' : 'Removal of the excavated material described' : 'Excavated material left at the job'];
  const reasons = [];
  if (ans.jobType === 'trenching') reasons.push('Based on the trench length, width and depth you selected.');else if (['potholing', 'service-exposure'].includes(ans.jobType)) reasons.push('Based on the number of digging areas and the depth you selected.');else reasons.push('Based on the type and size of work you described.');
  if (ans.access === 'side' || ans.access === 'difficult') reasons.push('Allows for working through restricted access.');
  if (ans.ground === 'hard') reasons.push('Allows for slower digging in the hard ground you selected.');
  if (ans.congestion === 'congested') reasons.push('Allows for careful excavation around nearby services.');
  return {
    reference,
    submitted,
    customerName: String(ans.name || '').trim(),
    location: buildLocation(ans),
    title: ans.subtype && ans.subtype !== 'Not Sure' ? ans.subtype : job?.label || 'Your job',
    manualOnly: estimate.manualOnly,
    price: estimate.manualOnly ? null : `${money(gst(estimate.low))} – ${money(gst(estimate.high))}`,
    exGst: estimate.manualOnly ? null : `${money(estimate.low)} – ${money(estimate.high)} excluding GST`,
    details: getJobDetailRows(ans).map(({
      label,
      value
    }) => ({
      label,
      value: String(value)
    })),
    selected,
    inclusions,
    reasons: estimate.manualOnly ? [] : reasons,
    review: reviewMessage(ans, estimate),
    timing: ans.preferredDay ? getPreferredDayLabel(ans) : '',
    status: submitted ? 'Request received — awaiting GreenVac review' : 'Your no-obligation estimate',
    terms: estimate.manualOnly ? 'No price has been given. GreenVac will confirm the scope, price and availability before a booking is made.' : 'This is an estimate, not a formal quote or confirmed booking. Changes to the work, access, ground or underground conditions may affect the price. GreenVac will confirm the scope, price and availability with you.'
  };
}
export function createJobCard(ans, options = {}) {
  const customer = createCustomerSummary(ans, options);
  const checks = [];
  if (customer.manualOnly) checks.push('No price shown to customer. Price this job personally.');
  if (customer.review) checks.push(customer.review);
  if (ans.access !== 'open') checks.push('Confirm parking and the access route.');
  if (ans.ground === 'hard' || ans.ground === 'unsure') checks.push('Confirm ground conditions.');
  if (ans.congestion !== 'clear') checks.push('Confirm underground-service information.');
  if (ans.spoil === 'remove-all' || ans.spoil === 'unsure') checks.push('Confirm material handling and removal requirements.');
  return {
    customer,
    contact: {
      name: String(ans.name || '').trim(),
      mobile: String(ans.mobile || '').trim(),
      email: String(ans.email || '').trim(),
      address: buildLocation(ans)
    },
    notes: [row('Job notes', ans.siteNotes), row('Access notes', ans.accessNotes), row('Timing notes', ans.timingNotes)].filter(Boolean),
    checks: [...new Set(checks)],
    photoCount: Number(options.photoCount || 0)
  };
}
const tableRows = rows => rows.map(({
  label,
  value
}) => `<tr><td style="padding:9px 10px 9px 0;border-bottom:1px solid #e6e9e4;color:#526053;width:34%;vertical-align:top">${escapeHtml(label)}</td><td style="padding:9px 0;border-bottom:1px solid #e6e9e4;color:#203328;font-weight:bold;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`).join('');
const h = text => `<h2 style="font-size:18px;margin:26px 0 10px;color:#154d34">${escapeHtml(text)}</h2>`;
const p = text => `<p style="margin:9px 0;line-height:1.6;overflow-wrap:anywhere">${escapeHtml(text)}</p>`;
function frame(title, body) {
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#f3f1e9;color:#24382b;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:20px 10px"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#fff;border:1px solid #dfe5dc"><tr><td style="padding:24px 28px;background:#155c3c"><img src="${BRAND.logo}" width="220" height="88" alt="GreenVac Services" style="display:block;width:220px;max-width:100%;height:auto"><p style="color:#fff;font-size:12px;margin:14px 0 0;letter-spacing:1px">COMPACT HYDRO EXCAVATION SPECIALIST</p></td></tr><tr><td style="padding:26px 28px;font-size:15px;line-height:1.5">${body}</td></tr><tr><td style="padding:22px 28px;background:#f0f4ed;font-size:12px;line-height:1.8;color:#244c36"><strong>Protecting people, services and project budgets.</strong><br><a href="tel:${BRAND.tel}" style="color:#155c3c">${BRAND.phone}</a> &nbsp;·&nbsp; <a href="mailto:${BRAND.email}" style="color:#155c3c">${BRAND.email}</a><br>GreenVac Services · ABN ${BRAND.abn}</td></tr></table></td></tr></table></body></html>`;
}
export function renderCustomerEmail(summary) {
  const m = summary;
  const price = m.manualOnly ? '<h1 style="font-size:30px;line-height:1.2;margin:10px 0">James will price this one personally</h1><p>No automatic estimate has been given.</p>' : `<p style="font-size:12px;letter-spacing:1px;margin:0">ESTIMATED TOTAL</p><h1 style="font-size:38px;line-height:1.15;margin:12px 0;color:#145637">${escapeHtml(m.price)}</h1><p style="margin:0"><strong>Including GST</strong></p><p style="font-size:12px;color:#526053;margin:7px 0 0">${escapeHtml(m.exGst)}</p>`;
  return frame(`Your GreenVac estimate — ${m.title}`, `<p style="font-size:12px;color:#526053;margin:0">${escapeHtml(m.status)}${m.reference ? ` · ${escapeHtml(m.reference)}` : ''}</p><h2 style="font-size:24px;margin:12px 0">${escapeHtml(m.title)}</h2>${m.customerName ? p(`Prepared for ${m.customerName}`) : ''}${p(m.location)}<div style="padding:22px;background:#eff5eb;margin:22px 0">${price}</div>${h('The job you described')}<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${tableRows(m.details)}</table>${h('Your selections')}<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${tableRows(m.selected)}</table>${m.inclusions.length ? h('What this covers') + m.inclusions.map(p).join('') + h('What shapes the price') + m.reasons.map(p).join('') : ''}${m.review ? `<div style="background:#fff7e5;padding:14px;margin:20px 0">${escapeHtml(m.review)}</div>` : ''}${h(m.submitted ? 'What happens next' : 'Ready for the next step?')}${p(m.submitted ? 'James will review your details and contact you to confirm the scope, price and availability. Nothing is booked yet.' : 'Send your details to James through the estimator so he can review the job. Nothing is booked yet.')}${m.timing ? p(`Requested timing: ${m.timing}`) : ''}<p><a href="tel:${BRAND.tel}" style="display:inline-block;background:#155c3c;color:white;padding:13px 20px;text-decoration:none;font-weight:bold">Call James</a></p><p style="font-size:12px;color:#526053;line-height:1.6;margin-top:25px">${escapeHtml(m.terms)}</p>`);
}
export function renderJobCardEmail(card) {
  const m = card.customer;
  const tel = card.contact.mobile.replace(/[^+\d]/g, '');
  return frame(`New job request — ${m.title}`, `<p style="font-size:12px;letter-spacing:1px;margin:0;color:#526053">NEW JOB REQUEST${m.reference ? ` · ${escapeHtml(m.reference)}` : ''}</p><h1 style="font-size:27px;margin:12px 0">${escapeHtml(card.contact.name)} · ${escapeHtml(m.title)}</h1><div style="padding:18px;background:#eff5eb;margin:20px 0"><strong>Estimate shown to customer</strong><p style="font-size:27px;font-weight:bold;margin:8px 0">${m.manualOnly ? 'No price shown' : escapeHtml(m.price)}</p>${m.manualOnly ? '' : '<p style="margin:0">Including GST</p>'}<p style="margin-bottom:0">Awaiting your review — not booked</p></div>${h('Contact & location')}<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${tableRows([row('Mobile', card.contact.mobile), row('Email', card.contact.email), row('Address', card.contact.address), row('Timing', m.timing)].filter(Boolean))}</table><p><a href="tel:${escapeHtml(tel)}" style="color:#155c3c;font-weight:bold">Call customer</a>${card.contact.email ? ` &nbsp;·&nbsp; <a href="mailto:${escapeHtml(card.contact.email)}" style="color:#155c3c;font-weight:bold">Reply to customer</a>` : ''}</p>${h('The work')}<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${tableRows(m.details)}</table>${h('Site details')}<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${tableRows(m.selected)}</table>${card.checks.length ? h('Check before confirming') + card.checks.map(p).join('') : ''}${card.notes.length ? h('Customer notes') + card.notes.map(n => p(`${n.label}: ${n.value}`)).join('') : ''}${h('Site photos')}${p(card.photoCount ? `${card.photoCount} photo${card.photoCount === 1 ? '' : 's'} attached to this email.` : 'No photos supplied.')}${p('The private job-record attachment contains the full answers and calculation record. Do not forward that attachment as the customer estimate.')}`);
}
export function customerText(m) {
  return [BRAND.name, m.status, m.reference, m.title, m.customerName, m.location, m.manualOnly ? 'No price has been given.' : `${m.price} including GST`, ...m.details.map(r => `${r.label}: ${r.value}`), ...m.selected.map(r => `${r.label}: ${r.value}`), ...m.inclusions, ...m.reasons, m.review, m.terms, `Contact James: ${BRAND.phone} | ${BRAND.email}`].filter(Boolean).join('\n');
}
export function jobCardText(c) {
  return ['NEW JOB REQUEST — GREENVAC', c.customer.reference, `${c.contact.name} | ${c.customer.title}`, c.customer.manualOnly ? 'No price shown' : `Estimate shown: ${c.customer.price} including GST`, 'Awaiting review — not booked', c.contact.mobile, c.contact.email, c.contact.address, c.customer.timing, ...c.customer.details.map(r => `${r.label}: ${r.value}`), ...c.customer.selected.map(r => `${r.label}: ${r.value}`), ...c.checks, ...c.notes.map(r => `${r.label}: ${r.value}`), `Photos: ${c.photoCount}`].filter(Boolean).join('\n');
}
