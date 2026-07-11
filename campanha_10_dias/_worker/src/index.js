// Cloudflare Worker — recebe telemetria do jogo Campanha 10 dias
// Armazena cada evento em KV e dispara alerta no Telegram para owner

const ALLOW_ORIGIN = '*'; // restrict if needed

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);

    // CORS preflight
    if(request.method === 'OPTIONS'){
      return new Response(null, { headers: CORS_HEADERS });
    }

    // GET endpoints (auth via ?key=)
    if(request.method === 'GET'){
      const key = url.searchParams.get('key');
      if(!env.OWNER_KEY || key !== env.OWNER_KEY){
        return new Response('forbidden', { status: 403 });
      }
      if(url.pathname === '/sessions'){
        return readSessions(env);
      }
      if(url.pathname === '/' || url.pathname === '/dashboard'){
        return new Response(await renderDashboard(env), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      return new Response('OK', { headers: CORS_HEADERS });
    }

    // POST /track
    if(request.method === 'POST' && url.pathname === '/track'){
      try {
        const body = await request.text();
        const data = JSON.parse(body);
        if(!data.sid || !data.ev){
          return new Response('bad request', { status: 400, headers: CORS_HEADERS });
        }
        const ip = request.headers.get('CF-Connecting-IP') || '';
        const country = request.cf && request.cf.country || '';
        const city = request.cf && request.cf.city || '';
        data._ip_hash = ip ? await sha256(ip).then(h => h.slice(0, 12)) : '';
        data._geo = `${country}/${city}`;

        // Store in KV
        const key = `s:${data.sid}:${String(data.t).padStart(15,'0')}:${data.ev}`;
        ctx.waitUntil(env.ANALYTICS.put(key, JSON.stringify(data), { expirationTtl: 60*60*24*60 }));

        // Send Telegram alerts on important events
        if(env.TG_TOKEN && env.TG_CHAT){
          ctx.waitUntil(maybeAlert(data, env));
        }

        return new Response('ok', { headers: CORS_HEADERS });
      } catch(e){
        return new Response('error: ' + e.message, { status: 500, headers: CORS_HEADERS });
      }
    }

    return new Response('not found', { status: 404, headers: CORS_HEADERS });
  }
};

async function sha256(s){
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function maybeAlert(data, env){
  const sidShort = data.sid.slice(0, 8);
  const geo = data._geo || '?';
  const ref = data.ref || 'direto';
  let text = null;

  if(data.ev === 'game_start'){
    text = `🎮 *Alguém começou a Campanha 10 dias*\nSessão: \`${sidShort}\`\nDe: ${geo}\nVeio de: ${ref}`;
  } else if(data.ev === 'game_end'){
    const d = data.d || {};
    const mins = (data.el / 60000).toFixed(1);
    const flags = d.flags || {};
    const usadas = [];
    if(flags.bf) usadas.push('comprou seguidores');
    if(flags.wb) usadas.push('disparou WhatsApp');
    if(flags.nb) usadas.push('neurobots');
    if(flags.df) usadas.push('deepfake');
    text = `🏁 *Sessão ${sidShort} terminou*\n` +
           `Resultado: *${d.kind || '?'}*\n` +
           `Dia: ${d.day}\n` +
           `Você: ${d.intent}% vs Adv: ${d.opp}%\n` +
           `Risco TSE: ${d.risk}, Confiança: ${d.trust}\n` +
           `Seguidores: ${d.fol}\n` +
           `Ações legais/cinza/proibidas: ${d.legal}/${d.gray}/${d.illegal}\n` +
           (usadas.length ? `Truques: ${usadas.join(', ')}\n` : '') +
           `Tempo total: ${mins} min`;
  } else if(data.ev === 'pagehide'){
    const d = data.d || {};
    const mins = (data.el / 60000).toFixed(1);
    if(d.day && d.day >= 2){
      text = `👋 *Sessão ${sidShort} fechou*\nParou no dia ${d.day}/10\nIntenção: ${d.intent}%\nSeguidores: ${d.fol}\nTempo: ${mins} min`;
    }
  }

  if(!text) return;

  try {
    const tgUrl = `https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`;
    await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TG_CHAT,
        text,
        parse_mode: 'Markdown'
      })
    });
  } catch(e){}
}

