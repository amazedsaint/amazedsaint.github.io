// Card Creatures: tiny ants/flies carrying shapes in card headers
// Lightweight, respectful of performance and prefers-reduced-motion
// Less motion: mini number lattice with ants reinforcing edges
(function(){
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const covers = Array.from(document.querySelectorAll('.card-cover'));
  if (!covers.length) return;

  function cssVar(el, name, fallback){
    const s = getComputedStyle(el);
    const v = s.getPropertyValue(name).trim();
    return v || fallback;
  }

  function isPrime(n){ if(n<2) return false; if(n%2===0) return n===2; const r=Math.sqrt(n); for(let p=3;p<=r;p+=2){ if(n%p===0) return false;} return true; }
  function gcd(a,b){ while(b!==0){ const t=b; b=a%b; a=t; } return Math.abs(a); }
  function key(i,j){ return i<j? `${i}-${j}` : `${j}-${i}`; }

  function setupCover(cover){
    const canvas = document.createElement('canvas');
    canvas.className = 'card-canvas';
    cover.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const DPR = Math.max(1, Math.min(2, (window.devicePixelRatio||1))); // cap DPR for perf
    let w=0,h=0, running=false, raf=0, last=0;

    // palette
    const tagColor = cssVar(cover, '--tag-color', '#444');
    const textColor = 'rgba(0,0,0,0.70)';
    const edgeAlphaBase = 0.06;

    // state
    let nodes = []; // {x,y,vx,vy,val,prime}
    let edges = new Map(); // key -> weight
    let ants = [];  // {cur,tgt,progress,speed}

    function rand(a,b){ return Math.random()*(b-a)+a; }
    function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }

    function resize(){
      const r = cover.getBoundingClientRect();
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = Math.floor(w*DPR); canvas.height = Math.floor(h*DPR);
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }

    function init(){
      nodes = [];
      edges.clear();
      ants = [];
      const N = clamp(Math.floor(w/70), 8, 14);
      const used = new Set();
      for(let i=0;i<N;i++){
        let v=0, guard=0; do { v = Math.floor(rand(2,200)); guard++; } while(used.has(v) && guard<40);
        used.add(v);
        const speed=rand(4,8); // px/sec (very slow)
        nodes.push({ x: rand(10,w-10), y: rand(12,h-12), vx: rand(-1,1), vy: rand(-1,1), val:v, prime:isPrime(v), sp:speed });
      }
      // edges: gcd/divisibility
      for(let i=0;i<N;i++){
        for(let j=i+1;j<N;j++){
          const a=nodes[i].val, b=nodes[j].val;
          if (gcd(a,b)>1 || a%b===0 || b%a===0){ edges.set(key(i,j), Math.random()*0.15+0.05); }
        }
      }
      // ensure some structure
      if (edges.size < N){
        for(let i=0;i<N;i++){
          // nearest neighbor fallback
          let best=-1, bd=1e9;
          for(let j=0;j<N;j++) if(j!==i){
            const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y; const d=dx*dx+dy*dy;
            if(d<bd){ bd=d; best=j; }
          }
          if (best>=0) edges.set(key(i,best), Math.random()*0.1+0.05);
        }
      }
      // ants
      const A = clamp(Math.floor(N/4), 2, 4);
      for(let k=0;k<A;k++) ants.push(makeAnt(N));
    }

    function neighbors(i){
      const res=[];
      for(let j=0;j<nodes.length;j++) if(j!==i){ if (edges.has(key(i,j))) res.push(j); }
      return res;
    }

    function chooseNext(i){
      const nb = neighbors(i);
      if (!nb.length) return Math.floor(rand(0,nodes.length));
      // prefer cross prime/composite
      const a = nodes[i];
      const pref = nb.filter(j=> nodes[j].prime!==a.prime);
      const pool = pref.length? pref : nb;
      return pool[Math.floor(rand(0,pool.length))];
    }

    function makeAnt(N){
      const cur = Math.floor(rand(0,N));
      const tgt = chooseNext(cur);
      const speed = rand(10,16); // px/sec, calm
      return { cur, tgt, progress: 0, speed };
    }

    function step(dt){
      // nodes slow drift
      for(const p of nodes){
        p.x += p.vx*dt*p.sp*0.2; p.y += p.vy*dt*p.sp*0.2;
        p.vx += rand(-0.02,0.02); p.vy += rand(-0.02,0.02);
        const v=Math.hypot(p.vx,p.vy)||1, vmax=0.6; if(v>vmax){ p.vx=p.vx/v*vmax; p.vy=p.vy/v*vmax; }
        if (p.x<8) { p.x=8; p.vx=Math.abs(p.vx); }
        if (p.x>w-8){ p.x=w-8; p.vx=-Math.abs(p.vx); }
        if (p.y<10){ p.y=10; p.vy=Math.abs(p.vy); }
        if (p.y>h-10){ p.y=h-10; p.vy=-Math.abs(p.vy); }
      }
      // decay edges
      for(const k of Array.from(edges.keys())){
        const wgt = edges.get(k)*0.995;
        if (wgt<0.01) edges.delete(k); else edges.set(k, wgt);
      }
      // ants move
      for(const a of ants){
        const A = nodes[a.cur]; const B = nodes[a.tgt];
        const dx=B.x-A.x, dy=B.y-A.y; const d=Math.hypot(dx,dy)||1;
        const stepLen = a.speed*dt;
        a.progress = Math.min(1, a.progress + stepLen/d);
        // strengthen edge
        const k = key(a.cur, a.tgt);
        edges.set(k, clamp((edges.get(k)||0)+0.02, 0, 1));
        if (a.progress>=1){ a.cur = a.tgt; a.tgt = chooseNext(a.cur); a.progress=0; }
      }
    }

    function draw(){
      ctx.clearRect(0,0,w,h);
      // edges under
      ctx.lineWidth = 1;
      for(const [kk,weight] of edges){
        const [i,j] = kk.split('-').map(Number); const A=nodes[i], B=nodes[j];
        const alpha = edgeAlphaBase + weight*0.18;
        ctx.strokeStyle = tagColor; ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }
      // numbers
      ctx.globalAlpha = 0.85; ctx.fillStyle = textColor; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace';
      for(const n of nodes){ ctx.fillText(String(n.val), n.x, n.y); }
      // ants as tiny triangles
      ctx.globalAlpha = 0.8; ctx.strokeStyle = tagColor; ctx.fillStyle = tagColor;
      for(const a of ants){
        const A = nodes[a.cur]; const B = nodes[a.tgt];
        const t = a.progress; const x=A.x+(B.x-A.x)*t; const y=A.y+(B.y-A.y)*t;
        const ang = Math.atan2(B.y-A.y, B.x-A.x);
        ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-4,2); ctx.lineTo(-4,-2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function loop(ts){
      if (!running){ last = ts; running = true; }
      const dt = Math.min(0.05, (ts - last)/1000); last = ts;
      step(dt); draw();
      raf = requestAnimationFrame(loop);
    }

    function start(){ if (!raf){ resize(); init(); raf = requestAnimationFrame(loop); } }
    function stop(){ if (raf){ cancelAnimationFrame(raf); raf=0; running=false; } }

    const ro = new ResizeObserver(()=>{ resize(); });
    ro.observe(cover);
    return { start, stop, canvas, destroy: ()=>{ stop(); ro.disconnect(); } };
  }

  const instances = new Map();
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      const cover = e.target;
      let inst = instances.get(cover);
      if (!inst){ inst = setupCover(cover); instances.set(cover, inst); }
      if (e.isIntersecting){ inst.start(); }
      else { inst.stop(); }
    }
  }, { root: null, rootMargin: '100px', threshold: 0 });

  covers.forEach(c => io.observe(c));
})();
