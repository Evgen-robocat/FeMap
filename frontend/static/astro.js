/**
 * Файл    : frontend/static/astro.js
 * Версия  : 6.6.0
 *
 * Изменения 6.6.0:
 *   - bodySubpoint() теперь геоцентрическая (раньше — топоцентрическая из точки
 *       0°,0°: у Луны сдвиг до ~1°, что заметно при затмениях)
 *   - shadowInfo(), nodeSubpoints(), moonOrbitLine(): тень Земли, узлы Луны
 *   - astroAnyOn() учитывает showShadow и showNodes

 *
 * Изменения 6.5.0:
 *   - хвосты по времени: pushTimed(), trimTimed(); точка пишется раз в
 *       TRAIL_SAMPLE_MS модельного времени + «живая голова» на каждом кадре
 *   - режим анимации 'speed' (×1 = реальное время, ползунок, пресеты) вместо
 *       'hour' и 'iss'; astroSetSpeed(), updateSpeedUI(), speedFromSlider()

 * Модуль  : Астрономические вычисления и управление временем
 *
 * Изменения 6.4.0:
 *   - updateAstroDisplay() синхронизирует поле календаря #inp-astro-datetime
 *   - jumpToEclipse(kind) — прыжок к ближайшему после текущей даты солнечному
 *       ('solar') или лунному ('lunar') затмению (astronomy-engine), результат
 *       пишется в #ecl-info; setDateFromInput() — дата из календаря (UTC)
 *
 * Изменения 6.2.0:
 *   - planetOn(key) — планета показана: общий чекбокс включён и её собственный тоже;
 *       используется в подсветке зодиака, хвостах и расчёте точек
 *
 * Изменения 6.0.0:
 *   - bodyRaDecJ2000(key, date) — геоцентрические RA/Dec тела в эпохе J2000
 *       (astronomy-engine; для Солнца есть запасная формула без библиотеки)
 *   - zodiacFind(ra, dec)       — id созвездия зодиака, содержащего точку
 *   - zodiacShownBodies()       — тела, показанные на карте (Солнце, Луна, планеты)
 *   - zodiacHighlights()        — для каждого показанного тела: в каком
 *       созвездии оно находится (поле cid, null — вне 13 созвездий);
 *       результат кешируется по времени и набору тел (зум не пересчитывает)
 *   - zodiacName(id, lang)      — название созвездия
 *   - eclipticLine()            — GeoJSON эклиптики в RA/Dec (J2000)
 *   - astroAnyOn()              — добавлены showZodiac и showEcliptic
 *
 * Изменения 5.9.0:
 *   - gstHours(date)  — звёздное время по Гринвичу в часах (общий хелпер:
 *                       astronomy-engine, при его отсутствии — формула).
 *                       Раньше эта логика жила внутри starSubpoint().
 *   - starSubpoint()  — использует gstHours(); результат не изменился
 *   - astroAnyOn()    — добавлен showMilkyWay (панель времени нужна и ему)
 *
 * Изменения 5.8.0:
 *   - satelliteOk()          — проверяет наличие satellite.js
 *   - loadIssTle()           — загрузка TLE МКС с CelesTrak (5с таймаут),
 *                              тихий фоллбэк на ISS_TLE_FALLBACK
 *   - issSubpoint(date)      — субточка МКС через SGP4 (satellite.js)
 *   - appendIssTrailPoint()  — запись субточки МКС в trails.iss.history
 *   - clearAllTrails()       — сброс trails.iss.history (было в v5.7.0 заглушкой)
 *   - setAstroDate()         — при manual=false записывает субточку МКС в history
 *   - astroPlayMode()        — добавлен режим 'iss': шаг = 1 мин × issSpeed,
 *                              пересчитывается каждый тик (скорость можно менять в полёте)
 *   - updatePlayButtons()    — добавлен btn-play-iss, показ/скрытие iss-speed-btns,
 *                              синхронизация кнопок скорости и слайдера
 *   - astroAnyOn()           — добавлен showIss
 *   - updateAstroTimePanel() — без изменений (astroAnyOn уже включает showIss)
 *
 * Изменения 5.7.0:
 *   - appendPlanetTrailPoint(key, lon, lat)
 *   - clearAllTrails() — расширена: сбрасывает history планет
 *   - setAstroDate() — дописывает субточки планет в history
 *
 * Содержит:
 *   - Проверка библиотек (astroOk, satelliteOk)
 *   - Вычисление субточек: Солнце, Луна, планеты, звёзды, МКС
 *   - GeoJSON ночного полушария
 *   - Загрузка TLE (loadIssTle)
 *   - Управление анимацией (play/pause/mode + iss-speed)
 *   - Синхронизация UI
 *   - Запись / сброс истории хвостов
 *
 * Зависит от: config.js, state.js
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   ПРОВЕРКА НАЛИЧИЯ БИБЛИОТЕК
═══════════════════════════════════════════════════════════════ */

/** Возвращает true, если astronomy-engine загружен и готов. */
function astroOk() {
  return typeof Astronomy !== 'undefined';
}

/** Возвращает true, если satellite.js загружен и готов. */
function satelliteOk() {
  return typeof satellite !== 'undefined';
}

/**
 * Коллбэк для astronomy-engine: вызывается когда библиотека
 * завершила инициализацию.
 */
window.onAstronomyReady = function() {
  console.log('[astro.js] astronomy-engine готов');
  if (state.astro.showMoon || state.astro.showPlanets) {
    renderAstro();
  }
};

/* ═══════════════════════════════════════════════════════════════
   ЗАГРУЗКА TLE МКС (v5.8.0)
═══════════════════════════════════════════════════════════════ */

