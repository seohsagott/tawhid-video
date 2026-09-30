import sys, os, glob, math, random, subprocess, numpy as np
from PIL import Image
_argv=sys.argv; sys.argv=['x']
exec(open('render2.py').read().split('NF=int(END*FPS)+1')[0])
sys.argv=_argv
PL='/home/claude/lib/kenney-particle-pack'
def psprite(name,size,tint,strength=1.0):
    f=[p for p in glob.glob(PL+'/**/*.png',recursive=True) if p.endswith('/'+name+'.png')][0]
    a=np.asarray(Image.open(f).convert('RGBA').resize((size,size),Image.LANCZOS)).astype(np.float32)
    al=a[...,3]*(a[...,:3].max(2)/255)*strength; out=np.zeros(a.shape,np.uint8); out[...,:3]=tint; out[...,3]=np.clip(al,0,255)
    return Image.fromarray(out,'RGBA')
GOLD=(233,196,106); DUSTC=(172,156,136); HLC=(243,222,160)
STARS=[psprite(f'star_0{i}',56,GOLD) for i in (1,2,4,6,7)]+[psprite('spark_01',44,GOLD)]
DUSTC=(150,132,110); DUST=[psprite(f'smoke_0{i}',240,DUSTC,1.0) for i in (1,3,5,7)]
GLOW={}
def radial(sz,col,amax=170):
    yy,xx=np.mgrid[0:sz,0:sz]; r=np.hypot(xx-sz/2,yy-sz/2)/(sz/2); a=np.clip(1-r,0,1)**2.2*amax
    o=np.zeros((sz,sz,4),np.uint8); o[...,:3]=col; o[...,3]=a.astype(np.uint8); return Image.fromarray(o,'RGBA')
def marker(w,h,col=(240,212,140)):
    rr=random.Random(w*31+h); o=np.zeros((h,w,4),np.uint8); o[...,:3]=col
    top=[int(h*0.18+rr.uniform(-2,2)) for _ in range(w)]; bot=[int(h*0.92+rr.uniform(-2,2)) for _ in range(w)]
    for x in range(w):
        a=150 if 6<x<w-6 else 90; o[top[x]:bot[x],x,3]=a
    return Image.fromarray(o,'RGBA')
SPARK={'lamp','lantern','moon','crown','markyes','heart','globe','quran'}; GLOWK={'lamp','lantern','moon'}
rnd=random.Random(11)
for s in shots:
    for e in s['els']:
        if e['k']=='img':
            e['parts']=[]; cx=e['xy'][0]+e['sp'].width/2; cy=e['xy'][1]+e['sp'].height/2
            if e['key'] in SPARK:
                for j in range(9): e['parts'].append(('star',e['t']+0.25,cx,cy,rnd.uniform(0,2*math.pi),rnd.uniform(90,190),rnd.choice(STARS),rnd.uniform(0.7,1.1)))
            if e['anim']=='drop':
                by=e['xy'][1]+e['sp'].height*0.82
                for j in range(4): e['parts'].append(('dust',e['t']+0.36,cx+rnd.uniform(-0.3,0.3)*e['sp'].width,by,rnd.choice([-1,1]),rnd.uniform(30,90),rnd.choice(DUST),1))
            if e['key'] in GLOWK:
                sz=int(max(e['sp'].width,e['sp'].height)*1.5); e['glow']=radial(sz,(245,208,120),150)
        if e['k']=='txt' and e['w']=='Bold' and e['size']>=48 and e['col'] in (ROSE,SAGE) and len(e['txt'])<40:
            sp=e['sp']; e['stroke']=marker(sp.width+30,int(e['size']*0.62))
        if e['k']=='card':
            e['parts']=[('star',e['th']+0.05,e['xy'][0]+e['sp'].width*rnd.uniform(0.25,0.75),e['xy'][1]+e['sp'].height*0.62,rnd.uniform(0,2*math.pi),rnd.uniform(60,140),rnd.choice(STARS),0.8) for _ in range(7)]
def draw_fx_back(fr,e,t):
    if 'glow' in e and t>=e['t']+0.2:
        g=e['glow']; a=eo((t-e['t']-0.2)/0.8)*(0.75+0.25*math.sin(2*math.pi*(t%2.6)/2.6))
        cx=e['xy'][0]+e['sp'].width/2; cy=e['xy'][1]+e['sp'].height/2; put(fr,g,cx-g.width/2,cy-g.height/2,a)
    if 'stroke' in e:
        t0=e['t']+e['dur']; 
        if t>=t0:
            st=e['stroke']; w=int(st.width*eo((t-t0)/0.35))
            if w>2: x,y=e['xy']; put(fr,st.crop((0,0,w,st.height)),x-15,y+e['size']*0.42,1.0)
