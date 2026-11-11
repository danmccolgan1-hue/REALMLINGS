lines=open('page.html').read().split('\n')
r='\n'.join(lines[129:581])   # lines 130..581
def R(a,b):
    global r
    assert r.count(a)==1, a[:70]; r=r.replace(a,b)
R("""  // hovered province bounces
  if (hover) {
    const dt = reduceMotion ? 5 : t - hoverT;
    const s = 1.03 + 0.06 * Math.exp(-dt * 5) * Math.cos(dt * 16);
    const [cx, cy] = hover.ic;
    g.save(); g.translate(cx, cy - 2); g.scale(s, 2 - s); g.translate(-cx, -cy);
    drawProvince(g, hover, true); g.restore();
  }
""","")
R("  worldTx(g);\n  // numbers","  g.setTransform(1, 0, 0, 1, 0, 0); if (fogDirty) renderFog(); g.drawImage(fcache, 0, 0);\n  worldTx(g); drawGame(g, S.t);\n  // numbers")
R("  if (cacheDirty) renderCache();","  if (cacheDirty) { renderCache(); fogDirty = true; }")
R("  for (const it of G.still) if (it.x > vx0 && it.x < vx1 && it.y > vy0 && it.y < vy1) drawSprite(g, it);\n  if (lowDetail())","  drawTerritory(g);\n  for (const it of G.still) if (it.x > vx0 && it.x < vx1 && it.y > vy0 && it.y < vy1) drawSprite(g, it);\n  if (lowDetail())")
R("  if (!reduceMotion) requestAnimationFrame(frame);\n}","  requestAnimationFrame(frame);\n}")
R("  const t = now / 1000;\n  const b = bucket(); bake(b);","  const t = now / 1000;\n  update(t);\n  const b = bucket(); bake(b);")
R("cv.width = cache.width = Math.round(cw * dpr); cv.height = cache.height = Math.round(ch * dpr);","cv.width = cache.width = fcache.width = Math.round(cw * dpr); cv.height = cache.height = fcache.height = Math.round(ch * dpr);")
R("  cacheDirty = true; kick();\n}\nfunction fit()","  cacheDirty = true;\n}\nfunction fit()")

