
// ================= v103: the computer's build order (the user's 19-point list) =================
// Every difficulty now follows one opening and build order:
//   1. settle the first 4 outposts (up to the outpost limit), the woodiest land first
//   2. Lumber Mills until wood income is over 40 (or no more fit)
//   3. a second fort, preferably on grassland or forest with tree borders
//   4. expand to 10 provinces, then Lumber Mills until wood income is over 60 (or no more fit)
//   5. every Gold Mine the land allows
//   6. a Barracks in the capital, then soldiers up to about 3000 power to defend while building
//   7. a Temple (or the race's equivalent) for every 4 provinces
//   8-9. a Forge and a Mage Tower in the capital once researched
//   10. the next fort technology, and more forts
//   11. from the third fort on, a Forge and a Mage Tower for every 4 provinces
//   12. no gold deposits: Marketplaces (Bazaars, Thug Dens) instead
//   13. Farms only while food income is negative
//   14. at 20 provinces: develop every province for gold and research; once there is no land left to take and wood income
//       is over 50, Lumber Mills are replaced by research buildings and Marketplaces
//   15. then the army: upgraded gear, a Magic User, and soldiers until food income is 1 or 0
//   16. until then the standard army (Swords / Rapiers / Axes); after it, mixed and experimental armies
// Difficulty (17-19): Easy expands to 20 and never attacks, gear up to Tier II; Moderate up to Tier III;
// Difficult has no cap, picks its school of magic from its land, and once its land is full and its army complete it
// attacks nations of about equal strength.

const AI_TIER_CAP = { easy: 2, moderate: 3, difficult: 9 };
const AI_EARLY_POWER = 3000;          // rule 6: the defensive army
const AI_CAP_RESERVE = ['barracks', 'forge', 'magetower'];   // capital plots kept free for these (rules 6, 8, 9)
const AI_SCHOOL_GOLD = 1.3;           // rule 19: below this gold score per province (yield + 10 per deposit) the land is poor
const AI_SCHOOL_WOOD = 1.0;           // rule 19: tree borders per province at or above this is "a lot of wood"
Object.assign(AI_DIFF.easy, { maxProvs: 20, family: 'sword', armor: 'chain', masons2: 2 });
Object.assign(AI_DIFF.moderate, { maxProvs: 99, family: 'sword' });
Object.assign(AI_DIFF.difficult, { maxProvs: 99, family: 'sword', school: null });

const aiFood = N => (N.income && N.income.food) || 0, aiWood = N => (N.income && N.income.wood) || 0;
// free land: an unclaimed province on the nation's border that it could settle (now, or once surveyed, paid for or allowed)
function aiBorderFree(N) {
  for (const p of provsOf(N.id)) for (const q of allNbr[p]) if (!S.buildings.has(q) && !banditsIn(q) && !uniqueBan(q)) { const why = aiOutpostWhy(N, q); if (!why || why === 'cost' || why === 'limit' || why === 'unsurveyed') return true; }
  return false;
}
const aiFreeLandNow = N => { const k = Math.floor(S.t / 5); if (N.v103fl && N.v103fl.k === k) return N.v103fl.v; const v = aiBorderFree(N); N.v103fl = { k, v }; return v; };
const aiCountJ = (N, type) => aiCount(N, type) + S.units.filter(u => u.owner === N.id && u.aiJob && u.aiJob.type === type).length;
const aiGoldPoor = (N, k = 2) => ((N.income && N.income.gold) || 0) < k * aiProvCount(N) + 5;   // gold income under k per province (plus the capital's 5)
const aiDeposits = N => provsOf(N.id).filter(p => yields[p].deposit && N.surveyed.has(p)).length;

// ---------- where a building may go: the capital keeps plots free for its Barracks, Forge and Mage Tower ----------
function aiCapReserved(N, p) {
  if (p !== capitalOf(N.id)) return 0;
  return AI_CAP_RESERVE.filter(t => !extrasIn(p).some(e => e.type === t) && !S.units.some(u => u.owner === N.id && ((u.build && u.build.prov === p && u.build.type === t) || (u.aiJob && u.aiJob.prov === p && u.aiJob.type === t)))).length;
}
function aiWhyAt(N, p, type, self) {
  const why = aiBuildWhy(N, p, type, self); if (why) return why;
  if (AI_CAP_RESERVE.includes(type) || type === 'stable') return '';
  const r = aiCapReserved(N, p); if (!r) return '';
  const used = usedSlots(p).size + S.units.filter(u => u !== self && u.aiJob && u.aiJob.prov === p && u.aiJob.type !== 'outpost').length;
  return used + r >= plotCap(p) ? 'reserved' : '';
}
// a building whose wood upkeep would push wood income below +1 can't be afforded (Lumber Mills pay for themselves)
const aiUpkeepOk = (N, type) => { const up = (BUILD_DEFS[type] && BUILD_DEFS[type].upkeep && BUILD_DEFS[type].upkeep.wood) || 0; return type === 'lumber' || (type === 'magetower' && aiMagicLate(N)) || (type === 'farm' && aiFood(N) < 0) || aiWood(N) - up >= 1; };
const aiCanBuild = (N, type) => aiUpkeepOk(N, type) && provsOf(N.id).some(p => !S.occ.has(p) && !aiWhyAt(N, p, type));

