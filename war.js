
// ================= war & diplomacy =================
// Any two nations can be at war; several wars can run at once. Each war is between two nations and has its own
// warscore, a tug-of-war number from −100 to +100 (positive = the war's attacker is winning).
// Default is peace; a war must be declared. A nation's ally joins any war declared on it.
const RIVAL = 2, RAIDERS = 3;   // RIVAL is retired (the old single rival kingdom); AI nations use owner ids 4 to 10
const WAR = {
  declareCost: { gold: 50 },   // fee for declaring war
  occTimes: [60, 40, 20],      // seconds to occupy or retake: 1 soldier / 2–5 soldiers / 6 or more
  occCapital: 2,               // capitals take twice as long
  tickEvery: 10,               // every 10 s the side that is ahead gains +1
  truce: 480,                  // 8 minute truce after any peace deal
  goldTerm: 300,               // gold taken by the "Take gold" term
  occVal: [5, 10, 25],         // warscore for holding an outpost / fort / capital
  kill: 1, wipe: 5,
  gold: 20, provs: 50, total: 100, maxProvs: 5, splitAt: 10,
  stallWindow: 300, stallScore: 10, heavyLoss: 0.1,   // white peace if neither side passes 10 warscore in 5 minutes; the time tick starts after a fort falls or a battle costs a side 10% of its army
  maxVsPlayer: 2,              // no more than 2 nations may be at war with the player at the same time
  allyTruce: 120, allyAskAgain: 300,
  totalResearch: 100           // research points in every unlocked tree for a Total Victory
};
// the AI nations, by owner id (filled in by the lobby when a game starts)
const NATIONS = {};
const nationOf = p => { const b = S.buildings.get(p); return b ? b.owner : 0; };
const isNation = o => o === ME || !!NATIONS[o];
const aliveNation = o => o === ME ? !S.fallen : !!(NATIONS[o] && NATIONS[o].alive);
const aiIds = () => Object.keys(NATIONS).map(Number);
const liveNations = () => [ME, ...aiIds()].filter(aliveNation);
const stockOf = o => o === ME ? S.stock : NATIONS[o] ? NATIONS[o].stock : { gold: 0, wood: 0, food: 0 };
const theName = o => o === ME ? 'you' : 'the ' + PLAYERS[o].name;
const TheName = o => o === ME ? 'You' : 'The ' + PLAYERS[o].name;
const dot = o => `<i style="background:${PLAYERS[o].color}"></i>`;

