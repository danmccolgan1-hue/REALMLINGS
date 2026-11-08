
// ================= v77 gameplay changes (GPC list) =================
// the per-frame step for the changes below (runs only while unpaused)
let gpcSlowT = -9;
function stepGPC(t, dt) {
  if (t - gpcSlowT >= 1 || t < gpcSlowT) { gpcSlowT = t; revealOwnedResources(t); evictStrays(); }
  stepRetrofits(t);
  stepRest(t, dt);
  stepQuakes(t);
  stepFortGates();
  stepSiege(dt);
  stepRetreatHome(t);
  stepRewalls(t);
}

// ---------- GPC04: a claimed province's resources are known to everyone who can see it ----------
function revealOwnedResources(t) {
  for (const [p, b] of S.buildings) {
    if (S.explored.has(p) && !S.surveyed.has(p)) S.surveyed.set(p, t);
    for (const N of Object.values(NATIONS)) if (N.alive && N.surveyed && b.owner !== N.id) N.surveyed.add(p);
  }
}

// ---------- GPC05b: a Wayfinder standing where another nation finishes an outpost has to leave ----------
// he goes back to the province he came from if it is his own nation's or an enemy's at war with him; otherwise all the way home to his capital
function outpostClaimed(p, by) {
  for (const u of S.units) {
    if (u.kind !== WAYFINDER || u.owner === by || u.prov !== p || u.exiting) continue;
    const back = u.lastProv, bo = back !== undefined ? nationOf(back) : 0;
    const okBack = back !== undefined && back !== p && (bo === u.owner || (bo && hostile(u.owner, bo)));
    u.path = []; u.moving = false; u.scouting = null; u.survey = null; u.aiSurvey = null; u.aiTarget = undefined; u.aiJob = null;
    if (u.surveyQueue) u.surveyQueue = []; u.pendingSurvey = -1; u.autoWalk = null; u.pending = null;
    let dest = okBack ? back : capitalOf(u.owner);
    if (dest < 0) { const own = provsOf(u.owner); if (!own.length) continue; const d = hopsFrom(p, allNbr); dest = own.sort((x, y) => d[x] - d[y])[0]; }
    u.exiting = true;   // he may cross any land on the way, and can't be commanded until he arrives
    if (!order(u, dest, true)) { u.prov = dest; u.slot = freeSlot(dest, u); [u.x, u.y] = slotPos(dest, u.slot); u.exiting = false; }
    else if (okBack) u.exitTo = dest;
    if (u.owner === ME) { S.selected = S.selected.filter(v => v !== u); cmdKey = ''; rosterKey = ''; toast(`The ${PLAYERS[by].name} finished an outpost at ${provName(p)}: ${u.name} withdraws to ${okBack ? provName(dest) : 'your capital'}.`, true); }
  }
}

// ---------- units left standing in land they may no longer be in (a truce ran out, a border moved) march home ----------
function evictStrays() {
  let mine = 0;
  for (const a of S.units) {
    if (!isNation(a.owner) || a.exiting || a.moving || a.battle || a.fleeing || a.retreatHome) continue;
    if (nationOk(a, a.prov)) continue;
    const own = provsOf(a.owner); if (!own.length) continue;
    a.exiting = true; a.retreating = false;
    if (a.surveyQueue) a.surveyQueue = []; a.survey = null; a.aiSurvey = null; a.scouting = null; a.pendingSurvey = -1; a.pending = null; a.aiJob = null; if (a.build) cancelBuild(a);
    if (a.cast && typeof cancelCast === 'function') cancelCast(a);
    const d = hopsFrom(a.prov), dest = own.sort((x, y) => d[x] - d[y])[0];
    if (!order(a, dest, true)) { a.prov = dest; a.slot = freeSlot(dest, a); [a.x, a.y] = slotPos(dest, a.slot); a.path = []; a.moving = false; a.exiting = false; }
    else if (a.owner === ME) mine++;
  }
  if (mine) { S.selected = S.selected.filter(u => !u.exiting); toast(`${mine} of your unit${mine > 1 ? 's are' : ' is'} in a nation’s land without a truce or a war and will march home.`); }
}