// ---------- the stage the nation has reached (cached for the current moment) ----------
function aiStage(N) {
  if (N.v103st && N.v103st.t === S.t) return N.v103st;
  const L = N.v103 || (N.v103 = {});   // milestones, kept once reached (saved with the game)
  const n = aiProvCount(N), wood = aiWood(N), forts = fortsHeldBy(N.id) + N.ups.size, free = aiFreeLandNow(N);
  const lumberOk = aiCanBuild(N, 'lumber');
  if (n !== L.lastN) { L.lastN = n; L.grewAt = S.t; }
  // settling stalls when there has been no new province for 4 minutes since settling became the step
  const step = !L.s1 ? 's1' : L.s3 && !L.s4 ? 's4' : L.core && !L.dev ? 'dev' : '';
  if (step !== L.step) { L.step = step; L.stepAt = S.t; }
  const stalled = S.t - Math.max(L.grewAt || 0, L.stepAt || 0) > 240;
  const st = { t: S.t, n, forts, free, lumberOk };
  if (!L.s1 && (n >= 5 || (!free && n >= 2) || (stalled && n >= 2) || S.t > 1200)) L.s1 = true;                     // rule 1 (or no land to take)
  if (L.s1 && !L.s2 && (wood > 40 || !lumberOk)) L.s2 = true;                                  // rule 2
  if (forts >= 2) L.s3 = true;                                                                  // rule 3
  if (L.s3 && !L.s4 && (n >= 10 || !free || stalled)) L.s4 = true;                                         // rule 4: reached 10
  if (L.s4 && !L.s4b && (wood > 60 || !lumberOk)) L.s4b = true;                                 // rule 4: lumber to 60
  // fort blocked: rule 3 can't happen yet (no Fort Charters), so the nation moves on to the next steps meanwhile
  st.fortBlocked = L.s2 && !L.s3 && aiFortCount(N) >= aiFortLimit(N);
  st.mid = L.s4b || st.fortBlocked;                                                             // rules 5-9 open
  st.s5 = st.mid && !aiCanBuild(N, 'goldmine');
  st.s6 = aiCountJ(N, 'barracks') > 0;
  st.temples = Math.floor(n / 4);
  st.s7 = aiCountJ(N, 'temple') >= st.temples || !aiCanBuild(N, 'temple');
  st.s8 = !aiHas(N, 'forge') || aiCountJ(N, 'forge') > 0 || !aiCanBuild(N, 'forge');
  st.s9 = !aiHas(N, 'magetower') || aiCountJ(N, 'magetower') > 0 || !aiCanBuild(N, 'magetower');
  if (!L.core && L.s4b && st.s5 && st.s6 && st.s7 && st.s8 && st.s9) { L.core = true; L.coreAt = S.t; }                        // rules 1-9 done: more forts (rule 10)
  st.s11 = fortsHeldBy(N.id) >= 3;                                                               // rule 11
  st.noGold = (aiDeposits(N) === 0 || aiGoldPoor(N, 1.5)) && aiGoldPoor(N, 2.5) && N.stock.gold < aiStorage(N, 'gold') * 0.5;   // rule 12: no gold deposits (or very little gold), and not sitting on gold
  if (L.core && (n >= 20 || !free || stalled)) L.dev = true;                                                // rule 14
  st.atLimit = aiFortCount(N) >= aiFortLimit(N) && n >= provLimit(N.id);
  st.full = L.dev && (!free || st.atLimit || n >= AI_DIFF[N.diff].maxProvs);
  Object.assign(st, L);
  N.v103st = st;
  return st;
}
function aiStageText(N) {
  const s = aiStage(N), f = k => s[k] ? k : '';
  return '[' + ['s1', 's2', 's3', 's4', 's4b', 'core', 'dev'].map(f).filter(Boolean).join(',') + (s.full ? ',full' : '') + (N.exp ? ',exp' : '') + (N.aggro ? ',AGGRO' : '') + ']';
}

// ---------- the plan ----------
aiPlan = function (N) {
  const D = AI_DIFF[N.diff], st = aiStage(N), n = st.n;
  const P = { maxProvs: D.maxProvs, wf: D.wf, masons: n >= 6 ? D.masons2 : D.masons, stage: st, forts: 99 };
  const enemies = enemiesOf(N.id);
  const enemyMax = Math.max(0, ...enemies.map(o => soldierCount(o) + alliesOf(o).filter(x => x !== N.id).reduce((m, x) => m + soldierCount(x), 0)));
  let army = n < 4 ? 3 : 3 + Math.floor(n / 5);
  if (enemies.length) army = Math.max(army, Math.round(enemyMax * (N.diff === 'easy' ? 0.7 : 1.1)));
  P.army = army;
  P.late = !!st.dev;                                            // rule 15
  P.powerGoal = st.dev ? Infinity : st.s6 ? AI_EARLY_POWER : 0;   // rule 6
  P.useCav = !!N.exp;
  return P;
};

