
// ================= Government Tier I effects =================
// storage, roads, walls, the fort limit, automated Wayfinders and arrowslits
const BASE_CAP = 2000, CAP_PER_STORE = 1000;
const ROAD_COST = { gold: 25, wood: 75 }, ROAD_TIME = 8;
// road tiers: dirt, gravel, cobblestone (every road upgrades when the technology is researched)
const roadTier = () => hasTech('roads3') ? 3 : hasTech('roads2') ? 2 : 1;
const ROAD_BONUS = [0, 0.25, 0.35, 0.5], ROAD_LOOK = [null, { name: 'dirt', edge: '#8a6a3e', fill: '#c9a46b', mark: 'rgba(120,85,45,0.55)' }, { name: 'gravel', edge: '#6f6a62', fill: '#b9b3a6', mark: 'rgba(80,76,70,0.55)' }, { name: 'cobblestone', edge: '#55504b', fill: '#8f8a84', mark: 'rgba(235,230,220,0.75)' }];
const roadSpeed = () => 1 + ROAD_BONUS[roadTier()];
const WALL_COST = { gold: 100, wood: 150 }, WALL_TIME = 12;
const GATE_COST = { gold: 150, wood: 100 }, GATE_TIME = 10;
// wall strength, for when walls can be attacked: a stone wall is three times as strong as a palisade
const WALL_HP = { wood: 400, stone: 1200 };
const wallKind = () => hasTech('walls2') ? 'stone' : 'wood';
const FORT_LIMIT = [3, 5, 7, 9];
const ARROW = { every: 2, dmg: [0, 3, 5] };   // seconds between volleys; damage per volley from a fort / a capital
S.roads = new Set(); S.walls = new Set(); S.gates = new Set(); S.wallHp = {}; S.arrowAt = {};
const linkKey = (a, b) => a < b ? a + '_' + b : b + '_' + a;

// ---------- storage ----------
function storageCap(k) {
  let n = BASE_CAP + 500 * repLv('rep-storage');   // Deeper Cellars
  for (const [p, list] of S.extras) if (owned(p)) for (const e of list) { const st = BUILD_DEFS[e.type].store; if (st && st[k]) n += st[k]; }
  return n;
}
function clampStock() { for (const k of RES) { const c = storageCap(k); if (S.stock[k] > c) S.stock[k] = c; } }

// farms grow on grassland and forest; Mushroom Farming adds swamps
const farmLand = (p, mushroom) => ['grassland', 'forest'].includes(world.provinces[p].terrain) || (mushroom && world.provinces[p].terrain === 'swamp');

// ---------- building output with research bonuses ----------
// Advanced, Refined and Sophisticated versions each add the same bonus again
const TECH_GIVES = { farm: [['advfarms', 'reffarms', 'sophfarms'], { food: 1 }], lumber: [['advmills', 'refmills', 'sophmills'], { wood: 1 }], goldmine: [['advmines', 'refmines', 'sophmines'], { gold: 2 }] };
function givesOf(type) {
  const base = { ...(BUILD_DEFS[type].gives || {}) }, t = TECH_GIVES[type];
  if (t) for (const id of t[0]) if (hasTech(id)) for (const k in t[1]) base[k] = (base[k] || 0) + t[1][k];
  return base;
}

// ---------- fort limit ----------
const fortLimit = () => FORT_LIMIT[['forts', 'forts2', 'forts3'].filter(hasTech).length] + repLv('rep-forts');
const fortCount = () => [...S.buildings].filter(([, b]) => b.owner === ME && b.stage === 1).length + S.upgrades.size;

