// ================= v78: the GC (graphics), IC (interface) and T (text) list =================
const escHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// map view toggles (above the minimap) and the Provinces-tab filter, saved per browser
const VIEW = { names: false, realm: true, hideFull: false, quickQueue: false, res: true, miniColor: false };
try { const v = JSON.parse(localStorage.getItem('realm-view') || 'null'); if (v) Object.assign(VIEW, v); } catch (e) {}
function viewSave() { try { localStorage.setItem('realm-view', JSON.stringify(VIEW)); } catch (e) {} }
S.warLog = []; S.provRename = new Map(); S.spFound = new Set();
// a set piece shows once one of your Wayfinders has surveyed its province, or once the province is yours (IC04)
const spKnown = p => S.spFound.has(p) || owned(p);

// ---------- GC16: units and their rings are 50% bigger, and another 50% from the F4 zoom level outward ----------
let UKK = 1.5, f4Z = 0;
function unitK() {
  if (!f4Z) return 1.5;
  const z = cam.z, hi = f4Z * 1.35;   // ease in between a little above F4 and F4 itself
  const f = z >= hi ? 0 : z <= f4Z ? 1 : (hi - z) / (hi - f4Z);
  return 1.5 * (1 + 0.5 * f);
}

// ---------- GC20: the selection ring glows and pulses ----------
function selRing(g, x, y, rx, ry, t) {
  const pulse = 1 + Math.sin(t * 6) * 0.14, ripple = (t * 0.9) % 1;
  g.save();
  g.globalAlpha = 0.55 * (1 - ripple); g.beginPath(); g.ellipse(x, y, rx * (1 + ripple * 0.6), ry * (1 + ripple * 0.6), 0, 0, 7); g.lineWidth = 2.5; g.strokeStyle = '#ffe27a'; g.stroke();
  g.globalAlpha = 1;
  g.shadowColor = 'rgba(255,214,90,0.95)'; g.shadowBlur = 14 + Math.sin(t * 6) * 6;
  g.beginPath(); g.ellipse(x, y, rx * pulse, ry * pulse, 0, 0, 7); g.lineWidth = 6; g.strokeStyle = OL; g.stroke();
  g.lineWidth = 3.6; g.strokeStyle = '#ffd34d'; g.stroke();
  g.shadowBlur = 0; g.lineWidth = 1.4; g.strokeStyle = '#fff8d6'; g.stroke();
  g.restore();
}

// ---------- GC23: the province of each selected unit is softly lit ----------
function drawSelProvs(g, t) {
  const ps = new Set(S.selected.filter(u => u.owner === ME && S.explored.has(u.prov)).map(u => u.prov));
  if (!ps.size) return;
  const a = 0.5 + Math.sin(t * 2.4) * 0.12;
  g.save(); g.lineJoin = 'round';
  for (const p of ps) {
    const P = G.provs[p];
    roundedPath(g, P.inner, 12);
    g.globalAlpha = 0.09; g.fillStyle = '#fff6c8'; g.fill();
    g.globalAlpha = a * 0.5; g.lineWidth = Math.max(16, 10 / cam.z); g.strokeStyle = '#ffe27a'; g.stroke();
    g.globalAlpha = a; g.lineWidth = Math.max(4, 2.4 / cam.z); g.strokeStyle = '#fff1b0'; g.stroke();
  }
  g.restore();
}

// ---------- GC18: provinces where your Wayfinders found bandits or monsters glow burgundy until they are beaten ----------
function drawLairGlow(g, t) {
  const done = new Set();
  for (const v of S.units) {
    if (!v.bandit || !v.seen || troopCount(v) <= 0 || done.has(v.prov) || !S.explored.has(v.prov)) continue;
    done.add(v.prov);
    const P = G.provs[v.prov], a = 0.6 + Math.sin(t * 3 + v.prov) * 0.25;
    g.save(); g.lineJoin = 'round';
    roundedPath(g, P.inner, 12);
    g.globalAlpha = 0.18 * a; g.lineWidth = Math.max(70, 30 / cam.z); g.strokeStyle = '#a0103a'; g.stroke();
    g.globalAlpha = 0.35 * a; g.lineWidth = Math.max(30, 14 / cam.z); g.stroke();
    g.globalAlpha = 1; g.lineWidth = Math.max(9, 5 / cam.z); g.strokeStyle = OL; g.stroke();
    g.lineWidth = Math.max(5.5, 3 / cam.z); g.strokeStyle = '#8c1c3a'; g.stroke();
    g.globalAlpha = 0.7 * a; g.lineWidth = Math.max(2, 1.2 / cam.z); g.strokeStyle = '#ff9ab8'; g.stroke();
    g.restore();
  }
}

// ---------- GC01: up to 10 soldiers, shared out by kind (at least one of each kind shown) ----------
function armyFigures(u) {
  const ks = Object.keys(u.troops).filter(k => u.troops[k] > 0), total = ks.reduce((n, k) => n + u.troops[k], 0), shown = Math.min(10, total);
  if (!ks.length) return [];
  const want = ks.map(k => ({ k, n: Math.max(1, Math.floor(shown * u.troops[k] / total)), r: (shown * u.troops[k] / total) % 1 }));
  let sum = want.reduce((n, w) => n + w.n, 0);
  want.sort((a, b) => b.r - a.r);
  for (let i = 0; sum < shown; i = (i + 1) % want.length) if (want[i].n < u.troops[want[i].k]) { want[i].n++; sum++; } else if (want.every(w => w.n >= u.troops[w.k])) break;
  while (sum > shown) { const w = want.slice().sort((a, b) => b.n - a.n)[0]; if (w.n <= 1) break; w.n--; sum--; }
  // infantry in the front ranks, then Mages, then cavalry at the back
  const rank = k => isCav(k) ? 2 : k === MAGE ? 1 : 0, out = [];
  want.sort((a, b) => rank(a.k) - rank(b.k) || b.n - a.n).forEach(w => { for (let i = 0; i < w.n; i++) out.push(w.k); });
  return out;
}

// ---------- GC11: the army's banner carries its nation's flag ----------
const flagCache = new Map();
function ownerFlag(o) {
  const col = (PLAYERS[o] || PLAYERS[RAIDERS]).color, em = o === ME ? NATION.emblem : NATIONS[o] ? NATIONS[o].emblem : 'swords', key = col + em;
  let F = flagCache.get(key); if (F) return F.cv;
  F = { cv: null }; flagCache.set(key, F);
  const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = 192; c.height = 136; c.getContext('2d').drawImage(im, 0, 0, 192, 136); F.cv = c; }; im.src = flagURL(col, em);
  return null;
}
function drawArmyFlag(g, u, px, yFoot, yTop, t, K) {
  const fw = 19 * K, fh = 13.5 * K, top = yTop - fh;
  g.save(); g.lineCap = 'round';
  g.beginPath(); g.moveTo(px, yFoot); g.lineTo(px, top - 3 * K); g.lineWidth = 4.5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.2; g.strokeStyle = '#c99a2c'; g.stroke();
  g.beginPath(); g.arc(px, top - 4 * K, 2.6 * K, 0, 7); g.fillStyle = '#f4c44f'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OL; g.stroke();
  const cv = ownerFlag(u.owner), N = 8;
  if (cv) {
    for (let i = 0; i < N; i++) {
      const f = i / N, dy = Math.sin(t * 5 - i * 0.7) * 1.8 * K * f;
      g.drawImage(cv, i * cv.width / N, 0, cv.width / N + 1, cv.height, px + 1 + f * fw, top + dy, fw / N + 0.6, fh);
    }
  } else { g.fillStyle = (PLAYERS[u.owner] || PLAYERS[RAIDERS]).color; g.fillRect(px + 1, top, fw, fh); }
  g.restore();
}

// ---------- GC12: health bar ----------
function armyHp(u) {
  let full = 0; for (const k in u.troops) if (u.troops[k] > 0) full += u.troops[k] * hpOf(u, k);
  const cur = Math.max(0, full - (u.wounds || 0));
  if (u.battle) { if (u._hpB !== u.battle) { u._hpB = u.battle; u._hp0 = full; } return [cur, Math.max(u._hp0, full, 1)]; }
  u._hpB = null; return [cur, Math.max(full, 1)];
}
function drawArmyHealth(g, u, x, y, w, K) {
  const [cur, max] = armyHp(u), f = Math.max(0, Math.min(1, cur / max)), h = 4.2 * Math.sqrt(K);
  g.save();
  g.beginPath(); g.roundRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3, (h + 3) / 2); g.fillStyle = OL; g.fill();
  g.beginPath(); g.roundRect(x - w / 2, y, w, h, h / 2); g.fillStyle = '#4a3b3b'; g.fill();
  if (f > 0) { g.beginPath(); g.roundRect(x - w / 2, y, Math.max(h, w * f), h, h / 2); g.fillStyle = f > 0.6 ? '#5fd35a' : f > 0.3 ? '#f4c44f' : '#e5483c'; g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - w / 2 + h / 2, y + 0.6, Math.max(0, w * f - h), h * 0.3); }
  g.restore();
}
// ---------- GC10: power under the army ----------
function drawArmyPower(g, u, x, y, t) {
  const k = Math.max(1, 0.62 / cam.z), font = getComputedStyle(document.body).getPropertyValue('--font-display');
  const txt = '⚔ ' + powerOf(u);
  g.save(); g.font = (9.5 * k) + 'px ' + font; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(txt).width + 10 * k, h = 13 * k;
  g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fillStyle = u.owner === ME ? 'rgba(243,228,196,0.92)' : 'rgba(250,224,220,0.92)'; g.fill(); g.lineWidth = 2 * k; g.strokeStyle = OL; g.stroke();
  g.fillStyle = OL; g.fillText(txt, x, y + 0.5 * k);
  g.restore();
}

// ---------- GC21: battle magic that has fired shows as icons over the army, during the battle and for a while after ----------
const MFX_LINE = { skin: 'skin', curse: 'curse', risen: 'risen' }, MFX_AFTER = 15;
const iconImgs = new Map();
const iconImg = url => { let im = iconImgs.get(url); if (!im) { im = new Image(); im.src = url; iconImgs.set(url, im); } return im; };
{
  const _join = onBattleJoin, _end = onBattleEnd;
  onBattleJoin = (a, t) => { _join(a, t); const fired = Object.keys(MFX_LINE).filter(k => a[k]); if (fired.length) a.mfx = { list: fired.map(k => ({ k, tech: lineTech(MFX_LINE[k]) })), until: Infinity }; };
  onBattleEnd = (a, t) => { _end(a, t); if (a.mfx) a.mfx.until = t + MFX_AFTER; };
}
function drawMagicFx(g, u, x, y, t) {
  const m = u.mfx; if (!m) return;
  if (S.t > m.until) { u.mfx = null; return; }
  const k = Math.max(1, 0.62 / cam.z) * 1.1, s = 22 * k, n = m.list.length, fade = isFinite(m.until) ? Math.min(1, (m.until - S.t) / 2) : 1;
  g.save(); g.globalAlpha = fade;
  m.list.forEach((e, i) => {
    const cx = x + (i - (n - 1) / 2) * (s + 4 * k), cy = y - s / 2 + Math.sin(t * 3 + i) * 1.5 * k;
    g.beginPath(); g.arc(cx, cy, s / 2 + 2 * k, 0, 7); g.fillStyle = '#faf1dc'; g.fill(); g.lineWidth = 2.2 * k; g.strokeStyle = OL; g.stroke();
    g.save(); g.shadowColor = '#ffe27a'; g.shadowBlur = 10; g.beginPath(); g.arc(cx, cy, s / 2 + 2 * k, 0, 7); g.lineWidth = 1.4 * k; g.strokeStyle = '#ffd34d'; g.stroke(); g.restore();
    const im = iconImg(techIcon(e.tech)); if (im.complete && im.naturalWidth) g.drawImage(im, cx - s / 2, cy - s / 2, s, s);
  });
  g.restore();
}

// ---------- GC22: a casting Mage lifts his staff overhead; lightning crackles in the school's color ----------
const SCHOOL_BOLT = { life: '#4fe36a', death: '#1d1a22', arcane: '#ff5fc8', pyro: '#ff7a2c' };
const schoolOf = o => (o === ME ? currentSchool() : NATIONS[o] && NATIONS[o].school) || 'arcane';
const schoolColor = o => SCHOOLS[schoolOf(o)].color;
function castUnitId(u) {
  const sc = schoolOf(u.owner), id = MAGE + '#cast-' + sc, base = RealmIso.UNITS[MAGE];
  const U = RealmIso.UNITS[id] || (RealmIso.UNITS[id] = { unit: base.unit, name: base.name, title: base.title, spec: null });
  if (U.base !== base.spec) { U.base = base.spec; U.spec = { ...base.spec, castPose: SCHOOL_BOLT[sc] }; }
  return id;
}

