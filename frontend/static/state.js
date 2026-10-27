/**
 * Файл    : frontend/static/state.js
 * Версия  : 6.7.0
 * Модуль  : Глобальное состояние приложения
 *
 * Изменения 6.4.0:
 *   - state.astro.coordsOn — { Sun, Moon, Iss, Mercury … Neptune: bool }:
 *       у каких тел рисовать подпись координат субточки
 *       (Солнце, Луна, МКС — по умолчанию да, как раньше; планеты — нет)
 *
 * Изменения 6.2.0:
 *   - state.astro.planetsOn — { Mercury:true, …, Neptune:true }: какие планеты
 *       показывать, когда включён общий чекбокс «Планеты» (default — все)
 *
 * Изменения 6.1.0:
 *   - state.astro.zodiacStars — показывать звёзды и фигуры созвездий (default true)
 *   - state.zodiac.stars — данные из ZODIAC_STARS_URL (null, пока не загружены
 *       или если файла нет)
 *
 * Изменения 6.0.0:
 *   - state.showEquator / showTropics / showEcliptic — линии карты
 *       (в группе чекбоксов карты, рядом с сеткой)
 *   - state.astro.showZodiac       — границы созвездий зодиака
 *   - state.astro.zodiacHighlight  — подсветка созвездия, в котором
 *       находится показанное тело (Солнце, Луна, планеты), default true
 *   - state.astro.showOphiuchus    — 13-е созвездие, default false
 *   - state.zodiac   — { data, loading, key, centers }:
 *       data    — GeoJSON из ZODIAC_URL (ленивая загрузка)
 *       centers — { id: [lon, lat] } центроиды для подписей
 *   - state.ecliptic — { key } кеш-ключ отрисовки эклиптики
 *   - state.skyFrame — { key, proj, path } общая «небесная» проекция
 *       (повёрнута на GST), её делят Млечный Путь, зодиак и эклиптика
 *
 * Изменения 5.9.0:
 *   - state.astro.showMilkyWay — флаг видимости Млечного Пути (default false)
 *   - state.milkyway — { data, loading, key }:
 *       data    — GeoJSON из MILKYWAY_URL (null пока не загружен)
 *       loading — true во время загрузки (защита от двойного запроса)
 *       key     — кеш-ключ последней отрисовки (renderMilkyWay пропускает
 *                 перерисовку, если центр/время/проекция не менялись,
 *                 в том числе при зуме)
 *
 * Изменения 5.8.0:
 *   - state.astro.showIss   — флаг видимости маркера МКС (default false)
 *   - state.astro.issSpeed  — множитель скорости анимации МКС (default 1)
 *   - state.astro.iss       — объект TLE/satrec для satellite.js:
 *       { tle: null, satrec: null }
 *       Заполняется в loadIssTle() (astro.js) при старте.
 *   - state.astro.trails.iss — расширен:
 *       enabled: false   — чекбокс UI
 *       minutes: 90      — слайдер 1..525960 (1 год в минутах)
 *       history: []      — [[lon,lat], ...], шаг 1 мин при анимации
 *       maxPoints = minutes (одна точка на минуту)
 *
 * Изменения 5.7.0:
 *   - state.astro.trails.planets — хвосты планет:
 *       enabled, days, history (объект { 'Mercury': [[lon,lat],...], ... })
 *   - state.astro.trails.moon.days — комментарий слайдера обновлён на 1..366
 *
 * Изменения 5.6.0:
 *   - state.astro.trails — настройки и история хвостов объектов
 *
 * Содержит: единственный объект state со всеми полями.
 * Не содержит: логики, DOM-операций, вычислений.
 * Зависит от: config.js (должен быть загружен раньше).
 * Загружается: вторым, после config.js.
 */

'use strict';

