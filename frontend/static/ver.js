/**
 * Файл    : frontend/static/ver.js
 * Автор   : Евгений / Claude
 *
 * ЕДИНСТВЕННОЕ место с номерами версий всей сборки.
 * index.html грузит его без ?v= — Render отдаёт свежим при каждом деплое.
 *
 * КАК ОБНОВЛЯТЬ:
 *   Изменил map.js     → увеличь MAP_V  + APP_VERSION
 *   Изменил style.css  → увеличь CSS_V  + APP_VERSION
 *   Изменил index.html → увеличь HTML_V + APP_VERSION
 *   git add только изменённые файлы + ver.js
 */

(function () {
  var APP_VERSION = '4.6.1';  // ← общая версия сборки
  var MAP_V       = '45';     // ← ver map.js
  var CSS_V       = '40';     // ← ver style.css
  var HTML_V      = '1';      // ← ver index.html (для журнала, не для кэша)

  // ── Подключить style.css ───────────────────────────────────────────────
  var link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'static/style.css?v=' + CSS_V;
  document.head.appendChild(link);

  // ── Обновить <title> ───────────────────────────────────────────────────
  document.title = 'FlatEarthMap v' + APP_VERSION;

  // ── Экспортировать версии для map.js ───────────────────────────────────
  window.FEMAP_VERSION  = APP_VERSION;
  window.FEMAP_BUILD    = {
    app:  APP_VERSION,
    map:  MAP_V,
    css:  CSS_V,
    html: HTML_V,
  };

  // ── Подключить d3 → map.js (цепочка: map.js зависит от d3) ───────────
  function loadScript(src, onload) {
    var s = document.createElement('script');
    s.src = src;
    if (onload) s.onload = onload;
    document.head.appendChild(s);
  }

  loadScript(
    'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
    function () { loadScript('static/map.js?v=' + MAP_V); }
  );
})();
