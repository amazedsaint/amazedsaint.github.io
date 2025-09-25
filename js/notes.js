(function(){
  let tip;
  function ensureTip(){
    if (tip) return tip;
    tip = document.createElement('div');
    tip.id = 'ideaNote';
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(text, x, y){
    const el = ensureTip();
    el.innerHTML = text;
    el.style.left = Math.min(window.innerWidth-320, x+12) + 'px';
    el.style.top = Math.min(window.innerHeight-140, y+12) + 'px';
    el.style.opacity = '1';
  }
  function hideTip(){ if(tip) tip.style.opacity='0'; }
  function bind(container){
    container.addEventListener('mousemove', (e)=>{
      const t = e.target.closest('.idea');
      if (!t) { hideTip(); return; }
      const note = t.getAttribute('data-note');
      if (note) showTip(note, e.clientX, e.clientY);
    });
    container.addEventListener('mouseleave', hideTip);
    container.addEventListener('touchstart', (e)=>{
      const t = e.target.closest('.idea');
      if (!t) return; const note=t.getAttribute('data-note'); if(!note) return;
      const touch = e.touches[0]; showTip(note, touch.clientX, touch.clientY);
      setTimeout(()=> hideTip(), 1500);
    }, {passive:true});
    window.addEventListener('scroll', hideTip, {passive:true});
  }
  if (document.readyState==='complete' || document.readyState==='interactive') bind(document); else document.addEventListener('DOMContentLoaded', ()=> bind(document));
})();

