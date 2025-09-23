// Animated number-theory lattice with ants dragging connections (home page)
(function () {
  const canvas = document.getElementById('latticeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const state = {
    w: 0, h: 0,
    nodes: [], // {x,y,vx,vy,val,prime}
    edges: new Map(), // key `i-j` weight
    ants: [],
    anim: null,
    reduced: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  const rand = (a,b)=>Math.random()*(b-a)+a;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const key=(i,j)=> i<j? `${i}-${j}` : `${j}-${i}`;

  function isPrime(n){ if(n<2) return false; if(n%2===0) return n===2; const r=Math.sqrt(n); for(let p=3;p<=r;p+=2){ if(n%p===0) return false;} return true; }
  function gcd(a,b){ while(b!==0){ const t=b; b=a%b; a=t; } return Math.abs(a); }

  function resize(){
    state.w = canvas.width = window.innerWidth;
    state.h = canvas.height = window.innerHeight;
    initScene();
  }

  function initScene(){
    const area = state.w*state.h;
    const target = clamp(Math.floor(area*0.00005), 40, 110);
    // nodes as integers 2..N (random sample)
    state.nodes = [];
    const used = new Set();
    for(let i=0;i<target;i++){
      // sample 2..199 without too many duplicates
      let v=0, guard=0; do { v = Math.floor(rand(2,200)); guard++; } while(used.has(v) && guard<50);
      used.add(v);
      const speed=0.05;
      state.nodes.push({ x: Math.random()*state.w, y: Math.random()*state.h, vx: rand(-speed,speed), vy: rand(-speed,speed), val:v, prime:isPrime(v) });
    }
    state.edges.clear();
    // seed some edges for immediate texture (gcd>1)
    for(let i=0;i<state.nodes.length;i++){
      for(let j=i+1;j<state.nodes.length;j++){
        const a=state.nodes[i].val, b=state.nodes[j].val;
        if (gcd(a,b)>1 || a%b===0 || b%a===0){ state.edges.set(key(i,j), Math.random()*0.2); }
      }
    }
    // ants
    state.ants = [];
    const antCount = clamp(Math.floor(state.nodes.length/10), 6, 16);
    for(let k=0;k<antCount;k++) state.ants.push(makeAnt());
  }

  function makeAnt(){
    const i = Math.floor(Math.random()*state.nodes.length);
    const n = state.nodes[i];
    return {
      x:n.x+rand(-10,10), y:n.y+rand(-10,10), angle:rand(-Math.PI,Math.PI),
      size: 5+Math.random()*2, leg: Math.random()*Math.PI*2,
      cur:i, tgt: chooseNext(i), progress: 0, speed: 0.08+Math.random()*0.05
    };
  }

  function validNeighbors(idx){
    const a = state.nodes[idx].val; const res=[];
    for(let j=0;j<state.nodes.length;j++) if(j!==idx){ const b=state.nodes[j].val; if (gcd(a,b)>1 || a%b===0 || b%a===0) res.push(j); }
    return res;
  }
  function chooseNext(idx){
    const neigh = validNeighbors(idx);
    if (neigh.length===0) return Math.floor(Math.random()*state.nodes.length);
    // prefer prime/composite interplay
    const a = state.nodes[idx];
    const pref = neigh.filter(j=> state.nodes[j].prime!==a.prime);
    const pool = pref.length? pref : neigh;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function step(dt){
    // move nodes softly
    for(const p of state.nodes){
      p.x += p.vx*dt; p.y += p.vy*dt;
      p.vx += rand(-0.001,0.001); p.vy += rand(-0.001,0.001);
      const v=Math.hypot(p.vx,p.vy)||1, vmax=0.08; if(v>vmax){ p.vx=p.vx/v*vmax; p.vy=p.vy/v*vmax; }
      if (p.x<-20) p.x=state.w+20; if(p.x>state.w+20) p.x=-20; if(p.y<-20) p.y=state.h+20; if(p.y>state.h+20) p.y=-20;
    }
    // decay edges
    for(const k of state.edges.keys()){ const w=state.edges.get(k)*0.995; if(w<0.01) state.edges.delete(k); else state.edges.set(k,w); }
    // ants travel
    for(const a of state.ants){
      const A = state.nodes[a.cur]; const B = state.nodes[a.tgt];
      const dirx = B.x - a.x, diry = B.y - a.y;
      const d = Math.hypot(dirx, diry)||1;
      const nx = dirx/d, ny = diry/d;
      a.x += nx * a.speed * dt * 1.2; a.y += ny * a.speed * dt * 1.2;
      a.angle = Math.atan2(ny,nx);
      a.leg += 0.25;
      a.progress = 1 - (d / Math.hypot(B.x-A.x, B.y-A.y));
      // strengthen edge along the way
      const k = key(a.cur, a.tgt); state.edges.set(k, clamp((state.edges.get(k)||0)+0.01, 0, 1));
      if (d < 6){ a.cur = a.tgt; a.tgt = chooseNext(a.cur); }
    }
  }

  function drawAnt(a){
    ctx.save();
    ctx.translate(a.x, a.y); ctx.rotate(a.angle);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'rgba(60,40,30,0.9)';
    ctx.strokeStyle = 'rgba(40,25,15,0.9)';
    ctx.lineWidth = 1;
    const s = a.size*0.6;
    // head
    ctx.beginPath(); ctx.ellipse(-s*0.8, 0, s*0.4, s*0.3, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // thorax
    ctx.beginPath(); ctx.ellipse(-s*0.1, 0, s*0.35, s*0.25, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // abdomen
    ctx.beginPath(); ctx.ellipse(s*0.55, 0, s*0.6, s*0.4, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // antennae
    const sway = Math.sin(a.leg)*0.3; ctx.beginPath(); ctx.moveTo(-s*0.8,0); ctx.lineTo(-s*1.2, -s*0.3 + sway); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s*0.8,0); ctx.lineTo(-s*1.2, s*0.3 - sway); ctx.stroke();
    // legs
    ctx.lineWidth = 1.2; const off = Math.sin(a.leg)*0.25;
    for(let i=0;i<3;i++){ const lx=-s*0.5+i*s*0.4, ly=-s*0.4-off*(i%2? -1:1); ctx.beginPath(); ctx.moveTo(lx,0); ctx.lineTo(lx-s*0.25,ly); ctx.stroke(); }
    for(let i=0;i<3;i++){ const lx=-s*0.5+i*s*0.4, ly=s*0.4+off*(i%2? -1:1); ctx.beginPath(); ctx.moveTo(lx,0); ctx.lineTo(lx-s*0.25,ly); ctx.stroke(); }
    ctx.restore();
  }

  function draw(){
    const w=state.w,h=state.h; ctx.clearRect(0,0,w,h);
    // edges
    for(const [k,weight] of state.edges){
      const [i,j] = k.split('-').map(Number); const A=state.nodes[i], B=state.nodes[j];
      const alpha = 0.08 + weight*0.18; ctx.strokeStyle = `rgba(0,255,65,${alpha})`; ctx.lineWidth = 0.6 + weight*1.8;
      ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
    }
    // nodes (numbers)
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    for(const n of state.nodes){
      const col = n.prime? 'rgba(0,255,65,0.35)':'rgba(0,255,65,0.22)';
      ctx.fillStyle = col; ctx.fillText(String(n.val), n.x, n.y);
    }
    // ants last
    for(const a of state.ants) drawAnt(a);
  }

  let last = performance.now();
  function loop(now){ const dt=Math.min(50, now-last); last=now; step(dt); draw(); state.anim=requestAnimationFrame(loop); }

  function start(){ resize(); draw(); if(!state.reduced) state.anim=requestAnimationFrame(loop); }
  window.addEventListener('resize', ()=>{ cancelAnimationFrame(state.anim); start(); });
  if (document.readyState === 'complete' || document.readyState === 'interactive') start(); else document.addEventListener('DOMContentLoaded', start);
})();
