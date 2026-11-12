
// ================= AI nations =================
// Computer nations play by the player's rules: the same yields, costs, build and training times, upkeep, storage,
// outpost and fort limits, Army Exhaustion, research trees and the 3 Wayfinder / 3 Mason limit.
// Their Wayfinders, Masons and armies are real units on the map. They treat the player like any other nation.
const DIFF_NAME = { easy: 'Easy', moderate: 'Moderate', difficult: 'Difficult' };
const AI_IDS = [4, 5, 6, 7, 8, 9, 10];
const AI_TITLES = ['Kingdom', 'Duchy', 'Realm', 'March', 'Principality', 'Dominion', 'Free Cities', 'Grand Duchy', 'Barony'];
const AI_PLACES = ['Thornwall', 'Emberreach', 'Mistvale', 'Highmoor', 'Goldhaven', 'Ravenmark', 'Stonebrook', 'Willowmere', 'Frostholm', 'Sunspire', 'Duskwood', 'Briarfell', 'Ironcrest', 'Saltmarsh', 'Oakenshade', 'Ashford'];
// Swampling nations: crude, brutish clans, tribes and legions
const SW_AI_TITLES = ['Clan', 'Tribe', 'Legion'];
const SW_AI_PLACES = ['Bloodtusk', 'Gorehide', 'Skullmire', 'Rotfang', 'Bonegnaw', 'Mudmaw', 'Gutripper', 'Ironjaw', 'Grimbog', 'Blackfen', 'Bilegut', 'Snaggletooth', 'Muckclaw', 'Thudfist', 'Skarrak', 'Grubsnout'];
// how each difficulty plays
const AI_DIFF = {
  easy: { think: 3, maxProvs: 10, wf: 1, masons: 1, masons2: 1, outpostGap: 75, war: false, school: null, family: 'sword', armor: 'leather' },
  moderate: { think: 1.5, maxProvs: 10, wf: 2, masons: 2, masons2: 3, outpostGap: 0, war: true, school: null, family: null, armor: 'chain' },
  difficult: { think: 1, maxProvs: 99, wf: 3, masons: 3, masons2: 3, outpostGap: 0, war: false, school: 'arcane', family: 'pole', armor: 'chain' }
};
const aiN = o => NATIONS[o] || null;
const aiHas = (N, id) => { const x = TECH_BY_ID[id]; return !!x && N.tech[x.tree].done.includes(id); };
const aiRep = (N, id) => N.rep[id] || 0;
// any nation's technology: the player's or an AI's
const techOf = (o, id) => o === ME ? hasTech(id) : NATIONS[o] ? aiHas(NATIONS[o], id) : false;
const aiUnits = (N, kind) => S.units.filter(v => v.owner === N.id && v.kind === kind);
const aiArmies = N => S.units.filter(v => v.owner === N.id && v.kind === 'army' && troopCount(v) > 0);
const aiMages = N => S.units.reduce((n, v) => n + (v.owner === N.id && v.kind === 'army' ? (v.troops[MAGE] || 0) : 0), 0) + N.queue.filter(q => q.kind === MAGE).length;
const aiExtraList = N => { const out = []; for (const [p, list] of S.extras) if (nationOf(p) === N.id) for (const e of list) out.push([p, e]); return out; };
const aiHasBuilding = (N, type) => { for (const [p, list] of S.extras) if (nationOf(p) === N.id && list.some(e => e.type === type)) return true; return S.units.some(u => u.owner === N.id && u.build && u.build.type === type); };
const aiCount = (N, type) => aiExtraList(N).filter(([, e]) => e.type === type).length + S.units.filter(u => u.owner === N.id && u.build && u.build.type === type).length;
const armyPower = o => o ? rawStrength(S.units.filter(v => v.kind === 'army' && v.owner === o && troopCount(v) > 0)) : 0;
const defPower = o => armyPower(o) + alliesOf(o).reduce((n, x) => n + armyPower(x), 0);
const canPay = (st, c) => Object.keys(c).every(k => (st[k] || 0) >= c[k]);
const pay = (st, c) => { for (const k in c) st[k] -= c[k]; };

// ---------- setting up the nations ----------
function spawnAINations(slots, races = []) {
  for (const k of Object.keys(NATIONS)) { delete NATIONS[k]; delete RACE[k]; }
  S.wars = []; S.truces.clear(); S.allies = []; S.allyEnds = []; metBy.clear(); S.met.clear(); S.allyAsk.clear(); S.allyOffer = null; S.fallen = false;
  const r = rngFrom(world.seed + ':nations:' + slots.join(','));
  const colors = NATION_COLORS.map((c, i) => i).filter(i => i !== NATION.color);
  const places = AI_PLACES.slice().sort(() => r() - 0.5), swPlaces = SW_AI_PLACES.slice().sort(() => r() - 0.5), emblems = FLAG_EMBLEMS.filter(e => e !== NATION.emblem).sort(() => r() - 0.5);
  const caps = [S.capital];
  const reach = hopsFrom(S.capital);
  let k = 0, ks = 0, kr = 0, kw = 0; const wdNames = WD_AI_NAMES.slice().sort(() => r() - 0.5);
  slots.forEach((diff, i) => {
    if (!DIFF_NAME[diff]) return;
    // each opponent is Realmling, Swampling or (Random) either; Swamplings settle in a swamp
    const id = AI_IDS[i], rc = ['realm', 'swamp', 'wood'].includes(races[i]) ? races[i] : ['realm', 'swamp', 'wood'][Math.floor(r() * 3)], cap = pickAICapital(caps, reach, r, rc === 'swamp' ? 'swamp' : rc === 'wood' ? 'forest' : 'grassland'); if (cap < 0) return;
    RACE[id] = rc;
    caps.push(cap);
    const [c, l] = NATION_COLORS[colors[k % colors.length]];
    let name;
    if (rc === 'wood') name = wdNames[kw++ % wdNames.length];   // "Moonwatchers", "Hunters of the Dark"
    else if (rc === 'swamp') { const tl = SW_AI_TITLES[Math.floor(r() * SW_AI_TITLES.length)], pl = swPlaces[ks++ % swPlaces.length]; name = r() < 0.5 ? pl + ' ' + tl : tl + ' of ' + pl; }   // "Bloodtusk Clan", "Legion of Skullmire"
    else name = AI_TITLES[Math.floor(r() * AI_TITLES.length)] + ' of ' + places[kr++ % places.length];
    PLAYERS[id] = { name, color: c, light: l };
    const N = NATIONS[id] = {
      id, diff, name, emblem: emblems[k % emblems.length] || FLAG_EMBLEMS[k % FLAG_EMBLEMS.length], alive: true, capital: cap,
      stock: { ...START_STOCK }, rep: {}, surveyed: new Set([cap]), exhaust: 0, ups: new Map(), xups: new Map(),
      tech: Object.fromEntries(TREE_KEYS.map(t => [t, { cur: null, prog: 0, bank: 0, opts: [], done: [], tier: 0, sticky: [] }])),
      queue: [], think: S.t + 1 + i * 0.37, nextOutpost: 0, phase: 'grow', stuckSince: null, warCheck: S.t + 60 + r() * 60,
      family: swFamily(rc, AI_DIFF[diff].family || ['sword', 'pole', 'blunt'][Math.floor(r() * 3)]), armorLine: swArmorLine(rc, AI_DIFF[diff].armor), race: rc,
      school: null, wantSchool: swSchool(rc, AI_DIFF[diff].school || ['life', 'death', 'arcane'][Math.floor(r() * 3)], r), spellT: 0, dv: 0, design: rc === 'swamp' ? { inf: 'd-sw-axe', cav: 'd-sw-ogre' } : { inf: 'd-sword', cav: 'd-rider' }, armyN: 0, income: { gold: 0, wood: 0, food: 0 }
    };
    if (rc === 'swamp') N.tech.gov.done.push('mushroom');   // Swamplings know Mushroom Farming from the start
    S.buildings.set(cap, { stage: 2, born: -10, owner: id });
    const wf = mkUnit(S.nextId++, WAYFINDER, '', cap, 0); wf.owner = id; S.units.push(wf);
    const ms = mkUnit(S.nextId++, MASON, '', cap, 1); ms.owner = id; S.units.push(ms);
    aiNewArmy(N, cap, { [footmanOf(id)]: 3 });
    aiRedesign(N);
    k++;
  });
  territory = null; cacheDirty = true; computeFog();
}
// capitals: grassland with open borders, as far as possible from every other capital, and reachable over land
function pickAICapital(caps, reach, r, terrain = 'grassland') {
  const all = G.provs.map((_, i) => i).filter(i => !S.buildings.has(i) && reach[i] < Infinity && !uniqueBan(i));
  let cands = all.filter(i => G.provs[i].terrain === terrain && openNbr[i].length >= 2);
  if (terrain !== 'grassland' && cands.length < 3) cands = cands.concat(all.filter(i => G.provs[i].terrain === 'grassland' && openNbr[i].length >= 2));
  if (cands.length < 8) cands = all.filter(i => openNbr[i].length >= 2);
  if (!cands.length) return -1;
  const ds = caps.map(c => hopsFrom(c, allNbr));
  let best = -1, bs = -Infinity;
  for (const i of cands) {
    const md = Math.min(...ds.map(d => d[i]));
    if (md < 3) continue;
    const sc = Math.min(md, 9) * 10 + openNbr[i].length * 2 - (G.provs[i].coastal ? 3 : 0) + r() * 4;
    if (sc > bs) { bs = sc; best = i; }
  }
  return best;
}
function aiNewArmy(N, prov, troops) {
  const a = mkUnit(S.nextId++, 'army', '', prov, 0);
  a.owner = N.id; a.troops = { ...troops }; a.name = PLAYERS[N.id].name.split(' of ').pop() + ' Host' + (++N.armyN > 1 ? ' ' + N.armyN : '');
  a.slot = freeSlot(prov, a); [a.x, a.y] = slotPos(prov, a.slot); a.born = S.t;
  S.units.push(a); return a;
}

