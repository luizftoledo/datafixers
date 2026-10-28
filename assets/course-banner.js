/* Datafixers: aviso de curso, sem rastreamento ou bloqueio da ferramenta. */
(() => {
  'use strict';
  if (window.top !== window.self || window.__dfCourseBannerLoaded) return;
  window.__dfCourseBannerLoaded = true;
  const key = 'df_course_waitlist_v1';
  const days = 7;
  const ttl = days * 24 * 60 * 60 * 1000;
  const form = 'https://docs.google.com/forms/d/e/1FAIpQLSepI2SLGVb9_Jizwzn9kq5rbafKfXpSLDOe7Cu3KGglP6znlQ/viewform';
  const english = /^en(?:-|$)/i.test(document.documentElement.lang);
  const copy = english ? {
    label: 'COURSE · WAITLIST',
    title: 'Want to use data in practice or produce a story from scratch?',
    text: 'A course in Portuguese with Luiz Fernando Toledo and Juliana Faddul.',
    join: 'Join the waitlist', close: 'Close', skip: 'Not now', region: 'Course with Luiz Fernando Toledo and Juliana Faddul'
  } : {
    label: 'CURSO · LISTA DE ESPERA',
    title: 'Quer aprender a usar dados na prática ou produzir uma reportagem do zero?',
    text: 'Curso com Luiz Fernando Toledo e Juliana Faddul.',
    join: 'Entrar na lista de espera', close: 'Fechar', skip: 'Agora não', region: 'Curso com Luiz Fernando Toledo e Juliana Faddul'
  };
  function dismissed() {
    if (document.cookie.split(';').some(part => part.trim() === key + '=1')) return true;
    try { return Number(localStorage.getItem(key)) > Date.now(); } catch { return false; }
  }
  function remember() {
    const shared = /(^|\.)datafixers\.org$/i.test(location.hostname);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = key + '=1; Max-Age=' + ttl / 1000 + '; Path=/; SameSite=Lax' + (shared ? '; Domain=datafixers.org' : '') + secure;
    try { localStorage.setItem(key, String(Date.now() + ttl)); } catch { /* O botão continua funcionando sem armazenamento. */ }
  }
  function mount() {
    if (dismissed() || document.querySelector('[data-df-course-banner]')) return;
    const host = document.createElement('df-course-banner');
    host.dataset.dfCourseBanner = 'v1';
    host.setAttribute('role', 'complementary');
    host.setAttribute('aria-label', copy.region);
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host{all:initial;position:fixed;z-index:2147481000;inset:auto 18px max(18px,env(safe-area-inset-bottom));display:block;max-width:1000px;margin-inline:auto;color-scheme:light;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#173b38;direction:ltr}
      :host([hidden]){display:none!important}*{box-sizing:border-box}.card{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:20px;padding:23px 24px;background:#fbfbfa;border:1px solid #b4d7d1;border-top:4px solid #2a7975;border-radius:16px;box-shadow:0 10px 38px #102e3026;animation:df-enter .22s ease-out}
      .label{display:flex;align-items:center;gap:8px;margin:0 85px 8px 0;font-size:10px;line-height:1.4;font-weight:700;letter-spacing:.09em;color:#2a7975}.label svg{width:24px;height:22px;flex:none}.title{margin:0 0 7px;font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:600;line-height:1.22;letter-spacing:-.02em;text-wrap:pretty}.text{margin:0;font-size:13px;line-height:1.45;color:#4b615d}.actions{display:flex;flex-direction:column;gap:5px;padding-top:17px}.join,.skip,.close{font:inherit;cursor:pointer;touch-action:manipulation;min-height:44px;text-align:center}.join{display:inline-flex;align-items:center;justify-content:center;padding:11px 17px;border-radius:8px;background:#246762;color:#fff;font-size:13px;font-weight:600;text-decoration:none;border:1px solid transparent;line-height:1.3}.join:hover{background:#174e49}.skip{border:0;border-radius:7px;background:transparent;color:#36534e;font-size:13px;padding:8px 12px}.skip:hover,.close:hover{background:#e8f1ed}.close{position:absolute;right:10px;top:4px;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 10px;border:0;border-radius:7px;background:transparent;color:#36534e;font-size:12px}.close svg{width:16px;height:16px}.join:focus-visible,.skip:focus-visible,.close:focus-visible{outline:3px solid #b88b27;outline-offset:3px}
      @keyframes df-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @media(max-width:640px){:host{inset-inline:12px;bottom:max(12px,env(safe-area-inset-bottom))}.card{grid-template-columns:1fr;gap:12px;padding:17px 17px 12px;border-radius:13px}.label{font-size:9px;margin-bottom:7px}.title{font-size:19px;line-height:1.24}.text{font-size:12px}.actions{flex-direction:row;align-items:center;gap:7px;padding-top:0;flex-wrap:wrap}.join{font-size:13px;padding:10px 14px}.skip{font-size:13px}.close{top:1px;right:5px}.label svg{width:21px;height:20px}}
      @media(prefers-reduced-motion:reduce){.card{animation:none}}@media print{:host{display:none!important}}
    `;
    const card = document.createElement('section'); card.className = 'card';
    const content = document.createElement('div');
    const label = document.createElement('p'); label.className = 'label';
    label.innerHTML = '<svg viewBox="0 0 32 29" aria-hidden="true"><path d="M16 3v4" stroke="#173b38" stroke-width="2"/><circle cx="16" cy="2.5" r="2" fill="#b4d7d1" stroke="#173b38"/><rect x="5" y="7" width="22" height="17" rx="4" fill="#b4d7d1" stroke="#173b38" stroke-width="1.5"/><rect x="8" y="11" width="16" height="8" rx="2" fill="#173b38"/><circle cx="12" cy="15" r="1" fill="#b4d7d1"/><circle cx="20" cy="15" r="1" fill="#b4d7d1"/></svg>';
    label.append(document.createTextNode(copy.label));
    const title = document.createElement('h2'); title.className = 'title'; title.textContent = copy.title;
    const body = document.createElement('p'); body.className = 'text'; body.textContent = copy.text;
    content.append(label, title, body);
    const actions = document.createElement('div'); actions.className = 'actions';
    const join = document.createElement('a'); join.className = 'join'; join.href = form; join.target = '_blank'; join.rel = 'noopener noreferrer'; join.textContent = copy.join;
    const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'skip'; skip.textContent = copy.skip;
    const close = document.createElement('button'); close.type = 'button'; close.className = 'close'; close.setAttribute('aria-label', copy.close);
    close.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    close.append(document.createTextNode(copy.close));
    const fullscreen = () => { host.hidden = Boolean(document.fullscreenElement); };
    const escape = event => { if (event.key === 'Escape' && !event.defaultPrevented) dismiss(); };
    function dismiss() {
      remember(); host.remove();
      document.removeEventListener('keydown', escape);
      document.removeEventListener('fullscreenchange', fullscreen);
    }
    close.addEventListener('click', dismiss); skip.addEventListener('click', dismiss); join.addEventListener('click', dismiss);
    actions.append(join, skip); card.append(content, actions, close); root.append(style, card); document.body.append(host);
    document.addEventListener('keydown', escape); document.addEventListener('fullscreenchange', fullscreen); fullscreen();
  }
  const start = () => { window.setTimeout(mount, 850); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
