#!/usr/bin/env python3
import json, re, sys, datetime, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
import os

# Data sources
GOOGLE_ALERTS_URLS = [
    "https://www.google.com/alerts/feeds/11574052472963582697/4117947282941867830",
    "https://www.google.com/alerts/feeds/11574052472963582697/6650523041459024237",
]
INOREADER_SOURCES = [
    {
        "url": "https://www.inoreader.com/stream/user/1003985396/tag/Leis%20de%20acesso%20%C3%A0%20informa%C3%A7%C3%A3o%20em%20not%C3%ADcias/view/html?t=%C3%9Altimas%20not%C3%ADcias",
        "force_category": None,
    },
    {
        # Feed específico para a aba acadêmica (LAI Acadêmico)
        "url": "https://www.inoreader.com/stream/user/1003985396/tag/LAI%20Acad%C3%AAmico/view/html?cs=m",
        "force_category": "academic",
    },
]

ROOT = Path(__file__).resolve().parents[1]
TARGET_DIR = os.environ.get("LAI_TARGET_DIR", "a_lai_que_pegou/data")
OUT = ROOT / TARGET_DIR / "feeds.json"
OUT_ACADEMICS = ROOT / TARGET_DIR / "academics.json"
FALLBACK_ACADEMICS = ROOT / TARGET_DIR / "academics_fallback.json"

NS = {"atom":"http://www.w3.org/2005/Atom", "rss":"http://purl.org/rss/1.0/"}


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url) as r:
        return r.read()


def parse_atom_feed(xml_bytes: bytes):
    root = ET.fromstring(xml_bytes)
    entries = []
    for e in root.findall("{http://www.w3.org/2005/Atom}entry"):
        title = (e.findtext("{http://www.w3.org/2005/Atom}title") or "").strip()
        link = None
        for l in e.findall("{http://www.w3.org/2005/Atom}link"):
            if l.get("rel") == "alternate" or l.get("href"):
                link = l.get("href")
        summary = (e.findtext("{http://www.w3.org/2005/Atom}summary") or "").strip()
        published = (e.findtext("{http://www.w3.org/2005/Atom}updated") or e.findtext("{http://www.w3.org/2005/Atom}published") or "")
        entries.append({"title": title, "url": link, "summary": summary, "published": published})
    return entries


class InoreaderHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_anchor = False
        self.current_href = None
        self.current_text = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            href = None
            for k, v in attrs:
                if k == "href":
                    href = v
                    break
            if href and href.startswith("http") and "inoreader.com" not in href and "#" not in href:
                self.in_anchor = True
                self.current_href = href
                self.current_text = []

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self.in_anchor:
            title = "".join(self.current_text).strip()
            if title and self.current_href:
                nav_texts = {"Next 20 items", "Previous 20 items"}
                if title not in nav_texts:
                    self.links.append({"title": title, "url": self.current_href})
            self.in_anchor = False
            self.current_href = None
            self.current_text = []

    def handle_data(self, data):
        if self.in_anchor and data:
            self.current_text.append(data)


