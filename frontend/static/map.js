/**
 * Файл    : frontend/static/map.js
 * Версия  : 4.6.1
 * Дата    : 2026-04-21
 * Автор   : Евгений / Claude
 *
 * ИЗМЕНЕНИЯ v4.6.1:
 *   - Мультиязычность RU / EN / DE: объект LANG, функция applyLang()
 *   - Кнопки RU/EN/DE в шапке панели, выбор сохраняется в localStorage (femap_lang)
 *   - Переводы: все подписи UI, названия городов (поле names{}), линейка, статус
 *   - Города: поле names:{ru,en,de}; пользовательские точки — поле name (строка)
 */

'use strict';

// Версия берётся из ver.js (window.FEMAP_VERSION). Фолбэк — для локального сервера.
const VERSION = window.FEMAP_VERSION || '4.6.1';

/* ═══════════════════════════════════════════════════════════════
   ЦВЕТА
═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   ПЕРЕВОДЫ
═══════════════════════════════════════════════════════════════ */
const LANG = {
  ru: {
    latLabel:       'Широта центра',
    lonLabel:       'Долгота центра',
    applyBtn:       '▶ Применить центр',
    gridChk:        'Сетка 30°',
    labelsChk:      'Подписи координат',
    citiesChk:      '🏙 Города и метки',
    rulerChk:       '📏 Линейка расстояний',
    pointsTitle:    'Управление точками',
    pointsName:     'Название города или объекта',
    pointsLat:      'Широта',
    pointsLon:      'Долгота',
    addBtn:         '+ Добавить на карту',
    activePoints:   'Список активных точек',
    presetN:        'Сев. полюс',
    presetS:        'Юж. полюс',
    presetEq:       'Экватор / 0,0',
    resetZoom:      '⊙ Сброс зума',
    rulerClickA:    '📏 Кликните точку A на карте',
    rulerClickB:    '📏 Теперь кликните точку B',
    rulerDone:      '📏 Замерено! Кликните снова для нового замера',
    sphereDist:     '🌍 Сфера',
    aeDist:         '📐 AE-карта',
    km:             'км',
    loading:        'Загрузка данных…',
    initStatus:     'Инициализация…',
    errorData:      'Ошибка данных: ',
    polygons:       'полигонов',
    bordersCount:   'границ',
    addPointError:  'Введите корректное название и координаты',
    deleteTitle:    'Удалить из списка',
  },
  en: {
    latLabel:       'Center Latitude',
    lonLabel:       'Center Longitude',
    applyBtn:       '▶ Apply Center',
    gridChk:        'Grid 30°',
    labelsChk:      'Coordinate Labels',
    citiesChk:      '🏙 Cities & Labels',
    rulerChk:       '📏 Distance Ruler',
    pointsTitle:    'Manage Points',
    pointsName:     'City or object name',
    pointsLat:      'Latitude',
    pointsLon:      'Longitude',
    addBtn:         '+ Add to Map',
    activePoints:   'Active Points',
    presetN:        'North Pole',
    presetS:        'South Pole',
    presetEq:       'Equator / 0,0',
    resetZoom:      '⊙ Reset Zoom',
    rulerClickA:    '📏 Click point A on the map',
    rulerClickB:    '📏 Now click point B',
    rulerDone:      '📏 Measured! Click again for new measurement',
    sphereDist:     '🌍 Sphere',
    aeDist:         '📐 AE Map',
    km:             'km',
    loading:        'Loading data…',
    initStatus:     'Initializing…',
    errorData:      'Data error: ',
    polygons:       'polygons',
    bordersCount:   'borders',
    addPointError:  'Enter a valid name and coordinates',
    deleteTitle:    'Remove from list',
  },
  de: {
    latLabel:       'Breite Mittelpunkt',
    lonLabel:       'Länge Mittelpunkt',
    applyBtn:       '▶ Mitte anwenden',
    gridChk:        'Gitter 30°',
    labelsChk:      'Koordinatenbeschriftung',
    citiesChk:      '🏙 Städte & Beschriftungen',
    rulerChk:       '📏 Entfernungslineal',
    pointsTitle:    'Punkte verwalten',
    pointsName:     'Stadt- oder Objektname',
    pointsLat:      'Breitengrad',
    pointsLon:      'Längengrad',
    addBtn:         '+ Zur Karte hinzufügen',
    activePoints:   'Aktive Punkte',
    presetN:        'Nordpol',
    presetS:        'Südpol',
    presetEq:       'Äquator / 0,0',
    resetZoom:      '⊙ Zoom zurücksetzen',
    rulerClickA:    '📏 Punkt A auf der Karte klicken',
    rulerClickB:    '📏 Jetzt Punkt B klicken',
    rulerDone:      '📏 Gemessen! Erneut klicken für neue Messung',
    sphereDist:     '🌍 Sphäre',
    aeDist:         '📐 AE-Karte',
    km:             'km',
    loading:        'Daten werden geladen…',
    initStatus:     'Initialisierung…',
    errorData:      'Datenfehler: ',
    polygons:       'Polygone',
    bordersCount:   'Grenzen',
    addPointError:  'Bitte gültigen Namen und Koordinaten eingeben',
    deleteTitle:    'Aus Liste entfernen',
  },
};

