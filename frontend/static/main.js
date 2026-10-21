/**
 * Файл    : frontend/static/main.js
 * Версия  : 6.4.0
 * Модуль  : Инициализация, события, точки, утилиты
 *
 * Изменения 6.4.0:
 *   - язык — выпадающий список #lang-select вместо трёх кнопок
 *   - applyLang(): переводит и атрибуты title (data-i18n-title), подписи
 *       чекбоксов координат тел; сообщения об ошибках — через LANG
 *   - buildCoordsOpts() — чекбоксы «Координаты тел» (Солнце, Луна, планеты, МКС)
 *   - обработчики календаря #inp-astro-datetime и кнопок затмений
 *
 * Изменения 6.3.0:
 *   - track(ev, meta), initAnalytics() — своя статистика (ANALYTICS_URL):
 *       событие 'view' при загрузке и 'on' при включении любого чекбокса
 *       (делегированный обработчик, ловит и динамические чекбоксы планет);
 *       sendBeacon, без cookie; не работает на localhost и при Do Not Track
 *
 * Изменения 6.2.0:
 *   - buildPlanetOpts() — под чекбоксом «Планеты» создаёт чекбокс на каждую
 *       планету (#planets-opts, из PLANETS); блок виден при включённых планетах;
 *       названия обновляются при смене языка (applyLang)
 *
 * Изменения 6.1.0:
 *   - loadZodiac() — заодно грузит ZODIAC_STARS_URL (звёзды и фигуры);
 *       ошибка этого файла не критична: зодиак работает без звёзд
 *   - обработчик chk-zodiac-stars
 *   - init() — блокировка масштабирования страницы жестом (iOS gesturestart,
 *       мультитач вне карты): текст, значки и панель управления больше не
 *       увеличиваются при щипке, зум карты работает как раньше
 *
 * Изменения 6.0.0:
 *   - loadZodiac() — ленивая загрузка ZODIAC_URL при первом включении
 *       чекбокса «Созвездия зодиака»; считает центроиды для подписей;
 *       при ошибке чекбокс и флаг откатываются (как у Млечного Пути)
 *   - init() — обработчики: chk-equator, chk-tropics (render()),
 *       chk-ecliptic (панель времени + renderAstro()), chk-zodiac,
 *       chk-zodiac-hl, chk-ophiuchus; блок #zodiac-opts виден только
 *       при включённом зодиаке
 *   - applyLang() — перерисовывает подписи линий и названия созвездий
 *
 * Изменения 5.9.0:
 *   - loadMilkyWay() — ленивая загрузка MILKYWAY_URL при первом включении
 *       чекбокса; при ошибке чекбокс и флаг откатываются, строка статуса
 *       сообщает причину
 *   - init() — добавлен chk-milkyway (state.astro.showMilkyWay) и
 *       обработчик, вызывающий loadMilkyWay(). В загрузку при старте
 *       Млечный Путь НЕ входит (~150 КБ, слой выключен по умолчанию)
 *
 * Изменения 5.8.0:
 *   - injectTrailControls() — добавлена строка МКС:
 *       chk-trail-iss, slider-trail-iss-min (1..525960), val-trail-iss, trailMinutes
 *   - bindTrailHandlers()   — добавлены обработчики хвоста МКС
 *   - init() — добавлены:
 *       · loadIssTle() — вызов до первого setAstroDate (TLE МКС)
 *       · chk-iss — обработчик checkbox МКС
 *       · btn-play-iss — четвёртая кнопка анимации (режим 'iss')
 *       · btn-iss-speed-N — кнопки ×1 ×10 ×20 ×100 (ISS_SPEED_OPTIONS)
 *       · slider-iss-speed — непрерывный слайдер скорости 1..100
 *
 * Изменения 5.7.0:
 *   - injectTrailControls() — добавлена строка планет (🪐 хвост),
 *     слайдер 1..366, дефолт из state.astro.trails.planets.days
 *   - injectTrailControls() — слайдер Луны расширен с max=30 до max=366
 *   - bindTrailHandlers()   — добавлены обработчики хвоста планет
 *
 * Изменения 5.6.0:
 *   - initStarTrails() вызывается в init() после buildProjection
 *   - injectTrailControls() — динамически создаёт панель "Хвосты объектов"
 *   - bindTrailHandlers()   — обработчики чекбоксов и слайдеров хвостов
 *   - Ползунки и кнопки пред/след/сейчас теперь передают manual=true
 *     в setAstroDate() — чтобы history сбрасывалась при ручном изменении
 *
 * Содержит:
 *   - pointLabel()              — имя точки с учётом языка
 *   - savePoints()              — сохранение точек в localStorage
 *   - deletePoint()             — удаление точки
 *   - refreshPointsList()       — обновление DOM-списка точек
 *   - addPoint()                — добавление точки пользователем
 *   - loadData()                — загрузка GeoJSON + localStorage
 *   - loadMilkyWay()            — ленивая загрузка Млечного Пути (v5.9.0)
 *   - loadZodiac()              — ленивая загрузка границ зодиака (v6.0.0)
 *   - applyLang()               — применение языка к DOM
 *   - applyCenter()             — смена центра карты
 *   - setStatus()               — обновление строки статуса
 *   - toggleRuler()             — включение/выключение линейки
 *   - calculateRulerDistances() — вычисление расстояний линейки
 *   - handleMapClick()          — клик по карте (линейка + магнит)
 *   - injectTrailControls()     — создаёт UI хвостов в DOM (v5.6.0/5.7.0/5.8.0)
 *   - bindTrailHandlers()       — события чекбоксов/слайдеров хвостов (v5.6.0/5.7.0/5.8.0)
 *   - init()                    — точка входа приложения
 *
 * Зависит от: config.js, state.js, astro.js, render.js
 * Загружается: последним.
 */

