
// ================= equipment and unit designs (the Armory) =================
// Two kinds of soldier, infantry and cavalry; the player designs them by picking a weapon, an optional shield,
// armor and (for cavalry) a horse. Every design becomes a trainable unit with its own stats, cost and look.
// All numbers are first-pass placeholders.
const WEAPONS = {
  spear:       { name: 'Spear',          fam: 'pole',  tier: 1, atk: 5,  twoH: true,  cost: {},                    tech: null },
  pike:        { name: 'Pike',           fam: 'pole',  tier: 2, atk: 9,  twoH: true,  cost: { gold: 15, wood: 10 },  tech: 'w-pike' },
  polearm:     { name: 'Polearm',        fam: 'pole',  tier: 3, atk: 13,  twoH: true,  cost: { gold: 35, wood: 15 }, tech: 'w-polearm' },
  halberd:     { name: 'Halberd',        fam: 'pole',  tier: 4, atk: 18, twoH: true,  cost: { gold: 65, wood: 20 }, tech: 'w-halberd' },
  shortsword:  { name: 'Short Sword',    fam: 'sword', tier: 1, atk: 6,  twoH: false, cost: {},                    tech: null },
  sword:       { name: 'Bastard Sword',  fam: 'sword', tier: 2, atk: 10,  twoH: false, cost: { gold: 25 },           tech: 'w-bastard' },
  longsword:   { name: 'Long Sword',     fam: 'sword', tier: 3, atk: 14, twoH: false, cost: { gold: 50 },          tech: 'w-longsword' },
  greatsword:  { name: 'Great Sword',    fam: 'sword', tier: 4, atk: 20, twoH: true,  cost: { gold: 120 },          tech: 'w-greatsword' },
  club:        { name: 'Club',           fam: 'blunt', tier: 1, atk: 5,  twoH: true,  cost: { wood: 10 },           tech: null },
  mace:        { name: 'Mace',           fam: 'blunt', tier: 2, atk: 8,  twoH: true,  cost: { gold: 35 },           tech: 'w-mace' },
  morningstar: { name: 'Morning Star',   fam: 'blunt', tier: 3, atk: 11,  twoH: true,  cost: { gold: 70 },          tech: 'w-morningstar' },
  warhammer:   { name: 'War Hammer',     fam: 'blunt', tier: 4, atk: 15, twoH: true,  cost: { gold: 120 },          tech: 'w-warhammer' }
};
const FAMILY = {
  pole:  { name: 'Polearms', note: '+50% damage against cavalry', order: ['spear', 'pike', 'polearm', 'halberd'] },
  sword: { name: 'Swords',   note: 'Parry: take 10% less damage', order: ['shortsword', 'sword', 'longsword', 'greatsword'] },
  blunt: { name: 'Blunt',    note: 'Crushing: ignores half of enemy armor', order: ['club', 'mace', 'morningstar', 'warhammer'] }
};
const SHIELD_DEFS = {
  round: { name: 'Round Shield', armor: 3,  speed: 1,    cost: { gold: 10, wood: 10 },  tech: 's-round' },
  kite:  { name: 'Kite Shield',  armor: 6,  speed: 1,    cost: { gold: 20, wood: 10 },  tech: 's-kite' },
  tower: { name: 'Tower Shield', armor: 10, speed: 0.92, cost: { gold: 35, wood: 15 }, tech: 's-tower' },
  aegis: { name: 'Aegis',        armor: 14, speed: 1,    cost: { gold: 60 },           tech: 's-aegis' }
};
const ARMOR_TYPES = {
  leather: { name: 'Leather', speed: 1.1,  note: '+10% speed', armor: [1, 3, 5, 7],   gold: [0, 10, 20, 35] },
  chain:   { name: 'Chain',   speed: 1,    note: 'no speed change', armor: [4, 8, 12, 16],  gold: [15, 30, 50, 80] },
  plate:   { name: 'Plate',   speed: 0.85, note: '−15% speed', armor: [8, 14, 20, 26], gold: [35, 60, 85, 115] }
};
const ROMAN4 = ['', 'I', 'II', 'III', 'IV'];
const ARMORS = {};
for (const [k, A] of Object.entries(ARMOR_TYPES)) for (let lv = 1; lv <= 4; lv++) ARMORS[k + lv] = { name: `${A.name} ${ROMAN4[lv]}`, type: k, level: lv, armor: A.armor[lv - 1], speed: A.speed, cost: A.gold[lv - 1] ? { gold: A.gold[lv - 1] } : {}, tech: k === 'leather' && lv === 1 ? null : `a-${k}${lv}` };
// real breeds, each with a trade-off rather than a straight upgrade
const HORSES = {
  riding:    { name: 'Rouncey',   speed: 1.4,  hp: 10, atk: 1, armor: 0, upFood: 0,  rough: false, cost: {},                      tech: null,             coat: '#9a5b32', mane: '#5a3a22', note: 'Common riding horse. Cheap and balanced.' },
  arabian:   { name: 'Arabian',   speed: 1.9,  hp: 0,  atk: 1, armor: 0, upFood: 0,  rough: false, cost: { gold: 200, food: 50 },  tech: 'horse-breeding', coat: '#d9d4cc', mane: '#9a958c', note: 'Fastest horse there is, but light: no extra health.' },
  mongolian: { name: 'Mongolian', speed: 1.55, hp: 8,  atk: 0, armor: 0, upFood: -2, rough: true,  cost: { gold: 60 },              tech: 'horse-breeding', coat: '#c79a5e', mane: '#3a2a1e', note: 'Hardy steppe pony: 2 less food upkeep and no cavalry penalty in forest or swamp, but a weak charge.' },
  friesian:  { name: 'Friesian',  speed: 1.4,  hp: 20, atk: 3, armor: 0, upFood: 1,  rough: false, cost: { gold: 300, food: 100 }, tech: 'horse-training', coat: '#24201f', mane: '#0f0d0d', note: 'Powerful charger: the hardest-hitting horse, but costly to buy and feed.' },
  percheron: { name: 'Percheron', speed: 1.1,  hp: 40, atk: 2, armor: 3, upFood: 2,  rough: false, cost: { gold: 280, food: 150 }, tech: 'horse-training', coat: '#9a9ea6', mane: '#e6e6ea', barding: '#2f5fc0', note: 'Huge draught horse in barding: the toughest mount, but slow and hungry.' }
};
const UNIT_BASE = {
  inf: { name: 'Infantry', hp: 30, speed: 0.75, cost: { gold: 80 },  upkeep: { food: 2 } },
  cav: { name: 'Cavalry',  hp: 40, speed: 1,    cost: { gold: 300 }, upkeep: { food: 4 } }
};
const ARMOR_K = 12;   // damage reduction = armor / (armor + 12)
const equipOk = (item) => !item.tech || hasTech(item.tech);
const addCost = (a, b) => { const o = { ...a }; for (const k in b) o[k] = (o[k] || 0) + b[k]; return o; };

