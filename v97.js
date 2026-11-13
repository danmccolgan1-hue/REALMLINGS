
// ================= v97: Front and Back Rows, reworked; one Mage per army =================
// An army of 6 or more fights in two rows of equal size (the front gets the odd one). The Mage (Druid, Warlock) always
// stands in the back. The player may order the minority unit types to the front or to the back; everyone else fills the
// remaining places. In battle, blows land on the front row, and every front-row soldier who falls is replaced by a random
// back-row soldier (never the Mage), who then takes full damage. Back-row soldiers deal half damage (the Mage deals full
// damage); the back row only takes blows once nobody is left in front, and then only half.
const ROW_MIN = 6, BACK_DEAL = 0.5, BACK_TAKE = 0.5;
const rowSum = o => { let n = 0; for (const k in o) n += o[k]; return n; };
// unit types in the order they joined the army
function rowJoinSync(a) {
  const j = (a.rowJoin || []).filter(k => a.troops[k] > 0);
  for (const k of Object.keys(a.troops)) if (a.troops[k] > 0 && !j.includes(k)) j.push(k);
  a.rowJoin = j; return j;
}
// which unit types get To front / To back: never the Mage; not a type that is more than half of the soldiers; and with
// exactly two types of equal size, only the one that joined later (one order says it all)
function rowMovable(a) {
  const ks = rowJoinSync(a).filter(k => k !== MAGE);
  if (ks.length < 2) return [];
  const tot = ks.reduce((n, k) => n + a.troops[k], 0), maj = ks.find(k => a.troops[k] * 2 > tot);
  if (maj) return ks.filter(k => k !== maj);
  if (ks.length === 2) return [ks[1]];
  return ks;
}
// the layout by the orders: the front fills first with types ordered to the front (newest order first), then the types
// with no order (in the order they joined), then the types ordered to the back (oldest order first); the rest stand in back
function rowLayout(a) {
  const N = troopCount(a), F = Math.ceil(N / 2), f = {}, b = {};
  const ks = rowJoinSync(a).filter(k => k !== MAGE), can = new Set(rowMovable(a)), ord = k => can.has(k) && a.rowOrd ? a.rowOrd[k] : null;
  const fronts = ks.filter(k => ord(k) && ord(k).side === 'front').sort((x, y) => ord(y).t - ord(x).t);
  const none = ks.filter(k => !ord(k));
  const backs = ks.filter(k => ord(k) && ord(k).side === 'back').sort((x, y) => ord(x).t - ord(y).t);
  let room = F;
  for (const k of [...fronts, ...none, ...backs]) { const n = Math.min(room, a.troops[k]); if (n) f[k] = n; room -= n; if (a.troops[k] - n) b[k] = a.troops[k] - n; }
  if (a.troops[MAGE]) b[MAGE] = a.troops[MAGE];
  return { f, b };
}
// in battle the formation is kept: counts are only matched to the troops (newcomers fill the front up to half)
function rowReconcile(a, lay) {
  const N = troopCount(a), F = Math.ceil(N / 2);
  for (const k of new Set([...Object.keys(lay.f), ...Object.keys(lay.b), ...Object.keys(a.troops)])) {
    const t = a.troops[k] || 0; let have = (lay.f[k] || 0) + (lay.b[k] || 0);
    while (have > t) { if (lay.f[k]) lay.f[k]--; else lay.b[k]--; have--; }
    while (have < t) { if (k !== MAGE && rowSum(lay.f) < F) lay.f[k] = (lay.f[k] || 0) + 1; else lay.b[k] = (lay.b[k] || 0) + 1; have++; }
    if (!lay.f[k]) delete lay.f[k]; if (!lay.b[k]) delete lay.b[k];
  }
}
const rowKeyOf = a => Object.keys(a.troops).sort().map(k => k + a.troops[k]).join(',') + '|' + JSON.stringify(a.rowOrd || {});
// the army's rows now, or null when it fights as one line (5 or fewer)
function rowSync(a) {
  if (!a || a.kind !== 'army' || troopCount(a) < ROW_MIN) { if (a) a.rowLay = null; return null; }
  if (!a.battle) { const key = rowKeyOf(a); if (!a.rowLay || a.rowLayKey !== key) { a.rowLay = rowLayout(a); a.rowLayKey = key; } return a.rowLay; }
  if (!a.rowLay) a.rowLay = rowLayout(a);
  rowReconcile(a, a.rowLay); a.rowLayKey = null;   // re-formed by the orders once the battle is over
  return a.rowLay;
}
// a soldier of kind k falls (called before the troop count drops): a front-row death pulls a random back-row soldier forward
function rowFall(a, lay, k, front) {
  if (front) {
    if (lay.f[k]) { lay.f[k]--; if (!lay.f[k]) delete lay.f[k]; }
    const pool = Object.keys(lay.b).filter(kk => kk !== MAGE && lay.b[kk] > 0), tot = pool.reduce((n, kk) => n + lay.b[kk], 0);
    if (tot) { let r = Math.random() * tot, pick = pool[0]; for (const kk of pool) { r -= lay.b[kk]; if (r <= 0) { pick = kk; break; } } lay.b[pick]--; if (!lay.b[pick]) delete lay.b[pick]; lay.f[pick] = (lay.f[pick] || 0) + 1; }
  } else if (lay.b[k]) { lay.b[k]--; if (!lay.b[k]) delete lay.b[k]; }
}
// blows a kind lands in a round: back-row soldiers count half, the Mage always in full
function rowDeal(a, k) {
  const n = a.troops[k] || 0, lay = rowSync(a);
  if (!lay || k === MAGE) return n;
  return (lay.f[k] || 0) + (lay.b[k] || 0) * BACK_DEAL;
}
const kindName = k => k === MAGE ? UNIT_DEFS[MAGE].name : designById(k) ? designById(k).name : UNIT_DEFS[k] ? UNIT_DEFS[k].name : k;
const rowList = o => Object.keys(o).filter(k => o[k] > 0).map(k => `${o[k]} ${o[k] > 1 ? PLURAL_OF(kindName(k)) : kindName(k)}`).join(', ') || 'nobody';
function rowText(a) { const lay = rowSync(a); return lay ? `Front ${rowSum(lay.f)} · Back ${rowSum(lay.b)}` : `One line (rows from ${ROW_MIN} soldiers)`; }

