/**
 * Файл    : frontend/static/map.js
 * Версия  : 4.2.1
 * Дата    : 2026-04-20
 * Автор   : Claude Sonnet 4.6 (Anthropic)
 *
 * ИЗМЕНЕНИЯ v4.2.1:
 *   - Подпись с расстоянием смещается перпендикулярно линии на 22px.
 *     Больше не закрывает маркеры A/B при коротких отрезках.
 *     Если линия вырождена (< 2px) — смещение вверх по умолчанию.
 *
 * ИЗМЕНЕНИЯ v4.2.0:
 *   - Линейка расстояний: чекбокс «📏 Линейка», два клика = точки A и B.
 *   - Tap vs drag: клик регистрируется только если палец не двигался
 *     (смещение < 8px за < 250мс). Панорама и зум работают как обычно.
 *   - Два числа в статус-строке:
 *       🌍 По сфере: N км   — великий круг (реальное расстояние)
 *       📐 По AE-карте: N км — евклидово расстояние на плоскости карты
 *     Разница наглядно показывает искажения AE-проекции вне центра.
 *   - Слой layer-ruler: маркеры A/B, пунктирная линия, подпись.
 *   - При смене центра (applyCenter) линейка перерисовывается
 *     (точки остаются, экранные координаты пересчитываются).
 *   - Курсор меняется на crosshair когда линейка активна.
 *
 * АРХИТЕКТУРА:
 *   land.geojson    — ne_110m_land, слитный MultiPolygon суши.
 *   borders.geojson — ne_110m_admin_0_boundary_lines, линии границ.
 *   clipAngle(179.9) — весь глобус без артефактов
 *   requestAnimationFrame — гарантирует CSS-layout до createSVG()
 */

'use strict';

const COLORS = {
  water:      '#1a6ba0',
  land:       '#c8a96e',
  borders:    '#8a6d3a',
  grid:       '#5aaad0',
  diskBorder: '#3a8abf',
  background: '#060e16',
  rulerLine:  '#ff6b35',
  rulerA:     '#ff6b35',
  rulerB:     '#ff3b3b',
  rulerText:  '#ffffff',
};

const GRID_STEP   = [30, 30];
const LAND_URL    = 'data/land.geojson';
const BORDERS_URL = 'data/borders.geojson';

// Tap-detection: максимальное смещение (px) и время (мс) для клика
const TAP_MAX_DIST = 8;
const TAP_MAX_MS   = 250;

const state = {
  lat: 90, lon: 0,
  showGrid: true, showLabels: false,
  land: null, borders: null,
  svg: null, projection: null, path: null,
  width: 0, height: 0,
  zoom: null,
  // Линейка
  ruler: {
    active: false,
    points: [],       // массив [[lon, lat], ...], максимум 2 точки
    distSphere: null, // км по сфере
    distAE: null,     // км по AE-карте (евклидово)
  },
  // Tap detection
  _tapStart: null,    // { x, y, t }
};

// ─────────────────────────────────────────────
// SVG / ZOOM
// ─────────────────────────────────────────────

function createSVG() {
  const container = document.getElementById('map');
  state.width  = container.clientWidth;
  state.height = container.clientHeight;
  state.svg = d3.select('#map')
    .append('svg')
    .attr('width',  state.width)
    .attr('height', state.height)
    .style('display', 'block')
    .style('background', COLORS.background);
  const mapContent = state.svg.append('g').attr('id', 'map-content');
  ['water','land','borders','grid','border','labels','ruler'].forEach(id =>
    mapContent.append('g').attr('id', 'layer-' + id)
  );
  new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    if (Math.abs(w - state.width) < 2 && Math.abs(h - state.height) < 2) return;
    state.width = w; state.height = h;
    state.svg.attr('width', w).attr('height', h);
    clearZoomTransform();   // НЕ resetZoom — иначе клавиатура сбрасывает ввод
    buildProjection();
    render();
  }).observe(container);
}

