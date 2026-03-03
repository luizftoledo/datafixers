#!/usr/bin/env python3
"""Atualiza a curadoria da página A LAI que pegou.

- Baixa feeds configurados em data/feed_sources.json
- Deduplica links (com limpeza de redirecionadores Google/Bing)
- Atualiza feeds.json e academics.json
- Gera featured.json (destaques automáticos)
- Gera meta.json (contagens e data da atualização)
"""

from __future__ import annotations

import argparse
import email.utils
import hashlib
import html
import json
import re
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}

TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "oc",
    "ct",
    "cd",
    "usg",
    "rct",
    "sa",
    "ref",
    "mkt",
    "aid",
    "tid",
}

AGGREGATOR_HOSTS = {
    "google.com",
    "google.co.uk",
    "google.co.in",
    "news.google.com",
    "bing.com",
    "www.bing.com",
}

INVESTIGATIVE_TERMS = [
    "exclusivo",
    "investiga",
    "investigacao",
    "levantamento",
    "dados",
    "omite",
    "sigilo",
    "negou",
    "nega",
    "revela",
    "documento",
]

PRESS_RELEASE_TERMS = [
    "workshop",
    "seminario",
    "capacitação",
    "capacitacao",
    "evento",
    "encontro",
    "semana da lei",
    "lança",
    "lanca",
    "fortalece",
]

TRUSTED_OUTLETS = {
    "g1.globo.com",
    "www1.folha.uol.com.br",
    "folha.uol.com.br",
    "metropoles.com",
    "valor.globo.com",
    "oglobo.globo.com",
    "agenciapublica.org",
    "jota.info",
    "uol.com.br",
    "bbc.com",
    "bbc.co.uk",
    "reuters.com",
    "apnews.com",
}


@dataclass
class FeedSource:
    name: str
    url: str
    category: str
    max_items: int = 250


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_iso_z(dt: datetime | None) -> str:
    if not dt:
        return ""
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    text = raw.strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        pass
    try:
        parsed = email.utils.parsedate_to_datetime(text)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return None


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    text = html.unescape(value)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_text(value: str | None) -> str:
    text = clean_text(value).lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return text


def looks_relevant_to_lai(title: str, teaser: str) -> bool:
    text = normalize_text(f"{title} {teaser}")
    if "lei de acesso" in text:
        return True
    if "acesso a informacao" in text:
        return True
    if "pedido de informacao" in text or "pedidos de informacao" in text:
        return True
    if "lai" in text and any(token in text for token in ["informacao", "transparencia", "sigilo", "pedido"]):
        return True
    return False


def source_from_url(url: str) -> str:
    try:
        hostname = urllib.parse.urlparse(url).hostname or ""
    except Exception:
        return ""
    return hostname.lower().replace("www.", "")


def is_aggregator_host(host: str) -> bool:
    clean = (host or "").lower().replace("www.", "")
    return clean in AGGREGATOR_HOSTS


def title_fingerprint(title: str) -> str:
    text = normalize_text(title)
    text = re.sub(r"[^a-z0-9]+", " ", text).strip()
    parts = [p.strip() for p in normalize_text(title).split(" - ") if p.strip()]
    if len(parts) > 1 and len(parts[0]) >= 28:
        text = re.sub(r"[^a-z0-9]+", " ", parts[0]).strip()
    text = re.sub(r"\s+", " ", text)
    tokens = text.split()
    return " ".join(tokens[:18])


def unwrap_redirect(raw_url: str) -> str:
    if not raw_url:
        return ""
    parsed = urllib.parse.urlparse(raw_url)
    host = (parsed.hostname or "").lower()
    query = urllib.parse.parse_qs(parsed.query)

    if "google." in host and parsed.path == "/url":
        for key in ("url", "q"):
            values = query.get(key)
            if values and values[0]:
                return values[0]

    if host.endswith("bing.com") and parsed.path.endswith("/news/apiclick.aspx"):
        values = query.get("url")
        if values and values[0]:
            return values[0]

    return raw_url


def canonicalize_url(raw_url: str) -> str:
    unwrapped = unwrap_redirect(raw_url).strip()
    if not unwrapped:
        return ""

    parsed = urllib.parse.urlparse(unwrapped)
    if not parsed.scheme:
        parsed = urllib.parse.urlparse(f"https://{unwrapped}")

    host = (parsed.netloc or "").lower()
    if host.endswith(":80"):
        host = host[:-3]
    if host.endswith(":443"):
        host = host[:-4]

    kept_params: list[tuple[str, str]] = []
    for key, values in urllib.parse.parse_qs(parsed.query, keep_blank_values=False).items():
        if key.lower() in TRACKING_PARAMS:
            continue
        for value in values:
            kept_params.append((key, value))

    kept_params.sort(key=lambda kv: (kv[0].lower(), kv[1]))
    query = urllib.parse.urlencode(kept_params, doseq=True)

    clean_path = parsed.path or "/"
    fragment = ""

    return urllib.parse.urlunparse((parsed.scheme.lower() or "https", host, clean_path, "", query, fragment))


