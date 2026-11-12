/* Realmlings — Woodling buildings and settlements (v91, Woodlings phase 2a; province buildings v92, phase 2b).
   Tall stave churches of dark tarred wood (after the Borgund Stave Church), with stacked shingled roofs, dragon-head
   gable ends and an arcaded gallery around the base; branches, moss and leafy canopies grow out of them.
   The capital is a stave church grown out of a Great Oak. Townsfolk live in hollow trees with doors.
   Drawn with the same isometric kit as the Realmling buildings. */
(function (root) {
'use strict';
const K = root.RealmBuild.KIT;
const { ISO, OL, path, face, line, prism, cylinder, cylBody, mix, smoke } = K;
const TAU = Math.PI * 2;
const TAR = '#80583a', TARD = '#4e3322', SHING = '#3d302a', BARK = '#7a5538', BARKD = '#5a3d27';
const LEAF = '#4f9a45', LEAFL = '#7cc35a', LEAFD = '#2f6b34', MOSS = '#6f9e3a', MOSSL = '#93c05a', GOLD = '#e0c870', GLOW = '#ffd98a', STONE = '#a9a79c';
const lite = h => mix(h, 1.22), dark = h => mix(h, 0.78);

// a little seeded random, so every settlement looks the same each time it is drawn
function rnd(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- leaves, moss, roots ----------
// a clump of round leaf blobs (screen coordinates), outlined as one shape, lit from the upper left
function blobs(g, list, col = LEAF, hi = LEAFL) {
  g.lineWidth = 5; g.strokeStyle = OL;
  for (const [x, y, r] of list) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
  g.fillStyle = col; for (const [x, y, r] of list) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  g.fillStyle = dark(col); for (const [x, y, r] of list) { g.beginPath(); g.arc(x + r * 0.18, y + r * 0.22, r * 0.78, 0.15 * Math.PI, 0.95 * Math.PI); g.fill(); }
  g.fillStyle = hi; for (const [x, y, r] of list) { g.beginPath(); g.arc(x - r * 0.3, y - r * 0.32, r * 0.42, 0, TAU); g.fill(); }
}
// a leafy clump of about size s around (x, y) on screen
function clump(g, x, y, s, seed, col, hi, t = 0) {
  const r = rnd(seed), sw = Math.sin(t * 1.3 + seed) * s * 0.03, list = [[x + sw, y, s * 0.62]];
  const n = 5 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) { const a = k / n * TAU + r() * 0.5, d = s * (0.55 + r() * 0.3); list.push([x + Math.cos(a) * d + sw, y + Math.sin(a) * d * 0.62, s * (0.36 + r() * 0.18)]); }
  blobs(g, list, col || LEAF, hi || LEAFL);
}
// moss draped over an edge (screen coordinates a → b)
function mossLine(g, a, b, n, seed) {
  const r = rnd(seed);
  for (let k = 0; k < n; k++) {
    const f = (k + 0.5) / n + (r() - 0.5) * 0.08, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, rr = 2.6 + r() * 3.2;
    g.beginPath(); g.ellipse(x, y, rr * 1.3, rr, 0, 0, TAU); g.fillStyle = r() < 0.5 ? MOSS : MOSSL; g.fill(); g.lineWidth = 1.2; g.strokeStyle = 'rgba(29,26,34,0.6)'; g.stroke();
    if (r() < 0.35) { g.beginPath(); g.moveTo(x, y + rr * 0.6); g.lineTo(x + (r() - 0.5) * 2, y + rr + 4 + r() * 5); g.lineWidth = 1.6; g.strokeStyle = MOSS; g.stroke(); }
  }
}
// a thick root curling over the ground from the trunk (screen coordinates)
function root_(g, x0, y0, x1, y1, w) {
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 6;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.lineWidth = w + 5; g.strokeStyle = OL; g.stroke();
  g.lineWidth = w; g.strokeStyle = BARK; g.stroke();
  g.lineWidth = Math.max(1.2, w * 0.25); g.strokeStyle = 'rgba(255,240,210,0.25)'; g.beginPath(); g.moveTo(x0, y0 - w * 0.2); g.quadraticCurveTo(mx, my - w * 0.2, x1, y1 - w * 0.2); g.stroke();
}
// a branch reaching out from (x0, y0) to (x1, y1), tapering
function branch(g, x0, y0, x1, y1, w, bend = 0) {
  const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2 - Math.abs(bend) * 0.4;
  for (const [lw, col] of [[w + 5, OL], [w, BARK]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.lineWidth = lw; g.strokeStyle = col; g.lineCap = 'round'; g.stroke(); }
  g.beginPath(); g.moveTo(x0 + (x1 - x0) * 0.5 + bend * 0.5, y0 + (y1 - y0) * 0.5); g.quadraticCurveTo(x1 - (x1 - x0) * 0.2, y1 - 8, x1 + (x1 - x0) * 0.15, y1 - 12);
  for (const [lw, col] of [[w * 0.55 + 4, OL], [w * 0.55, BARK]]) { g.lineWidth = lw; g.strokeStyle = col; g.stroke(); }
}

// ---------- stave-church parts (world coordinates, ISO kit) ----------
// a frustum roof: a square of half-width hOut at z rising to half-width hIn at z + h (hIn 0 = a spire)
function roof(g, cx, cy, z, hOut, hIn, h, col = SHING) {
  const P = (sx, sy, k, zz) => ISO(cx + sx * k, cy + sy * k, zz);
  const faces = [
    [[-1, -1], [1, -1], dark(dark(col))], [[-1, 1], [-1, -1], dark(col)],   // back faces (seen through the slope from above)
    [[-1, 1], [1, 1], col], [[1, 1], [1, -1], dark(col)]
  ];
  for (const [[ax, ay], [bx, by], c] of faces) {
    const pts = [P(ax, ay, hOut, z), P(bx, by, hOut, z), P(bx, by, hIn, z + h), P(ax, ay, hIn, z + h)];
    face(g, pts, c, () => {
      // rows of scalloped shingles
      g.strokeStyle = 'rgba(255,225,190,0.16)'; g.lineWidth = 1.1;
      const rows = Math.max(2, Math.round(h / 5));
      for (let i = 0; i < rows; i++) {
        const f = (i + 0.5) / rows, k = hOut + (hIn - hOut) * f, a = P(ax, ay, k, z + h * f), b = P(bx, by, k, z + h * f), L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 5.5));
        for (let j = 0; j < n; j++) { const u = (j + (i % 2) * 0.5) / n; if (u > 1) continue; const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u; g.beginPath(); g.arc(x, y, 2.6, 0.1, Math.PI - 0.1); g.stroke(); }
      }
    }, 2.4);
  }
  return ISO(cx, cy, z + h);
}
// staved walls: a square box of half-width hw from z to z + h
function walls(g, cx, cy, z, hw, h, col = TAR) { prism(g, cx - hw, cy - hw, z, hw * 2, hw * 2, h, col, 'wood'); }
// draw on a wall face: 'L' is the face toward the lower left (y = cy + hw), 'R' toward the lower right (x = cx + hw); u runs along it from -1 to 1
function onFace(g, side, cx, cy, hw, u, z, fn) {
  g.save();
  if (side === 'L') { const [sx, sy] = ISO(cx + u * hw, cy + hw, z); g.transform(1, 0.5, 0, 1, sx, sy); }
  else { const [sx, sy] = ISO(cx + hw, cy - u * hw, z); g.transform(1, -0.5, 0, 1, sx, sy); }
  fn(); g.restore();
}
function arch(g, w, h, col, glow) {
  g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h + w); g.arc(0, -h + w, w, Math.PI, 0); g.lineTo(w, 0); g.closePath();
  g.fillStyle = col; g.fill();
  if (glow) { g.save(); g.clip(); g.fillStyle = 'rgba(255,230,150,0.55)'; g.fillRect(-w, -h, w * 0.8, h); g.restore(); }
  g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
}
// a carved doorway with a pointed arch and a carved frame
function doorway(g, w, h, col = '#3a2418') {
  g.beginPath(); g.moveTo(-w - 3, 0); g.lineTo(-w - 3, -h * 0.55); g.quadraticCurveTo(-w - 3, -h - 4, 0, -h - 7); g.quadraticCurveTo(w + 3, -h - 4, w + 3, -h * 0.55); g.lineTo(w + 3, 0); g.closePath();
  g.fillStyle = '#a8794a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h * 0.55); g.quadraticCurveTo(-w, -h, 0, -h - 3); g.quadraticCurveTo(w, -h, w, -h * 0.55); g.lineTo(w, 0); g.closePath();
  g.fillStyle = col; g.fill(); g.save(); g.clip(); for (let x = -w + 3; x < w; x += 3.5) line(g, [x, 0], [x, -h - 3], 'rgba(0,0,0,0.3)', 1); g.restore(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.fillStyle = GOLD; g.beginPath(); g.arc(w * 0.45, -h * 0.4, 1.4, 0, TAU); g.fill();
}
// a dragon head on a gable end, curling out and up from (x, y) on screen; dir -1 left, 1 right
function dragon(g, x, y, dir, s = 1) {
  const pts = [[x, y], [x + dir * 6 * s, y - 2 * s], [x + dir * 10 * s, y - 9 * s]];
  for (const [lw, col] of [[5.4 * s, OL], [2.8 * s, TARD]]) { g.beginPath(); g.moveTo(...pts[0]); g.quadraticCurveTo(...pts[1], ...pts[2]); g.lineWidth = lw; g.strokeStyle = col; g.lineCap = 'round'; g.stroke(); }
  path(g, [[x + dir * 9 * s, y - 11 * s], [x + dir * 16 * s, y - 10 * s], [x + dir * 10 * s, y - 6.5 * s]]); g.fillStyle = TARD; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke();
  g.fillStyle = GOLD; g.beginPath(); g.arc(x + dir * 11 * s, y - 9.6 * s, 0.9 * s, 0, TAU); g.fill();
}
// dragon heads on the four outer corners of a roof
function dragons(g, cx, cy, z, hw, s) {
  const c = [ISO(cx - hw, cy + hw, z), ISO(cx + hw, cy - hw, z), ISO(cx + hw, cy + hw, z)];
  dragon(g, c[0][0], c[0][1], -1, s); dragon(g, c[1][0], c[1][1], 1, s);
}
// the arcaded gallery (svalgang) round the base: low walls pierced with little round-headed arches
function gallery(g, cx, cy, hw, h, n, col = TAR) {
  walls(g, cx, cy, 0, hw, h, col);
  for (const side of ['L', 'R']) for (let k = 0; k < n; k++) {
    const u = -1 + (k + 0.5) * 2 / n; if (Math.abs(u) < 0.25 && side === 'L') continue;
    onFace(g, side, cx, cy, hw, u, 2, () => arch(g, 2.6, h - 5, '#2a1d16', false));
  }
}
// a small gable over a doorway, standing out from a face
function gableOn(g, side, cx, cy, hw, z, w, h, col = SHING) {
  onFace(g, side, cx, cy, hw, 0, z, () => {
    path(g, [[-w, 0], [0, -h], [w, 0]]); g.fillStyle = side === 'L' ? col : dark(col); g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
    path(g, [[-w + 4, -1], [0, -h + 5], [w - 4, -1]]); g.fillStyle = TAR; g.fill(); g.lineWidth = 1.4; g.stroke();
    g.save(); g.translate(0, -2); arch(g, 2.4, 9, GLOW, true); g.restore();
  });
  const [ax, ay] = ISO(side === 'L' ? cx : cx + hw, side === 'L' ? cy + hw : cy, z);
  dragon(g, ax + (side === 'L' ? -2 : 2), ay - h * 0.9, side === 'L' ? -1 : 1, 0.7);
}
// moss patches on the front faces of a roof
function mossRoof(g, cx, cy, z, hOut, hIn, h, seed, n = 3) {
  const r = rnd(seed);
  for (let k = 0; k < n; k++) {
    const f = 0.15 + r() * 0.55, k2 = hOut + (hIn - hOut) * f, left = r() < 0.5, u = (r() - 0.5) * 1.4;
    const p = left ? ISO(cx + u * k2, cy + k2, z + h * f) : ISO(cx + k2, cy - u * k2, z + h * f), s = 3 + r() * 3;
    for (const [dx, dy, q] of [[0, 0, 1], [s * 1.2, 1, 0.7], [-s * 1.1, 1.5, 0.6]]) { g.beginPath(); g.ellipse(p[0] + dx, p[1] + dy, s * 1.4 * q, s * 0.75 * q, left ? 0.35 : -0.35, 0, TAU); g.fillStyle = q < 1 ? MOSSL : MOSS; g.fill(); g.lineWidth = 1.3; g.strokeStyle = 'rgba(29,26,34,0.7)'; g.stroke(); }
  }
}
// a stave church: tiers of staved walls and shingled skirt roofs, a spire on top. Returns the spire tip on screen.
// tiers: [{ hw, h, out }] from the bottom up; out = how far that tier's skirt roof reaches past the wall
function staveChurch(g, cx, cy, tiers, spire, opts = {}) {
  let z = opts.z0 || 0;
  const pts = [];
  tiers.forEach((T, i) => {
    walls(g, cx, cy, z, T.hw, T.h, opts.wall || TAR);
    if (i === 0 && opts.door !== false) onFace(g, 'L', cx, cy, T.hw, 0, z, () => doorway(g, 5.5, 18));
    if (i > 0) for (const side of ['L', 'R']) for (const u of T.hw > 16 ? [-0.5, 0.5] : [0]) onFace(g, side, cx, cy, T.hw, u, z + T.h * 0.25, () => arch(g, 2, Math.min(10, T.h * 0.55), GLOW, true));
    z += T.h;
    const next = tiers[i + 1], hIn = next ? next.hw : spire.hw, rh = next ? T.out * 1.8 + 6 : (T.hw - spire.hw + T.out) * 1.1;
    roof(g, cx, cy, z - (next ? 2 : 0), T.hw + T.out, hIn, rh, opts.roof || SHING);
    if (opts.moss) mossRoof(g, cx, cy, z - 2, T.hw + T.out, hIn, rh, (opts.seed || 1) * 31 + i, opts.moss);
    if (opts.dragons !== false) dragons(g, cx, cy, z - (next ? 2 : 0), T.hw + T.out, i === 0 ? 1.3 : 1);
    pts.push(ISO(cx, cy, z));
    z += rh - (next ? 2 : 0);
  });
  // the spire: a slim staved drum and a tall pointed roof, a gilded finial
  walls(g, cx, cy, z, spire.hw, spire.drum || 8, opts.wall || TAR);
  z += spire.drum || 8;
  const tip = roof(g, cx, cy, z, spire.hw + 2, 0, spire.h, opts.roof || SHING);
  if (opts.moss) mossRoof(g, cx, cy, z, spire.hw + 2, 0, spire.h, (opts.seed || 1) * 7, 1);
  line(g, tip, [tip[0], tip[1] - 10], OL, 4); line(g, tip, [tip[0], tip[1] - 10], GOLD, 2);
  g.beginPath(); g.arc(tip[0], tip[1] - 12, 2.6, 0, TAU); g.fillStyle = GOLD; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke();
  return { tip, levels: pts, top: z };
}

// ---------- small things about the settlements ----------
function lanternPost(g, x, y, t) {
  const [sx, sy] = ISO(x, y, 0);
  line(g, [sx, sy], [sx, sy - 30], OL, 4.5); line(g, [sx, sy], [sx, sy - 30], BARKD, 2.4);
  g.beginPath(); g.moveTo(sx, sy - 30); g.quadraticCurveTo(sx + 8, sy - 34, sx + 9, sy - 28); g.lineWidth = 3.6; g.strokeStyle = OL; g.stroke(); g.lineWidth = 1.8; g.strokeStyle = BARKD; g.stroke();
  const gl = g.createRadialGradient(sx + 9, sy - 23, 0, sx + 9, sy - 23, 16); gl.addColorStop(0, `rgba(255,220,140,${(0.55 + Math.sin(t * 3 + x) * 0.1).toFixed(2)})`); gl.addColorStop(1, 'rgba(255,220,140,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(sx + 9, sy - 23, 16, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(sx + 9, sy - 23, 3.6, 4.6, 0, 0, TAU); g.fillStyle = GLOW; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
}
function standingStone(g, x, y, h = 22, rune = true) {
  const [sx, sy] = ISO(x, y, 0);
  path(g, [[sx - 6, sy], [sx - 7, sy - h * 0.7], [sx - 3, sy - h], [sx + 4, sy - h + 2], [sx + 7, sy - h * 0.6], [sx + 6, sy]]); g.fillStyle = STONE; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
  path(g, [[sx + 1, sy], [sx + 1, sy - h + 2], [sx + 4, sy - h + 2], [sx + 7, sy - h * 0.6], [sx + 6, sy]]); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fill();
  if (rune) { g.strokeStyle = '#7ad9c8'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(sx - 2, sy - h * 0.7); g.lineTo(sx - 2, sy - h * 0.3); g.moveTo(sx - 2, sy - h * 0.6); g.lineTo(sx + 1, sy - h * 0.5); g.stroke(); }
  mossLine(g, [sx - 6, sy - h * 0.75], [sx - 1, sy - h], 2, x * 7 + y);
}
function fern(g, x, y, s = 1) {
  const [sx, sy] = ISO(x, y, 0);
  for (const a of [-1.2, -0.6, 0, 0.6, 1.2]) {
    const ex = sx + Math.sin(a) * 12 * s, ey = sy - Math.cos(a) * 10 * s;
    g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + Math.sin(a) * 4 * s, ey - 4 * s, ex, ey); g.lineWidth = 4.4 * s; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.4 * s; g.strokeStyle = '#5fae4a'; g.stroke();
  }
}
function mushroomRing(g, x, y, s = 1) {
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * TAU, [sx, sy] = ISO(x + Math.cos(a) * 9 * s, y + Math.sin(a) * 9 * s, 0);
    g.beginPath(); g.rect(sx - 1.2, sy - 5, 2.4, 5); g.fillStyle = '#f2ead8'; g.fill(); g.lineWidth = 1; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.ellipse(sx, sy - 5, 3.6, 2.6, 0, Math.PI, 0); g.closePath(); g.fillStyle = k % 2 ? '#c9a3e8' : '#f2ead8'; g.fill(); g.stroke();
  }
}
function banner(g, x, y, t, col = '#4f8a3f', h = 44) {
  const [sx, sy] = ISO(x, y, 0);
  line(g, [sx, sy], [sx, sy - h], OL, 4.5); line(g, [sx, sy], [sx, sy - h], BARKD, 2.2);
  line(g, [sx - 8, sy - h + 2], [sx + 8, sy - h + 2], OL, 3.6); line(g, [sx - 8, sy - h + 2], [sx + 8, sy - h + 2], GOLD, 1.8);
  const sw = Math.sin(t * 2 + x) * 1.4, top = sy - h + 3;
  path(g, [[sx - 6, top], [sx + 6, top], [sx + 6 + sw, top + 24], [sx + sw, top + 18], [sx - 6 + sw, top + 24]]); g.fillStyle = col; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.moveTo(sx + sw * 0.5, top + 5); g.quadraticCurveTo(sx + 4 + sw * 0.5, top + 10, sx + sw * 0.5, top + 15); g.quadraticCurveTo(sx - 4 + sw * 0.5, top + 10, sx + sw * 0.5, top + 5); g.fillStyle = GOLD; g.fill(); g.lineWidth = 1; g.stroke();
}
function forestFloor(g, rad, seed, paved) {
  const pts = []; for (let k = 0; k < 28; k++) { const a = k * TAU / 28, r = rad + Math.sin(k * 2.3 + seed) * rad * 0.05; pts.push(ISO(Math.cos(a) * r, Math.sin(a) * r, 0)); }
  face(g, pts, '#a9b871', () => {
    const r = rnd(seed);
    for (let k = 0; k < rad / 4; k++) { const a = r() * TAU, d = r() * rad, [lx, ly] = ISO(Math.cos(a) * d, Math.sin(a) * d, 0); g.fillStyle = ['#b5612e', '#d9a03a', '#8a9a3a', '#7d9a52'][k % 4]; g.beginPath(); g.ellipse(lx, ly, 2.6, 1.3, a, 0, TAU); g.fill(); }
    for (let k = 0; k < 5; k++) { const a = r() * TAU, d = r() * rad * 0.8, [lx, ly] = ISO(Math.cos(a) * d, Math.sin(a) * d, 0); g.fillStyle = 'rgba(95,140,60,0.35)'; g.beginPath(); g.ellipse(lx, ly, 18 + r() * 14, 8 + r() * 6, 0, 0, TAU); g.fill(); }
    if (paved) { // a winding path of flat stones to the door
      for (let k = 0; k < 9; k++) { const f = k / 8, [lx, ly] = ISO(Math.sin(f * 3) * 8, rad * 0.25 + f * rad * 0.7, 0); g.fillStyle = '#c9c4b2'; g.beginPath(); g.ellipse(lx, ly, 7, 3.6, 0.2, 0, TAU); g.fill(); g.lineWidth = 1.2; g.strokeStyle = 'rgba(29,26,34,0.5)'; g.stroke(); }
    }
  }, 2.2);
}

