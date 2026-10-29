# Nuri Website History

Public, clickable archive of **324 Nuri landing-page versions**: 175 published captures and 149 unpublished designs. The clean preview shows **69 working English and German static editions**, with unpublished drafts first and published below.

**Browse:** https://nuri-com.github.io/nuri-website-history/

## Logs

- [CHANGELOG.md](CHANGELOG.md) — publication changes and releases, with commit SHAs
- [PROMPTLOG.md](PROMPTLOG.md) — distilled owner requests and decisions

## Architecture

```mermaid
flowchart LR
  A["Private source archive<br/>f3f424d"] --> B["Reviewed public export<br/>ec6153e"]
  B --> C["Full 324-version repository"]
  B --> D["69 working EN/DE editions<br/>6370abf"]
  D --> E["Clean GitHub Pages preview"]
  C --> F["Raw and test captures<br/>hidden from preview"]
```

## User journey

```mermaid
flowchart LR
  A["Open clean preview"] --> B["Filter English or Deutsch"]
  B --> C["Browse unpublished drafts first"]
  C --> D["Previous or next"]
  D --> C
  C --> E["Published static page below"]
```

## Navigate

- **Clean preview:** `index.html`
- **Previous/next viewer:** `viewer.html?v=2` (legacy `?i=49` also works)
- **Current landing-page copy:** `COPY.md`
- **Machine-readable catalogue:** `manifest.json`
- **Published versions:** `published/`
- **Unpublished versions:** `unpublished/`

Static editions are self-contained HTML with scripts removed and assets inlined. Original-only captures are historical material, not guaranteed self-contained renderings. Public raw HTML has script/network guards and every public HTML page is `noindex`; byte-preserved originals remain in the private source archive.

## Provenance and exclusions

Source: private `nuri-com/nuri-website-archive`, commit `f3f424df744cbf9c85a4d5bda02bfed2d8fae422`.

This public export omits encrypted Git bundles, release assets, local capture metadata, local absolute source paths, and the quarantined third-party file. No production website or application is deployed from this repository. Historical public viewing does not grant an open-source license for the archived content.

## Verify

```bash
python3 verify_public.py
```

Expected: 324 archived versions, 147 static editions, 69 curated preview entries, 633 HTML files, zero failures. Full-export browser QA: 147/147 static pages, zero external requests. Curated-preview QA: 69/69 pages render, filters show 51 English and 18 German entries, unpublished first, legacy `i=49` works. GitLeaks: no findings.

## Status

- **Version:** 0.1.0
- **Updated:** 2026-10-29 by Hermes
- **Public export revision:** `ec6153e086e15ad56b33e14641577d2b18a1dbdb`
- **Clean preview revision:** `6370abfa398e1bab05c7102224b276bed5503542`
- **Deployment:** GitHub Pages, https://nuri-com.github.io/nuri-website-history/
