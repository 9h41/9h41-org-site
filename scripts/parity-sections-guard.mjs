import fs from 'node:fs/promises';
import path from 'node:path';

const reportPath = path.join('parity', 'sections', 'report.json');
const freezePath = path.join('parity', 'sections', 'frozen.json');

const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
const frozen = JSON.parse(await fs.readFile(freezePath, 'utf8'));

const current = new Map(report.sections.map((s) => [s.section, s]));
const violations = [];

for (const item of frozen.sections || []) {
  const row = current.get(item.section);
  if (!row) {
    violations.push({
      section: item.section,
      reason: 'missing-in-current-report'
    });
    continue;
  }
  if (row.worstMismatchRatio > report.threshold) {
    violations.push({
      section: item.section,
      worstMismatchRatio: row.worstMismatchRatio,
      threshold: report.threshold,
      reason: 'exceeds-threshold'
    });
  }
}

if (violations.length > 0) {
  console.error(JSON.stringify({ status: 'FAIL', violations }, null, 2));
  process.exit(2);
}

console.log('Frozen section guard passed.');
