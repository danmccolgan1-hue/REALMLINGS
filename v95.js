
// ================= v95: unique provinces, bosses, artifacts, Warlock skulls, cooldown bars =================
// The generator (gen.js placeUniques) marks three provinces on every normal island in world.unique:
//   Death Mountain (death): walled in by mountains, nobody can enter; its neighbors get +5 gold; a dragon guards one of them.
//   Desert Oasis (oasis): ringed by palm trees, one way in, guarded (oasisGuard); +10 gold, wood and food.
//   Heart of the Forest (heart): ringed by trees, one way in, guarded (heartGuard); +6 gold, +20 wood, +6 food.
// Bosses are monster armies (owner RAIDERS, bandit: true) with a single huge troop. Beating one gives its artifact.

// ---------- the unique provinces ----------
function uq() { return (world && world.mode !== 'practice' && world.unique) || null; }
function uqKind(p) { const U = uq(); if (!U) return null; return p === U.death ? 'death' : p === U.oasis ? 'oasis' : p === U.heart ? 'heart' : null; }
function isDeathMtn(p) { const U = uq(); return !!U && U.death >= 0 && p === U.death; }
function uqGuards() { const U = uq(); return U ? [U.deathGuard, U.oasisGuard, U.heartGuard].filter(x => x >= 0) : []; }
// provinces nothing else may be placed on: the three unique provinces, the bosses' provinces and their neighbors
function uqSkip() {
  const U = uq(), out = new Set(); if (!U) return out;
  for (const k of ['death', 'oasis', 'heart']) if (U[k] >= 0) out.add(U[k]);
  for (const g of uqGuards()) { out.add(g); for (const q of world.provinces[g].nbr) out.add(q); }
  return out;
}
// no capital in or next to a boss, or on a unique province
function uniqueBan(i) { return uqSkip().has(i); }
const UQ_NAME = { death: 'Death Mountain', oasis: 'Desert Oasis', heart: 'Heart of the Forest' };

// base resources: the Oasis and the Heart have their own; every province around Death Mountain gets +5 gold
{
  const _roll = rollYields;
  rollYields = function () {
    _roll();
    const U = uq(); if (!U) return;
    const set = (p, y) => { if (p >= 0 && yields[p]) { Object.assign(yields[p], y); yields[p].bonus = { gold: 0, wood: 0, food: 0 }; yields[p].deposit = false; } };
    set(U.oasis, { gold: 10, wood: 10, food: 10 });
    set(U.heart, { gold: 6, wood: 20, food: 6 });
    if (U.death >= 0) { set(U.death, { gold: 0, wood: 0, food: 0 }); for (const q of world.provinces[U.death].nbr) if (yields[q]) { yields[q].gold += 5; yields[q].bonus.gold += 5; } }
  };
}
// Death Mountain is seen from any province next to it; the Lidless Eye shows every army and the province it stands in
{
  const _ts = towerSight;
  towerSight = function (vis) {
    _ts(vis);
    const U = uq();
    if (U && U.death >= 0 && world.provinces[U.death].nbr.some(q => vis.has(q))) { vis.add(U.death); S.known.add(U.death); }
    if (hasArt(ME, 'eye')) for (const u of S.units) if (u.kind === 'army' && troopCount(u) > 0) vis.add(u.prov);
  };
}

// ---------- bosses ----------
// power is what the army list shows; a fight against a boss is decided by power (see bossDamage)
const BOSSES = {
  reddragon:    { site: 'death', name: 'the Red Dragon', short: 'Red Dragon', power: 30000, art: 'redskull', speed: 0.45 },
  bluedragon:   { site: 'death', name: 'the Blue Dragon', short: 'Blue Dragon', power: 40000, art: 'blueskull', speed: 0.45 },
  golddragon:   { site: 'death', name: 'the Gold Dragon', short: 'Gold Dragon', power: 50000, art: 'goldskull', speed: 0.45 },
  skeletonking: { site: 'oasis', name: 'the Skeleton King', short: 'Skeleton King', power: 25000, art: 'crown', speed: 0.5 },
  inferno:      { site: 'oasis', name: 'the Walking Inferno', short: 'Walking Inferno', power: 30000, art: 'flame', speed: 0.5 },
  scarabs:      { site: 'oasis', name: 'the Scarab Army', short: 'Scarab Army', power: 35000, art: 'eye', speed: 0.55 },
  sherman:      { site: 'heart', name: 'General Sherman', short: 'General Sherman', power: 20000, art: 'stump', speed: 0.35, sub: 'the Tallest Redwood Ent' },
  ursa:         { site: 'heart', name: 'Ursa Major', short: 'Ursa Major', power: 25000, art: 'grips', speed: 0.55 },
  serpent:      { site: 'heart', name: 'the Winged Serpent', short: 'Winged Serpent', power: 30000, art: 'slippers', speed: 0.6 }
};
const BOSS_SITES = { death: ['reddragon', 'bluedragon', 'golddragon'], oasis: ['skeletonking', 'inferno', 'scarabs'], heart: ['sherman', 'ursa', 'serpent'] };
const BOSS_ATK = 30;   // a boss troop's attack; its health makes up the rest of its power (power = atk × hp / 3)
for (const [id, B] of Object.entries(BOSSES)) {
  const k = 'b-' + id, hp = Math.round(B.power * 3 / BOSS_ATK);
  DSTATS[k] = { cav: false, rough: true, fam: 'boss', armor: 0, shieldArmor: 0, red: 0, parry: 0, atk: BOSS_ATK, hp, speed: B.speed, cost: {}, upkeep: {}, blurb: '' };
  UNIT_DEFS[k] = { name: B.short, cost: {}, upkeep: {}, blurb: `A boss: power ${B.power}. Beating it gives ${ARTIFACTS_TXT(B.art)}.` };
  UNIT_SPEED[k] = B.speed;
  MONSTERS['boss-' + id] = { troop: k, sizes: [1], terrain: null, loot: {}, cry: B.short + '!', found: B.name, names: [B.short] };
}
function ARTIFACTS_TXT(a) { return ({ redskull: 'the Red Dragon Skull', blueskull: 'the Blue Dragon Skull', goldskull: 'the Gold Dragon Skull', crown: 'the King’s Crown', flame: 'the Essence of Flame', eye: 'the Lidless Eye', stump: 'the Enchanted Stump', grips: 'the Grips of the Beast', slippers: 'the Winged Slippers' })[a]; }
const bossOf = a => a && a.boss ? BOSSES[a.boss] : null;
const bossIn = p => S.units.find(v => v.boss && v.prov === p && troopCount(v) > 0) || null;
// AI nations only walk into a boss's province on purpose (to fight it), never through it
function bossBlock(u, q, tgt) { return isDeathMtn(q) || (!!NATIONS[u.owner] && q !== tgt && !!bossIn(q)); }
function spawnBosses() {
  const U = uq(); if (!U) return;
  for (const site of ['death', 'oasis', 'heart']) {
    const g = U[site === 'death' ? 'deathGuard' : site + 'Guard']; if (g < 0 || U[site] < 0) continue;
    // nothing else shares the boss's province or the unique province
    for (const p of [g, U[site]]) { S.units = S.units.filter(v => !(v.bandit && v.prov === p)); S.setpieces && S.setpieces.delete(p); S.finds && S.finds.delete(p); }
    if (S.travelers) S.travelers = S.travelers.filter(T => T.prov !== g && T.prov !== U[site]);
    const r = rngFrom(world.seed + ':boss:' + site), id = BOSS_SITES[site][Math.floor(r() * 3)], B = BOSSES[id];
    const a = spawnMonster(g, 'boss-' + id, 1);
    a.name = B.short + (B.sub ? ', ' + B.sub : ''); a.boss = id; a.guards = U[site];
  }
}
// a moving army that steps into a boss's province is stopped there and has to fight
function stepBossHalt() {
  for (const a of S.units) {
    if (a.kind !== 'army' || !a.moving || a.owner === RAIDERS || a.retreating || a.exiting || a.retreatHome || a.battle || a.flyT) continue;
    const B = bossIn(a.prov); if (!B) continue;
    a.path = []; a.moving = false; a.surveyQueue = []; a.arrived = S.t;
    if (a.owner === ME && !a.bossWarned) { a.bossWarned = true; toast(`${a.name} is stopped by ${BOSSES[B.boss].name} at ${provName(a.prov)}!`, true); }
  }
}
// boss fights are decided by power: each round both sides lose power in proportion to the other side's power, so the
// stronger side wins (an army 10–20% stronger usually, 50% stronger almost always). Each battle the boss rolls a fortune
// (about ±10%) that sets how hard it hits.
const BOSS_K = 0.045;
function bossFortune(b) {
  if (b.fortune === undefined) { let s = 0; for (let i = 0; i < 6; i++) s += Math.random(); b.fortune = Math.max(0.75, Math.min(1.25, 1 + (s - 3) * 0.141)); }
  return b.fortune;
}
{
  const _apply = applyDamage;
  applyDamage = function (b, armies, dmg, t, pierce = 0) {
    const boss = S.units.find(v => v.boss && v.battle === b && troopCount(v) > 0);
    if (!boss) return _apply(b, armies, dmg, t, pierce);
    const foes = S.units.filter(v => v.kind === 'army' && v.battle === b && !v.retreating && troopCount(v) > 0 && !v.bandit);
    const noise = 0.85 + Math.random() * 0.3, k = Object.keys(boss.troops)[0], H = DSTATS[k].hp, R0 = H * DSTATS[k].atk / 30;
    if (armies.includes(boss)) {
      // the army hits the boss: its raw strength comes off the boss's
      const dR = BOSS_K * rawStrength(foes) * noise;
      return _apply(b, armies, dR / R0 * H, t, 0);
    }
    // the boss hits the army: its remaining strength (times its fortune) comes off the army's
    const f = bossFortune(b), Rb = R0 * Math.max(0, 1 - (boss.wounds || 0) / H) * f * f;
    const raw = rawStrength(armies); if (raw <= 0) return;
    let hp = 0; for (const a of armies) for (const kk in a.troops) hp += a.troops[kk] * hpOf(a, kk);
    const mix = sideMix(armies), keep = Math.max(0.05, (1 - mix.red) * (1 - mix.parry));
    return _apply(b, armies, BOSS_K * Rb * noise / raw * hp / keep, t, 0);
  };
}
// beating a boss: its artifact goes to whoever fought it
{
  const _slain = banditSlain;
  banditSlain = function (a, b) {
    _slain(a, b);
    if (!a.boss) return;
    const owner = b.start && b.start[ME] !== undefined ? ME : Object.keys(b.start || {}).map(Number).find(x => NATIONS[x]);
    if (owner) grantArtifact(owner, BOSSES[a.boss].art, a);
  };
}
// the Wayfinder's report on a boss
{
  const _pop = showBanditPop;
  showBanditPop = function (p, back, u) {
    const boss = bossIn(p); if (!boss) return _pop(p, back, u);
    const B = BOSSES[boss.boss], A = ARTIFACTS[B.art], el = $q('#banditPop');
    const what = uqKind(boss.guards) === 'death' ? `It circles the slopes of Death Mountain.` : `It guards the only way into the ${UQ_NAME[uqKind(boss.guards)]}.`;
    el.innerHTML = `<button type="button" class="pop-x" data-bp="ok" aria-label="Dismiss" title="Dismiss">×</button><h2 id="banditPopT">${B.short}!<span>at ${escHTML(provName(p))}</span></h2><p>${escHTML(u.name)} spotted ${B.name}${B.sub ? ', ' + B.sub : ''} (power ${B.power}) and is fleeing back to ${escHTML(provName(back))}. ${what} An army about 10–20% stronger will usually beat it, and one 50% stronger almost surely; the victor claims <b>${A.name}</b>: ${A.desc}</p><div class="dm-btns"><button type="button" data-bp="look">Show me</button><button type="button" data-bp="ok">OK</button></div>`;
    el.dataset.prov = p; el.hidden = false;
    const ok = el.querySelector('.dm-btns [data-bp="ok"]'); if (ok) ok.focus({ preventScroll: true });
  };
}

