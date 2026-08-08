const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const EXEMPT_DIRS = [path.join(SRC, 'scripts')];

const fwd = (p) => p.split(path.sep).join('/');

const toSlash = (p) => fwd(path.relative(SRC, p));

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(p);
    return entry.name.endsWith('.js') ? [p] : [];
  });

const moduleOf = (file) => {
  const rel = toSlash(file).split('/');
  return rel[0] === 'modules' ? rel[1] : null;
};

const resolveSpec = (fromFile, spec) => {
  if (spec.startsWith('@modules/')) {
    return path.join(SRC, 'modules', spec.slice('@modules/'.length));
  }
  if (spec.startsWith('.') || spec.startsWith('/')) {
    return path.resolve(path.dirname(fromFile), spec);
  }
  return null;
};

const REQUIRED_MODEL = /\.model$/;

function checkFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const ownModule = moduleOf(file);
  const violations = [];
  const re = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = re.exec(src)) !== null) {
    const spec = match[1];
    const target = resolveSpec(file, spec);
    if (!target) continue;
    const rel = toSlash(target).replace(/\.js$/, '');
    const parts = rel.split('/');
    if (parts[0] !== 'modules') continue;
    if (!REQUIRED_MODEL.test(path.basename(rel))) continue;
    const targetModule = parts[1];
    if (targetModule === ownModule) continue;
    violations.push(
      `${fwd(path.relative(ROOT, file))} imports model '${spec}' from module '${targetModule}' (go through a service)`
    );
  }
  return violations;
}

const files = walk(SRC).filter((f) => !EXEMPT_DIRS.some((d) => f === d || f.startsWith(d + path.sep)));

const all = [];
for (const file of files) all.push(...checkFile(file));

if (all.length > 0) {
  console.error('Architecture violation: src code may not import another module\'s *.model directly.');
  console.error('Use the owning module\'s service functions instead.');
  console.error('');
  for (const v of all) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`Architecture check passed (${files.length} files scanned, no cross-module model imports).`);