// ---------- GC02 / GC15 / SMA03: Roaming Monsters (Walking Ents, Zombies, Jackal-men) ----------
// sizes: each listed size is equally likely; loot is paid for every one killed, to whoever is fighting them
const MONSTERS = {
  ent: { troop: 'm-ent', sizes: [1, 2, 3], terrain: 'forest', loot: { wood: 100 }, cry: 'Walking Ents!', found: 'a grove of Walking Ents', names: ['Rootwalkers', 'Old Oaks', 'Grove Wardens', 'Barkhides'] },
  zombie: { troop: 'm-zombie', sizes: [2, 4, 6], terrain: 'swamp', loot: { gold: 20 }, cry: 'The Dead Walk!', found: 'a pack of Roaming Zombies', names: ['Restless Dead', 'Bog Shamblers', 'Grave Walkers', 'Mire Dead'] },
  jackal: { troop: 'm-jackal', sizes: [3, 6], terrain: 'desert', loot: { gold: 30 }, cry: 'Jackal-men!', found: 'a Pack of Jackal-men', names: ['Jackal Pack', 'Sandfangs', 'Dune Howlers', 'Khopesh Band'] }
};
const MONSTER_OF_TERRAIN = { forest: 'ent', swamp: 'zombie', desert: 'jackal' };
const MONSTER_LOOT = Object.fromEntries(Object.values(MONSTERS).map(M => [M.troop, M.loot]));
const LAIR_CHANCE = 1 / 7;   // SMA03e: chance a province holds bandits or monsters
// stats (SMA03b–d), taken from the starting designs so they follow any balance change:
//   a Walking Ent is two base Riders in one (double attack and health), a Zombie half a base Footman,
//   a Jackal-man an infantryman with a Long Sword and Chain I armor
{
  const R = DSTATS['d-rider'], F = DSTATS['d-sword'], J = designStats({ type: 'inf', weapon: 'longsword', armor: 'chain1' });
  const st = (o, speed, fam) => ({ cav: false, rough: true, fam, armor: o.armor, shieldArmor: 0, red: o.red, parry: o.parry || 0, atk: o.atk, hp: o.hp, speed, cost: {}, upkeep: {}, blurb: '' });
  DSTATS['m-ent'] = st({ armor: R.armor, red: R.red, atk: R.atk * 2, hp: R.hp * 2 }, 0.5, 'blunt');
  DSTATS['m-zombie'] = st({ armor: F.armor, red: F.red, atk: F.atk / 2, hp: F.hp / 2 }, 0.6, 'blunt');
  DSTATS['m-jackal'] = st({ armor: J.armor, red: J.red, parry: J.parry, atk: J.atk, hp: J.hp }, J.speed, 'sword');
}
UNIT_DEFS['m-ent'] = { name: 'Walking Ent', cost: {}, upkeep: {}, blurb: 'An old tree that has pulled up its roots: as strong as two Riders. 100 wood when felled.' };
UNIT_DEFS['m-zombie'] = { name: 'Zombie', cost: {}, upkeep: {}, blurb: 'The restless dead of the marshes: half a Footman each, but they come in numbers. 20 gold each.' };
UNIT_DEFS['m-jackal'] = { name: 'Jackal-man', cost: {}, upkeep: {}, blurb: 'A desert hunter with a jackal’s head, a long curved sword and mail. 30 gold each.' };
UNIT_SPEED['m-ent'] = 0.5; UNIT_SPEED['m-zombie'] = 0.6; UNIT_SPEED['m-jackal'] = DSTATS['m-jackal'].speed;
let monsterCount = 0;
function spawnMonster(p, kind, n) {
  const M = MONSTERS[kind], c = monsterCount++, a = mkUnit(S.nextId++, 'army', provName(p) + ' ' + M.names[c % M.names.length], p, 0);
  a.owner = RAIDERS; a.troops = { [M.troop]: n || M.sizes[0] }; a.bandit = true; a.monster = kind; a.seen = false; a.arrived = -100;
  a.slot = freeSlot(p, a); [a.x, a.y] = slotPos(p, a.slot); a.th = 0;
  S.units.push(a); return a;
}
const lootText = o => Object.entries(o).map(([k, v]) => v + ' ' + k).join(' and ');
// a monster has fallen: its loot goes to the side fighting it (you, or a nation in the battle)
function monsterLoot(a, k, b) {
  const L = MONSTER_LOOT[k]; if (!L) return;
  if (b.start && b.start[ME] !== undefined && a.owner !== ME) {
    for (const r in L) { S.stock[r] = (S.stock[r] || 0) + L[r]; S.pops.push({ prov: b.prov, t0: S.t, k: r, n: L[r], dx: (Math.random() - 0.5) * 30 }); }
    b.loot = b.loot || {}; for (const r in L) b.loot[r] = (b.loot[r] || 0) + L[r];
    provKey = '';
  } else { const o = Object.keys(b.start || {}).map(Number).find(x => NATIONS[x]); if (o) for (const r in L) NATIONS[o].stock[r] = (NATIONS[o].stock[r] || 0) + L[r]; }
}
// SMA03e: one province in seven holds bandits or monsters, never a capital or a province next to one, never the Intact Ruins.
// Grassland is always bandits; elsewhere it is bandits or the local monster, half and half.
function spawnLairs(skip) {
  const r = rngFrom(world.seed + ':lairs'); monsterCount = 0; banditCount = 0;
  const caps = [...S.buildings].filter(([, b]) => b.stage === 2).map(([p]) => p), near = new Set(caps.flatMap(c => [c, ...allNbr[c]]));
  world.provinces.forEach((P, i) => {
    const roll = r(), coin = r(), size = r();
    if (roll >= LAIR_CHANCE || near.has(i) || skip.has(i) || S.buildings.has(i) || S.units.some(u => u.prov === i)) return;
    const kind = P.terrain !== 'grassland' && coin < 0.5 ? MONSTER_OF_TERRAIN[P.terrain] : null;
    if (!kind) { spawnBandit(i); return; }
    const sizes = MONSTERS[kind].sizes; spawnMonster(i, kind, sizes[Math.floor(size * sizes.length)]);
  });
}

