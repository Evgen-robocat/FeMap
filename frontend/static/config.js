/**
 * Файл    : frontend/static/config.js
 * Версия  : 6.4.2
 *
 * Изменения 6.4.2:
 *   - ANALYTICS_URL указывает на Worker статистики (femap-stats.femap-lab.workers.dev)
 *
 * Изменения 6.4.1:
 *   - borders.geojson: убраны две «спорные» линии вокруг Крыма (NE_ID 1746708787,
 *       1746708837); BORDERS_URL с ?v=641 против кэша
 * Модуль  : Константы и статические данные
 *
 * Изменения 6.4.0:
 *   - VERSION → '6.4.2'
 *   - LANG (ru/en/de): все надписи панели (слои, кнопки времени, заголовки),
 *       календарь и затмения (dateLabel, ecl*), координаты тел (coordsTitle,
 *       bodySun/Moon/Iss, latShort/lonShort), ошибки загрузки (err*)
 *   - TRAIL_SMOOTH_STEP, TRAIL_SMOOTH_MAX_POINTS — сглаживание хвостов
 *
 * Изменения 6.3.0:
 *   - VERSION → '6.3.0'
 *   - ANALYTICS_URL — адрес своего счётчика (Cloudflare Worker, см. analytics/);
 *     пусто — статистика выключена, ничего не отправляется
 *
 * Изменения 6.2.0:
 *   - VERSION → '6.2.0' (каждая планета — отдельный переключатель, см. state.js)
 *
 * Изменения 6.1.0:
 *   - VERSION → '6.1.0'
 *   - ZODIAC_STARS_URL, ZODIAC_STARS_STYLE — звёзды (до 5.0 m) и линии
 *     фигур созвездий зодиака (d3-celestial, BSD-3); грузятся вместе с зодиаком
 *   - LANG: zodiacStarsChk — чекбокс «звёзды и фигуры созвездий»
 *   - PLANET_LABEL_STYLE — подписи планет в стиле подписей тропиков
 *
 * Изменения 6.0.0:
 *   - VERSION → '6.0.0'
 *   - ZODIAC_URL, ZODIAC, ZODIAC_BODIES, ZODIAC_STYLE — созвездия зодиака
 *     с границами IAU (13 штук, Змееносец — отдельным переключателем)
 *   - OBLIQUITY, TROPIC_LAT, LINES_STYLE — эклиптика, тропики, экватор
 *   - LANG: equatorChk, tropicsChk, eclipticChk (чекбоксы),
 *           equatorName, tropicCancer, tropicCapricorn (подписи линий),
 *           zodiacOutside (Солнце/Луна/планета вне 13 созвездий)
 *
 * Изменения 5.9.2:
 *   - VERSION → '5.9.2'
 *   - MILKYWAY_STYLE — фиолетовый #9b4dff, прозрачности
 *     [0.25, 0.30, 0.38, 0.46, 0.55]: контрастен и на синей воде, и на жёлтой суше
 *
 * Изменения 5.9.1:
 *   - VERSION → '5.9.1'
 *   - MILKYWAY_STYLE — заливка ярче: цвет #ffffff, прозрачности
 *     [0.18, 0.22, 0.28, 0.34, 0.42] (было [0.10 … 0.22])
 *
 * Изменения 5.9.0:
 *   - VERSION → '5.9.0'
 *   - MILKYWAY_URL   — GeoJSON с изофотами Млечного Пути (d3-celestial, BSD-3)
 *   - MILKYWAY_STYLE — цвет и прозрачность пяти вложенных контуров ol1..ol5
 *
 * Изменения 5.8.0:
 *   - VERSION → '5.8.0'
 *   - ISS_TLE_URL      — URL для загрузки актуального TLE МКС с CelesTrak
 *   - ISS_TLE_FALLBACK — встроенный TLE-фоллбэк (обновить перед коммитом!)
 *   - ISS_SPEED_OPTIONS — кнопки множителя скорости: [1, 10, 20, 100]
 *   - TRAIL_BANDS.iss: 12 — полос градиента для хвоста МКС
 *   - LANG: добавлены ключи trailIssChk ('🛰 хвост') и trailMinutes ('мин')
 *
 * Изменения 5.7.0:
 *   - LANG: добавлен ключ trailPlanetsChk (ru/en/de) для UI хвостов планет
 *   - TRAIL_BANDS.planets: 15 — полос для хвостов планет
 *
 * Изменения 5.6.0:
 *   - LANG: добавлены ключи trailsTitle, trailSunChk, trailMoonChk,
 *           trailStarsChk, trailDays, trailHours для UI хвостов
 *   - TRAIL_BANDS: число полос градиентной прозрачности хвоста
 *
 * Содержит: VERSION, COLORS, PLANETS, STARS, STAR_LINES,
 *           ROUTES, LANG, CITIES, ISS_TLE_*, ISS_SPEED_OPTIONS и прочие конфиги.
 *
 * Не содержит: логики, DOM-операций, состояния.
 * Загружается: первым, до всех остальных модулей.
 */

