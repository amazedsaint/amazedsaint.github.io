(() => {
  'use strict';

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ready = (fn) => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  function initLinearUnit() {
    const cv = document.getElementById('linUnit');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = (cv.width = 520), H = (cv.height = 320);
    const pts = [];
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 2 - 1, y = Math.random() * 2 - 1;
      const label = x * 0.7 - y * 0.4 + 0.1 + (Math.random() * 0.4 - 0.2) > 0 ? 1 : 0;
      pts.push({ x, y, label });
    }
    let w0 = 1.0, w1 = -1.0, b = 0.0;
    const toPix = (x, y) => ({ x: W * 0.5 + x * 120, y: H * 0.5 - y * 120 });
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = '#eee';
      ctx.beginPath(); ctx.moveTo(20, H * 0.5); ctx.lineTo(W - 20, H * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W * 0.5, 20); ctx.lineTo(W * 0.5, H - 20); ctx.stroke();
      for (const p of pts) {
        const P = toPix(p.x, p.y);
        ctx.fillStyle = p.label ? '#1a8917' : '#b91c1c';
        ctx.beginPath(); ctx.arc(P.x, P.y, 3, 0, Math.PI * 2); ctx.fill();
      }
      if (Math.abs(w1) > 1e-6) {
        const x1 = -1.2, x2 = 1.2;
        const y1 = -(w0 / w1) * x1 - b / w1, y2 = -(w0 / w1) * x2 - b / w1;
        const P1 = toPix(x1, y1), P2 = toPix(x2, y2);
        ctx.strokeStyle = '#111';
        ctx.beginPath(); ctx.moveTo(P1.x, P1.y); ctx.lineTo(P2.x, P2.y); ctx.stroke();
      }
      const eq = `y = ${(-w0 / w1).toFixed(2)} x ${(-b / w1 >= 0 ? '+' : '-') } ${Math.abs(b / w1).toFixed(2)}`;
      const eqEl = document.getElementById('linEq');
      if (eqEl) eqEl.textContent = eq;
    }
    const bind = (id, set) => { const el = document.getElementById(id); if (el) el.oninput = (e) => { set(parseFloat(e.target.value)); draw(); }; };
    bind('w0', (v) => (w0 = v));
    bind('w1', (v) => (w1 = v));
    bind('b', (v) => (b = v));
    draw();
  }

  function initSoftmax() {
    const bars = document.querySelectorAll('[data-soft]');
    if (!bars.length) return;
    const logits = [0.5, -0.2, 1.0];
    let target = 2;
    const valEls = document.querySelectorAll('.value');
    const lossEl = document.getElementById('xent');
    const softmax = (z) => {
      const m = Math.max(...z);
      const e = z.map((v) => Math.exp(v - m));
      const s = e.reduce((a, b) => a + b, 0);
      return e.map((v) => v / s);
    };
    function render() {
      const p = softmax(logits);
      bars.forEach((el, i) => {
        const v = clamp01(p[i] || 0);
        el.style.width = v * 100 + '%';
        if (valEls[i]) valEls[i].textContent = v.toFixed(3);
      });
      const loss = -Math.log(Math.max(1e-9, p[target] || 1e-9));
      if (lossEl) lossEl.textContent = loss.toFixed(3);
    }
    ['l0','l1','l2'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.oninput = (e) => { logits[i] = parseFloat(e.target.value); render(); };
    });
    const tgtEl = document.getElementById('tgt');
    if (tgtEl) tgtEl.onchange = (e) => { target = parseInt(e.target.value, 10); render(); };
    render();
  }

  function initAttention() {
    const cv = document.getElementById('attn'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = (cv.width = 520), H = (cv.height = 220);
    let n = 5, d = 3, temp = 1.0, qi = 2; let Q = [], K = [];
    const rand = () => Math.random() * 2 - 1;
    const init = () => { Q = Array.from({ length: n }, () => Array.from({ length: d }, rand)); K = Array.from({ length: n }, () => Array.from({ length: d }, rand)); };
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const softmax = (a) => { const m = Math.max(...a); const e = a.map((v) => Math.exp(v - m)); const s = e.reduce((x, y) => x + y, 0); return e.map((v) => v / s); };
    function render() {
      ctx.clearRect(0, 0, W, H);
      const cell = 26, offx = 30, offy = 30;
      const scores = []; for (let j = 0; j < n; j++) scores.push(dot(Q[qi], K[j]) / Math.max(1e-6, temp));
      const w = softmax(scores);
      for (let j = 0; j < n; j++) {
        const x = offx + j * cell, y = offy;
        const val = w[j];
        ctx.fillStyle = `rgba(26,137,23,${0.15 + 0.75 * val})`;
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeStyle = '#ccc'; ctx.strokeRect(x, y, cell, cell);
        ctx.fillStyle = '#111'; ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace';
        ctx.fillText(String(j), x + 8, y - 6);
      }
      ctx.fillStyle = '#666'; ctx.fillText('weights for query q[' + qi + ']', offx, offy + cell + 16);
    }
    const tempEl = document.getElementById('temp'); if (tempEl) tempEl.oninput = (e) => { temp = parseFloat(e.target.value); render(); };
    const qEl = document.getElementById('qpick'); if (qEl) qEl.oninput = (e) => { qi = parseInt(e.target.value, 10); render(); };
    init(); render();
  }

  function initPosEnc() {
    const cv = document.getElementById('posenc'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = (cv.width = 520), H = (cv.height = 160);
    let L = 32, d = 8;
    const enc = (pos, i) => { const div = Math.pow(10000, (2 * Math.floor(i / 2)) / d); return (i % 2 === 0) ? Math.sin(pos / div) : Math.cos(pos / div); };
    function render() {
      ctx.clearRect(0, 0, W, H);
      const offx = 30, offy = H * 0.5; ctx.strokeStyle = '#eee';
      ctx.beginPath(); ctx.moveTo(20, offy); ctx.lineTo(W - 20, offy); ctx.stroke();
      const scaleX = (W - 60) / L, scaleY = 28;
      for (let c = 0; c < Math.min(6, d); c++) {
        ctx.strokeStyle = `hsl(${(c * 60) % 360},60%,40%)`;
        ctx.beginPath();
        for (let x = 0; x <= L; x++) {
          const y = enc(x, c);
          const X = offx + x * scaleX; const Y = offy - y * scaleY - c * 2;
          if (x === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        ctx.stroke();
      }
    }
    const LEl = document.getElementById('L'); if (LEl) LEl.oninput = (e) => { L = parseInt(e.target.value, 10); render(); };
    const DEl = document.getElementById('D'); if (DEl) DEl.oninput = (e) => { d = parseInt(e.target.value, 10); render(); };
    render();
  }

  function initLayerNorm() {
    const cv = document.getElementById('ln'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = (cv.width = 520), H = (cv.height = 150);
    const vec = [1.2, -0.6, 0.4, 2.0, -1.0];
    const norm = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; const s = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length + 1e-6); return v.map((x) => (x - m) / s); };
    function render() {
      ctx.clearRect(0, 0, W, H);
      const offx = 30, base = H * 0.75, scale = 20, bw = 20;
      ctx.fillStyle = '#666'; ctx.fillText('values', offx, 18);
      for (let i = 0; i < vec.length; i++) { const h = vec[i] * scale; const x = offx + i * (bw + 8); ctx.fillStyle = '#3b82f6'; ctx.fillRect(x, base - Math.max(0, h), bw, Math.abs(h)); }
      const nv = norm(vec); ctx.fillStyle = '#666'; ctx.fillText('layer‑norm', offx + 200, 18);
      for (let i = 0; i < nv.length; i++) { const h = nv[i] * scale; const x = offx + 200 + i * (bw + 8); ctx.fillStyle = '#1a8917'; ctx.fillRect(x, base - Math.max(0, h), bw, Math.abs(h)); }
    }
    render();
  }

  function initReceptive() {
    const cv = document.getElementById('rf'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = (cv.width = 520), H = (cv.height = 140);
    let N = 12, k = 3, center = 6, mode = 'attn';
    function render() {
      ctx.clearRect(0, 0, W, H);
      const offx = 20, y = H * 0.5, cell = (W - 40) / N;
      for (let i = 0; i < N; i++) {
        const x = offx + i * cell; let highlight = false;
        if (mode === 'attn') highlight = true; else { const half = Math.floor(k / 2); highlight = i >= center - half && i <= center + half; }
        ctx.fillStyle = highlight ? (i === center ? '#1a8917' : 'rgba(26,137,23,0.3)') : '#eee';
        ctx.fillRect(x, y - 14, cell - 4, 28);
        ctx.strokeStyle = '#ccc'; ctx.strokeRect(x, y - 14, cell - 4, 28);
        if (i === center) { ctx.fillStyle = '#111'; ctx.fillText('•', x + cell * 0.35, y + 4); }
      }
      ctx.fillStyle = '#666'; ctx.fillText(mode === 'attn' ? 'Self‑attention sees all positions' : `Conv kernel size ${k} sees local window`, offx, y + 36);
    }
    const modeEl = document.getElementById('mode'); if (modeEl) modeEl.onchange = (e) => { mode = e.target.value; render(); };
    const kernEl = document.getElementById('kern'); if (kernEl) kernEl.oninput = (e) => { k = parseInt(e.target.value, 10); render(); };
    const centEl = document.getElementById('center'); if (centEl) centEl.oninput = (e) => { center = parseInt(e.target.value, 10); render(); };
    render();
  }

  function initGD() {
    const cv = document.getElementById('gd'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = (cv.width = 520), H = (cv.height = 320);
    const a = 1.0, b = 0.6, c = 0.8; let x = 1.2, y = -0.8, lr = 0.2; let running = false;
    const f = (x, y) => a * x * x + b * x * y + c * y * y;
    const grad = (x, y) => ({ gx: 2 * a * x + b * y, gy: b * x + 2 * c * y });
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const offx = 40, offy = H - 40, S = 60;
      for (let i = -8; i <= 8; i++) {
        for (let j = -8; j <= 8; j++) {
          const xx = i / 4, yy = j / 4; const val = f(xx, yy);
          const col = clamp01((val - 0) / 6);
          ctx.fillStyle = `rgba(26,137,23,${0.04 + 0.26 * col})`;
          const X = offx + xx * S, Y = offy - yy * S; ctx.fillRect(X - 10, Y - 10, 20, 20);
        }
      }
      const levels = [0.2, 0.5, 1, 2, 3, 4, 5]; ctx.fillStyle = 'rgba(17,17,17,0.3)';
      for (const L of levels) {
        for (let i = -24; i <= 24; i++) {
          for (let j = -24; j <= 24; j++) {
            const xx = i / 8, yy = j / 8; const val = f(xx, yy);
            if (Math.abs(val - L) < 0.03) { const X = offx + xx * S, Y = offy - yy * S; ctx.fillRect(X - 1, Y - 1, 2, 2); }
          }
        }
      }
      ctx.strokeStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(offx - 20, offy); ctx.lineTo(W - 20, offy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(offx, 20); ctx.lineTo(offx, H - 20); ctx.stroke();
      const X = offx + x * S, Y = offy - y * S; const g = grad(x, y); const gscale = 20;
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(X, Y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - g.gx * gscale, Y + g.gy * gscale); ctx.stroke();
      const xy = document.getElementById('gdxy'); if (xy) xy.textContent = `x=${x.toFixed(2)}, y=${y.toFixed(2)}, f=${f(x, y).toFixed(3)}`;
    }
    function step() { const g = grad(x, y); x = x - lr * g.gx; y = y - lr * g.gy; draw(); }
    const lrEl = document.getElementById('gdLR'); if (lrEl) lrEl.oninput = (e) => { lr = parseFloat(e.target.value); };
    const btnStep = document.getElementById('gdStep'); if (btnStep) btnStep.onclick = step;
    const btnReset = document.getElementById('gdReset'); if (btnReset) btnReset.onclick = () => { x = 1.2; y = -0.8; draw(); };
    const btnRun = document.getElementById('gdRun'); if (btnRun) btnRun.onclick = () => { running = !running; btnRun.textContent = running ? 'Pause' : 'Run'; if (running) loop(); };
    function loop() { if (!running) return; step(); requestAnimationFrame(loop); }
    draw();
  }

  function initMLP() {
    const cv = document.getElementById('mlp'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = (cv.width = 520), H = (cv.height = 220);
    let w1a = 3.0, b1a = 0.0, v1a = 1.0;
    let w1b = -2.0, b1b = 0.5, v1b = 1.0;
    let b2 = 0.0;
    const target = (x) => Math.sin(Math.PI * x) * 0.8;
    const relu = (z) => Math.max(0, z);
    const yhat = (x) => v1a * relu(w1a * x + b1a) + v1b * relu(w1b * x + b1b) + b2;
    function draw() {
      ctx.clearRect(0, 0, W, H); const offx = 30, offy = H * 0.5, scaleX = (W - 60) / 2, scaleY = 60;
      ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(offx, offy); ctx.lineTo(W - 30, offy); ctx.stroke();
      ctx.strokeStyle = '#bbb'; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const x = -1 + (2 * i) / 200; const y = target(x); const X = offx + (x + 1) * scaleX; const Y = offy - y * scaleY; if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
      ctx.stroke();
      ctx.strokeStyle = '#1a8917'; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const x = -1 + (2 * i) / 200; const y = yhat(x); const X = offx + (x + 1) * scaleX; const Y = offy - y * scaleY; if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
      ctx.stroke();
      const eqEl = document.getElementById('mlpeq');
      if (eqEl) eqEl.textContent = `y = ${v1a.toFixed(2)}·ReLU(${w1a.toFixed(2)}x+${b1a.toFixed(2)}) + ${v1b.toFixed(2)}·ReLU(${w1b.toFixed(2)}x+${b1b.toFixed(2)}) + ${b2.toFixed(2)}`;
    }
    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.oninput = (e) => { fn(parseFloat(e.target.value)); draw(); }; };
    bind('w1a', (v) => (w1a = v)); bind('b1a', (v) => (b1a = v)); bind('v1a', (v) => (v1a = v));
    bind('w1b', (v) => (w1b = v)); bind('b1b', (v) => (b1b = v)); bind('v1b', (v) => (v1b = v)); bind('b2', (v) => (b2 = v));
    const x0El = document.getElementById('x0');
    if (x0El) x0El.oninput = (e) => {
      const x0 = parseFloat(e.target.value);
      const t = target(x0);
      const z1a = w1a * x0 + b1a, z1b = w1b * x0 + b1b;
      const r1a = relu(z1a), r1b = relu(z1b);
      const y = yhat(x0);
      const dLdy = y - t;
      const dz1a = z1a > 0 ? 1 : 0, dz1b = z1b > 0 ? 1 : 0;
      const grads = {
        dv1a: dLdy * r1a,
        dv1b: dLdy * r1b,
        db2: dLdy,
        dw1a: dLdy * v1a * dz1a * x0,
        db1a: dLdy * v1a * dz1a,
        dw1b: dLdy * v1b * dz1b * x0,
        db1b: dLdy * v1b * dz1b,
      };
      const panel = document.getElementById('grads');
      if (panel) panel.innerHTML = `∂L/∂v1a=${grads.dv1a.toFixed(3)}, ∂L/∂v1b=${grads.dv1b.toFixed(3)}, ∂L/∂b=${grads.db2.toFixed(3)} | ∂L/∂w1a=${grads.dw1a.toFixed(3)}, ∂L/∂b1a=${grads.db1a.toFixed(3)}, ∂L/∂w1b=${grads.dw1b.toFixed(3)}, ∂L/∂b1b=${grads.db1b.toFixed(3)}`;
    };
    draw();
  }

  function initBPE() {
    const area = document.getElementById('bpeArea'); if (!area) return;
    const inp = document.getElementById('bpeInput'); const out = document.getElementById('bpeTokens'); const pairsEl = document.getElementById('bpePairs'); const mergesEl = document.getElementById('bpeMerges');
    let tokens = [], merges = [];
    function tokenize() { const s = (inp && inp.value) || 'the other brother'; tokens = s.trim().split(/\s+/).join('▁').split(''); render(); }
    function countPairs() { const counts = new Map(); for (let i = 0; i < tokens.length - 1; i++) { const pair = tokens[i] + ' ' + tokens[i + 1]; counts.set(pair, (counts.get(pair) || 0) + 1); } return counts; }
    function topPair() { const c = countPairs(); let best = null, bestc = 0; c.forEach((v, k) => { if (v > bestc) { bestc = v; best = k; } }); return { pair: best, count: bestc }; }
    function mergeOnce() { const t = topPair(); if (!t.pair) return; merges.push(t.pair.replace(' ', '▁')); const [a, b] = t.pair.split(' '); const res = []; let i = 0; while (i < tokens.length) { if (i < tokens.length - 1 && tokens[i] === a && tokens[i + 1] === b) { res.push(a + b); i += 2; } else { res.push(tokens[i]); i++; } } tokens = res; render(); }
    function render() {
      if (out) { out.innerHTML = ''; tokens.forEach((tok) => { const span = document.createElement('span'); span.className = 'token'; span.textContent = tok; out.appendChild(span); }); }
      const c = countPairs(); if (pairsEl) { pairsEl.innerHTML = ''; Array.from(c.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => { const p = document.createElement('span'); p.className = 'pair'; p.textContent = `${k} × ${v}`; pairsEl.appendChild(p); }); }
      if (mergesEl) mergesEl.textContent = merges.join(', ');
    }
    const stepBtn = document.getElementById('bpeStep'); if (stepBtn) stepBtn.onclick = mergeOnce;
    const resetBtn = document.getElementById('bpeReset'); if (resetBtn) resetBtn.onclick = () => { merges = []; tokenize(); };
    tokenize();
  }

  function initAttnAgg() {
    const cv = document.getElementById('attnAgg'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = (cv.width = 520), H = (cv.height = 220);
    let n = 5, d = 3, temp = 1.0, qi = 2; let Q = [], K = [], V = [];
    const rand = () => Math.random() * 2 - 1;
    const init = () => { Q = Array.from({ length: n }, () => Array.from({ length: d }, rand)); K = Array.from({ length: n }, () => Array.from({ length: d }, rand)); V = Array.from({ length: n }, () => Array.from({ length: d }, rand)); };
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const softmax = (a) => { const m = Math.max(...a); const e = a.map((v) => Math.exp(v - m)); const s = e.reduce((x, y) => x + y, 0); return e.map((v) => v / s); };
    function render() {
      ctx.clearRect(0, 0, W, H);
      const offx = 30, offy = 40, cell = 20;
      const scores = []; for (let j = 0; j < n; j++) scores.push(dot(Q[qi], K[j]) / Math.max(1e-6, temp));
      const w = softmax(scores);
      for (let j = 0; j < n; j++) {
        const x = offx, y = offy + j * (cell + 8);
        ctx.fillStyle = '#666'; ctx.fillText(`pos ${j}`, x, y - 6);
        for (let k = 0; k < d; k++) { const val = V[j][k]; const len = val * 30; ctx.fillStyle = val >= 0 ? '#3b82f6' : '#b91c1c'; ctx.fillRect(x + 50 + k * 60, y, len, 6); }
        ctx.fillStyle = '#1a8917'; ctx.fillRect(W - 140, y, w[j] * 100, 6);
      }
      const agg = Array.from({ length: d }, (_, k) => V.reduce((s, vec, idx) => s + w[idx] * vec[k], 0));
      ctx.fillStyle = '#666'; ctx.fillText('result', offx, offy + n * (cell + 8) + 14);
      for (let k = 0; k < d; k++) { const val = agg[k]; const len = val * 40; ctx.fillStyle = val >= 0 ? '#1a8917' : '#b91c1c'; ctx.fillRect(offx + 50 + k * 60, offy + n * (cell + 8) + 8, len, 8); }
    }
    const tEl = document.getElementById('aggTemp'); if (tEl) tEl.oninput = (e) => { temp = parseFloat(e.target.value); render(); };
    const qEl = document.getElementById('aggQ'); if (qEl) qEl.oninput = (e) => { qi = parseInt(e.target.value, 10); render(); };
    init(); render();
  }

  function initMultiHead() {
    const grid = document.getElementById('mhaGrid'); if (!grid) return;
    let n = 6, d = 6, h = 4, temp = 1.0, qi = 3; let Q = [], K = [];
    const rand = () => Math.random() * 2 - 1;
    const init = () => { Q = Array.from({ length: n }, () => Array.from({ length: d }, rand)); K = Array.from({ length: n }, () => Array.from({ length: d }, rand)); };
    const splitHeads = (M) => { const dhead = Math.floor(d / h); const heads = []; for (let hh = 0; hh < h; hh++) heads.push(M.map((row) => row.slice(hh * dhead, (hh + 1) * dhead))); return heads; };
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const softmax = (a) => { const m = Math.max(...a); const e = a.map((v) => Math.exp(v - m)); const s = e.reduce((x, y) => x + y, 0); return e.map((v) => v / s); };
    function render() {
      grid.innerHTML = '';
      const Qh = splitHeads(Q), Kh = splitHeads(K);
      for (let hh = 0; hh < h; hh++) {
        const box = document.createElement('div'); box.className = 'headbox';
        const title = document.createElement('div'); title.textContent = `head ${hh}`; title.style.marginBottom = '6px'; box.appendChild(title);
        const cnv = document.createElement('canvas'); cnv.width = 140; cnv.height = 120; box.appendChild(cnv); grid.appendChild(box);
        const ctx = cnv.getContext('2d');
        const scores = []; for (let j = 0; j < n; j++) scores.push(dot(Qh[hh][qi], Kh[hh][j]) / Math.max(1e-6, temp));
        const w = softmax(scores);
        for (let j = 0; j < n; j++) { const x = 12, y = 14 + j * 16; const val = w[j]; ctx.fillStyle = `rgba(26,137,23,${0.18 + 0.75 * val})`; ctx.fillRect(x, y, 110, 12); ctx.fillStyle = '#111'; ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace'; ctx.fillText(`pos ${j}`, x, y - 2); }
      }
    }
    const tempEl = document.getElementById('mhaTemp'); if (tempEl) tempEl.oninput = (e) => { temp = parseFloat(e.target.value); render(); };
    const qEl = document.getElementById('mhaQ'); if (qEl) qEl.oninput = (e) => { qi = parseInt(e.target.value, 10); render(); };
    const hEl = document.getElementById('mhaH'); if (hEl) hEl.oninput = (e) => { h = parseInt(e.target.value, 10); render(); };
    init(); render();
  }

  function initFFN() {
    const cv = document.getElementById('ffn'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = (cv.width = 520), H = (cv.height = 180);
    const d = 8, df = 16; const x = Array.from({ length: d }, () => Math.random() * 2 - 1);
    const relu = (v) => Math.max(0, v);
    const makeMat = (m, n) => Array.from({ length: m }, () => Array.from({ length: n }, () => (Math.random() * 2 - 1) * 0.6));
    const W1 = makeMat(df, d), W2 = makeMat(d, df);
    const matvec = (M, v) => M.map((row) => row.reduce((s, wij, j) => s + wij * v[j], 0));
    function draw() {
      ctx.clearRect(0, 0, W, H); const offx = 30, base = H * 0.75, bw = 14, gap = 6;
      ctx.fillStyle = '#666'; ctx.fillText('x (d_model)', offx, 16);
      for (let i = 0; i < d; i++) { const h = x[i] * 24; const X = offx + i * (bw + gap); ctx.fillStyle = h >= 0 ? '#3b82f6' : '#b91c1c'; ctx.fillRect(X, base - Math.max(0, h), bw, Math.abs(h)); }
      const hvec = matvec(W1, x).map(relu); ctx.fillStyle = '#666'; ctx.fillText('ReLU(W1x)', offx + 200, 16);
      for (let i = 0; i < Math.min(12, df); i++) { const h = hvec[i] * 14; const X = offx + 200 + i * (bw + gap); ctx.fillStyle = h >= 0 ? '#1a8917' : '#b91c1c'; ctx.fillRect(X, base - Math.max(0, h), bw, Math.abs(h)); }
      const yvec = matvec(W2, hvec); ctx.fillStyle = '#666'; ctx.fillText('W2h (back to d_model)', offx + 400, 16);
      for (let i = 0; i < d; i++) { const h = yvec[i] * 24; const X = offx + 400 + i * (bw + gap); ctx.fillStyle = h >= 0 ? '#1a8917' : '#b91c1c'; ctx.fillRect(X, base - Math.max(0, h), bw, Math.abs(h)); }
    }
    draw();
  }

  function initTransformer() {
    const cv = document.getElementById('tf'); if (!cv) return;
    const ctx = cv.getContext('2d'); const W = (cv.width = 520), H = (cv.height = 220);
    const d = 8, n = 6;
    const rand = () => (Math.random() * 2 - 1) * 0.7;
    const randomX = () => Array.from({ length: n }, () => Array.from({ length: d }, rand));
    const randMat = (m, n) => Array.from({ length: m }, () => Array.from({ length: n }, rand));
    const matvec = (M, v) => M.map((row) => row.reduce((s, wij, j) => s + wij * v[j], 0));
    const softmax = (a) => { const m = Math.max(...a); const e = a.map((v) => Math.exp(v - m)); const s = e.reduce((x, y) => x + y, 0); return e.map((v) => v / s); };
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const ln = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; const s = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length + 1e-6); return v.map((x) => (x - m) / s); };
    const relu = (x) => Math.max(0, x);
    let X = randomX();
    const Wq = randMat(d, d), Wk = randMat(d, d), Wv = randMat(d, d);
    const W1 = randMat(16, d), W2 = randMat(d, 16);
    let stage = 0;
    function attnBlock(X0) {
      const Xin = X0.map(ln);
      const Q = Xin.map((v) => matvec(Wq, v)), K = Xin.map((v) => matvec(Wk, v)), V = Xin.map((v) => matvec(Wv, v));
      const Y = [];
      for (let i = 0; i < n; i++) {
        const scores = []; for (let j = 0; j < n; j++) scores.push(dot(Q[i], K[j]) / Math.sqrt(d));
        const w = softmax(scores); const yi = Array(d).fill(0);
        for (let j = 0; j < n; j++) { for (let k = 0; k < d; k++) yi[k] += w[j] * V[j][k]; }
        Y.push(yi);
      }
      return X0.map((v, i) => v.map((xk, k) => xk + Y[i][k]));
    }
    function ffnBlock(X0) {
      const Xin = X0.map(ln); const Hh = Xin.map((v) => matvec(W1, v).map(relu)); const Y = Hh.map((h) => matvec(W2, h));
      return X0.map((v, i) => v.map((xk, k) => xk + Y[i][k]));
    }
    function draw() {
      ctx.clearRect(0, 0, W, H); const offx = 20, base = H * 0.75, bw = 10, gap = 4;
      const title = ['Input', 'Self‑Attn', 'Add&Norm', 'FFN', 'Add&Norm'][stage] || 'Add&Norm';
      ctx.fillStyle = '#666'; ctx.fillText(title, offx, 16);
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < d; k++) { const val = X[i][k]; const h = val * 16; const x = offx + k * (bw + gap) + i * (d * (bw + gap) + 12); ctx.fillStyle = h >= 0 ? '#3b82f6' : '#b91c1c'; ctx.fillRect(x, base - Math.max(0, h), bw, Math.abs(h)); }
      }
    }
    function step() { if (stage === 0) { X = attnBlock(X); stage = 1; } else if (stage === 1) { stage = 2; } else if (stage === 2) { X = ffnBlock(X); stage = 3; } else { stage = 4; } draw(); }
    function reset() { X = randomX(); stage = 0; draw(); }
    const stepBtn = document.getElementById('tfStep'); if (stepBtn) stepBtn.onclick = step;
    const resetBtn = document.getElementById('tfReset'); if (resetBtn) resetBtn.onclick = reset;
    draw();
  }

  function initAll() {
    initLinearUnit();
    initSoftmax();
    initAttention();
    initPosEnc();
    initLayerNorm();
    initReceptive();
    initGD();
    initMLP();
    initBPE();
    initAttnAgg();
    initMultiHead();
    initFFN();
    initTransformer();
  }

  ready(initAll);
})();

