from PIL import Image
import os

images = [
    ("images/hero.jpg", 72),
    ("images/service-potholing.jpg", 72),
    ("images/service-trenching.jpg", 72),
    ("images/service-cleaning.jpg", 72),
    ("images/service-access.jpg", 72),
    ("images/james.jpeg", 75),
    ("images/port-06.jpg", 72),
    ("images/port-03.jpg", 72),
    ("images/port-11.jpg", 72),
    ("images/port-05.jpg", 72),
    ("images/port-09.jpg", 72),
    ("images/port-08.jpg", 72),
    ("images/port-01.jpg", 72),
    ("images/port-07.jpg", 72),
    ("images/logo.png", 85),
]

for path, quality in images:
    if not os.path.exists(path):
        print(f"SKIP (not found): {path}")
        continue
    before = os.path.getsize(path)
    img = Image.open(path)
    img.save(path, optimize=True, quality=quality)
    after = os.path.getsize(path)
    saved = before - after
    print(f"{path}: {before//1024}KB -> {after//1024}KB (saved {saved//1024}KB)")
