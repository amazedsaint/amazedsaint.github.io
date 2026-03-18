// lab-canvas.js — Lattice animation engine
// Staged intro, translucent rendering, strong mouse response, theme-aware
(function(){
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Theme-reactive colors ──
  var C = {};
  function readColors(){
    var s = getComputedStyle(document.documentElement);
    function g(n,fb){ return s.getPropertyValue(n).trim() || fb; }
    C.bg       = g('--canvas-bg',       '#0a0a0a');
    C.dot      = g('--canvas-dot',      'rgba(255,255,255,0.12)');
    C.dotBright= g('--canvas-dot-bright','rgba(255,255,255,0.30)');
    C.line     = g('--canvas-line',     'rgba(106,169,255,0.06)');
    C.lineHot  = g('--canvas-line-hot', 'rgba(106,169,255,0.18)');
    C.flow     = g('--canvas-flow',     'rgba(155,124,255,0.04)');
    C.ascii    = g('--canvas-ascii',    'rgba(255,255,255,0.025)');
    C.trail    = g('--canvas-trail',    'rgba(10,10,10,0.12)');
  }

  // ── State ──
  var canvas, ctx, W, H, DPR;
  var mouse = { x: -9999, y: -9999, vx: 0, vy: 0, prevX: -9999, prevY: -9999 };
  var scrollY = 0, scrollMax = 1;
  var dots = [];
  var flows = [];
  var ripples = [];
  var raf = 0;
  var startTime = 0;
  var introFired = false;

  var DOT_SPACING = 48;
  var FLOW_COUNT = 10;
  var CONNECTION_DIST = 110;
  var MOUSE_INNER = 120;
  var MOUSE_OUTER = 280;

  // ── Spatial hash for O(n) connections ──
  var grid = {};
  var cellSize = CONNECTION_DIST;

  function hashKey(x, y){
    return (Math.floor(x / cellSize)) + ',' + (Math.floor(y / cellSize));
  }

  function buildGrid(){
    grid = {};
    for (var i = 0; i < dots.length; i++){
      var d = dots[i];
      var k = hashKey(d.dx || d.x, d.dy || d.y);
      if (!grid[k]) grid[k] = [];
      grid[k].push(i);
    }
  }

  function getNeighborCells(x, y){
    var cx = Math.floor(x / cellSize);
    var cy = Math.floor(y / cellSize);
    var result = [];
    for (var dx = -1; dx <= 1; dx++){
      for (var dy = -1; dy <= 1; dy++){
        var k = (cx+dx) + ',' + (cy+dy);
        if (grid[k]) result.push(grid[k]);
      }
    }
    return result;
  }

  // ── Init ──
  function setup(){
    canvas = document.getElementById('lab-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    DPR = Math.min(2, window.devicePixelRatio || 1);

    readColors();
    resize();

    if (!reduce) {
      // Tell CSS the canvas is running (delays hero text to sync with intro)
      document.documentElement.classList.add('canvas-active');
      initDots();
      initFlows();
      startTime = performance.now();
      window.addEventListener('resize', debounce(function(){ resize(); initDots(); initFlows(); }, 200));
      window.addEventListener('mousemove', function(e){
        mouse.prevX = mouse.x; mouse.prevY = mouse.y;
        mouse.x = e.clientX; mouse.y = e.clientY;
        mouse.vx = mouse.x - mouse.prevX;
        mouse.vy = mouse.y - mouse.prevY;
        // Spawn ripple on fast mouse movement
        var speed = Math.sqrt(mouse.vx*mouse.vx + mouse.vy*mouse.vy);
        if (speed > 30 && ripples.length < 5){
          ripples.push({ x: mouse.x, y: mouse.y, r: 0, maxR: 150, alpha: 0.15, born: performance.now() });
        }
      });
      window.addEventListener('scroll', function(){ scrollY = window.scrollY; scrollMax = Math.max(1, document.body.scrollHeight - window.innerHeight); }, { passive: true });
      window.addEventListener('themechange', function(){ readColors(); });
      raf = requestAnimationFrame(loop);
    } else {
      initDots();
      drawStatic();
      fireIntro();
    }
  }

  function resize(){
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // ── Dot field ──
  function initDots(){
    dots = [];
    var cols = Math.ceil(W / DOT_SPACING) + 2;
    var rows = Math.ceil(H / DOT_SPACING) + 2;
    var cx = W / 2, cy = H / 2;
    for (var r = 0; r < rows; r++){
      for (var c = 0; c < cols; c++){
        var bx = c * DOT_SPACING;
        var by = r * DOT_SPACING;
        var dist = Math.sqrt((bx - cx) * (bx - cx) + (by - cy) * (by - cy));
        dots.push({
          bx: bx,
          by: by,
          x:  bx + (Math.random() - 0.5) * 10,
          y:  by + (Math.random() - 0.5) * 10,
          dx: bx, dy: by,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.4,
          // For intro: radial birth time from center
          birthDist: dist,
          noiseX: Math.random() * 100,
          noiseY: Math.random() * 100,
        });
      }
    }
    // Sort by distance for intro wave effect
    var maxDist = Math.sqrt(W*W + H*H) / 2;
    for (var i = 0; i < dots.length; i++){
      dots[i].birthTime = (dots[i].birthDist / maxDist) * 1.4; // 0..1.4 seconds
    }
  }

  // ── Flow lines ──
  function initFlows(){
    flows = [];
    for (var i = 0; i < FLOW_COUNT; i++){
      flows.push(makeFlow());
    }
  }

  function makeFlow(){
    var startY = Math.random() * H;
    return {
      points: generateCurve(startY),
      progress: 0,
      speed: 0.0003 + Math.random() * 0.0005,
      opacity: 0.04 + Math.random() * 0.06,
    };
  }

  function generateCurve(startY){
    var pts = [];
    var steps = 14;
    var x = -40, y = startY;
    for (var i = 0; i <= steps; i++){
      pts.push({ x: x, y: y });
      x += (W + 80) / steps;
      y += (Math.random() - 0.5) * 80;
      y = Math.max(20, Math.min(H - 20, y));
    }
    return pts;
  }

  // ── Utility ──
  function debounce(fn, ms){
    var t; return function(){ clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function catmull(p0, p1, p2, p3, t){
    var t2 = t*t, t3 = t2*t;
    return 0.5 * (
      (2*p1) + (-p0 + p2) * t + (2*p0 - 5*p1 + 4*p2 - p3) * t2 + (-p0 + 3*p1 - 3*p2 + p3) * t3
    );
  }

  // Simple noise-like function
  function noise(x, y, t){
    return Math.sin(x * 0.03 + t * 0.2) * Math.cos(y * 0.02 + t * 0.15) * 0.5
         + Math.sin(x * 0.01 + y * 0.02 + t * 0.1) * 0.5;
  }

  function fireIntro(){
    if (introFired) return;
    introFired = true;
    // Canvas is running — add class so CSS delays hero text to sync
    document.documentElement.classList.add('canvas-active');
    window.dispatchEvent(new Event('lattice-ready'));
  }

  // ── Main loop ──
  function loop(ts){
    var elapsed = (ts - startTime) / 1000; // seconds since start
    var t = ts * 0.001;
    var sf = scrollY / scrollMax;

    // Clear canvas with background
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // Intro phases
    var dotPhase = Math.min(1, elapsed / 1.6);       // 0..1 over 1.6s
    var linePhase = Math.min(1, Math.max(0, (elapsed - 0.8) / 1.0)); // 0..1 from 0.8s to 1.8s
    var flowPhase = Math.min(1, Math.max(0, (elapsed - 1.6) / 0.8)); // 0..1 from 1.6s

    // Fire intro event when lattice is formed
    if (elapsed > 2.0) fireIntro();

    drawDots(t, sf, elapsed, dotPhase);
    buildGrid();
    if (linePhase > 0) drawConnections(t, sf, linePhase);
    if (flowPhase > 0) drawFlows(t, sf, flowPhase);
    drawMouseGlow();
    drawRipples(ts);
    drawASCII(t, elapsed);

    raf = requestAnimationFrame(loop);
  }

  function drawStatic(){
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.dot;
    for (var i = 0; i < dots.length; i++){
      ctx.beginPath();
      ctx.arc(dots[i].x, dots[i].y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDots(t, sf, elapsed, phase){
    for (var i = 0; i < dots.length; i++){
      var d = dots[i];

      // Intro: fade in radially
      var birthProgress = phase > 0 ? Math.min(1, Math.max(0, (elapsed - d.birthTime) / 0.4)) : 0;
      if (birthProgress <= 0) { d.dx = d.x; d.dy = d.y; continue; }

      // Slow organic drift via noise
      var nx = noise(d.noiseX, d.noiseY, t) * 4;
      var ny = noise(d.noiseX + 50, d.noiseY + 50, t) * 4;

      // Breathing
      var pulse = 0.5 + 0.5 * Math.sin(t * d.speed + d.phase);

      // Mouse interaction (two-zone: inner strong, outer gentle)
      var dx = (d.x + nx) - mouse.x;
      var dy = (d.y + ny) - mouse.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      var mx = 0, my = 0, mGlow = 0;

      if (dist < MOUSE_OUTER && dist > 0){
        if (dist < MOUSE_INNER){
          // Strong repulsion + glow
          var force = (1 - dist / MOUSE_INNER) * 22;
          mx = (dx / dist) * force;
          my = (dy / dist) * force;
          mGlow = (1 - dist / MOUSE_INNER) * 0.25;
        } else {
          // Gentle outer push
          var force2 = (1 - (dist - MOUSE_INNER) / (MOUSE_OUTER - MOUSE_INNER)) * 6;
          mx = (dx / dist) * force2;
          my = (dy / dist) * force2;
          mGlow = (1 - dist / MOUSE_OUTER) * 0.08;
        }
      }

      var drawX = d.x + nx + mx;
      var drawY = d.y + ny + my;
      var alpha = (0.15 + pulse * 0.15 + mGlow) * birthProgress;
      var radius = (1.2 + mGlow * 4) * birthProgress;

      ctx.beginPath();
      ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      ctx.fillStyle = mGlow > 0.05 ? C.dotBright : C.dot;
      ctx.globalAlpha = alpha;
      ctx.fill();

      d.dx = drawX;
      d.dy = drawY;
      d.drawAlpha = alpha;
    }
    ctx.globalAlpha = 1;
  }

  function drawConnections(t, sf, phase){
    var threshold = CONNECTION_DIST;
    var maxAlpha = (0.08 + sf * 0.04) * phase;

    ctx.lineWidth = 0.5;
    for (var i = 0; i < dots.length; i++){
      var a = dots[i];
      if (!a.drawAlpha || a.drawAlpha < 0.01) continue;
      var cells = getNeighborCells(a.dx, a.dy);
      for (var ci = 0; ci < cells.length; ci++){
        var cell = cells[ci];
        for (var ji = 0; ji < cell.length; ji++){
          var j = cell[ji];
          if (j <= i) continue;
          var b = dots[j];
          if (!b.drawAlpha || b.drawAlpha < 0.01) continue;

          var dx = a.dx - b.dx;
          var dy = a.dy - b.dy;
          var dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > threshold) continue;

          // Mouse proximity boost
          var midX = (a.dx + b.dx) * 0.5;
          var midY = (a.dy + b.dy) * 0.5;
          var mDx = midX - mouse.x;
          var mDy = midY - mouse.y;
          var mDist = Math.sqrt(mDx*mDx + mDy*mDy);
          var mBoost = mDist < MOUSE_OUTER ? (1 - mDist/MOUSE_OUTER) * 0.2 : 0;

          var alpha = (1 - dist / threshold) * maxAlpha + mBoost;
          if (alpha < 0.004) continue;

          var lw = mBoost > 0.02 ? 0.6 + mBoost * 10 : 0.6;

          ctx.beginPath();
          ctx.moveTo(a.dx, a.dy);
          ctx.lineTo(b.dx, b.dy);
          ctx.strokeStyle = mBoost > 0.02 ? C.lineHot : C.line;
          ctx.globalAlpha = Math.min(0.3, alpha);
          ctx.lineWidth = lw;
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFlows(t, sf, phase){
    var speedMult = (1 + sf * 0.5) * phase;

    for (var fi = 0; fi < flows.length; fi++){
      var f = flows[fi];
      f.progress += f.speed * speedMult * 16;
      if (f.progress > 1){
        flows[fi] = makeFlow();
        flows[fi].progress = 0;
        continue;
      }

      var pts = f.points;
      var n = pts.length;
      if (n < 4) continue;

      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = C.flow;
      ctx.globalAlpha = f.opacity * phase;

      var totalSegments = n - 1;
      var endSeg = f.progress * totalSegments;

      for (var seg = 0; seg < Math.min(Math.ceil(endSeg), totalSegments); seg++){
        var p0 = pts[Math.max(0, seg - 1)];
        var p1 = pts[seg];
        var p2 = pts[Math.min(n-1, seg + 1)];
        var p3 = pts[Math.min(n-1, seg + 2)];

        var steps = 8;
        var segEnd = seg < Math.floor(endSeg) ? 1 : (endSeg - seg);

        for (var s = 0; s <= steps * segEnd; s++){
          var tt = s / steps;
          var cx2 = catmull(p0.x, p1.x, p2.x, p3.x, tt);
          var cy2 = catmull(p0.y, p1.y, p2.y, p3.y, tt);
          if (seg === 0 && s === 0) ctx.moveTo(cx2, cy2);
          else ctx.lineTo(cx2, cy2);
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawMouseGlow(){
    if (mouse.x < -999) return;
    var grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_OUTER);
    grad.addColorStop(0, C.lineHot);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = grad;
    ctx.fillRect(mouse.x - MOUSE_OUTER, mouse.y - MOUSE_OUTER, MOUSE_OUTER * 2, MOUSE_OUTER * 2);
    ctx.globalAlpha = 1;
  }

  function drawRipples(ts){
    for (var i = ripples.length - 1; i >= 0; i--){
      var rip = ripples[i];
      var age = (ts - rip.born) / 1000;
      if (age > 0.8){ ripples.splice(i, 1); continue; }
      var progress = age / 0.8;
      var r = rip.maxR * progress;
      var alpha = rip.alpha * (1 - progress);
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = C.lineHot;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawASCII(t, elapsed){
    if (elapsed < 1.5) return; // Wait for dots first
    var fadeIn = Math.min(1, (elapsed - 1.5) / 1.0);
    ctx.font = '10px monospace';
    ctx.fillStyle = C.ascii;
    var chars = '|/\\·+─│┌┐└┘├┤┬┴┼';
    var spacing = 80;

    for (var x = spacing; x < W; x += spacing){
      for (var y = spacing; y < H; y += spacing){
        var hash = (x * 7 + y * 13 + Math.floor(t * 0.3)) % 17;
        if (hash > 3) continue;
        var ci = (x * 3 + y * 7 + Math.floor(t * 0.2)) % chars.length;
        ctx.globalAlpha = fadeIn * 0.35;
        ctx.fillText(chars[ci], x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Card hover animation ──
  window.labCardAnimate = function(card){
    var cvs = document.createElement('canvas');
    cvs.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    card.style.position = 'relative';
    card.style.overflow = 'hidden';
    card.appendChild(cvs);

    var c = cvs.getContext('2d');
    var w = 0, h = 0, active = false, animRaf = 0;

    function sizeCard(){
      var r = card.getBoundingClientRect();
      w = r.width; h = r.height;
      cvs.width = w * DPR; cvs.height = h * DPR;
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    var N = 6 + Math.floor(Math.random() * 4);
    var nodes = [];
    for (var i = 0; i < N; i++){
      nodes.push({ x: Math.random(), y: Math.random(), tx: Math.random(), ty: Math.random(), vx: 0, vy: 0 });
    }

    function drawCard(){
      if (!active) return;
      c.clearRect(0, 0, w, h);

      for (var i2 = 0; i2 < nodes.length; i2++){
        var n = nodes[i2];
        n.vx += (n.tx * w - n.x * w) * 0.002;
        n.vy += (n.ty * h - n.y * h) * 0.002;
        n.vx *= 0.95; n.vy *= 0.95;
        n.x += n.vx / w; n.y += n.vy / h;
        n.x = Math.max(0.05, Math.min(0.95, n.x));
        n.y = Math.max(0.05, Math.min(0.95, n.y));
        if (Math.random() < 0.003){ n.tx = Math.random(); n.ty = Math.random(); }
      }

      c.lineWidth = 0.5;
      for (var i3 = 0; i3 < N; i3++){
        for (var j = i3+1; j < N; j++){
          var ddx = (nodes[i3].x - nodes[j].x) * w;
          var ddy = (nodes[i3].y - nodes[j].y) * h;
          var dd = Math.sqrt(ddx*ddx + ddy*ddy);
          if (dd > 100) continue;
          var al = (1 - dd/100) * 0.12;
          c.strokeStyle = C.lineHot || 'rgba(106,169,255,0.18)';
          c.globalAlpha = al;
          c.beginPath();
          c.moveTo(nodes[i3].x * w, nodes[i3].y * h);
          c.lineTo(nodes[j].x * w, nodes[j].y * h);
          c.stroke();
        }
      }
      c.globalAlpha = 1;
      for (var i4 = 0; i4 < nodes.length; i4++){
        c.beginPath();
        c.arc(nodes[i4].x * w, nodes[i4].y * h, 1.5, 0, Math.PI*2);
        c.fillStyle = C.lineHot || 'rgba(106,169,255,0.20)';
        c.globalAlpha = 0.3;
        c.fill();
      }
      c.globalAlpha = 1;
      animRaf = requestAnimationFrame(drawCard);
    }

    card.addEventListener('mouseenter', function(){ sizeCard(); active = true; animRaf = requestAnimationFrame(drawCard); });
    card.addEventListener('mouseleave', function(){ active = false; cancelAnimationFrame(animRaf); c.clearRect(0, 0, w, h); });
  };

  // ── Scroll reveal observer ──
  function setupScrollReveal(){
    var sections = document.querySelectorAll('.lab-section, .lab-section-narrow');
    if (!sections.length) return;
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) e.target.classList.add('visible');
      });
    }, { rootMargin: '-40px', threshold: 0.05 });
    sections.forEach(function(s){ observer.observe(s); });
  }

  // ── Boot ──
  function boot(){
    setup();
    setupScrollReveal();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