// ---------- the economy (same numbers as the player's) ----------
function aiGives(N, type) {
  const base = { ...(BUILD_DEFS[type].gives || {}) }, t = TECH_GIVES[type];
  if (t) for (const id of t[0]) if (aiHas(N, id)) for (const k in t[1]) base[k] = (base[k] || 0) + t[1][k];
  return base;
}
function aiProvIncome(N, p, b) {
  const y = {}; for (const k of RES) y[k] = yields[p][k] + (b.stage === 2 ? CAPITAL_BONUS[k] : 0);
  for (const e of extrasIn(p)) { const g = aiGives(N, e.type); for (const k in g) y[k] += g[k]; }
  if (aiRep(N, 'rep-lumber')) y.wood += Math.round(extrasIn(p).filter(e => e.type === 'lumber').reduce((n, e) => n + (aiGives(N, 'lumber').wood || 0), 0) * 0.05 * aiRep(N, 'rep-lumber'));
  return y;
}
function aiUpkeep(N) {
  const u = { gold: 0, wood: 0, food: 0 };
  for (const v of S.units) {
    if (v.owner !== N.id) continue;
    if (v.kind === 'army') { for (const tk in v.troops) { const d = UNIT_DEFS[tk]; if (d) for (const k in d.upkeep) u[k] += d.upkeep[k] * v.troops[tk]; } continue; }
    const d = UNIT_DEFS[v.kind]; if (d) for (const k in d.upkeep) u[k] += d.upkeep[k];
  }
  for (const [p, b] of S.buildings) if (b.owner === N.id) { for (const e of extrasIn(p)) { const up = BUILD_DEFS[e.type].upkeep || {}; for (const k in up) u[k] += up[k]; } if (b.stage === 0) for (const k in OUTPOST_UPKEEP) u[k] += OUTPOST_UPKEEP[k]; }
  return u;
}
function aiIncome(N) {
  const gross = { gold: 0, wood: 0, food: 0 }, up = aiUpkeep(N);
  for (const [p, b] of S.buildings) if (b.owner === N.id && !S.occ.has(p)) { const y = aiProvIncome(N, p, b); for (const k of RES) gross[k] += y[k]; }
  // Harvest (Herbomancy): a Mage at home makes every Farm give more food
  if (N.school === 'life' && aiHas(N, 'harvest') && aiMages(N)) { const lv = ['harvest', 'bountiful', 'magnificent'].filter(id => aiHas(N, id)).length; const farmFood = aiExtraList(N).filter(([, e]) => e.type === 'farm').length * (aiGives(N, 'farm').food || 0); gross.food += Math.round(farmFood * (HARVEST_PCT[lv] + 0.02 * aiRep(N, 'rep-harvest'))); }
  const inc = {}; for (const k of RES) inc[k] = gross[k] - up[k];
  return inc;
}
function aiStorage(N, k) {
  let n = BASE_CAP + 500 * aiRep(N, 'rep-storage');
  for (const [, e] of aiExtraList(N)) { const st = BUILD_DEFS[e.type].store; if (st && st[k]) n += st[k]; }
  return n;
}
const aiForts = N => [...S.buildings.values()].filter(b => b.owner === N.id && b.stage === 1).length;
const aiFortLimit = N => FORT_LIMIT[['forts', 'forts2', 'forts3'].filter(id => aiHas(N, id)).length] + aiRep(N, 'rep-forts');
const aiFortCount = N => aiForts(N) + N.ups.size;
const aiOutposts = N => [...S.buildings].filter(([p, b]) => b.owner === N.id && b.stage === 0 && !N.ups.has(p)).length;
const aiOutpostLimit = N => perFort(N.id) * fortsHeldBy(N.id);
const aiPendingOutposts = (N, self) => S.units.filter(u => u.owner === N.id && u !== self && ((u.build && u.build.type === 'outpost') || (u.aiJob && u.aiJob.type === 'outpost'))).length;
const aiProvCount = N => provsOf(N.id).length;

