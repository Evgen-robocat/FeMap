/**
 * eclipse.js — v7.1.0
 * Блок «Затмения»: список, предыдущее/следующее солнечное и лунное,
 * пятно видимости на карте (для солнечного — область частной фазы,
 * для лунного — полушарие, где Луна над горизонтом), след (линия центра
 * тени / путь подлунной точки), подсветка тел в момент затмения.
 * Земля — шар радиусом EARTH_R_KM (как и вся карта).
 */
var ECL = { list: [], listKey: '', areaKey: '', area: null, trackKey: '', track: null };

var ECL_KIND_KEY = { total:'eclTotal', annular:'eclAnnular', partial:'eclPartial',
                     penumbral:'eclPenumbral', hybrid:'eclHybrid' };

function eclKindName(kind, type) {
  var t = LANG[state.lang];
  var k = ECL_KIND_KEY[String(type).toLowerCase()];
  return (kind === 'solar' ? t.eclSolarName : t.eclLunarName) + (k ? ' (' + t[k] + ')' : '');
}

/** Все затмения в окне [from, to] (оба вида), по возрастанию времени. */
function eclipsesBetween(from, to) {
  var out = [];
  if (!astroOk()) return out;
  var e, g;
  try {
    e = Astronomy.SearchGlobalSolarEclipse(from);
    for (g = 0; e && e.peak && e.peak.date <= to && g < 40; g++) {
      out.push({ kind: 'solar', type: String(e.kind).toLowerCase(), peak: e.peak.date,
                 lat: e.latitude, lon: e.longitude });
      e = Astronomy.NextGlobalSolarEclipse(e.peak);
    }
    e = Astronomy.SearchLunarEclipse(from);
    for (g = 0; e && e.peak && e.peak.date <= to && g < 40; g++) {
      out.push({ kind: 'lunar', type: String(e.kind).toLowerCase(), peak: e.peak.date });
      e = Astronomy.NextLunarEclipse(e.peak);
    }
  } catch (err) { console.warn('[eclipse] list:', err && err.message || err); }
  out.sort(function(a, b) { return a.peak - b.peak; });
  return out;
}

/** Список вокруг даты (±3 года), кеш по году. */
function eclipseList() {
  var y = state.astro.date.getUTCFullYear();
  var key = y + '|' + state.lang;
  if (ECL.listKey !== key) {
    ECL.listKey = key;
    ECL.list = eclipsesBetween(new Date(Date.UTC(y - 3, 0, 1)), new Date(Date.UTC(y + 4, 0, 1)));
  }
  return ECL.list;
}

function eclFmt(d) {
  var p = function(n) { return (n < 10 ? '0' : '') + n; };
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) +
         ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
}

function buildEclipseSelect() {
  var sel = document.getElementById('ecl-list');
  if (!sel) return;
  var list = eclipseList();
  var cur = state.eclipse.sel;
  var sig = list.length + '|' + state.lang + '|' + (cur ? cur.peak.getTime() : 0);
  if (sel.dataset.sig === sig) return;
  sel.dataset.sig = sig;
  sel.textContent = '';
  var o0 = document.createElement('option');
  o0.value = ''; o0.textContent = LANG[state.lang].eclPick;
  sel.appendChild(o0);
  list.forEach(function(e, i) {
    var o = document.createElement('option');
    o.value = String(i);
    o.textContent = (e.kind === 'solar' ? '☀ ' : '🌙 ') + eclFmt(e.peak).slice(0, 10) + ' ' +
                    LANG[state.lang][ECL_KIND_KEY[e.type]] ;
    if (cur && cur.peak.getTime() === e.peak.getTime() && cur.kind === e.kind) o.selected = true;
    sel.appendChild(o);
  });
}

function eclSelect(e) {
  astroPause();
  state.eclipse.sel = e;
  setAstroDate(new Date(e.peak.getTime()), true);
  ECL.areaKey = ''; ECL.trackKey = '';
  renderAstro();
  buildEclipseSelect();
}

/** Предыдущее (-1) / следующее (+1) затмение вида kind. */
function eclStep(kind, dir) {
  var t = LANG[state.lang];
  var info = document.getElementById('ecl-info');
  if (!astroOk()) { if (info) info.textContent = t.eclNeedLib; return; }
  var now = state.astro.date.getTime();
  var found = null;
  for (var span = 3; span <= 24 && !found; span += 7) {
    var y = state.astro.date.getUTCFullYear();
    var arr = eclipsesBetween(new Date(Date.UTC(y - span, 0, 1)), new Date(Date.UTC(y + span + 1, 0, 1)))
      .filter(function(e) { return e.kind === kind; });
    if (dir > 0) found = arr.filter(function(e) { return e.peak.getTime() > now + 60000; })[0];
    else         found = arr.filter(function(e) { return e.peak.getTime() < now - 60000; }).pop();
  }
  if (!found) { if (info) info.textContent = t.eclNotFound; return; }
  eclSelect(found);
}