'use strict';

/* ================================================================
   ТОЧКИ
================================================================ */

function pointLabel(d) {
  if (d.names) return d.names[state.lang] || d.names.ru;
  return d.name || '';
}

function savePoints() {
  localStorage.setItem('femap_points_v5', JSON.stringify(state.points));
}

function deletePoint(idx) {
  state.points.splice(idx, 1);
  savePoints();
  refreshPointsList();
  renderCities();
}

function refreshPointsList() {
  var list = document.getElementById('points-list');
  list.innerHTML = '';
  state.points.forEach(function(p, idx) {
    var li   = document.createElement('li');
    var info = document.createElement('div');
    info.className = 'point-item';
    info.onclick = function() {
      document.getElementById('inp-lat').value = p.lat;
      document.getElementById('inp-lon').value = p.lon;
      applyCenter(p.lat, p.lon);
      var k = 4, w = state.width || window.innerWidth, h = state.height || window.innerHeight;
      state.svg.transition().duration(500).call(
        state.zoom.transform,
        d3.zoomIdentity.translate(w / 2, h / 2).scale(k).translate(-w / 2, -h / 2)
      );
    };
    info.textContent = pointLabel(p) + ' (' + p.lat.toFixed(1) + ', ' + p.lon.toFixed(1) + ')';

    var btnDel = document.createElement('button');
    btnDel.innerHTML = '&times;';
    btnDel.title = LANG[state.lang].deleteTitle;
    btnDel.style.cssText =
      'margin-left:6px;cursor:pointer;background:none;' +
      'border:1px solid #3a5a7a;color:#8ab;border-radius:3px;padding:1px 5px;';
    btnDel.onclick = function(e) { e.stopPropagation(); deletePoint(idx); };

    li.appendChild(info);
    li.appendChild(btnDel);
    list.appendChild(li);
  });
}

function addPoint() {
  var name = document.getElementById('add-name').value.trim();
  var lat  = parseFloat(document.getElementById('add-lat').value.replace(',', '.'));
  var lon  = parseFloat(document.getElementById('add-lon').value.replace(',', '.'));
  if (!name || isNaN(lat) || isNaN(lon)) {
    alert(LANG[state.lang].addPointError);
    return;
  }
  state.points.push({ name:name, lat:lat, lon:lon });
  savePoints();
  refreshPointsList();
  renderCities();
  document.getElementById('add-name').value = '';
  document.getElementById('add-lat').value  = '';
  document.getElementById('add-lon').value  = '';
}

/* ================================================================
   ЗАГРУЗКА ДАННЫХ
================================================================ */

async function loadData() {
  setStatus(LANG[state.lang].loading);

  try {
    var saved = localStorage.getItem('femap_points_v5');
    if (saved) {
      state.points = JSON.parse(saved);
    } else {
      var oldV4 = localStorage.getItem('femap_points_v4');
      if (oldV4) {
        var v4data  = JSON.parse(oldV4);
        var citySet = new Set(CITIES.map(function(c) { return c.names.ru; }));
        state.points = CITIES.concat(v4data.filter(function(p) { return !citySet.has(p.name); }));
      } else {
        state.points = CITIES.slice();
      }
    }
  } catch(e) {
    state.points = CITIES.slice();
  }
  refreshPointsList();

  try {
    var res = await Promise.all([d3.json(LAND_URL), d3.json(BORDERS_URL)]);
    state.land    = res[0];
    state.borders = res[1];
    if (!state.land || !state.land.features) throw new Error('bad land.geojson');
    var nL = state.land.features.length;
    var nB = state.borders && state.borders.features ? state.borders.features.length : 0;
    var t  = LANG[state.lang];
    var b  = window.FEMAP_BUILD || {};
    var bi = b.map ? (' · js:' + b.map + ' css:' + b.css + ' html:' + b.html) : '';
    setStatus('v' + VERSION + bi + ' · ' + nL + ' ' + t.polygons + ' · ' + nB + ' ' + t.bordersCount);
  } catch(err) {
    console.error('[main.js]', err);
    state.land    = { type:'FeatureCollection', features:[] };
    state.borders = { type:'FeatureCollection', features:[] };
    setStatus(LANG[state.lang].errLoad + ': ' + err.message);
  }
}

/**
 * Ленивая загрузка контуров Млечного Пути (v5.9.0).
 * Вызывается при включении чекбокса; повторные вызовы безопасны.
 * После загрузки перерисовывает астро-слои.
 */
