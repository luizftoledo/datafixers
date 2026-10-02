/* Header animado HD-2D: Luiz e Ju na sala de aula. Gerado para cursos.datafixers.org/ia-criatividade */
(function(){
const root=[...document.querySelectorAll('.dfhd')].pop();
const cv=root.querySelector('canvas'),out=cv.getContext('2d');
const W=480,H=240;
let seed=13;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const hash=(x,y)=>{let h=(x*374761393+y*668265263)^0x5bd1e995;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967295};

/* ---------- cor ---------- */
const hex=h=>{h=h.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
const mix=(c,t,a)=>[c[0]+(t[0]-c[0])*a,c[1]+(t[1]-c[1])*a,c[2]+(t[2]-c[2])*a];
const lit=(c,a)=>mix(c,[255,246,224],a),drk=(c,a)=>mix(c,[34,20,44],a);
const css=c=>`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;

/* ---------- fonte 5x7 (giz) ---------- */
const F5={A:"01110100011000111111100011000110001",B:"11110100011000111110100011000111110",C:"01110100011000010000100001000101110",D:"11110100011000110001100011000111110",E:"11111100001000011110100001000011111",F:"11111100001000011110100001000010000",G:"01110100011000010111100011000101111",H:"10001100011000111111100011000110001",I:"01110001000010000100001000010001110",J:"00111000100001000010000101001001100",K:"10001100101010011000101001001010001",L:"10000100001000010000100001000011111",M:"10001110111010110101100011000110001",N:"10001110011010110011100011000110001",O:"01110100011000110001100011000101110",P:"11110100011000111110100001000010000",Q:"01110100011000110001101011001001101",R:"11110100011000111110101001001010001",S:"01111100001000001110000010000111110",T:"11111001000010000100001000010000100",U:"10001100011000110001100011000101110",V:"10001100011000110001100010101000100",W:"10001100011000110101101011010101010",X:"10001100010101000100010101000110001",Y:"10001100010101000100001000010000100",Z:"11111000010001000100010001000011111",
"0":"01110100011001110101110011000101110","1":"00100011000010000100001000010001110","2":"01110100010000100010001000100011111","3":"11110000010000101110000010000111110","4":"00010001100101010010111110001000010","5":"11111100001111000001000011000101110","6":"00110010001000011110100011000101110","7":"11111000010001000100010000100001000","8":"01110100011000101110100011000101110","9":"01110100011000101111000010001001100",
":":"00000001000010000000001000010000000","/":"00001000100001000100010000100010000","$":"00100011111010001110001011111000100",".":"00000000000000000000000000110001100","-":"00000000000000011111000000000000000","!":"00100001000010000100001000000000100"," ":"00000000000000000000000000000000000","+":"00000001000010011111001000010000000",",":"00000000000000000000011000010001000"};

/* ---------- construtor de sprites (sombreamento automático + contorno seletivo) ---------- */
const SC=1,SW=48,SH=48;
const tmp=document.createElement('canvas');tmp.width=SW;tmp.height=SH;const tc=tmp.getContext('2d',{willReadFrequently:true});
class Spr{
  constructor(w=SW,h=SH){this.w=w;this.h=h;this.c=new Float32Array(w*h*3);this.a=new Uint8Array(w*h)}
  shape(fn,col,o={}){
    const w=this.w,h=this.h,S=o.raw?1:SC;tc.clearRect(0,0,SW,SH);tc.fillStyle='#000';tc.strokeStyle='#000';tc.lineCap='round';tc.lineJoin='round';
    const api={E:(x,y,rx,ry)=>{tc.beginPath();tc.ellipse(x*S,y*S,rx*S,ry*S,0,0,7);tc.fill()},
      R:(x,y,ww,hh,r=0)=>{tc.beginPath();tc.roundRect?tc.roundRect(x*S,y*S,ww*S,hh*S,r*S):tc.rect(x*S,y*S,ww*S,hh*S);tc.fill()},
      L:(x1,y1,x2,y2,lw)=>{tc.lineWidth=lw*S;tc.beginPath();tc.moveTo(x1*S,y1*S);tc.lineTo(x2*S,y2*S);tc.stroke()},
      P:(pts)=>{tc.beginPath();pts.forEach(([x,y],i)=>i?tc.lineTo(x*S,y*S):tc.moveTo(x*S,y*S));tc.closePath();tc.fill()}};
    fn(api);
    const d=tc.getImageData(0,0,w,h).data,m=new Uint8Array(w*h);let y0=h,y1=0;
    for(let i=0;i<w*h;i++)if(d[i*4+3]>110){m[i]=1;const y=(i/w)|0;if(y<y0)y0=y;if(y>y1)y1=y}
    const at=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&m[y*w+x];
    const base=hex(col),hl=o.hl??.24,sh=o.sh??.32,gr=o.grad??.16;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!m[i])continue;
      let k=base;if(y1>y0)k=drk(k,(y-y0)/(y1-y0)*gr);
      if(!at(x-1,y-1)||!at(x,y-1))k=lit(k,hl);else if(!at(x-2,y-2)||!at(x-1,y))k=lit(k,hl*.45);
      if(!at(x+1,y+1)||!at(x+1,y))k=drk(k,sh);else if(!at(x+2,y+2)||!at(x,y+2))k=drk(k,sh*.5);else if(!at(x+3,y+3))k=drk(k,sh*.2);
      if(o.tex)k=o.tex(x,y,k);
      if(this.a[i]&&o.edge!==false&&(!at(x,y+1)||!at(x-1,y)||!at(x+1,y)||!at(x,y-1)))k=drk(k,.4);
      this.c[i*3]=k[0];this.c[i*3+1]=k[1];this.c[i*3+2]=k[2];this.a[i]=1}
    m.at=at;return m;
  }
  dot(x,y,col,al=1){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=this.w||y>=this.h)return;const i=y*this.w+x;const c=typeof col==='string'?hex(col):col;
    if(!this.a[i]){if(al<1)return;this.a[i]=1;this.c[i*3]=c[0];this.c[i*3+1]=c[1];this.c[i*3+2]=c[2];return}
    for(let q=0;q<3;q++)this.c[i*3+q]=this.c[i*3+q]*(1-al)+c[q]*al}
  rect(x,y,w,h,col,al){for(let j=0;j<h;j++)for(let i=0;i<w;i++)this.dot(x+i,y+j,col,al)}
  row(y,xs,col,al){xs.forEach(x=>this.dot(x,y,col,al))}
  get(x,y){if(x<0||y<0||x>=this.w||y>=this.h)return null;const i=y*this.w+x;return this.a[i]?[this.c[i*3],this.c[i*3+1],this.c[i*3+2]]:null}
  tone(m,f){for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++)if(m[y*this.w+x]){const r=f(x,y);if(r){const i=y*this.w+x;const c=r[0]==='L'?lit(this.get(x,y),r[1]):drk(this.get(x,y),r[1]);this.c[i*3]=c[0];this.c[i*3+1]=c[1];this.c[i*3+2]=c[2]}}}
  done(){const w=this.w,h=this.h,out=[];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(this.a[i])continue;
      for(const[dx,dy]of[[0,1],[0,-1],[1,0],[-1,0]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const j=Y*w+X;if(this.a[j]){out.push([i,drk([this.c[j*3],this.c[j*3+1],this.c[j*3+2]],.64)]);break}}}
    const cn=document.createElement('canvas');cn.width=w;cn.height=h;const cx=cn.getContext('2d');const id=cx.createImageData(w,h);
    for(let i=0;i<w*h;i++)if(this.a[i]){id.data[i*4]=this.c[i*3];id.data[i*4+1]=this.c[i*3+1];id.data[i*4+2]=this.c[i*3+2];id.data[i*4+3]=255}
    for(const[i,c]of out){id.data[i*4]=c[0];id.data[i*4+1]=c[1];id.data[i*4+2]=c[2];id.data[i*4+3]=255}
    cx.putImageData(id,0,0);return cn}
}
const wavyTex=(x,y)=>{const v=(y+Math.sin(x/2.6)*1.6+Math.sin(x/7)*1.2)%4;return v<.8?['L',.2]:(v>2&&v<2.8)?['D',.18]:null};
const curlTex=(x,y)=>{const r=Math.floor(y/4),xx=x+(r%2)*2,cx=Math.floor(xx/4),ix=xx%4,iy=y%4;if(hash(cx,r)<.2)return null;const key=ix+','+iy;if(['1,0','2,0','0,1'].includes(key))return['L',.26];if(['3,2','2,3','3,1'].includes(key))return['D',.26];if(key==='1,1')return['L',.1];return null};
const straightTex=(x,y)=>{const v=(x+Math.floor(hash(x,0)*3))%4;return v===0?['L',.1]:(v===2&&hash(x,y)<.6)?['D',.07]:null};

/* ---------- personagens ---------- */
const hx2=c=>'#'+c.map(v=>Math.max(0,Math.min(255,v|0)).toString(16).padStart(2,'0')).join('');
const LUIZ={laptop:true,skin:'#ecb994',hair:'#2c1c14',eye:'#3a2216',brow:'#1e120c',shirt:'#6f6b47',pants:'#3c4c6e',shoes:'#2a2a2e',lip:'#a05a4a',
  glasses:true,stubble:'#6e4a38',tattoo:true,belt:true,vneck:true,sleeve:'short',style:'wavy'};
const JU={skin:'#f8dbc9',hair:'#6c4631',eye:'#5a3824',brow:'#5e3e2a',shirt:'#25252c',pants:'#34343f',shoes:'#6a4030',lip:'#c8646c',
  blush:true,turtle:true,sleeve:'long',style:'curly',smile:true};
const P0={eye:'#2a1a12',brow:'#2a1a12',lip:'#9a5446',pants:'#3c4c6e',shoes:'#2a2a2e',sleeve:'short',smile:true};
const mkP=o=>Object.assign({},P0,o);
const STU=[
  mkP({style:'afro',hair:'#211814',skin:'#8a5a3e',shirt:'#e0a23e',brow:'#120a06'}),
  mkP({style:'long',hair:'#d8b25a',skin:'#f6d5c0',shirt:'#3a9a8a',blush:true}),
  mkP({style:'short',hair:'#1e1a18',skin:'#e8b896',shirt:'#c0504d'}),
  mkP({style:'pony',hair:'#a8482a',skin:'#f7d8c6',shirt:'#5a7ac0',blush:true}),
  mkP({style:'short',hair:'#3a2618',skin:'#c98d68',shirt:'#5a9a4a'}),
  mkP({style:'bun',hair:'#1e1a18',skin:'#e8c0a0',shirt:'#d46a8a'}),
  mkP({style:'braids',hair:'#2a1a12',skin:'#9a6446',shirt:'#7a5aa8'}),
  mkP({style:'short',hair:'#c8a050',skin:'#f2c8a8',shirt:'#e8e4da',glasses:true}),
  mkP({style:'long',hair:'#2a1a12',skin:'#d8a882',shirt:'#e88a3a'}),
  mkP({style:'curly',hair:'#3a2418',skin:'#b07a56',shirt:'#3b8ab6'}),
  mkP({style:'short',hair:'#1a1412',skin:'#7a4e34',shirt:'#c8b048',sleeve:'long'}),
  mkP({style:'pony',hair:'#4a2c1c',skin:'#f0caa8',shirt:'#8a3a5a'}),
];
const WALK=[
  mkP({style:'bun',hair:'#a8482a',skin:'#f4d0b8',shirt:'#2e7d6a',pants:'#5a4a3a',books:true,blush:true}),
  mkP({style:'cap',hair:'#2a1a12',skin:'#b07a56',shirt:'#e8d44a',cap:'#c0504d',pants:'#3a3a46'}),
  mkP({style:'long',hair:'#1e1a18',skin:'#f6d5c0',shirt:'#9a6ac8',pants:'#2f3a5a',cup:true}),
];

const tex={wavy:wavyTex,curly:curlTex,afro:curlTex,long:straightTex,short:straightTex,pony:straightTex,bun:straightTex,braids:straightTex,cap:straightTex};
function hairBack(s,p,view,hy){ // volumes atrás da cabeça
  const H=p.hair,o={hl:.14,sh:.36};
  if(p.style==='curly'){const m=view==='side'?s.shape(a=>[[18,9,7],[15,16,6],[16,23,5],[20,27,4],[24,6,7]].forEach(([x,y,r])=>a.E(x,y+hy,r,r)),H,o)
    :s.shape(a=>[[16,9,7],[32,9,7],[24,5,8.5],[13.5,17,6],[34.5,17,6],[14,24,5],[34,24,5],[17,28,3.5],[31,28,3.5]].forEach(([x,y,r])=>a.E(x,y+hy,r,r)),H,o);s.tone(m,curlTex)}
  if(p.style==='long'){const m=view==='side'?s.shape(a=>a.R(15,8+hy,10,19,5),H,o):s.shape(a=>a.R(15,8+hy,18,20,6),H,o);s.tone(m,straightTex)}
  if(p.style==='braids'&&view!=='side'){s.shape(a=>{a.L(16,16+hy,15,30,3.4);a.L(32,16+hy,33,30,3.4)},H,o)}
}
function legsFront(s,p,f){
  const l=f===1?1:0,r=f===2?1:0;
  const lg=s.shape(a=>{a.R(17,34,6,11-l,2);a.R(25,34,6,11-r,2)},p.pants,{hl:.14});
  s.shape(a=>{a.E(19.5,45.3-l,4.2,2.3);a.E(28.5,45.3-r,4.2,2.3)},p.shoes,{hl:.4});
}
function torsoFront(s,p,hy){
  s.shape(a=>a.R(20.5,17+hy,7,8,2),p.skin,{sh:.45});
  const tr=s.shape(a=>{a.P([[15,24],[33,24],[34.5,30],[32.5,37],[15.5,37],[13.5,30]]);a.E(16.5,26.5,3.2,3);a.E(31.5,26.5,3.2,3)},p.shirt,{});
  s.tone(tr,(x,y)=>(y>31&&Math.sin(x*1.1+y*.4)>.94)?['D',.14]:null);
  if(p.vneck){const sk=hex(p.skin),eg=drk(hex(p.shirt),.42);[[24,22,26],[25,23,25]].forEach(([y,a,b])=>{for(let x=a;x<=b;x++)s.dot(x,y,sk);s.dot(a-1,y,eg);s.dot(b+1,y,eg)});s.dot(24,26,eg)}
  else if(!p.turtle){s.rect(21,24,7,1,drk(hex(p.shirt),.3))}
  if(p.turtle){const t2=s.shape(a=>a.R(19.5,18+hy,9,7,3),p.shirt,{hl:.3});s.tone(t2,(x,y)=>(y-hy)%2===0?['D',.25]:null)}
  if(p.belt){s.rect(16,35,17,1,'#4a2e1c');s.rect(23,35,3,1,'#d9b45a')}
}
function armF(s,p,side,mode,f){ // mode: idle | gest | books | cup
  const M=x=>48-x,X=x=>side<0?x:M(x);
  const sw=f===1?side:f===2?-side:0;
  if(mode==='gest'){
    s.shape(a=>a.L(X(16),26,X(11),21,5.6),p.shirt);
    const fa=s.shape(a=>a.L(X(11),21,X(8),15,4),p.sleeve==='long'?p.shirt:p.skin);
    s.shape(a=>{a.E(X(7.2),13,2.6,2.8);a.E(X(9.2),11.6,1,1.6);a.E(X(7.2),10.4,1,1.6);a.E(X(5.4),11.4,.9,1.5)},p.skin,{hl:.32});
    if(p.tattoo)s.tone(fa,(x,y)=>(x+2*y)%4===0?['D',.4]:hash(x,y)<.3?['D',.3]:null);
    return}
  const hy2=mode==='books'||mode==='cup'?-5:0;
  s.shape(a=>a.L(X(16),26,X(14),p.sleeve==='long'?34+hy2:30.5,6),p.shirt);
  let fa=null;if(p.sleeve!=='long')fa=s.shape(a=>a.L(X(14),30,X(13.6+(hy2?3:0)),35.5+hy2+sw*0,4.2),p.skin);
  s.shape(a=>a.E(X(13.6+(hy2?3:0)),37+hy2,2.5,2.6),p.skin,{hl:.3});
  if(p.tattoo&&fa){const cols=['#2f6f8a','#b0443e','#5a3a7a'];s.tone(fa,(x,y)=>(x+2*y)%4===0?['D',.45]:null);for(let y=30;y<37;y++)for(let x=0;x<48;x++)if(fa[y*48+x]&&hash(x,y)<.3)s.dot(x,y,cols[(x+y)%3],.5)}
}
function headFront(s,p,st){
  const hy=st.hy||0,Y=y=>y+hy,sk=hex(p.skin);
  s.shape(a=>{a.E(15.6,14.5+hy,1.9,2.6);a.E(32.4,14.5+hy,1.9,2.6)},p.skin,{sh:.45});
  s.shape(a=>a.E(24,13+hy,8.6,9.4),p.skin,{hl:.16,sh:.24,grad:.06});
  if(p.stubble){const sb=hex(p.stubble);for(let y=17;y<=23;y++)for(let x=16;x<=32;x++){const dx=(x-24)/8.6,dy=(y-13)/9.4;if(dx*dx+dy*dy<.92&&((x+y)%2===0||y>21))s.dot(x,Y(y),sb,.45)}s.rect(21,Y(19),7,1,sb,.6)}
  if(p.blush){s.rect(18,Y(17),2,1,'#f2a0a0',.5);s.rect(29,Y(17),2,1,'#f2a0a0',.5)}
  const ey=hex(p.eye),lash='#22140c';
  if(st.blink){s.rect(19,Y(15),3,1,lash);s.rect(27,Y(15),3,1,lash)}
  else{s.rect(19,Y(13),4,1,lash);s.rect(26,Y(13),4,1,lash);s.rect(19,Y(14),3,2,'#fbfaf6');s.rect(27,Y(14),3,2,'#fbfaf6');s.rect(20,Y(14),2,2,ey);s.rect(27,Y(14),2,2,ey);s.dot(20,Y(14),'#ffffff');s.dot(27,Y(14),'#ffffff')}
  s.dot(24,Y(17),drk(sk,.28));s.dot(25,Y(17),drk(sk,.12));
  const lp=hex(p.lip);
  if(st.talk){s.rect(22,Y(20),5,2,'#3a1414');s.rect(23,Y(20),3,1,'#efe6dc')}
  else if(p.smile){s.dot(21,Y(19),lp);s.rect(22,Y(20),5,1,lp);s.dot(27,Y(19),lp)}
  else s.rect(22,Y(20),5,1,drk(lp,.1));
  if(p.glasses){const G='#121212';for(const x0 of[18,25]){s.rect(x0,Y(12),6,1,G);s.rect(x0,Y(16),6,1,G);s.rect(x0,Y(13),1,3,G);s.rect(x0+5,Y(13),1,3,G);s.dot(x0+4,Y(13),'#d8ecf8',.6)}
    s.dot(24,Y(13),G);s.rect(16,Y(13),2,1,G);s.rect(31,Y(13),2,1,G);s.rect(18,Y(10),5,1,p.brow);s.rect(26,Y(10),5,1,p.brow)}
  else{s.rect(18,Y(11),4,1,p.brow);s.rect(27,Y(11),4,1,p.brow)}
}
function hairFront(s,p,hy){
  const H=p.hair,o={hl:.2,sh:.4},T=tex[p.style];let m;
  switch(p.style){
    case'wavy':m=s.shape(a=>{a.E(24,5+hy,9.8,5.2);[[16.6,7,4],[20,3,4.6],[25.6,2,4.9],[31,4.5,4.4],[32.6,8.6,2.8],[15.6,9.8,2.6]].forEach(([x,y,r])=>a.E(x,y+hy,r,r));a.R(15.5,8+hy,2.2,7,1);a.R(30.4,8+hy,2.2,7,1)},H,o);break;
    case'curly':m=s.shape(a=>[[17.5,6,5],[24,3.5,6],[30.5,6,5],[19.2,9.5,2.8],[23.6,8.8,2.6],[28.6,9.5,2.8],[15.5,12.5,3.2],[32.5,12.5,3.2],[15,18.5,3],[33,18.5,3]].forEach(([x,y,r])=>a.E(x,y+hy,r,r)),H,o);break;
    case'afro':m=s.shape(a=>{a.E(24,8+hy,12,9);a.E(14,14+hy,3,5);a.E(34,14+hy,3,5)},H,o);break;
    case'long':m=s.shape(a=>{a.E(24,6+hy,9.6,6);a.R(14.6,8+hy,4,16,2);a.R(29.4,8+hy,4,16,2)},H,o);break;
    case'cap':s.shape(a=>{a.R(15.5,8+hy,2,5,1);a.R(30.5,8+hy,2,5,1)},H,o);m=s.shape(a=>a.E(24,6+hy,9.6,6),p.cap,{hl:.3});s.shape(a=>a.R(14,9+hy,20,2.4,1),hx2(drk(hex(p.cap),.25)),{hl:.2});s.rect(22,Y2(3,hy),4,2,'#f2f2f2');return;
    case'bun':m=s.shape(a=>{a.E(24,6+hy,9.6,6);a.E(24,-1+hy,4,3.4);a.R(15,8+hy,2.4,6,1);a.R(30.6,8+hy,2.4,6,1)},H,o);break;
    case'pony':m=s.shape(a=>{a.E(24,6+hy,9.6,6);a.R(15,8+hy,2.4,6,1);a.R(30.6,8+hy,2.4,6,1);a.L(33,9+hy,35,17+hy,3)},H,o);break;
    case'braids':m=s.shape(a=>{a.E(24,6+hy,9.6,6);a.R(15,8+hy,2.4,6,1);a.R(30.6,8+hy,2.4,6,1)},H,o);break;
    default:m=s.shape(a=>{a.E(24,6+hy,9.6,6);a.R(15,8+hy,2.4,5,1);a.R(30.6,8+hy,2.4,5,1);a.E(20,9+hy,3,2)},H,o);
  }
  if(m&&T)s.tone(m,T);
}
function Y2(y,hy){return y+hy}

/* frente: teachers e caminhantes */
function buildFront(p,st){
  const s=new Spr(),hy=st.hy||0,f=st.f||0;
  hairBack(s,p,'front',hy);legsFront(s,p,f);torsoFront(s,p,hy);
  const gR=st.pose==='gestR',gL=st.pose==='gestL';
  if(p.laptop){
    const SK=hex(p.skin);
    s.shape(a=>a.L(16,26,15,31,6),p.shirt);
    s.shape(a=>a.L(15,31.5,22,32.6,4.2),p.skin);
    if(gR)armF(s,p,1,'gest',f);else{s.shape(a=>a.L(32,26,34.2,30,6),p.shirt);s.shape(a=>a.L(34.2,29.5,34.4,32,4),p.skin)}
    // notebook: tampa (vista de trás) + base com teclado
    s.shape(a=>a.R(11.5,23.5,21,9.5,1),'#c9ced6',{hl:.35,sh:.35,tex:(x,y,k)=>hash(x,y)<.08?lit(k,.08):k});
    s.shape(a=>a.R(10.5,32.5,28,2.6,1),'#aab0ba',{hl:.4});
    for(let x=12;x<37;x+=2)s.dot(x,34,'#7a808a');
    s.rect(15,26,3,2,'#e05a47');s.rect(25,28,3,2,'#ffd36b');s.rect(20,25,2,2,'#3b8ad8');
    s.shape(a=>a.E(14,33.6,2.4,2),p.skin,{hl:.3});
    if(!gR){ // mão direita apoiada no teclado, só os dedos batem
      s.shape(a=>a.E(34.6,32.6,2.6,1.7),p.skin,{hl:.32,sh:.3});
      const fy=[0,0,0,0];fy[st.ty||0]=-1;
      for(let q=0;q<4;q++){const x=32+q*1.4|0;s.dot(x,34+fy[q],lit(SK,.12));s.dot(x,35+fy[q],drk(SK,.18));if(fy[q])s.dot(x,35,'#7a808a')}
      s.dot(37,32,drk(SK,.25));
    }
    if(p.tattoo){s.dot(17,32,'#2f6f8a',.6);s.dot(19,33,'#b0443e',.6)}
    }else{armF(s,p,-1,gL?'gest':(p.books||p.cup)?'books':'idle',f);armF(s,p,1,gR?'gest':p.cup?'cup':'idle',f);}
  if(p.books){s.shape(a=>a.R(12,27,12,5,1),'#c0504d',{hl:.3});s.shape(a=>a.R(13,24,11,3.4,1),'#2f5fa8',{hl:.3});s.rect(13,29,10,1,'#f2ecdc')}
  if(p.cup){s.shape(a=>a.R(31,28,5,6,1),'#f4f0e6',{hl:.3});s.rect(31,30,5,1,'#c0504d')}
  headFront(s,p,st);hairFront(s,p,hy);
  return s.done();
}
/* lado (direita; espelha p/ esquerda ao desenhar) */
function buildSide(p,st){
  const s=new Spr(),hy=st.hy||0,f=st.f||0,sk=hex(p.skin);
  hairBack(s,p,'side',hy);
  const back=drk(hex(p.pants),.25);
  if(f===0){s.shape(a=>a.R(21,34,6,11,2),p.pants,{hl:.14});s.shape(a=>a.E(25,45.3,4.6,2.3),p.shoes,{hl:.4})}
  else{const fw=f===1;s.shape(a=>a.L(23,36,fw?19:28,43,5),hx2(back));s.shape(a=>a.E(fw?19.5:29,45,4,2.2),hx2(drk(hex(p.shoes),.2)));
    s.shape(a=>a.L(24,36,fw?28:19,43,5.2),p.pants,{hl:.14});s.shape(a=>a.E(fw?29:19.5,45,4.2,2.3),p.shoes,{hl:.4})}
  if(f!==0)s.shape(a=>a.L(24,26,f===1?20.5:28,33,4.4),hx2(drk(hex(p.shirt),.3)));
  s.shape(a=>a.R(21.5,17+hy,6,8,2),p.skin,{sh:.45});
  s.shape(a=>{a.P([[19,24],[29.5,24],[31,30],[29.5,37],[18.5,37],[17.5,30]]);a.E(24,26,5,3)},p.shirt,{});
  if(p.turtle)s.shape(a=>a.R(20.5,18+hy,8,7,3),p.shirt,{hl:.3});
  if(p.belt)s.rect(19,35,11,1,'#4a2e1c');
  const sw=f===1?3.5:f===2?-3.5:0;
  if(p.laptop){s.shape(a=>a.L(24,26,27,30.5,5),p.shirt);s.shape(a=>a.L(26.5,30.5,31,31,4),p.skin);
    s.shape(a=>a.R(26,31,14,2.2,1),'#aab0ba',{hl:.4});s.shape(a=>a.P([[37.2,31.5],[40,31.5],[38.4,20.5],[35.8,20.5]]),'#b4bac4',{hl:.35,sh:.3});
    for(let y=22;y<31;y++)s.dot(Math.round(36.6+(y-21)*.17),y,'#a8e0ff',.85);
    s.shape(a=>a.E(31.5,30.2,2.3,1.5),p.skin,{hl:.3});const SK=hex(p.skin);const lf=st.ty||0;for(let q=0;q<3;q++){s.dot(31+q,31-(lf===q?1:0),drk(SK,.15))}}
  else if(p.books||p.cup){s.shape(a=>a.L(24,26,27,31,5),p.shirt);s.shape(a=>a.E(29,31,2.4,2.4),p.skin);
    if(p.books){s.shape(a=>a.R(26,26,8,6,1),'#c0504d',{hl:.3});s.rect(26,28,8,1,'#f2ecdc')}else{s.shape(a=>a.R(28,25,5,6,1),'#f4f0e6',{hl:.3})}}
  else{s.shape(a=>a.L(24,26,24+sw,p.sleeve==='long'?34:30,5.4),p.shirt);if(p.sleeve!=='long')s.shape(a=>a.L(24+sw*.85,30,24+sw*1.1,34.5,4),p.skin);s.shape(a=>a.E(24+sw*1.15,36,2.4,2.5),p.skin,{hl:.3});
    if(p.tattoo)s.dot(24+sw,32,'#2f6f8a',.6)}
  // cabeça
  s.shape(a=>a.E(25,13+hy,8.4,9.2),p.skin,{hl:.16,sh:.24,grad:.06});
  s.shape(a=>a.E(33.2,15.5+hy,1.4,1.5),p.skin,{edge:false,hl:.3});
  const Y=y=>y+hy;
  if(p.stubble){const sb=hex(p.stubble);for(let y=17;y<=23;y++)for(let x=22;x<=33;x++){const dx=(x-25)/8.4,dy=(y-13)/9.2;if(dx*dx+dy*dy<.92&&((x+y)%2===0||y>21))s.dot(x,Y(y),sb,.45)}}
  if(p.blush)s.rect(29,Y(17),2,1,'#f2a0a0',.5);
  if(st.blink)s.rect(29,Y(15),2,1,'#22140c');else{s.rect(28,Y(13),3,1,'#22140c');s.rect(29,Y(14),2,2,'#fbfaf6');s.rect(30,Y(14),1,2,hex(p.eye));s.dot(29,Y(14),'#ffffff')}
  if(p.glasses){const G='#121212';s.rect(27,Y(12),5,1,G);s.rect(27,Y(16),5,1,G);s.rect(27,Y(13),1,3,G);s.rect(31,Y(13),1,3,G);s.rect(21,Y(13),6,1,G);s.rect(27,Y(10),5,1,p.brow)}
  else s.rect(28,Y(11),3,1,p.brow);
  s.rect(30,Y(20),2,1,st.talk?'#3a1414':hx2(drk(hex(p.lip),.1)));if(st.talk)s.rect(30,Y(21),2,1,'#3a1414');
  // cabelo lateral
  const H=p.hair,o={hl:.2,sh:.4},T=tex[p.style];let m;
  const base=a=>{a.E(24.5,5.5+hy,9.2,5.6);a.R(16.6,6+hy,7,9,3)};
  switch(p.style){
    case'wavy':m=s.shape(a=>{base(a);[[18,7,4],[21,3,4.6],[26.5,2,4.8],[31,5,4]].forEach(([x,y,r])=>a.E(x,y+hy,r,r))},H,o);break;
    case'curly':m=s.shape(a=>{base(a);[[19,5,5.5],[25,3,5.5],[30.5,6,4],[32,9.5,2.4],[18,12,4]].forEach(([x,y,r])=>a.E(x,y+hy,r,r))},H,o);break;
    case'afro':m=s.shape(a=>a.E(23.5,9+hy,11.5,10),H,o);break;
    case'cap':s.shape(base,H,o);m=s.shape(a=>{a.E(25,6+hy,9,5.6);a.R(28,8.4+hy,10,2.4,1)},p.cap,{hl:.3});break;
    case'bun':m=s.shape(a=>{base(a);a.E(18,4+hy,4,3.6)},H,o);break;
    case'pony':m=s.shape(a=>{base(a);a.L(17,9+hy,13,19+hy,3.6)},H,o);break;
    case'braids':m=s.shape(a=>{base(a);a.L(18,14+hy,17,29+hy,3.2)},H,o);break;
    default:m=s.shape(base,H,o);
  }
  if(m&&T&&p.style!=='cap')s.tone(m,T);
  s.shape(a=>a.E(21.5,14.5+hy,1.8,2.5),p.skin,{sh:.4});
  if(['curly','long','afro'].includes(p.style))s.shape(a=>a.E(21,14+hy,3,4),H,{hl:.2});
  return s.done();
}
/* costas: em pé (andando) ou sentado na cadeira */
function buildBack(p,st){
  const s=new Spr(),b=st.bob||0,f=st.f||0;
  if(!st.seat)legsFront(s,p,f);
  hairBack(s,p,'back',b);
  s.shape(a=>a.R(20.5,17+b,7,8,2),p.skin,{sh:.45});
  const tr=s.shape(a=>{a.P([[15,24],[33,24],[34.5,31],[33,st.seat?44:37],[15,st.seat?44:37],[13.5,31]]);a.E(16.5,26.5,3.2,3);a.E(31.5,26.5,3.2,3)},p.shirt,{});
  s.tone(tr,(x,y)=>(x===24&&y>27)?['D',.14]:null);
  const sw=f===1?1:f===2?-1:0;
  s.shape(a=>a.L(16,26,13.5,33+(st.wr?.6:0)+sw,5.8),p.shirt);
  if(st.hand){s.shape(a=>a.L(32,26,35,16,5.8),p.shirt);s.shape(a=>{a.E(35.6,12.8,2.7,3);a.E(37.3,11,1,1.8)},p.skin,{hl:.3})}
  else s.shape(a=>a.L(32,26,34.5,33-(st.wr?.6:0)-sw,5.8),p.shirt);
  if(!st.seat){s.shape(a=>{a.E(13.6,35-sw,2.3,2.4);a.E(34.4,35+sw,2.3,2.4)},p.skin)}
  s.shape(a=>{a.E(15.6,14.5+b,1.9,2.6);a.E(32.4,14.5+b,1.9,2.6)},p.skin);
  const H=p.hair,T=tex[p.style]||straightTex;let m;
  if(p.style==='afro')m=s.shape(a=>a.E(24,11+b,12,11),H,{hl:.15});
  else if(p.style==='curly')m=s.shape(a=>{a.E(24,10+b,10.5,10);a.E(24,20+b,9,6)},H,{hl:.15});
  else if(p.style==='long')m=s.shape(a=>{a.E(24,11+b,9.4,8.5);a.R(15,12+b,18,15,6)},H,{hl:.18});
  else m=s.shape(a=>a.E(24,12.4+b,8.8,9.4),H,{hl:.18,sh:.32});
  s.tone(m,T);
  if(p.style==='pony'){const n=s.shape(a=>{a.L(24,16+b,24.6,27+b,4);a.E(24.6,27+b,1.8,1.8)},H,{hl:.25});s.tone(n,straightTex);s.rect(22,Y2(17,b),5,1,'#e05a47')}
  if(p.style==='bun')s.shape(a=>a.E(24,4+b,4.4,4),H,{hl:.3});
  if(p.style==='braids'){s.shape(a=>{a.L(20,18+b,19,31+b,3.2);a.L(28,18+b,29,31+b,3.2)},H,{hl:.2})}
  if(p.style==='cap'){s.shape(a=>a.E(24,7.4+b,9.2,6.2),p.cap,{hl:.3});s.rect(21,Y2(13,b),7,1,hx2(drk(hex(p.cap),.45)))}
  if(st.seat)s.shape(a=>{a.R(12,30,3.2,18,1);a.R(32.8,30,3.2,18,1);a.R(12,35,24,4.2,1.4);a.R(12,42,24,2.6,1)},'#8a5a34',{hl:.32});
  return s.done();
}
/* ---------- cenário (resolução de arte) ---------- */
const BX=156,BY=22,BW=176,BH=80;
function artBG(){
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const px=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};
  const FY=124; // linha do piso
  for(let y=0;y<FY;y++)for(let x=0;x<W;x++){const n=hash(x,y);const b=mix(hex('#dcc69c'),hex('#c4aa82'),y/FY);px(x,y,1,1,css(n<.07?drk(b,.06):n>.95?lit(b,.08):b))}
  // lambri
  px(0,96,W,3,'#8a6440');px(0,96,W,1,'#b08a5e');px(0,99,W,2,'#6a4428');
  for(let x=0;x<W;x+=48){px(x+3,102,42,17,'#6e4a2c');px(x+4,103,40,15,'#8a6040');px(x+4,103,40,1,'#a07450');px(x+4,117,40,1,'#6e4a2c')}
  px(0,119,W,5,'#4e321e');px(0,119,W,1,'#7a5434');
  px(0,0,W,10,'#3e281a');px(0,9,W,2,'#2a1a10');for(let x=0;x<W;x+=60)px(x,0,7,11,'#2e1e12');
  // janela + cortinas
  px(18,18,90,76,'#5e3e22');px(20,20,86,72,'#7a5434');
  for(let y=23;y<89;y++)for(let x=23;x<103;x++)px(x,y,1,1,css(mix(hex('#cfeefa'),hex('#fff2d2'),(y-23)/66)));
  for(let i=0;i<70;i++){const x=23+rnd()*80,y=68+rnd()*21;px(x,y,3,2,css(rnd()<.5?hex('#7aa86a'):hex('#5e8a52')))}
  for(let i=0;i<18;i++){const x=23+rnd()*80,y=24+rnd()*10;g.globalAlpha=.5;px(x,y,6,2,'#ffffff');g.globalAlpha=1}
  px(62,23,3,66,'#7a5434');px(23,54,80,3,'#7a5434');px(20,90,86,5,'#a07450');px(20,90,86,1,'#c09468');
  for(let i=0;i<12;i++){px(28+i,27+i,1,1,'#fff');px(72+i,60+i,1,1,'#fff')}
  for(const x0 of[8,98]){for(let x=0;x<18;x++)for(let y=14;y<106;y++){const f=Math.sin(x*.85+(x0>50?1.5:0))*.5+.5;let col=mix(hex('#6e2228'),hex('#b44c4a'),f*.85);if(y>98)col=drk(col,.2);px(x0+x,y,1,1,css(col))}px(x0+4,60,10,3,'#d9b45a')}
  px(4,12,116,4,'#3a2414');px(4,12,116,1,'#6a4428');
  // lousa
  px(BX-7,BY-7,BW+14,BH+14,'#4e321e');px(BX-6,BY-6,BW+12,BH+12,'#7a5030');px(BX-6,BY-6,BW+12,2,'#a07450');px(BX-6,BY+BH+4,BW+12,2,'#5a3a22');
  for(let y=0;y<BH;y++)for(let x=0;x<BW;x++){const n=hash(x+BX,y+BY),sm=Math.sin(x*.045+y*.08)*.5+.5;let b=mix(hex('#284434'),hex('#335442'),sm*.55);if(n<.05)b=lit(b,.08);px(BX+x,BY+y,1,1,css(b))}
  for(let i=0;i<8;i++){const x=BX+10+rnd()*(BW-36),y=BY+8+rnd()*(BH-16);g.globalAlpha=.06;px(x,y,16+rnd()*18,3,'#e8efe6');g.globalAlpha=1}
  px(BX-9,BY+BH+6,BW+18,5,'#6a4428');px(BX-9,BY+BH+6,BW+18,1,'#9a6e48');
  px(BX+20,BY+BH+4,9,2,'#f4f0e6');px(BX+33,BY+BH+4,7,2,'#ffe08a');px(BX+44,BY+BH+4,7,2,'#f4a0a0');px(BX+BW-34,BY+BH+2,16,4,'#3a3a44');px(BX+BW-34,BY+BH+4,16,2,'#c8c8d0');
  // relógio
  for(let y=-8;y<=8;y++)for(let x=-8;x<=8;x++){const d=x*x+y*y;if(d<=64)px(358+x,40+y,1,1,d>46?'#5a3a22':css(lit(hex('#f0e9da'),(-x-y)/40)))}
  
  // estante
  px(380,36,72,88,'#4e321e');px(382,38,68,84,'#6a4428');
  const bc=['#a83a3a','#2f5fa8','#d89a3a','#2e8a7a','#6a4a98','#e8dcc0','#4a8a3a','#8a2a4a'];
  for(const sy of[40,62,84,104]){px(382,sy+17,68,3,'#4e321e');px(382,sy+17,68,1,'#7a5434');let x=385;while(x<444){const w=3+(rnd()*3|0),h=11+(rnd()*5|0),col=hex(bc[rnd()*8|0]);if(rnd()<.08){x+=5;continue}
    for(let j=0;j<h;j++)for(let i=0;i<w;i++)px(x+i,sy+17-h+j,1,1,css(i===0?lit(col,.22):i===w-1?drk(col,.28):col));px(x,sy+19-h,w,1,css(lit(col,.4)));px(x,sy+12-((h/3)|0),w,1,css(lit(col,.45)));x+=w+(rnd()<.2?2:1)}}
  // globo
  for(let y=-10;y<=10;y++)for(let x=-10;x<=10;x++){const d=x*x+y*y;if(d<=100){const land=hash(Math.floor((x+12)/3),Math.floor((y+12)/2))<.42;let col=hex(land?'#5a9a4a':'#3a6ab0');col=lit(col,Math.max(0,(-x-y)/20)*.5);col=drk(col,Math.max(0,(x+y)/20)*.45);px(416+x,20+y,1,1,css(col))}}
  px(415,31,3,4,'#8a6a3a');px(408,34,17,2,'#6a4a2a');
  // porta
  px(452,40,28,84,'#3e281a');px(455,43,25,81,'#7a4a2a');for(const yy of[48,84]){px(458,yy,18,30,'#6a3e22');px(458,yy,18,1,'#8a5a36');px(458,yy+29,18,1,'#4e2e18')}px(474,84,3,3,'#e1b44a');px(452,40,28,2,'#5e3e22');
  // piso de tábuas longas
  for(let y=FY;y<H;y++){const row=((y-FY)/8)|0,ry=(y-FY)%8;const off=Math.floor(hash(row,1)*140);
    for(let x=0;x<W;x++){const seam=((x+off)%170)===0;
      let b=hex(row%2?'#a67245':'#a06e43');b=mix(b,hex('#6e4a2e'),(y-FY)/260);const n=hash(x,y);if(n<.08)b=drk(b,.07);if(Math.sin(x*.21+row*1.7+Math.sin(x*.05)*3)>.9)b=drk(b,.06);
      if(ry===7)b=drk(b,.22);if(seam)b=drk(b,.18);if(ry===0)b=lit(b,.07);px(x,y,1,1,css(b))}}
  // tapete
  const rx=118,ry=150,rw=244;
  for(let y=ry;y<H;y++)for(let x=rx;x<rx+rw;x++){let b=hex('#6a3448');const bx=Math.min(x-rx,rx+rw-1-x),by=y-ry;if(bx<3||by<3)b=hex('#c99a5a');else if(bx<6||by<6)b=hex('#4e2234');else if(((x+y)%10===0)||((x-y)%10===0))b=lit(b,.12);if(hash(x,y)<.12)b=drk(b,.08);px(x,y,1,1,css(b))}
  // lâmpadas pendentes
  for(const lx of[130,350]){px(lx,10,1,18,'#2a1a10');for(let y=0;y<8;y++)px(lx-3-y,28+y,7+2*y,1,css(mix(hex('#2f5a4a'),hex('#1e3a30'),y/8)));px(lx-11,36,23,1,'#16281f');px(lx-3,37,7,2,'#fff4c8')}
  return c;
}
function artFG(){
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const px=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};
  for(const x0 of[2,446]){
    for(let y=206;y<H;y++)for(let x=0;x<32;x++){let b=hex('#b85a36');b=lit(b,Math.max(0,(12-x)/12)*.2);b=drk(b,Math.max(0,(x-18)/14)*.35);px(x0+x,y,1,1,css(b))}
    px(x0-2,204,36,5,'#d8784e');
    for(let i=0;i<110;i++){const a=rnd()*Math.PI,r=8+rnd()*42,x=x0+16+Math.cos(a)*r*.8*(rnd()<.5?1:-1),y=206-Math.sin(a)*r;const col=hex(rnd()<.5?'#3f7a44':'#5a9a52');px(x,y,5,2,css(rnd()<.3?lit(col,.25):col))}
  }
  return c;
}
/* ---------- montagem ---------- */
const S={};
const key=(n,o)=>n+JSON.stringify(o);
function spr(n,builder,p,o){const k=key(n,o);return S[k]||(S[k]=builder(p,o))}
const art=document.createElement('canvas');art.width=W;art.height=H;const ag=art.getContext('2d');
const apx=(x,y,w,h,col,al)=>{if(al!=null)ag.globalAlpha=al;ag.fillStyle=col;ag.fillRect(Math.round(x),Math.round(y),w,h);ag.globalAlpha=1};
function chalk(s,x,y,col,k=1){for(let i=0;i<s.length;i++){const gl=F5[s[i]];if(!gl)continue;for(let q=0;q<35;q++)if(gl[q]==='1'){const X=x+(i*6+q%5)*k,Y=y+((q/5)|0)*k;for(let a=0;a<k;a++)for(let b=0;b<k;b++){const n=hash(X+a,Y+b);if(n>.06)apx(X+a,Y+b,1,1,col,.72+n*.28)}}}}
function chalkLine(x0,y0,x1,y1,col){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let i=0;i<=n;i++){const x=Math.round(x0+(x1-x0)*i/n),y=Math.round(y0+(y1-y0)*i/n);if(hash(x,y)>.1)apx(x,y,1,1,col,.85)}}

const THEMES=[
  {big:'PAUTAS',small:'E NARRATIVA',lines:['PAUTAS EM DADOS E DOCS','PAUTA MINIMA E MAXIMA','PITCH PARA VEICULOS','NUMEROS VIRAM HISTORIAS']},
  {big:'DADOS',small:'+ INVESTIGACAO',lines:['PLANILHAS E BASES PUBLICAS','PEDIDOS VIA LAI','ENTREVISTAR FONTES','CHECAR ANTES DE PUBLICAR']},
  {big:'GRANTS',small:'E CARREIRA',lines:['BOLSAS, GRANTS E EDITAIS','CV E CARTA DE APRESENTACAO','ETAPAS E ORCAMENTO','CARREIRA DE FREELANCER']},
  {big:'IA',small:'+ CRIATIVIDADE',lines:['IA PARA PESQUISAR DOCS','PROTOTIPOS DE HISTORIAS','FERRAMENTA CERTA, AUTORIA','CHECAR A IA E SEUS LIMITES']},
];
const CYC=22,TYB=140;
const tx=BX+12,ly=i=>BY+29+i*10,starts=[2.6,5.4,8.2,11];
const ROWS=[158,200],COLS=[152,196,240,284,328];
function mkTable(){const c=document.createElement('canvas');c.width=W;c.height=30;const g=c.getContext('2d');
  for(let y=0;y<27;y++)for(let x=126;x<354;x++){let b=hex(y<18?'#b07a46':'#7e5130');if(y<18){b=mix(b,hex('#9a6a3c'),y/18);if(hash(x,y*3)<.15)b=drk(b,.1);if(Math.sin(x*.15+y*.9)>.93)b=drk(b,.06)}if(y===0)b=lit(b,.25);if(y===17)b=drk(b,.35);if(x===126||x===353)b=drk(b,.4);g.fillStyle=css(b);g.fillRect(x,y,1,1)}
  g.fillStyle='#2a180e';g.fillRect(125,27,230,1);return c}
const TABLE=mkTable();
// caminhos: {to:[x,y]} anda; {w:seg,d:dir,pose} espera; {hide:seg}
function mkPath(start,segs,speed){let x=start[0],y=start[1],T=0;const out=[];
  for(const s of segs){if(s.to){const dx=s.to[0]-x,dy=s.to[1]-y,d=Math.hypot(dx,dy),dur=d/speed;out.push({t0:T,t1:T+dur,x0:x,y0:y,x1:s.to[0],y1:s.to[1],dir:Math.abs(dx)>=Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')});x=s.to[0];y=s.to[1];T+=dur}
    else{const dur=s.w||s.hide;out.push({t0:T,t1:T+dur,x0:x,y0:y,x1:x,y1:y,wait:1,dir:s.d||'down',pose:s.pose,hide:!!s.hide,talk:s.talk});T+=dur}}
  out.total=T;return out}
function at(path,tt){const c=tt%path.total;let s=path[path.length-1];for(const q of path)if(c>=q.t0&&c<q.t1){s=q;break}
  const u=s.t1>s.t0?(c-s.t0)/(s.t1-s.t0):0,x=s.x0+(s.x1-s.x0)*u,y=s.y0+(s.y1-s.y0)*u;
  const dist=Math.hypot(x-s.x0,y-s.y0);return{x,y,dir:s.dir,pose:s.pose,hide:s.hide,talk:s.talk,f:s.wait?0:[0,1,0,2][Math.floor(dist/4)%4],walk:!s.wait,c}}
const PL=mkPath([170,TYB],[{w:1.4,talk:1},{w:1.2},{w:1.6,pose:'gestR',talk:1},{to:[150,TYB]},{w:1},{to:[196,TYB]},{w:1.6,pose:'gestR',talk:1},{w:2},{to:[214,TYB]},{w:1.4},{w:1.1,pose:'gestR',talk:1},{to:[170,TYB]},{w:1.4,talk:1},{w:1.4},{w:1.4,talk:1},{w:2}],22);
const PJ=mkPath([312,TYB],[{w:1.4},{w:1.2,talk:1},{to:[300,TYB]},{w:2.25},{w:1.6,pose:'gestL',talk:1},{to:[330,TYB]},{w:.6},{to:[296,TYB]},{w:.45},{w:1.6,pose:'gestL',talk:1},{w:2.6},{w:1.2,pose:'gestL',talk:1},{to:[312,TYB]},{w:1.4},{w:1.4,talk:1},{w:1.4},{w:1.4,talk:1}],22);
//const PA=mkPath([466,134],[{w:.6,d:'down'},{to:[392,134]},{w:2.6,d:'up'},{to:[466,134]},{w:.4,d:'up'},{hide:4}],20);
//const PB=mkPath([102,262],[{to:[102,156]},{w:2.4,d:'up'},{to:[102,262]},{hide:3}],20);
//const PC=mkPath([30,142],[{to:[84,142]},{w:2.8,d:'down'},{to:[30,142]},{w:2.2,d:'down'}],16);
function drawSprite(c,x,y,flip){if(flip){ag.save();ag.translate(Math.round(x),0);ag.scale(-1,1);ag.drawImage(c,-24,Math.round(y)-47);ag.restore()}else ag.drawImage(c,Math.round(x)-24,Math.round(y)-47)}
function actor(id,p,s,t,extra={}){
  if(s.hide)return null;
  const blink=((t+id.length*.7)%4.2)>4.04,hy=s.walk?(s.f?1:0):((t*1.1+id.length*.3)|0)%2;
  let c,flip=false;
  const ty=p.laptop&&s.pose!=='gestR'?((t*9)|0)%4:0;
  if(s.dir==='left'||s.dir==='right'){c=spr(id+'s',buildSide,p,{f:s.f,blink,hy:s.walk?0:hy,talk:extra.talk,ty});flip=s.dir==='left'}
  else if(s.dir==='up')c=spr(id+'b',buildBack,p,{f:s.f});
  else c=spr(id+'f',buildFront,p,{f:s.f,pose:s.pose||'',talk:extra.talk,blink,hy:s.walk?0:hy,ty});
  return{y:s.y,x:s.x,shadow:true,draw:()=>drawSprite(c,s.x,s.y,flip)};
}

/* ---------- telas dos notebooks: notícias, busca, fotos, mapa/OSINT, grafo, planilha ---------- */
const APPS=['news','search','photos','map','graph','sheet'];
function screen(i,x0,y0,t){
  const SWd=28,SHt=16;
  const P=(x,y,w,h,c,a)=>{if(x>=SWd||y>=SHt)return;const X=Math.max(0,x),Y=Math.max(0,y),W2=Math.min(SWd,x+w)-X,H2=Math.min(SHt,y+h)-Y;if(W2>0&&H2>0)apx(x0+X,y0+Y,W2,H2,c,a)};
  const ph=(t+i*2.3),app=APPS[(i+Math.floor(ph/9))%APPS.length],lt=ph%9;
  if(app==='news'){
    P(0,0,28,16,'#f6f4ee');const s=Math.floor(lt*2.2)%22;
    const items=[[3,'h',20],[5,'h',13],[8,'img'],[18,'h',18],[20,'t',24],[22,'t',22],[24,'t',25],[27,'h',20],[29,'img'],[39,'h',16]];
    for(const[yy,k,w]of items){const y=yy-s+3;
      if(k==='h')P(2,y,w,1,'#1e1e22');
      else if(k==='t')P(2,y,w,1,'#9a9aa0');
      else{P(2,y,13,8,'#8ac6e8');P(2,y+5,13,3,'#5a9a4a');P(11,y+1,2,2,'#ffe28a');P(5,y+3,3,3,'#3a5a3a');for(let q=0;q<4;q++)P(17,y+q*2,9-(q%2)*2,1,'#9a9aa0')}}
    P(0,0,28,3,'#b8202a');P(2,1,5,1,'#ffffff');P(20,1,2,1,'#ffd0d0');P(23,1,3,1,'#ffd0d0');P(0,3,28,1,'#d8d2c8');
  }else if(app==='search'){
    P(0,0,28,16,'#ffffff');
    if(lt<3.2){P(9,3,10,2,'#3b6fd8');P(10,3,2,1,'#8ab0ff');
      P(3,7,22,4,'#c8ccd4');P(4,8,20,2,'#ffffff');const n=Math.min(16,Math.floor(lt*7));P(5,8,n,1,'#3a3a40');if(((t*3)|0)%2)P(5+n,8,1,2,'#3a3a40');P(22,8,1,1,'#3b6fd8');
      P(9,13,4,1,'#e8e8ee');P(15,13,4,1,'#e8e8ee')}
    else{P(1,1,12,2,'#e8e8ee');P(2,1,8,1,'#3a3a40');P(0,4,28,1,'#eeeeF2');
      const shown=Math.min(4,Math.floor((lt-3.2)*2.2)+1);
      for(let k=0;k<shown;k++){const y=5+k*3;P(2,y,10+((k*7+i)%9),1,'#3b5bd8');P(2,y+1,7,1,'#2e9e5b');P(10,y+1,12-(k%3)*3,1,'#b0b0b8')}
      if(lt>6)P(22,5,5,6,'#d8e4f8');}
  }else if(app==='photos'){
    P(0,0,28,16,'#1c1c22');P(0,0,28,2,'#2a2a32');P(1,0,3,1,'#e05a47');
    const scenes=[['#8ac6e8','#5a9a4a'],['#f0b878','#7a4a3a'],['#3a4a6a','#c8c8d0'],['#e8d8c0','#c0504d'],['#6ab0c8','#e8d8a8'],['#2a3a2a','#8aba6a']];
    const sel=Math.floor(lt*1.2)%6;
    if(lt%3<2){for(let k=0;k<6;k++){const gx=1+(k%3)*9,gy=3+Math.floor(k/3)*6;const[a,b]=scenes[k];P(gx,gy,8,5,a);P(gx,gy+3,8,2,b);if(k===1||k===3){P(gx+3,gy+1,2,2,'#e8b894');P(gx+2,gy+3,4,2,'#3a3a4a')}
      if(k===sel){P(gx-1,gy-1,10,1,'#ffd36b');P(gx-1,gy+5,10,1,'#ffd36b');P(gx-1,gy,1,5,'#ffd36b');P(gx+8,gy,1,5,'#ffd36b')}}}
    else{const[a,b]=scenes[sel];P(1,2,26,13,a);P(1,10,26,5,b);P(11,4,6,6,'#e8b894');P(10,4,8,2,'#3a2418');P(9,10,10,5,'#3a3a4a');P(12,6,1,1,'#22140c');P(15,6,1,1,'#22140c')}
  }else if(app==='map'){
    for(let y=0;y<16;y++)for(let x=0;x<28;x++){const h=hash(Math.floor((x+i*5)/4),Math.floor(y/4));P(x,y,1,1,h<.35?'#4e7a3e':h<.6?'#6a8a4a':h<.8?'#8a7a52':'#5a6a3a')}
    for(let x=0;x<28;x++){P(x,Math.floor(9+Math.sin(x*.3+i)*2),1,1,'#c8c8c0');P(x,Math.floor(3+x*.4)%16,1,1,'#4a7ab8')}
    P(14,0,1,16,'#c8c8c0');
    const pins=[[6,5],[18,4],[22,11],[9,12],[16,8]];const np=Math.min(5,Math.floor(lt/1.2));
    for(let k=0;k<np;k++){const[px2,py2]=pins[k];P(px2-1,py2-3,3,2,'#e0302a');P(px2,py2-1,1,2,'#e0302a');P(px2,py2-3,1,1,'#ff9a90')}
    const cx=Math.floor(4+((t*6+i*7)%20)),cy=Math.floor(3+((t*3+i*3)%10));P(cx-3,cy,7,1,'#ffffff',.8);P(cx,cy-3,1,7,'#ffffff',.8);
    P(0,0,12,2,'#1a1a1e',.75);P(1,0,9,1,'#7fd1a3');
  }else if(app==='graph'){
    P(0,0,28,16,'#10161e');
    const N=[[14,8],[5,4],[23,4],[4,12],[24,12],[14,2],[10,13],[19,14]];
    const E2=[[0,1],[0,2],[0,3],[0,4],[1,5],[2,5],[3,6],[4,7],[6,7],[1,3]];const ne=Math.min(E2.length,Math.floor(lt*1.4)+3);
    for(let k=0;k<ne;k++){const[a,b]=E2[k];const[x1,y1]=N[a],[x2,y2]=N[b];const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let q=0;q<=n;q++)P(Math.round(x1+(x2-x1)*q/n),Math.round(y1+(y2-y1)*q/n),1,1,'#3a5a7a')}
    N.forEach(([x,y],k)=>{const col=k===0?'#ffd36b':k<5?'#7fd1a3':'#f4a3a3';P(x-1,y-1,3,3,col);P(x,y,1,1,'#ffffff')});
    if(((t*2)|0)%2)P(13,7,3,3,'#fff6c8',.6);
  }else{ // planilha
    P(0,0,28,16,'#ffffff');P(0,0,28,2,'#2e8a4a');P(1,0,4,1,'#ffffff');
    for(let y=4;y<16;y+=2)P(0,y,18,1,'#e2e6ea');for(let x=0;x<18;x+=6)P(x,2,1,14,'#e2e6ea');
    const hr=3+2*(Math.floor(lt*1.5)%6);P(0,hr,18,2,'#fff1a8');
    for(let r=0;r<6;r++)for(let q=0;q<3;q++)P(q*6+1,3+r*2,3+((r+q+i)%3),1,q===2?'#2e8a4a':'#6a6a74');
    const h2=[5,8,4,10,7];h2.forEach((h,k)=>P(19+k*2,15-Math.round(h*Math.min(1,lt/3)),1,Math.round(h*Math.min(1,lt/3)),k===3?'#d2463a':'#3b6fd8'));P(19,15,9,1,'#9a9aa0');
  }
  // reflexo
  P(0,0,1,16,'#ffffff',.06);
}
let SHADOWS=[];
function drawArt(t){
  ag.clearRect(0,0,W,H);
  const c=t%CYC;
  const TH=THEMES[Math.floor(t/CYC)%THEMES.length],LINES=TH.lines;
  const big=TH.big,small=TH.small,bigW=big.length*12;
  const titN=Math.max(0,Math.min(big.length+small.length,Math.floor((c-.6)*9)));
  chalk(big.slice(0,titN),tx,BY+7,'#ffe08a',2);
  if(titN>big.length)chalk(small.slice(0,titN-big.length),tx+bigW+4,BY+14,'#ffe08a');
  if(c>2)chalkLine(tx,BY+24,tx+Math.min(bigW+small.length*6+4,(c-2)*120),BY+24,'#ffe08a');
  LINES.forEach((s,i)=>{const n=Math.max(0,Math.min(s.length,Math.floor((c-starts[i])*15)));
    const ck=13.6+i*.7;if(n>0){if(c<=ck)apx(tx,ly(i)+3,2,2,'#f4f0e6',.9);chalk(s.slice(0,n),tx+6,ly(i),'#f4f0e6')}
    if(c>ck){const sx=tx-2,sy=ly(i)-1;const p=Math.min(1,(c-ck)*3);chalkLine(sx,sy+3,sx+2,sy+5,'#9be0a0');if(p>.5)chalkLine(sx+2,sy+5,sx+2+Math.round(4*p),sy+5-Math.round(5*p),'#9be0a0')}});
  if(c>19.8){const p=Math.min(1,(c-19.8)/1.6),ex=BX+Math.round(p*BW);ag.clearRect(BX,BY,ex-BX,BH);apx(ex-8,BY+BH/2-5,16,9,'#3a3a44');apx(ex-8,BY+BH/2+2,16,2,'#c8c8d0')}
  if(c>21.4)ag.clearRect(BX,BY,BW,BH);

  // relógio com a hora real
  {const d=new Date(),cx=358,cy=40,h=(d.getHours()%12+d.getMinutes()/60)/12*6.283,m=(d.getMinutes()+d.getSeconds()/60)/60*6.283,sc=d.getSeconds()/60*6.283;
   const hand=(ang,len,col)=>{for(let r=0;r<=len;r+=.5)apx(Math.round(cx+Math.sin(ang)*r),Math.round(cy-Math.cos(ang)*r),1,1,col)};
   hand(m,6,'#2a2a2a');hand(h,4,'#1a1a1a');hand(sc,6.5,'#c0302a');apx(cx,cy,1,1,'#c9a24a');}
  const D=[];const tk=((t*8)|0)%2;
  const sl=at(PL,c),sj=at(PJ,c);
  D.push(actor('luiz',LUIZ,sl,t,{talk:sl.talk&&!sl.walk&&tk}));
  D.push(actor('ju',JU,sj,t,{talk:sj.talk&&!sj.walk&&tk}));
  ROWS.forEach((ty,r)=>{
    D.push({y:ty+16,draw:()=>ag.drawImage(TABLE,0,ty)});
    COLS.forEach((x,ci)=>{const i=r*5+ci;
      const hand=(i===2&&(t%13)>9&&(t%13)<11.4)||(i===8&&(t%17)>4&&(t%17)<6);
      const st={seat:1,bob:((t*.9+i*.37)%3)<.25?1:0,wr:!hand&&((t*5+i)|0)%2,hand};
      D.push({y:ty+17.5,draw:()=>{
        ag.drawImage(spr('st'+i,buildBack,STU[i],st),x-24,ty+4)}});
      D.push({y:ty+16.5,draw:()=>{
        const lx=x-16,lyy=ty-17;
        apx(lx-3,lyy-3,38,26,'#9fd8ff',.07);
        apx(lx-1,lyy-1,34,22,'#16161c');apx(lx,lyy,32,20,'#2a2c34');
        screen(i,lx+2,lyy+2,t);
        apx(lx+15,lyy,2,1,'#3a3c44');
        apx(lx-3,lyy+20,38,3,'#aab0ba');apx(lx-3,lyy+20,38,1,'#d8dce2');apx(lx+12,lyy+21,8,1,'#8a909a')}});
    })});
  D.filter(Boolean).sort((a,b)=>a.y-b.y).forEach(d=>d.draw());
  SHADOWS=D.filter(d=>d&&d.shadow).map(d=>[d.x,d.y]);
}
/* ---------- pós-processamento HD-2D ---------- */
let k=4,viewW=W,bgHi,addHi,vigHi,fgHi;
const hasFilter='filter' in out;
function bake(){
  const Wk=W*k,Hk=H*k;
  const mkc=()=>{const c=document.createElement('canvas');c.width=Wk;c.height=Hk;return c};
  const A=artBG();
  bgHi=mkc();let g=bgHi.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(A,0,0,Wk,Hk);
  // teto desfocado
  if(hasFilter){g.save();g.beginPath();g.rect(0,0,Wk,13*k);g.clip();g.filter=`blur(${k*1.4}px)`;g.drawImage(A,0,0,Wk,Hk);g.restore();g.filter='none'}
  // oclusão no rodapé e cantos
  let gr=g.createLinearGradient(0,124*k,0,142*k);gr.addColorStop(0,'rgba(30,16,30,.38)');gr.addColorStop(1,'rgba(30,16,30,0)');g.fillStyle=gr;g.fillRect(0,124*k,Wk,18*k);
  // poças de luz no piso
  g.save();g.globalCompositeOperation='soft-light';
  for(const[x,y,rx,ry,a]of[[150,176,90,30,.55],[80,150,56,20,.5]]){const rg=g.createRadialGradient(x*k,y*k,0,x*k,y*k,rx*k);rg.addColorStop(0,`rgba(255,236,190,${a})`);rg.addColorStop(1,'rgba(255,236,190,0)');g.setTransform(1,0,0,ry/rx,0,y*k*(1-ry/rx));g.fillStyle=rg;g.fillRect(0,0,Wk,Hk*rx/ry)}
  g.restore();
  // bloom da janela e das lâmpadas
  g.save();g.globalCompositeOperation='lighter';
  if(hasFilter){g.filter=`blur(${k*5}px)`;g.globalAlpha=.55;g.drawImage(A,23,23,80,66,23*k,23*k,80*k,66*k);g.filter='none';g.globalAlpha=1}
  for(const lx of[130,350]){const rg=g.createRadialGradient(lx*k,38*k,0,lx*k,38*k,46*k);rg.addColorStop(0,'rgba(255,214,140,.38)');rg.addColorStop(1,'rgba(255,214,140,0)');g.fillStyle=rg;g.fillRect(0,0,Wk,Hk)}
  g.restore();
  // feixes de luz (camada aditiva animada)
  addHi=mkc();g=addHi.getContext('2d');
  const beam=(pts,a)=>{const lg=g.createLinearGradient(40*k,24*k,190*k,220*k);lg.addColorStop(0,`rgba(255,238,200,${a})`);lg.addColorStop(1,'rgba(255,238,200,0)');g.fillStyle=lg;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x*k,y*k):g.moveTo(x*k,y*k));g.closePath();g.fill()};
  if(hasFilter)g.filter=`blur(${k*3}px)`;
  beam([[24,24],[60,24],[210,230],[140,240]],.22);beam([[66,24],[102,24],[250,210],[190,228]],.15);beam([[24,58],[60,58],[150,240],[90,240]],.12);
  g.filter='none';
  // vinheta + gradação de cor
  vigHi=mkc();g=vigHi.getContext('2d');
  const vg=g.createRadialGradient(Wk/2,Hk*.46,Hk*.35,Wk/2,Hk*.5,Wk*.62);vg.addColorStop(0,'rgba(20,10,30,0)');vg.addColorStop(1,'rgba(20,10,30,.55)');g.fillStyle=vg;g.fillRect(0,0,Wk,Hk);
  const cg=g.createLinearGradient(0,0,Wk,Hk);cg.addColorStop(0,'rgba(255,190,110,.10)');cg.addColorStop(1,'rgba(60,70,140,.12)');g.fillStyle=cg;g.fillRect(0,0,Wk,Hk);
  // primeiro plano desfocado
  fgHi=mkc();g=fgHi.getContext('2d');g.imageSmoothingEnabled=false;if(hasFilter)g.filter=`blur(${k*1.8}px)`;g.drawImage(artFG(),0,0,Wk,Hk);g.filter='none';
}
const dust=[...Array(56)].map((_,i)=>({x:30+rnd()*190,y:30+rnd()*200,s:.3+rnd()*.7,p:rnd()*6.28}));
function render(t){
  drawArt(t);
  const ox=Math.round((W-viewW)/2);
  out.globalCompositeOperation='source-over';
  out.drawImage(bgHi,ox*k,0,viewW*k,H*k,0,0,viewW*k,H*k);
  // sombras de contato
  for(const[x,y]of SHADOWS){const r=12;{const rg=out.createRadialGradient((x-ox)*k,y*k,0,(x-ox)*k,y*k,r*k);rg.addColorStop(0,'rgba(30,14,20,.45)');rg.addColorStop(1,'rgba(30,14,20,0)');out.save();out.setTransform(1,0,0,.32,0,y*k*.68);out.fillStyle=rg;out.fillRect(0,0,viewW*k,H*k*3.2);out.restore()}}
  out.imageSmoothingEnabled=false;out.drawImage(art,ox,0,viewW,H,0,0,viewW*k,H*k);
  out.drawImage(fgHi,ox*k,0,viewW*k,H*k,0,0,viewW*k,H*k);
  out.globalCompositeOperation='screen';out.globalAlpha=.85+Math.sin(t*.7)*.15;
  out.drawImage(addHi,ox*k,0,viewW*k,H*k,0,0,viewW*k,H*k);out.globalAlpha=1;
  for(const d of dust){const x=(d.x+Math.sin(t*.3+d.p)*6+t*d.s*2)%210+20,y=(d.y+Math.cos(t*.25+d.p)*4-t*d.s*1.2+600)%210+20;
    const a=(.35+.35*Math.sin(t*1.5+d.p))*Math.max(0,1-Math.abs((x*1.1-y*.6)-20)/90);if(a<=0)continue;
    out.fillStyle=`rgba(255,244,214,${a})`;out.beginPath();out.arc((x-ox)*k,y*k,k*.55*(.6+d.s),0,7);out.fill()}
  out.globalCompositeOperation='source-over';
  out.drawImage(vigHi,ox*k,0,viewW*k,H*k,0,0,viewW*k,H*k);
}
function resize(){
  const cw=root.clientWidth||W,dpr=Math.min(2,window.devicePixelRatio||1);
  viewW=cw>=720?W:Math.max(300,Math.min(W,Math.round(H*cw/300)));
  const nk=Math.max(2,Math.min(5,Math.round(cw*dpr/viewW)));
  if(nk!==k||!bgHi){k=nk;bake()}
  cv.width=viewW*k;cv.height=H*k;
}
resize();
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
let last=0,acc=0,T=0,visible=true;
function loop(ts){const dt=Math.min(.1,(ts-(last||ts))/1000);last=ts;if(visible){acc+=dt;if(acc>=1/30){T+=acc;render(T);acc=0}}requestAnimationFrame(loop)}
let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{resize();render(reduce?18:T)},120)});
if('IntersectionObserver'in window)new IntersectionObserver(e=>{visible=e[0].isIntersecting}).observe(root);
if(reduce)render(18);else requestAnimationFrame(loop);

})();
