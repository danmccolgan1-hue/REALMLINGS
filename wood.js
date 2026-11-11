
// ================= Woodlings: the third race (v90, phase 1 of 3) =================
// Tall, graceful forest folk. RACE[o] === 'wood'. They start in a forest, are tougher (+20% armor) and quicker (+10% speed)
// there, and their Scouts slip through borders of trees. No shields, no roads, no Necromancy; thrusting swords and their own
// armor names (Spiritweave, Mithril, Ornate). Phase 2a (v91) gave them their own figures, townsfolk, tree houses and settlements
// (woodbld.js); phase 2b (v92) their province buildings; phase 3 (v93) their Champions, two-handing,
// Elemental magic and the lost-travelers event (the second half of this file).
RACE_NAME.wood = 'Woodlings';
function isWd(o) { return !!RACE && RACE[o] === 'wood'; }
techFor = function (x, race) { return raceIs(x.race, race); };
SCHOOLS.life.race = ['realm', 'wood'];
SCHOOLS.death.race = ['realm', 'swamp'];
REP_FAM.thrust = 'rep-sword';
TECH_BY_ID['rep-harvest'].race = ['realm', 'wood'];
TECH_BY_ID['rep-graverob'].race = ['realm', 'swamp'];
for (const id of ['rep-horsespeed', 'rep-cavhp']) TECH_BY_ID[id].race = ['realm', 'swamp', 'wood'];   // (v93: Champion Swiftness and Champion Toughness)

// ---------- names: Woodling words for things, applied over the Realmlings' texts ----------
const WD_WORDS = [
  [/\bMage Towers?\b/g, m => m.endsWith('s') ? 'Groves' : 'Grove'], [/\bMage Sanctums?\b/g, 'Majestic Grove'], [/\bMage Arcanums?\b/g, 'Magnificent Grove'],
  [/\bMages\b/g, 'Druids'], [/\bMage\b/g, 'Druid'], [/\bWayfinders\b/g, 'Scouts'], [/\bWayfinder\b/g, 'Scout'], [/\bMasons\b/g, 'Architects'], [/\bMason\b/g, 'Architect'],
  [/\bMarketplaces\b/g, 'Bazaars'], [/\bMarketplace\b/g, 'Bazaar'], [/\bTemples\b/g, 'Shrines'], [/\bTemple\b/g, 'Shrine'], [/\bTrade Routes\b/g, 'Community']
];
const wdWords = s => typeof s !== 'string' ? s : WD_WORDS.reduce((t, [re, to]) => t.replace(re, to), s);
const WD_TEXT = {
  units: { 'pioneer:B': ['Scout', 'Explores and surveys land, and slips through borders of trees.'], 'mason:A': ['Architect', 'Raises outposts and buildings.'], 'mage:A': ['Druid', 'Casts the spells of your school. Joins an army to fight in it and power its battle spells.'] },
  builds: {
    market: { name: 'Bazaar', blurb: 'A bustling forest bazaar: +3 gold every payout. With Community, +1 more for each other building in its province.' },
    magetower: { name: 'Grove', levels: ['Grove', 'Majestic Grove', 'Magnificent Grove'], blurb: 'A great tree whose canopy grows with every upgrade. Trains Druids, unlocks Magic research and adds 2 Magic points every payout. Upgrades to a Majestic Grove, then a Magnificent Grove.' },
    temple: { name: 'Shrine', blurb: 'A statue of a veiled woman, praying humbly: adds 2 Government research points every payout.' },
    stable: { name: 'Hall of Champions', note: 'with a Barracks: Champions', blurb: 'A longhouse hung with antlers, where Champions are sworn. Lets a Barracks in the same province train Champions.' },
    storehouse: { blurb: 'Built inside a hollow giant fallen tree: +1000 wood storage.' },
    farm: { blurb: 'An apple orchard: +5 food every payout.' },
    barracks: { note: 'trains Protectors (and Champions with a Hall of Champions)' }
  },
  techs: {
    traderoutes: ['Community', 'Every Bazaar makes 1 more gold per payout for each other building in its province (a Bazaar in a province with 5 other buildings: +5 gold).'],
    'horse-breeding': ['Champion Weaponsmithing', 'Needs Building: Hall of Champions (Government). Champions can wield the Ancient Hammer (crushing, tougher, slower) or the Wrathful Spear (quicker on the march).'],
    'horse-training': ['Champion Ornate Weaponsmithing', 'Unlocks the Worldbreaker Axe (critical strikes) and the Oblivion Blade (the deadliest and toughest Champion weapon, but the slowest and dearest).'],
    stable: ['Building: Hall of Champions', 'Unlocks the Hall of Champions, which lets a Barracks train Champions.']
  },
  reps: { 'rep-trade': ['Quality Goods', 'Community gives 5% more gold.'], 'rep-sword': ['Thrusting Sword Mastery', 'Thrusting Sword soldiers deal 5% more damage.'], 'rep-horsespeed': ['Champion Swiftness', 'Champions move 5% faster.'], 'rep-cavhp': ['Champion Toughness', 'Champions have 5% more health.'], 'rep-magecap': ['Druid Academy', 'Raises the Druid limit by 1.'], 'rep-masons': ['Architects’ Guild', 'Raises the Architect limit by 1.'], 'rep-wayfinders': ['Scouts’ Lodge', 'Raises the Scout limit by 1.'] }
};
// the Realmlings' own texts, kept from before any race was applied
const WD_ORIG = { saved: false };
function saveWdOrig() {
  if (WD_ORIG.saved) return; WD_ORIG.saved = true;
  WD_ORIG.units = {}; for (const k of Object.keys(WD_TEXT.units)) WD_ORIG.units[k] = { name: UNIT_DEFS[k].name, blurb: UNIT_DEFS[k].blurb };
  WD_ORIG.builds = {}; for (const [k, d] of Object.entries(BUILD_DEFS)) WD_ORIG.builds[k] = { name: d.name, note: d.note, blurb: d.blurb, levels: d.levels && d.levels.slice() };
  WD_ORIG.techs = {}; for (const x of TECHS) if (!x.rep) WD_ORIG.techs[x.id] = [x.name, x.blurb];
  WD_ORIG.trees = {}; for (const k of Object.keys(TECH_TREES)) WD_ORIG.trees[k] = { locked: TECH_TREES[k].locked, rate: TECH_TREES[k].rate, tiers: TECH_TREES[k].tiers && TECH_TREES[k].tiers.slice() };
  WD_ORIG.buildOrder = BUILD_ORDER.slice();
}
function restoreWdOrig() {
  for (const [k, o] of Object.entries(WD_ORIG.units)) Object.assign(UNIT_DEFS[k], o);
  for (const [k, o] of Object.entries(WD_ORIG.builds)) { const d = BUILD_DEFS[k]; for (const f of ['name', 'note', 'blurb', 'levels']) { if (o[f] === undefined) delete d[f]; else d[f] = Array.isArray(o[f]) ? o[f].slice() : o[f]; } }
  for (const x of TECHS) if (!x.rep && WD_ORIG.techs[x.id]) [x.name, x.blurb] = WD_ORIG.techs[x.id];
  for (const [k, o] of Object.entries(WD_ORIG.trees)) { const T = TECH_TREES[k]; T.locked = o.locked; T.rate = o.rate; if (o.tiers) T.tiers = o.tiers.slice(); }
}
function applyWoodText() {
  for (const [k, [n, b]] of Object.entries(WD_TEXT.units)) Object.assign(UNIT_DEFS[k], { name: n, blurb: b });
  for (const [k, d] of Object.entries(BUILD_DEFS)) { for (const f of ['name', 'note', 'blurb']) if (d[f]) d[f] = wdWords(d[f]); if (d.levels) d.levels = d.levels.map(wdWords); Object.assign(d, WD_TEXT.builds[k] || {}); }
  for (const x of TECHS) if (!x.rep) { x.name = wdWords(x.name); x.blurb = wdWords(x.blurb); const o = WD_TEXT.techs[x.id]; if (o) { x.name = o[0] || x.name; x.blurb = o[1] || x.blurb; } }
  for (const T of Object.values(TECH_TREES)) { T.locked = wdWords(T.locked); T.rate = wdWords(T.rate); if (T.tiers) T.tiers = T.tiers.map(wdWords); }
  UNIT_BASE.inf.name = 'Protectors'; UNIT_BASE.cav.name = 'Champions';
}
for (const x of TECHS) if (x.rep) { const o = WD_TEXT.reps[x.id]; if (o) { x.wdName = o[0]; x.wdBlurb = o[1]; } }

