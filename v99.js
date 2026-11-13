
// ================= v99: meeting before allying, the new warscore sizes, Bridge Building =================

// ---------- who has met whom ----------
// The player's contacts are S.met. Two computer nations have met once their lands touch, or they have been at war or allied.
S.aiMet = new Set();
const hasMet = (a, b) => a === b || (a === ME ? S.met.has(b) : b === ME ? S.met.has(a) : S.aiMet.has(pairKey(a, b)));
let aiMetAt = -9;
function stepAiMet() {
  if (S.t - aiMetAt < 2) return; aiMetAt = S.t;
  for (const [p, b] of S.buildings) {
    const a = b.owner; if (!NATIONS[a]) continue;
    for (const q of allNbr[p]) { const o = nationOf(q); if (o && o !== a && o !== ME && NATIONS[o]) S.aiMet.add(pairKey(a, o)); }
  }
  for (const w of S.wars) if (w.a !== ME && w.b !== ME) S.aiMet.add(pairKey(w.a, w.b));
  for (const A of S.allies) if (A.a !== ME && A.b !== ME) S.aiMet.add(pairKey(A.a, A.b));
}
{ const sa = stepAlliances; stepAlliances = function () { stepAiMet(); return sa(); }; }
// no alliance between nations that haven't met
{ const aw = allyWhy; allyWhy = function (a, b) {
  if (a !== b && !hasMet(a, b)) return a === ME || b === ME ? 'You haven’t met them yet' : 'They haven’t met each other';
  return aw(a, b);
}; }
// allying the player: he meets everyone his new ally has met, and his ally meets everyone he has
{ const fa = formAlliance; formAlliance = function (a, b, vs) {
  fa(a, b, vs);
  if (a !== ME && b !== ME) return;
  const o = a === ME ? b : a;
  for (const x of [...S.met]) if (x !== o && NATIONS[x] && aliveNation(x)) S.aiMet.add(pairKey(o, x));
  for (const x of aiIds()) if (x !== o && aliveNation(x) && !S.met.has(x) && S.aiMet.has(pairKey(o, x))) meetNation(x);
}; }

// ---------- warscore: how big the beaten army was ----------
// warWipe (war.js) reads these: +1 for an army of more than 10 soldiers, +5 for one of more than half its nation's whole army
{ const obj = onBattleJoin; onBattleJoin = function (a, t) {
  if (a.kind === 'army') { a.wsSize = troopCount(a) - (a.troops[MAGE] || 0); a.wsTotal = soldierCount(a.owner); }
  return obj(a, t);
}; }

