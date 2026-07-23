"""GreenVac boilerplate baker.

Replaces everything between these markers in every HTML file:

    <!-- include:start NAME -->
    ...
    <!-- include:end NAME -->

with the contents of partials/NAME.html (indentation is auto-matched
to the leading whitespace of the start marker).

Run before every deploy:   python bake.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
PARTIALS = ROOT / "partials"

INCLUDE_RE = re.compile(
    r'(?P<indent>[ \t]*)<!--\s*include:start\s+(?P<name>[a-zA-Z0-9_-]+)\s*-->'
    r'.*?'
    r'[ \t]*<!--\s*include:end\s+(?P=name)\s*-->',
    re.S,
)

def bake_file(path: Path) -> int:
    # Preserve each source page's checked-in line endings. Path.read_text() and
    # Path.write_text() use universal newline translation, which otherwise turns
    # LF pages into CRLF pages when the baker runs on Windows.
    with path.open("r", encoding="utf-8", newline="") as handle:
        text = handle.read()
    newline = "\r\n" if "\r\n" in text else "\n"
    original = text
    count = 0

    def repl(m):
        nonlocal count
        name = m.group('name')
        indent = m.group('indent')
        partial = PARTIALS / f"{name}.html"
        if not partial.exists():
            print(f"  WARN: missing partial '{name}' referenced in {path.name}")
            return m.group(0)
        body = partial.read_text(encoding="utf-8").replace("\r\n", "\n").rstrip('\n')
        # Re-indent each line of the partial to match the start marker's indent
        indented_body = newline.join(indent + line if line else line for line in body.split('\n'))
        count += 1
        return (
            f'{indent}<!-- include:start {name} -->{newline}'
            f'{indented_body}{newline}'
            f'{indent}<!-- include:end {name} -->'
        )

    text = INCLUDE_RE.sub(repl, text)
    if text != original:
        with path.open("w", encoding="utf-8", newline="") as handle:
            handle.write(text)
    return count


def main():
    html_files = list(ROOT.glob("*.html")) \
        + list(ROOT.glob("blog/*.html")) \
        + list(ROOT.glob("locations/*.html")) \
        + list(ROOT.glob("info/*.html"))

    total = 0
    for f in html_files:
        n = bake_file(f)
        if n:
            print(f"{f.relative_to(ROOT)}: baked {n} include(s)")
            total += n
    print(f"\nTotal: {total} includes baked across {len(html_files)} files.")


if __name__ == "__main__":
    main()
