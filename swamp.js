
// ================= Swamplings: the second race (v84) =================
// Every nation is either Realmlings (the original folk) or Swamplings: hunched, green, with a massive underbite and glowing red eyes.
// RACE maps owner id -> 'realm' | 'swamp'. Swamplings start in a swamp, live in mud-and-clay huts and differ in buildings,
// units, equipment, technology and magic (Pyromancy). The player's race also decides the names shown in the interface.
// (var, not const: earlier code may look these up before this file has run)
var RACE = { 1: 'realm' };
function raceOf(o) { return (RACE && RACE[o]) || 'realm'; }
function isSw(o) { return !!RACE && RACE[o] === 'swamp'; }
function techFor(x, race) { return !x.race || x.race === race; }
var SW_ICONS = null;   // technology pictures for Swamplings (filled in at the end of this file)
const RACE_NAME = { realm: 'Realmlings', swamp: 'Swamplings' };
const THUG = 'thug:A';

// ---------- the Thug: trained at a Thug Den, he does no fighting; inside a den he makes 1 gold every 10 s ----------
UNIT_DEFS[THUG] = { name: 'Thug', cost: { gold: 40 }, upkeep: { food: 1 }, blurb: 'Doesn’t fight. Sits in a Thug Den and squeezes 1 gold out of the neighborhood every 10 s.' };
UNIT_SPEED[THUG] = 0.9;
const denCap = o => 2 + (techOf(o, 'thugs2') ? 1 : 0) + (techOf(o, 'thugs3') ? 1 : 0);
const myDens = () => { const out = []; for (const [p, l] of S.extras) if (owned(p)) for (const e of l) if (e.type === 'market') out.push({ p, e }); return out; };
// you can have as many Thugs as your dens can hold
Object.defineProperty(UNIT_LIMIT, THUG, { configurable: true, get() { return Math.max(1, myDens().length * denCap(ME)); } });
const _unitTotal = unitTotal;
unitTotal = function (kind) { return _unitTotal(kind) + (kind === THUG ? myDens().reduce((n, d) => n + (d.e.thugs || 0), 0) : 0); };
CMD[THUG] = [{ id: 'thugin', cell: 0, key: 'Q' }, { id: 'dismiss', cell: 15, key: '' }];
// a newly trained Thug walks straight into his den when there is room
function thugIntoDen(prov, key) {
  const want = S.selKind === 'market' && key === srcKey() ? extraAt(prov, S.selPart) : null;
  const e = want && want.type === 'market' && (want.thugs || 0) < denCap(ME) ? want : extrasIn(prov).find(x => x.type === 'market' && (x.thugs || 0) < denCap(ME));
  if (!e || !owned(prov)) return false;
  e.thugs = (e.thugs || 0) + 1; return true;
}
const denRoomIn = p => owned(p) && !S.occ.has(p) ? extrasIn(p).find(e => e.type === 'market' && (e.thugs || 0) < denCap(ME)) : null;
function thugsEnter(list) {
  let n = 0, sent = 0;
  for (const u of list) {
    const e = denRoomIn(u.prov);
    if (e && !u.moving) { e.thugs = (e.thugs || 0) + 1; S.units = S.units.filter(v => v !== u); n++; continue; }
    // walk to the nearest den with room and go in on arrival
    const d = hopsFrom(u.prov, allNbr), goal = myDens().filter(x => (x.e.thugs || 0) < denCap(ME) && !S.occ.has(x.p)).sort((a, b) => d[a.p] - d[b.p])[0];
    if (goal && order(u, goal.p)) { u.denGoal = goal.p; sent++; }
  }
  S.selected = S.selected.filter(v => S.units.includes(v));
  if (n) { computeIncome(); toast(`${n > 1 ? n + ' Thugs settle' : 'The Thug settles'} into the Thug Den.`); }
  if (sent) toast(`${sent > 1 ? sent + ' Thugs head' : 'The Thug heads'} for the nearest Thug Den with room.`);
  if (!n && !sent) toast('No Thug Den with room. Build another, or research the Thugging technologies.', true);
  cmdKey = ''; rosterKey = '';
}
function stepThugs() {
  for (const u of S.units.slice()) if (u.kind === THUG && u.denGoal !== undefined && !u.moving && u.prov === u.denGoal) { const e = denRoomIn(u.prov); u.denGoal = undefined; if (e) { e.thugs = (e.thugs || 0) + 1; S.units = S.units.filter(v => v !== u); S.selected = S.selected.filter(v => v !== u); computeIncome(); rosterKey = ''; } }
}
function thugOut() {
  const p = S.selBuilding, e = extraAt(p, S.selPart); if (!e || !(e.thugs > 0)) return;
  e.thugs--; const u = mkUnit(S.nextId++, THUG, 'Thug', p, 0); u.slot = freeSlot(p, u); [u.x, u.y] = slotPos(p, u.slot); u.born = S.t; S.units.push(u);
  computeIncome(); cmdKey = ''; rosterKey = ''; toast('A Thug steps out of the den.');
}
// a den's gold: 1 per Thug every payout; Highwaymen doubles it when the den borders another nation; Thug Guilds add 5% per level
const denBorders = (p, o) => allNbr[p].some(q => { const n = nationOf(q); return n && n !== o && isNation(n); });
function thugGold(p, o, full) {
  let g = 0;
  for (const e of extrasIn(p)) if (e.type === 'market') g += (full ? denCap(o) : (e.thugs || 0)) * (techOf(o, 'traderoutes') && denBorders(p, o) ? 2 : 1);
  const rep = o === ME ? repLv('rep-trade') : NATIONS[o] ? aiRep(NATIONS[o], 'rep-trade') : 0;
  return Math.round(g * (1 + 0.05 * rep));
}