// ---------- choosing the race: the Swamplings' applyRace handles Realmlings and Swamplings; Woodlings start from the Realmlings ----------
const _applyRaceWd = applyRace;
applyRace = function (race) {
  saveWdOrig(); restoreWdOrig();
  _applyRaceWd(race === 'wood' ? 'realm' : race);
  RACE[ME] = race;
  document.body.classList.toggle('race-wood', race === 'wood');
  if (race !== 'wood') return;
  applyWoodText();
  // no roads at all (v93: the Hall of Champions is back on the Architect's list)
  BUILD_ORDER.length = 0; for (const k of WD_ORIG.buildOrder) BUILD_ORDER.push(k);
  CMD[MASON] = ['outpost', ...BUILD_ORDER].map((type, i) => ({ id: 'build:' + type, cell: i, key: type === 'outpost' ? 'Q' : '' })).concat([{ id: 'cancelbuild', cell: 14, key: '' }, { id: 'dismiss', cell: 15, key: '' }]);
  for (const t of TREE_KEYS) { const st = S.tech[t]; st.opts = st.opts.filter(id => techFor(TECH_BY_ID[id], race)); if (st.cur && !techFor(TECH_BY_ID[st.cur], race)) st.cur = null; }
  drawOptions('gov');
  if (!S.designs.some(d => d.id === armSel && d.race === 'wood')) { armSel = footmanOf(ME); draft = null; }
  registerMage();
  for (const k in portraitURL) delete portraitURL[k];
  armKey = ''; cmdKey = ''; techKey = ''; techBtnKey = ''; rosterKey = ''; provKey = ''; capPanelKey = '';
};

// ---------- where Woodlings may build ----------
// (v93: the Hall of Champions can be built; Woodlings follow the Realmlings' rules)

// ---------- Community (the Woodlings' Trade Routes): +1 gold per Bazaar for each other building in its province ----------
let communityMemo = { t: -1, n: 0 };
const _tradeGoldWd = tradeGold;
tradeGold = function () {
  if (!isWd(ME)) return _tradeGoldWd();
  if (!hasTech('traderoutes')) return 0;
  if (communityMemo.t !== S.t) {
    let n = 0;
    for (const [p, list] of S.extras) { if (!owned(p) || S.occ.has(p)) continue; const bz = list.filter(e => e.type === 'market').length; if (bz) n += bz * (list.length - 1); }
    communityMemo = { t: S.t, n: Math.round(n * (1 + 0.05 * repLv('rep-trade'))) };
  }
  return communityMemo.n;
};

// ---------- the forest: Woodlings move 10% faster there (their +20% armor there is in applyDamage) ----------
const _speedModWd = speedMod;
speedMod = function (u) { let m = _speedModWd(u); if (isWd(u.owner) && world && world.provinces[u.prov] && world.provinces[u.prov].terrain === 'forest') m *= 1.1; return m; };

// ---------- Scouts slip through borders of trees ----------
const treeEdges = { seed: null, by: null };
function treeNbr(a) {
  if (treeEdges.seed !== world.seed || !treeEdges.by) {
    treeEdges.seed = world.seed; treeEdges.by = world.provinces.map(() => []);
    for (const e of world.edges) if (e.style === 'trees') { const A = world.vertices[e.v[0]], B = world.vertices[e.v[1]], m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; treeEdges.by[e.a].push({ e, q: e.b, m }); treeEdges.by[e.b].push({ e, q: e.a, m }); }
  }
  return treeEdges.by[a].filter(x => !x.e.open).map(x => ({ q: x.q, m: x.m }));
}
const _pathNbrWd = pathNbr;
pathNbr = function (u, a, siege) {
  const out = _pathNbrWd(u, a, siege);
  if (u.kind !== WAYFINDER || !isWd(u.owner)) return out;
  const t = treeNbr(a); return t.length ? out.concat(t) : out;
};

// ---------- computer Woodlings: their designs (no shields, Woodling armor; Champions with the best Champion weapon they know) ----------
const _aiRedesignWd = aiRedesign;
aiRedesign = function (N) {
  if (N.race !== 'wood') return _aiRedesignWd(N);
  const fam = FAMILY[N.family] || FAMILY.thrust, weapon = fam.order.filter(w => !WEAPONS[w].tech || aiHas(N, WEAPONS[w].tech)).pop();
  let armor = 'spirit1';
  for (let lv = 4; lv >= 1; lv--) { const id = N.armorLine + lv, A = ARMORS[id]; if (A && (!A.tech || aiHas(N, A.tech))) { armor = id; break; } }
  let champA = 'ornate1'; for (let lv = 4; lv >= 1; lv--) if (aiHas(N, 'a-ornate' + lv)) { champA = 'ornate' + lv; break; }
  const champW = aiHas(N, 'horse-training') ? (N.family === 'thrust' ? 'oblivion' : 'worldaxe') : aiHas(N, 'horse-breeding') ? (N.family === 'pole' ? 'wrathspear' : 'ancienthammer') : 'champsword';
  const sig = [weapon, armor, champA, champW].join('|'); if (sig === N.designSig) return; N.designSig = sig; N.dv++;
  const role = { pole: 'Spear Protector', thrust: 'Sword Protector', blunt: 'Club Protector' }[N.family] || 'Protector';
  const inf = { id: `ai${N.id}i${N.dv}`, name: role, type: 'inf', weapon, shield: null, off: null, armor, horse: null, race: 'wood' };
  const cav = { id: `ai${N.id}c${N.dv}`, name: 'Champion', type: 'cav', weapon: champW, shield: null, off: null, armor: champA, horse: null, race: 'wood' };
  registerDesign(inf); registerDesign(cav);
  N.design = { inf: inf.id, cav: cav.id };
};
// pretentious, flowery Woodling nation names
const WD_AI_NAMES = ['Moonwatchers', 'Ancient Defenders', 'Hunters of the Dark', 'Sentinels of the Silver Grove', 'Starwardens', 'Keepers of the Elder Bough', 'Watchers of the Twilight', 'Dawnsingers', 'Ancients of the Deepwood', 'Grove of Whispering Stars', 'Hunters of the Gloaming', 'Sentinels Eternal', 'Leafsworn Wardens', 'Watchers Beneath the Boughs', 'Silverleaf Ancients', 'Guardians of the Evergreen'];

