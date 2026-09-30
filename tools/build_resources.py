"""Build resources.json from the Google Sheets "Web page (.html, zipped)" download.

Usage:
    python3 tools/build_resources.py "path/to/download.zip"

Unlike a CSV download, the web page download keeps the links inside cells.
"""

import json
import re
import sys
import zipfile
from html.parser import HTMLParser
from pathlib import Path

SHEET_NAME = "Tools & Resources.html"
OUT_FILE = Path(__file__).resolve().parent.parent / "resources.json"

URL_RE = re.compile(r"https?://[^\s;]+")
BARE_DOMAIN_RE = re.compile(r"^[\w.-]+\.[a-z]{2,}(/\S*)?$", re.I)


class TableParser(HTMLParser):
    """Collects each table row as a list of cells.

    A cell is a list of segments: {"text": ...} or {"text": ..., "href": ...}.
    """

    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.cell = None
        self.href = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag == "td" and self.row is not None:
            if "freezebar-cell" not in (dict(attrs).get("class") or ""):
                self.cell = []
        elif tag == "a" and self.cell is not None:
            self.href = dict(attrs).get("href")
        elif tag == "br" and self.cell is not None:
            self.cell.append({"text": "\n"})

    def handle_endtag(self, tag):
        if tag == "a":
            self.href = None
        elif tag == "td" and self.cell is not None:
            self.row.append(self.cell)
            self.cell = None
        elif tag == "tr" and self.row is not None:
            # Rows with no cells (like the frozen-header divider) are skipped.
            if self.row:
                self.rows.append(self.row)
            self.row = None

    def handle_data(self, data):
        if self.cell is None:
            return
        seg = {"text": data}
        if self.href:
            seg["href"] = self.href
        self.cell.append(seg)


def plain(cell):
    return "".join(s["text"] for s in cell).strip()


def autolink(cell):
    """Merge adjacent plain text and turn any bare URLs in it into links."""
    merged = []
    for seg in cell:
        if merged and "href" not in seg and "href" not in merged[-1]:
            merged[-1] = {"text": merged[-1]["text"] + seg["text"]}
        else:
            merged.append(dict(seg))

    out = []
    for seg in merged:
        if "href" in seg:
            out.append(seg)
            continue
        text, last = seg["text"], 0
        for m in URL_RE.finditer(text):
            if m.start() > last:
                out.append({"text": text[last:m.start()]})
            out.append({"text": m.group(), "href": m.group()})
            last = m.end()
        if last < len(text):
            out.append({"text": text[last:]})

    # Trim whitespace at the ends of the cell.
    if out and "href" not in out[0]:
        out[0]["text"] = out[0]["text"].lstrip()
    if out and "href" not in out[-1]:
        out[-1]["text"] = out[-1]["text"].rstrip()
    return [s for s in out if s["text"]]


def parse_link(cell):
    """Returns (href for the name, extra segments to show when there are several links)."""
    cell = autolink(cell)
    hrefs = [s["href"] for s in cell if "href" in s]
    if len(hrefs) == 1:
        return hrefs[0], []
    if not hrefs:
        text = plain(cell)
        if BARE_DOMAIN_RE.match(text):
            return "https://" + text, []
    return None, cell


def build(zip_path):
    with zipfile.ZipFile(zip_path) as z:
        html = z.read(SHEET_NAME).decode("utf-8")

    parser = TableParser()
    parser.feed(html)
    rows = parser.rows

    # The list starts after the header row (column B is "Name") and ends at the first blank row.
    start = next(i for i, r in enumerate(rows) if len(r) > 1 and plain(r[1]) == "Name")
    header = [plain(c) for c in rows[start]]

    resources = []
    for r in rows[start + 1:]:
        get = lambda name: r[header.index(name)] if header.index(name) < len(r) else []
        if not r or not plain(get("Name")):
            break

        rating = plain(r[0])
        href, link_extra = parse_link(get("Link"))
        notes = [autolink(get(n)) for n in ("Other notes", "Even more other notes")]

        resources.append({
            "name": plain(get("Name")),
            "href": href,
            "stars": rating.count("⭐"),
            "beginner": "🌱" in rating,
            "description": plain(get("Description")),
            "price": plain(get("Free?")),
            "tech": plain(get("Tech type")),
            "kind": plain(get("Resource type")),
            "language": plain(get("Resource language")),
            "updated": plain(get("Regularly updated?")),
            "link_extra": link_extra,
            "notes": [n for n in notes if n],
        })

    OUT_FILE.write_text(json.dumps(resources, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {len(resources)} resources to {OUT_FILE.name}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    build(sys.argv[1])
