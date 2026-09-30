import sys, os, numpy as np
from PIL import Image
from engine import *
from scenes import SHOTS
END=WORDS[-1][2]+2.5
FADE=0.3; APP=0.5; STEP=1/24
def T0(i): return WORDS[i][1]
# ---- resolve timeline ----
shots=[]; pos=0
for si,(anc,els) in enumerate(SHOTS):
    if si==0: st=0.0; idx=0
    else: idx=locate(anc,pos); st=max(T0(idx)-0.15,0); pos=idx+1
    shots.append(dict(st=st,idx=idx,els=els,anc=anc))
for i,s in enumerate(shots): s['en']=shots[i+1]['st'] if i+1<len(shots) else END
def rt(at,s):
    if isinstance(at,(int,float)): return s['st']+at
    ph,off=(at,0) if isinstance(at,str) else at
    i=locate(ph,s['idx']); return T0(i)-0.1+off
warn=[]
for s in shots:
    for e in s['els']:
        if e['k']=='walk': e['kt']=[(rt(a,s),x) for a,x in e['keys']]; e['t']=e['kt'][0][0]
        else: e['t']=rt(e['at'],s)
        if e['k']=='card': e['th']=rt(e['hl_at'],s)
        if e['t']>s['en']-0.2: warn.append(f"late element in shot '{s['anc']}': {e.get('txt',e.get('key',e['k']))} t={e['t']:.1f} end={s['en']:.1f}")