// ---------- SMA04: the Intact Ruins (one per map, in a swamp) ----------
// ---------- SMA02: Forgotten Treasure (1 in 8 desert surveys) ----------
// both are landmarks drawn like set pieces (S.finds), but give their reward once, when your Wayfinder surveys the province
const TREASURE_CHANCE = 1 / 8, TREASURE_GOLD = 200, RUINS_MINUTES = 3;
S.finds = new Map();   // p -> { id: 'ruins' | 'treasure', done }
function placeRuins(avoid = new Set()) {
  const r = rngFrom(world.seed + ':ruins');
  const caps = [...S.buildings].filter(([, b]) => b.stage === 2).map(([p]) => p), near = new Set(caps.flatMap(c => [c, ...allNbr[c]]));
  const ok = world.provinces.map((P, i) => i).filter(i => world.provinces[i].terrain === 'swamp' && !S.buildings.has(i) && !near.has(i) && !S.setpieces.has(i) && !avoid.has(i));
  const any = ok.length ? ok : world.provinces.map((P, i) => i).filter(i => world.provinces[i].terrain === 'swamp' && !S.buildings.has(i) && !avoid.has(i));
  if (!any.length) return -1;
  const p = any[Math.floor(r() * any.length)];
  S.finds.set(p, { id: 'ruins', done: false });
  return p;
}
const findKnown = p => { const f = S.finds.get(p); return !!f && S.explored.has(p) && (f.id === 'ruins' || f.done); };   // the ruins can be seen from afar; treasure only once found
// called when one of your Wayfinders finishes a survey
function surveyFinds(u) {
  const p = u.prov, f = S.finds.get(p), who = u.name || 'Your Wayfinder', where = provName(p);
  if (f && f.id === 'ruins' && !f.done) {
    f.done = true;
    const pick = TECHS.filter(x => x.tree === 'gov' && x.tier === 1 && !x.rep && !S.tech.gov.done.includes(x.id) && reqMet(x, S.tech.gov));
    let note;
    if (pick.length) { const x = pick[Math.floor(Math.random() * pick.length)]; grantTech(x.id); note = `Your nation has just gained the technology <b>${x.name}</b>.`; }
    else { const pts = Math.round(techRate('gov') * RUINS_MINUTES * 60 / TICK); addResearch('gov', pts); note = `Your scholars already know every Tier I Government technology, so they gain ${pts} Government research points instead (${RUINS_MINUTES} minutes’ worth).`; }
    queueFind({ p, title: 'Intact Ruins', said: `<b>${escHTML(who)}</b> has found intact ruins of an ancient temple in <b>${escHTML(where)}</b>! Our findings here will give us a leap forward!`, note, icon: rpIcon('gov') });
  }
  if (world.provinces[p].terrain === 'desert' && !S.finds.has(p) && !S.treasureRolled.has(p)) {
    S.treasureRolled.add(p);
    if (rngFrom(world.seed + ':treasure:' + p)() < TREASURE_CHANCE) {
      S.finds.set(p, { id: 'treasure', done: true });
      S.stock.gold += TREASURE_GOLD; S.pops.push({ prov: p, t0: S.t, k: 'gold', n: TREASURE_GOLD, dx: 0 });
      queueFind({ p, title: 'Forgotten Treasure', said: `<b>${escHTML(who)}</b> has found a forgotten treasure in the sand of <b>${escHTML(where)}</b>!`, note: `Its gold comes home to your treasury: <b>+${TREASURE_GOLD} gold</b>.`, icon: null });
    }
  }
}
S.treasureRolled = new Set();
// give a technology outright, as if it had just been researched
function grantTech(id) {
  const x = TECH_BY_ID[id], st = S.tech[x.tree];
  if (st.done.includes(id)) return;
  if (st.cur === id) { st.bank = st.prog; st.prog = 0; st.cur = null; }
  st.done.push(id); st.opts = st.opts.filter(o => o !== id); if (st.sticky) st.sticky = st.sticky.filter(o => o !== id);
  if (id === 'retained' || id === 'retained2') for (const t2 of TREE_KEYS) if (S.tech[t2].tier) topUpOptions(t2);
  topUpOptions(x.tree); computeIncome();
  sfx('pr_research'); techKey = ''; techBtnKey = ''; provKey = ''; cmdKey = ''; barKey = '';
}
// research points straight into a tree: into what it is researching, otherwise saved up (not cut back by the idle limit)
function addResearch(tree, pts) {
  const st = S.tech[tree];
  if (st.cur) {
    st.prog += pts; const x = TECH_BY_ID[st.cur], cost = techCost(x);
    if (st.prog >= cost) { const left = st.prog - cost; finishTech(tree); st.bank = Math.max(st.bank, left); }
  } else st.bank += pts;
  techKey = ''; techBtnKey = '';
}
const findQueue = [];
let findPausedByMe = false;
function queueFind(f) { findQueue.push(f); }
function showNextFind() {
  const el = $q('#findPop'); if (!el.hidden || !findQueue.length || !$q('#spPop').hidden) return;
  const f = findQueue.shift();
  el.innerHTML = `<button type="button" class="pop-x" data-fp="ok" aria-label="Dismiss" title="Dismiss">×</button><h2 id="findPopT">${f.icon ? `<img class="sp-ico" alt="" src="${f.icon}">` : ''}${f.head || 'Discovery!'}<span>${f.title} at ${escHTML(provName(f.p))}</span></h2><p class="sp-said">${f.said}</p>${f.note ? `<p>${f.note}</p>` : ''}<div class="dm-btns"><button type="button" data-fp="look">Show me</button><button type="button" data-fp="ok">OK</button></div>`;
  el.dataset.prov = f.p; el.hidden = false; sfx('wn_ally');
  const ok = el.querySelector('.dm-btns [data-fp="ok"]'); if (ok) ok.focus({ preventScroll: true });
}
{
  const el = $q('#findPop');
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape' || e.key === 'Enter') el.hidden = true; });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-fp]'); if (!b) return;
    if (b.dataset.fp === 'look') { const p = +el.dataset.prov, P = G.provs[p], [ox, oy] = findSpot(p); flyTo({ x: P.ic[0] + ox, y: P.ic[1] + oy, z: Math.max(cam.z, fitZ * 2.6 * WORLD_K) }); }
    el.hidden = true;
  });
}
// the landmark's spot: the set piece spot, or its mirror image if a set piece already stands there
const findSpot = p => { const [x, y] = spSpot(p); return S.setpieces.has(p) && spKnown(p) ? [-x, y] : [x, y]; };
function findItems(g, t, items, onScreen) {
  for (const [p, f] of S.finds) {
    if (!findKnown(p) || !onScreen(p)) continue;
    const c = G.provs[p].ic, [ox, oy] = findSpot(p), x = c[0] + ox, y = c[1] + oy;
    items.push({ y, f: () => (f.id === 'ruins' ? drawRuinsArt : drawTreasureArt)(g, x, y, t, f.done) });
  }
}
function drawRuinsArt(g, x, y, t, done) {
  g.save(); g.translate(x, y); g.scale(1.25, 1.25); g.lineJoin = 'round'; g.lineCap = 'round';
  const ink = (w = 2.6) => { g.lineWidth = w; g.strokeStyle = OL; g.stroke(); }, ST = '#cfc8b6', STD = '#a9a190', MOSS = '#6aa84f';
  g.globalAlpha = 0.25; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 6, 58, 16, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  // stepped platform
  for (const [w, h, yy] of [[56, 7, 0], [48, 7, -7], [40, 6, -14]]) { g.beginPath(); g.rect(-w, yy - h, w * 2, h); g.fillStyle = yy === 0 ? STD : ST; g.fill(); ink(2.2); }
  // back wall with a doorway
  g.beginPath(); g.moveTo(-30, -20); g.lineTo(-30, -58); g.lineTo(30, -58); g.lineTo(30, -20); g.closePath(); g.fillStyle = STD; g.fill(); ink(2.2);
  g.beginPath(); g.moveTo(-9, -20); g.lineTo(-9, -40); g.quadraticCurveTo(0, -50, 9, -40); g.lineTo(9, -20); g.closePath(); g.fillStyle = '#2d2a26'; g.fill(); ink(2);
  if (!done) { const a = 0.4 + 0.25 * Math.sin(t * 2); g.fillStyle = `rgba(255,226,122,${a})`; g.beginPath(); g.ellipse(0, -28, 5, 7, 0, 0, 7); g.fill(); }
  // pediment, broken on the right
  g.beginPath(); g.moveTo(-38, -58); g.lineTo(-38, -64); g.lineTo(0, -82); g.lineTo(14, -75); g.lineTo(18, -70); g.lineTo(24, -66); g.lineTo(38, -64); g.lineTo(38, -58); g.closePath(); g.fillStyle = ST; g.fill(); ink(2.4);
  g.beginPath(); g.arc(-4, -67, 4, 0, 7); g.fillStyle = STD; g.fill(); ink(1.6);
  // columns: two whole, one broken, one fallen
  const col = (cx, h) => { g.beginPath(); g.rect(cx - 5, -20 - h, 10, h); g.fillStyle = '#e4ddcf'; g.fill(); ink(2); g.beginPath(); g.rect(cx - 7, -24 - h, 14, 4); g.fillStyle = ST; g.fill(); ink(1.8); for (const dx of [-2, 2]) { g.beginPath(); g.moveTo(cx + dx, -20); g.lineTo(cx + dx, -20 - h + 2); g.lineWidth = 1; g.strokeStyle = 'rgba(29,26,34,0.35)'; g.stroke(); } };
  col(-38, 34); col(-22, 34); col(22, 34);
  g.beginPath(); g.moveTo(33, -20); g.lineTo(33, -36); g.lineTo(36, -40); g.lineTo(39, -35); g.lineTo(43, -38); g.lineTo(43, -20); g.closePath(); g.fillStyle = '#e4ddcf'; g.fill(); ink(2);
  g.save(); g.translate(44, 2); g.rotate(-0.12); g.beginPath(); g.rect(-6, -5, 26, 9); g.fillStyle = '#e4ddcf'; g.fill(); ink(2); g.restore();
  // vines and moss
  g.lineWidth = 2.6; g.strokeStyle = MOSS;
  for (const [x0, y0, y1] of [[-36, -58, -34], [-20, -58, -40], [26, -66, -46]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 5, (y0 + y1) / 2, x0 - 1, y1); g.stroke(); }
  for (const [mx, my, r] of [[-48, -2, 6], [40, -6, 5], [-10, -60, 5], [18, -4, 4]]) { g.beginPath(); g.ellipse(mx, my, r * 1.4, r * 0.7, 0, 0, 7); g.fillStyle = MOSS; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke(); }
  // swamp water at the foot
  g.beginPath(); g.ellipse(-46, 8, 14, 4, 0, 0, 7); g.fillStyle = '#5b8f86'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
  g.restore();
}
function drawTreasureArt(g, x, y, t) {
  g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineCap = 'round';
  const ink = (w = 2.4) => { g.lineWidth = w; g.strokeStyle = OL; g.stroke(); };
  g.globalAlpha = 0.22; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 4, 40, 11, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  g.beginPath(); g.ellipse(0, 0, 38, 12, 0, Math.PI, 0); g.lineTo(38, 0); g.ellipse(0, 0, 38, 6, 0, 0, Math.PI); g.closePath(); g.fillStyle = '#e8cf95'; g.fill(); ink();
  // the open chest, half buried
  g.beginPath(); g.moveTo(-18, -2); g.lineTo(-18, -20); g.lineTo(18, -20); g.lineTo(18, -2); g.closePath(); g.fillStyle = '#8a5a34'; g.fill(); ink();
  g.beginPath(); g.moveTo(-18, -20); g.lineTo(-14, -40); g.quadraticCurveTo(0, -46, 14, -40); g.lineTo(18, -20); g.closePath(); g.fillStyle = '#6d4426'; g.fill(); ink();
  for (const bx of [-12, 12]) { g.beginPath(); g.rect(bx - 2, -20, 4, 18); g.fillStyle = '#f4c44f'; g.fill(); ink(1.4); }
  // coins heaped in the chest and spilled on the sand, glinting
  for (const [cx, cy] of [[-10, -21], [-3, -24], [5, -22], [12, -21], [0, -19], [22, 2], [27, -1], [-24, 3]]) { g.beginPath(); g.ellipse(cx, cy, 4.2, 2.6, 0, 0, 7); g.fillStyle = '#ffd34d'; g.fill(); ink(1.3); }
  for (let k = 0; k < 3; k++) { const ph = (t * 1.3 + k * 0.37) % 1, sx = [-6, 8, 24][k], sy = [-28, -26, -4][k], s = Math.sin(ph * Math.PI) * 5; if (s < 0.5) continue; g.beginPath(); g.moveTo(sx - s, sy); g.lineTo(sx + s, sy); g.moveTo(sx, sy - s); g.lineTo(sx, sy + s); g.lineWidth = 1.6; g.strokeStyle = '#fff'; g.stroke(); }
  g.restore();
}

// ---------- SMA01: Lost bands of travelers ----------
// a few wander in free provinces. When one of your units reaches them they ask for food: feed them and they join you as Footmen,
// or rob them for gold (an army must be there). Leave them and they ask again the next time you come by.
const TRAVELERS = { foodEach: 20, goldEach: 30, foodCaught: 30, sizes: [3, 4, 5] };   // Swamplings can't recruit travelers: their Berserkers capture them for food instead
S.travelers = [];
function placeTravelers(skip) {
  const r = rngFrom(world.seed + ':travelers'), want = Math.max(2, Math.round(world.provinces.length / 40));
  const caps = [...S.buildings].filter(([, b]) => b.stage === 2).map(([p]) => p), near = new Set(caps.flatMap(c => [c, ...allNbr[c]]));
  const ok = world.provinces.map((P, i) => i).filter(i => !near.has(i) && !skip.has(i) && !S.buildings.has(i) && !S.units.some(u => u.prov === i));
  for (let k = 0; k < want && ok.length; k++) {
    const p = ok.splice(Math.floor(r() * ok.length), 1)[0], n = TRAVELERS.sizes[Math.floor(r() * TRAVELERS.sizes.length)], c = G.provs[p].ic;
    const folk = []; for (let i = 0; i < n; i++) { const fr = rngFrom(world.seed + ':trav:' + p + ':' + i); folk.push({ col: CIV_TUNIC[Math.floor(fr() * CIV_TUNIC.length)], skin: CIV_SKIN[Math.floor(fr() * CIV_SKIN.length)], hat: fr() < 0.6 ? 'hood' : 'straw', sack: fr() < 0.6, ph: fr() * 6, born: -99, moving: false, x: 0, y: 0, dir: 1 }); }
    S.travelers.push({ id: k, prov: p, n, x: c[0] - 60, y: c[1] + 40, tx: null, ty: null, wait: 2 + r() * 6, asked: false, folk });
  }
}
function stepTravelers(dt) {
  for (const B of S.travelers) {
    // a slow amble about their province
    if (B.tx === null) { B.wait -= dt; if (B.wait <= 0) { const P = G.provs[B.prov], q = P.inner[Math.floor(Math.random() * P.inner.length)], f = 0.35 + Math.random() * 0.3; [B.tx, B.ty] = clampInto(B.prov, P.ic[0] + (q[0] - P.ic[0]) * f, P.ic[1] + (q[1] - P.ic[1]) * f); } }
    else { const dx = B.tx - B.x, dy = B.ty - B.y, d = Math.hypot(dx, dy), sp = CIV_SPEED * 0.8 * dt; if (d <= sp) { B.x = B.tx; B.y = B.ty; B.tx = null; B.wait = 6 + Math.random() * 10; } else { B.x += dx / d * sp; B.y += dy / d * sp; B.dir = dx < 0 ? -1 : 1; } }
    const here = S.units.some(u => u.owner === ME && u.prov === B.prov && !u.moving);
    if (!here) { B.asked = false; continue; }
    if (!B.asked && !travBand && !S.fallen) { B.asked = true; showTravPop(B); }
  }
}
function travelerItems(g, t, items) {
  for (const B of S.travelers) {
    if (!S.visible.has(B.prov) || !inViewPt(B.x, B.y)) continue;
    const walking = B.tx !== null;
    items.push({ y: B.y, f: () => drawTravelers(g, B, t, walking) });
  }
}
const inViewPt = (x, y) => Math.abs(x - cam.x) < cw / 2 / cam.z + 120 && Math.abs(y - cam.y) < ch / 2 / cam.z + 160;
function drawTravelers(g, B, t, walking) {
  const x = B.x, y = B.y, dir = B.dir || 1;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  // a handcart piled with bundles
  g.save(); g.translate(x + 26 * dir, y - 2); g.scale(dir, 1);
  g.beginPath(); g.moveTo(-14, -8); g.lineTo(34, -8); g.lineWidth = 5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.4; g.strokeStyle = '#8a5a34'; g.stroke();
  g.beginPath(); g.rect(-14, -20, 24, 12); g.fillStyle = '#a0703f'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OL; g.stroke();
  for (const [bx, by, r, c] of [[-8, -24, 6, '#d9c39a'], [2, -25, 7, '#b5643c'], [-2, -31, 5, '#7a8fb5']]) { g.beginPath(); g.ellipse(bx, by, r, r * 0.8, 0, 0, 7); g.fillStyle = c; g.fill(); g.lineWidth = 1.8; g.stroke(); }
  g.beginPath(); g.arc(-2, -3, 6, 0, 7); g.fillStyle = '#6d4426'; g.fill(); g.lineWidth = 2; g.stroke();
  g.restore();
  // the travelers; when resting, a little campfire in their midst
  if (!walking) {
    const fx = x - 4, fy = y + 6, fl = 1 + Math.sin(t * 9) * 0.15;
    g.beginPath(); g.ellipse(fx, fy, 9, 3.5, 0, 0, 7); g.fillStyle = '#6d4426'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.moveTo(fx - 5, fy); g.quadraticCurveTo(fx - 4, fy - 10 * fl, fx, fy - 14 * fl); g.quadraticCurveTo(fx + 4, fy - 10 * fl, fx + 5, fy); g.closePath(); g.fillStyle = '#ff9a3c'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(fx - 2, fy); g.quadraticCurveTo(fx, fy - 8 * fl, fx + 2, fy); g.fillStyle = '#ffe27a'; g.fill();
  }
  B.folk.forEach((f, i) => {
    const a = walking ? 0 : (i / B.folk.length) * Math.PI * 2 + 0.6;
    f.x = walking ? x - i * 9 * dir : x - 4 + Math.cos(a) * 18; f.y = walking ? y + (i % 2) * 5 : y + 6 + Math.sin(a) * 9;
    f.dir = walking ? dir : (Math.cos(a) > 0 ? -1 : 1); f.moving = walking;
  });
  B.folk.slice().sort((p, q) => p.y - q.y).forEach(f => drawCiv(g, f, t));
  // a small "?" over their heads until you deal with them
  const k = Math.max(1, 0.62 / cam.z), qx = x - 4, qy = y - 40 + Math.sin(t * 3) * 2;
  g.beginPath(); g.arc(qx, qy, 8 * k, 0, 7); g.fillStyle = '#faf1dc'; g.fill(); g.lineWidth = 2 * k; g.strokeStyle = OL; g.stroke();
  g.font = (13 * k) + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = OL; g.fillText('?', qx, qy + 1);
  g.restore();
}
let travBand = null, travPausedByMe = false;
function showTravPop(B) {
  travBand = B;
  const el = $q('#travPop'), food = B.n * TRAVELERS.foodEach, gold = B.n * TRAVELERS.goldEach;
  const army = S.units.some(u => u.owner === ME && u.kind === 'army' && u.prov === B.prov && troopCount(u) > 0 && !u.battle);
  const canFeed = (S.stock.food || 0) >= food;
  if (!S.paused) { togglePause(); travPausedByMe = true; }
  $q('#paused').hidden = true;
  el.innerHTML = `<button type="button" class="pop-x" data-tv="leave" aria-label="Dismiss" title="Dismiss">×</button><h2 id="travPopT">A lost band of travelers<span>at ${escHTML(provName(B.prov))}</span></h2><p>${isSw(ME) ? `${B.n} weary travelers have lost their way. They eye your Swamplings fearfully and won’t take up arms for you, but your Berserkers could drag them off to the larder.` : `${B.n} weary travelers have lost their way. They are hungry, and ask if you can spare them some food. Fed, they would gladly take up arms for you.`}</p>
  <div class="dm-btns trav-btns">${isSw(ME) ? `<button type="button" data-tv="capture"${army ? '' : ' disabled'} title="${army ? '' : 'You need Berserkers in this province'}">Capture them<small>+${B.n * TRAVELERS.foodCaught} food${army ? '' : ' · needs Berserkers here'}</small></button>` : `<button type="button" data-tv="feed"${canFeed ? '' : ' disabled'} title="${canFeed ? '' : 'Not enough food'}">Share ${food} food<small>${B.n} Footmen join you</small></button>`}<button type="button" data-tv="rob"${army ? '' : ' disabled'} title="${army ? '' : 'You need an army in this province'}">Rob them<small>+${gold} gold${army ? '' : ' · needs an army here'}</small></button><button type="button" data-tv="leave">Leave them be<small>They ask again next time</small></button></div><div class="dm-btns"><button type="button" data-tv="look">Show me</button><button type="button" data-tv="leave">OK</button></div>`;
  el.hidden = false; sfx('wn_ally');
  setTimeout(() => { const b = el.querySelector('.dm-btns [data-tv="leave"]'); if (b) b.focus({ preventScroll: true }); }, 30);
}
function closeTravPop() {
  $q('#travPop').hidden = true; travBand = null;
  if (travPausedByMe && S.paused) togglePause(); else $q('#paused').hidden = !S.paused;
  travPausedByMe = false;
}
function travelersChoose(how) {
  const B = travBand; if (!B) return;
  if (how === 'feed') {
    const food = B.n * TRAVELERS.foodEach; if ((S.stock.food || 0) < food) return toast('Not enough food to share.', true);
    S.stock.food -= food;
    let a = S.units.find(u => u.owner === ME && u.kind === 'army' && u.prov === B.prov && !u.battle && !u.moving);
    if (a) { a.troops['d-sword'] = (a.troops['d-sword'] || 0) + B.n; a.grew = S.t; }
    else { a = newArmy(B.prov, { 'd-sword': B.n }); }
    S.travelers = S.travelers.filter(x => x !== B); computeIncome(); rosterKey = ''; cmdKey = '';
    toast(`The travelers eat their fill and swear to serve you: ${B.n} Footmen join ${a.name}.`);
  } else if (how === 'capture') {
    const army = S.units.some(u => u.owner === ME && u.kind === 'army' && u.prov === B.prov && troopCount(u) > 0 && !u.battle);
    if (!army) return toast('You need Berserkers in this province to capture them.', true);
    const food = B.n * TRAVELERS.foodCaught;
    S.stock.food += food; clampStock(); S.pops.push({ prov: B.prov, t0: S.t, k: 'food', n: food, dx: 0 });
    S.travelers = S.travelers.filter(x => x !== B);
    toast(`Your Berserkers round up the travelers and haul them off to the larder: +${food} food.`);
  } else if (how === 'rob') {
    const gold = B.n * TRAVELERS.goldEach;
    S.stock.gold += gold; S.pops.push({ prov: B.prov, t0: S.t, k: 'gold', n: gold, dx: 0 });
    S.travelers = S.travelers.filter(x => x !== B);
    toast(`Your soldiers rob the travelers of ${gold} gold. They flee into the wilds.`);
  }
  closeTravPop();
}
{
  const el = $q('#travPop');
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') travelersChoose('leave'); });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-tv]'); if (!b || b.disabled) return;
    if (b.dataset.tv === 'look') { const B = travBand; if (B) flyTo({ x: B.x, y: B.y, z: Math.max(cam.z, fitZ * 2.6 * WORLD_K) }); return; }   // the choice stays open
    travelersChoose(b.dataset.tv);
  });
}

