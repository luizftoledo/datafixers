const encoder = new TextEncoder();
const cookieName = 'jose_maria_access';
const protectedPath = '/jose-maria-carvalho';
const sessionSeconds = 24 * 60 * 60;

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64url(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

async function key(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function equalPasswords(given, expected) {
  const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  const [left, right] = await Promise.all([digest(given), digest(expected)]);
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function createSession(secret) {
  const expiry = String(Math.floor(Date.now() / 1000) + sessionSeconds);
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(expiry));
  return `${expiry}.${base64url(new Uint8Array(signature))}`;
}

async function validSession(request, secret) {
  const cookie = request.headers.get('Cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
  if (!cookie) return false;
  const [expiry, signature, extra] = cookie.slice(cookieName.length + 1).split('.');
  if (extra || !/^\d{10,11}$/.test(expiry) || Number(expiry) <= Date.now() / 1000 || !/^[A-Za-z0-9_-]+$/.test(signature ?? '')) return false;
  try {
    return await crypto.subtle.verify('HMAC', await key(secret), fromBase64url(signature), encoder.encode(expiry));
  } catch {
    return false;
  }
}

function loginPage(invalid = false) {
  const message = invalid ? '<p class="error">Senha incorreta.</p>' : '';
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acesso protegido</title><style>body{min-height:100vh;display:grid;place-items:center;margin:0;background:#f6f2ec;color:#252827;font:16px system-ui,sans-serif}main{width:min(340px,calc(100vw - 48px));padding:28px;background:white;border:1px solid #e9e3da;border-radius:14px}h1{font-size:22px;margin:0 0 18px}label{display:block;margin-bottom:7px}input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #cfc7bd;border-radius:8px;font:inherit}button{width:100%;margin-top:14px;padding:12px;border:0;border-radius:8px;background:#70563b;color:white;font:inherit;cursor:pointer}.error{color:#a12626}</style><main><h1>Acesso protegido</h1>${message}<form method="post" action="${protectedPath}/"><label for="password">Senha</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Entrar</button></form></main></html>`, {
    status: invalid ? 401 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.JOSE_MARIA_PASSWORD || !env.JOSE_MARIA_SESSION_SECRET) return new Response('Acesso indisponível.', { status: 503 });

  if (request.method === 'POST') {
    const form = await request.formData();
    const password = form.get('password');
    if (typeof password !== 'string' || !(await equalPasswords(password, env.JOSE_MARIA_PASSWORD))) return loginPage(true);
    const cookie = await createSession(env.JOSE_MARIA_SESSION_SECRET);
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${protectedPath}/`,
        'Set-Cookie': `${cookieName}=${cookie}; Max-Age=${sessionSeconds}; Path=${protectedPath}; HttpOnly; Secure; SameSite=Lax`,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Método não permitido.', { status: 405 });
  if (!(await validSession(request, env.JOSE_MARIA_SESSION_SECRET))) return loginPage();
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