async function loadMilkyWay() {
  var mw = state.milkyway;
  if (mw.data || mw.loading) return;
  mw.loading = true;

  var statusEl = document.getElementById('status');
  var prev     = statusEl ? statusEl.innerText : '';
  setStatus(LANG[state.lang].loading);

  try {
    var data = await d3.json(MILKYWAY_URL);
    if (!data || !data.features || !data.features.length) {
      throw new Error('bad milkyway.json');
    }
    mw.data = data;
    mw.key  = null;
    setStatus(prev);
  } catch(err) {
    console.error('[main.js] milkyway:', err);
    setStatus(LANG[state.lang].errMilky + ': ' + err.message);
    state.astro.showMilkyWay = false;
    var chk = document.getElementById('chk-milkyway');
    if (chk) chk.checked = false;
    updateAstroTimePanel();
  } finally {
    mw.loading = false;
  }
  renderAstro();
}

/**
 * Ленивая загрузка границ созвездий зодиака (v6.0.0).
 * Вызывается при включении чекбокса; повторные вызовы безопасны.
 * Центроиды считаются один раз — по ним ставятся подписи.
 * После загрузки перерисовывает астро-слои.
 */
async function loadZodiac() {
  var z = state.zodiac;
  if (z.data || z.loading) return;
  z.loading = true;

  var statusEl = document.getElementById('status');
  var prev     = statusEl ? statusEl.innerText : '';
  setStatus(LANG[state.lang].loading);

  try {
    var data = await d3.json(ZODIAC_URL);
    if (!data || !data.features || !data.features.length) {
      throw new Error('bad zodiac.json');
    }
    var centers = {};
    data.features.forEach(function(f) { centers[f.id] = d3.geoCentroid(f); });
    z.data    = data;
    z.centers = centers;
    z.key     = null;
    try {                                   // звёзды — необязательны
      var zs = await d3.json(ZODIAC_STARS_URL);
      z.stars = (zs && zs.stars && zs.lines) ? zs : null;
    } catch(e2) {
      console.warn('[main.js] zodiac-stars:', e2);
      z.stars = null;
    }
    setStatus(prev);
  } catch(err) {
    console.error('[main.js] zodiac:', err);
    setStatus(LANG[state.lang].errZodiac + ': ' + err.message);
    state.astro.showZodiac = false;
    var chk = document.getElementById('chk-zodiac');
    if (chk) chk.checked = false;
    var opts = document.getElementById('zodiac-opts');
    if (opts) opts.style.display = 'none';
    updateAstroTimePanel();
  } finally {
    z.loading = false;
  }
  renderAstro();
}

/* ================================================================
   УТИЛИТЫ
================================================================ */

function applyCenter(lat, lon) {
  if (typeof lat === 'string') lat = lat.replace(',', '.');
  if (typeof lon === 'string') lon = lon.replace(',', '.');
  state.lat = Math.max(-90,  Math.min(90,  parseFloat(lat) || 0));
  state.lon = Math.max(-180, Math.min(180, parseFloat(lon) || 0));
  clearZoomTransform();
  buildProjection();
  calculateRulerDistances(); // пересчёт линейки после новой проекции
  render();
}

function setStatus(msg) {
  var el = document.getElementById('status');
  if (el) el.innerText = msg;
}

function toggleRuler(active) {
  state.ruler.active = active;
  var chk = document.getElementById('chk-ruler');
  var btn = document.getElementById('btn-ruler-map');
  if (chk) chk.checked = active;
  if (btn) btn.classList.toggle('active', active);
  if (!active) {
    state.ruler.points     = [];
    state.ruler.distSphere = null;
    state.ruler.distAE     = null;
    renderRuler();
    var t  = LANG[state.lang];
    var nL = state.land && state.land.features ? state.land.features.length : 0;
    setStatus('v' + VERSION + ' · ' + nL + ' ' + t.polygons);
  } else {
    setStatus(LANG[state.lang].rulerClickA);
  }
  document.getElementById('map').style.cursor = active ? 'crosshair' : '';
}

/* ================================================================
   МУЛЬТИЯЗЫЧНОСТЬ
================================================================ */

/* ── Координаты тел (v6.4.0) ───────────────────────────────── */
var CO_KEYS = ['Sun', 'Moon'].concat(PLANETS.map(function(p) { return p.key; }), ['Iss']);

function coordsOptLabel(k) {
  var t = LANG[state.lang];
  if (k === 'Sun')  return '☀ ' + t.bodySun;
  if (k === 'Moon') return '🌙 ' + t.bodyMoon;
  if (k === 'Iss')  return '🛰 ' + t.bodyIss;
  for (var i = 0; i < PLANETS.length; i++) {
    if (PLANETS[i].key === k) return planetOptLabel(PLANETS[i]);
  }
  return k;
}

