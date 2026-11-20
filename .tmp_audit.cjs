// .tmp_audit.cjs — structural integrity audit: syntax checks, asset refs, duplicate IDs
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = process.cwd();
const out = { jsSyntax: [], inlineScripts: [], assetRefs: [], dupIds: [] };

function walk(dir, skip) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const e of entries) {
    if (skip.includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, skip);
    else if (/\.(js|cjs|mjs)$/i.test(e.name)) out.jsSyntax.push(p);
  }
}
walk(ROOT, ['.git', 'node_modules', 'dist', 'public', 'test-results', '.vercel', 'lms']);
// also lms/js and lms root js (not lib)
walk(path.join(ROOT, 'lms'), ['lib', 'fonts', 'images', 'img', 'assets', 'node_modules']);

const tmpDir = path.join(process.env.TEMP || ROOT, 'opencode', 'audit_inline');
fs.mkdirSync(tmpDir, { recursive: true });
let ti = 0;
function checkFile(file) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); return null; }
  catch (e) { return (e.stderr ? e.stderr.toString() : e.message).split('\n').slice(0, 4).join(' | '); }
}
const results = [];
for (const f of out.jsSyntax) {
  const err = checkFile(f);
  results.push({ file: path.relative(ROOT, f), ok: !err, err });
}
out.jsSyntax = results.filter(r => !r.ok).concat(results.filter(r => r.ok).slice(0, 0));
out.jsSyntaxSummary = { total: results.length, failures: results.filter(r => !r.ok).length };

for (const htmlFile of ['index.html', path.join('lms', 'index.html')]) {
  const src = fs.readFileSync(path.join(ROOT, htmlFile), 'utf8');
  const re = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, idx = 0;
  const lineOf = (pos) => src.slice(0, pos).split('\n').length;
  while ((m = re.exec(src))) {
    if (!m[1] || !m[1].trim()) continue;
    idx++; ti++;
    const f = path.join(tmpDir, `inline_${ti}.js`);
    fs.writeFileSync(f, m[1]);
    const err = checkFile(f);
    if (err) out.inlineScripts.push({ file: htmlFile, line: lineOf(m.index), err: err.slice(0, 300) });
  }
  out.inlineScripts.push({ file: htmlFile, note: `${idx} inline scripts checked` });

  // asset references
  const refs = new Set();
  const attrRe = /(?:src|href)\s*=\s*["']([^"'#?]+)["']/g;
  while ((m = attrRe.exec(src))) {
    const v = m[1];
    if (/^(https?:|data:|mailto:|tel:|#|\/\/)/i.test(v)) continue;
    refs.add(v.replace(/^\//, ''));
  }
  for (const r of refs) {
    if (!/\.(js|css|png|jpe?g|svg|webp|ico|woff2?|json|html|mp4|png)$/i.test(r)) continue;
    if (!fs.existsSync(path.join(ROOT, r))) out.assetRefs.push({ file: htmlFile, missing: r });
  }

  // duplicate ids
  const idRe = /\sid\s*=\s*["']([^"']+)["']/g;
  const seen = new Map();
  while ((m = idRe.exec(src))) {
    const id = m[1];
    if (!seen.has(id)) seen.set(id, { count: 0, first: lineOf(m.index) });
    seen.get(id).count++;
  }
  for (const [id, v] of seen) if (v.count > 1) out.dupIds.push({ file: htmlFile, id, count: v.count, firstLine: v.first });
}
console.log(JSON.stringify(out, null, 1));
