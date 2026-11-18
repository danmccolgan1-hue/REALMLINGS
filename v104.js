
// ================= v104: stances (Normal / Wary / Threatened) and Rivals =================
// Every computer nation now has a stance and, at most, one Rival (both invisible to the player):
// - Threatened: it borders a nation that isn't an ally, is larger, and has a better economy or a vastly stronger army.
//   Economic research takes a back seat (walls, battle magic and military upgrades first), and it builds the biggest army it
//   can whatever the cost: past the food limit, more Barracks, and Farms in place of other buildings when no plot is free.
//   While Threatened it starts no war (its Rival stays its Rival, but isn't its focus).
//   A nation stops threatening it while a third nation is at war with that nation, and the threat is measured against the
//   whole alliance (its size, economy and army plus its ally's).
// - Wary: no longer threatened, or a neighbor that has it as Rival borders it while it is isolated (no ally, and no nation
//   it could ally). A mix of economy and military; with a food deficit (and no war) it dismisses soldiers until food is back
//   to 0+. It returns to Normal once it has an ally or is larger than all its neighbors.
// - Coordinated attacks: two allied computer nations with the same Rival add their armies together to decide when to attack
//   it, declare together, and one joins as soon as its ally is at war with the Rival. Only allies coordinate.
// - Rival: chosen once it has met 2+ bordering neighbors that don't threaten it. One of its own race and one of another:
//   it allies its own race and rivals the other. Only its own race (and no other race met): it rivals one of them and allies
//   the rest against it. Only other races: no Rival (Wary). It builds up and attacks its Rival until the Rival is gone, then
//   picks a new one. A nation that has the player as its Rival refuses to ally him.

const V104_PLAYER_THREATENS = false;   // the request: only a computer nation can make a nation Threatened (true: the player can too)
const V104_THINK = 10;                 // seconds between a nation's diplomacy checks
const V104_LARGER = 1.15;              // "larger": at least 15% more provinces
const V104_ECON = 1.1;                 // "a better economy": at least 10% more gold income + research
const V104_ARMY = 2;                   // "a vastly superior army": twice the army power
const V104_RIVAL_RATIO = { easy: Infinity, moderate: 1.3, difficult: 1.0 };   // own army ≥ the Rival's (with allies) × this to declare (Easy never attacks)
const V104_RIVAL_GOAL = 1.3;           // the army it builds against its Rival: 1.3 × the Rival's power (with allies)
const V104_WARY_GOAL = 0.8;            // Wary: an army at least 0.8 × its strongest neighbor's

// ---------- measuring neighbors ----------
let v104Cache = { k: -1 };
function v104Maps() {
  const k = Math.floor(S.t / 5);
  if (v104Cache.k !== k) v104Cache = { k, B: borderSets(), N: sizes() };
  return v104Cache;
}
const v104Size = o => v104Maps().N.get(o) || 0;
const v104Econ = o => {
  if (o === ME) { const inc = nationIncome(ME) || {}; return (inc.gold || 0) + techRate('gov') + techRate('mil') + techRate('mag'); }
  const N = NATIONS[o]; if (!N) return 0;
  return ((N.income && N.income.gold) || 0) + aiTechRate(N, 'gov') + aiTechRate(N, 'mil') + aiTechRate(N, 'mag');
};
// the nations whose land touches this one's and that it has met
const v104Neighbors = N => [...(v104Maps().B.get(N.id) || [])].filter(o => o !== N.id && aliveNation(o) && hasMet(N.id, o));
function v104Threatens(N, o) {
  if (allied(N.id, o) || (o === ME && !V104_PLAYER_THREATENS) || (o !== ME && !NATIONS[o])) return false;
  if (enemiesOf(o).some(x => x !== N.id)) return false;   // another nation is attacking it: busy elsewhere
  const side = [N.id, ...alliesOf(N.id).filter(x => x !== o && aliveNation(x))];   // the alliance counts as one
  const sum = f => side.reduce((n, x) => n + f(x), 0);
  const mine = sum(v104Size), theirs = v104Size(o);
  if (theirs < Math.max(mine + 1, mine * V104_LARGER)) return false;
  return v104Econ(o) >= sum(v104Econ) * V104_ECON || armyPower(o) >= Math.max(1, sum(armyPower)) * V104_ARMY;
}

// ---------- stance and Rival, every 10 seconds ----------
function v104Think(N) {
  if (S.t < (N.v104at || 0)) return; N.v104at = S.t + V104_THINK;
  if (!N.stance) N.stance = 'normal';
  if (N.rival != null && !aliveNation(N.rival)) { N.rivalWas = N.rival; N.rival = null; }   // the Rival is gone: a new one
  const nb = v104Neighbors(N), threats = nb.filter(o => v104Threatens(N, o));
  if (threats.length) {
    N.stance = 'threatened';
    N.threatBy = threats.sort((a, b) => armyPower(b) - armyPower(a))[0];
  } else if (N.stance === 'threatened') { N.stance = 'wary'; N.threatBy = null; }   // no longer borders the nation that threatened it
  const calm = nb.filter(o => !threats.includes(o));
  if (N.rival == null && calm.length >= 2) v104PickRival(N, calm);
  for (const A of S.allies.filter(A => A.pact && (A.a === N.id || A.b === N.id))) endAlliance(A, 'the war pact is over');   // (from an earlier v104 build)
  if (N.stance === 'threatened') return;
  const hasAlly = alliesOf(N.id).length > 0, bigger = nb.every(o => v104Size(N.id) > v104Size(o));
  const hunted = nb.some(o => o !== ME && NATIONS[o] && NATIONS[o].rival === N.id);   // a Rival on its border
  if (hasAlly || bigger) { N.stance = 'normal'; return; }           // an ally, or larger than all its neighbors: not Wary
  if (!hunted) return;                                              // (Wary after a threat lasts until then)
  // hunted: ally someone if it can; only an isolated nation is Wary
  const cands = liveNations().filter(x => x !== N.id && !allyWhy(N.id, x)).sort((a, b) => armyPower(b) - armyPower(a));
  if (!cands.length) { N.stance = 'wary'; return; }
  const f = cands.find(x => x !== ME) ?? cands[0];
  if (f === ME) { if ((S.allyAsk.get(N.id) || 0) <= S.t && offerAlliance(N.id, nb.find(o => NATIONS[o] && NATIONS[o].rival === N.id))) S.allyAsk.set(N.id, S.t + WAR.allyAskAgain); }
  else formAlliance(N.id, f, nb.find(o => NATIONS[o] && NATIONS[o].rival === N.id));
}

function v104PickRival(N, calm) {
  const race = raceOf(N.id);
  const same = calm.filter(o => raceOf(o) === race), other = calm.filter(o => raceOf(o) !== race);
  // the easiest target among them: one an ally already rivals, else the weakest (with its allies), then the longest border
  const border = o => provsOf(N.id).reduce((n, p) => n + allNbr[p].filter(q => nationOf(q) === o).length, 0);
  const pick = list => list.filter(o => !allied(N.id, o)).sort((a, b) => {
    const ra = alliesOf(N.id).some(x => NATIONS[x] && NATIONS[x].rival === a) ? 0 : 1, rb = alliesOf(N.id).some(x => NATIONS[x] && NATIONS[x].rival === b) ? 0 : 1;
    return ra - rb || defPower(a) - defPower(b) || border(b) - border(a);
  })[0];
  let rival, team = [];
  if (same.length && other.length) { rival = pick(other); team = same; }   // ally its own race, rival the other
  else if (same.length >= 2) {
    // only its own race nearby: rival one of them and team up with the rest (unless it has met another race somewhere)
    const metOther = liveNations().some(o => o !== N.id && raceOf(o) !== race && hasMet(N.id, o));
    if (metOther) return;
    rival = pick(same); team = same.filter(o => o !== rival);
  } else return;   // only other races: no Rival (Wary, v104Think)
  if (rival == null) return;
  N.rival = rival; N.rivalSince = S.t;
  for (const f of team) v104Ally(N, f, rival);
}
function v104Ally(N, f, rival) {
  if (!allied(N.id, f)) {
    if (allyWhy(N.id, f)) return;
    if (f === ME) { if ((S.allyAsk.get(N.id) || 0) <= S.t && offerAlliance(N.id, rival)) S.allyAsk.set(N.id, S.t + WAR.allyAskAgain); return; }
    formAlliance(N.id, f, rival);
  }
  // team up: an allied computer nation without a Rival takes the same one
  const F = NATIONS[f];
  if (F && F.rival == null && rival !== f && !allied(f, rival)) { F.rival = rival; F.rivalSince = S.t; }
}
// a nation whose Rival is the other side never allies it (so the player can't ally a nation that has picked him)
{ const aw = allyWhy; allyWhy = function (a, b) {
  const w = aw(a, b); if (w) return w;
  if ((NATIONS[a] && NATIONS[a].rival === b) || (NATIONS[b] && NATIONS[b].rival === a)) return a === ME || b === ME ? 'They see you as their rival' : 'They are rivals';
  return '';
}; }

