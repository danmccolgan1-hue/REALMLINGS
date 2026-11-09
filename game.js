// ================= game: fog of war, units, outposts =================
const opts = { passages: false, labels: false };
const KB = 0.5;          // settlement drawing scale on the map
const UK = 0.21;         // unit drawing scale on the map
// provinces are drawn WORLD_K times larger than the generator makes them, so units and buildings have room to move about
const WORLD_K = 2;
const BAND_IN = 50;      // how far a province's open ground stays clear of a mountain / tree / ruin / river border band
const DECOR_N = 3;       // interior decoration count multiplier for the larger provinces
const BLEND = 70;        // how far terrain colors blend across a border (world units)
function scaleWorld(w) {
  if (w.scaledK) return w;
  w.vertices = w.vertices.map(([x, y]) => [x * WORLD_K, y * WORLD_K]);
  for (const p of w.provinces) if (p.site) p.site = [p.site[0] * WORLD_K, p.site[1] * WORLD_K];
  if (w.center) w.center = [w.center[0] * WORLD_K, w.center[1] * WORLD_K];
  if (w.W) w.W *= WORLD_K; if (w.H) w.H *= WORLD_K;
  w.scaledK = WORLD_K; return w;
}
const SPEED = 75 * WORLD_K;    // world units per second (scaled with the map; halved from the original 150)
// an army walks at the pace of its slowest soldier
// (the slowest troop with any soldiers left sets the pace: cavalry, infantry and Mages in one army all walk at the slowest one's speed)
const unitSpeed = u => { if (u.kind !== 'army') return UNIT_SPEED[u.kind] || 1; const ks = Object.keys(u.troops).filter(k => u.troops[k] > 0); return ks.length ? Math.min(...ks.map(k => troopSpeed(k, u.owner))) : 1; };
const UNIT_SPEED = { 'pioneer:B': 1, 'mason:A': 0.5 };   // soldiers' speeds come from their Armory design   // the Mason walks at half speed
const BUILD_TIME = 30;   // seconds for most structures (outposts and buildings)
const SLOW_BUILD = new Set(['forge', 'magetower']);   // Forges and Mage Towers take twice as long
const buildTime = type => SLOW_BUILD.has(type) ? 60 : BUILD_TIME;
const OUTPOST_COST = { wood: 25 };
const SURVEY_TIME = 30;  // seconds
const CAPITAL_BONUS = { gold: 5, wood: 5, food: 5 };
// seconds per unit: Wayfinders and Masons 12 s, soldiers 18 s, Mages 30 s
const trainTime = kind => kind === 'mage:A' ? 30 : (kind === 'pioneer:B' || kind === 'mason:A') ? 12 : 18;
const UNIT_DEFS = {
  'pioneer:B': { name: 'Wayfinder', cost: { gold: 50 }, upkeep: { food: 1 }, blurb: 'Explores fog and surveys land.' },
  'mason:A': { name: 'Mason', cost: { gold: 50 }, upkeep: { food: 1 }, blurb: 'Builds outposts and buildings.' }
  // soldiers are added here from the Armory: one entry per design
};
const MILITARY = new Set();
UNIT_DEFS.army = { name: 'Army', cost: {}, upkeep: {}, blurb: 'A group of soldiers that moves as one.' };
const TRAINS = { capital: ['pioneer:B', 'mason:A'] };
const START_STOCK = { gold: 50, wood: 50, food: 50 };
const WAYFINDER = 'pioneer:B', MASON = 'mason:A';
const PLAYERS = { 1: { name: 'Player 1', color: '#2f6fe0', light: '#7fb0ff' }, 2: { name: 'Crimson Kingdom', color: '#d23b3b', light: '#ff9a9a' }, 3: { name: 'Raiders', color: '#8a5a2b', light: '#d6a46a' } };
const ME = 1;
let openNbr = [], allNbr = [], fogDirty = true;
// a province is player-owned when it holds one of your buildings (capital, fort or outpost)
const owned = i => { const b = S.buildings.get(i); return !!b && b.owner === ME; };
const bordersOwned = i => allNbr[i].some(owned);
const fcache = document.createElement('canvas'), fctx = fcache.getContext('2d');
const S = { xup: new Map(), occ: new Map(), occProg: new Map(), known: new Set(), dipPick: new Set(), dipHover: -1, upgrades: new Map(), battles: [], fx: [], selProv: -1, selPart: null, extras: new Map(), selBuilding: -1, selKind: 'capital', queues: {}, nextId: 3, surveyed: new Map(), stock: { ...START_STOCK }, paused: false, t: 0, pops: [], nextTick: 0, units: [], buildings: new Map(), wf: new Set(), visible: new Set(), explored: new Set(), selected: [], sig: '', last: 0, capital: -1 };
const primary = () => S.selected[0] || null;
const isSel = u => S.selected.includes(u);
const SCOUT_SLOW = 4;   // a Wayfinder crosses unexplored land four times slower
// unit standing spots sit beside the settlement; the four building spots sit above and below it
const SLOTS = [[-30, 62], [30, 62], [0, 78], [-118, 42], [118, 42], [-112, -54], [112, -54]];
// building plots: top two, bottom two, then the two side plots only a capital opens up
const BSLOTS = [[-70, -96], [70, -96], [-76, 82], [76, 82], [-122, -8], [122, -8]];
// each province scatters its building plots a little differently around the settlement (fixed per province, so they never move)
const bslotCache = new Map();
function bslotOf(p, slot) {
  let list = bslotCache.get(p);
  if (!list || list.seed !== world.seed) {
    const r = rngFrom(world.seed + ':plots:' + p), P = G.provs[p], c = P.ic; list = []; list.seed = world.seed;
    for (let k = 0; k < BSLOTS.length; k++) {
      const [bx, by] = BSLOTS[k], a0 = Math.atan2(by, bx), r0 = Math.hypot(bx, by);
      let pick = null;
      for (let tries = 0; tries < 40 && !pick; tries++) {
        const a = a0 + (r() - 0.5) * 0.8, rad = Math.max(112, r0 * (0.95 + r() * 0.55)), x = Math.cos(a) * rad, y = Math.sin(a) * rad * 0.92;
        if (!inPoly(c[0] + x, c[1] + y, P.inner) || distToEdges(c[0] + x, c[1] + y, P.inner) < 46) continue;
        if (list.some(([qx, qy]) => Math.hypot(qx - x, (qy - y) * 1.3) < 84)) continue;
        if (SLOTS.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 44)) continue;
        if (Math.abs(x) < 100 && y > 84 && y < 170) continue;   // keep clear of the resource badge under the settlement
        pick = [Math.round(x), Math.round(y)];
      }
      list.push(pick || [bx, by]);
    }
    bslotCache.set(p, list);
  }
  return list[slot] || BSLOTS[slot];
}
const MAX_EXTRAS = 6;
// plots open in a province by settlement stage: outpost 2, fort 4, capital 6
const PLOTS_BY_STAGE = [2, 4, 6];
const plotCap = p => { const b = S.buildings.get(p); return b ? PLOTS_BY_STAGE[b.stage] : 0; };
const FORT_UPGRADE = { cost: { gold: 200, wood: 300 }, time: 15 };
const BUILD_DEFS = {
  farm: { name: 'Farm', variant: 0, cost: { gold: 50, wood: 100 }, upkeep: { wood: 2 }, gives: { food: 5 } },
  lumber: { name: 'Lumber Mill', variant: 1, cost: { gold: 25, wood: 100 }, upkeep: {}, gives: { wood: 4 } },   // no upkeep at all (GPC29)
  goldmine: { name: 'Gold Mine', variant: 2, cost: { wood: 300 }, upkeep: { wood: 2 }, gives: { gold: 10 } },
  barracks: { name: 'Barracks', variant: 2, cost: { gold: 100, wood: 300 }, upkeep: { wood: 4 }, note: 'trains infantry' },
  stable: { name: 'Stable', variant: 1, cost: { gold: 300, wood: 400 }, upkeep: { wood: 6 }, note: 'with a Barracks: cavalry', tech: 'stable' },
  // unlocked by Government research (costs are placeholders)
  market: { name: 'Marketplace', variant: 0, cost: { gold: 50, wood: 150 }, upkeep: { wood: 1 }, gives: { gold: 3 }, tech: 'market', blurb: 'A small, steady gold income; can be built in any province.' },
  granary: { name: 'Granary', variant: 0, cost: { gold: 50, wood: 150 }, upkeep: { wood: 1 }, store: { food: 1000 }, tech: 'granary', note: '+1000 food storage', blurb: 'Raises the nation’s food storage by 1000 (it starts at 2000).' },
  storehouse: { name: 'Storehouse', variant: 0, cost: { gold: 50, wood: 100 }, upkeep: { wood: 1 }, store: { wood: 1000 }, tech: 'storehouse', note: '+1000 wood storage', blurb: 'Raises the nation’s wood storage by 1000 (it starts at 2000).' },
  bank: { name: 'Bank', variant: 0, cost: { wood: 300 }, upkeep: { wood: 1 }, store: { gold: 1000 }, tech: 'bank', note: '+1000 gold storage', blurb: 'Raises the nation’s gold storage by 1000 (it starts at 2000).' },
  // research buildings: each upgrades twice; costs are placeholders
  forge: { name: 'Forge', variant: 0, cost: { gold: 150, wood: 200 }, upkeep: { wood: 3 }, tech: 'forge', blurb: 'Unlocks Military research and adds 2 Military points every 10 s. Upgrades to a Battle Forge, then a War Forge.',
    levels: ['Forge', 'Battle Forge', 'War Forge'], ups: [null, { cost: { gold: 300, wood: 300 }, time: 20 }, { cost: { gold: 600, wood: 500 }, time: 30 }] },
  magetower: { name: 'Mage Tower', variant: 0, cost: { gold: 200, wood: 150 }, upkeep: { wood: 3 }, tech: 'magetower', blurb: 'Unlocks Magic research and adds 2 Magic points every 10 s. Upgrades to a Mage Sanctum, then a Mage Arcanum.',
    levels: ['Mage Tower', 'Mage Sanctum', 'Mage Arcanum'], ups: [null, { cost: { gold: 400, wood: 200 }, time: 20 }, { cost: { gold: 800, wood: 300 }, time: 30 }] },
  temple: { name: 'Temple', variant: 0, cost: { gold: 150, wood: 200 }, upkeep: { wood: 3 }, research: { gov: 2 }, note: '+2 Government research', blurb: 'A marble temple: adds 2 Government research points every payout. No research needed to build it; it never upgrades.' }
};
const BUILD_ORDER = Object.keys(BUILD_DEFS);
const EB = 0.4;          // scale of province buildings on the map

function setupGame() {
  openNbr = world.provinces.map(() => []);
  allNbr = world.provinces.map(p => p.nbr);
  world.edges.forEach(e => {
    if (!e.open) return;
    const a = world.vertices[e.v[0]], b = world.vertices[e.v[1]], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    openNbr[e.a].push({ q: e.b, m }); openNbr[e.b].push({ q: e.a, m });
  });
  // the capital: an inland grassland with plenty of open borders, near the middle of the island
  const [x0, y0, x1, y1] = G.bounds, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  let best = -1, bs = -Infinity;
  // always grassland; prefer inland ones with many open borders near the middle of the island
  G.provs.forEach((p, i) => {
    if (p.terrain !== 'grassland') return;
    const sc = openNbr[i].length * 420 - Math.hypot(p.ic[0] - mx, p.ic[1] - my) - (p.coastal || p.lakeside ? 2000 : 0);
    if (sc > bs) { bs = sc; best = i; }
  });
  rollYields();
  S.capital = best;
  S.buildings.set(best, { stage: 2, born: -10, owner: ME });
  S.surveyed.set(best, -10);   // your home province is already known
  territory = null; computeIncome();
  setupCapitalPanel();
  usedNames.clear(); armyCounter = 0;
  S.units = [mkUnit(1, WAYFINDER, 'Wayfinder', best, 0), mkUnit(2, MASON, 'Mason', best, 1)];
  S.nextId = Math.max(S.nextId || 0, 3);
  newArmy(best, { 'd-sword': 3 });   // every realm starts with three infantry
  computeIncome();
  S.selected = [S.units[0]];
  computeFog();
}
function mkUnit(id, kind, name, prov, slot) {
  const [x, y] = slotPos(prov, slot);
  if (kind === WAYFINDER || kind === MASON) name = cuteName();
  return { id, owner: ME, kind, name, prov, slot, x, y, th: 0, path: [], moving: false, build: null, survey: null, scouting: null, surveyQueue: [], pendingSurvey: -1 };
}
function slotPos(prov, k) { const p = G.provs[prov], o = SLOTS[k % SLOTS.length]; return [p.ic[0] + o[0], p.ic[1] + o[1]]; }
function freeSlot(prov, u) {
  const used = new Set(S.units.filter(v => v !== u && v.prov === prov && v.slot >= 0).map(v => v.slot));
  let k = 0; while (used.has(k)) k++; return k;
}

// ---------- visibility ----------
// visible: a province holding one of your units or buildings
// explored: visible, or next to one of your buildings across an open border, or ever entered by a Wayfinder
// unexplored: everything else
function computeFog() {
  const vis = new Set(), exp = new Set([...S.wf, ...S.known]);
  for (const u of S.units) if (u.owner === ME && u.kind === 'army' && !S.known.has(u.prov)) { S.known.add(u.prov); exp.add(u.prov); }   // Z10: land your armies enter stays discovered
  for (const u of S.units) if (u.owner === ME && u.scouting !== u.prov) { vis.add(u.prov); if (u.kind === WAYFINDER && hasTech('farsight')) for (const { q } of openNbr[u.prov]) { vis.add(q); if (!S.known.has(q)) { S.known.add(q); exp.add(q); } } }   // far sight explores what it sees, for good (GPC18)
  for (const [p, b] of S.buildings) { if (b.owner !== ME) continue; vis.add(p); for (const n of openNbr[p]) exp.add(n.q); }
  for (const [p, o] of S.occ) if (o === ME) vis.add(p);   // an occupied province stays in view for its occupier
  towerSight(vis);
  if (S.reveal) for (let i = 0; i < G.provs.length; i++) vis.add(i);   // debug: lift the fog
  for (const p of vis) exp.add(p);
  const sig = [...exp].sort((a, b) => a - b).join(',') + '|' + [...vis].sort((a, b) => a - b).join(',');
  if (sig !== S.sig) { S.sig = sig; S.visible = vis; S.explored = exp; fogDirty = true; hoverPath = undefined; miniDirty = true; }
}
const fogState = i => S.visible.has(i) ? 'visible' : S.explored.has(i) ? 'explored' : 'unexplored';

// ---------- movement ----------
// at peace, armies stay out of other nations' land (armies heading home after a peace deal are let through)
// every unit may only walk through its own land, unclaimed land, the land of a nation it is at war with, or the land of a nation it has a truce with (units marching home after a peace deal excepted)
// a truce after a peace deal opens the border too (GPC23)
const nationOk = (u, q) => { if (u.exiting || u.owner === RAIDERS) return true; const n = nationOf(q); return !n || n === u.owner || hostile(u.owner, n) || truceLeft(u.owner, n) > 0; };
// at war, any unit may march into unexplored land that belongs to the enemy
const canEnter = (u, q) => (u.owner !== ME || (u.kind === WAYFINDER && (!u.autoWalk || q === u.autoWalk.to)) || u.exiting || S.explored.has(q) || (S.wars.length && nationOf(q) && hostile(ME, nationOf(q)))) && nationOk(u, q) && !(u.kind === WAYFINDER && u.owner === ME && banditsSeenIn(q)) && !(u.kind === MASON && masonDanger(u, q));
// Masons won't walk into a province holding a hostile army they know about (GPC05)
const masonDanger = (u, q) => S.units.some(v => v.kind === 'army' && v.prov === q && troopCount(v) > 0 && !v.retreating && hostile(v.owner, u.owner) && (u.owner !== ME || (v.bandit ? v.seen : S.visible.has(q))));
// an army that can't get there through open borders and gates will batter down an enemy wall on the way
function findPath(u, target) {
  const p = findPathVia(u, target, false);
  return p || u.kind !== 'army' || !S.walls.size ? p : findPathVia(u, target, true);
}
function findPathVia(u, target, siege) {
  if (target === u.prov) return [];
  if (!canEnter(u, target)) return null;
  const prev = new Map([[u.prov, null]]), q = [u.prov];
  while (q.length) {
    const a = q.shift(); if (a === target) break;
    for (const n of pathNbr(u, a, siege)) if (!prev.has(n.q) && canEnter(u, n.q)) { prev.set(n.q, { a, m: n.m, siege: n.siege }); q.push(n.q); }
  }
  if (!prev.has(target)) return null;
  const hops = []; let c = target;
  while (c !== u.prov) { const pr = prev.get(c); hops.unshift({ to: c, m: pr.m, siege: pr.siege }); c = pr.a; }
  return hops;
}
// free movement: units walk to the exact spot you right-click, kept inside the province's open ground
const STAND_GAP = 14;
function clampInto(prov, x, y) {
  const P = G.provs[prov], ok = (a, b) => inPoly(a, b, P.inner) && distToEdges(a, b, P.inner) >= STAND_GAP;
  if (ok(x, y)) return [x, y];
  for (let f = 0.08; f <= 1; f += 0.08) { const qx = x + (P.ic[0] - x) * f, qy = y + (P.ic[1] - y) * f; if (ok(qx, qy)) return [qx, qy]; }
  return [P.ic[0], P.ic[1]];
}
// a straight walk is fine when it stays on the province's open ground (its ends may sit on a border crossing)
function segClear(prov, a, b) {
  const P = G.provs[prov];
  for (let t = 0.12; t < 0.9; t += 0.08) if (!inPoly(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, P.inner)) return false;
  return true;
}
// spots for a group around the clicked point: a small honeycomb, nearest spots first
function formation(n, gap = 30) {
  const out = [[0, 0]];
  for (let ring = 1; out.length < n; ring++) for (let k = 0; k < 6 * ring && out.length < n; k++) { const a = (k / (6 * ring)) * Math.PI * 2 + ring * 0.5; out.push([Math.cos(a) * gap * ring, Math.sin(a) * gap * ring * 0.8]); }
  return out;
}
function order(u, target, quiet, pt) {
  if (u.fleeing) { if (!quiet) toast(`${u.name} is running ${u.warFlee ? 'from the enemy' : 'from bandits'}. He takes orders again once he is back.`, true); return false; }
  if (u.stasisUntil && u.stasisUntil > S.t) { if (!quiet) toast(`${u.name} is held by a stasis trap for ${Math.ceil(u.stasisUntil - S.t)} s more.`, true); return false; }
  if (!quiet && u.exiting && nationOf(target) !== u.owner) { toast(`${u.name} is marching home after the peace deal. You can send it to one of your own provinces.`, true); return false; }
  if (u.battle && !u.retreating) { if (!quiet) toast(`${u.name} is in battle. Use Retreat in the command card to pull out.`, true); return false; }
  if (u.retreatHome) { if (!quiet) toast(`${u.name} is retreating and takes orders again once it gets there.`, true); return false; }
  const hops = findPath(u, target);
  if (hops === null) {
    const tn = nationOf(target);
    if (!quiet && tn && tn !== u.owner && !hostile(u.owner, tn)) { toast(`You are at peace with the ${PLAYERS[tn].name}. Your units can only cross your own land, unclaimed land, the land of a nation you are at war with, or the land of a nation you have a truce with.`, true); return false; }
    if (!quiet && !u.exiting) { u.exiting = true; const free = findPath(u, target); u.exiting = false; if (free) { toast('The only route there crosses a nation you are at peace with. Find another way, or declare war.', true); return false; } }
    if (!quiet) toast(u.kind === WAYFINDER ? 'No open route there. Trees, mountains, rivers and ruins block the way.' : `The ${u.name} can only enter explored provinces, and needs an open route.`, true);
    return false;
  }
  if (u.build) { cancelBuild(u); toast('Construction cancelled. Resources refunded.'); }
  u.pending = null;
  if (u.survey) { u.survey = null; toast('Survey cancelled.'); }
  walkHops(u, hops, target, pt);
  return true;
}
// turn a list of border crossings into the walk itself
function walkHops(u, hops, target, pt) {
  const wps = [], dest = pt ? clampInto(target, pt[0], pt[1]) : null;
  // walk straight from crossing to crossing (or to the chosen spot) when the way is clear, else by the province's middle
  let at = [u.x, u.y], inProv = u.prov;
  // when the straight line leaves the open ground, walk around the bend instead of through the province's middle (GPC24)
  const via = (to, pr) => { if (!segClear(pr, at, to)) for (const q of navRoute(pr, at, to)) wps.push({ x: q[0], y: q[1] }); };
  hops.forEach(h => { via(h.m, inProv); wps.push({ x: h.m[0], y: h.m[1], enter: h.to, siege: h.siege }); at = h.m; inProv = h.to; });
  if (dest) { via(dest, inProv); wps.push({ x: dest[0], y: dest[1], slot: true }); }
  u.path = wps; u.moving = true; u.slot = -1; u.final = target;
  if (!hops.length && !dest) { u.slot = freeSlot(u.prov, u); const [x, y] = slotPos(u.prov, u.slot); u.path = [{ x, y, slot: true }]; }
}
// every unit keeps one order list: numbers are surveys, { move: p } entries are queued moves
const surveysIn = u => u.surveyQueue.filter(e => typeof e === 'number').length + (u.pendingSurvey >= 0 ? 1 : 0);
const movesIn = u => u.surveyQueue.filter(e => typeof e !== 'number').length;
const busy = u => u.moving || u.survey || u.build || u.pending || u.battle || u.pendingSurvey >= 0 || u.surveyQueue.length;
// Shift queues actions; each unit can hold at most 10 queued actions
const QUEUE_MAX = 10;
const queueLen = u => u.surveyQueue.length + (u.pendingSurvey >= 0 ? 1 : 0);
function orderGroup(target, append, pt) {
  const units = S.selected.slice(); if (!units.length) return;
  // each unit gets its own spot around the clicked point so a group spreads out instead of stacking
  const spots = new Map();
  if (pt) { const f = formation(units.length); units.slice().sort((a, b) => Math.hypot(a.x - pt[0], a.y - pt[1]) - Math.hypot(b.x - pt[0], b.y - pt[1])).forEach((u, i) => spots.set(u, [pt[0] + f[i][0], pt[1] + f[i][1]])); }
  if (append) {
    // Shift: add the move to the end of each unit's list (or just go, if the unit is idle)
    const now = units.filter(u => !busy(u)), later = units.filter(u => busy(u));
    const full = later.filter(u => queueLen(u) >= QUEUE_MAX);
    if (full.length) toast(`${full.map(u => u.name).join(' and ')} already ${full.length > 1 ? 'have' : 'has'} ${QUEUE_MAX} queued actions, the most allowed.`, true);
    const ok = later.filter(u => queueLen(u) < QUEUE_MAX); ok.forEach(u => u.surveyQueue.push({ move: target, pt: spots.get(u) }));
    if (ok.length && !full.length) toast(`Move queued (${ok.map(u => u.name + ': ' + (u.surveyQueue.length + (u.pendingSurvey >= 0 ? 1 : 0)) + ' orders').join(', ')}).`);
    if (!now.length) return;
    S.selected = now; orderGroup(target, false, pt); S.selected = units; return;
  }
  for (const u of units) { u.surveyQueue = []; u.pendingSurvey = -1; u.autoWalk = null; }
  if (units.length === 1) { if (order(units[0], target, false, spots.get(units[0]))) sndMove(units); return; }
  const failed = units.filter(u => !order(u, target, true, spots.get(u)));
  if (failed.length < units.length) sndMove(units.filter(u => !failed.includes(u)));
  if (failed.length) toast(failed.map(u => u.name).join(' and ') + (failed.length === 1 ? ' can’t' : ' can’t') + ' reach that province. Only a Wayfinder can enter unexplored land.', true);
}
// the survey route: a loop just inside the province edge, starting at the corner nearest the Wayfinder
function surveyRoute(u) {
  // a smaller loop inside the province, sized so that walking out to it and around it at his normal pace takes exactly the survey time
  const P = G.provs[u.prov], want = SPEED * unitSpeed(u) * SURVEY_TIME;
  const build = sc => {
    let loop = P.inner.map(([x, y]) => [P.ic[0] + (x - P.ic[0]) * sc, P.ic[1] + (y - P.ic[1]) * sc]);
    let k0 = 0, bd = Infinity; loop.forEach(([x, y], i) => { const d = Math.hypot(x - u.x, y - u.y); if (d < bd) { bd = d; k0 = i; } });
    loop = loop.slice(k0).concat(loop.slice(0, k0)); loop.push(loop[0]);
    const seg = []; let L = 0;
    for (let i = 0; i < loop.length - 1; i++) { const d = Math.hypot(loop[i + 1][0] - loop[i][0], loop[i + 1][1] - loop[i][1]); seg.push(d); L += d; }
    return { prov: u.prov, t0: S.t, loop, seg, L, from: [u.x, u.y], lead: bd, total: bd + L };
  };
  let lo = 0.05, hi = 0.92, r = build(hi);
  if (r.total > want) { for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; r = build(m); if (r.total > want) hi = m; else lo = m; } r = build(lo); }
  // walking pace is fixed, so the survey ends when he finishes the route
  r.dur = r.total / (SPEED * unitSpeed(u));
  return r;
}
function routeAt(site, f) {
  let need = f * site.total;
  if (need <= site.lead) { const a = site.from, b = site.loop[0], k = site.lead ? need / site.lead : 1; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, need]; }
  need -= site.lead; const lapDone = need;
  for (let i = 0; i < site.seg.length; i++) {
    if (need <= site.seg[i]) { const a = site.loop[i], b = site.loop[i + 1], k = need / site.seg[i]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, site.lead + lapDone]; }
    need -= site.seg[i];
  }
  const e = site.loop[site.loop.length - 1]; return [e[0], e[1], site.total];
}

