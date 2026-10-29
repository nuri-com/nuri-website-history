#!/usr/bin/env python3
"""Build the clean English/German preview without deleting archive material."""
from pathlib import Path
from html import escape
import json

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / "manifest.json").read_text())
excluded = set(range(3, 10)) | set(range(74, 112)) | set(range(113, 146)) | set(range(147, 151))
excluded -= {112, 116, 146}  # keep the working German and English legacy homepages
german = set(range(47, 63)) | {112, 116}
entries = []
for version in manifest["versions"]:
    number = version["number"]
    if number in excluded or version.get("static") != "static.html":
        continue
    entries.append({
        "number": number,
        "title": version["title"],
        "lang": "DE" if number in german else "EN",
        "status": version["status"],
        "path": f"{version['status']}/{version['slug']}/static.html",
    })
entries.sort(key=lambda item: (item["status"] != "unpublished", item["number"]))
assert len(entries) == 69, len(entries)
assert sum(item["lang"] == "EN" for item in entries) == 51
assert sum(item["lang"] == "DE" for item in entries) == 18

style = """
:root{--ink:#151515;--dim:#555;--line:#e4e4e4;--bg:#fff;--accent:#2f5d3a}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0 auto;max-width:1100px;padding:48px 22px 80px;background:var(--bg);color:var(--ink);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
h1{font-size:2rem;letter-spacing:-.03em;margin:0 0 8px}h2{font-size:1.2rem;margin:42px 0 8px}p{color:var(--dim);max-width:72ch}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.filters{display:flex;gap:18px;flex-wrap:wrap;margin:22px 0 8px}.filters button{padding:0;border:0;background:none;color:var(--accent);font:inherit;cursor:pointer}.filters button.active{color:var(--ink);font-weight:700}
ol{list-style:none;padding:0;margin:0}li{display:grid;grid-template-columns:48px 34px minmax(0,1fr) auto;gap:12px;align-items:baseline;padding:13px 0;border-bottom:1px solid var(--line)}.n,.lang,.open{color:var(--dim);font-size:.85rem}.title{overflow-wrap:anywhere}.open{white-space:nowrap}
footer{margin-top:36px;color:var(--dim);font-size:.85rem}@media(max-width:600px){li{grid-template-columns:38px 28px minmax(0,1fr)}.open{grid-column:3}}
"""
counts = {lang: sum(item["lang"] == lang for item in entries) for lang in ("EN", "DE")}
rows = []
for item in entries:
    rows.append(
        f'<li data-lang="{item["lang"]}"><span class="n">{item["number"]:03}</span>'
        f'<span class="lang">{item["lang"]}</span>'
        f'<a class="title" href="viewer.html?v={item["number"]}">{escape(item["title"])}</a>'
        f'<a class="open" href="{item["path"]}">Open file</a></li>'
    )
index = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><title>Nuri website drafts</title><style>{style}</style></head>
<body><h1>Nuri website drafts</h1>
<p>{len(entries)} working English and German static editions. Unpublished drafts first, published below. Raw, blank, test and other-language captures remain in the repository but are hidden here.</p>
<div class="filters"><button class="active" data-filter="ALL">All {len(entries)}</button><button data-filter="EN">English {counts['EN']}</button><button data-filter="DE">Deutsch {counts['DE']}</button></div>
"""
for status, heading in (("unpublished", "Unpublished drafts"), ("published", "Published")):
    index += f'<h2>{heading}</h2><ol data-group="{status}">' + "".join(
        row for item, row in zip(entries, rows) if item["status"] == status
    ) + "</ol>"
index += """
<footer><a href="COPY.md">Landing-page copy</a> · <a href="manifest.json">Full 324-version manifest</a> · <a href="https://github.com/nuri-com/nuri-website-history">GitHub repository</a></footer>
<script>
const buttons=[...document.querySelectorAll('[data-filter]')];
function filter(lang){buttons.forEach(b=>b.classList.toggle('active',b.dataset.filter===lang));document.querySelectorAll('li[data-lang]').forEach(li=>li.hidden=lang!=='ALL'&&li.dataset.lang!==lang);document.querySelectorAll('ol[data-group]').forEach(ol=>{ol.previousElementSibling.hidden=![...ol.children].some(li=>!li.hidden)})}
buttons.forEach(b=>b.addEventListener('click',()=>filter(b.dataset.filter)));
</script></body></html>
"""
(ROOT / "index.html").write_text(index)

viewer_style = """
*{box-sizing:border-box}body{margin:0;font:15px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#151515}.top{min-height:48px;display:flex;align-items:center;gap:16px;padding:8px 14px;border-bottom:1px solid #e4e4e4;background:#fff;flex-wrap:wrap}.top a{color:#2f5d3a;text-decoration:none}.title{font-weight:600;flex:1;min-width:220px}.viewer{display:block;width:100%;height:calc(100vh - 49px);border:0;background:#fff}@media(max-width:600px){.top{gap:10px}.title{flex-basis:100%;order:-1}.viewer{height:calc(100vh - 84px)}}
"""
viewer = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><title>Nuri draft viewer</title><style>{viewer_style}</style></head>
<body><div class="top"><a href="index.html">All versions</a><span class="title" id="title">Loading…</span><a id="prev" href="#">← Previous</a><a id="next" href="#">Next →</a><a id="open" href="#">Open file</a></div>
<iframe class="viewer" id="frame" title="Archived Nuri landing page"></iframe>
<script>
const list = {json.dumps(entries, ensure_ascii=False)};
const params=new URLSearchParams(location.search);
let index=0;
if(params.has('v')){{const wanted=Number(params.get('v'));index=Math.max(0,list.findIndex(v=>v.number===wanted))}}
else if(params.has('i')){{const wanted=Number(params.get('i'))+1;const found=list.findIndex(v=>v.number===wanted);index=found>=0?found:0}}
const v=list[index],frame=document.getElementById('frame');
document.getElementById('title').textContent=String(v.number).padStart(3,'0')+' · '+v.lang+' · '+v.title;
frame.src=v.path;document.getElementById('open').href=v.path;
const prev=document.getElementById('prev'),next=document.getElementById('next');
if(index>0)prev.href='viewer.html?v='+list[index-1].number;else prev.style.visibility='hidden';
if(index<list.length-1)next.href='viewer.html?v='+list[index+1].number;else next.style.visibility='hidden';
document.addEventListener('keydown',e=>{{if(e.key==='ArrowLeft'&&index>0)location.href=prev.href;if(e.key==='ArrowRight'&&index<list.length-1)location.href=next.href}});
</script></body></html>
"""
(ROOT / "viewer.html").write_text(viewer)
print(f"Built {len(entries)} preview entries: {counts['EN']} EN, {counts['DE']} DE")
print("First:", entries[0]["number"], entries[0]["title"])
print("Last:", entries[-1]["number"], entries[-1]["title"])
