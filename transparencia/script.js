const ranking = [
  {label:'Luiz Fernando Toledo', value:4540, highlight:true},
  {label:'Solicitante …6298', value:4085},
  {label:'Solicitante …2759', value:3067},
  {label:'Solicitante …5183', value:3026},
  {label:'Solicitante …1247', value:2557},
  {label:'Solicitante …9462', value:2532},
  {label:'Solicitante …0504', value:2170},
  {label:'Solicitante …5601', value:1812},
  {label:'Solicitante …2000', value:1781},
  {label:'Solicitante …3909', value:1594}
];
const yearly = [{year:2016,value:106},{year:2017,value:398},{year:2018,value:433},{year:2019,value:192},{year:2020,value:755},{year:2021,value:347},{year:2022,value:806},{year:2023,value:568},{year:2024,value:552},{year:2025,value:276},{year:2026,value:107}];
const fmt = new Intl.NumberFormat('pt-BR');
const max = ranking[0].value;
document.querySelector('#ranking-chart').innerHTML = ranking.map((d,i)=>`<div class="bar-row ${d.highlight?'highlight':''}"><span class="bar-rank">${i+1}</span><span class="bar-label">${d.label}</span><span class="bar-track"><span class="bar" style="display:block;width:${(d.value/max)*100}%"></span></span><span class="bar-value">${fmt.format(d.value)}</span></div>`).join('');
const yearMax = Math.max(...yearly.map(d=>d.value));
document.querySelector('#year-chart').innerHTML = yearly.map(d=>`<div class="year-col"><span class="year-bar" style="height:${(d.value/yearMax)*100}%"><b>${fmt.format(d.value)}</b></span><span>${String(d.year).slice(2)}</span></div>`).join('');
