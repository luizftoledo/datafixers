const el = id => document.getElementById(id);
const number = value => value == null ? '—' : new Intl.NumberFormat('pt-BR').format(value);
const dateLabel = value => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'}) : '—';
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}) : '—';
let catalog = [], data = {snapshots:[], comments:[], errors:{}};
function node(tag, className, text) { const n=document.createElement(tag); if(className)n.className=className;if(text!=null)n.textContent=text;return n; }
function delta(current, prior) {return current == null || prior == null ? null : current-prior;}
function render() {
  const dates=[...new Set(data.snapshots.map(x=>x.date))].sort().reverse();
  const picked=el('date').value || dates[0];
  const platform=el('platform').value, query=el('search').value.toLocaleLowerCase('pt-BR').trim();
  const videos=catalog.filter(v=>(platform==='all'||v.platform===platform)&&(`${v.portfolioLabel} ${v.url}`).toLocaleLowerCase('pt-BR').includes(query));
  const dayRows=new Map(data.snapshots.filter(x=>x.date===picked).map(x=>[x.videoId,x]));
  const olderDates=dates.filter(d=>d<picked); const previous=olderDates[0];
  const priorRows=new Map(data.snapshots.filter(x=>x.date===previous).map(x=>[x.videoId,x]));
  const rows=videos.map(v=>({v,now:dayRows.get(v.id),prior:priorRows.get(v.id)}));
  const total=key=>rows.reduce((n,r)=>n+(r.now?.[key]??0),0);
  const diff=key=>rows.reduce((n,r)=>n+(delta(r.now?.[key],r.prior?.[key])??0),0);
  const complete=key=>previous&&rows.some(r=>delta(r.now?.[key],r.prior?.[key])!=null);
  const metrics=[['Vídeos monitorados',rows.filter(r=>r.now).length,`${videos.length} no catálogo`],['Visualizações / reproduções',rows.some(r=>r.now?.views!=null)?total('views'):null,complete('views')?`${diff('views')>=0?'+':''}${number(diff('views'))} desde ${dateLabel(previous)}`:'Sem comparação anterior'],['Curtidas acumuladas',rows.some(r=>r.now?.likes!=null)?total('likes'):null,complete('likes')?`${diff('likes')>=0?'+':''}${number(diff('likes'))} desde ${dateLabel(previous)}`:'Sem comparação anterior'],['Comentários acumulados',rows.some(r=>r.now?.comments!=null)?total('comments'):null,complete('comments')?`${diff('comments')>=0?'+':''}${number(diff('comments'))} desde ${dateLabel(previous)}`:'Sem comparação anterior']];
  const summary=el('summary');summary.replaceChildren();for(const [label,value,sub] of metrics){const card=node('div','metric');card.append(node('div','label',label),node('strong','value',value==null?'—':number(value)),node('div','delta',sub));summary.append(card);}
  const sort=el('sort').value;
  rows.sort((a,b)=>sort==='title'?(a.now?.title||a.v.portfolioLabel).localeCompare(b.now?.title||b.v.portfolioLabel):sort==='growth'?(delta(b.now?.views,b.prior?.views)??-Infinity)-(delta(a.now?.views,a.prior?.views)??-Infinity):(b.now?.[sort]??-Infinity)-(a.now?.[sort]??-Infinity));
  const tbody=el('videos');tbody.replaceChildren();for(const r of rows){const tr=node('tr');const td=node('td');const a=node('a','video-link',r.now?.title||r.v.portfolioLabel);a.href=r.v.url;a.target='_blank';a.rel='noopener';td.append(node('span',`platform ${r.v.platform}`,r.v.platform==='youtube'?'YouTube':'Instagram'),a,node('span','sub',r.now?`Coletado em ${dateTime(r.now.collectedAt)}`:(data.errors?.[r.v.id]||'Aguardando primeira coleta')));tr.append(td);for(const key of ['views','likes','comments']){const cell=node('td');cell.append(node('strong',r.now?.[key]==null?'missing':'',number(r.now?.[key])));const d=delta(r.now?.[key],r.prior?.[key]);cell.append(node('span',`sub ${d==null?'':d<0?'down':'up'}`,d==null?'—':`${d>=0?'+':''}${number(d)}`));tr.append(cell);}tbody.append(tr);}if(!rows.length)tbody.append(node('tr','',''));
  el('video-count').textContent=`${rows.length} vídeo${rows.length===1?'':'s'} no filtro`;
  let comments=data.comments.filter(c=>videos.some(v=>v.id===c.videoId)&&(!picked||c.firstSeen<=picked));if(el('comment-filter').value==='new')comments=comments.filter(c=>c.firstSeen===picked&&!c.baseline);comments.sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''));el('comment-count').textContent=`${comments.length} comentário${comments.length===1?'':'s'} neste filtro · até 200 exibidos`;
  const box=el('comments');box.replaceChildren();for(const c of comments.slice(0,200)){const video=catalog.find(v=>v.id===c.videoId);const item=node('article','comment');const meta=node('div','comment-meta');meta.append(node('strong','',c.author||'Usuário'),node('span','',dateTime(c.publishedAt)));const text=node('p','',c.text||'');const link=node('a','',video?.portfolioLabel||'Abrir vídeo');link.href=c.url||video?.url||'#';link.target='_blank';link.rel='noopener';item.append(meta,text,link);box.append(item);}if(!comments.length)box.append(node('p','empty',data.generatedAt?'Nenhum comentário capturado neste filtro.':'Os comentários aparecerão após a primeira coleta.'));
  const errors=Object.entries(data.errors||{});const notice=el('notice');notice.hidden=!errors.length;if(errors.length)notice.textContent='Fontes com falha ou sem credencial: '+errors.map(([source,msg])=>`${source}: ${msg}`).join(' · ');
  el('stamp').textContent=data.generatedAt?`Última execução: ${dateTime(data.generatedAt)} · datas em UTC`:'Coleta diária ainda não iniciada';
}
Promise.all([fetch('videos.json').then(r=>r.json()),fetch('data.json',{cache:'no-store'}).then(r=>r.json())]).then(([v,d])=>{catalog=v;data=d;const dates=[...new Set(data.snapshots.map(x=>x.date))].sort().reverse();for(const date of dates){const option=node('option','',dateLabel(date));option.value=date;el('date').append(option);}if(dates.length===1)el('comment-filter').value='all';if(!dates.length){const option=node('option','','Sem dados');option.value='';el('date').append(option);}for(const id of ['platform','date','sort','comment-filter'])el(id).addEventListener('change',render);el('search').addEventListener('input',render);render();}).catch(error=>{el('notice').hidden=false;el('notice').textContent=`Não foi possível carregar o painel: ${error.message}`;});
