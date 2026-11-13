
// ================= v101: Thug Den flag and Highwaymen mark, research panel closing, AI armies that stop feeding the enemy =================

// ---------- Thug Dens: a flag while one has room, and a gold "$" over a den that Highwaymen is doubling ----------
FLAG_IMG.denroom = bannerSVG('#5a7a3a', '#3f5a28', '<path d="M18 46 L32 26 L46 46 Z" fill="#8a6a44"/><rect x="28" y="36" width="8" height="10" fill="#3b3330"/><circle cx="44" cy="22" r="7" fill="#faf1dc"/><path d="M44 18 V26 M40 22 H48" stroke-width="2.4"/>');
const denRooms = () => isSw(ME) ? myDens().filter(d => !S.occ.has(d.p) && (d.e.thugs || 0) < denCap(ME)) : [];
{ const fl = flagList; flagList = function () {
  const out = fl();
  if (!S.started) return out;
  const rooms = denRooms(); if (!rooms.length || flagDismissed.has('denroom')) return out;
  const free = rooms.reduce((n, d) => n + denCap(ME) - (d.e.thugs || 0), 0);
  out.push({ id: 'denroom', img: 'denroom', tip: `${rooms.length > 1 ? rooms.length + ' Thug Dens have' : 'A Thug Den has'} room for ${free} more Thug${free > 1 ? 's' : ''}. Left-click to select it, right-click to dismiss`, label: 'Thug Den has room' });
  return out;
}; }
$q('#nflags').addEventListener('click', e => {
  const b = e.target.closest('[data-flag="denroom"]'); if (!b) return;
  const d = denRooms()[0]; if (!d) return;
  lookAtProv(d.p); selectPart(d.p, 'market@' + d.e.slot); cmdKey = ''; selKey = '';
});
const denHighway = p => techOf(ME, 'traderoutes') && denBorders(p, ME);
{ const dm = drawMagic; drawMagic = function (g, t) {
  dm(g, t);
  if (!isSw(ME) || !techOf(ME, 'traderoutes')) return;
  for (const d of myDens()) {
    if (!S.visible.has(d.p) || !denHighway(d.p)) continue;
    const c = G.provs[d.p].ic, [ox, oy] = bslotOf(d.p, d.e.slot), x = c[0] + ox, y = c[1] + oy - 74 + Math.sin(t * 2.2 + d.p) * 3;
    g.save();
    g.beginPath(); g.arc(x, y, 13, 0, 7); g.fillStyle = '#f4c44f'; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
    g.font = 'bold 19px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5a3d10'; g.fillText('$', x, y + 1);
    g.restore();
  }
}; }

// ---------- the research panel closes once every tree with something on offer has an active research ----------
const researchSettled = () => TREE_KEYS.every(t => { const st = S.tech[t]; return !st.tier || st.cur || !st.opts.length; });
{ const pt = pickTech; pickTech = function (id) {
  const before = TREE_KEYS.map(t => S.tech[t].cur).join('|');
  const r = pt(id);
  if (techOpen && before !== TREE_KEYS.map(t => S.tech[t].cur).join('|') && researchSettled()) toggleTech(false);
  return r;
}; }