function buildCoordsOpts() {
  var box = document.getElementById('coords-opts');
  if (!box) return;
  box.textContent = '';
  CO_KEYS.forEach(function(k) {
    var lab = document.createElement('label');
    lab.className = 'checkbox-label';
    var inp = document.createElement('input');
    inp.type = 'checkbox'; inp.id = 'chk-co-' + k;
    inp.checked = state.astro.coordsOn[k] !== false && !!state.astro.coordsOn[k];
    inp.addEventListener('change', function(e) {
      state.astro.coordsOn[k] = e.target.checked;
      renderAstro();
    });
    var box2 = document.createElement('span'); box2.className = 'checkbox-custom';
    var txt  = document.createElement('span'); txt.id = 'lbl-co-' + k;
    txt.textContent = coordsOptLabel(k);
    lab.appendChild(inp); lab.appendChild(box2); lab.appendChild(txt);
    box.appendChild(lab);
  });
}

function planetOptLabel(pl) {
  return pl.sym + ' ' + (pl.label[state.lang] || pl.label.ru);
}

/** Чекбоксы отдельных планет (v6.2.0). */
function buildPlanetOpts() {
  var box = document.getElementById('planets-opts');
  if (!box) return;
  box.textContent = '';
  PLANETS.forEach(function(pl) {
    var lab = document.createElement('label');
    lab.className = 'checkbox-label';
    var inp = document.createElement('input');
    inp.type = 'checkbox'; inp.id = 'chk-pl-' + pl.key;
    inp.checked = state.astro.planetsOn[pl.key] !== false;
    inp.addEventListener('change', function(e) {
      state.astro.planetsOn[pl.key] = e.target.checked;
      updateAstroTimePanel();
      renderAstro();
    });
    var box2 = document.createElement('span'); box2.className = 'checkbox-custom';
    var txt  = document.createElement('span'); txt.id = 'lbl-pl-' + pl.key;
    txt.textContent = planetOptLabel(pl);
    lab.appendChild(inp); lab.appendChild(box2); lab.appendChild(txt);
    box.appendChild(lab);
  });
}

