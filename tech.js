
// ================= technology =================
// three research trees, Stellaris style: each tree researches one technology at a time, picked from a few offered options.
// Government is open from the start; Military opens with a Forge, Magic with a Mage Tower.
// Research points arrive every payout (5 s); a tree's tier decides which technologies can be offered.
const TECH_TREES = {
  gov: { name: 'Government', color: '#3f72d9', light: '#e3ecff', locked: '', rate: 'Forts +2, Capital +3, Temples +2 per payout (outposts give none)', tiers: ['Start', 'Own a Fort', 'Own 2 Forts'] },
  mil: { name: 'Military', color: '#c8473d', light: '#ffe6e1', locked: 'Research the Forge (Government Tier I), then build one to unlock Military research.', rate: 'Forge +2, Battle Forge +4, War Forge +6 per payout', tiers: ['Forge', 'Battle Forge', 'War Forge'] },
  mag: { name: 'Magic', color: '#7a55c9', light: '#efe8ff', locked: 'Research the Mage Tower (Government Tier II), then build one to unlock Magic.', rate: 'Mage Tower +2, Sanctum +4, Arcanum +6 per payout', tiers: ['Mage Tower', 'Mage Sanctum', 'Mage Arcanum'] }
};
const TREE_KEYS = ['gov', 'mil', 'mag'];
const TECH_COST = [0, 40, 100, 200];      // points per tier (placeholders)
const TECH_OPTIONS = 3;                    // how many choices are offered at once
const LEVEL_POINTS = [0, 2, 4, 6];         // research points per Forge / Mage Tower level
// dummy technologies for testing: 3 per tier per tree, each adding a little income so completion is visible
const ROMAN = ['', 'I', 'II', 'III'];
const DUMMY_WORD = { gov: 'Edict', mil: 'Drill', mag: 'Rite' };
const TECHS = [
  // Government, Tier I: the first real technologies
  { id: 'roads', tree: 'gov', tier: 1, cost: 40, name: 'Dirt Roads', blurb: 'Masons can build a dirt road across an open border (75 wood, 25 gold). Units move 25% faster along it.' },
  { id: 'walls', tree: 'gov', tier: 1, cost: 60, name: 'Wooden Walls', blurb: 'Masons can close an open border with a wooden palisade (150 wood, 100 gold). Every wall has a gate that only its owner’s units can pass. Forts raise walls with gates on all their open borders.' },
  { id: 'stable', tree: 'gov', tier: 1, cost: 30, name: 'Building: Stable', blurb: 'Unlocks the Stable, which lets a Barracks in the same province train Cavalry.' },
  { id: 'market', tree: 'gov', tier: 1, cost: 30, name: 'Building: Marketplace', blurb: 'Unlocks the Marketplace: +3 gold every payout, buildable in any province.' },
  { id: 'granary', tree: 'gov', tier: 1, cost: 30, name: 'Building: Granary', blurb: 'Unlocks the Granary: +1000 food storage each (the nation starts able to hold 2000).' },
  { id: 'storehouse', tree: 'gov', tier: 1, cost: 30, name: 'Building: Storehouse', blurb: 'Unlocks the Storehouse: +1000 wood storage each (the nation starts able to hold 2000).' },
  { id: 'bank', tree: 'gov', tier: 1, cost: 40, name: 'Building: Bank', blurb: 'Unlocks the Bank: +1000 gold storage each (the nation starts able to hold 2000).' },
  { id: 'forts', tree: 'gov', tier: 1, cost: 60, name: 'Fort Charters I', blurb: 'Raises the Fort limit from 1 to 3.' },
  { id: 'autoscout', tree: 'gov', tier: 1, cost: 40, name: 'Automating Wayfinders', blurb: 'Idle Wayfinders survey explored, unsurveyed provinces on their own. Toggle it on a Wayfinder’s command card.' },
  { id: 'arrowslits', tree: 'gov', tier: 1, cost: 50, name: 'Arrowslits', blurb: 'Forts and capitals shoot at enemy armies standing in their province: one volley every 10 s, enough to bring down a Footman. An occupied fort stops shooting.' },
  { id: 'advfarms', tree: 'gov', tier: 1, cost: 40, name: 'Advanced Farms', blurb: 'Every Farm gives +1 food.' },
  { id: 'advmills', tree: 'gov', tier: 1, cost: 40, name: 'Advanced Lumber Mills', blurb: 'Every Lumber Mill gives +1 wood.' },
  { id: 'advmines', tree: 'gov', tier: 1, cost: 50, name: 'Advanced Gold Mines', blurb: 'Every Gold Mine gives +2 gold.' },
  { id: 'forge', tree: 'gov', tier: 1, cost: 40, name: 'Building: Forge', blurb: 'Unlocks the Forge, which opens Military research. Owning a Barracks makes this technology 50% more likely to be offered.' },
  { id: 'retained', tree: 'gov', tier: 1, cost: 50, name: 'Retained Knowledge', blurb: 'Every research tree (Government, Military and Magic) offers one more technology to choose from (4 instead of 3).' },
  // Government, Tier II (own a Fort)
  { id: 'magetower', tree: 'gov', tier: 2, cost: 100, name: 'Building: Mage Tower', blurb: 'Unlocks the Mage Tower, which trains Mages and opens Magic research. Your first tower lets you choose a school of magic.' },
  { id: 'roads2', tree: 'gov', tier: 2, req: 'roads', cost: 100, name: 'Gravel Roads', blurb: 'Every road is relaid in gravel: units move 35% faster along roads.' },
  { id: 'walls2', tree: 'gov', tier: 2, req: 'walls', cost: 120, name: 'Stone Walls', blurb: 'Walls are built of stone, and existing palisades are rebuilt in stone: three times as strong.' },
  { id: 'forts2', tree: 'gov', tier: 2, req: 'forts', cost: 100, name: 'Fort Charters II', blurb: 'Raises the Fort limit from 3 to 5.' },
  { id: 'stealth', tree: 'gov', tier: 2, req: 'autoscout', cost: 100, name: 'Wayfinder Stealth', blurb: 'Wayfinders can sneak: three times slower, but enemy armies can’t see them. Without it, an enemy army that finds a Wayfinder kills him.' },
  { id: 'mushroom', tree: 'gov', tier: 2, req: 'advfarms', cost: 100, name: 'Mushroom Farming', blurb: 'Farms can be built in swamps too: damp, dark beds of mushrooms.' },
  { id: 'reffarms', tree: 'gov', tier: 2, req: 'advfarms', cost: 100, name: 'Refined Farms', blurb: 'Every Farm gives another +1 food.' },
  { id: 'refmills', tree: 'gov', tier: 2, req: 'advmills', cost: 100, name: 'Refined Lumber Mills', blurb: 'Every Lumber Mill gives another +1 wood.' },
  { id: 'refmines', tree: 'gov', tier: 2, req: 'advmines', cost: 110, name: 'Refined Gold Mines', blurb: 'Every Gold Mine gives another +2 gold.' },
  { id: 'moat', tree: 'gov', tier: 2, cost: 100, name: 'Moat', blurb: 'Your forts and capital are ringed with water: an enemy needs 10 seconds longer to capture them.' },
  { id: 'traderoutes', tree: 'gov', tier: 2, req: ['roads', 'market'], cost: 110, name: 'Trade Routes', blurb: 'Your capital makes +1 gold for every Marketplace it can reach by road, through any number of your provinces.' },
  // Government, Tier III (own 2 Forts)
  { id: 'roads3', tree: 'gov', tier: 3, req: 'roads2', cost: 200, name: 'Cobblestone Roads', blurb: 'Every road is paved with cobbles: units move 50% faster along roads.' },
  { id: 'forts3', tree: 'gov', tier: 3, req: 'forts2', cost: 200, name: 'Fort Charters III', blurb: 'Raises the Fort limit from 5 to 7 and removes the outpost limit: claim as many outposts as you can hold.' },
  { id: 'farsight', tree: 'gov', tier: 3, req: 'stealth', cost: 200, name: 'Far-Seeing Wayfinders', blurb: 'Wayfinders see into every province next to the one they stand in, and every unexplored province they look into is explored for good.' },
  { id: 'sophfarms', tree: 'gov', tier: 3, req: 'reffarms', cost: 200, name: 'Sophisticated Farms', blurb: 'Every Farm gives another +1 food.' },
  { id: 'sophmills', tree: 'gov', tier: 3, req: 'refmills', cost: 200, name: 'Sophisticated Lumber Mills', blurb: 'Every Lumber Mill gives another +1 wood.' },
  { id: 'sophmines', tree: 'gov', tier: 3, req: 'refmines', cost: 220, name: 'Sophisticated Gold Mines', blurb: 'Every Gold Mine gives another +2 gold.' },
  { id: 'retained2', tree: 'gov', tier: 3, req: 'retained', cost: 200, name: 'Retained Knowledge II', blurb: 'Every research tree (Government, Military and Magic) offers one more technology again (5 to choose from).' },
  // Swamplings only: more room in the Thug Dens
  { id: 'thugs2', tree: 'gov', tier: 2, req: 'market', cost: 100, race: 'swamp', name: 'Thugging Benefits Program', blurb: 'Every Thug Den holds one more Thug (3 instead of 2).' },
  { id: 'thugs3', tree: 'gov', tier: 3, req: 'thugs2', cost: 200, race: 'swamp', name: 'Thugging Stock Options', blurb: 'Every Thug Den holds one more Thug again (4).' }
];
// Military: weapons, shields, armor and horses for the Armory. Each family must be researched in order.
const TECH_EQUIP = { 'w-gladius': 'gladius', 'w-rapier': 'rapier', 'w-estoc': 'estoc', 'w-bearded': 'beardedaxe', 'w-battleaxe': 'battleaxe', 'w-waraxe': 'waraxe', 'w-pike': 'pike', 'w-polearm': 'polearm', 'w-halberd': 'halberd', 'w-bastard': 'sword', 'w-longsword': 'longsword', 'w-greatsword': 'greatsword', 'w-mace': 'mace', 'w-morningstar': 'morningstar', 'w-warhammer': 'warhammer' };
const MIL_TECHS = [
  ['w-pike', 1], ['w-bastard', 1], ['w-mace', 1], ['s-round', 1], ['a-leather2', 1], ['a-chain1', 1], ['horse-breeding', 1, 'stable', 60],
  ['w-polearm', 2, 'w-pike'], ['w-longsword', 2, 'w-bastard'], ['w-morningstar', 2, 'w-mace'], ['s-kite', 2, 's-round'], ['a-leather3', 2, 'a-leather2'], ['a-chain2', 2, 'a-chain1'], ['a-plate1', 2, 'a-chain1'], ['a-plate2', 2, 'a-plate1'], ['horse-training', 2, 'horse-breeding'],
  ['w-halberd', 3, 'w-polearm'], ['w-greatsword', 3, 'w-longsword'], ['w-warhammer', 3, 'w-morningstar'], ['s-tower', 3, 's-kite'], ['s-aegis', 3, 's-tower'], ['a-leather4', 3, 'a-leather3'], ['a-chain3', 3, 'a-chain2'], ['a-chain4', 3, 'a-chain3'], ['a-plate3', 3, 'a-plate2'], ['a-plate4', 3, 'a-plate3']
];
MIL_TECHS.push(['battleforge', 1, null, 60], ['warforge', 2, 'battleforge', 140], ['horde', 2, null, 100]);
// Swamplings: axes and their own armor lines in place of swords, shields, leather, chain and plate; and dual wielding
MIL_TECHS.push(['w-bearded', 1], ['w-battleaxe', 2, 'w-bearded'], ['w-waraxe', 3, 'w-battleaxe'],
  ['a-stag2', 1], ['a-wyvern1', 1], ['a-stag3', 2, 'a-stag2'], ['a-wyvern2', 2, 'a-wyvern1'], ['a-dragon1', 2, 'a-wyvern1'], ['a-dragon2', 2, 'a-dragon1'],
  ['a-stag4', 3, 'a-stag3'], ['a-wyvern3', 3, 'a-wyvern2'], ['a-wyvern4', 3, 'a-wyvern3'], ['a-dragon3', 3, 'a-dragon2'], ['a-dragon4', 3, 'a-dragon3'], ['dualwield', 1, null, 40]);