def stable_id_from_url(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:14]


def fetch_bytes(url: str, timeout: int = 35) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; DatafixersCuradoriaBot/1.0)",
            "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def parse_atom(root: ET.Element) -> Iterable[dict]:
    for entry in root.findall("atom:entry", ATOM_NS):
        title = clean_text(entry.findtext("atom:title", default="", namespaces=ATOM_NS))

        link_el = entry.find("atom:link[@rel='alternate']", ATOM_NS) or entry.find("atom:link", ATOM_NS)
        link = (link_el.get("href", "") if link_el is not None else "").strip()

        published = (
            entry.findtext("atom:published", default="", namespaces=ATOM_NS)
            or entry.findtext("atom:updated", default="", namespaces=ATOM_NS)
        )

        summary = clean_text(entry.findtext("atom:summary", default="", namespaces=ATOM_NS))
        if not summary:
            content_el = entry.find("atom:content", ATOM_NS)
            summary = clean_text(content_el.text if content_el is not None else "")

        if title and link:
            yield {
                "title": title,
                "url": link,
                "published_at": to_iso_z(parse_dt(published)) if published else "",
                "teaser": summary,
            }


def parse_rss(root: ET.Element) -> Iterable[dict]:
    for item in root.findall(".//item"):
        title = clean_text(item.findtext("title", default=""))
        link = clean_text(item.findtext("link", default=""))
        published = item.findtext("pubDate", default="")
        teaser = clean_text(item.findtext("description", default=""))
        source_el = item.find("source")
        source_url = (source_el.get("url", "").strip() if source_el is not None else "")
        source_name = clean_text(source_el.text if source_el is not None else "")
        source = source_from_url(source_url) if source_url else source_name

        if title and link:
            yield {
                "title": title,
                "url": link,
                "published_at": to_iso_z(parse_dt(published)) if published else "",
                "teaser": teaser,
                "source": source,
            }


def parse_feed(payload: bytes) -> list[dict]:
    root = ET.fromstring(payload)
    if root.tag.endswith("feed"):
        return list(parse_atom(root))
    return list(parse_rss(root))


def read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_sources(path: Path) -> tuple[list[FeedSource], list[FeedSource], int, int]:
    cfg = read_json(path, {})
    keep_history = int(cfg.get("keep_history", 1800))
    featured_count = int(cfg.get("featured_count", 5))

    def _items(key: str, category: str) -> list[FeedSource]:
        entries: list[FeedSource] = []
        for row in cfg.get(key, []):
            url = str(row.get("url", "")).strip()
            name = str(row.get("name", "")).strip() or url
            if not url:
                continue
            entries.append(
                FeedSource(
                    name=name,
                    url=url,
                    category=category,
                    max_items=int(row.get("max_items", 250)),
                )
            )
        return entries

    return _items("news_feeds", "news"), _items("academic_feeds", "academics"), keep_history, featured_count


