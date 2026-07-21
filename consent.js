/* Clockchain cookie consent + Google Analytics gating.
   ------------------------------------------------------------------
   Builds the consent banner on any page that includes this script, and
   loads Google Analytics (window.CC_GA_ID) only when consent allows it.

   Behaviour by region (best-effort client-side geo via time zone):
   - EEA / UK / Switzerland: opt-in. Analytics stays OFF until the visitor
     accepts. Full banner with Accept all / Reject / Customize.
   - Everywhere else: analytics loads by default, with a slim notice that
     still lets the visitor reject or open settings.

   Production note: client-side geo is approximate. For a hard compliance
   guarantee, resolve region server-side (Cloudflare request.cf.country or
   an IP geo header) and pass it in as window.CC_REGION = 'gated' | 'other'.
   ------------------------------------------------------------------ */
(function(){
  var GA_ID = window.CC_GA_ID || null;
  var STORE = 'cc-consent-v1';

  /* ---- region ---- */
  var GATED_TZ = [
    'Europe/', 'Atlantic/Reykjavik', 'Atlantic/Canary', 'Atlantic/Madeira', 'Atlantic/Azores'
  ];
  function detectRegion(){
    if(window.CC_REGION) return window.CC_REGION;
    try{
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      for(var i=0;i<GATED_TZ.length;i++){
        if(tz.indexOf(GATED_TZ[i]) === 0 || tz === GATED_TZ[i]) return 'gated';
      }
    }catch(e){}
    return 'other';
  }
  var region = detectRegion();

  /* ---- storage ---- */
  function readConsent(){
    try{ return JSON.parse(localStorage.getItem(STORE) || 'null'); }catch(e){ return null; }
  }
  function saveConsent(obj){
    try{ localStorage.setItem(STORE, JSON.stringify(obj)); }catch(e){}
  }

  /* ---- Google Analytics ---- */
  var gaLoaded = false;
  function loadGA(){
    if(gaLoaded || !GA_ID) return;
    gaLoaded = true;
    window['ga-disable-' + GA_ID] = false;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  }
  function disableGA(){
    if(GA_ID) window['ga-disable-' + GA_ID] = true;
  }

  /* ---- banner ---- */
  var banner;
  function buildBanner(){
    banner = document.createElement('div');
    banner.className = 'cc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<div class="cc-title">Cookies on Clockchain</div>'
      + '<div class="cc-text">We use strictly necessary cookies to run the site, and analytics cookies to understand usage. '
      + 'Read our <a href="' + rel('cookie.html') + '">Cookie Policy</a> and <a href="' + rel('privacy.html') + '">Privacy Policy</a>.</div>'
      + '<div class="cc-cats">'
      + '<label class="cc-cat"><input type="checkbox" checked disabled /><span><b>Strictly necessary</b> — always on. Security, navigation, and consent storage.</span></label>'
      + '<label class="cc-cat"><input type="checkbox" id="cc-analytics" /><span><b>Analytics</b> — Google Analytics, helps us measure and improve the site.</span></label>'
      + '</div>'
      + '<div class="cc-actions">'
      + '<button class="cc-btn primary" data-cc="accept">Accept all</button>'
      + '<button class="cc-btn" data-cc="reject">Reject non-essential</button>'
      + '<button class="cc-btn link" data-cc="customize">Customize</button>'
      + '<button class="cc-btn primary" data-cc="save" style="display:none">Save preferences</button>'
      + '</div>';
    document.body.appendChild(banner);

    banner.addEventListener('click', function(e){
      var act = e.target.getAttribute('data-cc');
      if(!act) return;
      if(act === 'accept'){ apply({analytics:true}); hide(); }
      else if(act === 'reject'){ apply({analytics:false}); hide(); }
      else if(act === 'customize'){
        banner.classList.add('customizing');
        banner.querySelector('[data-cc="customize"]').style.display = 'none';
        banner.querySelector('[data-cc="save"]').style.display = '';
      }
      else if(act === 'save'){
        apply({analytics: banner.querySelector('#cc-analytics').checked });
        hide();
      }
    });
  }
  function show(){ if(banner) banner.classList.add('show'); }
  function hide(){ if(banner) banner.classList.remove('show'); }

  function apply(consent){
    consent.ts = Date.now();
    consent.region = region;
    saveConsent(consent);
    if(consent.analytics) loadGA(); else disableGA();
  }

  /* resolve a root-level page path from the current location (handles /app/ etc) */
  function rel(page){
    var path = location.pathname;
    var depth = (path.replace(/\/[^\/]*$/, '/').match(/\//g) || []).length;
    // count directories below the site root: find the repo base is hard on GH Pages,
    // so use a simple relative climb from current file depth within the site.
    var segs = path.split('/').filter(Boolean);
    // drop the filename
    if(!path.endsWith('/')) segs.pop();
    // climb out of /app or /app/docs to site root
    var up = '';
    for(var i=0;i<segs.length;i++){
      if(segs[i] === 'app' || segs[i] === 'docs'){ up += '../'; }
    }
    return up + page;
  }

  /* ---- boot ---- */
  function boot(){
    var saved = readConsent();
    if(saved){
      if(saved.analytics) loadGA(); else disableGA();
      // no banner unless reopened
    } else {
      buildBanner();
      if(region === 'other'){
        // implied consent outside gated regions: load, but let them opt out
        loadGA();
      }
      // small delay so it does not fight first paint
      setTimeout(show, 700);
    }
    // settings link, any page
    document.addEventListener('click', function(e){
      var t = e.target.closest && e.target.closest('[data-cookie-settings]');
      if(t){
        e.preventDefault();
        if(!banner) buildBanner();
        var cur = readConsent();
        var box = banner.querySelector('#cc-analytics');
        if(box) box.checked = !!(cur && cur.analytics);
        show();
      }
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
