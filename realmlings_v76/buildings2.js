/* Realmlings — province buildings. Each design sits on one build plot (about 70×70 ground units) centered at the origin. */
(function (root) {
'use strict';
const K = root.RealmBuild.KIT;
const { ISO, C, OL, lite, dark, path, face, line, prism, cylinder, cylBody, cylCap, windowsOn, cone, crenelRing, flag, hangingBanner, smoke, house, tent, crate, barrel, campfire, dummy, tree, stake } = K;
const TAU = Math.PI * 2;
const P = { wheat: '#f0cf5a', soil: '#9b6a3e', soilD: '#7d5230', hay: '#ecca6a', red: '#c8473d', purple: '#7a55c9', purpleD: '#5a3c9e', crystal: '#7fe3ff', gold: '#f4c44f', goldD: '#c99a2c', rock: '#a7a9b3', rockD: '#878a96', marble: '#f2efe6', water: '#45a8e4', iron: '#5b6270', green: '#5fae4a', pumpkin: '#f08a2b', leaf: '#4ba557', horse: '#9a5b32', white: '#fbfdff' };

// ---------- extra pieces ----------
function dot(g, x, y, r, col, lw = 1.6) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = col; g.fill(); g.lineWidth = lw; g.strokeStyle = OL; g.stroke(); }
function fenceRun(g, a, b, h = 12, posts = 6) {
  const A0 = ISO(a[0], a[1], 0), B0 = ISO(b[0], b[1], 0);
  for (const z of [h * 0.45, h * 0.85]) { const p = ISO(a[0], a[1], z), q = ISO(b[0], b[1], z); line(g, p, q, OL, 4.2); line(g, p, q, C.wood, 2); }
  for (let i = 0; i <= posts; i++) { const f = i / posts, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, p = ISO(x, y, 0), q = ISO(x, y, h + 2); line(g, p, q, OL, 5); line(g, p, q, '#8a5a31', 2.6); }
}
function cropRows(g, x0, y0, w, d, kind, t) {
  face(g, [ISO(x0, y0), ISO(x0 + w, y0), ISO(x0 + w, y0 + d), ISO(x0, y0 + d)], P.soil, () => { for (let yy = y0 + 5; yy < y0 + d; yy += 8) line(g, ISO(x0, yy), ISO(x0 + w, yy), P.soilD, 2.2); }, 2.2);
  for (let yy = y0 + 5; yy < y0 + d; yy += 8) for (let xx = x0 + 4; xx < x0 + w - 2; xx += 6) {
    const [sx, sy] = ISO(xx, yy, 0), sw = Math.sin(t * 2 + xx * 0.3) * 1.2;
    if (kind === 'wheat') { line(g, [sx, sy], [sx + sw, sy - 10], '#b8962f', 1.6); g.beginPath(); g.ellipse(sx + sw, sy - 11, 1.8, 3.6, 0, 0, TAU); g.fillStyle = P.wheat; g.fill(); g.lineWidth = 1; g.strokeStyle = OL; g.stroke(); }
    else if (kind === 'corn') { line(g, [sx, sy], [sx + sw, sy - 15], OL, 3.6); line(g, [sx, sy], [sx + sw, sy - 15], '#5fae4a', 1.8); g.beginPath(); g.ellipse(sx + sw + 2, sy - 9, 1.6, 3.2, 0.3, 0, TAU); g.fillStyle = P.gold; g.fill(); g.lineWidth = 1; g.strokeStyle = OL; g.stroke(); }
    else { g.beginPath(); g.ellipse(sx, sy - 2, 4, 3, 0, 0, TAU); g.fillStyle = P.pumpkin; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); line(g, [sx, sy - 5], [sx + 1, sy - 7], '#3f7a2e', 1.6); }
  }
}
function haystack(g, x, y, s = 1) {
  const [sx, sy] = ISO(x, y, 0);
  g.beginPath(); g.moveTo(sx - 12 * s, sy); g.quadraticCurveTo(sx - 12 * s, sy - 22 * s, sx, sy - 24 * s); g.quadraticCurveTo(sx + 12 * s, sy - 22 * s, sx + 12 * s, sy); g.closePath();
  g.fillStyle = P.hay; g.fill(); g.save(); g.clip(); g.strokeStyle = 'rgba(150,100,20,0.35)'; g.lineWidth = 1.2; for (let k = -10; k < 12; k += 4) { g.beginPath(); g.moveTo(sx + k * s, sy); g.lineTo(sx + k * 0.4 * s, sy - 22 * s); g.stroke(); } g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(sx - 10 * s, sy - 22 * s, 6 * s, 20 * s); g.restore();
  g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
}
function hayBale(g, x, y) { prism(g, x, y, 0, 12, 8, 8, P.hay); line(g, ISO(x + 4, y + 8, 0), ISO(x + 4, y + 8, 8), '#b8962f', 1.6); line(g, ISO(x + 8, y + 8, 0), ISO(x + 8, y + 8, 8), '#b8962f', 1.6); }
function logPile(g, x, y, n = 3, len = 26, along = 'x') {
  const rows = [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2]].slice(0, n === 3 ? 3 : 6);
  rows.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [i, lvl] of rows) {
    const r = 3.6, oy = i * 7.2, z = 3.6 + lvl * 6.2;
    if (along === 'x') {
      const a = ISO(x, y + oy, z), b = ISO(x + len, y + oy, z);
      line(g, a, b, OL, 2 * r + 4); line(g, a, b, '#a5713f', 2 * r); line(g, [a[0], a[1] - r * 0.5], [b[0], b[1] - r * 0.5], 'rgba(255,255,255,0.3)', 1.6);
      g.beginPath(); g.ellipse(b[0], b[1], r * 0.9, r, 0, 0, TAU); g.fillStyle = '#e6c08a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
      g.beginPath(); g.ellipse(b[0], b[1], r * 0.35, r * 0.4, 0, 0, TAU); g.strokeStyle = '#a5713f'; g.lineWidth = 1; g.stroke();
    } else {
      const a = ISO(x + oy, y, z), b = ISO(x + oy, y + len, z);
      line(g, a, b, OL, 2 * r + 4); line(g, a, b, '#a5713f', 2 * r);
      g.beginPath(); g.ellipse(b[0], b[1], r * 0.9, r, 0, 0, TAU); g.fillStyle = '#e6c08a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    }
  }
}
function rockMound(g, cx, cy, s, col = P.rock) {
  const [x, y] = ISO(cx, cy, 0);
  const blobs = [[-26, -8, 18], [0, -20, 24], [24, -10, 17], [-10, -2, 15], [12, -1, 14]].map(([a, b, r]) => [x + a * s, y + b * s, r * s]);
  g.lineWidth = 5; g.strokeStyle = OL; for (const [a, b, r] of blobs) { g.beginPath(); g.arc(a, b, r, 0, TAU); g.stroke(); }
  for (const [a, b, r] of blobs) { g.beginPath(); g.arc(a, b, r, 0, TAU); g.fillStyle = col; g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.32)'; for (const [a, b, r] of blobs) { g.beginPath(); g.arc(a - r * 0.35, b - r * 0.4, r * 0.38, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(30,16,60,0.14)'; for (const [a, b, r] of blobs) { g.beginPath(); g.arc(a + r * 0.3, b + r * 0.3, r * 0.6, 0, TAU); g.fill(); }
}
function nuggets(g, pts) { for (const [x, y] of pts) { const [a, b] = ISO(x, y, 0); path(g, [[a - 3, b], [a - 2, b - 4], [a + 2, b - 5], [a + 4, b - 1], [a + 1, b + 1]]); g.fillStyle = P.gold; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); g.fillStyle = '#fff6c4'; g.fillRect(a - 1.5, b - 4, 1.6, 1.4); } }
function rails(g, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l * 4, ny = dx / l * 4;
  for (let f = 0; f <= 1; f += 0.12) { const x = a[0] + dx * f, y = a[1] + dy * f; line(g, ISO(x - nx * 1.6, y - ny * 1.6), ISO(x + nx * 1.6, y + ny * 1.6), '#7b5029', 3); }
  for (const s of [-1, 1]) line(g, ISO(a[0] + nx * s, a[1] + ny * s), ISO(b[0] + nx * s, b[1] + ny * s), P.iron, 1.8);
}
function minecart(g, x, y) {
  prism(g, x, y, 3, 14, 10, 9, '#8a5f3a', 'wood');
  for (const [dx, dy] of [[2, 10], [12, 10]]) { const [a, b] = ISO(x + dx, y + dy, 3); dot(g, a, b, 2.6, P.iron, 1.4); }
  const [a, b] = ISO(x + 7, y + 5, 12); for (const [ox, oy] of [[-4, 0], [2, -2], [5, 1], [-1, -4]]) { path(g, [[a + ox - 3, b + oy], [a + ox - 1, b + oy - 4], [a + ox + 3, b + oy - 3], [a + ox + 2, b + oy + 1]]); g.fillStyle = P.gold; g.fill(); g.lineWidth = 1.3; g.strokeStyle = OL; g.stroke(); }
}
function sails(g, x, y, t, r = 34, col = P.white) {
  const a0 = t * 1.2;
  for (let k = 0; k < 4; k++) {
    const a = a0 + k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    const tip = [x + c * r * 0.75, y + s * r], mid = [x + c * r * 0.2, y + s * r * 0.26];
    line(g, [x, y], tip, OL, 5); line(g, [x, y], tip, '#7b5029', 2.4);
    const px = -s, py = c; const w = 7;
    path(g, [[mid[0], mid[1]], [tip[0], tip[1]], [tip[0] + px * w * 0.75, tip[1] + py * w], [mid[0] + px * w * 0.75, mid[1] + py * w]]);
    g.fillStyle = col; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; for (const f of [0.4, 0.7]) { g.beginPath(); g.moveTo(mid[0] + (tip[0] - mid[0]) * f, mid[1] + (tip[1] - mid[1]) * f); g.lineTo(mid[0] + (tip[0] - mid[0]) * f + px * w * 0.75, mid[1] + (tip[1] - mid[1]) * f + py * w); g.stroke(); }
  }
  dot(g, x, y, 4, P.goldD, 2);
}
function waterWheel(g, x, y, z, t, r = 16) {
  const [cx, cy] = ISO(x, y, z + r);
  g.save(); g.translate(cx, cy); g.scale(0.62, 1);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.lineWidth = 6; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#8a5a31'; g.stroke();
  for (let k = 0; k < 8; k++) { const a = t * 1.6 + k * TAU / 8, c = Math.cos(a), s = Math.sin(a); line(g, [0, 0], [c * r, s * r], OL, 4); line(g, [0, 0], [c * r, s * r], '#a5713f', 2); g.save(); g.translate(c * r, s * r); g.rotate(a); g.fillStyle = '#a5713f'; g.fillRect(-1.5, -5, 7, 10); g.lineWidth = 1.4; g.strokeStyle = OL; g.strokeRect(-1.5, -5, 7, 10); g.restore(); }
  dot(g, 0, 0, 3.5, P.iron, 1.6);
  g.restore();
}
function stream(g, x0, y0, x1, y1, w, t) {
  const pts = [ISO(x0, y0 - w / 2), ISO(x1, y1 - w / 2), ISO(x1, y1 + w / 2), ISO(x0, y0 + w / 2)];
  face(g, pts, P.water, () => { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.6; for (let k = 0; k < 5; k++) { const f = ((t * 0.3 + k / 5) % 1), a = ISO(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - 2 + (k % 3) * 2), b = ISO(x0 + (x1 - x0) * f + 5, y0 + (y1 - y0) * f - 2 + (k % 3) * 2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }, 2.2);
}
function column(g, x, y, h, col = P.marble, r = 3.4) {
  cylinder(g, x, y, 0, 3, r + 1.6, col);
  const b = cylBody(g, x, y, 3, h - 3, r, col);
  g.save(); g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 1; for (const u of [-0.45, 0, 0.45]) { g.beginPath(); g.moveTo(b.sx + u * b.rx, b.sb + b.ry * Math.sqrt(1 - u * u)); g.lineTo(b.sx + u * b.rx, b.st + b.ry * Math.sqrt(1 - u * u)); g.stroke(); } g.restore();
  cylCap(g, x, y, h - 3, r, col);
  prism(g, x - r - 1.5, y - r - 1.5, h - 3, 2 * r + 3, 2 * r + 3, 3, col);
}
function horseHead(g, x, y, t, col = P.horse) {
  const bob = Math.sin(t * 1.6) * 1.5;
  g.save(); g.translate(x, y + bob);
  path(g, [[-4, 0], [-1, -14], [9, -18], [16, -10], [14, -6], [6, -8], [5, 4]]); g.fillStyle = col; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
  path(g, [[-3, -6], [-1, -16], [3, -18], [0, -10]]); g.fillStyle = '#3b2a22'; g.fill(); g.stroke();
  path(g, [[3, -17], [4, -23], [7, -17]]); g.fillStyle = col; g.fill(); g.stroke();
  g.fillStyle = OL; g.beginPath(); g.arc(8, -13, 1.6, 0, TAU); g.fill(); g.beginPath(); g.arc(14.5, -8.5, 0.9, 0, TAU); g.fill();
  g.restore();
}
function trough(g, x, y) { prism(g, x, y, 0, 18, 7, 6, '#8a5f3a', 'wood'); const a = ISO(x + 1.5, y + 1.5, 6), b = ISO(x + 16.5, y + 1.5, 6), c = ISO(x + 16.5, y + 5.5, 6), d = ISO(x + 1.5, y + 5.5, 6); path(g, [a, b, c, d]); g.fillStyle = P.water; g.fill(); }
function crystalFloat(g, x, y, t, s = 1, col = P.crystal) {
  const bob = Math.sin(t * 2.2) * 3;
  const gr = g.createRadialGradient(x, y + bob, 0, x, y + bob, 26 * s); gr.addColorStop(0, 'rgba(160,240,255,0.65)'); gr.addColorStop(1, 'rgba(160,240,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y + bob, 26 * s, 0, TAU); g.fill();
  path(g, [[x, y - 14 * s + bob], [x + 7 * s, y + bob], [x, y + 12 * s + bob], [x - 7 * s, y + bob]]); g.fillStyle = col; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
  path(g, [[x, y - 12 * s + bob], [x + 3 * s, y + bob], [x, y + 8 * s + bob]]); g.fillStyle = '#e8fbff'; g.fill();
}
function rune(g, x, y, r, t, col = '#c9b6ff') {
  g.save(); g.translate(x, y); g.rotate(t);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.lineWidth = 2; g.strokeStyle = col; g.stroke();
  for (let k = 0; k < 3; k++) { const a = k * TAU / 3; g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a + 2.1) * r, Math.sin(a + 2.1) * r); g.stroke(); }
  g.restore();
}
function sparkle(g, x, y, t, col = '#fff3a6') { const a = (Math.sin(t * 4 + x) + 1) / 2; g.save(); g.globalAlpha = 0.4 + a * 0.6; g.fillStyle = col; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 1.2 : 4 * (0.6 + a * 0.4), q = i * Math.PI / 4; g.lineTo(x + Math.cos(q) * r, y + Math.sin(q) * r); } g.closePath(); g.fill(); g.restore(); }
function bannerPole(g, x, y, t, col = '#3f72d9', h = 30) { const [a, b] = ISO(x, y, 0); flag(g, a, b, t, 18, col, h); }
function gableRoof(g, x, y, w, d, h, rh, roof, o = 3) {
  // ridge along x; shows near slope (y+d side) and gable end at x+w
  face(g, [ISO(x + w, y + d, h), ISO(x + w, y, h), ISO(x + w, y + d / 2, h + rh)], dark('#e9dfc8'));
  face(g, [ISO(x - o, y + d + o, h - 2), ISO(x + w + o, y + d + o, h - 2), ISO(x + w + o, y + d / 2, h + rh), ISO(x - o, y + d / 2, h + rh)], roof, () => { for (let f = 0.25; f < 1; f += 0.25) line(g, ISO(x - o, y + d + o - (d / 2 + o) * f, h - 2 + (rh + 2) * f), ISO(x + w + o, y + d + o - (d / 2 + o) * f, h - 2 + (rh + 2) * f), 'rgba(0,0,0,0.22)', 1.4); line(g, ISO(x - o, y + d + o - 1, h - 1), ISO(x + w + o, y + d + o - 1, h - 1), 'rgba(255,255,255,0.35)', 3); });
  line(g, ISO(x - o, y + d / 2, h + rh), ISO(x + w + o, y + d / 2, h + rh), OL, 4); line(g, ISO(x - o, y + d / 2, h + rh), ISO(x + w + o, y + d / 2, h + rh), dark(roof), 2);
}
function bigDoorLeft(g, x, y, z, w, h, col = '#7b5029') { // on the face at y fixed
  face(g, [ISO(x, y, z), ISO(x + w, y, z), ISO(x + w, y, z + h), ISO(x, y, z + h)], col, () => { line(g, ISO(x, y, z), ISO(x + w, y, z + h), 'rgba(255,255,255,0.35)', 2); line(g, ISO(x + w, y, z), ISO(x, y, z + h), 'rgba(255,255,255,0.35)', 2); line(g, ISO(x + w / 2, y, z), ISO(x + w / 2, y, z + h), 'rgba(0,0,0,0.3)', 1.4); }, 2.2);
}
function winLeft(g, x, y, z, w = 6, h = 7, col = '#2a2731') { face(g, [ISO(x, y, z), ISO(x + w, y, z), ISO(x + w, y, z + h), ISO(x, y, z + h)], col, null, 1.8); }
function winRight(g, x, y, z, d = 6, h = 7, col = '#2a2731') { face(g, [ISO(x, y, z), ISO(x, y + d, z), ISO(x, y + d, z + h), ISO(x, y, z + h)], col, null, 1.8); }

