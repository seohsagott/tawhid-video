import re, json, os, subprocess
from pocketsphinx import Decoder, get_model_path
DICT=set(l.split()[0].split('(')[0] for l in open(os.path.join(get_model_path(),'en-us','cmudict-en-us.dict'),encoding='utf-8'))
R2=[('sh','SH'),('th','TH'),('dh','DH'),('kh','K'),('gh','G'),('ch','CH'),('ph','F'),('aa','AA'),('ee','IY'),('ii','IY'),('oo','UW'),('uu','UW'),('ai','AY'),('ay','AY'),('aw','AW'),('ou','UW')]
R1={'a':'AA','b':'B','c':'K','d':'D','e':'EH','f':'F','g':'G','h':'HH','i':'IH','j':'JH','k':'K','l':'L','m':'M','n':'N','o':'OW','p':'P','q':'K','r':'R','s':'S','t':'T','u':'UH','v':'V','w':'W','x':'K S','y':'Y','z':'Z'}
def g2p(w):
    out=[];i=0
    while i<len(w):
        for a,p in R2:
            if w.startswith(a,i): out.append(p); i+=2; break
        else:
            if w[i] in R1: out.extend(R1[w[i]].split())
            i+=1
    ded=[p for k,p in enumerate(out) if k==0 or p!=out[k-1]]
    return ' '.join(ded)
ONES='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(); TENS='_ _ twenty thirty forty fifty sixty seventy eighty ninety'.split()
def num(n):
    n=int(n)
    if n<20: return ONES[n].split()
    if n<100: return [TENS[n//10]]+([ONES[n%10]] if n%10 else [])
    if n<1000: return [ONES[n//100],'hundred']+(num(n%100) if n%100 else [])
    return num(n//100)+['hundred']+(num(n%100) if n%100 else [])
def toks(w):
    if 'ﷺ' in w: return ['sallallahu','alayhi','wa','sallam']
    n=re.sub(r"[^a-z0-9']","",w.lower()).strip("'")
    if not n: return []
    if n.isdigit(): return num(n)
    parts=[p for p in re.split(r"[']",n) if p] if n not in DICT else [n]
    return parts
W=json.load(open('words.json'))
SEG=[('mix/p1.wav',0.0),('mix/p2.wav',357.146),('mix/p3.wav',707.366),('mix/p5.wav',970.366),('mix/p6.wav',1240.589)]
bounds=[s[1] for s in SEG]+[1e9]
new=[list(w) for w in W]
for si,(f,off) in enumerate(SEG):
    idx=[i for i,w in enumerate(W) if bounds[si]<=w[1]<bounds[si+1]]
    seq=[]; owner=[]
    for i in idx:
        for t in toks(W[i][0]): seq.append(t); owner.append(i)
    d=Decoder(samprate=16000,bestpath=False,loglevel='FATAL')
    for t in set(seq):
        if t not in DICT:
            ph=g2p(t)
            if ph: d.add_word(t,ph,True)
    seq2=[t for t in seq if t in DICT or g2p(t)]; own2=[o for t,o in zip(seq,owner) if t in DICT or g2p(t)]
    d.set_align_text(' '.join(seq2))
    raw=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','16000','-f','s16le','-'],capture_output=True).stdout
    d.start_utt(); d.process_raw(raw,full_utt=True); d.end_utt()
    segs=[s for s in d.seg() if s.word not in ('<s>','</s>','<sil>','[NOISE]','<sil>')]
    ok=len(segs)==len(seq2); print(f,'tokens',len(seq2),'segs',len(segs),'ok',ok)
    if not ok: continue
    first={}; last={}
    for s,o in zip(segs,own2):
        a=off+s.start_frame/100; b=off+s.end_frame/100
        first.setdefault(o,a); last[o]=b
    for o in first: new[o][1]=round(first[o],3); new[o][2]=round(last[o],3)
json.dump(new,open('words_fa.json','w'))
def find(p,W):
    n=[re.sub(r'[^\w]','',x[0]).lower() for x in W]; q=[re.sub(r'[^\w]','',x).lower() for x in p.split()]
    for i in range(len(n)-len(q)+1):
        if n[i:i+len(q)]==q: return (W[i][1])
for p in ['Why did Allah','single verse','The second type is Tawhid in demand','defined by the authority','into choosing','It is part of trustworthiness','We ask Allah']:
    print(p,'old',find(p,W),'new',find(p,new))
