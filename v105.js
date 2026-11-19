// ================= v105: Diplomacy (opinion, diplomatic actions, Proxy Wars) and racial Leaders =================
// - Leaders: 8 per race, picked on the New Game screen (the computer nations get a random one of their race; saves from
//   before v105 get random leaders too). Each has a start, a bonus, a portrait and opinion likes/dislikes.
// - Opinion: every computer nation has an opinion of every other nation (the player's nation has none). It decides
//   alliances (+50), Trade Networks and Organized Crime Agreements (+25), and military access (positive).
// - Diplomatic actions: Flirt, Growl, Gift, Bribe, military access, Alliance, Trade Network, Organized Crime, Spy, war.
// - Proxy Wars: a nation that joins a war to defend its ally can't win, can't be occupied, and has an exhaustion meter
//   instead of a warscore. At 100 exhaustion it makes a white peace and leaves.
// - Requests from computer nations pop up (minimize to a flag; 30 s to answer, then declined). Wars starting and ending
//   between nations you know show as dismissable flags. The computer nations' military power is hidden (Spy reveals it).
// The computer nations don't yet USE any of this on their own (the AI pass comes later): the rules and hooks are here.

// ---------- the leaders ----------
// like: what raises (+50) or lowers (−25) the leader's opinion of another nation
//   school: has adopted the leader's school (+50) / another school (−25)
//   cav: more cavalry (Ogres, Champions) than infantry (+50) / none (−25)      nocav: no cavalry (+50) / more cavalry than infantry (−25)
//   forges: a Forge for every 3 provinces, rounded down (+50) / no Forge (−25)
//   lumber3 / farms3: a province with 3 Lumber Mills / Farms (+50) / no province with more than 1 (−25)
//   scouts: 3+ fully upgraded scouts (+50) / only the starting one (−25)
const LEADERS = {
  // Realmlings: 4 women, 4 men
  havva:   { race: 'realm', sex: 'f', title: 'Herbomancer', name: 'Havva', school: 'life', start: 'mage', like: 'school', emb: 'leaf',
    bonus: 'Locked to Herbomancy. Harvest gives 5% more food per level (15% / 30% / 45%). Hardened Skin and its upgrades are 20% more effective.' },
  alma:    { race: 'realm', sex: 'f', title: 'Arcanist', name: 'Alma', school: 'arcane', start: 'mage', like: 'school', emb: 'star',
    bonus: 'Locked to Arcane. Interdimensional Trading gives 30% more.' },
  niall:   { race: 'realm', sex: 'm', title: 'Necromancer', name: 'Niall', school: 'death', start: 'mage', like: 'school', emb: 'skull',
    bonus: 'Locked to Necromancy. Grave Robbing gives 100 more gold.' },
  hisola:  { race: 'realm', sex: 'f', title: 'Horsemistress', name: 'Hisola', start: 'stable', like: 'cav', emb: 'horseshoe',
    bonus: 'Cavalry have 10% more health.' },
  cormac:  { race: 'realm', sex: 'm', title: 'Commander', name: 'Cormac', start: 'shield', like: 'nocav', emb: 'shield',
    bonus: 'Infantry have 10% more health.' },
  finn:    { race: 'realm', sex: 'm', title: 'Forgemaster', name: 'Finn', start: 'forge', like: 'forges', emb: 'hammer',
    bonus: 'Forges cost 25% less.' },
  weylyn:  { race: 'realm', sex: 'm', title: 'Woodsman', name: 'Weylyn', start: 'lumber', like: 'lumber3', emb: 'axe',
    bonus: 'Lumber Mills give 1 more wood.' },
  aithne:  { race: 'realm', sex: 'f', title: 'Assassin', name: 'Aithne', start: 'scouts', like: 'scouts', emb: 'dagger',
    bonus: 'Sneaking Wayfinders move 100% faster. Crossbowmen deal +1 damage.' },
  // Swamplings: all men (they can't flirt)
  phlyo:   { race: 'swamp', sex: 'm', title: 'Pyromancer', name: 'Phlyo', school: 'pyro', start: 'mage', like: 'school', emb: 'flame',
    bonus: 'Locked to Pyromancy. Raising a Sacred Pyre costs no wood.' },
  aarg:    { race: 'swamp', sex: 'm', title: 'Arcanist', name: 'Aarg', school: 'arcane', start: 'mage', like: 'school', emb: 'star',
    bonus: 'Locked to Arcane. A Stasis Trap deals 100 pure damage to the army it catches.' },
  nihaarg: { race: 'swamp', sex: 'm', title: 'Necromancer', name: 'Nihaarg', school: 'death', start: 'mage', like: 'school', emb: 'skull',
    bonus: 'Locked to Necromancy. Cursed Weapons deal 10% more damage.' },
  taal:    { race: 'swamp', sex: 'm', title: 'Ogre Chief', name: 'Taal', start: 'ogres', like: 'cav', emb: 'club',
    bonus: 'Ogres deal 10% more damage.' },
  marl:    { race: 'swamp', sex: 'm', title: 'Ragemaster', name: 'Marl', start: 'twin', like: 'nocav', emb: 'fist',
    bonus: 'Berserkers have 10% more chance of a critical blow.' },
  glurg:   { race: 'swamp', sex: 'm', title: 'Weaponsmaster', name: 'Glurg', start: 'forge', like: 'forges', emb: 'hammer',
    bonus: 'Forges cost 25% less.' },
  roxx:    { race: 'swamp', sex: 'm', title: 'Axewielder', name: 'Roxx', start: 'lumber', like: 'lumber3', emb: 'axe',
    bonus: 'Lumber Mills give 1 more wood.' },
  zaarg:   { race: 'swamp', sex: 'm', title: 'Navigator', name: 'Zaarg', start: 'navigator', like: 'scouts', emb: 'compass',
    bonus: 'Slingers deal +3 damage.' },
  // Woodlings: 4 women, 4 men
  sariel:  { race: 'wood', sex: 'f', title: 'Herbomancer', name: 'Sariel', school: 'life', start: 'mage', like: 'school', emb: 'leaf',
    bonus: 'Locked to Herbomancy. Mending (and its upgrades) gives the army 10% more health for 30 seconds afterwards.' },
  eliwen:  { race: 'wood', sex: 'f', title: 'Arcanist', name: 'Eliwen', school: 'arcane', start: 'mage', like: 'school', emb: 'star',
    bonus: 'Locked to Arcane. When a Stasis Trap lets go, the army is Weak for 10 seconds: 25% less damage.' },
  naobrien: { race: 'wood', sex: 'f', title: 'Elementalist', name: 'Naobrien', school: 'elemental', start: 'mage', like: 'school', emb: 'drop',
    bonus: 'Locked to Elemental magic. Grand Elementals deal 30% more damage.' },
  cerathon: { race: 'wood', sex: 'm', title: 'Champion', name: 'Cerathon', start: 'champion', like: 'cav', emb: 'sword',
    bonus: 'Champions move 20% faster.' },
  paladomis: { race: 'wood', sex: 'm', title: 'Protector', name: 'Paladomis', start: 'twohand', like: 'nocav', emb: 'spear',
    bonus: 'Protectors fighting two-handed have a 20% chance per blow to cause bleeding: the blow’s damage again over the next 4 rounds (it stops when the battle ends).' },
  alathandrious: { race: 'wood', sex: 'm', title: 'Artisan', name: 'Alathandrious', start: 'forge', like: 'forges', emb: 'hammer',
    bonus: 'Forges cost 25% less.' },
  ultanitous: { race: 'wood', sex: 'm', title: 'Orchardist', name: 'Ultanitous', start: 'farms', like: 'farms3', emb: 'apple',
    bonus: 'Farms: Staple crops +1 food, Cash crops +1 gold, Fiber crops +1 wood.' },
  zariel:  { race: 'wood', sex: 'f', title: 'Ranger', name: 'Zariel', start: 'ranger', like: 'scouts', emb: 'bow',
    bonus: 'Archers deal +2 damage.' }
};
for (const [id, L] of Object.entries(LEADERS)) {
  L.id = id; L.full = L.title + ' ' + L.name;
  // the magic leaders: +1 Magic research from every tower (any level), +4 mana regeneration, +200 of each resource at the start
  if (L.start === 'mage') L.bonus += ` Every ${L.race === 'swamp' ? 'Warlock Tower' : L.race === 'wood' ? 'Grove' : 'Mage Tower'} (at any level) gives 1 more Magic research. +4 mana regeneration on top of the towers’.`;
}
const isMageLeader = o => { const L = leaderOf(o); return !!L && L.start === 'mage'; };
const leadersOf = race => Object.values(LEADERS).filter(L => L.race === race);
const leaderOf = o => { const id = o === ME ? NATION.leader : NATIONS[o] && NATIONS[o].leader; return (id && LEADERS[id]) || null; };
const leads = (o, id) => { const L = leaderOf(o); return !!L && L.id === id; };
const raceWord = { realm: 'Realmling', swamp: 'Swampling', wood: 'Woodling' };
const cavWord = r => r === 'swamp' ? 'Ogres' : r === 'wood' ? 'Champions' : 'cavalry';
const scoutsWord = r => r === 'swamp' ? 'Swampstriders' : r === 'wood' ? 'Scouts' : 'Wayfinders';
const rangedWord = r => r === 'swamp' ? 'Slingers' : r === 'wood' ? 'Archers' : 'Crossbowmen';
const towerWord = r => r === 'swamp' ? 'Warlock Tower' : r === 'wood' ? 'Grove' : 'Mage Tower';
const mageWord = r => r === 'swamp' ? 'Warlock' : r === 'wood' ? 'Druid' : 'Mage';
const SCHOOL_WORD = { life: 'Herbomancy', death: 'Necromancy', arcane: 'Arcane', pyro: 'Pyromancy', elemental: 'Elemental' };
function leaderStartText(L) {
  const r = L.race;
  switch (L.start) {
    case 'mage': return `Starts with a ${towerWord(r)}, a ${mageWord(r)} and 200 more gold, wood and food, but no soldiers (and the ${towerWord(r)} technology not researched).`;
    case 'stable': return 'Starts with a Stable (technology researched) and 2 Riders as its only soldiers.';
    case 'shield': return 'Starts with a Barracks and 6 Footmen carrying Round Shields (researched).';
    case 'forge': return 'Starts with a Forge (technology researched).';
    case 'lumber': return 'Mountain or ruin borders of the capital turn into tree borders (up to 2), and it starts with 2 Lumber Mills.';
    case 'scouts': return `Starts with 2 ${scoutsWord(r)} and Far-Seeing Wayfinders researched (and the Automating Wayfinders and Wayfinder Stealth it needs).`;
    case 'ogres': return 'Starts with 2 Ogres as its only soldiers, and the Ogre Cave researched.';
    case 'twin': return 'Starts with a Barracks and 6 Berserkers wielding two axes (Dual Wielding researched).';
    case 'navigator': return 'Starts with 3 Swampstriders, and 3 Slingers as its only soldiers.';
    case 'champion': return 'Starts with a Champion as its only soldier, and the Hall of Champions researched.';
    case 'twohand': return 'Starts with a Barracks and 6 Protectors fighting two-handed (Two-Handed Grip researched).';
    case 'farms': return 'Starts with 2 Farms in the capital.';
    case 'ranger': return 'Starts with 2 Scouts, and 6 Archers as its only soldiers.';
  }
  return '';
}
// the leader's likes and dislikes, in words
function leaderLikeText(L) {
  const r = L.race, out = [];
  switch (L.like) {
    case 'school': out.push(['+50', `has adopted ${SCHOOL_WORD[L.school]}`], ['−25', 'has adopted another school of magic']); break;
    case 'cav': out.push(['+50', `more ${cavWord(r)} than infantry in its armies (${rangedWord(r)} aren’t infantry)`], ['−25', `no ${cavWord(r)} in its armies`]); break;
    case 'nocav': out.push(['+50', `no ${cavWord(r)} at all`], ['−25', `more ${cavWord(r)} than infantry`]); break;
    case 'forges': out.push(['+50', 'a Forge for every 3 provinces (rounded down)'], ['−25', 'no Forge at all']); break;
    case 'lumber3': out.push(['+50', 'a province with 3 Lumber Mills'], ['−25', 'no province with more than 1 Lumber Mill']); break;
    case 'farms3': out.push(['+50', 'a province with 3 Farms'], ['−25', 'no province with more than 1 Farm']); break;
    case 'scouts': out.push(['+50', '3 or more fully upgraded explorers (Wayfinders, Swampstriders or Scouts with Automating, Far-Seeing and Scout Sight researched)'], ['−25', 'only 1 explorer (or none)']); break;
  }
  return out;
}

