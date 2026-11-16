import re,json,time,urllib.request,urllib.parse,ssl,os
ctx=ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
keys=sorted(set(k for grp in re.findall(r'\[(@[^\]]+)\]',open('paper.md').read()) for k in re.findall(r'@([\w]+)',grp)))
print(len(keys),'cited')
def get(url):
    for i in range(4):
        try:
            r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'bib-enrich/1.0'}),context=ctx,timeout=30); return json.load(r)
        except Exception as e: time.sleep(3*(i+1)); err=e
    print('fail',url,err); return None
for fn in ['refs.bib','own.bib']:
    s=open(fn).read()
    for k in keys:
        m=re.search(r'@(\w+)\{'+k+r',(.*?)\n\}',s,re.S)
        if not m: continue
        typ,body=m.group(1),m.group(2)
        if typ!='article' or re.search(r'\bpages\s*=',body) or 'inpress' in body: continue
        d=re.search(r'doi\s*=\s*\{([^}]*)\}',body)
        if d: msg=(get('https://api.crossref.org/works/'+urllib.parse.quote(d.group(1)))or{}).get('message')
        else:
            t=re.search(r'title\s*=\s*\{\{?([^}]*)',body).group(1)
            r=get('https://api.crossref.org/works?rows=1&query.bibliographic='+urllib.parse.quote(t))
            msg=r and r['message']['items'][0]
            if msg and msg.get('title',[''])[0].lower()[:40]!=t.lower()[:40]: print('mismatch',k,msg.get('title')); msg=None
        if not msg: continue
        add=''
        for f,c in [('volume','volume'),('number','issue'),('pages','page')]:
            if c in msg and not re.search(r'\b'+f+r'\s*=',body): add+=f',\n  {f} = {{{msg[c].replace("-","--")}}}'
        if not d and 'DOI' in msg: add+=f',\n  doi = {{{msg["DOI"]}}}'
        if not add and 'article-number' in msg: add=f',\n  eid = {{{msg["article-number"]}}}'
        if add:
            s=s.replace(m.group(0),m.group(0)[:-2]+add+'\n}'); print(k,add.replace('\n',' '))
        time.sleep(0.4)
    open(fn,'w').write(s)
