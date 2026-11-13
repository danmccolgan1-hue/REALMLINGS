
// ================= v101: the Basic Tutorial =================
// Main menu → Tutorial → Basic Tutorial (Combat Tutorial: coming later).
// A hand-made five-province island (the user's diagram): Grass Capital, Forest, Swamp, Desert and the Swamp Bandits.
// The player is a Realmling nation with one Wayfinder and one Mason (no starting army). Narration triggers run in order;
// each line of text stays on screen until the player presses Next (paused or not); Next on the last line ends the trigger.
// Objectives are listed on the left; finished ones stay, grayed and struck through.
// Audio for each trigger comes later: put a file path in a trigger's `audio` and it plays with the text (Next on the last line stops it).

// province indexes in the tutorial world
const TP = { capital: 0, forest: 1, swamp: 2, desert: 3, bandits: 4 };

// ---------- the island ----------
// coordinates from the diagram (×3.2 here; scaleWorld doubles them again like every map)
function tutorialWorld() {
  const K = 3.2;
  const V = [
    [200, 125],  // 0  Desert / Swamp / Bandits
    [222, 205],  // 1  the middle: Swamp / Bandits / Capital / Forest
    [140, 100],  // 2  Desert / Swamp / sea
    [138, 45],   // 3
    [185, 12],   // 4
    [238, 40],   // 5
    [245, 100],  // 6  Desert / Bandits / sea
    [298, 120],  // 7
    [305, 185],  // 8  Bandits / Capital / sea
    [345, 225],  // 9
    [320, 282],  // 10
    [245, 285],  // 11 Capital / Forest / sea
    [205, 330],  // 12
    [148, 300],  // 13
    [140, 222],  // 14 Swamp / Forest / sea
    [100, 165]   // 15
  ].map(([x, y]) => [x * K, y * K]);
  const polys = [
    { terrain: 'grassland', verts: [1, 8, 9, 10, 11] },        // 0 Grass Capital
    { terrain: 'forest', verts: [14, 1, 11, 12, 13] },         // 1 Forest
    { terrain: 'swamp', verts: [15, 2, 0, 1, 14] },            // 2 Swamp
    { terrain: 'desert', verts: [2, 3, 4, 5, 6, 0] },          // 3 Desert
    { terrain: 'swamp', verts: [0, 6, 7, 8, 1] }               // 4 Swamp Bandits
  ];
  // borders between provinces: open, or a barrier band (mountains between the Capital and the bandits, ruins between the swamps)
  const E = [
    { a: 0, b: 1, v: [11, 1], open: true, style: null },       // Capital – Forest
    { a: 1, b: 2, v: [1, 14], open: true, style: null },       // Forest – Swamp
    { a: 2, b: 3, v: [2, 0], open: true, style: null },        // Swamp – Desert
    { a: 3, b: 4, v: [6, 0], open: true, style: null },        // Desert – Swamp Bandits
    { a: 2, b: 4, v: [0, 1], open: false, style: 'ruins' },    // Swamp – Swamp Bandits
    { a: 4, b: 0, v: [8, 1], open: false, style: 'mountains' } // Swamp Bandits – Capital
  ].map((e, id) => ({ id, ...e }));
  const ek = (a, b) => Math.min(a, b) + '_' + Math.max(a, b);
  const inner = new Set(E.map(e => ek(e.v[0], e.v[1])));
  const provinces = polys.map((P, i) => {
    const coast = [];
    P.verts.forEach((a, k) => { const b = P.verts[(k + 1) % P.verts.length]; if (!inner.has(ek(a, b))) coast.push([a, b, 0]); });
    const nbr = E.filter(e => e.a === i || e.b === i).map(e => e.a === i ? e.b : e.a);
    const pts = P.verts.map(v => V[v]), site = [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
    return { id: i, site, verts: P.verts.slice(), terrain: P.terrain, adj: nbr.slice(), nbr, edges: E.filter(e => e.a === i || e.b === i).map(e => e.id), coast };
  });
  const xs = V.map(v => v[0]), ys = V.map(v => v[1]);
  return {
    W: Math.max(...xs) + 400, H: Math.max(...ys) + 400, center: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2],
    provinces, vertices: V, edges: E, rivers: [], junctions: [{ v: 1, kind: 'mountains' }],
    features: { peninsulas: [], coves: [] }, lakes: [], lakesInland: true, touchesEdgeOfWorld: false,
    seed: 'realmlings-tutorial', tutorial: true, attempts: 1, report: [],
    // the diagram's trees along the shore (dark lines): count as tree borders for Lumber Mills
    shoreTrees: [[1, 11, 12], [1, 12, 13], [2, 14, 15], [4, 6, 7], [4, 7, 8]]   // [province, vertex, vertex]
  };
}
// trees along the shore: drawn as two rows of border trees on the land side, kept clear of the open ground
function tutorialShore() {
  const V = world.vertices, rnd = rngFrom(world.seed + ':shore');
  const ek = (a, b) => Math.min(a, b) + '_' + Math.max(a, b);
  for (const [p, va, vb] of world.shoreTrees) {
    const P = G.provs[p], a = V[va], b = V[vb], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    let nx = -dy / len, ny = dx / len;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if ((P.c[0] - mx) * nx + (P.c[1] - my) * ny < 0) { nx = -nx; ny = -ny; }   // point inland
    const swampy = P.terrain === 'swamp', n = Math.max(1, Math.round(len / 20));
    for (const row of [0, 1]) for (let j = 0; j < n; j++) {
      const t = (j + 0.5 + row * 0.5) / n; if (t > 1) continue;
      const off = 34 + row * 30 + (rnd() - 0.5) * 8;
      const s = swampy ? 'cypress' + (rnd() < 0.5 ? 0 : 1) : rnd() < 0.45 ? 'pine' + (rnd() < 0.5 ? 0 : 1) : 'tree' + Math.floor(rnd() * 3);
      G.sway.push({ x: a[0] + dx * t + nx * off, y: a[1] + dy * t + ny * off + 8, s: s + '_L', ph: rnd() * 6.28 });
    }
  }
  G.sway.sort((a, b) => a.y - b.y);
  // the open ground keeps clear of the shore trees, like it does of a tree border between provinces
  const trees = new Set(world.shoreTrees.map(([, a, b]) => ek(a, b)));
  const edgeBy = new Map(world.edges.map(e => [ek(e.v[0], e.v[1]), e]));
  world.provinces.forEach((wp, i) => {
    if (!world.shoreTrees.some(s => s[0] === i)) return;
    const P = G.provs[i];
    const d = wp.verts.map((v, k) => { const w2 = wp.verts[(k + 1) % wp.verts.length], key = ek(v, w2), e = edgeBy.get(key); return trees.has(key) ? BAND_IN + 40 : e ? (e.open ? 6 : BAND_IN) : 18; });
    P.inner = insetPoly(P.pts, d, P.c); P.ic = centroid(P.inner);
  });
}
// Lumber Mills: the shore trees count as tree borders
{
  const _ry = rollYields;
  rollYields = function () {
    _ry();
    if (world && world.tutorial) for (const [p] of world.shoreTrees) treeBorder[p] = (treeBorder[p] || 0) + 1;
  };
}