/** Геоцентрические векторы (км) Солнца и Луны в экваториальной системе даты. */
function eclVec(body, date) {
  var g = geoEquatorOfDate(body, date);
  if (!g) return null;
  var ra = g.ra * 15 * Math.PI / 180, de = g.dec * Math.PI / 180, r = g.dist;
  return [r * Math.cos(de) * Math.cos(ra), r * Math.cos(de) * Math.sin(ra), r * Math.sin(de)];
}

function v3sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function v3dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function v3len(a) { return Math.sqrt(v3dot(a, a)); }

/** Идёт ли затмение сейчас: { solar:bool, lunar:bool, sep } */
function eclipseActive(date) {
  var res = { solar: false, lunar: false };
  if (!astroOk()) return res;
  var key = Math.floor(date.getTime() / 30000);
  if (ECL.actKey === key) return ECL.act;
  try {
    var S = eclVec('Sun', date), M = eclVec('Moon', date);
    var D = 180 / Math.PI;
    var sep = Math.acos(Math.max(-1, Math.min(1, v3dot(S, M) / (v3len(S) * v3len(M))))) * D;
    var sS = Math.asin(SUN_R_KM / v3len(S)) * D, sM = Math.asin(MOON_R_KM / v3len(M)) * D;
    var piM = Math.asin(EARTH_R_KM / v3len(M)) * D, piS = Math.asin(EARTH_R_KM / v3len(S)) * D;
    res.solar = sep < 1.02 * (sS + sM + piM - piS);
    var sh = shadowInfo(date);
    res.lunar = !!(sh && sh.magP > 0);
    res.sep = sep;
  } catch (e) {}
  ECL.actKey = key; ECL.act = res;
  return res;
}

