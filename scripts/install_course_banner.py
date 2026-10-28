#!/usr/bin/env python3
"""Inclui o aviso nos HTMLs públicos; pode ser repetido sem duplicar tags."""
import argparse,json,re
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path('.'));args=parser.parse_args();root=args.root.resolve()
tag='<script defer src="/assets/course-banner.js?v=20261028-course3" data-df-course-loader></script>'
excluded={'.git','node_modules','.wrangler','.venv','venv','_worker','output','test-results','playwright-report'}
changed=[];total=0
for p in root.rglob('*.html'):
 rel=p.relative_to(root)
 if any(x in excluded for x in rel.parts) or rel.parts[0]=='jose-maria-carvalho':continue
 html=p.read_text(encoding='utf-8');
 if not re.search(r'<(?:html|head|body)\b',html,re.I):continue
 total+=1
 # Mantém apenas um carregador, inclusive após atualização da versão.
 new=re.sub(r'\s*<script\b[^>]*\bdata-df-course-loader\b[^>]*>\s*</script>','',html,flags=re.I)
 if re.search(r'</head\s*>',new,re.I):
  m=re.search(r'</head\s*>',new,re.I);new=new[:m.start()].rstrip()+'\n  '+tag+'\n</head>'+new[m.end():]
 elif re.search(r'</body\s*>',new,re.I):new=re.sub(r'</body\s*>',tag+'\n</body>',new,count=1,flags=re.I)
 else:continue
 if new!=html:p.write_text(new,encoding='utf-8');changed.append(str(rel))
print(json.dumps({'root':str(root),'html':total,'changed':changed},ensure_ascii=False))