# ---- bigger provinces, thick border bands, blended terrain (see WORLD_K in game.js) ----
R("let bakedScale = 0;\n", """// v95: a date palm for the Desert Oasis' ring of palm trees
[0, 1].forEach(i => def('palm' + i, 40, 46, 20, 43, g => {
  const lean = i ? 4 : -3;
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(1, 0, 9, 3, 0, 0, 7); g.fill();
  // a curved, ringed trunk
  g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(lean * 0.2, -14, lean, -27);
  g.lineWidth = 7; g.strokeStyle = OL; g.stroke(); g.lineWidth = 4.2; g.strokeStyle = '#a77a48'; g.stroke();
  g.strokeStyle = 'rgba(80,50,25,0.55)'; g.lineWidth = 1.2; for (let k = 1; k < 6; k++) { const t = k / 6, x = lean * t * t, y = -27 * t; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 2, y - 1); g.stroke(); }
  // fronds: long drooping leaves
  const cx = lean, cy = -28;
  const fr = [[-15, 6], [-12, -6], [-3, -11], [8, -9], [15, -2], [14, 8], [-6, 10]];
  for (const [fx, fy] of fr) { g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + fx * 0.5, cy + fy * 0.5 - 6, cx + fx, cy + fy); g.lineWidth = 6.5; g.strokeStyle = OL; g.stroke(); }
  for (const [fx, fy] of fr) { g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + fx * 0.5, cy + fy * 0.5 - 6, cx + fx, cy + fy); g.lineWidth = 3.6; g.strokeStyle = fy < 0 ? '#5fbf4a' : '#3f9a3c'; g.stroke(); }
  // dates
  g.fillStyle = '#c0582a'; g.strokeStyle = OL; g.lineWidth = 1; for (const [dx, dy] of [[-2, 2], [1, 3], [3, 1]]) { g.beginPath(); g.arc(cx + dx, cy + dy, 1.8, 0, 7); g.fill(); g.stroke(); }
}));
// large copies of the border sprites for the thick border bands
for (const n of ['palm0', 'palm1', 'mtn0', 'mtn1', 'mtn2', 'tree0', 'tree1', 'tree2', 'pine0', 'pine1', 'cypress0', 'cypress1', 'pillar', 'arch', 'rock0', 'rock1']) { const s = SPR[n]; if (s) def(n + '_L', s.w * 2, s.h * 2, s.ax * 2, s.ay * 2, g => { g.scale(2, 2); s.fn(g); }); }
let bakedScale = 0;
""")
R("const inner = insetPoly(pts, kinds.map(k => k === 'open' ? 4 : k === 'bar' ? 16 : 10), c);", "const inner = insetPoly(pts, kinds.map(k => k === 'open' ? 6 : k === 'bar' ? BAND_IN : 18), c);")
R("      for (let k = 0; k < count; k++) {\n        if (name === 'grove'", "      for (let k = 0; k < count * DECOR_N; k++) {\n        if (name === 'grove'")
# border bands: two staggered rows of large sprites, about four times as thick as before
a = r.index("  w.edges.forEach(e => {\n    if (e.open || e.style === 'river') return;")
b = r.index("  sway.sort((a, b) => a.y - b.y); still.sort((a, b) => a.y - b.y);")
r = r[:a] + """  const treeL = swampy => treeFor(swampy) + '_L';
  w.edges.forEach(e => {
    if (e.open || e.style === 'river') return;
    const a = V[e.v[0]], b = V[e.v[1]], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const swampy = isSwamp(e.a) || isSwamp(e.b);
    const gap = e.style === 'mountains' ? 30 : e.style === 'ruins' ? 38 : 20;
    const n = Math.max(1, Math.round(len / gap));
    for (const row of [-1, 1]) for (let j = 0; j < n; j++) {
      const t = (j + 0.5 + (row > 0 ? 0.5 : 0)) / n; if (t > 1) continue;
      const off = row * (e.style === 'trees' ? 15 : 13) + (rnd() - 0.5) * 8;
      const x = a[0] + dx * t + nx * off, y = a[1] + dy * t + ny * off + 8;
      if (e.style === 'trees') sway.push({ x, y, s: treeL(swampy), ph: rnd() * 6.28 });
      else if (e.style === 'palms') sway.push({ x, y, s: 'palm' + (rnd() < 0.5 ? 0 : 1) + '_L', ph: rnd() * 6.28 });
      else if (e.style === 'mountains') { still.push({ x, y: y + 4, s: 'mtn' + Math.floor(rnd() * 3) + '_L' }); if (rnd() < 0.3) still.push({ x: x + nx * row * 14, y: y + ny * row * 14 + 10, s: 'mtn1_L' }); }
      else { still.push({ x, y, s: rnd() < 0.4 ? 'pillar_L' : 'arch_L' }); if (rnd() < 0.7) still.push({ x: x + (rnd() - 0.5) * 24, y: y + 8, s: 'rock' + (rnd() < 0.5 ? 0 : 1) + '_L' }); }   // ruins: stones only, no trees, so they never look like a forest border
    }
  });
  const vSwamp = new Map(); w.provinces.forEach(p => p.verts.forEach(v => { if (p.terrain === 'swamp') vSwamp.set(v, true); }));
  w.junctions.forEach(j => {
    const [x, y] = V[j.v];
    if (j.kind === 'river') return;
    const swampy = vSwamp.has(j.v);
    if (j.kind === 'palms') { for (const [ox, oy] of [[-12, 0], [12, 6], [0, 16]]) sway.push({ x: x + ox, y: y + oy, s: 'palm' + (rnd() < 0.5 ? 0 : 1) + '_L', ph: rnd() * 6.28 }); }
    else if (j.kind === 'trees') { for (const [ox, oy] of [[-14, 0], [14, 4], [0, 18], [0, -12]]) sway.push({ x: x + ox, y: y + oy, s: treeL(swampy), ph: rnd() * 6.28 }); }
    else if (j.kind === 'mountains') { still.push({ x: x - 10, y: y + 6, s: 'mtn2_L' }); still.push({ x: x + 14, y: y + 16, s: 'mtn1_L' }); still.push({ x: x + 2, y: y - 8, s: 'mtn0_L' }); }
    else if (j.kind === 'ruins') { still.push({ x: x - 8, y: y + 4, s: 'pillar_L' }); still.push({ x: x + 12, y: y + 12, s: 'rock0_L' }); }
    else still.push({ x, y: y + 6, s: 'rock' + (rnd() < 0.5 ? 0 : 1) + '_L' });
  });
""" + r[b:]
R("lakeMarks.push({ x: c[0] + (rnd() - 0.5) * 130, y: c[1] + (rnd() - 0.5) * 100 });", "lakeMarks.push({ x: c[0] + (rnd() - 0.5) * 130 * WORLD_K, y: c[1] + (rnd() - 0.5) * 100 * WORLD_K });")
R("pts.unshift(ext(pts[0], pts[1], 70));", "pts.unshift(ext(pts[0], pts[1], 70 * WORLD_K));")
R("if (r.lake !== null) pts.push(ext(pts[pts.length - 1], pts[pts.length - 2], 40));", "if (r.lake !== null) pts.push(ext(pts[pts.length - 1], pts[pts.length - 2], 40 * WORLD_K));")
R("""  for (let k = 0; waves.length < 560 && k < 8000; k++) {
    const x = x0 - 1100 + rnd() * (x1 - x0 + 2200), y = y0 - 900 + rnd() * (y1 - y0 + 1800);
    if (provs.some(p => Math.hypot(p.c[0] - x, p.c[1] - y) < 340)) continue;""", """  for (let k = 0; waves.length < 560 * WORLD_K && k < 8000 * WORLD_K; k++) {
    const x = x0 - 1100 * WORLD_K + rnd() * (x1 - x0 + 2200 * WORLD_K), y = y0 - 900 * WORLD_K + rnd() * (y1 - y0 + 1800 * WORLD_K);
    if (provs.some(p => Math.hypot(p.c[0] - x, p.c[1] - y) < 340 * WORLD_K)) continue;""")