// ---------- what the Mason may build ----------
// outposts always; Lumber Mills from Trigger 10; a Barracks from Trigger 16; nothing else
{
  const _bc = buildCheck;
  buildCheck = function (p, type) {
    if (S.tutorial && type !== 'outpost' && !(S.tut && S.tut.allow.includes(type))) return 'Not available in the tutorial yet';
    return _bc(p, type);
  };
}
// no saving during the tutorial (it would overwrite your saved game)
{
  const _sg = saveGame;
  saveGame = function (quiet) { if (S.tutorial) { if (!quiet) toast('Saving is turned off in the tutorial.', true); return; } return _sg(quiet); };
}

// ---------- helpers ----------
const tutNow = () => performance.now() / 1000;
const tutUnit = kind => S.units.find(u => u.owner === ME && u.kind === kind);
const tutSoldiers = () => S.units.filter(u => u.owner === ME && u.kind === 'army').reduce((s, a) => s + troopCount(a) - (a.troops[MAGE] || 0), 0);
const tutBandits = () => S.units.filter(v => v.bandit && troopCount(v) > 0);
function tutTopUp(cost, why) {
  const add = {}; for (const k in cost) if (S.stock[k] < cost[k]) { add[k] = cost[k] - S.stock[k]; S.stock[k] = cost[k]; }
  if (Object.keys(add).length) { barKey = ''; toast(`Tutorial: you’ve been given ${costText(add)} for ${why}.`); }
}
function tutCenter(x, y, z) { flyTo({ x, y, z: z || cam.z }); }

