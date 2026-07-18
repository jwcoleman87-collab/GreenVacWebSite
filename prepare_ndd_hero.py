"""Prepare fidelity-preserving homepage hero exports from supplied GreenVac photos."""

from pathlib import Path
import sys

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


JOBS = (
    ("IMG_5285.JPEG", "ndd-hydrovac-method", (900, 1200)),
    ("IMG_5767.JPEG", "ndd-exposed-pipe", (720, 540)),
    ("IMG_7356.JPEG", "ndd-tight-access", (640, 853)),
    ("IMG_7638.JPEG", "ndd-established-garden", (640, 853)),
    ("IMG_7567.JPEG", "ndd-services-and-roots", (640, 853)),
)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python prepare_ndd_hero.py <supplied-photo-directory>")

    source_dir = Path(sys.argv[1])
    output_dir = Path(__file__).resolve().parent / "images"

    for source_name, output_stem, size in JOBS:
        source_path = source_dir / source_name
        with Image.open(source_path) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image = image.resize(size, Image.Resampling.LANCZOS)
            image = ImageEnhance.Contrast(image).enhance(1.035)
            image = image.filter(
                ImageFilter.UnsharpMask(radius=1.1, percent=65, threshold=4)
            )

            image.save(
                output_dir / f"{output_stem}.jpg",
                "JPEG",
                quality=90,
                optimize=True,
                subsampling=0,
            )
            image.save(
                output_dir / f"{output_stem}.webp",
                "WEBP",
                quality=82,
                method=6,
            )

        print(f"Prepared {output_stem} at {size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
