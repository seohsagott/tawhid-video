import sys, re, json, subprocess, time
from pocketsphinx import Decoder, get_model_path
import os
D=set(l.split()[0].split('(')[0] for l in open(os.path.join(get_model_path(),'en-us','cmudict-en-us.dict'),encoding='utf-8'))
def pcm(f,ss=0,t=None):
    a=['ffmpeg','-v','error','-ss',str(ss),'-i',f]+(['-t',str(t)] if t else [])+['-ac','1','-ar','16000','-f','s16le','-']
    return subprocess.run(a,capture_output=True).stdout
def align(f,words,ss=0,t=None):
    toks=[]; keep=[]
    for i,w in enumerate(words):
        n=re.sub(r"[^a-z']","",w.lower()).strip("'")
        if n in D: toks.append(n); keep.append(i)
    d=Decoder(samprate=16000,bestpath=False,loglevel='FATAL'); d.set_align_text(' '.join(toks))
    raw=pcm(f,ss,t); d.start_utt(); d.process_raw(raw,full_utt=True); d.end_utt()
    segs=[s for s in d.seg() if s.word not in ('<s>','</s>','<sil>','[NOISE]')]
    out={}
    for k,s in zip(keep,segs): out[k]=(ss+s.start_frame/100,ss+s.end_frame/100)
    return out,len(toks),len(segs)
if __name__=='__main__':
    words=json.load(open('words.json'))
    t0=time.time(); f='mix/p1.wav'; n=783
    r,a,b=align(f,[w[0] for w in words[:n]])
    print('toks',a,'segs',b,'secs',round(time.time()-t0,1))
    for i in [0,40,100,200,400,600,782]:
        if i in r: print(i,words[i][0],'old',words[i][1],'new',round(r[i][0],2))
