const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const homepage = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("homepage review total and cards match the live Google profile", () => {
  assert.match(homepage, /reviews-aggregate-count">12 Reviews</);
  assert.equal((homepage.match(/<article class="review-card/g) || []).length, 12);

  for (const reviewer of [
    "Hayden Brown",
    "Benjamin Robins",
    "Ryley Campbell",
    "Michael Parkinson",
  ]) {
    assert.match(homepage, new RegExp(`<div class="review-name">${reviewer}<\\/div>`));
  }
});