/* ═══════════════════════════════════════════════════════════════
   ГОРОДА — поле names:{ru,en,de}; пользовательские точки имеют только name (строка)
═══════════════════════════════════════════════════════════════ */
const CITIES = [
  { names: { ru: 'Киев',    en: 'Kyiv',      de: 'Kiew'      }, lon:  30.52, lat:  50.45 },
  { names: { ru: 'Москва',  en: 'Moscow',    de: 'Moskau'    }, lon:  37.62, lat:  55.76 },
  { names: { ru: 'Ташкент', en: 'Tashkent',  de: 'Taschkent' }, lon:  69.24, lat:  41.30 },
  { names: { ru: 'Лондон',  en: 'London',    de: 'London'    }, lon:  -0.13, lat:  51.51 },
  { names: { ru: 'Пекин',   en: 'Beijing',   de: 'Peking'    }, lon: 116.41, lat:  39.90 },
  { names: { ru: 'Нью-Йорк',en: 'New York',  de: 'New York'  }, lon: -74.01, lat:  40.71 },
  { names: { ru: 'Дубай',   en: 'Dubai',     de: 'Dubai'     }, lon:  55.27, lat:  25.20 },
  { names: { ru: 'Сингапур',en: 'Singapore', de: 'Singapur'  }, lon: 103.82, lat:   1.35 },
  { names: { ru: 'Сидней',  en: 'Sydney',    de: 'Sydney'    }, lon: 151.21, lat: -33.87 },

  // Крайние точки
  { names: { ru: 'Ушуайя',               en: 'Ushuaia',               de: 'Ushuaia'              }, lon:  -68.30, lat: -54.80 },
  { names: { ru: 'Мыс Агульяс',          en: 'Cape Agulhas',          de: 'Kap Agulhas'          }, lon:   20.00, lat: -34.83 },
  { names: { ru: 'Мыс Челюскин',         en: 'Cape Chelyuskin',       de: 'Kap Tscheljuskin'     }, lon:  104.30, lat:  77.72 },
  { names: { ru: 'Мыс Принца Уэльского', en: 'Cape Prince of Wales',  de: 'Kap Prince of Wales'  }, lon: -168.10, lat:  65.61 },
  { names: { ru: 'Мыс Байрон',           en: 'Cape Byron',            de: 'Kap Byron'            }, lon:  153.63, lat: -28.64 },
  { names: { ru: 'Нордкап',              en: 'North Cape',            de: 'Nordkap'              }, lon:   25.78, lat:  71.17 },

  // Полярные станции
  { names: { ru: 'Ст. Восток',           en: 'Vostok Station',        de: 'Station Wostok'       }, lon:  106.84, lat: -78.46 },
  { names: { ru: 'Ст. Мак-Мердо',        en: 'McMurdo Station',       de: 'Station McMurdo'      }, lon:  166.67, lat: -77.85 },
  { names: { ru: 'Ст. Амундсен-Скотт',   en: 'Amundsen–Scott Station',de: 'Station Amundsen-Scott'}, lon:    0.00, lat: -89.90 },
  { names: { ru: 'Ст. Беллинсгаузен',    en: 'Bellingshausen Station',de: 'Station Bellingshausen'}, lon:  -58.96, lat: -62.20 },
  { names: { ru: 'Ст. Мирный',           en: 'Mirny Station',         de: 'Station Mirny'        }, lon:   93.00, lat: -66.55 },
];

