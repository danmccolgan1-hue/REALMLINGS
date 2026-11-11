// ================= content: set pieces, Bandit Gangs, towns, and the effects of the newer research =================

// ---------- research banners: a blue column (Government), red crossed swords (Military), a purple seven-pointed star (Magic) ----------
// the same idea as the notification flags, but small and simple enough to sit next to a number
const RP_COL = { gov: '#3f72d9', mil: '#c8473d', mag: '#7a55c9' };
const RP_STAR = (() => { const pts = []; for (let k = 0; k < 14; k++) { const a = -Math.PI / 2 + k * Math.PI / 7, r = k % 2 ? 2.1 : 4.9; pts.push((10 + Math.cos(a) * r).toFixed(2) + ',' + (11.4 + Math.sin(a) * r).toFixed(2)); } return pts.join(' '); })();
function rpSVG(tree, off) {
  const col = off ? '#9aa0aa' : RP_COL[tree], ink = '#1d1a22', cream = off ? '#eceef2' : '#faf1dc', rod = off ? '#c9ced8' : '#ffc93c';
  const line = (d, w) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w + 1.3}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${cream}" stroke-width="${w}" stroke-linecap="round"/>`;
  const sym = tree === 'gov'
    ? `<g fill="${cream}" stroke="${ink}" stroke-width="0.8"><rect x="5.6" y="6.2" width="8.8" height="1.9"/><rect x="7.3" y="8.1" width="5.4" height="6.9"/><rect x="5.6" y="15" width="8.8" height="1.9"/></g>`
    : tree === 'mil'
      ? line('M6 5.6 L13.4 13.4', 1.5) + line('M14 5.6 L6.6 13.4', 1.5) + line('M11.3 14.4 L14.4 11.3', 1.3) + line('M8.7 14.4 L5.6 11.3', 1.3) + line('M13.6 13.6 L15 15', 1.4) + line('M6.4 13.6 L5 15', 1.4)
      : `<polygon points="${RP_STAR}" fill="${cream}" stroke="${ink}" stroke-width="0.8" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 24" width="20" height="24"><path d="M3 3.2 H17 V21.5 L10 18 L3 21.5 Z" fill="${col}" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/><rect x="1.4" y="1.4" width="17.2" height="2.4" fill="${rod}" stroke="${ink}" stroke-width="1"/>${sym}</svg>`;
}
const rpURL = {}, rpImg = {};
function rpIcon(tree, off) { const k = tree + (off ? '-off' : ''); return rpURL[k] || (rpURL[k] = 'data:image/svg+xml;base64,' + btoa(rpSVG(tree, off))); }
function rpImage(tree, off) { const k = tree + (off ? '-off' : ''); if (!rpImg[k]) { const im = new Image(); im.src = rpIcon(tree, off); rpImg[k] = im; } return rpImg[k]; }
const rpSpan = (tree, n, off, tip) => `<span class="rp${off ? ' off' : ''}" title="${tip || TECH_TREES[tree].name + ': +' + n + ' every 10 s'}"><img alt="${TECH_TREES[tree].name}" src="${rpIcon(tree, off)}">${n}</span>`;

// ---------- set pieces ----------
// one province in ten may hold a set piece (only on the terrain it belongs to); while you hold the province it adds research every payout
const SETPIECE_CHANCE = 0.1;
const SETPIECES = {
  battlesite: { name: 'Ancient Battle Site', tree: 'mil', pts: 1, terrain: ['desert'], need: 'a Forge', blurb: 'Rusted blades and old bones half-buried in the sand.' },
  library: { name: 'Forgotten Library', tree: 'gov', pts: 1, terrain: ['swamp', 'desert'], need: null, blurb: 'Shelves of crumbling scrolls, still legible to a patient scholar.' },
  rift: { name: 'Closed Interdimensional Rift', tree: 'mag', pts: 1, terrain: ['swamp'], need: 'a Mage Tower', blurb: 'A seam in the air where another world once broke through.' }
};
S.setpieces = new Map();
const setpieceAt = p => S.setpieces.get(p);
// can the nation draw on this kind of set piece yet? Libraries always; battle sites need a Forge (or its upgrades), rifts a Mage Tower (or its upgrades)
const setpieceOn = id => { const t = SETPIECES[id].tree; return t === 'gov' || levelsOf(t === 'mil' ? 'forge' : 'magetower').length > 0; };
const setpieceLive = p => { const sp = setpieceAt(p); return !!sp && owned(p) && !S.occ.has(p) && setpieceOn(sp); };
function setpieceWhy(p) {
  const sp = setpieceAt(p); if (!sp) return null;
  const D = SETPIECES[sp];
  if (!owned(p)) return 'claim this province to use it';
  if (S.occ.has(p)) return 'occupied by the enemy';
  if (!setpieceOn(sp)) return 'needs ' + D.need;
  return null;
}
function drawSetpieces(g) {
  const font = getComputedStyle(document.body).getPropertyValue('--font-display');
  for (const [p, id] of S.setpieces) {
    if (!S.explored.has(p) || !spKnown(p)) continue;   // hidden until a Wayfinder of yours surveys it (GPC07a, IC04)
    const D = SETPIECES[id], P = G.provs[p], live = setpieceLive(p), k = Math.max(1, 0.62 / cam.z);
    const w = 52 * k, h = 26 * k, x = P.ic[0] - w / 2, y = P.ic[1] + (S.surveyed.has(p) ? 150 : 118);
    g.save();
    if (!live) g.globalAlpha = 0.8;
    g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fillStyle = live ? 'rgba(243,228,196,0.96)' : 'rgba(222,224,228,0.94)'; g.fill(); g.lineWidth = 2.6 * k; g.strokeStyle = OL; g.stroke();
    const im = rpImage(D.tree, !live); if (im.complete) g.drawImage(im, x + 7 * k, y + 2.5 * k, 17 * k, 20.4 * k);
    g.font = (15 * k) + 'px ' + font; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = live ? OL : '#6d7280';
    g.fillText('+' + D.pts, x + 27 * k, y + h / 2 + 1 * k);
    g.restore();
  }
}
function setpieceTag(p) {
  const sp = setpieceAt(p); if (!sp || !S.explored.has(p) || !spKnown(p)) return '';
  const D = SETPIECES[sp], why = setpieceWhy(p);
  return `<span class="pm-tag sp${why ? ' off' : ''}" title="${D.name}: +${D.pts} ${TECH_TREES[D.tree].name} research every 10 s${why ? ' (' + why + ')' : ''}"><img alt="" src="${rpIcon(D.tree, !!why)}">${D.name} +${D.pts}</span>`;
}
function setpieceNote(p) {
  const sp = setpieceAt(p); if (!sp || !S.explored.has(p) || !spKnown(p)) return '';
  const D = SETPIECES[sp], why = setpieceWhy(p);
  return `<div class="pm-note"><b>${D.name}.</b> ${D.blurb} Gives +${D.pts} ${TECH_TREES[D.tree].name} research every 10 s while you hold it${D.need ? ' and own ' + D.need + ' (or its upgrades)' : ''}. ${why ? 'Inactive: ' + why + '.' : 'Active.'}</div>`;
}