// ---------- the triggers ----------
// cond: when the trigger may start (the trigger before it always has to be finished first, except Trigger 20)
// obj: the objective it adds; its done() is checked every frame and stays done once true
const TUT_TRIGGERS = [
  { id: '1', cond: () => true,
    lines: ['Welcome to Realmlings! This is what is known as a 4X Game. Explore, expand, exploit, and exterminate. Your goal is to expand as a nation, grow in strength and overcome rival players’ nations.'],
    obj: { key: 'capital', text: 'Select your Capital', done: () => (S.selBuilding === S.capital && S.selKind === 'capital') || (S.selProv === S.capital && S.selPart === 'settlement') } },
  { id: '2', cond: () => tutDone('capital'),
    lines: ['Every nation starts with a single province with a Capital. The Capital is special, it can support more buildings than any other province and can build Masons and Wayfinders.',
      'At the top of the screen you can see the research button. Below is a notification indicating that new research is available. There are three trees of research: Government, which improves your nation’s infrastructural capabilities, Military, which improves your nation’s army, and Magic, which improves your nation’s magical abilities. At the start of a game military and magic research are locked until the Forge and Mage Tower buildings are researched and later constructed.'],
    glow: ['#techBtn', '#nflags'],
    obj: { key: 'research', text: 'Select your research', done: () => TREE_KEYS.some(k => S.tech[k].cur || S.tech[k].done.length) } },
  { id: '3', cond: () => tutDone('research'),
    lines: ['Above Research is your resources: Gold, Wood, and Food. Units typically require Gold for the upfront purchase and have an upkeep of Food. Buildings typically require Gold and Wood for an upfront purchase and have an upkeep of Wood.',
      'If you do not upkeep your buildings they will break down. If you do not feed your army, they will desert you.',
      { t: 'The number to the right of each resource is your current net income. Every 10 seconds, as seen by the circular timer here, you will get an influx of your net resources.',
        call: [{ sel: '#res .tick', label: 'Cycle Timer', side: 'b', dx: 40, dy: 120 }] }],
    glow: ['#res'] },
  { id: '3.1', cond: () => true,
    start: () => { const u = tutUnit(WAYFINDER); if (u) tutCenter(u.x, u.y); },
    lines: ['This is a Wayfinder, this unit’s role is to scout and expand your nation’s vision of the world. He can also survey provinces to reveal their base resources. This is necessary for expansion.',
      'Every game starts with the game paused. You can pause at any time to queue up actions and take the time you need to make decisions.'],
    obj: { key: 'wayfinder', text: 'Select your Wayfinder', done: () => S.selected.some(u => u.kind === WAYFINDER && u.owner === ME) } },
  { id: '4', cond: () => tutDone('wayfinder'),
    lines: ['Use the wayfinder to survey the neighboring province. Move the wayfinder to the province and press Q or select the button from the action card in the bottom right.'],
    obj: { key: 'survey', text: 'Survey the neighboring province', done: () => S.surveyed.has(TP.forest) } },
  { id: '5', cond: () => tutDone('survey'),
    lines: ['Good Job. The province beyond is unexplored and only the wayfinder can explore there. Tell your wayfinder to explore the province by right clicking on the province.'],
    obj: { key: 'explore', text: 'Explore the next province', done: () => S.wf.has(TP.swamp) || S.explored.has(TP.swamp) } },
  { id: '6', cond: () => tutDone('explore'),
    lines: ['Notice how this province has a different terrain than the previous two. Your Capital is Grassland, your neighboring province is a Forest. This is a Swamp. Swamps produce less gold than Forests or Grasslands and have certain building restrictions. Farms for example cannot be built in swamps.'] },
  { id: '7', cond: () => true,
    start: () => {
      const m = tutUnit(MASON); if (m) { S.selected = [m]; S.selBuilding = -1; S.selProv = -1; S.selPart = null; cmdKey = ''; }
      flyTo(fitView(boxOf([TP.forest]), 0.9));
    },
    lines: ['This is a Mason, he builds your buildings and expands your borders by building outposts. Use the Mason to build an outpost in your neighboring forest province.'] },
  { id: '8', cond: () => true, lines: [],
    obj: { key: 'outpost', text: 'Build an outpost', done: () => { const b = S.buildings.get(TP.forest); return !!b && b.owner === ME; } } },
  { id: '9', cond: () => tutDone('outpost'),
    lines: ['Notice how you can only build outposts in provinces that are adjacent to another province you own.'] },
  { id: '10', cond: () => true,
    start: () => { S.tut.allow.push('lumber'); cmdKey = ''; },
    lines: ['The lumber mill is one of the most important buildings you can build. The more Wood you make the more buildings you can build. Lumber mills can only be built in provinces with bordering trees. The more bordering trees the more lumber mills you can build.',
      'Each province can support 1 of each building except lumber mills and farms.'] },
  { id: '11', cond: () => true,
    lines: ['You can only build 4 outposts before you reach your expansion limit. To expand beyond that you will need to upgrade one of your outposts to a fort.'],
    glow: ['#r-provs'] },
  { id: '12', cond: () => true,
    lines: ['You can only upgrade one outpost right now but through technology you can upgrade more and expand even farther.'],
    glow: ['#r-forts'] },
  { id: '13', cond: () => true,
    start: () => tutTopUp(FORT_UPGRADE.cost, 'the Fort'),
    lines: ['Click on your outpost to upgrade it to a fort.'],
    obj: { key: 'fort', text: 'Upgrade an outpost', done: () => [...S.buildings.values()].some(b => b.owner === ME && b.stage === 1) } },
  { id: '14', cond: () => S.upgrades.size > 0 || tutDone('fort'),
    lines: ['Continue exploring with your wayfinder.'] },
  { id: '15', cond: () => S.wf.has(TP.desert) || S.explored.has(TP.desert),
    lines: ['You have discovered the desert. This terrain type has very little resources and cannot support farms or lumber mills. However the desert can sometimes hide gold deposits well worth the expansion and resources to claim.'] },
  { id: '16', cond: () => tutBandits().some(v => v.seen),
    start: () => { S.tut.allow.push('barracks'); cmdKey = ''; tutTopUp(BUILD_DEFS.barracks.cost, 'a Barracks'); },
    lines: ['You have found a band of bandits. They are territorial and won’t move from their province. To defeat them you will need to train an army.',
      'Have your mason build a barracks.'],
    obj: { key: 'barracks', text: 'Build a barracks', done: () => [...S.extras].some(([p, l]) => owned(p) && l.some(e => e.type === 'barracks')) } },
  { id: '17', cond: () => tutDone('barracks'),
    start: () => { const c = UNIT_DEFS[footmanOf(ME)].cost, need = {}; for (const k in c) need[k] = c[k] * 3; tutTopUp(need, 'three Footmen'); },
    lines: ['Good. Now that you have a barracks train some Footmen to defeat the bandits and end the tutorial.'],
    obj: { key: 'swords', text: 'Train some Footmen', done: () => tutSoldiers() >= 3 } },
  { id: '18', cond: () => true,
    lines: ['You can customize your troops in the Armory. Building Forges allow for further upgrades.'],
    glow: ['#armBtn'] },
  { id: '19', cond: () => true,
    lines: ['There are other races you can play that play somewhat differently to the Realmlings. Explore each race to find the one that you like best.'] }
];
const TUT_FINAL = { id: '20', lines: ['Good job and thank you for completing the tutorial. You are now ready to start your first Realmlings adventure.'] };
// audio for each trigger, added later: TUT_AUDIO['4'] = 'tutorial/t4.mp3' and so on
const TUT_AUDIO = {};