// ---------- the Great Oak: trunk, roots, branches, canopy ----------
function oakTrunk(g, cx, cy, z0, z1, r) {
  const b = cylBody(g, cx, cy, z0, z1, r, BARK, null);
  // gnarled bark: wavy vertical furrows
  g.save(); g.beginPath(); g.moveTo(b.sx - b.rx, b.st); g.lineTo(b.sx - b.rx, b.sb); g.ellipse(b.sx, b.sb, b.rx, b.ry, 0, Math.PI, 0, true); g.lineTo(b.sx + b.rx, b.st); g.closePath(); g.clip();
  g.strokeStyle = 'rgba(40,25,15,0.45)'; g.lineWidth = 1.6;
  for (let u = -0.9; u < 0.95; u += 0.13) { const x = b.sx + u * b.rx, y0 = b.sb + b.ry * Math.sqrt(1 - u * u); g.beginPath(); g.moveTo(x, y0); for (let k = 1; k <= 6; k++) g.lineTo(x + Math.sin(k * 1.7 + u * 9) * 2.2, y0 + (b.st - y0) * k / 6); g.stroke(); }
  g.restore();
  return b;
}

// ---------- settlements ----------
// outpost: a small moss-covered stave church, a lantern and a standing stone
function outpost(g, t, look) {
  forestFloor(g, 84, 3, false);
  const items = [];
  items.push({ d: -60, f: () => { const [sx, sy] = ISO(-40, -46, 0); clump(g, sx, sy - 42, 20, 11, LEAFD, LEAF); line(g, [sx, sy], [sx, sy - 28], OL, 7); line(g, [sx, sy], [sx, sy - 28], BARK, 4); clump(g, sx, sy - 40, 17, 12, LEAF, LEAFL); } });
  items.push({ d: 0, f: () => {
    gallery(g, 0, 0, 26, 11, 4);
    roof(g, 0, 0, 11, 30, 18, 10);
    mossRoof(g, 0, 0, 11, 30, 18, 10, 5, 3);
    staveChurch(g, 0, 0, [{ hw: 18, h: 26, out: 5 }, { hw: 11, h: 16, out: 4 }], { hw: 6, h: 30, drum: 6 }, { z0: 19, door: false, moss: 2, seed: 4 });
    onFace(g, 'L', 0, 0, 26, 0, 0, () => doorway(g, 5, 15));
    const [mx, my] = ISO(-26, 26, 11); mossLine(g, [mx, my], ISO(26, 26, 11), 7, 9); mossLine(g, ISO(26, 26, 11), ISO(26, -26, 11), 6, 10);
  } });
  items.push({ d: 50, f: () => lanternPost(g, 30, 44, t) });
  items.push({ d: 40, f: () => standingStone(g, -44, 30, 20) });
  items.push({ d: 70, f: () => fern(g, 46, 18, 0.9) });
  items.push({ d: 60, f: () => mushroomRing(g, -18, 56, 0.8) });
  items.sort((a, b) => a.d - b.d).forEach(i => i.f());
}
// fort: a taller stave church with branches and leaves bursting out of its tiers, a ring of standing stones and a bramble hedge
function fort(g, t, look) {
  forestFloor(g, 122, 5, true);
  const items = [];
  // the hedge and stones at the back
  items.push({ d: -300, f: () => { for (let k = 0; k <= 8; k++) { const a = Math.PI * 1.05 + k / 8 * Math.PI * 0.9, [sx, sy] = ISO(Math.cos(a) * 104, Math.sin(a) * 104, 0); clump(g, sx, sy - 10, 13, 40 + k, LEAFD, LEAF, t); } } });
  for (const [x, y] of [[-96, 20], [-70, 70], [96, -20], [70, -70]]) items.push({ d: x + y, f: () => standingStone(g, x, y, 24) });
  items.push({ d: -1, f: () => {
    // branches and a canopy behind the church
    const [tx, ty] = ISO(0, 0, 96);
    clump(g, tx - 40, ty - 34, 30, 3, LEAFD, LEAF, t); clump(g, tx + 44, ty - 30, 28, 4, LEAFD, LEAF, t); clump(g, tx + 2, ty - 70, 34, 5, LEAF, LEAFL, t);
    branch(g, tx - 6, ty + 6, tx - 40, ty - 26, 8, -8); branch(g, tx + 6, ty + 4, tx + 42, ty - 22, 8, 8); branch(g, tx, ty - 10, tx + 2, ty - 58, 7, 4);
  } });
  items.push({ d: 0, f: () => {
    gallery(g, 0, 0, 32, 13, 5);
    roof(g, 0, 0, 13, 37, 23, 11);
    mossRoof(g, 0, 0, 13, 37, 23, 11, 21, 2);
    const ch = staveChurch(g, 0, 0, [{ hw: 23, h: 30, out: 6 }, { hw: 15, h: 22, out: 5 }, { hw: 9, h: 14, out: 4 }], { hw: 5, h: 36, drum: 6 }, { z0: 22, door: false, moss: 1, seed: 8 });
    gableOn(g, 'L', 0, 0, 23, 40, 9, 14); gableOn(g, 'R', 0, 0, 23, 40, 9, 14);
    onFace(g, 'L', 0, 0, 32, 0, 0, () => doorway(g, 6, 17));
    // branches bursting out of the tiers, ending in leaves
    const [a0, b0] = ch.levels[0], [a1, b1] = ch.levels[1];
    branch(g, a0 - 24, b0 + 8, a0 - 58, b0 - 18, 6, -6); clump(g, a0 - 60, b0 - 22, 16, 61, LEAF, LEAFL, t);
    branch(g, a0 + 26, b0 + 6, a0 + 60, b0 - 14, 6, 6); clump(g, a0 + 62, b0 - 18, 16, 62, LEAF, LEAFL, t);
    branch(g, a1 - 16, b1 + 4, a1 - 36, b1 - 24, 5, -4); clump(g, a1 - 38, b1 - 28, 12, 63, LEAFL, '#a6dc78', t);
    branch(g, a1 + 16, b1 + 4, a1 + 36, b1 - 20, 5, 4); clump(g, a1 + 38, b1 - 24, 12, 64, LEAFL, '#a6dc78', t);
    const [mx, my] = ISO(-32, 32, 13); mossLine(g, [mx, my], ISO(32, 32, 13), 8, 19); mossLine(g, ISO(32, 32, 13), ISO(32, -32, 13), 7, 20);
  } });
  items.push({ d: 70, f: () => banner(g, -40, 58, t) });
  items.push({ d: 70, f: () => banner(g, 58, -40, t) });
  items.push({ d: 90, f: () => lanternPost(g, 22, 64, t) });
  items.push({ d: 100, f: () => fern(g, 70, 40, 1) });
  items.push({ d: 60, f: () => fern(g, -74, 6, 0.9) });
  // the front of the hedge
  items.push({ d: 300, f: () => { for (let k = 0; k <= 6; k++) { const a = Math.PI * 0.12 + k / 6 * Math.PI * 0.76, [sx, sy] = ISO(Math.cos(a) * 112, Math.sin(a) * 112, 0); if (Math.abs(a - Math.PI / 2) < 0.22) continue; clump(g, sx, sy - 8, 11, 80 + k, LEAFD, LEAF, t); } } });
  items.sort((a, b) => a.d - b.d).forEach(i => i.f());
}
// capital: a grand stave church grown out of a Great Oak, branches and a vast canopy above, lanterns, shrines and banners
function capital(g, t, look) {
  forestFloor(g, 166, 7, true);
  const items = [];
  const TOP = 220;
  // the canopy behind
  items.push({ d: -400, f: () => {
    const [tx, ty] = ISO(0, 0, TOP);
    for (const [dx, dy, s, sd] of [[-92, 14, 40, 1], [96, 10, 40, 2], [-58, -42, 46, 3], [62, -46, 46, 4], [0, -74, 52, 5], [-120, 52, 30, 6], [124, 50, 30, 7]]) clump(g, tx + dx, ty + dy, s, sd, LEAFD, LEAF, t);
  } });
  // great roots spreading over the ground
  items.push({ d: -200, f: () => {
    const [bx, by] = ISO(0, 0, 0);
    for (const [ex, ey, w] of [[-120, -10, 13], [-80, 40, 11], [110, -6, 13], [86, 36, 11], [-40, -50, 9], [50, -52, 9]]) root_(g, bx + ex * 0.25, by + ey * 0.2 - 4, bx + ex, by + ey, w);
  } });
  items.push({ d: -100, f: () => {
    // the branches spreading from the upper trunk into the canopy
    const [tx, ty] = ISO(0, 0, 150);
    branch(g, tx - 10, ty + 4, tx - 96, ty - 60, 12, -14); branch(g, tx + 10, ty + 4, tx + 98, ty - 64, 12, 14);
    branch(g, tx - 6, ty - 10, tx - 60, ty - 104, 10, -8); branch(g, tx + 6, ty - 10, tx + 64, ty - 108, 10, 8);
  } });
  items.push({ d: 0, f: () => {
    // the trunk is the church's nave: a vast gnarled oak with a carved doorway and glowing windows
    oakTrunk(g, 0, 0, 0, 92, 38);
    onFace(g, 'L', 0, 0, 27, 0, 0, () => doorway(g, 9, 32));
    for (const [u, z] of [[-0.62, 34], [0.62, 34], [-0.3, 62], [0.34, 64]]) { const [sx, sy] = ISO(0, 0, z), x = sx + u * 38 * Math.SQRT2 * 0.9, y = sy + 19 * Math.SQRT2 * Math.sqrt(1 - u * u) * 0.92; g.save(); g.translate(x, y); arch(g, 3.4, 13, GLOW, true); g.restore(); }
    // the stave church rising out of the oak, tier on tier
    roof(g, 0, 0, 90, 46, 30, 16);
    mossRoof(g, 0, 0, 90, 46, 30, 16, 41, 2);
    const ch = staveChurch(g, 0, 0, [{ hw: 30, h: 30, out: 7 }, { hw: 20, h: 24, out: 6 }, { hw: 12, h: 18, out: 5 }], { hw: 7, h: 56, drum: 10 }, { z0: 104, door: false, moss: 1, seed: 12 });
    gableOn(g, 'L', 0, 0, 30, 124, 11, 17); gableOn(g, 'R', 0, 0, 30, 124, 11, 17);
    // more branches bursting from between the tiers, ending in leaves
    const [a0, b0] = ch.levels[0], [a1, b1] = ch.levels[1], [a2, b2] = ch.levels[2];
    branch(g, a0 - 30, b0 + 12, a0 - 84, b0 - 14, 8, -10); clump(g, a0 - 88, b0 - 20, 22, 21, LEAF, LEAFL, t);
    branch(g, a0 + 30, b0 + 12, a0 + 86, b0 - 16, 8, 10); clump(g, a0 + 90, b0 - 22, 22, 22, LEAF, LEAFL, t);
    branch(g, a1 - 20, b1 + 6, a1 - 54, b1 - 30, 6, -6); clump(g, a1 - 56, b1 - 34, 17, 23, LEAFL, '#a6dc78', t);
    branch(g, a1 + 20, b1 + 6, a1 + 56, b1 - 32, 6, 6); clump(g, a1 + 58, b1 - 36, 17, 24, LEAFL, '#a6dc78', t);
    branch(g, a2 - 12, b2 + 4, a2 - 30, b2 - 22, 5, -4); clump(g, a2 - 32, b2 - 26, 12, 25, LEAF, LEAFL, t);
    branch(g, a2 + 12, b2 + 4, a2 + 32, b2 - 24, 5, 4); clump(g, a2 + 34, b2 - 28, 12, 26, LEAF, LEAFL, t);
    // the crown of the canopy round the spire (the spire pokes through)
    const [sx, sy] = ch.tip; clump(g, sx - 30, sy + 34, 18, 27, LEAF, LEAFL, t); clump(g, sx + 30, sy + 32, 18, 28, LEAF, LEAFL, t);
    // fireflies drifting in the canopy
    for (let k = 0; k < 7; k++) { const q = t * 0.7 + k * 1.3, x = sx + Math.sin(q * 1.3 + k) * 90, y = sy + 70 + Math.cos(q + k * 2) * 50, a = 0.45 + Math.sin(t * 4 + k) * 0.35; g.fillStyle = `rgba(230,255,160,${a.toFixed(2)})`; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }
  } });
  // lanterns, banners, shrines and ferns about the grounds
  for (const [x, y] of [[-40, 96], [40, 96]]) items.push({ d: x + y, f: () => lanternPost(g, x, y, t) });
  for (const [x, y] of [[-120, 40], [40, -120]]) items.push({ d: x + y, f: () => banner(g, x, y, t, '#4f8a3f', 56) });
  for (const [x, y] of [[-130, -40], [-100, 100], [100, -100], [130, 40], [60, 130]]) items.push({ d: x + y, f: () => standingStone(g, x, y, 26) });
  for (const [x, y, s] of [[-80, 120, 1.1], [120, 90, 1], [-140, 0, 1], [150, -60, 0.9]]) items.push({ d: x + y, f: () => fern(g, x, y, s) });
  items.push({ d: 150, f: () => mushroomRing(g, 80, 70, 1) });
  items.sort((a, b) => a.d - b.d).forEach(i => i.f());
}
const FOOT = 0.62;
function drawSettlement(g, stage, t, look = {}) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.scale(FOOT, FOOT);
  (stage === 2 ? capital : stage === 1 ? fort : outpost)(g, t, look);
  g.restore();
}

