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
  const list = await env.ANALYTICS.list({ prefix: 's:', limit: 200 });
  const bySession = {};
  for(const k of list.keys){
    const sid = k.name.split(':')[1];
    bySession[sid] = (bySession[sid] || 0) + 1;
  }
  const rows = Object.entries(bySession)
    .map(([sid, n]) => `<tr><td>${sid}</td><td>${n} eventos</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Campanha Stats</title>
<style>body{font-family:monospace;padding:24px}table{border-collapse:collapse}td{padding:6px 12px;border-bottom:1px solid #ddd}</style>
</head><body>
<h1>Campanha — sessões recentes</h1>
<p>Total: ${Object.keys(bySession).length}</p>
<table>${rows}</table>
</body></html>`;
}