const tutDone = key => !!(S.tut && S.tut.done.includes(key));

// ---------- running the triggers ----------
let tutAudio = null;
function tutPlay(trig) {
  const T = S.tut;
  T.cur = { id: trig.id, lines: trig.lines.slice(), k: 0, t0: tutNow(), glow: trig.glow || [] };
  if (trig.start) trig.start();
  if (trig.obj) T.objs.push({ key: trig.obj.key, text: trig.obj.text, trig: trig.id });
  tutGlow(T.cur.glow, true);
  if (tutAudio) { tutAudio.pause(); tutAudio = null; }
  if (TUT_AUDIO[trig.id]) { try { tutAudio = new Audio(TUT_AUDIO[trig.id]); tutAudio.volume = typeof SFX === 'object' && SFX.vol !== undefined ? SFX.vol : 0.8; tutAudio.play().catch(() => {}); } catch (e) { tutAudio = null; } }
  if (!T.cur.lines.length) tutEndTrigger();
  tutRender(true);
}
function tutEndTrigger() {
  const T = S.tut; if (!T.cur) return;
  tutGlow(T.cur.glow, false);
  T.finished.push(T.cur.id); T.cur = null;
  if (tutAudio) { tutAudio.pause(); tutAudio = null; }
  tutRender(true);
}
// the Next button: the next line of the current trigger; on its last line, the trigger ends (and its audio stops)
function tutNext() {
  const T = S.tut, L = tutShown(); if (!L) return;
  sfx('ui_click');
  L.k++;
  if (L.k < L.lines.length) return tutRender(true);
  if (L === T.replay) { T.replay = null; tutRender(true); } else tutEndTrigger();
}
// the Back button: the line before, within the current trigger's text only
function tutBack() {
  const L = tutShown(); if (!L || L.k <= 0) return;
  sfx('ui_click'); L.k--; tutRender(true);
}
// what the narration box shows: a replayed objective's text first, else the current trigger
const tutShown = () => S.tut && (S.tut.replay || S.tut.cur);
const tutLineText = l => typeof l === 'string' ? l : l.t;
// the play button by an objective: show the text of the trigger that gave it again (or the trigger before, if that one had none)
function tutReplay(key) {
  const T = S.tut, o = T && T.objs.find(x => x.key === key); if (!o) return;
  let i = TUT_TRIGGERS.findIndex(t => t.id === o.trig);
  while (i > 0 && !TUT_TRIGGERS[i].lines.length) i--;
  const trig = TUT_TRIGGERS[i]; if (!trig || !trig.lines.length) return;
  sfx('ui_click');
  T.replay = { id: trig.id, lines: trig.lines.slice(), k: 0 };
  tutRender(true);
}
function tutGlow(sel, on) { for (const s of sel) { const el = $q(s); if (el) el.classList.toggle('tut-glow', on); } }
function stepTutorial() {
  const T = S.tut; if (!T) return;
  // objectives: once done, done for good
  for (const trig of TUT_TRIGGERS) if (trig.obj && !T.done.includes(trig.obj.key) && T.objs.some(o => o.key === trig.obj.key) && trig.obj.done()) { T.done.push(trig.obj.key); tutRender(true); }
  // Trigger 20: the bandits are beaten; everything else stops
  if (!T.ended && T.banditsPlaced && !tutBandits().length) {
    T.ended = true; T.replay = null; if (T.cur) { tutGlow(T.cur.glow, false); T.cur = null; }
    for (const o of T.objs) if (!T.done.includes(o.key)) T.done.push(o.key);
    tutPlay(TUT_FINAL); T.next = TUT_TRIGGERS.length; return;
  }
  tutCallouts();
  // a line stays until Next; no new trigger starts while one is showing or an objective's text is being replayed
  if (T.cur || T.replay) return;
  if (T.ended) { if (!T.finalShown) { T.finalShown = true; tutRender(true); } return; }
  const nx = TUT_TRIGGERS[T.next];
  if (nx && nx.cond()) { T.next++; tutPlay(nx); }
}

