
// ================= features: names, dismiss/destroy, roads from the card, inspect, retrofit, paths, nation =================

// ---------- cute one-syllable names for Wayfinders and Masons ----------
const CUTE_NAMES = ['Pip', 'Bo', 'Tib', 'Moss', 'Fen', 'Kit', 'Dot', 'Bram', 'Wren', 'Jot', 'Nib', 'Tuck', 'Bun', 'Pim', 'Fig', 'Lark', 'Mott', 'Rue', 'Sprig', 'Hob', 'Dab', 'Cob', 'Nell', 'Puck', 'Tam', 'Zed', 'Quill', 'Bix', 'Mags', 'Plum', 'Tot', 'Fitz', 'Gus', 'Ned', 'Wick', 'Pog'];
const usedNames = new Set();
function cuteName() {
  const free = CUTE_NAMES.filter(n => !usedNames.has(n) && !S.units.some(u => u.name === n));
  const n = free.length ? free[Math.floor(Math.random() * free.length)] : CUTE_NAMES[Math.floor(Math.random() * CUTE_NAMES.length)] + ' ' + (usedNames.size + 1);
  usedNames.add(n); return n;
}

// ---------- click twice to confirm ----------
const armed = {};
function confirmTwice(key, msg) {
  if (armed[key] && performance.now() - armed[key] < 6000) { delete armed[key]; return true; }
  armed[key] = performance.now(); toast(msg, true); return false;
}
// ---------- small icons for the new buttons ----------
const XICON = {};
function xIcon(kind) {
  if (XICON[kind]) return XICON[kind];
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  const stroke = (w, col) => { g.lineWidth = w + 5; g.strokeStyle = OL; g.stroke(); g.lineWidth = w; g.strokeStyle = col; g.stroke(); };
  if (kind === 'dismiss') { g.beginPath(); g.arc(44, 46, 26, 0, 7); g.fillStyle = '#f4d6cf'; g.fill(); g.lineWidth = 5; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.moveTo(32, 34); g.lineTo(56, 58); g.moveTo(56, 34); g.lineTo(32, 58); stroke(6, '#c7362b'); }
  else if (kind === 'destroy') {
    for (const [x, y] of [[26, 52], [46, 52], [36, 38], [56, 38], [66, 52]]) { g.beginPath(); g.rect(x - 9, y - 7, 18, 13); g.fillStyle = '#d9a46b'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = OL; g.stroke(); }
    g.beginPath(); g.moveTo(22, 22); g.lineTo(66, 66); g.moveTo(66, 22); g.lineTo(22, 66); stroke(6, '#c7362b');
  }
  else if (kind === 'road') { g.beginPath(); g.moveTo(24, 76); g.quadraticCurveTo(40, 44, 34, 14); g.moveTo(64, 76); g.quadraticCurveTo(56, 44, 54, 14); stroke(5, '#b9a27c'); g.setLineDash([6, 8]); g.beginPath(); g.moveTo(44, 74); g.quadraticCurveTo(48, 44, 44, 16); g.lineWidth = 4; g.strokeStyle = '#fff3c9'; g.stroke(); g.setLineDash([]); }
  else if (kind === 'inspect') { g.beginPath(); g.arc(38, 38, 18, 0, 7); g.fillStyle = '#cfe8fb'; g.fill(); g.lineWidth = 6; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.moveTo(52, 52); g.lineTo(70, 70); stroke(7, '#9a6b3c'); }
  else if (kind === 'retrofit') { g.beginPath(); g.moveTo(22, 64); g.lineTo(58, 28); stroke(6, '#c9ced8'); g.beginPath(); g.moveTo(52, 22); g.lineTo(66, 36); stroke(6, '#8a6a3a'); g.beginPath(); g.arc(60, 62, 14, 3.6, 1.2); stroke(4, '#3f9b4b'); g.beginPath(); g.moveTo(66, 72); g.lineTo(73, 64); g.lineTo(62, 62); g.closePath(); g.fillStyle = '#3f9b4b'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); }
  else if (kind === 'rest') { g.beginPath(); g.moveTo(18, 70); g.lineTo(18, 40); g.lineTo(44, 20); g.lineTo(70, 40); g.lineTo(70, 70); g.closePath(); g.fillStyle = '#d9a46b'; g.fill(); g.lineWidth = 5; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.rect(36, 42, 16, 16); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.stroke(); g.beginPath(); g.moveTo(44, 45); g.lineTo(44, 55); g.moveTo(39, 50); g.lineTo(49, 50); g.lineWidth = 4; g.strokeStyle = '#c7362b'; g.stroke(); }
  else if (kind === 'rewall') { for (const [x, y] of [[22, 58], [44, 58], [66, 58], [33, 42], [55, 42], [44, 26]]) { g.beginPath(); g.rect(x - 10, y - 7, 20, 14); g.fillStyle = '#cfc8ba'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = OL; g.stroke(); } g.beginPath(); g.moveTo(62, 14); g.lineTo(76, 28); stroke(5, '#8a6a3a'); }
  else if (kind === 'quake') { g.beginPath(); g.moveTo(10, 60); g.lineTo(78, 60); g.lineWidth = 7; g.strokeStyle = OL; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#8a6a3a'; g.stroke(); g.beginPath(); g.moveTo(44, 60); g.lineTo(38, 48); g.lineTo(48, 40); g.lineTo(40, 26); stroke(4, '#1d1a22'); for (const [x, h] of [[20, 22], [32, 28], [56, 28], [68, 22]]) { g.beginPath(); g.rect(x - 5, 60 - h, 10, h); g.fillStyle = '#cfc8ba'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); } }
  else if (kind === 'shock') { for (const [x, y] of [[30, 60], [52, 60], [41, 46], [30, 32], [52, 32]]) { g.beginPath(); g.rect(x - 10, y - 6, 20, 12); g.fillStyle = '#cfc8ba'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); } g.beginPath(); g.moveTo(44, 22); g.lineTo(38, 40); g.lineTo(46, 46); g.lineTo(38, 70); stroke(4, '#3b2a1a'); for (const r of [14, 24]) { g.beginPath(); g.arc(14, 46, r, -0.9, 0.9); stroke(4, '#6f8fc9'); } }
  else if (kind === 'path') { for (const [x, s] of [[26, 1], [62, 1]]) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 50); stroke(4, '#8a6a3a'); g.beginPath(); g.arc(x, 40, 13 * s, 0, 7); g.fillStyle = '#4ba557'; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); } g.beginPath(); g.moveTo(44, 76); g.lineTo(44, 26); stroke(5, '#ffc93c'); g.beginPath(); g.moveTo(34, 36); g.lineTo(44, 24); g.lineTo(54, 36); stroke(5, '#ffc93c'); }
  return XICON[kind] = c.toDataURL();
}

