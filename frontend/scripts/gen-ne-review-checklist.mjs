// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Generates docs/superpowers/specs/ne-review-checklist.md — a human review
// checklist pairing every AI-drafted Nepali (नेपाली) translation value with
// its English source, grouped by namespace. Re-run after editing locale files:
//   node frontend/scripts/gen-ne-review-checklist.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const enPath = resolve(repoRoot, 'frontend/locales/en.json');
const nePath = resolve(repoRoot, 'frontend/locales/ne.json');
const outPath = resolve(repoRoot, 'docs/superpowers/specs/ne-review-checklist.md');

const en = JSON.parse(readFileSync(enPath, 'utf8'));
const ne = JSON.parse(readFileSync(nePath, 'utf8'));

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

const flatEn = flatten(en);
const flatNe = flatten(ne);

// Group by first two path segments (e.g. "student.dashboard").
const groups = new Map();
for (const key of Object.keys(flatNe)) {
  const parts = key.split('.');
  const g = parts.length <= 2 ? parts[0] : `${parts[0]}.${parts[1]}`;
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(key);
}

const esc = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const total = Object.keys(flatNe).length;
const lines = [];
lines.push('# Nepali (नेपाली) Translation Review Checklist');
lines.push('');
lines.push('> **Auto-generated** by `frontend/scripts/gen-ne-review-checklist.mjs`. Do not edit by hand — re-run the generator after changing locale files.');
lines.push('');
lines.push('Every Nepali value below was AI-drafted and needs a native-speaker check. Review each row against its English source, then tick the box. Flag awkward, incorrect, or context-wrong translations and fix them in `frontend/locales/ne.json`.');
lines.push('');
lines.push(`- **Total keys to review:** ${total}`);
lines.push(`- **Namespaces:** ${groups.size}`);
lines.push(`- **Source of truth:** \`frontend/locales/ne.json\` (English reference: \`frontend/locales/en.json\`)`);
lines.push('');
lines.push('## Progress by namespace');
lines.push('');
lines.push('| Namespace | Keys |');
lines.push('| --- | --- |');
for (const g of [...groups.keys()].sort()) {
  lines.push(`| \`${g}\` | ${groups.get(g).length} |`);
}
lines.push('');

for (const g of [...groups.keys()].sort()) {
  lines.push(`## \`${g}\``);
  lines.push('');
  lines.push('| ✓ | Key | English | नेपाली |');
  lines.push('| --- | --- | --- | --- |');
  for (const key of groups.get(g).sort()) {
    const enVal = flatEn[key] !== undefined ? esc(flatEn[key]) : '_(missing)_';
    const neVal = esc(flatNe[key]);
    lines.push(`| [ ] | \`${key}\` | ${enVal} | ${neVal} |`);
  }
  lines.push('');
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${outPath} — ${total} keys across ${groups.size} namespaces.`);
