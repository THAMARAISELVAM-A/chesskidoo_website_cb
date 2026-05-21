const fs = require('fs');
const jsFiles = fs.readdirSync('assets/js').filter(f => f.endsWith('.js')).sort();
const CRITICAL = ['admin.js','arena.js','student.js','coach.js','parents.js','db.js','main.js','router.js','auth.js','config.js','classes-system.js','game-tracker.js','opening-trainer.js','puzzles-pro.js','notifications.js','schedule-pro.js','arcade.js','certs.js','pgn-library.js','chessboard.js','engine.js','engine-play.js','classroom.js','reports-system.js'];
const fileMap = {};
CRITICAL.forEach(f => fileMap[f] = fs.readFileSync('assets/js/' + f, 'utf8').split('\n'));

let allIssues = [];

// Pattern 1: .toLowerCase() / .toUpperCase() without preceding null guard
function findNullGuardMisses() {
  CRITICAL.forEach(f => {
    const lines = fileMap[f];
    lines.forEach((line, i) => {
      // skip if line already has && guard
      if (!/\.(toLowerCase|toUpperCase)\(\)/.test(line)) return;
      if (/(\|\||&&|\.toString\()/.test(line)) return; // already guarded or safe branch
      // flag lines that call it directly on a property
      if (/[a-z_]+\[['"]?[a-z_]+['"]?\]\s*\.(toLowerCase|toUpperCase)\(\)/.test(line) ||
          /\w+\.(toLowerCase|toUpperCase)\(\)/.test(line)) {
        allIssues.push({f, line: i+1, type: 'null-guard', code: line.trim().slice(0,140)});
      }
    });
  });
}

// Pattern 2: innerHTML with template substitution where no _e or esc in sight
function findUnescapedHTML() {
  CRITICAL.forEach(f => {
    const lines = fileMap[f];
    lines.forEach((line, i) => {
      if (/\.innerHTML\s*=\s*\s*\`/.test(line)) {
        // has template literal — check if _e/esc is defined in scope
        const context = lines.slice(Math.max(0,i-8), i+2).join('\n');
        if (!context.includes('_e') && !context.includes('esc')) {
          allIssues.push({f, line: i+1, type: 'unescaped-html', code: line.trim().slice(0,140)});
        }
      }
    });
  });
}

// Pattern 3: inline onclick with ${ interpolation
function findInlineOnclick() {
  CRITICAL.forEach(f => {
    const lines = fileMap[f];
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) return;
      if (/onclick\s*=/.test(line) && /\$\{/.test(line)) {
        allIssues.push({f, line: i+1, type: 'inline-onclick', code: trimmed.slice(0,130)});
      }
    });
  });
}

// Pattern 4: JSON.parse without try/catch nearby
function findUnsafeJSONParse() {
  CRITICAL.forEach(f => {
    const lines = fileMap[f];
    lines.forEach((line, i) => {
      if (/JSON\.parse\(/.test(line) && !lines.slice(Math.max(0,i-2), i+5).join('\n').includes('try')) {
        allIssues.push({f, line: i+1, type: 'unsafe-json-parse', code: line.trim().slice(0,130)});
      }
    });
  });
}

// Pattern 5: event listeners without cleanup (setInterval / addEventListener not paired with clearInterval / removeEventListener)
function findLeakedListeners() {
  CRITICAL.forEach(f => {
    const code = fileMap[f].join('\n');
    const intervals = (code.match(/setInterval/g) || []).length;
    const clears = (code.match(/clearInterval/g) || []).length;
    if (intervals > 0 && clears < intervals) {
      allIssues.push({f, line: 0, type: 'setinterval-mismatch', code: `setInterval:${intervals} clearInterval:${clears}`});
    }
  });
}

findNullGuardMisses();
findUnescapedHTML();
findInlineOnclick();
findUnsafeJSONParse();
findLeakedListeners();

// Deduplicate and print
const seen = new Set();
const unique = allIssues.filter(x => {
  const k = x.f + ':' + x.line + ':' + x.type;
  if (seen.has(k)) return false; seen.add(k); return true;
});

// Group by file
const byFile = {};
unique.forEach(x => {
  if (!byFile[x.f]) byFile[x.f] = [];
  byFile[x.f].push(x);
});

for (const [f, issues] of Object.entries(byFile).sort()) {
  console.log('\n--- ' + f + ' ---');
  issues.forEach(i => {
    console.log('  L' + i.line + ' [' + i.type + ']: ' + i.code);
  });
}
console.log('\nTotal unique issues: ' + unique.length);
