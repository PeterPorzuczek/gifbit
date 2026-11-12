import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  projects: [
    { name: 'source', testIgnore: '**/standalone.spec.js' },
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
  webServer: {
    command: 'node serve.mjs',
    url: 'http://127.0.0.1:4173/gifbit/',
    reuseExistingServer: !process.env.CI,
  },
});
