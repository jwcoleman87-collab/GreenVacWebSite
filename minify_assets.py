import csscompressor
import rjsmin
import os

PAIRS = [
    ("css/styles.css", "css/styles.min.css", "css"),
    ("js/main.js",     "js/main.min.js",     "js"),
    ("js/analytics.js", "js/analytics.min.js", "js"),
]

for src, dst, kind in PAIRS:
    if not os.path.exists(src):
        print(f"SKIP {src}")
        continue
    text = open(src, encoding="utf-8").read()
    if kind == "css":
        out = csscompressor.compress(text)
    else:
        out = rjsmin.jsmin(text)
    open(dst, "w", encoding="utf-8", newline="\n").write(out)
    before = len(text.encode("utf-8"))
    after = len(out.encode("utf-8"))
    pct = (1 - after / before) * 100
    print(f"{src:20s} {before:6d}B -> {after:6d}B  ({pct:.1f}% smaller)  -> {dst}")
