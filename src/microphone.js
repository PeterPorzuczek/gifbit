import { $, $$ } from './dom.js';
import { settings, groove } from './state.js';
import { Det } from './audio/detector.js';
export function createMicrophone(app) {
  let actx = null,
    filters = [],
    micOn = false,
    sendSens = () => {};
  let meterIn = -120,
    meterShown = -120,
    meterGate = -75;
  const meterEls = $$('.meter').map((m) => ({ fill: $('.fill', m), thr: $('.thr', m) }));
  const BAND_HZ = { bass: [30, 150], mid: [200, 6000], full: [30, 16000] };
  function ensureCtx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try {
          actx = new AC({ latencyHint: 'interactive' });
        } catch (e) {
          actx = new AC();
        }
      }
    }
    if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
  }
  function applyBand() {
    if (!filters.length) return;
    const [lo, hi] = BAND_HZ[settings.band] || BAND_HZ.bass;
    const t = actx.currentTime;
    filters[0].frequency.setValueAtTime(lo, t);
    filters[1].frequency.setValueAtTime(lo, t);
    filters[2].frequency.setValueAtTime(hi, t);
    filters[3].frequency.setValueAtTime(hi, t);
  }
  function onDet(m) {
    if (m.hit) {
      const now = performance.now();
      app.rhythm.flash();
      if (app.calibration.calOpen) app.calibration.pulseMicDot(now);
      const ev = groove.onset(now, m.hit);
      if (ev) app.rhythm.fire(ev, now);
    }
    if (m.lvl !== undefined) {
      meterIn = Math.max(meterIn, m.lvl);
      meterGate = m.gate;
    }
  }
  let stream = null,
    source = null,
    processor = null,
    mute = null,
    pending = null,
    generation = 0;
  async function connectMic() {
    if (micOn) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw { kind: 'nomic' };
    ensureCtx();
    if (!actx) throw { kind: 'nomic' };
    const attempt = generation;
    const acquired = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        latency: 0,
      },
    });
    if (attempt !== generation) {
      acquired.getTracks().forEach((track) => track.stop());
      throw { kind: 'nomic' };
    }
    stream = acquired;
    if (actx.state === 'suspended') {
      try {
        await actx.resume();
      } catch (e) {}
    }

    source = actx.createMediaStreamSource(stream);
    filters = ['highpass', 'highpass', 'lowpass', 'lowpass'].map((type) => {
      const f = actx.createBiquadFilter();
      f.type = type;
      f.Q.value = 0.707;
      return f;
    });
    source.connect(filters[0]);
    filters[0].connect(filters[1]);
    filters[1].connect(filters[2]);
    filters[2].connect(filters[3]);
    applyBand();
    mute = actx.createGain();
    mute.gain.value = 0;
    mute.connect(actx.destination);

    let worklet = false;
    if (actx.audioWorklet && window.AudioWorkletNode) {
      try {
        await actx.audioWorklet.addModule(new URL('./audio/worklet.js', import.meta.url));
        const node = new AudioWorkletNode(actx, 'gifbit-det', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        processor = node;
        node.port.onmessage = (e) => onDet(e.data);
        filters[3].connect(node);
        node.connect(mute);
        sendSens = () => node.port.postMessage({ sens: settings.sens });
        worklet = true;
      } catch (e) {
        worklet = false;
      }
    }
    if (!worklet) {
      const d = new Det(actx.sampleRate);
      const sp = actx.createScriptProcessor(256, 1, 1);
      let n = 0;
      processor = sp;
      sp.onaudioprocess = (ev) => {
        const x = ev.inputBuffer.getChannelData(0);
        for (let o = 0; o < x.length; o += 128) {
          const h = d.block(x.subarray(o, o + 128));
          if (h) onDet({ hit: h });
        }
        n += x.length;
        if (n >= 768) {
          n = 0;
          onDet(d.report());
        }
      };
      filters[3].connect(sp);
      sp.connect(mute);
      sendSens = () => d.setSens(settings.sens);
    }
    sendSens();
    micOn = true;
    $('#microw').hidden = false;
    $('#micnote').hidden = true;
  }
  function stopMic() {
    generation++;
    micOn = false;
    sendSens = () => {};
    if (processor?.port) processor.port.close();
    if (processor && 'onaudioprocess' in processor) processor.onaudioprocess = null;
    for (const node of [source, ...filters, processor, mute]) {
      try {
        node?.disconnect();
      } catch {}
    }
    stream?.getTracks().forEach((track) => track.stop());
    if (actx && actx.state !== 'closed') actx.close().catch(() => {});
    stream = source = processor = mute = actx = null;
    filters = [];
    meterIn = meterShown = -120;
    $('#microw').hidden = true;
    $('#micnote').hidden = false;
  }
  async function startMic() {
    if (micOn) return;
    if (!pending)
      pending = connectMic()
        .catch((error) => {
          stopMic();
          throw error;
        })
        .finally(() => {
          pending = null;
        });
    return pending;
  }
  function init() {
    let resume = false;
    window.addEventListener('pagehide', () => {
      resume = micOn;
      stopMic();
    });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted && resume)
        startMic().catch((error) => app.browser.toast(app.calibration.micText(error)));
    });
  }
  return {
    init,
    get micOn() {
      return micOn;
    },
    get sendSens() {
      return sendSens;
    },
    get meterIn() {
      return meterIn;
    },
    set meterIn(value) {
      meterIn = value;
    },
    get meterShown() {
      return meterShown;
    },
    set meterShown(value) {
      meterShown = value;
    },
    get meterGate() {
      return meterGate;
    },
    meterEls,
    ensureCtx,
    applyBand,
    startMic,
  };
}