// ---------- the panels: objectives (left), narration with the Next button (bottom) ----------
function tutPanels() {
  if (!$q('#tutObj')) $q('#lcol').insertAdjacentHTML('beforeend', '<div class="tut-obj chip" id="tutObj" aria-label="Tutorial objectives"></div>');
  if (!$q('#tutSay')) {
    document.body.insertAdjacentHTML('beforeend', '<div class="tut-say chip" id="tutSay" role="status" aria-live="polite" hidden><div class="tut-say-h"><b>Tutorial</b><span id="tutSayN"></span></div><p id="tutSayT"></p><div class="tut-say-b"><button type="button" class="tut-skip" id="tutBack" title="Back">◂ Back</button><button type="button" class="tut-skip" id="tutNext" title="Next">Next ▸</button></div></div>'
      + '<div class="tut-end chip" id="tutEnd" role="dialog" aria-label="Tutorial complete" hidden><h2>Tutorial complete</h2><p>You are ready to start your first Realmlings adventure.</p><div class="tut-end-b"><button type="button" class="menu-start" id="tutMenu">Main menu</button><button type="button" class="tut-stay" id="tutStay">Keep playing</button></div></div>');
    const say = $q('#tutSay'), end = $q('#tutEnd');
    for (const el of [say, end]) { el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('wheel', e => e.stopPropagation(), { passive: true }); }
    $q('#tutNext').addEventListener('click', e => { e.stopPropagation(); tutNext(); });
    $q('#tutBack').addEventListener('click', e => { e.stopPropagation(); tutBack(); });
    $q('#tutObj').addEventListener('click', e => { const b = e.target.closest('[data-replay]'); if (b) { e.stopPropagation(); tutReplay(b.dataset.replay); } });
    tutExplainSetup();
    $q('#tutMenu').addEventListener('click', () => { try { sessionStorage.setItem('realm-skip-intro', '1'); } catch (er) {} location.reload(); });
    $q('#tutStay').addEventListener('click', () => { $q('#tutEnd').hidden = true; });
  }
}
let tutObjKey = '';
function tutRender(full) {
  const T = S.tut; if (!T) return;
  const say = $q('#tutSay');
  const L = tutShown();
  if (L && !tutExplaining) {
    if (full) {
      say.hidden = false;
      $q('#tutSayT').textContent = tutLineText(L.lines[L.k]);
      $q('#tutSayN').textContent = (L === T.replay ? 'Replay · ' : '') + (L.lines.length > 1 ? (L.k + 1) + ' / ' + L.lines.length : '');
      $q('#tutBack').disabled = L.k <= 0;
    }
  } else if (!say.hidden) say.hidden = true;
  if (T.finalShown && !T.endShown) { T.endShown = true; $q('#tutEnd').hidden = false; }
  const key = T.objs.map(o => o.key + (T.done.includes(o.key) ? '+' : '')).join(',');
  if (key !== tutObjKey) {
    tutObjKey = key;
    const el = $q('#tutObj');
    el.hidden = !T.objs.length;
    el.innerHTML = '<h3>Objectives</h3><ul>' + T.objs.map(o => `<li class="${T.done.includes(o.key) ? 'done' : ''}"><span>${escHTML(o.text)}</span><button type="button" class="tut-play" data-replay="${o.key}" title="Replay the instructions" aria-label="Replay the instructions for: ${escHTML(o.text)}"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 1.5 L8.5 5 L2.5 8.5 Z"/></svg></button></li>`).join('') + '</ul>';
  }
}