// ---------- roads and walls ----------
// both are built by a Mason standing in one of the two provinces, across an open border
const openBetween = (p, q) => openNbr[p].some(n => n.q === q);
function linkWhy(type, m, q) {
  const p = m.prov;
  if (type === 'road' && !hasTech('roads')) return 'Research Dirt Roads first';
  if (type === 'wall' && !hasTech('walls')) return 'Research Wooden Walls first';
  if (type === 'gate') {
    if (!hasTech('gates')) return 'Research Wall Gates first';
    if (p === q || !allNbr[p].includes(q)) return 'The Mason must stand next door';
    if (!wallBetween(p, q)) return 'There is no wall on that border';
    if (S.gates.has(linkKey(p, q))) return 'There is already a gate';
    if (!owned(p) || !owned(q)) return 'You must own both provinces';
    if (m.moving) return 'He is walking';
    if (m.build) return 'He is already building';
    return lackText(GATE_COST);
  }
  if (p === q) return 'Pick a neighboring province';
  if (!allNbr[p].includes(q)) return `The Mason must stand next door`;
  if (!openBetween(p, q)) return 'That border is already closed';
  if (!S.explored.has(q)) return 'Explore it first';
  if (!owned(p) && !owned(q)) return 'One side must be your land';
  if (m.moving) return 'He is walking';
  if (m.build) return 'He is already building';
  if (S.units.some(u => u.build && (u.build.type === 'road' || u.build.type === 'wall') && linkKey(u.build.prov, u.build.to) === linkKey(p, q))) return 'Already under way';
  if (type === 'road') { if (S.roads.has(linkKey(p, q))) return 'There is already a road'; return lackText(ROAD_COST); }
  // a wall may not cut off either province: each needs another open border left
  if (openNbr[p].filter(n => n.q !== q).length < 1) return `It would cut off ${provName(p)}`;
  if (openNbr[q].filter(n => n.q !== p).length < 1) return `It would cut off ${provName(q)}`;
  return lackText(WALL_COST);
}
function startLink(m, q, type) {
  const why = linkWhy(type, m, q); if (why) return toast(`Can’t build a ${type} there: ${why.toLowerCase()}.`, true);
  const cost = type === 'road' ? ROAD_COST : type === 'gate' ? GATE_COST : WALL_COST;
  for (const k in cost) S.stock[k] -= cost[k];
  m.surveyQueue = []; m.pending = null;
  m.build = { prov: m.prov, to: q, type, t0: S.t, paid: { ...cost }, dur: type === 'road' ? ROAD_TIME : type === 'gate' ? GATE_TIME : WALL_TIME };
  toast(`Building a ${type} to ${provName(q)}… (−${costText(cost)}, ${m.build.dur} s)`);
}
function finishLink(b) {
  const { prov: p, to: q, type } = b;
  if (type === 'road') { S.roads.add(linkKey(p, q)); toast(`Road finished between ${provName(p)} and ${provName(q)}. Units move ${Math.round(ROAD_BONUS[roadTier()] * 100)}% faster along it.`); return; }
  if (type === 'gate') { S.gates.add(linkKey(p, q)); hoverPath = undefined; toast(`Gate finished between ${provName(p)} and ${provName(q)}. Only your units can pass.`); return; }
  if (!openBetween(p, q)) return;
  world.edges.forEach((e, i) => {
    if (!e.open || !((e.a === p && e.b === q) || (e.a === q && e.b === p))) return;
    e.open = false; e.style = 'wall'; S.walls.add(i); S.wallHp[i] = WALL_HP[wallKind()];
    const V = world.vertices, a = V[e.v[0]], c = V[e.v[1]], mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2;
    G.crossings = G.crossings.filter(x => Math.hypot(x.x - mx, x.y - my) > 1);
  });
  openNbr[p] = openNbr[p].filter(n => n.q !== q); openNbr[q] = openNbr[q].filter(n => n.q !== p);
  S.roads.delete(linkKey(p, q));
  cacheDirty = true; fogDirty = true; hoverPath = undefined;
  // anyone marching through that border finds another way
  for (const u of S.units) {
    if (!u.moving) continue;
    let prev = u.prov, hit = false;
    for (const w of u.path) if (w.enter !== undefined) { if (linkKey(prev, w.enter) === linkKey(p, q)) hit = true; prev = w.enter; }
    if (!hit) continue;
    const fin = u.final; u.path = []; u.moving = false;
    if (fin === undefined || !order(u, fin, true)) { u.slot = freeSlot(u.prov, u); const [x, y] = slotPos(u.prov, u.slot); u.path = [{ x, y, slot: true }]; u.moving = true; }
  }
  toast(`${wallKind() === 'stone' ? 'Stone wall' : 'Palisade'} finished between ${provName(p)} and ${provName(q)}. That border is now closed.`);
}
// is a unit walking along a road right now?
function onRoad(u, wp) {
  if (!S.roads.size) return false;
  if (wp.enter !== undefined) return S.roads.has(linkKey(u.prov, wp.enter));
  return u.lastProv !== undefined && S.roads.has(linkKey(u.lastProv, u.prov));
}
// gates: a wall edge between two provinces that only the builder's units may cross
function wallBetween(p, q) { for (const i of S.walls) { const e = world.edges[i]; if ((e.a === p && e.b === q) || (e.a === q && e.b === p)) return e; } return null; }
function gateNbr(a) {
  const out = [];
  for (const k of S.gates) { const [p, q] = k.split('_').map(Number); if (p !== a && q !== a) continue; const e = wallBetween(p, q); if (!e) continue; const V = world.vertices, x = V[e.v[0]], y = V[e.v[1]]; out.push({ q: p === a ? q : p, m: [(x[0] + y[0]) / 2, (x[1] + y[1]) / 2] }); }
  return out;
}
const pathNbr = (u, a) => u.owner === ME && S.gates.size ? openNbr[a].concat(gateNbr(a)) : openNbr[a];
function roadPath(p, q) {
  const n = openNbr[p].find(x => x.q === q), a = G.provs[p].ic, b = G.provs[q].ic;
  const m = n ? n.m : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return [a, m, b];
}
function strokeRoad(g, pts, f = 1) {
  // the road grows from the first province toward the second as it is built
  const segs = [[pts[0], pts[1]], [pts[1], pts[2]]], L = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])), total = L[0] + L[1];
  let left = total * f; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  segs.forEach(([a, b], i) => { if (left <= 0) return; const k = Math.min(1, left / L[i]); g.lineTo(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k); left -= L[i]; });
  const RL = ROAD_LOOK[roadTier()];
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = 14; g.strokeStyle = OL; g.stroke();
  g.lineWidth = 10; g.strokeStyle = RL.fill; g.stroke();
  if (RL.name === 'dirt') { g.lineWidth = 1.6; g.strokeStyle = RL.mark; g.setLineDash([6, 9]); g.stroke(); }
  else if (RL.name === 'gravel') { g.lineWidth = 2.4; g.strokeStyle = RL.mark; g.setLineDash([1, 5]); g.stroke(); }
  else { g.lineWidth = 7; g.strokeStyle = RL.mark; g.setLineDash([4, 3]); g.lineCap = 'butt'; g.stroke(); g.lineWidth = 1.2; g.strokeStyle = RL.edge; g.setLineDash([]); g.stroke(); }
  g.setLineDash([]); g.lineCap = 'round';
}
// a wooden palisade: a row of sharpened stakes with a rail
function strokePalisade(g, a, b, f = 1) {
  const ex = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], len = Math.hypot(ex[0] - a[0], ex[1] - a[1]), L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  g.beginPath(); g.moveTo(a[0], a[1] - 6); g.lineTo(ex[0], ex[1] - 6); g.lineCap = 'round'; g.lineWidth = 6; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#8a5f3a'; g.stroke();
  for (let d = 4; d < len; d += 9) {
    const x = a[0] + ux * d, y = a[1] + uy * d, h = 20 + (Math.floor(d / 9) % 3) * 2;
    g.beginPath(); g.moveTo(x - 4, y + 3); g.lineTo(x - 4, y - h); g.lineTo(x, y - h - 6); g.lineTo(x + 4, y - h); g.lineTo(x + 4, y + 3); g.closePath();
    g.fillStyle = '#b07a45'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x - 3, y - h + 1, 1.6, h);
  }
}
function drawGate(g, a, b) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  for (const s of [-1, 1]) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), x = mx + (b[0] - a[0]) / L * 16 * s, y = my + (b[1] - a[1]) / L * 16 * s; g.beginPath(); g.rect(x - 7, y - 30, 14, 32); g.fillStyle = '#d8d2c4'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.moveTo(x - 9, y - 30); g.lineTo(x, y - 40); g.lineTo(x + 9, y - 30); g.closePath(); g.fillStyle = '#3f72d9'; g.fill(); g.stroke(); }
  g.beginPath(); g.moveTo(mx - 9, my + 2); g.lineTo(mx - 9, my - 14); g.quadraticCurveTo(mx, my - 24, mx + 9, my - 14); g.lineTo(mx + 9, my + 2); g.closePath(); g.fillStyle = '#7b5029'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(mx, my + 2); g.lineTo(mx, my - 18); g.stroke();
}
function drawWallEdge(g, a, b, f = 1, t = 0) { (wallKind() === 'stone' ? strokeWall : strokePalisade)(g, a, b, f, t); }
function strokeWall(g, a, b, f = 1, t = 0) {
  const ex = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], len = Math.hypot(ex[0] - a[0], ex[1] - a[1]), ux = (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), uy = (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(a[0], a[1] + 8); g.lineTo(ex[0], ex[1] + 8); g.lineWidth = 22; g.strokeStyle = OL; g.stroke(); g.lineWidth = 16; g.strokeStyle = '#8f877a'; g.stroke();
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(ex[0], ex[1]); g.lineWidth = 22; g.strokeStyle = OL; g.stroke(); g.lineWidth = 16; g.strokeStyle = '#cfc8ba'; g.stroke();
  // merlons along the top
  for (let d = 10; d < len - 6; d += 20) { const x = a[0] + ux * d, y = a[1] + uy * d; g.beginPath(); g.rect(x - 5, y - 13, 10, 9); g.fillStyle = '#e2dccf'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); }
  for (const [x, y] of f >= 1 ? [a, b] : [a]) { g.beginPath(); g.ellipse(x, y - 4, 13, 11, 0, 0, Math.PI * 2); g.fillStyle = '#d8d2c4'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(x, y - 9, 9, 5, 0, 0, Math.PI * 2); g.fillStyle = '#ece6da'; g.fill(); g.lineWidth = 2; g.stroke(); }
}
function drawLinks(g, t) {
  for (const k of S.roads) { const [p, q] = k.split('_').map(Number); if (S.explored.has(p) || S.explored.has(q)) strokeRoad(g, roadPath(p, q)); }
  for (const u of S.units) if (u.build && u.build.type === 'road') strokeRoad(g, roadPath(u.build.prov, u.build.to), Math.min(1, (t - u.build.t0) / u.build.dur));
  const V = world.vertices;
  for (const i of S.walls) { const e = world.edges[i]; if (S.explored.has(e.a) || S.explored.has(e.b)) { drawWallEdge(g, V[e.v[0]], V[e.v[1]], 1, t); if (S.gates.has(linkKey(e.a, e.b))) drawGate(g, V[e.v[0]], V[e.v[1]]); } }
  for (const u of S.units) if (u.build && u.build.type === 'wall') world.edges.forEach(e => { if (e.open && ((e.a === u.build.prov && e.b === u.build.to) || (e.b === u.build.prov && e.a === u.build.to))) drawWallEdge(g, V[e.v[0]], V[e.v[1]], Math.min(1, (t - u.build.t0) / u.build.dur), t); });
  for (const u of S.units) if (u.build && u.build.type === 'gate') { const e = wallBetween(u.build.prov, u.build.to); if (e && Math.sin(t * 8) > -0.2) { g.save(); g.globalAlpha = 0.4 + 0.6 * Math.min(1, (t - u.build.t0) / u.build.dur); drawGate(g, V[e.v[0]], V[e.v[1]]); g.restore(); } }
}