// ---------- the plan: army goals for each stance ----------
{ const ap = aiPlan; aiPlan = function (N) {
  const P = ap(N), nb = v104Neighbors(N);
  P.stance = N.stance || 'normal';
  if (P.stance === 'threatened') { P.threat = true; P.powerGoal = Infinity; P.army = Math.max(P.army, soldierCount(N.threatBy) || 0); }
  else {
    if (P.stance === 'wary') { const strongest = Math.max(0, ...nb.map(o => nationPower(o))); if (P.powerGoal !== Infinity) P.powerGoal = Math.max(P.powerGoal, strongest * V104_WARY_GOAL); }
    if (N.rival != null && aliveNation(N.rival) && P.powerGoal !== Infinity) P.powerGoal = Math.max(P.powerGoal, defPower(N.rival) * 10 * V104_RIVAL_GOAL);   // build up against the Rival
  }
  return P;
}; }

// ---------- buildings: Threatened builds for war ----------
const V104_WAR_TYPES = new Set(['farm', 'lumber', 'barracks', 'forge', 'magetower', 'stable']);
const V104_DEMOLISH = ['bank', 'storehouse', 'granary', 'market', 'goldmine', 'temple', 'lumber'];   // what makes room for a Farm, first to last
{ const nb0 = aiNextBuilding; aiNextBuilding = function (N, P, skip = new Set()) {
  if ((N.stance || 'normal') !== 'threatened') return nb0(N, P, skip);
  const inc = N.income;
  // food short and nowhere to put a Farm: tear down an economic building where a Farm would otherwise fit
  if (inc.food < 0 && !aiCanBuild(N, 'farm') && S.t >= (N.v104demo || 0)) v104FarmRoom(N);
  // more Barracks (training is one soldier at a time per Barracks): up to one per 5 provinces, at most 3
  if (aiCountJ(N, 'barracks') < Math.min(3, Math.max(1, Math.floor(aiProvCount(N) / 5))) && !skip.has('barracks')) {
    const d = BUILD_DEFS.barracks, cap = capitalOf(N.id);
    const where = provsOf(N.id).filter(p => !S.occ.has(p)).sort((a, b) => (b === cap) - (a === cap)).find(p => !aiWhyAt(N, p, 'barracks'));
    if (where !== undefined && aiUpkeepOk(N, 'barracks')) return canPay(N.stock, d.cost) ? { type: 'barracks', prov: where, urgent: true } : { type: 'barracks', wait: true };
  }
  const b = nb0(N, P, skip);
  return b && (V104_WAR_TYPES.has(b.type) || N.stock.gold > 400) ? b : null;   // (economy only with gold to spare)
}; }
function v104FarmRoom(N) {
  N.v104demo = S.t + 30;
  const war = aiWood(N) < 15 ? V104_DEMOLISH.filter(t => t !== 'lumber') : V104_DEMOLISH;
  for (const type of war) for (const p of provsOf(N.id)) {
    if (S.occ.has(p) || aiWhyAt(N, p, 'farm') !== 'full') continue;
    const e = extrasIn(p).find(x => x.type === type); if (!e) continue;
    S.extras.set(p, extrasIn(p).filter(x => x !== e)); N.income = aiIncome(N);
    return;
  }
}

// ---------- research by stance ----------
const V104_ECON_TECHS = new Set(['advmills', 'refmills', 'sophmills', 'advmines', 'refmines', 'sophmines', 'market', 'traderoutes', 'rep-trade', 'thugs2', 'thugs3', 'bank', 'storehouse', 'granary', 'rep-storage', 'rep-lumber', 'retained', 'retained2', 'roads', 'roads2', 'roads3', 'autoscout']);
const V104_DEFENSE_TECHS = new Set(['walls', 'walls2', 'moat', 'arrowslits']);
// battle magic: damage first, then protection
const V104_BATTLE_MAGIC = new Set(['curse1', 'curse2', 'curse3', 'risen', 'necro', 'armyofdeath', 'fiery1', 'fiery2', 'fiery3', 'firetrap', 'blazetrap', 'molttrap', 'pathfire', 'pathflame', 'pathinferno', 'wrocks', 'gelemental']);
const V104_GUARD_MAGIC = new Set(['skin', 'stoneskin', 'diamondskin', 'mending', 'rejuvenation', 'restoration', 'rockarmor', 'stasis', 'prison']);
{ const tw = aiTechWeight; aiTechWeight = function (N, tree, id) {
  const w = tw(N, tree, id), s = N.stance || 'normal';
  if (s === 'normal' || id.startsWith('school-') || w <= 0.01) return w;
  const T = s === 'threatened';
  if (tree === 'gov') return V104_DEFENSE_TECHS.has(id) ? w * (T ? 12 : 4) + (T ? 40 : 10) : V104_ECON_TECHS.has(id) ? w * (T ? 0.15 : 0.6) : w;
  if (tree === 'mil') return w * (T ? 3 : 1.6);
  return V104_BATTLE_MAGIC.has(id) ? w * (T ? 6 : 2) + (T ? 30 : 8) : V104_GUARD_MAGIC.has(id) ? w * (T ? 3 : 1.5) + (T ? 10 : 3) : w * (T ? 0.5 : 1);
}; }
{ const pt = aiPriorityTechs; aiPriorityTechs = function (N, tree) {
  const L = pt(N, tree);
  if ((N.stance || 'normal') !== 'threatened') return L;
  if (tree === 'gov') return ['walls', 'walls2', 'moat', 'arrowslits', ...L.filter(id => id !== 'market')];
  if (tree === 'mag' && N.school) return [...LINES_FOR_BATTLE(N.school), ...L];
  return L;
}; }
const LINES_FOR_BATTLE = school => ({ death: ['curse1', 'risen', 'curse2', 'necro'], pyro: ['fiery1', 'firetrap', 'fiery2'], elemental: ['wrocks', 'gelemental'], life: ['skin', 'mending', 'stoneskin'], arcane: ['stasis'] }[school] || []);

// ---------- war: the Rival first; nothing new while Threatened ----------
{ const cw = aiConsiderWar; aiConsiderWar = function (N, P) {
  if (N.diff === 'easy') return;                                     // (v103: Easy never attacks)
  if ((N.stance || 'normal') === 'threatened') { N.warPlan = null; return; }   // defend; the Rival waits
  const r = N.rival;
  if (r == null || !aliveNation(r)) return cw(N, P);
  // allies with the same Rival coordinate (only allies; Easy never attacks; a Threatened ally is busy)
  const partners = alliesOf(N.id).filter(o => NATIONS[o] && NATIONS[o].alive && NATIONS[o].rival === r && NATIONS[o].diff !== 'easy' && (NATIONS[o].stance || 'normal') !== 'threatened');
  // an ally is already fighting the shared Rival: join in
  if (!atWar(N.id, r) && partners.some(o => atWar(o, r)) && nationsBorder(N.id, r) && !declareWhy(N.id, r)) { N.warPlan = null; declareWar(N.id, r); return; }
  if (enemiesOf(N.id).length) { if (N.warPlan && N.warPlan.target !== r) N.warPlan = null; return; }
  const myPow = armyPower(N.id) + partners.reduce((n, o) => n + armyPower(o), 0);   // the alliance attacks together
  const ok = () => !allied(N.id, r) && nationsBorder(N.id, r) && !declareWhy(N.id, r) && myPow > 0 && myPow >= defPower(r) * V104_RIVAL_RATIO[N.diff];
  if (N.warPlan) {
    if (S.t < N.warPlan.at) { N.warCheck = N.warPlan.at; return; }
    N.warPlan = null;
    if (ok() && declareWar(N.id, r)) for (const o of partners) if (!atWar(o, r) && nationsBorder(o, r) && !declareWhy(o, r)) declareWar(o, r);   // the ally declares too
    return;
  }
  if (N.stock.gold < WAR.declareCost.gold + 20 || S.t < (N.peaceUntil || 0) || !ok()) return;
  N.warPlan = { target: r, at: S.t + AI_WAR_THINK }; N.warCheck = N.warPlan.at;
  if (r === ME && knows(N.id)) toast(`The ${PLAYERS[N.id].name}${partners.length ? ` and its ally, the ${PLAYERS[partners[0]].name},` : ''} ${partners.length ? 'are' : 'is'} gathering armies on your border…`, true);
}; }

