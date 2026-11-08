/* Realmlings — eight-direction unit rig. Each unit is built from parts placed around a vertical axis,
   so the same model can be drawn facing any angle. theta = 0 faces the viewer (S), PI/2 faces right (E),
   PI faces away (N), -PI/2 faces left (W). Light always comes from the upper left. */
(function (root) {
'use strict';
const OL = '#1d1a22', TAU = Math.PI * 2, TILT = 0.28;
const P = {
  blue: '#3f72d9', blueD: '#2c55aa', gold: '#f4c44f', goldD: '#c99a2c',
  steel: '#c9d2de', steelD: '#8f9bad', steelL: '#eef2f7', chain: '#9aa3b2',
  leather: '#94603a', leatherD: '#6d4426', cloth: '#efe6cf', wood: '#a5713f', woodD: '#7b5029',
  red: '#d9473f', white: '#fbfdff', glass: '#9fe0f5'
};
const SHIELDS = ['heater-knight', 'buckler', 'round', 'kite', 'tower', 'aegis'];

// ---------- primitives with cel highlights ----------
let LB = null;
const bnd = (x0, y0, x1, y1) => { LB = [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)]; };
function rr(g, x, y, w, h, r) { if (w < 0) { x += w; w = -w; } g.beginPath(); g.roundRect(x, y, w, h, Math.min(typeof r === 'number' ? r : 4, w / 2, h / 2)); bnd(x, y, x + w, y + h); }
function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); bnd(x - r, y - r, x + r, y + r); }
function ell(g, x, y, rx, ry, rot = 0) { rx = Math.max(0.1, rx); g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); const m = rot ? Math.max(rx, ry) : 0; bnd(x - (m || rx), y - (m || ry), x + (m || rx), y + (m || ry)); }
function poly(g, pts) {
  g.beginPath(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  pts.forEach(([x, y], i) => { i ? g.lineTo(x, y) : g.moveTo(x, y); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  g.closePath(); bnd(x0, y0, x1, y1);
}
function cel(g) {
  if (!LB) return;
  const [x0, y0, x1, y1] = LB, w = x1 - x0, h = y1 - y0;
  if (w < 3 || h < 3) return;
  g.save(); g.clip();
  const gr = g.createLinearGradient(x0, y0, x0 + w * 0.5, y1);
  gr.addColorStop(0, 'rgba(255,255,255,0.45)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.45)');
  gr.addColorStop(0.22, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(255,255,255,0)');
  gr.addColorStop(0.6, 'rgba(30,16,60,0.2)'); gr.addColorStop(1, 'rgba(30,16,60,0.2)');
  g.fillStyle = gr; g.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
  g.restore();
}
function ink(g, fill, lw = 3, shade = true) {
  if (fill) { g.fillStyle = fill; g.fill(); if (shade) cel(g); }
  LB = null; g.lineWidth = lw; g.strokeStyle = OL; g.stroke();
}
function stick(g, x1, y1, x2, y2, w, col, noHi) {
  g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
  g.strokeStyle = OL; g.lineWidth = w + 5; g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke();
  if (!noHi && w >= 3.5) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, sgn = (nx + ny < 0) ? 1 : -1, o = w * 0.22 * sgn;
    g.beginPath(); g.moveTo(x1 + nx * o + dx * 0.12, y1 + ny * o + dy * 0.12); g.lineTo(x2 + nx * o - dx * 0.12, y2 + ny * o - dy * 0.12);
    g.strokeStyle = 'rgba(255,255,255,0.42)'; g.lineWidth = Math.max(1.2, w * 0.3); g.stroke();
  }
  LB = null;
}
function glint(g, x, y, rx, ry, rot = -0.5, a = 0.85) { g.save(); g.globalAlpha = a; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); g.restore(); }
function glow(g, x, y, r, col, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.save(); g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
}
function shade(hex, f = 0.78) {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join('');
}
function star(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath(); g.fillStyle = '#fff3a6'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke(); LB = null;
}

// ---------- facing rig ----------
function rig(th) {
  const c = Math.cos(th), s = Math.sin(th);
  return {
    th, c, s,
    X: (lx, lz) => lx * c + lz * s,                  // screen x of a body-local point
    D: (lx, lz) => -lx * s + lz * c,                 // how far toward the viewer it is
    P: (lx, lz, y) => [lx * c + lz * s, y + (-lx * s + lz * c) * TILT],
    // visible slice of a band wrapped around a cylinder/sphere of radius r between local angles a0..a1
    span(a0, a1, r) {
      const b0 = Math.max(-Math.PI / 2, a0 + th), b1 = Math.min(Math.PI / 2, a1 + th);
      const w0 = ((a0 + th + Math.PI) % TAU + TAU) % TAU - Math.PI, w1 = w0 + (a1 - a0);
      const c0 = Math.max(-Math.PI / 2, w0), c1 = Math.min(Math.PI / 2, w1);
      if (c1 - c0 < 0.04) return null;
      return [r * Math.sin(c0), r * Math.sin(c1)];
    },
    at(a, r) { const w = ((a + th + Math.PI) % TAU + TAU) % TAU - Math.PI; return { x: r * Math.sin(w), d: Math.cos(w) }; }
  };
}

// ---------- held items (upright at the hand) ----------
function item(g, name, x, y, ang, t, flip) {
  g.save(); g.translate(x, y); g.rotate(ang); if (flip) g.scale(-1, 1);
  const wave = Math.sin(t * 5) * 3;
  switch (name) {
    case 'lantern':
      stick(g, 0, 0, 0, 9, 1.5, OL, true);
      rr(g, -7, 9, 14, 18, 3); ink(g, P.gold, 2.5);
      rr(g, -4, 13, 8, 10, 2); ink(g, '#ffe680', 1.5, false);
      poly(g, [[-8, 9], [8, 9], [0, 3]]); ink(g, P.goldD, 2);
      glow(g, 0, 18, 30, 'rgba(255,220,110,1)', 0.38 + Math.sin(t * 6) * 0.08);
      glint(g, -3, 15, 1.5, 3, 0);
      break;
    case 'hammer':
      stick(g, 0, 14, 0, -24, 4, P.wood);
      rr(g, -11, -33, 22, 10, 2); ink(g, P.steel, 2.5); glint(g, -6, -30, 3, 1.3, 0);
      break;
    case 'chisel':
      stick(g, 0, 6, 0, -16, 3.5, P.steelD);
      break;
    case 'sword':
      stick(g, 0, 5, 0, -6, 4, P.leatherD);
      poly(g, [[-4, -10], [4, -10], [4, -52], [0, -60], [-4, -52]]); ink(g, P.steelL, 2.5);
      g.strokeStyle = P.steelD; g.lineWidth = 1.5; g.beginPath(); g.moveTo(1, -14); g.lineTo(1, -50); g.stroke();
      rr(g, -12, -12, 24, 5, 2); ink(g, P.gold, 2.2);
      circ(g, 0, 8, 3.8); ink(g, P.gold, 2); circ(g, 0, -9.5, 2.2); ink(g, '#d33b5a', 1.4, false);
      break;
    case 'mace':
      stick(g, 0, 14, 0, -24, 4.5, P.wood);
      rr(g, -3.5, -2, 7, 6, 2); ink(g, P.gold, 1.6);
      for (const a of [0, 1.05, 2.1, 3.15, 4.2, 5.25]) { g.save(); g.translate(0, -32); g.rotate(a); poly(g, [[-3.2, 0], [3.2, 0], [0, -14]]); ink(g, P.gold, 2); g.restore(); }
      circ(g, 0, -32, 8.5); ink(g, P.gold, 2.5); glint(g, -3, -35, 2.4, 1.6);
      break;
    case 'poleaxe':
      stick(g, 0, 28, 0, -112, 4.5, P.wood);
      rr(g, -3, -110, 6, 30, 2); ink(g, P.steelD, 2);
      ell(g, 0, -80, 8, 3); ink(g, P.steel, 2);
      poly(g, [[0, -146], [4.5, -122], [-4.5, -122]]); ink(g, P.steelL, 2.4);
      g.beginPath(); g.moveTo(3, -120); g.lineTo(10, -122); g.quadraticCurveTo(27, -113, 27, -98); g.quadraticCurveTo(27, -84, 10, -84); g.lineTo(3, -90); g.closePath(); bnd(3, -122, 27, -84); ink(g, P.steelL, 2.6);
      g.strokeStyle = P.steelD; g.lineWidth = 1.5; g.beginPath(); g.moveTo(16, -117); g.quadraticCurveTo(23, -103, 17, -88); g.stroke();
      poly(g, [[-3, -116], [-12, -114], [-16, -107], [-12, -100], [-3, -98]]); ink(g, P.steel, 2.4);
      rr(g, -4.5, -124, 9, 6, 2); ink(g, P.gold, 1.8);
      break;
    case 'staff-crystal': {
      g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 32); g.quadraticCurveTo(4, -10, -2, -40); g.quadraticCurveTo(-6, -58, 2, -70);
      g.strokeStyle = OL; g.lineWidth = 10.5; g.stroke(); g.strokeStyle = P.woodD; g.lineWidth = 5.5; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-1, 20); g.quadraticCurveTo(2, -10, -3.5, -40); g.stroke();
      const bob = Math.sin(t * 2.5) * 2;
      glow(g, 2, -88 + bob, 30, 'rgba(120,230,255,1)', 0.5 + Math.sin(t * 4) * 0.1);
      poly(g, [[2, -102 + bob], [10, -88 + bob], [2, -74 + bob], [-6, -88 + bob]]); ink(g, '#7fe3ff', 2.5);
      poly(g, [[2, -100 + bob], [5.5, -88 + bob], [2, -78 + bob]]); g.fillStyle = '#e8fbff'; g.fill(); LB = null;
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(2, -70); g.quadraticCurveTo(2 + sd * 12, -76, 2 + sd * 8, -92); g.strokeStyle = OL; g.lineWidth = 6; g.stroke(); g.strokeStyle = P.woodD; g.lineWidth = 2.5; g.stroke(); }
      for (let k = 0; k < 3; k++) { const a = t * 2 + k * 2.1; star(g, 2 + Math.cos(a) * 16, -88 + bob + Math.sin(a) * 6, 2.6); }
      break;
    }
    case 'heater-knight': case 'heater-back': {
      const outline = () => { g.beginPath(); g.moveTo(-18, -19); g.lineTo(18, -19); g.lineTo(18, 0); g.quadraticCurveTo(17, 17, 0, 28); g.quadraticCurveTo(-17, 17, -18, 0); g.closePath(); bnd(-18, -19, 18, 28); };
      if (name === 'heater-back') {
        outline(); ink(g, '#8a5f3a', 3);
        for (const yy of [-6, 8]) { rr(g, -14, yy, 28, 5, 2); ink(g, P.leatherD, 1.8); }
        circ(g, 0, 1, 3); ink(g, P.steel, 1.6);
        break;
      }
      outline(); g.fillStyle = P.blue; g.fill();
      g.save(); outline(); g.clip(); g.fillStyle = '#f2f4fa'; g.fillRect(0, -20, 19, 21); g.fillRect(-19, 1, 19, 28); g.restore();
      outline(); cel(g);
      g.save(); g.translate(0, 3); g.scale(0.8, 0.8); g.translate(0, -3); outline(); g.restore(); g.strokeStyle = P.gold; g.lineWidth = 3; g.stroke();
      poly(g, [[-7, 4], [-7, -5], [-3.5, -1], [0, -8], [3.5, -1], [7, -5], [7, 4]]); ink(g, P.gold, 1.8);
      g.fillStyle = '#d33b5a'; g.beginPath(); g.arc(0, 0, 1.6, 0, TAU); g.fill();
      g.fillStyle = P.goldD; for (const [xx, yy] of [[-14, -15], [14, -15], [0, 22]]) { g.beginPath(); g.arc(xx, yy, 1.6, 0, TAU); g.fill(); }
      outline(); ink(g, null, 3);
      glint(g, -11, -12, 4, 2, -0.3, 0.6);
      break;
    }
    // ---- mage staves and wands ----
    case 'stave':
      stick(g, 0, 32, 0, -66, 5, P.wood);
      circ(g, 0, -72, 6); ink(g, '#7fe3ff', 2.2); glint(g, -2, -74, 1.6, 1.2);
      break;
    case 'grandstave': {
      g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 32); g.quadraticCurveTo(4, -10, -2, -40); g.quadraticCurveTo(-6, -58, 2, -70);
      g.strokeStyle = OL; g.lineWidth = 10.5; g.stroke(); g.strokeStyle = P.woodD; g.lineWidth = 5.5; g.stroke(); LB = null;
      const bob = Math.sin(t * 2.5) * 2;
      glow(g, 2, -84 + bob, 22, 'rgba(160,140,255,1)', 0.45);
      poly(g, [[2, -96 + bob], [9, -84 + bob], [2, -72 + bob], [-5, -84 + bob]]); ink(g, '#b48cff', 2.4);
      break;
    }
    case 'mythicstave': {
      stick(g, 0, 32, 0, -70, 5.5, '#e8d9a8');
      for (const y of [-20, -46]) { rr(g, -4.5, y, 9, 5, 2); ink(g, P.gold, 1.8); }
      const bob = Math.sin(t * 2.5) * 2;
      glow(g, 0, -92 + bob, 34, 'rgba(255,220,120,1)', 0.5 + Math.sin(t * 4) * 0.1);
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, -70); g.quadraticCurveTo(sd * 14, -78, sd * 9, -98); g.strokeStyle = OL; g.lineWidth = 6; g.stroke(); g.strokeStyle = P.gold; g.lineWidth = 2.6; g.stroke(); }
      poly(g, [[0, -108 + bob], [9, -92 + bob], [0, -76 + bob], [-9, -92 + bob]]); ink(g, '#fff3a6', 2.5);
      for (let k = 0; k < 3; k++) { const a = t * 2 + k * 2.1; star(g, Math.cos(a) * 18, -92 + bob + Math.sin(a) * 7, 2.6); }
      break;
    }
    case 'wand':
      stick(g, 0, 6, 0, -30, 3.2, P.wood); circ(g, 0, -33, 3.6); ink(g, '#7fe3ff', 1.8);
      break;
    case 'crypticwand':
      stick(g, 0, 6, 0, -32, 3.4, '#3a2a4a'); poly(g, [[0, -44], [4, -36], [0, -30], [-4, -36]]); ink(g, '#b48cff', 1.8);
      glow(g, 0, -37, 12, 'rgba(180,140,255,1)', 0.4);
      break;
    case 'enigmaticwand':
      stick(g, 0, 6, 0, -34, 3.6, P.gold); glow(g, 0, -40, 16, 'rgba(120,230,255,1)', 0.5 + Math.sin(t * 5) * 0.12);
      star(g, 0, -40, 6.5);
      break;
    // ---- equipment: polearms ----
    case 'spear':
      stick(g, 0, 26, 0, -100, 4, P.wood);
      poly(g, [[0, -124], [6, -108], [0, -98], [-6, -108]]); ink(g, P.steelL, 2.4);
      rr(g, -3, -100, 6, 5, 2); ink(g, P.leatherD, 1.6);
      break;
    case 'pike':
      stick(g, 0, 30, 0, -132, 3.6, P.woodD);
      poly(g, [[0, -150], [4, -136], [0, -128], [-4, -136]]); ink(g, P.steelL, 2.2);
      break;
    case 'polearm':
      stick(g, 0, 28, 0, -104, 4.5, P.wood);
      g.beginPath(); g.moveTo(-3, -100); g.quadraticCurveTo(-4, -124, 8, -140); g.quadraticCurveTo(14, -118, 4, -100); g.closePath(); bnd(-4, -140, 14, -100); ink(g, P.steelL, 2.4);
      g.strokeStyle = P.steelD; g.lineWidth = 1.4; g.beginPath(); g.moveTo(2, -104); g.quadraticCurveTo(2, -120, 8, -132); g.stroke();
      rr(g, -4, -104, 8, 6, 2); ink(g, P.gold, 1.6);
      break;
    case 'halberd':
      stick(g, 0, 28, 0, -112, 4.5, P.wood);
      poly(g, [[0, -150], [4.5, -124], [-4.5, -124]]); ink(g, P.steelL, 2.4);
      g.beginPath(); g.moveTo(3, -122); g.lineTo(14, -128); g.quadraticCurveTo(30, -114, 26, -94); g.lineTo(14, -96); g.lineTo(3, -102); g.closePath(); bnd(3, -128, 30, -94); ink(g, P.steelL, 2.6);
      poly(g, [[-3, -118], [-16, -122], [-10, -110], [-3, -108]]); ink(g, P.steel, 2.2);
      rr(g, -4.5, -126, 9, 6, 2); ink(g, P.gold, 1.8);
      break;
    // ---- equipment: swords ----
    case 'shortsword':
      stick(g, 0, 5, 0, -5, 4, P.leatherD);
      poly(g, [[-3.5, -9], [3.5, -9], [3.5, -36], [0, -43], [-3.5, -36]]); ink(g, P.steelL, 2.4);
      rr(g, -9, -11, 18, 4.5, 2); ink(g, P.steel, 2);
      circ(g, 0, 7, 3.2); ink(g, P.steel, 1.8);
      break;
    case 'longsword':
      stick(g, 0, 9, 0, -7, 4, P.leatherD);
      poly(g, [[-4, -11], [4, -11], [4, -64], [0, -73], [-4, -64]]); ink(g, P.steelL, 2.5);
      g.strokeStyle = P.steelD; g.lineWidth = 1.5; g.beginPath(); g.moveTo(1, -15); g.lineTo(1, -62); g.stroke();
      poly(g, [[-14, -10], [14, -10], [11, -15], [-11, -15]]); ink(g, P.gold, 2.2);
      circ(g, 0, 11, 3.8); ink(g, P.gold, 2);
      break;
    case 'greatsword':
      stick(g, 0, 16, 0, -8, 4.5, P.leatherD);
      poly(g, [[-5.5, -13], [5.5, -13], [5.5, -84], [0, -96], [-5.5, -84]]); ink(g, P.steelL, 2.6);
      g.strokeStyle = P.steelD; g.lineWidth = 1.6; g.beginPath(); g.moveTo(1.5, -18); g.lineTo(1.5, -82); g.stroke();
      poly(g, [[-18, -10], [18, -10], [20, -16], [-20, -16]]); ink(g, P.steel, 2.4);
      circ(g, -19, -13, 3); ink(g, P.gold, 1.6); circ(g, 19, -13, 3); ink(g, P.gold, 1.6);
      circ(g, 0, 18, 4.2); ink(g, P.gold, 2);
      glint(g, -2, -60, 1.6, 10, 0, 0.5);
      break;
    // ---- equipment: blunt ----
    case 'club':
      g.beginPath(); g.moveTo(-2.5, 14); g.lineTo(2.5, 14); g.quadraticCurveTo(10, -24, 7, -42); g.quadraticCurveTo(0, -50, -7, -42); g.quadraticCurveTo(-10, -24, -2.5, 14); g.closePath(); bnd(-10, -50, 10, 14); ink(g, P.wood, 2.6);
      for (const [x, y] of [[-4, -30], [3, -38], [1, -22]]) { circ(g, x, y, 1.6); ink(g, P.woodD, 1, false); }
      break;
    case 'morningstar': {
      stick(g, 0, 14, 0, -22, 4.5, P.wood);
      const sw = Math.sin(t * 4) * 6, bx = 8 + sw, by = -44;
      g.strokeStyle = P.steelD; g.lineWidth = 2.4; g.setLineDash([3, 2]); g.beginPath(); g.moveTo(0, -24); g.lineTo(bx, by + 8); g.stroke(); g.setLineDash([]);
      for (let k = 0; k < 8; k++) { const a = k * TAU / 8; g.save(); g.translate(bx, by); g.rotate(a); poly(g, [[-3, -8], [3, -8], [0, -16]]); ink(g, P.steelL, 1.8); g.restore(); }
      circ(g, bx, by, 9); ink(g, P.steel, 2.4); glint(g, bx - 3, by - 3, 2.4, 1.6);
      break;
    }
    case 'warhammer':
      stick(g, 0, 24, 0, -72, 4.5, P.woodD);
      rr(g, -14, -84, 22, 13, 2.5); ink(g, P.steel, 2.6);
      poly(g, [[8, -82], [22, -78], [8, -73]]); ink(g, P.steelL, 2.2);
      poly(g, [[-3, -84], [3, -84], [0, -98]]); ink(g, P.steelL, 2);
      rr(g, -4, -72, 8, 5, 2); ink(g, P.gold, 1.6);
      break;
    // ---- equipment: shields ----
    case 'round':
      circ(g, 0, 2, 15); ink(g, '#a5713f', 2.8);
      for (const a of [-0.9, 0.2, 1.3]) { g.strokeStyle = P.woodD; g.lineWidth = 1.2; g.beginPath(); g.moveTo(Math.cos(a) * 13, 2 + Math.sin(a) * 13); g.lineTo(-Math.cos(a) * 13, 2 - Math.sin(a) * 13); g.stroke(); }
      circ(g, 0, 2, 15); g.strokeStyle = P.steelD; g.lineWidth = 2.4; g.stroke(); circ(g, 0, 2, 15); ink(g, null, 2.6);
      circ(g, 0, 2, 4.5); ink(g, P.steel, 2); glint(g, -2, 0, 1.6, 1);
      break;
    case 'kite': {
      const outline = () => { g.beginPath(); g.moveTo(0, -24); g.quadraticCurveTo(17, -22, 16, -4); g.quadraticCurveTo(12, 18, 0, 34); g.quadraticCurveTo(-12, 18, -16, -4); g.quadraticCurveTo(-17, -22, 0, -24); g.closePath(); bnd(-17, -24, 17, 34); };
      outline(); g.fillStyle = P.red; g.fill(); g.save(); outline(); g.clip(); g.fillStyle = '#f2f4fa'; g.fillRect(-2.5, -26, 5, 62); g.fillRect(-18, 0, 36, 5); g.restore(); outline(); cel(g); outline(); ink(g, null, 2.8);
      glint(g, -9, -14, 3, 1.6, -0.3, 0.6);
      break;
    }
    case 'tower':
      rr(g, -16, -26, 32, 56, 4); ink(g, '#8a5f3a', 3);
      for (const x of [-8, 0, 8]) { g.strokeStyle = P.woodD; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, -24); g.lineTo(x, 28); g.stroke(); }
      for (const y of [-16, 18]) { rr(g, -16, y, 32, 4, 1.5); ink(g, P.steelD, 1.6); }
      rr(g, -16, -26, 32, 56, 4); g.strokeStyle = P.steel; g.lineWidth = 2.4; g.stroke(); rr(g, -16, -26, 32, 56, 4); ink(g, null, 2.8);
      circ(g, 0, 2, 5); ink(g, P.gold, 2);
      break;
    case 'aegis': {
      glow(g, 0, 2, 30, 'rgba(140,220,255,1)', 0.35 + Math.sin(t * 3) * 0.08);
      circ(g, 0, 2, 17); ink(g, P.blueD, 2.8);
      circ(g, 0, 2, 17); g.strokeStyle = P.gold; g.lineWidth = 4; g.stroke(); circ(g, 0, 2, 17); ink(g, null, 2.6);
      star(g, 0, 2, 8); g.fillStyle = '#bff3ff'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
      glint(g, -7, -6, 3, 1.6, -0.4, 0.6);
      break;
    }
    case 'buckler':
      circ(g, 0, 0, 11); ink(g, P.steel, 2.6); circ(g, 0, 0, 4); ink(g, P.gold, 2); glint(g, -4, -4, 3, 1.6);
      break;
  }
  g.restore();
}