/**
 * Загружает актуальное TLE МКС с CelesTrak.
 * Таймаут 5 сек; при любой ошибке тихо переходит на ISS_TLE_FALLBACK.
 * Парсит три строки, инициализирует state.astro.iss.satrec через satellite.js.
 * Вызывается один раз в init() перед первым setAstroDate().
 */
function loadIssTle() {
  /* Если satellite.js не загружен — нет смысла тянуть TLE */
  if (!satelliteOk()) {
    console.warn('[astro.js] satellite.js не найден, МКС недоступен');
    return;
  }

  /**
   * Инициализирует satrec из трёх строк TLE.
   * @param {string[]} lines  — ['ISS (ZARYA)', line1, line2]
   */
  function initSatrec(lines) {
    try {
      var line1 = lines[1];
      var line2 = lines[2];
      state.astro.iss.tle    = [line1, line2];
      state.astro.iss.satrec = satellite.twoline2satrec(line1, line2);
      console.log('[astro.js] satrec МКС инициализирован');
    } catch(e) {
      console.warn('[astro.js] Ошибка парсинга TLE МКС:', e.message || e);
    }
  }

  /* Инициализируем фоллбэк сразу, чтобы МКС работал до ответа сети */
  initSatrec(ISS_TLE_FALLBACK);

  /* AbortController для таймаута 5 сек */
  var controller  = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timeoutId   = null;
  var fetchOpts   = {};
  if (controller) {
    timeoutId = setTimeout(function() { controller.abort(); }, 5000);
    fetchOpts = { signal: controller.signal };
  }

  fetch(ISS_TLE_URL, fetchOpts)
    .then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })
    .then(function(text) {
      if (timeoutId) clearTimeout(timeoutId);
      /* CelesTrak возвращает три строки: имя, line1, line2 */
      var lines = text.trim().split('\n').map(function(l) { return l.trim(); });
      if (lines.length < 3 || !lines[1].match(/^1 /) || !lines[2].match(/^2 /)) {
        throw new Error('Некорректный формат TLE');
      }
      initSatrec(lines);
      console.log('[astro.js] TLE МКС обновлён с CelesTrak:', lines[0]);
    })
    .catch(function(err) {
      if (timeoutId) clearTimeout(timeoutId);
      /* Сеть недоступна / CORS / таймаут — остаёмся на фоллбэке, не шумим */
      console.info('[astro.js] TLE fetch failed (используется fallback):', err.message || err);
    });
}

/* ═══════════════════════════════════════════════════════════════
   ВЫЧИСЛЕНИЕ СУБТОЧЕК
═══════════════════════════════════════════════════════════════ */

/**
 * Субсолярная точка — встроенная формула (fallback без astronomy-engine).
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
 * @param {string} bodyKey
 * @param {Date}   date
 * @returns {{ lat: number, lon: number } | null}
 */
function bodySubpoint(bodyKey, date) {
  if (!astroOk()) return null;
  try {
    var g = geoEquatorOfDate(bodyKey, date);
    if (!g) return null;
    var gstDeg   = Astronomy.SiderealTime(date) * 15;
    var ghaDeg   = ((gstDeg - g.ra * 15) % 360 + 360) % 360;
    var lon      = -ghaDeg;
    if (lon < -180) lon += 360;
    if (lon >  180) lon -= 360;
    return { lat: g.dec, lon: lon };
  } catch(e) {
    console.error('[astro] bodySubpoint "' + bodyKey + '" ошибка:', e.message || e);
    return null;
  }
}

/**
 * Геоцентрические экваториальные координаты тела на эпоху даты (v6.6.0):
 * ra в часах, dec в градусах, dist — расстояние от центра Земли в км.
 * Для Солнца учитывается аберрация.
 */
function geoEquatorOfDate(bodyKey, date) {
  var body = Astronomy.Body[bodyKey];
  if (body === undefined) return null;
  var v   = Astronomy.GeoVector(body, date, bodyKey === 'Sun');
  var rot = Astronomy.Rotation_EQJ_EQD(date);
  var eq  = Astronomy.EquatorFromVector(Astronomy.RotateVector(rot, v));
  return { ra: eq.ra, dec: eq.dec, dist: v.Length() * AU_KM };
}

/**
 * Субсолярная точка с фоллбэком.
 * @param {Date} date
 * @returns {{ lat: number, lon: number }}
 */
function getSunSubpoint(date) {
  return bodySubpoint('Sun', date) || sunSubpoint(date);
}

/**
 * Иконка фазы Луны.
 * @param {Date} date
 * @returns {string}
 */
function moonIcon(date) {
  if (!astroOk()) return '🌙';
  try {
    var phase = Astronomy.MoonPhase(date);
    var icons = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
    return icons[Math.round(phase / 45) % 8];
  } catch(e) { return '🌙'; }
}

/**
 * Гринвичское звёздное время в часах (0..24). (v5.9.0)
 * Любая точка неба (RA, Dec) лежит над точкой Земли с
 * lon = RA - GST, lat = Dec — на этом строятся звёзды и Млечный Путь.
 * @param {Date} date
 * @returns {number}
 */
function gstHours(date) {
  if (astroOk()) return Astronomy.SiderealTime(date);
  var JD = date.getTime() / 86400000 + 2440587.5;
  var n  = JD - 2451545.0;
  var UT = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return ((6.697375 + 0.0657098242 * n + UT * 1.00273791) % 24 + 24) % 24;
}

/**
 * Субточка звезды по J2000 координатам.
 * @param {number} ra_hours
 * @param {number} dec
 * @param {Date}   date
 * @returns {{ lat: number, lon: number }}
 */