// Woodlings (v90): thrusting swords and their own armor lines (the Realmlings' three, renamed)
MIL_TECHS.push(['w-gladius', 1], ['w-rapier', 2, 'w-gladius'], ['w-estoc', 3, 'w-rapier'],
  ['a-spirit2', 1], ['a-mithril1', 1], ['a-spirit3', 2, 'a-spirit2'], ['a-mithril2', 2, 'a-mithril1'], ['a-ornate1', 2, 'a-mithril1'], ['a-ornate2', 2, 'a-ornate1'],
  ['a-spirit4', 3, 'a-spirit3'], ['a-mithril3', 3, 'a-mithril2'], ['a-mithril4', 3, 'a-mithril3'], ['a-ornate3', 3, 'a-ornate2'], ['a-ornate4', 3, 'a-ornate3'],
  ['twohand', 1]);   // v93: Two-Handed Grip, in place of Round Shields
for (const [id, tier, req, cost] of MIL_TECHS) {
  if (id === 'dualwield') { TECHS.push({ id, tree: 'mil', tier, cost, race: 'swamp', name: 'Dual Wielding', blurb: 'Berserkers and Ogres with a one-handed weapon can carry a second one in the off hand (set it in the Armory). The off-hand weapon hits for half its attack.' }); continue; }
  if (id === 'twohand') { TECHS.push({ id, tree: 'mil', tier, cost: TECH_COST[tier], race: 'wood', name: 'Two-Handed Grip', blurb: 'Protectors can be designed to fight two-handed (set the grip in the Armory): every other round they deal nothing, and the next a blow 2.5 times as hard, 125% of their damage over time. Champions fight this way without it.' }); continue; }
  if (id === 'horde') { TECHS.push({ id, tree: 'mil', tier, cost, name: 'The Horde', blurb: 'An army of 10 or more cavalry and no other units has 1.3 times the health. A horseshoe over the army shows when it is active.' }); continue; }
  if (id === 'battleforge' || id === 'warforge') { TECHS.push({ id, tree: 'mil', tier, cost, req, name: id === 'battleforge' ? 'Battle Forge' : 'War Forge', blurb: id === 'battleforge' ? 'Lets a Forge be upgraded to a Battle Forge (Military Tier II). Offered once two Tier I Military technologies are researched.' : 'Lets a Battle Forge be upgraded to a War Forge (Military Tier III).' }); continue; }
  let name, blurb;
  if (id.startsWith('w-')) { const W = WEAPONS[TECH_EQUIP[id]]; name = W.name.endsWith('s') ? W.name : W.name + 's'; blurb = `${W.name} for the Armory: attack ${W.atk}, ${W.twoH ? 'two-handed' : 'one-handed'}. ${FAMILY[W.fam].note}.`; }
  else if (id.startsWith('s-')) { const Sh = SHIELD_DEFS[id.slice(2)]; name = Sh.name + 's'; blurb = `${Sh.name} for one-handed designs: +${Sh.armor} armor${Sh.speed < 1 ? ', but 8% slower' : ''}.`; }
  else if (id.startsWith('a-')) { const A = ARMORS[id.slice(2)]; name = A.name + ' Armor'; blurb = `${A.name} armor for the Armory: ${A.armor} armor, ${ARMOR_TYPES[A.type].note}.`; }
  else if (id === 'horse-breeding') { name = 'Horse Breeding'; blurb = 'Needs Building: Stable (Government). Cavalry can ride Arabians (fastest, fragile) or Mongolian horses (cheap to feed, at home in forest and swamp, weak charge).'; }
  else { name = 'Horse Training'; blurb = 'Unlocks Friesians (the hardest charge) and armored Percherons (toughest, but slow and hungry).'; }
  TECHS.push({ id, tree: 'mil', tier, cost: cost || TECH_COST[tier], req, name, blurb });
}
// Magic: pick one school (Herbomancy, Necromancy or Arcane); only that school's spells can be researched. Staves and wands are open to every school.
const MAG_TECHS = [
  ['school-life', 1, null, null, 40, 'School of Herbomancy', 'Commit to Herbomancy: harvests, protective skins, healing and the forest.'],
  ['school-death', 1, null, null, 40, 'School of Necromancy', 'Commit to Necromancy: cursed weapons, mountain passages, the risen dead and grave riches.'],
  ['school-arcane', 1, null, null, 40, 'School of the Arcane', 'Commit to Arcane magic: far sight from towers, mind reading, trading across worlds, traps and rifts.'],
  // Herbomancy (Life)
  ['harvest', 1, 'school-life', 'life', 40, 'Harvest', 'A Mage casts it for as long as he stands still: every Farm you own gives 10% more food. One Mage casts it at a time.'],
  ['bountiful', 2, 'harvest', 'life', 100, 'Bountiful Harvest', 'Harvest makes Farms give 20% more food.'],
  ['magnificent', 3, 'bountiful', 'life', 200, 'Magnificent Harvest', 'Harvest makes Farms give 30% more food.'],
  ['apprentice', 1, null, '*', 40, 'Apprentice', 'Your Mage limit rises by 1: you can train a second Mage.'],
  ['sanctum', 1, null, '*', 60, 'Mage Sanctum', 'Lets a Mage Tower be upgraded to a Mage Sanctum (Magic Tier II).'],
  ['arcanum', 2, 'sanctum', '*', 140, 'Mage Arcanum', 'Lets a Mage Sanctum be upgraded to a Mage Arcanum (Magic Tier III).'],
  ['skin', 1, 'school-life', 'life', 40, 'Hardened Skin', 'Autocast: when an army with a Mage starts a battle, its soldiers get +5% health. 5-minute cooldown per army.'],
  ['stoneskin', 2, 'skin', 'life', 100, 'Stone Skin', 'Skin spell gives +10% health; cooldown 3 minutes.'],
  ['diamondskin', 3, 'stoneskin', 'life', 200, 'Diamond Skin', 'Skin spell gives +15% health; cooldown 90 seconds.'],
  ['mending', 1, 'school-life', 'life', 40, 'Mending', 'Mages heal an army’s wounds back to full over 1 minute. 3-minute cooldown.'],
  ['rejuvenation', 2, 'mending', 'life', 100, 'Rejuvenation', 'Healing takes 30 seconds; cooldown 2 minutes.'],
  ['restoration', 3, 'rejuvenation', 'life', 200, 'Restoration', 'Healing is instant and has no cooldown.'],
  ['forest', 1, 'school-life', 'life', 40, 'Speak with the Forest', 'A Mage can open a path through a border of trees after 2 minutes of casting. Lumber Mills are unaffected.'],
  ['commune', 2, 'forest', 'life', 100, 'Commune with Nature', 'Opening a forest path takes 1 minute.'],
  ['arboreal', 3, 'commune', 'life', 200, 'Arboreal Restoration', 'A Mage can close a forest path again with 1 minute of casting.'],
  ['terrascape', 3, 'forest', 'life', 200, 'Terrascaping', 'A Mage grows a line of trees along an open border, with a forest path left open in the middle: only a path through the trees remains. 5 minutes of casting.'],
  // Necromancy (Death)
  ['curse1', 1, 'school-death', 'death', 40, 'Cursed Weapons I', 'Autocast: when an army with a Mage starts a battle, its weapons deal +5% damage. 5-minute cooldown per army.'],
  ['curse2', 2, 'curse1', 'death', 100, 'Cursed Weapons II', 'Cursed Weapons deal +10% damage; cooldown 3 minutes.'],
  ['curse3', 3, 'curse2', 'death', 200, 'Cursed Weapons III', 'Cursed Weapons deal +15% damage; cooldown 90 seconds.'],
  ['underworld', 1, 'school-death', 'death', 40, 'Underworld Passage', 'A Mage can open a tunnel through a mountain border after 2 minutes of casting.'],
  ['hallways', 2, 'underworld', 'death', 100, 'Hallways of Pain', 'Opening a mountain tunnel takes 1 minute.'],
  ['sealed', 3, 'hallways', 'death', 200, 'Sealed Gates', 'A Mage can seal a mountain tunnel again with 1 minute of casting.'],
  ['risen', 1, 'school-death', 'death', 40, 'Risen Dead', 'Autocast: while a Mage with Risen Dead ready is in the army, every 4th soldier who falls in battle rises again at once. One Mage can keep this or Cursed Weapons ready, not both; two Mages can use both. 2-minute cooldown after the battle.'],
  ['necro', 2, 'risen', 'death', 100, 'Necromantic Energies', 'Every 3rd fallen soldier rises again.'],
  ['armyofdeath', 3, 'necro', 'death', 200, 'Army of Death', 'Every other fallen soldier rises again.'],
  ['graverob', 1, 'school-death', 'death', 40, 'Grave Robbing', 'A 3-minute cast that yields 300 gold. One Mage casts it at a time; then the nation waits 3 minutes.'],
  ['deathtax', 2, 'graverob', 'death', 100, 'Death Taxes', 'Grave Robbing yields 600 gold.'],
  ['charon', 3, 'deathtax', 'death', 200, 'Charon’s Riches', 'Grave Robbing yields 1000 gold.'],
  // Arcane
  ['arcscouts', 1, 'school-arcane', 'arcane', 40, 'Arcane Scouts', 'Every Mage Tower (and its upgrades) sees all neighboring provinces, permanently.'],
  ['arcvision', 2, 'arcscouts', 'arcane', 100, 'Arcane Vision', 'Mage Towers reveal stealthed units within their sight.'],
  ['clearthoughts', 1, 'school-arcane', 'arcane', 40, 'Clear Thoughts', 'While a Mage casts, every army within 3 provinces of him is revealed. No cooldown.'],
  ['mindread', 2, 'clearthoughts', 'arcane', 100, 'Mind Reading', 'While a Mage casts, every army on the map is revealed. No cooldown.'],
  ['trading', 1, 'school-arcane', 'arcane', 40, 'Interdimensional Trading', 'A 3-minute cast that yields 100 food, 100 gold and 100 wood. One Mage casts it at a time; then the nation waits 3 minutes.'],
  ['stockmarket', 2, 'trading', 'arcane', 100, 'Interdimensional Stockmarket', 'Trading yields 200 of each resource.'],
  ['planar', 3, 'stockmarket', 'arcane', 200, 'Planar Bazaar', 'Trading yields 333 of each resource.'],
  ['stasis', 1, 'school-arcane', 'arcane', 40, 'Stasis Trap', 'A Mage sets a trap in his province; the next enemy army there can’t leave for 10 seconds (it can still fight). One trap at a time; 1-minute cooldown after it springs.'],
  ['prison', 2, 'stasis', 'arcane', 100, 'Stasis Prison', 'The trap holds for 20 seconds.'],
  ['rift', 1, 'school-arcane', 'arcane', 40, 'Teleportation Rift', 'A Mage opens a rift where he stands. Later, a casting Mage anywhere can send one army through it to the rift. Single use.'],
  ['portal', 2, 'rift', 'arcane', 100, 'Teleportation Portal', 'Rifts can be used 3 times.'],
  // every school: staves (two-handed) and wands (one-handed, allow a shield)
  ['grandstave', 2, null, '*', 100, 'Grand Staves', 'Mages can carry a Grand Stave: attack 6 (Stave 4).'],
  ['mythicstave', 3, 'grandstave', '*', 200, 'Mythic Staves', 'Mages can carry a Mythic Stave: attack 9.'],
  ['crypticwand', 2, null, '*', 100, 'Cryptic Wands', 'Mages can carry a Cryptic Wand: attack 3 (Wand 2), leaving a hand free for a shield.'],
  ['enigmaticwand', 3, 'crypticwand', '*', 200, 'Enigmatic Wands', 'Mages can carry an Enigmatic Wand: attack 5, with a shield.'],
  ['earthquake', 3, null, '*', 200, 'Earthquake', 'A Mage standing in an enemy province your army occupies can cast an Earthquake: after 2 minutes every building in that province is destroyed, and every wall on its borders.'],
  // Pyromancy (Swamplings only)
  ['school-pyro', 1, null, null, 40, 'School of Pyromancy', 'Commit to Pyromancy: fiery weapons, scouting pyres, fire traps, sacred pyres and paths of fire.'],
  ['fiery1', 1, 'school-pyro', 'pyro', 40, 'Fiery Weapons I', 'Autocast: when an army with a Warlock starts a battle, every blow has a 5% chance to strike twice as hard. 5-minute cooldown per army.'],
  ['fiery2', 2, 'fiery1', 'pyro', 100, 'Fiery Weapons II', 'Fiery Weapons: a 10% chance of a double blow; cooldown 3 minutes.'],
  ['fiery3', 3, 'fiery2', 'pyro', 200, 'Fiery Weapons III', 'Fiery Weapons: a 15% chance of a double blow; cooldown 90 seconds.'],
  ['scoutpyre', 1, 'school-pyro', 'pyro', 40, 'Scouting Pyre', 'A Warlock lights a pyre where he stands (50 wood). For 2 minutes it sees every neighboring province in its line of sight. It is not a building. 1-minute cooldown per Warlock.'],
  ['firetrap', 1, 'school-pyro', 'pyro', 40, 'Fire Trap', 'A Warlock buries a fire trap in his province. The next enemy army to enter any part of that province is engulfed in flame: enough to kill 3 Footmen. One trap per Warlock.'],
  ['blazetrap', 2, 'firetrap', 'pyro', 100, 'Blazing Trap', 'Fire traps burn hotter: enough to kill 6 Footmen.'],
  ['molttrap', 3, 'blazetrap', 'pyro', 200, 'Molten Trap', 'Fire traps become molten: enough to kill 9 Footmen.'],
  ['sacredpyre', 1, 'school-pyro', 'pyro', 60, 'Sacred Pyre', 'A Warlock can raise a Sacred Pyre on a free building plot where he stands (200 wood, 1 minute). It burns 10 wood every 10 s for 20 gold. It can be built up into a Grand Pyre (600 wood, 1 minute) that burns 20 wood for 50 gold. One per living Warlock.'],
  ['pathfire', 1, 'school-pyro', 'pyro', 40, 'Path of Fire', 'A Warlock fires up his army: 100% faster for 10 seconds. 1-minute cooldown per Warlock.'],
  ['pathflame', 2, 'pathfire', 'pyro', 100, 'Path of Flame', 'Path of Fire: 125% faster for 15 seconds.'],
  ['pathinferno', 3, 'pathflame', 'pyro', 200, 'Path of Inferno', 'Path of Fire: 150% faster for 20 seconds.'],
  // Elemental (Woodlings only, v93)
  ['school-elemental', 1, null, null, 40, 'School of the Elements', 'Commit to Elemental magic: rock armor, whispering rocks, forest spirits, town portals and a grand elemental of living water.'],
  ['rockarmor', 1, 'school-elemental', 'elemental', 40, 'Rock Armor', 'Autocast: when an army with a Druid starts a battle, plates of stone gather round it: a shield worth 10% of the army’s total health soaks up the damage before any soldier is hurt. 3-minute cooldown per army.'],
  ['wrocks', 1, 'school-elemental', 'elemental', 40, 'Whispering Rocks', 'A Druid raises whispering stones on a mountain border of the province he stands in (20 seconds of casting). From then on you can see both provinces on either side of that border, for good. Up to 3 per Druid.'],
  ['townportal', 2, 'school-elemental', 'elemental', 100, 'Town Portal', 'After 5 seconds of casting, a Druid and the army he is in are carried to your capital. 5-minute cooldown per Druid.'],
  ['forestspirit', 2, 'school-elemental', 'elemental', 100, 'Forest Spirit', 'A Druid calls a spirit into a border of trees beside the province he stands in (20 seconds of casting). Both provinces along that border make 25% more gold, wood and food. One spirit per living Druid: if a Druid falls, a spirit fades.'],
  ['gelemental', 3, 'school-elemental', 'elemental', 200, 'Grand Elemental', 'A Druid summons a towering man of living water for 2 minutes (10 seconds of casting): he hits as hard as a fully upgraded Champion and has twice its health, but no armor. He joins the Druid’s army (or forms one), fights, and can capture provinces. 5-minute cooldown per Druid.'],
  ['abandon', 3, null, '*', 300, 'Abandon Magic School', 'Costs 1000 gold to begin. When finished, your school and all of its spells are forgotten, and you can choose a new school.']
];
for (const [id, tier, req, school, cost, name, blurb] of MAG_TECHS) TECHS.push({ id, tree: 'mag', tier, cost, req, school, name, blurb, gold: id === 'abandon' ? 1000 : 0 });
// which race a technology belongs to: Swamplings have no roads, granaries, storehouses, swords, shields, Realmling armor or Herbomancy;
// Pyromancy, axes, their armor and the Thug technologies are theirs alone (everything else is shared)
for (const x of TECHS) {
  if (x.race) continue;
  if (['roads', 'roads2', 'roads3', 'granary', 'storehouse', 'w-bastard', 'w-longsword', 'w-greatsword'].includes(x.id) || /^s-|^a-(leather|chain|plate)/.test(x.id) || x.school === 'life' || x.id === 'school-life') x.race = 'realm';
  if (/^a-(stag|wyvern|dragon)/.test(x.id) || ['w-bearded', 'w-battleaxe', 'w-waraxe'].includes(x.id) || x.school === 'pyro' || x.id === 'school-pyro') x.race = 'swamp';   // (v90: the axes were missing here, so other races could research them)
  // Woodlings (v90): their swords and armor are theirs alone; they share Granaries, Storehouses and Herbomancy with the Realmlings;
  // no Necromancy; no cavalry technologies until their Champions arrive (a later update)
  if (/^a-(spirit|mithril|ornate)/.test(x.id) || ['w-gladius', 'w-rapier', 'w-estoc'].includes(x.id) || x.school === 'elemental' || x.id === 'school-elemental') x.race = 'wood';
  else if (['granary', 'storehouse'].includes(x.id) || x.school === 'life' || x.id === 'school-life') x.race = ['realm', 'wood'];
  else if (x.school === 'death' || x.id === 'school-death' || x.id === 'horde') x.race = x.race || ['realm', 'swamp'];
  // v93: the Hall of Champions and the Champion techs (Weaponsmithing, Ornate Weaponsmithing) are the Woodlings' Stable and horse research
  else if (['stable', 'horse-breeding', 'horse-training'].includes(x.id)) x.race = x.race || ['realm', 'swamp', 'wood'];
}
TECHS.find(x => x.id === 'traderoutes').reqSw = 'market';   // Highwaymen (the Swamplings' Trade Routes) needs no roads
// ---------- repeatable technologies ----------
// offered only once a tree has fewer than 5 ordinary technologies left; each can be researched again and again,
// costing 30% more every time. Their levels live in S.rep (id -> times researched).
S.rep = {};
const REP_STEP = 1.3, REP_LEFT = 5;
const REP_TECHS = [
  ['rep-forts', 'gov', 100, 'Garrison Charters', 'Raises the Fort limit by 1. Its cost never rises, and once offered it stays on offer.', null],
  ['rep-storage', 'gov', 100, 'Deeper Cellars', 'Raises gold, wood and food storage by 500 each.', null],
  ['rep-trade', 'gov', 100, 'Merchant Guilds', 'Trade Routes give 5% more gold.', 'traderoutes'],
  ['rep-lumber', 'gov', 100, 'Sawyer Guilds', 'Lumber Mills give 5% more wood.', null],
  ['rep-masons', 'gov', 100, 'Masons’ Lodge', 'Raises the Mason limit by 1.', null],
  ['rep-wayfinders', 'gov', 100, 'Wayfinders’ Guild', 'Raises the Wayfinder limit by 1.', null],
  ['rep-sword', 'mil', 120, 'Blade Mastery', 'Sword soldiers deal 5% more damage.', null],
  ['rep-blunt', 'mil', 120, 'Crushing Blows', 'Blunt weapons deal 5% more damage.', null],
  ['rep-pole', 'mil', 120, 'Pike Drill', 'Polearms (spears, pikes, polearms, halberds) deal 5% more damage.', null],
  ['rep-armor', 'mil', 120, 'Tempered Armor', 'Body armor blocks 5% more damage.', null],
  ['rep-shield', 'mil', 120, 'Reinforced Shields', 'Shields block 5% more damage.', null, null, 'realm'],
  ['rep-horsespeed', 'mil', 120, 'Swift Steeds', 'Cavalry horses run 5% faster.', null],
  ['rep-cavhp', 'mil', 120, 'Hardy Riders', 'Cavalry have 5% more health.', null],
  ['rep-magecap', 'mag', 120, 'Mage Academy', 'Raises the Mage limit by 1.', null, '*'],
  ['rep-stave', 'mag', 120, 'Stave Attunement', 'Staves deal 5% more damage.', null, '*'],
  ['rep-wand', 'mag', 120, 'Wand Attunement', 'Wands deal 5% more damage.', null, '*'],
  ['rep-harvest', 'mag', 120, 'Fertile Fields', 'Harvest (at every rank) gives another 2% food from your Farms.', 'harvest', 'life', 'realm'],
  ['rep-graverob', 'mag', 120, 'Deeper Graves', 'Grave Robbing (at every rank) yields 2% more gold.', 'graverob', 'death'],
  ['rep-trading', 'mag', 120, 'Planar Brokers', 'Interdimensional Trading (at every rank) yields 2% more of each resource.', 'trading', 'arcane']
];
const repLv = id => S.rep[id] || 0;
for (const [id, tree, cost, base, blurb, req, school, race] of REP_TECHS) TECHS.push({
  id, tree, tier: 1, cost, req, school, rep: true, baseName: base, baseBlurb: blurb, race,
  get name() { const T = TECH_BY_ID[id]; return `${(T && T.wdName && raceOf(ME) === 'wood') ? T.wdName : (T && T.swName && isSw(ME)) ? T.swName : base} ${repLv(id) + 1}`; },
  get blurb() { const T = TECH_BY_ID[id]; return `Repeatable. ${(T && T.wdBlurb && raceOf(ME) === 'wood') ? T.wdBlurb : (T && T.swBlurb && isSw(ME)) ? T.swBlurb : blurb}${repLv(id) ? ` Researched ${repLv(id)} time${repLv(id) > 1 ? 's' : ''} so far.` : ''}`; }
});
const currentSchool = () => { const d = S.tech.mag.done.find(id => id.startsWith('school-')); return d ? d.slice(7) : null; };
const TECH_BY_ID = Object.fromEntries(TECHS.map(x => [x.id, x]));
const hasTech = id => { const x = TECH_BY_ID[id]; return !!x && S.tech[x.tree].done.includes(id); };
const treeSize = tree => TECHS.filter(x => x.tree === tree && !x.rep && techFor(x, raceOf(ME))).length;
// a requirement may sit in another tree (Horse Breeding needs the Stable from Government): pass the nation's other trees as `all`
const reqOf = (x, race) => x.reqSw && (race === 'swamp' || race === 'wood') ? x.reqSw : x.req;   // (Community, the Woodlings' Trade Routes, needs no roads either)
const reqMet = (x, st, all, race) => !reqOf(x, race || raceOf(ME)) || (Array.isArray(reqOf(x, race || raceOf(ME))) ? reqOf(x, race || raceOf(ME)) : [reqOf(x, race || raceOf(ME))]).every(r => st.done.includes(r) || (all ? Object.values(all).some(t => t.done.includes(r)) : hasTech(r)));
// Battle Forge is only offered once two Tier I Military technologies are done (GPC13)
const forgeReady = (x, st) => x.id !== 'battleforge' || st.done.filter(id => { const y = TECH_BY_ID[id]; return y && y.tier === 1 && !y.rep && y.tree === 'mil'; }).length >= 2;
// the ordinary (non-repeatable) technologies a tree still has to research; Magic only counts its own school
function techsLeft(tree) {
  const st = S.tech[tree], sc = tree === 'mag' ? currentSchool() : null;
  return TECHS.filter(x => x.tree === tree && !x.rep && techFor(x, raceOf(ME)) && !st.done.includes(x.id) && x.id !== 'abandon' && !(tree === 'mag' && (x.id.startsWith('school-') ? !!sc : sc && x.school !== '*' && x.school !== sc))).length;
}
const repOpen = tree => techsLeft(tree) < REP_LEFT;
// how many choices each tree offers: Retained Knowledge adds one, Retained Knowledge II another
const techOptions = () => TECH_OPTIONS + (hasTech('retained') ? 1 : 0) + (hasTech('retained2') ? 1 : 0);
// Forge and Mage Tower: once offered, they stay on offer until researched
const STICKY_TECHS = new Set(['forge', 'magetower', 'rep-forts']);   // Garrison Charters too: once offered, always on offer
S.tech = Object.fromEntries(TREE_KEYS.map(k => [k, { cur: null, prog: 0, bank: 0, opts: [], done: [], tier: 0 }]));

