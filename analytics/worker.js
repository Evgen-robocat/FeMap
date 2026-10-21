/**
 * Файл    : analytics/worker.js
 * Версия  : 1.0.0
 * Модуль  : Своя статистика посещений FeMap — Cloudflare Worker + D1
 *
 * Бесплатный тариф Cloudflare: 100 000 запросов Worker в сутки,
 * D1 — 100 000 записей и 5 млн чтений в сутки, 5 ГБ.
 *
 * Эндпоинты:
 *   POST /hit         — приём события от сайта (sendBeacon, text/plain JSON)
 *                       { ev: 'view' | 'on', meta, ref, lang, w }
 *   GET  /stats       — страница статистики (нужен ?key=STATS_KEY)
 *   GET  /stats.json  — те же данные в JSON (?key=…&days=30)
 *   GET  /health      — "ok"
 *
 * Привязки и переменные (Settings → Bindings / Variables):
 *   DB              — D1 база (binding, имя переменной именно DB)
 *   STATS_KEY       — секрет: ключ доступа к /stats
 *   SALT            — секрет: соль для хэша посетителя
 *   ALLOWED_ORIGIN  — текст, адрес сайта: https://femap.onrender.com
 *                     (если не задан — принимаются запросы с любого адреса)
 *
 * Приватность: без cookie. IP и User-Agent не хранятся — только хэш
 * SHA-256(SALT + дата UTC + IP + UA), он меняется каждые сутки, поэтому
 * «уникальные» считаются в пределах одних суток и между днями не связаны.
 * Хранятся: время, дата, хэш, событие, метка слоя, домен источника (без пути),
 * язык интерфейса, тип устройства, код страны (из заголовков Cloudflare).
 */

const EVENTS   = { view: 1, on: 1 };       // допустимые события
const BOT_RE   = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python-requests/i;

let ready = null;                          // схема создаётся один раз на инстанс

function ensureSchema(env) {
  if (!ready) {
    ready = env.DB.batch([
      env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS hits (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, day TEXT NOT NULL, ' +
        'vid TEXT NOT NULL, ev TEXT NOT NULL, meta TEXT, ref TEXT, lang TEXT, ' +
        'dev TEXT, country TEXT)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_hits_day_ev ON hits (day, ev)'),
    ]).catch(function (e) { ready = null; throw e; });
  }
  return ready;
}

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function clip(v, n) {
  return (typeof v === 'string' ? v : '').slice(0, n);
}

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).slice(0, 8)
    .map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

/* Сравнение без утечки по времени */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ── приём события ─────────────────────────────────────────── */
async function handleHit(request, env) {
  const headers = cors(env);
  const origin  = request.headers.get('Origin');
  if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
    return new Response(null, { status: 403, headers });
  }
  const ua = request.headers.get('User-Agent') || '';
  if (!ua || BOT_RE.test(ua)) return new Response(null, { status: 204, headers });

  const len = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (len > 2000) return new Response(null, { status: 413, headers });

  let b;
  try { b = JSON.parse(await request.text()); } catch (e) {
    return new Response(null, { status: 400, headers });
  }
  if (!b || !EVENTS[b.ev]) return new Response(null, { status: 400, headers });

  await ensureSchema(env);

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const ip  = request.headers.get('CF-Connecting-IP') || '';
  const vid = await sha((env.SALT || '') + '|' + day + '|' + ip + '|' + ua);

  let ref = clip(b.ref, 80);
  try { ref = ref ? new URL(ref).hostname : ''; } catch (e) { ref = ''; }
  const dev = (parseInt(b.w, 10) || 0) > 0 && (parseInt(b.w, 10) || 0) < 700 ? 'mobile' : 'desktop';
  const country = clip((request.cf && request.cf.country) || '', 2);

  await env.DB.prepare(
    'INSERT INTO hits (ts, day, vid, ev, meta, ref, lang, dev, country) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(Math.floor(now.getTime() / 1000), day, vid, b.ev,
          clip(b.meta, 60), ref, clip(b.lang, 5), dev, country)
    .run();

  return new Response(null, { status: 204, headers });
}