// ---------- golden callouts: big glowing labels with arrows to parts of the interface ----------
// used by the Explain Interface toggle and by single lines of narration (a line { t, call: [...] })
// each callout: sel (element), label, side it points at (r, l, b, t), fx (where along that side, 0..1), dx/dy (label offset from that point)
const TUT_EXPLAIN = [
  { sel: '#armBtn', label: 'Armory', side: 'r', dx: 170, dy: 0 },
  { sel: '#res', label: 'Resources', side: 'b', fx: 0.25, dx: -60, dy: 150 },
  { sel: '#techBtn', label: 'Research', side: 'b', dx: 120, dy: 125 },
  { sel: '#roster', label: 'Outliner', side: 'l', dx: -190, dy: 30 },
  { sel: '#cmdGrid', label: 'Action Card', side: 'l', dx: -200, dy: -80 },
  { sel: '#prov', ghost: '#tutProvGhost', label: 'Province Menu', side: 'r', dx: 190, dy: -20 },
  { sel: '#mini .mini-togs', label: 'Minimap Toggles', side: 'r', dx: 240, dy: -40 },
  { sel: '#mini', label: 'Minimap', side: 'r', dx: 170, dy: 40 }
];
let tutExplaining = false, tutExplainWasPaused = false, tutCallKey = '';
const tutVisible = el => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 ? r : null; };
function tutCallouts() {
  const svg = $q('#tutCall'); if (!svg) return;
  let list = [];
  if (tutExplaining) {
    const provShown = !!tutVisible($q('#prov'));
    $q('#tutProvGhost').hidden = provShown;
    list = TUT_EXPLAIN.map(c => ({ ...c, el: c.ghost && !provShown ? $q(c.ghost) : $q(c.sel) }));
  } else {
    const L = tutShown(), line = L && L.lines[L.k];
    if (line && typeof line === 'object' && line.call) list = line.call.map(c => ({ ...c, el: $q(c.sel) }));
  }
  const W = innerWidth, H = innerHeight, items = [];
  for (const c of list) {
    const r = tutVisible(c.el); if (!r) continue;
    const fx = c.fx === undefined ? 0.5 : c.fx, fy = c.fy === undefined ? 0.5 : c.fy;
    const ax = c.side === 'r' ? r.right + 4 : c.side === 'l' ? r.left - 4 : r.left + r.width * fx;
    const ay = c.side === 'b' ? r.bottom + 4 : c.side === 't' ? r.top - 4 : r.top + r.height * fy;
    const fs = 30, w = c.label.length * fs * 0.62 + 16, h = fs + 12;
    const lx = Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, ax + c.dx)), ly = Math.max(h / 2 + 8, Math.min(H - h / 2 - 8, ay + c.dy));
    items.push({ ax, ay, lx, ly, w, h, fs, label: c.label });
  }
  const key = items.map(i => [i.ax, i.ay, i.lx, i.ly].map(Math.round).join(',') + i.label).join('|') + W + 'x' + H;
  if (key === tutCallKey) return;
  tutCallKey = key;
  if (items.length) svg.removeAttribute('hidden'); else svg.setAttribute('hidden', '');   // an <svg> has no .hidden property
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let out = '<defs><filter id="tutGlowF" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  for (const i of items) {
    // the arrow leaves the label's box on the line toward its target
    const vx = i.ax - i.lx, vy = i.ay - i.ly, len = Math.hypot(vx, vy) || 1, ux = vx / len, uy = vy / len;
    const t = Math.min(Math.abs(ux) > 1e-6 ? (i.w / 2 + 6) / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-6 ? (i.h / 2 + 6) / Math.abs(uy) : 1e9);
    const sx = i.lx + ux * t, sy = i.ly + uy * t, ex = i.ax - ux * 4, ey = i.ay - uy * 4;
    const hx = ex - ux * 22, hy = ey - uy * 22, px = -uy * 13, py = ux * 13;
    const line = `M${sx.toFixed(1)} ${sy.toFixed(1)} L${hx.toFixed(1)} ${hy.toFixed(1)}`, head = `M${ex.toFixed(1)} ${ey.toFixed(1)} L${(hx + px).toFixed(1)} ${(hy + py).toFixed(1)} L${(hx - px).toFixed(1)} ${(hy - py).toFixed(1)} Z`;
    if (t * 1 < len - 20) out += `<g class="tut-arrow" filter="url(#tutGlowF)"><path d="${line}" class="ta-o"/><path d="${head}" class="ta-ho"/><path d="${line}" class="ta-i"/><path d="${head}" class="ta-hi"/></g>`;
    out += `<text x="${i.lx.toFixed(1)}" y="${(i.ly + i.fs * 0.35).toFixed(1)}" class="tut-ctext" font-size="${i.fs}" filter="url(#tutGlowF)">${escHTML(i.label)}</text>`;
  }
  svg.innerHTML = out;
}
// the Explain Interface toggle: pauses the game and blocks every button, key and click on the map until it is turned off
function tutExplain(on) {
  if (on === tutExplaining) return;
  tutExplaining = on;
  sfx('ui_click');
  document.body.classList.toggle('tut-explain', on);
  $q('#tutBlock').hidden = !on;
  $q('#tutExplain').setAttribute('aria-pressed', on ? 'true' : 'false');
  if (on) { tutExplainWasPaused = S.paused; if (!S.paused) togglePause(); }
  else { $q('#tutProvGhost').hidden = true; if (!tutExplainWasPaused && S.paused) togglePause(); }
  tutCallKey = ''; tutCallouts(); tutRender(true);
}
function tutExplainSetup() {
  $q('#tutObj').insertAdjacentHTML('beforebegin', '<button type="button" class="tut-explain-btn chip" id="tutExplain" aria-pressed="false" title="Show what each part of the screen is (pauses the game)">Explain Interface</button>');
  document.body.insertAdjacentHTML('beforeend', '<div class="tut-block" id="tutBlock" hidden></div><div class="tut-ghost" id="tutProvGhost" hidden>Select a province to open its menu here</div><svg class="tut-call" id="tutCall" hidden aria-hidden="true"></svg>');
  $q('#tutExplain').addEventListener('click', e => { e.stopPropagation(); tutExplain(!tutExplaining); });
  $q('#tutExplain').addEventListener('pointerdown', e => e.stopPropagation());
  const block = $q('#tutBlock');
  for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'contextmenu', 'wheel', 'touchstart', 'touchmove'])
    block.addEventListener(ev, e => { e.stopPropagation(); if (ev !== 'pointermove' && ev !== 'mousemove' && e.cancelable) e.preventDefault(); }, { passive: false });
  // no keys reach the game while explaining; Esc turns it off
  window.addEventListener('keydown', e => {
    if (!tutExplaining) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (e.key === 'Escape') tutExplain(false);
  }, true);
  window.addEventListener('resize', () => { tutCallKey = ''; });
}

