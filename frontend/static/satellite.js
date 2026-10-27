/**
 * satellite.js — v6.9.0
 * «Фото-слой» (бывш. «Вид из космоса»): дневная текстура Земли (и ночная с огнями городов)
 * перепроецируется в текущую азимутальную равноудалённую проекцию с любым
 * центром. Текстуры: Solar System Scope, CC BY 4.0 (на основе данных NASA).
 * Результат — одно изображение в слое #layer-sat (внутри map-content, поэтому
 * зум/панорама бесплатны). Перерисовка — только при смене центра, размера
 * или (с ночной стороной) положения Солнца более чем на 0.25°.
 */
var SAT = { day: null, night: null, dayc: null, dayCLoading: false, dayCFailed: false, loading: false, key: '', drawn: false,
            last: 0, timer: null, url: null, failed: false };

function satLoadTex(url, cb) {
  var img = new Image();
  img.onload = function() {
    var c = document.createElement('canvas');
    var sc = Math.min(1, SAT_TEX_MAXW / img.naturalWidth);       // v7.2.11: большие снимки уменьшаем
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    var cx = c.getContext('2d');
    cx.drawImage(img, 0, 0, c.width, c.height);
    var id = cx.getImageData(0, 0, c.width, c.height);
    cb({ w: c.width, h: c.height, d: id.data });
  };
  img.onerror = function() { cb(null); };
  img.src = url;
}

function satEnsureTextures() {
  if (SAT.day && SAT.night) return true;
  if (SAT.loading || SAT.failed) return false;
  SAT.loading = true;
  satLoadTex(SAT_DAY_URL, function(d) {
    satLoadTex(SAT_NIGHT_URL, function(n) {
      SAT.loading = false;
      if (!d || !n) {
        SAT.failed = true;
        state.showSat = false;
        var chk = document.getElementById('chk-sat');
        if (chk) chk.checked = false;
        if (typeof setStatus === 'function') setStatus(LANG[state.lang].errSat);
        return;
      }
      SAT.day = d; SAT.night = n;
      renderSatellite(true);
    });
  });
  return false;
}

/** v7.2.11: цветной снимок с облаками грузится только при включённом чекбоксе. */
function satEnsureDayClouds() {
  if (SAT.dayc) return true;
  if (SAT.dayCLoading || SAT.dayCFailed) return false;
  SAT.dayCLoading = true;
  satLoadTex(SAT_DAYCLOUDS_URL, function(c) {
    SAT.dayCLoading = false;
    if (!c) {
      SAT.dayCFailed = true;
      state.showSatClouds = false;
      var chk = document.getElementById('chk-sat-clouds');
      if (chk) chk.checked = false;
      if (typeof setStatus === 'function') setStatus(LANG[state.lang].errSatClouds);
    } else SAT.dayc = c;
    renderSatellite(true);
  });
  return false;
}

function satSample(t, lon, lat, out) {
  var fx = (lon + 180) / 360 * t.w - 0.5;
  var fy = (90 - lat) / 180 * t.h - 0.5;
  var x0 = Math.floor(fx), y0 = Math.floor(fy);
  var ax = fx - x0, ay = fy - y0;
  var x1 = x0 + 1;
  x0 = ((x0 % t.w) + t.w) % t.w; x1 = ((x1 % t.w) + t.w) % t.w;
  var y1 = y0 + 1;
  if (y0 < 0) y0 = 0; if (y1 < 0) y1 = 0;
  if (y0 > t.h - 1) y0 = t.h - 1; if (y1 > t.h - 1) y1 = t.h - 1;
  var d = t.d, W = t.w;
  var i00 = (y0 * W + x0) * 4, i10 = (y0 * W + x1) * 4,
      i01 = (y1 * W + x0) * 4, i11 = (y1 * W + x1) * 4;
  for (var c = 0; c < 3; c++) {
    var top = d[i00 + c] + (d[i10 + c] - d[i00 + c]) * ax;
    var bot = d[i01 + c] + (d[i11 + c] - d[i01 + c]) * ax;
    out[c] = top + (bot - top) * ay;
  }
}