// ---------- the townsfolk's tree houses ----------
const TREEHOUSES = [
  { r: 10, h: 24, leaf: LEAF, hi: LEAFL, s: 22 }, { r: 9, h: 20, leaf: '#6aa84a', hi: '#9fd46a', s: 20 }, { r: 11, h: 26, leaf: '#c99a3a', hi: '#f0c96a', s: 22 },
  { r: 9, h: 22, leaf: '#8a6fb0', hi: '#b9a0dc', s: 20 }, { r: 10, h: 23, leaf: LEAFD, hi: LEAF, s: 23 }, { r: 12, h: 21, leaf: '#5f9a3e', hi: '#93c463', s: 24 }
];
// a hollow tree with a door, a round window and a leafy crown; door is the owner's color (or a plain wood brown)
function treeHouse(g, x, y, v, door, t = 0) {
  const T = TREEHOUSES[v % TREEHOUSES.length];
  const [bx, by] = ISO(x, y, 0);
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(bx, by + 2, T.r * 2.2, T.r * 0.9, 0, 0, TAU); g.fill();
  for (const [ex, ey, w] of [[-T.r * 1.9, 3, 4.5], [T.r * 1.8, 2, 4.5], [-T.r * 0.6, 7, 3.6]]) root_(g, bx + ex * 0.35, by - 2, bx + ex, by + ey, w);
  oakTrunk(g, x, y, 0, T.h, T.r);
  // the door: a little rounded doorway at the foot of the trunk
  const fy = by + T.r * Math.SQRT2 / 2 * 0.95;
  g.save(); g.translate(bx - 1, fy);
  g.beginPath(); g.moveTo(-5, 0); g.lineTo(-5, -7); g.arc(0, -8, 5, Math.PI, 0); g.lineTo(5, 0); g.closePath(); g.fillStyle = door || '#8a5a34'; g.fill();
  g.save(); g.clip(); for (const lx of [-2.4, 0.6, 3.4]) line(g, [lx, 0], [lx, -14], 'rgba(0,0,0,0.25)', 1); g.restore(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.fillStyle = GOLD; g.beginPath(); g.arc(2.6, -5, 1, 0, TAU); g.fill(); g.restore();
  // a round glowing window
  const [wx, wy] = ISO(x, y, T.h * 0.7); g.beginPath(); g.arc(wx + T.r * 0.55, wy + T.r * 0.55, 2.8, 0, TAU); g.fillStyle = GLOW; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
  // the leafy crown
  const [cx2, cy2] = ISO(x, y, T.h);
  branch(g, cx2, cy2 + 4, cx2 - T.s * 0.6, cy2 - T.s * 0.3, 3, -2); branch(g, cx2, cy2 + 4, cx2 + T.s * 0.6, cy2 - T.s * 0.35, 3, 2);
  // v96: a home in the nation's color wears its leaves in that color (like the other races' roofs)
  clump(g, cx2, cy2 - T.s * 0.45, T.s, 100 + v, door || T.leaf, door ? shade(door, 0.35) : T.hi, t);
}
// lighten (amt > 0) or darken (amt < 0) a #rrggbb color
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return '#' + ch.map(c => c.toString(16).padStart(2, '0')).join('');
}