// ---------- designs: every building has three takes ----------
const B = {};
B.farm = [
  { name: 'Homestead', note: 'Farmhouse, fenced wheat field and a haystack.', draw(g, t) {
    house(g, -34, -34, 30, 22, 18, P.red, t, { chimney: true });
    haystack(g, 18, -24, 1);
    cropRows(g, -10, -2, 44, 34, 'wheat', t);
    fenceRun(g, [-12, 34], [36, 34], 10, 7); fenceRun(g, [36, -4], [36, 34], 10, 5);
  } },
  { name: 'Windmill', note: 'Stone windmill with turning sails, flour sacks and a corn patch.', draw(g, t) {
    cropRows(g, 4, 6, 30, 28, 'corn', t);
    const b = cylinder(g, -12, -12, 0, 46, 15, C.stone, 'stone');
    windowsOn(g, -12, -12, 14, 15, [0.1], 12);
    windowsOn(g, -12, -12, 32, 15, [-0.4], 9, 1);
    const [ax, ay] = cone(g, -12, -12, 45, 18, 20, P.red, true);
    const [hx, hy] = ISO(-12, -12, 50); sails(g, hx + 14, hy + 10, t, 34);
    for (const [x, y] of [[-30, 14], [-22, 20]]) { const [a, c] = ISO(x, y, 0); path(g, [[a - 7, c], [a - 8, c - 9], [a - 3, c - 13], [a - 4, c - 17], [a + 4, c - 17], [a + 3, c - 13], [a + 8, c - 9], [a + 7, c]]); g.fillStyle = '#efe6cf'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); line(g, [a - 4, c - 13], [a + 4, c - 13], '#a8662a', 2); g.fillStyle = '#c9a24d'; g.font = '8px sans-serif'; g.textAlign = 'center'; g.fillText('✿', a, c - 4); }
  } },
  { name: 'Orchard Barn', note: 'Big red barn, apple trees and a pumpkin patch.', draw(g, t) {
    tree(g, -32, 6, 0.9); tree(g, -30, 24, 0.85);
    prism(g, -24, -36, 0, 36, 28, 22, P.red, 'wood');
    gableRoof(g, -24, -36, 36, 28, 22, 16, '#7a3b2e');
    line(g, ISO(-24, -8, 22), ISO(12, -8, 22), '#fff', 2);
    bigDoorLeft(g, -14, -8, 0, 14, 16, '#fbfdff');
    face(g, [ISO(12, -26, 26), ISO(12, -18, 26), ISO(12, -18, 32), ISO(12, -26, 32)], '#fbfdff', null, 1.8);
    for (const [x, y] of [[-32, 8], [-28, 24]]) { const [a, b] = ISO(x, y, 22); for (const [ox, oy] of [[-6, 2], [4, -3], [1, 5]]) dot(g, a + ox, b + oy, 2.2, '#e0453b', 1.2); }
    cropRows(g, 10, 8, 26, 26, 'pumpkin', t);
    hayBale(g, 18, -30);
  } }
];
B.lumber = [
  { name: 'Water Sawmill', note: 'Mill shed on a stream with a turning water wheel and stacked logs.', draw(g, t) {
    stream(g, -40, 26, 40, 26, 16, t);
    prism(g, -30, -30, 0, 34, 26, 22, C.wood, 'wood');
    gableRoof(g, -30, -30, 34, 26, 22, 13, '#6f7480');
    waterWheel(g, -6, 5, 0, t, 15);
    logPile(g, 10, -32, 6, 24, 'y');
    const [sx, sy] = ISO(-30 + 26, -30 + 8, 35); smoke(g, sx, sy, t, 3, 0.6);
  } },
  { name: 'Woodcutter’s Lodge', note: 'Log cabin, chopping block with an axe, and a big woodpile.', draw(g, t) {
    tree(g, -36, -36, 1.1); tree(g, -20, -40, 0.95);
    prism(g, -32, -20, 0, 30, 24, 18, '#9a6436', 'wood');
    for (let z = 4; z < 18; z += 4.5) line(g, ISO(-32, 4, z), ISO(-2, 4, z), 'rgba(0,0,0,0.3)', 1.8);
    gableRoof(g, -32, -20, 30, 24, 18, 12, '#3f7a58');
    bigDoorLeft(g, -22, 4, 0, 8, 12);
    logPile(g, 6, -26, 6, 26, 'x');
    { const [a, b] = ISO(16, 20, 0); g.beginPath(); g.ellipse(a, b - 6, 8, 4, 0, 0, TAU); g.fillStyle = '#e6c08a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); path(g, [[a - 8, b - 6], [a - 8, b + 2], [a + 8, b + 2], [a + 8, b - 6]]); g.fillStyle = '#a5713f'; g.fill(); g.stroke(); g.beginPath(); g.ellipse(a, b - 6, 8, 4, 0, 0, TAU); g.fillStyle = '#e6c08a'; g.fill(); g.stroke();
      line(g, [a + 1, b - 7], [a + 8, b - 22], OL, 5); line(g, [a + 1, b - 7], [a + 8, b - 22], '#8a5a31', 2.6); path(g, [[a + 4, b - 22], [a + 13, b - 26], [a + 13, b - 17]]); g.fillStyle = '#d6dde6'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); }
    for (const [x, y] of [[26, 8], [30, 16]]) { const [a, b] = ISO(x, y, 0); g.beginPath(); g.ellipse(a, b - 2, 4, 2.4, 0.4, 0, TAU); g.fillStyle = '#e6c08a'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); }
  } },
  { name: 'Timber Yard', note: 'Open saw shed with a big blade, a crane hoisting a log, and lumber stacks.', draw(g, t) {
    // crane at the back
    const base = ISO(-26, -30, 0), top = ISO(-26, -30, 54);
    line(g, base, top, OL, 7); line(g, base, top, '#8a5a31', 4);
    const arm = ISO(10, -30, 52); line(g, top, arm, OL, 6); line(g, top, arm, '#a5713f', 3);
    const swing = Math.sin(t * 1.2) * 3, hook = [arm[0] + swing, arm[1] + 26];
    line(g, arm, hook, OL, 1.4);
    line(g, [hook[0] - 14, hook[1] + 2], [hook[0] + 14, hook[1] - 4], OL, 10); line(g, [hook[0] - 14, hook[1] + 2], [hook[0] + 14, hook[1] - 4], '#a5713f', 6);
    // shed: posts and roof
    for (const [x, y] of [[-30, -6], [-2, -6], [-30, 18], [-2, 18]]) line(g, ISO(x, y, 0), ISO(x, y, 20), OL, 5);
    for (const [x, y] of [[-30, -6], [-2, -6], [-30, 18], [-2, 18]]) line(g, ISO(x, y, 0), ISO(x, y, 20), '#8a5a31', 2.6);
    prism(g, -24, 0, 0, 18, 12, 8, '#8a5f3a', 'wood');
    { const [a, b] = ISO(-15, 6, 14); g.save(); g.translate(a, b); g.rotate(t * 6); g.beginPath(); for (let k = 0; k < 16; k++) { const q = k * TAU / 16, r = k % 2 ? 7 : 9; g.lineTo(Math.cos(q) * r, Math.sin(q) * r); } g.closePath(); g.fillStyle = '#d6dde6'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); g.restore(); dot(g, a, b, 2, P.iron, 1); }
    gableRoof(g, -33, -9, 34, 30, 20, 9, '#6f7480');
    // lumber stacks
    for (const [x, y, n] of [[10, -4, 4], [10, 16, 3]]) for (let k = 0; k < n; k++) prism(g, x, y, k * 4, 26, 12, 4, k % 2 ? '#d9b47a' : '#c99a5e');
  } }
];
B.barracks = [
  { name: 'Longhouse Barracks', note: 'Timber longhouse with shields on the wall, weapon rack and banners.', draw(g, t) {
    bannerPole(g, -36, -36, t); bannerPole(g, 34, -36, t);
    prism(g, -34, -26, 0, 60, 26, 18, '#c9b48e');
    for (const f of [0.02, 0.33, 0.66, 0.98]) line(g, ISO(-34 + 60 * f, 0, 0), ISO(-34 + 60 * f, 0, 18), '#7b5029', 2.4);
    gableRoof(g, -34, -26, 60, 26, 18, 14, P.red);
    bigDoorLeft(g, -8, 0, 0, 10, 13);
    for (const x of [-26, 8, 18]) { const [a, b] = ISO(x, 0, 11); dot(g, a, b, 4.5, x === 8 ? '#3f72d9' : '#c8473d', 2); dot(g, a, b, 1.6, P.gold, 1); }
    // weapon rack
    prism(g, 6, 14, 0, 26, 4, 3, '#8a5f3a');
    for (let k = 0; k < 5; k++) { const [a, b] = ISO(9 + k * 5, 16, 3); line(g, [a, b], [a + 2, b - 22], OL, 3.4); line(g, [a, b], [a + 2, b - 22], k % 2 ? '#c9d2de' : '#a5713f', 1.6); path(g, [[a + 2, b - 22], [a, b - 28], [a + 4, b - 28]]); g.fillStyle = '#eef2f7'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke(); }
    dummy(g, -24, 20, t);
  } },
  { name: 'Stone Garrison', note: 'Crenellated stone hall with a training yard and two dummies.', draw(g, t) {
    prism(g, -36, -36, 0, 44, 30, 24, C.stone, 'stone');
    K.merlonsRect(g, -36, -36, 24, 44, 30, C.stone);
    { const [a, b] = ISO(-14, -6, 16); hangingBanner(g, a, b, 14, t); }
    bigDoorLeft(g, -24, -6, 0, 10, 13);
    winRight(g, 8, -28, 12); winRight(g, 8, -16, 12);
    face(g, [ISO(-30, 4), ISO(32, 4), ISO(32, 34), ISO(-30, 34)], '#d9b77a', null, 2);
    dummy(g, -10, 20, t); dummy(g, 14, 22, t + 1);
    fenceRun(g, [-30, 34], [32, 34], 9, 8); fenceRun(g, [32, 4], [32, 34], 9, 5);
    bannerPole(g, 24, -32, t, '#3f72d9', 34);
  } },
  { name: 'War Camp', note: 'Striped command tent, soldier tents and a campfire.', draw(g, t) {
    tent(g, -36, -36, 22, 16, 16, '#efe6cf', null);
    tent(g, 12, -38, 22, 16, 16, '#efe6cf', null);
    tent(g, -18, -14, 36, 26, 28, '#3f72d9', '#f4c44f');
    { const [a, b] = ISO(0, -1, 28); flag(g, a, b, t, 20, '#c8473d', 18); }
    campfire(g, 14, 22, t);
    for (const [x, y] of [[-30, 22], [-22, 28]]) barrel(g, x, y);
    for (let k = 0; k < 3; k++) { const [a, b] = ISO(-34 + k * 6, 36, 0); line(g, [a, b], [a + 4, b - 20], OL, 3); line(g, [a, b], [a + 4, b - 20], '#a5713f', 1.4); }
  } }
];
B.stable = [
  { name: 'Wooden Stable', note: 'Half-door stalls with horses peeking out and hay bales.', draw(g, t) {
    prism(g, -34, -30, 0, 58, 24, 18, C.wood, 'wood');
    gableRoof(g, -34, -30, 58, 24, 18, 11, '#c8473d');
    for (let k = 0; k < 3; k++) {
      const x = -28 + k * 18;
      face(g, [ISO(x, -6, 0), ISO(x + 12, -6, 0), ISO(x + 12, -6, 15), ISO(x, -6, 15)], '#2a2731', null, 2);
      bigDoorLeft(g, x, -6, 0, 12, 8, '#8a5f3a');
      const [a, b] = ISO(x + 6, -6, 10); horseHead(g, a - 4, b + 2, t + k * 1.7, ['#9a5b32', '#eceae4', '#3a3236'][k]);
    }
    hayBale(g, 8, 10); hayBale(g, 16, 14); hayBale(g, 11, 13);
    { const [a, b] = ISO(16, 14, 8); line(g, [a, b], [a + 3, b - 18], OL, 3); line(g, [a, b], [a + 3, b - 18], '#a5713f', 1.4); for (const d of [-3, 0, 3]) line(g, [a + 3, b - 18], [a + 3 + d, b - 25], '#c9d2de', 1.6); }
    trough(g, -26, 16);
  } },
  { name: 'Stone Stable & Paddock', note: 'Stone stable with a fenced paddock and a grazing horse.', draw(g, t) {
    prism(g, -36, -36, 0, 30, 30, 20, C.stone, 'stone');
    gableRoof(g, -36, -36, 30, 30, 20, 13, '#3f72d9');
    bigDoorLeft(g, -26, -6, 0, 10, 13);
    winRight(g, -6, -26, 10, 8, 6);
    face(g, [ISO(0, -30), ISO(34, -30), ISO(34, 34), ISO(-30, 34), ISO(-30, 4), ISO(0, 4)], '#a8d86a', null, 1.6);
    fenceRun(g, [0, -30], [34, -30], 10, 5);
    fenceRun(g, [-30, 4], [-30, 34], 10, 4);
    { const [a, b] = ISO(14, 6, 0); g.save(); g.translate(a, b); const sc = 0.32; g.scale(sc, sc); if (root.RealmIso) root.RealmIso.drawUnitAt(g, 'cavalry:B', -Math.PI / 4, t, 0, 0, 1); g.restore(); }
    trough(g, 14, 24);
    fenceRun(g, [-30, 34], [34, 34], 10, 9); fenceRun(g, [34, -30], [34, 34], 10, 9);
  } },
  { name: 'Horse Corral', note: 'Round corral, roofed lean-to stalls, a water trough and a horseshoe sign.', draw(g, t) {
    prism(g, -36, -36, 0, 64, 14, 14, '#8a5f3a', 'wood');
    face(g, [ISO(-38, -20, 13), ISO(30, -20, 13), ISO(30, -38, 22), ISO(-38, -38, 22)], '#3f7a58', () => line(g, ISO(-38, -21, 14), ISO(30, -21, 14), 'rgba(255,255,255,0.3)', 3));
    for (let k = 0; k < 3; k++) { const [a, b] = ISO(-28 + k * 20, -22, 9); horseHead(g, a - 5, b + 4, t + k, ['#eceae4', '#9a5b32', '#c48a4a'][k]); }
    // round corral fence
    const R = 28, cx = 2, cy = 12, N = 18;
    const ring = []; for (let k = 0; k < N; k++) { const a = k * TAU / N; ring.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
    const back = [], front = [];
    for (let k = 0; k < N; k++) { const a = ring[k], b = ring[(k + 1) % N]; ((a[0] + a[1] + b[0] + b[1]) / 2 < cx + cy ? back : front).push([a, b]); }
    for (const [a, b] of back) fenceRun(g, a, b, 9, 1);
    face(g, ring.map(([x, y]) => ISO(x, y)), 'rgba(217,183,122,0.6)', null, 0.01);
    trough(g, -6, 10);
    { const [a, b] = ISO(10, 14, 0); g.save(); g.translate(a, b); g.scale(0.3, 0.3); if (root.RealmIso) root.RealmIso.drawUnitAt(g, 'cavalry:B', Math.PI / 2 + Math.sin(t * 0.5) * 0.3, t, 0, 0, 1); g.restore(); }
    for (const [a, b] of front) fenceRun(g, a, b, 9, 1);
    { const [a, b] = ISO(34, -6, 0); line(g, [a, b], [a, b - 28], OL, 4.5); line(g, [a, b], [a, b - 28], '#8a5a31', 2.4); g.beginPath(); g.arc(a, b - 32, 7, 0.25 * Math.PI, 2.75 * Math.PI); g.lineWidth = 6; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#c9d2de'; g.stroke(); }
  } }
];
B.mage = [
  { name: 'Arcane Spire', note: 'Slender purple-roofed tower with a crystal hovering at the peak.', draw(g, t) {
    for (const [x, y] of [[-28, 20], [24, -26], [22, 24]]) { const [a, b] = ISO(x, y, 0); rune(g, a, b - 4, 7, t * 0.6, 'rgba(160,120,255,0.85)'); }
    cylinder(g, 0, 0, 0, 24, 20, '#b9b3c9', 'stone');
    K.door(g, 0, 0, 20, 18, 7, '#5a3c9e');
    cylinder(g, 0, 0, 24, 28, 22, '#b9b3c9');
    cylBody(g, 0, 0, 28, 82, 14, '#b9b3c9', 'stone'); cylCap(g, 0, 0, 82, 14, '#b9b3c9');
    windowsOn(g, 0, 0, 44, 14, [-0.3], 12, 1); windowsOn(g, 0, 0, 64, 14, [0.35], 12, 1);
    cylinder(g, 0, 0, 82, 86, 18, P.purpleD);
    const [ax, ay] = cone(g, 0, 0, 86, 20, 46, P.purple, false);
    crystalFloat(g, ax, ay - 20, t, 0.9);
    for (let k = 0; k < 3; k++) { const a = t * 1.3 + k * 2.1; sparkle(g, ax + Math.cos(a) * 22, ay - 10 + Math.sin(a) * 8, t + k); }
  } },
  { name: 'Star Observatory', note: 'Domed observatory with a brass telescope and a star-chart plaza.', draw(g, t) {
    face(g, (() => { const p = []; for (let k = 0; k < 24; k++) { const a = k * TAU / 24; p.push(ISO(Math.cos(a) * 36, Math.sin(a) * 36)); } return p; })(), '#d8d2c4', () => { const [a, b] = ISO(0, 0); for (let k = 0; k < 6; k++) { const q = k * TAU / 6 + 0.3; g.strokeStyle = 'rgba(80,60,160,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(a, b); g.lineTo(a + Math.cos(q) * 46, b + Math.sin(q) * 23); g.stroke(); } }, 2);
    cylinder(g, 0, -4, 0, 30, 24, '#e9e4f2', 'stone');
    windowsOn(g, 0, -4, 10, 24, [-0.5, 0.45], 12, 1);
    // dome
    const [sx, sy] = ISO(0, -4, 30), rx = 24 * Math.SQRT2;
    g.beginPath(); g.moveTo(sx - rx, sy); g.bezierCurveTo(sx - rx, sy - 46, sx + rx, sy - 46, sx + rx, sy); g.ellipse(sx, sy, rx, rx / 2, 0, 0, Math.PI); g.closePath();
    const gr = g.createLinearGradient(sx - rx, 0, sx + rx, 0); gr.addColorStop(0, '#9c86e0'); gr.addColorStop(0.3, '#9c86e0'); gr.addColorStop(0.3, P.purple); gr.addColorStop(0.65, P.purple); gr.addColorStop(0.65, P.purpleD); gr.addColorStop(1, P.purpleD);
    g.fillStyle = gr; g.fill(); g.lineWidth = 2.8; g.strokeStyle = OL; g.stroke();
    path(g, [[sx - 5, sy + 8], [sx - 4, sy - 34], [sx + 4, sy - 34], [sx + 5, sy + 8]]); g.fillStyle = '#2a2731'; g.fill(); g.lineWidth = 2; g.stroke();
    // telescope
    g.save(); g.translate(sx + 2, sy - 24); g.rotate(-0.8 + Math.sin(t * 0.4) * 0.12);
    g.beginPath(); g.roundRect(-4, -6, 40, 12, 4); g.fillStyle = P.goldD; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.roundRect(30, -8, 10, 16, 3); g.fillStyle = P.gold; g.fill(); g.stroke(); g.fillStyle = '#9fe0f5'; g.beginPath(); g.arc(40, 0, 4, 0, TAU); g.fill();
    g.restore();
    for (let k = 0; k < 4; k++) sparkle(g, sx - 50 + k * 30, sy - 70 - (k % 2) * 12, t + k);
  } },
  { name: 'Floating Sanctum', note: 'A small tower lifted off the ground on a floating rock, with orbiting runes.', draw(g, t) {
    const [gx, gy] = ISO(0, 0, 0);
    for (let k = 0; k < 3; k++) { const a = t * 0.8 + k * 2.1; rune(g, gx + Math.cos(a) * 34, gy + Math.sin(a) * 14 - 4, 6, t, 'rgba(160,120,255,0.9)'); }
    g.fillStyle = 'rgba(80,40,160,0.18)'; g.beginPath(); g.ellipse(gx, gy, 30, 13, 0, 0, TAU); g.fill();
    const lift = 22 + Math.sin(t * 1.4) * 3;
    g.save(); g.translate(0, -lift);
    // underside of the floating rock
    path(g, [[gx - 32, gy - 2], [gx - 18, gy + 20], [gx - 4, gy + 34], [gx + 8, gy + 22], [gx + 24, gy + 14], [gx + 32, gy - 2]]); g.fillStyle = P.rockD; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.ellipse(gx, gy - 2, 32, 15, 0, 0, TAU); g.fillStyle = '#9bd95f'; g.fill(); g.lineWidth = 2.6; g.stroke();
    cylinder(g, 0, 0, 0, 40, 12, '#e9e4f2', 'stone');
    windowsOn(g, 0, 0, 16, 12, [0.1], 12, 1);
    const [ax, ay] = cone(g, 0, 0, 40, 16, 34, P.purple, true);
    g.restore();
    for (const [dx, dy, r] of [[-38, -40, 5], [36, -54, 4], [28, -18, 3.5]]) { const b = Math.sin(t * 1.8 + dx) * 3; path(g, [[gx + dx - r, gy + dy + b], [gx + dx, gy + dy - r + b], [gx + dx + r, gy + dy + b], [gx + dx, gy + dy + r * 1.6 + b]]); g.fillStyle = P.rock; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); }
    sparkle(g, gx + 12, gy - lift - 80, t, '#e1d4ff');
  } }
];
B.goldmine = [
  { name: 'Hillside Mine', note: 'Timber-framed tunnel into a rocky hill, a minecart on rails and gold nuggets.', draw(g, t) {
    rockMound(g, -14, -18, 1.25);
    { const [a, b] = ISO(-6, 2, 0); path(g, [[a - 14, b], [a - 14, b - 22], [a + 14, b - 22], [a + 14, b]]); g.fillStyle = '#1d1a22'; g.fill();
      for (const dx of [-14, 14]) { line(g, [a + dx, b + 1], [a + dx, b - 24], OL, 6); line(g, [a + dx, b + 1], [a + dx, b - 24], '#8a5a31', 3.4); }
      line(g, [a - 18, b - 24], [a + 18, b - 24], OL, 7); line(g, [a - 18, b - 24], [a + 18, b - 24], '#a5713f', 4);
      g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(a + 8, b - 18, 2.4, 0, TAU); g.fill(); }
    rails(g, [-6, 4], [30, 30]);
    minecart(g, 10, 14);
    nuggets(g, [[24, 0], [28, 6], [32, 2], [-28, 22], [-24, 28]]);
    { const [a, b] = ISO(-30, 10, 0); line(g, [a, b], [a + 6, b - 18], OL, 3.6); line(g, [a, b], [a + 6, b - 18], '#a5713f', 1.6); g.beginPath(); g.moveTo(a - 2, b - 16); g.quadraticCurveTo(a + 6, b - 24, a + 14, b - 17); g.lineWidth = 4.2; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.2; g.strokeStyle = '#c9d2de'; g.stroke(); }
    for (let k = 0; k < 3; k++) { const [a, b] = ISO(28 + k * 2, 2 + k * 2, 6); sparkle(g, a, b - 6, t + k); }
  } },
  { name: 'Placer Sluice', note: 'Wooden sluice on a stream, panning trays and a gold strongbox.', draw(g, t) {
    stream(g, -40, -10, 40, -10, 18, t);
    // raised sluice box
    for (const x of [-26, -6, 14]) for (const y of [-16, -4]) { const p = ISO(x, y, 0), q = ISO(x, y, 12 - x * 0.12); line(g, p, q, OL, 4.5); line(g, p, q, '#8a5a31', 2.4); }
    face(g, [ISO(-32, -16, 15), ISO(26, -16, 9), ISO(26, -4, 9), ISO(-32, -4, 15)], '#a5713f', () => { for (let x = -28; x < 26; x += 6) line(g, ISO(x, -16, 15 - (x + 32) * 0.1), ISO(x, -4, 15 - (x + 32) * 0.1), 'rgba(0,0,0,0.3)', 1.6); for (let k = 0; k < 5; k++) { const f = ((t * 0.5 + k / 5) % 1), x = -30 + f * 54; const [a, b] = ISO(x, -10, 15.5 - (x + 32) * 0.1); g.fillStyle = 'rgba(160,215,250,0.9)'; g.fillRect(a - 3, b - 1, 6, 2); } });
    prism(g, -10, 10, 0, 22, 14, 12, '#7b5029', 'wood'); face(g, [ISO(-10, 10, 12), ISO(12, 10, 12), ISO(12, 24, 12), ISO(-10, 24, 12)], P.gold);
    for (let k = 0; k < 4; k++) { const [a, b] = ISO(-6 + k * 5, 16, 13); sparkle(g, a, b - 3, t + k); }
    for (const [x, y] of [[20, 14], [26, 26]]) { const [a, b] = ISO(x, y, 0); g.beginPath(); g.ellipse(a, b - 2, 9, 4.5, 0, 0, TAU); g.fillStyle = '#8f9bad'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); dot(g, a, b - 2, 2, P.gold, 1); }
    nuggets(g, [[-28, 18], [-22, 24]]);
  } },
  { name: 'Deep Shaft', note: 'Tall headframe with a spinning pulley wheel, ore buckets and a gold pile.', draw(g, t) {
    face(g, [ISO(-20, -20), ISO(20, -20), ISO(20, 20), ISO(-20, 20)], '#8a7a66', null, 2);
    { const [a, b] = ISO(0, 0, 0); g.beginPath(); g.ellipse(a, b, 14, 7, 0, 0, TAU); g.fillStyle = '#1d1a22'; g.fill(); }
    const top = ISO(0, 0, 70);
    for (const [x, y] of [[-16, -16], [16, -16], [-16, 16], [16, 16]]) { const p = ISO(x, y, 0); line(g, p, [top[0] + x * 0.3, top[1] + 4], OL, 6); line(g, p, [top[0] + x * 0.3, top[1] + 4], '#8a5a31', 3.4); }
    for (const z of [22, 44]) { const s = 1 - z / 90; const pts = [[-16, -16], [16, -16], [16, 16], [-16, 16]].map(([x, y]) => ISO(x * s, y * s, z)); for (let k = 0; k < 4; k++) { line(g, pts[k], pts[(k + 1) % 4], OL, 4.5); line(g, pts[k], pts[(k + 1) % 4], '#a5713f', 2.4); } }
    g.save(); g.translate(top[0], top[1]); g.scale(0.7, 1);
    g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.lineWidth = 6; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = P.iron; g.stroke();
    for (let k = 0; k < 6; k++) { const a = t * 2.5 + k * TAU / 6; line(g, [0, 0], [Math.cos(a) * 13, Math.sin(a) * 13], P.iron, 2); }
    dot(g, 0, 0, 3, P.goldD, 1.4); g.restore();
    const yb = (Math.sin(t * 1.2) + 1) / 2;
    line(g, [top[0] + 9, top[1]], [top[0] + 9, top[1] + 30 + yb * 26], OL, 1.4);
    { const bx = top[0] + 9, by = top[1] + 30 + yb * 26; path(g, [[bx - 6, by], [bx + 6, by], [bx + 5, by + 9], [bx - 5, by + 9]]); g.fillStyle = '#8f9bad'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); dot(g, bx, by, 2, P.gold, 1); }
    { const [a, b] = ISO(28, 22, 0); g.beginPath(); g.moveTo(a - 16, b); g.quadraticCurveTo(a, b - 22, a + 16, b); g.closePath(); g.fillStyle = P.gold; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(a - 4, b - 9, 4, 2, -0.4, 0, TAU); g.fill(); for (let k = 0; k < 3; k++) sparkle(g, a - 8 + k * 8, b - 12 + (k % 2) * 4, t + k); }
    minecart(g, -34, 18);
  } }
];
B.temple = [
  { name: 'Marble Temple', note: 'Columned marble temple on a stepped base with a gold-trimmed pediment.', draw(g, t) {
    prism(g, -36, -30, 0, 66, 54, 4, '#e3ded2'); prism(g, -32, -26, 4, 58, 46, 4, P.marble);
    prism(g, -24, -20, 8, 42, 30, 26, '#e9e4d8');
    for (const x of [-28, -14, 0, 14]) column(g, x + 4, 14, 36, P.marble, 3.2);
    for (const y of [-12, 2]) column(g, 24, y, 36, P.marble, 3.2);
    prism(g, -30, -24, 36, 58, 42, 5, P.marble);
    face(g, [ISO(28, 18, 41), ISO(28, -24, 41), ISO(28, -3, 56)], '#e9e4d8', () => { const [a, b] = ISO(28, -3, 46); g.beginPath(); g.arc(a, b, 4, 0, TAU); g.fillStyle = P.gold; g.fill(); });
    face(g, [ISO(-31, 19, 40), ISO(29, 19, 40), ISO(29, -3, 56), ISO(-31, -3, 56)], '#c9a24d', () => line(g, ISO(-31, 18, 41), ISO(29, 18, 41), 'rgba(255,255,255,0.4)', 3));
    for (const [x, y] of [[-34, 30], [32, 30]]) { const [a, b] = ISO(x, y, 0); line(g, [a, b], [a, b - 14], OL, 4); line(g, [a, b], [a, b - 14], '#8f9bad', 2); g.beginPath(); g.ellipse(a, b - 15, 5, 2.5, 0, 0, TAU); g.fillStyle = '#5b6270'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke(); const f = 1 + Math.sin(t * 12 + x) * 0.15; path(g, [[a - 3, b - 16], [a, b - 25 * f], [a + 3, b - 16]]); g.fillStyle = '#ff9a3c'; g.fill(); }
  } },
  { name: 'Bell Chapel', note: 'Stone chapel with a rose window and a bell tower that swings.', draw(g, t) {
    prism(g, -30, -20, 0, 40, 26, 22, '#e2dccd', 'stone');
    gableRoof(g, -30, -20, 40, 26, 22, 14, '#3f72d9');
    // rose window on the gable end
    { const [a, b] = ISO(10, -7, 26); g.beginPath(); g.arc(a, b, 5.5, 0, TAU); g.fillStyle = '#ffd36b'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); for (let k = 0; k < 4; k++) { const q = k * Math.PI / 4; line(g, [a - Math.cos(q) * 5, b - Math.sin(q) * 5], [a + Math.cos(q) * 5, b + Math.sin(q) * 5], OL, 1.2); } }
    for (const x of [-24, -12]) winLeft(g, x, 6, 8, 5, 10, '#ffd36b');
    bigDoorLeft(g, -4, 6, 0, 9, 13, '#7b5029');
    // bell tower
    prism(g, -40, -30, 0, 14, 14, 44, '#e2dccd', 'stone');
    const swing = Math.sin(t * 3) * 0.35;
    { const [a, b] = ISO(-33, -16, 36); path(g, [[a - 10, b - 8], [a + 10, b - 8], [a + 10, b + 4], [a - 10, b + 4]]); g.fillStyle = '#2a2731'; g.fill();
      g.save(); g.translate(a, b - 7); g.rotate(swing); path(g, [[-4, 0], [4, 0], [7, 9], [-7, 9]]); g.fillStyle = P.gold; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); dot(g, 0, 10, 1.6, P.goldD, 1); g.restore(); }
    const [ax, ay] = cone(g, -33, -23, 44, 10, 26, '#3f72d9', true);
    line(g, [ax, ay - 2], [ax, ay - 14], OL, 4); line(g, [ax, ay - 2], [ax, ay - 14], P.gold, 2); line(g, [ax - 5, ay - 9], [ax + 5, ay - 9], OL, 4); line(g, [ax - 5, ay - 9], [ax + 5, ay - 9], P.gold, 2);
    tree(g, 26, 22, 0.8);
  } },
  { name: 'Sun Shrine', note: 'Ring of standing stones around a glowing golden altar.', draw(g, t) {
    face(g, (() => { const p = []; for (let k = 0; k < 24; k++) { const a = k * TAU / 24; p.push(ISO(Math.cos(a) * 34, Math.sin(a) * 34)); } return p; })(), '#d8d2c4', null, 2);
    const stones = []; for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + 0.2; stones.push([Math.cos(a) * 28, Math.sin(a) * 28]); }
    const drawStone = ([x, y], i) => { prism(g, x - 4, y - 4, 0, 8, 8, 24 + (i % 3) * 5, '#a7a9b3'); const [a, b] = ISO(x, y + 4, 12); g.fillStyle = 'rgba(255,214,90,' + (0.5 + Math.sin(t * 2 + i) * 0.3).toFixed(2) + ')'; g.fillRect(a - 2, b - 6, 4, 4); };
    const order = stones.map((s, i) => [s, i]).sort((a, b) => (a[0][0] + a[0][1]) - (b[0][0] + b[0][1]));
    order.filter(([s]) => s[0] + s[1] < 0).forEach(([s, i]) => drawStone(s, i));
    prism(g, -9, -9, 0, 18, 18, 10, P.marble); prism(g, -6, -6, 10, 12, 12, 4, P.gold);
    const [a, b] = ISO(0, 0, 14);
    const gr = g.createRadialGradient(a, b - 16, 0, a, b - 16, 40); gr.addColorStop(0, 'rgba(255,230,140,0.75)'); gr.addColorStop(1, 'rgba(255,230,140,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(a, b - 16, 40, 0, TAU); g.fill();
    g.save(); g.translate(a, b - 18 + Math.sin(t * 2) * 2); g.rotate(t * 0.4);
    for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); path(g, [[0, -9], [3, -15], [0, -21], [-3, -15]]); g.fillStyle = '#ffd36b'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); }
    g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fillStyle = '#ffe680'; g.fill(); g.lineWidth = 2.2; g.stroke();
    g.restore();
    order.filter(([s]) => s[0] + s[1] >= 0).forEach(([s, i]) => drawStone(s, i));
  } }
];