function renderSatellite(force) {
  if (!state.svg || !state.projection) return;
  var layer = state.svg.select('#layer-sat');
  if (!state.showSat) {
    if (SAT.drawn) {
      layer.selectAll('*').remove();
      (SAT.urls || []).forEach(function(u) { URL.revokeObjectURL(u); });
      SAT.urls = []; SAT.drawn = false; SAT.key = '';
    }
    return;
  }
  if (!satEnsureTextures()) return;

  var proj = state.projection, k = proj.scale(), tr = proj.translate();
  var R = k * Math.PI;
  var N = Math.max(200, Math.min(SAT_MAX_PX, Math.ceil(2 * R * Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)))));
  var night = !!state.showSatNight;
  var clouds = !!state.showSatClouds && satEnsureDayClouds();   // v7.2.11: true только когда снимок загружен
  /* v7.1.6: картинки зависят только от центра и размера, а не от времени.
     Ночная сторона — вторая картинка под маской из кругов (меняется каждый кадр,
     но это дешёвый SVG, а не перепроекция текстуры). */
  var key = [state.lon, state.lat, Math.round(k * 10), Math.round(tr[0]), Math.round(tr[1]), N, night ? 1 : 0, clouds ? 1 : 0, state.projMode].join('|');
  if (force || key !== SAT.key) {
    if (SAT.building === key) { satUpdateNightMask(); return; }
    SAT.key = key;
    satBuildImages(layer, proj, k, tr, R, N, night, key, clouds);
  }
  satUpdateNightMask();
}