// =====================================================================================================
// ---------- province buildings (v92, Woodlings phase 2b) ----------
// Every building in the Woodling style: dark tarred staves, scalloped shingle roofs with dragon heads, moss and leaves.
// Each is drawn at the current origin on a 80 × 80 plot (world units −40…40), back to front.
// =====================================================================================================
const APPLE = '#d8443a', APPLEL = '#ff8a6a', WHEAT = '#e8c45a', SACK = '#d9c39a', IRON = '#5b6270', COIN = '#f4c44f', COIND = '#c99a2c';
const WATER = '#4fa9c9', WATERL = '#9fdcef', LILAC = '#a98ad6', TEAL = '#5fb3a3', RUST = '#c86a3a', MARBLE = '#ebe6dc', MARBLED = '#bdb6a8';
const sdot = (g, x, y, r, col, lw = 1.3) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = col; g.fill(); g.lineWidth = lw; g.strokeStyle = OL; g.stroke(); };
// draw on the plane of a wall face of any box: L = the face at y fixed (toward the lower left), R = the face at x fixed (toward the lower right)
function onL(g, x, y, z, fn) { g.save(); const [sx, sy] = ISO(x, y, z); g.transform(1, 0.5, 0, 1, sx, sy); fn(); g.restore(); }
function onR(g, x, y, z, fn) { g.save(); const [sx, sy] = ISO(x, y, z); g.transform(1, -0.5, 0, 1, sx, sy); fn(); g.restore(); }
// ivy along a screen line
function ivy(g, a, b, n, seed) {
  const r = rnd(seed);
  for (let k = 0; k < n; k++) {
    const f = k / Math.max(1, n - 1), x = a[0] + (b[0] - a[0]) * f + (r() - 0.5) * 3, y = a[1] + (b[1] - a[1]) * f + (r() - 0.5) * 3;
    g.beginPath(); g.ellipse(x, y, 2.8, 1.8, r() * 3, 0, TAU); g.fillStyle = r() < 0.5 ? LEAF : LEAFL; g.fill(); g.lineWidth = 0.9; g.strokeStyle = 'rgba(29,26,34,0.6)'; g.stroke();
  }
}
// a stave hall: tarred walls (x..x+w, y..y+d, h high) and a steep shingled gable roof with its ridge along x;
// dragon heads curl from both ends of the ridge. o: { wall, roof, moss, seed, door: u along the front (0..1), noDragons }
function staveHall(g, x, y, w, d, h, rh, o = {}) {
  const wall = o.wall || TAR, rf = o.roof || SHING, ov = 4, tex = o.tex || 'wood';
  prism(g, x, y, 0, w, d, h, wall, tex);
  // vertical staves on the walls are drawn by the plank texture; add a carved band under the eaves
  line(g, ISO(x, y + d, h - 3), ISO(x + w, y + d, h - 3), 'rgba(224,200,112,0.55)', 1.4);
  // the gable end at x + w
  face(g, [ISO(x + w, y + d, h), ISO(x + w, y, h), ISO(x + w, y + d / 2, h + rh)], dark(wall), () => { for (let k = 1; k < 5; k++) { const yy = y + d * k / 5; line(g, ISO(x + w, yy, h), ISO(x + w, yy, h + rh), 'rgba(0,0,0,0.25)', 1.1); } }, 2.4);
  if (o.gableWin) onR(g, x + w, y + d / 2, h + 2, () => arch(g, 2.4, 9, GLOW, true));
  // the near slope, with rows of scalloped shingles
  const p0 = ISO(x - ov, y + d + ov, h - 3), p1 = ISO(x + w + ov, y + d + ov, h - 3), p2 = ISO(x + w + ov, y + d / 2, h + rh), p3 = ISO(x - ov, y + d / 2, h + rh);
  face(g, [p0, p1, p2, p3], rf, () => {
    g.strokeStyle = 'rgba(255,225,190,0.16)'; g.lineWidth = 1.1;
    const rows = Math.max(3, Math.round(rh / 4));
    for (let i = 0; i < rows; i++) {
      const f = (i + 0.5) / rows, a = [p0[0] + (p3[0] - p0[0]) * f, p0[1] + (p3[1] - p0[1]) * f], b = [p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(L / 5.5));
      for (let j = 0; j < n; j++) { const u = (j + (i % 2) * 0.5) / n; if (u > 1) continue; g.beginPath(); g.arc(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 2.6, 0.1, Math.PI - 0.1); g.stroke(); }
    }
    line(g, [p0[0], p0[1] - 1], [p1[0], p1[1] - 1], 'rgba(255,255,255,0.22)', 2.4);
  }, 2.4);
  // the end of the far slope peeks out past the gable
  face(g, [ISO(x + w + ov, y + d / 2, h + rh), ISO(x + w + ov, y - ov, h - 3), ISO(x + w + ov - 1.5, y - ov, h - 4.5)], dark(dark(rf)), null, 1.6);
  line(g, p3, p2, OL, 4); line(g, p3, p2, dark(rf), 2);
  if (o.moss) {
    const r = rnd(o.seed || 3);
    for (let k = 0; k < o.moss; k++) { const fu = 0.1 + r() * 0.8, fv = 0.15 + r() * 0.6, a = [p0[0] + (p1[0] - p0[0]) * fu, p0[1] + (p1[1] - p0[1]) * fu], b = [p3[0] + (p2[0] - p3[0]) * fu, p3[1] + (p2[1] - p3[1]) * fu], px = a[0] + (b[0] - a[0]) * fv, py = a[1] + (b[1] - a[1]) * fv, s = 3 + r() * 3;
      for (const [dx, dy, q] of [[0, 0, 1], [s * 1.2, 0.6, 0.7], [-s * 1.1, 1, 0.6]]) { g.beginPath(); g.ellipse(px + dx, py + dy, s * 1.4 * q, s * 0.7 * q, 0.42, 0, TAU); g.fillStyle = q < 1 ? MOSSL : MOSS; g.fill(); g.lineWidth = 1.2; g.strokeStyle = 'rgba(29,26,34,0.7)'; g.stroke(); } }
  }
  if (!o.noDragons) { dragon(g, p3[0] - 1, p3[1] + 1, -1, o.dragonS || 0.9); dragon(g, p2[0] + 1, p2[1] + 1, 1, o.dragonS || 0.9); }
  if (o.door != null) onL(g, x + w * o.door, y + d, 0, () => doorway(g, o.doorW || 4.5, o.doorH || Math.min(15, h - 3)));
  for (const u of o.wins || []) onL(g, x + w * u, y + d, h * 0.38, () => arch(g, 2.2, 8, GLOW, true));
  return { ridge: [p3, p2] };
}
// a woven wattle fence between two ground points
function wattle(g, a, b, h = 11, posts = 5) {
  for (let i = 0; i <= posts; i++) { const f = i / posts, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f; line(g, ISO(x, y, 0), ISO(x, y, h + 2), OL, 4.4); line(g, ISO(x, y, 0), ISO(x, y, h + 2), BARKD, 2.2); }
  for (const z of [h * 0.35, h * 0.65, h * 0.92]) {
    g.beginPath(); for (let k = 0; k <= posts * 4; k++) { const f = k / (posts * 4), x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, [sx, sy] = ISO(x, y, z + Math.sin(k * Math.PI / 2) * 1.3); k ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }
    g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.2; g.strokeStyle = '#a07a4a'; g.stroke();
  }
}
// an apple tree: a short bent trunk, a round crown hung with apples
function appleTree(g, x, y, s, t, seed) {
  const [sx, sy] = ISO(x, y, 0);
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(sx, sy + 1, 15 * s, 6 * s, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(sx - 3.5 * s, sy); g.quadraticCurveTo(sx - 4 * s, sy - 10 * s, sx - 1 * s, sy - 18 * s); g.lineTo(sx + 3 * s, sy - 18 * s); g.quadraticCurveTo(sx + 1 * s, sy - 9 * s, sx + 3.5 * s, sy); g.closePath(); g.fillStyle = BARK; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  branch(g, sx, sy - 16 * s, sx - 9 * s, sy - 24 * s, 2.2 * s, -2); branch(g, sx + 1, sy - 16 * s, sx + 9 * s, sy - 25 * s, 2.2 * s, 2);
  clump(g, sx, sy - 30 * s, 15 * s, seed, '#4f9a45', '#86c95e', t);
  const r = rnd(seed + 9);
  for (let k = 0; k < 7; k++) { const a = r() * TAU, d = r() * 13 * s; sdot(g, sx + Math.cos(a) * d * 1.1, sy - 28 * s + Math.sin(a) * d * 0.7, 2.1 * s, APPLE, 1); g.fillStyle = APPLEL; g.beginPath(); g.arc(sx + Math.cos(a) * d * 1.1 - 0.6, sy - 28.6 * s + Math.sin(a) * d * 0.7, 0.7 * s, 0, TAU); g.fill(); }
  for (let k = 0; k < 2; k++) sdot(g, sx + (r() - 0.5) * 18 * s, sy + 2 + r() * 3, 1.8 * s, APPLE, 1);
}
// a wicker basket, full of apples (or grain)
function basket(g, x, y, fill = 'apple') {
  const [sx, sy] = ISO(x, y, 0);
  g.beginPath(); g.moveTo(sx - 7, sy - 8); g.lineTo(sx - 5.5, sy); g.quadraticCurveTo(sx, sy + 3, sx + 5.5, sy); g.lineTo(sx + 7, sy - 8); g.closePath(); g.fillStyle = '#c99a5a'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
  g.save(); g.clip(); g.strokeStyle = 'rgba(90,60,30,0.45)'; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(sx - 7, sy - 8 + k * 2.4); g.lineTo(sx + 7, sy - 8 + k * 2.4); g.stroke(); } g.restore();
  if (fill === 'apple') for (const [dx, dy] of [[-3.5, -9], [0, -10.5], [3.5, -9], [-1.5, -8], [2, -8]]) sdot(g, sx + dx, sy + dy, 2.2, APPLE, 1);
  else { g.beginPath(); g.ellipse(sx, sy - 8, 7, 3, 0, Math.PI, 0); g.fillStyle = fill; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); }
}
function sack(g, x, y, z = 0, col = SACK) {
  const [sx, sy] = ISO(x, y, z);
  g.beginPath(); g.moveTo(sx - 6, sy); g.quadraticCurveTo(sx - 8, sy - 10, sx - 3, sy - 12); g.lineTo(sx - 1.5, sy - 15); g.lineTo(sx + 1.5, sy - 15); g.lineTo(sx + 3, sy - 12); g.quadraticCurveTo(sx + 8, sy - 10, sx + 6, sy); g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.moveTo(sx - 1, sy - 6); g.quadraticCurveTo(sx + 1, sy - 9, sx + 3, sy - 6); g.quadraticCurveTo(sx + 1, sy - 3, sx - 1, sy - 6); g.fillStyle = LEAF; g.fill();
}
// a sheaf of wheat standing up
function stook(g, x, y, s = 1) {
  const [sx, sy] = ISO(x, y, 0);
  for (let k = -3; k <= 3; k++) { line(g, [sx + k * 1.6 * s, sy], [sx + k * 0.6 * s, sy - 16 * s], OL, 3); line(g, [sx + k * 1.6 * s, sy], [sx + k * 0.6 * s, sy - 16 * s], '#c9a23e', 1.6); }
  for (let k = -3; k <= 3; k++) { g.beginPath(); g.ellipse(sx + k * 1.4 * s, sy - 19 * s, 1.6 * s, 3.6 * s, k * 0.15, 0, TAU); g.fillStyle = WHEAT; g.fill(); g.lineWidth = 0.9; g.strokeStyle = OL; g.stroke(); }
  line(g, [sx - 5 * s, sy - 9 * s], [sx + 5 * s, sy - 9 * s], '#8a6a2a', 2);
}
// logs lying along x (or y)
function logs(g, x, y, n, len, along = 'x') {
  const rows = [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2]].slice(0, n);
  rows.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [i, lvl] of rows) {
    const r = 3.8, o = i * 7.6, z = 3.8 + lvl * 6.4;
    const a = along === 'x' ? ISO(x, y + o, z) : ISO(x + o, y, z), b = along === 'x' ? ISO(x + len, y + o, z) : ISO(x + o, y + len, z);
    line(g, a, b, OL, 2 * r + 4); line(g, a, b, BARK, 2 * r); line(g, [a[0], a[1] - r * 0.5], [b[0], b[1] - r * 0.5], 'rgba(255,240,210,0.25)', 1.6);
    g.beginPath(); g.ellipse(b[0], b[1], r * 0.9, r, 0, 0, TAU); g.fillStyle = '#e2c290'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.ellipse(b[0], b[1], r * 0.4, r * 0.45, 0, 0, TAU); g.strokeStyle = '#a5713f'; g.lineWidth = 1; g.stroke();
  }
}
function planks(g, x, y, n = 4) { for (let k = 0; k < n; k++) prism(g, x + (k % 2) * 2, y, k * 3, 22, 9, 3, k % 2 ? '#d9b07a' : '#c99d68'); }
function lantern(g, sx, sy, t, s = 1) {
  const gl = g.createRadialGradient(sx, sy, 0, sx, sy, 12 * s); gl.addColorStop(0, `rgba(255,220,140,${(0.5 + Math.sin(t * 3 + sx) * 0.1).toFixed(2)})`); gl.addColorStop(1, 'rgba(255,220,140,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(sx, sy, 12 * s, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(sx, sy, 2.8 * s, 3.6 * s, 0, 0, TAU); g.fillStyle = GLOW; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke();
}
function coins(g, x, y, s = 1) { const [a, b] = ISO(x, y, 0); for (let k = 0; k < 6; k++) { const dx = (k % 3 - 1) * 5 * s, dy = -Math.floor(k / 3) * 3 * s - (k % 2); g.beginPath(); g.ellipse(a + dx, b + dy, 4 * s, 2 * s, 0, 0, TAU); g.fillStyle = COIN; g.fill(); g.lineWidth = 1.3; g.strokeStyle = OL; g.stroke(); } }
function chest(g, x, y) {
  prism(g, x, y, 0, 13, 9, 7, '#7a5236', 'wood');
  const [a, b] = ISO(x, y + 9, 7), [c, d] = ISO(x + 13, y + 9, 7); g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2, (b + d) / 2 - 7, c, d); g.lineTo(c + 9, d - 4.5); g.quadraticCurveTo((a + c) / 2 + 9, (b + d) / 2 - 11.5, a + 9, b - 4.5); g.closePath(); g.fillStyle = '#8a6040'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  const [m, n] = ISO(x + 6.5, y + 9, 4); g.fillStyle = COIN; g.fillRect(m - 2, n - 2, 4, 4); g.lineWidth = 1.1; g.strokeRect(m - 2, n - 2, 4, 4);
  for (const k of [0, 1]) sdot(g, m - 3 + k * 5, n - 9 - k, 2, COIN, 1);
}
// a stream running between two ground points, w wide, with drifting ripples
function stream(g, x0, y0, x1, y1, w, t) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L * w / 2, ny = dx / L * w / 2;
  face(g, [ISO(x0 + nx, y0 + ny), ISO(x1 + nx, y1 + ny), ISO(x1 - nx, y1 - ny), ISO(x0 - nx, y0 - ny)], WATER, () => {
    for (let k = 0; k < 6; k++) { const f = ((t * 0.25 + k / 6) % 1), [sx, sy] = ISO(x0 + dx * f, y0 + dy * f); line(g, [sx - 4, sy], [sx + 4, sy - 1], WATERL, 1.6); }
  }, 2.2);
}
// a turning water wheel in the plane x = const (seen from the lower right)
function waterWheel(g, x, y, z, r, t) {
  onR(g, x, y, z, () => {
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.lineWidth = 5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = BARK; g.stroke();
    for (let k = 0; k < 8; k++) { const a = t * 1.4 + k * TAU / 8; line(g, [0, 0], [Math.cos(a) * r, Math.sin(a) * r], OL, 3.4); line(g, [0, 0], [Math.cos(a) * r, Math.sin(a) * r], BARKD, 1.8); g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); g.rotate(a); g.fillStyle = TAR; g.fillRect(-2, -4, 5, 8); g.lineWidth = 1.2; g.strokeStyle = OL; g.strokeRect(-2, -4, 5, 8); g.restore(); }
    sdot(g, 0, 0, 2.6, GOLD, 1.2);
  });
}
// a mossy boulder (screen coords)
function boulder(g, sx, sy, s, seed) {
  const r = rnd(seed), pts = [];
  for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI, d = s * (0.8 + r() * 0.3); pts.push([sx + Math.cos(a) * d * 1.3, sy + Math.sin(a) * d]); }
  path(g, pts); g.fillStyle = STONE; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
  path(g, [[sx + s * 0.2, sy], ...pts.slice(5)]); g.fillStyle = 'rgba(0,0,0,0.14)'; g.fill();
  mossLine(g, pts[2], pts[5], 3, seed + 3);
}
function anvil(g, x, y) {
  const [a, b] = ISO(x, y, 0);
  path(g, [[a - 5, b], [a + 5, b], [a + 3, b - 6], [a - 3, b - 6]]); g.fillStyle = '#6a5a4a'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
  path(g, [[a - 11, b - 6], [a + 8, b - 6], [a + 12, b - 9], [a + 8, b - 12], [a - 8, b - 12]]); g.fillStyle = IRON; g.fill(); g.stroke();
}
function sparks(g, x, y, t, n = 5) { for (let k = 0; k < n; k++) { const f = (t * 1.7 + k / n) % 1, a = k * 2.4; g.fillStyle = `rgba(255,${190 - f * 80 | 0},80,${(1 - f).toFixed(2)})`; g.beginPath(); g.arc(x + Math.cos(a) * 14 * f, y - 16 * f + f * f * 18, 1.6, 0, TAU); g.fill(); } }
function hammerArm(g, x, y, t) { const [a, b] = ISO(x, y, 12), sw = Math.abs(Math.sin(t * 5)); g.save(); g.translate(a, b); g.rotate(-0.9 + sw * 0.9); line(g, [0, 0], [0, -14], OL, 4); line(g, [0, 0], [0, -14], '#c99560', 2); g.fillStyle = '#4a505c'; g.fillRect(-4, -18, 8, 5); g.lineWidth = 1.6; g.strokeStyle = OL; g.strokeRect(-4, -18, 8, 5); g.restore(); }
// a stack of rough stones (a chimney) rising from z0 to z1 at (x, y), with smoke
function chimney(g, x, y, z0, z1, t, w = 7) {
  prism(g, x, y, z0, w, w, z1 - z0, '#9c968a', 'stone');
  const [a, b] = ISO(x + w / 2, y + w / 2, z1); g.fillStyle = 'rgba(255,140,40,0.75)'; g.beginPath(); g.ellipse(a, b, w * 0.55, w * 0.28, 0, 0, TAU); g.fill();
  smoke(g, a, b - 3, t, 4, 0.8);
}
// a glowing furnace mouth with a pointed arch, on the face at y fixed
function furnace(g, x, y, z, w, h, t) {
  onL(g, x, y, z, () => {
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h * 0.55); g.quadraticCurveTo(0, -h, w / 2, -h - 3); g.quadraticCurveTo(w, -h, w, -h * 0.55); g.lineTo(w, 0); g.closePath();
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, '#ff6a2c'); gl.addColorStop(1, '#ffe680'); g.fillStyle = gl; g.fill(); g.lineWidth = 3; g.strokeStyle = '#7a7266'; g.stroke(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
    g.fillStyle = `rgba(255,255,200,${(0.3 + Math.sin(t * 6) * 0.15).toFixed(2)})`; g.fillRect(w * 0.25, -h * 0.5, w * 0.5, h * 0.4);
  });
}
// a rack of slim Woodling blades (Dirk, Gladius, Rapier, Estoc)
function bladeRack(g, x, y) {
  const [a, b] = ISO(x, y, 0);
  line(g, [a - 10, b - 2], [a - 10, b - 22], OL, 4.4); line(g, [a + 10, b + 3], [a + 10, b - 17], OL, 4.4); line(g, [a - 10, b - 2], [a - 10, b - 22], BARKD, 2.2); line(g, [a + 10, b + 3], [a + 10, b - 17], BARKD, 2.2);
  line(g, [a - 11, b - 18], [a + 11, b - 13], OL, 4); line(g, [a - 11, b - 18], [a + 11, b - 13], BARK, 2);
  for (let k = 0; k < 4; k++) { const px = a - 6 + k * 4, py = b - 16 + k * 1; line(g, [px, py - 2], [px - 0.5, py + 14 - k * 2], OL, 2.6); line(g, [px, py - 2], [px - 0.5, py + 14 - k * 2], '#dfe6ee', 1.2); line(g, [px - 2.4, py - 1], [px + 2.4, py - 1], GOLD, 1.6); }
}
// an armor stand in Ornate (light purple) plate
function ornateStand(g, x, y) {
  const [a, b] = ISO(x, y, 0);
  line(g, [a, b], [a, b - 24], OL, 3.6); line(g, [a, b], [a, b - 24], BARKD, 1.8);
  path(g, [[a - 6, b - 20], [a + 6, b - 20], [a + 4.5, b - 8], [a - 4.5, b - 8]]); g.fillStyle = '#c9b2ec'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
  line(g, [a, b - 19], [a, b - 9], '#e8dcb0', 1.2);
  g.beginPath(); g.ellipse(a, b - 25, 4, 4.6, 0, 0, TAU); g.fillStyle = '#c9b2ec'; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(a, b - 29.5); g.quadraticCurveTo(a + 3, b - 35, a + 1, b - 39); g.lineWidth = 1.6; g.strokeStyle = '#e8dcb0'; g.stroke();
}
// a carved post with a curling top, used for frames and stalls
function post(g, x, y, z0, z1, col = BARKD) { line(g, ISO(x, y, z0), ISO(x, y, z1), OL, 4.6); line(g, ISO(x, y, z0), ISO(x, y, z1), col, 2.4); }
// a spear rack (Spear Protectors)
function spearRack(g, x, y) {
  const [a, b] = ISO(x, y, 0);
  line(g, [a - 12, b - 6], [a + 12, b + 6], OL, 4); line(g, [a - 12, b - 6], [a + 12, b + 6], BARK, 2);
  for (let k = 0; k < 5; k++) { const px = a - 10 + k * 5, py = b - 5 + k * 2.5; line(g, [px - 3, py + 4], [px + 2, py - 30], OL, 3); line(g, [px - 3, py + 4], [px + 2, py - 30], '#b08a5a', 1.4); path(g, [[px + 0.4, py - 29], [px + 2.6, py - 37], [px + 3.8, py - 29]]); g.fillStyle = '#dfe6ee'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = OL; g.stroke(); }
}
// an archery butt: a round straw target on a stand
function target(g, x, y, t) {
  const [a, b] = ISO(x, y, 0);
  line(g, [a - 6, b], [a - 2, b - 18], OL, 4); line(g, [a - 6, b], [a - 2, b - 18], BARKD, 2); line(g, [a + 6, b + 2], [a + 2, b - 18], OL, 4); line(g, [a + 6, b + 2], [a + 2, b - 18], BARKD, 2);
  for (const [r, c] of [[10, '#e8d29a'], [7.2, '#c8473d'], [4.6, '#efe6cf'], [2.2, '#c8473d']]) { g.beginPath(); g.ellipse(a, b - 22, r * 0.9, r, 0, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); }
  for (const [dx, dy] of [[-2, -1], [3, 2]]) { line(g, [a + dx, b - 22 + dy], [a + dx + 8, b - 22 + dy - 3], OL, 2.2); line(g, [a + dx, b - 22 + dy], [a + dx + 8, b - 22 + dy - 3], '#d9b07a', 1); }
}
// an iron brazier on three legs with a flame
function brazier(g, x, y, t) {
  const [a, b] = ISO(x, y, 0);
  for (const dx of [-5, 0, 5]) line(g, [a + dx * 0.6, b - 10], [a + dx, b + (dx ? 0 : 2)], OL, 2.4);
  g.beginPath(); g.ellipse(a, b - 11, 7, 3, 0, 0, Math.PI); g.lineTo(a - 7, b - 11); g.fillStyle = IRON; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
  const f = 1 + Math.sin(t * 9 + x) * 0.12;
  g.beginPath(); g.moveTo(a - 6, b - 12); g.quadraticCurveTo(a - 6, b - 20 * f, a, b - 27 * f); g.quadraticCurveTo(a + 6, b - 20 * f, a + 6, b - 12); g.closePath(); g.fillStyle = '#ff9a3a'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.moveTo(a - 3, b - 12); g.quadraticCurveTo(a - 2, b - 17 * f, a, b - 21 * f); g.quadraticCurveTo(a + 2, b - 17 * f, a + 3, b - 12); g.closePath(); g.fillStyle = '#ffe680'; g.fill();
}
// antlers (screen coords), spread s wide
function antlers(g, x, y, s, col = '#efe2c4') {
  const bez = (d, f) => { const u = 1 - f, P = [[x + d * 2 * s, y], [x + d * 13 * s, y + 1 * s], [x + d * 14 * s, y - 8 * s], [x + d * 9 * s, y - 16 * s]]; return [u * u * u * P[0][0] + 3 * u * u * f * P[1][0] + 3 * u * f * f * P[2][0] + f * f * f * P[3][0], u * u * u * P[0][1] + 3 * u * u * f * P[1][1] + 3 * u * f * f * P[2][1] + f * f * f * P[3][1]]; };
  for (const d of [-1, 1]) for (const [lw, c] of [[2.6 * s + 2.4, OL], [2.6 * s, col]]) {
    g.lineWidth = lw; g.strokeStyle = c; g.lineCap = 'round';
    g.beginPath(); g.moveTo(...bez(d, 0)); for (let k = 1; k <= 12; k++) g.lineTo(...bez(d, k / 12)); g.stroke();
    for (const [f, dx, l] of [[0.3, -0.3, 7], [0.55, 0.1, 8], [0.8, 0.5, 6]]) { const [px, py] = bez(d, f); g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + d * dx * 3 * s, py - l * 0.6 * s, px + d * dx * 4 * s - d * 1.5 * s, py - l * s); g.stroke(); }
  }
}

