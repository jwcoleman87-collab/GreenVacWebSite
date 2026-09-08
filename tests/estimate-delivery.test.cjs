const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {
  pricingCases
} = require('./pricing-cases.cjs');
const base = {
  jobType: 'trenching',
  subtype: 'Electrical Trench',
  metres: 9,
  depth: '300mm',
  width: 'standard',
  access: 'open',
  ground: 'normal',
  congestion: 'clear',
  spoil: 'remove-all',
  suburb: 'Canberra',
  name: 'Sample Customer',
  mobile: '0400000000',
  email: 'customer@example.test',
  preferredDay: 'this-week',
  acceptedTerms: true
};
const body = (patch = {}) => ({
  requestId: 'estimator-test-1234567890',
  answers: {
    ...base,
    ...patch
  },
  photos: []
});
const env = {
  ESTIMATOR_EMAILS_ENABLED: 'true',
  RESEND_API_KEY: 'test-only',
  ESTIMATOR_FROM: 'GreenVac <estimates@example.test>',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
  UPSTASH_REDIS_REST_TOKEN: 'test-only',
  ESTIMATOR_RATE_LIMIT_SALT: 'test-only',
  ESTIMATOR_ALLOWED_ORIGINS: 'https://greenvac.com.au'
};
const modules = () => import('../lib/estimates/delivery.mjs');
const presentation = () => import('../lib/estimates/presentation.mjs');
const opts = fetchImpl => ({
  env,
  fetchImpl,
  rateLimit: async () => {},
  ip: '192.0.2.1',
  origin: 'https://greenvac.com.au'
});
const ack = {
  ok: true,
  json: async () => ({
    id: 'provider-accepted-test'
  })
};
const forbidden = ['ratePerM3', 'volumeM3', 'spoilRemoval', 'assumptionNote', 'RANGE_BUFFER', '$85', 'm³', 'analytics_event_id'];
test('all 15,552 calculation outputs exactly match the original main commit', async () => {
  const {
    calcEstimate
  } = await import('../lib/estimates/pricing.mjs');
  const expected = JSON.parse(fs.readFileSync(new URL('./fixtures/pricing-baseline.json', `file://${__filename}`), 'utf8'));
  const cases = pricingCases();
  assert.equal(cases.length, expected.cases);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(cases.map(calcEstimate))).digest('hex'), expected.sha256);
});
test('website and email share a customer-only summary with the unchanged GST-inclusive total', async () => {
  const {
    createCustomerSummary,
    renderCustomerEmail,
    customerText
  } = await presentation();
  const m = createCustomerSummary(base);
  assert.equal(m.price, '$748 – $825');
  assert.equal(m.exGst, '$680 – $750 excluding GST');
  assert.ok(m.details.some(r => r.value === '9 m'));
  for (const f of forbidden) assert.equal((JSON.stringify(m) + renderCustomerEmail(m) + customerText(m)).includes(f), false, f);
});
test('manual-pricing jobs contain no dollar amount and promise no inclusions', async () => {
  const {
    createCustomerSummary,
    renderCustomerEmail,
    customerText
  } = await presentation();
  for (const patch of [{
    suburb: 'Goulburn'
  }, {
    spoil: 'unsure'
  }, {
    jobType: 'other',
    subtype: 'Something Unusual',
    otherDescription: 'Inspect job'
  }, {
    jobType: 'leak-exposure',
    subtype: 'Water Leak',
    leakArea: 'localised',
    spoilVolume: 'more-than-1'
  }]) {
    const m = createCustomerSummary({
      ...base,
      ...patch
    });
    assert.equal(m.price, null);
    assert.equal(m.exGst, null);
    assert.equal(m.inclusions.length, 0);
    assert.doesNotMatch(renderCustomerEmail(m) + customerText(m), /\$\d|m³|cubic metre/);
  }
});
test('price reasons are selected from actual answers, not invented boilerplate', async () => {
  const {
    createCustomerSummary
  } = await presentation();
  const m = createCustomerSummary({
    ...base,
    access: 'difficult',
    ground: 'hard',
    congestion: 'congested'
  });
  assert.match(m.reasons.join(' '), /restricted access/);
  assert.match(m.reasons.join(' '), /hard ground/);
  assert.match(m.reasons.join(' '), /nearby services/);
  const simple = createCustomerSummary(base);
  assert.doesNotMatch(simple.reasons.join(' '), /restricted|hard ground|nearby services/);
});
test('uncertain removal stays an allowance rather than a false fixed inclusion', async () => {
  const {
    createCustomerSummary
  } = await presentation();
  const m = createCustomerSummary({
    ...base,
    width: 'custom'
  });
  assert.ok(m.inclusions.includes('Material removal allowance; amount to be confirmed'));
});
test('customer and internal HTML escape hostile names, descriptions and notes', async () => {
  const {
    createCustomerSummary,
    createJobCard,
    renderCustomerEmail,
    renderJobCardEmail
  } = await presentation();
  const ans = {
    ...base,
    name: '<img src=x onerror=alert(1)>',
    accessNotes: '<script>bad()</script>',
    jobType: 'other',
    subtype: 'Something Unusual',
    otherDescription: '<iframe src=x></iframe>'
  };
  const html = renderCustomerEmail(createCustomerSummary(ans)) + renderJobCardEmail(createJobCard(ans));
  assert.doesNotMatch(html, /<script>|<iframe|<img src=x/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;script/);
});
test('server ignores forged totals, HTML, recipients and dormant job fields', async () => {
  const {
    validateSubmission,
    deliverEstimate
  } = await modules();
  const input = body();
  input.to = 'attacker@example.test';
  input.html = '<h1>forged</h1>';
  input.answers.estimate_low = 1;
  input.answers.exposureCount = 99;
  const parsed = validateSubmission(input);
  assert.equal(parsed.answers.estimate_low, undefined);
  assert.equal(parsed.answers.exposureCount, undefined);
  const sent = [];
  await deliverEstimate(input, opts(async (url, o) => {
    sent.push(JSON.parse(o.body));
    return ack;
  }));
  assert.deepEqual(sent[0].to, ['james@greenvac.com.au']);
  assert.deepEqual(sent[1].to, ['customer@example.test']);
  assert.match(sent[1].html, /\$748/);
  assert.doesNotMatch(sent[1].html, /forged/);
});
test('private calculations and site photos are attached only to the internal email', async () => {
  const {
    deliverEstimate
  } = await modules();
  const input = body();
  input.photos = [{
    filename: 'ignore-user-name.exe',
    contentType: 'image/jpeg',
    content: Buffer.from([255, 216, 255, 224, 0, 1, 255, 217]).toString('base64')
  }];
  const sent = [];
  await deliverEstimate(input, opts(async (u, o) => {
    sent.push(JSON.parse(o.body));
    return ack;
  }));
  assert.equal(sent[0].attachments.length, 2);
  assert.equal(sent[0].attachments[0].filename, 'site-photo-1.jpg');
  assert.match(sent[0].html, /1 photo attached/);
  assert.equal(sent[1].attachments, undefined);
  for (const f of forbidden) assert.equal(sent[1].html.includes(f), false, f);
  const record = JSON.parse(Buffer.from(sent[0].attachments[1].content, 'base64'));
  assert.equal(record.calculation.low, 680);
  assert.equal(record.answers.metres, 9);
});
test('missing optional email still delivers the lead without pretending a customer copy was sent', async () => {
  const {
    deliverEstimate
  } = await modules();
  let calls = 0;
  const r = await deliverEstimate(body({
    email: ''
  }), opts(async () => {
    calls++;
    return ack;
  }));
  assert.equal(calls, 1);
  assert.equal(r.emailCopy, 'not_requested');
  assert.equal(r.success, true);
});
test('failed customer copy never loses the already accepted lead or invites duplicate submission', async () => {
  const {
    deliverEstimate
  } = await modules();
  let calls = 0;
  const r = await deliverEstimate(body(), opts(async () => {
    calls++;
    if (calls === 2) throw Error('provider down');
    return ack;
  }));
  assert.equal(r.success, true);
  assert.equal(r.emailCopy, 'failed');
  assert.equal(calls, 2);
});
test('provider failures, invalid JSON and 200 responses without an ID cannot produce success', async () => {
  const {
    deliverEstimate
  } = await modules();
  for (const r of [{
    ok: false,
    json: async () => ({
      message: 'failure'
    })
  }, {
    ok: true,
    json: async () => ({})
  }, {
    ok: true,
    json: async () => {
      throw Error('invalid JSON');
    }
  }]) await assert.rejects(deliverEstimate(body(), opts(async () => r)), /Could not send/);
});
test('retries use deterministic, separate provider idempotency keys and identical payloads', async () => {
  const {
    deliverEstimate
  } = await modules();
  const sent = [];
  const o = opts(async (u, x) => {
    sent.push(x);
    return ack;
  });
  await deliverEstimate(body(), o);
  await deliverEstimate(body(), o);
  assert.equal(sent[0].headers['Idempotency-Key'], sent[2].headers['Idempotency-Key']);
  assert.equal(sent[1].headers['Idempotency-Key'], sent[3].headers['Idempotency-Key']);
  assert.notEqual(sent[0].headers['Idempotency-Key'], sent[1].headers['Idempotency-Key']);
  assert.equal(sent[0].body, sent[2].body);
  assert.equal(sent[1].body, sent[3].body);
});
test('changed answers create a new receipt and never reuse an old email payload', async () => {
  const {
    deliverEstimate
  } = await modules();
  const first = await deliverEstimate(body(), opts(async () => ack));
  const second = await deliverEstimate(body({
    metres: 20
  }), opts(async () => ack));
  assert.notEqual(first.reference, second.reference);
});
test('mail stays disabled without the verified sender and distributed anti-abuse configuration', async () => {
  const {
    deliverEstimate
  } = await modules();
  let calls = 0;
  const d = opts(async () => {
    calls++;
    return ack;
  });
  for (const key of ['ESTIMATOR_EMAILS_ENABLED', 'RESEND_API_KEY', 'ESTIMATOR_FROM', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'ESTIMATOR_RATE_LIMIT_SALT']) await assert.rejects(deliverEstimate(body(), {
    ...d,
    env: {
      ...env,
      [key]: ''
    }
  }), /not ready/);
  assert.equal(calls, 0);
});
test('unapproved origins, no platform IP and honeypots are rejected before sending', async () => {
  const {
    deliverEstimate
  } = await modules();
  let calls = 0;
  const d = opts(async () => {
    calls++;
    return ack;
  });
  await assert.rejects(deliverEstimate(body(), {
    ...d,
    origin: 'https://evil.example'
  }));
  await assert.rejects(deliverEstimate(body(), {
    ...d,
    ip: ''
  }));
  await assert.rejects(deliverEstimate({
    ...body(),
    website: 'spam'
  }, d));
  assert.equal(calls, 0);
});
test('validation rejects invalid enum values, missing consent, malformed email and unsafe files', async () => {
  const {
    validateSubmission
  } = await modules();
  for (const patch of [{
    acceptedTerms: false
  }, {
    jobType: 'unknown'
  }, {
    metres: -1
  }, {
    metres: Infinity
  }, {
    width: 'bogus'
  }, {
    access: 'invalid'
  }, {
    email: 'x@example.com\r\nBcc: thief@example.com'
  }, {
    name: ''
  }, {
    name: 'a'.repeat(161)
  }]) assert.throws(() => validateSubmission(body(patch)));
  assert.throws(() => validateSubmission({
    ...body(),
    photos: [{
      contentType: 'image/svg+xml',
      content: 'PHN2Zz4='
    }]
  }));
  assert.throws(() => validateSubmission({
    ...body(),
    photos: Array(6).fill({})
  }));
});
test('distributed limiter fails closed and applies both IP and global limits', async () => {
  const {
    enforceRateLimit
  } = await modules();
  for (const response of [{
    ok: true,
    json: async () => [{
      result: 6
    }, {
      result: 1
    }]
  }, {
    ok: true,
    json: async () => [{
      result: 1
    }, {
      result: 101
    }]
  }, {
    ok: false,
    json: async () => []
  }, {
    ok: true,
    json: async () => [{
      error: 'bad'
    }, {
      result: 1
    }]
  }]) await assert.rejects(enforceRateLimit('192.0.2.1', {
    env,
    fetchImpl: async () => response
  }));
  let payload;
  await enforceRateLimit('192.0.2.1', {
    env,
    fetchImpl: async (u, o) => {
      payload = o.body;
      return {
        ok: true,
        json: async () => [{
          result: 1
        }, {
          result: 1
        }]
      };
    }
  });
  assert.equal(payload.includes('192.0.2.1'), false);
  assert.match(payload, /EVAL/);
});
test('HTTP handler refuses unsupported methods, oversize bodies and bad content types', async () => {
  const {
    handleEstimate
  } = await modules();
  for (const [req, expected] of [[{
    method: 'GET',
    headers: {}
  }, 405], [{
    method: 'POST',
    headers: {
      'content-type': 'text/plain'
    }
  }, 415], [{
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': '9999999'
    }
  }, 413]]) {
    const res = {
      code: null,
      setHeader() {},
      status(c) {
        this.code = c;
        return this;
      },
      json(v) {
        this.value = v;
        return this;
      }
    };
    await handleEstimate(req, res);
    assert.equal(res.code, expected);
    assert.equal(res.value.success, false);
  }
});
test('the browser submission allow-list excludes HTML, prices, private calculation fields and unrelated state', async () => {
  const {
    buildSubmission
  } = await import('../get-a-quote-src/src/estimate-delivery.js');
  const r = buildSubmission({
    ...base,
    estimate_low: 1,
    calculation: {
      secret: 'private'
    },
    html: 'forged',
    estimateReceipt: {
      foo: 1
    }
  }, 'estimator-test-1234567890', []);
  assert.equal(r.answers.estimate_low, undefined);
  assert.equal(r.answers.calculation, undefined);
  assert.equal(r.answers.html, undefined);
  assert.equal(r.answers.estimateReceipt, undefined);
});
