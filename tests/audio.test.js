import test from 'node:test';
import assert from 'node:assert/strict';
import { Det } from '../src/detector.js';
import { Groove } from '../src/groove.js';

test('silence never triggers the transient detector at any sensitivity', () => {
  for (let sensitivity = 1; sensitivity <= 10; sensitivity++) {
    const detector = new Det(48000);
    detector.setSens(sensitivity);
    for (let i = 0; i < 1000; i++) assert.equal(detector.block(new Float32Array(128)), 0);
  }
});

test('a fresh attack triggers once while a sustained tone stays quiet', () => {
  const detector = new Det(48000);
  const silence = new Float32Array(128);
  const tone = new Float32Array(128).fill(0.8);
  for (let i = 0; i < 100; i++) detector.block(silence);
  const hits = Array.from({ length: 400 }, () => detector.block(tone)).filter(Boolean);
  assert.equal(hits.length, 1);
  assert.ok(hits[0] >= 0.3 && hits[0] <= 1);
  assert.ok(detector.report().lvl > -10);
  assert.equal(detector.report().lvl, -120);
});

test('without tempo every onset is delivered immediately', () => {
  const groove = new Groove();
  assert.deepEqual(groove.onset(1000, 0.7), { kind: 'react', t: 1000, v: 0.7 });
  assert.deepEqual(groove.tick(1100), []);
  assert.equal(groove.status(1100).mode, 'free');
});

test('a repeating beat locks, predicts early and suppresses duplicate onsets', () => {
  const groove = new Groove();
  groove.setBpm(120);
  let predictions = 0;
  let suppressed = 0;
  for (let now = 0; now <= 16000; now += 5) {
    for (const event of groove.tick(now, 0)) {
      assert.equal(event.kind, 'predict');
      predictions++;
    }
    if (now % 500 === 0 && groove.onset(now, 1) === null) suppressed++;
  }
  assert.equal(groove.status(16000).mode, 'locked');
  assert.ok(predictions > 5);
  assert.ok(suppressed > 5);
  assert.ok(Math.abs(groove.status(16000).bpm - 120) < 1);
  groove.tick(19000);
  assert.equal(groove.status(19000).mode, 'idle');
});

test('changing tempo discards the previous grid and prediction memory', () => {
  const groove = new Groove();
  groove.setBpm(120);
  for (let i = 0; i < 8; i++) groove.onset(i * 500, 1);
  assert.equal(groove.locked, true);
  groove.setBpm(90);
  assert.equal(groove.locked, false);
  assert.equal(groove.mem.size, 0);
  assert.equal(groove.pred.size, 0);
});