// ---------- the next building, by the build order ----------
aiNextBuilding = function (N, P, skip = new Set()) {
  const st = aiStage(N), inc = N.income, stk = N.stock, n = st.n, cap = capitalOf(N.id);
  const mine = provsOf(N.id).filter(p => !S.occ.has(p));
  const has = type => aiCountJ(N, type) + (skip.has(type) ? 1 : 0);
  const list = [];   // [type, urgent, preferCapital]
  const expanding = !st.s1 || (st.s3 && !st.s4);   // settling is the current step: buildings only when there is nowhere to settle
  if (inc.food < 0 && aiCountJ(N, 'farm') - aiCount(N, 'farm') + S.units.filter(u => u.owner === N.id && u.build && u.build.type === 'farm').length < Math.ceil(-inc.food / 5)) list.push(['farm', true]);   // rule 13 (one Farm per 5 food short, counting those under way)
  if (inc.wood < 2 || (st.s4b && inc.wood < 10)) list.push(['lumber', true]);            // never run dry
  if (!st.s1) list.push(['lumber', false]);
  else if (!st.s2) list.push(['lumber', true]);                                          // rule 2
  if (st.s3 && !st.s4) list.push(['lumber', false]);
  if (st.s4 && !st.s4b) list.push(['lumber', true]);                                     // rule 4
  if (st.s4b && inc.wood < (st.dev ? 40 : 25)) list.push(['lumber', true]);              // keep enough wood coming in for what is still to be built (rule 14 wants it over 50)
  if (st.mid) {
    list.push(['goldmine', true]);                                                       // rule 5
    if (st.noGold && aiHas(N, 'market') && has('market') < Math.ceil(n / 2)) list.push(['market', true]);   // rule 12: no gold, so markets in its place
    if (!has('barracks')) list.push(['barracks', true, true]);                           // rule 6
    if (has('temple') < st.temples) list.push(['temple', true]);                         // rule 7
    if (aiHas(N, 'forge') && !has('forge')) list.push(['forge', true, true]);           // rule 8
    if (aiHas(N, 'magetower') && !has('magetower')) list.push(['magetower', true, true]);   // rule 9
    if (aiMagicLate(N) && aiHas(N, 'magetower') && !has('magetower')) aiMakeRoomForTower(N);
  }
  if (st.core && st.s11) {                                                               // rule 11
    const per = Math.ceil(n / 4);
    if (aiHas(N, 'forge') && has('forge') < per) list.push(['forge', true]);
    if (aiHas(N, 'magetower') && has('magetower') < per) list.push(['magetower', true]);
  }
  if (st.dev) {                                                                          // rule 14: develop every province
    list.push(['temple', true]);
    if (aiHas(N, 'forge')) list.push(['forge', true]);
    if (aiHas(N, 'magetower')) list.push(['magetower', true]);
    list.push(['goldmine', true]);
    if (aiHas(N, 'market')) list.push(['market', true]);
    if (N.exp && aiHas(N, 'stable') && !has('stable')) list.push(['stable', false, true]);   // rule 16: mixed armies
    for (const [k, type] of [['gold', 'bank'], ['wood', 'storehouse']]) if (aiHas(N, type) && stk[k] > aiStorage(N, k) * 0.9 && has(type) < 2) list.push([type, false]);
  }
  const order = mine.slice().sort((a, b) => provValue(b, N) - provValue(a, N));
  const capFirst = cap >= 0 && mine.includes(cap) ? [cap, ...order.filter(p => p !== cap)] : order;
  for (const [type, urgent0, preferCap] of list) {
    if (skip.has(type) && !['farm', 'lumber', 'market', 'temple', 'goldmine'].includes(type)) continue;
    const d = BUILD_DEFS[type]; if (!d) continue;
    const urgent = urgent0 && !(expanding && type !== 'farm' && inc.wood >= 2);
    if (!aiUpkeepOk(N, type)) continue;
    // saving up for a fort: only Lumber Mills and urgent food
    if (N.saveFort && type !== 'lumber' && !(type === 'farm' && inc.food < 0) && stk.wood - (d.cost.wood || 0) < FORT_UPGRADE.cost.wood) continue;
    const where = (preferCap || type === 'lumber' ? capFirst : order).find(p => !aiWhyAt(N, p, type));
    if (where === undefined) continue;
    if (urgent && type !== 'farm' && type !== 'lumber') { N.v103need = d.cost; N.v103needT = S.t; }
    if (!canPay(stk, d.cost)) { if (urgent && type !== 'farm') return { type, wait: true }; continue; }   // save up for it
    return { type, prov: where, urgent };
  }
  return null;
};

