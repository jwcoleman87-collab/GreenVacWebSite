const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("supporting services remain direct links below the NDT offer", () => {
  const homepage = read("index.html");
  const links = [...homepage.matchAll(/<a href="([^"]+)" class="ndt-other-link"/g)].map(match => match[1]);
  assert.deepEqual(links, [
    "/info/utility-potholing",
    "/info/non-destructive-digging",
    "/info/pit-cattle-grid-cleaning",
  ]);
  assert.ok(homepage.indexOf('class="ndt-other-links"') > homepage.indexOf('id="james-title"'));
});

test("the shipped site-wide viewer covers content photos and preserves navigation images", () => {
  const source = read("js/main.js");
  const minified = read("js/main.min.js");
  const css = read("css/styles.min.css");

  for (const contents of [source, minified]) {
    assert.ok(contents.includes("data-image-expandable"));
    assert.ok(contents.includes("Expanded image viewer"));
    assert.ok(contents.includes("main img"));
    assert.ok(contents.includes(".service-card, .nh-service-card"));
    assert.match(contents, /\.closest\(['"]a, button['"]\)/);
    assert.ok(contents.includes("ArrowLeft"));
    assert.ok(contents.includes("ArrowRight"));
    assert.ok(contents.includes("Escape"));
  }

  assert.ok(css.includes(".image-lightbox"));
  assert.ok(css.includes(".image-expand-button"));
  assert.ok(css.includes("cursor:zoom-in"));
});

test("portfolio keeps filtering while delegating image expansion to the shared viewer", () => {
  const portfolio = read("js/portfolio.js");

  assert.ok(portfolio.includes("category filter"));
  assert.ok(portfolio.includes("card.classList.toggle('hidden'"));
  assert.equal(portfolio.includes("portfolio-lightbox"), false);
});

test("blog thumbnails are photos first while their titles remain article links", () => {
  const blog = read("blog.html");
  const thumbnails = [...blog.matchAll(/<div style="display:block;">\s*<img\b[^>]+>\s*<\/div>/g)];

  assert.equal(thumbnails.length, 6);
  assert.equal((blog.match(/class="blog-card-body"/g) || []).length, 6);
  assert.ok(blog.includes('<a href="/blog/potholing-compacted-ground-canberra" style="color:inherit;text-decoration:none;">'));
});
