
// ================= sound effects =================
// Chosen in the sound picker. Played through Web Audio so they can overlap, vary a little in pitch each time,
// get quieter with distance from the camera, and be rate-limited so busy moments don't turn into noise.
const SFX_FILES = {
  sel_wayfinder: 0.7, sel_mason: 0.7, sel_soldier: 0.7, sel_mage: 0.7,
  mv_wayfinder: 0.5, mv_mason: 0.55, mv_army: 0.6, mv_cavalry: 0.6, mv_mage: 0.5,
  ui_click: 0.35, ui_panel: 0.5, ui_error: 0.45,
  bld_work: 0.4, bld_done: 0.7, bld_outpost: 0.65,
  bat_loop: 0.75, bat_blades: 0.3, bat_fall: 0.4, bat_win: 0.8, bat_lose: 0.8,
  war_declare: 0.9, war_peace: 0.8, war_fort_win: 0.8, war_fort_lose: 0.8,
  pr_research: 0.55, pr_research_magic: 0.6, pr_trained: 0.55, pr_survey: 0.5,
  mg_life: 0.65, mg_death: 0.65, mg_arcane: 0.65, mg_rift: 0.7, mg_risen: 0.55, mg_school: 0.8,
  wn_exhaust: 0.85, wn_unrest: 0.8, wn_enemy: 0.8, wn_ally: 0.8
};
// smallest gap between two plays of the same sound (seconds)
const SFX_GAP = { ui_click: 0.05, ui_error: 0.4, bat_fall: 0.35, mg_risen: 0.6, bld_work: 1.5, wn_enemy: 30, sel_wayfinder: 0.25, sel_mason: 0.25, sel_soldier: 0.25, sel_mage: 0.25 };
// stingers keep their pitch; everything else varies a little
const SFX_STEADY = new Set(['war_declare', 'war_peace', 'war_fort_win', 'war_fort_lose', 'bat_win', 'bat_lose', 'pr_research', 'pr_research_magic', 'mg_school', 'wn_exhaust', 'wn_enemy', 'wn_ally', 'bat_loop']);
const SND = { ctx: null, master: null, buf: {}, last: {}, on: true, vol: 0.7, loop: null, loopGain: null };
try { const sv = JSON.parse(localStorage.getItem('realmlings-sfx') || 'null'); if (sv) { SND.on = !!sv.on; SND.vol = Math.max(0, Math.min(1, +sv.vol)); } } catch (e) {}
function sndSave() { try { localStorage.setItem('realmlings-sfx', JSON.stringify({ on: SND.on, vol: SND.vol })); } catch (e) {} }
function sndInit() {
  if (SND.ctx) { if (SND.ctx.state === 'suspended') SND.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  SND.ctx = new AC(); SND.master = SND.ctx.createGain(); SND.master.gain.value = SND.on ? SND.vol : 0; SND.master.connect(SND.ctx.destination);
  // the sounds travel inside the page itself, so they work wherever the page is opened (no separate downloads to be blocked)
  const b64 = str => { const bin = atob(str), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out.buffer; };
  const decode = buf => new Promise((ok, bad) => { try { const pr = SND.ctx.decodeAudioData(buf, ok, bad); if (pr && pr.then) pr.then(ok, bad); } catch (e) { bad(e); } });
  for (const k of Object.keys(SFX_FILES)) {
    const src = typeof SFX_DATA !== 'undefined' && SFX_DATA[k] ? Promise.resolve(b64(SFX_DATA[k])) : fetch('sfx/' + k + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status));
    src.then(decode).then(d => { SND.buf[k] = d; }).catch(() => {});
  }
}
// how loud something at province p should be, from where the camera is looking (1 on screen, fading to 0 two screens away)
function sndNear(p) {
  if (p === undefined || p < 0 || !G.provs[p]) return 1;
  const [sx, sy] = [(G.provs[p].ic[0] - cam.x) * cam.z + cw / 2, (G.provs[p].ic[1] - cam.y) * cam.z + ch / 2];
  const dx = Math.max(0, Math.abs(sx - cw / 2) - cw / 2), dy = Math.max(0, Math.abs(sy - ch / 2) - ch / 2);
  const off = Math.hypot(dx, dy) / Math.max(cw, ch);
  return Math.max(0, 1 - off / 1.2);
}
function sfx(name, opts = {}) {
  if (!SND.ctx || !SND.on || !SFX_FILES[name]) return;   // sounds still play while paused (clicks, panels)
  const now = SND.ctx.currentTime, gap = SFX_GAP[name] ?? 0.08;
  if (SND.last[name] !== undefined && now - SND.last[name] < gap) return;
  const b = SND.buf[name]; if (!b) return;
  const near = opts.prov !== undefined ? sndNear(opts.prov) : 1; if (near <= 0.02) return;
  SND.last[name] = now; if (!name.startsWith('ui_') && !name.startsWith('sel_') && !name.startsWith('mv_')) SND.lastBig = now;
  const src = SND.ctx.createBufferSource(); src.buffer = b;
  if (!SFX_STEADY.has(name)) src.playbackRate.value = 0.95 + Math.random() * 0.1;
  const g = SND.ctx.createGain(); g.gain.value = SFX_FILES[name] * near * (opts.vol ?? 1);
  src.connect(g); g.connect(SND.master); src.start();
}
// the clash of blades loops while one of your battles is on screen
function sndBattleLoop() {
  if (!SND.ctx || !SND.buf.bat_blades) return;
  const mine = S.battles.filter(b => b.start && b.start[ME] !== undefined);
  const near = mine.reduce((m, b) => Math.max(m, sndNear(b.prov)), 0);
  if (!SND.loop && near > 0.02 && SND.on && !S.paused) {
    SND.loop = SND.ctx.createBufferSource(); SND.loop.buffer = SND.buf.bat_blades; SND.loop.loop = true;
    SND.loopGain = SND.ctx.createGain(); SND.loopGain.gain.value = 0; SND.loop.connect(SND.loopGain); SND.loopGain.connect(SND.master); SND.loop.start();
  }
  if (SND.loop) {
    SND.loopGain.gain.setTargetAtTime(SFX_FILES.bat_blades * near, SND.ctx.currentTime, 0.4);
    if (near <= 0.02 || !SND.on) { const l = SND.loop; setTimeout(() => { try { l.stop(); } catch (e) {} }, 1500); SND.loopGain.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.3); SND.loop = null; }
  }
}
// a hostile army stepping into your land (checked about once a second)
let sndEnemySeen = new Set(), sndCheckT = 0;
function sndWatch(t) {
  if (t < sndCheckT) return; sndCheckT = t + 1;
  sndBattleLoop();
  const now = new Set();
  for (const v of S.units) if (v.kind === 'army' && v.owner !== ME && hostile(v.owner, ME) && owned(v.prov)) now.add(v.id + ':' + v.prov);
  for (const k of now) if (!sndEnemySeen.has(k)) { sfx('wn_enemy'); break; }
  sndEnemySeen = now;
}
// which unit voice / footsteps fit a selection
function sndKind(u) {
  if (!u) return null;
  if (u.kind === WAYFINDER) return 'wayfinder';
  if (u.kind === MASON) return 'mason';
  if (u.kind === MAGE) return 'mage';
  if (u.kind === 'army') { let cav = 0, n = 0; for (const k in u.troops) { n += u.troops[k]; if (isCav(k)) cav += u.troops[k]; } return cav * 2 > n ? 'cavalry' : 'soldier'; }
  return null;
}
let sndSelKey = '';
function sndSelection() {
  const key = S.selected.map(u => u.id).join(',');
  if (key === sndSelKey) return; const was = sndSelKey; sndSelKey = key;
  if (!key || !S.selected[0] || S.selected[0].owner !== ME) return;
  if (was && key.startsWith(was) && key.length > was.length) return;   // adding to a selection stays quiet
  const k = sndKind(S.selected[0]); if (k) sfx('sel_' + (k === 'cavalry' ? 'soldier' : k));
}
function sndMove(units) { const k = sndKind(units[0]); if (k) sfx('mv_' + (k === 'soldier' ? 'army' : k)); }
// controls
function sndRender() {
  for (const id of ['#sfxBtn', '#mSfx']) { const b = $q(id); if (!b) continue; b.setAttribute('aria-pressed', SND.on ? 'true' : 'false'); if (b.querySelector('span')) b.querySelector('span').textContent = SND.on ? 'On' : 'Off'; }
  for (const id of ['#sfxVol', '#mSfxVol']) { const r = $q(id); if (r && +r.value !== Math.round(SND.vol * 100)) r.value = Math.round(SND.vol * 100); }
}
function sndSet(on) { SND.on = on; sndSave(); sndRender(); if (SND.master) SND.master.gain.setTargetAtTime(on ? SND.vol : 0, SND.ctx.currentTime, 0.05); if (on) { sndInit(); sfx('ui_click'); } }
function sndVolume(v) { SND.vol = v; sndSave(); sndRender(); if (SND.master && SND.on) SND.master.gain.setTargetAtTime(v, SND.ctx.currentTime, 0.03); }
$q('#sfxBtn').addEventListener('click', e => { e.stopPropagation(); sndSet(!SND.on); });
$q('#mSfx').addEventListener('click', () => sndSet(!SND.on));
for (const id of ['#sfxVol', '#mSfxVol']) { const r = $q(id); r.addEventListener('input', () => sndVolume(r.value / 100)); r.addEventListener('change', () => sfx('ui_click')); r.addEventListener('pointerdown', e => e.stopPropagation()); }
for (const ev of ['pointerdown', 'pointerup', 'keydown', 'click', 'touchend']) addEventListener(ev, () => { sndInit(); if (SND.ctx && SND.ctx.state === 'suspended') SND.ctx.resume(); }, true);
// every button gives the paper tick
document.addEventListener('click', e => { if (e.target.closest('button, .cmd-cell, [role="button"]') && !e.target.closest('#sfxBtn, #mSfx')) sfx('ui_click'); }, true);
sndRender();
window.__sfx = { SND, sfx, sndNear };
// error thunks stay quiet right after a big sound (war declared, etc.), which often arrives with a red message
function sndQuietFor() { return !SND.ctx || SND.ctx.currentTime - (SND.lastBig || -9) > 0.8; }
// pausing the game keeps sound effects on and plays the music at half volume; resuming brings the music back up
function soundPaused(p) {
  if (p && SND.loop) { const l = SND.loop; SND.loopGain.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.05); setTimeout(() => { try { l.stop(); } catch (e) {} }, 300); SND.loop = null; }   // frozen battles stop clashing
  if (MUSIC.el && MUSIC.on && MUSIC.started) { if (MUSIC.el.paused) { const pr = MUSIC.el.play(); if (pr && pr.catch) pr.catch(() => {}); } musicFadeTo(musicTarget(), 0.6); }
}
$q('#pauseBtn').addEventListener('click', e => { e.stopPropagation(); togglePause(); });
$q('#pauseBtn').addEventListener('pointerdown', e => e.stopPropagation());
// full screen: the whole game page fills the monitor (Esc or the button again leaves)
function fsRender() { const b = $q('#fsBtn'); if (b) b.setAttribute('aria-pressed', document.fullscreenElement ? 'true' : 'false'); }
$q('#fsBtn').addEventListener('click', e => {
  e.stopPropagation();
  const el = document.documentElement;
  if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) { toast('Full screen is not available here. Open the game in its own tab and press F11.', true); return; }
  const pr = req.call(el); if (pr && pr.catch) pr.catch(() => toast('Full screen was blocked here. Open the game in its own tab and press F11.', true));
});
$q('#fsBtn').addEventListener('pointerdown', e => e.stopPropagation());
document.addEventListener('fullscreenchange', () => { fsRender(); setTimeout(() => window.dispatchEvent(new Event('resize')), 50); });