// ---------- Masons: settle (the woodiest land first while opening), else build ----------
const aiWoodScore = (p, N) => yields[p].wood * 1.5 + Math.min(treeBorder[p], 2) * 4 + yields[p].food * 0.3 + (setpieceAt(p) ? 1 : 0);
aiMasons = function (N, P) {
  const st = aiStage(N), n = st.n, D = AI_DIFF[N.diff];
  const free = aiUnits(N, MASON).filter(u => !u.aiJob && !u.build && !u.moving && !u.exiting);
  if (!free.length) return;
  const pend = aiPendingOutposts(N), skip = new Set();
  let grew = 0;
  for (const u of free) {
    let job = null;
    const b = aiNextBuilding(N, P, skip);
    if (b && !b.wait && b.urgent) job = b;
    else if (b && b.wait) { if (N.income.wood >= 8 && N.stock.wood < BUILD_DEFS[b.type].cost.wood + OUTPOST_COST.wood) continue; }   // saving up: don't spend wood on outposts (unless wood is short: more land means more wood)
    const wantGrow = !job && n + pend + grew < P.maxProvs && S.t >= N.nextOutpost;
    if (wantGrow) {
      const d = aiReach(u, 14), taken = new Set(S.units.filter(v => v.aiJob || (v.build && v.build.type === 'outpost')).map(v => v.aiJob ? v.aiJob.prov : v.build.prov));
      let best = -1, bs = -Infinity;
      for (const [p, dist] of d) {
        if (aiOutpostWhy(N, p) || taken.has(p)) continue;
        if (N.income.wood < 2 && !yields[p].wood && !treeBorder[p]) continue;   // an outpost costs 1 wood upkeep: don't settle barren land while wood is short
        const v = n + grew < 5 ? aiWoodScore(p, N) : provValue(p, N) + (yields[p].deposit && N.surveyed.has(p) ? 4 : 0) + Math.min(treeBorder[p], 4) * 0.8;   // rule 1: the most wood first
        const sc = v - dist * 0.8; if (sc > bs) { bs = sc; best = p; }
      }
      if (best >= 0) { job = { type: 'outpost', prov: best }; grew++; }
    }
    if (!job && b && !b.wait) job = b;
    if (!job) continue;
    if (job.type === 'outpost') N.nextOutpost = S.t + D.outpostGap; else skip.add(job.type);
    u.aiJob = { type: job.type, prov: job.prov };
    if (u.prov !== job.prov && !order(u, job.prov, true)) u.aiJob = null;
  }
};

// ---------- forts: the second after the Lumber Mills (rule 3), more once rules 1-9 are done (rules 10-11) ----------
aiFortUp = function (N, P) {
  const st = aiStage(N), stk = N.stock, mine = provsOf(N.id), have = aiFortCount(N), limit = aiFortLimit(N);
  let need = false;
  if (have < limit && provLimit(N.id) < AI_DIFF[N.diff].maxProvs + 1) {
    if (fortsHeldBy(N.id) + N.ups.size < 2) need = !!st.s2;   // rule 3: the second fort (the capital is the first)
    else need = !!st.core && st.free && aiOutposts(N) + aiPendingOutposts(N) >= aiOutpostLimit(N) - 1;
    if (!need && st.dev && stk.gold > 900 && stk.wood > FORT_UPGRADE.cost.wood + 200 && aiOutposts(N) > 0) need = true;   // rich and developed: forts for their plots and research
  }
  N.saveFort = need && !canPay(stk, FORT_UPGRADE.cost);
  if (need && canPay(stk, FORT_UPGRADE.cost)) {
    const cap = capitalOf(N.id), d = hopsFrom(cap >= 0 ? cap : N.capital, allNbr);
    const site = p => { const t = G.provs[p].terrain; return (t === 'grassland' || t === 'forest' ? 6 : 0) + (treeBorder[p] ? 4 + Math.min(treeBorder[p], 4) : 0) + provValue(p, N) * 0.3 - Math.abs(d[p] - 2); };
    // (v96: never a fort on an ally's border: that would end the alliance)
    const c = mine.filter(p => S.buildings.get(p).stage === 0 && !N.ups.has(p) && !S.occ.has(p) && !alliesOf(N.id).some(x => allNbr[p].some(q => nationOf(q) === x))).sort((a, b) => site(b) - site(a))[0];
    if (c !== undefined) { pay(stk, FORT_UPGRADE.cost); N.ups.set(c, { t0: S.t }); }
  }
  // Forge and Mage Tower upgrades (as before)
  for (const [type, ids] of [['forge', ['battleforge', 'warforge']], ['magetower', ['sanctum', 'arcanum']]]) {
    for (const [p, e] of aiExtraList(N)) {
      if (e.type !== type) continue;
      const lv = e.level || 1, key = p + '@' + e.slot; if (lv >= 3 || N.xups.has(key) || !aiHas(N, ids[lv - 1])) continue;
      const up = BUILD_DEFS[type].ups[lv]; if (!canPay(stk, up.cost) || (N.saveFort && stk.wood - (up.cost.wood || 0) < FORT_UPGRADE.cost.wood)) continue;
      pay(stk, up.cost); N.xups.set(key, { t0: S.t, to: lv + 1, time: up.time });
    }
  }
};

