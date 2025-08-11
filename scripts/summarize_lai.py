#!/usr/bin/env python3
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List

import requests
from trafilatura import extract, fetch_url


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "a_lai_que_pegou" / "data"
FEEDS_JSON = DATA_DIR / "feeds.json"
SUMMARIES_JSON = DATA_DIR / "summaries.json"


def load_items() -> List[Dict]:
    if not FEEDS_JSON.exists():
        return []
    try:
        return json.loads(FEEDS_JSON.read_text(encoding="utf-8"))
    except Exception:
        return []


def load_existing_summaries() -> Dict[str, Dict]:
    if not SUMMARIES_JSON.exists():
        return {}
    try:
        return json.loads(SUMMARIES_JSON.read_text(encoding="utf-8"))
    except Exception:
        return {}


def extract_article_text(url: str) -> str:
    try:
        downloaded = fetch_url(url)
        if not downloaded:
            return ""
        # favor full text, keep links off
        text = extract(downloaded, include_comments=False, include_tables=False, favor_precision=True)
        return (text or "").strip()
    except Exception:
        return ""


def call_openai(prompt: str, content: str) -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return "Resumo indisponível: configure a variável OPENAI_API_KEY nos secrets do GitHub."
    # Lazy import to avoid dependency if absent
    try:
        from openai import OpenAI
    except Exception:
        return "Resumo indisponível: biblioteca openai não instalada."

    client = OpenAI(api_key=api_key)
    try:
        resp = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": content[:120000]},
            ],
            temperature=0.2,
            max_tokens=600,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"Resumo indisponível: erro ao chamar o provedor de IA ({e})."


DEFAULT_PROMPT = (
    "Você é um assistente que resume matérias jornalísticas completas de forma fiel, clara e "
    "organizada. Produza: 1) Tópicos principais (bullet points curtos); 2) Contexto e dados obtidos via LAI; "
    "3) Impacto/consequências. Evite opinião. Máx. ~1600 caracteres."
)


def main() -> int:
    items = load_items()
    if not items:
        print("No items in feeds.json; nothing to summarize.")
        return 0

    existing = load_existing_summaries()
    out: Dict[str, Dict] = dict(existing)

    # limit per run to avoid rate limits
    limit = int(os.environ.get("SUMMARY_LIMIT", "15"))
    processed = 0

    for it in items:
        url = it.get("url") or it.get("id")
        title = it.get("title", "")
        if not url:
            continue
        if url in out and out[url].get("summary"):
            continue

        article = extract_article_text(url)
        if not article:
            out[url] = {"title": title, "summary": "Resumo indisponível: não foi possível extrair o texto do link."}
            continue

        prompt = os.environ.get("SUMMARY_PROMPT", DEFAULT_PROMPT)
        summary = call_openai(prompt, f"Título: {title}\n\nTexto:\n{article}")
        out[url] = {"title": title, "summary": summary}
        processed += 1

        # gentle pacing
        time.sleep(0.5)
        if processed >= limit:
            break

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SUMMARIES_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out)} summaries to {SUMMARIES_JSON}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