// bandits and monsters wander along the edges of their own province; they stand and fight when an enemy army comes in
function patrolPoint(p) {
  const P = G.provs[p], q = P.inner, i = Math.floor(Math.random() * q.length), j = (i + 1) % q.length, f = Math.random();
  const ex = q[i][0] + (q[j][0] - q[i][0]) * f, ey = q[i][1] + (q[j][1] - q[i][1]) * f, pull = 0.14 + Math.random() * 0.14;
  return clampInto(p, ex + (P.ic[0] - ex) * pull, ey + (P.ic[1] - ey) * pull);
}
function stepPatrols(t, dt) {
  for (const u of S.units) {
    if (!u.bandit || u.kind !== 'army' || troopCount(u) <= 0) continue;
    if (u.battle || u.moving || hostilesIn(u.prov, u.owner).length) { u.patrolling = false; u.pt = null; continue; }
    if (!u.pt) { if ((u.ptWait || 0) > t) continue; u.pt = patrolPoint(u.prov); }
    const [tx, ty] = u.pt, dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy), sp = SPEED * unitSpeed(u) * 0.45 * dt;
    if (d > 0.5) u.th = Math.round(Math.atan2(dx, dy) / (Math.PI / 4)) * (Math.PI / 4);
    if (d <= sp) { u.x = tx; u.y = ty; u.pt = null; u.patrolling = false; u.ptWait = t + 2 + Math.random() * 6; u.th = 0; }
    else { u.x += dx / d * sp; u.y += dy / d * sp; u.patrolling = true; }
  }
}
// ----- monster art: drawn in the same units as the soldiers (feet at 0,0; about 120 tall), facing right -----
function mStroke(g, w, col) { g.lineWidth = w + 4; g.strokeStyle = OL; g.stroke(); g.lineWidth = w; g.strokeStyle = col; g.stroke(); }
function mFill(g, col, lw = 3) { g.fillStyle = col; g.fill(); g.lineWidth = lw; g.strokeStyle = OL; g.stroke(); }
const MON_ART = {
  'm-ent'(g, t) {
    const s = Math.sin(t * 2.4), sway = Math.sin(t * 1.2) * 0.04;
    // back arm (a branch)
    const arm = (side, ph) => {
      const a = Math.sin(t * 2.4 + ph) * 0.35, sx = side * 16, sy = -96, hx = sx + side * 30 + Math.sin(a) * 10, hy = -64 + Math.cos(a) * 6;
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + side * 18, sy - 2, hx, hy); mStroke(g, 7, '#7b5029');
      for (const [dx, dy] of [[side * 9, 6], [side * 10, -4], [side * 3, 10]]) { g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + dx, hy + dy); mStroke(g, 2.6, '#7b5029'); }
      g.beginPath(); g.arc(hx + side * 6, hy - 4, 5, 0, 7); mFill(g, '#5fae4a', 2);
    };
    arm(-1, Math.PI);
    // legs: two roots that step
    for (const [lx, ph] of [[-10, 0], [10, Math.PI]]) {
      const k = Math.sin(t * 2.4 + ph), up = Math.max(0, k) * 5;
      g.beginPath(); g.moveTo(lx, -40); g.quadraticCurveTo(lx + k * 5, -20, lx + k * 8, -up); mStroke(g, 11, '#6d4426');
      for (const d of [-6, 0, 6]) { g.beginPath(); g.moveTo(lx + k * 8, -up); g.lineTo(lx + k * 8 + d * 1.4 + 4, 2 - up); mStroke(g, 2.6, '#6d4426'); }
    }
    g.save(); g.rotate(sway);
    // trunk
    g.beginPath(); g.moveTo(-20, -34); g.quadraticCurveTo(-26, -80, -16, -118); g.quadraticCurveTo(0, -128, 16, -118); g.quadraticCurveTo(26, -80, 20, -34); g.quadraticCurveTo(0, -28, -20, -34); g.closePath(); mFill(g, '#8a5a34');
    g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-20, -130, 12, 100); g.restore();
    g.strokeStyle = '#5e3b1e'; g.lineWidth = 2;
    for (const [x0, y0, y1] of [[-11, -44, -70], [12, -40, -62], [-4, -104, -116], [8, -112, -100]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 3, (y0 + y1) / 2, x0 - 1, y1); g.stroke(); }
    g.beginPath(); g.ellipse(-12, -54, 5, 3, 0.4, 0, 7); mFill(g, '#6aa84f', 1.5);
    // face: heavy brows, glowing eyes, a hollow mouth
    for (const ex of [-7, 9]) { g.beginPath(); g.ellipse(ex, -92, 4.2, 5, 0, 0, 7); mFill(g, '#ffe680', 2); g.beginPath(); g.arc(ex + 1, -91, 1.6, 0, 7); g.fillStyle = '#7a4a10'; g.fill(); }
    g.beginPath(); g.moveTo(-14, -100); g.lineTo(-2, -97); g.moveTo(3, -97); g.lineTo(16, -101); g.lineWidth = 3.6; g.strokeStyle = '#3b2414'; g.stroke();
    g.beginPath(); g.ellipse(1, -76 + s * 0.6, 6, 4 + Math.abs(s), 0, 0, 7); mFill(g, '#3b2414', 2);
    // crown of leaves
    for (const [x, y, r, c] of [[-20, -124, 17, '#3f8a3a'], [20, -122, 16, '#3f8a3a'], [-8, -140, 20, '#4f9a3f'], [12, -142, 19, '#4f9a3f'], [2, -126, 18, '#5fae4a']]) { g.beginPath(); g.arc(x, y, r, 0, 7); mFill(g, c, 2.6); }
    for (const [x, y] of [[-12, -146], [8, -148], [-2, -132]]) { g.beginPath(); g.ellipse(x, y, 6, 3.4, -0.5, 0, 7); g.fillStyle = 'rgba(190,240,140,0.7)'; g.fill(); }
    g.restore();
    arm(1, 0);
  },
  'm-zombie'(g, t) {
    const ph = t * 2.2, drag = Math.sin(ph), bob = Math.abs(Math.sin(ph)) * 2;
    const SK = '#9fbf7a', SKD = '#7f9e5c', CL = '#7a6f8f', PN = '#4a4458';
    // legs: one steps, one drags
    g.beginPath(); g.moveTo(-5, -36); g.lineTo(-8 + drag * 6, -16); g.lineTo(-12 + drag * 8, 0); mStroke(g, 6, PN);
    g.beginPath(); g.moveTo(6, -36); g.lineTo(8 - drag * 3, -16); g.lineTo(12 - drag * 4, 0); mStroke(g, 6, PN);
    for (const fx of [-12 + drag * 8, 12 - drag * 4]) { g.beginPath(); g.ellipse(fx + 3, 0, 6, 3, 0, 0, 7); mFill(g, SKD, 2); }
    g.save(); g.translate(0, -bob); g.rotate(0.14);
    // back arm, stretched forward
    g.beginPath(); g.moveTo(2, -62); g.lineTo(30, -60 + Math.sin(ph + 1) * 2); mStroke(g, 5.5, SKD); g.beginPath(); g.arc(32, -60 + Math.sin(ph + 1) * 2, 4, 0, 7); mFill(g, SKD, 2);
    // torso in a torn shirt
    g.beginPath(); g.moveTo(-13, -70); g.lineTo(13, -70); g.lineTo(15, -40); g.lineTo(10, -35); g.lineTo(6, -40); g.lineTo(1, -34); g.lineTo(-4, -40); g.lineTo(-9, -35); g.lineTo(-14, -40); g.closePath(); mFill(g, CL);
    g.beginPath(); g.ellipse(-4, -55, 3, 4, 0.3, 0, 7); g.fillStyle = SK; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.moveTo(-13, -46); g.lineTo(14, -46); g.lineWidth = 3; g.strokeStyle = '#5b4a3a'; g.stroke();
    // head, lolling
    g.save(); g.translate(5, -84); g.rotate(0.25 + Math.sin(ph * 0.5) * 0.08);
    g.beginPath(); g.ellipse(0, 0, 13, 14, 0, 0, 7); mFill(g, SK);
    g.beginPath(); g.arc(4, 3, 5, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(5, 4, 1.4, 0, 7); g.fillStyle = OL; g.fill();
    g.beginPath(); g.moveTo(-8, 0); g.lineTo(-3, 4); g.moveTo(-8, 4); g.lineTo(-3, 0); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.moveTo(-6, 9); g.lineTo(-2, 11); g.lineTo(1, 9); g.lineTo(4, 11); g.lineTo(8, 9); g.lineWidth = 2; g.stroke();
    g.beginPath(); g.rect(1, 9, 2.4, 3); g.fillStyle = '#fff'; g.fill();
    g.beginPath(); g.moveTo(-7, -8); g.lineTo(5, -10); for (let x = -5; x <= 3; x += 4) { g.moveTo(x, -11); g.lineTo(x + 1, -7); } g.lineWidth = 1.4; g.strokeStyle = '#3b3048'; g.stroke();
    for (const [x, y] of [[-8, -12], [-2, -14], [4, -13]]) { g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x - 2, y - 4); g.lineWidth = 3; g.strokeStyle = '#3b3048'; g.stroke(); }
    g.restore();
    // front arm, stretched forward
    g.beginPath(); g.moveTo(-2, -64); g.lineTo(10, -63); mStroke(g, 7, CL); g.beginPath(); g.moveTo(10, -63); g.lineTo(34, -64 + Math.sin(ph) * 2); mStroke(g, 5.5, SK); g.beginPath(); g.arc(36, -64 + Math.sin(ph) * 2, 4.2, 0, 7); mFill(g, SK, 2);
    g.restore();
  },
  'm-jackal'(g, t) {
    const ph = t * 3, step = Math.sin(ph), swing = Math.pow(Math.max(0, Math.sin(t * 2.6)), 3);
    const FUR = '#c9a066', FURD = '#a07a44', BELLY = '#e6c891', GOLD = '#f4c44f';
    // tail
    g.beginPath(); g.moveTo(-10, -46); g.quadraticCurveTo(-30, -44 + step * 3, -34, -26); mStroke(g, 7, FURD);
    g.beginPath(); g.arc(-34, -26, 4.4, 0, 7); mFill(g, '#3b2a1a', 2);
    // legs: jackal-jointed
    for (const [hx, k, col] of [[-5, -step, FURD], [5, step, FUR]]) {
      g.beginPath(); g.moveTo(hx, -44); g.lineTo(hx + 3 + k * 4, -27); g.lineTo(hx - 5 + k * 5, -12); g.lineTo(hx + 1 + k * 6, 0); mStroke(g, 6, col);
      g.beginPath(); g.ellipse(hx + 4 + k * 6, 0, 5.5, 2.6, 0, 0, 7); mFill(g, '#3b2a1a', 2);
    }
    // back arm
    g.beginPath(); g.moveTo(-6, -72); g.lineTo(-14, -56); g.lineTo(-8, -46); mStroke(g, 5, FURD);
    // kilt and belt
    g.beginPath(); g.moveTo(-13, -50); g.lineTo(13, -50); g.lineTo(16, -34); g.lineTo(-15, -34); g.closePath(); mFill(g, '#efe6cf', 2.6);
    g.beginPath(); g.moveTo(0, -50); g.lineTo(0, -34); g.lineWidth = 1.5; g.strokeStyle = '#c9b48e'; g.stroke();
    // chest
    g.beginPath(); g.moveTo(-12, -80); g.quadraticCurveTo(-16, -62, -11, -48); g.lineTo(12, -48); g.quadraticCurveTo(16, -64, 12, -80); g.closePath(); mFill(g, FUR);
    g.beginPath(); g.ellipse(2, -62, 6, 10, 0, 0, 7); g.fillStyle = BELLY; g.fill();
    g.beginPath(); g.rect(-13, -52, 26, 4); mFill(g, GOLD, 2);
    // broad collar
    g.beginPath(); g.ellipse(0, -80, 14, 5, 0, 0, Math.PI); mFill(g, GOLD, 2.2); g.beginPath(); g.ellipse(0, -79, 10, 3, 0, 0, Math.PI); g.lineWidth = 1.6; g.strokeStyle = '#3f72d9'; g.stroke();
    // head: long snout, tall ears
    g.save(); g.translate(2, -92);
    for (const [x0, x1, x2] of [[-8, -11, -1], [1, 4, 9]]) { g.beginPath(); g.moveTo(x0, -6); g.lineTo(x1, -30); g.lineTo(x2, -8); g.closePath(); mFill(g, FURD, 2.4); g.beginPath(); g.moveTo(x0 + 2.5, -8); g.lineTo(x1 + 1, -24); g.lineTo(x2 - 2.5, -9); g.closePath(); g.fillStyle = '#e8a07a'; g.fill(); }
    g.beginPath(); g.moveTo(-11, 2); g.quadraticCurveTo(-11, -12, 2, -11); g.quadraticCurveTo(10, -10, 14, -4); g.lineTo(26, 1); g.quadraticCurveTo(28, 5, 24, 6); g.lineTo(10, 8); g.quadraticCurveTo(-4, 14, -11, 2); g.closePath(); mFill(g, FUR);
    g.beginPath(); g.moveTo(10, 8); g.lineTo(23, 6); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.arc(26, 2, 2.6, 0, 7); g.fillStyle = OL; g.fill();
    g.beginPath(); g.ellipse(6, -4, 3.6, 2.2, -0.2, 0, 7); g.fillStyle = '#ffd34d'; g.fill(); g.lineWidth = 1.4; g.stroke(); g.beginPath(); g.ellipse(6.6, -4, 0.8, 2, 0, 0, 7); g.fillStyle = OL; g.fill();
    g.beginPath(); g.moveTo(1, -5); g.lineTo(11, -7); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    g.restore();
    // front arm and the khopesh
    const ang = -0.9 + swing * 1.6, hx = 20 + Math.cos(ang) * 4, hy = -60 + Math.sin(ang) * 6;
    g.beginPath(); g.moveTo(6, -74); g.lineTo(14, -62); g.lineTo(hx, hy); mStroke(g, 5, FUR);
    g.save(); g.translate(hx, hy); g.rotate(ang);
    g.beginPath(); g.moveTo(-4, 0); g.lineTo(6, 0); mStroke(g, 3, '#6d4426');
    g.beginPath(); g.moveTo(6, -2.5); g.lineTo(20, -2.5); g.quadraticCurveTo(34, -6, 36, 6); g.quadraticCurveTo(36, 14, 28, 13); g.quadraticCurveTo(32, 8, 27, 5); g.quadraticCurveTo(22, 2.5, 6, 2.5); g.closePath(); mFill(g, '#c9d2de', 2.2);
    g.beginPath(); g.moveTo(8, -0.6); g.lineTo(22, -0.6); g.lineWidth = 1.2; g.strokeStyle = '#fff'; g.stroke();
    g.restore();
    g.beginPath(); g.arc(hx, hy, 4.2, 0, 7); mFill(g, FUR, 2);
  }
};
function drawMonster(g, id, th, t, x, y, k) {
  const art = MON_ART[id]; if (!art) return;
  g.save(); g.translate(x, y); g.scale(k, k); g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0, 3, id === 'm-ent' ? 30 : 22, 7, 0, 0, 7); g.fill();
  if (Math.sin(th) < -0.2) g.scale(-1, 1);
  art(g, t);
  g.restore();
}
{
  const _draw = RealmIso.drawUnitAt;
  RealmIso.drawUnitAt = (g, id, th, t, x, y, k) => MON_ART[id] ? drawMonster(g, id, th, t, x, y, k * 0.95) : _draw(g, id, th, t, x, y, k);
}