'use strict';

var VERSION = window.FEMAP_VERSION || '6.4.2';

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
   ЗВЁЗДЫ — J2000 координаты (RA в часах, Dec в градусах)
═══════════════════════════════════════════════════════════════ */
var STARS = [
  // ── Полярная звезда (α UMi) ──────────────────────────────
  { ra: 2.5303, dec: 89.26, r:3, color:'#f8f7ff',
    name:{ru:'Полярная', en:'Polaris', de:'Polarstern'} },
  // ── Ковш Большой Медведицы (α..η UMa) ── индексы 1..7 ───
  { ra:11.0621, dec: 61.75, r:3, color:'#ffd2a1', name:{ru:'Дубхе',    en:'Dubhe',    de:'Dubhe'   } },
  { ra:11.0307, dec: 56.38, r:2, color:'#cad7ff', name:{ru:'Мерак',    en:'Merak',    de:'Merak'   } },
  { ra:11.8972, dec: 53.70, r:2, color:'#cad7ff', name:{ru:'Фекда',    en:'Phecda',   de:'Phecda'  } },
  { ra:12.2571, dec: 57.03, r:2, color:'#cad7ff', name:{ru:'Мегрец',   en:'Megrez',   de:'Megrez'  } },
  { ra:12.9005, dec: 55.96, r:3, color:'#cad7ff', name:{ru:'Алиот',    en:'Alioth',   de:'Alioth'  } },
  { ra:13.3988, dec: 54.93, r:2, color:'#cad7ff', name:{ru:'Мицар',    en:'Mizar',    de:'Mizar'   } },
  { ra:13.7923, dec: 49.31, r:3, color:'#aabfff', name:{ru:'Алькаид',  en:'Alkaid',   de:'Alkaid'  } },
  // ── Вега (α Lyr) ── индекс 8
  { ra:18.6156, dec: 38.78, r:4, color:'#cad7ff', name:{ru:'Вега',     en:'Vega',     de:'Wega'    } },
  // ── Арктур (α Boo) ── индекс 9
  { ra:14.2610, dec: 19.18, r:4, color:'#ffd2a1', name:{ru:'Арктур',   en:'Arcturus', de:'Arktur'  } },
  // ── Сириус (α CMa) ── индекс 10
  { ra: 6.7525, dec:-16.72, r:5, color:'#cad7ff', name:{ru:'Сириус',   en:'Sirius',   de:'Sirius'  } },
  // ── Орион ── индексы 11..16
  { ra: 5.2423, dec: -8.20, r:4, color:'#aabfff', name:{ru:'Ригель',       en:'Rigel',      de:'Rigel'     } },
  { ra: 5.9195, dec:  7.41, r:4, color:'#ffcc6f', name:{ru:'Бетельгейзе',  en:'Betelgeuse', de:'Beteigeuze'} },
  { ra: 5.4189, dec:  6.34, r:3, color:'#aabfff', name:{ru:'Беллатрикс',   en:'Bellatrix',  de:'Bellatrix' } },
  { ra: 5.5334, dec: -0.30, r:2, color:'#9bb0ff', name:{ru:'Минтака',      en:'Mintaka',    de:'Mintaka'   } },
  { ra: 5.6035, dec: -1.20, r:3, color:'#aabfff', name:{ru:'Алнилам',      en:'Alnilam',    de:'Alnilam'   } },
  { ra: 5.6793, dec: -1.94, r:3, color:'#9bb0ff', name:{ru:'Альнитак',     en:'Alnitak',    de:'Alnitak'   } },
  // ── Южный Крест ── индексы 17..20
  { ra:12.4433, dec:-63.09, r:4, color:'#aabfff', name:{ru:'Акрукс',   en:'Acrux',    de:'Acrux'  } },
  { ra:12.7954, dec:-59.69, r:3, color:'#aabfff', name:{ru:'Мимоза',   en:'Mimosa',   de:'Mimosa' } },
  { ra:12.5194, dec:-57.11, r:3, color:'#ffcc6f', name:{ru:'Гакрукс',  en:'Gacrux',   de:'Gacrux' } },
  { ra:12.2524, dec:-58.75, r:2, color:'#aabfff', name:{ru:'δ Кру',    en:'δ Cru',    de:'δ Cru'  } },
  // ── Канопус (α Car) ── индекс 21
  { ra: 6.3992, dec:-52.70, r:5, color:'#f8f7ff', name:{ru:'Канопус',  en:'Canopus',  de:'Kanopus'  } },
  // ── Ахернар (α Eri) ── индекс 22
  { ra: 1.6285, dec:-57.24, r:4, color:'#aabfff', name:{ru:'Ахернар',  en:'Achernar', de:'Achernar' } },
  // ── α Центавра ── индекс 23
  { ra:14.6601, dec:-60.83, r:4, color:'#fff4ea', name:{ru:'α Центавра', en:'α Centauri', de:'α Zentauri'} },
  // ── β Центавра (Хадар) ── индекс 24
  { ra:14.0637, dec:-60.37, r:4, color:'#aabfff', name:{ru:'Хадар',    en:'Hadar',    de:'Hadar'    } },
];