// ---------- rule 14: with no land left and wood to spare, Lumber Mills make way for research buildings and markets ----------
const AI_SWAP_INTO = ['temple', 'forge', 'magetower', 'market'];
function aiSwapLumber(N) {
  const st = aiStage(N);
  if (!st.full || aiWood(N) <= 50 || S.t < (N.swapAt || 0) || enemiesOf(N.id).length) return;
  const mine = provsOf(N.id).filter(p => !S.occ.has(p));
  // still a free plot for one of them somewhere: build there first
  if (AI_SWAP_INTO.some(t => (t !== 'forge' || aiHas(N, 'forge')) && (t !== 'magetower' || aiHas(N, 'magetower')) && (t !== 'market' || aiHas(N, 'market')) && mine.some(p => !aiWhyAt(N, p, t)))) return;
  if (S.units.some(u => u.owner === N.id && (u.aiJob || u.build))) return;
  const ok = (p, t) => (t !== 'forge' || aiHas(N, 'forge')) && (t !== 'magetower' || aiHas(N, 'magetower')) && (t !== 'market' || aiHas(N, 'market')) && aiWhyAt(N, p, t) === 'full';
  const p = mine.filter(q => extrasIn(q).some(e => e.type === 'lumber') && AI_SWAP_INTO.some(t => ok(q, t))).sort((a, b) => extrasIn(b).filter(e => e.type === 'lumber').length - extrasIn(a).filter(e => e.type === 'lumber').length)[0];
  N.swapAt = S.t + 45;
  if (p === undefined) return;
  const e = extrasIn(p).find(x => x.type === 'lumber');
  S.extras.set(p, extrasIn(p).filter(x => x !== e)); N.income = aiIncome(N);
}

// ---------- training: the 3000-power guard, then soldiers until food income is 1 or 0 ----------
aiTrain = function (N, P) {
  const st = N.stock, cap = capitalOf(N.id), reserve = 25, war = enemiesOf(N.id).length > 0;
  if (cap >= 0 && !aiBusyAt(N, cap)) {
    for (const [kind, want] of [[MASON, P.masons], [WAYFINDER, P.wf]]) {
      const have = aiUnits(N, kind).length + aiQueued(N, kind);
      if (have < Math.min(want, UNIT_LIMIT[kind] + aiRep(N, kind === MASON ? 'rep-masons' : 'rep-wayfinders')) && st.gold >= UNIT_DEFS[kind].cost.gold + reserve) { pay(st, UNIT_DEFS[kind].cost); N.queue.push({ kind, prov: cap, t0: S.t }); break; }
    }
  }
  // a Magic User (rule 15), up to the nation's Mage limit
  if (N.school) {
    const towers = aiExtraList(N).filter(([, e]) => e.type === 'magetower').map(([p]) => p).filter(p => !aiBusyAt(N, p));
    if (towers.length && aiMages(N) < 1 + (aiHas(N, 'apprentice') ? 1 : 0) + aiRep(N, 'rep-magecap') && canPay(st, UNIT_DEFS[MAGE].cost) && (N.income.food >= 2 || (N.stock.food > 300 && N.income.food >= 0) || !aiMages(N))) { pay(st, UNIT_DEFS[MAGE].cost); N.queue.push({ kind: MAGE, prov: towers[0], t0: S.t }); }
  }
  const queued = N.queue.filter(q => MILITARY.has(q.kind)).length, soldiers = soldierCount(N.id) + queued;
  const food = N.income.food;
  let want;
  const farmsOk = aiWood(N) >= 8 && N.stock.wood >= BUILD_DEFS.farm.cost.wood;   // (a Farm costs 2 wood upkeep)
  if (war) want = food >= 0 || (food >= -6 && N.stock.food > 150);   // at war too, never so many that the army starves (Army Exhaustion)
  else if (soldiers < P.army) want = food >= 2 || (N.stock.food > 400 && food >= -2 && farmsOk);
  else if (P.late) want = food >= 2;                                                                                                    // rule 15: until food income is 1 or 0
  else want = P.powerGoal > 0 && nationPower(N.id) + queued * 75 < P.powerGoal && (food >= 2 || (N.stock.food > 400 && food >= -3 && farmsOk));   // rule 6 (Farms follow, rule 13)
  if (P.threat) want = food >= -8 || N.stock.food > 200;   // v104 Threatened: a bigger army whatever it costs, past the food limit (Farms follow)
  if (!want) return;
  // while a fort or a key building is being saved for, soldiers only get the gold left over (unless at war)
  if (!war && soldiers >= P.army && !P.threat) {
    if (N.saveFort) return;
    const need = N.v103need && S.t - (N.v103needT || 0) < 15 ? (N.v103need.gold || 0) : 0;
    if (need && st.gold - (aiUnitCost(N, N.design.inf).gold || 0) < need) return;
  }
  const barracks = aiExtraList(N).filter(([, e]) => e.type === 'barracks').map(([p]) => p);
  for (const p of barracks) {
    if (aiBusyAt(N, p)) continue;
    const stable = extrasIn(p).some(e => e.type === 'stable');
    const kind = aiPickKind(N, P, stable), cost = aiUnitCost(N, kind);
    if (!canPay(st, cost) || st.gold - (cost.gold || 0) < (war || P.threat ? 0 : 40)) { if (kind !== N.design.inf && canPay(st, aiUnitCost(N, N.design.inf)) && war) { pay(st, aiUnitCost(N, N.design.inf)); N.queue.push({ kind: N.design.inf, prov: p, t0: S.t }); } continue; }
    pay(st, cost); N.queue.push({ kind, prov: p, t0: S.t });
  }
};

