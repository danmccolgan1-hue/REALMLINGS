
// ================= main menu =================
// the map drifts behind a title card; Start builds a fresh world from the chosen seed and begins play
const MENU_WORDS = ['amber', 'bramble', 'cinder', 'dapple', 'ember', 'fable', 'gilded', 'hollow', 'ivy', 'juniper', 'kestrel', 'lantern', 'meadow', 'nettle', 'oaken', 'pebble', 'quill', 'rook', 'sable', 'thistle', 'umber', 'vale', 'willow', 'yarrow'];
const randomSeed = () => MENU_WORDS[Math.floor(Math.random() * MENU_WORDS.length)] + '-' + MENU_WORDS[Math.floor(Math.random() * MENU_WORDS.length)] + '-' + (10 + Math.floor(Math.random() * 90));
const menuOpts = { practice: false, slots: ['easy', 'easy', 'moderate', 'closed', 'closed', 'closed', 'closed'] };
// the 7 opponent slots: each is Easy, Moderate, Difficult or Closed (a closed slot spawns no nation)
const SLOT_CYCLE = ['closed', 'easy', 'moderate', 'difficult'];
const SLOT_TEXT = { closed: 'Closed', easy: 'Easy', moderate: 'Moderate', difficult: 'Difficult' };
try { const v = JSON.parse(localStorage.getItem('realm-slots') || 'null'); if (Array.isArray(v) && v.length === 7 && v.every(x => SLOT_CYCLE.includes(x))) menuOpts.slots = v; } catch (e) {}
function slotsSave() { try { localStorage.setItem('realm-slots', JSON.stringify(menuOpts.slots)); } catch (e) {} }
function renderSlots() {
  const off = menuOpts.practice;
  $q('#mSlots').innerHTML = menuOpts.slots.map((d, i) => `<button type="button" class="opp-slot ${d}" data-slot="${i}"${off ? ' disabled' : ''} aria-label="Opponent ${i + 1}: ${SLOT_TEXT[d]}. Click to change." title="Click to change (right-click goes back)"><i>${i + 1}</i>${SLOT_TEXT[d]}</button>`).join('');
  $q('#mQuick').querySelectorAll('button').forEach(b => b.disabled = off);
  const n = menuOpts.slots.filter(d => d !== 'closed').length;
  $q('#mOppN').textContent = off ? '' : `${n + 1} nation${n ? 's' : ''}`;
}
let menuCanvasT = 0;
function bootMenu() {
  S.started = false;
  document.body.classList.add('in-menu');
  showAllLand();
  const c = G.provs.reduce((a, p) => [a[0] + p.ic[0] / G.provs.length, a[1] + p.ic[1] / G.provs.length], [0, 0]);
  cam.x = c[0]; cam.y = c[1]; cam.z = 0.32; clampCam(); cacheDirty = true;
  $q('#mSeed').value = randomSeed();
  renderMenuToggles();
  requestAnimationFrame(menuParade);
  setTimeout(() => $q('#mStart').focus({ preventScroll: true }), 50);
}
// on the title screen the whole island is shown, unfogged
function showAllLand() { S.explored = new Set(G.provs.map((_, i) => i)); S.visible = new Set(S.explored); S.sig = 'menu'; fogDirty = true; miniDirty = true; }
function renderMenuToggles() {
  for (const [id, key, on, off] of [['mPractice', 'practice', 'On · a 10-province island, just you', 'Off']]) {
    const b = $q('#' + id); b.setAttribute('aria-pressed', menuOpts[key]); b.querySelector('span').textContent = menuOpts[key] ? on : off;
  }
  // practice is just you: the opponent slots sit out
  $q('#mSlots').closest('.menu-row').classList.toggle('off', menuOpts.practice);
  renderSlots();
}
// slow drift of the camera across the island while the menu is up
function menuDrift(realT) {
  const [x0, y0, x1, y1] = G.bounds, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  cam.x = mx + Math.cos(realT * 0.05) * (x1 - x0) * 0.22; cam.y = my + Math.sin(realT * 0.07) * (y1 - y0) * 0.18;
  cacheDirty = true;
}
function regenerate(seed, practice) {
  world = scaleWorld(practice ? RealmGen.generatePractice(seed) : RealmGen.generateWorld(seed)); world.mode = practice ? 'practice' : 'normal'; world.pickSeed = seed; G = prep(world);
  provNames.length = 0; territory = null; cacheDirty = true; fogDirty = true; miniDirty = true;
  window.__realm.world = world; window.__realm.G = G;
}
function startGame() {
  const seed = ($q('#mSeed').value || '').trim() || randomSeed();
  const btn = $q('#mStart'); btn.disabled = true; btn.textContent = 'Building the realm…';
  // let the button repaint before the generator runs
  setTimeout(() => {
    const mode = menuOpts.practice ? 'practice' : 'normal';
    if (seed !== world.pickSeed || mode !== (world.mode || 'normal')) regenerate(seed, menuOpts.practice);
    S.explored = new Set(); S.visible = new Set(); S.sig = '';
    setupGame();
    spawnAINations(menuOpts.practice ? [] : menuOpts.slots);
    setupContent();   // set pieces, Bandit Gangs, the civilians' zoom level
    setupV78();       // Roaming Monsters, the F4 unit-size zoom, war record (v78)
    $q('#debug').hidden = true;   // debug buttons are retired
    S.started = true; S.last = 0; S.nextTick = 0;
    document.body.classList.remove('in-menu');
    $q('#menu').hidden = true;
    home();
    const others = Object.keys(NATIONS).length;
    toast(menuOpts.practice ? `Practice island “${seed}”: 10 provinces, just you. Explore, settle and try things out.` : `Welcome to ${seed}. ${others ? `${others} other nation${others > 1 ? 's share' : ' shares'} the island. ` : ''}Explore with your Wayfinder, claim land with your Mason.`);
  }, 30);
}
// a little parade of the realm's folk on the title card
function menuParade(now) {
  if (S.started) return;
  const cv = $q('#mParade'), g = cv.getContext('2d'), w = cv.width, h = cv.height, t = now / 1000;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
  const folk = ['pioneer:B', 'mason:A', 'swordsman:B', 'pikeman:C', 'cavalry:B', 'mage:A'];
  folk.forEach((id, i) => {
    const x = w * (i + 0.5) / folk.length, hop = -Math.abs(Math.sin(t * 6 + i * 1.1)) * 6;
    g.fillStyle = 'rgba(29,26,34,0.18)'; g.beginPath(); g.ellipse(x, h - 14, 34, 10, 0, 0, Math.PI * 2); g.fill();
    RealmIso.drawUnitAt(g, id, i % 2 ? 0.6 : -0.6, t * 2 + i, x, h - 14 + hop, id === 'cavalry:B' ? 0.82 : 1.05);
  });
  requestAnimationFrame(menuParade);
}
$q('#menu').addEventListener('pointerdown', e => e.stopPropagation());
$q('#menu').addEventListener('wheel', e => e.stopPropagation());
$q('#mDice').addEventListener('click', () => { $q('#mSeed').value = randomSeed(); });
$q('#mSlots').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (!b) return; const i = +b.dataset.slot; menuOpts.slots[i] = SLOT_CYCLE[(SLOT_CYCLE.indexOf(menuOpts.slots[i]) + 1) % SLOT_CYCLE.length]; slotsSave(); renderSlots(); });
$q('#mSlots').addEventListener('contextmenu', e => { const b = e.target.closest('[data-slot]'); if (!b) return; e.preventDefault(); const i = +b.dataset.slot; menuOpts.slots[i] = SLOT_CYCLE[(SLOT_CYCLE.indexOf(menuOpts.slots[i]) + SLOT_CYCLE.length - 1) % SLOT_CYCLE.length]; slotsSave(); renderSlots(); });
$q('#mQuick').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b) return; menuOpts.slots = menuOpts.slots.map(() => b.dataset.q); slotsSave(); renderSlots(); });
$q('#mPractice').addEventListener('click', () => { menuOpts.practice = !menuOpts.practice; renderMenuToggles(); });
$q('#mStart').addEventListener('click', startGame);
$q('#mSeed').addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); e.stopPropagation(); });
$q('#mHow').addEventListener('click', () => { const el = $q('#mHowText'); el.hidden = !el.hidden; $q('#mHow').setAttribute('aria-expanded', !el.hidden); });

