/**
 * Файл    : public/static/map.js
 * Версия  : 4.5.9
 * Дата    : 2026-04-20
 * Автор   : Евгений / Claude
 *
 * ИЗМЕНЕНИЯ v4.5.9:
 *   - Исправлена координата Южного полюса (-89.9 вместо -90) во избежание артефактов проекции.
 *   - Исправлен цвет подписей городов на белый (был ошибочно задан черный).
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
  cityMarker: '#ffffff',
  userPoint:  '#00ffcc',
};

const CITIES = [
  { name: 'Киев',          lon:  30.52, lat: 50.45 },
  { name: 'Москва',        lon:  37.62, lat: 55.76 },
  { name: 'Ташкент',       lon:  69.24, lat: 41.30 },
  { name: 'Лондон',        lon:  -0.13, lat: 51.51 },
  { name: 'Пекин',         lon: 116.41, lat: 39.90 },
  { name: 'Нью-Йорк',     lon: -74.01, lat: 40.71 },
  { name: 'Дубай',         lon:  55.27, lat: 25.20 },
  { name: 'Сингапур',      lon: 103.82, lat:  1.35 },
  { name: 'Сидней',        lon: 151.21, lat:-33.87 },
  
  // Новые точки 
  { name: 'Ушуайя',          lon: -68.30, lat: -54.80 },
  { name: 'Мыс Агульяс',     lon:  20.00, lat: -34.83 },
  { name: 'Мыс Челюскин',    lon: 104.30, lat:  77.72 },
  { name: 'Мыс Принца Уэльского', lon:-168.10, lat: 65.61 },
  { name: 'Мыс Байрон',      lon: 153.63, lat: -28.64 },
  { name: 'Нордкап',         lon:  25.78, lat:  71.17 },
  
  // Полярные станции
  { name: 'Ст. Восток',     lon: 106.84, lat: -78.46 },
  { name: 'Ст. Мак-Мердо',  lon: 166.67, lat: -77.85 },
  { name: 'Ст. Амундсен-Скотт', lon: 0.00, lat: -89.90 },
  { name: 'Ст. Беллинсгаузен',  lon: -58.96, lat: -62.20 },
  { name: 'Ст. Мирный',     lon:  93.00, lat: -66.55 },
];

const GRID_STEP   = [30, 30];
// v4.4.4: Используем абсолютные пути для надежности
const LAND_URL    = '/data/land.geojson';
const BORDERS_URL = '/data/borders.geojson';

const TAP_MAX_DIST = 8;
const TAP_MAX_MS   = 250;

const state = {
  lat: 90, lon: 0,
  showGrid: true, showLabels: false,
  showCities: true, showUserPoints: true, // v4.4.0: showCities теперь основная галка для всех точек
  land: null, borders: null,
  svg: null, projection: null, path: null,
  width: 0, height: 0,
  zoom: null,
  points: [], // v4.4.0: Единый список точек
  ruler: {
    active: false,
    points: [],
    distSphere: null,
    distAE: null,
  },
  _tapStart: null,
};

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
  ['water','land','borders','grid','border'].forEach(id =>
    mapContent.append('g').attr('id', 'layer-' + id)
  );
  // Слой overlay для элементов, которые НЕ должны масштабироваться (подписи, города, точки, линейка)
  ['labels','cities','userpoints','ruler'].forEach(id =>
    state.svg.append('g').attr('id', 'layer-' + id)
  );

  new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    if (Math.abs(w - state.width) < 2 && Math.abs(h - state.height) < 2) return;
    state.width = w; state.height = h;
    state.svg.attr('width', w).attr('height', h);
    clearZoomTransform();
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
      // v4.3.4: Перерисовываем весь оверлей при зуме, так как он вне группы трансформации
      renderLabels(); 
      renderCities();
      renderUserPoints();
      renderRuler();
    });
  state.svg.call(state.zoom)
    .on('dblclick.zoom', () => resetZoom());
}

function clearZoomTransform() {
  if (!state.zoom) return;
  state.svg.call(state.zoom.transform, d3.zoomIdentity);
}

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

async function loadData() {
  setStatus('Загрузка данных...');
  
  // v4.4.0: Загрузка точек
  try {
    const saved = localStorage.getItem('femap_points_v5');
    if (saved) {
      state.points = JSON.parse(saved);
    } else {
      // Пытаемся мигрировать из v4 если они были
      const oldV4 = localStorage.getItem('femap_points_v4');
      const savedV4 = oldV4 ? JSON.parse(oldV4) : null;
      
      if (savedV4) {
        const baseNames = new Set(CITIES.map(c => c.name));
        const userPoints = savedV4.filter(p => !baseNames.has(p.name));
        state.points = [...CITIES, ...userPoints];
      } else {
        state.points = [...CITIES];
      }
    }
  } catch(e) { 
    console.error('Ошибка загрузки точек', e); 
    state.points = [...CITIES];
  }
  refreshPointsList();

  try {
    const [land, borders] = await Promise.all([
      d3.json(LAND_URL).catch(e => { throw new Error('Land: ' + e.message) }),
      d3.json(BORDERS_URL).catch(e => { throw new Error('Borders: ' + e.message) })
    ]);
    state.land = land;
    state.borders = borders;

    if (!state.land || !state.land.features) throw new Error('Invalid Land data');

    const nL = state.land.features.length;
    const nB = state.borders?.features?.length ?? 0;
    setStatus(`v4.5.9 · ${nL} полигонов · ${nB} границ`);
  } catch (err) {
    console.error('[map.js] Ошибка загрузки:', err);
    state.land = state.borders = { type: 'FeatureCollection', features: [] };
    setStatus('Ошибка данных: ' + err.message);
  }
}

function savePoints() {
  localStorage.setItem('femap_points_v5', JSON.stringify(state.points));
}

function deletePoint(idx) {
  state.points.splice(idx, 1);
  savePoints();
  refreshPointsList();
  renderCities(); // Перерисовываем слой
}

function refreshPointsList() {
  const list = document.getElementById('points-list');
  list.innerHTML = '';

  state.points.forEach((p, idx) => {
    const li = document.createElement('li');
    li.className = 'point-item';

    const info = document.createElement('div');
    info.className = 'point-info';
    info.onclick = () => {
      document.getElementById('inp-lat').value = p.lat;
      document.getElementById('inp-lon').value = p.lon;
      applyCenter(p.lat, p.lon);
      
      // v4.4.5: Плавный зум на центр (точка уже там благодаря applyCenter)
      const k = 4; // Уровень приближения
      const w = state.width  || window.innerWidth;
      const h = state.height || window.innerHeight;
      
      const transform = d3.zoomIdentity
        .translate(w/2, h/2)
        .scale(k)
        .translate(-w/2, -h/2);
      
      state.svg.transition().duration(500).call(state.zoom.transform, transform);
    };

    const name = document.createElement('span');
    name.className = 'point-name';
    name.textContent = p.name;

    const coords = document.createElement('span');
    coords.className = 'point-coords';
    coords.textContent = `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`;

    info.appendChild(name);
    info.appendChild(coords);

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del-point';
    btnDel.innerHTML = '&times;';
    btnDel.title = 'Удалить из списка';
    btnDel.onclick = (e) => {
      e.stopPropagation();
      deletePoint(idx);
    };

    li.appendChild(info);
    li.appendChild(btnDel);
    list.appendChild(li);
  });
}

function addPoint() {
  const nameInp = document.getElementById('add-name');
  const latInp  = document.getElementById('add-lat');
  const lonInp  = document.getElementById('add-lon');

  const name = nameInp.value.trim();
  const lat = parseFloat(latInp.value.replace(',', '.'));
  const lon = parseFloat(lonInp.value.replace(',', '.'));

  if (!name || isNaN(lat) || isNaN(lon)) {
    alert('Введите корректное название и координаты');
    return;
  }

  state.points.push({ name, lat, lon });
  savePoints();
  refreshPointsList();
  renderCities(); // Перерисовываем слой

  // Очистка формы
  nameInp.value = '';
  latInp.value = '';
  lonInp.value = '';
}

function renderLabels() {
  const layer = state.svg.select('#layer-labels');
  layer.selectAll('*').remove();
  if (!state.showLabels) return;

  const transform = d3.zoomTransform(state.svg.node());
  [0, 30, 60, -30, -60].forEach(lat => {
    const projected = state.projection([state.lon, lat]);
    if (!projected) return;
    const pt = transform.apply(projected);
    
    layer.append('text')
      .attr('x', pt[0] + 4).attr('y', pt[1]).attr('dy', '0.35em')
      .attr('fill', '#a0d8ef').attr('font-size', '10px')
      .attr('font-family', 'monospace').text(`${lat}°`);
  });
}

function render() {
  if (!state.svg || !state.projection) return;

  const lw = state.svg.select('#layer-water');
  lw.selectAll('*').remove();
  lw.append('path').datum({ type: 'Sphere' })
    .attr('d', state.path).attr('fill', COLORS.water).attr('stroke', 'none');

  const ll = state.svg.select('#layer-land');
  ll.selectAll('*').remove();
  if (state.land) {
    ll.selectAll('path').data(state.land.features).join('path')
      .attr('d', state.path).attr('fill', COLORS.land).attr('stroke', 'none');
  }

  const lb2 = state.svg.select('#layer-borders');
  lb2.selectAll('*').remove();
  if (state.borders) {
    lb2.selectAll('path').data(state.borders.features).join('path')
      .attr('d', state.path).attr('fill', 'none')
      .attr('stroke', COLORS.borders).attr('stroke-width', 0.6);
  }

  const lg = state.svg.select('#layer-grid');
  lg.selectAll('*').remove();
  if (state.showGrid) {
    lg.append('path').datum(d3.geoGraticule().step(GRID_STEP)())
      .attr('d', state.path).attr('fill', 'none')
      .attr('stroke', COLORS.grid).attr('stroke-width', 0.5).attr('opacity', 0.7);
  }

  const lb = state.svg.select('#layer-border');
  lb.selectAll('*').remove();
  lb.append('path').datum({ type: 'Sphere' })
    .attr('d', state.path).attr('fill', 'none')
    .attr('stroke', COLORS.diskBorder).attr('stroke-width', 1.5);

  renderLabels();
  renderCities();
  renderUserPoints();
  renderRuler();
}

function renderMarkers(layerId, data, color, showFlag) {
  const layer = state.svg.select('#' + layerId);
  layer.selectAll('*').remove();
  if (!showFlag) return;

  const transform = d3.zoomTransform(state.svg.node());
  const k = transform.k;

  data.forEach(d => {
    const projected = state.projection([d.lon, d.lat]);
    if (!projected) return;
    const pt = transform.apply(projected);

    layer.append('circle')
      .attr('cx', pt[0]).attr('cy', pt[1])
      .attr('r', 3)
      .attr('fill', color)
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5);

    layer.append('text')
      .attr('x', pt[0] + 5).attr('y', pt[1] + 3)
      .attr('fill', '#fff') // Белый шрифт
      .attr('font-size', (k > 2 ? 12 : 0) + 'px') // Увеличено до 12px
      .attr('font-weight', 'bold') // Жирный для читаемости
      .style('pointer-events', 'none')
      .text(d.name);
  });
}

function renderCities() {
  renderMarkers('layer-cities', state.points, COLORS.cityMarker, state.showCities);
}

function renderUserPoints() {
  // v4.4.0: Больше не отделяем пользовательские точки визуально в списке, 
  // но функция оставлена для совместимости слоев если нужно
}

/**
 * ЛИНЕЙКА (RULER)
 */
