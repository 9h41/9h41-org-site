import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { routes, viewports } from './parity-config.mjs';

const mode = process.argv[2];
if (!['baseline', 'current'].includes(mode)) {
  console.error('Usage: node scripts/parity-capture.mjs <baseline|current>');
  process.exit(1);
}

const outputRoot = path.join('parity', mode);
const liveBase = 'https://www.9h41.org';
const localBase = 'http://127.0.0.1:8080';

const browser = await chromium.launch({ headless: true });

try {
  for (const [device, viewport] of Object.entries(viewports)) {
    const outDir = path.join(outputRoot, device);
    await fs.mkdir(outDir, { recursive: true });

    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    for (const route of routes) {
      const url = `${mode === 'baseline' ? liveBase : localBase}${route.path}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(outDir, `${route.slug}.png`), fullPage: true });
      console.log(`${mode} ${device}: ${route.path}`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}