// ---------- command card entries ----------
CMD[WAYFINDER].push({ id: 'dismiss', cell: 15, key: '' });
CMD[MASON].push({ id: 'road', cell: 13, key: '' }, { id: 'cancelbuild', cell: 14, key: '' }, { id: 'dismiss', cell: 15, key: '' });
CMD_ARMY.push({ id: 'rest', cell: 8, key: '' }, { id: 'inspect', cell: 12, key: '' }, { id: 'retrofit', cell: 13, key: '' }, { id: 'xpath', cell: 14, key: '' }, { id: 'dismiss', cell: 15, key: '' });
{
  const mageGet = Object.getOwnPropertyDescriptor(CMD, MAGE).get;
  Object.defineProperty(CMD, MAGE, { configurable: true, get() { return mageGet().concat([{ id: 'xpath', cell: 13, key: '' }, { id: 'dismiss', cell: 15, key: '' }]); } });
}
// the open border nearest a Mason, if he stands close enough to it to work on it
const ROAD_REACH = 170;
function masonBorder(m) {
  let best = null, bd = ROAD_REACH;
  for (const n of openNbr[m.prov] || []) { const d = Math.hypot(n.m[0] - m.x, n.m[1] - m.y); if (d < bd) { bd = d; best = n.q; } }
  return best;
}
const pathLvls = () => [lvl('forest'), lvl('tunnel')];
function extraCmdInfo(id) {
  const [what] = id.split(':');
  if (what === 'dismiss') {
    const us = S.selected.filter(v => v.owner === ME && v.kind === cmdTab);
    const n = us.reduce((s, u) => s + (u.kind === 'army' ? troopCount(u) : 1), 0);
    return { name: 'Dismiss', desc: `Send ${us.length > 1 ? 'these units' : us[0] ? us[0].name : 'the unit'} home for good${n > 1 ? ` (${n} ${us[0] && us[0].kind === 'army' ? 'soldiers' : 'units'})` : ''}. No refund; their upkeep stops. Click twice (or press Delete twice) to confirm.`, cost: null, why: !us.length ? 'Nothing to dismiss' : us.some(u => u.battle) ? 'Not during battle' : null, icon: xIcon('dismiss') };
  }
  if (what === 'destroy') {
    const p = S.selProv, e = p >= 0 ? extraAt(p, S.selPart) : null;
    return { name: 'Destroy building', desc: e ? `Tear down this ${BUILD_DEFS[e.type].name} to free its plot. No refund; its upkeep stops. Click twice (or press Delete twice) to confirm.` : '', cost: null, why: !e ? 'No building selected' : !owned(p) ? 'Not yours' : null, icon: xIcon('destroy') };
  }
  if (what === 'road') {
    const m = S.selected.find(v => v.kind === MASON), q = m ? masonBorder(m) : null;
    const why = !m ? 'No Mason selected' : !hasTech('roads') ? 'Research Dirt Roads first' : q === null ? 'Walk the Mason up to an open border first' : linkWhy('road', m, q);
    return { name: q !== null ? `Build a road to ${provName(q)}` : 'Build a road', desc: `The Mason paves the open border he stands next to. ${ROAD_TIME} s. Units move faster along roads.`, cost: ROAD_COST, why, icon: xIcon('road') };
  }
  if (what === 'inspect') {
    const a = S.selected.find(v => v.kind === 'army');
    return { name: 'Inspect army', desc: 'See what this army is made of: each kind of soldier, their gear, strength and upkeep.', cost: null, why: a ? null : 'No army selected', icon: xIcon('inspect') };
  }
  if (what === 'retrofit') {
    const a = S.selected.find(v => v.kind === 'army' && v.owner === ME);
    const why = !a ? 'No army selected' : a.battle ? 'Not during battle' : a.retro ? `Retrofitting: ${Math.ceil(a.retro.dur - (S.t - a.retro.t0))} s left` : null;
    return { name: 'Retrofit', desc: `Re-equip this army’s soldiers with another Armory design of the same kind; you pay the difference in gear cost. It takes ${RETRO_TIME} s per soldier at one of your Barracks (cavalry need a Barracks with a Stable); the army marches to the nearest one by itself.`, cost: null, why, icon: xIcon('retrofit') };
  }
  if (what === 'rest') {
    const a = S.selected.find(v => v.kind === 'army' && v.owner === ME);
    const why = !a ? 'No army selected' : a.battle ? 'Not during battle' : !woundedUnits(a) ? 'The army isn’t hurt' : null;
    return { name: a && a.rest ? 'Resting…' : 'Rest at a Barracks', desc: `A wounded army gets its health back while it stands still at one of your Barracks: ${REST_TIME} s for every soldier in it${a ? ` (${REST_TIME * troopCount(a)} s for this one)` : ''}. Click to march to the nearest Barracks; an army that stops at one rests by itself.`, cost: null, why, icon: xIcon('rest') };
  }
  if (what === 'xpath') {
    const c = selCaster(), [f, t] = pathLvls();
    const why = !c ? 'No Mage selected' : !f && !t ? 'Research a forest path or tunnel spell first' : c.moving ? 'Stop moving first' : c.battle ? 'Not during battle' : null;
    return { name: pathAim ? 'Pick a province…' : 'Open a path', desc: `Click this, then click a neighboring province. If the border between is ${f && t ? 'trees or mountains' : f ? 'trees' : 'mountains'}, the Mage starts opening a ${f && t ? 'path or tunnel' : f ? 'forest path' : 'tunnel'}; otherwise the order is cancelled.`, cost: null, why, icon: xIcon('path') };
  }
  return null;
}
function extraCmdUse(id) {
  const [what] = id.split(':');
  if (what === 'dismiss') {
    const us = S.selected.filter(v => v.owner === ME && v.kind === cmdTab && !v.battle); if (!us.length) return true;
    if (!confirmTwice('dismiss:' + us.map(u => u.id).join(','), `Dismiss ${us.length > 1 ? us.length + ' units' : us[0].name}? Click Dismiss (or press Delete) again to confirm.`)) return true;
    for (const u of us) { if (u.cast) cancelCast(u); if (u.build) cancelBuild(u); }
    S.units = S.units.filter(v => !us.includes(v)); S.selected = S.selected.filter(v => !us.includes(v));
    computeIncome(); rosterKey = ''; toast(`${us.length > 1 ? us.length + ' units' : us[0].name} dismissed.`);
    return true;
  }
  if (what === 'destroy') {
    const p = S.selProv, e = extraAt(p, S.selPart); if (!e) return true;
    if (!confirmTwice('destroy:' + p + '@' + e.slot, `Destroy the ${BUILD_DEFS[e.type].name}? Click Destroy (or press Delete) again to confirm.`)) return true;
    S.extras.set(p, extrasIn(p).filter(x => x !== e)); S.xup.delete(p + '@' + e.slot);
    S.selPart = null; S.selBuilding = -1; provKey = ''; cmdKey = ''; computeIncome();
    toast(`${BUILD_DEFS[e.type].name} torn down. Plot ${e.slot + 1} is free.`); sfx('bld_work', { prov: p });
    return true;
  }
  if (what === 'road') { const m = S.selected.find(v => v.kind === MASON), q = m && masonBorder(m); if (m && q !== null) startLink(m, q, 'road'); return true; }
  if (what === 'inspect') { const a = S.selected.find(v => v.kind === 'army'); if (a) openInspect(a); return true; }
  if (what === 'retrofit') { const a = S.selected.find(v => v.kind === 'army'); if (!a) return true; if (restSite(a) < 0) { sfx('ui_error'); toast('Retrofitting needs one of your Barracks, and none can be reached.', true); return true; } showRetrofit(a); return true; }
  if (what === 'rest') { const as = S.selected.filter(v => v.kind === 'army' && v.owner === ME && !v.battle); for (const a of as) sendToRest(a); return true; }
  if (what === 'xpath') { const c = selCaster(); if (!c) return true; pathAim = c; cv.style.cursor = 'crosshair'; toast('Click a neighboring province to open a path to it. Right-click or Esc cancels.'); return true; }
  return false;
}

