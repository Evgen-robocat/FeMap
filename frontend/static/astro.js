/**
 * Файл    : frontend/static/astro.js
 * Версия  : 5.8.0
 * Модуль  : Астрономические вычисления и управление временем
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
    var body     = Astronomy.Body[bodyKey];
    if (body === undefined) return null;
    var aberr    = (bodyKey === 'Sun');
    var observer = new Astronomy.Observer(0, 0, 0);
    var eq       = Astronomy.Equator(body, date, observer, true, aberr);
    var gstDeg   = Astronomy.SiderealTime(date) * 15;
    var ghaDeg   = ((gstDeg - eq.ra * 15) % 360 + 360) % 360;
    var lon      = -ghaDeg;
    if (lon < -180) lon += 360;
    if (lon >  180) lon -= 360;
    return { lat: eq.dec, lon: lon };
  } catch(e) {
    console.error('[astro] bodySubpoint "' + bodyKey + '" ошибка:', e.message || e);
    return null;
  }
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
 * Субточка звезды по J2000 координатам.
 * @param {number} ra_hours
 * @param {number} dec
 * @param {Date}   date
 * @returns {{ lat: number, lon: number }}
 */
function starSubpoint(ra_hours, dec, date) {
  var gstHours;
  if (astroOk()) {
    gstHours = Astronomy.SiderealTime(date);
  } else {
    var JD       = date.getTime() / 86400000 + 2440587.5;
    var n        = JD - 2451545.0;
    var UT       = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    gstHours     = ((6.697375 + 0.0657098242 * n + UT * 1.00273791) % 24 + 24) % 24;
  }
  var lon = (ra_hours - gstHours) * 15;
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
 * Добавляет точку [lon, lat] в history объекта (Солнце или Луна).
 * @param {'sun'|'moon'} key
 * @param {number} lon
 * @param {number} lat
 */
function appendTrailPoint(key, lon, lat) {
  var trail = state.astro.trails[key];
  if (!trail) return;
  var maxPts;
  if (key === 'sun')  maxPts = trail.days * 24;
  if (key === 'moon') maxPts = trail.days * 24;
  trail.history.push([lon, lat]);
  if (trail.history.length > maxPts) trail.history.shift();
}

/**
 * Добавляет точку в историю конкретной звезды.
 * @param {number} idx
 * @param {number} lon
 * @param {number} lat
 */
function appendStarTrailPoint(idx, lon, lat) {
  var trail = state.astro.trails.stars;
  if (!trail.history[idx]) return;
  var maxPts = trail.hours;
  trail.history[idx].push([lon, lat]);
  if (trail.history[idx].length > maxPts) trail.history[idx].shift();
}

/**
 * Добавляет точку в историю конкретной планеты. (v5.7.0)
 * @param {string} key
 * @param {number} lon
 * @param {number} lat
 */
function appendPlanetTrailPoint(key, lon, lat) {
  var trail = state.astro.trails.planets;
  if (!trail.history[key]) trail.history[key] = [];
  var maxPts = trail.days * 24;
  trail.history[key].push([lon, lat]);
  if (trail.history[key].length > maxPts) trail.history[key].shift();
}

/**
 * Добавляет точку в историю хвоста МКС. (v5.8.0)
 * maxPoints = trails.iss.minutes (шаг 1 мин → 1 точка на минуту).
 * @param {number} lon
 * @param {number} lat
 */
function appendIssTrailPoint(lon, lat) {
  var trail = state.astro.trails.iss;
  var maxPts = trail.minutes; // одна точка на минуту → maxPoints = minutes
  trail.history.push([lon, lat]);
  if (trail.history.length > maxPts) trail.history.shift();
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
 * @param {'hour'|'day'|'sidereal'|'iss'} mode
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

  state.astro.timer = setInterval(function() {
    var stepMs;
    if (state.astro.playMode === 'iss') {
      /* Шаг пересчитывается каждый тик — позволяет менять скорость на ходу */
      stepMs = 60 * 1000 * state.astro.issSpeed;
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

/**
 * Обновляет внешний вид кнопок Play/Pause, подсказку режима,
 * видимость блока iss-speed-btns и кнопок скорости. (v5.8.0)
 */
function updatePlayButtons() {
  var lang = state.lang;

  /* ── Кнопки hour / day / sidereal ──────────────────────── */
  var btnIds = {
    hour:     'btn-play-hour',
    day:      'btn-play-day',
    sidereal: 'btn-play-sidereal',
    iss:      'btn-play-iss',
  };
  var labels = {
    hour:     { ru:'▶ 1ч',    en:'▶ 1h',    de:'▶ 1h'    },
    day:      { ru:'▶ 24ч',   en:'▶ 24h',   de:'▶ 24h'   },
    sidereal: { ru:'▶ ☆сут',  en:'▶ ☆sid',  de:'▶ ☆sid'  },
    iss:      { ru:'▶ МКС',   en:'▶ ISS',   de:'▶ ISS'   },
  };
  var pauseLabels = {
    hour:     { ru:'⏸ 1ч',    en:'⏸ 1h',    de:'⏸ 1h'    },
    day:      { ru:'⏸ 24ч',   en:'⏸ 24h',   de:'⏸ 24h'   },
    sidereal: { ru:'⏸ ☆сут',  en:'⏸ ☆sid',  de:'⏸ ☆sid'  },
    iss:      { ru:'⏸ МКС',   en:'⏸ ISS',   de:'⏸ ISS'   },
  };

  ['hour','day','sidereal','iss'].forEach(function(m) {
    var btn = document.getElementById(btnIds[m]);
    if (!btn) return;
    var active = state.astro.playing && state.astro.playMode === m;
    btn.textContent       = active ? pauseLabels[m][lang] : labels[m][lang];
    btn.style.background  = active ? '#1a5a8a' : '';
    btn.style.borderColor = active ? '#3ab4ff' : '';
  });

  /* ── Подсказка режима ─────────────────────────────────── */
  var hint = document.getElementById('astro-mode-hint');
  if (hint) {
    if (state.astro.playing && state.astro.playMode) {
      var modeKeyMap = {
        hour:     'modeHour',
        day:      'modeDay',
        sidereal: 'modeSidereal',
        iss:      'modeIss',
      };
      hint.textContent = LANG[lang][modeKeyMap[state.astro.playMode]] || '';
    } else {
      hint.textContent = '';
    }
  }

  /* ── Блок кнопок скорости МКС — виден только при mode=iss ── */
  var speedBtns = document.getElementById('iss-speed-btns');
  if (speedBtns) {
    var issActive = state.astro.playing && state.astro.playMode === 'iss';
    speedBtns.style.display = issActive ? 'flex' : 'none';
  }

  /* ── Подсветка активной кнопки скорости и синхронизация слайдера ── */
  updateIssSpeedButtons();
}

/**
 * Подсвечивает кнопку скорости МКС, соответствующую state.astro.issSpeed,
 * и синхронизирует слайдер slider-iss-speed. (v5.8.0)
 */
function updateIssSpeedButtons() {
  ISS_SPEED_OPTIONS.forEach(function(s) {
    var btn = document.getElementById('btn-iss-speed-' + s);
    if (!btn) return;
    var active = (state.astro.issSpeed === s);
    btn.style.background  = active ? '#1a5a8a' : '';
    btn.style.borderColor = active ? '#00ff88' : '';
    btn.style.color       = active ? '#00ff88' : '';
  });
  var slider = document.getElementById('slider-iss-speed');
  if (slider) {
    /* Слайдер min=1 max=100; значения выше 100 (нет в ISS_SPEED_OPTIONS) не страшны */
    slider.value = Math.min(100, state.astro.issSpeed);
  }
}

/**
 * Возвращает true если хотя бы один астро-слой включён.
 */
function astroAnyOn() {
  return state.astro.showSun    || state.astro.showNight  ||
         state.astro.showMoon   || state.astro.showPlanets ||
         state.astro.showStars  || state.astro.showIss;    // v5.8.0
}

/**
 * Показывает/скрывает панель управления временем.
 */
function updateAstroTimePanel() {
  var el = document.getElementById('astro-time');
  if (el) el.style.display = astroAnyOn() ? 'block' : 'none';
  if (!astroAnyOn()) astroPause();
}