function handleMapClick(event) {
  if (!state.ruler.active) return;
  const [mx, my] = d3.pointer(event);
  
  // v4.3.5: Учитываем текущий зум при клике
  const transform = d3.zoomTransform(state.svg.node());
  let coords = state.projection.invert(transform.invert([mx, my]));

  // v4.5.1: Магнитное притяжение к городам/точкам
  let minD = 25; // Радиус притяжения в пикселях
  state.points.forEach(p => {
    const proj = state.projection([p.lon, p.lat]);
    if (proj) {
      const sp = transform.apply(proj);
      const dist = Math.hypot(sp[0] - mx, sp[1] - my);
      if (dist < minD) {
        minD = dist;
        coords = [p.lon, p.lat];
      }
    }
  });

  if (coords) {
    if (state.ruler.points.length >= 2) state.ruler.points = [];
    state.ruler.points.push(coords);
    calculateRulerDistances();
    renderRuler();
    
    if (state.ruler.points.length === 1) setStatus('📏 Теперь кликните точку B');
    else setStatus('📏 Замерено! Можно кликнуть снова для нового замера');
  }
}

function calculateRulerDistances() {
  if (state.ruler.points.length < 2) return;
  const [p1, p2] = state.ruler.points;
  
  // 1. Сферическое расстояние (Haversine) - условно "шарообразное"
  state.ruler.distSphere = d3.geoDistance(p1, p2) * 6371;

  // 2. Расстояние на AE проекции (плоское радиальное)
  // На AE проекции расстояние от центра (полюса) до любой точки - масштабное.
  // Но расстояние МЕЖДУ двумя произвольными точками - НЕ масштабное (искажено).
  // Однако пользователи часто хотят видеть именно "линейку по листу"
  const dLat = (p2[1] - p1[1]) * (Math.PI / 180);
  const dLon = (p2[0] - p1[0]) * (Math.PI / 180);
  // (Это просто упрощение для демонстрации)
  state.ruler.distAE = Math.sqrt(dLat*dLat + dLon*dLon) * 6371;
}