// ---------- phase 2a art: Woodling figures, settlements and townsfolk ----------
// unit art: Scouts, Architects and Druids have their own figures; soldiers are drawn by woodSpecFor
const WD_ART = { 'pioneer:B': 'wd-pioneer', 'mason:A': 'wd-mason', 'mage:A': 'wd-mage' };
const _swArtIdWd = swArtId;
swArtId = function (id, o) {
  if (!isWd(o) || typeof id !== 'string') return _swArtIdWd(id, o);
  if (WD_ART[id]) return WD_ART[id];
  if (id.startsWith(MAGE + '#cast-')) return wdCastId(id.slice(MAGE.length + 6));
  return id;
};
function wdCastId(sc) {
  const id = 'wd-mage#cast-' + sc, base = RealmIso.UNITS['wd-mage'];
  const U = RealmIso.UNITS[id] || (RealmIso.UNITS[id] = { unit: base.unit, name: base.name, title: base.title, spec: null });
  if (U.base !== base.spec) { U.base = base.spec; U.spec = { ...base.spec, castPose: SCHOOL_BOLT[sc] || '#7ad95a' }; }
  return id;
}
const WD_MAGE0 = { ...RealmIso.UNITS['wd-mage'].spec };
const wdMageHands = gear => ({ right: gear.weapon === 'stave' ? 'stave' : gear.weapon, left: null });   // (no shields)
const _mageArtSpecWd = mageArtSpec;
mageArtSpec = function (gear) { return isWd(ME) ? { ...WD_MAGE0, ...wdMageHands(gear) } : _mageArtSpecWd(gear); };
const _registerMageWd = registerMage;
registerMage = function () { _registerMageWd(); RealmIso.UNITS['wd-mage'].spec = { ...WD_MAGE0, ...wdMageHands(S.mageGear) }; delete portraitURL[MAGE]; };
const _castUnitIdWd = castUnitId;
castUnitId = function (u) { return isWd(u.owner) ? wdCastId(schoolOf(u.owner)) : _castUnitIdWd(u); };
// soldiers: Spiritweave light gray (a circlet and a cloak at higher levels), Mithril light teal under a leaf-crested helm,
// Ornate light purple plate; skin and hair vary by armor line (olive to purple)
const WD_LINE_LOOK = {
  leather: { skin: '#98a065', hairColor: '#3a2f45' },
  chain: { skin: '#9c8fa8', hairColor: '#2d2838' },
  plate: { skin: '#8a74a3', hairColor: '#eef0f4' }
};
function woodSpecFor(d) {
  const W = WEAPONS[d.weapon], A = ARMORS[d.armor], lv = A.level, tw = (ARMOR_TYPES[A.type] || {}).twin || A.type;
  const o = Object.assign({ right: d.weapon, left: null, angS: W.twoH ? 0.15 : 0.3 }, WD_LINE_LOOK[tw] || WD_LINE_LOOK.leather);
  if (tw === 'leather') Object.assign(o, { shirt: '#c8c6c0', sleeve: '#c8c6c0', pants: '#5c5a4c', tabard: lv >= 2 ? '#9a9890' : null, tabardTrim: lv >= 4 ? '#e9e4f5' : null, helm: lv >= 3 ? 'circlet' : undefined, helmColor: '#e9e4f5', gem: '#b07aff', cape: lv >= 3 ? '#a9a6a0' : undefined });
  else if (tw === 'chain') Object.assign(o, { shirt: '#9fd8d0', sleeve: '#9fd8d0', mail: true, tabard: '#3f8f86', tabardTrim: lv >= 3 ? '#e9f7f4' : null, pants: '#3f5f5a', helm: 'elfhelm', helmColor: '#bfe8e2', helmTrim: '#ffffff', gloves: lv >= 2 ? '#7fbfb6' : undefined, cape: lv >= 4 ? '#3f8f86' : undefined });
  else Object.assign(o, { plate: '#d7c2f2', plateTrim: '#f4e3a1', armor: true, pauldrons: lv >= 2, shirt: '#7a5a9a', sleeve: '#c9aee6', tabard: '#8a63b8', tabardTrim: lv >= 3 ? '#f4e3a1' : null, pants: '#4a3a5c', boots: '#b79ad6', gloves: '#b79ad6', helm: 'elfhelm', helmColor: '#d7c2f2', helmTrim: '#f4e3a1', plume: lv >= 4 ? '#f4e3a1' : lv >= 2 ? '#f3eaff' : undefined, cape: lv >= 3 ? '#5a3f7a' : undefined });
  // v93: a Champion: on foot, in Ornate plate under an antlered great helm that hides all but the eyes, gripping a great weapon in both hands
  if (d.type === 'cav') Object.assign(o, { twoHand: true, angS: 0.12, angF: -0.12, armor: true, pauldrons: true, helm: 'antlerhelm', helmColor: '#d7c2f2', helmTrim: '#f4e3a1', cape: '#5a3f7a', tabard: '#6f4a9a', tabardTrim: '#f4e3a1', plate: '#d7c2f2', plateTrim: '#f4e3a1', shirt: '#7a5a9a', sleeve: '#c9aee6', pants: '#4a3a5c', boots: '#b79ad6', gloves: '#b79ad6', skin: '#8a74a3' });
  return RealmIso.wood(o);
}
const _specForWd = specFor;
specFor = function (d) { return d.race === 'wood' ? woodSpecFor(d) : _specForWd(d); };
for (const d of S.designs) if (d.race === 'wood') registerDesign(d);   // (the starting designs were registered before this file loaded)
// settlements: stave churches (the capital grown out of a Great Oak)
const _settleArtWd = settleArt;
settleArt = function (g, stage, t, look, race) { if (race === 'wood') WoodBuild.drawSettlement(g, stage, t, look); else _settleArtWd(g, stage, t, look, race); };
// v92 (phase 2b): every province building in the Woodling style (woodbld.js); anything without a Woodling model falls back
const _bldArtWd = bldArt;
bldArt = function (g, type, idx, t, rise, race) { if (race === 'wood' && WoodBuild.has(type)) WoodBuild.drawOnMap(g, type, idx, t, rise); else _bldArtWd(g, type, idx, t, rise, race); };


// =====================================================================================================================
// ================= v93: Woodlings phase 3: Champions, two-handing, Elemental magic, the lost travelers =================
// =====================================================================================================================

// ---------- Champions (equip.js: CHAMP, CHAMP_WEAPONS, champStats; the Armory's Champion editor) ----------
// A Woodling "cavalry" design is a Champion: trained at a Barracks with a Hall of Champions in the same province (the Realmlings'
// Barracks + Stable rule), retrofitted there, boosted by Champion Toughness / Swiftness (the cavalry repeatables). Champions are
// on foot: no cavalry penalties in forest or swamp, no grassland charge, and spears get no bonus against them (sideMix).
ITEM_SPAN.champsword = [-110, 26]; ITEM_SPAN.ancienthammer = [-104, 26]; ITEM_SPAN.wrathspear = [-160, 30]; ITEM_SPAN.worldaxe = [-116, 26]; ITEM_SPAN.oblivion = [-114, 28];
// selecting a Hall of Champions selects the Barracks beside it, where the Champions are trained
const _selectPartWd = selectPart;
selectPart = function (p, part) {
  _selectPartWd(p, part);
  if (isWd(ME) && ptype(part) === 'stable' && owned(p) && extrasIn(p).some(e => e.type === 'barracks')) { S.selBuilding = p; S.selKind = 'barracks'; }
};
// Inspect: a two-handed design says so where the off hand would be
const _gearOfWd = gearOf;
gearOf = function (k) { const gr = _gearOfWd(k), d = designById(k); if (gr && d && d.race === 'wood' && d.two) gr.off = { name: 'Two-handed: heavy blows', icon: equipIcon('grip', 'two') }; return gr; };

// ---------- two-handing: every other round nothing, the next a blow TWO_BURST (2.5x) as hard (game.js sideStrength) ----------
function twoMul(a) {
  if (a.twoT !== S.t) { a.twoT = S.t; a.twoOn = !a.twoOn; if (a.twoOn) a.twoHit = S.t; }
  return a.twoOn ? TWO_BURST : 0;
}
// ---------- battle joins: the first round is the wind-up; Rock Armor raises its shield ----------
const ROCK = { pct: 0.1, cd: 180 };
AUTO.rock = { line: 'rock', name: () => TECH_BY_ID.rockarmor.name };
const armyHealth = a => Object.keys(a.troops).reduce((n, k) => n + (a.troops[k] > 0 ? a.troops[k] * hpOf(a, k) : 0), 0);
function raiseRock(a, t) {
  const hp = Math.round(armyHealth(a) * ROCK.pct); if (hp <= 0) return;
  a.rock = { hp, max: hp, t0: t }; a.rockCd = t + ROCK.cd;
  a.mfx = a.mfx && isFinite(a.mfx.until) ? a.mfx : { list: [], until: Infinity }; if (!a.mfx.list.some(e => e.k === 'rock')) a.mfx.list.push({ k: 'rock', tech: 'rockarmor' });
  if (a.owner === ME) toast(`${a.name}: Rock Armor (a stone shield worth ${hp} health).`);
}
const _onBattleJoinWd = onBattleJoin;
onBattleJoin = function (a, t) {
  _onBattleJoinWd(a, t);
  a.twoOn = true; a.twoT = -1; a.rock = null;
  if (isCaster(a)) { if (lvl('rock') && autoOn(a, 'rock') && (a.rockCd || 0) <= t) raiseRock(a, t); }
  else { const N = NATIONS[a.owner]; if (N && N.race === 'wood' && N.school === 'elemental' && aiHas(N, 'rockarmor') && (a.troops[MAGE] || 0) > 0 && (a.rockCd || 0) <= t) raiseRock(a, t); }   // computer Druids keep it on
};
const _onBattleEndWd = onBattleEnd;
onBattleEnd = function (a, t) { _onBattleEndWd(a, t); if (a.rock && a.owner === ME && a.rock.hp > 0) toast(`${a.name}: the Rock Armor held (${Math.round(a.rock.max - a.rock.hp)} damage soaked).`); a.rock = null; };
// Rock Armor soaks the damage that gets through armor and parries, before any soldier is hurt
const _applyDamageWd = applyDamage;
applyDamage = function (b, armies, dmg, t, pierce = 0) {
  const sh = armies.filter(a => a.rock && a.rock.hp > 0);
  if (sh.length && dmg > 0) {
    const mix = sideMix(armies);
    if (isWd(armies[0].owner) && world.provinces[b.prov].terrain === 'forest' && mix.red > 0 && mix.red < 1) { const A = mix.red * ARMOR_K / (1 - mix.red) * 1.2; mix.red = A / (A + ARMOR_K); }
    const f = Math.max(0.01, (1 - mix.red * (1 - 0.5 * pierce)) * (1 - mix.parry)), pool = sh.reduce((n, a) => n + a.rock.hp, 0);
    const post = dmg * f, soak = Math.min(pool, post);
    for (const a of sh) { a.rock.hp -= soak * a.rock.hp / pool; a.rockHit = t; if (a.rock.hp < 0.5) { a.rock.hp = 0; a.rockBroke = t; if (a.owner === ME) toast(`${a.name}: the Rock Armor shatters.`, true); } }
    dmg = (post - soak) / f;
    if (dmg <= 0.001) return;
  }
  return _applyDamageWd(b, armies, dmg, t, pierce);
};
// a stone bar under the army's health bar while the shield holds
const _drawArmyHealthWd = drawArmyHealth;
drawArmyHealth = function (g, u, x, y, w, K) {
  _drawArmyHealthWd(g, u, x, y, w, K);
  if (!u.rock || !(u.rock.hp > 0)) return;
  const h = 3.2 * Math.sqrt(K), y2 = y + 4.2 * Math.sqrt(K) + 3, f = Math.max(0, Math.min(1, u.rock.hp / u.rock.max));
  g.save(); g.beginPath(); g.roundRect(x - w / 2 - 1.5, y2 - 1.5, w + 3, h + 3, (h + 3) / 2); g.fillStyle = OL; g.fill();
  g.beginPath(); g.roundRect(x - w / 2, y2, Math.max(h, w * f), h, h / 2); g.fillStyle = '#a8a29a'; g.fill(); g.restore();
};

