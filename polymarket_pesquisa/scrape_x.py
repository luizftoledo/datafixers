#!/usr/bin/env python3
"""
Raspagem one-shot de tweets sobre Polymarket vs. institutos de pesquisa.

Usa o actor `apidojo/tweet-scraper` na plataforma Apify.
Custo aprox.: US$ 0,40 por 1.000 tweets coletados.

Uso:
    export APIFY_TOKEN=apify_api_...
    python scrape_x.py                       # roda tudo do queries.yaml
    python scrape_x.py --group polymarket_generico
    python scrape_x.py --max-items 5000      # cap por termo
    python scrape_x.py --dry-run             # lista runs sem disparar

Saída:
    data/raw/<grupo>__<query>.jsonl
    data/processed/all_tweets.csv
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import requests
import yaml

APIFY_BASE = "https://api.apify.com/v2"
ACTOR_ID = "apidojo~tweet-scraper"
POLL_INTERVAL = 10
RUN_TIMEOUT = 60 * 30
_TOKEN_RE = re.compile(r"apify_api_[A-Za-z0-9]{10,}")


def redact(text: str) -> str:
    return _TOKEN_RE.sub("apify_api_[REDACTED]", str(text))


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"


def slugify(text: str) -> str:
    keep = set("abcdefghijklmnopqrstuvwxyz0123456789-_")
    return "".join(c if c.lower() in keep else "_" for c in text.lower())[:60].strip("_")


def load_queries(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def start_run(token, search_terms, lang, start, end, max_items, sort):
    payload = {
        "searchTerms": search_terms,
        "maxItems": max_items,
        "sort": sort,
        "tweetLanguage": lang,
        "start": start,
        "end": end,
    }
    r = requests.post(
        f"{APIFY_BASE}/acts/{ACTOR_ID}/runs",
        headers=auth_headers(token),
        json=payload,
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["data"]["id"]


def wait_run(token, run_id, timeout=RUN_TIMEOUT):
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(
            f"{APIFY_BASE}/actor-runs/{run_id}",
            headers=auth_headers(token),
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()["data"]
        if data["status"] in {"SUCCEEDED", "FAILED", "TIMED_OUT", "ABORTED"}:
            return data
        time.sleep(POLL_INTERVAL)
    raise TimeoutError(f"Run {run_id} did not finish in {timeout}s")


def fetch_items(token, dataset_id):
    items, offset, limit = [], 0, 1000
    while True:
        r = requests.get(
            f"{APIFY_BASE}/datasets/{dataset_id}/items",
            headers=auth_headers(token),
            params={"format": "json", "offset": offset, "limit": limit},
            timeout=120,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        items.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return items


def normalize(item, group, term):
    author = item.get("author") or {}
    hashtags = item.get("hashtags") or []
    if hashtags and isinstance(hashtags[0], dict):
        hashtags = [h.get("text", "") for h in hashtags]
    mentions = item.get("mentions") or []
    if mentions and isinstance(mentions[0], dict):
        mentions = [m.get("userName") or m.get("username") or "" for m in mentions]
    media = item.get("mediaUrls") or item.get("media") or []
    if media and isinstance(media[0], dict):
        media = [m.get("url", "") for m in media]
    return {
        "query_group": group,
        "query_term": term,
        "tweet_id": item.get("id"),
        "url": item.get("url") or item.get("twitterUrl"),
        "created_at": item.get("createdAt"),
        "lang": item.get("lang"),
        "text": item.get("fullText") or item.get("text"),
        "author_handle": author.get("userName") or author.get("username"),
        "author_name": author.get("name"),
        "author_followers": author.get("followers") or author.get("followersCount"),
        "author_following": author.get("following") or author.get("followingCount"),
        "author_verified": author.get("isVerified"),
        "author_blue": author.get("isBlueVerified"),
        "author_bio": author.get("description"),
        "likes": item.get("likeCount"),
        "retweets": item.get("retweetCount"),
        "replies": item.get("replyCount"),
        "quotes": item.get("quoteCount"),
        "views": item.get("viewCount"),
        "bookmarks": item.get("bookmarkCount"),
        "is_reply": item.get("isReply"),
        "is_quote": item.get("isQuote"),
        "is_retweet": item.get("isRetweet"),
        "hashtags": ",".join(hashtags),
        "mentions": ",".join(mentions),
        "media_urls": ",".join(media),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--queries", default=str(ROOT / "queries.yaml"))
    ap.add_argument("--max-items", type=int, default=1000,
                    help="Tweets máx. por termo de busca (default: 1000)")
    ap.add_argument("--sort", default="Latest", choices=["Latest", "Top"])
    ap.add_argument("--group", help="Rodar só um grupo (default: todos)")
    ap.add_argument("--dry-run", action="store_true",
                    help="Lista o que rodaria, sem disparar (não gasta crédito)")
    args = ap.parse_args()

    token = os.environ.get("APIFY_TOKEN")
    if not token and not args.dry_run:
        sys.exit(
            "ERRO: defina APIFY_TOKEN.\n"
            "  Pegue em https://console.apify.com/account/integrations\n"
            "  export APIFY_TOKEN=apify_api_..."
        )

    cfg = load_queries(Path(args.queries))
    start, end = cfg["start_date"], cfg["end_date"]
    groups = cfg["groups"]
    if args.group:
        if args.group not in groups:
            sys.exit(f"ERRO: grupo '{args.group}' não existe. Disponíveis: {list(groups)}")
        groups = {args.group: groups[args.group]}

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    all_rows, summary = [], []
    total_terms = sum(len(g["terms"]) for g in groups.values())
    est_cost = total_terms * args.max_items * 0.40 / 1000
    print(f"Plano: {total_terms} runs × até {args.max_items} tweets = ~{total_terms * args.max_items} tweets")
    print(f"Custo estimado (Apify apidojo/tweet-scraper): ~US$ {est_cost:.2f}")
    print(f"Janela: {start} → {end}\n")

    for group_name, group_cfg in groups.items():
        lang = group_cfg.get("lang", "pt")
        for term in group_cfg["terms"]:
            tag = f"{group_name}__{slugify(term)}"
            print(f"=== {tag}")
            print(f"    lang={lang}  range={start}..{end}  max={args.max_items}  sort={args.sort}")
            if args.dry_run:
                summary.append({"group": group_name, "term": term, "items": "DRY"})
                continue

            try:
                run_id = start_run(token, [term], lang, start, end, args.max_items, args.sort)
            except requests.HTTPError as e:
                print(f"    HTTPError ao iniciar: {redact(e)} — pulando")
                summary.append({"group": group_name, "term": term, "items": 0, "status": "START_FAIL"})
                continue
            print(f"    run_id={run_id}; aguardando…")
            run = wait_run(token, run_id)
            if run["status"] != "SUCCEEDED":
                print(f"    status={run['status']} — pulando")
                summary.append({"group": group_name, "term": term, "items": 0, "status": run["status"]})
                continue

            items = fetch_items(token, run["defaultDatasetId"])
            print(f"    {len(items)} tweets coletados")

            with open(RAW_DIR / f"{tag}.jsonl", "w", encoding="utf-8") as f:
                for it in items:
                    f.write(json.dumps(it, ensure_ascii=False) + "\n")
            for it in items:
                all_rows.append(normalize(it, group_name, term))
            summary.append({"group": group_name, "term": term, "items": len(items)})

    if not args.dry_run and all_rows:
        import pandas as pd
        df = pd.DataFrame(all_rows).drop_duplicates(subset=["tweet_id"])
        out = PROCESSED_DIR / "all_tweets.csv"
        df.to_csv(out, index=False)
        print(f"\nConsolidado: {len(df)} tweets únicos → {out}")

    print("\nResumo por termo:")
    for s in summary:
        print(f"  {s}")


if __name__ == "__main__":
    main()