// ---------- GPC24: walking around a bend inside a province instead of detouring through its middle ----------
// each province gets a fixed set of waypoints spread over its open ground; a route is the shortest chain of them
// that stays on open ground. The province's middle is only used when nothing else works.
const navCache = new Map();
function segIn(P, a, b, slackA, slackB) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 14));
  for (let k = 1; k < n; k++) {
    const d = L * k / n; if (d < slackA || L - d < slackB) continue;
    if (!inPoly(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, P.inner)) return false;
  }
  return true;
}
function navNodes(prov) {
  let N = navCache.get(prov); if (N && N.seed === world.seed) return N;
  const P = G.provs[prov], c = P.ic, pts = [[c[0], c[1]]];
  for (const [x, y] of P.inner) for (const f of [0.85, 0.62, 0.38]) {
    const q = [c[0] + (x - c[0]) * f, c[1] + (y - c[1]) * f];
    if (inPoly(q[0], q[1], P.inner) && distToEdges(q[0], q[1], P.inner) >= 12 && !pts.some(o => Math.hypot(o[0] - q[0], o[1] - q[1]) < 36)) pts.push(q);
  }
  const vis = pts.map(() => new Array(pts.length).fill(false));
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) vis[i][j] = vis[j][i] = segIn(P, pts[i], pts[j], 0, 0);
  N = { seed: world.seed, pts, vis }; navCache.set(prov, N); return N;
}
function navRoute(prov, a, b) {
  const P = G.provs[prov], slack = q => inPoly(q[0], q[1], P.inner) ? 0 : 44, sa = slack(a), sb = slack(b);
  if (segIn(P, a, b, sa, sb)) return [];
  const { pts, vis } = navNodes(prov), n = pts.length;
  const fromA = pts.map(q => segIn(P, a, q, sa, 0)), toB = pts.map(q => segIn(P, q, b, 0, sb));
  const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
  for (let i = 0; i < n; i++) if (fromA[i]) dist[i] = Math.hypot(pts[i][0] - a[0], pts[i][1] - a[1]);
  let best = -1, bestD = Infinity;
  for (;;) {
    let k = -1; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (k < 0 || dist[i] < dist[k])) k = i;
    if (k < 0) break; done[k] = true;
    if (toB[k]) { const d = dist[k] + Math.hypot(b[0] - pts[k][0], b[1] - pts[k][1]); if (d < bestD) { bestD = d; best = k; } }
    if (dist[k] >= bestD) break;
    for (let j = 0; j < n; j++) if (!done[j] && vis[k][j]) { const d = dist[k] + Math.hypot(pts[j][0] - pts[k][0], pts[j][1] - pts[k][1]); if (d < dist[j]) { dist[j] = d; prev[j] = k; } }
  }
  if (best < 0) return [[P.ic[0], P.ic[1]]];
  const out = []; for (let k = best; k >= 0; k = prev[k]) out.unshift(pts[k]);
  return out;
}