// ---------- the Elemental school (Woodlings only): Rock Armor (above), Whispering Rocks, Town Portal, Forest Spirit, Grand Elemental ----------
SCHOOL_BOLT.elemental = '#6fd3ea';
AI_MAGIC_PREFS.elemental = { rockarmor: 25, forestspirit: 14, gelemental: 10, townportal: 6, wrocks: 6 };
const WROCK_PER = 3, WROCK_TIME = 20, FSPIRIT_TIME = 20, FSPIRIT_PCT = 0.25, PORTAL = { time: 5, cd: 300 }, GELEM = { time: 10, life: 120, cd: 300 };
S.wrocks = []; S.fspirits = []; S.gelems = []; S.portalFx = [];
const druidCount = o => warlockCount(o);
const linkOf = (p, q) => linkKey(p, q);
const edgeMid = i => { const e = world.edges[i], V = world.vertices, a = V[e.v[0]], b = V[e.v[1]]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.atan2(b[1] - a[1], b[0] - a[0])]; };
const mtnEdge = (p, q) => edgeBetween(p, q, 'mountains');
const treeEdge = (p, q) => edgeBetween(p, q, 'trees');
const wrockNbrs = c => allNbr[c.prov].filter(q => mtnEdge(c.prov, q) >= 0 && !S.wrocks.some(r => r.owner === ME && r.link === linkOf(c.prov, q)));
const fspiritNbrs = c => allNbr[c.prov].filter(q => treeEdge(c.prov, q) >= 0 && !S.fspirits.some(r => r.link === linkOf(c.prov, q)));
const myRocks = () => S.wrocks.filter(r => r.owner === ME).length, mySpirits = () => S.fspirits.filter(r => r.owner === ME).length;
function wrocksWhy(c, q) {
  if (myRocks() >= WROCK_PER * druidCount(ME)) return `Up to ${WROCK_PER} per ${UNIT_DEFS[MAGE].name} (${myRocks()}/${WROCK_PER * druidCount(ME)})`;
  if (q === undefined) return wrockNbrs(c).length ? null : 'No mountain border here without Whispering Rocks';
  if (!allNbr[c.prov].includes(q)) return `The ${UNIT_DEFS[MAGE].name} must stand next door`;
  if (mtnEdge(c.prov, q) < 0) return 'No mountain border there';
  if (S.wrocks.some(r => r.owner === ME && r.link === linkOf(c.prov, q))) return 'Whispering Rocks already stand there';
  return null;
}
function fspiritWhy(c, q) {
  if (mySpirits() >= druidCount(ME)) return `One Forest Spirit per living ${UNIT_DEFS[MAGE].name} (${mySpirits()}/${druidCount(ME)})`;
  if (q === undefined) return fspiritNbrs(c).length ? null : 'No border of trees here without a spirit';
  if (!allNbr[c.prov].includes(q)) return `The ${UNIT_DEFS[MAGE].name} must stand next door`;
  if (treeEdge(c.prov, q) < 0) return 'No border of trees there';
  if (S.fspirits.some(r => r.link === linkOf(c.prov, q))) return 'A Forest Spirit already dwells there';
  return null;
}
// aiming: with one possible border the spell goes there; with several, click the neighboring province
let elemAim = null;
function aimOrCast(c, kind) {
  const list = kind === 'wrocks' ? wrockNbrs(c) : fspiritNbrs(c);
  if (list.length === 1) return beginElem(c, kind, list[0]);
  pathAim = c; quakeAim = false; elemAim = { kind, c }; cv.style.cursor = 'crosshair'; cmdKey = '';
  toast(`Click the neighboring province across the ${kind === 'wrocks' ? 'mountains' : 'trees'}. Right-click or Esc cancels.`);
}
function beginElem(c, kind, q) {
  const why = kind === 'wrocks' ? wrocksWhy(c, q) : fspiritWhy(c, q); if (why) return toast(why + '.', true);
  if (c.moving) return toast('Stop moving first.', true);
  startCast(c, kind, kind === 'wrocks' ? WROCK_TIME : FSPIRIT_TIME, { to: q });
  sfx('mg_life', { prov: c.prov });
  toast(kind === 'wrocks' ? `${c.name} raises Whispering Rocks on the mountains toward ${provName(q)}: ${WROCK_TIME} s of casting.` : `${c.name} calls a Forest Spirit into the trees toward ${provName(q)}: ${FSPIRIT_TIME} s of casting.`);
}
const _pathAimClickWd = pathAimClick;
pathAimClick = function (p, right) {
  if (!elemAim || pathAim !== elemAim.c) { elemAim = null; return _pathAimClickWd(p, right); }
  const { kind, c } = elemAim; elemAim = null; pathAim = null; cv.style.cursor = ''; cmdKey = '';
  if (right || p < 0) return toast((kind === 'wrocks' ? 'Whispering Rocks' : 'Forest Spirit') + ' cancelled.');
  beginElem(c, kind, p);
};
const _extraCmdUseWd = extraCmdUse;
extraCmdUse = function (id) { if (id === 'xpath' || id === 'shock') elemAim = null; return _extraCmdUseWd(id); };
CAST.wrocks = { name: () => TECH_BY_ID.wrocks.name, line: 'wrocks', instant: true, why: c => wrocksWhy(c), go(c) { aimOrCast(c, 'wrocks'); } };
CAST.fspirit = { name: () => TECH_BY_ID.forestspirit.name, line: 'fspirit', instant: true, why: c => fspiritWhy(c), go(c) { aimOrCast(c, 'fspirit'); } };
CAST.tportal = { name: () => TECH_BY_ID.townportal.name, line: 'tportal',
  why: c => cdLeft('tportal' + c.id) > 0 ? `Ready in ${Math.ceil(cdLeft('tportal' + c.id))} s` : capitalOf(ME) < 0 ? 'You have no capital' : c.prov === capitalOf(ME) ? 'Already at the capital' : null,
  go(c) { startCast(c, 'tportal', PORTAL.time); toast(`${c.name} opens a Town Portal to ${provName(capitalOf(ME))}: ${PORTAL.time} s of casting.`); } };
CAST.gelem = { name: () => TECH_BY_ID.gelemental.name, line: 'gelem',
  why: c => cdLeft('gelem' + c.id) > 0 ? `Ready in ${Math.ceil(cdLeft('gelem' + c.id))} s` : null,
  go(c) { startCast(c, 'gelem', GELEM.time); toast(`${c.name} begins to call up a Grand Elemental: ${GELEM.time} s of casting.`); } };