// ---------- head ----------
function face(g, s, R, cx, cy, t) {
  const blink = (t % 3.6) > 3.45 ? 0.15 : 1;
  for (const ph of [-0.45, 0.45]) {
    const e = R.at(ph, 18); if (e.d < 0.15) continue;
    const sc = Math.max(0.35, e.d);
    ell(g, cx + e.x, cy + 1, 3 * sc, 4.4 * blink); g.fillStyle = s.glowEyes || OL; g.fill(); LB = null;
    if (blink > 0.5) { g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + e.x + sc, cy - 1, 1.3, 0, TAU); g.fill(); }
    const sg = Math.sign(ph), o = R.at(ph + sg * 0.28, 18), i = R.at(ph - sg * 0.24, 18);
    g.lineCap = 'round'; g.strokeStyle = s.browColor || OL; g.lineWidth = s.brows === 'bushy' ? 4.6 : 2.8; g.beginPath();
    if (s.brows === 'angry') { g.moveTo(cx + o.x, cy - 8); g.lineTo(cx + i.x, cy - 5); }
    else if (s.brows === 'bushy') { g.moveTo(cx + o.x, cy - 6); g.quadraticCurveTo(cx + e.x, cy - 10, cx + i.x, cy - 8); }
    else { g.moveTo(cx + o.x, cy - 7); g.lineTo(cx + i.x, cy - 7); }
    g.stroke();
    const ck = R.at(ph * 1.45, 18);
    if (ck.d > 0.2) { g.fillStyle = 'rgba(232,96,96,0.28)'; g.beginPath(); g.ellipse(cx + ck.x, cy + 9, 4 * Math.max(0.4, ck.d), 2.5, 0, 0, TAU); g.fill(); }
  }
  const m = R.at(0, 18);
  if (Math.abs(R.s) > 0.3 && R.c > -0.25) { circ(g, cx + 23 * Math.sign(R.s) * Math.min(1, Math.abs(R.s) * 1.15), cy + 4, 3.6); ink(g, s.skin, 2); }
  if (m.d > 0.05) {
    const w = Math.max(0.45, m.d), mx = cx + m.x, my = cy + 12;
    g.lineWidth = 2.4; g.strokeStyle = OL; g.beginPath();
    if (s.mouth === 'smile') { g.moveTo(mx - 4.5 * w, my); g.quadraticCurveTo(mx, my + 4.5, mx + 4.5 * w, my); }
    else { g.moveTo(mx - 4 * w, my + 1); g.lineTo(mx + 4 * w, my + 1); }
    g.stroke();
  }
}
function beard(g, s, R, cx, cy) {
  if (!s.beard || R.c < -0.35) return;
  const col = s.beard.color, m = R.at(0, 18);
  if (s.beard.style === 'stubble') {
    g.save(); g.globalAlpha = 0.3; g.fillStyle = col; g.beginPath();
    g.ellipse(cx + m.x * 0.6, cy + 13, 17 * (0.55 + 0.45 * Math.abs(R.c)), 9, 0, 0, TAU);
    g.restore(); g.save(); g.beginPath(); g.arc(cx, cy, 23.5, 0, TAU); g.clip(); g.globalAlpha = 0.3; g.fillStyle = col;
    g.beginPath(); g.ellipse(cx + m.x * 0.6, cy + 13, 17 * (0.55 + 0.45 * Math.abs(R.c)), 9, 0, 0, TAU); g.fill(); g.restore();
    return;
  }
  const bx = 14 * R.s, bw = 0.55 + 0.45 * Math.abs(R.c), lean = 8 * R.s;
  g.beginPath(); g.moveTo(cx + bx - 20 * bw, cy + 6); g.quadraticCurveTo(cx + bx - 21 * bw, cy + 40, cx + bx + lean, cy + 56);
  g.quadraticCurveTo(cx + bx + 21 * bw, cy + 40, cx + bx + 20 * bw, cy + 6); g.quadraticCurveTo(cx + bx, cy + 14, cx + bx - 20 * bw, cy + 6); g.closePath();
  bnd(cx + bx - 21 * bw, cy + 6, cx + bx + 21 * bw, cy + 56); ink(g, col, 2.6);
  g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1.5;
  for (const k of [-0.4, 0, 0.4]) { g.beginPath(); g.moveTo(cx + bx + k * 22 * bw, cy + 16); g.quadraticCurveTo(cx + bx + k * 14 * bw, cy + 34, cx + bx + lean * 0.6 + k * 6, cy + 48); g.stroke(); }
  if (m.d > 0.05) { const w = Math.max(0.5, m.d); ell(g, cx + m.x - 4 * w, cy + 9, 5 * w, 2.8, 0.25); ink(g, col, 1.8); ell(g, cx + m.x + 4 * w, cy + 9, 5 * w, 2.8, -0.25); ink(g, col, 1.8); }
}
function helm(g, s, R, cx, cy, phase, t) {
  const h = s.helm, c = R.c, sn = R.s, sway = Math.sin(t * 3) * 2;
  if (h === 'hood') {
    const hx = -4 * sn;
    if (phase === 'back') {
      if (Math.abs(sn) > 0.3 || c < 0) { const tx = -30 * sn; poly(g, [[hx - 10, cy - 18], [hx + 10, cy - 22], [hx + tx * 0.9, cy + 6]]); ink(g, s.helmColor, 3); }
      circ(g, hx, cy - 2, 29); ink(g, s.helmColor, 3);
      return;
    }
    if (c < -0.3) { circ(g, hx, cy - 2, 29); ink(g, s.helmColor, 3); g.strokeStyle = shade(s.helmColor); g.lineWidth = 2; g.beginPath(); g.moveTo(hx, cy - 30); g.quadraticCurveTo(hx + 3, cy, hx, cy + 24); g.stroke(); return; }
    const ox = 14 * sn, rx = 21 * (1 - 0.48 * Math.abs(sn)) * (c < 0 ? 0.7 : 1);
    g.beginPath(); g.arc(hx, cy - 2, 29, 0, TAU); g.ellipse(cx + ox, cy - 3, rx, 21, 0, 0, TAU); bnd(hx - 29, cy - 31, hx + 29, cy + 27);
    g.fillStyle = s.helmColor; g.fill('evenodd'); cel(g); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); LB = null;
    g.beginPath(); g.ellipse(cx + ox, cy - 3, rx + 1, 22, 0, Math.PI * 1.08, Math.PI * 1.92); g.strokeStyle = s.hoodTrim || P.gold; g.lineWidth = 3; g.stroke();
    return;
  }
  if (h === 'flatcap') {
    const brim = () => {
      const pts = [];
      for (let k = 0; k <= 16; k++) { const ph = -1.35 + k * 2.7 / 16, r = 23 + 10 * Math.cos(ph) ** 2; pts.push(R.P(r * Math.sin(ph), r * Math.cos(ph), cy - 3)); }
      for (let k = 16; k >= 0; k--) { const ph = -1.35 + k * 2.7 / 16; pts.push(R.P(21 * Math.sin(ph), 21 * Math.cos(ph), cy - 4)); }
      poly(g, pts); ink(g, s.helmColor2 || '#6f7480', 2.4);
    };
    if (phase === 'back') { if (c < 0) brim(); return; }
    g.beginPath(); g.arc(cx, cy - 2, 24.6, Math.PI, 0); g.closePath(); bnd(cx - 25, cy - 27, cx + 25, cy - 2); ink(g, s.helmColor, 2.8);
    rr(g, cx - 25, cy - 5, 50, 4, 1); ink(g, s.helmColor2 || '#6f7480', 1.8);
    circ(g, cx, cy - 27, 3); ink(g, s.helmColor, 2);
    if (c >= 0) brim();
    return;
  }
  if (h === 'greathelm') {
    if (phase === 'back') return;
    rr(g, cx - 26, cy - 28, 52, 54, [16, 16, 10, 10]); ink(g, P.steel, 3);
    glint(g, cx - 14, cy - 16, 4, 9, 0.15, 0.55);
    rr(g, cx - 26, cy - 21, 52, 5, 1); ink(g, P.gold, 1.8);
    for (let k = 0; k < 10; k++) {
      const p = R.at(k * TAU / 10, 23); if (p.d < 0.1) continue;
      const w = 4.5 * Math.max(0.35, p.d); poly(g, [[cx + p.x - w, cy - 21], [cx + p.x, cy - 29], [cx + p.x + w, cy - 21]]); ink(g, P.gold, 1.6);
    }
    rr(g, cx - 26, cy + 19, 52, 7, [1, 1, 8, 8]); ink(g, P.gold, 1.8);
    g.fillStyle = P.goldD; for (let k = 0; k < 12; k++) { const p = R.at(k * TAU / 12, 24); if (p.d > 0.1) { g.beginPath(); g.arc(cx + p.x, cy + 22.5, 1.4, 0, TAU); g.fill(); } }
    if (c > -0.3) {
      const ridge = R.span(-0.85, 0.85, 25); if (ridge) { rr(g, cx + ridge[0], cy - 11, ridge[1] - ridge[0], 5, 1); ink(g, P.gold, 1.8); }
      const slit = R.span(-0.8, 0.8, 25); if (slit) { rr(g, cx + slit[0], cy - 6, slit[1] - slit[0], 8, 2); ink(g, '#2a2731', 2, false); }
      for (const ph of [-0.38, 0.38]) { const e = R.at(ph, 22); if (e.d > 0.2) { g.fillStyle = '#fff6c4'; g.beginPath(); g.ellipse(cx + e.x, cy - 2, 3 * Math.max(0.4, e.d), 2.6, 0, 0, TAU); g.fill(); } }
      const vs = R.span(-0.13, 0.13, 25); if (vs) { rr(g, cx + vs[0], cy + 2, vs[1] - vs[0], 16, 2); ink(g, '#2a2731', 2, false); }
      const cr = R.span(-0.1, 0.1, 25); if (cr) { rr(g, cx + cr[0], cy - 27, cr[1] - cr[0], 16, 1); ink(g, P.gold, 1.6); }
      g.fillStyle = OL;
      for (const ph of [-0.6, 0.6]) { const p = R.at(ph, 24); if (p.d < 0.15) continue; for (const [dx, dy] of [[-2.5, 6], [2.5, 6], [-2.5, 11], [2.5, 11], [0, 16]]) { g.beginPath(); g.arc(cx + p.x + dx * p.d, cy + dy, 1.4, 0, TAU); g.fill(); } }
    }
    const px = -5 * sn;
    rr(g, cx + px - 4.5, cy - 35, 9, 8, 2); ink(g, P.gold, 1.8);
    g.beginPath(); g.moveTo(cx + px - 6, cy - 32); g.quadraticCurveTo(cx + px - 12 - 16 * sn + sway, cy - 56, cx + px - 24 * sn + sway * 1.4, cy - 66);
    g.quadraticCurveTo(cx + px + 10 - 8 * sn + sway, cy - 52, cx + px + 6, cy - 32); g.closePath(); bnd(cx + px - 30, cy - 66, cx + px + 12, cy - 32);
    ink(g, s.plume || P.red, 2.6);
    return;
  }
  if (h === 'barbute') {
    if (phase === 'back') return;
    g.beginPath(); g.arc(cx, cy, 27, 0, TAU);
    const hs = c > -0.3 ? R.span(-0.62, 0.62, 25) : null, vs = c > -0.3 ? R.span(-0.25, 0.25, 25) : null;
    if (hs) {
      const y0 = cy - 9, y1 = cy + 7, y2 = cy + 22;
      if (vs) { const pts = [[hs[0], y0], [hs[1], y0], [hs[1], y1], [vs[1], y1], [vs[1], y2], [vs[0], y2], [vs[0], y1], [hs[0], y1]]; pts.forEach(([x, y], i) => i ? g.lineTo(cx + x, y) : g.moveTo(cx + x, y)); }
      else { g.moveTo(cx + hs[0], y0); g.lineTo(cx + hs[1], y0); g.lineTo(cx + hs[1], y1); g.lineTo(cx + hs[0], y1); }
      g.closePath();
    }
    bnd(cx - 27, cy - 27, cx + 27, cy + 27);
    g.fillStyle = P.steel; g.fill('evenodd'); cel(g); g.lineWidth = 2.8; g.strokeStyle = OL; g.stroke(); LB = null;
    glint(g, cx - 12, cy - 15, 5, 3, -0.5, 0.75);
    const ridge = R.at(0, 1); g.strokeStyle = P.steelD; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 6 * sn, cy - 26); g.quadraticCurveTo(cx - 6 * sn + (c > 0 ? 0 : 0), cy - 18, cx - 6 * sn, cy - 10); g.stroke();
    g.fillStyle = OL; for (let k = 0; k < 10; k++) { const p = R.at(k * TAU / 10, 24); if (p.d > 0.15) { g.beginPath(); g.arc(cx + p.x, cy + 22, 1.3, 0, TAU); g.fill(); } }
    return;
  }
  if (h === 'wizard') {
    if (phase === 'back') return;
    const pts = []; for (let k = 0; k < 28; k++) { const a = k * TAU / 28; pts.push(R.P(35 * Math.sin(a), 35 * Math.cos(a), cy - 14)); }
    poly(g, pts); ink(g, s.helmColor, 2.8);
    const dir = Math.abs(sn) > 0.25 ? -Math.sign(sn) * (0.6 + 0.4 * Math.abs(sn)) : 1, ax = cx + 4 * dir;
    g.beginPath(); g.moveTo(cx - 20, cy - 16); g.quadraticCurveTo(cx - 10 * Math.sign(dir || 1), cy - 46, ax, cy - 64);
    g.quadraticCurveTo(ax + 18 * dir + sway, cy - 66, ax + 20 * dir + sway, cy - 52);
    g.quadraticCurveTo(ax + 8 * dir, cy - 52, cx + 10, cy - 40); g.quadraticCurveTo(cx + 16, cy - 28, cx + 20, cy - 16); g.closePath();
    bnd(cx - 20, cy - 66, cx + 24, cy - 16); ink(g, s.helmColor, 2.8);
    rr(g, cx - 19, cy - 22, 38, 6, 2); ink(g, P.gold, 2);
    for (const [ph, yy, r] of [[-0.35, -34, 4.5], [0.3, -46, 3]]) { const p = R.at(ph, 15); if (p.d > 0.1) star(g, cx + p.x, cy + yy, r * Math.max(0.5, p.d)); }
    return;
  }
}
function head(g, s, R, t) {
  const cx = 0, cy = -76;
  helm(g, s, R, cx, cy, 'back', t);
  const earsShown = !['hood', 'greathelm', 'barbute'].includes(s.helm);
  const ears = earsShown ? [Math.PI / 2, -Math.PI / 2].map(ph => R.at(ph, 23)) : [];
  for (const e of ears) if (e.d <= 0.45) { circ(g, cx + e.x, cy + 3, 5.5); ink(g, s.skin, 2.4); }
  circ(g, cx, cy, 23.5); ink(g, s.skin, 3);
  for (const e of ears) if (e.d > 0.45) { circ(g, cx + e.x * 0.9, cy + 3, 5.5); ink(g, s.skin, 2.4); }
  if (s.hairColor && R.c < 0.35) {
    g.save(); g.beginPath(); g.arc(cx, cy, 23.5, 0, TAU); g.clip();
    const hx = cx - 18 * R.s, hw = 24 * (0.4 + 0.6 * Math.abs(R.c)) + 4;
    ell(g, hx, cy - 2, hw, 24); g.fillStyle = s.hairColor; g.fill(); cel(g); LB = null;
    g.strokeStyle = 'rgba(40,30,60,0.22)'; g.lineWidth = 1.6;
    for (const k of [-0.6, -0.25, 0.1, 0.45]) { g.beginPath(); g.moveTo(hx + k * hw, cy - 20); g.quadraticCurveTo(hx + k * hw * 1.1 + 3, cy, hx + k * hw * 0.9, cy + 22); g.stroke(); }
    g.restore(); circ(g, cx, cy, 23.5); ink(g, null, 3);
  }
  if (s.helm !== 'greathelm' && R.c > -0.35) face(g, s, R, cx, cy, t);
  beard(g, s, R, cx, cy);
  helm(g, s, R, cx, cy, 'front', t);
}