/* ── выборки для статистики ────────────────────────────────── */
async function collect(env, days) {
  await ensureSchema(env);
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const q = function (sql) { return env.DB.prepare(sql).bind(since); };

  const res = await env.DB.batch([
    q("SELECT day, COUNT(*) AS views, COUNT(DISTINCT vid) AS uniq FROM hits " +
      "WHERE ev='view' AND day >= ? GROUP BY day ORDER BY day"),
    q("SELECT CASE WHEN ref='' THEN '(прямой заход)' ELSE ref END AS k, COUNT(*) AS c FROM hits " +
      "WHERE ev='view' AND day >= ? GROUP BY k ORDER BY c DESC LIMIT 10"),
    q("SELECT CASE WHEN country='' THEN '??' ELSE country END AS k, COUNT(*) AS c FROM hits " +
      "WHERE ev='view' AND day >= ? GROUP BY k ORDER BY c DESC LIMIT 10"),
    q("SELECT dev AS k, COUNT(*) AS c FROM hits WHERE ev='view' AND day >= ? GROUP BY k ORDER BY c DESC"),
    q("SELECT lang AS k, COUNT(*) AS c FROM hits WHERE ev='view' AND day >= ? GROUP BY k ORDER BY c DESC"),
    q("SELECT meta AS k, COUNT(*) AS c FROM hits WHERE ev='on' AND day >= ? GROUP BY k ORDER BY c DESC LIMIT 20"),
  ]);
  const rows = function (i) { return res[i].results || []; };
  return {
    days: days, since: since,
    daily: rows(0), refs: rows(1), countries: rows(2),
    devices: rows(3), langs: rows(4), layers: rows(5),
  };
}

function countryName(code) {
  if (!code || code === '??') return 'неизвестно';
  try { return new Intl.DisplayNames(['ru'], { type: 'region' }).of(code) + ' (' + code + ')'; }
  catch (e) { return code; }
}

function table(title, list, fmt) {
  const total = list.reduce(function (s, r) { return s + r.c; }, 0) || 1;
  const body = list.map(function (r) {
    const pct = Math.round(r.c * 100 / total);
    return '<tr><td>' + esc(fmt ? fmt(r.k) : r.k) + '</td><td class="n">' + r.c +
           '</td><td class="b"><i style="width:' + pct + '%"></i></td></tr>';
  }).join('') || '<tr><td colspan="3" class="mut">нет данных</td></tr>';
  return '<section><h2>' + esc(title) + '</h2><table>' + body + '</table></section>';
}

