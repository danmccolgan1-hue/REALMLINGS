// ================= v102: the user's v102 list =================
// Loaded after v101.js, before save.js. Direct edits elsewhere are listed in HANDOFF.md (v102 section).

// ---------- styles for the new bits ----------
document.head.insertAdjacentHTML('beforeend', `<style>
.dp-prov.far { opacity: 0.42; filter: grayscale(0.85); }
.dp-prov.far.on { opacity: 0.7; }
.dp-room { display: block; margin-top: 6px; color: #c7362b; }
</style>`);

// ---------- 3: Axe Mastery shows an axe (Swamplings) ----------
SW_ICONS['rep-sword'] = g => { itemIcon(g, 'battleaxe'); repeatBadge(g); };

// ---------- 12: the Fireball: a round fireball flying through the air, trailing flame ----------
function fireballIco(g, k) {
  g.save(); g.scale(k, k); g.lineJoin = 'round'; g.lineCap = 'round';
  const cx = 54, cy = 54, r = 19;
  const trail = (tx, ty, rr, col, w) => {
    const dx = cx - tx, dy = cy - ty, L = Math.hypot(dx, dy), px = -dy / L, py = dx / L;
    g.beginPath(); g.moveTo(tx, ty);
    g.quadraticCurveTo(cx - dx * 0.35 + px * rr * 0.75, cy - dy * 0.35 + py * rr * 0.75, cx + px * rr, cy + py * rr);
    g.lineTo(cx - px * rr, cy - py * rr);
    g.quadraticCurveTo(cx - dx * 0.35 - px * rr * 0.75, cy - dy * 0.35 - py * rr * 0.75, tx, ty);
    g.closePath();
    if (w) { g.lineWidth = w; g.strokeStyle = OL; g.stroke(); }
    g.fillStyle = col; g.fill();
  };
  // speed streaks
  g.strokeStyle = OL; g.lineWidth = 4;
  for (const [x0, y0, x1, y1] of [[10, 40, 26, 50], [36, 12, 46, 26]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  g.strokeStyle = '#ffd34f'; g.lineWidth = 2;
  for (const [x0, y0, x1, y1] of [[10, 40, 26, 50], [36, 12, 46, 26]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  trail(8, 8, r + 2, '#ff7a2c', 5);
  trail(22, 22, r * 0.62, '#ffc93c', 0);
  // the ball
  g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = '#e8482c'; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(cx - 3, cy - 3, r * 0.66, 0, 7); g.fillStyle = '#ff9a3c'; g.fill();
  g.beginPath(); g.arc(cx - 6, cy - 6, r * 0.34, 0, 7); g.fillStyle = '#fff3b0'; g.fill();
  // sparks
  g.fillStyle = '#ffc93c'; g.strokeStyle = OL; g.lineWidth = 1.6;
  for (const [x, y, s] of [[78, 34, 3.2], [30, 74, 2.8], [80, 70, 2.4]]) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); g.stroke(); }
  g.restore();
}
{ const xi = xIcon; xIcon = function (kind) {
  if (kind === 'shock' && isSw(ME)) kind = 'fireball';
  if (kind !== 'fireball') return xi(kind);
  if (XICON.fireball) return XICON.fireball;
  const c = document.createElement('canvas'); c.width = c.height = 88; fireballIco(c.getContext('2d'), 1);
  return XICON.fireball = c.toDataURL();
}; }
{
  const clock = g => { g.beginPath(); g.arc(18, 18, 11, 0, 7); g.fillStyle = '#fff6dc'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.moveTo(18, 18); g.lineTo(18, 11); g.moveTo(18, 18); g.lineTo(23, 20); g.lineWidth = 2.2; g.stroke(); };
  SW_ICONS['rep-shockcast'] = g => { fireballIco(g, 64 / 88); clock(g); repeatBadge(g); };   // Swift Fireball
}

// ---------- 6 / 13: Barracks, Thug Dens, Ogre Caves and Mage Towers can be destroyed from their training card ----------
{ const rtc = renderTrainCard; renderTrainCard = function () {
  const before = cmdKey; rtc();
  const e = extraAt(S.selBuilding, S.selPart); if (!e || !owned(S.selBuilding)) return;
  const grid = $q('#cmdGrid'); if (!grid || grid.querySelector('[data-cmd="destroy"]')) return;
  if (cmdKey === before && grid.dataset.v102 === cmdKey) return;
  const kids = [...grid.children]; if (kids.length !== 16) return;
  const at = kids[11] && !kids[11].dataset.cmd ? 11 : kids.findIndex((k, i) => i < 12 && !k.dataset.cmd); if (at < 0) return;
  const b = document.createElement('div'); b.innerHTML = `<button type="button" class="cmd-btn" data-cmd="destroy" aria-label="Destroy building"><img alt="" src="${xIcon('destroy')}"></button>`;
  kids[at].replaceWith(b.firstChild); grid.dataset.v102 = cmdKey;
}; }
// what a destroyed building was training is refunded (unless another building of the same kind is left in the province)
const queueKeyOf = type => type === 'magetower' ? 'magetower' : type === 'market' ? 'market' : type === 'stable' && isSw(ME) ? 'stable' : type === 'barracks' ? 'barracks' : null;
{ const eu = extraCmdUse; extraCmdUse = function (id) {
  if (id !== 'destroy') return eu(id);
  const p = S.selProv, e = extraAt(p, S.selPart);
  const r = eu(id);
  if (e && !extrasIn(p).includes(e)) {
    const qk = queueKeyOf(e.type), key = qk && qk + ':' + p;
    if (key && S.queues[key] && !extrasIn(p).some(x => x.type === e.type)) {
      for (const q of S.queues[key]) { for (const k in q.paid || {}) S.stock[k] += q.paid[k]; if (q.retro) { const a = S.units.find(v => v.id === q.army); if (a && a.retro === q) a.retro = null; } }
      delete S.queues[key];
    }
    if (e.type === 'market' && e.thugs) toast(`The ${e.thugs > 1 ? e.thugs + ' Thugs' : 'Thug'} inside scatter into the swamp.`);
    if (S.selBuilding === p) S.selBuilding = -1;
    rosterKey = ''; capPanelKey = ''; computeIncome();
  }
  return r;
}; }

// ---------- 14: the Forge's upgrade sits on R ----------
{ const rlc = renderLevelCard; renderLevelCard = function () {
  rlc();
  const e = extraAt(S.selProv, S.selPart); if (!e || e.type !== 'forge') return;
  const grid = $q('#cmdGrid'), kids = [...grid.children]; if (kids.length < 4) return;
  const b = kids[0]; if (!b.dataset.cmd || !/^x(up|cancel)$/.test(b.dataset.cmd)) return;
  const empty = document.createElement('div'); empty.className = 'cmd-cell';
  kids[3].replaceWith(b); grid.insertBefore(empty, grid.children[0]);
}; }

// ---------- 11: a broken wall can't be rebuilt while at war ----------
{ const lw = linkWhy; linkWhy = function (type, m, q) {
  if (type === 'wall' && m && warsOf(m.owner).length && S.brokenWalls && S.brokenWalls.has(linkKey(m.prov, q))) return 'A broken wall can only be rebuilt at peace';
  return lw(type, m, q);
}; }

// ---------- 15, 23, 24: conquered land ----------
// a fort that changes hands becomes an outpost and keeps only as many buildings as an outpost has plots (2, or 3 with
// Master Builders); a conquered capital keeps its look as a Conquered Capital (6 plots, +5 of each resource, counts as a fort);
// Swamplings don't keep a Temple / Shrine outside a swamp (it isn't turned into Hot Springs)
{ const tp = transferProv; transferProv = function (p, to) {
  const b = S.buildings.get(p); if (!b) return tp(p, to);
  const wasCap = b.stage === 2 || b.cc, from = b.owner, cc = { race: b.cc ? b.ccRace : raceOf(from), of: b.cc ? b.ccOf : from };
  tp(p, to);
  if (b.owner !== to) return;
  if (wasCap) {
    if (cc.of === to && isNation(to) && capitalOf(to) < 0) { b.stage = 2; b.cc = false; delete b.ccRace; delete b.ccOf; if (to === ME) S.capital = p; }   // won back, and no other capital: the capital again
    else { b.stage = 1; b.cc = true; b.ccRace = cc.race; b.ccOf = cc.of; }
  } else b.cc = false;
  let list = extrasIn(p);
  if (isSw(to) && world.provinces[p].terrain !== 'swamp' && list.some(e => e.type === 'temple')) list = list.filter(e => e.type !== 'temple');
  const cap = plotCap(p);
  if (list.length > cap) list = list.slice().sort((x, y) => x.slot - y.slot).slice(0, cap);
  // keep every building on a plot the settlement has
  const used = new Set(list.filter(e => e.slot < cap).map(e => e.slot));
  for (const e of list) if (e.slot >= cap) { let k = 0; while (used.has(k)) k++; e.slot = k; used.add(k); }
  S.extras.set(p, list);
  for (const k of Object.keys(S.queues)) if (+k.split(':')[1] === p && k.split(':')[0] !== 'capital' && !list.some(e => queueKeyOf(e.type) === k.split(':')[0])) delete S.queues[k];
  territory = null; cacheDirty = true; provKey = ''; rosterKey = '';
}; }
// a dismantled Conquered Capital is an ordinary outpost from then on
{ const df = dismantleFort; dismantleFort = function (p) { const b = S.buildings.get(p), r = df(p); if (b && b.stage === 0) { b.cc = false; delete b.ccRace; delete b.ccOf; } return r; }; }

// ---------- 25: nothing is trained in a province another nation occupies ----------
const heldByFoe = (p, o) => S.occ.has(p) && S.occ.get(p) !== o;
{ const st = stepTraining; stepTraining = function (t) {
  for (const key in S.queues) {
    const q = S.queues[key][0]; if (!q) continue;
    const p = +key.split(':')[1];
    if (heldByFoe(p, ME)) { if (q.t0 !== null && q.held !== undefined) q.t0 += t - q.held; q.held = t; }
    else delete q.held;
  }
  return st(t);
}; }
{ const tr = train; train = function (kind) {
  if (S.selBuilding >= 0 && heldByFoe(S.selBuilding, ME)) return toast(`${provName(S.selBuilding)} is occupied by the ${PLAYERS[S.occ.get(S.selBuilding)].name}: nothing can be trained there until you take it back.`, true);
  return tr(kind);
}; }
{ const aq = aiQueueStep; aiQueueStep = function (N, t) {
  for (const q of N.queue) {
    if (heldByFoe(q.prov, N.id)) { if (q.held !== undefined) q.t0 += t - q.held; q.held = t; }
    else delete q.held;
  }
  return aq(N, t);
}; }

// ---------- 16: staves cast faster, wands cost less mana, skulls speed up the Fireball ----------
const STAVE_CAST = { grandstave: 0.9, mythicstave: 0.8 }, WAND_MANA = { crypticwand: 0.9, enigmaticwand: 0.8 };
const myGear = () => S.mageGear || {};
castMult = o => o === ME ? STAVE_CAST[myGear().weapon] || 1 : 1;
manaMult = o => o === ME ? WAND_MANA[myGear().weapon] || 1 : 1;
skullCut = o => { if (o !== ME || !isSw(ME)) return 0; const gr = myGear(), W = MAGE_WEAPONS[gr.weapon], Sk = gr.skull && SKULLS[gr.skull]; return W && !W.twoH && Sk ? 2 * (Sk.lv || 1) : 0; };
{ const sc = startCast; startCast = function (c, spell, dur, data) { const m = castMult(c.owner); return sc(c, spell, isFinite(dur) && m !== 1 ? Math.round(dur * m * 10) / 10 : dur, data); }; }
{ const ms = mageStats; mageStats = function (gear) {
  const st = ms(gear); if (!st || !gear) return st;
  const add = [];
  if (STAVE_CAST[gear.weapon]) add.push(`Spells cast ${Math.round((1 - STAVE_CAST[gear.weapon]) * 100)}% faster.`);
  if (WAND_MANA[gear.weapon]) add.push(`Spells cost ${Math.round((1 - WAND_MANA[gear.weapon]) * 100)}% less mana.`);
  if (isSw(ME) && gear.skull && SKULLS[gear.skull] && !MAGE_WEAPONS[gear.weapon].twoH) add.push(`The Fireball casts ${2 * (SKULLS[gear.skull].lv || 1)} s faster.`);
  if (add.length) st.blurb = (st.blurb || '') + ' ' + add.join(' ');
  return st;
}; }

// ---------- 17: a golden number and a coin over each Bazaar for its Community bonus (Woodlings) ----------
{ const dm = drawMagic; drawMagic = function (g, t) {
  dm(g, t);
  try { drawV102(g, t); } catch (e) { reportError(e, 'v102 draw'); }
}; }
function drawV102(g, t) {
  if (isWd(ME) && hasTech('traderoutes')) {
    for (const [p, list] of S.extras) {
      if (!owned(p) || S.occ.has(p) || !S.visible.has(p)) continue;
      const n = list.length - 1; if (n <= 0) continue;
      for (const e of list) {
        if (e.type !== 'market') continue;
        const c = G.provs[p].ic, [ox, oy] = bslotOf(p, e.slot);
        coinLabel(g, c[0] + ox, c[1] + oy - 80 + Math.sin(t * 2.2 + p + e.slot) * 3, n);
      }
    }
  }
  drawScoutMarks(g, t);
}

// ---------- 20, 21: scouting magic and towers detect sneaking scouts ----------
// Haunt, Whispering Rocks, Eyes of the Forest, the Scouting Pyre, Arcane Scouts towers and Scout Sight see sneaking
// Wayfinders / Scouts / Swampstriders of other nations (not allies). A detected one is pulled out of stealth and can't sneak
// again until he is back in his own land and no foreign eye is on him. While detected he can still be moved anywhere,
// and inside another nation's land any army of that nation (or of a nation at war with his) kills him on sight.
function detectZones() {
  const Z = new Map(), add = (o, p) => { let s = Z.get(o); if (!s) Z.set(o, s = new Set()); s.add(p); }, t = S.t;
  for (const h of S.haunts || []) if (h.until > t) add(h.owner, h.prov);
  for (const r of (S.eyes || []).concat(S.wrocks || [])) if (r.until === undefined || r.until > t) { add(r.owner, r.a); add(r.owner, r.b); }
  for (const P of S.spyres || []) if (P.until > t) { add(P.owner, P.prov); for (const { q } of openNbr[P.prov]) add(P.owner, q); }
  for (const [p, list] of S.extras) {
    const b = S.buildings.get(p); if (!b || !isNation(b.owner) || !list.some(e => e.type === 'magetower') || !techOf(b.owner, 'arcscouts')) continue;
    add(b.owner, p); for (const { q } of openNbr[p]) add(b.owner, q);
  }
  for (const u of S.units) if (u.kind === WAYFINDER && u.sight && u.sight.on) { add(u.owner, u.prov); for (const { q } of openNbr[u.prov]) add(u.owner, q); }
  return Z;
}
const scoutWord = o => UNIT_DEFS[WAYFINDER] && o === ME ? UNIT_DEFS[WAYFINDER].name : 'scout';
let detectT = -9;
function stepDetection(t) {
  if (t - detectT < 0.25 && t >= detectT) return; detectT = t;
  const Z = detectZones();
  for (const u of S.units) {
    if (u.kind !== WAYFINDER || !(u.stealth || u.detected)) continue;
    let by = 0;
    for (const [o, zs] of Z) if (o !== u.owner && zs.has(u.prov) && !allied(o, u.owner)) { by = o; break; }
    if (by) {
      if (!u.detected) {
        u.detected = by; u.stealth = false; cmdKey = ''; rosterKey = '';
        if (u.owner === ME) { toast(`${u.name} has been detected by the ${PLAYERS[by].name} at ${provName(u.prov)}! He can’t sneak again until he is back in your land, and their armies there will kill him on sight.`, true); sfx('wn_enemy'); }
        else if (by === ME) toast(`A sneaking ${UNIT_DEFS[WAYFINDER].name} of the ${PLAYERS[u.owner] ? PLAYERS[u.owner].name : 'enemy'} was detected at ${provName(u.prov)}.${nationOf(u.prov) === ME ? ' Your armies there will kill him on sight.' : ''}`);
      }
    } else if (u.detected && nationOf(u.prov) === u.owner) {
      u.detected = 0; cmdKey = ''; rosterKey = '';
      if (u.owner === ME) toast(`${u.name} is back in your land and no longer detected: he can sneak again.`);
    }
  }
  // killed on sight: a detected scout in another nation's land, where an army of that nation (or at war with his) stands
  for (const u of S.units.slice()) {
    if (u.kind !== WAYFINDER || !u.detected || u.exiting) continue;
    const land = nationOf(u.prov); if (!land || land === u.owner) continue;
    const killer = S.units.find(v => v.kind === 'army' && !v.bandit && v.owner !== u.owner && isNation(v.owner) && v.prov === u.prov && troopCount(v) > 0 && !v.retreating && !allied(v.owner, u.owner) && (v.owner === land || hostile(v.owner, u.owner)));
    if (!killer) continue;
    S.units = S.units.filter(v => v !== u); S.selected = S.selected.filter(v => v !== u);
    if (u.build) cancelBuild(u);
    if (S.visible.has(u.prov)) S.fx.push({ kind: 'fall', prov: u.prov, owner: u.owner, unit: u.kind, t0: t, r: 0.5 });
    if (u.owner === ME) { computeIncome(); cmdKey = ''; rosterKey = ''; toast(`${u.name} was detected and killed on sight by ${killer.name} at ${provName(u.prov)}.`, true); }
    else if (killer.owner === ME) toast(`${killer.name} caught and killed a detected ${UNIT_DEFS[WAYFINDER].name} of the ${PLAYERS[u.owner] ? PLAYERS[u.owner].name : 'enemy'} at ${provName(u.prov)}.`);
  }
}

// ---------- 29: Scout Sight (Government Tier III): a scout stands still and spots everything around him ----------
{
  const x = { id: 'scoutsight', tree: 'gov', tier: 3, req: 'stealth', cost: 200, playerOnly: true, name: 'Scout Sight',
    blurb: 'Your scouts (Wayfinders, Scouts, Swampstriders) learn Scout Sight: after 5 seconds of focus a scout detects every unit in his field of vision, sneaking ones too, for as long as he holds still. He can’t move or sneak meanwhile: ordering him to move ends it.' };
  if (!TECH_BY_ID[x.id]) { TECHS.push(x); TECH_BY_ID[x.id] = x; }
  GOV_ICONS.scoutsight = g => {
    ICO.disc(g, '#e9f2ff');
    g.beginPath(); g.moveTo(8, 34); g.quadraticCurveTo(32, 10, 56, 34); g.quadraticCurveTo(32, 58, 8, 34); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.arc(32, 34, 9, 0, 7); g.fillStyle = '#3f8fd0'; g.fill(); g.lineWidth = 2.4; g.stroke();
    g.beginPath(); g.arc(32, 34, 4, 0, 7); g.fillStyle = OL; g.fill();
    for (const a of [-2.4, -1.57, -0.74]) { g.beginPath(); g.moveTo(32 + Math.cos(a) * 26, 34 + Math.sin(a) * 26); g.lineTo(32 + Math.cos(a) * 31, 34 + Math.sin(a) * 31); g.lineWidth = 3; g.strokeStyle = '#f4c44f'; g.stroke(); }
  };
}
const SIGHT_CAST = 5;
function startSight(u, quiet) {
  if (u.sight) return;
  u.stealth = false; u.path = []; u.moving = false;
  u.sight = { t0: S.t, on: false }; cmdKey = '';
  if (!quiet && u.owner === ME) toast(`${u.name} focuses: Scout Sight in ${SIGHT_CAST} s. Moving him ends it.`);
}
function stopSight(u, why) { if (!u.sight) return; u.sight = null; cmdKey = ''; if (why && u.owner === ME) toast(why); }
function stepSight(t) {
  for (const u of S.units) {
    if (u.kind !== WAYFINDER || !u.sight) continue;
    if (u.moving || u.stealth || u.fleeing) { stopSight(u); continue; }
    if (!u.sight.on && t - u.sight.t0 >= SIGHT_CAST) { u.sight.on = true; cmdKey = ''; if (u.owner === ME) { toast(`${u.name}: Scout Sight is up at ${provName(u.prov)}.`); computeFog(); } }
  }
}
// any order to move ends Scout Sight; the player's own move order also ends Follow army
{ const od = order; order = function (u, target, quiet, pt) {
  if (u && u.sight && !u.fleeing) stopSight(u);
  return od(u, target, quiet, pt);
}; }
{ const og = orderGroup; orderGroup = function (target, append, pt) {
  for (const u of S.selected) if (u.kind === WAYFINDER && u.follow) stopFollow(u, true);
  return og(target, append, pt);
}; }

// ---------- 28: Follow army: a scout keeps to the army he is closest to; with Scout Sight he uses it while it besieges ----------
function nearestArmy(u) {
  let best = null, bd = Infinity;
  for (const a of S.units) if (a.kind === 'army' && a.owner === u.owner && troopCount(a) > 0 && !a.exiting) { const d = Math.hypot(a.x - u.x, a.y - u.y); if (d < bd) { bd = d; best = a; } }
  return best;
}
function stopFollow(u, quiet) {
  if (!u.follow) return;
  u.follow = 0; u.followTo = undefined; if (u.followAuto !== undefined) { u.auto = u.followAuto; u.followAuto = undefined; }
  cmdKey = ''; if (!quiet && u.owner === ME) toast(`${u.name} stops following.`);
}
const besieging = a => { if (a.moving || a.battle) return false; const pr = S.occProg.get(a.prov), n = nationOf(a.prov); return (pr && pr.by === a.owner) || (n && n !== a.owner && hostile(a.owner, n)); };
let followT = -9;
function stepFollow(t) {
  if (t - followT < 0.5 && t >= followT) return; followT = t;
  for (const u of S.units) {
    if (u.kind !== WAYFINDER || !u.follow) continue;
    let a = S.units.find(v => v.id === u.follow && v.kind === 'army' && v.owner === u.owner && troopCount(v) > 0);
    if (!a) { a = nearestArmy(u); if (!a) { stopFollow(u, true); if (u.owner === ME) toast(`${u.name} has no army left to follow.`); continue; } u.follow = a.id; cmdKey = ''; }
    if (u.fleeing || u.exiting) continue;
    const dest = a.moving && a.final !== undefined ? a.final : a.prov;
    if (u.prov !== dest) { if (!(u.moving && u.followTo === dest)) { if (u.sight) stopSight(u); if (order(u, dest, true)) u.followTo = dest; } continue; }
    u.followTo = undefined;
    if (!u.moving && !u.sight && a.prov === u.prov && besieging(a) && techOf(u.owner, 'scoutsight')) startSight(u, true);
  }
}

// ---------- the scouts' command card: Scout Sight on R, Follow army on A; Sneak is locked while detected ----------
CMD[WAYFINDER].push({ id: 'ssight', cell: 3, key: '' }, { id: 'follow', cell: 4, key: '' });
const followIco = (() => { let url = null; return () => url || (url = (() => { const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  // a banner (the army) with footsteps trailing after it
  g.beginPath(); g.moveTo(54, 74); g.lineTo(54, 14); g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#8a6a44'; g.stroke();
  g.beginPath(); g.moveTo(56, 16); g.lineTo(80, 24); g.lineTo(56, 34); g.closePath(); g.fillStyle = '#c7362b'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = OL; g.stroke();
  for (const [x, y, r] of [[18, 70, 0], [30, 58, 0], [22, 46, 0], [36, 36, 0]]) { g.beginPath(); g.ellipse(x, y, 6, 4, -0.6, 0, 7); g.fillStyle = '#d9c7a6'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); }
  return c.toDataURL(); })()); })();
const selScouts = () => S.selected.filter(v => v.kind === WAYFINDER && v.owner === ME);
{ const ci = cmdInfo; cmdInfo = function (id) {
  if (id === 'ssight') {
    const ws = selScouts(), on = ws.some(w => w.sight), up = ws.some(w => w.sight && w.sight.on), N = UNIT_DEFS[WAYFINDER].name;
    const why = !hasTech('scoutsight') ? 'Research Scout Sight (Government Tier III) first' : !ws.length ? `No ${N} selected` : null;
    return { name: 'Scout Sight' + (up ? ': On' : on ? ' (focusing…)' : ''), desc: `After ${SIGHT_CAST} seconds of focus the ${N} detects every unit in his field of vision, sneaking ones too. He can’t move or sneak while it lasts; ordering him to move ends it.`, cost: null, why, ok: on ? 'Click to end it' : 'Click to focus', icon: techIcon('scoutsight') };
  }
  if (id === 'follow') {
    const ws = selScouts(), on = ws.some(w => w.follow), N = UNIT_DEFS[WAYFINDER].name;
    const a = on ? S.units.find(v => v.id === ws.find(w => w.follow).follow) : ws[0] && nearestArmy(ws[0]);
    return { name: 'Follow army' + (on ? ': On' : ''), desc: `The ${N} follows the army he is closest to${a ? ` (now ${escHTML(a.name)})` : ''} and stays in the same province.${hasTech('scoutsight') ? ' While that army besieges a province he uses Scout Sight.' : ' With Scout Sight researched, he uses it while that army besieges a province.'} Giving him a move order ends it.`, cost: null, why: !ws.length ? `No ${N} selected` : !on && !a ? 'You have no army to follow' : null, ok: on ? 'Click to stop following' : 'Click to follow', icon: followIco() };
  }
  const r = ci(id);
  if (id === 'stealth' && r) { const d = selScouts().find(w => w.detected); if (d && !r.why) r.why = `${d.name} has been detected: he can sneak again once he is back in your land, out of sight`; }
  if (id.startsWith('train:') && r && !r.why && S.selBuilding >= 0 && heldByFoe(S.selBuilding, ME)) r.why = 'This province is occupied by the enemy';
  return r;
}; }
{ const cu = cmdUse; cmdUse = function (id) {
  if (id === 'ssight') {
    const ws = selScouts(); if (!ws.length || !hasTech('scoutsight')) return;
    const on = ws.some(w => w.sight);
    for (const w of ws) { if (on) stopSight(w); else { stopFollow(w, true); startSight(w); } }
    if (on) toast('Scout Sight ended.');
    cmdKey = ''; return;
  }
  if (id === 'follow') {
    const ws = selScouts(); if (!ws.length) return;
    const on = ws.some(w => w.follow);
    for (const w of ws) {
      if (on) { stopFollow(w, true); continue; }
      const a = nearestArmy(w); if (!a) continue;
      w.follow = a.id; w.followAuto = w.auto; w.auto = false; w.followTo = undefined;
    }
    const a = !on && ws[0].follow && S.units.find(v => v.id === ws[0].follow);
    toast(on ? 'Follow army: off.' : a ? `${ws.length > 1 ? ws.length + ' ' + UNIT_DEFS[WAYFINDER].name + 's follow' : ws[0].name + ' follows'} ${a.name}.` : 'You have no army to follow.');
    cmdKey = ''; return;
  }
  if (id === 'stealth') {
    const d = selScouts().find(w => w.detected); if (d) return toast(`${d.name} has been detected: he can’t sneak again until he is back in your land and out of sight.`, true);
    const ws = selScouts(), on = ws.some(w => w.stealth);
    const r = cu(id); if (!on) for (const w of ws) if (w.stealth) stopSight(w);
    return r;
  }
  return cu(id);
}; }
{ const mk = magicCmdKey; magicCmdKey = function () { return mk() + '|v102:' + selScouts().map(w => w.id + (w.follow ? 'f' : '') + (w.sight ? (w.sight.on ? 'S' : 's') : '') + (w.detected ? 'd' : '') + (w.stealth ? 'h' : '')).join(','); }; }

// marks over scouts: a red eye over a detected one, a spinning ring while Scout Sight focuses, a golden eye once it is up
function drawScoutMarks(g, t) {
  const K = typeof UKK === 'number' ? UKK : 1;
  for (const u of S.units) {
    if (u.kind !== WAYFINDER || !(u.detected || u.sight)) continue;
    if (u.owner !== ME && !S.visible.has(u.prov)) continue;
    const x = u.x, y = u.y - 58 * K;
    g.save(); g.lineJoin = 'round';
    if (u.sight && !u.sight.on) {
      const f = Math.min(1, (S.t - u.sight.t0) / SIGHT_CAST);
      g.beginPath(); g.arc(x, y, 11 * K, 0, 7); g.fillStyle = 'rgba(29,26,34,0.55)'; g.fill();
      g.beginPath(); g.arc(x, y, 11 * K, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.lineWidth = 4 * K; g.strokeStyle = '#f4c44f'; g.stroke();
    } else {
      const col = u.detected && !(u.sight && u.sight.on) ? '#e0403a' : '#f4c44f';
      g.beginPath(); g.moveTo(x - 13 * K, y); g.quadraticCurveTo(x, y - 11 * K, x + 13 * K, y); g.quadraticCurveTo(x, y + 11 * K, x - 13 * K, y); g.closePath();
      g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3 * K; g.strokeStyle = OL; g.stroke();
      g.beginPath(); g.arc(x, y, 4.5 * K, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 1.6 * K; g.stroke();
      if (u.sight && u.sight.on) { const w = (t * 0.7) % 1; g.globalAlpha = 1 - w; g.beginPath(); g.arc(x, y, (14 + w * 22) * K, 0, 7); g.lineWidth = 2.5 * K; g.strokeStyle = '#f4c44f'; g.stroke(); }
    }
    g.restore();
  }
}

// ---------- 7: what each computer nation has explored with its scouts and armies (the player's is S.wf / S.known) ----------
let aiScoutT = -9;
function stepAiScouted(t) {
  if (t - aiScoutT < 0.5 && t >= aiScoutT) return; aiScoutT = t;
  if (!S.aiScouted) S.aiScouted = {};
  for (const u of S.units) {
    if (u.owner === ME || !isNation(u.owner) || (u.kind !== 'army' && u.kind !== WAYFINDER)) continue;
    const L = S.aiScouted[u.owner] || (S.aiScouted[u.owner] = new Set()); L.add(u.prov);
  }
}

// ---------- 5b: with Take provinces open in Diplomacy, clicking their province on the map picks it ----------
{ const ca = clickAt; clickAt = function (sx, sy, right, shift, ctrl) {
  if (!right && dipOpen && dipTerm === 'provs' && dipSel && !pathAim && !surveyAim) {
    const [wx, wy] = toWorld(sx, sy), p = provAt(wx, wy), w = warBetween(ME, dipSel);
    if (p >= 0 && w && nationOf(p) === dipSel) {
      if (S.dipPick.has(p)) S.dipPick.delete(p);
      else {
        const dm = demandMax(warscore(w, ME));
        if (!dipPickable(dipSel, w).includes(p)) toast(`${provName(p)} can’t be taken: ${!scoutedBy(ME, p) ? 'explore it with a scout or an army first' : p === capitalOf(dipSel) ? 'their capital only goes with everything else, at +100' : 'another nation occupies it'}.`, true);
        else if (!pickReach(dipSel).has(p)) toast(`${provName(p)} doesn’t connect to your capital through your land or the provinces picked so far.`, true);
        else if (S.dipPick.size >= dm) toast(`You can pick at most ${dm} province${dm === 1 ? '' : 's'} now.`, true);
        else S.dipPick.add(p);
      }
      dipKey = ''; sfx('ui_click'); return;
    }
  }
  return ca(sx, sy, right, shift, ctrl);
}; }

// ---------- 32: combining two armies that each have a Magic User: one of them steps out first ----------
function detachMageOf(a) {
  if (!(a.troops[MAGE] > 0)) return null;
  if (a.cast) cancelCast(a);
  a.troops[MAGE]--; if (!a.troops[MAGE]) delete a.troops[MAGE];
  const m = mkUnit(S.nextId++, MAGE, UNIT_DEFS[MAGE].name, a.prov, 0);
  m.owner = a.owner; m.slot = freeSlot(a.prov, m); [m.x, m.y] = slotPos(a.prov, m.slot); m.born = S.t;
  m.mana = manaOf(a); delete a.mana; m.auto = { ...(a.auto || {}) };
  S.units.push(m);
  if (troopCount(a) <= 0) removeArmy(a);
  return m;
}
{ const cb = combineArmies; combineArmies = function (list) {
  const withM = list.filter(a => a.troops[MAGE] > 0);
  if (withM.length > 1 && !list.some(a => a.battle) && list.every(a => a.prov === list[0].prov)) {
    const keep = list[0].troops[MAGE] > 0 ? list[0] : withM[0];
    let n = 0; for (const a of withM) if (a !== keep && detachMageOf(a)) n++;
    list = list.filter(a => S.units.includes(a));
    if (n && list[0] && list[0].owner === ME) toast(`${n > 1 ? n + ' ' + UNIT_DEFS[MAGE].name + 's step' : 'A ' + UNIT_DEFS[MAGE].name + ' steps'} out (an army can have only one), and the armies combine.`);
    computeIncome();
    if (list.length < 2) { S.selected = S.selected.filter(v => S.units.includes(v)); return; }
  }
  return cb(list);
}; }

// ---------- notifications ----------
// 5c: right-clicking a flag acknowledges every flag of that kind; a flag comes back only for a new instance (a different
//     plot, building, den...), or once its reason has gone away and come back
// 27: no Grave Robbing / Sacred Pyre flag while gold is full, no Trading flag while everything is full
// 33: left-clicking a flag with several instances (open plots, upgrades, dens with room) steps through them in turn
function allUpgradable() {
  const out = [];
  for (const p of myProvList()) {
    const b = S.buildings.get(p);
    if (b.stage === 0 && !upgradeWhy(p)) out.push({ p, part: 'settlement' });
    for (const e of extrasIn(p)) {
      const d = BUILD_DEFS[e.type], lv = e.level || 1; if (!d.levels || lv >= d.levels.length || S.xup.has(p + '@' + e.slot)) continue;
      const needT = e.type === 'pyre' ? null : (e.type === 'forge' ? ['battleforge', 'warforge'] : ['sanctum', 'arcanum'])[lv - 1];
      if (needT && !hasTech(needT)) continue;
      if (canAfford(d.ups[lv].cost)) out.push({ p, part: e.type + '@' + e.slot });
    }
  }
  return out;
}
const openPlots = () => freeMasons().length ? myProvList().filter(p => usedSlots(p).size < plotCap(p) && BUILD_ORDER.some(type => !buildCheck(p, type))) : [];
const FLAG_INST = {
  plots: () => openPlots().map(p => ({ key: p + '@' + freePlot(p), go: () => { S.selected = []; S.selBuilding = -1; S.selPart = null; S.selProv = p; hoverPath = undefined; const P = G.provs[p], k = freePlot(p), off = k >= 0 ? bslotOf(p, k) : [0, 0]; flyTo({ x: P.ic[0] + off[0], y: P.ic[1] + off[1], z: Math.max(cam.z, fitZ * 2.6 * WORLD_K) }); } })),
  upg: () => allUpgradable().map(u => ({ key: u.p + '|' + u.part, go: () => { selectPart(u.p, u.part); cmdKey = ''; const P = G.provs[u.p], off = u.part === 'settlement' ? [0, 0] : bslotOf(u.p, +u.part.split('@')[1]); flyTo({ x: P.ic[0] + off[0], y: P.ic[1] + off[1], z: Math.max(cam.z, fitZ * 2.6 * WORLD_K) }); } })),
  denroom: () => denRooms().map(d => ({ key: d.p + '@' + d.e.slot, go: () => { lookAtProv(d.p); selectPart(d.p, 'market@' + d.e.slot); cmdKey = ''; selKey = ''; } }))
};
const instCache = {};
function flagInst(id, fresh) {
  const c = instCache[id], now = performance.now() / 1000;
  if (!fresh && c && now - c.t < 1) return c.list;
  const list = FLAG_INST[id](); instCache[id] = { t: now, list }; return list;
}
const flagAck = new Map(), flagCycle = {};
let flagLast = [];
const flagType = id => id.split(':')[0];
{ const fl = flagList; flagList = function () {
  let out = fl();
  if (!S.started) return out;
  // 27: economic spells only while there is room for what they bring in
  const full = k => S.stock[k] >= storageCap(k);
  out = out.filter(f => !((f.id === 'spell:graverob' || f.id === 'spell:sacred') && full('gold')) && !(f.id === 'spell:trading' && RES.every(full)));
  const ids = new Set(out.map(f => f.id));
  for (const id of [...flagAck.keys()]) if (!ids.has(id)) flagAck.delete(id);
  out = out.filter(f => {
    const a = flagAck.get(f.id); if (!a) return true;
    if (a === true || !FLAG_INST[f.id]) return false;
    const cur = flagInst(f.id).map(x => x.key);
    if (cur.some(k => !a.has(k))) { flagAck.delete(f.id); return true; }
    flagAck.set(f.id, new Set(cur.filter(k => a.has(k)))); return false;
  });
  flagLast = out;
  return out;
}; }
$q('#nflags').addEventListener('contextmenu', e => {
  const b = e.target.closest('[data-flag]'); if (!b) return;
  const type = flagType(b.dataset.flag);
  for (const f of flagLast.concat([{ id: b.dataset.flag }])) {
    if (flagType(f.id) !== type) continue;
    flagDismissed.delete(f.id);   // this list decides now (the old one forgot flags added by later versions)
    flagAck.set(f.id, FLAG_INST[f.id] ? new Set(flagInst(f.id, true).map(x => x.key)) : true);
  }
  flagKey = '';
});
$q('#nflags').addEventListener('click', e => {
  const b = e.target.closest('[data-flag]'); if (!b) return;
  const id = b.dataset.flag; if (!FLAG_INST[id]) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const list = flagInst(id, true); if (!list.length) return;
  const i = flagCycle[id] = ((flagCycle[id] === undefined ? -1 : flagCycle[id]) + 1) % list.length;
  list[i].go();
  if (list.length > 1) toast(`${i + 1} of ${list.length}: click the flag again for the next one.`);
}, true);

// ---------- every frame ----------
{ const sa = stepAI; stepAI = function (t, dt) {
  const r = sa(t, dt);
  if (!S.started) return r;
  try { stepDetection(S.t); stepSight(S.t); stepFollow(S.t); stepAiScouted(S.t); } catch (e) { reportError(e, 'v102 step'); }
  return r;
}; }

// ---------- new game / loading a save ----------
{ const sv = setupV96; setupV96 = function (loaded) {
  const r = sv(loaded);
  if (!loaded) S.aiScouted = {};
  else {
    if (!S.aiScouted) { S.aiScouted = {}; for (const N of Object.values(NATIONS)) if (N && N.surveyed) S.aiScouted[N.id] = new Set(N.surveyed); }
    if (S.mageGear && S.mageGear.skull === 'skull2') S.mageGear.skull = 'skull1';   // the Chipped Skull is gone
  }
  flagAck.clear(); detectT = followT = aiScoutT = -9;
  for (const k in XICON) if (k === 'fireball' || k === 'shock') delete XICON[k];
  return r;
}; }


// ================= v102 (second list): battles, lone Magic Users, walls, recording =================

// ---------- walls: health by kind (palisade 40, spiked 80, stone 120); 10+ soldiers batter 1 a second; spells hit hard ----------
const WALL_MAX = { wood: 40, spiky: 80, stone: 120 };
const WALL_SPELL = { shock: 40, quake: 120 };
const SPIKE_DPS = 5;   // a spiked wall hurts every army battering it
// each wall by its builder: Swamplings' Spiked Walls, everyone else's Stone Walls, or a wooden palisade before either
const wallType = i => { const o = wallOwner(i); return techOf(o, 'walls2') ? (isSw(o) ? 'spiky' : 'stone') : 'wood'; };
function wallLife(i) {
  if (!S.wallMax) S.wallMax = {};
  const max = WALL_MAX[wallType(i)], was = S.wallMax[i];
  let hp = S.wallHp[i];
  if (hp === undefined || was === undefined) hp = hp === undefined || hp > max ? max : hp;   // a new wall (or one from an older save)
  else if (was !== max) hp = hp * max / was;   // rebuilt as a stronger wall: same share of its health
  S.wallHp[i] = hp; S.wallMax[i] = max;
  return { hp, max };
}
// returns true when the wall comes down
function damageWall(i, dmg, by) {
  if (!S.walls.has(i)) return false;
  const w = wallLife(i); S.wallHp[i] = w.hp - dmg;
  if (S.wallHp[i] <= 0) { delete S.wallCrack[i]; delete S.wallMax[i]; breakWall(i, by); return true; }
  const crack = S.wallHp[i] <= w.max / 2; if (!!S.wallCrack[i] !== crack) { S.wallCrack[i] = crack; cacheDirty = true; }   // cracks show below half health
  return false;
}
stepSiege = function (dt) {
  if (!dt) return;
  const at = new Map();
  for (const a of S.units) {
    if (a.kind !== 'army' || a.sieging == null || a.battle || troopCount(a) < SIEGE_MIN) continue;
    if (!S.walls.has(a.sieging)) { a.sieging = null; continue; }
    if (!at.has(a.sieging)) at.set(a.sieging, []); at.get(a.sieging).push(a);
  }
  for (const [i, list] of at) {
    if (wallType(i) === 'spiky') for (const a of list) spikeHurt(a, dt);
    const alive = list.filter(a => S.units.includes(a)), n = alive.reduce((s, a) => s + troopCount(a), 0);
    if (n >= SIEGE_MIN) damageWall(i, dt, alive[0]);   // 1 wall health a second
  }
};
function spikeHurt(a, dt) {
  a.spikeAcc = (a.spikeAcc || 0) + SPIKE_DPS * dt;
  if (a.spikeAcc < SPIKE_DPS) return;   // dealt once a second
  const dmg = a.spikeAcc; a.spikeAcc = 0;
  a.wounds = (a.wounds || 0) + dmg;
  if (S.visible.has(a.prov)) S.fx.push({ kind: 'num', prov: a.prov, owner: a.owner, n: Math.round(dmg), t0: S.t });
  for (;;) {
    const ks = Object.keys(a.troops).filter(k => a.troops[k] > 0 && k !== MAGE); if (!ks.length) break;
    const k = ks[Math.floor(Math.random() * ks.length)], hp = hpOf(a, k);
    if (a.wounds < hp) break;
    a.wounds -= hp; a.troops[k]--; if (!a.troops[k]) delete a.troops[k];
    if (S.visible.has(a.prov)) S.fx.push({ kind: 'fall', prov: a.prov, owner: a.owner, unit: k, t0: S.t, r: Math.random() });
  }
  if (!Object.keys(a.troops).some(k => a.troops[k] > 0 && k !== MAGE)) {
    if (a.owner === ME) toast(`${a.name} was cut to pieces on the spiked wall.`, true);
    removeArmy(a);
  }
}
// a health bar over every damaged wall you can see
function drawWallLife(g) {
  const V = world.vertices, K = typeof UKK === 'number' ? UKK : 1;
  for (const i of S.walls) {
    if (S.wallHp[i] === undefined) continue;
    const e = world.edges[i]; if (!S.visible.has(e.a) && !S.visible.has(e.b)) continue;
    const w = wallLife(i); if (w.hp >= w.max - 0.01) continue;
    const a = V[e.v[0]], b = V[e.v[1]], x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2 - 46, W = 60 * Math.max(1, K), H = 9;
    g.save(); g.fillStyle = '#1d1a22'; g.fillRect(x - W / 2 - 2, y - 2, W + 4, H + 4);
    g.fillStyle = '#5a3d2a'; g.fillRect(x - W / 2, y, W, H);
    g.fillStyle = w.hp / w.max > 0.5 ? '#e8c33a' : '#e0503a'; g.fillRect(x - W / 2, y, W * Math.max(0, w.hp / w.max), H);
    g.restore();
  }
}
{ const dv = drawV102; drawV102 = function (g, t) { dv(g, t); drawWallLife(g); }; }

// ---------- armies meet: two hostile armies crossing the same border head-on fight instead of swapping places ----------
const MEET_DIST = 60;
function meetHeadOn() {
  const movers = S.units.filter(a => a.kind === 'army' && a.moving && !a.battle && !a.retreating && !a.exiting && troopCount(a) > 0);
  for (let x = 0; x < movers.length; x++) for (let y = x + 1; y < movers.length; y++) {
    const A = movers[x], B = movers[y];
    if (A.prov === B.prov || !hostile(A.owner, B.owner) || !allNbr[A.prov].includes(B.prov)) continue;
    if (Math.hypot(A.x - B.x, A.y - B.y) > MEET_DIST) continue;
    const next = u => (u.path.find(w => w.enter !== undefined) || {}).enter;
    // whoever is about to step into the other's province does so now, and the battle starts there
    const mover = next(A) === B.prov ? A : next(B) === A.prov ? B : null; if (!mover) continue;
    const other = mover === A ? B : A;
    mover.lastProv = mover.prov; mover.prov = other.prov; mover.path = []; mover.moving = false;
  }
}

// ---------- a Magic User caught on his own by a hostile army (or Magic User) fights: he stands as an army of one ----------
function standMage(m) {
  if (m.cast) cancelCast(m); if (m.quake) endQuake(m);
  const a = newArmy(m.prov, { [MAGE]: 1 });
  a.owner = m.owner; a.name = m.name; a.x = m.x; a.y = m.y; a.mana = manaOf(m); a.auto = { ...(m.auto || {}) };
  a.loneMage = { name: m.name, born: m.born };
  S.units = S.units.filter(v => v !== m);
  if (S.selected.includes(m)) S.selected = S.selected.map(v => v === m ? a : v);
  if (m.owner === ME) { computeIncome(); rosterKey = ''; cmdKey = ''; toast(`${m.name} is caught at ${provName(m.prov)} and fights!`, true); }
}
function unstandMage(a) {
  const m = mkUnit(S.nextId++, MAGE, a.loneMage.name, a.prov, 0);
  m.owner = a.owner; m.x = a.x; m.y = a.y; m.slot = freeSlot(a.prov, m); m.born = a.loneMage.born; m.mana = manaOf(a); m.auto = { ...(a.auto || {}) };
  S.units = S.units.filter(v => v !== a); S.units.push(m);
  if (S.selected.includes(a)) S.selected = S.selected.map(v => v === a ? m : v);
  if (m.owner === ME) { computeIncome(); rosterKey = ''; cmdKey = ''; }
}
const mageFoesIn = m => S.units.some(v => v !== m && v.prov === m.prov && hostile(v.owner, m.owner) && !v.exiting && ((v.kind === 'army' && !v.retreating && troopCount(v) > 0) || v.kind === MAGE));
function stepLoneMages() {
  for (const m of S.units.slice()) if (m.kind === MAGE && !m.exiting && S.units.includes(m) && mageFoesIn(m)) standMage(m);
  // after the battle (or if the army of one never got into one), he is a Magic User on his own again
  for (const a of S.units.slice()) {
    if (a.kind !== 'army' || !a.loneMage || a.battle) continue;
    const ks = Object.keys(a.troops).filter(k => a.troops[k] > 0);
    if (ks.length !== 1 || ks[0] !== MAGE || a.troops[MAGE] !== 1) { delete a.loneMage; continue; }   // he joined others
    if (!hostilesIn(a.prov, a.owner).length) unstandMage(a);
  }
}
{ const sb = stepBattles; stepBattles = function (t) {
  try { meetHeadOn(); stepLoneMages(); } catch (e) { reportError(e, 'v102 battles'); }
  return sb(t);
}; }

// ---------- recording a game: the decisions and milestones that show how each nation scales ----------
// Settings → Record games (remembered). A recording starts with a new game (or the moment it is turned on), lives in the
// save, and Export recording downloads it as a .json file: a header (version, map, nations with difficulty and race),
// events (research picked and what was passed over, buildings, settlements, designs, training in 30 s bunches, spells, wars
// and peace terms, research finished) and a line per nation every 30 s (land, income, research rates, buildings, army, gear).
// Left out as noise: movement, selection, camera, cancelled training, and buildings torn down within a minute.
const REC_SNAP = 30;
let recPref = (() => { try { return localStorage.getItem('realm-record') === '1'; } catch (e) { return false; } })();
let recPrev = null, recT = -9;
const recOn = () => !!(S.rec && S.rec.on && S.started && world.mode !== 'practice' && !S.tutorial);
const recNations = () => [ME, ...aiIds().filter(o => NATIONS[o] && NATIONS[o].alive)];
const nameOf = o => o === ME ? 'You' : `${PLAYERS[o] ? PLAYERS[o].name : 'Nation ' + o} (${NATIONS[o] ? DIFF_NAME[NATIONS[o].diff] : '?'})`;
function recStart(why) {
  S.rec = {
    v: 1, on: true, game: GAME_VERSION, began: S.t, why,
    header: { seed: world.pickSeed, mode: world.mode || 'normal', provinces: G.provs.length, nations: recNations().map(o => ({ id: o, name: PLAYERS[o] ? PLAYERS[o].name : '', label: nameOf(o), race: raceOf(o), diff: o === ME ? 'player' : NATIONS[o].diff, family: o === ME ? null : NATIONS[o].family, school: o === ME ? null : NATIONS[o].wantSchool || NATIONS[o].school })) },
    ev: [], snap: [], ms: {}, qb: {}, sp: {}
  };
  recPrev = null; recT = -9;
}
const rt = () => Math.round(S.t);
function recEv(o, e, data) { if (recOn()) S.rec.ev.push({ t: rt(), o, e, ...data }); }
function nationStock(o) { return o === ME ? S.stock : NATIONS[o].stock; }
function nationIncome(o) { return o === ME ? income : NATIONS[o].income; }
function nationTech(o) { return o === ME ? S.tech : NATIONS[o].tech; }
function nationRate(o, tree) { return o === ME ? techRate(tree) : aiTechRate(NATIONS[o], tree); }
function nationBuildings(o) {
  const m = new Map();
  for (const [p, b] of S.buildings) if (b.owner === o) for (const e of extrasIn(p)) m.set(p + '@' + e.slot, e.type + ':' + (e.level || 1));
  return m;
}
function nationSettle(o) { const m = new Map(); for (const [p, b] of S.buildings) if (b.owner === o) m.set(p, b.cc ? 'cc' : b.stage); return m; }
const designOf = k => (typeof ALL_DESIGNS !== 'undefined' && ALL_DESIGNS.get(k)) || S.designs.find(d => d.id === k) || null;
function gearOf(o) {
  let wT = 0, wN = '', aL = 0, aN = '', top = null, topN = 0; const by = {};
  for (const v of S.units) if (v.owner === o && v.kind === 'army') for (const k in v.troops) {
    if (k === MAGE || !(v.troops[k] > 0)) continue;
    const d = designOf(k); if (!d) continue;
    const W = WEAPONS[d.weapon], A = ARMORS[d.armor];
    if (W && W.tier > wT) { wT = W.tier; wN = W.name; }
    if (A && (A.level || 0) > aL) { aL = A.level || 0; aN = A.name; }
    const key = `${W ? W.name : d.weapon}/${A ? A.name : d.armor}${d.shield ? '/' + d.shield : ''}${d.type === 'cav' ? '/cav' : ''}`;
    by[key] = (by[key] || 0) + v.troops[k];
  }
  for (const [k, n] of Object.entries(by)) if (n > topN) { top = k; topN = n; }
  return { weapon: wN ? `${wN} (T${wT})` : '-', armor: aN ? `${aN} (L${aL})` : '-', mix: by, main: top };
}
function recSnap() {
  for (const o of recNations()) {
    const T = nationTech(o), inc = nationIncome(o), st = nationStock(o), bld = {};
    for (const v of nationBuildings(o).values()) { const ty = v.split(':')[0]; bld[ty] = (bld[ty] || 0) + 1; }
    const forts = [...S.buildings.values()].filter(b => b.owner === o && b.stage >= 1).length, gear = gearOf(o);
    const mages = S.units.reduce((n, v) => n + (v.owner === o ? magesIn(v) || 0 : 0), 0);
    S.rec.snap.push({
      t: rt(), o, provs: provsOf(o).length, forts,
      inc: { g: Math.round(inc.gold), w: Math.round(inc.wood), f: Math.round(inc.food) }, stock: { g: Math.round(st.gold), w: Math.round(st.wood), f: Math.round(st.food) },
      rate: { gov: nationRate(o, 'gov'), mil: nationRate(o, 'mil'), mag: nationRate(o, 'mag') },
      techs: { gov: T.gov.done.length, mil: T.mil.done.length, mag: T.mag.done.length, cur: [T.gov.cur, T.mil.cur, T.mag.cur].filter(Boolean) },
      bld, soldiers: soldierCount(o), power: nationPower(o), mages, gear: { weapon: gear.weapon, armor: gear.armor, main: gear.main }, mix: gear.mix,
      school: o === ME ? currentSchool() : NATIONS[o].school || null, wars: warsOf(o).length
    });
  }
  // the player's training and spells, in 30-second bunches
  if (Object.keys(S.rec.qb).length) { S.rec.ev.push({ t: rt(), o: ME, e: 'trained', units: S.rec.qb }); S.rec.qb = {}; }
  if (Object.keys(S.rec.sp).length) { S.rec.ev.push({ t: rt(), o: ME, e: 'spells', cast: S.rec.sp }); S.rec.sp = {}; }
}
const MS_PROV = [10, 20, 30, 40], MS_POW = [1000, 5000, 10000, 20000];
function recMilestones(o) {
  const M = S.rec.ms[o] || (S.rec.ms[o] = {}), mark = (k, extra) => { if (M[k] === undefined) { M[k] = rt(); S.rec.ev.push({ t: rt(), o, e: 'milestone', what: k, ...(extra || {}) }); } };
  const types = new Set([...nationBuildings(o).values()].map(v => v.split(':')[0]));
  for (const ty of ['barracks', 'forge', 'magetower', 'temple', 'stable', 'market']) if (types.has(ty)) mark('first ' + (BUILD_DEFS[ty] ? BUILD_DEFS[ty].name : ty));
  for (const v of nationBuildings(o).values()) { const [ty, lv] = v.split(':'); if (ty === 'forge' && +lv >= 2) mark('Forge level ' + lv); }
  if ([...S.buildings.values()].some(b => b.owner === o && b.stage === 1)) mark('first fort');
  const T = nationTech(o);
  if (T.mil.done.length) mark('first military research');
  for (const id of T.mil.done) { const x = TECH_BY_ID[id]; if (!x) continue; if (id.startsWith('w-') && x.tier >= 2) mark(`weapon tier ${x.tier}`, { tech: x.name }); if (id.startsWith('a-') && x.tier >= 2) mark(`armor tier ${x.tier}`, { tech: x.name }); }
  if (T.mag.done.some(id => id.startsWith('school-'))) mark('school of magic', { school: o === ME ? currentSchool() : NATIONS[o].school });
  const n = provsOf(o).length; for (const k of MS_PROV) if (n >= k) mark(k + ' provinces');
  const pw = nationPower(o); for (const k of MS_POW) if (pw >= k) mark('army power ' + fmtPow(k));
}
function stepRecord() {
  if (!recOn()) return;
  if (S.t - recT < 1 && S.t >= recT) return; recT = S.t;
  const nations = recNations(), now = { b: {}, s: {}, techs: {}, designs: new Map(S.designs.map(d => [d.id, [d.name, d.weapon, d.armor, d.shield || '', d.off || '', d.horse || ''].join('|')])), wars: new Set(S.wars.map(w => w.id)) };
  for (const o of nations) { now.b[o] = nationBuildings(o); now.s[o] = nationSettle(o); const T = nationTech(o); now.techs[o] = new Set([...T.gov.done, ...T.mil.done, ...T.mag.done]); }
  if (recPrev) {
    for (const o of nations) {
      const was = recPrev.b[o] || new Map(), is = now.b[o], st = nationStock(o), n = provsOf(o).length;
      for (const [k, v] of is) {
        const before = was.get(k), [ty, lv] = v.split(':'), p = +k.split('@')[0];
        if (before === v) continue;
        if (before && before.split(':')[0] === ty) S.rec.ev.push({ t: rt(), o, e: 'upgraded', type: ty, level: +lv, at: provName(p) });
        else S.rec.ev.push({ t: rt(), o, e: 'built', type: ty, at: provName(p), provs: n, gold: Math.round(st.gold), key: o + ':' + k });
      }
      for (const [k, v] of was) if (!is.has(k)) {
        // torn down (or lost) within a minute of going up: neither counts
        const j = S.rec.ev.findIndex(x => x.e === 'built' && x.key === o + ':' + k && S.t - x.t < 60);
        if (j >= 0) S.rec.ev.splice(j, 1); else S.rec.ev.push({ t: rt(), o, e: 'lost building', type: v.split(':')[0], at: provName(+k.split('@')[0]) });
      }
      const sw = recPrev.s[o] || new Map(), si = now.s[o], word = s => s === 'cc' ? 'conquered capital' : STAGE_WORD[s];
      for (const [p, s] of si) { const b4 = sw.get(p); if (b4 === s) continue; S.rec.ev.push({ t: rt(), o, e: b4 === undefined ? 'gained ' + word(s) : s === 1 && b4 === 0 ? 'fort' : 'settlement now ' + word(s), at: provName(p), provs: n }); }
      for (const [p, s] of sw) if (!si.has(p)) S.rec.ev.push({ t: rt(), o, e: 'lost ' + (s === 'cc' ? 'conquered capital' : STAGE_WORD[s]), at: provName(p), to: nationOf(p) ? nameOf(nationOf(p)) : null });
      const tw = recPrev.techs[o] || new Set();
      for (const id of now.techs[o]) if (!tw.has(id)) S.rec.ev.push({ t: rt(), o, e: 'researched', id, name: TECH_BY_ID[id] ? TECH_BY_ID[id].name : id, tree: TECH_BY_ID[id] ? TECH_BY_ID[id].tree : '' });
      recMilestones(o);
    }
    for (const [id, sig] of now.designs) { const b4 = recPrev.designs.get(id); if (b4 === sig) continue; const [name, weapon, armor, shield, off, horse] = sig.split('|'); S.rec.ev.push({ t: rt(), o: ME, e: b4 ? 'design changed' : 'design', name, weapon, armor, shield, off, horse }); }
    for (const w of S.wars) if (!recPrev.wars.has(w.id)) S.rec.ev.push({ t: rt(), o: w.by || w.a, e: 'war', between: [nameOf(w.a), nameOf(w.b)], declaredBy: nameOf(w.by || w.a), viaAlliance: !!w.parent });
    for (const id of recPrev.wars) if (!now.wars.has(id)) S.rec.ev.push({ t: rt(), o: 0, e: 'war over', war: id });
  } else for (const o of nations) recMilestones(o);
  recPrev = now;
  if (!S.rec.snap.length || S.t - S.rec.snap[S.rec.snap.length - 1].t >= REC_SNAP) recSnap();
}
// the player's choices, as they are made
{ const pt = pickTech; pickTech = function (id) {
  const x = TECH_BY_ID[id], tree = x && x.tree, offered = tree && S.tech[tree] ? S.tech[tree].opts.slice() : [];
  const r = pt(id);
  if (recOn() && tree && S.tech[tree].cur === id) recEv(ME, 'picked research', { tree, id, name: x.name, passedOver: offered.filter(k => k !== id).map(k => TECH_BY_ID[k] ? TECH_BY_ID[k].name : k), auto: !!(S.autoTech && S.autoTech[tree]) });
  return r;
}; }
{ const tr = train; train = function (kind) {
  const key = srcKey(), n0 = (S.queues[key] || []).length, r = tr(kind);
  if (recOn() && (S.queues[key] || []).length > n0) { const nm = UNIT_DEFS[kind] ? UNIT_DEFS[kind].name : kind; S.rec.qb[nm] = (S.rec.qb[nm] || 0) + 1; }
  return r;
}; }
{ const ct = cancelTrain; cancelTrain = function (i) {
  const q = (S.queues[srcKey()] || [])[i], r = ct(i);
  if (recOn() && q && !q.retro) { const nm = UNIT_DEFS[q.kind] ? UNIT_DEFS[q.kind].name : q.kind; if (S.rec.qb[nm]) { if (!--S.rec.qb[nm]) delete S.rec.qb[nm]; } }
  return r;
}; }
{ const sc = startCast; startCast = function (c, spell, dur, data) {
  const r = sc(c, spell, dur, data);
  if (recOn() && c.owner === ME && c.cast) { const k = String(spell).replace(/^q:/, ''); S.rec.sp[k] = (S.rec.sp[k] || 0) + 1; }
  return r;
}; }
{ const s2 = startSpell2; startSpell2 = function (c, kind, q) {
  const r = s2(c, kind, q);
  if (r && recOn() && c.owner === ME) S.rec.sp[kind] = (S.rec.sp[kind] || 0) + 1;
  return r;
}; }
{ const mp = makePeace; makePeace = function (w, winner, terms) {
  if (recOn() && w && S.wars.includes(w)) recEv(winner, 'peace', { winner: nameOf(winner), loser: nameOf(foeOf(w, winner)), terms: terms.kind, provinces: terms.provs ? terms.provs.map(provName) : undefined, warscore: warscore(w, winner) });
  return mp(w, winner, terms);
}; }
function exportRecording() {
  if (!S.rec) return toast(recPref ? 'Nothing recorded yet: recording starts with your next new game.' : 'Turn on Record games first.', true);
  stepRecordNow();
  const out = { ...S.rec, endedAt: rt(), exported: new Date().toISOString() }; delete out.qb; delete out.sp;
  const name = `realmlings-recording-${(PLAYERS[ME].name || 'realm').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${playTime(S.t).replace(/:/g, '-')}.json`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(`Exported ${name} (${S.rec.ev.length} events, ${S.rec.snap.length} snapshots).`);
}
function stepRecordNow() { if (!recOn()) return; recT = -9; stepRecord(); recSnap(); }
// Settings: Record games (on / off, remembered) and Export recording
{
  const row = document.createElement('div'); row.className = 'menu-row';
  row.innerHTML = `<span class="lbl" title="Records the decisions and milestones of each game (yours and every computer nation's) so they can be compared. Export it to send it in.">Record games</span><div class="menu-mus"><button type="button" class="menu-tog" id="recBtn" aria-pressed="false" title="Record new games (and this one, from now on)"><span>Off</span></button><button type="button" class="menu-btn" id="recExport" title="Download this game's recording as a .json file">Export recording</button></div>`;
  const calm = $q('#calmBtn'), at = calm && calm.closest('.menu-row');
  if (at) at.after(row);
  const b = row.querySelector('#recBtn');
  const sync = () => { b.setAttribute('aria-pressed', recPref ? 'true' : 'false'); b.querySelector('span').textContent = recPref ? (S.rec && S.rec.on && S.started ? 'Recording' : 'On') : 'Off'; };
  b.addEventListener('click', e => {
    e.stopPropagation(); recPref = !recPref; try { localStorage.setItem('realm-record', recPref ? '1' : '0'); } catch (er) {}
    if (S.started) {
      if (recPref) { if (S.rec) S.rec.on = true; else recStart('turned on at ' + playTime(S.t)); toast('Recording this game.'); }
      else if (S.rec) { S.rec.on = false; toast('Recording stopped. Export recording still has what was recorded.'); }
    }
    sync(); sfx('ui_click');
  });
  row.querySelector('#recExport').addEventListener('click', e => { e.stopPropagation(); sfx('ui_click'); exportRecording(); });
  setInterval(sync, 1000); sync();
}
{ const sv = setupV96; setupV96 = function (loaded) {
  const r = sv(loaded);
  if (!S.wallMax) S.wallMax = {};
  recPrev = null; recT = -9;
  if (!loaded) { S.rec = null; if (recPref && world.mode !== 'practice') recStart('new game'); }
  return r;
}; }
{ const sa = stepAI; stepAI = function (t) { const r = sa(t); try { stepRecord(); } catch (e) { reportError(e, 'v102 record'); } return r; }; }


// ---------- music: the Swamplings and the Woodlings have their own tracks ----------
// The tavern piece plays in the menus, the tutorial and for the Realmlings; while you play as the Swamplings it crossfades
// to music/tavern_percussion.mp3 (handpan, xylophone, congas, bongos, snare; tools/tavern_percussion.py), as the Woodlings
// to music/tavern_harp.mp3 (harp, flute, fiddle; tools/tavern_harp.py), and back when you leave the game.
const MUSIC_TRACKS = { tavern: 'music/tavern.mp3', swamp: 'music/tavern_percussion.mp3', wood: 'music/tavern_harp.mp3' };
const musicWant = () => !S.started || S.tutorial ? 'tavern' : isSw(ME) ? 'swamp' : isWd(ME) ? 'wood' : 'tavern';
let musicSwap = null;
function musicCheckTrack() {
  const want = musicWant(), a = musicEl();
  if (!MUSIC.track) MUSIC.track = 'tavern';
  if (MUSIC.track === want || musicSwap) return;
  MUSIC.track = want;
  if (!MUSIC.started || !MUSIC.on || a.paused) { a.src = MUSIC_TRACKS[want]; return; }   // not playing yet: just line up the right track
  // fade out, switch, fade back in
  clearInterval(MUSIC.fade); const from = a.volume, t0 = performance.now();
  musicSwap = setInterval(() => {
    const f = Math.min(1, (performance.now() - t0) / 1200); a.volume = Math.max(0, from * (1 - f));
    if (f < 1) return;
    clearInterval(musicSwap); musicSwap = null;
    a.src = MUSIC_TRACKS[MUSIC.track]; a.currentTime = 0;
    const p = a.play(); if (p && p.catch) p.catch(() => {});
    musicFadeTo(musicTarget(), 2.5);
  }, 50);
}
setInterval(musicCheckTrack, 1000);
window.__v102 = { music: () => ({ track: MUSIC.track, src: MUSIC.el && MUSIC.el.src, paused: MUSIC.el && MUSIC.el.paused }), musicCheckTrack, musicWant: () => musicWant(), wallLife, damageWall, wallType, standMage, meetHeadOn, stepLoneMages, recStart, stepRecord, recSnap, exportRecording, stepRecordNow, rec: () => S.rec, detectZones, stepDetection, startSight, stopSight, stepFollow, nearestArmy, FLAG_INST, flagInst, flagAck, allUpgradable, detachMageOf, castMult: o => castMult(o), manaMult: o => manaMult(o), skullCut: o => skullCut(o), spellTime: (k, o) => spellTime(k, o), mc: (c, n) => mc(c, n), pathMana, sustainRoom: () => sustainRoom(), dipPickable: (o, w) => dipPickable(o, w), pickReach: o => pickReach(o), scoutedBy: (o, p) => scoutedBy(o, p), heldByFoe };