var state = {
  /* ── Проекция ──────────────────────────────────────────── */
  lat: 90,          // широта центра карты
  lon: 0,           // долгота центра карты

  /* ── Слои карты ────────────────────────────────────────── */
  showGrid:   true,
  showLabels: false,
  showCities: false,   // v7.1.2: по умолчанию выкл.
  showRoutes: false,  // ✈ маршруты самолётов
  showEquator:  false,  // v6.0.0 — экватор (широта 0°)
  showTropics:  false,  // v6.0.0 — тропики (широта ±TROPIC_LAT)
  showEcliptic: false,  // v6.0.0 — эклиптика (зависит от времени)
  projMode: 'ae',       // v7.2.0 — 'ae' | 'shilova-r' | 'shilova-l'
  showTimezones: false, // v6.5.0 — часовые пояса
  showTzLabels: false,  // v6.7.1 — подписи смещений на карте (по умолчанию выкл.)
  showTzDial: false,    // v6.7.1 — циферблат по кругу диска (отсчёт от Гринвича)
  tz: { data: null, loading: false, key: '', offKey: null, offSig: '', sigGroups: '', groups: [], drawn: false },   // v6.7.0

  /* ── Данные ────────────────────────────────────────────── */
  land:    null,      // GeoJSON суши (загружается async)
  borders: null,      // GeoJSON границ (загружается async)

  /* ── Млечный Путь (v5.9.0) — грузится лениво при первом включении ── */
  milkyway: {
    data:    null,    // GeoJSON изофот (MILKYWAY_URL)
    loading: false,   // идёт загрузка
    key:     null,    // кеш-ключ последней отрисовки
  },

  /* ── Зодиак (v6.0.0) — грузится лениво при первом включении ── */
  zodiac: {
    data:    null,    // GeoJSON границ 13 созвездий (ZODIAC_URL)
    loading: false,
    key:     null,    // кеш-ключ последней отрисовки полигонов
    centers: null,    // { 'Ari': [lon, lat], ... } — центроиды для подписей
    stars:   null,    // v6.1.0 — { stars:{id:[[ra,dec,mag]]}, lines:{id:[[[ra,dec]]]} }
  },

  /* ── Эклиптика (v6.0.0) ────────────────────────────────── */
  ecliptic: { key: null },

  /* ── Небесная проекция (v6.0.0) — кеш, см. skyFrame() в render.js ── */
  skyFrame: { key: null, proj: null, path: null },

  /* ── D3 объекты ────────────────────────────────────────── */
  svg:        null,
  projection: null,
  path:       null,
  zoom:       null,
  width:      0,
  height:     0,

  /* ── Точки пользователя ────────────────────────────────── */
  points: [],       // [{ name, lat, lon } | { names:{ru,en,de}, lat, lon }]

  /* ── Линейка ───────────────────────────────────────────── */
  showRings: false, ringFillSun: true, ringFillMoon: true,   // v7.1.5 — круги видимости отдельно от наблюдателя
  showSat: false, showSatNight: true, showSatClouds: false,   // v6.9.0 — вид из космоса
  showPhase: false, realVis: false,   // v7.1.3
  showSeasonMk: false, showTwilight: false,   // v7.1.1
  rulerSnapTrail: true,   // v7.2.4 — линейка магнитится к пересечениям хвостов с меридианами
  eclipse: { sel: null, showArea: true, showTrack: false },   // v7.1.0
  transit: { sel: null, showArea: true, showTrack: true, showDisc: true },   // v7.2.1
  observer: { on:false, lat:50.45, lon:30.52, pick:false },   // v6.8.0

  ruler: {
    active:     false,
    points:     [],    // 0, 1 или 2 элемента: [[lon,lat], ...]
    distSphere: null,  // км по сфере
    distAE:     null,  // км по AE-проекции
  },

  /* ── Астрономия ────────────────────────────────────────── */
  astro: {
    showSun:     true,    // v7.1.2: по умолчанию вкл.
    showNight:   true,    // v7.1.2
    showMoon:    true,    // v7.1.2
    showPlanets: false,
    coordsOn: { Sun:true, Moon:true, Iss:true, Mercury:false, Venus:false, Mars:false,
                Jupiter:false, Saturn:false, Uranus:false, Neptune:false,
                Shadow:false, Rahu:false, Ketu:false },  // v6.4.0 (+ v7.0.0)
    planetsOn: { Mercury:true, Venus:true, Mars:true, Jupiter:true,
                 Saturn:true, Uranus:true, Neptune:true },  // v6.2.0
    showStars:   false,
    showIss:     false,   // v5.8.0 — маркер субточки МКС
    showMilkyWay: false,  // v5.9.0 — Млечный Путь
    showZodiac:   false,  // v6.0.0 — границы созвездий зодиака
    showShadow:   false,  // v6.6.0 — тень Земли (умбра / пенумбра)
    showNodes:    false,  // v6.6.0 — узлы Луны (Раху / Кету) и орбита Луны
    zodiacHighlight: true,   // v6.0.0 — подсвечивать созвездие Солнца/Луны/планет
    showOphiuchus:   false,  // v6.0.0 — 13-е созвездие (Змееносец)
    zodiacStars:     true,   // v6.1.0 — звёзды и фигуры созвездий зодиака

    date:        new Date(),   // текущий момент времени для расчётов
    playing:     false,
    playMode:    null,         // null | 'speed' | 'day' | 'sidereal'
    timer:       null,         // id от setInterval

    speed:       1,            // v6.5.0 — множитель скорости режима 'speed' (×1 = реальное время)
                               // 1 = реальная скорость (1 мин/кадр)
                               // 10, 20, 100 = ускорение

    /* ── МКС — TLE и satrec (v5.8.0) ──────────────────────
     * Заполняется функцией loadIssTle() из astro.js при старте.
     * tle:    [line1, line2] — две строки TLE после парсинга ответа CelesTrak.
     * satrec: объект satellite.js после twoline2satrec(line1, line2).
     * Пока не загружено — оба поля null, issSubpoint() вернёт null.
     * ─────────────────────────────────────────────────────── */
    iss: {
      tle:    null,   // [line1, line2]
      satrec: null,   // результат satellite.twoline2satrec()
    },

    /* ── Хвосты объектов (v5.6.0) ──────────────────────────
     *
     * Архитектура Data-Driven:
     *   При каждом вызове setAstroDate() новая точка [lon, lat]
     *   добавляется в .history. Если history.length > maxPoints —
     *   удаляется самый старый элемент (shift).
     *   Рендер читает history и рисует полилинию с градиентом.
     *
     * history НЕ сбрасывается при: смене центра, зуме.
     * history СБРАСЫВАЕТСЯ при: ручном изменении даты.
     *
     * Единица хранения: [lon, lat] — GeoJSON-порядок.
     * ───────────────────────────────────────────────────── */
    trailBudget: 0,       // v7.2.3: текущий потолок точек бессрочных хвостов (0 = TRAIL_UNLIM_MAX; снижается на медленных устройствах)

    trails: {

      /* Солнце — длина в днях, шаг 1 час */
      sun: {
        enabled:   false,   // чекбокс "☀ хвост"
        days:      30,      // слайдер 1..365
        unlimited: false,   // v7.2.3 — «∞»: без ограничения по времени (до TRAIL_UNLIM_MAX точек)
        // maxPoints = days * 24 — вычисляется динамически
        history:   [],      // [[lon, lat], ...]
      },

      /* Луна — длина в днях, шаг 1 час */
      moon: {
        enabled:   false,   // чекбокс "🌙 хвост"
        days:      7,       // слайдер 1..366 (v5.7.0: расширен с 30 до 366)
        unlimited: false,   // v7.2.3 — «∞»: без ограничения по времени (до TRAIL_UNLIM_MAX точек)
        history:   [],
      },

      /* Планеты — длина в днях, шаг 1 час (v5.7.0).
       * history — объект { key: [[lon,lat],...], ... },
       * где key = pl.key из PLANETS ('Mercury', 'Venus', ...).
       * Инициализируется лениво в appendPlanetTrailPoint при первом вызове. */
      planets: {
        enabled:   false,   // один чекбокс для всех планет
        days:      90,      // слайдер 1..366
        unlimited: false,   // v7.2.3 — «∞»: без ограничения по времени (до TRAIL_UNLIM_MAX точек)
        // maxPoints = days * 24 — вычисляется динамически
        history:   {},      // { 'Mercury': [[lon,lat],...], ... }
      },

      /* Звёзды — длина в часах, шаг 1 час (= 1 ANIM_STEP.hour).
       * history — массив массивов, по одному на каждую звезду
       * из STARS. Индекс в history совпадает с индексом в STARS. */
      stars: {
        enabled:   false,   // один чекбокс для всех звёзд
        hours:     24,      // слайдер 1..72
        history:   [],      // [ [[lon,lat],...], [[lon,lat],...], ... ]
                            // history[i] — история i-й звезды
      },

      /* МКС — длина в минутах, шаг 1 мин (v5.8.0).
       * maxPoints = minutes (одна точка на минуту анимации).
       * Орбита ~92 мин → 92 точки = один полный виток.
       * Слайдер 1..525960 = 1 мин..365 суток.
       * Запись идёт только при анимации режима 'iss'.           */
      iss: {
        enabled:   false,   // чекбокс "🛰 хвост"
        minutes:   90,      // слайдер 1..525960
        // maxPoints = minutes — вычисляется динамически
        history:   [],      // [[lon, lat], ...]
      },
    },
  },

  /* ── Язык ──────────────────────────────────────────────── */
  lang: localStorage.getItem('femap_lang') || 'ru',
};
