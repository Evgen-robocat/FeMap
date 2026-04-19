/**
 * =============================================================
 * FlatEarthMap — D3.js Azimuthal Equidistant Map
 * =============================================================
 * Файл    : frontend/static/map.js
 * Версия  : 4.1.1
 * Дата    : 2026-04-18
 * Автор   : Claude Sonnet 4.6 (Anthropic)
 *
 * АРХИТЕКТУРА v4.1.1:
 *   Два GeoJSON вместо одного:
 *     land.geojson    — ne_110m_land, слитный MultiPolygon суши.
 *                       Решает баг: countries.geojson содержит Антарктиду
 *                       как огромный полигон, который D3 инвертирует при
 *                       полярной проекции → весь диск заливается сушей.
 *     borders.geojson — ne_110m_admin_0_boundary_lines, линии границ.
 *
 *   Инициализация через requestAnimationFrame:
 *     Гарантирует что CSS-layout посчитан до createSVG().
 *     Без этого clientWidth/clientHeight = 0 на мобильных.
 *
 * ЦВЕТА:
 *   water '#1a6ba0' — морской синий
 *   land  '#c8a96e' — пшеничный (контраст ~5.5:1 к воде)
 *
 * Архитектура функций:
 *   1. COLORS, GRID_STEP, URLs, state
 *   2. createSVG()       — <svg> + 6 слоёв + ResizeObserver
 *   3. buildProjection() — geoAzimuthalEquidistant + clipAngle(90)
 *   4. loadData()        — оба GeoJSON параллельно
 *   5. render()          — вода → суша → границы → сетка → диск → подписи
 *   6. applyCenter()     — rotate() + render()
 *   7. bindUI()          — все обработчики UI
 * =============================================================
 */

'use strict';

/* =============================================================
   1. КОНСТАНТЫ И СОСТОЯНИЕ
   ============================================================= */

const COLORS = {
  water:      '#1a6ba0',  // океан — морской синий
  land:       '#c8a96e',  // суша  — пшеничный (~5.5:1 к воде)
  borders:    '#8a6d3a',  // границы стран
  grid:       '#5aaad0',  // сетка — светлее воды, видна на обоих цветах
  diskBorder: '#3a8abf',  // обводка края диска
  background: '#060e16',  // фон SVG за диском
};

const GRID_STEP   = [30, 30];          // шаг сетки: [долгота, широта]
const LAND_URL    = 'data/land.geojson';
const BORDERS_URL = 'data/borders.geojson';

const state = {
  lat: 90, lon: 0,            // текущий центр проекции
  showGrid: true,             // показывать сетку?
  showLabels: false,          // показывать подписи широт?
  land: null,                 // GeoJSON суши (кэш)
  borders: null,              // GeoJSON границ (кэш)
  svg: null,                  // d3 selection <svg>
  projection: null,           // d3 projection object
  path: null,                 // d3 geoPath generator
  width: 0, height: 0,        // размеры #map в пикселях
};


/* =============================================================
   2. createSVG — создаёт <svg> и 6 слоёв-групп
   ============================================================= */
function createSVG() {
  const container = document.getElementById('map');
  state.width  = container.clientWidth;
  state.height = container.clientHeight;

  state.svg = d3.select('#map')
    .append('svg')
    .attr('width',  state.width)
    .attr('height', state.height)
    .style('display',    'block')        // убирает inline-baseline отступ
    .style('background', COLORS.background);

  // Слои в порядке отрисовки (снизу → вверх)
  ['water', 'land', 'borders', 'grid', 'border', 'labels'].forEach(id =>
    state.svg.append('g').attr('id', 'layer-' + id)
  );

  // ResizeObserver: пересчитываем при изменении размера #map
  new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (Math.abs(w - state.width) < 2 && Math.abs(h - state.height) < 2) return;
    state.width = w; state.height = h;
    state.svg.attr('width', w).attr('height', h);
    buildProjection();
    render();
  }).observe(container);
}


/* =============================================================
   3. buildProjection — настройка проекции
   ============================================================= */
function buildProjection() {
  // Fallback на window.innerWidth если layout ещё не посчитан
  const w = state.width  || window.innerWidth  || 300;
  const h = state.height || window.innerHeight || 300;

  state.projection = d3.geoAzimuthalEquidistant()
    .rotate([-state.lon, -state.lat])  // D3 вращает сферу → знаки инвертированы
    .fitSize([w, h], { type: 'Sphere' }) // автомасштаб в контейнер
    .clipAngle(179.9);  // весь глобус — land.geojson не инвертируется

  state.path = d3.geoPath(state.projection);
}


/* =============================================================
   4. loadData — загрузка обоих GeoJSON параллельно
   ============================================================= */
async function loadData() {
  setStatus('Загрузка данных...');
  try {
    // Promise.all: оба запроса одновременно
    [state.land, state.borders] = await Promise.all([
      d3.json(LAND_URL),
      d3.json(BORDERS_URL),
    ]);
    const nL = state.land?.features?.length    ?? 0;
    const nB = state.borders?.features?.length ?? 0;
    setStatus(`v4.1.1 · ${nL} полигонов · ${nB} границ`);
  } catch (err) {
    console.error('[map.js] Ошибка загрузки:', err);
    state.land    = { type: 'FeatureCollection', features: [] };
    state.borders = { type: 'FeatureCollection', features: [] };
    setStatus('⚠ Ошибка: ' + err.message);
  }
  render();
}


/* =============================================================
   5. render — полная перерисовка всех слоёв
   ============================================================= */