/* ═══════════════════════════════════════════════════════════════
   ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ — имя точки в текущем языке
   Города: d.names[lang] || d.names.ru
   Пользовательские точки: d.name (строка)
═══════════════════════════════════════════════════════════════ */
function pointLabel(d) {
  if (d.names) return d.names[state.lang] || d.names.ru;
  return d.name || '';
}

const GRID_STEP   = [30, 30];
const LAND_URL    = '/data/land.geojson';
const BORDERS_URL = '/data/borders.geojson';

const TAP_MAX_DIST = 8;
const TAP_MAX_MS   = 250;

/* ═══════════════════════════════════════════════════════════════
   СОСТОЯНИЕ
═══════════════════════════════════════════════════════════════ */
const state = {
  lat: 90, lon: 0,
  showGrid: true, showLabels: false,
  showCities: true, showUserPoints: true,
  land: null, borders: null,
  svg: null, projection: null, path: null,
  width: 0, height: 0,
  zoom: null,
  points: [],
  ruler: {
    active: false,
    points: [],
    distSphere: null,
    distAE: null,
  },
  _tapStart: null,
  lang: localStorage.getItem('femap_lang') || 'ru',
};

/* ═══════════════════════════════════════════════════════════════
   МУЛЬТИЯЗЫЧНОСТЬ
═══════════════════════════════════════════════════════════════ */
function applyLang() {
  const t = LANG[state.lang];

  // <html lang="...">
  document.documentElement.lang = state.lang;

  // Текстовые узлы через data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key] !== undefined) el.textContent = t[key];
  });

  // Placeholder-ы через data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (t[key] !== undefined) el.placeholder = t[key];
  });

  // Подсветить активную кнопку языка
  document.querySelectorAll('.btn-lang').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === state.lang);
  });

  // Перерисовать названия городов на карте если проекция уже готова
  if (state.projection) renderCities();
}

