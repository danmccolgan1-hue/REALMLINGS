
// ================= equipment and unit designs (the Armory) =================
// Two kinds of soldier, infantry and cavalry; the player designs them by picking a weapon, an optional shield,
// armor and (for cavalry) a horse. Every design becomes a trainable unit with its own stats, cost and look.
// All numbers are first-pass placeholders.
const WEAPONS = {
  spear:       { name: 'Spear',          fam: 'pole',  tier: 1, atk: 5,  twoH: true,  cost: {},                    tech: null },
  pike:        { name: 'Pike',           fam: 'pole',  tier: 2, atk: 9,  twoH: true,  cost: { gold: 15, wood: 10 },  tech: 'w-pike' },
  polearm:     { name: 'Polearm',        fam: 'pole',  tier: 3, atk: 13,  twoH: true,  cost: { gold: 35, wood: 15 }, tech: 'w-polearm' },
  halberd:     { name: 'Halberd',        fam: 'pole',  tier: 4, atk: 18, twoH: true,  cost: { gold: 65, wood: 20 }, tech: 'w-halberd' },
  shortsword:  { name: 'Short Sword',    fam: 'sword', tier: 1, atk: 6,  twoH: false, cost: {},                    tech: null },
  sword:       { name: 'Bastard Sword',  fam: 'sword', tier: 2, atk: 10,  twoH: false, cost: { gold: 25 },           tech: 'w-bastard' },
  longsword:   { name: 'Long Sword',     fam: 'sword', tier: 3, atk: 14, twoH: false, cost: { gold: 50 },          tech: 'w-longsword' },
  greatsword:  { name: 'Great Sword',    fam: 'sword', tier: 4, atk: 30, twoH: true,  cost: { gold: 120 },          tech: 'w-greatsword' },
  club:        { name: 'Club',           fam: 'blunt', tier: 1, atk: 5,  twoH: true,  cost: { wood: 10 },           tech: null },
  mace:        { name: 'Mace',           fam: 'blunt', tier: 2, atk: 8,  twoH: true,  cost: { gold: 35 },           tech: 'w-mace' },
  morningstar: { name: 'Morning Star',   fam: 'blunt', tier: 3, atk: 11,  twoH: true,  cost: { gold: 70 },          tech: 'w-morningstar' },
  warhammer:   { name: 'War Hammer',     fam: 'blunt', tier: 4, atk: 15, twoH: true,  cost: { gold: 120 },          tech: 'w-warhammer' },
  // Swamplings: axes instead of swords, every one of them one-handed (so they can be dual-wielded)
  handaxe:     { name: 'Hand Axe',       fam: 'axe',   tier: 1, atk: 6,  twoH: false, cost: {},                    tech: null,           race: 'swamp' },
  beardedaxe:  { name: 'Bearded Axe',    fam: 'axe',   tier: 2, atk: 10, twoH: false, cost: { gold: 25 },           tech: 'w-bearded',    race: 'swamp' },
  battleaxe:   { name: 'Battle Axe',     fam: 'axe',   tier: 3, atk: 14, twoH: false, cost: { gold: 50 },           tech: 'w-battleaxe',  race: 'swamp' },
  waraxe:      { name: 'War Axe',        fam: 'axe',   tier: 4, atk: 20, twoH: false, cost: { gold: 120 },          tech: 'w-waraxe',     race: 'swamp' }
};
for (const k of ['shortsword', 'sword', 'longsword', 'greatsword']) WEAPONS[k].race = 'realm';
// Woodlings (v90): thrusting swords instead of swords: thinner, but the same blades tier for tier, and the Estoc stays one-handed
Object.assign(WEAPONS, {
  dirk:    { name: 'Dirk',    fam: 'thrust', tier: 1, atk: 6,  twoH: false, cost: {},           tech: null,        race: 'wood' },
  gladius: { name: 'Gladius', fam: 'thrust', tier: 2, atk: 10, twoH: false, cost: { gold: 25 },  tech: 'w-gladius', race: 'wood' },
  rapier:  { name: 'Rapier',  fam: 'thrust', tier: 3, atk: 14, twoH: false, cost: { gold: 50 },  tech: 'w-rapier',  race: 'wood' },
  estoc:   { name: 'Estoc',   fam: 'thrust', tier: 4, atk: 20, twoH: false, cost: { gold: 120 }, tech: 'w-estoc',   race: 'wood' }
});
// Woodling Champions (v93): great two-handed weapons that hit three times as hard as a one-handed blade of the same tier.
// Each keeps its family's bonus and trades speed, health and cost. Not in any FAMILY order: only Champions carry them.
Object.assign(WEAPONS, {
  champsword:    { name: 'Champion Sword',    fam: 'thrust', tier: 1, atk: 18, twoH: true, champ: true, hp: 0,  spd: 1,    cost: {},            tech: null,             race: 'wood', note: 'A great sword, balanced and steady.' },
  ancienthammer: { name: 'Ancient Hammer',    fam: 'blunt',  tier: 2, atk: 27, twoH: true, champ: true, hp: 15, spd: 0.92, cost: { gold: 150 }, tech: 'horse-breeding', race: 'wood', note: 'Rune-carved stone on a long haft: tougher, but slower.' },
  wrathspear:    { name: 'Wrathful Spear',    fam: 'pole',   tier: 2, atk: 27, twoH: true, champ: true, hp: 0,  spd: 1.1,  cost: { gold: 120 }, tech: 'horse-breeding', race: 'wood', note: 'A long leaf-bladed spear: quicker on the march.' },
  worldaxe:      { name: 'Worldbreaker Axe',  fam: 'axe',    tier: 3, atk: 42, twoH: true, champ: true, hp: 10, spd: 0.95, cost: { gold: 280 }, tech: 'horse-training', race: 'wood', note: 'A huge double-bitted axe: critical strikes, a little slower.' },
  oblivion:      { name: 'Oblivion Blade',    fam: 'thrust', tier: 4, atk: 60, twoH: true, champ: true, hp: 25, spd: 0.9,  cost: { gold: 450 }, tech: 'horse-training', race: 'wood', note: 'A dark greatsword humming with violet light: the deadliest, the toughest, the slowest.' }
});
const CHAMP_WEAPONS = ['champsword', 'ancienthammer', 'wrathspear', 'worldaxe', 'oblivion'];
// a Champion: tall, on foot, in Ornate armor under an antlered great helm; slower than Protectors but much tougher
const CHAMP = { hp: 70, speed: 0.72, armor: 4, cost: { gold: 300 }, upkeep: { food: 4 } };
const isChampDesign = d => !!d && d.race === 'wood' && d.type === 'cav';
// two-handing (Woodlings): heavy blows. Every other round the soldier deals nothing, and the next round 2.5 times as much,
// so 125% of the damage over time (TWO_BURST). Champions may always fight this way; Protectors need Two-Handed Grip.
const TWO_BURST = 2.5;
const FAMILY = {
  pole:  { name: 'Polearms', note: '+50% damage against cavalry', order: ['spear', 'pike', 'polearm', 'halberd'] },
  sword: { name: 'Swords',   note: 'Parry: take 10% less damage', order: ['shortsword', 'sword', 'longsword', 'greatsword'] },
  blunt: { name: 'Blunt',    note: 'Crushing: ignores half of enemy armor, and deals 150% damage to soldiers in plate', order: ['club', 'mace', 'morningstar', 'warhammer'] },
  axe:   { name: 'Axes',     note: 'Critical strike: each blow has a 10% chance to do double damage', order: ['handaxe', 'beardedaxe', 'battleaxe', 'waraxe'], race: 'swamp' }
};
FAMILY.sword.race = 'realm';
FAMILY.thrust = { name: 'Thrusting Swords', note: 'Parry: take 10% less damage', order: ['dirk', 'gladius', 'rapier', 'estoc'], race: 'wood' };
// a race tag is one race, or a list of the races that share the thing
function raceIs(r, race) { return !r || r === race || (Array.isArray(r) && r.includes(race)); }
const noShields = race => race === 'swamp' || race === 'wood';   // Swamplings and Woodlings carry no shields
// which weapon families, armor lines and mounts a race uses (Swamplings: no swords, no shields, their own armor and Ogres)
const famsFor = race => Object.keys(FAMILY).filter(f => raceIs(FAMILY[f].race, race));
const SHIELD_DEFS = {
  round: { name: 'Round Shield', armor: 3,  speed: 1,    cost: { gold: 10, wood: 10 },  tech: 's-round' },
  kite:  { name: 'Kite Shield',  armor: 6,  speed: 1,    cost: { gold: 20, wood: 10 },  tech: 's-kite' },
  tower: { name: 'Tower Shield', armor: 10, speed: 0.92, cost: { gold: 35, wood: 15 }, tech: 's-tower' }
};
const ARMOR_TYPES = {
  leather: { name: 'Leather', speed: 1.1,  note: '+10% speed', armor: [1, 3, 5, 7],   gold: [0, 10, 20, 35], race: 'realm' },
  chain:   { name: 'Chain',   speed: 1,    note: 'no speed change', armor: [4, 8, 12, 16],  gold: [15, 30, 50, 80], race: 'realm' },
  plate:   { name: 'Plate',   speed: 0.85, note: '−15% speed', armor: [8, 14, 20, 26], gold: [35, 60, 85, 115], race: 'realm' },
  // Swamplings: the same three lines, 10% lighter (10% faster) and 10% weaker
  stag:    { name: 'Staghide',       speed: 1.21,  note: '+21% speed', armor: [0.9, 2.7, 4.5, 6.3], gold: [0, 10, 20, 35], race: 'swamp', twin: 'leather' },
  wyvern:  { name: 'Wyvern-Scaled',  speed: 1.1,   note: '+10% speed', armor: [3.6, 7.2, 10.8, 14.4], gold: [15, 30, 50, 80], race: 'swamp', twin: 'chain' },
  dragon:  { name: 'Dragonbone',     speed: 0.935, note: '−6.5% speed', armor: [7.2, 12.6, 18, 23.4], gold: [35, 60, 85, 115], race: 'swamp', twin: 'plate' },
  // Woodlings: the Realmlings' three lines under their own names, exactly as strong
  spirit:  { name: 'Spiritweave', speed: 1.1,  note: '+10% speed', armor: [1, 3, 5, 7],   gold: [0, 10, 20, 35], race: 'wood', twin: 'leather' },
  mithril: { name: 'Mithril',     speed: 1,    note: 'no speed change', armor: [4, 8, 12, 16],  gold: [15, 30, 50, 80], race: 'wood', twin: 'chain' },
  ornate:  { name: 'Ornate',      speed: 0.85, note: '−15% speed', armor: [8, 14, 20, 26], gold: [35, 60, 85, 115], race: 'wood', twin: 'plate' }
};
const armorsFor = race => Object.keys(ARMOR_TYPES).filter(k => raceIs(ARMOR_TYPES[k].race, race));
const ROMAN4 = ['', 'I', 'II', 'III', 'IV'];
const ARMORS = {};
for (const [k, A] of Object.entries(ARMOR_TYPES)) for (let lv = 1; lv <= 4; lv++) ARMORS[k + lv] = { name: `${A.name} ${ROMAN4[lv]}`, type: k, level: lv, armor: A.armor[lv - 1], speed: A.speed, cost: A.gold[lv - 1] ? { gold: A.gold[lv - 1] } : {}, tech: (k === 'leather' || k === 'stag' || k === 'spirit') && lv === 1 ? null : `a-${k}${lv}`, race: A.race };
// real breeds, each with a trade-off rather than a straight upgrade
const HORSES = {
  riding:    { name: 'Rouncey',   speed: 1.4,  hp: 10, atk: 1, armor: 0, upFood: 0,  rough: false, cost: {},                      tech: null,             coat: '#9a5b32', mane: '#5a3a22', note: 'Common riding horse. Cheap and balanced.' },
  arabian:   { name: 'Arabian',   speed: 1.9,  hp: 0,  atk: 1, armor: 0, upFood: 0,  rough: false, cost: { gold: 200, food: 50 },  tech: 'horse-breeding', coat: '#d9d4cc', mane: '#9a958c', note: 'Fastest horse there is, but light: no extra health.' },
  mongolian: { name: 'Mongolian', speed: 1.55, hp: 8,  atk: 0, armor: 0, upFood: -2, rough: true,  cost: { gold: 60 },              tech: 'horse-breeding', coat: '#c79a5e', mane: '#3a2a1e', note: 'Hardy steppe pony: 2 less food upkeep and no cavalry penalty in forest or swamp, but a weak charge.' },
  friesian:  { name: 'Friesian',  speed: 1.4,  hp: 20, atk: 3, armor: 0, upFood: 1,  rough: false, cost: { gold: 300, food: 100 }, tech: 'horse-training', coat: '#24201f', mane: '#0f0d0d', note: 'Powerful charger: the hardest-hitting horse, but costly to buy and feed.' },
  percheron: { name: 'Percheron', speed: 1.1,  hp: 40, atk: 2, armor: 3, upFood: 2,  rough: false, cost: { gold: 280, food: 150 }, tech: 'horse-training', coat: '#9a9ea6', mane: '#e6e6ea', barding: '#2f5fc0', note: 'Huge draught horse in barding: the toughest mount, but slow and hungry.' }
};
// Swampling "cavalry" are Ogres: no mount, the brute itself. More health, less armor and slower than horses.
const OGRES = {
  riding:    { name: 'Ogre',             speed: 1.2,  hp: 18, atk: 1, armor: 0, upFood: 0,  rough: false, cost: {},                      tech: null,             skin: '#7a9a4a', note: 'A common Ogre: big, tough and steady.' },
  arabian:   { name: 'Swampfeet Ogre',   speed: 1.6,  hp: 6,  atk: 1, armor: 0, upFood: 0,  rough: false, cost: { gold: 200, food: 50 },  tech: 'horse-breeding', skin: '#93b55c', note: 'Long-legged and quick: the fastest Ogre, but the frailest.' },
  mongolian: { name: 'Mossback Ogre',    speed: 1.3,  hp: 14, atk: 0, armor: 0, upFood: -2, rough: true,  cost: { gold: 60 },              tech: 'horse-breeding', skin: '#5f7d3a', moss: true, note: 'Moss-grown and patient: 2 less food upkeep and at home in forest and swamp, but a weak blow.' },
  friesian:  { name: 'Bloodknuckle Ogre', speed: 1.2, hp: 28, atk: 4, armor: 0, upFood: 1,  rough: false, cost: { gold: 300, food: 100 }, tech: 'horse-training', skin: '#9a6a4a', fists: '#b8352d', note: 'Knuckles caked red: the hardest-hitting Ogre, but costly to keep.' },
  percheron: { name: 'Leviathan Ogre',   speed: 0.95, hp: 55, atk: 2, armor: 1, upFood: 2,  rough: false, cost: { gold: 280, food: 150 }, tech: 'horse-training', skin: '#5a7a80', note: 'A hulking giant from the deep bogs: the toughest of all, but slow and hungry.' }
};
const OGRE_ARMOR = 0.8;   // an Ogre's armor protects 20% less (it is stretched over a huge frame)
const mountsFor = race => race === 'swamp' ? OGRES : HORSES;
const UNIT_BASE = {
  inf: { name: 'Infantry', hp: 30, speed: 0.75, cost: { gold: 80 },  upkeep: { food: 2 } },
  cav: { name: 'Cavalry',  hp: 40, speed: 1,    cost: { gold: 300 }, upkeep: { food: 4 } }
};
const ARMOR_HP = [0, 0, 10, 20, 30];
const PLATE_TYPES = new Set(['plate', 'dragon', 'ornate']);   // v98: blunt weapons deal 150% damage to soldiers in these   // v98: armor of Tier I / II / III / IV also adds 0 / 10 / 20 / 30 health
const ARMOR_K = 12;   // damage reduction = armor / (armor + 12)
const equipOk = (item) => !item.tech || hasTech(item.tech);
const addCost = (a, b) => { const o = { ...a }; for (const k in b) o[k] = (o[k] || 0) + b[k]; return o; };

