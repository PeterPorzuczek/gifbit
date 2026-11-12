import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  projects: [
    {
      name: 'source',
      testIgnore: '**/standalone.spec.js',
      use: { baseURL: 'http://127.0.0.1:4174/gifbit/' },
    },
    { name: 'dist', testIgnore: '**/standalone.spec.js' },
    {
      name: 'single-html',
      testIgnore: '**/standalone.spec.js',
      use: { baseURL: 'http://127.0.0.1:4173/gifbit/gifbit.html' },
    },
    { name: 'file', testMatch: '**/standalone.spec.js' },
  ],
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4173/gifbit/',
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  webServer: [
    {
      command: 'node scripts/serve.mjs',
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      url: 'http://127.0.0.1:4173/gifbit/',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node scripts/serve.mjs --source',
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { PORT: '4174' },
      url: 'http://127.0.0.1:4174/gifbit/',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