function setupZoom() {
  state.zoom = d3.zoom()
    .scaleExtent([0.3, 50])
    .on('zoom', (event) => {
      state.svg.select('#map-content')
        .attr('transform', event.transform);
    });
  state.svg.call(state.zoom)
    .on('dblclick.zoom', () => resetZoom());
}

// Только убирает pan/scale transform — центр проекции не трогает.
function clearZoomTransform() {
  if (!state.zoom) return;
  state.svg.call(state.zoom.transform, d3.zoomIdentity);
}

// Полный сброс: центр → Северный полюс + убрать transform.
function resetZoom() {
  if (!state.zoom) return;
  document.getElementById('inp-lat').value = 90;
  document.getElementById('inp-lon').value = 0;
  applyCenter(90, 0);
  state.svg.transition().duration(300)
    .call(state.zoom.transform, d3.zoomIdentity);
}

function buildProjection() {
  const w = state.width  || window.innerWidth  || 300;
  const h = state.height || window.innerHeight || 300;
  state.projection = d3.geoAzimuthalEquidistant()
    .rotate([-state.lon, -state.lat])
    .fitSize([w, h], { type: 'Sphere' })
    .clipAngle(179.9);
  state.path = d3.geoPath(state.projection);
}

// ─────────────────────────────────────────────
// ДАННЫЕ
// ─────────────────────────────────────────────

async function loadData() {
  setStatus('Загрузка данных...');
  try {
    [state.land, state.borders] = await Promise.all([
      d3.json(LAND_URL), d3.json(BORDERS_URL),
    ]);
    const nL = state.land?.features?.length ?? 0;
    const nB = state.borders?.features?.length ?? 0;
    setStatus(`v4.2.1 · ${nL} полигонов · ${nB} границ`);
  } catch (err) {
    console.error('[map.js] Ошибка загрузки:', err);
    state.land = state.borders = { type: 'FeatureCollection', features: [] };
    setStatus('⚠ Ошибка: ' + err.message);
  }
  render();
}

// ─────────────────────────────────────────────
// РЕНДЕР
// ─────────────────────────────────────────────

function render() {
  if (!state.svg || !state.projection) return;

  // Вода
  const lw = state.svg.select('#layer-water');
  lw.selectAll('*').remove();
  lw.append('path').datum({ type: 'Sphere' })
    .attr('d', state.path).attr('fill', COLORS.water).attr('stroke', 'none');

  // Суша
  const ll = state.svg.select('#layer-land');
  ll.selectAll('*').remove();
  if (state.land) {
    ll.selectAll('path').data(state.land.features).join('path')
      .attr('d', state.path).attr('fill', COLORS.land).attr('stroke', 'none');
  }

  // Границы
  const lb2 = state.svg.select('#layer-borders');
  lb2.selectAll('*').remove();
  if (state.borders) {
    lb2.selectAll('path').data(state.borders.features).join('path')
      .attr('d', state.path).attr('fill', 'none')
      .attr('stroke', COLORS.borders).attr('stroke-width', 0.6);
  }

  // Сетка
  const lg = state.svg.select('#layer-grid');
  lg.selectAll('*').remove();
  if (state.showGrid) {
    lg.append('path').datum(d3.geoGraticule().step(GRID_STEP)())
      .attr('d', state.path).attr('fill', 'none')
      .attr('stroke', COLORS.grid).attr('stroke-width', 0.5).attr('opacity', 0.7);
  }

  // Обводка диска
  const lb = state.svg.select('#layer-border');
  lb.selectAll('*').remove();
  lb.append('path').datum({ type: 'Sphere' })
    .attr('d', state.path).attr('fill', 'none')
    .attr('stroke', COLORS.diskBorder).attr('stroke-width', 1.5);

  // Подписи координат
  const llab = state.svg.select('#layer-labels');
  llab.selectAll('*').remove();
  if (state.showLabels) {
    [0, 30, 60, -30, -60].forEach(lat => {
      const pt = state.projection([state.lon, lat]);
      if (!pt) return;
      llab.append('text')
        .attr('x', pt[0] + 4).attr('y', pt[1]).attr('dy', '0.35em')
        .attr('fill', '#a0d8ef').attr('font-size', '10px')
        .attr('font-family', 'monospace').text(`${lat}°`);
    });
  }

  // Линейка
  renderRuler();
}

