import json, re, difflib, numpy as np
from PIL import Image, ImageDraw, ImageFont
W,H=1920,1080
SLATE=(91,100,112); ROSE=(185,121,122); SAGE=(96,128,90); MUTED=(140,130,122); GOLD=(185,145,63)
FD='fonts/'
def mfont(size,weight='SemiBold'):
    f=ImageFont.truetype(FD+'Montserrat.ttf',size)
    try: f.set_variation_by_name(weight)
    except Exception: f.set_variation_by_name(weight.encode())
    return f
_fc={}
def font(kind,size,weight='SemiBold'):
    k=(kind,size,weight)
    if k not in _fc:
        if kind=='m': _fc[k]=mfont(size,weight)
        elif kind=='q': _fc[k]=ImageFont.truetype(FD+'AmiriQuran-Regular.ttf',size,layout_engine=ImageFont.Layout.RAQM)
        else: _fc[k]=ImageFont.truetype(FD+('Amiri-Bold.ttf' if weight=='Bold' else 'Amiri-Regular.ttf'),size,layout_engine=ImageFont.Layout.RAQM)
    return _fc[k]
def isar(ch): return '\u0600'<=ch<='\u06ff' or '\ufb50'<=ch<='\ufdff' or '\ufe70'<=ch<='\ufeff'
# ---------- words / anchors ----------
WORDS=json.load(open('words.json')); NORM=[re.sub(r'[^\w]','',w[0]).lower() for w in WORDS]
def locate(phrase,start):
    q=[re.sub(r'[^\w]','',x).lower() for x in phrase.split()]; q=[x for x in q if x]; L=len(q)
    for i in range(start,len(NORM)-L+1):
        if NORM[i:i+L]==q: return i
    best=(0,None); qs=' '.join(q)
    for i in range(start,min(len(NORM)-L+1,start+2500)):
        r=difflib.SequenceMatcher(None,qs,' '.join(NORM[i:i+L])).ratio()
        if r>best[0]: best=(r,i)
    if best[0]>=0.8: return best[1]
    raise ValueError(f'anchor not found: {phrase!r} after word {start}')
# ---------- sprites ----------
def text_sprite(txt,size,color=SLATE,weight='SemiBold',upper=True,maxw=None,align='l',spacing=0.06,lh=1.25):
    if upper: txt=''.join(c if isar(c) else c.upper() for c in txt)
    f=font('m',size,weight); fa=font('a',int(size*1.1)); sp=size*spacing if upper else 0
    def cw(c): return (fa if isar(c) else f).getlength(c)+sp
    def ww(s): return sum(cw(c) for c in s)
    lines=[]
    for para in txt.split('\n'):
        if not maxw: lines.append(para); continue
        cur=''
        for word in para.split(' '):
            t=(cur+' '+word).strip()
            if ww(t)<=maxw or not cur: cur=t
            else: lines.append(cur); cur=word
        lines.append(cur)
    lw=[ww(l) for l in lines]; wd=int(max(lw)+8); lhp=int(size*lh); ht=lhp*len(lines)+int(size*0.35)
    im=Image.new('RGBA',(wd,ht),(0,0,0,0)); d=ImageDraw.Draw(im)
    for i,l in enumerate(lines):
        x=(wd-lw[i])/2 if align=='c' else 0; y=i*lhp
        for c in l:
            if isar(c): d.text((x,y+size*0.95),c,font=fa,fill=color,anchor='ls')
            else: d.text((x,y+size*0.95),c,font=f,fill=color,anchor='ls')
            x+=cw(c)
    return im
def ar_sprite(txt,size,color=ROSE,kind='a',maxw=1600):
    f=font(kind,size); words=txt.split(' '); lines=[]; cur=''
    for w_ in words:
        t=(cur+' '+w_).strip()
        if f.getlength(t,direction='rtl')<=maxw or not cur: cur=t
        else: lines.append(cur); cur=w_
    lines.append(cur); lhp=int(size*1.75)
    wd=int(max(f.getlength(l,direction='rtl') for l in lines))+20; ht=lhp*len(lines)+int(size*0.4)
    im=Image.new('RGBA',(wd,ht),(0,0,0,0)); d=ImageDraw.Draw(im)
    for i,l in enumerate(lines): d.text((wd/2,i*lhp+size*1.15),l,font=f,fill=color,anchor='ms',direction='rtl')
    return im
