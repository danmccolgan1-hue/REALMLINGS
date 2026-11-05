// Realmlings AI arena: 8 AI personalities on one map, headless, using the game's rules and numbers.
// usage: node arena.js <seed> <seconds> <outfile.json>
'use strict';
const RealmGen = require('../gen.js');
const TECHS = require('./techs.json').filter(t => t.id !== 'abandon').concat([{ id: 'planar', tree: 'mag', tier: 3, name: 'Planar Bazaar', cost: 200, req: 'stockmarket', school: 'arcane', blurb: '' }]);
const TECH_BY_ID = Object.fromEntries(TECHS.map(t => [t.id, t]));
const TYR_ON = !process.env.NOTYR;
const SEED = process.argv[2] || 'arena-1', DUR = +(process.argv[3] || 3600), OUT = process.argv[4] || 'out.json';

// ---------- seeded rng ----------
function rngFrom(str) { let h = 2166136261 >>> 0; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return function () { h |= 0; h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rngFrom(SEED + ':sim');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- world ----------
const world = RealmGen.generateWorld(SEED);
const NP = world.provinces.length;
const site = world.provinces.map(p => p.site);
const terrain = world.provinces.map(p => p.terrain);
const openNbr = world.provinces.map(() => []), allNbr = world.provinces.map(p => p.nbr.slice());
world.edges.forEach(e => { if (e.open && e.b >= 0 && e.a >= 0) { openNbr[e.a].push(e.b); openNbr[e.b].push(e.a); } });
const treeBorder = world.provinces.map((_, i) => world.edges.filter(e => (e.a === i || e.b === i) && !e.open && e.style === 'trees').length);
const dist = (a, b) => Math.hypot(site[a][0] - site[b][0], site[a][1] - site[b][1]);
// resource yields, same rolls as rollYields()
const yields = (() => {
  const r = rngFrom(world.seed + ':resources');
  return world.provinces.map(p => {
    const y = { gold: 0, wood: 0, food: 0 };
    const roll = (k, c) => { if (r() < c) y[k]++; };
    if (p.terrain === 'grassland') { y.gold = 1; y.wood = 2; y.food = 3; roll('food', 0.5); roll('wood', 0.25); roll('gold', 0.1); }
    else if (p.terrain === 'forest') { y.gold = 1; y.wood = 3; y.food = 2; roll('wood', 0.5); roll('food', 0.25); roll('gold', 0.1); }
    else if (p.terrain === 'desert') { y.gold = 1; roll('gold', 0.25); }
    else if (p.terrain === 'swamp') { y.wood = 2; y.food = 1; if (r() < 0.25) { const k = r() < 0.5 ? 'wood' : 'food'; y[k]++; } }
    y.deposit = r() < (p.terrain === 'desert' ? 0.25 : 0.05);
    return y;
  });
})();
function bfs(src, nbr = openNbr) {
  const d = new Array(NP).fill(Infinity), prev = new Array(NP).fill(-1), q = Array.isArray(src) ? [...src] : [src];
  q.forEach(s => d[s] = 0);
  for (let i = 0; i < q.length; i++) { const a = q[i]; for (const b of nbr[a]) if (d[b] === Infinity) { d[b] = d[a] + 1; prev[b] = a; q.push(b); } }
  return { d, prev };
}
const pathCache = new Map();
function pathTo(a, b) {   // list of provinces after a, ending at b (null if unreachable)
  if (a === b) return [];
  const k = a * 1000 + b; if (pathCache.has(k)) { const c = pathCache.get(k); return c && c.slice(); }
  const { d, prev } = bfs(a); let r = null;
  if (d[b] < Infinity) { r = []; for (let x = b; x !== a; x = prev[x]) r.unshift(x); }
  pathCache.set(k, r); return r && r.slice();
}

// ---------- rules (copied from the game) ----------
const RES = ['gold', 'wood', 'food'];
const SPEED = 150, SURVEY_TIME = 5, BUILD_TIME = 5, TRAIN_TIME = 5, SCOUT_SLOW = 4;
const CAPITAL_BONUS = 5, BASE_CAP = 2000, PLOTS = [2, 4, 6], FORT_LIMIT = [3, 5, 7, 9];
const OUTPOST_COST = { wood: 25 }, FORT_UP = { cost: { gold: 200, wood: 300 }, time: 15 };
const WF = { cost: { food: 100 }, up: { gold: 1, food: 1 }, speed: 1 }, MASON = { cost: { gold: 50, food: 100 }, up: { gold: 1, food: 1 }, speed: 0.5 };
const BUILD = {
  farm: { cost: { gold: 50, wood: 100 }, up: { gold: 1, wood: 1 }, gives: { food: 5 } },
  lumber: { cost: { gold: 50, wood: 150 }, up: { gold: 2 }, gives: { wood: 5 } },
  goldmine: { cost: { wood: 300 }, up: { wood: 2 }, gives: { gold: 10 } },
  barracks: { cost: { gold: 100, wood: 300 }, up: { gold: 2, wood: 2 } },
  stable: { cost: { gold: 300, wood: 400 }, up: { gold: 3, wood: 3, food: 5 }, tech: 'stable' },
  market: { cost: { gold: 50, wood: 150 }, up: { wood: 1 }, gives: { gold: 3 }, tech: 'market' },
  granary: { cost: { gold: 50, wood: 150 }, up: { gold: 1 }, store: 'food', tech: 'granary' },
  storehouse: { cost: { gold: 50, wood: 100 }, up: { gold: 1 }, store: 'wood', tech: 'storehouse' },
  bank: { cost: { wood: 300 }, up: { wood: 1 }, store: 'gold', tech: 'bank' },
  forge: { cost: { gold: 150, wood: 200 }, up: { gold: 2, wood: 1 }, ups: [null, { cost: { gold: 300, wood: 300 }, time: 20 }, { cost: { gold: 600, wood: 500 }, time: 30 }] },
  magetower: { cost: { gold: 200, wood: 150 }, up: { gold: 3 }, tech: 'magetower', ups: [null, { cost: { gold: 400, wood: 200 }, time: 20 }, { cost: { gold: 800, wood: 300 }, time: 30 }] }
};
const TECH_GIVES = { farm: [['advfarms', 'reffarms', 'sophfarms'], 'food', 1], lumber: [['advmills', 'refmills', 'sophmills'], 'wood', 1], goldmine: [['advmines', 'refmines', 'sophmines'], 'gold', 2] };
const LEVEL_POINTS = [0, 2, 4, 6];
// combat
const ROUND = 0.8, DMG_RATE = 0.22, RETREAT_LOSS = 0.6, ARMOR_K = 12;
const TERRAIN_MOD = { grassland: (cav, def) => cav ? 1.2 : 1, forest: (cav, def) => (def ? 1.25 : 1) * (cav ? 0.75 : 1), swamp: (cav) => 0.8 * (cav ? 0.7 : 1), desert: () => 1 };
const ARROW = { every: 2, dmg: [0, 3, 5] };
const WAR = { declareCost: 50, occTimes: [60, 40, 20], occCapital: 2, tickEvery: 10, truce: 300, goldTerm: 300, occVal: [5, 10, 25], kill: 1, wipe: 5, gold: 20, provs: 50, total: 100, maxProvs: 5, splitAt: 10 };
const occTimeFor = (n, stage) => (n >= 6 ? 20 : n >= 2 ? 40 : 60) * (stage === 2 ? 2 : 1);
// equipment
const WEAPONS = {
  spear: { fam: 'pole', atk: 5, twoH: true, cost: {}, tech: null }, pike: { fam: 'pole', atk: 9, twoH: true, cost: { gold: 15, wood: 10 }, tech: 'w-pike' },
  polearm: { fam: 'pole', atk: 13, twoH: true, cost: { gold: 35, wood: 15 }, tech: 'w-polearm' }, halberd: { fam: 'pole', atk: 18, twoH: true, cost: { gold: 65, wood: 20 }, tech: 'w-halberd' },
  shortsword: { fam: 'sword', atk: 6, twoH: false, cost: {}, tech: null }, sword: { fam: 'sword', atk: 10, twoH: false, cost: { gold: 25 }, tech: 'w-bastard' },
  longsword: { fam: 'sword', atk: 14, twoH: false, cost: { gold: 50 }, tech: 'w-longsword' }, greatsword: { fam: 'sword', atk: 20, twoH: true, cost: { gold: 120 }, tech: 'w-greatsword' },
  club: { fam: 'blunt', atk: 5, twoH: true, cost: { wood: 10 }, tech: null }, mace: { fam: 'blunt', atk: 8, twoH: true, cost: { gold: 35 }, tech: 'w-mace' },
  morningstar: { fam: 'blunt', atk: 11, twoH: true, cost: { gold: 70 }, tech: 'w-morningstar' }, warhammer: { fam: 'blunt', atk: 15, twoH: true, cost: { gold: 120 }, tech: 'w-warhammer' }
};
const SHIELDS = { round: { armor: 3, speed: 1, cost: { gold: 10, wood: 10 }, tech: 's-round' }, kite: { armor: 6, speed: 1, cost: { gold: 20, wood: 10 }, tech: 's-kite' }, tower: { armor: 10, speed: 0.92, cost: { gold: 35, wood: 15 }, tech: 's-tower' }, aegis: { armor: 14, speed: 1, cost: { gold: 60 }, tech: 's-aegis' } };
const ARMOR_TYPES = { leather: { speed: 1.1, armor: [1, 3, 5, 7], gold: [0, 10, 20, 35] }, chain: { speed: 1, armor: [4, 8, 12, 16], gold: [15, 30, 50, 80] }, plate: { speed: 0.85, armor: [8, 14, 20, 26], gold: [35, 60, 85, 115] } };
const ARMORS = {}; for (const [k, A] of Object.entries(ARMOR_TYPES)) for (let lv = 1; lv <= 4; lv++) ARMORS[k + lv] = { armor: A.armor[lv - 1], speed: A.speed, cost: A.gold[lv - 1] ? { gold: A.gold[lv - 1] } : {}, tech: k === 'leather' && lv === 1 ? null : `a-${k}${lv}` };
const HORSES = { riding: { speed: 1.4, hp: 10, atk: 1, armor: 0, upFood: 0, rough: false, cost: {}, tech: null }, arabian: { speed: 1.9, hp: 0, atk: 1, armor: 0, upFood: 0, rough: false, cost: { gold: 200, food: 50 }, tech: 'horse-breeding' }, mongolian: { speed: 1.55, hp: 8, atk: 0, armor: 0, upFood: -2, rough: true, cost: { gold: 60 }, tech: 'horse-breeding' }, friesian: { speed: 1.4, hp: 20, atk: 3, armor: 0, upFood: 1, rough: false, cost: { gold: 300, food: 100 }, tech: 'horse-training' }, percheron: { speed: 1.1, hp: 40, atk: 2, armor: 3, upFood: 2, rough: false, cost: { gold: 280, food: 150 }, tech: 'horse-training' } };
const UNIT_BASE = { inf: { hp: 30, speed: 0.75, cost: { gold: 80, food: 150 }, up: { gold: 1, food: 2 } }, cav: { hp: 40, speed: 1, cost: { gold: 300, food: 300 }, up: { gold: 3, food: 4 } } };
const addCost = (a, b) => { const o = { ...a }; for (const k in b) o[k] = (o[k] || 0) + b[k]; return o; };
function designStats(d) {
  const B = UNIT_BASE[d.type], W = WEAPONS[d.weapon], A = ARMORS[d.armor], Sh = d.shield && !W.twoH ? SHIELDS[d.shield] : null, H = d.type === 'cav' ? HORSES[d.horse || 'riding'] : null;
  const armor = A.armor + (Sh ? Sh.armor : 0) + (H ? H.armor : 0);
  let cost = addCost(B.cost, W.cost); cost = addCost(cost, A.cost); if (Sh) cost = addCost(cost, Sh.cost); if (H) cost = addCost(cost, H.cost);
  const gear = (cost.gold || 0) - (B.cost.gold || 0);
  const up = { gold: B.up.gold + Math.floor(gear / 200), food: Math.max(0, B.up.food + (H ? H.upFood : 0)) };
  const speed = +((H ? H.speed : B.speed) * A.speed * (Sh ? Sh.speed : 1)).toFixed(2);
  return { cav: d.type === 'cav', rough: !!(H && H.rough), fam: W.fam, atk: W.atk + (H ? H.atk : 0), hp: B.hp + (H ? H.hp : 0), armor, red: armor / (armor + ARMOR_K), parry: W.fam === 'sword' ? 0.1 : 0, speed, cost, up, d };
}
const MAGE_ST = { cav: false, rough: false, fam: 'magic', atk: 4, hp: 25, armor: 1, red: 1 / 13, parry: 0, speed: 0.8, cost: { gold: 300, food: 100 }, up: { gold: 3, food: 1 } };
const DSTATS = { mage: MAGE_ST };
function designId(d) { return `${d.type}:${d.weapon}:${d.shield || '-'}:${d.armor}:${d.horse || '-'}`; }
function regDesign(d) { const id = designId(d); if (!DSTATS[id]) DSTATS[id] = designStats(d); return id; }
const statsOf = k => DSTATS[k];
// spells
const HARVEST = [null, { bonus: 0.1, dur: 180, cd: 360, food0: 0 }, { bonus: 0.2, dur: 180, cd: 240, food0: 200 }, { bonus: 0.3, dur: Infinity, cd: 0, food0: 0, every: 180, food: 400 }];
const SKIN = [0, { pct: 0.05, cd: 300 }, { pct: 0.10, cd: 180 }, { pct: 0.15, cd: 90 }];
const CURSE = [0, { pct: 0.05, cd: 300 }, { pct: 0.10, cd: 180 }, { pct: 0.15, cd: 90 }];
const RISEN = [0, 1, 2, 3], RISEN_EVERY = 15;
const ROB = [0, 500, 1000, 2000], ROB_TIME = 300, TRADE = [0, 100, 200], TRADE_TIME = 120;
const LINES = { harvest: ['harvest', 'bountiful', 'magnificent'], skin: ['skin', 'stoneskin', 'diamondskin'], mending: ['mending', 'rejuvenation', 'restoration'], curse: ['curse1', 'curse2', 'curse3'], risen: ['risen', 'necro', 'armyofdeath'], graverob: ['graverob', 'deathtax', 'charon'], trading: ['trading', 'stockmarket', 'planar'] };

// ---------- personalities ----------
const PERS = {
  expansionist: { name: 'Expansionist', color: '#e0a020' },
  isolationist: { name: 'Isolationist', color: '#2f9e8f' },
  warpig: { name: 'War Pig', color: '#c0392b' },
  techjunkie: { name: 'Tech Junkie', color: '#2f6fe0' },
  balanced: { name: 'Balanced', color: '#7f8c8d' },
  life: { name: 'Life Rush', color: '#3cb371' },
  death: { name: 'Death Rush', color: '#6c3483' },
  arcane: { name: 'Arcane Rush', color: '#d35fb7' }
};
const ORDER = Object.keys(PERS);

// ---------- state ----------
let T = 0;
const owner = new Array(NP).fill(0);       // nation id that holds a settlement there
const occ = new Map();                      // province -> occupying nation
const occProg = new Map();
const nations = [];
const armies = [];
const battles = [];
const wars = new Map();                     // 'a|b' -> {a,b,base,since,nextTick,demandAt,stats}
const truces = new Map();
const events = [];
const timeline = [];
const battleLog = [];
const pairKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
const atWar = (a, b) => a !== b && wars.has(pairKey(a, b));
const hostile = atWar;
let armySeq = 0;
function ev(n, kind, text, extra) { const e = { t: Math.round(T * 10) / 10, n: n ? n.id : 0, who: n ? n.name : '', kind, text, ...(extra || {}) }; if (e.prov === undefined && n) e.prov = n.capital; events.push(e); }

function newNation(id, pers, cap) {
  const n = {
    id, pers, name: PERS[pers].name, color: PERS[pers].color, alive: true,
    stock: { gold: 50, wood: 50, food: 50 }, provs: new Map(), capital: cap, surveyed: new Set([cap]), explored: new Set([cap, ...allNbr[cap]]),
    workers: [], mages: [], queues: new Map(), xup: new Map(), fortUps: new Map(),
    tech: { gov: { done: [], cur: null, prog: 0, bank: 0, opts: [], tier: 0 }, mil: { done: [], cur: null, prog: 0, bank: 0, opts: [], tier: 0 }, mag: { done: [], cur: null, prog: 0, bank: 0, opts: [], tier: 0 } },
    school: null, phase: 'open', stuckSince: null, harvest: null, harvestCd: 0, cd: {}, design: null, cavDesign: null,
    stats: { kills: 0, lost: 0, battlesWon: 0, battlesLost: 0, gained: 0, lostProvs: 0, warsDeclared: 0, robGold: 0, tradeRes: 0, harvestFood: 0, spent: { gold: 0, wood: 0, food: 0 }, soldiersTrained: 0, magesTrained: 0, firstFort: null, firstForge: null, firstTower: null, schoolAt: null, firstWar: null },
    income: { gold: 0, wood: 0, food: 0 }, gross: { gold: 0, wood: 0, food: 0 }
  };
  n.provs.set(cap, { stage: 2, extras: [] }); owner[cap] = id;
  n.workers.push({ kind: 'wf', prov: cap, busy: 0, job: null }, { kind: 'mason', prov: cap, busy: 0, job: null });
  return n;
}
const hasTech = (n, id) => n.tech.gov.done.includes(id) || n.tech.mil.done.includes(id) || n.tech.mag.done.includes(id);
const lvl = (n, line) => LINES[line].filter(id => hasTech(n, id)).length;
const forts = n => [...n.provs.values()].filter(p => p.stage === 1).length;
const outposts = n => [...n.provs].filter(([p, v]) => v.stage === 0 && !n.fortUps.has(p)).length;
const outpostLimit = n => hasTech(n, 'forts3') ? Infinity : 4 * ([...n.provs.values()].filter(v => v.stage >= 1).length + n.fortUps.size);
const forceLimit = n => [...n.provs.values()].reduce((s, v) => s + [3, 5, 5][v.stage], 0);
const soldiersOnly = n => armies.filter(a => a.owner === n.id).reduce((s, a) => s + count(a) - (a.troops.mage || 0), 0);
const fortLimit = n => FORT_LIMIT[['forts', 'forts2', 'forts3'].filter(id => hasTech(n, id)).length];
const extrasAll = n => { const o = []; for (const [p, v] of n.provs) for (const e of v.extras) o.push({ p, ...e }); return o; };
const countB = (n, type) => extrasAll(n).filter(e => e.type === type).length;
const storeCap = (n, k) => BASE_CAP + extrasAll(n).filter(e => BUILD[e.type].store === k).length * 1000;
const afford = (n, c) => RES.every(k => (n.stock[k] || 0) >= (c[k] || 0));
const pay = (n, c) => { for (const k in c) { n.stock[k] -= c[k]; n.stats.spent[k] += c[k]; } };
const refund = (n, c) => { for (const k in c) n.stock[k] += c[k]; };
const levelsOf = (n, type) => extrasAll(n).filter(e => e.type === type).map(e => e.lv || 1);
function givesOf(n, type) {
  const g = { ...(BUILD[type].gives || {}) }, t = TECH_GIVES[type];
  if (t) for (const id of t[0]) if (hasTech(n, id)) g[t[1]] = (g[t[1]] || 0) + t[2];
  return g;
}
const soldiers = n => armies.filter(a => a.owner === n.id).reduce((s, a) => s + count(a), 0);
const count = a => Object.values(a.troops).reduce((s, c) => s + c, 0);
const rawStrength = list => list.reduce((n, a) => n + Object.entries(a.troops).reduce((m, [k, c]) => { const s = statsOf(k); return m + c * s.atk * (s.hp / 30) / (1 - s.red); }, 0), 0);
const armyPower = n => rawStrength(armies.filter(a => a.owner === n.id));

// ---------- economy ----------
function computeIncome(n) {
  const g = { gold: 0, wood: 0, food: 0 }, up = { gold: 0, wood: 0, food: 0 };
  let farmFood = 0;
  for (const [p, v] of n.provs) {
    if (occ.has(p)) continue;
    for (const k of RES) g[k] += yields[p][k] + (v.stage === 2 ? CAPITAL_BONUS : 0);
    for (const e of v.extras) { const gv = givesOf(n, e.type); for (const k in gv) g[k] += gv[k]; if (e.type === 'farm') farmFood += gv.food; }
  }
  for (const [, v] of n.provs) for (const e of v.extras) { const u = BUILD[e.type].up; for (const k in u) up[k] += u[k]; }
  for (const w of n.workers) { const u = w.kind === 'wf' ? WF.up : MASON.up; for (const k in u) up[k] += u[k]; }
  for (const [, v] of n.provs) if (v.stage === 0) up.wood += 1;   // outpost upkeep
  for (const m of n.mages) if (!m.army) { up.gold += 3; up.food += 1; }
  for (const a of armies) if (a.owner === n.id) for (const k in a.troops) { const s = statsOf(k); up.gold += s.up.gold * a.troops[k]; up.food += s.up.food * a.troops[k]; }
  if (n.harvest && T < n.harvest.until) { const add = Math.round(farmFood * n.harvest.bonus); g.food += add; n.stats.harvestFood += add; }
  n.gross = g; n.upk = up;
  for (const k of RES) n.income[k] = g[k] - up[k];
}
// ---------- tyranny exhaustion ----------
function stepTyranny(n) {
  const need = n.provs.size > 10 ? n.provs.size : 0, have = soldiersOnly(n);
  n.tyr = n.tyr || 0;
  if (need && have < need) {
    n.tyr++; n.tyrOk = 0; n.stats.tyrMax = Math.max(n.stats.tyrMax || 0, n.tyr);
    if (n.tyr === 10) ev(n, 'tyranny', `Tyranny Exhaustion 10/15: ${need} provinces but only ${have} soldiers`);
    if (n.tyr >= 15) { n.tyr = 0; abandonFarthest(n); }
  } else if (n.tyr > 0 && ++n.tyrOk >= 2) { n.tyrOk = 0; n.tyr--; }
}
function abandonFarthest(n) {
  const d = bfs(n.capital, allNbr).d, list = [...n.provs.keys()].filter(p => p !== n.capital);
  if (!list.length) return;
  const p = list.sort((a, b) => (d[b] === Infinity ? 999 : d[b]) - (d[a] === Infinity ? 999 : d[a]))[0];
  const v = n.provs.get(p), nb = v.extras.length;
  n.provs.delete(p); owner[p] = 0; occ.delete(p); occProg.delete(p); n.fortUps.delete(p);
  for (const w of n.workers) if (w.job && w.job.prov === p && w.job.kind === 'build') w.job = null;
  n.stats.abandoned = (n.stats.abandoned || 0) + 1;
  ev(n, 'abandon', `the people of a ${['outpost', 'fort', 'capital'][v.stage]} rose up: province abandoned${nb ? ' with ' + nb + ' building' + (nb > 1 ? 's' : '') : ''}`, { prov: p });
}
function payday(n) {
  computeIncome(n);
  const short = n.stock.gold + n.income.gold < 0 || n.stock.food + n.income.food < 0;
  for (const k of RES) n.stock[k] = Math.min(storeCap(n, k), Math.max(0, n.stock[k] + n.income[k]));
  // army exhaustion
  n.exhaust = n.exhaust || 0;
  if (short && soldiersOnly(n) > 0) {
    n.exhaust++; n.exOk = 0; if (n.exhaust === 5) ev(n, 'exhaust', 'Army Exhaustion 5/10: can’t pay its army'); n.stats.exhaustMax = Math.max(n.stats.exhaustMax || 0, n.exhaust);
    if (n.exhaust >= 10) {
      const gone = soldiersOnly(n);
      for (const a of armies.slice()) if (a.owner === n.id) { if (a.battle) { a.battle = null; } armies.splice(armies.indexOf(a), 1); }
      n.mages = n.mages.filter(m => !m.army);
      n.exhaust = 0; n.stats.deserted = (n.stats.deserted || 0) + gone; n.stats.desertions = (n.stats.desertions || 0) + 1;
      ev(n, 'desert', `ARMY EXHAUSTION: ${gone} unpaid soldiers deserted`);
    }
  } else if (n.exhaust > 0 && n.income.gold >= 0 && n.income.food >= 0 && n.stock.gold > 0 && n.stock.food > 0) { if (++n.exOk >= 2) { n.exOk = 0; n.exhaust--; } } else n.exOk = 0;
  if (TYR_ON) stepTyranny(n);
  techPayday(n);
}

// ---------- research ----------
function techTier(n, tree) {
  if (tree === 'gov') { const f = forts(n); return 1 + (f >= 1) + (f >= 2); }
  const lv = levelsOf(n, tree === 'mil' ? 'forge' : 'magetower'); return lv.length ? Math.max(...lv) : 0;
}
const costMult = n => { const c = n.provs.size; return 1 + 0.05 * Math.min(10, Math.max(0, c - 10)) + 0.15 * Math.max(0, c - 20); };
const tcost = (n, x) => Math.round(x.cost * costMult(n));
function techRate(n, tree) {
  if (tree === 'gov') { let s = 0; for (const [p, v] of n.provs) if (!occ.has(p) && v.stage >= 1) s += v.stage + 1; return s; }
  return levelsOf(n, tree === 'mil' ? 'forge' : 'magetower').reduce((s, lv) => s + LEVEL_POINTS[lv], 0);
}
const bankCap = (n, tree) => techRate(n, tree) * 15 / 5;
function drawOptions(n, tree) {
  const st = n.tech[tree], Tt = techTier(n, tree);
  let avail = TECHS.filter(x => x.tree === tree && x.tier <= Tt && !st.done.includes(x.id) && x.id !== st.cur && (!x.req || st.done.includes(x.req)));
  if (tree === 'mag') avail = n.school ? avail.filter(x => !x.id.startsWith('school-') && (x.school === '*' || x.school === n.school)) : avail.filter(x => x.id.startsWith('school-'));
  shuffle(avail);
  const top = avail.filter(x => x.tier === Tt), opts = [];
  if (top.length) opts.push(top[0]);
  for (const x of avail) if (opts.length < 3 && !opts.includes(x)) opts.push(x);
  st.opts = opts.map(x => x.id);
}
function finishTech(n, tree) {
  const st = n.tech[tree], x = TECH_BY_ID[st.cur];
  st.done.push(x.id); st.bank = Math.min(st.prog - tcost(n, x), bankCap(n, tree)); st.prog = 0; st.cur = null;
  if (x.id === 'forts3') ev(n, 'cap', 'researched Fort Charters III: no more outpost limit');
  if (x.id.startsWith('school-')) { n.school = x.id.slice(7); n.stats.schoolAt = T; ev(n, 'magic', `chose the ${n.school} school`); }
  if (x.tier === 3 && !n.stats['t3' + tree]) { n.stats['t3' + tree] = T; }
  drawOptions(n, tree);
}
function techPayday(n) {
  for (const tree of ['gov', 'mil', 'mag']) {
    const st = n.tech[tree], Tt = techTier(n, tree);
    if (Tt !== st.tier) { st.tier = Tt; if (!st.cur || !st.opts.length) drawOptions(n, tree); }
    if (!Tt) continue;
    if (!st.cur && st.opts.length) pickTech(n, tree);
    const pts = techRate(n, tree);
    if (st.cur) { st.prog += pts; if (st.prog >= tcost(n, TECH_BY_ID[st.cur])) finishTech(n, tree); }
    else st.bank = Math.min(st.bank + pts, bankCap(n, tree));
    if (!st.cur && !st.opts.length) drawOptions(n, tree);
  }
}
function pickTech(n, tree) {
  const st = n.tech[tree]; if (!st.opts.length) return;
  const w = id => (techWeight(n, tree, id) || 1) + R() * 0.5;
  const id = st.opts.slice().sort((a, b) => w(b) - w(a))[0];
  st.cur = id; st.prog = st.bank; st.bank = 0; st.opts = st.opts.filter(o => o !== id);
  if (st.prog >= tcost(n, TECH_BY_ID[id])) finishTech(n, tree);
}

// ---------- AI tech preferences ----------
const MAGIC_PREFS = {
  life: { harvest: 30, skin: 20, bountiful: 25, mending: 10, stoneskin: 15, magnificent: 20, diamondskin: 15, rejuvenation: 5, restoration: 5 },
  death: { graverob: 30, curse1: 20, deathtax: 28, risen: 15, curse2: 15, charon: 28, necro: 10, curse3: 12, armyofdeath: 10 },
  arcane: { trading: 30, stockmarket: 28, arcscouts: 5, clearthoughts: 3, stasis: 4, rift: 2 }
};
function techWeight(n, tree, id) {
  const P = n.pers, x = TECH_BY_ID[id];
  if (tree === 'gov') {
    const W = { market: 8, advfarms: 6, advmills: 5, advmines: 4, forts: 7, forts2: 6, forts3: 5, reffarms: 5, refmills: 4, refmines: 4, sophfarms: 4, sophmills: 3, sophmines: 3, granary: 3, storehouse: 4, bank: 3, autoscout: 2, magetower: 4, arrowslits: 2, stable: 1 };
    if (P === 'expansionist') Object.assign(W, { forts: 12, forts2: 11, forts3: 10, autoscout: 9, stable: 6, magetower: 1 });
    if (P === 'isolationist') Object.assign(W, { arrowslits: 14, forts: 11, forts2: 10, forts3: 9, magetower: 9, walls: 3 });
    if (P === 'warpig') Object.assign(W, { stable: 12, forts: 4, magetower: 0.5, market: 10 });
    if (P === 'techjunkie') Object.assign(W, { magetower: 14, forts: 13, forts2: 12, forts3: 11 });
    if (['life', 'death', 'arcane'].includes(P)) Object.assign(W, { magetower: 50 });
    return W[id] || 1;
  }
  if (tree === 'mil') {
    const fam = n.family || 'sword';
    let w = 3;
    if (id.startsWith('a-')) w = id.includes(n.armorLine || 'chain') ? 9 : 2;
    if (id.startsWith('w-')) { const fid = { 'w-pike': 'pole', 'w-polearm': 'pole', 'w-halberd': 'pole', 'w-bastard': 'sword', 'w-longsword': 'sword', 'w-greatsword': 'sword', 'w-mace': 'blunt', 'w-morningstar': 'blunt', 'w-warhammer': 'blunt' }[id]; w = fid === fam ? 10 : 2; }
    if (id.startsWith('s-')) w = fam === 'sword' ? 8 : 1;
    if (id.startsWith('horse')) w = n.useCav ? 7 : 0.5;
    return w;
  }
  if (tree === 'mag') {
    if (id.startsWith('school-')) return id === 'school-' + n.wantSchool ? 100 : 1;
    const m = (MAGIC_PREFS[n.school] || {})[id]; return m || (x.school === '*' ? 2 : 1);
  }
  return 1;
}

// ---------- designs the AI fields ----------
function bestDesign(n, type) {
  const ok = it => !it.tech || hasTech(n, it.tech);
  const fam = n.family || 'sword';
  const weapons = Object.keys(WEAPONS).filter(k => ok(WEAPONS[k]));
  const armorsOk = Object.keys(ARMORS).filter(k => ok(ARMORS[k]));
  const shieldsOk = [null, ...Object.keys(SHIELDS).filter(k => ok(SHIELDS[k]))];
  const horses = type === 'cav' ? Object.keys(HORSES).filter(k => ok(HORSES[k])) : [null];
  let best = null, bs = -Infinity;
  for (const w of weapons) for (const a of armorsOk) for (const s of shieldsOk) for (const h of horses) {
    if (s && WEAPONS[w].twoH) continue;
    const d = { type, weapon: w, shield: s, armor: a, horse: h }, st = designStats(d);
    if ((st.cost.gold || 0) > n.goldCap) continue;
    const eff = st.atk * st.hp / (1 - st.red) * (1 - st.parry * 0) / (1 - st.parry) * (st.fam === 'blunt' ? 1.12 : 1) * (st.fam === fam ? 1.05 : 1);
    const price = (st.cost.gold || 0) + (st.cost.wood || 0) * 0.5 + (st.cost.food || 0) * 0.4 + (st.up.gold * 20 + st.up.food * 10);
    const sc = eff / Math.pow(price, n.qualityBias || 0.6);
    if (sc > bs) { bs = sc; best = d; }
  }
  return best ? regDesign(best) : null;
}

// ---------- armies ----------
function newArmy(n, prov, troops) {
  const a = { id: ++armySeq, owner: n.id, prov, troops: { ...troops }, path: [], moving: false, nextAt: 0, wounds: 0, battle: null, retreating: false, arrived: T, lastProv: prov, mages: 0, skinCd: 0, curseCd: 0, skin: 0, curse: 0, risenAt: 0, fallen: {} };
  armies.push(a); return a;
}
const armySpeed = a => Math.min(...Object.keys(a.troops).map(k => statsOf(k).speed));
// units may only cross their own land, unclaimed land, or land of a nation they are at war with (marching home after peace excepted)
const mayEnter = (o, q) => !owner[q] || owner[q] === o || atWar(o, owner[q]);
function pathFor(o, a, b) {
  if (a === b) return [];
  if (!mayEnter(o, b)) return null;
  const prev = new Map([[a, -1]]), q = [a];
  for (let i = 0; i < q.length; i++) { const x = q[i]; if (x === b) break; for (const y of openNbr[x]) if (!prev.has(y) && mayEnter(o, y)) { prev.set(y, x); q.push(y); } }
  if (!prev.has(b)) return null;
  const r = []; for (let x = b; x !== a; x = prev.get(x)) r.unshift(x); return r;
}
function orderArmy(a, to) {
  if (a.battle) return false;
  const p = a.exiting ? pathTo(a.prov, to) : pathFor(a.owner, a.prov, to); if (!p) return false;
  if (!p.length) { a.path = []; a.moving = false; return true; }
  a.path = p; a.final = to;
  if (!a.moving) { a.moving = true; a.nextAt = T + dist(a.prov, p[0]) / (SPEED * armySpeed(a)); }
  return true;
}
function stepArmies() {
  for (const a of armies) {
    if (!a.moving || a.battle) continue;
    if (!a.path.length) { a.moving = false; continue; }
    if (!a.exiting && !a.retreating && !mayEnter(a.owner, a.path[0])) { a.path = []; a.moving = false; continue; }
    if (T >= a.nextAt) {
      a.lastProv = a.prov; a.prov = a.path.shift();
      if (a.path.length) a.nextAt = T + dist(a.prov, a.path[0]) / (SPEED * armySpeed(a));
      else { a.moving = false; a.arrived = T; a.retreating = false; a.exiting = false; }
    }
  }
  // stationary armies of the same owner in the same province merge (the AI always combines)
  const seen = new Map();
  for (const a of armies.slice()) {
    if (a.moving || a.battle || count(a) <= 0) continue;
    const k = a.owner + ':' + a.prov;
    if (!seen.has(k)) { seen.set(k, a); continue; }
    const b = seen.get(k); for (const t in a.troops) b.troops[t] = (b.troops[t] || 0) + a.troops[t]; b.mages += a.mages; b.wounds += a.wounds;
    for (const m of nations[a.owner - 1].mages) if (m.army === a) m.army = b;
    armies.splice(armies.indexOf(a), 1);
  }
}
function sideMix(list) {
  let nn = 0, cav = 0, red = 0, parry = 0, blunt = 0, atk = 0;
  for (const a of list) for (const k in a.troops) { const c = a.troops[k], s = statsOf(k); nn += c; if (s.cav) cav += c; red += c * s.red; parry += c * s.parry; if (s.fam === 'blunt') blunt += c * s.atk; atk += c * s.atk; }
  return nn ? { n: nn, cavFrac: cav / nn, red: red / nn, parry: parry / nn, pierce: atk ? blunt / atk : 0 } : { n: 0, cavFrac: 0, red: 0, parry: 0, pierce: 0 };
}
function sideStrength(list, prov, defender, foe) {
  const mod = TERRAIN_MOD[terrain[prov]], cavFrac = foe.cavFrac;
  let s = 0; for (const a of list) for (const k in a.troops) { const st = statsOf(k); s += a.troops[k] * st.atk * mod(st.cav && !st.rough, defender) * (st.fam === 'pole' ? 1 + 0.5 * cavFrac : 1) * (1 + (a.curse || 0)); }
  return s;
}
function killOne(a, k) {
  a.troops[k]--; if (!a.troops[k]) delete a.troops[k];
  if (k === 'mage') { a.mages--; const N = nations[a.owner - 1], i = N.mages.findIndex(m => m.army === a); if (i >= 0) N.mages.splice(i, 1); }
  else a.fallen[k] = (a.fallen[k] || 0) + 1;
}
function applyDamage(b, list, dmg, pierce, killerOwner) {
  const total = list.reduce((s, a) => s + count(a), 0); if (!total) return 0;
  const mix = sideMix(list); dmg *= (1 - mix.red * (1 - 0.5 * pierce)) * (1 - mix.parry);
  let killed = 0;
  for (const a of list) {
    a.wounds += dmg * count(a) / total / (1 + (a.skin || 0));
    for (;;) {
      const kinds = Object.keys(a.troops).filter(k => a.troops[k] > 0); if (!kinds.length) break;
      let r = R() * count(a), k = kinds[0];
      for (const kk of kinds) { r -= a.troops[kk]; if (r <= 0) { k = kk; break; } }
      if (a.wounds < statsOf(k).hp) break;
      a.wounds -= statsOf(k).hp;
      if (a.risenOn && a.mages > 0 && k !== 'mage' && ++a.risenN >= [0, 4, 3, 2][lvl(nations[a.owner - 1], 'risen')]) { a.risenN = 0; const N = nations[a.owner - 1]; N.stats.risen = (N.stats.risen || 0) + 1; continue; }
      killOne(a, k); killed++;
      if (b) { b.lost[a.owner] = (b.lost[a.owner] || 0) + 1; }
      nations[a.owner - 1].stats.lost++; if (killerOwner) nations[killerOwner - 1].stats.kills++;
      if (killerOwner && atWar(a.owner, killerOwner)) addScore(killerOwner, a.owner, WAR.kill);
    }
  }
  return killed;
}
function removeDead() {
  for (const a of armies.slice()) if (count(a) <= 0) {
    if (a.battle) { const foe = a.battle.sides.find(o => o !== a.owner); if (foe && atWar(foe, a.owner)) addScore(foe, a.owner, WAR.wipe); }
    armies.splice(armies.indexOf(a), 1);
  }
}
function onJoin(a) {
  const n = nations[a.owner - 1];
  if (a.mages > 0 && n.school === 'life') { const L = lvl(n, 'skin'); if (L && T >= a.skinCd) { a.skin = SKIN[L].pct; a.skinCd = T + SKIN[L].cd; } }
  if (a.mages > 0 && n.school === 'death') {
    const L = lvl(n, 'curse'), Rl = lvl(n, 'risen'), useCurse = L && (a.mages >= 2 || true), useRisen = Rl && (a.mages >= 2 || !L);
    if (useCurse && T >= a.curseCd) { a.curse = CURSE[L].pct; a.curseCd = T + CURSE[L].cd; }
    a.risenOn = !!useRisen; a.risenN = 0;
  }
}
function onEnd(a) {
  const n = nations[a.owner - 1];
  a.skin = 0; a.curse = 0; a.fallen = {};
  if (a.mages > 0 && n.school === 'life' && lvl(n, 'mending')) a.wounds = 0;
}
function stepBattles(dt) {
  const byProv = new Map();
  for (const a of armies) { if (a.retreating || (a.moving && !a.battle) || count(a) <= 0) continue; if (!byProv.has(a.prov)) byProv.set(a.prov, []); byProv.get(a.prov).push(a); }
  for (const [p, list] of byProv) {
    const os = [...new Set(list.map(a => a.owner))]; let pair = null;
    for (const x of os) for (const y of os) if (!pair && hostile(x, y)) pair = [x, y];
    if (!pair) continue;
    let b = battles.find(x => x.prov === p);
    if (!b) {
      const first = list.slice().sort((x, y) => x.arrived - y.arrived)[0];
      b = { prov: p, t0: T, next: T + ROUND, defender: owner[p] || first.owner, sides: pair, start: {}, lost: {}, risen0: Object.fromEntries(pair.map(o => [o, nations[o - 1].stats.risen || 0])) };
      battles.push(b);
    }
    for (const a of list) if (!a.battle && b.sides.includes(a.owner)) { a.battle = b; a.path = []; a.moving = false; b.start[a.owner] = (b.start[a.owner] || 0) + count(a); onJoin(a); }
  }
  for (const b of battles.slice()) {
    const sides = {};
    for (const a of armies) if (a.battle === b && !a.retreating && count(a) > 0) (sides[a.owner] = sides[a.owner] || []).push(a);
    const owners = Object.keys(sides).map(Number);
    if (owners.length < 2 || !hostile(owners[0], owners[1])) { endBattle(b, owners.length === 1 ? owners[0] : -1); continue; }
    // risen dead
    // AI retreat
    for (const o of owners) {
      const foeO = owners.find(x => x !== o), mine = rawStrength(sides[o]), theirs = rawStrength(sides[foeO]);
      if (mine < 0.35 * theirs && T - b.t0 >= 2) for (const a of sides[o]) retreat(a, theirs);   // like the game's AI, it checks every 2 s
    }
    if (T < b.next) continue;
    b.next = T + ROUND;
    const [A, B] = owners; const sA = sides[A].filter(a => !a.retreating), sB = sides[B].filter(a => !a.retreating);
    if (!sA.length || !sB.length) continue;
    const mA = sideMix(sA), mB = sideMix(sB);
    const dA = sideStrength(sA, b.prov, A === b.defender, mB) * DMG_RATE * (0.85 + R() * 0.3);
    const dB = sideStrength(sB, b.prov, B === b.defender, mA) * DMG_RATE * (0.85 + R() * 0.3);
    applyDamage(b, sB, dA, mA.pierce, A); applyDamage(b, sA, dB, mB.pierce, B);
    removeDead();
  }
}
var retreat = function (a, enemyRaw) {
  const mine = rawStrength([a]);
  const nb = openNbr[a.prov].filter(q => !armies.some(v => v.prov === q && hostile(v.owner, a.owner) && count(v) > 0));
  if (!nb.length) return;
  const to = nb.includes(a.lastProv) ? a.lastProv : nb.sort((x, y) => (owner[y] === a.owner) - (owner[x] === a.owner))[0];
  let loss = Math.min(count(a), Math.round(count(a) * RETREAT_LOSS * enemyRaw / Math.max(1, enemyRaw + mine)));
  const foe = a.battle.sides.find(o => o !== a.owner);
  while (loss-- > 0 && count(a) > 0) { const ks = Object.keys(a.troops); const k = ks[Math.floor(R() * ks.length)]; killOne(a, k); nations[a.owner - 1].stats.lost++; if (foe) { nations[foe - 1].stats.kills++; if (atWar(foe, a.owner)) addScore(foe, a.owner, WAR.kill); } }
  a.battle.retreated = a.battle.retreated || {}; a.battle.retreated[a.owner] = true;
  onEnd(a); a.battle = null; a.retreating = true; a.path = [to]; a.moving = true; a.nextAt = T + dist(a.prov, to) / (SPEED * (count(a) ? armySpeed(a) : 1));
  removeDead();
}
function endBattle(b, winner) {
  battles.splice(battles.indexOf(b), 1);
  { const w = b.sides.length === 2 && wars.get(pairKey(b.sides[0], b.sides[1])); if (w && !w.active) for (const o of b.sides) { const lost = b.lost[o] || 0; if (lost && lost > 0.1 * (soldiersOnly(nations[o - 1]) + lost)) { w.active = true; w.activeWhy = 'battle'; } } }
  for (const a of armies) if (a.battle === b) { onEnd(a); a.battle = null; }
  const tot = Object.values(b.start).reduce((s, v) => s + v, 0);
  if (winner > 0) { nations[winner - 1].stats.battlesWon++; for (const o of b.sides) if (o !== winner) nations[o - 1].stats.battlesLost++; }
  for (const o of b.sides) { const N = nations[o - 1]; if ((N.stats.risen || 0) > (b.risen0 && b.risen0[o] || 0) + 1) ev(N, 'risen', `Risen Dead: ${(N.stats.risen || 0) - (b.risen0 && b.risen0[o] || 0)} soldiers got back up`, { prov: b.prov }); }
  battleLog.push({ t: Math.round(T), dur: Math.round(T - b.t0), prov: b.prov, terrain: terrain[b.prov], sides: b.sides, start: b.start, lost: b.lost, winner, retreated: b.retreated || null });
  if (tot >= 14 && winner > 0) { const lo = b.sides.find(o => o !== winner); ev(nations[winner - 1], 'battle', `beat ${nations[lo - 1].name} in the ${terrain[b.prov]} (${b.start[winner]} vs ${b.start[lo]}; lost ${b.lost[winner] || 0}, killed ${b.lost[lo] || 0})`, { prov: b.prov, size: tot, lo }); }
}
function stepArrows() {
  for (const n of nations) {
    if (!n.alive || !hasTech(n, 'arrowslits')) continue;
    for (const [p, v] of n.provs) {
      if (v.stage < 1 || battles.some(b => b.prov === p)) continue;
      const foes = armies.filter(a => a.prov === p && hostile(a.owner, n.id) && !a.moving && !a.retreating && !a.battle && count(a) > 0);
      if (!foes.length) { v.arrowAt = undefined; continue; }
      if (v.arrowAt === undefined) { v.arrowAt = T + ARROW.every; continue; }
      if (T < v.arrowAt) continue;
      v.arrowAt = T + ARROW.every;
      const k = applyDamage(null, foes, ARROW.dmg[v.stage], 0, n.id); n.stats.arrowKills = (n.stats.arrowKills || 0) + k; removeDead();
    }
  }
}

// ---------- war ----------
function score(w, a) { let s = w.base; for (const [p, o] of occ) { const ow = owner[p]; if (!ow) continue; const v = nations[ow - 1].provs.get(p); if (!v) continue; if (o === w.a && ow === w.b) s += WAR.occVal[v.stage]; if (o === w.b && ow === w.a) s -= WAR.occVal[v.stage]; } s = Math.max(-100, Math.min(100, Math.round(s))); return a === w.a ? s : -s; }
function addScore(winner, loser, v) { const w = wars.get(pairKey(winner, loser)); if (!w) return; w.src = w.src || {}; const kk = winner + (v === WAR.wipe ? ':wipe' : ':kill'); w.src[kk] = (w.src[kk] || 0) + v; w.base = Math.max(-100, Math.min(100, w.base + (winner === w.a ? v : -v))); }
// ---------- alliances ----------
// two nations at peace that both border a common nation at least 25% larger than each of them may ally.
// If anyone declares war on one, the other is at war with the attacker too. The alliance ends when the common
// threat is gone, shrinks below that size, or stops bordering one of them; then the two get a 2-minute peace timer.
const alliances = [];
const allyOf = id => { const A = alliances.find(x => x.a === id || x.b === id); return A ? (A.a === id ? A.b : A.a) : 0; };
const allied = (x, y) => alliances.some(A => (A.a === x && A.b === y) || (A.a === y && A.b === x));
const defPower = m => armyPower(m) + (allyOf(m.id) ? armyPower(nations[allyOf(m.id) - 1]) : 0);
let borderMap = null;
function borders() {
  const B = nations.map(() => new Set());
  for (let p = 0; p < NP; p++) if (owner[p]) for (const q of allNbr[p]) if (owner[q] && owner[q] !== owner[p]) B[owner[p] - 1].add(owner[q]);
  return B;
}
const inWar = id => [...wars.values()].some(w => w.a === id || w.b === id);
function threatOK(A, B) {   // the common threat still qualifies?
  const C = nations[A.vs - 1], a = nations[A.a - 1], b = nations[A.b - 1];
  if (!C.alive) return 'the common threat is gone';
  if (C.provs.size < 1.25 * a.provs.size || C.provs.size < 1.25 * b.provs.size) return `${C.name} is no longer 25% larger`;
  if (!B[C.id - 1].has(a.id) || !B[C.id - 1].has(b.id)) return `${C.name} no longer borders both`;
  return '';
}
function stepAlliances() {
  const B = borders();
  for (const A of alliances.slice()) {
    const a = nations[A.a - 1], b = nations[A.b - 1];
    const why = !a.alive || !b.alive ? 'an ally fell' : threatOK(A, B);
    if (!why) continue;
    alliances.splice(alliances.indexOf(A), 1);
    if (a.alive && b.alive) truces.set(pairKey(a.id, b.id), Math.max(truces.get(pairKey(a.id, b.id)) || 0, T + 120));
    ev(a.alive ? a : b, 'allyend', `alliance with ${(a.alive ? b : a).name} ends: ${why}`, { prov: a.alive ? a.capital : b.capital, other: a.alive ? b.id : a.id });
  }
  // new alliances: both at peace, unallied, and both bordering a nation at least 25% bigger than each
  for (const a of nations) for (const b of nations) {
    if (a.id >= b.id || !a.alive || !b.alive || allyOf(a.id) || allyOf(b.id) || inWar(a.id) || inWar(b.id)) continue;
    let best = null;
    for (const C of nations) { if (!C.alive || C === a || C === b) continue; if (!B[C.id - 1].has(a.id) || !B[C.id - 1].has(b.id)) continue; if (C.provs.size < 1.25 * a.provs.size || C.provs.size < 1.25 * b.provs.size) continue; if (!best || C.provs.size > best.provs.size) best = C; }
    if (!best) continue;
    if (!ALLY_ON) continue;
    alliances.push({ a: a.id, b: b.id, vs: best.id, since: T });
    ev(a, 'ally', `allied with ${b.name} against ${best.name} (${best.provs.size} provinces vs ${a.provs.size} and ${b.provs.size})`, { prov: a.capital, other: b.id, vs: best.id });
  }
}
function declareWar(n, m, why) {
  if (allied(n.id, m.id)) return false;
  if (atWar(n.id, m.id) || (truces.get(pairKey(n.id, m.id)) || 0) > T || n.stock.gold < WAR.declareCost) return false;
  n.stock.gold -= WAR.declareCost;
  const [a, b] = n.id < m.id ? [n.id, m.id] : [m.id, n.id];
  wars.set(pairKey(a, b), { a, b, base: 0, since: T, nextTick: T + WAR.tickEvery, demandAt: T + 60, aggressor: n.id });
  n.stats.warsDeclared++; if (n.stats.firstWar === null) n.stats.firstWar = T;
  const dd = bfs([...n.provs.keys()]).d, front = [...m.provs.keys()].sort((x, y) => dd[x] - dd[y])[0];
  ev(n, 'war', `declared war on ${m.name}${why ? ' (' + why + ')' : ''} · ${soldiers(n)} vs ${soldiers(m)} soldiers`, { prov: front, target: m.id });
  // the target's ally is dragged in
  const k = allyOf(m.id);
  if (k && k !== n.id && !atWar(n.id, k)) {
    const K = nations[k - 1], [a2, b2] = n.id < k ? [n.id, k] : [k, n.id];
    wars.set(pairKey(a2, b2), { a: a2, b: b2, base: 0, since: T, nextTick: T + WAR.tickEvery, demandAt: T + 60, aggressor: n.id, joined: true });
    const dk = bfs([...K.provs.keys()]).d, f2 = [...n.provs.keys()].sort((x, y) => dk[x] - dk[y])[0];
    ev(K, 'allyjoin', `joins its ally ${m.name} against ${n.name}`, { prov: f2, other: m.id, target: n.id });
  }
  return true;
}
function stepWar(dt) {
  // occupation
  const holds = (o, p) => armies.some(v => v.owner === o && v.prov === p && !v.retreating && !v.moving && !v.battle && count(v) > 0);
  const soldiersIn = (o, p) => armies.reduce((s, v) => s + (v.owner === o && v.prov === p && !v.retreating && !v.moving && !v.battle ? count(v) : 0), 0);
  for (let p = 0; p < NP; p++) {
    const ow = owner[p]; if (!ow) continue;
    const v = nations[ow - 1].provs.get(p), occBy = occ.get(p);
    let goal = null;
    if (!battles.some(b => b.prov === p)) {
      if (occBy === undefined) { for (const n of nations) if (n.alive && atWar(n.id, ow) && holds(n.id, p) && !holds(ow, p)) { goal = n.id; break; } }
      else if (holds(ow, p) && !holds(occBy, p)) goal = ow;
    }
    const pr = occProg.get(p);
    if (goal === null) { if (pr) occProg.delete(p); continue; }
    const cur = pr && pr.by === goal ? pr : { by: goal, f: 0 };
    cur.f += dt / occTimeFor(soldiersIn(goal, p), v.stage); occProg.set(p, cur);
    if (cur.f < 1) continue;
    occProg.delete(p);
    if (goal === ow) occ.delete(p); else { occ.set(p, goal); if (v.stage >= 1) ev(nations[goal - 1], 'occupy', `occupied ${nations[ow - 1].name}’s ${v.stage === 2 ? 'capital' : 'fort'}`, { prov: p, other: ow }); if (v.stage >= 1) { const w = wars.get(pairKey(goal, ow)); if (w && !w.active) { w.active = true; w.activeWhy = 'fort'; } } nations[goal - 1].stats.occupations = (nations[goal - 1].stats.occupations || 0) + 1; }
  }
  for (const [k, w] of wars) {
    while (T >= w.nextTick) { const s = score(w, w.a); if (s && w.active) { w.base = Math.max(-100, Math.min(100, w.base + Math.sign(s))); w.src = w.src || {}; const kk = (s > 0 ? w.a : w.b) + ':tick'; w.src[kk] = (w.src[kk] || 0) + 1; } w.nextTick += WAR.tickEvery; }
    let o = 0; for (const [p, by] of occ) if ((by === w.a && owner[p] === w.b) || (by === w.b && owner[p] === w.a)) o++; w.maxOcc = Math.max(w.maxOcc || 0, o);
  }
  // occupations end when the war between those two ends
  for (const [p, o] of occ) if (!atWar(o, owner[p])) occ.delete(p);
}
function capLand(n) { const set = new Set([n.capital]), q = [n.capital]; for (let i = 0; i < q.length; i++) for (const y of allNbr[q[i]]) if (!set.has(y) && owner[y] === n.id) { set.add(y); q.push(y); } return set; }
function connectedPick(W, L, k = WAR.maxProvs) {
  const land = capLand(W), out = [], cand = [...L.provs.keys()].filter(p => p !== L.capital);
  while (out.length < k) { const ok = cand.filter(p => !out.includes(p) && allNbr[p].some(q => land.has(q))); if (!ok.length) break; ok.sort((a, b) => (occ.get(b) === W.id) - (occ.get(a) === W.id) || provValue(b) - provValue(a)); out.push(ok[0]); land.add(ok[0]); }
  return out;
}
function transferProv(p, from, to) {
  const v = from.provs.get(p); if (!v) return;
  from.provs.delete(p); v.stage = 0;
  v.xup = null; to.provs.set(p, v); owner[p] = to.id; to.surveyed.add(p);
  for (const w of from.workers) if (w.job && w.job.prov === p) w.job = null;
  from.stats.lostProvs++; to.stats.gained++;
}
function makePeace(w, winnerId, terms) {
  const W = nations[winnerId - 1], L = nations[(winnerId === w.a ? w.b : w.a) - 1], sc0 = score(w, winnerId);
  wars.delete(pairKey(w.a, w.b)); truces.set(pairKey(w.a, w.b), T + WAR.truce);
  for (const [p, o] of [...occ]) if ((o === W.id && owner[p] === L.id) || (o === L.id && owner[p] === W.id)) occ.delete(p);
  let text = ''; const moved = terms.provs ? terms.provs.slice() : [];
  if (terms.kind === 'white') text = 'white peace';
  else if (terms.kind === 'gold') { const g = Math.min(WAR.goldTerm, Math.floor(L.stock.gold)); L.stock.gold -= g; W.stock.gold += g; text = `${g} gold`; }
  else if (terms.kind === 'provs') { terms.provs.forEach(p => transferProv(p, L, W)); text = `${terms.provs.length} provinces`; }
  else if (terms.kind === 'total') {
    if (L.provs.size <= WAR.maxProvs) { moved.push(...L.provs.keys()); [...L.provs.keys()].forEach(p => transferProv(p, L, W)); eliminate(L, W); text = 'ANNEXATION'; }
    else { const half = connectedPick(W, L); half.forEach(p => transferProv(p, L, W)); moved.push(...half); text = `total victory (${half.length} provinces)`; }
  }
  for (const b of battles.slice()) if (b.sides.includes(W.id) && b.sides.includes(L.id)) endBattle(b, -1);
  const occW = [...occ].filter(([p, by]) => by === W.id && owner[p] === L.id).length;
  ev(W, 'peace', `won the war with ${L.name}: ${text} (score ${sc0}, war lasted ${Math.round((T - w.since) / 60)} min)`, { prov: moved.length ? moved[0] : L.capital, provs: moved, loser: L.id, terms: terms.kind, src: w.src || {}, maxOcc: w.maxOcc || 0, occNow: occW, wSold: soldiers(W), lSold: soldiers(L), aggressor: w.aggressor, active: w.activeWhy || null, winner: W.id, len: T - w.since, score: sc0 });
  evict();
}
function whitePeace(w, why) {
  wars.delete(pairKey(w.a, w.b)); truces.set(pairKey(w.a, w.b), T + WAR.truce);
  for (const [p, o] of [...occ]) if (!atWar(o, owner[p])) occ.delete(p);
  for (const b of battles.slice()) if (!hostile(b.sides[0], b.sides[1])) endBattle(b, -1);
  ev(nations[w.a - 1], 'white', `white peace with ${nations[w.b - 1].name} (${why})`, { other: w.b });
  evict();
}
function eliminate(L, by) {
  L.alive = false; L.diedAt = T; L.killedBy = by.id;
  for (const a of armies.slice()) if (a.owner === L.id) armies.splice(armies.indexOf(a), 1);
  L.workers = []; L.mages = [];
  for (const [k, w] of [...wars]) if (w.a === L.id || w.b === L.id) wars.delete(k);
  ev(by, 'elim', `ANNEXED ${L.name}`, { prov: L.capital, loser: L.id });
}
function evict() {
  for (const a of armies) {
    const ow = owner[a.prov]; if (!ow || ow === a.owner || atWar(ow, a.owner)) continue;
    const n = nations[a.owner - 1]; if (!n.provs.size) continue;
    const d = bfs(a.prov).d, dest = [...n.provs.keys()].sort((x, y) => d[x] - d[y])[0];
    a.battle = null; a.retreating = false; a.exiting = true;
    if (!orderArmy(a, dest)) { a.prov = dest; a.moving = false; a.path = []; }
  }
}
// peace decisions, once every 5 s for every war
function peaceAI() {
  for (const w of [...wars.values()]) {
    const s = score(w, w.a), lead = s >= 0 ? w.a : w.b, S = Math.abs(s), Wn = nations[lead - 1], Ln = nations[(lead === w.a ? w.b : w.a) - 1];
    if (S >= WAR.total) { makePeace(w, lead, { kind: 'total' }); continue; }
    const winStr = armyPower(Wn), loseStr = armyPower(Ln);
    if (S >= WAR.provs && T >= w.demandAt) {
      w.demandAt = T + 60;
      const want = Wn.pers === 'isolationist' || Wn.pers === 'techjunkie' ? 'gold' : 'provs';
      const cand = connectedPick(Wn, Ln);
      // nothing worth taking (only a capital left, or a realm small enough to annex): fight on for total victory
      if (FINISH && (Ln.provs.size <= WAR.maxProvs || !cand.length) && want !== 'gold') continue;
      // the winner pushes for total victory if it is running away with the war
      if (Wn.pers === 'warpig' || Wn.pers === 'expansionist') { if (winStr > 2.5 * loseStr && S < 90) continue; }
      if (loseStr < winStr * 1.2 || S >= 75) { makePeace(w, lead, want === 'gold' || !cand.length ? { kind: 'gold' } : { kind: 'provs', provs: cand }); continue; }
    }
    if (S >= WAR.gold && (Wn.pers === 'isolationist' || Wn.pers === 'techjunkie') && T - w.since > 120 && Wn.id !== w.aggressor) { makePeace(w, lead, { kind: 'gold' }); continue; }
    w.peak = Math.max(w.peak || 0, S); w.winStart = w.winStart ?? w.since;
    if (T - w.winStart >= 300) { if (w.peak <= 10) { whitePeace(w, 'no one passed 10 warscore in 5 min'); continue; } w.winStart = T; w.peak = S; }
  }
}

// ---------- workers ----------
function travelTime(n, from, to, speed, scout) {
  const p = pathTo(from, to); if (!p) return Infinity;
  let t = 0, a = from; for (const q of p) { t += dist(a, q) / (SPEED * speed) * (scout && !n.explored.has(q) ? SCOUT_SLOW : 1); a = q; }
  return t;
}
function bordersOwned(n, p) { return allNbr[p].some(q => owner[q] === n.id); }
function stepWorkers(n) {
  for (const w of n.workers) {
    if (!w.job || T < w.busy) continue;
    const j = w.job; w.prov = j.prov; w.job = null;
    if (j.kind === 'survey') { n.surveyed.add(j.prov); n.explored.add(j.prov); for (const q of allNbr[j.prov]) n.explored.add(q); }
    else if (j.kind === 'outpost') {
      if (!owner[j.prov] && bordersOwned(n, j.prov)) { n.provs.set(j.prov, { stage: 0, extras: [] }); owner[j.prov] = n.id; for (const q of allNbr[j.prov]) n.explored.add(q); }
      else refund(n, OUTPOST_COST);
    } else if (j.kind === 'build') {
      const v = n.provs.get(j.prov);
      if (v && v.extras.length < PLOTS[v.stage]) { v.extras.push({ type: j.type, lv: 1 }); onBuilt(n, j.type, j.prov); }
      else refund(n, BUILD[j.type].cost);
    }
  }
}
function onBuilt(n, type, p) {
  if (type === 'forge' && n.stats.firstForge === null) n.stats.firstForge = T;
  if (type === 'magetower' && n.stats.firstTower === null) { n.stats.firstTower = T; ev(n, 'magic', 'built its first Mage Tower', { prov: p }); }
}
function assign(n, w, job, time) { w.job = job; w.busy = T + time; }
function freeSites(n) {
  const out = [];
  for (let p = 0; p < NP; p++) if (!owner[p] && n.surveyed.has(p) && bordersOwned(n, p)) out.push(p);
  return out;
}
const pendingOutposts = n => n.workers.filter(w => w.job && w.job.kind === 'outpost').map(w => w.job.prov);
const pendingBuild = (n, p) => n.workers.filter(w => w.job && w.job.kind === 'build' && w.job.prov === p);
const provValue = p => yields[p].food * 1.0 + yields[p].wood * 1.0 + yields[p].gold * 2 + (yields[p].deposit ? 6 : 0) + (['grassland', 'forest'].includes(terrain[p]) ? 3 : 0) + treeBorder[p];

function aiWayfinders(n) {
  const taken = new Set(n.workers.filter(w => w.job && w.job.kind === 'survey').map(w => w.job.prov));
  const own = [...n.provs.keys()];
  const dOwn = bfs(own, allNbr).d;
  for (const w of n.workers) {
    if (w.kind !== 'wf' || w.job) continue;
    let best = -1, bs = Infinity;
    const reach = n.provs.size >= n.maxProvs ? 1 : 3;
    for (let p = 0; p < NP; p++) {
      if (n.surveyed.has(p) || taken.has(p) || dOwn[p] > reach) continue;
      if (owner[p] && owner[p] !== n.id) continue;
      const tt = travelTime(n, w.prov, p, WF.speed, true); if (tt === Infinity) continue;
      const sc = tt + dOwn[p] * 25 - provValue(p) * 2;
      if (sc < bs) { bs = sc; best = p; }
    }
    if (best >= 0) { taken.add(best); assign(n, w, { kind: 'survey', prov: best }, travelTime(n, w.prov, best, WF.speed, true) + SURVEY_TIME); }
  }
}
function canPlace(n, p, type) {
  const v = n.provs.get(p); if (!v || occ.has(p)) return false;
  const d = BUILD[type]; if (d.tech && !hasTech(n, d.tech)) return false;
  if (type === 'farm' && !['grassland', 'forest'].includes(terrain[p])) return false;
  if (type === 'lumber' && !treeBorder[p]) return false;
  if (type === 'goldmine' && !yields[p].deposit) return false;
  const pend = pendingBuild(n, p);
  const have = v.extras.filter(e => e.type === type).length + pend.filter(w => w.job.type === type).length;
  const cap = type === 'farm' ? 4 : type === 'lumber' ? treeBorder[p] : 1;
  if (have >= cap) return false;
  if (v.extras.length + pend.length >= PLOTS[v.stage]) return false;
  return true;
}
function bestSpot(n, type, from) {
  let best = -1, bs = Infinity;
  for (const [p] of n.provs) {
    if (!canPlace(n, p, type)) continue;
    const v = n.provs.get(p), tt = travelTime(n, from, p, MASON.speed);
    // keep the capital's plots for the important buildings
    const sc = tt + (type === 'farm' || type === 'lumber' ? (v.stage === 2 ? 30 : 0) : (v.stage === 0 ? 20 : 0)) - (type === 'farm' ? yields[p].food * 3 : 0);
    if (sc < bs) { bs = sc; best = p; }
  }
  return best;
}
// what the nation is saving for: the first unaffordable "big" item reserves its cost
function goals(n) {
  const G = [], has = t => countB(n, t) + n.workers.filter(w => w.job && w.job.type === t).length;
  if (n.wantBarracks && !has('barracks') && n.pers === 'warpig') G.push({ kind: 'build', type: 'barracks', cost: BUILD.barracks.cost });
  if (forts(n) + n.fortUps.size < Math.min(fortLimit(n), n.fortWant) && [...n.provs.values()].some(v => v.stage === 0)) G.push({ kind: 'fort', cost: FORT_UP.cost });
  if (n.wantTower && hasTech(n, 'magetower') && !has('magetower')) G.push({ kind: 'build', type: 'magetower', cost: BUILD.magetower.cost });
  if (n.wantForge && !has('forge')) G.push({ kind: 'build', type: 'forge', cost: BUILD.forge.cost });
  if (n.wantBarracks && !has('barracks')) G.push({ kind: 'build', type: 'barracks', cost: BUILD.barracks.cost });
  for (const type of ['magetower', 'forge']) {
    const wantLv = type === 'forge' ? n.forgeLv : n.towerLv;
    for (const e of extrasAll(n)) if (e.type === type && !e.upAt && e.lv < Math.min(3, wantLv)) G.push({ kind: 'xup', type, cost: BUILD[type].ups[e.lv].cost });
  }
  if (n.wantStable && hasTech(n, 'stable') && !has('stable')) G.push({ kind: 'build', type: 'stable', cost: BUILD.stable.cost });
  if (n.wantForge && has('forge') < (n.forgeN || 1)) G.push({ kind: 'build', type: 'forge', cost: BUILD.forge.cost });
  if (n.wantTower && hasTech(n, 'magetower') && has('magetower') < (n.towerN || 1)) G.push({ kind: 'build', type: 'magetower', cost: BUILD.magetower.cost });
  if (n.wantBarracks && has('barracks') < n.barracksN) G.push({ kind: 'build', type: 'barracks', cost: BUILD.barracks.cost });
  return G;
}
function reserve(n) { const g = goals(n)[0]; return g ? g.cost : {}; }
const okAfter = (n, c, res) => RES.every(k => (n.stock[k] || 0) - (c[k] || 0) >= (res[k] || 0) || !(c[k] > 0));
function foodTarget(n) { return 6 + Math.max(0, (n.wantArmy || 0) - soldiers(n)) * 0 + Math.min(n.wantArmy || 0, 60) * 2.2 + n.mageWant + n.workers.length; }
function woodTarget(n) { return 10 + n.provs.size * 0.6; }
// small economy buildings, in order of need
function econList(n) {
  const inc = n.income, L = [];
  const near = k => n.stock[k] > storeCap(n, k) * 0.85;
  L.push('goldmine');
  if (hasTech(n, 'market')) L.push('market');
  if (inc.food < foodTarget(n)) L.push('farm');
  if (inc.wood < woodTarget(n)) L.push('lumber');
  if (near('gold') && hasTech(n, 'bank')) L.push('bank');
  if (near('wood') && hasTech(n, 'storehouse')) L.push('storehouse');
  if (near('food') && hasTech(n, 'granary') && inc.food > 0) L.push('granary');
  return L;
}
function netAfter(n, type) { const u = BUILD[type].up, g = givesOf(n, type); const o = {}; for (const k of RES) o[k] = n.income[k] - (u[k] || 0) + (g[k] || 0); return o; }
function aiMasons(n) {
  const idle = n.workers.filter(w => w.kind === 'mason' && !w.job);
  if (!idle.length) return;
  for (const w of idle) {
    // 1) outposts while below the target size (they only cost wood, and every one adds gold, research and plots)
    const garrisonOk = !TYR_ON || n.provs.size + pendingOutposts(n).length < 10 || soldiersOnly(n) >= n.provs.size + pendingOutposts(n).length + 1;
    const want = garrisonOk && n.provs.size + pendingOutposts(n).length < n.maxProvs && outposts(n) + pendingOutposts(n).length < outpostLimit(n);
    if (want && afford(n, OUTPOST_COST)) {
      const pend = new Set(pendingOutposts(n)); let best = -1, bs = Infinity;
      for (const p of freeSites(n)) { if (pend.has(p)) continue; const sc = travelTime(n, w.prov, p, MASON.speed) - provValue(p) * 3; if (sc < bs) { bs = sc; best = p; } }
      if (best >= 0) { pay(n, OUTPOST_COST); assign(n, w, { kind: 'outpost', prov: best }, travelTime(n, w.prov, best, MASON.speed) + BUILD_TIME); continue; }
    }
    // 2) a goal building, as soon as it is affordable
    const G = goals(n).filter(g => g.kind === 'build');
    let done = false;
    for (const g of G) {
      if (!afford(n, g.cost)) break;
      const p = bestSpot(n, g.type, w.prov); if (p < 0) continue;
      pay(n, g.cost); assign(n, w, { kind: 'build', prov: p, type: g.type }, travelTime(n, w.prov, p, MASON.speed) + BUILD_TIME); done = true; break;
    }
    if (done) continue;
    // 3) economy buildings that don't eat into what we are saving for
    const res = reserve(n);
    for (const type of econList(n)) {
      const c = BUILD[type].cost; if (!afford(n, c)) continue;
      if (!okAfter(n, c, (type === 'market' || type === 'goldmine') ? { wood: res.wood || 0 } : res)) continue;
      const after = netAfter(n, type);
      if (type !== 'market' && type !== 'goldmine' && after.gold < 2) continue;
      if (after.wood < 1 && type !== 'lumber') continue;
      const p = bestSpot(n, type, w.prov); if (p < 0) continue;
      pay(n, c); assign(n, w, { kind: 'build', prov: p, type }, travelTime(n, w.prov, p, MASON.speed) + BUILD_TIME); break;
    }
  }
}
function aiUpgrades(n) {
  // forts: no Mason needed
  const g0 = goals(n)[0];
  if (n.fortUps.size === 0 && forts(n) < Math.min(fortLimit(n), n.fortWant) && afford(n, FORT_UP.cost) && (!g0 || g0.kind === 'fort' || okAfter(n, FORT_UP.cost, g0.cost))) {
    const c = [...n.provs].filter(([p, v]) => v.stage === 0 && !occ.has(p)).sort((a, b) => provValue(b[0]) - provValue(a[0]))[0];
    if (c) { pay(n, FORT_UP.cost); n.fortUps.set(c[0], T + FORT_UP.time); }
  }
  for (const [p, at] of [...n.fortUps]) if (T >= at) { n.fortUps.delete(p); const v = n.provs.get(p); if (v && v.stage === 0) { v.stage = 1; if (n.stats.firstFort === null) n.stats.firstFort = T; } }
  // forge and tower levels
  for (const type of ['forge', 'magetower']) {
    const wantLv = type === 'forge' ? n.forgeLv : n.towerLv; if (!wantLv) continue;
    for (const [p, v] of n.provs) for (const e of v.extras) {
      if (e.type !== type) continue;
      if (e.upAt) { if (T >= e.upAt) { e.lv++; e.upAt = 0; } continue; }
      if (e.lv >= wantLv || e.lv >= 3) continue;
      const up = BUILD[type].ups[e.lv], g1 = goals(n)[0]; if (afford(n, up.cost) && (!g1 || (g1.kind === 'xup' && g1.type === type) || okAfter(n, up.cost, g1.cost))) { pay(n, up.cost); e.upAt = T + up.time; }
    }
  }
}
function aiWorkersHire(n) {
  const wf = n.workers.filter(w => w.kind === 'wf').length, ma = n.workers.filter(w => w.kind === 'mason').length;
  const unsurveyed = n.provs.size < n.maxProvs;
  if (unsurveyed && wf < n.wfWant && afford(n, WF.cost) && n.income.food >= 1) { pay(n, WF.cost); n.workers.push({ kind: 'wf', prov: n.capital, busy: T + TRAIN_TIME, job: { kind: 'idle', prov: n.capital } }); }
  if (ma < n.masonWant && afford(n, MASON.cost) && n.income.food >= 1 && n.income.gold >= 1) { pay(n, MASON.cost); n.workers.push({ kind: 'mason', prov: n.capital, busy: T + TRAIN_TIME, job: { kind: 'idle', prov: n.capital } }); }
}

// ---------- training ----------
function stepQueues(n) {
  for (const [key, Q] of n.queues) {
    if (!Q.length) continue;
    if (Q[0].start === undefined) Q[0].start = T;
    if (T - Q[0].start < TRAIN_TIME) continue;
    const q = Q.shift(); if (Q.length) Q[0].start = T;
    const p = +key.split(':')[1];
    if (!n.provs.has(p)) continue;
    if (q.kind === 'mage') { n.mages.push({ prov: p, task: null, until: 0, army: null }); n.stats.magesTrained++; continue; }
    let a = armies.find(v => v.owner === n.id && v.prov === p && !v.moving && !v.battle);
    if (!a) a = newArmy(n, p, {});
    a.troops[q.kind] = (a.troops[q.kind] || 0) + 1; n.stats.soldiersTrained++;
  }
}
function queueLen(n, key) { return (n.queues.get(key) || []).length; }
function aiTrain(n) {
  const want = n.wantArmy || 0, have = soldiers(n) + [...n.queues].filter(([k]) => k.startsWith('barracks')).reduce((s, [, Q]) => s + Q.length, 0);
  if (have < want) {
    n.design = bestDesign(n, 'inf'); n.cavDesign = n.useCav ? bestDesign(n, 'cav') : null;
    for (const [p, v] of n.provs) {
      if (occ.has(p) || !v.extras.some(e => e.type === 'barracks')) continue;
      const key = 'barracks:' + p; if (queueLen(n, key) >= 2) continue;
      const cav = n.cavDesign && v.extras.some(e => e.type === 'stable') && R() < (n.cavShare || 0.3);
      const kind = cav ? n.cavDesign : n.design, st = statsOf(kind);
      // keep enough upkeep money: soldiers must not push gold or food income below the floor
      if (n.income.gold - st.up.gold < (n.minGoldInc ?? 0) || n.income.food - st.up.food < (n.minFoodInc ?? 0)) continue;
      if (!afford(n, st.cost)) continue;
      pay(n, st.cost); if (!n.queues.has(key)) n.queues.set(key, []); n.queues.get(key).push({ kind });
      computeIncome(n);
    }
  }
  // mages
  if (n.school && n.mages.length + [...n.queues].filter(([k]) => k.startsWith('tower')).reduce((s, [, Q]) => s + Q.length, 0) < n.mageWant) {
    for (const [p, v] of n.provs) {
      if (!v.extras.some(e => e.type === 'magetower')) continue;
      const key = 'tower:' + p; if (queueLen(n, key) >= 1) continue;
      if (!afford(n, MAGE_ST.cost) || n.income.gold < 4) continue;
      pay(n, MAGE_ST.cost); if (!n.queues.has(key)) n.queues.set(key, []); n.queues.get(key).push({ kind: 'mage' }); computeIncome(n);
      break;
    }
  }
}
// ---------- mages ----------
function stepMages(n) {
  if (!n.school) return;
  for (const m of n.mages) {
    if (m.army) { if (!armies.includes(m.army)) { m.army = null; } continue; }
    if (m.task && T >= m.until) {
      const what = { harvest: 'food', graverob: 'gold', trading: 'all' }[m.task], amt = [0, 300, 600, 1000][lvl(n, m.task)];
      const add = (k, v) => { const b = n.stock[k]; n.stock[k] = Math.min(storeCap(n, k), n.stock[k] + v); return n.stock[k] - b; };
      let got = 0; if (what === 'all') for (const k of RES) got += add(k, Math.round(amt / 3)); else got = add(what, amt);
      n.stats.spellRes = (n.stats.spellRes || 0) + got; n.stats.spellWaste = (n.stats.spellWaste || 0) + amt - got;
      n.stats[m.task + 'Res'] = (n.stats[m.task + 'Res'] || 0) + got;
      n.spellCd = n.spellCd || {}; n.spellCd[m.task] = T + 180;
      n.spellN = (n.spellN || 0) + 1; if (n.spellN === 1 || n.spellN % 6 === 0) ev(n, 'spell', `${({ harvest: 'Harvest', graverob: 'Grave Robbing', trading: 'Trading' })[m.task]} pays out ${amt}${what === 'all' ? ' (split 3 ways)' : ' ' + what}`, { prov: m.prov });
      m.task = null;
    }
    if (m.task) continue;
  }
  // assign idle mages
  const idle = n.mages.filter(m => !m.army && !m.task);
  for (const m of idle) {
    // a battle mage for each field army without one
    const perArmy = n.school === 'death' && lvl(n, 'curse') && lvl(n, 'risen') ? 2 : 1;
    const field = armies.filter(a => a.owner === n.id && a.mages < perArmy && count(a) >= 6 && !a.battle && !a.moving);
    const battleMagic = (n.school === 'life' && (lvl(n, 'skin') || lvl(n, 'mending'))) || (n.school === 'death' && (lvl(n, 'curse') || lvl(n, 'risen')));
    if (battleMagic && field.length && n.mages.filter(x => x.army).length < (n.battleMages ?? 2)) {
      const a = field.sort((x, y) => count(y) - count(x))[0];
      m.army = a; a.mages++; a.troops.mage = (a.troops.mage || 0) + 1; continue;
    }
    const rs = { life: 'harvest', death: 'graverob', arcane: 'trading' }[n.school];
    if (rs && lvl(n, rs) && !n.mages.some(x => x.task === rs) && T >= ((n.spellCd || {})[rs] || 0)) { m.task = rs; m.until = T + 180; continue; }
  }
  // Magnificent Harvest lasts as long as the mage casts
}
// army mages: a mage counted in a.troops.mage is lost with it; keep n.mages in sync
// ---------- personalities: the plans ----------
function neighbors(n, maxHops = 3) {
  const d = bfs([...n.provs.keys()]).d, out = [];
  for (const m of nations) { if (m === n || !m.alive) continue; let md = Infinity; for (const p of m.provs.keys()) md = Math.min(md, d[p]); if (md <= maxHops) out.push({ m, hops: md }); }
  return out.sort((a, b) => a.hops - b.hops);
}
function threatened(n) {
  if (nations.some(m => m.alive && atWar(n.id, m.id))) return true;
  return neighbors(n, 3).some(({ m }) => armyPower(m) > Math.max(armyPower(n) * 1.5, 60) && (m.pers === 'warpig' || m.phase === 'war' || [...wars.values()].some(w => w.aggressor === m.id)));
}
function configure(n) {
  const P = n.pers, size = n.provs.size, tier = techTier(n, 'gov');
  // defaults
  Object.assign(n, { maxProvs: 16, wfWant: 1, masonWant: 2, fortWant: 2, wantForge: false, forgeLv: 0, wantTower: false, towerLv: 0, wantBarracks: false, barracksN: 1, wantArmy: 0, useCav: false, mageWant: 0, goldCap: 260, family: n.family || 'sword', armorLine: n.armorLine || 'chain', minGoldInc: 1, minFoodInc: 1, expandFirst: false, reserveGold: 0 });
  const threat = threatened(n);
  const enemyMax = Math.max(0, ...neighbors(n, 3).map(({ m }) => soldiers(m)));
  const balanced = () => {
    Object.assign(n, { maxProvs: 18, wfWant: 2, masonWant: size > 8 ? 3 : 2, fortWant: 4, wantForge: size >= 5, forgeLv: size >= 10 ? 3 : 2, wantBarracks: size >= 4, barracksN: size >= 12 ? 2 : 1 });
    n.wantArmy = Math.max(Math.round(size * 0.9), Math.round(enemyMax * 0.8));
  };
  if (P === 'expansionist') {
    Object.assign(n, { maxProvs: 99, wfWant: 3, masonWant: Math.min(5, 2 + Math.floor(size / 5)), fortWant: 9, expandFirst: true, family: 'pole', armorLine: 'chain', useCav: true, goldCap: 360 });
    if (n.phase === 'open' && (freeSites(n).length === 0 || (outposts(n) >= outpostLimit(n) && forts(n) >= fortLimit(n))) && size >= 6) { n.stuckSince = n.stuckSince ?? T; if (T - n.stuckSince > 45) { n.phase = 'war'; ev(n, 'phase', `hit its limit at ${size} provinces (${freeSites(n).length ? 'outpost cap' : 'no free land'}); switching to conquest`); } } else n.stuckSince = null;
    if (n.phase === 'war') Object.assign(n, { wantBarracks: true, barracksN: size >= 14 ? 3 : 2, wantForge: true, forgeLv: 3, wantStable: true, wantArmy: Math.max(12, Math.round(size * 1.6)), minGoldInc: 0, minFoodInc: 0, masonWant: 3 });
    else { n.wantArmy = threat ? Math.round(enemyMax * 0.6) : 0; n.wantBarracks = threat; }
  } else if (P === 'isolationist') {
    Object.assign(n, { maxProvs: 10, wfWant: 1, masonWant: 2, fortWant: 9, wantForge: size >= 6, forgeLv: 3, wantTower: true, towerLv: 3, wantSchool: 'arcane', mageWant: 3, family: 'pole', armorLine: 'plate', goldCap: 600, qualityBias: 0.45 });
    n.wantBarracks = size >= 8; n.wantArmy = Math.max(6, Math.round(enemyMax * 0.7)); n.battleMages = 0;
  } else if (P === 'warpig') {
    Object.assign(n, { maxProvs: n.phase === "open" ? 5 : 8, wfWant: 1, masonWant: 2, fortWant: 2, wantBarracks: true, barracksN: size >= 5 ? 2 : 1, wantStable: size >= 5, useCav: true, cavShare: 0.25, family: 'blunt', armorLine: 'leather', goldCap: 180, wantForge: size >= 4 || n.stats.firstWar !== null, forgeLv: 2, minGoldInc: process.env.RECKLESS ? -12 : -2, minFoodInc: process.env.RECKLESS ? -12 : -2, qualityBias: 0.85 });
    n.wantArmy = 999;
  } else if (P === 'techjunkie') {
    Object.assign(n, { maxProvs: 12, wfWant: 2, masonWant: 2, fortWant: 9, wantForge: size >= 4, forgeLv: 3, forgeN: 2, wantTower: true, towerLv: 3, towerN: 2, wantSchool: 'arcane', mageWant: 4, family: 'sword', armorLine: 'plate', goldCap: 800, qualityBias: 0.3 });
    n.wantBarracks = threat; n.wantArmy = threat ? Math.max(8, Math.round(enemyMax * 1.0)) : 0; n.battleMages = 0;
  } else if (P === 'balanced') {
    balanced(); Object.assign(n, { wantTower: forts(n) >= 1, towerLv: 2, wantSchool: n.balancedSchool, mageWant: 2, family: 'sword', armorLine: 'chain' });
  } else { // magic rushes
    const school = P; n.wantSchool = school;
    if (n.phase === 'open') {
      Object.assign(n, { maxProvs: 5, wfWant: 1, masonWant: 2, fortWant: 1, wantTower: true, towerLv: 2, mageWant: 2, family: school === 'death' ? 'blunt' : 'sword', armorLine: 'chain' });
      const done = n.tech.mag.done.filter(id => !id.startsWith('school-')).length;
      if (n.school && done >= 3) { n.phase = 'balanced'; ev(n, 'phase', `magic rush done (${n.tech.mag.done.join(', ')}); going Balanced`); }
    } else {
      balanced(); Object.assign(n, { wantTower: true, towerLv: 3, mageWant: school === 'life' ? 3 : 4, family: school === 'death' ? 'blunt' : 'sword' });
    }
  }
  // blocked by the outpost limit: build another fort
  if (n.provs.size < n.maxProvs && outposts(n) >= outpostLimit(n) - 1) n.fortWant = Math.max(n.fortWant, forts(n) + 1);
  if (TYR_ON && size >= 10) { n.wantBarracks = true; n.wantArmy = Math.max(n.wantArmy, size + 2); }
  if (threat && n.wantArmy < enemyMax * 0.5 && P !== 'techjunkie') { n.wantBarracks = true; n.wantArmy = Math.max(n.wantArmy, Math.round(enemyMax * 0.6)); }
}
function aiWarDecisions(n) {
  const P = n.pers;
  const myWars = nations.filter(m => m.alive && atWar(n.id, m.id));
  if (myWars.length) return;
  const nb = neighbors(n, P === 'warpig' ? 6 : 3).filter(({ m }) => !((truces.get(pairKey(n.id, m.id)) || 0) > T));
  if (!nb.length) return;
  const myP = armyPower(n);
  const nb2 = nb.filter(({ m }) => !allied(n.id, m.id)); nb.length = 0; nb.push(...nb2); if (!nb.length) return;
  if (P === 'warpig') {
    const t = nb[0].m; if (soldiers(n) >= 8 && myP > defPower(t) * 0.9) declareWar(n, t, 'closest neighbor');
  } else if (P === 'expansionist' && n.phase === 'war') {
    const t = nb.slice().sort((a, b) => defPower(a.m) - defPower(b.m))[0].m; if (soldiers(n) >= 12 && myP > defPower(t) * 1.3) declareWar(n, t, 'conquest');
  } else if (P === 'balanced' || ((P === 'life' || P === 'death' || P === 'arcane') && n.phase === 'balanced')) {
    if (freeSites(n).length > 0 && n.provs.size < n.maxProvs) return;
    const t = nb.slice().sort((a, b) => defPower(a.m) - defPower(b.m))[0].m; if (soldiers(n) >= 10 && myP > defPower(t) * 1.6) declareWar(n, t, 'opportunity');
  }
}
function aiArmies(n) {
  const mine = armies.filter(a => a.owner === n.id && count(a) > 0);
  const enemies = nations.filter(m => m.alive && atWar(n.id, m.id));
  const home = n.capital !== undefined && n.provs.has(n.capital) ? n.capital : [...n.provs.keys()][0];
  const offensive = ['warpig', 'expansionist', 'balanced', 'life', 'death', 'arcane'].includes(n.pers) && !(n.pers === 'isolationist' || n.pers === 'techjunkie');
  const armiesIn = (o, p) => armies.filter(v => v.owner === o && v.prov === p && !v.retreating);
  for (const a of mine) {
    if (a.battle || a.retreating || a.exiting) continue;
    const str = rawStrength([a]);
    if (!enemies.length) {
      // peacetime: gather in the capital (or a border fort facing the nearest neighbor)
      const tgt = n.rally ?? home;
      if (!a.moving && a.prov !== tgt) orderArmy(a, tgt);
      continue;
    }
    const goals = [];
    for (const [p, v] of n.provs) { const foe = enemies.reduce((s, m) => s + rawStrength(armiesIn(m.id, p)), 0); if (foe && foe <= str * 1.3) goals.push({ p, w: 0 }); else if (occ.has(p) && !foe) goals.push({ p, w: 1 }); }
    if (offensive || n.pers === 'isolationist' || n.pers === 'techjunkie') {
      for (const m of enemies) for (const [p, v] of m.provs) {
        const foe = rawStrength(armiesIn(m.id, p));
        if (occ.get(p) === n.id) continue;
        const deep = !offensive && !allNbr[p].some(q => owner[q] === n.id);   // defensive nations only hit border provinces
        if (deep) continue;
        if (foe <= str * 0.9) goals.push({ p, w: v.stage === 2 ? 1.5 : 2 });
      }
      // hunt enemy field armies that are weaker
      if (offensive) for (const e of armies) if (enemies.some(m => m.id === e.owner) && !e.moving && rawStrength([e]) < str * 0.8) goals.push({ p: e.prov, w: 0.5 });
    }
    let best = null, bd = Infinity;
    for (const gl of goals) { const hp = gl.p === a.prov ? [] : pathFor(a.owner, a.prov, gl.p); if (!hp) continue; const d = hp.length + gl.w * 3; if (d < bd) { bd = d; best = gl.p; } }
    if (best === null) { if (a.prov !== home && a.final !== home) orderArmy(a, home); continue; }
    if ((a.moving && a.final === best) || (!a.moving && a.prov === best)) continue;
    orderArmy(a, best);
  }
}

// ---------- setup ----------
function placeCapitals() {
  const cands = world.provinces.map((p, i) => i).filter(i => terrain[i] === 'grassland' && openNbr[i].length >= 3 && !world.provinces[i].coast);
  const fallback = world.provinces.map((p, i) => i).filter(i => terrain[i] === 'grassland' && openNbr[i].length >= 2);
  const pool = cands.length >= 16 ? cands : fallback;
  // farthest-point sampling over hop distance
  const pick = [pool[Math.floor(R() * pool.length)]];
  while (pick.length < 8) {
    const d = bfs(pick, allNbr).d; let best = -1, bd = -1;
    for (const i of pool) if (d[i] > bd || (d[i] === bd && R() < 0.3)) { bd = d[i]; best = i; }
    pick.push(best);
  }
  return pick;
}
const caps = placeCapitals();
const persOrder = shuffle(ORDER.slice());
caps.forEach((c, i) => { const n = newNation(i + 1, persOrder[i], c); nations.push(n); });
nations.forEach(n => { n.balancedSchool = ['life', 'death', 'arcane'][Math.floor(R() * 3)]; configure(n); computeIncome(n); });
const capDist = []; for (const n of nations) { const d = bfs(n.capital).d; capDist.push(nations.map(m => d[m.capital])); }


// ---------- duel mode: equal-budget armies of fixed designs fight on each terrain ----------
if (process.env.DUEL) {
  const D = {
    'Spear (start)': { type: 'inf', weapon: 'spear', armor: 'leather1' },
    'Footman (start)': { type: 'inf', weapon: 'shortsword', armor: 'leather1' },
    'Clubman (start)': { type: 'inf', weapon: 'club', armor: 'leather1' },
    'Rider (start)': { type: 'cav', weapon: 'spear', armor: 'leather1', horse: 'riding' },
    'Pike+Chain II': { type: 'inf', weapon: 'pike', armor: 'chain2' },
    'Bastard+Kite+Chain II': { type: 'inf', weapon: 'sword', shield: 'kite', armor: 'chain2' },
    'Mace+Chain II': { type: 'inf', weapon: 'mace', armor: 'chain2' },
    'Bastard+Round+Leather I': { type: 'inf', weapon: 'sword', shield: 'round', armor: 'leather1' },
    'Halberd+Plate IV': { type: 'inf', weapon: 'halberd', armor: 'plate4' },
    'Longsword+Aegis+Plate IV': { type: 'inf', weapon: 'longsword', shield: 'aegis', armor: 'plate4' },
    'Greatsword+Plate IV': { type: 'inf', weapon: 'greatsword', armor: 'plate4' },
    'Warhammer+Plate IV': { type: 'inf', weapon: 'warhammer', armor: 'plate4' },
    'Warhammer+Leather I': { type: 'inf', weapon: 'warhammer', armor: 'leather1' },
    'Friesian lancer (Pike+Chain II)': { type: 'cav', weapon: 'pike', armor: 'chain2', horse: 'friesian' },
    'Percheron knight (Longsword+Kite+Plate IV)': { type: 'cav', weapon: 'longsword', shield: 'kite', armor: 'plate4', horse: 'percheron' },
    'Mongolian (Mace+Leather II)': { type: 'cav', weapon: 'mace', armor: 'leather2', horse: 'mongolian' }
  };
  const ids = Object.fromEntries(Object.entries(D).map(([k, d]) => [k, regDesign(d)]));
  const BUDGET = +process.env.BUDGET || 6000;
  const price = st => (st.cost.gold || 0) + (st.cost.food || 0) * 0.5 + (st.cost.wood || 0) * 0.5;   // food and wood at half the value of gold
  const provOf = { grassland: terrain.indexOf('grassland'), forest: terrain.indexOf('forest'), swamp: terrain.indexOf('swamp'), desert: terrain.indexOf('desert') };
  function fight(k1, k2, terr, defenderFirst) {
    armies.length = 0; battles.length = 0;
    const n1 = Math.max(1, Math.round(BUDGET / price(statsOf(ids[k1])))), n2 = Math.max(1, Math.round(BUDGET / price(statsOf(ids[k2]))));
    const p = provOf[terr];
    const A = newArmy(nations[0], p, { [ids[k1]]: n1 }), B = newArmy(nations[1], p, { [ids[k2]]: n2 });
    A.arrived = 0; B.arrived = 1;   // A defends
    const w = { a: 1, b: 2, base: 0, since: 0, nextTick: 1e9 }; wars.set('1|2', w);
    owner[p] = 0;
    // no retreat in duels: fight to the end
    const saveR = retreat; let t0 = T;
    while (T - t0 < 600) { stepBattles(0.4); T += 0.4; if (!armies.includes(A) || !armies.includes(B)) break; if (!battles.length && T - t0 > 2) break; }
    const left = a => armies.includes(a) ? count(a) : 0;
    return { win: left(A) > 0 && left(B) === 0 ? 1 : left(B) > 0 && left(A) === 0 ? 2 : 0, n1, n2, l1: left(A), l2: left(B) };
  }
  // retreats off for duels
  retreat = function () {};
  const names = Object.keys(D), res = {};
  for (const terr of ['grassland', 'forest', 'swamp']) {
    res[terr] = {};
    for (const a of names) { res[terr][a] = {}; for (const b of names) { if (a === b) continue; let w = 0; const N = 12; for (let i = 0; i < N; i++) { const r1 = fight(a, b, terr); const r2 = fight(b, a, terr); if (r1.win === 1) w += 0.5; if (r2.win === 2) w += 0.5; } res[terr][a][b] = w / N; } }
  }
  const info = Object.fromEntries(names.map(k => { const st = statsOf(ids[k]); return [k, { atk: st.atk, hp: st.hp, armor: st.armor, speed: st.speed, cost: st.cost, up: st.up, price: price(st), count: Math.round(BUDGET / price(st)) }]; }));
  require('fs').writeFileSync(process.env.DUEL, JSON.stringify({ budget: BUDGET, info, res }));
  for (const terr in res) { console.log('==', terr); for (const a of names) { const v = Object.values(res[terr][a]); console.log(a.padEnd(44), (v.reduce((s, x) => s + x, 0) / v.length * 100).toFixed(0) + '%', 'n=' + info[a].count); } }
  process.exit(0);
}

// ---------- main loop ----------
const DT = 0.4;
const FINISH = !process.env.NOFINISH, ALLY_ON = !process.env.NOALLY;
const REC = []; let recK = 0;
function record() {
  const ar = [];
  for (const a of armies) { const c = count(a); if (c <= 0) continue; let to = -1, f = 0; if (a.moving && a.path.length) { to = a.path[0]; if (a._hopTo !== to || a._hopFrom !== a.prov) { a._hopTo = to; a._hopFrom = a.prov; a._hopT0 = T; } const dur = Math.max(0.01, a.nextAt - a._hopT0); f = Math.max(0, Math.min(1, (T - a._hopT0) / dur)); } ar.push([a.id, a.owner, a.prov, to, Math.round(f * 100) / 100, c, a.battle ? 1 : 0, a.retreating ? 1 : 0, a.mages || 0]); }
  REC.push({ t: Math.round(T * 10) / 10, own: owner.join(','), st: Array.from({ length: NP }, (_, p) => owner[p] ? nations[owner[p] - 1].provs.get(p).stage : -1).join(','), occ: [...occ], bat: battles.map(b => b.prov), ar,
    wars: [...wars.values()].map(w => [w.a, w.b, score(w, w.a)]), al: alliances.map(A => [A.a, A.b, A.vs]),
    nat: nations.map(n => [n.provs.size, soldiers(n), n.tech.gov.done.length + n.tech.mil.done.length + n.tech.mag.done.length, n.alive ? 1 : 0, Math.round(n.income.gold), n.exhaust || 0, n.mages.length, n.tyr || 0]) });
}
let nextPay = 5, nextAI = 0, nextSnap = 0, nextPeace = 5;
function snapshot() {
  timeline.push({ own: Math.round(T) % 600 === 0 ? owner.slice() : undefined, occ: Math.round(T) % 600 === 0 ? [...occ] : undefined, t: Math.round(T), n: nations.map(n => ({ provs: n.provs.size, forts: forts(n), soldiers: soldiers(n), force: forceLimit(n), exhaust: n.exhaust || 0, power: Math.round(armyPower(n)), techs: n.tech.gov.done.length + n.tech.mil.done.length + n.tech.mag.done.length, gov: n.tech.gov.done.length, mil: n.tech.mil.done.length, mag: n.tech.mag.done.length, mages: n.mages.length, gold: Math.round(n.stock.gold), wood: Math.round(n.stock.wood), food: Math.round(n.stock.food), inc: { ...n.income }, gross: { ...n.gross }, alive: n.alive })), wars: [...wars.values()].map(w => ({ a: w.a, b: w.b, s: score(w, w.a) })) });
}
while (T <= DUR) {
  if ((recK++ % 2) === 0) record();
  stepArmies();
  stepBattles(DT);
  stepArrows();
  stepWar(DT);
  for (const n of nations) if (n.alive) { stepWorkers(n); stepQueues(n); stepMages(n); }
  if (T >= nextPay) { nextPay += 5; for (const n of nations) if (n.alive) payday(n); }
  if (T >= nextPeace) { nextPeace += 5; peaceAI(); stepAlliances(); }
  if (T >= nextAI) {
    nextAI += 2;
    for (const n of nations) {
      if (!n.alive) continue;
      if (!n.provs.has(n.capital)) n.capital = [...n.provs.keys()][0];
      computeIncome(n); configure(n);
      aiWorkersHire(n); aiWayfinders(n); aiMasons(n); aiUpgrades(n); aiTrain(n); aiWarDecisions(n); aiArmies(n);
    }
  }
  if (T >= nextSnap) { nextSnap += 30; snapshot(); if (process.env.DBG && T > +process.env.DBG && T < +process.env.DBG + 31) { const n = nations.find(x => x.pers === process.env.WHO); console.log('T', T, n.name, 'cap', n.capital, [...n.provs.keys()]); for (const a of armies.filter(a => a.owner === n.id)) console.log(' army', a.prov, JSON.stringify(a.troops), 'mv', a.moving, a.path, 'bat', !!a.battle, 'ret', a.retreating, 'exit', a.exiting); for (const w of wars.values()) if (w.a === n.id || w.b === n.id) { const m = nations[(w.a === n.id ? w.b : w.a) - 1]; console.log(' war vs', m.name, 'provs', [...m.provs.keys()], 'paths', [...m.provs.keys()].map(p => (pathTo(n.capital, p) || ['X']).length)); } } }
  T += DT;
}
snapshot();
const summary = nations.map(n => ({ id: n.id, pers: n.pers, name: n.name, color: n.color, alive: n.alive, diedAt: n.diedAt, killedBy: n.killedBy, capital: n.capital, provs: n.provs.size, forts: forts(n), soldiers: soldiers(n), power: Math.round(armyPower(n)), mages: n.mages.length, school: n.school, techs: { gov: n.tech.gov.done.length, mil: n.tech.mil.done.length, mag: n.tech.mag.done.length }, techList: n.tech, buildings: extrasAll(n).reduce((o, e) => (o[e.type] = (o[e.type] || 0) + 1, o), {}), design: n.design && DSTATS[n.design] ? { id: n.design, atk: DSTATS[n.design].atk, hp: DSTATS[n.design].hp, armor: DSTATS[n.design].armor, cost: DSTATS[n.design].cost } : null, stats: n.stats, stock: n.stock, income: n.income, gross: n.gross }));
require('fs').writeFileSync(OUT.replace('.json', '.rec.json'), JSON.stringify({ rec: REC, events, verts: world.provinces.map(p => p.verts.map(v => world.vertices[v])), sites: site, terrain, nations: nations.map(n => ({ id: n.id, pers: n.pers, name: n.name, cap: caps[n.id - 1] })), edges: world.edges.map(e => [e.v[0], e.v[1], e.a, e.b, e.open ? 1 : 0, e.style || '']), vertices: world.vertices, W: world.W, H: world.H, lakes: world.lakes }));
require('fs').writeFileSync(OUT, JSON.stringify({ seed: SEED, dur: DUR, caps, capDist, terrain, owner, sites: site, verts: world.provinces.map(p => p.verts.map(v => world.vertices[v])), summary, events, timeline, battles: battleLog }, null, 0));
console.log('seed', SEED);
for (const s of summary) console.log(`${s.name.padEnd(13)} ${s.alive ? 'alive' : 'DEAD@' + Math.round(s.diedAt / 60) + 'm'} provs ${String(s.provs).padStart(3)} forts ${s.forts} soldiers ${String(s.soldiers).padStart(3)} power ${String(s.power).padStart(5)} techs ${s.techs.gov}/${s.techs.mil}/${s.techs.mag} mages ${s.mages} ${s.school || ''} k/l ${s.stats.kills}/${s.stats.lost} inc ${s.income.gold}/${s.income.wood}/${s.income.food}`);
console.log('events', events.length, 'battles', battleLog.length);