def parse_inoreader_html(html_bytes: bytes):
    parser = InoreaderHTMLParser()
    try:
        parser.feed(html_bytes.decode("utf-8", errors="ignore"))
    except Exception:
        pass
    seen = set()
    entries = []
    for link in parser.links:
        url = link.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        entries.append({
            "title": link.get("title", ""),
            "url": url,
            "summary": "",
            "published": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
    return entries


def hostname(url):
    try:
        return urllib.parse.urlparse(url).hostname or ""
    except:
        return ""


def classify(title, url, summary):
    h = (hostname(url) or "").lower()
    t = (title or "").lower()
    s = (summary or "").lower()

    if any(seg in h for seg in [
        ".gov.br", ".jus.br", ".mp.br", "camaraleg.br", "senado.leg.br", "al.", "prefeitura", "portaltransparencia", "transparencia",
    ]):
        return "gov"
    if any(k in h for k in [
        "scielo", "springer", "nature.com", "tandfonline", "elsevier", "sciencedirect", "researchgate", "ssrn", "doi.org",
    ]):
        return "academic"
    if any(k in t + s for k in ["como ", "guia", "manual", "tutorial", "passo a passo", "dicas", "aprenda", "entenda"]):
        return "tutorial"
    return "news"


def clean_text(x):
    if not x:
        return ""
    x = re.sub(r"<[^>]+>", "", x)
    x = re.sub(r"\s+", " ", x).strip()
    return x


def normalize_date(iso_guess):
    try:
        return (
            datetime.datetime.fromisoformat(iso_guess.replace("Z", "+00:00"))
            .astimezone(datetime.timezone.utc)
            .isoformat()
        )
    except:
        return datetime.datetime.now(datetime.timezone.utc).isoformat()


def load_overrides():
    path = ROOT / TARGET_DIR / "overrides.json"
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except:
            return []
    return []


def apply_overrides(items, overrides):
    by_url = {o.get("match_url"): o for o in overrides if o.get("match_url")}
    for it in items:
        o = by_url.get(it["url"])
        if o:
            for k in ["context", "objective", "result", "title", "source"]:
                if k in o and o[k]:
                    it[k] = o[k]
    return items


def main():
    all_entries = []

    # Inoreader public streams
    for src in INOREADER_SOURCES:
        url = src.get("url")
        if not url:
            continue
        try:
            html = fetch(url)
            parsed = parse_inoreader_html(html)
            forced = src.get("force_category")
            if forced:
                for p in parsed:
                    p["forced_category"] = forced
            all_entries.extend(parsed)
        except Exception as e:
            print(f"Failed to fetch Inoreader source {url}: {e}", file=sys.stderr)

    # Google Alerts Atom
    for url in GOOGLE_ALERTS_URLS:
        try:
            xml = fetch(url)
            ent = parse_atom_feed(xml)
            all_entries.extend(ent)
        except Exception as e:
            print(f"Failed to fetch {url}: {e}", file=sys.stderr)

    items = []
    for e in all_entries:
        if not e.get("url"):
            continue
        cat = classify(e.get("title", ""), e.get("url", ""), e.get("summary", ""))
        if e.get("forced_category"):
            cat = e.get("forced_category")
        src = hostname(e["url"]).replace("www.", "") if e.get("url") else ""
        item = {
            "id": e["url"],
            "title": clean_text(e.get("title", "")),
            "url": e["url"],
            "source": src,
            "published_at": normalize_date(e.get("published", "")),
            "category": cat,
            "teaser": clean_text(e.get("summary", ""))[:280],
        }
        items.append(item)

    # Sort, dedupe
    seen = set()
    deduped = []
    for it in sorted(items, key=lambda x: x["published_at"], reverse=True):
        if it["url"] in seen:
            continue
        seen.add(it["url"])
        deduped.append(it)

    deduped = apply_overrides(deduped, load_overrides())

    news_like = [it for it in deduped if it.get("category") == "news"]
    academics = [it for it in deduped if it.get("category") == "academic"]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(news_like, ensure_ascii=False, indent=2), encoding="utf-8")

    def to_academic(it):
        year = None
        try:
            year = datetime.datetime.fromisoformat(it.get("published_at")).year
        except Exception:
            pass
        return {
            "title": it.get("title", ""),
            "authors": "",
            "venue": it.get("source", ""),
            "year": year,
            "abstract": "",
            "url": it.get("url", ""),
        }

    # Se não houver itens acadêmicos do feed, usa fallback manual
    if not academics and FALLBACK_ACADEMICS.exists():
        try:
            OUT_ACADEMICS.write_text(FALLBACK_ACADEMICS.read_text(encoding="utf-8"), encoding="utf-8")
        except Exception:
            OUT_ACADEMICS.write_text(json.dumps([], ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        OUT_ACADEMICS.write_text(
            json.dumps([to_academic(a) for a in academics], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    print(
        f"Wrote {len(news_like)} news items to {OUT} and {len(academics)} academic items to {OUT_ACADEMICS}"
    )


if __name__ == "__main__":
    main()


