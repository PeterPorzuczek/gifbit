export class Det {
  constructor(sr) {
    this.sr = sr;
    this.env = 0;
    this.aA = 1 - Math.exp(-1 / (0.0005 * sr));
    this.aR = 1 - Math.exp(-1 / (0.045 * sr));
    this.hist = new Float32Array(8).fill(-120);
    this.hi = 0;
    this.peak = -60;
    this.t = 0;
    this.lastHit = -1;
    this.armed = true;
    this.show = -120;
    this.gate = -75;
    this.setSens(6);
  }

  setSens(s) {
    this.rise = 13 - s;
    this.range = 12 + 2 * s;
  }
  block(x) {
    let m = 0,
      env = this.env;
    const aA = this.aA,
      aR = this.aR;
    for (let i = 0; i < x.length; i++) {
      const a = x[i] < 0 ? -x[i] : x[i];
      env += (a > env ? aA : aR) * (a - env);
      if (env > m) m = env;
    }
    this.env = env;
    const L = 20 * Math.log10(m + 1e-9);
    const dt = x.length / this.sr;
    this.t += dt;
    this.peak = Math.max(L, this.peak - 6 * dt);
    let lo = 1e9;
    for (let i = 0; i < this.hist.length; i++) if (this.hist[i] < lo) lo = this.hist[i];
    this.hist[this.hi] = L;
    this.hi = (this.hi + 1) % this.hist.length;
    const rise = L - lo;
    this.gate = Math.max(this.peak - this.range, -75);
    if (!this.armed && rise < this.rise * 0.5) this.armed = true;

    let hit = 0;
    if (
      this.armed &&
      this.t > 0.15 &&
      rise > this.rise &&
      L > this.gate &&
      this.t - this.lastHit > 0.07
    ) {
      const s = Math.max(0, Math.min(1, (L - this.gate) / Math.max(1, this.peak - this.gate)));
      hit = 0.3 + 0.7 * Math.pow(s, 1.5);
      this.armed = false;
      this.lastHit = this.t;
    }
    if (L > this.show) this.show = L;
    return hit;
  }
  report() {
    const r = { lvl: this.show, gate: this.gate };
    this.show = -120;
    return r;
  }
}
