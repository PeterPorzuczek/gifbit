export class Groove {
  constructor() {
    this.bpm = 0;
    this.lead = 80;
    this.minScore = 0.75;
    this.reset();
  }
  reset() {
    this.locked = false;
    this.buf = [];
    this.loopAt = null;
    this.loop = null;
    this.A = 0;
    this.KA = 0;
    this.p = 0;
    this.mem = new Map();
    this.pred = new Map();
    this.fired = new Set();
    this.nextK = null;
    this.outcomes = [];
    this.pauseUntil = -Infinity;
    this.lastOnset = -1e9;
    this.quality = [];
    this.nPred = 0;
    this.nReact = 0;
  }
  setBpm(b) {
    b = +b || 0;
    if (Math.abs(b - this.bpm) < 0.001) return;
    this.bpm = b;
    this.p0 = b ? 60000 / b / 8 : 0;
    this.reset();
  }
  kOf(t) {
    return this.KA + Math.round((t - this.A) / this.p);
  }
  tOf(k) {
    return this.A + (k - this.KA) * this.p;
  }
  acquire() {
    const P16 = 2 * this.p0;
    let C = 0,
      S = 0,
      W = 0;
    for (const o of this.buf) {
      const a = (2 * Math.PI * (o.t % P16)) / P16,
        w = o.v * o.v;
      C += w * Math.cos(a);
      S += w * Math.sin(a);
      W += w;
    }
    if (this.buf.length < 4 || !W || Math.hypot(C, S) / W < 0.55) return false;
    const phi = (Math.atan2(S, C) / (2 * Math.PI)) * P16;
    const last = this.buf[this.buf.length - 1].t;
    this.p = this.p0;
    this.A = phi + Math.round((last - phi) / P16) * P16;
    this.KA = 0;
    this.gen = (this.gen || 0) + 1;
    this.locked = true;
    this.quality = [];
    this.nextK = null;
    for (const o of this.buf) {
      const k = this.kOf(o.t);
      this.mem.set(k, { v: o.v, off: o.t - this.tOf(k) });
      this.fired.add(k);
    }
    this.buf = [];
    return true;
  }
  onset(t, v) {
    this.lastOnset = t;
    if (!this.bpm) {
      this.nReact++;
      return { kind: 'react', t, v };
    }
    if (!this.locked) {
      this.buf.push({ t, v });
      while (this.buf.length && t - this.buf[0].t > 3000) this.buf.shift();
      this.acquire();
      this.nReact++;
      return { kind: 'react', t, v };
    }

    const P16 = 2 * this.p,
      n16 = Math.round((t - this.A) / P16),
      line = this.A + n16 * P16,
      e = t - line;
    const near = Math.abs(e) < 0.22 * P16;
    if (near) {
      const w = v * v;
      this.A = line + 0.25 * w * e;
      this.KA += 2 * n16;
      this.p = Math.min(this.p0 * 1.04, Math.max(this.p0 * 0.96, this.p + 0.006 * w * e));
    }
    this.quality.push(near ? 1 : 0);
    if (this.quality.length > 16) this.quality.shift();
    if (
      this.quality.length >= 12 &&
      this.quality.reduce((a, b) => a + b, 0) / this.quality.length < 0.35
    ) {
      const b = this.bpm;
      this.reset();
      this.bpm = b;
      this.lastOnset = t;
      this.nReact++;
      return { kind: 'react', t, v };
    }
    const k = this.kOf(t);
    for (const kk of [k, k - 1, k + 1]) {
      const pr = this.pred.get(kk);
      if (pr && !pr.ok) {
        pr.ok = true;
        this.outcome(1);
        this.mem.set(kk, { v, off: t - this.tOf(kk) });
        return null;
      }
    }
    this.mem.set(k, { v, off: t - this.tOf(k) });
    if (this.fired.has(k)) return null;
    this.fired.add(k);
    this.nReact++;
    return { kind: 'react', t, v, k };
  }
  outcome(x) {
    this.outcomes.push(x);
    if (this.outcomes.length > 16) this.outcomes.shift();
    if (
      this.outcomes.length >= 8 &&
      this.outcomes.reduce((a, b) => a + b, 0) / this.outcomes.length < 0.55
    ) {
      this.pauseUntil = this.nextK + 64;
      this.outcomes = [];
    }
  }

  loopScore(L, known) {
    const W = Math.max(L, 32);
    let both = 0,
      either = 0;
    for (let j = known - W + 1; j <= known; j++) {
      const x = this.mem.has(j),
        y = this.mem.has(j - L);
      if (x || y) {
        either++;
        if (x && y) both++;
      }
    }
    return either >= 4 ? both / either : 0;
  }

  activeLoop(known) {
    if (this.loopAt === known) return this.loop;
    let best = null;
    for (const L of [8, 16, 32, 64]) {
      const s = this.loopScore(L, known);
      if (s >= this.minScore && (!best || s > best.s + 0.04)) best = { L, s };
    }
    this.loopAt = known;
    this.loop = best;
    return best;
  }
  match(k, known) {
    const loop = this.activeLoop(known);
    if (!loop) return null;
    const a = this.mem.get(k - loop.L);
    if (!a) return null;
    const b = this.mem.get(k - 2 * loop.L);
    const off = b ? (a.off + b.off) / 2 : a.off,
      v = b ? (a.v + b.v) / 2 : a.v;
    return { v, off: Math.max(-0.45 * this.p, Math.min(0.45 * this.p, off)) };
  }
  tick(now, half = 8) {
    if (!this.bpm || !this.locked) return [];
    if (now - this.lastOnset > 2500) {
      const b = this.bpm;
      this.reset();
      this.bpm = b;
      return [];
    }
    for (const [k, pr] of this.pred) {
      const due = this.tOf(k) + 0.6 * this.p + 30;
      if (!pr.ok && now > due) {
        this.outcome(0);
        this.pred.delete(k);
      } else if (pr.ok && now > due) this.pred.delete(k);
    }
    if (this.nextK === null) this.nextK = this.kOf(now + this.lead) + 1;
    const out = [],
      known = this.kOf(now - 0.5 * this.p);
    for (let guard = 0; guard < 64; guard++) {
      const k = this.nextK,
        m = this.match(k, known);
      const tf = this.tOf(k) + (m ? m.off : 0) - this.lead;
      if (tf > now + half) break;
      this.nextK++;
      if (tf < now - 40 || !m || k < this.pauseUntil || this.fired.has(k)) continue;
      this.pred.set(k, { ok: false });
      this.fired.add(k);
      this.nPred++;
      out.push({ kind: 'predict', t: tf, v: m.v, k });
    }
    const old = this.nextK - 200;
    for (const k of this.mem.keys()) if (k < old) this.mem.delete(k);
    for (const k of this.fired) if (k < old) this.fired.delete(k);
    return out;
  }
  status(now) {
    if (!this.bpm) return { mode: 'free' };
    if (!this.locked)
      return { mode: now - this.lastOnset > 2500 ? 'idle' : 'search', bpm: this.bpm };
    const o = this.outcomes,
      acc = o.length ? o.reduce((a, b) => a + b, 0) / o.length : null;
    return { mode: 'locked', bpm: 60000 / (this.p * 8), acc, paused: this.nextK < this.pauseUntil };
  }
}
