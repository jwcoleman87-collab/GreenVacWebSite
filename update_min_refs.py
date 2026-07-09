import os
import re

ROOT = "."

# Replace patterns: (regex, replacement)
SUBS = [
    (re.compile(r'(href|src)="((?:\.\./|/)?css/styles)\.css"'), r'\1="\2.min.css"'),
    (re.compile(r'(href|src)="((?:\.\./|/)?js/main)\.js"'),     r'\1="\2.min.js"'),
]

changed = 0
for dirpath, _, filenames in os.walk(ROOT):
    # skip large folders
    if any(p in dirpath.replace("\\", "/") for p in ("node_modules", ".vercel", ".claude", ".git", "get-a-quote-src")):
        continue
    for fn in filenames:
        if not fn.endswith(".html"):
            continue
        path = os.path.join(dirpath, fn)
        text = open(path, encoding="utf-8").read()
        new = text
        for pat, rep in SUBS:
            new = pat.sub(rep, new)
        if new != text:
            open(path, "w", encoding="utf-8", newline="\n").write(new)
            changed += 1
            print(f"updated: {path}")

print(f"\n{changed} files updated")