// ---------- settings (gear, top-left) ----------
// opening pauses the game; closing resumes it unless it was already paused before
let stPausedByMe = false;
function showHow(on) { $q('#stMain').hidden = on; $q('#stHowBody').hidden = !on; $q('.settings').classList.toggle('how', on); }
function openSettings() {
  if (!$q('#settings').hidden) return;
  stPausedByMe = !S.paused; if (!S.paused) togglePause();
  $q('#paused').hidden = true; showHow(false); $q('#settings').hidden = false; $q('#gearBtn').setAttribute('aria-expanded', 'true');
  $q('#stResume').focus();
}
function closeSettings() {
  if ($q('#settings').hidden) return;
  $q('#settings').hidden = true; $q('#gearBtn').setAttribute('aria-expanded', 'false');
  if (stPausedByMe && S.paused) togglePause(); else $q('#paused').hidden = !S.paused;
  stPausedByMe = false; $q('#gearBtn').blur();
}
$q('#gearBtn').addEventListener('click', e => { e.stopPropagation(); if ($q('#settings').hidden) openSettings(); else closeSettings(); });
$q('#gearBtn').addEventListener('pointerdown', e => e.stopPropagation());
$q('#settings').addEventListener('pointerdown', e => e.stopPropagation());
$q('#settings').addEventListener('click', e => {
  if (e.target === $q('#settings') || e.target.closest('#stClose, #stResume')) { closeSettings(); return; }
  if (e.target.closest('#stQuit')) {
    const b = $q('#stQuit');
    if (b.dataset.armed && performance.now() - +b.dataset.armed < 5000) { try { sessionStorage.setItem('realm-skip-intro', '1'); } catch (er) {} location.reload(); return; }
    b.dataset.armed = performance.now(); b.textContent = 'Leave this game? Click again'; setTimeout(() => { b.textContent = 'Return to main menu'; delete b.dataset.armed; }, 5000);
    return;
  }
  if (e.target.closest('#stHow')) { showHow(true); $q('#stBack').focus(); return; }
  if (e.target.closest('#stBack')) { showHow(false); $q('#stHow').focus(); }
});
$q('#settings').addEventListener('wheel', e => e.stopPropagation(), { passive: true });
window.addEventListener('keydown', e => {
  if ($q('#settings').hidden) return;
  const inInput = e.target && /INPUT|TEXTAREA/.test(e.target.tagName);
  if (e.key === 'Escape' || (e.key === ' ' && !inInput)) { e.preventDefault(); if (e.key === 'Escape' && !$q('#stHowBody').hidden) showHow(false); else closeSettings(); }
  if (!inInput && e.key !== 'Tab' && e.key !== 'Enter') e.stopImmediatePropagation();
}, true);
