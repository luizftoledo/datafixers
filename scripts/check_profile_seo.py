from pathlib import Path
from html.parser import HTMLParser
import json,xml.etree.ElementTree as ET
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.metas={};self.links=[];self.h1=0;self.lang='';self.jsons=[];self.injson=False;self.buf='';self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='html':self.lang=a.get('lang','')
  if tag=='h1':self.h1+=1
  if tag=='meta':
   key=a.get('name',a.get('property',''))
   self.metas.setdefault(key,[]).append(a.get('content',''))
  if tag=='link':self.links.append(a)
  if tag=='script' and a.get('type')=='application/ld+json':self.injson=True;self.buf=''
 def handle_data(self,data):
  if self.injson:self.buf+=data
 def handle_endtag(self,tag):
  if tag=='script' and self.injson:self.jsons.append(json.loads(self.buf));self.injson=False
root=Path(__file__).resolve().parents[1]
if (root/'transparency').exists():
 files=['index.html','index_en.html','index_pt.html','transparency/index.html','transparencia/index.html','transparency/methodology.html','transparencia/metodologia.html'];maps=['sitemap.xml','transparency-sitemap.xml'];host='https://datafixers.org'
else:
 files=['index.html','resume.html','reportagens/index.html','pt/index.html'];maps=['sitemap.xml'];host='https://luizftoledo.github.io'
for file in files:
 p=Page((root/file).read_text());assert p.h1==1,(file,'expected one H1',p.h1);assert p.lang in ['en','pt-BR'],file
 for key in ['description','og:title','og:description','og:url','og:image','twitter:card']:
  assert len(p.metas.get(key,[]))==1 and p.metas[key][0],(file,key)
 canonical=[l['href'] for l in p.links if l.get('rel')=='canonical'];assert len(canonical)==1 and canonical[0].startswith(host),(file,canonical)
 assert p.metas['og:url']==canonical,(file,'OG canonical mismatch')
 alts=[l for l in p.links if l.get('rel')=='alternate'];assert len({l.get('hreflang') for l in alts})==len(alts),file
 if alts:
  assert any(l.get('hreflang')==p.lang and l['href']==canonical[0] for l in alts),(file,'missing self-language')
 assert 'noindex' not in p.metas.get('robots',[''])[0],file
 for graph in p.jsons:
  for entity in graph.get('@graph',[graph]):
   if entity.get('@type')=='Person':assert entity.get('@id')=='https://luizftoledo.github.io/#person',(file,'inconsistent identity')
 print('PASS',file)
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
for name in maps:
 doc=ET.parse(root/name);locs=[n.text for n in doc.findall('s:url/s:loc',ns)];assert len(locs)==len(set(locs)),name;assert all(u.startswith(host+'/') for u in locs),name;print('PASS',name,len(locs),'unique URLs')
print('Profile SEO checks passed')
