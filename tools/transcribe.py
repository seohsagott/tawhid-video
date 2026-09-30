#!/usr/bin/env python3
"""
Word-level timings with faster-whisper  ->  words.json  ([word, start, end] per word)

Two modes:

  free      transcribe the audio and emit the recognised words with timings.
  --script  the authoritative text is known (it always is for this series:
            the approved English script). Recognised words are matched to the
            script with a sequence matcher; matched script words take the
            recognised timings, and unmatched ones are interpolated between
            their matched neighbours by character weight. The OUTPUT WORDS ARE
            THE SCRIPT'S, never the recogniser's — so the transliterated Arabic
            terms come out spelled as approved, not as Whisper heard them
            (v2 §6: "المنقحر العربي يُعطى نطقًا تقريبيًا").

Model: `base` int8 runs ~5x realtime on this 4 GB machine; `small` is more
accurate and still fits. The first run downloads the model.

  ../.venv-align/bin/python tools/transcribe.py audio.flac out/words.json
  ../.venv-align/bin/python tools/transcribe.py audio.flac out/words.json --script script.txt --model small
"""
import argparse, difflib, json, re, sys


def norm(w):
    return re.sub(r"[^\w]", "", w).lower()


def recognise(audio, model, language, threads, vad=False):
    from faster_whisper import WhisperModel
    m = WhisperModel(model, device="cpu", compute_type="int8", cpu_threads=threads)
    segs, info = m.transcribe(audio, word_timestamps=True, language=language, beam_size=1,
                              vad_filter=vad, condition_on_previous_text=False)
    out = []
    for s in segs:
        for w in s.words or []:
            t = w.word.strip()
            if t:
                out.append([t, round(float(w.start), 3), round(float(w.end), 3)])
    return out


def align_to_script(rec, script_words):
    """Snap the script onto the recognised timeline."""
    a = [norm(w) for w in script_words]
    b = [norm(w[0]) for w in rec]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    times = [None] * len(script_words)
    for i, j, n in sm.get_matching_blocks():
        for k in range(n):
            times[i + k] = (rec[j + k][1], rec[j + k][2])
    # interpolate the gaps by character weight between matched neighbours
    known = [i for i, t in enumerate(times) if t]
    if not known:
        raise SystemExit("nothing matched between script and recognition")
    if known[0] > 0:
        times[0] = (max(0.0, times[known[0]][0] - 0.3 * known[0]), None)
    for x in range(len(known) - 1):
        i0, i1 = known[x], known[x + 1]
        if i1 - i0 <= 1:
            continue
        t0, t1 = times[i0][1], times[i1][0]
        wts = [len(a[i]) + 1.5 for i in range(i0 + 1, i1)]
        tot = sum(wts); cur = t0
        for i, wt in zip(range(i0 + 1, i1), wts):
            d = (t1 - t0) * wt / tot
            times[i] = (round(cur, 3), round(cur + d, 3)); cur += d
    last = known[-1]
    for i in range(last + 1, len(times)):
        s = times[i - 1][1] or times[i - 1][0]
        times[i] = (round(s, 3), round(s + 0.3, 3))
    for i, t in enumerate(times):
        if t and t[1] is None:
            times[i] = (t[0], round(t[0] + 0.3, 3))
    out = [[w, round(t[0], 3), round(t[1], 3)] for w, t in zip(script_words, times)]
    return out, len(known)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("audio"); ap.add_argument("out")
    ap.add_argument("--script", help="approved text; output words are taken from it")
    ap.add_argument("--model", default="base"); ap.add_argument("--language", default="en")
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--vad", action="store_true", help="voice-activity filter; OFF by default — it dropped 30 of 48 words on the slow, paused narration this series uses")
    a = ap.parse_args()
    rec = recognise(a.audio, a.model, a.language, a.threads, a.vad)
    print(f"recognised {len(rec)} words, {rec[-1][2] if rec else 0:.1f}s")
    if a.script:
        sw = open(a.script, encoding="utf-8").read().split()
        words, matched = align_to_script(rec, sw)
        print(f"script {len(sw)} words, {matched} matched directly ({100*matched/len(sw):.0f}%), rest interpolated")
    else:
        words = rec
    json.dump(words, open(a.out, "w"), ensure_ascii=False)
    print("wrote", a.out)