// ---------- GC07: folk walk along the roads, a few each way ----------
const roadFolk = new Map();
function folkFor(key, i) {
  let f = roadFolk.get(key + ':' + i);
  if (!f) { const r = rngFrom(world.seed + ':folk:' + key + ':' + i); f = { col: CIV_TUNIC[Math.floor(r() * CIV_TUNIC.length)], skin: CIV_SKIN[Math.floor(r() * CIV_SKIN.length)], hat: r() < 0.45 ? (r() < 0.5 ? 'straw' : 'hood') : null, sack: r() < 0.35, ph: r() * 6, born: -99, moving: true, x: 0, y: 0, dir: 1, off: r() }; roadFolk.set(key + ':' + i, f); }
  return f;
}
function roadWalkerItems(g, t, items) {
  if (!civsShown()) return;
  const vx0 = cam.x - cw / 2 / cam.z - 60, vx1 = cam.x + cw / 2 / cam.z + 60, vy0 = cam.y - ch / 2 / cam.z - 60, vy1 = cam.y + ch / 2 / cam.z + 60;
  for (const k of S.roads) {
    const [p, q] = k.split('_').map(Number);
    if (!S.visible.has(p) && !S.visible.has(q)) continue;
    if (civDanger(p) || civDanger(q)) continue;   // everyone is indoors (GC19)
    const pts = roadPath(p, q), L1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), L2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]), L = L1 + L2;
    const h = (p * 131 + q * 71) % 7, per = 2 + (h % 2);
    for (let dir = 0; dir < 2; dir++) for (let i = 0; i < per; i++) {
      const f = folkFor(k, dir * 3 + i), s0 = ((t * CIV_SPEED * 1.1) / L + i / per + f.off * 0.2 + dir * 0.13) % 1, s = dir ? 1 - s0 : s0;
      if (s < 0.1 || s > 0.9) continue;   // they come and go at the settlements
      const d = s * L, [a, b, segL, dd] = d < L1 ? [pts[0], pts[1], L1, d] : [pts[1], pts[2], L2, d - L1];
      const ux = (b[0] - a[0]) / segL, uy = (b[1] - a[1]) / segL, side = dir ? -1 : 1;   // keep to the right
      const x = a[0] + ux * dd - uy * 4.5 * side, y = a[1] + uy * dd + ux * 4.5 * side;
      if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
      const alpha = Math.min(1, (Math.min(s, 1 - s) - 0.1) / 0.06);
      f.x = x; f.y = y; f.dir = (dir ? -ux : ux) < 0 ? -1 : 1;
      const fx = x, fy = y, fd = f.dir;
      items.push({ y, f: () => { f.x = fx; f.y = fy; f.dir = fd; g.save(); g.globalAlpha = alpha; drawCiv(g, f, t); g.restore(); } });
    }
  }
}

