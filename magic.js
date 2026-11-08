
// ================= magic: Mages, schools and spells =================
// A Mage is trained at a Mage Tower. He walks on his own and casts from where he stands, or joins an army and
// fights in it (his staff or wand sets his attack), powering its battle spells. Every spell's numbers are placeholders.
const MAGE = 'mage:A';
UNIT_DEFS[MAGE] = { name: 'Mage', cost: { gold: 300 }, upkeep: { food: 2 }, blurb: 'Casts the spells of your school. Joins an army to fight in it and power its battle spells.' };
UNIT_SPEED[MAGE] = 0.8;
const MAGE_WEAPONS = {
  stave:         { name: 'Stave',          line: 'stave', atk: 4, twoH: true,  tech: null },
  grandstave:    { name: 'Grand Stave',    line: 'stave', atk: 6, twoH: true,  tech: 'grandstave' },
  mythicstave:   { name: 'Mythic Stave',   line: 'stave', atk: 9, twoH: true,  tech: 'mythicstave' },
  wand:          { name: 'Wand',           line: 'wand',  atk: 2, twoH: false, tech: null },
  crypticwand:   { name: 'Cryptic Wand',   line: 'wand',  atk: 3, twoH: false, tech: 'crypticwand' },
  enigmaticwand: { name: 'Enigmatic Wand', line: 'wand',  atk: 5, twoH: false, tech: 'enigmaticwand' }
};
S.mageGear = { weapon: 'stave', shield: null };
function mageStats(gear) {
  const W = MAGE_WEAPONS[gear.weapon], Sh = gear.shield && !W.twoH ? SHIELD_DEFS[gear.shield] : null, armor = 1 + (Sh ? Sh.armor : 0);
  return { cav: false, rough: false, fam: 'magic', line: W.line, atk: W.atk, hp: 25, armor, shieldArmor: Sh ? Sh.armor : 0, red: armor / (armor + ARMOR_K), parry: 0, speed: 0.8 * (Sh ? Sh.speed : 1), cost: UNIT_DEFS[MAGE].cost, upkeep: UNIT_DEFS[MAGE].upkeep, blurb: `${W.name}${Sh ? ' and ' + Sh.name : ''}.` };
}
function mageSpec(gear) { const W = MAGE_WEAPONS[gear.weapon]; return { ...RealmIso.UNITS[MAGE].spec, right: gear.weapon === 'stave' ? 'stave' : gear.weapon, left: !W.twoH && gear.shield ? gear.shield : null }; }
const MAGE_SPEC0 = { ...RealmIso.UNITS[MAGE].spec };
function registerMage() {
  DSTATS[MAGE] = mageStats(S.mageGear); UNIT_SPEED[MAGE] = DSTATS[MAGE].speed;
  RealmIso.UNITS[MAGE].spec = { ...MAGE_SPEC0, ...mageSpec(S.mageGear) };
  delete portraitURL[MAGE];
}
registerMage();

// ---------- schools and spells ----------
const SCHOOLS = {
  life:   { name: 'Herbomancy', color: '#3f9b4b', light: '#e3f6e0', blurb: 'Harvests, protective skins, healing, and paths through the forest.', spells: ['Harvest', 'Hardened Skin', 'Mending', 'Speak with the Forest'] },
  death:  { name: 'Necromancy', color: '#6b3fa0', light: '#efe6fb', blurb: 'Cursed weapons, the risen dead, tunnels under mountains, and grave riches.', spells: ['Cursed Weapons', 'Risen Dead', 'Underworld Passage', 'Grave Robbing'] },
  arcane: { name: 'Arcane', color: '#2f6fe0', light: '#e3ecff', blurb: 'Far-seeing towers, reading minds, trading across worlds, traps and rifts.', spells: ['Arcane Scouts', 'Clear Thoughts', 'Interdimensional Trading', 'Stasis Trap', 'Teleportation Rift'] }
};
// each spell family's research line, lowest first; its tier is how many of them you know
const LINES = {
  harvest: ['harvest', 'bountiful', 'magnificent'], skin: ['skin', 'stoneskin', 'diamondskin'], mending: ['mending', 'rejuvenation', 'restoration'], forest: ['forest', 'commune', 'arboreal'],
  curse: ['curse1', 'curse2', 'curse3'], tunnel: ['underworld', 'hallways', 'sealed'], risen: ['risen', 'necro', 'armyofdeath'], graverob: ['graverob', 'deathtax', 'charon'],
  scouts: ['arcscouts', 'arcvision'], mind: ['clearthoughts', 'mindread'], trading: ['trading', 'stockmarket', 'planar'], stasis: ['stasis', 'prison'], rift: ['rift', 'portal']
};
const lvl = line => LINES[line].filter(hasTech).length;
const lineTech = line => LINES[line][Math.max(0, lvl(line) - 1)];
S.cd = {};                 // nationwide cooldowns: spell -> game time when ready again
S.paths = {};              // edge index -> 'forest' | 'tunnel' for borders opened by magic
S.trap = null; S.rift = null; S.harvest = null; S.detect = null;
// Harvest is a continuous cast: while a Mage keeps it up, every Farm gives 10 / 20 / 30% more food by rank
const HARVEST_PCT = [0, 0.1, 0.2, 0.3];
// Fertile Fields adds 2 percentage points per level to every rank (10% becomes 12%, then 14%...)
const harvestPct = () => lvl('harvest') ? HARVEST_PCT[lvl('harvest')] + 0.02 * repLv('rep-harvest') : 0;
const HARVEST = [null, { bonus: 0.1, dur: 180, cd: 360, food0: 0 }, { bonus: 0.2, dur: 180, cd: 240, food0: 200 }, { bonus: 0.3, dur: Infinity, cd: 0, food0: 0, every: 180, food: 400 }];
const SKIN = [0, { pct: 0.05, cd: 300 }, { pct: 0.10, cd: 180 }, { pct: 0.15, cd: 90 }];
const CURSE = [0, { pct: 0.05, cd: 300 }, { pct: 0.10, cd: 180 }, { pct: 0.15, cd: 90 }];
const MEND = [0, { dur: 60, cd: 180 }, { dur: 30, cd: 120 }, { dur: 0, cd: 0 }];
const RISEN = [0, 4, 3, 2], RISEN_CD = 120;   // every 4th / 3rd / 2nd soldier who falls rises again at once
// the three resource spells are balanced: a 3-minute cast pays out 300 / 600 / 1000 by rank (Trading splits it over all three resources);
// one Mage in the nation casts each at a time, and the next cast waits 3 minutes
const RES_SPELL = { graverob: 'gold', trading: 'all' }, RES_YIELD = [0, 300, 600, 1000], RES_CAST = 180, RES_CD = 180;
// Deeper Graves / Planar Brokers add 2% per level to every rank
const resYield = sp => Math.round(RES_YIELD[lvl(sp)] * (1 + 0.02 * repLv(sp === 'graverob' ? 'rep-graverob' : 'rep-trading')));
const resWhy = (c, k) => S.units.some(v => v !== c && v.cast && v.cast.spell === k) ? 'Another Mage is already casting this' : null;
const TRADE = [0, 100, 200], TRADE_TIME = 120;
const PATH_OPEN = [0, 120, 60, 60], PATH_CLOSE = 60;
const STASIS = [0, 10, 20], STASIS_CD = 60;
const RIFT_USES = [0, 1, 3];