function applyLang() {
  var t = LANG[state.lang];
  PLANETS.forEach(function(pl) {
    var el = document.getElementById('lbl-pl-' + pl.key);
    if (el) el.textContent = planetOptLabel(pl);
  });
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.dataset.i18n;
    if (t[key] !== undefined) el.textContent = t[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.dataset.i18nPlaceholder;
    if (t[key] !== undefined) el.placeholder = t[key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function(el) {   // v6.4.0
    var key = el.dataset.i18nTitle;
    if (t[key] !== undefined) el.title = t[key];
  });
  var langSel = document.getElementById('lang-select');
  if (langSel && langSel.value !== state.lang) langSel.value = state.lang;
  CO_KEYS.forEach(function(k) {
    var el = document.getElementById('lbl-co-' + k);
    if (el) el.textContent = coordsOptLabel(k);
  });
  updatePlayButtons();
  if (state.projection) {
    renderCities();
    renderLabels();   // v6.0.0 — названия экватора и тропиков
    renderAstro();    // v6.0.0 — названия созвездий и строка «тело — созвездие»
  }
}

/* ================================================================
   ЛИНЕЙКА — ЛОГИКА КЛИКОВ
================================================================ */

function calculateRulerDistances() {
  if (state.ruler.points.length < 2) return;
  var p1 = state.ruler.points[0];
  var p2 = state.ruler.points[1];
  state.ruler.distSphere = d3.geoDistance(p1, p2) * 6371;
  var proj1 = state.projection(p1);
  var proj2 = state.projection(p2);
  if (proj1 && proj2) {
    state.ruler.distAE = Math.hypot(proj2[0] - proj1[0], proj2[1] - proj1[1]) /
      state.projection.scale() * 6371;
  } else {
    state.ruler.distAE = null;
  }
}

function handleMapClick(event) {
  hideRouteTooltip();
  hideIssTooltip();
  if (!state.ruler.active) return;

  var pt     = d3.pointer(event, state.svg.node());
  var mx     = pt[0], my = pt[1];
  var tr     = d3.zoomTransform(state.svg.node());
  var mapPt  = tr.invert([mx, my]);
  var coords = state.projection.invert(mapPt);
  if (!coords || isNaN(coords[0]) || isNaN(coords[1])) return;

  /* Магнит к ближайшей точке в радиусе 25px */
  var minD = 25;
  state.points.forEach(function(p) {
    var proj = state.projection([p.lon, p.lat]);
    if (!proj) return;
    var sp = tr.apply(proj);
    var d  = Math.hypot(sp[0] - mx, sp[1] - my);
    if (d < minD) { minD = d; coords = [p.lon, p.lat]; }
  });
  getAstroPoints().forEach(function(p) {
    var proj = state.projection([p.lon, p.lat]);
    if (!proj) return;
    var sp = tr.apply(proj);
    var d  = Math.hypot(sp[0] - mx, sp[1] - my);
    if (d < minD) { minD = d; coords = [p.lon, p.lat]; }
  });

  if (state.ruler.points.length >= 2) state.ruler.points = [];
  state.ruler.points.push(coords);
  calculateRulerDistances();
  renderRuler();
  var t = LANG[state.lang];
  setStatus(state.ruler.points.length === 1 ? t.rulerClickB : t.rulerDone);
}

/* ================================================================
   UI ХВОСТОВ — динамическая вставка (v5.6.0/5.7.0/5.8.0)
================================================================ */

function injectTrailControls() {
  if (document.getElementById('trail-controls')) return;

  var t = LANG[state.lang];

  var wrap = document.createElement('div');
  wrap.id = 'trail-controls';
  wrap.style.cssText =
    'border-top:1px solid #1e3a5a;padding-top:6px;margin-top:4px;padding-bottom:4px;';

  var title = document.createElement('div');
  title.id = 'trail-title';
  title.setAttribute('data-i18n', 'trailsTitle');
  title.style.cssText =
    'font-size:10px;color:#5a8a9a;margin-bottom:5px;font-family:monospace;';
  title.textContent = t.trailsTitle || 'Хвосты объектов';
  wrap.appendChild(title);

  function makeRow(chkId, i18nKey, fallback,
                   sliderId, min, max, val,
                   spanId, unitKey, unitFallback) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:5px;margin-bottom:4px;';

    var lbl = document.createElement('label');
    lbl.className = 'checkbox-label';
    lbl.style.cssText = 'display:flex;align-items:center;gap:3px;min-width:68px;';

    var chk = document.createElement('input');
    chk.type = 'checkbox'; chk.id = chkId;

    var custom = document.createElement('span');
    custom.className = 'checkbox-custom';

    var txt = document.createElement('span');
    txt.setAttribute('data-i18n', i18nKey);
    txt.style.cssText = 'font-size:11px;white-space:nowrap;';
    txt.textContent = t[i18nKey] || fallback;

    lbl.appendChild(chk); lbl.appendChild(custom); lbl.appendChild(txt);
    row.appendChild(lbl);

    var slider = document.createElement('input');
    slider.type = 'range'; slider.id = sliderId;
    slider.min = min; slider.max = max; slider.value = val; slider.step = 1;
    slider.style.cssText = 'flex:1;';
    row.appendChild(slider);

    var valSpan = document.createElement('span');
    valSpan.id = spanId;
    valSpan.style.cssText =
      'font-size:10px;color:#a0c4d8;font-family:monospace;min-width:28px;text-align:right;';
    valSpan.textContent = val;
    row.appendChild(valSpan);

    var unitSpan = document.createElement('span');
    unitSpan.setAttribute('data-i18n', unitKey);
    unitSpan.style.cssText = 'font-size:10px;color:#5a8a9a;';
    unitSpan.textContent = t[unitKey] || unitFallback;
    row.appendChild(unitSpan);

    return row;
  }

  /* Солнце */
  wrap.appendChild(makeRow(
    'chk-trail-sun',   'trailSunChk',   '☀ хвост',
    'slider-trail-sun-days', 1, 365, state.astro.trails.sun.days,
    'val-trail-sun', 'trailDays', 'дн'));

  /* Луна — v5.7.0: слайдер до 366 */
  wrap.appendChild(makeRow(
    'chk-trail-moon',  'trailMoonChk',  '🌙 хвост',
    'slider-trail-moon-days', 1, 366, state.astro.trails.moon.days,
    'val-trail-moon', 'trailDays', 'дн'));

  /* Звёзды */
  wrap.appendChild(makeRow(
    'chk-trail-stars', 'trailStarsChk', '✦ хвост',
    'slider-trail-stars-h', 1, 72, state.astro.trails.stars.hours,
    'val-trail-stars', 'trailHours', 'ч'));

  /* Планеты (v5.7.0) */
  wrap.appendChild(makeRow(
    'chk-trail-planets', 'trailPlanetsChk', '🪐 хвост',
    'slider-trail-planets-days', 1, 366, state.astro.trails.planets.days,
    'val-trail-planets', 'trailDays', 'дн'));

  /* МКС (v5.8.0) — шаг в минутах, max 525960 = 365 суток */
  wrap.appendChild(makeRow(
    'chk-trail-iss', 'trailIssChk', '🛰 хвост',
    'slider-trail-iss-min', 1, 525960, state.astro.trails.iss.minutes,
    'val-trail-iss', 'trailMinutes', 'мин'));

  var anchor = document.getElementById('astro-time');
  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
  } else {
    var ctrl = document.getElementById('controls');
    if (ctrl) ctrl.appendChild(wrap);
  }
}

/* ================================================================
   ОБРАБОТЧИКИ ХВОСТОВ (v5.6.0/5.7.0/5.8.0)
================================================================ */

