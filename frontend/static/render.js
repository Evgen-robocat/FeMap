/**
 * Файл    : frontend/static/render.js
 * Версия  : 6.4.0
 * Модуль  : Рендеринг SVG-карты
 *
 * Изменения 6.4.0:
 *   - densifyTrail(), renderTrailPath(): хвосты уплотняются по долготе/широте
 *       и рисуются гладкими кривыми (раньше Солнце и звёзды шли ломаной);
 *       renderTrailPolyline() теперь вызывает renderTrailPath()
 *   - координаты у Солнца, Луны, МКС и планет — по отдельности
 *       (state.astro.coordsOn); у планет подпись под маркером;
 *       подписи координат с тёмной обводкой, читаются на любом фоне
 *   - тултип МКС переведён (LANG.bodyIss, latShort/lonShort)
 *
 * Изменения 6.2.0:
 *   - маркеры и хвосты планет рисуются только для включённых (planetOn)
 *
 * Изменения 6.1.0:
 *   - renderZodiac(): линии фигур созвездий (в map-content, non-scaling-stroke,
 *     у подсвеченного созвездия ярче) и звёзды (оверлей zlabels, пересчёт при
 *     зуме; один path на класс величины, размер не зависит от зума);
 *     включается state.astro.zodiacStars; данные — state.zodiac.stars
 *   - renderAstro(): подписи планет в стиле подписей тропиков
 *     (PLANET_LABEL_STYLE: 10px monospace, цвет планеты, тёмная обводка)
 *
 * Изменения 6.0.0:
 *   - skyFrame() — общая «небесная» проекция (повёрнута на GST), кешируется
 *     по ключу; её делят Млечный Путь, зодиак и эклиптика
 *   - renderMilkyWay() переведён на skyFrame() (поведение прежнее)
 *   - renderZodiac()  — границы 13 созвездий, подсветка созвездия каждого
 *     показанного тела (Солнце, Луна, планеты): заливка цветом тела, цветной
 *     ореол и белая обводка границы; подписи названий в оверлее zlabels;
 *     строка со списком «тело — созвездие» в #zodiac-info
 *   - renderEcliptic() — эклиптика (зависит от времени, как и все небесные слои)
 *   - renderLines()   — экватор и тропики (географические параллели)
 *   - renderLabels()  — названия экватора и тропиков (независимо от чекбокса
 *     «Подписи координат»)
 *   - createSVG(): слои zodiac, ecliptic, lines (внутри map-content) и
 *     zlabels (оверлей); линии рисуются с non-scaling-stroke
 *   - render() — вызывает renderLines(); renderAstro() — renderZodiac(),
 *     renderEcliptic()
 *
 * Изменения 5.9.0:
 *   - createSVG(): слой 'milkyway' внутри map-content (между night и routes),
 *     поэтому зум применяется SVG-трансформом и путь при зуме не пересчитывается
 *   - renderMilkyWay() — Млечный Путь: пять вложенных полигонов-изофот,
 *     рисуются через проекцию, повёрнутую на GST: rotate([-lon - GST, -lat]).
 *     Геометрия в градусах RA/Dec не пересчитывается — D3 сам режет
 *     полигоны по clipAngle и на антиподе при любом центре.
 *     Кеш-ключ в state.milkyway.key: перерисовка только при смене центра,
 *     времени или размеров проекции.
 *   - renderAstro() — вызов renderMilkyWay() сразу после renderNight()
 *
 * Изменения 5.8.0:
 *   - createSVG(): SVG-слои 'trail-iss' (между trail-planets и sun)
 *     и 'iss' (между planets и stars) добавлены в список оверлеев
 *   - showIssTooltip(event, pt) / hideIssTooltip() — тултип маркера МКС
 *   - renderIssTrail() — хвост МКС через renderTrailPath, цвет #00ff88,
 *     слой layer-trail-iss, полос TRAIL_BANDS.iss
 *   - renderIss() — маркер МКС: крестик + circle + label, слой layer-iss
 *   - renderTrails() — добавлен вызов renderIssTrail()
 *   - renderAstro() — добавлена очистка trail-iss / iss, вызов renderIss()
 *
 * Изменения 5.7.0:
 *   - SVG-слой 'trail-planets', renderTrailPath, renderMoonTrail,
 *     renderPlanetTrails добавлены
 *
 * Изменения 5.6.0:
 *   - SVG-слои 'trail-sun', 'trail-moon', 'trail-stars'
 *   - renderTrailPolyline, renderSunTrail, renderMoonTrail, renderStarTrails
 *
 * Содержит:
 *   - createSVG()           — SVG и слои
 *   - setupZoom()           — d3.zoom
 *   - buildProjection()     — AE-проекция
 *   - render()              — главный рендер
 *   - renderLabels()        — подписи широт
 *   - renderCities()        — города / точки
 *   - renderRoutes()        — маршруты
 *   - renderNight()         — ночная тень
 *   - skyFrame()            — небесная проекция, кеш (v6.0.0)
 *   - renderMilkyWay()      — Млечный Путь (v5.9.0)
 *   - renderZodiac()        — зодиак: границы, подсветка, подписи (v6.0.0)
 *   - renderEcliptic()      — эклиптика (v6.0.0)
 *   - renderLines()         — экватор и тропики (v6.0.0)
 *   - renderTrails()        — диспетчер хвостов
 *   - renderTrailPolyline() — хвост через polyline
 *   - renderTrailPath()     — хвост через geoPath (дуги)
 *   - renderSunTrail()      — хвост Солнца
 *   - renderMoonTrail()     — хвост Луны
 *   - renderStarTrails()    — хвосты звёзд
 *   - renderPlanetTrails()  — хвосты планет
 *   - renderIssTrail()      — хвост МКС (v5.8.0)
 *   - showIssTooltip()      — тултип МКС (v5.8.0)
 *   - hideIssTooltip()      — скрыть тултип МКС (v5.8.0)
 *   - drawMarker()          — универсальный маркер
 *   - renderStars()         — звёзды и созвездия
 *   - renderIss()           — маркер МКС (v5.8.0)
 *   - renderAstro()         — диспетчер астро-слоёв
 *   - renderRuler()         — линейка
 *
 * Зависит от: config.js, state.js, astro.js
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   SVG — создание структуры слоёв
═══════════════════════════════════════════════════════════════ */