def draw_fx_front(fr,e,t):
    for kind,t0,cx,cy,ang,dist,sp,sc in e.get('parts',[]):
        dt=t-t0
        if kind=='star' and 0<=dt<0.9:
            p=dt/0.9; d=dist*eo(p); x=cx+math.cos(ang)*d; y=cy+math.sin(ang)*d-20*p
            put(fr,sp,x-sp.width/2,y-sp.height/2,(1-p)**1.3*sc)
        elif kind=='dust' and 0<=dt<0.8:
            p=dt/0.8; s=0.6+0.9*eo(p); im=sp.resize((max(2,int(sp.width*s)),max(2,int(sp.height*s*0.6))),Image.BILINEAR)
            put(fr,im,cx+ang*dist*eo(p)-im.width/2,cy-im.height/2,(1-p)*0.9)
def draw_shot3(fr,s,t,n):
    for e in s['els']:
        if t>=e['t']: draw_fx_back(fr,e,t)
        draw_el(fr,e,t,n)
        draw_fx_front(fr,e,t)
for i,s in enumerate(shots): s['trans']='fade' if any(e['k']=='card' for e in s['els']) else ('push','wipe','fade')[i%3]
PAPER=BG.copy()
def sheet(x):
    sh=Image.new('RGBA',(W+60,H),(0,0,0,0)); sh.paste(PAPER,(60,0))
    g=np.zeros((H,60,4),np.uint8); g[...,3]=(np.linspace(0,1,60)**2*90).astype(np.uint8)[None,:]; sh.paste(Image.fromarray(g,'RGBA'),(0,0)); return sh
SHEET=sheet(0)
def camera(im,s,t):
    z=1+0.028*clamp((t-s['st'])/max(1,s['en']-s['st']))
    if z<1.001: return im
    w,h=int(W*z),int(H*z); big=im.resize((w,h),Image.BILINEAR); x=(w-W)//2; y=(h-H)//2; return big.crop((x,y,x+W,y+H))
TR=0.35
def frame3(n):
    t=n/FPS; out=BG.copy(); cur=None
    for i,s in enumerate(shots):
        if s['st']<=t<s['en']: cur=i; break
    if cur is None: return out.convert('RGB')
    s=shots[cur]; lay=BG.copy(); draw_shot3(lay,s,t,n); lay=camera(lay,s,t)
    nxt=shots[cur+1] if cur+1<len(shots) else None
    if nxt and t>=s['en']-TR:          # outgoing half
        q=eo((t-(s['en']-TR))/TR); tr=nxt['trans']
        if tr=='push': out.paste(lay.crop((int(W*q),0,W,H)),(0,0))
        elif tr=='fade': out=Image.blend(lay,BG,q)
        else: out=lay; put(out,SHEET,W*(1-q)-60,0)
    elif cur>0 and t<s['st']+TR:        # incoming half
        q=eo((t-s['st'])/TR); tr=s['trans']
        if tr=='push': out=BG.copy(); out.paste(lay.crop((0,0,int(W*q)+1,H)),(W-int(W*q)-1,0))
        elif tr=='fade': out=Image.blend(BG,lay,q)
        else: out=lay; put(out,SHEET,-W*q-60,0)
    else: out=lay
    return out.convert('RGB')
NF=int(END*FPS)+1
if 'render' in sys.argv:
    a,b=int(sys.argv[2]),min(int(sys.argv[3]),NF); os.makedirs('fr3',exist_ok=True)
    for n in range(a,b):
        fn=f'fr3/f{n:05d}.jpg'
        if not os.path.exists(fn): frame3(n).save(fn,quality=88)
        if n%1000==0: print(n,NF,flush=True)
    print('chunk done',flush=True)
if 'still' in sys.argv:
    ims=[frame3(int(float(x)*FPS)).resize((640,360)) for x in sys.argv[2].split(',')]
    g=Image.new('RGB',(1280,360*((len(ims)+1)//2)))
    for k,im in enumerate(ims): g.paste(im,((k%2)*640,(k//2)*360))
    g.save('st3.jpg',quality=80); print('ok')
