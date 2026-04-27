/**
 * Файл    : frontend/static/map.js
 * Версия  : 5.2.0
 * Автор   : Евгений / Claude
 *
 * ИЗМЕНЕНИЯ v5.2.0:
 *   - Годовой ползунок (day-slider): шаг 1 сутки, охват 1 год (Jan 1 — Dec 31)
 *   - Плей теперь идёт с шагом +24ч (годовой таймлапс, 1 год за ~29 сек)
 *   - dayOfYear() — вспомогательная функция
 *   - setAstroDate() обновляет оба ползунка синхронно
 *
 * ИЗМЕНЕНИЯ v5.1.1:
 *   - БАГ-ФИКС: Луна и планеты — Astronomy.Equator не принимает null как observer.
 *     Исправлено: null → new Astronomy.Observer(0, 0, 0)
 *   - console.error в bodySubpoint (диагностика)
 *
 * ИЗМЕНЕНИЯ v5.1.0:
 *   - Солнце и день/ночь разделены на два чекбокса (chk-sun / chk-night)
 *   - renderNight() вызывается из renderAstro() → тень обновляется со временем
 *   - Магнит линейки: Солнце, Луна, планеты
 *   - window.onAstronomyReady: перерисовка когда astronomy-engine загрузился
 */

'use strict';

var VERSION = window.FEMAP_VERSION || '5.2.0';

/* ═══════════════════════════════════════════════════════════════
   ЦВЕТА
═══════════════════════════════════════════════════════════════ */
var COLORS = {
  water:      '#1a6ba0',
  land:       '#c8a96e',
  borders:    '#8a6d3a',
  grid:       '#5aaad0',
  diskBorder: '#3a8abf',
  background: '#060e16',
  rulerLine:  '#ff6b35',
  rulerA:     '#ff6b35',
  rulerB:     '#ff3b3b',
  cityMarker: '#ffffff',
  userPoint:  '#00ffcc',
};

/* ═══════════════════════════════════════════════════════════════
   ПЛАНЕТЫ — конфигурация для рендера
═══════════════════════════════════════════════════════════════ */
var PLANETS = [
  { key:'Mercury', sym:'☿', color:'#b0b0b0', r:4, label:{ru:'Меркурий',en:'Mercury',de:'Merkur'  } },
  { key:'Venus',   sym:'♀', color:'#ffe060', r:5, label:{ru:'Венера',  en:'Venus',  de:'Venus'   } },
  { key:'Mars',    sym:'♂', color:'#ff6644', r:5, label:{ru:'Марс',    en:'Mars',   de:'Mars'    } },
  { key:'Jupiter', sym:'♃', color:'#ffcc88', r:8, label:{ru:'Юпитер',  en:'Jupiter',de:'Jupiter' } },
  { key:'Saturn',  sym:'♄', color:'#ffe899', r:7, label:{ru:'Сатурн',  en:'Saturn', de:'Saturn'  } },
  { key:'Uranus',  sym:'♅', color:'#88ddff', r:5, label:{ru:'Уран',    en:'Uranus', de:'Uranus'  } },
  { key:'Neptune', sym:'♆', color:'#7788ff', r:5, label:{ru:'Нептун',  en:'Neptune',de:'Neptun'  } },
];

/* ═══════════════════════════════════════════════════════════════
   ПЕРЕВОДЫ
═══════════════════════════════════════════════════════════════ */
var LANG = {
  ru: {
    latLabel:'Широта центра', lonLabel:'Долгота центра',
    applyBtn:'▶ Применить центр',
    gridChk:'Сетка 30°', labelsChk:'Подписи координат',
    citiesChk:'🏙 Города и метки', rulerChk:'📏 Линейка расстояний',
    pointsTitle:'Управление точками',
    pointsName:'Название города или объекта',
    pointsLat:'Широта', pointsLon:'Долгота',
    addBtn:'+ Добавить на карту', activePoints:'Список активных точек',
    presetN:'Сев. полюс', presetS:'Юж. полюс',
    presetEq:'Экватор / 0,0', resetZoom:'⊙ Сброс зума',
    rulerClickA:'📏 Тапните точку A', rulerClickB:'📏 Тапните точку B',
    rulerDone:'📏 Замерено! Тапните для нового замера',
    sphereDist:'🌍 Сфера', aeDist:'📐 AE-карта', km:'км',
    loading:'Загрузка данных…', polygons:'полигонов', bordersCount:'границ',
    addPointError:'Введите название и координаты', deleteTitle:'Удалить',
  },
  en: {
    latLabel:'Center Latitude', lonLabel:'Center Longitude',
    applyBtn:'▶ Apply Center',
    gridChk:'Grid 30°', labelsChk:'Coordinate Labels',
    citiesChk:'🏙 Cities & Labels', rulerChk:'📏 Distance Ruler',
    pointsTitle:'Manage Points', pointsName:'City or object name',
    pointsLat:'Latitude', pointsLon:'Longitude',
    addBtn:'+ Add to Map', activePoints:'Active Points',
    presetN:'North Pole', presetS:'South Pole',
    presetEq:'Equator / 0,0', resetZoom:'⊙ Reset Zoom',
    rulerClickA:'📏 Tap point A', rulerClickB:'📏 Tap point B',
    rulerDone:'📏 Measured! Tap again',
    sphereDist:'🌍 Sphere', aeDist:'📐 AE Map', km:'km',
    loading:'Loading data…', polygons:'polygons', bordersCount:'borders',
    addPointError:'Enter valid name and coordinates', deleteTitle:'Delete',
  },
  de: {
    latLabel:'Breite Mittelpunkt', lonLabel:'Länge Mittelpunkt',
    applyBtn:'▶ Mitte anwenden',
    gridChk:'Gitter 30°', labelsChk:'Koordinatenbeschriftung',
    citiesChk:'🏙 Städte & Labels', rulerChk:'📏 Entfernungslineal',
    pointsTitle:'Punkte verwalten', pointsName:'Stadt- oder Objektname',
    pointsLat:'Breitengrad', pointsLon:'Längengrad',
    addBtn:'+ Zur Karte hinzufügen', activePoints:'Aktive Punkte',
    presetN:'Nordpol', presetS:'Südpol',
    presetEq:'Äquator / 0,0', resetZoom:'⊙ Zoom zurücksetzen',
    rulerClickA:'📏 Punkt A antippen', rulerClickB:'📏 Punkt B antippen',
    rulerDone:'📏 Gemessen!',
    sphereDist:'🌍 Sphäre', aeDist:'📐 AE-Karte', km:'km',
    loading:'Wird geladen…', polygons:'Polygone', bordersCount:'Grenzen',
    addPointError:'Bitte gültigen Namen und Koordinaten eingeben', deleteTitle:'Löschen',
  },
};