// ---------- training (capital and barracks) ----------
// each training building has its own queue, keyed like "capital:113" or "barracks:113"
const canAfford = c => Object.keys(c).every(k => S.stock[k] >= c[k]);
const srcKey = () => S.selKind + ':' + S.selBuilding;
function srcSpot(key) {
  const [kind, p] = key.split(':'), prov = +p, c = G.provs[prov].ic;
  if (kind === 'capital') return { prov, x: c[0], y: c[1], ox: 0, oy: 0, yOff: -150 };
  const e = extrasIn(prov).find(v => v.type === (kind === 'magetower' ? 'magetower' : 'barracks')), [ox, oy] = bslotOf(prov, e ? e.slot : 0);
  return { prov, x: c[0] + ox, y: c[1] + oy, ox, oy, yOff: -62 };
}
function trainable(kind, prov) {
  if (kind === 'capital') return TRAINS.capital;
  if (kind === 'magetower') return [MAGE];
  const hasStable = extrasIn(prov).some(e => e.type === 'stable');
  return S.designs.filter(d => d.type === 'inf' || hasStable).slice(0, 12).map(d => d.id);
}
// you can have at most 3 Wayfinders and 3 Masons at a time (units in training count)
const UNIT_LIMIT = { 'pioneer:B': 3, 'mason:A': 3 };
// Mages count wherever they are: on their own, inside an army, or in training
function unitTotal(kind) { return S.units.filter(v => v.owner === ME && v.kind === kind).length + Object.values(S.queues).reduce((n, q) => n + q.filter(e => e.kind === kind).length, 0) + (kind === MAGE ? S.units.reduce((n, v) => n + (v.owner === ME && v.kind === 'army' ? (v.troops[MAGE] || 0) : 0), 0) : 0); }
const unitLimit = kind => kind === MAGE ? mageCap() : kind === MASON ? UNIT_LIMIT[kind] + repLv('rep-masons') : kind === WAYFINDER ? UNIT_LIMIT[kind] + repLv('rep-wayfinders') : UNIT_LIMIT[kind];
function limitWhy(kind) { const L = unitLimit(kind); return L && unitTotal(kind) >= L ? `Limit reached: ${L} ${UNIT_DEFS[kind].name}${L > 1 ? 's' : ''}` + (kind === MAGE ? ' · research Mage Academy for more' : '') : null; }
function train(kind) {
  const d = UNIT_DEFS[kind], key = srcKey();
  if (!trainable(S.selKind, S.selBuilding).includes(kind)) return;
  if (limitWhy(kind)) return toast(`You can have at most ${unitLimit(kind)} ${d.name}${unitLimit(kind) > 1 ? 's' : ''} at a time (including any in training${kind === MAGE ? ' or in armies' : ''}).`, true);
  if (!canAfford(d.cost)) { const short = Object.keys(d.cost).filter(k => S.stock[k] < d.cost[k]); return toast(`Not enough ${short.join(' and ')} to train a ${d.name}.`, true); }
  for (const k in d.cost) S.stock[k] -= d.cost[k];
  (S.queues[key] = S.queues[key] || []).push({ kind, paid: { ...d.cost }, t0: null });
  toast(`${d.name} queued at the ${S.selKind === 'capital' ? 'capital' : 'barracks'}.`);
  capPanelKey = '';
}
function cancelTrain(i) {
  const Q = S.queues[srcKey()] || [], q = Q[i]; if (!q) return;
  for (const k in q.paid) S.stock[k] += q.paid[k];
  Q.splice(i, 1); if (i === 0 && Q[0]) Q[0].t0 = null;
  toast('Training cancelled. Resources refunded.'); capPanelKey = '';
}
function stepTraining(t) {
  for (const key in S.queues) {
    const Q = S.queues[key], q = Q[0]; if (!q) continue;
    if (q.t0 === null) q.t0 = t;
    if (t - q.t0 < trainTime(q.kind)) continue;
    Q.shift();
    const spot = srcSpot(key), d = UNIT_DEFS[q.kind];
    if (MILITARY.has(q.kind)) {
      let a = S.units.find(v => v.kind === 'army' && v.owner === ME && v.prov === spot.prov && !v.moving && !v.battle);
      if (a) { a.troops[q.kind] = (a.troops[q.kind] || 0) + 1; a.grew = t; toast(`${d.name} joined ${a.name} (${troopCount(a)} soldiers).`); }
      else { a = newArmy(spot.prov, { [q.kind]: 1 }); a.born = t; toast(`${d.name} is ready and formed ${a.name}.`); }
      sfx('pr_trained', { prov: spot.prov }); computeIncome(); capPanelKey = ''; continue;
    }
    const n = S.units.filter(v => v.kind === q.kind && v.owner === ME).length + 1;
    const u = mkUnit(S.nextId++, q.kind, d.name + (n > 1 ? ' ' + n : ''), spot.prov, 0);
    u.slot = freeSlot(spot.prov, u); [u.x, u.y] = slotPos(spot.prov, u.slot);
    u.born = t; S.units.push(u); sfx('pr_trained', { prov: spot.prov });
    computeIncome(); capPanelKey = '';
    toast(`${u.name} is ready.`);
  }
}

// ---------- armies ----------
let armyCounter = 0;
const ORD = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const troopCount = a => Object.values(a.troops).reduce((x, y) => x + y, 0);
const troopText = a => Object.entries(a.troops).filter(([, n]) => n).map(([k, n]) => { const nm = UNIT_DEFS[k] ? UNIT_DEFS[k].name : 'Soldier'; return n + ' ' + (n > 1 ? PLURAL_OF(nm) : nm); }).join(', ');
function newArmy(prov, troops, near) {
  const a = mkUnit(S.nextId++, 'army', ORD(++armyCounter) + ' Army', prov, 0);
  a.troops = troops;
  a.slot = freeSlot(prov, a); [a.x, a.y] = slotPos(prov, a.slot);
  if (near) { a.x = near.x + 10; a.y = near.y + 8; order(a, prov, true); }
  S.units.push(a); return a;
}
function splitArmy(a) {
  if (troopCount(a) < 2) return toast('An army needs at least two soldiers to split.', true);
  // deal soldiers out one at a time so each half gets a fair mix
  const list = []; for (const k of Object.keys(a.troops).sort()) for (let i = 0; i < a.troops[k]; i++) list.push(k);
  const keep = {}, give = {};
  list.forEach((k, i) => { const side = i % 2 ? give : keep; side[k] = (side[k] || 0) + 1; });
  a.troops = keep;
  const b = newArmy(a.prov, give, a);
  S.selected = [a, b]; computeIncome();
  toast(`${a.name} split: ${troopText(a)} and ${b.name}: ${troopText(b)}.`);
}
function combineArmies(list) {
  const prov = list[0].prov;
  if (list.some(a => a.prov !== prov)) return toast('Armies must be in the same province to combine.', true);
  const main = list[0];
  for (const a of list.slice(1)) { for (const k in a.troops) main.troops[k] = (main.troops[k] || 0) + a.troops[k]; S.units = S.units.filter(v => v !== a); }
  main.grew = S.t; S.selected = [main]; computeIncome();
  toast(`${list.length} armies combined into ${main.name} (${troopCount(main)} soldiers).`);
}

// ---------- settlement upgrades ----------
function upgradeWhy(p) {
  const b = S.buildings.get(p); if (!b || b.owner !== ME) return 'Not yours';
  if (b.stage !== 0) return b.stage === 1 ? 'Already a Fort' : 'Capitals can’t be upgraded yet';
  if (S.upgrades.has(p)) return 'Already upgrading';
  if (fortCount() >= fortLimit()) return `Fort limit reached (${fortCount()}/${fortLimit()})` + (hasTech('forts') ? '' : ' · research Fort Charters for 3');
  return lackText(FORT_UPGRADE.cost);
}
function startUpgrade(p) {
  const why = upgradeWhy(p); if (why) return toast('Can’t upgrade: ' + why.toLowerCase() + '.', true);
  for (const k in FORT_UPGRADE.cost) S.stock[k] -= FORT_UPGRADE.cost[k];
  S.upgrades.set(p, { t0: S.t, paid: { ...FORT_UPGRADE.cost } });
  toast(`Upgrading the outpost to a Fort… (−${costText(FORT_UPGRADE.cost)}, ${FORT_UPGRADE.time} s)`);
}
function cancelUpgrade(p) {
  const u = S.upgrades.get(p); if (!u) return;
  for (const k in u.paid) S.stock[k] += u.paid[k];
  S.upgrades.delete(p); toast('Upgrade cancelled. Resources refunded.');
}
const extraAt = (p, part) => { if (!part || !part.includes('@')) return null; const [type, slot] = part.split('@'); return extrasIn(p).find(e => e.type === type && e.slot === +slot) || null; };
function startXup(p, part) {
  const info = cmdInfo('xup'); if (info.why) return toast(info.name + ': ' + info.why + '.', true);
  const e = extraAt(p, part), d = BUILD_DEFS[e.type], up = d.ups[e.level || 1];
  for (const k in up.cost) S.stock[k] -= up.cost[k];
  S.xup.set(p + '@' + e.slot, { t0: S.t, paid: { ...up.cost }, to: (e.level || 1) + 1 });
  toast(`Upgrading to a ${d.levels[e.level || 1]}… (−${costText(up.cost)}, ${up.time} s)`);
}
function cancelXup(p, part) {
  const e = extraAt(p, part); if (!e) return; const k = p + '@' + e.slot, xu = S.xup.get(k); if (!xu) return;
  for (const r in xu.paid) S.stock[r] += xu.paid[r];
  S.xup.delete(k); toast('Upgrade cancelled. Resources refunded.');
}
function stepUpgrades(t) {
  for (const [k, xu] of S.xup) {
    const [p, slot] = k.split('@').map(Number), e = extrasIn(p).find(v => v.slot === slot);
    if (!e) { S.xup.delete(k); continue; }
    const d = BUILD_DEFS[e.type]; if (t - xu.t0 < d.ups[xu.to - 1].time) continue;
    S.xup.delete(k); e.level = xu.to; e.born = t; sfx('bld_done', { prov: p });
    toast(`${d.levels[xu.to - 2]} upgraded to a ${d.levels[xu.to - 1]}! ${e.type === 'forge' ? 'Military' : 'Magic'} research reaches Tier ${['', 'I', 'II', 'III'][xu.to]}.`);
    provKey = ''; cmdKey = ''; techKey = '';
  }
  for (const [p, u] of S.upgrades) {
    if (t - u.t0 < FORT_UPGRADE.time) continue;
    S.upgrades.delete(p);
    const b = S.buildings.get(p); if (!b) continue;
    b.stage = 1; b.born = t; sfx('bld_done', { prov: p });
    toast('Outpost upgraded to a Fort. 4 building plots are now open.');
    computeIncome(); provKey = '';
  }
}

// ---------- combat ----------
// each soldier's attack, health and armor come from its Armory design (statsOf)
// polearms hit cavalry harder, blunt weapons ignore half of the enemy's armor, swords parry
const ROUND = 0.8;        // seconds between damage rounds
const DMG_RATE = 0.22;    // share of an army's attack dealt each round
const RETREAT_LOSS = 0.6; // most of an army that can be lost when retreating from a far larger enemy
const TERRAIN_MOD = {
  grassland: { note: 'Open ground: cavalry +20%', mod: (cav, def) => cav ? 1.2 : 1 },
  forest: { note: 'Forest: defenders +25%, cavalry −25%', mod: (cav, def) => (def ? 1.25 : 1) * (cav ? 0.75 : 1) },
  swamp: { note: 'Swamp: everyone −20%, cavalry −30%', mod: (cav, def) => 0.8 * (cav ? 0.7 : 1) },
  desert: { note: 'Desert: no modifiers', mod: () => 1 }
};
const hostilesIn = (p, owner) => S.units.filter(v => v.kind === 'army' && hostile(v.owner, owner) && v.prov === p && !v.retreating && troopCount(v) > 0);
function sideStrength(armies, prov, defender, foe) {
  const T = TERRAIN_MOD[world.provinces[prov].terrain], cavFrac = foe ? foe.cavFrac : 0;
  let s = 0; for (const a of armies) for (const k in a.troops) { const st = statsOf(k, a.owner); s += a.troops[k] * st.atk * T.mod(st.cav && !st.rough, defender) * (st.fam === 'pole' ? 1 + 0.5 * cavFrac : 1) * (1 + (a.curse || 0)); }
  return s;
}
const rawStrength = armies => armies.reduce((n, a) => n + Object.entries(a.troops).reduce((m, [k, c]) => { const st = statsOf(k, a.owner); return m + c * st.atk * (hpOf(a, k) / 30) / (1 - st.red); }, 0), 0);
function stepBattles(t) {
  // start battles where armies of different owners share a province
  const byProv = new Map();
  for (const a of S.units) { if (a.kind !== 'army' || a.retreating || a.moving && !a.battle && !a.sieging || troopCount(a) <= 0) continue; if (!byProv.has(a.prov)) byProv.set(a.prov, []); byProv.get(a.prov).push(a); }
  for (const [p, list] of byProv) {
    // only owners that are hostile to each other fight (raiders always; nations only while at war)
    const os = [...new Set(list.map(a => a.owner))]; let pair = null;
    for (const x of os) for (const y of os) if (!pair && hostile(x, y)) pair = [x, y];
    if (!pair) continue;
    let b = S.battles.find(x => x.prov === p);
    if (!b) {
      // the defender is whoever owns the province, otherwise whoever got there first
      const own = S.buildings.get(p), first = list.slice().sort((x, y) => (x.arrived ?? 0) - (y.arrived ?? 0))[0];
      b = { prov: p, t0: t, next: t + ROUND, defender: own ? own.owner : first.owner, start: {}, lost: {}, hits: {} };
      // remember any capture under way: if the capturing side wins this battle, its progress comes back
      const pr = S.occProg.get(p); if (pr) b.prog = { ...pr };
      S.battles.push(b); if (list.some(a => a.owner === ME)) sfx('bat_loop', { prov: p });
      if (list.some(a => a.owner === ME)) toast(`Battle in the ${TER[world.provinces[p].terrain].label.toLowerCase()}! ${TERRAIN_MOD[world.provinces[p].terrain].note}.`);
    }
    for (const a of list) if (!a.battle && pair.includes(a.owner)) { onBattleJoin(a, t); a.battle = b; a.path = []; a.moving = false; a.retreatHome = false; a.sieging = null; b.start[a.owner] = (b.start[a.owner] || 0) + troopCount(a); }
  }
  for (const b of S.battles.slice()) {
    const sides = {};
    for (const a of S.units) if (a.kind === 'army' && a.battle === b && !a.retreating && troopCount(a) > 0) (sides[a.owner] = sides[a.owner] || []).push(a);
    const owners = Object.keys(sides).map(Number);
    placeSides(b, sides);
    if (owners.length < 2) { endBattle(b, owners[0], sides); continue; }
    if (!hostile(owners[0], owners[1])) { b.peace = true; endBattle(b, -1, sides); continue; }
    if (t < b.next) continue;
    b.next = t + ROUND;
    const [A, B2] = owners, mixA = sideMix(sides[A]), mixB = sideMix(sides[B2]);
    const dmgA = sideStrength(sides[A], b.prov, A === b.defender, mixB) * DMG_RATE * (0.85 + Math.random() * 0.3), dmgB = sideStrength(sides[B2], b.prov, B2 === b.defender, mixA) * DMG_RATE * (0.85 + Math.random() * 0.3);
    applyDamage(b, sides[B2], dmgA, t, mixA.pierce); applyDamage(b, sides[A], dmgB, t, mixB.pierce);
    b.hits[A] = t; b.hits[B2] = t;
    for (const o of owners) for (const a of sides[o]) if (troopCount(a) <= 0) { warWipe(b, a); if (a.bandit) banditSlain(a, b); removeArmy(a); }
  }
}
function applyDamage(b, armies, dmg, t, pierce = 0) {
  const total = armies.reduce((n, a) => n + troopCount(a), 0); if (!total) return;
  // armor soaks part of each blow (blunt weapons get through half of it); swords parry some more
  const mix = sideMix(armies); dmg *= (1 - mix.red * (1 - 0.5 * pierce)) * (1 - mix.parry);
  const owner = armies[0].owner;
  S.fx.push({ kind: 'num', prov: b.prov, owner, n: Math.round(dmg), t0: t });
  for (const a of armies) {
    a.wounds = (a.wounds || 0) + dmg * troopCount(a) / total / (1 + (a.skin || 0));
    // spill damage over: when the front soldier's health runs out he falls and the rest carries on
    for (;;) {
      const kinds = Object.keys(a.troops).filter(k => a.troops[k] > 0); if (!kinds.length) break;
      let r = Math.random() * troopCount(a), k = kinds[0];
      for (const kk of kinds) { r -= a.troops[kk]; if (r <= 0) { k = kk; break; } }
      if (a.wounds < hpOf(a, k)) break;
      a.wounds -= hpOf(a, k);
      // Risen Dead: every Nth soldier who falls gets straight back up
      if (a.risen && k !== MAGE && isCaster(a) && ++a.risenN >= a.risen) { a.risenN = 0; a.riseFx = t; a.risenTotal = (a.risenTotal || 0) + 1; if (a.owner === ME) sfx('mg_risen', { prov: b.prov }); continue; }
      a.troops[k]--; if (!a.troops[k]) delete a.troops[k];
      if (a.monster) monsterLoot(a, k, b);   // SMA03: wood or gold for every monster killed
      if (a.fallen) a.fallen[k] = (a.fallen[k] || 0) + 1;
      b.lost[owner] = (b.lost[owner] || 0) + 1; warKill(b, owner, 1); if (owner === ME || (b.start && b.start[ME] !== undefined)) sfx('bat_fall', { prov: b.prov });
      S.fx.push({ kind: 'fall', prov: b.prov, owner, unit: k, t0: t, r: Math.random() });
    }
  }
}
function removeArmy(a) { S.units = S.units.filter(v => v !== a); S.selected = S.selected.filter(v => v !== a); if (a.owner === ME) computeIncome(); }
function endBattle(b, winner, sides) {
  S.battles = S.battles.filter(x => x !== b);
  warBattleCheck(b);
  for (const a of S.units) if (a.battle === b) onBattleEnd(a, S.t);
  for (const a of S.units) if (a.battle === b) { a.battle = null; if (!a.retreating) { a.slot = freeSlot(a.prov, a); const [x, y] = slotPos(a.prov, a.slot); a.path = [{ x, y, slot: true }]; a.moving = true; } }
  // the capture under way when the battle began comes back if the capturing side won, and is lost if it didn't
  if (b.prog) { if (winner === b.prog.by) { const cur = S.occProg.get(b.prov); if (!cur || cur.by !== b.prog.by || cur.f < b.prog.f) S.occProg.set(b.prov, { ...b.prog }); if (winner === ME) toast(`The capture of ${provName(b.prov)} resumes where it left off.`); } else { const cur = S.occProg.get(b.prov); if (cur && cur.by === b.prog.by) S.occProg.delete(b.prov); } }
  if (b.peace) { computeIncome(); return; }
  const mine = b.lost[ME] || 0, theirs = Object.entries(b.lost).filter(([o]) => +o !== ME).reduce((n, [, v]) => n + v, 0);
  if (b.start[ME] === undefined) return;
  const where = TER[world.provinces[b.prov].terrain].label.toLowerCase();
  if (winner === ME) sfx('bat_win'); else sfx('bat_lose');
  if (winner === ME) toast(`Victory in the ${where}! You lost ${mine}, the enemy lost ${theirs}.${b.bounty ? ` The Bandit Gang is broken: +${b.bounty} gold bounty.` : ''}${b.loot ? ` Spoils from the monsters: +${lootText(b.loot)}.` : ''}`);
  else if (b.retreatedMe) toast(`You withdrew from the ${where}. You lost ${mine}, the enemy lost ${theirs}.`, true);
  else toast(`Defeat in the ${where}. You lost ${mine}, the enemy lost ${theirs}.`, true);
  computeIncome();
}
// retreating: losses scale with the enemy's size compared to yours
function retreatLoss(a) {
  const b = a.battle; if (!b) return 0;
  const enemy = rawStrength(S.units.filter(v => v.kind === 'army' && v.battle === b && v.owner !== a.owner && !v.retreating)), mine = rawStrength([a]);
  return Math.min(troopCount(a), Math.round(troopCount(a) * RETREAT_LOSS * enemy / Math.max(1, enemy + mine)));
}
function retreatTo(a) {
  const ok = q => !hostilesIn(q, a.owner).length;
  const nb = pathNbr(a, a.prov, false).map(n => n.q).filter(q => canEnter(a, q) && ok(q));   // own gates count as a way out
  if (!nb.length) return -1;
  if (a.lastProv !== undefined && nb.includes(a.lastProv)) return a.lastProv;
  return nb.sort((x, y) => (owned(y) ? 1 : 0) - (owned(x) ? 1 : 0))[0];
}
// GPC21: nobody can pull out of a battle in its first 10 seconds
const RETREAT_LOCK = 10;
const retreatLockLeft = a => a.battle ? Math.max(0, RETREAT_LOCK - (S.t - a.battle.t0)) : 0;
function retreat(a) {
  if (retreatLockLeft(a) > 0) { if (a.owner === ME) toast(`${a.name} can’t pull out yet: the lines are locked for ${Math.ceil(retreatLockLeft(a))} s more.`, true); return; }
  const dest = retreatTo(a); if (dest < 0) return a.owner === ME ? toast(`${a.name} is surrounded and can’t retreat.`, true) : undefined;
  const n = retreatLoss(a);
  for (let i = 0; i < n; i++) { const kinds = Object.keys(a.troops).filter(k => a.troops[k] > 0); const k = kinds[Math.floor(Math.random() * kinds.length)]; a.troops[k]--; if (!a.troops[k]) delete a.troops[k]; S.fx.push({ kind: 'fall', prov: a.prov, owner: a.owner, unit: k, t0: S.t, r: Math.random() }); }
  const b = a.battle; b.lost[a.owner] = (b.lost[a.owner] || 0) + n; warKill(b, a.owner, n); if (a.owner === ME) b.retreatedMe = true;
  if (troopCount(a) <= 0) { warWipe(b, a); removeArmy(a); if (a.owner === ME) toast(`${a.name} was cut down while retreating.`, true); return; }
  a.retreating = true; a.battle = null;
  // GPC26: all the way back to the capital, or as close to it as the army can get; no orders until it arrives
  const home = retreatHome(a);
  if (home) { if (a.cast && typeof cancelCast === 'function') cancelCast(a); a.surveyQueue = []; walkHops(a, home.hops, home.to); a.retreatHome = true; S.selected = S.selected.filter(v => v !== a); }
  else order(a, dest, true);
  if (a.owner === ME) toast(`${a.name} retreats${home ? ' toward ' + (home.to === capitalOf(ME) ? 'the capital' : provName(home.to)) : ''}, losing ${n} soldier${n === 1 ? '' : 's'}.`);
  else if (b.start[ME] !== undefined) toast(`${a.name} retreats from the battle.`);
  computeIncome();
}