// ---------- starting it ----------
function startTutorial() {
  const btn = $q('#mTutBasic'); btn.disabled = true; btn.textContent = 'Building the realm…';
  setTimeout(() => {
    menuOpts.practice = false; menuOpts.start = 'center';
    world = scaleWorld(tutorialWorld()); world.mode = 'tutorial'; world.pickSeed = null; G = prep(world);
    provNames.length = 0; territory = null; cacheDirty = true; fogDirty = true; miniDirty = true;
    window.__realm.world = world; window.__realm.G = G;
    tutorialShore();
    S.explored = new Set(); S.visible = new Set(); S.sig = '';
    S.tutorial = true;
    S.tut = { next: 0, cur: null, finished: [], objs: [], done: [], allow: [], ended: false, banditsPlaced: false };
    applyRace('realm');
    setupGame();
    spawnAINations([], []);
    setupContent();
    setupV78();
    setupV96(false);
    // only what the diagram shows: no set pieces, treasure, ruins, travelers, monsters or bandit waves
    S.setpieces.clear(); S.finds = new Map(); S.treasureRolled = new Set(world.provinces.map((_, i) => i)); S.travelers = [];
    S.units = S.units.filter(u => u.owner !== RAIDERS);
    S.banditNext = Infinity;
    // a single Wayfinder and a Mason: no starting army
    S.units = S.units.filter(u => !(u.owner === ME && u.kind === 'army'));
    S.selected = [];
    // the bandits in their swamp
    const gang = spawnBandit(TP.bandits); gang.name = 'Swamp Bandits'; S.tut.banditsPlaced = true;
    for (const k of ['gold', 'wood', 'food']) S.stock[k] += 500;   // the tutorial starts with 500 more of each resource
    computeIncome(); computeFog();
    $q('#debug').hidden = true;
    S.started = true; S.last = 0; S.nextTick = 0;
    document.body.classList.remove('in-menu'); document.body.classList.add('tutorial');
    $q('#menu').hidden = true;
    home();
    if (!S.paused) togglePause();
    tutPanels(); tutRender(true);
  }, 30);
}

