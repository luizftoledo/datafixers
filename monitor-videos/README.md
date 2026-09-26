# Video reporting monitor

Public panel: https://datafixers.org/monitor-videos/. The page is in English; titles and public comments retain their original language. `videos.json` lists monitored posts, and `data.json` stores dated snapshots. The page sums public **plays/views**, not unique people.

## Collection

The GitHub Actions workflow `.github/workflows/monitor-videos.yml` runs daily at 08:17 UTC. It updates counters and commits `data.json`, then deploys to Cloudflare Pages. Each Monday at 09:17 UTC, it also checks recently published posts for “Luiz Fernando Toledo”, “Luiz Toledo” or `@luizftoledo` in:

- the BBC News Brasil YouTube channel descriptions, using YouTube Data API v3;
- Reels from `@bbcbrasil`, using a bounded Apify run;
- TikTok video search, accepting credited posts from the BBC News Brasil account `@bbcnewsbrasil` and reporting posts from `@luizftoledo`.

The weekly search uses a 14-day cutoff, a maximum of 150 Instagram Reels and 50 TikTok search results. It adds matching IDs once. This is a bounded discovery window, not an exhaustive archive scan. Byline-free posts, spoken credits, other accounts and content outside the window need to be added to `videos.json` manually.

YouTube counters come from `statistics`. Instagram counters come from the public **play** count returned by `zaver.api/instagram-reel-scraper`; this differs from Instagram's older `video_view_count`, which can substantially undercount what the app displays. TikTok counters come from `clockworks/free-tiktok-scraper`. Missing counters stay null. Older snapshots are not rewritten.

Recent top-level YouTube comments are retained as a partial sample. The monitor no longer runs a separate Instagram comment scrape each day, which previously exhausted the monthly quota. It still records Instagram's total public comment count.

## Secrets and cost

Set repository secrets `YOUTUBE_API_KEY`, `APIFY_TOKEN`, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never put a token in a URL, source file or JSON. The actor runs are restricted to the catalog or a bounded discovery window; usage and remaining credit should be checked in Apify as the catalog grows. Locally, provide keys through environment variables and run `python3 scripts/discover_video_monitor.py` followed by `python3 scripts/update_video_monitor.py`.

The history begins with the first collection. A change is the difference between two snapshots and may be negative after a platform correction. Public comments, author names and comment text in `data.json` are visible to anyone with the URL; the page remains `noindex`.