// ---------- artifacts ----------
const ARTIFACTS = {
  redskull:  { name: 'Red Dragon Skull', desc: 'all your units are 25% faster.' },
  blueskull: { name: 'Blue Dragon Skull', desc: 'all your soldiers have 15% more health.' },
  goldskull: { name: 'Gold Dragon Skull', desc: '+50 gold every payout, and 2000 more gold storage.' },
  crown:     { name: 'King’s Crown', desc: 'your upkeep is 20% lower.' },
  flame:     { name: 'Essence of Flame', desc: 'every weapon you carry has +10 attack.' },
  eye:       { name: 'Lidless Eye', desc: 'you always see every army on the map and the province it stands in.' },
  stump:     { name: 'Enchanted Stump', desc: '+50 wood every payout.' },
  grips:     { name: 'Grips of the Beast', desc: 'maces of every level (clubs, maces, morning stars, war hammers) deal 15 more damage.' },
  slippers:  { name: 'Winged Slippers', desc: 'your armies can fly over any border into a neighboring province (an ability on the army’s card, 1-minute cooldown for your whole nation).' }
};
function hasArt(o, id) { return !!(S.artifacts && S.artifacts[o] && S.artifacts[o].includes(id)); }
function grantArtifact(o, id, boss) {
  S.artifacts = S.artifacts || {};
  S.artifacts[o] = S.artifacts[o] || []; if (S.artifacts[o].includes(id)) return; S.artifacts[o].push(id);
  S.artVer = (S.artVer || 0) + 1;
  if (o === ME) {
    computeIncome(); clampStock(); cmdKey = ''; rosterKey = ''; armKey = ''; countryKey = ''; fogDirty = true; computeFog();
    sfx('war_fort_win', { vol: 1 });
    queueFind({ p: boss.prov, icon: artIcon(id), head: 'Artifact!', title: ARTIFACTS[id].name, said: `${BOSSES[boss.boss].name.replace(/^the /, 'The ')} has fallen. You claim the ${ARTIFACTS[id].name}: ${ARTIFACTS[id].desc}`, note: 'It is shown in your Country Breakdown (click your nation’s badge).' });
    if (typeof showNextFind === 'function') showNextFind();
  } else if (knows(o)) toast(`The ${PLAYERS[o].name} slew ${BOSSES[boss.boss].name} and claimed the ${ARTIFACTS[id].name}.`);
}
// stats: Blue Dragon Skull (+15% health), Essence of Flame (+10 attack), Grips of the Beast (+15 attack for blunt weapons)
// (called from statsOf in equip.js for every owner; bosses, monsters and bandits belong to no nation and are untouched)
function artStats(k, st, o) {
  if (!o || o === RAIDERS || !S.artifacts || !S.artifacts[o] || !st || st.fam === 'boss') return st;
  const A = S.artifacts[o], c = artStats.cache || (artStats.cache = new Map()), key = o + '|' + k, hit = c.get(key);
  if (hit && hit.st === st && hit.v === S.artVer) return hit.out;
  const out = { ...st };
  if (A.includes('blueskull')) out.hp = st.hp * 1.15;
  if (A.includes('flame') && st.atk > 0) out.atk += 10;
  if (A.includes('grips') && st.fam === 'blunt') out.atk += 15;
  c.set(key, { st, v: S.artVer, out }); return out;
}
{
  const _sm = speedMod;
  speedMod = function (u) { return _sm(u) * (u && hasArt(u.owner, 'redskull') ? 1.25 : 1); };
  const _up = upkeep;
  upkeep = function () { const u = _up(); if (hasArt(ME, 'crown')) for (const k in u) u[k] = Math.round(u[k] * 0.8); return u; };
  const _ci = computeIncome;
  computeIncome = function () {
    _ci();
    const add = { gold: hasArt(ME, 'goldskull') ? 50 : 0, wood: hasArt(ME, 'stump') ? 50 : 0 };
    for (const k in add) if (add[k]) { income[k] += add[k]; if (incomeParts) incomeParts.gross[k] += add[k]; }
  };
  const _cap = storageCap;
  storageCap = function (k) { return _cap(k) + (k === 'gold' && hasArt(ME, 'goldskull') ? 2000 : 0); };
  const _ai = aiIncome;
  aiIncome = function (N) { const inc = _ai(N); if (hasArt(N.id, 'goldskull')) inc.gold += 50; if (hasArt(N.id, 'stump')) inc.wood += 50; return inc; };
}
// little pictures of the artifacts (for the Country Breakdown and the popup)
function artIcon(id) {
  return ticoCanvas('art:' + id, g => {
    const skull = (bone, dark, horn) => {
      if (horn) for (const s of [-1, 1]) ICO.poly(g, [[32 + s * 12, 18], [32 + s * 26, 4], [32 + s * 20, 22]], horn, 2.4);
      g.beginPath(); g.moveTo(14, 30); g.quadraticCurveTo(14, 10, 32, 10); g.quadraticCurveTo(50, 10, 50, 30); g.lineTo(46, 40); g.lineTo(54, 50); g.lineTo(40, 56); g.lineTo(24, 56); g.lineTo(10, 50); g.lineTo(18, 40); g.closePath(); g.fillStyle = bone; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
      for (const x of [24, 40]) { g.beginPath(); g.ellipse(x, 30, 5, 6, 0, 0, 7); g.fillStyle = dark; g.fill(); }
      g.fillStyle = dark; g.beginPath(); g.moveTo(30, 40); g.lineTo(34, 40); g.lineTo(32, 44); g.closePath(); g.fill();
      g.strokeStyle = dark; g.lineWidth = 1.6; for (let x = 22; x <= 42; x += 5) { g.beginPath(); g.moveTo(x, 48); g.lineTo(x, 55); g.stroke(); }
    };
    if (id === 'redskull') skull('#e2533f', '#4a0d0d', '#f2e0c0');
    else if (id === 'blueskull') skull('#4f8fe0', '#0d1e4a', '#e8f0ff');
    else if (id === 'goldskull') skull('#f4c44f', '#5a3a08', '#fff3c0');
    else if (id === 'crown') { ICO.poly(g, [[10, 48], [12, 18], [22, 32], [32, 12], [42, 32], [52, 18], [54, 48]], '#f4c44f'); ICO.poly(g, [[10, 48], [54, 48], [54, 56], [10, 56]], '#d9a62c'); for (const [x, c] of [[20, '#e0526a'], [32, '#3f72d9'], [44, '#3fbf6a']]) { g.beginPath(); g.arc(x, 52, 3, 0, 7); g.fillStyle = c; g.fill(); } }
    else if (id === 'flame') { g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(50, 22, 54, 40, 44, 52); g.quadraticCurveTo(32, 62, 20, 52); g.bezierCurveTo(10, 40, 18, 26, 26, 22); g.quadraticCurveTo(26, 32, 32, 34); g.quadraticCurveTo(28, 20, 32, 6); g.closePath(); g.fillStyle = '#ff7a1a'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.moveTo(32, 28); g.bezierCurveTo(42, 38, 42, 50, 32, 54); g.bezierCurveTo(24, 50, 24, 40, 32, 28); g.fillStyle = '#ffe066'; g.fill(); }
    else if (id === 'eye') { g.beginPath(); g.moveTo(6, 32); g.quadraticCurveTo(32, 4, 58, 32); g.quadraticCurveTo(32, 60, 6, 32); g.closePath(); g.fillStyle = '#ffe9a8'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(32, 32, 12, 0, 7); g.fillStyle = '#e0601a'; g.fill(); g.stroke(); g.beginPath(); g.ellipse(32, 32, 3, 10, 0, 0, 7); g.fillStyle = OL; g.fill(); }
    else if (id === 'stump') { ICO.poly(g, [[14, 56], [16, 30], [48, 30], [50, 56]], '#8a5a34'); g.beginPath(); g.ellipse(32, 30, 17, 7, 0, 0, 7); g.fillStyle = '#e6c08a'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.ellipse(32, 30, 9, 3.5, 0, 0, 7); g.lineWidth = 1.5; g.strokeStyle = '#a5713f'; g.stroke(); for (const [x, y] of [[24, 14], [40, 10], [32, 4]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fillStyle = '#9f7aff'; g.fill(); } g.beginPath(); g.moveTo(40, 30); g.quadraticCurveTo(44, 18, 52, 16); g.lineWidth = 3; g.strokeStyle = '#5fae4a'; g.stroke(); }
    else if (id === 'grips') { for (const s of [0, 1]) { const x = 18 + s * 26; g.beginPath(); g.ellipse(x, 38, 11, 14, 0, 0, 7); g.fillStyle = '#6b4a2e'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); for (const d of [-7, 0, 7]) ICO.poly(g, [[x + d - 2, 26], [x + d + 2, 26], [x + d, 14]], '#f0ead8', 2); } }
    else if (id === 'slippers') { for (const s of [0, 1]) { const x = 12 + s * 22, y = 40 + s * 4; ICO.poly(g, [[x, y], [x + 20, y], [x + 26, y + 8], [x, y + 8]], '#3fbfa8', 2.6); ICO.poly(g, [[x + 4, y], [x - 4, y - 18], [x + 8, y - 10], [x + 6, y - 22], [x + 14, y - 6]], '#fff', 2); } }
  });
}
// the Country Breakdown lists your artifacts
{
  const _rc = renderCountry;
  renderCountry = function () {
    _rc();
    const el = $q('#countryWin'); if (!countryOpen || !el || el.querySelector('.cw-arts')) return;
    const mine = (S.artifacts && S.artifacts[ME]) || [];
    const sec = document.createElement('div'); sec.className = 'cw-arts';
    sec.innerHTML = `<div class="cw-sec">Artifacts</div>` + (mine.length ? `<div class="cw-artlist">${mine.map(id => `<div class="cw-art"><img alt="" src="${artIcon(id)}"><span><b>${ARTIFACTS[id].name}</b><small>${ARTIFACTS[id].desc.replace(/^./, c => c.toUpperCase())}</small></span></div>`).join('')}</div>` : `<p class="cw-none">None yet. Bosses guard Death Mountain, the Desert Oasis and the Heart of the Forest: beat one to claim its artifact.</p>`);
    const right = el.querySelector('.cw-right'); (right || el).appendChild(sec);
  };
}

