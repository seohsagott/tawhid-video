/**
 * CPython-compatible `random.Random` — enough of it for the engine.
 *
 * render3.py draws sparkle/dust parameters from `random.Random(11)` and
 * sfx3.py picks sample files from `random.Random(5)`. Reproducing the
 * Mersenne Twister here means the resolver can generate those values at
 * runtime — from an editable content file — and still be bit-identical to the
 * v3 render. Verified against every baked draw (427 particles, 250 cues).
 *
 * Implements: seeding via init_by_array (how CPython seeds from an int),
 * genrand_int32, random() (53-bit), uniform(), getrandbits(k<=32), and
 * choice() via _randbelow_with_getrandbits — exactly CPython's algorithms.
 */
export class PyRandom {
  private mt = new Uint32Array(624);
  private mti = 625;

  constructor(seed: number) {
    // CPython: int seed -> abs value split into 32-bit little-endian chunks.
    const key: number[] = [];
    let s = Math.abs(Math.trunc(seed));
    if (s === 0) key.push(0);
    while (s > 0) {
      key.push(s % 0x100000000);
      s = Math.floor(s / 0x100000000);
    }
    this.initByArray(key);
  }

  private initGenrand(s: number): void {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < 624; i++) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.mti = 624;
  }

  private initByArray(key: number[]): void {
    const mt = this.mt;
    this.initGenrand(19650218);
    let i = 1;
    let j = 0;
    const klen = key.length;
    for (let k = Math.max(624, klen); k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0;
      i++;
      j++;
      if (i >= 624) {
        mt[0] = mt[623];
        i = 1;
      }
      if (j >= klen) j = 0;
    }
    for (let k = 623; k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
      i++;
      if (i >= 624) {
        mt[0] = mt[623];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
    this.mti = 624;
  }

  genrandInt32(): number {
    const mt = this.mt;
    if (this.mti >= 624) {
      let kk = 0;
      for (; kk < 624 - 397; kk++) {
        const y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + 397] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      for (; kk < 623; kk++) {
        const y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + (397 - 624)] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      const y = (mt[623] & 0x80000000) | (mt[0] & 0x7fffffff);
      mt[623] = mt[396] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      this.mti = 0;
    }
    let y = mt[this.mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** CPython random(): 53-bit float from two draws. */
  random(): number {
    const a = this.genrandInt32() >>> 5;
    const b = this.genrandInt32() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }

  /** getrandbits for k in 1..32 (all the engine needs). */
  getrandbits(k: number): number {
    if (k <= 0 || k > 32) throw new Error(`getrandbits(${k}) unsupported`);
    return this.genrandInt32() >>> (32 - k);
  }

  /** CPython _randbelow_with_getrandbits. */
  randbelow(n: number): number {
    const k = 32 - Math.clz32(n); // n.bit_length()
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }

  choice<T>(seq: readonly T[]): T {
    if (seq.length === 0) throw new Error("choice from empty sequence");
    return seq[this.randbelow(seq.length)];
  }
}
