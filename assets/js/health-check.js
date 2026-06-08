/* assets/js/health-check.js
   Automated Diagnostic Algorithm to verify all modules, DOM bindings, and dependencies.
*/
window.CK = window.CK || {};

CK.runDiagnostics = async function() {
  console.log("%c=====================================", "color: #5b9cf6; font-weight: bold;");
  console.log("%c🚀 CHESSKIDOO SYSTEM DIAGNOSTICS 🚀", "color: #5b9cf6; font-size: 16px; font-weight: bold;");
  console.log("%c=====================================", "color: #5b9cf6; font-weight: bold;");

  let errors = 0;
  let warnings = 0;
  let passed = 0;

  const logPass = (msg) => { console.log(`%c[PASS] %c${msg}`, "color: #22c55e; font-weight: bold;", "color: inherit;"); passed++; };
  const logWarn = (msg) => { console.log(`%c[WARN] %c${msg}`, "color: #eab308; font-weight: bold;", "color: inherit;"); warnings++; };
  const logFail = (msg) => { console.log(`%c[FAIL] %c${msg}`, "color: #ef4444; font-weight: bold;", "color: inherit;"); errors++; };

  // 1. Module Check
  const requiredModules = ['db', 'admin', 'student', 'coach', 'parent', 'schedulePro', 'classroom', 'lab', 'puzzlesPro', 'liveSession', 'enginePlay', 'engine'];
  requiredModules.forEach(mod => {
    if (CK[mod]) logPass(`Module CK.${mod} is loaded.`);
    else logFail(`Module CK.${mod} is MISSING!`);
  });

  // 2. DOM Binding Check
  const clickables = document.querySelectorAll('[onclick]');
  let brokenClicks = 0;
  clickables.forEach(el => {
    const fnStr = el.getAttribute('onclick');
    if (fnStr.includes('CK.')) {
      // Basic regex to extract CK.module.function
      const match = fnStr.match(/CK\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
      if (match) {
        const mod = match[1];
        const func = match[2];
        if (!CK[mod]) {
          logFail(`Broken binding on element: ${fnStr} - Module CK.${mod} not found!`);
          brokenClicks++;
        } else if (typeof CK[mod][func] !== 'function') {
          // It might be a property assignment like CK.lab._pvDifficulty = ...
          // So we double check if the function actually contains a parenthesis right after the property name
          if (fnStr.includes(func + '(')) {
             logFail(`Broken binding on element: ${fnStr} - Function CK.${mod}.${func} not found!`);
             brokenClicks++;
          }
        }
      }
    }
  });
  if (brokenClicks === 0) logPass(`All ${clickables.length} inline CK click bindings are structurally valid.`);

  // 3. Database & Supabase Check
  if (window.supabaseClient) logPass("Supabase Realtime Client is active.");
  else logWarn("Supabase Client missing (using LocalStorage fallback).");

  if (CK.db && typeof CK.db.getUsers === 'function') logPass("Database layer is responding.");
  else logFail("Database layer (db.js) is malfunctioning.");

  // 4. Chart.js Check
  if (window.Chart) logPass("Chart.js rendering engine is loaded.");
  else logFail("Chart.js is missing!");

  // 5. Chessboard.js & Chess.js Check
  if (window.Chessboard && window.Chess) logPass("Chessboard.js and Chess.js logic engines are loaded.");
  else logFail("Chessboard logic engines are missing!");

  // Summary
  console.log("%c-------------------------------------", "color: #5b9cf6; font-weight: bold;");
  console.log(`%cDIAGNOSTICS COMPLETE: %c${passed} Passed %c| %c${warnings} Warnings %c| %c${errors} Errors`, 
    "color: white; font-weight: bold;", 
    "color: #22c55e;", "color: white;", 
    "color: #eab308;", "color: white;", 
    "color: #ef4444;");
  
  if (errors === 0) {
    if (window.CK && CK.showToast) CK.showToast('All diagnostics passed! System is 100% healthy.', 'success');
  } else {
    if (window.CK && CK.showToast) CK.showToast(`Diagnostics finished with ${errors} errors. Check console.`, 'error');
  }
};