// called every payout (10 s), right after the player's
function aiPayday() {
  for (const N of Object.values(NATIONS)) {
    if (!N.alive) continue;
    const inc = N.income = aiIncome(N);
    const short = N.stock.food + inc.food < 0;
    for (const k of RES) N.stock[k] = Math.min(aiStorage(N, k), Math.max(0, N.stock[k] + inc[k]));
    aiExhaustion(N, short);
    aiTechPayday(N);
    aiSpells(N);
  }
}
// Army Exhaustion: every payout the army can't be fed adds 1; at 10 the whole army deserts
function aiExhaustion(N, short) {
  if (short && soldierCount(N.id) > 0) {
    if (++N.exhaust >= EXHAUST_MAX) { for (const a of aiArmies(N)) removeArmy(a); N.exhaust = 0; if (knows(N.id)) toast(`The ${PLAYERS[N.id].name} couldn’t feed its soldiers: its whole army has deserted.`); }
    return;
  }
  if (N.exhaust > 0 && N.income.food >= 0 && N.stock.food > 0) N.exhaust--;
}
// resource spells: a nation with a Mage casts its school's money spell over and over (3 minutes casting, 3 minutes waiting)
function aiSpells(N) {
  if (!N.school || !aiMages(N)) return;
  const sp = N.school === 'death' ? 'graverob' : N.school === 'arcane' ? 'trading' : null; if (!sp || !aiHas(N, sp)) return;
  N.spellT += TICK; if (N.spellT < RES_CAST + RES_CD) return; N.spellT = 0;
  const lv = (sp === 'graverob' ? ['graverob', 'deathtax', 'charon'] : ['trading', 'stockmarket', 'planar']).filter(id => aiHas(N, id)).length;
  const y = Math.round(RES_YIELD[lv] * (1 + 0.02 * aiRep(N, sp === 'graverob' ? 'rep-graverob' : 'rep-trading')));
  if (sp === 'graverob') N.stock.gold += y; else for (const k of RES) N.stock[k] += Math.round(y / 3);
}

// ---------- research (the player's trees, rules and costs) ----------
function aiProvResearch(N, p) {
  const r = { gov: 0, mil: 0, mag: 0 }, b = S.buildings.get(p);
  if (!b || b.owner !== N.id) return r;
  if (!S.occ.has(p)) { if (b.stage >= 1) r.gov += b.stage + 1; r.gov += extrasIn(p).filter(e => e.type === 'temple').length * 2; }
  for (const e of extrasIn(p)) { if (e.type === 'forge') r.mil += LEVEL_POINTS[e.level || 1]; else if (e.type === 'magetower') r.mag += LEVEL_POINTS[e.level || 1]; }
  if (!S.occ.has(p)) { const sp = setpieceAt(p); if (sp) { const tr = SETPIECES[sp].tree; if (tr === 'gov' || aiHasBuilding(N, tr === 'mil' ? 'forge' : 'magetower')) r[tr] += SETPIECES[sp].pts; } }
  return r;
}
function aiTechRate(N, tree) { let n = 0; for (const [p, b] of S.buildings) if (b.owner === N.id) n += aiProvResearch(N, p)[tree]; return n; }
function aiTier(N, tree) {
  if (tree === 'gov') { const f = aiForts(N); return 1 + (f >= 1) + (f >= 2); }
  const lv = aiExtraList(N).filter(([, e]) => e.type === (tree === 'mil' ? 'forge' : 'magetower')).map(([, e]) => e.level || 1);
  return lv.length ? Math.max(...lv) : 0;
}
const aiTechCost = (N, x) => Math.round(x.cost * (x.rep && !FLAT_REPS.has(x.id) ? Math.pow(REP_STEP, aiRep(N, x.id)) : 1) * treeCostMult(x.tree) * techCostMult(aiProvCount(N)));
function aiTechsLeft(N, tree) {
  const st = N.tech[tree], sc = tree === 'mag' ? N.school : null;
  return TECHS.filter(x => x.tree === tree && !x.rep && !x.playerOnly && techFor(x, N.race) && !st.done.includes(x.id) && x.id !== 'abandon' && !(tree === 'mag' && (x.id.startsWith('school-') ? !!sc : sc && x.school !== '*' && x.school !== sc))).length;
}
function aiDrawOptions(N, tree) {
  const st = N.tech[tree], T = aiTier(N, tree), n = TECH_OPTIONS + (aiHas(N, 'retained') ? 1 : 0) + (aiHas(N, 'retained2') ? 1 : 0), rep = aiTechsLeft(N, tree) < REP_LEFT;
  let avail = TECHS.filter(x => x.tree === tree && x.tier <= T && techFor(x, N.race) && !st.done.includes(x.id) && x.id !== st.cur && reqMet(x, st, N.tech, N.race) && forgeReady(x, st) && (!x.rep || rep) && x.id !== 'abandon' && !x.playerOnly);
  if (tree === 'mag') avail = N.school ? avail.filter(x => !x.id.startsWith('school-') && (x.school === '*' || x.school === N.school)) : avail.filter(x => x.id.startsWith('school-'));
  const weight = x => x.id === 'forge' && aiHasBuilding(N, 'barracks') ? 1.5 : 1;
  const sh = avail.map(x => ({ x, k: Math.pow(Math.random(), 1 / weight(x)) })).sort((a, b) => b.k - a.k).map(o => o.x), top = sh.filter(x => x.tier === T && !x.rep), opts = [];
  for (const x of sh) if (st.sticky.includes(x.id) && opts.length < n) opts.push(x);
  for (const x of sh) if (UPGRADE_TECHS.has(x.id) && opts.length < n && !opts.includes(x)) opts.push(x);
  if (top.length && !opts.includes(top[0]) && opts.length < n) opts.push(top[0]);
  for (const x of sh) if (opts.length < n && !opts.includes(x)) opts.push(x);
  for (const x of opts) if (STICKY_TECHS.has(x.id) && !st.sticky.includes(x.id)) st.sticky.push(x.id);
  st.opts = opts.map(x => x.id);
}
// v96: a Moderate or Difficult nation that still has no school of magic after 30 minutes makes magic its priority:
// Mage Tower research first, the tower first on the build list (no wood-upkeep veto), room made for it if need be
const AI_MAGIC_LATE = 1800;
const aiMagicLate = N => (N.diff === 'moderate' || N.diff === 'difficult') && !N.school && S.t >= AI_MAGIC_LATE;
// such a nation that can pay for its Mage Tower but has no free building plot anywhere tears down
// the building it can best spare (never the last Barracks, Forge or Temple), so the tower can go up
function aiMakeRoomForTower(N) {
  if (S.t < (N.roomAt || 0) || !canPay(N.stock, BUILD_DEFS.magetower.cost)) return;
  const mine = provsOf(N.id).filter(p => !S.occ.has(p));
  if (!mine.length || mine.some(p => !aiBuildWhy(N, p, 'magetower'))) return;   // there is room somewhere already
  if (!mine.some(p => aiBuildWhy(N, p, 'magetower') === 'full')) return;
  N.roomAt = S.t + 30;
  const inc = N.income, cap = capitalOf(N.id), list = aiExtraList(N).filter(([p]) => aiBuildWhy(N, p, 'magetower') === 'full');
  const spare = ['market', 'granary', 'storehouse', 'bank', 'stable', 'temple', 'farm', 'lumber', 'goldmine'];
  const ok = ([, e]) => (e.type !== 'farm' || inc.food - ((BUILD_DEFS.farm.gives || {}).food || 3) > 2) && (e.type !== 'lumber' || inc.wood > 6) && (e.type !== 'temple' || aiCount(N, 'temple') > 1);
  const pick = list.filter(ok).sort((a, b) => spare.indexOf(a[1].type) - spare.indexOf(b[1].type) || (b[0] === cap) - (a[0] === cap))
    .find(([, e]) => spare.includes(e.type));
  if (!pick) return;
  const [p, e] = pick; S.extras.set(p, extrasIn(p).filter(x => x !== e)); N.income = aiIncome(N);
}
// what each difficulty likes to research
const AI_MAGIC_PREFS = {
  life: { harvest: 30, bountiful: 25, magnificent: 20, skin: 10, mending: 8 },
  death: { graverob: 30, deathtax: 28, charon: 28, curse1: 10, risen: 8 },
  arcane: { trading: 30, stockmarket: 28, planar: 26, arcscouts: 6, clearthoughts: 3 }
};
function aiTechWeight(N, tree, id) {
  const D = N.diff, x = TECH_BY_ID[id];
  if (D === 'easy') return 1;
  if (tree === 'gov') {
    const W = { mushroom: 5, market: 8, advfarms: 6, advmills: 6, advmines: 4, forts: 9, forts2: 8, forts3: 7, effadmin: 9, 'rep-admin': 5, reffarms: 5, refmills: 5, refmines: 4, sophfarms: 4, sophmills: 4, sophmines: 3, granary: 3, storehouse: 4, bank: 3, retained: 4, retained2: 3, forge: 4, magetower: 4, moat: 3, arrowslits: 3, stable: 2, 'rep-forts': 4, 'rep-storage': 3, 'rep-lumber': 3 };
    if (D === 'difficult') Object.assign(W, { forts: 14, forts2: 13, forts3: 12, magetower: 16, retained: 6, market: 9, forge: 2, walls: 60, walls2: 50 });   // v96: Difficult always takes the walls when offered
    if (D === 'moderate') Object.assign(W, { forge: 7, stable: 4, arrowslits: 4, moat: 5, magetower: N.phase === 'grow' ? 3 : 30 });
    if (aiMagicLate(N)) W.magetower = 500;   // v96: 30 minutes in with no school of magic yet: the Mage Tower comes first
    if (D === 'moderate' && aiProvCount(N) >= 20) Object.assign(W, { walls: 60, walls2: 50 });   // v96: Moderate goes for walls once it has 20 provinces
    return W[id] || 1;
  }
  if (tree === 'mil') {
    if (id.startsWith('a-')) return id.includes(N.armorLine) ? 9 : 2;
    if (id.startsWith('w-')) { const W = WEAPONS[TECH_EQUIP[id]]; return W && W.fam === N.family ? 10 : 2; }
    if (id.startsWith('s-')) return N.family === 'sword' ? 8 : 1;
    if (id === 'battleforge' || id === 'warforge') return 7;
    return x.rep ? 2 : 3;
  }
  if (id.startsWith('school-')) return id === 'school-' + N.wantSchool ? 100 : 1;
  const P = AI_MAGIC_PREFS[N.school] || {};
  if (id === 'sanctum' || id === 'arcanum') return 8;
  if (id === 'rep-magecap' || id === 'apprentice') return 6;
  return P[id] || (x.rep ? 2 : 3);
}
function aiPick(N, tree) {
  const st = N.tech[tree]; if (!st.opts.length) aiDrawOptions(N, tree); if (!st.opts.length) return;
  const w = id => aiTechWeight(N, tree, id) * (0.75 + Math.random() * 0.5);
  const id = st.opts.slice().sort((a, b) => w(b) - w(a))[0];
  st.cur = id; st.prog = st.bank; st.bank = 0; st.opts = st.opts.filter(o => o !== id);
}
function aiFinishTech(N, tree) {
  const st = N.tech[tree], x = TECH_BY_ID[st.cur], cost = aiTechCost(N, x);
  if (x.rep) N.rep[x.id] = aiRep(N, x.id) + 1; else st.done.push(x.id);
  st.bank = Math.min(st.prog - cost, aiTechRate(N, tree) * BANK_SECONDS / TICK); st.prog = 0; st.cur = null;
  if (x.id.startsWith('school-')) N.school = x.id.slice(7);
  if (tree === 'mil') aiRedesign(N);
  aiDrawOptions(N, tree);
}
function aiTechPayday(N) {
  for (const tree of TREE_KEYS) {
    const st = N.tech[tree], T = aiTier(N, tree);
    if (T !== st.tier) { st.tier = T; if (!st.cur) aiDrawOptions(N, tree); }
    if (!T) continue;
    if (!st.cur) aiPick(N, tree);
    const pts = aiTechRate(N, tree);
    if (st.cur) { st.prog += pts; if (st.prog >= aiTechCost(N, TECH_BY_ID[st.cur])) aiFinishTech(N, tree); }
  }
}
// soldiers are designed from the best equipment the nation has researched in its favorite weapon family and armor line
function aiRedesign(N) {
  const fam = FAMILY[N.family], weapon = fam.order.filter(w => !WEAPONS[w].tech || aiHas(N, WEAPONS[w].tech)).pop();
  let armor = N.armorLine + '1';
  for (let lv = 4; lv >= 1; lv--) { const id = N.armorLine + lv, A = ARMORS[id]; if (!A.tech || aiHas(N, A.tech)) { armor = id; break; } }
  if (!ARMORS[armor] || (ARMORS[armor].tech && !aiHas(N, ARMORS[armor].tech))) armor = 'leather1';
  const shield = !WEAPONS[weapon].twoH ? ['aegis', 'tower', 'kite', 'round'].find(s => aiHas(N, SHIELD_DEFS[s].tech)) || null : null;
  const cavW = FAMILY.pole.order.filter(w => !WEAPONS[w].tech || aiHas(N, WEAPONS[w].tech)).pop();
  const horse = aiHas(N, 'horse-training') ? 'friesian' : aiHas(N, 'horse-breeding') ? 'mongolian' : 'riding';
  const sig = [weapon, armor, shield, cavW, horse].join('|'); if (sig === N.designSig) return; N.designSig = sig; N.dv++;
  const role = { pole: 'Pikeman', sword: 'Swordsman', blunt: 'Maceman' }[N.family];
  const inf = { id: `ai${N.id}i${N.dv}`, name: role, type: 'inf', weapon, shield, armor, horse: null };
  const cav = { id: `ai${N.id}c${N.dv}`, name: 'Lancer', type: 'cav', weapon: cavW, shield: null, armor, horse };
  registerDesign(inf); registerDesign(cav);
  N.design = { inf: inf.id, cav: cav.id };
}

