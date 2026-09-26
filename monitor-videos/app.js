const el = id => document.getElementById(id);
const number = value => value == null ? '—' : new Intl.NumberFormat('en-GB').format(value);
const dateLabel = value => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'}) : '—';
const dateTime = value => value ? new Date(value).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'}) : '—';
let catalog = [], data = {snapshots:[], comments:[], errors:{}};
function node(tag, className, text) { const n=document.createElement(tag); if(className)n.className=className;if(text!=null)n.textContent=text;return n; }
function metricDelta(now, prior, key) {return !now || !prior || now.source !== prior.source || now[key] == null || prior[key] == null ? null : now[key]-prior[key];}
function render() {
  const dates=[...new Set(data.snapshots.map(x=>x.date))].sort().reverse();
  const picked=el('date').value || dates[0];
  const platform=el('platform').value, query=el('search').value.toLocaleLowerCase('en-GB').trim();
  const videos=catalog.filter(v=>(platform==='all'||v.platform===platform)&&(`${v.portfolioLabel} ${v.url}`).toLocaleLowerCase('en-GB').includes(query));
  const dayRows=new Map(data.snapshots.filter(x=>x.date===picked).map(x=>[x.videoId,x]));
  const olderDates=dates.filter(d=>d<picked); const previous=olderDates[0];
  const priorRows=new Map(data.snapshots.filter(x=>x.date===previous).map(x=>[x.videoId,x]));
  const rows=videos.map(v=>({v,now:dayRows.get(v.id),prior:priorRows.get(v.id)}));
  const total=key=>rows.reduce((n,r)=>n+(r.now?.[key]??0),0);
  const diff=key=>rows.reduce((n,r)=>n+(metricDelta(r.now,r.prior,key)??0),0);
  const complete=key=>previous&&rows.some(r=>metricDelta(r.now,r.prior,key)!=null);
  const metric=(label,key)=>{
    const available=rows.filter(r=>r.now?.[key]!=null).length;
    const comparable=rows.filter(r=>metricDelta(r.now,r.prior,key)!=null).length;
    const change=complete(key)?`${diff(key)>=0?'+':''}${number(diff(key))} since ${dateLabel(previous)} (${comparable} comparable)`:'No previous snapshot';
    return [label,available?total(key):null,`${change} · data for ${available}/${rows.length} videos`];
  };
  const metrics=[['Videos tracked',rows.filter(r=>r.now).length,`${videos.length} in the catalogue`],metric('Views','views'),metric('Likes','likes'),metric('Comments','comments')];
  const summary=el('summary');summary.replaceChildren();for(const [label,value,sub] of metrics){const card=node('div','metric');card.append(node('div','label',label),node('strong','value',value==null?'—':number(value)),node('div','delta',sub));summary.append(card);}
  const sort=el('sort').value;
  rows.sort((a,b)=>sort==='title'?(a.now?.title||a.v.portfolioLabel).localeCompare(b.now?.title||b.v.portfolioLabel):sort==='growth'?(metricDelta(b.now,b.prior,'views')??-Infinity)-(metricDelta(a.now,a.prior,'views')??-Infinity):(b.now?.[sort]??-Infinity)-(a.now?.[sort]??-Infinity));
  const tbody=el('videos');tbody.replaceChildren();for(const r of rows){const tr=node('tr');const td=node('td');const a=node('a','video-link',r.now?.title||r.v.portfolioLabel);a.href=r.v.url;a.target='_blank';a.rel='noopener';td.append(node('span',`platform ${r.v.platform}`,r.v.platform==='youtube'?'YouTube':r.v.platform==='tiktok'?'TikTok':'Instagram'),a,node('span','sub',r.now?`Collected ${dateTime(r.now.collectedAt)}`:'Metrics unavailable for this date'));tr.append(td);for(const key of ['views','likes','comments']){const cell=node('td');cell.append(node('strong',r.now?.[key]==null?'missing':'',number(r.now?.[key])));const d=metricDelta(r.now,r.prior,key);cell.append(node('span',`sub ${d==null?'':d<0?'down':'up'}`,d==null?'—':`${d>=0?'+':''}${number(d)}`));tr.append(cell);}tbody.append(tr);}if(!rows.length)tbody.append(node('tr','',''));
  el('video-count').textContent=`${rows.length} video${rows.length===1?'':'s'} shown`;
  let comments=data.comments.filter(c=>videos.some(v=>v.id===c.videoId)&&(!picked||c.firstSeen<=picked));if(el('comment-filter').value==='new')comments=comments.filter(c=>c.firstSeen===picked&&!c.baseline);comments.sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''));el('comment-count').textContent=`${comments.length} comment${comments.length===1?'':'s'} in this filter · up to 200 shown`;
  const box=el('comments');box.replaceChildren();for(const c of comments.slice(0,200)){const video=catalog.find(v=>v.id===c.videoId);const item=node('article','comment');const meta=node('div','comment-meta');meta.append(node('strong','',c.author||'User'),node('span','',dateTime(c.publishedAt)));const text=node('p','',c.text||'');const link=node('a','',video?.portfolioLabel||'Open video');link.href=c.url||video?.url||'#';link.target='_blank';link.rel='noopener';item.append(meta,text,link);box.append(item);}if(!comments.length)box.append(node('p','empty',data.generatedAt?'No comments captured for this filter.':'Comments will appear after the first collection.'));
  el('stamp').textContent=data.generatedAt?`Last updated: ${dateTime(data.generatedAt)} · dates in UTC`:'Daily collection has not started';
}
Promise.all([fetch('videos.json').then(r=>r.json()),fetch('data.json',{cache:'no-store'}).then(r=>r.json())]).then(([v,d])=>{catalog=v;data=d;const dates=[...new Set(data.snapshots.map(x=>x.date))].sort().reverse();for(const date of dates){const option=node('option','',dateLabel(date));option.value=date;el('date').append(option);}if(dates.length===1)el('comment-filter').value='all';if(!dates.length){const option=node('option','','No data');option.value='';el('date').append(option);}for(const id of ['platform','date','sort','comment-filter'])el(id).addEventListener('change',render);el('search').addEventListener('input',render);render();}).catch(error=>{el('notice').hidden=false;el('notice').textContent=`Could not load the monitor: ${error.message}`;});