// ---------- Bridge Building (Government Tier III) ----------
const BRIDGE_COST = { gold: 150, wood: 200 }, BRIDGE_TIME = 90;
if (!TECH_BY_ID.bridges) {
  const x = { id: 'bridges', tree: 'gov', tier: 3, cost: 200, req: ['walls2', 'moat', 'forge', 'refmills'], name: 'Bridge Building',
    blurb: `Masons can build a bridge across a river border (${BRIDGE_COST.wood} wood, ${BRIDGE_COST.gold} gold, ${BRIDGE_TIME} s). It takes no building plot, and only one of the two provinces has to be yours. Needs Stone Walls, Moat, the Forge and Refined Lumber Mills.` };
  TECHS.push(x); TECH_BY_ID.bridges = x;
}
GOV_ICONS.bridges = g => {
  ICO.disc(g, '#bfe6ff');
  g.fillStyle = '#4fa3e0'; g.fillRect(6, 40, 52, 14);
  g.beginPath(); g.moveTo(8, 40); g.quadraticCurveTo(32, 14, 56, 40); g.lineTo(56, 46); g.quadraticCurveTo(32, 24, 8, 46); g.closePath(); g.fillStyle = '#b07a45'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OL; g.stroke();
  g.strokeStyle = OL; g.lineWidth = 2; for (const x of [16, 24, 32, 40, 48]) { const y = 40 - Math.sin((x - 8) / 48 * Math.PI) * 13; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x, y + 1); g.stroke(); }
  g.beginPath(); g.moveTo(8, 32); g.quadraticCurveTo(32, 6, 56, 32); g.lineWidth = 2.6; g.stroke();
};
const riverEdge = (p, q) => edgeBetween(p, q, 'river', false);
const bridgeUnderWay = (p, q) => S.units.some(u => u.build && u.build.type === 'bridge' && linkKey(u.build.prov, u.build.to) === linkKey(p, q));
function bridgeWhy(m, q) {
  const p = m.prov;
  if (!hasTech('bridges')) return 'Research Bridge Building first';
  if (p === q || !allNbr[p].includes(q)) return 'The Mason must stand next door';
  if (riverEdge(p, q) < 0) return 'There is no river between them';
  if (!S.explored.has(q)) return 'Explore it first';
  if (!owned(p) && !owned(q)) return 'One side must be your land';
  if (m.moving) return 'He is walking';
  if (m.build) return 'He is already building';
  if (bridgeUnderWay(p, q)) return 'Already under way';
  return lackText(BRIDGE_COST);
}
function startBridge(m, q) {
  const why = bridgeWhy(m, q); if (why) return toast(`Can’t build a bridge there: ${why.toLowerCase()}.`, true);
  for (const k in BRIDGE_COST) S.stock[k] -= BRIDGE_COST[k];
  m.surveyQueue = []; m.pending = null;
  m.build = { prov: m.prov, to: q, type: 'bridge', t0: S.t, paid: { ...BRIDGE_COST }, dur: BRIDGE_TIME, owner: m.owner };
  toast(`Building a bridge to ${provName(q)}… (−${costText(BRIDGE_COST)}, ${BRIDGE_TIME} s)`); sfx('bld_work', { prov: m.prov });
}
{ const fl = finishLink; finishLink = function (b) {
  if (b.type !== 'bridge') return fl(b);
  const i = riverEdge(b.prov, b.to); if (i < 0) return;
  openEdge(i, 'bridge'); wallsVer++;
  if (b.owner === ME) { toast(`Bridge finished between ${provName(b.prov)} and ${provName(b.to)}: anyone may cross the river there now.`); sfx('bld_done', { prov: b.prov }); }
}; }
// no wall on a bridge
{ const lw = linkWhy; linkWhy = function (type, m, q) { if (type === 'wall') { const i = edgeBetween(m.prov, q, null, true); if (i >= 0 && S.paths[i] === 'bridge') return 'There is a bridge here'; } return lw(type, m, q); }; }
// the Mason's Ctrl+right-click menu: a bridge row on a river border
{ const lr = linkRows; linkRows = function (m, q) {
  let s = lr(m, q);
  if (!m || m.prov === q || !hasTech('bridges') || !allNbr[m.prov].includes(q) || riverEdge(m.prov, q) < 0) return s;
  const why = bridgeWhy(m, q);
  const row = `<button type="button" class="bm-item" data-type="bridge" ${why ? 'aria-disabled="true"' : ''}><img alt="" src="${techIcon('bridges')}"><span class="bm-name">Bridge to ${escHTML(provName(q))}<small>${why || `Across the river from ${escHTML(provName(m.prov))} · ${BRIDGE_TIME} s · no building plot`}</small></span><span class="bm-cost">${costHTML(BRIDGE_COST)}</span></button>`;
  if (s.includes('bm-sec')) return s + row;
  return `<div class="bm-sec">Border with ${escHTML(provName(m.prov))}</div>` + row;
}; }
menuEl.addEventListener('click', e => {
  const b = e.target.closest('[data-type="bridge"]'); if (!b) return;
  e.stopImmediatePropagation(); if (b.getAttribute('aria-disabled') === 'true') return;
  const m = S.selected.find(v => v.kind === MASON), q = menuProv; closeBuildMenu(); if (m) startBridge(m, q);
}, true);
// a wooden bridge drawn over the river (drawMagic draws S.paths; see bridgeArt), and a half-built one while the Mason works
function bridgeArt(g, f) {
  const L = 34, W = 13, n = Math.max(1, Math.round(9 * f));
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(-W - 2, -L + 4, W * 2 + 4, L * 2);
  for (let k = 0; k < 9; k++) { if (k >= n) break; const y = -L + k * (2 * L / 9); g.beginPath(); g.rect(-W, y, W * 2, 2 * L / 9 - 1); g.fillStyle = k % 2 ? '#b98552' : '#a8743f'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke(); }
  if (f >= 1) for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * (W + 2), -L - 2); g.lineTo(s * (W + 2), L + 2); g.lineWidth = 5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 2.6; g.strokeStyle = '#8a5a30'; g.stroke();
    for (const y of [-L - 2, 0, L + 2]) { g.beginPath(); g.arc(s * (W + 2), y, 3.4, 0, 7); g.fillStyle = '#8a5a30'; g.fill(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke(); }
  }
}
{ const dm = drawMagic; drawMagic = function (g, t) {
  dm(g, t);
  for (const u of S.units) {
    if (!u.build || u.build.type !== 'bridge' || !(S.explored.has(u.build.prov) || S.explored.has(u.build.to))) continue;
    const i = riverEdge(u.build.prov, u.build.to); if (i < 0) continue;
    const e = world.edges[i], V = world.vertices, a = V[e.v[0]], b = V[e.v[1]];
    g.save(); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); g.rotate(Math.atan2(b[1] - a[1], b[0] - a[0])); bridgeArt(g, Math.min(1, (S.t - u.build.t0) / u.build.dur)); g.restore();
  }
}; }

// ---------- new games and loaded saves ----------
{ const s96 = setupV96; setupV96 = function (loaded) {
  s96(loaded);
  if (!(S.aiMet instanceof Set)) S.aiMet = new Set(S.aiMet || []);
  if (!loaded) S.aiMet = new Set();
  aiMetAt = -9;
}; }

window.__v99 = { hasMet, stepAiMet, bridgeWhy, startBridge, riverEdge, artTop: id => artTop(id) };