// ---------- body parts ----------
const fv = R => 0.3 + 0.7 * Math.max(0, R.c), bv = R => 0.3 + 0.7 * Math.max(0, -R.c);
function torso(g, s, R) {
  const c = R.c, sn = R.s, W = Math.hypot(34 * c, 25 * sn), fx = 11 * sn, bx = -11 * sn, fw = fv(R), bw = bv(R);
  if (s.robe) {
    const wt = Math.hypot(30 * c, 22 * sn), wb = Math.hypot(46 * c, 35 * sn);
    poly(g, [[-wt / 2, -52], [wt / 2, -52], [wb / 2, -5], [-wb / 2, -5]]); ink(g, s.robe, 3);
    rr(g, -wb / 2, -11, wb, 6, 2); ink(g, s.robeTrim, 2.2);
    if (c > -0.2) { const fx2 = 13 * sn; poly(g, [[fx2 - 3 * fw, -52], [fx2 + 3 * fw, -52], [fx2 + 5 * fw, -6], [fx2 - 5 * fw, -6]]); ink(g, s.robeTrim, 1.6); }
    const ws = wt + (wb - wt) * 0.42; rr(g, -ws / 2, -32, ws, 6, 2); ink(g, s.sash, 2.2);
    return;
  }
  rr(g, -W / 2, -52, W, 32, 10); ink(g, s.shirt, 3);
  if (s.mail) { rr(g, -W / 2 + 1.5, -32, W - 3, 14, 5); ink(g, P.chain, 2.4); g.fillStyle = 'rgba(0,0,0,0.18)'; for (let x = -W / 2 + 5; x < W / 2 - 3; x += 5) for (let y = -29; y < -20; y += 4) { g.beginPath(); g.arc(x + (y % 8 ? 2.5 : 0), y, 1, 0, TAU); g.fill(); } }
  if (s.armor) {
    if (c > -0.35) { rr(g, fx - 14 * fw, -51, 28 * fw, 24, 9); ink(g, P.steel, 2.6); glint(g, fx - 6 * fw, -45, 4 * fw + 1, 2.4, -0.4, 0.8); }
    if (c < 0.35) { rr(g, bx - 14 * bw, -51, 28 * bw, 24, 9); ink(g, P.steel, 2.6); }
  }
  const tab = (x, w, front) => {
    poly(g, [[x - 9 * w, -50], [x + 9 * w, -50], [x + 10 * w, -12], [x, -6], [x - 10 * w, -12]]); ink(g, s.tabard, 2.6);
    if (s.tabardTrim) { g.beginPath(); g.moveTo(x - 8 * w, -48); g.lineTo(x - 9 * w, -14); g.lineTo(x, -9); g.lineTo(x + 9 * w, -14); g.lineTo(x + 8 * w, -48); g.strokeStyle = s.tabardTrim; g.lineWidth = 2.2; g.stroke(); }
    if (front) { if (s.tabardTrim) { poly(g, [[x - 5 * w, -34], [x - 5 * w, -40], [x - 2.5 * w, -37], [x, -42], [x + 2.5 * w, -37], [x + 5 * w, -40], [x + 5 * w, -34]]); ink(g, P.gold, 1.6); } else { ell(g, x, -36, 4 * w, 4); ink(g, P.gold, 1.8); } }
  };
  if (s.tabard) { if (c > -0.25) tab(fx, fw, true); if (c < 0.25) tab(bx, bw, false); }
  if (s.apron && c > -0.2) { rr(g, fx - 12 * fw, -40, 24 * fw, 30, 5); ink(g, s.apron, 2.5); rr(g, fx - 6 * fw, -30, 12 * fw, 8, 2); ink(g, s.apron, 1.8); }
  rr(g, -W / 2, -27, W, 6, 2); ink(g, s.belt || P.leatherD, 2.2);
  if (c > 0) { rr(g, fx - 3.2 * fw, -27, 6.4 * fw, 6, 1); ink(g, P.gold, 1.6); }
}
function legStand(g, s, R, lx) {
  const x = R.X(lx, 0), far = R.D(lx, 0) < -2, bw = Math.hypot(13 * R.c, 17 * R.s), bx = R.X(lx, 3.5), by = R.D(lx, 3.5) * TILT * 0.4;
  if (!s.robe) { rr(g, x - 4.5, -24, 9, 14, 3); ink(g, far ? shade(s.pants) : s.pants, 2.5); }
  rr(g, bx - bw / 2, -12 + by, bw, 12, [6, 6, 3, 3]); ink(g, far ? shade(s.boots) : s.boots, 2.5);
}
function legSeat(g, s, R, side) {
  const hip = R.P(side * 9, 0, -24), knee = R.P(side * 14, 9, -13), foot = R.P(side * 14, 6, 2);
  const far = R.D(side * 14, 6) < 0, col = far ? shade(s.pants) : s.pants;
  stick(g, hip[0], hip[1], knee[0], knee[1], 9, col); stick(g, knee[0], knee[1], foot[0], foot[1], 8, col);
  const bw = Math.hypot(12 * R.c, 16 * R.s); rr(g, foot[0] - bw / 2 + 2 * R.s, foot[1] - 4, bw, 10, [5, 6, 3, 3]); ink(g, far ? shade(s.boots) : s.boots, 2.4);
}
function cape(g, s, R, t) {
  const c = R.c, sn = R.s, sw = Math.sin(t * 2.4) * 2.5;
  const tw = Math.hypot(30 * c, 18 * sn), tx = -8 * sn, bw = Math.hypot(56 * c, 30 * sn), bx = -20 * sn + sw * (Math.abs(sn) > 0.3 ? 1 : 0.4);
  poly(g, [[tx - tw / 2, -50], [tx + tw / 2, -50], [bx + bw / 2, -3], [bx, 0], [bx - bw / 2, -3]]); ink(g, s.cape, 3);
  if (c < -0.3) { g.strokeStyle = shade(s.cape); g.lineWidth = 2; for (const k of [-0.25, 0.25]) { g.beginPath(); g.moveTo(tx + k * tw * 0.6, -44); g.lineTo(bx + k * bw * 0.7, -6); g.stroke(); } }
}
function rucksack(g, s, R) {
  const c = R.c, sn = R.s, W = Math.hypot(58 * c, 36 * sn), x = -19 * sn, top = -116, bot = -26;
  rr(g, x - W / 2, top, W, bot - top, 14); ink(g, P.leather, 3);
  if (Math.abs(sn) > 0.35) { const pw = 22 * Math.abs(sn); rr(g, x - pw / 2 + 4 * sn, -82, pw, 32, 6); ink(g, P.leatherD, 2.4); rr(g, x - 3 + 4 * sn, -70, 6, 5, 1); ink(g, P.gold, 1.4); }
  if (c < 0.1) {
    const k = 0.35 + 0.65 * Math.max(0, -c), bxp = -38 * sn * 0.9;
    rr(g, x + (bxp - x) * 0.5 - W * 0.42 * k, top + 6, W * 0.84 * k, 40, 10); ink(g, shade(P.leather, 0.85), 2.5);
    for (const d of [-0.22, 0.22]) { rr(g, x + (bxp - x) * 0.5 + d * W * k - 3, top + 38, 6, 7, 1); ink(g, P.gold, 1.5); }
    rr(g, x + (bxp - x) * 0.5 - W * 0.3 * k, -62, W * 0.6 * k, 26, 6); ink(g, shade(P.leather, 0.9), 2.2);
  }
  const rw = Math.hypot(68 * c, 22 * sn); rr(g, x - rw / 2, top - 16, rw, 20, 10); ink(g, '#b4553f', 2.6);
  g.strokeStyle = P.leatherD; g.lineWidth = 2.6; for (const d of [-0.28, 0.28]) { g.beginPath(); g.moveTo(x + d * rw, top - 16); g.lineTo(x + d * rw, top + 4); g.stroke(); }
  const pan = R.at(Math.PI / 2, 31), pd = R.D(31, -19);
  if (pd > -6) { const px = R.X(31, -19); stick(g, px, -86, px, -74, 2.5, P.steelD); circ(g, px, -66, 9 * Math.max(0.45, Math.abs(sn))); ink(g, '#5b6270', 2.4); }
  const roll = R.D(-31, -19); if (roll > -6) { const px = R.X(-31, -19); rr(g, px - 5, -104, 10, 34, 5); ink(g, '#7f9a55', 2.3); }
}
function straps(g, s, R) {
  const fx = 11 * R.s, fw = fv(R);
  if (R.c > 0.25) for (const d of [-8, 8]) stick(g, fx + d * fw, -52, fx + d * 1.1 * fw, -28, 3.5, P.leatherD, true);
  else if (Math.abs(R.s) > 0.5) stick(g, 2 * R.s, -52, 5 * R.s, -28, 3.5, P.leatherD, true);
}

