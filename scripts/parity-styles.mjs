// Dumps, for each text block of a page, its position and typography on the live site and on the local build,
// so layout drift can be measured block by block: node scripts/parity-styles.mjs <path> [desktop|mobile]
import { chromium } from 'playwright';
import { viewports } from './parity-config.mjs';

const [route = '/', device = 'desktop'] = process.argv.slice(2);
const bases = { wix: 'https://www.9h41.org', local: 'http://127.0.0.1:8080' };
const browser = await chromium.launch({ headless: true, channel: process.env.PARITY_CHANNEL });

async function blocks(url) {
  const page = await browser.newPage({ viewport: viewports[device] });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(4000);
  const out = await page.evaluate(() => {
    const seen = new Set(), res = [];
    for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,a,button,label,span')) {
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 3 || el.closest('script,style')) continue;
      if ([...el.children].some(c => (c.innerText || '').replace(/\s+/g, ' ').trim() === text)) continue;
      const key = text.slice(0, 50);
      if (seen.has(key)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      seen.add(key);
      const cs = getComputedStyle(el);
      res.push({ key, x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height),
        font: cs.fontFamily.split(',')[0].replace(/["']/g, ''), size: cs.fontSize, lh: cs.lineHeight, weight: cs.fontWeight, color: cs.color, ls: cs.letterSpacing });
    }
    return { blocks: res, height: document.documentElement.scrollHeight };
  });
  await page.close();
  return out;
}

const wix = await blocks(bases.wix + route.replace(/\/$/, '') || bases.wix);
const local = await blocks(bases.local + route);
await browser.close();
const byKey = new Map(local.blocks.map(b => [b.key, b]));
console.log(`page height wix ${wix.height} local ${local.height}`);
for (const a of wix.blocks) {
  const b = byKey.get(a.key);
  if (!b) { console.log(`MISSING  ${a.key.slice(0, 40).padEnd(40)} x${a.x} y${a.y} ${a.w}x${a.h} ${a.font} ${a.size}/${a.lh} w${a.weight} ${a.color} ls${a.ls}`); continue; }
  if (process.env.PARITY_VERBOSE) console.log(`   wix ${a.x},${a.y} ${a.w}x${a.h} ${a.font} ${a.size}/${a.lh} ls${a.ls} | local ${b.x},${b.y} ${b.w}x${b.h} ${b.font} ${b.size}/${b.lh} ls${b.ls}`);
  const diffs = ['x', 'y', 'w', 'h'].filter(k => Math.abs(a[k] - b[k]) > 6).map(k => `${k} ${a[k]}→${b[k]}`)
    .concat(['font', 'size', 'lh', 'weight', 'color', 'ls'].filter(k => a[k] !== b[k]).map(k => `${k} ${a[k]}→${b[k]}`));
  console.log(`${diffs.length ? 'DIFF' : 'ok  '}  ${a.key.slice(0, 40).padEnd(40)} ${diffs.join(' | ')}`);
}
