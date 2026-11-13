
// ================= v98: mana for Magic Users, and the spells reworked around it =================
// Mages, Warlocks and Druids ("Magic Users") carry mana: they start with 25 and hold up to 100 (Magic Well 150,
// Magic Abundance 200). Every 10 s payout each Magic User regains 1 / 2 / 3 mana (v99) for every Tier I / II / III Magic
// Barracks (Mage Tower, Warlock Tower, Grove and their upgrades) of the nation; each gets the full amount.
// A lone Magic User keeps his mana in u.mana; once he joins an army it lives on the army (a.mana; one per army since v97).

const MANA_START = 25, MANA_CAPS = [100, 150, 200], MANA_REGEN = [0, 1, 2, 3];   // v99: was 2 / 5 / 10
const MANA_BLUE = '#3f7fe8', MANA_BLUE_D = '#2556b0';
S.manaPool = []; S.eyes = []; S.haunts = []; S.sacreds = []; S.reveals = [];
const manaCap = o => techOf(o, 'magicabund') ? MANA_CAPS[2] : techOf(o, 'magicwell') ? MANA_CAPS[1] : MANA_CAPS[0];
const manaOf = c => !c ? 0 : c.mana === undefined ? MANA_START : c.mana;
function manaRegen(o) {
  let n = 0;
  for (const [p, list] of S.extras) { if (nationOf(p) !== o || (S.occ.has(p) && S.occ.get(p) !== o)) continue; for (const e of list) if (e.type === 'magetower') n += MANA_REGEN[Math.min(3, e.level || 1)]; }
  return n;
}
const isCasterAny = u => !!u && magesIn(u) > 0;
const channeling = c => !!c.cast && (c.cast.spell === 'harvest' || c.cast.spell === 'q:fspirit');
const castingNow = c => !!c.cast || !!c.quake;   // v99: no regeneration while any spell is being cast
function spendMana(c, n) { c.mana = Math.max(0, manaOf(c) - n); cmdKey = ''; }

// mana follows a Magic User from one unit to the next: when he joins an army, leaves one, or two armies combine,
// whoever carries him next picks up what he had (anything that loses its Magic User leaves its mana in a short-lived pool
// in that province, and the next unit there that gains one takes it)
let manaPrev = new Map(), manaPrevT = -1;
function syncMana(t) {
  if (t < manaPrevT) manaPrev = new Map();
  manaPrevT = t;
  const now = new Map();
  for (const u of S.units) {
    const n = magesIn(u);
    if (n > 0) now.set(u.id, u);
    else if (u.mana !== undefined) { S.manaPool.push({ owner: u.owner, prov: u.prov, mana: u.mana, t }); delete u.mana; }
  }
  for (const [id, u] of manaPrev) if (!now.has(id) && !S.units.includes(u) && u.mana !== undefined) S.manaPool.push({ owner: u.owner, prov: u.prov, mana: u.mana, t });
  for (const u of now.values()) if (u.mana === undefined) {
    const i = S.manaPool.findIndex(r => r.owner === u.owner && r.prov === u.prov);
    if (i >= 0) { u.mana = S.manaPool[i].mana; S.manaPool.splice(i, 1); } else u.mana = MANA_START;
  }
  manaPrev = now;
  if (S.manaPool.length) S.manaPool = S.manaPool.filter(r => t - r.t < 2);
}
function regenMana() {
  const per = new Map();
  for (const c of S.units) {
    if (!isCasterAny(c) || castingNow(c)) continue;   // v99: casting anything halts the caster's regeneration
    if (!per.has(c.owner)) per.set(c.owner, [manaRegen(c.owner), manaCap(c.owner)]);
    const [r, cap] = per.get(c.owner);
    c.mana = Math.min(cap, manaOf(c) + r);
  }
  cmdKey = '';
}
{ const _pay = payday; payday = function (t) { _pay(t); try { regenMana(); paySacredPyres(); } catch (e) { reportError(e, 'mana'); } }; }

// ---------- what each spell costs ----------
// a number is paid when the spell is cast; 'all' takes every point the caster has; 'drain' costs 1 mana a second while channeling
const SPELL_MANA = { harvest: 'drain', mending: 25, eyes: 25, graverob: 'all', haunt: 25, trading: 'all', mind: 50, stasis: 50, rift: 100,
  spyre: 25, ftrap: 50, pfire: 50, sacred: 0, wrocks: 25, tportal: 100, fspirit: 'drain', gelem: 100 };
const AUTO_MANA = 50;          // Hardened Skin, Cursed Weapons, Risen Dead, Fiery Weapons, Rock Armor
const PATH_MANA = 100;         // Speak with the Forest, Underworld Passage, Terrascaping (opening or closing)
const SPELL2_MANA = { shock: 50, quake: 200 };
const CAST_TIME = 3;           // most spells are now a 3-second cast
const manaNeed = k => { const m = SPELL_MANA[k]; return m === 'all' || m === 'drain' ? 1 : m || 0; };
const manaText = k => { const m = SPELL_MANA[k]; return m === 'all' ? 'all of the caster’s mana' : m === 'drain' ? '1 mana a second while channeling (no regeneration meanwhile)' : m ? m + ' mana' : 'no mana'; };
const notEnough = (c, n) => `Not enough mana (${Math.floor(manaOf(c))}/${n})`;

