
// ================= Save / Continue (v89) =================
// One save slot in this browser (localStorage), written by Save in Settings and by an autosave every 5 minutes of play.
// Continue on the main menu loads it. Export / Import move a save as a file (to another computer, or to send with a bug report).
// The map itself isn't stored: it is rebuilt from its seed, then everything that happened since is laid back on top.
const GAME_VERSION = 'v101', SAVE_FORMAT = 1, SAVE_KEY = 'realm-save', AUTOSAVE_EVERY = 300;
// every soldier design ever made (yours and the computer nations'), so troops of older designs still work after loading
const ALL_DESIGNS = new Map();
const _registerDesign = registerDesign;
registerDesign = function (d) { ALL_DESIGNS.set(d.id, { ...d }); return _registerDesign(d); };

// ---- a JSON form for the game's object graph: Maps, Sets, shared objects and loops survive the trip ----
function saveExternals() {
  // the map's own objects are rebuilt from the seed, so references to them are stored by name
  const ext = new Map();
  for (const [nm, root] of [['world', world], ['G', G]]) {
    ext.set(root, nm);
    for (const k of Object.keys(root)) {
      const v = root[k]; if (k === 'crossings' || !Array.isArray(v)) continue;
      ext.set(v, nm + '.' + k);
      v.forEach((el, i) => { if (el && typeof el === 'object') ext.set(el, nm + '.' + k + '.' + i); });
    }
  }
  return ext;
}
function resolveExternal(path) { const [nm, k, i] = path.split('.'); const root = nm === 'world' ? world : G; return k === undefined ? root : i === undefined ? root[k] : root[k][+i]; }
function packGraph(root) {
  const ext = saveExternals(), ids = new Map();
  const enc = v => {
    if (v === undefined) return { $u: 1 };
    if (typeof v === 'function' || typeof v === 'symbol') return { $u: 1 };
    if (typeof v === 'number') return isFinite(v) ? v : { $n: String(v) };
    if (v === null || typeof v !== 'object') return v;
    if (ext.has(v)) return { $x: ext.get(v) };
    if (ids.has(v)) return { $r: ids.get(v) };
    if (ArrayBuffer.isView(v)) return { $t: v.constructor.name, v: Array.from(v) };
    const proto = Object.getPrototypeOf(v), id = ids.size;
    if (Array.isArray(v)) { ids.set(v, id); return { $a: id, v: v.map(enc) }; }
    if (v instanceof Map) { ids.set(v, id); return { $m: id, v: [...v].map(([k, x]) => [enc(k), enc(x)]) }; }
    if (v instanceof Set) { ids.set(v, id); return { $s: id, v: [...v].map(enc) }; }
    if (proto !== Object.prototype && proto !== null) return null;   // pictures, canvases and the like are rebuilt, not saved
    ids.set(v, id); const o = {}; for (const k of Object.keys(v)) o[k] = enc(v[k]); return { $o: id, v: o };
  };
  return enc(root);
}
function unpackGraph(data) {
  const ids = [];
  const dec = v => {
    if (v === null || typeof v !== 'object') return v;
    if (v.$u) return undefined;
    if (v.$n !== undefined) return Number(v.$n);
    if (v.$x !== undefined) return resolveExternal(v.$x);
    if (v.$r !== undefined) return ids[v.$r];
    if (v.$t !== undefined) return new (window[v.$t] || Array)(v.v);
    if (v.$a !== undefined) { const a = []; ids[v.$a] = a; for (const x of v.v) a.push(dec(x)); return a; }
    if (v.$m !== undefined) { const m = new Map(); ids[v.$m] = m; for (const [k, x] of v.v) m.set(dec(k), dec(x)); return m; }
    if (v.$s !== undefined) { const s = new Set(); ids[v.$s] = s; for (const x of v.v) s.add(dec(x)); return s; }
    if (v.$o !== undefined) { const o = {}; ids[v.$o] = o; for (const k of Object.keys(v.v)) o[k] = dec(v.v[k]); return o; }
    return v;
  };
  return dec(data);
}

