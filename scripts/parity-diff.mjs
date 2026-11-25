import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { routes, viewports } from './parity-config.mjs';

const report = [];
await fsPromises.mkdir(path.join('parity', 'diff', 'desktop'), { recursive: true });
await fsPromises.mkdir(path.join('parity', 'diff', 'mobile'), { recursive: true });

for (const device of Object.keys(viewports)) {
  for (const route of routes) {
    const basePath = path.join('parity', 'baseline', device, `${route.slug}.png`);
    const currentPath = path.join('parity', 'current', device, `${route.slug}.png`);
    const diffPath = path.join('parity', 'diff', device, `${route.slug}.png`);

    const basePng = PNG.sync.read(fs.readFileSync(basePath));
    const currentPng = PNG.sync.read(fs.readFileSync(currentPath));

    const width = Math.min(basePng.width, currentPng.width);
    const height = Math.min(basePng.height, currentPng.height);

    const baseCropped = new PNG({ width, height });
    const currentCropped = new PNG({ width, height });
    PNG.bitblt(basePng, baseCropped, 0, 0, width, height, 0, 0);
    PNG.bitblt(currentPng, currentCropped, 0, 0, width, height, 0, 0);

    const diff = new PNG({ width, height });
    const mismatch = pixelmatch(baseCropped.data, currentCropped.data, diff.data, width, height, {
      threshold: 0.1,
      includeAA: false
    });

    const total = width * height;
    const ratio = (mismatch / total) * 100;
    const status = ratio > 5 ? 'FAIL' : ratio >= 2 ? 'WARN' : 'PASS';

    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    report.push({ device, path: route.path, slug: route.slug, mismatchPixels: mismatch, totalPixels: total, mismatchRatio: ratio, status });
  }
}

await fsPromises.writeFile(path.join('parity', 'report.json'), JSON.stringify(report, null, 2));

let md = '# Visual Parity Report\n\n';
md += '| Device | Route | Status | Mismatch % | Baseline | Current | Diff |\n';
md += '| --- | --- | --- | ---: | --- | --- | --- |\n';
for (const row of report) {
  md += `| ${row.device} | ${row.path} | ${row.status} | ${row.mismatchRatio.toFixed(2)} | [baseline](./baseline/${row.device}/${row.slug}.png) | [current](./current/${row.device}/${row.slug}.png) | [diff](./diff/${row.device}/${row.slug}.png) |\n`;
}

const failCount = report.filter((r) => r.status === 'FAIL').length;
const warnCount = report.filter((r) => r.status === 'WARN').length;
const passCount = report.filter((r) => r.status === 'PASS').length;
md += `\nSummary: ${passCount} PASS, ${warnCount} WARN, ${failCount} FAIL.\n`;

await fsPromises.writeFile(path.join('parity', 'report.md'), md);

if (failCount > 0) {
  console.error(`Parity hard-fail: ${failCount} page(s) above 5% mismatch.`);
  process.exit(2);
}