async function readSessions(env){
  const list = await env.ANALYTICS.list({ prefix: 's:', limit: 1000 });
  const sessions = {};
  for(const k of list.keys){
    const sid = k.name.split(':')[1];
    sessions[sid] = sessions[sid] || { sid, events: [] };
    sessions[sid].events.push(k.name);
  }
  return new Response(JSON.stringify(sessions, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function renderDashboard(env){
  // Carrega TODOS os eventos das últimas 1000 chaves do KV (≈ ok pra escala atual)
  const list = await env.ANALYTICS.list({ prefix: 's:', limit: 1000 });
  const events = [];
  // Em vez de 1000 GETs, lê em batches paralelos de 50
  const BATCH = 50;
  for(let i = 0; i < list.keys.length; i += BATCH){
    const batch = list.keys.slice(i, i + BATCH);
    const vals = await Promise.all(batch.map(k => env.ANALYTICS.get(k.name)));
    for(const v of vals){
      if(!v) continue;
      try { events.push(JSON.parse(v)); } catch(_e){}
    }
  }

  // Agrega por sessão
  const sessions = {};
  for(const ev of events){
    const sid = ev.sid;
    if(!sid) continue;
    if(!sessions[sid]){
      sessions[sid] = {
        sid,
        ip: ev._ip_hash || '',
        geo: ev._geo || '',
        ref: ev.ref || '',
        events: [],
        firstT: ev.t,
        lastT: ev.t,
        dayReached: 0,
        endKind: null,
        minutes: 0,
        actions: []
      };
    }
    const s = sessions[sid];
    s.events.push(ev);
    if(ev.t < s.firstT) s.firstT = ev.t;
    if(ev.t > s.lastT) s.lastT = ev.t;
    if(ev._ip_hash && !s.ip) s.ip = ev._ip_hash;
    if(ev._geo && !s.geo) s.geo = ev._geo;
    if(ev.d && ev.d.day && ev.d.day > s.dayReached) s.dayReached = ev.d.day;
    if(ev.ev === 'game_end' && ev.d && ev.d.kind){ s.endKind = ev.d.kind; }
    if(ev.ev === 'action' && ev.d){ s.actions.push(ev.d); }
  }
  for(const sid in sessions){
    sessions[sid].minutes = (sessions[sid].lastT - sessions[sid].firstT) / 60000;
  }
  const sList = Object.values(sessions).sort((a,b) => b.lastT - a.lastT);

  // === KPIs ===
  const totalSessions = sList.length;
  const uniqueIPs = new Set(sList.map(s => s.ip).filter(Boolean)).size;
  const gameStarts = sList.filter(s => s.events.some(e => e.ev === 'game_start')).length;
  const gameCompleted = sList.filter(s => s.endKind).length;
  const completionRate = gameStarts > 0 ? (gameCompleted / gameStarts * 100).toFixed(1) : '0';

  // === Janela 24h / 7d ===
  const now = Date.now();
  const last24h = sList.filter(s => (now - s.lastT) < 86400000).length;
  const last7d  = sList.filter(s => (now - s.lastT) < 7*86400000).length;

  // === Distribuição de finais ===
  const endDist = { vitoria1: 0, segundoTurno: 0, derrota: 0, cassado: 0 };
  sList.forEach(s => { if(s.endKind && (s.endKind in endDist)) endDist[s.endKind]++; });

  // === Drop-off por dia ===
  const reachedDay = [0,0,0,0,0,0,0,0,0,0,0]; // index 1-10
  sList.forEach(s => {
    for(let d = 1; d <= Math.min(10, s.dayReached); d++) reachedDay[d]++;
  });

  // === Top ações ===
  const actionCount = {};
  const tagCount = { legal: 0, gray: 0, illegal: 0 };
  sList.forEach(s => s.actions.forEach(a => {
    if(a.id){ actionCount[a.id] = (actionCount[a.id] || 0) + 1; }
    if(a.tag && (a.tag in tagCount)) tagCount[a.tag]++;
  }));
  const topActions = Object.entries(actionCount).sort((a,b) => b[1] - a[1]).slice(0, 12);

  // === Geo ===
  const geoCount = {};
  sList.forEach(s => { if(s.geo) geoCount[s.geo] = (geoCount[s.geo] || 0) + 1; });
  const topGeo = Object.entries(geoCount).sort((a,b) => b[1] - a[1]).slice(0, 10);

  // === Referrer ===
  const refCount = {};
  sList.forEach(s => {
    let r = s.ref || 'direto';
    try {
      if(r && r.startsWith('http')) r = new URL(r).hostname;
    } catch(_e){}
    refCount[r] = (refCount[r] || 0) + 1;
  });
  const topRefs = Object.entries(refCount).sort((a,b) => b[1] - a[1]).slice(0, 8);

  // === Tempo médio de partida concluída ===
  const completedMinutes = sList.filter(s => s.endKind).map(s => s.minutes);
  const avgMinutes = completedMinutes.length
    ? (completedMinutes.reduce((a,b) => a+b, 0) / completedMinutes.length).toFixed(1)
    : '0';

  // === HTML helpers ===
  const bar = (n, max, color) => {
    const w = max > 0 ? Math.max(1, Math.round(n/max*100)) : 0;
    return `<div style="background:#eef0f3;border-radius:3px;height:18px;position:relative"><div style="background:${color};width:${w}%;height:100%;border-radius:3px"></div><span style="position:absolute;left:8px;top:0;line-height:18px;font-size:12px;color:#111;font-weight:600">${n}</span></div>`;
  };
  const endColors = { vitoria1:'#2ea44f', segundoTurno:'#d4a017', derrota:'#cb2431', cassado:'#8a2be2' };
  const endLabels = { vitoria1:'🏆 Vitória 1T', segundoTurno:'🟡 2º turno', derrota:'😞 Derrota', cassado:'⚖️ Cassado' };
  const maxEnd = Math.max(...Object.values(endDist), 1);
  const maxDay = Math.max(...reachedDay, 1);
  const maxAct = topActions.length ? topActions[0][1] : 1;
  const maxGeo = topGeo.length ? topGeo[0][1] : 1;
  const maxRef = topRefs.length ? topRefs[0][1] : 1;

  const fmtTime = (t) => {
    const d = new Date(t);
    return `${d.getUTCDate().toString().padStart(2,'0')}/${(d.getUTCMonth()+1).toString().padStart(2,'0')} ${d.getUTCHours().toString().padStart(2,'0')}:${d.getUTCMinutes().toString().padStart(2,'0')}`;
  };

  const recentRows = sList.slice(0, 30).map(s => `
    <tr>
      <td><code>${s.sid.slice(0,8)}</code></td>
      <td>${s.geo || '—'}</td>
      <td>${s.ref ? (s.ref.length > 30 ? s.ref.slice(0,30)+'…' : s.ref) : 'direto'}</td>
      <td style="text-align:center">${s.dayReached || '—'}</td>
      <td style="text-align:center">${s.endKind ? endLabels[s.endKind] || s.endKind : (s.events.some(e => e.ev === 'game_start') ? '<span style="color:#999">em jogo</span>' : '<span style="color:#999">só abriu</span>')}</td>
      <td style="text-align:right">${s.minutes.toFixed(1)}m</td>
      <td style="font-size:11px;color:#666">${fmtTime(s.lastT)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Campanha 10 dias — métricas</title>
  <meta http-equiv="refresh" content="60">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f6f8fa; color:#1a1a1a; margin:0; padding:24px 20px 48px; }
    .wrap { max-width: 1100px; margin: 0 auto; }
    h1 { font-size:24px; margin:0 0 4px; }
    .updated { color:#666; font-size:12px; margin-bottom:24px; }
    .kpi-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:12px; margin-bottom:24px; }
    .kpi { background:#fff; border:1px solid #e1e4e8; border-radius:6px; padding:14px 16px; }
    .kpi .lbl { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#666; }
    .kpi .val { font-size:30px; font-weight:700; line-height:1; margin-top:6px; color:#0366d6; }
    .kpi .sub { font-size:12px; color:#666; margin-top:4px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:18px; margin-bottom:18px; }
    @media (max-width:760px) { .grid { grid-template-columns: 1fr; } }
    .card { background:#fff; border:1px solid #e1e4e8; border-radius:6px; padding:18px 20px; }
    .card h2 { font-size:14px; text-transform:uppercase; letter-spacing:1px; color:#444; margin:0 0 14px; }
    .card.full { grid-column: 1 / -1; }
    .row { display:grid; grid-template-columns: 120px 1fr 40px; gap:10px; align-items:center; margin-bottom:8px; }
    .row .lbl { font-size:13px; color:#222; }
    .row .num { font-size:12px; color:#666; text-align:right; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th, td { padding:8px 10px; border-bottom:1px solid #eee; text-align:left; }
    th { background:#fafbfc; font-size:11px; text-transform:uppercase; color:#666; font-weight:600; }
    code { background:#fafbfc; padding:2px 6px; border-radius:3px; font-size:12px; }
    .tag { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; }
    .tag.legal { background:#e6f5e9; color:#2ea44f; }
    .tag.gray { background:#fff4d6; color:#9a6700; }
    .tag.illegal { background:#ffe4e4; color:#cb2431; }
    .empty { color:#999; font-style:italic; padding:14px 0; text-align:center; }
  </style>
</head>
<body>
<div class="wrap">

<h1>Campanha 10 dias — métricas</h1>
<div class="updated">atualizado: ${new Date().toISOString().replace('T',' ').slice(0,16)} UTC · auto-refresh 60s</div>

<div class="kpi-grid">
  <div class="kpi"><div class="lbl">Visitas totais</div><div class="val">${totalSessions}</div><div class="sub">sessões nos últimos 60d</div></div>
  <div class="kpi"><div class="lbl">Visitantes únicos</div><div class="val">${uniqueIPs}</div><div class="sub">por IP (hashed)</div></div>
  <div class="kpi"><div class="lbl">Começaram o jogo</div><div class="val">${gameStarts}</div><div class="sub">${totalSessions > 0 ? (gameStarts/totalSessions*100).toFixed(0) : 0}% das visitas</div></div>
  <div class="kpi"><div class="lbl">Concluíram</div><div class="val">${gameCompleted}</div><div class="sub">${completionRate}% dos que começaram</div></div>
  <div class="kpi"><div class="lbl">Últimas 24h</div><div class="val" style="color:#2ea44f">${last24h}</div></div>
  <div class="kpi"><div class="lbl">Últimos 7d</div><div class="val" style="color:#2ea44f">${last7d}</div></div>
  <div class="kpi"><div class="lbl">Tempo médio</div><div class="val">${avgMinutes}<span style="font-size:14px">min</span></div><div class="sub">partidas concluídas</div></div>
</div>

<div class="grid">

  <div class="card">
    <h2>Como terminam as partidas</h2>
    ${gameCompleted === 0 ? '<div class="empty">Ninguém terminou ainda</div>' : Object.entries(endDist).map(([k,v]) => `
      <div class="row">
        <div class="lbl">${endLabels[k]}</div>
        ${bar(v, maxEnd, endColors[k])}
        <div class="num">${gameCompleted ? (v/gameCompleted*100).toFixed(0) : 0}%</div>
      </div>
    `).join('')}
  </div>

  <div class="card">
    <h2>Até que dia chegou (drop-off)</h2>
    ${[1,2,3,4,5,6,7,8,9,10].map(d => `
      <div class="row">
        <div class="lbl">Dia ${d}</div>
        ${bar(reachedDay[d], maxDay, '#0366d6')}
        <div class="num">${reachedDay[1] > 0 ? (reachedDay[d]/reachedDay[1]*100).toFixed(0) : 0}%</div>
      </div>
    `).join('')}
  </div>

  <div class="card">
    <h2>De onde vêm (geo)</h2>
    ${topGeo.length === 0 ? '<div class="empty">Sem dados ainda</div>' : topGeo.map(([g,n]) => `
      <div class="row">
        <div class="lbl">${g || '?'}</div>
        ${bar(n, maxGeo, '#6f42c1')}
        <div class="num">${n}</div>
      </div>
    `).join('')}
  </div>

  <div class="card">
    <h2>Referrers (de onde vieram)</h2>
    ${topRefs.length === 0 ? '<div class="empty">Sem dados ainda</div>' : topRefs.map(([r,n]) => `
      <div class="row">
        <div class="lbl" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r}">${r}</div>
        ${bar(n, maxRef, '#e36209')}
        <div class="num">${n}</div>
      </div>
    `).join('')}
  </div>

  <div class="card full">
    <h2>Ações mais escolhidas (${tagCount.legal} legais · ${tagCount.gray} cinzas · ${tagCount.illegal} proibidas)</h2>
    ${topActions.length === 0 ? '<div class="empty">Ninguém usou ações ainda</div>' : topActions.map(([id,n]) => `
      <div class="row">
        <div class="lbl"><code>${id}</code></div>
        ${bar(n, maxAct, '#0366d6')}
        <div class="num">${n}</div>
      </div>
    `).join('')}
  </div>

  <div class="card full">
    <h2>Últimas ${Math.min(30, sList.length)} sessões</h2>
    ${sList.length === 0 ? '<div class="empty">Sem sessões ainda</div>' : `<table>
      <thead><tr><th>SID</th><th>Geo</th><th>Referrer</th><th>Dia</th><th>Resultado</th><th>Tempo</th><th>Última atividade</th></tr></thead>
      <tbody>${recentRows}</tbody>
    </table>`}
  </div>

</div>

</div>
</body>
</html>`;
}
