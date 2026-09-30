import sys, glob, subprocess, numpy as np, wave, random
_a=sys.argv; sys.argv=['x']; exec(open('render3.py').read()); sys.argv=_a
import sfx as SY
SR=48000; L='/home/claude/lib'; rr=random.Random(5)
def files(pat):
    pat=pat.replace('.ogg','')
    return sorted(p for p in glob.glob(f'{L}/**/{pat}*',recursive=True) if p.endswith(('.ogg','.wav')))
BANK={'page':files('book_flip*.ogg'),'place':files('book_place*.ogg'),'cloth':[p for p in files('cloth') if 'belt' not in p],
 'switch':files('switch*.ogg')[:12],'click':files('click*.ogg'),'creak':files('creak*.ogg'),'tick':files('tick*.ogg'),
 'stone':files('impact_mining*.ogg'),'wood':files('impact_wood_light*.ogg'),'metal':files('impact_metal_light*.ogg'),
 'foot':files('footstep_carpet*.ogg'),'scratch':files('scratch*.ogg'),'soft':files('impact_soft_medium*.ogg')}
for k,v in BANK.items(): assert v,k
_c={}
def load(f):
    if f not in _c:
        raw=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout
        x=np.frombuffer(raw,np.float32).copy(); x/= (np.abs(x).max()+1e-9); _c[f]=x*10**(-12/20)
    return _c[f]
GAIN={'page':-7,'place':-9,'cloth':-12,'switch':-8,'click':-13,'creak':-9,'tick':-9,'stone':-15,'wood':-12,'metal':-15,'foot':-17,'scratch':-15,'soft':-12,'water':-8,'wind':-6,'flutter':-8}
IMG={'book':('page','place'),'quran':('page','place'),'layers':('page','place'),'pen':(None,'place'),'amulet':(None,'place'),'ring':(None,'place'),'mirror':(None,'place'),'phones':(None,'place'),'puzzle':(None,'place'),
 'lamp':('switch',None),'lantern':('switch',None),'moon':('click',None),'crown':('click',None),'heart':('click',None),'markyes':('click',None),'markno':('wood',None),
 'rope':('creak',None),'clock':('tick',None),'idols':('stone',None),'fence':('wood',None),'chain':('metal',None),'scale':('metal',None),'steps':('foot',None),
 'cup':('water',None),'wind':('wind',None),'bird':('flutter',None),'sprout':('soft',None),'cloud':('soft',None),'globe':('soft',None)}
ev=[]
for i,s in enumerate(shots):
    if i>0:
        if s['trans']=='push': ev.append((s['st']-0.3,'cloth',-2))
        elif s['trans']=='wipe': ev.append((s['st']-0.3,'page',-2))
    for e in s['els']:
        k=e['k']
        if k=='img':
            a,b=IMG.get(e['key'],('cloth',None))
            if a: ev.append((e['t'],a,0))
            if b: ev.append((e['t']+0.36,b,0))
        elif k in('badge','tiles'): ev.append((e['t'],'click',0))
        elif k=='card': ev.append((e['t'],'page',0)); ev.append((e['th'],'scratch',0))
        elif k=='txt' and 'stroke' in e: ev.append((e['t']+e['dur'],'scratch',0))
        elif k=='walk':
            for (t1,_),(t2,_) in zip(e['kt'],e['kt'][1:]):
                for j in range(4): ev.append((t2+0.05+j*0.22,'foot',0))
ev.sort(); N=int((END+1)*SR); mix=np.zeros(N,np.float32); last={}; used=0
for t,name,g in ev:
    if name!='foot' and t-last.get('any',-9)<0.14: continue
    if name in('water','wind','flutter'): x={'water':SY.water,'wind':SY.wind,'flutter':SY.flutter}[name]().astype(np.float32); x/=np.abs(x).max()+1e-9; x*=10**(-12/20)
    else: x=load(rr.choice(BANK[name]))
    x=x*10**((GAIN[name]+g)/20); k=int(max(0,t)*SR); n=min(len(x),N-k); mix[k:k+n]+=x[:n]; last['any']=t; used+=1
pcm=(np.clip(mix,-1,1)*32767).astype(np.int16); w=wave.open('mix/sfx3.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
print('events used',used,'of',len(ev))