// ---------- rule 16: experimental armies once the nation is developed and its army is complete ----------
function aiCheckExperimental(N) {
  if (N.exp) { if (S.t >= (N.mixAt || 0)) aiRollMix(N); return; }
  const st = aiStage(N);
  if (st.dev && aiMages(N) > 0 && aiFood(N) <= 1 && soldierCount(N.id) >= 8) { N.exp = true; aiRollMix(N); }
}
function aiRollMix(N) {
  // a fresh plan every 5 minutes: some of the standard design, some polearms, some blunt weapons, some cavalry
  const r = () => Math.random();
  const w = { base: 0.35 + r() * 0.4, pole: r() * 0.4, blunt: r() * 0.4, cav: r() * 0.35 };
  const tot = w.base + w.pole + w.blunt + w.cav; for (const k in w) w[k] /= tot;
  N.mix = w; N.mixAt = S.t + 300;
}
{ const pk = aiPickKind; aiPickKind = function (N, P, stable) {
  if (!N.exp) return N.design.inf;   // rule 16: the standard army (Swords, Rapiers or Axes) until the nation is developed
  if (!N.mix || (N.counter && N.counter.base < 0.999)) return pk(N, P, stable);   // a counter plan after a lost battle comes first
  const cd = aiCounterDesigns(N), have = { pole: 0, blunt: 0, cav: 0, base: 0 }; let tot = 0;
  const add = (k, n) => { if (k === MAGE || !MILITARY.has(k)) return; const st = DSTATS[k]; if (!st) return; const f = st.cav ? 'cav' : k === cd.pole ? 'pole' : k === cd.blunt ? 'blunt' : 'base'; have[f] += n; tot += n; };
  for (const v of S.units) if (v.owner === N.id && v.kind === 'army') for (const k in v.troops) add(k, v.troops[k]);
  for (const q of N.queue) add(q.kind, 1);
  let pick = 'base', gap = -Infinity;
  for (const f of ['base', 'pole', 'blunt', 'cav']) { if (f === 'cav' && !stable) continue; const g = N.mix[f] - (tot ? have[f] / tot : 0); if (N.mix[f] > 0.02 && g > gap) { gap = g; pick = f; } }
  return pick === 'pole' ? cd.pole : pick === 'blunt' ? cd.blunt : pick === 'cav' ? N.design.cav : N.design.inf;
}; }