// ---------- battle drawing: a skirmish in the province ----------
function battleCenter(p) { const c = G.provs[p].ic; return [c[0], c[1] + (S.buildings.has(p) ? 96 : 34)]; }
function placeSides(b, sides) {
  const bc = battleCenter(b.prov), c = [bc[0], bc[1] - 34], owners = Object.keys(sides).map(Number).sort((x, y) => (x === ME ? -1 : y === ME ? 1 : x - y));
  owners.forEach((o, i) => { const dir = i === 0 ? -1 : 1; sides[o].forEach((a, j) => { a.x = c[0] + dir * 62; a.y = c[1] + 34 + j * 14; a.th = dir < 0 ? Math.PI / 2 : -Math.PI / 2; }); });
  b.order = owners;
}
function battleFigures(armies) {
  const kinds = {}; for (const a of armies) for (const k in a.troops) kinds[k] = (kinds[k] || 0) + a.troops[k];
  const total = Object.values(kinds).reduce((x, y) => x + y, 0), shown = Math.min(6, total), list = [];
  const ks = Object.keys(kinds).sort((x, y) => kinds[y] - kinds[x]);
  ks.forEach(k => { const n = Math.max(1, Math.round(shown * kinds[k] / total)); for (let i = 0; i < n && list.length < shown; i++) list.push(k); });
  return list;
}
function drawBattle(g, b, t) {
  const [cx, cy] = battleCenter(b.prov);
  const sides = {}; for (const a of S.units) if (a.kind === 'army' && a.battle === b && !a.retreating) (sides[a.owner] = sides[a.owner] || []).push(a);
  const order = (b.order || Object.keys(sides).map(Number)).filter(o => sides[o]);
  // dust cloud in the middle of the melee
  for (let k = 0; k < 5; k++) { const f = (t * 0.7 + k / 5) % 1, x = cx + Math.sin(k * 2.3 + t) * 22, y = cy - 4 - f * 18; g.globalAlpha = 0.35 * (1 - f); g.fillStyle = '#e9dcc0'; g.beginPath(); g.arc(x, y, 8 + f * 12, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  const figsBySide = order.map((o, i) => ({ o, dir: i === 0 ? -1 : 1, figs: battleFigures(sides[o]) }));
  const all = [];
  for (const { o, dir, figs } of figsBySide) {
    figs.forEach((k, i) => {
      const row = i % 3, col = Math.floor(i / 3);
      const bx = cx + dir * (30 + col * 24 + (row === 1 ? 8 : 0)) * Math.sqrt(UKK), by = cy - 14 + row * 15 * Math.sqrt(UKK);
      const ph = i * 1.37 + o * 2.1, swing = Math.pow(Math.max(0, Math.sin(t * 3.2 + ph)), 6);
      const hitAge = t - (b.hits[o] || -9), shake = hitAge < 0.25 ? Math.sin(hitAge * 80) * 2.5 : 0;
      all.push({ k, o, dir, x: bx - dir * swing * 20 + shake, y: by, swing });
    });
  }
  all.sort((p, q) => p.y - q.y).forEach(f => {
    g.globalAlpha = 0.28; g.fillStyle = (PLAYERS[f.o] || PLAYERS[RAIDERS]).color; g.beginPath(); g.ellipse(f.x, f.y + 2, 12, 4.5, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    RealmIso.drawUnitAt(g, f.k, f.dir < 0 ? Math.PI / 2 : -Math.PI / 2, t * 2 + f.x, f.x, f.y, (isCav(f.k) ? UK * 0.8 : UK) * UKK);
    if (f.swing > 0.55) { // a slash arc in front of the attacker
      const sx = f.x - f.dir * 14, sy = f.y - 16; g.beginPath(); g.arc(sx, sy, 11, f.dir < 0 ? -1.2 : Math.PI + 1.2, f.dir < 0 ? 1.2 : Math.PI - 1.2, f.dir > 0); g.lineWidth = 3.2; g.strokeStyle = 'rgba(255,255,255,' + ((f.swing - 0.55) * 2).toFixed(2) + ')'; g.stroke();
    }
  });
  // crossed swords marker
  const by = cy - 70 + Math.sin(t * 3) * 3;
  g.save(); g.translate(cx, by);
  for (const s2 of [-1, 1]) { g.save(); g.rotate(s2 * 0.75); g.beginPath(); g.roundRect(-2.5, -16, 5, 26, 2); g.fillStyle = '#eef2f7'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.roundRect(-7, 6, 14, 4, 1.5); g.fillStyle = '#f4c44f'; g.fill(); g.stroke(); g.restore(); }
  g.restore();
}
function drawBattleBar(g, b, t) {
  const P = G.provs[b.prov], maxY = Math.max(...P.inner.map(q => q[1])), k = Math.max(1, 0.62 / cam.z);
  const w = 230 * k, h = 20 * k, x = P.ic[0] - w / 2, y = Math.max(battleCenter(b.prov)[1] + 34, maxY - 40 - h);
  const sides = {}; for (const a of S.units) if (a.kind === 'army' && a.battle === b && !a.retreating) (sides[a.owner] = sides[a.owner] || []).push(a);
  const order = (b.order || []).filter(o => sides[o]); if (order.length < 2) return;
  const sA = rawStrength(sides[order[0]]), sB = rawStrength(sides[order[1]]), f = sA / Math.max(1, sA + sB);
  b.shownF = b.shownF === undefined ? f : b.shownF + (f - b.shownF) * 0.15;
  g.save();
  g.beginPath(); g.roundRect(x - 3 * k, y - 3 * k, w + 6 * k, h + 6 * k, (h + 6 * k) / 2); g.fillStyle = 'rgba(243,228,196,0.96)'; g.fill(); g.lineWidth = 2.6 * k; g.strokeStyle = OL; g.stroke();
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.clip();
  g.fillStyle = PLAYERS[order[1]].color; g.fillRect(x, y, w, h);
  g.fillStyle = PLAYERS[order[0]].color; g.fillRect(x, y, w * b.shownF, h);
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x, y, w, h * 0.35);
  g.restore();
  g.beginPath(); g.moveTo(x + w * b.shownF, y - 4 * k); g.lineTo(x + w * b.shownF, y + h + 4 * k); g.lineWidth = 3 * k; g.strokeStyle = '#fff'; g.stroke();
  const font = getComputedStyle(document.body).getPropertyValue('--font-display');
  g.font = (14 * k) + 'px ' + font; g.textBaseline = 'middle'; g.lineWidth = 3.4 * k; g.strokeStyle = OL; g.fillStyle = '#fff';
  const nA = sides[order[0]].reduce((n, a) => n + troopCount(a), 0), nB = sides[order[1]].reduce((n, a) => n + troopCount(a), 0);
  g.textAlign = 'left'; g.strokeText('⚔ ' + nA, x + 8 * k, y + h / 2 + 1); g.fillText('⚔ ' + nA, x + 8 * k, y + h / 2 + 1);
  g.textAlign = 'right'; g.strokeText(nB + ' ⚔', x + w - 8 * k, y + h / 2 + 1); g.fillText(nB + ' ⚔', x + w - 8 * k, y + h / 2 + 1);
  g.font = (11 * k) + 'px ' + font; g.textAlign = 'center'; g.fillStyle = OL; g.lineWidth = 3 * k; g.strokeStyle = '#fff';
  const note = TERRAIN_MOD[world.provinces[b.prov].terrain].note; g.strokeText(note, P.ic[0], y + h + 13 * k); g.fillText(note, P.ic[0], y + h + 13 * k);
  g.restore();
}
function drawBattleFx(g, t) {
  S.fx = S.fx.filter(f => t - f.t0 < 1.4);
  const font = getComputedStyle(document.body).getPropertyValue('--font-display');
  for (const f of S.fx) {
    if (!S.visible.has(f.prov)) continue;
    const b = S.battles.find(x => x.prov === f.prov), bc = battleCenter(f.prov), c = [bc[0], bc[1] - 34], order = b && b.order ? b.order : [ME];
    const dir = order.indexOf(f.owner) === 0 ? -1 : 1, dt = t - f.t0;
    if (f.kind === 'num') {
      const x = c[0] + dir * 50, y = c[1] - 10 - dt * 36; g.globalAlpha = Math.max(0, 1 - dt / 1.2);
      g.font = '18px ' + font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = OL; g.fillStyle = '#ffb3b3';
      g.strokeText('−' + f.n, x, y); g.fillText('−' + f.n, x, y); g.globalAlpha = 1;
    } else {
      // a soldier topples over and fades, with a puff and little stars
      const x = c[0] + dir * (36 + f.r * 30), y = c[1] + 22 + f.r * 26, a = Math.max(0, 1 - dt / 1.4);
      g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(-dir * Math.min(1.4, dt * 4));
      RealmIso.drawUnitAt(g, f.unit, dir < 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0, 0, (isCav(f.unit) ? UK * 0.8 : UK) * UKK);
      g.restore();
      g.globalAlpha = a * 0.45; g.fillStyle = '#eef0f4'; g.beginPath(); g.arc(x, y - 4, 4 + dt * 9, 0, 7); g.fill();
      g.globalAlpha = a; g.fillStyle = '#fff3a6'; for (let i = 0; i < 3; i++) { const q = t * 6 + i * 2.1; g.beginPath(); g.arc(x + Math.cos(q) * 10, y - 26 + Math.sin(q) * 3, 2, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }
  }
}

// ---------- debug: spawn armies ----------
let raidCount = 0;
function spawnEnemy() {
  const mine = S.selected.find(v => v.kind === 'army' && v.owner === ME);
  const target = mine ? mine.prov : S.capital;
  // appear in a neighboring province (through an open border) and march in
  const nb = openNbr[target].map(n => n.q).filter(q => !S.units.some(v => v.owner === ME && v.prov === q));
  const from = nb.length ? nb[Math.floor(Math.random() * nb.length)] : openNbr[target][0].q;
  const r = n => Math.floor(Math.random() * (n + 1));
  const troops = { 'd-sword': 2 + r(2), 'd-spear': 1 + r(2) }; const cav = r(2); if (cav) troops['d-rider'] = cav;
  const a = mkUnit(S.nextId++, 'army', 'Raider Warband' + (++raidCount > 1 ? ' ' + raidCount : ''), from, 0);
  a.owner = RAIDERS; a.troops = troops; a.slot = freeSlot(from, a); [a.x, a.y] = slotPos(from, a.slot);
  S.units.push(a); order(a, target, true);
  toast(`${a.name} (${troopCount(a)} soldiers: ${troopText(a)}) is marching on your ${mine ? mine.name : 'capital'}!`, true);
}
function spawnMine() {
  const a = newArmy(S.capital, { 'd-sword': 3, 'd-spear': 2, 'd-rider': 1 });
  a.born = S.t; computeIncome();
  toast(`${a.name} (${troopCount(a)} soldiers) mustered at the capital.`);
}

// Q: each selected unit uses its own ability (Wayfinder surveys, Mason builds an outpost)
function abilityQ() {
  if (!S.selected.length) return toast('Select the Wayfinder to survey, or the Mason to build.', true);
  const w = S.selected.find(v => v.kind === WAYFINDER), m = S.selected.find(v => v.kind === MASON);
  if (w) surveyCommand();
  if (m) startBuild(m);
}
// ---------- survey queue ----------
// Survey surveys the Wayfinder's own province if it needs it; otherwise it picks targets:
// click an explored province to send him there, Shift-click to queue several
let surveyAim = false;
function surveyCommand() {
  const ws = S.selected.filter(v => v.kind === WAYFINDER); if (!ws.length) return;
  const here = ws.filter(w => !w.moving && !w.survey && !S.surveyed.has(w.prov) && !S.units.some(v => v !== w && v.survey && v.survey.prov === w.prov));
  if (here.length) { here.forEach(w => startSurvey(w)); return; }
  toast('This province is already surveyed. Ctrl+right-click a province and pick Survey; hold Shift to queue several.');
}
function stopAim() { surveyAim = false; cv.style.cursor = ''; }
function surveyQueued(p) { return S.units.some(v => v.kind === WAYFINDER && v.owner === ME && (v.surveyQueue.includes(p) || v.pendingSurvey === p || (v.survey && v.survey.prov === p))); }
function queueSurvey(p, append) {
  const ws = S.selected.filter(v => v.kind === WAYFINDER); if (!ws.length) { stopAim(); return; }
  if (!S.explored.has(p)) return toast('Only explored land can be queued. Walk him into the fog first.', true);
  if (S.surveyed.has(p)) return toast('That province is already surveyed.', true);
  if (surveyQueued(p)) return toast('That province is already on a survey list.');
  const w = ws.reduce((a, b) => (surveysIn(b) < surveysIn(a) ? b : a));
  if (!findPath(w, p)) return toast('No open route there.', true);
  if (append && queueLen(w) >= QUEUE_MAX) return toast(`${w.name} already has ${QUEUE_MAX} queued actions, the most allowed.`, true);
  w.autoWalk = null;
  if (!append) { w.surveyQueue = []; w.pendingSurvey = -1; if (w.survey) w.survey = null; }
  w.surveyQueue.push(p);
  toast(`Survey ${append ? 'queued' : 'ordered'} (${w.surveyQueue.length + (w.pendingSurvey >= 0 ? 1 : 0)} orders on ${w.name}’s list).`);
  if (!append) stopAim();
}
function stepSurveyQueue(u) {
  if (u.owner !== ME || u.survey || u.build || u.pending || u.battle) return;
  if (u.pendingSurvey >= 0) {
    if (u.moving) return;
    const p = u.pendingSurvey; u.pendingSurvey = -1;
    if (u.prov === p && !S.surveyed.has(p)) { startSurvey(u); return; }
  }
  if (u.moving || !u.surveyQueue.length) return;
  while (u.surveyQueue.length && S.surveyed.has(u.surveyQueue[0])) u.surveyQueue.shift();
  const p = u.surveyQueue.shift(); if (p === undefined) return;
  if (typeof p !== 'number') { if ((u.prov !== p.move || p.pt) && !order(u, p.move, true, p.pt)) toast(`${u.name} skipped a queued move: no route there.`, true); return; }
  if (u.prov === p) { startSurvey(u); return; }
  if (order(u, p, true)) u.pendingSurvey = p;
}
function startSurvey(u) {
  if (u.moving) return toast('The Wayfinder has to stop walking before he can survey.', true);
  if (u.survey) return toast('Already surveying here.');
  if (S.surveyed.has(u.prov)) return toast('This province has already been surveyed.');
  if (S.units.some(v => v !== u && v.survey && v.survey.prov === u.prov)) return toast('Someone is already surveying this province.');
  u.survey = surveyRoute(u);
  u.th = 0;
  toast('Surveying the land…');
}
function startBuild(u) {
  u = u || S.selected.find(v => v.kind === MASON);
  if (!u) return;
  if (u.moving) haltUnit(u);
  if (S.buildings.has(u.prov)) return toast('This province already has a building.', true);
  if (!S.surveyed.has(u.prov)) return toast('Survey this province with a Wayfinder first.', true);
  if (!bordersOwned(u.prov)) return toast('Outposts must border a province you own (one with a capital, fort or outpost).', true);
  if (banditsIn(u.prov)) return toast('A Bandit Gang holds this province. Drive them out with an army before you settle here.', true);
  if (u.build) return toast('Already building here.');
  const limWhy = outpostWhy(); if (limWhy) return toast(limWhy + '.', true);
  const short = Object.keys(OUTPOST_COST).filter(k => S.stock[k] < OUTPOST_COST[k]);
  if (short.length) return toast(`Not enough ${short.join(' and ')}. An outpost costs ${costText(OUTPOST_COST)}.`, true);
  for (const k in OUTPOST_COST) S.stock[k] -= OUTPOST_COST[k];
  u.build = { prov: u.prov, type: 'outpost', t0: S.t, dur: buildTime('outpost'), paid: { ...OUTPOST_COST } }; sfx('bld_work', { prov: u.prov });
  const c = G.provs[u.prov].ic; u.th = Math.atan2(c[0] - u.x, c[1] - u.y);
  toast(`Building an outpost… (−${costText(OUTPOST_COST)})`);
}
// ---------- province buildings (farm, mill, mine, ...) ----------
const extrasIn = p => S.extras.get(p) || [];
const sitesIn = p => S.units.filter(v => v.build && v.build.prov === p && BUILD_DEFS[v.build.type]);
// Masons already walking over to build here count as having claimed their plot
const pendingIn = p => S.units.filter(v => v.pending && v.pending.prov === p && v.pending.type !== 'outpost');
function usedSlots(p) { return new Set([...extrasIn(p).map(e => e.slot), ...sitesIn(p).map(v => v.build.slot), ...pendingIn(p).map(v => v.pending.slot).filter(x => x !== undefined)]); }
function buildCheck(p, type) {
  // returns null if allowed, else a short reason
  if (type === 'outpost') {
    if (S.buildings.has(p)) return 'Already has a settlement';
    if (!S.surveyed.has(p)) return 'Survey it first';
    if (!bordersOwned(p)) return 'Must border your land';
    if (banditsIn(p)) return 'A Bandit Gang holds it';
    const lim = outpostWhy(); if (lim) return lim;
    return lackText(OUTPOST_COST);
  }
  const d = BUILD_DEFS[type];
  if (d.tech && !hasTech(d.tech)) return 'Research ' + TECH_BY_ID[d.tech].name.replace('Building: ', '') + ' first';
  if (!owned(p)) return 'Needs an outpost first';
  if (type === 'farm' && !farmLand(p, hasTech('mushroom'))) return hasTech('mushroom') ? 'Only on grassland, forest or swamp' : 'Only on grassland or forest (Mushroom Farming adds swamps)';
  if (type === 'lumber' && !treeBorder[p]) return 'Needs a border of trees';
  if (type === 'goldmine' && !(yields[p].deposit && S.surveyed.has(p))) return 'Needs a Hidden Gold Deposit';
  const cap = buildCap(p, type), have = countOf(p, type);
  if (have >= cap) return cap === 1 ? (extrasIn(p).some(e => e.type === type) ? 'Already built here' : 'One is already on the way') : `All ${cap} built or under way`;
  if (usedSlots(p).size + pendingIn(p).filter(v => v.pending.slot === undefined).length >= plotCap(p)) { const st = S.buildings.get(p).stage; return `Province full (${plotCap(p)}/${plotCap(p)})` + (st === 0 ? ' · upgrade to a Fort for 4' : ''); }
  return lackText(d.cost);
}
function lackText(cost) { const short = Object.keys(cost).filter(k => S.stock[k] < cost[k]); return short.length ? 'Need ' + short.map(k => cost[k] + ' ' + k).join(', ') : null; }
function beginExtra(u, type, want) {
  const p = u.prov, why = buildCheck(p, type);
  if (why) return toast(`Can’t build a ${BUILD_DEFS[type].name} here: ${why.toLowerCase()}.`, true);
  const d = BUILD_DEFS[type], used = usedSlots(p);
  let slot = want !== undefined && !used.has(want) ? want : 0; while (used.has(slot)) slot++;
  for (const k in d.cost) S.stock[k] -= d.cost[k];
  const [ox, oy] = bslotOf(p, slot);
  u.build = { prov: p, type, slot, ox, oy, t0: S.t, dur: buildTime(type), paid: { ...d.cost } }; sfx('bld_work', { prov: p });
  u.th = Math.atan2(ox + G.provs[p].ic[0] - u.x, oy + G.provs[p].ic[1] - u.y);
  toast(`Building a ${d.name}… (−${costText(d.cost)})`);
}
// a build order from the menu: walk there first if needed, then start
function orderBuild(u, p, type, slot) {
  if (u.prov !== p) { if (!order(u, p)) return false; u.pending = { prov: p, type, slot }; toast(`${u.name} is heading out to build ${type === 'outpost' ? 'an outpost' : 'a ' + BUILD_DEFS[type].name}.`); return true; }
  if (u.moving) { order(u, p, true); u.pending = { prov: p, type, slot }; return true; }
  type === 'outpost' ? startBuild(u) : beginExtra(u, type, slot);
  return true;
}
// pick the Mason to send: the closest one (by route) who isn't busy building or already on his way to build
function nearestMason(p) {
  let best = null, bd = Infinity;
  for (const u of S.units) {
    if (u.kind !== MASON || u.owner !== ME || u.build || u.pending) continue;
    const hops = findPath(u, p); if (!hops) continue;
    let d = Math.hypot(u.x - G.provs[p].ic[0], u.y - G.provs[p].ic[1]) * 0.01 + hops.length;
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}

const costText = c => Object.entries(c).map(([k, v]) => v + ' ' + k).join(', ');
// stop a unit where it stands, dropping its route and queued orders
function haltUnit(u) { u.path = []; u.moving = false; u.final = undefined; u.pending = null; u.surveyQueue = []; u.pendingSurvey = -1; u.autoWalk = null; u.slot = -1; }
function cancelBuild(u) { if (u.build && u.build.paid) { const st = stockOf(u.owner); for (const k in u.build.paid) st[k] += u.build.paid[k]; } u.build = null; }
function togglePause() { S.paused = !S.paused; $q('#paused').hidden = !S.paused || !$q('#settings').hidden; const pb = $q('#pauseBtn'); if (pb) { pb.setAttribute('aria-pressed', S.paused ? 'true' : 'false'); pb.innerHTML = S.paused ? PLAY_ICON : PAUSE_ICON; pb.setAttribute('aria-label', S.paused ? 'Resume' : 'Pause'); } if (typeof soundPaused === 'function') soundPaused(S.paused); }
const PAUSE_ICON = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="4.5" y="3.5" width="4" height="13" rx="1" fill="currentColor"/><rect x="11.5" y="3.5" width="4" height="13" rx="1" fill="currentColor"/></svg>', PLAY_ICON = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M6 3.5v13l10-6.5z" fill="currentColor"/></svg>';
function update(realT) {
  if (S.selected.some(u => u.exiting || u.fleeing || u.retreatHome)) S.selected = S.selected.filter(u => !u.exiting && !u.fleeing && !u.retreatHome);   // fleeing Wayfinders can't be commanded either   // units marching home after a peace deal can't be commanded
  sndSelection(); sndWatch(S.t);
  if (!S.started) { S.last = realT; menuDrift(realT); return; }
  // game time only advances while unpaused; the camera keeps working either way
  const rdt = Math.min(0.1, S.last ? realT - S.last : 0); S.last = realT;
  const dt = S.paused ? 0 : rdt; S.t += dt; const t = S.t;
  for (const u of S.units) {
    if (u.moving) {
      let time = dt;
      while (time > 0 && u.path.length) {
        if (siegeHold(u, time)) { time = 0; break; }
        const wp = u.path[0], sp = SPEED * unitSpeed(u) / (u.scouting !== null ? SCOUT_SLOW : 1) * (onRoad(u, wp) ? roadSpeed() : 1) / (u.stealth ? 3 : 1), dx = wp.x - u.x, dy = wp.y - u.y, d = Math.hypot(dx, dy);
        if (d > 0.5) u.th = Math.round(Math.atan2(dx, dy) / (Math.PI / 4)) * (Math.PI / 4);
        if (d <= sp * time) {
          u.x = wp.x; u.y = wp.y; time -= d / sp; u.path.shift();
          if (wp.enter !== undefined) {
            // stepping into unexplored land: slow down, and reveal it only on arrival
            u.lastProv = u.prov; u.prov = wp.enter;
            if (u.kind === 'army' && !u.retreating && hostilesIn(u.prov, u.owner).length) { u.path = []; u.moving = false; u.slot = -1; time = 0; continue; }
            if (u.retreating && !hostilesIn(u.prov, u.owner).length) u.retreating = false;
            u.scouting = (u.kind === WAYFINDER && u.owner === ME && !S.explored.has(wp.enter)) ? wp.enter : null;
            if (u.kind === WAYFINDER && u.owner === ME && banditFlee(u)) { time = 0; continue; }
          } else if (u.scouting !== null && u.scouting === u.prov) {
            S.wf.add(u.prov); u.scouting = null;
          }
          if (!u.path.length && !wp.slot) { u.slot = freeSlot(u.prov, u); const [x, y] = slotPos(u.prov, u.slot); u.path.push({ x, y, slot: true }); }
          else if (!u.path.length && wp.slot) { u.moving = false; u.th = 0; u.arrived = S.t; if (u.fleeing) { u.fleeing = false; cmdKey = ''; rosterKey = ''; } if (u.retreating) u.retreating = false; if (u.retreatHome) { u.retreatHome = false; cmdKey = ''; rosterKey = ''; if (u.owner === ME) toast(`${u.name} is back under your command at ${provName(u.prov)}.`); } if (u.exiting && (nationOf(u.prov) === u.owner || u.exitTo === u.prov)) { u.exiting = false; u.exitTo = undefined; } }
        } else { u.x += dx / d * sp * time; u.y += dy / d * sp * time; time = 0; }
      }
    }
    if (u.kind === WAYFINDER && u.owner === ME && u.scouting === null) S.wf.add(u.prov);
    if (u.survey) {
      if (u.moving || u.prov !== u.survey.prov) u.survey = null;
      else {
        // walk the boundary in step with the survey
        const f = Math.min(1, (t - u.survey.t0) / u.survey.dur), [hx, hy] = routeAt(u.survey, f), dx = hx - u.x, dy = hy - u.y;
        if (Math.hypot(dx, dy) > 0.3) u.th = Math.round(Math.atan2(dx, dy) / (Math.PI / 4)) * (Math.PI / 4);
        u.x = hx; u.y = hy;
        if (f >= 1) {
          S.surveyed.set(u.prov, t);
          const y = yields[u.prov];
          sfx('pr_survey', { prov: u.prov }); toast('Survey complete: ' + RES.map(k => y[k] + ' ' + k).join(', ') + ' every 10 s.' + (y.deposit ? ' Found a Hidden Gold Deposit!' : ''));
          if (u.owner === ME) S.spFound.add(u.prov);
          if (setpieceAt(u.prov)) showSetpiecePop(u.prov, u);
          if (u.owner === ME) surveyFinds(u);   // SMA02 Forgotten Treasure, SMA04 Intact Ruins
          u.survey = null;
          if (!u.surveyQueue.length || typeof u.surveyQueue[0] !== 'number') order(u, u.prov, true);   // stroll back to his spot unless more surveys are queued
        }
      }
    }
    autoSurvey(u, t);
    stepSurveyQueue(u);
    if (u.pending && !u.moving) {
      const pb = u.pending; u.pending = null;
      if (u.prov === pb.prov) pb.type === 'outpost' ? startBuild(u) : beginExtra(u, pb.type, pb.slot);
    }
    if (u.build) {
      if (u.moving || u.prov !== u.build.prov) cancelBuild(u);
      else if (t - u.build.t0 >= (u.build.dur || BUILD_TIME)) {
        if (u.build.type === 'road' || u.build.type === 'wall' || u.build.type === 'rewall') finishLink(u.build);
        else if (u.build.type && u.build.type !== 'outpost') {
          if (nationOf(u.prov) === u.owner) {
            const list = S.extras.get(u.prov) || []; list.push({ type: u.build.type, slot: u.build.slot, born: t }); S.extras.set(u.prov, list);
            if (u.owner === ME) { toast(`${BUILD_DEFS[u.build.type].name} built.`); sfx('bld_done', { prov: u.prov }); computeIncome(); }
          } else { cancelBuild(u); if (u.owner === ME) toast('The province is no longer yours: construction cancelled, resources refunded.', true); }
        } else if (!S.buildings.has(u.prov)) {
          S.buildings.set(u.prov, { stage: 0, born: t, owner: u.owner });
          territory = null; cacheDirty = true; computeIncome();
          outpostClaimed(u.prov, u.owner);
          if (u.owner === ME) { toast('Outpost built. Its neighbors are now explored.'); sfx('bld_outpost', { prov: u.prov }); }
        } else if (u.build.type === 'outpost') { cancelBuild(u); if (u.owner === ME) toast('Someone claimed this province first: outpost cancelled, resources refunded.', true); }
        if (u.owner !== ME) aiBuilt(u);
        u.build = null;
      }
    }
  }
  // the camera pans when the mouse touches an edge of the screen
  if (S.started && edgeMouse.in && document.hasFocus() && $q('#settings').hidden) {
    const E = 14, v = 750 / cam.z * rdt; let ex = 0, ey = 0;
    if (edgeMouse.x <= E) ex = -1; else if (edgeMouse.x >= cw - 1 - E) ex = 1;
    if (edgeMouse.y <= E) ey = -1; else if (edgeMouse.y >= ch - 1 - E) ey = 1;
    if (ex || ey) { camTween = null; cam.x += ex * v; cam.y += ey * v; clampCam(); cacheDirty = true; }
  }
  if (keysHeld.size) {
    const v = 750 / cam.z * rdt; let mx = 0, my = 0;
    if (keysHeld.has('arrowleft')) mx -= v; if (keysHeld.has('arrowright')) mx += v;
    if (keysHeld.has('arrowup')) my -= v; if (keysHeld.has('arrowdown')) my += v;
    if (mx || my) { camTween = null; cam.x += mx; cam.y += my; clampCam(); cacheDirty = true; }
  }
  if (!S.nextTick) S.nextTick = t + TICK;
  while (t >= S.nextTick) { const nt = S.nextTick; S.nextTick += TICK; try { payday(nt); } catch (e) { reportError(e, 'payday'); } }
  // each part runs on its own: an error in one is reported and the rest of the game carries on
  const run = (name, f) => { try { f(); } catch (e) { reportError(e, name); } };
  run('bar', () => updateBar(t));
  run('training', () => stepTraining(t));
  if (!S.paused) { run('battles', () => stepBattles(t)); run('war', () => stepWar(t)); run('ai', () => stepAI(t)); run('arrows', () => stepArrows(t)); run('scouts', () => stepScouts(t)); run('magic', () => stepMagic(t, dt)); }
  run('content', () => stepContent(t, dt));
  if (!S.paused) run('gpc', () => stepGPC(t, dt));
  run('v78', () => stepV78(t, dt));
  run('stock', () => clampStock());
  run('diplomacy', () => renderDip(t));
  run('research', () => renderTech());
  run('armory', () => renderArmory());
  run('upgrades', () => stepUpgrades(t));
  run('camera', () => stepCamTween(realT));
  run('capital', () => capPanel(t));
  run('province', () => provMenu());
  run('outliner', () => { renderRoster(); renderFlags(); });
  run('minimap', () => drawMini());
  run('commands', () => renderCmd());
  run('fog', () => computeFog());
  run('selection', () => selUI());
}

// ---------- resources ----------
// every province rolls its yield once per world; an owned province pays its yield every 10 seconds
const TICK = 10;
const RES = ['gold', 'wood', 'food'];
const RES_LABEL = { gold: 'Gold', wood: 'Wood', food: 'Food' };
let yields = [], income = { gold: 0, wood: 0, food: 0 };
function rollYields() {
  const r = rngFrom(world.seed + ':resources');
  yields = world.provinces.map(p => {
    const y = { gold: 0, wood: 0, food: 0 }, bonus = { gold: 0, wood: 0, food: 0 };
    const roll = (k, chance) => { const hit = r() < chance; if (hit) { y[k]++; bonus[k]++; } };
    if (p.terrain === 'grassland') { y.gold = 1; y.wood = 2; y.food = 3; roll('food', 0.5); roll('wood', 0.25); roll('gold', 0.1); }
    else if (p.terrain === 'forest') { y.gold = 1; y.wood = 3; y.food = 2; roll('wood', 0.5); roll('food', 0.25); roll('gold', 0.1); }
    else if (p.terrain === 'desert') { y.gold = 1; roll('gold', 0.25); }
    else if (p.terrain === 'swamp') { y.wood = 2; y.food = 1; if (r() < 0.25) { const k = r() < 0.5 ? 'wood' : 'food'; y[k]++; bonus[k]++; } }
    // province modifier: a hidden gold deposit (25% in deserts, 5% elsewhere), found by surveying
    const deposit = r() < (p.terrain === 'desert' ? 0.25 : 0.05);
    return { ...y, bonus, deposit };
  });
  // how many of a province's borders are made of trees (one Lumber Mill per tree border)
  treeBorder = world.provinces.map((_, i) => world.edges.filter(e => (e.a === i || e.b === i) && !e.open && e.style === 'trees').length);
}
let treeBorder = [];
// how many of a building type a province can hold: 4 farms, one Lumber Mill per tree border, one of everything else
const buildCap = (p, type) => type === 'farm' ? 4 : type === 'lumber' ? treeBorder[p] : 1;
const countOf = (p, type) => extrasIn(p).filter(e => e.type === type).length + sitesIn(p).filter(v => v.build.type === type).length + pendingIn(p).filter(v => v.pending.type === type).length;
const capNote = (p, type) => buildCap(p, type) > 1 ? ` · ${countOf(p, type)}/${buildCap(p, type)} here` : '';
const ptype = part => part ? part.split('@')[0] : part;
function extrasBonus(p) { const y = { gold: 0, wood: 0, food: 0 }; for (const e of extrasIn(p)) { const gv = givesOf(e.type); for (const k in gv) y[k] += gv[k]; } return y; }
function provinceIncome(p, b) {
  const x = extrasBonus(p), y = {}; for (const k of RES) y[k] = yields[p][k] + (b.stage === 2 ? CAPITAL_BONUS[k] : 0) + x[k];
  if (b.stage === 2 && b.owner === ME) y.gold += tradeGold();   // Trade Routes: markets the capital reaches by road
  return y;
}
function upkeep() {
  const u = { gold: 0, wood: 0, food: 0 };
  for (const v of S.units) {
    if (v.owner !== ME) continue;
    if (v.kind === 'army') { for (const tk in v.troops) { const d = UNIT_DEFS[tk]; for (const k in d.upkeep) u[k] += d.upkeep[k] * v.troops[tk]; } continue; }
    const d = UNIT_DEFS[v.kind]; for (const k in d.upkeep) u[k] += d.upkeep[k];
  }
  for (const [p, b] of S.buildings) if (b.owner === ME) for (const e of extrasIn(p)) { const up = BUILD_DEFS[e.type].upkeep || {}; for (const k in up) u[k] += up[k]; }
  for (const [p, b] of S.buildings) if (b.owner === ME && b.stage === 0) for (const k in OUTPOST_UPKEEP) u[k] += OUTPOST_UPKEEP[k];
  return u;
}
let incomeParts = null;
function computeIncome() {
  const gross = { gold: 0, wood: 0, food: 0 }, up = upkeep();
  for (const [p, b] of S.buildings) if (b.owner === ME && !S.occ.has(p)) { const y = provinceIncome(p, b); for (const k of RES) gross[k] += y[k]; }
  const tb = techBonus(); for (const k of RES) gross[k] += tb[k];
  gross.food += harvestFood();
  gross.wood += lumberBonus();   // Sawyer Guilds
  income = {}; for (const k of RES) income[k] = gross[k] - up[k];
  incomeParts = { gross, up };
  const fromB = { gold: 0, wood: 0, food: 0 }; for (const [p, b] of S.buildings) if (b.owner === ME) { const x = extrasBonus(p); for (const k of RES) fromB[k] += x[k]; }
  if (barEls.gold) RES.forEach(k => barEls[k].el.title = `${RES_LABEL[k]}: +${gross[k]} (capital +${CAPITAL_BONUS[k]}${fromB[k] ? ', buildings +' + fromB[k] : ''}), −${up[k]} upkeep`);
}
function payday(t) {
  const short = S.stock.food + income.food < 0;   // soldiers only need feeding: units have food upkeep only
  for (const k of RES) S.stock[k] = Math.max(0, S.stock[k] + income[k]);
  stepExhaustion(short);
  aiPayday();
  techPayday();
  for (const [p, b] of S.buildings) {
    if (b.owner !== ME || S.occ.has(p)) continue;
    const y = provinceIncome(p, b), ks = RES.filter(k => y[k] > 0);
    // (no floating numbers over provinces: the badge under each province shows what it makes)
  }
  bumpBar();
}
// small vector icons shared by the map and the top bar
function resIcon(g, k, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 2.4; g.strokeStyle = OL;
  if (k === 'gold') {
    g.beginPath(); g.arc(0, 1.5, 9, 0, 7); g.fillStyle = '#c99a2c'; g.fill(); g.stroke();
    g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fillStyle = '#f4c44f'; g.fill(); g.stroke();
    g.beginPath(); g.arc(0, 0, 5.4, 0, 7); g.lineWidth = 1.6; g.strokeStyle = '#c99a2c'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-3.4, -3.6, 2.4, 1.4, -0.6, 0, 7); g.fill();
  } else if (k === 'wood') {
    g.beginPath(); g.roundRect(-10, -5, 17, 11, 4); g.fillStyle = '#a5713f'; g.fill(); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-7, -1); g.lineTo(3, -1); g.moveTo(-6, 2.5); g.lineTo(2, 2.5); g.stroke();
    g.lineWidth = 2.4; g.strokeStyle = OL; g.beginPath(); g.ellipse(7, 0.5, 4, 5.5, 0, 0, 7); g.fillStyle = '#e6c08a'; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(7, 0.5, 1.6, 2.4, 0, 0, 7); g.lineWidth = 1.2; g.strokeStyle = '#a5713f'; g.stroke();
    g.lineWidth = 2; g.strokeStyle = OL; g.beginPath(); g.moveTo(-5, -5); g.lineTo(-2, -10); g.stroke(); g.beginPath(); g.ellipse(-1, -11, 3, 1.8, -0.5, 0, 7); g.fillStyle = '#5fbf5a'; g.fill(); g.lineWidth = 1.4; g.stroke();
  } else {
    // an ear of corn with its husk leaves
    g.rotate(0.35);
    g.beginPath(); g.moveTo(-1, 12); g.quadraticCurveTo(-11, 6, -8, -5); g.quadraticCurveTo(-5, 4, -1, 7); g.closePath(); g.fillStyle = '#5fae4a'; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(1, -2, 5.6, 10.5, 0, 0, 7); g.fillStyle = '#f4c44f'; g.fill(); g.stroke();
    g.save(); g.beginPath(); g.ellipse(1, -2, 5.6, 10.5, 0, 0, 7); g.clip();
    g.strokeStyle = '#c99a2c'; g.lineWidth = 1.1;
    for (let yy = -10; yy <= 8; yy += 3.4) { g.beginPath(); g.moveTo(-5, yy); g.lineTo(7, yy); g.stroke(); }
    for (const xx of [-1.6, 1, 3.6]) { g.beginPath(); g.moveTo(xx, -13); g.lineTo(xx, 9); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-1.6, -6, 1.6, 4, 0, 0, 7); g.fill();
    g.restore();
    g.lineWidth = 2.4; g.strokeStyle = OL;
    g.beginPath(); g.moveTo(1, 12); g.quadraticCurveTo(11, 7, 9, -4); g.quadraticCurveTo(6, 4, 2, 6); g.closePath(); g.fillStyle = '#78c25a'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, 11); g.lineTo(0.5, 15); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = '#5fae4a'; g.stroke();
    g.lineWidth = 1.4; g.strokeStyle = '#a8662a'; g.beginPath(); g.moveTo(1, -12.5); g.quadraticCurveTo(-1, -16, 2.5, -17); g.moveTo(1, -12.5); g.quadraticCurveTo(4, -15, 3.5, -17.5); g.stroke();
  }
  g.restore();
}
function drawYieldBadge(g, p, age = 9) {
  // your provinces show what they actually make every payout (land, capital bonus, buildings, research); others show the land's yield
  const b = S.buildings.get(p), base = yields[p];
  let y = base;
  if (b && b.owner === ME) {
    const inc = S.occ.has(p) ? { gold: 0, wood: 0, food: 0 } : provinceIncome(p, b);
    y = { ...inc, deposit: base.deposit && !extrasIn(p).some(e => e.type === 'goldmine'), bonus: { gold: inc.gold > base.gold, wood: inc.wood > base.wood, food: inc.food > base.food } };
  }
  if (!(b && b.owner === ME)) y = { ...y, foreign: true };
  const P = G.provs[p], ks = RES.filter(k => y[k] > 0);
  if (!ks.length) return;
  const pop = age < 1.2 ? Math.max(0.01, 1 - Math.exp(-age * 7) * Math.cos(age * 14)) : 1;
  if (pop !== 1) { g.save(); g.translate(P.ic[0], P.ic[1] + 131); g.scale(pop, pop); g.translate(-P.ic[0], -P.ic[1] - 131); }
  drawBadgeBody(g, p, y, P, ks);
  if (pop !== 1) g.restore();
}
function drawBadgeBody(g, p, y, P, ks) {
  const k = Math.max(1, 0.62 / cam.z), w = (ks.length * 44 + 10 + (y.deposit ? 30 : 0)) * k, h = 26 * k, x = P.ic[0] - w / 2, yy = P.ic[1] + 118;
  g.save();
  if (y.foreign) { g.globalAlpha = 0.72; if ('filter' in g) g.filter = 'grayscale(1)'; }   // not yours: grayed out
  g.beginPath(); g.roundRect(x, yy, w, h, h / 2); g.fillStyle = 'rgba(243,228,196,0.94)'; g.fill(); g.lineWidth = 2.6 * k; g.strokeStyle = OL; g.stroke();
  g.font = (15 * k) + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); g.textBaseline = 'middle'; g.textAlign = 'left';
  ks.forEach((r, i) => {
    const cx = x + (10 + i * 44) * k + 8 * k;
    resIcon(g, r, cx, yy + h / 2, 0.72 * k);
    g.fillStyle = y.bonus[r] ? '#1f7a2e' : OL; g.fillText(String(y[r]), cx + 11 * k, yy + h / 2 + 1 * k);
  });
  if (y.deposit) {
    // a small pick over a gold nugget marks the hidden deposit
    const cx = x + (10 + ks.length * 44) * k + 9 * k, cy = yy + h / 2;
    g.beginPath(); g.arc(cx, cy, 10 * k, 0, 7); g.fillStyle = '#fff1c2'; g.fill(); g.lineWidth = 2 * k; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.moveTo(cx - 5 * k, cy + 3 * k); g.lineTo(cx - 3 * k, cy - 2 * k); g.lineTo(cx + 2 * k, cy - 4 * k); g.lineTo(cx + 5 * k, cy + 1 * k); g.lineTo(cx + 1 * k, cy + 4 * k); g.closePath(); g.fillStyle = '#f4c44f'; g.fill(); g.lineWidth = 1.4 * k; g.stroke();
    g.fillStyle = '#fff'; g.fillRect(cx - 1.5 * k, cy - 2.5 * k, 2 * k, 1.5 * k);
  }
  g.restore();
}
function drawPops(g, t) {
  S.pops = S.pops.filter(p => t - p.t0 < 1.6);
  const font = getComputedStyle(document.body).getPropertyValue('--font-display');
  for (const p of S.pops) {
    const dt = t - p.t0; if (dt < 0) continue;
    const P = G.provs[p.prov], k = Math.max(1, 0.62 / cam.z), x = P.ic[0] + p.dx * k, y = P.ic[1] - 60 - dt * 42 * k;
    const pop = dt < 0.25 ? 0.6 + dt * 1.6 + Math.sin(dt * 25) * 0.08 : 1;
    g.save(); g.globalAlpha = dt > 1.1 ? Math.max(0, 1 - (dt - 1.1) / 0.5) : 1;
    resIcon(g, p.k, x - 10 * k, y, 0.8 * k * pop);
    g.font = (17 * k * pop) + 'px ' + font; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = 4 * k; g.strokeStyle = OL; g.fillStyle = '#fff';
    const lbl = (p.n > 0 ? '+' : '−') + Math.abs(p.n); if (p.n < 0) g.fillStyle = '#ffb3b3';
    g.strokeText(lbl, x + 1 * k, y + 1 * k); g.fillText(lbl, x + 1 * k, y + 1 * k);
    g.restore();
  }
}
// top bar
const barEls = {};
let barKey = '';
function setupBar() {
  const bar = $q('#res');
  bar.innerHTML = RES.map(k => {
    const c = document.createElement('canvas'); c.width = c.height = 44; resIcon(c.getContext('2d'), k, 22, 23, 1.9);
    return `<span class="r" id="r-${k}" title="${RES_LABEL[k]}"><img alt="${RES_LABEL[k]}" src="${c.toDataURL()}"><b></b><em class="rcap"></em><small></small></span>`;
  }).join('') + '<span class="r exh" id="r-exh" title="Army Exhaustion: rises every payout you can’t feed your army. At 10 the whole army deserts." hidden><b></b></span><span class="tick" title="Next payout"><i></i></span>';
  RES.forEach(k => { const el = $q('#r-' + k); barEls[k] = { el, b: el.querySelector('b'), s: el.querySelector('small'), c: el.querySelector('.rcap') }; });
  barEls.tick = bar.querySelector('.tick i'); barEls.exh = $q('#r-exh');
}
function updateBar(t) {
  const caps = {}; RES.forEach(k => caps[k] = storageCap(k));
  const key = RES.map(k => S.stock[k] + ':' + income[k] + ':' + caps[k]).join('|');
  if (key !== barKey) { barKey = key; RES.forEach(k => { barEls[k].c.textContent = '/' + caps[k]; barEls[k].c.classList.toggle('full', S.stock[k] >= caps[k]); barEls[k].b.textContent = S.stock[k]; barEls[k].s.textContent = '(' + (income[k] < 0 ? '−' + (-income[k]) : '+' + income[k]) + ')'; barEls[k].s.style.color = income[k] < 0 ? '#b3261e' : ''; }); }
  const fk = S.exhaust + '';
  if (fk !== barEls.fk) { barEls.fk = fk; barEls.exh.hidden = !S.exhaust; barEls.exh.querySelector('b').textContent = 'Exhaustion ' + S.exhaust + '/' + EXHAUST_MAX; }
  const f = Math.max(0, Math.min(1, 1 - (S.nextTick - t) / TICK));
  barEls.tick.style.background = `conic-gradient(#ffc93c ${Math.round(f * 360)}deg, #e9edf3 0deg)`;
}
function bumpBar() { RES.forEach(k => { if (!income[k]) return; const el = barEls[k].el; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }); }

// ---------- territory borders ----------
// each player's land is outlined in their color, but only where it meets someone else's land, unowned land, a lake or the sea;
// borders between two of the same player's provinces stay plain
let territory = null;
function buildTerritory() {
  const V = world.vertices, ek = (a, b) => a < b ? a + '_' + b : b + '_' + a;
  const edgeBy = new Map(); world.edges.forEach(e => edgeBy.set(ek(e.v[0], e.v[1]), e));
  const byOwner = new Map();
  for (const [p, b] of S.buildings) {
    if (!byOwner.has(b.owner)) byOwner.set(b.owner, { area: new Path2D(), line: new Path2D() });
    const T = byOwner.get(b.owner), vs = world.provinces[p].verts;
    G.provs[p].pts.forEach(([x, y], k) => k ? T.area.lineTo(x, y) : T.area.moveTo(x, y)); T.area.closePath();
    for (let k = 0; k < vs.length; k++) {
      const a = vs[k], c = vs[(k + 1) % vs.length], e = edgeBy.get(ek(a, c));
      if (e) { const other = e.a === p ? e.b : e.a, ob = S.buildings.get(other); if (ob && ob.owner === b.owner) continue; }
      T.line.moveTo(V[a][0], V[a][1]); T.line.lineTo(V[c][0], V[c][1]);
    }
  }
  territory = byOwner; miniDirty = true;
}
// zoomed out, the nation's edge is also drawn over the border trees and mountains
function drawTerritoryTop(g) {
  if (!territory) return;
  const px = 1 / cam.z, a = Math.max(0, Math.min(0.9, (px - 1.6) / 1.6)); if (a <= 0) return;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  for (const [owner, T] of territory) { g.globalAlpha = a; g.lineWidth = 7 * px; g.strokeStyle = OL; g.stroke(T.line); g.lineWidth = 4.5 * px; g.strokeStyle = PLAYERS[owner].color; g.stroke(T.line); }
  g.restore();
}
function drawTerritory(g) {
  if (!territory) buildTerritory();
  const px = 1 / cam.z;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  for (const [owner, T] of territory) {
    const col = PLAYERS[owner].color;
    // a soft band of color on the inside of the border, then a solid stripe, then a thin ink edge
    g.save(); g.clip(T.area);
    // a wide wash of the nation's color bleeds in from the border, so the outline still reads past the border trees and mountains when zoomed out
    g.globalAlpha = 0.05; g.fillStyle = col; g.fill(T.area);
    g.globalAlpha = 0.08; g.strokeStyle = col; g.lineWidth = Math.max(182, 48 * px); g.stroke(T.line);
    g.globalAlpha = 0.11; g.lineWidth = Math.max(117, 25 * px); g.stroke(T.line);
    g.globalAlpha = 0.28; g.strokeStyle = col; g.lineWidth = 64; g.stroke(T.line);
    g.globalAlpha = 1; g.lineWidth = Math.max(18, 9 * px); g.strokeStyle = col; g.stroke(T.line);
    g.lineWidth = Math.max(4, 2 * px); g.strokeStyle = PLAYERS[owner].light; g.globalAlpha = 0.9;
    g.setLineDash([]); g.stroke(T.line);
    g.restore();
    g.lineWidth = Math.max(3.5, 2 * px); g.strokeStyle = OL; g.stroke(T.line);
  }
  g.restore();
}

// ---------- drawing ----------
function renderFog() {
  const g = fctx;
  if (!S.started) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, fcache.width, fcache.height); fogDirty = false; return; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, fcache.width, fcache.height);
  g.fillStyle = '#2f3b55'; g.fillRect(0, 0, fcache.width, fcache.height);
  worldTx(g);
  // cut out explored land, plus a band of sea along explored coasts
  g.globalCompositeOperation = 'destination-out';
  const ex = new Path2D(), V = world.vertices, segs = [];
  for (const i of S.explored) {
    G.provs[i].pts.forEach(([x, y], k) => k ? ex.lineTo(x, y) : ex.moveTo(x, y)); ex.closePath();
    for (const [a, b] of world.provinces[i].coast) segs.push([a, b]);
  }
  const sea = coastChains(segs, V);
  g.fillStyle = '#000'; g.fill(ex);
  g.lineJoin = 'round'; g.lineCap = 'butt'; g.strokeStyle = '#000';
  g.lineWidth = 24; g.stroke(ex);
  g.lineWidth = 280; g.stroke(sea);
  // cloud texture on what is still fogged
  g.globalCompositeOperation = 'source-atop';
  const [vx0, vy0, vx1, vy1] = viewRect(400), step = 360;
  for (let gx = Math.floor(vx0 / step) * step; gx < vx1; gx += step) for (let gy = Math.floor(vy0 / step) * step; gy < vy1; gy += step) {
    const h = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453, f = h - Math.floor(h), f2 = (f * 7.31) % 1, f3 = (f * 13.7) % 1;
    const x = gx + f * step * 0.6, y = gy + f2 * step * 0.6, r = 60 + f3 * 40;
    // one cloud = a few puffs merged into a single shape, with a light top and a soft shadow
    const puffs = [[0, 0, 1], [-1.1, 0.35, 0.72], [1.1, 0.3, 0.78], [-0.45, -0.55, 0.75], [0.55, -0.5, 0.82]];
    const shape = (dy) => { const p = new Path2D(); for (const [ax, ay, ar] of puffs) { p.moveTo(x + ax * r + ar * r, y + ay * r + dy); p.arc(x + ax * r, y + ay * r + dy, ar * r, 0, 7); } return p; };
    g.fillStyle = 'rgba(12,18,36,0.22)'; g.fill(shape(r * 0.35));
    g.fillStyle = 'rgba(196,210,232,0.20)'; g.fill(shape(0));
    g.fillStyle = 'rgba(236,242,252,0.14)'; const top = new Path2D(); top.arc(x - r * 0.35, y - r * 0.45, r * 0.55, 0, 7); g.fill(top);
  }
  // explored but nobody there: dimmed, contents hidden
  g.globalCompositeOperation = 'source-over';
  const dim = new Path2D();
  for (const i of S.explored) if (!S.visible.has(i)) { G.provs[i].pts.forEach(([x, y], k) => k ? dim.lineTo(x, y) : dim.moveTo(x, y)); dim.closePath(); }
  g.fillStyle = 'rgba(16,24,46,0.38)'; g.fill(dim);
  g.lineWidth = Math.max(3, 2 / cam.z); g.strokeStyle = 'rgba(16,24,46,0.35)'; g.stroke(dim);
  fogDirty = false;
}
// GC25: the coast segments are joined into continuous lines, so the band of sea follows the coast's corners smoothly
// (stroked as separate pieces, every corner left a notch) while the ends of the band still stop square
function coastChains(segs, V) {
  const path = new Path2D(), at = new Map(), used = new Array(segs.length).fill(false);
  segs.forEach(([a, b], i) => { for (const v of [a, b]) (at.get(v) || at.set(v, []).get(v)).push(i); });
  const next = (v, from) => (at.get(v) || []).find(j => j !== from && !used[j]);
  // start chains at loose ends first, then whatever is left (closed loops)
  const order = segs.map((_, i) => i).sort((x, y) => Math.min(at.get(segs[x][0]).length, at.get(segs[x][1]).length) - Math.min(at.get(segs[y][0]).length, at.get(segs[y][1]).length));
  for (const i0 of order) {
    if (used[i0]) continue;
    let [a, b] = segs[i0]; if (at.get(a).length > 1 && at.get(b).length === 1) [a, b] = [b, a];
    used[i0] = true; path.moveTo(V[a][0], V[a][1]); path.lineTo(V[b][0], V[b][1]);
    let v = b, j = i0;
    for (;;) { const k = next(v, j); if (k === undefined) break; used[k] = true; const w = segs[k][0] === v ? segs[k][1] : segs[k][0]; path.lineTo(V[w][0], V[w][1]); v = w; j = k; }
  }
  return path;
}
let hoverProv = -1, hoverPath;
function drawGame(g, t) {
  artBudget = 4; UKK = unitK();
  drawLairGlow(g, t);   // GC18: provinces where your Wayfinders found bandits or monsters
  drawSelProvs(g, t);   // GC23: the province of every selected unit is lightly highlighted
  drawWar(g, t);
  // movement preview on hover
  if (surveyAim && hoverProv >= 0) {
    const ok = S.explored.has(hoverProv) && !S.surveyed.has(hoverProv) && !surveyQueued(hoverProv), p = G.provs[hoverProv];
    roundedPath(g, p.inner, 12); g.lineWidth = Math.max(6, 3.5 / cam.z); g.strokeStyle = ok ? '#8fe3ff' : '#ff6b6b'; g.setLineDash(ok ? [] : [14, 10]); g.stroke(); g.setLineDash([]);
  }
  const P0 = surveyAim ? null : S.selected.find(u => u.kind === WAYFINDER) && !S.explored.has(hoverProv) ? S.selected.find(u => u.kind === WAYFINDER) : primary();
  if (box) { /* no route preview while dragging a selection box */ }
  else if (P0 && hoverProv >= 0 && hoverProv !== P0.prov && (S.explored.has(hoverProv) || P0.kind === WAYFINDER)) {
    if (hoverPath === undefined || hoverPath.prov !== hoverProv || hoverPath.u !== P0) hoverPath = { prov: hoverProv, u: P0, hops: findPath(P0, hoverProv) };
    const ok = !!hoverPath.hops, p = G.provs[hoverProv];
    roundedPath(g, p.inner, 12); g.lineWidth = Math.max(5, 3 / cam.z); g.strokeStyle = ok ? '#7cf07c' : '#ff6b6b'; g.setLineDash(ok ? [] : [14, 10]); g.stroke(); g.setLineDash([]);
  } else if (hoverProv >= 0 && P0 && !S.explored.has(hoverProv)) {
    const p = G.provs[hoverProv]; roundedPath(g, p.inner, 12); g.setLineDash([14, 10]); g.lineWidth = Math.max(5, 3 / cam.z); g.strokeStyle = '#ff6b6b'; g.stroke(); g.setLineDash([]);
  }
  drawLinks(g, t);
  drawMagic(g, t); drawQuakes(g, t); drawRewalls(g, t);
  const items = [];
  // only what is on screen (with a margin for tall buildings)
  const vx0 = cam.x - cw / 2 / cam.z - 360, vx1 = cam.x + cw / 2 / cam.z + 360, vy0 = cam.y - ch / 2 / cam.z - 360, vy1 = cam.y + ch / 2 / cam.z + 420;
  const onScreen = p => { const c = G.provs[p].ic; return c[0] > vx0 && c[0] < vx1 && c[1] > vy0 && c[1] < vy1; };
  for (const [p, b] of S.buildings) if (S.visible.has(p) && onScreen(p)) items.push({ y: G.provs[p].ic[1], f: () => drawBuilding(g, p, b, t) });
  for (const [p, list] of S.extras) if (S.visible.has(p) && onScreen(p)) for (const e of list) { const c = G.provs[p].ic, [ox, oy] = bslotOf(p, e.slot); items.push({ y: c[1] + oy, f: () => { drawExtra(g, c[0] + ox, c[1] + oy, e.type, t, 1, t - e.born, e.level, owned(p)); const xu = S.xup.get(p + '@' + e.slot); if (xu) drawXupBar(g, c[0] + ox, c[1] + oy, xu, e); } }); }
  for (const u of S.units) if (u.build && S.visible.has(u.build.prov)) {
    const c = G.provs[u.build.prov].ic;
    if (u.build.type === 'road' || u.build.type === 'wall' || u.build.type === 'rewall') continue;
    if (u.build.type === 'outpost') items.push({ y: c[1], f: () => drawSite(g, u.build, t) });
    else items.push({ y: c[1] + u.build.oy, f: () => drawExtraSite(g, u.build, t) });
  }
  townItems(g, t, items); setpieceItems(g, t, items, onScreen); roadWalkerItems(g, t, items); findItems(g, t, items, onScreen); travelerItems(g, t, items);
  for (const u of S.units) if ((u.owner === ME || (S.visible.has(u.prov) && stealthSeen(u)) || armyDetected(u) || (u.bandit && u.seen && S.explored.has(u.prov))) && u.x > vx0 && u.x < vx1 && u.y > vy0 && u.y < vy1) items.push({ y: u.y, f: () => drawUnit(g, u, t) });
  for (const b of S.battles) if (S.visible.has(b.prov)) items.push({ y: battleCenter(b.prov)[1] - 4, f: () => drawBattle(g, b, t) });
  items.sort((a, b) => a.y - b.y).forEach(it => it.f());
  if (VIEW.res) for (const [p, at] of S.surveyed) if (S.explored.has(p) && !S.battles.some(b => b.prov === p)) drawYieldBadge(g, p, t - at);
  drawMoveMarks(g);       // a golden X where units were just sent
  drawProvLabels(g, t);   // GC04 / GC05: province names under their resources, your nation's name over its land
  drawSetpieces(g, t);
  for (const b of S.battles) if (S.visible.has(b.prov)) drawBattleBar(g, b, t);
  if (S.selProv >= 0) {
    const P = G.provs[S.selProv];
    if (!S.selPart) { roundedPath(g, P.inner, 12); g.lineWidth = Math.max(7, 4 / cam.z); g.strokeStyle = OL; g.stroke(); g.lineWidth = Math.max(4, 2.4 / cam.z); g.strokeStyle = '#ffc93c'; g.setLineDash([16, 10]); g.lineDashOffset = -t * 20; g.stroke(); g.setLineDash([]); }
    else {
      const pulse = 1 + Math.sin(t * 4) * 0.03, c = P.ic;
      let x = c[0], y = c[1], rx = 42, ry = 22;
      if (S.selPart === 'settlement') { const st = S.buildings.get(S.selProv).stage; rx = st === 2 ? 108 : 52; ry = st === 2 ? 56 : 28; }
      else { const e = extrasIn(S.selProv).find(v => v.slot === +S.selPart.split('@')[1]); if (e) { const o = bslotOf(S.selProv, e.slot); x += o[0]; y += o[1]; } }
      g.beginPath(); g.ellipse(x, y + 2, rx * pulse, ry * pulse, 0, 0, 7); g.lineWidth = 7; g.strokeStyle = OL; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#ffc93c'; g.stroke();
    }
  }
  for (const key in S.queues) { const q = S.queues[key][0]; if (q && q.t0 !== null) { const sp = srcSpot(key); if (S.visible.has(sp.prov)) drawProgress(g, { prov: sp.prov, ox: sp.ox, oy: sp.oy, t0: q.t0 }, t, trainTime(q.kind), '#7fb0ff', 'Training', sp.yOff); } }
  for (const u of S.units) if (u.survey) drawSurvey(g, u.survey, t);
  drawSurveyQueue(g, t);
  for (const u of S.units) if (u.build && S.visible.has(u.build.prov)) drawProgress(g, u.build, t);
  for (const [p, u] of S.upgrades) if (S.visible.has(p)) drawProgress(g, { prov: p, t0: u.t0 }, t, FORT_UPGRADE.time, '#9be37f', 'Fort', -96);
  drawPops(g, t);
  drawBattleFx(g, t);
  drawArrows(g, t);
}
// each province gets one of ten camp layouts, dressed for its terrain
const campLook = prov => ({ variant: (prov * 7 + 3) % 10, terrain: world.provinces[prov].terrain });
// ---------- bitmap cache for finished settlements and buildings ----------
// drawn once per look and zoom level into a canvas, then stamped; used when zoomed out, and for other nations' towns
const artCache = new Map();
// one small, reused canvas measures each new look; at most a few new looks are prepared per frame (the rest draw live until then),
// so zooming out over many towns never allocates a pile of big canvases at once
const ART_PROBE = 640, ART_K = 0.25, artProbe = document.createElement('canvas'); artProbe.width = artProbe.height = ART_PROBE;
const artProbeG = artProbe.getContext('2d', { willReadFrequently: true });
let artBudget = 0;
function artBox(fn) {
  const W = ART_PROBE, k = ART_K, g = artProbeG;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
  g.translate(W / 2, W / 2); g.scale(k, k); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const d = g.getImageData(0, 0, W, W).data; let x0 = W, y0 = W, x1 = 0, y1 = 0;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < x0) return [-1, -1, 1, 1];
  return [(x0 - W / 2 - 3) / k, (y0 - W / 2 - 3) / k, (x1 - W / 2 + 3) / k, (y1 - W / 2 + 3) / k];
}
// returns false when this frame's budget for new looks is spent: the caller then draws the live art
function drawArt(g, key, fn, x, y, k) {
  let A = artCache.get(key);
  if (!A) { if (artBudget <= 0) return false; artBudget--; A = { bb: artBox(fn), cvs: new Map() }; artCache.set(key, A); }
  const sc = bucket() * k, [x0, y0, x1, y1] = A.bb;
  let cv = A.cvs.get(sc);
  if (!cv) { if (artBudget <= 0) return false; artBudget--; cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil((x1 - x0) * sc)); cv.height = Math.max(1, Math.ceil((y1 - y0) * sc)); const c = cv.getContext('2d'); c.scale(sc, sc); c.translate(-x0, -y0); c.lineJoin = 'round'; c.lineCap = 'round'; fn(c); A.cvs.set(sc, cv); }
  g.drawImage(cv, x + x0 * k, y + y0 * k, (x1 - x0) * k, (y1 - y0) * k);
  return true;
}
function drawBuilding(g, prov, b, t) {
  const p = G.provs[prov], dt = t - b.born, s = dt < 1.5 ? Math.max(0, 1 - Math.exp(-dt * 7) * Math.cos(dt * 15)) : 1;
  if (dt >= 1.5 && dpr * cam.z <= (b.owner === ME ? 0.5 : 2)) { const look = campLook(prov); if (drawArt(g, 'set|' + b.stage + '|' + look.variant + '|' + look.terrain, c => RealmBuild.drawSettlement(c, b.stage, 0, look), p.ic[0], p.ic[1], KB)) return; }
  g.save(); g.translate(p.ic[0], p.ic[1]); g.scale(KB * s, KB * s);
  RealmBuild.drawSettlement(g, b.stage, t, campLook(prov));
  g.restore();
}
function drawSurveyQueue(g, t) {
  const font = getComputedStyle(document.body).getPropertyValue('--font-display');
  for (const u of S.units) {
    if (u.owner !== ME) continue;
    const list = (u.pendingSurvey >= 0 ? [u.pendingSurvey] : []).concat(u.surveyQueue);
    if (!list.length) continue;
    // each queued order gets a numbered marker: survey flags for surveys, white markers for moves
    const ptOf = e => { const p = typeof e === 'number' ? e : e.move, o = (u.id % 5 - 2) * 9; return [G.provs[p].ic[0] + o, G.provs[p].ic[1] + 40 + o * 0.5]; };
    const start = u.moving && u.final !== undefined && u.pendingSurvey < 0 ? [G.provs[u.final].ic[0], G.provs[u.final].ic[1] + 40] : null;
    void start;   // GC06: no dotted trail to the province centers, just the numbered markers
    list.forEach((e, i) => {
      const [x, y] = ptOf(e), k = Math.max(1, 0.62 / cam.z), bob = Math.sin(t * 3 + i) * 2;
      if (typeof e !== 'number') {
        // move marker: a white chevron on a little ring
        g.beginPath(); g.ellipse(x, y, 13 * k, 5.5 * k, 0, 0, 7); g.lineWidth = 3 * k; g.strokeStyle = OL; g.stroke(); g.lineWidth = 1.6 * k; g.strokeStyle = '#fff'; g.stroke();
        g.beginPath(); g.moveTo(x - 6 * k, y - 22 * k + bob); g.lineTo(x, y - 12 * k + bob); g.lineTo(x + 6 * k, y - 22 * k + bob); g.lineWidth = 6 * k; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3 * k; g.strokeStyle = '#fff'; g.stroke();
        g.beginPath(); g.arc(x + 15 * k, y - 22 * k, 9 * k, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.2 * k; g.strokeStyle = OL; g.stroke();
        g.font = (12 * k) + 'px ' + font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = OL; g.fillText(String(i + 1), x + 15 * k, y - 21 * k);
        return;
      }
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 30 * k); g.lineWidth = 6 * k; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3 * k; g.strokeStyle = '#c99560'; g.stroke();
      g.beginPath(); g.moveTo(x, y - 30 * k + bob); g.lineTo(x + 22 * k, y - 24 * k + bob); g.lineTo(x, y - 16 * k + bob); g.closePath(); g.fillStyle = '#ff7a59'; g.fill(); g.lineWidth = 2.2 * k; g.strokeStyle = OL; g.stroke();
      g.beginPath(); g.arc(x - 12 * k, y - 34 * k, 9 * k, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.2 * k; g.stroke();
      g.font = (12 * k) + 'px ' + font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = OL; g.fillText(String(i + 1), x - 12 * k, y - 33 * k);
    });
  }
}
function drawExtra(g, x, y, type, t, rise, age = 9, level = 1, own = true) {
  if (age >= 1.2 && rise === 1 && dpr * cam.z <= (own ? 0.5 : 2)) { const v = BUILD_DEFS[type].levels ? (level || 1) - 1 : BUILD_DEFS[type].variant; if (drawArt(g, 'ex|' + type + '|' + v, c => RealmBuildings.drawOnMap(c, type, v, 0, 1), x, y, EB)) return; }
  const pop = age < 1.2 ? Math.max(0.01, 1 - Math.exp(-age * 7) * Math.cos(age * 15)) : 1;
  g.save(); g.translate(x, y); g.scale(EB * pop, EB * pop);
  RealmBuildings.drawOnMap(g, type, BUILD_DEFS[type].levels ? (level || 1) - 1 : BUILD_DEFS[type].variant, t, rise);
  g.restore();
}
// a small progress bar over a building that is being upgraded
function drawXupBar(g, x, y, xu, e) {
  const d = BUILD_DEFS[e.type], f = Math.min(1, (S.t - xu.t0) / d.ups[xu.to - 1].time), w = 44, h = 8, bx = x - w / 2, by = y + 14;
  g.save(); g.fillStyle = '#faf1dc'; g.strokeStyle = OL; g.lineWidth = 2.5; g.beginPath(); g.roundRect(bx, by, w, h, 4); g.fill(); g.stroke();
  g.beginPath(); g.roundRect(bx, by, w, h, 4); g.clip(); g.fillStyle = '#ffc93c'; g.fillRect(bx, by, w * f, h); g.restore();
  g.save(); g.strokeStyle = OL; g.lineWidth = 2.5; g.beginPath(); g.roundRect(bx, by, w, h, 4); g.stroke(); g.restore();
}
function drawExtraSite(g, site, t) {
  const c = G.provs[site.prov].ic, x = c[0] + site.ox, y = c[1] + site.oy, f = Math.min(1, (t - site.t0) / (site.dur || BUILD_TIME));
  drawExtra(g, x, y, site.type, t, f);
  g.save(); g.translate(x, y); g.lineCap = 'round';
  for (const [px, py] of [[-22, 0], [22, 0], [-12, 10], [12, 10]]) { g.beginPath(); g.moveTo(px, py); g.lineTo(px, py - 42); g.strokeStyle = OL; g.lineWidth = 4.5; g.stroke(); g.strokeStyle = '#b07a45'; g.lineWidth = 2.2; g.stroke(); }
  for (const yy of [-14, -32]) { g.beginPath(); g.moveTo(-24, yy); g.lineTo(24, yy); g.strokeStyle = OL; g.lineWidth = 4.5; g.stroke(); g.strokeStyle = '#c99560'; g.lineWidth = 2.2; g.stroke(); }
  g.restore();
}
function drawSite(g, site, t) {
  const p = G.provs[site.prov], f = Math.min(1, (t - site.t0) / (site.dur || BUILD_TIME));
  g.save(); g.translate(p.ic[0], p.ic[1]); g.scale(KB, KB);
  // the outpost rises from the ground as work progresses
  g.save(); g.beginPath(); g.rect(-160, 60 - 220 * f, 320, 400); g.clip();
  RealmBuild.drawSettlement(g, 0, t, campLook(site.prov));
  g.restore();
  // scaffold poles
  g.lineCap = 'round';
  for (const [x, y] of [[-30, 6], [30, 6], [-18, 22], [18, 22]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 74); g.strokeStyle = OL; g.lineWidth = 6; g.stroke(); g.strokeStyle = '#b07a45'; g.lineWidth = 3; g.stroke(); }
  for (const yy of [-20, -48]) { g.beginPath(); g.moveTo(-32, yy + 6); g.lineTo(32, yy + 6); g.strokeStyle = OL; g.lineWidth = 6; g.stroke(); g.strokeStyle = '#c99560'; g.lineWidth = 3; g.stroke(); }
  g.restore();
}
function drawProgress(g, site, t, dur = site.dur || BUILD_TIME, col = '#ffc93c', label = '', yOff = -92) {
  const p = { ic: [G.provs[site.prov].ic[0] + (site.ox || 0), G.provs[site.prov].ic[1] + (site.oy || 0)] };
  if (site.type && site.type !== 'outpost' && site.ox !== undefined && yOff === -92) yOff = -62;
  const f = Math.min(1, (t - site.t0) / dur), w = 90, h = 13, x = p.ic[0] - w / 2, y = p.ic[1] + yOff;
  g.beginPath(); g.roundRect(x, y, w, h, 7); g.fillStyle = '#faf1dc'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.roundRect(x + 2, y + 2, Math.max(0, (w - 4) * f), h - 4, 5); g.fillStyle = col; g.fill();
  g.font = '16px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); g.textAlign = 'center'; g.textBaseline = 'bottom';
  g.lineWidth = 4; g.strokeStyle = OL; g.fillStyle = '#fff'; const txt = (label ? label + ' ' : '') + Math.ceil(dur * (1 - f)) + 's';
  g.strokeText(txt, p.ic[0], y - 3); g.fillText(txt, p.ic[0], y - 3);
}
// a survey traces the province outline as it progresses, with surveyor stakes popping in around it
function drawSurvey(g, site, t) {
  const f = Math.min(1, (t - site.t0) / site.dur), done = routeAt(site, f)[2] - site.lead;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  // the surveyed stretch of boundary, traced behind the Wayfinder
  if (done > 0) {
    g.beginPath(); g.moveTo(site.loop[0][0], site.loop[0][1]);
    let left = done;
    for (let i = 0; i < site.seg.length && left > 0; i++) {
      const a = site.loop[i], b = site.loop[i + 1], k = Math.min(1, left / site.seg[i]);
      g.lineTo(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k); left -= site.seg[i];
    }
    g.lineWidth = Math.max(7, 4 / cam.z); g.strokeStyle = OL; g.stroke();
    g.lineWidth = Math.max(4, 2.4 / cam.z); g.strokeStyle = '#8fe3ff'; g.stroke();
    g.setLineDash([2, 10]); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); g.setLineDash([]);
  }
  // survey flags at each corner he has reached
  let acc = 0;
  for (let i = 0; i < site.loop.length - 1; i++) {
    if (acc > done) break;
    const [x, y] = site.loop[i];
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 18); g.lineWidth = 4.5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2; g.strokeStyle = '#c99560'; g.stroke();
    g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 11, y - 14); g.lineTo(x, y - 10); g.closePath(); g.fillStyle = '#ff7a59'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
    acc += site.seg[i];
  }
  g.restore();
  drawProgress(g, site, t, site.dur, '#8fe3ff', 'Survey', -8);
}
// your own units get a thin pulsing oval at their feet in the nation's color, so they stand out from everything else on the map
function ownRing(g, u, t, rx, ry) {
  if (u.owner !== ME || isSel(u) || u.exiting) return;
  const pulse = 1 + Math.sin(t * 4 + u.id) * 0.07;
  g.beginPath(); g.ellipse(u.x, u.y + 1, rx * pulse, ry * pulse, 0, 0, 7); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.lineWidth = 1.6; g.strokeStyle = PLAYERS[ME].color; g.stroke();
}
function drawArmy(g, u, t) {
  const K = UKK, sc0 = UK * K;
  if (u.battle && !u.retreating) { if (isSel(u)) selRing(g, u.x, u.y + 2, 44 * K, 18 * K, t); drawMagicFx(g, u, u.x, u.y - 60 * K, t); return; }
  // GC01: up to 10 soldiers stand in ranks, shared out between the kinds of soldier in the army
  const figs = armyFigures(u), n = figs.length; if (!n) return;
  const per = n <= 3 ? n : n <= 8 ? 4 : 5, rows = Math.ceil(n / per);
  const gx = 15 * K, gy = 10 * K, halfW = Math.max(18 * K, (per - 1) * gx / 2 + 14 * K), rx = halfW + 8 * K, ry = Math.max(11 * K, rx * 0.4);
  const cy = u.y - (rows - 1) * gy / 2;
  if (u.owner !== ME) { g.beginPath(); g.ellipse(u.x, cy + (rows - 1) * gy / 2 + 2, rx, ry, 0, 0, 7); g.lineWidth = 5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = (PLAYERS[u.owner] || PLAYERS[RAIDERS]).color; g.stroke(); }
  ownRing(g, u, t, rx, ry);
  if (isSel(u)) selRing(g, u.x, u.y + 2, rx + 2 * K, ry + 1 * K, t);
  const walking = u.moving || u.patrolling;
  const hop = walking ? -Math.abs(Math.sin(t * 9)) * 3 : 0, tt = walking ? t * 2.4 : t;
  let sc = sc0; const grow = u.grew !== undefined ? t - u.grew : 9, born = u.born !== undefined ? t - u.born : 9;
  if (born < 1.2) sc *= Math.max(0.01, 1 - Math.exp(-born * 7) * Math.cos(born * 15));
  else if (grow < 0.6) sc *= 1 + Math.sin(grow / 0.6 * Math.PI) * 0.15;
  const casting = !!u.cast;
  const spots = figs.map((k, i) => { const r = Math.floor(i / per), c = i % per, inRow = Math.min(per, n - r * per); return { k, x: u.x + (c - (inRow - 1) / 2) * gx + (r % 2 ? gx * 0.35 : 0), y: u.y + (rows - 1 - r) * gy - (rows - 1) * gy / 2 + 4 * K, i }; });
  spots.sort((a, b) => a.y - b.y).forEach(({ k, x, y, i }) => RealmIso.drawUnitAt(g, casting && k === MAGE ? castUnitId(u) : k, u.th, tt + u.id + i * 0.7, x, y + hop, isCav(k) ? sc * 0.85 : sc));
  const top = u.y - (rows - 1) * gy / 2 + 4 * K - (figs.some(isCav) ? 38 : 33) * K - (casting && figs.includes(MAGE) ? 22 * K : 0);   // just above the heads of the back rank (and a casting Mage's staff)
  // GC11: the nation's flag on the banner pole (monsters carry none)
  if (!u.monster) drawArmyFlag(g, u, u.x + halfW + 4 * K, u.y + (rows - 1) * gy / 2 + 2, top - 2 * K, t, K);
  // GC12: a thin health bar above the army; GC10: its power below
  drawArmyHealth(g, u, u.x, top - 5 * K, Math.min(56 * K, halfW * 1.6), K);
  if (u.retro) drawRetroBar(g, u, u.x, top - 14 * K, Math.min(56 * K, halfW * 1.6), K);   // Z5
  drawArmyPower(g, u, u.x, u.y + ry + 6 * K, t);
  drawMagicFx(g, u, u.x, top - 22 * K, t);
  if (hordeActive(u)) drawHordeMark(g, u.x - halfW - 8 * K, top, t);
}
function drawUnit(g, u, t) {
  if (u.exiting) { g.save(); g.globalAlpha = 0.55; u.exiting = false; drawUnit(g, u, t); u.exiting = true; g.restore(); return; }   // marching home: faded, can't be selected
  if (u.kind === 'army') return drawArmy(g, u, t);
  if (u.stealth) { g.save(); g.globalAlpha = 0.45 + Math.sin(t * 3) * 0.08; drawUnitBody(g, u, t); g.restore(); return; }
  drawUnitBody(g, u, t);
}
function drawUnitBody(g, u, t) {
  const K = UKK;
  ownRing(g, u, t, 16 * K, 6.5 * K);
  if (u.owner !== ME && PLAYERS[u.owner]) { g.beginPath(); g.ellipse(u.x, u.y + 1, 16 * K, 6.5 * K, 0, 0, 7); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.2; g.strokeStyle = PLAYERS[u.owner].color; g.stroke(); }
  if (isSel(u)) selRing(g, u.x, u.y + 1, 17 * K, 7 * K, t);
  const working = !!u.build || !!u.survey;
  const walking = u.moving || !!u.survey;
  const tt = walking ? t * 2.4 : working ? t * 3 : t;
  const hop = walking ? -Math.abs(Math.sin(t * 9)) * 3 : working ? -Math.abs(Math.sin(t * 8)) * 2 : 0;
  let sc = UK * K;
  if (u.born !== undefined && t - u.born < 1.2) { const a = t - u.born; sc = UK * K * Math.max(0.01, 1 - Math.exp(-a * 7) * Math.cos(a * 15)); }
  RealmIso.drawUnitAt(g, u.kind === MAGE && u.cast ? castUnitId(u) : u.kind, u.th, tt + u.id, u.x, u.y + hop, sc);
  if (u.fleeing || u.doomAt) drawFleeMark(g, u, t);
  else if (u.scouting !== null) {
    const bx = u.x + 13 * K, by = u.y - 34 * K + Math.sin(t * 4) * 1.5;
    g.beginPath(); g.arc(bx, by, 8, 0, 7); g.moveTo(bx - 4, by + 6); g.lineTo(bx - 8, by + 12); g.lineTo(bx, by + 7.5);
    g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
    g.font = '12px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = OL; g.fillText('?', bx, by + 1);
  }
  if (working && Math.sin(t * 8) > 0.6) { g.fillStyle = '#fff3a6'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(u.x + (12 + k * 3) * K, u.y - (18 + k * 4) * K, 1.8 * K, 0, 7); g.fill(); } }
}