function bindTrailHandlers() {

  /* ── Солнце ──────────────────────────────────────────────── */
  var chkSun = document.getElementById('chk-trail-sun');
  if (chkSun) chkSun.addEventListener('change', function() {
    state.astro.trails.sun.enabled = this.checked;
    if (!this.checked) state.astro.trails.sun.history = [];
    renderAstro();
  });
  var slSun = document.getElementById('slider-trail-sun-days');
  if (slSun) slSun.addEventListener('input', function() {
    var days = parseInt(this.value, 10);
    state.astro.trails.sun.days = days;
    var h = state.astro.trails.sun.history, mx = days * 24;
    while (h.length > mx) h.shift();
    var sp = document.getElementById('val-trail-sun');
    if (sp) sp.textContent = days;
  });

  /* ── Луна ────────────────────────────────────────────────── */
  var chkMoon = document.getElementById('chk-trail-moon');
  if (chkMoon) chkMoon.addEventListener('change', function() {
    state.astro.trails.moon.enabled = this.checked;
    if (!this.checked) state.astro.trails.moon.history = [];
    renderAstro();
  });
  var slMoon = document.getElementById('slider-trail-moon-days');
  if (slMoon) slMoon.addEventListener('input', function() {
    var days = parseInt(this.value, 10);
    state.astro.trails.moon.days = days;
    var h = state.astro.trails.moon.history, mx = days * 24;
    while (h.length > mx) h.shift();
    var sp = document.getElementById('val-trail-moon');
    if (sp) sp.textContent = days;
  });

  /* ── Звёзды ──────────────────────────────────────────────── */
  var chkStars = document.getElementById('chk-trail-stars');
  if (chkStars) chkStars.addEventListener('change', function() {
    state.astro.trails.stars.enabled = this.checked;
    if (!this.checked) {
      for (var i = 0; i < state.astro.trails.stars.history.length; i++) {
        state.astro.trails.stars.history[i] = [];
      }
    }
    renderAstro();
  });
  var slStars = document.getElementById('slider-trail-stars-h');
  if (slStars) slStars.addEventListener('input', function() {
    var hours = parseInt(this.value, 10);
    state.astro.trails.stars.hours = hours;
    for (var i = 0; i < state.astro.trails.stars.history.length; i++) {
      var h = state.astro.trails.stars.history[i];
      while (h.length > hours) h.shift();
    }
    var sp = document.getElementById('val-trail-stars');
    if (sp) sp.textContent = hours;
  });

  /* ── Планеты (v5.7.0) ────────────────────────────────────── */
  var chkPlanets = document.getElementById('chk-trail-planets');
  if (chkPlanets) chkPlanets.addEventListener('change', function() {
    state.astro.trails.planets.enabled = this.checked;
    if (!this.checked) {
      var ph = state.astro.trails.planets.history;
      for (var pk in ph) {
        if (Object.prototype.hasOwnProperty.call(ph, pk)) ph[pk] = [];
      }
    }
    renderAstro();
  });
  var slPlanets = document.getElementById('slider-trail-planets-days');
  if (slPlanets) slPlanets.addEventListener('input', function() {
    var days = parseInt(this.value, 10);
    state.astro.trails.planets.days = days;
    var maxPts = days * 24;
    var ph = state.astro.trails.planets.history;
    for (var pk in ph) {
      if (Object.prototype.hasOwnProperty.call(ph, pk)) {
        var h = ph[pk];
        while (h.length > maxPts) h.shift();
      }
    }
    var sp = document.getElementById('val-trail-planets');
    if (sp) sp.textContent = days;
  });

  /* ── МКС (v5.8.0) ────────────────────────────────────────── */
  var chkIss = document.getElementById('chk-trail-iss');
  if (chkIss) chkIss.addEventListener('change', function() {
    state.astro.trails.iss.enabled = this.checked;
    if (!this.checked) state.astro.trails.iss.history = [];
    renderAstro();
  });
  var slIss = document.getElementById('slider-trail-iss-min');
  if (slIss) slIss.addEventListener('input', function() {
    var minutes = parseInt(this.value, 10);
    state.astro.trails.iss.minutes = minutes;
    var h = state.astro.trails.iss.history;
    while (h.length > minutes) h.shift();
    var sp = document.getElementById('val-trail-iss');
    if (sp) sp.textContent = minutes;
  });
}

/* ================================================================
   ИНИЦИАЛИЗАЦИЯ
================================================================ */

