
// ================= v100: AI armies regroup after a defeat, raid instead of trickling in; hidden war surge =================

// ---------- the hidden surge: once a nation has lost half its army or more in a war ----------
// Moderate: soldiers train in 12 s; Difficult: in 6 s and at half price. Until that nation is at peace again.
// Never for a nation allied with the player.
const AI_SURGE = { moderate: { time: 12, cost: 1 }, difficult: { time: 6, cost: 0.5 } };
function stepAISurge() {
  for (const N of Object.values(NATIONS)) {
    if (!N.alive) continue;
    if (!enemiesOf(N.id).length) { N.warPeak = 0; N.surge = false; continue; }
    const n = soldierCount(N.id);
    N.warPeak = Math.max(N.warPeak || 0, n);
    if (!N.surge && N.warPeak >= 4 && n <= N.warPeak * 0.5) N.surge = true;
  }
}
const aiSurge = N => !!(N.surge && AI_SURGE[N.diff] && !allied(N.id, ME));
function aiTrainTime(N, kind) { return aiSurge(N) && MILITARY.has(kind) && kind !== MAGE ? AI_SURGE[N.diff].time : trainTime(kind); }
function aiUnitCost(N, kind) {
  const c = UNIT_DEFS[kind].cost, m = aiSurge(N) && MILITARY.has(kind) && kind !== MAGE ? AI_SURGE[N.diff].cost : 1;
  if (m === 1) return c;
  const out = {}; for (const k in c) out[k] = Math.ceil(c[k] * m); return out;
}

