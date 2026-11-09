
// ================= icons for technologies and equipment =================
// small hand-drawn pictures, cached as images; equipment uses the same weapon and shield art as the unit rig
const ICON_SIZE = 64, iconCache = {};
function ticoCanvas(key, draw) {
  if (iconCache[key]) return iconCache[key];
  const c = document.createElement('canvas'); c.width = c.height = ICON_SIZE; const g = c.getContext('2d');
  g.lineJoin = 'round'; g.lineCap = 'round'; draw(g);
  return iconCache[key] = c.toDataURL();
}
const ICO = {
  disc(g, col) { g.beginPath(); g.arc(32, 32, 29, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); },
  poly(g, pts, fill, lw = 3) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } g.lineWidth = lw; g.strokeStyle = OL; g.stroke(); },
  line(g, a, b, col, w) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineWidth = w + 4; g.strokeStyle = OL; g.stroke(); g.lineWidth = w; g.strokeStyle = col; g.stroke(); },
  up(g) { ICO.poly(g, [[46, 30], [56, 18], [62, 30], [58, 30], [58, 40], [50, 40], [50, 30]], '#58c25a', 2.4); },
  roman(g, n, x = 52, y = 54) { g.font = '900 15px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = OL; g.strokeText(n, x, y); g.fillStyle = '#fff'; g.fillText(n, x, y); }
};
// how long each held item is, so it can be fitted into an icon diagonally
const ITEM_SPAN = { stave: [-78, 32], grandstave: [-100, 32], mythicstave: [-110, 32], wand: [-37, 6], crypticwand: [-44, 6], enigmaticwand: [-46, 6], spear: [-124, 26], pike: [-150, 30], polearm: [-140, 28], halberd: [-150, 28], shortsword: [-43, 10], sword: [-60, 12], longsword: [-73, 14], greatsword: [-96, 20], club: [-50, 14], mace: [-41, 14], morningstar: [-56, 14], warhammer: [-98, 24] };
function itemIcon(g, name) {
  const [a, b] = ITEM_SPAN[name] || [-40, 10], len = b - a, k = Math.min(1.6, 74 / len);
  g.save(); g.translate(32, 32); g.rotate(Math.PI / 4); g.scale(k, k); g.translate(0, -(a + b) / 2);
  RealmIso.drawItem(g, name, 0, 0, 0, 0.4, false); g.restore();
}
function shieldIcon(g, name) { g.save(); g.translate(32, 30); const k = name === 'tower' ? 0.95 : name === 'kite' ? 1.05 : 1.45; g.scale(k, k); RealmIso.drawItem(g, name, 0, 0, 0, 0.4, false); g.restore(); }
function armorIcon(g, type, lv) {
  const col = type === 'leather' ? '#9a6a40' : type === 'chain' ? '#aab2bf' : '#d4dbe5';
  ICO.poly(g, [[18, 14], [26, 10], [32, 16], [38, 10], [46, 14], [52, 24], [46, 28], [44, 52], [20, 52], [18, 28], [12, 24]], col);
  if (type === 'chain') { g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 20; y < 50; y += 5) for (let x = 22; x < 44; x += 5) { g.beginPath(); g.arc(x + (y % 10 ? 2.5 : 0), y, 1.1, 0, 7); g.fill(); } }
  if (type === 'plate') { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(26, 20); g.lineTo(26, 46); g.stroke(); g.strokeStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.moveTo(20, 38); g.lineTo(44, 38); g.stroke(); }
  if (type === 'leather') { g.strokeStyle = '#6d4426'; g.lineWidth = 2; for (const y of [26, 34, 42]) { g.beginPath(); g.moveTo(21, y); g.lineTo(43, y); g.stroke(); } }
  if (lv >= 3) { g.fillStyle = '#f4c44f'; g.beginPath(); g.arc(32, 30, 4, 0, 7); g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke(); }
  ICO.roman(g, ROMAN4[lv], 50, 54);
}
function horseIcon(g, H, badge) {
  const coat = H.coat, mane = H.mane;
  ICO.poly(g, [[22, 56], [24, 36], [20, 22], [26, 10], [32, 16], [38, 14], [50, 30], [52, 38], [46, 42], [38, 34], [36, 56]], coat);
  g.beginPath(); g.moveTo(26, 12); g.quadraticCurveTo(16, 24, 22, 50); g.lineWidth = 7; g.strokeStyle = OL; g.stroke(); g.lineWidth = 4; g.strokeStyle = mane; g.stroke();
  g.fillStyle = OL; g.beginPath(); g.arc(37, 24, 2.2, 0, 7); g.fill(); g.beginPath(); g.arc(48, 36, 1.4, 0, 7); g.fill();
  if (H.barding) { ICO.poly(g, [[30, 18], [40, 16], [50, 30], [44, 34], [34, 26]], H.barding, 2.2); }
  if (badge) badge(g);
}
function equipIcon(kind, key) {
  return ticoCanvas('eq:' + kind + ':' + key, g => {
    if (kind === 'weapon') itemIcon(g, key);
    else if (kind === 'shield') shieldIcon(g, key);
    else if (kind === 'armor') armorIcon(g, ARMORS[key].type, ARMORS[key].level);
    else if (kind === 'horse') horseIcon(g, HORSES[key]);
  });
}
// ---------- one picture per technology ----------
function roadIcon(g, tier) { const L = [null, ['#c9a46b', 'rgba(120,85,45,0.6)'], ['#b9b3a6', 'rgba(80,76,70,0.7)'], ['#8f8a84', 'rgba(235,230,220,0.9)']][tier]; ICO.disc(g, '#9bd95f'); ICO.poly(g, [[24, 60], [30, 4], [36, 4], [42, 60]], L[0]); g.strokeStyle = L[1]; g.lineWidth = tier === 3 ? 5 : 2.4; g.setLineDash(tier === 1 ? [5, 5] : tier === 2 ? [1, 4] : [3, 3]); g.beginPath(); g.moveTo(33, 8); g.lineTo(33, 58); g.stroke(); g.setLineDash([]); if (tier > 1) ICO.roman(g, ROMAN[tier], 52, 52); }
function stakesIcon(g) { ICO.line(g, [6, 38], [58, 38], '#8a5f3a', 3); for (let x = 10; x <= 54; x += 9) ICO.poly(g, [[x - 4, 56], [x - 4, 22], [x, 14], [x + 4, 22], [x + 4, 56]], '#b07a45', 2.2); }
const GOV_ICONS = {
  roads2(g) { roadIcon(g, 2); }, roads3(g) { roadIcon(g, 3); },
  walls2(g) { GOV_ICONS.stonewall(g); },
  gates(g) { GOV_ICONS.stonewall(g); ICO.poly(g, [[22, 54], [22, 34], [32, 26], [42, 34], [42, 54]], '#7b5029', 2.6); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(32, 30); g.lineTo(32, 54); g.stroke(); },
  forts2(g) { GOV_ICONS.forts(g); ICO.roman(g, 'II', 50, 52); }, forts3(g) { GOV_ICONS.forts(g); ICO.roman(g, 'III', 48, 52); },
  stealth(g) { g.beginPath(); g.moveTo(8, 36); g.quadraticCurveTo(32, 10, 56, 36); g.quadraticCurveTo(32, 56, 8, 36); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(32, 36, 8, 0, 7); g.fillStyle = '#3f7a58'; g.fill(); g.stroke(); ICO.poly(g, [[4, 34], [32, 4], [60, 34], [60, 28], [32, -4], [4, 28]], '#3f7a58', 2.6); },
  farsight(g) { ICO.disc(g, '#e3ecff'); g.beginPath(); g.moveTo(12, 32); g.quadraticCurveTo(32, 12, 52, 32); g.quadraticCurveTo(32, 52, 12, 32); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(32, 32, 7, 0, 7); g.fillStyle = '#3f72d9'; g.fill(); g.stroke(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ICO.line(g, [32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22], [32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28], '#ffc93c', 1.6); } },
  reffarms(g) { GOV_ICONS.advfarms(g); ICO.roman(g, 'II', 14, 52); }, sophfarms(g) { GOV_ICONS.advfarms(g); ICO.roman(g, 'III', 14, 52); },
  refmills(g) { GOV_ICONS.advmills(g); ICO.roman(g, 'II', 14, 56); }, sophmills(g) { GOV_ICONS.advmills(g); ICO.roman(g, 'III', 14, 56); },
  refmines(g) { GOV_ICONS.advmines(g); ICO.roman(g, 'II', 50, 54); }, sophmines(g) { GOV_ICONS.advmines(g); ICO.roman(g, 'III', 50, 54); },
  roads(g) { roadIcon(g, 1); },
  walls(g) { stakesIcon(g); },
  stonewall(g) { ICO.poly(g, [[8, 54], [8, 24], [56, 24], [56, 54]], '#cfc8ba'); for (let x = 8; x < 56; x += 12) ICO.poly(g, [[x + 1, 24], [x + 1, 14], [x + 8, 14], [x + 8, 24]], '#e2dccf', 2.4); g.strokeStyle = 'rgba(60,40,30,0.35)'; g.lineWidth = 1.6; for (const y of [34, 44]) { g.beginPath(); g.moveTo(9, y); g.lineTo(55, y); g.stroke(); } for (const [x, y] of [[20, 24], [36, 24], [28, 34], [44, 34], [20, 44], [36, 44]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 10); g.stroke(); } },
  stable(g) { g.beginPath(); g.arc(32, 30, 18, Math.PI * 0.85, Math.PI * 2.15); g.lineWidth = 16; g.strokeStyle = OL; g.stroke(); g.lineWidth = 10; g.strokeStyle = '#9aa3b2'; g.stroke(); g.fillStyle = OL; for (const a of [1.1, 1.5, 1.9, 2.3]) for (const s of [-1, 1]) { const q = Math.PI * (s < 0 ? a * 0.5 + 0.35 : 2.15 - a * 0.5 + 0.35 - 0.35); g.beginPath(); g.arc(32 + Math.cos(q) * 18, 30 + Math.sin(q) * 18, 1.6, 0, 7); g.fill(); } },
  market(g) { ICO.poly(g, [[10, 30], [54, 30], [50, 16], [14, 16]], '#c8473d'); g.save(); g.beginPath(); g.moveTo(10, 30); g.lineTo(54, 30); g.lineTo(50, 16); g.lineTo(14, 16); g.closePath(); g.clip(); g.fillStyle = '#fff'; for (let x = 14; x < 54; x += 10) g.fillRect(x, 14, 5, 18); g.restore(); ICO.poly(g, [[10, 30], [54, 30], [50, 16], [14, 16]], null); ICO.poly(g, [[14, 30], [50, 30], [50, 52], [14, 52]], '#a5713f'); for (const [x, c] of [[22, '#e05a4a'], [32, '#ffd36b'], [42, '#7fcf63']]) { g.beginPath(); g.arc(x, 38, 4, 0, 7); g.fillStyle = c; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); } },
  granary(g) { ICO.poly(g, [[18, 56], [18, 26], [46, 26], [46, 56]], '#e9dfc8'); ICO.poly(g, [[14, 28], [32, 8], [50, 28]], '#f0cf5a'); g.strokeStyle = '#8a5f3a'; g.lineWidth = 2.4; for (const y of [36, 46]) { g.beginPath(); g.moveTo(19, y); g.lineTo(45, y); g.stroke(); } ICO.poly(g, [[28, 56], [28, 44], [36, 44], [36, 56]], '#7b5029', 2); },
  storehouse(g) { for (let k = 0; k < 4; k++) ICO.poly(g, [[10 + k * 2, 52 - k * 9], [54 - k * 2, 52 - k * 9], [54 - k * 2, 45 - k * 9], [10 + k * 2, 45 - k * 9]], k % 2 ? '#d9a86a' : '#c99560', 2.4); },
  bank(g) { for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(32, 52 - k * 7, 18, 6, 0, 0, 7); g.fillStyle = k % 2 ? '#c99a2c' : '#f4c44f'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); } g.beginPath(); g.ellipse(32, 24, 18, 6, 0, 0, 7); g.fillStyle = '#ffe58a'; g.fill(); g.stroke(); },
  forts(g) { ICO.poly(g, [[20, 58], [20, 22], [44, 22], [44, 58]], '#cfc8ba'); for (let x = 20; x < 44; x += 8) ICO.poly(g, [[x, 22], [x, 14], [x + 5, 14], [x + 5, 22]], '#e2dccf', 2.2); ICO.poly(g, [[28, 58], [28, 44], [36, 44], [36, 58]], '#7b5029', 2); ICO.poly(g, [[46, 8], [52, 8], [52, 14], [58, 14], [58, 20], [52, 20], [52, 26], [46, 26], [46, 20], [40, 20], [40, 14], [46, 14]], '#58c25a', 2.2); },
  autoscout(g) { const img = new Image(); g.save(); g.beginPath(); g.arc(32, 34, 20, -2.6, 0.4); g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#3f9b4b'; g.stroke(); g.beginPath(); g.arc(32, 34, 20, 0.55, 3.55); g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#3f9b4b'; g.stroke(); g.restore(); ICO.line(g, [30, 48], [30, 20], '#c99560', 3); ICO.poly(g, [[32, 20], [46, 25], [32, 31]], '#ffc93c', 2.4); },
  arrowslits(g) { ICO.poly(g, [[10, 58], [10, 10], [54, 10], [54, 58]], '#cfc8ba'); ICO.poly(g, [[29, 50], [29, 18], [35, 18], [35, 50]], '#2a2731', 2); ICO.line(g, [8, 46], [50, 22], '#c99560', 2.6); ICO.poly(g, [[50, 22], [56, 16], [46, 18]], '#d9dee6', 2); ICO.poly(g, [[8, 46], [4, 42], [6, 50]], '#e05a4a', 1.6); },
  mushroom(g) { for (const [x, y, r, c] of [[22, 40, 11, '#c8473d'], [42, 44, 9, '#d9a05a'], [33, 26, 8, '#c8473d']]) { g.beginPath(); g.moveTo(x - r * 0.3, y); g.lineTo(x - r * 0.25, y + r * 1.4); g.lineTo(x + r * 0.25, y + r * 1.4); g.lineTo(x + r * 0.3, y); g.closePath(); g.fillStyle = '#f3e6cc'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.closePath(); g.fillStyle = c; g.fill(); g.stroke(); g.fillStyle = '#fff3df'; for (const d of [-0.45, 0.35]) { g.beginPath(); g.arc(x + d * r, y - r * 0.5, r * 0.18, 0, 7); g.fill(); } } },
  advfarms(g) { ICO.line(g, [26, 58], [26, 14], '#c9a43a', 3); for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { g.beginPath(); g.ellipse(26 + s * 6, 20 + k * 8, 4, 7, s * 0.5, 0, 7); g.fillStyle = '#f0cf5a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); } ICO.up(g); },
  advmills(g) { ICO.poly(g, [[8, 46], [8, 30], [40, 30], [40, 46]], '#a5713f'); g.beginPath(); g.ellipse(40, 38, 6, 8, 0, 0, 7); g.fillStyle = '#e6c08a'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(40, 38, 2.4, 3.5, 0, 0, 7); g.lineWidth = 1.2; g.strokeStyle = '#a5713f'; g.stroke(); ICO.up(g); },
  advmines(g) { ICO.line(g, [12, 54], [38, 22], '#a5713f', 3.4); ICO.poly(g, [[26, 14], [44, 22], [50, 34], [40, 26], [30, 22]], '#9aa3b2', 2.4); ICO.poly(g, [[14, 40], [22, 36], [28, 42], [24, 50], [14, 48]], '#f4c44f', 2.2); ICO.up(g); }
};

// ---------- magic ----------
const TIERMARK = (g, id) => { for (const L of Object.values(typeof LINES !== 'undefined' ? LINES : {})) { const i = L.indexOf(id); if (i > 0) ICO.roman(g, ROMAN[i + 1], 52, 54); } };
const MAGIC_ICONS = {
  'school-life'(g) { ICO.disc(g, '#e3f6e0'); ICO.poly(g, [[32, 54], [14, 30], [22, 14], [32, 22], [42, 14], [50, 30]], '#3f9b4b'); ICO.line(g, [32, 54], [32, 24], '#2c6e36', 2); },
  'school-death'(g) { ICO.disc(g, '#efe6fb'); g.beginPath(); g.arc(32, 28, 15, Math.PI, 0); g.lineTo(46, 40); g.lineTo(40, 46); g.lineTo(24, 46); g.lineTo(18, 40); g.closePath(); g.fillStyle = '#f3ead6'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.fillStyle = '#6b3fa0'; g.beginPath(); g.arc(26, 30, 4.5, 0, 7); g.arc(38, 30, 4.5, 0, 7); g.fill(); ICO.poly(g, [[32, 34], [29, 39], [35, 39]], OL, 1); },
  'school-arcane'(g) { ICO.disc(g, '#e3ecff'); ICO.poly(g, [[32, 8], [37, 26], [56, 32], [37, 38], [32, 56], [27, 38], [8, 32], [27, 26]], '#2f6fe0', 2.6); g.beginPath(); g.arc(32, 32, 5, 0, 7); g.fillStyle = '#fff'; g.fill(); },
  harvest(g) { GOV_ICONS.advfarms(g); g.fillStyle = '#ffe680'; for (const [x, y] of [[48, 16], [54, 26], [44, 26]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } },
  skin(g) { ICO.poly(g, [[32, 8], [52, 16], [50, 36], [32, 56], [14, 36], [12, 16]], '#e0b08a'); ICO.poly(g, [[32, 20], [42, 28], [32, 44], [22, 28]], '#c9805a', 2); },
  curse1(g) { itemIcon(g, 'sword'); g.fillStyle = '#7a3fbf'; for (const [x, y] of [[40, 24], [46, 30], [34, 18]]) { g.beginPath(); g.ellipse(x, y + 6, 3, 5, 0, 0, 7); g.fill(); } },
  mending(g) { ICO.disc(g, '#e3f6e0'); ICO.poly(g, [[26, 12], [38, 12], [38, 26], [52, 26], [52, 38], [38, 38], [38, 52], [26, 52], [26, 38], [12, 38], [12, 26], [26, 26]], '#58c25a'); },
  forest(g) { ICO.poly(g, [[20, 56], [20, 44], [8, 44], [20, 22], [12, 22], [24, 6], [36, 22], [28, 22], [40, 44], [28, 44], [28, 56]], '#4ba557', 2.4); ICO.line(g, [40, 36], [58, 36], '#c99560', 3); ICO.poly(g, [[56, 30], [62, 36], [56, 42]], '#c99560', 2); },
  underworld(g) { ICO.poly(g, [[4, 56], [20, 18], [32, 30], [44, 10], [60, 56]], '#9aa0ab'); g.beginPath(); g.moveTo(22, 56); g.lineTo(22, 44); g.quadraticCurveTo(32, 32, 42, 44); g.lineTo(42, 56); g.closePath(); g.fillStyle = '#1d1a22'; g.fill(); g.fillStyle = '#b48cff'; g.beginPath(); g.arc(32, 48, 3, 0, 7); g.fill(); },
  risen(g) { ICO.poly(g, [[10, 58], [54, 58], [54, 50], [10, 50]], '#7d5a3a'); for (const [x, h] of [[24, 30], [32, 22], [40, 28]]) ICO.line(g, [x, 52], [x, 52 - h], '#f3ead6', 3); ICO.poly(g, [[18, 26], [46, 26], [44, 14], [20, 14]], '#f3ead6', 2.4); },
  graverob(g) { ICO.poly(g, [[16, 56], [16, 22], [24, 12], [40, 12], [48, 22], [48, 56]], '#9aa0ab'); ICO.poly(g, [[28, 22], [36, 22], [36, 46], [28, 46]], null, 2); ICO.line(g, [24, 30], [40, 30], '#9aa0ab', 2); for (const [x, y] of [[44, 52], [52, 48], [50, 56]]) { g.beginPath(); g.ellipse(x, y, 7, 3, 0, 0, 7); g.fillStyle = '#f4c44f'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); } },
  arcscouts(g) { GOV_ICONS.forts(g); g.beginPath(); g.ellipse(48, 14, 10, 6, 0, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(48, 14, 3, 0, 7); g.fillStyle = '#2f6fe0'; g.fill(); },
  clearthoughts(g) { ICO.disc(g, '#e3ecff'); g.beginPath(); g.arc(32, 34, 13, 0, 7); g.fillStyle = '#f6cba3'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); for (let k = 0; k < 5; k++) { const a = -Math.PI + 0.3 + k * 0.6; ICO.line(g, [32 + Math.cos(a) * 17, 34 + Math.sin(a) * 17], [32 + Math.cos(a) * 25, 34 + Math.sin(a) * 25], '#7fb0ff', 2); } },
  trading(g) { ICO.disc(g, '#efe8ff'); g.beginPath(); for (let k = 0; k < 60; k++) { const a = k * 0.32, r = k * 0.42; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.lineWidth = 3; g.strokeStyle = '#7a55c9'; g.stroke(); for (const [x, y, c] of [[48, 48, '#f4c44f'], [16, 50, '#c99560'], [50, 16, '#f0cf5a']]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fillStyle = c; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); } },
  stasis(g) { g.save(); g.translate(32, 36); g.scale(1, 0.6); g.beginPath(); g.arc(0, 0, 24, 0, 7); g.lineWidth = 5; g.strokeStyle = '#4fa6e8'; g.setLineDash([8, 5]); g.stroke(); g.restore(); g.setLineDash([]); ICO.poly(g, [[24, 16], [40, 16], [36, 36], [28, 36]], '#bfe3ff', 2.4); },
  rift(g) { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 28); gr.addColorStop(0, '#fff'); gr.addColorStop(0.45, '#b48cff'); gr.addColorStop(1, '#5a2c9e'); g.beginPath(); g.ellipse(32, 32, 18, 27, 0, 0, 7); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(32, 32, 10, 18, 0.4, 0, 4.5); g.lineWidth = 2.4; g.strokeStyle = '#fff'; g.stroke(); },
  abandon(g) { ICO.disc(g, '#f6e3e3'); g.beginPath(); g.arc(32, 32, 16, 0, 7); g.lineWidth = 4; g.strokeStyle = '#7a55c9'; g.stroke(); ICO.line(g, [14, 50], [50, 14], '#d23b3b', 4); },
  magetower(g) { ICO.poly(g, [[24, 58], [24, 26], [40, 26], [40, 58]], '#c9c1dc'); ICO.poly(g, [[20, 28], [32, 4], [44, 28]], '#7a55c9'); g.beginPath(); g.arc(32, 40, 4, 0, 7); g.fillStyle = '#ffd36b'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); }
};
// later tiers reuse their line's picture with a numeral
Object.assign(MAGIC_ICONS, { bountiful: MAGIC_ICONS.harvest, magnificent: MAGIC_ICONS.harvest, stoneskin(g) { MAGIC_ICONS.skin(g); }, diamondskin: MAGIC_ICONS.skin, rejuvenation: MAGIC_ICONS.mending, restoration: MAGIC_ICONS.mending, commune: MAGIC_ICONS.forest, arboreal: MAGIC_ICONS.forest, curse2: MAGIC_ICONS.curse1, curse3: MAGIC_ICONS.curse1, hallways: MAGIC_ICONS.underworld, sealed: MAGIC_ICONS.underworld, necro: MAGIC_ICONS.risen, armyofdeath: MAGIC_ICONS.risen, deathtax: MAGIC_ICONS.graverob, charon: MAGIC_ICONS.graverob, arcvision: MAGIC_ICONS.arcscouts, mindread: MAGIC_ICONS.clearthoughts, stockmarket: MAGIC_ICONS.trading, planar: MAGIC_ICONS.trading, prison: MAGIC_ICONS.stasis, portal: MAGIC_ICONS.rift });
const SKIN_TINT = { stoneskin: '#9aa0ab', diamondskin: '#bff3ff' };