// ---------- designs ----------
S.designs = [];
let designSeq = 0;
const DSTATS = {};
const isCav = k => !!(DSTATS[k] && DSTATS[k].cav);
function designStats(d) {
  if (isChampDesign(d)) return champStats(d);
  const sw = d.race === 'swamp', B = UNIT_BASE[d.type], W = WEAPONS[d.weapon], A = ARMORS[d.armor], Sh = !noShields(d.race || 'realm') && d.shield && !W.twoH ? SHIELD_DEFS[d.shield] : null, H = d.type === 'cav' ? mountsFor(d.race)[d.horse || 'riding'] : null;
  // dual wielding (Swamplings): a second one-handed weapon in the off hand hits for half its attack
  const Off = sw && d.off && !W.twoH && WEAPONS[d.off] && !WEAPONS[d.off].twoH ? WEAPONS[d.off] : null;
  const armor = A.armor * (sw && d.type === 'cav' ? OGRE_ARMOR : 1) + (Sh ? Sh.armor : 0) + (H ? H.armor : 0);
  let cost = addCost(B.cost, W.cost); cost = addCost(cost, A.cost); if (Sh) cost = addCost(cost, Sh.cost); if (H) cost = addCost(cost, H.cost); if (Off) cost = addCost(cost, Off.cost);
  const gear = (cost.gold || 0) - (B.cost.gold || 0);
  delete cost.food;   // units cost no food: food is only their upkeep
  const upkeep = { food: Math.max(0, B.upkeep.food + (H ? H.upFood : 0)) };
  const speed = +((H ? H.speed : B.speed) * A.speed * (Sh ? Sh.speed : 1)).toFixed(2);
  const red = armor / (armor + ARMOR_K) * (W.fam === 'sword' ? 1 : 1) ;
  const st = { cav: d.type === 'cav', ogre: sw && d.type === 'cav', race: d.race || 'realm', rough: !!(H && H.rough), plate: PLATE_TYPES.has(A.type), fam: W.fam, atk: +(W.atk + (Off ? Off.atk * 0.5 : 0) + (H ? H.atk : 0)).toFixed(1), hp: B.hp + (H ? H.hp : 0) + ARMOR_HP[A.level], armor, shieldArmor: Sh ? Sh.armor : 0, red, parry: W.fam === 'sword' || W.fam === 'thrust' ? 0.1 : 0, crit: W.fam === 'axe' ? 0.1 : 0, speed, cost, upkeep };
  st.blurb = `${W.name}${Off ? ' and ' + Off.name + ' (off hand, half damage)' : ''}${Sh ? ' and ' + Sh.name : ''}, ${A.name} armor${H ? ', ' + H.name : ''}. ${FAMILY[W.fam].note}.${H && H.rough ? ' No ' + (sw ? 'Ogre' : 'cavalry') + ' penalty in forest or swamp.' : ''}`;
  if (d.race === 'wood' && d.two) { st.two = true; st.blurb += ' Two-handed grip: heavy blows every other round (125% damage over time).'; }
  return st;
}
// a Woodling Champion: a Champion weapon, Ornate armor only (Ornate I comes free), no mount, no shield
function champStats(d) {
  const W = WEAPONS[d.weapon] && WEAPONS[d.weapon].champ ? WEAPONS[d.weapon] : WEAPONS.champsword;
  const A = ARMORS[d.armor] && ARMORS[d.armor].type === 'ornate' ? ARMORS[d.armor] : ARMORS.ornate1;
  const armor = A.armor + CHAMP.armor;
  let cost = addCost(CHAMP.cost, W.cost); cost = addCost(cost, A.cost);
  const speed = +(CHAMP.speed * A.speed * W.spd).toFixed(2), red = armor / (armor + ARMOR_K);
  const st = { cav: true, champ: true, ogre: false, race: 'wood', rough: true, plate: true, fam: W.fam, atk: W.atk, hp: CHAMP.hp + W.hp + ARMOR_HP[A.level], armor, shieldArmor: 0, red, parry: W.fam === 'thrust' || W.fam === 'sword' ? 0.1 : 0, crit: W.fam === 'axe' ? 0.1 : 0, speed, cost, upkeep: { ...CHAMP.upkeep }, two: !!d.two };
  st.blurb = `${W.name}, ${A.name} armor. ${FAMILY[W.fam].note}.${d.two ? ' Two-handed swings: heavy blows every other round (125% damage over time).' : ''}`;
  return st;
}
// what a design looks like on the map: built from the unit rig's parts
function specFor(d) {
  if (d.race === 'swamp') return swampSpecFor(d);
  const R = RealmIso, P = R.P, W = WEAPONS[d.weapon], A = ARMORS[d.armor], lv = A.level, ty = (ARMOR_TYPES[A.type] || {}).twin || A.type;
  const o = { right: d.weapon, left: d.shield && !W.twoH && d.race !== 'wood' ? d.shield : null, angS: 0.3 };
  if (ty === 'leather') Object.assign(o, { helm: lv >= 3 ? 'barbute' : 'flatcap', helmColor: '#7e5a3b', shirt: '#9a6a40', sleeve: '#9a6a40', pants: '#6b5a48', tabard: lv >= 2 ? '#7e5a3b' : null, tabardTrim: lv >= 4 ? P.gold : null });
  else if (ty === 'chain') Object.assign(o, { helm: 'barbute', shirt: P.chain, sleeve: P.chain, mail: true, tabard: P.blue, tabardTrim: lv >= 3 ? P.gold : null, pants: '#4a4f5c', gloves: lv >= 2 ? P.steelD : undefined });
  else Object.assign(o, { helm: 'greathelm', plume: lv >= 4 ? P.gold : lv >= 2 ? P.red : undefined, shirt: P.blueD, sleeve: P.steel, armor: true, pauldrons: lv >= 2, tabard: P.blue, tabardTrim: lv >= 3 ? P.gold : null, pants: '#4a4f5c', boots: '#5b6270', gloves: P.steelD });
  // (Woodling designs are drawn by woodSpecFor in wood.js, which wraps specFor)
  if (d.type === 'cav') { const H = HORSES[d.horse || 'riding']; Object.assign(o, { rightPose: 'raised', angF: -0.3, angS: 0.55, horse: { coat: H.coat, mane: H.mane, barding: H.barding || null, chanfron: !!H.barding, muzzle: '#d8d1c6' } }); }
  return R.base(o);
}
function registerDesign(d) {
  const st = designStats(d); DSTATS[d.id] = st;
  UNIT_DEFS[d.id] = { name: d.name, cost: st.cost, upkeep: st.upkeep, blurb: st.blurb, design: true };
  MILITARY.add(d.id); UNIT_SPEED[d.id] = st.speed;
  RealmIso.UNITS[d.id] = { unit: st.ogre ? 'ogre' : st.champ ? 'champion' : st.cav ? 'cavalry' : 'footman', name: d.name, title: d.name, spec: specFor(d) };
  delete portraitURL[d.id];
}
function addDesign(o, builtin) {
  const d = { id: o.id || 'd' + (++designSeq), name: o.name, type: o.type, weapon: o.weapon, shield: noShields(o.race || 'realm') ? null : o.shield || null, off: o.off || null, armor: o.armor, horse: o.type === 'cav' && o.race !== 'wood' ? (o.horse || 'riding') : null, builtin: !!builtin, race: o.race || 'realm' };
  if (d.race === 'wood' && o.two) d.two = true;   // two-handed grip
  S.designs.push(d); registerDesign(d); return d;
}
// starting designs (also used by raiders and by the AI nations' first armies)
addDesign({ id: 'd-spear', name: 'Spearman', type: 'inf', weapon: 'spear', armor: 'leather1' }, true);
addDesign({ id: 'd-sword', name: 'Footman', type: 'inf', weapon: 'shortsword', armor: 'leather1' }, true);
addDesign({ id: 'd-club', name: 'Clubman', type: 'inf', weapon: 'club', armor: 'leather1' }, true);
addDesign({ id: 'd-rider', name: 'Rider', type: 'cav', weapon: 'spear', armor: 'leather1', horse: 'riding' }, true);
// the Swamplings' starting designs
addDesign({ id: 'd-sw-spear', name: 'Spear Berserker', type: 'inf', weapon: 'spear', armor: 'stag1', race: 'swamp' }, true);
addDesign({ id: 'd-sw-axe', name: 'Axe Berserker', type: 'inf', weapon: 'handaxe', armor: 'stag1', race: 'swamp' }, true);
addDesign({ id: 'd-sw-club', name: 'Club Berserker', type: 'inf', weapon: 'club', armor: 'stag1', race: 'swamp' }, true);
addDesign({ id: 'd-wd-sword', name: 'Sword Protector', type: 'inf', weapon: 'dirk', armor: 'spirit1', race: 'wood' }, true);
addDesign({ id: 'd-wd-spear', name: 'Spear Protector', type: 'inf', weapon: 'spear', armor: 'spirit1', race: 'wood' }, true);
addDesign({ id: 'd-wd-club', name: 'Club Protector', type: 'inf', weapon: 'club', armor: 'spirit1', race: 'wood' }, true);
addDesign({ id: 'd-wd-champ', name: 'Champion', type: 'cav', weapon: 'champsword', armor: 'ornate1', race: 'wood' }, true);
addDesign({ id: 'd-sw-ogre', name: 'Ogre', type: 'cav', weapon: 'club', armor: 'stag1', horse: 'riding', race: 'swamp' }, true);
const isOgre = k => !!(DSTATS[k] && DSTATS[k].ogre);
// the starting infantry design of a race (three of them start in every capital)
const footmanOf = o => isSw(o) ? 'd-sw-axe' : raceOf(o) === 'wood' ? 'd-wd-sword' : 'd-sword';
const designById = id => S.designs.find(d => d.id === id);
const designInUse = id => S.units.some(u => u.kind === 'army' && u.troops[id]) || Object.values(S.queues).some(Q => Q.some(q => q.kind === id));
const PLURAL_OF = n => /man$/.test(n) ? n.replace(/man$/, 'men') : /s$/.test(n) ? n : /Thief$/.test(n) ? n.slice(0, -1) + 'ves' : n + 's';