// ---------- techs: Magic Well, Magic Abundance, Eyes of the Forest, Haunt ----------
for (const [id, tier, req, school, cost, name, blurb, race] of [
  ['magicwell', 2, null, '*', 100, 'Magic Well', 'Your Magic Users can hold up to 150 mana (100 before).', null],
  ['magicabund', 3, 'magicwell', '*', 200, 'Magic Abundance', 'Your Magic Users can hold up to 200 mana.', null],
  ['eyesforest', 1, 'school-life', 'life', 40, 'Eyes of the Forest', 'A Mage looks through a border of trees beside him (3 seconds of casting, 25 mana): both provinces on either side of it are in sight for 1 minute.', ['realm', 'wood']],
  ['haunt', 1, 'school-death', 'death', 40, 'Haunt', 'A Mage haunts the province he stands in (25 mana, no cooldown): you keep seeing it for 1 minute, even after he leaves.', ['realm', 'swamp']]
]) {
  if (TECH_BY_ID[id]) continue;
  const x = { id, tree: 'mag', tier, cost, req, school, name, blurb, gold: 0 }; if (race) x.race = race;
  TECHS.push(x); TECH_BY_ID[id] = x;
}
LINES.eyes = ['eyesforest']; LINES.haunt = ['haunt'];
Object.assign(MAGIC_ICONS, {
  magicwell(g) { ICO.disc(g, '#e3ecff'); ICO.poly(g, [[14, 40], [50, 40], [46, 58], [18, 58]], '#9a958c', 2.4); g.beginPath(); g.ellipse(32, 40, 18, 6, 0, 0, 7); g.fillStyle = MANA_BLUE; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); manaStarIco(g, 32, 22, 11); },
  magicabund(g) { ICO.disc(g, '#e3ecff'); manaStarIco(g, 22, 40, 10); manaStarIco(g, 42, 40, 10); manaStarIco(g, 32, 22, 12); },
  eyesforest(g) { ICO.disc(g, '#e3f6e0'); for (const x of [14, 50]) ICO.poly(g, [[x - 9, 52], [x, 18], [x + 9, 52]], '#3f8a3a', 2.2); g.beginPath(); g.ellipse(32, 36, 13, 8, 0, 0, 7); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(32, 36, 4.5, 0, 7); g.fillStyle = '#3f9b4b'; g.fill(); g.stroke(); },
  haunt(g) { ICO.disc(g, '#efe6fb'); g.beginPath(); g.moveTo(18, 54); g.lineTo(18, 30); g.quadraticCurveTo(18, 12, 32, 12); g.quadraticCurveTo(46, 12, 46, 30); g.lineTo(46, 54); g.lineTo(40, 48); g.lineTo(35, 54); g.lineTo(29, 48); g.lineTo(24, 54); g.closePath(); g.fillStyle = '#f2eefa'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke(); g.fillStyle = OL; g.beginPath(); g.arc(27, 30, 3, 0, 7); g.arc(37, 30, 3, 0, 7); g.fill(); }
});
function manaStarIco(g, cx, cy, r) {
  g.beginPath(); for (let k = 0; k < 14; k++) { const a = -Math.PI / 2 + k * Math.PI / 7, rr = k % 2 ? r * 0.45 : r; g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath();
  g.fillStyle = MANA_BLUE; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.lineJoin = 'round'; g.stroke();
}
// the techs' texts, now in mana
const V98_BLURBS = {
  harvest: 'A Mage channels it for as long as he stands still: every Farm you own gives 10% more food. It drains 1 mana a second, and he regains none while channeling. One Mage casts it at a time.',
  skin: 'Autocast (50 mana, no cooldown): when an army with a Mage starts a battle, its soldiers get +5% health.',
  stoneskin: 'Hardened Skin gives +10% health.', diamondskin: 'Hardened Skin gives +15% health.',
  mending: 'A Mage heals an army’s wounds back to full over 1 minute. 25 mana, no cooldown.',
  rejuvenation: 'Healing takes 30 seconds.', restoration: 'Healing is instant.',
  forest: 'A Mage can open a path through a border of trees after 2 minutes of casting (100 mana). Lumber Mills are unaffected.',
  commune: 'Opening a forest path takes 1 minute.', arboreal: 'A Mage can close a forest path again with 1 minute of casting (100 mana).',
  terrascape: 'A Mage grows a line of trees along an open border, with a forest path left open in the middle: only a path through the trees remains. 5 minutes of casting, 100 mana.',
  curse1: 'Autocast (50 mana): when an army with a Mage starts a battle, its weapons deal +5% damage. 5-minute cooldown per army.',
  curse2: 'Cursed Weapons deal +10% damage; cooldown 3 minutes.', curse3: 'Cursed Weapons deal +15% damage; cooldown 90 seconds.',
  underworld: 'A Mage can open a tunnel through a mountain border after 2 minutes of casting (100 mana).',
  hallways: 'Opening a mountain tunnel takes 1 minute.', sealed: 'A Mage can seal a mountain tunnel again with 1 minute of casting (100 mana).',
  risen: 'Autocast: the first time a soldier of the army falls in a battle, the Mage spends 50 mana and the dead rise: that soldier and the next 4 to fall get straight back up, looking rather worse for it (same strength). Then it stops; when the battle ends it has a 2-minute cooldown. One Mage keeps this or Cursed Weapons ready, not both.',
  necro: 'Risen Dead raises 7 soldiers in a battle.', armyofdeath: 'Risen Dead raises 10 soldiers in a battle.',
  graverob: 'A 3-second cast that spends all of the Mage’s mana: 1 gold for every point. Then the nation waits 3 minutes.',
  deathtax: 'Grave Robbing gives 2 gold for every point of mana.', charon: 'Grave Robbing gives 3 gold for every point of mana.',
  clearthoughts: 'A 3-second cast (50 mana): every army within 3 provinces of the Mage is revealed for 20 seconds. 40-second cooldown.',
  mindread: 'Clear Thoughts reveals every army on the map.',
  trading: 'A 3-second cast that spends all of the Mage’s mana: 1 food, 1 gold and 1 wood for every 3 points. Then the nation waits 3 minutes.',
  stockmarket: 'Trading gives 2 of each resource for every 3 points of mana.', planar: 'Trading gives 1 of each resource for every point of mana.',
  stasis: 'A Mage sets a trap in his province (3 seconds of casting, 50 mana); the next enemy army there can’t leave for 10 seconds (it can still fight). One trap at a time; no cooldown.',
  prison: 'The trap holds for 20 seconds.',
  rift: 'Pick any explored province you may enter (your land, unclaimed land, or a nation you are at war or in a truce with): after 3 seconds of casting (100 mana) the Mage and his army are carried there. 2-minute cooldown for the nation.',
  portal: 'Teleportation Rift’s cooldown is 15 seconds.',
  fiery1: 'Autocast (50 mana, no cooldown): when an army with a Warlock starts a battle, every blow has a 5% chance to strike twice as hard.',
  fiery2: 'Fiery Weapons: a 10% chance of a double blow.', fiery3: 'Fiery Weapons: a 15% chance of a double blow.',
  scoutpyre: 'A Warlock lights a pyre where he stands (3 seconds of casting, 25 mana). For 1 minute it sees every neighboring province in its line of sight. 1-minute cooldown per Warlock.',
  firetrap: 'A Warlock buries a fire trap in his province (3 seconds of casting, 50 mana). The next enemy army to enter any part of that province is engulfed: 150 damage that ignores armor, to its front line. One trap per Warlock.',
  blazetrap: 'Fire traps deal 300 damage.', molttrap: 'Fire traps deal 450 damage.',
  sacredpyre: 'A Warlock lights a Sacred Pyre where he stands (3 seconds of casting). For 1 minute it burns 10 wood every 10 s for 110 gold. Then the nation waits 3 minutes.',
  pathfire: 'A Warlock fires up his army (50 mana): 100% faster for 10 seconds. 1-minute cooldown per Warlock.',
  rockarmor: 'Autocast (50 mana, no cooldown): when an army with a Druid starts a battle, plates of stone gather round it: a shield worth 10% of the army’s total health soaks up the damage before any soldier is hurt.',
  wrocks: 'A Druid raises whispering stones on a mountain border of the province he stands in (3 seconds of casting, 25 mana): both provinces on either side are in sight for 1 minute.',
  townportal: 'After 3 seconds of casting (100 mana), a Druid and the army he is in are carried to your capital. 5-minute cooldown per Druid.',
  forestspirit: 'A Druid channels a Forest Spirit into the province he stands in: while he keeps it up, the province makes twice the gold, wood, food and research. It drains 1 mana a second, and he regains none meanwhile.',
  gelemental: 'A Druid summons a towering man of living water for 2 minutes (3 seconds of casting, 100 mana): 500 health, no armor, 50 damage a swing. He joins the Druid’s army (or forms one), fights, and can capture provinces. 5-minute cooldown per Druid.',
  earthquake: 'A Mage standing in an enemy province your army occupies can cast an Earthquake (200 mana: it needs Magic Abundance): after 30 seconds every building in that province is destroyed, and every wall on its borders.'
};
for (const [id, b] of Object.entries(V98_BLURBS)) if (TECH_BY_ID[id]) TECH_BY_ID[id].blurb = b;
if (SW_TEXT.techs.earthquake) SW_TEXT.techs.earthquake[1] = V98_BLURBS.earthquake.replace('A Mage', 'A Warlock');

// ---------- the reworked numbers ----------
SPELL2.shock.time = 15; SPELL2.quake.time = 30;
const RISEN_N = [0, 5, 7, 10];
const GRAVE_RATE = [0, 1, 2, 3], TRADE_RATE = [0, 1 / 3, 2 / 3, 1];
const MIND = { show: 20, cd: 40 }, RIFT_CD = [0, 120, 15];
const SEE_TIME = 60;           // Eyes of the Forest, Whispering Rocks, Haunt, Scouting Pyre
const FIRE_DMG = [0, 150, 300, 450];
const SACRED = { dur: 60, gold: 110, wood: 10, cd: 180 };
SPYRE.dur = SEE_TIME; SPYRE.wood = 0;
{ const D = DSTATS[GELEM_ID]; D.hp = 500; D.atk = 50; D.armor = 0; D.red = 0; UNIT_DEFS[GELEM_ID].blurb = 'A towering man of living water, summoned by a Druid for 2 minutes: 500 health, no armor, 50 damage a swing.'; }

// ---------- casting: 3-second casts ('q:' + spell) finish here ----------
function beginCast(c, k, data = {}, dur = CAST_TIME) {
  const m = SPELL_MANA[k]; if (typeof m === 'number' && m) spendMana(c, m);
  startCast(c, 'q:' + k, dur, data);
}
const FINISH = {};
const lv = line => lvl(line);
// Mending: 25 mana, no cooldown
{ const go = CAST.mending.go; CAST.mending.go = function (c) { spendMana(c, SPELL_MANA.mending); go(c); delete S.cd.mending; }; }
// Harvest: needs some mana to start (the drain is in stepMagic below)
// Clear Thoughts / Mind Reading: 3 s, then armies are revealed for 20 s; 40 s cooldown
CAST.mind.instant = false; CAST.mind.go = c => { beginCast(c, 'mind'); toast(`${c.name} gathers his thoughts: 3 s of casting.`); };
FINISH.mind = (c, cs, t) => { const all = lv('mind') >= 2; S.reveals.push({ prov: c.prov, all, until: t + MIND.show }); S.cd.mind = t + MIND.cd; toast(all ? 'Mind Reading: every army on the map is revealed for 20 s.' : 'Clear Thoughts: every army within 3 provinces is revealed for 20 s.'); };
// Grave Robbing / Interdimensional Trading: 3 s, all of the caster's mana into resources, then 3 minutes' wait
const resRep = sp => 1 + 0.02 * repLv(sp === 'graverob' ? 'rep-graverob' : 'rep-trading');
const resOthers = (c, k) => S.units.some(v => v !== c && v.cast && v.cast.spell === 'q:' + k) ? 'Another Mage is already casting this' : null;
CAST.graverob.why = c => resOthers(c, 'graverob');
CAST.graverob.go = c => { beginCast(c, 'graverob'); toast(`${TECH_BY_ID[lineTech('graverob')].name}: 3 s of casting.`); };
FINISH.graverob = (c, cs, t) => {
  const n = Math.floor(manaOf(c)), g = Math.round(n * GRAVE_RATE[lv('graverob')] * resRep('graverob'));
  spendMana(c, n); S.stock.gold += g; S.cd.graverob = t + RES_CD;
  toast(`${TECH_BY_ID[lineTech('graverob')].name}: ${n} mana became ${g} gold. Next cast in ${RES_CD / 60} minutes.`); sfx('mg_death', { prov: c.prov });
};
CAST.trading.why = c => resOthers(c, 'trading');
CAST.trading.go = c => { beginCast(c, 'trading'); toast(`${TECH_BY_ID[lineTech('trading')].name}: 3 s of casting.`); };
FINISH.trading = (c, cs, t) => {
  const n = Math.floor(manaOf(c)), each = Math.floor(n * TRADE_RATE[lv('trading')] * resRep('trading'));
  spendMana(c, n); for (const k of RES) S.stock[k] += each; S.cd.trading = t + RES_CD;
  toast(`Trading across worlds: ${n} mana became ${each} of each resource. Next cast in ${RES_CD / 60} minutes.`); sfx('mg_arcane', { prov: c.prov });
};
// Stasis Trap: 3 s, 50 mana, no cooldown (one trap at a time)
CAST.stasis.instant = false; CAST.stasis.go = c => { beginCast(c, 'stasis'); toast(`${c.name} weaves a stasis trap: 3 s of casting.`); };
FINISH.stasis = (c, cs, t) => { if (S.trap) return; S.trap = { prov: c.prov, t0: t }; toast(`Stasis trap set in ${provName(c.prov)}. The next enemy army there is held for ${STASIS[lv('stasis')]} s.`); };
// Teleportation Rift: pick a destination; 3 s, 100 mana; the Mage and his army go there. 2-minute nationwide cooldown (15 s with Teleportation Portal)
S.rift = null;
function riftWhy(c, p) {
  if (p === c.prov) return 'Already here';
  if (!S.explored.has(p)) return 'Explore that province first';
  if (isDeathMtn(p)) return 'No magic reaches Death Mountain';
  if (!nationOk(c, p)) return 'Another nation’s land (no war and no truce): you can’t go there';
  return null;
}
CAST.rift.name = () => TECH_BY_ID.rift.name; CAST.rift.target = c => c; CAST.rift.why = () => null; CAST.rift.instant = false;
CAST.rift.go = c => aimSpell(c, 'rift', 'Click the province to teleport to. Right-click or Esc cancels.');
const AIMED = {};
AIMED.rift = (c, p) => { const why = castWhy(c, 'rift') || riftWhy(c, p); if (why) return toast('Teleportation Rift: ' + why.toLowerCase() + '.', true); beginCast(c, 'rift', { to: p }); toast(`${c.name} opens a rift to ${provName(p)}: 3 s of casting.`); };
FINISH.rift = (c, cs, t) => {
  const why = riftWhy(c, cs.to); if (why) return toast('The rift collapses: ' + why.toLowerCase() + '.', true);
  teleport(c, cs.to); S.cd.rift = t + RIFT_CD[Math.max(1, lv('rift'))];
  toast(`${c.name} steps through the rift to ${provName(cs.to)}.`);
};
function teleport(c, to) {
  S.portalFx.push({ x: c.x, y: c.y, prov: c.prov, t0: S.t });
  c.path = []; c.moving = false; c.surveyQueue = []; c.lastProv = c.prov; c.prov = to; c.slot = freeSlot(to, c); [c.x, c.y] = slotPos(to, c.slot); c.riftFx = S.t; c.final = undefined;
  S.portalFx.push({ x: c.x, y: c.y, prov: to, t0: S.t });
  computeFog(); fogDirty = true; sfx('mg_rift', { prov: to });
}
// Haunt: click any explored settlement; 25 mana; that province is in sight for 1 minute
CAST.haunt = { name: () => TECH_BY_ID.haunt.name, line: 'haunt', instant: true, why: c => hauntWhy(c.prov), go: c => AIMED.haunt(c, c.prov) };   // v99: it haunts the province the Mage stands in
const hauntWhy = p => !S.explored.has(p) ? 'Explore that province first' : S.haunts.some(h => h.prov === p && h.owner === ME && h.until > S.t) ? 'Already haunted' : null;
AIMED.haunt = (c, p) => {
  const why = castWhy(c, 'haunt') || hauntWhy(p); if (why) return toast('Haunt: ' + why.toLowerCase() + '.', true);
  spendMana(c, SPELL_MANA.haunt); S.haunts.push({ prov: p, owner: ME, t0: S.t, until: S.t + SEE_TIME }); computeFog(); fogDirty = true;
  sfx('mg_death', { prov: p }); toast(`A restless spirit haunts ${provName(p)}: you see it for 1 minute.`);
};
// Eyes of the Forest (Herbomancy) and Whispering Rocks (Elemental): a border of trees / mountains beside the caster; 3 s; both sides in sight for 1 minute
const seeNbrs = (c, kind) => allNbr[c.prov].filter(q => (kind === 'eyes' ? treeEdge(c.prov, q) : mtnEdge(c.prov, q)) >= 0);
function seeWhy(c, kind, q) {
  const list = seeNbrs(c, kind);
  if (q === undefined) return list.length ? null : kind === 'eyes' ? 'No border of trees here' : 'No mountain border here';
  if (!allNbr[c.prov].includes(q)) return `The ${UNIT_DEFS[MAGE].name} must stand next door`;
  if (!list.includes(q)) return kind === 'eyes' ? 'No border of trees there' : 'No mountain border there';
  return null;
}
for (const kind of ['eyes', 'wrocks']) {
  const nm = () => TECH_BY_ID[kind === 'eyes' ? 'eyesforest' : 'wrocks'].name;
  CAST[kind] = { name: nm, line: kind, instant: false, why: c => seeWhy(c, kind),
    go(c) { const list = seeNbrs(c, kind); if (list.length === 1) return AIMED[kind](c, list[0]); aimSpell(c, kind, `Click the neighboring province across the ${kind === 'eyes' ? 'trees' : 'mountains'}. Right-click or Esc cancels.`); } };
  AIMED[kind] = (c, q) => { const why = castWhy(c, kind) || seeWhy(c, kind, q); if (why) return toast(nm() + ': ' + why.toLowerCase() + '.', true); beginCast(c, kind, { to: q }); sfx('mg_life', { prov: c.prov }); toast(`${nm()} toward ${provName(q)}: 3 s of casting.`); };
  FINISH[kind] = (c, cs, t) => {
    const why = seeWhy(c, kind, cs.to); if (why) return toast(nm() + ': ' + why.toLowerCase() + '.', true);
    const i = kind === 'eyes' ? treeEdge(c.prov, cs.to) : mtnEdge(c.prov, cs.to), rec = { owner: ME, a: c.prov, b: cs.to, link: linkOf(c.prov, cs.to), edge: i, t0: t, until: t + SEE_TIME };
    if (kind === 'eyes') S.eyes.push(rec); else S.wrocks.push(rec);
    computeFog(); fogDirty = true; miniDirty = true;
    toast(`${nm()}: ${provName(c.prov)} and ${provName(cs.to)} are in sight for 1 minute.`);
  };
}
// Scouting Pyre: 3 s, 25 mana (no wood), lasts 1 minute
{ const why0 = CAST.spyre.why; CAST.spyre.why = c => { const w = why0(c); return w && /wood/.test(w) ? null : w; }; }
CAST.spyre.instant = false; CAST.spyre.go = c => { beginCast(c, 'spyre'); toast(`${c.name} builds up a Scouting Pyre: 3 s of casting.`); };
FINISH.spyre = (c, cs, t) => { S.spyres.push({ prov: c.prov, owner: ME, t0: t, until: t + SPYRE.dur }); S.cd['spyre' + c.id] = t + perWarlockCd(c, SPYRE.cd); computeFog(); toast(`A Scouting Pyre blazes up in ${provName(c.prov)}: for 1 minute it sees every neighboring province in its line of sight.`); };
// Fire Trap: 3 s, 50 mana; 150 / 300 / 450 damage that ignores armor, to the front line
CAST.ftrap.instant = false; CAST.ftrap.go = c => { beginCast(c, 'ftrap'); toast(`${c.name} buries a fire trap: 3 s of casting.`); };
FINISH.ftrap = (c, cs, t) => {
  if (CAST.ftrap.why(c)) return toast('Fire Trap: ' + CAST.ftrap.why(c).toLowerCase() + '.', true);
  const L = lv('ftrap'); S.ftraps.push({ prov: c.prov, owner: ME, lv: L, mult: Math.pow(1.1, repLv('rep-ftrap')), t0: t, ignore: S.units.filter(v => v.kind === 'army' && v.prov === c.prov && hostile(v.owner, ME)).map(v => v.id) });
  toast(`${TECH_BY_ID[lineTech('ftrap')].name} set in ${provName(c.prov)}. The next enemy army to enter is engulfed: ${FIRE_DMG[L]} damage to its front line, armor or not.`);
};
// damage that ignores armor, dealt to the soldiers in the front line only (the whole army when it fights as one line)
function pureFront(a, dmg) {
  let killed = 0; const lay = rowSync(a), front = lay ? { ...lay.f } : Object.fromEntries(Object.entries(a.troops).filter(([k, n]) => k !== MAGE && n > 0));
  for (;;) {
    const ks = Object.keys(front).filter(k => front[k] > 0 && a.troops[k] > 0); if (!ks.length) break;
    const tot = ks.reduce((n, k) => n + front[k], 0); let r = Math.random() * tot, k = ks[0];
    for (const kk of ks) { r -= front[kk]; if (r <= 0) { k = kk; break; } }
    const hp = hpOf(a, k); if (dmg < hp * 0.99) break;
    dmg -= hp; front[k]--;
    if (lay && a.battle) rowFall(a, lay, k, true);
    ghoulFall(a, k); a.troops[k]--; if (!a.troops[k]) delete a.troops[k]; killed++;
  }
  if (troopCount(a) <= 0) removeArmy(a);
  if (a.owner === ME) computeIncome();
  return killed;
}
// Path of Fire: 50 mana
{ const go = CAST.pfire.go; CAST.pfire.go = function (c) { spendMana(c, SPELL_MANA.pfire); go(c); }; }
// Sacred Pyre: no longer a building. 3 s; a pyre burns where the Warlock stands for 1 minute: 10 wood -> 110 gold every 10 s. 3-minute nationwide cooldown
CAST.sacred = { name: () => TECH_BY_ID.sacredpyre.name, line: 'sacred', instant: false, why: c => resOthers(c, 'sacred'), go: c => { beginCast(c, 'sacred'); toast(`${c.name} raises a Sacred Pyre: 3 s of casting.`); } };
FINISH.sacred = (c, cs, t) => { S.sacreds.push({ prov: c.prov, owner: ME, x: c.x + 30 * UKK, y: c.y + 4 * UKK, t0: t, until: t + SACRED.dur }); S.cd.sacred = t + SACRED.cd; sfx('mg_arcane', { prov: c.prov }); toast(`A Sacred Pyre burns in ${provName(c.prov)}: for 1 minute it turns ${SACRED.wood} wood into ${SACRED.gold} gold every 10 s.`); };
function paySacredPyres() {
  if (!S.sacreds.length) return;
  let short = false;
  for (const P of S.sacreds) { if (P.owner !== ME || P.until <= S.t) continue; if (S.stock.wood < SACRED.wood) { short = true; continue; } S.stock.wood -= SACRED.wood; S.stock.gold += SACRED.gold; }
  if (short) toast(`A Sacred Pyre has no wood to burn (it needs ${SACRED.wood} every 10 s).`, true);
}
// a lone Warlock no longer raises Sacred Pyre buildings (old ones keep burning)
{ const g0 = Object.getOwnPropertyDescriptor(CMD, MAGE).get; Object.defineProperty(CMD, MAGE, { configurable: true, get() { return g0.call(CMD).filter(c => c.id !== 'pyrebuild'); } }); }
// Rock Armor, Hardened Skin, Fiery Weapons: no cooldown (see the battle join below). Town Portal: 3 s, 100 mana
CAST.tportal.go = c => { spendMana(c, SPELL_MANA.tportal); startCast(c, 'tportal', CAST_TIME); toast(`${c.name} opens a Town Portal to ${provName(capitalOf(ME))}: 3 s of casting.`); };
// Grand Elemental: 3 s, 100 mana
CAST.gelem.go = c => { spendMana(c, SPELL_MANA.gelem); startCast(c, 'gelem', CAST_TIME); toast(`${c.name} begins to call up a Grand Elemental: 3 s of casting.`); };
// Forest Spirit: channeled in the Druid's own province; doubles what it makes and its research
CAST.fspirit = { name: () => TECH_BY_ID.forestspirit.name, line: 'fspirit', instant: false,
  why: c => !owned(c.prov) || S.occ.has(c.prov) ? 'Channel it in a province of yours' : S.units.some(v => v !== c && v.cast && v.cast.spell === 'q:fspirit' && v.prov === c.prov) ? 'A Forest Spirit is already channeled here' : null,
  go(c) { startCast(c, 'q:fspirit', Infinity); computeIncome(); provKey = ''; toast(`${c.name} channels a Forest Spirit: ${provName(c.prov)} makes twice the resources and research while he keeps it up (1 mana a second).`); } };
S.fspirits = [];
const spiritProv = (p, o) => S.units.some(c => c.owner === o && c.prov === p && c.cast && c.cast.spell === 'q:fspirit' && isCasterAny(c));
{ const pi = provinceIncome; provinceIncome = function (p, b) { const y = pi(p, b); if (b && spiritProv(p, b.owner)) for (const k of Object.keys(y)) if (typeof y[k] === 'number' && y[k] > 0) y[k] *= 2; return y; }; }
{ const pr = provResearch; provResearch = function (p) { const r = pr(p); if (owned(p) && spiritProv(p, ME)) for (const k of Object.keys(r)) if (typeof r[k] === 'number') r[k] *= 2; return r; }; }
{ const cc = cancelCast; cancelCast = function (c, why) { const sp = c && c.cast && c.cast.spell; cc(c, why); if (sp === 'q:fspirit') { computeIncome(); provKey = ''; } }; }
// the buttons: Eyes of the Forest after Mending, Haunt after Grave Robbing, Sacred Pyre with the Pyromancy spells
SPELL_CELLS.splice(SPELL_CELLS.indexOf('mending') + 1, 0, 'eyes');
SPELL_CELLS.splice(SPELL_CELLS.indexOf('graverob') + 1, 0, 'haunt');
SPELL_CELLS.splice(SPELL_CELLS.indexOf('pfire') + 1, 0, 'sacred');
// a fifth spell button pushes the Rows button out of the army's spell cells: it goes to cell 11 (unless Earthquake sits there)
{ const g0 = Object.getOwnPropertyDescriptor(CMD, 'army').get; Object.defineProperty(CMD, 'army', { configurable: true, get() { const list = g0.call(CMD), a = S.selected.find(v => v.kind === 'army' && v.owner === ME); if (!a || list.some(c => c.id === 'rows')) return list; const used = new Set(list.map(c => c.cell)), cell = [11, 13].find(c => !used.has(c)); return cell === undefined ? list : list.concat([{ id: 'rows', cell, key: '' }]); } }); }

// ---------- aiming at a province (Rift, Haunt, Eyes of the Forest, Whispering Rocks) ----------
let v98Aim = null;
function aimSpell(c, k, msg) { pathAim = c; quakeAim = false; elemAim = null; v98Aim = { c, k }; cv.style.cursor = 'crosshair'; cmdKey = ''; toast(msg); }
{ const pac = pathAimClick; pathAimClick = function (p, right) {
  if (!v98Aim || pathAim !== v98Aim.c) { v98Aim = null; return pac(p, right); }
  const { c, k } = v98Aim; v98Aim = null; pathAim = null; cv.style.cursor = ''; cmdKey = '';
  if (right || p < 0) return toast(CAST[k].name() + ' cancelled.');
  AIMED[k](c, p);
}; }
// the old Whispering Rocks / Forest Spirit rows in the Ctrl+right-click menu give way to the new ones
{ const mr = magicRows; magicRows = function (c, q) {
  let s = mr(c, q).replace(/<button[^>]*data-type="(wrocks|fspirit)"[\s\S]*?<\/button>/g, '');
  if (!c || c.prov === q || !allNbr[c.prov].includes(q)) return s === '<div class="bm-sec">Magic</div>' ? '' : s;
  const rows = [];
  for (const kind of ['eyes', 'wrocks']) {
    if (!currentSchool() || !lvl(kind) || !seeNbrs(c, kind).includes(q)) continue;
    const why = castWhy(c, kind) || seeWhy(c, kind, q);
    rows.push(`<button type="button" class="bm-item" data-type="v98:${kind}" ${why ? 'aria-disabled="true"' : ''}><img alt="" src="${techIcon(kind === 'eyes' ? 'eyesforest' : 'wrocks')}"><span class="bm-name">${CAST[kind].name()} toward ${escHTML(provName(q))}<small>${why || '3 s of casting · 25 mana · 1 minute of sight'}</small></span></button>`);
  }
  if (s === '<div class="bm-sec">Magic</div>') s = '';
  if (!rows.length) return s;
  return s ? s + rows.join('') : '<div class="bm-sec">Magic</div>' + rows.join('');
}; }
menuEl.addEventListener('click', e => {
  const b = e.target.closest('[data-type^="v98:"]'); if (!b) return;
  e.stopImmediatePropagation(); if (b.getAttribute('aria-disabled') === 'true') return;
  const c = S.selected.find(isCaster), q = menuProv; closeBuildMenu(); if (c) AIMED[b.dataset.type.slice(4)](c, q);
}, true);

// ---------- mana in the checks ----------
{ const cw = castWhy; castWhy = function (c, k) {
  if (c.cast && c.cast.spell === 'q:' + k) return null;
  const w = cw(c, k); if (w) return w;
  const need = manaNeed(k); if (need && manaOf(c) < need) return SPELL_MANA[k] === 'all' || SPELL_MANA[k] === 'drain' ? 'No mana left' : notEnough(c, need);
  return null;
}; }
{ const cs0 = castSpell; castSpell = function (c, k) { if (c.cast && c.cast.spell === 'q:' + k) { cancelCast(c, 'Casting stopped.'); return; } return cs0(c, k); }; }
{ const pw = pathWhy; pathWhy = function (c, q, kind, close) { const w = pw(c, q, kind, close); return w || (manaOf(c) < PATH_MANA ? notEnough(c, PATH_MANA) : null); }; }
{ const tw = terraWhy; terraWhy = function (c, q) { const w = tw(c, q); return w || (manaOf(c) < PATH_MANA ? notEnough(c, PATH_MANA) : null); }; }
{ const sc = startCast; startCast = function (c, spell, dur, data) { if (spell === 'pathopen' || spell === 'pathclose' || spell === 'terrascape') spendMana(c, PATH_MANA); return sc(c, spell, dur, data); }; }
{ const qw = quakeWhy; quakeWhy = function (c) { const w = qw(c); return w || (manaOf(c) < SPELL2_MANA.quake ? notEnough(c, SPELL2_MANA.quake) + (techOf(c.owner, 'magicabund') ? '' : ' · it needs Magic Abundance') : null); }; }
{ const sw = shockWhy; shockWhy = function (c, q) { const w = sw(c, q); return w || (manaOf(c) < SPELL2_MANA.shock ? notEnough(c, SPELL2_MANA.shock) : null); }; }
{ const s2 = startSpell2; startSpell2 = function (c, kind, q) { const ok = s2(c, kind, q); if (ok) spendMana(c, SPELL2_MANA[kind]); return ok; }; }

// ---------- every frame: mana moves with its Magic User, channels drain it, 3-second casts finish, sights fade ----------
{ const sm = stepMagic; stepMagic = function (t, dt) {
  syncMana(t);
  for (const c of S.units) {
    const cs = c.cast; if (!cs || !isCaster(c)) continue;
    if (channeling(c) && !c.moving && !c.battle) { c.mana = Math.max(0, manaOf(c) - (dt || 0)); if (c.mana <= 0) { cancelCast(c, `${c.name} has run out of mana.`); continue; } }
    if (typeof cs.spell !== 'string' || !cs.spell.startsWith('q:') || !isFinite(cs.dur) || c.moving || c.battle || t - cs.t0 < cs.dur) continue;
    c.cast = null; cmdKey = '';
    const k = cs.spell.slice(2); try { if (FINISH[k]) FINISH[k](c, cs, t); } catch (e) { reportError(e, 'spell ' + k); }
  }
  sm(t, dt);
  // Clear Thoughts / Mind Reading: armies revealed for a while after the cast
  S.reveals = S.reveals.filter(r => r.until > t);
  if (S.reveals.length) {
    if (S.reveals.some(r => r.all)) S.detect = 'all';
    else { const set = new Set(); for (const r of S.reveals) hopsFrom(r.prov, allNbr).forEach((h, p) => { if (h <= 3) set.add(p); }); S.detect = set; }
  }
  delete S.cd.stasis;   // the trap has no cooldown any more
  // sights that last a minute
  let fog = false;
  for (const key of ['eyes', 'haunts', 'wrocks']) { const L = S[key] || []; const keep = L.filter(r => r.until === undefined || r.until > t); if (keep.length !== L.length) { S[key] = keep; fog = true; } }
  if (S.sacreds.length) S.sacreds = S.sacreds.filter(P => P.until > t);
  if (fog) { computeFog(); fogDirty = true; miniDirty = true; }
  // risen soldiers: never more than the army has
  for (const a of S.units) if (a.ghouls) { const n = troopCount(a) - (a.troops[MAGE] || 0); if (a.ghouls > n) a.ghouls = Math.max(0, n); }
}; }
{ const ps = pyreSight; pyreSight = function (vis) { ps(vis); for (const r of S.eyes || []) if (r.owner === ME && r.until > S.t) { vis.add(r.a); vis.add(r.b); } for (const h of S.haunts || []) if (h.owner === ME && h.until > S.t) vis.add(h.prov); }; }

// ---------- battle spells cost mana; Hardened Skin, Fiery Weapons and Rock Armor have no cooldown ----------
const AUTO_CDS = ['skinCd', 'curseCd', 'fieryCd', 'rockCd'];
{ const obj = onBattleJoin; onBattleJoin = function (a, t) {
  if (a.kind !== 'army' || !(magesIn(a) > 0)) { a.risenArm = 0; return obj(a, t); }
  const poor = manaOf(a) < AUTO_MANA, saved = {};
  if (poor) for (const k of AUTO_CDS) { saved[k] = a[k]; a[k] = Infinity; }   // too little mana: nothing fires (only one of them can, by school)
  obj(a, t);
  if (poor) for (const k of AUTO_CDS) a[k] = saved[k];
  const fired = (a.skin > 0) + (a.curse > 0) + (a.fiery > 0) + !!(a.rock && a.rock.t0 === t);
  if (fired) spendMana(a, AUTO_MANA * fired);
  if (a.skin > 0) a.skinCd = 0; if (a.fiery > 0) a.fieryCd = 0; if (a.rock && a.rock.t0 === t) a.rockCd = 0;
  // Risen Dead is only armed here: it costs its mana, and starts, when the first soldier falls
  a.risenArm = a.risen ? RISEN_N[Math.max(1, lvl('risen'))] : 0; a.risen = 0; a.risenUsed = false; a.risenLeft = 0;
}; }
{ const obe = onBattleEnd; onBattleEnd = function (a, t) { if (a.risenUsed) a.risenCd = t + RISEN_CD; a.risenArm = 0; a.risenUsed = false; a.risenLeft = 0; obe(a, t); }; }
// called from applyDamage when a soldier of kind k falls: true if he gets back up
function risenRise(a, k, b, t) {
  if (!a.risenArm || k === MAGE || !(magesIn(a) > 0)) return false;
  if (!a.risenUsed) { if (manaOf(a) < AUTO_MANA) return false; spendMana(a, AUTO_MANA); a.risenUsed = true; a.risenLeft = a.risenArm; if (a.owner === ME) toast(`${a.name}: ${TECH_BY_ID[lineTech('risen')].name}! The fallen rise again (${a.risenArm}).`); }
  if (a.risenLeft <= 0) return false;
  a.risenLeft--; a.ghouls = (a.ghouls || 0) + 1; a.riseFx = t; a.risenTotal = (a.risenTotal || 0) + 1;
  if (a.owner === ME) sfx('mg_risen', { prov: b.prov });
  if (a.risenLeft <= 0) a.risenArm = 0;
  return true;
}
// a soldier who really falls may be one of the risen ones
function ghoulFall(a, k) { if (!a.ghouls || k === MAGE) return; const n = troopCount(a) - (a.troops[MAGE] || 0); if (n > 0 && Math.random() < a.ghouls / n) a.ghouls--; }

// ---------- the computer: its Magic Users have mana too ----------
aiSpells = function (N) {
  if (!N.school || !aiMages(N)) return;
  const sp = N.school === 'death' ? 'graverob' : N.school === 'arcane' ? 'trading' : null; if (!sp || !aiHas(N, sp)) return;
  N.spellT += TICK; if (N.spellT < RES_CD) return;
  const c = S.units.filter(v => v.owner === N.id && magesIn(v) > 0 && !v.battle && !v.quake).sort((x, y) => manaOf(y) - manaOf(x))[0];
  if (!c || manaOf(c) < 60) return;
  N.spellT = 0;
  const L = (sp === 'graverob' ? ['graverob', 'deathtax', 'charon'] : ['trading', 'stockmarket', 'planar']).filter(id => aiHas(N, id)).length;
  const rep = 1 + 0.02 * aiRep(N, sp === 'graverob' ? 'rep-graverob' : 'rep-trading'), n = Math.floor(manaOf(c)); c.mana = 0;
  if (sp === 'graverob') N.stock.gold += Math.round(n * GRAVE_RATE[L] * rep); else for (const k of RES) N.stock[k] += Math.floor(n * TRADE_RATE[L] * rep);
};
for (const P of Object.values(AI_MAGIC_PREFS)) Object.assign(P, { magicwell: 14, magicabund: 12 });

// ---------- the command card: mana costs, and the 3-second casts ----------
{ const mi = magicCmdInfo; magicCmdInfo = function (id) {
  const r = mi(id); if (!r) return r;
  const [what, k] = id.split(':'), c = selCaster();
  if (what === 'spell' && CAST[k]) {
    const on = c && c.cast && c.cast.spell === 'q:' + k;
    if (on) { r.name = CAST[k].name() + ' (casting)'; r.why = null; r.ok = 'Click to stop casting'; r.desc += ` ${Math.max(0, Math.ceil(c.cast.dur - (S.t - c.cast.t0)))} s left.`; }
    else if (AIMED[k] && k !== 'haunt' && !r.why) r.ok = 'Click, then pick a province';
    if (k === 'fspirit' && c && c.cast && c.cast.spell === 'q:fspirit') { r.name = CAST[k].name() + ' (channeling)'; r.why = null; r.ok = 'Click to stop channeling'; }
    r.desc += ` Cost: ${manaText(k)}.` + (c ? ` Mana ${Math.floor(manaOf(c))}/${manaCap(ME)}.` : '');
  }
  if (what === 'mauto') r.desc += ` Costs ${AUTO_MANA} mana when it fires.` + (c ? ` Mana ${Math.floor(manaOf(c))}/${manaCap(ME)}.` : '');
  return r;
}; }
{ const mk = magicCmdKey; magicCmdKey = function () { const c = selCaster(); return mk() + (c ? '|m' + Math.floor(manaOf(c)) + (c.cast && c.cast.spell && c.cast.spell.startsWith('q:') ? Math.floor((S.t - c.cast.t0) * 2) : '') + '|' + Object.keys(S.cd).map(k => k + Math.ceil(cdLeft(k))).join(',') : ''); }; }
{ const ei = extraCmdInfo; extraCmdInfo = function (id) {
  const r = ei(id);
  if (r && (id === 'shock' || id === 'quake')) {
    const c = selCaster(), need = SPELL2_MANA[id];
    if (c && !(c.quake && c.quake.kind === id) && !r.why && manaOf(c) < need) r.why = notEnough(c, need) + (id === 'quake' && !hasTech('magicabund') ? ' · research Magic Abundance to hold that much' : '');
    r.desc += ` Cost: ${need} mana.` + (c ? ` Mana ${Math.floor(manaOf(c))}/${manaCap(ME)}.` : '');
  }
  return r;
}; }

// ---------- notifications: Grave Robbing, Trading and the Sacred Pyre are ready ----------
FLAG_IMG.sp_graverob = bannerSVG('#6b3fa0', '#4f2d78', '<path d="M20 50 V34 Q20 22 32 22 Q44 22 44 34 V50 Z" fill="#cfc8ba"/><path d="M26 36 H38 M32 30 V44" stroke-width="2.6"/><circle cx="44" cy="48" r="6" fill="#f4c44f"/>');
FLAG_IMG.sp_trading = bannerSVG('#2f6fe0', '#2252a8', '<circle cx="32" cy="36" r="13" fill="#e3ecff"/><path d="M20 36 H44 M32 23 Q24 36 32 49 Q40 36 32 23" fill="none" stroke-width="2"/><circle cx="46" cy="48" r="5.5" fill="#f4c44f"/>');
FLAG_IMG.sp_sacred = bannerSVG('#d9542c', '#a63c1c', '<path d="M18 50 H46 M21 45 H43" stroke="#8a5a34" stroke-width="4"/><path d="M24 44 L28 30 L32 38 L36 22 L40 44 Z" fill="#ffb347"/><path d="M29 44 L32 36 L35 44 Z" fill="#ffe27a"/>');
const SPELL_FLAGS = [
  { k: 'graverob', img: 'sp_graverob', school: 'death', mana: true },
  { k: 'trading', img: 'sp_trading', school: 'arcane', mana: true },
  { k: 'sacred', img: 'sp_sacred', school: 'pyro', mana: false }
];
const readyCaster = (k, mana) => S.units.find(c => isCaster(c) && !c.cast && !c.battle && !c.quake && !c.exiting && (!mana || manaOf(c) >= 25) && !castWhy(c, k));
{ const fl = flagList; flagList = function () {
  const out = fl();
  if (!S.started || !currentSchool()) return out;
  for (const F of SPELL_FLAGS) {
    if (currentSchool() !== F.school || !lvl(CAST[F.k].line) || cdLeft(F.k) > 0 || S.units.some(v => v.cast && v.cast.spell === 'q:' + F.k)) continue;
    const c = readyCaster(F.k, F.mana); if (!c) continue;
    const id = 'spell:' + F.k; if (flagDismissed.has(id)) continue;
    out.push({ id, img: F.img, tip: `${CAST[F.k].name()} is ready and ${c.name} can cast it. Left-click to select him, right-click to dismiss`, label: CAST[F.k].name() });
  }
  return out;
}; }
$q('#nflags').addEventListener('click', e => {
  const b = e.target.closest('[data-flag^="spell:"]'); if (!b) return;
  const F = SPELL_FLAGS.find(f => 'spell:' + f.k === b.dataset.flag); if (!F) return;
  const c = readyCaster(F.k, F.mana); if (!c) return;
  S.selected = [c]; cmdTab = c.kind; cmdKey = ''; selKey = ''; lookAtProv(c.prov);
});

// ---------- the resource bar: mana regeneration, a blue seven-pointed star ----------
const MANA_STAR_SVG = (() => { const pts = []; for (let k = 0; k < 14; k++) { const a = -Math.PI / 2 + k * Math.PI / 7, r = k % 2 ? 4.6 : 10.4; pts.push((12 + Math.cos(a) * r).toFixed(2) + ',' + (12.6 + Math.sin(a) * r).toFixed(2)); } return `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="${pts.join(' ')}" fill="${MANA_BLUE}" stroke="#1d1a22" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12.6" r="2.2" fill="#cfe0ff"/></svg>`; })();
let v98BarKey = '';
{ const sb = setupBar; setupBar = function () {
  sb();
  const at = $q('#r-forts') || $q('#res .tick');
  if (at && !$q('#r-mana')) at.insertAdjacentHTML('beforebegin', `<span class="r v96c" id="r-mana" title="Mana">${MANA_STAR_SVG}<b></b></span>`);
}; }
{ const ub = updateBar; updateBar = function (t) {
  ub(t);
  if (!S.started) return;
  const el = $q('#r-mana'); if (!el) return;
  const r = manaRegen(ME), cap = manaCap(ME), k = r + '|' + cap; if (k === v98BarKey) return; v98BarKey = k;
  el.querySelector('b').textContent = '+' + r;
  el.title = `Mana: every Magic User regains ${r} mana every 10 s (1 for each Tier I Magic Barracks, 2 for each Tier II, 3 for each Tier III), up to ${cap}. A Magic User regains nothing while he is casting.`;
}; }

// ---------- drawing: mana bars, the Path of Fire mark, risen soldiers, sights, Sacred Pyres ----------
// the height of a unit's art above its feet, in rig units (measured once per look, in every facing, with room for its sway)
const artTops = new Map();
function artTop(id) {
  if (artTops.has(id)) return artTops.get(id);
  let top = 150;
  try {
    const cv = document.createElement('canvas'); cv.width = 260; cv.height = 360; const g = cv.getContext('2d', { willReadFrequently: true });
    let minY = 360;
    for (const th of [0, 1.2, 2.4, -1.2, -2.4, 3.1]) for (const t of [0, 0.8, 1.6]) {
      g.clearRect(0, 0, 260, 360); RealmIso.drawUnitAt(g, id, th, t, 130, 330, 1);
      const d = g.getImageData(0, 0, 260, 360).data;
      for (let y = 0; y < minY; y++) { let hit = false; for (let x = 0; x < 260; x++) if (d[(y * 260 + x) * 4 + 3] > 40) { hit = true; break; } if (hit) { minY = y; break; } }
    }
    top = 330 - minY;
  } catch (e) {}
  artTops.set(id, top); return top;
}
function manaBar(g, c, x, y, w, K) {
  const h = 3.2 * Math.sqrt(K), f = Math.max(0, Math.min(1, manaOf(c) / manaCap(c.owner)));
  g.save(); g.beginPath(); g.roundRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3, (h + 3) / 2); g.fillStyle = OL; g.fill();
  g.beginPath(); g.roundRect(x - w / 2, y, w, h, h / 2); g.fillStyle = '#26324a'; g.fill();
  if (f > 0) { g.beginPath(); g.roundRect(x - w / 2, y, Math.max(h, w * f), h, h / 2); g.fillStyle = MANA_BLUE; g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - w / 2 + h / 2, y + 0.5, Math.max(0, w * f - h), h * 0.3); }
  g.restore();
}
function pathFireMark(g, u, x, y, t) {
  if (!u.pathFire || u.pathFire.until <= S.t) return;
  const k = Math.max(1, 0.62 / cam.z), s = 18 * k, cy = y + Math.sin(t * 4) * 1.2 * k, left = (u.pathFire.until - S.t) / Math.max(1, u.pathFire.until - u.pathFire.t0);
  g.save(); g.beginPath(); g.arc(x, cy, s / 2 + 2 * k, 0, 7); g.fillStyle = '#ffe6da'; g.fill(); g.lineWidth = 2 * k; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(x, cy, s / 2 + 2 * k, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); g.lineWidth = 2.4 * k; g.strokeStyle = '#ff7a2c'; g.stroke();
  const im = iconImg(techIcon(lineTech('pfire') || 'pathfire')); if (im.complete && im.naturalWidth) g.drawImage(im, x - s / 2, cy - s / 2, s, s);
  g.restore();
}
{ const dah = drawArmyHealth; drawArmyHealth = function (g, u, x, y, w, K) {
  dah(g, u, x, y, w, K);
  // v99: the mana bar sits above the health bar (and above the retrofit bar), clear of the soldiers' heads
  if (magesIn(u) > 0) manaBar(g, u, x, (u.retro ? y - 9 * K : y) - 3.2 * Math.sqrt(K) - 4.5, w, K);
  pathFireMark(g, u, x - w / 2 - 14 * Math.max(1, 0.62 / cam.z), y + 2, S.t);
}; }
{ const dub = drawUnitBody; drawUnitBody = function (g, u, t) {
  dub(g, u, t);
  if (u.kind !== MAGE) return;
  // v99: the bar floats a little above the very top of the figure (hat, horns, a raised staff), never over it
  const K = UKK, id = u.cast ? castUnitId(u) : u.kind, top = artTop(swArtId(id, u.owner)) * UK * K;
  manaBar(g, u, u.x, u.y - top - 3.2 * Math.sqrt(K) - 7, 18 * K, K);
  pathFireMark(g, u, u.x - 15 * K, u.y - top * 0.6, t);
}; }
// risen soldiers: a sickly green look, hollow glowing eyes and grave-wisps (they keep it when retrofitted)
let ghoulLeft = 0;
{ const da = drawArmy; drawArmy = function (g, u, t) {
  ghoulLeft = 0;
  if (u.ghouls > 0) { const n = troopCount(u) - (u.troops[MAGE] || 0), figs = armyFigures(u).filter(k => k !== MAGE).length; if (n > 0) ghoulLeft = Math.max(1, Math.round(figs * Math.min(1, u.ghouls / n))); }
  try { return da(g, u, t); } finally { ghoulLeft = 0; }
}; }
{ const duf = drawUnitFor; drawUnitFor = function (g, id, o, moving, th, t, x, y, k) {
  if (ghoulLeft <= 0 || typeof id !== 'string' || id.startsWith(MAGE) || id === GELEM_ID) return duf(g, id, o, moving, th, t, x, y, k);
  ghoulLeft--;
  g.save();
  try { g.filter = 'grayscale(0.85) sepia(0.3) hue-rotate(75deg) saturate(1.4) brightness(1.08) contrast(1.05)'; } catch (e) {}
  duf(g, id, o, moving, th, t, x, y, k);
  g.restore();
  const s = k / UK, gl = 0.55 + Math.sin(t * 5) * 0.2;
  g.save();
  const gr = g.createRadialGradient(x, y - 10 * s, 1, x, y - 10 * s, 11 * s); gr.addColorStop(0, `rgba(140,255,150,${(0.32 * gl).toFixed(3)})`); gr.addColorStop(1, 'rgba(140,255,150,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y - 10 * s, 11 * s, 0, 7); g.fill();
  for (let i = 0; i < 2; i++) { const f = (t * 0.7 + i * 0.5) % 1; g.globalAlpha = 0.65 * (1 - f); g.fillStyle = '#b6ffb0'; g.beginPath(); g.ellipse(x + (i ? 3.5 : -3.5) * s, y - (15 + f * 9) * s, 0.9 * s, 1.5 * s, 0, 0, 7); g.fill(); }
  g.restore();
}; }
{ const dm = drawMagic; drawMagic = function (g, t) {
  dm(g, t);
  for (const r of S.eyes || []) {
    if (r.owner !== ME || !(S.explored.has(r.a) || S.explored.has(r.b)) || r.edge < 0) continue;
    const [mx, my] = edgeMid(r.edge), left = Math.max(0, (r.until - S.t) / SEE_TIME), op = 0.75 + Math.sin(t * 3) * 0.2;
    g.save(); g.translate(mx, my - 26);
    g.beginPath(); g.ellipse(0, 0, 16, 10, 0, 0, 7); g.fillStyle = `rgba(255,255,255,${op.toFixed(2)})`; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.arc(0, 0, 5.5, 0, 7); g.fillStyle = '#3f9b4b'; g.fill(); g.lineWidth = 2; g.stroke();
    g.beginPath(); g.arc(0, 0, 21, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); g.lineWidth = 3; g.strokeStyle = '#3f9b4b'; g.stroke();
    g.restore();
  }
  for (const h of S.haunts || []) {
    if (h.owner !== ME || !S.visible.has(h.prov)) continue;
    const c = G.provs[h.prov].ic, x = c[0] + 40, y = c[1] - 70 + Math.sin(t * 2) * 6;
    g.save(); g.globalAlpha = 0.78 + Math.sin(t * 3) * 0.12;
    g.beginPath(); g.moveTo(x - 14, y + 20); g.lineTo(x - 14, y); g.quadraticCurveTo(x - 14, y - 16, x, y - 16); g.quadraticCurveTo(x + 14, y - 16, x + 14, y); g.lineTo(x + 14, y + 20); g.lineTo(x + 9, y + 15); g.lineTo(x + 4, y + 20); g.lineTo(x - 1, y + 15); g.lineTo(x - 6, y + 20); g.lineTo(x - 10, y + 15); g.closePath();
    g.fillStyle = '#f2eefa'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke();
    g.fillStyle = OL; g.beginPath(); g.arc(x - 5, y - 2, 2.6, 0, 7); g.arc(x + 5, y - 2, 2.6, 0, 7); g.fill();
    g.restore();
  }
  for (const P of S.sacreds || []) {
    if (!S.visible.has(P.prov)) continue;
    g.save(); g.translate(P.x, P.y); g.scale(0.42 * UKK, 0.42 * UKK);
    try { SwampBuild.drawOnMap(g, 'pyre', 0, t, 1); } catch (e) {}
    g.restore();
    if (P.owner === ME) { const left = Math.max(0, (P.until - S.t) / SACRED.dur), y = P.y - 40 * UKK; g.save(); g.beginPath(); g.arc(P.x, y, 8, 0, 7); g.fillStyle = 'rgba(250,241,220,0.95)'; g.fill(); g.beginPath(); g.arc(P.x, y, 8, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); g.lineWidth = 3.5; g.strokeStyle = '#ff7a2c'; g.stroke(); g.restore(); }
  }
}; }

// ---------- new games and loaded saves ----------
{ const s96 = setupV96; setupV96 = function (loaded) {
  s96(loaded);
  for (const k of ['manaPool', 'eyes', 'haunts', 'sacreds', 'reveals']) if (!Array.isArray(S[k])) S[k] = [];
  if (!S.cd) S.cd = {};
  S.rift = null; S.fspirits = [];
  manaPrev = new Map(); manaPrevT = -1; v98Aim = null; v98BarKey = '';
  if (loaded) {
    // v98: the Aegis is gone (designs that used it carry a Tower Shield), and techs that no longer exist are dropped
    for (const d of S.designs || []) if (d.shield === 'aegis') { d.shield = 'tower'; registerDesign(d); }
    const known = id => !!TECH_BY_ID[id];
    const clean = st => { if (!st) return; st.done = (st.done || []).filter(known); st.opts = (st.opts || []).filter(known); if (st.sticky) st.sticky = st.sticky.filter(known); if (st.cur && !known(st.cur)) { st.cur = null; st.prog = 0; } };
    for (const tr of TREE_KEYS) clean(S.tech[tr]);
    for (const N of Object.values(NATIONS)) if (N.tech) for (const tr of TREE_KEYS) clean(N.tech[tr]);
    for (const c of S.units) if (c.cast && ['mind', 'graverob', 'trading', 'fspirit', 'wrocks'].includes(c.cast.spell)) c.cast = null;
    for (const r of S.wrocks || []) if (r.until === undefined) r.until = S.t + SEE_TIME;
  }
  computeIncome();
}; }

window.__v98 = { manaOf, manaCap, manaRegen, regenMana, syncMana, risenRise, pureFront, FINISH, AIMED, SPELL_MANA, riftWhy, hauntWhy, seeNbrs, teleport, paySacredPyres };
