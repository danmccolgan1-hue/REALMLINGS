/* Realmlings — isometric buildings. World x runs down-right, y runs down-left, z is up.
   The capital sits at the province center (0,0); one tower grows through three stages. */
(function (root) {
'use strict';
const OL = '#1d1a22', TAU = Math.PI * 2;
const ISO = (x, y, z = 0) => [x - y, (x + y) * 0.5 - z];
const C = {
  stone: '#cfc8ba', wood: '#b07a45', plaster: '#f1e8d2', roofB: '#3f72d9', roofR: '#c8473d', thatch: '#e0b95a',
  gold: '#f4c44f', goldD: '#c99a2c', dirt: '#d9b77a', pave: '#d8d2c4', grass: '#9bd95f', grassD: '#76b744',
  water: '#45a8e4', cloth: '#efe6cf', banner: '#3f72d9', leaf: '#4ba557', iron: '#5b6270', glass: '#ffd36b'
};
function mix(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return '#' + ch.map(v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))).toString(16).padStart(2, '0')).join('');
}
const lite = h => mix(h, 1.22), dark = h => mix(h, 0.78), darker = h => mix(h, 0.62);
function path(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }
function face(g, pts, col, tex, lw = 2.6) {
  path(g, pts); g.fillStyle = col; g.fill();
  if (tex) { g.save(); path(g, pts); g.clip(); tex(); g.restore(); path(g, pts); }
  g.lineWidth = lw; g.strokeStyle = OL; g.lineJoin = 'round'; g.stroke();
}
function line(g, a, b, col, w) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.strokeStyle = col; g.lineWidth = w; g.stroke(); }
const SEAM = 'rgba(60,40,30,0.28)';

// ---------- textures ----------
function stoneTexLeft(g, x, y, z, w, h) { // face at y fixed, spanning x..x+w, z..z+h
  for (let zz = z + 9, row = 0; zz < z + h; zz += 9, row++) {
    line(g, ISO(x, y, zz), ISO(x + w, y, zz), SEAM, 1.2);
    for (let xx = x + (row % 2 ? 7 : 14); xx < x + w; xx += 14) line(g, ISO(xx, y, zz), ISO(xx, y, zz + 9), SEAM, 1.2);
  }
}
function stoneTexRight(g, x, y, z, d, h) { // face at x fixed, spanning y..y+d
  for (let zz = z + 9, row = 0; zz < z + h; zz += 9, row++) {
    line(g, ISO(x, y, zz), ISO(x, y + d, zz), SEAM, 1.2);
    for (let yy = y + (row % 2 ? 7 : 14); yy < y + d; yy += 14) line(g, ISO(x, yy, zz), ISO(x, yy, zz + 9), SEAM, 1.2);
  }
}
function plankLeft(g, x, y, z, w, h) { for (let xx = x + 6; xx < x + w; xx += 6) line(g, ISO(xx, y, z), ISO(xx, y, z + h), SEAM, 1.1); }
function plankRight(g, x, y, z, d, h) { for (let yy = y + 6; yy < y + d; yy += 6) line(g, ISO(x, yy, z), ISO(x, yy, z + h), SEAM, 1.1); }

// ---------- box ----------
function prism(g, x, y, z, w, d, h, col, tex) {
  const L = [ISO(x, y + d, z), ISO(x + w, y + d, z), ISO(x + w, y + d, z + h), ISO(x, y + d, z + h)];
  const Rt = [ISO(x + w, y + d, z), ISO(x + w, y, z), ISO(x + w, y, z + h), ISO(x + w, y + d, z + h)];
  const T = [ISO(x, y, z + h), ISO(x + w, y, z + h), ISO(x + w, y + d, z + h), ISO(x, y + d, z + h)];
  face(g, L, col, tex === 'stone' ? () => stoneTexLeft(g, x, y + d, z, w, h) : tex === 'wood' ? () => plankLeft(g, x, y + d, z, w, h) : null);
  face(g, Rt, dark(col), tex === 'stone' ? () => stoneTexRight(g, x + w, y, z, d, h) : tex === 'wood' ? () => plankRight(g, x + w, y, z, d, h) : null);
  face(g, T, lite(col));
  // highlight on the near top edge
  line(g, ISO(x + 2, y + d, z + h - 1.5), ISO(x + w - 2, y + d, z + h - 1.5), 'rgba(255,255,255,0.45)', 1.6);
}
function merlonsRect(g, x, y, z, w, d, col, step = 12) {
  const list = [];
  for (let xx = x; xx <= x + w - 6; xx += step) { list.push([xx, y]); list.push([xx, y + d - 6]); }
  for (let yy = y + step; yy <= y + d - 12; yy += step) { list.push([x, yy]); list.push([x + w - 6, yy]); }
  list.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1])).forEach(([mx, my]) => prism(g, mx, my, z, 6, 6, 8, col));
}