// ---------- the AI's plan: what it wants right now ----------
function aiPlan(N) {
  const D = AI_DIFF[N.diff], n = aiProvCount(N), P = { maxProvs: D.maxProvs, wf: D.wf, masons: n >= 6 ? D.masons2 : D.masons };
  const enemies = enemiesOf(N.id), threat = enemies.length > 0;
  const enemyMax = Math.max(0, ...enemies.map(o => soldierCount(o) + alliesOf(o).filter(x => x !== N.id).reduce((n, x) => n + soldierCount(x), 0)));
  if (N.diff === 'moderate') {
    // expand to 10, then research and build towards Mages, then expand to 20;
    // v96: at 20 stop and build an army of about 6000 power (as far as the economy allows), then fill in any land left
    if (N.phase === 'grow' && (n >= 10 || (N.stuckSince !== null && S.t - N.stuckSince > 120 && n >= 6))) N.phase = 'mages';
    if (N.phase === 'mages' && aiMages(N) > 0) N.phase = 'grow2';
    if (N.phase === 'grow2' && (n >= 20 || (N.stuckSince !== null && S.t - N.stuckSince > 180))) { N.phase = 'army'; N.armySince = S.t; }   // (also when there is no land left to take)
    if (N.phase === 'army' && (nationPower(N.id) >= AI_POWER_GOAL.moderate * 0.95 || (aiFoodCapped(N) && S.t - (N.armySince || 0) > 180))) N.phase = 'fill';
    P.maxProvs = N.phase === 'fill' ? 99 : N.phase === 'grow2' || N.phase === 'army' ? 20 : 10;
    if (N.phase === 'army' || N.phase === 'fill') P.powerGoal = AI_POWER_GOAL.moderate;
  }
  // v96: Easy builds up to about 4000 power once it has 10 provinces; Difficult past 20 provinces builds all its food allows
  if (N.diff === 'easy' && n >= 10) P.powerGoal = AI_POWER_GOAL.easy;
  if (N.diff === 'difficult' && n > 20) P.powerGoal = Infinity;
  if (N.diff === 'easy') P.maxProvs = Math.min(P.maxProvs, 10);
  // soldiers wanted: a small guard and enough to meet an enemy
  let army = n < 4 ? 3 : N.diff === 'easy' ? 3 + Math.floor(n / 4) : N.diff === 'moderate' ? 5 + Math.round(n * 0.5) : 4 + Math.round(n * 0.35);
  if (threat) army = Math.max(army, Math.round(enemyMax * (N.diff === 'easy' ? 0.7 : 1.1)));
  if (N.diff === 'moderate' && (N.phase === 'grow2' || N.stuckSince !== null)) army = Math.max(army, Math.round(n * 1.2) + 6);
  P.army = army;
  // forts: enough for the outpost limit, plus one early for Government Tier II (the Mage Tower)
  P.forts = Math.max(N.diff === 'easy' ? 1 : 2, Math.ceil((Math.min(P.maxProvs, 40) - 1) / (perFort(N.id) + 1)));
  P.wantForge = N.diff !== 'easy' && n >= (N.diff === 'difficult' ? 8 : 5);
  P.wantTower = N.diff === 'difficult' || (N.diff === 'moderate' && (N.phase !== 'grow' || aiMagicLate(N))) || (N.diff === 'easy' && n >= 8);
  P.wantTemple = N.diff !== 'easy' && n >= 6;
  P.useCav = N.diff === 'moderate' && n >= 8;
  return P;
}

