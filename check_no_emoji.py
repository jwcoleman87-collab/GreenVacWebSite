"""GreenVac no-emoji guard.

HARD RULE: no emoji anywhere on the site. Use bespoke inline SVG or text.
Scans the web assets (html/css/js/jsx/xml, incl. the built estimator bundle)
and exits non-zero if any emoji is found, listing every occurrence.

Run standalone:        python check_no_emoji.py
Via the deploy gate:   python deploy.py        (aborts the deploy on any hit)
Via the shell wrapper: sh scripts/check-no-emoji.sh

Typographic characters are allowed: review stars (U+2605/2606), arrows like
->, em-dashes, middots — none of those fall in the emoji ranges below except
the stars, which are explicitly allow-listed.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SKIP_DIRS = {"node_modules", ".git", ".vercel", ".claude", "cold-email"}
EXTS = (".html", ".css", ".js", ".jsx", ".xml")
ALLOW = {"★", "☆"}  # ★ ☆ — review-rating stars are fine

EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF"   # pictographs / transport / symbols / supplemental
    "\U00002600-\U000027BF"    # misc symbols + dingbats (✅⚡🗺 live here)
    "\U00002300-\U000023FF"    # technical (⌚ ⏰ ⏱ …)
    "\U00002B00-\U00002BFF"    # arrows / stars block
    "\U0001F1E6-\U0001F1FF"    # regional indicator (flags)
    "\U0000FE00-\U0000FE0F]"   # variation selectors (the ️ that trails an emoji)
)

hits = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fn in filenames:
        if not fn.endswith(EXTS):
            continue
        path = os.path.join(dirpath, fn)
        try:
            text = open(path, encoding="utf-8").read()
        except (UnicodeDecodeError, OSError):
            continue
        for lineno, line in enumerate(text.splitlines(), 1):
            for m in EMOJI.finditer(line):
                if m.group() not in ALLOW:
                    hits.append((os.path.relpath(path, ROOT), lineno, m.group()))

if hits:
    print(f"EMOJI FOUND ({len(hits)}). The site has a permanent no-emoji rule.")
    for rel, lineno, ch in hits:
        print(f"  {rel}:{lineno}  U+{ord(ch):04X}  {ch!r}")
    sys.exit(1)

print("OK - no emoji in web assets (review stars/arrows allowed).")
sys.exit(0)
