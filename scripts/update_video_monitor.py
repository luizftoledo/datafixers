#!/usr/bin/env python3
"""Collect public portfolio video counters and recent top-level comments."""
import datetime as dt
import json
import os
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1] / 'monitor-videos'
CATALOG = ROOT / 'videos.json'
DATA = ROOT / 'data.json'
TODAY = dt.datetime.now(dt.timezone.utc).date().isoformat()
NOW = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')


def get_json(url, headers=None, payload=None, timeout=45):
    request = Request(url, headers=headers or {}, data=payload)
    if payload is not None:
        request.add_header('Content-Type', 'application/json')
        request.method = 'POST'
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except HTTPError as error:
        raise RuntimeError(f'HTTP {error.code} from source API') from error
    except URLError as error:
        raise RuntimeError(str(error.reason)) from error


def youtube(catalog, api_key):
    videos = [v for v in catalog if v['platform'] == 'youtube']
    found = {}
    for start in range(0, len(videos), 50):
        ids = ','.join(v['platformId'] for v in videos[start:start+50])
        data = get_json('https://www.googleapis.com/youtube/v3/videos?' + urlencode({
            'part': 'snippet,statistics', 'id': ids, 'key': api_key, 'maxResults': 50
        }))
        found.update({item['id']: item for item in data.get('items', [])})
    result, comments = {}, []
    for video in videos:
        item = found.get(video['platformId'])
        if not item:
            result[video['id']] = {'error': 'Vídeo indisponível na API do YouTube'}
            continue
        stats = item.get('statistics', {})
        result[video['id']] = {
            'title': item.get('snippet', {}).get('title') or video['portfolioLabel'],
            'views': to_number(stats.get('viewCount')),
            'likes': to_number(stats.get('likeCount')),
            'comments': to_number(stats.get('commentCount')),
            'source': 'YouTube Data API',
        }
        page = None
        for _ in range(3):  # newest 300 top-level comments per video at most
            params = {'part': 'snippet', 'videoId': video['platformId'], 'order': 'time',
                      'maxResults': 100, 'textFormat': 'plainText', 'key': api_key}
            if page:
                params['pageToken'] = page
            try:
                batch = get_json('https://www.googleapis.com/youtube/v3/commentThreads?' + urlencode(params))
            except RuntimeError as error:
                result[video['id']]['commentsError'] = str(error)[:180]
                break
            for thread in batch.get('items', []):
                item_snippet = thread.get('snippet', {}).get('topLevelComment', {}).get('snippet', {})
                comment_id = thread.get('snippet', {}).get('topLevelComment', {}).get('id') or thread.get('id')
                if comment_id:
                    comments.append({'id': 'youtube:' + comment_id, 'videoId': video['id'],
                        'text': item_snippet.get('textDisplay', ''),
                        'author': item_snippet.get('authorDisplayName', ''),
                        'publishedAt': item_snippet.get('publishedAt'),
                        'url': f"https://www.youtube.com/watch?v={video['platformId']}&lc={comment_id}"})
            page = batch.get('nextPageToken')
            if not page:
                break
    return result, comments