// ---------- GC04 / GC05: province names under their resources; your nation's name over its land ----------
// Z13: a label for your nation and for every nation you have met, over the biggest block of their land you have explored
let realmLabels = [], realmSig = '';
function realmLabelsOf() {
  const who = [ME, ...[...S.met].filter(o => PLAYERS[o] && NATIONS[o] && provsOf(o).length)];
  const sig = who.map(o => o + ':' + [...S.buildings].filter(([p, b]) => b.owner === o && (o === ME || S.explored.has(p))).map(([p]) => p).join(',') + PLAYERS[o].name).join('|');
  if (sig === realmSig) return realmLabels; realmSig = sig; realmLabels = [];
  for (const o of who) {
    const mine = [...S.buildings].filter(([p, b]) => b.owner === o && (o === ME || S.explored.has(p))).map(([p]) => p);
    if (!mine.length) continue;
    const set = new Set(mine), seen = new Set(); let best = [];
    for (const s0 of mine) { if (seen.has(s0)) continue; const comp = [], q = [s0]; seen.add(s0); while (q.length) { const a = q.shift(); comp.push(a); for (const n of allNbr[a]) if (set.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } } if (comp.length > best.length) best = comp; }
    let x0 = Infinity, x1 = -Infinity, sx = 0, sy = 0;
    for (const p of best) { const P = G.provs[p]; sx += P.ic[0]; sy += P.ic[1]; for (const [x] of P.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
    const name = (PLAYERS[o].name || 'My Realm').toUpperCase(), w = (x1 - x0) * 0.8;
    realmLabels.push({ o, x: sx / best.length, y: sy / best.length - 40, name, fs: Math.max(70, Math.min(420, w / Math.max(4, name.length * 0.78))) });
  }
  return realmLabels;
}
const realmLabelOf = () => realmLabelsOf().find(L => L.o === ME) || null;
function drawProvLabels(g, t) {
  const font = getComputedStyle(document.body).getPropertyValue('--font-display');
  if (VIEW.names) {
    const k = Math.max(1, 0.62 / cam.z), vx0 = cam.x - cw / 2 / cam.z - 200, vx1 = cam.x + cw / 2 / cam.z + 200, vy0 = cam.y - ch / 2 / cam.z - 300, vy1 = cam.y + ch / 2 / cam.z + 100;
    g.save(); g.font = (15 * k) + 'px ' + font; g.textAlign = 'center'; g.textBaseline = 'top'; g.lineJoin = 'round';
    for (const p of S.explored) {
      const P = G.provs[p]; if (P.ic[0] < vx0 || P.ic[0] > vx1 || P.ic[1] < vy0 || P.ic[1] > vy1) continue;
      let y = P.ic[1] + 118 + (S.surveyed.has(p) ? 30 * k : 0);
      if (S.setpieces.has(p) && spKnown(p)) y = Math.max(y, P.ic[1] + 150 + 30 * k);
      const nm = provName(p);
      g.lineWidth = 4 * k; g.strokeStyle = 'rgba(29,26,34,0.9)'; g.strokeText(nm, P.ic[0], y);
      g.fillStyle = owned(p) ? '#fff6d6' : '#f1f3f7'; g.fillText(nm, P.ic[0], y);
    }
    g.restore();
  }
  if (VIEW.realm) for (const L of realmLabelsOf()) {
    const px = L.fs * cam.z, zf = f4Z ? (f4Z * 1.7 - cam.z) / (f4Z * 0.6) : 1;   // shown from about the F4 zoom level outward (like a map label), never as giant letters
    const a = Math.max(0, Math.min(0.8, zf, (px - 10) / 8, (220 - px) / 60));
    if (a <= 0.02) continue;
    g.save(); g.globalAlpha = a; g.font = L.fs + 'px ' + font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const gap = L.fs * 0.18, chars = [...L.name], ws = chars.map(c => g.measureText(c).width), total = ws.reduce((x, y) => x + y, 0) + gap * (chars.length - 1);
    let x = L.x - total / 2;
    chars.forEach((c, i) => { const cx = x + ws[i] / 2; g.lineWidth = L.fs * 0.09; g.strokeStyle = 'rgba(29,26,34,0.75)'; g.strokeText(c, cx, L.y); g.fillStyle = PLAYERS[L.o].light || '#fff'; g.fillText(c, cx, L.y); x += ws[i] + gap; });
    g.restore();
  }
}
const TG_ICON = {
  res: `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="9" fill="#f4c44f" stroke="#1d1a22" stroke-width="1.8"/><ellipse cx="12" cy="12" rx="6" ry="6" fill="none" stroke="#c99a2c" stroke-width="1.4"/><path d="M12 8.2v7.6M10 10h3.2a1.4 1.4 0 0 1 0 2.8h-2.4a1.4 1.4 0 0 0 0 2.8H14" fill="none" stroke="#8a5e12" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  names: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5 L16.5 2.8 L21.3 10.2 L18.2 19.4 L8.8 21.2 L2.8 13.6 Z" fill="#9bd95f" stroke="#1d1a22" stroke-width="1.8" stroke-linejoin="round"/><path d="M7.5 11.5h9M7.5 14.5h6" stroke="#1d1a22" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  color: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" fill="#faf1dc" stroke="#1d1a22" stroke-width="1.8"/><path d="M3 9 L9 3 M3 15 L15 3 M3 21 L21 3 M9 21 L21 9 M15 21 L21 15" stroke="#c7362b" stroke-width="1.8"/><rect x="3" y="3" width="18" height="18" fill="none" stroke="#1d1a22" stroke-width="1.8"/></svg>`
};
{
  const mini = $q('#mini'), box = document.createElement('div');
  box.className = 'mini-togs';
  box.innerHTML = `<button type="button" id="tgRes" title="Show or hide each province’s resources" aria-label="Province resources">${TG_ICON.res}</button>` +
    `<button type="button" id="tgNames" title="Show each province’s name under its resources" aria-label="Province names">${TG_ICON.names}</button>` +
    `<button type="button" id="tgRealm" title="Show nation names over their land" aria-label="Nation names"><img id="tgArms" alt=""></button>` +
    `<button type="button" id="tgColor" title="Fill the minimap with each nation’s color" aria-label="Nation colors on the minimap">${TG_ICON.color}</button>`;
  mini.prepend(box);
  const map = { tgRes: 'res', tgNames: 'names', tgRealm: 'realm', tgColor: 'miniColor' };
  const sync = () => { for (const id in map) $q('#' + id).setAttribute('aria-pressed', VIEW[map[id]] ? 'true' : 'false'); };
  box.addEventListener('pointerdown', e => e.stopPropagation());
  box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !map[b.id]) return; VIEW[map[b.id]] = !VIEW[map[b.id]]; viewSave(); sync(); b.blur(); if (b.id === 'tgColor') miniDirty = true; });
  sync();
}
// Z9: the Realm-name toggle shows your coat of arms (refreshed when the game starts)
function syncArmsToggle() { const im = $q('#tgArms'); if (im && NATION) im.src = flagURL(PLAYERS[ME].color, NATION.emblem); }

// ---------- GC09: each building's color in the action card ----------
const BUILD_BG = { pyre: '#ff7a2c', outpost: '#a3a9b3', farm: '#2aa198', lumber: '#2e6b34', goldmine: '#f0a62e', barracks: '#ef2b2b', stable: '#8c1c3a', market: '#d9bf8f', granary: '#36d6e8', storehouse: '#b58a58', bank: '#ffe62e', forge: '#e8552a', magetower: '#3f6fe0', temple: '#9a5fd6' };
const cmdBg = id => { const t = id && id.startsWith('build:') ? id.slice(6) : null, c = t ? BUILD_BG[t] : null, d = t && BUILD_DEFS[t]; if (d && d.tech && !hasTech(d.tech)) return ''; return c ? ` style="--bbg:${c}"` : ''; };   // Z4: not yet researched → stays gray

// ---------- GC14: is there something to upgrade that you can afford? ----------
function findUpgradable() {
  for (const p of myProvList()) {
    const b = S.buildings.get(p);
    if (b.stage === 0 && !upgradeWhy(p)) return { p, part: 'settlement', what: 'the outpost (to a Fort)' };
    for (const e of extrasIn(p)) {
      const d = BUILD_DEFS[e.type], lv = e.level || 1; if (!d.levels || lv >= d.levels.length || S.xup.has(p + '@' + e.slot)) continue;
      const needT = e.type === 'pyre' ? null : (e.type === 'forge' ? ['battleforge', 'warforge'] : ['sanctum', 'arcanum'])[lv - 1];
      if (needT && !hasTech(needT)) continue;
      if (canAfford(d.ups[lv].cost)) return { p, part: e.type + '@' + e.slot, what: `the ${d.levels[lv - 1]} (to a ${d.levels[lv]})` };
    }
  }
  return null;
}

// ---------- IC05: split an army by kind of soldier ----------
function openSplitMenu(a) {
  const ks = Object.keys(a.troops).filter(k => a.troops[k] > 0), nm = k => UNIT_DEFS[k] ? UNIT_DEFS[k].name : k, pl = (n, k) => n + ' ' + (n > 1 ? PLURAL_OF(nm(k)) : nm(k));
  const rows = ks.map(k => {
    const n = a.troops[k], half = Math.floor(n / 2);
    return (ks.length > 1 ? `<button type="button" class="bm-item" data-split="${k}:all" data-army="${a.id}"><img alt="" src="${portrait(k)}"><span class="bm-name">Split off the ${pl(n, k)}<small>They form a new army; the rest stay</small></span></button>` : '') +
      (half >= 1 && (ks.length > 1 || n >= 2) ? `<button type="button" class="bm-item" data-split="${k}:half" data-army="${a.id}"><img alt="" src="${portrait(k)}"><span class="bm-name">Split off ${pl(half, k)}<small>Half of this kind</small></span></button>` : '');
  }).join('');
  popNearCard(`<div class="bm-head"><b>Split ${escHTML(a.name)}</b><span>${troopText(a)}</span></div><button type="button" class="bm-item" data-split="mix:half" data-army="${a.id}"><img alt="" src="${splitIcon}"><span class="bm-name">Split in half<small>Each half gets a fair mix</small></span></button>${rows}<button type="button" class="bm-item bm-move" data-insp-close="1"><span class="bm-name">Close</span></button>`);
}
function splitKind(a, k, n) {
  if (!a.troops[k] || n < 1 || n >= troopCount(a)) return toast('That would leave an empty army.', true);
  a.troops[k] -= n; if (!a.troops[k]) delete a.troops[k];
  const b = newArmy(a.prov, { [k]: n }, a);
  if (k === MAGE) b.auto = { ...(a.auto || {}) };
  S.selected = [a, b]; computeIncome(); cmdKey = '';
  toast(`${b.name} formed from ${a.name}: ${troopText(b)}.`);
}
menuEl.addEventListener('click', e => {
  const b = e.target.closest('[data-split]'); if (!b) return; e.stopImmediatePropagation();
  const a = S.units.find(v => v.id === +b.dataset.army); closeBuildMenu();
  if (!a || a.battle || a.moving) return toast('The army must be standing still and out of battle to split.', true);
  const [k, how] = b.dataset.split.split(':');
  if (k === 'mix') return splitArmy(a);
  splitKind(a, k, how === 'all' ? a.troops[k] : Math.floor(a.troops[k] / 2));
}, true);

// ---------- IC01: the Inspect window: each kind of soldier with its three gear slots ----------
let inspArmy = null, inspKey = '';
function gearOf(k) {
  if (k === MAGE) { const W = MAGE_WEAPONS[S.mageGear.weapon], sh = !W.twoH && S.mageGear.shield; return { main: { name: W.name, icon: equipIcon('weapon', S.mageGear.weapon) }, off: sh ? { name: SHIELD_DEFS[sh].name, icon: equipIcon('shield', sh) } : { name: W.twoH ? 'Both hands on the stave' : 'Empty', icon: null }, armor: { name: 'Robes', icon: null } }; }
  const d = designById(k); if (!d) return null;
  const W = WEAPONS[d.weapon], sh = d.shield && !W.twoH, sw = d.race === 'swamp', off = sw && d.off && !W.twoH && WEAPONS[d.off];
  return { main: { name: W.name, icon: equipIcon('weapon', d.weapon) }, off: off ? { name: off.name + ' (off hand)', icon: equipIcon('off', d.off) } : sh ? { name: SHIELD_DEFS[d.shield].name, icon: equipIcon('shield', d.shield) } : { name: W.twoH ? 'Two-handed weapon' : sw ? 'Empty' : 'No shield', icon: null }, armor: { name: ARMORS[d.armor].name, icon: equipIcon('armor', d.armor) }, horse: d.horse ? { name: mountsFor(d.race)[d.horse].name, icon: sw ? ticoCanvas('eq:ogre:' + d.horse, g => ogreIcon(g, OGRES[d.horse])) : equipIcon('horse', d.horse) } : null };
}
function openInspect(a) { inspArmy = a; inspKey = ''; closeBuildMenu(); renderInspect(); $q('#inspWin').hidden = false; }
function closeInspect() { inspArmy = null; $q('#inspWin').hidden = true; }
function renderInspect() {
  const el = $q('#inspWin'), a = inspArmy;
  if (!a) return;
  if (!S.units.includes(a)) { closeInspect(); return; }
  const key = a.name + JSON.stringify(a.troops) + powerOf(a) + armyStatus(a) + a.prov + JSON.stringify(S.mageGear) + S.designs.length;
  if (key === inspKey) return; inspKey = key;
  const slot = (label, it) => `<div class="iw-slot"><span class="iw-sl">${label}</span><div class="iw-ico">${it && it.icon ? `<img alt="" src="${it.icon}">` : '<i>—</i>'}</div><b>${it ? escHTML(it.name) : '—'}</b></div>`;
  const cards = Object.entries(a.troops).filter(([, n]) => n > 0).map(([k, n]) => {
    const d = UNIT_DEFS[k], s = statsOf(k, a.owner), gr = gearOf(k), nm = k === MAGE ? 'Mage' : designById(k) ? designById(k).name : d ? d.name : k;
    const up = Object.entries(d ? d.upkeep : {}).map(([r, v]) => v * n + ' ' + r).join(', ') || 'none';
    return `<div class="iw-card"><div class="iw-ch"><img alt="" src="${portrait(k)}"><div><b>${n} × ${escHTML(nm)}</b><small>Attack ${Math.round(s.atk * 10) / 10} · health ${Math.round(hpOf(a, k))} · armor ${Math.round(s.red * 100)}% · speed ${Math.round(troopSpeed(k, a.owner) * 100) / 100} · upkeep ${up}</small></div></div>` +
      (gr ? `<div class="iw-slots">${slot('Mainhand', gr.main)}${slot('Offhand', gr.off)}${slot('Armor', gr.armor)}${gr.horse ? slot('Mount', gr.horse) : ''}</div>` : '') + `</div>`;
  }).join('');
  const [cur, max] = armyHp(a);
  el.innerHTML = `<div class="iw-head"><b>${escHTML(a.name)}</b>${a.owner === ME ? `<button type="button" class="rn-btn" data-rename="unit:${a.id}" title="Rename this army">✎</button>` : ''}<button type="button" class="pm-x" data-iw="close" aria-label="Close">×</button></div>` +
    `<div class="iw-sub">${troopCount(a)} soldiers · power ${powerOf(a)} · health ${Math.round(cur)}/${Math.round(max)} · ${armyStatus(a)} in ${escHTML(provName(a.prov))}</div><div class="iw-cards">${cards}</div>`;
}
{
  const el = $q('#inspWin');
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('click', e => { if (e.target.closest('[data-iw="close"]')) closeInspect(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) { closeInspect(); e.stopImmediatePropagation(); } }, true);
}

