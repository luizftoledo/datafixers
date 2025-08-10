const FEED_URL = 'a_lai_que_pegou/data/feeds.json'.includes('/') ? 'data/feeds.json' : 'data/feeds.json';
const ACADEMICS_URL = 'data/academics.json';

const dom = {
  tabs: () => document.querySelectorAll('.tab-btn'),
  editorGrid: document.getElementById('editorGrid'),
  listTitle: document.getElementById('listTitle'),
  cardsGrid: document.getElementById('cardsGrid'),
  pagination: document.getElementById('pagination'),
  emptyState: document.getElementById('emptyState'),
  searchBox: document.getElementById('searchBox'),
  sortSelect: document.getElementById('sortSelect'),
  academicsSection: document.getElementById('academics'),
  academicGrid: document.getElementById('academicGrid'),
  academicEmpty: document.getElementById('academicEmpty'),
  academicNote: document.getElementById('academicNote')
};

let items = [];
let academics = [];
let currentTab = 'news';
let pageSize = 12;
let currentPage = 1;

function fmtDate(iso) { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: '2-digit' }); }
function sourceFromUrl(url) { try { const u = new URL(url); return (u.hostname.replace(/^www\./, '')); } catch { return ''; } }

function cardHTML(item) {
  const outlet = item.source || sourceFromUrl(item.url) || '';
  const hasDetails = item.context || item.objective || item.result;
  return `
  <article class="card">
    <div class="card-body">
      ${outlet ? `<span class="badge">${outlet}</span>` : ''}
      <h3>${item.title}</h3>
      <div class="meta">
        <span>${fmtDate(item.published_at)}</span>
      </div>
      ${hasDetails ? `
        <div class="kv">
          ${item.context ? `<div><b>Contexto</b><div class="muted">${item.context}</div></div>` : ''}
          ${item.objective ? `<div><b>Objetivo</b><div class="muted">${item.objective}</div></div>` : ''}
          ${item.result ? `<div><b>Resultado</b><div class="muted">${item.result}</div></div>` : ''}
        </div>` : (item.teaser ? `<p class="muted">${item.teaser}</p>` : '')
      }
      <div class="actions">
        <a class="btn" href="${item.url}" target="_blank" rel="noopener">Abrir</a>
      </div>
    </div>
  </article>`;
}

function academicHTML(a) {
  return `
  <article class="card">
    <div class="card-body">
      <h3>${a.title}</h3>
      <div class="meta">
        <span>${a.authors || ''}</span>${a.venue ? `<span>•</span><span>${a.venue}</span>` : ''}${a.year ? `<span>•</span><span>${a.year}</span>` : ''}
      </div>
      ${a.abstract ? `<p class="abstract">${a.abstract}</p>` : ''}
      <div class="actions">
        <a class="btn" href="${a.url}" target="_blank" rel="noopener">Acessar</a>
      </div>
    </div>
  </article>`;
}

function applyFilters() {
  const q = (dom.searchBox.value || '').toLowerCase();
  const sort = dom.sortSelect.value;
  let filtered = items.filter(it => it.category === currentTab || (currentTab === 'news' && it.category === 'news'));
  if (q) {
    filtered = filtered.filter(it => {
      const hay = [it.title, it.source, it.url, it.teaser || '', it.context || '', it.objective || '', it.result || ''].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  if (sort === 'date_desc') filtered.sort((a,b) => new Date(b.published_at) - new Date(a.published_at));
  if (sort === 'date_asc') filtered.sort((a,b) => new Date(a.published_at) - new Date(b.published_at));
  if (sort === 'source_asc') filtered.sort((a,b) => (a.source || '').localeCompare(b.source || ''));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  dom.cardsGrid.innerHTML = pageItems.map(cardHTML).join('');
  // render pagination
  if (dom.pagination) {
    dom.pagination.innerHTML = '';
    if (totalPages > 1) {
      const makeBtn = (label, page, active=false) => `<button class="btn" data-page="${page}" ${active ? 'style="background: var(--primary-color); color:#fff"' : ''}>${label}</button>`;
      const buttons = [];
      for (let p = 1; p <= totalPages && p <= 8; p++) {
        buttons.push(makeBtn(p, p, p === currentPage));
      }
      if (totalPages > 8) {
        buttons.push(`<span class="muted">…</span>`);
        buttons.push(makeBtn(totalPages, totalPages));
      }
      dom.pagination.innerHTML = buttons.join('');
      dom.pagination.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = parseInt(btn.getAttribute('data-page'), 10);
          applyFilters();
          window.scrollTo({ top: dom.cardsGrid.offsetTop - 80, behavior: 'smooth' });
        });
      });
    }
  }
  dom.emptyState.classList.toggle('hidden', filtered.length > 0);
}

function setTab(tab) {
  currentTab = tab;
  dom.tabs().forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  const isAcademics = tab === 'academics';
  dom.academicsSection.classList.toggle('hidden', !isAcademics);
  const editorSection = document.getElementById('editorPicks');
  if (editorSection) editorSection.classList.toggle('hidden', isAcademics);
  document.getElementById('filters').classList.toggle('hidden', isAcademics);
  document.getElementById('list').classList.toggle('hidden', isAcademics);
  if (isAcademics) {
    const has = (academics || []).length > 0;
    dom.academicGrid.innerHTML = has ? academics.map(academicHTML).join('') : '';
    dom.academicEmpty.classList.toggle('hidden', has);
    // Nota: quando o arquivo academics.json vier vazio e houver fallback, ainda exibimos itens.
    // Para comunicar a origem, mostramos uma nota padrão independente da origem.
    if (dom.academicNote) dom.academicNote.classList.toggle('hidden', !has && true);
  } else {
    dom.listTitle.textContent = 'Reportagens recentes*';
    applyFilters();
  }
}

async function boot() {
  const [feedResp, acaResp] = await Promise.all([ fetch('data/feeds.json'), fetch('data/academics.json') ]);
  items = await feedResp.json();
  academics = acaResp.ok ? await acaResp.json() : [];

  // Editor picks
  const picks = window.EDITOR_PICKS || [];
  if (dom.editorGrid && picks.length) {
    const renderPick = (p) => {
      const base = { ...p, teaser: p.teaser || p.result || '' };
      const outlet = base.source || (base.url ? sourceFromUrl(base.url) : '');
      return `
      <article class="card">
        <div class="card-body">
          ${outlet ? `<span class=\"badge\">${outlet}</span>` : ''}
          <h3>${base.title}</h3>
          ${base.teaser ? `<p class="muted">${base.teaser}</p>` : ''}
          ${(p.how_used || p.context || p.objective || p.result) ? `
            <div class="kv">
              <div><b>Como usou a LAI?</b></div>
              ${p.how_used ? `<div class="muted">${p.how_used}</div>` : ''}
            </div>` : ''}
          <div class="actions">
            <a class="btn" href="${base.url}" target="_blank" rel="noopener">Abrir</a>
          </div>
        </div>
      </article>`;
    };
    dom.editorGrid.innerHTML = picks.map(renderPick).join('');
  }
  dom.tabs().forEach(btn => btn.addEventListener('click', () => { currentPage = 1; setTab(btn.dataset.tab); }));
  dom.searchBox.addEventListener('input', applyFilters);
  dom.sortSelect.addEventListener('change', applyFilters);
  setTab('news');
}
boot().catch(err => {
  console.error(err);
  dom.cardsGrid.innerHTML = '<p class="muted">Erro ao carregar dados.</p>';
});