// v96: army strength goals (power, as shown in the army list) and the food check that limits them
const AI_POWER_GOAL = { easy: 4000, moderate: 6000 };
const aiFoodCapped = N => N.income.food < 2 && !(N.stock.food > 400 && N.income.food >= 0);
// ---------- every couple of seconds: the AI decides ----------
function stepAI(t) {
  if (!S.started) return;
  if (t >= (S.allyCheck || 0)) { S.allyCheck = t + 5; stepAlliances(); }
  for (const N of Object.values(NATIONS)) {
    if (!N.alive) continue;
    aiQueueStep(N, t);
    aiWorkersStep(N, t);
    aiUpgradesStep(N, t);
    if (t < N.think) continue;
    N.think = t + AI_DIFF[N.diff].think;
    if (!provsOf(N.id).length) { killNation(N.id, 0); continue; }
    const P = aiPlan(N);
    aiFortUp(N, P);
    aiRelieveWood(N);
    aiTrain(N, P);
    aiMasons(N, P);
    aiWayfinders(N, P);
    aiArmyOrders(N, P, t);
    aiQuake(N, t);
    if (N.diff !== 'easy' && t >= N.warCheck) { N.warCheck = t + 15 + Math.random() * 10; aiConsiderWar(N, P); }
  }
}
// training: paid up front; 12 s for Wayfinders and Masons, 18 s for soldiers, 30 s for Mages
function aiQueueStep(N, t) {
  for (const q of N.queue.slice()) {
    if (t - q.t0 < trainTime(q.kind)) continue;
    N.queue = N.queue.filter(x => x !== q);
    if (!S.buildings.has(q.prov) || nationOf(q.prov) !== N.id) continue;
    if (q.kind === WAYFINDER || q.kind === MASON) { const u = mkUnit(S.nextId++, q.kind, '', q.prov, 0); u.owner = N.id; u.slot = freeSlot(q.prov, u); [u.x, u.y] = slotPos(q.prov, u.slot); u.born = t; S.units.push(u); continue; }
    let a = S.units.find(v => v.kind === 'army' && v.owner === N.id && v.prov === q.prov && !v.moving && !v.battle && !v.exiting);
    if (a) { a.troops[q.kind] = (a.troops[q.kind] || 0) + 1; a.grew = t; } else aiNewArmy(N, q.prov, { [q.kind]: 1 });
  }
}
const aiQueued = (N, kind) => N.queue.filter(q => q.kind === kind).length;
const aiBusyAt = (N, prov) => N.queue.some(q => q.prov === prov);
function aiTrain(N, P) {
  const st = N.stock, cap = capitalOf(N.id), reserve = 25;
  if (cap >= 0 && !aiBusyAt(N, cap)) {
    for (const [kind, want] of [[MASON, P.masons], [WAYFINDER, P.wf]]) {
      const have = aiUnits(N, kind).length + aiQueued(N, kind);
      if (have < Math.min(want, UNIT_LIMIT[kind] + aiRep(N, kind === MASON ? 'rep-masons' : 'rep-wayfinders')) && st.gold >= UNIT_DEFS[kind].cost.gold + reserve) { pay(st, UNIT_DEFS[kind].cost); N.queue.push({ kind, prov: cap, t0: S.t }); break; }
    }
  }
  // Mages, up to the nation's Mage limit (1 + Mage Academy)
  if (N.school) {
    const towers = aiExtraList(N).filter(([, e]) => e.type === 'magetower').map(([p]) => p).filter(p => !aiBusyAt(N, p));
    if (towers.length && aiMages(N) < 1 + (aiHas(N, 'apprentice') ? 1 : 0) + aiRep(N, 'rep-magecap') && canPay(st, UNIT_DEFS[MAGE].cost) && N.income.food >= 2) { pay(st, UNIT_DEFS[MAGE].cost); N.queue.push({ kind: MAGE, prov: towers[0], t0: S.t }); }
  }
  // soldiers, while the army is short and food allows
  const soldiers = soldierCount(N.id) + N.queue.filter(q => MILITARY.has(q.kind)).length;
  // v96: a power goal keeps the Barracks busy past the head count, but only while food income stays positive
  const goal = P.powerGoal && nationPower(N.id) + N.queue.filter(q => MILITARY.has(q.kind)).length * 75 < P.powerGoal;
  if (soldiers >= P.army && !goal) return;
  if (soldiers >= P.army && goal && aiFoodCapped(N) && !enemiesOf(N.id).length) return;
  const foodOk = N.income.food >= 2 || (N.stock.food > 400 && N.income.food >= -2) || enemiesOf(N.id).length;
  if (!foodOk) return;
  const barracks = aiExtraList(N).filter(([, e]) => e.type === 'barracks').map(([p]) => p);
  for (const p of barracks) {
    if (aiBusyAt(N, p)) continue;
    const stable = extrasIn(p).some(e => e.type === 'stable');
    const kind = P.useCav && stable && Math.random() < 0.3 ? N.design.cav : N.design.inf, cost = UNIT_DEFS[kind].cost;
    if (!canPay(st, cost) || st.gold - (cost.gold || 0) < (enemiesOf(N.id).length ? 0 : 40)) { if (kind !== 'd-sword' && canPay(st, UNIT_DEFS['d-sword'].cost) && enemiesOf(N.id).length) { pay(st, UNIT_DEFS['d-sword'].cost); N.queue.push({ kind: 'd-sword', prov: p, t0: S.t }); } continue; }
    pay(st, cost); N.queue.push({ kind, prov: p, t0: S.t });
  }
}