// ---------- the menu: a Tutorial button and its screen ----------
{
  const _ms = menuScreen;
  menuScreen = function (which) {
    const tut = which === 'tut';
    _ms(tut ? 'multi' : which);
    if (tut) { $q('#mMultiScreen').hidden = true; $q('#mTutScreen').hidden = false; setTimeout(() => $q('#mTutBasic').focus({ preventScroll: true }), 50); }
    else $q('#mTutScreen').hidden = true;
  };
}
$q('#mTut').addEventListener('click', () => { sfx('ui_click'); menuScreen('tut'); });
$q('#mTutBack').addEventListener('click', () => menuScreen('main'));
$q('#mTutBasic').addEventListener('click', () => { sfx('ui_click'); startTutorial(); });
$q('#menu').addEventListener('keydown', e => { if (e.key === 'Escape' && !$q('#mTutScreen').hidden) { e.stopPropagation(); menuScreen('main'); } });

// the step runs every frame, paused or not
{
  const _up = update;
  update = function (realT) { _up(realT); if (S.started && S.tutorial) { try { stepTutorial(); } catch (e) { reportError(e, 'tutorial'); } } };
}
window.__tut = { TUT_TRIGGERS, TP, tutorialWorld, startTutorial, stepTutorial, tutNext, tutBack, tutReplay, tutExplain, state: () => S.tut };