// ---------- research buildings: each level of a Forge and a Mage Tower ----------
function glowMouth(g, x, y, z, w, h, t, s = 1) { // furnace opening on the face at y fixed (front-left)
  const f = 0.75 + Math.sin(t * 9) * 0.12 + Math.sin(t * 5.3) * 0.1;
  const [a, b] = ISO(x + w / 2, y, z + h / 2), gr = g.createRadialGradient(a, b, 0, a, b, 34 * s); gr.addColorStop(0, `rgba(255,170,60,${0.55 * f})`); gr.addColorStop(1, 'rgba(255,170,60,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(a, b, 34 * s, 0, TAU); g.fill();
  face(g, [ISO(x, y, z), ISO(x + w, y, z), ISO(x + w, y, z + h * 0.7), ISO(x + w / 2, y, z + h), ISO(x, y, z + h * 0.7)], '#2a1a14', () => { const [c, d] = ISO(x + w / 2, y, z + 2); g.fillStyle = '#ff8a2b'; g.beginPath(); g.ellipse(c, d - 2, w * 0.5, 4 * f, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd36b'; g.beginPath(); g.ellipse(c, d - 2, w * 0.28, 2.2 * f, 0, 0, TAU); g.fill(); }, 2);
}
function anvil(g, x, y) {
  prism(g, x, y, 0, 6, 5, 6, '#7b5029', 'wood');
  const [a, b] = ISO(x + 3, y + 2.5, 6);
  path(g, [[a - 10, b - 1], [a + 7, b - 1], [a + 12, b - 4], [a + 7, b - 6], [a - 8, b - 6]]); g.fillStyle = '#4a505c'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  line(g, [a - 8, b - 6], [a + 6, b - 6], 'rgba(255,255,255,0.35)', 1.4);
}
function sparks(g, x, y, t, n = 5) { for (let k = 0; k < n; k++) { const f = (t * 1.7 + k / n) % 1, a = k * 2.4; g.fillStyle = `rgba(255,${190 - f * 80 | 0},80,${1 - f})`; g.beginPath(); g.arc(x + Math.cos(a) * 14 * f, y - 16 * f + f * f * 18, 1.6, 0, TAU); g.fill(); } }
function hammerArm(g, x, y, t) { const [a, b] = ISO(x, y, 12), sw = Math.abs(Math.sin(t * 5)); g.save(); g.translate(a, b); g.rotate(-0.9 + sw * 0.9); line(g, [0, 0], [0, -14], OL, 4); line(g, [0, 0], [0, -14], '#c99560', 2); g.fillStyle = '#4a505c'; g.fillRect(-4, -18, 8, 5); g.lineWidth = 1.6; g.strokeStyle = OL; g.strokeRect(-4, -18, 8, 5); g.restore(); }
function coalPile(g, x, y) { const [a, b] = ISO(x, y, 0); g.beginPath(); g.moveTo(a - 12, b + 2); g.quadraticCurveTo(a - 4, b - 12, a + 4, b - 9); g.quadraticCurveTo(a + 12, b - 5, a + 12, b + 2); g.closePath(); g.fillStyle = '#2f2f36'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.25)'; for (const [dx, dy] of [[-5, -4], [2, -6], [6, -2]]) g.fillRect(a + dx, b + dy, 2, 1.4); }
function swordRack(g, x, y) {
  prism(g, x, y, 0, 22, 4, 3, '#8a5f3a');
  for (let k = 0; k < 4; k++) { const [a, b] = ISO(x + 3 + k * 5.5, y + 2, 3); line(g, [a, b], [a, b - 20], OL, 3.6); line(g, [a, b], [a, b - 20], '#dfe5ee', 1.8); line(g, [a - 3, b - 4], [a + 3, b - 4], OL, 2.6); line(g, [a - 3, b - 4], [a + 3, b - 4], P.gold, 1.2); }
}
function armorStand(g, x, y) {
  const [a, b] = ISO(x, y, 0);
  line(g, [a, b], [a, b - 26], OL, 4); line(g, [a, b], [a, b - 26], '#8a5f3a', 2);
  path(g, [[a - 8, b - 24], [a + 8, b - 24], [a + 6, b - 10], [a - 6, b - 10]]); g.fillStyle = '#b7c0cc'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(a, b - 29, 5, Math.PI, 0); g.lineTo(a + 5, b - 26); g.lineTo(a - 5, b - 26); g.closePath(); g.fillStyle = '#9aa4b2'; g.fill(); g.stroke();
}
function stack(g, x, y, z, h, t, w = 7, col = C.stone) { prism(g, x, y, z, w, w, h, col, 'stone'); const [a, b] = ISO(x + w / 2, y + w / 2, z + h); g.fillStyle = 'rgba(255,140,40,0.75)'; g.beginPath(); g.ellipse(a, b, w * 0.55, w * 0.28, 0, 0, TAU); g.fill(); smoke(g, a, b - 3, t, 4, 0.8); }
B.forge = [
  { name: 'Forge', note: 'A small stone smithy with a chimney, glowing furnace and an anvil out front.', draw(g, t) {
    coalPile(g, -30, 18);
    prism(g, -24, -24, 0, 34, 28, 18, '#b8b0a2', 'stone');
    gableRoof(g, -24, -24, 34, 28, 18, 12, '#7a5a43');
    stack(g, -6, -22, 18, 20, t);
    glowMouth(g, -18, 4, 0, 12, 13, t);
    anvil(g, 10, 14); hammerArm(g, 16, 18, t); sparks(g, ...ISO(13, 16, 12), t, 4);
    barrel(g, 24, 2);
  } },
  { name: 'Battle Forge', note: 'A bigger forge hall with twin chimneys, an open work shed, and racks of new swords.', draw(g, t) {
    coalPile(g, -34, 22);
    prism(g, -32, -30, 0, 44, 30, 22, '#b8b0a2', 'stone');
    gableRoof(g, -32, -30, 44, 30, 22, 14, C.roofR);
    stack(g, -24, -28, 22, 22, t); stack(g, 2, -28, 22, 26, t);
    glowMouth(g, -24, 0, 0, 14, 15, t, 1.2);
    bigDoorLeft(g, -2, 0, 0, 10, 14);
    // open work shed
    for (const [x, y] of [[16, 4], [36, 4], [16, 28], [36, 28]]) { line(g, ISO(x, y, 0), ISO(x, y, 18), OL, 4); line(g, ISO(x, y, 0), ISO(x, y, 18), '#8a5f3a', 2); }
    face(g, [ISO(14, 30, 18), ISO(38, 30, 18), ISO(38, 2, 22), ISO(14, 2, 22)], '#7a5a43', () => line(g, ISO(14, 29, 18.5), ISO(38, 29, 18.5), 'rgba(255,255,255,0.3)', 2));
    anvil(g, 22, 14); hammerArm(g, 28, 18, t); sparks(g, ...ISO(25, 16, 12), t, 6);
    swordRack(g, -26, 26);
  } },
  { name: 'War Forge', note: 'A fortified foundry: crenellated stone hall, three smokestacks, a molten furnace and armor on display.', draw(g, t) {
    coalPile(g, -36, 26); coalPile(g, -24, 32);
    prism(g, -34, -34, 0, 52, 34, 26, '#a39b8c', 'stone');
    for (let x = -34; x <= 12; x += 9) prism(g, x, -34 + 28, 26, 6, 6, 6, '#a39b8c');
    for (let y = -34; y <= -10; y += 9) prism(g, 12, y, 26, 6, 6, 6, '#a39b8c');
    stack(g, -28, -30, 26, 26, t, 8); stack(g, -12, -30, 26, 32, t, 8); stack(g, 4, -30, 26, 26, t, 8);
    glowMouth(g, -28, 0, 0, 20, 19, t, 1.5);
    bigDoorLeft(g, -2, 0, 0, 12, 16, '#5a3a24');
    { const [a, b] = ISO(-18, 0, 30); hangingBanner(g, a, b, 22, t, '#c8473d'); }
    // molten channel to a cooling trough
    face(g, [ISO(-24, 2, 0.5), ISO(-16, 2, 0.5), ISO(-16, 20, 0.5), ISO(-24, 20, 0.5)], '#ff8a2b', () => line(g, ISO(-20, 2, 0.6), ISO(-20, 20, 0.6), '#ffd36b', 2), 1.8);
    prism(g, -28, 20, 0, 16, 10, 5, C.stone);
    anvil(g, 24, 8); hammerArm(g, 30, 12, t); sparks(g, ...ISO(27, 10, 12), t, 8);
    armorStand(g, 30, 30); armorStand(g, 18, 34);
    bannerPole(g, 34, -34, t, '#c8473d', 40);
  } }
];
B.magetower = [
  { name: 'Mage Tower', note: 'The Arcane Spire: a slender purple-roofed tower with a crystal at the peak.', draw: (g, t) => B.mage[0].draw(g, t) },
  { name: 'Mage Sanctum', note: 'The spire grows a domed study hall, a glowing rune circle and two orbiting crystals.', draw(g, t) {
    const [gx, gy] = ISO(0, 0, 0);
    g.save(); g.translate(gx, gy); g.scale(1, 0.5); g.rotate(t * 0.4); g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.lineWidth = 3; g.strokeStyle = 'rgba(170,130,255,0.85)'; g.stroke(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; g.beginPath(); g.arc(Math.cos(a) * 22, Math.sin(a) * 22, 3, 0, TAU); g.fillStyle = '#c9b6ff'; g.fill(); } g.restore();
    // crystals orbiting behind the spire are drawn first, the ones in front after it
    const orbit = [[58, 0.7, 6, 0.75], [48, -0.9, 38, 0.62], [40, 1.2, 72, 0.68], [52, -0.6, 104, 0.55], [32, 1.6, 130, 0.5]].flatMap(([r, sp, z, sc], i) => [0, Math.PI].map((ph, j) => ({ r, z, sc, a: t * sp + ph + i * 1.3, col: (i + j) % 3 === 0 ? '#c9a2ff' : (i + j) % 3 === 1 ? P.crystal : '#ffb8f0' })));
    const [cx, cy] = ISO(0, 0, 0), crystal = c => crystalFloat(g, cx + Math.cos(c.a) * c.r, cy - c.z + Math.sin(c.a) * c.r * 0.38, t + c.r, c.sc, c.col);
    orbit.filter(c => Math.sin(c.a) < 0).forEach(crystal);
    g.save(); const [ox, oy] = ISO(0, 0, 0); g.translate(ox, oy); g.scale(1.12, 1.12); B.mage[0].draw(g, t); g.restore();
    orbit.filter(c => Math.sin(c.a) >= 0).forEach(crystal);
  } },
  { name: 'Mage Arcanum', note: 'A towering arcanum ringed by orbiting rune bands, with floating isles and a great crystal.', draw(g, t) {
    const [gx, gy] = ISO(0, 0, 0);
    for (const r of [34, 26]) { g.save(); g.translate(gx, gy); g.scale(1, 0.5); g.rotate(t * (r > 30 ? 0.3 : -0.5)); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.lineWidth = 2.6; g.strokeStyle = 'rgba(170,130,255,0.85)'; g.setLineDash([8, 6]); g.stroke(); g.restore(); }
    // a ring of small spires; the ones behind the great tower go first
    const spire = (x, y, h, r = 6) => { cylinder(g, x, y, 0, h, r, '#c9c1dc', 'stone'); windowsOn(g, x, y, h * 0.55, r, [0.1], 6, 1); cylinder(g, x, y, h, h + 2, r + 2, P.purpleD); const [ax, ay] = cone(g, x, y, h + 2, r + 2, h * 0.55 + 6, P.purple, false); crystalFloat(g, ax, ay - 8, t + x, 0.32, '#c9a2ff'); };
    spire(-26, -30, 44); spire(22, -34, 52); spire(-38, -4, 34, 5); spire(36, -10, 38, 5);
    // high isles floating behind the tower
    const isle = (x, y, z, s, ph, col) => { const [a, b] = ISO(x, y, z + Math.sin(t * 1.3 + ph) * 3); path(g, [[a - 12 * s, b], [a - 4 * s, b + 12 * s], [a + 2 * s, b + 16 * s], [a + 12 * s, b]]); g.fillStyle = P.rockD; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(a, b, 12 * s, 5 * s, 0, 0, TAU); g.fillStyle = '#9bd95f'; g.fill(); g.stroke(); crystalFloat(g, a, b - 12 * s, t + ph, 0.45 * s, col); };
    isle(-34, -40, 92, 1.05, 1, P.crystal); isle(40, -36, 112, 0.95, 3, '#ffb8f0'); isle(-46, 10, 134, 0.85, 5, '#c9a2ff');
    // floating isles
    for (const [x, y, ph] of [[-30, 22, 0], [28, 26, 2], [-6, 38, 4]]) { const [a, b] = ISO(x, y, 26 + Math.sin(t * 1.3 + ph) * 3); path(g, [[a - 12, b], [a - 4, b + 12], [a + 2, b + 16], [a + 12, b]]); g.fillStyle = P.rockD; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(a, b, 12, 5, 0, 0, TAU); g.fillStyle = '#9bd95f'; g.fill(); g.stroke(); crystalFloat(g, a, b - 12, t + ph, 0.45, '#c9a2ff'); }
    // tall tower
    cylinder(g, 0, 0, 0, 26, 22, '#c9c1dc', 'stone');
    K.door(g, 0, 0, 22, 20, 8, '#5a3c9e');
    cylinder(g, 0, 0, 26, 30, 25, '#c9c1dc');
    cylBody(g, 0, 0, 30, 104, 16, '#c9c1dc', 'stone'); cylCap(g, 0, 0, 104, 16, '#c9c1dc');
    windowsOn(g, 0, 0, 46, 16, [-0.35, 0.3], 12, 1); windowsOn(g, 0, 0, 72, 16, [0.0], 14, 1);
    cylinder(g, 0, 0, 104, 108, 21, P.purpleD);
    crenelRing(g, 0, 0, 108, 21, P.purple, 10);
    const [ax, ay] = cone(g, 0, 0, 108, 18, 52, P.purple, false);
    // orbiting band around the upper tower
    { const [bx, by] = ISO(0, 0, 80); g.save(); g.translate(bx, by); g.scale(1, 0.38); g.beginPath(); g.arc(0, 0, 34, Math.PI * 0.05, Math.PI * 0.95); g.lineWidth = 4; g.strokeStyle = 'rgba(200,170,255,0.95)'; g.stroke(); g.restore();
      for (let k = 0; k < 3; k++) { const a = t * 1.2 + k * TAU / 3; if (Math.sin(a) > 0) rune(g, bx + Math.cos(a) * 34, by + Math.sin(a) * 13, 5, t, '#e3d6ff'); } }
    crystalFloat(g, ax, ay - 26, t, 1.25);
    isle(40, 30, 74, 0.9, 6, P.crystal); isle(-42, 34, 116, 0.8, 7, '#c9a2ff');
    for (let k = 0; k < 4; k++) { const a = t * 1.1 + k * 1.6; sparkle(g, ax + Math.cos(a) * 30, ay - 16 + Math.sin(a) * 10, t + k, '#e3d6ff'); }
  } }
];

// ---------- economy buildings unlocked by Government research ----------
function stallB(g, x, y, col, t, goods) {
  for (const [dx, dy] of [[0, 0], [18, 0], [0, 12], [18, 12]]) { const [a, b] = ISO(x + dx, y + dy, 0); line(g, [a, b], [a, b - 22], OL, 4); line(g, [a, b], [a, b - 22], '#8a5f3a', 2); }
  prism(g, x - 2, y - 2, 8, 22, 16, 5, '#a86d3c', 'wood');
  goods.forEach((c, k) => { const [a, b] = ISO(x + 4 + k * 5.5, y + 7, 13); g.beginPath(); g.arc(a, b, 2.8, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke(); });
  face(g, [ISO(x - 3, y + 15, 20), ISO(x + 21, y + 15, 20), ISO(x + 21, y + 6, 29), ISO(x - 3, y + 6, 29)], col, () => { for (let xx = x; xx < x + 21; xx += 8) { path(g, [ISO(xx, y + 15, 20), ISO(xx + 4, y + 15, 20), ISO(xx + 4, y + 6, 29), ISO(xx, y + 6, 29)]); g.fillStyle = '#fff'; g.fill(); } });
  face(g, [ISO(x - 3, y + 6, 29), ISO(x + 21, y + 6, 29), ISO(x + 21, y - 3, 20), ISO(x - 3, y - 3, 20)], dark(col));
}
function coinPile(g, x, y, s = 1) { const [a, b] = ISO(x, y, 0); for (let k = 0; k < 6; k++) { const dx = (k % 3 - 1) * 5 * s, dy = -Math.floor(k / 3) * 3 * s - (k % 2); g.beginPath(); g.ellipse(a + dx, b + dy, 4 * s, 2 * s, 0, 0, TAU); g.fillStyle = P.gold; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); } }
function chest(g, x, y) { prism(g, x, y, 0, 12, 8, 7, '#8a5f3a', 'wood'); const [a, b] = ISO(x + 6, y + 8, 4); g.fillStyle = P.gold; g.fillRect(a - 2, b - 2, 4, 4); g.lineWidth = 1.2; g.strokeStyle = OL; g.strokeRect(a - 2, b - 2, 4, 4); }
function sackB(g, x, y, z = 0, col = '#e6d3a3') { const [sx, sy] = ISO(x, y, z); g.beginPath(); g.moveTo(sx - 6, sy); g.quadraticCurveTo(sx - 8, sy - 10, sx - 3, sy - 12); g.lineTo(sx - 1.5, sy - 15); g.lineTo(sx + 1.5, sy - 15); g.lineTo(sx + 3, sy - 12); g.quadraticCurveTo(sx + 8, sy - 10, sx + 6, sy); g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); }
function plankStack(g, x, y, n = 4) { for (let k = 0; k < n; k++) prism(g, x + (k % 2) * 2, y, k * 3, 22, 10, 3, k % 2 ? '#d9a86a' : '#c99560'); }
B.market = [
  { name: 'Marketplace', note: 'A cobbled square with two striped stalls, a well-used crate pile and a hanging coin sign.', draw(g, t) {
    face(g, [ISO(-34, -34), ISO(34, -34), ISO(34, 34), ISO(-34, 34)], '#d8d2c4', () => { for (let v = -24; v < 34; v += 12) { line(g, ISO(v, -34), ISO(v, 34), 'rgba(0,0,0,0.1)', 1.2); line(g, ISO(-34, v), ISO(34, v), 'rgba(0,0,0,0.1)', 1.2); } }, 2);
    stallB(g, -28, -26, '#3f72d9', t, ['#e05a4a', '#ffd36b', '#7fcf63']);
    stallB(g, 8, -24, '#c8473d', t, ['#f08a2b', '#b48cff', '#ffd36b']);
    crate(g, -26, 10, 11); crate(g, -14, 14, 9); barrel(g, 18, 18);
    sackB(g, 4, 22); sackB(g, -2, 26, 0, '#d9c08f');
    { const [a, b] = ISO(28, 6, 0); line(g, [a, b], [a, b - 36], OL, 4.5); line(g, [a, b], [a, b - 36], '#8a5f3a', 2.2); line(g, [a, b - 34], [a - 12, b - 34], OL, 3.5); line(g, [a, b - 34], [a - 12, b - 34], '#8a5f3a', 1.6); const sw = Math.sin(t * 2) * 0.12; g.save(); g.translate(a - 10, b - 33); g.rotate(sw); g.beginPath(); g.arc(0, 9, 7, 0, TAU); g.fillStyle = P.gold; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(0, 9, 3.6, 0, TAU); g.lineWidth = 1.2; g.strokeStyle = P.goldD; g.stroke(); g.restore(); }
  } }
];
B.granary = [
  { name: 'Granary', note: 'A tall thatched grain silo beside a little store shed, with sacks of grain at the door.', draw(g, t) {
    prism(g, 6, -30, 0, 26, 22, 16, '#c9b48e');
    gableRoof(g, 6, -30, 26, 22, 16, 10, P.hay);
    cylinder(g, -12, -6, 0, 40, 18, '#e9dfc8', 'wood');
    for (const z of [12, 26]) { const [a, b] = ISO(-12, -6, z); g.beginPath(); g.ellipse(a, b, 18 * Math.SQRT2, 9 * Math.SQRT2, 0, 0, Math.PI); g.lineWidth = 2.4; g.strokeStyle = '#8a5f3a'; g.stroke(); }
    K.door(g, -12, -6, 18, 16, 7);
    const [ax, ay] = cone(g, -12, -6, 40, 22, 26, P.hay, false);
    line(g, [ax, ay], [ax, ay - 6], OL, 3);
    sackB(g, 4, 14); sackB(g, 12, 18, 0, '#d9c08f'); sackB(g, 8, 24); sackB(g, 20, 12, 0, '#d9c08f');
    { const [a, b] = ISO(-26, 22, 0); g.beginPath(); g.ellipse(a, b, 9, 4.5, 0, 0, TAU); g.fillStyle = P.wheat; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); }
  } }
];
B.storehouse = [
  { name: 'Storehouse', note: 'A long timber warehouse with its doors open on stacked planks, and logs waiting outside.', draw(g, t) {
    prism(g, -32, -30, 0, 54, 28, 20, '#b07a45', 'wood');
    gableRoof(g, -32, -30, 54, 28, 20, 13, '#7a5a43');
    bigDoorLeft(g, -20, -2, 0, 16, 15, '#2a2731');
    { const [a, b] = ISO(-12, -2, 0); for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? '#d9a86a' : '#c99560'; g.fillRect(a - 9, b - 4 - k * 4, 16, 3); } }
    bigDoorLeft(g, 4, -2, 0, 12, 13);
    plankStack(g, -24, 10, 4); plankStack(g, 2, 12, 3);
    logPile(g, 6, 22, 3, 24);
  } }
];
B.bank = [
  { name: 'Bank', note: 'A marble counting house with columns, a pediment, a gold coin crest and a chest out front.', draw(g, t) {
    prism(g, -30, -30, 0, 52, 36, 4, '#d8d2c4');
    prism(g, -26, -28, 4, 42, 22, 22, P.marble, 'stone');
    bigDoorLeft(g, -10, -6, 4, 9, 14, '#6d4426');
    for (const x of [-22, -12, -2, 8]) column(g, x, 2, 22);
    prism(g, -28, -28, 26, 46, 32, 4, '#c9c1b0');
    gableRoof(g, -28, -28, 46, 32, 30, 11, '#ece6da');
    { const [a, b] = ISO(18, -12, 34); g.beginPath(); g.arc(a, b, 4.6, 0, TAU); g.fillStyle = P.gold; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(a, b, 2.2, 0, TAU); g.lineWidth = 1.2; g.strokeStyle = P.goldD; g.stroke(); }
    chest(g, 14, 14); coinPile(g, 26, 22); coinPile(g, -22, 20, 0.8);
    for (let k = 0; k < 2; k++) { const [a, b] = ISO(20, 16, 14); const f = (t * 0.8 + k * 0.5) % 1; g.save(); g.globalAlpha = 1 - f; g.beginPath(); g.ellipse(a, b - f * 16, 3, 1.6, 0, 0, TAU); g.fillStyle = P.gold; g.fill(); g.restore(); }
  } }
];

const ROSTER = [
  { key: 'farm', name: 'Farm', role: 'Economy · food', blurb: 'Adds food to its province every payout.' },
  { key: 'lumber', name: 'Lumber Mill', role: 'Economy · wood', blurb: 'Adds wood to its province every payout.' },
  { key: 'goldmine', name: 'Gold Mine', role: 'Economy · gold', blurb: 'Adds gold to its province every payout.' },
  { key: 'barracks', name: 'Barracks', role: 'Military · infantry', blurb: 'Trains Swordsmen and Pikemen.' },
  { key: 'stable', name: 'Stable', role: 'Military · cavalry', blurb: 'Trains Mace Cavalry.' },
  { key: 'mage', name: 'Mage Tower', role: 'Magic · mages', blurb: 'Trains Mages and studies spells.' },
  { key: 'temple', name: 'Temple', role: 'Faith · morale', blurb: 'Blesses the realm; a home for faith and healing.' },
  { key: 'forge', name: 'Forge', role: 'Military research', blurb: 'Unlocks and drives Military technology.' },
  { key: 'magetower', name: 'Mage Tower', role: 'Magic research', blurb: 'Unlocks and drives Magic technology.' },
  { key: 'market', name: 'Marketplace', role: 'Economy · gold', blurb: 'A small, steady gold income anywhere.' },
  { key: 'granary', name: 'Granary', role: 'Storage · food', blurb: 'Raises how much food the nation can hold.' },
  { key: 'storehouse', name: 'Storehouse', role: 'Storage · wood', blurb: 'Raises how much wood the nation can hold.' },
  { key: 'bank', name: 'Bank', role: 'Storage · gold', blurb: 'Raises how much gold the nation can hold.' }
].map(r => ({ ...r, variants: B[r.key].map((v, i) => ({ ...v, id: 'ABC'[i] })) }));

// render one building on its plot
const VB = [170, 210, 152];
function renderBuilding(cv, key, idx, t) {
  const g = cv.getContext('2d'), [W, H, OY] = VB, k = Math.min(cv.width / W, cv.height / H);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(k, 0, 0, k, cv.width / 2, (cv.height - H * k) / 2 + OY * k);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // the plot: a raised grass tile the size of one build plot
  const h = 42, th = 7;
  path(g, [ISO(h, -h), ISO(h, h), [ISO(h, h)[0], ISO(h, h)[1] + th], [ISO(h, -h)[0], ISO(h, -h)[1] + th]]); g.fillStyle = '#5b8f37'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  path(g, [ISO(-h, h), ISO(h, h), [ISO(h, h)[0], ISO(h, h)[1] + th], [ISO(-h, h)[0], ISO(-h, h)[1] + th]]); g.fillStyle = '#6ea544'; g.fill(); g.stroke();
  face(g, [ISO(-h, -h), ISO(h, -h), ISO(h, h), ISO(-h, h)], '#9bd95f', () => { g.strokeStyle = '#5c9c38'; g.lineWidth = 1.4; for (const [x, y] of [[-36, 30], [30, -36], [36, 36], [-30, -30], [6, 38], [38, 4]]) { const [a, b] = ISO(x, y); g.beginPath(); g.moveTo(a, b); g.lineTo(a - 2.5, b - 4); g.moveTo(a, b); g.lineTo(a + 2.5, b - 4); g.stroke(); } }, 2.4);
  B[key][idx].draw(g, t);
}
// draw a building straight into another scene, centered at the current origin, on a flat worked-earth pad
function drawOnMap(g, key, idx, t, rise = 1) {
  const h = 40;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  face(g, [ISO(-h, -h), ISO(h, -h), ISO(h, h), ISO(-h, h)], 'rgba(217,183,122,0.55)', null, 2);
  if (rise < 1) { g.beginPath(); g.rect(-200, 30 - 200 * rise, 400, 400); g.clip(); }
  B[key][idx].draw(g, t);
  g.restore();
}
root.RealmBuildings = { ROSTER, renderBuilding, drawOnMap, VB };
})(typeof globalThis !== 'undefined' ? globalThis : this);
