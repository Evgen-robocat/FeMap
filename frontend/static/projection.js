/**
 * projection.js — v7.2.0 — режимы проекции.
 *
 *   ae         — азимутальная равнопромежуточная (как раньше);
 *   shilova-r  — «карта с изогнутыми меридианами», закрутка по часовой/против (знак +1);
 *   shilova-l  — то же в другую сторону (знак −1).
 *
 * Идея: расстояние от центра ρ (0…π, на краю диска ρ = π) остаётся как в AE,
 * но каждая точка поворачивается вокруг центра на угол a(ρ) = s·arccos(ρ/π).
 * В полярных координатах линия «азимут = const» превращается в кривую
 * r = π·cos(α) — окружность диаметром π, проходящую через центр и касающуюся
 * края диска. При центре на полюсе меридианы становятся полуокружностями.
 * Край диска не поворачивается (a(π) = 0), поэтому контур, циферблат и
 * антипод остаются на месте; центр карты переходит в точку, где «север»
 * повёрнут на s·90°.
 * Поворот не меняет ρ, поэтому обратное преобразование точное.
 */
function twistRaw(s) {
  var ae = d3.geoAzimuthalEquidistantRaw;
  function ang(r) { return s * Math.acos(Math.min(1, r / Math.PI)); }
  function f(lam, phi) {
    var q = ae(lam, phi), r = Math.hypot(q[0], q[1]);
    if (r < 1e-12) return q;
    var a = ang(r), c = Math.cos(a), sn = Math.sin(a);
    return [q[0] * c - q[1] * sn, q[0] * sn + q[1] * c];
  }
  f.invert = function(x, y) {
    var r = Math.hypot(x, y);
    if (r < 1e-12) return ae.invert(x, y);
    var a = -ang(r), c = Math.cos(a), sn = Math.sin(a);
    return ae.invert(x * c - y * sn, x * sn + y * c);
  };
  return f;
}

/** Знак закрутки текущего режима: 0 — обычная AE. */
function projTwistSign() {
  return state.projMode === 'shilova-r' ? 1 : state.projMode === 'shilova-l' ? -1 : 0;
}

/** Новая проекция текущего режима с заданным вращением (без scale/translate/clip). */
function makeProjection(rotation) {
  var s = projTwistSign();
  var p = s ? d3.geoProjection(twistRaw(s)) : d3.geoAzimuthalEquidistant();
  return p.rotate(rotation);
}