// ---------- research in the province view ----------
function provResearchRow(p) {
  if (!owned(p) || !S.visible.has(p)) return '';
  const r = provResearch(p);
  return `<div class="pm-rp" title="Research points this province makes every 10 s"><small>Research</small>${TREE_KEYS.map(t => rpSpan(t, r[t], !S.tech[t].tier || !r[t], `${TECH_TREES[t].name}: +${r[t]} every 10 s from this province${S.tech[t].tier ? '' : ' (tree locked)'}`)).join('')}</div>`;
}
const provExtraKey = p => [spKnown(p) ? setpieceAt(p) || '' : '', setpieceWhy(p) || '', banditsSeenIn(p), owned(p) ? JSON.stringify(provResearch(p)) : '', TREE_KEYS.map(t => S.tech[t].tier).join('')].join(':');

// ---------- Bandit Gangs ----------
// one province in ten (never a capital) shelters a gang of two starting Footmen. They are hostile to everyone,
// never move and never catch a Wayfinder: a Wayfinder who stumbles on them scurries back the way he came, and can't go
// back in until they are beaten. Breaking a gang pays a 50 gold bounty.
const BANDIT = { chance: 0.1, troops: { 'd-sword': 2 }, bounty: 50 };
let banditCount = 0;
const GANG_NAMES = ['Mudfoot Gang', 'Red Caps', 'Black Hounds', 'Crooked Knives', 'Ditch Rats', 'Grey Hoods', 'Bog Wolves', 'Sand Vipers', 'Rusty Spurs', 'Night Crows', 'Thistle Band', 'One-Eyed Gang'];
const banditsIn = p => S.units.some(v => v.bandit && v.prov === p && troopCount(v) > 0);
const banditsSeenIn = p => S.units.some(v => v.bandit && v.seen && v.prov === p && troopCount(v) > 0);
function spawnBandit(p) {
  const n = banditCount++, a = mkUnit(S.nextId++, 'army', GANG_NAMES[n % GANG_NAMES.length] + (n >= GANG_NAMES.length ? ' ' + (Math.floor(n / GANG_NAMES.length) + 1) : ''), p, 0);
  a.owner = RAIDERS; a.troops = { ...BANDIT.troops }; a.bandit = true; a.seen = false; a.arrived = -100;
  a.slot = freeSlot(p, a); [a.x, a.y] = slotPos(p, a.slot); a.th = 0;
  S.units.push(a); return a;
}
// a Wayfinder steps into a province with a gang: he takes a look and runs straight back
function banditFlee(u) {
  const p = u.prov; if (!banditsIn(p) || u.lastProv === undefined) return false;
  for (const v of S.units) if (v.bandit && v.prov === p) v.seen = true;
  S.wf.add(p);
  const back = u.lastProv;
  u.path = []; u.moving = false; u.scouting = null; u.survey = null; u.surveyQueue = []; u.pendingSurvey = -1; u.autoWalk = null;
  u.fleeing = false;
  if (!order(u, back, true)) { u.prov = back; const [x, y] = slotPos(back, freeSlot(back, u)); u.x = x; u.y = y; }
  else u.fleeing = true;   // out of your hands until he is safely back
  S.selected = S.selected.filter(v => v !== u);
  fogDirty = true; provKey = ''; cmdKey = ''; rosterKey = '';
  sfx('wn_enemy');
  showBanditPop(p, back, u);
  return true;
}
// the "Bandits!" popup
function showBanditPop(p, back, u) {
  const el = $q('#banditPop'), mon = S.units.find(v => v.bandit && v.monster && v.prov === p), M = mon ? MONSTERS[mon.monster] : null;
  el.innerHTML = `<button type="button" class="pop-x" data-bp="ok" aria-label="Dismiss" title="Dismiss">×</button>` + (mon ? `<h2 id="banditPopT">${M.cry}<span>at ${provName(p)}</span></h2><p>${u.name} ran into ${M.found} and is scurrying back to ${provName(back)}, unharmed. Wayfinders can’t go back in until an army beats them (${lootText(M.loot)} for each one killed).</p><div class="dm-btns"><button type="button" data-bp="look">Show me</button><button type="button" data-bp="ok">OK</button></div>` : `<h2 id="banditPopT">Bandits!<span>at ${provName(p)}</span></h2><p>${u.name} ran into a Bandit Gang and is scurrying back to ${provName(back)}, unharmed. Wayfinders can’t go back in until an army beats the gang (${BANDIT.bounty} gold bounty).</p><div class="dm-btns"><button type="button" data-bp="look">Show me</button><button type="button" data-bp="ok">OK</button></div>`);
  el.dataset.prov = p; el.hidden = false;
  const ok = el.querySelector('.dm-btns [data-bp="ok"]'); if (ok) ok.focus({ preventScroll: true });
}
{
  const el = $q('#banditPop');
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape' || e.key === 'Enter') { el.hidden = true; } });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-bp]'); if (!b) return;
    if (b.dataset.bp === 'look') { const P = G.provs[+el.dataset.prov]; flyTo({ x: P.ic[0], y: P.ic[1], z: Math.max(cam.z, fitZ * 2.2 * WORLD_K) }); }
    el.hidden = true;
  });
}
// a fleeing Wayfinder gets a red "!" over his head
function drawFleeMark(g, u, t) {
  const x = u.x + 12, y = u.y - 36 + Math.sin(t * 10) * 1.5;
  g.beginPath(); g.arc(x, y, 8, 0, 7); g.fillStyle = '#ff6b5a'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
  g.font = '13px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('!', x, y + 1);
}
function banditSlain(a, b) {
  if (a.monster) { provKey = ''; return; }   // monsters pay for each one killed instead (monsterLoot)
  if (b.start[ME] !== undefined) { S.stock.gold += BANDIT.bounty; b.bounty = (b.bounty || 0) + BANDIT.bounty; S.pops.push({ prov: a.prov, t0: S.t, k: 'gold', n: BANDIT.bounty, dx: 0 }); }
  else { const o = Object.keys(b.start).map(Number).find(x => NATIONS[x]); if (o) NATIONS[o].stock.gold += BANDIT.bounty; }
  provKey = '';
}
function banditTag(p) {
  const list = S.units.filter(v => v.bandit && v.seen && v.prov === p && troopCount(v) > 0); if (!list.length) return '';
  const n = list.reduce((m, v) => m + troopCount(v), 0), mon = list.find(v => v.monster);
  if (mon) { const L = MONSTERS[mon.monster].loot; return `<span class="pm-tag bandit" title="Hostile to everyone. Wayfinders can’t enter until they are beaten. Each one killed gives ${lootText(L)}.">${troopText(mon)} · ${lootText(L)} each</span>`; }
  return `<span class="pm-tag bandit" title="Hostile to everyone. Wayfinders can’t enter until they are beaten. Beat them for a ${BANDIT.bounty} gold bounty.">Bandit Gang · ${n} soldier${n > 1 ? 's' : ''} · ${BANDIT.bounty} gold bounty</span>`;
}