# ---- sprites & boxes ----
for s in shots:
    for e in s['els']:
        k=e['k']
        if k=='img':
            sp=img_sprite(e['key'],e['box'],e['rot']); bx,by,bw,bh=e['box']; e['sp']=sp; e['xy']=(bx+(bw-sp.width)//2,by+(bh-sp.height)//2)
        elif k=='txt':
            sp=text_sprite(e['txt'],e['size'],e['col'],e['w'],True,e['maxw'],'c' if e['c'] else 'l'); e['sp']=sp; e['xy']=(e['x']-sp.width//2 if e['c'] else e['x'],e['y'])
        elif k=='ar':
            sp=ar_sprite(e['txt'],e['size'],e['col'],'a'); e['sp']=sp; e['xy']=(e['x']-sp.width//2,e['y'])
        elif k=='card':
            a,b=card_sprites(e['ar'],e['en'],e['ref'],e['w'],e['hl']); e['sp']=a; e['sp2']=b; e['xy']=(e['x']-40,e['y']-40)
        elif k=='tiles':
            sp=tiles_sprite(e['labels']); e['sp']=sp; e['xy']=(e['x']-sp.width//2,e['y'])
        elif k=='badge':
            sp=badge_sprite(e['n']); e['sp']=sp; e['xy']=(e['x']-32,e['y']-32)
        elif k=='walk':
            sp=img_sprite('childwalk',(0,0,400,e['h'])); e['sp']=sp
def bbox(e):
    if e['k']=='walk': return None
    x,y=e['xy']; sp=e['sp']
    if e['k'] in('img',): # use visible content roughly (inner 80%)
        return (x+sp.width*0.1,y+sp.height*0.1,x+sp.width*0.9,y+sp.height*0.9)
    if e['k']=='card': return (x+40,y+40,x+sp.width-40,y+sp.height-40)
    return (x,y,x+sp.width,y+sp.height)
if 'check' in sys.argv:
    for s in shots:
        bs=[(e,bbox(e)) for e in s['els'] if bbox(e)]
        for e,b in bs:
            if b[0]<20 or b[1]<20 or b[2]>W-20 or b[3]>H-20: warn.append(f"out of frame '{s['anc']}': {e.get('txt',e.get('key',e['k']))} {tuple(int(v) for v in b)}")
        for i in range(len(bs)):
            for j in range(i+1,len(bs)):
                a,b=bs[i][1],bs[j][1]
                if a[0]<b[2]-6 and b[0]<a[2]-6 and a[1]<b[3]-6 and b[1]<a[3]-6:
                    n1=bs[i][0].get('txt',bs[i][0].get('key',bs[i][0]['k'])); n2=bs[j][0].get('txt',bs[j][0].get('key',bs[j][0]['k']))
                    warn.append(f"overlap '{s['anc']}': {n1!r} x {n2!r}")
    print('\n'.join(warn) or 'no warnings'); print('shots',len(shots),'end',round(END,1))
# ---- compose ----
BG=Image.open('el/bg.png').convert('RGBA')
def ease(p): p=min(max(p,0),1); return 1-(1-p)**3
def put(fr,sp,xy,a):
    if a<=0: return
    if a<1:
        arr=np.array(sp); arr[...,3]=(arr[...,3]*a).astype(np.uint8); sp=Image.fromarray(arr)
    x,y=int(xy[0]),int(xy[1]); fr.alpha_composite(sp,(max(x,0),max(y,0)),(max(-x,0),max(-y,0)))
def draw_shot(fr,s,t):
    for e in s['els']:
        dt=t-e['t']
        if dt<0: continue
        if e['k']=='walk':
            kt=e['kt']; x=kt[0][1]
            for (t1,x1),(t2,x2) in zip(kt,kt[1:]):
                if t>=t1: x=x1 if t<t1 else (x1+(x2-x1)*min(1,int(min(1,(t-t1)/0.8)*8)/8) if t<t1+0.8 else x2)
            put(fr,e['sp'],(x-e['sp'].width//2,e['y']),ease(dt/0.5)); continue
        p=ease(dt/APP); dy=(1-p)*30
        x,y=e['xy']
        if e['k']=='card' and t>=e['th']:
            q=ease((t-e['th'])/0.4); put(fr,e['sp'],(x,y+dy),p); put(fr,e['sp2'],(x,y+dy),q*p)
        else: put(fr,e['sp'],(x,y+dy),p)
def frame(t):
    fr=BG.copy()
    for s in shots:
        if s['st']<=t<s['en']:
            if t>=s['en']-FADE:
                tmp=BG.copy(); draw_shot(tmp,s,t); fr=Image.blend(BG,tmp,max(0,(s['en']-t)/FADE))
            else: draw_shot(fr,s,t)
            break
    return fr.convert('RGB')
if 'stills' in sys.argv:
    from PIL import ImageDraw
    sel=[int(x) for x in sys.argv[2].split(',')]; th=[]
    for i in sel:
        s=shots[i]; t=min(s['en']-FADE-0.05,max(e.get('th',e['t']) for e in s['els'])+0.8); im=frame(t).resize((480,270)); ImageDraw.Draw(im).text((6,4),f"{i}:{s['anc'][:22]}",fill=(200,0,0)); th.append(im)
    cols=4; rows=(len(th)+cols-1)//cols; sh=Image.new('RGB',(cols*480,rows*270),'white')
    for k,im in enumerate(th): sh.paste(im,((k%cols)*480,(k//cols)*270))
    sh.save(sys.argv[3],quality=82); print('saved')
if 'render' in sys.argv:
    ts=set([0.0,END])
    for s in shots:
        ts.add(s['st']); ts.update(np.arange(s['en']-FADE,s['en'],STEP).tolist())
        for e in s['els']:
            ts.update(np.arange(e['t'],e['t']+APP+STEP,STEP).tolist())
            if e['k']=='card': ts.update(np.arange(e['th'],e['th']+0.4+STEP,STEP).tolist())
            if e['k']=='walk':
                for t1,_ in e['kt']: ts.update(np.arange(t1,t1+0.85,1/8).tolist())
    ts=sorted(t for t in ts if 0<=t<=END); os.makedirs('frames',exist_ok=True)
    lines=[]; prev=None
    for n,t in enumerate(ts):
        fn=f'frames/f{n:05d}.jpg'; frame(t).save(fn,quality=90)
        if prev is not None: lines.append(f"file '{prev}'\nduration {t-pt:.4f}")
        prev=fn; pt=t
        if n%200==0: print(n,len(ts),round(t,1),flush=True)
    lines.append(f"file '{prev}'\nduration 0.5\nfile '{prev}'")
    open('frames/list.txt','w').write('\n'.join(lines).replace("file 'frames/","file '")); print('done',len(ts))
