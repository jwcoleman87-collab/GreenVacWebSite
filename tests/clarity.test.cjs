const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const claritySource = fs.readFileSync(path.join(root, "js", "clarity.js"), "utf8");

const CLARITY_TAG = "https://www.clarity.ms/tag/xmk1qbiqul";
const CLARITY_SCRIPT = "/js/clarity.js?v=xmk1qbiqul-prod-20260731";

const CHROME_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const ELECTRON_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) GreenVacDesktop/1.0.0 Chrome/126.0.0.0 Electron/31.2.0 Safari/537.36";

// The pages a human edits. activeHtmlFiles() deliberately walks generated
// output only, so these must be checked explicitly or a second, unguarded
// loader could be added to the real source and never be seen.
const SOURCE_PAGES = ["partials/header.html", "get-a-quote-src/index.html", "404.html"];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function activeHtmlFiles(directory = root) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".vercel", "cold-email", "get-a-quote-src", "node_modules", "partials"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...activeHtmlFiles(fullPath));
    if (entry.isFile() && entry.name.endsWith(".html")) found.push(fullPath);
  }
  return found;
}

// Models just enough of a document that the Clarity loader can install itself,
// and records every side effect that would reach the network: a created script
// element, its src, and the element actually inserted into the page.
function createHarness({
  hostname = "www.greenvac.com.au",
  protocol = "https:",
  userAgent = CHROME_AGENT,
  webdriver = false,
  runs = 1,
  seed = {},
} = {}) {
  const created = [];
  const inserted = [];
  const anchorScript = {
    parentNode: {
      insertBefore: (node) => {
        inserted.push(node);
      },
    },
  };
  const document = {
    createElement: (tagName) => {
      const element = { tagName };
      created.push(element);
      return element;
    },
    getElementsByTagName: () => [anchorScript],
  };
  const window = {
    document,
    location: { hostname, protocol },
    navigator: { userAgent, webdriver },
    ...seed,
  };

  const context = vm.createContext({ Object, document, window });
  for (let run = 0; run < runs; run += 1) vm.runInContext(claritySource, context);

  return {
    window,
    created,
    inserted,
    // Every URL this page would fetch as a result of loading the file.
    requests: inserted.map((node) => node.src).filter(Boolean),
  };
}

function assertBlocked(harness, label) {
  assert.equal(harness.requests.length, 0, `${label}: no network request`);
  assert.equal(harness.created.length, 0, `${label}: no script element created`);
  assert.equal(harness.inserted.length, 0, `${label}: nothing inserted into the page`);
  assert.equal(harness.window.clarity, undefined, `${label}: no clarity queue`);
  assert.equal(harness.window.GreenVacClarity.enabled, false, `${label}: reports disabled`);
}

function assertAllowed(harness, label) {
  assert.deepEqual(harness.requests, [CLARITY_TAG], `${label}: tag request`);
  assert.equal(harness.inserted.length, 1, `${label}: one script inserted`);
  assert.equal(harness.inserted[0].async, true, `${label}: loads asynchronously`);
  assert.equal(harness.window.GreenVacClarity.enabled, true, `${label}: reports enabled`);
  assert.equal(harness.window.GreenVacClarity.projectId, "xmk1qbiqul", `${label}: project id`);

  // The stock loader's only job before the remote tag arrives is to buffer
  // calls, so that behaviour is part of "unchanged on production".
  assert.equal(typeof harness.window.clarity, "function", `${label}: queue installed`);
  harness.window.clarity("set", "greenvac_test", 1);
  assert.deepEqual(
    [...harness.window.clarity.q[0]],
    ["set", "greenvac_test", 1],
    `${label}: queue buffers calls made before the tag loads`,
  );
}

test("Clarity loads on greenvac.com.au", () => {
  assertAllowed(createHarness({ hostname: "greenvac.com.au" }), "greenvac.com.au");
});

test("Clarity loads on www.greenvac.com.au", () => {
  assertAllowed(createHarness({ hostname: "www.greenvac.com.au" }), "www.greenvac.com.au");
});

test("the production hostnames survive normalisation differences", () => {
  // Browsers report a lowercase hostname, and keep the DNS root dot on a fully
  // qualified name. Both are the production site.
  assertAllowed(createHarness({ hostname: "WWW.GreenVac.com.au" }), "mixed case");
  assertAllowed(createHarness({ hostname: "www.greenvac.com.au." }), "trailing dot");
  assertAllowed(createHarness({ hostname: "greenvac.com.au." }), "apex with trailing dot");
});

test("Clarity is blocked on localhost and loopback addresses", () => {
  for (const hostname of ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "localhost.localdomain"]) {
    assertBlocked(createHarness({ hostname, protocol: "http:" }), hostname);
    assertBlocked(createHarness({ hostname }), `${hostname} over https`);
  }
});

