(function(){
  const CSV_PATH = 'multas_ibama_2019_2025.csv';

  const els = {
    name: document.getElementById('name'),
    cpf: document.getElementById('cpf'),
    desc: document.getElementById('desc'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    valorMin: document.getElementById('valorMin'),
    valorMax: document.getElementById('valorMax'),
    sortBy: document.getElementById('sortBy'),
    sortDir: document.getElementById('sortDir'),
    pageSize: document.getElementById('pageSize'),
    btnSearch: document.getElementById('btnSearch'),
    btnPrev: document.getElementById('prev'),
    btnNext: document.getElementById('next'),
    pageInfo: document.getElementById('pageInfo'),
    totalBadge: document.getElementById('totalBadge'),
    status: document.getElementById('status'),
    error: document.getElementById('error'),
    tableBody: document.querySelector('#resultsTable tbody'),
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnExportXLSX: document.getElementById('btnExportXLSX'),
    btnMulti: document.getElementById('btnMulti'),
    multiModal: document.getElementById('multiModal'),
    multiApply: document.getElementById('multiApply'),
    multiNames: document.getElementById('multiNames'),
    multiCpfs: document.getElementById('multiCpfs')
  };

  // Disable XLSX export since the XLSX lib was removed
  if (els.btnExportXLSX) {
    els.btnExportXLSX.disabled = true;
    els.btnExportXLSX.title = 'Desativado';
    els.btnExportXLSX.style.opacity = '0.5';
    els.btnExportXLSX.style.pointerEvents = 'none';
  }

  const state = {
    rows: [], // full dataset
    filtered: [],
    page: 1
  };

  function setStatus(msg) { if (els.status) els.status.textContent = msg || ''; }
  function setError(msg) { if (els.error) els.error.textContent = msg || ''; }

  function normalize(str){
    return (str || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu,'').toUpperCase();
  }

  function parseNumberBR(v){
    if (v == null) return null;
    // Some files may come with dot for thousands and comma for decimals, but here seems plain number
    const s = String(v).replace(/[^0-9.,-]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  function parseDateISO(s){
    if (!s) return null;
    // Expecting formats like '2021-03-15 12:34:56' or ISO
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function csvParse(text){
    const lines = text.split(/\r?\n/);
    if (!lines.length) return { header: [], rows: [] };
    const header = parseCSVLine(lines[0]);
    const rows = [];
    for (let i=1;i<lines.length;i++){
      const line = lines[i];
      if (!line) continue;
      const fields = parseCSVLine(line);
      if (!fields.length) continue;
      const row = {};
      for (let j=0;j<header.length;j++) row[header[j]] = fields[j] ?? '';
      rows.push(row);
    }
    return { header, rows };
  }

  function parseCSVLine(line){
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i=0;i<line.length;i++){
      const ch = line[i];
      if (inQuotes){
        if (ch === '"'){
          if (line[i+1] === '"'){ cur += '"'; i++; }
          else { inQuotes = false; }
        } else {
          cur += ch;
        }
      } else {
        if (ch === ',') { out.push(cur); cur=''; }
        else if (ch === '"') { inQuotes = true; }
        else { cur += ch; }
      }
    }
    out.push(cur);
    return out;
  }

  function applyFilters(){
    const nameQ = normalize(els.name?.value);
    const cpfQ = (els.cpf?.value || '').replace(/\D/g, '');
    const descQ = normalize(els.desc?.value);
    const dateFrom = els.dateFrom?.value ? new Date(els.dateFrom.value) : null;
    const dateTo = els.dateTo?.value ? new Date(els.dateTo.value) : null;
    const vMin = els.valorMin?.value ? parseFloat(els.valorMin.value) : null;
    const vMax = els.valorMax?.value ? parseFloat(els.valorMax.value) : null;

    const by = els.sortBy?.value || 'data';
    const dir = (els.sortDir?.value || 'DESC').toUpperCase();

    let arr = state.rows.filter(r => {
      if (nameQ && !normalize(r.nome_infrator).includes(nameQ)) return false;
      if (cpfQ && String(r.cpf_cnpj_infrator || '').replace(/\D/g,'') !== cpfQ) return false;
      if (descQ){
        const inDesc = normalize(r.des_auto_infracao).includes(descQ) || normalize(r.des_infracao).includes(descQ);
        if (!inDesc) return false;
      }
      if (dateFrom && r._date && r._date < dateFrom) return false;
      if (dateTo && r._date && r._date > new Date(dateTo.getTime() + 24*3600*1000 - 1)) return false;
      if (vMin != null && r._valor != null && r._valor < vMin) return false;
      if (vMax != null && r._valor != null && r._valor > vMax) return false;
      return true;
    });

    arr.sort((a,b)=>{
      let av, bv;
      if (by === 'valor'){ av = a._valor ?? -Infinity; bv = b._valor ?? -Infinity; }
      else if (by === 'name'){ av = normalize(a.nome_infrator); bv = normalize(b.nome_infrator); }
      else if (by === 'id'){ av = String(a.num_processo||''); bv = String(b.num_processo||''); }
      else { av = a._date ? a._date.getTime() : -Infinity; bv = b._date ? b._date.getTime() : -Infinity; }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'ASC' ? cmp : -cmp;
    });

    state.filtered = arr;
    state.page = 1;
    render();
  }

  function render(){
    const ps = parseInt(els.pageSize?.value || '25', 10) || 25;
    const total = state.filtered.length;
    const pages = Math.max(1, Math.ceil(total / ps));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * ps;
    const pageRows = state.filtered.slice(start, start + ps);

    if (els.totalBadge) els.totalBadge.textContent = `${total} resultados`;
    if (els.pageInfo) els.pageInfo.textContent = `${state.page} / ${pages}`;
    if (els.btnPrev) els.btnPrev.disabled = state.page <= 1;
    if (els.btnNext) els.btnNext.disabled = state.page >= pages;

    if (els.tableBody){
      const frag = document.createDocumentFragment();
      for (const r of pageRows){
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHTML(r.nome_infrator)}</td>
          <td>${escapeHTML(r.cpf_cnpj_infrator)}</td>
          <td>${escapeHTML(r.num_processo||'')}</td>
          <td>${r._date ? r._date.toISOString().slice(0,10) : ''}</td>
          <td>${r._valor != null ? r._valor.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }) : ''}</td>
          <td>${escapeHTML(r.des_auto_infracao || r.des_infracao || '')}</td>
          <td><button class="lai-btn btn-secondary" data-proc="${escapeAttr(r.num_processo||'')}">Copiar LAI</button></td>
        `;
        frag.appendChild(tr);
      }
      els.tableBody.innerHTML = '';
      els.tableBody.appendChild(frag);
    }
  }

  function escapeHTML(s){
    return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#39;" }[m]));
  }
  function escapeAttr(s){
    return String(s||'').replace(/["']/g, '_');
  }

  function exportCurrentAsCSV(){
    const header = ['nome_infrator','cpf_cnpj_infrator','num_processo','dat_hora_auto_infracao','val_auto_infracao','des_auto_infracao'];
    const lines = [header.join(',')];
    for (const r of state.filtered){
      const row = header.map(k=>csvQuote(r[k] ?? ''));
      lines.push(row.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'multas_filtradas.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function csvQuote(v){
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  }

  // Multi-search modal (names and cpfs)
  function setupMultiModal(){
    if (!els.btnMulti || !els.multiModal) return;
    // open
    els.btnMulti.addEventListener('click', ()=>{
      els.multiModal.style.display = 'block';
      els.multiModal.setAttribute('aria-hidden','false');
    });
    // close by backdrop or buttons with [data-close]
    els.multiModal.addEventListener('click', (e)=>{
      if (e.target.matches('[data-close]') || e.target.classList.contains('modal-backdrop')){
        els.multiModal.style.display = 'none';
        els.multiModal.setAttribute('aria-hidden','true');
      }
    });
    if (els.multiApply){
      els.multiApply.addEventListener('click', ()=>{
        const names = (els.multiNames?.value || '')
          .split(',').map(s=>s.trim()).filter(Boolean);
        const cpfs = (els.multiCpfs?.value || '')
          .split(',').map(s=>s.trim().replace(/\D/g,'')).filter(Boolean);
        if (names.length) els.name.value = names[0];
        if (cpfs.length) els.cpf.value = cpfs[0];
        els.multiModal.style.display = 'none';
        els.multiModal.setAttribute('aria-hidden','true');
        applyFilters();
      });
    }
  }

  async function init(){
    try {
      setStatus('Carregando dataset (pode levar alguns segundos)...');
      const resp = await fetch(CSV_PATH, { cache: 'force-cache' });
      if (!resp.ok) throw new Error(`Falha ao baixar CSV: ${resp.status}`);
      const text = await resp.text();
      const { header, rows } = csvParse(text);

      const need = ['nome_infrator','cpf_cnpj_infrator','num_processo','dat_hora_auto_infracao','val_auto_infracao','des_auto_infracao','des_infracao'];
      for (const k of need){ if (!header.includes(k)) console.warn('Coluna ausente:', k); }

      for (const r of rows){
        r._date = parseDateISO(r.dat_hora_auto_infracao);
        r._valor = parseNumberBR(r.val_auto_infracao);
      }
      state.rows = rows;
      setStatus(`Dataset carregado: ${rows.length} linhas.`);
      setError('');

      // wire UI
      els.btnSearch?.addEventListener('click', applyFilters);
      [els.name, els.cpf, els.desc, els.dateFrom, els.dateTo, els.valorMin, els.valorMax, els.sortBy, els.sortDir, els.pageSize]
        .forEach(el => el && el.addEventListener('change', applyFilters));
      els.btnPrev?.addEventListener('click', ()=>{ if (state.page>1){ state.page--; render(); } });
      els.btnNext?.addEventListener('click', ()=>{ state.page++; render(); });
      els.btnExportCSV?.addEventListener('click', exportCurrentAsCSV);

      setupMultiModal();

      applyFilters();

      // LAI handler
      document.addEventListener('click', (e)=>{
        const b = e.target.closest && e.target.closest('.lai-btn');
        if (!b) return;
        const proc = b.getAttribute('data-proc') || '';
        const text = `Prezados,\n\nSolicito, com base na LAI, cópia integral do processo ${proc}.`;
        const t = document.getElementById('laiText');
        if (t) { t.value = text; }
        const m = document.getElementById('laiModal');
        if (m){ m.style.display='block'; m.setAttribute('aria-hidden','false'); }
      });

    } catch (err){
      console.error(err);
      setStatus('');
      setError('Erro ao carregar ou processar o dataset.');
    }
  }

  // Start
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