// ---------- Moat ----------
const moatDelay = (b, by) => by !== b.owner && b.stage >= 1 && isNation(b.owner) && techOf(b.owner, 'moat') ? 10 : 0;

// ---------- Trade Routes ----------
// the capital earns +1 gold for every Marketplace it reaches along roads, through your own (unoccupied) provinces
let tradeMemo = { t: -1, n: 0, markets: 0 };
function tradeMarkets() {
  const cap = S.capital; if (cap < 0 || !owned(cap)) return 0;
  const adj = new Map(); for (const k of S.roads) { const [p, q] = k.split('_').map(Number); (adj.get(p) || adj.set(p, []).get(p)).push(q); (adj.get(q) || adj.set(q, []).get(q)).push(p); }
  const seen = new Set([cap]), queue = [cap]; let n = 0;
  while (queue.length) { const a = queue.shift(); for (const q of adj.get(a) || []) { if (seen.has(q) || !owned(q) || S.occ.has(q)) continue; seen.add(q); queue.push(q); n += extrasIn(q).filter(e => e.type === 'market').length; } }
  return n;
}
function tradeGold() {
  if (!hasTech('traderoutes')) return 0;
  if (tradeMemo.t !== S.t) { const m = tradeMarkets(); tradeMemo = { t: S.t, markets: m, n: Math.round(m * (1 + 0.05 * repLv('rep-trade'))) }; }
  return tradeMemo.n;
}
// Sawyer Guilds: +5% wood from every Lumber Mill per level, added up across the nation so it isn't lost to rounding
function lumberBonus() {
  const n = repLv('rep-lumber'); if (!n) return 0;
  let w = 0; const per = givesOf('lumber').wood || 0;
  for (const [p, list] of S.extras) if (owned(p) && !S.occ.has(p)) for (const e of list) if (e.type === 'lumber') w += per;
  return Math.round(w * 0.05 * n);
}