// ---------- Wary: a food deficit in peacetime means dismissing soldiers ----------
function v104Dismiss(N) {
  if ((N.stance || 'normal') !== 'wary' || enemiesOf(N.id).length || aiFood(N) >= 0 || N.stock.food > 300) return;
  let short = -aiFood(N);
  const armies = S.units.filter(v => v.kind === 'army' && v.owner === N.id && !v.battle && !v.moving && troopCount(v) > 0);
  for (const a of armies) {
    for (const k of Object.keys(a.troops).filter(k => k !== MAGE).sort((x, y) => (UNIT_DEFS[x] && UNIT_DEFS[x].upkeep.food || 0) - (UNIT_DEFS[y] && UNIT_DEFS[y].upkeep.food || 0))) {
      const f = (UNIT_DEFS[k] && UNIT_DEFS[k].upkeep && UNIT_DEFS[k].upkeep.food) || 2;
      while (short > 0 && a.troops[k] > 0) { a.troops[k]--; short -= f; }
      if (!a.troops[k]) delete a.troops[k];
      if (short <= 0) break;
    }
    if (troopCount(a) === 0) removeArmy(a);
    if (short <= 0) break;
  }
  N.income = aiIncome(N);
}

// ---------- hooks ----------
{ const sa = stepAI; stepAI = function (t) {
  if (S.started) for (const N of Object.values(NATIONS)) { if (!N.alive || t < N.think) continue; try { v104Think(N); v104Dismiss(N); } catch (e) { reportError(e, 'ai v104'); } }
  return sa(t);
}; }
window.__v104 = { think: v104Think, threatens: v104Threatens, neighbors: v104Neighbors, econ: v104Econ, pickRival: v104PickRival, stance: o => NATIONS[o] && { stance: NATIONS[o].stance, rival: NATIONS[o].rival, threatBy: NATIONS[o].threatBy } };

// ================= v104: Farm crops =================
// Every Farm grows one of three crops (names by race). Changing a crop takes 10 seconds and only then counts, so the payout
// already under way is unaffected.
// - Staple (Corn / Oyster Mushrooms / Apples): +5 food, the farm research adds to it. 2 wood upkeep.
// - Cash (Wheat / Truffles / Pomegranates): +3 food and +1 gold; no research bonus. 2 wood upkeep.
// - Fiber (Straw / Fungal Threads / Willow): +2 wood and no upkeep, no food. One per province.
// Harvest (Herbomancy) raises the food of every crop and the gold of Cash crops by its percentage.
// The Farm's command card: a crop button (opens the choice) and, on the next row, "Apply to all" with a confirm button.
const CROPS = ['staple', 'cash', 'fiber'];
const CROP_NAMES = { staple: { realm: 'Corn', swamp: 'Oyster Mushrooms', wood: 'Apples' }, cash: { realm: 'Wheat', swamp: 'Truffles', wood: 'Pomegranates' }, fiber: { realm: 'Straw', swamp: 'Fungal Threads', wood: 'Willow' } };
const CROP_KIND = { staple: 'Staple crop', cash: 'Cash crop', fiber: 'Fiber crop' };
const CROP_DELAY = 10;
const CASH_GIVES = { food: 3, gold: 1 }, FIBER_GIVES = { wood: 2 };
const cropOf = e => (e && e.crop) || 'staple';
const cropTarget = e => (e && e.cropNext) || cropOf(e);
const cropName = (crop, race) => CROP_NAMES[crop][race] || CROP_NAMES[crop].realm;
const cropGives = (crop, staple) => crop === 'cash' ? { ...CASH_GIVES } : crop === 'fiber' ? { ...FIBER_GIVES } : { ...staple };
const cropUp = crop => crop === 'fiber' ? 0 : (BUILD_DEFS.farm.upkeep.wood || 0);   // wood upkeep
// a province holds one Fiber crop (grown or on its way)
const fiberTaken = (p, except) => extrasIn(p).some(x => x !== except && x.type === 'farm' && ((cropOf(x) === 'fiber' && !x.cropNext) || x.cropNext === 'fiber'));
function setCrop(p, e, crop) {
  if (cropOf(e) === crop) { delete e.cropNext; delete e.cropAt; return; }   // back to what it grows: nothing to change
  e.cropNext = crop; e.cropAt = S.t + CROP_DELAY;
}
const cropLine = (crop, staple) => { const g = cropGives(crop, staple), up = cropUp(crop); return Object.entries(g).map(([k, v]) => `+${v} ${k}`).join(', ') + (up ? `, ${up} wood upkeep` : ', no upkeep'); };

// ---------- income: the player ----------
{ const eb = extrasBonus; extrasBonus = function (p) {
  const y = eb(p), st = givesOf('farm');
  for (const e of extrasIn(p)) if (e.type === 'farm' && cropOf(e) !== 'staple') { const g = cropGives(cropOf(e), st); for (const k in st) y[k] -= st[k]; for (const k in g) y[k] = (y[k] || 0) + g[k]; }
  return y;
}; }
{ const up0 = upkeep; upkeep = function () {
  const u = up0();
  for (const [p, b] of S.buildings) if (b.owner === ME) for (const e of extrasIn(p)) if (e.type === 'farm' && cropOf(e) === 'fiber') u.wood -= cropUp('staple');
  return u;
}; }
// Harvest: by crop (food from every crop, gold from Cash crops)
{ const ci0 = computeIncome; computeIncome = function () {
  ci0();
  if (!S.harvest) return;
  const pct = harvestPct(), st = givesOf('farm'); let food = 0, gold = 0;
  for (const [p, list] of S.extras) if (owned(p) && !S.occ.has(p)) for (const e of list) if (e.type === 'farm') { const g = cropGives(cropOf(e), st); food += g.food || 0; gold += g.gold || 0; }
  const df = Math.round(food * pct) - harvestFood(), dg = Math.round(gold * pct);
  income.food += df; income.gold += dg;
  if (incomeParts) { incomeParts.gross.food += df; incomeParts.gross.gold += dg; }
}; }

// ---------- income: computer nations ----------
{ const ai0 = aiIncome; aiIncome = function (N) {
  const inc = ai0(N), st = aiGives(N, 'farm');
  let all = 0, food = 0, gold = 0;
  for (const [p, e] of aiExtraList(N)) {
    if (e.type !== 'farm') continue;
    const c = cropOf(e); all++;
    if (c === 'fiber') inc.wood += cropUp('staple');
    if (S.occ.has(p)) continue;
    const g = cropGives(c, st); food += g.food || 0; gold += g.gold || 0;
    if (c === 'staple') continue;
    for (const k in st) inc[k] -= st[k]; for (const k in g) inc[k] = (inc[k] || 0) + g[k];
  }
  if (N.school === 'life' && aiHas(N, 'harvest') && aiMages(N)) {
    const lv = ['harvest', 'bountiful', 'magnificent'].filter(id => aiHas(N, id)).length, pct = HARVEST_PCT[lv] + 0.02 * aiRep(N, 'rep-harvest');
    inc.food += Math.round(food * pct) - Math.round(all * (st.food || 0) * pct);   // (aiIncome counted every Farm as a staple crop)
    inc.gold += Math.round(gold * pct);
  }
  return inc;
}; }