// ---------- designs ----------
S.designs = [];
let designSeq = 0;
const DSTATS = {};
const isCav = k => !!(DSTATS[k] && DSTATS[k].cav);
function designStats(d) {
  const B = UNIT_BASE[d.type], W = WEAPONS[d.weapon], A = ARMORS[d.armor], Sh = d.shield && !W.twoH ? SHIELD_DEFS[d.shield] : null, H = d.type === 'cav' ? HORSES[d.horse || 'riding'] : null;
  const armor = A.armor + (Sh ? Sh.armor : 0) + (H ? H.armor : 0);
  let cost = addCost(B.cost, W.cost); cost = addCost(cost, A.cost); if (Sh) cost = addCost(cost, Sh.cost); if (H) cost = addCost(cost, H.cost);
  const gear = (cost.gold || 0) - (B.cost.gold || 0);
  delete cost.food;   // units cost no food: food is only their upkeep
  const upkeep = { food: Math.max(0, B.upkeep.food + (H ? H.upFood : 0)) };
  const speed = +((H ? H.speed : B.speed) * A.speed * (Sh ? Sh.speed : 1)).toFixed(2);
  const red = armor / (armor + ARMOR_K) * (W.fam === 'sword' ? 1 : 1) ;
  const st = { cav: d.type === 'cav', rough: !!(H && H.rough), fam: W.fam, atk: W.atk + (H ? H.atk : 0), hp: B.hp + (H ? H.hp : 0), armor, shieldArmor: Sh ? Sh.armor : 0, red, parry: W.fam === 'sword' ? 0.1 : 0, speed, cost, upkeep };
  st.blurb = `${W.name}${Sh ? ' and ' + Sh.name : ''}, ${A.name} armor${H ? ', ' + H.name : ''}. ${FAMILY[W.fam].note}.${H && H.rough ? ' No cavalry penalty in forest or swamp.' : ''}`;
  return st;
}
// what a design looks like on the map: built from the unit rig's parts
function specFor(d) {
  const R = RealmIso, P = R.P, W = WEAPONS[d.weapon], A = ARMORS[d.armor], lv = A.level;
  const o = { right: d.weapon, left: d.shield && !W.twoH ? d.shield : null, angS: 0.3 };
  if (A.type === 'leather') Object.assign(o, { helm: lv >= 3 ? 'barbute' : 'flatcap', helmColor: '#7e5a3b', shirt: '#9a6a40', sleeve: '#9a6a40', pants: '#6b5a48', tabard: lv >= 2 ? '#7e5a3b' : null, tabardTrim: lv >= 4 ? P.gold : null });
  else if (A.type === 'chain') Object.assign(o, { helm: 'barbute', shirt: P.chain, sleeve: P.chain, mail: true, tabard: P.blue, tabardTrim: lv >= 3 ? P.gold : null, pants: '#4a4f5c', gloves: lv >= 2 ? P.steelD : undefined });
  else Object.assign(o, { helm: 'greathelm', plume: lv >= 4 ? P.gold : lv >= 2 ? P.red : undefined, shirt: P.blueD, sleeve: P.steel, armor: true, pauldrons: lv >= 2, tabard: P.blue, tabardTrim: lv >= 3 ? P.gold : null, pants: '#4a4f5c', boots: '#5b6270', gloves: P.steelD });
  if (d.type === 'cav') { const H = HORSES[d.horse || 'riding']; Object.assign(o, { rightPose: 'raised', angF: -0.3, angS: 0.55, horse: { coat: H.coat, mane: H.mane, barding: H.barding || null, chanfron: !!H.barding, muzzle: '#d8d1c6' } }); }
  return R.base(o);
}
function registerDesign(d) {
  const st = designStats(d); DSTATS[d.id] = st;
  UNIT_DEFS[d.id] = { name: d.name, cost: st.cost, upkeep: st.upkeep, blurb: st.blurb, design: true };
  MILITARY.add(d.id); UNIT_SPEED[d.id] = st.speed;
  RealmIso.UNITS[d.id] = { unit: st.cav ? 'cavalry' : 'footman', name: d.name, title: d.name, spec: specFor(d) };
  delete portraitURL[d.id];
}
function addDesign(o, builtin) {
  const d = { id: o.id || 'd' + (++designSeq), name: o.name, type: o.type, weapon: o.weapon, shield: o.shield || null, armor: o.armor, horse: o.type === 'cav' ? (o.horse || 'riding') : null, builtin: !!builtin };
  S.designs.push(d); registerDesign(d); return d;
}
// starting designs (also used by raiders and by the AI nations' first armies)
addDesign({ id: 'd-spear', name: 'Spearman', type: 'inf', weapon: 'spear', armor: 'leather1' }, true);
addDesign({ id: 'd-sword', name: 'Footman', type: 'inf', weapon: 'shortsword', armor: 'leather1' }, true);
addDesign({ id: 'd-club', name: 'Clubman', type: 'inf', weapon: 'club', armor: 'leather1' }, true);
addDesign({ id: 'd-rider', name: 'Rider', type: 'cav', weapon: 'spear', armor: 'leather1', horse: 'riding' }, true);
const designById = id => S.designs.find(d => d.id === id);
const designInUse = id => S.units.some(u => u.kind === 'army' && u.troops[id]) || Object.values(S.queues).some(Q => Q.some(q => q.kind === id));
const PLURAL_OF = n => /man$/.test(n) ? n.replace(/man$/, 'men') : /s$/.test(n) ? n : n + 's';