// ---------- paths: aim, then click a neighbor ----------
let pathAim = null;
function pathAimClick(p, right) {
  const c = pathAim; pathAim = null; cv.style.cursor = ''; cmdKey = '';
  if (right || p < 0 || !c) { toast('Path cancelled.'); return; }
  const [f, t] = pathLvls();
  if (f && edgeBetween(c.prov, p, 'trees', false) >= 0) return startPath(c, p, 'forest', false);
  if (t && edgeBetween(c.prov, p, 'mountains', false) >= 0) return startPath(c, p, 'tunnel', false);
  toast(!allNbr[c.prov].includes(p) ? 'Path cancelled: the Mage must stand next to that province.' : `Path cancelled: the border with ${provName(p)} isn’t ${f && t ? 'trees or mountains' : f ? 'trees' : 'mountains'}.`, true);
}
window.addEventListener('keydown', e => { if (pathAim && e.key === 'Escape') { pathAim = null; cv.style.cursor = ''; cmdKey = ''; toast('Path cancelled.'); e.stopImmediatePropagation(); } }, true);

// ---------- a building's own card: Destroy ----------
let bcardKey = '';
function renderBuildingCard() {
  const key = 'b|' + S.selProv + '|' + S.selPart + '|' + (armed['destroy:' + S.selProv + '@' + (S.selPart || '').split('@')[1]] ? 1 : 0);
  if (key === cmdKey) return; cmdKey = key;
  const e = extraAt(S.selProv, S.selPart); if (!e) return;
  $q('#cmdTabs').innerHTML = `<span class="cmd-tab" aria-selected="true"><img alt="" src="${buildThumb(e.type, e.level || 1)}">${BUILD_DEFS[e.type].name}</span>`;
  const cells = new Array(16).fill('<div class="cmd-cell"></div>');
  cells[15] = `<button type="button" class="cmd-btn" data-cmd="destroy" aria-label="Destroy building"><img alt="" src="${xIcon('destroy')}"></button>`;
  $q('#cmdGrid').innerHTML = cells.join('');
}
function addDestroyCell() {
  const grid = $q('#cmdGrid'); if (grid.querySelector('[data-cmd="destroy"]')) return;
  const last = grid.children[15]; if (!last) return;
  const b = document.createElement('div'); b.innerHTML = `<button type="button" class="cmd-btn" data-cmd="destroy" aria-label="Destroy building"><img alt="" src="${xIcon('destroy')}"></button>`;
  last.replaceWith(b.firstChild);
}