// ---------- a change of crop takes effect after 10 seconds ----------
let cropScanAt = 0;
function stepCrops() {
  if (S.t < cropScanAt) return; cropScanAt = S.t + 0.5;
  const mine = [], touched = new Set();
  for (const [p, list] of S.extras) for (const e of list) if (e.cropNext && S.t >= e.cropAt) {
    e.crop = e.cropNext; delete e.cropNext; delete e.cropAt;
    const o = nationOf(p); if (o === ME) mine.push([p, e]); else if (NATIONS[o]) touched.add(o);
  }
  for (const o of touched) NATIONS[o].income = aiIncome(NATIONS[o]);
  if (mine.length) {
    computeIncome(); provKey = ''; cmdKey = '';
    const c = cropOf(mine[0][1]), same = mine.every(([, e]) => cropOf(e) === c);
    toast(mine.length === 1 ? `The Farm in ${provName(mine[0][0])} now grows ${cropName(c, raceOf(ME))}.` : same ? `${mine.length} Farms now grow ${cropName(c, raceOf(ME))}.` : `${mine.length} Farms changed their crop.`);
  }
}

// ---------- pictures ----------
const CROP_ICON = {};
function cropIcon(crop, race = raceOf(ME)) {
  const key = crop + race; if (CROP_ICON[key]) return CROP_ICON[key];
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  const blob = (x, y, rx, ry, col, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); };
  const line = (pts, w, col) => { g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); g.lineWidth = w + 4; g.strokeStyle = OL; g.stroke(); g.lineWidth = w; g.strokeStyle = col; g.stroke(); };
  // the resource it gives, small in the bottom-right corner: corn (food), a coin (gold) or wood
  const badge = k => { g.beginPath(); g.arc(68, 68, 17, 0, 7); g.fillStyle = '#fff8e6'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = OL; g.stroke(); resIcon(g, k, 68, 69, k === 'food' ? 1.05 : 1.25); };
  if (crop === 'staple') {
    if (race === 'swamp') { blob(44, 38, 26, 15, '#d8d2c2'); g.beginPath(); g.rect(37, 44, 14, 26); g.fillStyle = '#efe8d8'; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); blob(44, 38, 26, 15, '#d8d2c2'); }
    else if (race === 'wood') { blob(44, 50, 24, 22, '#d23b2b'); line([[44, 30], [46, 18]], 4, '#6b4a2a'); blob(56, 22, 9, 5, '#4f9a3c', -0.5); }
    else resIcon(g, 'food', 36, 42, 2.1);   // an ear of corn
    badge('food');
  } else if (crop === 'cash') {
    if (race === 'swamp') { blob(40, 44, 22, 19, '#4a3a2e'); for (const [x, y] of [[32, 38], [46, 34], [40, 50], [50, 46]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fillStyle = '#7a6450'; g.fill(); } }
    else if (race === 'wood') { blob(40, 46, 22, 21, '#b0284a'); line([[34, 26], [40, 20], [46, 26]], 3, '#e86a7e'); for (const [x, y] of [[34, 44], [44, 40], [40, 52], [48, 50]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fillStyle = '#ffd1dc'; g.fill(); } }
    else { for (const dx of [-12, 0, 12]) { line([[40 + dx * 0.4, 76], [40 + dx, 30]], 3, '#c9a43a'); blob(40 + dx, 26, 6, 13, '#f0c64a', dx * 0.02); } }
    badge('gold');
  } else {
    if (race === 'swamp') { for (const dx of [-14, 0, 14]) { g.beginPath(); g.moveTo(40 + dx, 74); g.bezierCurveTo(30 + dx, 56, 50 + dx, 40, 38 + dx, 16); g.lineWidth = 7; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#e8e2f0'; g.stroke(); } }
    else if (race === 'wood') { line([[40, 76], [40, 18]], 5, '#7a5a3a'); for (const [x, s] of [[40, -1], [40, 1]]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x, 24 + k * 14); g.quadraticCurveTo(x + s * 18, 28 + k * 14, x + s * 20, 46 + k * 12); g.lineWidth = 6; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#7fbf5a'; g.stroke(); } }
    else { for (const dx of [-16, -8, 0, 8, 16]) line([[40 + dx * 0.25, 48], [40 + dx, 14]], 3.5, '#e8cf7a'); for (const dx of [-16, -8, 0, 8, 16]) line([[40 + dx * 0.25, 48], [40 + dx * 0.8, 78]], 3.5, '#d9bc5e'); line([[30, 48], [50, 48]], 5, '#a8662a'); }   // a tied bundle of straw
    badge('wood');
  }
  return CROP_ICON[key] = c.toDataURL();
}
// "Apply to all": a circle of three arrows
const cropAllIcon = (() => { let url = null; return () => url || (url = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const a0 = k * 2.094 - 1.4, a1 = a0 + 1.55;
    g.beginPath(); g.arc(44, 44, 27, a0, a1); g.lineWidth = 10; g.strokeStyle = OL; g.stroke(); g.lineWidth = 5.5; g.strokeStyle = '#3f9b4b'; g.stroke();
    const x = 44 + 27 * Math.cos(a1), y = 44 + 27 * Math.sin(a1);
    g.save(); g.translate(x, y); g.rotate(a1 + Math.PI / 2); g.beginPath(); g.moveTo(-9, -6); g.lineTo(8, 0); g.lineTo(-9, 7); g.closePath(); g.fillStyle = '#3f9b4b'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.restore();
  }
  return c.toDataURL(); })()); })();
const cropOkIcon = (() => { let url = null; return () => url || (url = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.arc(44, 44, 30, 0, 7); g.fillStyle = '#d7f0d0'; g.fill(); g.lineWidth = 5; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.moveTo(28, 46); g.lineTo(40, 58); g.lineTo(62, 32); g.lineWidth = 13; g.strokeStyle = OL; g.stroke(); g.lineWidth = 7; g.strokeStyle = '#3f9b4b'; g.stroke();
  return c.toDataURL(); })()); })();

// ---------- "Apply to all": which Farms would change, and what it does to income ----------
function cropAllPlan(crop) {
  const st = givesOf('farm'), plan = [];
  for (const [p, b] of S.buildings) {
    if (b.owner !== ME || S.occ.has(p)) continue;
    const farms = extrasIn(p).filter(e => e.type === 'farm'); if (!farms.length) continue;
    if (crop === 'fiber') {
      if (fiberTaken(p)) continue;
      // one per province: the Farm that loses the least food (a Cash crop before a Staple crop)
      const f = farms.slice().sort((a, b) => (cropGives(cropTarget(a), st).food || 0) - (cropGives(cropTarget(b), st).food || 0))[0];
      plan.push([p, f]);
    } else for (const f of farms) if (cropTarget(f) !== crop) plan.push([p, f]);
  }
  const d = { gold: 0, wood: 0, food: 0 };
  for (const [, f] of plan) { const a = cropGives(cropOf(f), st), z = cropGives(crop, st); for (const k of RES) d[k] += (z[k] || 0) - (a[k] || 0); d.wood += cropUp(cropOf(f)) - cropUp(crop); }
  return { plan, d };
}
const fmtDelta = d => RES.filter(k => d[k]).map(k => `${d[k] > 0 ? '+' : '−'}${Math.abs(d[k])} ${k}`).join(', ') || 'no change';
let cropAllArm = null;   // { p, slot, t }: "Apply to all" was clicked; the confirm button waits 8 s
const cropAllArmed = () => cropAllArm && cropAllArm.p === S.selProv && S.selPart && cropAllArm.slot === +S.selPart.split('@')[1] && performance.now() - cropAllArm.t < 8000;
const selFarm = () => { const e = S.selProv >= 0 && S.selPart ? extraAt(S.selProv, S.selPart) : null; return e && e.type === 'farm' && nationOf(S.selProv) === ME ? e : null; };

