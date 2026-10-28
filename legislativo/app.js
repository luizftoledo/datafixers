/* Public reader. Editorial operations are not part of this application. */
(()=>{'use strict';
const $=s=>document.querySelector(s), names={camara:'Câmara dos Deputados',senado:'Senado',alesp:'Alesp',cmsp:'Câmara de SP',congresso:'Congresso'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
const initialHouse=new URLSearchParams(location.search).get('casa');
function applyHouseFilter(value){document.querySelectorAll('[data-house]').forEach(el=>{el.hidden=!!value&&value!=='all'&&el.dataset.house!==value;});document.querySelectorAll('[data-filter]').forEach(el=>el.classList.toggle('selected',el.dataset.filter===(value||'all')));}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>applyHouseFilter(b.dataset.filter)));
if(initialHouse)applyHouseFilter(initialHouse);
document.querySelectorAll('.subnavigation a').forEach(a=>a.classList.toggle('selected',new URL(a.href).pathname===location.pathname));
$('#share')?.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);$('#share').textContent='Link copiado ✓';}}catch{}});
if(!$('#stories')){$('#search-toggle')?.addEventListener('click',()=>location.href=document.querySelector('.navhome').href+'?busca=1');return;}
let all=[];const params=new URLSearchParams(location.search),house=params.get('casa'),kind=params.get('tipo');
if(kind==='weekly'){location.replace('semana/');return;}
const showSearch=()=>{$('#search-panel').hidden=!$('#search-panel').hidden;if(!$('#search-panel').hidden)$('#search').focus();};
$('#search-toggle').addEventListener('click',showSearch);if(params.has('busca'))showSearch();
function render(){let q=$('#search').value.trim().toLocaleLowerCase('pt-BR');let filtered=all.filter(a=>(!house||a.house===house)&&(!kind||a.kind===kind)&&(!q||[a.title,a.subtitle,a.proposal,a.topic].join(' ').toLocaleLowerCase('pt-BR').includes(q)));
if(house||kind){$('#active-filter').hidden=false;$('#active-filter').innerHTML='<span>'+esc(names[house]||(kind==='weekly'?'A semana':'Arquivo'))+'</span><a href="./">Ver todas as casas ×</a>';}
const current=all.find(a=>!['context','weekly','note'].includes(a.kind));$('#edition-date').textContent=current?'EDIÇÃO DE '+date(current.edition_date).toLocaleUpperCase('pt-BR'):'';
document.querySelectorAll('.navigation a').forEach(a=>{let p=new URL(a.href).searchParams;a.classList.toggle('selected',house?p.get('casa')===house:kind?p.get('tipo')===kind:!p.size);});
let lead=filtered.find(a=>!['context','weekly','note'].includes(a.kind));$('#stories').innerHTML=lead?'<article class="lead"><a class="lead-link" href="'+encodeURIComponent(lead.id)+'/"><div class="lead-meta"><span class="eyebrow">'+esc(names[lead.house])+'</span><span>'+esc(lead.status_label)+'</span></div><h2>'+esc(lead.title)+'</h2><p>'+esc(lead.subtitle)+'</p><div class="lead-bottom"><span>'+esc(lead.topic)+' · '+esc(lead.reading_minutes)+' min</span><span class="read">Ler reportagem <i>↗</i></span></div></a></article>':'<section class="empty"><span class="eyebrow">ARQUIVO</span><h2>'+(q?'Nenhum resultado para esta busca.':'Ainda não há edição publicada nesta seção.')+'</h2><p>'+(q?'Tente outra palavra ou limpe os filtros.':'As próximas edições aparecerão aqui.')+'</p></section>';
if(!lead&&!q&&(filtered.some(a=>a.kind==='context')||document.querySelector(house?'.news-card[data-house="'+CSS.escape(house)+'"]':'.news-card')))$('#stories').innerHTML='';
const previous=filtered.filter(a=>a.id!==lead?.id&&!['context','weekly'].includes(a.kind));
$('#stories').hidden=!lead&&previous.length>0;
$('#recent-stories').hidden=!previous.length;
$('#recent-list').innerHTML=previous.slice(0,8).map(a=>'<a class="front-card" href="./'+a.id.split('/').map(encodeURIComponent).join('/')+'/"><span class="eyebrow">'+esc(names[a.house])+' · '+(a.kind==='note'?'Nota':'Reportagem')+'</span><h3>'+esc(a.title)+'</h3><p>'+esc(a.subtitle)+'</p><time datetime="'+esc(a.edition_date)+'">'+esc(date(a.edition_date))+'</time></a>').join('');}
$('#search').addEventListener('input',render);$('#clear').addEventListener('click',()=>{$('#search').value='';render();});
fetch('frontpage.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{all=data;render();}).catch(()=>{if($('#stories .lead'))return;$('#stories').innerHTML='<section class="empty"><h2>Não foi possível carregar a edição.</h2><p>Atualize a página para tentar novamente.</p></section>';});
})();