def merge_items(
    existing_items: list[dict],
    incoming_items: list[dict],
    *,
    category: str,
    keep_history: int,
    updated_at: datetime,
    require_lai_relevance: bool,
) -> tuple[list[dict], int]:
    existing_index: dict[str, dict] = {}
    for item in existing_items:
        canonical = canonicalize_url(item.get("url") or item.get("id", ""))
        if not canonical:
            continue
        copy = dict(item)
        copy["url"] = canonical
        copy["id"] = stable_id_from_url(canonical)
        if not copy.get("source"):
            copy["source"] = source_from_url(canonical)
        if not copy.get("first_seen_at"):
            copy["first_seen_at"] = copy.get("published_at") or to_iso_z(updated_at)
        copy["category"] = category
        existing_index[canonical] = copy

    added_count = 0
    for raw in incoming_items:
        canonical = canonicalize_url(raw.get("url", ""))
        if not canonical:
            continue
        title = clean_text(raw.get("title", ""))
        teaser = clean_text(raw.get("teaser", ""))
        if not title:
            continue
        if require_lai_relevance and not looks_relevant_to_lai(title, teaser):
            continue

        published_at = raw.get("published_at") or ""
        raw_source = clean_text(raw.get("source") or "")
        canonical_source = clean_text(source_from_url(canonical))
        if raw_source and raw_source.lower() not in AGGREGATOR_HOSTS:
            source = raw_source
        else:
            source = canonical_source or raw_source

        current = existing_index.get(canonical)
        if current:
            current["title"] = title or current.get("title", "")
            current["teaser"] = teaser or current.get("teaser", "")
            current["source"] = source or current.get("source", "")
            if published_at:
                old_dt = parse_dt(current.get("published_at"))
                new_dt = parse_dt(published_at)
                if not old_dt or (new_dt and new_dt > old_dt):
                    current["published_at"] = to_iso_z(new_dt)
            continue

        added_count += 1
        existing_index[canonical] = {
            "id": stable_id_from_url(canonical),
            "title": title,
            "url": canonical,
            "source": source,
            "published_at": published_at,
            "category": category,
            "teaser": teaser,
            "first_seen_at": to_iso_z(updated_at),
        }

    result = list(existing_index.values())
    if category == "news":
        clean_news = []
        for item in result:
            url = item.get("url", "")
            if "/alerts/feeds/" in url:
                continue
            if not looks_relevant_to_lai(item.get("title", ""), item.get("teaser", "")):
                continue
            clean_news.append(item)
        deduped_by_title: dict[str, dict] = {}
        for item in clean_news:
            fp = title_fingerprint(item.get("title", "")) or stable_id_from_url(item.get("url", ""))
            current = deduped_by_title.get(fp)
            if not current:
                deduped_by_title[fp] = item
                continue

            current_source = current.get("source") or source_from_url(current.get("url", ""))
            item_source = item.get("source") or source_from_url(item.get("url", ""))

            current_is_agg = is_aggregator_host(current_source) or is_aggregator_host(source_from_url(current.get("url", "")))
            item_is_agg = is_aggregator_host(item_source) or is_aggregator_host(source_from_url(item.get("url", "")))

            if current_is_agg and not item_is_agg:
                deduped_by_title[fp] = item
                continue

            current_pub = parse_dt(current.get("published_at")) or datetime(1970, 1, 1, tzinfo=timezone.utc)
            item_pub = parse_dt(item.get("published_at")) or datetime(1970, 1, 1, tzinfo=timezone.utc)
            if item_pub > current_pub:
                deduped_by_title[fp] = item

        result = list(deduped_by_title.values())

    def sort_key(item: dict) -> tuple[datetime, datetime]:
        published = parse_dt(item.get("published_at")) or datetime(1970, 1, 1, tzinfo=timezone.utc)
        first_seen = parse_dt(item.get("first_seen_at")) or datetime(1970, 1, 1, tzinfo=timezone.utc)
        return (published, first_seen)

    result.sort(key=sort_key, reverse=True)
    return result[:keep_history], added_count


def score_for_featured(item: dict, ref_date: datetime) -> float:
    title_norm = normalize_text(item.get("title", ""))
    source = (item.get("source") or "").lower()
    published = parse_dt(item.get("published_at"))

    score = 0.0

    if any(term in title_norm for term in INVESTIGATIVE_TERMS):
        score += 4.0
    if any(term in title_norm for term in PRESS_RELEASE_TERMS):
        score -= 2.0
    if source in TRUSTED_OUTLETS:
        score += 2.5

    teaser = clean_text(item.get("teaser", ""))
    if len(teaser) > 140:
        score += 1.0

    if published:
        age_days = max((ref_date - published).days, 0)
        score += max(0.0, 3.0 - (age_days / 25.0))

    return score


def reason_for_featured(item: dict) -> str:
    title_norm = normalize_text(item.get("title", ""))
    if any(term in title_norm for term in INVESTIGATIVE_TERMS):
        return "Apuração com potencial de uso prático da LAI."
    if any(term in title_norm for term in PRESS_RELEASE_TERMS):
        return "Tema relevante de transparência pública."
    return "Link recente que menciona LAI ou pedido de informação."


