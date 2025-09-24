// Card Creatures: tiny ants/flies carrying shapes in card headers
// Lightweight, respectful of performance and prefers-reduced-motion
(function(){
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const covers = Array.from(document.querySelectorAll('.card-cover'));
  if (!covers.length) return;

  function colorFromCSSVar(el, name, fallback){
    const s = getComputedStyle(el);
    const v = s.getPropertyValue(name).trim();
    return v || fallback;
  }

  function setupCover(cover){
    const canvas = document.createElement('canvas');
    canvas.className = 'card-canvas';
    cover.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const DPR = Math.max(1, Math.min(2, (window.devicePixelRatio||1))); // cap DPR for perf
    let w=0,h=0, running=false, raf=0, last=0;

    // palette based on category variables
    const tagColor = colorFromCSSVar(cover, '--tag-color', '#444');
    const accent = colorFromCSSVar(cover, '--accent', '#1a8917');
    const stroke = tagColor || '#666';

    const MAX = 10; // agents per card
    const agents = [];
    const shapes = ['circle','square','triangle'];
    function rand(a,b){ return Math.random()*(b-a)+a; }
    function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

    function resize(){
      const r = cover.getBoundingClientRect();
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = Math.floor(w*DPR); canvas.height = Math.floor(h*DPR);
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }

    function makeAgent(){
      const type = Math.random()<0.5 ? 'ant' : 'fly';
      const x = rand(8, w-8), y = rand(8, h-8);
      const speed = type==='ant' ? rand(18,28) : rand(28,40); // px/sec
      const dir = rand(-Math.PI, Math.PI);
      const carry = Math.random()<0.45; // sometimes carrying
      return {x, y, dir, vx: Math.cos(dir)*speed, vy: Math.sin(dir)*speed, speed, type, carry, 
              shape: pick(shapes), t: rand(0,1)};
    }

    function initAgents(){
      agents.length = 0;
      const N = Math.min(MAX, Math.max(6, Math.floor(w/80))); // scale to width
      for(let i=0;i<N;i++) agents.push(makeAgent());
    }

    function wrap(a, lo, hi){ if(a<lo) return hi-(lo-a); if(a>hi) return lo+(a-hi); return a; }

    function step(dt){
      const turnAnt = 0.8;    // deg/sec-ish
      const turnFly = 2.8;
      for(const a of agents){
        // wander turning
        const turn = (a.type==='ant'?turnAnt:turnFly) * (Math.random()-0.5) * dt;
        a.dir += turn;
        a.vx = Math.cos(a.dir)*a.speed;
        a.vy = Math.sin(a.dir)*a.speed;
        a.x += a.vx*dt; a.y += a.vy*dt;
        // soft steer to keep in bounds
        if (a.x<8 || a.x>w-8 || a.y<8 || a.y>h-8){
          const cx = Math.min(Math.max(a.x, 8), w-8);
          const cy = Math.min(Math.max(a.y, 8), h-8);
          const ang = Math.atan2(cy-a.y, cx-a.x);
          a.dir = ang + rand(-0.2,0.2);
        }
        a.x = wrap(a.x, -10, w+10);
        a.y = wrap(a.y, -10, h+10);
        // toggle carry occasionally
        a.t += dt; if (a.t>rand(2,5)) { a.carry = !a.carry; a.shape = pick(shapes); a.t=0; }
      }
    }

    function draw(){
      ctx.clearRect(0,0,w,h);
      ctx.lineWidth = 1;
      for(const a of agents){
        // carried shape forward of agent
        if (a.carry){
          const ox = Math.cos(a.dir)*8, oy = Math.sin(a.dir)*8;
          const sx = a.x + ox, sy = a.y + oy;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(a.dir);
          ctx.globalAlpha = 0.85;
          ctx.strokeStyle = stroke;
          ctx.fillStyle = 'rgba(0,0,0,0)';
          if (a.shape==='circle'){
            ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.stroke();
          } else if (a.shape==='square'){
            ctx.strokeRect(-3.5,-3.5,7,7);
          } else {
            ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(4,3.5); ctx.lineTo(-4,3.5); ctx.closePath(); ctx.stroke();
          }
          // tether line
          ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(-8,0); ctx.stroke();
          ctx.restore();
        }
        // body (tiny ant/fly)
        ctx.save();
        ctx.translate(a.x, a.y); ctx.rotate(a.dir);
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = stroke;
        // body: head + thorax + abdomen simplified
        if (a.type==='ant'){
          ctx.beginPath(); ctx.ellipse(-3,0,2.2,1.6,0,0,Math.PI*2); ctx.stroke(); // head
          ctx.beginPath(); ctx.ellipse(0,0,2.6,1.8,0,0,Math.PI*2); ctx.stroke();  // thorax
          ctx.beginPath(); ctx.ellipse(4,0,3,2.1,0,0,Math.PI*2); ctx.stroke();    // abdomen
          // legs simplified
          ctx.beginPath(); ctx.moveTo(-1.5,-2); ctx.lineTo(-4,-3); ctx.moveTo(-1.5,2); ctx.lineTo(-4,3); ctx.stroke();
        } else {
          // fly: compact body + wings
          ctx.beginPath(); ctx.ellipse(0,0,3,2,0,0,Math.PI*2); ctx.stroke();
          ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.ellipse(-1.5,-2.2,2.4,1.4,0,0,Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(1.5,-2.2,2.4,1.4,0,0,Math.PI*2); ctx.stroke();
        }
        ctx.restore();
      }
    }

    function loop(ts){
      if (!running){ last = ts; running = true; }
      const dt = Math.min(0.05, (ts - last)/1000); last = ts;
      step(dt); draw();
      raf = requestAnimationFrame(loop);
    }

    function start(){ if (!raf){ resize(); initAgents(); raf = requestAnimationFrame(loop); } }
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

