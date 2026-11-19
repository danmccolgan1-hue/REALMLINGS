
// ================= v106: the user's v106 list =================
// Walls and roads, lakes and the ocean out of the fog, Archers in the back row, holding land over the limit,
// diplomacy (access / trade opinion, Proclaim Enemy, Swampling growls, gifts), Develop Province, Build Outpost,
// Ogre Caves, Hisola and Taal, Army Training Orders and Patch Notes.
// Small hooks in older files: game.js (renderSettleCard hooks, q.rally / q.order in stepTraining, takeMult in applyDamage),
// govtech.js (devLimitBonus in provLimit / outpostLimit; raiseWall keeps a road inside one nation), ai.js (aiOutpostLimit).

const V106 = { t: -1 };
const v6dt = () => { const d = V106.t < 0 || S.t < V106.t ? 0 : S.t - V106.t; V106.t = S.t; return Math.min(d, 1); };
const v6style = css => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); };

// =====================================================================================================================
// 1. Walls: torn-down walls can be rebuilt from the fort or capital like broken ones; capitals always offer Rebuild walls
// =====================================================================================================================
{ const td = tearDownWall; tearDownWall = function (p, q) {
  const k = linkKey(p, q), g = S.gateOwn.get(k), had = !!wallBetween(p, q);
  td(p, q);
  if (had && !wallBetween(p, q)) S.brokenWalls.set(k, { ...(g || { home: nationOf(p) === ME ? p : nationOf(q) === ME ? q : -1, owner: ME }), torn: true });
}; }
// the Rebuild walls text now covers torn-down walls too
{ const info0 = extraCmdInfo; extraCmdInfo = id => {
  const r = info0(id);
  if (id === 'rewalls' && r && !S.rewallJobs.has(S.selProv)) r.desc = r.desc.replace('Put back the walls broken on this province’s borders', 'Put back the walls broken in a siege or torn down on this province’s borders');
  return r;
}; }

// =====================================================================================================================
// 2. Roads through a gate: two of your provinces with a wall between them can be joined by a road
// =====================================================================================================================
const walledOwn = (p, q) => !openBetween(p, q) && !!wallBetween(p, q) && owned(p) && owned(q);
{ const lw = linkWhy; linkWhy = function (type, m, q) {
  if (type !== 'road' || !m || !walledOwn(m.prov, q)) return lw(type, m, q);
  const p = m.prov;
  if (!hasTech('roads')) return 'Research Dirt Roads first';
  if (!allNbr[p].includes(q)) return 'The Mason must stand next door';
  if (m.moving) return 'He is walking';
  if (m.build) return 'He is already building';
  if (S.units.some(u => u.build && u.build.type === 'road' && linkKey(u.build.prov, u.build.to) === linkKey(p, q))) return 'Already under way';
  if (S.roads.has(linkKey(p, q))) return 'There is already a road';
  return lackText(ROAD_COST);
}; }
{ const lr = linkRows; linkRows = function (m, q) {
  let s = lr(m, q);
  if (!m || m.prov === q || !hasTech('roads') || !walledOwn(m.prov, q) || s.includes('data-type="road"')) return s;
  const why = linkWhy('road', m, q), RL = ROAD_LOOK[roadTier()];
  const row = `<button type="button" class="bm-item" data-type="road" ${why ? 'aria-disabled="true"' : ''}><span class="bm-ico">🛤</span><span class="bm-name">${RL.name[0].toUpperCase() + RL.name.slice(1)} road to ${escHTML(provName(q))}<small>${why || `Through the gate in the wall · ${ROAD_TIME} s · units move ${Math.round(ROAD_BONUS[roadTier()] * 100)}% faster`}</small></span><span class="bm-cost">${costHTML(ROAD_COST)}</span></button>`;
  if (s.includes('bm-sec')) return s.replace(/(<div class="bm-sec">[^<]*<\/div>)/, '$1' + row);
  return `<div class="bm-sec">Border with ${escHTML(provName(m.prov))}</div>` + row + s;
}; }
// a road through a walled border runs to the gate in the middle of the wall
{ const rp = roadPath; roadPath = function (p, q) {
  if (openNbr[p].some(x => x.q === q)) return rp(p, q);
  const e = wallBetween(p, q); if (!e) return rp(p, q);
  const V = world.vertices, a = V[e.v[0]], b = V[e.v[1]];
  return [G.provs[p].ic, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], G.provs[q].ic];
}; }

// =====================================================================================================================
// 3. Wall health: only one bar. The old v76 bar (on the old 400 / 1200 scale) showed under the v102 bar on every
//    damaged wall; it is switched off
// =====================================================================================================================
drawWallHp = function () {};

// =====================================================================================================================
// 4–5. Fog: a lake is uncovered once every province on its shore is explored; the ocean once every coastal province is
// =====================================================================================================================
let v6water = null;
function waterShores() {
  if (v6water && v6water.world === world) return v6water;
  const lakes = (world.lakes || []).map(l => ({ verts: new Set(l.polys.flat()), polys: l.polys, shore: new Set() }));
  const sea = new Set();
  world.provinces.forEach((P, i) => {
    for (const [a, b, lk] of P.coast) {
      if (!lk) { sea.add(i); continue; }
      for (const L of lakes) if (L.verts.has(a) || L.verts.has(b)) L.shore.add(i);
    }
  });
  return v6water = { world, lakes, sea };
}
const lakeOpen = L => L.shore.size > 0 && [...L.shore].every(p => S.explored.has(p));
const oceanOpen = () => { const W = waterShores(); return W.sea.size > 0 && [...W.sea].every(p => S.explored.has(p)); };
function waterPath(withRect, pad) {
  const V = world.vertices, W = waterShores(), path = new Path2D();
  if (withRect) { const [x0, y0, x1, y1] = G.bounds; path.rect(x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2); }
  return { path, V, W };
}
const polyInto = (path, V, poly) => { poly.forEach((v, j) => j ? path.lineTo(V[v][0], V[v][1]) : path.moveTo(V[v][0], V[v][1])); path.closePath(); };
{ const rf = renderFog; renderFog = function () {
  rf();
  if (!S.started || !world || !G || !G.bounds) return;
  const W = waterShores(), lakes = W.lakes.filter(lakeOpen), ocean = oceanOpen();
  if (!lakes.length && !ocean) return;
  const g = fctx; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); worldTx(g); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  for (const L of lakes) { const p = new Path2D(); L.polys.forEach(poly => polyInto(p, world.vertices, poly)); g.fill(p); g.lineWidth = 30; g.strokeStyle = '#000'; g.stroke(p); }
  if (ocean) {
    // everything outside the island: a huge rectangle with the island (and its lakes) cut out of it
    const { path } = waterPath(true, 30000);
    G.provs.forEach(P => { P.pts.forEach(([x, y], k) => k ? path.lineTo(x, y) : path.moveTo(x, y)); path.closePath(); });
    W.lakes.forEach(L => L.polys.forEach(poly => polyInto(path, world.vertices, poly)));
    g.fill(path, 'evenodd');
  }
  g.restore();
}; }
{ const rm = renderMiniLayer; renderMiniLayer = function () {
  rm();
  if (!S.started || !G || !G.bounds || !oceanOpen()) return;
  // the open ocean on the minimap: everything outside the island (and its lakes)
  const g = miniLayer.getContext('2d'), { k, ox, oy } = miniT, { path } = waterPath(true, 30000);
  G.provs.forEach(P => { P.pts.forEach(([x, y], j) => j ? path.lineTo(x, y) : path.moveTo(x, y)); path.closePath(); });
  waterShores().lakes.forEach(L => L.polys.forEach(poly => polyInto(path, world.vertices, poly)));
  g.save(); g.setTransform(k, 0, 0, k, ox, oy); g.fillStyle = SEA; g.fill(path, 'evenodd'); g.restore();
}; }
let v6waterSig = '';
function stepWaterFog() {
  const W = waterShores(), sig = W.lakes.map(lakeOpen).join(',') + '|' + oceanOpen();
  if (sig !== v6waterSig) { v6waterSig = sig; fogDirty = true; miniDirty = true; }
}

// =====================================================================================================================
// 6. Archers (every ranged soldier: Crossbowmen, Slingers, Archers) take 80% less damage while in the back row
// =====================================================================================================================
const RNG_BACK_DR = 0.8;
takeMult = (a, k, front) => !front && isRng(k) ? 1 / (1 - RNG_BACK_DR) : 1;