/* ═══════════════════════════════════════════════════════════════
   ГОРОДА
═══════════════════════════════════════════════════════════════ */
var CITIES = [
  { names:{ru:'Киев',    en:'Kyiv',     de:'Kiew'    }, lon: 30.52, lat: 50.45 },
  { names:{ru:'Москва',  en:'Moscow',   de:'Moskau'  }, lon: 37.62, lat: 55.76 },
  { names:{ru:'Ташкент', en:'Tashkent', de:'Taschkent'}, lon: 69.24, lat: 41.30 },
  { names:{ru:'Лондон',  en:'London',   de:'London'  }, lon: -0.13, lat: 51.51 },
  { names:{ru:'Токио',   en:'Tokyo',    de:'Tokio'   }, lon:139.69, lat: 35.68 },
  { names:{ru:'Пекин',   en:'Beijing',  de:'Peking'  }, lon:116.41, lat: 39.90 },
  { names:{ru:'Нью-Йорк',en:'New York', de:'New York'}, lon:-74.01, lat: 40.71 },
  { names:{ru:'Дубай',   en:'Dubai',    de:'Dubai'   }, lon: 55.27, lat: 25.20 },
  { names:{ru:'Сингапур',en:'Singapore',de:'Singapur'}, lon:103.82, lat:  1.35 },
  { names:{ru:'Сидней',  en:'Sydney',   de:'Sydney'  }, lon:151.21, lat:-33.87 },
  { names:{ru:'Ушуайя',              en:'Ushuaia',              de:'Ushuaia'             }, lon: -68.30, lat:-54.80 },
  { names:{ru:'Мыс Агульяс',         en:'Cape Agulhas',         de:'Kap Agulhas'         }, lon:  20.00, lat:-34.83 },
  { names:{ru:'Мыс Челюскин',        en:'Cape Chelyuskin',      de:'Kap Tscheljuskin'    }, lon: 104.30, lat: 77.72 },
  { names:{ru:'Мыс Принца Уэльского',en:'Cape Prince of Wales', de:'Kap Prince of Wales' }, lon:-168.10, lat: 65.61 },
  { names:{ru:'Мыс Байрон',          en:'Cape Byron',           de:'Kap Byron'           }, lon: 153.63, lat:-28.64 },
  { names:{ru:'Нордкап',             en:'North Cape',           de:'Nordkap'             }, lon:  25.78, lat: 71.17 },
  { names:{ru:'Ст. Восток',          en:'Vostok Station',       de:'Station Wostok'      }, lon: 106.84, lat:-78.46 },
  { names:{ru:'Ст. Мак-Мердо',       en:'McMurdo Station',      de:'Station McMurdo'     }, lon: 166.67, lat:-77.85 },
  { names:{ru:'Ст. Амундсен-Скотт',  en:'Amundsen–Scott',       de:'Amundsen-Scott'      }, lon:   0.00, lat:-89.90 },
  { names:{ru:'Ст. Беллинсгаузен',   en:'Bellingshausen',       de:'Bellingshausen'      }, lon: -58.96, lat:-62.20 },
  { names:{ru:'Ст. Мирный',          en:'Mirny Station',        de:'Station Mirny'       }, lon:  93.00, lat:-66.55 },
];

function pointLabel(d) {
  if (d.names) return d.names[state.lang] || d.names.ru;
  return d.name || '';
}

var GRID_STEP   = [30, 30];
var LAND_URL    = '/data/land.geojson';
var BORDERS_URL = '/data/borders.geojson';

/* ═══════════════════════════════════════════════════════════════
   СОСТОЯНИЕ
═══════════════════════════════════════════════════════════════ */
var state = {
  lat: 90, lon: 0,
  showGrid: true, showLabels: false, showCities: true,
  land: null, borders: null,
  svg: null, projection: null, path: null,
  width: 0, height: 0, zoom: null,
  points: [],
  ruler: {
    active: false,
    points: [],
    distSphere: null,
    distAE: null,
  },
  astro: {
    showSun:     false,  // маркер Солнца ☀
    showNight:   false,  // тень день/ночь (терминатор) — ОТДЕЛЬНО от Солнца
    showMoon:    false,  // маркер Луны 🌙
    showPlanets: false,  // маркеры планет 🪐
    date:        new Date(),
    playing:     false,
    timer:       null,
  },
  lang: localStorage.getItem('femap_lang') || 'ru',
};

