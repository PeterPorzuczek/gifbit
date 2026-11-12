import { stage, layer } from '../core/dom.js';
import { settings } from '../core/state.js';
export function createPlayback(app) {
  let bag = [],
    ready = [],
    gen = 0,
    seq = 0;
  const AHEAD = 6;
  function resetPool() {
    bag = [];
    ready = [];
    gen++;
  }
  function nextItem() {
    if (settings.order === 'seq') {
      if (seq >= app.library.active.length) seq = 0;
      return app.library.active[seq++];
    }
    if (!bag.length) {
      bag = app.library.active.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return app.library.active[bag.pop()];
  }
  function fill() {
    const g = gen;
    while (app.library.active.length && ready.length < AHEAD) {
      const it = nextItem();
      const img = new Image();
      img.alt = '';
      const entry = { it, img, loaded: false, failed: false };
      ready.push(entry);
      const done = () => {
        if (g !== gen) return;
        entry.loaded = true;
      };
      const fail = () => {
        if (g !== gen) return;
        entry.failed = true;
      };
      if (!img.decode) {
        img.onload = done;
        img.onerror = fail;
      }
      img.src = settings.mode === 'single' ? it.big : it.small;
      if (img.decode) img.decode().then(done, fail);
    }
  }
  let z = 0;
  function place(node, it) {
    const W = stage.clientWidth,
      H = stage.clientHeight,
      vmin = Math.min(W, H);
    const ar = Math.max(0.3, Math.min(3, it.w / it.h));
    let h = vmin * (0.3 + Math.random() * 0.22) * (it.sticker ? 1.1 : 1);
    let w = h * ar;
    const maxW = W * 0.62;
    if (w > maxW) {
      w = maxW;
      h = w / ar;
    }
    const x = Math.random() * Math.max(0, W - w),
      y = Math.random() * Math.max(0, H - h);
    Object.assign(node.style, {
      width: w + 'px',
      height: h + 'px',
      left: x + 'px',
      top: y + 'px',
      rotate: ((Math.random() * 2 - 1) * 9).toFixed(1) + 'deg',
      zIndex: String(++z),
    });
  }
  let fresh = null;
  function showNext() {
    while (ready.length && (ready[0].failed || app.library.excluded.has(ready[0].it.id)))
      ready.shift();
    if (settings.order === 'random') {
      const loaded = ready.findIndex((entry) => entry.loaded);
      if (loaded > 0) ready.unshift(...ready.splice(loaded, 1));
    }
    if (!ready[0]?.loaded) {
      fill();
      return false;
    }
    let r = ready.shift();
    while (r && app.library.excluded.has(r.it.id)) r = ready.shift();
    fill();
    if (!r) return false;
    const node = document.createElement('div');
    node.className = 'g ' + (r.it.sticker ? 'sticker' : 'card');
    if (fresh) fresh.style.transform = '';
    fresh = node;
    if (settings.mode === 'single') {
      node.classList.add('single');
      node.style.zIndex = String(++z);
      node.appendChild(r.img);
      layer.replaceChildren(node);
      return true;
    }
    place(node, r.it);
    node.appendChild(r.img);
    layer.appendChild(node);
    trim();
    return true;
  }
  function trim() {
    const live = layer.children;
    const max = settings.mode === 'single' ? 1 : settings.max;
    while (live.length > max) live[0].remove();
  }
  const spring = { x: 0, v: 0, t: 0 };
  const calm = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  function kick(v) {
    if (calm.matches) return;
    const a = (settings.bounce / 10) * 0.09 * (0.35 + 0.65 * v);
    if (a > spring.x) {
      spring.x = a;
      spring.v = 0;
    }
  }
  function stepSpring(now) {
    let dt = Math.min(0.05, Math.max(0, (now - spring.t) / 1000));
    spring.t = now;
    const w = (2 * Math.PI) / 0.26,
      zeta = 0.38;
    while (dt > 0) {
      const h = Math.min(dt, 0.004);
      spring.v += (-w * w * spring.x - 2 * zeta * w * spring.v) * h;
      spring.x += spring.v * h;
      dt -= h;
    }
    if (Math.abs(spring.x) < 1e-4 && Math.abs(spring.v) < 1e-3) {
      spring.x = 0;
      spring.v = 0;
    }
    const x = spring.x;
    if (settings.mode === 'single') {
      layer.style.transform = '';
      if (fresh) fresh.style.transform = x ? `scale(${(1 + x).toFixed(4)})` : '';
    } else {
      layer.style.transform = x ? `scale(${(1 + 0.3 * x).toFixed(4)})` : '';
      if (fresh) fresh.style.transform = x ? `scale(${(1 + 1.4 * x).toFixed(4)})` : '';
    }
  }
  function init() {}
  return {
    init,
    get bag() {
      return bag;
    },
    set bag(value) {
      bag = value;
    },
    get ready() {
      return ready;
    },
    set ready(value) {
      ready = value;
    },
    get seq() {
      return seq;
    },
    set seq(value) {
      seq = value;
    },
    resetPool,
    fill,
    showNext,
    trim,
    kick,
    stepSpring,
  };
}
