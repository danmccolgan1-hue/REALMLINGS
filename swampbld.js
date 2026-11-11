/* Realmlings — Swampling buildings and settlements: primitive mud-and-clay huts with thatched cones,
   wild mushrooms, bones, totems and smoke. Drawn with the same isometric kit as the Realmling buildings. */
(function (root) {
'use strict';
const K = root.RealmBuild.KIT;
const { ISO, OL, path, face, line, prism, cylinder, cone, smoke, campfire, tree } = K;
const TAU = Math.PI * 2;
const MUD = '#8b6a45', CLAY = '#a8794a', MUDD = '#6e5134', THATCH = '#9a8048', THATCHD = '#7d6636', BONE = '#efe6cf', DARK = '#2a2420';

function dot(g, x, y, r, col, lw = 1.4) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = col; g.fill(); g.lineWidth = lw; g.strokeStyle = OL; g.stroke(); }
// a dark low doorway on the front of a round hut
function hole(g, cx, cy, r, h = 16, w = 7) {
  const [sx, sy] = ISO(cx, cy, 0), y = sy + r * Math.SQRT2 / 2 * 0.95;
  g.beginPath(); g.moveTo(sx - w, y); g.lineTo(sx - w, y - h + w); g.arc(sx, y - h + w, w, Math.PI, 0); g.lineTo(sx + w, y); g.closePath();
  g.fillStyle = DARK; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
}
// a round mud hut with a shaggy thatched cone and (sometimes) a wisp of smoke
function hut(g, x, y, r, h, t, o = {}) {
  cylinder(g, x, y, 0, h, r, o.wall || MUD, null);
  // daub streaks on the wall
  const [sx, sb] = ISO(x, y, 0), rx = r * Math.SQRT2;
  g.save(); g.strokeStyle = 'rgba(60,40,20,0.35)'; g.lineWidth = 1.4;
  for (const u of [-0.6, -0.15, 0.35, 0.7]) { g.beginPath(); g.moveTo(sx + u * rx, sb + rx * 0.4 * Math.sqrt(1 - u * u) - 3); g.lineTo(sx + u * rx + 2, sb - h * 0.7); g.stroke(); }
  g.restore();
  hole(g, x, y, r, Math.min(18, h * 0.8), Math.max(5, r * 0.4));
  const [ax, ay] = cone(g, x, y, h - 2, r + 4, o.roof || h * 0.9, o.thatch || THATCH, false);
  // ragged thatch fringe
  g.save(); g.strokeStyle = THATCHD; g.lineWidth = 1.6;
  const [ex, ey] = ISO(x, y, h - 2), erx = (r + 4) * Math.SQRT2;
  for (let u = -0.9; u <= 0.9; u += 0.18) { const yy = ey + erx / 2 * Math.sqrt(1 - u * u); g.beginPath(); g.moveTo(ex + u * erx, yy); g.lineTo(ex + u * erx * 1.04, yy + 4); g.stroke(); }
  g.restore();
  if (o.smoke) smoke(g, ax, ay - 2, t, 3, 0.7);
  if (o.horns) { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(ax + s * 2, ay + 4); g.quadraticCurveTo(ax + s * 12, ay - 4, ax + s * 10, ay - 14); g.lineWidth = 4.5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.6; g.strokeStyle = BONE; g.stroke(); } }
  return [ax, ay];
}
// a wild mushroom: stem and a spotted cap
function shroom(g, x, y, s = 1, cap = '#d8443a') {
  const [sx, sy] = ISO(x, y, 0);
  g.beginPath(); g.rect(sx - 2.2 * s, sy - 9 * s, 4.4 * s, 9 * s); g.fillStyle = '#f2ead8'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.ellipse(sx, sy - 9 * s, 7 * s, 5 * s, 0, Math.PI, 0); g.closePath(); g.fillStyle = cap; g.fill(); g.lineWidth = 1.8; g.stroke();
  g.fillStyle = '#fff'; for (const [dx, dy] of [[-3, -11], [2, -12], [4, -10]]) { g.beginPath(); g.arc(sx + dx * s, sy + dy * s, 0.9 * s, 0, TAU); g.fill(); }
}
// a muddy bed of soil
function bed(g, x0, y0, w, d, col = '#5e4630') { face(g, [ISO(x0, y0, 0), ISO(x0 + w, y0, 0), ISO(x0 + w, y0 + d, 0), ISO(x0, y0 + d, 0)], col, null, 2); }
function stick(g, a, b, col = '#7b5029', w = 3) { line(g, a, b, OL, w + 2.4); line(g, a, b, col, w); }
// a spiked stake fence along a line
function spikes(g, a, b, n, h = 18) {
  for (let k = 0; k <= n; k++) { const f = k / n, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, [sx, sy] = ISO(x, y, 0); stick(g, [sx, sy], [sx, sy - h], '#8a6038', 3.2); path(g, [[sx - 2.5, sy - h], [sx, sy - h - 6], [sx + 2.5, sy - h]]); g.fillStyle = '#c9a46b'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); }
}
// a skull on a pole
function skullPole(g, x, y, h = 30) {
  const [sx, sy] = ISO(x, y, 0); stick(g, [sx, sy], [sx, sy - h], '#7b5029', 2.6);
  g.beginPath(); g.arc(sx, sy - h - 4, 5.5, 0, TAU); g.fillStyle = BONE; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
  g.fillStyle = OL; g.beginPath(); g.arc(sx - 2, sy - h - 4.5, 1.3, 0, TAU); g.arc(sx + 2, sy - h - 4.5, 1.3, 0, TAU); g.fill();
}
// a carved swamp totem, glaring red eyes
function totem(g, x, y, h, t) {
  const [sx, sy] = ISO(x, y, 0);
  g.beginPath(); g.rect(sx - 6, sy - h, 12, h); g.fillStyle = '#7a5532'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  for (let k = 1; k < 3; k++) { line(g, [sx - 6, sy - h * k / 3], [sx + 6, sy - h * k / 3], OL, 1.6); }
  const ey = sy - h + 7, gl = 0.6 + Math.sin(t * 4) * 0.25;
  g.fillStyle = `rgba(255,60,40,${gl.toFixed(2)})`; g.beginPath(); g.arc(sx - 3, ey, 2, 0, TAU); g.arc(sx + 3, ey, 2, 0, TAU); g.fill();
  path(g, [[sx - 9, sy - h + 2], [sx, sy - h - 8], [sx + 9, sy - h + 2]]); g.fillStyle = '#5e4128'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
}
function rocks(g, x, y, s = 1, col = '#8a8f84') {
  const [sx, sy] = ISO(x, y, 0);
  g.beginPath(); g.moveTo(sx - 14 * s, sy); g.quadraticCurveTo(sx - 12 * s, sy - 12 * s, sx - 2 * s, sy - 14 * s); g.quadraticCurveTo(sx + 10 * s, sy - 15 * s, sx + 14 * s, sy - 2 * s); g.quadraticCurveTo(sx, sy + 5 * s, sx - 14 * s, sy); g.closePath();
  g.fillStyle = col; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
}
function logs(g, x, y, n = 3) { for (let k = 0; k < n; k++) { const a = ISO(x, y + k * 6, k % 2 ? 6 : 0), b = ISO(x + 24, y + k * 6, k % 2 ? 6 : 0); stick(g, a, b, '#8a5a34', 6); g.beginPath(); g.arc(b[0], b[1], 3.6, 0, TAU); g.fillStyle = '#d9b07a'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); } }
function sack(g, x, y, z = 0, col = '#b59a6a') { const [sx, sy] = ISO(x, y, z); g.beginPath(); g.moveTo(sx - 7, sy); g.quadraticCurveTo(sx - 9, sy - 12, sx - 3, sy - 14); g.lineTo(sx + 3, sy - 14); g.quadraticCurveTo(sx + 9, sy - 12, sx + 7, sy); g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); line(g, [sx - 3, sy - 13], [sx + 3, sy - 13], OL, 1.6); }
function flame(g, sx, sy, s, t, k = 0) {
  const fl = 1 + Math.sin(t * 11 + k) * 0.14 + Math.sin(t * 6 + k) * 0.08;
  const gl = g.createRadialGradient(sx, sy - 10 * s, 0, sx, sy - 10 * s, 40 * s); gl.addColorStop(0, 'rgba(255,160,60,0.5)'); gl.addColorStop(1, 'rgba(255,160,60,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(sx, sy - 10 * s, 40 * s, 0, TAU); g.fill();
  path(g, [[sx - 10 * s, sy], [sx - 5 * s, sy - 20 * s * fl], [sx, sy - 12 * s], [sx + 4 * s, sy - 28 * s * fl], [sx + 10 * s, sy]]); g.fillStyle = '#ff7a2c'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  path(g, [[sx - 5 * s, sy], [sx, sy - 14 * s * fl], [sx + 5 * s, sy]]); g.fillStyle = '#ffe27a'; g.fill();
}

// ---------- the buildings (each drawn on a plot about 80 × 80) ----------
const D = {};
D.farm = (g, t) => {
  bed(g, -36, -6, 34, 40); bed(g, 4, 8, 32, 28);
  for (const [x, y, s, c] of [[-30, 2, 1, '#d8443a'], [-20, 12, 0.8, '#e0a43a'], [-28, 24, 0.9, '#d8443a'], [-14, 28, 0.7, '#b55ad8'], [-10, 4, 0.8, '#e0a43a'], [10, 16, 1, '#d8443a'], [22, 14, 0.7, '#b55ad8'], [16, 28, 0.9, '#e0a43a'], [28, 26, 0.8, '#d8443a']]) shroom(g, x, y, s, c);
  hut(g, 14, -22, 14, 18, t, { smoke: true });
  shroom(g, -34, -24, 1.6, '#d8443a'); shroom(g, -24, -30, 1.2, '#e0a43a');
};
D.lumber = (g, t) => {
  // a lean-to of poles over a chopping stump, logs piled beside
  const a = ISO(-30, -28, 0), b = ISO(-30, -28, 26), c = ISO(6, -28, 26), d = ISO(6, -28, 0);
  stick(g, a, b); stick(g, d, c);
  path(g, [ISO(-34, -32, 30), ISO(10, -32, 30), ISO(10, -4, 12), ISO(-34, -4, 12)]); g.fillStyle = THATCH; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  logs(g, -26, 4, 3);
  const [sx, sy] = ISO(18, 14, 0); g.beginPath(); g.ellipse(sx, sy - 6, 10, 5, 0, 0, TAU); g.fillStyle = '#d9b07a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.rect(sx - 10, sy - 6, 20, 8); g.fillStyle = '#8a5a34'; g.fill(); g.stroke();
  stick(g, [sx + 2, sy - 8], [sx + 10, sy - 26], '#7b5029', 2.6); path(g, [[sx + 8, sy - 30], [sx + 18, sy - 27], [sx + 12, sy - 20]]); g.fillStyle = '#c9d2de'; g.fill(); g.lineWidth = 1.6; g.stroke();
  tree(g, 26, -26, 0.8);
};
D.goldmine = (g, t) => {
  // a mine hole dug into a mud mound, propped with poles; a cart of nuggets
  const [mx, my] = ISO(-6, -8, 0);
  g.beginPath(); g.moveTo(mx - 44, my + 10); g.quadraticCurveTo(mx - 30, my - 40, mx + 2, my - 44); g.quadraticCurveTo(mx + 36, my - 40, mx + 44, my + 10); g.closePath(); g.fillStyle = MUDD; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.moveTo(mx - 12, my + 8); g.lineTo(mx - 12, my - 12); g.quadraticCurveTo(mx, my - 22, mx + 12, my - 12); g.lineTo(mx + 12, my + 8); g.closePath(); g.fillStyle = DARK; g.fill(); g.stroke();
  stick(g, [mx - 14, my + 8], [mx - 14, my - 14]); stick(g, [mx + 14, my + 8], [mx + 14, my - 14]); stick(g, [mx - 17, my - 15], [mx + 17, my - 15]);
  const [cx, cy] = ISO(22, 20, 0); g.beginPath(); g.rect(cx - 12, cy - 12, 24, 10); g.fillStyle = '#7b5029'; g.fill(); g.lineWidth = 2; g.stroke();
  for (const [dx, dy] of [[-6, -14], [0, -16], [6, -14], [-2, -12]]) dot(g, cx + dx, cy + dy, 3, '#f4c44f', 1.2);
  dot(g, cx - 8, cy, 3.5, '#5e4128'); dot(g, cx + 8, cy, 3.5, '#5e4128');
};
D.barracks = (g, t) => {
  // a long war-hut with horns on the ridge, a practice stump and a skull pole
  prism(g, -34, -32, 0, 44, 30, 16, MUD, null);
  path(g, [ISO(-38, -36, 16), ISO(14, -36, 16), ISO(14, -17, 32), ISO(-38, -17, 32)]); g.fillStyle = THATCH; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  path(g, [ISO(-38, -17, 32), ISO(14, -17, 32), ISO(14, 2, 16), ISO(-38, 2, 16)]); g.fillStyle = THATCHD; g.fill(); g.stroke();
  const [dx, dy] = ISO(-12, -2, 0); g.beginPath(); g.rect(dx - 7, dy - 14, 14, 14); g.fillStyle = DARK; g.fill(); g.lineWidth = 2; g.stroke();
  for (const x of [-34, -10, 12]) { const [hx, hy] = ISO(x, -17, 33); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx + s * 9, hy - 4, hx + s * 8, hy - 13); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.2; g.strokeStyle = BONE; g.stroke(); } }
  skullPole(g, 26, -6, 30); skullPole(g, 26, 22, 24);
  spikes(g, [-30, 30], [10, 30], 5, 14);
};
D.stable = (g, t) => {
  // Ogre Cave: a craggy rock mound with a gaping mouth, bones scattered at the entrance
  const [mx, my] = ISO(-4, -6, 0);
  g.beginPath(); g.moveTo(mx - 50, my + 14); g.lineTo(mx - 40, my - 24); g.lineTo(mx - 18, my - 50); g.lineTo(mx + 8, my - 44); g.lineTo(mx + 30, my - 56); g.lineTo(mx + 48, my - 20); g.lineTo(mx + 52, my + 14); g.closePath(); g.fillStyle = '#7e8279'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1.6; for (const [a, b, c, d] of [[-30, -20, -12, -36], [16, -36, 34, -18], [-36, 0, -20, -8]]) { g.beginPath(); g.moveTo(mx + a, my + b); g.lineTo(mx + c, my + d); g.stroke(); }
  g.beginPath(); g.moveTo(mx - 18, my + 12); g.quadraticCurveTo(mx - 20, my - 26, mx + 2, my - 30); g.quadraticCurveTo(mx + 22, my - 26, mx + 20, my + 12); g.closePath(); g.fillStyle = DARK; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  const gl = 0.5 + Math.sin(t * 2) * 0.3; g.fillStyle = `rgba(255,60,40,${gl.toFixed(2)})`; g.beginPath(); g.arc(mx - 4, my - 10, 2.2, 0, TAU); g.arc(mx + 5, my - 10, 2.2, 0, TAU); g.fill();
  for (const [bx, by, a] of [[-26, 28, 0.3], [10, 30, -0.4], [24, 18, 0.8]]) { const [sx, sy] = ISO(bx, by, 0); g.save(); g.translate(sx, sy); g.rotate(a); g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.lineWidth = 5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.8; g.strokeStyle = BONE; g.stroke(); for (const e of [-8, 8]) dot(g, e, 0, 2.6, BONE, 1.2); g.restore(); }
  skullPole(g, 30, -10, 26);
};
D.market = (g, t) => {
  // Thug Den: a squat dark hut with a skull sign, crates of loot, a lurking fire
  hut(g, -10, -14, 22, 20, t, { wall: '#6e5134', thatch: '#6f5a32', horns: true });
  const [sx, sy] = ISO(14, 6, 0); stick(g, [sx, sy], [sx, sy - 28], '#7b5029', 2.6); g.beginPath(); g.rect(sx - 2, sy - 30, 22, 13); g.fillStyle = '#5e4128'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  dot(g, sx + 9, sy - 24, 4, BONE, 1.4); g.fillStyle = OL; g.beginPath(); g.arc(sx + 7.5, sy - 24.5, 1, 0, TAU); g.arc(sx + 10.5, sy - 24.5, 1, 0, TAU); g.fill();
  prism(g, 18, 20, 0, 12, 12, 10, '#7b5029', 'wood'); prism(g, 24, 8, 0, 10, 10, 8, '#8a5f3a', 'wood');
  sack(g, -30, 24); sack(g, -22, 30, 0, '#9a7f52');
  const [fx, fy] = ISO(2, 30, 0); flame(g, fx, fy, 0.45, t);
};
D.bank = (g, t) => {
  // Supply Cache: a covered storage pit heaped with sacks, logs and baskets under a hide awning
  const [px, py] = ISO(-8, -8, 0); g.beginPath(); g.ellipse(px, py, 34, 17, 0, 0, TAU); g.fillStyle = MUDD; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  for (const [x, y, c] of [[-20, -16, '#b59a6a'], [-8, -22, '#c9a46b'], [4, -14, '#b59a6a'], [-14, -4, '#9a7f52'], [0, -2, '#c9a46b']]) sack(g, x, y, 2, c);
  stick(g, ISO(-34, -30, 0), ISO(-34, -30, 30)); stick(g, ISO(16, -30, 0), ISO(16, -30, 30)); stick(g, ISO(-34, 12, 0), ISO(-34, 12, 24)); stick(g, ISO(16, 12, 0), ISO(16, 12, 24));
  path(g, [ISO(-38, -34, 32), ISO(20, -34, 32), ISO(20, 16, 24), ISO(-38, 16, 24)]); g.globalAlpha = 0.9; g.fillStyle = '#a07a54'; g.fill(); g.globalAlpha = 1; g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  logs(g, 20, 18, 2);
  const [cx, cy] = ISO(-26, 26, 0); g.beginPath(); g.ellipse(cx, cy - 6, 9, 4, 0, 0, TAU); g.fillStyle = '#c9a46b'; g.fill(); g.lineWidth = 1.8; g.stroke(); g.beginPath(); g.rect(cx - 9, cy - 6, 18, 8); g.fill(); g.stroke(); for (const d of [-4, 0, 4]) dot(g, cx + d, cy - 9, 2.6, '#f4c44f', 1);
};
D.forge = (g, t, lv = 1) => {
  // a clay kiln-forge with a glowing mouth; bigger kilns and more chimneys at higher levels
  const r = 16 + lv * 3, h = 20 + lv * 6;
  cylinder(g, -8, -10, 0, h, r, CLAY, null);
  const [sx, sb] = ISO(-8, -10, 0), ry = r * Math.SQRT2 / 2;
  g.beginPath(); g.ellipse(sx, sb + ry * 0.9 - 8, 8, 7, 0, Math.PI, 0); g.lineTo(sx + 8, sb + ry * 0.9); g.lineTo(sx - 8, sb + ry * 0.9); g.closePath(); const gl = g.createRadialGradient(sx, sb + ry * 0.9 - 6, 1, sx, sb + ry * 0.9 - 6, 12); gl.addColorStop(0, '#ffe680'); gl.addColorStop(1, '#ff6a2c'); g.fillStyle = gl; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
  for (let k = 0; k < lv; k++) { const cx = -14 + k * 10, cy = -18; cylinder(g, cx, cy, h - 4, h + 14 + k * 4, 4, MUDD, null); const [ax, ay] = ISO(cx, cy, h + 14 + k * 4); smoke(g, ax, ay - 2, t + k, 3, 0.6); }
  const [ax, ay] = ISO(20, 16, 0); g.beginPath(); g.rect(ax - 10, ay - 10, 20, 8); g.fillStyle = '#5b6270'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.rect(ax - 5, ay - 2, 10, 6); g.fillStyle = '#7b5029'; g.fill(); g.stroke();
  for (let k = 0; k < 4; k++) { const f = (t * 1.6 + k / 4) % 1; g.fillStyle = `rgba(255,${180 - f * 100 | 0},60,${1 - f})`; g.beginPath(); g.arc(ax + Math.sin(k * 3 + t) * 6, ay - 12 - f * 18, 1.6, 0, TAU); g.fill(); }
  if (lv >= 2) skullPole(g, -34, 18, 24);
  if (lv >= 3) { totem(g, 30, -24, 34, t); }
};
D.magetower = (g, t, lv = 1) => {
  // Warlock Tower / Spire / Grand Spire: a tapering clay spire, bone-ringed, crowned with a red fire
  const h = [0, 46, 62, 80][lv], r0 = 15 + lv * 2;
  cylinder(g, -6, -6, 0, h * 0.5, r0, MUD, null);
  cylinder(g, -6, -6, h * 0.5, h * 0.82, r0 * 0.72, CLAY, null);
  cylinder(g, -6, -6, h * 0.82, h, r0 * 0.5, MUD, null);
  hole(g, -6, -6, r0, 15, 6);
  const [ax, ay] = cone(g, -6, -6, h, r0 * 0.6, 14 + lv * 4, '#3a2a30', false);
  for (const zz of [h * 0.5, h * 0.82]) { const [sx, sy] = ISO(-6, -6, zz); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3, x = sx + Math.cos(a) * r0 * 0.9, y = sy + Math.sin(a) * r0 * 0.45; if (Math.sin(a) > -0.2) dot(g, x, y + 2, 2.4, BONE, 1.2); } }
  flame(g, ax, ay + 2, 0.4 + lv * 0.08, t);
  const gl = 0.5 + Math.sin(t * 3) * 0.3; g.fillStyle = `rgba(255,70,50,${gl.toFixed(2)})`; const [wx, wy] = ISO(-6, -6, h * 0.66); g.beginPath(); g.ellipse(wx + 2, wy + r0 * 0.3, 2.6, 4, 0, 0, TAU); g.fill();
  if (lv >= 2) { totem(g, 24, -20, 30, t); }
  if (lv >= 3) { totem(g, -32, 22, 30, t + 1); for (let k = 0; k < 5; k++) { const q = t * 1.3 + k * TAU / 5; dot(g, ax + Math.cos(q) * 22, ay + 14 + Math.sin(q) * 8, 2, '#ff7a2c', 1); } }
};
D.temple = (g, t) => {
  // Hot Springs: a steaming pool ringed with rocks, a little bathing hut
  const [px, py] = ISO(-2, 4, 0);
  for (let k = 0; k < 10; k++) { const a = k * TAU / 10; rocks(g, -2 + Math.cos(a) * 30, 4 + Math.sin(a) * 30, 0.55, k % 2 ? '#8a8f84' : '#9a9e92'); }
  g.beginPath(); g.ellipse(px, py, 38, 19, 0, 0, TAU); const gw = g.createRadialGradient(px, py, 2, px, py, 38); gw.addColorStop(0, '#9be3d0'); gw.addColorStop(1, '#3fa08e'); g.fillStyle = gw; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
  for (let k = 0; k < 3; k++) { const f = (t * 0.6 + k / 3) % 1; g.beginPath(); g.ellipse(px + (k - 1) * 12, py + 2, 6 + f * 10, 3 + f * 5, 0, 0, TAU); g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - f)})`; g.lineWidth = 1.4; g.stroke(); }
  for (let k = 0; k < 6; k++) { const f = (t * 0.4 + k / 6) % 1, x = px - 24 + k * 10 + Math.sin(f * 6 + k) * 4; g.globalAlpha = 0.5 * (1 - f); g.fillStyle = '#f4f6f8'; g.beginPath(); g.arc(x, py - 6 - f * 46, 5 + f * 9, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  hut(g, 26, -28, 10, 14, t);
};
D.pyre = (g, t, lv = 1) => {
  // Sacred Pyre / Grand Pyre: a stacked square of logs burning high, ringed with stones (and totems when grand)
  const n = lv >= 2 ? 6 : 4, s = lv >= 2 ? 1.3 : 1;
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; rocks(g, Math.cos(a) * 28 * s, Math.sin(a) * 28 * s, 0.4 * s); }
  for (let k = 0; k < n; k++) { const z = k * 5, w = (22 - k * 2) * s; if (k % 2) { stick(g, ISO(-w / 2, -w / 2, z), ISO(-w / 2, w / 2, z), '#8a5a34', 5); stick(g, ISO(w / 2, -w / 2, z), ISO(w / 2, w / 2, z), '#8a5a34', 5); } else { stick(g, ISO(-w / 2, -w / 2, z), ISO(w / 2, -w / 2, z), '#7a4e2c', 5); stick(g, ISO(-w / 2, w / 2, z), ISO(w / 2, w / 2, z), '#7a4e2c', 5); } }
  const [fx, fy] = ISO(0, 0, n * 5); flame(g, fx, fy + 4, 0.9 * s, t); flame(g, fx - 6, fy + 6, 0.5 * s, t, 2); flame(g, fx + 7, fy + 6, 0.55 * s, t, 4);
  smoke(g, fx, fy - 30 * s, t, 4, 1.1 * s);
  if (lv >= 2) { totem(g, -34, -34, 36, t); totem(g, 34, -34, 36, t + 1); }
};

// ---------- settlements: outpost, fort and capital ----------
function ground(g, R) {
  g.beginPath(); g.ellipse(0, 0, R * 1.42, R * 0.71, 0, 0, TAU); g.fillStyle = 'rgba(110,84,52,0.55)'; g.fill();
  g.strokeStyle = 'rgba(70,52,32,0.4)'; g.lineWidth = 2; g.stroke();
  // puddles
  for (const [x, y, r] of [[-0.45, 0.2, 0.12], [0.5, -0.1, 0.09], [0.1, 0.35, 0.07]]) { g.beginPath(); g.ellipse(x * R * 1.4, y * R * 0.7, r * R * 1.4, r * R * 0.6, 0, 0, TAU); g.fillStyle = 'rgba(70,110,96,0.55)'; g.fill(); }
}
const SETTLE = [
  // outpost: two huts, a fire and a skull pole
  [{ x: -26, y: -20, r: 15, h: 18, smoke: true }, { x: 18, y: -26, r: 12, h: 15 }],
  // fort: a ring of huts behind spiked stakes, a watch platform
  [{ x: -40, y: -36, r: 16, h: 20, smoke: true }, { x: 10, y: -46, r: 14, h: 17 }, { x: 40, y: -6, r: 15, h: 19 }, { x: -46, y: 12, r: 13, h: 16 }],
  // capital: a great chieftain hut with horns, many huts, totems and a bonfire
  [{ x: -6, y: -40, r: 30, h: 30, smoke: true, horns: true, big: true }, { x: -64, y: -30, r: 16, h: 19 }, { x: 46, y: -54, r: 15, h: 18, smoke: true }, { x: 64, y: -6, r: 17, h: 20 }, { x: -64, y: 22, r: 14, h: 17 }, { x: 38, y: 34, r: 13, h: 16 }]
];
function drawSettlement(g, stage, t, opts = {}) {
  const R = [70, 100, 130][stage] || 70;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.scale(0.8, 0.8);
  ground(g, R);
  const items = [];
  for (const h of SETTLE[stage] || SETTLE[0]) items.push({ d: h.x + h.y, f: () => hut(g, h.x, h.y, h.r, h.h, t, { smoke: h.smoke, horns: h.horns, wall: h.big ? CLAY : MUD, roof: h.big ? 34 : undefined }) });
  items.push({ d: 30, f: () => { const [fx, fy] = ISO(8, 22, 0); campfire(g, 8, 22, t); void fx; void fy; } });
  items.push({ d: -30 + 60, f: () => skullPole(g, -30, 30, 28) });
  if (stage >= 1) {
    items.push({ d: -200, f: () => spikes(g, [-R * 0.8, -R * 0.8], [R * 0.6, -R * 0.8], 10, 16) });
    items.push({ d: 200, f: () => spikes(g, [-R * 0.8, R * 0.62], [R * 0.2, R * 0.62], 7, 16) });
    items.push({ d: 10, f: () => { const [sx, sy] = ISO(58, 40, 0); for (const dx of [-8, 8]) stick(g, [sx + dx, sy], [sx + dx, sy - 44], '#7a5532', 3); g.beginPath(); g.rect(sx - 13, sy - 48, 26, 8); g.fillStyle = '#8a6038'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); path(g, [[sx - 14, sy - 48], [sx, sy - 62], [sx + 14, sy - 48]]); g.fillStyle = THATCH; g.fill(); g.stroke(); } });
  }
  if (stage >= 2) { items.push({ d: -60, f: () => totem(g, -40, -80, 50, t) }); items.push({ d: 60, f: () => totem(g, 60, -80, 46, t + 1) }); for (const [x, y] of [[-84, -6], [84, 26], [-20, 70]]) items.push({ d: x + y, f: () => shroom(g, x, y, 1.6, '#d8443a') }); }
  items.sort((a, b) => a.d - b.d).forEach(i => i.f());
  g.restore();
}
// a building, drawn on the map at the current origin over a trodden mud pad; rise < 1 while it is going up
function drawOnMap(g, key, idx, t, rise = 1) {
  const h = 40;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  face(g, [ISO(-h, -h), ISO(h, -h), ISO(h, h), ISO(-h, h)], 'rgba(110,84,52,0.5)', null, 2);
  if (rise < 1) { g.beginPath(); g.rect(-200, 30 - 200 * rise, 400, 400); g.clip(); }
  const f = D[key] || D.farm; f(g, t, (idx || 0) + 1);
  g.restore();
}
root.SwampBuild = { drawSettlement, drawOnMap, hut, shroom, has: k => !!D[k] };
})(typeof globalThis !== 'undefined' ? globalThis : this);