test("a local server reached through the production name over http is still blocked", () => {
  // The hosts-file route: 127.0.0.1 greenvac.com.au, served at http://greenvac.com.au:8000/.
  for (const hostname of ["greenvac.com.au", "www.greenvac.com.au"]) {
    assertBlocked(createHarness({ hostname, protocol: "http:" }), `http://${hostname}`);
  }
  assertBlocked(createHarness({ hostname: "greenvac.com.au", protocol: "file:" }), "file://");
});

test("Clarity is blocked on every vercel.app deployment, including previews", () => {
  for (const hostname of [
    "greenvac.vercel.app",
    "greenvac-git-main-jwcoleman87-collab.vercel.app",
    "greenvac-abc123def-jwcoleman87-collab.vercel.app",
    "greenvac-website.vercel.app",
  ]) {
    assertBlocked(createHarness({ hostname }), hostname);
  }
});

test("Clarity is blocked in Electron even on a production hostname", () => {
  assertBlocked(createHarness({ hostname: "greenvac.com.au", userAgent: ELECTRON_AGENT }), "Electron user agent");
  assertBlocked(
    createHarness({
      hostname: "www.greenvac.com.au",
      seed: { process: { versions: { electron: "31.2.0", node: "20.15.0" } } },
    }),
    "Electron runtime",
  );
});

test("Clarity is blocked for automated browsers even on a production hostname", () => {
  assertBlocked(createHarness({ hostname: "greenvac.com.au", webdriver: true }), "navigator.webdriver");
  assertBlocked(createHarness({ hostname: "www.greenvac.com.au", seed: { Cypress: {} } }), "Cypress");
});

test("Clarity is blocked on unknown, lookalike and neighbouring hostnames", () => {
  for (const hostname of [
    "",
    "greenvac.com",
    "greenvac.com.au.attacker.example",
    "blog.greenvac.com.au",
    "staging.greenvac.com.au",
    "greenvac.netlify.app",
    "192.168.1.14",
    "example.com",
  ]) {
    assertBlocked(createHarness({ hostname }), hostname || "(empty hostname)");
  }
});

test("a missing location or navigator blocks rather than throws", () => {
  const context = vm.createContext({ Object, document: {}, window: { document: {} } });
  vm.runInContext(claritySource, context);
  assert.equal(context.window.GreenVacClarity.enabled, false);
  assert.equal(context.window.clarity, undefined);
});

test("loading the file twice installs Clarity exactly once", () => {
  const harness = createHarness({ hostname: "www.greenvac.com.au", runs: 3 });

  assert.equal(harness.inserted.length, 1);
  assert.equal(harness.created.length, 1);
  assert.deepEqual(harness.requests, [CLARITY_TAG]);
  // The repeat runs must leave the first decision intact rather than recompute
  // it, so the reported state still matches what was actually installed.
  assert.equal(harness.window.GreenVacClarity.enabled, true);
  assert.equal(typeof harness.window.clarity, "function");
});

test("the single-installation guard is what prevents the second install", () => {
  // Mutation check: without the window.GreenVacClarity early return, three runs
  // would insert three tags. Proven by running the file with that line removed.
  const withoutGuard = claritySource.replace("if (window.GreenVacClarity) return;", "");
  assert.notEqual(withoutGuard, claritySource, "the guard line must exist to be removed");

  const inserted = [];
  const document = {
    createElement: (tagName) => ({ tagName }),
    getElementsByTagName: () => [{ parentNode: { insertBefore: (node) => inserted.push(node) } }],
  };
  const window = {
    document,
    location: { hostname: "www.greenvac.com.au", protocol: "https:" },
    navigator: { userAgent: CHROME_AGENT, webdriver: false },
  };
  const context = vm.createContext({ Object, document, window });
  for (let run = 0; run < 3; run += 1) vm.runInContext(withoutGuard, context);

  assert.equal(inserted.length, 3, "the guard, not anything else, caps installation at one");
});

