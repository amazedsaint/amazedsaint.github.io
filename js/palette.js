// palette.js — theme-reactive canvas color palette
// Reads CSS custom properties so canvas drawing adapts to light/dark.
// Usage: ctx.fillStyle = P.text;  ctx.strokeStyle = P.grid;
(function(){
  var root = document.documentElement;
  var _s = null;
  function g(n, fb) {
    if (!_s) _s = getComputedStyle(root);
    return _s.getPropertyValue(n).trim() || fb;
  }
  // Invalidate on theme toggle or OS change
  new MutationObserver(function(){ _s = null; })
    .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){ _s = null; }); } catch(e){}

  window.P = {
    get grid()      { return g('--c-grid',      'rgba(0,0,0,0.07)'); },
    get grid2()     { return g('--c-grid2',     'rgba(0,0,0,0.12)'); },
    get grid3()     { return g('--c-grid3',     'rgba(0,0,0,0.18)'); },
    get text()      { return g('--c-text',      '#3f3f46'); },
    get muted()     { return g('--c-muted',     '#71717a'); },
    get dot()       { return g('--c-dot',       '#3f3f46'); },
    get blue()      { return g('--c-blue',      'rgba(79,70,229,0.85)'); },
    get blueSoft()  { return g('--c-blue-soft', 'rgba(79,70,229,0.55)'); },
    get green()     { return g('--c-green',     'rgba(5,150,105,0.85)'); },
    get greenSoft() { return g('--c-green-soft','rgba(5,150,105,0.6)'); },
    get orange()    { return g('--c-orange',    'rgba(217,119,6,0.85)'); },
    get stroke()    { return g('--c-stroke',    'rgba(0,0,0,0.2)'); },
    get stroke2()   { return g('--c-stroke2',   'rgba(0,0,0,0.35)'); },
    get accent()    { return g('--c-accent',    '#059669'); },
    get accentBg()  { return g('--c-accent-bg', 'rgba(5,150,105,0.06)'); },
  };
})();
