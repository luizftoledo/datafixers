#!/usr/bin/env python3
"""Find recent BBC Brasil videos whose public description/caption names the reporter."""
import datetime as dt
import json
import os
import re
import unicodedata

from update_video_monitor import CATALOG, apify_actor, get_json
from urllib.parse import urlencode

YOUTUBE_CHANNEL = 'UCthbIFAxbXTTQEC7EcQvP1Q'
INSTAGRAM_ACCOUNT = 'bbcbrasil'
TIKTOK_ACCOUNT = 'bbcnewsbrasil'
TIKTOK_OWN_ACCOUNT = 'luizftoledo'
LOOKBACK_DAYS = 14
NAME = re.compile(r'\b(?:luiz\s+(?:fernando\s+)?toledo|luizftoledo)\b')


def mentions_reporter(value):
    folded = unicodedata.normalize('NFKD', value or '')
    folded = ''.join(c for c in folded if not unicodedata.combining(c)).casefold()
    return bool(NAME.search(folded))


def youtube_recent(key, cutoff):
    channel = get_json('https://www.googleapis.com/youtube/v3/channels?' + urlencode({
        'part': 'contentDetails', 'id': YOUTUBE_CHANNEL, 'key': key
    }))['items'][0]
    uploads = channel['contentDetails']['relatedPlaylists']['uploads']
    ids, page = [], None
    while True:
        params = {'part': 'snippet,contentDetails', 'playlistId': uploads, 'maxResults': 50, 'key': key}
        if page:
            params['pageToken'] = page
        batch = get_json('https://www.googleapis.com/youtube/v3/playlistItems?' + urlencode(params))
        past_cutoff = False
        for item in batch.get('items', []):
            snippet = item.get('snippet', {})
            published = item.get('contentDetails', {}).get('videoPublishedAt', '')[:10]
            if published and published < cutoff:
                past_cutoff = True
                continue
            video_id = snippet.get('resourceId', {}).get('videoId')
            if video_id:
                ids.append(video_id)
        page = batch.get('nextPageToken')
        if past_cutoff or not page:
            break
    found = []
    for start in range(0, len(ids), 50):
        details = get_json('https://www.googleapis.com/youtube/v3/videos?' + urlencode({
            'part': 'snippet', 'id': ','.join(ids[start:start+50]), 'maxResults': 50, 'key': key
        }))
        for item in details.get('items', []):
            snippet = item.get('snippet', {})
            if snippet.get('channelId') != YOUTUBE_CHANNEL or not mentions_reporter(snippet.get('description')):
                continue
            video_id = item['id']
            found.append({'id': 'youtube:' + video_id, 'platform': 'youtube',
                          'platformId': video_id, 'url': 'https://www.youtube.com/watch?v=' + video_id,
                          'portfolioLabel': snippet.get('title') or video_id})
    return found


def instagram_recent(token, cutoff):
    actor_input = {
        'directUrls': [INSTAGRAM_ACCOUNT], 'resultsLimit': 150,
        'onlyPostsNewerThan': cutoff,
    }
    rows = apify_actor('zaver.api/instagram-reel-scraper', token, actor_input, timeout_seconds=1800)
    found = []
    for row in rows:
        code = row.get('shortcode')
        owner = row.get('username')
        caption = row.get('caption') or ''
        if not code or not owner or owner.casefold() != INSTAGRAM_ACCOUNT or not mentions_reporter(caption):
            continue
        label = next((line.strip() for line in caption.splitlines() if line.strip()), '')[:140]
        found.append({'id': 'instagram:' + code, 'platform': 'instagram',
                      'platformId': code, 'url': 'https://www.instagram.com/reel/' + code + '/',
                      'portfolioLabel': label or 'Reel da BBC News Brasil'})
    return found


def tiktok_recent(token, cutoff):
    rows = apify_actor('clockworks/free-tiktok-scraper', token, {
        'searchQueries': ['Luiz Fernando Toledo'], 'searchSection': '/video',
        'resultsPerPage': 50, 'shouldDownloadVideos': False,
        'shouldDownloadCovers': False,
    }, timeout_seconds=1800)
    found = []
    for row in rows:
        author = (row.get('authorMeta') or {}).get('name', '').casefold()
        caption = row.get('text') or ''
        published = (row.get('createTimeISO') or '')[:10]
        video_id = str(row.get('id') or '')
        credited_bbc = author == TIKTOK_ACCOUNT and mentions_reporter(caption)
        own_reporting = author == TIKTOK_OWN_ACCOUNT and any(
            word in caption.casefold() for word in ('bbc', 'investiga', 'reportagem'))
        if (not (credited_bbc or own_reporting) or not video_id or
                (published and published < cutoff)):
            continue
        label = next((line.strip() for line in caption.splitlines() if line.strip()), '')[:140]
        found.append({'id': 'tiktok:' + video_id, 'platform': 'tiktok',
                      'platformId': video_id,
                      'url': row.get('webVideoUrl') or f'https://www.tiktok.com/@{author}/video/{video_id}',
                      'portfolioLabel': label or 'BBC News Brasil TikTok video'})
    return found


def main():
    catalog = json.loads(CATALOG.read_text())
    by_id = {video['id']: video for video in catalog}
    cutoff = (dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=LOOKBACK_DAYS)).isoformat()
    results = {}
    for platform, credential, fetch in (
        ('youtube', os.getenv('YOUTUBE_API_KEY'), youtube_recent),
        ('instagram', os.getenv('APIFY_TOKEN'), instagram_recent),
        ('tiktok', os.getenv('APIFY_TOKEN'), tiktok_recent),
    ):
        if not credential:
            print(f'{platform}: credencial ausente; busca ignorada')
            continue
        try:
            results[platform] = fetch(credential, cutoff)
        except Exception as error:
            print(f'{platform}: busca falhou: {str(error)[:200]}')
    if not results:
        raise SystemExit('Nenhuma busca semanal foi concluída')
    added = []
    for platform, videos in results.items():
        for video in videos:
            if video['id'] not in by_id:
                by_id[video['id']] = video
                added.append(video['id'])
        print(f'{platform}: {len(videos)} menções verificadas')
    if added:
        CATALOG.write_text(json.dumps(list(by_id.values()), ensure_ascii=False, indent=2) + '\n')
    print(f'{len(added)} vídeos adicionados ao catálogo: {", ".join(added)}')


if __name__ == '__main__':
    main()
