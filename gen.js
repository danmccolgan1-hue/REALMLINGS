/* Realmlings — world generator (no dependencies). Works in browser and Node. */
(function (root) {
  'use strict';

  const W = 9390, H = 6976, S = 286;         // world size, cell spacing (provinces ~20x the first prototype)
  const NPROV = 200;
  const MIN_EDGE = 40;                        // shorter Voronoi edges collapse to a point
  const TERRAINS = ['grassland', 'forest', 'desert', 'swamp'];

  // ---------- RNG ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedRng(str) {
    let h = 2166136261 >>> 0;
    for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return mulberry32(h);
  }
  function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------- Delaunay (Bowyer–Watson) ----------
  function circ(P, a, b, c) {
    const ax = P[a][0], ay = P[a][1], bx = P[b][0], by = P[b][1], cx = P[c][0], cy = P[c][1];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const x = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
    const y = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
    return { a, b, c, x, y, r2: (ax - x) ** 2 + (ay - y) ** 2 };
  }
  function triangulate(P0) {
    const n = P0.length, P = P0.slice();
    const big = Math.max(W, H) * 20;
    P.push([W / 2 - big, H / 2 - big], [W / 2 + big, H / 2 - big], [W / 2, H / 2 + big]);
    let tris = [circ(P, n, n + 1, n + 2)];
    for (let i = 0; i < n; i++) {
      const x = P[i][0], y = P[i][1], keep = [], em = new Map();
      for (const t of tris) {
        const dx = x - t.x, dy = y - t.y;
        if (dx * dx + dy * dy < t.r2) {
          for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
            const k = u < v ? u * 100000 + v : v * 100000 + u;
            if (em.has(k)) em.delete(k); else em.set(k, [u, v]);
          }
        } else keep.push(t);
      }
      for (const [u, v] of em.values()) keep.push(circ(P, u, v, i));
      tris = keep;
    }
    return tris.filter(t => t.a < n && t.b < n && t.c < n);
  }
  const ekey = (u, v) => (u < v ? u * 100000 + v : v * 100000 + u);
  function buildMesh(P) {
    const tris = triangulate(P);
    const edgeTris = new Map(), ptTris = P.map(() => []);
    tris.forEach((t, ti) => {
      ptTris[t.a].push(ti); ptTris[t.b].push(ti); ptTris[t.c].push(ti);
      for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
        const k = ekey(u, v); let l = edgeTris.get(k); if (!l) { l = []; edgeTris.set(k, l); } l.push(ti);
      }
    });
    P.forEach(([x, y], i) => {
      ptTris[i].sort((p, q) => Math.atan2(tris[p].y - y, tris[p].x - x) - Math.atan2(tris[q].y - y, tris[q].x - x));
    });
    return { tris, edgeTris, ptTris };
  }
  function polyCentroid(pts) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      const f = x0 * y1 - x1 * y0; a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
    }
    a *= 0.5;
    return [cx / (6 * a), cy / (6 * a), Math.abs(a)];
  }

  // ---------- geometry helpers ----------
  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }
  function distPolyline(px, py, pl) {
    let d = Infinity;
    for (let i = 0; i < pl.length - 1; i++) d = Math.min(d, distSeg(px, py, pl[i][0], pl[i][1], pl[i + 1][0], pl[i + 1][1]));
    return d;
  }
  const angDiff = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };

  // ---------- one generation attempt ----------
  function tryGenerate(rng) {
    // 1. points: hex-ish jittered grid + outer frame
    const P = [], frame = [];
    const rowH = S * 0.866;
    for (let r = 0, y = rowH / 2; y < H - rowH / 3; r++, y += rowH) {
      for (let x = (r % 2 ? S : S / 2); x < W - S / 3; x += S) {
        P.push([x + (rng() - 0.5) * S * 0.7, y + (rng() - 0.5) * rowH * 0.7]); frame.push(false);
      }
    }
    for (const off of [S * 0.6, S * 1.8]) {
      for (let x = -off; x <= W + off; x += S) { P.push([x, -off]); P.push([x, H + off]); frame.push(true, true); }
      for (let y = -off + S; y < H + off; y += S) { P.push([-off, y]); P.push([W + off, y]); frame.push(true, true); }
    }
    // 2. Lloyd relaxation
    for (let it = 0; it < 2; it++) {
      const m = buildMesh(P);
      for (let i = 0; i < P.length; i++) {
        if (frame[i]) continue;
        const pts = m.ptTris[i].map(t => [m.tris[t].x, m.tris[t].y]);
        const [cx, cy] = polyCentroid(pts);
        if (isFinite(cx)) P[i] = [Math.max(S * 0.3, Math.min(W - S * 0.3, cx)), Math.max(S * 0.3, Math.min(H - S * 0.3, cy))];
      }
    }
    const mesh = buildMesh(P);
    const { tris, edgeTris, ptTris } = mesh;
    const N = P.length;

    // 3. merge vertices joined by very short Voronoi edges
    const uf = tris.map((_, i) => i);
    const find = x => { while (uf[x] !== x) { uf[x] = uf[uf[x]]; x = uf[x]; } return x; };
    for (const [k, l] of edgeTris) {
      if (l.length !== 2) continue;
      const a = tris[l[0]], b = tris[l[1]];
      if (Math.hypot(a.x - b.x, a.y - b.y) < MIN_EDGE) uf[find(l[0])] = find(l[1]);
    }
    const repSum = new Map();
    tris.forEach((t, i) => { const r = find(i); const s = repSum.get(r) || [0, 0, 0]; s[0] += t.x; s[1] += t.y; s[2]++; repSum.set(r, s); });
    const repPos = new Map(); for (const [r, s] of repSum) repPos.set(r, [s[0] / s[2], s[1] / s[2]]);

    // cells
    const cellV = new Array(N).fill(null), sides = new Int16Array(N), nearFrame = new Uint8Array(N);
    const touch = P.map(() => new Set());   // any adjacency (incl. corner)
    const border = P.map(() => new Map());  // significant shared edge: nb -> [repA, repB]
    for (const [k, l] of edgeTris) {
      const u = Math.floor(k / 100000), v = k % 100000;
      touch[u].add(v); touch[v].add(u);
      if (frame[u] && !frame[v]) nearFrame[v] = 1;
      if (frame[v] && !frame[u]) nearFrame[u] = 1;
      if (l.length === 2) {
        const ra = find(l[0]), rb = find(l[1]);
        if (ra !== rb) { border[u].set(v, [ra, rb]); border[v].set(u, [ra, rb]); }
      }
    }
    for (let i = 0; i < N; i++) {
      if (frame[i]) continue;
      const vs = [];
      for (const t of ptTris[i]) { const r = find(t); if (vs[vs.length - 1] !== r) vs.push(r); }
      while (vs.length > 1 && vs[0] === vs[vs.length - 1]) vs.pop();
      cellV[i] = vs; sides[i] = vs.length;
    }
    const valid = i => !frame[i] && !nearFrame[i] && sides[i] >= 5 && sides[i] <= 8;

    // 4. island field with deliberate peninsulas and coves
    let cellArea = 0, cnt = 0;
    for (let i = 0; i < N; i++) if (!frame[i] && !nearFrame[i]) { cellArea += polyCentroid(cellV[i].map(r => repPos.get(r)))[2]; cnt++; }
    cellArea /= cnt;
    const ratio = 1.32 + rng() * 0.12;
    const nLakes = 1 + Math.floor(rng() * 3), lakeSizes = Array.from({ length: nLakes }, () => 2 + Math.floor(rng() * 2));
    const LAKE_CELLS = lakeSizes.reduce((a, b) => a + b, 0), TARGET = NPROV + LAKE_CELLS;
    const A = Math.sqrt(TARGET * cellArea * ratio / Math.PI), B = A / ratio;
    const C = [W / 2 + (rng() - 0.5) * 50, H / 2 + (rng() - 0.5) * 40];
    const harm = []; for (let k = 2; k <= 6; k++) harm.push([k, (0.55 / k) * (0.5 + rng()), rng() * 7]);
    const nAng = th => harm.reduce((s, [k, a, ph]) => s + a * Math.sin(k * th + ph), 0);
    const coastR = th => { const c = Math.cos(th), s = Math.sin(th); return (1 / Math.sqrt((c / A) ** 2 + (s / B) ** 2)) * (1 + 0.13 * nAng(th)); };
    const ph1 = rng() * 7, ph2 = rng() * 7;

    // pick angles
    let pens = [], coves = [];
    for (let t = 0; t < 200 && pens.length < 2; t++) {
      const a = rng() * Math.PI * 2;
      if (pens.every(p => angDiff(p, a) > 1.9)) pens.push(a);
    }
    for (let t = 0; t < 400 && coves.length < 2; t++) {
      const a = rng() * Math.PI * 2;
      if (pens.every(p => angDiff(p, a) > 0.85) && coves.every(c => angDiff(c, a) > 1.2)) coves.push(a);
    }
    if (pens.length < 2 || coves.length < 2) return { ok: false, reason: 'feature angles' };
    const at = (th, f) => [C[0] + Math.cos(th) * coastR(th) * f, C[1] + Math.sin(th) * coastR(th) * f];
    const perp = th => [-Math.sin(th), Math.cos(th)];
    const penLines = pens.map(th => {
      const bend = (rng() - 0.5) * 2 * 246, pp = perp(th), tip = at(th, 1.42);
      return { th, line: [at(th, 0.55), at(th, 1.02), [tip[0] + pp[0] * bend, tip[1] + pp[1] * bend]], hw: S * 0.95 };
    });
    const coveLines = coves.map(th => ({ th, line: [at(th, 1.7), at(th, 0.6)], hw: S * 0.78 }));
    function field(x, y) {
      const dx = x - C[0], dy = y - C[1], th = Math.atan2(dy, dx);
      let f = 1 - Math.hypot(dx, dy) / coastR(th) + 0.04 * (Math.sin(x / 273 + ph1) + Math.sin(y / 238 + ph2));
      for (const p of penLines) { const d = distPolyline(x, y, p.line); if (d < p.hw) f = Math.max(f, 0.32 + 0.3 * (1 - d / p.hw)); }
      for (const c of coveLines) { if (distPolyline(x, y, c.line) < c.hw) f = -5; }
      return f;
    }
    const F = P.map(([x, y]) => field(x, y));

    // 5. grow island over shared edges, highest field first
    let start = -1;
    for (let i = 0; i < N; i++) if (valid(i) && (start < 0 || F[i] > F[start])) start = i;
    const land = new Uint8Array(N); land[start] = 1; let nLand = 1;
    const front = new Set([...border[start].keys()].filter(valid));
    while (nLand < TARGET) {
      let best = -1; for (const v of front) if (!land[v] && (best < 0 || F[v] > F[best])) best = v;
      if (best < 0 || F[best] < -2) return { ok: false, reason: 'growth stalled' };
      land[best] = 1; nLand++; front.delete(best);
      for (const w of border[best].keys()) if (!land[w] && valid(w)) front.add(w);
    }
    // 6. fill lakes, then trim lowest coast cells
    const oceanReach = () => {
      const seen = new Uint8Array(N), q = [];
      for (let i = 0; i < N; i++) if (frame[i]) { seen[i] = 1; q.push(i); }
      while (q.length) { const u = q.pop(); for (const w of border[u].keys()) if (!seen[w] && !land[w]) { seen[w] = 1; q.push(w); } }
      return seen;
    };
    const landConnected = () => {
      const s = [...Array(N).keys()].find(i => land[i]); const seen = new Uint8Array(N); seen[s] = 1; const q = [s]; let c = 1;
      while (q.length) { const u = q.pop(); for (const w of border[u].keys()) if (land[w] && !seen[w]) { seen[w] = 1; c++; q.push(w); } }
      return c === nLand;
    };
    let reach = oceanReach();
    for (let i = 0; i < N; i++) {
      if (!land[i] && !reach[i]) {
        if (!valid(i)) return { ok: false, reason: 'lake on invalid cell' };
        land[i] = 1; nLand++;
      }
    }
    const protectedCell = i => penLines.some(p => distPolyline(P[i][0], P[i][1], p.line) < p.hw);
    while (nLand > TARGET) {
      reach = oceanReach();
      const cand = [];
      for (let i = 0; i < N; i++) if (land[i] && !protectedCell(i) && [...border[i].keys()].some(w => !land[w] && reach[w])) cand.push(i);
      cand.sort((a, b) => F[a] - F[b]);
      let done = false;
      for (const c of cand) { land[c] = 0; nLand--; if (landConnected()) { done = true; break; } land[c] = 1; nLand++; }
      if (!done) return { ok: false, reason: 'trim failed' };
    }
    reach = oceanReach();
    for (let i = 0; i < N; i++) if (!land[i] && !reach[i]) return { ok: false, reason: 'lake remains' };
    if (!landConnected()) return { ok: false, reason: 'not one landmass' };
    // no single-file corridors: a province with two land borders must have those two neighbors touching,
    // otherwise "block half the borders" and "everything reachable" contradict each other
    const noCorridors = () => {
      for (let i = 0; i < N; i++) {
        if (!land[i]) continue;
        const nb = [...border[i].keys()].filter(w => land[w]);
        if (nb.length === 2 && !border[nb[0]].has(nb[1])) return false;
      }
      return true;
    };
    if (!noCorridors()) return { ok: false, reason: 'corridor' };

    // 6b. carve 1–3 inland lakes, each 2–3 cells, with at least two provinces of land between lake and sea
    const isLake = new Uint8Array(N), lakes = [];
    const nearLake = i => [...touch[i]].some(w => isLake[w]);
    function deepCell(i) {
      if (!land[i]) return false;
      for (const w of touch[i]) { if (!land[w] && !isLake[w]) return false; for (const x of touch[w]) if (!land[x] && !isLake[x]) return false; }
      return true;
    }
    for (const size of lakeSizes) {
      let placed = false;
      const seeds = shuffle([...Array(N).keys()].filter(i => deepCell(i) && !nearLake(i)), rng);
      for (const sd of seeds.slice(0, 40)) {
        const lc = [sd];
        while (lc.length < size) {
          const opts = [...new Set(lc.flatMap(c => [...border[c].keys()]))].filter(w => !lc.includes(w) && deepCell(w) && !nearLake(w));
          if (!opts.length) break;
          lc.push(opts[Math.floor(rng() * opts.length)]);
        }
        if (lc.length < size) continue;
        lc.forEach(c => { land[c] = 0; }); nLand -= size;
        if (landConnected() && noCorridors()) { lc.forEach(c => { isLake[c] = 1; }); lakes.push(lc); placed = true; break; }
        lc.forEach(c => { land[c] = 1; }); nLand += size;
      }
      if (!placed) return { ok: false, reason: 'lake placement' };
    }
    const reach2 = oceanReach();
    const lakesInland = lakes.every(lc => lc.every(c => !reach2[c]));

    // 7. verify peninsulas and coves geometrically
    const coastAt = th => coastR(th);
    function axisCoords(i, th) {
      const dx = P[i][0] - C[0], dy = P[i][1] - C[1];
      return [dx * Math.cos(th) + dy * Math.sin(th), -dx * Math.sin(th) + dy * Math.cos(th)];
    }
    const penReport = penLines.map(p => {
      const outer = [];
      for (let i = 0; i < N; i++) {
        if (!land[i]) continue;
        const [t] = axisCoords(i, p.th);
        if (t > coastAt(p.th) * 1.0 && distPolyline(P[i][0], P[i][1], p.line) < p.hw * 1.3) outer.push(i);
      }
      // a narrow strip: every outer cell touches the sea, and the sea runs along both flanks
      let coastal = 0, L = false, R = false;
      for (const i of outer) {
        let touches = false;
        for (const w of border[i].keys()) {
          if (land[w]) continue;
          touches = true;
          const s = (P[w][0] - P[i][0]) * -Math.sin(p.th) + (P[w][1] - P[i][1]) * Math.cos(p.th);
          if (s > 21) L = true; if (s < -21) R = true;
        }
        if (touches) coastal++;
      }
      const flanked = coastal;
      return { angle: p.th, cells: outer.length, flanked, ok: outer.length >= 3 && coastal === outer.length && L && R, line: p.line };
    });
    const coveReport = coveLines.map(c => {
      const inner = [];
      for (let i = 0; i < N; i++) {
        if (land[i] || !reach[i] || frame[i]) continue;
        const [t] = axisCoords(i, c.th);
        if (t < coastAt(c.th) * 0.93 && distPolyline(P[i][0], P[i][1], c.line) < c.hw * 1.3) inner.push(i);
      }
      let l = false, r = false;
      for (const i of inner) for (const w of border[i].keys()) {
        if (!land[w]) continue;
        const s = (P[w][0] - P[i][0]) * -Math.sin(c.th) + (P[w][1] - P[i][1]) * Math.cos(c.th);
        if (s > 21) l = true; if (s < -21) r = true;
      }
      return { angle: c.th, cells: inner.length, ok: inner.length >= 2 && l && r, line: c.line };
    });
    if (penReport.filter(p => p.ok).length < 2) return { ok: false, reason: 'peninsula check' };
    if (coveReport.filter(c => c.ok).length < 2) return { ok: false, reason: 'cove check' };

    // index land cells as provinces, ordered top-to-bottom, left-to-right
    const cells = [...Array(N).keys()].filter(i => land[i]).sort((a, b) => (Math.round(P[a][1] / 403) - Math.round(P[b][1] / 403)) || (P[a][0] - P[b][0]));
    const pid = new Map(cells.map((c, i) => [c, i]));
    const n = cells.length;
    const adj = cells.map(c => [...touch[c]].filter(w => pid.has(w)).map(w => pid.get(w)));

    // edges between provinces (shared sides only)
    const edges = []; const pEdges = cells.map(() => []);
    cells.forEach((c, i) => {
      for (const [w, [ra, rb]] of border[c]) {
        if (!pid.has(w)) continue; const j = pid.get(w); if (j < i) continue;
        const e = { id: edges.length, a: i, b: j, ra, rb };
        edges.push(e); pEdges[i].push(e.id); pEdges[j].push(e.id);
      }
    });

    // 8. colour + 9. barrier assignment (retry colourings if needed)
    let terr = null, barrier = null;
    const nbr = cells.map((_, i) => pEdges[i].map(id => edges[id].a === i ? edges[id].b : edges[id].a));
    // water vertices: sea shore, and each lake's shore
    const oceanVerts = new Set(), lakeOf = new Map(), lakeVerts = lakes.map(() => new Set());
    lakes.forEach((lc, k) => lc.forEach(c => lakeOf.set(c, k)));
    cells.forEach(c => { for (const [w, [ra, rb]] of border[c]) { if (land[w]) continue; if (isLake[w]) { lakeVerts[lakeOf.get(w)].add(ra); lakeVerts[lakeOf.get(w)].add(rb); } else { oceanVerts.add(ra); oceanVerts.add(rb); } } });
    const anyLakeVert = v => lakeVerts.some(s => s.has(v));
    // one river per lake, running along province borders down to the sea (never along a desert border)
    function planLakeRivers(terr) {
      const vAdj = new Map();
      edges.forEach(e => {
        if (terr[e.a] === 2 || terr[e.b] === 2) return;
        for (const [u, v] of [[e.ra, e.rb], [e.rb, e.ra]]) { if (!vAdj.has(u)) vAdj.set(u, []); vAdj.get(u).push([v, e.id]); }
      });
      const fixed = new Uint8Array(edges.length), out = [], used = new Set();
      for (let k = 0; k < lakes.length; k++) {
        const dist = new Map(), prev = new Map(), done = new Set();
        for (const v of lakeVerts[k]) if (vAdj.has(v) && !used.has(v)) dist.set(v, 0);
        let goal = -1;
        while (true) {
          let u = -1, du = Infinity;
          for (const [v, d] of dist) if (!done.has(v) && d < du) { du = d; u = v; }
          if (u < 0) break;
          done.add(u);
          if (oceanVerts.has(u)) { goal = u; break; }
          if (du > 0 && anyLakeVert(u)) continue;            // never touch a lake again after leaving
          for (const [v, id] of vAdj.get(u) || []) {
            if (used.has(v) || done.has(v)) continue;
            if (anyLakeVert(v) && !oceanVerts.has(v)) continue;
            const p0 = repPos.get(u), p1 = repPos.get(v);
            const nd = du + Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * (0.6 + rng() * 0.8);
            if (nd < (dist.has(v) ? dist.get(v) : Infinity)) { dist.set(v, nd); prev.set(v, [u, id]); }
          }
        }
        if (goal < 0) return null;
        const path = [goal], ids = [];
        let v = goal; while (prev.has(v)) { const [u, id] = prev.get(v); ids.push(id); path.push(u); v = u; }
        ids.forEach(id => fixed[id] = 1);
        path.forEach(x => used.add(x));
        out.push({ path, ids, lake: k });      // path runs sea -> lake
      }
      return { fixed, rivers: out };
    }
    let lakePlan = null;
    for (let tryc = 0; tryc < 10 && !barrier; tryc++) {
      terr = assignTerrain(n, nbr, adj, rng);
      if (!terr) continue;
      lakePlan = planLakeRivers(terr);
      if (!lakePlan) continue;
      barrier = solveBarriers(n, edges, pEdges, terr, rng, lakePlan.fixed);
    }
    if (!barrier) return { ok: false, reason: 'barrier solve' };

    // 10. barrier styles: rivers first, then trees / mountains / ruins
    const coastVerts = new Set();
    cells.forEach(c => { for (const [w, [ra, rb]] of border[c]) if (!land[w]) { coastVerts.add(ra); coastVerts.add(rb); } });
    const vBar = new Map();
    edges.forEach(e => { if (!barrier[e.id]) return; for (const r of [e.ra, e.rb]) { if (!vBar.has(r)) vBar.set(r, []); vBar.get(r).push(e.id); } });
    const style = new Array(edges.length).fill(null);
    const rivers = []; const riverVerts = new Set();
    for (const r of lakePlan.rivers) { r.ids.forEach(id => style[id] = 'river'); r.path.forEach(p => riverVerts.add(p)); rivers.push({ path: r.path, lake: r.lake }); }
    // extra rivers rise inland and run out to the sea
    const starts = shuffle([...oceanVerts].filter(v => vBar.has(v)), rng);
    let extra = 0;
    for (const s of starts) {
      if (extra >= 4) break;
      if (riverVerts.has(s)) continue;
      const len = 4 + Math.floor(rng() * 6);
      const path = [s], used = [];
      let v = s;
      while (used.length < len) {
        const opts = (vBar.get(v) || []).filter(id => !style[id] && !used.includes(id)).map(id => {
          const e = edges[id], o = e.ra === v ? e.rb : e.ra;
          if (riverVerts.has(o) || path.includes(o) || coastVerts.has(o)) return null;
          const p0 = repPos.get(v), p1 = repPos.get(o);
          const inward = Math.hypot(p0[0] - C[0], p0[1] - C[1]) - Math.hypot(p1[0] - C[0], p1[1] - C[1]);
          return { id, o, score: inward + rng() * 134 };
        }).filter(Boolean).sort((a, b) => b.score - a.score);
        if (!opts.length) break;
        used.push(opts[0].id); v = opts[0].o; path.push(v);
      }
      if (used.length >= 3) { used.forEach(id => style[id] = 'river'); path.forEach(p => riverVerts.add(p)); rivers.push({ path, lake: null }); extra++; }
    }
    const weights = { grassland: { mountains: 5, trees: 3, ruins: 2 }, forest: { trees: 6, mountains: 2.5, ruins: 1.5 }, swamp: { trees: 3, ruins: 3.5, mountains: 2 }, desert: { mountains: 1 } };
    edges.forEach(e => {
      if (!barrier[e.id] || style[e.id]) return;
      const w = {}; for (const t of [TERRAINS[terr[e.a]], TERRAINS[terr[e.b]]]) for (const [k, v] of Object.entries(weights[t])) w[k] = (w[k] || 0) + v;
      let r = rng() * Object.values(w).reduce((a, b) => a + b, 0);
      for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) { style[e.id] = k; break; } }
      if (!style[e.id]) style[e.id] = 'trees';
    });
    for (let pass = 0; pass < 2; pass++) {
      edges.forEach(e => {
        if (!barrier[e.id] || style[e.id] === 'river') return;
        const cnt = {};
        for (const r of [e.ra, e.rb]) for (const id of vBar.get(r) || []) if (id !== e.id && style[id] !== 'river') cnt[style[id]] = (cnt[style[id]] || 0) + 1;
        const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] >= 2 && rng() < 0.7) style[e.id] = top[0];
      });
    }

    // junction fillers where 3+ provinces meet
    const vCells = new Map();
    cells.forEach((c, i) => cellV[c].forEach(r => { if (!vCells.has(r)) vCells.set(r, []); vCells.get(r).push(i); }));
    const junctions = [];
    for (const [r, ps] of vCells) {
      if (ps.length < 3 || coastVerts.has(r)) continue;
      const types = (vBar.get(r) || []).map(id => style[id]);
      let kind;
      if (types.includes('river')) kind = 'river';
      else if (types.length) { const cnt = {}; types.forEach(t => cnt[t] = (cnt[t] || 0) + 1); kind = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]; }
      else kind = 'rocks';
      junctions.push({ v: r, kind });
    }

    // ---------- assemble ----------
    const vIndex = new Map(); const vertices = [];
    const vid = r => { if (!vIndex.has(r)) { vIndex.set(r, vertices.length); const p = repPos.get(r); vertices.push([+p[0].toFixed(2), +p[1].toFixed(2)]); } return vIndex.get(r); };
    const provinces = cells.map((c, i) => {
      const vs = cellV[c].map(vid);
      const coast = [];
      for (const [w, [ra, rb]] of border[c]) if (!land[w]) coast.push([vid(ra), vid(rb), isLake[w] ? 1 : 0]);
      return { id: i + 1, site: [+P[c][0].toFixed(1), +P[c][1].toFixed(1)], verts: vs, terrain: TERRAINS[terr[i]], adj: adj[i], nbr: nbr[i], edges: pEdges[i], coast };
    });
    const world = {
      W, H, center: C,
      provinces,
      vertices,
      edges: edges.map(e => ({ id: e.id, a: e.a, b: e.b, v: [vid(e.ra), vid(e.rb)], open: !barrier[e.id], style: barrier[e.id] ? style[e.id] : null })),
      rivers: rivers.map(r => ({ verts: r.path.map(vid), lake: r.lake })),
      junctions: junctions.map(j => ({ v: vid(j.v), kind: j.kind })),
      features: {
        peninsulas: penReport.filter(p => p.ok).map(p => ({ cells: p.cells, line: p.line })),
        coves: coveReport.filter(c => c.ok).map(c => ({ cells: c.cells, line: c.line }))
      },
      lakes: lakes.map(lc => ({ cells: lc.length, polys: lc.map(c => cellV[c].map(vid)) })),
      lakesInland,
      touchesEdgeOfWorld: cells.some(c => nearFrame[c])
    };
    return { ok: true, world };
  }

  // ---------- biomes: forest/desert/swamp in separate clumps of 5–15, the rest grassland ----------
  // nbr = shared-border neighbors, tch = any contact (corners too). Each biome lands between 15% and 35%.
  function assignTerrain(n, nbr, tch, rng) {
    const lo = Math.ceil(0.15 * n), hi = Math.floor(0.35 * n);
    for (let tries = 0; tries < 40; tries++) {
      const counts = [0, 0, 0].map(() => lo + Math.floor(rng() * (hi - lo + 1)));   // forest, desert, swamp
      const grass = n - counts[0] - counts[1] - counts[2];
      if (grass < lo || grass > hi) continue;
      const clumps = [];
      counts.forEach((c, k) => {
        const kmin = Math.ceil(c / 15), kmax = Math.floor(c / 5);
        const kk = kmin + Math.floor(rng() * rng() * (kmax - kmin + 1));
        const sizes = new Array(kk).fill(5); let rest = c - 5 * kk;
        while (rest > 0) { const i = Math.floor(rng() * kk); if (sizes[i] < 15) { sizes[i]++; rest--; } }
        sizes.forEach(size => clumps.push({ type: k + 1, size }));
      });
      shuffle(clumps, rng).sort((a, b) => b.size - a.size);
      const terr = new Int8Array(n).fill(-1), clumpOf = new Int16Array(n).fill(-1);
      let failed = false;
      for (let ci = 0; ci < clumps.length && !failed; ci++) {
        const cl = clumps[ci];
        const blocked = v => terr[v] !== -1 || tch[v].some(w => terr[w] === cl.type && clumpOf[w] !== ci);
        const seeds = shuffle([...Array(n).keys()].filter(v => !blocked(v)), rng);
        let done = false;
        for (const sd of seeds.slice(0, 25)) {
          const members = [sd]; terr[sd] = cl.type; clumpOf[sd] = ci;
          while (members.length < cl.size) {
            let best = -1, bs = -1;
            for (const m of members) for (const w of nbr[m]) {
              if (blocked(w)) continue;
              const sc = nbr[w].filter(x => clumpOf[x] === ci).length + rng() * 1.5;
              if (sc > bs) { bs = sc; best = w; }
            }
            if (best < 0) break;
            members.push(best); terr[best] = cl.type; clumpOf[best] = ci;
          }
          if (members.length === cl.size) { done = true; break; }
          members.forEach(m => { terr[m] = -1; clumpOf[m] = -1; });
        }
        if (!done) failed = true;
      }
      if (failed) continue;
      for (let v = 0; v < n; v++) if (terr[v] < 0) terr[v] = 0;
      // desert borders are always open, so a neighbor must keep enough other borders to block half
      let ok = true;
      for (let v = 0; v < n && ok; v++) if (terr[v] !== 2 && nbr[v].filter(w => terr[w] === 2).length > Math.ceil(nbr[v].length / 2)) ok = false;
      if (ok) return Array.from(terr);
    }
    return null;
  }

  // ---------- barrier solver: half the borders blocked, deserts open, all reachable ----------
  function solveBarriers(n, edges, pEdges, terr, rng, fixed) {
    const DESERT = 2;
    const free = edges.filter(e => terr[e.a] !== DESERT && terr[e.b] !== DESERT && !fixed[e.id]).map(e => e.id);
    const isFree = new Uint8Array(edges.length); free.forEach(id => isFree[id] = 1);
    const lo = pEdges.map(l => Math.floor(l.length / 2)), hi = pEdges.map(l => Math.ceil(l.length / 2));
    const bar = new Uint8Array(edges.length), cnt = new Int16Array(n);
    edges.forEach(e => { if (fixed[e.id]) { bar[e.id] = 1; cnt[e.a]++; cnt[e.b]++; } });
    // feasibility: river sides fit within half, and enough free sides remain to reach half
    for (let p = 0; p < n; p++) {
      if (terr[p] === DESERT) continue;
      if (cnt[p] > hi[p] || cnt[p] + pEdges[p].filter(id => isFree[id]).length < lo[p]) return null;
    }
    const viol = p => terr[p] === DESERT ? 0 : Math.max(0, lo[p] - cnt[p]) + Math.max(0, cnt[p] - hi[p]);
    const label = new Int16Array(n);
    function components() {
      label.fill(-1); let c = 0;
      for (let s = 0; s < n; s++) {
        if (label[s] >= 0) continue; label[s] = c; const q = [s];
        while (q.length) { const u = q.pop(); for (const id of pEdges[u]) { if (bar[id]) continue; const e = edges[id], w = e.a === u ? e.b : e.a; if (label[w] < 0) { label[w] = c; q.push(w); } } }
        c++;
      }
      return c;
    }
    // greedy start
    for (const id of shuffle(free.slice(), rng)) {
      const e = edges[id];
      if (cnt[e.a] < lo[e.a] && cnt[e.b] < hi[e.b] || cnt[e.b] < lo[e.b] && cnt[e.a] < hi[e.a]) { bar[id] = 1; cnt[e.a]++; cnt[e.b]++; }
    }
    let local = 0; for (let p = 0; p < n; p++) local += viol(p);
    let comp = components();
    const cost = () => local + 4 * (comp - 1);
    let T = 1.2;
    const bad = [];
    for (let it = 0; it < 8000; it++) {
      if (local === 0 && comp === 1) { solveBarriers.iters = it; return bar; }
      T = Math.max(0.03, T * 0.9995);
      let id = -1;
      const r = rng();
      if (r < 0.6 && local > 0) {
        bad.length = 0; for (let p = 0; p < n; p++) if (viol(p)) bad.push(p);
        const p = bad[Math.floor(rng() * bad.length)];
        const want = cnt[p] < lo[p] ? 0 : 1;
        const opts = pEdges[p].filter(x => isFree[x] && bar[x] === want);
        if (opts.length) id = opts[Math.floor(rng() * opts.length)];
      } else if (r < 0.85 && comp > 1) {
        const opts = free.filter(x => bar[x] && label[edges[x].a] !== label[edges[x].b]);
        if (opts.length) id = opts[Math.floor(rng() * opts.length)];
      }
      if (id < 0) id = free[Math.floor(rng() * free.length)];
      const e = edges[id], before = cost(), oldLocal = local, oldComp = comp;
      local -= viol(e.a) + viol(e.b);
      const d = bar[id] ? -1 : 1; bar[id] ^= 1; cnt[e.a] += d; cnt[e.b] += d;
      local += viol(e.a) + viol(e.b);
      comp = components();
      const delta = cost() - before;
      if (delta > 0 && rng() >= Math.exp(-delta / T)) { bar[id] ^= 1; cnt[e.a] -= d; cnt[e.b] -= d; local = oldLocal; comp = components(); }
    }
    return null;
  }

  // ---------- independent rule check ----------
  function validate(w) {
    const out = []; const ps = w.provinces, n = ps.length;
    const add = (label, pass, detail) => out.push({ label, pass, detail });
    add('200 provinces', n === 200, n + ' provinces');
    const counts = {}; ps.forEach(p => counts[p.terrain] = (counts[p.terrain] || 0) + 1);
    const pct = t => Math.round(100 * (counts[t] || 0) / n);
    add('Each biome is 15–35% of the map', TERRAINS.every(t => (counts[t] || 0) >= 0.15 * n && (counts[t] || 0) <= 0.35 * n), TERRAINS.map(t => t + ' ' + pct(t) + '%').join(' · '));
    const clumpInfo = [], sizes = [];
    for (const t of ['forest', 'desert', 'swamp']) {
      const seen = new Set(); let k = 0;
      ps.forEach((p, i) => {
        if (p.terrain !== t || seen.has(i)) return;
        k++; let sz = 0; const q = [i]; seen.add(i);
        while (q.length) { const u = q.pop(); sz++; for (const v of ps[u].nbr) if (ps[v].terrain === t && !seen.has(v)) { seen.add(v); q.push(v); } }
        sizes.push(sz);
      });
      clumpInfo.push(k + ' ' + t);
    }
    add('Forest, desert, swamp grow in clumps of 5–15', sizes.every(s => s >= 5 && s <= 15), clumpInfo.join(', ') + ' clumps · sizes ' + Math.min(...sizes) + '–' + Math.max(...sizes));
    const sides = ps.map(p => p.verts.length);
    add('Every province has 5–8 sides', sides.every(s => s >= 5 && s <= 8), 'range ' + Math.min(...sides) + '–' + Math.max(...sides));
    let half = 0, desertBad = 0;
    ps.forEach(p => {
      const bars = p.edges.filter(id => !w.edges[id].open).length, d = p.edges.length;
      if (p.terrain === 'desert') { if (bars) desertBad++; }
      else if (bars < Math.floor(d / 2) || bars > Math.ceil(d / 2)) half++;
    });
    add('Half of each border blocked, half open', half === 0, half ? half + ' provinces off' : 'all non-desert provinces balanced');
    add('Deserts have no barriers', desertBad === 0, desertBad ? desertBad + ' deserts blocked' : (counts.desert || 0) + ' deserts, all open');
    const bfs = (useOpen) => {
      const seen = new Set([0]), q = [0];
      while (q.length) { const u = q.pop(); for (const id of ps[u].edges) { const e = w.edges[id]; if (useOpen && !e.open) continue; const v = e.a === u ? e.b : e.a; if (!seen.has(v)) { seen.add(v); q.push(v); } } }
      return seen.size;
    };
    add('One continuous island', bfs(false) === n, 'single landmass');
    add('Every province reachable on foot', bfs(true) === n, bfs(true) + ' / ' + n + ' reachable');
    add('Ocean on every side', !w.touchesEdgeOfWorld, 'island never touches the map edge');
    const lk = w.lakes || [];
    add('1–3 lakes, each 2–3 provinces big', lk.length >= 1 && lk.length <= 3 && lk.every(l => l.cells >= 2 && l.cells <= 3) && w.lakesInland, lk.length + (lk.length === 1 ? ' lake' : ' lakes') + ' · sizes ' + lk.map(l => l.cells).join(', '));
    const seaV = new Set(), lakeSets = lk.map(l => new Set(l.polys.flat()));
    ps.forEach(p => p.coast.forEach(([a, b, isL]) => { if (!isL) { seaV.add(a); seaV.add(b); } }));
    const eKey = new Map(w.edges.map(e => [Math.min(...e.v) + '_' + Math.max(...e.v), e]));
    const rv = w.rivers || [];
    const riverOk = r => seaV.has(r.verts[0]) && r.verts.every((v, i) => i === 0 || (() => { const e = eKey.get(Math.min(v, r.verts[i - 1]) + '_' + Math.max(v, r.verts[i - 1])); return e && !e.open && e.style === 'river'; })());
    add('Every river reaches the ocean', rv.length > 0 && rv.every(riverOk), rv.length + ' rivers, all flowing to the sea');
    const drained = lk.map((l, k) => rv.some(r => riverOk(r) && lakeSets[k].has(r.verts[r.verts.length - 1])));
    add('Every lake has a river to the sea', drained.every(Boolean), drained.filter(Boolean).length + ' / ' + lk.length + ' lakes drain to the sea');
    add('At least 2 peninsulas', w.features.peninsulas.length >= 2, w.features.peninsulas.length + ' found');
    add('At least 2 coves', w.features.coves.length >= 2, w.features.coves.length + ' found');
    return out;
  }

  function generateWorld(seed) {
    const reasons = {};
    for (let attempt = 0; attempt < 80; attempt++) {
      const r = tryGenerate(seedRng(seed + '#' + attempt));
      if (r.ok) { r.world.seed = String(seed); r.world.attempts = attempt + 1; r.world.report = validate(r.world); return r.world; }
      reasons[r.reason] = (reasons[r.reason] || 0) + 1;
    }
    throw new Error('Could not generate a valid world: ' + JSON.stringify(reasons));
  }

  // ---------- practice world: a small 10-province island cut from a normal world ----------
  // 1 desert, 1 swamp, 5 grassland, 3 forest; every province reachable on foot; forests keep a border of trees for Lumber Mills
  function generatePractice(seed) {
    const big = generateWorld('practice:' + seed), P = big.provinces, rng = seedRng('practice-pick:' + seed);
    const want = { grassland: 5, forest: 3, desert: 1, swamp: 1 }, N = 10;
    const cx = big.center[0], cy = big.center[1];
    // start from a grassland province with plenty of land around it, near the middle
    let start = -1, bs = -Infinity;
    P.forEach((p, i) => { if (p.terrain !== 'grassland') return; const sc = p.nbr.length * 600 - Math.hypot(p.site[0] - cx, p.site[1] - cy) + rng() * 50; if (sc > bs) { bs = sc; start = i; } });
    // grow a compact blob: always add the bordering province closest to the start
    const keep = [start], inK = new Set(keep);
    while (keep.length < N) {
      let best = -1, bd = Infinity;
      for (const i of keep) for (const j of P[i].nbr) if (!inK.has(j)) { const d = Math.hypot(P[j].site[0] - P[start].site[0], P[j].site[1] - P[start].site[1]); if (d < bd) { bd = d; best = j; } }
      if (best < 0) break; keep.push(best); inK.add(best);
    }
    // terrain: the start is grassland; desert and swamp go to the far edge; forests where the land already was forest if possible
    const terr = new Map([[start, 'grassland']]), left = { ...want }; left.grassland--;
    const rest = keep.slice(1).sort((a, b) => Math.hypot(P[b].site[0] - P[start].site[0], P[b].site[1] - P[start].site[1]) - Math.hypot(P[a].site[0] - P[start].site[0], P[a].site[1] - P[start].site[1]));
    for (const t of ['desert', 'swamp']) { let pick = rest.find(i => !terr.has(i) && P[i].terrain === t) ?? rest.find(i => !terr.has(i)); terr.set(pick, t); left[t]--; }
    for (const i of rest) if (!terr.has(i) && P[i].terrain === 'forest' && left.forest > 0) { terr.set(i, 'forest'); left.forest--; }
    for (const i of rest.slice().reverse()) if (!terr.has(i) && left.forest > 0) { terr.set(i, 'forest'); left.forest--; }
    for (const i of rest) if (!terr.has(i)) terr.set(i, 'grassland');
    // re-index
    const idx = new Map(keep.map((o, k) => [o, k]));
    const edges = [], eMap = new Map();
    big.edges.forEach((e, ei) => { if (idx.has(e.a) && idx.has(e.b)) { eMap.set(ei, edges.length); edges.push({ id: edges.length, a: idx.get(e.a), b: idx.get(e.b), v: e.v.slice(), open: e.open, style: e.style }); } });
    const provinces = keep.map((o, k) => {
      const p = P[o], vs = p.verts, coast = [];
      const inner = new Set(p.edges.filter(ei => eMap.has(ei)).map(ei => { const v = big.edges[ei].v; return Math.min(v[0], v[1]) + '_' + Math.max(v[0], v[1]); }));
      for (let j = 0; j < vs.length; j++) { const a = vs[j], b = vs[(j + 1) % vs.length]; if (!inner.has(Math.min(a, b) + '_' + Math.max(a, b))) coast.push([a, b, 0]); }
      const nb = p.nbr.filter(q => idx.has(q)).map(q => idx.get(q));
      return { id: k, site: p.site.slice(), verts: vs.slice(), terrain: terr.get(o), adj: nb.slice(), nbr: nb, edges: p.edges.filter(ei => eMap.has(ei)).map(ei => eMap.get(ei)), coast };
    });
    // borders: no barriers on the desert, no rivers (the river system is gone), forests keep a tree border where they can
    for (const e of edges) {
      const ta = provinces[e.a].terrain, tb = provinces[e.b].terrain;
      if (ta === 'desert' || tb === 'desert') { e.open = true; e.style = null; continue; }
      if (!e.open && e.style === 'river') e.style = (ta === 'forest' || tb === 'forest') ? 'trees' : 'mountains';
      if (!e.open && (ta === 'forest' || tb === 'forest') && e.style === 'mountains') e.style = 'trees';
    }
    provinces.forEach((p, i) => { if (p.terrain !== 'forest' || p.edges.some(ei => !edges[ei].open && edges[ei].style === 'trees')) return; const e = p.edges.map(ei => edges[ei]).find(e => provinces[e.a === i ? e.b : e.a].terrain !== 'desert'); if (e) { e.open = false; e.style = 'trees'; } });
    // everyone must be reachable on foot: open barriers until they are
    const reach = () => { const seen = new Set([0]), q = [0]; while (q.length) { const u = q.pop(); for (const ei of provinces[u].edges) { const e = edges[ei]; if (!e.open) continue; const v = e.a === u ? e.b : e.a; if (!seen.has(v)) { seen.add(v); q.push(v); } } } return seen; };
    for (let guard = 0; guard < 40; guard++) {
      const seen = reach(); if (seen.size === N) break;
      // open a barrier between the reached part and the rest, keeping tree borders where another choice exists
      const cand = edges.filter(e => !e.open && seen.has(e.a) !== seen.has(e.b)).sort((x, y) => (x.style === 'trees') - (y.style === 'trees'));
      if (!cand.length) break; cand[0].open = true; cand[0].style = null;
    }
    // a forest left with no tree border gets one back wherever that keeps every province reachable
    provinces.forEach((p, i) => {
      if (p.terrain !== 'forest' || p.edges.some(ei => !edges[ei].open && edges[ei].style === 'trees')) return;
      for (const ei of p.edges) { const e = edges[ei]; if (!e.open || provinces[e.a === i ? e.b : e.a].terrain === 'desert') continue; e.open = false; e.style = 'trees'; if (reach().size === N) break; e.open = true; e.style = null; }
    });
    const used = new Set(provinces.flatMap(p => p.verts));
    const sx = provinces.reduce((s, p) => s + p.site[0], 0) / N, sy = provinces.reduce((s, p) => s + p.site[1], 0) / N;
    return { W: big.W, H: big.H, center: [sx, sy], provinces, vertices: big.vertices, edges, rivers: [], junctions: (big.junctions || []).filter(j => used.has(j.v)),
      features: { peninsulas: [], coves: [] }, lakes: [], lakesInland: true, touchesEdgeOfWorld: false, seed: 'practice:' + seed, practice: true, attempts: big.attempts, report: [] };
  }

  const api = { generateWorld, generatePractice, validate, TERRAINS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RealmGen = api;
})(typeof globalThis!=="undefined"?globalThis:this);