// ---------- walls can be torn down from the Ctrl+right-click menu ----------
const _linkRows = linkRows;
linkRows = (m, q) => {
  let out = _linkRows(m, q);
  if (m && m.prov !== q && wallBetween(m.prov, q) && (owned(m.prov) || owned(q))) out += `<button type="button" class="bm-item" data-type="unwall"><span class="bm-ico">⛏</span><span class="bm-name">Tear down the wall with ${provName(q)}<small>Opens the border again · instant, no refund</small></span></button>`;
  return out;
};
function tearDownWall(p, q) {
  const i = [...S.walls].find(i => { const e = world.edges[i]; return (e.a === p && e.b === q) || (e.a === q && e.b === p); });
  if (i === undefined) return;
  const e = world.edges[i], V = world.vertices, a = V[e.v[0]], b = V[e.v[1]], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  e.open = true; e.style = 'open'; S.walls.delete(i); delete S.wallHp[i]; S.gateOwn.delete(linkKey(p, q)); wallsVer++;
  openNbr[e.a].push({ q: e.b, m: mid }); openNbr[e.b].push({ q: e.a, m: mid });
  G.crossings.push({ x: mid[0], y: mid[1], ang: Math.atan2(b[1] - a[1], b[0] - a[0]), len: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  cacheDirty = true; fogDirty = true; hoverPath = undefined; territory = null;
  toast(`The wall between ${provName(p)} and ${provName(q)} is torn down.`);
}
menuEl.addEventListener('click', e => {
  const b = e.target.closest('[data-type="unwall"]'); if (b) { e.stopImmediatePropagation(); const m = S.selected.find(v => v.kind === MASON), q = menuProv; closeBuildMenu(); if (m) tearDownWall(m.prov, q); return; }
  const r = e.target.closest('[data-retro]'); if (r) { e.stopImmediatePropagation(); if (r.getAttribute('aria-disabled') === 'true') return; const a = S.units.find(v => v.id === +r.dataset.army); closeBuildMenu(); if (a) retrofitArmies([a], r.dataset.retro); return; }
  if (e.target.closest('[data-insp-close]')) { e.stopImmediatePropagation(); closeBuildMenu(); return; }
  if (e.target.closest('.insp')) e.stopImmediatePropagation();
}, true);

// ---------- inspect and retrofit (shown in the pop-up menu beside the command card) ----------
function popNearCard(html) {
  menuEl.innerHTML = html; menuEl.hidden = false; menuSlot = -1; menuProv = -1;
  const r = menuEl.getBoundingClientRect(), c = $q('#cmd').getBoundingClientRect();
  menuEl.style.left = Math.max(8, c.left - r.width - 10) / uiZ() + 'px';
  menuEl.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, c.bottom - r.height)) / uiZ() + 'px';
}
function showInspect(a) {
  const rows = Object.entries(a.troops).filter(([, n]) => n).map(([k, n]) => {
    const d = UNIT_DEFS[k], s = k === MAGE ? null : statsOf(k, ME), ds = designById(k);
    const gear = ds ? [WEAPONS[ds.weapon].name, ds.shield && !WEAPONS[ds.weapon].twoH ? SHIELD_DEFS[ds.shield].name : null, ARMORS[ds.armor].name + ' armor', ds.horse ? HORSES[ds.horse].name : null].filter(Boolean).join(', ') : k === MAGE ? 'Casts your school’s spells' : '';
    return `<div class="bm-item insp"><img alt="" src="${portrait(k)}"><span class="bm-name">${n} × ${d ? d.name : k}<small>${gear}${s ? ` · Attack ${s.atk}, health ${s.hp}, armor ${Math.round(s.red * 100)}%, speed ${s.speed}` : ''} · upkeep ${Object.entries(d ? d.upkeep : {}).map(([r, v]) => v * n + ' ' + r).join(', ') || 'none'}</small></span></div>`;
  }).join('');
  const up = {}; for (const [k, n] of Object.entries(a.troops)) for (const [r, v] of Object.entries((UNIT_DEFS[k] || {}).upkeep || {})) up[r] = (up[r] || 0) + v * n;
  popNearCard(`<div class="bm-head"><b>${a.name}</b><span>${troopCount(a)} soldiers · power ${powerOf(a)} · ${a.battle ? 'in battle' : a.moving ? 'on the move' : 'standing'} in ${provName(a.prov)}${a.wounds ? ' · wounded' : ''}</span></div>${rows}<p class="bm-note">Total upkeep every 10 s: ${Object.entries(up).map(([r, v]) => v + ' ' + r).join(', ') || 'none'}.</p><button type="button" class="bm-item bm-move" data-insp-close="1"><span class="bm-name">Close</span></button>`);
}
const retroCost = (from, to) => { const a = UNIT_DEFS[from].cost || {}, b = UNIT_DEFS[to].cost || {}, c = {}; for (const r of RES) { const d = (b[r] || 0) - (a[r] || 0); if (d > 0) c[r] = d; } return c; };
function retroPlan(armies, to) {
  const cav = !!DSTATS[to].cav, total = {}; let n = 0;
  for (const a of armies) for (const [k, c] of Object.entries(a.troops)) { if (k === to || k === MAGE || !DSTATS[k] || !!DSTATS[k].cav !== cav || !c) continue; n += c; const rc = retroCost(k, to); for (const r in rc) total[r] = (total[r] || 0) + rc[r] * c; }
  return { n, cost: total };
}
// the swap itself, once the army has spent its time at the Barracks
function retrofitNow(a, to) {
  const cav = !!DSTATS[to].cav; let n = 0;
  for (const k of Object.keys(a.troops)) { if (k === to || k === MAGE || !DSTATS[k] || !!DSTATS[k].cav !== cav) continue; n += a.troops[k]; a.troops[to] = (a.troops[to] || 0) + a.troops[k]; delete a.troops[k]; }
  computeIncome(); cmdKey = ''; armKey = '';
  return n;
}
// GPC14: retrofitting takes 10 s per soldier at a Barracks (with a Stable for cavalry); the army walks to the nearest one first
function retrofitArmies(armies, to) {
  let none = 0, sent = 0, began = 0;
  for (const a of armies) {
    const plan = retroPlan([a], to); if (!plan.n) continue;
    const dest = retroSite(a, to);
    if (dest < 0) { none++; continue; }
    if (a.retro) cancelRetro(a, true);
    a.retroWant = { to, prov: dest };
    if (a.prov === dest && !a.moving) { if (beginRetro(a)) began++; }
    else if (order(a, dest, true)) { sent++; }
    else { a.retroWant = null; none++; }
  }
  if (none) { sfx('ui_error'); toast(`No Barracks${DSTATS[to].cav ? ' with a Stable' : ''} of yours can be reached to retrofit ${none > 1 ? none + ' armies' : 'that army'}.`, true); }
  if (sent) toast(`${sent > 1 ? sent + ' armies march' : 'The army marches'} to the nearest Barracks${DSTATS[to].cav ? ' with a Stable' : ''} to retrofit.`);
  cmdKey = '';
}
function showRetrofit(a) {
  const why = extraCmdInfo('retrofit').why; if (why) return toast('Retrofit: ' + why + '.', true);
  const rows = S.designs.map(d => {
    const plan = retroPlan([a], d.id); if (!plan.n) return '';
    const ok = canAfford(plan.cost);
    return `<button type="button" class="bm-item" data-retro="${d.id}" data-army="${a.id}" ${ok ? '' : 'aria-disabled="true"'}><img alt="" src="${portrait(d.id)}"><span class="bm-name">${d.name}<small>${plan.n} soldier${plan.n > 1 ? 's' : ''} re-equipped${ok ? '' : ' · not enough resources'}</small></span><span class="bm-cost">${Object.keys(plan.cost).length ? costHTML(plan.cost) : 'free'}</span></button>`;
  }).join('');
  popNearCard(`<div class="bm-head"><b>Retrofit ${a.name}</b><span>Pick a design of the same kind</span></div>${rows || '<p class="bm-note">No other designs of this kind. Make one in the Armory (G).</p>'}<button type="button" class="bm-item bm-move" data-insp-close="1"><span class="bm-name">Close</span></button>`);
}
// the Armory can retrofit every army standing in your own land to the design being edited
function armoryRetroArmies() { return S.units.filter(v => v.kind === 'army' && v.owner === ME && !v.battle && !v.exiting); }
$q('#armory').addEventListener('click', e => {
  const b = e.target.closest('[data-ar="retro"]'); if (!b) return; e.stopImmediatePropagation();
  if (draft && draft.id && designById(draft.id)) retrofitArmies(armoryRetroArmies(), draft.id);
}, true);

