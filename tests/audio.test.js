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

