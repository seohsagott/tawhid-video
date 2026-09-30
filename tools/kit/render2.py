import sys, os, math, numpy as np
from PIL import Image
sys.argv_saved=sys.argv; sys.argv=['x']
exec(open('render.py').read().split('# ---- compose ----')[0])   # timeline + sprites
sys.argv=sys.argv_saved
FPS=12; TR=0.3
BG=Image.open('el/bg.png').convert('RGBA')
def clamp(v,a=0,b=1): return max(a,min(b,v))
def eo(p): p=clamp(p); return 1-(1-p)**3
def back(p,c=1.5): p=clamp(p); return 1+(c+1)*(p-1)**3+c*(p-1)**2
def bounce(p):
    p=clamp(p)
    if p<0.6: return (p/0.6)**2
    q=(p-0.6)/0.4; return 1-0.12*math.sin(math.pi*q)
SLIDE={'worship','scholar','group','childlook','idols','sheep','fence','steps','villages','cup','town','scale','globe','blocks','tsg','rope','flowers','chain'}
DROP={'book','quran','pen','layers','amulet','ring','mirror','phones','puzzle'}
SND={'book':'page','quran':'page','layers':'page','pen':'paper','scholar':'paper','lamp':'click','lantern':'click','moon':'swish','rope':'creak','clock':'tick','wind':'wind','bird':'flutter','cup':'water','idols':'stone','markyes':'swish','markno':'swish','steps':'step','chain':'chain','crown':'pop','heart':'pop','phones':'pop','puzzle':'tap','fence':'tap'}
# ---- assign animations ----
eid=0
for si,s in enumerate(shots):
    s['trans']='slide' if (si%2==0 and not any(e['k']=='card' for e in s['els'])) else 'fade'
    for e in s['els']:
        eid+=1; e['id']=eid; k=e['k']
        if k=='img':
            e['anim']='slide' if e['key'] in SLIDE else ('drop' if e['key'] in DROP else 'pop')
            cx=e['box'][0]+e['box'][2]/2; e['dir']=-1 if cx<960 else 1; e['dur']=0.6
        elif k=='txt':
            big=e['w']=='Bold' and e['size']>=48
            e['anim']='type' if big else ('slideL' if not e['c'] else 'rise'); e['dur']=clamp(len(e['txt'])*0.04,0.45,1.3) if big else 0.5
        elif k=='ar': e['anim']='revealR'; e['dur']=1.0
        elif k=='card': e['anim']='card'; e['dur']=0.7
        elif k in('badge','tiles'): e['anim']='pop'; e['dur']=0.45
        elif k=='walk': e['anim']='walk'; e['dur']=0.5
_sc={}
def scaled(e,s):
    k=(e['id'],round(s,2))
    if k not in _sc:
        sp=e['sp']; _sc[k]=sp.resize((max(1,int(sp.width*s)),max(1,int(sp.height*s))),Image.BILINEAR)
        if len(_sc)>400: _sc.clear()
    return _sc[k]
def put(fr,sp,x,y,a=1.0):
    if a<=0.01: return
    if a<0.99:
        arr=np.array(sp); arr[...,3]=(arr[...,3]*a).astype(np.uint8); sp=Image.fromarray(arr)
    x,y=int(x),int(y)
    if x>=W or y>=H or x+sp.width<=0 or y+sp.height<=0: return
    fr.alpha_composite(sp,(max(x,0),max(y,0)),(max(-x,0),max(-y,0)))