// ---------- nation: name, color and flag ----------
const NATION_COLORS = [['#2f6fe0', '#7fb0ff'], ['#d23b3b', '#ff9a9a'], ['#2f9e55', '#8fe0a6'], ['#8a4fd0', '#c9a6ff'], ['#e08a1e', '#ffc777'], ['#1f9fa5', '#86e3e6'], ['#c23f8f', '#f4a3d2'], ['#4b4f5c', '#a9afbf']];
const FLAG_EMBLEMS = ['dragon', 'eagle', 'lion', 'snake', 'crown', 'swords', 'shield', 'horse'];
const FLAG_NAMES = { dragon: 'Dragon', eagle: 'Eagle', lion: 'Lion', snake: 'Snake', crown: 'Crown', swords: 'Crossed swords', shield: 'Shield', horse: 'Rearing horse' };
const NATION = { name: 'My Realm', color: 0, emblem: 'crown' };
try { const v = JSON.parse(localStorage.getItem('realm-nation') || 'null'); if (v) Object.assign(NATION, v); } catch (e) {}
if (!FLAG_EMBLEMS.includes(NATION.emblem)) NATION.emblem = 'crown';
function flagSVG(color, emblem, w = 48, h = 34) {
  const em = {
dragon: `<g transform="translate(9.5 4.5) scale(0.29)" stroke-width="4"><path d="M46 40 50 10 56 22 62 4 66 22 76 6 76 26 88 16 82 36 66 42z"/><path d="M50 10L52 40M62 4L60 41M76 6L70 42M88 16L76 41" fill="none" stroke-width="1.6"/><path d="M14 30 18 24 16 16 22 22 24 18 27 24 32 26 38 32 44 38 54 42 64 44 72 48 78 56 86 58 92 52 90 44 96 48 98 40 100 52 94 62 84 66 74 62 68 60 68 70 72 78 78 80 76 84 64 84 62 72 56 64 46 64 42 74 46 80 44 84 32 84 34 78 36 66 34 56 28 46 24 40 18 38 12 40 8 38 12 34z"/><path d="M30 28l2-5 2 6M38 33l3-5 1 7M46 39l3-5 1 6M56 43l3-5 1 6M66 45l3-5 1 6" stroke-width="2.4"/><path d="M30 46c6 6 14 10 24 12M36 50l2 6M42 53l1 6M48 55l1 6M54 57l1 5M70 52c4 4 8 7 14 9M20 36l5 0" fill="none" stroke-width="1.6"/><path d="M8 38l-3 3 5 0" fill="#c7362b" stroke-width="1.4"/><circle cx="20" cy="27" r="1.8" fill="#1d1a22" stroke="none"/></g>`,
eagle: `<g transform="translate(9.5 3) scale(0.29)" stroke-width="4"><path d="M55 30 62 22 72 15 84 9 97 6 93 14 98 17 90 22 96 26 87 30 92 35 83 37 86 42 76 42 68 46 58 47z"/><path d="M45 30 38 22 28 15 16 9 3 6 7 14 2 17 10 22 4 26 13 30 8 35 17 37 14 42 24 42 32 46 42 47z"/><path d="M44 60 56 60 62 78 57 74 54 82 50 76 46 82 43 74 38 78z"/><path d="M44 58l-8 8-6-1 2 4 5-1-1 5 4-3 1-6 7-4zM56 58l8 8 6-1-2 4-5-1 1 5-4-3-1-6-7-4z"/><ellipse cx="50" cy="44" rx="10" ry="17"/><path d="M45 30c-1-6 1-11 5-13 5-2 9 1 9 6 0 3-2 5-4 7z"/><path d="M47 19l-9 1c-2 1-3 4-1 6l3-2 1 3 5-3z"/><path d="M62 30L93 14 M63 34L90 22 M63 38L87 30 M62 42L83 37 M60 45L76 42 M38 30L7 14 M37 34L10 22 M37 38L13 30 M38 42L17 37 M40 45L24 42" fill="none" stroke-width="1.6"/><path d="M45 38l5 4 5-4M44 45l6 4 6-4M45 52l5 4 5-4M50 62v12M46 64l-3 10M54 64l3 10" fill="none" stroke-width="1.6"/><circle cx="50" cy="22" r="1.8" fill="#1d1a22" stroke="none"/></g>`,
lion: `<g transform="translate(10.5 4) scale(0.27)" stroke-width="4"><path d="M30 6 36 3 40 7 46 5 48 11 54 11 53 17 59 20 55 25 60 30 55 34 59 40 54 42 60 50 66 60 70 66 74 64 78 54 77 44 80 34 84 28 82 22 88 18 92 24 88 26 92 30 86 32 84 36 81 46 82 56 78 68 74 74 72 82 68 88 72 92 74 97 60 97 62 90 62 80 58 74 50 78 42 84 36 88 32 84 36 80 44 74 48 66 46 58 40 50 34 50 24 52 17 54 14 50 18 46 28 44 34 42 32 36 24 34 16 34 12 30 16 26 24 28 30 28 24 29 21 26 19 22 21 17 26 13 29 9z"/><path d="M34 8c3 3 4 7 3 11M41 9c3 4 4 8 3 13M47 14c3 4 4 8 2 12M51 22c2 4 2 7 0 10M51 33c1 3 0 5-2 7M33 22c3 2 5 6 4 10" fill="none" stroke-width="1.6"/><path d="M42 54c5 3 9 8 11 13M60 62c-2 5-1 10 2 14M86 22c-1 3-1 6 1 9M16 30l4 0M14 33l4-1M15 48l4 0M16 52l4-1M34 85l3 2M38 87l2 3M62 95l1-3M67 95l1-3" fill="none" stroke-width="1.6"/><path d="M22 27l-3 2 4 1" fill="#c7362b" stroke-width="1.4"/><path d="M20 20l3 1" fill="none" stroke-width="1.6"/><circle cx="25.5" cy="17" r="1.7" fill="#1d1a22" stroke="none"/></g>`,
snake: `<g transform="translate(10 3.6) scale(0.28)" stroke-width="4"><path d="M22 86c-14 0-14-16 0-16h44c22 0 22-28 0-28H40c-22 0-22-30 0-30h22" fill="none" stroke="#1d1a22" stroke-width="20" stroke-linecap="round"/><path d="M22 86c-14 0-14-16 0-16h44c22 0 22-28 0-28H40c-22 0-22-30 0-30h22" fill="none" stroke="#faf1dc" stroke-width="13" stroke-linecap="round"/><path d="M22 86c-14 0-14-16 0-16h44c22 0 22-28 0-28H40c-22 0-22-30 0-30h22" fill="none" stroke="#1d1a22" stroke-width="13" stroke-dasharray="1.6 6.4" stroke-linecap="butt" opacity=".55"/><path d="M22 86c-14 0-14-16 0-16h44c22 0 22-28 0-28H40c-22 0-22-30 0-30h22" fill="none" stroke="#e8d7b0" stroke-width="4" stroke-linecap="round"/><path d="M58 4c8-2 18 1 24 6 2 2 2 5 0 7-6 5-16 8-24 6-4-1-6-5-6-9 0-5 2-9 6-10z"/><path d="M80 12l9-2M80 12l9 3" fill="none" stroke="#c7362b" stroke-width="2.2"/><path d="M66 6c3 3 3 9 0 12M74 13l3 6" fill="none" stroke-width="1.6"/><ellipse cx="70" cy="10" rx="2.2" ry="1.6" fill="#1d1a22" stroke="none"/></g>`,
crown: `<path d="M12 24h24l2-13-7 6-7-9-7 9-7-6z"/><rect x="12" y="24" width="24" height="4" rx="1"/>`,
swords: `<g transform="rotate(40 24 17)"><path d="M23 3h2l1 3v14h-4V6z"/><rect x="19" y="20" width="10" height="2.4" rx="1"/><rect x="23" y="22.4" width="2" height="5"/><circle cx="24" cy="28.6" r="1.6"/></g><g transform="rotate(-40 24 17)"><path d="M23 3h2l1 3v14h-4V6z"/><rect x="19" y="20" width="10" height="2.4" rx="1"/><rect x="23" y="22.4" width="2" height="5"/><circle cx="24" cy="28.6" r="1.6"/></g>`,
shield: `<path d="M15 6h18v9c0 7-4 11-9 14-5-3-9-7-9-14z"/><path d="M24 6v23M15 13h18" fill="none" stroke-width="1.6"/>`,
horse: `<g transform="translate(10 3.5) scale(0.28)" stroke-width="4"><path d="M31 1 34 8 40 12 46 18 52 24 56 30 62 40 68 50 74 56 78 60 84 60 90 66 94 76 90 80 86 74 84 82 80 74 78 66 78 74 74 82 76 90 80 94 80 97 68 97 69 92 66 84 66 76 62 76 60 84 60 92 62 97 51 97 53 92 54 80 50 70 44 64 38 62 32 66 28 72 23 72 24 68 28 62 32 56 30 52 22 50 18 56 13 55 15 50 20 44 32 42 34 36 30 30 24 30 16 31 12 28 13 24 20 14 26 6 28 4z"/><path d="M34 9c4 3 7 8 9 13M38 12c3 4 5 8 6 12M44 18c3 4 4 8 5 12M49 23c2 4 3 7 3 11" fill="none" stroke-width="1.6"/><path d="M36 42c4 3 7 7 8 12M48 40c5 6 8 12 8 19M62 56c3 4 4 8 4 12M71 70l-3 6M82 66c2 3 4 6 5 10M88 70c1 2 2 4 2 6M69 94h10M52 94h9M13 54l5 0M23 70l4-1M14 27l2 1M17 30l7-1" fill="none" stroke-width="1.6"/><circle cx="25" cy="14" r="1.8" fill="#1d1a22" stroke="none"/></g>`
  }[emblem] || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 34" width="${w}" height="${h}"><rect x="1.5" y="1.5" width="45" height="31" rx="3" fill="${color}" stroke="#1d1a22" stroke-width="3"/><rect x="4" y="4" width="40" height="3" fill="#000" opacity=".15"/><g fill="#faf1dc" stroke="#1d1a22" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${em}</g></svg>`;
}
const flagURL = (c, e) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(flagSVG(c, e));
function nationSave() { try { localStorage.setItem('realm-nation', JSON.stringify(NATION)); } catch (e) {} }
function renderNationPicker() {
  const col = NATION_COLORS[NATION.color][0];
  $q('#mColors').innerHTML = NATION_COLORS.map(([c], i) => `<button type="button" class="nat-col${i === NATION.color ? ' on' : ''}" data-col="${i}" style="background:${c}" aria-label="Color ${i + 1}" aria-pressed="${i === NATION.color}"></button>`).join('');
  $q('#mFlags').innerHTML = FLAG_EMBLEMS.map(em => `<button type="button" class="nat-flag${em === NATION.emblem ? ' on' : ''}" data-emb="${em}" aria-label="${FLAG_NAMES[em]} flag" title="${FLAG_NAMES[em]}" aria-pressed="${em === NATION.emblem}"><img alt="" src="${flagURL(col, em)}"></button>`).join('');
  if ($q('#mNation').value !== NATION.name && document.activeElement !== $q('#mNation')) $q('#mNation').value = NATION.name;
}
function applyNation() {
  const [c, l] = NATION_COLORS[NATION.color];
  PLAYERS[ME].name = NATION.name || 'My Realm'; PLAYERS[ME].color = c; PLAYERS[ME].light = l;
  $q('#nation').innerHTML = `<img alt="" src="${flagURL(c, NATION.emblem)}"><b>${(NATION.name || 'My Realm').replace(/</g, '&lt;')}</b>`;
  $q('#nation').title = `${NATION.name || 'My Realm'}: your nation`;
  territory = null; cacheDirty = true; fogDirty = true; miniDirty = true;
}
$q('#mNation').addEventListener('input', () => { NATION.name = $q('#mNation').value.trim().slice(0, 24); nationSave(); });
$q('#mColors').addEventListener('click', e => { const b = e.target.closest('[data-col]'); if (!b) return; NATION.color = +b.dataset.col; nationSave(); renderNationPicker(); });
$q('#mFlags').addEventListener('click', e => { const b = e.target.closest('[data-emb]'); if (!b) return; NATION.emblem = b.dataset.emb; nationSave(); renderNationPicker(); });
$q('#mStart').addEventListener('click', applyNation, true);
renderNationPicker(); applyNation();

