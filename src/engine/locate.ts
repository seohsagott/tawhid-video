/**
 * Anchor resolution — port of engine.locate() from tawhid-kit.
 *
 * Every element and shot is tied to a phrase of the narration; locate() turns
 * that phrase into a word index in words.json. Exact match first, then a
 * difflib.SequenceMatcher.ratio() fallback at >= 0.8 over the next 2500
 * positions. The SequenceMatcher here is the non-autojunk algorithm, which is
 * identical to CPython's for sequences under 200 characters — all of ours —
 * and was checked to give the same index for the three anchors that need it.
 */

const normWord = (w: string): string => w.replace(/[^\p{L}\p{N}_]/gu, "").toLowerCase();

export type Words = [string, number, number][];

export class Locator {
  private norm: string[];

  constructor(public readonly words: Words) {
    this.norm = words.map((w) => normWord(w[0]));
  }

  get length(): number {
    return this.norm.length;
  }

  /** Word start time. */
  t0(i: number): number {
    return this.words[i][1];
  }

  locate(phrase: string, start: number): number {
    const q = phrase.split(" ").map(normWord).filter((x) => x);
    const L = q.length;
    const N = this.norm;
    for (let i = start; i <= N.length - L; i++) {
      let ok = true;
      for (let j = 0; j < L; j++) {
        if (N[i + j] !== q[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return i;
    }
    const qs = q.join(" ");
    let best = 0;
    let bestI = -1;
    const end = Math.min(N.length - L + 1, start + 2500);
    for (let i = start; i < end; i++) {
      const r = ratio(qs, N.slice(i, i + L).join(" "));
      if (r > best) {
        best = r;
        bestI = i;
      }
    }
    if (best >= 0.8) return bestI;
    throw new Error(`anchor not found: ${JSON.stringify(phrase)} after word ${start}`);
  }
}

/* ------------------------------------------------ difflib.SequenceMatcher */

/** find_longest_match without junk (isjunk=None, no autojunk). */
const longestMatch = (
  a: string,
  b: string,
  b2j: Map<string, number[]>,
  alo: number,
  ahi: number,
  blo: number,
  bhi: number,
): [number, number, number] => {
  let besti = alo;
  let bestj = blo;
  let bestsize = 0;
  let j2len = new Map<number, number>();
  for (let i = alo; i < ahi; i++) {
    const newj2len = new Map<number, number>();
    const js = b2j.get(a[i]);
    if (js) {
      for (const j of js) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) ?? 0) + 1;
        newj2len.set(j, k);
        if (k > bestsize) {
          besti = i - k + 1;
          bestj = j - k + 1;
          bestsize = k;
        }
      }
    }
    j2len = newj2len;
  }
  return [besti, bestj, bestsize];
};

/** SequenceMatcher(None, a, b).ratio() — 2*M/T. */
export const ratio = (a: string, b: string): number => {
  const la = a.length;
  const lb = b.length;
  if (la + lb === 0) return 1;
  const b2j = new Map<string, number[]>();
  for (let j = 0; j < lb; j++) {
    const ch = b[j];
    const arr = b2j.get(ch);
    if (arr) arr.push(j);
    else b2j.set(ch, [j]);
  }
  const queue: [number, number, number, number][] = [[0, la, 0, lb]];
  let matches = 0;
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop() as [number, number, number, number];
    const [i, j, k] = longestMatch(a, b, b2j, alo, ahi, blo, bhi);
    if (k) {
      matches += k;
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
  }
  return (2 * matches) / (la + lb);
};