// ─────────────────────────────────────────────
// ЛИНЕЙКА
// ─────────────────────────────────────────────

/**
 * Рендерит слой линейки.
 * Маркеры A/B, пунктирная линия, подпись посередине.
 * Всё в координатах проекции (масштабируется вместе с зумом).
 */
function renderRuler() {
  const layer = state.svg.select('#layer-ruler');
  layer.selectAll('*').remove();
  if (state.ruler.points.length === 0) return;

  // Экранные координаты точек (в пространстве проекции, до zoom-transform)
  const screenPts = state.ruler.points.map(p => state.projection(p));

  // Пунктирная линия A→B
  if (screenPts.length === 2 && screenPts[0] && screenPts[1]) {
    layer.append('line')
      .attr('x1', screenPts[0][0]).attr('y1', screenPts[0][1])
      .attr('x2', screenPts[1][0]).attr('y2', screenPts[1][1])
      .attr('stroke', COLORS.rulerLine)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '7,4')
      .attr('opacity', 0.9);
  }

  // Маркеры и подписи точек
  screenPts.forEach((pt, i) => {
    if (!pt) return;
    const label = i === 0 ? 'A' : 'B';
    const color = i === 0 ? COLORS.rulerA : COLORS.rulerB;

    // Кружок с обводкой
    layer.append('circle')
      .attr('cx', pt[0]).attr('cy', pt[1])
      .attr('r', 6)
      .attr('fill', color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    // Буква
    layer.append('text')
      .attr('x', pt[0]).attr('y', pt[1])
      .attr('dy', '0.38em')
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(label);
  });

  // Подпись с расстояниями: смещена перпендикулярно линии на LABEL_OFFSET px
  if (
    screenPts.length === 2 && screenPts[0] && screenPts[1] &&
    state.ruler.distSphere !== null
  ) {
    const LABEL_OFFSET = 22; // px, перпендикуляр от линии

    // Середина отрезка
    const mx0 = (screenPts[0][0] + screenPts[1][0]) / 2;
    const my0 = (screenPts[0][1] + screenPts[1][1]) / 2;

    // Единичный вектор вдоль линии
    const ldx = screenPts[1][0] - screenPts[0][0];
    const ldy = screenPts[1][1] - screenPts[0][1];
    const len = Math.sqrt(ldx * ldx + ldy * ldy);

    // Перпендикуляр (повёрнут на 90°). Если линия вырождена — смещение вверх.
    let nx = 0, ny = -1;
    if (len > 2) { nx = -ldy / len; ny = ldx / len; }

    // Выбираем сторону: перпендикуляр всегда «вверх» относительно экрана
    // (ny < 0 — верх экрана). Если перпендикуляр смотрит вниз — инвертируем.
    if (ny > 0) { nx = -nx; ny = -ny; }

    const mx = mx0 + nx * LABEL_OFFSET;
    const my = my0 + ny * LABEL_OFFSET;

    const sphereKm = Math.round(state.ruler.distSphere);
    const aeKm     = Math.round(state.ruler.distAE);

    // Фон подписи
    const bgPad = 4;
    const bgW   = 130, bgH = 30;
    layer.append('rect')
      .attr('x', mx - bgW / 2 - bgPad)
      .attr('y', my - bgH / 2 - bgPad - 2)
      .attr('width', bgW + bgPad * 2)
      .attr('height', bgH + bgPad * 2)
      .attr('rx', 4)
      .attr('fill', 'rgba(6,14,22,0.82)')
      .attr('stroke', COLORS.rulerLine)
      .attr('stroke-width', 1);

    layer.append('text')
      .attr('x', mx).attr('y', my - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#a0d8ef')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('pointer-events', 'none')
      .text(`🌍 ${sphereKm.toLocaleString('ru')} км`);

    layer.append('text')
      .attr('x', mx).attr('y', my + 9)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.rulerLine)
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('pointer-events', 'none')
      .text(`📐 ${aeKm.toLocaleString('ru')} км`);
  }
}