// ---------- UI size (Settings) ----------
// scales every panel and button (CSS zoom); the map is left alone. Saved per browser.
const UI = { z: 1 };
try { const v = +localStorage.getItem('realm-ui'); if (v >= 0.7 && v <= 1.5) UI.z = v; } catch (e) {}
const uiZ = () => UI.z;
function setUISize(z, save = true) {
  UI.z = Math.max(0.7, Math.min(1.5, Math.round(z * 20) / 20));
  document.documentElement.style.setProperty('--ui', UI.z);
  const r = $q('#uiSize'); if (r && +r.value !== Math.round(UI.z * 100)) r.value = Math.round(UI.z * 100);
  const v = $q('#uiVal'); if (v) v.textContent = Math.round(UI.z * 100) + '%';
  if (save) try { localStorage.setItem('realm-ui', UI.z); } catch (e) {}
  if (typeof layoutRight === 'function') setTimeout(layoutRight, 0);
}
$q('#uiSize').addEventListener('input', e => setUISize(+e.target.value / 100));
$q('#uiSize').addEventListener('pointerdown', e => e.stopPropagation());
$q('#uiReset').addEventListener('click', () => setUISize(1));
setUISize(UI.z, false);

// ---------- Armies tab in the outliner ----------
function armyStatus(a) { return a.battle && !a.retreating ? 'in battle' : a.retreatHome ? 'retreating home' : a.retreating ? 'retreating' : a.exiting ? 'marching home' : a.sieging != null ? 'battering a wall' : a.retro ? 'retrofitting' : a.rest ? 'resting' : a.moving ? 'marching' : 'standing'; }
function armiesTabHTML() {
  const list = S.units.filter(v => v.kind === 'army' && v.owner === ME), mages = S.units.filter(v => v.kind === MAGE && v.owner === ME);
  const row = a => { const m = a.troops[MAGE] || 0, horde = hordeActive(a); return `<button type="button" class="ro-u${isSel(a) ? ' on' : ''}" data-uid="${a.id}" title="Click to select, Shift-click to add, double-click to go to"><img alt="" src="${portrait(Object.keys(a.troops).find(k => a.troops[k] && k !== MAGE) || (m ? MAGE : 'd-sword'))}"><span><b>${escHTML(a.name)}</b><small><i class="${a.battle ? 'idle' : 'busy'}" style="${a.battle ? 'background:#c7362b' : ''}"></i>${troopCount(a) - m}${m ? ` + ${m} Mage${m > 1 ? 's' : ''}` : ''}${horde ? ' · Horde' : ''} · ${armyStatus(a)} · ${S.explored.has(a.prov) ? provName(a.prov) : 'fog'}</small></span><em class="ro-pow" title="Army power">⚔ ${powerOf(a)}</em></button>`; };
  const mrow = u => `<button type="button" class="ro-u${isSel(u) ? ' on' : ''}" data-uid="${u.id}" title="Click to select, Shift-click to add, double-click to go to"><img alt="" src="${portrait(MAGE)}"><span><b>${u.name}</b><small><i class="${u.cast ? 'busy' : u.moving ? 'busy' : 'idle'}"></i>${u.cast ? 'casting' : u.moving ? 'walking' : 'idle'} · ${S.explored.has(u.prov) ? provName(u.prov) : 'fog'}</small></span></button>`;
  const total = unitTotal(MAGE), cap = mageCap(), inArmies = list.reduce((n, a) => n + (a.troops[MAGE] || 0), 0);
  const mageSec = `<div class="ro-sec" title="Mages you have, counting those in armies and in training, out of the Mage limit. Mage Academy raises the limit.">Mages <span class="${total >= cap ? 'full' : ''}">${total}/${cap}</span></div>` +
    (mages.length ? mages.map(mrow).join('') : '') + (inArmies ? `<div class="ro-none">${inArmies} in armies</div>` : '') + (!mages.length && !inArmies ? `<div class="ro-none">${total ? 'In training' : 'None yet'}</div>` : '');
  return `<div class="ro-sec">Armies <span>${list.length}</span></div>` + (list.length ? list.map(row).join('') : '<div class="ro-none">No armies yet</div>') + mageSec + barracksSec();
}
// your Barracks, so you can train more soldiers without hunting for them on the map
const myBarracks = () => { const out = []; for (const [p, l] of S.extras) if (owned(p)) for (const e of l) if (e.type === 'barracks') out.push({ p, slot: e.slot, stable: l.some(x => x.type === 'stable') }); return out; };
function barracksSec() {
  const list = myBarracks();
  const row = bk => { const Q = S.queues['barracks:' + bk.p] || [], on = S.selKind === 'barracks' && S.selBuilding === bk.p; return `<button type="button" class="ro-u${on ? ' on' : ''}" data-bk="${bk.p}@${bk.slot}" title="Click to select and train, double-click to go to"><img alt="" src="${buildThumb('barracks')}"><span><b>${provName(bk.p)}</b><small><i class="${Q.length ? 'busy' : 'idle'}"></i>${Q.length ? `training ${Q.length}` : 'idle'} · ${bk.stable ? 'infantry and cavalry' : 'infantry'}</small></span></button>`; };
  return `<div class="ro-sec">Barracks <span>${list.length}</span></div>` + (list.length ? list.map(row).join('') : '<div class="ro-none">None yet</div>');
}
const armiesKey = () => myBarracks().map(bk => bk.p + (bk.stable ? 's' : '') + ':' + (S.queues['barracks:' + bk.p] || []).length).join(',') + (S.selKind === 'barracks' ? '@' + S.selBuilding : '') + '#' + S.units.filter(v => (v.kind === 'army' || v.kind === MAGE) && v.owner === ME).map(a => a.id + a.name + ':' + (a.kind === 'army' ? troopCount(a) + ':' + (a.troops[MAGE] || 0) + armyStatus(a) + hordeActive(a) + powerOf(a) : (a.cast ? 'c' : '') + (a.moving ? 'm' : '')) + a.prov + (isSel(a) ? '*' : '')).join('|') + '#' + unitTotal(MAGE) + '/' + mageCap();