/* Линии созвездий: пары индексов из массива STARS */
var STAR_LINES = [
  [1,2],[2,3],[3,4],[4,1],   // квадрат ковша
  [4,5],[5,6],[6,7],          // ручка ковша
  [14,15],[15,16],            // пояс Ориона
  [13,12],[13,14],[12,16],    // плечи/пояс
  [11,14],                    // Ригель–Минтака
  [19,17],[20,18],            // Южный Крест
];

/* ═══════════════════════════════════════════════════════════════
   МАРШРУТЫ САМОЛЁТОВ
   from/to: [lon, lat] — порядок GeoJSON.
   Дуги великого круга строятся автоматически через d3.geoPath.
   Дебатная ценность: маршруты южного полушария на AE-карте
   выглядят аномально длинными — видно искажение проекции.
═══════════════════════════════════════════════════════════════ */
var ROUTES = [
  // ── Южное полушарие ─ главный аргумент в дебатах ────────────
  { id:'SYD-SCL', color:'#ff6b35',
    label:  {ru:'Сидней → Сантьяго',       en:'Sydney → Santiago',       de:'Sydney → Santiago'      },
    airline:{ru:'Qantas/LATAM QF27',        en:'Qantas/LATAM QF27',       de:'Qantas/LATAM QF27'      },
    from:[151.21,-33.87], to:[-70.67,-33.46] },
  { id:'SYD-JNB', color:'#ff8c42',
    label:  {ru:'Сидней → Йоханнесбург',   en:'Sydney → Johannesburg',   de:'Sydney → Johannesburg'  },
    airline:{ru:'Qantas QF63',              en:'Qantas QF63',             de:'Qantas QF63'             },
    from:[151.21,-33.87], to:[18.42,-26.20] },
  { id:'JNB-PER', color:'#ffaa00',
    label:  {ru:'Йоханнесбург → Перт',     en:'Johannesburg → Perth',    de:'Johannesburg → Perth'   },
    airline:{ru:'South African Airways',    en:'South African Airways',   de:'South African Airways'  },
    from:[18.42,-26.20], to:[115.86,-31.95] },
  { id:'GRU-JNB', color:'#ffcc00',
    label:  {ru:'Сан-Паулу → Йоханнесбург',en:'São Paulo → Johannesburg',de:'São Paulo → Johannesburg'},
    airline:{ru:'South African Airways SA221',en:'South African Airways SA221',de:'South African Airways SA221'},
    from:[-46.63,-23.55], to:[18.42,-26.20] },
  { id:'CPT-EZE', color:'#ff3377',
    label:  {ru:'Кейптаун → Буэнос-Айрес', en:'Cape Town → Buenos Aires',de:'Kapstadt → Buenos Aires'},
    airline:{ru:'South African Airways SA225',en:'South African Airways SA225',de:'South African Airways SA225'},
    from:[18.60,-33.97], to:[-58.37,-34.61] },
  { id:'AKL-EZE', color:'#ff1155',
    label:  {ru:'Окленд → Буэнос-Айрес',   en:'Auckland → Buenos Aires', de:'Auckland → Buenos Aires'},
    airline:{ru:'LATAM/Air New Zealand LA800',en:'LATAM/Air New Zealand LA800',de:'LATAM/Air New Zealand LA800'},
    from:[174.79,-36.87], to:[-58.37,-34.61] },
  { id:'JNB-SYD', color:'#ef9a9a',
    label:  {ru:'Йоханнесбург → Сидней',   en:'Johannesburg → Sydney',   de:'Johannesburg → Sydney'  },
    airline:{ru:'Qantas QF64',              en:'Qantas QF64',             de:'Qantas QF64'             },
    from:[18.42,-26.20], to:[151.21,-33.87] },
  // ── Транстихоокеанские — идут через Аляску/Сибирь ───────────
  { id:'NRT-ORD', color:'#4fc3f7',
    label:  {ru:'Токио → Чикаго',          en:'Tokyo → Chicago',         de:'Tokio → Chicago'        },
    airline:{ru:'All Nippon Airways NH9',   en:'All Nippon Airways NH9',  de:'All Nippon Airways NH9' },
    from:[139.69,35.68], to:[-87.91,41.98] },
  { id:'AKL-LAX', color:'#0288d1',
    label:  {ru:'Окленд → Лос-Анджелес',   en:'Auckland → Los Angeles',  de:'Auckland → Los Angeles' },
    airline:{ru:'Air New Zealand NZ5',      en:'Air New Zealand NZ5',     de:'Air New Zealand NZ5'    },
    from:[174.79,-36.87], to:[-118.24,34.05] },
  { id:'SYD-DFW', color:'#ff7043',
    label:  {ru:'Сидней → Даллас',         en:'Sydney → Dallas',         de:'Sydney → Dallas'        },
    airline:{ru:'Qantas QF8',              en:'Qantas QF8',              de:'Qantas QF8'             },
    from:[151.21,-33.87], to:[-97.04,32.90] },
  // ── Азия–Европа и трансатлантические ────────────────────────
  { id:'NRT-LHR', color:'#81d4fa',
    label:  {ru:'Токио → Лондон',          en:'Tokyo → London',          de:'Tokio → London'         },
    airline:{ru:'Japan Airlines JL43',      en:'Japan Airlines JL43',     de:'Japan Airlines JL43'    },
    from:[139.69,35.68], to:[-0.46,51.48] },
  { id:'LHR-LAX', color:'#a5d6a7',
    label:  {ru:'Лондон → Лос-Анджелес',   en:'London → Los Angeles',    de:'London → Los Angeles'   },
    airline:{ru:'British Airways BA269',    en:'British Airways BA269',   de:'British Airways BA269'  },
    from:[-0.46,51.48], to:[-118.24,34.05] },
  { id:'LHR-EZE', color:'#80cbc4',
    label:  {ru:'Лондон → Буэнос-Айрес',   en:'London → Buenos Aires',   de:'London → Buenos Aires'  },
    airline:{ru:'British Airways BA245',    en:'British Airways BA245',   de:'British Airways BA245'  },
    from:[-0.46,51.48], to:[-58.37,-34.61] },
  { id:'DXB-LAX', color:'#ffd54f',
    label:  {ru:'Дубай → Лос-Анджелес',    en:'Dubai → Los Angeles',     de:'Dubai → Los Angeles'    },
    airline:{ru:'Emirates EK215',           en:'Emirates EK215',          de:'Emirates EK215'         },
    from:[55.36,25.25], to:[-118.24,34.05] },
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
    routesChk:'✈ Маршруты рейсов',
    equatorChk:'Экватор', tropicsChk:'Тропики', eclipticChk:'Эклиптика',   // v6.0.0
    equatorName:'Экватор', tropicCancer:'Тропик Рака', tropicCapricorn:'Тропик Козерога',
    zodiacOutside:'вне зодиака',
    zodiacStarsChk:'звёзды и фигуры созвездий',
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
    modeHour:'суточная — шаг 1ч',
    modeDay:'годовая — шаг 24ч',
    modeSidereal:'звёздные сутки — шаг 23ч 56м 4с',
    modeIss:'МКС — шаг 1 мин × скорость',
    // ── Хвосты объектов (v5.6.0) ────────────────────────────
    trailsTitle:    'Хвосты объектов',
    trailSunChk:    '☀ хвост',
    trailMoonChk:   '🌙 хвост',
    trailStarsChk:  '✦ хвост',
    trailPlanetsChk:'🪐 хвост',   // v5.7.0
    trailIssChk:    '🛰 хвост',   // v5.8.0
    trailDays:      'дн',
    trailHours:     'ч',
    trailMinutes:   'мин',        // v5.8.0 — единица для хвоста МКС
    // ── v6.4.0: надписи панели, календарь, координаты, ошибки ───
    sunChk:'☀ Солнце', nightChk:'🌓 День / Ночь', moonChk:'🌙 Луна',
    planetsChk:'🪐 Планеты', issChk:'🛰 МКС', starsChk:'✦ Звёзды',
    milkywayChk:'🌌 Млечный Путь', zodiacChk:'♈ Созвездия зодиака',
    zodiacHlChk:'подсветка Солнца / Луны / планет', ophiuchusChk:'Змееносец (13-е)',
    yearLbl:'год', prevDay:'← День', nowBtn:'⊙ Сейчас', nextDay:'День →',
    speedLbl:'×скор',
    playHourTitle:'Суточная анимация: шаг 1 час',
    playDayTitle:'Годовая анимация: шаг 1 сутки',
    playSidTitle:'Звёздные сутки: шаг 23ч 56м 4с',
    playIssTitle:'МКС: шаг 1 мин × скорость',
    coordsTitle:'📍 Координаты тел',
    bodySun:'Солнце', bodyMoon:'Луна', bodyIss:'МКС',
    latShort:'Шир.', lonShort:'Долг.',
    dateLabel:'Дата и время (UTC)',
    eclSolar:'☀ след. затмение', eclLunar:'🌙 след. затмение',
    eclSolarName:'Солнечное затмение', eclLunarName:'Лунное затмение',
    eclTotal:'полное', eclAnnular:'кольцеобразное', eclPartial:'частное',
    eclPenumbral:'полутеневое', eclHybrid:'гибридное',
    eclNotFound:'Затмение не найдено', eclNeedLib:'Нужна библиотека astronomy-engine',
    errLoad:'Ошибка загрузки', errMilky:'Ошибка загрузки Млечного Пути',
    errZodiac:'Ошибка загрузки зодиака',
  },
  en: {
    latLabel:'Center Latitude', lonLabel:'Center Longitude',
    applyBtn:'▶ Apply Center',
    gridChk:'Grid 30°', labelsChk:'Coordinate Labels',
    citiesChk:'🏙 Cities & Labels', rulerChk:'📏 Distance Ruler',
    routesChk:'✈ Flight Routes',
    equatorChk:'Equator', tropicsChk:'Tropics', eclipticChk:'Ecliptic',   // v6.0.0
    equatorName:'Equator', tropicCancer:'Tropic of Cancer', tropicCapricorn:'Tropic of Capricorn',
    zodiacOutside:'outside zodiac',
    zodiacStarsChk:'stars and constellation figures',
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
    modeHour:'daily — step 1h',
    modeDay:'annual — step 24h',
    modeSidereal:'sidereal day — step 23h 56m 4s',
    modeIss:'ISS — step 1 min × speed',
    // ── Object Trails (v5.6.0) ───────────────────────────────
    trailsTitle:    'Object Trails',
    trailSunChk:    '☀ trail',
    trailMoonChk:   '🌙 trail',
    trailStarsChk:  '✦ trail',
    trailPlanetsChk:'🪐 trail',   // v5.7.0
    trailIssChk:    '🛰 trail',   // v5.8.0
    trailDays:      'days',
    trailHours:     'h',
    trailMinutes:   'min',        // v5.8.0
    // ── v6.4.0 ───────────────────────────────────────────────
    sunChk:'☀ Sun', nightChk:'🌓 Day / Night', moonChk:'🌙 Moon',
    planetsChk:'🪐 Planets', issChk:'🛰 ISS', starsChk:'✦ Stars',
    milkywayChk:'🌌 Milky Way', zodiacChk:'♈ Zodiac constellations',
    zodiacHlChk:'highlight Sun / Moon / planets', ophiuchusChk:'Ophiuchus (13th)',
    yearLbl:'year', prevDay:'← Day', nowBtn:'⊙ Now', nextDay:'Day →',
    speedLbl:'×speed',
    playHourTitle:'Daily animation: step 1 hour',
    playDayTitle:'Annual animation: step 1 day',
    playSidTitle:'Sidereal day: step 23h 56m 4s',
    playIssTitle:'ISS: step 1 min × speed',
    coordsTitle:'📍 Body coordinates',
    bodySun:'Sun', bodyMoon:'Moon', bodyIss:'ISS',
    latShort:'Lat', lonShort:'Lon',
    dateLabel:'Date and time (UTC)',
    eclSolar:'☀ next eclipse', eclLunar:'🌙 next eclipse',
    eclSolarName:'Solar eclipse', eclLunarName:'Lunar eclipse',
    eclTotal:'total', eclAnnular:'annular', eclPartial:'partial',
    eclPenumbral:'penumbral', eclHybrid:'hybrid',
    eclNotFound:'No eclipse found', eclNeedLib:'astronomy-engine library is required',
    errLoad:'Load error', errMilky:'Milky Way load error',
    errZodiac:'Zodiac load error',
  },
  de: {
    latLabel:'Breite Mittelpunkt', lonLabel:'Länge Mittelpunkt',
    applyBtn:'▶ Mitte anwenden',
    gridChk:'Gitter 30°', labelsChk:'Koordinatenbeschriftung',
    citiesChk:'🏙 Städte & Labels', rulerChk:'📏 Entfernungslineal',
    routesChk:'✈ Flugrouten',
    equatorChk:'Äquator', tropicsChk:'Wendekreise', eclipticChk:'Ekliptik',   // v6.0.0
    equatorName:'Äquator', tropicCancer:'Wendekreis des Krebses', tropicCapricorn:'Wendekreis des Steinbocks',
    zodiacOutside:'außerhalb Tierkreis',
    zodiacStarsChk:'Sterne und Sternbildfiguren',
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
    modeHour:'täglich — Schritt 1h',
    modeDay:'jährlich — Schritt 24h',
    modeSidereal:'Sterntag — Schritt 23h 56m 4s',
    modeIss:'ISS — Schritt 1 Min × Speed',
    // ── Objektspuren (v5.6.0) ────────────────────────────────
    trailsTitle:    'Objektspuren',
    trailSunChk:    '☀ Spur',
    trailMoonChk:   '🌙 Spur',
    trailStarsChk:  '✦ Spur',
    trailPlanetsChk:'🪐 Spur',   // v5.7.0
    trailIssChk:    '🛰 Spur',   // v5.8.0
    trailDays:      'Tage',
    trailHours:     'Std',
    trailMinutes:   'Min',       // v5.8.0
    // ── v6.4.0 ───────────────────────────────────────────────
    sunChk:'☀ Sonne', nightChk:'🌓 Tag / Nacht', moonChk:'🌙 Mond',
    planetsChk:'🪐 Planeten', issChk:'🛰 ISS', starsChk:'✦ Sterne',
    milkywayChk:'🌌 Milchstraße', zodiacChk:'♈ Tierkreis-Sternbilder',
    zodiacHlChk:'Sonne / Mond / Planeten hervorheben', ophiuchusChk:'Schlangenträger (13.)',
    yearLbl:'Jahr', prevDay:'← Tag', nowBtn:'⊙ Jetzt', nextDay:'Tag →',
    speedLbl:'×Tempo',
    playHourTitle:'Tagesanimation: Schritt 1 Stunde',
    playDayTitle:'Jahresanimation: Schritt 1 Tag',
    playSidTitle:'Sterntag: Schritt 23h 56m 4s',
    playIssTitle:'ISS: Schritt 1 Min × Tempo',
    coordsTitle:'📍 Koordinaten der Körper',
    bodySun:'Sonne', bodyMoon:'Mond', bodyIss:'ISS',
    latShort:'Br.', lonShort:'Lg.',
    dateLabel:'Datum und Zeit (UTC)',
    eclSolar:'☀ nächste Finsternis', eclLunar:'🌙 nächste Finsternis',
    eclSolarName:'Sonnenfinsternis', eclLunarName:'Mondfinsternis',
    eclTotal:'total', eclAnnular:'ringförmig', eclPartial:'partiell',
    eclPenumbral:'Halbschatten', eclHybrid:'hybrid',
    eclNotFound:'Keine Finsternis gefunden', eclNeedLib:'Bibliothek astronomy-engine erforderlich',
    errLoad:'Ladefehler', errMilky:'Fehler beim Laden der Milchstraße',
    errZodiac:'Fehler beim Laden des Tierkreises',
  },
};