// ---------- automated Wayfinders ----------
function autoSurvey(u, t) {
  if (u.kind !== WAYFINDER || u.owner !== ME || u.auto === false || !hasTech('autoscout') || busy(u) || (u.nextAuto || 0) > t) return;
  u.nextAuto = t + 1;
  // automatic Wayfinders only walk through land you already know
  let best = -1, bd = Infinity;
  u.autoWalk = { to: -1 };
  for (const p of S.explored) {
    if (S.surveyed.has(p) || surveyQueued(p)) continue;
    const hops = p === u.prov ? [] : findPath(u, p); if (!hops) continue;
    const d = hops.length * 1000 + Math.hypot(G.provs[p].ic[0] - u.x, G.provs[p].ic[1] - u.y);
    if (d < bd) { bd = d; best = p; }
  }
  if (best >= 0) { u.surveyQueue.push(best); return; }
  // nothing left to survey: explore the nearest unknown province next to known land
  let next = -1; bd = Infinity;
  for (const p of S.explored) for (const n of openNbr[p]) {
    const q = n.q; if (S.explored.has(q) || S.units.some(v => v !== u && v.autoWalk && v.autoWalk.to === q)) continue;
    u.autoWalk = { to: q }; const hops = findPath(u, q); u.autoWalk = { to: -1 };
    if (!hops) continue;
    const d = hops.length * 1000 + Math.hypot(G.provs[q].ic[0] - u.x, G.provs[q].ic[1] - u.y);
    if (d < bd) { bd = d; next = q; }
  }
  if (next >= 0) { u.autoWalk = { to: next }; order(u, next, true); }
  else u.autoWalk = null;
}