S.wars = []; S.truces = new Map(); S.allies = []; S.warSeq = 0; S.met = new Set(); S.allyAsk = new Map(); S.allyOffer = null;
const pairKey = (x, y) => x < y ? x + ':' + y : y + ':' + x;
const warBetween = (x, y) => { for (const w of S.wars) if ((w.a === x && w.b === y) || (w.a === y && w.b === x)) return w; return null; };
const atWar = (x, y) => !!warBetween(x, y);
const warsOf = o => S.wars.filter(w => w.a === o || w.b === o);
const foeOf = (w, o) => w.a === o ? w.b : w.a;
const enemiesOf = o => warsOf(o).map(w => foeOf(w, o));
// raiders attack everyone; nations only fight while at war with each other
const hostile = (a, b) => a !== b && (a === RAIDERS || b === RAIDERS || (S.wars.length > 0 && atWar(a, b)));
const truceLeft = (x, y) => Math.max(0, (S.truces.get(pairKey(x, y)) || 0) - S.t);
const allyOf = o => { for (const A of S.allies) { if (A.a === o) return A.b; if (A.b === o) return A.a; } return 0; };
const allied = (x, y) => S.allies.some(A => (A.a === x && A.b === y) || (A.a === y && A.b === x));
const provsOf = o => { const out = []; for (const [p, b] of S.buildings) if (b.owner === o) out.push(p); return out; };
const myProvs = () => provsOf(ME);
const rivalProvs = () => [];   // kept for old debug hooks
const capitalOf = o => { if (o === ME && S.buildings.has(S.capital) && S.buildings.get(S.capital).owner === ME && S.buildings.get(S.capital).stage === 2) return S.capital; for (const [p, b] of S.buildings) if (b.owner === o && b.stage === 2) return p; return -1; };
const fmtTime = s => { s = Math.ceil(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const STAGE_WORD = ['outpost', 'fort', 'capital'];
// soldiers standing (not moving, fighting or retreating) in a province
const soldiersIn = (o, p) => S.units.reduce((n, v) => n + (v.kind === 'army' && v.owner === o && v.prov === p && !v.retreating && !v.moving && !v.battle ? troopCount(v) : 0), 0);
const occTimeFor = (n, stage) => (n >= 6 ? WAR.occTimes[2] : n >= 2 ? WAR.occTimes[1] : WAR.occTimes[0]) * (stage === 2 ? WAR.occCapital : 1);
// the player hears about wars and alliances of nations he has met
const knows = o => o === ME || S.met.has(o);

// ---------- province names ----------
const NAME_A = ['Ash', 'Bram', 'Cald', 'Dun', 'Elm', 'Fen', 'Gal', 'Hol', 'Iver', 'Kel', 'Lor', 'Mar', 'Nor', 'Oak', 'Pell', 'Quen', 'Ros', 'Stan', 'Thorn', 'Ul', 'Vel', 'Wyn', 'Yar', 'Brin', 'Cor', 'Del', 'Gorm', 'Hart', 'Lin', 'Mor'];
const NAME_B = { grassland: ['dale', 'field', 'ford', 'stead', 'meadow', 'wold', 'hill', 'ton'], forest: ['wood', 'holt', 'shaw', 'glen', 'hollow', 'grove', 'thicket', 'wald'], desert: ['sand', 'dune', 'reach', 'mesa', 'rock', 'waste', 'flats', 'spire'], swamp: ['marsh', 'mire', 'fen', 'bog', 'moss', 'mere', 'sump', 'wash'] };
const provNames = [];
function provName(p) {
  if (!provNames.length) {
    const r = rngFrom(world.seed + ':names'), used = new Set();
    world.provinces.forEach((P, i) => {
      const B = NAME_B[P.terrain] || NAME_B.grassland; let n, k = 0;
      do { n = NAME_A[Math.floor(r() * NAME_A.length)] + B[Math.floor(r() * B.length)]; } while (used.has(n) && ++k < 30);
      used.add(n); provNames[i] = n;
    });
  }
  return (S.provRename && S.provRename.get(p)) || provNames[p];   // T03: provinces can be renamed
}
// hop distances over open borders (or any border with nbr = allNbr) from one or more provinces
function hopsFrom(src, nbr = openNbr) {
  const d = new Array(G.provs.length).fill(Infinity), q = Array.isArray(src) ? [...src] : [src];
  q.forEach(s => d[s] = 0);
  for (let i = 0; i < q.length; i++) { const a = q[i]; for (const n of nbr[a]) { const b = typeof n === 'number' ? n : n.q; if (d[b] === Infinity) { d[b] = d[a] + 1; q.push(b); } } }
  return d;
}

// ---------- declaring war ----------
// a declaration may never leave more than 2 nations at war with the player (counting an ally pulled in)
function capBreak(pairs) {
  const foes = new Set(enemiesOf(ME));
  for (const [x, y] of pairs) { if (x === ME) foes.add(y); if (y === ME) foes.add(x); }
  return foes.size > WAR.maxVsPlayer;
}
function declareWhy(att, def) {
  if (att === def || !aliveNation(att) || !aliveNation(def)) return 'There is no one to declare war on';
  if (atWar(att, def)) return 'Already at war';
  if (allied(att, def)) return 'Allies can’t go to war with each other';
  const tl = truceLeft(att, def); if (tl > 0) return `Truce: ${fmtTime(tl)} left`;
  if (!nationsBorder(att, def)) return att === ME ? 'You can only declare war on a nation that borders you' : 'They don’t border each other';
  const join = allyOf(def), pairs = [[att, def]];
  if (join && join !== att && !atWar(att, join)) pairs.push([att, join]);
  if (capBreak(pairs)) return att === ME ? `At most ${WAR.maxVsPlayer} nations can be at war with you at once` : `${PLAYERS[ME].name} already faces ${WAR.maxVsPlayer} enemies`;
  const st = stockOf(att), short = Object.keys(WAR.declareCost).filter(k => st[k] < WAR.declareCost[k]);
  return short.length ? 'Need ' + short.map(k => WAR.declareCost[k] + ' ' + k).join(', ') : '';
}
// two nations border each other when a province of one touches a province of the other
function nationsBorder(a, b) {
  for (const [p, bl] of S.buildings) if (bl.owner === a && allNbr[p].some(q => nationOf(q) === b)) return true;
  return false;
}
function newWar(att, def, parent) {
  const w = { id: ++S.warSeq, a: att, b: def, by: att, base: 0, since: S.t, nextTick: S.t + WAR.tickEvery, battles: 0, active: false, winStart: S.t, peak: 0, parent, demandAt: S.t + 30 };
  S.wars.push(w); return w;
}
function declareWar(att = ME, def) {
  if (def === undefined) return toast('Pick a nation in the Diplomacy panel to declare war on.', true);
  const why = declareWhy(att, def);
  if (why) { if (att === ME) toast('Can’t declare war: ' + why.charAt(0).toLowerCase() + why.slice(1) + '.', true); return null; }
  const st = stockOf(att); for (const k in WAR.declareCost) st[k] -= WAR.declareCost[k];
  const w = newWar(att, def, null), join = allyOf(def);
  let jw = null; if (join && join !== att && !atWar(att, join)) jw = newWar(att, join, w.id);
  if (att === ME || def === ME || join === ME) sfx('war_declare');
  if (att === ME) { S.met.add(def); toast(`You declared war on the ${PLAYERS[def].name}!${jw ? ` Their ally, the ${PLAYERS[join].name}, joins the war against you.` : ''} (−${costText(WAR.declareCost)})`, true); }
  else if (def === ME) { S.met.add(att); toast(`The ${PLAYERS[att].name} has declared war on you!${jw ? ` They are also at war with your ally, the ${PLAYERS[join].name}.` : ''}`, true); flashDip(); }
  else if (join === ME) { S.met.add(att); toast(`The ${PLAYERS[att].name} attacked your ally, the ${PLAYERS[def].name}: you are at war with them too!`, true); flashDip(); }
  else if (knows(att) || knows(def)) toast(`The ${PLAYERS[att].name} declared war on the ${PLAYERS[def].name}.`);
  provKey = ''; dipKey = ''; dipTerm = 'white'; S.dipPick.clear();
  return w;
}

// ---------- warscore ----------
function occScore(w) {
  let s = 0;
  for (const [p, o] of S.occ) { const b = S.buildings.get(p); if (!b) continue; if (b.owner === w.b && o === w.a) s += WAR.occVal[b.stage]; else if (b.owner === w.a && o === w.b) s -= WAR.occVal[b.stage]; }
  return s;
}
// a province occupied by a third nation can't be handed over in a peace deal
const takeable = (p, winner) => { const o = S.occ.get(p); return o === undefined || o === winner; };
const clampWS = n => Math.max(-100, Math.min(100, n));
// warscore of a war seen from one side (positive = that side is winning)
const warscore = (w, side) => { if (!w) return 0; const s = clampWS(Math.round(w.base + occScore(w))); return side === w.b ? -s : s; };
function addScore(w, side, n) { w.base = clampWS(w.base + (side === w.a ? n : -n)); }
const battleWar = b => b && b.order && b.order.length >= 2 ? warBetween(b.order[0], b.order[1]) : null;
const nationBattle = b => !!battleWar(b);
function warKill(b, owner, n) { const w = battleWar(b); if (!w || !n || (owner !== w.a && owner !== w.b)) return; const foe = foeOf(w, owner); addScore(w, foe, WAR.kill * n); w.battles += foe === w.a ? n : -n; }
function warWipe(b, a) { const w = battleWar(b); if (!w || (a.owner !== w.a && a.owner !== w.b)) return; const foe = foeOf(w, a.owner); addScore(w, foe, WAR.wipe); w.battles += foe === w.a ? WAR.wipe : -WAR.wipe; }

// ---------- occupation, the time tick and AI peace ----------
let warLastT = null;
function stepWar(t) {
  const dt = Math.max(0, Math.min(0.5, t - (warLastT ?? t))); warLastT = t;
  if (!S.wars.length && !S.occ.size) return;
  // soldiers standing in each province, by owner
  const stand = new Map();
  for (const v of S.units) if (v.kind === 'army' && !v.retreating && !v.moving && !v.battle) { const n = troopCount(v); if (n > 0) { const k = v.prov * 16 + v.owner; stand.set(k, (stand.get(k) || 0) + n); } }
  const has = (o, p) => stand.get(p * 16 + o) || 0;
  // armies in a province in any state but retreating (walking back to their spot after a battle counts)
  const near = new Set(); for (const v of S.units) if (v.kind === 'army' && !v.retreating && troopCount(v) > 0) near.add(v.prov * 16 + v.owner);
  const fighting = new Set(S.battles.map(b => b.prov));
  for (const [p, b] of S.buildings) {
    if (!isNation(b.owner)) continue;
    const O = b.owner, occBy = S.occ.get(p);
    if (occBy !== undefined && !atWar(O, occBy)) { S.occ.delete(p); continue; }
    const foes = enemiesOf(O);
    if (!foes.length) { if (S.occProg.has(p)) S.occProg.delete(p); continue; }
    let goal = null;   // who is taking control of this province
    if (!fighting.has(p)) {
      if (occBy === undefined) { if (!has(O, p)) goal = foes.find(f => has(f, p)) ?? null; }
      else if (has(O, p) && !foes.some(f => has(f, p))) goal = O;
    }
    const pr = S.occProg.get(p);
    if (goal === null) {
      // a capture is frozen, not lost, while a battle is fought over the province or the capturing army is just repositioning
      if (pr && (fighting.has(p) || (near.has(p * 16 + pr.by) && !enemiesOf(pr.by).some(f => has(f, p))))) continue;
      if (pr) S.occProg.delete(p); continue;
    }
    const cur = pr && pr.by === goal ? pr : { by: goal, f: 0 };
    cur.f += dt / (occTimeFor(has(goal, p), b.stage) + moatDelay(b, goal)); S.occProg.set(p, cur);
    if (cur.f < 1) continue;
    S.occProg.delete(p);
    const name = provName(p), what = STAGE_WORD[b.stage], mine = O === ME || goal === ME || occBy === ME;
    if (goal === O) { S.occ.delete(p); if (mine) toast(goal === ME ? `${name} liberated!` : `The enemy has retaken ${name}.`, goal !== ME); }
    else {
      S.occ.set(p, goal);
      const w = warBetween(goal, O);
      if (mine && b.stage >= 1) sfx(goal === ME ? 'war_fort_win' : 'war_fort_lose', { vol: 1 });
      if (w && b.stage >= 1 && !w.active) { w.active = true; if (mine) toast(`A ${STAGE_WORD[b.stage]} has fallen: the war has turned serious, and the side ahead now gains warscore over time.`); }
      if (mine) toast(goal === ME ? `${name} occupied! +${WAR.occVal[b.stage]} warscore while you hold this ${what}.` : `The ${PLAYERS[goal].name} has occupied your ${what} at ${name}! (−${WAR.occVal[b.stage]})`, goal !== ME);
    }
    if (mine) computeIncome();
    provKey = ''; dipKey = '';
  }
  for (const w of S.wars.slice()) stepOneWar(w, t);
  checkAIDemands(t);
}
function stepOneWar(w, t) {
  // Total Victory happens on its own the moment a war reaches 100 warscore
  { const s = warscore(w, w.a); if (Math.abs(s) >= WAR.total) { makePeace(w, s > 0 ? w.a : w.b, { kind: 'total' }); return; } }
  // a nation with every province occupied and no army left has lost: the warscore goes straight to 100 (GPC27)
  for (const L of [w.a, w.b]) if (brokenNation(L)) { const win = foeOf(w, L); addScore(w, win, 200); if (w.a === ME || w.b === ME) toast(L === ME ? `Every province you hold is occupied and you have no army left: the ${PLAYERS[win].name} wins the war.` : `The ${PLAYERS[L].name} is fully occupied and has no army left: warscore 100%.`, L === ME); makePeace(w, win, { kind: 'total' }); return; }
  // the time tick only runs once the war has turned serious: a fort or capital occupied, or a battle that cost a side 10% of its army
  while (t >= w.nextTick) { const s = warscore(w, w.a); if (s && w.active) addScore(w, s > 0 ? w.a : w.b, 1); w.nextTick += WAR.tickEvery; }
  // a war where neither side gets past 10 warscore in 5 minutes ends in white peace
  w.peak = Math.max(w.peak, Math.abs(warscore(w, w.a)));
  if (t - w.winStart >= WAR.stallWindow) {
    if (w.peak <= WAR.stallScore) {
      if (w.a === ME || w.b === ME) toast(`Neither side got past ${WAR.stallScore} warscore in ${WAR.stallWindow / 60} minutes. The war with the ${PLAYERS[foeOf(w, ME)].name} ends in white peace.`);
      makePeace(w, w.a, { kind: 'white' }); return;
    }
    w.winStart = t; w.peak = Math.abs(warscore(w, w.a));
  }
  if (w.a !== ME && w.b !== ME) aiPeace(w, t);
}
// between two AI nations, the side that is ahead dictates the peace
function brokenNation(o) {
  const own = provsOf(o); if (!own.length || !own.every(p => S.occ.has(p))) return false;
  return !S.units.some(v => v.kind === 'army' && v.owner === o && troopCount(v) > 0);
}
function aiPeace(w, t) {
  const s = warscore(w, w.a), lead = s > 0 ? w.a : w.b, loser = foeOf(w, lead), sc = Math.abs(s);
  if (sc >= WAR.provs && t >= w.demandAt) {
    w.demandAt = t + 60;
    const provs = connectedPick(lead, loser);
    makePeace(w, lead, provs.length ? { kind: 'provs', provs } : { kind: 'gold' });
  }
}

// ---------- peace ----------
// terms (seen from the player): white peace (any score), take gold (+20), take up to 5 non-capital provinces (+50), total victory (+100)
function peaceCheck(w, kind, provs) {
  if (!w || !S.wars.includes(w)) return 'Not at war';
  const s = warscore(w, ME), foe = foeOf(w, ME);
  if (kind === 'white') return '';
  if (kind === 'gold') return s >= WAR.gold ? '' : `Needs +${WAR.gold} warscore`;
  if (kind === 'provs') {
    if (s < WAR.provs) return `Needs +${WAR.provs} warscore`;
    if (!provs || !provs.length) return 'Pick at least one province';
    if (provs.length > WAR.maxProvs) return `At most ${WAR.maxProvs} provinces`;
    if (provs.some(p => nationOf(p) !== foe || S.buildings.get(p).stage === 2)) return 'Capitals can’t be demanded';
    { const held = provs.filter(p => !takeable(p, ME)); if (held.length) return `${held.map(provName).join(', ')} ${held.length > 1 ? 'are' : 'is'} occupied by another nation`; }
    return seizeWhy(ME, foe, provs);
  }
  return 'Unknown term';
}
// a battle between two nations at war that cost one side more than 10% of its whole army makes the war serious
function warBattleCheck(b) {
  const w = battleWar(b); if (!w || w.active) return;
  for (const o of [w.a, w.b]) { const lost = b.lost[o] || 0; if (lost && lost > WAR.heavyLoss * (soldierCount(o) + lost)) { w.active = true; if (w.a === ME || w.b === ME) toast('A bloody battle: the war has turned serious, and the side ahead now gains warscore over time.'); return; } }
}
// which provinces the loser hands over on total victory: at most 5, nearest the winner, never the capital
function splitHalf(loser, winner) { return connectedPick(winner, loser); }
// seized provinces must connect to the winner's capital: through the winner's own land, or through other provinces taken in the same deal
function capitalLand(o) {
  const cap = capitalOf(o), set = new Set(); if (cap < 0) return set;
  const q = [cap]; set.add(cap);
  for (let i = 0; i < q.length; i++) for (const n of allNbr[q[i]]) if (!set.has(n) && nationOf(n) === o) { set.add(n); q.push(n); }
  return set;
}
function seizeWhy(winner, loser, provs) {
  const land = capitalLand(winner), left = new Set(provs);
  let grew = true;
  while (grew && left.size) { grew = false; for (const p of [...left]) if (allNbr[p].some(n => land.has(n))) { land.add(p); left.delete(p); grew = true; } }
  return left.size ? `${[...left].map(provName).join(', ')} ${left.size > 1 ? 'don’t' : 'doesn’t'} connect to your capital` : '';
}
// the up-to-5 provinces a winner takes: nearest first, each one touching the winner's capital land (or one already taken)
function connectedPick(winner, loser, n = WAR.maxProvs) {
  const land = capitalLand(winner), cap = capitalOf(loser), out = [];
  const cand = provsOf(loser).filter(p => p !== cap && takeable(p, winner));
  while (out.length < n) {
    const ok = cand.filter(p => !out.includes(p) && allNbr[p].some(q => land.has(q)));
    if (!ok.length) break;
    ok.sort((a, b) => (S.occ.get(b) === winner) - (S.occ.get(a) === winner) || a - b);
    out.push(ok[0]); land.add(ok[0]);
  }
  return out;
}
// Total Victory (v86) pays out the 5 provinces nearest the winner's capital by walking distance: the way an army would
// march there, through open borders (not over mountains or across water). Provinces the winner can't walk to are skipped,
// however close they look; the loser's capital is never taken.
function walkDistFrom(src) {
  const d = new Array(G.provs.length).fill(Infinity), done = new Uint8Array(G.provs.length), ic = i => G.provs[i].ic;
  for (const s of src) d[s] = 0;
  for (;;) {
    let a = -1; for (let i = 0; i < d.length; i++) if (!done[i] && d[i] < Infinity && (a < 0 || d[i] < d[a])) a = i;
    if (a < 0) break; done[a] = 1;
    for (const { q } of openNbr[a]) { const nd = d[a] + Math.hypot(ic(q)[0] - ic(a)[0], ic(q)[1] - ic(a)[1]); if (nd < d[q]) d[q] = nd; }
  }
  return d;
}
function totalPick(winner, loser, n = WAR.maxProvs) {
  const cap = capitalOf(winner), src = cap >= 0 ? [cap] : provsOf(winner);
  if (!src.length) return connectedPick(winner, loser, n);
  const d = walkDistFrom(src), lcap = capitalOf(loser);
  return provsOf(loser).filter(p => p !== lcap && takeable(p, winner) && d[p] < Infinity).sort((a, b) => d[a] - d[b] || a - b).slice(0, n);
}
// annexing the whole country is only possible when no third nation occupies any of it
function totalTerms(loser, winner) { const own = provsOf(loser); return own.length <= WAR.maxProvs && (winner === undefined || own.every(p => takeable(p, winner))) ? 'annex' : 'split'; }
function transferProv(p, to) {
  const b = S.buildings.get(p); if (!b) return;
  // conquered land is demoted to an outpost (a capital or fort loses its walls); every building stays
  const from = b.owner;
  b.stage = 0;
  b.owner = to; b.born = S.t; S.upgrades.delete(p); S.occ.delete(p); S.occProg.delete(p);
  for (const k of [...S.xup.keys()]) if (k.startsWith(p + '@')) S.xup.delete(k);
  for (const u of S.units) { if (u.build && u.build.prov === p) cancelBuild(u); if (u.pending && u.pending.prov === p) u.pending = null; }
  if (to === ME) { S.surveyed.set(p, S.t); S.known.add(p); }
  if (typeof aiOnTransfer === 'function') aiOnTransfer(p, from, to);
}
// after a peace deal, anyone left in a foreign nation's land marches home: they can't be selected until they reach their own province
function evictArmies() {
  let mine = 0;
  for (const a of S.units) {
    if (!isNation(a.owner)) continue;
    const n = nationOf(a.prov);
    if (!n || n === a.owner || hostile(a.owner, n) || allied(a.owner, n)) continue;
    const own = provsOf(a.owner); if (!own.length) continue;
    a.exiting = true; a.battle = null; a.retreating = false; a.retreatHome = false;
    if (a.surveyQueue) a.surveyQueue = []; a.survey = null; a.aiSurvey = null; a.scouting = null; a.pendingSurvey = -1; if (a.pending) a.pending = null; if (a.build) cancelBuild(a);
    if (a.cast && typeof cancelCast === 'function') cancelCast(a);
    const d = hopsFrom(a.prov), dest = own.sort((x, y) => d[x] - d[y])[0];
    if (!order(a, dest, true)) { a.prov = dest; a.slot = freeSlot(dest, a); [a.x, a.y] = slotPos(dest, a.slot); a.path = []; a.moving = false; a.exiting = false; }
    else if (a.owner === ME) mine++;
  }
  S.selected = S.selected.filter(u => !u.exiting);
  if (mine) toast(`${mine} of your unit${mine > 1 ? 's are' : ' is'} in foreign land and will march home. They can’t be commanded until they reach your territory.`);
}
// end a war: occupations between the two sides are lifted, their battles stop, a truce begins; wars joined through it end too
function endWar(w) {
  S.wars = S.wars.filter(x => x !== w);
  const pair = o => o === w.a || o === w.b;
  for (const [p, o] of [...S.occ]) { const b = S.buildings.get(p); if (!b || (pair(o) && pair(b.owner))) S.occ.delete(p); }
  for (const [p, pr] of [...S.occProg]) { const b = S.buildings.get(p); if (!b || (pair(pr.by) && pair(b.owner))) S.occProg.delete(p); }
  for (const b of S.battles.slice()) if (b.order && b.order.length >= 2 && pair(b.order[0]) && pair(b.order[1])) { b.peace = true; endBattle(b, -1, {}); }
  S.truces.set(pairKey(w.a, w.b), S.t + WAR.truce);
  if (S.demand && S.demand.war === w.id) { S.demand = null; $q('#demand').hidden = true; }
  if (dipWar === w.id) { S.dipPick.clear(); }
  for (const c of S.wars.filter(x => x.parent === w.id)) {
    endWar(c);
    if (c.a === ME || c.b === ME) toast(`The war that drew you in is over: white peace with the ${PLAYERS[foeOf(c, ME)].name}.`);
  }
}
function makePeace(w, winner, terms) {
  if (!w || !S.wars.includes(w)) return;
  const loser = foeOf(w, winner), me = winner === ME || loser === ME, lines = [];
  let fallen = false, annexed = 0;
  const W = PLAYERS[winner].name, L = PLAYERS[loser].name;
  if (terms.kind === 'gold') {
    const ls = stockOf(loser), ws = stockOf(winner), g = Math.min(WAR.goldTerm, Math.floor(ls.gold));
    ls.gold -= g; ws.gold += g;
    lines.push(winner === ME ? `You take ${g} gold` : loser === ME ? `You pay ${g} gold` : `The ${W} takes ${g} gold`);
  } else if (terms.kind === 'provs') {
    const provs = terms.provs.filter(p => nationOf(p) === loser && takeable(p, winner));
    provs.forEach(p => transferProv(p, winner));
    lines.push(winner === ME ? `You gain ${provs.length} province${provs.length > 1 ? 's' : ''}: ${provs.map(provName).join(', ')}` : loser === ME ? `You cede ${provs.length} province${provs.length > 1 ? 's' : ''}: ${provs.map(provName).join(', ')}` : `The ${W} takes ${provs.length} province${provs.length > 1 ? 's' : ''}`);
  } else if (terms.kind === 'total') {
    // Total Victory: up to 5 provinces (the whole country if it has 5 or fewer), a minute of the loser's gold income
    // from its treasury (as much as it has), and 100 research points in every tree the winner has unlocked
    const ls = stockOf(loser), ws = stockOf(winner), inc = loser === ME ? income.gold : NATIONS[loser] ? NATIONS[loser].income.gold : 0;
    const g = Math.min(Math.floor(ls.gold), Math.max(0, Math.round(inc * 60 / TICK)));
    ls.gold -= g; ws.gold += g;
    let taken;
    if (totalTerms(loser, winner) === 'annex') { taken = provsOf(loser); taken.forEach(p => transferProv(p, winner)); if (loser === ME) fallen = true; else annexed = loser; }
    else { taken = totalPick(winner, loser); taken.forEach(p => transferProv(p, winner)); }
    const trees = grantResearch(winner, WAR.totalResearch);
    const spoils = `${taken.length} province${taken.length === 1 ? '' : 's'}${annexed ? ' (the whole country)' : ''}, ${g} gold${trees ? ` and ${WAR.totalResearch} research points in ${trees}` : ''}`;
    lines.push(winner === ME ? `Total victory! You take ${spoils}` : loser === ME ? `Total defeat: the ${W} takes ${spoils}` : `Total victory: the ${W} takes ${spoils}`);
  } else lines.push('White peace: no one gains anything');
  endWar(w);
  if (annexed) killNation(annexed, winner);
  if (S.selBuilding >= 0 && !owned(S.selBuilding)) S.selBuilding = -1;
  S.selected = S.selected.filter(u => S.units.includes(u));
  evictArmies();
  territory = null; cacheDirty = true; fogDirty = true; computeIncome(); computeFog(); provKey = ''; dipKey = '';
  if (fallen) { gameOver(winner); return; }
  if (me) { sfx('war_peace'); toast(`Peace with the ${PLAYERS[foeOf(w, ME)].name}! ${lines.join('. ')}. Truce for ${WAR.truce / 60} minutes.`); }
  else if (knows(winner) || knows(loser)) toast(`The ${W} and the ${L} made peace. ${lines.join('. ')}.`);
}
// research points for a Total Victory: added to the technology being researched, or saved for the next one
function grantResearch(o, pts) {
  const names = [];
  if (o === ME) {
    for (const tree of TREE_KEYS) { const st = S.tech[tree]; if (!st.tier) continue; names.push(TECH_TREES[tree].name); if (st.cur) { st.prog += pts; if (st.prog >= techCost(TECH_BY_ID[st.cur])) finishTech(tree); } else st.bank += pts; }
    techKey = ''; techBtnKey = '';
  } else if (NATIONS[o]) {
    const N = NATIONS[o];
    for (const tree of TREE_KEYS) { const st = N.tech[tree]; if (!st.tier) continue; names.push(TECH_TREES[tree].name); if (st.cur) { st.prog += pts; if (st.prog >= aiTechCost(N, TECH_BY_ID[st.cur])) aiFinishTech(N, tree); } else st.bank += pts; }
  }
  return names.length ? names.join(', ').replace(/, ([^,]*)$/, ' and $1') : '';
}
// a nation with no land left is gone: its armies disband, its wars and alliances end
function killNation(o, by) {
  const N = NATIONS[o]; if (!N || !N.alive) return;
  N.alive = false;
  S.units = S.units.filter(v => v.owner !== o);
  for (const w of warsOf(o)) endWar(w);
  S.allies = S.allies.filter(A => A.a !== o && A.b !== o);
  for (const p of provsOf(o)) { if (by) transferProv(p, by); else { S.buildings.delete(p); S.extras.delete(p); } }
  territory = null; cacheDirty = true; dipKey = '';
  if (knows(o)) toast(`The ${PLAYERS[o].name} is no more${by && by !== o ? `: its land now belongs to ${theName(by)}` : ''}.`, by === ME ? false : undefined);
}
function gameOver(winner) {
  S.fallen = true;
  S.units = S.units.filter(v => v.owner !== ME); S.selected = [];
  for (const w of warsOf(ME)) endWar(w);
  S.allies = S.allies.filter(A => A.a !== ME && A.b !== ME);
  const el = $q('#gameover'); el.hidden = false;
  el.innerHTML = `<button type="button" class="pop-x" data-go="ok" aria-label="Dismiss" title="Dismiss">×</button><b>Your realm has fallen</b><p>${winner && PLAYERS[winner] ? `The ${PLAYERS[winner].name} annexed every province you held.` : 'You hold no land.'}</p><div class="dm-btns"><button type="button" data-go="look">Show me</button><button type="button" data-go="ok">OK</button></div><button type="button" id="goAgain">Start over</button>`;
  $q('#goAgain').onclick = () => location.reload();
  el.onclick = e => { const b = e.target.closest('[data-go]'); if (!b) return; if (b.dataset.go === 'look' && S.capital >= 0) lookAtProv(S.capital); el.hidden = true; };
}

// ---------- AI demands to the player ----------
// at −50 an enemy asks for up to 5 of your provinces (or gold if you have none to spare); at −100 it enforces total victory
function checkAIDemands(t) {
  if (S.demand || S.fallen) return;
  for (const w of warsOf(ME)) {
    const s = warscore(w, ME);
    if (s <= -WAR.provs && t >= w.demandAt) { w.demandAt = t + 60; aiDemand(w, false); return; }
  }
}
function aiDemand(w, total) {
  if (!w) return;
  const foe = foeOf(w, ME);
  let terms;
  if (total) terms = { kind: 'total' };
  else { const mine = connectedPick(foe, ME); terms = mine.length ? { kind: 'provs', provs: mine } : { kind: 'gold' }; }
  S.demand = { ...terms, war: w.id, from: foe };
  const el = $q('#demand'); el.hidden = false;
  const what = terms.kind === 'total' ? (totalTerms(ME, foe) === 'annex' ? 'the annexation of your entire realm' : `${splitHalf(ME, foe).length} of your provinces`)
    : terms.kind === 'provs' ? `${terms.provs.length} of your provinces: ${terms.provs.map(provName).join(', ')}` : `${Math.min(WAR.goldTerm, S.stock.gold)} gold`;
  el.innerHTML = `<button type="button" class="pop-x" data-dm="x" aria-label="Dismiss" title="Dismiss">×</button><div class="dm-head">${dot(foe)}<b>${PLAYERS[foe].name}</b></div>` +
    `<p>${total ? 'Warscore has reached −100. They enforce total victory:' : 'They are winning the war and demand peace. They want'} <b>${what}</b>.</p>` +
    (total ? `<div class="dm-btns"><button type="button" data-dm="look">Show me</button><button type="button" data-dm="yes">Accept</button></div>` : `<div class="dm-btns"><button type="button" data-dm="look">Show me</button><button type="button" data-dm="yes">Accept</button><button type="button" data-dm="no">Refuse</button></div>`);
  toast(total ? `The ${PLAYERS[foe].name} enforces total victory.` : `The ${PLAYERS[foe].name} demands peace.`, true);
}
function answerDemand(yes) {
  const d = S.demand; if (!d) return;
  const w = S.wars.find(x => x.id === d.war);
  if (yes && w) { makePeace(w, d.from, d); S.demand = null; $q('#demand').hidden = true; return; }
  S.demand = null; $q('#demand').hidden = true; if (w) toast('You refused. The war goes on.');
}
// an AI nation asks the player to ally against a common threat
function offerAlliance(from, vs) {
  if (S.allyOffer || S.demand) return false;
  S.allyOffer = { from, vs, t: S.t };
  const el = $q('#demand'); el.hidden = false;
  el.innerHTML = `<button type="button" class="pop-x" data-ao="no" aria-label="Dismiss" title="Dismiss">×</button><div class="dm-head">${dot(from)}<b>${PLAYERS[from].name}</b></div>` +
    `<p>They fear the ${PLAYERS[vs].name} (${provsOf(vs).length} provinces) and propose an <b>alliance</b>: if anyone declares war on one of you, the other joins the war.</p>` +
    `<div class="dm-btns"><button type="button" data-ao="look">Show me</button><button type="button" data-ao="yes">Ally</button><button type="button" data-ao="no">Decline</button></div>`;
  sfx('wn_ally'); return true;
}
function answerAlliance(yes) {
  const o = S.allyOffer; if (!o) return;
  S.allyOffer = null; $q('#demand').hidden = true;
  if (yes && !allyWhy(ME, o.from)) { formAlliance(ME, o.from, o.vs); }
  else { S.allyAsk.set(o.from, S.t + WAR.allyAskAgain); if (yes) toast('The alliance is no longer possible.', true); }
}
$q('#demand').addEventListener('pointerdown', e => e.stopPropagation());
$q('#demand').addEventListener('click', e => {
  const b = e.target.closest('[data-dm]');
  if (b) {
    const d = S.demand;
    if (b.dataset.dm === 'look') { if (d) { if (d.provs && d.provs.length) lookAtProv(d.provs[0]); else lookAtNation(d.from); } return; }
    // the X: a demand you can refuse is refused; total victory can't be refused, so it only steps aside and comes back
    if (b.dataset.dm === 'x') { if (d && d.kind === 'total') { $q('#demand').hidden = true; S.demand = null; const w = S.wars.find(x => x.id === d.war); if (w) setTimeout(() => { if (S.wars.includes(w) && !S.demand) aiDemand(w, true); }, 20000); toast('Total victory is enforced: the demand returns shortly.', true); return; } return answerDemand(false); }
    return answerDemand(b.dataset.dm === 'yes');
  }
  const a = e.target.closest('[data-ao]');
  if (a) { if (a.dataset.ao === 'look') { if (S.allyOffer) lookAtNation(S.allyOffer.from); return; } answerAlliance(a.dataset.ao === 'yes'); }
});

// ---------- alliances ----------
// two nations at peace, neither already allied, that both border a nation at least 25% larger than each of them may ally.
// If anyone declares war on one, the other is at war with the attacker too. The alliance ends when the common threat
// is gone, no longer 25% larger, or no longer borders one of them; then the two get a 2-minute truce.
function borderSets() {
  const B = new Map();
  for (const [p, b] of S.buildings) {
    if (!isNation(b.owner)) continue;
    for (const q of allNbr[p]) { const ob = S.buildings.get(q); if (ob && ob.owner !== b.owner && isNation(ob.owner)) { if (!B.has(b.owner)) B.set(b.owner, new Set()); B.get(b.owner).add(ob.owner); } }
  }
  return B;
}
function sizes() { const n = new Map(); for (const b of S.buildings.values()) n.set(b.owner, (n.get(b.owner) || 0) + 1); return n; }
function commonThreat(a, b, B = borderSets(), N = sizes()) {
  let best = 0;
  for (const c of liveNations()) {
    if (c === a || c === b) continue;
    const bc = B.get(c); if (!bc || !bc.has(a) || !bc.has(b)) continue;
    const n = N.get(c) || 0; if (n < 1.25 * (N.get(a) || 0) || n < 1.25 * (N.get(b) || 0)) continue;
    if (!best || n > (N.get(best) || 0)) best = c;
  }
  return best;
}
function allyWhy(a, b, B, N) {
  if (!aliveNation(a) || !aliveNation(b) || a === b) return 'Not possible';
  if (raceOf(a) !== raceOf(b)) return 'Realmlings and Swamplings never ally';
  if (allied(a, b)) return 'Already allies';
  if (allyOf(a)) return a === ME ? 'You already have an ally' : 'They already have an ally';
  if (allyOf(b)) return b === ME ? 'You already have an ally' : 'They already have an ally';
  if (atWar(a, b)) return 'You are at war';
  if (warsOf(a).length || warsOf(b).length) return 'Neither side may be at war';
  if (truceLeft(a, b) > 0) return `Truce: ${fmtTime(truceLeft(a, b))} left`;
  if (!commonThreat(a, b, B, N)) return 'Only against a common neighbor at least 25% larger than both of you';
  return '';
}
function formAlliance(a, b, vs) {
  S.allies.push({ a, b, vs, since: S.t });
  if (a === ME || b === ME) { const o = a === ME ? b : a; S.met.add(o); sfx('wn_ally'); toast(`You are now allied with the ${PLAYERS[o].name} against the ${PLAYERS[vs].name}.`); }
  else if (knows(a) || knows(b)) toast(`The ${PLAYERS[a].name} and the ${PLAYERS[b].name} formed an alliance against the ${PLAYERS[vs].name}.`);
  dipKey = '';
}
let allyEndSeq = 0;
function endAlliance(A, why) {
  S.allies = S.allies.filter(x => x !== A);
  if (aliveNation(A.a) && aliveNation(A.b)) S.truces.set(pairKey(A.a, A.b), Math.max(S.truces.get(pairKey(A.a, A.b)) || 0, S.t + WAR.allyTruce));
  if (A.a === ME || A.b === ME) {
    const o = A.a === ME ? A.b : A.a;
    toast(`Your alliance with the ${PLAYERS[o].name} has ended: ${why}.`);
    if (why !== 'you ended it') { S.allyEnds = (S.allyEnds || []).filter(x => x.o !== o); S.allyEnds.push({ id: ++allyEndSeq, o, why, t: S.t }); flagKey = ''; sfx('war_peace'); }
  }
  else if (knows(A.a) || knows(A.b)) toast(`The alliance of the ${PLAYERS[A.a].name} and the ${PLAYERS[A.b].name} has ended.`);
  dipKey = '';
}
function stepAlliances() {
  const B = borderSets(), N = sizes();
  for (const A of S.allies.slice()) {
    let why = '';
    if (!aliveNation(A.a) || !aliveNation(A.b)) why = 'an ally fell';
    else if (!aliveNation(A.vs)) why = 'the common threat is gone';
    else { const n = N.get(A.vs) || 0; if (n < 1.25 * (N.get(A.a) || 0) || n < 1.25 * (N.get(A.b) || 0)) why = `the ${PLAYERS[A.vs].name} is no longer 25% larger`; else { const bc = B.get(A.vs); if (!bc || !bc.has(A.a) || !bc.has(A.b)) why = `the ${PLAYERS[A.vs].name} no longer borders you both`; } }
    if (why) endAlliance(A, why);
  }
  const live = liveNations();
  for (const a of live) for (const b of live) {
    if (a >= b || allyWhy(a, b, B, N)) continue;
    const vs = commonThreat(a, b, B, N);
    if (a === ME || b === ME) { const o = a === ME ? b : a; if ((S.allyAsk.get(o) || 0) > S.t) continue; if (offerAlliance(o, vs)) S.allyAsk.set(o, S.t + WAR.allyAskAgain); continue; }
    formAlliance(a, b, vs);
  }
}

// ---------- diplomacy chip and panel ----------
let dipKey = '', dipOpen = false, dipTerm = 'white', dipChipKey = '', dipSel = 0, dipWar = 0, metAt = -9;
function flashDip() { const el = $q('#dip'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
function openDip(o) { if (!dipOpen) sfx('ui_panel'); dipOpen = true; dipKey = ''; $q('#dipPanel').hidden = false; if (o !== undefined) selectDip(o); }
function closeDip() { dipOpen = false; $q('#dipPanel').hidden = true; S.dipHover = -1; }
function selectDip(o) { dipSel = o; dipTerm = 'white'; S.dipPick.clear(); const w = o ? warBetween(ME, o) : null; dipWar = w ? w.id : 0; dipKey = ''; }
function preselectProvs(foe) { S.dipPick.clear(); connectedPick(ME, foe).forEach(p => S.dipPick.add(p)); }
function wsBar(s) {
  const f = (s + 100) / 200;
  return `<div class="ws" role="meter" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="${s}" aria-label="Warscore"><i class="ws-me" style="width:${Math.max(0, s) / 2}%"></i><i class="ws-them" style="width:${Math.max(0, -s) / 2}%"></i><s style="left:${f * 100}%"></s><em style="left:75%"></em><em style="left:25%"></em><em style="left:60%"></em><em style="left:40%"></em></div>`;
}
const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(Math.round(n));
const flagOf = o => o === ME ? flagURL(PLAYERS[ME].color, NATION.emblem) : flagURL(PLAYERS[o].color, NATIONS[o].emblem);
// who the player has met: a nation whose land he has explored, or that is at war or allied with him
// a nation is met when its land is explored, or when one of your Wayfinders stands next to one of its provinces
function updateMet() {
  if (!S.started || S.fallen || S.t - metAt < 1) return; metAt = S.t;
  for (const [p, b] of S.buildings) if (b.owner !== ME && NATIONS[b.owner] && !S.met.has(b.owner) && S.explored.has(p)) meetNation(b.owner);
  for (const u of S.units) if (u.owner === ME && u.kind === WAYFINDER) for (const q of allNbr[u.prov]) { const o = nationOf(q); if (o && o !== ME && NATIONS[o] && !S.met.has(o)) { metBy.set(o, u.id); meetNation(o); } }
}
// meeting a nation pauses the game with a popup until the player acknowledges it
const metQueue = [], metBy = new Map(); let metPausedByMe = false;
// "Show me" on a new nation: your Wayfinder standing next to their land (the one who met them, if he is still there), else their land
function metScout(o) {
  const next = u => u && u.owner === ME && u.kind === WAYFINDER && S.units.includes(u) && (nationOf(u.prov) === o || allNbr[u.prov].some(q => nationOf(q) === o));
  const first = S.units.find(v => v.id === metBy.get(o));
  return next(first) ? first : S.units.find(next) || null;
}
function showMetScout(o) {
  const u = metScout(o);
  if (!u) { lookAtNation(o); return; }
  S.selected = [u]; S.selBuilding = -1; S.selProv = -1; S.selPart = null; hoverPath = undefined; rosterKey = ''; cmdKey = '';
  flyTo({ x: u.x, y: u.y, z: Math.max(cam.z, fitZ * 2.2 * WORLD_K) });
}
function meetNation(o) {
  if (S.met.has(o)) return;
  S.met.add(o); dipKey = ''; metQueue.push(o);
  if (metQueue.length === 1) showMet();
}
function showMet() {
  const o = metQueue[0], el = $q('#metPop'); if (o === undefined) return;
  if (!S.paused) { togglePause(); metPausedByMe = true; }
  $q('#paused').hidden = true;
  const N = NATIONS[o], n = provsOf(o).length, al = allyOf(o);
  el.innerHTML = `<button type="button" class="pop-x" data-mp="ok" aria-label="Dismiss" title="Dismiss">×</button><img class="mp-flag" alt="" src="${flagOf(o)}"><h2><span>You have met</span>the ${PLAYERS[o].name}</h2>` +
    `<p>${n} province${n === 1 ? '' : 's'} · ${DIFF_NAME[N.diff]}${al ? ` · allied with ${al === ME ? 'you' : 'the ' + PLAYERS[al].name}` : ''}${atWar(ME, o) ? ' · at war with you' : ''}. You can see them now in Diplomacy.</p>` +
    `<div class="dm-btns"><button type="button" data-mp="look">Show me</button><button type="button" data-mp="dip">Open Diplomacy</button><button type="button" data-mp="ok">OK</button></div>`;
  el.hidden = false; sfx('wn_ally');
  setTimeout(() => { const b = el.querySelector('.dm-btns [data-mp="ok"]'); if (b) b.focus(); }, 30);
}
function closeMet(openD) {
  const o = metQueue.shift(); $q('#metPop').hidden = true;
  if (metQueue.length) { showMet(); return; }
  if (metPausedByMe && S.paused) togglePause(); else $q('#paused').hidden = !S.paused;
  metPausedByMe = false;
  if (openD) openDip(o);
}
$q('#metPop').addEventListener('pointerdown', e => e.stopPropagation());
$q('#metPop').addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.stopPropagation(); } }, true);
$q('#metPop').addEventListener('click', e => {
  const b = e.target.closest('[data-mp]'); if (!b) return;
  if (b.dataset.mp === 'look') { const o = metQueue[0]; closeMet(false); if (o !== undefined) showMetScout(o); return; }
  closeMet(b.dataset.mp === 'dip');
});
function relation(o) {
  const w = warBetween(ME, o);
  if (w) { const s = warscore(w, ME); return { cls: 'war', html: `⚔ War <b class="dp-s ${s > 0 ? 'up' : s < 0 ? 'down' : ''}">${sgn(s)}</b>` }; }
  if (allied(ME, o)) return { cls: 'ally', html: '🤝 Allied' };
  const tl = truceLeft(ME, o); if (tl > 0) return { cls: 'truce', html: `Truce ${fmtTime(tl)}` };
  return { cls: '', html: 'Peace' };
}
function renderDip(t) {
  updateMet();
  const chip = $q('#dip');
  const others = aiIds();
  if (!others.length || S.fallen) { chip.hidden = true; if (dipOpen) closeDip(); return; }
  chip.hidden = false;
  const mine = warsOf(ME);
  const ck = [mine.map(w => w.id + ':' + warscore(w, ME)).join(','), allyOf(ME), S.met.size].join('|');
  if (ck !== dipChipKey) {
    dipChipKey = ck;
    chip.classList.toggle('war', mine.length > 0);
    chip.innerHTML = mine.length
      ? `<span class="dp-l">⚔ War</span>` + mine.map(w => { const o = foeOf(w, ME), s = warscore(w, ME); return `<span class="dp-w" title="War with the ${PLAYERS[o].name}">${dot(o)}<span class="dp-wn">${PLAYERS[o].name.split(' of ').pop()}</span><b class="dp-s ${s > 0 ? 'up' : s < 0 ? 'down' : ''}">${sgn(s)}</b>${wsBar(s)}</span>`; }).join('') + `<span class="dp-btn">Diplomacy</span>`
      : `<span class="dp-l">At peace${allyOf(ME) ? ` · allied with the ${dot(allyOf(ME))}${PLAYERS[allyOf(ME)].name}` : ''}</span><span class="dp-btn">Diplomacy</span>`;
  }
  if (!dipOpen) return;
  if (dipSel && !aliveNation(dipSel)) dipSel = 0;
  const w = dipSel ? warBetween(ME, dipSel) : null; if (w && w.id !== dipWar) { dipWar = w.id; S.dipPick.clear(); dipTerm = 'white'; } if (!w) dipWar = 0;
  const key = [ck, dipSel, dipTerm, [...S.dipPick].join(','), S.occ.size, Math.floor(t), S.stock.gold, S.wars.length, S.allies.length].join('|');
  if (key === dipKey) return; dipKey = key;
  const el = $q('#dipPanel');
  if (!dipSel) { el.innerHTML = dipListHTML(); return; }
  el.innerHTML = dipNationHTML(dipSel, w);
}
function dipListHTML() {
  const met = aiIds().filter(o => S.met.has(o)), unmet = aiIds().filter(o => !S.met.has(o) && aliveNation(o)).length;
  const rows = met.map(o => {
    const N = NATIONS[o], r = relation(o), n = provsOf(o).length;
    return `<button type="button" class="dp-row ${r.cls}${N.alive ? '' : ' gone'}" data-dp="sel" data-o="${o}"><img alt="" src="${flagOf(o)}"><span><b>${PLAYERS[o].name}</b><small>${N.alive ? `${n} province${n === 1 ? '' : 's'} · ${DIFF_NAME[N.diff]}${allyOf(o) && allyOf(o) !== ME ? ` · allied with the ${PLAYERS[allyOf(o)].name}` : ''}` : 'Fallen'}</small></span><em>${N.alive ? r.html : ''}</em></button>`;
  }).join('');
  const aiWars = S.wars.filter(w => w.a !== ME && w.b !== ME && (S.met.has(w.a) || S.met.has(w.b)));
  const warRows = aiWars.map(w => { const s = warscore(w, w.a); return `<div class="dp-aw">${dot(w.a)}${PLAYERS[w.a].name} <span>⚔</span> ${dot(w.b)}${PLAYERS[w.b].name}<b>${sgn(s)}</b></div>`; }).join('');
  const allyRows = S.allies.filter(A => A.a !== ME && A.b !== ME && (S.met.has(A.a) || S.met.has(A.b))).map(A => `<div class="dp-aw">${dot(A.a)}${PLAYERS[A.a].name} <span>🤝</span> ${dot(A.b)}${PLAYERS[A.b].name}</div>`).join('');
  return `<div class="dp-head"><img class="dp-flag" alt="" src="${flagOf(ME)}"><span class="dp-ttl"><b>Diplomacy</b><small>At war with ${enemiesOf(ME).length} of at most ${WAR.maxVsPlayer} nations</small></span><button type="button" class="dp-x" data-dp="close" aria-label="Close diplomacy">×</button></div>` +
    (rows || `<p class="dp-p">You haven’t met anyone yet. Explore with your Wayfinders to find the other nations.</p>`) +
    (unmet ? `<p class="dp-note">${unmet} nation${unmet > 1 ? 's' : ''} you haven’t met yet.</p>` : '') +
    (warRows || allyRows ? `<div class="dp-sec">Between other nations</div>${warRows}${allyRows}` : '');
}
function dipNationHTML(o, w) {
  const R = PLAYERS[o], N = NATIONS[o];
  const head = `<div class="dp-head"><button type="button" class="dp-x dp-back" data-dp="back" aria-label="Back to all nations">‹</button><img class="dp-flag" alt="" src="${flagOf(o)}"><span class="dp-ttl"><b>${R.name}</b><small>${provsOf(o).length} provinces · ${S.units.filter(v => v.owner === o && v.kind === 'army').length} armies (power ${nationPower(o)}; yours ${nationPower(ME)}) · ${DIFF_NAME[N.diff]}</small></span><button type="button" class="dp-x" data-dp="close" aria-label="Close diplomacy">×</button></div>`;
  if (!N.alive) return head + `<p class="dp-p">This nation has fallen.</p>`;
  if (!w) {
    const why = declareWhy(ME, o), aw = allyWhy(ME, o), al = allied(ME, o);
    const theirAlly = allyOf(o);
    return head + `<p class="dp-p">${al ? 'You are allies: if anyone declares war on one of you, the other joins the war.' : 'You are at peace. While at peace, neither side’s armies may enter the other’s land.'}${theirAlly && theirAlly !== ME ? ` They are allied with the ${dot(theirAlly)}${PLAYERS[theirAlly].name}, who would join a war against them.` : ''}</p>` +
      (al ? `<button type="button" class="dp-go" data-dp="unally">End the alliance <small>${WAR.allyTruce / 60}-minute truce afterwards</small></button>`
        : `<button type="button" class="dp-go war" data-dp="declare"${why ? ' disabled' : ''}>Declare war <small>${why || '−' + costText(WAR.declareCost)}</small></button>` +
          `<button type="button" class="dp-go ally" data-dp="ally"${aw ? ' disabled' : ''}>Propose an alliance <small>${aw || 'Against the ' + PLAYERS[commonThreat(ME, o)].name}</small></button>`) +
      `<ul class="dp-rules"><li>Each enemy soldier killed: +${WAR.kill}. Destroying a whole army: +${WAR.wipe}.</li><li>Hold an enemy province unopposed to occupy it: 60 s with 1 soldier, 40 s with 2–5, 20 s with 6 or more (capitals take twice as long; retaking takes the same). Worth outpost +${WAR.occVal[0]}, fort +${WAR.occVal[1]}, capital +${WAR.occVal[2]} while held.</li><li>Every ${WAR.tickEvery} s the side ahead gains +1.</li><li>A peace deal starts a ${WAR.truce / 60}-minute truce for both sides.</li><li>No more than ${WAR.maxVsPlayer} nations can be at war with you at once.</li></ul>`;
  }
  const s = warscore(w, ME), mineBase = w.a === ME ? w.base : -w.base;
  const occVal = (by, owner) => [...S.occ].filter(([p, x]) => x === by && nationOf(p) === owner).reduce((n, [p]) => n + WAR.occVal[S.buildings.get(p).stage], 0);
  const occMe = occVal(ME, o), occThem = occVal(o, ME);
  const term = (k, name, need, desc) => { const why = peaceCheck(w, k, k === 'provs' ? [...S.dipPick] : null), locked = why && why.startsWith('Needs'); return `<label class="dp-term${dipTerm === k ? ' on' : ''}${locked ? ' locked' : ''}"><input type="radio" name="dpt" value="${k}"${dipTerm === k ? ' checked' : ''}${locked ? ' disabled' : ''}><span><b>${name}</b><small>${desc}</small></span><em>${need}</em></label>`; };
  const n = provsOf(o).length, tt = totalTerms(o, ME);
  const cap = capitalOf(o), pickable = provsOf(o).filter(p => p !== cap && S.explored.has(p) && takeable(p, ME));
  const pick = dipTerm === 'provs' ? `<div class="dp-pick"><div class="dp-pick-h">Choose up to ${WAR.maxProvs} <span>${S.dipPick.size}/${WAR.maxProvs}</span></div>` + (pickable.length ? pickable.map(p => { const b = S.buildings.get(p), on = S.dipPick.has(p), full = !on && S.dipPick.size >= WAR.maxProvs; return `<label class="dp-prov${on ? ' on' : ''}" data-prov="${p}"><input type="checkbox" value="${p}"${on ? ' checked' : ''}${full ? ' disabled' : ''}><i style="background:${TER[G.provs[p].terrain].base}"></i><span>${provName(p)}</span><small>${STAGE_WORD[b.stage]}${S.occ.get(p) === ME ? ' · occupied' : ''}</small></label>`; }).join('') : '<small>None of their provinces you know of can be taken.</small>') + '</div>' : '';
  const why = peaceCheck(w, dipTerm, dipTerm === 'provs' ? [...S.dipPick] : null);
  return head +
    `<p class="dp-p">${w.by === ME ? 'You declared this war' : 'They declared this war'}${w.parent ? ' (through an alliance)' : ''}, ${fmtTime(S.t - w.since)} ago.</p>` +
    `<div class="dp-ws">${wsBar(s)}<b class="dp-s ${s > 0 ? 'up' : s < 0 ? 'down' : ''}">${sgn(s)}</b></div>` +
    `<div class="dp-break"><span>Battles &amp; time <b>${sgn(mineBase)}</b></span><span>${w.active ? 'Time tick on' : 'Time tick off until a fort falls or a battle costs 10% of an army'}</span><span>${w.peak <= WAR.stallScore ? `White peace in ${fmtTime(Math.max(0, WAR.stallWindow - (S.t - w.winStart)))} unless someone passes ±${WAR.stallScore}` : ''}</span><span>You occupy <b>+${occMe}</b></span><span>They occupy <b>${occThem ? '−' + occThem : '0'}</b></span></div>` +
    `<div class="dp-sec">Peace terms</div>` +
    term('white', 'White peace', 'any', 'Everyone keeps what they had.') +
    term('gold', 'Take gold', '+' + WAR.gold, `Take up to ${WAR.goldTerm} gold from their treasury.`) +
    term('provs', 'Take provinces', '+' + WAR.provs, `Up to ${WAR.maxProvs} provinces, not the capital.`) +
    `<div class="dp-term locked dp-auto"><span><b>Total victory</b><small>Happens on its own at ±${WAR.total}: the winner takes ${tt === 'annex' ? `the whole country (${n} provinces)` : `${WAR.maxProvs} provinces`}, a minute of the loser’s gold income from its treasury, and ${WAR.totalResearch} research points in every unlocked tree.</small></span><em>${WAR.total}</em></div>` +
    pick +
    `<button type="button" class="dp-go" data-dp="offer"${why ? ' disabled' : ''}>Make peace <small>${why || `truce for ${WAR.truce / 60} min afterwards`}</small></button>`;
}
$q('#dip').addEventListener('pointerdown', e => e.stopPropagation());
$q('#dip').addEventListener('click', () => dipOpen ? closeDip() : openDip(mineWarFoe()));
$q('#dip').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); dipOpen ? closeDip() : openDip(mineWarFoe()); } });
// opening the panel during a single war goes straight to that war
const mineWarFoe = () => { const m = warsOf(ME); return m.length === 1 ? foeOf(m[0], ME) : 0; };
const dipEl = $q('#dipPanel');
dipEl.addEventListener('pointerdown', e => e.stopPropagation());
dipEl.addEventListener('wheel', e => e.stopPropagation());
dipEl.addEventListener('change', e => {
  if (e.target.name === 'dpt') { dipTerm = e.target.value; if (dipTerm === 'provs' && !S.dipPick.size && dipSel) preselectProvs(dipSel); }
  else if (e.target.type === 'checkbox') { const p = +e.target.value; if (e.target.checked) { if (S.dipPick.size < WAR.maxProvs) S.dipPick.add(p); } else S.dipPick.delete(p); }
  dipKey = '';
});
dipEl.addEventListener('click', e => {
  const b = e.target.closest('[data-dp]'); if (!b) return;
  const act = b.dataset.dp;
  if (act === 'close') closeDip();
  else if (act === 'back') selectDip(0);
  else if (act === 'sel') selectDip(+b.dataset.o);
  else if (act === 'declare') { declareWar(ME, dipSel); selectDip(dipSel); }
  else if (act === 'ally') { const why = allyWhy(ME, dipSel); if (why) return toast(why, true); formAlliance(ME, dipSel, commonThreat(ME, dipSel)); }
  else if (act === 'unally') { const A = S.allies.find(x => (x.a === ME && x.b === dipSel) || (x.b === ME && x.a === dipSel)); if (A) endAlliance(A, 'you ended it'); }
  else if (act === 'offer') {
    const w = warBetween(ME, dipSel); if (!w) return;
    const why = peaceCheck(w, dipTerm, [...S.dipPick]); if (why) return toast(why, true);
    makePeace(w, ME, dipTerm === 'provs' ? { kind: 'provs', provs: [...S.dipPick] } : { kind: dipTerm });
  }
  dipKey = '';
});
dipEl.addEventListener('pointerover', e => { const r = e.target.closest('[data-prov]'); S.dipHover = r ? +r.dataset.prov : -1; });
dipEl.addEventListener('pointerleave', () => S.dipHover = -1);