// ---------- the economy ----------
// Swamp Taxes: a Swampling outpost, fort or capital in a swamp makes +1 gold and +2 food per level (outpost 1, fort 2, capital 3)
function swampTax(p, b) { return isSw(b.owner) && world.provinces[p].terrain === 'swamp' ? { gold: b.stage + 1, food: 2 * (b.stage + 1) } : null; }
const _provinceIncome = provinceIncome;
provinceIncome = function (p, b) {
  const y = _provinceIncome(p, b);
  if (!isSw(b.owner)) return y;
  const tx = swampTax(p, b); if (tx) { y.gold += tx.gold; y.food += tx.food; }
  y.gold += thugGold(p, b.owner);
  return y;
};
const _aiProvIncome = aiProvIncome;
aiProvIncome = function (N, p, b) {
  const y = _aiProvIncome(N, p, b);
  if (N.race !== 'swamp') return y;
  const tx = swampTax(p, b); if (tx) { y.gold += tx.gold; y.food += tx.food; }
  y.gold += thugGold(p, N.id, true);   // AI dens are taken to be full
  return y;
};
const MARKET_GIVES = { gold: 3 };
const _givesOf = givesOf;
givesOf = function (type) { return type === 'market' ? (isSw(ME) ? {} : { ...MARKET_GIVES }) : _givesOf(type); };
const _aiGives = aiGives;
aiGives = function (N, type) { return type === 'market' ? (N.race === 'swamp' ? {} : { ...MARKET_GIVES }) : _aiGives(N, type); };
// Trade Routes is Highwaymen for Swamplings: no roads, no market gold
const _tradeGold = tradeGold;
tradeGold = function () { return isSw(ME) ? 0 : _tradeGold(); };
// the Supply Cache: +500 gold, wood and food storage (a Realmling Bank: +1000 gold)
const BANK_STORE = { gold: 1000 }, SUPPLY_STORE = { gold: 500, wood: 500, food: 500 };
const storeOf = (type, o) => type === 'bank' ? (isSw(o) ? SUPPLY_STORE : BANK_STORE) : BUILD_DEFS[type].store;
storageCap = function (k) {
  let n = BASE_CAP + 500 * repLv('rep-storage') + (S.debugCap || 0);   // debugCap: the Settings debug button's extra room
  for (const [p, list] of S.extras) if (owned(p)) for (const e of list) { const st = storeOf(e.type, ME); if (st && st[k]) n += st[k]; }
  return n;
};
aiStorage = function (N, k) {
  let n = BASE_CAP + 500 * aiRep(N, 'rep-storage');
  for (const [, e] of aiExtraList(N)) { const st = storeOf(e.type, N.id); if (st && st[k]) n += st[k]; }
  return n;
};
// Sacred Pyre (Pyromancy): 10 wood -> 20 gold every payout; a Grand Pyre 20 wood -> 50 gold. Only as many burn as you have living Warlocks.
const PYRE = [null, { wood: 10, gold: 20 }, { wood: 20, gold: 50 }];
BUILD_DEFS.pyre = { name: 'Sacred Pyre', variant: 0, cost: { wood: 200 }, upkeep: {}, tech: 'sacredpyre', race: 'swamp', blurb: 'Raised by a Warlock on a free building plot. Burns 10 wood every 10 s for 20 gold. Build it up into a Grand Pyre: 20 wood for 50 gold. One per living Warlock.',
  levels: ['Sacred Pyre', 'Grand Pyre'], ups: [null, { cost: { wood: 600 }, time: 60 }] };
SLOW_BUILD.add('pyre');   // 1 minute to build
const warlockCount = o => S.units.reduce((n, v) => n + (v.owner === o ? (v.kind === MAGE ? 1 : v.kind === 'army' ? (v.troops[MAGE] || 0) : 0) : 0), 0);
const pyreCount = o => { let n = 0; for (const [p, l] of S.extras) if (nationOf(p) === o) n += l.filter(e => e.type === 'pyre').length; return n + S.units.filter(u => u.owner === o && ((u.build && u.build.type === 'pyre') || (u.pending && u.pending.type === 'pyre'))).length; };
function pyrePayday() {
  if (!isSw(ME)) return;
  let left = warlockCount(ME);
  for (const [p, l] of S.extras) {
    if (!owned(p) || S.occ.has(p)) continue;
    for (const e of l) {
      if (e.type !== 'pyre' || left <= 0) continue;
      left--;
      const c = PYRE[e.level || 1]; if (S.stock.wood < c.wood) continue;
      S.stock.wood -= c.wood; S.stock.gold += c.gold;
      S.pops.push({ prov: p, t0: S.t, k: 'gold', n: c.gold, dx: 0 });
    }
  }
  clampStock();
}
const _payday = payday;
payday = function (t) { _payday(t); pyrePayday(); };

// ---------- where Swamplings may build ----------
const mtnCache = { seed: null, set: null };
function mountainBorder(p) {
  if (mtnCache.seed !== world.seed || !mtnCache.set) { const set = new Set(); for (const e of world.edges) if (e.style === 'mountains') { set.add(e.a); set.add(e.b); } mtnCache.seed = world.seed; mtnCache.set = set; }
  return mtnCache.set.has(p);
}
function raceBuildWhy(p, type, o) {
  const sw = isSw(o);
  if (type === 'pyre') { if (!sw) return 'Swamplings only'; const w = warlockCount(o), n = pyreCount(o); if (n >= w) return `One Sacred Pyre per living Warlock (${n}/${w})`; }
  if (!sw) return null;
  if (type === 'granary' || type === 'storehouse') return 'Swamplings don’t build these';
  if (type === 'stable' && !mountainBorder(p)) return 'An Ogre Cave needs a mountain border';
  if (type === 'temple' && world.provinces[p].terrain !== 'swamp') return 'Hot Springs only bubble up in a swamp';
  return null;
}
const _buildCheck = buildCheck;
buildCheck = function (p, type) {
  const why = _buildCheck(p, type);
  if (type === 'outpost') return why;
  if (why && !/^Need /.test(why)) return why;   // research, ownership and room come first; then the race's own rules; then the cost
  return raceBuildWhy(p, type, ME) || why;
};
const _aiBuildWhy = aiBuildWhy;
aiBuildWhy = function (N, p, type, self) { if (type === 'pyre') return 'no'; return (raceBuildWhy(p, type, N.id) ? 'race' : '') || _aiBuildWhy(N, p, type, self); };

// ---------- training ----------
const _trainable = trainable;
trainable = function (kind, prov) {
  if (kind === 'market') return isSw(ME) ? [THUG] : [];
  // Swamplings: Berserkers at the Barracks, Ogres at the Ogre Cave (no Barracks needed there)
  if (kind === 'stable') return isSw(ME) ? S.designs.filter(d => d.race === 'swamp' && d.type === 'cav').slice(0, 12).map(d => d.id) : [];
  if (kind !== 'barracks') return _trainable(kind, prov);
  const hasStable = !isSw(ME) && extrasIn(prov).some(e => e.type === 'stable');
  return S.designs.filter(d => (d.race || 'realm') === raceOf(ME) && (d.type === 'inf' || hasStable)).slice(0, 12).map(d => d.id);
};
const _selectPart = selectPart;
selectPart = function (p, part) { _selectPart(p, part); const ty = ptype(part); if ((ty === 'market' || ty === 'stable') && owned(p) && isSw(ME)) { S.selBuilding = p; S.selKind = ty; } };

// ---------- movement: swamp speed, Path of Fire, sneaking ----------
function speedMod(u) {
  let m = 1;
  if (u.pathFire && u.pathFire.until > S.t) m *= u.pathFire.mult;
  if (isSw(u.owner) && world && world.provinces[u.prov] && world.provinces[u.prov].terrain === 'swamp') m *= 1.2;
  return m;
}
// Swampstrider Stealth: no slowdown while sneaking through a swamp
const stealthFree = u => isSw(u.owner) && world.provinces[u.prov].terrain === 'swamp';

