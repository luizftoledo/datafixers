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
LOOKBACK_DAYS = 14
NAME = re.compile(r'\bluiz\s+fernando\s+toledo\b')


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
        'username': [INSTAGRAM_ACCOUNT], 'resultsLimit': 250,
        'onlyPostsNewerThan': cutoff, 'skipPinnedPosts': True,
        'includeTranscript': False, 'includeDownloadedVideo': False,
    }
    rows = apify_actor('apify/instagram-reel-scraper', token, actor_input, timeout_seconds=3600)
    found = []
    for row in rows:
        code = row.get('shortCode') or row.get('shortcode')
        owner = row.get('ownerUsername') or (row.get('owner') or {}).get('username')
        caption = row.get('caption') or ''
        if not code or not owner or owner.casefold() != INSTAGRAM_ACCOUNT or not mentions_reporter(caption):
            continue
        label = next((line.strip() for line in caption.splitlines() if line.strip()), '')[:140]
        found.append({'id': 'instagram:' + code, 'platform': 'instagram',
                      'platformId': code, 'url': 'https://www.instagram.com/reel/' + code + '/',
                      'portfolioLabel': label or 'Reel da BBC News Brasil'})
    return found


def main():
    catalog = json.loads(CATALOG.read_text())
    by_id = {video['id']: video for video in catalog}
    cutoff = (dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=LOOKBACK_DAYS)).isoformat()
    results = {}
    for platform, credential, fetch in (
        ('youtube', os.getenv('YOUTUBE_API_KEY'), youtube_recent),
        ('instagram', os.getenv('APIFY_TOKEN'), instagram_recent),
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
