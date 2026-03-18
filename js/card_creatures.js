// Card Creatures: subtle oscilloscope waveform in card headers
// Clean, theme-reactive, respects prefers-reduced-motion
(function(){
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const covers = Array.from(document.querySelectorAll('.card-cover'));
  if (!covers.length) return;

  // Unique seed per card for visual variety
  let seed = 0;

  function setupCover(cover){
    const canvas = document.createElement('canvas');
    canvas.className = 'card-canvas';
    cover.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const DPR = Math.max(1, Math.min(2, (window.devicePixelRatio||1)));
    let w=0, h=0, running=false, raf=0, last=0;
    const id = seed++;

    // Wave parameters — each card gets a unique combo
    const waves = [
      { freq: 0.012 + id*0.003, amp: 0.28, phase: id*1.7,  speed: 0.4 + id*0.08 },
      { freq: 0.018 + id*0.002, amp: 0.18, phase: id*2.3+1, speed: 0.6 + id*0.05 },
      { freq: 0.008 + id*0.004, amp: 0.12, phase: id*0.9+3, speed: 0.25+ id*0.12 },
    ];

    // Dot grid params
    const dotSpacing = 18;
    const dotRadius = 0.6;

    function resize(){
      const r = cover.getBoundingClientRect();
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = Math.floor(w*DPR); canvas.height = Math.floor(h*DPR);
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }

    function draw(t){
      ctx.clearRect(0,0,w,h);
      const midY = h * 0.5;

      // Subtle dot grid
      ctx.fillStyle = P.grid2;
      for(let x = dotSpacing/2; x < w; x += dotSpacing){
        for(let y = dotSpacing/2; y < h; y += dotSpacing){
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI*2);
          ctx.fill();
        }
      }

      // Draw waveforms
      const colors = [P.accent, P.blueSoft, P.greenSoft];
      const alphas = [0.5, 0.3, 0.2];

      for(let wi=0; wi<waves.length; wi++){
        const wv = waves[wi];
        ctx.beginPath();
        ctx.strokeStyle = colors[wi % colors.length];
        ctx.globalAlpha = alphas[wi];
        ctx.lineWidth = wi === 0 ? 1.5 : 1;

        for(let x=0; x<=w; x+=2){
          // Composite wave with slow modulation
          const nx = x * wv.freq;
          const envelope = 0.5 + 0.5 * Math.sin(x * 0.003 + t * 0.15 + wv.phase);
          const y = midY + Math.sin(nx + t * wv.speed + wv.phase) * h * wv.amp * envelope;

          if(x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Scanning cursor line
      const cursorX = ((t * 30 + id * 80) % (w + 40)) - 20;
      if(cursorX > 0 && cursorX < w){
        const grad = ctx.createLinearGradient(cursorX - 8, 0, cursorX + 2, 0);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.7, P.accent);
        grad.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = grad;
        ctx.fillRect(cursorX - 8, 0, 10, h);
      }

      ctx.globalAlpha = 1;
    }

    function loop(ts){
      if(!running){ last = ts; running = true; }
      const t = ts / 1000;
      draw(t);
      raf = requestAnimationFrame(loop);
    }

    function start(){ if(!raf){ resize(); raf = requestAnimationFrame(loop); } }
    function stop(){ if(raf){ cancelAnimationFrame(raf); raf=0; running=false; } }

    const ro = new ResizeObserver(()=>{ resize(); });
    ro.observe(cover);
    return { start, stop, canvas, destroy: ()=>{ stop(); ro.disconnect(); } };
  }

  const instances = new Map();
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      const cover = e.target;
      let inst = instances.get(cover);
      if(!inst){ inst = setupCover(cover); instances.set(cover, inst); }
      if(e.isIntersecting) inst.start();
      else inst.stop();
    }
  }, { root: null, rootMargin: '100px', threshold: 0 });

  covers.forEach(c => io.observe(c));
})();