function starSubpoint(ra_hours, dec, date) {
  var lon = (ra_hours - gstHours(date)) * 15;
  lon = ((lon + 180) % 360 + 360) % 360 - 180;
  return { lat: dec, lon: lon };
}

/**
 * Субточка МКС через SGP4 (satellite.js). (v5.8.0)
 * Требует загруженного satrec в state.astro.iss.satrec.
 *
 * @param {Date} date
 * @returns {{ lon: number, lat: number } | null}  — градусы, или null при ошибке
 */
function issSubpoint(date) {
  if (!satelliteOk()) return null;
  var iss = state.astro.iss;
  if (!iss || !iss.satrec) return null;
  try {
    var posVel = satellite.propagate(iss.satrec, date);
    /* posVel.position === false означает ошибку SGP4 (напр., слишком старое TLE) */
    if (!posVel || posVel.position === false || !posVel.position) return null;

    var gmst = satellite.gstime(date);
    var geo  = satellite.eciToGeodetic(posVel.position, gmst);

    var lon  = satellite.degreesLong(geo.longitude);
    var lat  = satellite.degreesLat(geo.latitude);

    return { lon: lon, lat: lat };
  } catch(e) {
    /* Молчим — ошибки возможны при плохом TLE или пограничных датах */
    return null;
  }
}

/**
 * GeoJSON-полигон ночного полушария.
 * @param {{ lat: number, lon: number }} sp
 * @returns {GeoJSON Feature}
 */
function nightGeoJSON(sp) {
  var aLat = -sp.lat;
  var aLon = sp.lon >= 0 ? sp.lon - 180 : sp.lon + 180;
  return d3.geoCircle().center([aLon, aLat]).radius(90).precision(1.5)();
}

/* ═══════════════════════════════════════════════════════════════
   ЗОДИАК И ЭКЛИПТИКА (v6.0.0)
═══════════════════════════════════════════════════════════════ */

/**
 * Запасная формула RA/Dec Солнца (без astronomy-engine), эпоха J2000.
 * Формула даёт долготу «текущей даты» — вычитаем прецессию
 * (50.29″/год ≈ 0.013969°/год), иначе границы созвездий, заданные в
 * J2000, сдвинулись бы на ~0.36°.
 */
function sunRaDecFallback(date) {
  var JD   = date.getTime() / 86400000 + 2440587.5;
  var n    = JD - 2451545.0;
  var L    = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
  var g    = ((357.528 + 0.9856003 * n) % 360 + 360) % 360;
  var gR   = g * Math.PI / 180;
  var lam  = L + 1.915 * Math.sin(gR) + 0.020 * Math.sin(2 * gR);
  lam -= 0.013969 * (n / 365.25);
  var lamR = lam * Math.PI / 180;
  var eps  = OBLIQUITY * Math.PI / 180;
  var ra   = Math.atan2(Math.cos(eps) * Math.sin(lamR), Math.cos(lamR)) * 180 / Math.PI;
  var dec  = Math.asin(Math.sin(eps) * Math.sin(lamR)) * 180 / Math.PI;
  return { ra: ((ra % 360) + 360) % 360, dec: dec };
}

/**
 * Геоцентрические экваториальные координаты тела в эпохе J2000
 * (в той же эпохе заданы границы созвездий в zodiac.json).
 * В отличие от bodySubpoint() здесь НЕТ топоцентрической поправки
 * (иначе Луна сдвинулась бы до ~1°) и нет перехода к экватору даты.
 *
 * @param {string} bodyKey — 'Sun' | 'Moon' | 'Mercury' | …
 * @param {Date}   date
 * @returns {{ ra: number, dec: number } | null} — градусы, ra 0..360
 */
function bodyRaDecJ2000(bodyKey, date) {
  if (astroOk() &&
      typeof Astronomy.GeoVector === 'function' &&
      typeof Astronomy.EquatorFromVector === 'function') {
    try {
      var body = Astronomy.Body[bodyKey];
      if (body !== undefined) {
        var eq = Astronomy.EquatorFromVector(Astronomy.GeoVector(body, date, true));
        return { ra: eq.ra * 15, dec: eq.dec };
      }
    } catch(e) {
      console.error('[astro] bodyRaDecJ2000 "' + bodyKey + '" ошибка:', e.message || e);
    }
  }
  if (bodyKey === 'Sun') return sunRaDecFallback(date);
  return null;
}

/**
 * Ищет созвездие зодиака (из 13), содержащее точку неба.
 * @param {number} raDeg — 0..360
 * @param {number} dec
 * @returns {string|null} — id ('Vir', …) или null, если вне 13 созвездий
 */
function zodiacFind(raDeg, dec) {
  var z = state.zodiac.data;
  if (!z || !z.features) return null;
  var pt = [raDeg > 180 ? raDeg - 360 : raDeg, dec];
  for (var i = 0; i < z.features.length; i++) {
    if (d3.geoContains(z.features[i], pt)) return z.features[i].id;
  }
  return null;
}

/**
 * Тела, которые сейчас показаны на карте, в порядке приоритета цвета:
 * Солнце → Луна → планеты (порядок PLANETS).
 * @returns {Array<{ key, sym, color, label }>}
 */
/** Планета показана: включён общий чекбокс и её собственный (v6.2.0). */
function planetOn(key) {
  var a = state.astro;
  return !!(a.showPlanets && a.planetsOn && a.planetsOn[key] !== false);
}

