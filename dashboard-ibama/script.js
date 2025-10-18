/* global initSqlJs, XLSX, pako */

(function(){
  const DB_LOCAL_URL = './multas_ibama.sqlite.gz';
  let SQL = null;
  let db = null;
  let currentPage = 1;
  let totalRows = 0;

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
    totalBadge: document.getElementById('totalBadge'),
    status: document.getElementById('status'),
    error: document.getElementById('error'),
    tableBody: document.querySelector('#resultsTable tbody'),
    prev: document.getElementById('prev'),
    next: document.getElementById('next'),
    pageInfo: document.getElementById('pageInfo'),
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnExportXLSX: document.getElementById('btnExportXLSX'),
    btnMulti: document.getElementById('btnMulti'),
    multiModal: document.getElementById('multiModal'),
    multiNames: document.getElementById('multiNames'),
    multiCpfs: document.getElementById('multiCpfs'),
    multiApply: document.getElementById('multiApply'),
    laiModal: document.getElementById('laiModal'),
    laiText: document.getElementById('laiText'),
    laiCopy: document.getElementById('laiCopy'),
  };

  function setStatus(msg){ if(els.status) els.status.textContent = msg || ''; }
  function setError(msg){ if(els.error) els.error.textContent = msg || ''; }

  function normalize(str){
    if(!str) return '';
    return str.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
  }

  async function initDB(){
    setStatus('Carregando base local...');
    SQL = await initSqlJs({ locateFile: (f) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}` });
    const res = await fetch(DB_LOCAL_URL);
    if(!res.ok){ throw new Error(`Falha ao baixar database: ${res.status}`); }
    const gz = new Uint8Array(await res.arrayBuffer());
    const dbBytes = pako.ungzip(gz);
    db = new SQL.Database(dbBytes);
    setStatus('Base carregada.');
    await refreshMeta();
  }

  async function refreshMeta(){
    try{
      const stmt = db.prepare("SELECT key, value FROM meta WHERE key IN ('lastUpdated','latestFineDate')");
      const meta = {};
      while(stmt.step()){
        const row = stmt.getAsObject();
        meta[row.key] = row.value;
      }
      stmt.free();
      const last = document.getElementById('lastUpdated');
      const latest = document.getElementById('latestFineDate');
      if(last) last.textContent = meta.lastUpdated || '–';
      if(latest) latest.textContent = meta.latestFineDate || '–';
    }catch(e){ /* ignore */ }
  }

  function buildWhere(params){
    const where = [];
    const args = [];

    // name terms via FTS prefix matching (OR across terms)
    if(params.nameTerms && params.nameTerms.length){
      const parts = [];
      for(const t of params.nameTerms){
        parts.push("rowid IN (SELECT rowid FROM multas_fts WHERE nome MATCH ?)");
        args.push(t + '*');
      }
      where.push('(' + parts.join(' OR ') + ')');
    }
    // description as a single term (keep simple); could be split in the future
    if(params.desc){
      where.push("rowid IN (SELECT rowid FROM multas_fts WHERE descricao MATCH ?)\n");
      args.push(params.desc + '*');
    }
    // cpf terms (numeric only), allow partial prefix; OR across terms
    if(params.cpfTerms && params.cpfTerms.length){
      const parts = [];
      for(const c of params.cpfTerms){
        parts.push("cpf_norm LIKE ?");
        args.push(c + '%');
      }
      where.push('(' + parts.join(' OR ') + ')');
    }
    if(params.dateFrom){
      where.push("data >= ?");
      args.push(params.dateFrom);
    }
    if(params.dateTo){
      where.push("data <= ?");
      args.push(params.dateTo);
    }
    if(params.valorMin != null){
      where.push("val_auto_infracao >= ?");
      args.push(params.valorMin);
    }
    if(params.valorMax != null){
      where.push("val_auto_infracao <= ?");
      args.push(params.valorMax);
    }

    const sqlWhere = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    return { sqlWhere, args };
  }

  function getInputs(){
    const pageSize = parseInt(els.pageSize.value || '25', 10) || 25;
    // Split comma-separated inputs
    const nameTerms = (els.name.value||'').split(',').map(s=>normalize(s)).filter(Boolean);
    const cpfTerms = (els.cpf.value||'').split(',').map(s=>s.replace(/\D+/g,'')).filter(Boolean);
    const params = {
      nameTerms,
      cpfTerms,
      desc: normalize(els.desc.value),
      dateFrom: els.dateFrom.value || '',
      dateTo: els.dateTo.value || '',
      valorMin: els.valorMin.value ? parseFloat(els.valorMin.value) : null,
      valorMax: els.valorMax.value ? parseFloat(els.valorMax.value) : null,
      sortBy: els.sortBy.value,
      sortDir: els.sortDir.value,
      pageSize,
    };
    return params;
  }

  function sortClause(sortBy, sortDir){
    const dir = sortDir === 'ASC' ? 'ASC' : 'DESC';
    switch(sortBy){
      case 'valor': return `ORDER BY val_auto_infracao ${dir}`;
      case 'name': return `ORDER BY nome_norm ${dir}`;
      case 'id': return `ORDER BY id ${dir}`;
      case 'data':
      default: return `ORDER BY data ${dir}`;
    }
  }

  function queryCount(params){
    const { sqlWhere, args } = buildWhere(params);
    const sql = `SELECT COUNT(*) as c FROM multas ${sqlWhere}`;
    const stmt = db.prepare(sql);
    stmt.bind(args);
    let c = 0;
    if(stmt.step()){
      const row = stmt.getAsObject();
      c = row.c|0;
    }
    stmt.free();
    return c;
  }

  function queryPage(params, page){
    const { sqlWhere, args } = buildWhere(params);
    const order = sortClause(params.sortBy, params.sortDir);
    const limit = params.pageSize;
    const offset = Math.max(0, (page-1) * limit);
    const sql = `SELECT id, nome_infrator, cpf_cnpj_infrator, num_processo, data, val_auto_infracao, des_auto_infracao FROM multas ${sqlWhere} ${order} LIMIT ${limit} OFFSET ${offset}`;
    const stmt = db.prepare(sql);
    stmt.bind(args);
    const rows = [];
    while(stmt.step()){
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  function renderRows(rows){
    const tb = els.tableBody;
    tb.innerHTML = '';
    const frag = document.createDocumentFragment();
    for(const r of rows){
      const tr = document.createElement('tr');
      const tds = [
        r.nome_infrator || '',
        r.cpf_cnpj_infrator || '',
        r.num_processo || '',
        r.data || '',
        (r.val_auto_infracao != null ? Number(r.val_auto_infracao).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) : ''),
        r.des_auto_infracao || '',
        // LAI button
        ''
      ];
      for(let i=0;i<tds.length;i++){
        const td = document.createElement('td');
        if(i === 6){
          const btn = document.createElement('button');
          btn.className = 'btn-secondary lai-btn';
          btn.textContent = 'Gerar pedido LAI';
          btn.addEventListener('click', ()=> openLaiModal(r));
          td.appendChild(btn);
        } else {
          td.textContent = tds[i];
        }
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    }
    tb.appendChild(frag);
  }

  function openLaiModal(row){
    const txt = `Solicito, com base na Lei de Acesso à Informação, cópia integral do processo administrativo relacionado ao Auto de Infração ${row.num_processo || '(sem nº)'} e respectiva decisão, referente ao autuado ${row.nome_infrator || ''} (CPF/CNPJ ${row.cpf_cnpj_infrator||''}), lavrado na data ${row.data||''}.`;
    if(els.laiText) els.laiText.value = txt;
    if(els.laiModal){ els.laiModal.style.display = 'block'; els.laiModal.setAttribute('aria-hidden','false'); }
  }

  function closeModal(modal){ if(modal){ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); } }

  function updatePager(params){
    const pageSize = params.pageSize;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    els.pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    els.prev.disabled = currentPage <= 1;
    els.next.disabled = currentPage >= totalPages;
  }

  function updateTotalBadge(){
    els.totalBadge.textContent = `${totalRows.toLocaleString('pt-BR')} resultados`;
  }

  async function doSearch(goFirstPage=false){
    setError('');
    const params = getInputs();
    if(goFirstPage) currentPage = 1;
    setStatus('Buscando...');
    try{
      totalRows = queryCount(params);
      updateTotalBadge();
      updatePager(params);
      const rows = queryPage(params, currentPage);
      renderRows(rows);
      setStatus('');
    }catch(e){
      console.error(e);
      setError('Erro na consulta: ' + (e && e.message ? e.message : String(e)));
      setStatus('');
    }
  }

  function exportCurrentPageToCSV(){
    const params = getInputs();
    const rows = queryPage(params, currentPage);
    const header = ['Nome','CPF/CNPJ','Nº Processo','Data','Valor (R$)','Descrição'];
    const body = rows.map(r=>[
      r.nome_infrator || '',
      r.cpf_cnpj_infrator || '',
      r.num_processo || '',
      r.data || '',
      r.val_auto_infracao != null ? String(r.val_auto_infracao).replace('.',',') : '',
      (r.des_auto_infracao||'').replace(/\n/g,' ')
    ]);
    const csv = [header].concat(body).map(a=>a.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'multas_page.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportCurrentPageToXLSX(){
    const params = getInputs();
    const rows = queryPage(params, currentPage);
    const data = rows.map(r=>({
      Nome: r.nome_infrator || '',
      'CPF/CNPJ': r.cpf_cnpj_infrator || '',
      'Nº Processo': r.num_processo || '',
      Data: r.data || '',
      'Valor (R$)': r.val_auto_infracao || '',
      Descrição: r.des_auto_infracao || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Multas');
    XLSX.writeFile(wb, 'multas_page.xlsx');
  }

  function openMultiModal(){ if(els.multiModal){ els.multiModal.style.display='block'; els.multiModal.setAttribute('aria-hidden','false'); } }

  function applyMulti(){
    const names = (els.multiNames.value||'').split(',').map(s=>s.trim()).filter(Boolean);
    const cpfs = (els.multiCpfs.value||'').split(',').map(s=>s.trim()).filter(Boolean);
    // Push all terms back to main inputs as comma-separated lists
    if(names.length){ els.name.value = names.join(', '); }
    if(cpfs.length){ els.cpf.value = cpfs.join(', '); }
    closeModal(els.multiModal);
    doSearch(true);
  }

  function wireEvents(){
    els.btnSearch.addEventListener('click', ()=> doSearch(true));
    els.prev.addEventListener('click', ()=>{ if(currentPage>1){ currentPage--; doSearch(false); } });
    els.next.addEventListener('click', ()=>{ currentPage++; doSearch(false); });

    els.pageSize.addEventListener('change', ()=> doSearch(true));
    els.sortBy.addEventListener('change', ()=> doSearch(true));
    els.sortDir.addEventListener('change', ()=> doSearch(true));

    els.btnExportCSV.addEventListener('click', exportCurrentPageToCSV);
    els.btnExportXLSX.addEventListener('click', exportCurrentPageToXLSX);

    if(els.btnMulti){ els.btnMulti.addEventListener('click', openMultiModal); }
    if(els.multiApply){ els.multiApply.addEventListener('click', applyMulti); }

    // Close modals on backdrop click
    document.querySelectorAll('[data-close]').forEach(el=>{
      el.addEventListener('click', (e)=>{
        const modal = e.target.closest('.modal');
        closeModal(modal);
      });
    });

    if(els.laiCopy && els.laiText){
      els.laiCopy.addEventListener('click', ()=>{
        els.laiText.select();
        document.execCommand('copy');
      });
    }
  }

  async function boot(){
    try{
      await initDB();
      wireEvents();
      await doSearch(true);
    }catch(e){
      console.error(e);
      setError('Falha ao inicializar: ' + (e && e.message ? e.message : String(e)));
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