// ---------- round towers ----------
function cylBody(g, cx, cy, z0, z1, r, col, tex) {
  const [sx, sb] = ISO(cx, cy, z0), st = ISO(cx, cy, z1)[1], rx = r * Math.SQRT2, ry = rx / 2;
  const body = () => { g.beginPath(); g.moveTo(sx - rx, st); g.lineTo(sx - rx, sb); g.ellipse(sx, sb, rx, ry, 0, Math.PI, 0, true); g.lineTo(sx + rx, st); g.ellipse(sx, st, rx, ry, 0, 0, Math.PI, false); g.closePath(); };
  const gr = g.createLinearGradient(sx - rx, 0, sx + rx, 0);
  gr.addColorStop(0, lite(col)); gr.addColorStop(0.24, lite(col)); gr.addColorStop(0.24, col); gr.addColorStop(0.62, col); gr.addColorStop(0.62, dark(col)); gr.addColorStop(1, dark(col));
  body(); g.fillStyle = gr; g.fill();
  g.save(); body(); g.clip();
  if (tex === 'stone') {
    for (let zz = z0 + 10, row = 0; zz < z1; zz += 10, row++) {
      const y = ISO(cx, cy, zz)[1];
      g.beginPath(); g.ellipse(sx, y, rx, ry, 0, 0, Math.PI); g.strokeStyle = SEAM; g.lineWidth = 1.2; g.stroke();
      for (let u = (row % 2 ? -0.82 : -0.62); u < 0.95; u += 0.4) { const yy = y + ry * Math.sqrt(1 - u * u); line(g, [sx + u * rx, yy], [sx + u * rx, yy - 10], SEAM, 1.2); }
    }
  } else if (tex === 'wood') {
    for (let u = -0.85; u < 0.9; u += 0.17) { const yy = sb + ry * Math.sqrt(1 - u * u); line(g, [sx + u * rx, yy], [sx + u * rx, st + ry * Math.sqrt(1 - u * u)], SEAM, 1.1); }
  }
  g.restore();
  body(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
  return { sx, st, sb, rx, ry };
}
function cylCap(g, cx, cy, z, r, col) {
  const [sx, sy] = ISO(cx, cy, z), rx = r * Math.SQRT2;
  g.beginPath(); g.ellipse(sx, sy, rx, rx / 2, 0, 0, TAU); g.fillStyle = lite(col); g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
}
function cylinder(g, cx, cy, z0, z1, r, col, tex) { const b = cylBody(g, cx, cy, z0, z1, r, col, tex); cylCap(g, cx, cy, z1, r, col); return b; }
function windowsOn(g, cx, cy, z, r, us, h = 15, glow = 0) {
  const [sx, sy] = ISO(cx, cy, z), rx = r * Math.SQRT2, ry = rx / 2;
  for (const u of us) {
    const k = Math.sqrt(1 - u * u), x = sx + u * rx * 0.92, y = sy + ry * k * 0.92, w = 5.5 * k + 1.5;
    g.beginPath(); g.moveTo(x - w, y); g.lineTo(x - w, y - h + w); g.arc(x, y - h + w, w, Math.PI, 0); g.lineTo(x + w, y); g.closePath();
    g.fillStyle = glow ? C.glass : '#2a2731'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    if (glow) { g.fillStyle = 'rgba(255,240,180,0.6)'; g.fillRect(x - w * 0.6, y - h + w, w * 0.5, h - w - 2); }
  }
}
function door(g, cx, cy, r, h = 22, w = 8, col = '#7b5029') {
  const [sx, sy] = ISO(cx, cy, 0), ry = r * Math.SQRT2 / 2, x = sx, y = sy + ry * 0.95;
  g.beginPath(); g.moveTo(x - w, y); g.lineTo(x - w, y - h + w); g.arc(x, y - h + w, w, Math.PI, 0); g.lineTo(x + w, y); g.closePath();
  g.fillStyle = col; g.fill(); g.save(); g.clip(); for (let k = -w + 4; k < w; k += 4) line(g, [x + k, y], [x + k, y - h], 'rgba(0,0,0,0.25)', 1.2); g.restore();
  g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  g.fillStyle = C.gold; g.beginPath(); g.arc(x + w * 0.45, y - h * 0.4, 1.6, 0, TAU); g.fill();
}
function cone(g, cx, cy, z, r, h, col, finial) {
  const [sx, sb] = ISO(cx, cy, z), [, ay] = ISO(cx, cy, z + h), rx = r * Math.SQRT2, ry = rx / 2;
  const shape = () => { g.beginPath(); g.moveTo(sx - rx, sb); g.lineTo(sx, ay); g.lineTo(sx + rx, sb); g.ellipse(sx, sb, rx, ry, 0, 0, Math.PI, false); g.closePath(); };
  const gr = g.createLinearGradient(sx - rx, 0, sx + rx, 0);
  gr.addColorStop(0, lite(col)); gr.addColorStop(0.3, lite(col)); gr.addColorStop(0.3, col); gr.addColorStop(0.6, col); gr.addColorStop(0.6, dark(col)); gr.addColorStop(1, dark(col));
  shape(); g.fillStyle = gr; g.fill();
  g.save(); shape(); g.clip();
  for (let f = 0.25; f < 1; f += 0.18) { const yy = sb + (ay - sb) * f, k = 1 - f; g.beginPath(); g.ellipse(sx, yy, rx * k, ry * k, 0, 0, Math.PI); g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1.4; g.stroke(); }
  g.restore();
  shape(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
  if (finial) { g.beginPath(); g.arc(sx, ay - 3, 4, 0, TAU); g.fillStyle = C.gold; g.fill(); g.lineWidth = 2; g.stroke(); }
  return [sx, ay];
}
function crenelRing(g, cx, cy, z, r, col, n = 12) {
  const pts = [];
  for (let k = 0; k < n; k++) { const a = k * TAU / n + 0.13; pts.push([cx + Math.cos(a) * (r - 3.5), cy + Math.sin(a) * (r - 3.5)]); }
  pts.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1])).forEach(([x, y]) => prism(g, x - 3.5, y - 3.5, z, 7, 7, 9, col));
}
function flag(g, x, y, t, len = 28, col = C.banner, pole = 26) {
  line(g, [x, y], [x, y - pole], OL, 4.5); line(g, [x, y], [x, y - pole], C.goldD, 2.2);
  const top = y - pole + 2, pts = [];
  for (let k = 0; k <= 6; k++) pts.push([x + len * k / 6, top + Math.sin(t * 5 - k * 0.9) * 2.4 * (k / 6)]);
  for (let k = 6; k >= 0; k--) pts.push([x + len * k / 6, top + 13 + Math.sin(t * 5 - k * 0.9) * 2.4 * (k / 6) - (k === 6 ? 4 : 0)]);
  path(g, pts); g.fillStyle = col; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(x + len * 0.42, top + 6.5 + Math.sin(t * 5 - 2.5) * 1.2, 2.8, 0, TAU); g.fillStyle = C.gold; g.fill(); g.lineWidth = 1.4; g.stroke();
  g.beginPath(); g.arc(x, y - pole - 2, 2.6, 0, TAU); g.fillStyle = C.gold; g.fill(); g.lineWidth = 1.6; g.stroke();
}
function hangingBanner(g, x, y, h, t, col = C.banner) {
  const sw = Math.sin(t * 2 + x) * 1.2;
  path(g, [[x - 7, y], [x + 7, y], [x + 7 + sw, y + h], [x + sw, y + h - 6], [x - 7 + sw, y + h]]); g.fillStyle = col; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(x + sw * 0.5, y + h * 0.35, 3.5, 0, TAU); g.fillStyle = C.gold; g.fill(); g.lineWidth = 1.4; g.stroke();
  line(g, [x - 9, y], [x + 9, y], OL, 4); line(g, [x - 9, y], [x + 9, y], C.goldD, 2);
}
function smoke(g, x, y, t, n = 4, scale = 1) {
  for (let k = 0; k < n; k++) {
    const f = ((t * 0.35 + k / n) % 1), r = (4 + f * 9) * scale;
    g.globalAlpha = 0.55 * (1 - f); g.fillStyle = '#eef0f4';
    g.beginPath(); g.arc(x + Math.sin(f * 5 + k) * 5 + f * 12, y - f * 46 * scale, r, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

// ---------- small props ----------
function house(g, x, y, w, d, h, roof, t, opts = {}) {
  const rh = d * 0.62, o = 4;
  prism(g, x, y, 0, w, d, h, opts.wall || C.plaster, opts.wallTex);
  if (!opts.wallTex) { // timber beams
    line(g, ISO(x, y + d, h * 0.55), ISO(x + w, y + d, h * 0.55), '#7b5029', 2.2);
    for (const f of [0.02, 0.5, 0.98]) line(g, ISO(x + w * f, y + d, 0), ISO(x + w * f, y + d, h), '#7b5029', 2.2);
  }
  const gx = x + w;
  face(g, [ISO(gx, y + d, h), ISO(gx, y, h), ISO(gx, y + d / 2, h + rh)], dark(opts.wall || C.plaster));
  if (opts.chimney) { prism(g, x + w * 0.62, y + d * 0.18, h, 7, 7, rh + 10, C.stone, 'stone'); }
  const slope = [ISO(x - o, y + d + o, h - 2), ISO(x + w + o, y + d + o, h - 2), ISO(x + w + o, y + d / 2, h + rh), ISO(x - o, y + d / 2, h + rh)];
  face(g, slope, roof, () => { for (let f = 0.22; f < 1; f += 0.2) line(g, ISO(x - o, y + d + o - (d / 2 + o) * f, h - 2 + (rh + 2) * f), ISO(x + w + o, y + d + o - (d / 2 + o) * f, h - 2 + (rh + 2) * f), 'rgba(0,0,0,0.22)', 1.4); line(g, ISO(x - o, y + d + o - 1, h - 1), ISO(x + w + o, y + d + o - 1, h - 1), 'rgba(255,255,255,0.35)', 3); });
  line(g, ISO(x - o, y + d / 2, h + rh), ISO(x + w + o, y + d / 2, h + rh), OL, 4); line(g, ISO(x - o, y + d / 2, h + rh), ISO(x + w + o, y + d / 2, h + rh), dark(roof), 2);
  // door and windows on the near long wall
  const dx = x + w * 0.3;
  face(g, [ISO(dx, y + d, 0), ISO(dx + 9, y + d, 0), ISO(dx + 9, y + d, 15), ISO(dx, y + d, 15)], '#7b5029', null, 2);
  for (const wx of [x + w * 0.62, x + w * 0.82]) if (wx + 6 < x + w) face(g, [ISO(wx, y + d, h * 0.62), ISO(wx + 6, y + d, h * 0.62), ISO(wx + 6, y + d, h * 0.62 + 7), ISO(wx, y + d, h * 0.62 + 7)], opts.lit ? C.glass : '#2a2731', null, 1.8);
  if (opts.chimney) { const [cx2, cy2] = ISO(x + w * 0.62 + 3.5, y + d * 0.18 + 3.5, h + rh + 10); smoke(g, cx2, cy2 - 2, t, 4, 0.8); }
}
function tent(g, x, y, w, d, h, col, stripe) {
  face(g, [ISO(x + w, y + d, 0), ISO(x + w, y, 0), ISO(x + w, y + d / 2, h)], dark(col));
  const [ox, oy] = ISO(x + w, y + d / 2, 0); path(g, [[ox - 5, oy - 0], [ox, oy - h * 0.62], [ox + 5, oy]]); g.fillStyle = '#2a2731'; g.fill();
  face(g, [ISO(x, y + d, 0), ISO(x + w, y + d, 0), ISO(x + w, y + d / 2, h), ISO(x, y + d / 2, h)], col, stripe ? () => { for (let xx = x + 6; xx < x + w; xx += 12) path(g, [ISO(xx, y + d, 0), ISO(xx + 6, y + d, 0), ISO(xx + 6, y + d / 2, h), ISO(xx, y + d / 2, h)]), g.fillStyle = stripe, g.fill(); } : null);
  line(g, ISO(x - 3, y + d / 2, h), ISO(x + w + 3, y + d / 2, h), OL, 3.5); line(g, ISO(x - 3, y + d / 2, h), ISO(x + w + 3, y + d / 2, h), C.wood, 1.6);
}
function crate(g, x, y, s = 12) { prism(g, x, y, 0, s, s, s, C.wood, 'wood'); line(g, ISO(x, y + s, 0), ISO(x + s, y + s, s), '#7b5029', 1.8); }
function barrel(g, x, y) {
  const b = cylinder(g, x, y, 0, 14, 6, '#a86d3c', 'wood');
  for (const z of [3, 11]) { const yy = ISO(x, y, z)[1]; g.beginPath(); g.ellipse(b.sx, yy, b.rx, b.ry, 0, 0, Math.PI); g.strokeStyle = C.iron; g.lineWidth = 2; g.stroke(); }
}
function campfire(g, x, y, t) {
  const [sx, sy] = ISO(x, y, 0);
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; g.beginPath(); g.ellipse(sx + Math.cos(a) * 13, sy + Math.sin(a) * 6.5, 3.6, 2.6, 0, 0, TAU); g.fillStyle = '#a7a9b3'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke(); }
  line(g, [sx - 9, sy + 2], [sx + 9, sy - 3], OL, 6); line(g, [sx - 9, sy + 2], [sx + 9, sy - 3], C.wood, 3);
  line(g, [sx - 8, sy - 3], [sx + 8, sy + 2], OL, 6); line(g, [sx - 8, sy - 3], [sx + 8, sy + 2], '#8a5a31', 3);
  const fl = 1 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7) * 0.08;
  const glowG = g.createRadialGradient(sx, sy - 6, 0, sx, sy - 6, 36); glowG.addColorStop(0, 'rgba(255,190,90,0.45)'); glowG.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = glowG; g.beginPath(); g.arc(sx, sy - 6, 36, 0, TAU); g.fill();
  path(g, [[sx - 7, sy], [sx - 3, sy - 14 * fl], [sx, sy - 8], [sx + 3, sy - 19 * fl], [sx + 7, sy]]); g.fillStyle = '#ff9a3c'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  path(g, [[sx - 3, sy], [sx, sy - 10 * fl], [sx + 3, sy]]); g.fillStyle = '#ffe680'; g.fill();
  smoke(g, sx, sy - 22, t, 4, 0.9);
}
function well(g, x, y, t) {
  const b = cylinder(g, x, y, 0, 11, 10, C.stone, 'stone');
  const [sx, sy] = ISO(x, y, 11); g.beginPath(); g.ellipse(sx, sy, b.rx - 3, b.ry - 1.5, 0, 0, TAU); g.fillStyle = '#2f6f9a'; g.fill();
  for (const dx of [-10, 10]) { line(g, [sx + dx, sy + 2], [sx + dx, sy - 26], OL, 5); line(g, [sx + dx, sy + 2], [sx + dx, sy - 26], C.wood, 2.6); }
  path(g, [[sx - 16, sy - 24], [sx, sy - 36], [sx + 16, sy - 24]]); g.fillStyle = C.roofR; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  line(g, [sx, sy - 24], [sx, sy - 10 + Math.sin(t * 2)], OL, 1.4);
  path(g, [[sx - 3, sy - 10], [sx + 3, sy - 10], [sx + 2.5, sy - 4], [sx - 2.5, sy - 4]]); g.fillStyle = C.wood; g.fill(); g.lineWidth = 1.4; g.stroke();
}
function dummy(g, x, y, t) {
  const [sx, sy] = ISO(x, y, 0), sw = Math.sin(t * 3) * 0.05;
  g.save(); g.translate(sx, sy); g.rotate(sw);
  line(g, [0, 0], [0, -34], OL, 5); line(g, [0, 0], [0, -34], C.wood, 2.6);
  line(g, [-12, -26], [12, -26], OL, 5); line(g, [-12, -26], [12, -26], C.wood, 2.6);
  g.beginPath(); g.ellipse(0, -22, 7, 10, 0, 0, TAU); g.fillStyle = C.thatch; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(0, -38, 6, 0, TAU); g.fillStyle = C.cloth; g.fill(); g.stroke();
  line(g, [-3, -40], [3, -36], OL, 1.5); line(g, [3, -40], [-3, -36], OL, 1.5);
  g.restore();
}
function tree(g, x, y, s = 1) {
  const [sx, sy] = ISO(x, y, 0);
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(sx, sy, 12 * s, 5 * s, 0, 0, TAU); g.fill();
  path(g, [[sx - 3 * s, sy], [sx - 3 * s, sy - 12 * s], [sx + 3 * s, sy - 12 * s], [sx + 3 * s, sy]]); g.fillStyle = '#7a4a2a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  const blobs = [[0, -24, 12], [-8, -17, 8], [8, -17, 8]].map(([a, b, r]) => [sx + a * s, sy + b * s, r * s]);
  g.lineWidth = 4.5; for (const [a, b, r] of blobs) { g.beginPath(); g.arc(a, b, r, 0, TAU); g.strokeStyle = OL; g.stroke(); }
  for (const [a, b, r] of blobs) { g.beginPath(); g.arc(a, b, r, 0, TAU); g.fillStyle = C.leaf; g.fill(); }
  g.fillStyle = '#7fcf63'; g.beginPath(); g.arc(sx - 4 * s, sy - 28 * s, 4 * s, 0, TAU); g.fill();
}
function fountain(g, x, y, t) {
  const b = cylinder(g, x, y, 0, 9, 18, C.stone, 'stone');
  const [sx, sy] = ISO(x, y, 9); g.beginPath(); g.ellipse(sx, sy, b.rx - 4, b.ry - 2, 0, 0, TAU); g.fillStyle = C.water; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(sx, sy, (b.rx - 8) * (0.6 + 0.3 * Math.sin(t * 3)), (b.ry - 4) * (0.6 + 0.3 * Math.sin(t * 3)), 0, 0, TAU); g.stroke();
  cylinder(g, x, y, 9, 26, 3.5, C.stone);
  const [tx, ty] = ISO(x, y, 26);
  for (let k = 0; k < 6; k++) { const a = k * TAU / 6, f = (t * 0.9 + k / 6) % 1; g.fillStyle = 'rgba(160,215,250,' + (0.9 - f * 0.7).toFixed(2) + ')'; g.beginPath(); g.arc(tx + Math.cos(a) * 16 * f, ty - 10 * Math.sin(f * Math.PI) + Math.sin(a) * 8 * f + f * 10, 2.2, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(tx, ty - 3, 4, 0, TAU); g.fillStyle = C.water; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
}
function stall(g, x, y, col, t) {
  for (const [dx, dy] of [[0, 0], [16, 0], [0, 12], [16, 12]]) { const [a, b] = ISO(x + dx, y + dy, 0); line(g, [a, b], [a, b - 20], OL, 4); line(g, [a, b], [a, b - 20], C.wood, 2); }
  prism(g, x - 2, y - 2, 8, 20, 16, 5, C.wood, 'wood');
  for (const [k, cc] of [[0, '#e05a4a'], [1, '#ffd36b'], [2, '#7fcf63']]) { const [a, b] = ISO(x + 4 + k * 5, y + 7, 13); g.beginPath(); g.arc(a, b, 2.6, 0, TAU); g.fillStyle = cc; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke(); }
  face(g, [ISO(x - 3, y + 15, 18), ISO(x + 19, y + 15, 18), ISO(x + 19, y + 6, 27), ISO(x - 3, y + 6, 27)], col, () => { for (let xx = x; xx < x + 19; xx += 8) path(g, [ISO(xx, y + 15, 18), ISO(xx + 4, y + 15, 18), ISO(xx + 4, y + 6, 27), ISO(xx, y + 6, 27)]), g.fillStyle = '#fff', g.fill(); });
  face(g, [ISO(x - 3, y + 6, 27), ISO(x + 19, y + 6, 27), ISO(x + 19, y - 3, 18), ISO(x - 3, y - 3, 18)], dark(col));
}
function stake(g, x, y, h = 26) {
  const [sx, sy] = ISO(x, y, 0);
  path(g, [[sx - 4, sy], [sx - 4, sy - h], [sx, sy - h - 7], [sx + 4, sy - h], [sx + 4, sy]]); g.fillStyle = C.wood; g.fill();
  g.fillStyle = dark(C.wood); g.fillRect(sx + 0.8, sy - h, 3.2, h); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(sx - 3, sy - h, 1.6, h);
  path(g, [[sx - 4, sy], [sx - 4, sy - h], [sx, sy - h - 7], [sx + 4, sy - h], [sx + 4, sy]]); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
}
function signpost(g, x, y) {
  const [sx, sy] = ISO(x, y, 0);
  line(g, [sx, sy], [sx, sy - 34], OL, 5.5); line(g, [sx, sy], [sx, sy - 34], C.wood, 3);
  path(g, [[sx - 4, sy - 32], [sx + 16, sy - 32], [sx + 22, sy - 27], [sx + 16, sy - 22], [sx - 4, sy - 22]]); g.fillStyle = '#c99560'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  path(g, [[sx + 4, sy - 20], [sx - 16, sy - 20], [sx - 22, sy - 15], [sx - 16, sy - 10], [sx + 4, sy - 10]]); g.fillStyle = '#c99560'; g.fill(); g.stroke();
}

// ---------- plate (the province center) ----------
function plate(g, stage, t) {
  const R = 270, hexW = [];
  for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; hexW.push([Math.cos(a) * R, Math.sin(a) * R]); }
  const top = hexW.map(([x, y]) => ISO(x, y, 0));
  for (let k = 0; k < 6; k++) {
    const a = hexW[k], b = hexW[(k + 1) % 6], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (mx + my <= 0) continue;
    const A = ISO(a[0], a[1], 0), B = ISO(b[0], b[1], 0);
    face(g, [A, B, [B[0], B[1] + 18], [A[0], A[1] + 18]], (mx - my) > 0 ? '#8a6a45' : '#a17d52');
  }
  face(g, top, C.grass, () => {
    const rnd = mulberry(7);
    g.strokeStyle = '#5c9c38'; g.lineWidth = 1.6;
    for (let k = 0; k < 70; k++) { const x = (rnd() - 0.5) * 480, y = (rnd() - 0.5) * 480; const [sx, sy] = ISO(x, y, 0); g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 3, sy - 5); g.moveTo(sx, sy); g.lineTo(sx + 3, sy - 5); g.stroke(); }
    for (let k = 0; k < 18; k++) { const x = (rnd() - 0.5) * 460, y = (rnd() - 0.5) * 460; const [sx, sy] = ISO(x, y, 0); g.fillStyle = ['#fff3f9', '#ffe066', '#ff8fb1'][k % 3]; g.beginPath(); g.arc(sx, sy, 2.2, 0, TAU); g.fill(); }
  }, 3);
  line(g, top[5], top[0], 'rgba(255,255,255,0.4)', 3);
}
// ---------- the settlement's footprint is scaled into the middle of the province ----------
const FOOT = 0.6;
const PLOT = 30;
const PLOTS = [[175, -10], [-10, -175], [-175, -10], [138, 138], [-138, 138], [138, -138], [-138, -138]];
const DECOR = [[60, -218], [-218, 60], [205, 72], [-70, 205], [215, -95], [-95, 212]];
function plots(g, t) {
  for (const [x, y] of PLOTS) {
    const pts = [ISO(x - PLOT, y - PLOT), ISO(x + PLOT, y - PLOT), ISO(x + PLOT, y + PLOT), ISO(x - PLOT, y + PLOT)];
    path(g, pts); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill();
    g.setLineDash([7, 6]); g.lineDashOffset = -t * 6; path(g, pts); g.lineWidth = 2.2; g.strokeStyle = 'rgba(29,26,34,0.55)'; g.stroke(); g.setLineDash([]);
    for (const p of pts) { line(g, [p[0], p[1]], [p[0], p[1] - 10], OL, 4.5); line(g, [p[0], p[1]], [p[0], p[1] - 10], C.wood, 2.2); }
    const top = ISO(x - PLOT, y - PLOT); path(g, [[top[0], top[1] - 10], [top[0] + 10, top[1] - 7], [top[0], top[1] - 4]]); g.fillStyle = C.gold; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke();
  }
}
function road(g, stage) {
  if (stage === 0) return;
  const h = (stage === 1 ? 122 : 166) * FOOT, col = stage === 1 ? C.dirt : C.pave, rw = (stage === 1 ? 16 : 22) * FOOT, y0 = h - 2, y1 = 233;
  face(g, [ISO(-rw, y0), ISO(rw, y0), ISO(rw, y1), ISO(-rw, y1)], col, stage === 2 ? () => { for (let v = y0 + 10; v < y1; v += 10) line(g, ISO(-rw, v), ISO(rw, v), 'rgba(0,0,0,0.12)', 1.2); } : null, 2.2);
}
// ---------- camp props (outpost variations and terrain flair) ----------
function crateAt(g, x, y, z, s = 12) { prism(g, x, y, z, s, s, s, C.wood, 'wood'); line(g, ISO(x, y + s, z), ISO(x + s, y + s, z + s), '#7b5029', 1.8); }
function roundTent(g, x, y, r, h, col, trim) {
  const [bx, by] = ISO(x, y, 0), [ax, ay] = ISO(x, y, h), rx = r * Math.SQRT2, ry = r * Math.SQRT2 / 2;
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(bx + 3, by + 2, rx + 2, ry + 1, 0, 0, TAU); g.fill();
  path(g, [[bx - rx, by], [ax, ay], [bx + rx, by]]); g.beginPath(); g.moveTo(bx - rx, by); g.lineTo(ax, ay); g.lineTo(bx + rx, by); g.ellipse(bx, by, rx, ry, 0, 0, Math.PI); g.closePath();
  g.fillStyle = col; g.fill();
  g.save(); g.clip();
  g.fillStyle = dark(col); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx + rx, by); g.lineTo(bx + rx, by + ry + 2); g.lineTo(bx + rx * 0.2, by + ry + 2); g.closePath(); g.fill();
  if (trim) { g.fillStyle = trim; g.beginPath(); g.ellipse(bx, by, rx, ry, 0, 0, Math.PI); g.lineTo(bx - rx, by - 6); g.ellipse(bx, by - 6, rx * 0.92, ry * 0.92, 0, Math.PI, 0, true); g.closePath(); g.fill(); }
  g.restore();
  g.beginPath(); g.moveTo(bx - rx, by); g.lineTo(ax, ay); g.lineTo(bx + rx, by); g.ellipse(bx, by, rx, ry, 0, 0, Math.PI); g.closePath(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
  // door flap facing the viewer
  path(g, [[bx - 6, by + ry - 1], [bx - 1, by - h * 0.45], [bx + 4, by + ry - 1]]); g.fillStyle = '#2a2731'; g.fill(); g.lineWidth = 1.8; g.stroke();
  line(g, [ax, ay], [ax - 3, ay - 9], OL, 4); line(g, [ax, ay], [ax - 3, ay - 9], C.wood, 2); line(g, [ax, ay], [ax + 4, ay - 8], OL, 4); line(g, [ax, ay], [ax + 4, ay - 8], C.wood, 2);
}
function leanTo(g, x, y, w, col) {
  for (const xx of [x, x + w]) { line(g, ISO(xx, y, 0), ISO(xx, y, 22), OL, 5); line(g, ISO(xx, y, 0), ISO(xx, y, 22), C.wood, 2.6); }
  face(g, [ISO(x - 2, y, 22), ISO(x + w + 2, y, 22), ISO(x + w + 2, y - 20, 2), ISO(x - 2, y - 20, 2)], col, () => line(g, ISO(x - 2, y - 2, 20), ISO(x + w + 2, y - 2, 20), 'rgba(255,255,255,0.35)', 3));
  bedroll(g, x + 4, y - 12, '#8a5a8a');
}
function bedroll(g, x, y, col) {
  const [a, b] = ISO(x, y, 0), [c, d] = ISO(x + 16, y, 0);
  line(g, [a, b - 3], [c, d - 3], OL, 9); line(g, [a, b - 3], [c, d - 3], col, 6);
  g.beginPath(); g.ellipse(c, d - 3, 4, 4, 0, 0, TAU); g.fillStyle = lite(col); g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(c, d - 3, 1.6, 0, TAU); g.stroke();
}
function sack(g, x, y, z = 0, col = '#d9c08f') {
  const [sx, sy] = ISO(x, y, z);
  g.beginPath(); g.moveTo(sx - 7, sy); g.quadraticCurveTo(sx - 9, sy - 11, sx - 3, sy - 13); g.lineTo(sx - 2, sy - 16); g.lineTo(sx + 2, sy - 16); g.lineTo(sx + 3, sy - 13); g.quadraticCurveTo(sx + 9, sy - 11, sx + 7, sy); g.closePath();
  g.fillStyle = col; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  line(g, [sx - 3, sy - 13], [sx + 3, sy - 13], '#7b5029', 1.6);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(sx + 3, sy - 5, 3, 4, 0, 0, TAU); g.fill();
}
function tripodPot(g, x, y, t) {
  campfire(g, x, y, t);
  const [sx, sy] = ISO(x, y, 0);
  for (const [dx, dy] of [[-12, 4], [12, 4], [0, -5]]) { line(g, [sx + dx, sy + dy], [sx, sy - 30], OL, 4.4); line(g, [sx + dx, sy + dy], [sx, sy - 30], '#8a5a31', 2.2); }
  line(g, [sx, sy - 30], [sx, sy - 20], OL, 1.4);
  g.beginPath(); g.ellipse(sx, sy - 14, 8, 6, 0, 0, TAU); g.fillStyle = '#3b3f4a'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.ellipse(sx, sy - 18, 6.5, 2.4, 0, 0, TAU); g.fillStyle = '#9fd36a'; g.fill(); g.lineWidth = 1.6; g.stroke();
}
function spitRoast(g, x, y, t) {
  campfire(g, x, y, t);
  const [sx, sy] = ISO(x, y, 0);
  for (const dx of [-15, 15]) { line(g, [sx + dx, sy + dx * 0.25], [sx + dx, sy - 20 + dx * 0.25], OL, 4.4); line(g, [sx + dx, sy + dx * 0.25], [sx + dx, sy - 20 + dx * 0.25], '#8a5a31', 2.2); }
  line(g, [sx - 18, sy - 22], [sx + 18, sy - 14], OL, 3.4); line(g, [sx - 18, sy - 22], [sx + 18, sy - 14], '#c9c4b8', 1.6);
  g.save(); g.translate(sx, sy - 18); g.rotate(0.22 + Math.sin(t * 2) * 0.1);
  g.beginPath(); g.ellipse(0, 0, 8, 5, 0, 0, TAU); g.fillStyle = '#b5612e'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.fillStyle = 'rgba(255,230,180,0.6)'; g.beginPath(); g.ellipse(-2, -2, 3, 1.4, 0, 0, TAU); g.fill(); g.restore();
}
function weaponRack(g, x, y) {
  const [a, b] = ISO(x, y, 0), [c, d] = ISO(x + 22, y, 0);
  for (const [p, q] of [[a, b], [c, d]]) { line(g, [p, q], [p, q - 22], OL, 4.6); line(g, [p, q], [p, q - 22], C.wood, 2.4); }
  line(g, [a, b - 18], [c, d - 18], OL, 4.6); line(g, [a, b - 18], [c, d - 18], C.wood, 2.4);
  for (let k = 0; k < 3; k++) { const px = a + (c - a) * (0.25 + k * 0.25), py = b + (d - b) * (0.25 + k * 0.25); line(g, [px, py], [px + 2, py - 34], OL, 3.4); line(g, [px, py], [px + 2, py - 34], '#8a5a31', 1.6); path(g, [[px - 1, py - 34], [px + 2, py - 42], [px + 5, py - 34]]); g.fillStyle = '#c9ced8'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); }
}
function cart(g, x, y) {
  prism(g, x, y, 6, 30, 16, 10, C.wood, 'wood');
  for (const yy of [y + 16]) for (const xx of [x + 6, x + 24]) { const [a, b] = ISO(xx, yy, 6); g.beginPath(); g.ellipse(a, b, 6.5, 6.5, 0, 0, TAU); g.fillStyle = '#8a5a31'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(a, b, 1.8, 0, TAU); g.fillStyle = OL; g.fill(); }
  line(g, ISO(x, y + 8, 10), ISO(x - 16, y + 8, 4), OL, 4); line(g, ISO(x, y + 8, 10), ISO(x - 16, y + 8, 4), C.wood, 2);
  sack(g, x + 10, y + 8, 16, '#e6d3a3'); sack(g, x + 20, y + 6, 16, '#d9c08f');
}
function bannerPole(g, x, y, t) { const [a, b] = ISO(x, y, 0); flag(g, a, b, t, 22, C.banner, 40); }
// --- terrain flair ---
function logPile(g, x, y) {
  const r = 4.5, L = 30;
  const rows = [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2]];
  for (const [i, j] of rows) {
    const yy = y + i * r * 2, z = r + j * r * 1.75, [a, b] = ISO(x, yy, z), [c, d] = ISO(x + L, yy, z);
    line(g, [a, b], [c, d], OL, r * 2 + 3); line(g, [a, b], [c, d], '#8a5a31', r * 2 - 1);
    line(g, [a, b - r * 0.6], [c, d - r * 0.6], 'rgba(255,255,255,0.18)', 1.6);
    g.beginPath(); g.ellipse(c, d, r * 0.95, r * 1.2, -0.45, 0, TAU); g.fillStyle = '#e6c08a'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.ellipse(c, d, r * 0.45, r * 0.6, -0.45, 0, TAU); g.lineWidth = 1; g.strokeStyle = '#b07a45'; g.stroke();
  }
}
function stumpAxe(g, x, y) {
  const b = cylinder(g, x, y, 0, 8, 7, '#8a5a31', 'wood');
  const [sx, sy] = ISO(x, y, 8); g.beginPath(); g.ellipse(sx, sy, b.rx - 2, b.ry - 1, 0, 0, TAU); g.lineWidth = 1; g.strokeStyle = '#b07a45'; g.stroke();
  line(g, [sx + 1, sy], [sx + 9, sy - 15], OL, 4.2); line(g, [sx + 1, sy], [sx + 9, sy - 15], '#c99560', 2);
  path(g, [[sx - 3, sy + 1], [sx + 4, sy - 3], [sx + 5, sy + 4], [sx - 1, sy + 5]]); g.fillStyle = '#c9ced8'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
}
function mushrooms(g, x, y) { for (const [dx, dy, s] of [[0, 0, 1], [6, 3, 0.7], [-5, 4, 0.6]]) { const [a, b] = ISO(x + dx, y + dy, 0); line(g, [a, b], [a, b - 5 * s], OL, 3.5 * s); line(g, [a, b], [a, b - 5 * s], '#f3ead6', 2 * s); g.beginPath(); g.ellipse(a, b - 6 * s, 5 * s, 3.4 * s, 0, Math.PI, 0); g.closePath(); g.fillStyle = '#d9483b'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OL; g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(a - 1.5 * s, b - 7.5 * s, 0.9, 0, TAU); g.fill(); } }
const SAND = '#ecd28f';
// a little drift of sand heaped against the front faces of a box at x..x+w, y..y+d
function drift(g, x, y, w, d, h) {
  const top = [], bot = [];
  for (let k = 0; k <= 8; k++) { const f = k / 8, z = h * Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.15)), 0.8) * (0.55 + 0.45 * (1 - f)); top.push(ISO(x + w * f, y + d + 0.5, z)); bot.push(ISO(x + w * f, y + d + 3 + 7 * Math.sin(Math.PI * f), 0)); }
  const side = []; for (let k = 0; k <= 5; k++) { const f = k / 5; side.push(ISO(x + w + 0.5, y + d * (1 - f), h * 0.4 * (1 - f) * Math.sin(Math.PI * Math.max(0.15, 1 - f)))); }
  g.beginPath(); top.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); side.forEach(([a, b]) => g.lineTo(a, b)); [...bot].reverse().forEach(([a, b]) => g.lineTo(a, b)); g.closePath();
  g.fillStyle = SAND; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.strokeStyle = 'rgba(160,120,60,0.35)'; g.lineWidth = 1.1; g.beginPath(); const [p, q] = ISO(x + w * 0.2, y + d + 4, 1), [r2, s2] = ISO(x + w * 0.7, y + d + 5, 1); g.moveTo(p, q); g.quadraticCurveTo((p + r2) / 2, q - 3, r2, s2); g.stroke();
}
function dune(g, x, y, w) { const [a, b] = ISO(x, y, 0); g.beginPath(); g.moveTo(a - w, b + 3); g.quadraticCurveTo(a - w * 0.3, b - w * 0.4, a + w * 0.2, b - w * 0.25); g.quadraticCurveTo(a + w * 0.7, b - w * 0.15, a + w, b + 3); g.closePath(); g.fillStyle = SAND; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); line(g, [a - w * 0.4, b - 2], [a + w * 0.3, b - w * 0.12], 'rgba(160,120,60,0.35)', 1.2); }
function cactusPot(g, x, y) {
  const b = cylinder(g, x, y, 0, 8, 6, '#c8673d');
  const [sx, sy] = ISO(x, y, 8);
  g.beginPath(); g.roundRect ? g.roundRect(sx - 3, sy - 18, 6, 18, 3) : g.rect(sx - 3, sy - 18, 6, 18); g.fillStyle = '#5aa04a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.moveTo(sx + 3, sy - 8); g.lineTo(sx + 7, sy - 8); g.lineTo(sx + 7, sy - 14); g.lineWidth = 4.4; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.2; g.strokeStyle = '#5aa04a'; g.stroke();
}
function skull(g, x, y) { const [a, b] = ISO(x, y, 0); g.beginPath(); g.ellipse(a, b - 3, 5, 4, 0, 0, TAU); g.fillStyle = '#f3ead6'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke(); g.fillStyle = OL; g.beginPath(); g.arc(a - 2, b - 3, 1, 0, TAU); g.arc(a + 2, b - 3, 1, 0, TAU); g.fill(); for (const s of [-1, 1]) { line(g, [a + s * 4, b - 5], [a + s * 11, b - 9], OL, 3.2); line(g, [a + s * 4, b - 5], [a + s * 11, b - 9], '#f3ead6', 1.6); } }
function waterJar(g, x, y) { cylinder(g, x, y, 0, 13, 6, '#c8673d'); const [a, b] = ISO(x, y, 13); g.beginPath(); g.ellipse(a, b, 4, 2, 0, 0, TAU); g.fillStyle = '#2a2731'; g.fill(); }
function cattails(g, x, y) {
  const [a, b] = ISO(x, y, 0);
  for (let k = -2; k <= 2; k++) { const h = 22 + (k % 2 ? 6 : 0), dx = k * 3.4; line(g, [a + dx, b], [a + dx * 1.6, b - h], OL, 3); line(g, [a + dx, b], [a + dx * 1.6, b - h], '#5c9c38', 1.6); if (k % 2 === 0) { g.beginPath(); g.ellipse(a + dx * 1.5, b - h + 6, 2.4, 5, 0, 0, TAU); g.fillStyle = '#7a4a2a'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); } }
}
function puddle(g, x, y, r) { const [a, b] = ISO(x, y, 0); g.beginPath(); g.ellipse(a, b, r * 1.4, r * 0.7, 0, 0, TAU); g.fillStyle = '#6b5a3a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(a - r * 0.3, b - r * 0.15, r * 0.6, r * 0.22, 0, 0, TAU); g.fillStyle = 'rgba(150,200,220,0.45)'; g.fill(); }
function duckboards(g, x, y, n) { for (let k = 0; k < n; k++) { const xx = x + k * 9; prism(g, xx, y, 0, 7, 22, 3, '#a88a5c'); } }
function moss(g, x, y, s) { for (const [dx, r] of [[2, 3], [s * 0.5, 2.4], [s - 3, 3.2]]) { const [a, b] = ISO(x + dx, y + s, 0); g.beginPath(); g.ellipse(a, b - 1, r, r * 0.7, 0, Math.PI, 0); g.fillStyle = '#5f8f3a'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke(); } }
function haybale(g, x, y) { const b = cylinder(g, x, y, 0, 12, 9, C.thatch); const [a, c] = ISO(x, y, 12); g.strokeStyle = 'rgba(140,100,30,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(a, c, b.rx * 0.55, b.ry * 0.55, 0, 0, TAU); g.stroke(); line(g, [a - b.rx, c + 8], [a + b.rx, c + 8], 'rgba(140,100,30,0.45)', 1.4); }
function flowers(g, x, y) { const [a, b] = ISO(x, y, 0); [[0, 0, '#ff8fb1'], [6, 2, '#ffe066'], [-5, 3, '#fff3f9'], [2, 5, '#b48cff']].forEach(([dx, dy, c]) => { line(g, [a + dx, b + dy], [a + dx, b + dy - 6], '#5c9c38', 1.4); g.beginPath(); g.arc(a + dx, b + dy - 7, 2.3, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = 1.1; g.strokeStyle = OL; g.stroke(); }); }
// a cluster of stores; on desert ground each box gets a drift of sand, in swamps a little moss
function stores(g, kind, x, y, ter) {
  const boxes = [];
  const box = (bx, by, z, s) => { crateAt(g, bx, by, z, s); if (!z) boxes.push([bx, by, s]); };
  const keg = (bx, by) => { barrel(g, bx, by); };
  if (kind === 'stack') { box(x - 8, y - 8, 0, 13); box(x + 6, y - 4, 0, 11); box(x - 6, y - 6, 13, 10); }
  else if (kind === 'row') { box(x - 10, y - 6, 0, 12); keg(x + 8, y + 2); keg(x + 16, y - 6); }
  else if (kind === 'sacks') { box(x, y - 10, 0, 12); sack(g, x - 6, y + 6); sack(g, x + 4, y + 10, 0, '#e6d3a3'); sack(g, x + 14, y + 4); }
  else if (kind === 'barrels') { keg(x - 6, y - 6); keg(x + 6, y - 8); keg(x, y + 4); box(x + 12, y + 4, 0, 10); }
  else { box(x - 8, y - 8, 0, 13); box(x + 6, y - 4, 0, 11); keg(x + 16, y + 10); }
  for (const [bx, by, s] of boxes) { if (ter === 'desert') drift(g, bx, by, s, s, s * 0.55); else if (ter === 'swamp') moss(g, bx, by, s); }
}

function groundPatch(g, stage, ter) {
  if (stage === 0) {
    const pts = []; for (let k = 0; k < 24; k++) { const a = k * TAU / 24, r = 84 + Math.sin(k * 2.3) * 6; pts.push(ISO(Math.cos(a) * r, Math.sin(a) * r, 0)); }
    face(g, pts, ter === 'desert' ? '#e8cf92' : ter === 'swamp' ? '#a8956a' : ter === 'forest' ? '#c9a46b' : C.dirt, ter === 'forest' ? () => { for (let k = 0; k < 14; k++) { const a = k * 2.4, r = 30 + (k * 17) % 50, [lx, ly] = ISO(Math.cos(a) * r, Math.sin(a) * r, 0); g.fillStyle = ['#b5612e', '#d9a03a', '#8a7a3a'][k % 3]; g.beginPath(); g.ellipse(lx, ly, 2.6, 1.4, a, 0, TAU); g.fill(); } } : ter === 'swamp' ? () => { for (let k = 0; k < 6; k++) { const a = k * 1.9, r = 40 + (k * 13) % 30, [lx, ly] = ISO(Math.cos(a) * r, Math.sin(a) * r, 0); g.fillStyle = 'rgba(70,60,40,0.35)'; g.beginPath(); g.ellipse(lx, ly, 8, 3, 0, 0, TAU); g.fill(); } } : null, 2.2);
  } else {
    const h = stage === 1 ? 122 : 166, col = stage === 1 ? C.dirt : C.pave;
    face(g, [ISO(-h, -h), ISO(h, -h), ISO(h, h), ISO(-h, h)], col, stage === 2 ? () => { for (let v = -h + 20; v < h; v += 20) { line(g, ISO(v, -h), ISO(v, h), 'rgba(0,0,0,0.12)', 1.2); line(g, ISO(-h, v), ISO(h, v), 'rgba(0,0,0,0.12)', 1.2); } } : null, 2.4);
  }
}
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- the central tower at each stage ----------
function towerOutpost(g, t) {
  cylinder(g, 0, 0, 0, 30, 21, C.stone, 'stone');
  door(g, 0, 0, 21, 22, 7);
  cylBody(g, 0, 0, 30, 76, 22, C.wood, 'wood');
  const [sx, sy] = ISO(0, 0, 30); g.beginPath(); g.ellipse(sx, sy, 22 * Math.SQRT2, 11 * Math.SQRT2, 0, 0, Math.PI); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
  windowsOn(g, 0, 0, 52, 22, [-0.45, 0.3], 14);
  for (const u of [-0.95, -0.35, 0.35, 0.95]) { const [x0, y0] = ISO(0, 0, 76); const yy = y0 + 11 * Math.SQRT2 * Math.sqrt(1 - u * u); line(g, [x0 + u * 31, yy], [x0 + u * 31 * 1.2, yy + 12], OL, 5); line(g, [x0 + u * 31, yy], [x0 + u * 31 * 1.2, yy + 12], '#8a5a31', 2.6); }
  const [ax, ay] = cone(g, 0, 0, 74, 28, 46, C.thatch, false);
  flag(g, ax, ay + 2, t, 24, C.banner, 24);
}
function towerFort(g, t) {
  cylinder(g, 0, 0, 0, 74, 26, C.stone, 'stone');
  door(g, 0, 0, 26, 26, 9);
  windowsOn(g, 0, 0, 44, 26, [-0.55, 0.5], 14);
  cylinder(g, 0, 0, 74, 81, 29, C.stone);
  cylBody(g, 0, 0, 81, 146, 24, C.stone, 'stone');
  windowsOn(g, 0, 0, 104, 24, [-0.4, 0.35], 16);
  cylinder(g, 0, 0, 146, 153, 29, C.stone);
  crenelRing(g, 0, 0, 153, 29, C.stone, 12);
  cylinder(g, -2, -2, 153, 178, 13, C.stone, 'stone');
  windowsOn(g, -2, -2, 160, 13, [0.05], 10, 1);
  const [ax, ay] = cone(g, -2, -2, 177, 17, 40, C.roofB, true);
  flag(g, ax, ay - 4, t, 30, C.banner, 28);
}
function towerCapital(g, t) {
  cylinder(g, 0, 0, 0, 96, 35, C.stone, 'stone');
  door(g, 0, 0, 35, 30, 11, '#6d4426');
  windowsOn(g, 0, 0, 58, 35, [-0.6, 0.55], 16, 1);
  cylinder(g, 0, 0, 96, 104, 39, C.stone);
  cylBody(g, 0, 0, 104, 202, 31, C.stone, 'stone');
  windowsOn(g, 0, 0, 132, 31, [-0.5, 0.15, 0.62], 18, 1);
  windowsOn(g, 0, 0, 172, 31, [-0.25, 0.4], 16, 1);
  { const [sx, sy] = ISO(0, 0, 196); for (const u of [-0.78, 0.78]) hangingBanner(g, sx + u * 31 * Math.SQRT2 * 0.9, sy + 15.5 * Math.SQRT2 * Math.sqrt(1 - u * u) * 0.9, 58, t); }
  cylinder(g, 0, 0, 202, 210, 36, C.stone);
  { const [sx, sy] = ISO(0, 0, 210); g.beginPath(); g.ellipse(sx, sy, 36 * Math.SQRT2 - 2, 18 * Math.SQRT2 - 1, 0, 0, Math.PI); g.strokeStyle = C.gold; g.lineWidth = 2.4; g.stroke(); }
  crenelRing(g, 0, 0, 210, 36, C.stone, 16);
  cylinder(g, -3, -3, 210, 246, 18, C.stone, 'stone');
  windowsOn(g, -3, -3, 222, 18, [-0.35, 0.4], 13, 1);
  cylinder(g, -3, -3, 246, 250, 21, C.stone);
  const [ax, ay] = cone(g, -3, -3, 250, 22, 74, C.roofB, true);
  flag(g, ax, ay - 6, t, 40, C.banner, 34);
}


// ---------- outpost camps: ten layouts of tents, stores and fire, plus a little terrain flair ----------
// spots are on the dirt patch around the tower (radius 84); "back" spots sit behind the tower on screen and are kept for tall things
const SPOT = { R: [58, -43], L: [-48, 44], F: [40, 34], FR: [64, 8], FL: [6, 62], BR: [26, -68], BL: [-68, 22], E1: [76, -14], E2: [-14, 76], E3: [52, 54] };
const TENTC = { cloth: C.cloth, green: '#8fbf6a', tan: '#d9b77a', blue: '#7fa6e8', red: '#e07a6a', gold: '#f2d27a' };
const CAMPS = [
  { tents: [['ridge', 'R', 'cloth', C.roofR]], fire: ['fire', 'F'], stores: ['stack', 'L'], extra: [['sign', 'BL'], ['stakes']] },
  { tents: [['ridge', 'R', 'cloth'], ['ridge', 'BL', 'green', null, 0.8]], fire: ['spit', 'F'], stores: ['barrels', 'FL'], extra: [] },
  { tents: [['round', 'R', 'cloth', C.roofB]], fire: ['pot', 'FR'], stores: ['sacks', 'L'], extra: [['rack', 'BL']] },
  { tents: [['lean', 'L', 'tan'], ['ridge', 'R', 'green', '#5f8f3a']], fire: ['fire', 'FL'], stores: ['row', 'FR'], extra: [['stakes']] },
  { tents: [['round', 'BR', 'red', C.cloth], ['round', 'L', 'cloth', null, 0.8]], fire: ['fire', 'F'], stores: ['stack', 'FL'], extra: [] },
  { tents: [['ridge', 'BL', 'blue', '#fff', 1.2]], fire: ['pot', 'F'], stores: ['sacks', 'FR'], extra: [['cart', 'R']] },
  { tents: [['ridge', 'R', 'tan']], fire: ['fire', 'F'], stores: ['barrels', 'L'], extra: [['bedroll', 'FL'], ['bedroll', 'FR'], ['banner', 'BL']] },
  { tents: [['round', 'R', 'cloth', C.roofR], ['lean', 'L', 'blue']], fire: ['spit', 'FR'], stores: ['row', 'BL'], extra: [] },
  { tents: [['ridge', 'R', 'cloth', null, 0.75], ['ridge', 'L', 'red', null, 0.75]], fire: ['fire', 'FL'], stores: ['stack', 'FR'], extra: [['sign', 'BR']] },
  { tents: [['round', 'L', 'gold', C.roofB, 1.25]], fire: ['fire', 'FR'], stores: ['barrels', 'R'], extra: [['rack', 'BR'], ['stakes']] }
];
function outpostCamp(add, variant, ter) {
  const c = CAMPS[variant], used = new Set();
  c.tents.forEach(([kind, at, col, trim, k = 1], i) => {
    const [x, y] = SPOT[at]; used.add(at);
    const cc = TENTC[col] || col;
    if (kind === 'ridge') { const w = 36 * k, d = 26 * k, h = 26 * k; add('tent' + i, x, y, (g) => { tent(g, x - w / 2, y - d / 2, w, d, h, cc, trim); if (ter === 'desert') drift(g, x - w / 2 + 2, y - d / 2, w * 0.6, d, 6); }); }
    else if (kind === 'round') add('tent' + i, x, y, (g) => { roundTent(g, x, y, 16 * k, 40 * k, cc, trim); if (ter === 'desert') dune(g, x + 10 * k, y + 14 * k, 9); });
    else add('tent' + i, x, y, (g) => leanTo(g, x - 12, y + 8, 24, cc));
  });
  { const [kind, at] = c.fire, [x, y] = SPOT[at]; used.add(at); add('fire', x, y, (g, t) => kind === 'pot' ? tripodPot(g, x, y, t) : kind === 'spit' ? spitRoast(g, x, y, t) : campfire(g, x, y, t)); }
  { const [kind, at] = c.stores, [x, y] = SPOT[at]; used.add(at); add('crates', x, y, (g) => stores(g, kind, x, y, ter)); }
  c.extra.forEach(([kind, at], i) => {
    if (kind === 'stakes') { for (const [x, y] of [[-70, -10], [-64, 22], [70, -66]]) if (![...used].some(u => Math.hypot(SPOT[u][0] - x, SPOT[u][1] - y) < 26)) add('stk' + x, x, y, (g) => stake(g, x, y, 20)); return; }
    const [x, y] = SPOT[at]; used.add(at);
    if (kind === 'sign') add('sign', x, y, (g) => signpost(g, x, y));
    else if (kind === 'rack') add('rack', x, y, (g) => weaponRack(g, x - 11, y));
    else if (kind === 'cart') add('cart', x, y, (g) => cart(g, x - 15, y - 8));
    else if (kind === 'bedroll') add('bed' + i, x, y, (g) => bedroll(g, x - 8, y, ['#8a5a8a', '#5a7a9a', '#9a5a4a'][i % 3]));
    else if (kind === 'banner') add('banner', x, y, (g, t) => bannerPole(g, x, y, t));
  });
  const free = ['E1', 'E2', 'E3', 'BR', 'BL', 'FR', 'FL', 'F'].filter(k => !used.has(k) && ![...used].some(u => Math.hypot(SPOT[u][0] - SPOT[k][0], SPOT[u][1] - SPOT[k][1]) < 34));
  flair(add, ter, free.map(k => SPOT[k]), variant, 'o');
}
// terrain flair: stacked logs and stumps in forests, sand dunes and jars in deserts, reeds and puddles in swamps, hay and flowers on grass
function flair(add, ter, spots, seed, tag) {
  const r = mulberry(seed * 31 + ter.length * 7 + 3), pick = [...spots].sort(() => r() - 0.5).slice(0, 3);
  const kinds = { forest: ['logs', 'stump', 'shrooms'], desert: ['dune', 'cactus', 'jar', 'skull'], swamp: ['reeds', 'puddle', 'reeds', 'boards'], grassland: ['hay', 'flowers', 'flowers'] }[ter] || [];
  pick.forEach(([x, y], i) => {
    const k = ter === 'forest' && i === 0 ? 'logs' : kinds[(i + seed) % kinds.length];
    const draw = { logs: g => logPile(g, x - 15, y - 6), stump: g => stumpAxe(g, x, y), shrooms: g => mushrooms(g, x, y), dune: g => dune(g, x, y, 16), cactus: g => cactusPot(g, x, y), jar: g => { waterJar(g, x, y); waterJar(g, x + 9, y + 4); }, skull: g => skull(g, x, y), reeds: g => cattails(g, x, y), puddle: g => puddle(g, x, y, 11), boards: g => duckboards(g, x - 12, y - 11, 3), hay: g => haybale(g, x, y), flowers: g => flowers(g, x, y) }[k];
    if (draw) add(tag + 'flair' + i, x, y, draw);
  });
}

// ---------- compose each stage ----------
// every piece: key (persists across stages so only new pieces pop in), depth anchor (x, y), draw
const UNIT = (id, x, y, th, k = 0.42) => ({ key: 'u-' + id + x, x, y, unit: { id, th, k } });
function stagePieces(stage, opts = {}) {
  const variant = ((opts.variant || 0) % 10 + 10) % 10, ter = opts.terrain || 'grassland';
  const P = [];
  const add = (key, x, y, draw) => P.push({ key, x, y, draw });
  if (stage === 0) {
    add('tower0', 0, 0, (g, t) => towerOutpost(g, t));
    outpostCamp(add, variant, ter);
    P.push(UNIT('pioneer:B', 72, 66, -3 * Math.PI / 4));
    P.push(UNIT('mason:A', -78, 58, Math.PI / 4));
  }
  if (stage === 1) {
    add('tower1', 0, 0, (g, t) => towerFort(g, t));
    // palisade: back edges first, front edges with a gate on the near-left side
    const H = 110, back = [], front = [];
    for (let v = -H; v <= H; v += 7) { back.push([v, -H]); back.push([-H, v]); front.push([H, v]); if (Math.abs(v) > 20) front.push([v, H]); }
    back.forEach(([x, y]) => add('pb' + x + '_' + y, x, y, (g) => stake(g, x, y)));
    front.forEach(([x, y]) => add('pf' + x + '_' + y, x, y, (g) => stake(g, x, y)));
    for (const [x, y] of [[-H, -H], [H, -H], [-H, H], [H, H]]) add('wt' + x + y, x, y, (g, t) => { prism(g, x - 9, y - 9, 0, 18, 18, 40, C.wood, 'wood'); const [a, b] = ISO(x, y, 40); path(g, [[a - 16, b + 2], [a, b - 18], [a + 16, b + 2], [a, b + 10]]); g.fillStyle = C.roofR; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); });
    for (const x of [-27, 27]) add('gp' + x, x, H, (g, t) => { prism(g, x - 7, H - 7, 0, 14, 14, 44, C.wood, 'wood'); const [a, b] = ISO(x, H, 44); flag(g, a, b, t, 20, C.banner, 22); });
    add('gate', 0, H + 6, (g) => { face(g, [ISO(-20, H + 2, 0), ISO(-20, H + 18, 0), ISO(-20, H + 18, 28), ISO(-20, H + 2, 28)], C.wood, () => plankRight(g, -20, H + 2, 0, 16, 28)); face(g, [ISO(20, H + 2, 0), ISO(20, H + 18, 0), ISO(20, H + 18, 28), ISO(20, H + 2, 28)], dark(C.wood), () => plankRight(g, 20, H + 2, 0, 16, 28)); });
    add('barracks', 56, -66, (g, t) => house(g, 22, -86, 64, 32, 26, C.roofR, t, { chimney: true, wall: '#c9b48e' }));
    add('well', -58, 44, (g, t) => well(g, -58, 44, t));
    add('dummy', 62, 52, (g, t) => dummy(g, 62, 52, t));
    add('crates', -66, -52, (g) => stores(g, 'default', -66, -52, ter));
    flair(add, ter, [[74, -18], [-84, 8]], 5, 'f');
    P.push(UNIT('swordsman:B', 26, 78, Math.PI / 4));
    P.push(UNIT('pikeman:C', -40, 136, 0));
    P.push(UNIT('pioneer:B', 40, 176, Math.PI));
  }
  if (stage === 2) {
    add('tower2', 0, 0, (g, t) => towerCapital(g, t));
    const H = 150, WT = 10, WH = 36;
    // back walls, then corners, then front walls (the near-left wall holds the gatehouse)
    add('wallN', 0, -H, (g) => { prism(g, -H, -H - WT / 2, 0, 2 * H, WT, WH, C.stone, 'stone'); merlonsRect(g, -H, -H - WT / 2, WH, 2 * H, WT, C.stone); });
    add('wallW', -H, 0, (g) => { prism(g, -H - WT / 2, -H, 0, WT, 2 * H, WH, C.stone, 'stone'); merlonsRect(g, -H - WT / 2, -H, WH, WT, 2 * H, C.stone); });
    add('wallE', H, 0.5, (g) => { prism(g, H - WT / 2, -H, 0, WT, 2 * H, WH, C.stone, 'stone'); merlonsRect(g, H - WT / 2, -H, WH, WT, 2 * H, C.stone); });
    add('wallS1', -90, H, (g) => { prism(g, -H, H - WT / 2, 0, H - 30, WT, WH, C.stone, 'stone'); merlonsRect(g, -H, H - WT / 2, WH, H - 30, WT, C.stone); });
    add('wallS2', 90, H, (g) => { prism(g, 30, H - WT / 2, 0, H - 30, WT, WH, C.stone, 'stone'); merlonsRect(g, 30, H - WT / 2, WH, H - 30, WT, C.stone); });
    for (const [x, y] of [[-H, -H], [H, -H], [-H, H], [H, H]]) add('ct' + x + y, x, y + 1, (g, t) => { cylinder(g, x, y, 0, 64, 19, C.stone, 'stone'); windowsOn(g, x, y, 40, 19, [0.1], 12, 1); const [ax, ay] = cone(g, x, y, 63, 23, 40, C.roofB, true); flag(g, ax, ay - 3, t, 20, C.banner, 18); });
    add('gatehouse', 0, H + 2, (g, t) => {
      for (const x of [-32, 32]) { cylinder(g, x, H, 0, 60, 16, C.stone, 'stone'); crenelRing(g, x, H, 60, 16, C.stone, 9); }
      prism(g, -18, H - 8, 30, 36, 16, 26, C.stone, 'stone');
      const [a, b] = ISO(0, H + 8, 0); g.beginPath(); g.moveTo(a - 16, b + 8); g.lineTo(a - 16, b - 14); g.quadraticCurveTo(a - 2, b - 32, a + 14, b - 20); g.lineTo(a + 14, b + 2); g.closePath(); g.fillStyle = '#2a2731'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
      g.save(); g.clip(); for (let k = -14; k < 16; k += 5) line(g, [a + k, b + 10], [a + k, b - 34], C.iron, 1.8); for (let k = -20; k < 10; k += 6) line(g, [a - 16, b + k], [a + 14, b + k - 6], C.iron, 1.8); g.restore();
      const [hx, hy] = ISO(0, H + 8, 52); hangingBanner(g, hx, hy, 34, t);
    });
    add('h1', -100, -48, (g, t) => house(g, -126, -64, 46, 30, 28, C.roofB, t, { chimney: true, lit: true }));
    add('h2', -98, 52, (g, t) => house(g, -122, 38, 40, 28, 24, C.roofR, t, { lit: true }));
    add('h3', 48, -108, (g, t) => house(g, 18, -126, 58, 30, 30, C.roofB, t, { chimney: true, lit: true }));
    add('h4', 104, -40, (g, t) => house(g, 86, -66, 34, 30, 26, C.roofR, t, { lit: true }));
    add('fountain', 66, 66, (g, t) => fountain(g, 66, 66, t));
    add('stall1', 104, 34, (g, t) => stall(g, 96, 26, '#3f72d9', t));
    add('stall2', 108, 70, (g, t) => stall(g, 100, 62, '#c8473d', t));
    add('h5', -113, -9, (g, t) => house(g, -132, -22, 38, 26, 24, C.thatch, t, { lit: true }));
    add('chapel', 51, -68, (g, t) => { house(g, 30, -82, 42, 28, 32, C.roofB, t, { wall: '#ece4d4', lit: true }); prism(g, 62, -78, 32, 12, 12, 22, '#ece4d4', 'stone'); const [ax, ay] = cone(g, 68, -72, 54, 10, 30, C.roofB, true); flag(g, ax, ay - 2, t, 14, C.gold, 12); });
    add('smithy', -104, 93, (g, t) => { house(g, -124, 80, 40, 26, 22, '#7a5a43', t, { chimney: true, wall: '#c9b48e' }); prism(g, -92, 110, 0, 8, 5, 7, C.iron); const [a, b] = ISO(-88, 112, 8); g.fillStyle = '#ff9a3c'; g.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 6)); g.beginPath(); g.arc(a, b - 3, 2.6, 0, TAU); g.fill(); g.globalAlpha = 1; });
    add('barn', 108, -14, (g, t) => house(g, 88, -28, 40, 28, 26, C.thatch, t, { wall: '#b5653d' }));
    add('hay', 136, 14, (g) => { haybale(g, 134, 12); haybale(g, 126, 22); });
    add('h6', 112, -120, (g, t) => house(g, 92, -134, 40, 28, 24, C.roofR, t, { chimney: true, lit: true }));
    add('well2', -44, 52, (g, t) => well(g, -44, 52, t));
    add('market', 18, 64, (g) => stores(g, 'barrels', 18, 64, ter));
    add('cartC', -44, 98, (g) => cart(g, -58, 90));
    add('in5', -110, -110, (g) => tree(g, -110, -110, 0.9));
    P.push(UNIT('cavalry:B', 32, 206, -3 * Math.PI / 4, 0.4));
    P.push(UNIT('mage:A', -28, 84, Math.PI / 4));
    P.push(UNIT('swordsman:B', -46, 182, 0));
    P.push(UNIT('mason:A', 44, 110, -Math.PI / 4));
  }
  return P;
}