// ---------- war orders: gather first, fight what can be beaten, otherwise raid ----------
// A small army never walks into the enemy alone: it joins the main body. The main body fights the enemy's armies only
// when it can win; until then it rebuilds at the rally point (the capital) and, once it is a real force, counterattacks
// lightly held provinces (enemy land, or its own occupied land) away from the enemy's main army, to force it back.
const aiWarGoal0 = aiWarGoal;
const aiWarPlans = new Map();   // per nation, recomputed twice a second (kept off the save)
const AI_RAID_MIN_PUSH = 3;   // soldiers in the main body before it counterattacks an advancing enemy
const AI_ENGAGE = 1.2;   // an army engages an enemy force up to 19.9% stronger than itself, never one 20% or more stronger
function aiWarPlan(N, enemies) {
  const key = Math.floor(S.t * 2), old = aiWarPlans.get(N.id);
  if (old && old.key === key) return old;
  const mine = aiArmies(N).filter(v => !v.retreating && !v.exiting);
  let main = null, ms = -1; for (const a of mine) { const s = rawStrength([a]); if (s > ms) { ms = s; main = a; } }
  const myTotal = rawStrength(mine);
  // the enemy's armies, stacked by province
  const stacks = new Map();
  for (const v of S.units) if (v.kind === 'army' && enemies.includes(v.owner) && troopCount(v) > 0 && !v.retreating) stacks.set(v.prov, (stacks.get(v.prov) || 0) + rawStrength([v]));
  let foeMain = 0, foeProv = -1; for (const [p, s] of stacks) if (s > foeMain) { foeMain = s; foeProv = p; }
  const cap = capitalOf(N.id) >= 0 ? capitalOf(N.id) : provsOf(N.id)[0];
  const strong = foeMain < myTotal * AI_ENGAGE;   // the enemy's biggest stack is less than 20% stronger than everything we have
  // is the enemy pushing? one of its armies with at least half the power of its biggest stack is marching into our land
  // (or toward our capital), or is already standing in it
  const capNow = capitalOf(N.id) >= 0 ? capitalOf(N.id) : provsOf(N.id)[0], home = capNow >= 0 ? hopsFrom(capNow, allNbr) : null;
  let pushing = false;
  for (const v of S.units) {
    if (v.kind !== 'army' || !enemies.includes(v.owner) || troopCount(v) <= 0 || v.retreating || rawStrength([v]) < foeMain * 0.5) continue;
    if (nationOf(v.prov) === N.id) { pushing = true; break; }
    if (v.moving && v.final !== undefined && (nationOf(v.final) === N.id || (home && home[v.final] !== undefined && home[v.prov] !== undefined && home[v.final] < home[v.prov]))) { pushing = true; break; }
  }
  const plan = { key, main, mainStr: ms, myTotal, stacks, foeMain, foeProv, cap, strong, pushing }; aiWarPlans.set(N.id, plan); return plan;
}
aiWarGoal = function (N, a, enemies) {
  const W = aiWarPlan(N, enemies), str = rawStrength([a]), soldiers = troopCount(a) - (a.troops[MAGE] || 0);
  const isMain = a === W.main;
  // the enemy is in the capital and this army (with whatever is there) can beat it: defend
  const capFoe = W.stacks.get(W.cap) || 0;
  // strong enough overall: the main body fights as before; the rest join it
  if (W.strong) {
    // v100: never march on an enemy force 20% or more stronger than this army
    if (isMain || W.foeMain < str * AI_ENGAGE) { const g = aiWarGoal0(N, a, enemies); return g >= 0 && (W.stacks.get(g) || 0) >= str * AI_ENGAGE ? W.cap : g; }
    // the rest wait at the capital, joining the main body only while it stands still in its own land (no walking alone into the enemy)
    const m = W.main; if (!m || m.battle || m.moving || nationOf(m.prov) !== N.id || (W.stacks.get(m.prov) || 0) > 0) return W.cap;
    return m.prov;
  }
  // not strong enough: everything but the main body gathers at the capital
  if (!isMain) return W.cap;
  if (capFoe && capFoe < str * AI_ENGAGE) return W.cap;
  // v100: rebuild or counterattack? If the enemy's strong armies are marching on our land, strike back into theirs to
  // force them home; if they hold their ground, stay home and rebuild until we can meet them
  if (!W.pushing) return W.cap;
  if (soldiers < AI_RAID_MIN_PUSH) return W.cap;
  // raid: the weakest-held province (own and occupied, or the enemy's) that this army can take, away from any enemy stack that could beat it
  const d = aiReach(a, 16), danger = new Set();
  for (const [p, s] of W.stacks) if (s >= str * AI_ENGAGE) { danger.add(p); for (const q of allNbr[p]) danger.add(q); }
  let best = -1, bd = Infinity;
  for (const [p, b] of S.buildings) {
    if (!d.has(p) || danger.has(p)) continue;
    const held = W.stacks.get(p) || 0; if (held > str * 0.5) continue;
    let w;
    if (b.owner === N.id) { if (!S.occ.has(p)) continue; w = 0; }
    else if (enemies.includes(b.owner) && S.occ.get(p) !== N.id) w = b.stage === 2 ? 0.5 : b.stage === 1 ? 1 : 2;
    else continue;
    const v = d.get(p) + w * 3; if (v < bd) { bd = v; best = p; }
  }
  return best >= 0 ? best : W.cap;
};