// ---------- art ----------
function settleArt(g, stage, t, look, race) { if (race === 'swamp') SwampBuild.drawSettlement(g, stage, t, look); else RealmBuild.drawSettlement(g, stage, t, look); }
function bldArt(g, type, idx, t, rise, race) { if (race === 'swamp' || type === 'pyre') SwampBuild.drawOnMap(g, type, idx, t, rise); else RealmBuildings.drawOnMap(g, type, idx, t, rise); }
const SW_ART = { 'pioneer:B': 'sw-pioneer', 'mason:A': 'sw-mason', 'mage:A': 'sw-mage' };
function swArtId(id, o) {
  if (!isSw(o) || typeof id !== 'string') return id;
  if (SW_ART[id]) return SW_ART[id];
  if (id.startsWith(MAGE + '#cast-')) return swCastId(id.slice(MAGE.length + 6));
  return id;
}
function drawUnitFor(g, id, o, moving, th, t, x, y, k) {
  RealmIso.POSE.running = !!moving;
  try { RealmIso.drawUnitAt(g, swArtId(id, o), th, t, x, y, k); } finally { RealmIso.POSE.running = false; }
}
function swCastId(sc) {
  const id = 'sw-mage#cast-' + sc, base = RealmIso.UNITS['sw-mage'];
  const U = RealmIso.UNITS[id] || (RealmIso.UNITS[id] = { unit: base.unit, name: base.name, title: base.title, spec: null });
  if (U.base !== base.spec) { U.base = base.spec; U.spec = { ...base.spec, castPose: SCHOOL_BOLT[sc] || '#ff7a2c' }; }
  return id;
}
const SW_MAGE0 = { ...RealmIso.UNITS['sw-mage'].spec };
const mageHands = gear => { const W = MAGE_WEAPONS[gear.weapon]; return { right: gear.weapon === 'stave' ? 'stave' : gear.weapon, left: !W.twoH && gear.shield && !isSw(ME) ? gear.shield : null }; };
function mageArtSpec(gear) { return isSw(ME) ? { ...SW_MAGE0, ...mageHands(gear) } : { ...MAGE_SPEC0, ...mageSpec(gear) }; }
const _registerMage = registerMage;
registerMage = function () { _registerMage(); RealmIso.UNITS['sw-mage'].spec = { ...SW_MAGE0, ...mageHands(S.mageGear) }; delete portraitURL[MAGE]; };
const _castUnitId = castUnitId;
castUnitId = function (u) { return isSw(u.owner) ? swCastId(schoolOf(u.owner)) : _castUnitId(u); };
// how a Swampling design looks: armor tints by line (Staghide, Wyvern-Scaled, Dragonbone); Berserkers crouch; Ogres are huge
function swampSpecFor(d) {
  const W = WEAPONS[d.weapon], A = ARMORS[d.armor], lv = A.level, tw = (ARMOR_TYPES[A.type] || {}).twin || 'leather', P = RealmIso.P;
  const o = { right: d.weapon, left: d.off && !W.twoH ? d.off : null, angS: 0.35, crouch: d.type !== 'cav', brows: 'angry' };
  if (tw === 'leather') Object.assign(o, { shirt: '#a07a4a', pants: '#6b5236', tabard: lv >= 2 ? '#7e5a3b' : null, tabardTrim: lv >= 4 ? '#efe6cf' : null, helm: lv >= 3 ? 'hood' : undefined, helmColor: '#7e5a3b', hoodTrim: '#efe6cf' });
  else if (tw === 'chain') Object.assign(o, { shirt: '#4f7a5a', sleeve: '#4f7a5a', mail: true, tabard: '#3a5a44', tabardTrim: lv >= 3 ? '#c9e08a' : null, pants: '#3a4a34', gloves: lv >= 2 ? '#3a5a44' : undefined });
  else Object.assign(o, { shirt: '#e8e0c8', sleeve: '#d8cfb4', armor: true, pauldrons: lv >= 2, tabard: '#b8352d', tabardTrim: lv >= 3 ? '#efe6cf' : null, pants: '#4a3a2a', boots: '#e8e0c8', gloves: '#d8cfb4' });
  // Ogres: on all fours, no shoulder plates or pointed ears, a huge long head with black eyes, huge fists
  if (d.type === 'cav') { const O = OGRES[d.horse || 'riding']; Object.assign(o, { skin: O.skin, moss: !!O.moss, gloves: O.fists || O.skin, sleeve: O.skin, crouch: false, angS: 0.45, ogreBody: true, noEars: true, blackEyes: true, glowEyes: '#1d1a22', bigHands: true, pauldrons: false, helm: undefined }); }
  void P;
  return RealmIso.swamp(o);
}