async function init() {
  document.title = 'FlatEarthMap v' + VERSION;
  var badge = document.querySelector('.version-badge');
  if (badge) badge.textContent = 'v' + VERSION;

  createSVG();
  setupZoom();
  buildProjection();

  /* Инициализируем history звёзд: по одному [] на каждую звезду */
  initStarTrails(); // astro.js

  /* Загружаем TLE МКС (асинхронно; внутри — fallback на ISS_TLE_FALLBACK) */
  loadIssTle(); // astro.js — v5.8.0

  await loadData();
  render();

  state.svg.on('click', handleMapClick);

  /* ── Центр карты ─────────────────────────────────────────── */
  document.getElementById('btn-apply').addEventListener('click', function() {
    applyCenter(
      document.getElementById('inp-lat').value,
      document.getElementById('inp-lon').value
    );
  });
  ['inp-lat','inp-lon'].forEach(function(id) {
    document.getElementById(id).addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('btn-apply').click();
    });
  });

  /* ── Кнопки смены знака ± ────────────────────────────────── */
  document.querySelectorAll('.btn-sign').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      var v = parseFloat(inp.value.replace(',', '.'));
      if (!isNaN(v) && v !== 0) inp.value = String(-v);
    });
  });

  /* ── Чекбоксы карты ──────────────────────────────────────── */
  document.getElementById('chk-grid').addEventListener('change', function(e) {
    state.showGrid = e.target.checked; render();
  });
  document.getElementById('chk-labels').addEventListener('change', function(e) {
    state.showLabels = e.target.checked; render();
  });
  document.getElementById('chk-cities').addEventListener('change', function(e) {
    state.showCities = e.target.checked; render();
  });
  document.getElementById('chk-ruler').addEventListener('change', function(e) {
    toggleRuler(e.target.checked);
  });
  document.getElementById('chk-routes').addEventListener('change', function(e) {
    state.showRoutes = e.target.checked;
    hideRouteTooltip();
    render();
  });

  /* ── Линии карты (v6.0.0): экватор, тропики — географические,
        от времени не зависят; эклиптика движется вместе с небом ── */
  document.getElementById('chk-equator').addEventListener('change', function(e) {
    state.showEquator = e.target.checked;
    renderLines(); renderLabels();
  });
  document.getElementById('chk-tropics').addEventListener('change', function(e) {
    state.showTropics = e.target.checked;
    renderLines(); renderLabels();
  });
  document.getElementById('chk-ecliptic').addEventListener('change', function(e) {
    state.showEcliptic = e.target.checked;
    updateAstroTimePanel();   // эклиптике нужна панель времени
    renderAstro();
  });

  /* ── Линейка — кнопка на карте ───────────────────────────── */
  document.getElementById('btn-ruler-map').addEventListener('click', function() {
    toggleRuler(!state.ruler.active);
  });

  /* ── Чекбоксы астрономии ─────────────────────────────────── */
  [
    ['chk-sun',     'showSun'    ],
    ['chk-night',   'showNight'  ],
    ['chk-moon',    'showMoon'   ],
    ['chk-planets', 'showPlanets'],
    ['chk-stars',   'showStars'  ],
    ['chk-iss',     'showIss'    ],  // v5.8.0
    ['chk-milkyway','showMilkyWay'], // v5.9.0
  ].forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (!el) return;
    el.addEventListener('change', function(e) {
      state.astro[pair[1]] = e.target.checked;
      if (pair[1] === 'showPlanets') {          // v6.2.0: список планет виден при включённых
        var po = document.getElementById('planets-opts');
        if (po) po.style.display = e.target.checked ? 'block' : 'none';
      }
      updateAstroTimePanel();
      renderAstro();
    });
  });
  buildPlanetOpts();
  buildCoordsOpts();   // v6.4.0

  /* Млечный Путь — данные грузятся при первом включении (v5.9.0).
     Слушатель стоит после общего, поэтому флаг уже выставлен. */
  document.getElementById('chk-milkyway').addEventListener('change', function(e) {
    if (e.target.checked) loadMilkyWay();
  });

  /* Зодиак (v6.0.0): данные грузятся при первом включении; подчинённые
     переключатели (подсветка, Змееносец) видны только при включённом зодиаке. */
  document.getElementById('chk-zodiac').addEventListener('change', function(e) {
    state.astro.showZodiac = e.target.checked;
    var opts = document.getElementById('zodiac-opts');
    if (opts) opts.style.display = e.target.checked ? 'block' : 'none';
    updateAstroTimePanel();
    renderAstro();
    if (e.target.checked) loadZodiac();
  });
  document.getElementById('chk-zodiac-hl').addEventListener('change', function(e) {
    state.astro.zodiacHighlight = e.target.checked;
    renderAstro();
  });
  document.getElementById('chk-ophiuchus').addEventListener('change', function(e) {
    state.astro.showOphiuchus = e.target.checked;
    renderAstro();
  });
  document.getElementById('chk-zodiac-stars').addEventListener('change', function(e) {
    state.astro.zodiacStars = e.target.checked;
    renderAstro();
  });

  /* v6.1.0: щипок вне карты не должен масштабировать страницу (карта сама
     обрабатывает мультитач через d3.zoom). */
  document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
  document.addEventListener('touchmove', function(e) {
    if (e.touches && e.touches.length > 1 && !e.target.closest('#map')) e.preventDefault();
  }, { passive: false });

  /* ── Ползунок UTC (суточный) ─────────────────────────────── */
  document.getElementById('sun-slider').addEventListener('input', function(e) {
    astroPause();
    var mins = parseInt(e.target.value, 10);
    var d = new Date(state.astro.date);
    d.setUTCHours(Math.floor(mins / 60), mins % 60, 0, 0);
    setAstroDate(d, true); // manual=true → clearAllTrails()
  });

  /* ── Ползунок дней (годовой) ─────────────────────────────── */
  document.getElementById('day-slider').addEventListener('input', function(e) {
    astroPause();
    var targetDay = parseInt(e.target.value, 10);
    var d = state.astro.date;
    var newMs = Date.UTC(
      d.getUTCFullYear(), 0, 1,
      d.getUTCHours(), d.getUTCMinutes(), 0, 0
    ) + targetDay * 86400000;
    setAstroDate(new Date(newMs), true);
  });

  /* ── Кнопки навигации по дням ────────────────────────────── */
  document.getElementById('btn-astro-now').addEventListener('click', function() {
    astroPause(); setAstroDate(new Date(), true);
  });
  document.getElementById('btn-astro-prev').addEventListener('click', function() {
    astroPause();
    setAstroDate(new Date(state.astro.date.getTime() - 86400000), true);
  });
  document.getElementById('btn-astro-next').addEventListener('click', function() {
    astroPause();
    setAstroDate(new Date(state.astro.date.getTime() + 86400000), true);
  });

  /* ── Четыре кнопки анимации ──────────────────────────────── */
  document.getElementById('btn-play-hour').addEventListener('click', function() {
    astroPlayMode('hour');
  });
  document.getElementById('btn-play-day').addEventListener('click', function() {
    astroPlayMode('day');
  });
  document.getElementById('btn-play-sidereal').addEventListener('click', function() {
    astroPlayMode('sidereal');
  });
  /* МКС — четвёртая кнопка (v5.8.0) */
  var btnIss = document.getElementById('btn-play-iss');
  if (btnIss) btnIss.addEventListener('click', function() {
    astroPlayMode('iss');
  });

  /* ── Кнопки скорости МКС (v5.8.0) ───────────────────────── */
  ISS_SPEED_OPTIONS.forEach(function(s) {
    var btn = document.getElementById('btn-iss-speed-' + s);
    if (!btn) return;
    btn.addEventListener('click', function() {
      state.astro.issSpeed = s;
      updateIssSpeedButtons();
    });
  });

  /* ── Слайдер скорости МКС (v5.8.0) ──────────────────────── */
  var slIssSpeed = document.getElementById('slider-iss-speed');
  if (slIssSpeed) slIssSpeed.addEventListener('input', function() {
    var v = Math.max(1, Math.min(100, parseInt(this.value, 10)));
    state.astro.issSpeed = v;
    updateIssSpeedButtons(); // синхронизирует кнопки
  });

  /* ── Пресеты координат ───────────────────────────────────── */
  document.querySelectorAll('.btn-preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var lat = parseFloat(btn.dataset.lat);
      var lon = parseFloat(btn.dataset.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        document.getElementById('inp-lat').value = lat;
        document.getElementById('inp-lon').value = lon;
        applyCenter(lat, lon);
      }
    });
  });

  /* ── Зум и точки ─────────────────────────────────────────── */
  document.getElementById('btn-reset-zoom').addEventListener('click', resetZoom);
  document.getElementById('btn-add-point').addEventListener('click', addPoint);

  /* ── Переключение языка ──────────────────────────────────── */
  var langSelect = document.getElementById('lang-select');
  langSelect.value = state.lang;
  langSelect.addEventListener('change', function() {
    state.lang = langSelect.value;
    localStorage.setItem('femap_lang', state.lang);
    applyLang();
    refreshPointsList();
    var t  = LANG[state.lang];
    var nL = state.land && state.land.features ? state.land.features.length : 0;
    var nB = state.borders && state.borders.features ? state.borders.features.length : 0;
    setStatus('v' + VERSION + ' · ' + nL + ' ' + t.polygons + ' · ' + nB + ' ' + t.bordersCount);
  });

  /* ── Календарь и затмения (v6.4.0) ─────────────────────────── */
  var dt = document.getElementById('inp-astro-datetime');
  dt.addEventListener('change', function() { setDateFromInput(dt.value); });
  document.getElementById('btn-ecl-solar').addEventListener('click', function() { jumpToEclipse('solar'); });
  document.getElementById('btn-ecl-lunar').addEventListener('click', function() { jumpToEclipse('lunar'); });

  /* ── Панель хвостов (v5.6.0) ─────────────────────────────── */
  injectTrailControls();
  bindTrailHandlers();

  updateAstroDisplay();
  applyLang();
  initAnalytics();
}

