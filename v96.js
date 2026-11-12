
// ================= v96: the user's v96 list =================
// Magic repeatables, Druids' staves, administration, automated research, cracked stone walls, AI changes, no Total War,
// the white-peace timer, province demands, alliances, bandit waves, resource-bar counters, hotkeys and control groups,
// rally points, outliner changes, a low-detail setting, builder automation, dismantling forts and more.

// ---------- magic repeatables (tech.js REP_TECHS) ----------
const rep10 = (o, id) => Math.pow(1.1, repOf(o, id));
// Deep Waters: the Grand Elemental hits harder and has more health (per owner)
{
  const _as = artStats;
  artStats = function (k, st, o) {
    const out = _as(k, st, o);
    if (k !== GELEM_ID || !o || !repOf(o, 'rep-gelem')) return out;
    const m = rep10(o, 'rep-gelem'); return { ...out, atk: out.atk * m, hp: out.hp * m };
  };
}
// Living Bark, Lingering Curses, Searing Flames: the autocast battle spells get stronger (player; the AI does not cast them)
{
  const _obj = onBattleJoin;
  onBattleJoin = function (a, t) {
    _obj(a, t);
    if (a.owner !== ME) return;
    if (a.skin) a.skin *= rep10(ME, 'rep-skin');
    if (a.curse) a.curse *= rep10(ME, 'rep-curse');
    if (a.fiery) a.fiery = Math.min(0.95, a.fiery * rep10(ME, 'rep-fiery'));
  };
}
// Druids carry staves only: no wands, no shields (also for games saved before v96)
function druidStaves() {
  if (!isWd(ME) || !S.mageGear) return;
  if (MAGE_WEAPONS[S.mageGear.weapon] && MAGE_WEAPONS[S.mageGear.weapon].line === 'wand') S.mageGear.weapon = 'stave';
  if (S.mageGear.shield) S.mageGear.shield = null;
  registerMage();
}
{
  const _sd = saveDraft;
  saveDraft = function () { if (draft && draft.type === 'mage' && isWd(ME)) { draft.shield = null; if (MAGE_WEAPONS[draft.weapon].line === 'wand') draft.weapon = 'stave'; } _sd(); };
}

// ---------- icons for the new technologies ----------
{
  const clock = g => { g.beginPath(); g.arc(18, 18, 11, 0, 7); g.fillStyle = '#fff6dc'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.moveTo(18, 18); g.lineTo(18, 11); g.moveTo(18, 18); g.lineTo(23, 20); g.lineWidth = 2.2; g.stroke(); };
  const wallIco = g => { for (const [x, y] of [[20, 50], [42, 50], [31, 38], [53, 38], [42, 26]]) ICO.poly(g, [[x - 10, y + 6], [x - 10, y - 6], [x + 10, y - 6], [x + 10, y + 6]], '#cfc8ba', 2.4); };
  const shockIco = g => { ICO.disc(g, '#e3ecff'); wallIco(g); for (const r of [12, 20]) { g.beginPath(); g.arc(8, 40, r, -0.9, 0.9); g.lineWidth = 3.4; g.strokeStyle = '#6f8fc9'; g.stroke(); } clock(g); };
  const quakeIco = g => { ICO.disc(g, '#f1e4cc'); ICO.poly(g, [[6, 44], [58, 44], [58, 58], [6, 58]], '#b08a5a'); ICO.poly(g, [[30, 44], [36, 50], [28, 53], [32, 58], [26, 58], [22, 52], [28, 48], [24, 44]], '#3b2a1a', 2); ICO.poly(g, [[22, 40], [34, 14], [46, 40]], '#cfc8ba'); clock(g); };
  const fortIco = (g, n) => { ICO.disc(g, '#ece4d2'); ICO.poly(g, [[12, 54], [12, 28], [20, 28], [20, 34], [28, 34], [28, 22], [36, 22], [36, 34], [44, 34], [44, 28], [52, 28], [52, 54]], '#cfc8ba', 2.6); ICO.poly(g, [[27, 54], [27, 42], [37, 42], [37, 54]], '#6b4a2a', 2); if (n) ICO.roman(g, n, 32, 18); };
  REP_ICONS['rep-shockcast'] = shockIco;
  REP_ICONS['rep-quakecast'] = quakeIco;
  REP_ICONS['rep-admin'] = g => fortIco(g, '+1');
  REP_ICONS['rep-skin'] = g => MAGIC_ICONS.skin(g);
  REP_ICONS['rep-curse'] = g => MAGIC_ICONS.curse1(g);
  REP_ICONS['rep-stasis'] = g => MAGIC_ICONS.stasis(g);
  REP_ICONS['rep-fiery'] = g => SW_ICONS.fiery1(g);
  REP_ICONS['rep-ftrap'] = g => SW_ICONS.firetrap(g);
  WD_ICONS['rep-gelem'] = g => WD_ICONS.gelemental(g);
  WD_ICONS['rep-rock'] = g => WD_ICONS.rockarmor(g);
  GOV_ICONS.effadmin = g => fortIco(g, '+2');
  GOV_ICONS.autobuild = g => { ICO.disc(g, '#e9f2ff'); ICO.poly(g, [[14, 52], [14, 34], [32, 20], [50, 34], [50, 52]], '#d9a46b', 2.6); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ICO.line(g, [46 + Math.cos(a) * 6, 18 + Math.sin(a) * 6], [46 + Math.cos(a) * 11, 18 + Math.sin(a) * 11], '#5d6b85', 4); } g.beginPath(); g.arc(46, 18, 7, 0, 7); g.fillStyle = '#9aa7c0'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke(); };
}

// ---------- automated research (one toggle per tree) ----------
// When a tree's toggle is on and nothing is being researched there, the cheapest technology on offer is started.
// It never picks a magic school, Abandon Magic School, or anything that needs gold to begin.
S.autoTech = { gov: false, mil: false, mag: false };
function autoResearch() {
  if (!S.autoTech) return;
  for (const tree of TREE_KEYS) {
    const st = S.tech[tree]; if (!S.autoTech[tree] || !st.tier || st.cur) continue;
    if (!st.opts.length) drawOptions(tree);
    const pick = st.opts.map(id => TECH_BY_ID[id]).filter(x => x && !x.id.startsWith('school-') && x.id !== 'abandon' && !x.gold).sort((a, b) => techCost(a) - techCost(b) || a.tier - b.tier)[0];
    if (pick) pickTech(pick.id);
  }
}
{
  const _tp = techPayday;
  techPayday = function () { autoResearch(); _tp(); autoResearch(); };
  const _rt = renderTech;
  renderTech = function () {
    _rt();
    if (!techOpen) return;
    const panel = $q('#techPanel'); if (panel.querySelector('.tp-auto')) { for (const b of panel.querySelectorAll('.tp-auto')) b.classList.toggle('on', !!S.autoTech[b.dataset.tp.slice(5)]); return; }
    panel.querySelectorAll('.tp-tree').forEach((el, i) => {
      const tree = TREE_KEYS[i], th = el.querySelector('.tp-th'); if (!th || !S.tech[tree].tier) return;
      th.insertAdjacentHTML('beforeend', `<button type="button" class="tp-auto${S.autoTech[tree] ? ' on' : ''}" data-tp="auto:${tree}" title="Automated research: when nothing is being researched in ${TECH_TREES[tree].name}, start the cheapest technology on offer (never a magic school)">Auto</button>`);
    });
  };
  techEl.addEventListener('click', e => {
    const b = e.target.closest('[data-tp^="auto:"]'); if (!b) return;
    e.stopImmediatePropagation();
    const tree = b.dataset.tp.slice(5); S.autoTech[tree] = !S.autoTech[tree]; techKey = '';
    sfx('ui_click'); toast(`Automated ${TECH_TREES[tree].name} research ${S.autoTech[tree] ? 'on: the cheapest technology on offer is picked whenever the tree is idle' : 'off'}.`);
    autoResearch();
  }, true);
}