// ---------- the Farm's command card ----------
{ const rb = renderBuildingCard; renderBuildingCard = function () {
  const e = selFarm(); if (!e) return rb();
  const race = raceOf(ME), armedD = armed['destroy:' + S.selProv + '@' + e.slot] ? 1 : 0, on = cropAllArmed();
  const key = 'farm|' + S.selProv + '|' + S.selPart + '|' + cropOf(e) + '|' + (e.cropNext || '') + '|' + on + '|' + armedD;
  if (key !== cmdKey) {
    cmdKey = key;
    $q('#cmdTabs').innerHTML = `<span class="cmd-tab" aria-selected="true"><img alt="" src="${buildThumb('farm')}">Farm: ${cropName(cropOf(e), race)}</span>`;
    const cells = new Array(16).fill('<div class="cmd-cell"></div>');
    cells[0] = `<button type="button" class="cmd-btn" data-cmd="crop" aria-label="Choose a crop"><img alt="" src="${cropIcon(cropTarget(e))}">${e.cropNext ? '<i class="cmd-prog"><s></s></i>' : ''}</button>`;
    cells[4] = `<button type="button" class="cmd-btn${on ? ' glow' : ''}" data-cmd="cropall" aria-label="Apply to all"><img alt="" src="${cropAllIcon()}"></button>`;
    if (on) cells[5] = `<button type="button" class="cmd-btn glow" data-cmd="cropok" aria-label="Confirm: apply to all"><img alt="" src="${cropOkIcon()}"></button>`;
    cells[15] = `<button type="button" class="cmd-btn" data-cmd="destroy" aria-label="Destroy building"><img alt="" src="${xIcon('destroy')}"></button>`;
    $q('#cmdGrid').innerHTML = cells.join('');
    if (cmdHover) showCmdTip(cmdHover);
  }
  const bar = $q('#cmdGrid .cmd-prog s'); if (bar && e.cropNext) bar.style.width = Math.min(100, (1 - (e.cropAt - S.t) / CROP_DELAY) * 100) + '%';
  if (cropAllArm && !on && performance.now() - cropAllArm.t >= 8000) { cropAllArm = null; cmdKey = ''; }
}; }
{ const ci = cmdInfo; cmdInfo = function (id) {
  if (id !== 'crop' && id !== 'cropall' && id !== 'cropok') return ci(id);
  const e = selFarm(), race = raceOf(ME), st = givesOf('farm');
  if (!e) return { name: 'Crop', desc: '', why: 'Select one of your Farms' };
  const t = cropTarget(e), nm = cropName(t, race);
  if (id === 'crop') return { name: `Crop: ${cropName(cropOf(e), race)}${e.cropNext ? ` → ${nm} in ${Math.max(0, Math.ceil(e.cropAt - S.t))} s` : ''}`, icon: cropIcon(t),
    desc: CROPS.map(c => `<br>${cropName(c, race)} (${CROP_KIND[c].toLowerCase()}): ${cropLine(c, st)}${c === 'fiber' ? '. One per province' : c === 'staple' ? '. Farm research adds to it' : ''}`).join('') + `<br>A new crop takes ${CROP_DELAY} s and counts from the payout after that.`, ok: 'Click to choose a crop' };
  const { plan, d } = cropAllPlan(t);
  const why = plan.length ? null : t === 'fiber' ? `Every province with a Farm already grows ${nm}` : `Every Farm already grows ${nm}`;
  if (id === 'cropall') return { name: `Apply to all: ${nm}`, icon: cropAllIcon(), desc: `Plant ${nm} in every Farm you own${t === 'fiber' ? ' (one per province, the Farm that loses the least food)' : ''}. ${plan.length} Farm${plan.length === 1 ? '' : 's'} would change: ${fmtDelta(d)} every 10 s.`, why, ok: on2() };
  return { name: `Confirm: ${plan.length} Farm${plan.length === 1 ? '' : 's'} to ${nm}`, icon: cropOkIcon(), desc: `Every 10 s: ${fmtDelta(d)}${income.food + d.food < 0 ? '. <b>Your food income would be negative.</b>' : ''}. Takes ${CROP_DELAY} s.`, why, ok: 'Click to apply' };
  function on2() { return cropAllArmed() ? 'Click the green button next to it to confirm' : 'Click, then confirm'; }
}; }
{ const cu = cmdUse; cmdUse = function (id) {
  if (id !== 'crop' && id !== 'cropall' && id !== 'cropok') return cu(id);
  const e = selFarm(); if (!e) return;
  const p = S.selProv, race = raceOf(ME), st = givesOf('farm');
  if (id === 'crop') {
    cropPick = { p, slot: e.slot };
    popNearCard(`<div class="bm-head"><b>Crop for this Farm</b><span>${provName(p)} · changes in ${CROP_DELAY} s</span></div>` + CROPS.map(c => {
      const no = c === 'fiber' && cropTarget(e) !== 'fiber' && fiberTaken(p, e) ? `${provName(p)} already grows ${cropName('fiber', race)}` : '';
      const cur = cropOf(e) === c ? (e.cropNext ? ' · grows now' : ' · grows now') : e.cropNext === c ? ' · on its way' : '';
      return `<button type="button" class="bm-item" data-crop="${c}"${no ? ' aria-disabled="true"' : ''} title="${no}"><img alt="" src="${cropIcon(c)}" style="width:34px;height:34px"><span class="bm-name">${cropName(c, race)}${cur}<small>${CROP_KIND[c]}: ${cropLine(c, st)}${no ? ' · ' + no : c === 'fiber' ? ' · one per province' : ''}</small></span></button>`;
    }).join(''));
    return;
  }
  if (id === 'cropall') { cropAllArm = cropAllArmed() ? null : { p, slot: e.slot, t: performance.now() }; cmdKey = ''; return; }
  const t = cropTarget(e), { plan } = cropAllPlan(t);
  for (const [q, f] of plan) setCrop(q, f, t);
  cropAllArm = null; cmdKey = ''; provKey = '';
  if (plan.length) toast(`${plan.length} Farm${plan.length === 1 ? '' : 's'} will grow ${cropName(t, race)} in ${CROP_DELAY} s.`);
}; }
let cropPick = null;
menuEl.addEventListener('click', ev => {
  const b = ev.target.closest('[data-crop]'); if (!b) return;
  ev.stopImmediatePropagation();
  if (b.getAttribute('aria-disabled') === 'true') { toast(b.title + '.', true); return; }
  const k = cropPick, e = k && extraAt(k.p, 'farm@' + k.slot); closeBuildMenu(); cropPick = null;
  if (!e || nationOf(k.p) !== ME) return;
  const c = b.dataset.crop; setCrop(k.p, e, c); cmdKey = ''; provKey = '';
  toast(cropOf(e) === c && !e.cropNext ? `The Farm keeps growing ${cropName(c, raceOf(ME))}.` : `The Farm will grow ${cropName(c, raceOf(ME))} in ${CROP_DELAY} s.`);
}, true);
// the province menu names the crop
{ const pi = partInfo; partInfo = function (p, part, lvE) {
  const r = pi(p, part, lvE);
  if (part === 'farm' && lvE && r) {
    const o = nationOf(p), race = o >= 0 && PLAYERS[o] ? raceOf(o) : raceOf(ME), c = cropOf(lvE), st = o === ME ? givesOf('farm') : NATIONS[o] ? aiGives(NATIONS[o], 'farm') : givesOf('farm');
    r.name = `Farm: ${cropName(c, race)}`; r.img = cropIcon(c, race);
    r.desc = `${CROP_KIND[c]}: ${cropLine(c, st)} every 10 s` + (lvE.cropNext ? ` · switching to ${cropName(lvE.cropNext, race)} in ${Math.max(0, Math.ceil(lvE.cropAt - S.t))} s` : '');
  }
  return r;
}; }