test("every page reaches Clarity only through the one guarded file", () => {
  const generated = activeHtmlFiles().map((file) => path.relative(root, file));
  assert.ok(generated.length > 20);

  // Generated output AND the hand-edited sources it is built from.
  const pages = [...new Set([...generated, ...SOURCE_PAGES])];
  let checked = 0;

  for (const relative of pages) {
    const html = read(relative);
    assert.equal((html.match(/\/js\/clarity\.js/g) || []).length, 1, `one Clarity entry point in ${relative}`);
    assert.equal(/clarity\.ms/i.test(html), false, `no direct clarity.ms reference in ${relative}`);
    assert.equal(/\bclarity\s*\(/.test(html), false, `no inline clarity() call in ${relative}`);
    assert.ok(html.includes(CLARITY_SCRIPT), `current Clarity cache buster in ${relative}`);
    checked += 1;
  }

  // A page that quietly lost its Clarity tag must fail, not be skipped.
  assert.equal(checked, pages.length);
  for (const relative of SOURCE_PAGES) assert.ok(pages.includes(relative), relative);
});

test("no Clarity network request occurs when the site is served locally", async () => {
  // Serves the repository over real HTTP, walks every page's real script graph
  // as delivered, and executes the delivered Clarity asset against a localhost
  // window. Nothing here is read from the source tree by path.
  const server = http.createServer((request, response) => {
    const filePath = path.join(root, decodeURIComponent(request.url.split("?")[0]));
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200).end(fs.readFileSync(filePath));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  try {
    const pages = activeHtmlFiles().map((file) => "/" + path.relative(root, file).split(path.sep).join("/"));
    assert.ok(pages.length > 20);

    const seenScripts = new Set();
    for (const page of pages) {
      const html = await (await fetch(origin + page)).text();
      assert.equal(/clarity\.ms/i.test(html), false, `${page} markup requests no tag directly`);

      for (const match of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi)) {
        const src = match[1];
        if (!src.startsWith("/")) continue; // third-party tags are not Clarity
        seenScripts.add(src);
      }
    }

    assert.ok(seenScripts.has(CLARITY_SCRIPT), "the served pages request the guarded Clarity file");

    for (const src of seenScripts) {
      const body = await (await fetch(origin + src)).text();
      if (!/clarity\.ms/i.test(body)) continue;
      // Only the guarded loader may even name the endpoint, and running the
      // delivered bytes on a local host must request nothing.
      assert.equal(src, CLARITY_SCRIPT, `${src} must not contain a Clarity endpoint`);

      for (const hostname of ["localhost", "127.0.0.1"]) {
        const requests = [];
        const document = {
          createElement: (tagName) => ({ tagName }),
          getElementsByTagName: () => [{ parentNode: { insertBefore: (node) => requests.push(node.src) } }],
        };
        const window = {
          document,
          location: { hostname, protocol: "http:" },
          navigator: { userAgent: CHROME_AGENT, webdriver: false },
        };
        vm.runInContext(body, vm.createContext({ Object, document, window }));

        assert.deepEqual(requests, [], `${src} issues no request on ${hostname}`);
        assert.equal(window.clarity, undefined, `${src} creates no queue on ${hostname}`);
        assert.equal(window.GreenVacClarity.enabled, false, `${src} reports disabled on ${hostname}`);
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("the guard decides on the live hostname, not on a build-time flag", () => {
  assert.match(claritySource, /window\.location[\s\S]{0,120}hostname/);
  assert.equal(/NODE_ENV|import\.meta\.env|process\.env/.test(claritySource), false);

  // The project id is unchanged and is the only source of the tag URL.
  assert.match(claritySource, /PROJECT_ID = "xmk1qbiqul"/);
  assert.equal((claritySource.match(/https:\/\/www\.clarity\.ms\/tag\//g) || []).length, 1);
  assert.equal(claritySource.includes(CLARITY_TAG), false, "the tag URL is built from PROJECT_ID");
});

test("the production CSP still permits the Clarity tag it now loads", () => {
  const config = JSON.parse(read("vercel.json"));
  const csp = config.headers
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === "Content-Security-Policy").value;

  // The allow path above proves the loader inserts the tag; without this the
  // browser would block it on production and the guard would still report true.
  assert.match(csp.match(/script-src[^;]+/)[0], /https:\/\/\*\.clarity\.ms/);
  assert.match(csp.match(/connect-src[^;]+/)[0], /https:\/\/\*\.clarity\.ms/);
});

test("the Clarity guard introduces no tracking of its own and does not touch the lead helper", () => {
  // The Google Ads, phone, estimator and PostHog assertions live in
  // tests/tracking-installation.test.cjs; this only proves the guard stays out.
  assert.equal(/gtag|AW-\d+|GT-[A-Z0-9]+|posthog|phone_call_click|form_submit|conversion/i.test(claritySource), false);

  const analytics = read("js/analytics.js");
  assert.match(analytics, /productionHosts: suppliedConfig\.productionHosts \|\|/);
  for (const file of ["js/analytics.js", "js/main.js", "get-a-quote-src/src/App.jsx"]) {
    assert.equal(read(file).includes("GreenVacClarity"), false, `${file} does not depend on the Clarity guard`);
  }

  // Clarity loads before the lead helper, so it cannot share that config object
  // and keeps its own copy of the list. The two must allow the same hosts.
  const hostsOf = (source, pattern) => source.match(pattern)[1].match(/"([^"]+)"/g).map((h) => h.toLowerCase()).sort().join(",");
  assert.equal(
    hostsOf(claritySource, /PRODUCTION_HOSTS\s*=\s*\[([^\]]+)\]/),
    hostsOf(analytics, /productionHosts:[^[]*\[([^\]]+)\]/),
    "Clarity and the lead helper must allow the same production hosts",
  );
});