// ---------- stone walls take two spell hits (Shockwave / Fireball or Earthquake); the first one cracks them ----------
S.wallCrack = {};
const wallOwner = i => { const e = world.edges[i], g = e && S.gateOwn.get(linkKey(e.a, e.b)); return g ? g.owner : ME; };
const wallStone = i => techOf(wallOwner(i), 'walls2');
// returns true when the wall comes down, false when it only cracked
function spellHitWall(i, by) {
  if (!S.walls.has(i)) return false;
  if (wallStone(i) && !S.wallCrack[i]) {
    S.wallCrack[i] = true; cacheDirty = true;
    const e = world.edges[i], ctl = gateCtl(linkKey(e.a, e.b));
    if (ctl === ME && (!by || by.owner !== ME)) toast(`The stone wall between ${provName(e.a)} and ${provName(e.b)} is cracked! One more spell will bring it down.`, true);
    return false;
  }
  delete S.wallCrack[i]; breakWall(i, by); return true;
}
function drawWallCracks(g, a, b, spiked) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, n = Math.max(3, Math.round(L / 45));
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (let k = 0; k < n; k++) {
    const f = (k + 0.5) / n, x = a[0] + dx * f, y = a[1] + dy * f, s = 1.6 + (k % 2) * 0.4;
    const path = () => { g.beginPath(); g.moveTo(x - 2 * s, y - 13 * s); g.lineTo(x + 3 * s, y - 7 * s); g.lineTo(x - 3 * s, y - 1 * s); g.lineTo(x + 4 * s, y + 5 * s); g.lineTo(x + 1 * s, y + 10 * s); g.moveTo(x + 3 * s, y - 7 * s); g.lineTo(x + 9 * s, y - 9 * s); g.moveTo(x - 3 * s, y - 1 * s); g.lineTo(x - 9 * s, y + 2 * s); };
    path(); g.lineWidth = 5.5; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke();
    path(); g.lineWidth = 3.4; g.strokeStyle = spiked ? '#2a1a0c' : '#2b2620'; g.stroke();
    // fallen chunks at the foot of the wall
    for (const o of [-1, 1]) { const rx = x + uy * 16 * o + ux * 6 * o, ry = y - ux * 16 * o + 12; g.beginPath(); g.rect(rx - 5, ry - 3.5, 10, 7); g.fillStyle = spiked ? '#8b6a45' : '#bdb5a6'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); }
  }
  g.restore();
}

// ---------- dismantle a fort: back to an outpost, every building in the province is torn down ----------
function dismantleWhy(p) {
  const b = S.buildings.get(p);
  if (!b || b.owner !== ME) return 'Not yours';
  if (b.stage !== 1) return 'Only a fort can be dismantled';
  if (S.occ.has(p)) return 'The province is occupied';
  if (S.battles && S.battles.some(x => x.prov === p)) return 'Not during a battle';
  return null;
}
function dismantleFort(p) {
  const why = dismantleWhy(p); if (why) return toast('Can’t dismantle the fort: ' + why.toLowerCase() + '.', true);
  const lost = extrasIn(p).length;
  if (!confirmTwice('dismantle:' + p, `Dismantle the fort at ${provName(p)}? It goes back to an outpost and all ${lost} building${lost === 1 ? '' : 's'} in the province are destroyed. Click again (or press Delete) to confirm.`)) return;
  S.extras.delete(p);
  for (const k of [...S.xup.keys()]) if (+k.split('@')[0] === p) S.xup.delete(k);
  for (const v of S.units) if (v.owner === ME && v.build && v.build.prov === p && BUILD_DEFS[v.build.type] && v.build.type !== 'outpost') cancelBuild(v);
  for (const key of Object.keys(S.queues)) { const [kind, q] = key.split(':'); if (+q === p && kind !== 'capital') { for (const e of S.queues[key]) if (e.paid && !e.retro) for (const r in e.paid) S.stock[r] += e.paid[r]; delete S.queues[key]; } }
  const b = S.buildings.get(p); b.stage = 0; b.born = S.t;
  S.selPart = null; S.selBuilding = -1;
  territory = null; cacheDirty = true; provKey = ''; cmdKey = ''; rosterKey = ''; barKey = '';
  clampStock(); computeIncome(); sfx('bld_work', { prov: p });
  toast(`The fort at ${provName(p)} is dismantled: it is an outpost again${lost ? `, and its ${lost} building${lost === 1 ? ' is' : 's are'} gone` : ''}.`);
}
{
  const info0 = extraCmdInfo, use0 = extraCmdUse;
  extraCmdInfo = id => id !== 'dismantle' ? info0(id) : { name: 'Dismantle fort', desc: 'Turn this fort back into an outpost. Every building in the province is destroyed, with no refund, and the fort no longer counts toward your fort limit (or allows more provinces). Click twice (or press Delete twice) to confirm.', cost: null, why: S.selProv >= 0 ? dismantleWhy(S.selProv) : 'Nothing selected', icon: xIcon('destroy') };
  extraCmdUse = id => { if (id !== 'dismantle') return use0(id); if (S.selProv >= 0) dismantleFort(S.selProv); return true; };
}