// ---------- the player's race: names, buildings and technologies shown in the interface ----------
const SW_TEXT = {
  units: { 'pioneer:B': ['Swampstrider', 'Scurries through fog on all fours and surveys land.'], 'mason:A': ['Swampwright', 'Raises outposts and mud-and-clay buildings.'], 'mage:A': ['Warlock', 'Casts the spells of your school. Joins an army to fight in it and power its battle spells.'] },
  builds: {
    stable: { name: 'Ogre Cave', note: 'trains Ogres · needs a mountain border', blurb: 'A cave in the mountainside where Ogres lair: trains Ogres (no Barracks needed). Needs a mountain border.' },
    market: { name: 'Thug Den', note: 'trains and houses Thugs', blurb: 'Trains Thugs and houses them (2, more with research). Each Thug inside makes 1 gold every 10 s; twice that with Highwaymen if the den borders another nation.' },
    bank: { name: 'Supply Cache', note: '+500 gold, wood and food storage', blurb: 'Raises the nation’s gold, wood and food storage by 500 each.' },
    magetower: { name: 'Warlock Tower', levels: ['Warlock Tower', 'Warlock Spire', 'Warlock Grand Spire'], blurb: 'Trains Warlocks, unlocks Magic research and adds 2 Magic points every 10 s. Upgrades to a Warlock Spire, then a Warlock Grand Spire.' },
    temple: { name: 'Hot Springs', note: '+2 Government research · swamp only', blurb: 'A steaming pool in the bog: adds 2 Government research points every payout. Only in a swamp.' },
    barracks: { note: 'trains Berserkers' },
    farm: { blurb: 'Beds of wild mushrooms. Swamplings farm swamps from the start.' }
  },
  techs: {
    autoscout: ['Automating Swampstriders', 'Idle Swampstriders survey explored, unsurveyed provinces on their own. Toggle it on a Swampstrider’s command card.'],
    bank: ['Building: Supply Cache', 'Unlocks the Supply Cache: +500 gold, wood and food storage each.'],
    market: ['Building: Thug Den', 'Unlocks the Thug Den: trains Thugs and houses 2 of them. Each Thug inside makes 1 gold every 10 s.'],
    stable: ['Building: Ogre Cave', 'Unlocks the Ogre Cave (needs a mountain border), which trains Ogres.'],
    magetower: ['Building: Warlock Tower', 'Unlocks the Warlock Tower, which trains Warlocks and opens Magic research. Your first tower lets you choose a school of magic.'],
    walls2: ['Spiked Walls', 'Walls are bristling with spikes, and existing palisades are rebuilt: three times as strong.'],
    traderoutes: ['Highwaymen', 'Thugs make twice as much gold when their Thug Den borders another nation.'],
    stealth: ['Swampstrider Stealth', 'Swampstriders can sneak: three times slower (but no slower at all in a swamp), and enemy armies can’t see them. Without it, an enemy army that finds a Swampstrider kills him.'],
    farsight: ['Far-Seeing Swampstriders', 'Swampstriders see into every province next to the one they stand in, and every unexplored province they look into is explored for good.'],
    horde: ['The Horde', 'An army of 10 or more Ogres and no other units has 1.3 times the health. A horseshoe over the army shows when it is active.'],
    'horse-breeding': ['Ogre Breeding', 'Needs Building: Ogre Cave (Government). Ogres can be Swampfeet (fastest, frail) or Mossback (cheap to feed, at home in forest and swamp, weak blow).'],
    'horse-training': ['Ogre Training', 'Unlocks Bloodknuckle Ogres (the hardest blows) and Leviathan Ogres (toughest, but slow and hungry).'],
    sanctum: ['Warlock Spire', 'Lets a Warlock Tower be upgraded to a Warlock Spire (Magic Tier II).'],
    arcanum: ['Warlock Grand Spire', 'Lets a Warlock Spire be upgraded to a Warlock Grand Spire (Magic Tier III).'],
    apprentice: ['Apprentice', 'Your Warlock limit rises by 1: you can train a second Warlock.'],
    forge: [null, 'Unlocks the Forge, which opens Military research. Owning a Barracks makes this technology 50% more likely to be offered.'],
    earthquake: [null, 'A Warlock standing in an enemy province your army occupies can cast an Earthquake: after 2 minutes every building in that province is destroyed, and every wall on its borders.'],
    mushroom: [null, 'Swamplings know this from the start: mushroom beds in swamps.']
  },
  reps: { 'rep-trade': ['Thug Guilds', 'Thug Dens make 5% more gold.'], 'rep-sword': ['Axe Mastery', 'Axes deal 5% more damage.'], 'rep-horsespeed': ['Swift Ogres', 'Ogres run 5% faster.'], 'rep-cavhp': ['Hardy Ogres', 'Ogres have 5% more health.'], 'rep-magecap': ['Warlock Academy', 'Raises the Warlock limit by 1.'], 'rep-masons': ['Swampwrights’ Lodge', 'Raises the Swampwright limit by 1.'], 'rep-wayfinders': ['Swampstriders’ Pack', 'Raises the Swampstrider limit by 1.'] },
  trees: { mag: { locked: 'Research the Warlock Tower (Government Tier II), then build one to unlock Magic.', rate: 'Warlock Tower +2, Spire +4, Grand Spire +6 per payout', tiers: ['Warlock Tower', 'Warlock Spire', 'Warlock Grand Spire'] }, gov: { rate: 'Forts +2, Capital +3, Hot Springs +2 per payout (outposts give none)' } }
};
const ORIG = { saved: false };
function saveOrig() {
  if (ORIG.saved) return; ORIG.saved = true;
  ORIG.units = {}; for (const k of Object.keys(SW_TEXT.units)) ORIG.units[k] = { name: UNIT_DEFS[k].name, blurb: UNIT_DEFS[k].blurb };
  ORIG.builds = {}; for (const k of Object.keys(SW_TEXT.builds)) ORIG.builds[k] = { ...BUILD_DEFS[k], levels: BUILD_DEFS[k].levels && BUILD_DEFS[k].levels.slice() };
  ORIG.techs = {}; for (const k of Object.keys(SW_TEXT.techs)) { const x = TECH_BY_ID[k]; ORIG.techs[k] = [x.name, x.blurb]; }
  ORIG.trees = {}; for (const k of Object.keys(SW_TEXT.trees)) ORIG.trees[k] = { ...TECH_TREES[k], tiers: TECH_TREES[k].tiers.slice() };
  ORIG.base = { inf: UNIT_BASE.inf.name, cav: UNIT_BASE.cav.name };
  ORIG.buildOrder = BUILD_ORDER.slice();
  ORIG.horde = HORDE_TXT;
}
var HORDE_TXT = null;
function applyRace(race) {
  saveOrig();
  RACE[ME] = race;
  const sw = race === 'swamp';
  for (const [k, o] of Object.entries(ORIG.units)) Object.assign(UNIT_DEFS[k], o, sw ? { name: SW_TEXT.units[k][0], blurb: SW_TEXT.units[k][1] } : {});
  for (const [k, o] of Object.entries(ORIG.builds)) { const d = BUILD_DEFS[k]; for (const f of ['name', 'note', 'blurb', 'levels']) { if (o[f] === undefined) delete d[f]; else d[f] = Array.isArray(o[f]) ? o[f].slice() : o[f]; } if (sw) Object.assign(d, SW_TEXT.builds[k]); }
  if (sw) { delete BUILD_DEFS.market.gives; BUILD_DEFS.bank.store = { ...SUPPLY_STORE }; } else { BUILD_DEFS.market.gives = { ...MARKET_GIVES }; BUILD_DEFS.bank.store = { ...BANK_STORE }; }
  for (const [k, [n, b]] of Object.entries(ORIG.techs)) { const x = TECH_BY_ID[k], s2 = sw && SW_TEXT.techs[k]; x.name = s2 && s2[0] || n; x.blurb = s2 && s2[1] || b; }
  for (const x of TECHS) if (x.rep) { const s2 = SW_TEXT.reps[x.id]; x.swName = s2 && s2[0]; x.swBlurb = s2 && s2[1]; }
  for (const [k, o] of Object.entries(ORIG.trees)) { Object.assign(TECH_TREES[k], o, { tiers: o.tiers.slice() }); if (sw) Object.assign(TECH_TREES[k], SW_TEXT.trees[k]); }
  UNIT_BASE.inf.name = sw ? 'Berserkers' : ORIG.base.inf; UNIT_BASE.cav.name = sw ? 'Ogres' : ORIG.base.cav;
  // the Mason's buildings: no Granary or Storehouse for Swamplings, and the Sacred Pyre (Pyromancy) for them alone
  BUILD_ORDER.length = 0; for (const k of ORIG.buildOrder) if (!(sw && (k === 'granary' || k === 'storehouse'))) BUILD_ORDER.push(k);   // (the Sacred Pyre is raised by a Warlock, not a Swampwright)
  CMD[MASON] = ['outpost', ...BUILD_ORDER].map((type, i) => ({ id: 'build:' + type, cell: i, key: type === 'outpost' ? 'Q' : '' })).concat(sw ? [] : [{ id: 'road', cell: 13, key: '' }], [{ id: 'cancelbuild', cell: 14, key: '' }, { id: 'dismiss', cell: 15, key: '' }]);
  // Swamplings know Mushroom Farming from the start
  if (sw && !S.tech.gov.done.includes('mushroom')) S.tech.gov.done.push('mushroom');
  if (!sw) S.tech.gov.done = S.tech.gov.done.filter(id => id !== 'mushroom');
  // forget a race's options that don't belong to the other
  for (const t of TREE_KEYS) { const st = S.tech[t]; st.opts = st.opts.filter(id => techFor(TECH_BY_ID[id], race)); if (st.cur && !techFor(TECH_BY_ID[st.cur], race)) st.cur = null; if (t === 'gov') drawOptions('gov'); }
  if (!S.designs.some(d => d.id === armSel && (d.race || 'realm') === race)) { armSel = footmanOf(ME); draft = null; }
  registerMage();
  for (const k in portraitURL) delete portraitURL[k];
  armKey = ''; cmdKey = ''; techKey = ''; techBtnKey = ''; rosterKey = ''; provKey = ''; capPanelKey = '';
  document.body.classList.toggle('race-swamp', sw);
  S.spyres = []; S.ftraps = []; S.trapBooms = [];
}

