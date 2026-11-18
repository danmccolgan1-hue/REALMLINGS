// ================= Battle Simulator (v102): two armies of any make-up, fought with the game's own battle rules =================
// Main menu → Tutorial → Battle Simulator (also in Settings). Each side picks a race and up to six unit types (weapon, off hand or
// shield, armor, mount, count); every unit is open, whatever has been researched. A fight runs the real round code:
// sideStrength (terrain, polearms vs cavalry, blunt vs plate, axe crits, back row at half) and applyDamage (armor, parry,
// front and back rows), every ROUND seconds, until one side is gone (or 10 minutes pass: a draw). It is fought many times
// to give odds, and one fight is charted. Nothing it does touches the game: its designs, owners and races are removed after.
const SIM_OWNERS = [901, 902], SIM_MAX_T = 600;
const SIM_TERRAINS = ['grassland', 'forest', 'swamp', 'desert'];
const SIM_RACE_NAME = { realm: 'Realmlings', swamp: 'Swamplings', wood: 'Woodlings' };
const simDefault = race => ({ n: 20, type: 'inf', weapon: race === 'swamp' ? 'handaxe' : race === 'wood' ? 'dirk' : 'shortsword', off: '', shield: '', armor: race === 'swamp' ? 'stag1' : race === 'wood' ? 'spirit1' : 'leather1', horse: 'riding', two: false });
let simCfg = (() => {
  try { const c = JSON.parse(localStorage.getItem('realm-sim') || 'null'); if (c && c.sides && c.sides.length === 2) return c; } catch (e) {}
  return { terrain: 'grassland', defender: 'none', runs: 200, sides: [{ race: 'realm', units: [simDefault('realm')] }, { race: 'realm', units: [{ ...simDefault('realm'), weapon: 'spear' }] }] };
})();
const simSave = () => { try { localStorage.setItem('realm-sim', JSON.stringify(simCfg)); } catch (e) {} };

// ---------- what each race may field ----------
const simWeapons = (race, type) => race === 'wood' && type === 'cav' ? CHAMP_WEAPONS.slice() : Object.keys(WEAPONS).filter(k => !WEAPONS[k].champ && raceIs(WEAPONS[k].race, race) && famsFor(race).includes(WEAPONS[k].fam));
const simArmors = (race, type) => { const types = race === 'wood' && type === 'cav' ? ['ornate'] : armorsFor(race); return Object.keys(ARMORS).filter(k => types.includes(ARMORS[k].type)); };
const simOffs = (race, w) => race === 'swamp' && WEAPONS[w] && !WEAPONS[w].twoH ? Object.keys(WEAPONS).filter(k => WEAPONS[k].race === 'swamp' && !WEAPONS[k].twoH) : [];
const simShields = (race, w) => !noShields(race) && WEAPONS[w] && !WEAPONS[w].twoH ? Object.keys(SHIELD_DEFS) : [];
// keep a unit's choices valid for its race and type
function simFix(u, race) {
  const ws = simWeapons(race, u.type); if (!ws.includes(u.weapon)) u.weapon = ws[0];
  const as = simArmors(race, u.type); if (!as.includes(u.armor)) u.armor = as.find(k => ARMORS[k].level === (ARMORS[u.armor] ? ARMORS[u.armor].level : 1)) || as[0];
  if (!simOffs(race, u.weapon).includes(u.off)) u.off = '';
  if (!simShields(race, u.weapon).includes(u.shield)) u.shield = '';
  if (u.type !== 'cav' || race === 'wood') u.horse = 'riding'; else if (!mountsFor(race)[u.horse]) u.horse = 'riding';
  if (!(race === 'wood' && u.type === 'inf' && !WEAPONS[u.weapon].twoH)) u.two = false;
  u.n = Math.max(1, Math.min(500, Math.round(+u.n || 1)));
  return u;
}
const simDesign = (u, race, id) => ({ id, name: id, type: u.type, weapon: u.weapon, off: u.off || null, shield: u.shield || null, armor: u.armor, horse: u.horse, race, two: !!u.two });
const unitWord = (race, type) => type === 'cav' ? (race === 'swamp' ? 'Ogres' : race === 'wood' ? 'Champions' : 'Cavalry') : (race === 'swamp' ? 'Berserkers' : race === 'wood' ? 'Protectors' : 'Infantry');