def build_featured(news_items: list[dict], count: int, ref_date: datetime) -> list[dict]:
    candidates = []
    recency_limit = ref_date - timedelta(days=180)

    for item in news_items:
        published = parse_dt(item.get("published_at"))
        if published and published < recency_limit:
            continue
        candidates.append(item)

    if not candidates:
        candidates = news_items[:]

    ranked = sorted(
        candidates,
        key=lambda item: (score_for_featured(item, ref_date), parse_dt(item.get("published_at")) or datetime(1970, 1, 1, tzinfo=timezone.utc)),
        reverse=True,
    )

    featured: list[dict] = []
    source_cap: dict[str, int] = {}
    seen_titles: set[str] = set()
    for item in ranked:
        fp = title_fingerprint(item.get("title", ""))
        if fp and fp in seen_titles:
            continue

        source = (item.get("source") or "").lower()
        if source and source_cap.get(source, 0) >= 2:
            continue
        source_cap[source] = source_cap.get(source, 0) + 1
        if fp:
            seen_titles.add(fp)
        featured.append(
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "url": item.get("url"),
                "source": item.get("source"),
                "published_at": item.get("published_at"),
                "teaser": item.get("teaser", ""),
                "why_featured": reason_for_featured(item),
                "score": round(score_for_featured(item, ref_date), 2),
            }
        )
        if len(featured) >= count:
            break

    return featured


def run(data_dir: Path, dry_run: bool) -> int:
    feeds_path = data_dir / "feeds.json"
    academics_path = data_dir / "academics.json"
    academics_fallback_path = data_dir / "academics_fallback.json"
    featured_path = data_dir / "featured.json"
    meta_path = data_dir / "meta.json"
    sources_cfg = data_dir / "feed_sources.json"

    news_sources, academic_sources, keep_history, featured_count = load_sources(sources_cfg)
    updated_at = now_utc()

    incoming_news: list[dict] = []
    incoming_academics: list[dict] = []

    for source in news_sources + academic_sources:
        try:
            payload = fetch_bytes(source.url)
            rows = parse_feed(payload)
        except Exception as exc:
            print(f"[warn] falha ao baixar {source.name}: {exc}")
            continue

        rows = rows[: source.max_items]
        for row in rows:
            row["category"] = source.category
            row["feed_name"] = source.name
            row["source"] = row.get("source") or source_from_url(row.get("url", ""))
        if source.category == "news":
            incoming_news.extend(rows)
        else:
            incoming_academics.extend(rows)

    existing_news = read_json(feeds_path, [])
    merged_news, added_news = merge_items(
        existing_news,
        incoming_news,
        category="news",
        keep_history=keep_history,
        updated_at=updated_at,
        require_lai_relevance=True,
    )

    existing_academics = read_json(academics_path, [])
    merged_academics, added_academics = merge_items(
        existing_academics,
        incoming_academics,
        category="academics",
        keep_history=max(400, keep_history // 2),
        updated_at=updated_at,
        require_lai_relevance=False,
    )

    if len(merged_academics) < 8:
        fallback = read_json(academics_fallback_path, [])
        merged_academics, _ = merge_items(
            merged_academics,
            fallback,
            category="academics",
            keep_history=max(400, keep_history // 2),
            updated_at=updated_at,
            require_lai_relevance=False,
        )

    featured = build_featured(merged_news, count=featured_count, ref_date=updated_at)
    featured_dedup: dict[str, dict] = {}
    for item in featured:
        fp = title_fingerprint(item.get("title", "")) or item.get("id", "")
        if fp and fp not in featured_dedup:
            featured_dedup[fp] = item
    featured = list(featured_dedup.values())[:featured_count]

    recent_cutoff = updated_at - timedelta(days=30)
    new_last_30d = sum(
        1
        for item in merged_news
        if (parse_dt(item.get("first_seen_at")) or datetime(1970, 1, 1, tzinfo=timezone.utc)) >= recent_cutoff
    )

    meta = {
        "updated_at": to_iso_z(updated_at),
        "news_count": len(merged_news),
        "academics_count": len(merged_academics),
        "new_links_30d": new_last_30d,
        "sources_monitored": len(news_sources) + len(academic_sources),
        "last_run": {
            "added_news": added_news,
            "added_academics": added_academics,
        },
    }

    print(f"[info] notícias: {len(merged_news)} (novas nesta execução: {added_news})")
    print(f"[info] acadêmicos: {len(merged_academics)} (novas nesta execução: {added_academics})")
    print(f"[info] destaques automáticos: {len(featured)}")

    if dry_run:
        print("[info] modo dry-run: sem gravação de arquivos")
        return 0

    write_json(feeds_path, merged_news)
    write_json(academics_path, merged_academics)
    write_json(featured_path, featured)
    write_json(meta_path, meta)
    print("[ok] arquivos atualizados")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Atualiza curadoria LAI (reportagens + destaques)")
    parser.add_argument(
        "--data-dir",
        default=str(Path(__file__).resolve().parents[1] / "data"),
        help="Diretório de dados (padrão: a_lai_que_pegou/data)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Executa sem gravar arquivos")
    args = parser.parse_args()

    data_dir = Path(args.data_dir).resolve()
    return run(data_dir=data_dir, dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