// ---------- Winged Slippers: an army flies over any border into a neighboring province ----------
const FLY_CD = 60, FLY_TIME = 1.6;
let flyAim = false;
function flyWhy(a, q) {
  if (!hasArt(ME, 'slippers')) return 'Needs the Winged Slippers';
  if (!a) return 'No army selected';
  if (a.battle) return 'Not during battle';
  if (a.flyT) return 'Already flying';
  const cd = Math.max(0, (S.cd.fly || 0) - S.t); if (cd > 0) return `Ready in ${Math.ceil(cd)} s`;
  if (q === undefined) return null;
  if (q < 0 || q === a.prov || !allNbr[a.prov].includes(q)) return 'Pick a province next to the army';
  if (isDeathMtn(q)) return 'Nothing can land on Death Mountain';
  if (!canEnter(a, q, q)) return 'Your army may not go there';
  return null;
}
function flyArmy(a, q) {
  const why = flyWhy(a, q); if (why) { toast(why + '.', true); return false; }
  const x0 = a.x, y0 = a.y;
  a.path = []; a.moving = false; a.surveyQueue = []; a.sieging = null; a.lastProv = a.prov; a.prov = q; a.slot = freeSlot(q, a);
  const [x1, y1] = slotPos(q, a.slot);
  a.flyT = { x0, y0, x1, y1, t0: S.t }; a.x = x0; a.y = y0; a.arrived = S.t + FLY_TIME;
  S.cd.fly = S.t + FLY_CD;
  sfx('mv_cavalry', { prov: q });
  toast(`${a.name} takes wing over the border to ${provName(q)}.`);
  fogDirty = true; computeFog(); cmdKey = ''; return true;
}
function stepFlights() {
  for (const a of S.units) {
    const F = a.flyT; if (!F) continue;
    const f = Math.min(1, (S.t - F.t0) / FLY_TIME);
    a.x = F.x0 + (F.x1 - F.x0) * f; a.y = F.y0 + (F.y1 - F.y0) * f; a.th = Math.atan2(F.y1 - F.y0, F.x1 - F.x0);
    a.flyH = Math.sin(f * Math.PI) * 140;
    if (f >= 1) { a.flyT = null; a.flyH = 0; a.x = F.x1; a.y = F.y1; }
  }
  if (flyAim && !pathAim) flyAim = false;
}
// while flying the army is drawn up in the air with its shadow on the ground, wings beating
{
  const _da = drawArmy;
  drawArmy = function (g, u, t) {
    if (!u.flyH) return _da(g, u, t);
    g.save(); g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(u.x, u.y + 4, 34, 10, 0, 0, 7); g.fill(); g.restore();
    g.save(); g.translate(0, -u.flyH); _da(g, u, t);
    const flap = Math.sin(t * 18) * 0.6;
    for (const s of [-1, 1]) {
      g.save(); g.translate(u.x + s * 22, u.y - 40); g.scale(s, 1); g.rotate(-0.4 + flap * 0.5);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(30, -36, 64, -30); g.quadraticCurveTo(46, -18, 52, -8); g.quadraticCurveTo(34, -8, 38, 4); g.quadraticCurveTo(18, 0, 0, 8); g.closePath();
      g.fillStyle = 'rgba(255,255,255,0.92)'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
      g.restore();
    }
    g.restore();
  };
}
{
  const armyGet = Object.getOwnPropertyDescriptor(CMD, 'army').get;
  Object.defineProperty(CMD, 'army', { configurable: true, get() {
    const list = armyGet(); if (!hasArt(ME, 'slippers')) return list;
    const used = new Set(list.map(c => c.cell)), cell = [9, 7, 6, 5, 4].find(c => !used.has(c));
    return cell === undefined ? list : list.concat([{ id: 'fly', cell, key: '' }]);
  } });
  const _info = extraCmdInfo;
  extraCmdInfo = id => {
    if (id !== 'fly') return _info(id);
    const a = S.selected.find(v => v.kind === 'army'), why = flyWhy(a);
    return { name: flyAim ? 'Pick a province…' : 'Fly (Winged Slippers)', desc: `Click this, then click a province next to the army: it flies over the border, whatever stands on it (mountains, trees, rivers, walls), and lands there. Your whole nation then waits ${FLY_CD} s before flying again.`, cost: null, why, ok: 'Click, then pick a province', icon: artIcon('slippers') };
  };
  const _use = extraCmdUse;
  extraCmdUse = id => {
    if (id !== 'fly') { flyAim = false; return _use(id); }
    const a = S.selected.find(v => v.kind === 'army' && v.owner === ME), why = flyWhy(a);
    if (why) { toast(why + '.', true); return true; }
    pathAim = a; flyAim = true; cv.style.cursor = 'crosshair'; cmdKey = '';
    toast('Click a province next to the army to fly there. Right-click or Esc cancels.');
    return true;
  };
  const _click = pathAimClick;
  pathAimClick = (p, right) => {
    if (!flyAim) return _click(p, right);
    const a = pathAim; pathAim = null; flyAim = false; cv.style.cursor = ''; cmdKey = '';
    if (right || p < 0 || !a) { toast('Flight cancelled.'); return; }
    flyArmy(a, p);
  };
}