// ---------- the Rows button and menu ----------
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
    return { name: 'Front and back rows', desc: `An army of ${ROW_MIN} or more fights in two rows of equal size. The front row takes the blows; whenever a front-row soldier falls, a back-row soldier steps forward. Back-row soldiers deal half damage, and take half damage once nobody is left in front. The ${UNIT_DEFS[MAGE].name} always stands in the back and deals full damage. Order the smaller unit types to the front or the back.${a ? ' Now: ' + rowText(a) + '.' : ''}`, cost: null, why: !a ? 'No army selected' : a.battle ? 'Not during battle' : null, ok: 'Click to arrange the rows', icon: rowsIcon() };
  };
  extraCmdUse = id => { if (id !== 'rows') return use0(id); const a = S.selected.find(v => v.kind === 'army' && v.owner === ME); if (a) openRowsMenu(a); return true; };
}
let rowsIco = null;
function rowsIcon() {
  if (rowsIco) return rowsIco;
  const c = document.createElement('canvas'); c.width = c.height = 88; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  const man = (x, y, col, s) => { g.beginPath(); g.arc(x, y - 14 * s, 6 * s, 0, 7); g.fillStyle = '#f1d3b0'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.moveTo(x - 8 * s, y + 8 * s); g.lineTo(x - 7 * s, y - 6 * s); g.lineTo(x + 7 * s, y - 6 * s); g.lineTo(x + 8 * s, y + 8 * s); g.closePath(); g.fillStyle = col; g.fill(); g.stroke(); };
  for (const x of [26, 44, 62]) man(x, 36, '#9aa7c0', 0.85);
  for (const x of [18, 36, 54, 72]) man(x, 64, '#c7362b', 1.05);
  g.beginPath(); g.moveTo(10, 50); g.lineTo(78, 50); g.setLineDash([5, 5]); g.lineWidth = 2.5; g.strokeStyle = OL; g.stroke(); g.setLineDash([]);
  return rowsIco = c.toDataURL();
}
function openRowsMenu(a) {
  if (a.battle) return toast('Rows can’t be changed during a battle.', true);
  const lay = rowSync(a), can = rowMovable(a), ks = rowJoinSync(a).filter(k => k !== MAGE);
  let html = `<div class="bm-head"><b>Rows of ${escHTML(a.name)}</b><span>${rowText(a)}</span></div>`;
  html += lay ? `<div class="rw-lay"><div><b>Front</b> ${rowList(lay.f)}</div><div><b>Back</b> ${rowList(lay.b)}</div></div>`
    : `<div class="bm-sec">An army of ${ROW_MIN} or more fights in two rows; this one fights as one line for now. Orders take effect once it is big enough.</div>`;
  for (const k of ks) {
    const o = a.rowOrd && a.rowOrd[k];
    if (!can.includes(k)) { html += `<div class="rw-k"><img alt="" src="${portrait(k)}"><span>${kindName(k)} ×${a.troops[k]}<small>Fills the places left over</small></span></div>`; continue; }
    html += `<div class="rw-k"><img alt="" src="${portrait(k)}"><span>${kindName(k)} ×${a.troops[k]}<small>${o ? 'Ordered to the ' + o.side : 'No order'}</small></span>` +
      ['front', 'back'].map(side => `<button type="button" class="rw-b${o && o.side === side ? ' on' : ''}" data-rows="${k}:${side}" data-army="${a.id}" aria-pressed="${!!(o && o.side === side)}">To ${side}</button>`).join('') + `</div>`;
  }
  if (a.troops[MAGE]) html += `<div class="rw-k"><img alt="" src="${portrait(MAGE)}"><span>${UNIT_DEFS[MAGE].name}<small>Always in the back</small></span></div>`;
  popNearCard(html);
}
menuEl.addEventListener('click', e => {
  const t = e.target.closest('[data-rows]'); if (!t) return; e.stopImmediatePropagation();
  const a = S.units.find(v => v.id === +t.dataset.army);
  if (!a || a.battle) { closeBuildMenu(); return toast('Rows can’t be changed during a battle.', true); }
  const [k, side] = t.dataset.rows.split(':');
  a.rowOrd = a.rowOrd || {};
  if (a.rowOrd[k] && a.rowOrd[k].side === side) delete a.rowOrd[k];   // clicking the active order again clears it
  else a.rowOrd[k] = { side, t: S.rowSeq = (S.rowSeq || 0) + 1 };
  sfx('ui_click'); cmdKey = ''; rosterKey = '';
  openRowsMenu(a);
}, true);
{
  const st = document.createElement('style');
  st.textContent = `
.rw-lay { font: 600 12px var(--font-ui); padding: 4px 10px 6px; display: grid; gap: 2px; }
.rw-lay b { display: inline-block; width: 42px; }
.rw-k { display: flex; align-items: center; gap: 8px; padding: 4px 10px; border-top: 1px solid #e3e7ee; }
.rw-k img { width: 32px; height: 32px; }
.rw-k span { flex: 1; font: 700 13px var(--font-ui); display: flex; flex-direction: column; }
.rw-k small { font-weight: 500; color: var(--muted); }
.rw-b { font: 800 11px var(--font-ui); padding: 4px 8px; border: 1px solid var(--ink); background: #eef2f7; cursor: pointer; }
.rw-b.on { background: var(--sun); }`;
  document.head.appendChild(st);
}