/* ═══════════════════════════════════════════════════════════════
   SVG / ZOOM
═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   ЗАГРУЗКА ДАННЫХ
═══════════════════════════════════════════════════════════════ */
async function loadData() {
  setStatus(LANG[state.lang].loading);

  try {
    const saved = localStorage.getItem('femap_points_v5');
    if (saved) {
      state.points = JSON.parse(saved);
    } else {
      const oldV4 = localStorage.getItem('femap_points_v4');
      const savedV4 = oldV4 ? JSON.parse(oldV4) : null;
      if (savedV4) {
        // При миграции из v4 сохраняем только пользовательские точки (без CITIES)
        // CITIES теперь имеют структуру names:{}, а не name:''
        const cityNamesRu = new Set(CITIES.map(c => c.names.ru));
        const userPoints = savedV4.filter(p => !cityNamesRu.has(p.name));
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
    state.land    = land;
    state.borders = borders;

    if (!state.land || !state.land.features) throw new Error('Invalid Land data');

    const nL = state.land.features.length;
    const nB = state.borders?.features?.length ?? 0;
    const t  = LANG[state.lang];
    const b = window.FEMAP_BUILD || {};
    const buildInfo = b.map ? ` · js:${b.map} css:${b.css} html:${b.html}` : '';
    setStatus(`v${VERSION}${buildInfo} · ${nL} ${t.polygons} · ${nB} ${t.bordersCount}`);
  } catch (err) {
    console.error('[map.js] Ошибка загрузки:', err);
    state.land = state.borders = { type: 'FeatureCollection', features: [] };
    setStatus(LANG[state.lang].errorData + err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════
   УПРАВЛЕНИЕ ТОЧКАМИ
═══════════════════════════════════════════════════════════════ */
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

      const k = 4;
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
    name.textContent = pointLabel(p);

    const coords = document.createElement('span');
    coords.className = 'point-coords';
    coords.textContent = `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`;

    info.appendChild(name);
    info.appendChild(coords);

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del-point';
    btnDel.innerHTML = '&times;';
    btnDel.title = LANG[state.lang].deleteTitle;
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
  const lat  = parseFloat(latInp.value.replace(',', '.'));
  const lon  = parseFloat(lonInp.value.replace(',', '.'));

  if (!name || isNaN(lat) || isNaN(lon)) {
    alert(LANG[state.lang].addPointError);
    return;
  }

  // Пользовательские точки хранятся как { name: string, lat, lon }
  state.points.push({ name, lat, lon });
  savePoints();
  refreshPointsList();
  renderCities();

  nameInp.value = '';
  latInp.value  = '';
  lonInp.value  = '';
}

/* ═══════════════════════════════════════════════════════════════
   РЕНДЕР
═══════════════════════════════════════════════════════════════ */
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
      .attr('fill', '#fff')
      .attr('font-size', (k > 2 ? 12 : 0) + 'px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(pointLabel(d));
  });
}

function renderCities() {
  renderMarkers('layer-cities', state.points, COLORS.cityMarker, state.showCities);
}

function renderUserPoints() {
  // Функция оставлена для совместимости слоёв
}

/* ═══════════════════════════════════════════════════════════════
   ЛИНЕЙКА
═══════════════════════════════════════════════════════════════ */
function handleMapClick(event) {
  if (!state.ruler.active) return;
  const [mx, my] = d3.pointer(event);

  const transform = d3.zoomTransform(state.svg.node());
  let coords = state.projection.invert(transform.invert([mx, my]));

  // Магнитное притяжение к городам/точкам
  let minD = 25;
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

    if (state.ruler.points.length === 1) setStatus(LANG[state.lang].rulerClickB);
    else                                 setStatus(LANG[state.lang].rulerDone);
  }
}

function calculateRulerDistances() {
  if (state.ruler.points.length < 2) return;
  const [p1, p2] = state.ruler.points;

  // ── 🌍 Расстояние по сфере (великий круг) ────────────────────────────────
  // d3.geoDistance возвращает центральный угол в радианах.
  // × 6371 км/рад = расстояние по поверхности шара.
  // Не зависит от проекции и центра карты — это физическая реальность.
  state.ruler.distSphere = d3.geoDistance(p1, p2) * 6371;

  // ── 📐 Расстояние по AE-карте (евклидово на плоскости) ───────────────────
  // Берём пиксельные координаты обеих точек через текущую проекцию.
  // projection.scale() — масштаб в пикселях/радиан (меняется с fitSize).
  // pixelDist / scale() = угловое расстояние в радианах на плоскости карты.
  // × 6371 = "расстояние", которое плоскоземельщик "измерил бы линейкой по карте".
  // ВАЖНО: при смене центра проекции пиксельные координаты пересчитываются,
  // поэтому distAE меняется — в отличие от distSphere.
  const proj1 = state.projection(p1);
  const proj2 = state.projection(p2);
  if (proj1 && proj2) {
    const pixelDist = Math.hypot(proj2[0] - proj1[0], proj2[1] - proj1[1]);
    state.ruler.distAE = pixelDist / state.projection.scale() * 6371;
  } else {
    state.ruler.distAE = null;
  }
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

  if (screenPts.length === 2 && screenPts[0] && screenPts[1]) {
    layer.append('line')
      .attr('x1', screenPts[0][0]).attr('y1', screenPts[0][1])
      .attr('x2', screenPts[1][0]).attr('y2', screenPts[1][1])
      .attr('stroke', COLORS.rulerLine)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '7,4')
      .attr('opacity', 0.9);
  }

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

  if (
    screenPts.length === 2 && screenPts[0] && screenPts[1] &&
    state.ruler.distSphere !== null
  ) {
    const mx0 = (screenPts[0][0] + screenPts[1][0]) / 2;
    const my0 = (screenPts[0][1] + screenPts[1][1]) / 2;

    const ldx = screenPts[1][0] - screenPts[0][0];
    const ldy = screenPts[1][1] - screenPts[0][1];
    const len = Math.sqrt(ldx*ldx + ldy*ldy);

    let nx = 0, ny = -1;
    if (len > 2) { nx = -ldy / len; ny = ldx / len; }
    if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }

    const bgW = 160, bgH = 34;
    const sphereKm = Math.round(state.ruler.distSphere);
    const aeKm     = Math.round(state.ruler.distAE);
    const t        = LANG[state.lang];

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
      .attr('font-family', 'sans-serif')
      .text(`${t.sphereDist}: ${sphereKm.toLocaleString()} ${t.km}`);

    tooltip.append('text')
      .attr('y', 8).attr('text-anchor', 'middle')
      .attr('fill', '#a0d8ef').attr('font-size', '10px')
      .attr('font-family', 'sans-serif')
      .text(`${t.aeDist}: ${aeKm.toLocaleString()} ${t.km}`);
  }
}

