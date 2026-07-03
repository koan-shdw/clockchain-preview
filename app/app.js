/* Clockchain App shell: injected sidebar + topbar, live values, mock interactions.
   Static mockup. Live numbers run on the same simulated feed as the main site
   widget (block 36042 observed 2026-07-03 02:45:28 UTC, 1 block/second). */
(function(){
  var GENESIS = Math.floor(Date.UTC(2026, 6, 3, 2, 45, 28) / 1000) - 36042;
  var TAI_OFFSET_S = 37;
  var OFFSETS = { utc: 57, ntp: -55, system: 348 };

  function pad(n, w){ n = String(n); while(n.length < (w || 2)) n = '0' + n; return n; }
  function fmtTime(ms){
    var d = new Date(ms);
    return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
  }
  function height(ms){ return Math.floor(ms / 1000) - GENESIS; }
  function randHash(len){
    var c = '0123456789abcdef', s = '0x';
    for(var i = 0; i < (len || 12); i++) s += c[Math.floor(Math.random() * 16)];
    return s;
  }

  /* ---- shell ---- */
  var NAV = [
    { group: 'Overview', items: [
      { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>' }
    ]},
    { group: 'Services', items: [
      { id: 'logging', label: 'Logging', href: 'logging.html', icon: '<path d="M4 6h16M4 12h16M4 18h10"/>' },
      { id: 'contracts', label: 'Smart Contracts', href: 'contracts.html', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>' },
      { id: 'timestamp', label: 'Timestamp API', href: 'timestamp.html', icon: '<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 5l-2 14"/>' }
    ]},
    { group: 'Network', items: [
      { id: 'benchmarking', label: 'Live Benchmarking', href: 'benchmarking.html', icon: '<path d="M4 19V10M10 19V5M16 19v-7M21 19H3"/>' }
    ]},
    { group: 'Developers', items: [
      { id: 'docs', label: 'Docs', href: 'docs/index.html', icon: '<path d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M14 4v5h5"/>', pub: true }
    ]},
    { group: 'Account', items: [
      { id: 'account', label: 'Billing & Tokens', href: 'account.html', icon: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>' }
    ]}
  ];

  function shellPaths(){
    /* docs pages live one level down */
    return document.body.hasAttribute('data-docs') ? '../' : '';
  }

  function renderSidebar(){
    var slot = document.getElementById('sidebar');
    if(!slot) return;
    var base = shellPaths();
    var active = document.body.getAttribute('data-nav');
    var h = '<div class="sb-logo"><a href="' + base + '../index.html"><img src="' + base + '../assets/clockchain-logo-full.png" alt="Clockchain" /></a></div>';
    NAV.forEach(function(g){
      h += '<div class="sb-group"><div class="sb-group-label">' + g.group + '</div>';
      g.items.forEach(function(it){
        h += '<a class="sb-link' + (it.id === active ? ' active' : '') + '" href="' + base + it.href + '">'
          + '<svg viewBox="0 0 24 24" aria-hidden="true">' + it.icon + '</svg>' + it.label
          + (it.pub ? '<span class="sb-pub">Public</span>' : '') + '</a>';
      });
      h += '</div>';
    });
    h += '<div class="sb-foot">'
      + '<div class="sb-user"><span class="sb-avatar">AM</span><span><span class="sb-user-name">Alexander Mitchell</span><br/><span class="sb-user-mail">alexander@example.com</span></span></div>'
      + '<button class="sb-signout" onclick="location.href=\'' + base + 'login.html\'">Sign out</button>'
      + '</div>';
    slot.innerHTML = h;
  }

  function renderTopbar(){
    var slot = document.getElementById('topbar');
    if(!slot) return;
    var title = slot.getAttribute('data-title') || '';
    var base = shellPaths();
    var active = document.body.getAttribute('data-nav');
    var opts = '';
    NAV.forEach(function(g){ g.items.forEach(function(it){
      opts += '<option value="' + base + it.href + '"' + (it.id === active ? ' selected' : '') + '>' + it.label + '</option>';
    }); });
    slot.innerHTML =
      '<div class="tb-title">' + title + ' <span class="net-badge">Testnet</span></div>'
      + '<div class="tb-right">'
      + '<nav class="tb-mobile-nav"><select onchange="location.href=this.value" aria-label="Navigate">' + opts + '</select></nav>'
      + '<span class="tb-clock"><span class="live-dot"></span><span id="tb-time">--:--:--</span><span class="tb-h">·</span><span id="tb-height">#—</span></span>'
      + '</div>';
  }

  /* ---- live values: any [data-live] element updates each second ----
     data-live: time | height | hash | date */
  function tick(){
    var ms = Date.now();
    var t = fmtTime(ms), h = '#' + height(ms).toLocaleString();
    document.querySelectorAll('[data-live]').forEach(function(el){
      var k = el.getAttribute('data-live');
      if(k === 'time') el.textContent = t;
      else if(k === 'height') el.textContent = h;
      else if(k === 'height-raw') el.textContent = height(ms).toLocaleString();
      else if(k === 'hash') el.textContent = randHash(12) + '…';
      else if(k === 'time-utc') el.textContent = t + ' UTC';
      else if(k === 'time-ntp') el.textContent = fmtTime(ms + OFFSETS.ntp);
      else if(k === 'time-sys') el.textContent = fmtTime(ms + OFFSETS.system);
      else if(k === 'time-tai') el.textContent = fmtTime(ms + TAI_OFFSET_S * 1000);
    });
    var tbT = document.getElementById('tb-time'), tbH = document.getElementById('tb-height');
    if(tbT) tbT.textContent = t;
    if(tbH) tbH.textContent = h;
  }

  /* ---- interactions ---- */
  window.ccToast = function(m){
    var e = document.getElementById('toast');
    if(!e){ e = document.createElement('div'); e.className = 'toast'; e.id = 'toast'; document.body.appendChild(e); }
    e.textContent = m; e.classList.add('show');
    clearTimeout(window.__t); window.__t = setTimeout(function(){ e.classList.remove('show'); }, 1800);
  };
  window.ccCopy = function(text, msg){
    navigator.clipboard.writeText(text).then(function(){ ccToast(msg || 'Copied'); })
      .catch(function(){ ccToast('Copy failed'); });
  };
  window.ccCopyEl = function(btn){
    var c = btn.parentElement.querySelector('code, span');
    if(c) ccCopy(c.innerText);
  };
  window.ccTab = function(id, btn){
    var tabs = btn.closest('.tabs'), box = tabs.parentElement;
    box.querySelectorAll('.tabpane').forEach(function(x){ x.hidden = true; });
    var pane = box.querySelector('#' + id);
    if(pane) pane.hidden = false;
    tabs.querySelectorAll('.tabbtn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
  };
  window.ccMock = function(msg){ ccToast(msg || 'Mockup: action simulated'); };

  renderSidebar();
  renderTopbar();
  tick();
  setInterval(tick, 1000);
})();
