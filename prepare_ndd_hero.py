"""Prepare homepage hero exports from the supplied, user-edited GreenVac photos."""

from pathlib import Path
import sys

from PIL import Image, ImageOps


JOBS = (
    ("Untitled design (88).png", "ndd-hydrovac-method", (900, 1200)),
    ("Untitled design (91).png", "ndd-exposed-pipe", (720, 540)),
    ("Untitled design (90).png", "ndd-tight-access", (640, 853)),
    ("Untitled design (89).png", "ndd-established-garden", (640, 853)),
    ("Untitled design (92).png", "ndd-services-and-roots", (640, 853)),
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

            image.save(
                output_dir / f"{output_stem}.jpg",
                "JPEG",
                quality=92,
                optimize=True,
                subsampling=0,
            )
            image.save(
                output_dir / f"{output_stem}.webp",
                "WEBP",
                quality=86,
                method=6,
            )

        print(f"Prepared {output_stem} at {size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
