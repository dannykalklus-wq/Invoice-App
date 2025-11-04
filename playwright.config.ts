import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  timeout: 60_000,
  reporter: [['list'], ['html']],
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'Desktop Chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
    { name: 'Mobile Android', use: { ...devices['Pixel 7'] } }
  ]
});