// ---------- Warlock skulls (Swamplings): an off-hand skull adds to a wand's attack ----------
const SKULLS = {
  skull1: { name: 'Cracked Skull', atk: 1, tech: 'skull-cracked' },
  skull2: { name: 'Chipped Skull', atk: 2, tech: 'skull-chipped' },
  skull3: { name: 'Polished Skull', atk: 3, tech: 'skull-polished' },
  skull4: { name: 'Flawless Skull', atk: 4, tech: 'skull-flawless' }
};
{
  // a Swampling Warlock carries no shield; with a wand he can hold a skull in the other hand instead
  const _ms = mageStats;
  mageStats = function (gear) {
    if (!isSw(ME)) return _ms(gear);
    const st = _ms({ ...gear, shield: null }), W = MAGE_WEAPONS[gear.weapon], Sk = !W.twoH && gear.skull ? SKULLS[gear.skull] : null;
    if (Sk) { st.atk += Sk.atk; st.blurb = `${W.name} and ${Sk.name}.`; }
    return st;
  };
  const _rme = renderMageEditor;
  renderMageEditor = function (list) {
    _rme(list);
    if (!isSw(ME)) return;
    // replace the Shield row with a Skull row
    const W = MAGE_WEAPONS[draft.weapon], rows = [...$q('#armory').querySelectorAll('.ar-row')], sh = rows.find(r => r.querySelector('[data-eq^="shield:"]'));
    const html = `<span class="ar-rl">Off-hand skull<small>${W.twoH ? 'Staves need both hands' : 'Adds to the wand’s attack'}</small></span><div class="ar-eqs"><button type="button" class="ar-eq${!draft.skull || W.twoH ? ' on' : ''}" data-eq="skull:none"><span class="ar-none">—</span><span>None</span></button>${Object.entries(SKULLS).map(([k, Sk]) => equipButton('skull', k, { ...Sk, name: `${Sk.name} (+${Sk.atk})` }, draft.skull === k && !W.twoH, W.twoH ? 'Two-handed stave' : lockWhy(Sk))).join('')}</div>`;
    if (sh) sh.innerHTML = html;
    // the editor's texts name Warlocks and skulls, not Mages and shields
    const M = UNIT_DEFS[MAGE].name, wandNote = [...$q('#armory').querySelectorAll('.ar-rl small')].find(e => /shield/.test(e.textContent));
    if (wandNote) wandNote.textContent = 'One-handed: leaves room for a skull';
    const kind = $q('#armory .ar-kind'); if (kind) kind.textContent = `${M} gear · every ${M}`;
    const note = $q('#armory .ar-note'); if (note) note.textContent = `${M}s are trained at a ${BUILD_DEFS.magetower ? BUILD_DEFS.magetower.name : 'Mage Tower'}. Their gear is shared: changing it re-equips every ${M}.`;
    const btn = $q('#armory .ar-save'); if (btn) btn.textContent = `Equip all ${M}s`;
  };
  const _ed = editDesign;
  editDesign = function (id) { _ed(id); if (id === 'mage' && draft) { draft.skull = S.mageGear.skull || null; armKey = ''; } };
  const _sd = saveDraft;
  saveDraft = function () {
    const d = draft;
    if (d && d.type === 'mage' && isSw(ME)) { d.shield = null; S.mageGear.skull = MAGE_WEAPONS[d.weapon].twoH ? null : (d.skull || null); }
    _sd();
    if (d && d.type === 'mage' && isSw(ME)) { S.mageGear.skull = MAGE_WEAPONS[d.weapon].twoH ? null : (d.skull || null); registerMage(); armKey = ''; }
  };
  // the Armory's skull buttons
  armEl.addEventListener('click', e => {
    const t = e.target.closest('[data-eq^="skull:"]'); if (!t || !draft) return;
    e.stopImmediatePropagation();
    if (t.getAttribute('aria-disabled')) { toast(t.title, true); return; }
    const key = t.dataset.eq.split(':')[1]; if (!MAGE_WEAPONS[draft.weapon].twoH) draft.skull = key === 'none' ? null : key;
    armKey = '';
  }, true);
  const _eqI = equipIcon;
  equipIcon = (kind, key) => kind === 'skull' ? ticoCanvas('eq:skull:' + key, g => skullItemIcon(g, key)) : _eqI(kind, key);
  const _ti = techIcon;
  techIcon = id => { const s = Object.keys(SKULLS).find(k => SKULLS[k].tech === id); return s ? ticoCanvas('tech:' + id, g => skullItemIcon(g, s)) : _ti(id); };
}
function skullItemIcon(g, key) { g.save(); g.translate(32, 36); g.scale(2.1, 2.1); RealmIso.drawItem(g, key, 0, 0, 0, 0.4, false); g.restore(); }

// ---------- cooldown bars on the command card ----------
// every action that is cooling down shows a bar on its button that drains as the cooldown runs out
const cdSeen = new Map();   // key -> { ready, total }
function cdSpan(key, ready) {
  let s = cdSeen.get(key);
  if (!s || s.ready !== ready) { s = { ready, total: Math.max(0.1, ready - S.t) }; cdSeen.set(key, s); }
  return s;
}
function trackCooldowns() {
  for (const k in S.cd) if (S.cd[k] > S.t) cdSpan('cd:' + k, S.cd[k]);
  for (const u of S.units) if (u.owner === ME && (u.kind === 'army' || u.kind === MAGE)) for (const f of ['skinCd', 'curseCd', 'risenCd', 'fieryCd']) if (u[f] > S.t) cdSpan('u' + u.id + ':' + f, u[f]);
}
function cdOf(id) {
  const [what, k] = id.split(':'), best = [];
  const add = (key, ready) => { if (ready > S.t) { const s = cdSpan(key, ready); best.push((ready - S.t) / s.total); } };
  const c = typeof selCaster === 'function' ? selCaster() : null;
  if (what === 'spell') { add('cd:' + k, S.cd[k] || 0); if (c) add('cd:' + k + c.id, S.cd[k + c.id] || 0); }
  else if (what === 'mauto' && c) add('u' + c.id + ':' + k + 'Cd', c[k + 'Cd'] || 0);
  else if (id === 'fly') add('cd:fly', S.cd.fly || 0);
  else if (S.cd[id]) add('cd:' + id, S.cd[id]);
  return best.length ? Math.max(...best) : 0;
}
function paintCooldowns() {
  trackCooldowns();
  for (const b of document.querySelectorAll('#cmdGrid .cmd-btn[data-cmd]')) {
    const f = cdOf(b.dataset.cmd); let bar = b.querySelector('.cmd-cd');
    if (f <= 0) { if (bar) bar.remove(); b.classList.remove('cooling'); continue; }
    if (!bar) { bar = document.createElement('i'); bar.className = 'cmd-cd'; bar.innerHTML = '<s></s>'; b.appendChild(bar); }
    b.classList.add('cooling');
    bar.firstChild.style.width = (Math.min(1, f) * 100).toFixed(1) + '%';
  }
}