R("  return { provs, sway, still, crossings, island, coast, lakes, lakeShore, lakeMarks, rivers, bounds: [x0, y0, x1, y1], waves, clouds };",
"""  // terrain painted once: each province's color, softly blended into its neighbors, with gentle darker patches
  const TS = Math.min(0.5, 2600 / Math.max(x1 - x0, y1 - y0)), PADT = 260;
  const tw = Math.ceil((x1 - x0 + PADT * 2) * TS), th = Math.ceil((y1 - y0 + PADT * 2) * TS);
  const tc = document.createElement('canvas'); tc.width = tw; tc.height = th;
  const tg = tc.getContext('2d'); tg.setTransform(TS, 0, 0, TS, -(x0 - PADT) * TS, -(y0 - PADT) * TS); tg.lineJoin = 'round';
  provs.forEach(p => { polyPath(tg, p.pts); tg.lineWidth = PADT * 2; tg.strokeStyle = TER[p.terrain].base; tg.stroke(); });
  provs.forEach(p => {
    polyPath(tg, p.pts); tg.fillStyle = TER[p.terrain].base; tg.fill();
    tg.save(); polyPath(tg, p.pts); tg.clip(); tg.globalAlpha = 0.35; tg.fillStyle = TER[p.terrain].shade;
    for (let k = 0; k < 7; k++) { const a = rnd() * 6.28, r0 = rnd() * 0.6, q = p.inner[Math.floor(rnd() * p.inner.length)]; const x = p.ic[0] + (q[0] - p.ic[0]) * r0, y = p.ic[1] + (q[1] - p.ic[1]) * r0; tg.beginPath(); tg.ellipse(x, y, 60 + rnd() * 90, 40 + rnd() * 60, a, 0, 7); tg.fill(); }
    tg.restore();
  });
  const terrain = document.createElement('canvas'); terrain.width = tw; terrain.height = th;
  const bg2 = terrain.getContext('2d');
  if ('filter' in bg2) { bg2.filter = 'blur(' + (BLEND * TS).toFixed(1) + 'px)'; bg2.drawImage(tc, 0, 0); bg2.filter = 'none'; }
  else { const sm = document.createElement('canvas'); sm.width = Math.ceil(tw / 10); sm.height = Math.ceil(th / 10); const sg = sm.getContext('2d'); sg.drawImage(tc, 0, 0, sm.width, sm.height); bg2.imageSmoothingQuality = 'high'; bg2.drawImage(sm, 0, 0, tw, th); }
  const terrainAt = { x: x0 - PADT, y: y0 - PADT, w: tw / TS, h: th / TS };
  // a thin line along every border between two provinces
  const borderLines = new Path2D();
  w.edges.forEach(e => { const a = V[e.v[0]], b = V[e.v[1]]; borderLines.moveTo(a[0], a[1]); borderLines.lineTo(b[0], b[1]); });
  return { provs, sway, still, crossings, island, coast, lakes, lakeShore, lakeMarks, rivers, bounds: [x0, y0, x1, y1], waves, clouds, terrain, terrainAt, borderLines };""")
