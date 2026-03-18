// lab-canvas.js — Shared animation engine for research lab pages
// Dot field, flow lines, connection graph, noise, ASCII overlay
// Mouse + scroll reactive
(function(){
  'use strict';

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Colors ──
  const C = {
    dot:      'rgba(255,255,255,0.12)',
    dotBright:'rgba(255,255,255,0.25)',
    line:     'rgba(106,169,255,0.06)',
    lineHot:  'rgba(106,169,255,0.15)',
    flow:     'rgba(155,124,255,0.04)',
    flowBright:'rgba(155,124,255,0.10)',
    ascii:    'rgba(255,255,255,0.025)',
    green:    'rgba(124,255,196,0.08)',
  };

  // ── State ──
  let canvas, ctx, W, H, DPR;
  let mouse = { x: -9999, y: -9999 };
  let scrollY = 0, scrollMax = 1;
  let dots = [];
  let flows = [];
  let raf = 0;
  const DOT_SPACING = 50;
  const FLOW_COUNT = 8;
  const CONNECTION_DIST = 120;
  const MOUSE_RADIUS = 180;

  // ── Init ──
  function setup(){
    canvas = document.getElementById('lab-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    DPR = Math.min(2, window.devicePixelRatio || 1);

    resize();
    if (!reduce) {
      initDots();
      initFlows();
      window.addEventListener('resize', debounce(()=>{ resize(); initDots(); initFlows(); }, 200));
      window.addEventListener('mousemove', e=>{ mouse.x = e.clientX; mouse.y = e.clientY; });
      window.addEventListener('scroll', ()=>{ scrollY = window.scrollY; scrollMax = Math.max(1, document.body.scrollHeight - window.innerHeight); }, { passive: true });
      raf = requestAnimationFrame(loop);
    } else {
      // Static frame for reduced motion
      initDots();
      drawStatic();
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
    const cols = Math.ceil(W / DOT_SPACING) + 2;
    const rows = Math.ceil(H / DOT_SPACING) + 2;
    for (let r = 0; r < rows; r++){
      for (let c = 0; c < cols; c++){
        dots.push({
          bx: c * DOT_SPACING,
          by: r * DOT_SPACING,
          x:  c * DOT_SPACING + (Math.random() - 0.5) * 12,
          y:  r * DOT_SPACING + (Math.random() - 0.5) * 12,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.5,
        });
      }
    }
  }

  // ── Flow lines ──
  function initFlows(){
    flows = [];
    for (let i = 0; i < FLOW_COUNT; i++){
      flows.push(makeFlow());
    }
  }

  function makeFlow(){
    const startY = Math.random() * H;
    return {
      points: generateCurve(startY),
      progress: 0,
      speed: 0.0003 + Math.random() * 0.0005,
      opacity: 0.02 + Math.random() * 0.04,
    };
  }

  function generateCurve(startY){
    const pts = [];
    const steps = 12;
    let x = -40, y = startY;
    for (let i = 0; i <= steps; i++){
      pts.push({ x, y });
      x += (W + 80) / steps;
      y += (Math.random() - 0.5) * 80;
      y = Math.max(20, Math.min(H - 20, y));
    }
    return pts;
  }

  // ── Utility ──
  function debounce(fn, ms){
    let t; return function(){ clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function lerp(a, b, t){ return a + (b - a) * t; }

  function catmull(p0, p1, p2, p3, t){
    const t2 = t*t, t3 = t2*t;
    return 0.5 * (
      (2*p1) +
      (-p0 + p2) * t +
      (2*p0 - 5*p1 + 4*p2 - p3) * t2 +
      (-p0 + 3*p1 - 3*p2 + p3) * t3
    );
  }

  // ── Draw ──
  function loop(ts){
    const t = ts * 0.001;
    ctx.clearRect(0, 0, W, H);

    const scrollFactor = scrollY / scrollMax; // 0..1

    drawDots(t, scrollFactor);
    drawConnections(t, scrollFactor);
    drawFlows(t, scrollFactor);
    drawASCII(t);

    raf = requestAnimationFrame(loop);
  }

  function drawStatic(){
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.dot;
    for (const d of dots){
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDots(t, sf){
    for (const d of dots){
      // Subtle breathing
      const pulse = 0.5 + 0.5 * Math.sin(t * d.speed + d.phase);

      // Mouse repulsion
      const dx = d.x - mouse.x;
      const dy = d.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      let mx = 0, my = 0;
      if (dist < MOUSE_RADIUS && dist > 0){
        const force = (1 - dist / MOUSE_RADIUS) * 8;
        mx = (dx / dist) * force;
        my = (dy / dist) * force;
      }

      const drawX = d.x + mx;
      const drawY = d.y + my;
      const alpha = 0.06 + pulse * 0.08 + (dist < MOUSE_RADIUS ? 0.08 : 0);
      const radius = 1 + (dist < MOUSE_RADIUS ? 0.5 : 0);

      ctx.beginPath();
      ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();

      // Store draw position for connections
      d.dx = drawX;
      d.dy = drawY;
      d.alpha = alpha;
    }
  }

  function drawConnections(t, sf){
    // Connection density increases with scroll
    const threshold = CONNECTION_DIST - sf * 30;
    const maxAlpha = 0.03 + sf * 0.04;

    ctx.lineWidth = 0.5;
    for (let i = 0; i < dots.length; i++){
      const a = dots[i];
      for (let j = i + 1; j < dots.length; j++){
        const b = dots[j];
        const dx = a.dx - b.dx;
        const dy = a.dy - b.dy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > threshold) continue;

        // Mouse proximity boost
        const midX = (a.dx + b.dx) * 0.5;
        const midY = (a.dy + b.dy) * 0.5;
        const mDist = Math.sqrt((midX-mouse.x)**2 + (midY-mouse.y)**2);
        const mBoost = mDist < MOUSE_RADIUS ? (1 - mDist/MOUSE_RADIUS) * 0.08 : 0;

        const alpha = (1 - dist / threshold) * maxAlpha + mBoost;
        if (alpha < 0.005) continue;

        ctx.beginPath();
        ctx.moveTo(a.dx, a.dy);
        ctx.lineTo(b.dx, b.dy);
        ctx.strokeStyle = mBoost > 0
          ? `rgba(106,169,255,${alpha})`
          : `rgba(255,255,255,${alpha})`;
        ctx.stroke();
      }
    }
  }

  function drawFlows(t, sf){
    // Flow speed increases slightly with scroll
    const speedMult = 1 + sf * 0.5;

    for (const f of flows){
      f.progress += f.speed * speedMult * 16; // ~16ms frame
      if (f.progress > 1){
        // Reset
        const idx = flows.indexOf(f);
        flows[idx] = makeFlow();
        flows[idx].progress = 0;
        continue;
      }

      const pts = f.points;
      const n = pts.length;
      if (n < 4) continue;

      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(155,124,255,${f.opacity})`;

      // Draw curve up to current progress
      const totalSegments = n - 1;
      const endSeg = f.progress * totalSegments;

      for (let seg = 0; seg < Math.min(Math.ceil(endSeg), totalSegments); seg++){
        const p0 = pts[Math.max(0, seg - 1)];
        const p1 = pts[seg];
        const p2 = pts[Math.min(n-1, seg + 1)];
        const p3 = pts[Math.min(n-1, seg + 2)];

        const steps = 8;
        const segEnd = seg < Math.floor(endSeg) ? 1 : (endSeg - seg);

        for (let s = 0; s <= steps * segEnd; s++){
          const tt = s / steps;
          const cx = catmull(p0.x, p1.x, p2.x, p3.x, tt);
          const cy = catmull(p0.y, p1.y, p2.y, p3.y, tt);
          if (seg === 0 && s === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
      }
      ctx.stroke();
    }
  }

  function drawASCII(t){
    // Very faint ASCII grid characters
    ctx.font = '10px monospace';
    ctx.fillStyle = C.ascii;
    const chars = '|/\\·+─│┌┐└┘├┤┬┴┼';
    const spacing = 80;
    const phase = t * 0.05;

    for (let x = spacing; x < W; x += spacing){
      for (let y = spacing; y < H; y += spacing){
        // Only render some cells, varies with time
        const hash = (x * 7 + y * 13 + Math.floor(t * 0.3)) % 17;
        if (hash > 3) continue;
        const ci = (x * 3 + y * 7 + Math.floor(t * 0.2)) % chars.length;
        ctx.fillText(chars[ci], x, y);
      }
    }
  }

  // ── Card hover animation ──
  window.labCardAnimate = function(card){
    const cvs = document.createElement('canvas');
    cvs.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    card.style.position = 'relative';
    card.style.overflow = 'hidden';
    card.appendChild(cvs);

    const c = cvs.getContext('2d');
    let w = 0, h = 0, active = false, animRaf = 0;

    function sizeCard(){
      const r = card.getBoundingClientRect();
      w = r.width; h = r.height;
      cvs.width = w * DPR; cvs.height = h * DPR;
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    // Generate small internal node set
    const N = 6 + Math.floor(Math.random() * 4);
    const nodes = [];
    for (let i = 0; i < N; i++){
      nodes.push({
        x: Math.random(), y: Math.random(),
        tx: Math.random(), ty: Math.random(),
        vx: 0, vy: 0,
      });
    }

    function drawCard(ts){
      if (!active) return;
      c.clearRect(0, 0, w, h);

      // Animate nodes toward targets
      for (const n of nodes){
        n.vx += (n.tx * w - n.x * w) * 0.002;
        n.vy += (n.ty * h - n.y * h) * 0.002;
        n.vx *= 0.95; n.vy *= 0.95;
        n.x += n.vx / w; n.y += n.vy / h;
        n.x = Math.max(0.05, Math.min(0.95, n.x));
        n.y = Math.max(0.05, Math.min(0.95, n.y));

        // Occasionally pick new target
        if (Math.random() < 0.003){
          n.tx = Math.random(); n.ty = Math.random();
        }
      }

      // Draw connections
      c.lineWidth = 0.5;
      for (let i = 0; i < N; i++){
        for (let j = i+1; j < N; j++){
          const dx = (nodes[i].x - nodes[j].x) * w;
          const dy = (nodes[i].y - nodes[j].y) * h;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 100) continue;
          const alpha = (1 - dist/100) * 0.12;
          c.strokeStyle = `rgba(106,169,255,${alpha})`;
          c.beginPath();
          c.moveTo(nodes[i].x * w, nodes[i].y * h);
          c.lineTo(nodes[j].x * w, nodes[j].y * h);
          c.stroke();
        }
      }

      // Draw nodes
      for (const n of nodes){
        c.beginPath();
        c.arc(n.x * w, n.y * h, 1.5, 0, Math.PI*2);
        c.fillStyle = 'rgba(106,169,255,0.2)';
        c.fill();
      }

      animRaf = requestAnimationFrame(drawCard);
    }

    card.addEventListener('mouseenter', ()=>{
      sizeCard();
      active = true;
      animRaf = requestAnimationFrame(drawCard);
    });
    card.addEventListener('mouseleave', ()=>{
      active = false;
      cancelAnimationFrame(animRaf);
      c.clearRect(0, 0, w, h);
    });
  };

  // ── Boot ──
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