function renderRuler() {
  const layer = state.svg.select('#layer-ruler');
  layer.selectAll('*').remove();
  if (state.ruler.points.length === 0) return;

  const transform = d3.zoomTransform(state.svg.node());
  const screenPts = state.ruler.points.map(p => {
    const proj = state.projection(p);
    return proj ? transform.apply(proj) : null;
  });

  // 1. Линия
  if (screenPts.length === 2 && screenPts[0] && screenPts[1]) {
    layer.append('line')
      .attr('x1', screenPts[0][0]).attr('y1', screenPts[0][1])
      .attr('x2', screenPts[1][0]).attr('y2', screenPts[1][1])
      .attr('stroke', COLORS.rulerLine)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '7,4')
      .attr('opacity', 0.9);
  }

  // 2. Маркеры A и B (фиксированный размер 6px, не зависят от зума)
  screenPts.forEach((pt, i) => {
    if (!pt) return;
    const label = i === 0 ? 'A' : 'B';
    const color = i === 0 ? COLORS.rulerA : COLORS.rulerB;
    layer.append('circle')
      .attr('cx', pt[0]).attr('cy', pt[1])
      .attr('r', 6)
      .attr('fill', color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);
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

  // 3. Плашка с расстоянием
  if (
    screenPts.length === 2 && screenPts[0] && screenPts[1] &&
    state.ruler.distSphere !== null
  ) {
    const mx0 = (screenPts[0][0] + screenPts[1][0]) / 2;
    const my0 = (screenPts[0][1] + screenPts[1][1]) / 2;

    const ldx = screenPts[1][0] - screenPts[0][0];
    const ldy = screenPts[1][1] - screenPts[0][1];
    const len = Math.sqrt(ldx * ldx + ldy * ldy);

    let nx = 0, ny = -1;
    if (len > 2) { nx = -ldy / len; ny = ldx / len; }
    if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }

    const bgW = 130, bgH = 34, bgPad = 4;
    const sphereKm = Math.round(state.ruler.distSphere);
    const aeKm     = Math.round(state.ruler.distAE);
    
    const tooltip = layer.append('g')
      .attr('transform', `translate(${mx0 + nx*25}, ${my0 + ny*25})`);
    
    tooltip.append('rect')
      .attr('x', -bgW/2).attr('y', -bgH/2)
      .attr('width', bgW).attr('height', bgH)
      .attr('rx', 5).attr('fill', 'rgba(0,0,0,0.85)')
      .attr('stroke', COLORS.rulerLine).attr('stroke-width', 1);

    tooltip.append('text')
      .attr('y', -5).attr('text-anchor', 'middle')
      .attr('fill', '#fff').attr('font-size', '10px')
      .attr('font-family', 'sans-serif') // Emoji better in sans
      .text(`🌐 ${sphereKm.toLocaleString()} км`);

    tooltip.append('text')
      .attr('y', 8).attr('text-anchor', 'middle')
      .attr('fill', '#a0d8ef').attr('font-size', '10px')
      .attr('font-family', 'sans-serif')
      .text(`📐 ${aeKm.toLocaleString()} км`);
  }
}