def to_number(value):
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def apify_actor(actor, token, actor_input, timeout_seconds=900):
    actor_id = actor.replace('/', '~')
    headers = {'Authorization': 'Bearer ' + token}
    started = get_json(f'https://api.apify.com/v2/acts/{actor_id}/runs', headers,
                       json.dumps(actor_input).encode())['data']
    run_id = started['id']
    for _ in range(max(1, timeout_seconds // 10)):
        status = get_json('https://api.apify.com/v2/actor-runs/' + run_id, headers)['data']
        if status['status'] == 'SUCCEEDED':
            return get_json('https://api.apify.com/v2/datasets/' +
                            status['defaultDatasetId'] + '/items?clean=true', headers)
        if status['status'] in {'FAILED', 'ABORTED', 'TIMED-OUT'}:
            raise RuntimeError(f'Apify {actor}: execução {status["status"]}')
        time.sleep(10)
    raise RuntimeError(f'Apify {actor}: execução excedeu {timeout_seconds // 60} minutos')


def instagram(catalog, token):
    videos = [v for v in catalog if v['platform'] == 'instagram']
    urls = [v['url'] for v in videos]
    posts = apify_actor('apify/instagram-reel-scraper', token,
                        {'username': urls, 'includeTranscript': False,
                         'includeDownloadedVideo': False})
    by_code = {v['platformId']: v for v in videos}
    result = {}
    for post in posts:
        code = post.get('shortCode') or post.get('shortcode')
        video = by_code.get(code)
        if not video:
            continue
        result[video['id']] = {
            'title': next((line.strip() for line in (post.get('caption') or '').splitlines() if line.strip()),
                          video['portfolioLabel'])[:140],
            'views': to_number(post.get('videoPlayCount') if post.get('videoPlayCount') is not None else post.get('videoViewCount')),
            'likes': to_number(post.get('likesCount')),
            'comments': to_number(post.get('commentsCount')),
            'source': 'Apify / Instagram público',
        }
    for video in videos:
        result.setdefault(video['id'], {'error': 'Post não retornado pelo ator da Apify'})
    try:
        rows = apify_actor('apify/instagram-comment-scraper', token,
                           {'directUrls': urls, 'resultsLimit': 20, 'includeNestedComments': False})
    except RuntimeError as error:
        for value in result.values():
            value['commentsError'] = str(error)
        rows = []
    comments = []
    for row in rows:
        url = row.get('postUrl') or row.get('inputUrl') or row.get('url') or ''
        code = next((code for code in by_code if code in url), None)
        if not code or not row.get('id'):
            continue
        comments.append({'id': 'instagram:' + str(row['id']), 'videoId': by_code[code]['id'],
                         'text': row.get('text') or '', 'author': row.get('ownerUsername') or row.get('username') or '',
                         'publishedAt': row.get('timestamp') or row.get('createdAt'),
                         'url': row.get('commentUrl') or by_code[code]['url']})
    return result, comments


def main():
    catalog = json.loads(CATALOG.read_text())
    data = json.loads(DATA.read_text()) if DATA.exists() else {'snapshots': [], 'comments': [], 'errors': {}}
    metrics, comments, errors = {}, [], {}
    key = os.getenv('YOUTUBE_API_KEY')
    token = os.getenv('APIFY_TOKEN')
    for platform, credential, fetcher in [('youtube', key, youtube), ('instagram', token, instagram)]:
        if not credential:
            errors[platform] = 'Credencial ausente: ' + ('YOUTUBE_API_KEY' if platform == 'youtube' else 'APIFY_TOKEN')
            continue
        try:
            found, recent = fetcher(catalog, credential)
            metrics.update(found)
            comments.extend(recent)
        except Exception as error:
            errors[platform] = str(error)[:300]
    if not metrics and os.getenv('REQUIRE_DATA') == '1':
        raise SystemExit('Nenhuma fonte retornou métricas: ' + str(errors))
    existing = {row['id']: row for row in data.get('comments', [])}
    previously_monitored = {row['videoId'] for row in data.get('snapshots', [])}
    for row in comments:
        if row['id'] not in existing:
            row['firstSeen'] = TODAY
            row['baseline'] = row['videoId'] not in previously_monitored
            existing[row['id']] = row
    old = {row['videoId']: row for row in data.get('snapshots', []) if row['date'] == TODAY}
    for video_id, row in metrics.items():
        if 'error' in row:
            errors[video_id] = row['error']
            continue
        old[video_id] = {'videoId': video_id, 'date': TODAY, 'collectedAt': NOW, **row}
    earlier = [row for row in data.get('snapshots', []) if row['date'] != TODAY]
    data = {'generatedAt': NOW, 'snapshots': earlier + list(old.values()),
            'comments': sorted(existing.values(), key=lambda x: x.get('publishedAt') or '', reverse=True)[:5000],
            'errors': errors}
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f"{TODAY}: {len(metrics)} métricas, {len(comments)} comentários capturados; erros: {list(errors)}")


if __name__ == '__main__':
    main()