function createSVG() {
  var container = document.getElementById('map');
  state.width  = container.clientWidth;
  state.height = container.clientHeight;

  state.svg = d3.select('#map').append('svg')
    .attr('width',  state.width)
    .attr('height', state.height)
    .style('display', 'block')
    .style('background', COLORS.background);

  // Слои внутри map-content — масштабируются d3.zoom трансформом.
  var mc = state.svg.append('g').attr('id', 'map-content');
  // milkyway (v5.9.0): над ночной тенью, под маршрутами и рамкой диска.
  // zodiac, ecliptic, lines (v6.0.0): над Млечным Путём; lines — экватор
  // и тропики, поверх остальных слоёв неба.
  ['water','land','borders','grid','night','milkyway','zodiac','ecliptic','lines',
   'routes','border'].forEach(function(id) {
    mc.append('g').attr('id', 'layer-' + id);
  });

  // Оверлеи вне map-content — не масштабируются, пересчитываются вручную.
  // Порядок: labels → cities → ruler → trail-* → sun → moon → planets → iss → stars
  // Хвосты рисуются ДО маркеров объектов, чтобы маркер был поверх хвоста.
  // trail-iss добавлен между trail-planets и sun (v5.8.0)
  // layer-iss добавлен между layer-planets и layer-stars (v5.8.0)
  [
    'labels','zlabels','cities','ruler',
    'trail-sun','trail-moon','trail-stars','trail-planets','trail-iss',
    'sun','moon','planets','iss','stars'
  ].forEach(function(id) {
    state.svg.append('g').attr('id', 'layer-' + id);
  });

  // Следим за изменением размера контейнера (поворот телефона и т.п.)
  new ResizeObserver(function() {
    var w = container.clientWidth, h = container.clientHeight;
    if (Math.abs(w - state.width) < 2 && Math.abs(h - state.height) < 2) return;
    state.width = w; state.height = h;
    state.svg.attr('width', w).attr('height', h);
    clearZoomTransform();
    buildProjection();
    render();
  }).observe(container);
}

/* ═══════════════════════════════════════════════════════════════
   ZOOM
═══════════════════════════════════════════════════════════════ */

function setupZoom() {
  state.zoom = d3.zoom()
    .scaleExtent([0.3, 50])
    .on('zoom', function(event) {
      state.svg.select('#map-content').attr('transform', event.transform);
      renderLabels();
      renderCities();
      renderRuler();
      renderAstro();
    });
  state.svg.call(state.zoom)
    .on('dblclick.zoom', function() { resetZoom(); });
}

/**
 * Сбрасывает зум-трансформ в identity (без анимации).
 */
function clearZoomTransform() {
  if (state.zoom) state.svg.call(state.zoom.transform, d3.zoomIdentity);
}

/**
 * Полный сброс: центр → Северный полюс, зум → 1x.
 */
function resetZoom() {
  if (!state.zoom) return;
  document.getElementById('inp-lat').value = 90;
  document.getElementById('inp-lon').value = 0;
  applyCenter(90, 0);
  state.svg.transition().duration(300).call(state.zoom.transform, d3.zoomIdentity);
}

/* ═══════════════════════════════════════════════════════════════
   ПРОЕКЦИЯ
═══════════════════════════════════════════════════════════════ */

function buildProjection() {
  var w = state.width  || window.innerWidth  || 300;
  var h = state.height || window.innerHeight || 300;
  state.projection = d3.geoAzimuthalEquidistant()
    .rotate([-state.lon, -state.lat])
    .fitSize([w, h], { type: 'Sphere' })
    .clipAngle(179.9);
  state.path = d3.geoPath(state.projection);
}

/* ═══════════════════════════════════════════════════════════════
   РЕНДЕР КАРТЫ
═══════════════════════════════════════════════════════════════ */

function render() {
  if (!state.svg || !state.projection) return;

  var lw = state.svg.select('#layer-water');
  lw.selectAll('*').remove();
  lw.append('path').datum({ type:'Sphere' })
    .attr('d', state.path).attr('fill', COLORS.water);

  var ll = state.svg.select('#layer-land');
  ll.selectAll('*').remove();
  if (state.land) {
    ll.selectAll('path').data(state.land.features).join('path')
      .attr('d', state.path).attr('fill', COLORS.land);
  }

  var lb = state.svg.select('#layer-borders');
  lb.selectAll('*').remove();
  if (state.borders) {
    lb.selectAll('path').data(state.borders.features).join('path')
      .attr('d', state.path).attr('fill', 'none')
      .attr('stroke', COLORS.borders).attr('stroke-width', 0.6);
  }

  var lg = state.svg.select('#layer-grid');
  lg.selectAll('*').remove();
  if (state.showGrid) {
    lg.append('path').datum(d3.geoGraticule().step(GRID_STEP)())
      .attr('d', state.path).attr('fill', 'none')
      .attr('stroke', COLORS.grid).attr('stroke-width', 0.5).attr('opacity', 0.7);
  }

  var lbr = state.svg.select('#layer-border');
  lbr.selectAll('*').remove();
  lbr.append('path').datum({ type:'Sphere' })
    .attr('d', state.path).attr('fill', 'none')
    .attr('stroke', COLORS.diskBorder).attr('stroke-width', 1.5);

  renderLines();   // v6.0.0
  renderLabels();
  renderCities();
  renderRoutes();
  renderRuler();
  renderAstro();
}

/**
 * Подписи широт (0°, ±30°, ±60°) и (v6.0.0) названия экватора и тропиков.
 * Названия линий показываются, пока включена сама линия, и не зависят
 * от чекбокса «Подписи координат».
 */
function renderLabels() {
  var layer = state.svg.select('#layer-labels');
  layer.selectAll('*').remove();
  var tr = d3.zoomTransform(state.svg.node());

  if (state.showLabels) {
    [0, 30, 60, -30, -60].forEach(function(lat) {
      var proj = state.projection([state.lon, lat]);
      if (!proj) return;
      var pt = tr.apply(proj);
      layer.append('text')
        .attr('x', pt[0] + 4).attr('y', pt[1]).attr('dy', '0.35em')
        .attr('fill', '#a0d8ef').attr('font-size', '10px')
        .attr('font-family', 'monospace').text(lat + '°');
    });
  }

  /* v6.0.0: названия экватора и тропиков — слева от линии на меридиане центра */
  var t = LANG[state.lang];
  var names = [];
  if (state.showEquator) {
    names.push({ lat: 0, text: t.equatorName, color: LINES_STYLE.equator.color });
  }
  if (state.showTropics) {
    names.push({ lat:  TROPIC_LAT, text: t.tropicCancer,    color: LINES_STYLE.tropics.color });
    names.push({ lat: -TROPIC_LAT, text: t.tropicCapricorn, color: LINES_STYLE.tropics.color });
  }
  names.forEach(function(n) {
    var proj = state.projection([state.lon, n.lat]);
    if (!proj) return;
    var pt = tr.apply(proj);
    layer.append('text')
      .attr('x', pt[0] - 4).attr('y', pt[1]).attr('dy', '-0.4em')
      .attr('text-anchor', 'end')
      .attr('fill', n.color).attr('font-size', '10px').attr('font-family', 'monospace')
      .attr('stroke', 'rgba(0,0,0,0.65)').attr('stroke-width', 2.5)
      .attr('paint-order', 'stroke')
      .attr('pointer-events', 'none')
      .text(n.text);
  });
}

/**
 * Города и пользовательские точки.
 */