// ---------- AI armies at war: rally somewhere safe, never spawn into a fight, and steer clear of armies that would crush them ----------
// stacks of enemy armies by province (strength), for one nation, refreshed with its war plan
function aiDangerFor(N, str) {
  const W = aiWarPlans.get(N.id), stacks = W ? W.stacks : new Map(), out = new Set();
  for (const [p, s] of stacks) if (s >= str * AI_ENGAGE) out.add(p);
  // bandit gangs that would beat it, too
  const gangs = new Map(); for (const v of S.units) if (v.kind === 'army' && v.bandit && troopCount(v) > 0) gangs.set(v.prov, (gangs.get(v.prov) || 0) + rawStrength([v]));
  for (const [p, s] of gangs) if (s >= str * AI_ENGAGE) out.add(p);
  // and where those armies are marching to
  for (const v of S.units) if (v.kind === 'army' && v.moving && v.final !== undefined && hostile(v.owner, N.id) && isNation(v.owner) && rawStrength([v]) >= str * AI_ENGAGE) out.add(v.final);
  return out;
}
// a safe place to gather: the capital if no enemy force that outmatches the whole army stands in it or next to it,
// otherwise the own province furthest from the enemy's main force that is safe
function aiRally(N, W) {
  const total = Math.max(1, W.myTotal), bad = new Set();
  for (const [p, s] of W.stacks) if (s >= total * AI_ENGAGE) { bad.add(p); for (const q of allNbr[p]) bad.add(q); }
  if (W.cap >= 0 && !bad.has(W.cap)) return W.cap;
  const from = W.foeProv >= 0 ? hopsFrom(W.foeProv, allNbr) : null;
  let best = -1, bd = -1;
  for (const p of provsOf(N.id)) {
    if (bad.has(p) || S.occ.has(p)) continue;
    const d = from && from[p] !== undefined ? from[p] : 0, v = d * 10 + (extrasIn(p).some(e => e.type === 'barracks') ? 5 : 0);
    if (v > bd) { bd = v; best = p; }
  }
  return best >= 0 ? best : W.cap;
}
// v100's war plan, now with a safe rally point; armies that would gather where the enemy stands go there instead
{ const wp = aiWarPlan; aiWarPlan = function (N, enemies) { const W = wp(N, enemies); if (W.rally === undefined) W.rally = aiRally(N, W); return W; }; }
{ const wg = aiWarGoal; aiWarGoal = function (N, a, enemies) {
  const W = aiWarPlan(N, enemies), str = rawStrength([a]);
  // under threat: an enemy force that outmatches this army stands next door (or is marching here): get out of the way
  const danger = aiDangerFor(N, str);
  const threatened = danger.has(a.prov) || allNbr[a.prov].some(q => (W.stacks.get(q) || 0) >= str * AI_ENGAGE);
  if (threatened && a.prov !== W.rally) return W.rally;
  const g = wg(N, a, enemies);
  // v100 sends gathering armies to the capital: use the safe rally point when the capital isn't safe
  if (g === W.cap && W.rally !== W.cap && !((W.stacks.get(W.cap) || 0) && (W.stacks.get(W.cap) || 0) < str * AI_ENGAGE)) return W.rally;
  return g;
}; }
// paths that avoid the provinces where an outmatching enemy force stands or is heading (the destination itself excepted)
let pathAvoid = null;
{ const fp = findPathVia; findPathVia = function (u, target, siege) {
  if (!pathAvoid) return fp(u, target, siege);
  if (target === u.prov) return [];
  if (!canEnter(u, target, target)) return null;
  const prev = new Map([[u.prov, null]]), q = [u.prov];
  while (q.length) {
    const a = q.shift(); if (a === target) break;
    for (const n of pathNbr(u, a, siege)) if (!prev.has(n.q) && (n.q === target || !pathAvoid.has(n.q)) && canEnter(u, n.q, target)) { prev.set(n.q, { a, m: n.m, siege: n.siege }); q.push(n.q); }
  }
  if (!prev.has(target)) return null;
  const hops = []; let c = target;
  while (c !== u.prov) { const pr = prev.get(c); hops.unshift({ to: c, m: pr.m, siege: pr.siege }); c = pr.a; }
  return hops;
}; }
{ const od = order; order = function (u, target, quiet, pt) {
  const N = u && u.kind === 'army' ? NATIONS[u.owner] : null;
  if (!N || !enemiesOf(N.id).length) return od(u, target, quiet, pt);
  pathAvoid = aiDangerFor(N, rawStrength([u]));
  try { return od(u, target, quiet, pt); } finally { pathAvoid = null; }
}; }
// a soldier who finishes training in a province where the enemy stands waits in the barracks until it is clear
{ const qs = aiQueueStep; aiQueueStep = function (N, t) {
  const held = N.queue.filter(q => MILITARY.has(q.kind) && hostilesIn(q.prov, N.id).some(v => v.kind === 'army'));
  if (!held.length) return qs(N, t);
  N.queue = N.queue.filter(q => !held.includes(q));
  try { qs(N, t); } finally { for (const q of held) N.queue.push(q); }
}; }
// re-plan threatened armies quickly instead of every 5 seconds
{ const ao = aiArmyOrders; aiArmyOrders = function (N, P, t) {
  if (enemiesOf(N.id).length) for (const a of aiArmies(N)) if (a.moving && !a.battle && !a.retreating) { const d = aiDangerFor(N, rawStrength([a])); if (d.has(a.final) || (a.path && a.path.length && d.has(a.prov))) a.aiPlanT = -99; }
  return ao(N, P, t);
}; }

window.__v101 = { denRooms, researchSettled, aiRally, aiDangerFor };

// ---------- Sacred Pyre: no button unless the Warlock stands in one of your provinces ----------
{ const sb = spellButtons; spellButtons = function (c, from) {
  const out = sb(c, from), i = out.findIndex(b => b.id === 'spell:sacred');
  if (i < 0 || !(c && (!owned(c.prov) || S.occ.has(c.prov)))) return out;
  const cells = out.map(b => b.cell); out.splice(i, 1); out.forEach((b, j) => { b.cell = cells[j]; });   // the rest move up into the same cells
  return out;
}; }
{ const mk = magicCmdKey; magicCmdKey = function () { const c = selCaster(); return mk() + (c ? '|p' + c.prov + (owned(c.prov) && !S.occ.has(c.prov) ? 'o' : '') : ''); }; }