// ---------- unit counters, learned from a lost battle ----------
// Only once an army of this nation has been beaten by a hostile nation's army (wiped out, or forced to retreat) does it think
// about counters: against cavalry it trains polearms (Pikemen), against plate-armored infantry with shields it trains blunt
// weapons (Macemen), and against a mix it trains a matching mix. Each new defeat updates the plan.
function aiNoteDefeat(a, b) {
  const N = NATIONS[a.owner]; if (!N || !b) return;
  const foes = S.units.filter(v => v.kind === 'army' && v.battle === b && v.owner !== a.owner && isNation(v.owner) && hostile(v.owner, a.owner));
  let cav = 0, plate = 0, other = 0;
  for (const v of foes) for (const k in v.troops) {
    if (k === MAGE) continue; const n = v.troops[k], st = statsOf(k, v.owner);
    if (st.cav && !st.champ) cav += n; else if (st.plate && st.shieldArmor > 0) plate += n; else other += n;
  }
  const tot = cav + plate + other; if (!tot) return;
  N.counter = { pole: cav / tot, blunt: plate / tot, base: other / tot, t: S.t };
}
{ const ww = warWipe; warWipe = function (b, a) { try { aiNoteDefeat(a, b); } catch (e) {} return ww(b, a); }; }
{ const rt = retreat; retreat = function (a) { const b = a.battle; if (b && NATIONS[a.owner] && retreatLockLeft(a) <= 0) try { aiNoteDefeat(a, b); } catch (e) {} return rt(a); }; }
// the counter designs: the nation's best polearm (no shield: they are two-handed) and its best blunt weapon (with a shield)
function aiCounterDesigns(N) {
  const best = fam => (FAMILY[fam] ? FAMILY[fam].order : []).filter(w => WEAPONS[w] && (!WEAPONS[w].tech || aiHas(N, WEAPONS[w].tech))).pop();
  const main = DSTATS[N.design.inf] ? designById2(N.design.inf) : null;
  const armor = main ? main.armor : 'leather1', pole = best('pole'), blunt = best('blunt');
  const shield = blunt && !WEAPONS[blunt].twoH ? ['tower', 'kite', 'round'].find(x => SHIELD_DEFS[x] && aiHas(N, SHIELD_DEFS[x].tech)) || null : null;
  const sig = [armor, pole, blunt, shield].join('|');
  if (N.cdSig === sig && N.cdes && DSTATS[N.cdes.pole] && DSTATS[N.cdes.blunt]) return N.cdes;
  N.cdSig = sig; N.cdv = (N.cdv || 0) + 1;
  const pd = { id: `ai${N.id}p${N.cdv}`, name: 'Pikeman', type: 'inf', weapon: pole || 'spear', shield: null, armor, horse: null };
  const bd = { id: `ai${N.id}b${N.cdv}`, name: 'Maceman', type: 'inf', weapon: blunt || 'club', shield, armor, horse: null };
  registerDesign(pd); registerDesign(bd);
  return (N.cdes = { pole: pd.id, blunt: bd.id });
}
const designById2 = id => (typeof ALL_DESIGNS !== 'undefined' && ALL_DESIGNS.get(id)) || designById(id) || null;
function aiPickKind(N, P, stable) {
  const normal = () => P.useCav && stable && Math.random() < 0.3 ? N.design.cav : N.design.inf;
  const C = N.counter; if (!C || C.base >= 0.999) return normal();
  const cd = aiCounterDesigns(N);
  // what the army is made of now (soldiers and those in training), by weapon family
  const have = { pole: 0, blunt: 0, base: 0 }; let tot = 0;
  const add = (k, n) => { if (k === MAGE || !MILITARY.has(k)) return; const st = DSTATS[k]; if (!st) return; const f = !st.cav && st.fam === 'pole' ? 'pole' : !st.cav && st.fam === 'blunt' ? 'blunt' : 'base'; have[f] += n; tot += n; };
  for (const v of S.units) if (v.owner === N.id && v.kind === 'army') for (const k in v.troops) add(k, v.troops[k]);
  for (const q of N.queue) add(q.kind, 1);
  // train whichever kind is furthest below its share of the plan
  let pick = 'base', gap = -Infinity;
  for (const f of ['pole', 'blunt', 'base']) { const g = C[f] - (tot ? have[f] / tot : 0); if (C[f] > 0 && g > gap) { gap = g; pick = f; } }
  return pick === 'pole' ? cd.pole : pick === 'blunt' ? cd.blunt : normal();
}

// ---------- hooks ----------
{ const sa = stepAI; stepAI = function (t) { if (S.started) stepAISurge(); return sa(t); }; }
{ const ss = setupV96; setupV96 = function (loaded) { ss(loaded); for (const N of Object.values(NATIONS)) { if (N.warPeak === undefined) N.warPeak = 0; if (N.surge === undefined) N.surge = false; } aiWarPlans.clear(); }; }

window.__v100 = { aiSurge, aiTrainTime, aiUnitCost, aiWarPlan, stepAISurge, aiNoteDefeat, aiPickKind, aiCounterDesigns };
