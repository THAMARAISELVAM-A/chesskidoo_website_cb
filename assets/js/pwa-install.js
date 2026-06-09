/* assets/js/pwa-install.js
   Shows a friendly "Install App" button so users can add ChessKidoo to their
   home screen / desktop. Uses the standard beforeinstallprompt flow on
   Chrome/Edge/Android, and a tap-for-instructions fallback on iOS Safari
   (which doesn't fire that event). Hides itself once installed or dismissed. */

(function () {
  let deferredPrompt = null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true;

  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  if (isStandalone()) return;                       // already installed → nothing to do
  try { if (localStorage.getItem('ck_pwa_dismissed') === '1') var dismissed = true; } catch (e) {}

  function makeButton() {
    if (document.getElementById('ckInstallBtn')) return document.getElementById('ckInstallBtn');
    const wrap = document.createElement('div');
    wrap.id = 'ckInstallBtn';
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('aria-label', 'Install ChessKidoo app');
    wrap.style.cssText = [
      'position:fixed', 'left:20px', 'bottom:24px', 'z-index:9000',
      'display:none', 'align-items:center', 'gap:8px',
      'padding:10px 15px', 'border-radius:999px', 'cursor:pointer',
      'background:linear-gradient(135deg,#f3cd6b,#D97706)', 'color:#0c1322',
      'font-family:Inter,system-ui,sans-serif', 'font-weight:800', 'font-size:0.86rem',
      'box-shadow:0 8px 24px rgba(0,0,0,0.35)', 'border:none',
      'transition:transform .15s ease,opacity .15s ease'
    ].join(';');
    wrap.innerHTML =
      '<span style="font-size:1.05rem;line-height:1;">📥</span>' +
      '<span>Install App</span>' +
      '<span id="ckInstallX" title="Dismiss" style="margin-left:4px;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:rgba(12,19,34,0.18);font-size:0.95rem;">×</span>';
    wrap.onmouseenter = () => { wrap.style.transform = 'translateY(-2px)'; };
    wrap.onmouseleave = () => { wrap.style.transform = 'none'; };
    document.body.appendChild(wrap);

    wrap.addEventListener('click', async (e) => {
      if (e.target && e.target.id === 'ckInstallX') {       // dismiss
        e.stopPropagation();
        hide();
        try { localStorage.setItem('ck_pwa_dismissed', '1'); } catch (_) {}
        return;
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (_) {}
        deferredPrompt = null;
        hide();
      } else if (isIOS()) {
        showIOSHelp();
      }
    });
    return wrap;
  }

  function show() { if (dismissed) return; const b = makeButton(); b.style.display = 'flex'; }
  function hide() { const b = document.getElementById('ckInstallBtn'); if (b) b.style.display = 'none'; }

  function showIOSHelp() {
    const msg = 'To install: tap the Share button, then "Add to Home Screen".';
    if (window.CK && CK.showToast) CK.showToast('📲 ' + msg, 'info');
    else alert(msg);
  }

  // Chrome / Edge / Android
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    show();
  });

  window.addEventListener('appinstalled', () => {
    hide();
    deferredPrompt = null;
    if (window.CK && CK.showToast) CK.showToast('✅ ChessKidoo installed! Open it from your home screen.', 'success');
  });

  // iOS Safari never fires beforeinstallprompt — surface the button after load
  // so iPhone/iPad users still get install guidance.
  window.addEventListener('load', () => {
    setTimeout(() => { if (isIOS() && !isStandalone()) show(); }, 2500);
  });
})();