// =====================================================================================================================
// 7–8. Over the province limit: a war may win you more land than your forts hold. Every province over the limit costs
// 5 gold, 5 wood and 5 food upkeep; a flag says so
// =====================================================================================================================
const OVER_UPKEEP = 5;
const overLimit = (o = ME) => Math.max(0, provsOf(o).length - provLimit(o));
// (the peace terms no longer stop at the limit: war.js maxTake / demandMax / peaceCheck, v106)
FLAG_IMG.overlimit = bannerSVG('#c47a1e', '#8f5612', '<path d="M18 50 V28 L32 18 L46 28 V50 Z" fill="#faf1dc"/><path d="M26 50 V38 H38 V50" fill="#8a5a34"/><circle cx="46" cy="22" r="9" fill="#c43a2e"/><path d="M46 16 V23 M46 26.5 V27" stroke="#faf1dc" stroke-width="3"/>');
{ const fl = flagList; flagList = function () {
  const out = fl(); if (!S.started || S.fallen) return out;
  const n = overLimit(ME);
  if (n > 0 && !flagDismissed.has('overlimit')) out.push({ id: 'overlimit', img: 'overlimit', warn: true, n, tip: `Over your province limit: ${provsOf(ME).length} provinces, your forts hold ${provLimit(ME)}. Each province over costs ${OVER_UPKEEP} gold, ${OVER_UPKEEP} wood and ${OVER_UPKEEP} food upkeep (−${n * OVER_UPKEEP} of each now). Build or develop forts to hold more. Left-click for details, right-click to dismiss`, label: 'Over the limit' });
  return out;
}; }
$q('#nflags').addEventListener('click', e => {
  const b = e.target.closest('[data-flag="overlimit"]'); if (!b) return;
  const n = overLimit(ME);
  toast(`You hold ${provsOf(ME).length} provinces and your forts hold ${provLimit(ME)}: ${n} over the limit, −${n * OVER_UPKEEP} gold, wood and food every 10 s. Build forts, research administration or develop your forts to hold more.`, true);
});
// a war can also leave the player over the limit; the upkeep (and the leader upkeep changes below) live here
const freeExtra = (p, e) => e.freeFor !== undefined && nationOf(p) === e.freeFor;
function leaderUpkeepCut(o, troops) {
  const L = leaderOf(o); if (!L) return 0;
  let cut = 0;
  for (const k in troops) {
    const n = troops[k]; if (!n || !UNIT_DEFS[k] || !UNIT_DEFS[k].upkeep) continue;
    const f = UNIT_DEFS[k].upkeep.food || 0;
    if ((L.id === 'hisola' && isCav(k)) || (L.id === 'taal' && isOgre(k))) cut += Math.max(0, f - 3) * n;
  }
  return cut;
}
function upkeepAdjust(o, u) {
  for (const v of S.units) if (v.owner === o && v.kind === 'army') u.food -= leaderUpkeepCut(o, v.troops);
  for (const [p, b] of S.buildings) if (b.owner === o) for (const e of extrasIn(p)) if (freeExtra(p, e)) { const up = BUILD_DEFS[e.type].upkeep || {}; for (const k in up) u[k] -= up[k]; }
  if (o === ME) { const n = overLimit(ME); if (n) for (const k of RES) u[k] += OVER_UPKEEP * n; }
  for (const k of RES) u[k] = Math.max(0, u[k]);
  return u;
}
{ const up0 = upkeep; upkeep = function () { return upkeepAdjust(ME, up0()); }; }
{ const au = aiUpkeep; aiUpkeep = function (N) { return upkeepAdjust(N.id, au(N)); }; }

// =====================================================================================================================
// 9–24. Diplomacy
// =====================================================================================================================
Object.assign(DIPL, { accessOp: 25, tradeOp: 25, enemy: -300, enemyEvery: 600, shared: 50 });
function enemyState() { const D = diplState(); if (!D.enemy) D.enemy = {}; if (!D.enemyAt) D.enemyAt = {}; return D; }
const enemyOf = o => { const D = enemyState(), r = D.enemy[o]; return r && aliveNation(r.t) ? r.t : 0; };
// opinion: access you give them, Trade Networks, being proclaimed an enemy, sharing an enemy
{ const op = opinionParts; opinionParts = function (o, t) {
  const out = op(o, t); if (!NATIONS[o] || o === t || !aliveNation(t)) return out;
  const D = enemyState();
  if (D.access.some(g => g.from === t && g.to === o) && !allied(o, t)) out.push(['Grants you military access', DIPL.accessOp]);
  if (pairHas(D.trade, o, t)) out.push(['Trade Network', DIPL.tradeOp]);
  if (enemyOf(t) === o) out.push(['Proclaimed you their enemy', DIPL.enemy]);
  const eo = enemyOf(o); if (eo && eo !== t && enemyOf(t) === eo) out.push([`Shared Enemies: the ${PLAYERS[eo] ? PLAYERS[eo].name : '?'}`, DIPL.shared]);
  return out;
}; }
// Proclaim Enemy: −300 opinion from them for as long as it stands; one at a time, one proclamation every 10 minutes
function proclaimWhy(o, t) {
  const D = enemyState();
  if (o === t || !aliveNation(t)) return 'Not possible';
  if (enemyOf(o) === t) return '';
  if (enemyOf(o)) return `${o === ME ? 'You already proclaim' : 'They already proclaim'} the ${PLAYERS[enemyOf(o)].name} (renounce first)`;
  if (allied(o, t)) return 'Not your ally';
  const left = (D.enemyAt[o] ?? -1e9) + DIPL.enemyEvery - S.t; if (left > 0) return `One proclamation every ${DIPL.enemyEvery / 60} minutes: ${fmtTime(left)} left`;
  return '';
}
function proclaimEnemy(o, t) {
  const D = enemyState(); D.enemy[o] = { t, since: S.t }; D.enemyAt[o] = S.t; opDirty(); dipKey = '';
  if (o === ME) { sfx('war_declare', { vol: 0.5 }); toast(`You proclaim the ${PLAYERS[t].name} your enemy: −${-DIPL.enemy} opinion with them for as long as it stands. Nations with the same enemy like you more (+${DIPL.shared}).`); }
  else if (t === ME) { sfx('wn_enemy'); toast(`The ${PLAYERS[o].name} proclaimed you their enemy!`, true); }
}
function renounceEnemy(o) {
  const D = enemyState(), r = D.enemy[o]; if (!r) return;
  delete D.enemy[o]; opDirty(); dipKey = '';
  if (o === ME) toast(`You renounce your proclamation against the ${PLAYERS[r.t] ? PLAYERS[r.t].name : 'enemy'}.`);
  else if (r.t === ME) toast(`The ${PLAYERS[o].name} no longer proclaims you their enemy.`);
}
// Swamplings growl at anyone; a nation that isn't Swampling always takes it badly (−25)
{ const da = dxAct; dxAct = function (act, o, arg) {
  if (act === 'growl' && raceOf(o) !== 'swamp') {
    const why = growlWhy(o); if (why) { toast(why, true); sfx('ui_error'); return; }
    addMod(o, ME, 'growl', -DIPL.growl.v, DIPL.growl.dur); sfx('ui_click');
    toast(`The ${PLAYERS[o].name} aren’t Swamplings: they took that growl as a threat (−${DIPL.growl.v} opinion for ${DIPL.growl.dur / 60} minutes).`, true);
    opDirty(); return;
  }
  if (act === 'flirt' && raceOf(o) === 'swamp') return;
  if (act === 'proclaim') {
    if (enemyOf(ME) === o) { renounceEnemy(ME); return; }
    const why = proclaimWhy(ME, o); if (why) { toast(why, true); sfx('ui_error'); return; }
    proclaimEnemy(ME, o); return;
  }
  if (act === 'gift') { const before = NATIONS[o] ? NATIONS[o].stock.gold : 0, had = S.stock.gold; da(act, o, arg); if (NATIONS[o] && S.stock.gold < had) giftIntoTreasury(NATIONS[o], NATIONS[o].stock.gold - before); return; }
  return da(act, o, arg);
}; }
// gifts land in the treasury: gold over the storage limit waits in a vault and moves into storage as room opens,
// so a gift to a nation with full stores isn't lost at its next payout
function giftIntoTreasury(N, n) {
  if (!N || !(n > 0)) return;
  const cap = aiStorage(N, 'gold'), over = Math.max(0, N.stock.gold - cap);
  if (over > 0) { N.stock.gold -= over; N.giftVault = (N.giftVault || 0) + over; }
}
function stepGiftVaults() {
  for (const N of Object.values(NATIONS)) if (N.giftVault > 0 && N.alive) { const room = Math.max(0, aiStorage(N, 'gold') - N.stock.gold), m = Math.min(room, N.giftVault); N.stock.gold += m; N.giftVault -= m; }
  if (S.giftVault > 0) { const room = Math.max(0, storageCap('gold') - S.stock.gold), m = Math.min(room, S.giftVault); S.stock.gold += m; S.giftVault -= m; }
}
{ const ar = answerRequest; answerRequest = function (r, yes, quiet) {
  if (r && r.kind === 'gift' && yes) { const had = S.stock.gold; ar(r, yes, quiet); const got = S.stock.gold - had, room = storageCap('gold') - had; if (got > room && room >= 0) { S.giftVault = (S.giftVault || 0) + got - room; S.stock.gold = had + room; toast(`The gift is in your treasury: ${got - room} gold waits for room in your stores.`); } return; }
  return ar(r, yes, quiet);
}; }
// the computer nations keep to one ally; the player may have as many as will have him
{ const aw = allyWhy; allyWhy = function (a, b) {
  if ((a === ME || b === ME) && aliveNation(a) && aliveNation(b) && a !== b) {
    const o = a === ME ? b : a;
    if (raceOf(a) !== raceOf(b)) return 'Only nations of the same race can ally';
    if (allied(a, b)) return 'Already allies';
    if (treatyCount(o) >= MAX_ALLIES) return `They already have an ally`;
    if (atWar(a, b)) return 'You are at war';
    if (truceLeft(a, b) > 0) return `Truce: ${fmtTime(truceLeft(a, b))} left`;
    if (NATIONS[o] && NATIONS[o].rival === ME) return 'They see you as their rival';
    if (enemyOf(o) === ME || enemyOf(ME) === o) return 'One of you proclaims the other an enemy';
    if (opinion(o, ME) < DIPL.ally) return `Their opinion of you is ${sgn(opinion(o, ME))} (needs +${DIPL.ally})`;
    return '';
  }
  const why = aw(a, b); if (why) return why;
  if (enemyOf(a) === b || enemyOf(b) === a) return 'They proclaim each other enemies';
  return '';
}; }
// the Diplomacy page: no Flirt with Swamplings; Growl and Proclaim Enemy buttons; their proclaimed enemy and opinion of you
DX_ICON.enemy = '<path d="M10 40 L24 8 L38 40 Z" fill="#c43a2e"/><path d="M24 18 V30" stroke="#faf1dc" stroke-width="4"/><circle cx="24" cy="35" r="2.4" fill="#faf1dc" stroke="none"/>';
v6style(`.dxi-enemy{background-image:url("${dxIconURL('enemy')}")}
.dx-facts .dx-en b { color: #b2302a; }
.dx-facts .dx-en b small { color: var(--muted); font-weight: 600; }
.dx-head .dx-myen { font-weight: 700; color: #b2302a; }`);
{ const da = dxActions; dxActions = function (o) {
  let h = da(o);
  if (raceOf(o) === 'swamp') h = h.replace(/<button[^>]*data-dx="flirt"[\s\S]*?<\/button>/, '');
  if (raceOf(ME) === 'swamp' && raceOf(o) !== 'swamp') h = h.replace(/<button[^>]*data-dx="growl"[\s\S]*?<\/button>/, dxActBtn('growl', 'growl', 'Growl', growlWhy(o), `They aren’t Swamplings: always −${DIPL.growl.v} opinion for ${DIPL.growl.dur / 60} min`));
  const mine = enemyOf(ME) === o;
  const btn = mine ? dxActBtn('proclaim', 'enemy', 'Renounce enemy', '', `Lift your proclamation: their −${-DIPL.enemy} opinion goes away`)
    : dxActBtn('proclaim', 'enemy', 'Proclaim Enemy', proclaimWhy(ME, o), `${DIPL.enemy} opinion with them while it stands; +${DIPL.shared} with nations who share the enemy. One at a time, one every ${DIPL.enemyEvery / 60} min`, ' war');
  return h.replace('<div class="dx-acts">', '<div class="dx-acts">' + btn);
}; }
{ const df = dxFacts; dxFacts = function (o) {
  const h = df(o), e = enemyOf(o), op = opinion(o, ME);
  const rows = `<div data-op="${o}"><span>Opinion of you</span><b>${sgnHTML(op)}</b></div><div class="dx-en"><span>Proclaimed enemy</span><b>${e ? escHTML(e === ME ? 'You' : PLAYERS[e].name) : '<small>None</small>'}</b></div>`;
  return h.replace('<div class="dx-facts">', '<div class="dx-facts">' + rows);
}; }
{ const dp = dxPanelHTML; dxPanelHTML = function () {
  const h = dp(), e = enemyOf(ME);
  return e ? h.replace('· hover a nation', `· <span class="dx-myen">your proclaimed enemy: the ${escHTML(PLAYERS[e].name)}</span> · hover a nation`) : h;
}; }
// the computer nations proclaim enemies
// · a candidate borders it, or both border the same stretch of unclaimed land, and it has met them
// · it must dislike them (negative opinion); the most disliked is picked; on a tie, another race first, then the most dangerous
// · one at a time, one every 10 minutes; it renounces when the enemy falls, is no longer a neighbor, or is no longer disliked
function wildsShared() {
  if (V106.wildsT === Math.floor(S.t / 5) && V106.wilds) return V106.wilds;
  // unclaimed land in connected stretches, and the nations each stretch touches
  const comp = new Map(), touch = [];
  const free = p => !S.buildings.has(p) && !world.provinces[p].sealed;
  for (let p = 0; p < world.provinces.length; p++) {
    if (!free(p) || comp.has(p)) continue;
    const id = touch.length, set = new Set(), stack = [p]; comp.set(p, id);
    while (stack.length) { const x = stack.pop(); for (const q of allNbr[x]) { if (free(q)) { if (!comp.has(q)) { comp.set(q, id); stack.push(q); } } else { const o = nationOf(q); if (o) set.add(o); } } }
    touch.push(set);
  }
  V106.wildsT = Math.floor(S.t / 5); return V106.wilds = touch;
}
const sharesWilds = (a, b) => wildsShared().some(s => s.has(a) && s.has(b));
const enemyNeighbor = (o, t) => aliveNation(t) && hasMet(o, t) && (nationsBorder(o, t) || sharesWilds(o, t));
function aiPickEnemy(N) {
  const o = N.id, cands = liveNations().filter(t => t !== o && !allied(o, t) && enemyNeighbor(o, t) && opinion(o, t) < 0);
  if (!cands.length) return 0;
  cands.sort((x, y) => opinion(o, x) - opinion(o, y) || (raceOf(y) !== raceOf(o)) - (raceOf(x) !== raceOf(o)) || nationPower(y) - nationPower(x));
  return cands[0];
}
function aiEnemyThink(N) {
  if (!N.alive || (N.v106en || 0) > S.t) return;
  N.v106en = S.t + 20 + Math.random() * 10;
  const o = N.id, cur = enemyOf(o);
  if (cur && (!enemyNeighbor(o, cur) || opinion(o, cur) >= 0 || allied(o, cur))) { renounceEnemy(o); return; }
  if (enemyState().enemy[o] && !cur) { delete enemyState().enemy[o]; opDirty(); }
  const pick = aiPickEnemy(N); if (!pick || pick === cur) return;
  if (cur && opinion(o, pick) > opinion(o, cur) - 100) return;   // switching takes a clearly worse foe
  if (proclaimWhy(o, pick) && !(cur && proclaimWhy(o, pick).includes('renounce first'))) return;
  const D = enemyState(); if ((D.enemyAt[o] ?? -1e9) + DIPL.enemyEvery > S.t) return;
  if (cur) renounceEnemy(o);
  proclaimEnemy(o, pick);
  if (pick !== ME && o !== ME && (knows(o) || knows(pick)) && S.met.has(o)) toast(`The ${PLAYERS[o].name} proclaimed the ${PLAYERS[pick].name} their enemy.`);
}
// the player's own proclamation ends with the enemy
function stepEnemies() {
  const D = enemyState();
  for (const k of Object.keys(D.enemy)) { const r = D.enemy[k]; if (!aliveNation(+k) || !aliveNation(r.t)) { delete D.enemy[k]; opDirty(); } }
  for (const N of Object.values(NATIONS)) if (N.alive) aiEnemyThink(N);
}