// ---------- Pyromancy: Fiery Weapons, Scouting Pyre, Fire Trap, Path of Fire (the Sacred Pyre is a building, above) ----------
const FIERY = [0, { pct: 0.05, cd: 300 }, { pct: 0.10, cd: 180 }, { pct: 0.15, cd: 90 }];
const FIRE_TRAP = [0, 3, 6, 9];                       // Footmen's worth of damage
const PATH_FIRE = [null, { mult: 2, dur: 10 }, { mult: 2.25, dur: 15 }, { mult: 2.5, dur: 20 }];
const SPYRE = { wood: 50, dur: 120, cd: 60 }, PATH_CD = 60;
S.spyres = []; S.ftraps = [];
const perWarlockCd = (c, base) => base / Math.max(1, magesIn(c));   // a caster with several Warlocks can cast more often
AUTO.fiery = { line: 'fiery', name: () => TECH_BY_ID[lineTech('fiery')].name };
CAST.spyre = { name: () => 'Scouting Pyre', line: 'spyre', instant: true,
  why: c => cdLeft('spyre' + c.id) > 0 ? `Ready in ${Math.ceil(cdLeft('spyre' + c.id))} s` : S.stock.wood < SPYRE.wood ? `Need ${SPYRE.wood} wood` : null,
  go(c) { S.stock.wood -= SPYRE.wood; S.spyres.push({ prov: c.prov, owner: ME, t0: S.t, until: S.t + SPYRE.dur }); S.cd['spyre' + c.id] = S.t + perWarlockCd(c, SPYRE.cd); computeFog(); toast(`A Scouting Pyre blazes up in ${provName(c.prov)}: for 2 minutes it sees every neighboring province in its line of sight.`); } };
CAST.ftrap = { name: () => TECH_BY_ID[lineTech('ftrap')].name, line: 'ftrap', instant: true,
  why: c => S.ftraps.some(x => x.owner === ME && x.prov === c.prov) ? 'A fire trap is already set here' : S.ftraps.filter(x => x.owner === ME).length >= warlockCount(ME) ? `One trap per Warlock (${S.ftraps.filter(x => x.owner === ME).length}/${warlockCount(ME)})` : null,
  go(c) { const lv = lvl('ftrap'); S.ftraps.push({ prov: c.prov, owner: ME, lv, t0: S.t, ignore: S.units.filter(v => v.kind === 'army' && v.prov === c.prov && hostile(v.owner, ME)).map(v => v.id) }); toast(`${TECH_BY_ID[lineTech('ftrap')].name} set in ${provName(c.prov)}. The next enemy army to enter is engulfed: enough fire to kill ${FIRE_TRAP[lv]} Footmen.`); } };
CAST.pfire = { name: () => TECH_BY_ID[lineTech('pfire')].name, line: 'pfire', instant: true,
  target: c => c.kind === 'army' ? c : S.units.find(v => v.kind === 'army' && v.owner === ME && v.prov === c.prov && !v.battle) || c,
  why: c => cdLeft('pfire' + c.id) > 0 ? `Ready in ${Math.ceil(cdLeft('pfire' + c.id))} s` : null,
  go(c) { const P = PATH_FIRE[lvl('pfire')], a = CAST.pfire.target(c); for (const u of a === c ? [c] : [a, c]) u.pathFire = { until: S.t + P.dur, mult: P.mult, t0: S.t }; S.cd['pfire' + c.id] = S.t + perWarlockCd(c, PATH_CD); toast(`${TECH_BY_ID[lineTech('pfire')].name}: ${a.name} runs ${Math.round((P.mult - 1) * 100)}% faster for ${P.dur} s.`); } };
