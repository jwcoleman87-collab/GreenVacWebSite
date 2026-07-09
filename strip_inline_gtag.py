import os
import re

ROOT = "."

# Match the inline gtag init block (and an optional preceding HTML comment).
# Conservative: requires the dataLayer + gtag('config'…) pattern.
INLINE_GTAG_RE = re.compile(
    r"(?:[ \t]*<!--\s*Google tag.*?-->\s*\n)?"
    r"[ \t]*<script>\s*"
    r"window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];\s*"
    r"function\s+gtag\s*\(\)\s*\{\s*dataLayer\.push\(arguments\);?\s*\}\s*"
    r"gtag\(\s*['\"]js['\"]\s*,\s*new\s+Date\(\)\s*\);\s*"
    r"(?:gtag\([^)]*\);\s*)+"
    r"</script>\s*\n?",
    re.DOTALL | re.IGNORECASE,
)

changed = 0
for dirpath, _, filenames in os.walk(ROOT):
    rel = dirpath.replace("\\", "/")
    if any(p in rel for p in ("node_modules", ".vercel", ".claude", ".git", "get-a-quote-src")):
        continue
    for fn in filenames:
        if not fn.endswith(".html"):
            continue
        path = os.path.join(dirpath, fn)
        text = open(path, encoding="utf-8").read()
        new = INLINE_GTAG_RE.sub("", text)
        if new != text:
            open(path, "w", encoding="utf-8", newline="\n").write(new)
            changed += 1
            print(f"stripped: {path}")

print(f"\n{changed} files updated")
