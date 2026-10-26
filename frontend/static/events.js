/**
 * events.js — v7.1.1
 *  - времена года: кнопки перехода к равноденствиям/солнцестояниям и
 *    отметки положения Солнца в эти моменты (чекбокс);
 *  - сумеречные пояса (гражданские / навигационные / астрономические);
 *  - неподвижная верхняя панель: дата/время и события, связанные с
 *    включёнными слоями.
 */
var SEASON_DEF = [
  { key: 'mar_equinox',  ru: 'Равноденствие (март)',  en: 'March equinox',     de: 'Märzäquinoktium',  sym: '♈', color: '#7dd87d' },
  { key: 'jun_solstice', ru: 'Солнцестояние (июнь)',  en: 'June solstice',     de: 'Juni-Sonnenwende', sym: '☀', color: '#ffd23f' },
  { key: 'sep_equinox',  ru: 'Равноденствие (сент.)', en: 'September equinox', de: 'Septemberäquinoktium', sym: '♎', color: '#ff9f66' },
  { key: 'dec_solstice', ru: 'Солнцестояние (дек.)',  en: 'December solstice', de: 'Dezember-Sonnenwende', sym: '❄', color: '#7fc8ff' }
];

var _seasCache = {};
function seasonsOf(year) {
  if (!astroOk()) return null;
  if (_seasCache[year]) return _seasCache[year];
  try {
    var s = Astronomy.Seasons(year);
    _seasCache[year] = [s.mar_equinox.date, s.jun_solstice.date, s.sep_equinox.date, s.dec_solstice.date];
  } catch (e) { _seasCache[year] = null; }
  return _seasCache[year];
}

function seasonName(i) { return SEASON_DEF[i][state.lang] || SEASON_DEF[i].ru; }

function jumpToSeason(i) {
  var d = seasonsOf(state.astro.date.getUTCFullYear());
  if (!d) return;
  astroPause();
  setAstroDate(new Date(d[i].getTime()), true);
  renderAstro();
}

/** Сезонное событие в пределах ±36 ч от даты: индекс или -1. */
function seasonNow(date) {
  var d = seasonsOf(date.getUTCFullYear());
  if (!d) return -1;
  for (var i = 0; i < 4; i++) if (Math.abs(d[i] - date) < 36 * 3600000) return i;
  return -1;
}

function renderSeasons() {
  var lm = state.svg.select('#layer-season-mk');
  lm.selectAll('*').remove();
  if (!state.showSeasonMk) return;
  var d = seasonsOf(state.astro.date.getUTCFullYear());
  if (!d) return;
  var tr = d3.zoomTransform(state.svg.node());
  d.forEach(function(dt, i) {
    var sp = getSunSubpoint(dt);
    var p = state.projection([sp.lon, sp.lat]);
    if (!p) return;
    var q = tr.apply(p);
    lm.append('circle').attr('cx', q[0]).attr('cy', q[1]).attr('r', 6)
      .attr('fill', SEASON_DEF[i].color).attr('stroke', '#111').attr('stroke-width', 1.4)
      .attr('pointer-events', 'none');
    shadowLabel(lm, q[0], q[1] - 10,
      SEASON_DEF[i].sym + ' ' + seasonName(i) + ' ' + dt.toISOString().slice(5, 16).replace('T', ' '),
      SEASON_DEF[i].color);
  });
}

/** Верхняя неподвижная панель. */
function renderTopInfo() {
  var el = document.getElementById('top-info');
  if (!el) return;
  if (!astroAnyOn()) { el.style.display = 'none'; return; }
  var d = state.astro.date, t = LANG[state.lang], A = state.astro;
  var iso = d.toISOString();
  var lines = [iso.slice(0, 10) + '  ' + iso.slice(11, 16) + ' UTC'];
  var act = eclipseActive(d);
  if (act.solar) lines.push('☀ ' + t.eclSolarName + ' — ' + t.eclNow);
  if (act.lunar) lines.push('🌙 ' + t.eclLunarName + ' — ' + t.eclNow);
  var tra = transitActive(d);                                  // v7.2.1
  if (tra) lines.push(TR_BODIES[tra.body].sym + ' ' + trName(tra) + ' — ' + t.eclNow);
  if (A.showNodes) {
    var np = moonNodePass(d);
    if (np) lines.push('⚠ ' + t.moonAtNode + ' ' + (np.which === 'rahu' ? '☊ ' + t.rahu : '☋ ' + t.ketu));
  }
  if (state.showPhase && A.showMoon) { var mph = bodyPhase('Moon', d); if (mph) lines.push('🌙 ' + mph.text); }
  var sn = seasonNow(d);
  if (sn >= 0) lines.push(SEASON_DEF[sn].sym + ' ' + seasonName(sn));
  if (state.observer.on) {
    var oi = observerInfo(d);
    if (oi) {
      lines.push('👁 ' + state.observer.lat.toFixed(1) + ', ' + state.observer.lon.toFixed(1) + ' · ' + twilightName(oi.sunAlt));
      oi.rows.forEach(function(r) {                       // v7.1.4: таблица высота / азимут
        lines.push(BODY_NAMES_OBS(r.key) + ' ' + (r.alt >= 0 ? '+' : '') + r.alt.toFixed(1) + '° / ' +
                   r.az.toFixed(0) + '°' + (r.alt < 0 ? ' ↓' : ''));
      });
    }
    if (state.observer.pick) lines.push('👆 ' + t.obsPickOn);
  }
  el.textContent = lines.join('\n');
  el.style.display = 'block';
}

function twilightName(sa) {
  var t = LANG[state.lang];
  return sa > 0 ? t.obsDay : sa > -6 ? t.obsCivil : sa > -12 ? t.obsNaut : sa > -18 ? t.obsAstro : t.obsNight;
}

function updateSeasonButtons() {
  for (var i = 0; i < 4; i++) {
    var b = document.getElementById('btn-season-' + i);
    if (b) b.textContent = SEASON_DEF[i].sym + ' ' + seasonName(i);
  }
}
