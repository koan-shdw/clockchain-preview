/* Hero background: close-up wireframe Earth, slow spin, faint accent lines
   fading at the edges. Canvas 2D, no dependencies. Land outlines from the
   same world-atlas TopoJSON Jim's globe uses; falls back to graticule only
   if the fetch fails. */
(function(){
  var canvas = document.getElementById('hero-earth');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- camera / layout ---- */
  var CAM_D = 1.45;        /* camera distance from sphere centre (R = 1): close = strong perspective */
  var SPIN = 0.05;         /* radians per second */
  var TILT = -0.42;        /* lean the pole toward the viewer */
  var landSegs = null;

  var W = 0, H = 0, DPR = 1, S = 0, CX = 0, CY = 0;
  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    /* sphere fills most of the hero, centre pushed low-right so the
       upper-left curve sweeps across the section */
    S = Math.max(W, H) * 0.72;
    CX = W * 0.6;
    CY = H * 0.55;
  }

  function accent(){
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00cc00';
  }

  /* lat/lon (deg) -> unit sphere */
  function toXYZ(lat, lon){
    var la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
  }

  /* rotate around Y (spin), then X (tilt); camera looks down +Z */
  function project(p, rot, out){
    var cr = Math.cos(rot), sr = Math.sin(rot);
    var x = p[0] * cr + p[2] * sr;
    var z = -p[0] * sr + p[2] * cr;
    var ct = Math.cos(TILT), st = Math.sin(TILT);
    var y = p[1] * ct - z * st;
    z = p[1] * st + z * ct;
    /* visible-hemisphere test for a perspective camera at distance d */
    if(z < 1 / CAM_D) { out[2] = 0; return out; }
    var k = S / (CAM_D - z);
    out[0] = CX + x * k;
    out[1] = CY - y * k;
    out[2] = 1;
    return out;
  }

  function strokeSegs(segs, rot, alpha){
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    var a = [0,0,0];
    for(var i = 0; i < segs.length; i++){
      var seg = segs[i], pen = false;
      for(var j = 0; j < seg.length; j++){
        project(seg[j], rot, a);
        if(a[2]){
          if(pen) ctx.lineTo(a[0], a[1]);
          else { ctx.moveTo(a[0], a[1]); pen = true; }
        } else pen = false;
      }
    }
    ctx.stroke();
  }

  /* ---- graticule ---- */
  var grat = [];
  (function(){
    var lat, lon, line;
    for(lon = -180; lon < 180; lon += 10){
      line = [];
      for(lat = -90; lat <= 90; lat += 2) line.push(toXYZ(lat, lon));
      grat.push(line);
    }
    for(lat = -80; lat <= 80; lat += 10){
      line = [];
      for(lon = -180; lon <= 180; lon += 2) line.push(toXYZ(lat, lon));
      grat.push(line);
    }
  })();

  /* ---- land outlines: decode world-atlas TopoJSON arcs ---- */
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
    .then(function(r){ return r.json(); })
    .then(function(topo){
      var tr = topo.transform, sc = tr.scale, tl = tr.translate;
      landSegs = topo.arcs.map(function(arc){
        var x = 0, y = 0;
        return arc.map(function(d){
          x += d[0]; y += d[1];
          return toXYZ(y * sc[1] + tl[1], x * sc[0] + tl[0]);
        });
      });
    })
    .catch(function(){ /* graticule-only fallback */ });

  /* ---- edge fade ---- */
  function fade(){
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-in';
    var g = ctx.createRadialGradient(W * 0.55, H * 0.5, 0, W * 0.55, H * 0.5, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.92)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  function draw(rot){
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = accent();
    strokeSegs(grat, rot, 0.18);
    if(landSegs) strokeSegs(landSegs, rot, 0.42);
    fade();
  }

  /* ---- loop: fixed viewport backdrop, pause only when the tab is hidden ---- */
  var running = false, raf = null, t0 = null, rot0 = 0.6;
  function frame(t){
    if(t0 === null) t0 = t;
    draw(rot0 + (t - t0) / 1000 * SPIN);
    raf = running ? requestAnimationFrame(frame) : null;
  }
  function setRunning(on){
    on = on && !document.hidden && !reduceMotion;
    if(on === running) return;
    running = on;
    if(on){ t0 = null; rot0 += 0.0001; raf = requestAnimationFrame(frame); }
    else if(raf){ cancelAnimationFrame(raf); raf = null; }
  }

  document.addEventListener('visibilitychange', function(){ setRunning(true); });
  window.addEventListener('resize', function(){ resize(); if(!running) draw(rot0); });

  resize();
  if(reduceMotion){ draw(rot0); setTimeout(function(){ draw(rot0); }, 1500); /* redraw once land arrives */ }
  else setRunning(true);
  /* first land paint if animation is off-screen at load */
  setTimeout(function(){ if(!running) draw(rot0); }, 1500);
})();
