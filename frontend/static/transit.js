/**
 * transit.js — v7.2.1
 * Блок «Транзиты»: прохождения Меркурия и Венеры по диску Солнца.
 *  - список транзитов (Astronomy.SearchTransit / NextTransit) и кнопки
 *    «предыдущий / следующий» для каждой планеты;
 *  - карта видимости: полушария, где Солнце над горизонтом, в 9 моментах от
 *    первого до последнего контакта (чем темнее — тем дольше видно),
 *    границы в начале (зелёная) и в конце (красная);
 *  - путь подсолнечной точки за время транзита + метки C1 / макс. / C4;
 *  - мини-диск Солнца: путь планеты (из центра Земли, север вверху, восток
 *    слева) и её положение в выбранный момент;
 *  - строка в верхней панели, пока транзит идёт.
 * Земля — шар (как и вся карта); параллакс наблюдателя не учитывается
 * (для Меркурия до ~8″, для Венеры до ~30″ — доли процента диска Солнца).
 */
var TR = { list: [], listKey: '', geo: {}, disc: {}, act: null, actKey: null };

var TR_BODIES = {
  Mercury: { sym: '☿', color: '#c8c8c8', R: 2439.7, nameKey: 'trMercury' },
  Venus:   { sym: '♀', color: '#f0c878', R: 6051.8, nameKey: 'trVenus' }
};

function trName(e) { return LANG[state.lang][TR_BODIES[e.body].nameKey]; }
function trKey(e)  { return e.body + e.peak.getTime(); }

function trFromInfo(body, t) {
  return { body: body, start: t.start.date, peak: t.peak.date, finish: t.finish.date, sep: t.separation };
}

/** Все транзиты Меркурия и Венеры в окне [from, to], по возрастанию времени. */
function transitsBetween(from, to) {
  var out = [];
  if (!astroOk()) return out;
  ['Mercury', 'Venus'].forEach(function(body) {
    try {
      var t = Astronomy.SearchTransit(Astronomy.Body[body], from);
      for (var g = 0; t && t.peak.date <= to && g < 60; g++) {
        out.push(trFromInfo(body, t));
        t = Astronomy.NextTransit(Astronomy.Body[body], t.peak);
      }
    } catch (err) { console.warn('[transit] list:', err && err.message || err); }
  });
  out.sort(function(a, b) { return a.peak - b.peak; });
  return out;
}

/** Список вокруг даты (−20 … +130 лет), кеш по десятилетию. */
function transitList() {
  var y = state.astro.date.getUTCFullYear();
  var key = Math.floor(y / 10);
  if (TR.listKey !== key) {
    TR.listKey = key;
    TR.list = transitsBetween(new Date(Date.UTC(y - 20, 0, 1)), new Date(Date.UTC(y + 130, 0, 1)));
  }
  return TR.list;
}

/** Идёт ли транзит в момент date (между первым и последним контактом): запись или null. */
function transitActive(date) {
  if (!astroOk()) return null;
  var key = Math.floor(date.getTime() / 30000);
  if (TR.actKey === key) return TR.act;
  var res = null, L = transitList(), t = date.getTime();
  for (var i = 0; i < L.length; i++) {
    if (L[i].start.getTime() <= t && t <= L[i].finish.getTime()) { res = L[i]; break; }
  }
  TR.actKey = key; TR.act = res;
  return res;
}

function trFmt(d) { return eclFmt(d); }
function trHM(d)  { return eclFmt(d).slice(11); }

/** Предыдущий (−1) / следующий (+1) транзит планеты body. */
function transitStep(body, dir) {
  var info = document.getElementById('tr-info');
  var t = LANG[state.lang];
  if (!astroOk()) { if (info) info.textContent = t.eclNeedLib; return; }
  var now = state.astro.date.getTime(), B = Astronomy.Body[body], found = null;
  try {
    if (dir > 0) {
      var n = Astronomy.SearchTransit(B, new Date(now));
      for (var g = 0; n && n.peak.date.getTime() <= now + 60000 && g < 5; g++) n = Astronomy.NextTransit(B, n.peak);
      if (n) found = trFromInfo(body, n);
    } else {
      var span = body === 'Venus' ? 130 : 15;                       // > максимального интервала между транзитами
      var s = Astronomy.SearchTransit(B, new Date(now - span * 365.25 * 86400000));
      for (var k = 0; s && s.peak.date.getTime() < now - 60000 && k < 60; k++) {
        found = trFromInfo(body, s);
        s = Astronomy.NextTransit(B, s.peak);
      }
    }
  } catch (err) { console.warn('[transit] step:', err && err.message || err); }
  if (!found) { if (info) info.textContent = t.eclNotFound; return; }
  trSelect(found);
}

function trSelect(e) {
  astroPause();
  state.transit.sel = e;
  TR.actKey = null;
  setAstroDate(new Date(e.peak.getTime()), true);
  renderAstro();
  buildTransitSelect();
}