// ---------- arrowslits ----------
function stepArrows(t) {
  for (const [p, b] of S.buildings) {
    if (b.stage < 1 || !isNation(b.owner) || !techOf(b.owner, 'arrowslits') || S.battles.some(x => x.prov === p)) continue;
    const foes = S.units.filter(v => v.kind === 'army' && hostile(v.owner, b.owner) && v.prov === p && !v.moving && !v.retreating && !v.battle && troopCount(v) > 0);
    if (!foes.length) { delete S.arrowAt[p]; continue; }
    if (S.arrowAt[p] === undefined) { S.arrowAt[p] = t + ARROW.every; if (S.visible.has(p) && (b.owner === ME || foes.some(a => a.owner === ME))) toast(`The ${b.stage === 2 ? 'capital' : 'fort'} at ${provName(p)} looses arrows at the invaders!`); continue; }
    if (t < S.arrowAt[p]) continue;
    S.arrowAt[p] = t + ARROW.every;
    applyDamage({ prov: p, lost: {} }, foes, ARROW.dmg[b.stage], t);
    const c = G.provs[p].ic, top = [c[0], c[1] - (b.stage === 2 ? 110 : 75)];
    for (const a of foes) for (let k = 0; k < 3; k++) S.fx.push({ kind: 'arrow', prov: p, owner: a.owner, x0: top[0] + (k - 1) * 8, y0: top[1], x1: a.x + (k - 1) * 6, y1: a.y - 8, t0: t + k * 0.08 });
    for (const a of foes) if (troopCount(a) <= 0) { removeArmy(a); if (a.owner === ME || b.owner === ME) toast(`${a.name} was shot down by the arrowslits.`); }
  }
}
function drawArrows(g, t) {
  for (const f of S.fx) {
    if (f.kind !== 'arrow' || !S.visible.has(f.prov)) continue;
    const k = (t - f.t0) / 0.45; if (k < 0 || k > 1) continue;
    const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 40;
    const k2 = Math.max(0, k - 0.06), x2 = f.x0 + (f.x1 - f.x0) * k2, y2 = f.y0 + (f.y1 - f.y0) * k2 - Math.sin(k2 * Math.PI) * 40;
    g.beginPath(); g.moveTo(x2, y2); g.lineTo(x, y); g.lineCap = 'round'; g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2; g.strokeStyle = '#e8d6a8'; g.stroke();
  }
}