/* ═══════════════════════════════════════════════════════════════
   АСТРОНОМИЧЕСКИЕ ВЫЧИСЛЕНИЯ
═══════════════════════════════════════════════════════════════ */

/**
 * Проверяет загружен ли astronomy-engine.
 * Библиотека грузится параллельно с map.js, поэтому при первых вызовах
 * может быть ещё недоступна.
 */
function astroOk() {
  return typeof Astronomy !== 'undefined';
}

/**
 * Callback — вызывается из ver.js когда astronomy-engine загружен.
 * Перерисовывает астро-слои если пользователь уже включил чекбоксы.
 */
window.onAstronomyReady = function() {
  console.log('[map.js] astronomy-engine готов');
  if (state.astro.showMoon || state.astro.showPlanets) {
    renderAstro();
  }
};

/**
 * Субсолярная точка Солнца — встроенная формула, не требует библиотеки.
 * Точность ~1°. Используется как fallback если astronomy-engine не загружен.
 * @param {Date} date
 * @returns {{ lat: number, lon: number }}
 */
function sunSubpoint(date) {
  var JD   = date.getTime() / 86400000 + 2440587.5;
  var n    = JD - 2451545.0;
  var L    = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
  var g    = ((357.528 + 0.9856003 * n) % 360 + 360) % 360;
  var gR   = g * Math.PI / 180;
  var lam  = L + 1.915 * Math.sin(gR) + 0.020 * Math.sin(2 * gR);
  var lamR = lam * Math.PI / 180;
  var eps  = (23.439 - 0.0000004 * n) * Math.PI / 180;
  var subLat = Math.asin(Math.sin(eps) * Math.sin(lamR)) * 180 / Math.PI;
  var RA   = Math.atan2(Math.cos(eps) * Math.sin(lamR), Math.cos(lamR));
  var UT   = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  var GMST = ((6.697375 + 0.0657098242 * n + UT * 1.00273791) % 24 + 24) % 24;
  var subLon = (RA - GMST * 15 * Math.PI / 180) * 180 / Math.PI;
  subLon = ((subLon + 180) % 360 + 360) % 360 - 180;
  return { lat: subLat, lon: subLon };
}

/**
 * Субточка любого тела через astronomy-engine.
 * @param {string} bodyKey — ключ из Astronomy.Body ('Sun','Moon','Mars',...)
 * @param {Date} date
 * @returns {{ lat: number, lon: number } | null}
 */
function bodySubpoint(bodyKey, date) {
  if (!astroOk()) return null;
  try {
    var body  = Astronomy.Body[bodyKey];
    if (body === undefined) return null;
    var aberr = (bodyKey === 'Sun');
    // ИСПРАВЛЕНИЕ v5.1.1: Astronomy.Equator не принимает null как observer —
    // бросает "Not an instance of the Observer class: null".
    // Observer(0, 0, 0) = геоцентрический наблюдатель (центр Земли, без топоцентрического смещения).
    var observer = new Astronomy.Observer(0, 0, 0);
    var eq    = Astronomy.Equator(body, date, observer, true, aberr);
    // GMST (звёздное время Гринвича) → часовой угол → долгота субточки
    var gstDeg = Astronomy.SiderealTime(date) * 15;
    var ghaDeg = ((gstDeg - eq.ra * 15) % 360 + 360) % 360;
    var lon = -ghaDeg;
    if (lon < -180) lon += 360;
    if (lon >  180) lon -= 360;
    return { lat: eq.dec, lon: lon };
  } catch(e) {
    console.error('[astro] bodySubpoint "' + bodyKey + '" ошибка:', e.message || e);
    return null;
  }
}

/**
 * Субточка Солнца: astronomy-engine если доступен, иначе встроенная формула.
 */
function getSunSubpoint(date) {
  return bodySubpoint('Sun', date) || sunSubpoint(date);
}

/**
 * Иконка фазы Луны по текущей дате.
 * Требует astronomy-engine. Без него возвращает 🌙.
 */
function moonIcon(date) {
  if (!astroOk()) return '🌙';
  try {
    var phase = Astronomy.MoonPhase(date); // 0..360°
    var icons = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
    return icons[Math.round(phase / 45) % 8];
  } catch(e) { return '🌙'; }
}

/**
 * GeoJSON ночного полушария.
 * Ночь = сферический круг радиуса 90° вокруг антипода субсолярной точки.
 * d3.geoCircle гарантирует правильный порядок обхода для D3 clipAngle.
 */
function nightGeoJSON(sp) {
  var aLat = -sp.lat;
  var aLon = sp.lon >= 0 ? sp.lon - 180 : sp.lon + 180;
  return d3.geoCircle().center([aLon, aLat]).radius(90).precision(1.5)();
}

/* ─── Управление временем ─────────────────────────────────── */

function pad2(n) { return String(n).padStart(2, '0'); }

/** Обновляет дисплей UTC-времени в панели */
function updateAstroDisplay() {
  var el = document.getElementById('astro-display');
  if (!el) return;
  var d = state.astro.date;
  el.textContent =
    d.getUTCFullYear() + '-' + pad2(d.getUTCMonth()+1) + '-' + pad2(d.getUTCDate()) +
    '  ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ' UTC';
}

/**
 * Номер дня в году (0 = 1 января, 364 = 31 декабря).
 * Используется для синхронизации day-slider с state.astro.date.
 * @param {Date} date
 * @returns {number} 0..364
 */
function dayOfYear(date) {
  var start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.min(364, Math.floor((date.getTime() - start) / 86400000));
}

