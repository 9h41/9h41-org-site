import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const OUT_ROOT = path.join('parity', 'sections');
const LIVE_URL = 'https://www.9h41.org/';
const LOCAL_URL = 'http://127.0.0.1:8080/';
const VIEWPORT = { width: 1440, height: 2200 };
const PASS_THRESHOLD = 3;

const SECTION_CONFIG = [
  { key: 'header', selector: 'header.site-header' },
  { key: 'hero', selector: '.home-hero' },
  { key: 'services', selector: '.services-steps' },
  { key: 'dayline', selector: '.dayline' },
  { key: 'industries', selector: '.industries' },
  { key: 'clients', selector: '.clients-block' },
  { key: 'figures', selector: '.figures-block' },
  { key: 'jobs', selector: '.jobs-block' },
  { key: 'contact', selector: '.contact-section' },
  { key: 'footer', selector: 'footer.site-footer' }
];

const INDUSTRIES_OFFSETS = [0, 250, 500, 750, 1000];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pngFromSlice(src, y0, y1) {
  const top = clamp(Math.floor(y0), 0, src.height);
  const bottom = clamp(Math.ceil(y1), 0, src.height);
  const h = Math.max(1, bottom - top);
  const out = new PNG({ width: src.width, height: h });
  PNG.bitblt(src, out, 0, top, src.width, h, 0, 0);
  return out;
}

function diffRatio(basePng, currentPng) {
  const width = Math.min(basePng.width, currentPng.width);
  const height = Math.min(basePng.height, currentPng.height);
  const b = new PNG({ width, height });
  const c = new PNG({ width, height });
  PNG.bitblt(basePng, b, 0, 0, width, height, 0, 0);
  PNG.bitblt(currentPng, c, 0, 0, width, height, 0, 0);
  const d = new PNG({ width, height });
  const mismatchPixels = pixelmatch(b.data, c.data, d.data, width, height, { threshold: 0.1, includeAA: false });
  return { width, height, mismatchPixels, totalPixels: width * height, ratio: (mismatchPixels / (width * height)) * 100, diffPng: d };
}

async function getLocalSectionBounds(page) {
  return page.evaluate((sections) => {
    const out = {};
    for (const s of sections) {
      const el = document.querySelector(s.selector);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      out[s.key] = {
        y: Math.max(0, Math.floor(r.top + window.scrollY)),
        h: Math.max(1, Math.ceil(r.height))
      };
    }
    return out;
  }, SECTION_CONFIG);
}

async function getAnchorY(page, text) {
  return page.evaluate((needle) => {
    const nodes = [...document.querySelectorAll('body *')];
    let best = null;
    for (const el of nodes) {
      const normalized = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (!normalized.includes(needle)) continue;
      const r = el.getBoundingClientRect();
      const area = Math.max(0, r.width * r.height);
      if (!area) continue;
      if (!best || area < best.area) {
        best = { area, y: r.top + window.scrollY };
      }
    }
    return best ? Math.round(best.y) : null;
  }, text);
}

async function captureFullPage(page, outPath) {
  await page.goto(page.url(), { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: outPath, fullPage: true });
}

async function captureAnchorOffsetShots(page, anchorY, offsets, prefix) {
  const shots = [];
  for (const off of offsets) {
    const y = Math.max(0, anchorY + off - 140);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(220);
    const file = path.join(OUT_ROOT, `${prefix}-off${off}.png`);
    await page.screenshot({ path: file, fullPage: false });
    shots.push({ offset: off, y, file });
  }
  return shots;
}