// stone walls: when researched, every palisade is rebuilt in stone
let wallsWereStone = false;
function stepWallUpgrade() { if (!wallsWereStone && hasTech('walls2')) { wallsWereStone = true; for (const i of S.walls) S.wallHp[i] = WALL_HP.stone; } }

// ---------- Wayfinder stealth and danger ----------
// an enemy army that finds a Wayfinder kills him; a sneaking (stealthed) Wayfinder can't be seen yet
// A Wayfinder who meets enemy soldiers runs back to the province he came from, unharmed (as with bandits).
// For 15 s after he gets there he is marked: if he ends up beside enemy soldiers again, a friendly army has 5 s to reach him
// before he is caught. A friendly army in the province always protects him. Sneaking Wayfinders can't be seen at all.
const SCOUT_MARK = 15, SCOUT_RESCUE = 5;
function stepScouts(t) {
  stepWallUpgrade();
  for (const u of S.units.slice()) {
    if (u.kind !== WAYFINDER) continue;
    const mine = u.owner === ME;
    if (mine && u.stealth && !hasTech('stealth')) u.stealth = false;
    if (u.stealth) continue;
    // reached safety after running: the 15-second mark starts now
    if (u.warFlee && !u.fleeing && !u.moving) { u.warFlee = false; u.markUntil = t + SCOUT_MARK; }
    const foe = S.units.find(v => v.kind === 'army' && !v.bandit && hostile(v.owner, u.owner) && v.prov === u.prov && !v.retreating && troopCount(v) > 0);   // Bandit Gangs never catch a Wayfinder
    const guard = foe && S.units.some(v => v.kind === 'army' && v.owner === u.owner && v.prov === u.prov && troopCount(v) > 0);
    if (!foe || guard) { if (u.doomAt) { u.doomAt = 0; if (mine) toast(guard ? `${u.name} is safe: your army reached him.` : `${u.name} got away.`); } continue; }
    if (u.fleeing) continue;   // already running
    if (u.doomAt) {
      if (t < u.doomAt) continue;
      S.units = S.units.filter(v => v !== u); S.selected = S.selected.filter(v => v !== u);
      if (S.visible.has(u.prov)) S.fx.push({ kind: 'fall', prov: u.prov, owner: u.owner, unit: WAYFINDER, t0: t, r: 0.5 });
      if (mine) { computeIncome(); cmdKey = ''; rosterKey = ''; toast(`${u.name} was caught by ${foe.name} and killed.${hasTech('stealth') ? ' Sneaking Wayfinders can’t be seen.' : ''}`, true); }
      continue;
    }
    // still marked, or nowhere to run: a friendly army has 5 seconds to save him
    const back = u.lastProv;
    if (t < (u.markUntil || 0) || back === undefined || back === u.prov) {
      u.doomAt = t + SCOUT_RESCUE; u.path = []; u.moving = false;
      if (mine) { toast(`${u.name} is cornered by ${foe.name} at ${provName(u.prov)}! Get an army there within ${SCOUT_RESCUE} seconds to save him.`, true); sfx('wn_enemy'); }
      continue;
    }
    // first sight of the enemy: run back the way he came
    u.path = []; u.moving = false; u.scouting = null; u.survey = null; u.aiSurvey = null; u.aiTarget = undefined; if (u.surveyQueue) u.surveyQueue = []; u.pendingSurvey = -1; u.autoWalk = null;
    u.fleeing = false;
    if (!order(u, back, true)) { u.doomAt = t + SCOUT_RESCUE; if (mine) toast(`${u.name} is cornered by ${foe.name} at ${provName(u.prov)}! Get an army there within ${SCOUT_RESCUE} seconds to save him.`, true); continue; }
    u.fleeing = true; u.warFlee = true;
    if (mine) { S.selected = S.selected.filter(v => v !== u); cmdKey = ''; rosterKey = ''; sfx('wn_enemy'); toast(`${u.name} spotted ${foe.name} at ${provName(u.prov)} and is running back to ${provName(back)}.`, true); }
  }
}