// ---------- sieges: an army at war with a wall's owner batters it down ----------
// called from the movement loop: true while the army stands at a hostile wall (it walks up to it first)
function siegeHold(u, time) {
  const wp = u.path[0];
  if (u.kind !== 'army' || !wp || wp.siege === undefined) { if (u.sieging != null) u.sieging = null; return false; }
  const i = wp.siege, ctl = S.walls.has(i) ? gateCtl(edgeKey(i)) : u.owner;
  if (ctl === u.owner) { u.sieging = null; wp.siege = undefined; return false; }   // the wall is down, or the gate is ours now
  if (!ctl || !hostile(u.owner, ctl) || troopCount(u) < SIEGE_MIN) {
    // no longer at war with the wall's owner, or too few soldiers left to batter it: find another way, or stop
    if (troopCount(u) < SIEGE_MIN && u.owner === ME && u.sieging != null) toast(`${u.name} has too few soldiers to batter the wall (it takes ${SIEGE_MIN}).`, true);
    u.sieging = null; const fin = u.final; u.path = []; u.moving = false;
    if (fin === undefined || !order(u, fin, true)) { u.slot = freeSlot(u.prov, u); const [x, y] = slotPos(u.prov, u.slot); u.path = [{ x, y, slot: true }]; u.moving = true; }
    return true;
  }
  const d = Math.hypot(wp.x - u.x, wp.y - u.y), STAND = 34;
  if (d > STAND + 1) {
    const step = Math.min(SPEED * unitSpeed(u) * time, d - STAND);
    u.x += (wp.x - u.x) / d * step; u.y += (wp.y - u.y) / d * step; u.th = Math.round(Math.atan2(wp.x - u.x, wp.y - u.y) / (Math.PI / 4)) * (Math.PI / 4);
    if (d - step > STAND + 1) return true;
  }
  if (u.sieging !== i) {
    u.sieging = i;
    const e = world.edges[i], other = e.a === u.prov ? e.b : e.a;
    if (u.owner === ME) toast(`${u.name} is battering down the ${wallKind() === 'stone' ? 'stone wall' : 'palisade'} into ${provName(other)}.`);
    else if (ctl === ME) { toast(`The ${PLAYERS[u.owner].name} is battering down your wall at ${provName(other)}!`, true); sfx('wn_enemy'); }
  }
  return true;
}
// a wall under siege falls after 2 minutes of battering, however big the army (or however many armies) at it;
// an Earthquake raises one in 30 s, so walls hold an enemy up for a good while
const SIEGE_TIME = 120, SIEGE_MIN = 6;   // armies of fewer than 6 soldiers can't batter a wall
function stepSiege(dt) {
  if (!dt) return;
  const hit = new Map();
  for (const a of S.units) {
    if (a.kind !== 'army' || a.sieging == null || a.battle || troopCount(a) < SIEGE_MIN) continue;
    if (!S.walls.has(a.sieging)) { a.sieging = null; continue; }
    if (!hit.has(a.sieging)) hit.set(a.sieging, a);
  }
  for (const [i, a] of hit) {
    S.wallHp[i] = (S.wallHp[i] ?? WALL_HP[wallKind()]) - WALL_HP[wallKind()] / SIEGE_TIME * dt;
    if (S.wallHp[i] <= 0) breakWall(i, a);
  }
}
function breakWall(i, by) {
  const e = world.edges[i], k = linkKey(e.a, e.b), ctl = gateCtl(k);
  const g = S.gateOwn.get(k); if (g) S.brokenWalls.set(k, { ...g });
  const V = world.vertices, a = V[e.v[0]], b = V[e.v[1]], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  e.open = true; e.style = 'open'; S.walls.delete(i); delete S.wallHp[i]; S.gateOwn.delete(k); wallsVer++;
  openNbr[e.a].push({ q: e.b, m: mid }); openNbr[e.b].push({ q: e.a, m: mid });
  G.crossings.push({ x: mid[0], y: mid[1], ang: Math.atan2(b[1] - a[1], b[0] - a[0]), len: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  cacheDirty = true; fogDirty = true; hoverPath = undefined; territory = null;
  for (const u of S.units) { if (u.sieging === i) u.sieging = null; for (const w of u.path || []) if (w.siege === i) w.siege = undefined; }
  if (by && by.owner === ME) { toast(`${by.name} broke through the wall between ${provName(e.a)} and ${provName(e.b)}!`); sfx('war_fort_win', { vol: 0.7 }); }
  else if (ctl === ME) { toast(`The wall between ${provName(e.a)} and ${provName(e.b)} has fallen to the ${by ? PLAYERS[by.owner].name : 'enemy'}!`, true); sfx('war_fort_lose', { vol: 0.7 }); }
}

// ---------- GPC10b: forts raise walls with gates on their open borders once walls are researched ----------
// each border is walled once; tear a wall down (or have it broken) and the fort leaves that border open.
// Every wall has a gate, so walls only keep others out; a province may end up walled on every side.
S.fortWalled = new Set();
function stepFortGates() {
  for (const [p, b] of S.buildings) {
    if (b.stage !== 1 || !isNation(b.owner) || !techOf(b.owner, 'walls')) continue;
    for (const n of openNbr[p].slice()) {
      const q = n.q, key = p + '>' + q; if (S.fortWalled.has(key)) continue;
      const ei = edgeBetween(p, q, null, true); if (ei >= 0 && S.paths[ei]) continue;   // forest paths and tunnels stay open
      S.fortWalled.add(key);
      if (raiseWall(p, q, b.owner, p) && b.owner === ME && S.explored.has(p)) toast(`The fort at ${provName(p)} raised a ${wallKind() === 'stone' ? 'stone wall' : 'palisade'} with a gate toward ${provName(q)}.`);
    }
  }
}

// ---------- GPC14: retrofitting at a Barracks ----------
const RETRO_TIME = 10;   // seconds per soldier
const barracksOk = (p, o, cav) => { const l = S.extras.get(p); return !!l && nationOf(p) === o && !S.occ.has(p) && l.some(e => e.type === 'barracks') && (!cav || l.some(e => e.type === 'stable')); };
// the nearest Barracks (with a Stable for cavalry) the army can reach, or -1
function retroSite(a, to) {
  const cav = !!DSTATS[to].cav;
  if (barracksOk(a.prov, a.owner, cav)) return a.prov;
  let best = -1, bd = Infinity;
  for (const p of S.extras.keys()) { if (!barracksOk(p, a.owner, cav)) continue; const h = findPath(a, p); if (h && h.length < bd) { bd = h.length; best = p; } }
  return best;
}
function beginRetro(a) {
  const w = a.retroWant; a.retroWant = null; if (!w) return false;
  const plan = retroPlan([a], w.to); if (!plan.n) return false;
  if (!canAfford(plan.cost)) { toast(`Retrofitting ${a.name} needs ${costText(plan.cost)}.`, true); return false; }
  for (const r in plan.cost) S.stock[r] -= plan.cost[r];
  a.retro = { to: w.to, t0: S.t, dur: plan.n * RETRO_TIME, paid: plan.cost, prov: a.prov };
  toast(`${a.name} is retrofitting ${plan.n} soldier${plan.n > 1 ? 's' : ''} to ${UNIT_DEFS[w.to].name}: ${plan.n * RETRO_TIME} s${Object.keys(plan.cost).length ? ' (−' + costText(plan.cost) + ')' : ''}. Moving or fighting stops it.`);
  cmdKey = ''; return true;
}
function cancelRetro(a, quiet) {
  if (!a.retro) return;
  for (const r in a.retro.paid) S.stock[r] += a.retro.paid[r];
  a.retro = null; cmdKey = '';
  if (!quiet && a.owner === ME) toast(`${a.name} stopped retrofitting. Resources refunded.`, true);
}
function stepRetrofits(t) {
  for (const a of S.units) {
    if (a.kind !== 'army') continue;
    if (a.retroWant) {
      if (a.battle || a.exiting || (a.moving && a.final !== a.retroWant.prov)) a.retroWant = null;
      else if (!a.moving) { if (a.prov === a.retroWant.prov) beginRetro(a); else a.retroWant = null; }
    }
    if (!a.retro) continue;
    if (a.moving || a.battle || a.prov !== a.retro.prov || !S.units.includes(a)) { cancelRetro(a); continue; }
    if (t - a.retro.t0 < a.retro.dur) continue;
    const to = a.retro.to; a.retro = null;
    const n = retrofitNow(a, to);
    if (a.owner === ME) { toast(`${a.name}: ${n} soldier${n === 1 ? '' : 's'} retrofitted to ${UNIT_DEFS[to].name}.`); sfx('bld_done', { prov: a.prov }); }
  }
}

// ---------- GPC15: armies rest at a Barracks to get their health back ----------
// an army has one pool of health, so resting takes 5 s for every soldier in it: 10 soldiers 50 s, 100 soldiers 500 s
const REST_TIME = 5;
const woundedUnits = a => a && a.wounds > 0.01 ? troopCount(a) : 0;
function restSite(a) {
  if (barracksOk(a.prov, a.owner, false)) return a.prov;
  let best = -1, bd = Infinity;
  for (const p of S.extras.keys()) { if (!barracksOk(p, a.owner, false)) continue; const h = findPath(a, p); if (h && h.length < bd) { bd = h.length; best = p; } }
  return best;
}
function sendToRest(a) {
  if (!woundedUnits(a)) return toast(`${a.name} isn’t hurt.`);
  const p = restSite(a);
  if (p < 0) { sfx('ui_error'); return toast('None of your Barracks can be reached.', true); }
  if (p === a.prov && !a.moving) return toast(`${a.name} is resting at the Barracks.`);
  if (order(a, p, true)) toast(`${a.name} marches to the Barracks at ${provName(p)} to rest.`);
}
function stepRest(t, dt) {
  for (const a of S.units) {
    if (a.kind !== 'army') continue;
    if (a.moving || a.battle || a.heal || !(a.wounds > 0.01) || !barracksOk(a.prov, a.owner, false)) { a.rest = null; continue; }
    if (!a.rest) a.rest = { t0: t, w0: a.wounds, dur: REST_TIME * woundedUnits(a) };
    const f = Math.min(1, (t - a.rest.t0) / a.rest.dur); a.wounds = a.rest.w0 * (1 - f);
    if (f >= 1) { a.wounds = 0; a.rest = null; if (a.owner === ME) toast(`${a.name} has rested: back to full health.`); cmdKey = ''; }
  }
}

// ---------- GPC12: an estimate of an army's strength ----------
const powerOf = a => Math.round(rawStrength([a]) * 10);
const nationPower = o => Math.round(armyPower(o) * 10);

// ---------- GPC10d: Earthquake ----------
// every Mage knows it from the start: 30 seconds of casting raise a wall (with a gate for the caster's nation) on the border
// between the Mage's province and a neighbor. The Mage must stand in land his nation controls, or in unclaimed land.
// Nations at war with the caster see an "Earthquake at …" banner while it is being cast.
const QUAKE_TIME = 30;
S.quakes = []; let quakeSeq = 0, quakeAim = false;
const controls = (p, o) => { const occ = S.occ.get(p); return occ !== undefined ? occ === o : nationOf(p) === o; };
const quakeCaster = u => u && magesIn(u) > 0;
function quakeWhy(c, q) {
  if (!quakeCaster(c)) return 'No Mage selected';
  if (q === c.prov || !allNbr[c.prov].includes(q)) return 'The Mage must stand next door';
  if (!openBetween(c.prov, q)) return 'That border is already closed';
  if (!(controls(c.prov, c.owner) || (!nationOf(c.prov) && !S.occ.has(c.prov)))) return 'Cast it from land your nation controls, or unclaimed land';
  if (c.moving) return 'Stop moving first';
  if (c.battle) return 'Not during battle';
  if (S.units.some(v => v.quake && linkKey(v.prov, v.quake.to) === linkKey(c.prov, q))) return 'An earthquake is already being cast there';
  return null;
}
function startQuake(c, q) {
  const why = quakeWhy(c, q); if (why) { if (c.owner === ME) toast('Earthquake: ' + why.toLowerCase() + '.', true); return false; }
  if (c.cast && typeof cancelCast === 'function') cancelCast(c);
  c.quake = { t0: S.t, to: q, id: ++quakeSeq };
  if (c.owner === ME) { toast(`${c.name} begins an Earthquake toward ${provName(q)}: ${QUAKE_TIME} s of casting. Moving or fighting stops it.`); sfx('mg_arcane', { prov: c.prov }); }
  else if (atWar(ME, c.owner)) { S.quakes.push({ id: c.quake.id, from: c.prov, to: q, by: c.owner }); toast(`Earthquake at ${provName(c.prov)}! A Mage of the ${PLAYERS[c.owner].name} is raising a wall.`, true); flagKey = ''; }
  cmdKey = ''; return true;
}
function endQuake(c, why) {
  if (!c.quake) return;
  const id = c.quake.id; c.quake = null; cmdKey = '';
  S.quakes = S.quakes.filter(x => x.id !== id);
  if (why && c.owner === ME) toast(why, true);
}
function stepQuakes(t) {
  for (const c of S.units) {
    if (!c.quake) continue;
    if (!quakeCaster(c)) { endQuake(c); continue; }
    if (c.moving || c.battle) { endQuake(c, `${c.name} stopped casting the Earthquake.`); continue; }
    if (t - c.quake.t0 < QUAKE_TIME) continue;
    const q = c.quake.to; endQuake(c);
    if (!openBetween(c.prov, q)) continue;
    if (raiseWall(c.prov, q, c.owner, nationOf(c.prov) === c.owner ? c.prov : -1)) {
      if (c.owner === ME) { toast(`The ground heaves: a wall rises between ${provName(c.prov)} and ${provName(q)}. Its gate lets your units through.`); sfx('war_fort_win', { vol: 0.6 }); }
      else if (S.explored.has(c.prov) || S.explored.has(q)) toast(`An earthquake raised a wall between ${provName(c.prov)} and ${provName(q)}.`, atWar(ME, c.owner));
    }
  }
  // banners only last while the caster is still at war with you
  if (S.quakes.length) S.quakes = S.quakes.filter(x => atWar(ME, x.by) && S.units.some(v => v.quake && v.quake.id === x.id));
}
// the command card button: aim, then click a neighboring province
{
  const armyGet = Object.getOwnPropertyDescriptor(CMD, 'army').get;
  Object.defineProperty(CMD, 'army', { configurable: true, get() { const a = S.selected.find(v => v.kind === 'army'); return armyGet().concat(a && isCaster(a) ? [{ id: 'quake', cell: 11, key: '' }] : []); } });
  const mageGet = Object.getOwnPropertyDescriptor(CMD, MAGE).get;
  Object.defineProperty(CMD, MAGE, { configurable: true, get() { return mageGet().concat([{ id: 'quake', cell: 14, key: '' }]); } });
}
const _extraInfo = extraCmdInfo;
extraCmdInfo = id => {
  if (id !== 'quake') return _extraInfo(id);
  const c = selCaster(), on = c && c.quake;
  const why = !c ? 'No Mage selected' : c.moving ? 'Stop moving first' : c.battle ? 'Not during battle' : null;
  return { name: on ? `Earthquake (${Math.ceil(QUAKE_TIME - (S.t - c.quake.t0))} s left)` : quakeAim ? 'Pick a province…' : 'Earthquake', desc: `Click this, then click a neighboring province: after ${QUAKE_TIME} s of casting a wall rises on that border, with a gate only your units can pass. The Mage must stand in land you control, or unclaimed land. Enemies at war with you are warned while you cast.${on ? ' Click again to stop.' : ''}`, cost: null, why: on ? null : why, ok: on ? 'Click to stop casting' : 'Click, then pick a province', icon: xIcon('quake') };
};
const _extraUse = extraCmdUse;
extraCmdUse = id => {
  if (id !== 'quake') { if (id === 'xpath') quakeAim = false; return _extraUse(id); }
  const c = selCaster(); if (!c) return true;
  if (c.quake) { endQuake(c, 'Earthquake stopped.'); return true; }
  pathAim = c; quakeAim = true; cv.style.cursor = 'crosshair'; cmdKey = '';
  toast('Click a neighboring province to raise a wall on that border. Right-click or Esc cancels.');
  return true;
};
const _pathAimClick = pathAimClick;
pathAimClick = (p, right) => {
  if (!quakeAim) return _pathAimClick(p, right);
  const c = pathAim; pathAim = null; quakeAim = false; cv.style.cursor = ''; cmdKey = '';
  if (right || p < 0 || !c) { toast('Earthquake cancelled.'); return; }
  startQuake(c, p);
};
window.addEventListener('keydown', e => { if (quakeAim && e.key === 'Escape') quakeAim = false; }, true);
// a row in the Ctrl+right-click menu too
const _magicRows = magicRows;
magicRows = (c, q) => {
  const base = _magicRows(c, q);
  if (!c || c.prov === q || !allNbr[c.prov].includes(q) || !openBetween(c.prov, q)) return base;
  const why = quakeWhy(c, q);
  const row = `<button type="button" class="bm-item" data-type="quake" ${why ? 'aria-disabled="true"' : ''}><img alt="" src="${xIcon('quake')}"><span class="bm-name">Earthquake: raise a wall toward ${provName(q)}<small>${why || QUAKE_TIME + ' s of casting · a gate for your units'}</small></span></button>`;
  return base ? base + row : '<div class="bm-sec">Magic</div>' + row;
};
menuEl.addEventListener('click', e => {
  const b = e.target.closest('[data-type="quake"]'); if (!b) return;
  e.stopImmediatePropagation(); if (b.getAttribute('aria-disabled') === 'true') return;
  const c = S.selected.find(isCaster), q = menuProv; closeBuildMenu(); if (c) startQuake(c, q);
}, true);
// the casting ring for an Earthquake
function drawQuakes(g, t) {
  for (const u of S.units) {
    if (!u.quake || !(u.owner === ME || S.visible.has(u.prov))) continue;
    const r = u.kind === 'army' ? 30 : 18, f = Math.min(1, (S.t - u.quake.t0) / QUAKE_TIME), y = u.y - (u.kind === 'army' ? 62 : 48), shake = Math.sin(t * 40) * 1.5;
    g.save(); g.translate(u.x + shake, u.y); g.scale(1, 0.45); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = '#8a6a3a'; g.setLineDash([4, 6]); g.stroke(); g.restore();
    g.beginPath(); g.arc(u.x, y, 9, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.lineWidth = 4; g.strokeStyle = '#8a6a3a'; g.stroke(); g.beginPath(); g.arc(u.x, y, 9, 0, 7); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
  }
}
// AI nations at war cast Earthquake too: a Mage army standing still in its own land walls off a border with the enemy
function aiQuake(N, t) {
  if ((N.quakeAt || 0) > t || !enemiesOf(N.id).length) return;
  if (S.units.some(v => v.owner === N.id && v.quake)) return;
  const foes = enemiesOf(N.id);
  for (const a of S.units) {
    if (a.owner !== N.id || a.kind !== 'army' || !(a.troops[MAGE] > 0) || a.moving || a.battle || a.exiting) continue;
    const q = openNbr[a.prov].map(n => n.q).find(q => foes.includes(nationOf(q)) && !quakeWhy(a, q));
    if (q === undefined) continue;
    if (startQuake(a, q)) { N.quakeAt = t + 120; return; }
  }
  N.quakeAt = t + 20;
}

// ---------- GPC07: set pieces are found by surveying, and stand in the province as a building-sized landmark ----------
// IC04: what the Wayfinder reports; %%% is his name, $$$ the province
const SP_FOUND_TEXT = {
  battlesite: '%%% has found evidence of a massive battle dating back thousands of years in $$$. Our own Forges could learn from this site.',
  library: '%%% has found the remains of a library forgotten to time in $$$. Our scholars will rejoice.',
  rift: '%%% has found a strange rift of magical origin in $$$. Our Mages could learn from the long dead spells of the Archmages of Ages past.'
};
function showSetpiecePop(p, u) {
  const id = setpieceAt(p); if (!id) return;
  S.spFound.add(p);
  const D = SETPIECES[id], el = $q('#spPop'), who = u && u.name ? u.name : 'Your Wayfinder';
  const said = (SP_FOUND_TEXT[id] || '').replace('%%%', `<b>${escHTML(who)}</b>`).replace('$$$', `<b>${escHTML(provName(p))}</b>`);
  el.innerHTML = `<h2 id="spPopT"><img class="sp-ico" alt="" src="${rpIcon(D.tree)}">Discovery!<span>${D.name} at ${escHTML(provName(p))}</span></h2><p class="sp-said">${said}</p><p>${D.blurb} While you hold this province it gives +${D.pts} ${TECH_TREES[D.tree].name} research every 10 s${D.need ? ' (you also need ' + D.need + ')' : ''}.</p><div class="dm-btns"><button type="button" data-sp="look">Show me</button><button type="button" data-sp="ok">OK</button></div>`;
  el.dataset.prov = p; el.hidden = false; sfx('wn_ally');
  const ok = el.querySelector('[data-sp="ok"]'); if (ok) ok.focus({ preventScroll: true });
}
{
  const el = $q('#spPop');
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape' || e.key === 'Enter') el.hidden = true; });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-sp]'); if (!b) return;
    if (b.dataset.sp === 'look') { const p = +el.dataset.prov, P = G.provs[p], [ox, oy] = spSpot(p); flyTo({ x: P.ic[0] + ox, y: P.ic[1] + oy, z: Math.max(cam.z, fitZ * 2.6 * WORLD_K) }); }
    el.hidden = true;
  });
}
// a fixed spot for the landmark, clear of the settlement, the building plots, the standing spots and the badges
const spSpotCache = new Map();
function spSpot(p) {
  const hit = spSpotCache.get(p); if (hit && hit.seed === world.seed) return hit.at;
  const P = G.provs[p], c = P.ic, r = rngFrom(world.seed + ':setpiece-spot:' + p), plots = []; for (let k = 0; k < BSLOTS.length; k++) plots.push(bslotOf(p, k));
  let best = null, bs = -Infinity;
  for (let tries = 0; tries < 120; tries++) {
    const a = r() * Math.PI * 2, rad = 150 + r() * 170, x = Math.cos(a) * rad, y = Math.sin(a) * rad * 0.8;
    if (!inPoly(c[0] + x, c[1] + y, P.inner)) continue;
    const edge = distToEdges(c[0] + x, c[1] + y, P.inner); if (edge < 36) continue;
    if ((x / 165) ** 2 + (y / 105) ** 2 < 1) continue;   // the settlement
    if (Math.abs(x) < 130 && y > 70 && y < 200) continue;   // the resource and set piece badges
    const dPlot = Math.min(...plots.map(([qx, qy]) => Math.hypot(qx - x, (qy - y) * 1.25))), dSlot = Math.min(...SLOTS.map(([sx, sy]) => Math.hypot(sx - x, sy - y)));
    const sc = Math.min(dPlot, 140) + Math.min(dSlot, 80) * 0.5 + Math.min(edge, 80) * 0.3;
    if (sc > bs) { bs = sc; best = [Math.round(x), Math.round(y)]; }
    if (dPlot > 110 && dSlot > 60 && edge > 60) break;
  }
  if (!best) best = [-130, -150];
  spSpotCache.set(p, { seed: world.seed, at: best }); return best;
}
function setpieceItems(g, t, items, onScreen) {
  for (const [p, id] of S.setpieces) {
    if (!S.explored.has(p) || !spKnown(p) || !onScreen(p)) continue;
    const c = G.provs[p].ic, [ox, oy] = spSpot(p), x = c[0] + ox, y = c[1] + oy;
    items.push({ y, f: () => drawSetpieceArt(g, id, x, y, t) });
  }
}
// cartoon landmarks, about the size of a province building
function drawSetpieceArt(g, id, x, y, t) {
  g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineCap = 'round';
  const ink = (w = 2.6) => { g.lineWidth = w; g.strokeStyle = OL; g.stroke(); };
  g.globalAlpha = 0.25; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 4, 46, 13, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  if (id === 'battlesite') {
    // a sandy barrow with old blades, a broken shield and bones
    g.beginPath(); g.ellipse(0, 0, 44, 15, 0, Math.PI, 0); g.lineTo(44, 0); g.ellipse(0, 0, 44, 8, 0, 0, Math.PI); g.closePath(); g.fillStyle = '#e2c487'; g.fill(); ink();
    for (const [sx, a, h] of [[-18, -0.25, 40], [6, 0.18, 46], [24, 0.4, 34]]) {
      g.save(); g.translate(sx, -6); g.rotate(a);
      g.beginPath(); g.moveTo(-2.5, 0); g.lineTo(-2.5, -h); g.lineTo(0, -h - 6); g.lineTo(2.5, -h); g.lineTo(2.5, 0); g.closePath(); g.fillStyle = '#a9a39a'; g.fill(); ink(2);
      g.beginPath(); g.moveTo(-1, -4); g.lineTo(-1, -h + 4); g.lineWidth = 1; g.strokeStyle = 'rgba(140,70,30,0.6)'; g.stroke();
      g.restore();
      g.save(); g.translate(sx, -6); g.rotate(a); g.beginPath(); g.rect(-8, -h * 0.2 - 3, 16, 4); g.fillStyle = '#8a5f3a'; g.fill(); ink(1.8); g.restore();
    }
    g.save(); g.translate(-34, -6); g.rotate(-0.5); g.beginPath(); g.ellipse(0, 0, 11, 14, 0, 0, 7); g.fillStyle = '#9a4b3a'; g.fill(); ink(2.2); g.beginPath(); g.moveTo(-2, -12); g.lineTo(3, -2); g.lineTo(-1, 6); g.lineWidth = 2; g.strokeStyle = '#e2c487'; g.stroke(); g.restore();
    g.beginPath(); g.arc(30, -4, 6.5, 0, 7); g.fillStyle = '#f3ead6'; g.fill(); ink(2); g.fillStyle = OL; g.beginPath(); g.arc(28, -5, 1.4, 0, 7); g.arc(32.5, -5, 1.4, 0, 7); g.fill();
    g.beginPath(); g.moveTo(-6, 2); g.lineTo(10, 4); g.lineWidth = 5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#f3ead6'; g.stroke();
  } else if (id === 'library') {
    // a crumbling stone library with a broken roof, columns and fallen scrolls
    g.beginPath(); g.moveTo(-38, 0); g.lineTo(-38, -44); g.lineTo(-20, -44); g.lineTo(-14, -52); g.lineTo(-4, -46); g.lineTo(8, -58); g.lineTo(20, -48); g.lineTo(38, -48); g.lineTo(38, 0); g.closePath(); g.fillStyle = '#c9c2b4'; g.fill(); ink();
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-38, -12, 76, 12);
    for (const cx of [-28, 28]) { g.beginPath(); g.rect(cx - 4, -40, 8, 40); g.fillStyle = '#e4ddcf'; g.fill(); ink(2); }
    g.beginPath(); g.moveTo(-11, 0); g.lineTo(-11, -22); g.quadraticCurveTo(0, -36, 11, -22); g.lineTo(11, 0); g.closePath(); g.fillStyle = '#3a3240'; g.fill(); ink(2.2);
    for (const [bx, by, col] of [[-18, -30, '#c8473d'], [16, -32, '#3f72d9']]) { g.beginPath(); g.rect(bx - 3, by, 6, 10); g.fillStyle = col; g.fill(); ink(1.5); }
    g.beginPath(); g.moveTo(-36, -44); g.quadraticCurveTo(-30, -30, -36, -18); g.lineWidth = 3; g.strokeStyle = '#5fae4a'; g.stroke();
    for (const [sx, sy, a] of [[-22, 4, 0.3], [20, 5, -0.4], [32, 2, 0.9]]) { g.save(); g.translate(sx, sy); g.rotate(a); g.beginPath(); g.rect(-7, -3, 14, 6); g.fillStyle = '#f3ead6'; g.fill(); ink(1.6); g.restore(); }
  } else {
    // a closed rift: a dark seam in the air, ringed by floating stones, softly glowing
    const glow = 0.55 + 0.25 * Math.sin(t * 2.2);
    g.beginPath(); g.ellipse(0, 0, 36, 11, 0, 0, 7); g.fillStyle = '#6b5b7a'; g.fill(); ink(2.2);
    g.beginPath(); g.moveTo(-26, -1); g.lineTo(-12, 2); g.lineTo(0, -2); g.lineTo(14, 3); g.lineTo(28, 0); g.lineWidth = 2; g.strokeStyle = '#2a2230'; g.stroke();
    const gr = g.createRadialGradient(0, -34, 2, 0, -34, 34); gr.addColorStop(0, `rgba(230,210,255,${glow})`); gr.addColorStop(1, 'rgba(122,85,201,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, -34, 30, 38, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(0, -66); g.quadraticCurveTo(9, -48, 3, -34); g.quadraticCurveTo(-6, -20, 0, -4); g.quadraticCurveTo(-11, -20, -5, -34); g.quadraticCurveTo(1, -48, 0, -66); g.closePath(); g.fillStyle = '#2b1d45'; g.fill(); ink(2.4);
    g.beginPath(); g.moveTo(0, -60); g.quadraticCurveTo(4, -46, 0, -34); g.lineWidth = 1.6; g.strokeStyle = `rgba(200,170,255,${glow})`; g.stroke();
    for (let k = 0; k < 4; k++) { const a = t * 0.8 + k * Math.PI / 2, sx = Math.cos(a) * 26, sy = -34 + Math.sin(a) * 9 - 4 * Math.sin(t * 1.5 + k); g.beginPath(); g.moveTo(sx - 5, sy); g.lineTo(sx, sy - 5); g.lineTo(sx + 5, sy); g.lineTo(sx, sy + 4); g.closePath(); g.fillStyle = '#8a8f9b'; g.fill(); ink(1.6); }
  }
  g.restore();
}