function ringArea2(r) {
  var a = 0;
  for (var i = 0, n = r.length; i < n; i++) { var p = r[i], q = r[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}

/** Область видимости частной фазы солнечного затмения: MultiPolygon [lon,lat] или null. */
function solarArea(date) {
  var S = eclVec('Sun', date), M = eclVec('Moon', date);
  if (!S || !M) return null;
  var mp = bodySubpoint('Moon', date);
  var lon0 = mp ? mp.lon : 0;
  var step = 2, n = 181, m = 91;
  var gst = Astronomy.SiderealTime(date) * 15;
  var R = EARTH_R_KM, RAD = Math.PI / 180;
  var vals = new Float64Array(n * m);
  var any = false;
  for (var j = 0; j < m; j++) {
    var lat = -90 + j * step, cl = Math.cos(lat * RAD), sl = Math.sin(lat * RAD);
    for (var i = 0; i < n; i++) {
      var th = (gst + lon0 - 180 + i * step) * RAD;
      var O = [R * cl * Math.cos(th), R * cl * Math.sin(th), R * sl];
      var vs = v3sub(S, O), vm = v3sub(M, O);
      var ls = v3len(vs), lm = v3len(vm);
      var v;
      if (v3dot(O, vs) <= 0) v = -1;
      else {
        var sep = Math.acos(Math.max(-1, Math.min(1, v3dot(vs, vm) / (ls * lm))));
        v = Math.asin(SUN_R_KM / ls) + Math.asin(MOON_R_KM / lm) - sep;
      }
      vals[j * n + i] = v;
      if (v > 0) any = true;
    }
  }
  if (!any) return null;
  var cont = d3.contours().size([n, m]).thresholds([0])(vals)[0];
  if (!cont || !cont.coordinates.length) return null;
  var polys = cont.coordinates.map(function(poly) {
    return poly.map(function(ring, k) {
      var pts = ring.map(function(p) { return [lon0 - 180 + p[0] * step, -90 + p[1] * step]; });
      var a = ringArea2(pts);
      if (k === 0 ? a > 0 : a < 0) pts.reverse();
      return pts.map(function(p) { return [wrapLon(p[0]), Math.max(-90, Math.min(90, p[1]))]; });
    });
  });
  return { type: 'MultiPolygon', coordinates: polys };
}

/** След: линия центра тени солнечного затмения (или путь подлунной точки лунного). */
function eclipseTrack(kind, peak) {
  var out = [], cur = [];
  var RAD = Math.PI / 180, DEG = 180 / Math.PI;
  for (var k = -240; k <= 240; k += 3) {
    var d = new Date(peak.getTime() + k * 60000);
    var pt = null;
    if (kind === 'solar') {
      var S = eclVec('Sun', d), M = eclVec('Moon', d);
      var dir = v3sub(M, S); var L = v3len(dir); dir = [dir[0] / L, dir[1] / L, dir[2] / L];
      var b = v3dot(M, dir), c = v3dot(M, M) - EARTH_R_KM * EARTH_R_KM;
      var disc = b * b - c;
      if (disc >= 0) {
        var tt = -b - Math.sqrt(disc);                  // первое пересечение со сферой
        var P = [M[0] + tt * dir[0], M[1] + tt * dir[1], M[2] + tt * dir[2]];
        var gst = Astronomy.SiderealTime(d) * 15;
        pt = [wrapLon(Math.atan2(P[1], P[0]) * DEG - gst), Math.asin(P[2] / EARTH_R_KM) * DEG];
      }
    } else {
      var mp = bodySubpoint('Moon', d);
      if (mp) pt = [mp.lon, mp.lat];
    }
    if (pt) cur.push(pt); else if (cur.length) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out.length ? { type: 'MultiLineString', coordinates: out } : null;
}

/** Ближайший к дате пик затмения вида kind (в пределах ±2 суток) или null. */
function eclipseNearPeak(kind, date) {
  var s = state.eclipse.sel;
  if (s && s.kind === kind && Math.abs(s.peak - date) < 2 * 86400000) return s.peak;
  try {
    var e = kind === 'solar' ? Astronomy.SearchGlobalSolarEclipse(new Date(date.getTime() - 3 * 86400000))
                             : Astronomy.SearchLunarEclipse(new Date(date.getTime() - 3 * 86400000));
    if (e && e.peak && Math.abs(e.peak.date - date) < 2 * 86400000) return e.peak.date;
  } catch (err) {}
  return null;
}

function renderEclipse() {
  var lc = state.svg.select('#layer-eclipse');
  lc.selectAll('*').remove();
  var info = document.getElementById('ecl-info');
  var date = state.astro.date, t = LANG[state.lang], E = state.eclipse;
  if (E.sel && Math.abs(E.sel.peak - date) > 3 * 86400000) E.sel = null;
  buildEclipseSelect();
  var act = eclipseActive(date);
  var lines = [];
  if (E.sel) lines.push(eclKindName(E.sel.kind, E.sel.type) + ' · ' + eclFmt(E.sel.peak) + ' UTC');
  if (act.solar) lines.push('☀ ' + t.eclNow + ': ' + t.eclSolarName.toLowerCase());
  if (act.lunar) lines.push('🌙 ' + t.eclNow + ': ' + t.eclLunarName.toLowerCase());
  if (info) info.textContent = lines.join('\n');
  if (!act.solar && !act.lunar) return;

  if (E.showArea) {
    if (act.solar) {
      var ak = Math.floor(date.getTime() / 60000);
      if (ECL.areaKey !== 's' + ak) { ECL.areaKey = 's' + ak; ECL.area = solarArea(date); }
      if (ECL.area) {
        lc.append('path').datum(ECL.area).attr('d', state.path)
          .attr('fill', 'rgba(255,140,0,0.32)').attr('stroke', '#ff9f1a').attr('stroke-width', 1.4)
          .attr('vector-effect', 'non-scaling-stroke').attr('pointer-events', 'none');
      }
    }
    if (act.lunar) {
      var mp = bodySubpoint('Moon', date);
      if (mp) {
        lc.append('path')
          .datum(d3.geoCircle().center([mp.lon, mp.lat]).radius(90).precision(0.5)())
          .attr('d', state.path).attr('fill', 'rgba(180,120,255,0.25)')
          .attr('stroke', '#b388ff').attr('stroke-width', 1.4)
          .attr('vector-effect', 'non-scaling-stroke').attr('pointer-events', 'none');
      }
    }
  }
  if (E.showTrack) {
    ['solar', 'lunar'].forEach(function(kind) {
      if (!act[kind]) return;
      var pk = eclipseNearPeak(kind, date);
      if (!pk) return;
      var tk = kind + pk.getTime();
      ECL.tr = ECL.tr || {};
      if (!ECL.tr[tk]) ECL.tr[tk] = eclipseTrack(kind, pk);
      var g = ECL.tr[tk];
      if (g) {
        lc.append('path').datum(g).attr('d', state.path).attr('fill', 'none')
          .attr('stroke', kind === 'solar' ? '#ffd23f' : '#c4a5ff').attr('stroke-width', 2.4)
          .attr('stroke-dasharray', '7,4').attr('vector-effect', 'non-scaling-stroke')
          .attr('pointer-events', 'none');
      }
    });
  }
}