// ---------- combat helpers (used by the battle code) ----------
const STATS0 = { atk: 5, hp: 30, armor: 0, shieldArmor: 0, red: 0, parry: 0, crit: 0, cav: false, fam: 'sword' };
// a soldier's stats; your own soldiers also get the repeatable Military and Magic research bonuses (see boostStats)
const statsOf = (k, o) => { const st = DSTATS[k] || STATS0; return artStats(k, o === ME ? boostStats(k, st) : st, o); };   // v95: artifacts (artStats in v95.js)
function sideMix(armies) {
  let n = 0, cav = 0, red = 0, parry = 0, blunt = 0, atk = 0, plate = 0;
  for (const a of armies) for (const k in a.troops) { const c = a.troops[k], s = statsOf(k, a.owner); n += c; if (s.plate) plate += c; if (s.cav && !s.champ) cav += c; red += c * s.red; parry += c * s.parry; if (s.fam === 'blunt') blunt += c * s.atk; atk += c * s.atk; }
  return n ? { n, cavFrac: cav / n, plateFrac: plate / n, red: red / n, parry: parry / n, pierce: atk ? blunt / atk : 0 } : { n: 0, cavFrac: 0, plateFrac: 0, red: 0, parry: 0, pierce: 0 };
}

// ---------- the Armory panel ----------
let armOpen = false, armKey = '', armSel = 'd-sword', draft = null, armSpin = 0;
function toggleArmory(open = !armOpen) { if (open && !armOpen) sfx('ui_panel'); armOpen = open; $q('#armory').hidden = !open; armKey = ''; if (open) { if (!draft) editDesign(armSel); if (techOpen) toggleTech(false); } }
function editDesign(id) { if (id === 'mage') { armSel = 'mage'; draft = { id: 'mage', type: 'mage', name: UNIT_DEFS[MAGE].name, weapon: S.mageGear.weapon, shield: S.mageGear.shield }; armKey = ''; return; } const d = designById(id); if (!d) return; armSel = id; draft = { ...d }; armKey = ''; }
function newDesign(type) {
  const race = raceOf(ME), sw = race === 'swamp', wd = race === 'wood', ch = wd && type === 'cav';
  const n = S.designs.filter(d => d.type === type && (d.race || 'realm') === race).length + 1;
  draft = { id: null, name: (type === 'cav' ? (sw ? 'Ogre ' : wd ? 'Champion ' : 'Cavalry ') : (sw ? 'Berserker ' : wd ? 'Protector ' : 'Infantry ')) + n, type, weapon: ch ? 'champsword' : sw && type === 'cav' ? 'club' : 'spear', shield: null, off: null, armor: ch ? 'ornate1' : sw ? 'stag1' : wd ? 'spirit1' : 'leather1', horse: type === 'cav' && !wd ? 'riding' : null, race };
  armSel = null; armKey = '';
}
function saveDraft() {
  if (!draft) return;
  if (draft.type === 'mage') { S.mageGear = { weapon: draft.weapon, shield: MAGE_WEAPONS[draft.weapon].twoH ? null : draft.shield }; registerMage(); armKey = ''; cmdKey = ''; toast(`${UNIT_DEFS[MAGE].name}s now carry a ${MAGE_WEAPONS[draft.weapon].name}${S.mageGear.shield ? ' and a ' + SHIELD_DEFS[S.mageGear.shield].name : ''}.`); return; }
  const name = ($q('#armName') && $q('#armName').value.trim()) || draft.name; draft.name = name.slice(0, 24);
  const cur = draft.id && designById(draft.id);
  if (cur && !cur.builtin && !designInUse(cur.id)) { Object.assign(cur, draft); registerDesign(cur); toast(`${cur.name} saved.`); }
  else {
    if (cur && (cur.builtin || designInUse(cur.id)) && cur.name === draft.name) draft.name = nextDesignName(draft.name);
    const d = addDesign({ ...draft, id: null }); armSel = d.id; draft = { ...d };
    toast(cur ? `${cur.builtin ? 'Starting designs can’t be changed' : cur.name + ' is in use'}: saved as a new design, ${d.name}.` : `${d.name} added to the Armory. Train it at a ${d.type === 'cav' && isSw(ME) ? BUILD_DEFS.stable.name : BUILD_DEFS.barracks.name}${d.type === 'cav' && !isSw(ME) ? ' with a ' + BUILD_DEFS.stable.name : ''}.`);
  }
  armKey = ''; cmdKey = '';
}
function deleteDesign(id) {
  const d = designById(id); if (!d || d.builtin) return;
  if (designInUse(id)) return toast(`${d.name} can’t be deleted while soldiers of that design are alive or in training.`, true);
  S.designs = S.designs.filter(x => x !== d); MILITARY.delete(id);
  toast(`${d.name} deleted.`); editDesign(footmanOf(ME)); cmdKey = '';
}
function statBar(label, v, max, txt) { return `<div class="ar-stat"><span>${label}</span><i><s style="width:${Math.min(100, v / max * 100)}%"></s></i><b>${txt}</b></div>`; }
function equipButton(kind, key, item, on, why) {
  return `<button type="button" class="ar-eq${on ? ' on' : ''}${why ? ' locked' : ''}" data-eq="${kind}:${key}" ${why ? 'aria-disabled="true"' : ''} title="${item.name}${why ? ' · ' + why : ''}"><img alt="" src="${equipIcon(kind, key)}"><span>${item.name}</span>${why ? '<em>🔒</em>' : ''}</button>`;
}
function lockWhy(item) { return item.tech && !hasTech(item.tech) && !(item === ARMORS.ornate1 && draft && isChampDesign(draft)) ? 'Research ' + TECH_BY_ID[item.tech].name : null; }   // (Champions wear Ornate I without the research)
function renderArmory() {
  if (!armOpen || !draft) return;
  const key = JSON.stringify({ ...draft, name: undefined }) + '|' + S.designs.length + '|' + S.designs.map(d => d.name).join(',') + '|' + TREE_KEYS.map(t => S.tech[t].done.length).join(',');
  if (key !== armKey) {
    armKey = key;
    const ae = document.activeElement, caret = ae && ae.id === 'armName' ? ae.selectionStart : null;
    if (caret !== null) queueMicrotask(() => { const nm = $q('#armName'); if (nm) { nm.focus({ preventScroll: true }); nm.setSelectionRange(caret, caret); } });
    const st = draft.type === 'mage' ? null : designStats(draft), W = WEAPONS[draft.weapon];
    const list = ['inf', 'cav'].map(type => `<div class="ar-group"><div class="ar-gh">${UNIT_BASE[type].name}</div>` + S.designs.filter(d => d.type === type && (d.race || 'realm') === raceOf(ME)).map(d => { const s = DSTATS[d.id]; return `<button type="button" class="ar-d${armSel === d.id ? ' on' : ''}" data-design="${d.id}"><img alt="" src="${portrait(d.id)}"><span><b>${d.name}</b><small>⚔${s.atk} ♥${s.hp} 🛡${Math.round(s.red * 100)}% ➜${s.speed}</small></span></button>`; }).join('') + `<button type="button" class="ar-new" data-new="${type}">＋ New ${type === 'cav' ? (isSw(ME) ? 'Ogre' : isWd(ME) ? 'Champion' : 'cavalry') : (isSw(ME) ? 'Berserker' : isWd(ME) ? 'Protector' : 'infantry')} design</button></div>`).join('') + (() => { const ms = DSTATS[MAGE]; return `<div class="ar-group"><div class="ar-gh">${UNIT_DEFS[MAGE].name}s</div><button type="button" class="ar-d${armSel === 'mage' ? ' on' : ''}" data-design="mage"><img alt="" src="${portrait(MAGE)}"><span><b>${UNIT_DEFS[MAGE].name} gear</b><small>⚔${ms.atk} ♥${ms.hp} 🛡${Math.round(ms.red * 100)}% ➜${ms.speed.toFixed(2)}</small></span></button></div>`; })();
    if (draft.type === 'mage') { renderMageEditor(list); return drawArmPreview(); }
    if (isChampDesign(draft)) { renderChampEditor(list, st, W); return drawArmPreview(); }
    const sw = isSw(ME), MOUNTS = mountsFor(raceOf(ME));
    const fams = famsFor(raceOf(ME)).map(f => [f, FAMILY[f]]).map(([f, F]) => `<div class="ar-row"><span class="ar-rl">${F.name}<small>${F.note}</small></span><div class="ar-eqs">${F.order.map(w => equipButton('weapon', w, WEAPONS[w], draft.weapon === w, lockWhy(WEAPONS[w]))).join('')}</div></div>`).join('');
    const shields = sw ? offhandRow(draft, W) : raceOf(ME) === 'wood' ? gripRow(draft) : `<div class="ar-row"><span class="ar-rl">Shield<small>${W.twoH ? W.name + ' needs both hands' : 'One-handed weapons only'}</small></span><div class="ar-eqs"><button type="button" class="ar-eq${!draft.shield || W.twoH ? ' on' : ''}" data-eq="shield:none"><span class="ar-none">—</span><span>None</span></button>${Object.entries(SHIELD_DEFS).map(([k, s]) => equipButton('shield', k, s, draft.shield === k && !W.twoH, W.twoH ? 'Two-handed weapon' : lockWhy(s))).join('')}</div></div>`;
    const armors = armorsFor(raceOf(ME)).map(t => [t, ARMOR_TYPES[t]]).map(([t, A]) => `<div class="ar-row"><span class="ar-rl">${A.name}<small>${A.note}</small></span><div class="ar-eqs">${[1, 2, 3, 4].map(lv => equipButton('armor', t + lv, ARMORS[t + lv], draft.armor === t + lv, lockWhy(ARMORS[t + lv]))).join('')}</div></div>`).join('');
    const horses = draft.type === 'cav' ? `<div class="ar-sec">${sw ? 'Ogre' : 'Horse'}</div><div class="ar-row"><span class="ar-rl">${sw ? 'Kind' : 'Mount'}<small>${sw ? 'Each kind of Ogre trades speed, toughness, blows and cost' : 'Each breed trades speed, toughness, charge and cost'}</small></span><div class="ar-eqs">${Object.entries(MOUNTS).map(([k, h]) => equipButton('horse', k, h, draft.horse === k, lockWhy(h))).join('')}</div></div>` : '';
    const cur = draft.id && designById(draft.id), inUse = cur && designInUse(cur.id);
    $q('#armory').innerHTML = `<div class="ar-head"><b>Armory</b><span>Design the soldiers your Barracks train. Better gear costs more.</span><button type="button" class="tp-x" data-ar="close" aria-label="Close the Armory">×</button></div>
      <div class="ar-body"><div class="ar-list">${list}</div>
      <div class="ar-edit">
        <div class="ar-top"><canvas id="armPrev" width="220" height="220" aria-label="Preview of the design"></canvas>
          <div class="ar-sum"><label class="ar-name"><span>Name</span><input id="armName" type="text" maxlength="24" value="${draft.name.replace(/"/g, '&quot;')}" spellcheck="false"></label>
          <div class="ar-kind">${UNIT_BASE[draft.type].name}${cur && cur.builtin ? ' · starting design' : inUse ? ' · in use' : ''}</div>
          ${statBar('Attack', st.atk, 18, st.atk)}${statBar('Health', st.hp, 75, st.hp)}${statBar('Armor', st.red, 0.65, Math.round(st.red * 100) + '%')}${statBar('Speed', st.speed, 2, st.speed)}
          <div class="ar-cost"><span>Cost</span>${costHTML(st.cost)}<span>Upkeep</span>${costHTML(st.upkeep)}</div>
          <div class="ar-note">${FAMILY[W.fam].note}.${st.cav ? ' ' + MOUNTS[draft.horse || 'riding'].note + (sw ? ' Trained at an Ogre Cave.' : ' Needs a Barracks and a Stable.') : ''}</div>
          <div class="ar-btns"><button type="button" class="ar-save" data-ar="save">${cur && !cur.builtin && !inUse ? 'Save changes' : 'Save as new design'}</button>${cur ? `<button type="button" class="ar-save ar-retro" data-ar="retro" title="Re-equip every ${cur.type === 'cav' ? 'cavalry' : 'infantry'} soldier standing in your own provinces with this design; you pay the difference in gear cost">Retrofit armies</button>` : ''}${cur && !cur.builtin ? `<button type="button" class="ar-del" data-ar="delete">Delete</button>` : ''}</div></div></div>
        <div class="ar-sec">Weapon</div>${fams}${shields}<div class="ar-sec">Armor</div>${armors}${horses}
      </div></div>`;
  }
  drawArmPreview();
}
function drawArmPreview() {
  // spin the preview so the design can be seen from all sides
  const cv = $q('#armPrev'); if (!cv) return;
  const g = cv.getContext('2d'), t = performance.now() / 1000; armSpin = t * 0.6;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#9bd95f'; g.beginPath(); g.ellipse(110, 186, 80, 24, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
  const id = '__draft'; const ogre = draft.type === 'cav' && isSw(ME), ch = isChampDesign(draft); RealmIso.UNITS[id] = { unit: ogre ? 'ogre' : ch ? 'champion' : draft.type === 'cav' ? 'cavalry' : 'footman', spec: draft.type === 'mage' ? mageArtSpec(draft) : specFor(draft) };
  RealmIso.drawUnitAt(g, id, Math.round(armSpin / (Math.PI / 4)) * (Math.PI / 4), t * 2, 110, ch ? 196 : 186, ogre ? 0.62 : ch ? 0.6 : draft.type === 'cav' ? 0.62 : 1.05);
}
const armEl = $q('#armory');
armEl.addEventListener('pointerdown', e => e.stopPropagation());
armEl.addEventListener('wheel', e => e.stopPropagation());
armEl.addEventListener('keydown', e => e.stopPropagation());
armEl.addEventListener('input', e => { if (e.target.id === 'armName' && draft) draft.name = e.target.value; });   // IC06: the panel's redraw key leaves the name out, so the box keeps its focus while you type
armEl.addEventListener('click', e => {
  const t = e.target.closest('[data-design],[data-new],[data-eq],[data-ar]'); if (!t) return;
  if (t.dataset.design) { editDesign(t.dataset.design); return; }
  if (t.dataset.new) { newDesign(t.dataset.new); return; }
  if (t.dataset.ar === 'close') { toggleArmory(false); return; }
  if (t.dataset.ar === 'save') { saveDraft(); return; }
  if (t.dataset.ar === 'delete') { deleteDesign(draft.id); return; }
  if (t.dataset.eq) {
    if (t.getAttribute('aria-disabled')) { toast(t.title, true); return; }
    const [kind, key] = t.dataset.eq.split(':'), nm = $q('#armName'); if (nm) draft.name = nm.value;
    if (kind === 'weapon') { draft.weapon = key; if ((WEAPONS[key] || MAGE_WEAPONS[key]).twoH) { draft.shield = null; draft.off = null; } }
    else if (kind === 'off') draft.off = key === 'none' ? null : key;
    else if (kind === 'shield') draft.shield = key === 'none' ? null : key;
    else if (kind === 'armor') draft.armor = key;
    else if (kind === 'horse') draft.horse = key;
    else if (kind === 'grip') draft.two = key === 'two';
  }
});
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#armBtn')) { toggleArmory(); e.target.closest('#armBtn').blur(); } });
window.addEventListener('keydown', e => { if (!S.started || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return; if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) toggleArmory(); else if (e.key === 'Escape' && armOpen) toggleArmory(false); });