// ---------- GPC26: retreating armies fall back to the capital ----------
// the route goes through open borders and the army's own gates (never through a wall it would have to break), and the
// first step must be free of enemies. If the capital can't be reached, it goes to the reachable province nearest the capital,
// as far from the battle as possible.
function retreatHome(a) {
  const cap = capitalOf(a.owner), start = a.prov, prev = new Map([[start, null]]), dist = new Map([[start, 0]]), q = [start];
  while (q.length) {
    const x = q.shift();
    for (const n of pathNbr(a, x, false)) {
      const y = n.q; if (prev.has(y) || !canEnter(a, y)) continue;
      if (x === start && hostilesIn(y, a.owner).length) continue;
      prev.set(y, { a: x, m: n.m }); dist.set(y, dist.get(x) + 1); q.push(y);
    }
  }
  dist.delete(start); if (!dist.size) return null;
  let to = -1;
  if (cap >= 0 && dist.has(cap)) to = cap;
  else {
    const dc = cap >= 0 ? hopsFrom(cap, allNbr) : null; let bk = null;
    for (const [p, d] of dist) { const k0 = dc ? dc[p] : 0; if (!bk || k0 < bk[0] || (k0 === bk[0] && d > bk[1])) { bk = [k0, d]; to = p; } }
  }
  const hops = []; let c = to;
  while (c !== start) { const pr = prev.get(c); hops.unshift({ to: c, m: pr.m }); c = pr.a; }
  return { to, hops };
}
// armies falling back can't be commanded until they arrive
function stepRetreatHome(t) {
  for (const a of S.units) if (a.retreatHome && !a.moving) { a.retreatHome = false; cmdKey = ''; rosterKey = ''; }
}