// ---------- outpost limit ----------
// 4 outposts for every fort (the capital counts as one); the third Fort Charter removes the limit
const OUTPOSTS_PER_FORT = 4, OUTPOST_UPKEEP = { wood: 1 };
const outpostCount = () => [...S.buildings].filter(([p, b]) => b.owner === ME && b.stage === 0 && !S.upgrades.has(p)).length;
const outpostLimit = () => hasTech('forts3') ? Infinity : OUTPOSTS_PER_FORT * ([...S.buildings].filter(([, b]) => b.owner === ME && b.stage >= 1).length + S.upgrades.size);
const pendingOutposts = () => S.units.filter(u => u.owner === ME && ((u.build && u.build.type === 'outpost') || (u.pending && u.pending.type === 'outpost'))).length;
function outpostWhy() {
  const lim = outpostLimit(); if (lim === Infinity) return null;
  const n = outpostCount() + pendingOutposts();
  return n >= lim ? `Outpost limit reached (${n}/${lim}) · each Fort allows 4 more` : null;
}

// soldiers in your armies (Mages don't count)
const soldierCount = (o = ME) => S.units.reduce((n, v) => n + (v.kind === 'army' && v.owner === o ? Object.entries(v.troops).reduce((m, [k, c]) => m + (k === MAGE ? 0 : c), 0) : 0), 0);

