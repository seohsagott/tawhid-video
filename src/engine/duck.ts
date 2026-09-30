/**
 * Automatic ducking of the effects bed under the narration.
 *
 * Production standards v2 §6: "خفض تلقائي تحت الكلام: المؤثرات تنخفض كلما تكلم
 * الراوي وتعود في الوقفات." sfx3.py never implemented this, so it is built here
 * from the word-level alignment in words.json rather than ported.
 *
 * The depth and the attack/release below are production choices, not values
 * carried over from the kit: -6 dB is enough to clear the voice without making
 * the effects disappear, and the release is slow enough not to pump between
 * words inside a sentence.
 */

/** Ducked level while the narrator is speaking. */
const DUCK_DB = -6;
const DUCK = 10 ** (DUCK_DB / 20);
const ATTACK = 0.08;
const RELEASE = 0.25;
/** Gaps shorter than this are inside a sentence, not a pause. */
const MERGE_GAP = 0.12;

type Iv = [number, number];

export type Words = [string, number, number][];

const buildIntervals = (w: Words): Iv[] => {
  const out: Iv[] = [];
  for (const [, a, b] of w) {
    const last = out[out.length - 1];
    if (last && a - last[1] <= MERGE_GAP) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
};

/** Index of the last interval starting at or before t, or -1. */
const findAtOrBefore = (IV: Iv[], t: number): number => {
  let lo = 0;
  let hi = IV.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (IV[mid][0] <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
};

/** Build a ducking function for one narration: linear gain for the effects bed at absolute time `t`. */
export const makeDucker = (words: Words): ((t: number) => number) => {
  const IV = buildIntervals(words);
  return (t: number): number => {
  const i = findAtOrBefore(IV, t);
  if (i < 0) return 1;
  const [a, b] = IV[i];
  if (t <= b) {
    const ramp = Math.min(1, (t - a) / ATTACK);
    return 1 + (DUCK - 1) * ramp;
  }
  const r = Math.min(1, (t - b) / RELEASE);
  return DUCK + (1 - DUCK) * r;
  };
};