// ---------- combat helpers (used by the battle code) ----------
const STATS0 = { atk: 5, hp: 30, armor: 0, shieldArmor: 0, red: 0, parry: 0, cav: false, fam: 'sword' };
// a soldier's stats; your own soldiers also get the repeatable Military and Magic research bonuses (see boostStats)
const statsOf = (k, o) => { const st = DSTATS[k] || STATS0; return o === ME ? boostStats(k, st) : st; };
function sideMix(armies) {
  let n = 0, cav = 0, red = 0, parry = 0, blunt = 0, atk = 0;
  for (const a of armies) for (const k in a.troops) { const c = a.troops[k], s = statsOf(k, a.owner); n += c; if (s.cav) cav += c; red += c * s.red; parry += c * s.parry; if (s.fam === 'blunt') blunt += c * s.atk; atk += c * s.atk; }
  return n ? { n, cavFrac: cav / n, red: red / n, parry: parry / n, pierce: atk ? blunt / atk : 0 } : { n: 0, cavFrac: 0, red: 0, parry: 0, pierce: 0 };
}

// ---------- the Armory panel ----------
let armOpen = false, armKey = '', armSel = 'd-sword', draft = null, armSpin = 0;
function toggleArmory(open = !armOpen) { if (open && !armOpen) sfx('ui_panel'); armOpen = open; $q('#armory').hidden = !open; armKey = ''; if (open) { if (!draft) editDesign(armSel); if (techOpen) toggleTech(false); } }
function editDesign(id) { if (id === 'mage') { armSel = 'mage'; draft = { id: 'mage', type: 'mage', name: 'Mage', weapon: S.mageGear.weapon, shield: S.mageGear.shield }; armKey = ''; return; } const d = designById(id); if (!d) return; armSel = id; draft = { ...d }; armKey = ''; }
function newDesign(type) {
  const n = S.designs.filter(d => d.type === type).length + 1;
  draft = { id: null, name: (type === 'cav' ? 'Cavalry ' : 'Infantry ') + n, type, weapon: 'spear', shield: null, armor: 'leather1', horse: type === 'cav' ? 'riding' : null };
  armSel = null; armKey = '';
}
function saveDraft() {
  if (!draft) return;
  if (draft.type === 'mage') { S.mageGear = { weapon: draft.weapon, shield: MAGE_WEAPONS[draft.weapon].twoH ? null : draft.shield }; registerMage(); armKey = ''; cmdKey = ''; toast(`Mages now carry a ${MAGE_WEAPONS[draft.weapon].name}${S.mageGear.shield ? ' and a ' + SHIELD_DEFS[S.mageGear.shield].name : ''}.`); return; }
  const name = ($q('#armName') && $q('#armName').value.trim()) || draft.name; draft.name = name.slice(0, 24);
  const cur = draft.id && designById(draft.id);
  if (cur && !cur.builtin && !designInUse(cur.id)) { Object.assign(cur, draft); registerDesign(cur); toast(`${cur.name} saved.`); }
  else {
    if (cur && (cur.builtin || designInUse(cur.id)) && cur.name === draft.name) draft.name = nextDesignName(draft.name);
    const d = addDesign({ ...draft, id: null }); armSel = d.id; draft = { ...d };
    toast(cur ? `${cur.builtin ? 'Starting designs can’t be changed' : cur.name + ' is in use'}: saved as a new design, ${d.name}.` : `${d.name} added to the Armory. Train it at a Barracks${d.type === 'cav' ? ' with a Stable' : ''}.`);
  }
  armKey = ''; cmdKey = '';
}
function deleteDesign(id) {
  const d = designById(id); if (!d || d.builtin) return;
  if (designInUse(id)) return toast(`${d.name} can’t be deleted while soldiers of that design are alive or in training.`, true);
  S.designs = S.designs.filter(x => x !== d); MILITARY.delete(id);
  toast(`${d.name} deleted.`); editDesign('d-sword'); cmdKey = '';
}
function statBar(label, v, max, txt) { return `<div class="ar-stat"><span>${label}</span><i><s style="width:${Math.min(100, v / max * 100)}%"></s></i><b>${txt}</b></div>`; }
function equipButton(kind, key, item, on, why) {
  return `<button type="button" class="ar-eq${on ? ' on' : ''}${why ? ' locked' : ''}" data-eq="${kind}:${key}" ${why ? 'aria-disabled="true"' : ''} title="${item.name}${why ? ' · ' + why : ''}"><img alt="" src="${equipIcon(kind, key)}"><span>${item.name}</span>${why ? '<em>🔒</em>' : ''}</button>`;
}
function lockWhy(item) { return item.tech && !hasTech(item.tech) ? 'Research ' + TECH_BY_ID[item.tech].name : null; }
function renderArmory() {
  if (!armOpen || !draft) return;
  const key = JSON.stringify({ ...draft, name: undefined }) + '|' + S.designs.length + '|' + S.designs.map(d => d.name).join(',') + '|' + TREE_KEYS.map(t => S.tech[t].done.length).join(',');
  if (key !== armKey) {
    armKey = key;
    const ae = document.activeElement, caret = ae && ae.id === 'armName' ? ae.selectionStart : null;
    if (caret !== null) queueMicrotask(() => { const nm = $q('#armName'); if (nm) { nm.focus({ preventScroll: true }); nm.setSelectionRange(caret, caret); } });
    const st = draft.type === 'mage' ? null : designStats(draft), W = WEAPONS[draft.weapon];
    const list = ['inf', 'cav'].map(type => `<div class="ar-group"><div class="ar-gh">${UNIT_BASE[type].name}</div>` + S.designs.filter(d => d.type === type).map(d => { const s = DSTATS[d.id]; return `<button type="button" class="ar-d${armSel === d.id ? ' on' : ''}" data-design="${d.id}"><img alt="" src="${portrait(d.id)}"><span><b>${d.name}</b><small>⚔${s.atk} ♥${s.hp} 🛡${Math.round(s.red * 100)}% ➜${s.speed}</small></span></button>`; }).join('') + `<button type="button" class="ar-new" data-new="${type}">＋ New ${type === 'cav' ? 'cavalry' : 'infantry'} design</button></div>`).join('') + (() => { const ms = DSTATS[MAGE]; return `<div class="ar-group"><div class="ar-gh">Mages</div><button type="button" class="ar-d${armSel === 'mage' ? ' on' : ''}" data-design="mage"><img alt="" src="${portrait(MAGE)}"><span><b>Mage gear</b><small>⚔${ms.atk} ♥${ms.hp} 🛡${Math.round(ms.red * 100)}% ➜${ms.speed.toFixed(2)}</small></span></button></div>`; })();
    if (draft.type === 'mage') { renderMageEditor(list); return drawArmPreview(); }
    const fams = Object.entries(FAMILY).map(([f, F]) => `<div class="ar-row"><span class="ar-rl">${F.name}<small>${F.note}</small></span><div class="ar-eqs">${F.order.map(w => equipButton('weapon', w, WEAPONS[w], draft.weapon === w, lockWhy(WEAPONS[w]))).join('')}</div></div>`).join('');
    const shields = `<div class="ar-row"><span class="ar-rl">Shield<small>${W.twoH ? W.name + ' needs both hands' : 'One-handed weapons only'}</small></span><div class="ar-eqs"><button type="button" class="ar-eq${!draft.shield || W.twoH ? ' on' : ''}" data-eq="shield:none"><span class="ar-none">—</span><span>None</span></button>${Object.entries(SHIELD_DEFS).map(([k, s]) => equipButton('shield', k, s, draft.shield === k && !W.twoH, W.twoH ? 'Two-handed weapon' : lockWhy(s))).join('')}</div></div>`;
    const armors = Object.entries(ARMOR_TYPES).map(([t, A]) => `<div class="ar-row"><span class="ar-rl">${A.name}<small>${A.note}</small></span><div class="ar-eqs">${[1, 2, 3, 4].map(lv => equipButton('armor', t + lv, ARMORS[t + lv], draft.armor === t + lv, lockWhy(ARMORS[t + lv]))).join('')}</div></div>`).join('');
    const horses = draft.type === 'cav' ? `<div class="ar-sec">Horse</div><div class="ar-row"><span class="ar-rl">Mount<small>Each breed trades speed, toughness, charge and cost</small></span><div class="ar-eqs">${Object.entries(HORSES).map(([k, h]) => equipButton('horse', k, h, draft.horse === k, lockWhy(h))).join('')}</div></div>` : '';
    const cur = draft.id && designById(draft.id), inUse = cur && designInUse(cur.id);
    $q('#armory').innerHTML = `<div class="ar-head"><b>Armory</b><span>Design the soldiers your Barracks train. Better gear costs more.</span><button type="button" class="tp-x" data-ar="close" aria-label="Close the Armory">×</button></div>
      <div class="ar-body"><div class="ar-list">${list}</div>
      <div class="ar-edit">
        <div class="ar-top"><canvas id="armPrev" width="220" height="220" aria-label="Preview of the design"></canvas>
          <div class="ar-sum"><label class="ar-name"><span>Name</span><input id="armName" type="text" maxlength="24" value="${draft.name.replace(/"/g, '&quot;')}" spellcheck="false"></label>
          <div class="ar-kind">${UNIT_BASE[draft.type].name}${cur && cur.builtin ? ' · starting design' : inUse ? ' · in use' : ''}</div>
          ${statBar('Attack', st.atk, 18, st.atk)}${statBar('Health', st.hp, 75, st.hp)}${statBar('Armor', st.red, 0.65, Math.round(st.red * 100) + '%')}${statBar('Speed', st.speed, 2, st.speed)}
          <div class="ar-cost"><span>Cost</span>${costHTML(st.cost)}<span>Upkeep</span>${costHTML(st.upkeep)}</div>
          <div class="ar-note">${FAMILY[W.fam].note}.${st.cav ? ' ' + HORSES[draft.horse || 'riding'].note + ' Needs a Barracks and a Stable.' : ''}</div>
          <div class="ar-btns"><button type="button" class="ar-save" data-ar="save">${cur && !cur.builtin && !inUse ? 'Save changes' : 'Save as new design'}</button>${cur ? `<button type="button" class="ar-save ar-retro" data-ar="retro" title="Re-equip every ${cur.type === 'cav' ? 'cavalry' : 'infantry'} soldier standing in your own provinces with this design; you pay the difference in gear cost">Retrofit armies</button>` : ''}${cur && !cur.builtin ? `<button type="button" class="ar-del" data-ar="delete">Delete</button>` : ''}</div></div></div>
        <div class="ar-sec">Weapon</div>${fams}${shields}<div class="ar-sec">Armor</div>${armors}${horses}
      </div></div>`;
  }
  drawArmPreview();
}
function drawArmPreview() {
  // spin the preview so the design can be seen from all sides
  const cv = $q('#armPrev'); if (!cv) return;
  const g = cv.getContext('2d'), t = performance.now() / 1000; armSpin = t * 0.6;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#9bd95f'; g.beginPath(); g.ellipse(110, 186, 80, 24, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
  const id = '__draft'; RealmIso.UNITS[id] = { unit: draft.type === 'cav' ? 'cavalry' : 'footman', spec: draft.type === 'mage' ? { ...MAGE_SPEC0, ...mageSpec(draft) } : specFor(draft) };
  RealmIso.drawUnitAt(g, id, Math.round(armSpin / (Math.PI / 4)) * (Math.PI / 4), t * 2, 110, 186, draft.type === 'cav' ? 0.62 : 1.05);
}
const armEl = $q('#armory');
armEl.addEventListener('pointerdown', e => e.stopPropagation());
armEl.addEventListener('wheel', e => e.stopPropagation());
armEl.addEventListener('keydown', e => e.stopPropagation());
armEl.addEventListener('input', e => { if (e.target.id === 'armName' && draft) draft.name = e.target.value; });   // IC06: the panel's redraw key leaves the name out, so the box keeps its focus while you type
armEl.addEventListener('click', e => {
  const t = e.target.closest('[data-design],[data-new],[data-eq],[data-ar]'); if (!t) return;
  if (t.dataset.design) { editDesign(t.dataset.design); return; }
  if (t.dataset.new) { newDesign(t.dataset.new); return; }
  if (t.dataset.ar === 'close') { toggleArmory(false); return; }
  if (t.dataset.ar === 'save') { saveDraft(); return; }
  if (t.dataset.ar === 'delete') { deleteDesign(draft.id); return; }
  if (t.dataset.eq) {
    if (t.getAttribute('aria-disabled')) { toast(t.title, true); return; }
    const [kind, key] = t.dataset.eq.split(':'), nm = $q('#armName'); if (nm) draft.name = nm.value;
    if (kind === 'weapon') { draft.weapon = key; if ((WEAPONS[key] || MAGE_WEAPONS[key]).twoH) draft.shield = null; }
    else if (kind === 'shield') draft.shield = key === 'none' ? null : key;
    else if (kind === 'armor') draft.armor = key;
    else if (kind === 'horse') draft.horse = key;
  }
});
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#armBtn')) { toggleArmory(); e.target.closest('#armBtn').blur(); } });
window.addEventListener('keydown', e => { if (!S.started || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return; if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) toggleArmory(); else if (e.key === 'Escape' && armOpen) toggleArmory(false); });