// ---------- portraits: the painted ones (portraits/*.jpg, PORTRAIT_DATA) or a drawn bust ----------
const INK = '#1d1a22';
const PORTRAIT_LOOK = {
  // Realmlings: fair skin
  havva:   { bg: '#3f8a46', skin: '#f2cdb0', hair: '#7a4a2a', hs: 'long', hat: 'flowers', top: '#2f6b36', glow: '#5cff7a' },
  alma:    { bg: '#2f56b0', skin: '#f6d8c2', hair: '#e8e8f0', hs: 'long', hat: 'wizard', top: '#3a2f8a', glow: '#4ab8ff' },
  niall:   { bg: '#4a2f6a', skin: '#ecdcd4', hair: '#bdb6c4', hs: 'bald', hat: 'none', top: '#2a2235', glow: '#ff3a2a', snarl: true },
  hisola:  { bg: '#3a5aa8', skin: '#f4d4bc', hair: '#5a3418', hs: 'bob', hat: 'none', top: '#b8c0cc', plate: true, braid: true },
  cormac:  { bg: '#9a2f2f', skin: '#efc6a6', hair: '#5a3a22', hs: 'none', hat: 'greathelm', top: '#8a96a8' },
  finn:    { bg: '#c46a26', skin: '#f0c4a2', hair: '#a8442a', hs: 'short', hat: 'goggles', beard: 'full', beardC: '#a8442a', top: '#6b4a2e' },
  weylyn:  { bg: '#5a6b2e', skin: '#efc6a6', hair: '#7a4a2a', hs: 'short', hat: 'beanie', beard: 'full', beardC: '#8a4f2a', top: '#a8352e', plaid: true },
  aithne:  { bg: '#2a4a52', skin: '#f6dcc8', hair: '#2a2a2a', hs: 'none', hat: 'hood', mask: true, top: '#22222a', iris: '#2f9a7a' },
  // Swamplings
  phlyo:   { bg: '#c4471f', skin: '#93b55c', hair: '#3a2a1a', hs: 'mohawk', hat: 'none', top: '#5a2a1a', tusks: true, glow: '#ff9a1a' },
  aarg:    { bg: '#3a4fa8', skin: '#8fb06a', hair: '#2a2a2a', hs: 'bald', hat: 'wizard', top: '#2a2f6a', tusks: true, glow: '#4ab8ff' },
  nihaarg: { bg: '#3a2a4a', skin: '#7f9a6a', hair: '#2a2a2a', hs: 'bald', hat: 'none', top: '#22222a', tusks: true, glow: '#ff3a2a', snarl: true },
  taal:    { bg: '#7a5a3a', skin: '#a3b866', hair: '#3a2a1a', hs: 'bald', hat: 'none', top: '#6b4a2e', ogre: true },
  marl:    { bg: '#8a2a2a', skin: '#93b55c', hair: '#c4471f', hs: 'mohawk', hat: 'none', top: '#4a3a2a', paint: true, scream: true },
  glurg:   { bg: '#6b6b6b', skin: '#8fb06a', hair: '#2a2a2a', hs: 'bald', hat: 'goggleseyes', top: '#5a4030', tusks: true, beard: 'braid', beardC: '#3a3a3a' },
  roxx:    { bg: '#4a5a2a', skin: '#93b55c', hair: '#5a3a22', hs: 'short', hat: 'bandana', top: '#6b4a2e', tusks: true },
  zaarg:   { bg: '#2a6a7a', skin: '#93b55c', hair: '#2a2a2a', hs: 'short', hat: 'tricorn', top: '#3a4a6a', tusks: true },
  // Woodlings: olive to violet skin, pointed jaws, big eyes, stoic faces
  sariel:  { bg: '#4a8a3a', skin: '#a5a45e', hair: '#d8b46a', hs: 'long', hat: 'circlet', top: '#3f7a3a', glow: '#5cff7a' },
  eliwen:  { bg: '#2a2a6a', skin: '#8468b0', hair: '#3a2a5a', hs: 'long', hat: 'circlet', top: '#4a3a8a', gem: '#7ad0ff', glow: '#4ab8ff' },
  naobrien: { bg: '#2a5a7a', skin: '#8f74b8', hair: '#9ad0e8', hs: 'long', hat: 'circlet', top: '#2a5a7a', gem: '#e8eef6', glow: '#e4ecf6' },
  zariel:  { bg: '#3a5a2a', skin: '#a39a86', hair: '#a8452a', hs: 'none', hat: 'deephood', top: '#4a6a2a' },
  cerathon: { bg: '#8a6a2a', skin: '#a68f9c', hair: '#eef0f4', hs: 'long', hat: 'antlerhelm', top: '#6f4a9a', champ: true },
  paladomis: { bg: '#5a6a7a', skin: '#a487ad', hair: '#3a2a1a', hs: 'short', hat: 'none', top: '#7a8a9a', beard: 'goatee', beardC: '#3a2a1a', poncho: true },
  alathandrious: { bg: '#7a4a6a', skin: '#9a80b8', hair: '#cfcfcf', hs: 'long', hat: 'none', top: '#6a3a5a', beard: 'long', beardC: '#e6e6ea' },
  ultanitous: { bg: '#8a9a3a', skin: '#9fa070', hair: '#6a4a2a', hs: 'short', hat: 'straw', top: '#5a7a2a', beard: 'short', beardC: '#5a3a1a' }
};
// emblem art, drawn in a 26 px circle centered on (0, 0)
const EMBLEM_ART = {
  leaf: '<path d="M-7 7 C-8 -4 0 -9 8 -8 C8 1 3 8 -7 7 Z" fill="#5ab04a"/><path d="M-6 6 L5 -5" fill="none" stroke-width="1.6"/>',
  star: '<path d="M0 -9 L2.6 -2.8 L9 -2.6 L4 1.6 L5.8 8 L0 4.4 L-5.8 8 L-4 1.6 L-9 -2.6 L-2.6 -2.8 Z" fill="#3a6fd8"/>',
  skull: '<path d="M-7 1 C-7 -6 -4 -9 0 -9 C4 -9 7 -6 7 1 C7 3 5 4 4 4 L4 8 L-4 8 L-4 4 C-5 4 -7 3 -7 1 Z" fill="#f4efe4"/><circle cx="-3" cy="-1" r="2" fill="' + INK + '" stroke="none"/><circle cx="3" cy="-1" r="2" fill="' + INK + '" stroke="none"/>',
  horseshoe: '<path d="M-6 8 L-6 -1 C-6 -6 -3 -8 0 -8 C3 -8 6 -6 6 -1 L6 8" fill="none" stroke="#8a7a6a" stroke-width="5"/><path d="M-6 8 L-6 -1 C-6 -6 -3 -8 0 -8 C3 -8 6 -6 6 -1 L6 8" fill="none" stroke="' + INK + '" stroke-width="1.4"/>',
  shield: '<path d="M-7 -8 H7 V0 C7 5 3 8 0 9 C-3 8 -7 5 -7 0 Z" fill="#c43a2e"/><path d="M0 -8 V9" stroke="#f4c44f" stroke-width="2.4"/>',
  hammer: '<rect x="-8" y="-8" width="16" height="6" rx="1.5" fill="#8a96a8"/><path d="M0 -2 V9" stroke="#8a5a34" stroke-width="3.4"/>',
  axe: '<path d="M-2 9 L4 -8" stroke="#8a5a34" stroke-width="3"/><path d="M2 -7 C-6 -8 -8 -1 -5 3 L1 -2 Z" fill="#cfd6e0"/>',
  dagger: '<path d="M0 -9 L3 2 L-3 2 Z" fill="#dfe6ee"/><path d="M-5 2 H5" stroke-width="2.4"/><path d="M0 3 V9" stroke="#8a5a34" stroke-width="3"/>',
  flame: '<path d="M0 9 C-7 8 -8 1 -4 -3 C-4 1 -2 2 -1 1 C-2 -4 1 -8 3 -9 C2 -4 8 -1 7 4 C6 8 3 9 0 9 Z" fill="#ff8a2a"/><path d="M0 8 C-2 7 -3 4 -1 2 C0 4 2 4 2 6 Z" fill="#ffe27a" stroke="none"/>',
  club: '<path d="M-6 8 L3 -2" stroke="#8a5a34" stroke-width="3.4"/><ellipse cx="4" cy="-4" rx="5" ry="5.5" fill="#a8763e"/>',
  fist: '<path d="M-7 -4 C-7 -8 7 -8 7 -4 L7 4 C7 8 -7 8 -7 4 Z" fill="#93b55c"/><path d="M-3.5 -7 V-1 M0 -7 V-1 M3.5 -7 V-1" fill="none" stroke-width="1.4"/>',
  compass: '<circle r="8" fill="#f4efe4"/><path d="M0 -7 L2.4 0 L0 7 L-2.4 0 Z" fill="#c43a2e"/><circle r="1.4" fill="' + INK + '"/>',
  drop: '<path d="M0 -9 C4 -3 7 1 7 4 C7 7 4 9 0 9 C-4 9 -7 7 -7 4 C-7 1 -4 -3 0 -9 Z" fill="#4aa8ff"/>',
  sword: '<path d="M0 -9 L2.5 4 L-2.5 4 Z" fill="#dfe6ee"/><path d="M-6 4 H6" stroke-width="2.6"/><path d="M0 5 V9" stroke="#c4a14a" stroke-width="3"/>',
  spear: '<path d="M-6 9 L4 -1" stroke="#8a5a34" stroke-width="2.6"/><path d="M8 -8 L1 -5 L5 -1 Z" fill="#dfe6ee"/>',
  apple: '<circle cx="0" cy="2" r="7" fill="#d8402e"/><path d="M0 -5 C0 -7 1 -8 2 -9" fill="none" stroke-width="1.6"/><path d="M1 -6 C4 -9 7 -7 6 -5 C4 -5 2 -5 1 -6 Z" fill="#5ab04a" stroke-width="1.2"/>',
  bow: '<path d="M-3 -9 C7 -5 7 5 -3 9" fill="none" stroke="#8a5a34" stroke-width="2.8"/><path d="M-3 -9 V9" stroke="#efe6cf" stroke-width="1"/><path d="M-7 0 H6 M4 -2 L7 0 L4 2" fill="none" stroke-width="1.6"/>'
};
function portraitSVG(id) {
  const L = LEADERS[id], P = PORTRAIT_LOOK[id] || {}, race = L.race, wood = race === 'wood';
  const sk = P.skin, hair = P.hair, top = P.top, S = `stroke="${INK}"`;
  const parts = [`<defs><filter id="gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter><clipPath id="fc"><path d="${wood ? 'M35 84 C34 64 46 58 60 58 C74 58 86 64 85 84 C84 98 72 112 60 120 C48 112 36 98 35 84 Z' : 'M35 88 A25 27 0 1 0 85 88 A25 27 0 1 0 35 88 Z'}"/></clipPath></defs>`];
  parts.push(`<rect width="120" height="180" fill="${P.bg}"/><circle cx="60" cy="74" r="58" fill="#ffffff" opacity="0.13"/><circle cx="60" cy="74" r="40" fill="#ffffff" opacity="0.08"/>`);
  // ---- the Ogre Chief: a big fat head on a fat body ----
  if (P.ogre) {
    parts.push(`<path d="M-4 182 C-6 132 18 108 60 106 C102 108 126 132 124 182 Z" fill="${sk}" ${S} stroke-width="3.5"/>`);
    parts.push(`<path d="M30 182 C26 150 40 134 60 134 C80 134 94 150 90 182" fill="${top}" ${S} stroke-width="3"/><path d="M6 130 C20 116 38 112 46 118 L40 136 C30 132 18 134 8 142 Z M114 130 C100 116 82 112 74 118 L80 136 C90 132 102 134 112 142 Z" fill="#8a6a44" ${S} stroke-width="2.6"/>`);
    parts.push(`<path d="M40 154 C46 162 74 162 80 154" fill="none" stroke="${INK}" stroke-width="2" opacity="0.5"/>`);
    parts.push(`<circle cx="22" cy="80" r="7" fill="${sk}" ${S} stroke-width="3"/><circle cx="98" cy="80" r="7" fill="${sk}" ${S} stroke-width="3"/>`);
    parts.push(`<path d="M24 82 C22 52 40 40 60 40 C80 40 98 52 96 82 C98 104 86 122 60 124 C34 122 22 104 24 82 Z" fill="${sk}" ${S} stroke-width="3.5"/>`);
    parts.push(`<path d="M30 104 C34 116 46 122 60 122 C74 122 86 116 90 104" fill="none" stroke="#7f9448" stroke-width="5" opacity="0.6"/>`);
    parts.push(`<path d="M38 70 C46 64 56 66 58 72 M62 72 C64 66 74 64 82 70" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`);
    parts.push(`<circle cx="50" cy="77" r="2.8" fill="${INK}"/><circle cx="70" cy="77" r="2.8" fill="${INK}"/>`);
    parts.push(`<path d="M52 90 C52 82 68 82 68 90 C68 94 52 94 52 90 Z" fill="#8fa458" ${S} stroke-width="2.4"/><circle cx="56" cy="90" r="1.4" fill="${INK}"/><circle cx="64" cy="90" r="1.4" fill="${INK}"/>`);
    parts.push(`<path d="M40 104 C48 98 72 98 80 104 C72 110 48 110 40 104 Z" fill="#5a2a1a" ${S} stroke-width="2.6"/>`);
    parts.push(`<path d="M44 106 L46 92 L51 104 Z M76 106 L74 92 L69 104 Z" fill="#f4efe4" ${S} stroke-width="1.8" stroke-linejoin="round"/>`);
    parts.push(`<path d="M54 44 L52 36 M60 42 L60 34 M66 44 L68 36" stroke="${hair}" stroke-width="2.4" stroke-linecap="round"/>`);
    parts.push(`<g transform="translate(100 160)" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><circle r="14" fill="#faf1dc" stroke-width="2.6"/>${EMBLEM_ART[L.emb] || ''}</g>`);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 180" width="120" height="180">${parts.join('')}</svg>`;
  }
  // long hair behind the head
  if (P.hs === 'long') parts.push(`<path d="M30 92 C26 60 40 52 60 52 C80 52 94 60 90 92 L94 140 L26 140 Z" fill="${hair}" ${S} stroke-width="3.5"/>`);
  if (P.hs === 'braids') parts.push(`<path d="M34 90 L30 138 M86 90 L90 138" stroke="${hair}" stroke-width="9"/><path d="M34 90 L30 138 M86 90 L90 138" stroke="${INK}" stroke-width="1.6" stroke-dasharray="3 4"/>`);
  if (P.hat === 'deephood') parts.push(`<path d="M18 140 C12 80 30 40 60 34 C90 40 108 80 102 140 Z" fill="${top}" ${S} stroke-width="3.5"/>`);
  // shoulders, neck and what's worn on them: drawn 10 px higher for a short neck
  const b0 = parts.length;
  parts.push(`<path d="M8 182 C8 146 26 128 60 128 C94 128 112 146 112 182 Z" fill="${top}" ${S} stroke-width="3.5"/>`);
  if (P.plaid) parts.push(`<path d="M20 150 H100 M16 166 H104 M40 132 V182 M80 132 V182" stroke="#5a1a1a" stroke-width="3" opacity="0.6"/>`);
  if (P.hat === 'helm') parts.push(`<path d="M22 150 C30 138 44 134 60 134 C76 134 90 138 98 150" fill="none" stroke="#c4a14a" stroke-width="5"/>`);
  if (P.plate) parts.push(`<path d="M8 160 C14 140 24 132 38 132 L42 150 C30 150 18 154 8 160 Z M112 160 C106 140 96 132 82 132 L78 150 C90 150 102 154 112 160 Z" fill="#d6dce4" ${S} stroke-width="2.6"/><path d="M42 136 C50 132 70 132 78 136 L80 182 L40 182 Z" fill="#e4e8ee" ${S} stroke-width="2.6"/><path d="M60 140 V182 M46 156 H74" stroke="#8a94a4" stroke-width="2"/><path d="M54 162 L60 154 L66 162 L60 168 Z" fill="#f4c44f" ${S} stroke-width="1.6"/>`);
  if (P.champ) parts.push(`<path d="M8 160 C12 138 26 128 42 130 L44 150 C30 150 18 154 8 160 Z M112 160 C108 138 94 128 78 130 L76 150 C90 150 102 154 112 160 Z" fill="#d7c2f2" ${S} stroke-width="2.6"/><path d="M44 134 H76 L74 182 H46 Z" fill="#6f4a9a" ${S} stroke-width="2.6"/><path d="M48 134 V182 M72 134 V182" stroke="#f4e3a1" stroke-width="2.4"/>`);
  if (P.poncho) {
    // a striped poncho over the left shoulder, its other side flipped back behind the right one
    parts.push(`<path d="M82 132 C96 128 108 136 110 150 L98 150 C96 142 90 138 80 140 Z" fill="#5e4426" ${S} stroke-width="2.6"/>`);
    parts.push(`<path d="M8 182 C8 152 20 134 44 128 L66 130 C72 146 84 164 92 182 Z" fill="#8a6a3a" ${S} stroke-width="3"/>`);
    parts.push(`<path d="M14 160 C30 148 48 144 70 150 M10 172 C30 160 52 158 80 166" fill="none" stroke="#e9d8b0" stroke-width="3"/><path d="M12 166 C30 154 50 152 76 158" fill="none" stroke="#a8352e" stroke-width="2.4"/>`);
    parts.push(`<path d="M44 128 C50 136 60 138 68 132" fill="none" stroke="${INK}" stroke-width="2"/>`);
  }
  parts.push(`<rect x="51" y="106" width="18" height="26" fill="${sk}" ${S} stroke-width="3"/>`);
  if (P.braid) {
    // a thick braid: alternating lobes down a curve from behind her head over her right shoulder
    const pt = t => { const u = 1 - t, x = u * u * u * 84 + 3 * u * u * t * 102 + 3 * u * t * t * 90 + t * t * t * 70, y = u * u * u * 96 + 3 * u * u * t * 112 + 3 * u * t * t * 136 + t * t * t * 158; return [x, y]; };
    let lobes = '';
    for (let i = 0, n = 12; i < n; i++) {
      const t = (i + 0.5) / n, [x, y] = pt(t), [x2, y2] = pt(Math.min(1, t + 0.02)), ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI, side = i % 2 ? 1 : -1, w = 9.4 - i * 0.32;
      lobes += `<ellipse cx="0" cy="0" rx="${w}" ry="${w * 0.62}" fill="${hair}" ${S} stroke-width="2" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(ang + 90 + side * 35).toFixed(0)}) translate(0 ${side * 2.2})"/>`;
    }
    const [ex, ey] = pt(1);
    parts.push(lobes + `<rect x="${ex - 4}" y="${ey - 1}" width="8" height="5" rx="1" fill="#c43a2e" ${S} stroke-width="1.6"/><path d="M${ex - 3} ${ey + 4} L${ex - 4} ${ey + 11} M${ex} ${ey + 4} L${ex} ${ey + 12} M${ex + 3} ${ey + 4} L${ex + 4} ${ey + 11}" stroke="${hair}" stroke-width="2.6" stroke-linecap="round"/>`);
  }
  { const body = parts.splice(b0).join('').replace(/\b182\b/g, '196'); parts.push(`<g transform="translate(0 -10)">${body}</g>`); }
  // ears
  if (race === 'swamp') parts.push(`<path d="M35 86 L15 72 L37 98 Z M85 86 L105 72 L83 98 Z" fill="${sk}" ${S} stroke-width="3" stroke-linejoin="round"/>`);
  else if (wood) { if (P.hat !== 'deephood' && P.hat !== 'antlerhelm') parts.push(`<path d="M37 84 L19 66 L38 100 Z M83 84 L101 66 L82 100 Z" fill="${sk}" ${S} stroke-width="3" stroke-linejoin="round"/>`); }
  else parts.push(`<circle cx="35" cy="90" r="6" fill="${sk}" ${S} stroke-width="3"/><circle cx="85" cy="90" r="6" fill="${sk}" ${S} stroke-width="3"/>`);
  // head
  parts.push(wood ? `<path d="M35 84 C34 64 46 58 60 58 C74 58 86 64 85 84 C84 98 72 112 60 120 C48 112 36 98 35 84 Z" fill="${sk}" ${S} stroke-width="3.5" stroke-linejoin="round"/>` : `<ellipse cx="60" cy="88" rx="25" ry="27" fill="${sk}" ${S} stroke-width="3.5"/>`);
  if (P.paint) parts.push(`<path d="M42 82 L56 92 M78 82 L64 92" stroke="#c43a2e" stroke-width="4" opacity="0.8"/>`);
  if (wood) {
    // big almond eyes (glowing for some), level brows, a straight mouth: stoic
    const eyeAt = x => {
      const iris = P.glow || '#2a1d16';
      return (P.glow ? `<circle cx="${x}" cy="87" r="7" fill="${P.glow}" opacity="0.85" filter="url(#gl)"/>` : '') +
        `<path d="M${x - 8} 87 Q${x} 79 ${x + 8} 87 Q${x} 93 ${x - 8} 87 Z" fill="${P.glow ? '#ffffff' : '#fbf7ee'}" ${S} stroke-width="2"/>` +
        `<circle cx="${x}" cy="86.6" r="3.6" fill="${iris}" stroke="${P.glow ? 'none' : INK}" stroke-width="1"/>` + (P.glow ? `<circle cx="${x}" cy="86.6" r="1.6" fill="#ffffff"/>` : `<circle cx="${x + 1.2}" cy="85.4" r="1.1" fill="#ffffff"/>`) +
        `<path d="M${x - 8.5} 86 Q${x} 78 ${x + 8.5} 86" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    };
    if (P.hat !== 'antlerhelm') {
      parts.push(eyeAt(49) + eyeAt(71));
      parts.push(`<path d="M41 77 L56 78 M64 78 L79 77" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`);
      parts.push(`<path d="M59 90 L58 98 L61 98" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`);
      if (!P.beard || P.beard === 'goatee' || P.beard === 'short') parts.push(`<path d="M54 106 H66" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`);
    }
  } else {
    const sw = race === 'swamp', eyes = P.hat === 'greathelm' ? '' : [50, 70].map(x => {
      const halo = P.glow ? `<circle cx="${x}" cy="88" r="${sw ? 7.5 : 6.5}" fill="${P.glow}" opacity="0.85" filter="url(#gl)"/>` : '';
      if (sw) return halo + `<ellipse cx="${x}" cy="88" rx="4.6" ry="5" fill="${P.glow || INK}" stroke="${P.glow ? INK : 'none'}" stroke-width="1.2"/>` + (P.glow ? `<circle cx="${x}" cy="88" r="1.6" fill="#fffbe8"/>` : `<circle cx="${x + 1.4}" cy="86.4" r="1.2" fill="#ffffff"/>`);
      // Realmlings: whites around the iris
      // a big iris tucked up under the upper lid (clipped to the eye), so they look calm, not startled
      return halo + `<clipPath id="ey${x}"><ellipse cx="${x}" cy="88" rx="5" ry="4.2"/></clipPath><ellipse cx="${x}" cy="88" rx="5" ry="4.2" fill="#ffffff"/>` +
        `<g clip-path="url(#ey${x})"><circle cx="${x}" cy="86.8" r="3.7" fill="${P.glow || P.iris || '#4a3020'}"/><circle cx="${x}" cy="86.8" r="1.7" fill="${P.glow ? '#ffffff' : '#1d1a22'}"/>${P.glow ? '' : `<circle cx="${x + 1.3}" cy="85.6" r="0.9" fill="#ffffff"/>`}</g>` +
        `<ellipse cx="${x}" cy="88" rx="5" ry="4.2" fill="none" ${S} stroke-width="1.6"/><path d="M${x - 5.4} 87.4 Q${x} 82.6 ${x + 5.4} 87.4" fill="none" ${S} stroke-width="2.4" stroke-linecap="round"/>`;
    }).join('');
    if (P.mask) parts.push(`<path d="M36 94 C46 98 74 98 84 94 L86 112 C76 122 44 122 34 112 Z" fill="#1d1a22"/><rect x="49" y="104" width="22" height="30" fill="#1d1a22" ${S} stroke-width="3"/><path d="M34 84 C34 62 46 56 60 56 C74 56 86 62 86 84 C76 79 44 79 34 84 Z" fill="#1d1a22"/>`);
    parts.push(eyes);
    const angry = sw || P.paint || P.snarl || P.scream;
    if (P.hat !== 'greathelm') parts.push(P.scream ? `<path d="M41 76 L57 85 M79 76 L63 85" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>` : angry ? `<path d="M43 79 L56 83 M77 79 L64 83" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` : `<path d="M44 80 Q50 77 56 80 M64 80 Q70 77 76 80" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`);
    if (!P.mask && P.hat !== 'greathelm') {
      if (!P.scream) parts.push(sw ? `<path d="M55 96 Q60 101 65 96" fill="none" stroke="${INK}" stroke-width="2.6"/>` : `<path d="M58 92 Q60 96 62 92" fill="none" stroke="${INK}" stroke-width="2"/>`);
      if (P.scream) parts.push(`<path d="M54 93 Q60 96 66 93" fill="none" stroke="${INK}" stroke-width="2.4"/><path d="M45 99 C47 95 73 95 75 99 C76 112 68 122 60 122 C52 122 44 112 45 99 Z" fill="#4a1414" ${S} stroke-width="2.8"/><path d="M51 116 C54 112 66 112 69 116 C66 120 54 120 51 116 Z" fill="#c4474a"/><path d="M47 99 L51 104 L55 99 M65 99 L69 104 L73 99" fill="#f4efe4" ${S} stroke-width="1.4" stroke-linejoin="round"/><path d="M48 118 L50 108 L54 117 Z M72 118 L70 108 L66 117 Z" fill="#f4efe4" ${S} stroke-width="1.6" stroke-linejoin="round"/>`);
      else if (P.snarl) parts.push(`<path d="M48 104 Q54 98 60 101 Q66 98 72 104 Q66 108 60 106 Q54 108 48 104 Z" fill="#3a1414" ${S} stroke-width="2.4" stroke-linejoin="round"/><path d="M50 103 L52 106 L54 102 M66 102 L68 106 L70 103" fill="#f4efe4" stroke="${INK}" stroke-width="1"/><path d="M45 100 L48 104 M75 100 L72 104" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`);
      else if (!P.beard || P.beard === 'stubble') parts.push(`<path d="M52 103 Q60 ${sw ? 104 : 108} 68 103" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`);
    }
  }
  if (P.tusks) parts.push(`<path d="M50 104 L52 96 L55 104 Z M70 104 L68 96 L65 104 Z" fill="#f4efe4" ${S} stroke-width="1.6" stroke-linejoin="round"/>`);
  // beards
  if (P.beard === 'full') parts.push(`<path d="M36 92 C38 112 46 126 60 128 C74 126 82 112 84 92 C78 104 70 106 60 106 C50 106 42 104 36 92 Z" fill="${P.beardC}" ${S} stroke-width="3"/><path d="M50 100 Q60 109 70 100 Q60 104 50 100 Z" fill="#fbf7ee" ${S} stroke-width="2" stroke-linejoin="round"/><path d="M49 99 Q50 101 51 100.6 M71 99 Q70 101 69 100.6" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`);   // a slight grin
  if (P.beard === 'braid') parts.push(`<path d="M54 106 L56 128 L64 128 L66 106 Z" fill="${P.beardC}" ${S} stroke-width="2.6"/><path d="M55 114 H65 M56 121 H64" stroke="#c4a14a" stroke-width="2.4"/>`);
  if (P.beard === 'stubble') parts.push(`<path d="M40 100 C46 112 74 112 80 100" fill="none" stroke="${P.beardC}" stroke-width="5" opacity="0.55"/>`);
  const mous = `<path d="M50 104 Q55 99 60 102 Q65 99 70 104 Q65 104.5 60 103.5 Q55 104.5 50 104 Z" fill="${P.beardC}" ${S} stroke-width="1.8"/>`;
  if (P.beard === 'goatee') parts.push(mous + `<path d="M55 109 L60 124 L65 109 Q60 111 55 109 Z" fill="${P.beardC}" ${S} stroke-width="2"/>`);
  if (P.beard === 'short') parts.push(`<path d="M38 94 C42 106 50 116 60 122 C70 116 78 106 82 94 C78 104 70 110 60 110 C50 110 42 104 38 94 Z" fill="${P.beardC}" ${S} stroke-width="2.4"/>` + mous);
  if (P.beard === 'long') parts.push(`<path d="M37 92 C40 112 50 124 52 150 L60 160 L68 150 C70 124 80 112 83 92 C78 104 70 108 60 108 C50 108 42 104 37 92 Z" fill="${P.beardC}" ${S} stroke-width="2.8"/><path d="M56 118 L58 146 M64 118 L62 146" stroke="#b8b8c4" stroke-width="1.6"/>` + mous + `<path d="M54 106 H66" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`);
  // hair on top
  if (P.hs === 'short' || P.hs === 'long' || P.hs === 'braids') parts.push(wood ? `<path d="M35 82 C33 64 46 57 60 57 C74 57 87 64 85 82 C80 70 68 67 60 67 C52 67 40 70 35 82 Z" fill="${hair}" ${S} stroke-width="3.2"/>` : `<path d="M35 84 C33 64 46 58 60 58 C74 58 87 64 85 84 C78 72 66 70 60 70 C52 70 42 72 35 84 Z" fill="${hair}" ${S} stroke-width="3.2"/>`);
  if (P.hs === 'bob') parts.push(`<path d="M33 102 C30 66 44 56 60 56 C76 56 90 66 87 102 L80 102 L80 80 C72 76 48 76 40 80 L40 102 Z" fill="${hair}" ${S} stroke-width="3.2" stroke-linejoin="round"/><path d="M40 80 C48 74 72 74 80 80" fill="none" stroke="${INK}" stroke-width="2"/>`);
  if (P.hs === 'mohawk') parts.push(`<path d="M52 66 L56 44 L60 62 L64 44 L68 66 Z" fill="${hair}" ${S} stroke-width="3" stroke-linejoin="round"/>`);
  // hats
  switch (P.hat) {
    case 'wizard': parts.push(`<path d="M28 72 C40 64 80 64 92 72 C80 78 40 78 28 72 Z" fill="#3a2f8a" ${S} stroke-width="3"/><path d="M40 70 L62 18 L80 70 Z" fill="#3a2f8a" ${S} stroke-width="3" stroke-linejoin="round"/><path d="M60 40 L62 45 L67 45 L63 48 L65 53 L60 50 L55 53 L57 48 L53 45 L58 45 Z" fill="#f4c44f" stroke="none"/>`); break;
    case 'hood': parts.push(`<path d="M26 120 C22 70 36 48 60 48 C84 48 98 70 94 120 L84 120 C88 84 78 66 60 66 C42 66 32 84 36 120 Z" fill="${top}" ${S} stroke-width="3.2"/>`); break;
    case 'deephood':
      // the face in the hood's shadow down to below the eyes
      parts.push(`<g clip-path="url(#fc)"><rect x="20" y="40" width="80" height="62" fill="#120e16" opacity="0.92"/><rect x="20" y="100" width="80" height="6" fill="#120e16" opacity="0.45"/></g>`);
      parts.push(`<path d="M18 140 C12 80 30 40 60 34 C90 40 108 80 102 140 L88 140 C92 104 86 74 60 70 C34 74 28 104 32 140 Z" fill="${top}" ${S} stroke-width="3.2" stroke-linejoin="round"/><path d="M60 34 C64 28 70 26 74 28" fill="none" ${S} stroke-width="3"/><path d="M34 120 C30 96 38 80 60 74 C82 80 90 96 86 120" fill="none" stroke="#2c4a1c" stroke-width="3" opacity="0.7"/>`);
      break;
    case 'antlerhelm': {
      // the Champions' antlered great helm
      const ant = side => { const m = side < 0 ? 1 : -1, x = v => 60 + m * (60 - v); return `M${x(40)} 62 C${x(32)} 46 ${x(30)} 34 ${x(22)} 20 M${x(34)} 48 C${x(26)} 44 ${x(20)} 46 ${x(14)} 40 M${x(29)} 34 C${x(34)} 26 ${x(34)} 20 ${x(32)} 12 M${x(26)} 28 C${x(18)} 28 ${x(14)} 26 ${x(10)} 20`; };
      const a = ant(-1) + ' ' + ant(1);
      parts.push(`<path d="${a}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="${a}" fill="none" stroke="#efe4c8" stroke-width="3.6" stroke-linecap="round"/>`);
      parts.push(`<path d="M33 92 C31 62 45 54 60 54 C75 54 89 62 87 92 C86 108 74 120 60 124 C46 120 34 108 33 92 Z" fill="#d7c2f2" ${S} stroke-width="3.5"/>`);
      parts.push(`<path d="M34 76 C44 70 76 70 86 76" fill="none" stroke="#f4e3a1" stroke-width="4"/><path d="M60 56 V74 M60 96 V122" stroke="#f4e3a1" stroke-width="3.4"/>`);
      parts.push(`<path d="M38 86 C46 82 74 82 82 86 L82 91 C74 88 46 88 38 91 Z" fill="${INK}"/>`);
      parts.push([[48, 100], [52, 106], [48, 112], [72, 100], [68, 106], [72, 112]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5" fill="${INK}"/>`).join(''));
      break; }
    case 'greathelm': parts.push(`<path d="M32 94 C30 62 44 54 60 54 C76 54 90 62 88 94 C88 108 80 116 60 118 C40 116 32 108 32 94 Z" fill="#a8b2c2" ${S} stroke-width="3.5"/><path d="M60 56 V116" stroke="#7c8696" stroke-width="2.4"/><path d="M36 84 H84 V90 H36 Z" fill="${INK}"/><path d="M34 82 H86" stroke="#c4a14a" stroke-width="2.6"/>` + [[48, 100], [52, 106], [48, 110], [72, 100], [68, 106], [72, 110]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${INK}"/>`).join('') + `<path d="M60 54 C62 40 74 34 84 38 C78 42 72 48 70 56" fill="#c43a2e" ${S} stroke-width="2.6"/>`); break;
    case 'goggleseyes': parts.push(`<path d="M34 88 H86" stroke="#5a3a22" stroke-width="5"/><circle cx="50" cy="88" r="8" fill="#ffb347" ${S} stroke-width="3"/><circle cx="70" cy="88" r="8" fill="#ffb347" ${S} stroke-width="3"/><path d="M46 84 L49 82 M66 84 L69 82" stroke="#fff6dc" stroke-width="2" stroke-linecap="round"/>`); break;
    case 'helm': parts.push(`<path d="M32 90 C30 62 44 54 60 54 C76 54 90 62 88 90 L80 90 L80 78 L40 78 L40 90 Z" fill="#9aa4b4" ${S} stroke-width="3.2"/><path d="M60 54 C62 44 72 40 78 44" fill="none" stroke="#c43a2e" stroke-width="6"/>`); break;
    case 'flowers': parts.push(`<path d="M34 74 C44 62 76 62 86 74" fill="none" stroke="#3f8a46" stroke-width="4"/>` + [[38, 70], [50, 63], [62, 61], [74, 64], [84, 71]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4.6" fill="${i % 2 ? '#ff9ab8' : '#ffd84a'}" ${S} stroke-width="2"/>`).join('')); break;
    case 'goggles': parts.push(`<path d="M34 72 H86" stroke="#5a3a22" stroke-width="5"/><circle cx="50" cy="70" r="7" fill="#ffb347" ${S} stroke-width="3"/><circle cx="70" cy="70" r="7" fill="#ffb347" ${S} stroke-width="3"/>`); break;
    case 'beanie': parts.push(`<path d="M34 80 C32 60 46 52 60 52 C74 52 88 60 86 80 Z" fill="#8a5a34" ${S} stroke-width="3"/><path d="M33 76 H87 V84 H33 Z" fill="#e8dcc0" ${S} stroke-width="2.6"/>`); break;
    case 'bandana': parts.push(`<path d="M34 78 C34 62 46 56 60 56 C74 56 86 62 86 78 Z" fill="#c43a2e" ${S} stroke-width="3"/><path d="M86 74 L98 70 L94 82 Z" fill="#c43a2e" ${S} stroke-width="2.4"/>`); break;
    case 'tricorn': parts.push(`<path d="M24 72 C40 52 80 52 96 72 C82 66 38 66 24 72 Z" fill="#2a2a3a" ${S} stroke-width="3"/><path d="M38 66 C44 50 76 50 82 66 Z" fill="#2a2a3a" ${S} stroke-width="3"/><path d="M28 70 C44 64 76 64 92 70" fill="none" stroke="#c4a14a" stroke-width="2"/>`); break;
    case 'circlet': parts.push(`<path d="M36 74 C46 68 74 68 84 74" fill="none" stroke="#e9e4f5" stroke-width="3.4"/><path d="M60 64 L64 70 L60 76 L56 70 Z" fill="${P.gem || '#5ab04a'}" ${S} stroke-width="1.8"/>`); break;
    case 'straw': parts.push(`<ellipse cx="60" cy="68" rx="40" ry="9" fill="#e8c46a" ${S} stroke-width="3"/><path d="M42 68 C42 50 78 50 78 68 Z" fill="#e8c46a" ${S} stroke-width="3"/><path d="M42 64 H78" stroke="#c43a2e" stroke-width="3"/>`); break;
  }
  // the emblem
  parts.push(`<g transform="translate(100 160)" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><circle r="14" fill="#faf1dc" stroke-width="2.6"/>${EMBLEM_ART[L.emb] || ''}</g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 180" width="120" height="180">${parts.join('')}</svg>`;
}
const portraitCache = {};
function portraitOf(id) {
  if (portraitCache[id]) return portraitCache[id];
  const L = LEADERS[id]; if (!L) return '';
  const painted = typeof PORTRAIT_DATA === 'object' && PORTRAIT_DATA[L.full];
  return portraitCache[id] = painted || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(portraitSVG(id));
}

// ---------- state (saved with the game: S.dipl, NATION.leader, NATIONS[o].leader) ----------
const DIPL = {
  flirt: { v: 25, dur: 600 }, gift: { v: 25, dur: 600, gold: 1000 }, growl: { v: 25, dur: 600 }, bribe: { gold: 2000 },
  ally: 50, trade: 25, crime: 25, offer: -50, spy: { gold: 200, dur: 180, fail: 0.1, cost: -50, lock: 600, provs: 0.3, power: 0.3, show: 3 },
  war: -200, race: -200, fort: -25, den: -25, difficult: -25, like: 50, dislike: -25, boss: 25, threat: -100, threatProvs: 100,
  reqTime: 30, crimeOut: 10, exhPer: 2, exhDeclare: 50, tradeBonus: 0.1
};
function diplState() {
  if (!S.dipl) S.dipl = {};
  const D = S.dipl;
  for (const [k, v] of [['decl', {}], ['boss', {}], ['mods', []], ['access', []], ['trade', []], ['crime', []], ['crimeEnd', []], ['spies', {}], ['spyLock', {}], ['intel', {}], ['lost', {}], ['reqs', []], ['news', []], ['woodlines', []]]) if (D[k] === undefined) D[k] = v;
  if (!D.seq) D.seq = 1;
  return D;
}
const pairHas = (list, a, b) => list.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));

// ---------- choosing leaders ----------
const dxShuffle = arr => arr.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
// a leader for a nation that has none (new computer nations, and every nation in a save from before v105).
// In an old save a leader locked to another school than the one the nation already follows is never picked.
function pickLeader(o, taken) {
  const race = raceOf(o), sc = o === ME ? currentSchool() : NATIONS[o] && NATIONS[o].school;
  const ok = leadersOf(race).filter(L => !L.school || !sc || L.school === sc);
  const fresh = ok.filter(L => !taken.has(L.id)), pool = fresh.length ? fresh : ok.length ? ok : leadersOf(race);
  return dxShuffle(pool)[0].id;
}
// the New Game choice, per race ('random' or a leader id)
const leaderPick = { realm: 'random', swamp: 'random', wood: 'random' };
try { const v = JSON.parse(localStorage.getItem('realm-leader') || 'null'); if (v) for (const r of ['realm', 'swamp', 'wood']) if (v[r] === 'random' || (LEADERS[v[r]] && LEADERS[v[r]].race === r)) leaderPick[r] = v[r]; } catch (e) {}
function assignLeaders(isNew) {
  const taken = new Set();
  if (isNew) { const want = leaderPick[raceOf(ME)]; NATION.leader = LEADERS[want] && LEADERS[want].race === raceOf(ME) ? want : pickLeader(ME, taken); }
  else if (!LEADERS[NATION.leader] || LEADERS[NATION.leader].race !== raceOf(ME)) NATION.leader = pickLeader(ME, taken);
  taken.add(NATION.leader);
  for (const N of Object.values(NATIONS)) if (LEADERS[N.leader]) taken.add(N.leader);
  for (const N of Object.values(NATIONS)) {
    if (LEADERS[N.leader] && LEADERS[N.leader].race === raceOf(N.id)) continue;
    N.leader = pickLeader(N.id, taken); taken.add(N.leader);
  }
  // a computer nation locked to a school wants that one
  for (const N of Object.values(NATIONS)) { const L = LEADERS[N.leader]; if (L && L.school && !N.school) N.wantSchool = L.school; }
}

// ---------- leader starts (new games only) ----------
const capOf = o => o === ME ? S.capital : NATIONS[o] ? NATIONS[o].capital : -1;
function addStartExtra(p, type) {
  const slot = freePlot(p); if (slot < 0) return null;
  const list = S.extras.get(p) || []; const e = { type, slot, born: -10 }; list.push(e); S.extras.set(p, list); return e;
}
function addStartTech(o, id) {
  const x = TECH_BY_ID[id]; if (!x) return;
  const st = o === ME ? S.tech[x.tree] : NATIONS[o].tech[x.tree];
  if (!st.done.includes(id)) st.done.push(id);
  st.opts = st.opts.filter(i => i !== id); if (st.cur === id) { st.cur = null; st.prog = 0; }
  if (st.sticky) st.sticky = st.sticky.filter(i => i !== id);
}
const startArmy = o => S.units.find(v => v.owner === o && v.kind === 'army' && v.prov === capOf(o));
function addStartTroops(o, kind, n) {
  let a = startArmy(o);
  if (!a) a = o === ME ? newArmy(capOf(o), {}) : aiNewArmy(NATIONS[o], capOf(o), {});
  a.troops[kind] = (a.troops[kind] || 0) + n;
}
function setStartArmy(o, troops) {
  S.units = S.units.filter(v => !(v.owner === o && v.kind === 'army' && v.prov === capOf(o)));
  if (!Object.keys(troops).length) return;
  if (o === ME) newArmy(capOf(o), { ...troops }); else aiNewArmy(NATIONS[o], capOf(o), { ...troops });
}
function addStartScouts(o, total) {
  const cap = capOf(o);
  let have = S.units.filter(v => v.owner === o && v.kind === WAYFINDER).length;
  while (have < total) { const u = mkUnit(S.nextId++, WAYFINDER, '', cap, 5 + have); u.owner = o; S.units.push(u); have++; }
}
// a design for a leader's starting soldiers: the player's go into the Armory, a computer nation's are registered only
function leaderDesign(o, d) {
  if (o === ME) { const old = S.designs.find(x => x.name === d.name && (x.race || 'realm') === (d.race || 'realm')); return (old || addDesign(d)).id; }
  const id = `ai${o}lead`; registerDesign({ id, shield: null, off: null, horse: null, ...d }); return id;
}
function applyLeaderStart(o) {
  const L = leaderOf(o), cap = capOf(o); if (!L || cap < 0) return;
  const race = L.race;
  switch (L.start) {
    case 'mage': { addStartExtra(cap, 'magetower'); setStartArmy(o, { [MAGE]: 1 }); const st = o === ME ? S.stock : NATIONS[o].stock; for (const k of RES) st[k] = (st[k] || 0) + 200; break; }
    case 'stable': addStartExtra(cap, 'stable'); addStartTech(o, 'stable'); setStartArmy(o, { 'd-rider': 2 }); break;
    case 'shield': addStartExtra(cap, 'barracks'); addStartTech(o, 's-round'); setStartArmy(o, { [leaderDesign(o, { name: 'Shield Footman', type: 'inf', weapon: 'shortsword', shield: 'round', armor: 'leather1', race: 'realm' })]: 6 }); break;
    case 'forge': addStartExtra(cap, 'forge'); addStartTech(o, 'forge'); break;
    case 'lumber': ensureWoodlines(cap, 2); addStartExtra(cap, 'lumber'); addStartExtra(cap, 'lumber'); break;
    case 'scouts': addStartScouts(o, 2); addStartTech(o, 'autoscout'); addStartTech(o, 'stealth'); addStartTech(o, 'farsight'); break;
    case 'ogres': addStartTech(o, 'stable'); setStartArmy(o, { 'd-sw-ogre': 2 }); break;
    case 'twin': addStartExtra(cap, 'barracks'); addStartTech(o, 'dualwield'); setStartArmy(o, { [leaderDesign(o, { name: 'Twin-Axe Berserker', type: 'inf', weapon: 'handaxe', off: 'handaxe', armor: 'stag1', race: 'swamp' })]: 6 }); break;
    case 'navigator': addStartScouts(o, 3); setStartArmy(o, { 'rng-swamp': 3 }); break;
    case 'champion': addStartTech(o, 'stable'); setStartArmy(o, { 'd-wd-champ': 1 }); break;
    case 'twohand': addStartExtra(cap, 'barracks'); addStartTech(o, 'twohand'); setStartArmy(o, { [leaderDesign(o, { name: 'Two-Handed Protector', type: 'inf', weapon: 'dirk', armor: 'spirit1', race: 'wood', two: true })]: 6 }); break;
    case 'farms': addStartExtra(cap, 'farm'); addStartExtra(cap, 'farm'); break;
    case 'ranger': addStartScouts(o, 2); setStartArmy(o, { 'rng-wood': 6 }); break;
  }
  if (o !== ME && race) { const N = NATIONS[o]; N.income = aiIncome(N); }
}

// ---------- woodlines: mountain or ruin borders of the capital turn into tree borders (Weylyn, Roxx) ----------
// Only closed borders change: no path is closed and no pass or tunnel through a mountain border is touched.
const dxTreeEdges = p => world.edges.filter(e => (e.a === p || e.b === p) && !e.open && (e.style === 'trees' || e.style === 'palms')).length;
function ensureWoodlines(p, n) {
  const D = diplState();
  let need = n - dxTreeEdges(p); if (need <= 0) return;
  const cands = world.edges.map((e, i) => [e, i]).filter(([e]) => (e.a === p || e.b === p) && !e.open && (e.style === 'mountains' || e.style === 'ruins'));
  for (const [e, i] of dxShuffle(cands)) {
    if (need <= 0) break;
    e.style = 'trees'; D.woodlines.push(i); woodlineSprites(i); need--;
  }
  refreshTreeBorders();
}
function refreshTreeBorders() {
  treeBorder = world.provinces.map((_, i) => world.edges.filter(e => (e.a === i || e.b === i) && !e.open && (e.style === 'trees' || e.style === 'palms')).length);
  cacheDirty = true; miniDirty = true;
}
// redraw one border as trees: take away the mountains or ruins along it (the corners where borders meet keep theirs),
// then plant the band the renderer plants on the island's own tree borders
function woodlineSprites(i) {
  const e = world.edges[i]; if (!e || !G || !G.sway || !G.still) return;
  const V = world.vertices, a = V[e.v[0]], b = V[e.v[1]], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  const along = q => { const qy = q.y - 12, t = ((q.x - a[0]) * dx + (qy - a[1]) * dy) / (len * len), d = Math.abs((q.x - a[0]) * nx + (qy - a[1]) * ny); return t > 0.03 && t < 0.97 && d < 34; };   // sprites stand below their spot
  G.still = G.still.filter(q => !along(q));
  G.sway = G.sway.filter(q => !along(q));
  const swampy = [e.a, e.b].some(x => world.provinces[x].terrain === 'swamp'), r = rngFrom(world.seed + ':woodline:' + i);
  const n = Math.max(1, Math.round(len / 20));
  for (const row of [-1, 1]) for (let j = 0; j < n; j++) {
    const t = (j + 0.5 + (row > 0 ? 0.5 : 0)) / n; if (t > 1) continue;
    const off = row * 15 + (r() - 0.5) * 8;
    const s = (swampy ? 'cypress' + (r() < 0.5 ? 0 : 1) : r() < 0.45 ? 'pine' + (r() < 0.5 ? 0 : 1) : 'tree' + Math.floor(r() * 3)) + '_L';
    G.sway.push({ x: a[0] + dx * t + nx * off, y: a[1] + dy * t + ny * off + 8, s, ph: r() * 6.28 });
  }
  G.sway.sort((u, v) => u.y - v.y); G.still.sort((u, v) => u.y - v.y); cacheDirty = true;
}

// ---------- opinion: what a computer nation thinks of another nation ----------
const schoolOfNation = o => o === ME ? currentSchool() : NATIONS[o] ? NATIONS[o].school : null;
// soldiers by kind of troop: infantry (not ranged, not Mages), cavalry (Riders, Ogres, Champions), ranged
function troopMix(o) {
  let inf = 0, cav = 0, rng = 0;
  for (const a of S.units) if (a.kind === 'army' && a.owner === o) for (const k in a.troops) {
    const c = a.troops[k]; if (!c || k === MAGE) continue;
    const st = DSTATS[k]; if (!st || st.fam === 'boss' || st.fam === 'water') continue;
    if (st.ranged) rng += c; else if (st.cav) cav += c; else inf += c;
  }
  return { inf, cav, rng };
}
const extrasOfNation = (o, type) => { const per = []; for (const [p, b] of S.buildings) if (b.owner === o) per.push(extrasIn(p).filter(e => e.type === type).length); return per; };
const SCOUT_TECHS = ['autoscout', 'farsight', 'scoutsight'];   // the computer nations can't research Scout Sight, so it isn't asked of them
function fullScouts(o) {
  const need = SCOUT_TECHS.filter(id => TECH_BY_ID[id] && !(o !== ME && TECH_BY_ID[id].playerOnly));
  const n = S.units.filter(u => u.owner === o && u.kind === WAYFINDER).length;
  return { n, full: need.every(id => techOf(o, id)) ? n : 0 };
}
// the leader's like (+50), dislike (−25) or nothing (0) for nation t
function leaderLike(L, t) {
  switch (L.like) {
    case 'school': { const sc = schoolOfNation(t); return !sc ? 0 : sc === L.school ? DIPL.like : DIPL.dislike; }
    case 'cav': { const m = troopMix(t); return m.cav > m.inf ? DIPL.like : m.cav === 0 ? DIPL.dislike : 0; }
    case 'nocav': { const m = troopMix(t); return m.cav === 0 ? DIPL.like : m.cav > m.inf ? DIPL.dislike : 0; }
    case 'forges': { const per = extrasOfNation(t, 'forge'), f = per.reduce((x, y) => x + y, 0); return f === 0 ? DIPL.dislike : f >= Math.max(1, Math.floor(per.length / 3)) ? DIPL.like : 0; }
    case 'lumber3': case 'farms3': { const per = extrasOfNation(t, L.like === 'lumber3' ? 'lumber' : 'farm'), mx = Math.max(0, ...per); return mx >= 3 ? DIPL.like : mx <= 1 ? DIPL.dislike : 0; }
    case 'scouts': { const s = fullScouts(t); return s.full >= 3 ? DIPL.like : s.n <= 1 ? DIPL.dislike : 0; }
  }
  return 0;
}
// forts (not capitals) and Thug Dens of t that touch o's land
function borderThings(t, o) {
  let forts = 0, dens = 0;
  for (const [p, b] of S.buildings) {
    if (b.owner !== t || !allNbr[p].some(q => nationOf(q) === o)) continue;
    if (b.stage === 1) forts++;
    if (isSw(t)) dens += extrasIn(p).filter(e => e.type === 'market').length;
  }
  return { forts, dens };
}
const fmtLeft = s => fmtTime(Math.max(0, s));
function opinionParts(o, t) {
  const N = NATIONS[o]; if (!N || o === t || !aliveNation(t)) return [];
  const D = diplState(), out = [];
  if (raceOf(o) !== raceOf(t)) out.push(['Different race', DIPL.race]);
  const dc = D.decl[t + '>' + o] || 0; if (dc) out.push([`Declared war on them${dc > 1 ? ' (×' + dc + ')' : ''}`, DIPL.war * dc]);
  const bt = borderThings(t, o);
  if (bt.forts) out.push([`${bt.forts} fort${bt.forts > 1 ? 's' : ''} on their border`, DIPL.fort * bt.forts]);
  if (bt.dens) out.push([`${bt.dens} Thug Den${bt.dens > 1 ? 's' : ''} on their border`, DIPL.den * bt.dens]);
  if (t === ME && N.diff === 'difficult') out.push(['Difficult nation', DIPL.difficult]);
  if (provsOf(t).length >= DIPL.threatProvs) out.push([`Existential Threat (${DIPL.threatProvs}+ provinces)`, DIPL.threat]);   // allies too
  const L = leaderOf(o), Lt = leaderOf(t);
  if (L) { const v = leaderLike(L, t); if (v) out.push([`${L.full}: ${leaderLikeText(L)[v > 0 ? 0 : 1][1]}`, v]); }
  const bk = D.boss[t] || 0; if (bk) out.push([`Slew ${bk > 1 ? bk + ' bosses' : 'a boss'}`, DIPL.boss * bk]);
  for (const m of D.mods) if (m.o === o && m.t === t && m.until > S.t) out.push([`${MOD_TEXT[m.kind] || m.kind} (${fmtLeft(m.until - S.t)})`, m.v]);
  return out;
}
const MOD_TEXT = { flirt: 'Flirted with', gift: 'Gift', growl: 'Growled at', spy: 'Caught spying' };
let opMemo = new Map(), opMemoT = -1;
function opinion(o, t) {
  if (!NATIONS[o]) return 0;   // the player's nation has no opinion
  const now = Math.floor(S.t * 2); if (now !== opMemoT) { opMemo = new Map(); opMemoT = now; }
  const k = o * 64 + t; let v = opMemo.get(k);
  if (v === undefined) { v = opinionParts(o, t).reduce((n, [, x]) => n + x, 0); opMemo.set(k, v); }
  return v;
}
const opDirty = () => { opMemo = new Map(); dipKey = ''; };
const addMod = (o, t, kind, v, dur) => { diplState().mods.push({ o, t, kind, v, until: S.t + dur }); opDirty(); };
const modActive = (o, t, kind) => diplState().mods.find(m => m.o === o && m.t === t && m.kind === kind && m.until > S.t);

// ---------- agreements: military access, Trade Networks, Organized Crime ----------
// access: { from, to } — `from` lets `to`'s units through its land. Allies have full access to each other.
function hasAccess(x, n) {
  if (!S.dipl || x === n || !isNation(x) || !isNation(n)) return false;
  return allied(x, n) || S.dipl.access.some(g => g.from === n && g.to === x);
}
const accessGiven = (from, to) => !!diplState().access.find(g => g.from === from && g.to === to);
function endAccess(from, to, why) {
  const D = diplState(), had = accessGiven(from, to);
  D.access = D.access.filter(g => !(g.from === from && g.to === to)); if (!had) return;
  if (from === ME) toast(`The ${PLAYERS[to].name} may no longer march through your land${why ? ': ' + why : ''}.`);
  else if (to === ME) toast(`The ${PLAYERS[from].name} withdrew your military access${why ? ': ' + why : ''}.`, true);
  dipKey = '';
}
const tradeRaces = new Set(['realm', 'wood']);
function tradeWhy(a, b) {
  if (!tradeRaces.has(raceOf(a)) || !tradeRaces.has(raceOf(b))) return 'Only Woodlings and Realmlings form Trade Networks';
  if (pairHas(diplState().trade, a, b)) return 'Already trading';
  if (atWar(a, b)) return 'You are at war';
  if (!nationsBorder(a, b)) return 'Needs a shared border';
  for (const [x, y] of [[a, b], [b, a]]) if (NATIONS[x] && opinion(x, y) < DIPL.trade) return `Their opinion of you is ${sgn(opinion(x, y))} (needs +${DIPL.trade})`;
  return '';
}
function crimeWhy(a, b) {
  if (raceOf(a) !== 'swamp' || raceOf(b) !== 'swamp') return 'Only between two Swampling nations';
  if (pairHas(diplState().crime, a, b)) return 'Already in business';
  if (atWar(a, b)) return 'You are at war';
  for (const [x, y] of [[a, b], [b, a]]) if (NATIONS[x] && opinion(x, y) < DIPL.crime) return `Their opinion of you is ${sgn(opinion(x, y))} (needs +${DIPL.crime})`;
  return '';
}
// Organized Crime: one more Thug slot in every Thug Den, per agreement (swamp.js denCap)
function crimeSlots(o) { return S.dipl && S.dipl.crime ? S.dipl.crime.filter(c => c.a === o || c.b === o).length : 0; }
// Trade Network: Community / Trade Routes gold +10% per agreement (the player's; the computer nations' income has no Trade Routes)
const tradeCount = o => S.dipl && S.dipl.trade ? S.dipl.trade.filter(c => c.a === o || c.b === o).length : 0;
function formPact(kind, a, b) {
  const D = diplState(); D[kind].push({ a, b, since: S.t });
  const o = a === ME ? b : b === ME ? a : 0, what = kind === 'trade' ? 'a Trade Network' : 'an Organized Crime Agreement';
  if (o) { sfx('wn_ally'); toast(`You and the ${PLAYERS[o].name} formed ${what}. ${kind === 'trade' ? 'Community and Trade Routes give both of you 10% more gold.' : 'Every Thug Den of both nations holds one more Thug.'}`); }
  else if (knows(a) || knows(b)) toast(`The ${PLAYERS[a].name} and the ${PLAYERS[b].name} formed ${what}.`);
  if (kind === 'crime') computeIncome();
  dipKey = '';
}
function endPact(kind, P, why) {
  const D = diplState(); D[kind] = D[kind].filter(x => x !== P);
  const o = P.a === ME ? P.b : P.b === ME ? P.a : 0, what = kind === 'trade' ? 'Trade Network' : 'Organized Crime Agreement';
  if (kind === 'crime') { D.crimeEnd.push({ at: S.t + DIPL.crimeOut, a: P.a, b: P.b }); computeIncome(); }
  if (o) toast(`Your ${what} with the ${PLAYERS[o].name} has ended${why ? ': ' + why : ''}.${kind === 'crime' && raceOf(ME) === 'swamp' ? ` Thugs over the limit leave their dens in ${DIPL.crimeOut} seconds.` : ''}`, why !== 'you ended it');
  dipKey = '';
}
// after a crime agreement ends: Thugs beyond a den's room step out
function ejectThugs() {
  let n = 0;
  for (const [p, list] of S.extras) {
    if (!owned(p)) continue;
    for (const e of list) while (e.type === 'market' && (e.thugs || 0) > denCap(ME)) {
      e.thugs--; const u = mkUnit(S.nextId++, THUG, 'Thug', p, 0); u.slot = freeSlot(p, u); [u.x, u.y] = slotPos(p, u.slot); u.born = S.t; S.units.push(u); n++;
    }
  }
  if (n) { computeIncome(); cmdKey = ''; rosterKey = ''; toast(`${n} Thug${n > 1 ? 's' : ''} stepped out of the Thug Dens: there is no longer room for them.`); }
}

// ---------- alliances: +50 opinion (v105 replaces the v96 fort and war-history rules) ----------
allyWhy = function (a, b) {
  if (!aliveNation(a) || !aliveNation(b) || a === b) return 'Not possible';
  if (raceOf(a) !== raceOf(b)) return 'Only nations of the same race can ally';
  if (allied(a, b)) return 'Already allies';
  const most = MAX_ALLIES === 1 ? 'an ally' : `${MAX_ALLIES} allies`;
  if (treatyCount(a) >= MAX_ALLIES) return a === ME ? `You already have ${most}` : `They already have ${most}`;
  if (treatyCount(b) >= MAX_ALLIES) return b === ME ? `You already have ${most}` : `They already have ${most}`;
  if (atWar(a, b)) return 'You are at war';
  if (truceLeft(a, b) > 0) return `Truce: ${fmtTime(truceLeft(a, b))} left`;
  if ((NATIONS[a] && NATIONS[a].rival === b) || (NATIONS[b] && NATIONS[b].rival === a)) return a === ME || b === ME ? 'They see you as their rival' : 'They are rivals';
  for (const [x, y] of [[a, b], [b, a]]) if (NATIONS[x] && opinion(x, y) < DIPL.ally) return `${y === ME ? 'Their opinion of you' : 'Their opinion'} is ${sgn(opinion(x, y))} (needs +${DIPL.ally})`;
  return '';
};
stepAllyForts = function () {};   // v96's fort-on-the-border countdown is replaced by the opinion modifier

// ---------- declaring war: opinion, agreements, Proxy Wars ----------
{ const dw = declareWar; declareWar = function (att = ME, def) {
  const w = dw(att, def);
  if (w) { const D = diplState(); D.decl[att + '>' + def] = (D.decl[att + '>' + def] || 0) + 1; opDirty(); }
  return w;
}; }
// the gold value of a nation's soldiers (for exhaustion)
const troopValue = k => { const d = UNIT_DEFS[k]; return d && d.cost ? (d.cost.gold || 0) + (d.cost.wood || 0) : 0; };
const armyValue = o => S.units.reduce((n, a) => n + (a.kind === 'army' && a.owner === o ? Object.entries(a.troops).reduce((m, [k, c]) => m + c * troopValue(k), 0) : 0), 0);
function lostValue(o, k, n = 1) { const D = diplState(); D.lost[o] = (D.lost[o] || 0) + troopValue(k) * n; }
{ const nw = newWar; newWar = function (att, def, parent) {
  const w = nw(att, def, parent), D = diplState();
  // a war ends military access and agreements between the two
  endAccess(att, def, 'you are at war'); endAccess(def, att, 'you are at war');
  for (const kind of ['trade', 'crime']) { const P = pairHas(D[kind], att, def); if (P) endPact(kind, P, 'war'); }
  if (parent) { w.proxy = def; w.cost0 = armyValue(def); w.lost0 = D.lost[def] || 0; w.exhB = 0; }
  else {
    for (const c of S.wars) if (c !== w && c.proxy === def) c.exhB = (c.exhB || 0) + DIPL.exhDeclare;   // a direct war on a nation fighting a Proxy War
    if (att !== ME && def !== ME && (knows(att) || knows(def))) newsAdd('war', att, def);
  }
  opDirty(); return w;
}; }
{ const ew = endWar; endWar = function (w) {
  const live = S.wars.includes(w); ew(w);
  if (live && !w.parent && w.a !== ME && w.b !== ME && (knows(w.a) || knows(w.b))) newsAdd('peace', w.a, w.b);
}; }
// Proxy War helpers
const parentWar = w => w && w.parent ? S.wars.find(x => x.id === w.parent) : null;
function proxyShield(O, f) { const w = warBetween(O, f); return !!(w && w.proxy === O); }
function exhaustionOf(w) {
  if (!w || !w.proxy) return 0;
  const lost = Math.max(0, ((S.dipl && S.dipl.lost[w.proxy]) || 0) - (w.lost0 || 0));
  const pct = w.cost0 > 0 ? lost / w.cost0 * 100 : 0;
  return Math.min(100, Math.round(pct * DIPL.exhPer + (w.exhB || 0)));
}
{ const ws = warscore; warscore = (w, side) => w && w.proxy ? 0 : ws(w, side); }
{ const os = occScore; occScore = function (w) {
  if (w.proxy) return 0;
  let s = os(w);
  // occupations by the defender's Proxy War allies count for the defender
  const kids = S.wars.filter(c => c.parent === w.id && c.proxy);
  if (kids.length) for (const [p, o] of S.occ) { const b = S.buildings.get(p); if (b && b.owner === w.a && kids.some(c => c.proxy === o)) s -= WAR.occVal[b.stage]; }
  return s;
}; }
// a Proxy War ally's victories count for the ally it defends; its losses only add to its exhaustion
{ const wwp = warWipe; warWipe = function (b, a) {
  const w = battleWar(b);
  if (!w || !w.proxy) return wwp(b, a);
  if (a.owner === w.proxy) return;
  const P = parentWar(w); if (!P) return;
  const n = a.wsSize || (b.lost[a.owner] || 0), all = Math.max(n, a.wsTotal || 0), pts = n > all / 2 ? WAR.wipe : n > WAR.wipeMin ? WAR.wipeBig : 0;
  if (pts) { addScore(P, P.b, pts); P.battles += P.b === P.a ? pts : -pts; }
}; }
{ const so = stepOneWar; stepOneWar = function (w, t) {
  if (!w.proxy) return so(w, t);
  if (exhaustionOf(w) >= 100) {
    const o = w.proxy, f = w.a;
    endWar(w);
    if (o === ME) { sfx('war_peace'); toast(`Your nation is exhausted: you make a white peace with the ${PLAYERS[f].name} and leave your ally’s war.`, true); }
    else if (f === ME) toast(`The ${PLAYERS[o].name} is exhausted: it makes a white peace with you and leaves the war.`);
    else if (knows(o) || knows(f)) toast(`The ${PLAYERS[o].name} is exhausted and leaves the war against the ${PLAYERS[f].name}.`);
    dipKey = '';
  }
}; }
// soldiers lost in battle (Proxy War exhaustion); ghoulFall runs once for every soldier who falls
{ const gf = ghoulFall; ghoulFall = function (a, k) { gf(a, k); if (a && isNation(a.owner)) lostValue(a.owner, k); }; }
// boss kills: +25 opinion with every nation, for good
{ const bs = banditSlain; banditSlain = function (a, b) {
  bs(a, b);
  if (!a || !a.boss) return;
  const owner = b.start && b.start[ME] !== undefined ? ME : Object.keys(b.start || {}).map(Number).find(x => NATIONS[x]);
  if (!owner) return;
  const D = diplState(); D.boss[owner] = (D.boss[owner] || 0) + 1; opDirty();
  if (owner === ME) toast(`Word of your victory spreads: every nation thinks better of you (+${DIPL.boss} opinion, for good).`);
}; }

// ---------- the player's diplomatic actions ----------
// each returns why it can't be done ('' when it can)
const sameRace = (a, b) => raceOf(a) === raceOf(b);
const sexOf = o => { const L = leaderOf(o); return L ? L.sex : null; };
function flirtWhy(o) {
  if (!sameRace(ME, o)) return 'Only with a leader of your own race';
  if (!sexOf(ME) || !sexOf(o) || sexOf(ME) === sexOf(o)) return raceOf(ME) === 'swamp' ? 'Swampling leaders are all men: no flirting' : 'Only with a leader of the opposite sex';
  const m = modActive(o, ME, 'flirt'); if (m) return `Still charmed: ${fmtLeft(m.until - S.t)}`;
  return '';
}
function growlWhy(o) {
  if (raceOf(ME) !== 'swamp') return 'Swamplings only';
  const m = modActive(o, ME, 'growl'); if (m) return `They’re still reeling: ${fmtLeft(m.until - S.t)}`;
  return '';
}
function giftWhy(o) {
  if (!sameRace(ME, o)) return 'Only to a nation of your own race';
  if (S.stock.gold < DIPL.gift.gold) return `Needs ${DIPL.gift.gold} gold`;
  return '';
}
// Bribe: the bribed nation x attacks a smaller nation y (sizes count allies). x must be at peace and not allied to y,
// and you can't bribe a nation you have declared war on (one that declared war on you is fine)
const bloc = o => [o, ...alliesOf(o)].reduce((n, x) => n + provsOf(x).length, 0);
function bribeWhyFor(payer, x, y) {
  if (y === x || y === payer || !aliveNation(y) || !aliveNation(x)) return 'Not possible';
  if (allied(x, y)) return 'They are allies';
  if (atWar(x, y)) return 'Already at war';
  if (bloc(y) >= bloc(x)) return 'Not smaller than them (with allies)';
  const st = stockOf(x), give = {}; for (const k in WAR.declareCost) give[k] = Math.max(0, WAR.declareCost[k] - (st[k] || 0));
  for (const k in give) st[k] += give[k];
  const why = declareWhy(x, y);
  for (const k in give) st[k] -= give[k];
  return why;
}
function bribeWhy(o) {
  if (!NATIONS[o]) return 'Not possible';
  if ((diplState().decl[ME + '>' + o] || 0) > 0) return 'You have declared war on them';
  if (warsOf(o).length) return 'They are at war';
  if (S.stock.gold < DIPL.bribe.gold) return `Needs ${DIPL.bribe.gold} gold`;
  if (!bribeTargets(o).length) return 'No smaller nation they could attack';
  return '';
}
const bribeTargets = o => liveNations().filter(y => y !== ME && S.met.has(y) && !bribeWhyFor(ME, o, y));
function doBribe(payer, x, y) {
  const why = payer === ME ? bribeWhy(x) || bribeWhyFor(ME, x, y) : bribeWhyFor(payer, x, y);
  if (why) { if (payer === ME) toast('Can’t bribe: ' + why.charAt(0).toLowerCase() + why.slice(1) + '.', true); return false; }
  const ps = stockOf(payer); ps.gold -= DIPL.bribe.gold;
  const st = stockOf(x); for (const k in WAR.declareCost) st[k] = (st[k] || 0) + WAR.declareCost[k];   // the bribe pays their war fee
  const w = declareWar(x, y);
  if (payer === ME) { sfx('war_declare'); toast(w ? `The ${PLAYERS[x].name} took your ${DIPL.bribe.gold} gold and declared war on the ${PLAYERS[y].name}.` : 'The bribe fell through.', !w); }
  return !!w;
}
// military access
function grantWhy(o) {
  if (accessGiven(ME, o)) return '';
  if (allied(ME, o)) return 'Allies already have access';
  if (atWar(ME, o)) return 'You are at war';
  if (opinion(o, ME) < DIPL.offer) return `They refuse: their opinion of you is ${sgn(opinion(o, ME))} (needs ${DIPL.offer} or better)`;
  return '';
}
function askWhy(o) {
  if (accessGiven(o, ME)) return 'They already let you through';
  if (allied(ME, o)) return 'Allies already have access';
  if (atWar(ME, o)) return 'You are at war';
  if (opinion(o, ME) <= 0) return `Their opinion of you is ${sgn(opinion(o, ME))} (needs to be positive)`;
  return '';
}
// spying: 3 minutes, then 10% caught (−50 opinion and no spying on them for 10 minutes); otherwise 30% provinces revealed,
// 30% their whole army's power, 40% nothing
function spyWhy(o) {
  const D = diplState();
  if (D.spies[o]) return `Spying: ${fmtLeft(D.spies[o].until - S.t)} left`;
  if ((D.spyLock[o] || 0) > S.t) return `Your spies were caught: ${fmtLeft(D.spyLock[o] - S.t)}`;
  if (S.stock.gold < DIPL.spy.gold) return `Needs ${DIPL.spy.gold} gold`;
  return '';
}
function finishSpy(o) {
  const D = diplState(); delete D.spies[o];
  if (!aliveNation(o)) return;
  const I = D.intel[o] = D.intel[o] || {}, N = PLAYERS[o].name;
  if (Math.random() < DIPL.spy.fail) {
    addMod(o, ME, 'spy', DIPL.spy.cost, DIPL.spy.lock); D.spyLock[o] = S.t + DIPL.spy.lock;
    sfx('ui_error'); toast(`Your spies were caught by the ${N}! Their opinion of you drops by ${-DIPL.spy.cost} for ${DIPL.spy.lock / 60} minutes, and you can’t spy on them for as long.`, true); return;
  }
  const r = Math.random();
  if (r < DIPL.spy.provs) {
    const own = provsOf(o), hidden = own.filter(p => !S.explored.has(p)), pool = dxShuffle(hidden.length ? hidden : own).slice(0, DIPL.spy.show);
    for (const p of pool) S.known.add(p);
    I.provs = pool; I.provsT = S.t; S.sig = ''; computeFog();
    toast(`Your spies mapped ${pool.length} province${pool.length === 1 ? '' : 's'} of the ${N}: ${pool.map(provName).join(', ')}.`);
  } else if (r < DIPL.spy.provs + DIPL.spy.power) {
    I.power = nationPower(o); I.powerT = S.t;
    toast(`Your spies counted the ${N}’s armies: total power ${fmtPow(I.power)}.`);
  } else toast(`Your spies came back from the ${N} with nothing useful.`);
  dipKey = '';
}
// a computer nation's view of the player's request
function dxAct(act, o, arg) {
  const N = PLAYERS[o] ? PLAYERS[o].name : '', D = diplState(), fail = why => { toast(why, true); sfx('ui_error'); };
  let why;
  switch (act) {
    case 'flirt': if ((why = flirtWhy(o))) return fail(why); addMod(o, ME, 'flirt', DIPL.flirt.v, DIPL.flirt.dur); sfx('ui_click'); toast(`${leaderOf(o).full} blushes: +${DIPL.flirt.v} opinion for ${DIPL.flirt.dur / 60} minutes.`); break;
    case 'growl': { if ((why = growlWhy(o))) return fail(why); const up = Math.random() < 0.5, v = up ? DIPL.growl.v : -DIPL.growl.v; addMod(o, ME, 'growl', v, DIPL.growl.dur); sfx('ui_click'); toast(up ? `The ${N} liked that growl: +${DIPL.growl.v} opinion for ${DIPL.growl.dur / 60} minutes.` : `The ${N} took that growl badly: −${DIPL.growl.v} opinion for ${DIPL.growl.dur / 60} minutes.`, !up); break; }
    case 'gift': if ((why = giftWhy(o))) return fail(why); S.stock.gold -= DIPL.gift.gold; NATIONS[o].stock.gold += DIPL.gift.gold; addMod(o, ME, 'gift', DIPL.gift.v, DIPL.gift.dur); sfx('ui_click'); toast(`You sent the ${N} ${DIPL.gift.gold} gold: +${DIPL.gift.v} opinion for ${DIPL.gift.dur / 60} minutes.`); break;
    case 'bribe': dxUI.bribe = dxUI.bribe === o ? 0 : o; break;
    case 'bribeon': if (doBribe(ME, o, arg)) dxUI.bribe = 0; break;
    case 'grant': if (accessGiven(ME, o)) { endAccess(ME, o, 'you revoked it'); break; } if ((why = grantWhy(o))) return fail(why); D.access.push({ from: ME, to: o }); sfx('ui_click'); toast(`The ${N} accepts your offer: their armies may now march through your land. You can revoke it at any time.`); break;
    case 'ask': if ((why = askWhy(o))) return fail(why); D.access.push({ from: o, to: ME }); sfx('wn_ally'); toast(`The ${N} grants you military access: your armies may march through their land.`); break;
    case 'giveback': endAccess(o, ME, 'you gave it back'); break;
    case 'ally': if (allied(ME, o)) { const A = S.allies.find(x => (x.a === ME && x.b === o) || (x.b === ME && x.a === o)); if (A) endAlliance(A, 'you ended it'); break; } if ((why = allyWhy(ME, o))) return fail(why); formAlliance(ME, o, 0); break;
    case 'trade': case 'crime': { const P = pairHas(D[act], ME, o); if (P) { endPact(act, P, 'you ended it'); break; } if ((why = act === 'trade' ? tradeWhy(ME, o) : crimeWhy(ME, o))) return fail(why); formPact(act, ME, o); break; }
    case 'spy': if ((why = spyWhy(o))) return fail(why); S.stock.gold -= DIPL.spy.gold; D.spies[o] = { t0: S.t, until: S.t + DIPL.spy.dur }; sfx('ui_click'); toast(`Spies sent into the ${N}. They report back in ${DIPL.spy.dur / 60} minutes.`); break;
    case 'declare': declareWar(ME, o); selectDip(o); break;
  }
  opDirty();
}

// ---------- requests from computer nations: a popup; minimized it becomes a flag; 30 s, then declined ----------
// kinds: flirt, gift (data.gold), access, alliance (data.vs), trade, crime
// (the computer nations don't send these on their own yet, except alliance offers: the AI pass decides when)
const REQ_TEXT = {
  flirt: (o, r) => [`${leaderOf(o) ? leaderOf(o).full : 'Their leader'} is flirting with you.`, 'Flirt back', 'Ignore'],
  gift: (o, r) => [`They offer you a gift of <b>${r.data.gold} gold</b>.`, 'Accept', 'Refuse'],
  access: (o, r) => [`They ask for <b>military access</b>: their armies would march through your land (you can revoke it at any time).`, 'Grant', 'Refuse'],
  alliance: (o, r) => [`They propose an <b>alliance</b>${r.data.vs && PLAYERS[r.data.vs] ? ` against the ${PLAYERS[r.data.vs].name}` : ''}: if anyone declares war on one of you, the other joins (a Proxy War).`, 'Ally', 'Decline'],
  trade: (o, r) => [`They propose a <b>Trade Network</b>: Community and Trade Routes give both nations 10% more gold.`, 'Agree', 'Decline'],
  crime: (o, r) => [`They propose an <b>Organized Crime Agreement</b>: every Thug Den of both nations holds one more Thug.`, 'Agree', 'Decline']
};
const REQ_NAME = { flirt: 'Flirting', gift: 'Gift', access: 'Access request', alliance: 'Alliance offer', trade: 'Trade Network', crime: 'Organized Crime' };
function dipRequest(from, kind, data = {}) {
  const D = diplState();
  if (!NATIONS[from] || !aliveNation(from) || S.fallen || D.reqs.some(r => r.from === from && r.kind === kind)) return null;
  const r = { id: D.seq++, from, kind, data, t: S.t, until: S.t + DIPL.reqTime, min: false };
  D.reqs.push(r); S.met.add(from); sfx('wn_ally'); reqKey = ''; flagKey = '';
  return r;
}
function answerRequest(r, yes, quiet) {
  const D = diplState(); D.reqs = D.reqs.filter(x => x !== r); reqKey = ''; flagKey = '';
  const o = r.from, N = PLAYERS[o] ? PLAYERS[o].name : '';
  if (!aliveNation(o)) return;
  if (!yes) { if (!quiet) toast(`You declined the ${N}’s ${REQ_NAME[r.kind].toLowerCase()}.`); else toast(`No answer to the ${N}’s ${REQ_NAME[r.kind].toLowerCase()}: declined.`); return; }
  switch (r.kind) {
    case 'flirt': if (!modActive(o, ME, 'flirt')) addMod(o, ME, 'flirt', DIPL.flirt.v, DIPL.flirt.dur); toast(`You flirt back: the ${N} likes you more (+${DIPL.flirt.v} for ${DIPL.flirt.dur / 60} minutes).`); break;
    case 'gift': { const st = NATIONS[o].stock, g = Math.min(r.data.gold, Math.floor(st.gold)); st.gold -= g; S.stock.gold += g; toast(`You accepted ${g} gold from the ${N}.`); break; }
    case 'access': if (atWar(ME, o)) return toast('Not while you are at war.', true); if (!accessGiven(ME, o)) D.access.push({ from: ME, to: o }); toast(`The ${N} may now march through your land.`); break;
    case 'alliance': { const why = allyWhy(ME, o); if (why) return toast('The alliance is no longer possible: ' + why.charAt(0).toLowerCase() + why.slice(1) + '.', true); formAlliance(ME, o, r.data.vs); break; }
    case 'trade': case 'crime': { const why = r.kind === 'trade' ? tradeWhy(ME, o) : crimeWhy(ME, o); if (why) return toast('No longer possible: ' + why.charAt(0).toLowerCase() + why.slice(1) + '.', true); formPact(r.kind, ME, o); break; }
  }
  opDirty();
}
// the old alliance offer (stepAlliances, v104) goes through the new requests
offerAlliance = function (from, vs) { return !!dipRequest(from, 'alliance', { vs }); };
// what the computer nations are ALLOWED to do (for the AI pass): flirt (positive opinion, opposite sex, same race),
// gift (allies that can afford it), bribe other computer nations (never the player)
const aiCanFlirt = o => !!NATIONS[o] && opinion(o, ME) > 0 && sameRace(o, ME) && sexOf(o) && sexOf(ME) && sexOf(o) !== sexOf(ME);
const aiCanGift = (o, gold = DIPL.gift.gold) => !!NATIONS[o] && allied(o, ME) && NATIONS[o].stock.gold >= gold;
const aiBribe = (payer, x, y) => NATIONS[payer] && x !== ME && NATIONS[x] && stockOf(payer).gold >= DIPL.bribe.gold ? doBribe(payer, x, y) : false;
let reqKey = '';
function renderRequest() {
  const D = diplState(), el = $q('#dipReq'); if (!el) return;
  const r = S.started && !S.fallen ? D.reqs.find(x => !x.min) : null;
  if (!r) { if (!el.hidden) el.hidden = true; return; }
  const left = Math.max(0, r.until - S.t), key = r.id + ':' + Math.ceil(left);
  if (key === reqKey && !el.hidden) return; reqKey = key;
  const [txt, yes, no] = REQ_TEXT[r.kind](r.from, r), L = leaderOf(r.from);
  el.innerHTML = `<button type="button" class="pop-x dx-min" data-rq="min" aria-label="Minimize" title="Minimize to a flag (it still times out)">−</button>
    <div class="dx-rq-head">${L ? `<i class="pt pt-${L.id}"></i>` : ''}<span><img alt="" src="${flagOf(r.from)}"><b>${escHTML(PLAYERS[r.from].name)}</b><small>${L ? L.full : ''} · ${REQ_NAME[r.kind]}</small></span></div>
    <p>${txt}</p><div class="dx-rq-time"><i style="width:${(left / DIPL.reqTime * 100).toFixed(1)}%"></i><span>${Math.ceil(left)} s, then declined</span></div>
    <div class="dm-btns"><button type="button" data-rq="look">Show me</button><button type="button" data-rq="yes">${yes}</button><button type="button" data-rq="no">${no}</button></div>`;
  el.hidden = false;
}
function stepRequests() {
  const D = diplState();
  for (const r of D.reqs.slice()) if (S.t >= r.until || !aliveNation(r.from)) answerRequest(r, false, true);
}

// ---------- news: wars starting and ending between nations you know (dismissable flags, not popups) ----------
function newsAdd(kind, a, b) {
  const D = diplState(); D.news.push({ id: D.seq++, kind, a, b, t: S.t });
  if (D.news.length > 6) D.news.splice(0, D.news.length - 6);
  flagKey = '';
}

// ---------- every half second: timers, agreements and alliances that no longer hold ----------
let dxStepT = -1;
function stepDiplomacy() {
  if (!S.started || S.fallen) return;
  const D = diplState();
  if (!S.paused) stepRequests();
  if (S.t - dxStepT < 0.5 && S.t >= dxStepT) return; dxStepT = S.t;
  // timed opinion modifiers that ran out
  if (D.mods.some(m => m.until <= S.t)) { D.mods = D.mods.filter(m => m.until > S.t); opDirty(); }
  // spies
  for (const o of Object.keys(D.spies).map(Number)) if (!aliveNation(o)) delete D.spies[o]; else if (S.t >= D.spies[o].until) finishSpy(o);
  // alliances break when a computer nation's opinion of its ally goes negative
  for (const A of S.allies.slice()) for (const [x, y] of [[A.a, A.b], [A.b, A.a]]) if (NATIONS[x] && aliveNation(x) && aliveNation(y) && opinion(x, y) < 0 && S.allies.includes(A)) endAlliance(A, y === ME ? `the ${PLAYERS[x].name}’s opinion of you fell below zero` : 'opinion fell below zero');
  // Trade Networks: end with the shared border, or a negative opinion; Organized Crime: with a negative opinion
  for (const kind of ['trade', 'crime']) for (const P of D[kind].slice()) {
    let why = '';
    if (!aliveNation(P.a) || !aliveNation(P.b)) why = 'a nation fell';
    else if (atWar(P.a, P.b)) why = 'war';
    else if (kind === 'trade' && !nationsBorder(P.a, P.b)) why = 'you no longer share a border';
    else for (const [x, y] of [[P.a, P.b], [P.b, P.a]]) if (NATIONS[x] && opinion(x, y) < 0) why = 'opinion fell below zero';
    if (why) endPact(kind, P, why);
  }
  // military access: never between nations at war, nor with a fallen nation
  for (const g of D.access.slice()) if (!aliveNation(g.from) || !aliveNation(g.to) || atWar(g.from, g.to)) D.access = D.access.filter(x => x !== g);
  // Thugs leave the dens 10 s after a crime agreement ends
  if (D.crimeEnd.length) { const due = D.crimeEnd.filter(c => S.t >= c.at); if (due.length) { D.crimeEnd = D.crimeEnd.filter(c => S.t < c.at); if (due.some(c => c.a === ME || c.b === ME)) ejectThugs(); } }
  // news of fallen nations goes away
  if (D.news.some(n => !PLAYERS[n.a] || !PLAYERS[n.b])) { D.news = D.news.filter(n => PLAYERS[n.a] && PLAYERS[n.b]); flagKey = ''; }
  stepLeaderEffects();
}

// ---------- flags: requests waiting for an answer, war news ----------
FLAG_IMG.dxreq = bannerSVG('#6b3fa0', '#4f2d78', '<path d="M18 24 H46 V48 H18 Z" fill="#faf1dc"/><path d="M18 24 L32 37 L46 24" fill="none" stroke-width="2.4"/><circle cx="44" cy="46" r="6" fill="#c43a2e"/>');
FLAG_IMG.dxwar = bannerSVG('#c43a2e', '#962a20', '<path d="M20 22 L44 48 M44 22 L20 48" stroke-width="5" stroke="#1d1a22"/><path d="M20 22 L44 48 M44 22 L20 48" stroke-width="2.6" stroke="#dfe6ee"/><path d="M17 42 L25 50 M47 42 L39 50" stroke-width="3.4" stroke="#c4a14a"/>');
FLAG_IMG.dxpeace = bannerSVG('#3f9b4b', '#2c6e36', '<path d="M18 40 C22 30 34 26 44 30 C40 34 40 40 46 44 C36 48 24 48 18 40 Z" fill="#ffffff"/><circle cx="40" cy="34" r="1.6" fill="#1d1a22" stroke="none"/><path d="M44 30 L50 28 L46 33" fill="#f4c44f" stroke-width="1.6"/><path d="M22 46 C26 50 30 52 34 52" fill="none" stroke="#5ab04a" stroke-width="2.4"/>');
{ const fl = flagList; flagList = function () {
  const out = fl(); if (!S.started || !S.dipl) return out;
  const D = S.dipl, shown = D.reqs.find(x => !x.min);
  for (const r of D.reqs) if (r !== shown) out.push({ id: 'dxreq:' + r.id, img: 'dxreq', warn: true, tip: `${REQ_NAME[r.kind]} from the ${PLAYERS[r.from].name}: left-click to answer (declined when the time runs out), right-click to decline`, label: REQ_NAME[r.kind] });
  for (const n of D.news) out.push({ id: 'dxnews:' + n.id, img: n.kind === 'war' ? 'dxwar' : 'dxpeace', tip: n.kind === 'war' ? `The ${PLAYERS[n.a].name} declared war on the ${PLAYERS[n.b].name}. Left-click for Diplomacy, right-click to dismiss` : `The ${PLAYERS[n.a].name} and the ${PLAYERS[n.b].name} made peace. Left-click for Diplomacy, right-click to dismiss`, label: n.kind === 'war' ? 'War' : 'Peace' });
  return out.filter(f => !flagDismissed.has(f.id) || f.id.startsWith('dxreq:'));
}; }
$q('#nflags').addEventListener('click', e => {
  const b = e.target.closest('[data-flag]'); if (!b || !S.dipl) return;
  const id = b.dataset.flag, D = S.dipl;
  if (id.startsWith('dxreq:')) { const r = D.reqs.find(x => 'dxreq:' + x.id === id); if (!r) return; for (const x of D.reqs) if (!x.min && x !== r) x.min = true; r.min = false; D.reqs = [r, ...D.reqs.filter(x => x !== r)]; reqKey = ''; flagKey = ''; sfx('ui_click'); }
  else if (id.startsWith('dxnews:')) { const n = D.news.find(x => 'dxnews:' + x.id === id); if (!n) return; D.news = D.news.filter(x => x !== n); flagKey = ''; openDip(knows(n.a) ? n.a : n.b); }
});
$q('#nflags').addEventListener('contextmenu', e => {
  const b = e.target.closest('[data-flag]'); if (!b || !S.dipl) return;
  const id = b.dataset.flag, D = S.dipl;
  if (id.startsWith('dxreq:')) { flagDismissed.delete(id); const r = D.reqs.find(x => 'dxreq:' + x.id === id); if (r) answerRequest(r, false); }
  else if (id.startsWith('dxnews:')) { D.news = D.news.filter(x => 'dxnews:' + x.id !== id); flagKey = ''; }
});
// the request popup
{
  const el = document.createElement('div'); el.id = 'dipReq'; el.className = 'demand chip dx-req'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', 'Request from another nation'); el.hidden = true;
  document.body.appendChild(el);
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-rq]'); if (!b || !S.dipl) return;
    const r = S.dipl.reqs.find(x => !x.min); if (!r) return;
    const a = b.dataset.rq;
    if (a === 'min') { r.min = true; reqKey = ''; flagKey = ''; el.hidden = true; sfx('ui_click'); }
    else if (a === 'look') lookAtNation(r.from);
    else answerRequest(r, a === 'yes');
  });
}

// ---------- leader bonuses ----------
// soldiers: health, damage, critical blows (statsOf passes every lookup through artStats)
{ const as = artStats, cache = new WeakMap();
  artStats = function (k, st, o) {
    const r = as(k, st, o), L = o && o !== RAIDERS ? leaderOf(o) : null;
    if (!L || !r || k === MAGE) return r;
    if (k === GELEM_ID) { if (L.id !== 'naobrien') return r; let g = cache.get(r); if (!g) cache.set(r, g = {}); return g.naobrien || (g.naobrien = { ...r, atk: r.atk * 1.3 }); }
    if (r.fam === 'boss' || r.fam === 'water') return r;
    let m = cache.get(r); if (!m) cache.set(r, m = {});
    if (m[L.id] !== undefined) return m[L.id];
    let out = r;
    const mod = f => { if (out === r) out = { ...r }; f(out); };
    const inf = !r.cav && !r.ranged;
    switch (L.id) {
      case 'hisola': if (r.cav && !r.ogre && !r.champ) mod(x => x.hp *= 1.1); break;
      case 'cormac': if (inf) mod(x => x.hp *= 1.1); break;
      case 'taal': if (r.ogre) mod(x => x.atk *= 1.1); break;
      case 'marl': if (inf && r.race === 'swamp') mod(x => x.crit = (x.crit || 0) + 0.1); break;
      case 'aithne': if (r.ranged && r.race === 'realm') mod(x => x.atk += 1); break;
      case 'zaarg': if (r.ranged && r.race === 'swamp') mod(x => x.atk += 3); break;
      case 'zariel': if (r.ranged && r.race === 'wood') mod(x => x.atk += 2); break;
    }
    return m[L.id] = out;
  };
}
// movement: Champions (Cerathon), sneaking Wayfinders (Aithne)
{ const sm = speedMod; speedMod = function (u) {
  let m = sm(u); if (!u) return m;
  const L = leaderOf(u.owner); if (!L) return m;
  if (L.id === 'aithne' && u.kind === WAYFINDER && u.stealth && !stealthFree(u)) m *= 2;
  if (L.id === 'cerathon' && u.kind === 'army') {
    const ks = Object.keys(u.troops).filter(k => u.troops[k] > 0);
    if (ks.length) { const sp = k => troopSpeed(k, u.owner) * (DSTATS[k] && DSTATS[k].champ ? 1.2 : 1), a = Math.min(...ks.map(k => troopSpeed(k, u.owner))), b = Math.min(...ks.map(sp)); if (a > 0) m *= b / a; }
  }
  return m;
}; }
// battle spells: Hardened Skin +20% (Havva), Cursed Weapons +10% damage (Nihaarg)
{ const obj = onBattleJoin; onBattleJoin = function (a, t) {
  obj(a, t);
  if (leads(a.owner, 'havva') && a.skin > 0) a.skin *= 1.2;
  if (leads(a.owner, 'nihaarg') && a.curse > 0) a.curse += 0.1;
}; }
// magic leaders: +1 Magic research per tower, +4 mana regeneration
const towersIn = p => extrasIn(p).filter(e => e.type === 'magetower').length;
{ const pr = provResearch; provResearch = function (p) { const r = pr(p); if (isMageLeader(ME) && r && (S.buildings.get(p) || {}).owner === ME) r.mag += towersIn(p); return r; }; }
{ const ar = aiProvResearch; aiProvResearch = function (N, p) { const r = ar(N, p); if (isMageLeader(N.id) && r && (S.buildings.get(p) || {}).owner === N.id) r.mag += towersIn(p); return r; }; }
{ const mr = manaRegen; manaRegen = function (o) { return mr(o) + (isMageLeader(o) ? 4 : 0); }; }
// Harvest: +5% per level (Havva)
const harvestLv = () => lvl('harvest') || 0;
{ const hp = harvestPct; harvestPct = () => { const p = hp(); return p && leads(ME, 'havva') ? p + 0.05 * harvestLv() : p; }; }
// Grave Robbing +100 gold (Niall), Interdimensional Trading +30% (Alma): the player's casts and the computer's
{ const g = FINISH.graverob; FINISH.graverob = function (c, cs, t) { const before = S.stock.gold; g(c, cs, t); if (leads(ME, 'niall') && S.stock.gold > before) { S.stock.gold += 100; toast(`${leaderOf(ME).full}: +100 gold from the graves.`); } }; }
{ const g = FINISH.trading; FINISH.trading = function (c, cs, t) { const b0 = { ...S.stock }; g(c, cs, t); if (leads(ME, 'alma')) { let n = 0; for (const k of RES) { const d = S.stock[k] - b0[k]; if (d > 0) { const x = Math.round(d * 0.3); S.stock[k] += x; n = x; } } if (n) toast(`${leaderOf(ME).full}: +30% from the trade (+${n} of each).`); } }; }
{ const sp = aiSpells; aiSpells = function (N) {
  const b0 = { ...N.stock }; sp(N);
  const L = leaderOf(N.id); if (!L) return;
  if (L.id === 'niall' && N.school === 'death' && N.stock.gold > b0.gold) N.stock.gold += 100;
  if (L.id === 'alma' && N.school === 'arcane') for (const k of RES) { const d = N.stock[k] - b0[k]; if (d > 0) N.stock[k] += Math.round(d * 0.3); }
}; }
// Sacred Pyre: no wood to raise (Phlyo)
{ let w = SACRED.wood; Object.defineProperty(SACRED, 'wood', { configurable: true, enumerable: true, get() { return leads(ME, 'phlyo') ? 0 : w; }, set(v) { w = v; } }); }
// Forges cost 25% less (Finn, Glurg, Alathandrious): the cost is read for whoever is building (the player, or the
// computer nation whose turn it is)
let costCtx = null;
const FORGE_LEADERS = new Set(['finn', 'glurg', 'alathandrious']);
{ const F = BUILD_DEFS.forge; let base = F.cost;
  Object.defineProperty(F, 'cost', { configurable: true, enumerable: true, get() { const L = leaderOf(costCtx === null ? ME : costCtx); if (!L || !FORGE_LEADERS.has(L.id)) return base; const c = {}; for (const k in base) c[k] = Math.round(base[k] * 0.75); return c; }, set(v) { base = v; } });
  const ctx = f => function (N, ...rest) { const was = costCtx; costCtx = N && N.id !== undefined ? N.id : was; try { return f.call(this, N, ...rest); } finally { costCtx = was; } };
  aiPlan = ctx(aiPlan); aiNextBuilding = ctx(aiNextBuilding); aiMasons = ctx(aiMasons); aiFortUp = ctx(aiFortUp); aiTrain = ctx(aiTrain);
  aiQueueStep = ctx(aiQueueStep); aiWorkersStep = ctx(aiWorkersStep); aiUpgradesStep = ctx(aiUpgradesStep); aiRelieveWood = ctx(aiRelieveWood);
}
// Lumber Mills +1 wood (Weylyn, Roxx)
const LUMBER_LEADERS = new Set(['weylyn', 'roxx']);
{ const go = givesOf; givesOf = function (type) { const g = go(type); if (type === 'lumber' && leaderOf(ME) && LUMBER_LEADERS.has(leaderOf(ME).id)) g.wood = (g.wood || 0) + 1; return g; }; }
{ const ag = aiGives; aiGives = function (N, type) { const g = { ...ag(N, type) }; if (type === 'lumber' && leaderOf(N.id) && LUMBER_LEADERS.has(leaderOf(N.id).id)) g.wood = (g.wood || 0) + 1; return g; }; }
// Farms by crop (Ultanitous): Staple +1 food, Cash +1 gold, Fiber +1 wood
const CROP_PLUS = { staple: 'food', cash: 'gold', fiber: 'wood' };
{ const eb = extrasBonus; extrasBonus = function (p) { const y = eb(p); if (leads(ME, 'ultanitous')) for (const e of extrasIn(p)) if (e.type === 'farm') y[CROP_PLUS[cropOf(e)]] += 1; return y; }; }
{ const ai = aiIncome; aiIncome = function (N) {
  const inc = ai(N), L = leaderOf(N.id); if (!L) return inc;
  if (L.id === 'ultanitous') for (const [p, e] of aiExtraList(N)) if (e.type === 'farm' && !S.occ.has(p)) inc[CROP_PLUS[cropOf(e)]] += 1;
  if (L.id === 'havva' && N.school === 'life' && aiHas(N, 'harvest') && aiMages(N)) {
    const lv = ['harvest', 'bountiful', 'magnificent'].filter(id => aiHas(N, id)).length, st = aiGives(N, 'farm'); let food = 0, gold = 0;
    for (const [p, e] of aiExtraList(N)) if (e.type === 'farm' && !S.occ.has(p)) { const g = cropGives(cropOf(e), st); food += g.food || 0; gold += g.gold || 0; }
    inc.food += Math.round(food * 0.05 * lv); inc.gold += Math.round(gold * 0.05 * lv);
  }
  return inc;
}; }
// Trade Network: +10% Community / Trade Routes gold per agreement
{ const tg = tradeGold; tradeGold = function () { const g = tg(); const n = tradeCount(ME); return n && g ? Math.round(g * (1 + DIPL.tradeBonus * n)) : g; }; }
// Mending: +10% health for 30 s afterwards (Sariel)
{ const go = CAST.mending.go; CAST.mending.go = function (c) { const r = go(c); if (leads(ME, 'sariel') && c) { c.mendUntil = S.t + 30; toast(`${leaderOf(ME).full}: ${c.name} has 10% more health for 30 seconds.`); } return r; }; }
// Weak (Eliwen): 25% less damage; Mending's boost works like a little Hardened Skin
{ const ss = sideStrength; sideStrength = function (armies, prov, defender, foe) {
  if (!armies.some(a => a.weakUntil > S.t)) return ss(armies, prov, defender, foe);
  const weak = armies.filter(a => a.weakUntil > S.t), strong = armies.filter(a => !(a.weakUntil > S.t));
  return (strong.length ? ss(strong, prov, defender, foe) : 0) + 0.75 * ss(weak, prov, defender, foe);
}; }
{ const ad = applyDamage; applyDamage = function (b, armies, dmg, t, pierce) {
  const boosted = armies.filter(a => a.mendUntil > S.t); for (const a of boosted) a.skin = (a.skin || 0) + 0.1;
  try { return ad(b, armies, dmg, t, pierce); } finally { for (const a of boosted) a.skin -= 0.1; }
}; }
// Stasis Trap: 100 pure damage when it springs (Aarg); Weak for 10 s when it lets go (Eliwen). Only the player sets traps.
function pureDamage(a, dmg) {
  a.wounds = (a.wounds || 0) + dmg; let n = 0;
  for (;;) {
    const ks = Object.keys(a.troops).filter(k => a.troops[k] > 0 && k !== MAGE); if (!ks.length) break;
    const k = ks[Math.floor(Math.random() * ks.length)]; if (a.wounds < hpOf(a, k)) break;
    a.wounds -= hpOf(a, k); lostValue(a.owner, k); a.troops[k]--; if (!a.troops[k]) delete a.troops[k]; n++;
  }
  if (troopCount(a) <= 0) removeArmy(a);
  return n;
}
function stepLeaderEffects() {
  for (const a of S.units.slice()) {
    if (a.kind !== 'army') continue;
    if (a.stasisUntil && a.v105st !== a.stasisUntil && a.stasisUntil > S.t) {
      a.v105st = a.stasisUntil; a.v105weak = false;
      if (leads(ME, 'aarg') && a.owner !== ME) { const n = pureDamage(a, 100); toast(`${leaderOf(ME).full}’s trap burns ${a.name}: 100 damage${n ? `, ${n} soldier${n > 1 ? 's' : ''} fall` : ''}.`); }
    }
    if (a.v105st && !a.v105weak && S.t >= a.v105st) { a.v105weak = true; if (leads(ME, 'eliwen') && a.owner !== ME) a.weakUntil = a.v105st + 10; }
  }
}
// Bleeding (Paladomis): each two-handed Protector's blow has a 20% chance to deal its damage again over the next 4 rounds
{ const sb = stepBattles; stepBattles = function (t) {
  const due = S.battles.filter(b => t >= b.next);
  sb(t);
  for (const b of due) {
    if (!S.battles.includes(b)) continue;
    const sides = {};
    for (const a of S.units) if (a.kind === 'army' && a.battle === b && !a.retreating && troopCount(a) > 0) (sides[a.owner] = sides[a.owner] || []).push(a);
    const owners = Object.keys(sides).map(Number); if (owners.length < 2) continue;
    b.bleed = b.bleed || {};
    for (const o of owners) {
      const foe = owners.find(x => x !== o && hostile(x, o)); if (foe === undefined) continue;
      if (leads(o, 'paladomis')) for (const a of sides[o]) for (const k in a.troops) {
        const st = statsOf(k, o); if (!st.two || st.cav || st.ranged) continue;
        let n = 0; for (let i = 0; i < a.troops[k]; i++) if (Math.random() < 0.2) n++;
        if (n) (b.bleed[foe] = b.bleed[foe] || []).push({ per: n * st.atk * DMG_RATE * twoMul(a) / 4, left: 4 });
      }
      const list = b.bleed[o]; if (!list || !list.length) continue;
      let dmg = 0; for (const x of list) { dmg += x.per; x.left--; } b.bleed[o] = list.filter(x => x.left > 0);
      if (dmg > 0) { applyDamage(b, sides[o], dmg, t, 1); for (const a of sides[o]) if (troopCount(a) <= 0) { warWipe(b, a); removeArmy(a); } }
    }
  }
}; }
// a school-locked leader: only that school is offered (and Abandon Magic School is not)
const lockOf = o => { const L = leaderOf(o); return L && L.school ? L.school : null; };
{ const at = availTechs; availTechs = function (tree) {
  const out = at(tree), lk = tree === 'mag' ? lockOf(ME) : null;
  return lk ? out.filter(x => x.id !== 'abandon' && (!x.id.startsWith('school-') || x.id === 'school-' + lk)) : out;
}; }
{ const op = openSchoolPopup; openSchoolPopup = function () {
  op(); const lk = lockOf(ME); if (!lk) return;
  const el = $q('#schoolPick'); el.querySelectorAll('.sp-card[data-school]').forEach(c => { if (c.dataset.school !== lk) c.remove(); });
  const h = el.querySelector('.sp-head span'); if (h) h.textContent = `${leaderOf(ME).full} follows ${SCHOOL_WORD[lk]}: it is the only school your nation can learn.`;
}; }
{ const ps = pickSchool; pickSchool = function (k) { const lk = lockOf(ME); if (lk && k !== lk) return toast(`${leaderOf(ME).full} only allows ${SCHOOL_WORD[lk]}.`, true); return ps(k); }; }
{ const ad = aiDrawOptions; aiDrawOptions = function (N, tree) {
  const r = ad(N, tree), lk = tree === 'mag' ? lockOf(N.id) : null;
  if (lk) { N.wantSchool = lk; const st = N.tech.mag; st.opts = st.opts.filter(id => id !== 'abandon' && (!id.startsWith('school-') || id === 'school-' + lk)); if (!N.school && !st.opts.includes('school-' + lk) && !st.cur) st.opts.push('school-' + lk); if (st.cur && st.cur.startsWith('school-') && st.cur !== 'school-' + lk) st.cur = null; }
  return r;
}; }
if (typeof aiDynamicSchool === 'function') { const ds = aiDynamicSchool; aiDynamicSchool = function (N) { return lockOf(N.id) || ds(N); }; }

// ---------- icons for the diplomatic actions ----------
const DX_ICON = {
  flirt: '<path d="M24 40 C10 30 6 22 10 15 C14 9 21 10 24 16 C27 10 34 9 38 15 C42 22 38 30 24 40 Z" fill="#ff6f91"/><path d="M15 17 C16 15 18 14 20 15" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M38 6 L39.4 9.6 L43 11 L39.4 12.4 L38 16 L36.6 12.4 L33 11 L36.6 9.6 Z" fill="#ffd84a" stroke-width="1.6"/>',
  growl: '<path d="M8 18 C8 10 40 10 40 18 L40 30 C40 40 8 40 8 30 Z" fill="#93b55c"/><path d="M12 22 C16 32 32 32 36 22 Z" fill="#5a1a1a"/><path d="M14 22 L17 28 L20 22 M28 22 L31 28 L34 22" fill="#f4efe4" stroke-width="1.6"/><path d="M16 15 L21 18 M32 15 L27 18" stroke-width="2.6"/><path d="M42 16 C45 20 45 28 42 32 M45 12 C50 19 50 29 45 36" fill="none" stroke-width="2"/>',
  gift: '<rect x="8" y="20" width="32" height="20" fill="#c43a2e"/><rect x="6" y="14" width="36" height="8" fill="#e04a3a"/><path d="M24 14 V40" stroke="#f4c44f" stroke-width="5"/><path d="M24 14 V40" fill="none" stroke-width="1.4"/><path d="M24 14 C18 6 10 8 14 13 C16 15 22 14 24 14 C26 14 32 15 34 13 C38 8 30 6 24 14 Z" fill="#f4c44f"/>',
  bribe: '<path d="M14 18 C8 26 8 40 24 42 C40 40 40 26 34 18 Z" fill="#c49a5a"/><path d="M16 12 L32 12 L30 18 L18 18 Z" fill="#a8763e"/><circle cx="24" cy="30" r="7" fill="#f4c44f"/><path d="M24 26 V34 M21.5 28 H26.5" fill="none" stroke-width="1.8"/><path d="M36 6 L44 14 M44 6 L36 14" stroke="#c43a2e" stroke-width="3"/>',
  access: '<path d="M8 42 V18 L24 8 L40 18 V42 H31 V28 C31 23 17 23 17 28 V42 Z" fill="#cfc8ba"/><path d="M17 28 C17 23 31 23 31 28 V42 H17 Z" fill="#6b4a2a"/><path d="M14 35 H34 M28 31 L34 35 L28 39" fill="none" stroke="#5ab04a" stroke-width="3.4"/>',
  revoke: '<path d="M8 42 V18 L24 8 L40 18 V42 Z" fill="#cfc8ba"/><path d="M15 42 V26 H33 V42 Z" fill="#8a5a34"/><path d="M15 31 H33 M15 36 H33 M21 26 V42 M27 26 V42" stroke-width="1.6"/><path d="M12 14 L36 40" stroke="#c43a2e" stroke-width="3.6"/>',
  ally: '<circle cx="18" cy="24" r="10" fill="none" stroke="#f4c44f" stroke-width="5"/><circle cx="30" cy="24" r="10" fill="none" stroke="#e0e6ee" stroke-width="5"/><circle cx="18" cy="24" r="10" fill="none" stroke-width="1.2"/><circle cx="30" cy="24" r="10" fill="none" stroke-width="1.2"/>',
  trade: '<path d="M24 8 V40 M14 42 H34" stroke-width="3"/><path d="M8 16 H40" stroke="#8a5a34" stroke-width="3"/><path d="M8 16 L4 28 H16 Z M40 16 L36 28 H44 Z" fill="#f4c44f"/><path d="M4 28 C6 32 14 32 16 28 Z M32 28 C34 32 42 32 44 28 Z" fill="#c4a14a"/>',
  crime: '<path d="M4 20 C10 14 18 16 24 20 C30 16 38 14 44 20 C44 30 36 34 30 30 C27 28 21 28 18 30 C12 34 4 30 4 20 Z" fill="#2a2a3a"/><ellipse cx="14" cy="23" rx="4" ry="3" fill="#faf1dc"/><ellipse cx="34" cy="23" rx="4" ry="3" fill="#faf1dc"/><circle cx="38" cy="38" r="6" fill="#f4c44f"/>',
  spy: '<path d="M4 24 C12 12 36 12 44 24 C36 36 12 36 4 24 Z" fill="#faf1dc"/><circle cx="24" cy="24" r="8" fill="#3a6fd8"/><circle cx="24" cy="24" r="3.4" fill="#1d1a22"/><path d="M34 34 L42 42" stroke="#8a5a34" stroke-width="5"/><path d="M34 34 L42 42" stroke-width="1.2"/>',
  war: '<path d="M10 8 L38 36 M38 8 L10 36" stroke-width="6.5"/><path d="M10 8 L38 36 M38 8 L10 36" stroke="#dfe6ee" stroke-width="3.4"/><path d="M6 32 L16 42 M42 32 L32 42" stroke="#c4a14a" stroke-width="4.4"/><circle cx="7" cy="43" r="3" fill="#c4a14a"/><circle cx="41" cy="43" r="3" fill="#c4a14a"/>'
};
const dxIconURL = k => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"><g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${DX_ICON[k]}</g></svg>`);

// ---------- the Diplomacy screen: one large window, a collapsible section for every nation you have met ----------
const dxUI = { open: new Set(), bribe: 0, scroll: 0 };
const origNationHTML = dipNationHTML;
const sgnHTML = n => `<b class="dx-op ${n > 0 ? 'up' : n < 0 ? 'down' : ''}">${sgn(n)}</b>`;
function dxRelation(o) {
  const w = warBetween(ME, o);
  if (w && w.proxy) { const e = exhaustionOf(w); return { cls: 'war', html: `Proxy war <b class="dx-exh">${e}%</b>`, title: w.proxy === ME ? 'You are defending your ally: your exhaustion' : 'They are defending their ally: their exhaustion' }; }
  return relation(o);
}
function dxBadges(o) {
  const D = diplState(), out = [];
  if (allied(ME, o)) out.push(['ally', 'Allies']);
  if (accessGiven(ME, o)) out.push(['access', 'They may march through your land']);
  if (accessGiven(o, ME)) out.push(['access', 'You may march through their land']);
  if (pairHas(D.trade, ME, o)) out.push(['trade', 'Trade Network']);
  if (pairHas(D.crime, ME, o)) out.push(['crime', 'Organized Crime Agreement']);
  if (D.spies[o]) out.push(['spy', `Spies at work: ${fmtLeft(D.spies[o].until - S.t)}`]);
  return out.map(([k, t]) => `<i class="dx-badge dxi-${k}" title="${t}"></i>`).join('');
}
function dxActBtn(act, icon, name, why, ok, extra = '') {
  return `<button type="button" class="dx-act${why ? ' off' : ''}${extra}" data-dx="${act}"${why ? ' aria-disabled="true"' : ''} title="${escHTML(why || ok)}"><i class="dxi-${icon}"></i><span><b>${name}</b><small>${escHTML(why || ok)}</small></span></button>`;
}
function dxActions(o) {
  const D = diplState(), myRace = raceOf(ME), out = [], N = NATIONS[o];
  out.push(dxActBtn('flirt', 'flirt', 'Flirt', flirtWhy(o), `+${DIPL.flirt.v} opinion for ${DIPL.flirt.dur / 60} min`));
  if (myRace === 'swamp') out.push(dxActBtn('growl', 'growl', 'Growl', growlWhy(o), `50%: +${DIPL.growl.v} or −${DIPL.growl.v} opinion for ${DIPL.growl.dur / 60} min`));
  out.push(dxActBtn('gift', 'gift', 'Gift', giftWhy(o), `${DIPL.gift.gold} gold: +${DIPL.gift.v} opinion for ${DIPL.gift.dur / 60} min`));
  out.push(dxActBtn('bribe', 'bribe', 'Bribe', bribeWhy(o), `${DIPL.bribe.gold} gold: they attack a smaller nation`, dxUI.bribe === o ? ' on' : ''));
  out.push(accessGiven(ME, o) ? dxActBtn('grant', 'revoke', 'Revoke access', '', 'Their armies may no longer march through your land')
    : dxActBtn('grant', 'access', 'Offer access', grantWhy(o), `Their armies may march through your land (they accept at ${DIPL.offer} or better)`));
  out.push(accessGiven(o, ME) ? dxActBtn('giveback', 'revoke', 'Give back access', '', 'You may march through their land; give it back')
    : dxActBtn('ask', 'access', 'Ask for access', askWhy(o), 'Your armies march through their land'));
  out.push(allied(ME, o) ? dxActBtn('ally', 'ally', 'End alliance', '', `${WAR.allyTruce / 60}-minute truce afterwards`) : dxActBtn('ally', 'ally', 'Alliance', allyWhy(ME, o), `Needs +${DIPL.ally}: vision, access, they defend each other`));
  if (tradeRaces.has(myRace)) out.push(pairHas(D.trade, ME, o) ? dxActBtn('trade', 'trade', 'End Trade Network', '', 'Stop trading') : dxActBtn('trade', 'trade', 'Trade Network', tradeWhy(ME, o), `Needs +${DIPL.trade} and a shared border: +10% Community / Trade Routes`));
  if (myRace === 'swamp') out.push(pairHas(D.crime, ME, o) ? dxActBtn('crime', 'crime', 'End Organized Crime', '', 'Extra Thugs leave their dens 10 s later') : dxActBtn('crime', 'crime', 'Organized Crime', crimeWhy(ME, o), `Needs +${DIPL.crime}: +1 Thug in every Thug Den`));
  const sp = D.spies[o];
  out.push(sp ? `<div class="dx-act dx-busy" title="Spies at work"><i class="dxi-spy"></i><span><b>Spying…</b><small>${fmtLeft(sp.until - S.t)} left</small><em><s style="width:${((S.t - sp.t0) / DIPL.spy.dur * 100).toFixed(1)}%"></s></em></span></div>` : dxActBtn('spy', 'spy', 'Spy', spyWhy(o), `${DIPL.spy.gold} gold, ${DIPL.spy.dur / 60} min: maybe provinces or their army’s power. 10% caught`));
  if (!atWar(ME, o) && !allied(ME, o)) { const why = declareWhy(ME, o); out.push(dxActBtn('declare', 'war', 'Declare war', why, `−${costText(WAR.declareCost)}. −200 opinion with them, for good`, ' war')); }
  let html = `<div class="dx-acts">${out.join('')}</div>`;
  if (dxUI.bribe === o && N) {
    const ts = bribeTargets(o);
    html += `<div class="dx-bribe"><div class="dp-sec">Bribe the ${escHTML(PLAYERS[o].name)} (${DIPL.bribe.gold} gold) to attack…</div>` + (ts.length ? ts.map(y => `<button type="button" class="dx-tgt" data-dx="bribeon" data-y="${y}"><img alt="" src="${flagOf(y)}">${escHTML(PLAYERS[y].name)}<small>${provsOf(y).length} provinces${alliesOf(y).length ? ', allied with ' + alliesOf(y).map(x => x === ME ? 'you' : PLAYERS[x].name).join(', ') : ''}</small></button>`).join('') : '<small>No smaller nation they can attack.</small>') + '</div>';
  }
  return html;
}
function dxWarBlock(o, w) {
  if (!w) return '';
  if (w.proxy) {
    const e = exhaustionOf(w), mine = w.proxy === ME, P = parentWar(w), ally = P ? (P.b === w.proxy ? P.b : P.a) : 0, def = P ? P.b : 0;
    return `<div class="dx-war"><div class="dp-sec">Proxy War</div><p class="dp-p">${mine ? `You joined to defend your ally, the ${escHTML(PLAYERS[def] ? PLAYERS[def].name : '')}. You can’t win this war, only help them win: your provinces can’t be occupied, and your victories count for them.` : `They joined to defend their ally${def && PLAYERS[def] ? `, the ${escHTML(PLAYERS[def].name)}` : ''}. Their provinces can’t be occupied; they leave the war at 100 exhaustion.`}</p>
      <div class="dx-exhbar"><i style="width:${e}%"></i><span>${mine ? 'Your' : 'Their'} exhaustion ${e} / 100</span></div><small class="dx-note">+${DIPL.exhPer} for every 1% of the army’s value (${fmtPow(w.cost0 || 0)} gold at the start) lost; +${DIPL.exhDeclare} if a third nation declares war on ${mine ? 'you' : 'them'}. At 100: white peace.</small></div>`;
  }
  if (dipSel !== o) { const s = warscore(w, ME); return `<div class="dx-war"><div class="dp-ws">${wsBar(s)}<b class="dp-s ${s > 0 ? 'up' : s < 0 ? 'down' : ''}">${sgn(s)}</b></div><button type="button" class="dp-go" data-dx="neg">Peace terms <small>Open the war and its peace terms</small></button></div>`; }
  return `<div class="dx-war">` + origNationHTML(o, w).replace(/^<div class="dp-head">[\s\S]*?<\/div>/, '') + '</div>';
}
function dxLeaderCard(o) {
  const L = leaderOf(o); if (!L) return '';
  return `<div class="dx-leader"><i class="pt pt-${L.id} dx-pt"></i><b>${L.full}</b><small>${raceWord[L.race]} · ${L.sex === 'f' ? 'Woman' : 'Man'}</small><p>${escHTML(L.bonus)}</p><div class="dp-sec">${L.name} likes nations with</div><ul class="dx-likes">${leaderLikeText(L).map(([v, t]) => `<li><b class="${v.startsWith('+') ? 'up' : 'down'}">${v}</b> ${escHTML(t)}</li>`).join('')}</ul></div>`;
}
function dxFacts(o) {
  const N = NATIONS[o], I = diplState().intel[o] || {}, al = alliesOf(o).filter(x => x !== ME);
  const rows = [['Provinces', provsOf(o).length], ['Difficulty', DIFF_NAME[N.diff]], ['Military power', I.power !== undefined ? `${fmtPow(I.power)} <small>(spied ${fmtLeft(S.t - I.powerT)} ago)</small>` : '<small>Hidden: send spies</small>']];
  if (al.length) rows.push(['Allied with', al.map(x => escHTML(PLAYERS[x].name)).join(', ')]);
  const wars = enemiesOf(o).filter(x => x !== ME); if (wars.length) rows.push(['At war with', wars.map(x => escHTML(PLAYERS[x].name)).join(', ')]);
  return `<div class="dx-facts">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
}
function dxPanelHTML() {
  const D = diplState(), met = aiIds().filter(o => S.met.has(o)), unmet = aiIds().filter(o => !S.met.has(o) && aliveNation(o)).length, me = leaderOf(ME);
  const head = `<div class="dx-head"><img class="dp-flag" alt="" src="${flagOf(ME)}">${me ? `<i class="pt pt-${me.id} dx-mini" title="${me.full}"></i>` : ''}<span class="dp-ttl"><b>Diplomacy</b><small>${escHTML(PLAYERS[ME].name)}${me ? ' · ' + me.full : ''} · at war with ${enemiesOf(ME).length} of at most ${WAR.maxVsPlayer} nations · hover a nation to see its opinion of you</small></span><button type="button" class="dp-x" data-dp="close" aria-label="Close diplomacy">×</button></div>`;
  const secs = met.map(o => {
    const N = NATIONS[o], L = leaderOf(o), open = dxUI.open.has(o) && N.alive, r = dxRelation(o), w = warBetween(ME, o);
    const sum = `<button type="button" class="dx-sum" data-dx="tog" data-op="${o}" aria-expanded="${open}"><em class="dx-chev">${open ? '▾' : '▸'}</em><img class="dx-flag" alt="" src="${flagOf(o)}">${L ? `<i class="pt pt-${L.id} dx-mini"></i>` : ''}<span class="dx-name"><b>${escHTML(PLAYERS[o].name)}</b><small>${N.alive ? `${L ? L.full + ' · ' : ''}${raceWord[raceOf(o)]}s · ${provsOf(o).length} province${provsOf(o).length === 1 ? '' : 's'} · ${DIFF_NAME[N.diff]}` : 'Fallen'}</small></span><span class="dx-badges">${N.alive ? dxBadges(o) : ''}</span><em class="dx-rel ${r.cls}"${r.title ? ` title="${r.title}"` : ''}>${N.alive ? r.html : ''}</em></button>`;
    const det = open ? `<div class="dx-det"><div class="dx-left">${dxLeaderCard(o)}${dxFacts(o)}</div><div class="dx-right">${dxWarBlock(o, w)}${w && !w.proxy ? '' : dxActions(o)}${w && !w.proxy ? dxActions(o) : ''}</div></div>` : '';
    return `<div class="dx-nat ${r.cls}${open ? ' open' : ''}${N.alive ? '' : ' gone'}" data-sec="${o}">${sum}${det}</div>`;
  }).join('');
  const aiWars = S.wars.filter(w => !w.parent && w.a !== ME && w.b !== ME && (S.met.has(w.a) || S.met.has(w.b)));
  const warRows = aiWars.map(w => { const s = warscore(w, w.a), kids = S.wars.filter(c => c.parent === w.id && c.proxy && c.proxy !== ME); return `<div class="dp-aw">${dot(w.a)}${PLAYERS[w.a].name} <span>⚔</span> ${dot(w.b)}${PLAYERS[w.b].name}<b>${sgn(s)}</b>${kids.map(c => `<small> · ${PLAYERS[c.proxy].name} defends (exhaustion ${exhaustionOf(c)}%)</small>`).join('')}</div>`; }).join('');
  const allyRows = S.allies.filter(A => A.a !== ME && A.b !== ME && (S.met.has(A.a) || S.met.has(A.b))).map(A => `<div class="dp-aw">${dot(A.a)}${PLAYERS[A.a].name} <span>🤝</span> ${dot(A.b)}${PLAYERS[A.b].name}</div>`).join('');
  const pactRows = ['trade', 'crime'].flatMap(k => D[k].filter(P => P.a !== ME && P.b !== ME && (S.met.has(P.a) || S.met.has(P.b))).map(P => `<div class="dp-aw">${dot(P.a)}${PLAYERS[P.a].name} <span>${k === 'trade' ? '⚖' : '🎭'}</span> ${dot(P.b)}${PLAYERS[P.b].name}</div>`)).join('');
  return head + `<div class="dx-body">` + (secs || `<p class="dp-p">You haven’t met anyone yet. Explore with your ${UNIT_DEFS[WAYFINDER].name}s to find the other nations.</p>`) +
    (unmet ? `<p class="dp-note">${unmet} nation${unmet > 1 ? 's' : ''} you haven’t met yet.</p>` : '') +
    (warRows || allyRows || pactRows ? `<div class="dp-sec">Between other nations</div>${warRows}${allyRows}${pactRows}` : '') + '</div>';
}
dipListHTML = function () { return dxPanelHTML(); };
dipNationHTML = function () { return dxPanelHTML(); };
{ const od = openDip; openDip = function (o) {
  od(o);
  $q('#dipPanel').classList.add('dx');
  if (o) { dxUI.open.add(o); dxUI.scroll = o; dipKey = ''; }
}; }
// re-rendering keeps the scroll position; a nation just opened from elsewhere is scrolled into view
{ const rd = renderDip; renderDip = function (t) {
  const el = $q('#dipPanel'), top = el.scrollTop, k0 = dipKey;
  rd(t);
  if (dipKey !== k0 && dipOpen) {
    el.scrollTop = top;
    if (dxUI.scroll) { const s = el.querySelector(`[data-sec="${dxUI.scroll}"]`); if (s) s.scrollIntoView({ block: 'nearest' }); dxUI.scroll = 0; }
  }
}; }
{
  const el = $q('#dipPanel');
  el.classList.add('dx');
  // a click inside a nation's section works on that nation (the war buttons use dipSel)
  el.addEventListener('click', e => {
    const sec = e.target.closest('[data-sec]'); if (!sec) return;
    const o = +sec.dataset.sec; if (o !== dipSel && warBetween(ME, o) && !e.target.closest('[data-dx="tog"]')) selectDip(o);
  }, true);
  el.addEventListener('change', e => { const sec = e.target.closest('[data-sec]'); if (sec && +sec.dataset.sec !== dipSel) selectDip(+sec.dataset.sec); }, true);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-dx]'); if (!b) return;
    const sec = b.closest('[data-sec]'), o = sec ? +sec.dataset.sec : 0, act = b.dataset.dx;
    if (act === 'tog') { if (dxUI.open.has(o)) dxUI.open.delete(o); else { dxUI.open.add(o); if (warBetween(ME, o)) selectDip(o); } sfx('ui_click'); dipKey = ''; return; }
    if (act === 'neg') { selectDip(o); dipKey = ''; return; }
    if (b.getAttribute('aria-disabled') === 'true') { toast(b.title, true); return; }
    dxAct(act, o, b.dataset.y !== undefined ? +b.dataset.y : undefined);
    dipKey = '';
  });
  // the opinion tooltip
  const tip = document.createElement('div'); tip.id = 'dxTip'; tip.className = 'dx-tip chip'; tip.hidden = true; document.body.appendChild(tip);
  let tipO = 0;
  const showTip = (e) => {
    const h = e.target.closest && e.target.closest('[data-op]'); const o = h ? +h.dataset.op : 0;
    if (!o || !NATIONS[o] || !NATIONS[o].alive) { tip.hidden = true; tipO = 0; return; }
    const parts = opinionParts(o, ME), tot = parts.reduce((n, [, v]) => n + v, 0);
    tipO = o;
    tip.innerHTML = `<div class="dx-tip-h"><span>The ${escHTML(PLAYERS[o].name)}’s opinion of you</span>${sgnHTML(tot)}</div>` + (parts.length ? parts.map(([t, v]) => `<div class="dx-tip-r"><span>${escHTML(t)}</span>${sgnHTML(v)}</div>`).join('') : '<div class="dx-tip-r"><span>Nothing for or against you</span></div>') +
      `<div class="dx-tip-n">Alliance +${DIPL.ally} · Trade / Crime +${DIPL.trade} · Access above 0</div>`;
    tip.hidden = false;
    const W = tip.offsetWidth, H = tip.offsetHeight;
    tip.style.left = Math.min(innerWidth - W - 8, e.clientX + 16) + 'px'; tip.style.top = Math.min(innerHeight - H - 8, e.clientY + 14) + 'px';
  };
  el.addEventListener('pointermove', showTip);
  el.addEventListener('pointerleave', () => { tip.hidden = true; tipO = 0; });
  const cd = closeDip; closeDip = function () { cd(); tip.hidden = true; };
}
// warscore panels under the Diplomacy button: Proxy Wars show exhaustion
renderDipWars = function () {
  let box = $q('#dipWars');
  if (!box) { box = document.createElement('div'); box.id = 'dipWars'; box.className = 'dip-wars'; const chip = $q('#dip'); if (!chip) return; chip.after(box); box.addEventListener('pointerdown', e => e.stopPropagation()); box.addEventListener('click', e => { const r = e.target.closest('[data-war-foe]'); if (r) openDip(+r.dataset.warFoe); }); }
  const wars = S.started && !S.fallen ? warsOf(ME) : [];
  const key = wars.map(w => w.id + ':' + (w.proxy ? 'x' + exhaustionOf(w) : warscore(w, ME))).join(',');
  if (key === dipWarsKey) return; dipWarsKey = key;
  box.hidden = !wars.length;
  box.innerHTML = wars.map(w => { const o = foeOf(w, ME);
    if (w.proxy) { const e = exhaustionOf(w); return `<button type="button" class="dip-war chip" data-war-foe="${o}" title="Proxy War with the ${PLAYERS[o].name}: ${w.proxy === ME ? 'your' : 'their'} exhaustion. Click for Diplomacy"><span class="dp-wn">${dot(o)}${PLAYERS[o].name.split(' of ').pop()}<b class="dp-s">${e}%</b></span><span class="dx-exhbar sm"><i style="width:${e}%"></i></span></button>`; }
    const s = warscore(w, ME); return `<button type="button" class="dip-war chip" data-war-foe="${o}" title="War with the ${PLAYERS[o].name}: click for Diplomacy"><span class="dp-wn">${dot(o)}${PLAYERS[o].name.split(' of ').pop()}<b class="dp-s ${s > 0 ? 'up' : s < 0 ? 'down' : ''}">${sgn(s)}</b></span>${wsBar(s)}</button>`; }).join('');
};

// ---------- the New Game screen: pick your leader ----------
function renderLeaderPick() {
  const box = $q('#mLeader'); if (!box) return;
  const race = menuOpts.race, cur = leaderPick[race], list = leadersOf(race);
  box.innerHTML = `<button type="button" class="ldr-card${cur === 'random' ? ' on' : ''}" data-ldr="random" aria-pressed="${cur === 'random'}" title="A random ${raceWord[race]} leader"><i class="ldr-rnd">?</i><span>Random</span></button>` +
    list.map(L => `<button type="button" class="ldr-card${cur === L.id ? ' on' : ''}" data-ldr="${L.id}" aria-pressed="${cur === L.id}" title="${L.full}"><i class="pt pt-${L.id}"></i><span>${L.name}<small>${L.title}</small></span></button>`).join('');
  const L = LEADERS[cur], info = $q('#mLeaderInfo');
  if (info) info.innerHTML = L ? `<b>${L.full}</b> <small>(${L.sex === 'f' ? 'woman' : 'man'})</small> · ${escHTML(L.bonus)} ${escHTML(leaderStartText(L))}<br><span class="ldr-likes">Opinion of other nations: ${leaderLikeText(L).map(([v, t]) => `<b class="${v.startsWith('+') ? 'up' : 'down'}">${v}</b> ${escHTML(t)}`).join(' · ')}</span>`
    : `A random ${raceWord[race]} leader. Each leader has a start, a bonus and likes and dislikes that sway other nations’ opinion.`;
}
{
  const raceRow = $q('#mRace') && $q('#mRace').closest('.menu-row');
  if (raceRow) {
    const row = document.createElement('div'); row.className = 'menu-row ldr-row'; row.id = 'mLeaderRow';
    row.innerHTML = `<span class="lbl">Leader</span><div><div class="ldr-pick" id="mLeader" role="group" aria-label="Your leader"></div><div class="ldr-info" id="mLeaderInfo"></div></div>`;
    raceRow.after(row);
    row.addEventListener('click', e => { const b = e.target.closest('[data-ldr]'); if (!b) return; sfx('ui_click'); leaderPick[menuOpts.race] = b.dataset.ldr; try { localStorage.setItem('realm-leader', JSON.stringify(leaderPick)); } catch (er) {} renderLeaderPick(); });
  }
  const rs = renderSlots; renderSlots = function () { rs(); renderLeaderPick(); };
}

// ---------- the Country Breakdown shows your leader ----------
{ const rc = renderCountry; renderCountry = function () {
  rc();
  const el = $q('#countryWin'), L = leaderOf(ME); if (!countryOpen || !el || !L) return;
  const pt = el.querySelector('.cw-portrait'); if (pt && !pt.querySelector('.pt')) { pt.innerHTML = `<i class="pt pt-${L.id}"></i>`; pt.title = L.full; }
  const ld = el.querySelector('.cw-leader'); if (ld && !ld.dataset.v105) { ld.dataset.v105 = '1'; ld.innerHTML = `<b>${L.full}</b><small>${raceWord[L.race]} · ${L.sex === 'f' ? 'Woman' : 'Man'}</small><small class="cw-lb">${escHTML(L.bonus)}</small>`; }
}; }

// ---------- styles (portraits and icons are classes, so the Diplomacy window doesn't repeat the pictures) ----------
{
  const st = document.createElement('style');
  st.textContent = Object.keys(LEADERS).map(id => `.pt-${id}{background-image:url("${portraitOf(id)}")}`).join('\n') + '\n' + Object.keys(DX_ICON).map(k => `.dxi-${k}{background-image:url("${dxIconURL(k)}")}`).join('\n') + `
.pt { display: inline-block; background-size: cover; background-position: center top; border: 2px solid var(--ink); background-color: #3a3340; flex: none; }
#dipPanel.dx { left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; width: min(1000px, calc(100vw - 40px)); max-height: calc(100vh - 110px) !important; height: calc(100vh - 110px); z-index: 9; padding: 0; gap: 0; overflow-y: auto; font-size: 13px; }
#dipPanel.dx[hidden] { display: none; }
.dx-head { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--chip-hi); border-bottom: 2px solid var(--ink); }
.dx-head .dp-flag { width: 40px; height: 28px; }
.dx-head .dp-ttl b { font-size: 24px; }
.dx-body { padding: 10px 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.dx-mini { width: 26px; height: 39px; }
.dx-nat { border: 2px solid var(--ink); background: var(--chip-hi); box-shadow: 0 2px 0 var(--ink); }
.dx-nat.war { background: #fff1ec; } .dx-nat.ally { background: #eef8ea; } .dx-nat.gone { opacity: .55; }
.dx-sum { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px 10px; border: none; background: none; cursor: pointer; text-align: left; font: 700 12px var(--font-ui); color: var(--chip-text); }
.dx-sum:hover { background: rgba(255, 220, 120, .25); }
.dx-chev { font-style: normal; width: 12px; color: var(--muted); }
.dx-flag { width: 38px; height: 27px; flex: none; }
.dx-name { flex: 1; display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.dx-name b { font-family: var(--font-display); font-weight: 400; font-size: 18px; }
.dx-name small { color: var(--muted); font-size: 11.5px; }
.dx-badges { display: flex; gap: 3px; }
.dx-badge { width: 22px; height: 22px; background-size: contain; background-repeat: no-repeat; display: inline-block; }
.dx-rel { font-style: normal; font-weight: 800; font-size: 12px; border: 2px solid var(--ink); padding: 1px 8px; background: #fff; white-space: nowrap; }
.dx-rel.war { background: #ffd2c6; } .dx-rel.ally { background: #d6f2cc; } .dx-rel.truce { background: #e9f0ff; }
.dx-det { display: grid; grid-template-columns: 250px 1fr; gap: 12px; padding: 4px 12px 12px; border-top: 1px dashed rgba(29,26,34,.35); }
.dx-leader { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px; }
.dx-pt { width: 120px; height: 180px; box-shadow: 0 3px 0 var(--ink); margin: 6px 0 4px; }
.dx-leader b { font-family: var(--font-display); font-weight: 400; font-size: 17px; }
.dx-leader small { color: var(--muted); font-weight: 700; }
.dx-leader p { margin: 4px 0; font-size: 12px; }
.dx-likes { margin: 2px 0 0; padding: 0; list-style: none; text-align: left; font-size: 11.5px; }
.dx-likes li { margin: 2px 0; } .dx-likes b, .ldr-likes b { font-weight: 800; } .up { color: #2c8a3a; } .down { color: #c42f2f; }
.dx-facts { margin-top: 8px; display: flex; flex-direction: column; gap: 2px; width: 100%; font-size: 12px; }
.dx-facts div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dotted rgba(29,26,34,.25); }
.dx-facts span { color: var(--muted); font-weight: 700; } .dx-facts b { text-align: right; }
.dx-right { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.dx-acts { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px; }
.dx-act { display: flex; align-items: center; gap: 8px; text-align: left; padding: 5px 8px; border: 2px solid var(--ink); background: var(--sun); box-shadow: 0 2px 0 var(--ink); cursor: pointer; font: 700 12px var(--font-ui); color: var(--chip-text); min-height: 50px; }
.dx-act i { width: 34px; height: 34px; background-size: contain; background-repeat: no-repeat; flex: none; }
.dx-act span { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; flex: 1; }
.dx-act b { font-size: 13px; } .dx-act small { font-size: 11px; color: #4b3a2a; font-weight: 700; }
.dx-act.off { background: #ece6da; cursor: not-allowed; box-shadow: 0 1px 0 var(--ink); }
.dx-act.off i { filter: grayscale(.85); opacity: .6; } .dx-act.off small { color: var(--muted); }
.dx-act.war:not(.off) { background: #ff8a72; } .dx-act.on { background: #fff6d6; outline: 3px solid #e8a817; }
.dx-act:not(.off):active { transform: translateY(2px); box-shadow: 0 0 0 var(--ink); }
.dx-busy { background: #e9f0ff; cursor: default; }
.dx-busy em { display: block; height: 6px; border: 1px solid var(--ink); background: #fff; margin-top: 3px; } .dx-busy em s { display: block; height: 100%; background: #3a6fd8; }
.dx-bribe { border: 2px dashed var(--ink); padding: 6px 8px; display: flex; flex-direction: column; gap: 4px; }
.dx-tgt { display: flex; align-items: center; gap: 8px; padding: 3px 6px; border: 1px solid var(--ink); background: #fff; cursor: pointer; font: 700 12.5px var(--font-ui); text-align: left; }
.dx-tgt:hover { background: #fff1b8; } .dx-tgt img { width: 28px; height: 20px; } .dx-tgt small { color: var(--muted); margin-left: auto; }
.dx-war { display: flex; flex-direction: column; gap: 6px; border: 2px solid var(--ink); background: #fff8f4; padding: 8px; }
.dx-exhbar { position: relative; height: 18px; border: 2px solid var(--ink); background: #fff; }
.dx-exhbar i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #f4c44f, #c4472a); }
.dx-exhbar span { position: relative; display: block; text-align: center; font: 800 11.5px/14px var(--font-ui); }
.dx-exhbar.sm { height: 8px; width: 100%; border-width: 1px; }
.dx-note { color: var(--muted); font-size: 11px; }
.dx-exh { color: #c4472a; }
.dx-tip { position: fixed; z-index: 30; pointer-events: none; padding: 6px 9px; min-width: 240px; max-width: 360px; font: 700 12px var(--font-ui); color: var(--chip-text); }
.dx-tip[hidden] { display: none; }
.dx-tip-h { display: flex; justify-content: space-between; gap: 10px; align-items: center; border-bottom: 1px solid var(--ink); padding-bottom: 3px; margin-bottom: 3px; }
.dx-tip-h .dx-op { font-family: var(--font-display); font-weight: 400; font-size: 20px; }
.dx-tip-r { display: flex; justify-content: space-between; gap: 10px; }
.dx-tip-r span { color: #4b3a2a; } .dx-op.up { color: #2c8a3a; } .dx-op.down { color: #c42f2f; }
.dx-tip-n { margin-top: 4px; color: var(--muted); font-size: 10.5px; }
.dx-req { background: #f6f0ff; width: min(400px, calc(100vw - 32px)); z-index: 12; }
.dx-req[hidden] { display: none; }
.dx-rq-head { display: flex; align-items: center; gap: 8px; padding-right: 28px; }
.dx-rq-head .pt { width: 40px; height: 60px; }
.dx-rq-head span { display: flex; flex-direction: column; gap: 1px; }
.dx-rq-head img { width: 30px; height: 21px; }
.dx-rq-head b { font-family: var(--font-display); font-weight: 400; font-size: 17px; }
.dx-rq-head small { color: var(--muted); font-weight: 700; font-size: 11.5px; }
.dx-rq-time { position: relative; height: 14px; border: 1.5px solid var(--ink); background: #fff; margin-bottom: 8px; }
.dx-rq-time i { position: absolute; left: 0; top: 0; bottom: 0; background: #b89ae8; }
.dx-rq-time span { position: relative; display: block; text-align: center; font: 800 10.5px/11px var(--font-ui); }
.dx-min { font-size: 20px !important; }
.ldr-row { align-items: start !important; }
.ldr-pick { display: flex; flex-wrap: wrap; gap: 5px; }
.ldr-card { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 58px; padding: 3px 2px; border: 2px solid var(--ink); background: #faf1dc; cursor: pointer; font: 700 10.5px var(--font-ui); color: var(--chip-text); }
.ldr-card .pt, .ldr-rnd { width: 44px; height: 66px; }
.ldr-rnd { display: flex; align-items: center; justify-content: center; border: 2px solid var(--ink); background: #e9e0cc; font: 400 28px var(--font-display); font-style: normal; }
.ldr-card span { display: flex; flex-direction: column; line-height: 1.1; text-align: center; } .ldr-card small { font-size: 9px; color: var(--muted); }
.ldr-card.on { background: var(--sun); box-shadow: 0 0 0 3px #e8a817; }
.ldr-info { margin-top: 5px; font-size: 11.5px; line-height: 1.35; color: var(--chip-text); }
.ldr-info small { color: var(--muted); }
.cw-portrait .pt { width: 100%; height: 100%; min-height: 150px; border: none; }
.cw-lb { display: block; margin-top: 3px; font-size: 11px; line-height: 1.3; }
@media (max-width: 760px) { .dx-det { grid-template-columns: 1fr; } }`;
  document.head.appendChild(st);
}

// ---------- setup, loading and the frame step ----------
function retrofitWars() {
  const D = diplState();
  for (const w of S.wars) if (w.parent && !w.proxy) { w.proxy = w.b; w.cost0 = armyValue(w.b); w.lost0 = D.lost[w.b] || 0; w.exhB = 0; }
}
{ const sv = setupV96; setupV96 = function (loaded) {
  sv(loaded);
  diplState();
  dxUI.open.clear(); dxUI.bribe = 0; opDirty();
  if (!loaded) {
    assignLeaders(true);
    applyLeaderStart(ME); for (const o of aiIds()) applyLeaderStart(o);
    computeIncome(); territory = null; cacheDirty = true; S.sig = ''; computeFog(); rosterKey = ''; cmdKey = ''; capPanelKey = '';
    const L = leaderOf(ME); if (L) setTimeout(() => toast(`You lead as ${L.full}. ${L.bonus}`), 400);
  } else {
    const had = !!NATION.leader;
    assignLeaders(false); retrofitWars();
    for (const i of S.dipl.woodlines) woodlineSprites(i);
    refreshTreeBorders();
    if (!had) setTimeout(() => toast(`This save is from before leaders: your nation is now led by ${leaderOf(ME).full}. ${leaderOf(ME).bonus}`), 600);
  }
  countryKey = ''; dipKey = '';
}; }
{ const sv = stepV96; stepV96 = function (t, dt) {
  sv(t, dt);
  if (!S.started) { const el = $q('#dipReq'); if (el && !el.hidden) el.hidden = true; return; }
  try { stepDiplomacy(); } catch (e) { reportError(e, 'diplomacy'); }
  try { renderRequest(); } catch (e) { reportError(e, 'requests'); }
  if (!dipOpen) $q('#dxTip').hidden = true;
}; }
renderLeaderPick();

window.__v105 = { magRate: () => techRate('mag'), regen: o => manaRegen(o), aiMag: o => aiTechRate(NATIONS[o], 'mag'), LEADERS, leaderOf, opinion, opinionParts, dipRequest, answerRequest, dxAct, doBribe, aiBribe, aiCanFlirt, aiCanGift, exhaustionOf, hasAccess, applyLeaderStart, ensureWoodlines, portraitOf, newsAdd, finishSpy, DIPL, state: () => S.dipl, leaderPick, testWar: (a, b) => { const w = newWar(a, b, null); for (const j of alliesOf(b)) if (j !== a && !atWar(a, j)) newWar(a, j, w.id); return w; }, lostValue, crimeSlots, tradeCount, bribeWhy, bribeWhyFor, allyWhy: (a, b) => allyWhy(a, b), renderLeaderPick, pureDamage };