// ---------- research ----------
// gear caps (rules 17-19): Easy Tier II weapons and armor, Moderate Tier III, Difficult everything
const SHIELD_TIER = { 's-round': 1, 's-kite': 2, 's-tower': 3 };
function aiOverCap(N, id) {
  const cap = AI_TIER_CAP[N.diff] || 9; if (cap >= 9) return false;
  if (id.startsWith('w-')) { const W = WEAPONS[TECH_EQUIP[id]]; return !!W && W.tier > cap; }
  if (id.startsWith('a-')) { const lv = +id.slice(-1); return lv > cap; }
  if (SHIELD_TIER[id]) return SHIELD_TIER[id] > cap;
  if (id === 'horse-training') return cap < 3;   // (Friesians, and Woodling Champions' Tier III weapons)
  return false;
}
function aiTechOpen(N, tree, id) {
  const x = TECH_BY_ID[id], st = N.tech[tree];
  return !!x && x.tree === tree && x.tier <= aiTier(N, tree) && techFor(x, N.race) && !st.done.includes(id) && st.cur !== id && reqMet(x, st, N.tech, N.race) && forgeReady(x, st) && !x.playerOnly && !aiOverCap(N, id) && (!x.rep || aiTechsLeft(N, tree) < REP_LEFT);
}
// what the build order is looking for in each tree, most wanted first (rule 10: the next fort technology)
function aiPriorityTechs(N, tree) {
  const st = aiStage(N);
  if (tree === 'gov') {
    const L = ['forts'];
    if (st.noGold) L.push('market');
    if (st.s2) L.push('forge', 'magetower');
    if (st.s4) L.push('forts2');
    if (st.core) L.push('effadmin', 'forts3');
    if (st.core && st.free && aiFortCount(N) >= aiFortLimit(N)) L.push('rep-forts');
    return L;
  }
  if (tree === 'mil') {
    const fam = FAMILY[N.family], next = fam && fam.order.map(w => WEAPONS[w]).find(W => W.tech && !aiHas(N, W.tech));
    const L = ['battleforge'];
    if (next) L.push(next.tech);
    for (let lv = 1; lv <= 4; lv++) { const id = 'a-' + N.armorLine + lv; if (TECH_BY_ID[id] && !aiHas(N, id)) { L.push(id); break; } }
    L.push('warforge');
    return L;
  }
  if (!N.school) return ['school-' + N.wantSchool];
  return { death: ['graverob', 'deathtax'], arcane: ['trading', 'stockmarket'], life: ['harvest', 'bountiful'], pyro: ['sacredpyre'], elemental: ['forestspirit'] }[N.school] || [];
}
{ const dro = aiDrawOptions; aiDrawOptions = function (N, tree) {
  if (tree === 'mag' && !N.school && N.diff === 'difficult') N.wantSchool = aiDynamicSchool(N);   // rule 19
  dro(N, tree);
  const st = N.tech[tree]; st.opts = st.opts.filter(id => !aiOverCap(N, id));
  // one wanted technology that wasn't drawn takes the place of the least wanted option
  const want = aiPriorityTechs(N, tree).find(id => !st.opts.includes(id) && aiTechOpen(N, tree, id));
  if (want) {
    const n = TECH_OPTIONS + (aiHas(N, 'retained') ? 1 : 0) + (aiHas(N, 'retained2') ? 1 : 0);
    if (st.opts.length >= n) { const drop = st.opts.filter(id => !UPGRADE_TECHS.has(id) && !st.sticky.includes(id)).sort((a, b) => aiTechWeight(N, tree, a) - aiTechWeight(N, tree, b))[0]; if (drop) st.opts = st.opts.filter(id => id !== drop); }
    if (st.opts.length < n) st.opts.push(want);
  }
}; }
{ const tl = aiTechsLeft; aiTechsLeft = function (N, tree) {
  if (tree !== 'mil') return tl(N, tree);
  return TECHS.filter(x => x.tree === 'mil' && !x.rep && !x.playerOnly && techFor(x, N.race) && !N.tech.mil.done.includes(x.id) && !aiOverCap(N, x.id)).length;
}; }
aiTechWeight = function (N, tree, id) {
  const x = TECH_BY_ID[id], st = aiStage(N), dep = aiDeposits(N);
  if (aiOverCap(N, id)) return 0.01;
  if (tree === 'gov') {
    const W = { forts: 200, advmills: 25, forge: st.s2 ? 40 : 12, magetower: 40, market: st.noGold ? 30 : 8, effadmin: 40, 'rep-admin': 15,
      forts2: st.s4 ? 70 : 25, forts3: 50, 'rep-forts': aiFortCount(N) >= aiFortLimit(N) ? 30 : 6, retained: 10, retained2: 8,
      refmills: 12, sophmills: 10, advmines: dep ? 14 : 1, refmines: dep ? 12 : 1, sophmines: dep ? 10 : 1, traderoutes: 3, 'rep-trade': 3, thugs2: st.noGold ? 10 : 3, thugs3: st.noGold ? 8 : 2,
      'rep-masons': 5, 'rep-lumber': 4, 'rep-storage': 2, stable: N.exp ? 15 : 1, mushroom: 2, advfarms: 2, reffarms: 2, sophfarms: 2,
      walls: st.dev ? 6 : 1, walls2: st.dev ? 5 : 1, moat: st.dev ? 3 : 1, arrowslits: st.dev ? 3 : 1, granary: 1, storehouse: 1, bank: st.dev ? 3 : 1, roads: 1, roads2: 1, roads3: 1, autoscout: 1, bridges: 1 };
    if (aiMagicLate(N)) W.magetower = 500;
    return W[id] || 2;
  }
  if (tree === 'mil') {
    const exp = !!N.exp;
    if (id === 'battleforge' || id === 'warforge') return 30;
    if (id.startsWith('w-')) { const W = WEAPONS[TECH_EQUIP[id]]; return W && W.fam === N.family ? 25 : exp ? 10 : 2; }
    if (id.startsWith('a-')) return id.includes(N.armorLine) ? 22 : 2;
    if (id.startsWith('s-')) return N.family === 'sword' ? 14 : 1;
    if (id === 'dualwield') return N.race === 'swamp' ? 10 : 1;
    if (id === 'twohand') return 4;
    if (id.startsWith('horse-')) return exp ? 10 : 1;
    if (id === 'rep-armor') return 6;
    if (id === 'rep-' + (N.family === 'axe' || N.family === 'thrust' ? 'sword' : N.family)) return 6;
    return x && x.rep ? 2 : 3;
  }
  if (id.startsWith('school-')) return id === 'school-' + N.wantSchool ? 100 : 1;
  const P = AI_MAGIC_PREFS[N.school] || {};
  if (id === 'sanctum' || id === 'arcanum') return 10;
  if (id === 'rep-magecap' || id === 'apprentice') return 6;
  return P[id] || (x && x.rep ? 2 : 3);
};