function zodiacShownBodies() {
  var out = [];
  if (state.astro.showSun) {
    out.push({ key:'Sun',  sym:ZODIAC_BODIES.Sun.sym,  color:ZODIAC_BODIES.Sun.color,  label:ZODIAC_BODIES.Sun.label });
  }
  if (state.astro.showMoon) {
    out.push({ key:'Moon', sym:ZODIAC_BODIES.Moon.sym, color:ZODIAC_BODIES.Moon.color, label:ZODIAC_BODIES.Moon.label });
  }
  if (state.astro.showPlanets && astroOk()) {
    PLANETS.forEach(function(pl) {
      if (!planetOn(pl.key)) return;
      out.push({ key:pl.key, sym:pl.sym, color:pl.color, label:pl.label });
    });
  }
  return out;
}

/**
 * Для каждого показанного тела определяет созвездие, в котором оно
 * находится. Пусто, если зодиак или подсветка выключены, либо данные
 * ещё не загружены.
 * @returns {Array<{ key, sym, color, label, cid }>} cid — id созвездия или null
 */
var _hlCache = { key: null, val: [] };

function zodiacHighlights() {
  var a = state.astro;
  if (!a.showZodiac || !a.zodiacHighlight || !state.zodiac.data) return [];

  /* Кеш: renderAstro() вызывается и при каждом событии зума, а положения
     тел за это время не меняются — пересчитывать их незачем. */
  var key = [a.date.getTime(), a.showSun ? 1 : 0, a.showMoon ? 1 : 0,
             a.showPlanets ? 1 : 0, astroOk() ? 1 : 0,
             PLANETS.map(function(pl) { return planetOn(pl.key) ? 1 : 0; }).join('')].join('|');
  if (_hlCache.key === key) return _hlCache.val;

  var val = zodiacShownBodies().map(function(b) {
    var rd = bodyRaDecJ2000(b.key, a.date);
    b.cid = rd ? zodiacFind(rd.ra, rd.dec) : null;
    return b;
  });
  _hlCache = { key: key, val: val };
  return val;
}

/** Название созвездия зодиака на языке интерфейса. */
function zodiacName(id, lang) {
  for (var i = 0; i < ZODIAC.length; i++) {
    if (ZODIAC[i].id === id) return ZODIAC[i][lang] || ZODIAC[i].ru;
  }
  return id;
}

var _eclipticLine = null;

/**
 * Эклиптика как GeoJSON LineString в RA/Dec (J2000), шаг 1° по
 * эклиптической долготе. Точка (λ, β=0):
 *   x = cos λ,  y = sin λ · cos ε,  z = sin λ · sin ε
 *   RA = atan2(y, x),  Dec = asin(z).
 * Эклиптика — большой круг, дуги D3 между соседними точками точны.
 * Считается один раз, дальше кешируется.
 */
function eclipticLine() {
  if (_eclipticLine) return _eclipticLine;
  var eps = OBLIQUITY * Math.PI / 180;
  var coords = [];
  for (var lam = 0; lam <= 360; lam++) {
    var l = lam * Math.PI / 180;
    var x = Math.cos(l);
    var y = Math.sin(l) * Math.cos(eps);
    var z = Math.sin(l) * Math.sin(eps);
    var ra  = Math.atan2(y, x) * 180 / Math.PI;   // -180..180
    var dec = Math.asin(z) * 180 / Math.PI;
    coords.push([ra, dec]);
  }
  _eclipticLine = { type: 'LineString', coordinates: coords };
  return _eclipticLine;
}

/**
 * Возвращает массив координат для "магнита" линейки к астро-объектам.
 * @returns {Array<{ lon: number, lat: number }>}
 */