SPELL_CELLS.push('wrocks', 'tportal', 'fspirit', 'gelem');
// an army's spell buttons sit in cells 4–7; a fifth goes to cell 9 (cell 8 is Rest)
const _spellButtonsWd = spellButtons;
spellButtons = function (c, from) { const out = _spellButtonsWd(c, from); if (from === 4) { const cells = [4, 5, 6, 7, 9]; out.forEach((b, i) => { if (i < cells.length) b.cell = cells[i]; }); } return out; };
// rows in the Ctrl+right-click menu
const _magicRowsWd = magicRows;
magicRows = function (c, q) {
  let base = _magicRowsWd(c, q);
  if (!c || c.prov === q || !allNbr[c.prov].includes(q) || currentSchool() !== 'elemental') return base;
  const rows = [], row = (type, label, why, icon, time) => rows.push(`<button type="button" class="bm-item" data-type="${type}" ${why ? 'aria-disabled="true"' : ''}><img alt="" src="${techIcon(icon)}"><span class="bm-name">${label}<small>${why || time + ' s of casting'}</small></span></button>`);
  if (lvl('wrocks') && mtnEdge(c.prov, q) >= 0) row('wrocks', `Whispering Rocks on the mountains toward ${provName(q)}`, wrocksWhy(c, q) || (c.cast ? 'Already casting a spell' : null), 'wrocks', WROCK_TIME);
  if (lvl('fspirit') && treeEdge(c.prov, q) >= 0) row('fspirit', `A Forest Spirit in the trees toward ${provName(q)}`, fspiritWhy(c, q) || (c.cast ? 'Already casting a spell' : null), 'forestspirit', FSPIRIT_TIME);
  if (!rows.length) return base;
  return base ? base + rows.join('') : '<div class="bm-sec">Magic</div>' + rows.join('');
};
menuEl.addEventListener('click', e => {
  const b = e.target.closest('[data-type="wrocks"],[data-type="fspirit"]'); if (!b) return;
  e.stopImmediatePropagation(); if (b.getAttribute('aria-disabled') === 'true') return;
  const c = S.selected.find(isCaster), q = menuProv; closeBuildMenu(); if (c) beginElem(c, b.dataset.type, q);
}, true);
// finishing the Elemental casts (the rest of stepMagic handles every other spell)
const _stepMagicWd = stepMagic;
stepMagic = function (t, dt) {
  for (const c of S.units) {
    const cs = c.cast; if (!cs || !['wrocks', 'fspirit', 'tportal', 'gelem'].includes(cs.spell)) continue;
    if (!isCaster(c) || c.moving || c.battle || t - cs.t0 < cs.dur) continue;
    c.cast = null; cmdKey = '';
    if (cs.spell === 'wrocks') finishRocks(c, cs.to);
    else if (cs.spell === 'fspirit') finishSpirit(c, cs.to);
    else if (cs.spell === 'tportal') finishPortal(c);
    else finishElemental(c);
  }
  _stepMagicWd(t, dt);
};
function finishRocks(c, q) {
  const why = wrocksWhy(c, q); if (why) return toast('Whispering Rocks: ' + why.toLowerCase() + '.', true);
  const i = mtnEdge(c.prov, q); S.wrocks.push({ owner: ME, a: c.prov, b: q, link: linkOf(c.prov, q), edge: i, t0: S.t });
  computeFog(); fogDirty = true; miniDirty = true;
  toast(`Whispering Rocks stand on the mountains between ${provName(c.prov)} and ${provName(q)}: both are in sight for good.`);
}
function finishSpirit(c, q) {
  const why = fspiritWhy(c, q); if (why) return toast('Forest Spirit: ' + why.toLowerCase() + '.', true);
  const i = treeEdge(c.prov, q); S.fspirits.push({ owner: ME, a: c.prov, b: q, link: linkOf(c.prov, q), edge: i, t0: S.t });
  computeIncome(); provKey = '';
  toast(`A Forest Spirit settles in the trees between ${provName(c.prov)} and ${provName(q)}: both make ${Math.round(FSPIRIT_PCT * 100)}% more gold, wood and food.`);
}
function finishPortal(c) {
  const to = capitalOf(ME); if (to < 0 || to === c.prov) return;
  S.portalFx.push({ x: c.x, y: c.y, prov: c.prov, t0: S.t });
  c.path = []; c.moving = false; c.surveyQueue = []; c.lastProv = c.prov; c.prov = to; c.slot = freeSlot(to, c); [c.x, c.y] = slotPos(to, c.slot); c.riftFx = S.t;
  if (c.retroWant) c.retroWant = null;
  S.portalFx.push({ x: c.x, y: c.y, prov: to, t0: S.t });
  S.cd['tportal' + c.id] = S.t + perWarlockCd(c, PORTAL.cd);
  computeFog(); sfx('mg_rift', { prov: to });
  toast(`${c.name} steps through the Town Portal to ${provName(to)}.`);
}
// the Grand Elemental: a temporary troop kind ('wd-elem'); S.gelems holds when each one fades
const GELEM_ID = 'wd-elem';
{
  const W = WEAPONS.oblivion, A = ARMORS.ornate4, hp = (CHAMP.hp + W.hp) * 2;   // a fully upgraded Champion: Oblivion Blade, Ornate IV
  DSTATS[GELEM_ID] = { cav: false, rough: true, fam: 'water', atk: W.atk, hp, armor: 0, shieldArmor: 0, red: 0, parry: 0, crit: 0, speed: +(CHAMP.speed * A.speed).toFixed(2), cost: {}, upkeep: {}, blurb: '' };
  UNIT_DEFS[GELEM_ID] = { name: 'Grand Elemental', cost: {}, upkeep: {}, blurb: 'A towering man of living water, summoned by a Druid for 2 minutes. Hits like a fully upgraded Champion, with twice the health, but no armor.' };
  UNIT_SPEED[GELEM_ID] = DSTATS[GELEM_ID].speed;
}
function finishElemental(c) {
  let a = c.kind === 'army' ? c : S.units.find(v => v.kind === 'army' && v.owner === ME && v.prov === c.prov && !v.battle && !v.moving);
  if (a) { a.troops[GELEM_ID] = (a.troops[GELEM_ID] || 0) + 1; a.grew = S.t; }
  else a = newArmy(c.prov, { [GELEM_ID]: 1 }, c);
  S.gelems.push({ owner: ME, until: S.t + GELEM.life });
  S.cd['gelem' + c.id] = S.t + perWarlockCd(c, GELEM.cd);
  S.portalFx.push({ x: a.x, y: a.y, prov: a.prov, t0: S.t, water: true });
  computeIncome(); rosterKey = ''; sfx('mg_life', { prov: c.prov });
  toast(`A Grand Elemental rises from the earth’s waters and joins ${a.name}. It lasts ${GELEM.life / 60} minutes.`);
}
function stepElementals(t) {
  if (!S.gelems.length) return;
  for (const o of new Set(S.gelems.map(x => x.owner))) {
    const mine = S.gelems.filter(x => x.owner === o).sort((x, y) => x.until - y.until);
    let alive = 0; for (const u of S.units) if (u.owner === o && u.kind === 'army') alive += u.troops[GELEM_ID] || 0;
    // the ones that fell in battle are gone already: drop their entries (the oldest first)
    while (mine.length > alive) { const x = mine.shift(); S.gelems = S.gelems.filter(y => y !== x); }
    for (const x of mine) {
      if (x.until > t) continue;
      S.gelems = S.gelems.filter(y => y !== x);
      const a = S.units.filter(u => u.owner === o && u.kind === 'army' && u.troops[GELEM_ID] > 0).sort((p, q) => q.troops[GELEM_ID] - p.troops[GELEM_ID])[0]; if (!a) continue;
      a.troops[GELEM_ID]--; if (!a.troops[GELEM_ID]) delete a.troops[GELEM_ID];
      S.portalFx.push({ x: a.x, y: a.y, prov: a.prov, t0: t, water: true });
      if (troopCount(a) <= 0) removeArmy(a);
      if (o === ME) { computeIncome(); rosterKey = ''; toast(`The Grand Elemental in ${provName(a.prov)} sinks back into the earth.`); }
    }
  }
}
// Forest Spirits fade when there are more of them than living Druids (the newest first)
function stepSpirits() {
  const n = druidCount(ME), mine = S.fspirits.filter(r => r.owner === ME);
  if (mine.length <= n) return;
  const drop = mine.sort((x, y) => y.t0 - x.t0).slice(0, mine.length - n);
  S.fspirits = S.fspirits.filter(r => !drop.includes(r)); computeIncome();
  for (const r of drop) toast(`With one ${UNIT_DEFS[MAGE].name} fewer, the Forest Spirit between ${provName(r.a)} and ${provName(r.b)} fades.`, true);
}
// Forest Spirit: +25% of everything a bordering province of yours makes
const spiritsAt = (p, o) => S.fspirits.filter(r => r.owner === o && (r.a === p || r.b === p)).length;
const _provinceIncomeWd = provinceIncome;
provinceIncome = function (p, b) {
  const y = _provinceIncomeWd(p, b), n = spiritsAt(p, b.owner);
  if (n) for (const k of Object.keys(y)) if (typeof y[k] === 'number' && y[k] > 0) y[k] = Math.round(y[k] * (1 + FSPIRIT_PCT * n));
  return y;
};
// Whispering Rocks: both provinces always in sight
const _pyreSightWd = pyreSight;
pyreSight = function (vis) { _pyreSightWd(vis); for (const r of S.wrocks) if (r.owner === ME) { vis.add(r.a); vis.add(r.b); } };

