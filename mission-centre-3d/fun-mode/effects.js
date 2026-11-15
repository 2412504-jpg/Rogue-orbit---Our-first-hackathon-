/* ROGUE ORBIT — small celebration effect: confetti when the Results screen opens. No libraries. */
(function () {
  'use strict';
  var results = document.getElementById('results');
  if (!results) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var COLORS = ['#ffb65f', '#ff7344', '#4fe0f5', '#6effb7', '#ffe18f', '#f3f9ff'];
  var layer = null, timer = 0;
  function clear() { clearTimeout(timer); if (layer && layer.parentNode) layer.parentNode.removeChild(layer); layer = null; }
  function burst() {
    clear();
    if (!results.classList.contains('active') || (reduce && reduce.matches)) return;
    layer = document.createElement('div'); layer.className = 'confetti'; layer.setAttribute('aria-hidden', 'true');
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 70; i++) {
      var p = document.createElement('i'), r = Math.random;
      p.style.setProperty('--x', (r() * 100).toFixed(1) + '%');
      p.style.setProperty('--dx', ((r() - .5) * 220).toFixed(0) + 'px');
      p.style.setProperty('--w', (6 + r() * 7).toFixed(0) + 'px');
      p.style.setProperty('--h', (9 + r() * 10).toFixed(0) + 'px');
      p.style.setProperty('--r', ((r() < .5 ? -1 : 1) * (360 + r() * 540)).toFixed(0) + 'deg');
      p.style.setProperty('--t', (2.8 + r() * 2.2).toFixed(2) + 's');
      p.style.setProperty('--d', (r() * 1.6).toFixed(2) + 's');
      p.style.setProperty('--c', COLORS[i % COLORS.length]);
      frag.appendChild(p);
    }
    layer.appendChild(frag); document.body.appendChild(layer);
    timer = setTimeout(clear, 7500);
  }
  new MutationObserver(function () { if (results.classList.contains('active')) setTimeout(burst, 350); else clear(); })
    .observe(results, { attributes: true, attributeFilter: ['class'] });
})();