/**
 * Устанавливает новую дату астрономии.
 * Обновляет ползунок, дисплей и перерисовывает ВСЕ астро-слои включая терминатор.
 */
function setAstroDate(date) {
  state.astro.date = date;
  // Суточный ползунок (минуты с полуночи UTC)
  var slider = document.getElementById('sun-slider');
  if (slider) slider.value = date.getUTCHours() * 60 + date.getUTCMinutes();
  // Годовой ползунок (день в году)
  var daySlider = document.getElementById('day-slider');
  if (daySlider) daySlider.value = dayOfYear(date);
  updateAstroDisplay();
  // ВАЖНО: renderAstro вызывает renderNight внутри → терминатор тоже обновляется
  renderAstro();
}

/** Запускает анимацию: +24ч каждые 80 мс = 1 год за ~29 сек */
function astroPlay() {
  if (state.astro.timer) return;
  state.astro.playing = true;
  var btn = document.getElementById('btn-astro-play');
  if (btn) btn.textContent = '⏸';
  state.astro.timer = setInterval(function() {
    setAstroDate(new Date(state.astro.date.getTime() + 24 * 60 * 60 * 1000));
  }, 80);
}

function astroPause() {
  if (state.astro.timer) { clearInterval(state.astro.timer); state.astro.timer = null; }
  state.astro.playing = false;
  var btn = document.getElementById('btn-astro-play');
  if (btn) btn.textContent = '▶';
}

/** Возвращает true если хотя бы один астро-слой включён */
function astroAnyOn() {
  return state.astro.showSun || state.astro.showNight ||
         state.astro.showMoon || state.astro.showPlanets;
}

/** Показывает/скрывает панель управления временем */
function updateAstroTimePanel() {
  var el = document.getElementById('astro-time');
  if (el) el.style.display = astroAnyOn() ? 'block' : 'none';
  if (!astroAnyOn()) astroPause();
}

/**
 * Возвращает массив текущих астро-объектов с координатами.
 * Используется в магните линейки.
 * @returns {Array<{lon, lat, name}>}
 */
function getAstroPoints() {
  var result = [];
  var date = state.astro.date;

  if (state.astro.showSun) {
    var sp = getSunSubpoint(date);
    result.push({ lon: sp.lon, lat: sp.lat, name: '☀' });
  }
  if (state.astro.showMoon) {
    var mp = bodySubpoint('Moon', date);
    if (mp) result.push({ lon: mp.lon, lat: mp.lat, name: '🌙' });
  }
  if (state.astro.showPlanets && astroOk()) {
    PLANETS.forEach(function(pl) {
      var pp = bodySubpoint(pl.key, date);
      if (pp) result.push({ lon: pp.lon, lat: pp.lat, name: pl.sym });
    });
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════
   МУЛЬТИЯЗЫЧНОСТЬ
═══════════════════════════════════════════════════════════════ */
function applyLang() {
  var t = LANG[state.lang];
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.dataset.i18n;
    if (t[key] !== undefined) el.textContent = t[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.dataset.i18nPlaceholder;
    if (t[key] !== undefined) el.placeholder = t[key];
  });
  document.querySelectorAll('.btn-lang').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.lang === state.lang);
  });
  if (state.projection) renderCities();
}

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

  // Слои внутри map-content — масштабируются d3.zoom трансформом
  var mc = state.svg.append('g').attr('id', 'map-content');
  ['water','land','borders','grid','night','border'].forEach(function(id) {
    mc.append('g').attr('id', 'layer-' + id);
  });

  // Оверлеи вне map-content — НЕ масштабируются, пересчитываются через zoom-transform
  ['labels','cities','ruler','sun','moon','planets'].forEach(function(id) {
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
      // map-content масштабируется CSS transform
      state.svg.select('#map-content').attr('transform', event.transform);
      // Оверлеи пересчитываются вручную — используют zoom-transform для координат
      renderLabels();
      renderCities();
      renderRuler();
      renderAstro(); // включает renderNight()
    });
  state.svg.call(state.zoom)
    .on('dblclick.zoom', function() { resetZoom(); });
}

function clearZoomTransform() {
  if (state.zoom) state.svg.call(state.zoom.transform, d3.zoomIdentity);
}

function resetZoom() {
  if (!state.zoom) return;
  document.getElementById('inp-lat').value = 90;
  document.getElementById('inp-lon').value = 0;
  applyCenter(90, 0);
  state.svg.transition().duration(300).call(state.zoom.transform, d3.zoomIdentity);
}

/* ═══════════════════════════════════════════════════════════════
   ПРОЕКЦИЯ — AE (азимутальная равноудалённая)
═══════════════════════════════════════════════════════════════ */
function buildProjection() {
  var w = state.width  || window.innerWidth  || 300;
  var h = state.height || window.innerHeight || 300;
  state.projection = d3.geoAzimuthalEquidistant()
    .rotate([-state.lon, -state.lat])   // центрируем на выбранных координатах
    .fitSize([w, h], { type: 'Sphere' })
    .clipAngle(179.9); // 179.9 а не 180 — избегаем числового мусора на антиподах
  state.path = d3.geoPath(state.projection);
}