// ---------- drawing: rocks, spirits, portals, the stone shield, heavy blows ----------
function drawElemental(g, t) {
  const seen = r => S.explored.has(r.a) || S.explored.has(r.b);
  for (const r of S.wrocks) {
    if (!seen(r) || r.edge < 0) continue;
    const [mx, my, ang] = edgeMid(r.edge), K = Math.max(1, UKK * 0.8);
    g.save(); g.translate(mx, my); g.lineJoin = 'round';
    // whispers: pale rings rippling outward
    for (let k = 0; k < 3; k++) { const f = (t * 0.45 + k / 3) % 1; g.globalAlpha = 0.5 * (1 - f); g.beginPath(); g.ellipse(0, -10 * K, (14 + f * 60) * K, (6 + f * 26) * K, 0, 0, 7); g.lineWidth = 2.2; g.strokeStyle = '#bff2ff'; g.stroke(); }
    g.globalAlpha = 1;
    for (const [dx, h, w] of [[-14, 30, 10], [2, 40, 12], [16, 26, 9]]) {
      const x = dx * K, top = -h * K;
      g.beginPath(); g.moveTo(x - w * K, 2 * K); g.lineTo(x - w * 0.8 * K, top + 6 * K); g.quadraticCurveTo(x, top - 4 * K, x + w * 0.8 * K, top + 6 * K); g.lineTo(x + w * K, 2 * K); g.closePath();
      g.fillStyle = '#9a9a92'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x - w * 0.7 * K, top + 8 * K, w * 0.35 * K, (h - 12) * K);
      const gl = 0.55 + Math.sin(t * 2 + dx) * 0.35; g.strokeStyle = `rgba(110,230,240,${gl.toFixed(2)})`; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x, top + 10 * K); g.lineTo(x, top + 22 * K); g.moveTo(x - 3 * K, top + 14 * K); g.lineTo(x + 3 * K, top + 18 * K); g.stroke();
    }
    g.restore(); void ang;
  }
  for (const r of S.fspirits) {
    if (!seen(r) || r.edge < 0) continue;
    const [mx, my] = edgeMid(r.edge), K = Math.max(1, UKK * 0.8), bob = Math.sin(t * 1.6 + r.t0) * 4 * K, x = mx, y = my - 26 * K + bob;
    g.save();
    const gr = g.createRadialGradient(x, y, 0, x, y, 46 * K); gr.addColorStop(0, 'rgba(220,255,200,0.75)'); gr.addColorStop(0.5, 'rgba(140,230,120,0.28)'); gr.addColorStop(1, 'rgba(120,220,100,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, 46 * K, 0, 7); g.fill();
    // a small glowing stag of light
    g.globalAlpha = 0.92; g.fillStyle = '#eaffdf'; g.strokeStyle = '#7fd36a'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, 13 * K, 7 * K, 0, 0, 7); g.fill(); g.stroke();
    for (const lx of [-8, -3, 4, 9]) { g.beginPath(); g.moveTo(x + lx * K, y + 4 * K); g.lineTo(x + lx * K, y + 15 * K); g.lineWidth = 2.4 * K; g.strokeStyle = '#d8ffc8'; g.stroke(); }
    g.beginPath(); g.moveTo(x + 10 * K, y - 3 * K); g.lineTo(x + 15 * K, y - 13 * K); g.lineWidth = 4 * K; g.strokeStyle = '#eaffdf'; g.stroke();
    g.beginPath(); g.ellipse(x + 17 * K, y - 15 * K, 5 * K, 3.4 * K, 0.4, 0, 7); g.fillStyle = '#eaffdf'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = '#7fd36a'; g.stroke();
    g.lineCap = 'round'; g.lineWidth = 1.8 * K; g.strokeStyle = '#c9f7a8';
    for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(x + 16 * K, y - 18 * K); g.quadraticCurveTo(x + (16 + s2 * 6) * K, y - 26 * K, x + (14 + s2 * 9) * K, y - 32 * K); g.moveTo(x + (16 + s2 * 3) * K, y - 24 * K); g.lineTo(x + (16 + s2 * 9) * K, y - 25 * K); g.stroke(); }
    for (let k = 0; k < 6; k++) { const f = (t * 0.5 + k / 6) % 1, q = k * 1.9 + t * 0.3; g.globalAlpha = 0.9 * (1 - f); g.fillStyle = k % 2 ? '#f6ffb0' : '#b8ff9a'; g.beginPath(); g.arc(x + Math.cos(q) * 28 * K, y + 10 * K - f * 40 * K, 2.2 * K, 0, 7); g.fill(); }
    g.restore();
  }
  S.portalFx = S.portalFx.filter(F => S.t - F.t0 < 1.6);
  for (const F of S.portalFx) {
    if (!S.visible.has(F.prov)) continue;
    const f = (S.t - F.t0) / 1.6, K = UKK, r = (30 + f * 50) * K;
    g.save(); g.globalAlpha = 1 - f; g.translate(F.x, F.y - 20 * K); g.scale(1, F.water ? 1 : 0.6);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, F.water ? 'rgba(220,250,255,0.9)' : 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, F.water ? 'rgba(80,180,230,0.6)' : 'rgba(111,211,234,0.6)'); gr.addColorStop(1, 'rgba(60,140,200,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.rotate(t * 3); g.lineWidth = 3; g.strokeStyle = '#6fd3ea'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(0, 0, r * (0.4 + k * 0.2), k, k + 3.6); g.stroke(); }
    g.restore();
  }
  for (const u of S.units) {
    if (u.kind !== 'army' || !(u.owner === ME || S.visible.has(u.prov))) continue;
    const K = UKK;
    // the stone shield: plates of rock circling the army's feet
    if (u.rock && u.rock.hp > 0) {
      const f = u.rock.hp / u.rock.max, n = Math.max(3, Math.round(8 * f)), hit = u.rockHit && S.t - u.rockHit < 0.3;
      for (let k = 0; k < n; k++) {
        const q = k * Math.PI * 2 / 8 + t * 0.7, x = u.x + Math.cos(q) * 44 * K, y = u.y + Math.sin(q) * 16 * K - 8 * K + (hit ? Math.sin(t * 40 + k) * 2 : 0);
        g.save(); g.translate(x, y); g.rotate(q * 0.5); g.beginPath(); g.moveTo(-7 * K, 3 * K); g.lineTo(-5 * K, -6 * K); g.lineTo(3 * K, -8 * K); g.lineTo(8 * K, -1 * K); g.lineTo(4 * K, 5 * K); g.closePath();
        g.fillStyle = '#a8a29a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-4 * K, -5 * K, 4 * K, 3 * K); g.restore();
      }
    }
    if (u.rockBroke && S.t - u.rockBroke < 1) { const f = S.t - u.rockBroke; g.save(); g.globalAlpha = 1 - f; for (let k = 0; k < 8; k++) { const q = k * 0.785, d = (44 + f * 50) * K; g.fillStyle = '#a8a29a'; g.beginPath(); g.arc(u.x + Math.cos(q) * d, u.y + Math.sin(q) * d * 0.4 - 8 * K + f * 20 * K, 4 * K, 0, 7); g.fill(); } g.restore(); }
    // two-handed heavy blows: a white arc and a "×2.5"
    if (u.twoHit && u.battle && S.t - u.twoHit < 0.6) {
      const f = (S.t - u.twoHit) / 0.6, y = u.y - 30 * K;
      g.save(); g.globalAlpha = 1 - f; g.beginPath(); g.arc(u.x, y, (30 + f * 30) * K, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 5 * K; g.strokeStyle = '#fff6c4'; g.stroke();
      const k2 = Math.max(1, 0.62 / cam.z); g.font = (13 * k2) + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3.5 * k2; g.strokeStyle = OL; g.strokeText('⚔ ×2.5', u.x, y - 34 * K - f * 16 * K); g.fillStyle = '#fff6c4'; g.fillText('⚔ ×2.5', u.x, y - 34 * K - f * 16 * K); g.restore();
    }
  }
}
const _drawMagicWd = drawMagic;
drawMagic = function (g, t) { _drawMagicWd(g, t); drawElemental(g, t); };
// the Grand Elemental's figure: a towering man of living water (drawn through v78's monster hook)
MON_ART[GELEM_ID] = function (g, t) {
  const sw = Math.sin(t * 2.2), bob = Math.sin(t * 1.6) * 2;
  const water = (path, a) => { path(); g.fillStyle = `rgba(90,175,230,${a})`; g.fill(); g.lineWidth = 3; g.strokeStyle = '#1d4f7a'; g.stroke(); };
  g.save(); g.scale(1.25, 1.25);
  g.fillStyle = 'rgba(60,140,210,0.25)'; g.beginPath(); g.ellipse(0, 2, 34, 8, 0, 0, 7); g.fill();
  // legs: two columns of falling water
  for (const s2 of [-1, 1]) water(() => { g.beginPath(); g.moveTo(s2 * 6, -60); g.quadraticCurveTo(s2 * 18, -30, s2 * 16 + sw * s2 * 2, 0); g.lineTo(s2 * 4, 0); g.quadraticCurveTo(s2 * 4, -30, s2 * 2, -60); g.closePath(); }, 0.75);
  // the body: broad shoulders and a waist that swirls
  water(() => { g.beginPath(); g.moveTo(-14, -56 + bob); g.quadraticCurveTo(-30, -96 + bob, -26, -122 + bob); g.quadraticCurveTo(0, -132 + bob, 26, -122 + bob); g.quadraticCurveTo(30, -96 + bob, 14, -56 + bob); g.quadraticCurveTo(0, -48 + bob, -14, -56 + bob); g.closePath(); }, 0.78);
  // arms
  for (const s2 of [-1, 1]) water(() => { g.beginPath(); g.moveTo(s2 * 22, -118 + bob); g.quadraticCurveTo(s2 * 44, -100 + bob + sw * s2 * 3, s2 * 40, -70 + bob); g.quadraticCurveTo(s2 * 34, -66 + bob, s2 * 32, -72 + bob); g.quadraticCurveTo(s2 * 32, -96 + bob, s2 * 18, -104 + bob); g.closePath(); }, 0.72);
  for (const s2 of [-1, 1]) { g.beginPath(); g.arc(s2 * 37, -68 + bob, 7, 0, 7); g.fillStyle = 'rgba(120,200,240,0.85)'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = '#1d4f7a'; g.stroke(); }
  // the head, with a crest that falls like a waterfall
  water(() => { g.beginPath(); g.ellipse(0, -138 + bob, 12, 14, 0, 0, 7); }, 0.85);
  water(() => { g.beginPath(); g.moveTo(-6, -150 + bob); g.quadraticCurveTo(0, -166 + bob, 8, -150 + bob); g.quadraticCurveTo(16, -136 + bob, 12, -116 + bob); g.quadraticCurveTo(8, -134 + bob, -6, -150 + bob); g.closePath(); }, 0.7);
  for (const ex of [-4.5, 4.5]) { g.beginPath(); g.arc(ex, -139 + bob, 2.2, 0, 7); g.fillStyle = '#eaffff'; g.fill(); }
  // light on the water: ripples and bubbles rising through the body
  g.strokeStyle = 'rgba(235,252,255,0.75)'; g.lineWidth = 2; g.lineCap = 'round';
  for (let k = 0; k < 4; k++) { const y = -70 - k * 14 + ((t * 18) % 14) + bob; g.beginPath(); g.moveTo(-14 + k * 2, y); g.quadraticCurveTo(-4, y - 4, 6 + k, y); g.stroke(); }
  for (let k = 0; k < 6; k++) { const f = (t * 0.6 + k / 6) % 1; g.globalAlpha = 1 - f; g.beginPath(); g.arc(Math.sin(k * 2.3 + t) * 12, -58 - f * 70 + bob, 2, 0, 7); g.fillStyle = '#eaffff'; g.fill(); }
  g.globalAlpha = 1;
  // splashes at the feet
  for (let k = 0; k < 5; k++) { const f = (t * 1.1 + k / 5) % 1, x = (k - 2) * 9; g.globalAlpha = 0.8 * (1 - f); g.beginPath(); g.arc(x + f * (k - 2) * 4, -f * 12, 2.4, 0, 7); g.fillStyle = '#bfe8ff'; g.fill(); }
  g.restore();
};