// ---------- computer nations: Fiber crops when wood is scarce (an exception to "Farms only while food is negative") ----------
const aiWoodScarce = N => aiWood(N) < 3 || (aiWood(N) < 10 && !aiCanBuild(N, 'lumber'));
const aiFarms = N => aiExtraList(N).filter(([p, e]) => e.type === 'farm' && !S.occ.has(p));
// a Farm that could become a Fiber crop without pushing food income below zero
function aiFiberCandidate(N) {
  const st = aiGives(N, 'farm');
  return aiFarms(N).filter(([p, e]) => cropTarget(e) !== 'fiber' && !fiberTaken(p, e) && aiFood(N) - (cropGives(cropTarget(e), st).food || 0) >= 0)
    .sort(([, a], [, b]) => (cropGives(cropTarget(a), st).food || 0) - (cropGives(cropTarget(b), st).food || 0))[0];
}
function v104Crops(N) {
  if (S.t < (N.cropThink || 0)) return; N.cropThink = S.t + 10;
  const farms = aiFarms(N); if (!farms.length || farms.some(([, e]) => e.cropNext)) return;   // one change at a time
  const st = aiGives(N, 'farm'), food = aiFood(N), wood = aiWood(N), T = (N.stance || 'normal') === 'threatened';
  const find = c => farms.find(([, e]) => cropOf(e) === c);
  // food short: Cash back to Staple first, then Fiber back to Staple if wood allows
  if (food < 0) { const f = find('cash') || (wood >= 10 && find('fiber')); if (f) setCrop(f[0], f[1], 'staple'); return; }
  // wood scarce: a Fiber crop (one per province)
  if (aiWoodScarce(N) && !(T && wood >= 2)) { const f = aiFiberCandidate(N); if (f) { setCrop(f[0], f[1], 'fiber'); return; } }
  // plenty of wood again and food tight: Fiber back to Staple
  if (wood > 25 && food < 6) { const f = find('fiber'); if (f) { setCrop(f[0], f[1], 'staple'); return; } }
  // short of gold with food to spare: a Cash crop (it keeps 3 of the food)
  const goldShort = N.stock.gold < 150 || aiStage(N).noGold;
  if (!T && goldShort && food - ((st.food || 5) - CASH_GIVES.food) >= 4) { const f = find('staple'); if (f) { setCrop(f[0], f[1], 'cash'); return; } }
  if ((T || !goldShort) && food < 4) { const f = find('cash'); if (f) setCrop(f[0], f[1], 'staple'); }
}
// a new Farm for its Fiber crop when wood is scarce and no Farm can be switched to one
{ const nb1 = aiNextBuilding; aiNextBuilding = function (N, P, skip = new Set()) {
  if (!skip.has('farm') && aiWoodScarce(N) && !aiFiberCandidate(N) && !S.units.some(u => u.owner === N.id && ((u.aiJob && u.aiJob.type === 'farm') || (u.build && u.build.type === 'farm')))) {
    const where = provsOf(N.id).filter(p => !S.occ.has(p) && !fiberTaken(p) && !extrasIn(p).some(e => e.type === 'farm')).find(p => !aiWhyAt(N, p, 'farm'));
    if (where !== undefined) return canPay(N.stock, BUILD_DEFS.farm.cost) ? { type: 'farm', prov: where, urgent: true } : { type: 'farm', wait: true };
  }
  return nb1(N, P, skip);
}; }
{ const sa = stepAI; stepAI = function (t) {
  if (S.started) {
    try { stepCrops(); } catch (e) { reportError(e, 'crops'); }
    for (const N of Object.values(NATIONS)) { if (!N.alive || t < N.think) continue; try { v104Crops(N); } catch (e) { reportError(e, 'ai crops'); } }
  }
  return sa(t);
}; }
window.__cd = N => aiCounterDesigns(N);
window.__crops = { setCrop, cropOf, cropAllPlan, stepCrops, v104Crops };

// ================= v104: computer armies attack walls; counter designs keep their race =================
// Walls: the computer chose its war goals with a reach map that treated every enemy wall as impassable, so a province
// behind a wall was never a goal (even with nothing guarding it). Now an army big enough to batter a wall (SIEGE_MIN
// soldiers) and at war counts a hostile wall as passable at the cost of 3 extra provinces of marching (the siege takes
// 2 minutes): an undefended province behind a wall is worth it unless an open target is about as close. The march itself
// already batters walls on the way (findPath falls back to a route through them).
const AI_SIEGE_HOPS = 3;
{ const r0 = aiReach; aiReach = function (u, limit = 12) {
  if (u.kind !== 'army' || !S.walls.size || !isNation(u.owner) || troopCount(u) < SIEGE_MIN || !enemiesOf(u.owner).length) return r0(u, limit);
  const d = new Map([[u.prov, 0]]), q = [[0, u.prov]];
  while (q.length) {
    let bi = 0; for (let i = 1; i < q.length; i++) if (q[i][0] < q[bi][0]) bi = i;
    const [da, a] = q.splice(bi, 1)[0];
    if (da > d.get(a) || da >= limit) continue;
    for (const n of pathNbr(u, a, true)) {
      if (!canEnter(u, n.q)) continue;
      const nd = da + 1 + (n.siege !== undefined ? AI_SIEGE_HOPS : 0);
      if (!d.has(n.q) || nd < d.get(n.q)) { d.set(n.q, nd); q.push([nd, n.q]); }
    }
  }
  return d;
}; }

// Counter designs (Pikemen and Macemen after a lost battle, and the v103 mixed armies) were registered without a race, so
// a Woodling or Swampling nation trained Realmling soldiers (looks and stats). They now carry the nation's race and names.
const CD_NAMES = { wood: ['Spear Protector', 'Club Protector'], swamp: ['Spear Berserker', 'Club Berserker'], realm: ['Pikeman', 'Maceman'] };
aiCounterDesigns = function (N) {
  const race = N.race || 'realm';
  const best = fam => (FAMILY[fam] ? FAMILY[fam].order : []).filter(w => WEAPONS[w] && (!WEAPONS[w].tech || aiHas(N, WEAPONS[w].tech))).pop();
  const main = DSTATS[N.design.inf] ? designById2(N.design.inf) : null;
  const armor = main ? main.armor : race === 'wood' ? 'spirit1' : race === 'swamp' ? 'stag1' : 'leather1', pole = best('pole'), blunt = best('blunt');
  const shield = race === 'realm' && blunt && !WEAPONS[blunt].twoH ? ['tower', 'kite', 'round'].find(x => SHIELD_DEFS[x] && aiHas(N, SHIELD_DEFS[x].tech)) || null : null;
  const sig = [race, armor, pole, blunt, shield, 'blunt1h', aiHas(N, 'dualwield') ? 'dw' : ''].join('|');
  if (N.cdSig === sig && N.cdes && DSTATS[N.cdes.pole] && DSTATS[N.cdes.blunt]) return N.cdes;
  N.cdSig = sig; N.cdv = (N.cdv || 0) + 1;
  const [pn, bn] = CD_NAMES[race] || CD_NAMES.realm, r = race === 'realm' ? {} : { race };
  const pd = { id: `ai${N.id}p${N.cdv}`, name: pn, type: 'inf', weapon: pole || 'spear', shield: null, armor, horse: null, ...r };
  const bd = { id: `ai${N.id}b${N.cdv}`, name: bn, type: 'inf', weapon: blunt || 'club', shield, armor, horse: null, ...r, ...(race === 'wood' ? { two: true } : {}), ...(race === 'swamp' && aiHas(N, 'dualwield') ? { off: blunt || 'club' } : {}) };
  registerDesign(pd); registerDesign(bd);
  return (N.cdes = { pole: pd.id, blunt: bd.id });
};
// soldiers already trained from such a design (in a saved game) are given back their nation's race
let cdFixAt = 0;
function fixCounterRace() {
  if (S.t < cdFixAt) return; cdFixAt = S.t + 5;
  for (const d of ALL_DESIGNS.values()) {
    const m = /^ai(\d+)[pb]\d+$/.exec(d.id); if (!m) continue;
    const N = NATIONS[+m[1]]; if (!N || !N.race || N.race === 'realm' || d.race === N.race) continue;
    d.race = N.race; if (d.race === 'wood') d.shield = null;
    registerDesign(d);
  }
}
{ const sa = stepAI; stepAI = function (t) {
  if (S.started) try { fixCounterRace(); } catch (e) { reportError(e, 'counter designs'); }
  return sa(t);
}; }