// ---- writing a save ----
function makeSave() {
  return {
    format: SAVE_FORMAT, version: GAME_VERSION, savedAt: Date.now(),
    seed: world.pickSeed, mode: world.mode || 'normal', race: raceOf(ME), nation: PLAYERS[ME] ? PLAYERS[ME].name : NATION.name, t: S.t,
    graph: packGraph({
      S, NATIONS, PLAYERS, RACE, NATION, yields, usedNames: [...usedNames], designs: [...ALL_DESIGNS.values()],
      counters: { armyCounter, banditCount, monsterCount, raidCount, designSeq, allyEndSeq },
      edges: world.edges.map(e => [e.open ? 1 : 0, e.style]), crossings: G.crossings, terrain: G.provs.map(p => p.terrain),
      cam: { x: cam.x, y: cam.y, z: cam.z }
    })
  };
}
const saveText = () => JSON.stringify(makeSave());
function readSlot() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function saveGame(quiet) {
  if (!S.started || S.fallen) { if (!quiet) toast('There is no game to save.', true); return false; }
  try { localStorage.setItem(SAVE_KEY, saveText()); }
  catch (e) { reportError(e, 'save'); if (!quiet) toast('The game could not be saved: this browser refused to store it (it may be full or in private mode). Try Export instead.', true); return false; }
  S.lastSave = S.t; renderSaveInfo();
  toast(quiet ? 'Autosaved.' : 'Game saved. Continue on the main menu picks it up again.');
  return true;
}
const playTime = t => { const m = Math.floor(t / 60), h = Math.floor(m / 60); return h ? `${h}:${String(m % 60).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}` : `${m}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
const whenText = ms => new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const saveSummary = d => `${d.nation || 'Your realm'} · ${playTime(d.t || 0)} played · saved ${whenText(d.savedAt)}${d.version !== GAME_VERSION ? ` (in ${d.version})` : ''}`;
function renderSaveInfo() {
  const d = readSlot(), el = $q('#stSaveInfo'); if (el) el.textContent = d ? 'Saved: ' + saveSummary(d) : 'Nothing saved yet. The game also autosaves every 5 minutes.';
  const b = $q('#mCont'); if (b) { b.hidden = !d; const i = $q('#mContInfo'); if (i && d) i.textContent = saveSummary(d); }
}
function exportSave() {
  if (!S.started) return toast('Start or continue a game first.', true);
  const txt = saveText(), name = `realmlings-${(PLAYERS[ME].name || 'realm').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${playTime(S.t).replace(/:/g, '-')}.realmsave`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(`Exported ${name}. Load it with Import, on this computer or another.`);
}
// autosave: every 5 minutes of play, into the same slot
function autosave(t) { if (S.started && !S.fallen && !S.paused && t - (S.lastSave || 0) >= AUTOSAVE_EVERY) saveGame(true); }
const _stepGPCsave = stepGPC;
stepGPC = function (t, dt) { _stepGPCsave(t, dt); try { autosave(t); } catch (e) { reportError(e, 'autosave'); } };

// ---- loading ----
function checkSave(d) {
  if (!d || typeof d !== 'object' || !d.graph || !d.seed) return 'That file is not a Realmlings save.';
  if (d.format !== SAVE_FORMAT) return `That save (from ${d.version || 'an older version'}) is in a save format this version (${GAME_VERSION}) can’t read.`;
  return null;
}
// build the island from its seed the same way a new game does, then lay the saved game over it
function loadSave(d) {
  const bad = checkSave(d); if (bad) { toast(bad, true); return false; }
  const R = unpackGraphLater(d);
  menuOpts.race = d.race; menuOpts.practice = d.mode === 'practice';
  if (d.seed !== world.pickSeed || d.mode !== (world.mode || 'normal')) regenerate(d.seed, d.mode === 'practice');
  S.explored = new Set(); S.visible = new Set(); S.sig = '';
  applyRace(d.race); setupGame(); spawnAINations([], []); setupContent(); setupV78();
  const g = R();
  // the map's changes: walls, gates, opened paths, the crossings drawn on them, a start province turned to home land
  g.edges.forEach(([open, style], i) => { const e = world.edges[i]; if (!e) return; e.open = !!open; e.style = style; });
  g.terrain.forEach((t, i) => { if (G.provs[i]) G.provs[i].terrain = t; });
  G.crossings = g.crossings;
  openNbr = world.provinces.map(() => []);
  world.edges.forEach(e => { if (!e.open) return; const a = world.vertices[e.v[0]], b = world.vertices[e.v[1]], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; openNbr[e.a].push({ q: e.b, m }); openNbr[e.b].push({ q: e.a, m }); });
  // the game itself
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, g.S);
  for (const k of Object.keys(NATIONS)) delete NATIONS[k]; Object.assign(NATIONS, g.NATIONS);
  for (const k of Object.keys(PLAYERS)) delete PLAYERS[k]; Object.assign(PLAYERS, g.PLAYERS);
  for (const k of Object.keys(RACE)) delete RACE[k]; Object.assign(RACE, g.RACE);
  Object.assign(NATION, g.NATION);
  yields = g.yields; usedNames.clear(); for (const n of g.usedNames) usedNames.add(n);
  for (const des of g.designs) registerDesign(des);
  ({ armyCounter, banditCount, monsterCount, raidCount, designSeq, allyEndSeq } = g.counters);
  // everything drawn or worked out from the state is rebuilt
  metBy.clear(); metQueue.length = 0; findQueue.length = 0; flagDismissed.clear(); navCache.clear();
  territory = null; repVer++; wallsVer++; townSig = ''; realmSig = ''; roadFolk.clear(); hoverPath = undefined; camTween = null;
  cmdKey = ''; rosterKey = ''; capPanelKey = ''; techKey = ''; techBtnKey = ''; armKey = ''; provKey = ''; barKey = ''; flagKey = ''; dipKey = ''; selKey = '';
  setupCapitalPanel(); registerMage(); setupV96(true); computeIncome(); S.sig = ''; computeFog();
  { const cap = S.capital; if (cap >= 0) { const near = fitView(boxOf([cap, ...allNbr[cap]]), 0.95); f4Z = clampZ(near.z / 2); } }
  cacheDirty = true; fogDirty = true; miniDirty = true;
  S.started = true; S.last = 0; S.paused = false; S.lastSave = S.t;
  document.body.classList.remove('in-menu'); $q('#menu').hidden = true;
  cam.x = g.cam.x; cam.y = g.cam.y; cam.z = g.cam.z; clampCam();
  racesSave();
  togglePause();   // a loaded game starts paused, like a new one
  toast(`Welcome back to ${PLAYERS[ME].name}: ${playTime(S.t)} played on “${d.seed}”. The game is paused: press Space to go on.` + (d.version !== GAME_VERSION ? ` (This save was made in ${d.version}; if anything looks wrong, start a new game.)` : ''));
  return true;
}
const unpackGraphLater = d => () => unpackGraph(d.graph);   // unpacked after the island is rebuilt, so map references point at the new map
// loading from the menu goes straight in; loading in the middle of a game reloads the page first for a clean start
function loadFromText(txt) {
  let d; try { d = JSON.parse(txt); } catch (e) { return toast('That file is not a Realmlings save.', true); }
  const bad = checkSave(d); if (bad) return toast(bad, true);
  if (S.started) { try { sessionStorage.setItem('realm-load', txt); sessionStorage.setItem('realm-skip-intro', '1'); } catch (e) { return toast('This browser could not hold the save while reloading.', true); } location.reload(); return; }
  tryLoad(d);
}
function tryLoad(d) {
  try { return loadSave(d); }
  catch (e) {
    reportError(e, 'load');
    try { sessionStorage.setItem('realm-msg', 'That save could not be loaded (' + (e && e.message || e) + '). Start a new game, or send the save file along with a bug report.'); sessionStorage.setItem('realm-skip-intro', '1'); } catch (er) {}
    location.reload(); return false;
  }
}

// ---- buttons ----
$q('#mCont').addEventListener('click', () => { const d = readSlot(); if (!d) return renderSaveInfo(); sfx('ui_click'); const b = $q('#mCont'); b.disabled = true; setTimeout(() => { tryLoad(d); b.disabled = false; }, 30); });
$q('#mImport').addEventListener('click', () => $q('#saveFile').click());
$q('#stSave').addEventListener('click', e => { e.stopPropagation(); sfx('ui_click'); saveGame(false); });
$q('#stExport').addEventListener('click', e => { e.stopPropagation(); sfx('ui_click'); exportSave(); });
$q('#stImport').addEventListener('click', e => { e.stopPropagation(); $q('#saveFile').click(); });
$q('#saveFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; f.text().then(loadFromText, () => toast('That file could not be read.', true)); });
const _openSettingsSave = openSettings;
openSettings = function () { renderSaveInfo(); return _openSettingsSave(); };
$q('#mVer').textContent = GAME_VERSION;
renderSaveInfo();
// a save picked in the middle of a game, or a message from a load that failed, waits here across the page reload
setTimeout(() => {
  let txt = null, msg = null; try { txt = sessionStorage.getItem('realm-load'); msg = sessionStorage.getItem('realm-msg'); sessionStorage.removeItem('realm-load'); sessionStorage.removeItem('realm-msg'); } catch (e) {}
  if (msg) toast(msg, true);
  if (txt) { try { tryLoad(JSON.parse(txt)); } catch (e) { toast('That save could not be read.', true); } }
}, 60);
window.__save = { makeSave, saveGame, loadSave, packGraph, unpackGraph, readSlot, ALL_DESIGNS };