function renderMageEditor(list) {
  const st = mageStats(draft), W = MAGE_WEAPONS[draft.weapon];
  const lines = [['stave', 'Staves', 'Two-handed, the stronger attack'], ['wand', 'Wands', 'One-handed: leaves room for a shield']].map(([line, name, note]) => `<div class="ar-row"><span class="ar-rl">${name}<small>${note}</small></span><div class="ar-eqs">${Object.entries(MAGE_WEAPONS).filter(([, w]) => w.line === line).map(([k, w]) => equipButton('weapon', k, w, draft.weapon === k, lockWhy(w))).join('')}</div></div>`).join('');
  const shields = `<div class="ar-row"><span class="ar-rl">Shield<small>${W.twoH ? 'Staves need both hands' : 'Wands only'}</small></span><div class="ar-eqs"><button type="button" class="ar-eq${!draft.shield || W.twoH ? ' on' : ''}" data-eq="shield:none"><span class="ar-none">—</span><span>None</span></button>${Object.entries(SHIELD_DEFS).map(([k, sh]) => equipButton('shield', k, sh, draft.shield === k && !W.twoH, W.twoH ? 'Two-handed stave' : lockWhy(sh))).join('')}</div></div>`;
  $q('#armory').innerHTML = `<div class="ar-head"><b>Armory</b><span>Design the soldiers your Barracks train. Better gear costs more.</span><button type="button" class="tp-x" data-ar="close" aria-label="Close the Armory">×</button></div>
    <div class="ar-body"><div class="ar-list">${list}</div><div class="ar-edit">
      <div class="ar-top"><canvas id="armPrev" width="220" height="220" aria-label="Preview of the Mage"></canvas>
        <div class="ar-sum"><div class="ar-kind" style="font-size:15px;font-weight:800;color:var(--chip-text)">Mage gear · every Mage</div>
        ${statBar('Attack', st.atk, 18, st.atk)}${statBar('Health', st.hp, 75, st.hp)}${statBar('Armor', st.red, 0.65, Math.round(st.red * 100) + '%')}${statBar('Speed', st.speed, 2, st.speed.toFixed(2))}
        <div class="ar-cost"><span>Train</span>${costHTML(UNIT_DEFS[MAGE].cost)}<span>Upkeep</span>${costHTML(UNIT_DEFS[MAGE].upkeep)}</div>
        <div class="ar-note">Mages are trained at a Mage Tower. Their gear is shared: changing it re-equips every Mage.</div>
        <div class="ar-btns"><button type="button" class="ar-save" data-ar="save">Equip all Mages</button></div></div></div>
      <div class="ar-sec">Weapon</div>${lines}${shields}</div></div>`;
}
