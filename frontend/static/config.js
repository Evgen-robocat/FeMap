/**
 * Файл    : frontend/static/config.js
 * Версия  : 5.8.0
 * Модуль  : Константы и статические данные
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

var VERSION = window.FEMAP_VERSION || '5.8.0';

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
  },
  en: {
    latLabel:'Center Latitude', lonLabel:'Center Longitude',
    applyBtn:'▶ Apply Center',
    gridChk:'Grid 30°', labelsChk:'Coordinate Labels',
    citiesChk:'🏙 Cities & Labels', rulerChk:'📏 Distance Ruler',
    routesChk:'✈ Flight Routes',
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
  },
  de: {
    latLabel:'Breite Mittelpunkt', lonLabel:'Länge Mittelpunkt',
    applyBtn:'▶ Mitte anwenden',
    gridChk:'Gitter 30°', labelsChk:'Koordinatenbeschriftung',
    citiesChk:'🏙 Städte & Labels', rulerChk:'📏 Entfernungslineal',
    routesChk:'✈ Flugrouten',
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
var BORDERS_URL = '/data/borders.geojson';

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
var TRAIL_BANDS = {
  sunMoon: 15,  // полос для хвостов Солнца и Луны
  planets: 15,  // полос для хвостов планет (v5.7.0)
  stars:   8,   // полос для хвостов звёзд
  iss:     12,  // полос для хвоста МКС (v5.8.0)
};
