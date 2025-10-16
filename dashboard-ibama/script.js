const elName = document.getElementById('name');
const elCpf = document.getElementById('cpf');
const elDesc = document.getElementById('desc');
const elBtn = document.getElementById('btnSearch');
const elPageSize = document.getElementById('pageSize');
const elPrev = document.getElementById('prev');
const elNext = document.getElementById('next');
const elTableBody = document.querySelector('#resultsTable tbody');
const elStatus = document.getElementById('status');
const elError = document.getElementById('error');
const elPageInfo = document.getElementById('pageInfo');
const elDateFrom = document.getElementById('dateFrom');
const elDateTo = document.getElementById('dateTo');
const elValorMin = document.getElementById('valorMin');
const elValorMax = document.getElementById('valorMax');
const elSortBy = document.getElementById('sortBy');
const elSortDir = document.getElementById('sortDir');

let page = 1;
let SQLModule = null;
let db = null;

async function initDb() {
  elStatus.textContent = 'Carregando banco...';
  const SQL = await window.initSqlJs({
    locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`,
  });
  SQLModule = SQL;
  const resp = await fetch('/public-data/ibama.sqlite', { cache: 'no-store' });
  if (!resp.ok) throw new Error(`Falha ao carregar SQLite: HTTP ${resp.status}`);
  const buf = await resp.arrayBuffer();
  db = new SQL.Database(new Uint8Array(buf));
  const sizeMb = (buf.byteLength / (1024 * 1024)).toFixed(1);
  elStatus.textContent = `Banco carregado (${sizeMb} MB)`;

  // Load meta info
  try {
    const metaBuilt = db.exec("SELECT value FROM meta WHERE key='built_at_utc'");
    const metaMaxDate = db.exec("SELECT value FROM meta WHERE key='max_date'");
    const builtVal = (metaBuilt[0] && metaBuilt[0].values[0]) ? metaBuilt[0].values[0][0] : '';
    const maxDateVal = (metaMaxDate[0] && metaMaxDate[0].values[0]) ? metaMaxDate[0].values[0][0] : '';
    const elBuilt = document.getElementById('lastUpdated');
    const elMax = document.getElementById('latestFineDate');
    if (elBuilt) elBuilt.textContent = builtVal || '–';
    if (elMax) elMax.textContent = maxDateVal || '–';
  } catch (e) {
    // ignore meta errors
  }
}

function buildQueries(name, cpf, limit, offset) {
  const where = [];
  const params = [];
  if (cpf) {
    where.push('cpf = ?');
    params.push(cpf);
  }
  if (name) {
    // case-insensitive prefix match per token
    const tokens = name.split(/\s+/).filter(Boolean);
    for (const t of tokens) {
      where.push('UPPER(name) LIKE ?');
      params.push((t.toUpperCase()) + '%');
    }
  }
  // description contains, case-insensitive, tokens AND
  const desc = elDesc?.value.trim() || '';
  if (desc) {
    const tokens = desc.split(/\s+/).filter(Boolean);
    for (const t of tokens) {
      where.push('UPPER(descricao) LIKE ?');
      params.push('%' + t.toUpperCase() + '%');
    }
  }
  // date range (stored as YYYY-MM-DD text)
  const dFrom = elDateFrom?.value || '';
  const dTo = elDateTo?.value || '';
  if (dFrom) { where.push('data >= ?'); params.push(dFrom); }
  if (dTo) { where.push('data <= ?'); params.push(dTo); }
  // value range
  const vMin = elValorMin?.value ? Number(elValorMin.value) : null;
  const vMax = elValorMax?.value ? Number(elValorMax.value) : null;
  if (vMin != null && !Number.isNaN(vMin)) { where.push('valor >= ?'); params.push(vMin); }
  if (vMax != null && !Number.isNaN(vMax)) { where.push('valor <= ?'); params.push(vMax); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countSql = `SELECT COUNT(1) as total FROM autos ${whereSql}`;
  // sorting (whitelist)
  const sortBy = (elSortBy?.value || 'data');
  const sortDir = (elSortDir?.value || 'DESC') === 'ASC' ? 'ASC' : 'DESC';
  const sortCol = ({id:'id', name:'name', valor:'valor', data:'data'})[sortBy] || 'data';
  const dataSql = `SELECT id, name, cpf, num_processo, data, valor, descricao FROM autos ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
  const dataParams = params.concat([limit, offset]);
  return { countSql, dataSql, params, dataParams };
}

function renderRows(rows) {
  elTableBody.innerHTML = '';
  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id ?? ''}</td>
      <td>${r.name ?? ''}</td>
      <td>${r.cpf ?? ''}</td>
      <td>${r.num_processo ?? ''}</td>
      <td>${r.data ?? ''}</td>
      <td>${(r.valor != null && r.valor !== '') ? fmtBRL.format(Number(r.valor)) : ''}</td>
      <td>${r.descricao ?? ''}</td>
    `;
    elTableBody.appendChild(tr);
  }
}

async function search() {
  elError.textContent = '';
  elStatus.textContent = 'Buscando...';
  elTableBody.innerHTML = '';
  elPageInfo.textContent = '';
  try {
    if (!db) await initDb();
    const name = elName.value.trim();
    const cpf = elCpf.value.trim();
    const pageSize = parseInt(elPageSize.value, 10) || 25;
    const offset = (page - 1) * pageSize;
    const { countSql, dataSql, params, dataParams } = buildQueries(name, cpf, pageSize, offset);

    let total = 0;
    const countRes = db.exec(countSql, params);
    if (countRes.length && countRes[0].values.length) {
      total = countRes[0].values[0][0];
    }

    const dataRes = db.exec(dataSql, dataParams);
    let rows = [];
    if (dataRes.length) {
      const cols = dataRes[0].columns;
      rows = dataRes[0].values.map(v => Object.fromEntries(cols.map((c, i) => [c, v[i]])));
    }

    elStatus.textContent = `Resultados: ${total}`;
    elPageInfo.textContent = `Página ${page} (tamanho ${pageSize})`;
    renderRows(rows);
  } catch (e) {
    elError.textContent = `Erro na busca: ${e.message}`;
    elStatus.textContent = '';
  }
}

elBtn.addEventListener('click', () => { page = 1; search(); });
elPrev.addEventListener('click', () => { if (page > 1) { page -= 1; search(); } });
elNext.addEventListener('click', () => { page += 1; search(); });
elPageSize.addEventListener('change', () => { page = 1; search(); });
elName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { page = 1; search(); } });
elCpf.addEventListener('keydown', (e) => { if (e.key === 'Enter') { page = 1; search(); } });
elDesc?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { page = 1; search(); } });
elDateFrom?.addEventListener('change', () => { page = 1; search(); });
elDateTo?.addEventListener('change', () => { page = 1; search(); });
elValorMin?.addEventListener('change', () => { page = 1; search(); });
elValorMax?.addEventListener('change', () => { page = 1; search(); });
elSortBy?.addEventListener('change', () => { page = 1; search(); });
elSortDir?.addEventListener('change', () => { page = 1; search(); });

initDb().catch(err => {
  elError.textContent = `Falha ao inicializar banco: ${err.message}`;
  elStatus.textContent = '';
});