// ---------- repeatable research: soldier and Mage bonuses ----------
const REP_FAM = { sword: 'rep-sword', blunt: 'rep-blunt', pole: 'rep-pole', axe: 'rep-sword', stave: 'rep-stave', wand: 'rep-wand' };   // (v93: axes were missing, so the Swamplings' Axe Mastery did nothing)
let repVer = 0; const boostCache = new Map();
function boostStats(k, st) {
  const c = boostCache.get(k); if (c && c.st === st && c.v === repVer) return c.out;
  const out = { ...st }, famRep = REP_FAM[st.fam === 'magic' ? st.line : st.fam];
  if (famRep) out.atk = st.atk * (1 + 0.05 * repLv(famRep));
  if (st.armor > 0 && st.red > 0) { const sh = st.shieldArmor || 0, ar = st.armor - sh; out.red = Math.min(0.85, st.red * (ar / st.armor) * (1 + 0.05 * repLv('rep-armor')) + st.red * (sh / st.armor) * (1 + 0.05 * repLv('rep-shield'))); }
  if (st.cav) { out.hp = st.hp * (1 + 0.05 * repLv('rep-cavhp')); if (st.speed) out.speed = st.speed * (1 + 0.05 * repLv('rep-horsespeed')); }
  boostCache.set(k, { st, v: repVer, out }); return out;
}
// how fast one kind of troop walks: your cavalry get Swift Steeds
const troopSpeed = (k, o) => (UNIT_SPEED[k] || 1) * (o === ME && isCav(k) ? 1 + 0.05 * repLv('rep-horsespeed') : 1);
const mageCap = () => 1 + (hasTech('apprentice') ? 1 : 0) + repLv('rep-magecap');
function onRepDone(x) {
  repVer++; computeIncome(); clampStock(); capPanelKey = ''; rosterKey = ''; cmdKey = ''; armKey = ''; provKey = '';
  if (x.id === 'rep-magecap') toast(`Mage Academy: you can now have ${mageCap()} Mages.`);
  if (x.id === 'rep-masons') toast(`Masons’ Lodge: you can now have ${unitLimit(MASON)} Masons.`);
  if (x.id === 'rep-wayfinders') toast(`Wayfinders’ Guild: you can now have ${unitLimit(WAYFINDER)} Wayfinders.`);
}

// ---------- The Horde ----------
// 10 or more cavalry with no other units (not even a Mage): every rider has 1.3 times the health (GPC08)
const HORDE_MIN = 10, HORDE_HP = 1.3;
function hordeActive(a) {
  if (!a || a.kind !== 'army' || a.owner !== ME || !hasTech('horde')) return false;
  let cav = 0; for (const k in a.troops) { if (!a.troops[k]) continue; if (!isCav(k)) return false; cav += a.troops[k]; }
  return cav >= HORDE_MIN;
}
const hpOf = (a, k) => statsOf(k, a.owner).hp * (isCav(k) && hordeActive(a) ? HORDE_HP : 1);
function drawHordeMark(g, x, y, t) {
  const bob = Math.sin(t * 3) * 1.2; y += bob;
  g.save(); g.lineCap = 'round';
  g.beginPath(); g.arc(x, y, 10, 0, 7); g.fillStyle = '#fff6d6'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(x, y - 1, 5.6, Math.PI * 0.8, Math.PI * 2.2); g.lineWidth = 5.4; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#c99a2c'; g.stroke();
  g.font = '9px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 3; g.strokeStyle = OL; g.strokeText('×2', x + 11, y - 9); g.fillStyle = '#ffd34d'; g.fillText('×2', x + 11, y - 9);
  g.restore();
}

