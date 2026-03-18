// lab-theme.js — Theme toggle with localStorage persistence
// Must load early (in <head>) to prevent flash of wrong theme
(function(){
  'use strict';
  var root = document.documentElement;

  function getStored(){ return localStorage.getItem('lab-theme'); }
  function getSystem(){ return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }
  function current(){ return root.dataset.theme || getStored() || getSystem() || 'dark'; }

  // Apply immediately (before paint)
  var saved = getStored();
  if (saved) root.dataset.theme = saved;

  function toggle(){
    var now = current();
    var next = now === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('lab-theme', next);
    // Update theme-color meta
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = next === 'dark' ? '#0a0a0a' : '#f8f7f4';
    // Notify canvas and other listeners
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
    updateToggleIcon(next);
  }

  function updateToggleIcon(theme){
    var btns = document.querySelectorAll('.theme-toggle');
    btns.forEach(function(btn){
      if (theme === 'dark') {
        btn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
        btn.setAttribute('aria-label', 'Switch to light mode');
      } else {
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        btn.setAttribute('aria-label', 'Switch to dark mode');
      }
    });
  }

  // Wire up buttons on DOM ready
  function init(){
    var btns = document.querySelectorAll('.theme-toggle');
    btns.forEach(function(btn){ btn.addEventListener('click', toggle); });
    updateToggleIcon(current());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.labTheme = { toggle: toggle, current: current };
})();
