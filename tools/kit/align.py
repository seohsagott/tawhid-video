import re, json, numpy as np
A="aud/ tawhid-audio/Muqaddima {} of 0.txt"
def txt(i):
    t=open(A.format(i),encoding='utf-8').read()
    t='\n'.join(l for l in t.splitlines() if 'TurboScribe' not in l)
    return t.split()
def sil(i):
    if i=='6b': return []
    return [tuple(map(float,l.split())) for l in open(f'aud/sil{str(i)[0]}.txt') if l.strip()]
# segments: (id, offset, cut_end, words)
w2=txt(2); assert w2[-1].lower().startswith('comprehensively'); w2=w2[:-1]
w3=txt(3); tail=' '.join(w3[-4:]).lower(); assert tail.startswith('so his effort went'), tail; w3=w3[:-4]
t6=open('/mnt/user-data/uploads/ElevenLabs_2026-09-22T16_47_10_s50_v3.txt',encoding='utf-8').read().split(); t6b='Wa sallallahu wa sallama ala nabiyyina Muhammad, wa ala alihi wa sahbihi ajmain. As-salamu alaykum wa rahmatullahi wa barakatuh.'.split()
segs=[(1,0.0,357.146,txt(1)),(2,357.146,350.22,w2),(3,707.366,263.0,w3),(5,970.366,269.322,txt(5)),(6,1240.589,196.49,t6),('6b',1240.589+196.93,2.70,t6b)]
out=[]
for sid,off,dur,words in segs:
    pauses=[(a,b) for a,b in sil(sid) if a<dur-0.05]; pauses=[(a,min(b,dur)) for a,b in pauses]
    # speech intervals
    sp=[];cur=0.0
    for a,b in pauses:
        if a>cur: sp.append((cur,a))
        cur=max(cur,b)
    if cur<dur: sp.append((cur,dur))
    S=sum(b-a for a,b in sp); cum=np.cumsum([0]+[b-a for a,b in sp])
    def s2t(s):  # speech time -> real time
        k=np.searchsorted(cum,s,side='right')-1; k=min(max(k,0),len(sp)-1); return sp[k][0]+(s-cum[k])
    def t2s(t):
        s=0.0
        for a,b in sp:
            if t<=a: break
            s+=min(t,b)-a
        return s
    wt=np.array([len(re.sub(r'[^\w]','',w))+1.5 for w in words],float); cw=np.concatenate([[0],np.cumsum(wt)]); W=cw[-1]
    anchors=[(0.0,0.0),(W,S)]  # (cumweight, speechtime)
    for it in range(2):
        ax=np.array([a for a,_ in anchors]); ay=np.array([b for _,b in anchors]); o=np.argsort(ax); ax,ay=ax[o],ay[o]
        f=lambda c: float(np.interp(c,ax,ay))
        new=[(0.0,0.0),(W,S)]; used=set()
        for j,w in enumerate(words):
            if not re.search(r'[.?!,;:]$',w): continue
            pe=s2t(f(cw[j+1]))  # predicted real end
            best=None
            for k,(a,b) in enumerate(pauses):
                if k in used: continue
                d=abs(a-pe)
                if d<(1.4 if re.search(r'[.?!]$',w) else 0.6) and (best is None or d<best[0]): best=(d,k)
            if best:
                k=best[1]; used.add(k); new.append((cw[j+1],t2s(pauses[k][0])))
        new.sort(); mono=[new[0]]
        for c,s in new[1:]:
            if s>mono[-1][1]: mono.append((c,s))
        anchors=mono
    ax=np.array([a for a,_ in anchors]); ay=np.array([b for _,b in anchors])
    for j,w in enumerate(words):
        st=s2t(np.interp(cw[j],ax,ay)+1e-4); en=s2t(np.interp(cw[j+1],ax,ay)-1e-4)
        out.append([w,round(off+st,3),round(off+en,3)])
    print(sid,'words',len(words),'anchors',len(anchors))
json.dump(out,open('words.json','w'))
def find(p):
    n=[re.sub(r'[^\w]','',x[0]).lower() for x in out]; q=[re.sub(r'[^\w]','',x).lower() for x in p.split()]
    for i in range(len(n)-len(q)+1):
        if n[i:i+len(q)]==q: return out[i][1]
for p in ['listening alone','It is part of trustworthiness','The third source','We ask Allah','Wa sallallahu','As-salamu alaykum']: print(p, find(p))
print('total',out[-1][2])