// ---------- input ----------
const $q = s => document.querySelector(s);
function unitAt(wx, wy) { const K = UKK; let best = null, bd = 30 * K; for (const u of S.units) { if (u.owner !== ME) continue; const r = u.kind === 'army' ? 1.25 + Math.min(1, troopCount(u) / 10) * 0.6 : 1, d = Math.hypot(u.x - wx, u.y - 12 * K - wy) / r; if (d < bd) { bd = d; best = u; } } return best; }
function provAt(wx, wy) { const i = G.provs.findIndex(q => inPoly(wx, wy, q.pts)); return i; }
const pointers = new Map(); let dragMoved = 0, pinch = null, box = null;
const keysHeld = new Set();
const boxEl = $q('#box');
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, button: e.button, type: e.pointerType, shift: e.shiftKey });
  dragMoved = 0;
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z }; box = null; boxEl.hidden = true; }
});
cv.addEventListener('pointermove', e => {
  const P = pointers.get(e.pointerId);
  if (P) {
    const dx = e.clientX - P.x, dy = e.clientY - P.y; P.x = e.clientX; P.y = e.clientY;
    dragMoved += Math.abs(dx) + Math.abs(dy);
    if (pointers.size === 1 && dragMoved > 6) {
      if (P.type === 'mouse' && P.button === 0) {
        // left drag draws a selection box
        box = { x0: P.x0, y0: P.y0, x1: e.clientX, y1: e.clientY, shift: P.shift };
        boxEl.hidden = false;
        boxEl.style.left = Math.min(box.x0, box.x1) + 'px'; boxEl.style.top = Math.min(box.y0, box.y1) + 'px';
        boxEl.style.width = Math.abs(box.x1 - box.x0) + 'px'; boxEl.style.height = Math.abs(box.y1 - box.y0) + 'px';
      } else { camTween = null; cv.classList.add('dragging'); cam.x -= dx / cam.z; cam.y -= dy / cam.z; cacheDirty = true; clampCam(); }
    } else if (pinch) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.z * d / pinch.d / cam.z); dragMoved = 99; }
  }
  hoverAt(e.clientX, e.clientY);
});
const endPtr = e => {
  const P = pointers.get(e.pointerId);
  if (P && box && pointers.size === 1) finishBox(box);
  else if (P && dragMoved < 7 && pointers.size === 1 && P.button !== 1) clickAt(e.clientX, e.clientY, P.button === 2 || (P.button === 0 && (e.ctrlKey || e.metaKey) && S.selected.length > 0), e.shiftKey, e.ctrlKey || e.metaKey);
  box = null; boxEl.hidden = true;
  pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) cv.classList.remove('dragging');
};
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('pointerleave', () => { hoverProv = -1; $q('#tip').hidden = true; });
const screenOf = u => [(u.x - cam.x) * cam.z + cw / 2, (u.y - 8 - cam.y) * cam.z + ch / 2];
function finishBox(bx) {
  const x0 = Math.min(bx.x0, bx.x1) - 6, x1 = Math.max(bx.x0, bx.x1) + 6, y0 = Math.min(bx.y0, bx.y1) - 6, y1 = Math.max(bx.y0, bx.y1) + 6;
  const hit = S.units.filter(u => { if (u.owner !== ME) return false; const [sx, sy] = screenOf(u); return sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1; });
  S.selected = bx.shift ? [...new Set([...S.selected, ...hit])] : hit;
  if (S.selected.length) { S.selBuilding = -1; S.selProv = -1; S.selPart = null; }
  hoverPath = undefined;
}
cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
function zoomAt(sx, sy, f) {
  const [wx, wy] = toWorld(sx, sy);
  camTween = null;
  cam.z = clampZ(cam.z * f);
  cam.x = wx - (sx - cw / 2) / cam.z; cam.y = wy - (sy - ch / 2) / cam.z;
  clampCam(); cacheDirty = true;
}
const MAX_Z = 6;
const clampZ = z => Math.max(fitZ * 0.6, Math.min(MAX_Z, z));
// ---------- zoom hotkeys ----------
// the focus province is the selected unit's province; with nothing selected, the one under the cursor, else the one in the middle of the screen
let camTween = null;
function focusProvince() {
  const u = primary(); if (u) return u.prov;
  if (hoverProv >= 0) return hoverProv;
  return provAt(cam.x, cam.y);
}
function boxOf(ids) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of ids) for (const [x, y] of G.provs[i].pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}
function fitView(b, frac) { return { x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2, z: Math.min(cw * frac / (b[2] - b[0]), ch * frac / (b[3] - b[1])) }; }
function flyTo(v) { camTween = { x0: cam.x, y0: cam.y, z0: cam.z, x: v.x, y: v.y, z: clampZ(v.z), t0: performance.now() / 1000, d: 0.45 }; }
function zoomPreset(level) {
  const p = focusProvince(); if (p < 0) return;
  if (level === 2) return flyTo(fitView(boxOf([p]), 0.9));
  const near = fitView(boxOf([p, ...allNbr[p]]), 0.95);
  if (level === 3) return flyTo(near);
  flyTo({ x: near.x, y: near.y, z: near.z / 2 });
}
function stepCamTween(t) {
  if (!camTween) return;
  const c = camTween, k = Math.min(1, (t - c.t0) / c.d), e = 1 - Math.pow(1 - k, 3);
  cam.z = Math.exp(Math.log(c.z0) + (Math.log(c.z) - Math.log(c.z0)) * e);
  cam.x = c.x0 + (c.x - c.x0) * e; cam.y = c.y0 + (c.y - c.y0) * e;
  clampCam(); cacheDirty = true;
  if (k >= 1) camTween = null;
}
function clampCam() { const [x0, y0, x1, y1] = G.bounds, m = 850 * WORLD_K; cam.x = Math.max(x0 - m, Math.min(x1 + m, cam.x)); cam.y = Math.max(y0 - m, Math.min(y1 + m, cam.y)); }
function home() { camTween = null; const v = fitView(boxOf([S.capital]), 0.62); cam.z = clampZ(v.z); cam.x = v.x; cam.y = v.y; clampCam(); cacheDirty = true; }
$q('#zin').onclick = () => zoomAt(cw / 2, ch / 2, 1.4);
$q('#zout').onclick = () => zoomAt(cw / 2, ch / 2, 1 / 1.4);
$q('#zhome').onclick = home;
function buildingAt(wx, wy) {
  for (const [p, b] of S.buildings) {
    if (b.owner !== ME) continue;
    const c = G.provs[p].ic, r = b.stage === 2 ? 70 : 40;
    if (Math.abs(wx - c[0]) < r * 1.4 && wy > c[1] - r * 1.5 && wy < c[1] + r * 0.75) return p;
  }
  return -1;
}
function barracksAt(wx, wy) {
  for (const [p, list] of S.extras) {
    if (!S.visible.has(p)) continue;
    for (const e of list) if (e.type === 'barracks') { const c = G.provs[p].ic, [ox, oy] = bslotOf(p, e.slot), x = c[0] + ox, y = c[1] + oy; if (Math.abs(wx - x) < 36 && wy > y - 40 && wy < y + 20) return p; }
  }
  return -1;
}
function clickAt(sx, sy, right, shift, ctrl) {
  const [wx, wy] = toWorld(sx, sy);
  if (pathAim) { pathAimClick(provAt(wx, wy), right); return; }
  if (surveyAim) {
    if (right) { stopAim(); return; }
    const p = provAt(wx, wy); if (p >= 0) queueSurvey(p, shift);
    if (!shift) stopAim();
    return;
  }
  const u = right ? null : unitAt(wx, wy);
  if (u) {
    if (shift) S.selected = isSel(u) ? S.selected.filter(v => v !== u) : [...S.selected, u];
    else S.selected = [u];
    S.selBuilding = -1; S.selProv = -1; S.selPart = null; hoverPath = undefined; return;
  }
  const p = provAt(wx, wy);
  if (!right) {
    const hit = partAt(wx, wy);
    if (hit) { selectPart(hit.prov, hit.part); return; }
  }
  // right-click always moves; Ctrl+right-click opens the survey / build menu
  // Quick queue (a setting, off by default): with only Wayfinders and Masons selected, a plain right-click opens it too
  const quick = right && !ctrl && quickQueueOn() && S.selected.length > 0 && S.selected.every(v => v.kind === MASON || v.kind === WAYFINDER);
  if (right && (ctrl || quick) && p >= 0 && S.selected.some(v => v.kind === MASON || v.kind === WAYFINDER || isCaster(v))) { menuPt = [wx, wy]; openBuildMenu(sx, sy, p, shift); return; }
  // right-click gives orders; a left-click that doesn't land on a unit or building deselects them
  if (right) { if (p >= 0 && S.selected.length) orderGroup(p, shift, [wx, wy]); return; }
  S.selected = []; S.selBuilding = -1; S.selPart = null; hoverPath = undefined;
  // ...and if it landed on explored land, that province is selected and its province menu opens
  S.selProv = p >= 0 && S.explored.has(p) ? p : -1;
}
// what building, if any, sits under a map point
function partAt(wx, wy) {
  for (const [p, list] of S.extras) {
    if (!S.visible.has(p)) continue;
    for (const e of list) { const c = G.provs[p].ic, [ox, oy] = bslotOf(p, e.slot), x = c[0] + ox, y = c[1] + oy; if (Math.abs(wx - x) < 36 && wy > y - 44 && wy < y + 20) return { prov: p, part: e.type + '@' + e.slot }; }
  }
  const bp = buildingAt(wx, wy);
  return bp >= 0 ? { prov: bp, part: 'settlement' } : null;
}
// select a building (or the settlement) of a province; capitals and barracks also open their training panel
function selectPart(p, part) {
  S.selected = []; hoverPath = undefined; capPanelKey = '';
  S.selProv = p; S.selPart = part; S.selBuilding = -1;
  const mineP = owned(p);
  if (part === 'settlement' && S.buildings.get(p).stage === 2 && mineP) { S.selBuilding = p; S.selKind = 'capital'; }
  if (ptype(part) === 'barracks' && mineP) { S.selBuilding = p; S.selKind = 'barracks'; }
  if (ptype(part) === 'magetower' && mineP) { S.selBuilding = p; S.selKind = 'magetower'; }
  provKey = '';
}
// ---------- the Mason's build menu (Ctrl+right-click) ----------
const menuEl = $q('#bmenu');
const thumbURL = {};
function buildThumb(type, level = 1) {
  const tk = type + (level > 1 ? level : '');
  if (thumbURL[tk]) return thumbURL[tk];
  const c = document.createElement('canvas'); c.width = 84; c.height = 84; const g = c.getContext('2d');
  g.translate(42, 58); g.scale(0.42, 0.42);
  if (type === 'outpost') { g.scale(1.1, 1.1); RealmBuild.drawSettlement(g, 0, 0.8); }
  else { if (BUILD_DEFS[type].levels) { const k2 = level === 3 ? 0.78 : 0.9; g.translate(0, level === 3 ? 6 : 0); g.scale(k2, k2); } RealmBuildings.drawOnMap(g, type, BUILD_DEFS[type].levels ? level - 1 : BUILD_DEFS[type].variant, 0.8, 1); }
  return thumbURL[tk] = c.toDataURL();
}
let menuProv = -1, menuSlot = -1, menuShift = false;
function surveyWhy(p) {
  if (!S.explored.has(p)) return 'Explore it first';
  if (S.surveyed.has(p)) return 'Already surveyed';
  if (surveyQueued(p)) return 'Already on a survey list';
  const ws = S.selected.filter(v => v.kind === WAYFINDER);
  if (!ws.some(w => findPath(w, p))) return 'No open route';
  return null;
}
let menuPt = null;
function openBuildMenu(sx, sy, p, shift) {
  menuProv = p; menuShift = !!shift;
  const m = S.selected.find(v => v.kind === MASON), w = S.selected.find(v => v.kind === WAYFINDER), T = TER[G.provs[p].terrain];
  const types = !m || !S.explored.has(p) ? [] : owned(p) ? BUILD_ORDER : ['outpost'];
  const qn = w ? S.selected.filter(v => v.kind === WAYFINDER).reduce((n, v) => n + v.surveyQueue.length + (v.pendingSurvey >= 0 ? 1 : 0) + (v.survey ? 1 : 0), 0) : 0;
  const surveyRow = w ? (() => { const why = surveyWhy(p); return `<button type="button" class="bm-item" data-type="survey" ${why ? 'aria-disabled="true"' : ''}><img alt="" src="${surveyIcon}"><span class="bm-name">${menuShift ? 'Queue survey' : 'Survey'}<small>${why ? why : menuShift ? `Add to the list (${qn} already)` : (w.prov === p ? 'Survey this province' : 'Walk there and survey') + ' · Shift to queue'}</small></span></button>`; })() : '';
  const n = extrasIn(p).length + sitesIn(p).length;
  const row = type => {
    const why = buildCheck(p, type), d = type === 'outpost' ? { name: 'Outpost', cost: OUTPOST_COST } : BUILD_DEFS[type];
    return `<button type="button" class="bm-item" data-type="${type}" ${why ? 'aria-disabled="true"' : ''}><img alt="" src="${buildThumb(type)}"${cmdBg('build:' + type)}><span class="bm-name">${d.name}<small>${why ? why : 'Build here · ' + buildTime(type) + ' s' + capNote(p, type)}${d.gives ? ' · ' + Object.entries(d.gives).map(([k, v]) => '+' + v + ' ' + k).join(', ') : d.note ? ' · ' + d.note : ''}</small></span><span class="bm-cost">${costHTML(d.cost)}</span></button>`;
  };
  menuEl.innerHTML = `<div class="bm-head"><b>${S.explored.has(p) ? T.label : 'Unexplored'}</b><span>${owned(p) && m ? `${n}/${plotCap(p)} buildings` : ''}${m && m.prov !== p && types.length ? ' · Mason will walk there' : ''}</span></div>` +
    `<button type="button" class="bm-item bm-move" data-type="move"><span class="bm-ico">➜</span><span class="bm-name">${S.selected.every(v => v.kind === WAYFINDER) ? (menuShift ? 'Queue explore' : 'Explore') : (menuShift ? 'Queue move here' : 'Move here')}${menuShift ? '<small>Add to the end of the order list</small>' : '<small>Shift to queue</small>'}</span></button>` +
    surveyRow + (types.length ? '<div class="bm-sec">Build</div>' : '') + types.map(row).join('') + linkRows(m, p) + magicRows(S.selected.find(isCaster), p) + (m && types.length && !owned(p) ? '<p class="bm-note">Build an outpost first to unlock farms, mills, mines and more.</p>' : '');
  menuEl.hidden = false;
  const r = menuEl.getBoundingClientRect();
  menuEl.style.left = Math.max(8, Math.min(sx, cw - r.width - 8)) / uiZ() + 'px';
  menuEl.style.top = Math.max(8, Math.min(sy, ch - r.height - 8)) / uiZ() + 'px';
  const first = menuEl.querySelector('.bm-item'); if (first) first.focus({ preventScroll: true });
}
// road and wall rows: the Mason works on the border between where he stands and the clicked province
function linkRows(m, q) {
  if (!m || (!hasTech('roads') && !hasTech('walls')) || m.prov === q) return '';
  const meta = {
    road: { tech: 'roads', ico: '🛤', cost: ROAD_COST, label: `${ROAD_LOOK[roadTier()].name[0].toUpperCase() + ROAD_LOOK[roadTier()].name.slice(1)} road to ${provName(q)}`, ok: `From ${provName(m.prov)} · ${ROAD_TIME} s · units move ${Math.round(ROAD_BONUS[roadTier()] * 100)}% faster` },
    wall: { tech: 'walls', ico: wallKind() === 'stone' ? '🧱' : '🪵', cost: WALL_COST, label: `${wallKind() === 'stone' ? 'Stone wall' : 'Palisade'} to ${provName(q)}`, ok: `Closes the border with ${provName(m.prov)}; its gate lets your units through · ${WALL_TIME} s` }
  };
  const row = type => { const M = meta[type]; if (!hasTech(M.tech)) return ''; if (!openBetween(m.prov, q)) return ''; const why = linkWhy(type, m, q);
    return `<button type="button" class="bm-item" data-type="${type}" ${why ? 'aria-disabled="true"' : ''}><span class="bm-ico">${M.ico}</span><span class="bm-name">${M.label}<small>${why || M.ok}</small></span><span class="bm-cost">${costHTML(M.cost)}</span></button>`; };
  const rows = row('road') + row('wall');
  if (!rows) return allNbr[m.prov].includes(q) ? '' : `<p class="bm-note">Stand the Mason in a neighboring province to build a road or wall on this border.</p>`;
  return `<div class="bm-sec">Border with ${provName(m.prov)}</div>` + rows;
}
function closeBuildMenu() { menuEl.hidden = true; menuProv = -1; menuSlot = -1; }
// the same menu, opened from an empty plot in the province menu; a Mason is sent automatically
function openPlotMenu(p, slot, anchor) {
  menuProv = p; menuSlot = slot;
  const m = nearestMason(p), T = TER[G.provs[p].terrain];
  const row = type => {
    const why = !m ? 'No free Mason' : buildCheck(p, type), d = BUILD_DEFS[type];
    return `<button type="button" class="bm-item" data-type="${type}" ${why ? 'aria-disabled="true"' : ''}><img alt="" src="${buildThumb(type)}"${cmdBg('build:' + type)}><span class="bm-name">${d.name}<small>${why ? why : (m.prov === p ? 'Build now' : 'Send ' + m.name) + ' · ' + buildTime(type) + ' s' + capNote(p, type)}${d.gives ? ' · ' + Object.entries(d.gives).map(([k, v]) => '+' + v + ' ' + k).join(', ') : d.note ? ' · ' + d.note : ''}</small></span><span class="bm-cost">${costHTML(d.cost)}</span></button>`;
  };
  menuEl.innerHTML = `<div class="bm-head"><b>Build on plot ${slot + 1}</b><span>${T.label} · ${m ? (m.prov === p ? m.name + ' is here' : m.name + ' will walk over') : 'every Mason is busy'}</span></div>` +
    BUILD_ORDER.slice().sort((a, b) => !!buildCheck(p, a) - !!buildCheck(p, b)).map(row).join('') +
    (m ? '' : '<p class="bm-note">Train a Mason at your capital, or wait for one to finish.</p>');
  menuEl.hidden = false;
  const r = menuEl.getBoundingClientRect(), a = anchor.getBoundingClientRect(), pm = $q('#prov').getBoundingClientRect();
  menuEl.style.left = Math.max(8, Math.min(pm.right + 10, cw - r.width - 8)) / uiZ() + 'px';
  menuEl.style.top = Math.max(8, Math.min(a.top - 40, ch - r.height - 8)) / uiZ() + 'px';
  const first = menuEl.querySelector('.bm-item:not([aria-disabled])'); if (first) first.focus({ preventScroll: true });
}
menuEl.addEventListener('pointerdown', e => e.stopPropagation());
menuEl.addEventListener('contextmenu', e => e.preventDefault());
menuEl.addEventListener('click', e => {
  const b = e.target.closest('.bm-item'); if (!b) return;
  const type = b.dataset.type, p = menuProv;
  if (type === 'move') { const ap = menuShift || e.shiftKey; closeBuildMenu(); orderGroup(p, ap, menuPt && provAt(menuPt[0], menuPt[1]) === p ? menuPt : null); return; }
  if (type === 'survey') {
    const why = surveyWhy(p); if (why) { toast(why + '.', true); return; }
    const append = menuShift || e.shiftKey; closeBuildMenu(); queueSurvey(p, append); return;
  }
  if (type.startsWith('popen:') || type.startsWith('pclose:')) { const c = S.selected.find(isCaster); closeBuildMenu(); if (c) startPath(c, p, type.split(':')[1], type.startsWith('pclose')); return; }
  if (type === 'road' || type === 'wall' || type === 'rewall') { const m = S.selected.find(v => v.kind === MASON); closeBuildMenu(); if (m) startLink(m, p, type); return; }
  const why = buildCheck(p, type);
  if (why) { toast(why + '.', true); return; }
  if (menuSlot >= 0) {
    const slot = menuSlot, m = nearestMason(p);
    closeBuildMenu();
    if (!m) { toast('Every Mason is busy.', true); return; }
    orderBuild(m, p, type, slot); provKey = '';
    return;
  }
  const m = S.selected.find(v => v.kind === MASON);
  closeBuildMenu();
  if (m) orderBuild(m, p, type);
});
document.addEventListener('pointerdown', e => { if (!menuEl.hidden && menuSlot >= 0 && !e.target.closest('#bmenu') && !e.target.closest('[data-plot]')) closeBuildMenu(); }, true);
cv.addEventListener('pointerdown', () => { if (!menuEl.hidden) closeBuildMenu(); }, true);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !menuEl.hidden) { closeBuildMenu(); e.stopImmediatePropagation(); } }, true);
function hoverAt(sx, sy) {
  const [wx, wy] = toWorld(sx, sy), p = provAt(wx, wy), tip = $q('#tip');
  hoverProv = p;
  if (p < 0) { tip.hidden = true; return; }
  const st = fogState(p), P = G.provs[p], T = TER[P.terrain];
  const b = S.visible.has(p) ? S.buildings.get(p) : null;
  tip.innerHTML = st === 'unexplored' ? '<strong>Unexplored</strong><div class="row">Only a Wayfinder can go here.</div>' :
    `<strong>${T.label}</strong><div class="row">${st === 'visible' ? 'Visible' : 'Explored · contents unknown'}${b ? ' · ' + (b.stage === 2 ? 'Capital' : b.stage === 1 ? 'Fort' : 'Outpost') : ''}</div>` +
    (!owned(p) ? `<div class="row">${bordersOwned(p) ? 'Outpost allowed here' : 'Too far from your land for an outpost'}</div>` : `<div class="row">Yours · ${extrasIn(p).length}/${plotCap(p)} buildings${extrasIn(p).length ? ': ' + extrasIn(p).map(e => BUILD_DEFS[e.type].name).join(', ') : ''}</div>`) +
    (S.surveyed.has(p) ? `<div class="row">Every 10 s: ${RES.map(k => yields[p][k] + ' ' + k + (yields[p].bonus[k] ? ' (bonus +' + yields[p].bonus[k] + ')' : '')).join(', ')}</div>` + (yields[p].deposit ? '<div class="row" style="color:#a67c00">Hidden Gold Deposit · a Gold Mine can be built</div>' : '') : '<div class="row">Resources unknown · survey it with a Wayfinder</div>') +
    (S.visible.has(p) && owned(p) && extrasIn(p).some(e => BUILD_DEFS[e.type].gives) ? `<div class="row" style="color:#1f7a2e">Buildings add ${(() => { const x = extrasBonus(p); return RES.filter(k => x[k]).map(k => '+' + x[k] + ' ' + k).join(', '); })()}</div>` : '') +
    (treeBorder[p] && S.explored.has(p) ? `<div class="row">${treeBorder[p]} tree border${treeBorder[p] > 1 ? 's' : ''} · room for ${treeBorder[p]} Lumber Mill${treeBorder[p] > 1 ? 's' : ''}</div>` : '');
  tip.hidden = false;
  const tz = uiZ(); tip.style.left = Math.min(sx, cw - tip.offsetWidth * tz - 30) / tz + 'px'; tip.style.top = Math.min(sy, ch - tip.offsetHeight * tz - 30) / tz + 'px';
}
window.addEventListener('keydown', e => {
  if (!S.started) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key.toLowerCase();
  if (!$q('#metPop').hidden) { if (k === 'enter' || k === ' ' || k === 'escape') { e.preventDefault(); closeMet(false); } return; }   // a new nation waits for you to read about it
  if (k === ' ' || e.code === 'Space') { togglePause(); e.preventDefault(); return; }
  if (k === 'q') { abilityQ(); e.preventDefault(); }
  else if (k === 'r') { const a = S.selected.filter(v => v.kind === 'army' && v.battle && !v.retreating); if (a.length) { a.forEach(retreat); cmdKey = ''; } }
  else if (k === 'f2' || k === 'f3' || k === 'f4') { zoomPreset(+k.slice(1)); e.preventDefault(); }
  else if (k === '1' || k === '2') { S.selBuilding = -1; S.selProv = -1; S.selPart = null; const u = S.units[+k - 1]; S.selected = e.shiftKey ? [...new Set([...S.selected, u])] : [u]; hoverPath = undefined; }
  else if (k === 'escape') { if (surveyAim) { stopAim(); return; } if (!S.selected.length && S.selBuilding < 0 && S.selProv < 0 && !techOpen && !armOpen) { openSettings(); return; } S.selected = []; S.selBuilding = -1; S.selProv = -1; S.selPart = null; }
  else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) { keysHeld.add(k); e.preventDefault(); }
});
window.addEventListener('keyup', e => keysHeld.delete(e.key.toLowerCase()));
window.addEventListener('keyup', e => { if (e.key === 'Shift' && surveyAim && S.selected.some(v => v.kind === WAYFINDER && v.surveyQueue.length)) stopAim(); });
window.addEventListener('blur', () => keysHeld.clear());
const edgeMouse = { x: -1, y: -1, in: false };
window.addEventListener('pointermove', e => { edgeMouse.x = e.clientX; edgeMouse.y = e.clientY; edgeMouse.in = true; }, { passive: true });
document.addEventListener('pointerleave', () => { edgeMouse.in = false; });
document.documentElement.addEventListener('mouseleave', () => { edgeMouse.in = false; });
window.addEventListener('blur', () => { edgeMouse.in = false; });
let selKey = '';
function selUI() {
  const el = $q('#sel');
  const st = u => u.scouting !== null ? 'scouting unexplored land' : (u.surveyQueue && surveysIn(u) && !u.survey) ? `heading to survey (${surveysIn(u)} queued)` : (u.surveyQueue && movesIn(u)) ? `on the move (${movesIn(u)} more queued)` : u.moving ? 'on the move' : u.build ? 'building an outpost' : u.survey ? 'surveying' : 'idle';
  const bq = S.selBuilding >= 0 ? (S.queues[srcKey()] || []) : null;
  const txt = (bq ? srcKey() + bq.length : '') + (S.selected.map(u => u.name + st(u) + !!u.battle + !!u.retreating + (u.troops ? troopText(u) + powerOf(u) : '')).join('|') || 'none');
  if (txt === selKey) return; selKey = txt;
  el.hidden = !(bq && !S.selected.length) && !S.selected.length;
  if (bq && !S.selected.length) { el.title = 'Train units from the command card. Hover a button for its cost.'; el.innerHTML = `<b>${S.selKind === 'capital' ? 'Capital' : 'Barracks'}</b> · ${bq.length ? bq.length + ' in training' : 'ready to train'}`; return; }
  if (!S.selected.length) { el.innerHTML = ''; el.title = ''; return; }
  if (S.selected.length === 1) { const u = S.selected[0]; if (u.kind === 'army') { el.title = 'Right-click a province to move. R retreats from a battle. Hold Shift to queue moves.'; el.innerHTML = `<b>${escHTML(u.name)}</b>${renameBtn(u)} · ${u.battle && !u.retreating ? '<span style="color:#b3261e">in battle</span>' : u.retreating ? 'retreating' : st(u)} · ${troopText(u)} · <span title="Estimated army power">power ${powerOf(u)}</span>`; return; } el.title = u.kind === WAYFINDER ? 'Can enter unexplored land. Right-click to move; Ctrl+right-click a province to survey it. Q surveys the province he is in. Hold Shift to queue (up to 10).' : u.kind === MASON ? 'Walks on explored land only. Right-click to move; Ctrl+right-click a province for the build menu. Q builds an outpost. Hold Shift to queue (up to 10).' : 'Walks on explored land only. Right-click a province to move.'; el.innerHTML = `<b>${escHTML(u.name)}</b>${u.kind === WAYFINDER || u.kind === MASON ? ' the ' + UNIT_DEFS[u.kind].name : ''}${renameBtn(u)} · ${st(u)}`; return; }
  el.title = 'Right-click a province to move them all. Hold Shift to queue moves.';
  el.innerHTML = `<b>${S.selected.length} units</b> · ` + S.selected.map(u => `${u.name} (${st(u)})`).join(' · ');
}
let toastTimer = 0;
function toast(msg, bad) { if (bad && sndQuietFor() ) sfx('ui_error'); const el = $q('#toast'); el.textContent = msg; el.classList.toggle('bad', !!bad); el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 2600); }