function renderCities() {
  var layer = state.svg.select('#layer-cities');
  layer.selectAll('*').remove();
  if (!state.showCities) return;
  var tr = d3.zoomTransform(state.svg.node());
  var k  = tr.k;
  state.points.forEach(function(d) {
    var proj = state.projection([d.lon, d.lat]);
    if (!proj) return;
    var pt = tr.apply(proj);
    layer.append('circle')
      .attr('cx', pt[0]).attr('cy', pt[1]).attr('r', 3)
      .attr('fill', d.names ? COLORS.cityMarker : COLORS.userPoint)
      .attr('stroke', '#000').attr('stroke-width', 0.5);
    layer.append('text')
      .attr('x', pt[0] + 5).attr('y', pt[1] + 3)
      .attr('fill', '#fff')
      .attr('font-size', k >= 1 ? Math.min(12, 10 * k) + 'px' : '0px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(pointLabel(d));
  });
}

/* ═══════════════════════════════════════════════════════════════
   МАРШРУТЫ САМОЛЁТОВ
═══════════════════════════════════════════════════════════════ */

function showRouteTooltip(event, route) {
  var tip = document.getElementById('route-tooltip');
  if (!tip) return;
  var lang = state.lang;
  var t    = LANG[lang];

  var sphereKm = Math.round(d3.geoDistance(route.from, route.to) * 6371);

  var p1 = state.projection(route.from);
  var p2 = state.projection(route.to);
  var aeStr = '—';
  if (p1 && p2) {
    var aePx = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    aeStr = Math.round(aePx / state.projection.scale() * 6371).toLocaleString();
  }

  tip.innerHTML =
    '<div style="font-weight:bold;color:#ffe;margin-bottom:3px;">' +
      (route.label[lang]   || route.label.en) + '</div>' +
    '<div style="color:#7ab;font-size:9px;margin-bottom:6px;">' +
      (route.airline[lang] || route.airline.en) + '</div>' +
    '<div style="margin-bottom:2px;">' +
      '🌍 ' + (t.sphereDist || 'Сфера') + ': <b>' +
      sphereKm.toLocaleString() + '</b> ' + (t.km || 'км') +
    '</div>' +
    '<div style="color:#a0d8ef;">' +
      '📐 ' + (t.aeDist || 'AE') + ': <b>' + aeStr + '</b> ' + (t.km || 'км') +
    '</div>';

  var cx = event.clientX || 60;
  var cy = event.clientY || 60;
  var tx = cx + 14;
  var ty = cy + 14;
  if (tx + 220 > window.innerWidth)  tx = cx - 226;
  if (ty + 90  > window.innerHeight) ty = cy - 96;
  tip.style.left    = tx + 'px';
  tip.style.top     = ty + 'px';
  tip.style.display = 'block';
}

function hideRouteTooltip() {
  var tip = document.getElementById('route-tooltip');
  if (tip) tip.style.display = 'none';
}

function renderRoutes() {
  var layer = state.svg.select('#layer-routes');
  layer.selectAll('*').remove();
  if (!state.showRoutes) return;

  ROUTES.forEach(function(route) {
    var geom = { type:'LineString', coordinates:[route.from, route.to] };

    layer.append('path')
      .datum(geom).attr('d', state.path)
      .attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 14)
      .style('cursor', 'pointer')
      .on('mouseover', function(event) { showRouteTooltip(event, route); })
      .on('mouseout',  function()      { hideRouteTooltip(); })
      .on('click',     function(event) {
        event.stopPropagation();
        showRouteTooltip(event, route);
      });

    layer.append('path')
      .datum(geom).attr('d', state.path)
      .attr('fill', 'none').attr('stroke', route.color)
      .attr('stroke-width', 1.8).attr('stroke-dasharray', '6,3')
      .attr('opacity', 0.85).attr('pointer-events', 'none');

    [route.from, route.to].forEach(function(coord) {
      var proj = state.projection(coord);
      if (!proj) return;
      layer.append('circle')
        .attr('cx', proj[0]).attr('cy', proj[1]).attr('r', 2.5)
        .attr('fill', route.color)
        .attr('stroke', 'rgba(0,0,0,0.65)').attr('stroke-width', 0.8)
        .attr('pointer-events', 'none');
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   НОЧНОЕ ПОЛУШАРИЕ
═══════════════════════════════════════════════════════════════ */

function renderNight() {
  var layer = state.svg.select('#layer-night');
  layer.selectAll('*').remove();
  if (!state.astro.showNight) return;
  var sp = getSunSubpoint(state.astro.date);
  layer.append('path').datum(nightGeoJSON(sp))
    .attr('d', state.path)
    .attr('fill', 'rgba(0,8,28,0.50)')
    .attr('stroke', 'rgba(100,180,255,0.45)')
    .attr('stroke-width', 1.0);
}

/* ═══════════════════════════════════════════════════════════════
   ЭКВАТОР И ТРОПИКИ (v6.0.0) — географические параллели
═══════════════════════════════════════════════════════════════ */

/** Параллель на широте lat как LineString с шагом 1° по долготе. */
function parallelLine(lat) {
  var c = [];
  for (var lon = -180; lon <= 180; lon += 1) c.push([lon, lat]);
  return { type: 'LineString', coordinates: c };
}

/**
 * Общий стиль линий слоёв v6.0.0. non-scaling-stroke — толщина в пикселях
 * экрана не меняется при зуме (слои лежат внутри map-content).
 */
function styleLine(sel, st) {
  return sel
    .attr('fill', 'none')
    .attr('stroke', st.color)
    .attr('stroke-width', st.width)
    .attr('stroke-dasharray', st.dash || null)
    .attr('stroke-linecap', 'round')
    .style('vector-effect', 'non-scaling-stroke')
    .attr('pointer-events', 'none');
}

/**
 * Экватор (широта 0°) и тропики (широта ±TROPIC_LAT).
 * Параллели привязаны к Земле и от времени не зависят — это же и
 * небесный экватор / тропики склонения: точка неба с Dec = ±23.44°
 * лежит над параллелью с той же широтой.
 */
function renderLines() {
  var layer = state.svg.select('#layer-lines');
  layer.selectAll('*').remove();
  if (state.showEquator) {
    styleLine(layer.append('path').datum(parallelLine(0)).attr('d', state.path),
      LINES_STYLE.equator);
  }
  if (state.showTropics) {
    [TROPIC_LAT, -TROPIC_LAT].forEach(function(lat) {
      styleLine(layer.append('path').datum(parallelLine(lat)).attr('d', state.path),
        LINES_STYLE.tropics);
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   НЕБЕСНЫЕ СЛОИ: Млечный Путь, зодиак, эклиптика
═══════════════════════════════════════════════════════════════ */

/**
 * Небесная проекция (v6.0.0, общая для Млечного Пути, зодиака и эклиптики).
 *
 * Точка неба (RA, Dec) лежит над точкой Земли lon = RA - GST, lat = Dec,
 * то есть переход «небо → Земля» — только сдвиг по долготе на -GST.
 * Сдвиг по долготе — вращение вокруг оси полюсов, поэтому его можно
 * свернуть в проекцию: rotate([-state.lon - GST, -state.lat]). Геометрия
 * остаётся в градусах RA/Dec и не пересчитывается; смена центра проекции
 * учитывается тем же rotate — отдельной логики нет.
 *
 * Проекция пересоздаётся только когда меняется ключ (центр, время,
 * размеры); иначе возвращается прежняя. Слои сравнивают f.key со своим
 * ключом и пропускают перерисовку, если ничего не менялось — в первую
 * очередь при зуме и пане (слои лежат внутри map-content, зум делает
 * SVG-трансформ).
 *
 * @returns {{ key: string, proj: Function, path: Function }}
 */
function skyFrame() {
  var gst   = gstHours(state.astro.date) * 15;   // градусы
  var scale = state.projection.scale();
  var tr    = state.projection.translate();

  var key = [
    state.lon, state.lat, gst.toFixed(4),
    scale.toFixed(2), tr[0].toFixed(1), tr[1].toFixed(1)
  ].join('|');

  var f = state.skyFrame;
  if (f.key !== key) {
    f.key  = key;
    f.proj = d3.geoAzimuthalEquidistant()
      .rotate([-state.lon - gst, -state.lat])
      .scale(scale)
      .translate(tr)
      .clipAngle(179.9);
    f.path = d3.geoPath(f.proj);
  }
  return f;
}

/**
 * Млечный Путь: пять вложенных полупрозрачных полигонов-изофот.
 * Рисуется через skyFrame(); перерисовка — только при смене ключа.
 */
function renderMilkyWay() {
  var layer = state.svg.select('#layer-milkyway');
  var mw    = state.milkyway;

  if (!state.astro.showMilkyWay) {
    if (mw.key !== null) { layer.selectAll('*').remove(); mw.key = null; }
    return;
  }
  /* Данные грузятся лениво (main.js → loadMilkyWay), после загрузки
     он сам вызовет renderAstro() */
  if (!mw.data || !mw.data.features) return;

  var f = skyFrame();
  if (mw.key === f.key) return;
  mw.key = f.key;

  var ops = MILKYWAY_STYLE.opacity;
  layer.selectAll('path')
    .data(mw.data.features)
    .join('path')
    .attr('d', f.path)
    .attr('fill', MILKYWAY_STYLE.color)
    .attr('fill-opacity', function(d, i) { return ops[Math.min(i, ops.length - 1)]; })
    .attr('fill-rule', 'evenodd')
    .attr('stroke', 'none')
    .attr('pointer-events', 'none');
}

/**
 * Зодиак: границы 13 созвездий (Змееносец — по отдельному флагу),
 * подсветка созвездия каждого показанного тела, подписи, строка
 * «тело — созвездие» в #zodiac-info.
 *
 * Подсветка: заливка цветом тела (приоритет Солнце → Луна → планеты,
 * если тел в созвездии несколько), цветной ореол и белая обводка границы.
 * Полигоны и подсветка перерисовываются при смене ключа (небесная
 * проекция + набор подсвеченных + флаг Змееносца); подписи лежат в
 * оверлее вне map-content и пересчитываются каждый раз — это нужно при
 * зуме и стоит 13 проекций точки.
 */
function renderZodiac() {
  var layer = state.svg.select('#layer-zodiac');
  var lbls  = state.svg.select('#layer-zlabels');
  var z     = state.zodiac;
  var a     = state.astro;
  var info  = document.getElementById('zodiac-info');

  lbls.selectAll('*').remove();

  if (!a.showZodiac) {
    if (z.key !== null) { layer.selectAll('*').remove(); z.key = null; }
    if (info) info.style.display = 'none';
    return;
  }
  if (!z.data || !z.data.features) {          // ещё грузится (main.js → loadZodiac)
    if (info) info.style.display = 'none';
    return;
  }

  var lang = state.lang;
  var f    = skyFrame();

  /* Какие созвездия показаны: все 13, кроме «extra» (Змееносец) без флага */
  var extra = {};
  ZODIAC.forEach(function(e) { if (e.extra) extra[e.id] = true; });
  var shown = z.data.features.filter(function(ft) {
    return a.showOphiuchus || !extra[ft.id];
  });
  var shownIds = {};
  shown.forEach(function(ft) { shownIds[ft.id] = ft; });

  /* Подсветка: созвездие → первое тело (по приоритету цвета) */
  var hl     = zodiacHighlights();            // [{key,sym,color,label,cid}]
  var hlMap  = {};
  hl.forEach(function(b) { if (b.cid && !hlMap[b.cid]) hlMap[b.cid] = b; });
  var hlIds  = Object.keys(hlMap).filter(function(id) { return shownIds[id]; });

  /* ── Полигоны: перерисовка только при смене ключа ── */
  var zs     = (a.zodiacStars && z.stars) ? z.stars : null;   // v6.1.0
  var key = [
    f.key, a.showOphiuchus ? 1 : 0, zs ? 1 : 0,
    hlIds.map(function(id) { return id + hlMap[id].key; }).join(',')
  ].join('#');

  if (z.key !== key) {
    z.key = key;
    layer.selectAll('*').remove();
    var S = ZODIAC_STYLE;

    /* 1. заливка подсвеченных */
    hlIds.forEach(function(id) {
      layer.append('path').datum(shownIds[id]).attr('d', f.path)
        .attr('fill', hlMap[id].color).attr('fill-opacity', S.hlFillOpacity)
        .attr('stroke', 'none').attr('pointer-events', 'none');
    });

    /* 2. границы всех показанных */
    shown.forEach(function(ft) {
      layer.append('path').datum(ft).attr('d', f.path)
        .attr('fill', 'none')
        .attr('stroke', S.border).attr('stroke-opacity', S.borderOpacity)
        .attr('stroke-width', S.borderWidth)
        .attr('stroke-linejoin', 'round')
        .style('vector-effect', 'non-scaling-stroke')
        .attr('pointer-events', 'none');
    });

    /* 2б. линии фигур созвездий (v6.1.0) */
    if (zs) {
      var SS = ZODIAC_STARS_STYLE;
      shown.forEach(function(ft) {
        var ls = zs.lines[ft.id];
        if (!ls || !ls.length) return;
        var isH = !!hlMap[ft.id];
        layer.append('path')
          .datum({ type: 'MultiLineString', coordinates: ls }).attr('d', f.path)
          .attr('fill', 'none').attr('stroke', isH ? '#ffffff' : SS.line)
          .attr('stroke-opacity', isH ? SS.hlLineOpacity : SS.lineOpacity)
          .attr('stroke-width', isH ? SS.hlLineWidth : SS.lineWidth)
          .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
          .style('vector-effect', 'non-scaling-stroke')
          .attr('pointer-events', 'none');
      });
    }

    /* 3. подсвеченные: цветной ореол + белая обводка */
    hlIds.forEach(function(id) {
      var d = f.path(shownIds[id]);
      layer.append('path').attr('d', d)
        .attr('fill', 'none')
        .attr('stroke', hlMap[id].color).attr('stroke-opacity', S.hlHaloOpacity)
        .attr('stroke-width', S.hlHaloWidth).attr('stroke-linejoin', 'round')
        .style('vector-effect', 'non-scaling-stroke')
        .attr('pointer-events', 'none');
      layer.append('path').attr('d', d)
        .attr('fill', 'none')
        .attr('stroke', S.hlStroke).attr('stroke-width', S.hlWidth)
        .attr('stroke-linejoin', 'round')
        .style('vector-effect', 'non-scaling-stroke')
        .attr('pointer-events', 'none');
    });
  }

  /* ── Звёзды (оверлей: размер не зависит от зума, позиции пересчитываются) ── */
  var tr = d3.zoomTransform(state.svg.node());
  if (zs) {
    var SZ = ZODIAC_STARS_STYLE.sizes;
    var cls = SZ.map(function() { return []; });       // d-путь на класс величины
    shown.forEach(function(ft) {
      (zs.stars[ft.id] || []).forEach(function(s) {
        var p = f.proj([s[0], s[1]]);
        if (!p) return;
        var q = tr.apply(p);
        for (var i = 0; i < SZ.length; i++) {
          if (s[2] < SZ[i].max) {
            cls[i].push('M' + q[0].toFixed(1) + ',' + q[1].toFixed(1) + 'h0');
            break;
          }
        }
      });
    });
    [true, false].forEach(function(isHalo) {           // сначала подложка, потом звёзды
      cls.forEach(function(arr, i) {
        if (!arr.length) return;
        lbls.append('path').attr('d', arr.join(''))
          .attr('fill', 'none')
          .attr('stroke', isHalo ? ZODIAC_STARS_STYLE.halo : ZODIAC_STARS_STYLE.color)
          .attr('stroke-width', SZ[i].d + (isHalo ? ZODIAC_STARS_STYLE.haloExtra : 0))
          .attr('stroke-linecap', 'round')
          .attr('pointer-events', 'none');
      });
    });
  }

  /* ── Подписи (оверлей, с учётом зума) ── */
  shown.forEach(function(ft) {
    var c = z.centers && z.centers[ft.id];
    if (!c) return;
    var p = f.proj(c);
    if (!p) return;
    var q    = tr.apply(p);
    var isHl = !!hlMap[ft.id];
    lbls.append('text')
      .attr('x', q[0]).attr('y', q[1]).attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'sans-serif')
      .attr('font-size', isHl ? '12px' : '10px')
      .attr('font-weight', isHl ? 'bold' : 'normal')
      .attr('fill', isHl ? '#ffffff' : ZODIAC_STYLE.label)
      .attr('stroke', 'rgba(10,0,30,0.75)').attr('stroke-width', 2.5)
      .attr('paint-order', 'stroke')
      .attr('pointer-events', 'none')
      .text(zodiacName(ft.id, lang));
  });

  /* ── Строка «тело — созвездие» ── */
  if (info) {
    if (!hl.length) {
      info.style.display = 'none';
    } else {
      var t   = LANG[lang];
      var sig = lang + '|' + hl.map(function(b) { return b.key + ':' + (b.cid || '-'); }).join('|');
      info.style.display = 'block';
      if (info.dataset.sig !== sig) {            // DOM трогаем, только если текст изменился
        info.dataset.sig = sig;
        info.textContent = '';
        hl.forEach(function(b) {
          var span = document.createElement('span');
          span.style.cssText = 'display:inline-block;margin:0 5px;white-space:nowrap;';
          var sym = document.createElement('span');
          sym.style.color = b.color;
          sym.textContent = b.sym + ' ';
          var nm = document.createElement('span');
          nm.textContent = b.cid ? zodiacName(b.cid, lang) : t.zodiacOutside;
          if (!b.cid) nm.style.opacity = '0.6';
          span.appendChild(sym);
          span.appendChild(nm);
          info.appendChild(span);
        });
      }
    }
  }
}

/**
 * Эклиптика — большой круг (наклон OBLIQUITY к экватору), строится в
 * RA/Dec и рисуется через skyFrame(), поэтому движется вместе с небом.
 * Солнце всё время лежит на ней.
 */
function renderEcliptic() {
  var layer = state.svg.select('#layer-ecliptic');
  var e     = state.ecliptic;

  if (!state.showEcliptic) {
    if (e.key !== null) { layer.selectAll('*').remove(); e.key = null; }
    return;
  }
  var f = skyFrame();
  if (e.key === f.key) return;
  e.key = f.key;

  layer.selectAll('*').remove();
  styleLine(layer.append('path').datum(eclipticLine()).attr('d', f.path),
    LINES_STYLE.ecliptic);
}

/* ═══════════════════════════════════════════════════════════════
   ХВОСТЫ ОБЪЕКТОВ (v5.6.0+)
═══════════════════════════════════════════════════════════════ */

/**
 * Рисует один хвост как серию полилиний с градиентной прозрачностью.
 * Прямые отрезки в пространстве экрана (быстро, без clipping).
 *
 * @param {string}   layerId
 * @param {Array}    history    — [[lon,lat], ...], голова — последний элемент
 * @param {string}   color
 * @param {number}   bands
 * @param {number}   [maxOpacity=0.75]
 */
/**
 * Уплотняет хвост: между соседними точками добавляет промежуточные
 * по долготе/широте (кратчайший путь по долготе через антимеридиан).
 * Субточки тел за час сдвигаются по долготе на 15°, и хорды между ними
 * дают ломаную; промежуточные точки идут вдоль параллели — линия гладкая.
 * (v6.4.0)
 * @param {Array}  coords — [[lon, lat], ...]
 * @param {number} step   — макс. шаг по долготе/широте, градусы
 * @returns {Array} новые координаты [[lon, lat], ...]
 */
function densifyTrail(coords, step) {
  var n = coords.length;
  if (n < 2 || !(step > 0)) return coords;
  var out = [coords[0]];
  for (var i = 1; i < n; i++) {
    var a = coords[i - 1], b = coords[i];
    var dl = ((b[0] - a[0] + 540) % 360) - 180;       // −180..180, кратчайший путь
    var dp = b[1] - a[1];
    var k  = Math.min(64, Math.max(1, Math.ceil(Math.max(Math.abs(dl), Math.abs(dp)) / step)));
    for (var j = 1; j < k; j++) {
      var f = j / k;
      var lon = a[0] + dl * f;
      lon = ((lon + 540) % 360) - 180;
      out.push([lon, a[1] + dp * f]);
    }
    out.push(b);
  }
  return out;
}

function renderTrailPolyline(layerId, history, color, bands, maxOpacity) {
  /* v6.4.0: хвосты рисуются через geoPath с уплотнением — гладкие кривые
     вместо ломаных и корректный разрез на границе видимой области */
  return renderTrailPath(layerId, history, color, bands, maxOpacity);
}

function renderTrailPolylineLegacy(layerId, history, color, bands, maxOpacity) {
  if (!history || history.length < 2) return;

  var layer = state.svg.select('#' + layerId);
  var tr    = d3.zoomTransform(state.svg.node());
  if (maxOpacity === undefined) maxOpacity = 0.75;

  var n       = history.length;
  var segSize = Math.max(1, Math.floor(n / bands));

  for (var b = 0; b < bands; b++) {
    var t       = (b + 1) / bands;
    var opacity = t * maxOpacity;

    var iStart = Math.max(0, b * segSize - 1);
    var iEnd   = Math.min(n - 1, (b + 1) * segSize);

    var pts = [];
    for (var i = iStart; i <= iEnd; i++) {
      var coord = history[i];
      var proj  = state.projection(coord);
      if (!proj) continue;
      var pt = tr.apply(proj);
      pts.push(pt[0].toFixed(1) + ',' + pt[1].toFixed(1));
    }
    if (pts.length < 2) continue;

    layer.append('polyline')
      .attr('points', pts.join(' '))
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.8)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('opacity', opacity)
      .attr('pointer-events', 'none');
  }
}

/**
 * Рисует один хвост как серию path-элементов с дугами большого круга
 * и градиентной прозрачностью (v5.7.0).
 * Zoom-aware: projection + текущий zoomTransform встроены в geoPath.
 *
 * @param {string}   layerId
 * @param {Array}    history    — [[lon,lat], ...], голова — последний элемент
 * @param {string}   color
 * @param {number}   bands
 * @param {number}   [maxOpacity=0.75]
 */
function renderTrailPath(layerId, history, color, bands, maxOpacity) {
  if (!history || history.length < 2) return;

  var layer = state.svg.select('#' + layerId);
  var tr    = d3.zoomTransform(state.svg.node());
  if (maxOpacity === undefined) maxOpacity = 0.75;

  /* Zoom-aware geoPath: компонует projection + текущий transform */
  var zoomedPath = d3.geoPath({
    stream: function(s) {
      return state.projection.stream({
        point: function(x, y) {
          var pt = tr.apply([x, y]);
          s.point(pt[0], pt[1]);
        },
        lineStart:    function() { s.lineStart();    },
        lineEnd:      function() { s.lineEnd();      },
        polygonStart: function() { s.polygonStart(); },
        polygonEnd:   function() { s.polygonEnd();   },
        sphere:       function() { if (s.sphere) s.sphere(); }
      });
    }
  });

  var n       = history.length;
  var segSize = Math.max(1, Math.floor(n / bands));

  /* шаг сглаживания: при очень длинных хвостах увеличиваем, чтобы не
     превысить потолок точек (отдельный хвост на 365 суток × 24 ч = 8760 точек) */
  var smoothStep = TRAIL_SMOOTH_STEP;
  if (n * (15 / smoothStep) > TRAIL_SMOOTH_MAX_POINTS) {
    smoothStep = Math.max(smoothStep, 15 * n / TRAIL_SMOOTH_MAX_POINTS);
  }

  for (var b = 0; b < bands; b++) {
    var t       = (b + 1) / bands;
    var opacity = t * maxOpacity;

    var iStart  = Math.max(0, b * segSize - 1);
    var iEnd    = Math.min(n - 1, (b + 1) * segSize);

    var segment = history.slice(iStart, iEnd + 1);
    if (segment.length < 2) continue;
    segment = densifyTrail(segment, smoothStep);                 // v6.4.0

    layer.append('path')
      .datum({ type: 'LineString', coordinates: segment })
      .attr('d', zoomedPath)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.8)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('opacity', opacity)
      .attr('pointer-events', 'none');
  }
}

function renderSunTrail() {
  var layer = state.svg.select('#layer-trail-sun');
  layer.selectAll('*').remove();
  var t = state.astro.trails.sun;
  if (!t.enabled || !state.astro.showSun) return;
  renderTrailPolyline('layer-trail-sun', t.history, '#fbbf24', TRAIL_BANDS.sunMoon, 0.70);
}

/**
 * Хвост Луны через renderTrailPath (дуги большого круга, v5.7.0).
 */
function renderMoonTrail() {
  var layer = state.svg.select('#layer-trail-moon');
  layer.selectAll('*').remove();
  var t = state.astro.trails.moon;
  if (!t.enabled || !state.astro.showMoon) return;
  renderTrailPath('layer-trail-moon', t.history, '#8ab4e0', TRAIL_BANDS.sunMoon, 0.65);
}

/**
 * Хвосты всех звёзд.
 */
function renderStarTrails() {
  var layer = state.svg.select('#layer-trail-stars');
  layer.selectAll('*').remove();
  var t = state.astro.trails.stars;
  if (!t.enabled || !state.astro.showStars) return;

  for (var i = 0; i < STARS.length; i++) {
    if (!t.history[i] || t.history[i].length < 2) continue;
    renderTrailPolyline('layer-trail-stars', t.history[i],
      STARS[i].color, TRAIL_BANDS.stars, 0.55);
  }
}

/**
 * Хвосты всех планет через renderTrailPath (v5.7.0).
 */
function renderPlanetTrails() {
  var layer = state.svg.select('#layer-trail-planets');
  layer.selectAll('*').remove();
  var t = state.astro.trails.planets;
  if (!t.enabled || !state.astro.showPlanets) return;

  PLANETS.forEach(function(pl) {
    if (!planetOn(pl.key)) return;
    var h = t.history[pl.key];
    if (!h || h.length < 2) return;
    renderTrailPath('layer-trail-planets', h, pl.color, TRAIL_BANDS.planets, 0.60);
  });
}

/**
 * Хвост МКС через renderTrailPath (дуги большого круга). (v5.8.0)
 * Слой: layer-trail-iss. Цвет: #00ff88 (зелёный). Полос: TRAIL_BANDS.iss.
 * МКС движется быстро — между соседними точками (шаг 1 мин = ~460 км)
 * дуги могут быть заметными, поэтому используем geoPath а не polyline.
 */
function renderIssTrail() {
  var layer = state.svg.select('#layer-trail-iss');
  layer.selectAll('*').remove();
  var t = state.astro.trails.iss;
  if (!t.enabled || !state.astro.showIss) return;
  if (!t.history || t.history.length < 2) return;
  renderTrailPath('layer-trail-iss', t.history, '#00ff88', TRAIL_BANDS.iss, 0.70);
}

/**
 * Диспетчер всех хвостов. Вызывается из renderAstro().
 */
function renderTrails() {
  renderSunTrail();
  renderMoonTrail();
  renderStarTrails();
  renderPlanetTrails(); // v5.7.0
  renderIssTrail();     // v5.8.0
}

/* ═══════════════════════════════════════════════════════════════
   ТУЛТИП МКС (v5.8.0)
═══════════════════════════════════════════════════════════════ */

/**
 * Показывает тултип маркера МКС с координатами.
 * @param {Event}  event
 * @param {{ lon: number, lat: number }} pt
 */
function showIssTooltip(event, pt) {
  var tip = document.getElementById('iss-tooltip');
  if (!tip) return;
  var L = LANG[state.lang];
  tip.innerHTML =
    '<div style="font-weight:bold;color:#00ff88;margin-bottom:3px;">🛰 ' + L.bodyIss + '</div>' +
    '<div style="color:#a0c4d8;">' + L.latShort + ': <b>' + pt.lat.toFixed(2) + '°</b></div>' +
    '<div style="color:#a0c4d8;">' + L.lonShort + ': <b>' + pt.lon.toFixed(2) + '°</b></div>';
  var cx = event.clientX || 60;
  var cy = event.clientY || 60;
  var tx = cx + 14, ty = cy + 14;
  if (tx + 160 > window.innerWidth)  tx = cx - 166;
  if (ty + 80  > window.innerHeight) ty = cy - 86;
  tip.style.left    = tx + 'px';
  tip.style.top     = ty + 'px';
  tip.style.display = 'block';
}

/** Скрывает тултип МКС. */
function hideIssTooltip() {
  var tip = document.getElementById('iss-tooltip');
  if (tip) tip.style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════════
   МАРКЕРЫ АСТРО-ОБЪЕКТОВ
═══════════════════════════════════════════════════════════════ */

/**
 * Универсальный маркер (Солнце, Луна).
 * @param {string} layerId
 * @param {number} lon
 * @param {number} lat
 * @param {Object} opts  — { sym, r, fill, stroke, glow, labelColor }
 */
function drawMarker(layerId, lon, lat, opts) {
  var layer = state.svg.select('#' + layerId);
  var proj  = state.projection([lon, lat]);
  if (!proj) return;
  var tr = d3.zoomTransform(state.svg.node());
  var pt = tr.apply(proj);
  var px = pt[0], py = pt[1];

  if (opts.glow) {
    layer.append('circle').attr('cx', px).attr('cy', py)
      .attr('r', opts.r + 10).attr('fill', opts.glow);
  }
  layer.append('circle').attr('cx', px).attr('cy', py)
    .attr('r', opts.r).attr('fill', opts.fill)
    .attr('stroke', opts.stroke || 'none')
    .attr('stroke-width', opts.stroke ? 1.5 : 0);
  layer.append('text').attr('x', px).attr('y', py).attr('dy', '0.38em')
    .attr('text-anchor', 'middle').attr('font-size', (opts.r + 2) + 'px')
    .attr('pointer-events', 'none').text(opts.sym);
  if (opts.coords !== false) {            // v6.4.0: подпись координат отключаемая
    layer.append('text').attr('x', px).attr('y', py - opts.r - 5)
      .attr('text-anchor', 'middle').attr('fill', opts.labelColor || '#ccc')
      .attr('font-size', '9px').attr('font-family', 'monospace')
      .attr('stroke', 'rgba(0,0,0,0.65)').attr('stroke-width', 2.5)
      .attr('paint-order', 'stroke')
      .attr('pointer-events', 'none')
      .text(lat.toFixed(1) + '° ' + lon.toFixed(1) + '°');
  }
}

/**
 * Рисует маркер МКС в слое layer-iss. (v5.8.0)
 *
 * Вид: крестик (две линии ×5px) + полупрозрачный круг + подпись координат.
 * Цвет: #00ff88. Белая обводка круга 0.5px.
 * При наведении/клике — тултип showIssTooltip.
 */
function renderIss() {
  var layer = state.svg.select('#layer-iss');
  layer.selectAll('*').remove();
  if (!state.astro.showIss) return;

  var pt = issSubpoint(state.astro.date); // astro.js
  if (!pt) return; // satrec ещё не загружен или ошибка SGP4

  var proj = state.projection([pt.lon, pt.lat]);
  if (!proj) return;

  var tr = d3.zoomTransform(state.svg.node());
  var xy = tr.apply(proj);
  var px = xy[0], py = xy[1];
  var r  = 5;       // радиус "хотзоны" и длина штриха крестика
  var ISS_COLOR = '#00ff88';

  /* Горизонтальная линия крестика */
  layer.append('line')
    .attr('x1', px - r - 2).attr('y1', py)
    .attr('x2', px + r + 2).attr('y2', py)
    .attr('stroke', ISS_COLOR).attr('stroke-width', 1.5)
    .attr('opacity', 0.95).attr('pointer-events', 'none');

  /* Вертикальная линия крестика */
  layer.append('line')
    .attr('x1', px).attr('y1', py - r - 2)
    .attr('x2', px).attr('y2', py + r + 2)
    .attr('stroke', ISS_COLOR).attr('stroke-width', 1.5)
    .attr('opacity', 0.95).attr('pointer-events', 'none');

  /* Кликабельный круг в центре (хит-зона + hover) */
  layer.append('circle')
    .attr('cx', px).attr('cy', py).attr('r', r)
    .attr('fill', 'rgba(0,255,136,0.12)')
    .attr('stroke', '#ffffff').attr('stroke-width', 0.5)
    .attr('cursor', 'pointer')
    .on('mouseover', function(event) { showIssTooltip(event, pt); })
    .on('mouseout',  function()      { hideIssTooltip(); })
    .on('click',     function(event) {
      event.stopPropagation();
      showIssTooltip(event, pt);
    });

  /* Подпись координат над маркером (v6.4.0: отключается в «Координаты тел») */
  if (state.astro.coordsOn.Iss !== false) {
    layer.append('text')
      .attr('x', px).attr('y', py - r - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', ISS_COLOR).attr('font-size', '9px').attr('font-family', 'monospace')
      .attr('stroke', 'rgba(0,0,0,0.65)').attr('stroke-width', 2.5)
      .attr('paint-order', 'stroke')
      .attr('pointer-events', 'none')
      .text(pt.lat.toFixed(1) + '° ' + pt.lon.toFixed(1) + '°');
  }

  /* Метка "ISS" справа от маркера */
  layer.append('text')
    .attr('x', px + r + 4).attr('y', py + 3)
    .attr('fill', ISS_COLOR).attr('font-size', '8px').attr('font-family', 'monospace')
    .attr('opacity', 0.85).attr('pointer-events', 'none')
    .text('ISS');
}

/**
 * Рисует звёзды и линии созвездий.
 */
function renderStars() {
  var layer = state.svg.select('#layer-stars');
  layer.selectAll('*').remove();
  if (!state.astro.showStars) return;

  var date = state.astro.date;
  var tr   = d3.zoomTransform(state.svg.node());

  STAR_LINES.forEach(function(pair) {
    var s1  = STARS[pair[0]];
    var s2  = STARS[pair[1]];
    var sp1 = starSubpoint(s1.ra, s1.dec, date);
    var sp2 = starSubpoint(s2.ra, s2.dec, date);
    var pr1 = state.projection([sp1.lon, sp1.lat]);
    var pr2 = state.projection([sp2.lon, sp2.lat]);
    if (!pr1 || !pr2) return;
    var pt1 = tr.apply(pr1);
    var pt2 = tr.apply(pr2);
    layer.append('line')
      .attr('x1', pt1[0]).attr('y1', pt1[1])
      .attr('x2', pt2[0]).attr('y2', pt2[1])
      .attr('stroke', 'rgba(180,210,255,0.30)').attr('stroke-width', 0.8)
      .attr('pointer-events', 'none');
  });

  STARS.forEach(function(star) {
    var sp   = starSubpoint(star.ra, star.dec, date);
    var proj = state.projection([sp.lon, sp.lat]);
    if (!proj) return;
    var pt = tr.apply(proj);
    var px = pt[0], py = pt[1];

    if (star.r >= 4) {
      layer.append('circle')
        .attr('cx', px).attr('cy', py).attr('r', star.r + 5)
        .attr('fill', star.color).attr('opacity', 0.10)
        .attr('pointer-events', 'none');
    }
    layer.append('circle')
      .attr('cx', px).attr('cy', py).attr('r', star.r)
      .attr('fill', star.color).attr('opacity', 0.88)
      .attr('stroke', 'rgba(0,0,0,0.4)').attr('stroke-width', 0.5)
      .attr('pointer-events', 'none');
    layer.append('text')
      .attr('x', px).attr('y', py).attr('dy', '0.38em')
      .attr('text-anchor', 'middle')
      .attr('font-size', Math.max(star.r - 1, 4) + 'px')
      .attr('fill', 'rgba(255,255,255,0.75)')
      .attr('pointer-events', 'none').text('✦');
    if (star.r >= 4) {
      layer.append('text')
        .attr('x', px + star.r + 3).attr('y', py - star.r - 1)
        .attr('fill', star.color).attr('font-size', '8px')
        .attr('font-family', 'monospace').attr('opacity', 0.80)
        .attr('pointer-events', 'none')
        .text(star.name[state.lang] || star.name.ru);
    }
  });
}

/**
 * Диспетчер астро-слоёв.
 * Порядок: ночь → хвосты → маркеры.
 */
function renderAstro() {
  renderNight();
  renderMilkyWay(); // v5.9.0
  renderZodiac();   // v6.0.0
  renderEcliptic(); // v6.0.0

  /* Очищаем хвостовые слои */
  ['trail-sun','trail-moon','trail-stars','trail-planets','trail-iss'].forEach(function(id) {
    state.svg.select('#layer-' + id).selectAll('*').remove();
  });

  /* Очищаем маркерные слои */
  ['sun','moon','planets','iss','stars'].forEach(function(id) {
    state.svg.select('#layer-' + id).selectAll('*').remove();
  });

  /* Рисуем хвосты (под маркерами) */
  renderTrails();

  var date = state.astro.date;

  if (state.astro.showSun) {
    var sp = getSunSubpoint(date);
    drawMarker('layer-sun', sp.lon, sp.lat, {
      sym: '☀', r: 9,
      fill: '#fbbf24', stroke: '#f97316',
      glow: 'rgba(251,191,36,0.15)',
      labelColor: '#fde68a',
      coords: state.astro.coordsOn.Sun !== false,
    });
  }

  if (state.astro.showMoon) {
    var mp = bodySubpoint('Moon', date);
    if (mp) {
      drawMarker('layer-moon', mp.lon, mp.lat, {
        sym: moonIcon(date), r: 9,
        fill: 'rgba(180,210,255,0.25)', stroke: '#8ab4e0',
        glow: 'rgba(180,210,255,0.10)',
        labelColor: '#c8deff',
        coords: state.astro.coordsOn.Moon !== false,
      });
    }
  }

  if (state.astro.showPlanets && astroOk()) {
    var layer = state.svg.select('#layer-planets');
    var tr    = d3.zoomTransform(state.svg.node());
    PLANETS.forEach(function(pl) {
      if (!planetOn(pl.key)) return;
      var pp = bodySubpoint(pl.key, date);
      if (!pp) return;
      var proj = state.projection([pp.lon, pp.lat]);
      if (!proj) return;
      var pt = tr.apply(proj);
      var px = pt[0], py = pt[1];
      layer.append('circle').attr('cx', px).attr('cy', py).attr('r', pl.r)
        .attr('fill', pl.color).attr('stroke', '#000').attr('stroke-width', 0.8)
        .attr('opacity', 0.92);
      layer.append('text').attr('x', px).attr('y', py).attr('dy', '0.38em')
        .attr('text-anchor', 'middle').attr('font-size', pl.r + 'px')
        .attr('pointer-events', 'none').text(pl.sym);
      var PL = PLANET_LABEL_STYLE;
      layer.append('text').attr('x', px + pl.r + 3).attr('y', py).attr('dy', '0.35em')
        .attr('fill', pl.color).attr('font-size', PL.size)
        .attr('font-family', PL.family)
        .attr('stroke', PL.halo).attr('stroke-width', PL.haloW)
        .attr('paint-order', 'stroke')
        .attr('pointer-events', 'none')
        .text(pl.label[state.lang] || pl.label.ru);
      if (state.astro.coordsOn[pl.key]) {          // v6.4.0
        layer.append('text').attr('x', px).attr('y', py + pl.r + 11)
          .attr('text-anchor', 'middle')
          .attr('fill', pl.color).attr('font-size', '9px')
          .attr('font-family', PL.family)
          .attr('stroke', PL.halo).attr('stroke-width', PL.haloW)
          .attr('paint-order', 'stroke')
          .attr('pointer-events', 'none')
          .text(pp.lat.toFixed(1) + '° ' + pp.lon.toFixed(1) + '°');
      }
    });
  }

  /* МКС — маркер (v5.8.0) */
  renderIss();

  renderStars();
}

/* ═══════════════════════════════════════════════════════════════
   ЛИНЕЙКА
═══════════════════════════════════════════════════════════════ */

function renderRuler() {
  var layer = state.svg.select('#layer-ruler');
  layer.selectAll('*').remove();
  if (!state.ruler.points.length) return;

  var tr   = d3.zoomTransform(state.svg.node());
  var sPts = state.ruler.points.map(function(p) {
    var proj = state.projection(p);
    return proj ? tr.apply(proj) : null;
  });

  if (sPts.length === 2 && sPts[0] && sPts[1]) {
    layer.append('line')
      .attr('x1', sPts[0][0]).attr('y1', sPts[0][1])
      .attr('x2', sPts[1][0]).attr('y2', sPts[1][1])
      .attr('stroke', COLORS.rulerLine).attr('stroke-width', 2)
      .attr('stroke-dasharray', '7,4').attr('opacity', 0.9);
  }

  sPts.forEach(function(pt, i) {
    if (!pt) return;
    var color = i === 0 ? COLORS.rulerA : COLORS.rulerB;
    layer.append('circle').attr('cx', pt[0]).attr('cy', pt[1]).attr('r', 7)
      .attr('fill', color).attr('stroke', '#fff').attr('stroke-width', 1.5);
    layer.append('text').attr('x', pt[0]).attr('y', pt[1]).attr('dy', '0.38em')
      .attr('text-anchor', 'middle').attr('fill', '#fff')
      .attr('font-size', '9px').attr('font-weight', 'bold')
      .attr('pointer-events', 'none').text(i === 0 ? 'A' : 'B');
  });

  if (sPts.length === 2 && sPts[0] && sPts[1] && state.ruler.distSphere !== null) {
    var mx0 = (sPts[0][0] + sPts[1][0]) / 2;
    var my0 = (sPts[0][1] + sPts[1][1]) / 2;
    var dx  = sPts[1][0] - sPts[0][0];
    var dy  = sPts[1][1] - sPts[0][1];
    var len = Math.sqrt(dx * dx + dy * dy);
    var nx = 0, ny = -1;
    if (len > 2) { nx = -dy / len; ny = dx / len; }
    if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }

    var t  = LANG[state.lang];
    var sp = Math.round(state.ruler.distSphere).toLocaleString();
    var ae = Math.round(state.ruler.distAE).toLocaleString();
    var g  = layer.append('g')
      .attr('transform', 'translate(' + (mx0 + nx * 28) + ',' + (my0 + ny * 28) + ')');
    g.append('rect').attr('x', -80).attr('y', -20).attr('width', 160).attr('height', 40)
      .attr('rx', 5).attr('fill', 'rgba(0,0,0,0.88)')
      .attr('stroke', COLORS.rulerLine).attr('stroke-width', 1);
    g.append('text').attr('y', -5).attr('text-anchor', 'middle')
      .attr('fill', '#fff').attr('font-size', '11px').attr('font-family', 'sans-serif')
      .text(t.sphereDist + ': ' + sp + ' ' + t.km);
    g.append('text').attr('y', 11).attr('text-anchor', 'middle')
      .attr('fill', '#a0d8ef').attr('font-size', '11px').attr('font-family', 'sans-serif')
      .text(t.aeDist + ': ' + ae + ' ' + t.km);
  }
}