function applyCenter(lat, lon) {
  if (typeof lat === 'string') lat = lat.replace(',', '.');
  if (typeof lon === 'string') lon = lon.replace(',', '.');
  
  state.lat = Math.max(-90,  Math.min(90,  parseFloat(lat) || 0));
  state.lon = Math.max(-180, Math.min(180, parseFloat(lon) || 0));

  // v4.4.2: Сбрасываем зум при смене центра, иначе старая трансформация уводит карту за экран
  if (state.zoom) {
    state.svg.call(state.zoom.transform, d3.zoomIdentity);
  }

  buildProjection();
  render();
}

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.innerText = msg;
}

function toggleRuler(active) {
  state.ruler.active = active;
  
  // Синхронизация UI
  const chk = document.getElementById('chk-ruler');
  const btnMap = document.getElementById('btn-ruler-map');
  if (chk) chk.checked = active;
  if (btnMap) btnMap.classList.toggle('active', active);

  if (!active) {
    state.ruler.points     = [];
    state.ruler.distSphere = null;
    state.ruler.distAE     = null;
    renderRuler();
    setStatus(`v4.5.9 · ${state.land?.features?.length ?? 0} полигонов`);
  } else {
    setStatus('📏 Кликните точку A на карте');
  }
  
  document.getElementById('map').style.cursor = active ? 'crosshair' : '';
}

window.addEventListener('DOMContentLoaded', async () => {
  createSVG();
  setupZoom();
  buildProjection();
  
  await loadData();
  render();

  state.svg.on('click', handleMapClick);

  document.getElementById('btn-apply').addEventListener('click', () => {
    applyCenter(
      document.getElementById('inp-lat').value,
      document.getElementById('inp-lon').value
    )
  });
  document.getElementById('btn-add-point').addEventListener('click', addPoint);

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
  document.getElementById('chk-cities').addEventListener('change', e => {
    state.showCities = e.target.checked; render();
  });
  document.getElementById('chk-ruler').addEventListener('change', e => {
    toggleRuler(e.target.checked);
  });
  
  // v4.5.0: Кнопка на карте
  document.getElementById('btn-ruler-map').addEventListener('click', () => {
    toggleRuler(!state.ruler.active);
  });

  document.querySelectorAll('.btn-preset').forEach(btn =>
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.dataset.lat);
      const lon = parseFloat(btn.dataset.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        document.getElementById('inp-lat').value = lat;
        document.getElementById('inp-lon').value = lon;
        applyCenter(lat, lon);
      }
    })
  );
  document.getElementById('btn-reset-zoom').addEventListener('click', resetZoom);
});