// ---------- capital panel ----------
let capPanelKey = '';
const icoURL = {};
function costHTML(c, prefix = '') { return Object.entries(c).map(([k, v]) => `<span class="cst"><img alt="${k}" src="${icoURL[k]}">${prefix}${v}</span>`).join(''); }
function setupCapitalPanel() {
  RES.forEach(k => { const c = document.createElement('canvas'); c.width = c.height = 40; resIcon(c.getContext('2d'), k, 20, 21, 1.7); icoURL[k] = c.toDataURL(); });
  const panel = $q('#cap');
  panel.addEventListener('pointerdown', e => e.stopPropagation());
  panel.addEventListener('click', e => {
    const tb = e.target.closest('[data-train]'); if (tb) { train(tb.dataset.train); tb.blur(); return; }
    const cb = e.target.closest('[data-cancel]'); if (cb) cancelTrain(+cb.dataset.cancel);
  });
}
let panelFor = '';
function buildPanel() {
  const panel = $q('#cap'), kinds = trainable(S.selKind, S.selBuilding), isCap = S.selKind === 'capital';
  const hasStable = !isCap && extrasIn(S.selBuilding).some(e => e.type === 'stable');
  const title = isCap ? 'Capital' : 'Barracks', sub = isCap ? 'Trains Wayfinders and Masons · +5 of each resource every 10 s' : (hasStable ? 'Trains infantry · Stable here: cavalry too' : 'Trains infantry · build a Stable in this province for cavalry');
  panel.innerHTML = `<div class="cap-head"><b>${title}</b><span>${sub}</span></div><div class="cap-cards" style="grid-template-columns: repeat(${Math.min(kinds.length, 3)}, minmax(0, 1fr))">` +
    kinds.map(kind => { const d = UNIT_DEFS[kind]; return `<div class="cap-card"><canvas width="96" height="112" data-kind="${kind}" aria-hidden="true"></canvas><div class="cap-info"><b>${d.name}</b><small>${d.blurb}</small><div class="cap-cost">${costHTML(d.cost)}</div><div class="cap-up">Upkeep ${costHTML(d.upkeep, '−')} <em>per 10 s</em></div><button type="button" data-train="${kind}" id="train-${d.name.toLowerCase()}">Train</button></div></div>`; }).join('') +
    `</div><div class="cap-queue" id="capQueue"></div>`;
  panel.classList.toggle('wide', kinds.length > 2);
}
function capPanel(t) {
  // training now lives in the command card; the old panel stays hidden
  const panel = $q('#cap'); panel.hidden = true; return;
  const forKey = srcKey() + '|' + trainable(S.selKind, S.selBuilding).join(',');
  if (forKey !== panelFor) { panelFor = forKey; buildPanel(); capPanelKey = ''; }
  panel.querySelectorAll('canvas[data-kind]').forEach(c => { const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); const cav = isCav(c.dataset.kind); RealmIso.drawUnitAt(g, c.dataset.kind, Math.PI / 4, t, 48, cav ? 104 : 98, cav ? 0.5 : 0.85); });
  const Q = S.queues[srcKey()] || [];
  const key = RES.map(k => S.stock[k]).join(',') + '|' + Q.length;
  const f = Q[0] && Q[0].t0 !== null ? Math.min(1, (t - Q[0].t0) / trainTime(Q[0].kind)) : 0;
  if (key !== capPanelKey) {
    capPanelKey = key;
    panel.querySelectorAll('[data-train]').forEach(b => { const ok = canAfford(UNIT_DEFS[b.dataset.train].cost); b.disabled = !ok; b.textContent = ok ? 'Train' : 'Not enough'; });
    $q('#capQueue').innerHTML = Q.length ? 'Queue: ' + Q.map((q, i) => `<span class="qi">${UNIT_DEFS[q.kind].name}${i === 0 ? ' <i><s></s></i>' : ''}<button type="button" data-cancel="${i}" aria-label="Cancel ${UNIT_DEFS[q.kind].name}">×</button></span>`).join('') : 'Nothing in training.';
  }
  const bar = $q('#capQueue s'); if (bar) bar.style.width = Math.round(f * 100) + '%';
}

