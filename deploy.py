"""GreenVac release pipeline.

    python deploy.py            # build + verify, then deploy to production
    python deploy.py --dry-run  # build + verify only (no deploy)

Each step must succeed before the next, so a broken build, a WCAG contrast
regression, or ANY emoji can never reach production:

    1. build the estimator SPA (vite)        -> get-a-quote/
    2. bake.py            inject partials/*.html into the pages
    3. minify_assets.py   regenerate css/js .min files
    4. check_contrast.py  WCAG 2.1 AA gate
    5. check_no_emoji.py  hard no-emoji gate (bespoke SVG / text only)
    6. vercel deploy --prod   (skipped with --dry-run)

This is the canonical way to ship the site -- prefer it over running the
build scripts by hand, so the gates always run before a deploy.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent

# (label, command, run-in-shell?)
STEPS = [
    ("Build estimator SPA", "npm --prefix get-a-quote-src run build", True),
    ("Bake partials",       [sys.executable, "bake.py"],              False),
    ("Minify CSS/JS",       [sys.executable, "minify_assets.py"],     False),
    ("Contrast gate (AA)",  [sys.executable, "check_contrast.py"],    False),
    ("No-emoji gate",       [sys.executable, "check_no_emoji.py"],    False),
]

DEPLOY_CMD = "vercel deploy --prod"


def step(label, cmd, shell=False):
    shown = cmd if isinstance(cmd, str) else " ".join(cmd)
    print(f"\n>>> {label}: {shown}")
    code = subprocess.run(cmd, cwd=ROOT, shell=shell).returncode
    if code != 0:
        print(f"\nABORTED at '{label}' (exit {code}). Nothing deployed.")
        sys.exit(code)


def main():
    dry = "--dry-run" in sys.argv

    for label, cmd, sh in STEPS:
        step(label, cmd, sh)

    if dry:
        print("\nDry run OK -- built, AA passes, zero emoji. Not deployed.")
        print(f"Ship it when ready:  {DEPLOY_CMD}")
        return

    step("Deploy to production", DEPLOY_CMD, shell=True)
    print("\nDone -- built, verified (contrast + no-emoji), and deployed.")


if __name__ == "__main__":
    main()