/** Дорогая часть: перепроекция текстур в две картинки (день; ночь = тёмная суша + огни). */
function satBuildImages(layer, proj, k, tr, R, N, night, key, clouds) {
  var dayTex = clouds ? SAT.dayc : SAT.day;
  SAT.building = key;
  var D = 2 * R, s = D / N, x0 = tr[0] - R, y0 = tr[1] - R;
  var rot = d3.geoRotation(proj.rotate());
  var cvD = document.createElement('canvas'); cvD.width = N; cvD.height = N;
  var imgD = cvD.getContext('2d').createImageData(N, N), outD = imgD.data;
  var cvN = null, imgN = null, outN = null;
  if (night) {
    cvN = document.createElement('canvas'); cvN.width = N; cvN.height = N;
    imgN = cvN.getContext('2d').createImageData(N, N); outN = imgN.data;
  }
  var DEG = 180 / Math.PI, tw = projTwistSign();
  var pd = [0, 0, 0], pn = [0, 0, 0];
  var t0 = Date.now();

  for (var j = 0; j < N; j++) {
    var Y = -((y0 + (j + 0.5) * s) - tr[1]) / k;
    for (var i = 0; i < N; i++) {
      var X0 = ((x0 + (i + 0.5) * s) - tr[0]) / k, X = X0, Yr = Y;
      var rho = Math.sqrt(X * X + Y * Y);
      var o = (j * N + i) * 4;
      if (rho > Math.PI) continue;                       // альфа 0
      if (tw) {                                          // v7.2.0: обратная закрутка Шиловой
        var ta = -tw * Math.acos(Math.min(1, rho / Math.PI)), tc = Math.cos(ta), ts = Math.sin(ta);
        X = X0 * tc - Y * ts; Yr = X0 * ts + Y * tc;
      }
      var lam, phi;
      if (rho < 1e-9) { lam = 0; phi = 0; }
      else {
        var sc = Math.sin(rho), cc = Math.cos(rho);
        var sp = Yr * sc / rho;
        phi = Math.asin(sp > 1 ? 1 : sp < -1 ? -1 : sp);
        lam = Math.atan2(X * sc, rho * cc);
      }
      var ll = rot.invert([lam * DEG, phi * DEG]);
      satSample(dayTex, ll[0], ll[1], pd);
      outD[o] = pd[0]; outD[o + 1] = pd[1]; outD[o + 2] = pd[2]; outD[o + 3] = 255;
      if (night) {
        satSample(SAT.night, ll[0], ll[1], pn);
        outN[o]     = pd[0] * 0.05 + pn[0] * 1.1;
        outN[o + 1] = pd[1] * 0.05 + pn[1] * 1.1;
        outN[o + 2] = pd[2] * 0.05 + pn[2] * 1.1;
        outN[o + 3] = 255;
      }
    }
  }
  cvD.getContext('2d').putImageData(imgD, 0, 0);
  if (night) cvN.getContext('2d').putImageData(imgN, 0, 0);
  SAT.ms = Date.now() - t0;

  var pending = night ? 2 : 1, urls = [];
  var done = function() {
    if (--pending > 0) return;
    if (SAT.building !== key || !state.showSat) { urls.forEach(function(u) { URL.revokeObjectURL(u); }); return; }
    (SAT.urls || []).forEach(function(u) { URL.revokeObjectURL(u); });
    SAT.urls = urls;
    layer.selectAll('*').remove();
    layer.append('clipPath').attr('id', 'sat-clip').append('circle')
      .attr('cx', tr[0]).attr('cy', tr[1]).attr('r', R);
    layer.append('image').attr('href', urls[0]).attr('x', x0).attr('y', y0)
      .attr('width', D).attr('height', D).attr('clip-path', 'url(#sat-clip)')
      .attr('pointer-events', 'none');
    if (night) {
      layer.append('mask').attr('id', 'sat-night-mask').attr('maskUnits', 'userSpaceOnUse')
        .attr('x', x0).attr('y', y0).attr('width', D).attr('height', D)
        .append('g').attr('id', 'sat-mask-g');
      layer.append('image').attr('id', 'sat-night-img').attr('href', urls[1]).attr('x', x0).attr('y', y0)
        .attr('width', D).attr('height', D).attr('clip-path', 'url(#sat-clip)')
        .attr('mask', 'url(#sat-night-mask)').attr('pointer-events', 'none');
    }
    SAT.drawn = true; SAT.building = null; SAT.maskKey = '';
    satUpdateNightMask();
  };
  cvD.toBlob(function(b) { if (b) urls[0] = URL.createObjectURL(b); done(); }, 'image/jpeg', 0.9);
  if (night) cvN.toBlob(function(b) { if (b) urls[1] = URL.createObjectURL(b); done(); }, 'image/jpeg', 0.9);
}

/** Дешёвая часть (каждый кадр): маска ночной стороны — вложенные круги вокруг антипода Солнца. */
function satUpdateNightMask() {
  if (!state.showSat || !state.showSatNight || !SAT.drawn) return;
  var g = state.svg.select('#sat-mask-g');
  if (g.empty()) return;
  var sun = getSunSubpoint(state.astro.date);
  var mk = Math.round(sun.lon * 20) + ',' + Math.round(sun.lat * 20) + '|' + SAT.key;
  if (SAT.maskKey === mk) return;
  SAT.maskKey = mk;
  g.selectAll('*').remove();
  var aLat = -sun.lat, aLon = sun.lon >= 0 ? sun.lon - 180 : sun.lon + 180;
  /* переход день→ночь на ψ = 85.4°…94.6° от Солнца, то есть на 85.4°…94.6° от антипода;
     m(φ) = 1 − smoothstep: рисуем круги от большого к малому с накоплением яркости */
  var NS = 14, lo = 85.4, hi = 94.6, prev = 0;
  for (var j = 1; j <= NS; j++) {
    var t = j / NS, mj = t * t * (3 - 2 * t);
    var a = (mj - prev) / (1 - prev); prev = mj;
    var rad = hi - (hi - lo) * (j - 1) / (NS - 1);
    g.append('path')
      .datum(d3.geoCircle().center([aLon, aLat]).radius(rad).precision(1.5)())
      .attr('d', state.path).attr('fill', '#fff').attr('fill-opacity', Math.max(0, Math.min(1, a)));
  }
}