SPELL_CELLS.push('spyre', 'ftrap', 'pfire');
// a lone Warlock who knows Sacred Pyre gets a button to raise one where he stands
{ const mageCmd = Object.getOwnPropertyDescriptor(CMD, MAGE).get; Object.defineProperty(CMD, MAGE, { configurable: true, get() { const list = mageCmd.call(CMD); return isSw(ME) && hasTech('sacredpyre') ? list.concat([{ id: 'pyrebuild', cell: 13, key: '' }]) : list; } }); }
// Axes' critical strikes: how many blows a group of soldiers lands, counting each critical twice
function critBlows(n, chance) { if (!chance || !n) return n; let c = 0; for (let i = 0; i < n; i++) if (Math.random() < chance) c++; return n + c; }
const _onBattleJoin = onBattleJoin;
onBattleJoin = function (a, t) {
  _onBattleJoin(a, t);
  a.fiery = 0;
  if (!isCaster(a)) return;
  const lv = lvl('fiery');
  if (lv && autoOn(a, 'fiery') && (a.fieryCd || 0) <= t) { a.fiery = FIERY[lv].pct; a.fieryCd = t + FIERY[lv].cd; toast(`${a.name}: ${TECH_BY_ID[lineTech('fiery')].name} (${Math.round(FIERY[lv].pct * 100)}% chance of double blows).`); }
};
const _onBattleEnd = onBattleEnd;
onBattleEnd = function (a, t) { _onBattleEnd(a, t); a.fiery = 0; };
// a Scouting Pyre sees its province and every neighbor through open borders (its line of sight)
function pyreSight(vis) { for (const P of S.spyres || []) if (P.owner === ME && P.until > S.t) { vis.add(P.prov); for (const { q } of openNbr[P.prov]) vis.add(q); } }
function stepPyromancy(t) {
  const before = S.spyres.length; S.spyres = S.spyres.filter(P => P.until > t); if (S.spyres.length !== before) computeFog();
  for (const T of S.ftraps.slice()) {
    // only an army that enters after the trap was set springs it (one already standing there has to leave and come back)
    if (T.ignore && T.ignore.length) T.ignore = T.ignore.filter(id => S.units.some(v => v.id === id && v.prov === T.prov));
    const foe = S.units.find(v => v.kind === 'army' && v.prov === T.prov && hostile(v.owner, T.owner) && troopCount(v) > 0 && !v.retreating && !(T.ignore || []).includes(v.id));
    if (!foe) continue;
    S.ftraps = S.ftraps.filter(x => x !== T);
    const killed = burnArmy(foe, FIRE_TRAP[T.lv] * arrowDmg());   // arrowDmg: exactly what it takes to bring down one Footman
    S.trapBooms = (S.trapBooms || []).concat([{ x: foe.x, y: foe.y, t0: t, prov: T.prov }]);
    if (T.owner === ME) toast(`Your fire trap in ${provName(T.prov)} engulfs ${foe.name || 'an enemy army'}: ${killed} soldier${killed === 1 ? '' : 's'} burned.`);
    else if (foe.owner === ME) toast(`${foe.name} walks into a fire trap in ${provName(T.prov)}: ${killed} soldier${killed === 1 ? '' : 's'} lost.`, true);
  }
  for (const u of S.units) if (u.pathFire && u.pathFire.until <= t) u.pathFire = null;
  stepThugs();
}
// fire damage: kills the frailest soldiers first, as many as the damage pays for
function burnArmy(a, dmg) {
  let killed = 0;
  const kinds = Object.keys(a.troops).filter(k => a.troops[k] > 0).sort((x, y) => hpOf(a, x) - hpOf(a, y));
  for (const k of kinds) while (a.troops[k] > 0) { const st = statsOf(k, a.owner), cost = hpOf(a, k) / Math.max(0.05, (1 - st.red) * (1 - (st.parry || 0))); if (dmg < cost * 0.99) break; dmg -= cost; a.troops[k]--; killed++; }
  for (const k of Object.keys(a.troops)) if (!a.troops[k]) delete a.troops[k];
  if (troopCount(a) <= 0) removeArmy(a);
  if (a.owner === ME) computeIncome();
  return killed;
}
function drawPyromancy(g, t) {
  for (const P of S.spyres) {
    if (!S.visible.has(P.prov)) continue;
    const c = G.provs[P.prov].ic, x = c[0] + 70, y = c[1] + 60, left = Math.max(0, (P.until - S.t) / SPYRE.dur);
    g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineCap = 'round';
    for (const [a, b] of [[-14, -4], [14, -4], [-10, 4], [10, 4]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(-a * 0.2, b - 22); g.lineWidth = 6; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3.4; g.strokeStyle = '#8a5a34'; g.stroke(); }
    const fl = 1 + Math.sin(t * 11) * 0.12, gl = g.createRadialGradient(0, -26, 0, 0, -26, 60); gl.addColorStop(0, 'rgba(255,150,60,0.55)'); gl.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, -26, 60, 0, 7); g.fill();
    g.beginPath(); g.moveTo(-12, -18); g.lineTo(-6, -42 * fl); g.lineTo(0, -30); g.lineTo(5, -52 * fl); g.lineTo(12, -18); g.closePath(); g.fillStyle = '#ff7a2c'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.moveTo(-6, -18); g.lineTo(0, -34 * fl); g.lineTo(6, -18); g.fillStyle = '#ffe27a'; g.fill();
    if (P.owner === ME) { g.beginPath(); g.arc(0, -66, 9, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); g.lineWidth = 4; g.strokeStyle = '#ff7a2c'; g.stroke(); }
    g.restore();
  }
  for (const T of S.ftraps) {
    if (T.owner !== ME || !S.explored.has(T.prov)) continue;
    const c = G.provs[T.prov].ic; g.save(); g.translate(c[0] - 60, c[1] + 120); g.scale(1, 0.5); g.rotate(t * 0.4);
    g.beginPath(); g.arc(0, 0, 24, 0, 7); g.lineWidth = 4; g.strokeStyle = `rgba(255,110,40,${(0.55 + Math.sin(t * 3) * 0.25).toFixed(2)})`; g.setLineDash([7, 6]); g.stroke(); g.setLineDash([]);
    for (let k = 0; k < 3; k++) { const q = k * 2.09; g.beginPath(); g.moveTo(Math.cos(q) * 10, Math.sin(q) * 10); g.lineTo(Math.cos(q) * 22, Math.sin(q) * 22); g.lineWidth = 3; g.strokeStyle = '#ffb347'; g.stroke(); }
    g.restore();
  }
  S.trapBooms = (S.trapBooms || []).filter(b => S.t - b.t0 < 2);
  for (const b of S.trapBooms) {
    if (!S.visible.has(b.prov)) continue;
    const f = (S.t - b.t0) / 2; g.save(); g.globalAlpha = 1 - f;
    const gr = g.createRadialGradient(b.x, b.y - 20, 0, b.x, b.y - 20, 90 * (0.4 + f)); gr.addColorStop(0, '#fff3a6'); gr.addColorStop(0.4, '#ff7a2c'); gr.addColorStop(1, 'rgba(200,40,20,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y - 20, 90 * (0.4 + f), 0, 7); g.fill(); g.restore();
  }
  // Path of Fire: flames licking at a running army's heels
  for (const u of S.units) {
    if (!u.pathFire || u.pathFire.until <= S.t || !S.visible.has(u.prov)) continue;
    const K = UKK;
    for (let k = 0; k < 5; k++) { const f = (t * 1.8 + k / 5) % 1, x = u.x + (k - 2) * 9 * K, y = u.y + 4 * K - f * 26 * K; g.globalAlpha = 0.85 * (1 - f); g.fillStyle = k % 2 ? '#ff7a2c' : '#ffd34d'; g.beginPath(); g.ellipse(x, y, 4 * K * (1 - f * 0.5), 7 * K * (1 - f * 0.5), 0, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }
}
const _drawMagic = drawMagic;
drawMagic = function (g, t) { _drawMagic(g, t); drawPyromancy(g, t); };

// ---------- command card: Thugs going in and out of their dens; no roads for Swamplings ----------
const thugIcon = () => portrait(THUG);
const _extraCmdInfo2 = extraCmdInfo;
extraCmdInfo = function (id) {
  if (id === 'thugin') {
    const ts = S.selected.filter(v => v.kind === THUG), dens = myDens(), room = dens.reduce((n, d) => n + Math.max(0, denCap(ME) - (d.e.thugs || 0)), 0);
    return { name: 'Enter Thug Den', desc: `The Thug goes into a Thug Den${ts.some(u => denRoomIn(u.prov)) ? ' here' : ' (the nearest with room)'} and makes 1 gold every 10 s from inside. Dens hold ${denCap(ME)} Thugs each; ${room} place${room === 1 ? '' : 's'} free.`, cost: null, why: !ts.length ? 'No Thug selected' : !room ? 'Every Thug Den is full' : null, ok: 'Click to go in', icon: buildThumb('market') };
  }
  if (id === 'thugout') {
    const e = extraAt(S.selBuilding, S.selPart);
    return { name: 'Release a Thug', desc: `A Thug steps out of the den (${e ? e.thugs || 0 : 0}/${denCap(ME)} inside). Thugs out on the street make no gold.`, cost: null, why: !e || !(e.thugs > 0) ? 'No Thugs inside' : null, ok: 'Click to release one', icon: thugIcon() };
  }
  if (id === 'pyrebuild') {
    const m = S.selected.find(v => v.kind === MAGE && v.owner === ME), d = BUILD_DEFS.pyre;
    const why = !m ? 'Select a Warlock standing on his own (detach him from his army first)' : m.build ? 'He is already raising a pyre' : m.battle ? 'Not during battle' : buildCheck(m.prov, 'pyre');
    const left = m && m.build ? ` ${Math.ceil(m.build.dur - (S.t - m.build.t0))} s left.` : '';
    return { name: m && m.build ? 'Raising a Sacred Pyre' : 'Raise a Sacred Pyre', desc: `The Warlock raises a Sacred Pyre on a free building plot in this province: it burns ${PYRE[1].wood} wood every 10 s for ${PYRE[1].gold} gold (a Grand Pyre: ${PYRE[2].wood} for ${PYRE[2].gold}). One per living Warlock. Takes ${buildTime('pyre')} s; moving stops it and refunds the wood.${left}`, cost: d.cost, why: m && m.build ? null : why, ok: m && m.build ? 'Click to stop and get the wood back' : 'Click to raise it here', icon: buildThumb('pyre') };
  }
  if (id === 'road' && isSw(ME)) return { name: 'Roads', desc: 'Swamplings don’t build roads.', cost: null, why: 'Not for Swamplings', icon: xIcon('road') };
  return _extraCmdInfo2(id);
};
const _extraCmdUse2 = extraCmdUse;
extraCmdUse = function (id) {
  if (id === 'thugin') { thugsEnter(S.selected.filter(v => v.kind === THUG)); return true; }
  if (id === 'thugout') { thugOut(); return true; }
  if (id === 'pyrebuild') {
    const m = S.selected.find(v => v.kind === MAGE && v.owner === ME); if (!m) return true;
    if (m.build) { cancelBuild(m); toast('The pyre is abandoned: wood refunded.'); cmdKey = ''; return true; }
    const why = extraCmdInfo('pyrebuild').why; if (why) { toast('Can’t raise a Sacred Pyre: ' + why + '.', true); return true; }
    if (m.moving) haltUnit(m);
    if (m.cast) cancelCast(m);
    beginExtra(m, 'pyre'); cmdKey = ''; return true;
  }
  return _extraCmdUse2(id);
};

// ---------- the Armory's off-hand row (Swamplings carry no shields; with Dual Wielding a second one-handed weapon) ----------
function offhandRow(d, W) {
  const locked = !hasTech('dualwield') ? 'Research Dual Wielding (Military)' : W.twoH ? W.name + ' needs both hands' : null;
  const opts = famsFor('swamp').flatMap(f => FAMILY[f].order).filter(k => !WEAPONS[k].twoH);
  return `<div class="ar-row"><span class="ar-rl">Off hand<small>${locked || 'A second one-handed weapon: half its attack'}</small></span><div class="ar-eqs"><button type="button" class="ar-eq${!d.off || W.twoH ? ' on' : ''}" data-eq="off:none"><span class="ar-none">—</span><span>None</span></button>${opts.map(k => equipButton('off', k, WEAPONS[k], d.off === k && !W.twoH, locked || lockWhy(WEAPONS[k]))).join('')}</div></div>`;
}

// ---------- AI Swamplings ----------
const swFamily = (rc, f) => rc === 'swamp' && f === 'sword' ? 'axe' : f;
const swArmorLine = (rc, a) => rc === 'swamp' ? ({ leather: 'stag', chain: 'wyvern', plate: 'dragon' }[a] || 'stag') : a;
const swSchool = (rc, s, r) => rc === 'swamp' && s === 'life' ? ['death', 'arcane', 'pyro'][Math.floor(r() * 3)] : s;
AI_MAGIC_PREFS.pyro = { sacredpyre: 20, fiery1: 12, fiery2: 10, fiery3: 8, pathfire: 6, firetrap: 6, scoutpyre: 4 };
const _aiRedesign = aiRedesign;
aiRedesign = function (N) {
  if (N.race !== 'swamp') return _aiRedesign(N);
  const fam = FAMILY[N.family] || FAMILY.axe, weapon = fam.order.filter(w => !WEAPONS[w].tech || aiHas(N, WEAPONS[w].tech)).pop();
  let armor = 'stag1';
  for (let lv = 4; lv >= 1; lv--) { const id = N.armorLine + lv, A = ARMORS[id]; if (A && (!A.tech || aiHas(N, A.tech))) { armor = id; break; } }
  const off = aiHas(N, 'dualwield') && !WEAPONS[weapon].twoH ? weapon : null;
  const cavW = FAMILY.blunt.order.filter(w => !WEAPONS[w].tech || aiHas(N, WEAPONS[w].tech)).pop();
  const horse = aiHas(N, 'horse-training') ? 'friesian' : aiHas(N, 'horse-breeding') ? 'mongolian' : 'riding';
  const sig = [weapon, armor, off, cavW, horse].join('|'); if (sig === N.designSig) return; N.designSig = sig; N.dv++;
  const role = { pole: 'Spear Berserker', axe: 'Axe Berserker', blunt: 'Club Berserker' }[N.family] || 'Berserker';
  const inf = { id: `ai${N.id}i${N.dv}`, name: role, type: 'inf', weapon, shield: null, off, armor, horse: null, race: 'swamp' };
  const cav = { id: `ai${N.id}c${N.dv}`, name: OGRES[horse].name, type: 'cav', weapon: cavW, shield: null, off: null, armor, horse, race: 'swamp' };
  registerDesign(inf); registerDesign(cav);
  N.design = { inf: inf.id, cav: cav.id };
};

// AI Pyromancers keep Sacred Pyres burning (counted as income: one per Warlock, at most two)
const _aiIncome = aiIncome;
aiIncome = function (N) {
  const inc = _aiIncome(N);
  if (N.race === 'swamp' && N.school === 'pyro' && aiHas(N, 'sacredpyre')) { const n = Math.min(2, aiMages(N)); inc.gold += PYRE[1].gold * n; inc.wood -= PYRE[1].wood * n; }
  return inc;
};

// ---------- every frame ----------
function stepSwamp(t) { if (!S.started) return; stepPyromancy(t); }

// ---------- technology pictures for the Swamplings' own and renamed technologies ----------
SW_ICONS = (() => {
  const disc = (g, c) => ICO.disc(g, c);
  const hutIco = (g, wall = '#8b6a45', roof = '#9a8048') => { ICO.poly(g, [[16, 56], [16, 34], [48, 34], [48, 56]], wall); ICO.poly(g, [[10, 36], [32, 10], [54, 36]], roof); ICO.poly(g, [[27, 56], [27, 44], [37, 44], [37, 56]], '#2a2420', 2); };
  const flameIco = (g, x = 32, y = 54, s = 1) => { ICO.poly(g, [[x - 14 * s, y], [x - 8 * s, y - 26 * s], [x - 2 * s, y - 16 * s], [x + 4 * s, y - 38 * s], [x + 14 * s, y]], '#ff7a2c', 2.4); ICO.poly(g, [[x - 6 * s, y], [x, y - 18 * s], [x + 6 * s, y]], '#ffe27a', 1.6); };
  const tier = (g, n) => ICO.roman(g, ['', 'I', 'II', 'III'][n], 50, 56);
  const thugIco = g => { ICO.disc(g, '#e9dcc0'); g.beginPath(); g.ellipse(32, 30, 15, 14, 0, 0, 7); g.fillStyle = '#6f9e45'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); ICO.poly(g, [[16, 28], [32, 8], [48, 28]], '#3b3330'); for (const x of [26, 38]) { g.beginPath(); g.arc(x, 31, 2.6, 0, 7); g.fillStyle = '#ff3b2f'; g.fill(); } ICO.poly(g, [[22, 38], [42, 38], [40, 46], [24, 46]], '#6f9e45', 2.2); };
  return {
    'school-pyro'(g) { disc(g, '#ffe6da'); flameIco(g); },
    fiery1(g) { itemIcon(g, 'handaxe'); flameIco(g, 46, 30, 0.5); tier(g, 1); }, fiery2(g) { itemIcon(g, 'handaxe'); flameIco(g, 46, 30, 0.5); tier(g, 2); }, fiery3(g) { itemIcon(g, 'handaxe'); flameIco(g, 46, 30, 0.5); tier(g, 3); },
    scoutpyre(g) { disc(g, '#ffe6da'); for (const [a, b] of [[14, 58], [50, 58]]) ICO.line(g, [a, b], [32, 34], '#8a5a34', 4); flameIco(g, 32, 40, 0.7); g.beginPath(); g.moveTo(8, 20); g.quadraticCurveTo(32, 4, 56, 20); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); },
    firetrap(g) { g.beginPath(); g.ellipse(32, 46, 24, 10, 0, 0, 7); g.fillStyle = '#6e5134'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); flameIco(g, 32, 46, 0.6); tier(g, 1); },
    blazetrap(g) { SW_ICONS.firetrap(g); tier(g, 2); }, molttrap(g) { g.beginPath(); g.ellipse(32, 46, 24, 10, 0, 0, 7); g.fillStyle = '#c8473d'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); flameIco(g, 32, 46, 0.8); tier(g, 3); },
    sacredpyre(g) { for (let k = 0; k < 4; k++) ICO.line(g, [14 + k * 2, 56 - k * 6], [50 - k * 2, 56 - k * 6], '#8a5a34', 5); flameIco(g, 32, 34, 0.8); ICO.roman(g, '$', 52, 18); },
    pathfire(g) { ICO.line(g, [8, 46], [56, 46], '#c9a46b', 8); flameIco(g, 22, 44, 0.5); flameIco(g, 40, 44, 0.6); tier(g, 1); }, pathflame(g) { SW_ICONS.pathfire(g); tier(g, 2); }, pathinferno(g) { SW_ICONS.pathfire(g); tier(g, 3); },
    dualwield(g) { g.save(); itemIcon(g, 'handaxe'); g.restore(); g.save(); g.translate(64, 0); g.scale(-1, 1); itemIcon(g, 'handaxe'); g.restore(); },
    thugs2(g) { thugIco(g); ICO.roman(g, '+1', 50, 56); }, thugs3(g) { thugIco(g); ICO.roman(g, '+2', 50, 56); },
    market(g) { hutIco(g, '#6e5134', '#6f5a32'); g.beginPath(); g.arc(46, 22, 7, 0, 7); g.fillStyle = '#efe6cf'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); },
    bank(g) { for (const [x, y, c] of [[20, 50, '#b59a6a'], [38, 50, '#c9a46b'], [29, 36, '#9a7f52']]) { g.beginPath(); g.ellipse(x, y, 10, 9, 0, 0, 7); g.fillStyle = c; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); } ICO.roman(g, '+500', 32, 18); },
    stable(g) { ICO.poly(g, [[6, 58], [14, 30], [28, 12], [44, 18], [58, 58]], '#7e8279'); ICO.poly(g, [[22, 58], [22, 40], [32, 32], [42, 40], [42, 58]], '#2a2420', 2); for (const x of [28, 36]) { g.beginPath(); g.arc(x, 44, 2.2, 0, 7); g.fillStyle = '#ff3b2f'; g.fill(); } },
    magetower(g) { ICO.poly(g, [[22, 58], [24, 26], [40, 26], [42, 58]], '#8b6a45'); ICO.poly(g, [[26, 28], [32, 14], [38, 28]], '#3a2a30'); flameIco(g, 32, 16, 0.35); },
    walls2(g) { for (let x = 10; x <= 54; x += 9) ICO.poly(g, [[x - 4, 56], [x - 4, 24], [x, 10], [x + 4, 24], [x + 4, 56]], '#8a6038', 2.2); ICO.line(g, [6, 40], [58, 40], '#5e4128', 3); },
    traderoutes(g) { thugIco(g); g.beginPath(); g.arc(50, 50, 8, 0, 7); g.fillStyle = '#f4c44f'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); },
    'horse-breeding'(g) { ogreIcon(g, OGRES.arabian); }, 'horse-training'(g) { ogreIcon(g, OGRES.friesian); }
  };
})();

