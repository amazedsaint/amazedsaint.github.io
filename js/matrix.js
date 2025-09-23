// Matrix Rain Canvas - lightweight overlay
(function () {
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const state = {
    w: 0,
    h: 0,
    fontSize: 16,
    columns: 0,
    drops: [],
    chars: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    anim: null,
    frame: 0,
  };

  const path = (typeof window !== 'undefined') ? window.location.pathname : '/';
  const isHome = path === '/' || /\/index\.html$/.test(path);
  const mellow = !isHome; // inside pages are mellow

  function resize() {
    state.w = canvas.width = window.innerWidth;
    state.h = canvas.height = window.innerHeight;
    const scale = Math.max(0.9, Math.min(1.4, state.w / 1440));
    state.fontSize = Math.round(16 * scale * (mellow ? 1.35 : 1.0));
    state.columns = Math.ceil(state.w / state.fontSize);
    state.drops = Array(state.columns).fill(0).map(() => Math.floor(Math.random() * -50));
    ctx.font = `${state.fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace`;
    // softer overall presence on inside pages
    if (mellow) canvas.style.opacity = '0.10';
  }

  function draw() {
    state.frame++;
    // Fade the entire canvas slightly to create trails
    ctx.fillStyle = mellow ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, state.w, state.h);

    const columnSkip = mellow ? 2 : 1; // draw every 2nd column on inside pages
    const advanceFrame = mellow ? (state.frame % 2 === 0) : true; // half speed

    for (let i = 0; i < state.columns; i++) {
      if (columnSkip > 1 && (i % columnSkip !== 0)) continue;
      const x = i * state.fontSize;
      const y = state.drops[i] * state.fontSize;

      // random char
      const char = state.chars[Math.floor(Math.random() * state.chars.length)];

      // bright head (dimmer on inside pages)
      ctx.fillStyle = mellow ? 'rgba(0, 255, 65, 0.6)' : 'rgba(0, 255, 65, 0.9)';
      ctx.fillText(char, x, y);

      // dim tail
      ctx.fillStyle = mellow ? 'rgba(0, 200, 50, 0.25)' : 'rgba(0, 200, 50, 0.5)';
      ctx.fillText(char, x, y - state.fontSize);

      // move down, reset randomly after passing bottom
      if (advanceFrame) {
        const resetThresh = mellow ? 0.992 : 0.975;
        if (y > state.h && Math.random() > resetThresh) {
          state.drops[i] = 0;
        } else {
          state.drops[i] += 1;
        }
      }
    }
    state.anim = requestAnimationFrame(draw);
  }

  function start() {
    resize();
    // initial black layer so first frames look clean
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, state.w, state.h);
    draw();
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(state.anim);
    start();
  });

  // start after fonts/paint ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
