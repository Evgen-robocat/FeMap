/**
 * Файл    : frontend/static/ver.js
 * Версия  : 5.4.0
 *
 * Цепочка: d3 → map.js (сразу)
 *          d3 → astronomy.min.js (параллельно, локально)
 */
(function () {
  var APP_VERSION = '5.4.0';
  var MAP_V       = '55';
  var CSS_V       = '40';
  var HTML_V      = '6';   // index.html: добавлен chk-stars (✦ Звёзды)

  var link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'static/style.css?v=' + CSS_V;
  document.head.appendChild(link);

  document.title = 'FlatEarthMap v' + APP_VERSION;
  window.FEMAP_VERSION = APP_VERSION;
  window.FEMAP_BUILD   = { app: APP_VERSION, map: MAP_V, css: CSS_V, html: HTML_V };

  function loadScript(src, onload, onerror) {
    var s = document.createElement('script');
    s.src = src;
    if (onload)  s.onload  = onload;
    if (onerror) s.onerror = onerror;
    document.head.appendChild(s);
  }

  loadScript(
    'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
    function () {
      loadScript('static/map.js?v=' + MAP_V);
      loadScript(
        'static/astronomy.min.js',
        function () {
          console.log('[ver.js] astronomy-engine загружен');
          if (typeof window.onAstronomyReady === 'function') {
            window.onAstronomyReady();
          }
        },
        function () {
          console.warn('[ver.js] astronomy.min.js не найден — Луна и планеты недоступны');
        }
      );
    }
  );
})();
