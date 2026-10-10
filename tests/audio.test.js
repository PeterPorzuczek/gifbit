import test from 'node:test';
import assert from 'node:assert/strict';
import { Det } from '../src/audio/detector.js';
import { Groove } from '../src/audio/groove.js';

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