// ---------- one fight ----------
function simProv(terrain) {
  const i = world.provinces.findIndex(p => p.terrain === terrain);
  return i >= 0 ? { p: i, undo: () => {} } : (() => { const was = world.provinces[0].terrain; world.provinces[0].terrain = terrain; return { p: 0, undo: () => { world.provinces[0].terrain = was; } }; })();
}
// sets up the sim's designs and races, runs fn, then puts everything back
function simWith(fn) {
  const made = [], wasRace = SIM_OWNERS.map(o => RACE[o]), wasT = S.t, fx0 = S.fx.length, wasDS = {};
  const where = simProv(simCfg.terrain);
  try {
    simCfg.sides.forEach((s, i) => { RACE[SIM_OWNERS[i]] = s.race; s.units.forEach((u, j) => { const id = `sim-${i}-${j}`; wasDS[id] = DSTATS[id]; DSTATS[id] = designStats(simDesign(simFix(u, s.race), s.race, id)); made.push(id); }); });
    return fn(where.p);
  } finally {
    for (const id of made) { if (wasDS[id]) DSTATS[id] = wasDS[id]; else delete DSTATS[id]; }
    SIM_OWNERS.forEach((o, i) => { if (wasRace[i] === undefined) delete RACE[o]; else RACE[o] = wasRace[i]; });
    S.t = wasT; S.fx.length = Math.min(S.fx.length, fx0); where.undo();
  }
}
function simFight(prov, chart) {
  const armies = simCfg.sides.map((s, i) => {
    const a = { id: -1 - i, kind: 'army', owner: SIM_OWNERS[i], name: 'Side ' + 'AB'[i], prov, troops: {}, wounds: 0, rowJoin: [] };
    s.units.forEach((u, j) => { const id = `sim-${i}-${j}`; a.troops[id] = (a.troops[id] || 0) + u.n; a.rowJoin.push(id); });
    return a;
  });
  const b = { prov, t0: 0, next: 0, defender: simCfg.defender === 'A' ? SIM_OWNERS[0] : simCfg.defender === 'B' ? SIM_OWNERS[1] : -1, start: {}, lost: {}, hits: {} };
  for (const a of armies) a.battle = b;
  const [A, B] = armies, start = armies.map(a => ({ ...a.troops })), log = chart ? [[0, troopCount(A), troopCount(B)]] : null;
  let t = 0;
  while (troopCount(A) > 0 && troopCount(B) > 0 && t < SIM_MAX_T) {
    S.t = t;
    const mixA = sideMix([A]), mixB = sideMix([B]);
    const dA = sideStrength([A], prov, A.owner === b.defender, mixB) * DMG_RATE * (0.85 + Math.random() * 0.3);
    const dB = sideStrength([B], prov, B.owner === b.defender, mixA) * DMG_RATE * (0.85 + Math.random() * 0.3);
    applyDamage(b, [B], dA, t, mixA.pierce); applyDamage(b, [A], dB, t, mixB.pierce);
    t += ROUND;
    if (log) log.push([t, troopCount(A), troopCount(B)]);
  }
  const nA = troopCount(A), nB = troopCount(B);
  return { win: nA > 0 && nB <= 0 ? 0 : nB > 0 && nA <= 0 ? 1 : -1, t, left: armies.map(a => ({ ...a.troops })), start, log };
}
function simRun() {
  return simWith(prov => {
    const runs = Math.max(1, Math.min(2000, simCfg.runs | 0)), res = { runs, wins: [0, 0], draws: 0, t: 0, left: [{}, {}], sample: null };
    for (let r = 0; r < runs; r++) {
      const f = simFight(prov, r === 0);
      if (f.win >= 0) res.wins[f.win]++; else res.draws++;
      res.t += f.t;
      f.left.forEach((L, i) => { for (const k of Object.keys(f.start[i])) res.left[i][k] = (res.left[i][k] || 0) + (L[k] || 0); });
      if (r === 0) res.sample = f;
    }
    res.t /= runs;
    for (const L of res.left) for (const k in L) L[k] /= runs;
    // each unit's stats, for the cards
    res.stats = simCfg.sides.map((s, i) => s.units.map((u, j) => DSTATS[`sim-${i}-${j}`]));
    return res;
  });
}