// ---------- humanoid ----------
function humanoid(g, s, R, t, seated) {
  const bob = seated ? Math.sin(t * 2.2) * 0.6 : Math.sin(t * 3.2) * 1.3;
  const parts = []; const add = (d, f, up = true) => parts.push({ d, f, up });
  if (s.cape) add(R.D(0, -10) - 0.5, () => cape(g, s, R, t));
  if (s.back === 'rucksack') add(R.D(0, -19), () => rucksack(g, s, R));
  if (!seated) for (const lx of [-7.5, 7.5]) add(R.D(lx, 0) * 0.5 - 3, () => legStand(g, s, R, lx), false);
  else for (const sd of [-1, 1]) add(R.D(sd * 14, 6) * 0.6, () => legSeat(g, s, R, sd), false);
  add(0, () => torso(g, s, R));
  if (s.back === 'rucksack') add(0.4, () => straps(g, s, R));
  add(1, () => head(g, s, R, t));
  // castPose (v78): both hands lifted over the head, the staff held high, lightning crackling at its tip in the school's color
  const cast = s.castPose;
  const hands = cast ? { r: [-12, 10, -82], l: [13, 8, -76] } : { r: s.rightPose === 'raised' ? [-24, 10, -58] : [-24, 5, -28], l: [24, 5, -28] };
  for (const sd of ['r', 'l']) {
    const sh = [sd === 'r' ? -17 : 17, 0, -46], hd = hands[sd];
    const name = sd === 'r' ? s.right : s.left, isShield = name && SHIELDS.includes(name);
    const d = R.D(hd[0], hd[1]), armD = d > 0 ? d + 1 : d - 0.5;
    const ang = cast ? 0.08 * R.s : sd === 'r' ? (s.angF || 0) * R.c + (s.angS || 0) * R.s : 0;
    add(armD, () => {
      const sx = R.X(sh[0], sh[1]), hx = R.X(hd[0], hd[1]), hy = hd[2] + R.D(hd[0], hd[1]) * TILT * 0.4;
      if (name && !isShield) item(g, name, hx, hy, ang, t, R.s < -0.25);
      stick(g, sx, sh[2], hx, hy, 8, d < -2 ? shade(s.sleeve) : s.sleeve);
      circ(g, hx, hy, 5.2); ink(g, s.gloves || s.skin, 2.4);
    });
    if (s.pauldrons) add(armD + 0.01, () => { const px = R.X(sh[0] * 1.05, 0); circ(g, px, -49, 9.5); ink(g, P.steel, 2.6); g.beginPath(); g.arc(px, -49, 9.5, Math.PI * 0.05, Math.PI * 0.95); g.strokeStyle = P.gold; g.lineWidth = 2.4; g.stroke(); });
    if (isShield) {
      const sp = name === 'buckler' ? [27, 8, -34] : [26, 12, -31], ds = R.D(sp[0], sp[1]);
      add(ds > 0 ? ds + 1.5 : ds - 0.4, () => {
        const fac = Math.cos(0.5 + R.th), w = Math.max(0.3, Math.abs(fac));
        g.save(); g.translate(R.X(sp[0], sp[1]), sp[2] + ds * TILT * 0.4); g.scale(w, 1);
        item(g, name === 'buckler' ? 'buckler' : (fac < -0.08 ? 'heater-back' : 'heater-knight'), 0, 0, 0, t, false);
        g.restore();
      });
    }
  }
  if (cast) { const hd = hands.r, hx = R.X(hd[0], hd[1]), hy = hd[2] + R.D(hd[0], hd[1]) * TILT * 0.4; const tip = { stave: 72, grandstave: 88, 'staff-crystal': 88, mythicstave: 80, wand: 33, crypticwand: 37, enigmaticwand: 40 }[s.right] || 72; add(9, () => castBolts(g, hx, hy - tip, t, cast)); }
  parts.sort((a, b) => a.d - b.d);
  for (const p of parts) { if (p.up) { g.save(); g.translate(0, bob); p.f(); g.restore(); } else p.f(); }
}
// jagged lightning crackling around a raised staff's tip; col is the school's color (a dark color gets a pale halo so it still reads)
function castBolts(g, x, y, t, col) {
  const dark = col === '#1d1a22' || col === '#000' || col === 'black', step = Math.floor(t * 14);
  let seed = step * 9301 + 49297; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  glow(g, x, y, 44, dark ? 'rgba(190,150,255,1)' : col, dark ? 0.45 : 0.55);
  for (let b = 0; b < 4; b++) {
    const a0 = rnd() * TAU, len = 26 + rnd() * 30, pts = [[x, y]];
    for (let k = 1; k <= 4; k++) { const f = k / 4, a = a0 + (rnd() - 0.5) * 1.1; pts.push([x + Math.cos(a) * len * f, y + Math.sin(a) * len * f * 0.85]); }
    g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py));
    g.lineWidth = 7; g.strokeStyle = dark ? 'rgba(225,205,255,0.85)' : OL; g.stroke();
    g.lineWidth = 3.6; g.strokeStyle = col; g.stroke();
    g.lineWidth = 1.3; g.strokeStyle = dark ? '#6b3fa0' : '#fff'; g.stroke();
  }
  g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fillStyle = dark ? '#3a2a55' : '#fff'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = col; g.stroke();
  g.restore(); LB = null;
}