// ---------- war drawing: occupation hatching, progress bars, picked provinces ----------
const hatchCache = {};
function hatch(g, col) {
  if (!hatchCache[col]) {
    const c = document.createElement('canvas'); c.width = c.height = 40; const h = c.getContext('2d');
    h.strokeStyle = col; h.globalAlpha = 0.5; h.lineWidth = 9;
    for (let k = -40; k <= 80; k += 20) { h.beginPath(); h.moveTo(k, 0); h.lineTo(k - 40, 40); h.stroke(); }
    hatchCache[col] = g.createPattern(c, 'repeat');
  }
  return hatchCache[col];
}
function drawWar(g, t) {
  for (const [p, o] of S.occ) {
    if (!S.explored.has(p)) continue;
    const P = G.provs[p]; g.save(); g.beginPath(); P.pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    g.fillStyle = hatch(g, PLAYERS[o].color); g.fill(); g.restore();
  }
  for (const [p, pr] of S.occProg) {
    if (!S.visible.has(p)) continue;
    const c = G.provs[p].ic, w = 120, h = 14, x = c[0] - w / 2, y = c[1] + 160;
    g.save(); g.lineJoin = 'round';
    g.fillStyle = '#faf1dc'; g.strokeStyle = OL; g.lineWidth = 4; roundRectPath(g, x, y, w, h, 7); g.fill(); g.stroke();
    g.save(); roundRectPath(g, x, y, w, h, 7); g.clip(); g.fillStyle = PLAYERS[pr.by].color; g.fillRect(x, y, w * Math.min(1, pr.f), h); g.restore();
    roundRectPath(g, x, y, w, h, 7); g.stroke();
    g.font = '15px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); g.textAlign = 'center'; g.textBaseline = 'bottom';
    g.lineWidth = 4; g.strokeStyle = OL; const label = pr.by === nationOf(p) ? 'Liberating' : 'Occupying'; g.strokeText(label, c[0], y - 3); g.fillStyle = '#fff'; g.fillText(label, c[0], y - 3);
    g.restore();
  }
  const outline = (p, col, dash) => { const P = G.provs[p]; roundedPath(g, P.inner, 12); g.setLineDash(dash); g.lineWidth = Math.max(7, 4 / cam.z); g.strokeStyle = OL; g.stroke(); g.lineWidth = Math.max(4, 2.4 / cam.z); g.strokeStyle = col; g.stroke(); g.setLineDash([]); };
  if (dipOpen && dipTerm === 'provs') for (const p of S.dipPick) outline(p, '#ffc93c', []);
  if (dipOpen && S.dipHover >= 0) outline(S.dipHover, '#fff', [16, 10]);
  if (S.demand && S.demand.provs) for (const p of S.demand.provs) outline(p, '#ff6b6b', [16, 10]);
}
function roundRectPath(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// test hooks (v85)
window.__v85 = { metScout, showMetScout, meetNation, metBy, nbr: p => allNbr[p], endAlliance, stepAlliances };
