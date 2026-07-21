/**
 * Playwright Configuration — QA Suite
 * =====================================
 * Run against local or deployed environment.
 *
 * Local:
 *   npm run test:qa
 *
 * Against deployed:
 *   E2E_API_URL=https://api.yourdomain.com \
 *   E2E_BASE_URL=https://yourdomain.com \
 *   npm run test:qa:prod
 */
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from repo root (gitignored — copy .env.example and fill in)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const API_URL  = process.env.E2E_API_URL  || 'http://127.0.0.1:8000';
const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './e2e/qa',

  /* Run tests sequentially in QA to avoid token-cache race conditions */
  fullyParallel: false,
  workers: 1,

  /* Retry flaky tests once in CI */
  retries: process.env.CI ? 1 : 0,

  /* Fail fast if a beforeAll fails */
  forbidOnly: !!process.env.CI,

  /* Reporter */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/qa', open: 'never' }],
    ['json', { outputFile: 'playwright-report/qa/results.json' }],
  ],

  use: {
    baseURL:       BASE_URL,
    extraHTTPHeaders: {
      'x-tenant-id': process.env.E2E_QA_TENANT || 'qa',
    },
    trace:         'on-first-retry',
    screenshot:    'only-on-failure',
    video:         'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 90_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Timeout per test (API tests are fast; UI tests need more time) */
  timeout: 60_000,
  expect: { timeout: 10_000 },
});