await fs.mkdir(OUT_ROOT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const liveContext = await browser.newContext({ viewport: VIEWPORT });
const localContext = await browser.newContext({ viewport: VIEWPORT });
const livePage = await liveContext.newPage();
const localPage = await localContext.newPage();

try {
  await livePage.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await localPage.goto(LOCAL_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await livePage.waitForTimeout(4500);
  await localPage.waitForTimeout(2500);

  const localBounds = await getLocalSectionBounds(localPage);

  const liveFullPath = path.join(OUT_ROOT, 'live-full.png');
  const localFullPath = path.join(OUT_ROOT, 'local-full.png');
  await livePage.screenshot({ path: liveFullPath, fullPage: true });
  await localPage.screenshot({ path: localFullPath, fullPage: true });

  const liveFull = PNG.sync.read(await fs.readFile(liveFullPath));
  const localFull = PNG.sync.read(await fs.readFile(localFullPath));

  const sections = [];
  for (const section of SECTION_CONFIG) {
    const bounds = localBounds[section.key];
    if (!bounds) continue;
    const y0 = bounds.y;
    const y1 = bounds.y + bounds.h;
    const liveSlice = pngFromSlice(liveFull, y0, y1);
    const localSlice = pngFromSlice(localFull, y0, y1);
    const diff = diffRatio(liveSlice, localSlice);
    const diffPath = path.join(OUT_ROOT, `diff-${section.key}.png`);
    await fs.writeFile(diffPath, PNG.sync.write(diff.diffPng));
    sections.push({
      section: section.key,
      checkpoints: [
        {
          name: 'default',
          mismatchRatio: diff.ratio,
          mismatchPixels: diff.mismatchPixels,
          totalPixels: diff.totalPixels,
          diff: diffPath
        }
      ]
    });
  }

  const liveAnchorY = await getAnchorY(livePage, 'INDUSTRIES');
  const localAnchorY = await getAnchorY(localPage, 'INDUSTRIES');
  if (liveAnchorY != null && localAnchorY != null) {
    const liveShots = await captureAnchorOffsetShots(livePage, liveAnchorY, INDUSTRIES_OFFSETS, 'live-industries');
    const localShots = await captureAnchorOffsetShots(localPage, localAnchorY, INDUSTRIES_OFFSETS, 'local-industries');

    const checkpoints = [];
    for (const off of INDUSTRIES_OFFSETS) {
      const liveShot = liveShots.find((s) => s.offset === off);
      const localShot = localShots.find((s) => s.offset === off);
      const livePng = PNG.sync.read(await fs.readFile(liveShot.file));
      const localPng = PNG.sync.read(await fs.readFile(localShot.file));
      const diff = diffRatio(livePng, localPng);
      const diffPath = path.join(OUT_ROOT, `diff-industries-off${off}.png`);
      await fs.writeFile(diffPath, PNG.sync.write(diff.diffPng));
      checkpoints.push({
        name: `offset-${off}`,
        mismatchRatio: diff.ratio,
        mismatchPixels: diff.mismatchPixels,
        totalPixels: diff.totalPixels,
        diff: diffPath
      });
    }

    const industries = sections.find((s) => s.section === 'industries');
    if (industries) {
      industries.checkpoints = checkpoints;
      industries.anchor = { liveAnchorY, localAnchorY };
    }
  }

  for (const row of sections) {
    row.worstMismatchRatio = Math.max(...row.checkpoints.map((c) => c.mismatchRatio));
    row.status = row.worstMismatchRatio <= PASS_THRESHOLD ? 'PASS' : 'FAIL';
    row.frozenEligible = row.status === 'PASS';
  }

  const report = {
    scope: 'desktop-home',
    threshold: PASS_THRESHOLD,
    generatedAt: new Date().toISOString(),
    sections
  };

  await fs.writeFile(path.join(OUT_ROOT, 'report.json'), JSON.stringify(report, null, 2));

  let md = '# Section Parity Report (Desktop /)\n\n';
  md += `Threshold: <= ${PASS_THRESHOLD.toFixed(2)}% per section checkpoint\n\n`;
  md += '| Section | Status | Worst % | Checkpoints |\n';
  md += '| --- | --- | ---: | --- |\n';
  for (const row of sections) {
    const details = row.checkpoints.map((c) => `${c.name}: ${c.mismatchRatio.toFixed(2)}%`).join('<br>');
    md += `| ${row.section} | ${row.status} | ${row.worstMismatchRatio.toFixed(2)} | ${details} |\n`;
  }
  await fs.writeFile(path.join(OUT_ROOT, 'report.md'), md);

  const fails = sections.filter((s) => s.status === 'FAIL').length;
  console.log(`Section parity complete: ${sections.length - fails} PASS / ${fails} FAIL`);
  if (fails > 0) {
    process.exitCode = 2;
  }
} finally {
  await liveContext.close();
  await localContext.close();
  await browser.close();
}