function renderMageEditor(list) {
  const st = mageStats(draft), W = MAGE_WEAPONS[draft.weapon], M = UNIT_DEFS[MAGE].name, staffOnly = isWd(ME);   // v96: Druids carry staves only (no wands, no shields)
  const lines = [['stave', 'Staves', staffOnly ? 'Two-handed. Druids carry staves only' : 'Two-handed, the stronger attack'], ['wand', 'Wands', 'One-handed: leaves room for a shield']].filter(([line]) => !staffOnly || line === 'stave').map(([line, name, note]) => `<div class="ar-row"><span class="ar-rl">${name}<small>${note}</small></span><div class="ar-eqs">${Object.entries(MAGE_WEAPONS).filter(([, w]) => w.line === line).map(([k, w]) => equipButton('weapon', k, w, draft.weapon === k, lockWhy(w))).join('')}</div></div>`).join('');
  const shields = staffOnly ? '' : `<div class="ar-row"><span class="ar-rl">Shield<small>${W.twoH ? 'Staves need both hands' : 'Wands only'}</small></span><div class="ar-eqs"><button type="button" class="ar-eq${!draft.shield || W.twoH ? ' on' : ''}" data-eq="shield:none"><span class="ar-none">—</span><span>None</span></button>${Object.entries(SHIELD_DEFS).map(([k, sh]) => equipButton('shield', k, sh, draft.shield === k && !W.twoH, W.twoH ? 'Two-handed stave' : lockWhy(sh))).join('')}</div></div>`;
  $q('#armory').innerHTML = `<div class="ar-head"><b>Armory</b><span>Design the soldiers your Barracks train. Better gear costs more.</span><button type="button" class="tp-x" data-ar="close" aria-label="Close the Armory">×</button></div>
    <div class="ar-body"><div class="ar-list">${list}</div><div class="ar-edit">
      <div class="ar-top"><canvas id="armPrev" width="220" height="220" aria-label="Preview of the ${M}"></canvas>
        <div class="ar-sum"><div class="ar-kind" style="font-size:15px;font-weight:800;color:var(--chip-text)">${M} gear · every ${M}</div>
        ${statBar('Attack', st.atk, 18, st.atk)}${statBar('Health', st.hp, 75, st.hp)}${statBar('Armor', st.red, 0.65, Math.round(st.red * 100) + '%')}${statBar('Speed', st.speed, 2, st.speed.toFixed(2))}
        <div class="ar-cost"><span>Train</span>${costHTML(UNIT_DEFS[MAGE].cost)}<span>Upkeep</span>${costHTML(UNIT_DEFS[MAGE].upkeep)}</div>
        <div class="ar-note">${M}s are trained at a ${BUILD_DEFS.magetower ? BUILD_DEFS.magetower.name : 'Mage Tower'}. Their gear is shared: changing it re-equips every ${M}.</div>
        <div class="ar-btns"><button type="button" class="ar-save" data-ar="save">Equip all ${M}s</button></div></div></div>
      <div class="ar-sec">Weapon</div>${lines}${shields}</div></div>`;
}