// =====================================================================================================================
// ================= v104: ranged units: Crossbowmen (Realmlings), Slingers (Swamplings), Archers (Woodlings) =================
// =====================================================================================================================
// One ranged unit per race, trained at a Barracks once the nation owns a Forge: 20 health, no armor, 60 gold, 1 food.
// Two Military technologies re-arm them (the equipment changes, not the ammunition): attack 6, then 9, then 12. Every
// ranged soldier of the nation is re-armed the moment the technology is done. From the back row they deal full damage;
// in the front row (or in an army too small for rows) only 40%. By default they fill an army from the back; the Rows menu
// can order them to the front. If they are more than half of the army they always stand at the back, and the other unit
// types may then be ordered to the back too.
const RNG_HP = 20, RNG_ATK = [6, 9, 12], RNG_COST = { gold: 60 }, RNG_UPKEEP = { food: 1 }, RNG_FRONT = 0.4, RNG_SPEED = 0.75;
const RANGED = {
  realm: { id: 'rng-realm', name: 'Crossbowman', gear: ['handcrossbow', 'levercrossbow', 'windlasscrossbow'], gearName: ['Hand-drawn Crossbow', 'Lever Crossbow', 'Windlass Crossbow'], techs: ['w-levercrossbow', 'w-windlass'] },
  swamp: { id: 'rng-swamp', name: 'Slinger', gear: ['woolsling', 'braidedsling', 'leathersling'], gearName: ['Wool Sling', 'Braided Sling', 'Leather Sling'], techs: ['w-braidedsling', 'w-leathersling'] },
  wood:  { id: 'rng-wood', name: 'Archer', gear: ['shortbow', 'compositebow', 'longbow'], gearName: ['Short Bow', 'Composite Bow', 'Long Bow'], techs: ['w-compositebow', 'w-longbow'] }
};
const RNG_BY_KIND = Object.fromEntries(Object.entries(RANGED).map(([race, R]) => [R.id, { ...R, race }]));
const isRng = k => !!RNG_BY_KIND[k];
const rngKindOf = race => (RANGED[race] || RANGED.realm).id;
const ownerHas = (o, id) => o === ME ? hasTech(id) : NATIONS[o] && NATIONS[o].tech ? aiHas(NATIONS[o], id) : false;
// the equipment tier (0, 1, 2) of an owner's ranged soldiers of kind k
function rngTier(k, o) { const R = RNG_BY_KIND[k]; if (!R) return 0; return ownerHas(o, R.techs[0]) ? (ownerHas(o, R.techs[1]) ? 2 : 1) : 0; }
const rngForgeOf = o => o === ME ? levelsOf('forge').length > 0 : [...S.extras].some(([p, l]) => nationOf(p) === o && l.some(e => e.type === 'forge'));

// ---------- stats, names, technologies ----------
for (const k in RNG_BY_KIND) {
  const R = RNG_BY_KIND[k];
  DSTATS[k] = { cav: false, ogre: false, race: R.race, ranged: true, rough: false, plate: false, fam: 'ranged', atk: RNG_ATK[0], hp: RNG_HP, armor: 0, shieldArmor: 0, red: 0, parry: 0, crit: 0, speed: RNG_SPEED, cost: { ...RNG_COST }, upkeep: { ...RNG_UPKEEP }, blurb: '' };
  UNIT_DEFS[k] = { name: R.name, cost: { ...RNG_COST }, upkeep: { ...RNG_UPKEEP }, design: true, ranged: true };
  Object.defineProperty(UNIT_DEFS[k], 'blurb', { configurable: true, enumerable: true, get() {
    const tr = rngTier(k, ME);
    return `Ranged soldier with a ${R.gearName[tr]}: 20 health, no armor, attack ${RNG_ATK[tr]}. Full damage from the back row, only 40% in the front row (or in an army of fewer than ${ROW_MIN}). Fills an army from the back.${tr < 2 ? ` Research ${TECH_BY_ID[R.techs[tr]] ? TECH_BY_ID[R.techs[tr]].name : R.gearName[tr + 1]} to re-arm them.` : ''}`;
  } });
  MILITARY.add(k); UNIT_SPEED[k] = RNG_SPEED;
  R.techs.forEach((id, i) => {
    TECH_EQUIP[id] = R.gear[i + 1];
    const x = { id, tree: 'mil', tier: i + 1, cost: TECH_COST[i + 1], race: R.race, req: i ? R.techs[0] : null, ranged: true, name: R.gearName[i + 1] + 's',
      blurb: `Your ${PLURAL_OF(R.name)} trade the ${R.gearName[i]} for the ${R.gearName[i + 1]}: attack ${RNG_ATK[i + 1]} (from ${RNG_ATK[i]}). Every ${R.name} you have is re-armed at once, in the field too.` };
    if (!TECH_BY_ID[id]) { TECHS.push(x); TECH_BY_ID[id] = x; }
  });
}
Object.assign(ITEM_SPAN, { shortbow: [-40, 36], compositebow: [-48, 44], longbow: [-70, 56], handcrossbow: [-50, 16], levercrossbow: [-50, 16], windlasscrossbow: [-50, 18], woolsling: [-6, 56], braidedsling: [-6, 56], leathersling: [-6, 58] });
// attack by the owner's equipment tier (statsOf passes every lookup through artStats)
{
  const as = artStats, cache = new WeakMap();
  artStats = function (k, st, o) {
    const r = as(k, st, o); if (!isRng(k)) return r;
    const tr = rngTier(k, o); if (!tr) return r;
    let m = cache.get(r); if (!m) cache.set(r, m = {});
    return m[tr] || (m[tr] = { ...r, atk: r.atk + RNG_ATK[tr] - RNG_ATK[0] });
  };
}

// ---------- the unit models: each race's light infantry, with the weapon of its tier ----------
{
  const P = RealmIso.P;
  const looks = {
    realm: tr => RealmIso.base({ right: RANGED.realm.gear[tr], left: null, angS: 1.1, angF: 0.5, helm: 'flatcap', helmColor: '#5a6b3a', shirt: '#6b7a44', sleeve: '#6b7a44', pants: '#5c4a36', tabard: tr >= 1 ? '#4f5f30' : null, tabardTrim: tr >= 2 ? P.gold : null }),
    swamp: tr => RealmIso.swamp({ right: RANGED.swamp.gear[tr], left: null, angS: 0.35, crouch: true, brows: 'angry', shirt: '#8a7a52', pants: '#5c4a30', tabard: tr >= 1 ? '#6b5a3a' : null, tabardTrim: tr >= 2 ? '#efe6cf' : null, gloves: tr >= 2 ? '#6b5a3a' : undefined }),
    wood: tr => RealmIso.wood(Object.assign({ right: RANGED.wood.gear[tr], left: null, angS: 0.2, shirt: '#7f9a5a', sleeve: '#7f9a5a', pants: '#4f5a3c', tabard: tr >= 1 ? '#5f7a44' : null, tabardTrim: tr >= 2 ? '#e9e4f5' : null, helm: tr >= 1 ? 'circlet' : undefined, helmColor: '#e9e4f5', gem: '#7ad95a', cape: tr >= 2 ? '#3f5a34' : undefined }, WD_LINE_LOOK.leather))
  };
  for (const k in RNG_BY_KIND) {
    const R = RNG_BY_KIND[k];
    for (let tr = 0; tr < 3; tr++) RealmIso.UNITS[k + '#' + tr] = { unit: 'footman', name: R.name, title: R.name, spec: looks[R.race](tr) };
    RealmIso.UNITS[k] = RealmIso.UNITS[k + '#0'];
  }
  const sa = swArtId;
  swArtId = function (id, o) { return typeof id === 'string' && isRng(id) ? id + '#' + rngTier(id, o) : sa(id, o); };
}

// ---------- training: at a Barracks once you own a Forge ----------
{
  const tr0 = trainable;
  trainable = function (kind, prov) {
    const list = tr0(kind, prov);
    if (kind !== 'barracks' || !rngForgeOf(ME)) return list;
    const k = rngKindOf(raceOf(ME)); if (list.includes(k)) return list;
    return (list.length >= 12 ? list.slice(0, 11) : list).concat([k]);
  };
}