/* ═══════════════════════════════════════════════════════════════
   УТИЛИТЫ
═══════════════════════════════════════════════════════════════ */
function applyCenter(lat, lon) {
  if (typeof lat === 'string') lat = lat.replace(',', '.');
  if (typeof lon === 'string') lon = lon.replace(',', '.');

  state.lat = Math.max(-90,  Math.min(90,  parseFloat(lat) || 0));
  state.lon = Math.max(-180, Math.min(180, parseFloat(lon) || 0));

  if (state.zoom) state.svg.call(state.zoom.transform, d3.zoomIdentity);

  buildProjection();
  // Пересчитать линейку — distAE зависит от проекции, меняется при смене центра
  calculateRulerDistances();
  render();
}

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.innerText = msg;
}

function toggleRuler(active) {
  state.ruler.active = active;

  const chk    = document.getElementById('chk-ruler');
  const btnMap = document.getElementById('btn-ruler-map');
  if (chk)    chk.checked = active;
  if (btnMap) btnMap.classList.toggle('active', active);

  if (!active) {
    state.ruler.points     = [];
    state.ruler.distSphere = null;
    state.ruler.distAE     = null;
    renderRuler();
    const t = LANG[state.lang];
    setStatus(`v${VERSION} · ${state.land?.features?.length ?? 0} ${t.polygons}`);
  } else {
    setStatus(LANG[state.lang].rulerClickA);
  }

  document.getElementById('map').style.cursor = active ? 'crosshair' : '';
}

/* ═══════════════════════════════════════════════════════════════
   ИНИЦИАЛИЗАЦИЯ
═══════════════════════════════════════════════════════════════ */
// DOMContentLoaded может уже сработать к моменту загрузки map.js
// (если map.js грузится динамически через ver.js).
// Поэтому проверяем readyState — и вызываем init() сразу или ждём события.
async function init() {
  // Вписать версию в DOM (title и badge заполняются здесь, не в HTML)
  document.title = `FlatEarthMap v${VERSION}`;
  const badge = document.querySelector('.version-badge');
  if (badge) badge.textContent = `v${VERSION}`;

  createSVG();
  setupZoom();
  buildProjection();

  await loadData();
  render();

  state.svg.on('click', handleMapClick);

  // Применить центр
  document.getElementById('btn-apply').addEventListener('click', () => {
    applyCenter(
      document.getElementById('inp-lat').value,
      document.getElementById('inp-lon').value
    );
  });

  // Добавить точку
  document.getElementById('btn-add-point').addEventListener('click', addPoint);

  // Enter в полях координат
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

  // Чекбоксы
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

  // Кнопка линейки на карте
  document.getElementById('btn-ruler-map').addEventListener('click', () => {
    toggleRuler(!state.ruler.active);
  });

  // Пресеты координат
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

  // Сброс зума
  document.getElementById('btn-reset-zoom').addEventListener('click', resetZoom);

  // Переключение языка
  document.querySelectorAll('.btn-lang').forEach(btn => {
    btn.addEventListener('click', () => {
      state.lang = btn.dataset.lang;
      localStorage.setItem('femap_lang', state.lang);
      applyLang();
      refreshPointsList(); // Перерисовать список с новыми именами городов
      // Обновить статус-строку
      const t  = LANG[state.lang];
      const nL = state.land?.features?.length ?? 0;
      const nB = state.borders?.features?.length ?? 0;
      setStatus(`v${VERSION} · ${nL} ${t.polygons} · ${nB} ${t.bordersCount}`);
    });
  });

  // Применить язык при старте
  applyLang();
}

// Запуск
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
