import { createHash } from 'node:crypto';
import { calcEstimate } from './pricing.mjs';
import { jobTypes, subtypes, depthCards, widthCards, accessCards, groundCards, congestionCards, spoilCards, urgencyCards, exposureDepthCards, leakAreaCards, pitSizeCards, pitFillCards, obstacleDistanceCards } from './catalog.mjs';
import { BRAND, createCustomerSummary, createJobCard, renderCustomerEmail, renderJobCardEmail, customerText, jobCardText } from './presentation.mjs';
const MAX_BYTES = 2700000;
class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const digest = value => createHash('sha256').update(value).digest('hex');
const oneLine = value => String(value).replace(/[\r\n\u0000-\u001f]/g, ' ').trim();
export function validateSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('Invalid request.');
  if (body.website) throw new RequestError('Please contact GreenVac directly.');
  if (!/^[a-zA-Z0-9_-]{12,120}$/.test(body.requestId || '')) throw new RequestError('Please refresh the estimate and try again.');
  const raw = body.answers;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.acceptedTerms !== true) throw new RequestError('Please confirm that this is an estimate, not a booking.');
  const ans = {
    acceptedTerms: true
  };
  for (const [key, max] of Object.entries({
    suburb: 120,
    postcode: 10,
    name: 160,
    mobile: 30,
    email: 254,
    address: 250,
    siteNotes: 1500,
    accessNotes: 1500,
    timingNotes: 500,
    otherDescription: 2000
  })) {
    if (raw[key] !== undefined && (typeof raw[key] !== 'string' || raw[key].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(raw[key]))) throw new RequestError(`Please check ${key}.`);
    ans[key] = String(raw[key] || '').trim();
  }
  if (!ans.name || !ans.suburb || !/^[+()\d .-]{6,30}$/.test(ans.mobile) || ans.mobile.replace(/\D/g, '').length < 6) throw new RequestError('Please check your name, mobile and job suburb.');
  if (ans.email && (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(ans.email) || /[\r\n]/.test(ans.email))) throw new RequestError('Please check your email address.');
  function choose(key, cards, required = true) {
    if (raw[key] === undefined || raw[key] === null || raw[key] === '') {
      if (required) throw new RequestError(`Please complete ${key}.`);
      return;
    }
    if (!cards.some(c => c.id === raw[key] && !c.hidden)) throw new RequestError(`Please check ${key}.`);
    ans[key] = raw[key];
  }
  choose('jobType', jobTypes);
  choose('access', accessCards);
  choose('ground', groundCards);
  choose('congestion', congestionCards);
  choose('spoil', spoilCards);
  choose('preferredDay', urgencyCards);
  if (!subtypes[ans.jobType]?.includes(raw.subtype)) throw new RequestError('Please select a job type.');
  ans.subtype = raw.subtype;
  if (ans.jobType === 'trenching') {
    if (typeof raw.metres !== 'number' || !Number.isFinite(raw.metres) || raw.metres <= 0 || raw.metres > 10000) throw new RequestError('Please check the trench length.');
    ans.metres = raw.metres;
    choose('depth', depthCards);
    choose('width', widthCards);
  }
  if (['potholing', 'service-exposure'].includes(ans.jobType)) {
    const n = Number(raw.exposureCount);
    if (!['more-than-10', 'unsure'].includes(raw.exposureCount) && (!Number.isInteger(n) || n < 1 || n > 1000)) throw new RequestError('Please check the number of digging areas.');
    ans.exposureCount = raw.exposureCount;
    choose('exposureDepth', exposureDepthCards);
  }
  if (ans.jobType === 'leak-exposure') choose('leakArea', leakAreaCards);
  if (ans.jobType === 'pit-cleanout') {
    choose('pitSize', pitSizeCards);
    choose('pitFill', pitFillCards);
  }
  if (ans.jobType === 'tunnel-bore') choose('boreDist', obstacleDistanceCards);
  if (ans.jobType === 'other' && !ans.otherDescription) throw new RequestError('Please describe the work.');
  if (ans.spoil === 'remove-all' && ans.jobType !== 'trenching') {
    if (!['small', 'medium', 'large', 'full-load', 'more-than-1', 'unsure'].includes(raw.spoilVolume)) throw new RequestError('Please select the material amount.');
    ans.spoilVolume = raw.spoilVolume;
  }
  const photos = body.photos || [];
  if (!Array.isArray(photos) || photos.length > 5) throw new RequestError('Please select no more than five photos.');
  let bytes = 0;
  const attachments = photos.map((photo, i) => {
    if (!photo || photo.contentType !== 'image/jpeg' || typeof photo.content !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(photo.content) || photo.content.length > 480000) throw new RequestError('Please use a smaller JPG photo.');
    const data = Buffer.from(photo.content, 'base64');
    bytes += data.length;
    if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8 || data[2] !== 0xff) throw new RequestError('A site photo could not be read.');
    return {
      filename: `site-photo-${i + 1}.jpg`,
      content: data.toString('base64'),
      content_type: 'image/jpeg'
    };
  });
  if (bytes > 1800000) throw new RequestError('The photos are too large to send together.');
  return {
    answers: ans,
    photos: attachments,
    requestId: body.requestId
  };
}
export async function enforceRateLimit(ip, {
  env,
  fetchImpl
}) {
  const key = `greenvac:estimate:${digest(`${env.ESTIMATOR_RATE_LIMIT_SALT}:${ip}`).slice(0, 32)}`;
  const script = "local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]);end;return n";
  const base = env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
  const response = await fetchImpl(`${base}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([['EVAL', script, 1, key, 900], ['EVAL', script, 1, 'greenvac:estimate:global', 3600]]),
    signal: AbortSignal.timeout(6000)
  });
  const results = await response.json();
  if (!response.ok || !Array.isArray(results) || results.length !== 2 || results.some(x => x.error || !Number.isInteger(x.result))) throw new RequestError('Sending is temporarily unavailable. Please contact James directly.', 503);
  if (results[0].result > 5 || results[1].result > 100) throw new RequestError('Too many requests. Please wait a little or call James directly.', 429);
}
async function sendMail(payload, key, {
  env,
  fetchImpl
}) {
  const r = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });
  let data;
  try {
    data = await r.json();
  } catch {
    data = null;
  }
  if (!r.ok || !data?.id) throw new RequestError('Could not send your request. Please try again or contact James directly.', 502);
  return data.id;
}
export async function deliverEstimate(body, {
  env = process.env,
  fetchImpl = fetch,
  ip,
  origin,
  rateLimit = enforceRateLimit
} = {}) {
  const required = ['RESEND_API_KEY', 'ESTIMATOR_FROM', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'ESTIMATOR_RATE_LIMIT_SALT'];
  if (env.ESTIMATOR_EMAILS_ENABLED !== 'true' || required.some(k => !env[k])) throw new RequestError('Online sending is not ready yet. Please call James or use the email option below.', 503);
  const origins = (env.ESTIMATOR_ALLOWED_ORIGINS || 'https://greenvac.com.au,https://www.greenvac.com.au').split(',').map(x => x.trim());
  if (!origin || !origins.includes(origin)) throw new RequestError('Please send your request from the GreenVac website.', 403);
  if (!ip) throw new RequestError('Could not verify this request. Please contact James directly.', 403);
  const parsed = validateSubmission(body);
  await rateLimit(ip, {
    env,
    fetchImpl
  });
  const fingerprint = digest(JSON.stringify(parsed));
  const reference = `GV-${fingerprint.slice(0, 10).toUpperCase()}`;
  const m = createCustomerSummary(parsed.answers, {
    reference,
    submitted: true
  });
  const c = createJobCard(parsed.answers, {
    reference,
    submitted: true,
    photoCount: parsed.photos.length
  });
  const record = {
    schema: 'greenvac-private-job-record-v1',
    reference,
    answers: parsed.answers,
    calculation: calcEstimate(parsed.answers),
    photos: parsed.photos.map(x => x.filename)
  };
  const internalAttachment = {
    filename: 'GreenVac-private-job-record.json',
    content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64'),
    content_type: 'application/json'
  };
  const from = env.ESTIMATOR_FROM;
  if (/[\r\n]/.test(from)) throw new RequestError('Sending is not configured correctly.', 503);
  await sendMail({
    from,
    to: [BRAND.email],
    ...(parsed.answers.email ? {
      reply_to: parsed.answers.email
    } : {}),
    subject: oneLine(`New job request | ${m.title} | ${parsed.answers.suburb} | ${parsed.answers.name}`),
    html: renderJobCardEmail(c),
    text: jobCardText(c),
    attachments: [...parsed.photos, internalAttachment]
  }, `gv-admin/${fingerprint}`, {
    env,
    fetchImpl
  });
  let emailCopy = 'not_requested';
  if (parsed.answers.email) {
    try {
      await sendMail({
        from,
        to: [parsed.answers.email],
        reply_to: BRAND.email,
        subject: oneLine(`Your GreenVac estimate | ${m.title} | ${reference}`),
        html: renderCustomerEmail(m),
        text: customerText(m)
      }, `gv-customer/${fingerprint}`, {
        env,
        fetchImpl
      });
      emailCopy = 'accepted';
    } catch {
      emailCopy = 'failed';
    }
  }
  // Provider acceptance, not proof of inbox delivery. No calculation fields returned.
  return {
    success: true,
    reference,
    emailCopy,
    photoCount: parsed.photos.length
  };
}
export async function handleEstimate(req, res, deps = {}) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      message: 'Use POST.'
    });
  }
  try {
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new RequestError('Use JSON.', 415);
    if (Number(req.headers['content-length'] || 0) > MAX_BYTES) throw new RequestError('The request is too large.', 413);
    let body = req.body;
    if (typeof body === 'string') {
      if (Buffer.byteLength(body) > MAX_BYTES) throw new RequestError('The request is too large.', 413);
      body = JSON.parse(body);
    }
    if (Buffer.byteLength(JSON.stringify(body || {})) > MAX_BYTES) throw new RequestError('The request is too large.', 413);
    const result = await deliverEstimate(body, {
      ...deps,
      ip: String(req.headers['x-real-ip'] || '').trim(),
      origin: req.headers.origin
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 503;
    if (status === 429) res.setHeader('Retry-After', '900');
    return res.status(status).json({
      success: false,
      message: error instanceof RequestError ? error.message : 'Sending is temporarily unavailable. Please contact James directly.'
    });
  }
}
