const NEWS_URL = 'data/feeds.json';
const FEATURED_URL = 'data/featured.json';
const ACADEMICS_URL = 'data/academics.json';
const META_URL = 'data/meta.json';

const state = {
  news: [],
  featured: [],
  academics: [],
  meta: null,
  tab: 'news',
  page: 1,
  pageSize: 12,
  query: '',
  source: 'all',
  periodDays: 'all',
  sort: 'published_desc',
  onlyNew: false,
  academicQuery: ''
};

const dom = {
  tabs: () => document.querySelectorAll('.tab-btn[data-tab]'),
  tabSections: () => document.querySelectorAll('.tab-section'),
  updatedAt: document.getElementById('updatedAt'),
  newsCount: document.getElementById('newsCount'),
  newCount: document.getElementById('newCount'),
  sourceCount: document.getElementById('sourceCount'),
  featuredGrid: document.getElementById('featuredGrid'),
  newLinksList: document.getElementById('newLinksList'),
  newLinksEmpty: document.getElementById('newLinksEmpty'),
  searchBox: document.getElementById('searchBox'),
  sourceFilter: document.getElementById('sourceFilter'),
  periodFilter: document.getElementById('periodFilter'),
  sortSelect: document.getElementById('sortSelect'),
  onlyNewBtn: document.getElementById('onlyNewBtn'),
  resultsInfo: document.getElementById('resultsInfo'),
  newsList: document.getElementById('newsList'),
  pagination: document.getElementById('pagination'),
  emptyState: document.getElementById('emptyState'),
  academicSearch: document.getElementById('academicSearch'),
  academicList: document.getElementById('academicList'),
  academicEmpty: document.getElementById('academicEmpty')
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function fmtDate(value) {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(value) {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function shorten(text, max = 200) {
  const value = (text || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

function sourceFromUrl(url) {
  try {
    const host = new URL(url).hostname || '';
    return host.replace(/^www\./, '').toLowerCase();
  } catch (err) {
    return '';
  }
}

function getReferenceDate() {
  return parseDate(state.meta && state.meta.updated_at) || new Date();
}

function isNewItem(item) {
  const ref = getReferenceDate();
  const firstSeen = parseDate(item.first_seen_at) || parseDate(item.published_at);
  if (!firstSeen) return false;
  const diffDays = (ref.getTime() - firstSeen.getTime()) / 86400000;
  return diffDays <= 30;
}

function sortByDateDesc(a, b, field) {
  const da = parseDate(a[field]) || new Date(0);
  const db = parseDate(b[field]) || new Date(0);
  return db - da;
}

function uniqueSources(list) {
  const set = new Set();
  list.forEach((item) => {
    const source = (item.source || sourceFromUrl(item.url || '') || '').trim();
    if (source) set.add(source);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function applyNewsFilters() {
  const q = state.query.trim().toLowerCase();
  const ref = getReferenceDate();

  let list = state.news.slice();

  if (q) {
    list = list.filter((item) => {
      const haystack = [item.title, item.source, item.teaser, item.url].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  if (state.source !== 'all') {
    list = list.filter((item) => (item.source || sourceFromUrl(item.url || '')).toLowerCase() === state.source);
  }

  if (state.periodDays !== 'all') {
    const days = Number(state.periodDays);
    const cutoff = new Date(ref.getTime() - days * 86400000);
    list = list.filter((item) => {
      const pub = parseDate(item.published_at) || parseDate(item.first_seen_at);
      return pub && pub >= cutoff;
    });
  }

  if (state.onlyNew) {
    list = list.filter(isNewItem);
  }

  switch (state.sort) {
    case 'first_seen_desc':
      list.sort((a, b) => sortByDateDesc(a, b, 'first_seen_at'));
      break;
    case 'published_asc':
      list.sort((a, b) => {
        const da = parseDate(a.published_at) || new Date(0);
        const db = parseDate(b.published_at) || new Date(0);
        return da - db;
      });
      break;
    case 'source_asc':
      list.sort((a, b) => (a.source || '').localeCompare(b.source || '', 'pt-BR'));
      break;
    case 'published_desc':
    default:
      list.sort((a, b) => sortByDateDesc(a, b, 'published_at'));
      break;
  }

  return list;
}

function renderSummary() {
  const newsCount = state.news.length;
  const sources = uniqueSources(state.news);
  const newCount = state.news.filter(isNewItem).length;

  if (dom.updatedAt) dom.updatedAt.textContent = fmtDateTime(state.meta && state.meta.updated_at);
  if (dom.newsCount) dom.newsCount.textContent = newsCount.toLocaleString('pt-BR');
  if (dom.newCount) dom.newCount.textContent = newCount.toLocaleString('pt-BR');
  if (dom.sourceCount) dom.sourceCount.textContent = sources.length.toLocaleString('pt-BR');
}

function renderSourceFilter() {
  if (!dom.sourceFilter) return;
  const current = state.source;
  const sources = uniqueSources(state.news);
  dom.sourceFilter.innerHTML = `<option value="all">Todas</option>${sources
    .map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`)
    .join('')}`;
  dom.sourceFilter.value = sources.includes(current) ? current : 'all';
  state.source = dom.sourceFilter.value;
}

function renderFeatured() {
  if (!dom.featuredGrid) return;
  const items = (state.featured && state.featured.length ? state.featured : state.news.slice(0, 6)).slice(0, 6);
  if (!items.length) {
    dom.featuredGrid.innerHTML = '<p class="muted">Sem destaques no momento.</p>';
    return;
  }

  dom.featuredGrid.innerHTML = items
    .map((item) => {
      const source = item.source || sourceFromUrl(item.url || '') || 'fonte não identificada';
      const teaser = shorten(item.teaser || item.why_featured || '', 170);
      const pub = item.published_at ? fmtDate(item.published_at) : '-';
      return `
        <article class="featured-card">
          <div class="meta-row">
            <span class="badge">${escapeHtml(source)}</span>
            <span>${escapeHtml(pub)}</span>
            ${isNewItem(item) ? '<span class="badge-new">novo</span>' : ''}
          </div>
          <h3>${escapeHtml(item.title || '')}</h3>
          <p>${escapeHtml(teaser || 'Cobertura recente sobre LAI e pedidos de informação.')}</p>
          <div class="actions">
            <a class="btn" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener">Ler</a>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderNewLinks() {
  if (!dom.newLinksList || !dom.newLinksEmpty) return;
  const list = state.news
    .filter(isNewItem)
    .sort((a, b) => sortByDateDesc(a, b, 'first_seen_at'))
    .slice(0, 14);

  if (!list.length) {
    dom.newLinksList.innerHTML = '';
    dom.newLinksEmpty.classList.remove('hidden');
    return;
  }

  dom.newLinksEmpty.classList.add('hidden');
  dom.newLinksList.innerHTML = list
    .map((item) => {
      const source = item.source || sourceFromUrl(item.url || '');
      return `<li>
        <a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener">${escapeHtml(item.title || '')}</a>
        <span class="muted"> · ${escapeHtml(source)} · ${fmtDate(item.published_at)} · <span class="badge-new">novo</span></span>
      </li>`;
    })
    .join('');
}

function renderPagination(totalPages) {
  if (!dom.pagination) return;
  dom.pagination.innerHTML = '';
  if (totalPages <= 1) return;

  const pages = [];
  const maxButtons = 8;
  const start = Math.max(1, state.page - 3);
  const end = Math.min(totalPages, start + maxButtons - 1);

  for (let p = start; p <= end; p += 1) {
    pages.push(
      `<button class="page-btn ${p === state.page ? 'active' : ''}" data-page="${p}" type="button">${p}</button>`
    );
  }

  if (end < totalPages) {
    pages.push('<span class="muted">...</span>');
    pages.push(`<button class="page-btn" data-page="${totalPages}" type="button">${totalPages}</button>`);
  }

  dom.pagination.innerHTML = pages.join('');
  dom.pagination.querySelectorAll('button[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.page = Number(btn.getAttribute('data-page')) || 1;
      renderNewsList();
      window.scrollTo({ top: dom.newsList.offsetTop - 90, behavior: 'smooth' });
    });
  });
}

function renderNewsList() {
  if (!dom.newsList || !dom.resultsInfo || !dom.emptyState) return;

  const filtered = applyNewsFilters();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  state.page = Math.min(state.page, totalPages);

  const start = (state.page - 1) * state.pageSize;
  const pageItems = filtered.slice(start, start + state.pageSize);

  dom.resultsInfo.textContent = `Mostrando ${pageItems.length.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} links.`;

  if (!pageItems.length) {
    dom.newsList.innerHTML = '';
    dom.emptyState.classList.remove('hidden');
    renderPagination(0);
    return;
  }

  dom.emptyState.classList.add('hidden');

  dom.newsList.innerHTML = pageItems
    .map((item) => {
      const source = item.source || sourceFromUrl(item.url || '');
      const teaser = shorten(item.teaser || '', 250);
      const published = fmtDate(item.published_at);
      const entered = fmtDate(item.first_seen_at);
      return `
        <li class="news-item">
          <div class="news-top">
            <div>
              <div class="meta-row">
                <span class="badge">${escapeHtml(source || 'fonte')}</span>
                <span>Publicado: ${escapeHtml(published)}</span>
                <span>Entrou na curadoria: ${escapeHtml(entered)}</span>
                ${isNewItem(item) ? '<span class="badge-new">novo</span>' : ''}
              </div>
              <h3 class="news-title"><a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener">${escapeHtml(item.title || '')}</a></h3>
            </div>
            <div class="actions">
              <a class="btn" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener">Abrir</a>
            </div>
          </div>
          ${teaser ? `<p>${escapeHtml(teaser)}</p>` : ''}
        </li>
      `;
    })
    .join('');

  renderPagination(totalPages);
}

function renderAcademics() {
  if (!dom.academicList || !dom.academicEmpty) return;
  const q = state.academicQuery.trim().toLowerCase();
  let items = state.academics.slice();

  if (q) {
    items = items.filter((item) => [item.title, item.authors, item.venue, item.abstract, item.url].join(' ').toLowerCase().includes(q));
  }

  if (!items.length) {
    dom.academicList.innerHTML = '';
    dom.academicEmpty.classList.remove('hidden');
    return;
  }

  dom.academicEmpty.classList.add('hidden');
  dom.academicList.innerHTML = items
    .map((item) => {
      const source = item.venue || item.source || sourceFromUrl(item.url || '');
      const summary = shorten(item.abstract || item.teaser || '', 180);
      return `
        <article class="academic-card">
          <span class="badge">${escapeHtml(source || 'publicação')}</span>
          <h3>${escapeHtml(item.title || '')}</h3>
          <p>${escapeHtml(summary || 'Sem resumo disponível.')}</p>
          <div class="actions">
            <a class="btn" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener">Acessar</a>
          </div>
        </article>
      `;
    })
    .join('');
}

function setTab(tab) {
  state.tab = tab;
  dom.tabs().forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  dom.tabSections().forEach((section) => {
    section.classList.toggle('hidden', section.id !== tab);
  });
}

function bindEvents() {
  dom.tabs().forEach((btn) => {
    btn.addEventListener('click', () => {
      setTab(btn.dataset.tab);
    });
  });

  if (dom.searchBox) {
    dom.searchBox.addEventListener('input', () => {
      state.query = dom.searchBox.value;
      state.page = 1;
      renderNewsList();
    });
  }

  if (dom.sourceFilter) {
    dom.sourceFilter.addEventListener('change', () => {
      state.source = dom.sourceFilter.value;
      state.page = 1;
      renderNewsList();
    });
  }

  if (dom.periodFilter) {
    dom.periodFilter.addEventListener('change', () => {
      state.periodDays = dom.periodFilter.value;
      state.page = 1;
      renderNewsList();
    });
  }

  if (dom.sortSelect) {
    dom.sortSelect.addEventListener('change', () => {
      state.sort = dom.sortSelect.value;
      state.page = 1;
      renderNewsList();
    });
  }

  if (dom.onlyNewBtn) {
    dom.onlyNewBtn.addEventListener('click', () => {
      state.onlyNew = !state.onlyNew;
      state.page = 1;
      dom.onlyNewBtn.classList.toggle('active', state.onlyNew);
      dom.onlyNewBtn.setAttribute('aria-pressed', String(state.onlyNew));
      dom.onlyNewBtn.textContent = state.onlyNew ? 'Mostrando apenas links novos' : 'Mostrar apenas links novos';
      renderNewsList();
    });
  }

  if (dom.academicSearch) {
    dom.academicSearch.addEventListener('input', () => {
      state.academicQuery = dom.academicSearch.value;
      renderAcademics();
    });
  }
}

async function loadJson(url, fallback = []) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return await response.json();
  } catch (err) {
    return fallback;
  }
}

async function boot() {
  const [news, featured, academics, meta] = await Promise.all([
    loadJson(NEWS_URL, []),
    loadJson(FEATURED_URL, []),
    loadJson(ACADEMICS_URL, []),
    loadJson(META_URL, null)
  ]);

  state.news = Array.isArray(news) ? news.filter((item) => item && item.url && item.title) : [];
  state.featured = Array.isArray(featured) ? featured : [];
  state.academics = Array.isArray(academics) ? academics : [];
  state.meta = meta && typeof meta === 'object' ? meta : null;

  renderSummary();
  renderSourceFilter();
  renderFeatured();
  renderNewLinks();
  renderNewsList();
  renderAcademics();
  bindEvents();
  setTab('news');
}

boot().catch((err) => {
  console.error(err);
  if (dom.newsList) {
    dom.newsList.innerHTML = '<li class="muted">Erro ao carregar os dados da curadoria.</li>';
  }
});