// ---------- IC02: the Country Breakdown (click your flag, top left) ----------
let countryOpen = false, countryKey = '';
const fmtClock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
function toggleCountry(open = !countryOpen) { countryOpen = open; countryKey = ''; $q('#countryWin').hidden = !open; if (open) { sfx('ui_panel'); renderCountry(); } }
function upkeepSplit() {
  const units = { gold: 0, wood: 0, food: 0 }, blds = { gold: 0, wood: 0, food: 0 };
  for (const v of S.units) {
    if (v.owner !== ME) continue;
    if (v.kind === 'army') { for (const tk in v.troops) { const d = UNIT_DEFS[tk]; if (d) for (const k in d.upkeep) units[k] += d.upkeep[k] * v.troops[tk]; } continue; }
    const d = UNIT_DEFS[v.kind]; if (d) for (const k in d.upkeep) units[k] += d.upkeep[k];
  }
  for (const [p, b] of S.buildings) if (b.owner === ME) {
    for (const e of extrasIn(p)) { const up = BUILD_DEFS[e.type].upkeep || {}; for (const k in up) blds[k] += up[k]; }
    if (b.stage === 0) for (const k in OUTPOST_UPKEEP) blds[k] += OUTPOST_UPKEEP[k];
  }
  return { units, blds };
}
function renderCountry() {
  if (!countryOpen) return;
  const provs = myProvList(), terr = { grassland: 0, forest: 0, desert: 0, swamp: 0 }; for (const p of provs) terr[G.provs[p].terrain]++;
  const { units, blds } = upkeepSplit(), gross = incomeParts ? incomeParts.gross : { gold: 0, wood: 0, food: 0 };
  const key = [provs.join(','), JSON.stringify(units), JSON.stringify(blds), JSON.stringify(gross), JSON.stringify(income), S.warLog.map(w => w.id + (w.end ?? '') + (w.result || '')).join(','), PLAYERS[ME].name, Math.floor(S.t)].join('|');
  if (key === countryKey) return; countryKey = key;
  const resRow = (label, o, sign = '', cls = '') => `<tr class="${cls}"><th>${label}</th>${RES.map(k => `<td>${costHTML({ [k]: (sign && o[k] > 0 ? sign : '') + o[k] })}</td>`).join('')}</tr>`;
  const res = (o, neg) => { const x = {}; for (const k of RES) x[k] = neg ? -o[k] : o[k]; return x; };
  const wars = S.warLog.slice().reverse();
  const caps = provs.filter(p => S.buildings.get(p).stage === 2).length, forts = provs.filter(p => S.buildings.get(p).stage === 1).length;
  $q('#countryWin').innerHTML = `<div class="cw-head"><img alt="" src="${flagURL(PLAYERS[ME].color, NATION.emblem)}"><b>${escHTML(PLAYERS[ME].name)}</b><span>Country Breakdown</span><button type="button" class="pm-x" data-cw="close" aria-label="Close">×</button></div>
  <div class="cw-body">
    <div class="cw-left">
      <div class="cw-portrait" title="Your leader’s portrait will appear here"><svg viewBox="0 0 120 140" aria-hidden="true"><path d="M30 46 L36 24 L48 38 L60 18 L72 38 L84 24 L90 46 Z" fill="#f4c44f" stroke="#1d1a22" stroke-width="3.5" stroke-linejoin="round"/><circle cx="60" cy="68" r="22" fill="#d8ccb4" stroke="#1d1a22" stroke-width="3.5"/><path d="M18 136 C18 104 38 92 60 92 C82 92 102 104 102 136 Z" fill="#d8ccb4" stroke="#1d1a22" stroke-width="3.5" stroke-linejoin="round"/></svg></div>
      <div class="cw-leader"><b>Leader</b><small>Portrait and name coming later</small></div>
    </div>
    <div class="cw-right">
      <div class="cw-stats"><div><span>Provinces</span><b>${provs.length}</b></div><div><span>Capital · Forts · Outposts</span><b>${caps} · ${forts} · ${provs.length - caps - forts}</b></div><div><span>Game time</span><b>${fmtClock(S.t)}</b></div></div>
      <div class="cw-sec">Land</div>
      <div class="cw-terr">${Object.entries(terr).map(([t, n]) => `<span class="cw-t"><i style="background:${TER[t].base}"></i>${TER[t].label}<b>${n}</b></span>`).join('')}</div>
      <div class="cw-sec">Resources every 10 s</div>
      <table class="cw-tab"><thead><tr><th></th>${RES.map(k => `<td>${RES_LABEL[k]}</td>`).join('')}</tr></thead><tbody>
        ${resRow('Gross income', gross, '+')}
        ${resRow('Upkeep: buildings', res(blds, true))}
        ${resRow('Upkeep: units', res(units, true))}
        ${resRow('Net income', income, '+', 'net')}
      </tbody></table>
    </div>
  </div>
  <div class="cw-sec">Wars</div>
  ${wars.length ? `<table class="cw-tab cw-wars"><thead><tr><th>Against</th><td>Started</td><td>Ended</td><td>Result</td></tr></thead><tbody>${wars.map(w => `<tr><th><i class="cw-dot" style="background:${(PLAYERS[w.foe] || {}).color || '#999'}"></i>${escHTML(w.foeName)}${w.joined ? ' <small>(ally’s war)</small>' : ''}</th><td>${fmtClock(w.start)}</td><td>${w.end === null ? '<em>ongoing</em>' : fmtClock(w.end)}</td><td class="${/^Victory/.test(w.result || '') ? 'win' : /^Defeat/.test(w.result || '') ? 'loss' : ''}">${w.result || '—'}</td></tr>`).join('')}</tbody></table>` : '<p class="cw-none">No wars yet.</p>'}`;
}
{
  const el = $q('#countryWin');
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('wheel', e => e.stopPropagation());
  el.addEventListener('click', e => { if (e.target.closest('[data-cw="close"]')) toggleCountry(false); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && countryOpen) { toggleCountry(false); e.stopImmediatePropagation(); } }, true);
  const nat = $q('#nation'); nat.setAttribute('role', 'button'); nat.tabIndex = 0;
  nat.addEventListener('pointerdown', e => e.stopPropagation());
  nat.addEventListener('click', () => { if (S.started) toggleCountry(); });
  nat.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && S.started) { e.preventDefault(); toggleCountry(); } });
}
// the record of wars: every war you fight, when it began and ended, and how
let peaceCtx = null, killCtx = null;
{
  const _newWar = newWar, _endWar = endWar, _makePeace = makePeace, _kill = killNation;
  newWar = (att, def, parent) => {
    const w = _newWar(att, def, parent);
    if (w && (att === ME || def === ME)) { const foe = att === ME ? def : att; S.warLog.push({ id: w.id, foe, foeName: PLAYERS[foe] ? PLAYERS[foe].name : 'Unknown', start: S.t, end: null, result: null, joined: parent !== undefined && parent !== null, attacker: att === ME }); }
    return w;
  };
  makePeace = (w, winner, terms) => { peaceCtx = { w, winner, terms }; try { return _makePeace(w, winner, terms); } finally { peaceCtx = null; } };
  killNation = (o, by) => { killCtx = o; try { return _kill(o, by); } finally { killCtx = null; } };
  endWar = w => {
    const rec = w && S.warLog.find(r => r.id === w.id && r.end === null);
    _endWar(w);
    if (!rec) return;
    rec.end = S.t;
    const K = { gold: 'gold', provs: 'provinces', total: 'Total Victory', surrender: 'surrender' };
    if (peaceCtx && peaceCtx.w === w) { const kind = peaceCtx.terms && peaceCtx.terms.kind; rec.result = kind === 'white' || !K[kind] ? 'White peace' : peaceCtx.winner === ME ? 'Victory · ' + K[kind] : 'Defeat · ' + K[kind]; }
    else if (S.fallen) rec.result = 'Defeat · realm fallen';
    else if (killCtx !== null && killCtx === rec.foe) rec.result = 'Victory · enemy destroyed';
    else if (rec.joined) rec.result = 'White peace · the ally’s war ended';
    else rec.result = 'Ended';
  };
}

// ---------- IC07: game clock ----------
{
  const z = document.querySelector('.zoom'), el = document.createElement('div');
  el.id = 'gtime'; el.className = 'gtime'; el.title = 'Game time (stops while the game is paused)'; el.textContent = '0:00';
  z.prepend(el);
}
let gtimeTxt = '';
function stepClock() { const txt = fmtClock(S.t); if (txt !== gtimeTxt) { gtimeTxt = txt; $q('#gtime').textContent = txt; } $q('#gtime').classList.toggle('paused', !!S.paused); }

// ---------- T03: renaming units, armies and provinces ----------
const renameBtn = u => u.owner === ME ? `<button type="button" class="rn-btn" data-rename="unit:${u.id}" title="Rename" aria-label="Rename ${escHTML(u.name)}">✎</button>` : '';
let renameFor = null;
const cleanName = s => s.replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
function openRename(target) {
  const [kind, id] = target.split(':'), el = $q('#renamePop');
  let cur;
  if (kind === 'prov') cur = provName(+id);
  else { const u = S.units.find(v => v.id === +id && v.owner === ME); if (!u) return; cur = u.name; }
  renameFor = target;
  el.innerHTML = `<b>Rename ${kind === 'prov' ? 'province' : 'unit'}</b><input id="renameIn" type="text" maxlength="28" spellcheck="false" autocomplete="off" value="${escHTML(cur)}"><div class="dm-btns">${kind === 'prov' ? '<button type="button" data-rn="reset" title="Go back to the original name">Original</button>' : ''}<button type="button" data-rn="cancel">Cancel</button><button type="button" data-rn="ok">Rename</button></div>`;
  el.hidden = false;
  const inp = $q('#renameIn'); inp.focus(); inp.select();
}
function doRename(reset) {
  const t = renameFor; if (!t) return; const [kind, id] = t.split(':'), v = cleanName($q('#renameIn').value);
  if (kind === 'prov') { if (reset || !v) S.provRename.delete(+id); else S.provRename.set(+id, v); realmSig = ''; }
  else { const u = S.units.find(x => x.id === +id); if (u && v) u.name = v; }
  closeRename(); provKey = ''; rosterKey = ''; selKey = ''; cmdKey = ''; inspKey = ''; countryKey = ''; if (typeof dipKey !== 'undefined') dipKey = '';
}
function closeRename() { renameFor = null; $q('#renamePop').hidden = true; }
{
  const el = $q('#renamePop');
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') doRename(false); else if (e.key === 'Escape') closeRename(); });
  el.addEventListener('click', e => { const b = e.target.closest('[data-rn]'); if (!b) return; if (b.dataset.rn === 'ok') doRename(false); else if (b.dataset.rn === 'reset') doRename(true); else closeRename(); });
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-rename]'); if (!b) return; e.stopPropagation(); openRename(b.dataset.rename); }, true);
  document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('[data-rename]')) e.stopPropagation(); }, true);
}

// ---------- Quick queue setting: right-click opens the Wayfinder / Mason menu without Ctrl (off by default) ----------
const quickQueueOn = () => !!VIEW.quickQueue;
{
  const b = $q('#qqBtn');
  const sync = () => { b.setAttribute('aria-pressed', quickQueueOn() ? 'true' : 'false'); b.querySelector('span').textContent = quickQueueOn() ? 'On' : 'Off'; };
  b.addEventListener('click', e => { e.stopPropagation(); VIEW.quickQueue = !quickQueueOn(); viewSave(); sync(); });
  sync();
}