// ---------- command card ----------
// a 4×4 grid of ability buttons for the selected units; tabs switch between unit types when several are selected
const CMD = {
  'pioneer:B': [{ id: 'survey', cell: 0, key: 'Q' }, { id: 'auto', cell: 1, key: '' }, { id: 'stealth', cell: 2, key: '' }],
  'army': [{ id: 'split', cell: 0, key: '' }, { id: 'combine', cell: 1, key: '' }, { id: 'retreat', cell: 3, key: 'R' }],
  'mason:A': ['outpost', ...BUILD_ORDER].map((type, i) => ({ id: 'build:' + type, cell: i, key: type === 'outpost' ? 'Q' : '' }))
};
let cmdTab = null, cmdKey = '', cmdHover = null;
// auto-survey: circling arrows around a flag
const autoIconFor = on => (() => {
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.arc(44, 46, 26, -2.6, 0.4); g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 5; g.strokeStyle = on ? '#3f9b4b' : '#9aa0ab'; g.stroke();
  g.beginPath(); g.arc(44, 46, 26, 0.55, 3.55); g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 5; g.strokeStyle = on ? '#3f9b4b' : '#9aa0ab'; g.stroke();
  for (const [x, y, r] of [[68, 59, 0.9], [20, 33, 4.05]]) { g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.moveTo(-8, -4); g.lineTo(0, 8); g.lineTo(8, -4); g.closePath(); g.fillStyle = on ? '#3f9b4b' : '#9aa0ab'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.restore(); }
  g.beginPath(); g.moveTo(40, 62); g.lineTo(40, 30); g.lineWidth = 7; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3.5; g.strokeStyle = '#c99560'; g.stroke();
  g.beginPath(); g.moveTo(42, 30); g.lineTo(58, 36); g.lineTo(42, 43); g.closePath(); g.fillStyle = '#ffc93c'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
  return c.toDataURL();
})();
const autoIcon = autoIconFor(false), autoIconOn = autoIconFor(true);
// sneak: a hooded eye, half shut
const sneakIconFor = on => (() => {
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(14, 50); g.quadraticCurveTo(44, 14, 74, 50); g.quadraticCurveTo(44, 74, 14, 50); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 5; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(44, 50, 11, 0, 7); g.fillStyle = on ? '#3f7a58' : '#9aa0ab'; g.fill(); g.lineWidth = 3; g.stroke();
  g.beginPath(); g.moveTo(10, 46); g.quadraticCurveTo(44, 8, 78, 46); g.lineTo(78, 40); g.quadraticCurveTo(44, -4, 10, 40); g.closePath(); g.fillStyle = on ? '#3f7a58' : '#7d8794'; g.fill(); g.lineWidth = 4; g.stroke();
  for (const x of [26, 44, 62]) { g.beginPath(); g.moveTo(x, 36 - (x === 44 ? 6 : 0)); g.lineTo(x - 3, 44); g.lineWidth = 3; g.stroke(); }
  return c.toDataURL();
})();
const sneakIcon = sneakIconFor(false), sneakIconOn = sneakIconFor(true);
const surveyIcon = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  // a survey flag beside a spyglass
  g.beginPath(); g.moveTo(26, 76); g.lineTo(26, 18); g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 4.5; g.strokeStyle = '#c99560'; g.stroke();
  g.beginPath(); g.moveTo(28, 18); g.lineTo(56, 27); g.lineTo(28, 38); g.closePath(); g.fillStyle = '#ff7a59'; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke();
  g.save(); g.translate(58, 58); g.rotate(-0.7);
  g.beginPath(); g.roundRect(-20, -8, 34, 16, 5); g.fillStyle = '#c99a2c'; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.roundRect(10, -11, 12, 22, 4); g.fillStyle = '#f4c44f'; g.fill(); g.stroke();
  g.fillStyle = '#9fe0f5'; g.beginPath(); g.ellipse(22, 0, 3, 7, 0, 0, 7); g.fill();
  g.restore();
  return c.toDataURL();
})();
const portraitURL = {};
function iconCanvas(fn) { const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g); return c.toDataURL(); }
function miniBanner(g, x, y, col) { g.beginPath(); g.moveTo(x, y + 30); g.lineTo(x, y - 14); g.lineWidth = 8; g.strokeStyle = OL; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#c99a2c'; g.stroke(); g.beginPath(); g.moveTo(x + 2, y - 14); g.lineTo(x + 26, y - 10); g.lineTo(x + 21, y - 2); g.lineTo(x + 26, y + 6); g.lineTo(x + 2, y + 4); g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 3.5; g.strokeStyle = OL; g.stroke(); }
function arrow(g, x1, y1, x2, y2) { const a = Math.atan2(y2 - y1, x2 - x1); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.moveTo(x2 - Math.cos(a - 0.6) * 10, y2 - Math.sin(a - 0.6) * 10); g.lineTo(x2, y2); g.lineTo(x2 - Math.cos(a + 0.6) * 10, y2 - Math.sin(a + 0.6) * 10); g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 4.5; g.strokeStyle = '#ffc93c'; g.stroke(); }
const splitIcon = iconCanvas(g => { miniBanner(g, 30, 34, '#2f6fe0'); arrow(g, 40, 62, 18, 80); arrow(g, 46, 62, 70, 80); miniBanner(g, 58, 28, '#7fb0ff'); });
const retreatIcon = iconCanvas(g => { miniBanner(g, 52, 30, '#e3e6ec'); g.beginPath(); g.moveTo(70, 66); g.lineTo(18, 66); g.moveTo(30, 54); g.lineTo(18, 66); g.lineTo(30, 78); g.lineWidth = 11; g.strokeStyle = OL; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#ffc93c'; g.stroke(); });
const combineIcon = iconCanvas(g => { miniBanner(g, 18, 30, '#7fb0ff'); miniBanner(g, 56, 30, '#7fb0ff'); arrow(g, 20, 70, 40, 82); arrow(g, 66, 70, 48, 82); });
function portrait(kind) {
  if (kind === 'army') kind = 'd-sword';
  if (portraitURL[kind]) return portraitURL[kind];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const cav = isCav(kind); RealmIso.drawUnitAt(g, kind, Math.PI / 4, 0.4, 32, cav ? 60 : 62, cav ? 0.3 : 0.5);
  return portraitURL[kind] = c.toDataURL();
}
function cmdInfo(id) {
  const xi = extraCmdInfo(id); if (xi) return xi;
  const mi = magicCmdInfo(id); if (mi) return mi;
  // what a button does, what it costs, and why it can't be used right now
  const [what, type] = id.split(/:(.*)/s);
  if (what === 'train') {
    const d = UNIT_DEFS[type], Q = S.queues[srcKey()] || [];
    const lack = Object.keys(d.cost).filter(k => S.stock[k] < d.cost[k]);
    const extra = isCav(type) ? ' Needs a Stable in this province. Joins the army standing here.' : MILITARY.has(type) ? ' Joins the army standing in this province.' : '';
    const ds = DSTATS[type] ? statsOf(type, ME) : null, r1 = n => Math.round(n * 10) / 10, statLine = (ds ? ` Attack ${r1(ds.atk)}, health ${r1(ds.hp)}, armor ${Math.round(ds.red * 100)}%, speed ${r1(troopSpeed(type, ME) * 100) / 100}.` : '') + (type === MAGE ? ` Mages: ${unitTotal(MAGE)}/${mageCap()} (counting those in armies and in training).` : '');
    return { name: 'Train ' + d.name, desc: `${d.blurb}${statLine}${extra} Takes ${trainTime(type)} s. Upkeep every 10 s: ${Object.entries(d.upkeep).map(([k, v]) => v + ' ' + k).join(', ')}.${Q.length ? ' ' + Q.length + ' already queued.' : ''}`, cost: d.cost, why: limitWhy(type) || (lack.length ? 'Need ' + lack.map(k => d.cost[k] + ' ' + k).join(', ') : null), icon: portrait(type) };
  }
  if (what === 'queue') {
    const q = (S.queues[srcKey()] || [])[+type];
    if (!q) return { name: 'Queue', desc: '', cost: null, why: 'Empty', icon: '' };
    const left = q.t0 === null ? trainTime(q.kind) : Math.max(0, trainTime(q.kind) - (S.t - q.t0));
    return { name: UNIT_DEFS[q.kind].name + (+type === 0 ? ' (training)' : ' (waiting)'), desc: (+type === 0 ? `Ready in ${Math.ceil(left)} s.` : `Number ${+type + 1} in the queue.`) + ' Click to cancel and get the resources back.', cost: q.paid, why: null, ok: 'Click to cancel', icon: portrait(q.kind) };
  }
  if (what === 'upgrade') return { name: 'Upgrade to Fort', desc: `Rebuild the outpost as a stone fort, opening 4 building plots instead of 2. Takes ${FORT_UPGRADE.time} s; no Mason needed. Forts: ${fortCount()}/${fortLimit()}. Each fort allows 4 more outposts.`, cost: FORT_UPGRADE.cost, why: upgradeWhy(S.selProv), icon: settlementThumb(1) };
  if (what === 'cancelup') { const u = S.upgrades.get(S.selProv); const left = u ? Math.ceil(FORT_UPGRADE.time - (S.t - u.t0)) : 0; return { name: 'Upgrading to Fort', desc: `Ready in ${left} s. Click to cancel and get the resources back.`, cost: u ? u.paid : null, why: null, ok: 'Click to cancel', icon: settlementThumb(1) }; }
  if (what === 'xup' || what === 'xcancel') {
    const p = S.selProv, e = extraAt(p, S.selPart); if (!e) return { name: 'Upgrade', desc: '', cost: null, why: 'Nothing selected', icon: '' };
    const d = BUILD_DEFS[e.type], lv = e.level || 1, xu = S.xup.get(p + '@' + e.slot);
    if (what === 'xcancel') { const left = xu ? Math.ceil(d.ups[xu.to - 1].time - (S.t - xu.t0)) : 0; return { name: 'Upgrading to ' + d.levels[lv], desc: `Ready in ${left} s. Click to cancel and get the resources back.`, cost: xu ? xu.paid : null, why: null, ok: 'Click to cancel', icon: buildThumb(e.type, lv + 1) }; }
    if (lv >= d.levels.length) return { name: d.levels[lv - 1], desc: 'Fully upgraded.', cost: null, why: 'Already at the highest level', icon: buildThumb(e.type, lv) };
    const needT = (e.type === 'forge' ? ['battleforge', 'warforge'] : ['sanctum', 'arcanum'])[lv - 1];
    if (needT && !hasTech(needT)) return { name: 'Upgrade to ' + d.levels[lv], desc: `Research ${TECH_BY_ID[needT].name} (${e.type === 'forge' ? 'Military' : 'Magic'} research) to unlock this upgrade.`, cost: d.ups[lv].cost, why: 'Research ' + TECH_BY_ID[needT].name + ' first', icon: buildThumb(e.type, lv + 1) };
    const up = d.ups[lv], tree = e.type === 'forge' ? 'Military' : 'Magic';
    return { name: 'Upgrade to ' + d.levels[lv], desc: `Raises ${tree} research to Tier ${['', 'I', 'II', 'III'][lv + 1]} and to ${[0, 2, 4, 6][lv + 1]} points every 10 s. Takes ${up.time} s; no Mason needed.`, cost: up.cost, why: lackText(up.cost), icon: buildThumb(e.type, lv + 1) };
  }
  if (what === 'retreat') {
    const armies = S.selected.filter(v => v.kind === 'army' && v.battle && !v.retreating);
    const lock = Math.max(0, ...armies.map(retreatLockLeft));
    const why = !armies.length ? 'Not in battle' : armies.every(a => retreatTo(a) < 0) ? 'No way out: every open border is blocked' : lock > 0 ? `Locked in battle for ${Math.ceil(lock)} s` : null;
    const est = armies.map(a => { const n = retreatLoss(a); return `${a.name} would lose about ${n} of ${troopCount(a)}`; }).join('; ');
    return { name: 'Retreat', desc: 'Pull out of the battle to a safe neighboring province. Some soldiers are lost covering the escape; the bigger the enemy compared to you, the more you lose.' + (est ? ' ' + est + '.' : ''), cost: null, why, icon: retreatIcon };
  }
  if (what === 'split' || what === 'combine') {
    const armies = S.selected.filter(v => v.kind === 'army');
    if (what === 'split') {
      const a = armies[0];
      const why = armies.length !== 1 ? 'Select a single army' : a.battle ? 'Not during battle' : troopCount(a) < 2 ? 'Only one soldier' : a.moving ? 'It is on the move' : null;
      return { name: 'Split Army', desc: 'Divide the army into two, sharing out each kind of soldier. An army with more than one kind of soldier can also split off one kind (say, its cavalry) into a new army.' + (a ? ' ' + a.name + ': ' + troopText(a) + '.' : ''), cost: null, why, icon: splitIcon };
    }
    const why = armies.length < 2 ? 'Select two or more armies' : armies.some(a => a.battle) ? 'Not during battle' : armies.some(a => a.prov !== armies[0].prov) ? 'Armies must share a province' : armies.some(a => a.moving) ? 'An army is on the move' : null;
    return { name: 'Combine Armies', desc: 'Merge the selected armies into one.' + (armies.length > 1 ? ` ${armies.length} armies, ${armies.reduce((n, a) => n + troopCount(a), 0)} soldiers.` : ''), cost: null, why, icon: combineIcon };
  }
  if (what === 'stealth') {
    const ws = S.selected.filter(v => v.kind === WAYFINDER), on = ws.some(w => w.stealth);
    return { name: 'Sneak: ' + (hasTech('stealth') ? (on ? 'On' : 'Off') : 'locked'), desc: 'A sneaking Wayfinder moves three times slower, but enemy armies can’t see him, so he can scout during a war. An enemy army that finds a Wayfinder who isn’t sneaking kills him.', cost: null, why: hasTech('stealth') ? null : 'Research Wayfinder Stealth first', ok: on ? 'Click to stop sneaking' : 'Click to sneak', icon: on && hasTech('stealth') ? sneakIconOn : sneakIcon };
  }
  if (what === 'auto') {
    const ws = S.selected.filter(v => v.kind === WAYFINDER), on = ws.some(w => w.auto !== false);
    return { name: 'Auto-survey: ' + (hasTech('autoscout') ? (on ? 'On' : 'Off') : 'locked'), desc: 'When idle, Wayfinders walk to the nearest explored province that hasn’t been surveyed and survey it. Click to turn it ' + (on ? 'off' : 'on') + ' for the selected Wayfinders.', cost: null, why: hasTech('autoscout') ? null : 'Research Automating Wayfinders first', ok: on ? 'Click to turn off' : 'Click to turn on', glow: on && hasTech('autoscout'), icon: on && hasTech('autoscout') ? autoIconOn : autoIcon };
  }
  if (what === 'survey') {
    const ws = S.selected.filter(v => v.kind === WAYFINDER);
    const why = !ws.length ? 'No Wayfinder selected' : null;
    const q = ws.reduce((n, w) => n + surveysIn(w), 0);
    const here = ws.some(w => !S.surveyed.has(w.prov));
    return { name: 'Survey', desc: 'Walk a loop around this province to reveal its resources and any Hidden Gold Deposit. To survey elsewhere, Ctrl+right-click a province and pick Survey; hold Shift to queue several.' + (q ? ` ${q} queued.` : ''), cost: null, why: why || (here ? null : 'This province is already surveyed'), icon: surveyIcon };
  }
  const m = S.selected.find(v => v.kind === MASON), d = type === 'outpost' ? { name: 'Outpost', cost: OUTPOST_COST } : BUILD_DEFS[type];
  let why = !m ? 'No Mason selected' : m.build ? 'He is already building' : buildCheck(m.prov, type);   // Z3: walking is fine, he stops and builds where he is
  const desc = type === 'outpost' ? 'Claims this province. It must be surveyed and border your land.' : d.gives ? 'Adds ' + Object.entries(d.gives).map(([k, v]) => '+' + v + ' ' + k).join(', ') + ' every 10 s.' + (type === 'farm' ? ' Up to 4 per province.' : type === 'lumber' ? ' One per tree border.' : '') + (m && owned(m.prov) && buildCap(m.prov, type) > 1 ? ` ${countOf(m.prov, type)}/${buildCap(m.prov, type)} here.` : '') : type === 'barracks' ? 'Trains the infantry you design in the Armory. With a Stable in the same province, your cavalry designs too.' : type === 'stable' ? 'Lets a Barracks in this province train Cavalry.' : '';
  return { name: d.name, desc: (desc || d.blurb || '') + (d.upkeep ? ' Upkeep every 10 s: ' + Object.entries(d.upkeep).map(([k, v]) => v + ' ' + k).join(', ') + '.' : '') + ' Builds where the Mason stands in ' + buildTime(type) + ' s.', cost: d.cost, why, icon: buildThumb(type) };
}
function cmdUse(id) {
  if (magicCmdUse(id)) return;
  const [what, type] = id.split(/:(.*)/s);
  if (what === 'upgrade') { startUpgrade(S.selProv); return; }
  if (what === 'xup') { startXup(S.selProv, S.selPart); return; }
  if (what === 'xcancel') { cancelXup(S.selProv, S.selPart); return; }
  if (what === 'cancelup') { cancelUpgrade(S.selProv); return; }
  if (what === 'train') { train(type); return; }
  if (what === 'queue') { cancelTrain(+type); return; }
  if (what === 'survey') { surveyCommand(); return; }
  if (what === 'stealth') { const ws = S.selected.filter(v => v.kind === WAYFINDER), on = ws.some(w => w.stealth); ws.forEach(w => w.stealth = !on); toast(on ? 'Wayfinder stops sneaking.' : 'Wayfinder is sneaking: three times slower, hidden from enemy armies.'); return; }
  if (what === 'auto') { const ws = S.selected.filter(v => v.kind === WAYFINDER), on = ws.some(w => w.auto !== false); ws.forEach(w => { w.auto = !on; w.nextAuto = 0; }); toast(`Auto-survey ${on ? 'off' : 'on'} for ${ws.length > 1 ? ws.length + ' Wayfinders' : ws[0].name}.`); return; }
  if (what === 'retreat') { S.selected.filter(v => v.kind === 'army' && v.battle && !v.retreating).forEach(retreat); return; }
  if (what === 'split') { const a = S.selected.find(v => v.kind === 'army'); if (a) { if (Object.keys(a.troops).filter(k => a.troops[k] > 0).length > 1) openSplitMenu(a); else splitArmy(a); } return; }   // IC05: an army of mixed soldiers can be split by kind
  if (what === 'combine') { combineArmies(S.selected.filter(v => v.kind === 'army')); return; }
  if (extraCmdUse(id)) return;
  const m = S.selected.find(v => v.kind === MASON); if (!m) return;
  if (what === 'cancelbuild') { if (m.build) { cancelBuild(m); toast('Construction cancelled. Resources refunded.'); cmdKey = ''; } return; }
  if (m.moving) haltUnit(m);
  type === 'outpost' ? startBuild(m) : beginExtra(m, type);
}
// when a capital or barracks is selected the command card trains units: top row trains, bottom row is the queue
function renderTrainCard() {
  const kinds = trainable(S.selKind, S.selBuilding), Q = S.queues[srcKey()] || [];
  const key = 'train|' + srcKey() + '|' + kinds.join(',') + '|' + Q.map(q => q.kind).join(',') + '|' + RES.map(k => S.stock[k]).join(',') + '|' + [...S.xup.keys()].join(',') + '|' + extrasIn(S.selBuilding).map(e => e.level || 1).join(',');
  if (key !== cmdKey) {
    cmdKey = key;
    const tower = S.selKind === 'magetower' && extraAt(S.selBuilding, S.selPart), title = S.selKind === 'capital' ? 'Capital' : tower ? BUILD_DEFS.magetower.levels[(tower.level || 1) - 1] : 'Barracks';
    $q('#cmdTabs').innerHTML = `<span class="cmd-tab" aria-selected="true"><img alt="" src="${S.selKind === 'capital' ? settlementThumb(2) : tower ? buildThumb('magetower', tower.level || 1) : buildThumb('barracks')}">${title}</span>`;
    const cells = new Array(16).fill('<div class="cmd-cell"></div>');
    kinds.forEach((k, i) => { const info = cmdInfo('train:' + k); cells[i] = `<button type="button" class="cmd-btn${info.why ? ' off' : ''}" data-cmd="train:${k}" aria-label="Train ${info.name}${info.why ? ' (' + info.why + ')' : ''}"><img alt="" src="${portrait(k)}"></button>`; });
    Q.slice(0, 4).forEach((q, i) => { cells[12 + i] = `<button type="button" class="cmd-btn cmd-q" data-cmd="queue:${i}" aria-label="${UNIT_DEFS[q.kind].name} in training, click to cancel"><img alt="" src="${portrait(q.kind)}">${i === 0 ? '<i class="cmd-prog"><s></s></i>' : ''}<em>${i + 1}</em></button>`; });
    if (Q.length > 4) cells[15] = `<div class="cmd-cell cmd-more">+${Q.length - 3}</div>`;
    if (tower) { const xu = S.xup.get(S.selBuilding + '@' + tower.slot), id = xu ? 'xcancel' : 'xup', info = cmdInfo(id); cells[3] = `<button type="button" class="cmd-btn${info.why ? ' off' : ''}" data-cmd="${id}" aria-label="${info.name}"><img alt="" src="${info.icon}">${xu ? '<i class="cmd-prog"><s></s></i>' : ''}</button>`; }
    $q('#cmdGrid').innerHTML = cells.join('');
    if (cmdHover) showCmdTip(cmdHover);
  }
  const bar = $q('#cmdGrid .cmd-prog s'), q = Q[0];
  if (bar) bar.style.width = (q && q.t0 !== null ? Math.min(100, (S.t - q.t0) / trainTime(q.kind) * 100) : 0) + '%';
}
function renderSettleCard() {
  const p = S.selProv, b = S.buildings.get(p), up = S.upgrades.get(p);
  const key = 'settle|' + p + '|' + b.stage + '|' + !!up + '|' + RES.map(k => S.stock[k]).join(',') + '|' + rewallsAt(p).length + '|' + warsOf(ME).length + '|' + S.rewallJobs.has(p);
  if (key !== cmdKey) {
    cmdKey = key;
    $q('#cmdTabs').innerHTML = `<span class="cmd-tab" aria-selected="true"><img alt="" src="${settlementThumb(b.stage)}">${STAGE_NAME[b.stage]}</span>`;
    const cells = new Array(16).fill('<div class="cmd-cell"></div>');
    if (b.stage === 0) { const info = cmdInfo(up ? 'cancelup' : 'upgrade'); cells[0] = `<button type="button" class="cmd-btn${info.why ? ' off' : ''}" data-cmd="${up ? 'cancelup' : 'upgrade'}" aria-label="${info.name}"${cmdBg('build:outpost')}><img alt="" src="${info.icon}">${up ? '<i class="cmd-prog"><s></s></i>' : ''}</button>`; }
    if (b.stage >= 1 && (b.stage === 1 || rewallsAt(p).length)) { const info = cmdInfo('rewalls'); cells[0] = `<button type="button" class="cmd-btn${info.why ? ' off' : ''}" data-cmd="rewalls" aria-label="${info.name}"><img alt="" src="${info.icon}"></button>`; }
    $q('#cmdGrid').innerHTML = b.stage === 0 || cells[0].includes('rewalls') ? cells.join('') : '<div class="cmd-empty"></div>';
    if (cmdHover) showCmdTip(cmdHover);
  }
  const bar = $q('#cmdGrid .cmd-prog s'); if (bar && up) bar.style.width = Math.min(100, (S.t - up.t0) / FORT_UPGRADE.time * 100) + '%';
  if (cmdHover === 'cancelup') showCmdTip(cmdHover);
}
// a Forge or Mage Tower is selected: its card offers the next upgrade
function renderLevelCard() {
  const p = S.selProv, e = extraAt(p, S.selPart); if (!e) return;
  const d = BUILD_DEFS[e.type], lv = e.level || 1, xu = S.xup.get(p + '@' + e.slot);
  const key = 'lvl|' + p + '|' + S.selPart + '|' + lv + '|' + !!xu + '|' + RES.map(k => S.stock[k]).join(',');
  if (key !== cmdKey) {
    cmdKey = key;
    $q('#cmdTabs').innerHTML = `<span class="cmd-tab" aria-selected="true"><img alt="" src="${buildThumb(e.type, lv)}">${d.levels[lv - 1]}</span>`;
    const cells = new Array(16).fill('<div class="cmd-cell"></div>'), id = xu ? 'xcancel' : 'xup', info = cmdInfo(id);
    cells[0] = `<button type="button" class="cmd-btn${info.why ? ' off' : ''}" data-cmd="${id}" aria-label="${info.name}"><img alt="" src="${info.icon}">${xu ? '<i class="cmd-prog"><s></s></i>' : ''}</button>`;
    $q('#cmdGrid').innerHTML = cells.join('');
    if (cmdHover) showCmdTip(cmdHover);
  }
  const bar = $q('#cmdGrid .cmd-prog s'); if (bar && xu) bar.style.width = Math.min(100, (S.t - xu.t0) / d.ups[xu.to - 1].time * 100) + '%';
  if (cmdHover === 'xcancel') showCmdTip(cmdHover);
}
function renderCmd() {
  if (S.selBuilding >= 0 && !S.selected.length) { renderTrainCard(); if (cmdHover && cmdHover.startsWith('queue')) showCmdTip(cmdHover); return; }
  if (!S.selected.length && S.selProv >= 0 && S.selPart === 'settlement' && owned(S.selProv)) { renderSettleCard(); return; }
  if (!S.selected.length && S.selProv >= 0 && S.selPart && BUILD_DEFS[ptype(S.selPart)] && BUILD_DEFS[ptype(S.selPart)].levels && owned(S.selProv)) { renderLevelCard(); addDestroyCell(); return; }
  if (!S.selected.length && S.selProv >= 0 && S.selPart && S.selPart !== 'settlement' && BUILD_DEFS[ptype(S.selPart)] && owned(S.selProv)) { renderBuildingCard(); return; }
  const kinds = [...new Set(S.selected.map(v => v.kind))];
  if (!kinds.includes(cmdTab)) cmdTab = kinds[0] || null;
  const m = S.selected.find(v => v.kind === MASON), w = S.selected.find(v => v.kind === WAYFINDER);
  const key = magicCmdKey() + '|' + kinds.join(',') + '|' + cmdTab + '|' + S.selected.filter(v => v.kind === 'army').map(a => a.id + ':' + troopCount(a) + ':' + a.prov + ':' + a.moving + ':' + !!a.battle).join(',') + '|' + RES.map(k => S.stock[k]).join(',') + '|' + (m ? m.prov + ':' + m.moving + ':' + !!m.build : '') + '|' + (w ? w.prov + ':' + w.moving + ':' + !!w.survey : '') + '|' + S.surveyed.size + '|' + [...S.extras.values()].reduce((a, l) => a + l.length, 0) + '|' + S.buildings.size;
  if (key === cmdKey) return; cmdKey = key;
  const tabs = $q('#cmdTabs');
  tabs.innerHTML = kinds.length > 1 ? kinds.map(k => { const n = S.selected.filter(v => v.kind === k).length; return `<button type="button" class="cmd-tab" role="tab" aria-selected="${k === cmdTab}" data-tab="${k}"><img alt="" src="${portrait(k)}">${k === 'army' ? (n > 1 ? 'Armies' : 'Army') : UNIT_DEFS[k].name}${n > 1 ? ' ×' + n : ''}</button>`; }).join('') : '';
  const grid = $q('#cmdGrid'), cells = new Array(16).fill(null);
  for (const a of (CMD[cmdTab] || [])) cells[a.cell] = a;
  grid.title = !cmdTab ? 'Select a unit, building or province to see its actions here' : '';
  const empty = !cmdTab ? '' : !(CMD[cmdTab] || []).length ? `${UNIT_DEFS[cmdTab].name}s have no abilities yet.` : '';
  grid.innerHTML = empty ? `<div class="cmd-empty">${empty}</div>` : cells.map(a => {
    if (!a) return '<div class="cmd-cell"></div>';
    const info = cmdInfo(a.id);
    return `<button type="button" class="cmd-btn${info.why ? ' off' : ''}${info.glow ? ' glow' : ''}" data-cmd="${a.id}" aria-label="${info.name}${info.why ? ' (' + info.why + ')' : ''}"${cmdBg(a.id)}><img alt="" src="${info.icon}">${a.key ? `<kbd>${a.key}</kbd>` : ''}</button>`;
  }).join('');
  if (cmdHover) showCmdTip(cmdHover);
}
function showCmdTip(id) {
  const tip = $q('#cmdTip'), info = cmdInfo(id);
  tip.innerHTML = `<b>${info.name}</b>${info.desc}` + (info.cost ? `<div class="costs">${costHTML(info.cost)}</div>` : '') + (info.why ? `<div class="why">${info.why}</div>` : `<div class="ok">${info.ok || 'Ready'}</div>`);
  tip.hidden = false;
}
$q('#cmd').addEventListener('pointerdown', e => e.stopPropagation());
$q('#cmdTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { cmdTab = b.dataset.tab; cmdKey = ''; } });
$q('#cmdGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-cmd]'); if (!b) return;
  const info = cmdInfo(b.dataset.cmd);
  if (info.why) toast(info.name + ': ' + info.why + '.', true); else cmdUse(b.dataset.cmd);
  b.blur(); cmdKey = '';
});
$q('#cmdGrid').addEventListener('pointerover', e => { const b = e.target.closest('[data-cmd]'); cmdHover = b ? b.dataset.cmd : null; if (b) showCmdTip(cmdHover); else $q('#cmdTip').hidden = true; });
$q('#cmdGrid').addEventListener('pointerleave', () => { cmdHover = null; $q('#cmdTip').hidden = true; });

// ---------- province menu ----------
// terrain, owner, resources and buildings of the selected province; buildings can be selected from here
let provKey = '';
const settleURL = {};
function settlementThumb(stage) {
  if (settleURL[stage]) return settleURL[stage];
  const c = document.createElement('canvas'); c.width = c.height = 84; const g = c.getContext('2d');
  g.translate(42, 60); const k = stage === 2 ? 0.24 : stage === 1 ? 0.3 : 0.46; g.scale(k, k); RealmBuild.drawSettlement(g, stage, 0.8);
  return settleURL[stage] = c.toDataURL();
}
const STAGE_NAME = ['Outpost', 'Fort', 'Capital'];
function partInfo(p, part, lvE) {
  if (part === 'settlement') { const st = S.buildings.get(p).stage; return { name: STAGE_NAME[st], img: settlementThumb(st), desc: st === 2 ? `Trains Wayfinders and Masons. +${CAPITAL_BONUS.gold} of each resource. 6 building plots.` : st === 1 ? 'A stone fort. 4 building plots.' : 'Claims the province. 2 building plots; upgrade to a Fort for 4.' }; }
  const d = BUILD_DEFS[part];
  if (d.levels) { const lv = (lvE && lvE.level) || 1; return { name: d.levels[lv - 1], img: buildThumb(part, lv), desc: `${part === 'forge' ? 'Military' : 'Magic'} research Tier ${['', 'I', 'II', 'III'][lv]} · +${[0, 2, 4, 6][lv]} points every 10 s` + (lv < 3 ? ' · select to upgrade' : '') }; }
  return { name: d.name, img: buildThumb(part), desc: d.store ? d.note : d.gives ? Object.entries(givesOf(part)).map(([k, v]) => '+' + v + ' ' + k).join(', ') + ' every 10 s' : part === 'barracks' ? (extrasIn(p).some(e => e.type === 'stable') ? 'Trains infantry and cavalry' : 'Trains infantry') : part === 'stable' ? 'Lets this province’s Barracks train cavalry' : '' };
}
function provMenu() {
  const el = $q('#prov'), p = S.selProv;
  if (p < 0 || !S.explored.has(p)) { if (!el.hidden) { el.hidden = true; provKey = ''; } if (p >= 0) S.selProv = -1; return; }
  const vis = S.visible.has(p), b = vis ? S.buildings.get(p) : null, list = vis ? extrasIn(p) : [], site = vis ? sitesIn(p) : [], pend = vis ? pendingIn(p) : [];
  const key = [p, provName(p), S.selPart, vis, b ? b.stage : -1, S.upgrades.has(p), list.map(e => e.type + (e.level || '')).join(','), [...S.xup.keys()].join(','), site.map(v => v.build.type).join(','), pend.map(v => v.pending.type + v.pending.slot).join(','), menuSlot, S.surveyed.has(p), RES.map(k => income[k]).join(','), S.occ.get(p), S.wars.length, b ? b.owner : 0, provExtraKey(p)].join('|');
  if (key === provKey && !el.hidden) return; provKey = key; el.hidden = false;
  const P = G.provs[p], T = TER[P.terrain], y = yields[p], surveyed = S.surveyed.has(p);
  const owner = b ? `<span class="pm-own"><i style="background:${PLAYERS[b.owner].color}"></i>${PLAYERS[b.owner].name}${b.owner === ME ? ' (you)' : ''}</span>` : vis ? '<span class="pm-own none">Unclaimed</span>' : '<span class="pm-own none">Owner unknown</span>';
  let res;
  if (!surveyed) res = '<div class="pm-res none" title="Survey it with a Wayfinder to learn its resources">Resources unknown</div>';
  else {
    const x = b ? extrasBonus(p) : { gold: 0, wood: 0, food: 0 }, cap = b && b.stage === 2;
    res = '<div class="pm-res">' + RES.map(k => { const base = y[k], add = x[k] + (cap ? CAPITAL_BONUS[k] : 0); return `<span class="cst" title="${RES_LABEL[k]}: ${base} from the land${y.bonus[k] ? ' (incl. +' + y.bonus[k] + ' bonus)' : ''}${add ? ', +' + add + ' from buildings' : ''}"><img alt="${k}" src="${icoURL[k]}"><b class="${y.bonus[k] ? 'bonus' : ''}">${base}</b>${add ? `<em>+${add}</em>` : ''}</span>`; }).join('') + '</div>';
  }
  const tags = [y.deposit && surveyed ? '<span class="pm-tag gold">Hidden Gold Deposit</span>' : '', treeBorder[p] ? `<span class="pm-tag">${treeBorder[p]} tree border${treeBorder[p] > 1 ? 's' : ''}</span>` : '', P.coastal ? '<span class="pm-tag">Coastal</span>' : '', P.lakeside ? '<span class="pm-tag">Lakeside</span>' : '', setpieceTag(p), banditTag(p)].join('');
  let blds;
  if (!vis) blds = '<div class="pm-none" title="Send a unit here to see what is built">Hidden</div>';
  else {
    const slot = (part, info, extra = '') => `<button type="button" class="pm-b${S.selPart === part ? ' on' : ''}" data-part="${part}" title="${info.name}: ${info.desc}"><img alt="" src="${info.img}"><span>${info.name}${extra}</span></button>`;
    const cells = [];
    for (let i = 0; i < (b ? plotCap(p) : 0); i++) {
      const e = list.find(v => v.slot === i), s2 = site.find(v => v.build.slot === i);
      if (e) cells.push(slot(e.type + '@' + e.slot, partInfo(p, e.type, e)));
      else if (s2) cells.push(`<div class="pm-b building"><img alt="" src="${buildThumb(s2.build.type)}"><span>${BUILD_DEFS[s2.build.type].name}<small>building…</small></span></div>`);
      else if (pend.find(v => v.pending.slot === i)) { const v = pend.find(w => w.pending.slot === i); cells.push(`<div class="pm-b building"><img alt="" src="${buildThumb(v.pending.type)}"><span>${BUILD_DEFS[v.pending.type].name}<small>Mason on the way</small></span></div>`); }
      else if (b && b.owner === ME) cells.push(`<button type="button" class="pm-b empty open${menuSlot === i && menuProv === p ? ' on' : ''}" data-plot="${i}" title="Click to build something on this plot"><span>＋ Empty plot</span></button>`);
      else cells.push(`<div class="pm-b empty"><span>${b ? 'Empty plot' : '—'}</span></div>`);
    }
    blds = (b ? slot('settlement', partInfo(p, 'settlement'), b.stage === 2 ? '<small>trains units</small>' : '') : '<div class="pm-none" title="A Mason can build an outpost here once it is surveyed and borders your land">No settlement</div>') +
      (b ? `<div class="pm-grid">${cells.join('')}</div>` : '');
  }
  const sel = S.selPart && vis ? partInfo(p, ptype(S.selPart), extraAt(p, S.selPart)) : null;
  const occBy = S.occ.get(p), occRow = occBy ? `<div class="pm-occ" style="--oc:${PLAYERS[occBy].color}">Occupied by ${occBy === ME ? 'you' : 'the ' + PLAYERS[occBy].name} · ${b && b.owner === ME ? 'pays you nothing' : 'pays its owner nothing'}${b && atWar(b.owner, occBy) ? ` · ${occBy === ME ? '+' : '−'}${WAR.occVal[b.stage]} warscore` : ''}</div>` : '';
  el.innerHTML = `<div class="pm-head"><i class="pm-sw" style="background:${T.base}"></i><b>${escHTML(provName(p))}</b><button type="button" class="rn-btn" data-rename="prov:${p}" title="Rename this province" aria-label="Rename ${escHTML(provName(p))}">✎</button><small class="pm-ter">${T.label}</small>${owner}<button type="button" class="pm-x" aria-label="Close province menu">×</button></div>` +
    occRow + res + provResearchRow(p) + (tags ? `<div class="pm-tags">${tags}</div>` : '') + setpieceNote(p) +
    `<div class="pm-sec">Buildings${b ? ` <span>${list.length}/${plotCap(p)}</span>` : ''}</div>` + blds +
    (sel ? `<div class="pm-sel"><b>${sel.name}</b> · ${sel.desc}</div>` : '');
}
$q('#prov').addEventListener('pointerdown', e => e.stopPropagation());
$q('#prov').addEventListener('click', e => {
  if (e.target.closest('.pm-x')) { S.selProv = -1; S.selPart = null; S.selBuilding = -1; return; }
  const plot = e.target.closest('[data-plot]');
  if (plot) { const i = +plot.dataset.plot; if (menuSlot === i && !menuEl.hidden) closeBuildMenu(); else openPlotMenu(S.selProv, i, plot); provKey = ''; return; }
  const b = e.target.closest('[data-part]'); if (!b) return;
  const part = b.dataset.part, p = S.selProv;
  if (S.selPart === part) { S.selPart = null; S.selBuilding = -1; provKey = ''; return; }
  selectPart(p, part);
});

// ---------- unit roster (right side) ----------
let rosterKey = '';
function unitStatus(u) {
  if (u.stealth && u.moving) return 'sneaking';
  if (u.scouting !== null) return 'scouting';
  if (u.survey) return 'surveying';
  if (u.build) return 'building ' + (u.build.type === 'outpost' ? 'an outpost' : u.build.type === 'rewall' ? 'a wall back up' : u.build.type === 'road' || u.build.type === 'wall' ? 'a ' + u.build.type : BUILD_DEFS[u.build.type].name);
  if (u.pending) return 'going to build';
  if (u.surveyQueue && surveysIn(u)) return `to survey (${surveysIn(u)})`;
  if (u.surveyQueue && movesIn(u)) return `walking (${movesIn(u)} queued)`;
  if (u.moving) return 'walking';
  return 'idle';
}
// province names are colored by terrain in the Provinces tab
const TER_TEXT = { grassland: '#4d7f12', forest: '#16543a', desert: '#b0600f', swamp: '#6b4a8e' };
let rosterTab = 'units';
try { const v = localStorage.getItem('realm-roster-tab'); if (v === 'provs' || v === 'armies') rosterTab = v; } catch (e) {}
function myProvList() {
  const out = [];
  for (const [p, b] of S.buildings) if (b.owner === ME) out.push(p);
  return out.sort((a, b) => S.buildings.get(b).stage - S.buildings.get(a).stage || provName(a).localeCompare(provName(b)));
}
function renderRoster() {
  const list = S.units.filter(u => u.owner === ME && (u.kind === WAYFINDER || u.kind === MASON)), provs = myProvList();
  const key = rosterTab + '#' + (rosterTab === 'armies' ? armiesKey() : rosterTab === 'units' ? list.map(u => u.id + u.name + unitStatus(u) + u.prov + (isSel(u) ? '*' : '')).join('|') : provs.map(p => p + provName(p) + ':' + S.buildings.get(p).stage + ':' + extrasIn(p).length).join('|') + '|' + S.selProv + '|' + VIEW.hideFull) + '#' + provs.length + ':' + list.length;
  if (key === rosterKey) return; rosterKey = key;
  const el = $q('#roster');
  const tabs = `<div class="ro-tabs" role="tablist"><button type="button" class="ro-tab" role="tab" aria-selected="${rosterTab === 'units'}" data-rtab="units">Workers <span>${list.length}</span></button><button type="button" class="ro-tab" role="tab" aria-selected="${rosterTab === 'provs'}" data-rtab="provs" title="Your provinces: buildings built / building plots">Provinces <span>${provs.length}</span></button><button type="button" class="ro-tab" role="tab" aria-selected="${rosterTab === 'armies'}" data-rtab="armies" title="Your armies">Armies <span>${S.units.filter(v => v.kind === 'army' && v.owner === ME).length}</span></button></div>`;
  if (rosterTab === 'armies') { el.innerHTML = tabs + armiesTabHTML(); return; }
  if (rosterTab === 'provs') {
    const full = p => extrasIn(p).length >= plotCap(p), nFull = provs.filter(full).length, shown = VIEW.hideFull ? provs.filter(p => !full(p)) : provs;
    const bar = `<div class="ro-bar"><button type="button" class="ro-hide" data-hidefull="1" aria-pressed="${VIEW.hideFull}" title="Hide provinces whose building plots are all built">${VIEW.hideFull ? '☑' : '☐'} Hide full${nFull ? ` <span>${nFull}</span>` : ''}</button></div>`;
    el.innerHTML = tabs + bar + (shown.length ? shown.map(p => {
      const n = extrasIn(p).length, cap = plotCap(p), t = G.provs[p].terrain, st = S.buildings.get(p).stage;
      return `<button type="button" class="ro-p${S.selProv === p ? ' on' : ''}" data-prov="${p}" title="${provName(p)} · ${TER[t].label} ${STAGE_NAME[st].toLowerCase()} · ${n} of ${cap} plots built${n < cap ? ' (' + (cap - n) + ' empty)' : ''}. Click to open, double-click to go there."><b style="color:${TER_TEXT[t] || 'var(--chip-text)'}">${provName(p)}</b>${st ? `<small>${STAGE_NAME[st]}</small>` : ''}<em class="${n >= cap ? 'full' : 'miss'}">${n}/${cap}</em></button>`;
    }).join('') : `<div class="ro-none">${provs.length ? 'Every province is full' : 'No provinces yet'}</div>`);
    return;
  }
  const group = (kind, title) => { const us = list.filter(u => u.kind === kind); return `<div class="ro-sec">${title} <span>${us.length}</span></div>` + (us.length ? us.map(u => `<button type="button" class="ro-u${isSel(u) ? ' on' : ''}" data-uid="${u.id}" title="Click to select, Shift-click to add, double-click to go to"><img alt="" src="${portrait(u.kind)}"><span><b>${u.name}</b><small><i class="${unitStatus(u) === 'idle' ? 'idle' : 'busy'}"></i>${unitStatus(u)} · ${S.explored.has(u.prov) ? provName(u.prov) : 'fog'}</small></span></button>`).join('') : '<div class="ro-none">None yet</div>'); };
  el.innerHTML = tabs + group(WAYFINDER, 'Wayfinders') + group(MASON, 'Masons');
}
$q('#roster').addEventListener('pointerdown', e => e.stopPropagation());
$q('#roster').addEventListener('click', e => {
  if (e.target.closest('[data-hidefull]')) { VIEW.hideFull = !VIEW.hideFull; viewSave(); rosterKey = ''; return; }
  const tb = e.target.closest('[data-rtab]');
  if (tb) { rosterTab = tb.dataset.rtab; rosterKey = ''; try { localStorage.setItem('realm-roster-tab', rosterTab); } catch (er) {} return; }
  const pb = e.target.closest('[data-prov]');
  if (pb) { const p = +pb.dataset.prov; S.selected = []; S.selBuilding = -1; S.selPart = null; S.selProv = S.selProv === p ? -1 : p; hoverPath = undefined; rosterKey = ''; return; }
  const bk = e.target.closest('[data-bk]');
  if (bk) { const [p, slot] = bk.dataset.bk.split('@').map(Number); selectPart(p, 'barracks@' + slot); rosterKey = ''; return; }
  const b = e.target.closest('[data-uid]'); if (!b) return;
  const u = S.units.find(v => v.id === +b.dataset.uid); if (!u) return;
  if (e.shiftKey) S.selected = isSel(u) ? S.selected.filter(v => v !== u) : [...S.selected, u];
  else S.selected = [u];
  S.selBuilding = -1; S.selProv = -1; S.selPart = null; hoverPath = undefined; rosterKey = '';
});
$q('#roster').addEventListener('dblclick', e => {
  const pb = e.target.closest('[data-prov]');
  if (pb) { const P = G.provs[+pb.dataset.prov]; flyTo({ x: P.ic[0], y: P.ic[1], z: Math.max(cam.z, fitZ * 2.2 * WORLD_K) }); return; }
  const bk = e.target.closest('[data-bk]');
  if (bk) { const P = G.provs[+bk.dataset.bk.split('@')[0]]; flyTo({ x: P.ic[0], y: P.ic[1], z: Math.max(cam.z, fitZ * 2.2 * WORLD_K) }); return; }
  const b = e.target.closest('[data-uid]'); if (!b) return;
  const u = S.units.find(v => v.id === +b.dataset.uid); if (u) flyTo({ x: u.x, y: u.y, z: Math.max(cam.z, fitZ * 2.2 * WORLD_K) });
});

// ---------- minimap ----------
// terrain colors for explored land, fog elsewhere, your nation outlined in your color, and the current view as a box
let miniDirty = true;
const miniCv = $q('#miniCv'), mctx = miniCv.getContext('2d'), miniLayer = document.createElement('canvas');
let miniT = null;
function miniSetup() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), r = miniCv.getBoundingClientRect();
  if (!r.width) return false;
  miniCv.width = miniLayer.width = Math.round(r.width * dpr); miniCv.height = miniLayer.height = Math.round(r.height * dpr);
  const [x0, y0, x1, y1] = G.bounds, pad = 260, bw = x1 - x0 + pad * 2, bh = y1 - y0 + pad * 2;
  const k = Math.min(miniCv.width / bw, miniCv.height / bh);
  miniT = { k, ox: miniCv.width / 2 - ((x0 + x1) / 2) * k, oy: miniCv.height / 2 - ((y0 + y1) / 2) * k };
  miniDirty = true; return true;
}
function renderMiniLayer() {
  const g = miniLayer.getContext('2d'), V = world.vertices, { k, ox, oy } = miniT;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#2f3b55'; g.fillRect(0, 0, miniLayer.width, miniLayer.height);
  g.setTransform(k, 0, 0, k, ox, oy); g.lineJoin = 'round'; g.lineCap = 'round';
  // sea next to explored coasts
  const sea = new Path2D(), land = new Path2D();
  for (const i of S.explored) {
    for (const [a, b, lk] of world.provinces[i].coast) { sea.moveTo(V[a][0], V[a][1]); sea.lineTo(V[b][0], V[b][1]); }
    G.provs[i].pts.forEach(([x, y], j) => j ? land.lineTo(x, y) : land.moveTo(x, y)); land.closePath();
  }
  g.strokeStyle = SEA; g.lineWidth = 360; g.stroke(sea);
  g.save(); g.clip(land, 'nonzero'); g.restore();
  // lakes bordering explored land
  (world.lakes || []).forEach(l => {
    if (!world.provinces.some((p, i) => S.explored.has(i) && p.coast.some(c => c[2] && l.polys.some(poly => poly.includes(c[0]))))) return;
    l.polys.forEach(poly => { g.beginPath(); poly.forEach((v, j) => j ? g.lineTo(V[v][0], V[v][1]) : g.moveTo(V[v][0], V[v][1])); g.closePath(); g.fillStyle = '#3d97d4'; g.fill(); });
  });
  for (const i of S.explored) {
    const P = G.provs[i]; g.beginPath(); P.pts.forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    g.fillStyle = TER[P.terrain].base; g.fill();
    const own = VIEW.miniColor ? nationOf(i) : null; if (own && PLAYERS[own]) { g.fillStyle = PLAYERS[own].color; g.globalAlpha = 0.8; g.fill(); g.globalAlpha = 1; }   // Z14
    if (!S.visible.has(i)) { g.fillStyle = 'rgba(16,24,46,0.28)'; g.fill(); }
    g.lineWidth = 1.2 / k; g.strokeStyle = 'rgba(29,26,34,0.45)'; g.stroke();
  }
  if (!territory) buildTerritory();
  // borders only show on land you have explored
  g.save(); g.clip(land, 'nonzero');
  for (const [owner, T] of territory) {
    g.lineWidth = 6.5 / k; g.strokeStyle = OL; g.stroke(T.line);
    g.lineWidth = 4 / k; g.strokeStyle = PLAYERS[owner].color; g.stroke(T.line);
  }
  g.restore();
  miniDirty = false;
}
function drawMini() {
  if (!miniT && !miniSetup()) return;
  if (miniDirty) renderMiniLayer();
  const g = mctx; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(miniLayer, 0, 0);
  const { k, ox, oy } = miniT, [ax, ay, bx, by] = viewRect(0);
  const x = ax * k + ox, y = ay * k + oy, w = (bx - ax) * k, h = (by - ay) * k, dpr = miniCv.width / miniCv.clientWidth;
  g.lineWidth = 3 * dpr; g.strokeStyle = 'rgba(29,26,34,0.85)'; g.strokeRect(x, y, w, h);
  g.lineWidth = 1.5 * dpr; g.strokeStyle = '#fff'; g.strokeRect(x, y, w, h);
}
function miniJump(e) {
  if (!miniT) return;
  const r = miniCv.getBoundingClientRect(), dpr = miniCv.width / r.width;
  cam.x = ((e.clientX - r.left) * dpr - miniT.ox) / miniT.k; cam.y = ((e.clientY - r.top) * dpr - miniT.oy) / miniT.k;
  camTween = null; clampCam(); cacheDirty = true;
}
let miniDrag = false;
miniCv.addEventListener('pointerdown', e => { e.stopPropagation(); miniDrag = true; miniCv.setPointerCapture(e.pointerId); miniJump(e); });
miniCv.addEventListener('pointermove', e => { if (miniDrag) miniJump(e); });
miniCv.addEventListener('pointerup', () => { miniDrag = false; });
miniCv.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('resize', () => { miniT = null; });