// ---------- drawing: Death Mountain, the Oasis, the Heart ----------
const uqArt = new Map();   // cached bounding info per province
function uqBox(p) {
  let c = uqArt.get(p); if (c && c.seed === world.seed) return c;
  const pts = G.provs[p].inner && G.provs[p].inner.length ? G.provs[p].inner : G.provs[p].pts;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  c = { seed: world.seed, x0, y0, x1, y1, pts }; uqArt.set(p, c); return c;
}
function uniqueItems(g, t, items) {
  const U = uq(); if (!U) return;
  if (U.death >= 0 && S.explored.has(U.death)) { const B = uqBox(U.death); items.push({ y: B.y1 - 40, f: () => drawDeathMountain(g, U.death, t) }); }
  if (U.oasis >= 0 && S.explored.has(U.oasis)) { const c = G.provs[U.oasis].ic; items.push({ y: c[1] - 60, f: () => drawOasis(g, U.oasis, t) }); }
  if (U.heart >= 0 && S.explored.has(U.heart)) { const c = G.provs[U.heart].ic; items.push({ y: c[1] - 70, f: () => drawHeart(g, U.heart, t) }); }
}
function drawDeathMountain(g, p, t) {
  const B = uqBox(p), w = B.x1 - B.x0, h = B.y1 - B.y0, cx = (B.x0 + B.x1) / 2, H = Math.max(w, h) * 0.85;
  const pts = B.pts, n = pts.length;
  // the massif sits on the province's own lower borders: its foot follows them from the leftmost corner round
  // the bottom to the rightmost one, and only the ridge rises above the province (as a mountain would)
  let iL = 0, iR = 0; pts.forEach(([x], i) => { if (x < pts[iL][0]) iL = i; if (x > pts[iR][0]) iR = i; });
  const chain = (from, to, step) => { const out = []; for (let i = from; ; i = (i + step + n) % n) { out.push(pts[i]); if (i === to) break; } return out; };
  const a1 = chain(iR, iL, 1), a2 = chain(iR, iL, -1);
  const avgY = c => c.reduce((s, q) => s + q[1], 0) / c.length;
  const foot = avgY(a1) > avgY(a2) ? a1 : a2;            // right → bottom → left
  const [xL, yL] = pts[iL], [xR, yR] = pts[iR], by = Math.max(...foot.map(q => q[1]));
  const X = f => xL + (xR - xL) * f, Y = (f, k) => yL + (yR - yL) * f - H * k;
  const prof = [[0.06, 0.18], [0.12, 0.26], [0.18, 0.48], [0.24, 0.66], [0.28, 0.62], [0.33, 0.7], [0.38, 0.6], [0.44, 0.82], [0.5, 1], [0.55, 0.9], [0.6, 0.84], [0.66, 0.68], [0.72, 0.76], [0.76, 0.72], [0.82, 0.52], [0.88, 0.36], [0.94, 0.2]];
  const outline = foot.concat(prof.map(([f, k]) => [X(f), Y(f, k)]));
  const path = () => { g.beginPath(); outline.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  path(); g.fillStyle = '#211d22'; g.fill(); g.lineWidth = 8; g.strokeStyle = OL; g.stroke();
  g.save(); path(); g.clip();
  // lit faces on the left of each summit, deep shadow on the right
  for (const [sx, sk] of [[0.24, 0.66], [0.5, 1], [0.72, 0.76]]) {
    const tx = X(sx), ty = Y(sx, sk);
    g.beginPath(); g.moveTo(tx, ty); g.lineTo(X(sx - 0.24), by + 20); g.lineTo(X(sx - 0.03), by + 20); g.closePath(); g.fillStyle = 'rgba(150,140,165,0.2)'; g.fill();
    g.beginPath(); g.moveTo(tx, ty); g.lineTo(X(sx + 0.03), by + 20); g.lineTo(X(sx + 0.26), by + 20); g.closePath(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
    g.beginPath(); g.moveTo(tx, ty); g.lineTo(X(sx + 0.01), by + 20); g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.stroke();
  }
  // strata
  g.strokeStyle = 'rgba(90,80,100,0.35)'; g.lineWidth = 3; for (let k = 1; k < 7; k++) { const y = by - H * k * 0.14; g.beginPath(); g.moveTo(xL - 20, y + Math.sin(k) * 10); g.quadraticCurveTo(cx, y - 18, xR + 20, y + Math.cos(k) * 10); g.stroke(); }
  // glowing lava running down from the summit
  const glow = 0.65 + Math.sin(t * 2) * 0.2, top = [X(0.5), Y(0.5, 1)];
  for (const [dx, k] of [[-0.06, 0], [0.04, 1], [0.12, 2], [-0.14, 3], [0.2, 4]]) {
    g.beginPath(); let x = top[0] + dx * w * 0.1, y = top[1] + H * (0.08 + k * 0.04); g.moveTo(x, y);
    for (let s2 = 0; s2 < 9; s2++) { x += dx * w * 0.1 + Math.sin(s2 * 2.1 + k) * 12; y += H * 0.11; g.lineTo(x, y); }
    g.strokeStyle = `rgba(255,${80 + k * 18},30,${glow})`; g.lineWidth = 9; g.stroke(); g.strokeStyle = 'rgba(255,225,130,0.85)'; g.lineWidth = 3; g.stroke();
  }
  g.restore();
  // the crater glows; ash and smoke rise
  g.beginPath(); g.ellipse(top[0], top[1] + 8, 22, 8, 0, 0, 7); g.fillStyle = `rgba(255,120,40,${glow})`; g.fill();
  const gr = g.createRadialGradient(top[0], top[1], 4, top[0], top[1], 90); gr.addColorStop(0, `rgba(255,110,40,${0.45 * glow})`); gr.addColorStop(1, 'rgba(255,110,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(top[0], top[1], 90, 0, 7); g.fill();
  for (let i = 0; i < 7; i++) { const ph = (t * 0.12 + i / 7) % 1, x = top[0] + Math.sin(i * 1.7 + t * 0.5) * 24 + ph * 90, y = top[1] - 24 - ph * H * 0.45, r = 22 + ph * 60; g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = `rgba(42,38,46,${0.6 * (1 - ph)})`; g.fill(); }
  g.restore();
}
function convexHull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function drawOasis(g, p, t) {
  const c = G.provs[p].ic, x = c[0], y = c[1] - 70;
  g.save(); g.lineJoin = 'round';
  // a ring of green, then the water
  g.beginPath(); g.ellipse(x, y, 150, 72, 0, 0, 7); g.fillStyle = '#7cc25a'; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.ellipse(x, y + 2, 112, 50, 0, 0, 7); g.fillStyle = '#3fa8d8'; g.fill(); g.lineWidth = 4; g.stroke();
  g.beginPath(); g.ellipse(x - 20, y - 10, 60, 18, 0, 0, 7); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill();
  g.strokeStyle = 'rgba(220,245,255,0.8)'; g.lineWidth = 2.5; for (let i = 0; i < 4; i++) { const ph = (t * 0.4 + i / 4) % 1; g.beginPath(); g.ellipse(x + 20, y + 6, 20 + ph * 60, 8 + ph * 22, 0, 0.3, 2.6); g.globalAlpha = 1 - ph; g.stroke(); } g.globalAlpha = 1;
  // reeds and palms around the water
  for (const [ox, oy] of [[-118, 10], [-96, 34], [104, 30], [124, 4], [60, 52], [-40, 52]]) for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + ox + k * 4, y + oy); g.quadraticCurveTo(x + ox + k * 7, y + oy - 14, x + ox + k * 9 + Math.sin(t * 2 + ox) * 2, y + oy - 22); g.lineWidth = 2.4; g.strokeStyle = '#3f8a3a'; g.stroke(); }
  for (const [ox, oy, s] of [[-140, -40, 1.5], [128, -36, 1.4], [-70, -62, 1.2], [80, -64, 1.3], [0, -72, 1.1]]) { const sp = SPR['palm' + ((ox > 0) ? 1 : 0) + '_L']; if (sp && sp.cv) { g.drawImage(sp.cv, x + ox - sp.ax * s / 2 * 1, y + oy - sp.ay * s / 2, sp.w * s / 2, sp.h * s / 2); } }
  g.restore();
}
function drawHeart(g, p, t) {
  const c = G.provs[p].ic, x = c[0], y = c[1] - 60;
  g.save(); g.lineJoin = 'round';
  // mossy clearing with a glowing pool of light and a vast ancient tree
  g.beginPath(); g.ellipse(x, y + 40, 150, 56, 0, 0, 7); g.fillStyle = '#4f9a3f'; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke();
  const pulse = 0.5 + Math.sin(t * 1.6) * 0.15;
  const gr = g.createRadialGradient(x, y + 40, 10, x, y + 40, 140); gr.addColorStop(0, `rgba(220,255,170,${pulse})`); gr.addColorStop(1, 'rgba(220,255,170,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y + 40, 150, 56, 0, 0, 7); g.fill();
  // roots
  for (const s of [-1, 1]) for (const k of [0, 1]) { g.beginPath(); g.moveTo(x + s * 20, y + 30); g.quadraticCurveTo(x + s * (50 + k * 20), y + 36 + k * 6, x + s * (80 + k * 30), y + 52 + k * 8); g.lineWidth = 14 - k * 4; g.strokeStyle = OL; g.stroke(); g.lineWidth = 9 - k * 4; g.strokeStyle = '#7b5029'; g.stroke(); }
  // the trunk
  g.beginPath(); g.moveTo(x - 34, y + 36); g.quadraticCurveTo(x - 26, y - 60, x - 18, y - 150); g.lineTo(x + 18, y - 150); g.quadraticCurveTo(x + 26, y - 60, x + 34, y + 36); g.closePath(); g.fillStyle = '#8a5a34'; g.fill(); g.lineWidth = 5; g.strokeStyle = OL; g.stroke();
  g.strokeStyle = '#5e3b1e'; g.lineWidth = 2.5; for (const dx of [-14, 0, 12]) { g.beginPath(); g.moveTo(x + dx, y + 30); g.quadraticCurveTo(x + dx + 6, y - 50, x + dx - 2, y - 140); g.stroke(); }
  // a glowing heart-shaped knot
  g.beginPath(); const hx = x, hy = y - 40; g.moveTo(hx, hy + 12); g.bezierCurveTo(hx - 18, hy, hx - 12, hy - 16, hx, hy - 8); g.bezierCurveTo(hx + 12, hy - 16, hx + 18, hy, hx, hy + 12); g.fillStyle = `rgba(190,255,140,${0.6 + pulse * 0.4})`; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OL; g.stroke();
  // the crown
  for (const [ox, oy, r, col] of [[-80, -170, 50, '#2f7a35'], [80, -168, 52, '#2f7a35'], [-40, -220, 60, '#3f8a3a'], [40, -222, 58, '#3f8a3a'], [0, -190, 62, '#4f9a3f'], [0, -260, 46, '#5fae4a']]) { g.beginPath(); g.arc(x + ox, y + oy + Math.sin(t + ox) * 2, r, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); }
  // fireflies
  for (let i = 0; i < 10; i++) { const a = t * 0.6 + i * 0.63, fx = x + Math.cos(a) * (60 + i * 8), fy = y - 60 + Math.sin(a * 1.3) * 60; g.beginPath(); g.arc(fx, fy, 3, 0, 7); g.fillStyle = `rgba(230,255,150,${0.5 + 0.5 * Math.sin(t * 4 + i)})`; g.fill(); }
  g.restore();
}
{
  const _ti = travelerItems;
  travelerItems = function (g, t, items) { _ti(g, t, items); uniqueItems(g, t, items); };
}

// ---------- boss art (feet at 0,0, facing right; drawn big) ----------
function dragonArt(col, dark, belly, wing, horn) {
  return function (g, t) {
    g.save(); g.scale(2.2, 2.2);
    const flap = Math.sin(t * 3), bob = Math.sin(t * 1.5) * 2;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0, 2, 46, 9, 0, 0, 7); g.fill();
    g.translate(0, bob);
    // far wing
    const wingP = (s, a) => { g.save(); g.translate(-4, -54); g.rotate(a); g.scale(1, s); g.beginPath(); g.moveTo(0, 0); g.lineTo(-20, -58); g.lineTo(-6, -46); g.lineTo(6, -64); g.lineTo(14, -44); g.lineTo(32, -58); g.lineTo(30, -30); g.quadraticCurveTo(14, -6, 0, 0); g.closePath(); mFill(g, wing, 3); g.strokeStyle = dark; g.lineWidth = 2; for (const [ex, ey] of [[-20, -58], [6, -64], [32, -58]]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(ex, ey); g.stroke(); } g.restore(); };
    wingP(1, -0.5 - flap * 0.25);
    // tail
    g.beginPath(); g.moveTo(-26, -30); g.quadraticCurveTo(-56, -22, -64, -6); g.quadraticCurveTo(-70, 4, -82, -4); mStroke(g, 9, col);
    g.beginPath(); g.moveTo(-82, -4); g.lineTo(-92, -12); g.lineTo(-88, 2); g.closePath(); mFill(g, horn, 2);
    // legs
    for (const [lx, ph, c2] of [[-18, 0, dark], [16, 1, dark], [-10, 2, col], [24, 3, col]]) { const k = Math.sin(t * 2 + ph) * 3; g.beginPath(); g.moveTo(lx, -30); g.lineTo(lx + 2 + k, -12); g.lineTo(lx + 6 + k, 0); mStroke(g, 8, c2); g.beginPath(); g.ellipse(lx + 8 + k, 0, 6, 3, 0, 0, 7); mFill(g, c2, 2); }
    // body
    g.beginPath(); g.ellipse(0, -36, 34, 20, -0.1, 0, 7); mFill(g, col, 3.2);
    g.beginPath(); g.ellipse(4, -28, 24, 10, -0.1, 0, Math.PI); g.fillStyle = belly; g.fill();
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 10 - 4, -56); g.lineTo(i * 10, -64); g.lineTo(i * 10 + 4, -55); g.closePath(); mFill(g, horn, 1.6); }
    // neck and head
    g.beginPath(); g.moveTo(24, -46); g.quadraticCurveTo(44, -62, 42, -82); mStroke(g, 14, col);
    g.save(); g.translate(46, -88); g.rotate(0.15);
    g.beginPath(); g.moveTo(-12, -6); g.quadraticCurveTo(-4, -16, 10, -10); g.lineTo(30, -4); g.quadraticCurveTo(34, 2, 28, 6); g.lineTo(6, 10); g.quadraticCurveTo(-10, 12, -12, -6); g.closePath(); mFill(g, col, 3);
    g.beginPath(); g.moveTo(8, 6); g.lineTo(26, 3); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
    for (const hx of [-8, -2]) { g.beginPath(); g.moveTo(hx, -10); g.quadraticCurveTo(hx - 10, -22, hx - 18, -24); g.lineTo(hx + 2, -12); g.closePath(); mFill(g, horn, 2); }
    g.beginPath(); g.ellipse(6, -4, 3.4, 2.2, 0, 0, 7); g.fillStyle = '#ffe14d'; g.fill(); g.beginPath(); g.ellipse(6.5, -4, 0.8, 2, 0, 0, 7); g.fillStyle = OL; g.fill();
    // smoke from the nostrils
    for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; g.beginPath(); g.arc(32 + ph * 20, -2 - ph * 14, 2 + ph * 6, 0, 7); g.fillStyle = `rgba(80,70,70,${0.5 * (1 - ph)})`; g.fill(); }
    g.restore();
    wingP(1, -0.15 + flap * 0.3);
    g.restore();
  };
}
Object.assign(MON_ART, {
  'b-reddragon': dragonArt('#d0402e', '#8a1f16', '#f2b77a', '#e2735a', '#f2e0c0'),
  'b-bluedragon': dragonArt('#3f72d9', '#1f3f8a', '#bfe0ff', '#6f9ff0', '#e8f0ff'),
  'b-golddragon': dragonArt('#e8b02c', '#9a6a10', '#fff0b0', '#f4cf5a', '#fff8e0'),
  'b-skeletonking'(g, t) {
    g.save(); g.scale(1.7, 1.7);
    const BONE = '#ece6d4', sway = Math.sin(t * 2) * 0.05;
    // cape
    g.beginPath(); g.moveTo(-12, -82); g.quadraticCurveTo(-30, -40, -26 + Math.sin(t * 2) * 3, 0); g.lineTo(14, 0); g.quadraticCurveTo(8, -40, 12, -82); g.closePath(); mFill(g, '#5a2a7a', 3);
    // legs
    for (const [lx, ph] of [[-6, 0], [6, Math.PI]]) { const k = Math.sin(t * 2.4 + ph) * 4; g.beginPath(); g.moveTo(lx, -40); g.lineTo(lx + k, -20); g.lineTo(lx + k * 1.4, 0); mStroke(g, 3, BONE); }
    g.save(); g.rotate(sway);
    // ribs and spine
    g.beginPath(); g.moveTo(0, -80); g.lineTo(0, -40); mStroke(g, 3, BONE);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(0, -72 + i * 8, 11 - i, 3.4, 0, 0, Math.PI); mStroke(g, 2, BONE); }
    g.beginPath(); g.ellipse(0, -40, 10, 5, 0, 0, 7); mFill(g, BONE, 2);
    // the scepter arm
    g.beginPath(); g.moveTo(4, -76); g.lineTo(18, -62); g.lineTo(26, -70); mStroke(g, 3, BONE);
    g.beginPath(); g.moveTo(26, -100); g.lineTo(26, -30); mStroke(g, 3, '#c99a2c'); g.beginPath(); g.arc(26, -104, 6, 0, 7); mFill(g, '#3fbf6a', 2);
    // skull and crown
    g.beginPath(); g.ellipse(0, -92, 12, 13, 0, 0, 7); mFill(g, BONE, 3);
    for (const ex of [-5, 5]) { g.beginPath(); g.arc(ex, -93, 3.4, 0, 7); g.fillStyle = OL; g.fill(); g.beginPath(); g.arc(ex, -93, 1.4, 0, 7); g.fillStyle = `rgba(120,255,140,${0.7 + Math.sin(t * 5) * 0.3})`; g.fill(); }
    g.beginPath(); g.moveTo(-5, -84); g.lineTo(5, -84); g.lineWidth = 1.5; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.moveTo(-12, -102); g.lineTo(-13, -118); g.lineTo(-6, -110); g.lineTo(0, -122); g.lineTo(6, -110); g.lineTo(13, -118); g.lineTo(12, -102); g.closePath(); mFill(g, '#f4c44f', 2.2);
    g.restore(); g.restore();
  },
  'b-inferno'(g, t) {
    g.save(); g.scale(1.9, 1.9);
    const fl = (x, y, w, h, c, ph) => { const k = Math.sin(t * 9 + ph) * 3; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 1.1, y - h * 0.6, x + k, y - h); g.quadraticCurveTo(x + w * 1.1, y - h * 0.6, x + w, y); g.closePath(); g.fillStyle = c; g.fill(); };
    const gr = g.createRadialGradient(0, -60, 10, 0, -60, 80); gr.addColorStop(0, 'rgba(255,160,40,0.55)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, -60, 80, 0, 7); g.fill();
    // legs, body and arms of fire, an outline first
    const shape = () => { g.beginPath(); g.moveTo(-14, 0); g.lineTo(-8, -40); g.lineTo(-22, -72); g.lineTo(-30, -56); g.lineTo(-24, -84); g.lineTo(-10, -86); g.lineTo(-12, -104); g.quadraticCurveTo(0, -122, 12, -104); g.lineTo(10, -86); g.lineTo(26, -84); g.lineTo(32, -60); g.lineTo(22, -70); g.lineTo(8, -40); g.lineTo(14, 0); g.closePath(); };
    shape(); g.fillStyle = '#e04a14'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
    g.save(); shape(); g.clip();
    for (let i = 0; i < 7; i++) fl(-16 + i * 5.4, 4, 9, 60 + (i % 3) * 18, '#ff8a1e', i);
    for (let i = 0; i < 5; i++) fl(-10 + i * 5, 0, 6, 40 + (i % 2) * 20, '#ffd34d', i + 3);
    g.restore();
    for (let i = 0; i < 6; i++) fl(-12 + i * 5, -104, 4, 18 + (i % 3) * 8, i % 2 ? '#ffd34d' : '#ff8a1e', i * 2);
    for (const ex of [-4, 5]) { g.beginPath(); g.ellipse(ex, -100, 2.6, 3.4, 0, 0, 7); g.fillStyle = '#fffbe0'; g.fill(); }
    for (let i = 0; i < 8; i++) { const ph = (t * 0.7 + i / 8) % 1; g.beginPath(); g.arc(Math.sin(i * 2.3) * 30, -40 - ph * 100, 1.8, 0, 7); g.fillStyle = `rgba(255,200,80,${1 - ph})`; g.fill(); }
    g.restore();
  },
  'b-scarabs'(g, t) {
    g.save(); g.scale(1.5, 1.5);
    const beetle = (x, y, s, col, ph) => {
      g.save(); g.translate(x + Math.sin(t * 3 + ph) * 3, y); g.scale(s, s);
      for (const d of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-6 + i * 6, 0); g.lineTo(-8 + i * 6 + Math.sin(t * 12 + i + ph) * 2, d * 9); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke(); }
      g.beginPath(); g.ellipse(0, 0, 11, 8, 0, 0, 7); mFill(g, col, 2);
      g.beginPath(); g.moveTo(0, -8); g.lineTo(0, 8); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke();
      g.beginPath(); g.ellipse(-3, -3, 3, 1.6, -0.4, 0, 7); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fill();
      g.beginPath(); g.arc(12, 0, 4, 0, 7); mFill(g, '#1d2a3a', 1.6);
      g.restore();
    };
    for (let i = 0; i < 16; i++) { const a = i * 2.4 + t * 0.4, r = 22 + (i % 4) * 9; beetle(Math.cos(a) * r * 1.5, -6 + Math.sin(a) * r * 0.45, 0.8, i % 3 ? '#2f9a8a' : '#3f72d9', i); }
    // the great scarab in the middle, carrying a golden sun
    g.save(); g.translate(0, -18); g.scale(2.6, 2.6); beetle(0, 0, 1, '#1f7a6a', 0); g.restore();
    g.beginPath(); g.arc(0, -56 + Math.sin(t * 2) * 3, 14, 0, 7); mFill(g, '#f4c44f', 2.6);
    g.strokeStyle = 'rgba(255,220,100,0.6)'; g.lineWidth = 2; for (let k = 0; k < 8; k++) { const a = k * 0.785 + t; g.beginPath(); g.moveTo(Math.cos(a) * 17, -56 + Math.sin(a) * 17); g.lineTo(Math.cos(a) * 24, -56 + Math.sin(a) * 24); g.stroke(); }
    g.restore();
  },
  'b-sherman'(g, t) {
    g.save(); g.scale(2.4, 2.4);
    const s = Math.sin(t * 1.4), sway = Math.sin(t * 0.8) * 0.03;
    for (const [lx, ph] of [[-12, 0], [12, Math.PI]]) { const k = Math.sin(t * 1.4 + ph); g.beginPath(); g.moveTo(lx, -34); g.quadraticCurveTo(lx + k * 5, -16, lx + k * 8, 0); mStroke(g, 13, '#7a3a24'); }
    g.save(); g.rotate(sway);
    // the great red trunk
    g.beginPath(); g.moveTo(-22, -30); g.quadraticCurveTo(-24, -110, -14, -170); g.lineTo(14, -170); g.quadraticCurveTo(24, -110, 22, -30); g.quadraticCurveTo(0, -24, -22, -30); g.closePath(); mFill(g, '#a4502e');
    g.strokeStyle = '#6e3018'; g.lineWidth = 2; for (const dx of [-12, -4, 6, 14]) { g.beginPath(); g.moveTo(dx, -34); g.quadraticCurveTo(dx + 2, -100, dx - 1, -164); g.stroke(); }
    // arms
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 18, -110); g.quadraticCurveTo(sd * 40, -104 + s * 4, sd * 44, -80 + s * 6); mStroke(g, 7, '#8a4428'); g.beginPath(); g.arc(sd * 46, -80 + s * 6, 9, 0, 7); mFill(g, '#2f6a35', 2); }
    // face and a general's sash with a medal
    for (const ex of [-7, 8]) { g.beginPath(); g.ellipse(ex, -130, 4, 5, 0, 0, 7); mFill(g, '#ffe680', 2); }
    g.beginPath(); g.moveTo(-15, -140); g.lineTo(-2, -136); g.moveTo(3, -136); g.lineTo(16, -140); g.lineWidth = 3.4; g.strokeStyle = '#3b1a0c'; g.stroke();
    g.beginPath(); g.ellipse(0, -114 + s, 6, 3.6, 0, 0, 7); mFill(g, '#3b1a0c', 2);
    g.beginPath(); g.moveTo(-20, -96); g.lineTo(20, -60); g.lineTo(20, -52); g.lineTo(-20, -88); g.closePath(); mFill(g, '#c7362b', 2);
    g.beginPath(); g.arc(4, -76, 5, 0, 7); mFill(g, '#f4c44f', 2);
    // a narrow, tall crown of needles
    for (const [x, y, r] of [[0, -230, 18], [-14, -206, 20], [14, -204, 20], [-18, -180, 22], [18, -178, 22], [0, -190, 24], [0, -250, 12]]) { g.beginPath(); g.arc(x, y, r, 0, 7); mFill(g, '#2f6a35', 2.6); }
    for (const [x, y] of [[-6, -236], [8, -210], [-10, -186]]) { g.beginPath(); g.ellipse(x, y, 6, 3, -0.4, 0, 7); g.fillStyle = 'rgba(160,220,140,0.6)'; g.fill(); }
    g.restore(); g.restore();
  },
  'b-ursa'(g, t) {
    g.save(); g.scale(2.1, 2.1);
    const FUR = '#2b3566', FURD = '#1d2448', step = Math.sin(t * 2.4);
    for (const [lx, ph, c] of [[-26, 0, FURD], [18, 1, FURD], [-18, 2, FUR], [26, 3, FUR]]) { const k = Math.sin(t * 2.4 + ph) * 4; g.beginPath(); g.moveTo(lx, -24); g.lineTo(lx + k, 0); mStroke(g, 12, c); g.beginPath(); g.ellipse(lx + k + 3, 0, 8, 4, 0, 0, 7); mFill(g, c, 2); }
    g.beginPath(); g.ellipse(0, -36, 40, 24, 0, 0, 7); mFill(g, FUR, 3.2);
    g.beginPath(); g.ellipse(-6, -52, 22, 12, 0, 0, 7); g.fillStyle = FUR; g.fill();
    // the Great Bear's stars across its back
    const stars = [[-30, -40], [-18, -50], [-4, -54], [8, -48], [20, -44], [28, -32], [16, -30]];
    g.beginPath(); stars.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.lineWidth = 1.4; g.strokeStyle = 'rgba(200,220,255,0.6)'; g.stroke();
    for (const [x, y] of stars) { g.beginPath(); g.arc(x, y, 2.6 + Math.sin(t * 3 + x) * 0.6, 0, 7); g.fillStyle = '#fff6c0'; g.fill(); }
    // head
    g.save(); g.translate(40, -44 + step);
    g.beginPath(); g.ellipse(0, 0, 18, 15, 0, 0, 7); mFill(g, FUR, 3);
    for (const ex of [-8, 6]) { g.beginPath(); g.arc(ex, -14, 6, 0, 7); mFill(g, FUR, 2.4); }
    g.beginPath(); g.ellipse(14, 4, 10, 7, 0, 0, 7); mFill(g, '#4a5590', 2.4); g.beginPath(); g.arc(22, 2, 3, 0, 7); g.fillStyle = OL; g.fill();
    g.beginPath(); g.arc(4, -4, 2.6, 0, 7); g.fillStyle = '#9fd8ff'; g.fill();
    g.beginPath(); g.moveTo(10, 10); g.lineTo(13, 15); g.lineTo(16, 10); g.closePath(); mFill(g, '#fff', 1.4);
    g.restore();
    g.restore();
  },
  'b-serpent'(g, t) {
    g.save(); g.scale(1.9, 1.9);
    const hov = Math.sin(t * 2) * 5, flap = Math.sin(t * 5);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(0, 2, 36, 7, 0, 0, 7); g.fill();
    g.translate(0, -30 + hov);
    const wing = (a, back) => { g.save(); g.translate(-4, -40); g.rotate(a); for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(-8 - i * 7, -14 - i * 3, 16, 5, -0.6 - i * 0.12, 0, 7); mFill(g, i % 2 ? '#3fbfa8' : back ? '#2f9a8a' : '#f4c44f', 2); } g.restore(); };
    wing(-0.3 - flap * 0.3, true);
    // a coiling body
    g.beginPath(); g.moveTo(-60, 10); for (let i = 0; i <= 20; i++) { const x = -60 + i * 4.8, y = 10 - i * 2.2 + Math.sin(t * 3 + i * 0.6) * 6; g.lineTo(x, y); } mStroke(g, 12, '#2fa86a');
    g.beginPath(); g.moveTo(-60, 10); for (let i = 0; i <= 20; i++) { const x = -60 + i * 4.8, y = 10 - i * 2.2 + Math.sin(t * 3 + i * 0.6) * 6; g.lineTo(x, y); } g.lineWidth = 4; g.strokeStyle = '#f4c44f'; g.setLineDash([4, 6]); g.stroke(); g.setLineDash([]);
    // head with a feathered crest
    const hy = -34 + Math.sin(t * 3 + 12) * 6;
    g.save(); g.translate(40, hy);
    for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(-8 - i * 2, -8 - i * 3, 9, 3, -0.9 - i * 0.2, 0, 7); mFill(g, ['#e0526a', '#f4c44f', '#3fbfa8', '#e0526a', '#f4c44f'][i], 1.6); }
    g.beginPath(); g.moveTo(-8, -6); g.quadraticCurveTo(6, -12, 20, -4); g.quadraticCurveTo(22, 2, 16, 4); g.lineTo(-6, 6); g.closePath(); mFill(g, '#2fa86a', 2.6);
    g.beginPath(); g.arc(6, -4, 2.4, 0, 7); g.fillStyle = '#ffe14d'; g.fill();
    g.beginPath(); g.moveTo(20, 1); g.lineTo(28, 0 + Math.sin(t * 10) * 2); g.lineTo(26, 3); g.lineWidth = 1.6; g.strokeStyle = '#c7362b'; g.stroke();
    g.restore();
    wing(0.2 + flap * 0.35, false);
    g.restore();
  }
});
// bosses are drawn alone and big: the usual shadow is too small for them, and the army's figure count is 1 anyway
{
  const _dm = drawMonster;
  drawMonster = function (g, id, th, t, x, y, k) { if (!id.startsWith('b-')) return _dm(g, id, th, t, x, y, k); const art = MON_ART[id]; g.save(); g.translate(x, y); g.scale(k * 1.6, k * 1.6); g.lineJoin = 'round'; g.lineCap = 'round'; if (Math.sin(th) < -0.2) g.scale(-1, 1); art(g, t); g.restore(); };
}

