import { Det } from './detector.js';

class GifbitProc extends AudioWorkletProcessor {
  constructor() {
    super();
    this.d = new Det(sampleRate);
    this.n = 0;
    this.port.onmessage = (e) => {
      if (e.data && e.data.sens) this.d.setSens(e.data.sens);
    };
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      const h = this.d.block(ch);
      if (h) this.port.postMessage({ hit: h });
      this.n += ch.length;
      if (this.n >= 768) {
        this.n = 0;
        this.port.postMessage(this.d.report());
      }
    }
    return true;
  }
}
registerProcessor('gifbit-det', GifbitProc);