/* ═══════════════════════════════════════════════════════════════
   ЗАГРУЗКА ДАННЫХ
═══════════════════════════════════════════════════════════════ */
async function loadData() {
  setStatus(LANG[state.lang].loading);

  // Загружаем точки из localStorage (или дефолтные города)
  try {
    var saved = localStorage.getItem('femap_points_v5');
    if (saved) {
      state.points = JSON.parse(saved);
    } else {
      // Миграция с предыдущей версии (v4)
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

  // Загружаем GeoJSON карты
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
    console.error('[map.js]', err);
    state.land    = { type:'FeatureCollection', features:[] };
    state.borders = { type:'FeatureCollection', features:[] };
    setStatus('Ошибка загрузки: ' + err.message);
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
  savePoints(); refreshPointsList(); renderCities();
}

function refreshPointsList() {
  var list = document.getElementById('points-list');
  list.innerHTML = '';
  state.points.forEach(function(p, idx) {
    var li   = document.createElement('li');
    var info = document.createElement('div');
    info.className = 'point-item';
    info.onclick = function() {
      // Клик по точке в списке — центрируем карту и зумируем
      document.getElementById('inp-lat').value = p.lat;
      document.getElementById('inp-lon').value = p.lon;
      applyCenter(p.lat, p.lon);
      var k = 4, w = state.width||window.innerWidth, h = state.height||window.innerHeight;
      state.svg.transition().duration(500).call(
        state.zoom.transform,
        d3.zoomIdentity.translate(w/2, h/2).scale(k).translate(-w/2, -h/2)
      );
    };
    info.textContent = pointLabel(p) + ' (' + p.lat.toFixed(1) + ', ' + p.lon.toFixed(1) + ')';

    var btnDel = document.createElement('button');
    btnDel.innerHTML = '&times;';
    btnDel.title = LANG[state.lang].deleteTitle;
    btnDel.style.cssText = 'margin-left:6px;cursor:pointer;background:none;' +
      'border:1px solid #3a5a7a;color:#8ab;border-radius:3px;padding:1px 5px;';
    btnDel.onclick = function(e) { e.stopPropagation(); deletePoint(idx); };

    li.appendChild(info);
    li.appendChild(btnDel);
    list.appendChild(li);
  });
}

function addPoint() {
  var name = document.getElementById('add-name').value.trim();
  var lat  = parseFloat(document.getElementById('add-lat').value.replace(',','.'));
  var lon  = parseFloat(document.getElementById('add-lon').value.replace(',','.'));
  if (!name || isNaN(lat) || isNaN(lon)) {
    alert(LANG[state.lang].addPointError); return;
  }
  state.points.push({ name:name, lat:lat, lon:lon });
  savePoints(); refreshPointsList(); renderCities();
  document.getElementById('add-name').value = '';
  document.getElementById('add-lat').value  = '';
  document.getElementById('add-lon').value  = '';
}

/* ═══════════════════════════════════════════════════════════════
   РЕНДЕР КАРТЫ
═══════════════════════════════════════════════════════════════ */
function renderLabels() {
  var layer = state.svg.select('#layer-labels');
  layer.selectAll('*').remove();
  if (!state.showLabels) return;
  var tr = d3.zoomTransform(state.svg.node());
  [0,30,60,-30,-60].forEach(function(lat) {
    var proj = state.projection([state.lon, lat]);
    if (!proj) return;
    var pt = tr.apply(proj);
    layer.append('text')
      .attr('x', pt[0]+4).attr('y', pt[1]).attr('dy','0.35em')
      .attr('fill','#a0d8ef').attr('font-size','10px')
      .attr('font-family','monospace').text(lat + '°');
  });
}

/** Полный рендер всех слоёв карты + оверлеи */
function render() {
  if (!state.svg || !state.projection) return;

  // Вода (фон диска)
  var lw = state.svg.select('#layer-water');
  lw.selectAll('*').remove();
  lw.append('path').datum({type:'Sphere'})
    .attr('d', state.path).attr('fill', COLORS.water);

  // Суша
  var ll = state.svg.select('#layer-land');
  ll.selectAll('*').remove();
  if (state.land) {
    ll.selectAll('path').data(state.land.features).join('path')
      .attr('d', state.path).attr('fill', COLORS.land);
  }

  // Границы стран
  var lb = state.svg.select('#layer-borders');
  lb.selectAll('*').remove();
  if (state.borders) {
    lb.selectAll('path').data(state.borders.features).join('path')
      .attr('d', state.path).attr('fill','none')
      .attr('stroke', COLORS.borders).attr('stroke-width', 0.6);
  }

  // Сетка параллелей и меридианов 30°
  var lg = state.svg.select('#layer-grid');
  lg.selectAll('*').remove();
  if (state.showGrid) {
    lg.append('path').datum(d3.geoGraticule().step(GRID_STEP)())
      .attr('d', state.path).attr('fill','none')
      .attr('stroke', COLORS.grid).attr('stroke-width',0.5).attr('opacity',0.7);
  }

  // Рамка диска (обводка Sphere)
  var lbr = state.svg.select('#layer-border');
  lbr.selectAll('*').remove();
  lbr.append('path').datum({type:'Sphere'})
    .attr('d', state.path).attr('fill','none')
    .attr('stroke', COLORS.diskBorder).attr('stroke-width',1.5);

  // Все оверлеи
  renderLabels();
  renderCities();
  renderRuler();
  renderAstro(); // включает renderNight() внутри
}

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
      .attr('stroke','#000').attr('stroke-width',0.5);
    layer.append('text')
      .attr('x', pt[0]+5).attr('y', pt[1]+3)
      .attr('fill','#fff')
      .attr('font-size', k >= 1 ? Math.min(12, 10*k)+'px' : '0px')
      .attr('font-weight','bold')
      .style('pointer-events','none')
      .text(pointLabel(d));
  });
}

/* ═══════════════════════════════════════════════════════════════
   АСТРО-РЕНДЕР
═══════════════════════════════════════════════════════════════ */