// stepSwamp runs every frame through the error-proof update loop
const _stepGPC = stepGPC;
stepGPC = function (t, dt) { _stepGPC(t, dt); try { stepSwamp(t); } catch (e) { reportError(e, 'swamp'); } };
// ---------- debug buttons in Settings (for testing): reveal the whole map; +2000 of each resource ----------
function syncDebugBtns() { const b = $q('#dbgReveal'); if (b) { b.setAttribute('aria-pressed', S.reveal ? 'true' : 'false'); b.querySelector('span').textContent = 'Reveal map: ' + (S.reveal ? 'On' : 'Off'); } }
$q('#dbgReveal').addEventListener('click', e => {
  e.stopPropagation(); if (!S.started) return toast('Start a game first.', true);
  S.reveal = !S.reveal; S.sig = ''; computeFog(); fogDirty = true; miniDirty = true; cacheDirty = true; syncDebugBtns();
  toast(S.reveal ? 'Debug: the whole map is revealed.' : 'Debug: the fog is back.');
});
$q('#dbgRes').addEventListener('click', e => {
  e.stopPropagation(); if (!S.started) return toast('Start a game first.', true);
  S.debugCap = (S.debugCap || 0) + 2000;
  for (const k of RES) S.stock[k] += 2000;
  computeIncome(); capPanelKey = ''; cmdKey = ''; barKey = '';
  toast('Debug: +2000 gold, wood and food (storage raised by 2000 each to hold it).');
});
$q('#dbgTech').addEventListener('click', e => {
  e.stopPropagation(); if (!S.started) return toast('Start a game first.', true);
  const race = raceOf(ME);
  let sc = currentSchool();
  if (!sc) { sc = Object.keys(SCHOOLS).find(k => schoolOk(k, race)); S.tech.mag.done.push('school-' + sc); closeSchoolPopup(); }
  let n = 0;
  for (const x of TECHS) {
    if (x.rep || x.id === 'abandon' || !techFor(x, race)) continue;
    if (x.tree === 'mag' && (x.id.startsWith('school-') || (x.school && x.school !== '*' && x.school !== sc))) continue;
    const st = S.tech[x.tree]; if (st.done.includes(x.id)) continue;
    st.done.push(x.id); n++;
  }
  for (const t of TREE_KEYS) { const st = S.tech[t]; if (st.cur && st.done.includes(st.cur)) { st.cur = null; st.prog = 0; } st.opts = st.opts.filter(id => !st.done.includes(id)); if (st.tier) drawOptions(t); }
  repVer++; computeIncome(); clampStock(); registerMage();
  techKey = ''; techBtnKey = ''; cmdKey = ''; armKey = ''; provKey = ''; capPanelKey = ''; rosterKey = ''; barKey = '';
  toast(`Debug: ${n} technologies researched (Magic school: ${SCHOOLS[sc].name}).`);
});
window.__swamp = { RACE, raceOf, isSw, applyRace, denCap, thugGold, swampTax, mountainBorder, warlockCount, pyreCount, S_spyres: () => S.spyres, burnArmy, speedMod };
