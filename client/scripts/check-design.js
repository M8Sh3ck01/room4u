import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(dirname, '..', 'src');
const tokensFile = path.resolve(src, 'design', 'tokens.css');

const hexRe = /#[0-9a-fA-F]{3,8}\b/;
const lengthRe = /\b\d+(\.\d+)?(px|rem|em)\b/;

const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(css|js|jsx)$/.test(entry.name)) continue;
    if (path.resolve(full) === tokensFile) continue;
    const content = fs.readFileSync(full, 'utf8');
    if (hexRe.test(content)) violations.push(`${path.relative(src, full)} — raw color`);
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      // Lightning CSS can't resolve var() inside @media queries, so breakpoints
      // may use literal px here — they must match the --bp-* tokens.
      if (line.trim().startsWith('@media')) continue;
      if (lengthRe.test(line)) {
        violations.push(`${path.relative(src, full)} — raw px/rem/em length`);
        break;
      }
    }
  }
}

walk(src);

if (violations.length > 0) {
  console.error('Design check failed — hardcoded values outside design/tokens.css:');
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log('Design check passed: no raw colors or lengths outside design/tokens.css.');