const VB = [780, 600, 385];   // width, height, ground-origin y within the box
const STAGES = [
  { key: 'outpost', name: 'Outpost', tag: 'Stage 1' },
  { key: 'fort', name: 'Fort', tag: 'Stage 2' },
  { key: 'capital', name: 'Capital', tag: 'Stage 3' }
];
function renderStage(cv, stage, t, anim, opts = {}) {
  const so = { variant: opts.variant, terrain: opts.terrain };
  const g = cv.getContext('2d'), [VBW, VBH, OY] = VB, k = Math.min(cv.width / VBW, cv.height / VBH);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(k, 0, 0, k, cv.width / 2, (cv.height - VBH * k) / 2 + OY * k);
  g.lineJoin = 'round'; g.lineCap = 'round';
  plate(g, stage, t);
  if (opts.plots !== false) plots(g, t);
  road(g, stage);
  g.save(); g.scale(FOOT, FOOT); groundPatch(g, stage, so.terrain); g.restore();
  const pieces = stagePieces(stage, so).map(p => ({ ...p, f: FOOT }));
  DECOR.forEach(([x, y], i) => pieces.push({ key: 'decor' + i, x, y, f: 1, draw: (gg) => tree(gg, x, y, 1.15 + (i % 3) * 0.1) }));
  pieces.sort((a, b) => (a.x + a.y) * a.f - (b.x + b.y) * b.f);
  pieces.forEach((p, i) => {
    let s = 1;
    if (anim && anim.fresh.has(p.key)) {
      const dt = t - anim.t0 - Math.min(1.1, i * 0.012);
      if (dt <= 0) return;
      s = 1 - Math.exp(-dt * 7) * Math.cos(dt * 15);
    }
    g.save();
    if (p.f !== 1) g.scale(p.f, p.f);
    const [ax, ay] = ISO(p.x, p.y, 0);
    if (s !== 1) { g.translate(ax, ay); g.scale(s, s); g.translate(-ax, -ay); }
    if (p.unit) { if (root.RealmIso) root.RealmIso.drawUnitAt(g, p.unit.id, p.unit.th, t, ax, ay, p.unit.k); }
    else p.draw(g, t);
    g.restore();
  });
}
// share of the province the settlement's ground covers (hex of radius 270)
const FOOTPRINT = (() => { const hex = 3 * Math.sqrt(3) / 2 * 270 * 270; return [Math.PI * (84 * FOOT) ** 2 / hex, (2 * 122 * FOOT) ** 2 / hex, (2 * 166 * FOOT) ** 2 / hex].map(v => Math.round(v * 100)); })();
function freshKeys(from, to) {
  const before = new Set(from === null ? [] : stagePieces(from).map(p => p.key));
  return new Set(stagePieces(to).map(p => p.key).filter(k => !before.has(k) || k.startsWith('tower')));
}
// draw a settlement straight into another scene, ground center at the current origin (no plate, no units)
const pieceCache = new Map();
function drawSettlement(g, stage, t, opts = {}) {
  const key = stage + '|' + (opts.variant || 0) % 10 + '|' + (opts.terrain || 'grassland');
  let list = pieceCache.get(key);
  if (!list) { list = stagePieces(stage, opts).filter(p => !p.unit).sort((a, b) => (a.x + a.y) - (b.x + b.y)); pieceCache.set(key, list); }
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.scale(FOOT, FOOT);
  groundPatch(g, stage, opts.terrain);
  list.forEach(p => { g.save(); p.draw(g, t); g.restore(); });
  g.restore();
}
const KIT = { roundTent, leanTo, logPile, drift, stores, cart, ISO, C, OL, mix, lite, dark, darker, path, face, line, prism, merlonsRect, cylBody, cylCap, cylinder, windowsOn, door, cone, crenelRing, flag, hangingBanner, smoke, house, tent, crate, barrel, campfire, well, dummy, tree, fountain, stall, stake, signpost, stoneTexLeft, stoneTexRight, plankLeft, plankRight };
root.RealmBuild = { STAGES, renderStage, freshKeys, drawSettlement, VB, FOOTPRINT, PLOTS, KIT };
})(typeof globalThis !== 'undefined' ? globalThis : this);