/**
 * Обрабатывает «tap» по карте при активной линейке.
 * event — MouseEvent или PointerEvent, координаты в SVG-пространстве.
 */
function handleRulerTap(svgX, svgY) {
  // Перевести экранные координаты SVG в координаты проекции
  // (с учётом текущего zoom-transform)
  const transform = d3.zoomTransform(state.svg.node());
  const [px, py] = transform.invert([svgX, svgY]);

  // Проекция → [lon, lat]
  const coords = state.projection.invert([px, py]);
  if (!coords) return;
  const [lon, lat] = coords;
  if (!isFinite(lon) || !isFinite(lat)) return;
  // Проверка: точка должна быть внутри диска (не за антиподом)
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;

  // Если уже 2 точки — сброс и начинаем заново
  if (state.ruler.points.length >= 2) {
    state.ruler.points  = [];
    state.ruler.distSphere = null;
    state.ruler.distAE     = null;
  }

  state.ruler.points.push([lon, lat]);

  if (state.ruler.points.length === 1) {
    const [lo, la] = state.ruler.points[0];
    setStatus(
      `📍 A: ${la.toFixed(2)}°, ${lo.toFixed(2)}° — кликните точку B`
    );
  } else {
    // Вычисляем расстояния
    const [A, B] = state.ruler.points;

    // 1. Сфера: d3.geoDistance возвращает угол в радианах
    state.ruler.distSphere = d3.geoDistance(A, B) * 6371;

    // 2. AE-карта: евклидово расстояние на плоскости проекции
    //    projection.scale() = пикселей на радиан
    //    distPx / scale * R = эквивалентные км «по плоскости карты»
    const pA = state.projection(A);
    const pB = state.projection(B);
    if (pA && pB) {
      const distPx = Math.sqrt((pB[0] - pA[0]) ** 2 + (pB[1] - pA[1]) ** 2);
      state.ruler.distAE = distPx / state.projection.scale() * 6371;
    } else {
      state.ruler.distAE = 0;
    }

    const s = Math.round(state.ruler.distSphere).toLocaleString('ru');
    const a = Math.round(state.ruler.distAE).toLocaleString('ru');
    setStatus(`🌍 По сфере: ${s} км  |  📐 По AE-карте: ${a} км`);
  }

  renderRuler();
}

// ─────────────────────────────────────────────
// ПРОЕКЦИЯ / ЦЕНТР
// ─────────────────────────────────────────────