// ---------- army exhaustion ----------
// every payout you can't pay or feed the army adds 1; at 10 the whole army walks off. Every 10 s with enough to spare takes 1 away.
const EXHAUST_MAX = 10;
S.exhaust = 0; S.exhaustOk = 0;
function stepExhaustion(short) {
  if (short && soldierCount() > 0) {
    S.exhaust++; S.exhaustOk = 0;
    if (S.exhaust >= EXHAUST_MAX) {
      const gone = soldierCount();
      for (const a of S.units.filter(v => v.kind === 'army' && v.owner === ME)) removeArmy(a);
      S.exhaust = 0;
      sfx('wn_unrest');
      toast(`Army Exhaustion! Unfed, your whole army (${gone} soldiers) has abandoned you.`, true);
    } else { if (S.exhaust === 5) sfx('wn_exhaust'); } if (S.exhaust > 0 && S.exhaust < EXHAUST_MAX) toast(`Army Exhaustion ${S.exhaust}/${EXHAUST_MAX}: you can’t feed your soldiers. At ${EXHAUST_MAX} they all desert.`, true);
    return;
  }
  // "more than enough": income covers upkeep with stock to spare; recovers one step every 10 s (every second payout)
  if (S.exhaust > 0 && income.food >= 0 && S.stock.food > 0) {
    if (++S.exhaustOk >= 1) { S.exhaustOk = 0; S.exhaust--; }
  } else S.exhaustOk = 0;
}

// ---------- tyranny exhaustion ----------
// past 10 provinces the locals need watching: you need at least one soldier per province you hold.
// Every payout short of that adds 1; at 15 the province farthest from the capital is abandoned (settlement and buildings lost)
// and the count starts over. Every 10 s without falling short takes 1 away.
const TYRANNY_FREE = 10, TYRANNY_MAX = 15;
S.tyranny = 0; S.tyrannyOk = 0;
function tyrannyNeed() { const n = [...S.buildings.values()].filter(b => b.owner === ME).length; return n > TYRANNY_FREE ? n : 0; }
function stepTyranny() {
  const need = tyrannyNeed(), have = soldierCount();
  if (need && have < need) {
    S.tyranny++; S.tyrannyOk = 0;
    if (S.tyranny >= TYRANNY_MAX) { S.tyranny = 0; abandonFarthest(); }
    else if (S.tyranny === 1 || S.tyranny % 5 === 0) { if (S.tyranny % 5 === 0) sfx('wn_exhaust'); } if (S.tyranny > 0 && (S.tyranny === 1 || S.tyranny % 5 === 0)) toast(`Tyranny Exhaustion ${S.tyranny}/${TYRANNY_MAX}: your ${need} provinces need ${need} soldiers to keep order (you have ${have}). At ${TYRANNY_MAX} the farthest province is abandoned.`, true);
    return;
  }
  if (S.tyranny > 0 && ++S.tyrannyOk >= 1) { S.tyrannyOk = 0; S.tyranny--; }
}
function abandonFarthest() {
  const cap = S.capital, d = hopsFrom(cap, allNbr);
  const mine = [...S.buildings].filter(([p, b]) => b.owner === ME && p !== cap).map(([p]) => p);
  if (!mine.length) return;
  const p = mine.sort((a, b) => (d[b] === Infinity ? 999 : d[b]) - (d[a] === Infinity ? 999 : d[a]))[0];
  const lost = extrasIn(p).length;
  for (const u of S.units) { if (u.build && u.build.prov === p) cancelBuild(u); if (u.pending && u.pending.prov === p) u.pending = null; }
  S.buildings.delete(p); S.extras.delete(p); S.upgrades.delete(p); for (const k of [...S.xup.keys()]) if (k.startsWith(p + '@')) S.xup.delete(k); S.occ.delete(p);
  if (S.selBuilding === p) S.selBuilding = -1;
  territory = null; cacheDirty = true; fogDirty = true; computeIncome();
  sfx('wn_unrest');
  toast(`Tyranny Exhaustion! The people of ${provName(p)} have thrown you out: the ${lost ? 'outpost and its ' + lost + ' building' + (lost > 1 ? 's are' : ' is') : 'outpost is'} lost.`, true);
}
