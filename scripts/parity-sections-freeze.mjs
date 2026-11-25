import fs from 'node:fs/promises';
import path from 'node:path';

const reportPath = path.join('parity', 'sections', 'report.json');
const freezePath = path.join('parity', 'sections', 'frozen.json');
const order = ['header', 'hero', 'services', 'dayline', 'industries', 'clients', 'figures', 'jobs', 'contact', 'footer'];

const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
let frozen = { threshold: report.threshold, sections: [] };

try {
  frozen = JSON.parse(await fs.readFile(freezePath, 'utf8'));
} catch {
  // First freeze run.
}

const current = new Map(report.sections.map((s) => [s.section, s]));
const nextFrozen = [];

for (const key of order) {
  const row = current.get(key);
  if (!row) break;
  if (row.worstMismatchRatio <= report.threshold) {
    nextFrozen.push({
      section: key,
      lockedWorstMismatchRatio: row.worstMismatchRatio,
      lockedAt: new Date().toISOString()
    });
  } else {
    break;
  }
}

// Preserve previously frozen sections even if they are no longer contiguous in this report.
const previous = new Map((frozen.sections || []).map((s) => [s.section, s]));
const merged = [];
for (const key of order) {
  if (nextFrozen.find((s) => s.section === key)) {
    merged.push(nextFrozen.find((s) => s.section === key));
    continue;
  }
  if (previous.has(key)) {
    merged.push(previous.get(key));
    continue;
  }
  break;
}

const output = {
  threshold: report.threshold,
  generatedFromReportAt: report.generatedAt,
  sections: merged
};

await fs.writeFile(freezePath, JSON.stringify(output, null, 2));
console.log(`Frozen sections: ${merged.map((s) => s.section).join(', ') || '(none)'}`);