R("""  g.lineWidth = Math.max(8, 3 * px); g.strokeStyle = OL; g.stroke(G.island);
  g.fillStyle = WILDS; g.fill(G.island);
  g.lineWidth = 24; g.strokeStyle = SAND; g.stroke(G.coast);""", """  g.lineWidth = Math.max(8, 3 * px); g.strokeStyle = OL; g.stroke(G.island);
  g.save(); g.clip(G.island); g.imageSmoothingQuality = 'high'; g.drawImage(G.terrain, G.terrainAt.x, G.terrainAt.y, G.terrainAt.w, G.terrainAt.h); g.restore();
  g.lineWidth = Math.max(1.6, 1.3 * px); g.strokeStyle = 'rgba(29,26,34,0.5)'; g.stroke(G.borderLines);
  g.lineWidth = 24; g.strokeStyle = SAND; g.stroke(G.coast);""")
R("  if (lowDetail()) for (const it of G.sway) if (it.x > vx0 && it.x < vx1 && it.y > vy0 && it.y < vy1) drawSprite(g, it);\n", "  if (lowDetail()) for (const it of G.sway) if (it.x > vx0 && it.x < vx1 && it.y > vy0 && it.y < vy1) drawSprite(g, it);\n  drawTerritoryTop(g);\n")
R("  for (const p of G.provs) if (vis(p)) drawProvince(g, p, false);", "  for (const p of G.provs) if (vis(p)) for (const it of p.items) drawSprite(g, it);")
R("""  for (const r of G.rivers) { g.lineWidth = Math.max(24, 18 + 3 / cam.z); g.strokeStyle = OL; g.stroke(r); }
  for (const r of G.rivers) { g.lineWidth = 17; g.strokeStyle = '#45a8e4'; g.stroke(r); }
  g.setLineDash([10, 26]); g.lineDashOffset = reduceMotion ? 0 : -t * 30;
  for (const r of G.rivers) { g.lineWidth = 3.5; g.strokeStyle = '#c7ecff'; g.stroke(r); }""", """  for (const r of G.rivers) { g.lineWidth = Math.max(76, 70 + 3 / cam.z); g.strokeStyle = OL; g.stroke(r); }
  for (const r of G.rivers) { g.lineWidth = 68; g.strokeStyle = '#45a8e4'; g.stroke(r); }
  for (const r of G.rivers) { g.lineWidth = 34; g.strokeStyle = '#3a98d6'; g.stroke(r); }
  g.setLineDash([14, 34]); g.lineDashOffset = reduceMotion ? 0 : -t * 30;
  for (const r of G.rivers) { g.lineWidth = 4; g.strokeStyle = '#c7ecff'; g.stroke(r); }""")
