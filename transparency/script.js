const ranking = [
  {label:'Luiz Fernando Toledo', value:4542, highlight:true},
  {label:'Requester …6298', value:4085},
  {label:'Requester …2759', value:3067},
  {label:'Requester …5183', value:3026},
  {label:'Requester …1247', value:2557},
  {label:'Requester …9462', value:2532},
  {label:'Requester …0504', value:2170},
  {label:'Requester …3877', value:2072},
  {label:'Requester …7724', value:2055},
  {label:'Requester …5601', value:1855}
];
const yearly = [{year:2012,value:0},{year:2013,value:0},{year:2014,value:1},{year:2015,value:1},{year:2016,value:106},{year:2017,value:398},{year:2018,value:433},{year:2019,value:192},{year:2020,value:755},{year:2021,value:347},{year:2022,value:806},{year:2023,value:568},{year:2024,value:552},{year:2025,value:276},{year:2026,value:107}];
const fmt = new Intl.NumberFormat('en-GB');
const max = ranking[0].value;
document.querySelector('#ranking-chart').innerHTML = ranking.map((d,i)=>`<div class="bar-row ${d.highlight?'highlight':''}"><span class="bar-rank">${i+1}</span><span class="bar-label">${d.label}</span><span class="bar-track"><span class="bar" style="display:block;width:${(d.value/max)*100}%"></span></span><span class="bar-value">${fmt.format(d.value)}</span></div>`).join('');
const yearMax = Math.max(...yearly.map(d=>d.value));
document.querySelector('#year-chart').innerHTML = yearly.map(d=>`<div class="year-col"><span class="year-bar" style="height:${(d.value/yearMax)*100}%"><b>${fmt.format(d.value)}</b></span><span>${String(d.year).slice(2)}</span></div>`).join('');

function initVideoCarousel() {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;
  const track = carousel.querySelector('.carousel-track');
  const slides = [...track.children];
  const previous = carousel.querySelector('.carousel-button--left');
  const next = carousel.querySelector('.carousel-button--right');
  const navigation = carousel.querySelector('.carousel-nav');
  let current = 0;

  slides.forEach((slide, index) => {
    slide.style.left = `${index * 100}%`;
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `carousel-indicator${index === 0 ? ' current-slide' : ''}`;
    dot.setAttribute('aria-label', `Show video ${index + 1}`);
    dot.addEventListener('click', () => move(index));
    navigation.appendChild(dot);
  });

  function pause(slide) {
    const frame = slide.querySelector('iframe');
    frame?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', 'https://www.youtube.com');
  }

  function move(index) {
    if (index < 0 || index >= slides.length || index === current) return;
    pause(slides[current]);
    slides[current].classList.remove('current-slide');
    navigation.children[current].classList.remove('current-slide');
    current = index;
    track.style.transform = `translateX(-${current * 100}%)`;
    slides[current].classList.add('current-slide');
    navigation.children[current].classList.add('current-slide');
    previous.classList.toggle('is-hidden', current === 0);
    next.classList.toggle('is-hidden', current === slides.length - 1);
  }

  previous.addEventListener('click', () => move(current - 1));
  next.addEventListener('click', () => move(current + 1));
}

initVideoCarousel();
