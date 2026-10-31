// Checks the content rules that a browser test can't see:
//  1. every claim ID used in the deck (claims: [...] in slides and lines) and in JOKES.md exists in CLAIMS.md
//  2. every line in src/content/lines.js says who wrote it (by: 'saman' | 'draft')
//  3. every Japanese string in the deck source is listed in JP_REVIEW.md
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const deck = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repo = path.dirname(deck);
const read = (p) => readFileSync(p, 'utf8');
const errors = [];

const claimIds = new Set([...read(path.join(repo, 'CLAIMS.md')).matchAll(/^\| ([A-L]\d+) \|/gm)].map((m) => m[1]));

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(jsx?|css)$/.test(f) ? [p] : [];
  });
}
const sources = files(path.join(deck, 'src'));

// 1. claim IDs
const used = new Map(); // id → where
for (const file of sources) {
  for (const m of read(file).matchAll(/claims:\s*\[([^\]]*)\]/g)) {
    for (const id of m[1].matchAll(/'([A-Z]\d+)'/g)) used.set(id[1], path.relative(repo, file));
  }
}
const jokes = read(path.join(repo, 'JOKES.md'));
for (const row of jokes.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Trope') && !l.startsWith('|---'))) {
  const col = row.split('|')[2] || '';
  for (const id of col.matchAll(/\b([A-L]\d{1,2})\b/g)) used.set(id[1], 'JOKES.md');
}
for (const [id, where] of used) if (!claimIds.has(id)) errors.push(`claim ${id} (used in ${where}) is not in CLAIMS.md`);

// 2. authorship of lines
const lines = read(path.join(deck, 'src/content/lines.js'));
for (const m of lines.matchAll(/^\s{2}(\w+): \{([^]*?)\n?\s*\},?$/gm)) {
  if (!/by: '(saman|draft)'/.test(m[2])) errors.push(`line "${m[1]}" has no by: 'saman' | 'draft'`);
}

// 3. Japanese strings
const jp = read(path.join(repo, 'JP_REVIEW.md'));
const seen = new Set();
for (const file of sources) {
  for (const m of read(file).matchAll(/[぀-ヿ㐀-鿿]+/g)) {
    if (!jp.includes(m[0])) errors.push(`Japanese "${m[0]}" in ${path.relative(repo, file)} is not in JP_REVIEW.md`);
    seen.add(m[0]);
  }
}

console.log(`claim IDs in CLAIMS.md: ${claimIds.size}; used in deck/JOKES.md: ${[...used.keys()].sort().join(', ')}`);
console.log(`Japanese strings in deck: ${[...seen].join(' · ')}`);
if (errors.length) {
  console.error(`\nFAILED:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('\nOK: all claim IDs exist, all lines have an author, all Japanese strings are listed.');