// ---------- Wayfinders: survey the land around the nation ----------
// a breadth-first walk over the provinces this unit may enter (own, unclaimed or enemy land)
function aiReach(u, limit = 12) {
  const d = new Map([[u.prov, 0]]), q = [u.prov];
  for (let i = 0; i < q.length; i++) { const a = q[i], da = d.get(a); if (da >= limit) continue; for (const n of pathNbr(u, a)) if (!d.has(n.q) && canEnter(u, n.q)) { d.set(n.q, da + 1); q.push(n.q); } }
  return d;
}
function aiWayfinders(N, P) {
  const mine = provsOf(N.id), near = hopsFrom(mine, allNbr);
  for (const u of aiUnits(N, WAYFINDER)) {
    if (u.moving || u.aiSurvey || u.exiting) continue;
    if (u.aiTarget !== undefined && u.aiTarget === u.prov && !N.surveyed.has(u.prov)) { u.aiSurvey = { prov: u.prov, t0: S.t }; continue; }
    const taken = new Set(aiUnits(N, WAYFINDER).filter(v => v !== u && v.aiTarget !== undefined).map(v => v.aiTarget));
    const d = aiReach(u);
    let best = -1, bs = Infinity;
    for (const [p, dist] of d) {
      if (N.surveyed.has(p) || taken.has(p) || S.buildings.has(p) || banditsIn(p) || near[p] > 3) continue;
      const sc = dist + near[p] * 2;
      if (sc < bs) { bs = sc; best = p; }
    }
    if (best < 0) { u.aiTarget = undefined; const cap = capitalOf(N.id); if (cap >= 0 && u.prov !== cap && !u.moving) order(u, cap, true); continue; }
    u.aiTarget = best;
    if (best === u.prov) u.aiSurvey = { prov: best, t0: S.t }; else if (!order(u, best, true)) u.aiTarget = undefined;
  }
}