// ---------- horse ----------
function horse(g, h, R, t, rider) {
  const P3 = R.P, coat = h.coat, coatD = shade(h.coat), hoof = '#3b2f2a';
  const tail = Math.sin(t * 2.6) * 4, br = Math.sin(t * 2.2) * 0.6;
  const legs = [
    { lx: -10, lz: 20, front: true }, { lx: 10, lz: 20, front: true },
    { lx: -10, lz: -21, front: false }, { lx: 10, lz: -21, front: false }
  ];
  const drawLeg = (L) => {
    const far = R.D(L.lx, L.lz) < R.D(0, L.lz) - 0.5, col = far ? coatD : coat;
    // shoulder/forearm, knee, cannon, fetlock, hoof; hind leg bends forward at the stifle and back at the hock
    const J = L.front ? [[0, -46], [2, -33], [2, -20], [0, -8], [3, -2]] : [[0, -50], [5, -35], [-6, -20], [-3, -8], [0, -2]];
    const Wd = L.front ? [12, 8, 5.6, 5] : [15, 10, 5.6, 5];
    const pts = J.map(([dz, y]) => P3(L.lx, L.lz + dz, y));
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(...pts[i]); g.lineTo(...pts[i + 1]); g.strokeStyle = OL; g.lineWidth = Wd[i] + 5; g.stroke(); }
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(...pts[i]); g.lineTo(...pts[i + 1]); g.strokeStyle = col; g.lineWidth = Wd[i]; g.stroke(); }
    for (const j of [L.front ? 2 : 2, 3]) { circ(g, pts[j][0], pts[j][1], j === 3 ? 3.6 : 4); g.fillStyle = col; g.fill(); LB = null; }
    if (!far) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(pts[0][0] - 2, pts[0][1] + 2); g.lineTo(pts[1][0] - 1.5, pts[1][1]); g.stroke(); }
    if (h.socks) { g.strokeStyle = '#f4f0e6'; g.lineWidth = 4.6; g.beginPath(); g.moveTo(pts[3][0], pts[3][1] - 4); g.lineTo(pts[4][0], pts[4][1] - 1); g.stroke(); }
    const hw = Math.hypot(8 * R.c, 11 * R.s), hp = pts[4];
    rr(g, hp[0] - hw / 2 + 1.5 * R.s, hp[1] - 3, hw, 7, 2); ink(g, hoof, 2.2, false);
  };
  const body = () => {
    const blobs = [[-20, -53, 16], [-6, -52, 15.5], [8, -52, 15.5], [21, -55, 17]];
    const path = () => { g.beginPath(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [lz, y, r] of blobs) { const [px, py] = P3(0, lz, y + br); const rx = Math.hypot(r * 1.22 * R.c, r * R.s); g.moveTo(px + rx, py); g.ellipse(px, py, rx, r, 0, 0, TAU); x0 = Math.min(x0, px - rx); y0 = Math.min(y0, py - r); x1 = Math.max(x1, px + rx); y1 = Math.max(y1, py + r); } bnd(x0, y0, x1, y1); };
    path(); g.lineWidth = 6; g.strokeStyle = OL; g.stroke();
    path(); g.fillStyle = coat; g.fill(); cel(g); LB = null;
  };
  const skirt = () => {
    if (!h.barding) return;
    const N = 40, ring = [];
    for (let k = 0; k < N; k++) { const a = k * TAU / N, lx = 18.5 * Math.cos(a), lz = 37 * Math.sin(a); ring.push({ lx, lz, d: R.D(lx, lz) }); }
    let start = ring.findIndex((p, i) => p.d >= 0 && ring[(i - 1 + N) % N].d < 0); if (start < 0) start = 0;
    const vis = []; for (let k = 0; k < N; k++) { const p = ring[(start + k) % N]; if (p.d < 0 && vis.length) break; if (p.d >= 0) vis.push(p); }
    if (vis.length < 2) return;
    const topPts = vis.map(p => P3(p.lx, p.lz, -66)), botPts = vis.map((p, i) => P3(p.lx, p.lz, -40 + (i % 2 ? 0 : 4)));
    poly(g, [...topPts, ...botPts.reverse()]); ink(g, h.barding, 2.6);
    g.beginPath(); topPts.forEach((p, i) => i ? g.lineTo(p[0], p[1] + 3) : g.moveTo(p[0], p[1] + 3)); g.strokeStyle = P.gold; g.lineWidth = 3; g.stroke();
    g.fillStyle = P.gold; for (let i = 2; i < topPts.length - 1; i += 4) { g.beginPath(); g.arc(topPts[i][0], topPts[i][1] + 12, 2.6, 0, TAU); g.fill(); }
    const seat = P3(0, -3, -70); rr(g, seat[0] - 14, seat[1] - 2, 28, 7, 3); ink(g, P.leatherD, 2);
  };
  const neckHead = () => {
    const nb = P3(0, 22, -62), nt = P3(0, 34, -88), ht = P3(0, 38, -90), mz = P3(0, 51, -74);
    g.beginPath(); g.moveTo(...P3(0, 18, -66)); g.quadraticCurveTo(...P3(0, 24, -88), ...P3(0, 31, -96)); g.lineCap = 'round';
    g.strokeStyle = OL; g.lineWidth = 12; g.stroke();
    stick(g, nb[0], nb[1], nt[0], nt[1], 17, coat);
    g.beginPath(); g.moveTo(...P3(0, 18, -66)); g.quadraticCurveTo(...P3(0, 24, -88), ...P3(0, 31, -96)); g.strokeStyle = h.mane; g.lineWidth = 7; g.stroke();
    for (const sd of [-1, 1]) { const e = P3(sd * 4.5, 35, -101); poly(g, [[e[0] - 3, e[1] + 5], [e[0] + sd * 1.5, e[1] - 6], [e[0] + 3.5, e[1] + 5]]); ink(g, coat, 2.2); }
    stick(g, ht[0], ht[1], mz[0], mz[1], 16, coat);
    if (h.chanfron && R.c > -0.4) { stick(g, ht[0], ht[1] - 1, mz[0] + (mz[0] - ht[0]) * -0.25, mz[1] + (mz[1] - ht[1]) * -0.25 - 1, 7, P.steel); const cpt = P3(0, 40, -86); circ(g, cpt[0], cpt[1], 3); ink(g, P.gold, 1.6); }
    circ(g, mz[0], mz[1], 8); ink(g, h.muzzle || coatD, 2.5);
    if (R.c > 0.25) { g.fillStyle = OL; for (const sd of [-1, 1]) { g.beginPath(); g.arc(mz[0] + sd * 3.5 * R.c, mz[1] + 1, 1.7, 0, TAU); g.fill(); } }
    for (const sd of [-1, 1]) { if (R.D(sd * 7, 0) < -1.5) continue; const e = P3(sd * 7, 41, -86); g.fillStyle = OL; g.beginPath(); g.ellipse(e[0], e[1], 2.3, 3.2, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(e[0] + 0.8, e[1] - 1, 0.9, 0, TAU); g.fill(); }
    const b0 = P3(0, 36, -80), b1 = P3(0, 47, -74); g.strokeStyle = h.tack || P.leatherD; g.lineWidth = 2; g.beginPath(); g.moveTo(...b0); g.lineTo(...b1); g.stroke();
  };
  const tailFn = () => {
    const a = P3(0, -33, -62), b = P3(0, -42, -42), e = P3(0, -38, -22);
    g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(b[0] + tail, b[1], e[0] + tail, e[1]); g.lineCap = 'round';
    g.strokeStyle = OL; g.lineWidth = 13; g.stroke(); g.strokeStyle = h.mane; g.lineWidth = 8; g.stroke();
  };
  const headD = R.D(0, 40), tailD = R.D(0, -36);
  const order = [];
  for (const L of legs) { const d = R.D(L.lx, L.lz); order.push({ d: d < R.D(0, L.lz) - 0.5 ? -100 + d : 100 + d, f: () => drawLeg(L) }); }
  order.push({ d: headD >= 0 ? 300 : -200, f: neckHead });
  order.push({ d: tailD >= 0 ? 300 : -200, f: tailFn });
  order.push({ d: 0, f: body }); order.push({ d: 1, f: skirt });
  order.push({ d: 200, f: rider });
  order.sort((a, b) => a.d - b.d).forEach(o => o.f());
}

