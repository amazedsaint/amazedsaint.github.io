// lab-canvas.js — Lattice animation engine
// Spring-physics mesh, wandering particles, pulse waves, theme-aware
(function(){
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Theme-reactive colors ──
  var C = {};
  function readColors(){
    var s = getComputedStyle(document.documentElement);
    function g(n,fb){ return s.getPropertyValue(n).trim() || fb; }
    C.bg       = g('--canvas-bg',       '#0a0a0a');
    C.dot      = g('--canvas-dot',      'rgba(255,255,255,0.18)');
    C.dotBright= g('--canvas-dot-bright','rgba(255,255,255,0.40)');
    C.line     = g('--canvas-line',     'rgba(106,169,255,0.10)');
    C.lineHot  = g('--canvas-line-hot', 'rgba(106,169,255,0.25)');
    C.flow     = g('--canvas-flow',     'rgba(155,124,255,0.06)');
    C.ascii    = g('--canvas-ascii',    'rgba(255,255,255,0.035)');
    C.trail    = g('--canvas-trail',    'rgba(10,10,10,0.12)');
  }

  // ── State ──
  var canvas, ctx, W, H, DPR;
  var mouse = { x: -9999, y: -9999, vx: 0, vy: 0, prevX: -9999, prevY: -9999 };
  var scrollY = 0, scrollMax = 1;
  var dots = [];
  var flows = [];
  var ripples = [];
  var pulses = [];
  var raf = 0;
  var startTime = 0;
  var introFired = false;
  var lastTs = 0;

  var DOT_SPACING = 48;
  var FLOW_COUNT = 12;
  var CONNECTION_DIST = 110;
  var MOUSE_INNER = 120;
  var MOUSE_OUTER = 280;
  var WANDERER_COUNT = 3;
  var WANDERER_INNER = 90;
  var WANDERER_OUTER = 220;

  // ── Wandering particles ──
  var wanderers = [];

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
      var k = hashKey(d.dx, d.dy);
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
      document.documentElement.classList.add('canvas-active');
      initDots();
      initFlows();
      initWanderers();
      startTime = performance.now();
      lastTs = startTime;
      window.addEventListener('resize', debounce(function(){ resize(); initDots(); initFlows(); initWanderers(); }, 200));
      window.addEventListener('mousemove', function(e){
        mouse.prevX = mouse.x; mouse.prevY = mouse.y;
        mouse.x = e.clientX; mouse.y = e.clientY;
        mouse.vx = mouse.x - mouse.prevX;
        mouse.vy = mouse.y - mouse.prevY;
        var speed = Math.sqrt(mouse.vx*mouse.vx + mouse.vy*mouse.vy);
        if (speed > 30 && ripples.length < 6){
          ripples.push({ x: mouse.x, y: mouse.y, maxR: 160 + speed, alpha: 0.12 + speed * 0.001, born: performance.now() });
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

  // ── Dot field with spring physics ──
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
          bx: bx, by: by,
          x: bx + (Math.random() - 0.5) * 8,
          y: by + (Math.random() - 0.5) * 8,
          // Spring displacement from forces
          sx: 0, sy: 0,   // current spring offset
          svx: 0, svy: 0, // spring velocity
          dx: bx, dy: by,  // final draw position
          drawAlpha: 0,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.4,
          baseSize: 0.8 + Math.random() * 0.8, // size variation
          birthDist: dist,
          birthTime: 0,
          noiseX: Math.random() * 200,
          noiseY: Math.random() * 200,
        });
      }
    }
    var maxDist = Math.sqrt(W*W + H*H) / 2;
    for (var i = 0; i < dots.length; i++){
      dots[i].birthTime = (dots[i].birthDist / maxDist) * 1.4;
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
      speed: 0.0004 + Math.random() * 0.0006,
      opacity: 0.05 + Math.random() * 0.07,
      width: 0.5 + Math.random() * 1.5,
    };
  }

  function generateCurve(startY){
    var pts = [];
    var steps = 16;
    var x = -40, y = startY;
    for (var i = 0; i <= steps; i++){
      pts.push({ x: x, y: y });
      x += (W + 80) / steps;
      y += (Math.random() - 0.5) * 100;
      y = Math.max(20, Math.min(H - 20, y));
    }
    return pts;
  }

  // ── Wanderers ──
  function initWanderers(){
    wanderers = [];
    var colors = [
      { h: 215, s: 85, l: 68 },  // bright blue
      { h: 268, s: 75, l: 72 },  // violet
      { h: 155, s: 75, l: 58 },  // teal-green
    ];
    for (var i = 0; i < WANDERER_COUNT; i++){
      // Start from edges for a dramatic entrance
      var edge = Math.floor(Math.random() * 4);
      var sx = edge === 0 ? 0 : edge === 2 ? W : Math.random() * W;
      var sy = edge === 1 ? 0 : edge === 3 ? H : Math.random() * H;
      wanderers.push({
        x: sx, y: sy,
        tx: W * 0.2 + Math.random() * W * 0.6,
        ty: H * 0.2 + Math.random() * H * 0.6,
        vx: 0, vy: 0,
        color: colors[i % colors.length],
        trail: [],
        age: 0,
        wanderTimer: 0,
        speed: 0.8 + Math.random() * 0.5,
        pulseTimer: 2 + Math.random() * 4,
        orbitPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  function updateWanderers(t, dt){
    for (var i = 0; i < wanderers.length; i++){
      var w = wanderers[i];
      w.age += dt;
      w.wanderTimer -= dt;
      w.pulseTimer -= dt;

      // Emit pulse wave periodically
      if (w.pulseTimer <= 0 && w.age > 2){
        pulses.push({ x: w.x, y: w.y, r: 0, maxR: 300, alpha: 0.1, born: performance.now(), color: w.color });
        w.pulseTimer = 4 + Math.random() * 6;
      }

      // Pick new target
      var dtx = w.tx - w.x, dty = w.ty - w.y;
      var distToTarget = Math.sqrt(dtx*dtx + dty*dty);
      if (w.wanderTimer <= 0 || distToTarget < 50){
        w.tx = 80 + Math.random() * (W - 160);
        w.ty = 80 + Math.random() * (H - 160);
        w.wanderTimer = 2.5 + Math.random() * 4;
      }

      // Steer toward target
      var ax = (w.tx - w.x) * 0.004 * w.speed;
      var ay = (w.ty - w.y) * 0.004 * w.speed;

      // Orbital drift — smooth curved paths instead of straight lines
      w.orbitPhase += dt * 0.3;
      ax += Math.sin(w.orbitPhase + i * 2.1) * 0.25;
      ay += Math.cos(w.orbitPhase * 0.7 + i * 1.7) * 0.25;

      // Repel from other wanderers
      for (var j = 0; j < wanderers.length; j++){
        if (j === i) continue;
        var wdx = w.x - wanderers[j].x;
        var wdy = w.y - wanderers[j].y;
        var wdist = Math.sqrt(wdx*wdx + wdy*wdy);
        if (wdist < 200 && wdist > 0){
          var repel = (1 - wdist / 200) * 0.4;
          ax += (wdx / wdist) * repel;
          ay += (wdy / wdist) * repel;
        }
      }

      // Repel gently from mouse
      if (mouse.x > -999){
        var mdx = w.x - mouse.x;
        var mdy = w.y - mouse.y;
        var mdist = Math.sqrt(mdx*mdx + mdy*mdy);
        if (mdist < 200 && mdist > 0){
          ax += (mdx / mdist) * 0.3 * (1 - mdist / 200);
          ay += (mdy / mdist) * 0.3 * (1 - mdist / 200);
        }
      }

      w.vx += ax;
      w.vy += ay;
      w.vx *= 0.96;
      w.vy *= 0.96;

      // Clamp speed
      var spd = Math.sqrt(w.vx*w.vx + w.vy*w.vy);
      var maxSpd = 3.5;
      if (spd > maxSpd){ w.vx *= maxSpd/spd; w.vy *= maxSpd/spd; }

      w.x += w.vx;
      w.y += w.vy;

      // Soft boundary
      var margin = 40;
      if (w.x < margin){ w.vx += 0.8; w.x = margin; }
      if (w.x > W - margin){ w.vx -= 0.8; w.x = W - margin; }
      if (w.y < margin){ w.vy += 0.8; w.y = margin; }
      if (w.y > H - margin){ w.vy -= 0.8; w.y = H - margin; }

      // Trail — store with velocity for thickness variation
      w.trail.push({ x: w.x, y: w.y, spd: spd });
      if (w.trail.length > 50) w.trail.shift();
    }
  }

  function drawWanderers(elapsed){
    if (elapsed < 1.6) return;
    var fadeIn = Math.min(1, (elapsed - 1.6) / 1.2);

    for (var i = 0; i < wanderers.length; i++){
      var w = wanderers[i];
      var col = w.color;
      var spd = Math.sqrt(w.vx*w.vx + w.vy*w.vy);

      // Trail — gradient thickness based on speed
      if (w.trail.length > 2){
        for (var j = 1; j < w.trail.length; j++){
          var prog = j / w.trail.length;
          var trailAlpha = prog * 0.18 * fadeIn;
          var trailWidth = 0.5 + prog * (0.5 + w.trail[j].spd * 0.4);
          ctx.beginPath();
          ctx.moveTo(w.trail[j-1].x, w.trail[j-1].y);
          ctx.lineTo(w.trail[j].x, w.trail[j].y);
          ctx.strokeStyle = 'hsla(' + col.h + ',' + col.s + '%,' + col.l + '%,' + trailAlpha + ')';
          ctx.lineWidth = trailWidth;
          ctx.globalAlpha = 1;
          ctx.stroke();
        }
      }

      // Outer glow — larger, more visible
      var glowSize = WANDERER_OUTER * (0.6 + spd * 0.08);
      var grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, glowSize);
      grad.addColorStop(0, 'hsla(' + col.h + ',' + col.s + '%,' + col.l + '%,0.10)');
      grad.addColorStop(0.4, 'hsla(' + col.h + ',' + col.s + '%,' + col.l + '%,0.03)');
      grad.addColorStop(1, 'transparent');
      ctx.globalAlpha = fadeIn;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(w.x, w.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Halo ring
      ctx.beginPath();
      ctx.arc(w.x, w.y, 6 + spd * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + col.h + ',' + col.s + '%,' + col.l + '%,0.12)';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = fadeIn;
      ctx.stroke();

      // Core dot — pulsing size
      var coreSize = 2.5 + Math.sin(elapsed * 2 + i) * 0.5 + spd * 0.3;
      ctx.beginPath();
      ctx.arc(w.x, w.y, coreSize, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + col.h + ',' + col.s + '%,' + col.l + '%,0.6)';
      ctx.globalAlpha = fadeIn;
      ctx.fill();

      // Bright hot center
      ctx.beginPath();
      ctx.arc(w.x, w.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + col.h + ',' + (col.s - 10) + '%,' + Math.min(95, col.l + 25) + '%,0.9)';
      ctx.globalAlpha = fadeIn;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Wanderer influence with spring force output
  function wandererForce(px, py){
    var fx = 0, fy = 0, glow = 0, boost = 0;
    for (var i = 0; i < wanderers.length; i++){
      var w = wanderers[i];
      var ddx = px - w.x;
      var ddy = py - w.y;
      var dist = Math.sqrt(ddx*ddx + ddy*ddy);
      if (dist > WANDERER_OUTER || dist === 0) continue;

      if (dist < WANDERER_INNER){
        var f = (1 - dist / WANDERER_INNER) * 16;
        fx += (ddx / dist) * f;
        fy += (ddy / dist) * f;
        glow = Math.max(glow, (1 - dist / WANDERER_INNER) * 0.22);
        boost = Math.max(boost, (1 - dist / WANDERER_INNER) * 0.18);
      } else {
        var f2 = (1 - (dist - WANDERER_INNER) / (WANDERER_OUTER - WANDERER_INNER)) * 5;
        fx += (ddx / dist) * f2;
        fy += (ddy / dist) * f2;
        glow = Math.max(glow, (1 - dist / WANDERER_OUTER) * 0.08);
        boost = Math.max(boost, (1 - dist / WANDERER_OUTER) * 0.10);
      }
    }
    return { fx: fx, fy: fy, glow: glow, boost: boost };
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

  // Multi-octave noise
  function noise(x, y, t){
    return Math.sin(x * 0.03 + t * 0.2) * Math.cos(y * 0.02 + t * 0.15) * 0.5
         + Math.sin(x * 0.01 + y * 0.02 + t * 0.1) * 0.5
         + Math.sin(x * 0.05 + t * 0.35) * Math.cos(y * 0.04 - t * 0.12) * 0.25;
  }

  function fireIntro(){
    if (introFired) return;
    introFired = true;
    document.documentElement.classList.add('canvas-active');
    window.dispatchEvent(new Event('lattice-ready'));
  }

  // ── Main loop ──
  function loop(ts){
    var dt = Math.min(0.05, (ts - lastTs) / 1000); // delta in seconds, capped
    lastTs = ts;
    var elapsed = (ts - startTime) / 1000;
    var t = ts * 0.001;
    var sf = scrollY / scrollMax;

    // Clear
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // Intro phases
    var dotPhase = Math.min(1, elapsed / 1.6);
    var linePhase = Math.min(1, Math.max(0, (elapsed - 0.8) / 1.0));
    var flowPhase = Math.min(1, Math.max(0, (elapsed - 1.6) / 0.8));

    if (elapsed > 2.0) fireIntro();

    updateWanderers(t, dt);
    drawDots(t, sf, elapsed, dotPhase, dt);
    buildGrid();
    if (linePhase > 0) drawConnections(t, sf, linePhase);
    if (flowPhase > 0) drawFlows(t, sf, flowPhase);
    drawPulses(ts);
    drawWanderers(elapsed);
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

  function drawDots(t, sf, elapsed, phase, dt){
    // Spring constants
    var springK = 0.08;   // stiffness — how fast dots snap back
    var springDamp = 0.85; // damping — friction on spring motion

    for (var i = 0; i < dots.length; i++){
      var d = dots[i];

      // Intro: fade in radially
      var birthProgress = phase > 0 ? Math.min(1, Math.max(0, (elapsed - d.birthTime) / 0.4)) : 0;
      if (birthProgress <= 0) { d.dx = d.x; d.dy = d.y; d.drawAlpha = 0; continue; }

      // Organic drift via noise (multi-octave, larger amplitude)
      var nx = noise(d.noiseX, d.noiseY, t) * 7;
      var ny = noise(d.noiseX + 50, d.noiseY + 50, t) * 7;

      // Breathing pulse
      var pulse = 0.5 + 0.5 * Math.sin(t * d.speed + d.phase);

      // Compute forces from mouse
      var baseX = d.x + nx;
      var baseY = d.y + ny;
      var forcex = 0, forcey = 0, mGlow = 0;

      var mdx = baseX - mouse.x;
      var mdy = baseY - mouse.y;
      var mdist = Math.sqrt(mdx*mdx + mdy*mdy);

      if (mdist < MOUSE_OUTER && mdist > 0){
        if (mdist < MOUSE_INNER){
          var force = (1 - mdist / MOUSE_INNER) * 26;
          forcex += (mdx / mdist) * force;
          forcey += (mdy / mdist) * force;
          mGlow = (1 - mdist / MOUSE_INNER) * 0.3;
        } else {
          var force2 = (1 - (mdist - MOUSE_INNER) / (MOUSE_OUTER - MOUSE_INNER)) * 8;
          forcex += (mdx / mdist) * force2;
          forcey += (mdy / mdist) * force2;
          mGlow = (1 - mdist / MOUSE_OUTER) * 0.1;
        }
      }

      // Forces from wanderers
      var wf = wandererForce(baseX, baseY);
      forcex += wf.fx;
      forcey += wf.fy;
      mGlow = Math.max(mGlow, wf.glow);

      // Forces from pulse waves
      for (var pi = 0; pi < pulses.length; pi++){
        var p = pulses[pi];
        var pdx = baseX - p.x;
        var pdy = baseY - p.y;
        var pdist = Math.sqrt(pdx*pdx + pdy*pdy);
        var ringDist = Math.abs(pdist - p.r);
        if (ringDist < 40 && pdist > 0){
          var pForce = (1 - ringDist / 40) * 6 * p.alpha * 5;
          forcex += (pdx / pdist) * pForce;
          forcey += (pdy / pdist) * pForce;
          mGlow = Math.max(mGlow, (1 - ringDist / 40) * p.alpha * 2);
        }
      }

      // Spring physics: apply force, then spring back to zero
      d.svx += forcex * 0.5;  // force influence
      d.svy += forcey * 0.5;
      d.svx += -d.sx * springK; // spring restoring force
      d.svy += -d.sy * springK;
      d.svx *= springDamp;
      d.svy *= springDamp;
      d.sx += d.svx;
      d.sy += d.svy;

      // Clamp spring displacement
      var smax = 35;
      if (d.sx > smax) d.sx = smax;
      if (d.sx < -smax) d.sx = -smax;
      if (d.sy > smax) d.sy = smax;
      if (d.sy < -smax) d.sy = -smax;

      var drawX = baseX + d.sx;
      var drawY = baseY + d.sy;
      var alpha = (0.18 + pulse * 0.14 + mGlow) * birthProgress;
      var radius = (d.baseSize + mGlow * 4) * birthProgress;

      ctx.beginPath();
      ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      ctx.fillStyle = mGlow > 0.06 ? C.dotBright : C.dot;
      ctx.globalAlpha = Math.min(0.9, alpha);
      ctx.fill();

      d.dx = drawX;
      d.dy = drawY;
      d.drawAlpha = alpha;
    }
    ctx.globalAlpha = 1;
  }

  function drawConnections(t, sf, phase){
    var threshold = CONNECTION_DIST;
    var maxAlpha = (0.10 + sf * 0.04) * phase;
    // Time-based shimmer
    var shimmer = 0.5 + 0.5 * Math.sin(t * 0.4);

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
          var mBoost = mDist < MOUSE_OUTER ? (1 - mDist/MOUSE_OUTER) * 0.22 : 0;

          // Wanderer boost
          var wfConn = wandererForce(midX, midY);
          mBoost = Math.max(mBoost, wfConn.boost);

          var prox = 1 - dist / threshold;
          var alpha = prox * maxAlpha * (0.8 + shimmer * 0.2) + mBoost;
          if (alpha < 0.005) continue;

          var lw = mBoost > 0.03 ? 0.6 + mBoost * 8 : 0.5 + prox * 0.3;
          var hot = mBoost > 0.03;

          ctx.beginPath();
          ctx.moveTo(a.dx, a.dy);
          ctx.lineTo(b.dx, b.dy);
          ctx.strokeStyle = hot ? C.lineHot : C.line;
          ctx.globalAlpha = Math.min(0.35, alpha);
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
      ctx.lineWidth = f.width;
      ctx.strokeStyle = C.flow;
      ctx.globalAlpha = f.opacity * phase;

      var totalSegments = n - 1;
      var endSeg = f.progress * totalSegments;

      for (var seg = 0; seg < Math.min(Math.ceil(endSeg), totalSegments); seg++){
        var p0 = pts[Math.max(0, seg - 1)];
        var p1 = pts[seg];
        var p2 = pts[Math.min(n-1, seg + 1)];
        var p3 = pts[Math.min(n-1, seg + 2)];

        var steps = 10;
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
    grad.addColorStop(0.3, C.line);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, MOUSE_OUTER, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Pulse waves from wanderers ──
  function drawPulses(ts){
    for (var i = pulses.length - 1; i >= 0; i--){
      var p = pulses[i];
      var age = (ts - p.born) / 1000;
      if (age > 1.5){ pulses.splice(i, 1); continue; }
      var progress = age / 1.5;
      if (progress < 0) continue;
      p.r = p.maxR * progress;
      var alpha = p.alpha * (1 - progress) * (1 - progress);
      var col = p.color;

      // Ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + col.h + ',' + col.s + '%,' + col.l + '%,' + alpha + ')';
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.5 * (1 - progress);
      ctx.stroke();

      // Inner glow
      if (progress < 0.5){
        var iGrad = ctx.createRadialGradient(p.x, p.y, p.r * 0.8, p.x, p.y, p.r);
        iGrad.addColorStop(0, 'transparent');
        iGrad.addColorStop(1, 'hsla(' + col.h + ',' + col.s + '%,' + col.l + '%,' + (alpha * 0.3) + ')');
        ctx.fillStyle = iGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawRipples(ts){
    for (var i = ripples.length - 1; i >= 0; i--){
      var rip = ripples[i];
      var age = (ts - rip.born) / 1000;
      if (age > 0.8){ ripples.splice(i, 1); continue; }
      var progress = age / 0.8;
      if (progress < 0) continue;
      var r = rip.maxR * progress;
      var alpha = rip.alpha * (1 - progress) * (1 - progress);
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = C.lineHot;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.2 * (1 - progress);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawASCII(t, elapsed){
    if (elapsed < 1.5) return;
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
        ctx.globalAlpha = fadeIn * 0.3;
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