// ---------- grid hotkeys: each command-card cell has a key, laid out like the grid ----------
//   Q W E R
//   A S D F
//   Z X C V
//   U I O P
// A key only fires when its cell holds a button. The camera pans with the arrow keys or by touching a screen edge with the mouse.
const GRID_KEYS = ['q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'z', 'x', 'c', 'v', 'u', 'i', 'o', 'p'];
function gridLabels() {
  const kids = $q('#cmdGrid').children;
  for (let i = 0; i < kids.length && i < 16; i++) {
    const b = kids[i]; if (!b.matches('button.cmd-btn')) continue;
    const del = b.dataset.cmd === 'dismiss' || b.dataset.cmd === 'destroy';   // IC03: deleting a unit or building is on the Delete key
    const want = del ? 'Del' : GRID_KEYS[i].toUpperCase(); let k = b.querySelector('kbd');
    if (!k) { k = document.createElement('kbd'); b.appendChild(k); }
    if (k.textContent !== want) k.textContent = want;
  }
}
new MutationObserver(gridLabels).observe($q('#cmdGrid'), { childList: true, subtree: true });
window.addEventListener('keydown', e => {
  if (!S.started || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (!$q('#settings').hidden || armOpen) return;
  if (e.key === 'Delete') { const d = $q('#cmdGrid [data-cmd="dismiss"], #cmdGrid [data-cmd="destroy"]'); if (d) { e.preventDefault(); e.stopImmediatePropagation(); d.click(); } return; }
  const i = GRID_KEYS.indexOf(e.key.toLowerCase()); if (i < 0) return;
  const b = $q('#cmdGrid').children[i];
  if (!b || !b.matches('button.cmd-btn') || b.dataset.cmd === 'dismiss' || b.dataset.cmd === 'destroy') return;
  e.preventDefault(); e.stopImmediatePropagation();
  b.click();
}, true);
window.__realm3 = { dirtyMap: () => { territory = null; cacheDirty = true; fogDirty = true; miniDirty = true; computeFog(); } };