// ---------- roster of favorites ----------
const SK = ['#f6cba3', '#e0a77e', '#b47a55', '#8a5638'];
const base = o => Object.assign({ skin: SK[0], brows: 'neutral', mouth: 'flat', shirt: P.cloth, sleeve: P.cloth, pants: '#6b5a48', boots: P.leatherD }, o);
const UNITS = {
  'pioneer:B': { unit: 'pioneer', name: 'Wayfinder', title: 'Pioneer',
    spec: base({ skin: SK[0], mouth: 'smile', helm: 'hood', helmColor: '#3f7a58', hoodTrim: P.gold, shirt: '#3f7a58', sleeve: '#3f7a58', cape: '#3f7a58', right: 'lantern', left: null }) },
  'mason:A': { unit: 'mason', name: 'Stonecutter', title: 'Mason',
    spec: base({ helm: 'flatcap', helmColor: '#8b919c', hairColor: '#5a3a22', shirt: '#c7b28a', sleeve: '#c7b28a', apron: '#7e5a3b', back: 'rucksack', right: 'hammer', left: 'chisel', angF: -0.45, angS: 0.25, beard: { color: '#7a4a2a', style: 'stubble' } }) },
  'swordsman:B': { unit: 'swordsman', name: 'Knight-Errant', title: 'Swordsman',
    spec: base({ helm: 'greathelm', plume: P.red, shirt: P.blueD, sleeve: P.steel, armor: true, pauldrons: true, tabard: P.blue, tabardTrim: P.gold, pants: '#4a4f5c', boots: '#5b6270', gloves: P.steelD, right: 'sword', left: 'heater-knight', angS: 0.45 }) },
  'pikeman:C': { unit: 'pikeman', name: 'Iron Hedge', title: 'Pikeman',
    spec: base({ skin: SK[1], brows: 'angry', helm: 'barbute', shirt: P.chain, sleeve: P.chain, mail: true, tabard: P.blue, pants: '#4a4f5c', right: 'poleaxe', left: 'buckler', angS: 0.15 }) },
  'cavalry:B': { unit: 'cavalry', name: 'Gilded Lancer', title: 'Mace Cavalry',
    spec: base({ helm: 'greathelm', plume: P.gold, shirt: P.blueD, sleeve: P.steel, armor: true, pauldrons: true, tabard: P.blue, tabardTrim: P.gold, gloves: P.steelD, pants: '#4a4f5c', boots: '#5b6270', right: 'mace', left: 'heater-knight', rightPose: 'raised', angF: -0.3, angS: 0.55,
      horse: { coat: '#eceae4', mane: '#c9c4b8', barding: '#2f5fc0', chanfron: true, muzzle: '#d8d1c6' } }) },
  'mage:A': { unit: 'mage', name: 'Archmage', title: 'Mage',
    spec: base({ brows: 'bushy', browColor: '#f2f2f2', mouth: 'smile', helm: 'wizard', helmColor: '#3f5fc9', hairColor: '#f1f1f4', robe: '#3f5fc9', robeTrim: P.gold, sash: P.leather, sleeve: '#3f5fc9', cape: '#6a3fa8', boots: '#4a3a5a', right: 'staff-crystal', left: null, angS: 0.12, beard: { color: '#f4f4f4', style: 'long' } }) }
};
const DIRS = [
  { k: 'N', th: Math.PI }, { k: 'NE', th: 3 * Math.PI / 4 }, { k: 'E', th: Math.PI / 2 }, { k: 'SE', th: Math.PI / 4 },
  { k: 'S', th: 0 }, { k: 'SW', th: -Math.PI / 4 }, { k: 'W', th: -Math.PI / 2 }, { k: 'NW', th: -3 * Math.PI / 4 }
];
const VB = { foot: [176, 226, 186], cavalry: [224, 236, 190] };

