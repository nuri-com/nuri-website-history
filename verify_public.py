#!/usr/bin/env python3
"""Validate the public archive without external services."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parent
failures = []


def check(condition, message):
    if not condition:
        failures.append(message)


manifest = json.loads((ROOT / "manifest.json").read_text())
versions = manifest["versions"]
check(len(versions) == 324, f"expected 324 versions, got {len(versions)}")
check(sum(v.get("static") == "static.html" for v in versions) == 147, "expected 147 static editions")
check("/Users/" not in json.dumps(manifest), "local absolute path in public manifest")

for version in versions:
    check((ROOT / version["archived_index"]).is_file(), f"missing {version['archived_index']}")
    if version.get("static"):
        check((ROOT / version["status"] / version["slug"] / version["static"]).is_file(), f"missing static {version['number']}")

html_files = list(ROOT.rglob("*.html"))
for page in html_files:
    text = page.read_text(errors="surrogateescape")
    check(re.search(r'<meta\s+name=["\']robots["\']', text, re.I) is not None, f"noindex missing: {page.relative_to(ROOT)}")
    if page.relative_to(ROOT).parts[0] in ("published", "unpublished") and page.name != "static.html":
        check("Content-Security-Policy" in text, f"raw-page CSP missing: {page.relative_to(ROOT)}")

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)

parser = Links()
parser.feed((ROOT / "index.html").read_text())
for href in parser.links:
    if re.match(r"^(https?:|mailto:|#)", href):
        continue
    target = href.split("?", 1)[0].split("#", 1)[0]
    check((ROOT / target).exists(), f"dead index link: {href}")

viewer = (ROOT / "viewer.html").read_text()
match = re.search(r"const list = (\[.*\]);\s*const i =", viewer, re.S)
check(match is not None, "viewer list not found")
if match:
    entries = json.loads(match.group(1))
    check(len(entries) == 324, f"viewer has {len(entries)} entries")
    for entry in entries:
        check((ROOT / entry["path"]).is_file(), f"viewer target missing: {entry['path']}")
        check((ROOT / entry["orig"]).is_file(), f"viewer original missing: {entry['orig']}")

for forbidden in ("capture.json", "ethers.umd.min.js"):
    check(not list(ROOT.rglob(forbidden)), f"excluded file remains: {forbidden}")
for pattern in ("*.age", "*.bundle", ".env", "*.pem"):
    check(not list(ROOT.rglob(pattern)), f"private artifact remains: {pattern}")

files = [p for p in ROOT.rglob("*") if p.is_file()]
check(max(p.stat().st_size for p in files) < 100_000_000, "file exceeds GitHub's 100 MB limit")
check(sum(p.stat().st_size for p in files) < 1_000_000_000, "site exceeds 1 GB")

print(f"versions={len(versions)} static=147 html={len(html_files)} files={len(files)} bytes={sum(p.stat().st_size for p in files)}")
print(f"failures={len(failures)}")
for failure in failures:
    print("FAIL", failure)
sys.exit(bool(failures))