// ================= music =================
// a ~21 minute tavern piece (lute, then flute, then hand drums, twice through in different keys) that loops.
// Browsers only allow sound after the player interacts, so it starts on the first click or key press.
const MUSIC = { el: null, on: true, vol: 0.35, started: false, fade: null };
try { const sv = JSON.parse(localStorage.getItem('realmlings-music') || 'null'); if (sv) { MUSIC.on = !!sv.on; MUSIC.vol = Math.max(0, Math.min(1, +sv.vol)); } } catch (e) {}
function musicSave() { try { localStorage.setItem('realmlings-music', JSON.stringify({ on: MUSIC.on, vol: MUSIC.vol })); } catch (e) {} }
function musicEl() {
  if (!MUSIC.el) { MUSIC.el = new Audio('music/tavern.mp3'); MUSIC.el.loop = true; MUSIC.el.preload = 'auto'; MUSIC.el.volume = 0; }
  return MUSIC.el;
}
function musicFadeTo(v, secs) {
  const a = musicEl(); clearInterval(MUSIC.fade);
  const from = a.volume, t0 = performance.now();
  MUSIC.fade = setInterval(() => { const f = Math.min(1, (performance.now() - t0) / (secs * 1000)); a.volume = Math.max(0, Math.min(1, from + (v - from) * f)); if (f >= 1) { clearInterval(MUSIC.fade); if (v === 0 && !MUSIC.on) a.pause(); } }, 50);
}
function musicStart() {
  if (!MUSIC.on || S.paused) return;
  const a = musicEl(); MUSIC.started = true;
  const p = a.play(); if (p && p.catch) p.catch(() => { MUSIC.started = false; });
  musicFadeTo(MUSIC.vol, 3);
}
function musicSet(on) { MUSIC.on = on; musicSave(); musicRender(); if (on) musicStart(); else if (MUSIC.el) musicFadeTo(0, 0.6); }
function musicVolume(v) { MUSIC.vol = v; musicSave(); musicRender(); if (MUSIC.on && MUSIC.el && !MUSIC.el.paused) { clearInterval(MUSIC.fade); MUSIC.el.volume = v; } }
function musicRender() {
  for (const id of ['#musBtn', '#mMusic']) { const b = $q(id); if (!b) continue; b.setAttribute('aria-pressed', MUSIC.on ? 'true' : 'false'); if (b.querySelector('span')) b.querySelector('span').textContent = MUSIC.on ? 'On' : 'Off'; }
  for (const id of ['#musVol', '#mMusVol']) { const r = $q(id); if (r && +r.value !== Math.round(MUSIC.vol * 100)) r.value = Math.round(MUSIC.vol * 100); }
}
$q('#musBtn').addEventListener('click', e => { e.stopPropagation(); musicSet(!MUSIC.on); });
$q('#mMusic').addEventListener('click', () => musicSet(!MUSIC.on));
for (const id of ['#musVol', '#mMusVol']) { const r = $q(id); r.addEventListener('input', () => musicVolume(r.value / 100)); r.addEventListener('pointerdown', e => e.stopPropagation()); }
addEventListener('pointerdown', () => { if (!MUSIC.started) musicStart(); }, true);
addEventListener('keydown', e => {
  if (!MUSIC.started) musicStart();
  if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target && /input|textarea/i.test(e.target.tagName))) musicSet(!MUSIC.on);
}, true);
musicRender();
window.__music = MUSIC;