function buildTransitSelect() {
  var sel = document.getElementById('tr-list');
  if (!sel) return;
  var list = transitList();
  var cur = state.transit.sel;
  var sig = list.length + '|' + state.lang + '|' + (cur ? trKey(cur) : 0);
  if (sel.dataset.sig === sig) return;
  sel.dataset.sig = sig;
  sel.textContent = '';
  var o0 = document.createElement('option');
  o0.value = ''; o0.textContent = LANG[state.lang].trPick;
  sel.appendChild(o0);
  list.forEach(function(e, i) {
    var o = document.createElement('option');
    o.value = String(i);
    o.textContent = TR_BODIES[e.body].sym + ' ' + trFmt(e.peak).slice(0, 10);
    if (cur && trKey(cur) === trKey(e)) o.selected = true;
    sel.appendChild(o);
  });
}

/* ───────────── геометрия ───────────── */

function v3unit(a) { var l = v3len(a); return [a[0] / l, a[1] / l, a[2] / l]; }
function v3cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

/**
 * Положение планеты относительно центра диска Солнца из центра Земли, угловые
 * минуты: x — на запад (вправо при взгляде «север вверху, восток слева»),
 * y — на север; rS, rP — угловые радиусы Солнца и планеты.
 * Видимые положения (с аберрацией) для обоих тел, экваториальная система даты.
 */
function trOffset(body, date) {
  var rot = Astronomy.Rotation_EQJ_EQD(date);
  var S = Astronomy.RotateVector(rot, Astronomy.GeoVector(Astronomy.Body.Sun, date, true));
  var P = Astronomy.RotateVector(rot, Astronomy.GeoVector(Astronomy.Body[body], date, true));
  var sv = [S.x, S.y, S.z], pv = [P.x, P.y, P.z];
  var s = v3unit(sv), p = v3unit(pv);
  var east = v3unit(v3cross([0, 0, 1], s)), north = v3cross(s, east);
  var den = v3dot(p, s), AM = 180 / Math.PI * 60;
  var rS = Math.asin(SUN_R_KM / (v3len(sv) * AU_KM)) * AM;
  var rP = Math.asin(TR_BODIES[body].R / (v3len(pv) * AU_KM)) * AM;
  return { x: -v3dot(p, east) / den * AM, y: v3dot(p, north) / den * AM, rS: rS, rP: rP };
}

/** Кеш геометрии транзита: подсолнечные точки (карта) и путь планеты по диску. */
function trGeo(e) {
  var k = trKey(e);
  if (TR.geo[k]) return TR.geo[k];
  var t0 = e.start.getTime(), t1 = e.finish.getTime(), i, pts, g = {};
  g.circ = [];                                              // 9 моментов для карты видимости
  for (i = 0; i < 9; i++) {
    var sp = bodySubpoint('Sun', new Date(t0 + (t1 - t0) * i / 8));
    if (sp) g.circ.push([sp.lon, sp.lat]);
  }
  pts = [];
  for (i = 0; i <= 48; i++) {
    var sp2 = bodySubpoint('Sun', new Date(t0 + (t1 - t0) * i / 48));
    if (sp2) pts.push([sp2.lon, sp2.lat]);
  }
  g.track = pts.length > 1 ? { type: 'LineString', coordinates: pts } : null;
  g.marks = [
    { t: e.start,  key: 'trC1',  color: '#7dd87d' },
    { t: e.peak,   key: 'trMax', color: '#ffd23f' },
    { t: e.finish, key: 'trC4',  color: '#ff7d7d' }
  ].map(function(m) {
    var s = bodySubpoint('Sun', m.t);
    return { lon: s.lon, lat: s.lat, key: m.key, color: m.color };
  });
  g.chord = [];
  for (i = 0; i <= 60; i++) g.chord.push(trOffset(e.body, new Date(t0 + (t1 - t0) * i / 60)));
  TR.geo[k] = g;
  return g;
}

/** Высота Солнца (°) над горизонтом наблюдателя. */
function trSunAlt(date) {
  var o = state.observer, obs = new Astronomy.Observer(o.lat, o.lon, 0);
  var eq = Astronomy.Equator(Astronomy.Body.Sun, date, obs, true, true);
  return Astronomy.Horizon(date, obs, eq.ra, eq.dec, 'normal').altitude;
}

/** 'full' | 'part' | 'none' — видна ли вся продолжительность транзита наблюдателю. */
function trObserverVis(e) {
  var t0 = e.start.getTime(), t1 = e.finish.getTime(), up = 0, n = 6;
  for (var i = 0; i < n; i++) if (trSunAlt(new Date(t0 + (t1 - t0) * i / (n - 1))) > 0) up++;
  return up === n ? 'full' : up === 0 ? 'none' : 'part';
}

/* ───────────── мини-диск Солнца ───────────── */