const levelsOf = type => { const out = []; for (const [p, list] of S.extras) if (owned(p)) for (const e of list) if (e.type === type) out.push(e.level || 1); return out; };
// research gets dearer as the realm grows: +5% per province from the 11th to the 20th, then +15% more for each one past 20
const myProvCount = () => [...S.buildings.values()].filter(b => b.owner === ME).length;
const techCostMult = (n = myProvCount()) => 1 + 0.05 * Math.min(10, Math.max(0, n - 10)) + 0.15 * Math.max(0, n - 20);
const GOV_COST_MULT = 2;   // Government technologies cost double
const MIL_COST_MULT = 2;   // so do Military technologies (GPC13)
const treeCostMult = tree => tree === 'gov' ? GOV_COST_MULT : tree === 'mil' ? MIL_COST_MULT : 1;
// Garrison Charters never gets dearer (FLAT_REPS), so anyone can keep expanding late in the game
const FLAT_REPS = new Set(['rep-forts']);
const techCost = x => Math.round(x.cost * (x.rep && !FLAT_REPS.has(x.id) ? Math.pow(REP_STEP, repLv(x.id)) : 1) * treeCostMult(x.tree) * techCostMult());
function techTier(tree) {
  if (tree === 'gov') { const forts = [...S.buildings.values()].filter(b => b.owner === ME && b.stage === 1).length; return 1 + (forts >= 1) + (forts >= 2); }
  const lv = levelsOf(tree === 'mil' ? 'forge' : 'magetower'); return lv.length ? Math.max(...lv) : 0;
}
// research points one of your provinces makes every payout, by tree
// Government: forts +2, the capital +3, temples +2 (outposts give none); Military: Forge levels; Magic: Mage Tower levels; plus set pieces
function provResearch(p) {
  const r = { gov: 0, mil: 0, mag: 0 }, b = S.buildings.get(p);
  if (!b || b.owner !== ME) return r;
  if (!S.occ.has(p)) { if (b.stage >= 1) r.gov += b.stage + 1; r.gov += extrasIn(p).filter(e => e.type === 'temple').length * 2; }
  for (const e of extrasIn(p)) { if (e.type === 'forge') r.mil += LEVEL_POINTS[e.level || 1]; else if (e.type === 'magetower') r.mag += LEVEL_POINTS[e.level || 1]; }
  if (!S.occ.has(p)) { const sp = setpieceAt(p); if (sp && setpieceOn(sp)) r[SETPIECES[sp].tree] += SETPIECES[sp].pts; }
  return r;
}
function techRate(tree) { let n = 0; for (const [p, b] of S.buildings) if (b.owner === ME) n += provResearch(p)[tree]; return n; }
function techBonus() { const y = { gold: 0, wood: 0, food: 0 }; for (const k of TREE_KEYS) for (const id of S.tech[k].done) { const g = TECH_BY_ID[id].gives || {}; for (const r in g) y[r] += g[r]; } return y; }
// offer up to three unresearched technologies the tree's tier allows, always including one from the newest tier if any are left
const UPGRADE_TECHS = new Set(['battleforge', 'warforge', 'sanctum', 'arcanum']);
function availTechs(tree) {
  const st = S.tech[tree], T = techTier(tree), rep = repOpen(tree);
  let avail = TECHS.filter(x => x.tree === tree && x.tier <= T && techFor(x, raceOf(ME)) && !st.done.includes(x.id) && x.id !== st.cur && reqMet(x, st) && forgeReady(x, st) && (!x.rep || rep));
  if (tree === 'mag') { const sc = currentSchool(); avail = sc ? avail.filter(x => !x.id.startsWith('school-') && (x.school === '*' || x.school === sc)) : avail.filter(x => x.id.startsWith('school-')); }
  return avail;
}
// GPC06: every tree keeps the full number of choices (Retained Knowledge counts for Government, Military and Magic alike),
// also while something is being researched
function topUpOptions(tree) {
  const st = S.tech[tree]; if (!st.tier) return;
  const N = techOptions(), have = new Set(st.opts);
  const sticky = st.sticky || [], more = availTechs(tree).filter(x => !have.has(x.id)).map(x => ({ x, k: Math.random() + (sticky.includes(x.id) ? 2 : 0) })).sort((a, b) => b.k - a.k).map(o => o.x);
  let added = false;
  while (st.opts.length < N && more.length) { st.opts.push(more.shift().id); added = true; }
  if (added) { st.opts.sort((a, b) => { const x = TECH_BY_ID[a], y = TECH_BY_ID[b]; return (x.rep ? 1 : 0) - (y.rep ? 1 : 0) || x.tier - y.tier || a.localeCompare(b); }); techKey = ''; }
}
function drawOptions(tree) {
  const st = S.tech[tree], T = techTier(tree), N = techOptions();
  const avail = availTechs(tree);
  // weighted shuffle: owning a Barracks makes the Forge 50% more likely to come up
  const weight = x => x.id === 'forge' && [...S.extras].some(([p, l]) => owned(p) && l.some(e => e.type === 'barracks')) ? 1.5 : 1;
  const shuffled = avail.map(x => ({ x, k: Math.pow(Math.random(), 1 / weight(x)) })).sort((a, b) => b.k - a.k).map(o => o.x), top = shuffled.filter(x => x.tier === T && !x.rep), opts = [];
  st.sticky = st.sticky || [];
  for (const x of shuffled) if (st.sticky.includes(x.id) && opts.length < N) opts.push(x);   // Forge and Mage Tower stay on offer once seen
  for (const x of shuffled) if (UPGRADE_TECHS.has(x.id) && opts.length < N && !opts.includes(x)) opts.push(x);   // the next building upgrade is always offered
  if (top.length && !opts.includes(top[0]) && opts.length < N) opts.push(top[0]);
  for (const x of shuffled) if (opts.length < N && !opts.includes(x)) opts.push(x);
  for (const x of opts) if (STICKY_TECHS.has(x.id) && !st.sticky.includes(x.id)) st.sticky.push(x.id);
  st.opts = opts.sort((a, b) => (a.rep ? 1 : 0) - (b.rep ? 1 : 0) || a.tier - b.tier || a.id.localeCompare(b.id)).map(x => x.id);
  techKey = '';
}
function pickTech(id) {
  const x = TECH_BY_ID[id]; if (!x) return;
  const st = S.tech[x.tree];
  if (!st.opts.includes(id)) return toast('That technology isn’t on offer right now.', true);
  if (x.gold && S.stock.gold < x.gold) return toast(`${x.name} needs ${x.gold} gold to begin.`, true);
  if (st.cur) { st.bank += st.prog; const old = TECH_BY_ID[st.cur]; if (old.gold) { S.stock.gold += old.gold; toast(`${old.name} set aside: ${old.gold} gold refunded.`); } }   // switching keeps the points earned so far
  if (x.gold) S.stock.gold -= x.gold;
  const prev = st.cur;
  st.cur = id; st.prog = st.bank; st.bank = 0; st.opts = st.opts.filter(o => o !== id); techShow[x.tree] = false;
  if (prev && prev !== id && !st.opts.includes(prev)) st.opts.push(prev);   // a switched-away technology stays on offer
  topUpOptions(x.tree);
  techKey = ''; techBtnKey = '';
  if (st.prog >= techCost(x)) finishTech(x.tree);
}
function finishTech(tree) {
  const st = S.tech[tree], x = TECH_BY_ID[st.cur];
  const cost = techCost(x), shown = x.rep ? x.name : null;
  if (x.rep) S.rep[x.id] = repLv(x.id) + 1; else st.done.push(x.id);
  st.bank = Math.min(st.prog - cost, bankCap(tree)); st.prog = 0; st.cur = null;
  if (x.rep) { sfx(tree === 'mag' ? 'pr_research_magic' : 'pr_research'); drawOptions(tree); computeIncome(); onRepDone(x); toast(`${TECH_TREES[tree].name} research complete: ${shown}. ${x.baseBlurb}`); provKey = ''; cmdKey = ''; barKey = ''; return; }
  if (!x.id.startsWith('school-')) sfx(tree === 'mag' ? 'pr_research_magic' : 'pr_research');
  if (x.id === 'retained' || x.id === 'retained2') for (const t2 of TREE_KEYS) if (t2 !== tree && S.tech[t2].tier) { if (S.tech[t2].cur) topUpOptions(t2); else drawOptions(t2); }
  if (x.id === 'abandon') { abandonSchool(); return; }
  if (x.id.startsWith('school-')) { drawOptions(tree); computeIncome(); toast(`You follow the ${x.name}. Its spells can now be researched, and your Mages can cast them.`); closeSchoolPopup(); return; }
  drawOptions(tree); computeIncome();
  toast(`${TECH_TREES[tree].name} research complete: ${x.name}. ${x.gives ? '(' + Object.entries(x.gives).map(([k, v]) => '+' + v + ' ' + k).join(', ') + ' every 10 s)' : x.blurb}`);
  provKey = ''; cmdKey = ''; barKey = '';
}
// called every payout
// idle trees save up at most 15 seconds (three payouts) of points
const BANK_SECONDS = 30;
const bankCap = tree => techRate(tree) * BANK_SECONDS / TICK;
function techPayday() {
  for (const tree of TREE_KEYS) {
    const st = S.tech[tree], T = techTier(tree);
    if (T !== st.tier) {
      if (T > st.tier) toast(st.tier === 0 ? `${TECH_TREES[tree].name} research unlocked! Open Research (T) to pick a technology.` : `${TECH_TREES[tree].name} Tier ${ROMAN[T]} technologies are now available.`);
      if (tree === 'mag' && st.tier === 0 && T > 0 && !currentSchool()) setTimeout(openSchoolPopup, 50);
      st.tier = T; if (!st.cur || !st.opts.length) drawOptions(tree);
    }
    if (!T) continue;
    const pts = techRate(tree);
    if (st.cur) { st.prog += pts; if (st.prog >= techCost(TECH_BY_ID[st.cur])) finishTech(tree); }
    else st.bank = Math.max(st.bank, Math.min(st.bank + pts, bankCap(tree)));   // a windfall (Intact Ruins) above the limit is kept
    if (!st.cur && !st.opts.length) drawOptions(tree);
    topUpOptions(tree);
  }
  techKey = ''; techBtnKey = '';
}