function tile(g, big, iso) {
  const w = big ? 82 : 60, h = w / 2, y = 6, th = 9;
  if (iso) {
    poly(g, [[-w, y], [0, y + h], [0, y + h + th], [-w, y + th]]); g.fillStyle = '#5b8f37'; g.fill(); LB = null; g.lineWidth = 2.5; g.strokeStyle = OL; g.stroke();
    poly(g, [[w, y], [0, y + h], [0, y + h + th], [w, y + th]]); g.fillStyle = '#4c7a2e'; g.fill(); LB = null; g.stroke();
    poly(g, [[0, y - h], [w, y], [0, y + h], [-w, y]]); g.fillStyle = '#9bd95f'; g.fill(); LB = null; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w + 6, y - 1); g.lineTo(-3, y - h + 4); g.stroke();
  } else {
    ell(g, 0, 8, big ? 70 : 50, 14); g.fillStyle = '#76b744'; g.fill(); LB = null; g.lineWidth = 2.5; g.strokeStyle = OL; g.stroke();
    ell(g, 0, 4, big ? 70 : 50, 14); ink(g, '#9bd95f', 2.5, false);
  }
  g.strokeStyle = '#5c9c38'; g.lineWidth = 1.6;
  for (const [x, yy] of [[-30, 10], [26, 14], [-8, 22], [38, 4], [-42, 2]]) { if (Math.abs(x) > w - 10) continue; g.beginPath(); g.moveTo(x, yy); g.lineTo(x - 3, yy - 5); g.moveTo(x, yy); g.lineTo(x + 3, yy - 5); g.stroke(); }
}
function renderIso(cv, id, th, t, opts = {}) {
  const U = UNITS[id]; if (!U) return;
  const big = U.unit === 'cavalry', [VBW, VBH, OY] = opts.vb || (big ? VB.cavalry : VB.foot);
  const g = cv.getContext('2d'), k = Math.min(cv.width / VBW, cv.height / VBH);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(k, 0, 0, k, cv.width / 2, (cv.height - VBH * k) / 2 + OY * k);
  g.lineJoin = 'round'; g.lineCap = 'round';
  tile(g, big, opts.tile !== 'pad');
  const R = rig(th);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath();
  if (big) g.ellipse(0, 4, Math.hypot(18 * R.c, 46 * R.s) + 8, 10, 0, 0, TAU); else g.ellipse(0, 3, 22, 7, 0, 0, TAU);
  g.fill();
  if (big) { g.save(); g.scale(1.14, 1.14); horse(g, U.spec.horse, R, t, () => { g.save(); const seat = R.P(0, -3, -70); g.translate(seat[0], seat[1] + 16); g.scale(0.62, 0.62); humanoid(g, U.spec, R, t, true); g.restore(); }); g.restore(); }
  else humanoid(g, U.spec, R, t, false);
}

// draw a unit straight into another scene (no tile), feet at (x, y), scaled by k
function drawUnitAt(g, id, th, t, x, y, k) {
  const U = UNITS[id]; if (!U) return;
  const R = rig(th), big = U.unit === 'cavalry';
  g.save(); g.translate(x, y); g.scale(k, k); g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath();
  if (big) g.ellipse(0, 4, Math.hypot(18 * R.c, 46 * R.s) + 8, 10, 0, 0, TAU); else g.ellipse(0, 3, 22, 7, 0, 0, TAU);
  g.fill();
  if (big) { g.scale(1.14, 1.14); horse(g, U.spec.horse, R, t, () => { g.save(); const seat = R.P(0, -3, -70); g.translate(seat[0], seat[1] + 16); g.scale(0.62, 0.62); humanoid(g, U.spec, R, t, true); g.restore(); }); }
  else humanoid(g, U.spec, R, t, false);
  g.restore();
}
root.RealmIso = { UNITS, DIRS, renderIso, drawUnitAt, VB, P, base, drawItem: item, SHIELDS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