/* ═══════════════════════════════════════════════════════════════
   ГОРОДА
═══════════════════════════════════════════════════════════════ */
var CITIES = [
  { names:{ru:'Киев',     en:'Kyiv',      de:'Kiew'     }, lon: 30.52, lat: 50.45 },
  { names:{ru:'Москва',   en:'Moscow',    de:'Moskau'   }, lon: 37.62, lat: 55.76 },
  { names:{ru:'Ташкент',  en:'Tashkent',  de:'Taschkent'}, lon: 69.24, lat: 41.30 },
  { names:{ru:'Лондон',   en:'London',    de:'London'   }, lon: -0.13, lat: 51.51 },
  { names:{ru:'Токио',    en:'Tokyo',     de:'Tokio'    }, lon:139.69, lat: 35.68 },
  { names:{ru:'Пекин',    en:'Beijing',   de:'Peking'   }, lon:116.41, lat: 39.90 },
  { names:{ru:'Нью-Йорк', en:'New York',  de:'New York' }, lon:-74.01, lat: 40.71 },
  { names:{ru:'Дубай',    en:'Dubai',     de:'Dubai'    }, lon: 55.27, lat: 25.20 },
  { names:{ru:'Сингапур', en:'Singapore', de:'Singapur' }, lon:103.82, lat:  1.35 },
  { names:{ru:'Сидней',   en:'Sydney',    de:'Sydney'   }, lon:151.21, lat:-33.87 },
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

/* ═══════════════════════════════════════════════════════════════
   ПРОЧИЕ КОНСТАНТЫ
═══════════════════════════════════════════════════════════════ */

/* Шаг координатной сетки [lon, lat] */
var GRID_STEP = [30, 30];

/* URL GeoJSON данных */
var LAND_URL    = '/data/land.geojson';
var BORDERS_URL = '/data/borders.geojson?v=641';

/* ── Млечный Путь (v5.9.0) ──────────────────────────────────────
   Данные: d3-celestial (Olaf Frohn), лицензия BSD-3 — см.
   frontend/data/LICENSE-d3-celestial.txt
   Формат: FeatureCollection из 5 полигонов (id 'ol1'..'ol5'),
   вложенные изофоты яркости: ol1 — самый широкий и тусклый,
   ol5 — самое яркое ядро. Координаты [RA в градусах, Dec] (J2000),
   RA приведён к диапазону -180..180.
   Контуры упрощены алгоритмом Дугласа–Пекера на сфере, допуск 0.05°
   (30676 → 8759 точек, площади изофот изменились не более чем на 0.12%):
   так кадр анимации рисуется в ~3.5 раза быстрее.
   Загружается лениво — при первом включении чекбокса (~150 КБ).
══════════════════════════════════════════════════════════════════ */
var MILKYWAY_URL = '/data/milkyway.json';

/* Цвет заливки и прозрачность контуров по порядку ol1..ol5.
   Контуры вложены друг в друга, прозрачности складываются —
   получается градиент от краёв к ядру. */
var MILKYWAY_STYLE = {
  color:   '#9b4dff',
  opacity: [0.25, 0.30, 0.38, 0.46, 0.55],
};

/* ── Зодиак, эклиптика, тропики, экватор (v6.0.0) ───────────────
   ZODIAC_URL — границы IAU 13 созвездий вдоль эклиптики
   (d3-celestial, BSD-3, эпоха J2000). Формат: FeatureCollection из
   Polygon, id = трёхбуквенное обозначение ('Ari', 'Tau', …).
   При подготовке файла:
     · у Весов, Стрельца и Козерога кольца были с обратной обмоткой
       (D3 принял бы их за «всё небо, кроме созвездия») — развёрнуты;
     · рёбра уплотнены до шага 1° по RA/Dec: границы идут по линиям
       RA и Dec, а D3 соединяет вершины дугами большого круга, что для
       длинных рёбер (до 26°) дало бы заметную ошибку.
   Загружается лениво при первом включении чекбокса (~35 КБ).
══════════════════════════════════════════════════════════════════ */
var ZODIAC_URL = '/data/zodiac.json';

/* Звёзды (до 5.0 m) в границах 13 созвездий и линии их фигур
   (constellations.lines, d3-celestial). Формат:
   { stars: { Ari: [[ra, dec, mag], …], … }, lines: { Ari: [[[ra,dec],…], …], … } }
   (~11 КБ). Если файла нет — зодиак работает без звёзд. */
var ZODIAC_STARS_URL = '/data/zodiac-stars.json';

/* Размер звезды (диаметр, px) по звёздной величине: первое подходящее
   условие mag < max. Линии фигур — тонкие, подсвеченного созвездия — ярче. */
/* ── Своя статистика посещений (v6.3.0) ───────────────────────
   Адрес Worker'а без слэша в конце, например
   'https://femap-stats.ИМЯ.workers.dev'. Пустая строка — выключено.
   Отправляются: просмотр страницы и включение слоёв (id чекбокса),
   домен источника, язык интерфейса, ширина экрана. Без cookie, без IP.
   Не отправляется: с localhost и локальных адресов, при Do Not Track. */
var ANALYTICS_URL = 'https://femap-stats.femap-lab.workers.dev';

var ZODIAC_STARS_STYLE = {
  sizes:     [ { max: 1.5, d: 6 }, { max: 2.5, d: 4.6 }, { max: 3.5, d: 3.5 },
               { max: 4.5, d: 2.6 }, { max: 99, d: 2 } ],
  color:     '#ffffff',
  halo:      'rgba(0,0,0,0.45)',  // тёмная подложка — читается на жёлтой суше
  haloExtra: 1.8,                 // на сколько px подложка шире звезды
  line:      '#d9e8ff',
  lineOpacity:   0.55,
  lineWidth:     0.9,
  hlLineOpacity: 0.95,
  hlLineWidth:   1.5,
};

/* Подписи планет — как названия тропиков: моноширинный 10px,
   цвет планеты, тёмная обводка (paint-order: stroke). */
var PLANET_LABEL_STYLE = {
  size:   '10px',
  family: 'monospace',
  halo:   'rgba(0,0,0,0.65)',
  haloW:  2.5,
};

/* Порядок — по эклиптике. extra: true — 13-е созвездие, которое Солнце
   тоже проходит, но которого нет в классическом зодиаке; показывается
   отдельным переключателем (chk-ophiuchus). */
var ZODIAC = [
  { id:'Ari', ru:'Овен',       en:'Aries',       de:'Widder'          },
  { id:'Tau', ru:'Телец',      en:'Taurus',      de:'Stier'           },
  { id:'Gem', ru:'Близнецы',   en:'Gemini',      de:'Zwillinge'       },
  { id:'Cnc', ru:'Рак',        en:'Cancer',      de:'Krebs'           },
  { id:'Leo', ru:'Лев',        en:'Leo',         de:'Löwe'            },
  { id:'Vir', ru:'Дева',       en:'Virgo',       de:'Jungfrau'        },
  { id:'Lib', ru:'Весы',       en:'Libra',       de:'Waage'           },
  { id:'Sco', ru:'Скорпион',   en:'Scorpius',    de:'Skorpion'        },
  { id:'Oph', ru:'Змееносец',  en:'Ophiuchus',   de:'Schlangenträger', extra:true },
  { id:'Sgr', ru:'Стрелец',    en:'Sagittarius', de:'Schütze'         },
  { id:'Cap', ru:'Козерог',    en:'Capricornus', de:'Steinbock'       },
  { id:'Aqr', ru:'Водолей',    en:'Aquarius',    de:'Wassermann'      },
  { id:'Psc', ru:'Рыбы',       en:'Pisces',      de:'Fische'          },
];

/* Тела, для которых подсвечивается созвездие. Планеты берутся из PLANETS.
   Приоритет цвета заливки, если в одном созвездии несколько тел:
   Солнце → Луна → планеты по порядку PLANETS. */
var ZODIAC_BODIES = {
  Sun:  { sym:'☀', color:'#ffd23f', label:{ ru:'Солнце', en:'Sun',  de:'Sonne' } },
  Moon: { sym:'☾', color:'#9fd0ff', label:{ ru:'Луна',   en:'Moon', de:'Mond'  } },
};

/* Стиль зодиака. Линии рисуются с non-scaling-stroke — толщина в
   пикселях экрана не меняется при зуме. Подсветка: цветной ореол
   тела + белая обводка + заливка цветом тела. */
var ZODIAC_STYLE = {
  border:         '#efe6ff',  // границы всех показанных созвездий
  borderOpacity:  0.80,
  borderWidth:    1.1,
  label:          '#f4eeff',  // названия созвездий
  hlFillOpacity:  0.30,       // заливка подсвеченного созвездия
  hlHaloOpacity:  0.60,       // ореол вокруг границы
  hlHaloWidth:    5,
  hlStroke:       '#ffffff',  // белая обводка границы
  hlWidth:        1.8,
};

/* Наклон эклиптики к экватору (J2000), градусы. По нему строится
   эклиптика и тропики: тропик — параллель на широте ±OBLIQUITY. */
var OBLIQUITY  = 23.4393;
var TROPIC_LAT = OBLIQUITY;

/* Стиль линий. Все три лежат на карте через non-scaling-stroke. */
var LINES_STYLE = {
  equator:  { color:'#ff4d4d', width:1.5, dash:''    },   // красный
  tropics:  { color:'#ff9f1a', width:1.3, dash:'7,4' },   // оранжевый пунктир
  ecliptic: { color:'#ffffff', width:1.6, dash:''    },   // белая
};

/* Шаги анимации в миллисекундах */
var ANIM_STEP = {
  hour:     1 * 60 * 60 * 1000,  // 1 час
  day:      24 * 60 * 60 * 1000, // 1 сутки
  sidereal: 86164 * 1000,        // 23ч 56м 4с — звёздные сутки
  // Режим 'iss' не имеет фиксированного шага — рассчитывается как
  // 60 * 1000 * state.astro.issSpeed при каждом тике (astro.js)
};

/* Интервал между кадрами анимации (мс) */
var ANIM_INTERVAL_MS = 80;

/* ── МКС — TLE и скорость (v5.8.0) ─────────────────────────────
   ISS_TLE_URL: CelesTrak GP-endpoint, возвращает три строки текста.
   ISS_TLE_FALLBACK: резерв на случай недоступности сети.
   ВАЖНО: перед коммитом заменить ISS_TLE_FALLBACK на свежие данные
          с https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE
══════════════════════════════════════════════════════════════════ */
var ISS_TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';

var ISS_TLE_FALLBACK = [
  'ISS (ZARYA)',
  '1 25544U 98067A   25110.54791667  .00020000  00000-0  36771-3 0  9993',
  '2 25544  51.6400 337.6182 0003456  75.4321 284.7890 15.49604763497123'
];

/* Варианты множителя скорости для кнопок ×N в режиме 'iss'.
   Каждый множитель = реальных минут за один кадр анимации (80мс). */
var ISS_SPEED_OPTIONS = [1, 10, 20, 100];

/* ── Хвосты объектов (v5.6.0) ───────────────────────────────────
   TRAIL_BANDS — количество полос градиентной прозрачности.
   Каждый хвост делится на N полос, opacity нарастает от хвоста (0)
   к голове (1). Больше полос = плавнее градиент, но больше DOM-узлов.
══════════════════════════════════════════════════════════════════ */
/* Сглаживание хвостов (v6.4.0): между соседними точками истории добавляются
   промежуточные по долготе/широте (движение тел идёт вдоль параллелей),
   максимальный шаг по долготе в градусах. Меньше — глаже, но тяжелее. */
var TRAIL_SMOOTH_STEP = 3;
var TRAIL_SMOOTH_MAX_POINTS = 30000;   // общий потолок точек на один хвост

var TRAIL_BANDS = {
  sunMoon: 15,  // полос для хвостов Солнца и Луны
  planets: 15,  // полос для хвостов планет (v5.7.0)
  stars:   8,   // полос для хвостов звёзд
  iss:     12,  // полос для хвоста МКС (v5.8.0)
};