// ---------- research button (in the resource bar) and panel ----------
let techOpen = false, techKey = '', techBtnKey = '';
function toggleTech(open = !techOpen) { if (open && !techOpen) sfx('ui_panel'); techOpen = open; $q('#techPanel').hidden = !open; techKey = ''; }
const fmtPts = n => Math.floor(n);
function renderTechBtn() {
  const btn = $q('#techBtn'); if (!btn) return;
  const k = TREE_KEYS.map(t => { const st = S.tech[t]; return st.tier + ':' + (st.cur || '') + ':' + Math.floor(st.prog) + ':' + st.opts.length + ':' + techRate(t); }).join('|');
  if (k === techBtnKey) return; techBtnKey = k;
  btn.classList.toggle('idle', TREE_KEYS.some(t => S.tech[t].tier && !S.tech[t].cur));
  btn.innerHTML = 'Research' + TREE_KEYS.map(t => {
    const st = S.tech[t], T = TECH_TREES[t], x = st.cur && TECH_BY_ID[st.cur], f = x ? Math.min(1, st.prog / techCost(x)) : 0;
    const idle = st.tier && !st.cur;
    return `<i class="tb-pip${st.tier ? '' : ' locked'}${idle ? ' idle' : ''}" style="--c:${T.color};--f:${Math.round(f * 360)}deg" title="${T.name}: ${!st.tier ? 'locked' : x ? x.name + ' ' + fmtPts(st.prog) + '/' + techCost(x) : 'choose a technology'}"></i>`;
  }).join('') + `<span class="tb-rates" title="Research points every 10 s">${TREE_KEYS.map(t => `<span class="rp${S.tech[t].tier ? '' : ' off'}" title="${TECH_TREES[t].name}: +${techRate(t)} points every 10 s${S.tech[t].tier ? '' : ' (locked)'}"><img alt="${TECH_TREES[t].name}" src="${rpIcon(t, !S.tech[t].tier)}">${techRate(t)}</span>`).join('')}</span>`;
}
function renderTech() {
  renderTechBtn();
  if (!techOpen) return;
  const key = TREE_KEYS.map(t => { const st = S.tech[t]; return [st.tier, st.cur, Math.floor(st.prog), Math.floor(st.bank), st.opts.join(','), st.done.length, techRate(t)].join(':'); }).join('|') + '|' + myProvCount() + '|' + JSON.stringify(S.rep);
  if (key === techKey) return; techKey = key;
  $q('#techPanel').innerHTML = `<div class="tp-head"><b>Research</b><span>Points arrive every payout (10 s). An idle tree saves at most 30 s of points. Magic follows the school you choose.${techCostMult() > 1 ? ` <b class="tp-mult">Your ${myProvCount()} provinces make every technology cost ×${techCostMult().toFixed(2)}.</b>` : ''}</span><button type="button" class="tp-x" data-tp="close" aria-label="Close research">×</button></div><div class="tp-cols">` + TREE_KEYS.map(tree => {
    const T = TECH_TREES[tree], st = S.tech[tree], rate = techRate(tree), x = st.cur && TECH_BY_ID[st.cur];
    const tiers = [1, 2, 3].map(n => `<i class="${n <= st.tier ? 'on' : ''}" title="Tier ${ROMAN[n]}: ${T.tiers[n - 1]}">${ROMAN[n]}</i>`).join('');
    const head = `<div class="tp-tree" style="--c:${T.color};--l:${T.light}"><div class="tp-th"><b>${T.name}</b><span class="tp-tiers">${tiers}</span></div><div class="tp-rate"><span><img class="tp-rpi" alt="" src="${rpIcon(tree, !st.tier)}">${st.tier ? `+${rate} points per payout` : 'Locked'}</span><small>${T.rate}${tree === 'gov' ? '; Forgotten Libraries +1' : tree === 'mil' ? '; Ancient Battle Sites +1' : '; Closed Rifts +1'}</small></div>`;
    if (!st.tier) return head + `<div class="tp-lock">🔒 ${T.locked}</div></div>`;
    const eta = p => rate ? Math.ceil(Math.max(0, p) / rate) * 5 : null;
    const cur = x ? `<div class="tp-cur tp-click" data-tp="opts:${tree}" role="button" tabindex="0" title="${techShow[tree] ? 'Hide the other options' : 'Show the other options'}"><div class="tp-cn"><img class="tp-ico" alt="" src="${techIcon(x.id)}"><b>${x.name}</b><em>Tier ${ROMAN[x.tier]}</em></div><div class="tp-bar"><s style="width:${Math.min(100, st.prog / techCost(x) * 100)}%"></s></div><div class="tp-cs">${fmtPts(st.prog)} / ${techCost(x)} points${eta(techCost(x) - st.prog) !== null ? ` · about ${eta(techCost(x) - st.prog)} s` : ''}</div></div>`
      : `<div class="tp-cur none">Nothing being researched${st.bank ? ` · ${fmtPts(st.bank)} points saved up (max ${fmtPts(bankCap(tree))})` : ''}. Pick one:</div>`;
    const opts = st.opts.map(id => { const o = TECH_BY_ID[id]; return `<button type="button" class="tp-opt${o.rep ? ' rep' : ''}" data-tech="${id}"><img class="tp-ico" alt="" src="${techIcon(id)}"><span><b>${o.name}</b><small>${o.blurb}</small></span><em>${o.rep ? '↻' : 'T' + ROMAN[o.tier]}<br>${techCost(o)}</em></button>`; }).join('');
    const nextTier = st.tier < 3 ? `<div class="tp-next">Tier ${ROMAN[st.tier + 1]}: ${tree === 'gov' ? T.tiers[st.tier].toLowerCase() : 'upgrade to a ' + T.tiers[st.tier]}</div>` : '';
    const reps = TECHS.filter(r => r.tree === tree && r.rep && repLv(r.id)), nDone = st.done.length + reps.length;
    const done = nDone ? `<div class="tp-done"><button type="button" class="tp-tog" data-tp="done:${tree}" aria-expanded="${!!techDoneOpen[tree]}">${techDoneOpen[tree] ? '▴' : '▾'} Researched (${st.done.length}/${treeSize(tree)}${reps.length ? ' + ' + reps.reduce((n, r) => n + repLv(r.id), 0) + ' repeats' : ''})</button>${!techDoneOpen[tree] ? '' : st.done.map(id => `<i title="${TECH_BY_ID[id].blurb}"><img alt="" src="${techIcon(id)}">${TECH_BY_ID[id].name.replace('Dummy ', '').replace('Building: ', '')}</i>`).join('') + reps.map(r => `<i title="${r.baseBlurb}"><img alt="" src="${techIcon(r.id)}">${r.baseName} ×${repLv(r.id)}</i>`).join('')}</div>` : '';
    const showOpts = !x || techShow[tree];
    return head + cur + done + (x && st.opts.length ? `<button type="button" class="tp-tog" data-tp="opts:${tree}" aria-expanded="${showOpts}">${showOpts ? '▴ Hide options' : '▾ Switch research (' + st.opts.length + ' options)'}</button>` : '') + (st.opts.length ? (showOpts ? `<div class="tp-sec">${x ? 'Switch to' : 'Options'}</div>` + opts : '') : st.done.length === treeSize(tree) ? '<div class="tp-cur none">Every technology researched.</div>' : '') + nextTier + '</div>';
  }).join('') + '</div>';
}
// a tree's options fold away once a technology is chosen; click the current research to see them again
const techShow = {}, techDoneOpen = {};
const techEl = $q('#techPanel');
techEl.addEventListener('pointerdown', e => e.stopPropagation());
techEl.addEventListener('wheel', e => e.stopPropagation());
techEl.addEventListener('click', e => {
  const b = e.target.closest('[data-tech]'); if (b) { pickTech(b.dataset.tech); return; }
  if (e.target.closest('[data-tp="close"]')) { toggleTech(false); return; }
  const tg = e.target.closest('[data-tp^="opts:"], [data-tp^="done:"]');
  if (tg) { const [k, tree] = tg.dataset.tp.split(':'); if (k === 'opts') techShow[tree] = !techShow[tree]; else techDoneOpen[tree] = !techDoneOpen[tree]; techKey = ''; }
});
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#techBtn')) { toggleTech(); e.target.closest('#techBtn').blur(); } });
window.addEventListener('keydown', e => { if (!S.started || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return; if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) toggleTech(); else if (e.key === 'Escape' && techOpen) toggleTech(false); });
// open the first options as soon as the game starts
drawOptions('gov'); S.tech.gov.tier = 1;