/**
 * Ночная тень — geo-слой ВНУТРИ map-content.
 * Масштабируется вместе с картой через d3.zoom transform.
 * ВАЖНО: вызывается из renderAstro() чтобы обновляться при смене времени.
 */
function renderNight() {
  var layer = state.svg.select('#layer-night');
  layer.selectAll('*').remove();
  // Терминатор управляется СВОИМ чекбоксом chk-night, независимо от Солнца
  if (!state.astro.showNight) return;
  var sp = getSunSubpoint(state.astro.date);
  layer.append('path').datum(nightGeoJSON(sp))
    .attr('d', state.path)
    .attr('fill', 'rgba(0,8,28,0.50)')
    .attr('stroke', 'rgba(100,180,255,0.45)')
    .attr('stroke-width', 1.0);
}

/**
 * Рисует маркер небесного тела на оверлей-слое.
 * Оверлей находится ВНЕ map-content, поэтому координаты пересчитываем
 * через текущий zoom-transform: projection([lon,lat]) → tr.apply(proj).
 *
 * @param {string} layerId — id слоя без '#'
 * @param {number} lon, lat — географические координаты субточки
 * @param {object} opts — { sym, r, fill, stroke, glow, labelColor }
 */
function drawMarker(layerId, lon, lat, opts) {
  var layer = state.svg.select('#' + layerId);
  var proj  = state.projection([lon, lat]);
  if (!proj) return; // точка за горизонтом проекции
  var tr = d3.zoomTransform(state.svg.node());
  var pt = tr.apply(proj);
  var px = pt[0], py = pt[1];

  // Ореол (мягкое свечение вокруг диска)
  if (opts.glow) {
    layer.append('circle').attr('cx',px).attr('cy',py)
      .attr('r', opts.r + 10).attr('fill', opts.glow);
  }
  // Диск объекта
  layer.append('circle').attr('cx',px).attr('cy',py)
    .attr('r', opts.r).attr('fill', opts.fill)
    .attr('stroke', opts.stroke || 'none')
    .attr('stroke-width', opts.stroke ? 1.5 : 0);
  // Символ/иконка внутри диска
  layer.append('text').attr('x',px).attr('y',py).attr('dy','0.38em')
    .attr('text-anchor','middle').attr('font-size', (opts.r + 2) + 'px')
    .attr('pointer-events','none').text(opts.sym);
  // Подпись координат субточки
  layer.append('text').attr('x',px).attr('y', py - opts.r - 5)
    .attr('text-anchor','middle').attr('fill', opts.labelColor || '#ccc')
    .attr('font-size','9px').attr('font-family','monospace')
    .attr('pointer-events','none')
    .text(lat.toFixed(1) + '° ' + lon.toFixed(1) + '°');
}

/**
 * Главный рендер всех астро-слоёв.
 * Вызывается из render(), из обработчика zoom и из setAstroDate().
 * Это гарантирует что терминатор и маркеры обновляются при любом изменении.
 */
