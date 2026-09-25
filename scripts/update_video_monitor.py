#!/usr/bin/env python3
"""Collect public portfolio video counters and recent top-level comments."""
import datetime as dt
import json
import os
import re
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
    by_code = {v['platformId']: v for v in videos}
    result = {}
    for video in videos:
        try:
            result[video['id']] = instagram_embed(video)
        except Exception as error:
            result[video['id']] = {'error': 'Instagram embed: ' + str(error)[:120]}
    if not token:
        for value in result.values():
            value['commentsError'] = 'APIFY_TOKEN ausente; comentários não atualizados'
        return result, []
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


def instagram_embed(video):
    code = video['platformId']
    request = Request('https://www.instagram.com/reel/' + code + '/embed/captioned/',
                      headers={'User-Agent': 'Mozilla/5.0 (compatible; VideoMonitor/1.0)'})
    with urlopen(request, timeout=30) as response:
        page = response.read().decode('utf-8', 'replace')

    def field(name):
        match = re.search(r'\\"' + name + r'\\":(\d+)', page)
        return int(match.group(1)) if match else None

    shortcode = re.search(r'\\"shortcode\\":\\"([^\\"]+)', page)
    if not shortcode or shortcode.group(1) != code:
        raise RuntimeError('publicação não identificada na página pública')
    likes = re.search(r'\\"edge_liked_by\\":\{\\"count\\":(\d+)', page)
    comments = re.search(r'\\"edge_media_to_comment\\":\{\\"count\\":(\d+)', page)
    if not likes or not comments:
        raise RuntimeError('contadores públicos indisponíveis')
    likes, comments = int(likes.group(1)), int(comments.group(1))
    views = field('video_view_count')
    # The old embed counter can be stale or reset; a count below likes is not usable.
    if views is not None and views < likes:
        views = None
    return {'title': video['portfolioLabel'], 'views': views, 'likes': likes,
            'comments': comments, 'source': 'Instagram embed público'}


def main():
    catalog = json.loads(CATALOG.read_text())
    data = json.loads(DATA.read_text()) if DATA.exists() else {'snapshots': [], 'comments': [], 'errors': {}}
    metrics, comments, errors = {}, [], {}
    key = os.getenv('YOUTUBE_API_KEY')
    token = os.getenv('APIFY_TOKEN')
    for platform, credential, fetcher in [('youtube', key, youtube), ('instagram', token, instagram)]:
        if platform == 'youtube' and not credential:
            errors[platform] = 'Credencial ausente: YOUTUBE_API_KEY'
            continue
        try:
            found, recent = fetcher(catalog, credential)
            metrics.update(found)
            comments.extend(recent)
            if platform == 'instagram':
                comment_error = next((row.get('commentsError') for row in found.values()
                                      if row.get('commentsError')), None)
                if comment_error:
                    errors['instagram_comments'] = comment_error
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
    latest_titles = {}
    for row in data.get('snapshots', []):
        if row.get('title') and row['videoId'] not in latest_titles:
            latest_titles[row['videoId']] = row['title']
    for video_id, row in metrics.items():
        if 'error' in row:
            errors[video_id] = row['error']
            continue
        if video_id.startswith('instagram:') and latest_titles.get(video_id):
            row['title'] = latest_titles[video_id]
        old[video_id] = {'videoId': video_id, 'date': TODAY, 'collectedAt': NOW, **row}
    earlier = [row for row in data.get('snapshots', []) if row['date'] != TODAY]
    data = {'generatedAt': NOW, 'snapshots': earlier + list(old.values()),
            'comments': sorted(existing.values(), key=lambda x: x.get('publishedAt') or '', reverse=True)[:5000],
            'errors': errors}
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f"{TODAY}: {len(metrics)} métricas, {len(comments)} comentários capturados; erros: {list(errors)}")


if __name__ == '__main__':
    main()