R("const x = bx0 - 1200 + ((cl.x - bx0 + 1200 + (reduceMotion ? 0 : t * cl.v * 5)) % span + span) % span, y = cl.y, s = cl.s * 5.6;", "const x = bx0 - 1200 + ((cl.x - bx0 + 1200 + (reduceMotion ? 0 : t * cl.v * 5)) % span + span) % span, y = cl.y, s = cl.s * 5.6 * WORLD_K;")
# ---- the frame loop never dies: an error in one frame is reported once and the next frame still runs ----
R("function frame(now) {", "function frameBody(now) {")
R("  requestAnimationFrame(frame);\n}", """}
const frameErrs = new Set();
function reportError(e, where) {
  const msg = (e && e.message) || String(e);
  (window.__errors = window.__errors || []).push({ where, msg, stack: e && e.stack, t: Date.now() });
  if (frameErrs.has(where + msg)) return; frameErrs.add(where + msg);
  console.error('Realmlings error in ' + where + ':', e);
  try { const el = document.querySelector('#toast'); if (el) { el.textContent = 'Something went wrong (' + where + ': ' + msg + '). The game keeps running; please tell Claude what you were doing.'; el.classList.add('bad'); el.hidden = false; } } catch (x) {}
}
function frame(now) {
  try { frameBody(now); } catch (e) { reportError(e, 'frame'); }
  requestAnimationFrame(frame);
}""")
# the loop always runs (above), so kick() must not start a second one
R("function kick() { if (reduceMotion && G && !pending) { pending = true; requestAnimationFrame(n => { pending = false; frame(n); }); } }", "function kick() { }")
import base64, glob, os, json
def sfx_data():
    d = {os.path.basename(f)[:-4]: base64.b64encode(open(f, 'rb').read()).decode() for f in sorted(glob.glob('sfx/*.mp3'))}
    return '\nconst SFX_DATA = ' + json.dumps(d) + ';\n'
script = "(function () {\n'use strict';\n" + r + "\n" + open('game.js').read().replace('fit(); setupBar(); bootMenu();', open('war.js').read() + open('equip.js').read() + open('tech.js').read() + open('techicons.js').read() + open('govtech.js').read() + open('magic.js').read() + open('menu.js').read() + sfx_data() + open('sound.js').read() + open('features.js').read() + open('flags.js').read() + open('content.js').read() + open('ai.js').read() + open('gpc.js').read() + open('v78.js').read() + open('swamp.js').read() + open('wood.js').read() + open('v95.js').read() + open('save.js').read() + '\nfit(); setupBar(); bootMenu();') + "\n})();"
shell=open('game_shell.html').read()
out = shell + "\n<script>\n" + open('gen.js').read() + "\n</script>\n<script>\n" + open('iso.js').read() + "\n</script>\n<script>\n" + open('buildings.js').read() + "\n</script>\n<script>\n" + open('buildings2.js').read() + "\n</script>\n<script>\n" + open('swampbld.js').read() + "\n</script>\n<script>\n" + open('woodbld.js').read() + "\n</script>\n<script>\n" + script + "\n</script>\n"
open('realmlings_play.html','w').write(out)
open('index.html','w').write(out)   # the same page as index.html (lowercase: GitHub Pages only serves index.html, and GitHub is case-sensitive)
print('ok', len(out))