// ---------- casters: a lone Mage, or an army with at least one Mage in it ----------
const magesIn = u => u.kind === MAGE ? 1 : u.kind === 'army' ? (u.troops[MAGE] || 0) : 0;
const isCaster = u => u && u.owner === ME && magesIn(u) > 0;
const autoOn = (c, k) => !c.auto || c.auto[k] !== false;
// one Mage keeps either Cursed Weapons or Risen Dead ready, not both; an army with two or more Mages can have both
const mageCount = c => c.kind === 'army' ? (c.troops[MAGE] || 0) : 1;
function normAuto(c, prefer) {
  if (mageCount(c) >= 2 || !lvl('curse') || !lvl('risen') || !autoOn(c, 'curse') || !autoOn(c, 'risen')) return;
  c.auto = { ...(c.auto || {}), [prefer === 'risen' ? 'curse' : 'risen']: false };
}
function cancelCast(c, why) { if (!c.cast) return; const sp = c.cast.spell; c.cast = null; if (sp === 'harvest') { S.harvest = null; computeIncome(); } if (sp === 'mind') S.detect = null; if (why) toast(why); cmdKey = ''; }
function startCast(c, spell, dur, data = {}) { if (c.cast) cancelCast(c); c.cast = { spell, t0: S.t, dur, ...data }; cmdKey = ''; }
// ---------- what each castable spell needs, and casting it ----------
const CAST = {
  harvest: { name: () => TECH_BY_ID[lineTech('harvest')].name, line: 'harvest',
    why: c => resWhy(c, 'harvest'),
    go(c) { startCast(c, 'harvest', Infinity); S.harvest = { by: c.id }; computeIncome(); toast(`${TECH_BY_ID[lineTech('harvest')].name}: your Farms give ${Math.round(harvestPct() * 100)}% more food while ${c.name} keeps casting. Moving stops it.`); } },
  mending: { name: () => TECH_BY_ID[lineTech('mending')].name, line: 'mending', instant: true,
    target: c => c.kind === 'army' ? c : S.units.find(v => v.kind === 'army' && v.owner === ME && v.prov === c.prov),
    why: c => !CAST.mending.target(c) ? 'No army of yours here to heal' : null,
    go(c) { const a = CAST.mending.target(c), M = MEND[lvl('mending')]; if (M.dur) a.heal = { t0: S.t, dur: M.dur, w0: a.wounds || 0 }; else a.wounds = 0; if (M.cd) S.cd.mending = S.t + M.cd; a.healFx = S.t; toast(`${TECH_BY_ID[lineTech('mending')].name} on ${a.name}${M.dur ? ': healing over ' + M.dur + ' s' : ': fully healed'}.`); } },
  graverob: { name: () => TECH_BY_ID[lineTech('graverob')].name, line: 'graverob',
    why: c => resWhy(c, 'graverob'),
    go(c) { startCast(c, 'graverob', RES_CAST); toast(`${TECH_BY_ID[lineTech('graverob')].name}: ${resYield('graverob')} gold after ${RES_CAST / 60} minutes of casting.`); } },
  mind: { name: () => lvl('mind') >= 2 ? 'Mind Reading' : 'Clear Thoughts', line: 'mind', go(c) { startCast(c, 'mind', Infinity); toast(lvl('mind') >= 2 ? 'Mind Reading: every army on the map is revealed while the Mage casts.' : 'Clear Thoughts: armies within 3 provinces are revealed while the Mage casts.'); } },
  trading: { name: () => TECH_BY_ID[lineTech('trading')].name, line: 'trading', why: c => resWhy(c, 'trading'), go(c) { startCast(c, 'trading', RES_CAST); toast(`Trading across worlds: ${Math.round(resYield('trading') / 3)} of each resource after ${RES_CAST / 60} minutes.`); } },
  stasis: { name: () => TECH_BY_ID[lineTech('stasis')].name, line: 'stasis', instant: true,
    why: c => S.trap ? 'A trap is already set' : null,
    go(c) { S.trap = { prov: c.prov, t0: S.t }; toast(`Stasis trap set in ${provName(c.prov)}. The next enemy army there is held for ${STASIS[lvl('stasis')]} s.`); } },
  rift: { name: () => S.rift ? 'Send army through rift' : TECH_BY_ID[lineTech('rift')].name, line: 'rift', instant: true,
    target: c => c.kind === 'army' ? c : S.units.find(v => v.kind === 'army' && v.owner === ME && v.prov === c.prov && !v.battle),
    why: c => !S.rift ? null : S.rift.prov === c.prov ? 'The rift is here; cast from another province to send an army through' : !CAST.rift.target(c) ? 'No army of yours here to send' : CAST.rift.target(c).battle ? 'That army is in battle' : null,
    go(c) {
      if (!S.rift) { S.rift = { prov: c.prov, uses: RIFT_USES[lvl('rift')], t0: S.t }; toast(`A rift opens in ${provName(c.prov)} (${S.rift.uses} use${S.rift.uses > 1 ? 's' : ''}). Cast from elsewhere to send an army through.`); return; }
      const a = CAST.rift.target(c), to = S.rift.prov; a.path = []; a.moving = false; a.surveyQueue = []; a.lastProv = a.prov; a.prov = to; a.slot = freeSlot(to, a); [a.x, a.y] = slotPos(to, a.slot); a.riftFx = S.t;
      if (--S.rift.uses <= 0) S.rift = null;
      toast(`${a.name} steps through the rift to ${provName(to)}.${S.rift ? ' ' + S.rift.uses + ' use' + (S.rift.uses > 1 ? 's' : '') + ' left.' : ' The rift closes.'}`);
    } }
};
// battle spells are switched on or off per caster; they fire by themselves when a battle starts
const AUTO = {
  skin: { line: 'skin', name: () => TECH_BY_ID[lineTech('skin')].name },
  curse: { line: 'curse', name: () => TECH_BY_ID[lineTech('curse')].name },
  risen: { line: 'risen', name: () => TECH_BY_ID[lineTech('risen')].name }
};
const cdLeft = k => Math.max(0, (S.cd[k] || 0) - S.t);
function castWhy(c, k) {
  const sp = CAST[k];
  if (!currentSchool()) return 'Choose a school of magic first';
  if (!lvl(sp.line)) return 'Not researched';
  if (c.cast && c.cast.spell === k) return null;
  if (c.moving) return 'Stop moving first';
  if (c.battle) return 'Not during battle';
  if (cdLeft(k) > 0) return `Ready in ${Math.ceil(cdLeft(k))} s`;
  return sp.why ? sp.why(c) : null;
}
function castSpell(c, k) {
  if (c.cast && c.cast.spell === k) { cancelCast(c, 'Casting stopped.'); return; }
  const why = castWhy(c, k); if (why) return toast(why + '.', true);
  CAST[k].go(c); cmdKey = '';
  sfx(k === 'rift' ? 'mg_rift' : 'mg_' + currentSchool(), { prov: c.prov });
}
// ---------- forest paths and mountain tunnels (targeted from the right-click menu) ----------
const edgeBetween = (p, q, style, open) => { for (let i = 0; i < world.edges.length; i++) { const e = world.edges[i]; if (((e.a === p && e.b === q) || (e.a === q && e.b === p)) && (style ? e.style === style : true) && (open === undefined || e.open === open)) return i; } return -1; };
function pathWhy(c, q, kind, close) {
  const line = kind === 'forest' ? 'forest' : 'tunnel', L = lvl(line);
  if (!L) return 'Not researched';
  if (close && L < 3) return `Research ${TECH_BY_ID[LINES[line][2]].name} first`;
  if (!allNbr[c.prov].includes(q)) return 'The Mage must stand next door';
  const style = kind === 'forest' ? 'trees' : 'mountains';
  if (close) { const i = Object.keys(S.paths).map(Number).find(i => S.paths[i] === kind && [world.edges[i].a, world.edges[i].b].includes(q) && [world.edges[i].a, world.edges[i].b].includes(c.prov)); if (i === undefined) return `No ${kind === 'forest' ? 'forest path' : 'tunnel'} on that border`; }
  else if (edgeBetween(c.prov, q, style, false) < 0) return kind === 'forest' ? 'No border of trees there' : 'No mountain border there';
  if (c.moving) return 'Stop moving first';
  if (c.battle) return 'Not during battle';
  return null;
}
function startPath(c, q, kind, close) {
  const why = pathWhy(c, q, kind, close); if (why) return toast(why + '.', true);
  const line = kind === 'forest' ? 'forest' : 'tunnel', dur = close ? PATH_CLOSE : PATH_OPEN[lvl(line)];
  startCast(c, close ? 'pathclose' : 'pathopen', dur, { to: q, kind });
  toast(`${close ? 'Closing' : 'Opening'} a ${kind === 'forest' ? 'path through the trees' : 'tunnel under the mountains'} to ${provName(q)}: ${dur} s of casting.`);
}
function openEdge(i, kind) {
  const e = world.edges[i], V = world.vertices, a = V[e.v[0]], b = V[e.v[1]], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  e.open = true; S.paths[i] = kind;
  openNbr[e.a].push({ q: e.b, m }); openNbr[e.b].push({ q: e.a, m });
  G.crossings.push({ x: m[0], y: m[1], ang: Math.atan2(b[1] - a[1], b[0] - a[0]), len: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  cacheDirty = true; fogDirty = true; hoverPath = undefined;
}
function closeEdge(i) {
  const e = world.edges[i], V = world.vertices, a = V[e.v[0]], b = V[e.v[1]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  e.open = false; delete S.paths[i];
  openNbr[e.a] = openNbr[e.a].filter(n => n.q !== e.b); openNbr[e.b] = openNbr[e.b].filter(n => n.q !== e.a);
  G.crossings = G.crossings.filter(x => Math.hypot(x.x - mx, x.y - my) > 1);
  cacheDirty = true; fogDirty = true; hoverPath = undefined;
  for (const u of S.units) { if (!u.moving) continue; let prev = u.prov, hit = false; for (const w of u.path) if (w.enter !== undefined) { if (linkKey(prev, w.enter) === linkKey(e.a, e.b)) hit = true; prev = w.enter; } if (hit) { const fin = u.final; u.path = []; u.moving = false; if (fin === undefined || !order(u, fin, true)) { u.slot = freeSlot(u.prov, u); const [x, y] = slotPos(u.prov, u.slot); u.path = [{ x, y, slot: true }]; u.moving = true; } } }
}
// rows for the right-click menu when a caster is selected
function magicRows(c, q) {
  if (!c || c.prov === q || !allNbr[c.prov].includes(q)) return '';
  const rows = [], hasPath = kind => Object.keys(S.paths).some(i => S.paths[i] === kind && [world.edges[i].a, world.edges[i].b].includes(q) && [world.edges[i].a, world.edges[i].b].includes(c.prov));
  const row = (kind, close, label, icon) => { const why = pathWhy(c, q, kind, close);
    rows.push(`<button type="button" class="bm-item" data-type="${close ? 'pclose' : 'popen'}:${kind}" ${why ? 'aria-disabled="true"' : ''}><img alt="" src="${techIcon(icon)}"><span class="bm-name">${label}<small>${why || `${close ? PATH_CLOSE : PATH_OPEN[lvl(kind === 'forest' ? 'forest' : 'tunnel')]} s of casting`}</small></span></button>`); };
  if (lvl('forest') && edgeBetween(c.prov, q, 'trees', false) >= 0) row('forest', false, `Open a forest path to ${provName(q)}`, lineTech('forest'));
  if (lvl('forest') >= 3 && hasPath('forest')) row('forest', true, `Close the forest path to ${provName(q)}`, 'arboreal');
  if (lvl('tunnel') && edgeBetween(c.prov, q, 'mountains', false) >= 0) row('tunnel', false, `Open a tunnel to ${provName(q)}`, lineTech('tunnel'));
  if (lvl('tunnel') >= 3 && hasPath('tunnel')) row('tunnel', true, `Seal the tunnel to ${provName(q)}`, 'sealed');
  return rows.length ? `<div class="bm-sec">Magic</div>` + rows.join('') : '';
}
// ---------- every frame ----------
function stepMagic(t, dt) {
  // channels
  for (const c of S.units) {
    if (!c.cast) continue;
    if (!isCaster(c)) { cancelCast(c); continue; }
    if (c.moving || c.battle) { cancelCast(c, `${c.name} stopped casting.`); continue; }
    const cs = c.cast, el = t - cs.t0;
    if (cs.spell === 'mind') continue;
    if (el < cs.dur) continue;
    c.cast = null; cmdKey = '';
    if (RES_SPELL[cs.spell]) {
      const n = resYield(cs.spell), what = RES_SPELL[cs.spell];
      if (what === 'all') { for (const k of RES) S.stock[k] += Math.round(n / 3); } else S.stock[what] += n;
      S.cd[cs.spell] = t + RES_CD;
      toast(`${TECH_BY_ID[lineTech(cs.spell)].name}: +${what === 'all' ? Math.round(n / 3) + ' of each resource' : n + ' ' + what}. Next cast in ${RES_CD / 60} minutes.`);
    }
    else if (cs.spell === 'pathopen') { const i = edgeBetween(c.prov, cs.to, cs.kind === 'forest' ? 'trees' : 'mountains', false); if (i >= 0) { openEdge(i, cs.kind); toast(cs.kind === 'forest' ? `The trees part: a path opens to ${provName(cs.to)}.` : `A tunnel opens under the mountains to ${provName(cs.to)}.`); } }
    else if (cs.spell === 'pathclose') { const i = Object.keys(S.paths).map(Number).find(i => S.paths[i] === cs.kind && [world.edges[i].a, world.edges[i].b].includes(cs.to)); if (i !== undefined) { closeEdge(i); toast(cs.kind === 'forest' ? 'The forest closes the path again.' : 'The tunnel is sealed.'); } }
  }
  // healing over time
  for (const a of S.units) if (a.heal) { const f = Math.min(1, (t - a.heal.t0) / a.heal.dur); a.wounds = a.heal.w0 * (1 - f); if (f >= 1) a.heal = null; }
  // who is revealed by Clear Thoughts / Mind Reading
  const minds = S.units.filter(c => c.cast && c.cast.spell === 'mind');
  if (!minds.length) S.detect = null;
  else if (lvl('mind') >= 2) S.detect = 'all';
  else { const set = new Set(); for (const c of minds) { const d = hopsFrom(c.prov, allNbr); d.forEach((h, p) => { if (h <= 3) set.add(p); }); } S.detect = set; }
  // stasis trap
  if (S.trap) {
    const foe = S.units.find(v => v.kind === 'army' && hostile(v.owner, ME) && v.prov === S.trap.prov && troopCount(v) > 0);
    if (foe) { const n = STASIS[lvl('stasis')] || 10; foe.stasisUntil = t + n; foe.path = []; foe.moving = false; S.trap = null; S.cd.stasis = t + STASIS_CD; toast(`${foe.name} is caught in the stasis trap for ${n} s!`); }
  }
  // the stasis keeps a trapped army in place
  for (const a of S.units) if (a.stasisUntil && a.stasisUntil > t && a.moving) { a.path = []; a.moving = false; }
}
// called when an army joins a battle: its Mage fires the autocast spells
function onBattleJoin(a, t) {
  a.fallen = {}; a.skin = 0; a.curse = 0; a.risen = 0;
  if (!isCaster(a)) return;
  const sk = lvl('skin'), cu = lvl('curse'), ri = lvl('risen');
  normAuto(a);
  if (sk && autoOn(a, 'skin') && (a.skinCd || 0) <= t) { a.skin = SKIN[sk].pct; a.skinCd = t + SKIN[sk].cd; toast(`${a.name}: ${TECH_BY_ID[lineTech('skin')].name} (+${SKIN[sk].pct * 100}% health).`); }
  if (cu && autoOn(a, 'curse') && (a.curseCd || 0) <= t) { a.curse = CURSE[cu].pct; a.curseCd = t + CURSE[cu].cd; toast(`${a.name}: ${TECH_BY_ID[lineTech('curse')].name} (+${CURSE[cu].pct * 100}% damage).`); }
  if (ri && autoOn(a, 'risen') && (a.risenCd || 0) <= t) { a.risen = RISEN[ri]; a.risenN = 0; }
}
function onBattleEnd(a, t) { if (a.risen) a.risenCd = t + RISEN_CD; a.skin = 0; a.curse = 0; a.risen = 0; }
const harvestFood = () => {
  if (!S.harvest) return 0;
  let farm = 0; const per = givesOf('farm').food || 0;
  for (const [p, list] of S.extras) if (owned(p) && !S.occ.has(p)) for (const e of list) if (e.type === 'farm') farm += per;
  return Math.round(farm * harvestPct());
};
const armyDetected = u => u.kind === 'army' && S.detect && (S.detect === 'all' || S.detect.has(u.prov));
// towers with Arcane Scouts see their neighbors; with Arcane Vision they also spot stealthed units there
// GC17: sight runs only through open passages (not through trees, mountains, ruins or walls)
function towerSight(vis) { if (!hasTech('arcscouts')) return; for (const [p, list] of S.extras) if (owned(p) && list.some(e => e.type === 'magetower')) { vis.add(p); for (const { q } of openNbr[p]) vis.add(q); } }
function stealthSeen(u) { if (!u.stealth || u.owner === ME) return true; if (!hasTech('arcvision')) return false; for (const [p, list] of S.extras) if (owned(p) && list.some(e => e.type === 'magetower') && (p === u.prov || openNbr[p].some(n => n.q === u.prov))) return true; return false; }

// ---------- command card ----------
const SPELL_CELLS = ['harvest', 'mending', 'graverob', 'trading', 'mind', 'stasis', 'rift'];
function spellButtons(c, from) {
  const out = []; let cell = from;
  for (const k of SPELL_CELLS) if (currentSchool() && lvl(CAST[k].line)) out.push({ id: 'spell:' + k, cell: cell++, key: '' });
  for (const k of Object.keys(AUTO)) if (currentSchool() && lvl(AUTO[k].line)) out.push({ id: 'mauto:' + k, cell: cell++, key: '' });
  return out;
}
const CMD_ARMY = CMD.army;
Object.defineProperty(CMD, 'army', { configurable: true, get() { const a = S.selected.find(v => v.kind === 'army'); return CMD_ARMY.concat(a && isCaster(a) ? [{ id: 'detach', cell: 2, key: '' }].concat(spellButtons(a, 4)) : []); } });
Object.defineProperty(CMD, MAGE, { configurable: true, get() { const m = S.selected.find(v => v.kind === MAGE); return (m ? spellButtons(m, 0) : []).concat([{ id: 'join', cell: 12, key: '' }]); } });
const selCaster = () => { const k = cmdTab; return S.selected.find(v => v.kind === k && isCaster(v)) || S.selected.find(isCaster); };
function magicCmdKey() { const c = selCaster(); if (!c) return ''; normAuto(c); return [c.id, c.cast ? c.cast.spell + Math.floor((S.t - c.cast.t0) / 2) : '', c.quake ? 'q' + Math.floor((S.t - c.quake.t0) / 2) : '', c.retro ? 'r' : '', c.rest ? 'z' : '', JSON.stringify(c.auto || {}), Object.keys(S.cd).map(k => k + Math.ceil(cdLeft(k))).join(','), !!S.trap, S.rift ? S.rift.uses : 0, currentSchool(), S.tech.mag.done.length, troopCount(c.kind === 'army' ? c : { troops: {} })].join('|'); }
function magicCmdInfo(id) {
  const [what, k] = id.split(':');
  if (what === 'spell') {
    const c = selCaster(), sp = CAST[k], why = c ? castWhy(c, k) : 'No Mage selected', on = c && c.cast && c.cast.spell === k;
    const left = on && isFinite(c.cast.dur) ? ` ${Math.ceil(c.cast.dur - (S.t - c.cast.t0))} s left.` : on ? ' Casting.' : '';
    return { name: sp.name() + (on ? ' (casting)' : ''), desc: TECH_BY_ID[lineTech(sp.line)].blurb + left + (cdLeft(k) ? ` Cooldown: ${Math.ceil(cdLeft(k))} s.` : ''), cost: null, why: on ? null : why, ok: on ? 'Click to stop casting' : sp.instant ? 'Click to cast' : 'Click to start casting', icon: techIcon(lineTech(sp.line)) };
  }
  if (what === 'mauto') {
    const c = selCaster(), on = c && autoOn(c, k), A = AUTO[k];
    const cd = c ? Math.max(0, (c[k + 'Cd'] || 0) - S.t) : 0;
    return { name: `${A.name()}: autocast ${on ? 'on' : 'off'}`, desc: TECH_BY_ID[lineTech(A.line)].blurb + (k === 'risen' || k === 'curse' ? ' One Mage can keep Cursed Weapons or Risen Dead ready, not both; an army with two Mages can use both.' : '') + (c && c.kind !== 'army' ? ' The Mage must be in an army for this to fire.' : '') + (cd ? ` Ready again in ${Math.ceil(cd)} s.` : ''), cost: null, why: null, ok: on ? 'Click to turn off' : 'Click to turn on', glow: !!on, icon: techIcon(lineTech(A.line)), off: !on };
  }
  if (what === 'join') {
    const m = S.selected.find(v => v.kind === MAGE), a = m && S.units.find(v => v.kind === 'army' && v.owner === ME && v.prov === m.prov && !v.battle);
    return { name: 'Join army', desc: 'The Mage joins the army in this province: he fights with it, and its battle spells fire when a battle starts.', cost: null, why: !m ? 'No Mage selected' : !a ? 'No army of yours here' : m.moving ? 'Stop moving first' : null, icon: portrait(MAGE) };
  }
  if (what === 'detach') {
    const a = S.selected.find(v => v.kind === 'army');
    return { name: 'Detach Mage', desc: 'One Mage leaves the army and stands on his own.', cost: null, why: !a || !a.troops[MAGE] ? 'No Mage in this army' : a.battle ? 'Not during battle' : null, icon: portrait(MAGE) };
  }
  return null;
}
function magicCmdUse(id) {
  const [what, k] = id.split(':');
  if (what === 'spell') { const c = selCaster(); if (c) castSpell(c, k); return true; }
  if (what === 'mauto') { const c = selCaster(); if (c) { c.auto = { ...(c.auto || {}), [k]: !autoOn(c, k) }; if (autoOn(c, k) && (k === 'curse' || k === 'risen')) { const was = autoOn(c, k === 'curse' ? 'risen' : 'curse'); normAuto(c, k); if (was && !autoOn(c, k === 'curse' ? 'risen' : 'curse')) toast(`One Mage can’t keep both Cursed Weapons and Risen Dead ready; ${AUTO[k === 'curse' ? 'risen' : 'curse'].name()} is off. Add a second Mage to the army to use both.`); } toast(`${AUTO[k].name()} autocast ${autoOn(c, k) ? 'on' : 'off'}.`); } return true; }
  if (what === 'join') {
    const ms = S.selected.filter(v => v.kind === MAGE); let n = 0;
    for (const m of ms) { const a = S.units.find(v => v.kind === 'army' && v.owner === ME && v.prov === m.prov && !v.battle); if (!a) continue; cancelCast(m); a.troops[MAGE] = (a.troops[MAGE] || 0) + 1; if (a.troops[MAGE] > 1) { const merged = {}; for (const kk of Object.keys(AUTO)) merged[kk] = autoOn(m, kk) || autoOn(a, kk); a.auto = merged; } else a.auto = { ...(m.auto || {}) }; a.grew = S.t; S.units = S.units.filter(v => v !== m); n++; S.selected = [a]; }
    if (n) { computeIncome(); toast(`${n > 1 ? n + ' Mages' : 'The Mage'} joined the army.`); }
    return true;
  }
  if (what === 'detach') {
    const a = S.selected.find(v => v.kind === 'army'); if (!a || !a.troops[MAGE] || a.battle) return true;
    cancelCast(a); a.troops[MAGE]--; if (!a.troops[MAGE]) delete a.troops[MAGE];
    const n = S.units.filter(v => v.kind === MAGE).length + 1, m = mkUnit(S.nextId++, MAGE, 'Mage' + (n > 1 ? ' ' + n : ''), a.prov, 0);
    m.slot = freeSlot(a.prov, m); [m.x, m.y] = slotPos(a.prov, m.slot); m.born = S.t; S.units.push(m);
    if (troopCount(a) <= 0) removeArmy(a);
    S.selected = [m]; computeIncome(); toast('A Mage leaves the army.');
    return true;
  }
  return false;
}

// ---------- drawing: auras, paths, tunnels, traps, rifts, revealed armies ----------
function drawMagic(g, t) {
  const V = world.vertices;
  for (const [i, kind] of Object.entries(S.paths)) {
    const e = world.edges[+i]; if (!S.explored.has(e.a) && !S.explored.has(e.b)) continue;
    const a = V[e.v[0]], b = V[e.v[1]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    g.save(); g.translate(mx, my); g.rotate(ang);
    if (kind === 'forest') { g.beginPath(); g.ellipse(0, 0, 30, 24, 0, 0, Math.PI * 2); g.fillStyle = '#9bd95f'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(29,26,34,0.35)'; g.stroke(); g.beginPath(); g.rect(-9, -26, 18, 52); g.fillStyle = '#c9a46b'; g.fill(); for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 22, -14, 4, 0, 7); g.arc(s * 24, 12, 3, 0, 7); g.fillStyle = '#5fae4a'; g.fill(); } }
    else { for (const s of [-1, 1]) { g.save(); g.translate(0, s * 14); g.rotate(s < 0 ? Math.PI : 0); g.beginPath(); g.moveTo(-14, 6); g.lineTo(-14, -4); g.quadraticCurveTo(0, -20, 14, -4); g.lineTo(14, 6); g.closePath(); g.fillStyle = '#8a8f9b'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke(); g.beginPath(); g.moveTo(-8, 6); g.lineTo(-8, -2); g.quadraticCurveTo(0, -12, 8, -2); g.lineTo(8, 6); g.closePath(); g.fillStyle = '#1d1a22'; g.fill(); g.restore(); } g.fillStyle = 'rgba(160,110,220,0.35)'; g.fillRect(-6, -10, 12, 20); }
    g.restore();
  }
  if (S.trap && S.visible.has(S.trap.prov)) { const c = G.provs[S.trap.prov].ic; g.save(); g.translate(c[0] + 60, c[1] + 120); g.scale(1, 0.5); g.rotate(t * 0.5); g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = 'rgba(80,170,255,0.8)'; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]); for (let k = 0; k < 6; k++) { const q = k * Math.PI / 3; g.beginPath(); g.arc(Math.cos(q) * 26, Math.sin(q) * 26, 3.5, 0, 7); g.fillStyle = '#bfe3ff'; g.fill(); } g.restore(); }
  if (S.rift && S.explored.has(S.rift.prov)) { const c = G.provs[S.rift.prov].ic, x = c[0] - 70, y = c[1] + 110; g.save(); const gr = g.createRadialGradient(x, y, 2, x, y, 30); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#b48cff'); gr.addColorStop(1, 'rgba(90,40,180,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 22, 32, 0, 0, Math.PI * 2); g.fill(); g.translate(x, y); g.rotate(t * 2); g.lineWidth = 3; g.strokeStyle = '#6b3fa0'; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(0, 0, 14 + k * 5, 22 + k * 5, k, 0, 4); g.stroke(); } g.restore(); }
  for (const u of S.units) {
    if (u.cast && (u.owner === ME || S.visible.has(u.prov))) {
      // GC08: a bright casting circle on the ground, bigger for long casts: a glowing disc, two rings with runes turning opposite ways
      const long = !isFinite(u.cast.dur) || u.cast.dur >= 30, K = UKK, col = schoolColor(u.owner), r = (u.kind === 'army' ? 40 : 26) * K * (long ? 1.25 : 1);
      const pulse = 1 + Math.sin(t * 3) * 0.05;
      g.save(); g.translate(u.x, u.y + 2); g.scale(1, 0.42);
      const gr = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.25); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = 0.42 + Math.sin(t * 4) * 0.08; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.25, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.beginPath(); g.arc(0, 0, r * pulse, 0, Math.PI * 2); g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 5; g.strokeStyle = col; g.stroke();
      g.beginPath(); g.arc(0, 0, r * pulse, 0, Math.PI * 2); g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
      g.save(); g.rotate(t * 1.2); g.beginPath(); g.arc(0, 0, r * 0.72, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = col; g.setLineDash([10, 7]); g.stroke(); g.setLineDash([]);
      for (let k = 0; k < 6; k++) { const q = k * Math.PI / 3; g.save(); g.translate(Math.cos(q) * r * 0.86, Math.sin(q) * r * 0.86); g.rotate(q); g.beginPath(); g.moveTo(-4, -4); g.lineTo(4, 4); g.moveTo(4, -4); g.lineTo(-4, 4); g.moveTo(0, -5); g.lineTo(0, 5); g.lineWidth = 2.4; g.strokeStyle = '#fff'; g.stroke(); g.restore(); }
      g.restore();
      g.save(); g.rotate(-t * 0.8); for (let k = 0; k < 3; k++) { const q = k * Math.PI * 2 / 3; g.beginPath(); g.moveTo(Math.cos(q) * r * 0.72, Math.sin(q) * r * 0.72); g.lineTo(Math.cos(q + Math.PI * 2 / 3) * r * 0.72, Math.sin(q + Math.PI * 2 / 3) * r * 0.72); g.lineWidth = 2; g.strokeStyle = col; g.globalAlpha = 0.8; g.stroke(); } g.restore();
      g.restore();
      // motes rising from the circle
      for (let k = 0; k < 6; k++) { const f = (t * 0.6 + k / 6) % 1, q = k * 1.7 + t * 0.4; g.globalAlpha = 0.85 * (1 - f); g.fillStyle = col; g.beginPath(); g.arc(u.x + Math.cos(q) * r * 0.8, u.y + Math.sin(q) * r * 0.32 - f * 46 * K, 2.6 * K, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      if (isFinite(u.cast.dur)) { const f = Math.min(1, (S.t - u.cast.t0) / u.cast.dur), y = u.y - (u.kind === 'army' ? 90 : 66) * K; g.beginPath(); g.arc(u.x, y, 10 * K, 0, 7); g.fillStyle = 'rgba(250,241,220,0.95)'; g.fill(); g.beginPath(); g.arc(u.x, y, 10 * K, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.lineWidth = 4.5 * K; g.strokeStyle = col; g.stroke(); g.beginPath(); g.arc(u.x, y, 10 * K, 0, 7); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(); }
    }
    if (u.kind === 'army' && !S.visible.has(u.prov) && armyDetected(u) && u.owner !== ME) { g.save(); g.translate(u.x, u.y); g.scale(1, 0.45); g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.lineWidth = 5; g.strokeStyle = 'rgba(160,110,255,' + (0.6 + Math.sin(t * 4) * 0.3).toFixed(2) + ')'; g.stroke(); g.restore(); }
    if (u.stasisUntil && u.stasisUntil > S.t && S.visible.has(u.prov)) { g.save(); g.globalAlpha = 0.35; g.beginPath(); g.ellipse(u.x, u.y - 14, 30, 26, 0, 0, Math.PI * 2); g.fillStyle = '#8fd0ff'; g.fill(); g.globalAlpha = 1; g.lineWidth = 2; g.strokeStyle = '#4fa6e8'; g.stroke(); g.restore(); }
    if (u.healFx !== undefined && S.t - u.healFx < 1.5 || u.heal) { for (let k = 0; k < 4; k++) { const f = ((t * 0.8 + k / 4) % 1); g.fillStyle = `rgba(110,220,120,${1 - f})`; g.font = '14px sans-serif'; g.fillText('+', u.x - 14 + k * 9, u.y - 20 - f * 24); } }
  }
}

// ---------- the school choice ----------
function openSchoolPopup() {
  if (currentSchool()) return;
  const el = $q('#schoolPick'), cur = S.tech.mag.cur;
  el.innerHTML = `<div class="sp-head"><b>Choose a school of magic</b><span>Your first Mage Tower stands. Your first Magic research will be the school you pick; you can switch before it finishes. Abandoning a school later is costly.</span></div><div class="sp-cards">` +
    Object.entries(SCHOOLS).map(([k, sc]) => `<button type="button" class="sp-card${cur === 'school-' + k ? ' on' : ''}" data-school="${k}" style="--c:${sc.color};--l:${sc.light}"><img alt="" src="${techIcon('school-' + k)}"><b>${sc.name}</b><span>${sc.blurb}</span><ul>${sc.spells.map(n => `<li>${n}</li>`).join('')}</ul><em>${cur === 'school-' + k ? 'Researching' : 'Choose ' + sc.name}</em></button>`).join('') +
    `</div><button type="button" class="sp-later" data-school="later">Decide later (Research panel)</button>`;
  el.hidden = false;
}
function closeSchoolPopup() { $q('#schoolPick').hidden = true; }
function pickSchool(k) {
  sfx('mg_school');
  const id = 'school-' + k, st = S.tech.mag;
  if (!st.opts.includes(id) && st.cur !== id) drawOptions('mag');
  if (st.cur !== id) pickTech(id);
  closeSchoolPopup(); techKey = '';
  toast(`Researching the School of ${SCHOOLS[k].name}. You can switch in the Research panel until it finishes.`);
}
function abandonSchool() {
  const sc = currentSchool(); if (!sc) return;
  const st = S.tech.mag;
  st.done = st.done.filter(id => { const x = TECH_BY_ID[id]; return !(x.school === sc || id === 'school-' + sc || id === 'abandon'); });
  for (const x of TECHS) if (x.rep && x.school === sc) delete S.rep[x.id];   // the school's repeatables are forgotten too
  for (const c of S.units) if (c.cast) cancelCast(c);
  S.harvest = null; S.detect = null; if (sc === 'arcane') { S.trap = null; S.rift = null; }
  drawOptions('mag'); computeIncome(); cmdKey = ''; techKey = '';
  toast(`The School of ${SCHOOLS[sc].name} is abandoned and its spells forgotten. Choose a new school.`, true);
  setTimeout(openSchoolPopup, 60);
}
$q('#schoolPick').addEventListener('pointerdown', e => e.stopPropagation());
$q('#schoolPick').addEventListener('click', e => { const b = e.target.closest('[data-school]'); if (!b) return; if (b.dataset.school === 'later') closeSchoolPopup(); else pickSchool(b.dataset.school); });
window.__realm2 = ({ splitHalf, connectedPick, seizeWhy, outpostLimit, outpostCount, outpostWhy, soldierCount, techCostMult, techCost, stepExhaustion, warBattleCheck, normAuto, mageCount, autoOn });