// ---------- the panel ----------
document.head.insertAdjacentHTML('beforeend', `<style>
.bsim { position: fixed; inset: 0; z-index: 9000; background: rgba(20, 16, 26, 0.72); display: flex; align-items: flex-start; justify-content: center; overflow: auto; padding: 24px 12px; }
.bsim[hidden] { display: none; }
.bsim-card { background: var(--chip); border: 3px solid var(--ink); border-radius: 16px; box-shadow: 0 6px 0 var(--ink); width: min(1180px, 100%); padding: 16px 18px 18px; font: 14px Georgia, serif; color: var(--ink); }
.bsim-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.bsim-head h2 { font: 800 26px var(--font-ui); margin: 0; flex: 1; }
.bsim-top { display: flex; flex-wrap: wrap; gap: 14px 22px; align-items: center; padding: 8px 10px; background: var(--chip-hi); border: 2px solid var(--ink); border-radius: 10px; margin-bottom: 12px; }
.bsim-top label { font: 800 12px var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; display: flex; gap: 8px; align-items: center; }
.bsim select, .bsim input[type=number] { font: 14px Georgia, serif; border: 2px solid var(--ink); border-radius: 7px; background: #fffaf0; padding: 2px 4px; color: var(--ink); }
.bsim input[type=number] { width: 64px; }
.bsim-sides { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.bsim-side { border: 3px solid var(--ink); border-radius: 12px; padding: 10px; background: #f7ead0; }
.bsim-side.A { box-shadow: inset 0 6px 0 #2f6fd0; } .bsim-side.B { box-shadow: inset 0 6px 0 #c7362b; }
.bsim-side h3 { font: 800 18px var(--font-ui); margin: 4px 0 8px; display: flex; align-items: center; gap: 10px; }
.bsim-side h3 select { margin-left: auto; }
.bsim-unit { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; padding: 6px; border: 2px solid rgba(29,26,34,0.25); border-radius: 9px; background: #fffaf0; margin-bottom: 6px; }
.bsim-unit select { flex: 1 1 128px; min-width: 0; font-size: 13px; }
.bsim-unit > span:empty { display: none; }
.bsim-unit input[type=number] { flex: 0 0 58px; }
.bsim-x { flex: 0 0 26px; }
.bsim-unit .st { flex: 1 1 100%; font-size: 12px; color: #4a4250; }
.bsim-unit .st b { color: var(--ink); }
.bsim-x { border: 2px solid var(--ink); border-radius: 7px; background: #f3d3cc; cursor: pointer; font-weight: 800; padding: 0; height: 26px; }
.bsim-add { width: 100%; }
.bsim-go { display: block; margin: 14px auto 0; font: 800 20px var(--font-ui); padding: 8px 46px; background: #4a9be8; color: #fff; border: 3px solid var(--ink); border-radius: 12px; box-shadow: 0 4px 0 var(--ink); cursor: pointer; }
.bsim-go:active { transform: translateY(2px); box-shadow: 0 2px 0 var(--ink); }
.bsim-res { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.bsim-res[hidden] { display: none; }
.bsim-box { border: 2px solid var(--ink); border-radius: 10px; background: var(--chip-hi); padding: 10px 12px; }
.bsim-box h4 { font: 800 14px var(--font-ui); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px; }
.bsim-bar { display: flex; height: 26px; border: 2px solid var(--ink); border-radius: 8px; overflow: hidden; font: 800 13px Georgia, serif; color: #fff; }
.bsim-bar span { display: flex; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden; }
.bsim-tbl { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
.bsim-tbl td, .bsim-tbl th { padding: 3px 6px; border-bottom: 1px solid rgba(29,26,34,0.15); text-align: right; }
.bsim-tbl td:first-child, .bsim-tbl th:first-child { text-align: left; }
.bsim-note { font-size: 12px; color: #4a4250; margin-top: 8px; }
@media (max-width: 860px) { .bsim-sides, .bsim-res { grid-template-columns: 1fr; } }
</style>`);
document.body.insertAdjacentHTML('beforeend', `<div class="bsim" id="bsim" role="dialog" aria-modal="true" aria-labelledby="bsimT" hidden><div class="bsim-card">
<div class="bsim-head"><h2 id="bsimT">Battle Simulator</h2><button type="button" class="pm-x" id="bsimX" aria-label="Close the Battle Simulator" title="Close (Esc)">✕</button></div>
<div class="bsim-top" id="bsimTop"></div>
<div class="bsim-sides" id="bsimSides"></div>
<button type="button" class="bsim-go" id="bsimGo">Fight!</button>
<div class="bsim-res" id="bsimRes" hidden></div>
</div></div>`);
const optList = (keys, cur, label) => keys.map(k => `<option value="${k}"${k === cur ? ' selected' : ''}>${label(k)}</option>`).join('');
function simUnitHTML(s, i, u, j) {
  const race = s.race, W = WEAPONS[u.weapon], offs = simOffs(race, u.weapon), shs = simShields(race, u.weapon), wood = race === 'wood';
  const types = `<select data-k="type" aria-label="Unit type">${optList(['inf', 'cav'], u.type, t => unitWord(race, t))}</select>`;
  const weapon = `<select data-k="weapon" aria-label="Weapon">${optList(simWeapons(race, u.type), u.weapon, k => `${WEAPONS[k].name} (${WEAPONS[k].atk}${WEAPONS[k].twoH ? ', 2H' : ''})`)}</select>`;
  const second = offs.length ? `<select data-k="off" aria-label="Off hand">${optList(['', ...offs], u.off, k => k ? 'Off: ' + WEAPONS[k].name : 'No off-hand')}</select>`
    : shs.length ? `<select data-k="shield" aria-label="Shield">${optList(['', ...shs], u.shield, k => k ? SHIELD_DEFS[k].name + ' (+' + SHIELD_DEFS[k].armor + ')' : 'No shield')}</select>`
    : wood && u.type === 'inf' && !W.twoH ? `<select data-k="two" aria-label="Grip">${optList(['', '1'], u.two ? '1' : '', k => k ? 'Two-handed grip' : 'One-handed')}</select>` : '<span></span>';
  const armor = `<select data-k="armor" aria-label="Armor">${optList(simArmors(race, u.type), u.armor, k => `${ARMORS[k].name} (${+ARMORS[k].armor.toFixed(1)})`)}</select>`;
  const mount = u.type === 'cav' && !wood ? `<select data-k="horse" aria-label="Mount">${optList(Object.keys(mountsFor(race)), u.horse, k => mountsFor(race)[k].name)}</select>` : '<span></span>';
  return `<div class="bsim-unit" data-s="${i}" data-u="${j}"><input type="number" min="1" max="500" value="${u.n}" data-k="n" aria-label="How many">${types}${weapon}${second}${armor}${mount}<button type="button" class="bsim-x" data-act="del" aria-label="Remove this unit" title="Remove">✕</button><div class="st" data-stat="${i}-${j}"></div></div>`;
}
function simStatLine(st) {
  if (!st) return '';
  const fam = FAMILY[st.fam] ? FAMILY[st.fam].name : st.fam;
  const extra = [st.fam === 'pole' && '+50% vs cavalry', st.fam === 'blunt' && 'ignores half of armor, +50% vs plate', st.parry && 'parries 10%', st.crit && '10% double blows', st.plate && 'plate', st.rough && 'no forest/swamp penalty', st.two && 'heavy blows every other round'].filter(Boolean).join(' · ');
  return `Attack <b>${st.atk}</b> · Health <b>${Math.round(st.hp)}</b> · Armor <b>${+st.armor.toFixed(1)}</b> (blocks ${Math.round(st.red * 100)}%) · ${fam}${extra ? ' · ' + extra : ''} · <b>${st.cost.gold || 0}</b> gold${st.cost.wood ? ', ' + st.cost.wood + ' wood' : ''}`;
}
function simRender() {
  $q('#bsimTop').innerHTML = `<label>Terrain <select id="bsimTer">${optList(SIM_TERRAINS, simCfg.terrain, k => TER[k] ? TER[k].label : k)}</select></label>
    <small style="flex:1;min-width:200px">${TERRAIN_MOD[simCfg.terrain].note}</small>
    <label>Defender <select id="bsimDef">${optList(['none', 'A', 'B'], simCfg.defender, k => k === 'none' ? 'Neither' : 'Side ' + k)}</select></label>
    <label>Fights <select id="bsimRuns">${optList(['1', '50', '200', '1000'], String(simCfg.runs), k => k)}</select></label>`;
  $q('#bsimSides').innerHTML = simCfg.sides.map((s, i) => `<div class="bsim-side ${'AB'[i]}"><h3>Side ${'AB'[i]} <small>${s.units.reduce((n, u) => n + u.n, 0)} soldiers</small><select data-race="${i}" aria-label="Side ${'AB'[i]} race">${optList(['realm', 'swamp', 'wood'], s.race, k => SIM_RACE_NAME[k])}</select></h3>
    ${s.units.map((u, j) => simUnitHTML(s, i, u, j)).join('')}
    ${s.units.length < 6 ? `<button type="button" class="menu-btn bsim-add" data-add="${i}">+ Add a unit type</button>` : ''}</div>`).join('');
  // the stat lines, from the game's own design math
  simWith(() => simCfg.sides.forEach((s, i) => s.units.forEach((u, j) => { const el = $q(`[data-stat="${i}-${j}"]`); if (el) el.innerHTML = simStatLine(DSTATS[`sim-${i}-${j}`]); })));
}
function simResults(res) {
  const pct = n => Math.round(n / res.runs * 1000) / 10, [wa, wb] = res.wins;
  const name = (i, j) => { const u = simCfg.sides[i].units[j]; return `${u.n} × ${WEAPONS[u.weapon].name}${u.off ? ' + ' + WEAPONS[u.off].name : ''}${u.shield ? ' + ' + SHIELD_DEFS[u.shield].name : ''}, ${ARMORS[u.armor].name}${u.type === 'cav' ? ' (' + unitWord(simCfg.sides[i].race, 'cav').replace(/s$/, '') + ')' : ''}`; };
  const cost = i => simCfg.sides[i].units.reduce((n, u, j) => n + u.n * ((res.stats[i][j].cost.gold || 0) + (res.stats[i][j].cost.wood || 0)), 0);
  const rows = i => simCfg.sides[i].units.map((u, j) => { const left = res.left[i][`sim-${i}-${j}`] || 0; return `<tr><td>${name(i, j)}</td><td>${u.n}</td><td>${left.toFixed(1)}</td><td>${Math.round((1 - left / u.n) * 100)}%</td></tr>`; }).join('');
  // one fight, charted: soldiers left on each side over time
  const L = res.sample.log, T = Math.max(L[L.length - 1][0], 1), N = Math.max(...L.map(r => Math.max(r[1], r[2])), 1), Wd = 1100, Ht = 220, px = x => 34 + x / T * (Wd - 44), py = y => 10 + (1 - y / N) * (Ht - 34);
  const line = (k, col) => `<polyline fill="none" stroke="${col}" stroke-width="3" points="${L.map(r => px(r[0]).toFixed(1) + ',' + py(r[k]).toFixed(1)).join(' ')}"/>`;
  const svg = `<svg viewBox="0 0 ${Wd} ${Ht}" width="100%" role="img" aria-label="Soldiers left on each side during one fight"><line x1="34" y1="${py(0)}" x2="${Wd - 10}" y2="${py(0)}" stroke="#1d1a22"/><line x1="34" y1="10" x2="34" y2="${py(0)}" stroke="#1d1a22"/>
    <text x="30" y="14" text-anchor="end" font-size="11">${N}</text><text x="30" y="${py(0)}" text-anchor="end" font-size="11">0</text><text x="${Wd - 10}" y="${Ht - 6}" text-anchor="end" font-size="11">${T.toFixed(1)} s</text><text x="34" y="${Ht - 6}" font-size="11">0 s</text>
    ${line(1, '#2f6fd0')}${line(2, '#c7362b')}</svg>`;
  const s = res.sample, sw = s.win === 0 ? 'Side A won' : s.win === 1 ? 'Side B won' : 'a draw';
  $q('#bsimRes').innerHTML = `<div class="bsim-box" style="grid-column:1/-1"><h4>Result of ${res.runs} fight${res.runs > 1 ? 's' : ''}</h4>
      <div class="bsim-bar">${wa ? `<span style="width:${pct(wa)}%;background:#2f6fd0">A ${pct(wa)}%</span>` : ''}${res.draws ? `<span style="width:${pct(res.draws)}%;background:#7a7480">Draw ${pct(res.draws)}%</span>` : ''}${wb ? `<span style="width:${pct(wb)}%;background:#c7362b">B ${pct(wb)}%</span>` : ''}</div>
      <div class="bsim-note">Average fight: ${res.t.toFixed(1)} s (${Math.round(res.t / ROUND)} rounds). Gear and base cost: Side A ${cost(0)}, Side B ${cost(1)} (gold and wood).</div></div>
    ${[0, 1].map(i => `<div class="bsim-box"><h4 style="color:${i ? '#c7362b' : '#2f6fd0'}">Side ${'AB'[i]} (${SIM_RACE_NAME[simCfg.sides[i].race]})</h4><table class="bsim-tbl"><tr><th>Unit</th><th>Start</th><th>Left (avg)</th><th>Lost</th></tr>${rows(i)}</table></div>`).join('')}
    <div class="bsim-box" style="grid-column:1/-1"><h4>One of the fights (${sw} after ${s.t.toFixed(1)} s)</h4>${svg}
      <div class="bsim-note">Blue: Side A, red: Side B. Every unit is available here whatever you have researched. Armies of 6 or more fight in two rows: the unit types listed first fill the front row. Magic, artifacts and research bonuses are left out.</div></div>`;
  $q('#bsimRes').hidden = false;
}
function openSim(open = true) { $q('#bsim').hidden = !open; if (open) { simRender(); $q('#bsimRes').hidden = true; } }
$q('#bsimX').addEventListener('click', () => { sfx('ui_click'); openSim(false); });
$q('#bsim').addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); openSim(false); } });
$q('#bsim').addEventListener('click', e => { if (e.target.id === 'bsim') openSim(false); });
$q('#bsim').addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'bsimTer') simCfg.terrain = el.value;
  else if (el.id === 'bsimDef') simCfg.defender = el.value;
  else if (el.id === 'bsimRuns') simCfg.runs = +el.value;
  else if (el.dataset.race !== undefined) { const s = simCfg.sides[+el.dataset.race]; s.race = el.value; s.units.forEach(u => simFix(u, s.race)); }
  else if (el.dataset.k) {
    const row = el.closest('.bsim-unit'), s = simCfg.sides[+row.dataset.s], u = s.units[+row.dataset.u], k = el.dataset.k;
    u[k] = k === 'n' ? +el.value : k === 'two' ? !!el.value : el.value;
    simFix(u, s.race);
  }
  simSave(); simRender(); $q('#bsimRes').hidden = true;
});
$q('#bsim').addEventListener('click', e => {
  const add = e.target.closest('[data-add]'), del = e.target.closest('[data-act="del"]');
  if (add) { const s = simCfg.sides[+add.dataset.add]; s.units.push(simFix(simDefault(s.race), s.race)); }
  else if (del) { const row = del.closest('.bsim-unit'), s = simCfg.sides[+row.dataset.s]; if (s.units.length > 1) s.units.splice(+row.dataset.u, 1); }
  else return;
  sfx('ui_click'); simSave(); simRender(); $q('#bsimRes').hidden = true;
});
$q('#bsimGo').addEventListener('click', () => {
  sfx('ui_click');
  const go = $q('#bsimGo'); go.disabled = true; go.textContent = 'Fighting…';
  setTimeout(() => { try { simResults(simRun()); } catch (er) { reportError(er, 'battle simulator'); toast('The simulator ran into a problem: ' + er.message, true); } go.disabled = false; go.textContent = 'Fight!'; }, 30);
});
// the way in: the main menu, and Settings
{
  const tut = $q('#mTutCombat');   // in the Tutorial menu, under the tutorials
  if (tut) { tut.insertAdjacentHTML('afterend', '<button type="button" class="menu-start" id="mSim">Battle Simulator<small>Pit two armies of your design against each other</small></button>'); $q('#mSim').addEventListener('click', () => { sfx('ui_click'); openSim(true); }); }
  // (v105: no longer in the in-game Settings)
}
window.__sim = { simRun, simCfg: () => simCfg, setCfg: c => { simCfg = c; }, openSim };