function render() {
  if (!state.svg || !state.projection) return;

  // ── Слой 1: Вода — синий диск ────────────────────────────
  const lw = state.svg.select('#layer-water');
  lw.selectAll('*').remove();
  lw.append('path')
    .datum({ type: 'Sphere' })
    .attr('d',      state.path)
    .attr('fill',   COLORS.water)
    .attr('stroke', 'none');

  // ── Слой 2: Суша — ne_110m_land ──────────────────────────
  // Слитный MultiPolygon — нет инверсии Антарктиды.
  // При clipAngle(90) + центр на Северном полюсе: Антарктида
  // видна как тонкое кольцо по краю диска (она на горизонте).
  const ll = state.svg.select('#layer-land');
  ll.selectAll('*').remove();
  if (state.land) {
    ll.selectAll('path')
      .data(state.land.features)
      .join('path')
      .attr('d',      state.path)
      .attr('fill',   COLORS.land)
      .attr('stroke', 'none');
  }

  // ── Слой 3: Границы стран — поверх суши ──────────────────
  const lb2 = state.svg.select('#layer-borders');
  lb2.selectAll('*').remove();
  if (state.borders) {
    lb2.selectAll('path')
      .data(state.borders.features)
      .join('path')
      .attr('d',            state.path)
      .attr('fill',         'none')
      .attr('stroke',       COLORS.borders)
      .attr('stroke-width', 0.6);
  }

  // ── Слой 4: Сетка ─────────────────────────────────────────
  const lg = state.svg.select('#layer-grid');
  lg.selectAll('*').remove();
  if (state.showGrid) {
    lg.append('path')
      .datum(d3.geoGraticule().step(GRID_STEP)())
      .attr('d',            state.path)
      .attr('fill',         'none')
      .attr('stroke',       COLORS.grid)
      .attr('stroke-width', 0.5)
      .attr('opacity',      0.7);
  }

  // ── Слой 5: Граница диска ─────────────────────────────────
  const lb = state.svg.select('#layer-border');
  lb.selectAll('*').remove();
  lb.append('path')
    .datum({ type: 'Sphere' })
    .attr('d',            state.path)
    .attr('fill',         'none')
    .attr('stroke',       COLORS.diskBorder)
    .attr('stroke-width', 1.5);

  // ── Слой 6: Подписи широт ─────────────────────────────────
  const llab = state.svg.select('#layer-labels');
  llab.selectAll('*').remove();
  if (state.showLabels) {
    [0, 30, 60, -30, -60].forEach(lat => {
      const pt = state.projection([state.lon, lat]);
      if (!pt) return;
      llab.append('text')
        .attr('x', pt[0] + 4).attr('y', pt[1]).attr('dy', '0.35em')
        .attr('fill', '#a0d8ef').attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .text(`${lat}°`);
    });
  }
}


/* =============================================================
   6. applyCenter — смена центра без пересоздания карты
   ============================================================= */
function applyCenter(lat, lon) {
  lat = Math.max(-90,  Math.min(90,  parseFloat(lat) || 0));
  lon = Math.max(-180, Math.min(180, parseFloat(lon) || 0));
  state.lat = lat; state.lon = lon;

  setStatus(`Центр: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);

  // rotate() + fitSize() — БЕЗ пересоздания объекта projection
  state.projection
    .rotate([-lon, -lat])
    .fitSize([state.width, state.height], { type: 'Sphere' });
  state.path = d3.geoPath(state.projection);

  render();
}


/* =============================================================
   7. bindUI — обработчики интерфейса
   ============================================================= */
function bindUI() {

  // Кнопка "Применить"
  document.getElementById('btn-apply').addEventListener('click', () =>
    applyCenter(
      document.getElementById('inp-lat').value,
      document.getElementById('inp-lon').value
    )
  );

  // Enter в полях = клик Применить
  ['inp-lat', 'inp-lon'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-apply').click();
    })
  );

  // Кнопки ± — инверсия знака числа в связанном поле
  document.querySelectorAll('.btn-sign').forEach(btn =>
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      const v = parseFloat(inp.value);
      if (!isNaN(v) && v !== 0) inp.value = String(-v);
    })
  );

  // Чекбокс сетки
  document.getElementById('chk-grid').addEventListener('change', e => {
    state.showGrid = e.target.checked; render();
  });

  // Чекбокс подписей
  document.getElementById('chk-labels').addEventListener('change', e => {
    state.showLabels = e.target.checked; render();
  });

  // Пресеты
  document.querySelectorAll('.btn-preset').forEach(btn =>
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.dataset.lat);
      const lon = parseFloat(btn.dataset.lon);
      document.getElementById('inp-lat').value = lat;
      document.getElementById('inp-lon').value = lon;
      applyCenter(lat, lon);
    })
  );
}


/* =============================================================
   Вспомогательные
   ============================================================= */
function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}


/* =============================================================
   ТОЧКА ВХОДА
   =============================================================
   requestAnimationFrame: гарантирует что CSS-layout посчитан.
   Без этого на мобильных clientWidth/clientHeight = 0,
   fitSize([0,0]) бросает исключение, карта не рисуется,
   статус навсегда остаётся "Инициализация…".
   ============================================================= */
document.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(async () => {
    try {
      createSVG();
      buildProjection();
      bindUI();
      await loadData();
    } catch (err) {
      console.error('[FlatEarthMap] Критическая ошибка:', err);
      setStatus('⚠ ' + err.message);
    }
  });
});
