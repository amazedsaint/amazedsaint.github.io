(function(){
  function init(){
    document.querySelectorAll('.connections .header').forEach(h => {
      const box = h.closest('.connections'); if(!box) return;
      // collapsed by default
      box.classList.remove('open');
      h.addEventListener('click', ()=> box.classList.toggle('open'));
      // keyboard
      h.setAttribute('tabindex','0');
      h.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); box.classList.toggle('open'); }});
    });
  }
  if (document.readyState==='complete' || document.readyState==='interactive') init(); else document.addEventListener('DOMContentLoaded', init);
})();