// ---------- towns: civilian houses and the folk who live in them ----------
// every province building brings 2 or 3 houses with it, and every house two civilians who stroll between the houses,
// the buildings and the settlement. Neither can be selected. Civilians aren't drawn (or moved) when zoomed far out.
const HOUSE_K = 0.4, CIV_SPEED = 24;   // houses are drawn well under the size of the province buildings
S.houses = new Map();   // "prov@slot" -> [{ x, y, v, born }]
S.civs = [];
let townSig = '', civZ = 0;
const HOUSE_LOOKS = [
  { w: 30, d: 22, h: 20, roof: '#c8473d', wall: null, chimney: true }, { w: 26, d: 20, h: 18, roof: '#3f72d9', wall: null, chimney: false },
  { w: 32, d: 22, h: 22, roof: '#d9b45a', wall: '#e9dcc0', chimney: false }, { w: 28, d: 22, h: 20, roof: '#7a5a43', wall: '#c9b48e', chimney: true },
  { w: 24, d: 20, h: 18, roof: '#d9b45a', wall: null, chimney: true }, { w: 30, d: 20, h: 20, roof: '#a33a33', wall: '#ece4d4', chimney: false }
];
const houseSprites = [];
const houseRoofed = new Map();
// Swampling homes: little mud huts with thatched cones (2 of every 3 thatched in the nation's color, like the Realmling roofs)
const SW_HUTS = [{ r: 11, h: 20, wall: '#8b6a45' }, { r: 9, h: 18, wall: '#a8794a' }, { r: 12, h: 21, wall: '#6e5134' }, { r: 10, h: 22, wall: '#8b6a45' }, { r: 9, h: 17, wall: '#a8794a' }, { r: 11, h: 19, wall: '#7a5a3a' }];
function houseSprite(v, roof, race) {
  const own = race === 'swamp' || race === 'wood';   // (these races' homes are always kept in the colored-roof cache)
  const key = (race === 'swamp' ? 'sw' : race === 'wood' ? 'wd' : '') + v + (roof || ''); if (own || roof ? houseRoofed.has(key) : houseSprites[v]) return own || roof ? houseRoofed.get(key) : houseSprites[v];
  const RES2 = 4, W = 100, H = 100, c = document.createElement('canvas'); c.width = W * RES2; c.height = H * RES2;
  const g = c.getContext('2d'), L = HOUSE_LOOKS[v], K = RealmBuild.KIT;
  g.scale(RES2, RES2); g.translate(50, 70); g.lineJoin = 'round'; g.lineCap = 'round';
  if (race === 'swamp') {
    const H2 = SW_HUTS[v % SW_HUTS.length];
    g.beginPath(); g.ellipse(0, 2, 30, 13, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(110,84,52,0.5)'; g.fill();
    SwampBuild.hut(g, 0, 0, H2.r, H2.h, 0, { wall: H2.wall, thatch: roof || '#9a8048', roof: H2.h * 1.15, smoke: false });
    if (v % 2) SwampBuild.shroom(g, 14, 10, 0.7, '#d8443a');
    houseRoofed.set(key, c); return c;
  }
  // Woodling homes: hollow trees with doors (2 of every 3 doors in the nation's color)
  if (race === 'wood') {
    g.translate(0, 4); g.scale(0.82, 0.82);
    WoodBuild.treeHouse(g, 0, 0, v, roof || null, 0);
    houseRoofed.set(key, c); return c;
  }
  g.beginPath(); g.ellipse(0, 2, 34, 15, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(176,138,86,0.55)'; g.fill();
  K.house(g, -L.w / 2, -L.d / 2, L.w, L.d, L.h, roof || L.roof, 0, { chimney: L.chimney, wall: L.wall || undefined, lit: true });
  if (roof) houseRoofed.set(key, c); else houseSprites[v] = c;
  return c;
}
// where the plots, the settlement and standing spots are, so houses stay out of their way
function housePlace(p, slot, n, taken) {
  const P = G.provs[p], c = P.ic, [bx, by] = bslotOf(p, slot), r = rngFrom(world.seed + ':houses:' + p + ':' + slot), out = [];
  const plots = []; for (let k = 0; k < BSLOTS.length; k++) plots.push(bslotOf(p, k));
  if (S.setpieces.has(p)) plots.push(spSpot(p));
  for (let i = 0; i < n; i++) {
    for (let tries = 0; tries < 60; tries++) {
      const a = r() * Math.PI * 2, rad = 52 + r() * 38, x = bx + Math.cos(a) * rad, y = by + Math.sin(a) * rad * 0.75;
      if (!inPoly(c[0] + x, c[1] + y, P.inner) || distToEdges(c[0] + x, c[1] + y, P.inner) < 30) continue;
      if ((x / 150) ** 2 + (y / 92) ** 2 < 1) continue;   // the settlement (a capital is wide)
      if (plots.some(([qx, qy]) => Math.hypot(qx - x, (qy - y) * 1.25) < 60)) continue;
      if (SLOTS.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 34)) continue;
      if (Math.abs(x) < 120 && y > 80 && y < 185) continue;   // the resource and set piece badges
      if (taken.concat(out).some(h => Math.hypot(h.x - x, (h.y - y) * 1.3) < 32)) continue;
      out.push({ x: Math.round(x), y: Math.round(y), v: Math.floor(r() * HOUSE_LOOKS.length) }); break;
    }
  }
  return out;
}
const CIV_TUNIC = ['#c8473d', '#3f72d9', '#4b9b4f', '#d9b45a', '#8a5aa8', '#e08a3c', '#6d8fa8', '#b3646f'];
const CIV_SKIN = ['#f2c9a0', '#e0ad82', '#c68a5e', '#9c6a45', '#f5d6b8'];
// Swampling townsfolk come in forest green, green, light green, teal and brown (skin and rags in the same shade)
const SW_CIV = ['#3f6b35', '#5f9a3e', '#93c463', '#3f8a80', '#8a6a44'];
// Woodling townsfolk: tall and slender, olive-to-purple skin, long hair, long pointed ears and purple eyes
const WD_CIV_TUNIC = ['#c8c6c0', '#6f7f4a', '#3f8f86', '#8a63b8', '#d9cfa8', '#4f6f3c', '#a07ab8'];
const WD_CIV_HAIR = ['#e6e2ef', '#2d2838', '#8a4a3a', '#cfd8e8', '#4a3560', '#d9b85a'];
function syncTowns() {
  const sig = [...S.extras].map(([p, l]) => p + ':' + l.map(e => e.type + e.slot).join(',')).join('|');
  if (sig === townSig) return; townSig = sig;
  const live = new Set();
  for (const [p, list] of S.extras) for (const e of list) {
    const key = p + '@' + e.slot; live.add(key);
    if (S.houses.has(key) && S.houses.get(key).type === e.type) continue;
    const taken = []; for (const [k2, hs] of S.houses) if (+k2.split('@')[0] === p && k2 !== key) taken.push(...hs);
    const r = rngFrom(world.seed + ':housecount:' + key), hs = housePlace(p, e.slot, 2 + (r() < 0.5 ? 1 : 0), taken);
    hs.type = e.type;
    let ord = 0; for (const [k2, hs2] of S.houses) if (+k2.split('@')[0] === p && k2 !== key) ord += hs2.length;
    for (const h of hs) { h.born = e.born ?? S.t; h.prov = p; h.n = ord++; }
    S.houses.set(key, hs);
    S.civs = S.civs.filter(cv => cv.key !== key);
    for (const h of hs) for (let j = 0; j < 2; j++) S.civs.push({ key, prov: p, home: h, x: G.provs[p].ic[0] + h.x, y: G.provs[p].ic[1] + h.y + 6, tx: null, ty: null, wait: 1 + r() * 4, ph: r() * 6, col: CIV_TUNIC[Math.floor(r() * CIV_TUNIC.length)], skin: CIV_SKIN[Math.floor(r() * CIV_SKIN.length)], hat: r() < 0.45 ? (r() < 0.5 ? 'straw' : 'hood') : null, sack: r() < 0.3, born: h.born + 0.6 + j * 0.4, moving: false });
  }
  for (const k of [...S.houses.keys()]) if (!live.has(k)) { S.houses.delete(k); S.civs = S.civs.filter(cv => cv.key !== k); }
}
// a civilian's next errand: a house, one of the province's buildings, or the settlement itself
function civTarget(cv) {
  const p = cv.prov, c = G.provs[p].ic, r = Math.random();
  let x, y;
  if (r < 0.35) { const hs = []; for (const [k, list] of S.houses) if (+k.split('@')[0] === p) hs.push(...list); const h = hs[Math.floor(Math.random() * hs.length)] || cv.home; x = c[0] + h.x; y = c[1] + h.y + 8; }
  else if (r < 0.7 && extrasIn(p).length) { const e = extrasIn(p)[Math.floor(Math.random() * extrasIn(p).length)], [ox, oy] = bslotOf(p, e.slot); x = c[0] + ox + (Math.random() - 0.5) * 30; y = c[1] + oy + 14; }
  else { const st = S.buildings.get(p) ? S.buildings.get(p).stage : 0, rx = st === 2 ? 80 : 40; x = c[0] + (Math.random() - 0.5) * rx * 2; y = c[1] + (st === 2 ? 64 : 36) + Math.random() * 14; }
  [cv.tx, cv.ty] = clampInto(p, x, y);
}
const civsShown = () => cam.z >= civZ;
const civDangerMemo = { t: -1, m: new Map() };
function civDanger(p) {
  if (civDangerMemo.t !== S.t) { civDangerMemo.t = S.t; civDangerMemo.m.clear(); }
  let d = civDangerMemo.m.get(p); if (d !== undefined) return d;
  const owner = nationOf(p);
  d = S.occ.has(p) || S.occProg.has(p) || S.battles.some(b => b.prov === p) || (!!owner && S.units.some(v => v.kind === 'army' && v.prov === p && troopCount(v) > 0 && hostile(v.owner, owner)));
  civDangerMemo.m.set(p, d); return d;
}
function stepTowns(dt) {
  syncTowns();
  if (!dt) return;
  const shown = civsShown();
  for (const cv of S.civs) {
    if (S.t < cv.born) continue;
    if (civDanger(cv.prov)) {
      if (cv.inside) continue;
      const c = G.provs[cv.prov].ic, hx = c[0] + cv.home.x, hy = c[1] + cv.home.y + 6;
      if (!shown || !S.visible.has(cv.prov)) { cv.inside = true; cv.x = hx; cv.y = hy; continue; }
      const dx = hx - cv.x, dy = hy - cv.y, d = Math.hypot(dx, dy), step = CIV_SPEED * 3 * dt;   // running
      if (d <= step) { cv.x = hx; cv.y = hy; cv.inside = true; cv.moving = false; cv.tx = null; }
      else { cv.x += dx / d * step; cv.y += dy / d * step; cv.moving = true; cv.running = true; cv.dir = dx < 0 ? -1 : 1; }
      continue;
    }
    if (cv.inside) { cv.inside = false; cv.running = false; cv.tx = null; cv.wait = 0.4 + Math.random() * 3; }   // the danger is gone: out they come
    cv.running = false;
    if (!shown || !S.visible.has(cv.prov)) continue;
    if (cv.wait > 0) { cv.wait -= dt; cv.moving = false; if (cv.wait <= 0) civTarget(cv); continue; }
    if (cv.tx === null) civTarget(cv);
    const dx = cv.tx - cv.x, dy = cv.ty - cv.y, d = Math.hypot(dx, dy), step = CIV_SPEED * dt;
    if (d <= step) { cv.x = cv.tx; cv.y = cv.ty; cv.tx = null; cv.wait = 1.5 + Math.random() * 4.5; cv.moving = false; }
    else { cv.x += dx / d * step; cv.y += dy / d * step; cv.moving = true; cv.dir = dx < 0 ? -1 : 1; }
  }
}
function drawHouse(g, p, h, t) {
  const c = G.provs[p].ic, x = c[0] + h.x, y = c[1] + h.y, age = t - h.born;
  const pop = age < 1.2 ? Math.max(0.01, 1 - Math.exp(-age * 7) * Math.cos(age * 15)) : 1, k = HOUSE_K * pop;
  const b = S.buildings.get(p), own = b && PLAYERS[b.owner] ? PLAYERS[b.owner].color : null;
  g.drawImage(houseSprite(h.v, own && (h.n || 0) % 3 !== 2 ? own : null, b ? raceOf(b.owner) : 'realm'), x - 50 * k, y - 70 * k, 100 * k, 100 * k);
}
function drawCiv(g, cv, t) {
  const age = t - cv.born; if (age < 0) return;
  const s = age < 0.8 ? Math.max(0.01, 1 - Math.exp(-age * 8) * Math.cos(age * 14)) : 1;
  const ph = t * (cv.running ? 18 : 9) + cv.ph, sw = cv.moving ? Math.sin(ph) * 2.2 : 0, bob = cv.moving ? -Math.abs(Math.sin(ph)) * 1.1 : 0;
  g.save(); g.translate(cv.x, cv.y); g.scale(s * (cv.dir || 1), s); g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.ellipse(0, 0.6, 4.6, 1.8, 0, 0, 7); g.fillStyle = 'rgba(29,26,34,0.22)'; g.fill();
  const wdf = raceOf(nationOf(cv.prov)) === 'wood'; if (wdf) g.scale(0.88, 1.22);   // Woodlings: tall and slender
  for (const [lx, d] of [[-1.4, sw], [1.4, -sw]]) { g.beginPath(); g.moveTo(lx, -4.6 + bob); g.lineTo(lx + d, 0); g.lineWidth = 2.8; g.strokeStyle = OL; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = '#5b4a3a'; g.stroke(); }
  const swf = isSw(nationOf(cv.prov)), swc = swf ? SW_CIV[Math.floor(cv.ph * 7) % SW_CIV.length] : null, tunic = swf ? RealmIso.shadeOf ? RealmIso.shadeOf(swc, 0.72) : swc : cv.col, skin = swf ? swc : cv.skin;
  if (wdf) { drawWdCiv(g, cv, bob); g.restore(); return; }
  if (swf) g.translate(0.8, 1.2);   // a little hunched
  g.beginPath(); g.ellipse(0, -7.6 + bob, 3.5, 4.2, 0, 0, 7); g.fillStyle = tunic; g.fill(); g.lineWidth = 1.3; g.strokeStyle = OL; g.stroke();
  if (cv.sack) { g.beginPath(); g.arc(3.6, -6.4 + bob, 2.2, 0, 7); g.fillStyle = '#c99560'; g.fill(); g.lineWidth = 1.1; g.stroke(); }
  if (swf) { g.beginPath(); g.moveTo(-1.6, -14 + bob); g.lineTo(-5, -15.6 + bob); g.lineTo(-1.8, -12.4 + bob); g.moveTo(1.6, -14 + bob); g.lineTo(5, -15.6 + bob); g.lineTo(1.8, -12.4 + bob); g.fillStyle = skin; g.fill(); g.lineWidth = 0.9; g.strokeStyle = OL; g.stroke(); }   // pointed ears
  g.beginPath(); g.arc(0, -13.4 + bob, 2.6, 0, 7); g.fillStyle = skin; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke();
  if (swf) { g.fillStyle = '#ff3b2f'; g.fillRect(0.6, -14.2 + bob, 1, 1); g.restore(); return; }   // a red eye glint; no hats
  if (cv.hat === 'straw') { g.beginPath(); g.ellipse(0, -15 + bob, 4.2, 1.3, 0, 0, 7); g.fillStyle = '#e8cf7a'; g.fill(); g.lineWidth = 1; g.stroke(); g.beginPath(); g.ellipse(0, -16 + bob, 2, 1.4, 0, Math.PI, 0); g.fill(); g.stroke(); }
  else if (cv.hat === 'hood') { g.beginPath(); g.arc(0, -13.8 + bob, 2.9, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = 2; g.strokeStyle = cv.col; g.stroke(); }
  g.restore();
}
function drawWdCiv(g, cv, bob) {
  const k = Math.floor(cv.ph * 7), skin = RealmIso.WD_SKINS[k % RealmIso.WD_SKINS.length], tunic = WD_CIV_TUNIC[Math.floor(cv.ph * 11) % WD_CIV_TUNIC.length], hair = WD_CIV_HAIR[Math.floor(cv.ph * 13) % WD_CIV_HAIR.length];
  g.beginPath(); g.moveTo(-3.6, -14.4 + bob); g.quadraticCurveTo(-4.2, -9 + bob, -2.6, -7.4 + bob); g.lineTo(2.6, -7.4 + bob); g.quadraticCurveTo(4.2, -9 + bob, 3.6, -14.4 + bob); g.closePath(); g.fillStyle = hair; g.fill(); g.lineWidth = 1; g.strokeStyle = OL; g.stroke();   // long hair behind
  g.beginPath(); g.ellipse(0, -7.4 + bob, 3, 4.2, 0, 0, 7); g.fillStyle = tunic; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke();
  if (cv.sack) { g.beginPath(); g.arc(3.2, -6.4 + bob, 1.9, 0, 7); g.fillStyle = '#c99560'; g.fill(); g.lineWidth = 1; g.stroke(); }
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 1.8, -12.6 + bob); g.lineTo(s * 4.4, -17.4 + bob); g.lineTo(s * 2.2, -14.6 + bob); g.closePath(); g.fillStyle = skin; g.fill(); g.lineWidth = 0.8; g.strokeStyle = OL; g.stroke(); }   // long ears, pointing up
  g.beginPath(); g.moveTo(-2.4, -14.4 + bob); g.arc(0, -14.4 + bob, 2.4, Math.PI, 0); g.quadraticCurveTo(2.2, -11.6 + bob, 0, -10.6 + bob); g.quadraticCurveTo(-2.2, -11.6 + bob, -2.4, -14.4 + bob); g.closePath(); g.fillStyle = skin; g.fill(); g.lineWidth = 1.1; g.strokeStyle = OL; g.stroke();   // a long face, pointed chin
  g.beginPath(); g.arc(0, -14.6 + bob, 2.5, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = 1.4; g.strokeStyle = hair; g.stroke();
  g.fillStyle = '#b26cff'; g.fillRect(0.5, -13.8 + bob, 1, 0.9);   // a purple eye glint
}
// houses and civilians join the depth-sorted list of things drawn on the map
function townItems(g, t, items) {
  const vx0 = cam.x - cw / 2 / cam.z - 80, vx1 = cam.x + cw / 2 / cam.z + 80, vy0 = cam.y - ch / 2 / cam.z - 80, vy1 = cam.y + ch / 2 / cam.z + 80;
  const inView = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
  for (const [key, hs] of S.houses) {
    const p = hs[0] ? hs[0].prov : -1; if (p < 0 || !S.visible.has(p)) continue;
    const c = G.provs[p].ic;
    for (const h of hs) if (inView(c[0] + h.x, c[1] + h.y)) items.push({ y: c[1] + h.y, f: () => drawHouse(g, p, h, t) });
  }
  if (!civsShown()) return;
  for (const cv of S.civs) if (!cv.inside && S.visible.has(cv.prov) && t >= cv.born && inView(cv.x, cv.y)) items.push({ y: cv.y, f: () => drawCiv(g, cv, t) });
}

// ---------- every frame, and at the start of a game ----------
function stepContent(t, dt) {
  for (const v of S.units) if (v.bandit && !v.seen && S.visible.has(v.prov)) { v.seen = true; provKey = ''; }
  stepTowns(dt);
}
function setupContent() {
  // set pieces
  S.setpieces.clear();
  const r = rngFrom(world.seed + ':setpieces');
  world.provinces.forEach((P, i) => {
    const roll = r(), pick = r(), ok = Object.keys(SETPIECES).filter(k => SETPIECES[k].terrain.includes(P.terrain));
    if (roll < SETPIECE_CHANCE && ok.length && !(S.buildings.get(i) && S.buildings.get(i).stage === 2)) S.setpieces.set(i, ok[Math.floor(pick * ok.length)]);
  });
  // Bandit Gangs and Roaming Monsters are placed by setupV78 (spawnLairs, SMA03e), after the Intact Ruins
  banditCount = 0;
  // civilians disappear halfway between the F3 and F4 zoom levels (measured around the capital)
  const cap = S.capital, near = fitView(boxOf([cap, ...allNbr[cap]]), 0.95);
  civZ = (clampZ(near.z) + clampZ(near.z / 2)) / 2;
  S.houses.clear(); S.civs = []; townSig = '';
}
window.__realm4 = { S, SETPIECES, setpieceAt, setpieceOn, provResearch, spawnBandit, banditsIn, banditsSeenIn, tradeGold, tradeMarkets, hordeActive, mageCap, statsOf, boostStats, troopSpeed, unitSpeed, techsLeft, repOpen, drawOptions, techOptions, syncTowns, civZ: () => civZ, finishTech, pickTech, lumberBonus, TECH_BY_ID, limitWhy, unitTotal, moatDelay, hpOf, MAGE, computeIncome, techCost, canEnter, setpieceWhy, repLv, flyTo, clampZ, provMenuKey: () => provKey, techRate, rpIcon };
