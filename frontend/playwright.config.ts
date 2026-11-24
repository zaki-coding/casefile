import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve('..')
const venvPython = resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const python = existsSync(venvPython) ? venvPython : 'python'
const baseURL = 'http://127.0.0.1:8879'

export default defineConfig({
  testDir: './browser-tests',
  testMatch: '**/*.pw.ts',
  workers: 1,
  use: { baseURL, channel: process.env.PLAYWRIGHT_CHANNEL, screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { viewport: { width: 375, height: 700 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `"${python}" run_game.py --port 8879`,
    cwd: root,
    url: baseURL,
    env: { CASEFILE_DB: resolve('test-results', 'browser.sqlite3') },
    reuseExistingServer: false,
  },
})