// ---------- notification flags (same banner shape as the others) ----------
function bannerSVG(cloth, dark, art) {
  return 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80" width="64" height="80"><g stroke-linejoin="round" stroke-linecap="round">
<path d="M10 11 H54 V70 L32 60 L10 70 Z" transform="translate(0 3)" fill="#1d1a22"/><path d="M10 11 H54 V70 L32 60 L10 70 Z" fill="${cloth}" stroke="#1d1a22" stroke-width="3"/>
<path d="M11.5 12.5 H52.5 V17 H11.5 Z" fill="${dark}"/><path d="M14.5 17 H49.5 V63.5 L32 55.5 L14.5 63.5 Z" fill="none" stroke="#faf1dc" stroke-width="1.8" stroke-opacity="0.55" stroke-dasharray="3 2.4"/>
<rect x="5" y="6" width="54" height="6" rx="3" fill="#ffc93c" stroke="#1d1a22" stroke-width="2.5"/><circle cx="5" cy="9" r="4" fill="#ffc93c" stroke="#1d1a22" stroke-width="2.5"/><circle cx="59" cy="9" r="4" fill="#ffc93c" stroke="#1d1a22" stroke-width="2.5"/>
<g stroke="#1d1a22" stroke-width="2">${art}</g></g></svg>`);
}
// a white flag of peace on a green banner; an hourglass on gray; crossed swords on brown (bandits); a broken chain on purple (ally fort)
FLAG_IMG.peace = bannerSVG('#3f9b4b', '#2c6e36', '<path d="M24 52 L24 22" fill="none" stroke-width="3"/><path d="M24 23 C30 19 34 27 42 23 L42 37 C34 41 30 33 24 37 Z" fill="#ffffff"/><text x="32" y="50" font-size="10" font-family="sans-serif" font-weight="bold" fill="#ffffff" stroke="none" text-anchor="start">100</text>');
FLAG_IMG.wptimer = bannerSVG('#8a8f99', '#5f636b', '<path d="M22 22 H42 L34 36 L42 50 H22 L30 36 Z" fill="#faf1dc"/><path d="M25 48 H39 L32 41 Z" fill="#e8b84a" stroke="none"/><path d="M20 21 H44 M20 51 H44" stroke-width="3"/>');
FLAG_IMG.bandits = bannerSVG('#8b5a2b', '#6a4220', '<path d="M20 24 L44 48 M44 24 L20 48" stroke-width="5" stroke="#1d1a22"/><path d="M20 24 L44 48 M44 24 L20 48" stroke-width="2.6" stroke="#d8d2c4"/><path d="M16 44 L24 52 M48 44 L40 52" stroke-width="3.4" stroke="#8a6a3a"/>');
FLAG_IMG.allyfort = bannerSVG('#6b3fa0', '#4f2d78', '<path d="M18 46 V30 H24 V34 H30 V26 H36 V34 H42 V30 H46 V46 Z" fill="#cfc8ba"/><path d="M28 46 V40 H36 V46" fill="#6b4a2a"/><path d="M14 22 L50 54" stroke="#c7362b" stroke-width="3.4"/>');

// ---------- wars: no Total War; a flag at 100 warscore; a hidden 5-minute timer ends every war in white peace ----------
const WAR_TIMER = 300, WAR_TIMER_SHOW = 30;
const warTimeLeft = w => WAR_TIMER - (S.t - w.since);
function stepWarTimers() {
  for (const w of S.wars.slice()) {
    if (!S.wars.includes(w) || warTimeLeft(w) > 0) continue;
    const me = w.a === ME || w.b === ME;
    if (me) toast(`Five minutes of war with the ${PLAYERS[foeOf(w, ME)].name} have passed: the war ends in white peace.`);
    makePeace(w, w.a, { kind: 'white' });
  }
}

// ---------- alliances: a fort on the shared border ends the alliance after a minute ----------
const ALLY_FORT_GRACE = 60;
function stepAllyForts(t) {
  for (const A of S.allies.slice()) {
    const f = borderFort(A.a, A.b);
    if (f < 0) { if (A.fortAt !== undefined) { A.fortAt = undefined; flagKey = ''; } continue; }
    if (A.fortAt === undefined) {
      A.fortAt = t; A.fortProv = f; flagKey = '';
      if (A.a === ME || A.b === ME) { const o = A.a === ME ? A.b : A.a, mine = nationOf(f) === ME; toast(mine ? `Your fort at ${provName(f)} sits on the border with your ally, the ${PLAYERS[o].name}. Dismantle it within ${ALLY_FORT_GRACE} seconds or the alliance ends.` : `The ${PLAYERS[o].name} built a fort at ${provName(f)} on your shared border: the alliance ends in ${ALLY_FORT_GRACE} seconds unless it is dismantled.`, true); sfx('ui_error'); }
    } else if (t - A.fortAt >= ALLY_FORT_GRACE) endAlliance(A, `a fort was built on the shared border (${provName(A.fortProv)})`);
  }
}
{
  const _fl = flagList;
  flagList = function () {
    const out = _fl();
    const extra = [];
    for (const w of warsOf(ME)) {
      const o = foeOf(w, ME), s = warscore(w, ME), left = warTimeLeft(w);
      if (Math.abs(s) >= WAR.total) extra.push({ id: 'peace100:' + w.id, img: 'peace', tip: s > 0 ? `Warscore +100 against the ${PLAYERS[o].name}: call for peace and take what you want. Left-click to open Diplomacy` : `Warscore −100 against the ${PLAYERS[o].name}: call for peace (surrender) before they take more. Left-click to open Diplomacy`, label: 'Call for peace' });
      if (left <= WAR_TIMER_SHOW && left > 0 && !w.parent) extra.push({ id: 'wpt:' + w.id, img: 'wptimer', warn: true, cd: left, tip: `The war with the ${PLAYERS[o].name} ends in white peace in ${Math.ceil(left)} s unless a peace deal is made. Left-click to open Diplomacy`, label: 'White peace' });
    }
    for (const A of S.allies) if (A.fortAt !== undefined && (A.a === ME || A.b === ME)) { const o = A.a === ME ? A.b : A.a; extra.push({ id: 'allyfort:' + o, img: 'allyfort', warn: true, cd: ALLY_FORT_GRACE - (S.t - A.fortAt), tip: `A fort at ${provName(A.fortProv)} sits on your border with the ${PLAYERS[o].name}: the alliance ends when the timer runs out. Left-click to look at it`, label: 'Ally border' }); }
    if (S.banditWave && S.t - S.banditWave.t < 60) extra.push({ id: 'bandits:' + S.banditWave.n, img: 'bandits', warn: true, tip: `Bandits (power ${fmtPow(S.banditWave.power)}) have appeared at ${provName(S.banditWave.prov)}. Left-click to look`, label: 'Bandits' });
    return out.concat(extra.filter(f => !flagDismissed.has(f.id)));
  };
  $q('#nflags').addEventListener('click', e => {
    const b = e.target.closest('[data-flag]'); if (!b) return;
    const id = b.dataset.flag;
    if (id.startsWith('peace100:') || id.startsWith('wpt:')) { const w = S.wars.find(x => x.id === +id.split(':')[1]); if (w) openDip(foeOf(w, ME)); }
    else if (id.startsWith('allyfort:')) { const A = S.allies.find(x => x.fortAt !== undefined && (x.a === ME || x.b === ME)); if (A) { lookAtProv(A.fortProv); if (nationOf(A.fortProv) === ME) { S.selected = []; S.selProv = A.fortProv; S.selPart = 'settlement'; cmdKey = ''; } } }
    else if (id.startsWith('bandits:') && S.banditWave) lookAtProv(S.banditWave.prov);
  });
}

// ---------- army power: 2000 and up shows as 2k, 2.5k, 50k ----------
function fmtPow(n) { n = Math.round(n || 0); if (n < 2000) return String(n); const k = n / 1000; return (k < 10 ? +k.toFixed(1) : Math.round(k)) + 'k'; }

// ---------- outliner: every section heading can fold its list away (− / +) ----------
const RO_COL = (() => { try { return new Set(JSON.parse(localStorage.getItem('realm-rocol') || '[]')); } catch (e) { return new Set(); } })();
function roHidden(k) { return RO_COL.has(k); }
function roHead(k, title, count, tip) {
  const hid = RO_COL.has(k);
  return `<div class="ro-sec ro-fold"${tip ? ` title="${tip}"` : ''}><button type="button" class="ro-col" data-rocol="${k}" aria-expanded="${!hid}" title="${hid ? 'Show' : 'Hide'} ${title.toLowerCase()}">${hid ? '+' : '−'}</button>${title} ${count}</div>`;
}
function roToggle(k) { if (RO_COL.has(k)) RO_COL.delete(k); else RO_COL.add(k); try { localStorage.setItem('realm-rocol', JSON.stringify([...RO_COL])); } catch (e) {} rosterKey = ''; sfx('ui_click'); }

// ---------- resource bar: forts X/Y and provinces X/Y ----------
const FORT_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V9h3v2h3V6h6v5h3V9h3v12z" fill="#cfc8ba" stroke="#1d1a22" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 21v-5h4v5" fill="#6b4a2a" stroke="#1d1a22" stroke-width="1.5"/><path d="M12 6V2.5l4 1.5-4 1.5" fill="#c7362b" stroke="#1d1a22" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const PROV_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5 L16.5 2.8 L21.3 10.2 L18.2 19.4 L8.8 21.2 L2.8 13.6 Z" fill="#9bd95f" stroke="#1d1a22" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
let v96BarKey = '';
{
  const _sb = setupBar;
  setupBar = function () {
    _sb();
    const tick = $q('#res .tick');
    tick.insertAdjacentHTML('beforebegin', `<span class="r v96c" id="r-forts" title="Forts you hold (and are building) out of your fort limit">${FORT_SVG}<b></b></span><span class="r v96c" id="r-provs" title="Provinces you hold out of the provinces your forts allow (each fort and the capital allow itself plus ${OUTPOSTS_PER_FORT} outposts; Efficient and Expand Administration add more)">${PROV_SVG}<b></b></span>`);
  };
  const _ub = updateBar;
  updateBar = function (t) {
    _ub(t);
    if (!S.started) return;
    const fc = fortCount(), fl = fortLimit(), pc = myProvs().length, pl = provLimit(ME), k = [fc, fl, pc, pl].join('|');
    if (k === v96BarKey) return; v96BarKey = k;
    const f = $q('#r-forts b'), p = $q('#r-provs b'); if (!f || !p) return;
    f.textContent = `${fc}/${fl}`; f.classList.toggle('full', fc >= fl);
    p.textContent = `${pc}/${pl}`; p.classList.toggle('full', pc >= pl);
    $q('#r-provs').title = `Provinces you hold (${pc}) out of the ${pl} your forts allow: each fort (and the capital) allows itself plus ${perFort(ME)} outposts.`;
  };
}

// ---------- minimap: your provinces under siege pulse red ----------
function siegedProvs() {
  const out = new Set();
  for (const [p, pr] of S.occProg) if (nationOf(p) === ME && pr.by !== ME) out.add(p);
  for (const [p, o] of S.occ) if (nationOf(p) === ME && o !== ME) out.add(p);
  for (const u of S.units) if (u.sieging !== null && u.sieging !== undefined && u.owner !== ME) { const e = world.edges[u.sieging]; if (e) for (const p of [e.a, e.b]) if (nationOf(p) === ME) out.add(p); }
  return out;
}
{
  const _dm = drawMini;
  drawMini = function () {
    _dm();
    if (!miniT || !S.started) return;
    const list = siegedProvs(); if (!list.size) return;
    const g = mctx, { k, ox, oy } = miniT, a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(performance.now() / 1000 * 5));
    g.save(); g.setTransform(k, 0, 0, k, ox, oy);
    for (const p of list) { const P = G.provs[p]; g.beginPath(); P.pts.forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillStyle = `rgba(230,40,40,${a})`; g.fill(); g.lineWidth = 3 / k; g.strokeStyle = `rgba(255,90,90,${Math.min(1, a + 0.3)})`; g.stroke(); }
    g.restore();
  };
}

// ---------- province hotkeys: F2 / F3 / F4 jump to a saved province (the capital at first); Shift+F2/F3/F4 saves one ----------
// (the old F2-F4 zoom presets are removed for now)
S.provKeys = { f2: -1, f3: -1, f4: -1 };
function hotProvince() {
  const u = primary(); if (u) return u.prov;
  if (S.selProv >= 0) return S.selProv;
  if (S.selBuilding >= 0) return S.selBuilding;
  return provAt(cam.x, cam.y);
}
function centerOn(x, y) { flyTo({ x, y, z: cam.z }); }
window.addEventListener('keydown', e => {
  if (!S.started || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
  const k = e.key.toLowerCase();
  if (k !== 'f2' && k !== 'f3' && k !== 'f4') return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.shiftKey) {
    const p = hotProvince(); if (p < 0) return toast('Select a unit or province (or center the view on one) first.', true);
    S.provKeys[k] = p; sfx('ui_click'); toast(`${k.toUpperCase()} now jumps to ${provName(p)}.`);
    return;
  }
  const p = S.provKeys[k] >= 0 ? S.provKeys[k] : S.capital; if (p < 0 || !G.provs[p]) return;
  const P = G.provs[p]; centerOn(P.ic[0], P.ic[1]);
}, true);

// ---------- control groups: Ctrl (or Alt) + 0-9 saves the selected units; 0-9 selects them, twice centers the view ----------
S.ctrlGroups = {};
let grpLast = { k: '', t: 0 };
window.addEventListener('keydown', e => {
  if (!S.started || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
  if (!/^Digit[0-9]$/.test(e.code)) return;
  if (!$q('#settings').hidden) return;
  const k = e.code.slice(5);
  if (e.ctrlKey || e.metaKey || e.altKey) {
    e.preventDefault(); e.stopImmediatePropagation();
    const us = S.selected.filter(u => u.owner === ME && (u.kind === 'army' || u.kind === WAYFINDER || u.kind === MASON || u.kind === MAGE));
    if (!us.length) { delete S.ctrlGroups[k]; return toast(`Group ${k} cleared.`); }
    S.ctrlGroups[k] = us.map(u => u.id); sfx('ui_click');
    toast(`Group ${k}: ${us.length === 1 ? us[0].name : us.length + ' units'}. Press ${k} to select, twice to look.`);
    return;
  }
  if (e.shiftKey) return;
  const ids = S.ctrlGroups[k]; if (!ids) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const us = ids.map(id => S.units.find(v => v.id === id)).filter(u => u && u.owner === ME && !u.exiting && !u.fleeing && !u.retreatHome);
  S.ctrlGroups[k] = us.map(u => u.id);
  if (!us.length) return;
  const now = performance.now() / 1000, twice = grpLast.k === k && now - grpLast.t < 0.45;
  grpLast = { k, t: now };
  S.selected = us; S.selBuilding = -1; S.selProv = -1; S.selPart = null; hoverPath = undefined; cmdKey = ''; rosterKey = '';
  if (twice) { const x = us.reduce((n, u) => n + u.x, 0) / us.length, y = us.reduce((n, u) => n + u.y, 0) / us.length; centerOn(x, y); }
}, true);

// ---------- rally points: Q on a training building's card; new units walk there ----------
S.rally = {};
let rallyAim = null, lastClickW = null;
const rallyOf = key => S.rally[key] || null;
function rallyGo(u, rp) {
  if (!rp || !G.provs[rp.prov]) return;
  if (u.kind === 'army') u.rallyTo = rp.prov;
  if (u.prov === rp.prov && Math.hypot(u.x - rp.x, u.y - rp.y) < 40) return;
  order(u, rp.prov, true, [rp.x, rp.y]);
}
{
  const _ca = clickAt;
  clickAt = function (sx, sy, right, shift, ctrl) {
    const [wx, wy] = toWorld(sx, sy); lastClickW = [wx, wy];
    if (!rallyAim) return _ca(sx, sy, right, shift, ctrl);
    const key = rallyAim; rallyAim = null; cv.style.cursor = ''; cmdKey = '';
    if (right) { toast('Rally point unchanged.'); return; }
    const p = provAt(wx, wy);
    if (p < 0 || !S.explored.has(p)) return toast('Pick a province you have explored.', true);
    const sp = srcSpot(key); sfx('ui_click');
    if (sp && sp.prov === p && Math.hypot(sp.x - wx, sp.y - wy) < 70) { delete S.rally[key]; return toast('Rally point cleared: new units wait beside the building.'); }
    S.rally[key] = { prov: p, x: wx, y: wy };
    toast(`Rally point set in ${provName(p)}: new units from here walk there.`);
  };
  window.addEventListener('keydown', e => { if (rallyAim && e.key === 'Escape') { rallyAim = null; cv.style.cursor = ''; cmdKey = ''; e.stopImmediatePropagation(); toast('Rally point unchanged.'); } }, true);
  const info0 = extraCmdInfo, use0 = extraCmdUse;
  extraCmdInfo = id => {
    if (id === 'rally') { const rp = S.selBuilding >= 0 ? rallyOf(srcKey()) : null; return { name: rallyAim ? 'Pick the rally point…' : 'Set rally point', desc: `Click this, then click anywhere on the map: soldiers and units trained here walk there when they are ready. ${rp ? `Now: ${provName(rp.prov)}. Set it on the building itself to clear it.` : 'Not set: new units wait beside the building.'}`, cost: null, why: null, ok: 'Click, then pick a spot', icon: rallyIcon(), glow: !!rp }; }
    return info0(id);
  };
  extraCmdUse = id => {
    if (id !== 'rally') return use0(id);
    if (S.selBuilding < 0) return true;
    rallyAim = srcKey(); cv.style.cursor = 'crosshair'; cmdKey = '';
    toast('Click where new units should gather (click the building’s own province to clear it). Right-click or Esc cancels.');
    return true;
  };
}
let rallyIco = null;
function rallyIcon() {
  if (rallyIco) return rallyIco;
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.ellipse(36, 74, 18, 6, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
  g.beginPath(); g.moveTo(30, 76); g.lineTo(30, 14); g.lineWidth = 8; g.strokeStyle = OL; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#c99a2c'; g.stroke();
  g.beginPath(); g.moveTo(32, 16); g.quadraticCurveTo(46, 10, 56, 18); g.quadraticCurveTo(66, 26, 76, 20); g.lineTo(76, 46); g.quadraticCurveTo(66, 52, 56, 44); g.quadraticCurveTo(46, 36, 32, 42); g.closePath();
  g.fillStyle = PLAYERS[ME] ? PLAYERS[ME].color : '#2f6fe0'; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.arc(30, 12, 5, 0, 7); g.fillStyle = '#f4c44f'; g.fill(); g.lineWidth = 3; g.stroke();
  return rallyIco = c.toDataURL();
}
// the selected building's rally point: a waving flag in your colors, like the armies carry
function drawRally(g, t) {
  if (S.selBuilding < 0 || S.selected.length) return;
  const key = srcKey(), rp = rallyOf(key); if (!rp) return;
  const K = (typeof UKK === 'number' ? UKK : 1.5) * 1.3, sp = srcSpot(key);
  g.save(); g.setLineDash([10, 10]); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(sp.x, sp.y); g.lineTo(rp.x, rp.y); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.ellipse(rp.x, rp.y, 12 * K, 5 * K, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
  g.restore();
  drawArmyFlag(g, { owner: ME }, rp.x, rp.y, rp.y - 26 * K, t, K);
}
{
  const _dg = drawGame;
  drawGame = function (g, t) { _dg(g, t); try { drawRally(g, t); } catch (e) { reportError(e, 'rally'); } };
}
// the training card's Q cell is the rally point; the units it trains move one cell along
{
  const _rtc = renderTrainCard;
  renderTrainCard = function () {
    const before = cmdKey; _rtc();
    if (cmdKey === before && $q('#cmdGrid [data-cmd="rally"]')) return;
    const grid = $q('#cmdGrid'), kids = [...grid.children]; if (kids.length !== 16) return;
    const info = cmdInfo('rally');
    const rally = `<button type="button" class="cmd-btn${info.glow ? ' glow' : ''}" data-cmd="rally" aria-label="${info.name}"><img alt="" src="${info.icon}"></button>`;
    // shift the training buttons (cells 0..11) one to the right; the queue (12..15) and the cell-3 extras stay
    const train = kids.slice(0, 12).filter(k => k.dataset && k.dataset.cmd && k.dataset.cmd.startsWith('train:')), keep = kids.slice(0, 12).filter(k => k.dataset && k.dataset.cmd && !k.dataset.cmd.startsWith('train:'));
    const cells = new Array(12).fill(null); cells[0] = rally;
    for (const k of keep) { const i = kids.indexOf(k); cells[i] = k.outerHTML; }
    let at = 1; for (const k of train) { while (at < 12 && cells[at]) at++; if (at < 12) cells[at++] = k.outerHTML; }
    grid.innerHTML = cells.map(c => c || '<div class="cmd-cell"></div>').join('') + kids.slice(12).map(k => k.outerHTML).join('');
  };
}
// units finishing at a building with a rally point: soldiers form their own army and march there (and join any army
// already standing at the rally point); Wayfinders, Masons and Mages walk there
function rallyArrivals() {
  for (const a of S.units) {
    if (a.kind !== 'army' || a.rallyTo === undefined || a.owner !== ME) continue;
    if (a.moving || a.battle) continue;
    if (a.prov !== a.rallyTo) { a.rallyTo = undefined; continue; }
    a.rallyTo = undefined;
    const host = S.units.find(v => v !== a && v.kind === 'army' && v.owner === ME && v.prov === a.prov && !v.moving && !v.battle && !v.exiting && !v.retro && !v.retroWant);
    if (!host) continue;
    for (const k in a.troops) host.troops[k] = (host.troops[k] || 0) + a.troops[k];
    host.grew = S.t; S.units = S.units.filter(v => v !== a); S.selected = S.selected.filter(v => v !== a);
    computeIncome(); rosterKey = '';
  }
}

// ---------- Master Builders (Tier III+ Government): a Mason set to one building builds it wherever there is room ----------
// The automation button (cell 14 when he is free, or while automation is on) opens a pick of buildings; picking one turns
// it on. He then builds that building in every province of yours that allows it, as long as you can pay, and waits when
// nothing is left to build. Click the button again to turn it off.
let autoPickFor = null;   // the Mason whose building pick is open on the command card
const autoTypes = () => BUILD_ORDER.filter(t => BUILD_DEFS[t]);
{
  let base = CMD[MASON];
  Object.defineProperty(CMD, MASON, {
    configurable: true,
    set(v) { base = v; },
    get() {
      const m = S.selected.find(v => v.kind === MASON && v.owner === ME);
      if (!m || !hasTech('autobuild')) return base;
      if (autoPickFor === m.id) return autoTypes().map((type, i) => ({ id: 'autopick:' + type, cell: i, key: '' })).concat([{ id: 'autopick:cancel', cell: 15, key: '' }]);
      if (m.auto || !(m.build || m.pending)) return base.filter(c => c.cell !== 14).concat([{ id: 'autobuild', cell: 14, key: '' }]);
      return base;
    }
  });
  const info0 = extraCmdInfo, use0 = extraCmdUse;
  extraCmdInfo = id => {
    if (id === 'autobuild') {
      const m = S.selected.find(v => v.kind === MASON && v.owner === ME), on = m && m.auto;
      return { name: on ? `Automated: ${BUILD_DEFS[m.auto].name}` : 'Automate', desc: on ? `${m.name} builds a ${BUILD_DEFS[m.auto].name} in every province of yours with room for one, whenever you can pay. Click to turn automation off.` : `Pick a building: this ${UNIT_DEFS[MASON].name} then builds it in every province of yours with room for one, whenever you can afford it, and waits when nothing is left to build.`, cost: null, why: m ? null : 'No Mason selected', ok: on ? 'Click to turn off' : 'Click, then pick a building', icon: autoBldIcon(on ? m.auto : null), glow: !!on };
    }
    if (id.startsWith('autopick:')) {
      const type = id.slice(9);
      if (type === 'cancel') return { name: 'Back', desc: 'Close the pick without automating.', cost: null, why: null, icon: xIcon('dismiss') };
      const d = BUILD_DEFS[type], why = d.tech && !hasTech(d.tech) ? 'Research ' + TECH_BY_ID[d.tech].name.replace('Building: ', '') + ' first' : null;
      return { name: `Automate: ${d.name}`, desc: `Build a ${d.name} in every province of yours that allows one, whenever you can pay (${costText(d.cost)} each).`, cost: d.cost, why, ok: 'Click to automate', icon: buildThumb(type) };
    }
    return info0(id);
  };
  extraCmdUse = id => {
    if (id === 'autobuild') {
      const m = S.selected.find(v => v.kind === MASON && v.owner === ME); if (!m) return true;
      if (m.auto) { m.auto = null; autoPickFor = null; toast(`${m.name} no longer builds on his own.`); }
      else autoPickFor = m.id;
      cmdKey = ''; return true;
    }
    if (id.startsWith('autopick:')) {
      const type = id.slice(9), m = S.selected.find(v => v.kind === MASON && v.owner === ME); autoPickFor = null; cmdKey = '';
      if (!m || type === 'cancel') return true;
      m.auto = type; m.autoAt = 0; rosterKey = '';
      toast(`${m.name} will build a ${BUILD_DEFS[type].name} wherever there is room and you can pay.`);
      stepAutoBuild(true); return true;
    }
    return use0(id);
  };
}
function autoBldIcon(type) {
  const k = 'auto:' + (type || '');
  if (XICON[k]) return XICON[k];
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(14, 74); g.lineTo(14, 44); g.lineTo(40, 24); g.lineTo(66, 44); g.lineTo(66, 74); g.closePath(); g.fillStyle = '#d9a46b'; g.fill(); g.lineWidth = 5; g.strokeStyle = OL; g.stroke();
  g.beginPath(); g.rect(32, 52, 16, 22); g.fillStyle = '#7b5029'; g.fill(); g.lineWidth = 3.5; g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(64 + Math.cos(a) * 10, 22 + Math.sin(a) * 10); g.lineTo(64 + Math.cos(a) * 17, 22 + Math.sin(a) * 17); g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#9aa7c0'; g.stroke(); }
  g.beginPath(); g.arc(64, 22, 12, 0, 7); g.fillStyle = '#9aa7c0'; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.arc(64, 22, 4, 0, 7); g.fillStyle = OL; g.fill();
  return XICON[k] = c.toDataURL();
}
// once a second: every free automated Mason heads for the nearest province where his building can go up now
let autoT = -9;
function stepAutoBuild(now) {
  if (!now && S.t - autoT < 1) return; autoT = S.t;
  for (const u of S.units) {
    if (u.kind !== MASON || u.owner !== ME || !u.auto) continue;
    if (!hasTech('autobuild')) { u.auto = null; continue; }
    if (u.moving || u.build || u.pending || u.exiting || u.fleeing || u.survey || exploring(u)) continue;
    const type = u.auto, mine = myProvList().filter(p => !S.occ.has(p) && !buildCheck(p, type));
    if (!mine.length) { u.autoIdle = true; continue; }
    u.autoIdle = false;
    const d = hopsFrom(u.prov), p = mine.sort((a, b) => (d[a] ?? 99) - (d[b] ?? 99) || a - b)[0];
    if (u.prov === p) beginExtra(u, type);
    else if (order(u, p, true)) u.pending = { prov: p, type, slot: undefined };
    else u.autoIdle = true;
  }
}

// ---------- bandit waves: from 30 minutes on, a bigger gang turns up in an unclaimed province every 3 minutes ----------
const BANDIT_WAVE = { start: 1800, every: 180, power: 1000, grow: 300 };
const WAVE_NAMES = ['Marauders', 'Brigands', 'Reavers', 'Cutthroats', 'Outlaws', 'Raiders', 'Freebooters', 'Highwaymen'];
const footmanPower = () => { const k = 'd-sword'; return Math.max(1, Math.round(rawStrength([{ owner: RAIDERS, troops: { [k]: 1 }, kind: 'army' }]) * 10)); };
function stepBanditWaves(t) {
  if (world.mode === 'practice') return;
  if (S.banditNext === undefined) S.banditNext = BANDIT_WAVE.start;
  if (t < S.banditNext) return;
  const n = S.banditWaves || 0; S.banditWaves = n + 1; S.banditNext += BANDIT_WAVE.every;
  const skip = typeof uqSkip === 'function' ? uqSkip() : new Set();
  const free = world.provinces.map((P, i) => i).filter(i => !S.buildings.has(i) && !skip.has(i) && !S.units.some(u => u.prov === i && u.kind === 'army') && G.provs[i].inner && G.provs[i].inner.length);
  if (!free.length) return;
  const p = free[Math.floor(Math.random() * free.length)], power = BANDIT_WAVE.power + BANDIT_WAVE.grow * n;
  const a = spawnBandit(p);
  a.name = 'The ' + WAVE_NAMES[n % WAVE_NAMES.length] + (n >= WAVE_NAMES.length ? ' ' + ROMAN_N(Math.floor(n / WAVE_NAMES.length) + 1) : '');
  a.troops = { 'd-sword': Math.max(2, Math.ceil(power / footmanPower())) };
  a.wave = n + 1;
  S.banditWave = { n: n + 1, prov: p, power: powerOf(a), t };
  flagKey = ''; sfx('wn_enemy');
  toast(`${a.name}, a bandit gang of power ${fmtPow(powerOf(a))}, has appeared in ${S.explored.has(p) ? provName(p) : 'the wilds'}! Every 3 minutes a stronger one turns up.`, true);
}
const ROMAN_N = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);

// ---------- Diplomacy chip: a dove at peace, crossed swords at war, instead of the text ----------
const DOVE_SVG = `<svg class="dp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13c2-3 5-3.6 7-2.4L15 7l-.6 3.4L17 11l-3 2c-1.4 3-5 4-8 2.6L2.6 17 4 14z" fill="#fff" stroke="#1d1a22" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 11.5C9.6 7.6 12.6 5 15.4 4c-1.4 3.6-3 6-5 8z" fill="#f1ede4" stroke="#1d1a22" stroke-width="1.4" stroke-linejoin="round"/><path d="M17 11l3-.4" stroke="#e8a817" stroke-width="1.8" stroke-linecap="round"/><path d="M19.6 10.4c1.2-1 2.2-.4 1.6.8M19.6 10.6c.6 1.6-.6 2-1.2 1.4" fill="none" stroke="#3f9b4b" stroke-width="1.3"/></svg>`;
const SWORDS_SVG = `<svg class="dp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l11 11M19 3L8 14" stroke="#1d1a22" stroke-width="4" stroke-linecap="round"/><path d="M5 3l11 11M19 3L8 14" stroke="#d8d2c4" stroke-width="2" stroke-linecap="round"/><path d="M14 16l4 4M10 16l-4 4" stroke="#1d1a22" stroke-width="3.4" stroke-linecap="round"/><path d="M14 16l4 4M10 16l-4 4" stroke="#8a6a3a" stroke-width="1.8" stroke-linecap="round"/><path d="M13 12.5l3.5 3.5M11 12.5L7.5 16" stroke="#1d1a22" stroke-width="2.6" stroke-linecap="round"/></svg>`;
function dipChipIcon() {
  const chip = $q('#dip'); if (!chip || chip.hidden) return;
  const war = warsOf(ME).length > 0, l = chip.querySelector('.dp-l');
  if (!l || l.dataset.v96 === String(war)) return;
  l.dataset.v96 = String(war); l.innerHTML = war ? SWORDS_SVG : DOVE_SVG;
  chip.title = 'Diplomacy'; l.title = war ? 'At war · Diplomacy' : (alliesOf(ME).length ? 'At peace · allied with ' + alliesOf(ME).map(x => 'the ' + PLAYERS[x].name).join(' and ') : 'At peace');
}

// ---------- Settings: Calm map (hide villagers, still trees) ----------
function calmTrees() { return !!(typeof VIEW !== 'undefined' && VIEW.calm); }
{
  const b = $q('#calmBtn');
  const sync = () => { b.setAttribute('aria-pressed', calmTrees() ? 'true' : 'false'); b.querySelector('span').textContent = calmTrees() ? 'On' : 'Off'; };
  b.addEventListener('click', e => { e.stopPropagation(); VIEW.calm = !calmTrees(); viewSave(); sync(); cacheDirty = true; });
  sync();
}

// ---------- the province menu goes back above the minimap (above its toggles) ----------
{ const pm = $q('#prov'); if (pm) document.body.appendChild(pm); document.body.classList.add('v96-prov'); }

// ---------- styles for the v96 additions ----------
{
  const st = document.createElement('style');
  st.textContent = `
.tp-th { display: flex; align-items: center; gap: 6px; }
.tp-auto { margin-left: auto; font: 800 11px var(--font-ui); padding: 1px 7px; border: 1px solid var(--ink); background: var(--chip-hi); color: var(--chip-text); cursor: pointer; opacity: 0.8; }
.tp-auto.on { background: #3f9b4b; color: #fff; opacity: 1; box-shadow: 0 0 0 2px rgba(63,155,75,0.35); }
.tp-auto::before { content: '⟳ '; }
.res .r.v96c svg { width: 22px; height: 22px; display: block; }
.res .r.v96c b.full { color: #b3261e; }
.ro-fold { display: flex; align-items: center; gap: 5px; }
.ro-col { width: 16px; height: 16px; padding: 0; display: inline-grid; place-items: center; font: 800 13px/1 var(--font-ui); border: 1px solid var(--ink); background: var(--chip-hi); color: var(--chip-text); cursor: pointer; flex: none; }
.dp-pick-h { display: flex; align-items: center; gap: 6px; }
.dp-pick-h > span { margin-left: auto; }
.dp-pk { font: 700 11px var(--font-ui); padding: 0 6px; border: 1px solid var(--ink); background: var(--chip-hi); cursor: pointer; }
.lc-ico { width: 34px; height: 34px; display: block; margin: 0 auto; }
#armBtn { display: flex; align-items: center; justify-content: center; padding: 4px 0; }
.dip .dp-btn { display: none !important; }
#dip { cursor: pointer; }
#dip .dp-l { justify-content: center; }
.dip .dp-l .dp-ico { width: 34px; height: 34px; display: block; }
.dip .dp-l { justify-content: center; }
body.v96-prov .prov { position: fixed; left: max(16px, env(safe-area-inset-left, 0px)); bottom: calc(env(safe-area-inset-bottom, 0px) + 230px); width: 232px; max-height: calc(100vh - 520px); min-height: 0; overflow-y: auto; z-index: 5; }
body.in-menu .prov { display: none !important; }
body.v96-prov .prov { zoom: var(--ui, 1); }
`;
  document.head.appendChild(st);
}

// ---------- per game ----------
function setupV96(loaded) {
  if (!loaded) {
    S.autoTech = { gov: false, mil: false, mag: false };
    S.wallCrack = {}; S.warEver = new Set(); S.rally = {}; S.ctrlGroups = {};
    S.provKeys = { f2: S.capital, f3: S.capital, f4: S.capital };
    S.banditNext = BANDIT_WAVE.start; S.banditWaves = 0; S.banditWave = null;
  } else {
    S.autoTech = S.autoTech || { gov: false, mil: false, mag: false };
    S.wallCrack = S.wallCrack || {}; S.warEver = S.warEver || new Set(); S.rally = S.rally || {}; S.ctrlGroups = S.ctrlGroups || {};
    for (const w of S.wars) S.warEver.add(pairKey(w.a, w.b));
    S.provKeys = S.provKeys || { f2: S.capital, f3: S.capital, f4: S.capital };
    if (S.banditNext === undefined) S.banditNext = Math.max(BANDIT_WAVE.start, S.t + 60);
  }
  autoPickFor = null; rallyAim = null; rallyIco = null; v96BarKey = '';
  druidStaves();
}
let v96Sec = -1;
// countdown badges on the white-peace and ally-border flags are updated in place (rebuilding the flags every second
// would swallow clicks)
function flagCountdowns() {
  for (const b of document.querySelectorAll('#nflags [data-flag^="wpt:"], #nflags [data-flag^="allyfort:"]')) {
    const id = b.dataset.flag; let left = 0;
    if (id.startsWith('wpt:')) { const w = S.wars.find(x => x.id === +id.slice(4)); left = w ? warTimeLeft(w) : 0; }
    else { const A = S.allies.find(x => x.fortAt !== undefined && (x.a === ME || x.b === ME)); left = A ? ALLY_FORT_GRACE - (S.t - A.fortAt) : 0; }
    let el = b.querySelector('b.v96n'); if (!el) { el = document.createElement('b'); el.className = 'v96n'; b.appendChild(el); }
    const txt = String(Math.max(0, Math.ceil(left))); if (el.textContent !== txt) el.textContent = txt;
  }
}
function stepV96(t, dt) {
  if (!S.started) return;
  dipChipIcon(); flagCountdowns();
  if (S.paused) return;
  stepWarTimers();
  stepBanditWaves(t);
  stepAutoBuild(false);
  rallyArrivals();
  if (Math.floor(t) !== v96Sec) { v96Sec = Math.floor(t); stepAllyForts(t); autoResearch(); }
  if (autoPickFor !== null && !S.selected.some(v => v.id === autoPickFor)) { autoPickFor = null; cmdKey = ''; }
  { const m = S.selected.find(v => v.kind === MASON && v.owner === ME), k = m ? m.id + ':' + !!m.pending + ':' + (m.auto || '') : ''; if (k !== stepV96.mk) { stepV96.mk = k; cmdKey = ''; } }
}
window.__v96 = { rowsOn: a => rowsOn(a), rowBack: (a, k) => rowBack(a, k), rowFront: a => rowFront(a), rowDeal: (a, k) => rowDeal(a, k), setBack: (a, k, n) => setBack(a, k, n), openRowsMenu: a => openRowsMenu(a), fmtPow, spellHitWall, dismantleFort, autoResearch, stepWarTimers, stepBanditWaves, stepAllyForts, allyWhy: (a, b) => allyWhy(a, b), borderFort: (a, b) => borderFort(a, b), demandMax: (s, o) => demandMax(s, o), perFort: o => perFort(o), provLimit: o => provLimit(o), rallyOf, stepAutoBuild, siegedProvs, setupV96, spellTime: (k, o) => spellTime(k, o) };

// ---------- Front Row and Back Row (armies of 6 or more) ----------
// a.back: kind -> how many of that kind stand in the back row. Mages (Druids, Warlocks) stand in the back on their own
// unless a.magesFront is set. Back-row soldiers deal half damage (Mages deal full damage from the back) and take half
// damage, and only once the front row has fallen. An army of 5 or fewer fights as one line.
const ROW_MIN = 6, BACK_DEAL = 0.5, BACK_TAKE = 0.5;
function rowsOn(a) { return !!a && a.kind === 'army' && troopCount(a) >= ROW_MIN; }
function rowBack(a, k) {
  if (!rowsOn(a) || !(a.troops[k] > 0)) return 0;
  if (k === MAGE && !a.magesFront) return a.troops[k];
  return Math.min(a.troops[k], (a.back && a.back[k]) || 0);
}
// the row a kind is set to, whatever the army's size (rowBack only counts it while rows are in effect)
function rowBackSet(a, k) { const n = a.troops[k] || 0; return k === MAGE && !a.magesFront ? n : Math.min(n, (a.back && a.back[k]) || 0); }
function rowBackCount(a) { let n = 0; for (const k in a.troops) n += rowBack(a, k); return n; }
function rowFront(a) { return troopCount(a) - rowBackCount(a); }
// how many blows a kind lands this round: back-row soldiers count half, Mages always count in full
function rowDeal(a, k) { const n = a.troops[k] || 0; if (k === MAGE) return n; return n - rowBack(a, k) * (1 - BACK_DEAL); }
function setBack(a, k, n) {
  if (k === MAGE) { a.magesFront = n < (a.troops[MAGE] || 0); a.back = a.back || {}; a.back[MAGE] = Math.max(0, Math.min(a.troops[MAGE] || 0, n)); return; }
  a.back = a.back || {}; a.back[k] = Math.max(0, Math.min(a.troops[k] || 0, n)); if (!a.back[k]) delete a.back[k];
}
const rowText = a => rowsOn(a) ? `Front ${rowFront(a)} · Back ${rowBackCount(a)}` : `One line (rows from ${ROW_MIN} soldiers)`;
// combining armies keeps everyone's row
{
  const _ca = combineArmies;
  combineArmies = function (list) {
    const backs = list.map(a => Object.keys(a.troops).map(k => [k, rowsOn(a) && !(k === MAGE && !a.magesFront) ? rowBack(a, k) : 0]));
    _ca(list);
    const main = list[0]; if (!main || !S.units.includes(main)) return;
    main.back = {}; for (const bl of backs) for (const [k, n] of bl) if (n && k !== MAGE) main.back[k] = (main.back[k] || 0) + n;
  };
}
// the Rows button: the first free cell among 2, 9, 7, 6, 5, 4 on the army card
{
  const armyGet = Object.getOwnPropertyDescriptor(CMD, 'army').get;
  Object.defineProperty(CMD, 'army', { configurable: true, get() {
    const list = armyGet.call(CMD), a = S.selected.find(v => v.kind === 'army' && v.owner === ME); if (!a) return list;
    const used = new Set(list.map(c => c.cell)), cell = [2, 9, 7, 6, 5, 4].find(c => !used.has(c));
    return cell === undefined ? list : list.concat([{ id: 'rows', cell, key: '' }]);
  } });
  const info0 = extraCmdInfo, use0 = extraCmdUse;
  extraCmdInfo = id => {
    if (id !== 'rows') return info0(id);
    const a = S.selected.find(v => v.kind === 'army' && v.owner === ME);
    return { name: 'Front and back rows', desc: `Armies of ${ROW_MIN} or more fight in two rows. The front row takes the blows first; the back row only takes damage once the front row has fallen, and then only half of it, but back-row soldiers also deal half damage. ${UNIT_DEFS[MAGE].name}s stand in the back on their own and deal full damage from there.${a ? ' Now: ' + rowText(a) + '.' : ''}`, cost: null, why: !a ? 'No army selected' : a.battle ? 'Not during battle' : null, ok: 'Click to arrange the rows', icon: rowsIcon() };
  };
  extraCmdUse = id => { if (id !== 'rows') return use0(id); const a = S.selected.find(v => v.kind === 'army' && v.owner === ME); if (a) openRowsMenu(a); return true; };
}
let rowsIco = null;
function rowsIcon() {
  if (rowsIco) return rowsIco;
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  const man = (x, y, col, s) => { g.beginPath(); g.arc(x, y - 14 * s, 6 * s, 0, 7); g.fillStyle = '#f1d3b0'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.moveTo(x - 8 * s, y + 8 * s); g.lineTo(x - 7 * s, y - 6 * s); g.lineTo(x + 7 * s, y - 6 * s); g.lineTo(x + 8 * s, y + 8 * s); g.closePath(); g.fillStyle = col; g.fill(); g.stroke(); };
  for (const x of [26, 44, 62]) man(x, 36, '#9aa7c0', 0.85);   // back row
  for (const x of [18, 36, 54, 72]) man(x, 64, '#c7362b', 1.05);   // front row
  g.beginPath(); g.moveTo(10, 50); g.lineTo(78, 50); g.setLineDash([5, 5]); g.lineWidth = 2.5; g.strokeStyle = OL; g.stroke(); g.setLineDash([]);
  return rowsIco = c.toDataURL();
}
function openRowsMenu(a) {
  if (a.battle) return toast('Rows can’t be changed during a battle.', true);
  const ks = Object.keys(a.troops).filter(k => a.troops[k] > 0), nm = k => k === MAGE ? UNIT_DEFS[MAGE].name : designById(k) ? designById(k).name : UNIT_DEFS[k] ? UNIT_DEFS[k].name : k;
  const on = rowsOn(a), b = btn => `<button type="button" class="bm-item" data-rows="${btn.k}:${btn.how}" data-army="${a.id}"${btn.off ? ' aria-disabled="true"' : ''}><img alt="" src="${btn.img}"><span class="bm-name">${btn.t}<small>${btn.s}</small></span></button>`;
  let html = `<div class="bm-head"><b>Rows of ${escHTML(a.name)}</b><span>${rowText(a)}</span></div>`;
  if (!on) html += `<div class="bm-sec">An army of ${ROW_MIN} or more fights in two rows; this one is one line for now. You can still set the rows: they apply once it is big enough.</div>`;
  html += b({ k: 'all', how: 'front', img: rowsIcon(), t: 'Everyone to the front', s: `${UNIT_DEFS[MAGE].name}s stay in the back` });
  for (const k of ks) {
    const n = a.troops[k], back = rowBackSet(a, k), front = n - back, hf = Math.floor(front / 2), hb = Math.floor(back / 2);
    html += `<div class="bm-sec">${nm(k)} ×${n}: front ${front}, back ${back}</div>`;
    if (front) html += b({ k, how: 'back', img: portrait(k), t: `All ${front} to the back`, s: k === MAGE ? 'Full damage from the back' : 'Half the damage taken, half the damage dealt' });
    if (hf >= 1 && hf < front) html += b({ k, how: 'halfback', img: portrait(k), t: `${hf} to the back`, s: 'Half of those in front' });
    if (back) html += b({ k, how: 'front', img: portrait(k), t: `All ${back} to the front`, s: 'They take the blows first' });
    if (hb >= 1 && hb < back) html += b({ k, how: 'halffront', img: portrait(k), t: `${hb} to the front`, s: 'Half of those in back' });
  }
  popNearCard(html);
}
menuEl.addEventListener('click', e => {
  const t = e.target.closest('[data-rows]'); if (!t) return; e.stopImmediatePropagation();
  const a = S.units.find(v => v.id === +t.dataset.army);
  if (!a || a.battle) { closeBuildMenu(); return toast('Rows can’t be changed during a battle.', true); }
  const [k, how] = t.dataset.rows.split(':');
  if (k === 'all') { a.back = {}; a.magesFront = false; }
  else {
    const n = a.troops[k] || 0, back = rowBackSet(a, k), front = n - back;
    if (how === 'back') setBack(a, k, n);
    else if (how === 'halfback') setBack(a, k, back + Math.floor(front / 2));
    else if (how === 'front') setBack(a, k, 0);
    else if (how === 'halffront') setBack(a, k, back - Math.floor(back / 2));
  }
  sfx('ui_click'); cmdKey = ''; rosterKey = '';
  openRowsMenu(a);   // stay open to keep arranging
}, true);

// ---------- Armory: Weapons / Armor / Horses (or Ogres) as tabs instead of one long page ----------
let armTab = 'Weapons';
const ARM_TAB_NAME = { Weapon: 'Weapons', Armor: 'Armor', Horse: 'Horses', Ogre: 'Ogres' };
function armTabs() {
  const ed = $q('#armory .ar-edit'); if (!ed || ed.dataset.tabbed) return;
  ed.dataset.tabbed = '1';
  const secs = [...ed.children].filter(e => e.classList.contains('ar-sec'));
  if (secs.length < 2) return;
  const names = [];
  for (const sec of secs) {
    const name = ARM_TAB_NAME[sec.textContent.trim()] || sec.textContent.trim(), pane = document.createElement('div');
    pane.className = 'ar-pane'; pane.dataset.pane = name; names.push(name);
    let n = sec.nextElementSibling; while (n && !n.classList.contains('ar-sec')) { const nx = n.nextElementSibling; pane.appendChild(n); n = nx; }
    sec.replaceWith(pane);
  }
  if (!names.includes(armTab)) armTab = names[0];
  const bar = document.createElement('div'); bar.className = 'ar-tabs';
  bar.innerHTML = names.map(n => `<button type="button" class="ar-tab" data-artab="${n}" aria-selected="${n === armTab}">${n}</button>`).join('');
  ed.querySelector('.ar-pane').before(bar);
  armTabShow();
}
function armTabShow() {
  for (const p of document.querySelectorAll('#armory .ar-pane')) p.hidden = p.dataset.pane !== armTab;
  for (const b of document.querySelectorAll('#armory .ar-tab')) b.setAttribute('aria-selected', b.dataset.artab === armTab ? 'true' : 'false');
}
{
  const _ra = renderArmory;
  renderArmory = function () { _ra(); try { armTabs(); } catch (e) { reportError(e, 'armory tabs'); } };
  armEl.addEventListener('click', e => { const t = e.target.closest('[data-artab]'); if (!t) return; e.stopImmediatePropagation(); armTab = t.dataset.artab; armTabShow(); sfx('ui_click'); }, true);
  const st = document.createElement('style');
  st.textContent = `
.ar-tabs { display: flex; gap: 4px; margin-top: 8px; border-bottom: 2px solid #e3e7ee; }
.ar-tab { font: 800 11px var(--font-ui); letter-spacing: .06em; text-transform: uppercase; padding: 4px 12px; border: 1px solid var(--ink); border-bottom: none; background: #eef2f7; color: var(--muted); cursor: pointer; }
.ar-tab[aria-selected="true"] { background: var(--sun); color: var(--ink); }
.ar-pane { padding-top: 4px; }
#armBtn, #dip { width: 50% !important; align-self: flex-start; box-sizing: border-box; }`;
  document.head.appendChild(st);
}

// ---------- warscore bars: their own panels under the Diplomacy button, only while at war ----------
let dipWarsKey = null;
function renderDipWars() {
  let box = $q('#dipWars');
  if (!box) { box = document.createElement('div'); box.id = 'dipWars'; box.className = 'dip-wars'; const chip = $q('#dip'); if (!chip) return; chip.after(box); box.addEventListener('pointerdown', e => e.stopPropagation()); box.addEventListener('click', e => { const r = e.target.closest('[data-war-foe]'); if (r) openDip(+r.dataset.warFoe); }); }
  const wars = S.started && !S.fallen ? warsOf(ME) : [];
  const key = wars.map(w => w.id + ':' + warscore(w, ME)).join(',');
  if (key === dipWarsKey) return; dipWarsKey = key;
  box.hidden = !wars.length;
  box.innerHTML = wars.map(w => { const o = foeOf(w, ME), s = warscore(w, ME); return `<button type="button" class="dip-war chip" data-war-foe="${o}" title="War with the ${PLAYERS[o].name}: click for Diplomacy"><span class="dp-wn">${dot(o)}${PLAYERS[o].name.split(' of ').pop()}<b class="dp-s ${s > 0 ? 'up' : s < 0 ? 'down' : ''}">${sgn(s)}</b></span>${wsBar(s)}</button>`; }).join('');
}
{
  const _sv = stepV96;
  stepV96 = function (t, dt) { _sv(t, dt); if (S.started) renderDipWars(); };
  const st = document.createElement('style');
  st.textContent = `
#dip .dp-w { display: none !important; }
.dip-wars { display: flex; flex-direction: column; gap: 6px; pointer-events: auto; }
.dip-wars[hidden] { display: none; }
.dip-war { display: flex; flex-direction: column; gap: 4px; padding: 5px 8px; cursor: pointer; text-align: left; font: 700 12px var(--font-ui); color: var(--chip-text); }
.dip-war .dp-wn { display: flex; align-items: center; gap: 5px; }
.dip-war .dp-wn i { width: 11px; height: 11px; border-radius: 50%; border: 1px solid var(--ink); display: inline-block; flex: none; }
.dip-war .dp-s { margin-left: auto; }
.dip-war .ws { width: 100%; }
body.in-menu .dip-wars { display: none !important; }`;
  document.head.appendChild(st);
}

// ---------- Moderate and Difficult nations pick a random school of magic open to their race ----------
{
  const _spawn = spawnAINations;
  spawnAINations = function (slots, races) {
    _spawn(slots, races);
    for (const N of Object.values(NATIONS)) {
      if (N.diff !== 'moderate' && N.diff !== 'difficult') continue;
      const ok = Object.keys(SCHOOLS).filter(k => schoolOk(k, N.race || raceOf(N.id)));
      if (ok.length) N.wantSchool = ok[Math.floor(Math.random() * ok.length)];
    }
  };
}