// =====================================================================================================================
// 25. Develop Province
// =====================================================================================================================
const DEV = { max: 3, cost: [300, 400, 500], time: 300, deep: 0.05, deepGold: 5, luck: 0.25, houses: 3 };
const devCost = lv => ({ gold: DEV.cost[lv], wood: DEV.cost[lv], food: DEV.cost[lv] });
function devMap() { if (!(S.devel instanceof Map)) S.devel = new Map(); return S.devel; }
function devRec(p, make) {
  const M = devMap(); let r = M.get(p);
  if (!r && make) { r = { lv: 0, add: { gold: 0, wood: 0, food: 0 }, luck: {}, deep: false, owner: nationOf(p), job: null }; M.set(p, r); }
  return r || null;
}
const devLv = p => { const r = devRec(p); return r ? r.lv : 0; };
const devJob = p => { const r = devRec(p); return r && r.job ? r.job : null; };
// hostile soldiers standing in the province stall the work
const devStalled = (p, o) => S.occ.has(p) || S.units.some(v => v.kind === 'army' && v.prov === p && troopCount(v) > 0 && hostile(v.owner, o));
function devWhy(p, o = ME) {
  const b = S.buildings.get(p);
  if (!b) return 'Needs an outpost, fort or capital';
  if (b.owner !== o) return 'Not yours';
  const r = devRec(p), lv = r ? r.lv : 0;
  if (lv >= DEV.max) return `Fully developed (${DEV.max}/${DEV.max})`;
  if (r && r.job) return 'Already developing';
  if (S.occ.has(p)) return 'Occupied by the enemy';
  if (o === ME) return lackText(devCost(lv));
  const st = stockOf(o), c = devCost(lv); return Object.keys(c).some(k => st[k] < c[k]) ? 'Not enough resources' : '';
}
function startDevelop(p, o = ME) {
  const why = devWhy(p, o); if (why) { if (o === ME) toast('Can’t develop ' + provName(p) + ': ' + why.charAt(0).toLowerCase() + why.slice(1) + '.', true); return false; }
  const r = devRec(p, true), c = devCost(r.lv), st = stockOf(o);
  for (const k in c) st[k] -= c[k];
  r.owner = o; r.job = { done: 0, paid: c, by: o };
  if (o === ME) { sfx('bld_work', { prov: p }); toast(`Developing ${provName(p)} to level ${r.lv + 1}: ${DEV.time / 60} minutes (−${costText(c)}). Hostile soldiers in the province stall the work.`); computeIncome(); }
  cmdKey = ''; provKey = ''; return true;
}
function finishDevelop(p) {
  const r = devRec(p); if (!r) return;
  r.job = null; r.lv = Math.min(DEV.max, r.lv + 1);
  const y = yields[p], L = r.lv, gain = [];
  for (const k of RES) { y[k] += 1; r.add[k] += 1; }
  // a lucky find: decided the first time this level is ever reached, and the same every time after
  if (!(L in r.luck)) r.luck[L] = Math.random() < DEV.luck ? RES[Math.floor(Math.random() * RES.length)] : null;
  if (r.luck[L]) { y[r.luck[L]] += 1; r.add[r.luck[L]] += 1; gain.push(`+1 more ${r.luck[L]}`); }
  let deep = false;
  if (!r.deep && Math.random() < DEV.deep) { r.deep = deep = true; y.deposit = true; }
  const o = nationOf(p);
  if (o === ME) {
    if (!S.surveyed.has(p)) S.surveyed.set(p, S.t); sfx('bld_done', { prov: p });
    toast(`${provName(p)} is developed to level ${L}: +1 gold, wood and food${gain.length ? ', and a lucky ' + gain.join(', ') : ''}.${deep ? ` A Deep Gold Deposit was found! A Gold Mine here gives ${DEV.deepGold} more gold.` : ''}`);
    computeIncome();
  } else if (NATIONS[o]) NATIONS[o].income = aiIncome(NATIONS[o]);
  townSig = ''; cmdKey = ''; provKey = ''; rosterKey = ''; V106.houseSig = '';
}
function resetDevelop(p, r, why, lost) {
  const y = yields[p], was = r.lv;
  for (const k of RES) { y[k] = Math.max(0, y[k] - r.add[k]); r.add[k] = 0; }
  r.lv = 0;
  if (lost) { r.job = null; r.owner = nationOf(p); }   // the province changed hands: the work is lost with it
  V106.houseSig = ''; provKey = ''; cmdKey = ''; townSig = '';
  const mine = r.prevOwner === ME || nationOf(p) === ME;
  if (was && (mine || S.visible.has(p))) toast(`${provName(p)} lost its development (level ${was}): ${why}.`, mine);
  if (mine) computeIncome();
}
function stepDevelop(dt) {
  for (const [p, r] of devMap()) {
    const o = nationOf(p);
    if (!r.lv && !r.job) { r.owner = o; continue; }
    if (o !== r.owner) { r.prevOwner = r.owner; resetDevelop(p, r, 'it changed hands', true); continue; }
    if (r.lv > 0 && S.occ.has(p)) { r.prevOwner = r.owner; resetDevelop(p, r, 'it was occupied', false); }
    if (!r.job || !dt) continue;
    if (devStalled(p, o)) { r.job.stall = true; continue; }
    r.job.stall = false; r.job.done += dt;
    if (r.job.done >= DEV.time) finishDevelop(p);
  }
}
// a Deep Gold Deposit: a Gold Mine there gives 5 more gold
{ const eb = extrasBonus; extrasBonus = function (p) { const y = eb(p), r = devRec(p); if (r && r.deep && extrasIn(p).some(e => e.type === 'goldmine')) y.gold += DEV.deepGold; return y; }; }
{ const ap = aiProvIncome; aiProvIncome = function (N, p, b) { const y = ap(N, p, b), r = devRec(p); if (r && r.deep && extrasIn(p).some(e => e.type === 'goldmine')) y.gold += DEV.deepGold; return y; }; }
// developed forts and capitals hold more provinces: one per level
devLimitBonus = o => { let n = 0; if (!(S.devel instanceof Map)) return 0; for (const [p, r] of S.devel) { const b = S.buildings.get(p); if (r.lv && b && b.owner === o && b.stage >= 1) n += r.lv; } return n; };
// the work shows as a bar over the settlement
function drawDevelop(g, t) {
  for (const [p, r] of devMap()) {
    if (!r.job || !S.visible.has(p)) continue;
    drawProgress(g, { prov: p, ox: 0, oy: 0, t0: S.t - r.job.done }, S.t, DEV.time, r.job.stall ? '#c9a14a' : '#7ac74f', r.job.stall ? `Level ${r.lv + 1}: stalled` : `Developing · level ${r.lv + 1}`, -150);
  }
}
// three houses around the settlement for every level
{ const sy = syncTowns; syncTowns = function () {
  sy();
  const sig = [...devMap()].map(([p, r]) => p + ':' + r.lv).join(',') + '|' + S.houses.size;
  if (sig === V106.houseSig) return; V106.houseSig = sig;
  for (const k of [...S.houses.keys()]) if (k.includes('@d')) { const p = +k.split('@')[0], lv = +k.split('@d')[1]; if (devLv(p) < lv) { S.houses.delete(k); S.civs = S.civs.filter(cv => cv.key !== k); } }
  for (const [p, r] of devMap()) for (let L = 1; L <= r.lv; L++) {
    const key = p + '@d' + L; if (S.houses.has(key)) continue;
    const taken = []; for (const [k2, hs] of S.houses) if (+k2.split('@')[0] === p) taken.push(...hs);
    const hs = devHousePlace(p, L, DEV.houses, taken); hs.type = 'dev';
    let ord = taken.length; for (const h of hs) { h.born = S.t; h.prov = p; h.n = ord++; }
    S.houses.set(key, hs);
    const rr = rngFrom(world.seed + ':devciv:' + key);
    for (const h of hs) S.civs.push({ key, prov: p, home: h, x: G.provs[p].ic[0] + h.x, y: G.provs[p].ic[1] + h.y + 6, tx: null, ty: null, wait: 1 + rr() * 4, ph: rr() * 6, col: CIV_TUNIC[Math.floor(rr() * CIV_TUNIC.length)], skin: CIV_SKIN[Math.floor(rr() * CIV_SKIN.length)], hat: rr() < 0.45 ? (rr() < 0.5 ? 'straw' : 'hood') : null, sack: rr() < 0.3, born: h.born + 0.6, moving: false });
  }
  V106.houseSig = [...devMap()].map(([p, r]) => p + ':' + r.lv).join(',') + '|' + S.houses.size;
}; }
function devHousePlace(p, L, n, taken) {
  const P = G.provs[p], c = P.ic, r = rngFrom(world.seed + ':devhouses:' + p + ':' + L), out = [];
  const plots = []; for (let k = 0; k < BSLOTS.length; k++) plots.push(bslotOf(p, k));
  for (let i = 0; i < n; i++) for (let tries = 0; tries < 120; tries++) {
    const a = r() * Math.PI * 2, rad = 150 + r() * 120 + tries, x = Math.cos(a) * rad, y = Math.sin(a) * rad * 0.75;
    if (!inPoly(c[0] + x, c[1] + y, P.inner) || distToEdges(c[0] + x, c[1] + y, P.inner) < 26) continue;
    if ((x / 150) ** 2 + (y / 92) ** 2 < 1) continue;
    if (plots.some(([qx, qy]) => Math.hypot(qx - x, (qy - y) * 1.25) < 58)) continue;
    if (SLOTS.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 34)) continue;
    if (Math.abs(x) < 120 && y > 80 && y < 185) continue;
    if (taken.concat(out).some(h => Math.hypot(h.x - x, (h.y - y) * 1.3) < 30)) continue;
    out.push({ x: Math.round(x), y: Math.round(y), v: Math.floor(r() * HOUSE_LOOKS.length) }); break;
  }
  return out;
}
// the command card of a selected outpost, fort or capital: Develop further on W (cell 1)
let devIco = null;
function devIcon() {
  if (devIco) return devIco;
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  const blk = (x, y, w, h, col) => { g.beginPath(); g.rect(x, y, w, h); g.fillStyle = col; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); };
  blk(14, 50, 22, 26, '#e7dcc4'); blk(38, 38, 22, 38, '#d8c9a8'); blk(62, 54, 14, 22, '#e7dcc4');
  for (const [x, y, w] of [[12, 50, 26], [36, 38, 26], [60, 54, 18]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + w / 2, y - 12); g.lineTo(x + w, y); g.closePath(); g.fillStyle = '#c4533a'; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); }
  g.beginPath(); g.moveTo(66, 30); g.lineTo(66, 8); g.moveTo(56, 18); g.lineTo(66, 8); g.lineTo(76, 18); g.lineWidth = 11; g.strokeStyle = OL; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#5ab04a'; g.stroke();
  return devIco = c.toDataURL();
}
const devDesc = (p, lv) => `Level ${lv}/${DEV.max}. Develop to level ${lv + 1}: +1 gold, wood and food from the land${lv === 0 ? '' : ''}, three new houses, and a ${DEV.luck * 100}% chance of one more resource (decided the first time each level is reached). ${DEV.deep * 100}% chance of a Deep Gold Deposit (a Gold Mine there gives ${DEV.deepGold} more gold). In a fort or capital each level holds one more province. ${DEV.time / 60} minutes; hostile soldiers stall it, and an occupation resets the province to level 0.`;
{ const info0 = extraCmdInfo, use0 = extraCmdUse;
  extraCmdInfo = id => {
    if (id !== 'develop') return info0(id);
    const p = S.selProv, r = p >= 0 ? devRec(p) : null, lv = r ? r.lv : 0, job = r && r.job;
    if (job) return { name: `Developing to level ${lv + 1}…`, desc: `${fmtTime(DEV.time - job.done)} left${job.stall ? ' (stalled: hostile soldiers in the province)' : ''}.`, cost: null, why: 'Already developing', icon: devIcon() };
    if (lv >= DEV.max) return { name: 'Fully developed', desc: `Level ${DEV.max}/${DEV.max}: +${r.add.gold} gold, +${r.add.wood} wood, +${r.add.food} food from development.`, cost: null, why: 'Fully developed', icon: devIcon() };
    return { name: 'Develop further', desc: devDesc(p, lv), cost: devCost(lv), why: p >= 0 ? devWhy(p) : 'Nothing selected', icon: devIcon() };
  };
  extraCmdUse = id => { if (id !== 'develop') return use0(id); if (S.selProv >= 0) startDevelop(S.selProv); return true; };
}
settleCardKeyX = p => { const r = devRec(p); return (r ? r.lv + ':' + !!r.job + ':' + (r.job && r.job.stall) : '0') + ':' + devWhy(p); };
settleCardCells = (p, b, cells) => {
  const info = cmdInfo('develop'), job = devJob(p);
  cells[1] = `<button type="button" class="cmd-btn${info.why && !job ? ' off' : ''}" data-cmd="develop" aria-label="${info.name}"><img alt="" src="${info.icon}">${job ? '<i class="cmd-prog"><s></s></i>' : ''}</button>`;
};
settleCardTick = p => { const job = devJob(p), bar = $q('#cmdGrid [data-cmd="develop"] .cmd-prog s'); if (bar && job) bar.style.width = Math.min(100, job.done / DEV.time * 100) + '%'; if (job && cmdHover === 'develop') showCmdTip('develop'); };
// the province menu: the development level, Develop Province, and Build Outpost on unclaimed land
function outpostBtnWhy(p) {
  if (S.buildings.has(p)) return 'Already has a settlement';
  if (overLimit(ME) > 0 || provsOf(ME).length >= provLimit(ME)) return `Province limit reached (${provsOf(ME).length}/${provLimit(ME)})`;
  if (S.units.some(u => u.owner === ME && ((u.build && u.build.type === 'outpost' && u.build.prov === p) || (u.pending && u.pending.type === 'outpost' && u.pending.prov === p)))) return 'A Mason is already on it';
  const m = nearestMason(p); if (!m) return `No free ${UNIT_DEFS[MASON].name}`;
  return buildCheck(p, 'outpost') || '';
}
function provDevHTML(p) {
  const b = S.buildings.get(p), vis = S.visible.has(p);
  if (!b) {
    if (!vis && !S.explored.has(p)) return '';
    const why = outpostBtnWhy(p), m = nearestMason(p);
    return `<div class="pm-dev"><button type="button" class="pm-devbtn${why ? ' off' : ''}" data-pmx="outpost"${why ? ' aria-disabled="true"' : ''} title="${escHTML(why || `Send ${m ? m.name : 'a ' + UNIT_DEFS[MASON].name} to build an outpost here`)}"><img alt="" src="${buildThumb('outpost')}"><span><b>Build Outpost</b><small>${escHTML(why || (m ? (m.prov === p ? m.name + ' is here' : 'Sends ' + m.name + ', the closest') : ''))}</small><i class="pm-devc">${costHTML(OUTPOST_COST)}</i></span></button></div>`;
  }
  const r = devRec(p), lv = r ? r.lv : 0, job = r && r.job;
  const pips = Array.from({ length: DEV.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
  let row = `<div class="pm-dev"><div class="pm-devlv" title="${r && lv ? `From development: +${r.add.gold} gold, +${r.add.wood} wood, +${r.add.food} food` : 'Not developed yet'}${r && r.deep ? ' · Deep Gold Deposit' : ''}">Development <b>Level ${lv}/${DEV.max}</b><span class="pm-pips">${pips}</span>${r && r.deep ? '<span class="pm-tag gold">Deep Gold</span>' : ''}</div>`;
  if (b.owner === ME) {
    if (job) row += `<div class="pm-devbtn busy"><img alt="" src="${devIcon()}"><span><b>Developing to level ${lv + 1}</b><small>${job.stall ? 'Stalled: hostile soldiers here' : fmtTime(DEV.time - job.done) + ' left'}</small><em><s style="width:${(job.done / DEV.time * 100).toFixed(1)}%"></s></em></span></div>`;
    else if (lv < DEV.max) { const why = devWhy(p); row += `<button type="button" class="pm-devbtn${why ? ' off' : ''}" data-pmx="develop"${why ? ' aria-disabled="true"' : ''} title="${escHTML(why || devDesc(p, lv))}"><img alt="" src="${devIcon()}"><span><b>Develop Province</b><small>${escHTML(why || `To level ${lv + 1}: +1 of each resource · ${DEV.time / 60} min`)}</small><i class="pm-devc">${costHTML(devCost(lv))}</i></span></button>`; }
  }
  return row + '</div>';
}
{ const pm = provMenu; provMenu = function () {
  const p = S.selProv;
  const k = p >= 0 ? [p, devLv(p), devJob(p) ? Math.floor(devJob(p).done) + ':' + devJob(p).stall : '-', devWhy(p), S.buildings.has(p) ? '' : outpostBtnWhy(p), freeMasons().length].join('|') : '';
  if (k !== V106.pmKey) { V106.pmKey = k; provKey = ''; }
  pm();
  const el = $q('#prov'); if (el.hidden || p < 0 || el.querySelector('.pm-dev')) return;
  const html = provDevHTML(p); if (!html) return;
  const res = el.querySelector('.pm-res'); if (res) res.insertAdjacentHTML('afterend', html);
}; }
$q('#prov').addEventListener('click', e => {
  const b = e.target.closest('[data-pmx]'); if (!b) return;
  e.stopPropagation();
  const p = S.selProv; if (p < 0) return;
  if (b.getAttribute('aria-disabled') === 'true') { toast(b.title, true); return; }
  sfx('ui_click');
  if (b.dataset.pmx === 'develop') startDevelop(p);
  else if (b.dataset.pmx === 'outpost') { const m = nearestMason(p); if (m && !outpostBtnWhy(p)) { m.surveyQueue = []; orderBuild(m, p, 'outpost'); } }
  provKey = ''; V106.pmKey = '';
}, true);
v6style(`.pm-dev { display: flex; flex-direction: column; gap: 4px; margin: 6px 0 2px; }
.pm-devlv { display: flex; align-items: center; gap: 6px; font: 700 12px var(--font-ui); color: var(--muted); }
.pm-devlv b { color: var(--ink); }
.pm-pips { display: inline-flex; gap: 3px; }
.pm-pips i { width: 10px; height: 10px; border: 1px solid var(--ink); background: #eef2f7; transform: rotate(45deg); display: inline-block; }
.pm-pips i.on { background: #7ac74f; }
.pm-devbtn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 4px 6px; border: 1px solid var(--ink); background: #f6f1e4; cursor: pointer; text-align: left; font: 700 12px var(--font-ui); color: var(--ink); }
.pm-devbtn:hover { background: #fff7dd; }
.pm-devbtn.off { opacity: .6; cursor: not-allowed; }
.pm-devbtn.busy { cursor: default; }
.pm-devbtn img { width: 30px; height: 30px; flex: none; }
.pm-devbtn span { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.pm-devbtn small { font-weight: 600; color: var(--muted); font-size: 11px; }
.pm-devbtn em { display: block; height: 5px; background: #e3e7ee; margin-top: 3px; }
.pm-devbtn em s { display: block; height: 100%; background: #7ac74f; text-decoration: none; }
.pm-devc { display: flex; align-items: center; gap: 6px; font: 700 11px var(--font-ui); font-style: normal; margin-top: 2px; flex-wrap: wrap; }
.pm-devc img { width: 14px !important; height: 14px !important; vertical-align: middle; }
.pm-devc * { font-size: 11px !important; }`);
// the computer nations develop only when they can't do anything else: no land to settle, no free plot,
// no food to feed more soldiers, and resources to spare
function aiDevelop(N) {
  if (!N.alive || (N.v106dev || 0) > S.t) return;
  N.v106dev = S.t + 30 + Math.random() * 15;
  const st = aiStage(N); if (!st.full) return;
  const mine = provsOf(N.id).filter(p => !S.occ.has(p));
  if (mine.some(p => freePlot(p) >= 0)) return;                        // can still build
  if ((N.income || aiIncome(N)).food >= 1) return;                     // can still train soldiers without going under
  if ([...devMap().values()].some(r => r.job && r.owner === N.id)) return;   // one at a time
  const ok = mine.filter(p => !devWhy(p, N.id));
  if (!ok.length) return;
  const lv0 = Math.min(...ok.map(devLv)), c = devCost(lv0);
  if (Object.keys(c).some(k => N.stock[k] < c[k] + 200)) return;     // only with resources to spare
  ok.sort((a, b) => devLv(a) - devLv(b) || S.buildings.get(b).stage - S.buildings.get(a).stage);
  startDevelop(ok[0], N.id);
}

// =====================================================================================================================
// 39. (Build Outpost: above, with the province menu)
// 40. Ogre Caves stand against the mountains: the cave's plot moves next to a mountain border of its province
// =====================================================================================================================
const caveSpotCache = new Map();
function caveSpot(p) {
  const key = world.seed + ':' + p; if (caveSpotCache.has(key)) return caveSpotCache.get(key);
  const P = G.provs[p], c = P.ic, V = world.vertices, out = [];
  for (const e of world.edges) {
    if (e.style !== 'mountains' || (e.a !== p && e.b !== p)) continue;
    const a = V[e.v[0]], b = V[e.v[1]];
    for (const f of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      const mx = a[0] + (b[0] - a[0]) * f, my = a[1] + (b[1] - a[1]) * f, dx = c[0] - mx, dy = c[1] - my, L = Math.hypot(dx, dy) || 1;
      for (let d = 70; d < Math.min(L, 320); d += 10) {
        const x = mx + dx / L * d, y = my + dy / L * d;
        if (!inPoly(x, y, P.inner) || distToEdges(x, y, P.inner) < 40) continue;
        const ox = x - c[0], oy = y - c[1];
        if ((ox / 150) ** 2 + (oy / 92) ** 2 < 1) continue;
        if (SLOTS.some(([sx, sy]) => Math.hypot(sx - ox, sy - oy) < 44)) continue;
        if (Math.abs(ox) < 100 && oy > 84 && oy < 170) continue;
        out.push({ pos: [Math.round(ox), Math.round(oy)], d }); break;
      }
    }
  }
  out.sort((u, v) => u.d - v.d);
  const pick = out.length ? out[0].pos : null;
  caveSpotCache.set(key, pick); return pick;
}
const bslotBase = bslotOf;
V106.caveSites = new Set();
const isCaveAt = (p, slot) => {
  if (V106.caveSites.has(p + '@' + slot)) return true;
  const l = S.extras.get(p); if (!l || !l.some(e => e.slot === slot && e.type === 'stable')) return false;
  const o = nationOf(p); return !!o && raceOf(o) === 'swamp';
};
// building sites and Swampwrights on their way to build a cave, refreshed every frame (the site is drawn at the cave's spot too)
function stepCaveSites() {
  const set = new Set();
  for (const u of S.units) {
    const b = u.build && u.build.type === 'stable' ? u.build : u.pending && u.pending.type === 'stable' ? u.pending : null;
    if (!b || b.slot === undefined || raceOf(u.owner) !== 'swamp') continue;
    set.add(b.prov + '@' + b.slot);
  }
  V106.caveSites = set;
  for (const u of S.units) if (u.build && u.build.type === 'stable' && !u.build.v106 && raceOf(u.owner) === 'swamp') { const [x, y] = bslotOf(u.build.prov, u.build.slot); u.build.ox = x; u.build.oy = y; u.build.v106 = true; }
}
bslotOf = function (p, slot) {
  const base = bslotBase(p, slot);
  if (!G || !G.provs || !G.provs[p] || !S.extras) return base;
  if (!isCaveAt(p, slot)) return base;
  const sp = caveSpot(p); if (!sp) return base;
  // keep clear of the province's other buildings
  for (const e of extrasIn(p)) if (e.slot !== slot) { const q = bslotBase(p, e.slot); if (Math.hypot(q[0] - sp[0], (q[1] - sp[1]) * 1.3) < 70) return base; }
  return sp;
};
// a cave built with no Mason (Taal's start) has no build site: place it at once
// =====================================================================================================================
// 41. Ogre Caves in the Armies tab: "Build an Ogre Cave" sends the nearest Swampwright to the best spot
// =====================================================================================================================
function caveBuildPick() {
  if (!isSw(ME)) return { why: 'Swamplings only' };
  if (!hasTech('stable')) return { why: `Research ${TECH_BY_ID.stable ? TECH_BY_ID.stable.name.replace('Building: ', '') : 'the Ogre Cave'} first` };
  const cands = myProvs().filter(p => !S.occ.has(p) && mountainBorder(p));
  if (!cands.length) return { why: 'None of your provinces has a mountain border' };
  let best = null, why = '';
  for (const p of cands) { const w = buildCheck(p, 'stable'); if (w) { why = why || w; continue; } const m = nearestMason(p); if (!m) { why = `No free ${UNIT_DEFS[MASON].name}`; continue; } const d = m.prov === p ? 0 : Math.hypot(G.provs[m.prov].ic[0] - G.provs[p].ic[0], G.provs[m.prov].ic[1] - G.provs[p].ic[1]); if (!best || d < best.d) best = { p, m, d }; }
  return best ? { p: best.p, m: best.m } : { why: why || 'Nowhere to build one' };
}
{ const cs = cavesSec; cavesSec = function () {
  const h = cs(); if (!isSw(ME) || !h || roHidden('caves')) return h;
  const pk = caveBuildPick(), D = BUILD_DEFS.stable;
  return h + `<button type="button" class="ro-u ro-build${pk.why ? ' off' : ''}" data-ocbuild="1"${pk.why ? ' aria-disabled="true"' : ''} title="${escHTML(pk.why || `Send ${pk.m.name} to build an ${D.name} in ${provName(pk.p)} (${costText(D.cost)})`)}"><span>＋ Build an ${D.name}</span><small>${escHTML(pk.why || provName(pk.p) + ' · ' + costText(D.cost))}</small></button>`;
}; }
$q('#roster').addEventListener('click', e => {
  const b = e.target.closest('[data-ocbuild]'); if (!b) return;
  e.stopImmediatePropagation();
  if (b.getAttribute('aria-disabled') === 'true') { toast(b.title, true); return; }
  const pk = caveBuildPick(); if (pk.why) return toast(pk.why, true);
  sfx('ui_click'); pk.m.surveyQueue = []; orderBuild(pk.m, pk.p, 'stable'); rosterKey = '';
}, true);
v6style(`.ro-build { display: flex; flex-direction: column; align-items: flex-start; gap: 0; font-weight: 700; }
.ro-build small { font-weight: 600; color: var(--muted); font-size: 10px; }
.ro-build.off { opacity: .55; }`);

// =====================================================================================================================
// 42–49. Hisola: free starting Stable, 4 Riders, cavalry 3 food. Taal: a free starting Ogre Cave, 4 Ogres, Ogres 3 food
// =====================================================================================================================
LEADERS.hisola.bonus = 'Cavalry have 10% more health. Every kind of cavalry costs only 3 food upkeep, and her starting Stable has no upkeep.';
LEADERS.taal.bonus = 'Ogres deal 10% more damage. Every kind of Ogre costs only 3 food upkeep, and his starting Ogre Cave has no upkeep.';
{ const lt = leaderStartText; leaderStartText = function (L) {
  if (L && L.start === 'stable') return 'Starts with a Stable (technology researched, no upkeep) and 4 Riders as its only soldiers.';
  if (L && L.start === 'ogres') return 'Starts with an Ogre Cave (technology researched, no upkeep) and 4 Ogres as its only soldiers.';
  return lt(L);
}; }
{ const ls = applyLeaderStart; applyLeaderStart = function (o) {
  ls(o);
  const L = leaderOf(o), cap = capOf(o); if (!L || cap < 0) return;
  if (L.start === 'stable') {
    setStartArmy(o, { 'd-rider': 4 });
    const e = extrasIn(cap).find(x => x.type === 'stable'); if (e) e.freeFor = o;
  } else if (L.start === 'ogres') {
    let e = extrasIn(cap).find(x => x.type === 'stable'); if (!e) e = addStartExtra(cap, 'stable');
    if (e) e.freeFor = o;
    setStartArmy(o, { 'd-sw-ogre': 4 });
  } else return;
  if (o === ME) computeIncome(); else { const N = NATIONS[o]; N.income = aiIncome(N); }
  townSig = '';
}; }
// the Armory says what the leader's cavalry really costs to feed
function leaderUpkeepNote() {
  const L = leaderOf(ME); if (!L || !draft || draft.type !== 'cav') return;
  if (!((L.id === 'hisola') || (L.id === 'taal' && isSw(ME)))) return;
  const el = $q('#armory .ar-cost'); if (!el || el.dataset.v106) return;
  el.dataset.v106 = '1'; el.insertAdjacentHTML('beforeend', `<small class="ar-lnote">${L.name}: only 3 food upkeep</small>`);
}

// =====================================================================================================================
// 50–54. Army Training Orders: an Armory tab. Pick soldiers and numbers and a province to gather in; purchased, every
// Barracks (Ogre Cave for Ogres) trains one at a time, and they march to the order's own rally point and form one army
// =====================================================================================================================
let armMode = 'design';
const TO = { draft: {}, rally: -1, key: '' };
function toState() { if (!S.trainOrders) S.trainOrders = []; if (!S.trainOrderSeq) S.trainOrderSeq = 1; return S.trainOrders; }
// every training building of yours that can take military units, with the kinds each trains
function toBuildings() {
  const out = [];
  for (const [p, l] of S.extras) {
    if (!owned(p) || S.occ.has(p)) continue;
    if (l.some(e => e.type === 'barracks')) out.push({ key: 'barracks:' + p, p, kinds: trainable('barracks', p) });
    if (isSw(ME) && l.some(e => e.type === 'stable')) out.push({ key: 'stable:' + p, p, kinds: trainable('stable', p) });
  }
  return out;
}
function toKinds() { const s = []; for (const b of toBuildings()) for (const k of b.kinds) if (MILITARY.has(k) && !s.includes(k)) s.push(k); return s; }
const toCost = d => { const c = { gold: 0, wood: 0, food: 0 }; for (const k in d) { const u = UNIT_DEFS[k]; if (u) for (const r in u.cost) c[r] += u.cost[r] * d[k]; } for (const r in c) if (!c[r]) delete c[r]; return c; };
const toCount = d => Object.values(d).reduce((n, x) => n + x, 0);
function toWhy() {
  const n = toCount(TO.draft); if (!n) return 'Add some soldiers to the order';
  if (!toBuildings().length) return isSw(ME) ? 'You need a Barracks or an Ogre Cave' : 'You need a Barracks';
  if (TO.rally < 0 || !owned(TO.rally)) return 'Pick a province to gather in';
  const kinds = toKinds(); for (const k in TO.draft) if (TO.draft[k] && !kinds.includes(k)) return `None of your buildings can train ${PLURAL_OF(kindName(k))}`;
  return lackText(toCost(TO.draft));
}
function purchaseOrder() {
  const why = toWhy(); if (why) return toast('Can’t place the order: ' + why.charAt(0).toLowerCase() + why.slice(1) + '.', true);
  const c = toCost(TO.draft); for (const k in c) S.stock[k] -= c[k];
  const list = toState(), id = S.trainOrderSeq++, P = G.provs[TO.rally], rally = { prov: TO.rally, x: P.ic[0] + 10, y: P.ic[1] + 46 };
  const blds = toBuildings(), load = new Map(blds.map(b => [b.key, (S.queues[b.key] || []).length]));
  // the most limited kinds first (fewest buildings train them), each soldier to the least busy building that trains it
  const kinds = Object.keys(TO.draft).filter(k => TO.draft[k] > 0).sort((a, b) => blds.filter(x => x.kinds.includes(a)).length - blds.filter(x => x.kinds.includes(b)).length);
  let n = 0;
  for (const k of kinds) for (let i = 0; i < TO.draft[k]; i++) {
    const can = blds.filter(b => b.kinds.includes(k)); if (!can.length) continue;
    can.sort((a, b) => load.get(a.key) - load.get(b.key));
    const B = can[0]; load.set(B.key, load.get(B.key) + 1);
    (S.queues[B.key] = S.queues[B.key] || []).push({ kind: k, paid: { ...UNIT_DEFS[k].cost }, t0: null, order: id, rally: { ...rally } });
    n++;
  }
  list.push({ id, rally, total: n, mix: { ...TO.draft }, t: S.t, done: false });
  sfx('pr_trained'); capPanelKey = ''; cmdKey = ''; armKey = '';
  toast(`Army Training Order ${id} placed: ${n} soldiers from ${new Set(blds.map(b => b.key)).size} building${blds.length > 1 ? 's' : ''}, gathering in ${provName(TO.rally)} (−${costText(c)}).`);
  TO.draft = {};
}
// arrivals at the order's rally point form one army (the order's armies only join each other)
{ const ra = rallyArrivals; rallyArrivals = function () {
  for (const a of S.units) {
    if (a.kind !== 'army' || a.owner !== ME || !a.trainOrder || a.rallyTo === undefined || a.moving || a.battle) continue;
    if (a.prov !== a.rallyTo) { a.rallyTo = undefined; continue; }
    a.rallyTo = undefined;
    const host = S.units.find(v => v !== a && v.kind === 'army' && v.owner === ME && v.trainOrder === a.trainOrder && v.prov === a.prov && !v.moving && !v.battle && v.rallyTo === undefined);
    if (!host) continue;
    for (const k in a.troops) host.troops[k] = (host.troops[k] || 0) + a.troops[k];
    host.grew = S.t; S.units = S.units.filter(v => v !== a); S.selected = S.selected.filter(v => v !== a);
    computeIncome(); rosterKey = '';
  }
  ra();
}; }
function stepOrders() {
  for (const O of toState()) {
    if (O.done) continue;
    const queued = Object.values(S.queues).reduce((n, Q) => n + Q.filter(q => q.order === O.id).length, 0);
    const armies = S.units.filter(a => a.kind === 'army' && a.owner === ME && a.trainOrder === O.id);
    if (queued || armies.some(a => a.moving || a.rallyTo !== undefined)) continue;
    O.done = true; O.doneT = S.t;
    const at = armies.filter(a => a.prov === O.rally.prov), n = at.reduce((m, a) => m + troopCount(a), 0);
    for (const a of armies) a.trainOrder = undefined;
    if (n) { sfx('wn_ally', { vol: 0.5 }); toast(`Army Training Order ${O.id} is complete: ${at[0].name} (${n} soldiers) stands ready in ${provName(O.rally.prov)}.`); }
    armKey = '';
  }
  if (S.trainOrders.length > 12) S.trainOrders = S.trainOrders.filter(O => !O.done || S.t - O.doneT < 300);
}
function orderProgress(O) {
  const queued = Object.values(S.queues).reduce((n, Q) => n + Q.filter(q => q.order === O.id).length, 0);
  const armies = S.units.filter(a => a.kind === 'army' && a.owner === ME && a.trainOrder === O.id);
  const there = armies.filter(a => a.prov === O.rally.prov && !a.moving).reduce((n, a) => n + troopCount(a), 0);
  return { queued, made: O.total - queued, there };
}
function renderOrderView() {
  const kinds = toKinds(), blds = toBuildings(), provs = myProvList();
  if (TO.rally < 0 || !owned(TO.rally)) TO.rally = S.capital >= 0 && owned(S.capital) ? S.capital : provs[0] ?? -1;
  const active = toState().filter(O => !O.done || S.t - O.doneT < 60);
  const key = JSON.stringify([TO.draft, TO.rally, kinds, blds.length, RES.map(k => Math.floor(S.stock[k] / 10)), provs.length, active.map(O => [O.id, O.done, orderProgress(O)])]);
  if (key === TO.key && $q('#armory .to-body')) return; TO.key = key;
  const unit = k => { const d = UNIT_DEFS[k], n = TO.draft[k] || 0, st = DSTATS[k];
    return `<div class="to-u"><span class="to-n"><b>${escHTML(kindName(k))}</b><small>${st ? (st.ranged ? 'Ranged' : st.cav ? (isSw(ME) ? 'Ogre' : 'Cavalry') : 'Infantry') : ''} · ${costHTML(d.cost)}</small></span><span class="to-q"><button type="button" data-to="dec" data-k="${k}" aria-label="One fewer">−</button><b>${n}</b><button type="button" data-to="inc" data-k="${k}" aria-label="One more">+</button><button type="button" data-to="inc5" data-k="${k}" aria-label="Five more">+5</button></span></div>`; };
  const why = toWhy(), cost = toCost(TO.draft), n = toCount(TO.draft);
  const rows = active.map(O => { const g = orderProgress(O); return `<div class="to-o${O.done ? ' done' : ''}"><b>Order ${O.id}</b><span>${Object.entries(O.mix).filter(([, x]) => x).map(([k, x]) => `${x} ${x > 1 ? PLURAL_OF(kindName(k)) : kindName(k)}`).join(', ')} → ${escHTML(provName(O.rally.prov))}</span><small>${O.done ? 'Complete' : `${g.made}/${O.total} trained · ${g.there} gathered`}</small><em><s style="width:${(g.made / Math.max(1, O.total) * 100).toFixed(0)}%"></s></em></div>`; }).join('');
  $q('#armory').innerHTML = `<div class="ar-head"><b>Armory</b><span>Order a whole army: every Barracks${isSw(ME) ? ' (Ogre Caves for Ogres)' : ''} trains its share, and they gather in one province.</span><button type="button" class="tp-x" data-ar="close" aria-label="Close the Armory">×</button></div>${armModeBar()}
    <div class="to-body"><div class="to-left"><div class="ar-sec">Soldiers</div>${kinds.length ? kinds.map(unit).join('') : `<p class="to-none">${blds.length ? 'Nothing to train yet.' : (isSw(ME) ? 'Build a Barracks or an Ogre Cave first.' : 'Build a Barracks first.')}</p>`}</div>
    <div class="to-right"><div class="ar-sec">The order</div>
      <label class="to-rally"><span>Gather in</span><select id="toRally">${provs.map(p => `<option value="${p}"${p === TO.rally ? ' selected' : ''}>${escHTML(provName(p))}${S.buildings.get(p).stage === 2 ? ' (capital)' : ''}</option>`).join('')}</select></label>
      <div class="to-sum"><span>${n} soldier${n === 1 ? '' : 's'} from ${blds.length} building${blds.length === 1 ? '' : 's'}</span><span>Cost ${n ? costHTML(cost) : '—'}</span></div>
      <p class="to-note">This rally point is the order’s own: it doesn’t change the rally points of your buildings.</p>
      <div class="ar-btns"><button type="button" class="ar-save${why ? ' off' : ''}" data-to="buy"${why ? ` title="${escHTML(why)}"` : ''}>Purchase order</button><button type="button" class="ar-save ar-del" data-to="clear">Clear</button></div>
      ${why && n ? `<p class="to-why">${escHTML(why)}</p>` : ''}
      ${rows ? `<div class="ar-sec">Orders</div>${rows}` : ''}
    </div></div>`;
}
function armModeBar() {
  return `<div class="ar-mode"><button type="button" data-armode="design" aria-selected="${armMode === 'design'}">Designs</button><button type="button" data-armode="order" aria-selected="${armMode === 'order'}">Army Training Order</button></div>`;
}
{ const ra = renderArmory; renderArmory = function () {
  if (!armOpen) return;
  if (armMode === 'order') { try { renderOrderView(); } catch (e) { reportError(e, 'training order'); } return; }
  if ($q('#armory .to-body')) armKey = '';
  ra();
  const head = $q('#armory .ar-head'); if (head && !$q('#armory .ar-mode')) head.insertAdjacentHTML('afterend', armModeBar());
  leaderUpkeepNote();
}; }
armEl.addEventListener('click', e => {
  const m = e.target.closest('[data-armode]');
  if (m) { e.stopImmediatePropagation(); armMode = m.dataset.armode; armKey = ''; TO.key = ''; sfx('ui_click'); renderArmory(); return; }
  const t = e.target.closest('[data-to]'); if (!t) return;
  e.stopImmediatePropagation();
  const a = t.dataset.to, k = t.dataset.k;
  if (a === 'inc') TO.draft[k] = (TO.draft[k] || 0) + 1;
  else if (a === 'inc5') TO.draft[k] = (TO.draft[k] || 0) + 5;
  else if (a === 'dec') { TO.draft[k] = Math.max(0, (TO.draft[k] || 0) - 1); if (!TO.draft[k]) delete TO.draft[k]; }
  else if (a === 'clear') TO.draft = {};
  else if (a === 'buy') { if (toWhy()) { toast(toWhy(), true); sfx('ui_error'); return; } purchaseOrder(); }
  sfx('ui_click'); TO.key = ''; renderArmory();
}, true);
armEl.addEventListener('change', e => { if (e.target.id === 'toRally') { TO.rally = +e.target.value; TO.key = ''; } });
v6style(`.ar-mode { display: flex; gap: 4px; margin: 6px 0 4px; border-bottom: 2px solid #e3e7ee; }
.ar-mode button { font: 800 12px var(--font-ui); letter-spacing: .04em; padding: 5px 14px; border: 1px solid var(--ink); border-bottom: none; background: #eef2f7; color: var(--muted); cursor: pointer; }
.ar-mode button[aria-selected="true"] { background: var(--sun); color: var(--ink); }
.to-body { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding-top: 4px; }
.to-left, .to-right { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.to-u { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border: 1px solid #d5dbe5; background: #fbfaf6; }
.to-n { display: flex; flex-direction: column; flex: 1; min-width: 0; font: 700 12px var(--font-ui); }
.to-n small { font-weight: 600; color: var(--muted); display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.to-q { display: flex; align-items: center; gap: 4px; }
.to-q b { min-width: 22px; text-align: center; font: 800 13px var(--font-ui); }
.to-q button { min-width: 26px; height: 24px; border: 1px solid var(--ink); background: #fff; cursor: pointer; font: 800 12px var(--font-ui); }
.to-rally { display: flex; align-items: center; gap: 8px; font: 700 12px var(--font-ui); }
.to-rally select { flex: 1; font: 600 12px var(--font-ui); padding: 3px; }
.to-sum { display: flex; justify-content: space-between; gap: 8px; font: 700 12px var(--font-ui); align-items: center; }
.to-sum span { display: flex; align-items: center; gap: 4px; }
.to-note, .to-none, .to-why { font: 600 11px var(--font-ui); color: var(--muted); margin: 0; }
.to-why { color: #b2302a; }
.ar-save.off { opacity: .6; }
.to-o { display: grid; grid-template-columns: auto 1fr; gap: 0 8px; padding: 4px 6px; border: 1px solid #d5dbe5; font: 600 11px var(--font-ui); }
.to-o b { font-weight: 800; } .to-o small { grid-column: 1 / -1; color: var(--muted); }
.to-o em { grid-column: 1 / -1; height: 5px; background: #e3e7ee; display: block; }
.to-o em s { display: block; height: 100%; background: #7ac74f; text-decoration: none; }
.to-o.done { opacity: .7; }
.ar-lnote { display: block; grid-column: 1 / -1; color: #2c6e36; font-weight: 700; }
@media (max-width: 760px) { .to-body { grid-template-columns: 1fr; } }`);

// =====================================================================================================================
// 55–59. Patch Notes on the main menu: one collapsible section per version, newest first, each with its date
// =====================================================================================================================
const PATCH_NOTES = [
  { v: 'v106', date: 'November 19, 2026', items: [
    ['Walls and roads', 'Forts and capitals can rebuild torn-down walls, and capitals always offer Rebuild walls. Roads can cross a wall between two of your own provinces. Fixed walls showing two health bars.'],
    ['Exploring', 'Lakes and the ocean come out of the fog once every province on their shores is explored.'],
    ['Battle', 'Ranged soldiers take 80% less damage in the back row.'],
    ['Province limit', 'Wars can take you over your province limit. Each extra province costs 5 gold, 5 wood and 5 food upkeep, and a flag warns you.'],
    ['Diplomacy', 'New Proclaim Enemy action (−300 opinion). Computer nations proclaim enemies too, and a shared enemy gives +50. Military access and Trade Networks give +25 opinion. The Diplomacy page shows each nation’s opinion of you and its enemy. Only computer nations are limited to one ally. No flirting with Swamplings; a Swampling growl at another race is always −25. Gifted gold always arrives.'],
    ['Develop Province', 'Outposts, forts and capitals can be developed up to level 3 for more resources and houses; in forts and capitals each level also raises the province limit. Occupation resets it.'],
    ['Building', 'A Build Outpost button on unclaimed provinces. Ogre Caves sit against the mountains and can be ordered from the Armies tab.'],
    ['Leaders', 'Hisola and Taal start with 4 Riders / Ogres and a Stable / Ogre Cave with no upkeep; their cavalry and Ogres cost 3 food.'],
    ['Armory', 'New Army Training Order tab: order a whole army from every Barracks and have it gather in one province.'],
    ['Menu', 'Added Patch Notes.']
  ] }
];
const patchOpen = new Set([PATCH_NOTES[0].v]);
function renderPatchNotes() {
  const box = $q('#mPatchList'); if (!box) return;
  box.innerHTML = PATCH_NOTES.map(P => { const open = patchOpen.has(P.v);
    return `<div class="pn-sec${open ? ' open' : ''}"><button type="button" class="pn-sum" data-pn="${P.v}" aria-expanded="${open}"><em>${open ? '▾' : '▸'}</em><b>${P.v}</b><small>${P.date}</small></button>${open ? `<ul class="pn-list">${P.items.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ul>` : ''}</div>`; }).join('');
}
{
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'menu-start menu-mp'; btn.id = 'mPatch'; btn.textContent = 'Patch Notes';
  const multi = $q('#mMulti'); if (multi) multi.after(btn);
  const scr = document.createElement('div'); scr.className = 'menu-screen'; scr.id = 'mPatchScreen'; scr.hidden = true;
  scr.innerHTML = `<div class="menu-sub"><button type="button" class="menu-back" id="mPatchBack" aria-label="Back to the main menu">← Back</button><h2>Patch Notes</h2><span></span></div><div class="pn-box" id="mPatchList"></div>`;
  const ms = $q('#mMultiScreen'); if (ms) ms.after(scr);
  const m0 = menuScreen;
  menuScreen = function (which) {
    if (which === 'patch') { m0('multi'); $q('#mMultiScreen').hidden = true; scr.hidden = false; renderPatchNotes(); setTimeout(() => $q('#mPatchBack').focus({ preventScroll: true }), 60); return; }
    scr.hidden = true; return m0(which);
  };
  btn.addEventListener('click', () => { sfx('ui_click'); menuScreen('patch'); });
  scr.addEventListener('click', e => {
    if (e.target.closest('#mPatchBack')) { menuScreen('main'); return; }
    const s = e.target.closest('[data-pn]'); if (!s) return;
    const v = s.dataset.pn; if (patchOpen.has(v)) patchOpen.delete(v); else patchOpen.add(v); sfx('ui_click'); renderPatchNotes();
  });
  $q('#menu').addEventListener('keydown', e => { if (e.key === 'Escape' && !scr.hidden) { e.stopPropagation(); menuScreen('main'); } });
  v6style(`.pn-box { display: flex; flex-direction: column; gap: 6px; max-height: 46vh; overflow-y: auto; text-align: left; padding-right: 4px; }
.pn-sec { border: 1px solid var(--ink); background: #fbfaf6; }
.pn-sum { display: flex; align-items: baseline; gap: 8px; width: 100%; padding: 7px 10px; background: none; border: none; cursor: pointer; text-align: left; font: 700 14px var(--font-ui); color: var(--ink); }
.pn-sum em { font-style: normal; width: 12px; color: var(--muted); }
.pn-sum small { margin-left: auto; font-weight: 600; color: var(--muted); font-size: 12px; }
.pn-sec.open .pn-sum { border-bottom: 1px solid #e3e7ee; }
.pn-list { margin: 0; padding: 8px 14px 10px 28px; font: 500 13px/1.45 var(--font-ui); color: var(--ink); }
.pn-list li { margin: 3px 0; }`);
}

// =====================================================================================================================
// setup, loading and the frame step
// =====================================================================================================================
{ const sv = setupV96; setupV96 = function (loaded) {
  sv(loaded);
  devMap(); toState(); enemyState();
  V106.t = -1; V106.houseSig = ''; V106.pmKey = ''; v6waterSig = ''; v6water = null; TO.draft = {}; TO.rally = -1; TO.key = '';
  if (!loaded) { S.devel = new Map(); S.trainOrders = []; S.trainOrderSeq = 1; S.giftVault = 0; }
}; }
{ const sv = stepV96; stepV96 = function (t, dt) {
  sv(t, dt);
  if (!S.started) return;
  const d = S.paused ? 0 : v6dt(); if (S.paused) V106.t = S.t;
  const run = (n, f) => { try { f(); } catch (e) { reportError(e, n); } };
  run('v106 fog', stepWaterFog);
  run('v106 caves', stepCaveSites);
  if (S.paused || S.fallen) return;
  run('v106 develop', () => stepDevelop(d));
  run('v106 enemies', stepEnemies);
  run('v106 vaults', stepGiftVaults);
  run('v106 orders', stepOrders);
  run('v106 ai develop', () => { for (const N of Object.values(NATIONS)) aiDevelop(N); });
}; }
{ const dv = drawV102; drawV102 = function (g, t) { dv(g, t); try { drawDevelop(g, t); } catch (e) { reportError(e, 'v106 draw'); } }; }

window.__v106t = { yields: p => ({ ...yields[p] }), upkeep: () => upkeep(), income: () => ({ ...income }), computeIncome: () => computeIncome(), provLimit: o => provLimit(o), opinion, opinionParts, dxAct, rewallsAt, rewallsWhy, rebuildWalls, tearDownWall: (p, q) => tearDownWall(p, q), raiseWall, linkWhy: (t, m, q) => linkWhy(t, m, q), linkRows: (m, q) => linkRows(m, q), roadPath: (p, q) => roadPath(p, q), wallBetween, openBetween,
  giveTech: id => addStartTech(ME, id), claim: (p, o = ME, stage = 0) => { S.buildings.set(p, { stage, born: S.t, owner: o }); territory = null; computeIncome(); }, dxPanelHTML: () => dxPanelHTML(), allyWhy: (a, b) => allyWhy(a, b), stepGiftVaults, aiStorage, flagList: () => flagList(), cmdInfo: id => cmdInfo(id), renderArmory: () => renderArmory(), armory: o => toggleArmory(o), bslotOf: (p, s) => bslotOf(p, s), bslotBase, leaderOf, startArmy, extrasIn, applyDamage: (b, A, d, t) => applyDamage(b, A, d, t), rowSync, provMenuHTML: () => $q('#prov').innerHTML, menuScreen: w => menuScreen(w) };
window.__v106 = { devRec, devWhy, startDevelop, finishDevelop, stepDevelop, devLimitBonus: o => devLimitBonus(o), overLimit, proclaimWhy, proclaimEnemy, renounceEnemy, enemyOf, aiPickEnemy, aiEnemyThink, sharesWilds, waterShores, lakeOpen, oceanOpen, caveSpot, caveBuildPick, toBuildings, toKinds, TO, purchaseOrder, stepOrders, orderProgress, outpostBtnWhy, giftIntoTreasury, aiDevelop, DEV, takeMult: (a, k, f) => takeMult(a, k, f), setMode: m => { armMode = m; armKey = ''; TO.key = ''; } };