// ---------- one Mage per army ----------
const oneMageMsg = () => `An army can have only one ${UNIT_DEFS[MAGE].name}.`;
{
  const _ca = combineArmies;
  combineArmies = function (list) {
    if (list.reduce((n, a) => n + (a.troops[MAGE] || 0), 0) > 1) return toast(oneMageMsg(), true);
    const main = list[0], join = [...rowJoinSync(main)];
    for (const a of list.slice(1)) for (const k of rowJoinSync(a)) if (!join.includes(k)) join.push(k);
    _ca(list);
    if (S.units.includes(main)) main.rowJoin = join;
  };
}
// old saves: any extra Mages step out of their army (the player's as Mages of their own, a computer nation's as an army)
function oneMagePerArmy() {
  for (const a of S.units.slice()) {
    if (a.kind !== 'army' || !(a.troops[MAGE] > 1)) continue;
    const extra = a.troops[MAGE] - 1; a.troops[MAGE] = 1;
    for (let i = 0; i < extra; i++) {
      if (a.owner === ME) { const m = mkUnit(S.nextId++, MAGE, UNIT_DEFS[MAGE].name, a.prov, 0); m.slot = freeSlot(a.prov, m); [m.x, m.y] = slotPos(a.prov, m.slot); m.born = S.t; S.units.push(m); }
      else if (NATIONS[a.owner]) aiNewArmy(NATIONS[a.owner], a.prov, { [MAGE]: 1 });
    }
  }
}
{
  const _s96 = setupV96;
  setupV96 = function (loaded) { _s96(loaded); if (loaded) oneMagePerArmy(); if (S.rowSeq === undefined) S.rowSeq = 0; rowsIco = null; };
}
window.__v97 = { rowSync, rowLayout, rowMovable, rowDeal, rowFall, openRowsMenu, setOrder: (a, k, side) => { a.rowOrd = a.rowOrd || {}; a.rowOrd[k] = { side, t: S.rowSeq = (S.rowSeq || 0) + 1 }; } };
