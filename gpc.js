
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
    if (u.kind !== WAYFINDER || u.owner === by || u.prov !== p || u.exiting || u.stealth) continue;   // a sneaking one stays put
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
// walls hold an enemy up for a good while (a Shockwave takes 2 minutes to break one)
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
    if (b.stage < 1 || !isNation(b.owner) || !techOf(b.owner, 'walls')) continue;   // forts and (Z1) capitals
    for (const n of openNbr[p].slice()) {
      const q = n.q, key = p + '>' + q; if (S.fortWalled.has(key)) continue;
      const ei = edgeBetween(p, q, null, true); if (ei >= 0 && S.paths[ei]) continue;   // forest paths and tunnels stay open
      S.fortWalled.add(key);
      if (raiseWall(p, q, b.owner, p) && b.owner === ME && S.explored.has(p)) toast(`The ${b.stage === 2 ? 'capital' : 'fort'} at ${provName(p)} raised a ${wallKind() === 'stone' ? 'stone wall' : 'palisade'} with a gate toward ${provName(q)}.`);
    }
  }
}

// ---------- GPC14 (v86): retrofitting, queued at a Barracks like training ----------
// 2 s per soldier. The army walks to the nearest building that can do it: a Barracks for infantry, a Barracks with a
// Stable for Realmling cavalry, an Ogre Cave for Ogres. There the job joins that building's training queue, so each
// building retrofits one army at a time (and trains nothing while it does). The army waits there; moving or fighting cancels it.
const RETRO_TIME = 2;   // seconds per soldier
const barracksOk = (p, o, cav) => { const l = S.extras.get(p); return !!l && nationOf(p) === o && !S.occ.has(p) && l.some(e => e.type === (cav && isSw(o) ? 'stable' : 'barracks')) && (!cav || l.some(e => e.type === 'stable')); };
const retroKey = (p, o, cav) => (cav && isSw(o) ? 'stable:' : 'barracks:') + p;
const retroSiteName = (o, cav) => cav ? (isSw(o) ? BUILD_DEFS.stable.name : `${BUILD_DEFS.barracks.name} with a ${BUILD_DEFS.stable.name}`) : BUILD_DEFS.barracks.name;
const retroWhere = o => isSw(o) ? `at one of your ${BUILD_DEFS.barracks.name}s (${UNIT_BASE.cav.name} at an ${BUILD_DEFS.stable.name})` : `at one of your ${BUILD_DEFS.barracks.name}s (${UNIT_BASE.cav.name.toLowerCase()} need a ${BUILD_DEFS.stable.name} there too)`;
// the nearest place the army can reach to retrofit to this design, or -1
function retroSite(a, to) {
  const cav = !!DSTATS[to].cav;
  if (barracksOk(a.prov, a.owner, cav)) return a.prov;
  let best = -1, bd = Infinity;
  for (const p of S.extras.keys()) { if (!barracksOk(p, a.owner, cav)) continue; const h = findPath(a, p); if (h && h.length < bd) { bd = h.length; best = p; } }
  return best;
}
// the army has arrived: pay, and join the building's queue
function beginRetro(a) {
  const w = a.retroWant; a.retroWant = null; if (!w) return false;
  const plan = retroPlan([a], w.to); if (!plan.n) return false;
  const cav = !!DSTATS[w.to].cav;
  if (!barracksOk(a.prov, a.owner, cav)) return false;
  if (!canAfford(plan.cost)) { toast(`Retrofitting ${a.name} needs ${costText(plan.cost)}.`, true); return false; }
  for (const r in plan.cost) S.stock[r] -= plan.cost[r];
  const key = retroKey(a.prov, a.owner, cav), Q = (S.queues[key] = S.queues[key] || []);
  const q = { kind: w.to, retro: true, army: a.id, n: plan.n, dur: plan.n * RETRO_TIME, paid: plan.cost, t0: null, prov: a.prov, key };
  Q.push(q); a.retro = q;
  const ahead = Q.length - 1, site = retroSiteName(a.owner, cav);
  toast(`${a.name} retrofits ${plan.n} soldier${plan.n > 1 ? 's' : ''} to ${UNIT_DEFS[w.to].name} at the ${site}: ${plan.n * RETRO_TIME} s${Object.keys(plan.cost).length ? ' (−' + costText(plan.cost) + ')' : ''}${ahead ? `, after ${ahead} job${ahead > 1 ? 's' : ''} ahead in the queue` : ''}. Moving or fighting cancels it.`);
  cmdKey = ''; capPanelKey = ''; return true;
}
// take the job out of its queue and refund it
function cancelRetro(a, quiet) {
  const q = a.retro; if (!q) return;
  a.retro = null; cmdKey = ''; capPanelKey = '';
  const Q = S.queues[q.key] || [], i = Q.indexOf(q);
  if (i < 0) return;
  Q.splice(i, 1); if (i === 0 && Q[0]) Q[0].t0 = null;
  for (const r in q.paid) S.stock[r] += q.paid[r];
  if (!quiet && a.owner === ME) toast(`${a.name} stopped retrofitting. Resources refunded.`, true);
}
// the queue reached the end of the job (called from stepTraining)
function finishRetro(q) {
  const a = S.units.find(v => v.id === q.army);
  if (!a || a.retro !== q) return;
  a.retro = null;
  const n = retrofitNow(a, q.kind);
  if (a.owner === ME) { toast(`${a.name}: ${n} soldier${n === 1 ? '' : 's'} retrofitted to ${UNIT_DEFS[q.kind].name}.`); sfx('bld_done', { prov: a.prov }); }
}
function stepRetrofits(t) {
  for (const a of S.units) {
    if (a.kind !== 'army') continue;
    if (a.retroWant) {
      if (a.battle || a.exiting || (a.moving && a.final !== a.retroWant.prov)) a.retroWant = null;
      else if (!a.moving) { if (a.prov === a.retroWant.prov) beginRetro(a); else a.retroWant = null; }
    }
    if (!a.retro) continue;
    if (!(S.queues[a.retro.key] || []).includes(a.retro)) { a.retro = null; cmdKey = ''; continue; }
    if (a.moving || a.battle || a.prov !== a.retro.prov) cancelRetro(a);
  }
  // an army that is gone (merged, destroyed) leaves its job behind: drop it with a refund
  for (const key in S.queues) {
    const Q = S.queues[key];
    for (let i = Q.length - 1; i >= 0; i--) { const q = Q[i]; if (!q.retro) continue; const a = S.units.find(v => v.id === q.army); if (a && a.retro === q) continue; Q.splice(i, 1); if (i === 0 && Q[0]) Q[0].t0 = null; for (const r in q.paid) S.stock[r] += q.paid[r]; capPanelKey = ''; }
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

// ---------- Z11 Earthquake and Z12 Shockwave (both cast by a Mage, alone or in an army) ----------
// Shockwave: every Mage knows it. Cast at a neighboring province of a nation at war with the caster: after 2 minutes
//   the single wall on that border is destroyed.
// Earthquake: a Tier III Magic research (any school). Cast while standing in a province your nation occupies:
//   after 2 minutes every building in that province is destroyed, and every wall on its borders.
// Nations at war with the caster see a warning banner while either is being cast. Moving or fighting stops the cast.
const QUAKE_TIME = 120, SHOCK_TIME = 120;
const SPELL2 = { quake: { name: 'Earthquake', time: QUAKE_TIME }, shock: { get name() { return SHOCK(); }, time: SHOCK_TIME } };
// the Swamplings' Warlocks hurl a Fireball where Realmling Mages cast a Shockwave (the same spell)
const SHOCK = (o = ME) => isSw(o) ? 'Fireball' : 'Shockwave';
S.quakes = []; let quakeSeq = 0, quakeAim = false;
const controls = (p, o) => { const occ = S.occ.get(p); return occ !== undefined ? occ === o : nationOf(p) === o; };
const quakeCaster = u => u && magesIn(u) > 0;
const hasQuake = o => techOf(o, 'earthquake');
const castBusy = c => c.quake ? 'Already casting ' + SPELL2[c.quake.kind].name : c.cast ? 'Already casting a spell' : null;
function quakeWhy(c) {
  if (!quakeCaster(c)) return 'No Mage selected';
  if (!hasQuake(c.owner)) return 'Research Earthquake (Magic Tier III) first';
  if (S.occ.get(c.prov) !== c.owner) return 'Cast it in an enemy province your army occupies';
  if (c.moving) return 'Stop moving first';
  if (c.battle) return 'Not during battle';
  if (S.units.some(v => v !== c && v.quake && v.quake.kind === 'quake' && v.prov === c.prov)) return 'An Earthquake is already being cast here';
  return null;
}
function shockWhy(c, q) {
  if (!quakeCaster(c)) return 'No Mage selected';
  if (q === c.prov || !allNbr[c.prov].includes(q)) return 'The Mage must stand next door';
  const n = nationOf(q); if (!n || !hostile(c.owner, n)) return 'Only against a province of a nation you are at war with';
  if (!wallBetween(c.prov, q)) return 'There is no wall on that border';
  if (c.moving) return 'Stop moving first';
  if (c.battle) return 'Not during battle';
  if (S.units.some(v => v.quake && v.quake.kind === 'shock' && v.quake.to !== undefined && linkKey(v.prov, v.quake.to) === linkKey(c.prov, q))) return 'A Shockwave is already being cast there';
  return null;
}
function startSpell2(c, kind, q) {
  const why = kind === 'quake' ? quakeWhy(c) : shockWhy(c, q);
  if (why) { if (c.owner === ME) toast(SPELL2[kind].name + ': ' + why.toLowerCase() + '.', true); return false; }
  if (c.cast && typeof cancelCast === 'function') cancelCast(c);
  c.quake = { kind, t0: S.t, to: q, id: ++quakeSeq };
  const where = kind === 'quake' ? provName(c.prov) : provName(q);
  if (c.owner === ME) { toast(kind === 'quake' ? `${c.name} begins an Earthquake in ${where}: ${QUAKE_TIME / 60} minutes of casting. Moving or fighting stops it.` : `${c.name} begins a ${SHOCK()} at the wall toward ${where}: ${SHOCK_TIME / 60} minutes of casting. Moving or fighting stops it.`); sfx('mg_arcane', { prov: c.prov }); }
  else if (atWar(ME, c.owner)) { S.quakes.push({ id: c.quake.id, from: c.prov, to: q, by: c.owner, kind }); toast(`${kind === 'shock' ? SHOCK(c.owner) : 'Earthquake'} at ${provName(c.prov)}! A ${isSw(c.owner) ? 'Warlock' : 'Mage'} of the ${PLAYERS[c.owner].name} is casting.`, true); flagKey = ''; }
  cmdKey = ''; return true;
}
const startQuake = c => startSpell2(c, 'quake');
const startShock = (c, q) => startSpell2(c, 'shock', q);
function endQuake(c, why) {
  if (!c.quake) return;
  const id = c.quake.id; c.quake = null; cmdKey = '';
  S.quakes = S.quakes.filter(x => x.id !== id);
  if (why && c.owner === ME) toast(why, true);
}
// Earthquake: every building in the province falls, and every wall around it
function quakeStrike(c) {
  const p = c.prov, lost = extrasIn(p).length;
  S.extras.delete(p);
  for (const k of [...S.xup.keys()]) if (+k.split('@')[0] === p) S.xup.delete(k);
  for (const v of S.units) if (v.build && v.build.prov === p && BUILD_DEFS[v.build.type]) cancelBuild(v);
  const walls = [...S.walls].filter(i => { const e = world.edges[i]; return e.a === p || e.b === p; });
  for (const i of walls) breakWall(i, null);
  territory = null; cacheDirty = true; computeIncome(); provKey = '';
  const msg = `The earth splits at ${provName(p)}: ${lost} building${lost === 1 ? '' : 's'} and ${walls.length} wall${walls.length === 1 ? '' : 's'} destroyed.`;
  if (c.owner === ME) { toast(msg); sfx('war_fort_win', { vol: 0.7 }); }
  else if (nationOf(p) === ME || S.explored.has(p)) toast(msg, nationOf(p) === ME);
}
function stepQuakes(t) {
  for (const c of S.units) {
    if (!c.quake) continue;
    if (!quakeCaster(c)) { endQuake(c); continue; }
    const k = c.quake.kind;
    if (c.moving || c.battle) { endQuake(c, `${c.name} stopped casting the ${SPELL2[k].name}.`); continue; }
    if (t - c.quake.t0 < SPELL2[k].time) continue;
    const q = c.quake.to; endQuake(c);
    if (k === 'quake') { if (!quakeWhyAt(c)) { spellFx('quake', c, c.prov); quakeStrike(c); } continue; }
    const e = wallBetween(c.prov, q), i = e ? world.edges.indexOf(e) : -1;
    if (i >= 0) spellFx(isSw(c.owner) ? 'fireball' : 'shock', c, q, e);
    if (i >= 0) { breakWall(i, c); if (c.owner === ME) toast(`The ${SHOCK()} ${isSw(ME) ? 'blasts apart' : 'shatters'} the wall between ${provName(c.prov)} and ${provName(q)}.`); }
  }
  // banners only last while the caster is still at war with you
  if (S.quakes.length) S.quakes = S.quakes.filter(x => atWar(ME, x.by) && S.units.some(v => v.quake && v.quake.id === x.id));
}
const quakeWhyAt = c => S.occ.get(c.prov) !== c.owner ? 'no longer occupied' : null;
// the command card buttons: Earthquake casts at once; Shockwave aims, then you click a neighboring province
{
  const armyGet = Object.getOwnPropertyDescriptor(CMD, 'army').get;
  Object.defineProperty(CMD, 'army', { configurable: true, get() { const a = S.selected.find(v => v.kind === 'army'); return armyGet().concat(a && isCaster(a) ? [{ id: 'shock', cell: 10, key: '' }].concat(hasQuake(ME) ? [{ id: 'quake', cell: 11, key: '' }] : []) : []); } });
  const mageGet = Object.getOwnPropertyDescriptor(CMD, MAGE).get;
  Object.defineProperty(CMD, MAGE, { configurable: true, get() { return mageGet().concat([{ id: 'shock', cell: 11, key: '' }]).concat(hasQuake(ME) ? [{ id: 'quake', cell: 14, key: '' }] : []); } });
}
const _extraInfo = extraCmdInfo;
extraCmdInfo = id => {
  if (id !== 'quake' && id !== 'shock') return _extraInfo(id);
  const c = selCaster(), on = c && c.quake && c.quake.kind === id, T = SPELL2[id].time;
  if (id === 'quake') {
    const why = !c ? 'No Mage selected' : on ? null : castBusy(c) || quakeWhy(c);
    return { name: on ? `Earthquake (${Math.ceil(T - (S.t - c.quake.t0))} s left)` : 'Earthquake', desc: `Cast it while standing in an enemy province your army occupies: after ${T / 60} minutes every building in that province is destroyed, and every wall on its borders.${on ? ' Click again to stop.' : ''}`, cost: null, why, ok: on ? 'Click to stop casting' : 'Click to cast', icon: xIcon('quake') };
  }
  const why = !c ? 'No Mage selected' : on ? null : castBusy(c) || (c.moving ? 'Stop moving first' : c.battle ? 'Not during battle' : null);
  return { name: on ? `${SHOCK()} (${Math.ceil(T - (S.t - c.quake.t0))} s left)` : quakeAim ? 'Pick a province…' : SHOCK(), desc: `Click this, then click a neighboring province of a nation you are at war with: after ${T / 60} minutes of casting the wall on that border is destroyed. Every ${UNIT_DEFS[MAGE].name} knows it.${on ? ' Click again to stop.' : ''}`, cost: null, why, ok: on ? 'Click to stop casting' : 'Click, then pick a province', icon: xIcon('shock') };
};
const _extraUse = extraCmdUse;
extraCmdUse = id => {
  if (id !== 'quake' && id !== 'shock') { if (id === 'xpath') quakeAim = false; return _extraUse(id); }
  const c = selCaster(); if (!c) return true;
  if (c.quake && c.quake.kind === id) { endQuake(c, SPELL2[id].name + ' stopped.'); return true; }
  if (id === 'quake') { startQuake(c); return true; }
  pathAim = c; quakeAim = true; cv.style.cursor = 'crosshair'; cmdKey = '';
  toast('Click a neighboring province behind an enemy wall. Right-click or Esc cancels.');
  return true;
};
const _pathAimClick = pathAimClick;
pathAimClick = (p, right) => {
  if (!quakeAim) return _pathAimClick(p, right);
  const c = pathAim; pathAim = null; quakeAim = false; cv.style.cursor = ''; cmdKey = '';
  if (right || p < 0 || !c) { toast(SHOCK() + ' cancelled.'); return; }
  startShock(c, p);
};
window.addEventListener('keydown', e => { if (quakeAim && e.key === 'Escape') quakeAim = false; }, true);
// rows in the Ctrl+right-click menu too
const _magicRows = magicRows;
magicRows = (c, q) => {
  const base = _magicRows(c, q);
  if (!c || c.prov === q || !allNbr[c.prov].includes(q) || !wallBetween(c.prov, q)) return base;
  const why = shockWhy(c, q) || castBusy(c);
  const row = `<button type="button" class="bm-item" data-type="shock" ${why ? 'aria-disabled="true"' : ''}><img alt="" src="${xIcon('shock')}"><span class="bm-name">${SHOCK()}: destroy the wall toward ${provName(q)}<small>${why || SHOCK_TIME / 60 + ' minutes of casting'}</small></span></button>`;
  return base ? base + row : '<div class="bm-sec">Magic</div>' + row;
};
menuEl.addEventListener('click', e => {
  const b = e.target.closest('[data-type="shock"]'); if (!b) return;
  e.stopImmediatePropagation(); if (b.getAttribute('aria-disabled') === 'true') return;
  const c = S.selected.find(isCaster), q = menuProv; closeBuildMenu(); if (c) startShock(c, q);
}, true);
// the casting ring
function drawQuakes(g, t) {
  for (const u of S.units) {
    if (!u.quake || !(u.owner === ME || S.visible.has(u.prov))) continue;
    const K = typeof UKK === 'number' ? UKK : 1, T = SPELL2[u.quake.kind].time, fb = u.quake.kind === 'shock' && isSw(u.owner), col = u.quake.kind === 'quake' ? '#8a6a3a' : fb ? '#ff7a2c' : '#6f8fc9';
    const r = (u.kind === 'army' ? 40 : 26) * K, f = Math.min(1, (S.t - u.quake.t0) / T), y = u.y - (u.kind === 'army' ? 80 : 60) * K, shake = Math.sin(t * 40) * 1.5;
    g.save(); g.translate(u.x + shake, u.y); g.scale(1, 0.45); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.lineWidth = 6; g.strokeStyle = OL; g.setLineDash([6, 6]); g.stroke(); g.lineWidth = 4; g.strokeStyle = col; g.stroke(); g.setLineDash([]);
    if (u.quake.kind === 'shock') for (let k = 0; k < 2; k++) { const w = ((t * 0.8 + k * 0.5) % 1); g.globalAlpha = 1 - w; g.beginPath(); g.arc(0, 0, r * (1 + w * 1.6), 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = col; g.stroke(); }
    g.restore();
    if (fb) fireOrb(g, u.x, y - 22 * K, (6 + 10 * Math.min(1, (S.t - u.quake.t0) / T)) * K, t);   // the Fireball swells as the casting goes on
    if (u.quake.kind === 'quake' && Math.sin(t * 1.7 + u.id) > 0.92) dustPuff(g, u.x + Math.sin(t * 13) * 30 * K, u.y + 6 * K, 14 * K, 0.5);   // the ground shudders now and then
    g.beginPath(); g.arc(u.x, y, 10 * K, 0, 7); g.fillStyle = 'rgba(250,241,220,0.95)'; g.fill();
    g.beginPath(); g.arc(u.x, y, 10 * K, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.lineWidth = 4.5 * K; g.strokeStyle = col; g.stroke(); g.beginPath(); g.arc(u.x, y, 10 * K, 0, 7); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
  }
}
// AI nations at war cast them too: Shockwave at an enemy wall next to a Mage army standing still; Earthquake in land they occupy
function aiQuake(N, t) {
  if ((N.quakeAt || 0) > t || !enemiesOf(N.id).length) return;
  if (S.units.some(v => v.owner === N.id && v.quake)) return;
  for (const a of S.units) {
    if (a.owner !== N.id || a.kind !== 'army' || !(a.troops[MAGE] > 0) || a.moving || a.battle || a.exiting || a.cast) continue;
    if (hasQuake(N.id) && !quakeWhy(a) && extrasIn(a.prov).length) { if (startQuake(a)) { N.quakeAt = t + 120; return; } }
    const q = allNbr[a.prov].find(q => !shockWhy(a, q));
    if (q !== undefined && startShock(a, q)) { N.quakeAt = t + 120; return; }
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
  el.innerHTML = `<button type="button" class="pop-x" data-sp="ok" aria-label="Dismiss" title="Dismiss">×</button><h2 id="spPopT"><img class="sp-ico" alt="" src="${rpIcon(D.tree)}">Discovery!<span>${D.name} at ${escHTML(provName(p))}</span></h2><p class="sp-said">${said}</p><p>${D.blurb} While you hold this province it gives +${D.pts} ${TECH_TREES[D.tree].name} research every 10 s${D.need ? ' (you also need ' + D.need + ')' : ''}.</p><div class="dm-btns"><button type="button" data-sp="look">Show me</button><button type="button" data-sp="ok">OK</button></div>`;
  el.dataset.prov = p; el.hidden = false; sfx('wn_ally');
  const ok = el.querySelector('.dm-btns [data-sp="ok"]'); if (ok) ok.focus({ preventScroll: true });
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

// ---------- v86: the moment a Fireball, Shockwave or Earthquake strikes ----------
// spellFx records it; drawSpellFx draws it over the map (it follows game time, so it pauses with the game)
const SPELL_FX_TIME = { fireball: 2.2, shock: 1.8, quake: 3 };
S.spellFx = [];
function spellFx(kind, c, q, edge) {
  let to = null;
  if (edge) { const a = world.vertices[edge.v[0]], b = world.vertices[edge.v[1]]; to = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  (S.spellFx = S.spellFx || []).push({ kind, t0: S.t, prov: c.prov, to: q, from: [c.x, c.y - 40], at: to, seed: Math.random() * 100 });
  if (kind !== 'quake' && (c.owner === ME || S.visible.has(c.prov))) sfx(kind === 'fireball' ? 'war_declare' : 'mg_arcane', { prov: c.prov });
}
function fireOrb(g, x, y, r, t) {
  const gl = g.createRadialGradient(x, y, 0, x, y, r * 3); gl.addColorStop(0, 'rgba(255,200,90,0.6)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(x, y, r * 3, 0, 7); g.fill();
  for (let k = 0; k < 5; k++) { const a = t * 6 + k * 1.26, fx = x + Math.cos(a) * r * 0.5, fy = y + Math.sin(a) * r * 0.3; g.beginPath(); g.moveTo(fx - r * 0.35, fy); g.quadraticCurveTo(fx, fy - r * 1.6, fx + r * 0.35, fy); g.fillStyle = '#ff7a2c'; g.fill(); }
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = '#ff9a3c'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, 7); g.fillStyle = '#ffe27a'; g.fill();
}
function dustPuff(g, x, y, r, a) {
  g.save(); g.globalAlpha = a;
  for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + (k - 1.5) * r * 0.7, y - (k % 2) * r * 0.4, r * (0.7 + (k % 3) * 0.2), r * 0.5, 0, 0, 7); g.fillStyle = k % 2 ? '#c8b28a' : '#b39a70'; g.fill(); }
  g.restore();
}
function drawSpellFx(g, t) {
  if (!S.spellFx || !S.spellFx.length) return;
  S.spellFx = S.spellFx.filter(F => S.t >= F.t0 && S.t - F.t0 < SPELL_FX_TIME[F.kind]);
  for (const F of S.spellFx) {
    if (!(S.visible.has(F.prov) || (F.to !== undefined && S.visible.has(F.to)))) continue;
    const e = S.t - F.t0, T = SPELL_FX_TIME[F.kind];
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    if (F.kind === 'fireball') {
      // a fireball arcs from the Warlock to the wall (first 0.9 s), then the wall bursts in flame and smoke
      const fly = 0.9, [x0, y0] = F.from, [x1, y1] = F.at;
      if (e < fly) {
        const k = e / fly, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 160;
        for (let i = 1; i <= 6; i++) { const kk = Math.max(0, k - i * 0.04), tx = x0 + (x1 - x0) * kk, ty = y0 + (y1 - y0) * kk - Math.sin(kk * Math.PI) * 160; g.globalAlpha = 0.5 - i * 0.07; g.beginPath(); g.arc(tx, ty, 30 - i * 3.5, 0, 7); g.fillStyle = i < 3 ? '#ffb347' : '#8a7a70'; g.fill(); }
        g.globalAlpha = 1; fireOrb(g, x, y, 30, t);
      } else {
        const k = (e - fly) / (T - fly), R = 80 + k * 200;
        g.globalAlpha = 1 - k;
        const gr = g.createRadialGradient(x1, y1 - 20, 0, x1, y1 - 20, R); gr.addColorStop(0, '#fff3a6'); gr.addColorStop(0.35, '#ff7a2c'); gr.addColorStop(0.7, 'rgba(200,40,20,0.6)'); gr.addColorStop(1, 'rgba(60,40,40,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x1, y1 - 20, R, 0, 7); g.fill();
        for (let i = 0; i < 9; i++) { const a = F.seed + i * 0.7, d = R * 0.8 * (0.5 + (i % 3) * 0.25); g.beginPath(); g.arc(x1 + Math.cos(a) * d, y1 - 20 + Math.sin(a) * d * 0.6 - k * 70, 16 * (1 - k) + 5, 0, 7); g.fillStyle = i % 2 ? '#ffd34d' : '#5a4d4a'; g.fill(); }
      }
    } else if (F.kind === 'shock') {
      // rings of force roll from the Mage to the wall, which cracks with a flash
      const [x0, y0] = F.from, [x1, y1] = F.at, k = e / T;
      for (let i = 0; i < 4; i++) { const kk = k * 1.6 - i * 0.18; if (kk < 0 || kk > 1) continue; const x = x0 + (x1 - x0) * kk, y = y0 + 30 + (y1 - y0 - 30) * kk; g.globalAlpha = (1 - kk) * 0.9; g.beginPath(); g.ellipse(x, y, 55 + kk * 80, (55 + kk * 80) * 0.45, 0, 0, 7); g.lineWidth = 11; g.strokeStyle = OL; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#9fc4ff'; g.stroke(); }
      if (k > 0.55) { const f = (k - 0.55) / 0.45; g.globalAlpha = 1 - f; const R = 60 + f * 170, gr = g.createRadialGradient(x1, y1 - 16, 0, x1, y1 - 16, R); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#9fc4ff'); gr.addColorStop(1, 'rgba(111,143,201,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x1, y1 - 16, R, 0, 7); g.fill();
        for (let i = 0; i < 6; i++) { const a = F.seed + i * 1.05; g.beginPath(); g.moveTo(x1, y1 - 10); g.lineTo(x1 + Math.cos(a) * 60 * (0.5 + f), y1 - 10 + Math.sin(a) * 34 * (0.5 + f)); g.lineTo(x1 + Math.cos(a + 0.3) * 110 * (0.5 + f), y1 - 10 + Math.sin(a + 0.3) * 60 * (0.5 + f)); g.lineWidth = 5; g.strokeStyle = OL; g.stroke(); } }
    } else {
      // Earthquake: cracks race out from the middle of the province, dust rises, the ground heaves
      const P = G.provs[F.prov], [cx, cy] = P.ic, k = e / T, grow = Math.min(1, e / 0.8), fade = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1, jig = Math.sin(e * 60) * 4 * (1 - k);
      g.translate(jig, 0); g.globalAlpha = fade;
      for (let i = 0; i < 7; i++) {
        let a = F.seed + i * 0.9, x = cx, y = cy, L = (110 + (i % 3) * 50) * grow;
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 6; s++) { a += Math.sin(F.seed * 3 + i * 7 + s * 5) * 0.5; x += Math.cos(a) * L / 6; y += Math.sin(a) * L / 6 * 0.55; g.lineTo(x, y); }
        g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#5a3a1e'; g.stroke();
      }
      for (let i = 0; i < 10; i++) { const a = F.seed + i * 0.63, d = (40 + (i % 4) * 30) * grow; dustPuff(g, cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d * 0.6 - k * 30, 16 + (i % 3) * 6, 0.75 * fade); }
    }
    g.restore();
  }
}
window.__v86 = { G: () => G, order: (u, q, quiet) => order(u, q, quiet), orderGroup: (q, a) => orderGroup(q, a), canEnter: (u, q, t) => canEnter(u, q, t), EXPLORE_TIME, findPath: (u, q) => findPath(u, q), computeFog: () => computeFog(), spellFx, totalPick, walkDistFrom, retroSite, beginRetro, finishRetro, trainTime: (k, q) => trainTime(k, q) };
