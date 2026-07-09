"""GreenVac WCAG contrast checker.

Standing verification step -- run after any colour / text-on-surface change:

    python check_contrast.py

Exits non-zero if any *gating* text pairing fails WCAG 2.1 AA, so it can
also guard a deploy (e.g. `python check_contrast.py && vercel deploy --prod`).
Output is pure ASCII so it runs cleanly in the Windows console.

WHY THIS IS A CURATED LIST AND NOT AN AUTO-SCAN
-----------------------------------------------
Automated scanners flag a colour by comparing it against the *page*
background. That gives false positives here: the bright green #28c06e
measures only ~2.1:1 against the cream page, so a blind scan "fails" it --
but that green is ONLY ever used on the dark photo-card overlay, where it
sits at ~7:1 and passes comfortably. Contrast is a property of a
foreground *on its actual rendered background*, so each pairing below is
declared explicitly. If you change a brand colour, update PALETTE; if you
add a new text-on-surface combination, add it to CHECKS.

AA thresholds: 4.5:1 normal text, 3.0:1 large text (>=24px, or >=18.66px bold).
"""

# --- Palette (mirror of :root in css/styles.css) ------------------------------
PALETTE = {
    "green-brand":  "#1b7046",
    "green-glow":   "#136f39",   # == --accent; green text/icons on LIGHT backgrounds
    "green-bright": "#28c06e",   # vivid green -- ONLY on dark photo cards
    "cream-bg":     "#f7f1e3",   # --dark-bg      page background
    "card":         "#fffdf6",   # --dark-card    light cards
    "surface":      "#efe7d3",   # --dark-surface section bands / estimator intro
    "text-primary": "#232a20",
    "text-muted":   "#515c4c",
    "text-dim":     "#5f6a59",
    "white":        "#ffffff",
}

# Representative solid stand-in for the service-card photo overlay
# (the bottom of the card is ~rgba(8,11,8,0.8) over a mid-tone photo).
PHOTO_OVERLAY = "#191d19"

# Translucent fills, declared as (hex, alpha) -- composited over a base below.
GREEN_TINT = ("#1b7046", 0.07)   # --green-tint, badge strip background over cream


# --- Colour maths (WCAG 2.1) --------------------------------------------------
def _hex(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))

def _composite(fg_rgb, alpha, bg_rgb):
    """Flatten a translucent colour over an opaque background."""
    return tuple(round(f * alpha + b * (1 - alpha)) for f, b in zip(fg_rgb, bg_rgb))

def _lin(ch):
    s = ch / 255
    return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

def _luminance(rgb):
    r, g, b = (_lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(fg, bg):
    """Contrast ratio between two opaque RGB tuples (1.0 - 21.0)."""
    l1, l2 = _luminance(fg), _luminance(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


# --- Resolve a check's colours to RGB -----------------------------------------
def resolve(colour, base=None):
    """colour may be a PALETTE key, a #hex string, or an (hex, alpha) tuple."""
    if isinstance(colour, tuple):
        hex_str, alpha = colour
        bg = resolve(base) if base else _hex(PALETTE["cream-bg"])
        return _composite(_hex(hex_str), alpha, bg)
    if colour in PALETTE:
        return _hex(PALETTE[colour])
    return _hex(colour)


# --- The pairings, as actually rendered on the site ---------------------------
# (label, foreground, background, large_text?)
CHECKS = [
    # on the cream page background
    ("Body heading - text-primary / page",      "text-primary", "cream-bg", False),
    ("Body copy - text-muted / page",            "text-muted",   "cream-bg", False),
    ("Small meta - text-dim / page",             "text-dim",     "cream-bg", False),
    ("Green link / .text-green / page",          "green-glow",   "cream-bg", False),
    # on section bands (--dark-surface)
    ("Body copy - text-muted / surface band",    "text-muted",   "surface",  False),
    ("Small meta - text-dim / surface band",     "text-dim",     "surface",  False),
    ("Green link / eyebrow - green-glow / band",  "green-glow",   "surface",  False),
    # on light cards (--dark-card)
    ("Body copy - text-muted / card",            "text-muted",   "card",     False),
    ("Green link - green-glow / card",           "green-glow",   "card",     False),
    # credential badge strip (text on green-tint over cream)
    ("Badge label - text-primary / green-tint",  "text-primary", GREEN_TINT, False),
    # estimator intro / disclaimer (on --dark-surface)
    ("Estimator H1 - text-primary / surface",    "text-primary", "surface",  True),
    ("Estimator intro - text-muted / surface",   "text-muted",   "surface",  False),
    ("Estimator phone - green-glow / surface",   "green-glow",   "surface",  False),
    ("Estimator note - text-dim / surface",      "text-dim",     "surface",  False),
]

# Informational only (NOT gating): text on the photo-card overlay. The real
# background is a photo, so this uses a representative dark stand-in.
INFO_CHECKS = [
    ("Card title - white / photo overlay",          "white",        PHOTO_OVERLAY, True),
    ("Card green word - green-bright / overlay",     "green-bright", PHOTO_OVERLAY, True),
    ("'Learn more' link - green-bright / overlay",   "green-bright", PHOTO_OVERLAY, False),
    # Counterfactual -- proves WHY we DON'T darken the card greens (Task 2):
    ("  > if card green were darkened (glow)/overlay", "green-glow", PHOTO_OVERLAY, False),
]


def threshold(large):
    return 3.0 if large else 4.5

def run():
    print("GreenVac contrast check - WCAG 2.1 AA")
    print("=" * 64)
    failures = 0

    print("\nGATING - solid text/surface pairings:")
    for label, fg, bg, large in CHECKS:
        base = bg if not isinstance(bg, tuple) else None
        r = ratio(resolve(fg, base), resolve(bg))
        need = threshold(large)
        ok = r >= need
        if not ok:
            failures += 1
        tag = "AA-large" if large else "AA"
        print(f"  [{'PASS' if ok else 'FAIL'}] {r:5.2f}:1  (need {need}, {tag})  {label}")

    print("\nINFO - text on the dark photo-card overlay (representative bg):")
    for label, fg, bg, large in INFO_CHECKS:
        base = bg if not isinstance(bg, tuple) else None
        r = ratio(resolve(fg, base), resolve(bg))
        need = threshold(large)
        mark = "ok " if r >= need else "low"
        print(f"  ({mark}) {r:5.2f}:1  (need {need})  {label}")

    print("=" * 64)
    if failures:
        print(f"RESULT: {failures} gating pairing(s) FAIL AA.")
        return 1
    print("RESULT: all gating pairings pass AA.")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(run())