function renderAstro() {
  // Сначала терминатор (geo-слой внутри map-content)
  renderNight();

  // Очищаем оверлей-слои
  ['sun','moon','planets'].forEach(function(id) {
    state.svg.select('#layer-' + id).selectAll('*').remove();
  });

  var date = state.astro.date;

  // ☀ Солнце
  if (state.astro.showSun) {
    var sp = getSunSubpoint(date);
    drawMarker('layer-sun', sp.lon, sp.lat, {
      sym: '☀', r: 9,
      fill: '#fbbf24', stroke: '#f97316',
      glow: 'rgba(251,191,36,0.15)',
      labelColor: '#fde68a',
    });
  }

  // 🌙 Луна (требует astronomy-engine)
  if (state.astro.showMoon) {
    var mp = bodySubpoint('Moon', date);
    if (mp) {
      drawMarker('layer-moon', mp.lon, mp.lat, {
        sym: moonIcon(date), r: 9,
        fill: 'rgba(180,210,255,0.25)', stroke: '#8ab4e0',
        glow: 'rgba(180,210,255,0.10)',
        labelColor: '#c8deff',
      });
    }
    // Если mp===null — astronomy-engine ещё не загружен.
    // window.onAstronomyReady перерисует когда загрузится.
  }

  // 🪐 Планеты (требуют astronomy-engine)
  if (state.astro.showPlanets && astroOk()) {
    var layer = state.svg.select('#layer-planets');
    PLANETS.forEach(function(pl) {
      var pp = bodySubpoint(pl.key, date);
      if (!pp) return;
      var proj = state.projection([pp.lon, pp.lat]);
      if (!proj) return;
      var tr = d3.zoomTransform(state.svg.node());
      var pt = tr.apply(proj);
      var px = pt[0], py = pt[1];

      layer.append('circle').attr('cx',px).attr('cy',py).attr('r', pl.r)
        .attr('fill', pl.color).attr('stroke','#000').attr('stroke-width',0.8)
        .attr('opacity',0.92);
      layer.append('text').attr('x',px).attr('y',py).attr('dy','0.38em')
        .attr('text-anchor','middle').attr('font-size', pl.r + 'px')
        .attr('pointer-events','none').text(pl.sym);
      layer.append('text').attr('x', px + pl.r + 3).attr('y', py + 3)
        .attr('fill', pl.color).attr('font-size','8px')
        .attr('font-family','monospace').attr('pointer-events','none')
        .text(pl.label[state.lang] || pl.label.ru);
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   ЛИНЕЙКА
═══════════════════════════════════════════════════════════════ */

/**
 * Обработчик клика на карту.
 * Определяет географические координаты клика.
 * Магнит: притягивается к ближайшему городу ИЛИ астро-объекту в радиусе 25px.
 */
function handleMapClick(event) {
  if (!state.ruler.active) return;

  // Координаты клика относительно SVG
  var pt = d3.pointer(event, state.svg.node());
  var mx = pt[0], my = pt[1];
  var tr     = d3.zoomTransform(state.svg.node());
  var mapPt  = tr.invert([mx, my]);
  var coords = state.projection.invert(mapPt);
  if (!coords || isNaN(coords[0]) || isNaN(coords[1])) return;

  // Магнит к городам/точкам пользователя
  var minD = 25;
  state.points.forEach(function(p) {
    var proj = state.projection([p.lon, p.lat]);
    if (!proj) return;
    var sp = tr.apply(proj);
    var d  = Math.hypot(sp[0]-mx, sp[1]-my);
    if (d < minD) { minD = d; coords = [p.lon, p.lat]; }
  });

  // Магнит к астро-объектам (Солнце, Луна, планеты)
  getAstroPoints().forEach(function(p) {
    var proj = state.projection([p.lon, p.lat]);
    if (!proj) return;
    var sp = tr.apply(proj);
    var d  = Math.hypot(sp[0]-mx, sp[1]-my);
    if (d < minD) { minD = d; coords = [p.lon, p.lat]; }
  });

  if (state.ruler.points.length >= 2) state.ruler.points = [];
  state.ruler.points.push(coords);
  calculateRulerDistances();
  renderRuler();
  var t = LANG[state.lang];
  setStatus(state.ruler.points.length === 1 ? t.rulerClickB : t.rulerDone);
}

function calculateRulerDistances() {
  if (state.ruler.points.length < 2) return;
  var p1 = state.ruler.points[0], p2 = state.ruler.points[1];
  // Расстояние по сфере (большой круг) — не зависит от проекции
  state.ruler.distSphere = d3.geoDistance(p1, p2) * 6371;
  // Расстояние по AE-карте (евклидово на плоскости) — меняется при смене центра!
  var proj1 = state.projection(p1), proj2 = state.projection(p2);
  if (proj1 && proj2) {
    state.ruler.distAE = Math.hypot(proj2[0]-proj1[0], proj2[1]-proj1[1]) /
      state.projection.scale() * 6371;
  } else { state.ruler.distAE = null; }
}

function renderRuler() {
  var layer = state.svg.select('#layer-ruler');
  layer.selectAll('*').remove();
  if (!state.ruler.points.length) return;
  var tr   = d3.zoomTransform(state.svg.node());
  var sPts = state.ruler.points.map(function(p) {
    var proj = state.projection(p);
    return proj ? tr.apply(proj) : null;
  });

  // Пунктирная линия между точками
  if (sPts.length === 2 && sPts[0] && sPts[1]) {
    layer.append('line')
      .attr('x1',sPts[0][0]).attr('y1',sPts[0][1])
      .attr('x2',sPts[1][0]).attr('y2',sPts[1][1])
      .attr('stroke',COLORS.rulerLine).attr('stroke-width',2)
      .attr('stroke-dasharray','7,4').attr('opacity',0.9);
  }

  // Маркеры A и B
  sPts.forEach(function(pt, i) {
    if (!pt) return;
    var color = i === 0 ? COLORS.rulerA : COLORS.rulerB;
    layer.append('circle').attr('cx',pt[0]).attr('cy',pt[1]).attr('r',7)
      .attr('fill',color).attr('stroke','#fff').attr('stroke-width',1.5);
    layer.append('text').attr('x',pt[0]).attr('y',pt[1]).attr('dy','0.38em')
      .attr('text-anchor','middle').attr('fill','#fff')
      .attr('font-size','9px').attr('font-weight','bold')
      .attr('pointer-events','none').text(i===0 ? 'A' : 'B');
  });

  // Всплывающая подпись с расстояниями
  if (sPts.length===2 && sPts[0] && sPts[1] && state.ruler.distSphere !== null) {
    var mx0=(sPts[0][0]+sPts[1][0])/2, my0=(sPts[0][1]+sPts[1][1])/2;
    var dx=sPts[1][0]-sPts[0][0], dy=sPts[1][1]-sPts[0][1];
    var len=Math.sqrt(dx*dx+dy*dy);
    var nx=0, ny=-1;
    if (len>2) { nx=-dy/len; ny=dx/len; }
    if (ny>0||(ny===0&&nx<0)) { nx=-nx; ny=-ny; }
    var t  = LANG[state.lang];
    var sp = Math.round(state.ruler.distSphere).toLocaleString();
    var ae = Math.round(state.ruler.distAE).toLocaleString();
    var g  = layer.append('g').attr('transform','translate('+(mx0+nx*28)+','+(my0+ny*28)+')');
    g.append('rect').attr('x',-80).attr('y',-20).attr('width',160).attr('height',40)
      .attr('rx',5).attr('fill','rgba(0,0,0,0.88)')
      .attr('stroke',COLORS.rulerLine).attr('stroke-width',1);
    g.append('text').attr('y',-5).attr('text-anchor','middle')
      .attr('fill','#fff').attr('font-size','11px').attr('font-family','sans-serif')
      .text(t.sphereDist+': '+sp+' '+t.km);
    g.append('text').attr('y',11).attr('text-anchor','middle')
      .attr('fill','#a0d8ef').attr('font-size','11px').attr('font-family','sans-serif')
      .text(t.aeDist+': '+ae+' '+t.km);
  }
}

/* ═══════════════════════════════════════════════════════════════
   УТИЛИТЫ
═══════════════════════════════════════════════════════════════ */

/**
 * Применяет новый центр проекции.
 * Порядок важен: сначала сбросить зум, потом пересчитать проекцию.
 */
function applyCenter(lat, lon) {
  if (typeof lat==='string') lat = lat.replace(',','.');
  if (typeof lon==='string') lon = lon.replace(',','.');
  state.lat = Math.max(-90,  Math.min(90,  parseFloat(lat)||0));
  state.lon = Math.max(-180, Math.min(180, parseFloat(lon)||0));
  clearZoomTransform(); // ВАЖНО: сначала сброс
  buildProjection();
  calculateRulerDistances();
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
    state.ruler.points=[]; state.ruler.distSphere=null; state.ruler.distAE=null;
    renderRuler();
    var t  = LANG[state.lang];
    var nL = state.land&&state.land.features ? state.land.features.length : 0;
    setStatus('v'+VERSION+' · '+nL+' '+t.polygons);
  } else {
    setStatus(LANG[state.lang].rulerClickA);
  }
  document.getElementById('map').style.cursor = active ? 'crosshair' : '';
}

/* ═══════════════════════════════════════════════════════════════
   ИНИЦИАЛИЗАЦИЯ
═══════════════════════════════════════════════════════════════ */
async function init() {
  document.title = 'FlatEarthMap v' + VERSION;
  var badge = document.querySelector('.version-badge');
  if (badge) badge.textContent = 'v' + VERSION;

  createSVG();
  setupZoom();
  buildProjection();
  await loadData();
  render();

  state.svg.on('click', handleMapClick);

  // Центр карты
  document.getElementById('btn-apply').addEventListener('click', function() {
    applyCenter(
      document.getElementById('inp-lat').value,
      document.getElementById('inp-lon').value);
  });
  ['inp-lat','inp-lon'].forEach(function(id) {
    document.getElementById(id).addEventListener('keydown', function(e) {
      if (e.key==='Enter') document.getElementById('btn-apply').click();
    });
  });

  // Кнопки ± (инвертирование знака координат)
  document.querySelectorAll('.btn-sign').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      var v = parseFloat(inp.value.replace(',','.'));
      if (!isNaN(v) && v!==0) inp.value = String(-v);
    });
  });

  // Чекбоксы карты
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

  // Линейка — кнопка на карте
  document.getElementById('btn-ruler-map').addEventListener('click', function() {
    toggleRuler(!state.ruler.active);
  });

  // Чекбоксы астрономии
  document.getElementById('chk-sun').addEventListener('change', function(e) {
    state.astro.showSun = e.target.checked;
    updateAstroTimePanel(); renderAstro();
  });
  document.getElementById('chk-night').addEventListener('change', function(e) {
    state.astro.showNight = e.target.checked;
    updateAstroTimePanel(); renderAstro();
  });
  document.getElementById('chk-moon').addEventListener('change', function(e) {
    state.astro.showMoon = e.target.checked;
    updateAstroTimePanel(); renderAstro();
  });
  document.getElementById('chk-planets').addEventListener('change', function(e) {
    state.astro.showPlanets = e.target.checked;
    updateAstroTimePanel(); renderAstro();
  });

  // Ползунок времени UTC (суточный, минуты 0-1439)
  document.getElementById('sun-slider').addEventListener('input', function(e) {
    astroPause();
    var mins = parseInt(e.target.value, 10);
    var d = new Date(state.astro.date);
    d.setUTCHours(Math.floor(mins/60), mins%60, 0, 0);
    setAstroDate(d);
  });

  // Годовой ползунок (день в году, 0-364, шаг = 1 сутки)
  document.getElementById('day-slider').addEventListener('input', function(e) {
    astroPause();
    var targetDay = parseInt(e.target.value, 10);
    var d = state.astro.date;
    // Jan 1 текущего года + targetDay суток, сохраняем текущее UTC-время
    var newMs = Date.UTC(
      d.getUTCFullYear(), 0, 1,
      d.getUTCHours(), d.getUTCMinutes(), 0, 0
    ) + targetDay * 86400000;
    setAstroDate(new Date(newMs));
  });

  // Кнопки управления временем
  document.getElementById('btn-astro-play').addEventListener('click', function() {
    if (state.astro.playing) astroPause(); else astroPlay();
  });
  document.getElementById('btn-astro-now').addEventListener('click', function() {
    astroPause(); setAstroDate(new Date());
  });
  document.getElementById('btn-astro-prev').addEventListener('click', function() {
    astroPause();
    setAstroDate(new Date(state.astro.date.getTime() - 86400000));
  });
  document.getElementById('btn-astro-next').addEventListener('click', function() {
    astroPause();
    setAstroDate(new Date(state.astro.date.getTime() + 86400000));
  });

  // Пресеты координат
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

  document.getElementById('btn-reset-zoom').addEventListener('click', resetZoom);
  document.getElementById('btn-add-point').addEventListener('click', addPoint);

  // Переключение языка
  document.querySelectorAll('.btn-lang').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.lang = btn.dataset.lang;
      localStorage.setItem('femap_lang', state.lang);
      applyLang(); refreshPointsList();
      var t  = LANG[state.lang];
      var nL = state.land&&state.land.features ? state.land.features.length : 0;
      var nB = state.borders&&state.borders.features ? state.borders.features.length : 0;
      setStatus('v'+VERSION+' · '+nL+' '+t.polygons+' · '+nB+' '+t.bordersCount);
    });
  });

  updateAstroDisplay();
  applyLang();
}

// map.js грузится динамически через ver.js — DOMContentLoaded мог уже сработать
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
