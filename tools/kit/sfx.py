import numpy as np
from scipy.signal import butter, sosfilt
SR=48000; rng=np.random.default_rng(7)
def t_(d): return np.arange(int(SR*d))/SR
def bp(x,lo,hi,o=2): return sosfilt(butter(o,[lo,hi],'band',fs=SR,output='sos'),x)
def lp(x,f,o=2): return sosfilt(butter(o,f,'low',fs=SR,output='sos'),x)
def hp(x,f,o=2): return sosfilt(butter(o,f,'high',fs=SR,output='sos'),x)
def env(n,a,r,shape=2.0):
    e=np.ones(n); A=max(1,int(a*SR)); e[:A]=np.linspace(0,1,A)**0.7
    tail=np.linspace(0,1,n-A); e[A:]=(1-tail)**shape; return e
def norm(x,db): x=x/ (np.max(np.abs(x))+1e-9); return x*10**(db/20)
def noise(d): return rng.standard_normal(int(SR*d))
def paper(d=0.35):
    n=noise(d); x=bp(n,1800,7500)*env(len(n),0.02,0.9,2.5)
    g=np.zeros(len(n))
    for _ in range(9):
        k=rng.integers(0,len(n)-800); g[k:k+800]+=bp(noise(800/SR),2500,9000)*np.hanning(800)*rng.uniform(.4,1)
    return norm(x+0.8*g,-27)
def page(d=0.3):
    n=noise(d); tt=t_(d); x=np.zeros(len(n))
    for i in range(0,len(n),480):
        seg=n[i:i+480]; f=900+4000*(i/len(n)); x[i:i+len(seg)]=bp(seg,f*0.6,min(f*1.6,20000))
    th=np.sin(2*np.pi*90*tt)*np.exp(-tt*40)*0.5
    return norm(x*env(len(n),0.05,0.95,1.5)+th,-25)
def whoosh(d=0.5):
    n=noise(d); x=np.zeros(len(n)); L=len(n)
    for i in range(0,L,240):
        p=i/L; f=350+2200*np.sin(np.pi*p); seg=n[i:i+240]; x[i:i+len(seg)]=bp(seg,f*0.7,f*1.4)
    return norm(lp(x,6000)*np.sin(np.pi*np.linspace(0,1,L))**1.5,-25)
def pop():
    tt=t_(0.09); f=520*np.exp(-tt*18)+180; ph=2*np.pi*np.cumsum(f)/SR
    return norm(np.sin(ph)*np.exp(-tt*55)+0.15*hp(noise(0.09),3000)*np.exp(-tt*120),-26)
def tap():
    tt=t_(0.12); x=(np.sin(2*np.pi*820*tt)+0.5*np.sin(2*np.pi*1730*tt)+0.25*np.sin(2*np.pi*3100*tt))*np.exp(-tt*55)
    return norm(x+0.2*hp(noise(0.12),2500)*np.exp(-tt*200),-25)
def click():
    tt=t_(0.12); x=np.zeros(len(tt)); x[:60]=noise(60/SR)
    x[1500:1560]+=0.7*noise(60/SR); x=hp(x,1500)+0.12*np.sin(2*np.pi*2600*tt)*np.exp(-tt*50)
    return norm(x,-23)
def creak(d=0.6):
    tt=t_(d); f0=110+30*np.sin(2*np.pi*1.3*tt); imp=np.zeros(len(tt)); ph=np.cumsum(f0)/SR
    imp[np.where(np.diff(np.floor(ph))>0)[0]]=1; imp*=rng.uniform(.3,1,len(tt))
    x=bp(imp,300,2200)+0.1*bp(noise(d),400,1500)
    return norm(x*env(len(tt),0.06,0.9,1.2),-26)
def tick():
    a=tap()*0.8; b=np.zeros(int(SR*0.5)); b[:len(a)]+=a; k=int(SR*0.28); b[k:k+len(a)]+=a*0.7; return norm(hp(b,900),-25)
def wind(d=1.1):
    n=noise(d); tt=t_(d); x=np.zeros(len(n))
    for i in range(0,len(n),480):
        f=500+400*np.sin(2*np.pi*0.9*i/SR); seg=n[i:i+480]; x[i:i+len(seg)]=bp(seg,f*0.6,f*1.5)
    return norm(x*np.sin(np.pi*tt/d)**1.2,-28)
def flutter(d=0.45):
    n=noise(d); tt=t_(d); am=(np.sin(2*np.pi*16*tt)>0.2).astype(float)
    return norm(bp(n,400,3000)*lp(am,60)*env(len(n),0.02,0.9,1.3),-26)
def water(d=0.6):
    tt=t_(d); x=np.zeros(len(tt))
    for _ in range(7):
        k=rng.integers(0,len(tt)-3000); u=t_(3000/SR); f=rng.uniform(500,1100)*(1+2*u*8)
        x[k:k+3000]+=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-u*60)*rng.uniform(.4,1)
    return norm(x+0.15*bp(noise(d),800,4000)*env(len(tt),0.1,0.9),-27)
def stone():
    tt=t_(0.25); x=np.sin(2*np.pi*95*tt)*np.exp(-tt*22)+0.4*lp(noise(0.25),900)*np.exp(-tt*30)
    return norm(x,-23)
def swish(d=0.22):
    n=noise(d); return norm(bp(n,2500,9000)*np.sin(np.pi*np.linspace(0,1,len(n)))**2,-29)
def scratch(d):
    d=max(0.3,min(d,1.4)); n=noise(d); tt=t_(d); am=0.55+0.45*np.sin(2*np.pi*11*tt+rng.uniform(0,6))
    return norm(bp(n,1800,6000)*am*env(len(n),0.05,0.85,1),-34)
def chain():
    out=np.zeros(int(SR*0.35))
    for k in (0,int(SR*0.09),int(SR*0.2)):
        tt=t_(0.12); x=sum(np.sin(2*np.pi*f*tt)*np.exp(-tt*r) for f,r in ((2350,60),(3900,80),(5200,90)))
        out[k:k+len(x)]+=x*rng.uniform(.5,1)
    return norm(out,-28)
def step():
    tt=t_(0.08); return norm(lp(noise(0.08),1200)*np.exp(-tt*70),-30)
SFX={'paper':paper,'page':page,'whoosh':whoosh,'pop':pop,'tap':tap,'click':click,'creak':creak,'tick':tick,'wind':wind,'flutter':flutter,'water':water,'stone':stone,'swish':swish,'chain':chain,'step':step}