// ---------- every frame ----------
function stepV95(t, dt) {
  if (!S.started) return;
  stepBossHalt();
  stepFlights();
}
window.__v95 = { pathNbr: (u, p) => pathNbr(u, p, false).map(n => n.q), newWar: (a, b) => newWar(a, b), addScore: (w, o, n) => addScore(w, o, n), peaceCheck: (w, k, p) => peaceCheck(w, k, p), declareWhy: (a, b) => declareWhy(a, b), openDip: o => openDip(o), aimClick: (p, r) => pathAimClick(p, r), cmdUse: id => extraCmdUse(id), select: u => { S.selected = [u]; S.selBuilding = -1; cmdKey = ""; }, look: (p, z) => { const P = G.provs[p]; cam.x = P.ic[0]; cam.y = P.ic[1] - 120; cam.z = z; cacheDirty = true; fogDirty = true; }, dirty: () => { territory = null; cacheDirty = true; fogDirty = true; miniDirty = true; computeFog(); }, S, newArmy, powerOf, rawStrength, troopCount, maxTake, provName, warBetween, renderCountry: () => { countryKey = ""; renderCountry(); }, paintCooldowns, uq, uqKind, isDeathMtn, BOSSES, ARTIFACTS, grantArtifact, hasArt, artStats, bossIn, flyArmy, flyWhy, spawnBosses, cdOf, SKULLS, uqSkip };
