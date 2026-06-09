/* assets/js/i18n-enroll.js --------------------------------------------------
   ChessKidoo — International enrollment helpers
     • Country-code phone selector (auto-detected, 50+ countries)
     • Multi-currency price display (live rates + static fallback)

   Markup hooks (no JS wiring needed — auto-populated on load):
     <select data-ck-dialcode  name="dialCode"></select>
     <select data-ck-country    name="country"></select>
     <select data-ck-currency></select>
     <span data-inr="1500">₹1,500</span>          ← auto-converts on switch
   --------------------------------------------------------------- */

window.CK = window.CK || {};

CK.intl = (() => {
  // iso, name, dial code, flag, currency
  const COUNTRIES = [
    ['IN','India','91','🇮🇳','INR'],     ['US','United States','1','🇺🇸','USD'],
    ['GB','United Kingdom','44','🇬🇧','GBP'], ['CA','Canada','1','🇨🇦','CAD'],
    ['AU','Australia','61','🇦🇺','AUD'], ['AE','UAE','971','🇦🇪','AED'],
    ['SA','Saudi Arabia','966','🇸🇦','SAR'], ['QA','Qatar','974','🇶🇦','QAR'],
    ['KW','Kuwait','965','🇰🇼','KWD'],   ['OM','Oman','968','🇴🇲','OMR'],
    ['BH','Bahrain','973','🇧🇭','BHD'],  ['SG','Singapore','65','🇸🇬','SGD'],
    ['MY','Malaysia','60','🇲🇾','MYR'],  ['LK','Sri Lanka','94','🇱🇰','LKR'],
    ['BD','Bangladesh','880','🇧🇩','BDT'], ['NP','Nepal','977','🇳🇵','NPR'],
    ['PK','Pakistan','92','🇵🇰','PKR'],  ['NZ','New Zealand','64','🇳🇿','NZD'],
    ['DE','Germany','49','🇩🇪','EUR'],   ['FR','France','33','🇫🇷','EUR'],
    ['ES','Spain','34','🇪🇸','EUR'],     ['IT','Italy','39','🇮🇹','EUR'],
    ['NL','Netherlands','31','🇳🇱','EUR'], ['IE','Ireland','353','🇮🇪','EUR'],
    ['CH','Switzerland','41','🇨🇭','CHF'], ['SE','Sweden','46','🇸🇪','SEK'],
    ['NO','Norway','47','🇳🇴','NOK'],    ['ZA','South Africa','27','🇿🇦','ZAR'],
    ['NG','Nigeria','234','🇳🇬','NGN'],  ['KE','Kenya','254','🇰🇪','KES'],
    ['EG','Egypt','20','🇪🇬','EGP'],     ['JP','Japan','81','🇯🇵','JPY'],
    ['CN','China','86','🇨🇳','CNY'],     ['HK','Hong Kong','852','🇭🇰','HKD'],
    ['PH','Philippines','63','🇵🇭','PHP'], ['ID','Indonesia','62','🇮🇩','IDR'],
    ['TH','Thailand','66','🇹🇭','THB'],  ['VN','Vietnam','84','🇻🇳','VND'],
    ['BR','Brazil','55','🇧🇷','BRL'],    ['MX','Mexico','52','🇲🇽','MXN'],
    ['TR','Turkey','90','🇹🇷','TRY'],    ['RU','Russia','7','🇷🇺','RUB'],
    ['PL','Poland','48','🇵🇱','PLN'],    ['MU','Mauritius','230','🇲🇺','MUR'],
  ];

  // Symbols + static fallback rates (1 INR = X foreign). Refined live if online.
  const CUR = {
    INR:['₹',1],     USD:['$',0.012],  GBP:['£',0.0095], EUR:['€',0.011],
    CAD:['C$',0.016],AUD:['A$',0.018], AED:['AED ',0.044],SAR:['SAR ',0.045],
    QAR:['QAR ',0.044],KWD:['KWD ',0.0037],SGD:['S$',0.016],MYR:['RM',0.056],
    LKR:['Rs ',3.6], BDT:['৳',1.32],   NPR:['Rs ',1.6],  PKR:['Rs ',3.3],
    NZD:['NZ$',0.020],CHF:['CHF ',0.011],SEK:['kr',0.13],NOK:['kr',0.13],
    ZAR:['R',0.22],  NGN:['₦',18],     KES:['KSh',1.55], EGP:['E£',0.58],
    JPY:['¥',1.85],  CNY:['¥',0.087],  HKD:['HK$',0.094],PHP:['₱',0.68],
    IDR:['Rp',190],  THB:['฿',0.42],   VND:['₫',300],    BRL:['R$',0.066],
    MXN:['MX$',0.22],TRY:['₺',0.42],   RUB:['₽',1.1],    PLN:['zł',0.048],
    MUR:['Rs ',0.55],
  };

  let _cur = 'INR';

  function _detectIso() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (/Kolkata|Calcutta/.test(tz)) return 'IN';
      if (/Dubai/.test(tz)) return 'AE';
      if (/London/.test(tz)) return 'GB';
      if (/New_York|Chicago|Los_Angeles|Denver/.test(tz)) return 'US';
      if (/Singapore/.test(tz)) return 'SG';
      if (/Sydney|Melbourne/.test(tz)) return 'AU';
      const loc = (navigator.language || '').split('-')[1];
      if (loc && COUNTRIES.some(c => c[0] === loc)) return loc;
    } catch (e) {}
    return 'IN';
  }

  function fmt(amount, code) {
    const [sym, rate] = CUR[code] || CUR.INR;
    const val = amount * rate;
    const dp = val >= 100 ? 0 : (val >= 1 ? 2 : 2);
    const num = val.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
    return sym + num;
  }

  function applyCurrency(code) {
    _cur = CUR[code] ? code : 'INR';
    document.querySelectorAll('[data-inr]').forEach(el => {
      const inr = parseFloat(el.getAttribute('data-inr'));
      if (!isNaN(inr)) el.textContent = fmt(inr, _cur);
    });
    document.querySelectorAll('[data-ck-currency]').forEach(s => { s.value = _cur; });
  }

  async function loadRates() {
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/INR');
      if (!r.ok) return;
      const j = await r.json();
      if (j && j.rates) {
        Object.keys(CUR).forEach(code => { if (j.rates[code]) CUR[code][1] = j.rates[code]; });
        applyCurrency(_cur);
      }
    } catch (e) { /* keep static fallback */ }
  }

  function _populate() {
    const defIso = _detectIso();
    const defCountry = COUNTRIES.find(c => c[0] === defIso) || COUNTRIES[0];

    document.querySelectorAll('[data-ck-dialcode]').forEach(sel => {
      if (sel.dataset.ckReady) return; sel.dataset.ckReady = '1';
      sel.innerHTML = COUNTRIES.map(c => `<option value="+${c[2]}" data-iso="${c[0]}" ${c[0]===defIso?'selected':''}>${c[3]} +${c[2]}</option>`).join('');
    });
    document.querySelectorAll('[data-ck-country]').forEach(sel => {
      if (sel.dataset.ckReady) return; sel.dataset.ckReady = '1';
      sel.innerHTML = COUNTRIES.slice().sort((a,b)=>a[1].localeCompare(b[1]))
        .map(c => `<option value="${c[1]}" data-iso="${c[0]}" data-cur="${c[4]}" ${c[0]===defIso?'selected':''}>${c[3]} ${c[1]}</option>`).join('');
      // switching country also switches the price currency
      sel.addEventListener('change', () => {
        const opt = sel.selectedOptions[0];
        if (opt && opt.dataset.cur) applyCurrency(opt.dataset.cur);
      });
    });
    document.querySelectorAll('[data-ck-currency]').forEach(sel => {
      if (sel.dataset.ckReady) return; sel.dataset.ckReady = '1';
      sel.innerHTML = Object.keys(CUR).map(code => `<option value="${code}" ${code===defCountry[4]?'selected':''}>${CUR[code][0].trim()} ${code}</option>`).join('');
      sel.addEventListener('change', () => applyCurrency(sel.value));
    });

    applyCurrency(defCountry[4] || 'INR');
    _populateLang();
  }

  // ── Language (reuses the EN/Tamil system defined in main.js) ───────────
  const LANG_NAMES = { en: 'English', ta: 'தமிழ் (Tamil)', hi: 'हिन्दी', fr: 'Français', es: 'Español', de: 'Deutsch', ar: 'العربية' };

  function availableLanguages() {
    return (window.CK && CK.translations) ? Object.keys(CK.translations) : ['en'];
  }

  function setLanguage(code) {
    if (!window.CK) return;
    const avail = availableLanguages();
    const lang = avail.includes(code) ? code : 'en';
    CK.currentLanguage = lang;
    try { localStorage.setItem('ck_language', lang); } catch (e) {}
    if (CK.applyTranslations) CK.applyTranslations();
    document.querySelectorAll('[data-ck-lang]').forEach(s => { s.value = lang; });
  }

  // First-visit default: pick the visitor's language from their locale.
  function autoDetectLanguage() {
    if (!window.CK || !CK.translations) return;
    let saved = null;
    try { saved = localStorage.getItem('ck_language'); } catch (e) {}
    if (saved) return; // respect an explicit prior choice
    const langs = (navigator.languages || [navigator.language || 'en']).map(l => l.toLowerCase());
    const avail = availableLanguages();
    const pick = avail.find(code => langs.some(l => l === code || l.startsWith(code + '-')));
    if (pick && pick !== CK.currentLanguage) setLanguage(pick);
  }

  function _populateLang() {
    const langs = availableLanguages();
    document.querySelectorAll('[data-ck-lang]').forEach(sel => {
      // Re-render if the available language set has grown (translations load late).
      if (sel.dataset.ckReady && sel.options.length === langs.length) return;
      const cur = (window.CK && CK.currentLanguage) || 'en';
      sel.innerHTML = langs
        .map(code => `<option value="${code}" ${code===cur?'selected':''}>${LANG_NAMES[code] || code.toUpperCase()}</option>`).join('');
      if (!sel.dataset.ckReady) { sel.dataset.ckReady = '1'; sel.addEventListener('change', () => setLanguage(sel.value)); }
    });
  }

  // Combine a dial-code select + a number input into one E.164-ish string.
  function fullPhone(dial, number) {
    let n = String(number || '').replace(/[^\d]/g, '');
    n = n.replace(/^0+/, '');
    const d = String(dial || '').replace(/[^\d+]/g, '');
    if (!d) return number;
    return (d.startsWith('+') ? d : '+' + d) + n;
  }

  function _init() {
    // main.js sets up CK.translations slightly later — retry briefly.
    autoDetectLanguage();
    _populate();
    loadRates();
    if (!(window.CK && CK.translations)) setTimeout(() => { autoDetectLanguage(); _populateLang(); }, 800);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else { _init(); }

  return { COUNTRIES, applyCurrency, setLanguage, availableLanguages, fullPhone, fmt, _populate,
           get currency() { return _cur; } };
})();