def shadowed(im,rad=26,r=18):
    from PIL import ImageFilter
    pad=40; big=Image.new('RGBA',(im.width+2*pad,im.height+2*pad),(0,0,0,0))
    sh=Image.new('RGBA',big.size,(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((pad,pad+10,pad+im.width,pad+im.height+10),r,fill=(70,55,40,60))
    sh=sh.filter(ImageFilter.GaussianBlur(rad/2)); big.alpha_composite(sh); big.alpha_composite(im,(pad,pad)); return big
def card_sprites(ar,en,ref,w,hl):
    pad=48; inner=w-2*pad
    A=ar_sprite(ar,54,ROSE,'q',inner); lab=text_sprite('Translation of the meaning',22,MUTED,'Medium',True,None,'c',0.14)
    R=text_sprite(ref,26,ROSE,'SemiBold',True,None,'c',0.12)
    f=font('m',40,'SemiBold'); words=en.split(' '); lines=[]; cur=[]
    for wd in words:
        t=' '.join(cur+[wd])
        if f.getlength(t)<=inner or not cur: cur.append(wd)
        else: lines.append(cur); cur=[wd]
    lines.append(cur)
    hlw=set(); ew=' '.join(words); k=ew.find(hl) if hl else -1
    if k>=0:
        st=len(ew[:k].split()); hlw=set(range(st,st+len(hl.split())))
    lh=56; eh=lh*len(lines)+14
    ht=pad+A.height+18+lab.height+8+eh+22+R.height+pad
    out=[]
    for on in (False,True):
        c=Image.new('RGBA',(w,ht),(0,0,0,0)); d=ImageDraw.Draw(c); d.rounded_rectangle((0,0,w-1,ht-1),20,fill=(251,248,241,255))
        y=pad; c.alpha_composite(A,((w-A.width)//2,y)); y+=A.height+18; c.alpha_composite(lab,((w-lab.width)//2,y)); y+=lab.height+8
        idx=0
        for ln in lines:
            lwid=f.getlength(' '.join(ln)); x=(w-lwid)/2
            for wd in ln:
                col=ROSE if (on and idx in hlw) else SLATE
                d.text((x,y+40),wd,font=f,fill=col,anchor='ls'); x+=f.getlength(wd+' '); idx+=1
            y+=lh
        y+=22; c.alpha_composite(R,((w-R.width)//2,y))
        out.append(shadowed(c))
    return out
_ic={}
def img_sprite(key,box,rot=0):
    k=(key,box,rot)
    if k not in _ic:
        im=Image.open(f'el/{key}.png')
        if rot: im=im.rotate(rot,expand=True)
        bw,bh=box[2],box[3]; s=min(bw/im.width,bh/im.height); im=im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.LANCZOS); _ic[k]=im
    return _ic[k]
def tiles_sprite(labels):
    f=font('m',44,'Bold'); ws=[max(96,int(f.getlength(l))+36) for l in labels]; gap=16
    im=Image.new('RGBA',(sum(ws)+gap*(len(ws)-1)+80,200),(0,0,0,0)); x=40
    for l,wv in zip(labels,ws):
        t=Image.new('RGBA',(wv,116),(0,0,0,0)); d=ImageDraw.Draw(t); d.rounded_rectangle((0,0,wv-1,115),10,fill=(251,248,241,255)); d.text((wv/2,60),l,font=f,fill=SLATE,anchor='mm')
        s=shadowed(t,16,10); im.alpha_composite(s,(x-40,0)); x+=wv+gap
    return im
def badge_sprite(n):
    im=Image.new('RGBA',(64,64),(0,0,0,0)); d=ImageDraw.Draw(im); d.ellipse((0,0,63,63),fill=ROSE+(255,)); d.text((32,33),n,font=font('m',32,'Bold'),fill=(255,255,255),anchor='mm'); return im