// ---------- icons for the newer technologies ----------
function anvilIcon(g) { ICO.poly(g, [[10, 26], [50, 26], [54, 20], [46, 18], [14, 18]], '#5f6672'); ICO.poly(g, [[22, 26], [42, 26], [38, 40], [26, 40]], '#4a505b'); ICO.poly(g, [[16, 52], [48, 52], [42, 40], [22, 40]], '#5f6672'); g.fillStyle = '#ff9a3c'; for (const [x, y] of [[50, 10], [56, 14], [44, 8]]) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); } }
function bookIcon(g, n) { ICO.poly(g, [[8, 18], [32, 14], [32, 54], [8, 56]], '#e9dfc8'); ICO.poly(g, [[56, 18], [32, 14], [32, 54], [56, 56]], '#f3ead6'); g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 2; for (const y of [26, 34, 42]) { g.beginPath(); g.moveTo(13, y); g.lineTo(28, y - 1); g.moveTo(36, y - 1); g.lineTo(51, y); g.stroke(); } ICO.poly(g, [[30, 14], [34, 14], [34, 58], [30, 58]], '#3f72d9', 2); if (n) ICO.roman(g, n, 50, 54); }
function horseshoeIcon(g, col = '#9aa3b2') { g.beginPath(); g.arc(32, 30, 17, Math.PI * 0.85, Math.PI * 2.15); g.lineWidth = 15; g.strokeStyle = OL; g.stroke(); g.lineWidth = 9; g.strokeStyle = col; g.stroke(); g.fillStyle = OL; for (const a of [1.15, 1.6, 2.05, 2.5]) for (const s of [-1, 1]) { const q = Math.PI * (s < 0 ? 2 - a + 1 : a); g.beginPath(); g.arc(32 + Math.cos(q) * 17, 30 + Math.sin(q) * 17, 1.6, 0, 7); g.fill(); } }
function hatIcon(g) { ICO.poly(g, [[10, 50], [54, 50], [46, 44], [36, 40], [34, 10], [24, 36], [18, 44]], '#7a55c9'); ICO.poly(g, [[22, 44], [42, 44], [40, 40], [24, 40]], '#ffc93c', 2); ICO.poly(g, [[30, 22], [32, 26], [36, 26], [33, 29], [34, 33], [30, 30], [26, 33], [27, 29], [24, 26], [28, 26]], '#ffe9a6', 1.6); }
function repeatBadge(g) { g.beginPath(); g.arc(50, 50, 11, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(50, 50, 6, -0.4, Math.PI * 1.45); g.lineWidth = 2.6; g.strokeStyle = '#2f9e5b'; g.stroke(); g.beginPath(); g.moveTo(55.5, 44.5); g.lineTo(56.5, 50); g.lineTo(51, 49); g.closePath(); g.fillStyle = '#2f9e5b'; g.fill(); }
Object.assign(GOV_ICONS, {
  forge(g) { anvilIcon(g); },
  retained(g) { bookIcon(g); }, retained2(g) { bookIcon(g, 'II'); },
  moat(g) { ICO.disc(g, '#45a8e4'); g.strokeStyle = '#c7ecff'; g.lineWidth = 2.4; for (const y of [44, 50]) { g.beginPath(); g.moveTo(12, y); for (let x = 12; x <= 52; x += 8) g.quadraticCurveTo(x + 2, y - 3, x + 4, y), g.quadraticCurveTo(x + 6, y + 3, x + 8, y); g.stroke(); } ICO.poly(g, [[22, 42], [22, 18], [42, 18], [42, 42]], '#cfc8ba'); for (let x = 22; x < 42; x += 7) ICO.poly(g, [[x, 18], [x, 12], [x + 4, 12], [x + 4, 18]], '#e2dccf', 2); ICO.poly(g, [[29, 42], [29, 32], [35, 32], [35, 42]], '#7b5029', 2); },
  traderoutes(g) { roadIcon(g, 1); g.beginPath(); g.arc(44, 22, 11, 0, 7); g.fillStyle = '#f4c44f'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(44, 22, 6, 0, 7); g.lineWidth = 1.6; g.strokeStyle = '#c99a2c'; g.stroke(); }
});
const REP_ICONS = {
  'rep-forts': g => GOV_ICONS.forts(g), 'rep-storage': g => GOV_ICONS.storehouse(g), 'rep-trade': g => GOV_ICONS.traderoutes(g), 'rep-lumber': g => GOV_ICONS.advmills(g),
  'rep-sword': g => itemIcon(g, 'longsword'), 'rep-blunt': g => itemIcon(g, 'morningstar'), 'rep-pole': g => itemIcon(g, 'polearm'),
  'rep-armor': g => armorIcon(g, 'plate', 2), 'rep-shield': g => shieldIcon(g, 'kite'),
  'rep-horsespeed': g => horseIcon(g, HORSES.arabian), 'rep-cavhp': g => horseIcon(g, HORSES.percheron),
  'rep-masons': g => GOV_ICONS.stonewall(g), 'rep-wayfinders': g => GOV_ICONS.autoscout(g),
  'rep-magecap': g => hatIcon(g), 'rep-stave': g => itemIcon(g, 'grandstave'), 'rep-wand': g => itemIcon(g, 'crypticwand'),
  'rep-harvest': g => MAGIC_ICONS.harvest(g), 'rep-graverob': g => MAGIC_ICONS.graverob(g), 'rep-trading': g => MAGIC_ICONS.trading(g)
};
function techIcon(id) {
  return ticoCanvas('tech:' + id, g => {
    const x = TECH_BY_ID[id];
    if (REP_ICONS[id]) { REP_ICONS[id](g); repeatBadge(g); return; }
    if (id === 'horde') { horseshoeIcon(g, '#ffc93c'); ICO.roman(g, '×10', 32, 52); return; }
    if (GOV_ICONS[id]) return GOV_ICONS[id](g);
    if (id === 'apprentice') { hatIcon(g); ICO.roman(g, '+1', 50, 52); return; }
    if (SKIN_TINT[id]) { ICO.poly(g, [[32, 8], [52, 16], [50, 36], [32, 56], [14, 36], [12, 16]], SKIN_TINT[id]); ICO.poly(g, [[32, 20], [42, 28], [32, 44], [22, 28]], '#ffffff', 2); TIERMARK(g, id); return; }
    if (MAGIC_ICONS[id]) { MAGIC_ICONS[id](g); TIERMARK(g, id); return; }
    if (id === 'earthquake') { ICO.poly(g, [[6, 40], [58, 40], [58, 58], [6, 58]], '#b08a5a'); ICO.poly(g, [[30, 40], [36, 46], [28, 50], [34, 58], [26, 58], [22, 50], [28, 46], [24, 40]], '#3b2a1a', 2); ICO.poly(g, [[10, 36], [20, 14], [30, 36]], '#cfc8ba'); ICO.poly(g, [[34, 36], [44, 10], [54, 36]], '#cfc8ba'); return; }
    if (id === 'terrascape') { ICO.poly(g, [[4, 50], [60, 50], [60, 58], [4, 58]], '#9bd95f'); for (const x of [10, 22, 42, 54]) ICO.poly(g, [[x - 8, 44], [x, 14], [x + 8, 44]], '#3f8a3a'); ICO.poly(g, [[28, 58], [36, 58], [34, 38], [30, 38]], '#c9a46b', 2); return; }
    if (['grandstave', 'mythicstave', 'crypticwand', 'enigmaticwand'].includes(id)) return itemIcon(g, id);
    if (id.startsWith('w-')) return itemIcon(g, TECH_EQUIP[id]);
    if (id.startsWith('s-')) return shieldIcon(g, id.slice(2));
    if (id.startsWith('a-')) { const k = id.slice(2); return armorIcon(g, ARMORS[k].type, ARMORS[k].level); }
    if (id === 'horse-breeding') { horseIcon(g, HORSES.arabian); g.beginPath(); g.moveTo(50, 50); g.bezierCurveTo(42, 42, 46, 34, 50, 40); g.bezierCurveTo(54, 34, 58, 42, 50, 50); g.fillStyle = '#e0526a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); return; }
    if (id === 'horse-training') { horseIcon(g, HORSES.friesian); ICO.poly(g, [[50, 40], [53, 47], [60, 47], [54, 51], [56, 58], [50, 54], [44, 58], [46, 51], [40, 47], [47, 47]], '#ffc93c', 2); return; }
    // dummies: a scroll for Government, a rune for Magic
    if (x && x.tree === 'mag') { ICO.disc(g, '#efe8ff'); g.beginPath(); g.arc(32, 32, 16, 0, 7); g.lineWidth = 3; g.strokeStyle = '#7a55c9'; g.stroke(); for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.3; g.beginPath(); g.moveTo(32 + Math.cos(a) * 16, 32 + Math.sin(a) * 16); g.lineTo(32 + Math.cos(a + 2.1) * 16, 32 + Math.sin(a + 2.1) * 16); g.stroke(); } ICO.roman(g, ROMAN[x.tier], 50, 52); return; }
    ICO.poly(g, [[14, 14], [46, 14], [46, 52], [14, 52]], '#f3ead6'); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (const y of [24, 32, 40]) { g.beginPath(); g.moveTo(20, y); g.lineTo(40, y); g.stroke(); } ICO.roman(g, x ? ROMAN[x.tier] : '?', 50, 52);
  });
}