function renderTransitDisc(e, date, act) {
  var host = d3.select('#tr-disc');
  if (host.empty()) return;
  host.selectAll('*').remove();
  if (!e || !state.transit.showDisc) { host.style('display', 'none'); return; }
  host.style('display', 'block');
  var g = trGeo(e), W = 168, R = 72, cx = W / 2, cy = W / 2;
  var rS = g.chord[Math.floor(g.chord.length / 2)].rS, sc = R / rS;
  var svg = host.append('svg').attr('width', W).attr('height', W).style('display', 'block')
    .style('margin', '4px auto');
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', '#f5b43a')
    .attr('stroke', '#ffd98a').attr('stroke-width', 1);
  var line = d3.line().x(function(p) { return cx + p.x * sc; }).y(function(p) { return cy - p.y * sc; });
  svg.append('path').attr('d', line(g.chord)).attr('fill', 'none')
    .attr('stroke', 'rgba(20,20,20,0.75)').attr('stroke-width', 1).attr('stroke-dasharray', '3,3');
  [[0, '#7dd87d'], [g.chord.length - 1, '#ff7d7d']].forEach(function(m) {   // C1 и C4
    var p = g.chord[m[0]];
    svg.append('circle').attr('cx', cx + p.x * sc).attr('cy', cy - p.y * sc).attr('r', 2.5)
      .attr('fill', m[1]).attr('stroke', '#111').attr('stroke-width', 0.8);
  });
  if (act) {
    var o = trOffset(e.body, date);
    svg.append('circle').attr('cx', cx + o.x * sc).attr('cy', cy - o.y * sc)
      .attr('r', Math.max(2.4, o.rP * sc)).attr('fill', '#111').attr('stroke', TR_BODIES[e.body].color)
      .attr('stroke-width', 1);
  }
  var cap = function(x, y, txt, anchor) {
    svg.append('text').attr('x', x).attr('y', y).attr('text-anchor', anchor || 'middle')
      .attr('fill', '#9fb2c8').attr('font-size', '9px').attr('font-family', 'monospace').text(txt);
  };
  cap(cx, 9, 'N'); cap(5, cy + 3, 'E', 'start'); cap(W - 5, cy + 3, 'W', 'end');
}

/* ───────────── слои карты и панели ───────────── */

function renderTransit() {
  var lc = state.svg.select('#layer-transit'), lm = state.svg.select('#layer-transit-mk');
  lc.selectAll('*').remove(); lm.selectAll('*').remove();
  var info = document.getElementById('tr-info');
  var date = state.astro.date, t = LANG[state.lang], T = state.transit;
  if (T.sel && Math.abs(T.sel.peak - date) > 3 * 86400000) T.sel = null;
  buildTransitSelect();
  var act = transitActive(date);
  var e = act || T.sel;
  var lines = [];
  if (e) {
    var dur = Math.round((e.finish - e.start) / 60000);
    lines.push(TR_BODIES[e.body].sym + ' ' + trName(e) + (act ? ' — ' + t.eclNow : ''));
    lines.push('C1 ' + trHM(e.start) + ' · ' + t.trMax + ' ' + trHM(e.peak) + ' · C4 ' + trHM(e.finish) + ' UTC');
    lines.push(trFmt(e.peak).slice(0, 10) + ' · ' + Math.floor(dur / 60) + ' ' + t.trH + ' ' + (dur % 60) + ' ' + t.trMin);
    var rS = trGeo(e).chord[30].rS;
    lines.push(t.trSep + ' ' + e.sep.toFixed(1) + '′ = ' + Math.round(e.sep / rS * 100) + '% R☉');
    if (state.observer.on) lines.push('👁 ' + t['trObs_' + trObserverVis(e)]);
  }
  if (info) info.textContent = lines.join('\n');
  renderTransitDisc(e, date, act);
  if (!act) return;

  var g = trGeo(e);
  if (T.showArea) {
    g.circ.forEach(function(c, i) {
      var edge = i === 0 ? '#7dd87d' : i === g.circ.length - 1 ? '#ff7d7d' : null;
      var p = lc.append('path').datum(d3.geoCircle().center(c).radius(90).precision(0.5)())
        .attr('d', state.path).attr('fill', 'rgba(255,200,60,0.06)').attr('pointer-events', 'none')
        .attr('vector-effect', 'non-scaling-stroke');
      if (edge) p.attr('stroke', edge).attr('stroke-width', 1.4).attr('stroke-dasharray', '5,4');
      else p.attr('stroke', 'none');
    });
  }
  if (T.showTrack && g.track) {
    lc.append('path').datum(g.track).attr('d', state.path).attr('fill', 'none')
      .attr('stroke', '#ffd23f').attr('stroke-width', 2.4).attr('stroke-dasharray', '7,4')
      .attr('vector-effect', 'non-scaling-stroke').attr('pointer-events', 'none');
    var tr = d3.zoomTransform(state.svg.node());
    g.marks.forEach(function(m) {
      var p = state.projection([m.lon, m.lat]);
      if (!p) return;
      var q = tr.apply(p);
      lm.append('circle').attr('cx', q[0]).attr('cy', q[1]).attr('r', 4.5).attr('fill', m.color)
        .attr('stroke', '#111').attr('stroke-width', 1.2).attr('pointer-events', 'none');
      shadowLabel(lm, q[0], q[1] - 9, t[m.key], m.color);
    });
  }
}