/* ================================================================
   СТАТИСТИКА (v6.3.0) — см. analytics/worker.js
================================================================ */

function analyticsEnabled() {
  if (!ANALYTICS_URL) return false;
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /^(10|192\.168)\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /\.local$/.test(h) || location.protocol === 'file:') return false;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
  return true;
}

function track(ev, meta) {
  if (!analyticsEnabled()) return;
  try {
    var ref = document.referrer || '';
    try { if (ref && new URL(ref).hostname === location.hostname) ref = ''; } catch (e) { ref = ''; }
    var body = JSON.stringify({
      ev: ev, meta: meta || '', ref: ref, lang: state.lang, w: window.innerWidth
    });
    var url = ANALYTICS_URL + '/hit';
    if (!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' })))) {
      fetch(url, { method: 'POST', body: body, mode: 'no-cors', keepalive: true });
    }
  } catch (e) { /* статистика никогда не должна ломать карту */ }
}

function initAnalytics() {
  if (!analyticsEnabled()) return;
  track('view');
  document.addEventListener('change', function(e) {
    var el = e.target;
    if (el && el.type === 'checkbox' && el.checked && el.id) track('on', el.id);
  });
}

/* ================================================================
   ТОЧКА ВХОДА
   main.js грузится последним — DOMContentLoaded мог уже сработать
================================================================ */
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
