/**
 * phases.js — v7.1.3
 *  - фазы Луны и планет (Меркурий, Венера, Марс), опционально;
 *  - «реальная видимость»: планета серым, если она теряется в лучах Солнца
 *    (элонгация < REALVIS_MIN_ELONG) или (при включённом наблюдателе) ниже горизонта.
 */
var REALVIS_MIN_ELONG = 12;
var PHASE_PLANETS = ['Mercury', 'Venus', 'Mars'];

function phaseNameOf(angle, lang) {
  var t = LANG[lang];
  var names = [t.phNew, t.phWaxCres, t.phFirstQ, t.phWaxGib, t.phFull, t.phWanGib, t.phLastQ, t.phWanCres];
  return names[Math.floor(((angle + 22.5) % 360) / 45)];
}

/** { frac:0..1, angle:0..360 (Луна), text } либо null. */
function bodyPhase(key, date) {
  if (!astroOk()) return null;
  try {
    var ill = Astronomy.Illumination(Astronomy.Body[key], date);
    var frac = ill.phase_fraction;
    if (key === 'Moon') {
      var ang = Astronomy.MoonPhase(date);
      return { frac: frac, angle: ang, text: Math.round(frac * 100) + '% ' + phaseNameOf(ang, state.lang) };
    }
    return { frac: frac, text: Math.round(frac * 100) + '%' };
  } catch (e) { return null; }
}

/** Видимость планеты: { vis:bool, why:'sun'|'horizon'|null, elong } */
function planetVisible(key, date) {
  if (!state.realVis || !astroOk()) return { vis: true, why: null };
  try {
    var b = Astronomy.Body[key];
    var el = Astronomy.AngleFromSun(b, date);
    if (el < REALVIS_MIN_ELONG) return { vis: false, why: 'sun', elong: el };
    if (state.observer.on) {
      var o = state.observer, obs = new Astronomy.Observer(o.lat, o.lon, 0);
      var eq = Astronomy.Equator(b, date, obs, true, true);
      var hz = Astronomy.Horizon(date, obs, eq.ra, eq.dec, 'normal');
      if (hz.altitude < 0) return { vis: false, why: 'horizon', elong: el };
    }
    return { vis: true, why: null, elong: el };
  } catch (e) { return { vis: true, why: null }; }
}

function renderPhases() {
  var lm = state.svg.select('#layer-phase-mk');
  lm.selectAll('*').remove();
  if (!state.showPhase) return;
  var date = state.astro.date, tr = d3.zoomTransform(state.svg.node());
  var list = [];
  if (state.astro.showMoon) list.push({ key: 'Moon', color: '#c8deff', r: 9, below: true });
  if (state.astro.showPlanets) {
    PLANETS.forEach(function(pl) {
      if (PHASE_PLANETS.indexOf(pl.key) >= 0 && planetOn(pl.key)) list.push({ key: pl.key, color: pl.color, r: pl.r, below: false });
    });
  }
  list.forEach(function(b) {
    var ph = bodyPhase(b.key, date);
    var sp = bodySubpoint(b.key, date);
    if (!ph || !sp) return;
    var p = state.projection([sp.lon, sp.lat]);
    if (!p) return;
    var q = tr.apply(p);
    var below = b.below;
    if (below && state.astro.coordsOn.Moon !== false) { /* координаты сверху — фаза снизу */ }
    lm.append('text').attr('x', q[0]).attr('y', below ? q[1] + b.r + 14 : q[1] - b.r - 6)
      .attr('text-anchor', 'middle').attr('fill', b.color).attr('font-size', '9px')
      .attr('font-family', 'monospace').attr('stroke', 'rgba(0,0,0,0.7)').attr('stroke-width', 2.5)
      .attr('paint-order', 'stroke').attr('pointer-events', 'none').text(ph.text);
  });
}