// ---------- rule 19: the Difficult nation's school of magic comes from its land ----------
function aiLandScore(N) {
  const set = new Set(provsOf(N.id));
  for (const p of provsOf(N.id)) for (const q of allNbr[p]) if (!S.buildings.has(q) && (N.surveyed.has(q) || (S.aiScouted && S.aiScouted[N.id] && S.aiScouted[N.id].has && S.aiScouted[N.id].has(q)))) set.add(q);
  let gold = 0, dep = 0, wood = 0;
  for (const p of set) { gold += yields[p].gold; if (yields[p].deposit && N.surveyed.has(p)) dep++; wood += treeBorder[p]; }
  const k = Math.max(1, set.size);
  return { gold: (gold + dep * 10) / k, wood: wood / k, k, dep };
}
function aiDynamicSchool(N) {
  const race = N.race || raceOf(N.id), ok = s => SCHOOLS[s] && schoolOk(s, race), L = aiLandScore(N);
  const poor = L.gold < AI_SCHOOL_GOLD, woody = L.wood >= AI_SCHOOL_WOOD;
  let pick;
  if (poor) pick = race === 'swamp' ? (woody ? 'pyro' : 'death') : ok('death') ? 'death' : woody ? (ok('elemental') && Math.random() < 0.5 ? 'elemental' : 'life') : 'arcane';   // Grave Robbing or the Sacred Pyre
  else if (woody) pick = race === 'swamp' ? 'pyro' : ok('elemental') && Math.random() < 0.5 ? 'elemental' : 'life';   // Herbomancy or Elemental
  else pick = 'arcane';                                                                                            // Interdimensional Trading
  if (!ok(pick)) pick = Object.keys(SCHOOLS).find(ok) || N.wantSchool;
  N.schoolWhy = { ...L, poor, woody, pick };
  return pick;
}

// ---------- rule 19: a full, armed Difficult nation goes to war against nations of about its own strength ----------
function aiCheckAggro(N) {
  if (N.aggro || N.diff !== 'difficult' || !N.exp) return;
  const st = aiStage(N); if (st.full && aiFood(N) <= 1) N.aggro = true;
}
{ const cw = aiConsiderWar; aiConsiderWar = function (N, P) {
  if (N.diff === 'easy') return;                     // rule 17: Easy never attacks
  if (!N.aggro) return cw(N, P);
  if (enemiesOf(N.id).length) { N.warPlan = null; return; }
  const myPow = armyPower(N.id), ok = o => o !== N.id && aliveNation(o) && !allied(N.id, o) && nationsBorder(N.id, o) && !declareWhy(N.id, o) && myPow >= defPower(o);
  if (N.warPlan) {
    if (S.t < N.warPlan.at) { N.warCheck = N.warPlan.at; return; }
    const t = N.warPlan.target; N.warPlan = null;
    if (ok(t)) declareWar(N.id, t);
    return;
  }
  if (myPow <= 0 || N.stock.gold < WAR.declareCost.gold + 20 || S.t < (N.peaceUntil || 0)) return;
  const cands = liveNations().filter(ok);
  if (!cands.length) return;
  const t = cands.sort((x, y) => (myPow - defPower(x)) - (myPow - defPower(y)))[0];   // the closest to its own strength
  N.warPlan = { target: t, at: S.t + AI_WAR_THINK };
  N.warCheck = N.warPlan.at;
  if (t === ME && knows(N.id)) toast(`The ${PLAYERS[N.id].name} is gathering its armies on your border…`, true);
}; }
// an aggressive nation's main body goes on the offensive whenever it is the stronger side in the field
{ const wg = aiWarGoal; aiWarGoal = function (N, a, enemies) {
  if (!N.aggro) return wg(N, a, enemies);
  const W = aiWarPlan(N, enemies), str = rawStrength([a]);
  if (a !== W.main || !W.strong || aiDangerFor(N, str).has(a.prov)) return wg(N, a, enemies);
  const d = N.diff; let g; N.diff = 'moderate';   // (the old goal finder always attacks for Moderate)
  try { g = aiWarGoal0(N, a, enemies); } finally { N.diff = d; }
  return g >= 0 && (W.stacks.get(g) || 0) < str * AI_ENGAGE ? g : wg(N, a, enemies);
}; }

// ---------- capitals: rule 1 needs wood nearby, so a computer nation's capital also weighs the wood within two provinces ----------
// (land without tree borders or wood yields can leave a nation unable to build anything)
function aiWoodAround(i) {
  const d = hopsFrom(i, allNbr); let w = 0, k = 0;
  for (let p = 0; p < G.provs.length; p++) if (d[p] <= 2) { w += yields[p].wood + 2 * Math.min(treeBorder[p], 3); k++; }
  return k ? w / k : 0;
}
pickAICapital = function (caps, reach, r, terrain = 'grassland') {
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
    const sc = Math.min(md, 9) * 10 + openNbr[i].length * 2 - (G.provs[i].coastal ? 3 : 0) + Math.min(aiWoodAround(i), 6) * 3 + r() * 4;
    if (sc > bs) { bs = sc; best = i; }
  }
  return best;
};

// ---------- hooks ----------
{ const sa = stepAI; stepAI = function (t) {
  if (S.started) for (const N of Object.values(NATIONS)) { if (!N.alive || t < N.think) continue; try { aiCheckExperimental(N); aiCheckAggro(N); aiSwapLumber(N); } catch (e) { reportError(e, 'ai v103'); } }
  return sa(t);
}; }
window.__v103p = N => aiPlan(N); window.__v103 = {}; 
Object.assign(window.__v103, { outWhy: aiOutpostWhy, lim: N => aiOutpostLimit(N) + ' ' + aiOutposts(N) }); Object.assign(window.__v103, { aiStage, stageText: aiStageText, aiNextBuilding, aiDynamicSchool, aiLandScore, aiOverCap, aiWhyAt, aiSwapLumber, AI_TIER_CAP });
