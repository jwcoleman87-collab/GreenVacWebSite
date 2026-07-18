from PIL import Image
import os

SRC_DIR = "images"

# (max_width, quality) per image. Resize down + re-encode at lower quality.
PROFILES = {
    "hero.jpg":              (1600, 70),
    "hero-tight-access.jpg": (1600, 78),
    "hero-great-trenching.jpg": (1800, 78),
    "hero-narrow-trench.jpg": (1536, 62),
    "hero-service-trench.jpg": (1800, 72),
    "ndd-hydrovac-method.jpg": (900, 68),
    "ndd-exposed-pipe.jpg": (720, 68),
    "ndd-tight-access.jpg": (640, 68),
    "ndd-established-garden.jpg": (640, 68),
    "ndd-services-and-roots.jpg": (640, 68),
    "tight-access.jpg":      (1200, 70),
    "james.jpeg":            (1000, 70),
    "service-ndd.jpg":       (1200, 70),
    "service-potholing.jpg": (1200, 70),
    "service-potholing-card.jpg": (1200, 72),
    "service-potholing-trench-card.jpg": (1200, 68),
    "service-trenching.jpg": (1200, 70),
    "service-trenching-tight-access-card.jpg": (1000, 74),
    "service-leak.jpg":      (1200, 70),
    "service-cleaning.jpg":  (1200, 70),
    "service-access.jpg":    (1200, 70),
    "port-01.jpg":           (900, 68),
    "port-02.jpg":           (900, 68),
    "port-03.jpg":           (900, 68),
    "port-04.jpg":           (900, 68),
    "port-05.jpg":           (900, 68),
    "port-06.jpg":           (900, 68),
    "port-07.jpg":           (900, 68),
    "port-08.jpg":           (900, 68),
    "port-09.jpg":           (900, 68),
    "port-10.jpg":           (900, 68),
    "port-11.jpg":           (900, 68),
    "rig-access.jpg":        (1200, 70),
    "neds-plumbing.jpg":     (400, 75),
    "og-image.png":          (1200, 80),
    "logo.png":              (260, 90),  # logo at 2x intended display
}

total_before = 0
total_after = 0

for fn, (max_w, quality) in PROFILES.items():
    src = os.path.join(SRC_DIR, fn)
    if not os.path.exists(src):
        print(f"SKIP {fn}")
        continue
    name, _ = os.path.splitext(fn)
    out = os.path.join(SRC_DIR, name + ".webp")
    img = Image.open(src)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    if img.width > max_w:
        ratio = max_w / img.width
        new_h = int(img.height * ratio)
        img = img.resize((max_w, new_h), Image.LANCZOS)
    save_mode = "RGBA" if (img.mode == "RGBA") else "RGB"
    img = img.convert(save_mode)
    img.save(out, "WEBP", quality=quality, method=6)
    before = os.path.getsize(src)
    after = os.path.getsize(out)
    total_before += before
    total_after += after
    pct = (1 - after / before) * 100 if before else 0
    print(f"{fn:30s}  {before//1024:5d}KB -> {after//1024:5d}KB  ({pct:+5.1f}%)")

if total_before:
    print(f"\nTotal: {total_before//1024}KB -> {total_after//1024}KB  ({(1-total_after/total_before)*100:.1f}% saved)")