// ---------- rows: ranged soldiers fill from the back ----------
const rngMajor = a => { const ks = rowJoinSync(a).filter(k => k !== MAGE); const tot = ks.reduce((n, k) => n + a.troops[k], 0); return ks.find(k => isRng(k) && a.troops[k] * 2 > tot) || null; };
rowMovable = function (a) {
  const ks = rowJoinSync(a).filter(k => k !== MAGE);
  if (ks.length < 2) return [];
  const tot = ks.reduce((n, k) => n + a.troops[k], 0), maj = ks.find(k => a.troops[k] * 2 > tot);
  if (maj) return ks.filter(k => k !== maj);   // (a ranged majority stays at the back; the others may join it there)
  if (ks.length === 2) return [ks.find(isRng) || ks[1]];
  return ks;
};
rowLayout = function (a) {
  const N = troopCount(a), F = Math.ceil(N / 2), f = {}, b = {};
  const ks = rowJoinSync(a).filter(k => k !== MAGE), can = new Set(rowMovable(a)), ord = k => can.has(k) && a.rowOrd ? a.rowOrd[k] : null;
  const fronts = ks.filter(k => ord(k) && ord(k).side === 'front').sort((x, y) => ord(y).t - ord(x).t);
  const none = ks.filter(k => !isRng(k) && !ord(k));
  const backs = ks.filter(k => !isRng(k) && ord(k) && ord(k).side === 'back').sort((x, y) => ord(x).t - ord(y).t);
  const rng = ks.filter(k => isRng(k) && !(ord(k) && ord(k).side === 'front'));
  let room = F;
  for (const k of [...fronts, ...none, ...(rngMajor(a) ? [...rng, ...backs] : [...backs, ...rng])]) { const n = Math.min(room, a.troops[k]); if (n) f[k] = n; room -= n; if (a.troops[k] - n) b[k] = a.troops[k] - n; }
  if (a.troops[MAGE]) b[MAGE] = a.troops[MAGE];
  return { f, b };
};
rowReconcile = function (a, lay) {
  const N = troopCount(a), F = Math.ceil(N / 2);
  for (const k of new Set([...Object.keys(lay.f), ...Object.keys(lay.b), ...Object.keys(a.troops)])) {
    const t = a.troops[k] || 0; let have = (lay.f[k] || 0) + (lay.b[k] || 0);
    while (have > t) { if (lay.f[k]) lay.f[k]--; else lay.b[k]--; have--; }
    while (have < t) { if (k !== MAGE && !isRng(k) && rowSum(lay.f) < F) lay.f[k] = (lay.f[k] || 0) + 1; else lay.b[k] = (lay.b[k] || 0) + 1; have++; }
    if (!lay.f[k]) delete lay.f[k]; if (!lay.b[k]) delete lay.b[k];
  }
};
// a front-row death pulls a back-row soldier forward: a melee one if there is any, a ranged one only when none is left
rowFall = function (a, lay, k, front) {
  if (front) {
    if (lay.f[k]) { lay.f[k]--; if (!lay.f[k]) delete lay.f[k]; }
    const all = Object.keys(lay.b).filter(kk => kk !== MAGE && lay.b[kk] > 0), mel = all.filter(kk => !isRng(kk)), pool = mel.length ? mel : all;
    const tot = pool.reduce((n, kk) => n + lay.b[kk], 0);
    if (tot) { let r = Math.random() * tot, pick = pool[0]; for (const kk of pool) { r -= lay.b[kk]; if (r <= 0) { pick = kk; break; } } lay.b[pick]--; if (!lay.b[pick]) delete lay.b[pick]; lay.f[pick] = (lay.f[pick] || 0) + 1; }
  } else if (lay.b[k]) { lay.b[k]--; if (!lay.b[k]) delete lay.b[k]; }
};
// ranged soldiers: full damage from the back, 40% in front (and in a single line)
{
  const rd = rowDeal;
  rowDeal = function (a, k) {
    if (!isRng(k)) return rd(a, k);
    const n = a.troops[k] || 0, lay = rowSync(a);
    if (!lay) return n * RNG_FRONT;
    return (lay.f[k] || 0) * RNG_FRONT + (lay.b[k] || 0);
  };
}
openRowsMenu = function (a) {
  if (a.battle) return toast('Rows can’t be changed during a battle.', true);
  const lay = rowSync(a), can = rowMovable(a), ks = rowJoinSync(a).filter(k => k !== MAGE), rmaj = rngMajor(a);
  let html = `<div class="bm-head"><b>Rows of ${escHTML(a.name)}</b><span>${rowText(a)}</span></div>`;
  html += lay ? `<div class="rw-lay"><div><b>Front</b> ${rowList(lay.f)}</div><div><b>Back</b> ${rowList(lay.b)}</div></div>`
    : `<div class="bm-sec">An army of ${ROW_MIN} or more fights in two rows; this one fights as one line for now (ranged soldiers deal 40% in it). Orders take effect once it is big enough.</div>`;
  for (const k of ks) {
    const o = a.rowOrd && a.rowOrd[k], r = isRng(k);
    if (!can.includes(k)) { html += `<div class="rw-k"><img alt="" src="${portrait(k)}"><span>${kindName(k)} ×${a.troops[k]}<small>${r && rmaj === k ? 'Most of the army: stands at the back' : r ? 'Fills from the back' : 'Fills the places left over'}</small></span></div>`; continue; }
    const sides = r ? ['front'] : ['front', 'back'];
    html += `<div class="rw-k"><img alt="" src="${portrait(k)}"><span>${kindName(k)} ×${a.troops[k]}<small>${o && sides.includes(o.side) ? 'Ordered to the ' + o.side : r ? 'Fills from the back' : rmaj ? 'No order (the ranged soldiers keep the back)' : 'No order'}</small></span>` +
      sides.map(side => `<button type="button" class="rw-b${o && o.side === side ? ' on' : ''}" data-rows="${k}:${side}" data-army="${a.id}" aria-pressed="${!!(o && o.side === side)}">To ${side}</button>`).join('') + `</div>`;
  }
  if (a.troops[MAGE]) html += `<div class="rw-k"><img alt="" src="${portrait(MAGE)}"><span>${UNIT_DEFS[MAGE].name}<small>Always in the back</small></span></div>`;
  popNearCard(html);
};

// ---------- the AI: a share of ranged soldiers once it owns a Forge ----------
const AI_RNG_SHARE = { easy: 0.15, moderate: 0.25, difficult: 0.3 };
{
  const pk = aiPickKind;
  aiPickKind = function (N, P, stable) {
    const k = rngKindOf(N.race);
    if (rngForgeOf(N.id)) {
      let have = 0, tot = 0;
      for (const v of S.units) if (v.owner === N.id && v.kind === 'army') for (const kk in v.troops) if (kk !== MAGE && MILITARY.has(kk)) { tot += v.troops[kk]; if (isRng(kk)) have += v.troops[kk]; }
      for (const q of N.queue) if (MILITARY.has(q.kind) && q.kind !== MAGE) { tot++; if (isRng(q.kind)) have++; }
      if (tot >= 3 && have / tot < (AI_RNG_SHARE[N.diff] || 0.25)) return k;
    }
    return pk(N, P, stable);
  };
  const tw = aiTechWeight;
  aiTechWeight = function (N, tree, id) { const x = TECH_BY_ID[id]; return x && x.ranged ? (N.exp ? 14 : 4) : tw(N, tree, id); };
}
// the player's ranged portraits show the weapon of the current tier
{
  let seen = '';
  const sa = stepAI; stepAI = function (t) {
    const key = Object.keys(RNG_BY_KIND).map(k => rngTier(k, ME)).join('');
    if (key !== seen) { seen = key; for (const k in RNG_BY_KIND) delete portraitURL[k]; cmdKey = ''; rosterKey = ''; }
    return sa(t);
  };
}
window.__rng = { RANGED, rngTier, rngKindOf, isRng, rngForgeOf, rngMajor, rowLayout: a => rowLayout(a), rowDeal: (a, k) => rowDeal(a, k), rowMovable: a => rowMovable(a), rowSync: a => rowSync(a), trainable: (k, p) => trainable(k, p), train: k => train(k), aiPickKind: (N, P, s) => aiPickKind(N, P, s), statsOf: (k, o) => statsOf(k, o), sideStrength: (...x) => sideStrength(...x), openRowsMenu: a => openRowsMenu(a), artId: (id, o) => swArtId(id, o), portrait: k => portrait(k) };