// ---------- popups: Show me ----------
function lookAtProv(p) { const P = G.provs[p]; if (P) flyTo({ x: P.ic[0], y: P.ic[1], z: Math.max(cam.z, fitZ * 2.2 * WORLD_K) }); }
// a nation: its capital, or failing that the province of theirs nearest to your capital
function lookAtNation(o) {
  const ps = [...S.buildings].filter(([, b]) => b.owner === o); if (!ps.length) return;
  const cap = ps.find(([, b]) => b.stage === 2), me = G.provs[S.capital] ? G.provs[S.capital].ic : [0, 0];
  const p = cap ? cap[0] : ps.map(([q]) => q).sort((a, b) => Math.hypot(G.provs[a].ic[0] - me[0], G.provs[a].ic[1] - me[1]) - Math.hypot(G.provs[b].ic[0] - me[0], G.provs[b].ic[1] - me[1]))[0];
  if (S.explored.has(p) || S.reveal) lookAtProv(p); else toast('You haven’t explored their land yet.', true);
}

// ---------- move orders: a golden X pulses once where you sent the units, then fades over 1 s ----------
const moveMarks = [];
{
  const _og = orderGroup; let depth = 0;
  orderGroup = (target, append, pt) => {
    depth++;
    try { return _og(target, append, pt); }
    finally {
      depth--;
      if (!depth && S.selected.some(u => u.owner === ME)) { const c = G.provs[target]; if (c) { const [x, y] = pt || c.ic; moveMarks.push({ x, y, t0: performance.now() / 1000 }); if (moveMarks.length > 8) moveMarks.shift(); } }
    }
  };
}
function drawMoveMarks(g) {
  const now = performance.now() / 1000;
  for (let i = moveMarks.length - 1; i >= 0; i--) {
    const m = moveMarks[i], a = now - m.t0;
    if (a >= 1) { moveMarks.splice(i, 1); continue; }
    // one quick swell (0.6 → 1.2 → 1.0 in the first 0.3 s), then a fade to nothing at 1 s
    const sw = a < 0.18 ? 0.6 + (a / 0.18) * 0.6 : a < 0.3 ? 1.2 - ((a - 0.18) / 0.12) * 0.2 : 1, alpha = a < 0.3 ? 1 : 1 - (a - 0.3) / 0.7;
    const r = 16 * UKK * sw;   // about one footman across
    g.save(); g.translate(m.x, m.y); g.scale(1, 0.62); g.globalAlpha = Math.max(0, alpha); g.lineCap = 'round';
    if (a < 0.45) { g.beginPath(); g.arc(0, 0, r * (1 + a * 2.2), 0, 7); g.lineWidth = 3; g.strokeStyle = `rgba(255,214,90,${0.8 * (1 - a / 0.45)})`; g.stroke(); }
    g.beginPath(); g.moveTo(-r, -r); g.lineTo(r, r); g.moveTo(r, -r); g.lineTo(-r, r);
    g.lineWidth = 10 * Math.sqrt(UKK); g.strokeStyle = OL; g.stroke();
    g.lineWidth = 6 * Math.sqrt(UKK); g.strokeStyle = '#ffc93c'; g.stroke();
    g.lineWidth = 2 * Math.sqrt(UKK); g.strokeStyle = '#fff3b8'; g.stroke();
    g.restore();
  }
}

// ---------- Z5: a retrofitting army shows its progress ----------
function drawRetroBar(g, u, x, y, w, K) {
  const f = u.retro.t0 === null ? 0 : Math.max(0, Math.min(1, (S.t - u.retro.t0) / u.retro.dur)), h = 4.2 * Math.sqrt(K);   // 0 while waiting its turn in the queue
  g.save();
  g.beginPath(); g.roundRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3, (h + 3) / 2); g.fillStyle = OL; g.fill();
  g.beginPath(); g.roundRect(x - w / 2, y, w, h, h / 2); g.fillStyle = '#3d3a46'; g.fill();
  if (f > 0) { g.beginPath(); g.roundRect(x - w / 2, y, Math.max(h, w * f), h, h / 2); g.fillStyle = '#7fb8ff'; g.fill(); }
  const k = Math.max(1, 0.62 / cam.z); g.font = (8 * k) + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); g.textAlign = 'right'; g.textBaseline = 'middle';
  g.lineWidth = 3 * k; g.strokeStyle = OL; const ic = u.retro.t0 === null ? '⏳' : '⚒'; g.strokeText(ic, x - w / 2 - 3, y + h / 2); g.fillStyle = '#cfe3ff'; g.fillText(ic, x - w / 2 - 3, y + h / 2);
  g.restore();
}
// ---------- Z6: a design saved over an in-use one counts up: Footman, Footman II, Footman III … ----------
const toRoman = n => { let s = ''; for (const [v, r] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { s += r; n -= v; } return s; };
const fromRoman = s => { const V = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let n = 0; for (let i = 0; i < s.length; i++) { const a = V[s[i]], b = V[s[i + 1]] || 0; n += a < b ? -a : a; } return n; };
function nextDesignName(name) {
  const m = name.match(/^(.*?)((?:\s+[IVXLCDM]+)+)$/);
  const base = m ? m[1] : name, n = m ? Math.max(...m[2].trim().split(/\s+/).map(fromRoman)) : 1;
  let k = n + 1, out; do { out = (base + ' ' + toRoman(k)).slice(0, 24); k++; } while (S.designs.some(d => d.name === out) && k < 200);
  return out;
}
// ---------- Z2 / Z3: the Mason's cancel button ----------
{
  const _info = extraCmdInfo;
  extraCmdInfo = id => {
    if (id !== 'cancelbuild') return _info(id);
    const m = S.selected.find(v => v.kind === MASON), b = m && m.build;
    const nm = !b ? '' : b.type === 'outpost' ? 'outpost' : b.type === 'road' ? 'road' : b.type === 'wall' || b.type === 'rewall' ? 'wall' : BUILD_DEFS[b.type] ? BUILD_DEFS[b.type].name : 'building';
    return { name: b ? `Cancel the ${nm}` : 'Cancel construction', desc: b ? `Stop building and get back everything paid (${costText(b.paid || {})}).` : 'When the Mason is building, this stops it and refunds what was paid.', cost: null, why: b ? null : 'He isn’t building anything', ok: 'Click to cancel and get a refund', icon: xIcon('destroy') };
  };
}
// ---------- Z15: Terrascaping (Herbomancy, Tier III): a line of trees along an open border, with a forest path in the middle ----------
const TERRA_TIME = 300;
// the plain open border between two provinces (not a river, wall or magic path), or -1
const openEdgeBetween = (p, q) => world.edges.findIndex((e, i) => ((e.a === p && e.b === q) || (e.a === q && e.b === p)) && e.open && (!e.style || e.style === 'open') && !S.paths[i] && !S.walls.has(i));
function terraWhy(c, q) {
  if (!hasTech('terrascape') || currentSchool() !== 'life') return 'Research Terrascaping first';
  if (!allNbr[c.prov].includes(q)) return 'The Mage must stand next door';
  if (openEdgeBetween(c.prov, q) < 0) return wallBetween(c.prov, q) ? 'There is a wall on that border' : 'Only on an open border';
  if (c.moving) return 'Stop moving first';
  if (c.battle) return 'Not during battle';
  return castBusy(c);
}
function terrascape(p, q) {
  const i = openEdgeBetween(p, q); if (i < 0) return false;
  const e = world.edges[i], V = world.vertices, a = V[e.v[0]], b = V[e.v[1]], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  const swampy = [e.a, e.b].some(x => world.provinces[x].terrain === 'swamp'), r = rngFrom(world.seed + ':terra:' + i);
  const n = Math.max(3, Math.round(len / 10)), hole = 34 / len;   // the path left open in the middle
  for (let j = 0; j < n; j++) {
    const t = (j + 0.5) / n; if (Math.abs(t - 0.5) < hole) continue;
    const off = (j % 2 ? 6 : -6) + (r() - 0.5) * 3, s = swampy ? 'cypress' + (r() < 0.5 ? 0 : 1) : r() < 0.45 ? 'pine' + (r() < 0.5 ? 0 : 1) : 'tree' + Math.floor(r() * 3);
    G.sway.push({ x: a[0] + dx * t + nx * off, y: a[1] + dy * t + ny * off + 5, s, ph: r() * 6.28 });
  }
  G.sway.sort((u, v) => u.y - v.y);
  e.style = 'trees'; S.paths[i] = 'forest';   // still open, but only through the path
  S.roads.delete(linkKey(p, q));
  cacheDirty = true; fogDirty = true; miniDirty = true; hoverPath = undefined;
  return true;
}
{
  const _rows = magicRows;
  magicRows = (c, q) => {
    const base = _rows(c, q);
    if (!c || c.owner !== ME || c.prov === q || !allNbr[c.prov].includes(q) || !hasTech('terrascape') || currentSchool() !== 'life') return base;
    if (openEdgeBetween(c.prov, q) < 0) return base;
    const why = terraWhy(c, q);
    const row = `<button type="button" class="bm-item" data-type="terra" ${why ? 'aria-disabled="true"' : ''}><img alt="" src="${techIcon('terrascape')}"><span class="bm-name">Terrascape the border with ${escHTML(provName(q))}<small>${why || TERRA_TIME / 60 + ' minutes of casting · trees with a path in the middle'}</small></span></button>`;
    return base ? base + row : '<div class="bm-sec">Magic</div>' + row;
  };
  menuEl.addEventListener('click', e => {
    const b = e.target.closest('[data-type="terra"]'); if (!b) return;
    e.stopImmediatePropagation(); if (b.getAttribute('aria-disabled') === 'true') return;
    const c = S.selected.find(isCaster), q = menuProv; closeBuildMenu(); if (!c) return;
    const why = terraWhy(c, q); if (why) return toast('Terrascaping: ' + why.toLowerCase() + '.', true);
    startCast(c, 'terrascape', TERRA_TIME, { to: q });
    toast(`${c.name} begins Terrascaping the border with ${provName(q)}: ${TERRA_TIME / 60} minutes of casting. Moving or fighting stops it.`); sfx('mg_life', { prov: c.prov });
  }, true);
  const _step = stepMagic;
  stepMagic = (t, dt) => {
    const done = S.units.filter(c => c.cast && c.cast.spell === 'terrascape' && !c.moving && !c.battle && t - c.cast.t0 >= c.cast.dur).map(c => [c, c.prov, c.cast.to]);
    _step(t, dt);
    for (const [c, p, q] of done) if (terrascape(p, q) && c.owner === ME) toast(`Trees rise along the border between ${provName(p)} and ${provName(q)}, with a forest path through the middle.`);
  };
}

// ---------- every frame, and at the start of a game ----------
function stepV78(t, dt) {
  if (!S.paused) { stepPatrols(t, dt); stepTravelers(dt); }
  showNextFind();
  stepClock();
  renderInspect();
  renderCountry();
}
function setupV78() {
  const cap = S.capital; if (cap >= 0) { const near = fitView(boxOf([cap, ...allNbr[cap]]), 0.95); f4Z = clampZ(near.z / 2); }
  S.warLog = []; S.provRename = new Map(); S.spFound = new Set(); realmSig = ''; roadFolk.clear(); syncArmsToggle();
  if (cap >= 0) S.spFound.add(cap);
  // the map's extras: the Intact Ruins first (nothing else may sit there), then bandits and monsters, then the travelers
  S.finds = new Map(); S.treasureRolled = new Set(); S.travelers = []; findQueue.length = 0;
  const uqs = uqSkip(), ruins = placeRuins(uqs), skip = new Set([...uqs, ...(ruins >= 0 ? [ruins] : [])]);
  spawnLairs(skip);
  for (const u of S.units) if (u.bandit) skip.add(u.prov);
  placeTravelers(skip);
  spawnBosses();   // v95: the three bosses guarding Death Mountain, the Oasis and the Heart of the Forest
}
window.__v78 = { wallBetween, raiseWall, startShock, startQuake, terrascape, openEdgeBetween, nextDesignName, terraWhy, findSpot, VIEW, unitK, f4Z: () => f4Z, spawnMonster, MONSTERS, spawnLairs, placeRuins, surveyFinds, grantTech, addResearch, showTravPop, travelersChoose, TRAVELERS, LAIR_CHANCE, armyFigures, armyHp, findUpgradable, openInspect, toggleCountry, openSplitMenu, splitKind, openRename, stepPatrols, spKnown, realmLabelOf, castUnitId, drawMonster };
