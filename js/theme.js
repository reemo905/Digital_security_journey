// يطبّق تفضيلات المظهر المحفوظة على هذا الجهاز قبل ظهور الصفحة (لتفادي الوميض)
(function () {
  try {
    var t = JSON.parse(localStorage.getItem('pp_prefs') || '{}'), h = document.documentElement;
    if (t.color && t.color !== 'teal') h.setAttribute('data-color', t.color);
    var m = t.mode || 'auto';
    if (m === 'dark' || (m === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) h.setAttribute('data-mode', 'dark');
    if (t.size && t.size !== 'normal') h.setAttribute('data-size', t.size);
    if (t.motion === 'reduced') h.setAttribute('data-motion', 'reduced');
  } catch (e) {}
})();