// ---------- Masons: outposts and buildings ----------
const provValue = (p, N) => { const y = yields[p], woody = N && N.income.wood < 6; return y.food * 1.2 + y.wood * (woody ? 3 : 1) + y.gold * 1.5 + (y.deposit ? 3 : 0) + (setpieceAt(p) ? 3 : 0) + (treeBorder[p] ? (woody ? 4 : 1) : 0); };
function aiOutpostWhy(N, p, self) {
  if (S.buildings.has(p)) return 'taken';
  if (!N.surveyed.has(p)) return 'unsurveyed';
  if (!allNbr[p].some(q => nationOf(q) === N.id)) return 'not bordering';
  if (banditsIn(p)) return 'bandits';
  if (aiOutposts(N) + aiPendingOutposts(N, self) >= aiOutpostLimit(N)) return 'limit';
  return canPay(N.stock, OUTPOST_COST) ? '' : 'cost';
}
function aiBuildWhy(N, p, type, self) {
  const d = BUILD_DEFS[type];
  if (d.tech && !aiHas(N, d.tech)) return 'tech';
  if (nationOf(p) !== N.id || S.occ.has(p)) return 'not ours';
  if (type === 'farm' && !farmLand(p, aiHas(N, 'mushroom'))) return 'terrain';
  if (type === 'lumber' && !treeBorder[p]) return 'trees';
  if (type === 'goldmine' && !(yields[p].deposit && N.surveyed.has(p))) return 'deposit';
  if (countOf(p, type) >= buildCap(p, type)) return 'cap';
  if (usedSlots(p).size + S.units.filter(u => u !== self && u.aiJob && u.aiJob.prov === p && u.aiJob.type !== 'outpost').length >= plotCap(p)) return 'full';
  if (S.units.some(u => u !== self && u.aiJob && u.aiJob.prov === p && u.aiJob.type === type) && countOf(p, type) + 1 >= buildCap(p, type)) return 'cap';
  return '';
}
// a nation whose wood upkeep has run its wood store dry tears down a building it can spare (the player can do the same)
function aiRelieveWood(N) {
  if (N.income.wood >= 0 || N.stock.wood >= 25 || S.t < (N.relieveAt || 0)) return;
  N.relieveAt = S.t + 60;
  const war = enemiesOf(N.id).length, list = aiExtraList(N);
  const pick = list.find(([, e]) => e.type === 'stable') || (!war && list.filter(([, e]) => e.type === 'barracks').length > 1 && list.find(([, e]) => e.type === 'barracks')) || list.find(([, e]) => ['granary', 'storehouse', 'bank'].includes(e.type)) || (N.income.food > 8 && list.find(([, e]) => e.type === 'farm'));
  if (!pick) return;
  const [p, e] = pick; S.extras.set(p, extrasIn(p).filter(x => x !== e)); N.income = aiIncome(N);
}
// the next building the nation wants, and where. "urgent" ones come before new outposts
const KEY_BUILDINGS = new Set(['barracks', 'magetower', 'forge', 'temple', 'goldmine']);
function aiNextBuilding(N, P, skip = new Set()) {
  const inc = N.income, mine = provsOf(N.id), n = mine.length, st = N.stock;
  const has = type => aiCount(N, type) + (skip.has(type) ? 1 : 0);
  const rich = st.gold > aiStorage(N, 'gold') * 0.45 && st.wood > 250;
  const list = [];   // [type, urgent]
  const woodLow = inc.wood < 4 + n * 0.6, foodLow = inc.food < 3 + Math.max(0, P.army - soldierCount(N.id)) * 2 || (P.powerGoal && nationPower(N.id) < P.powerGoal && inc.food < 5);   // v96: power goals want farms
  if (woodLow && inc.food >= 0) list.push(['lumber', true]);
  if (foodLow) list.push(['farm', true]);
  if (woodLow) list.push(['lumber', true]);
  for (const p of mine) if (yields[p].deposit && N.surveyed.has(p) && !aiBuildWhy(N, p, 'goldmine')) { list.push(['goldmine', true]); break; }
  if (!has('barracks') && (n >= 4 || enemiesOf(N.id).length)) list.push(['barracks', true]);
  // v96: Moderate and Difficult put the Mage Tower first (making room for it if they must, aiMakeRoomForTower)
  if (P.wantTower && aiHas(N, 'magetower') && !has('magetower')) { if (!aiMagicLate(N)) list.push(['magetower', true]); else { list.unshift(['magetower', true]); aiMakeRoomForTower(N); } }
  if (P.wantForge && aiHas(N, 'forge') && !has('forge')) list.push(['forge', true]);
  if (P.wantTemple && has('temple') < (rich && N.diff !== 'easy' ? Math.ceil(n / 3) : 1)) list.push(['temple', has('temple') < 1 || rich]);
  if (n >= 12 && has('barracks') < 2 && N.diff !== 'easy') list.push(['barracks', false]);
  if (P.useCav && aiHas(N, 'stable') && !has('stable')) list.push(['stable', false]);
  if (aiHas(N, 'market') && has('market') < Math.ceil(n / (rich ? 1 : 3))) list.push(['market', rich]);
  for (const [k, type] of [['food', 'granary'], ['wood', 'storehouse'], ['gold', 'bank']]) if (aiHas(N, type) && st[k] > aiStorage(N, k) * 0.8 && has(type) < 3) list.push([type, true]);
  if (inc.food < 8 + n) list.push(['farm', rich]);
  if (inc.wood < 10 + n) list.push(['lumber', rich]);
  if (N.diff !== 'easy') list.push(['lumber', rich], ['farm', rich], ['market', rich]);
  const cap = capitalOf(N.id), order = mine.slice().sort((a, b) => (a === cap ? -1 : 0) - (b === cap ? -1 : 0) || provValue(b) - provValue(a));
  for (const [type, urgent] of list) {
    if (skip.has(type) && !['farm', 'lumber', 'market', 'temple'].includes(type)) continue;
    const d = BUILD_DEFS[type];
    // never let a building's wood upkeep push wood income below +1 (Lumber Mills pay for themselves)
    if (type !== 'lumber' && !(type === 'magetower' && aiMagicLate(N)) && inc.wood - ((d.upkeep && d.upkeep.wood) || 0) < 1 && !(type === 'farm' && inc.food < 0)) continue;
    // saving up for a fort (the outpost limit is reached): only Lumber Mills and urgent food
    if (N.saveFort && type !== 'lumber' && !(type === 'farm' && inc.food < 0) && st.wood - (d.cost.wood || 0) < FORT_UPGRADE.cost.wood) continue;
    if (!canPay(st, d.cost)) { if (KEY_BUILDINGS.has(type) && type !== 'temple') return { type, wait: true }; continue; }
    const where = order.find(p => !aiBuildWhy(N, p, type));
    if (where !== undefined) return { type, prov: where, urgent };
  }
  return null;
}
function aiMasons(N, P) {
  const n = aiProvCount(N), D = AI_DIFF[N.diff];
  const free = aiUnits(N, MASON).filter(u => !u.aiJob && !u.build && !u.moving && !u.exiting);
  if (!free.length) return;
  const pend = aiPendingOutposts(N), skip = new Set();
  let freeLand = false, grew = 0;
  for (const u of free) {
    let job = null;
    const b = aiNextBuilding(N, P, skip);
    if (b && !b.wait && b.urgent && (n >= 4 || b.type === 'lumber' || N.income.food < 0)) job = b;
    else if (b && b.wait && N.diff !== 'easy' && KEY_BUILDINGS.has(b.type)) { /* saving up for a key building: don't spend wood on outposts */ if (n >= 4 && N.income.wood >= 3 && N.stock.wood < BUILD_DEFS[b.type].cost.wood + OUTPOST_COST.wood) continue; }
    const wantGrow = !job && n + pend + grew < P.maxProvs && S.t >= N.nextOutpost;
    if (wantGrow) {
      const d = aiReach(u, 14), taken = new Set(S.units.filter(v => v.aiJob || (v.build && v.build.type === 'outpost')).map(v => v.aiJob ? v.aiJob.prov : v.build.prov));
      let best = -1, bs = -Infinity;
      for (const [p, dist] of d) {
        const why = aiOutpostWhy(N, p);
        if (!why || why === 'cost' || why === 'limit') freeLand = true;
        if (why || taken.has(p)) continue;
        if (N.income.wood < 2 && !yields[p].wood && !treeBorder[p]) continue;   // an outpost costs 1 wood upkeep: don't settle barren land while wood is short
        const sc = provValue(p, N) - dist * 0.8; if (sc > bs) { bs = sc; best = p; }
      }
      if (best >= 0) { job = { type: 'outpost', prov: best }; grew++; }
    }
    if (!job && b && !b.wait && (N.diff !== 'easy' || Math.random() < 0.6)) job = b;
    if (!job) continue;
    if (job.type === 'outpost') N.nextOutpost = S.t + D.outpostGap; else skip.add(job.type);
    u.aiJob = { type: job.type, prov: job.prov };
    if (u.prov !== job.prov && !order(u, job.prov, true)) u.aiJob = null;
  }
  // stuck with nowhere left to settle: Moderate nations turn to war
  if (n >= 6 && n < P.maxProvs) { const anyLand = freeLand || aiAnyFreeLand(N); if (!anyLand) { if (N.stuckSince === null) N.stuckSince = S.t; } else N.stuckSince = null; }
}
function aiAnyFreeLand(N) {
  const near = hopsFrom(provsOf(N.id), allNbr);
  for (let p = 0; p < G.provs.length; p++) if (!S.buildings.has(p) && near[p] <= 2 && !banditsIn(p)) return true;
  return false;
}
// each frame: Masons start the job they walked to; Wayfinders finish surveys
function aiWorkersStep(N, t) {
  for (const u of S.units) {
    if (u.owner !== N.id) continue;
    if (u.kind === WAYFINDER && u.aiSurvey) {
      if (u.moving || u.prov !== u.aiSurvey.prov) { u.aiSurvey = null; continue; }
      if (t - u.aiSurvey.t0 >= SURVEY_TIME) { N.surveyed.add(u.prov); u.aiSurvey = null; u.aiTarget = undefined; }
      continue;
    }
    if (u.kind !== MASON || !u.aiJob || u.moving || u.build) continue;
    const j = u.aiJob;
    if (u.prov !== j.prov) { if (!order(u, j.prov, true)) u.aiJob = null; continue; }
    if (j.type === 'outpost') {
      const why = S.units.some(v => v !== u && v.build && v.build.type === 'outpost' && v.build.prov === j.prov) ? 'taken' : aiOutpostWhy(N, j.prov, u);
      if (why) { if (why !== 'cost') u.aiJob = null; else if ((u.aiWait = (u.aiWait || 0) + 1) > 600) { u.aiJob = null; u.aiWait = 0; } continue; }
      pay(N.stock, OUTPOST_COST);
      u.build = { prov: j.prov, type: 'outpost', t0: t, dur: buildTime('outpost'), paid: { ...OUTPOST_COST } };
    } else {
      const d = BUILD_DEFS[j.type], why = aiBuildWhy(N, j.prov, j.type, u);
      if (why || !canPay(N.stock, d.cost)) { if (why || (u.aiWait = (u.aiWait || 0) + 1) > 600) { u.aiJob = null; u.aiWait = 0; } continue; }
      const used = usedSlots(j.prov); let slot = 0; while (used.has(slot)) slot++;
      pay(N.stock, d.cost);
      const [ox, oy] = bslotOf(j.prov, slot);
      u.build = { prov: j.prov, type: j.type, slot, ox, oy, t0: t, dur: buildTime(j.type), paid: { ...d.cost } };
      u.th = Math.atan2(ox + G.provs[j.prov].ic[0] - u.x, oy + G.provs[j.prov].ic[1] - u.y);
    }
    u.aiJob = null; u.aiWait = 0;
  }
}
// when a Mason finishes (the shared build code calls this)
function aiBuilt(u) {
  const N = aiN(u.owner); if (!N) return;
  if (u.build.type === 'outpost') N.surveyed.add(u.build.prov);
  if (u.build.type === 'magetower' && !N.school) aiDrawOptions(N, 'mag');
}
// fort upgrades (15 s) and Forge / Mage Tower upgrades, paid up front like the player's
function aiFortUp(N, P) {
  const st = N.stock, mine = provsOf(N.id);
  const need = aiFortCount(N) < Math.min(P.forts, aiFortLimit(N)) && (aiOutposts(N) + aiPendingOutposts(N) >= aiOutpostLimit(N) - 1 || aiForts(N) < (N.diff === 'easy' ? 1 : 2) && mine.length >= 4);
  N.saveFort = need && !canPay(st, FORT_UPGRADE.cost);
  if (need && canPay(st, FORT_UPGRADE.cost)) {
    // (v96: never a fort on an ally's border: that would end the alliance)
    const cap = capitalOf(N.id), d = hopsFrom(cap >= 0 ? cap : N.capital, allNbr);
    const c = mine.filter(p => S.buildings.get(p).stage === 0 && !N.ups.has(p) && !S.occ.has(p) && !alliesOf(N.id).some(x => allNbr[p].some(q => nationOf(q) === x))).sort((a, b) => Math.abs(d[a] - 2) - Math.abs(d[b] - 2) || provValue(b) - provValue(a))[0];
    if (c !== undefined) { pay(st, FORT_UPGRADE.cost); N.ups.set(c, { t0: S.t }); }
  }
  for (const [type, ids] of [['forge', ['battleforge', 'warforge']], ['magetower', ['sanctum', 'arcanum']]]) {
    for (const [p, e] of aiExtraList(N)) {
      if (e.type !== type) continue;
      const lv = e.level || 1, key = p + '@' + e.slot; if (lv >= 3 || N.xups.has(key) || !aiHas(N, ids[lv - 1])) continue;
      const up = BUILD_DEFS[type].ups[lv]; if (!canPay(st, up.cost)) continue;
      pay(st, up.cost); N.xups.set(key, { t0: S.t, to: lv + 1, time: up.time });
    }
  }
}
function aiUpgradesStep(N, t) {
  for (const [p, u] of N.ups) {
    if (t - u.t0 < FORT_UPGRADE.time) continue;
    N.ups.delete(p);
    const b = S.buildings.get(p); if (b && b.owner === N.id && b.stage === 0) { b.stage = 1; b.born = t; territory = null; provKey = ''; }
  }
  for (const [k, x] of N.xups) {
    if (t - x.t0 < x.time) continue;
    N.xups.delete(k);
    const [p, slot] = k.split('@').map(Number), e = extrasIn(p).find(v => v.slot === slot);
    if (e && nationOf(p) === N.id) { e.level = x.to; e.born = t; }
  }
}
function aiOnTransfer(p, from, to) {
  const F = aiN(from); if (F) { F.ups.delete(p); for (const k of [...F.xups.keys()]) if (k.startsWith(p + '@')) F.xups.delete(k); F.queue = F.queue.filter(q => q.prov !== p); }
  const T = aiN(to); if (T) T.surveyed.add(p);
}