// ---------- the lost travelers: Woodlings give directions in exchange for knowledge ----------
// A Scout there: +30 Government research; an army: +30 Military; a Druid (alone or in an army): +30 Magic. Or leave them.
const TRAV_KNOW = 30;
function travUnits(B) {
  const here = S.units.filter(u => u.owner === ME && u.prov === B.prov);
  return { scout: here.some(u => u.kind === WAYFINDER), army: here.some(u => u.kind === 'army' && Object.keys(u.troops).some(k => k !== MAGE && u.troops[k] > 0) && !u.battle), druid: here.some(u => u.kind === MAGE || (u.kind === 'army' && (u.troops[MAGE] || 0) > 0)) };
}
const _showTravPopWd = showTravPop;
showTravPop = function (B) {
  if (!isWd(ME)) return _showTravPopWd(B);
  travBand = B;
  const el = $q('#travPop'), has = travUnits(B);
  if (!S.paused) { togglePause(); travPausedByMe = true; }
  $q('#paused').hidden = true;
  const btn = (tv, ok, label, small, need) => `<button type="button" data-tv="${tv}"${ok ? '' : ' disabled'} title="${ok ? '' : need}">${label}<small>${ok ? small : small + ' · ' + need}</small></button>`;
  el.innerHTML = `<button type="button" class="pop-x" data-tv="leave" aria-label="Dismiss" title="Dismiss">×</button><h2 id="travPopT">A lost band of travelers<span>at ${escHTML(provName(B.prov))}</span></h2><p>${B.n} weary travelers have lost their way in the woods. Show them the path home, and they will gladly share what they know in return.</p>
  <div class="dm-btns trav-btns">${btn('know-gov', has.scout, 'Your Scout guides them', `+${TRAV_KNOW} Government research`, `needs a ${UNIT_DEFS[WAYFINDER].name} here`)}${btn('know-mil', has.army, 'Your soldiers escort them', `+${TRAV_KNOW} Military research`, 'needs an army here')}${btn('know-mag', has.druid, `Your ${UNIT_DEFS[MAGE].name} leads them`, `+${TRAV_KNOW} Magic research`, `needs a ${UNIT_DEFS[MAGE].name} here`)}<button type="button" data-tv="leave">Leave them be<small>They ask again next time</small></button></div><div class="dm-btns"><button type="button" data-tv="look">Show me</button><button type="button" data-tv="leave">OK</button></div>`;
  el.hidden = false; sfx('wn_ally');
  setTimeout(() => { const b = el.querySelector('.dm-btns [data-tv="leave"]'); if (b) b.focus({ preventScroll: true }); }, 30);
};
const _travelersChooseWd = travelersChoose;
travelersChoose = function (how) {
  const B = travBand;
  if (!B || !/^know-/.test(how)) return _travelersChooseWd(how);
  const tree = how.slice(5), has = travUnits(B), ok = tree === 'gov' ? has.scout : tree === 'mil' ? has.army : has.druid;
  if (!ok) return toast('Nobody of yours here can do that.', true);
  addResearch(tree, TRAV_KNOW);
  S.travelers = S.travelers.filter(x => x !== B);
  toast(`${tree === 'gov' ? 'Your ' + UNIT_DEFS[WAYFINDER].name + ' shows' : tree === 'mil' ? 'Your soldiers escort' : 'Your ' + UNIT_DEFS[MAGE].name + ' leads'} the travelers onto the path home. In thanks they share what they know: +${TRAV_KNOW} ${TECH_TREES[tree].name} research.`);
  closeTravPop();
};