function page(d) {
  const today = new Date().toISOString().slice(0, 10);
  const byDay = {};
  d.daily.forEach(function (r) { byDay[r.day] = r; });

  /* сплошной ряд дней, пропуски — нули */
  const series = [];
  for (let i = d.days - 1; i >= 0; i--) {
    const k = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series.push({ day: k, views: (byDay[k] || {}).views || 0, uniq: (byDay[k] || {}).uniq || 0 });
  }
  const max   = Math.max.apply(null, series.map(function (s) { return s.views; }).concat([1]));
  const sum   = function (arr, f) { return arr.reduce(function (s, r) { return s + f(r); }, 0); };
  const td    = byDay[today] || { views: 0, uniq: 0 };
  const last7 = series.slice(-7);

  const W = 720, H = 150, bw = W / series.length;
  const bars = series.map(function (s, i) {
    const h  = Math.round(s.views / max * (H - 20));
    const hu = Math.round(s.uniq  / max * (H - 20));
    const x  = (i * bw + 1).toFixed(1), w = Math.max(bw - 2, 1).toFixed(1);
    return '<g><title>' + esc(s.day) + ': ' + s.views + ' просм., ' + s.uniq + ' уник.</title>' +
      '<rect x="' + x + '" y="' + (H - h) + '" width="' + w + '" height="' + h + '" fill="#2f6f9f"/>' +
      '<rect x="' + x + '" y="' + (H - hu) + '" width="' + w + '" height="' + hu + '" fill="#7fd0ff"/></g>';
  }).join('');

  const names = { mobile: 'телефон', desktop: 'компьютер' };

  return '<!doctype html><html lang="ru"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>FeMap — статистика</title><style>' +
    ':root{--bg:#060e16;--p:#0d1926;--t:#e0e6ed;--m:#7e93a8;--a:#7fd0ff}' +
    '@media(prefers-color-scheme:light){:root{--bg:#f3f6f9;--p:#fff;--t:#14202c;--m:#5b6b7b;--a:#1f6fa8}}' +
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);' +
    'font:15px/1.45 system-ui,Segoe UI,Roboto,sans-serif;padding:16px;max-width:760px;margin:auto}' +
    'h1{font-size:1.25rem;margin:4px 0 14px}h2{font-size:.95rem;color:var(--m);margin:0 0 8px;font-weight:600}' +
    '.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px}' +
    '.card,section{background:var(--p);border-radius:10px;padding:12px 14px}section{margin-bottom:12px}' +
    '.card b{display:block;font-size:1.6rem;color:var(--a)}.card span{color:var(--m);font-size:.8rem}' +
    'table{width:100%;border-collapse:collapse}td{padding:4px 0;vertical-align:middle}' +
    '.n{text-align:right;padding:0 10px;font-variant-numeric:tabular-nums}.b{width:38%}' +
    '.b i{display:block;height:6px;background:var(--a);border-radius:3px;opacity:.7}' +
    '.mut,.note{color:var(--m);font-size:.8rem}svg{width:100%;height:auto;display:block}' +
    'a{color:var(--a)}</style></head><body>' +
    '<h1>FeMap — статистика</h1><div class="cards">' +
    '<div class="card"><b>' + td.views + '</b><span>просмотров сегодня (UTC)</span></div>' +
    '<div class="card"><b>' + td.uniq + '</b><span>уникальных сегодня</span></div>' +
    '<div class="card"><b>' + sum(last7, function (r) { return r.views; }) + '</b><span>просмотров за 7 дней</span></div>' +
    '<div class="card"><b>' + sum(series, function (r) { return r.views; }) + '</b><span>просмотров за ' + d.days + ' дн.</span></div></div>' +
    '<section><h2>Просмотры по дням (светлее — уникальные)</h2>' +
    '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' + bars + '</svg>' +
    '<div class="note">' + esc(series[0].day) + ' … ' + esc(series[series.length - 1].day) + '</div></section>' +
    table('Источники', d.refs) +
    table('Страны', d.countries, countryName) +
    table('Устройства', d.devices, function (k) { return names[k] || k; }) +
    table('Язык интерфейса', d.langs, function (k) { return k || '—'; }) +
    table('Что включают на карте', d.layers, function (k) { return k || '—'; }) +
    '<p class="note">Данные анонимные, без cookie. «Уникальные» считаются в пределах суток (UTC), ' +
    'между днями посетители не связываются. Период: <a href="?key=' + encodeURIComponent(d.key) + '&days=7">7</a> · ' +
    '<a href="?key=' + encodeURIComponent(d.key) + '&days=30">30</a> · ' +
    '<a href="?key=' + encodeURIComponent(d.key) + '&days=90">90</a> дн.</p></body></html>';
}

/* ── маршрутизатор ─────────────────────────────────────────── */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });

    try {
      if (url.pathname === '/hit' && request.method === 'POST') return await handleHit(request, env);

      if (url.pathname === '/health') return new Response('ok');

      if (url.pathname === '/stats' || url.pathname === '/stats.json') {
        const key = url.searchParams.get('key') || '';
        if (!env.STATS_KEY || !safeEqual(key, env.STATS_KEY)) {
          return new Response('Нужен ключ доступа', { status: 401, headers: { 'Cache-Control': 'no-store' } });
        }
        const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '30', 10) || 30));
        const data = await collect(env, days);
        const common = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' };
        if (url.pathname === '/stats.json') {
          return new Response(JSON.stringify(data), { headers: Object.assign({ 'Content-Type': 'application/json' }, common) });
        }
        data.key = key;
        return new Response(page(data), { headers: Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, common) });
      }

      return new Response('Not found', { status: 404 });
    } catch (e) {
      console.error('worker error', e && e.message);
      return new Response('Error', { status: 500, headers: cors(env) });
    }
  },
};