// ---------- rebuilding broken walls: select the fort (or capital), at peace only, 50 wood a wall ----------
S.brokenWalls = new Map();   // linkKey -> { home, owner } of a wall broken in a siege
const REWALL_COST = { wood: 50 };
// a broken wall the player may put back: it was his, or its home province is his now
function rewallRec(p, q) {
  const r = S.brokenWalls.get(linkKey(p, q)); if (!r) return null;
  return r.owner === ME || (r.home >= 0 && nationOf(r.home) === ME) ? r : null;
}
// the broken walls of yours on this province's borders that are still open
const rewallsAt = p => allNbr[p].filter(q => rewallRec(p, q) && openBetween(p, q));
function rewallsWhy(p) {
  const n = rewallsAt(p).length;
  if (!owned(p)) return 'Not yours';
  if (S.occ.has(p)) return 'Occupied by the enemy';
  if (!n) return 'No broken walls here';
  if (warsOf(ME).length) return 'Only at peace';
  return lackText({ wood: REWALL_COST.wood * n });
}
// rebuilding takes 15 s; a war breaking out, or losing or being occupied in the province, stops it and refunds the wood
const REWALL_TIME = 15;
S.rewallJobs = new Map();   // province -> { t0, qs, paid }
function rebuildWalls(p) {
  if (S.rewallJobs.has(p)) return toast(`The walls of ${provName(p)} are already being rebuilt.`);
  const why = rewallsWhy(p); if (why) return toast('Can’t rebuild the walls: ' + why.toLowerCase() + '.', true);
  const qs = rewallsAt(p), paid = REWALL_COST.wood * qs.length; S.stock.wood -= paid;
  S.rewallJobs.set(p, { t0: S.t, qs, paid }); sfx('bld_work', { prov: p }); cmdKey = '';
  toast(`Rebuilding ${qs.length} wall${qs.length > 1 ? 's' : ''} around ${provName(p)}: ${REWALL_TIME} s (−${paid} wood).`);
}
function stepRewalls(t) {
  for (const [p, j] of [...S.rewallJobs]) {
    const stop = !owned(p) ? 'the province is no longer yours' : S.occ.has(p) ? 'the province is occupied' : warsOf(ME).length ? 'you are at war' : '';
    if (stop) { S.rewallJobs.delete(p); S.stock.wood += j.paid; cmdKey = ''; toast(`Wall rebuilding at ${provName(p)} stopped: ${stop}. Wood refunded.`, true); continue; }
    if (t - j.t0 < REWALL_TIME) continue;
    S.rewallJobs.delete(p); let n = 0;
    for (const q of j.qs) { const r = rewallRec(p, q); if (raiseWall(p, q, ME, r && r.home >= 0 && nationOf(r.home) === ME ? r.home : p)) n++; }
    if (n < j.qs.length) S.stock.wood += REWALL_COST.wood * (j.qs.length - n);
    sfx('bld_done', { prov: p }); cmdKey = '';
    toast(`${n} wall${n === 1 ? '' : 's'} rebuilt around ${provName(p)}, gates and all.`);
  }
}
// a progress bar over the settlement while its walls go back up
function drawRewalls(g, t) {
  for (const [p, j] of S.rewallJobs) if (S.visible.has(p)) drawProgress(g, { prov: p, ox: 0, oy: 0, t0: j.t0 }, t, REWALL_TIME, '#cfc8ba', 'Rebuilding walls', -120);
}
{
  const info0 = extraCmdInfo, use0 = extraCmdUse;
  extraCmdInfo = id => {
    if (id !== 'rewalls') return info0(id);
    const p = S.selProv, n = p >= 0 ? rewallsAt(p).length : 0, job = p >= 0 && S.rewallJobs.get(p);
    if (job) return { name: 'Rebuilding walls…', desc: `${Math.ceil(REWALL_TIME - (S.t - job.t0))} s left.`, cost: null, why: 'Already rebuilding', icon: xIcon('rewall') };
    return { name: 'Rebuild walls', desc: `Put back the walls broken on this province’s borders, gates and all: ${REWALL_COST.wood} wood each, ${REWALL_TIME} s${n ? ` (${n} broken: ${n * REWALL_COST.wood} wood)` : ''}. Only while you are at peace.`, cost: n ? { wood: REWALL_COST.wood * n } : REWALL_COST, why: p >= 0 ? rewallsWhy(p) : 'Nothing selected', icon: xIcon('rewall') };
  };
  extraCmdUse = id => { if (id !== 'rewalls') return use0(id); if (S.selProv >= 0) rebuildWalls(S.selProv); return true; };
}