const WD = {};
// Farm: an apple orchard round a little stave cottage, baskets of apples and a wattle fence
WD.farm = (g, t) => {
  appleTree(g, 12, -34, 0.95, t, 501);
  staveHall(g, -38, -36, 28, 20, 16, 13, { door: 0.45, moss: 3, seed: 5, wins: [0.82], dragonS: 0.7 });
  appleTree(g, 32, -14, 1, t, 502);
  appleTree(g, 6, -8, 1.05, t, 503);
  appleTree(g, -26, 12, 0.95, t, 504);
  { const [a, b] = ISO(10, -6, 0); line(g, [a + 6, b + 2], [a + 12, b - 26], OL, 3.6); line(g, [a + 12, b + 4], [a + 18, b - 24], OL, 3.6); line(g, [a + 6, b + 2], [a + 12, b - 26], '#c99d68', 1.8); line(g, [a + 12, b + 4], [a + 18, b - 24], '#c99d68', 1.8); for (let k = 1; k < 6; k++) line(g, [a + 6 + k, b + 2 - k * 4.7], [a + 12 + k, b + 4 - k * 4.7], '#c99d68', 1.6); }
  appleTree(g, 26, 16, 1, t, 505);
  basket(g, -4, 22); basket(g, 4, 28); basket(g, 34, -32, 'apple');
  wattle(g, [-38, 38], [12, 38], 10, 5); wattle(g, [38, -10], [38, 6], 10, 2);
};
// Lumber Mill: a stave mill on a stream with a turning water wheel, stacked logs, a sawhorse and planks
WD.lumber = (g, t) => {
  stream(g, 30, -42, 30, 42, 12, t);
  staveHall(g, -22, -36, 44, 26, 20, 15, { door: 0.3, moss: 2, seed: 7, wins: [0.75] });
  waterWheel(g, 25, -23, 12, 13, t);
  { const [a, b] = ISO(4, -10, 0); g.fillStyle = '#d9b07a'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(a + k * 4 - 6, b + 4 + k % 2, 1.6, 0.9, 0, 0, TAU); g.fill(); } }
  logs(g, -36, 0, 6, 24);
  { // a sawhorse with a log on it and a two-man saw
    const x = 4, y = 12; for (const dx of [0, 18]) { const [a, b] = ISO(x + dx, y, 0); line(g, [a - 5, b], [a + 3, b - 12], OL, 3.6); line(g, [a + 5, b + 1], [a - 3, b - 12], OL, 3.6); line(g, [a - 5, b], [a + 3, b - 12], BARKD, 1.8); line(g, [a + 5, b + 1], [a - 3, b - 12], BARKD, 1.8); }
    const a = ISO(x - 6, y, 13), b = ISO(x + 26, y, 13); line(g, a, b, OL, 10); line(g, a, b, BARK, 6.4); g.beginPath(); g.ellipse(b[0], b[1], 3, 3.4, 0, 0, TAU); g.fillStyle = '#e2c290'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
    const [m, n] = ISO(x + 10, y, 13); path(g, [[m - 2, n - 10], [m + 2, n - 10], [m + 2, n + 6], [m - 2, n + 6]]); g.fillStyle = '#c9d2dc'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke();
  }
  planks(g, -16, 26, 4);
  fern(g, 18, 34, 0.8);
};
// Gold Mine: a carved, pointed archway into a mossy hill, lantern-lit, rails and a cart of gold
WD.goldmine = (g, t) => {
  const [hx, hy] = ISO(-10, -12, 0);
  // the hill
  const pts = [[hx - 56, hy + 6], [hx - 50, hy - 20], [hx - 34, hy - 44], [hx - 10, hy - 58], [hx + 14, hy - 54], [hx + 36, hy - 36], [hx + 50, hy - 12], [hx + 54, hy + 8]];
  g.beginPath(); g.moveTo(...pts[0]); for (let k = 1; k < pts.length; k++) { const [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; g.quadraticCurveTo(x0 + (x1 - x0) * 0.2, y1, x1, y1); } g.quadraticCurveTo(hx, hy + 22, pts[0][0], pts[0][1]); g.closePath();
  g.fillStyle = '#8f8a7e'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
  g.save(); g.clip(); g.fillStyle = 'rgba(0,0,0,0.14)'; g.beginPath(); g.ellipse(hx + 40, hy - 10, 30, 60, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(40,36,30,0.35)'; g.lineWidth = 1.4; for (const [a, b, c, d] of [[-40, -14, -24, -24], [22, -34, 34, -22], [-20, -40, -6, -46], [30, -6, 44, -10]]) { g.beginPath(); g.moveTo(hx + a, hy + b); g.lineTo(hx + c, hy + d); g.stroke(); } g.restore();
  // moss and a little tree on the hilltop, roots spilling over the rock
  clump(g, hx - 30, hy - 40, 12, 71, MOSS, MOSSL); clump(g, hx + 26, hy - 44, 10, 72, MOSS, MOSSL); clump(g, hx - 4, hy - 56, 10, 73, MOSS, MOSSL);
  root_(g, hx - 8, hy - 56, hx - 22, hy - 30, 3.2); root_(g, hx + 4, hy - 56, hx + 20, hy - 26, 3.2);
  line(g, [hx - 2, hy - 56], [hx - 2, hy - 76], OL, 6); line(g, [hx - 2, hy - 56], [hx - 2, hy - 76], BARK, 3.4); clump(g, hx - 2, hy - 82, 14, 74, LEAF, LEAFL, t);
  // the carved stone archway
  const ax = hx - 6, ay = hy + 8;
  g.beginPath(); g.moveTo(ax - 20, ay); g.lineTo(ax - 20, ay - 22); g.quadraticCurveTo(ax - 20, ay - 44, ax, ay - 50); g.quadraticCurveTo(ax + 20, ay - 44, ax + 20, ay - 22); g.lineTo(ax + 20, ay); g.closePath(); g.fillStyle = '#c9c4b2'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.moveTo(ax - 13, ay); g.lineTo(ax - 13, ay - 20); g.quadraticCurveTo(ax - 13, ay - 36, ax, ay - 41); g.quadraticCurveTo(ax + 13, ay - 36, ax + 13, ay - 20); g.lineTo(ax + 13, ay); g.closePath();
  const gl = g.createRadialGradient(ax, ay - 10, 2, ax, ay - 16, 26); gl.addColorStop(0, '#ffcf6a'); gl.addColorStop(0.35, '#8a5a2a'); gl.addColorStop(1, '#241a16'); g.fillStyle = gl; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.strokeStyle = '#7ad9c8'; g.lineWidth = 1.4; for (const [dx, dy] of [[-17, -14], [-17, -26], [17, -14], [17, -26], [0, -46]]) { g.beginPath(); g.moveTo(ax + dx, ay + dy - 3); g.lineTo(ax + dx, ay + dy + 3); g.moveTo(ax + dx - 1.6, ay + dy - 1); g.lineTo(ax + dx + 1.6, ay + dy + 1); g.stroke(); }
  for (const [dx, dy] of [[-4, -8], [5, -12], [-1, -18]]) { g.fillStyle = COIN; g.beginPath(); g.arc(ax + dx, ay + dy, 1.4, 0, TAU); g.fill(); }
  ivy(g, [ax - 20, ay - 30], [ax - 4, ay - 50], 6, 77); ivy(g, [ax + 20, ay - 18], [ax + 14, ay - 42], 5, 78);
  // rails out of the mine to a cart of gold
  for (const off of [-4, 4]) line(g, ISO(-8 + off, 4, 0), ISO(-8 + off, 40, 0), OL, 2.6);
  for (let k = 0; k < 6; k++) { const yy = 6 + k * 6; line(g, ISO(-14, yy, 0), ISO(-2, yy, 0), BARKD, 2.6); }
  { const x = -14, y = 18; prism(g, x, y, 3, 12, 14, 9, '#6a5a4a', 'wood'); const [a, b] = ISO(x + 6, y + 7, 12); g.beginPath(); g.ellipse(a, b - 1, 9, 4.5, 0, Math.PI, 0); g.fillStyle = COIN; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); for (const dx of [-4, 1, 5]) sdot(g, a + dx, b - 3, 2, '#ffe080', 1); for (const [wx, wy] of [[x + 2, y + 14], [x + 10, y + 14]]) { const [c, d] = ISO(wx, wy, 2.5); sdot(g, c, d, 3, IRON, 1.6); } }
  lanternPost(g, 20, 10, t);
  boulder(g, ...ISO(28, 30, 0), 9, 79);
  { const [a, b] = ISO(10, 30, 0); for (const [dx, dy] of [[0, 0], [5, 2], [-4, 3]]) { path(g, [[a + dx - 3, b + dy], [a + dx - 2, b + dy - 4], [a + dx + 2, b + dy - 5], [a + dx + 4, b + dy - 1], [a + dx + 1, b + dy + 1]]); g.fillStyle = COIN; g.fill(); g.lineWidth = 1.3; g.strokeStyle = OL; g.stroke(); } }
};
// Barracks: a long stave hall with dragon heads, a spear rack, an archery butt and leaf banners (no shields: Woodlings bear none)
WD.barracks = (g, t) => {
  banner(g, -34, -38, t, '#4f8a3f', 40);
  staveHall(g, -34, -32, 50, 24, 20, 17, { door: 0.5, doorW: 5.5, doorH: 16, moss: 2, seed: 11, wins: [0.18, 0.82], gableWin: true });
  banner(g, 24, -26, t, '#4f8a3f', 40);
  spearRack(g, -26, 10);
  target(g, 26, 8, t);
  { const [a, b] = ISO(4, 22, 0); for (const dx of [-4, 4]) { g.beginPath(); g.ellipse(a + dx, b, 4.4, 2.2, 0, 0, TAU); g.fillStyle = '#a08a62'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke(); } }
  standingStone(g, -6, 30, 16, true);
  fern(g, 32, 32, 0.8);
};
// Hall of Champions: a long turf-roofed longhouse with a great antlered gable, braziers and a Champion's greatsword on a stand
WD.stable = (g, t) => {
  banner(g, -40, -36, t, '#6a4a8a', 44);
  staveHall(g, -38, -30, 62, 26, 15, 22, { roof: '#5f8a3a', door: 0.55, doorW: 6, doorH: 13, moss: 6, seed: 13, wins: [0.2, 0.85], noDragons: true });
  // carved gable boards crossing at the ridge ends, ending in antlers
  { const p = ISO(26, -17, 37), q = ISO(-40, -17, 37); antlers(g, p[0] + 2, p[1] - 1, 0.75); antlers(g, q[0] - 2, q[1] - 1, 0.65); }
  // a great antlered skull mounted over the door
  { const [a, b] = ISO(-38 + 62 * 0.55, -4, 12.5); antlers(g, a, b - 1, 0.8); g.beginPath(); g.moveTo(a - 3.4, b - 2); g.lineTo(a + 3.4, b - 2); g.lineTo(a + 1.6, b + 5); g.lineTo(a - 1.6, b + 5); g.closePath(); g.fillStyle = '#efe2c4'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); g.fillStyle = OL; g.fillRect(a - 2.2, b, 1.4, 1.4); g.fillRect(a + 0.8, b, 1.4, 1.4); }
  banner(g, 36, -12, t, '#6a4a8a', 44);
  brazier(g, -26, 8, t); brazier(g, 22, 8, t + 1);
  { // a greatsword standing in a stone
    const [a, b] = ISO(8, 28, 0); boulder(g, a, b, 8, 81);
    line(g, [a, b - 6], [a, b - 36], OL, 5); line(g, [a, b - 6], [a, b - 36], '#dfe6ee', 3); line(g, [a - 6, b - 34], [a + 6, b - 34], OL, 4); line(g, [a - 6, b - 34], [a + 6, b - 34], GOLD, 2.2); line(g, [a, b - 34], [a, b - 43], OL, 3.6); line(g, [a, b - 34], [a, b - 43], '#6a4a7a', 2); sdot(g, a, b - 44, 2, GOLD, 1);
  }
};
// Bazaar: arched stalls under leafy awnings in lilac, leaf-green and gold, a string of lanterns, baskets and bolts of cloth
function stallW(g, x, y, w, d, col, goods, t) {
  for (const [px, py] of [[x, y], [x + w, y]]) post(g, px, py, 0, 22);
  prism(g, x + 1, y + d - 8, 0, w - 2, 8, 9, '#8a6040', 'wood');
  for (const [px, py] of [[x, y + d], [x + w, y + d]]) post(g, px, py, 0, 20);
  // the awning, sloping to the front, with a scalloped hem
  const a = ISO(x - 2, y - 1, 24), b = ISO(x + w + 2, y - 1, 24), c = ISO(x + w + 2, y + d + 3, 18), e = ISO(x - 2, y + d + 3, 18);
  face(g, [a, b, c, e], col, () => { for (let k = 1; k < 4; k++) { const f = k / 4; line(g, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], [e[0] + (c[0] - e[0]) * f, e[1] + (c[1] - e[1]) * f], 'rgba(255,255,255,0.3)', 2.4); } }, 2.2);
  for (let k = 0; k < 6; k++) { const f0 = k / 6, f1 = (k + 1) / 6, p0 = [e[0] + (c[0] - e[0]) * f0, e[1] + (c[1] - e[1]) * f0], p1 = [e[0] + (c[0] - e[0]) * f1, e[1] + (c[1] - e[1]) * f1]; g.beginPath(); g.moveTo(...p0); g.quadraticCurveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + 6, ...p1); g.closePath(); g.fillStyle = dark(col); g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke(); }
  const [gx, gy] = ISO(x + w / 2, y + d - 4, 9);
  if (goods === 'apples') for (let k = 0; k < 7; k++) sdot(g, gx - 8 + (k % 4) * 5 + (k > 3 ? 2.5 : 0), gy - 2 - (k > 3 ? 3 : 0), 2.2, k % 3 ? APPLE : '#9bc84a', 1);
  else if (goods === 'cloth') for (const [dx, c2] of [[-7, LILAC], [0, TEAL], [7, '#e0c870']]) { g.beginPath(); g.ellipse(gx + dx, gy - 3, 3.4, 4.2, 0, 0, TAU); g.fillStyle = c2; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); }
  else for (const [dx, c2] of [[-7, '#7fe3ff'], [-1, '#c9a3e8'], [5, '#9be38a']]) { path(g, [[gx + dx - 2.4, gy], [gx + dx - 2.4, gy - 5], [gx + dx - 1, gy - 7], [gx + dx - 1, gy - 10], [gx + dx + 1, gy - 10], [gx + dx + 1, gy - 7], [gx + dx + 2.4, gy - 5], [gx + dx + 2.4, gy]]); g.fillStyle = c2; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke(); }
}
WD.market = (g, t) => {
  { const [sx, sy] = ISO(-30, -32, 0); line(g, [sx, sy], [sx, sy - 34], OL, 8); line(g, [sx, sy], [sx, sy - 34], BARK, 5); clump(g, sx, sy - 44, 22, 91, LEAF, LEAFL, t); }
  stallW(g, -10, -38, 28, 18, LILAC, 'potions', t);
  stallW(g, -38, -6, 24, 18, '#5fa04a', 'apples', t);
  { // a string of lanterns between two posts
    post(g, 30, -4, 0, 30); post(g, 2, 30, 0, 30);
    const a = ISO(30, -4, 30), b = ISO(2, 30, 30); g.beginPath(); g.moveTo(...a); g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 12, ...b); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke();
    for (let k = 1; k < 5; k++) { const f = k / 5, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f + 12 * 4 * f * (1 - f) * 0.5 + 3; lantern(g, x, y, t + k, 0.7); }
  }
  stallW(g, 4, 2, 24, 18, '#d8b44a', 'cloth', t);
  { const [a, b] = ISO(-20, 26, 0); g.save(); g.translate(a, b); g.transform(1, 0.5, -1, 0.5, 0, 0); g.fillStyle = '#8a4a6a'; g.fillRect(-10, -6, 20, 12); g.strokeStyle = GOLD; g.lineWidth = 1.4; g.strokeRect(-8, -4, 16, 8); g.lineWidth = 1.6; g.strokeStyle = OL; g.strokeRect(-10, -6, 20, 12); g.restore(); }
  basket(g, -14, 30); basket(g, -6, 34, WHEAT);
};
// Granary: a stabbur — a stave storehouse standing on stone stilts, its upper floor jutting out, sheaves and sacks of grain about it
WD.granary = (g, t) => {
  stook(g, -34, -30, 1); stook(g, 30, -34, 0.9);
  for (const [x, y] of [[-24, -22], [8, -22], [-24, 4], [8, 4]]) { prism(g, x, y, 0, 6, 6, 9, '#9c968a', 'stone'); prism(g, x - 1, y - 1, 9, 8, 8, 2, '#b8b0a2'); }
  prism(g, -26, -24, 11, 36, 32, 16, TAR, 'wood');
  onL(g, -8, 8, 11, () => doorway(g, 4.5, 12));
  // the jutting upper floor
  prism(g, -29, -27, 27, 42, 38, 14, '#8a6040', 'wood');
  for (const u of [0.25, 0.75]) onL(g, -29 + 42 * u, 11, 30, () => arch(g, 2.2, 8, GLOW, true));
  { // a gable roof with dragon heads
    const x = -31, y = -29, w = 46, d = 42, h = 41, rh = 18;
    face(g, [ISO(x + w, y + d, h), ISO(x + w, y, h), ISO(x + w, y + d / 2, h + rh)], dark(TAR), null, 2.4);
    const p0 = ISO(x - 3, y + d + 3, h - 3), p1 = ISO(x + w + 3, y + d + 3, h - 3), p2 = ISO(x + w + 3, y + d / 2, h + rh), p3 = ISO(x - 3, y + d / 2, h + rh);
    face(g, [p0, p1, p2, p3], SHING, () => { g.strokeStyle = 'rgba(255,225,190,0.16)'; g.lineWidth = 1.1; for (let i = 0; i < 5; i++) { const f = (i + 0.5) / 5, a = [p0[0] + (p3[0] - p0[0]) * f, p0[1] + (p3[1] - p0[1]) * f], b = [p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f]; for (let j = 0; j < 12; j++) { const u = (j + (i % 2) * 0.5) / 12; g.beginPath(); g.arc(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 2.6, 0.1, Math.PI - 0.1); g.stroke(); } } }, 2.4);
    line(g, p3, p2, OL, 4); line(g, p3, p2, dark(SHING), 2); mossRoof(g, -8, -8, 40, 24, 10, 10, 17, 2);
    dragon(g, p3[0] - 1, p3[1] + 1, -1, 0.9); dragon(g, p2[0] + 1, p2[1] + 1, 1, 0.9);
  }
  { // a ladder up to the door
    const a = ISO(-12, 22, 0), b = ISO(-12, 8, 12), c = ISO(-4, 22, 0), d = ISO(-4, 8, 12); line(g, a, b, OL, 3.4); line(g, c, d, OL, 3.4); line(g, a, b, '#c99d68', 1.6); line(g, c, d, '#c99d68', 1.6); for (let k = 1; k < 4; k++) { const f = k / 4; line(g, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], [c[0] + (d[0] - c[0]) * f, c[1] + (d[1] - c[1]) * f], '#c99d68', 1.6); } }
  sack(g, 18, 18); sack(g, 26, 14); sack(g, 22, 26, 0, '#e6d3a3');
  basket(g, -30, 22, WHEAT); stook(g, -34, 34, 0.9);
};
// Storehouse: a hollow giant fallen tree, a round door cut in its end, a window in its side, moss and mushrooms along its back
function hull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
WD.storehouse = (g, t) => {
  const x0 = -38, x1 = 24, cy = -4, r = 18, cz = 16;
  const rim = x => Array.from({ length: 24 }, (_, k) => { const a = k / 24 * TAU; return ISO(x, cy + Math.cos(a) * r, cz + Math.sin(a) * r); });
  // shadow, the far broken end (jagged), the bark body
  { const [a, b] = ISO((x0 + x1) / 2, cy + 6, 0); g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(a, b, 50, 16, 0.46, 0, TAU); g.fill(); }
  const body = hull(rim(x0).concat(rim(x1)));
  path(g, body); const [s0] = ISO(x0, cy, cz), [s1] = ISO(x1, cy, cz), gr = g.createLinearGradient(0, ISO(0, cy, cz + r)[1] - 10, 0, ISO(0, cy, cz - r)[1] + 20); gr.addColorStop(0, '#9a7050'); gr.addColorStop(0.45, BARK); gr.addColorStop(1, BARKD); g.fillStyle = gr; g.fill();
  g.save(); path(g, body); g.clip(); g.strokeStyle = 'rgba(40,25,15,0.4)'; g.lineWidth = 1.5;
  for (let k = 0; k < 9; k++) { const a = Math.PI * (0.15 + k * 0.1), y = cy + Math.cos(a) * r, z = cz + Math.sin(a) * r; g.beginPath(); for (let i = 0; i <= 10; i++) { const x = x0 + (x1 - x0) * i / 10, [px, py] = ISO(x, y, z); i ? g.lineTo(px + Math.sin(i * 2 + k) * 1.5, py) : g.moveTo(px, py); } g.stroke(); }
  g.restore(); path(g, body); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke(); void s0; void s1;
  // branch stubs
  { const [a, b] = ISO(-20, cy - 4, cz + r); branch(g, a, b + 4, a - 6, b - 16, 4, -3); clump(g, a - 8, b - 20, 8, 95, LEAF, LEAFL, t); const [c, d] = ISO(4, cy - 8, cz + r - 2); branch(g, c, d + 3, c + 8, d - 10, 3.4, 3); }
  // moss along the top and mushrooms climbing the side
  mossLine(g, ISO(x0 + 4, cy - 4, cz + r), ISO(x1 - 4, cy - 4, cz + r), 10, 97);
  for (const [x, z] of [[-28, 10], [-24, 14], [-31, 15]]) { const [a, b] = ISO(x, cy + r * 0.8, z); g.beginPath(); g.ellipse(a, b, 4, 1.8, 0.4, 0, TAU); g.fillStyle = '#e8c890'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = OL; g.stroke(); }
  // a round window in the side (the face toward the lower left)
  { const [a, b] = ISO(-10, cy + r * 0.92, cz + 4); g.beginPath(); g.ellipse(a, b, 4.2, 4.8, 0.45, 0, TAU); g.fillStyle = GLOW; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); line(g, [a - 3.4, b - 1.6], [a + 3.4, b + 1.6], OL, 1.2); }
  // the cut end facing the lower right: tree rings round a door
  onR(g, x1, cy, cz, () => {
    g.beginPath(); g.arc(0, 0, r * Math.SQRT1_2 * 1.414, 0, TAU); g.fillStyle = '#d6b483'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
    g.strokeStyle = 'rgba(140,90,50,0.55)'; g.lineWidth = 1.1; for (const rr of [16, 13.5, 11]) { g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); }
    g.beginPath(); g.moveTo(-6.5, r); g.lineTo(-6.5, 2); g.arc(0, 2, 6.5, Math.PI, 0); g.lineTo(6.5, r); g.closePath(); g.save(); g.clip(); g.fillStyle = '#7a4a2a'; g.fillRect(-8, -6, 16, 30); for (const lx of [-3.5, 0, 3.5]) line(g, [lx, -6], [lx, r], 'rgba(0,0,0,0.3)', 1); g.restore(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    sdot(g, 3.4, 9, 1.1, GOLD, 0.6);
  });
  { const [a, b] = ISO(x1 + 2, cy + 14, 0); lantern(g, a + 10, b - 26, t, 0.8); line(g, [a + 10, b], [a + 10, b - 22], OL, 3.6); line(g, [a + 10, b], [a + 10, b - 22], BARKD, 1.8); }
  planks(g, -30, 20, 4); logs(g, 2, 24, 3, 18);
  fern(g, 34, -30, 0.9); mushroomRing(g, -34, -30, 0.6);
};
// Bank: a treasury in a great tree stump, a round gilded door ringed with runes, a little stave cupola on top, chests and coins
WD.bank = (g, t) => {
  const R = 24, H = 30;
  { const [bx, by] = ISO(-4, -4, 0); for (const [ex, ey, w] of [[-46, 6, 6], [42, 4, 6], [-20, 22, 5], [26, 20, 5]]) root_(g, bx + ex * 0.4, by + ey * 0.2 - 2, bx + ex, by + ey, w); }
  oakTrunk(g, -4, -4, 0, H, R);
  { // the cut top with rings
    const [sx, sy] = ISO(-4, -4, H), rx = R * Math.SQRT2; g.beginPath(); g.ellipse(sx, sy, rx, rx / 2, 0, 0, TAU); g.fillStyle = '#d6b483'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
    g.strokeStyle = 'rgba(140,90,50,0.5)'; g.lineWidth = 1.1; for (const k of [0.78, 0.56, 0.34]) { g.beginPath(); g.ellipse(sx, sy, rx * k, rx * k / 2, 0, 0, TAU); g.stroke(); }
  }
  // the cupola: a small stave lantern-house with a gilded spire
  walls(g, -4, -4, H, 10, 12, TAR);
  for (const side of ['L', 'R']) onFace(g, side, -4, -4, 10, 0, H + 2, () => arch(g, 2.2, 8, GLOW, true));
  const tip = roof(g, -4, -4, H + 12, 13, 0, 22, '#b8963a');
  line(g, tip, [tip[0], tip[1] - 8], OL, 4); line(g, tip, [tip[0], tip[1] - 8], GOLD, 2); sdot(g, tip[0], tip[1] - 10, 2.8, COIN, 1.3);
  dragons(g, -4, -4, H + 12, 13, 0.7);
  { // the round gilded door with a ring of glowing runes
    const [sx, sy] = ISO(-4, -4, 0), x = sx, y = sy + R * Math.SQRT2 / 2 * 0.95 - 13;
    g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fillStyle = '#b8963a'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fillStyle = COIN; g.fill(); g.lineWidth = 1.6; g.stroke();
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + t * 0.3; g.fillStyle = `rgba(122,217,200,${(0.6 + Math.sin(t * 3 + k) * 0.3).toFixed(2)})`; g.fillRect(x + Math.cos(a) * 10.5 - 0.8, y + Math.sin(a) * 10.5 - 0.8, 1.6, 1.6); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; line(g, [x, y], [x + Math.cos(a) * 8, y + Math.sin(a) * 8], COIND, 1.2); }
    sdot(g, x, y, 2.6, '#e8dcb0', 1.2);
  }
  chest(g, 22, 22); coins(g, 4, 34); coins(g, -30, 24, 0.8);
  lanternPost(g, -34, 16, t);
  for (let k = 0; k < 2; k++) { const [a, b] = ISO(28, 26, 14), f = (t * 0.8 + k * 0.5) % 1; g.save(); g.globalAlpha = 1 - f; g.beginPath(); g.ellipse(a, b - f * 16, 3, 1.6, 0, 0, TAU); g.fillStyle = COIN; g.fill(); g.restore(); }
};
// Forge / Battle Forge / War Forge: a smithy of mossy fieldstone under a shingled stave roof, a glowing pointed furnace,
// racks of slim blades; it grows a vine-wrapped work shed, more chimneys, a quenching pool and Ornate armor on display
WD.forge = (g, t, lv = 1) => {
  if (lv >= 3) standingStone(g, -38, -38, 22);
  if (lv >= 2) banner(g, 30, -38, t, '#6a4a8a', 46);
  const w = lv === 1 ? 34 : lv === 2 ? 40 : 50, d = lv === 1 ? 26 : 30, x = lv === 3 ? -36 : -30, y = -34;
  if (lv >= 2) chimney(g, x + 4, y + 2, 0, 34 + lv * 4, t, 8);
  staveHall(g, x, y, w, d, 18 + lv * 2, 14 + lv, { wall: '#a8a294', tex: 'stone', moss: 2 + lv, seed: 20 + lv, dragonS: 0.8 });
  chimney(g, x + w - 14, y + 4, 22, 44 + lv * 4, t, 8);
  if (lv >= 3) chimney(g, x + w * 0.45, y + 2, 26, 52, t, 8);
  furnace(g, x + 5, y + d, 0, 13 + lv * 2, 14 + lv * 2, t);
  onL(g, x + w - 9, y + d, 0, () => doorway(g, 4.5, 14));
  ivy(g, ISO(x, y + d, 18), ISO(x, y + d, 2), 5, 30 + lv);
  if (lv >= 2) { // a work shed on vine-wrapped posts
    const sx = lv === 3 ? 18 : 14, sy = 0;
    for (const [px, py] of [[sx, sy], [sx + 20, sy]]) post(g, px, py, 0, 22);
    anvil(g, sx + 8, sy + 10); hammerArm(g, sx + 14, sy + 14, t); sparks(g, ...ISO(sx + 11, sy + 12, 12), t, 6);
    face(g, [ISO(sx - 2, sy + 24, 22), ISO(sx + 22, sy + 24, 22), ISO(sx + 22, sy - 2, 27), ISO(sx - 2, sy - 2, 27)], SHING, () => line(g, ISO(sx - 2, sy + 23, 22.5), ISO(sx + 22, sy + 23, 22.5), 'rgba(255,255,255,0.25)', 2), 2.2);
    for (const [px, py] of [[sx, sy + 22], [sx + 20, sy + 22]]) post(g, px, py, 0, 22);
    ivy(g, ISO(sx, sy + 22, 0), ISO(sx, sy + 22, 20), 5, 41); ivy(g, ISO(sx + 20, sy + 22, 0), ISO(sx + 20, sy + 22, 20), 5, 42);
  } else { anvil(g, 12, 12); hammerArm(g, 18, 16, t); sparks(g, ...ISO(15, 14, 12), t, 4); }
  bladeRack(g, -28, 16);
  if (lv >= 3) { // a quenching pool fed from a stone channel, and Ornate armor on stands
    const [a, b] = ISO(-10, 30, 0); g.beginPath(); g.ellipse(a, b, 13, 6.5, 0, 0, TAU); g.fillStyle = WATER; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(a - 3, b - 1, 6, 2, 0, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
    for (let k = 0; k < 2; k++) { const f = (t * 0.5 + k / 2) % 1; g.globalAlpha = 0.5 * (1 - f); g.fillStyle = '#f4f6f8'; g.beginPath(); g.arc(a + (k - 0.5) * 6, b - 6 - f * 20, 3 + f * 5, 0, TAU); g.fill(); g.globalAlpha = 1; }
    ornateStand(g, 30, 30); ornateStand(g, 38, 20);
  } else { const [a, b] = ISO(24, 30, 0); g.beginPath(); g.ellipse(a, b - 3, 7, 3.5, 0, 0, TAU); g.fillStyle = '#2f2f36'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke(); }
};
// Grove / Majestic Grove / Magnificent Grove: a great tree whose canopy spreads wider at each level, a ring of
// rune stones round it, glowing motes drifting; the Magnificent Grove hangs lanterns in its boughs over a moonlit pool
WD.magetower = (g, t, lv = 1) => {
  const H = [0, 40, 56, 72][lv], R = [0, 9, 12, 15][lv], C = [0, 30, 40, 52][lv];
  const stones = [[], [[-30, 18], [26, -26], [30, 20]], [[-34, 10], [-14, -36], [24, -30], [34, 14], [0, 36]], [[-36, 4], [-22, -32], [10, -38], [36, -12], [32, 24], [-8, 38], [-34, 30]]][lv];
  const [bx, by] = ISO(0, 0, 0), [tx, ty] = ISO(0, 0, H);
  const front = stones.filter(([x, y]) => x + y > 0), back = stones.filter(([x, y]) => x + y <= 0);
  // the canopy behind, roots, back stones
  for (const [dx, dy, s, sd] of [[-C * 0.9, 6, C * 0.62, 1], [C * 0.9, 2, C * 0.62, 2], [0, -C * 0.55, C * 0.7, 3]]) clump(g, tx + dx, ty + dy - C * 0.3, s, 600 + sd + lv * 10, LEAFD, LEAF, t);
  back.forEach(([x, y]) => standingStone(g, x, y, 18 + lv * 2));
  if (lv >= 3) { const [a, b] = ISO(18, 22, 0); g.beginPath(); g.ellipse(a, b, 18, 8, 0, 0, TAU); g.fillStyle = '#3f6fa0'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(a - 4, b - 1, 8, 2.6, 0, 0, TAU); g.fillStyle = 'rgba(220,230,255,0.45)'; g.fill(); }
  for (const [ex, ey, w] of [[-R * 3.2, 4, R * 0.5], [R * 3, 3, R * 0.5], [-R * 1.2, 10, R * 0.4], [R * 1.4, 9, R * 0.4]]) root_(g, bx + ex * 0.3, by - 2, bx + ex, by + ey, w);
  const b = oakTrunk(g, 0, 0, 0, H, R);
  // glowing runes climbing the trunk
  for (let k = 0; k < lv + 1; k++) { const yy = by - 8 - k * (H / (lv + 1.5)), xx = bx + (k % 2 ? 0.25 : -0.2) * b.rx, a = 0.55 + Math.sin(t * 2.5 + k) * 0.3; g.strokeStyle = `rgba(150,240,220,${a.toFixed(2)})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(xx, yy - 4); g.lineTo(xx, yy + 4); g.moveTo(xx - 2.5, yy - 1); g.lineTo(xx + 2.5, yy + 1.5); g.stroke(); }
  if (lv >= 2) onL(g, 0, 0, 0, () => { g.translate(0, R * 0.5); doorway(g, 3.6 + lv * 0.4, 9 + lv * 2); });
  // boughs and the crown
  branch(g, tx - 2, ty + 6, tx - C * 0.8, ty - C * 0.3, R * 0.45, -6); branch(g, tx + 2, ty + 6, tx + C * 0.8, ty - C * 0.35, R * 0.45, 6); branch(g, tx, ty, tx + 2, ty - C * 0.75, R * 0.4, 3);
  const crown = [[-C * 0.75, -C * 0.35, C * 0.5, 4], [C * 0.75, -C * 0.4, C * 0.5, 5], [0, -C * 0.85, C * 0.58, 6], [-C * 0.3, -C * 0.15, C * 0.38, 7], [C * 0.32, -C * 0.18, C * 0.38, 8]];
  for (const [dx, dy, s, sd] of crown) clump(g, tx + dx, ty + dy, s, 620 + sd + lv * 10, sd % 2 ? LEAF : '#5aa64c', sd === 6 && lv >= 2 ? '#a6dc78' : LEAFL, t);
  if (lv >= 2) for (const [dx, dy, sd] of [[-C * 0.45, -C * 0.6, 1], [C * 0.5, -C * 0.7, 2], [C * 0.1, -C * 1.1, 3]]) { const r2 = rnd(sd + lv); for (let k = 0; k < 4; k++) sdot(g, tx + dx + (r2() - 0.5) * 16, ty + dy + (r2() - 0.5) * 10, 1.8, k % 2 ? '#c9a3e8' : '#f2ead8', 0.8); }
  if (lv >= 3) for (const [dx, dy] of [[-C * 0.62, -C * 0.05], [C * 0.6, -C * 0.1], [-C * 0.15, C * 0.05], [C * 0.22, -C * 0.02]]) { line(g, [tx + dx, ty + dy - 10], [tx + dx, ty + dy], 'rgba(29,26,34,0.8)', 1); lantern(g, tx + dx, ty + dy + 3, t + dx, 0.8); }
  front.forEach(([x, y]) => standingStone(g, x, y, 18 + lv * 2));
  // motes of light drifting round the crown
  for (let k = 0; k < 3 + lv * 3; k++) { const q = t * 0.6 + k * 1.7, x = tx + Math.sin(q * 1.2 + k) * C * 1.1, y = ty - C * 0.4 + Math.cos(q + k * 2) * C * 0.6, a = 0.45 + Math.sin(t * 4 + k) * 0.35; g.fillStyle = k % 3 ? `rgba(230,255,160,${a.toFixed(2)})` : `rgba(200,160,255,${a.toFixed(2)})`; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }
  if (lv === 1) mushroomRing(g, -18, 26, 0.7);
};
// Shrine: a statue of a veiled woman praying humbly on a round stone plinth, under an arch of living branches,
// candles and flowers at her feet
function veiledFigure(g, sx, sy, s, t) {
  // the robe and veil: one flowing shape from the bowed head down to a flared hem
  g.save(); g.translate(sx, sy); g.scale(s, s);
  const robe = () => { g.beginPath(); g.moveTo(-13, 0); g.quadraticCurveTo(-12, -16, -10, -28); g.quadraticCurveTo(-11, -38, -7, -45); g.quadraticCurveTo(-4, -51, 1, -50); g.quadraticCurveTo(7, -48, 8, -41); g.quadraticCurveTo(10, -32, 9, -26); g.quadraticCurveTo(12, -12, 14, 0); g.quadraticCurveTo(0, 4, -13, 0); g.closePath(); };
  robe(); const gr = g.createLinearGradient(-14, 0, 14, 0); gr.addColorStop(0, '#f6f3ec'); gr.addColorStop(0.45, MARBLE); gr.addColorStop(1, MARBLED); g.fillStyle = gr; g.fill();
  g.save(); robe(); g.clip();
  // folds of the veil and robe
  g.strokeStyle = 'rgba(120,110,95,0.45)'; g.lineWidth = 1.1;
  for (const [a, b, c, d] of [[-6, -42, -10, -20], [4, -44, 8, -24], [-8, -18, -10, 0], [-2, -16, -3, 0], [5, -18, 7, 0], [10, -20, 12, 0]]) { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2 + 2, (b + d) / 2, c, d); g.stroke(); }
  // the face in the veil's shadow, bowed down and to the left
  g.beginPath(); g.ellipse(-2.5, -41, 3.8, 4.8, 0.35, 0, TAU); g.fillStyle = '#b3ab9b'; g.fill(); g.beginPath(); g.ellipse(-3.2, -40.2, 2.4, 3.4, 0.35, 0, TAU); g.fillStyle = '#d6cfc1'; g.fill();
  g.strokeStyle = 'rgba(80,72,60,0.6)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-4.6, -42); g.lineTo(-2.6, -41.6); g.stroke();
  g.restore();
  robe(); g.lineWidth = 2.2 / s; g.strokeStyle = OL; g.stroke();
  // the veil's edge round the face
  g.beginPath(); g.moveTo(-6.5, -45); g.quadraticCurveTo(-1, -48, 2, -43); g.quadraticCurveTo(2, -38, -2, -36); g.lineWidth = 1.3 / s; g.strokeStyle = 'rgba(29,26,34,0.7)'; g.stroke();
  // the folded arms and the hands pressed together in prayer, held to the chest
  g.beginPath(); g.moveTo(-8, -26); g.quadraticCurveTo(-4, -22, -1, -27); g.moveTo(8, -26); g.quadraticCurveTo(4, -22, 1, -27); g.lineWidth = 1.4 / s; g.strokeStyle = 'rgba(29,26,34,0.75)'; g.stroke();
  g.beginPath(); g.moveTo(-1.8, -26); g.quadraticCurveTo(-2.2, -32, 0, -36); g.quadraticCurveTo(2.2, -32, 1.8, -26); g.closePath(); g.fillStyle = '#f6f3ec'; g.fill(); g.lineWidth = 1.3 / s; g.strokeStyle = OL; g.stroke();
  g.restore();
  // a soft light about her
  const gl = g.createRadialGradient(sx, sy - 40 * s, 2, sx, sy - 40 * s, 30 * s); gl.addColorStop(0, `rgba(255,245,210,${(0.25 + Math.sin(t * 1.5) * 0.06).toFixed(2)})`); gl.addColorStop(1, 'rgba(255,245,210,0)'); g.fillStyle = gl; g.beginPath(); g.arc(sx, sy - 40 * s, 30 * s, 0, TAU); g.fill();
}
function candle(g, x, y, t, h = 7) {
  const [a, b] = ISO(x, y, 0);
  g.fillStyle = '#f3ead6'; g.fillRect(a - 1.6, b - h, 3.2, h); g.lineWidth = 1; g.strokeStyle = OL; g.strokeRect(a - 1.6, b - h, 3.2, h);
  const f = 1 + Math.sin(t * 10 + x * 3) * 0.2; g.beginPath(); g.ellipse(a, b - h - 3 * f, 1.5, 3 * f, 0, 0, TAU); g.fillStyle = '#ffd36b'; g.fill();
  const gl = g.createRadialGradient(a, b - h - 3, 0, a, b - h - 3, 7); gl.addColorStop(0, 'rgba(255,220,140,0.45)'); gl.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = gl; g.beginPath(); g.arc(a, b - h - 3, 7, 0, TAU); g.fill();
}
function flowers(g, x, y) { const [a, b] = ISO(x, y, 0); [[0, 0, '#c9a3e8'], [6, 2, '#f2ead8'], [-5, 3, '#ffb8d0'], [2, 5, '#c9a3e8']].forEach(([dx, dy, c]) => { line(g, [a + dx, b + dy], [a + dx, b + dy - 6], '#5c9c38', 1.4); g.beginPath(); g.arc(a + dx, b + dy - 7, 2.3, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = 1.1; g.strokeStyle = OL; g.stroke(); }); }
WD.temple = (g, t) => {
  // the arch of two living trees bending together behind her
  const A = ISO(-26, -10, 0), Bp = ISO(-10, -26, 0), top = ISO(-18, -18, 78);
  for (const [p, d] of [[A, -1], [Bp, 1]]) {
    for (const [lw, col] of [[11, OL], [6.4, BARK]]) { g.beginPath(); g.moveTo(p[0], p[1]); g.bezierCurveTo(p[0] + d * 2, p[1] - 40, top[0] + d * 26, top[1] + 10, top[0], top[1]); g.lineWidth = lw; g.strokeStyle = col; g.lineCap = 'round'; g.stroke(); }
  }
  for (const [dx, dy, s, sd] of [[-24, 8, 14, 1], [24, 6, 14, 2], [0, -6, 16, 3], [-34, 30, 10, 4], [34, 28, 10, 5]]) clump(g, top[0] + dx, top[1] + dy, s, 700 + sd, sd === 3 ? LEAFL : LEAF, sd === 3 ? '#a6dc78' : LEAFL, t);
  for (const [dx, dy] of [[-18, 4], [16, 2], [2, -8]]) for (let k = 0; k < 3; k++) sdot(g, top[0] + dx + k * 4 - 4, top[1] + dy + (k % 2) * 3, 1.7, '#c9a3e8', 0.8);
  // the plinth: two round steps of pale stone, mossy
  cylinder(g, -2, -2, 0, 5, 24, '#b8b2a4', 'stone'); cylinder(g, -2, -2, 5, 11, 17, '#cbc5b6', 'stone');
  const [sx, sy] = ISO(-2, -2, 11); veiledFigure(g, sx, sy + 2, 1.15, t);
  // offerings at her feet
  for (const [x, y] of [[-30, 14], [-20, 26], [26, -6], [18, 22]]) candle(g, x, y, t, 6 + (x & 3));
  flowers(g, -34, 30); flowers(g, 32, 14); flowers(g, 8, 34);
  { const [a, b] = ISO(-4, 32, 0); g.beginPath(); g.ellipse(a, b - 2, 6, 3, 0, 0, TAU); g.fillStyle = '#a8794a'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); for (const dx of [-2, 2]) sdot(g, a + dx, b - 3.5, 1.6, APPLE, 0.8); }
  fern(g, 34, -6, 0.8); fern(g, -36, 4, 0.8);
};
// draw a Woodling building at the current origin over a mossy forest pad; rise < 1 while it is going up
function drawOnMap(g, key, idx, t, rise = 1) {
  const h = 40;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  face(g, [ISO(-h, -h), ISO(h, -h), ISO(h, h), ISO(-h, h)], 'rgba(150,170,100,0.5)', () => { const r = rnd(key.length * 13); for (let k = 0; k < 10; k++) { const [lx, ly] = ISO((r() - 0.5) * 76, (r() - 0.5) * 76); g.fillStyle = ['#b5612e', '#d9a03a', '#8a9a3a', '#7d9a52'][k % 4]; g.beginPath(); g.ellipse(lx, ly, 2.4, 1.2, r() * 3, 0, TAU); g.fill(); } }, 2);
  if (rise < 1) { g.beginPath(); g.rect(-200, 30 - 200 * rise, 400, 400); g.clip(); }
  (WD[key] || WD.farm)(g, t, (idx || 0) + 1);
  g.restore();
}

root.WoodBuild = { drawSettlement, drawOnMap, treeHouse, clump, staveChurch, has: k => !!WD[k] };
})(typeof globalThis !== 'undefined' ? globalThis : this);