$q('#debug').addEventListener('pointerdown', e => e.stopPropagation());
$q('#dbgEnemy').addEventListener('click', e => { spawnEnemy(); e.currentTarget.blur(); });

$q('#dbgMine').addEventListener('click', e => { spawnMine(); e.currentTarget.blur(); });
// ---------- boot ----------
window.addEventListener('resize', () => { resize(); if (G) clampCam(); });
resize();
world = scaleWorld(RealmGen.generateWorld('realmlings')); G = prep(world);
fit(); setupBar(); bootMenu();
window.__realm = { castSpell, pickSchool, openSchoolPopup, abandonSchool, startPath, magesIn, isCaster, currentSchool, onBattleJoin, registerMage, designStats, addDesign, designs: () => S.designs, statsOf, sideMix, sideStrength, applyDamage, toggleArmory, techIcon, equipIcon, DSTATS, storageCap, fortLimit, fortCount, linkWhy, startLink, finishLink, hasTech, givesOf, onRoad, stepArrows, techTier, techRate, pickTech, techPayday, toggleTech, techBonus, techs: () => TECHS, startXup, extraAt, redraw: () => { cacheDirty = true; fogDirty = true; }, declareWar, makePeace, warscore, peaceCheck, myProvs, stepWar, provName, aiDemand, answerDemand, hostile, openDip, warBetween, atWar, enemiesOf, warsOf, allyOf, allied, formAlliance, endAlliance, killNation, NATIONS, nationOf, provsOf, capitalOf, connectedPick, offerAlliance, answerAlliance, selectDip, closeDip, S, G, world, startUpgrade, plotCap, spawnEnemy, spawnMine, retreat, retreatLoss, hostilesIn, splitArmy, combineArmies, troopCount, newArmy, nearestMason, openPlotMenu, selectPart, partAt, queueSurvey, surveyCommand, aim: () => surveyAim, cmdTab: () => cmdTab, miniT: () => miniT, treeBorder: () => treeBorder, srcKey, trainable, orderBuild, buildCheck, openBuildMenu, BUILD_DEFS, train, cancelTrain, buildingAt, upkeep, incomeParts: () => incomeParts, yields: () => yields, income: () => income, PLAYERS, buildTerritory, territory: () => territory, zoomPreset, focusProvince, order, orderGroup, startBuild, abilityQ, startSurvey, finishBox, provAt, home, fogState, cam: () => cam, toWorld, worldToScreen: (x, y) => [(x - cam.x) * cam.z + cw / 2, (y - cam.y) * cam.z + ch / 2] };
if (document.fonts) document.fonts.ready.then(() => { cacheDirty = true; });
requestAnimationFrame(frame);