def jit(e,n):
    h=(e['id']*7919+(n//2)*104729)%1000; return ((h%7)-3)*0.5,(((h//7)%7)-3)*0.5
def draw_el(fr,e,t,n):
    dt=t-e['t']
    if dt<0: return
    p=dt/e['dur']; x,y=e.get('xy',(0,0)); sp=e.get('sp'); a=e['anim']
    if a=='walk':
        kt=e['kt']; xx=kt[0][1]; moving=False
        for (t1,x1),(t2,x2) in zip(kt,kt[1:]):
            if t>=t1: xx=x1
            if t1<=t<t1+0.9: xx=x1; break
        for (t1,x1),(t2,x2) in zip(kt,kt[1:]):
            if t2<=t<t2+0.9: q=(t-t2)/0.9; xx=x1+(x2-x1)*q; moving=True
            elif t>=t2+0.9: xx=x2
        bob=(-6 if n%2 else 0) if moving else 0
        put(fr,sp,xx-sp.width//2,e['y']+bob,eo(dt/0.5)); return
    jx,jy=jit(e,n) if e['k']=='img' else (0,0)
    if p>=1:
        if e['k']=='card' and t>=e['th']:
            q=eo((t-e['th'])/0.4); put(fr,sp,x,y); put(fr,e['sp2'],x,y,q)
        else: put(fr,sp,x+jx,y+jy)
        return
    if a=='pop':
        s=0.25+0.75*back(p,1.8); im=scaled(e,s); put(fr,im,x+(sp.width-im.width)/2,y+(sp.height-im.height)/2,clamp(p*3))
    elif a=='drop': put(fr,sp,x,y-160*(1-bounce(p)),clamp(p*3))
    elif a=='slide': put(fr,sp,x+e['dir']*260*(1-back(p,1.2)),y,clamp(p*2.5))
    elif a=='type':
        w=int(sp.width*clamp(p*1.05)); 
        if w>0: put(fr,sp.crop((0,0,w,sp.height)),x,y)
    elif a=='slideL': put(fr,sp,x-80*(1-eo(p)),y,eo(p))
    elif a=='rise': put(fr,sp,x,y+30*(1-eo(p)),eo(p))
    elif a=='revealR':
        w=int(sp.width*eo(p))
        if w>0: put(fr,sp.crop((sp.width-w,0,sp.width,sp.height)),x+sp.width-w,y)
    elif a=='card': put(fr,sp,x,y+140*(1-back(p,1.1)),clamp(p*2.5))
def draw_shot(fr,s,t,n):
    for e in s['els']: draw_el(fr,e,t,n)
def frame(n):
    t=n/FPS; fr=BG.copy()
    for i,s in enumerate(shots):
        if not(s['st']-TR<=t<s['en']+(TR if i+1<len(shots) else 0)): continue
        nxt=shots[i+1] if i+1<len(shots) else None
        if t>=s['en']-TR and nxt is not None and t<s['en']:   # outgoing
            q=eo((t-(s['en']-TR))/TR); tt=s['en']-0.001
            if nxt['trans']=='slide':
                lay=Image.new('RGBA',(W,H),(0,0,0,0)); draw_shot(lay,s,tt,n); put(fr,lay,-W*q,0)
            else:
                lay=Image.new('RGBA',(W,H),(0,0,0,0)); draw_shot(lay,s,tt,n); put(fr,lay,0,0,1-q)
        elif s['st']<=t<s['en']:
            if s['trans']=='slide' and t<s['st']+TR and i>0:
                q=eo((t-s['st'])/TR); lay=Image.new('RGBA',(W,H),(0,0,0,0)); draw_shot(lay,s,t,n); put(fr,lay,W*(1-q),0)
            else: draw_shot(fr,s,t,n)
    return fr.convert('RGB')
NF=int(END*FPS)+1
if 'render' in sys.argv:
    a,b=int(sys.argv[2]),min(int(sys.argv[3]),NF); os.makedirs('fr12',exist_ok=True)
    for n in range(a,b):
        fn=f'fr12/f{n:05d}.jpg'
        if os.path.exists(fn): continue
        frame(n).save(fn,quality=88)
        if n%600==0: print(n,NF,flush=True)
    print('chunk done',a,b,flush=True)
if 'sfx' in sys.argv:
    import sfx as S
    L=int((END+1)*S.SR); mix=np.zeros(L); ev=[]
    for i,s in enumerate(shots):
        if i>0: ev.append((s['st']-0.25,'whoosh' if s['trans']=='slide' else 'paper',0 if s['trans']=='slide' else -4))
        for e in s['els']:
            k=e['k']
            if k=='img': ev.append((e['t'],SND.get(e['key'],'paper'),0))
            elif k=='txt' and e['anim']=='type': ev.append((e['t'],('scratch',e['dur']),0))
            elif k in('badge','tiles'): ev.append((e['t'],'tap',-2))
            elif k=='card': ev.append((e['t'],'page',0)); ev.append((e['th'],'swish',-3))
            elif k=='walk':
                for (t1,_),(t2,_) in zip(e['kt'],e['kt'][1:]):
                    for j in range(4): ev.append((t2+j*0.22,'step',0))
    ev.sort(key=lambda x:x[0]); last=-9; cnt=0
    for t,name,g in ev:
        isscr=isinstance(name,tuple)
        if not isscr and name not in('whoosh','step') and t-last<0.18: continue
        x=S.scratch(name[1]) if isscr else S.SFX[name]()
        k=int(max(0,t)*S.SR); x=x[:max(0,L-k)]*10**(g/20); mix[k:k+len(x)]+=x
        if not isscr: last=t
        cnt+=1
    import wave
    pcm=(np.clip(mix,-1,1)*32767).astype(np.int16); w=wave.open('mix/sfx.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(S.SR); w.writeframes(pcm.tobytes()); w.close()
    print('sfx events',cnt)
if 'still' in sys.argv:
    for n in [int(float(x)*FPS) for x in sys.argv[2].split(',')]: frame(n).resize((640,360)).save(f'st_{n}.jpg',quality=80)
    print('stills ok')
