"""GreenVac estimator image derivatives.

    python make_estimator_images.py

The estimator used to load 120-550KB originals (up to 1800px wide) and then
crush them into 100-138px letterbox strips with object-fit: cover, throwing away
the part of the photo the customer actually needed to see.

This inverts that. Each card shape gets a derivative composed for it: the crop
window is centred on a hand-chosen focal point per photo per shape, so the
informative part of the frame survives and the browser downloads roughly the
pixels it will paint.

Shapes (widths are sized to the slot the card actually paints, 1x and ~2x)
    card      1:1   desktop job cards      (see the note on SHAPES below)
    wide      3:2   mobile job cards       (full-width, composed -- not a squeeze)
    context   4:3   access cards           (needs surrounding context to read)
    thumb     1:1   compact rows and tiles

Outputs images/est-<slug>-<shape>-<width>.webp plus a generated manifest at
get-a-quote-src/src/estimator-images.js, so the estimator gets exact width and
height attributes (no layout shift) without anyone hand-copying numbers.

Regenerate after replacing any source photo. Safe to re-run; it overwrites.
Not deployed: *.py is listed in .vercelignore.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
IMAGES = ROOT / "images"
MANIFEST = ROOT / "get-a-quote-src" / "src" / "estimator-images.js"

SHAPES = {
    # Desktop job cards. Square rather than 3:4 so the card, the three-across
    # row and the "More job types" control all clear a 1280x800 fold -- a taller
    # card pushed the disclosure underneath the fixed footer where nobody found
    # it. The crop is composed per photo, so squaring costs framing, not subject.
    "card": (1 / 1, (240, 460)),
    "wide": (3 / 2, (400, 760)),
    "context": (4 / 3, (380, 740)),
    "thumb": (1 / 1, (104, 208)),
}

# source stem -> {shape: (focal x, focal y[, zoom])} in 0..1 of the source frame.
# The focal point is what must survive the crop, not the geometric centre.
#
# `zoom` (default 1.0) shrinks the crop box before it is positioned, and it is
# the only way to move the subject horizontally when the source is narrower than
# the target ratio: the crop then already spans the full width, so the focal x
# has nothing left to slide. service-potholing-card is 1000x1033 against a 3:2
# and a 1:1 target, which is exactly that case.
PLAN = {
    # Job cards -- top-down service exposure in a gravel side path.
    "ndd-services-and-roots": {
        "card": (0.48, 0.52),
        "wide": (0.45, 0.55),
        "thumb": (0.45, 0.55),
    },
    # Job cards -- long trench receding down a narrow passage.
    "hero-narrow-trench": {
        "card": (0.50, 0.44),
        "wide": (0.50, 0.42),
        "thumb": (0.50, 0.40),
    },
    # Job cards -- lawn with blue service marks and dug potholes. The marks sit
    # at x=0.82 of the frame (measured off the pixels, not eyeballed) and the
    # source is nearly square, so a full-width crop always strands them against
    # the right edge. Zooming to 0.40 brings them to x=0.55 of the card --
    # centred to the eye -- and makes the marks and holes legible rather than a
    # distant smudge in an empty paddock.
    "service-potholing-card": {
        "card": (0.818, 0.685, 0.40),
        "wide": (0.818, 0.685, 0.40),
        "thumb": (0.818, 0.685, 0.40),
    },
    # Access: OPEN. Flat open yard running out to paddock, hose lying free,
    # nothing in the way. Natively 4:3, so the context crop takes it whole.
    "port-03": {
        "context": (0.50, 0.50),
        "thumb": (0.52, 0.52),
    },
    # Access: NARROW. Hose threaded down a passage past a roller door with the
    # rig left out on the street -- the restriction is the subject.
    "rig-access": {
        "context": (0.50, 0.34),
        "thumb": (0.50, 0.32),
    },
    # Contact step, "where we can park": the rig and truck on a hard stand. Good
    # for that, misleading as an Open Access choice, which is where it used to be.
    "tight-access": {
        "thumb": (0.62, 0.42),
    },
    # Contact step, "the access route".
    "service-access": {
        "thumb": (0.52, 0.52),
    },
    # Access: very tight. Worker wedged in a corridor between two brick walls.
    "ndd-tight-access": {
        "context": (0.50, 0.45),
        "thumb": (0.50, 0.42),
    },
    # Expanded job: expose a leak -- pipe spraying in an open excavation.
    "service-leak": {
        "thumb": (0.50, 0.45),
    },
    # Expanded job: dig under an obstacle -- excavation under a house perimeter.
    "hero-great-trenching": {
        "thumb": (0.50, 0.58),
    },
    # Photo-example tile on the contact step.
    "ndd-exposed-pipe": {
        "thumb": (0.35, 0.55),
    },
}


def crop_to(image, ratio, focal):
    """Crop of `ratio`, scaled by zoom, positioned on the focal point."""
    width, height = image.size
    focal_x, focal_y = focal[0], focal[1]
    zoom = focal[2] if len(focal) > 2 else 1.0

    if width / height > ratio:
        crop_h = height
        crop_w = round(height * ratio)
    else:
        crop_w = width
        crop_h = round(width / ratio)

    crop_w = max(1, round(crop_w * zoom))
    crop_h = max(1, round(crop_h * zoom))

    left = round(focal_x * width - crop_w / 2)
    top = round(focal_y * height - crop_h / 2)
    left = max(0, min(left, width - crop_w))
    top = max(0, min(top, height - crop_h))
    return image.crop((left, top, left + crop_w, top + crop_h))


def main():
    manifest = {}
    written = 0
    total_bytes = 0

    for stem in sorted(PLAN):
        source = IMAGES / f"{stem}.jpg"
        if not source.exists():
            source = IMAGES / f"{stem}.webp"
        if not source.exists():
            print(f"MISSING {stem}")
            continue

        original = Image.open(source).convert("RGB")

        for shape, focal in sorted(PLAN[stem].items()):
            ratio, widths = SHAPES[shape]
            framed = crop_to(original, ratio, focal)
            variants = []

            for nominal_w in widths:
                # Never upscale -- a stretched photo looks worse than a slightly
                # smaller one, and the srcset still resolves correctly.
                target_w = min(nominal_w, framed.width)
                if any(v["width"] == target_w for v in variants):
                    continue
                target_h = round(target_w / ratio)
                resized = framed.resize((target_w, target_h), Image.LANCZOS)
                out = IMAGES / f"est-{stem}-{shape}-{target_w}.webp"
                resized.save(out, "WEBP", quality=72, method=6)
                size = out.stat().st_size
                written += 1
                total_bytes += size
                variants.append({"width": target_w, "height": target_h})
                print(f"  {out.name:52s} {target_w:4d} x {target_h:4d}  {size // 1024:4d}KB")

            manifest[f"{stem}:{shape}"] = {
                "stem": stem,
                "shape": shape,
                "variants": variants,
            }

    MANIFEST.write_text(
        "/* GENERATED by make_estimator_images.py -- do not edit by hand.\n"
        " *\n"
        " * Real dimensions of every estimator derivative, so each <img> can carry\n"
        " * exact width/height (no layout shift) and an honest srcset.\n"
        " */\n"
        "export const ESTIMATOR_IMAGES = "
        + json.dumps(manifest, indent=2)
        + ";\n",
        encoding="utf-8",
        newline="\n",
    )

    print(f"\n{written} derivatives, {total_bytes // 1024}KB total.")
    print(f"manifest -> {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
