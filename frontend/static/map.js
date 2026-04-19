/**
 * Файл    : frontend/static/map.js
 * Версия  : 4.1.4
 * Дата    : 2026-04-19
 * Автор   : Claude Sonnet 4.6 (Anthropic)
 *
 * ИЗМЕНЕНИЯ v4.1.4:
 *   - Фикс: открытие клавиатуры на Android сжимает viewport → ResizeObserver
 *     раньше вызывал resetZoom() → сбрасывал введённые координаты.
 *     Теперь две отдельные функции:
 *       clearZoomTransform() — только убирает pan/scale transform (для ресайза)
 *       resetZoom()          — сбрасывает всё включая центр (кнопка / двойной клик)
 *
 * АРХИТЕКТУРА:
 *   land.geojson    — ne_110m_land, слитный MultiPolygon суши.
 *                     Решает баг инверсии Антарктиды при полярной проекции.
 *   borders.geojson — ne_110m_admin_0_boundary_lines, линии границ.
 *   clipAngle(179.9) — весь глобус без артефактов (работает с ne_110m_land)
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
};

const GRID_STEP   = [30, 30];
const LAND_URL    = 'data/land.geojson';
const BORDERS_URL = 'data/borders.geojson';

const state = {
  lat: 90, lon: 0,
  showGrid: true, showLabels: false,
  land: null, borders: null,
  svg: null, projection: null, path: null,
  width: 0, height: 0,
  zoom: null,
};

// ─── SVG ───────────────────────────────────────────────────────────────────

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

  // Все слои — внутри одной группы; зум сдвигает/масштабирует только её
  const mapContent = state.svg.append('g').attr('id', 'map-content');
  ['water','land','borders','grid','border','labels'].forEach(id =>
    mapContent.append('g').attr('id', 'layer-' + id)
  );

  new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    if (Math.abs(w - state.width) < 2 && Math.abs(h - state.height) < 2) return;
    state.width = w; state.height = h;
    state.svg.attr('width', w).attr('height', h);
    // ВАЖНО: clearZoomTransform, а не resetZoom —
    // иначе открытие клавиатуры на Android сбрасывает введённые координаты
    clearZoomTransform();
    buildProjection();
    render();
  }).observe(container);
}

// ─── ZOOM ──────────────────────────────────────────────────────────────────

function setupZoom() {
  state.zoom = d3.zoom()
    .scaleExtent([0.3, 50])   // 0.3× — отдалить; 50× — глубокое приближение
    .on('zoom', (event) => {
      state.svg.select('#map-content')
        .attr('transform', event.transform);
    });

  state.svg
    .call(state.zoom)
    .on('dblclick.zoom', () => resetZoom());
}

// Только убирает pan/scale transform — центр проекции не трогает.
// Используется при ресайзе (в т.ч. когда Android открывает клавиатуру).
function clearZoomTransform() {
  if (!state.zoom) return;
  state.svg.call(state.zoom.transform, d3.zoomIdentity);
}

// Полный сброс: центр → Северный полюс + убрать transform.
// Используется кнопкой ⊙ и двойным кликом/тапом.
function resetZoom() {
  if (!state.zoom) return;
  document.getElementById('inp-lat').value = 90;
  document.getElementById('inp-lon').value = 0;
  applyCenter(90, 0);
  state.svg.transition().duration(300)
    .call(state.zoom.transform, d3.zoomIdentity);
}

// ─── ПРОЕКЦИЯ ──────────────────────────────────────────────────────────────

function buildProjection() {
  const w = state.width  || window.innerWidth  || 300;
  const h = state.height || window.innerHeight || 300;
  state.projection = d3.geoAzimuthalEquidistant()
    .rotate([-state.lon, -state.lat])
    .fitSize([w, h], { type: 'Sphere' })
    .clipAngle(179.9);
  state.path = d3.geoPath(state.projection);
}

// ─── ДАННЫЕ ────────────────────────────────────────────────────────────────

async function loadData() {
  setStatus('Загрузка данных...');
  try {
    [state.land, state.borders] = await Promise.all([
      d3.json(LAND_URL), d3.json(BORDERS_URL),
    ]);
    const nL = state.land?.features?.length ?? 0;
    const nB = state.borders?.features?.length ?? 0;
    setStatus(`v4.1.4 · ${nL} полигонов · ${nB} границ`);
  } catch (err) {
    console.error('[map.js] Ошибка загрузки:', err);
    state.land = state.borders = { type: 'FeatureCollection', features: [] };
    setStatus('⚠ Ошибка: ' + err.message);
  }
  render();
}

// ─── РЕНДЕР ────────────────────────────────────────────────────────────────

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

  // Граница диска
  const lb = state.svg.select('#layer-border');
  lb.selectAll('*').remove();
  lb.append('path').datum({ type: 'Sphere' })
    .attr('d', state.path).attr('fill', 'none')
    .attr('stroke', COLORS.diskBorder).attr('stroke-width', 1.5);

  // Подписи
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
}

// ─── UI ────────────────────────────────────────────────────────────────────

function applyCenter(lat, lon) {
  lat = Math.max(-90,  Math.min(90,  parseFloat(lat) || 0));
  lon = Math.max(-180, Math.min(180, parseFloat(lon) || 0));
  state.lat = lat; state.lon = lon;
  setStatus(`Центр: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
  state.projection.rotate([-lon, -lat])
    .fitSize([state.width, state.height], { type: 'Sphere' });
  state.path = d3.geoPath(state.projection);
  render();
}

function bindUI() {
  document.getElementById('btn-apply').addEventListener('click', () =>
    applyCenter(
      document.getElementById('inp-lat').value,
      document.getElementById('inp-lon').value
    )
  );

  ['inp-lat', 'inp-lon'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-apply').click();
    })
  );

  document.querySelectorAll('.btn-sign').forEach(btn =>
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      const v = parseFloat(inp.value);
      if (!isNaN(v) && v !== 0) inp.value = String(-v);
    })
  );

  document.getElementById('chk-grid').addEventListener('change', e => {
    state.showGrid = e.target.checked; render();
  });

  document.getElementById('chk-labels').addEventListener('change', e => {
    state.showLabels = e.target.checked; render();
  });

  document.querySelectorAll('.btn-preset').forEach(btn =>
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.dataset.lat), lon = parseFloat(btn.dataset.lon);
      document.getElementById('inp-lat').value = lat;
      document.getElementById('inp-lon').value = lon;
      applyCenter(lat, lon);
    })
  );

  const btnResetZoom = document.getElementById('btn-reset-zoom');
  if (btnResetZoom) btnResetZoom.addEventListener('click', resetZoom);
}

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

// ─── INIT ──────────────────────────────────────────────────────────────────

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