function getAstroPoints() {
  var result = [];
  var date   = state.astro.date;

  if (state.astro.showSun) {
    var sp = getSunSubpoint(date);
    result.push({ lon: sp.lon, lat: sp.lat });
  }
  if (state.astro.showMoon) {
    var mp = bodySubpoint('Moon', date);
    if (mp) result.push({ lon: mp.lon, lat: mp.lat });
  }
  if (state.astro.showPlanets && astroOk()) {
    PLANETS.forEach(function(pl) {
      if (!planetOn(pl.key)) return;
      var pp = bodySubpoint(pl.key, date);
      if (pp) result.push({ lon: pp.lon, lat: pp.lat });
    });
  }
  if (state.astro.showIss) {
    var ip = issSubpoint(date);
    if (ip) result.push({ lon: ip.lon, lat: ip.lat });
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════
   ХВОСТЫ — запись истории (v5.6.0+)
═══════════════════════════════════════════════════════════════ */

/**
 * Инициализирует массив history для звёзд.
 * Создаёт по одному пустому массиву на каждую звезду из STARS.
 */
function initStarTrails() {
  var h = state.astro.trails.stars.history;
  if (h.length === STARS.length) return;
  h.length = 0;
  for (var i = 0; i < STARS.length; i++) {
    h.push([]);
  }
}

/**
 * Запись точки хвоста по времени (v6.5.0).
 * Элемент истории: [lon, lat, t] — зафиксированная точка, [lon, lat, t, 1] —
 * «живая голова» (текущее положение; на каждом кадре заменяется). Новая
 * зафиксированная точка пишется не чаще чем раз в sampleMs модельного
 * времени, старше lenMs отбрасывается — длина хвоста не зависит от скорости.
 * Если время пошло назад — история сбрасывается.
 */
function pushTimed(h, lon, lat, t, sampleMs, lenMs, extra) {
  var n = h.length;
  if (n && h[n - 1][3]) { h.pop(); n--; }
  if (n && t < h[n - 1][2]) { h.length = 0; n = 0; }
  if (n === 0 || t - h[n - 1][2] >= sampleMs) h.push([lon, lat, t, 0, extra]);
  h.push([lon, lat, t, 1, extra]);
  var cut = t - lenMs;
  while (h.length > 2 && h[1][2] < cut) h.shift();
}

/** Обрезает историю до lenMs от последней точки (при смене длины хвоста). */
function trimTimed(h, lenMs) {
  if (!h || !h.length) return;
  var cut = h[h.length - 1][2] - lenMs;
  while (h.length > 2 && h[1][2] < cut) h.shift();
}

/**
 * Добавляет точку [lon, lat] в history объекта (Солнце или Луна).
 * @param {'sun'|'moon'} key
 */
function appendTrailPoint(key, lon, lat) {
  var trail = state.astro.trails[key];
  if (!trail) return;
  pushTimed(trail.history, lon, lat, state.astro.date.getTime(),
            TRAIL_SAMPLE_MS.sunMoon, trail.days * 86400000);
}

/** Добавляет точку в историю конкретной звезды. */
function appendStarTrailPoint(idx, lon, lat) {
  var trail = state.astro.trails.stars;
  if (!trail.history[idx]) return;
  pushTimed(trail.history[idx], lon, lat, state.astro.date.getTime(),
            TRAIL_SAMPLE_MS.stars, trail.hours * 3600000);
}

/** Добавляет точку в историю конкретной планеты. (v5.7.0) */
var _retroCache = {};
/** v7.0.0: планета в ретроградном движении (геоцентрическая эклиптическая долгота убывает). */
function isRetrograde(key, date) {
  if (!astroOk() || key === 'Sun' || key === 'Moon') return false;
  var ck = key + ':' + Math.floor(date.getTime() / 43200000);
  if (ck in _retroCache) return _retroCache[ck];
  var v = false;
  try {
    var b = Astronomy.Body[key];
    var e1 = Astronomy.Ecliptic(Astronomy.GeoVector(b, date, true)).elon;
    var e2 = Astronomy.Ecliptic(Astronomy.GeoVector(b, new Date(date.getTime() + 86400000), true)).elon;
    v = (((e2 - e1 + 540) % 360) - 180) < 0;
  } catch (e) { v = false; }
  _retroCache[ck] = v;
  return v;
}

/** v7.0.0: Луна у узла орбиты: {which:'rahu'|'ketu', dist} или null. */
function moonNodePass(date) {
  if (!astroOk()) return null;
  try {
    var ml = Astronomy.EclipticGeoMoon(date).lon;
    var om = meanNodeLon(date);
    var dr = Math.abs(((ml - om + 540) % 360) - 180 - 0);
    var d1 = Math.abs(((ml - om + 540) % 360) - 180);
    var d2 = Math.abs(((ml - om - 180 + 540) % 360) - 180);
    if (d1 < NODE_PASS_DEG && d1 <= d2) return { which: 'rahu', dist: d1 };
    if (d2 < NODE_PASS_DEG) return { which: 'ketu', dist: d2 };
  } catch (e) {}
  return null;
}

function appendPlanetTrailPoint(key, lon, lat) {
  var trail = state.astro.trails.planets;
  if (!trail.history[key]) trail.history[key] = [];
  pushTimed(trail.history[key], lon, lat, state.astro.date.getTime(),
            TRAIL_SAMPLE_MS.planets, trail.days * 86400000,
            isRetrograde(key, state.astro.date) ? 1 : 0);
}

/** Добавляет точку в историю хвоста МКС. (v5.8.0) */
function appendIssTrailPoint(lon, lat) {
  var trail = state.astro.trails.iss;
  pushTimed(trail.history, lon, lat, state.astro.date.getTime(),
            TRAIL_SAMPLE_MS.iss, trail.minutes * 60000);
}

/**
 * Сбрасывает историю всех хвостов.
 * Вызывается при ручном изменении даты.
 */
function clearAllTrails() {
  state.astro.trails.sun.history  = [];
  state.astro.trails.moon.history = [];
  /* Звёзды — сохраняем структуру массива */
  for (var i = 0; i < state.astro.trails.stars.history.length; i++) {
    state.astro.trails.stars.history[i] = [];
  }
  /* Планеты — сохраняем ключи объекта (v5.7.0) */
  var ph = state.astro.trails.planets.history;
  for (var pk in ph) {
    if (Object.prototype.hasOwnProperty.call(ph, pk)) ph[pk] = [];
  }
  /* МКС (v5.8.0) */
  state.astro.trails.iss.history = [];
}

/* ═══════════════════════════════════════════════════════════════
   УПРАВЛЕНИЕ ВРЕМЕНЕМ
═══════════════════════════════════════════════════════════════ */

/** Дополняет число до двух цифр нулём слева. */
function pad2(n) { return String(n).padStart(2, '0'); }

/**
 * Обновляет текстовый дисплей текущего времени UTC.
 */
function updateAstroDisplay() {
  var el = document.getElementById('astro-display');
  if (!el) return;
  var d = state.astro.date;
  el.textContent =
    d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) +
    '  ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ' UTC';

  /* поле календаря: значение — «YYYY-MM-DDTHH:MM» в UTC (v6.4.0) */
  var inp = document.getElementById('inp-astro-datetime');
  if (inp) {
    var iso = d.toISOString();                 // 2026-05-14T05:49:00.000Z
    var v = iso.slice(0, 16);
    if (/^\d{4}-/.test(v) && inp.value !== v) inp.value = v;
  }
}

/**
 * Дата и время из поля календаря (трактуются как UTC). Останавливает
 * анимацию и ставит время вручную (хвосты сбрасываются). (v6.4.0)
 */
function setDateFromInput(value) {
  if (!value) return false;
  var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return false;
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  if (isNaN(d.getTime())) return false;
  astroPause();
  setAstroDate(d, true);
  return true;
}

/**
 * Находит следующее после текущей даты затмение и переходит к его максимуму.
 * @param {'solar'|'lunar'} kind
 * @returns {{ kind: string, name: string, date: Date }|null}
 */
function jumpToEclipse(kind) {
  var t = LANG[state.lang];
  var info = document.getElementById('ecl-info');
  var say = function(txt) { if (info) info.textContent = txt; };
  if (!astroOk()) { say(t.eclNeedLib); return null; }
  try {
    var from = new Date(state.astro.date.getTime() + 60000);   // строго после текущего момента
    var search = function(d) { return (kind === 'solar') ? Astronomy.SearchGlobalSolarEclipse(d)
                                                          : Astronomy.SearchLunarEclipse(d); };
    var e = search(from);
    /* движок ищет по новолуниям/полнолуниям, пик может оказаться чуть раньше
       текущего момента — тогда берём следующее */
    for (var guard = 0; e && e.peak && e.peak.date.getTime() <= from.getTime() && guard < 3; guard++) {
      e = search(new Date(e.peak.date.getTime() + 10 * 86400000));
    }
    if (!e || !e.peak) { say(t.eclNotFound); return null; }
    var peak = e.peak.date;
    var kindKey = { total:'eclTotal', annular:'eclAnnular', partial:'eclPartial',
                    penumbral:'eclPenumbral', hybrid:'eclHybrid' }[String(e.kind).toLowerCase()];
    var kindTxt = kindKey ? t[kindKey] : String(e.kind);
    var name = (kind === 'solar' ? t.eclSolarName : t.eclLunarName) + ' (' + kindTxt + ')';
    astroPause();
    setAstroDate(new Date(peak.getTime()), true);
    say(name);
    return { kind: kind, name: name, date: peak };
  } catch (err) {
    console.warn('[astro] eclipse search:', err && err.message || err);
    say(t.eclNotFound);
    return null;
  }
}

/**
 * Порядковый номер дня в году (0–364).
 * @param {Date} date
 * @returns {number}
 */
function dayOfYear(date) {
  var start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.min(364, Math.floor((date.getTime() - start) / 86400000));
}

/**
 * Устанавливает новое время для астро-расчётов.
 *
 * @param {Date}    date
 * @param {boolean} [manual=false]
 *   true  — вызван вручную (ползунки, кнопки): history сбрасывается
 *   false — вызван анимацией: history пополняется
 */
function setAstroDate(date, manual) {
  state.astro.date = date;

  /* Синхронизируем ползунки */
  var slider = document.getElementById('sun-slider');
  if (slider) slider.value = date.getUTCHours() * 60 + date.getUTCMinutes();
  var daySlider = document.getElementById('day-slider');
  if (daySlider) daySlider.value = dayOfYear(date);

  updateAstroDisplay();

  /* ── Хвосты ─────────────────────────────────────────────── */
  if (manual) {
    clearAllTrails();
  } else {
    /* Солнце */
    if (state.astro.showSun && state.astro.trails.sun.enabled) {
      var sp = getSunSubpoint(date);
      appendTrailPoint('sun', sp.lon, sp.lat);
    }

    /* Луна */
    if (state.astro.showMoon && state.astro.trails.moon.enabled) {
      var mp = bodySubpoint('Moon', date);
      if (mp) appendTrailPoint('moon', mp.lon, mp.lat);
    }

    /* Звёзды */
    if (state.astro.showStars && state.astro.trails.stars.enabled) {
      for (var i = 0; i < STARS.length; i++) {
        var sp2 = starSubpoint(STARS[i].ra, STARS[i].dec, date);
        appendStarTrailPoint(i, sp2.lon, sp2.lat);
      }
    }

    /* Планеты (v5.7.0) */
    if (state.astro.showPlanets && state.astro.trails.planets.enabled && astroOk()) {
      PLANETS.forEach(function(pl) {
        if (!planetOn(pl.key)) return;
        var pp = bodySubpoint(pl.key, date);
        if (pp) appendPlanetTrailPoint(pl.key, pp.lon, pp.lat);
      });
    }

    /* МКС (v5.8.0) — записываем только при режиме 'iss', когда хвост включён */
    if (state.astro.showIss && state.astro.trails.iss.enabled) {
      var ip = issSubpoint(date);
      if (ip) appendIssTrailPoint(ip.lon, ip.lat);
    }
  }

  renderAstro(); // определена в render.js
}

/* ═══════════════════════════════════════════════════════════════
   УПРАВЛЕНИЕ АНИМАЦИЕЙ
═══════════════════════════════════════════════════════════════ */

/**
 * Запускает или переключает режим анимации.
 * @param {'speed'|'day'|'sidereal'} mode
 *   speed    — реальное время × state.astro.speed (1 с = speed с)
 *   day      — шаг 1 сутки на кадр (годовое движение)
 *   sidereal — шаг 23ч 56м 4с на кадр (звёздные сутки)
 */
function astroPlayMode(mode) {
  /* Если тот же режим уже играет — пауза */
  if (state.astro.playing && state.astro.playMode === mode) {
    astroPause();
    return;
  }
  astroPause();

  state.astro.playing  = true;
  state.astro.playMode = mode;
  updatePlayButtons();

  var last = performance.now();
  state.astro.timer = setInterval(function() {
    var now = performance.now();
    var dt  = now - last;
    last = now;
    var stepMs;
    if (state.astro.playMode === 'speed') {
      /* Реальное прошедшее время × скорость: ×1 = реальное время.
         Скорость читается каждый кадр — меняется на ходу. */
      stepMs = dt * state.astro.speed;
    } else {
      stepMs = ANIM_STEP[state.astro.playMode];
    }
    setAstroDate(new Date(state.astro.date.getTime() + stepMs), false);
  }, ANIM_INTERVAL_MS);
}

/**
 * Останавливает анимацию.
 */
function astroPause() {
  if (state.astro.timer) { clearInterval(state.astro.timer); state.astro.timer = null; }
  state.astro.playing  = false;
  state.astro.playMode = null;
  updatePlayButtons();
}

/** Ползунок (0..1000, логарифмический) → скорость 1..SPEED_MAX. */
function speedFromSlider(p) {
  return Math.max(1, Math.min(SPEED_MAX, Math.round(Math.pow(SPEED_MAX, p / 1000))));
}

/** Скорость → положение ползунка. */
function sliderFromSpeed(v) {
  return Math.round(1000 * Math.log(Math.max(1, v)) / Math.log(SPEED_MAX));
}

/**
 * Устанавливает скорость; startPlay — запустить, если не играет в режиме speed.
 */
function astroSetSpeed(v, startPlay) {
  state.astro.speed = Math.max(1, Math.min(SPEED_MAX, v));
  if (startPlay && !(state.astro.playing && state.astro.playMode === 'speed')) {
    astroPlayMode('speed');   // внутри вызовет updatePlayButtons()
    return;
  }
  updatePlayButtons();
}

/** «1 с = 5 мин» — что означает текущая скорость. */
function speedEquiv(v) {
  var L = LANG[state.lang];
  var r = function(x) { return Math.round(x * 10) / 10; };
  if (v < 120)    return r(v) + ' ' + L.unitSec;
  if (v < 7200)   return r(v / 60) + ' ' + L.unitMin;
  if (v < 172800) return r(v / 3600) + ' ' + L.unitHour;
  return r(v / 86400) + ' ' + L.unitDay;
}

/**
 * Обновляет кнопки скорости, ползунок, подписи, кнопки день/звёздные сутки
 * и подсказку режима.
 */
function updatePlayButtons() {
  var L = LANG[state.lang];
  var playing = state.astro.playing;
  var mode    = state.astro.playMode;
  var speedOn = playing && mode === 'speed';

  /* ── Кнопки скорости ×1 / ×10 / ×20 / ×100 ───────────────── */
  SPEED_PRESETS.forEach(function(sp) {
    var btn = document.getElementById('btn-spd-' + sp);
    if (!btn) return;
    var sel = (state.astro.speed === sp);
    btn.textContent = (speedOn && sel ? '⏸ ' : '▶ ') + (sp === 1 ? L.speedReal : '×' + sp);
    btn.style.background  = (speedOn && sel) ? '#1a5a8a' : '';
    btn.style.borderColor = sel ? '#3ab4ff' : '';
  });
  var bp = document.getElementById('btn-speed-play');
  if (bp) {
    bp.textContent = speedOn ? '⏸' : '▶';
    bp.style.background = speedOn ? '#1a5a8a' : '';
  }
  var sl = document.getElementById('slider-speed');
  if (sl) sl.value = sliderFromSpeed(state.astro.speed);
  var ro = document.getElementById('speed-readout');
  if (ro) ro.textContent = '×' + state.astro.speed + '  ·  ' + L.oneSec + ' = ' + speedEquiv(state.astro.speed);

  /* ── Кнопки «год» (24ч) и звёздные сутки ─────────────────── */
  var btnIds = { day: 'btn-play-day', sidereal: 'btn-play-sidereal' };
  var labels = {
    day:      { ru:'24ч',   en:'24h',   de:'24h'   },
    sidereal: { ru:'☆сут',  en:'☆sid',  de:'☆sid'  }
  };
  ['day', 'sidereal'].forEach(function(m) {
    var btn = document.getElementById(btnIds[m]);
    if (!btn) return;
    var active = playing && mode === m;
    btn.textContent       = (active ? '⏸ ' : '▶ ') + labels[m][state.lang];
    btn.style.background  = active ? '#1a5a8a' : '';
    btn.style.borderColor = active ? '#3ab4ff' : '';
  });

  /* ── Подсказка режима ─────────────────────────────────────── */
  var hint = document.getElementById('astro-mode-hint');
  if (hint) {
    if (playing && mode === 'day')            hint.textContent = L.modeDay || '';
    else if (playing && mode === 'sidereal')  hint.textContent = L.modeSidereal || '';
    else                                      hint.textContent = '';
  }
}

/* ═══════════════════════════════════════════════════════════════
   ТЕНЬ ЗЕМЛИ И УЗЛЫ ЛУНЫ (v6.6.0)
═══════════════════════════════════════════════════════════════ */

function angDistDeg(a, b) {
  var D = Math.PI / 180;
  var c = Math.sin(a.lat * D) * Math.sin(b.lat * D) +
          Math.cos(a.lat * D) * Math.cos(b.lat * D) * Math.cos((a.lon - b.lon) * D);
  return Math.acos(Math.max(-1, Math.min(1, c))) / D;
}

/**
 * v6.8.0: данные для наблюдателя. Возвращает { rows:[{key,alt,az,elong}], sunAlt }.
 * Высота/азимут — топоцентрические, с рефракцией; элонгация — угол от Солнца.
 */
function observerInfo(date) {
  if (!astroOk()) return null;
  var o = state.observer, A = state.astro;
  try {
    var obs = new Astronomy.Observer(o.lat, o.lon, 0);
    var keys = ['Sun'];
    if (A.showMoon) keys.push('Moon');
    if (A.showPlanets) PLANETS.forEach(function(pl) { if (planetOn(pl.key)) keys.push(pl.key); });
    var rows = [], sunAlt = null;
    keys.forEach(function(k) {
      var b  = Astronomy.Body[k];
      var eq = Astronomy.Equator(b, date, obs, true, true);
      var hz = Astronomy.Horizon(date, obs, eq.ra, eq.dec, 'normal');
      var el = (k === 'Sun') ? null : Astronomy.AngleFromSun(b, date);
      if (k === 'Sun') sunAlt = hz.altitude;
      rows.push({ key: k, alt: hz.altitude, az: hz.azimuth, elong: el });
    });
    return { rows: rows, sunAlt: sunAlt };
  } catch (e) {
    console.error('[astro] observerInfo:', e.message || e);
    return null;
  }
}

function wrapLon(l) { return ((l + 540) % 360) - 180; }

/**
 * Тень Земли на расстоянии Луны: центр — точка, противоположная Солнцу
 * (антипод субсолярной точки), радиусы умбры и пенумбры в градусах.
 * Расстояние «центр → Луна» и фазы умбры/пенумбры считаются так же, как в
 * каталогах затмений: (r + s☾ − расстояние) / (2 · s☾).
 * @returns {{lon,lat,umbra,penumbra,sep,moonR,magU,magP}|null}
 */
function shadowInfo(date) {
  if (!astroOk()) return null;
  try {
    var D  = 180 / Math.PI;
    var sg = geoEquatorOfDate('Sun', date);
    var mg = geoEquatorOfDate('Moon', date);
    var sp = bodySubpoint('Sun', date), mp = bodySubpoint('Moon', date);
    if (!sg || !mg || !sp || !mp) return null;
    var center = { lon: wrapLon(sp.lon + 180), lat: -sp.lat };
    var piM = Math.asin(EARTH_R_KM / mg.dist) * D;
    var piS = Math.asin(EARTH_R_KM / sg.dist) * D;
    var sS  = Math.asin(SUN_R_KM   / sg.dist) * D;
    var sM  = Math.asin(MOON_R_KM  / mg.dist) * D;
    var umbra    = SHADOW_ENLARGE * (piM + piS - sS);
    var penumbra = SHADOW_ENLARGE * (piM + piS + sS);
    var sep = angDistDeg(mp, center);
    return {
      lon: center.lon, lat: center.lat,
      umbra: umbra, penumbra: penumbra, sep: sep, moonR: sM,
      magU: (umbra + sM - sep) / (2 * sM),
      magP: (penumbra + sM - sep) / (2 * sM)
    };
  } catch (e) {
    console.error('[astro] shadowInfo:', e.message || e);
    return null;
  }
}

/** Юлианская дата. */
function julianDayOf(date) { return date.getTime() / 86400000 + 2440587.5; }

/** Средняя долгота восходящего узла лунной орбиты, ° (Meeus). */
function meanNodeLon(date) {
  var T = (julianDayOf(date) - 2451545.0) / 36525;
  var om = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
  return ((om % 360) + 360) % 360;
}

/**
 * Эклиптическая точка (λ, β) на эпоху даты → подточка на Земле.
 * Средняя эклиптика даты, без нутации (разница ~0.005°).
 */
function eclipticToSubpoint(lamDeg, betaDeg, date) {
  var R = Math.PI / 180;
  var T = (julianDayOf(date) - 2451545.0) / 36525;
  var eps = (23.4392911 - 0.0130042 * T) * R;
  var l = lamDeg * R, b = betaDeg * R;
  var x = Math.cos(b) * Math.cos(l);
  var y = Math.cos(b) * Math.sin(l) * Math.cos(eps) - Math.sin(b) * Math.sin(eps);
  var z = Math.cos(b) * Math.sin(l) * Math.sin(eps) + Math.sin(b) * Math.cos(eps);
  var raDeg = Math.atan2(y, x) / R;
  var dec   = Math.asin(z) / R;
  var gst   = gstHours(date) * 15;
  return { lon: wrapLon(raDeg - gst), lat: dec };
}

/** Раху — восходящий узел, Кету — нисходящий (средние). */
function nodeSubpoints(date) {
  var om = meanNodeLon(date);
  return {
    om:   om,
    rahu: eclipticToSubpoint(om, 0, date),
    ketu: eclipticToSubpoint(om + 180, 0, date)
  };
}

/** Орбита Луны (большой круг, наклон MOON_INCL к эклиптике) как массив [lon,lat]. */
function moonOrbitLine(date) {
  var R = Math.PI / 180;
  var om = meanNodeLon(date);
  var inc = MOON_INCL * R;
  var out = [];
  for (var u = 0; u <= 360; u += 2) {
    var ur = u * R;
    var lam = om + Math.atan2(Math.cos(inc) * Math.sin(ur), Math.cos(ur)) / R;
    var beta = Math.asin(Math.sin(inc) * Math.sin(ur)) / R;
    var p = eclipticToSubpoint(lam, beta, date);
    out.push([p.lon, p.lat]);
  }
  return out;
}

/**
 * Возвращает true если хотя бы один астро-слой включён.
 */
function astroAnyOn() {
  return state.astro.showSun    || state.astro.showNight  ||
         state.astro.showMoon   || state.astro.showPlanets ||
         state.astro.showStars  || state.astro.showIss  ||  // v5.8.0
         state.astro.showMilkyWay ||                        // v5.9.0
         state.astro.showZodiac   || state.showEcliptic ||  // v6.0.0
         state.astro.showShadow   || state.astro.showNodes ||  // v6.6.0
         state.observer.on || state.showRings;     // v7.1.5                                   // v6.8.0
}

/**
 * Показывает/скрывает панель управления временем.
 */
function updateAstroTimePanel() {
  var el = document.getElementById('astro-time');
  if (el) el.style.display = astroAnyOn() ? 'block' : 'none';
  if (!astroAnyOn()) astroPause();
}