// ---------- pictures for the Woodlings' technologies, the grip, and the Elemental spells ----------
const WD_ICONS = (() => {
  const disc = c => g => ICO.disc(g, c);
  const champHelm = (g, x = 32, y = 36, s = 1) => {
    g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 8, -12); g.quadraticCurveTo(sd * 18, -24, sd * 22, -34); g.moveTo(sd * 13, -20); g.lineTo(sd * 24, -22); g.moveTo(sd * 18, -28); g.lineTo(sd * 12, -36); g.lineWidth = 6; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#e8d8b4'; g.stroke(); }
    g.beginPath(); g.moveTo(-13, -10); g.quadraticCurveTo(0, -24, 13, -10); g.lineTo(12, 10); g.quadraticCurveTo(6, 20, 0, 24); g.quadraticCurveTo(-6, 20, -12, 10); g.closePath(); g.fillStyle = '#d7c2f2'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
    g.fillStyle = '#1d1a22'; g.fillRect(-10, -2, 20, 5); g.fillStyle = '#d9b8ff'; g.fillRect(-7, -1, 4, 2.5); g.fillRect(3, -1, 4, 2.5);
    g.beginPath(); g.moveTo(-12, -6); g.quadraticCurveTo(0, -9, 12, -6); g.lineWidth = 2.4; g.strokeStyle = '#f4e3a1'; g.stroke();
    g.restore();
  };
  const rocksIco = g => { for (const [x, h] of [[18, 26], [32, 36], [46, 22]]) ICO.poly(g, [[x - 8, 56], [x - 6, 56 - h], [x, 52 - h - 6], [x + 6, 56 - h], [x + 8, 56]], '#a8a29a'); };
  const spiritIco = g => { ICO.disc(g, '#e6f9dc'); const gr = g.createRadialGradient(32, 34, 2, 32, 34, 24); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(1, 'rgba(150,230,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(32, 34, 24, 0, 7); g.fill(); g.lineCap = 'round'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(32 + sd * 5, 28); g.quadraticCurveTo(32 + sd * 14, 20, 32 + sd * 16, 8); g.moveTo(32 + sd * 11, 20); g.lineTo(32 + sd * 20, 18); g.moveTo(32 + sd * 14, 13); g.lineTo(32 + sd * 9, 6); g.lineWidth = 5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.6; g.strokeStyle = '#c9f7a8'; g.stroke(); } g.beginPath(); g.moveTo(24, 30); g.quadraticCurveTo(32, 24, 40, 30); g.quadraticCurveTo(38, 46, 32, 54); g.quadraticCurveTo(26, 46, 24, 30); g.closePath(); g.fillStyle = '#eaffdf'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke(); for (const x of [28.5, 35.5]) { g.beginPath(); g.arc(x, 36, 1.8, 0, 7); g.fillStyle = '#3f9b4b'; g.fill(); } };
  const water = g => { g.beginPath(); g.moveTo(32, 6); g.quadraticCurveTo(50, 30, 46, 44); g.quadraticCurveTo(40, 58, 32, 58); g.quadraticCurveTo(24, 58, 18, 44); g.quadraticCurveTo(14, 30, 32, 6); g.closePath(); g.fillStyle = '#7fc8ee'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.strokeStyle = '#eaffff'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(24, 40); g.quadraticCurveTo(26, 50, 34, 52); g.stroke(); };
  return {
    stable(g) { ICO.poly(g, [[8, 56], [8, 32], [32, 18], [56, 32], [56, 56]], '#6b4a2e'); ICO.poly(g, [[4, 34], [32, 12], [60, 34], [56, 38], [32, 20], [8, 38]], '#5f8a3a'); ICO.poly(g, [[26, 56], [26, 40], [38, 40], [38, 56]], '#2a2420', 2); champHelm(g, 32, 34, 0.42); },
    'horse-breeding'(g) { itemIcon(g, 'ancienthammer'); },
    'horse-training'(g) { itemIcon(g, 'oblivion'); },
    'rep-horsespeed'(g) { champHelm(g, 30, 40, 0.9); for (const y of [20, 30, 40]) ICO.line(g, [46, y], [58, y], '#6fd3ea', 3); },
    'rep-cavhp'(g) { champHelm(g, 30, 40, 0.9); g.beginPath(); g.moveTo(52, 26); g.bezierCurveTo(40, 16, 44, 6, 52, 12); g.bezierCurveTo(60, 6, 64, 16, 52, 26); g.fillStyle = '#e0526a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); },
    twohand(g) { itemIcon(g, 'champsword'); for (const [x, y] of [[30, 38], [36, 32]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fillStyle = '#c9aee6'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); } },
    'school-elemental'(g) { disc('#ddf1f5')(g); rocksIco(g); g.save(); g.translate(14, -6); g.scale(0.55, 0.55); water(g); g.restore(); },
    rockarmor(g) { disc('#ececE6')(g); for (let k = 0; k < 6; k++) { const q = k * 1.047, x = 32 + Math.cos(q) * 18, y = 34 + Math.sin(q) * 18; ICO.poly(g, [[x - 6, y + 4], [x - 4, y - 5], [x + 4, y - 6], [x + 7, y + 2], [x + 2, y + 6]], '#a8a29a', 2); } champHelm(g, 32, 38, 0.45); },
    wrocks(g) { disc('#e8f6fa')(g); rocksIco(g); for (const r of [8, 14]) { g.beginPath(); g.arc(32, 22, r, Math.PI * 1.15, Math.PI * 1.85); g.lineWidth = 2.4; g.strokeStyle = '#3f8fa8'; g.stroke(); } },
    townportal(g) { disc('#e3f4fb')(g); g.beginPath(); g.ellipse(32, 34, 14, 22, 0, 0, 7); g.fillStyle = '#6fd3ea'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(32, 34, 8, 14, 0, 0, 7); g.fillStyle = '#eaffff'; g.fill(); ICO.poly(g, [[26, 40], [26, 32], [32, 26], [38, 32], [38, 40]], '#8a74a3', 2); },
    forestspirit(g) { spiritIco(g); },
    gelemental(g) { disc('#e3f4fb')(g); water(g); for (const ex of [28, 36]) { g.beginPath(); g.arc(ex, 30, 2.2, 0, 7); g.fillStyle = '#eaffff'; g.fill(); } }
  };
})();
const _techIconWd = techIcon;
techIcon = function (id) {
  const x = TECH_BY_ID[id], mine = WD_ICONS[id] && (isWd(ME) || (x && x.race === 'wood'));
  return mine ? ticoCanvas('tech:wd:' + id, g => { WD_ICONS[id](g); if (x && x.rep) repeatBadge(g); }) : _techIconWd(id);
};
const _equipIconWd = equipIcon;
equipIcon = function (kind, key) {
  if (kind !== 'grip') return _equipIconWd(kind, key);
  return ticoCanvas('eq:grip:' + key, g => {
    itemIcon(g, key === 'two' ? 'champsword' : 'dirk');
    const hands = key === 'two' ? [[28, 40], [36, 32]] : [[30, 38]];
    for (const [x, y] of hands) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fillStyle = '#c9aee6'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); }
  });
};

// ---------- every frame ----------
const _stepGPCWd = stepGPC;
stepGPC = function (t, dt) { _stepGPCWd(t, dt); try { if (S.started) { stepElementals(t); stepSpirits(); } } catch (e) { reportError(e, 'wood'); } };
const resetWoodPhase3 = () => { S.wrocks = []; S.fspirits = []; S.gelems = []; S.portalFx = []; elemAim = null; };
const _applyRaceWd3 = applyRace;
applyRace = function (race) { _applyRaceWd3(race); resetWoodPhase3(); };

window.__wood = { aimClick: (p, r) => pathAimClick(p, r), aiRedesign: N => aiRedesign(N), twoMul: a => twoMul(a), raiseRock: (a, t) => raiseRock(a, t), finishRocks: (c, q) => finishRocks(c, q), finishSpirit: (c, q) => finishSpirit(c, q), finishPortal: c => finishPortal(c), finishElemental: c => finishElemental(c), wrockNbrs: c => wrockNbrs(c), fspiritNbrs: c => fspiritNbrs(c), showTravPop: B => showTravPop(B), travelersChoose: h => travelersChoose(h), champStats: d => champStats(d), GELEM_ID, isWd, woodSpecFor: d => woodSpecFor(d), swArtId: (id, o) => swArtId(id, o), treeNbr, applyRace: r => applyRace(r), toggleArmory: o => toggleArmory(o), tradeGold: () => tradeGold(), speedMod: u => speedMod(u), pathNbr: (u, a) => pathNbr(u, a) };