// ---------- armies ----------
function aiArmyOrders(N, P, t) {
  const armies = aiArmies(N), enemies = enemiesOf(N.id), cap = capitalOf(N.id) >= 0 ? capitalOf(N.id) : provsOf(N.id)[0];
  // armies standing in the same province join up
  const byProv = new Map();
  for (const a of armies) if (!a.moving && !a.battle && !a.retreating && !a.exiting) { const o = byProv.get(a.prov); if (o) { for (const k in a.troops) o.troops[k] = (o.troops[k] || 0) + a.troops[k]; o.grew = t; S.units = S.units.filter(v => v !== a); } else byProv.set(a.prov, a); }
  const live = aiArmies(N);
  for (const a of live) {
    if (a.battle) {
      const foes = S.units.filter(v => v.kind === 'army' && v.battle === a.battle && v.owner !== N.id && !v.retreating);
      if (rawStrength([a]) < 0.35 * rawStrength(foes) && retreatTo(a) >= 0) retreat(a);
      continue;
    }
    if (a.retreating || a.exiting || a.retreatHome) continue;
    if (!enemies.length) {
      // peacetime: clear a Bandit Gang next door when strong enough, otherwise stand at the capital
      const goal = N.diff !== 'easy' ? aiBanditGoal(N, a) : -1;
      const tgt = goal >= 0 ? goal : cap;
      if (tgt !== undefined && tgt >= 0 && a.prov !== tgt && !(a.moving && a.final === tgt)) order(a, tgt, true);
      continue;
    }
    if (a.moving && (a.aiPlanT || 0) > t - 5) continue;
    a.aiPlanT = t;
    const best = aiWarGoal(N, a, enemies);
    const tgt = best >= 0 ? best : cap;
    if ((a.moving && a.final === tgt) || (!a.moving && a.prov === tgt)) continue;
    order(a, tgt, true);
  }
}
function aiBanditGoal(N, a) {
  const str = rawStrength([a]), d = aiReach(a, 4);
  let best = -1, bd = Infinity;
  for (const [p, dist] of d) {
    if (!banditsIn(p) || S.buildings.has(p) || !allNbr[p].some(q => nationOf(q) === N.id)) continue;
    const gang = rawStrength(S.units.filter(v => v.bandit && v.prov === p));
    if (str < gang * 2) continue;
    if (dist < bd) { bd = dist; best = p; }
  }
  return best;
}
// at war: defend, take back what was lost, and (when strong enough) occupy the enemy's land
function aiWarGoal(N, a, enemies) {
  const str = rawStrength([a]), d = aiReach(a, 16), goals = [];
  const foeIn = p => rawStrength(S.units.filter(v => v.kind === 'army' && v.prov === p && enemies.includes(v.owner) && !v.retreating));
  const myPow = armyPower(N.id), theirPow = enemies.reduce((s, o) => s + armyPower(o), 0);
  const offense = N.diff === 'moderate' || myPow > theirPow * 1.5;
  for (const [p, b] of S.buildings) {
    if (!d.has(p)) continue;
    if (b.owner === N.id) { const f = foeIn(p); if (f && f <= str * 1.3) goals.push({ p, w: 0 }); else if (S.occ.has(p) && !f) goals.push({ p, w: 1 }); }
    else if (offense && enemies.includes(b.owner) && S.occ.get(p) !== N.id) { const f = foeIn(p); if (f <= str * 0.9) goals.push({ p, w: b.stage === 2 ? 1.5 : 2 }); }
  }
  let best = -1, bd = Infinity;
  for (const g of goals) { const v = d.get(g.p) + g.w * 3; if (v < bd) { bd = v; best = g.p; } }
  return best;
}
// GPC12b: a nation whose armies are at least twice as strong (by estimated power, not head count) as a bordering
// opponent's (with its ally) thinks it over for a minute, then declares war if it still holds
const AI_WAR_THINK = 60, AI_WAR_MARGIN = 1000;
function aiConsiderWar(N, P) {
  if (enemiesOf(N.id).length) { N.warPlan = null; return; }
  // v96: also at least 1000 more power (as shown in the army list) than the target and its allies
  const myPow = armyPower(N.id), ok = o => o !== N.id && aliveNation(o) && !allied(N.id, o) && nationsBorder(N.id, o) && !declareWhy(N.id, o) && myPow >= 2 * Math.max(1, defPower(o)) && (myPow - defPower(o)) * 10 >= AI_WAR_MARGIN;
  if (N.warPlan) {
    if (S.t < N.warPlan.at) { N.warCheck = N.warPlan.at; return; }
    const t = N.warPlan.target; N.warPlan = null;
    if (ok(t)) declareWar(N.id, t);
    return;
  }
  if (myPow <= 0 || N.stock.gold < WAR.declareCost.gold + 20) return;
  const cands = liveNations().filter(ok);
  if (!cands.length) return;
  const t = cands.sort((x, y) => defPower(x) - defPower(y))[0];
  N.warPlan = { target: t, at: S.t + AI_WAR_THINK };
  N.warCheck = N.warPlan.at;
  if (t === ME && knows(N.id)) toast(`The ${PLAYERS[N.id].name} is gathering its armies on your border…`, true);
}
window.__ai = { aiNextBuilding, aiBuildWhy, aiReach, aiMasons, aiUnits, step: secs => { for (let i = 0; i < secs * 10; i++) update(S.last + 0.1); S.last = performance.now() / 1000; }, NATIONS, spawnAINations, aiPlan, aiIncome, aiTechRate, armyPower, defPower, declareWhy, aiConsiderWar, stepAlliances, allyWhy, commonThreat };