// ---------- Woodlings (v93): the Champion editor and the two-handed grip row ----------
// the grip: Champions may always swing two-handed; Protectors once Two-Handed Grip is researched
function gripRow(d) {
  const ch = isChampDesign(d), locked = !ch && !hasTech('twohand') ? 'Research ' + TECH_BY_ID.twohand.name + ' (Military)' : null;
  const btn = (key, name, why) => `<button type="button" class="ar-eq${(key === 'two') === !!d.two ? ' on' : ''}${why ? ' locked' : ''}" data-eq="grip:${key}" ${why ? 'aria-disabled="true"' : ''} title="${name}${why ? ' · ' + why : ''}"><img alt="" src="${equipIcon('grip', key)}"><span>${name}</span>${why ? '<em>🔒</em>' : ''}</button>`;
  return `<div class="ar-row"><span class="ar-rl">Grip<small>${locked || 'Two hands: nothing every other round, then a blow 2.5 times as hard (125% over time)'}</small></span><div class="ar-eqs">${btn('one', 'Steady blows', null)}${btn('two', 'Two-handed', locked)}</div></div>`;
}
function renderChampEditor(list, st, W) {
  const cur = draft.id && designById(draft.id), inUse = cur && designInUse(cur.id);
  const weapons = `<div class="ar-row"><span class="ar-rl">Champion weapons<small>Two-handed: three times the blow of a one-handed blade; each keeps its family’s bonus</small></span><div class="ar-eqs">${CHAMP_WEAPONS.map(w => equipButton('weapon', w, WEAPONS[w], draft.weapon === w, lockWhy(WEAPONS[w]))).join('')}</div></div>`;
  const armors = `<div class="ar-row"><span class="ar-rl">${ARMOR_TYPES.ornate.name}<small>Champions wear Ornate armor only (Ornate I needs no research)</small></span><div class="ar-eqs">${[1, 2, 3, 4].map(lv => equipButton('armor', 'ornate' + lv, ARMORS['ornate' + lv], draft.armor === 'ornate' + lv, lockWhy(ARMORS['ornate' + lv]))).join('')}</div></div>`;
  const wnote = W.champ ? W.note : '';
  $q('#armory').innerHTML = `<div class="ar-head"><b>Armory</b><span>Design the soldiers your Barracks train. Better gear costs more.</span><button type="button" class="tp-x" data-ar="close" aria-label="Close the Armory">×</button></div>
    <div class="ar-body"><div class="ar-list">${list}</div>
    <div class="ar-edit">
      <div class="ar-top"><canvas id="armPrev" width="220" height="220" aria-label="Preview of the design"></canvas>
        <div class="ar-sum"><label class="ar-name"><span>Name</span><input id="armName" type="text" maxlength="24" value="${draft.name.replace(/"/g, '&quot;')}" spellcheck="false"></label>
        <div class="ar-kind">Champion${cur && cur.builtin ? ' · starting design' : inUse ? ' · in use' : ''}</div>
        ${statBar('Attack', st.atk, 60, st.atk)}${statBar('Health', st.hp, 120, st.hp)}${statBar('Armor', st.red, 0.75, Math.round(st.red * 100) + '%')}${statBar('Speed', st.speed, 2, st.speed)}
        <div class="ar-cost"><span>Cost</span>${costHTML(st.cost)}<span>Upkeep</span>${costHTML(st.upkeep)}</div>
        <div class="ar-note">${FAMILY[W.fam].note}. ${wnote} Trained at a ${BUILD_DEFS.barracks.name} with a ${BUILD_DEFS.stable.name} in the same province. Not mounted: no cavalry penalties, and spears get no bonus against them.</div>
        <div class="ar-btns"><button type="button" class="ar-save" data-ar="save">${cur && !cur.builtin && !inUse ? 'Save changes' : 'Save as new design'}</button>${cur ? `<button type="button" class="ar-save ar-retro" data-ar="retro" title="Re-equip every Champion standing in your own provinces with this design; you pay the difference in gear cost">Retrofit armies</button>` : ''}${cur && !cur.builtin ? `<button type="button" class="ar-del" data-ar="delete">Delete</button>` : ''}</div></div></div>
      <div class="ar-sec">Weapon</div>${weapons}${gripRow(draft)}<div class="ar-sec">Armor</div>${armors}
    </div></div>`;
}