function applyCenter(lat, lon) {
  lat = Math.max(-90,  Math.min(90,  parseFloat(lat) || 0));
  lon = Math.max(-180, Math.min(180, parseFloat(lon) || 0));
  state.lat = lat; state.lon = lon;

  state.projection.rotate([-lon, -lat])
    .fitSize([state.width, state.height], { type: 'Sphere' });
  state.path = d3.geoPath(state.projection);

  // Обновляем статус, если линейка не активна с результатом
  if (state.ruler.points.length < 2) {
    setStatus(`Центр: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
  } else {
    // Пересчитать расстояния для нового масштаба проекции
    const [A, B] = state.ruler.points;
    state.ruler.distSphere = d3.geoDistance(A, B) * 6371;
    const pA = state.projection(A);
    const pB = state.projection(B);
    if (pA && pB) {
      const distPx = Math.sqrt((pB[0] - pA[0]) ** 2 + (pB[1] - pA[1]) ** 2);
      state.ruler.distAE = distPx / state.projection.scale() * 6371;
    }
    const s = Math.round(state.ruler.distSphere).toLocaleString('ru');
    const a = Math.round(state.ruler.distAE).toLocaleString('ru');
    setStatus(`🌍 По сфере: ${s} км  |  📐 По AE-карте: ${a} км`);
  }

  render();
}

// ─────────────────────────────────────────────
// UI / СОБЫТИЯ
// ─────────────────────────────────────────────

function bindUI() {
  // Кнопка Применить
  document.getElementById('btn-apply').addEventListener('click', () =>
    applyCenter(
      document.getElementById('inp-lat').value,
      document.getElementById('inp-lon').value
    )
  );

  // Enter в полях ввода
  ['inp-lat', 'inp-lon'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-apply').click();
    })
  );

  // Кнопки ±
  document.querySelectorAll('.btn-sign').forEach(btn =>
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      const v = parseFloat(inp.value);
      if (!isNaN(v) && v !== 0) inp.value = String(-v);
    })
  );

  // Сетка
  document.getElementById('chk-grid').addEventListener('change', e => {
    state.showGrid = e.target.checked; render();
  });

  // Подписи
  document.getElementById('chk-labels').addEventListener('change', e => {
    state.showLabels = e.target.checked; render();
  });

  // Линейка
  document.getElementById('chk-ruler').addEventListener('change', e => {
    state.ruler.active = e.target.checked;
    // Сброс точек при выключении
    if (!state.ruler.active) {
      state.ruler.points     = [];
      state.ruler.distSphere = null;
      state.ruler.distAE     = null;
      renderRuler();
      setStatus(
        `v4.2.1 · ${state.land?.features?.length ?? 0} полигонов · ` +
        `${state.borders?.features?.length ?? 0} границ`
      );
    } else {
      setStatus('📏 Кликните точку A на карте');
    }
    // Курсор
    document.getElementById('map').style.cursor =
      state.ruler.active ? 'crosshair' : '';
  });

  // Пресеты
  document.querySelectorAll('.btn-preset').forEach(btn =>
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.dataset.lat), lon = parseFloat(btn.dataset.lon);
      document.getElementById('inp-lat').value = lat;
      document.getElementById('inp-lon').value = lon;
      applyCenter(lat, lon);
    })
  );

  // Сброс зума
  const btnResetZoom = document.getElementById('btn-reset-zoom');
  if (btnResetZoom) btnResetZoom.addEventListener('click', resetZoom);

  // ─── Tap detection для линейки ───────────────────────────────────────
  // Работает поверх d3.zoom: короткий неподвижный клик → точка линейки.
  // Длинное нажатие или перемещение → панорама/зум (d3.zoom обрабатывает).

  state.svg.on('pointerdown.ruler', (event) => {
    if (!state.ruler.active) return;
    state._tapStart = {
      x: event.offsetX,
      y: event.offsetY,
      t: Date.now(),
    };
  });

  state.svg.on('pointerup.ruler', (event) => {
    if (!state.ruler.active || !state._tapStart) return;
    const dt = Date.now() - state._tapStart.t;
    const dx = event.offsetX - state._tapStart.x;
    const dy = event.offsetY - state._tapStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    state._tapStart = null;
    if (dt < TAP_MAX_MS && dist < TAP_MAX_DIST) {
      handleRulerTap(event.offsetX, event.offsetY);
    }
    // Если палец двигался — d3.zoom уже обработал панораму, ничего не делаем.
  });

  state.svg.on('pointercancel.ruler', () => {
    state._tapStart = null;
  });
}

// ─────────────────────────────────────────────
// УТИЛИТЫ
// ─────────────────────────────────────────────

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

// ─────────────────────────────────────────────
// ИНИЦИАЛИЗАЦИЯ
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(async () => {
    try {
      createSVG();
      buildProjection();
      setupZoom();
      bindUI();
      await loadData();
    } catch (err) {
      console.error('[FlatEarthMap]', err);
      setStatus('⚠ ' + err.message);
    }
  });
});
