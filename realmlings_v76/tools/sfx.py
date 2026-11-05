"""Realmlings sound effects: every sound synthesized from scratch, three options (A/B/C) for each.
usage: python3 sfx.py outdir [id ...]
"""
import sys, os, json, numpy as np
from scipy.signal import fftconvolve, butter, sosfilt, lfilter

SR = 44100
R = np.random.default_rng(5)
# ---------------------------------------------------------------- basics
def T(d): return np.arange(int(d * SR)) / SR
def N(d): return R.normal(0, 1, int(d * SR))
def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'high', output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band', output='sos'), x)
def ex(t, tau): return np.exp(-t / tau)
def att(t, a): return np.clip(t / a, 0, 1)
def sil(d): return np.zeros(max(0, int(d * SR)))
def at(x, s): return np.concatenate([sil(s), x])
def mix(*parts):
    n = max(len(p) for p in parts); o = np.zeros(n)
    for p in parts: o[:len(p)] += p
    return o
def seq(*items):   # (time, sound) pairs
    return mix(*[at(x, t) for t, x in items])
def norm(x, peak=0.9): m = np.max(np.abs(x)); return x * (peak / m) if m > 0 else x
def fade(x, a=0.004, r=0.02):
    n = len(x); e = np.ones(n); ai = int(a * SR); ri = int(r * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if ri: e[-ri:] *= np.linspace(1, 0, ri)
    return x * e
_IR = {}
def verb(x, size=0.5, wet=0.25, bright=4500):
    k = (size, bright)
    if k not in _IR:
        r = np.random.default_rng(int(size * 1000)); n = int(size * 4 * SR); t = np.arange(n) / SR
        ir = lp(r.normal(0, 1, n), bright) * np.exp(-t / size); ir[0] = 0; _IR[k] = ir / np.sqrt(np.sum(ir ** 2))
    y = fftconvolve(x, _IR[k]); y[:len(x)] += x * (1 - wet) / wet if wet > 0 else 0
    return y * wet
def detune(f, c=8): return f * 2 ** (R.normal(0, c) / 1200)
NOTE = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
def hz(n): s = NOTE[n[0]] + (1 if '#' in n else -1 if n[1:2] == 'b' else 0); return 440 * 2 ** ((s + (int(n[-1]) - 4) * 12) / 12)

# ---------------------------------------------------------------- instruments
def bell(f, d=2.0, bright=1.0, ratios=(1, 2.0, 2.76, 5.4, 8.9), vel=1.0):
    t = T(d); x = np.zeros_like(t)
    for i, r in enumerate(ratios): x += np.sin(2 * np.pi * f * r * t + R.uniform(0, 6)) * ex(t, d * 0.35 / (1 + i * 0.6 / bright)) * (0.6 ** i) * bright ** (i * 0.3)
    return x * att(t, 0.002) * vel
def chime(f, d=1.4): return bell(f, d, 0.7, (1, 3.01, 5.2, 7.9))
def dark_bell(f, d=4.0): return bell(f, d, 0.6, (1, 1.48, 2.0, 2.53, 3.41))
def horn(f, d, vel=1.0, bright=1.0, vib=0.006, swell=0.08):
    t = T(d); f0 = f * (1 + vib * np.sin(2 * np.pi * 5.2 * t) * att(t, 0.4))
    ph = 2 * np.pi * np.cumsum(f0) / SR; b = 1.2 + 3.0 * bright * att(t, swell)
    x = sum(np.sin(k * ph) * np.exp(-k / b) for k in range(1, 14))
    e = att(t, swell) * np.clip((d - t) / 0.12, 0, 1)
    breath = bp(N(d), f * 2, f * 6) * ex(t, 0.05) * 0.3
    return lp((x + breath) * e, 3500) * vel * 0.4
def drum(f=55, d=1.2, vel=1.0, skin=0.6):
    t = T(d); fr = f + f * 0.9 * ex(t, 0.04)
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * ex(t, d * 0.3)
    return (body + lp(N(d), 700) * ex(t, 0.03) * skin) * vel
def pad(freqs, d, att_s=0.6, cutoff=1400, vel=1.0):
    t = T(d); x = np.zeros_like(t)
    for f in freqs:
        for dt in (-6, 6):
            ff = f * 2 ** (dt / 1200); x += sum(np.sin(2 * np.pi * ff * k * t + R.uniform(0, 6)) / k for k in range(1, 10))
    return lp(x, cutoff) * att(t, att_s) * np.clip((d - t) / 0.6, 0, 1) * vel * 0.08
def pluck(f, d=1.0, vel=1.0):
    t = T(d); x = sum(np.sin(2 * np.pi * f * k * t) * ex(t, 0.6 / k) / k for k in range(1, 8))
    return x * att(t, 0.002) * vel * 0.4

# ---------------------------------------------------------------- foley
def knock(f=500, d=0.12, vel=1.0):
    t = T(d); x = sum(np.sin(2 * np.pi * f * r * t) * ex(t, 0.025 / (i + 1)) * (0.7 ** i) for i, r in enumerate((1, 2.3, 4.1)))
    return (x + bp(N(d), f, f * 6) * ex(t, 0.006) * 0.8) * vel
def thump(f=70, d=0.2, vel=1.0):
    t = T(d); return (np.sin(2 * np.pi * (f + 40 * ex(t, 0.02)) * t) * ex(t, 0.06) + lp(N(d), 400) * ex(t, 0.025)) * vel
def clink(f=2400, d=0.4, vel=1.0):
    t = T(d); x = sum(np.sin(2 * np.pi * f * r * t + R.uniform(0, 6)) * ex(t, 0.12 / (1 + i)) for i, r in enumerate((1, 1.53, 2.31, 3.17)))
    return (x * 0.5 + hp(N(d), 4000) * ex(t, 0.004)) * vel
def jingle(d=0.25, n=14, vel=1.0, lo=3000, hi=8000):   # chain mail / armor plates
    o = sil(d + 0.06)
    for _ in range(n):
        s = int(R.uniform(0, d) * SR); f = R.uniform(lo, hi); tt = T(0.05)
        b = np.sin(2 * np.pi * f * tt) * ex(tt, 0.008) * R.uniform(0.3, 1); o[s:s + len(b)] += b
    return o * vel * 0.5
def crinkle(d, density=60, lo=1500, hi=9000, vel=1.0):   # paper, leaves, cloth
    x = bp(N(d), lo, hi); e = np.zeros(len(x))
    for _ in range(int(density * d)):
        s = int(R.uniform(0, d) * SR); tt = T(0.03); g = ex(tt, R.uniform(0.002, 0.01)) * R.uniform(0.2, 1); e[s:s + len(g)] += g[:len(e) - s]
    return x * (e + 0.08) * vel * 0.6
def whoosh(d=0.6, f0=300, f1=3000, vel=1.0, q=1.5):
    n = int(d * SR); t = T(d); x = N(d); o = np.zeros(n); blk = 512
    for i in range(0, n, blk):
        f = f0 * (f1 / f0) ** (i / n); o[i:i + blk] = bp(x[max(0, i - 2048):i + blk], f / q, f * q)[-min(blk, n - i):]
    return o * np.sin(np.pi * t / d) ** 1.5 * vel
def creak(d=0.7, rate=(25, 70), vel=1.0, res=(420, 950, 1800)):
    t = T(d); r = rate[0] + (rate[1] - rate[0]) * np.sin(np.pi * t / d) ** 2 * (1 + 0.15 * R.normal(0, 1, len(t)))
    ph = np.cumsum(r) / SR; imp = (np.diff(np.floor(ph), prepend=0) > 0).astype(float) * (0.6 + 0.4 * R.random(len(t)))
    x = sum(bp(imp, f * 0.92, f * 1.08) for f in res)
    return x * np.sin(np.pi * t / d) ** 0.5 * vel * 3
def scrape(d=0.3, lo=2500, hi=7000, vel=1.0):
    t = T(d); return bp(N(d), lo, hi) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * R.uniform(18, 30) * t))) * np.sin(np.pi * t / d) * vel
def crunch(d=0.25, vel=1.0):
    o = sil(d + 0.05)
    for _ in range(int(80 * d)):
        s = int(R.uniform(0, d) * SR); tt = T(0.02); g = bp(R.normal(0, 1, len(tt)), 300, 2500) * ex(tt, 0.004) * R.uniform(0.2, 1); o[s:s + len(g)] += g
    return o * vel
def coins(n=3, vel=1.0): return seq(*[(i * R.uniform(0.05, 0.09), clink(R.uniform(2800, 4200), 0.35, R.uniform(0.5, 1))) for i in range(n)]) * vel
def chirp(f0=2600, f1=4200, d=0.07):
    t = T(d); f = f0 + (f1 - f0) * (t / d) ** 0.7; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d)
def bird(vel=1.0):
    k = R.integers(2, 5); base = R.uniform(2200, 3400)
    return seq(*[(i * R.uniform(0.07, 0.12), chirp(base * R.uniform(0.9, 1.1), base * R.uniform(1.3, 1.7), R.uniform(0.04, 0.08))) for i in range(k)]) * vel * 0.4
def hum(f=55, d=1.6, vel=1.0):
    t = T(d); x = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 6)) * (0.8 + 0.2 * np.sin(2 * np.pi * 3 * t))
    return lp(x, 600) * np.sin(np.pi * t / d) ** 0.7 * vel * 0.5

# ---------------------------------------------------------------- footsteps
def step(surface='dirt', weight=1.0, vel=1.0):
    d = 0.18
    body = thump(60 + 40 / weight, d, 0.8 * weight)
    if surface == 'grass': tex = hp(crinkle(0.09, 120, 2000, 9000), 1500) * 1.4
    elif surface == 'gravel': tex = crunch(0.1, 0.9)
    elif surface == 'stone': tex = knock(R.uniform(700, 900), 0.08, 0.6)
    else: tex = bp(N(0.08), 400, 2400) * ex(T(0.08), 0.02) * 0.7
    return mix(body * 0.8, tex * (0.6 + 0.4 / weight)) * vel
def walk(n, gap, surface='dirt', weight=1.0, jit=0.015, extra=None, fadeout=True):
    items = []
    for i in range(n):
        v = R.uniform(0.75, 1.0) * (1 - 0.5 * i / n if fadeout else 1)
        items.append((i * gap + R.normal(0, jit), step(surface, weight, v)))
        if extra: items.append((i * gap + 0.01, extra(i) * v))
    return seq(*items)
def march(n=6, gap=0.42, men=7, surface='dirt', armor=True):
    items = []
    for i in range(n):
        for m in range(men): items.append((i * gap + R.normal(0, 0.018) + 0.0005 * m, step(surface, 1.6, R.uniform(0.35, 0.7) * (1 - 0.35 * i / n))))
        if armor: items.append((i * gap + 0.02, jingle(0.12, 10, 0.8 * (1 - 0.3 * i / n))))
    return seq(*items)
def hooves(n=4, gap=0.32, gallop=False, armor=False):
    items = []; pat = (0, 0.07, 0.15, 0.2) if gallop else (0, 0.16)
    for i in range(n):
        for k, o in enumerate(pat): items.append((i * gap + o + R.normal(0, 0.006), mix(knock(R.uniform(380, 520), 0.1, 0.9), thump(90, 0.1, 0.5)) * R.uniform(0.7, 1) * (1 - 0.4 * i / n)))
        if armor: items.append((i * gap + 0.03, jingle(0.1, 8, 0.6)))
    return seq(*items)

# ---------------------------------------------------------------- voice (formant synthesis, cartoon style)
FORM = {'a': (800, 1200, 2500), 'e': (500, 1800, 2500), 'i': (320, 2300, 3000), 'o': (500, 900, 2400), 'u': (350, 750, 2300),
        'ah': (650, 1150, 2400), 'uh': (600, 1100, 2400), 'm': (250, 1100, 2200)}
BW = (80, 110, 160)
def reson(x, f, bw):
    r = np.exp(-np.pi * bw / SR); return lfilter([1 - r], [1, -2 * r * np.cos(2 * np.pi * f / SR), r * r], x)
def formants(x, v, gain=(1, 0.6, 0.25)):
    F = FORM[v]; return sum(g * reson(x, f, b) for f, b, g in zip(F, BW, gain))
def glottal(f0, d, breath=0.08):
    t = T(d); f = np.broadcast_to(f0, t.shape) if np.ndim(f0) else np.full(len(t), f0)
    f = f * (1 + 0.004 * R.normal(0, 1, len(t)).cumsum() / np.sqrt(len(t) + 1))
    ph = 2 * np.pi * np.cumsum(f) / SR; kmax = int(6000 / max(np.max(f), 60))
    src = sum(np.sin(k * ph) / k ** 1.1 for k in range(1, kmax))
    return src + N(d) * breath
def syl(v1, v2, d, f0a, f0b, breath=0.08, h=0.0, end=None, vel=1.0):
    """A syllable gliding from vowel v1 to v2 with pitch f0a→f0b; optional breathy 'h' onset and a stop at the end."""
    t = T(d); f0 = f0a + (f0b - f0a) * (t / d); src = glottal(f0, d, breath)
    w = np.clip((t / d - 0.25) / 0.5, 0, 1)
    x = formants(src, v1) * (1 - w) + formants(src, v2) * w
    e = att(t, 0.025) * np.clip((d - t) / 0.05, 0, 1)
    out = x * e
    if h: out = np.concatenate([formants(N(h), v1) * np.linspace(0.2, 1, int(h * SR)) * 0.5, out])
    if end == 'p': out = np.concatenate([out, sil(0.03), bp(N(0.02), 300, 3000) * ex(T(0.02), 0.005) * 0.4])
    if end == 'k': out = np.concatenate([out, sil(0.03), bp(N(0.03), 1500, 4000) * ex(T(0.03), 0.006) * 0.5])
    if end == 't': out = np.concatenate([out, sil(0.03), hp(N(0.03), 3500) * ex(T(0.03), 0.006) * 0.5])
    return lp(out, 5000) * vel / (np.max(np.abs(out)) + 1e-9)
def say(*parts):   # concatenate syllables with tiny overlaps
    o = parts[0]
    for p in parts[1:]: o = np.concatenate([o, p])
    return o
def choir(notes, d=2.2, vowel='ah', vel=1.0, att_s=0.5):
    t = T(d); o = np.zeros(len(t))
    for n in notes:
        for _ in range(3):
            f = detune(hz(n) if isinstance(n, str) else n, 10) * (1 + 0.006 * np.sin(2 * np.pi * R.uniform(4.5, 5.5) * t + R.uniform(0, 6)))
            o += formants(glottal(f, d, 0.15), vowel)
    e = att(t, att_s) * np.clip((d - t) / 0.7, 0, 1)
    return lp(o * e, 4500) * vel / (np.max(np.abs(o * e)) + 1e-9)
def crowd(d=2.0, n=22, mood='angry', rise=True, vel=1.0):
    o = sil(d + 0.5)
    for _ in range(n):
        s = R.uniform(0, d * 0.8); sd = R.uniform(0.2, 0.6); f = R.uniform(110, 230) * (1.3 if mood == 'cheer' else 1)
        v = R.choice(['a', 'o', 'e', 'ah', 'uh']) if mood != 'cheer' else R.choice(['a', 'e', 'ah'])
        bend = 1.25 if mood == 'cheer' else (0.85 if mood == 'groan' else R.uniform(0.9, 1.15))
        x = syl(v, v, sd, f, f * bend, 0.2, h=0.03 if R.random() < 0.4 else 0) * R.uniform(0.3, 1)
        i0 = int(s * SR); o[i0:i0 + len(x)] += x[:len(o) - i0]
    o += bp(R.normal(0, 1, len(o)), 300, 2500) * 0.15
    t = np.arange(len(o)) / SR
    e = (att(t, d * 0.9) if rise else att(t, 0.15)) * np.clip((d + 0.5 - t) / 0.4, 0, 1)
    return o * e * vel
def whisper(d=1.0, vel=1.0):
    parts = [formants(N(R.uniform(0.15, 0.3)), R.choice(['a', 'o', 'i', 'e']), (1, 0.8, 0.5)) * R.uniform(0.4, 1) for _ in range(int(d / 0.2))]
    x = np.concatenate(parts); t = np.arange(len(x)) / SR
    return hp(x, 900) * np.sin(np.pi * t / t[-1]) * vel

# ---------------------------------------------------------------- the sounds: id -> (title, when, [(label, fn), ...])
def sparkle(n=6, lo=2400, hi=5200, gap=0.06): return seq(*[(i * gap * R.uniform(0.7, 1.3), chime(R.uniform(lo, hi), 0.8) * R.uniform(0.3, 0.8)) for i in range(n)])
def arp(notes, gap=0.09, inst=chime, d=1.4): return seq(*[(i * gap, inst(hz(n), d)) for i, n in enumerate(notes)])
def gate_slam(size=1.0):
    return mix(thump(48, 0.6, 1.4 * size), knock(180, 0.3, 0.9 * size), at(jingle(0.35, 18, 0.7, 1500, 4000), 0.03))
def sword_clash():
    return mix(clink(R.uniform(1100, 1600), 0.5, 1.0), scrape(0.12, 3000, 8000, 0.6))
def battle_bed(d=4.0, density=5, shouts=True, drums=False, dist=0.6):
    items = [(R.uniform(0, d - 0.3), sword_clash() * R.uniform(0.3, 1)) for _ in range(int(density * d))]
    if shouts: items += [(R.uniform(0, d - 0.5), syl(*(lambda v: (v, v))(R.choice(['a', 'o', 'ah'])), R.uniform(0.2, 0.4), R.uniform(150, 260), R.uniform(130, 300), 0.25) * R.uniform(0.2, 0.6)) for _ in range(int(2.5 * d))]
    items += [(R.uniform(0, d - 0.2), mix(thump(70, 0.15, 0.6), jingle(0.1, 6, 0.5))) for _ in range(int(2 * d))]
    if drums: items += [(i * 0.5, drum(60, 0.6, 0.5)) for i in range(int(d / 0.5))]
    x = seq(*items)[:int(d * SR)]
    x = lp(x, 9000 - 6000 * dist) + 0.0
    # loopable: cross-fade the tail into the head
    k = int(0.3 * SR); x[:k] = x[:k] * np.linspace(0, 1, k) + x[-k:] * np.linspace(1, 0, k); return x[:-k]

S = {}
def sound(sid, cat, title, when, *opts): S[sid] = dict(cat=cat, title=title, when=when, opts=opts)

# ---- units: select
sound('sel_wayfinder', 'Units: select', 'Select Wayfinder', 'Clicking a Wayfinder',
      ('Bright “hup!”', lambda: say(syl('u', 'u', 0.16, 300, 360, 0.1, h=0.05, end='p'))),
      ('Rising “hey!”', lambda: say(syl('e', 'i', 0.26, 270, 360, 0.1, h=0.06))),
      ('Two-note whistle', lambda: seq((0, np.sin(2 * np.pi * np.cumsum(np.full(int(0.14 * SR), 1600)) / SR) * np.sin(np.pi * T(0.14) / 0.14)), (0.16, np.sin(2 * np.pi * np.cumsum(np.linspace(1600, 2150, int(0.22 * SR))) / SR) * np.sin(np.pi * T(0.22) / 0.22))) * 0.6))
sound('sel_mason', 'Units: select', 'Select Mason', 'Clicking a Mason',
      ('Low “hm” + tool clink', lambda: seq((0, syl('m', 'm', 0.3, 115, 105, 0.05)), (0.12, clink(2100, 0.35, 0.5)))),
      ('Gruff “aye”', lambda: say(syl('a', 'i', 0.34, 120, 100, 0.12))),
      ('“Huh?” + hammer tap', lambda: seq((0, syl('uh', 'uh', 0.2, 110, 140, 0.15, h=0.07)), (0.28, mix(knock(650, 0.1, 0.7), clink(3200, 0.2, 0.3))))))
sound('sel_soldier', 'Units: select', 'Select soldiers / army', 'Clicking an army',
      ('Gear rattle + “hm!”', lambda: seq((0, jingle(0.18, 16, 1.0)), (0.08, syl('m', 'm', 0.18, 150, 135, 0.05)))),
      ('Sword draw + “ha!”', lambda: seq((0, scrape(0.28, 2500, 8000, 0.9)), (0.25, clink(1400, 0.4, 0.4)), (0.12, syl('a', 'a', 0.15, 170, 150, 0.15, h=0.05)))),
      ('Shield bang + “hup!”', lambda: seq((0, mix(thump(110, 0.2, 1), knock(300, 0.15, 0.8))), (0.12, syl('u', 'u', 0.13, 160, 170, 0.1, h=0.04, end='p')))))
sound('sel_mage', 'Units: select', 'Select Mage', 'Clicking a Mage',
      ('Shimmer + soft “mm”', lambda: mix(sparkle(5, 3000, 5000) * 0.5, syl('m', 'm', 0.35, 190, 210, 0.05) * 0.7)),
      ('Rising chime', lambda: arp(['A5', 'E6', 'A6'], 0.07)),
      ('Whoosh + sparkle', lambda: seq((0, whoosh(0.35, 800, 4000, 0.7)), (0.25, sparkle(4, 3500, 6000) * 0.6))))
# ---- units: move (footsteps)
sound('mv_wayfinder', 'Units: move order', 'Wayfinder moves', 'Ordering a Wayfinder to move',
      ('Light steps on grass', lambda: walk(4, 0.2, 'grass', 0.7)),
      ('Quick steps on a dirt path', lambda: walk(4, 0.17, 'dirt', 0.7)),
      ('Steps + satchel jingle', lambda: walk(4, 0.2, 'dirt', 0.7, extra=lambda i: jingle(0.06, 3, 0.5, 2000, 4500))))
sound('mv_mason', 'Units: move order', 'Mason moves', 'Ordering a Mason to move',
      ('Heavy boots + tool clinks', lambda: walk(3, 0.34, 'dirt', 1.4, extra=lambda i: clink(R.uniform(2000, 2600), 0.2, 0.25))),
      ('Plodding on gravel', lambda: walk(3, 0.36, 'gravel', 1.5)),
      ('Boots + bag of tools clanking', lambda: walk(3, 0.34, 'dirt', 1.4, extra=lambda i: mix(knock(800, 0.08, 0.4), jingle(0.08, 5, 0.6, 1500, 3500)))))
sound('mv_army', 'Units: move order', 'Army moves', 'Ordering an army to move',
      ('Heavy marching in step, armor jingling', lambda: march(5, 0.42)),
      ('Marching to a drum beat', lambda: mix(march(5, 0.42, 6), seq(*[(i * 0.42, drum(65, 0.5, 0.6)) for i in range(5)]))),
      ('March with a “hup! hup!” call', lambda: mix(march(5, 0.42, 6), seq((0.0, syl('u', 'u', 0.12, 150, 160, 0.1, h=0.04, end='p') * 0.6), (0.84, syl('u', 'u', 0.12, 150, 165, 0.1, h=0.04, end='p') * 0.5)))))
sound('mv_cavalry', 'Units: move order', 'Cavalry moves', 'Ordering an army of riders (optional; else armies use the march)',
      ('Trotting hooves', lambda: hooves(4, 0.32)),
      ('Galloping hooves', lambda: hooves(4, 0.36, gallop=True)),
      ('Hooves + armor', lambda: hooves(4, 0.32, armor=True)))
sound('mv_mage', 'Units: move order', 'Mage moves', 'Ordering a Mage to move',
      ('Soft steps + staff taps', lambda: walk(3, 0.3, 'dirt', 0.8, extra=lambda i: knock(900, 0.08, 0.45) if i % 2 == 0 else sil(0.01))),
      ('Steps + robe swish', lambda: mix(walk(3, 0.3, 'grass', 0.8), whoosh(0.9, 400, 1400, 0.25))),
      ('Steps + tiny sparkle', lambda: mix(walk(3, 0.3, 'dirt', 0.8), at(sparkle(3, 3500, 6000) * 0.35, 0.05))))
# ---- interface
sound('ui_click', 'Interface', 'Button click', 'Clicking any button',
      ('Wooden tap', lambda: knock(620, 0.08, 1)),
      ('Soft double knock', lambda: seq((0, knock(520, 0.07, 0.8)), (0.05, knock(700, 0.07, 0.5)))),
      ('Paper tick', lambda: hp(N(0.025), 2500) * ex(T(0.025), 0.004)))
sound('ui_panel', 'Interface', 'Open a panel', 'Opening Research, Armory or Diplomacy',
      ('Parchment rustle', lambda: crinkle(0.35, 70)),
      ('Book thump + page', lambda: seq((0, thump(90, 0.2, 0.7)), (0.08, crinkle(0.25, 50, 2000, 9000)))),
      ('Scroll unrolling', lambda: mix(crinkle(0.5, 40, 1200, 7000) * np.linspace(0.4, 1, int(0.5 * SR) + 0)[:int(0.5 * SR)], at(knock(300, 0.1, 0.4), 0.45))))
sound('ui_error', 'Interface', 'Can’t do that', 'Not enough resources, blocked route, and so on',
      ('Low wooden thunk', lambda: mix(knock(170, 0.2, 1), thump(80, 0.2, 0.5))),
      ('Muted two-note “nuh-uh”', lambda: seq((0, pluck(hz('E3'), 0.3)), (0.16, pluck(hz('C3'), 0.4))) * np.concatenate([np.ones(1), np.ones(1)])[0]),
      ('Dull cloth thud', lambda: lp(thump(65, 0.25, 1), 500)))
# ---- building
sound('bld_work', 'Building', 'Construction under way', 'While a Mason builds (short, can repeat)',
      ('Hammer on wood', lambda: seq(*[(i * 0.32 + R.normal(0, 0.01), mix(knock(R.uniform(480, 560), 0.12, 1), clink(3000, 0.1, 0.15))) for i in range(4)])),
      ('Saw, then hammer', lambda: seq((0, scrape(0.25, 1500, 5000, 0.7)), (0.28, scrape(0.25, 1500, 5000, 0.7)), (0.6, knock(520, 0.12)), (0.9, knock(520, 0.12)))),
      ('Chisel on stone', lambda: seq(*[(i * 0.28, mix(clink(R.uniform(2600, 3200), 0.15, 0.6), knock(900, 0.08, 0.6), crunch(0.06, 0.4))) for i in range(4)])))
sound('bld_done', 'Building', 'Building finished', 'A building or upgrade completes',
      ('Clunk + wooden creak', lambda: seq((0, mix(thump(70, 0.25, 1), knock(260, 0.2, 0.9))), (0.15, creak(0.45, (30, 60), 0.4)))),
      ('Clunk + small bell', lambda: seq((0, mix(thump(70, 0.25, 1), knock(260, 0.2, 0.9))), (0.12, bell(hz('E6'), 1.5, 0.8, vel=0.4)))),
      ('Clunk + rising chime', lambda: seq((0, mix(thump(70, 0.25, 1), knock(260, 0.2, 0.9))), (0.1, arp(['D5', 'A5', 'D6'], 0.08) * 0.5))))
sound('bld_outpost', 'Building', 'Outpost founded', 'A new outpost is set up',
      ('Tent snaps open + stake hammered', lambda: seq((0, hp(N(0.05), 800) * ex(T(0.05), 0.01) * 1.2), (0.03, lp(N(0.25), 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 22 * T(0.25))) * ex(T(0.25), 0.08) * 0.6), (0.35, knock(560, 0.12)), (0.6, knock(580, 0.12)))),
      ('Tent snap + cloth flutter', lambda: seq((0, hp(N(0.05), 800) * ex(T(0.05), 0.01) * 1.2), (0.05, lp(N(0.7), 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * T(0.7))) * np.sin(np.pi * T(0.7) / 0.7) * 0.45))),
      ('Stake hammered + flag flap', lambda: seq((0, knock(560, 0.12)), (0.25, knock(580, 0.12)), (0.45, lp(N(0.6), 3000) * np.abs(np.sin(2 * np.pi * 7 * T(0.6))) * np.sin(np.pi * T(0.6) / 0.6) * 0.5))))
# ---- battle
sound('bat_loop', 'Battle', 'Battle (loops)', 'Plays while a battle is on screen; quieter when far away',
      ('Distant swords and shouts', lambda: battle_bed(4.0, 4, True, False, 0.75)),
      ('Close-up clashing steel', lambda: battle_bed(4.0, 7, True, False, 0.2)),
      ('Clashes with war drums', lambda: battle_bed(4.0, 5, True, True, 0.5)))
sound('bat_fall', 'Battle', 'Soldier falls', 'A soldier dies (rate-limited in big fights)',
      ('Cartoon “oof” + armor clatter', lambda: seq((0, syl('u', 'u', 0.16, 170, 120, 0.2, h=0.03)), (0.12, mix(thump(80, 0.2, 0.8), jingle(0.2, 14, 0.9))))),
      ('Armor clatter only', lambda: mix(thump(80, 0.2, 0.8), jingle(0.3, 20, 1.0), at(knock(420, 0.1, 0.5), 0.08))),
      ('“Agh!” + thud', lambda: seq((0, syl('a', 'uh', 0.22, 200, 130, 0.25, h=0.02)), (0.2, thump(70, 0.25, 1)))))
sound('bat_win', 'Battle', 'Battle won', 'Your side wins a battle',
      ('Three-note horn + cheer', lambda: mix(seq((0, horn(hz('D4'), 0.22)), (0.24, horn(hz('F#4'), 0.22)), (0.48, horn(hz('A4'), 0.9))), at(crowd(1.2, 14, 'cheer', False, 0.35), 0.5))),
      ('Short fanfare', lambda: seq((0, horn(hz('A4'), 0.14)), (0.15, horn(hz('A4'), 0.14)), (0.3, horn(hz('A4'), 0.14)), (0.45, horn(hz('D5'), 0.3)), (0.78, horn(hz('A4'), 0.18)), (0.98, horn(hz('D5'), 0.8)))),
      ('Cheer + drum hit', lambda: mix(drum(55, 1.2, 1.2), at(crowd(1.3, 18, 'cheer', False, 0.6), 0.05))))
sound('bat_lose', 'Battle', 'Defeat or retreat', 'Your side loses or pulls back',
      ('Two falling horn notes + running feet', lambda: mix(seq((0, horn(hz('A3'), 0.4)), (0.42, horn(hz('E3'), 0.9))), at(walk(6, 0.12, 'dirt', 0.9) * 0.6, 0.6))),
      ('Sad falling horn', lambda: seq((0, horn(hz('D4'), 0.35)), (0.37, horn(hz('C4'), 0.35)), (0.74, horn(hz('A3'), 1.1, vib=0.01)))),
      ('Running feet + distant drum', lambda: mix(walk(8, 0.11, 'dirt', 0.9), lp(drum(50, 1.2, 0.8), 400))))
# ---- war and peace
sound('war_declare', 'War and peace', 'War declared', 'You declare war, or war is declared on you',
      ('Deep drum hit + low horn', lambda: mix(drum(45, 2.0, 1.4), at(horn(hz('D3'), 1.6, bright=0.8), 0.25))),
      ('Three drum hits + horn', lambda: mix(seq((0, drum(45, 1.5, 1.2)), (0.45, drum(45, 1.5, 1.2)), (0.9, drum(45, 2, 1.4))), at(horn(hz('A2'), 1.4, bright=0.9), 1.0))),
      ('Horn + dark gong', lambda: mix(horn(hz('D3'), 1.3, bright=1.0), at(dark_bell(hz('D2'), 3.5) * 0.8, 0.9))))
sound('war_peace', 'War and peace', 'Peace signed', 'A peace deal is made',
      ('Wax seal + bell', lambda: seq((0, lp(N(0.25), 300) * att(T(0.25), 0.08) * ex(T(0.25), 0.1) * 1.2), (0.05, thump(90, 0.15, 0.5)), (0.3, bell(hz('A5'), 2.5, 0.7, vel=0.6)))),
      ('Seal + two bells', lambda: seq((0, lp(N(0.25), 300) * att(T(0.25), 0.08) * ex(T(0.25), 0.1) * 1.2), (0.3, bell(hz('D5'), 2.2, 0.7, vel=0.5)), (0.6, bell(hz('A5'), 2.5, 0.7, vel=0.5)))),
      ('Quill + bell chord', lambda: seq((0, scrape(0.35, 3000, 8000, 0.5)), (0.4, mix(bell(hz('D5'), 2.5, 0.6, vel=0.4), bell(hz('F#5'), 2.5, 0.6, vel=0.35), bell(hz('A5'), 2.5, 0.6, vel=0.35))))))
sound('war_fort_win', 'War and peace', 'Fort captured', 'You occupy an enemy fort or capital',
      ('Gate slam + fanfare', lambda: mix(gate_slam(), at(seq((0, horn(hz('D4'), 0.18)), (0.2, horn(hz('A4'), 0.18)), (0.4, horn(hz('D5'), 0.7))), 0.35))),
      ('Gate slam + cheer', lambda: mix(gate_slam(), at(crowd(1.4, 18, 'cheer', False, 0.6), 0.25))),
      ('Gate slam + horn', lambda: mix(gate_slam(), at(horn(hz('A3'), 1.0), 0.3))))
sound('war_fort_lose', 'War and peace', 'Fort lost', 'The enemy occupies your fort or capital',
      ('Gate slam + falling note', lambda: mix(gate_slam(), at(seq((0, horn(hz('A3'), 0.3)), (0.32, horn(hz('F3'), 0.9))), 0.35))),
      ('Gate slam + low horn', lambda: mix(gate_slam(), at(horn(hz('D3'), 1.3, bright=0.6), 0.3))),
      ('Gate slam + crowd groan', lambda: mix(gate_slam(), at(crowd(1.4, 16, 'groan', False, 0.5), 0.25))))
# ---- progress
sound('pr_research', 'Progress', 'Research complete', 'Any Government or Military technology finishes',
      ('Quill + rising chime', lambda: seq((0, scrape(0.3, 3000, 8000, 0.45)), (0.3, arp(['D5', 'F#5', 'A5', 'D6'], 0.08) * 0.6))),
      ('Page turn + chime', lambda: seq((0, crinkle(0.25, 60)), (0.22, chime(hz('A5'), 1.6) * 0.7))),
      ('Chime arpeggio', lambda: arp(['A4', 'D5', 'F#5', 'A5', 'D6'], 0.07) * 0.6))
sound('pr_research_magic', 'Progress', 'Magic research complete', 'A Magic technology finishes',
      ('Chime + sparkle', lambda: mix(arp(['D5', 'A5', 'D6'], 0.08) * 0.6, at(sparkle(6), 0.2) * 0.5)),
      ('Short choir “ah” + sparkle', lambda: mix(choir(['D4', 'A4', 'F#5'], 1.4, 'ah', 0.6, 0.2), at(sparkle(5), 0.3) * 0.4)),
      ('Glassy shimmer', lambda: seq(*[(i * 0.05, np.sin(2 * np.pi * R.uniform(2000, 4500) * T(1.2)) * np.sin(np.pi * T(1.2) / 1.2) * 0.15) for i in range(8)])))
sound('pr_trained', 'Progress', 'Unit trained', 'A unit comes out of the capital, barracks or tower',
      ('Door creak', lambda: creak(0.6, (25, 55), 0.7)),
      ('Door creak + boots', lambda: seq((0, creak(0.5, (25, 55), 0.6)), (0.4, walk(2, 0.25, 'stone', 1.2)))),
      ('Wooden door thump', lambda: seq((0, knock(240, 0.2, 1)), (0.03, thump(70, 0.2, 0.6)))))
sound('pr_survey', 'Progress', 'Survey complete', 'A Wayfinder finishes surveying',
      ('Map unrolls + ding', lambda: seq((0, crinkle(0.35, 45, 1200, 7000)), (0.35, chime(hz('E6'), 1.0) * 0.6))),
      ('Quill + ding', lambda: seq((0, scrape(0.25, 3000, 8000, 0.45)), (0.25, chime(hz('E6'), 1.0) * 0.6))),
      ('Double ding', lambda: seq((0, chime(hz('B5'), 0.8) * 0.5), (0.12, chime(hz('E6'), 1.0) * 0.6))))
sound('pr_gold', 'Progress', 'Hidden Gold Deposit found', 'A survey finds a gold deposit',
      ('Sparkle + coins', lambda: mix(sparkle(6, 3000, 6000) * 0.5, at(coins(4), 0.15) * 0.6)),
      ('Sparkle arpeggio', lambda: arp(['E6', 'G#6', 'B6', 'E7'], 0.06) * 0.5),
      ('Ding-ding + coin', lambda: seq((0, chime(hz('B5'), 0.6) * 0.5), (0.1, chime(hz('E6'), 0.8) * 0.5), (0.3, clink(3600, 0.4, 0.6)))))
# ---- magic
sound('mg_life', 'Magic', 'Life spell', 'Harvest, Hardened Skin or Mending is cast',
      ('Birdsong + chime', lambda: mix(seq((0, bird()), (0.35, bird()), (0.7, bird())), at(chime(hz('A5'), 1.6) * 0.5, 0.1))),
      ('Rustling leaves + wind chime', lambda: mix(crinkle(1.4, 50, 1500, 7000) * np.sin(np.pi * T(1.4) / 1.4) * 0.8, seq(*[(R.uniform(0, 1.0), chime(R.choice([hz('D6'), hz('E6'), hz('A6'), hz('B6')]), 1.2) * 0.3) for _ in range(5)]))),
      ('Warm swell + birds', lambda: mix(pad([hz('D4'), hz('A4'), hz('F#5')], 1.8, 0.5, 1800, 1.2), at(bird(), 0.5), at(bird(), 1.0))))
sound('mg_death', 'Magic', 'Death spell', 'Cursed Weapons or Grave Robbing is cast',
      ('Low hum + bone rattle', lambda: mix(hum(50, 1.6, 1.2), at(seq(*[(R.uniform(0, 0.4), knock(R.uniform(1300, 2400), 0.06, 0.5)) for _ in range(9)]), 0.5))),
      ('Whisper + low hum', lambda: mix(hum(46, 1.8, 1.0), at(whisper(1.1, 0.7), 0.2))),
      ('Bone rattle + dark bell', lambda: mix(seq(*[(R.uniform(0, 0.4), knock(R.uniform(1300, 2400), 0.06, 0.5)) for _ in range(9)]), at(dark_bell(hz('D3'), 3.0) * 0.6, 0.3))))
sound('mg_arcane', 'Magic', 'Arcane spell', 'Trading, Stasis Trap or Clear Thoughts is cast',
      ('Glass shimmer', lambda: seq(*[(i * 0.06, np.sin(2 * np.pi * R.uniform(2200, 4800) * T(1.0)) * np.sin(np.pi * T(1.0) / 1.0) * (1 + 0.3 * np.sin(2 * np.pi * 7 * T(1.0))) * 0.14) for i in range(9)])),
      ('Crystal tones', lambda: arp(['B5', 'F#6', 'D6', 'A6', 'E7'], 0.09, chime, 1.2) * 0.55),
      ('Shimmer + whoosh', lambda: mix(whoosh(0.8, 600, 6000, 0.5), at(sparkle(7, 3000, 6500) * 0.5, 0.3))))
sound('mg_rift', 'Magic', 'Rift opens / army steps through', 'Rift is cast or used',
      ('Whoosh in, then out', lambda: seq((0, whoosh(0.5, 3000, 200, 0.9)), (0.45, whoosh(0.5, 200, 3000, 0.9)))),
      ('Deep warp', lambda: (lambda t: np.sin(2 * np.pi * np.cumsum(120 + 500 * np.sin(np.pi * t / 1.2) ** 2) / SR) * np.sin(np.pi * t / 1.2) * 0.5)(T(1.2)) + whoosh(1.2, 200, 1500, 0.3)),
      ('Whoosh + crystal ring', lambda: mix(whoosh(0.7, 300, 4000, 0.8), at(chime(hz('F#6'), 1.6) * 0.5, 0.5))))
sound('mg_risen', 'Magic', 'Risen Dead', 'A fallen soldier gets back up',
      ('Dirt crunch + bony clatter', lambda: seq((0, crunch(0.3, 1.0)), (0.25, seq(*[(R.uniform(0, 0.3), knock(R.uniform(1300, 2400), 0.06, 0.6)) for _ in range(10)])))),
      ('Clatter + low groan', lambda: mix(seq(*[(R.uniform(0, 0.3), knock(R.uniform(1300, 2400), 0.06, 0.6)) for _ in range(10)]), at(syl('o', 'u', 0.6, 95, 75, 0.3), 0.2) * 0.6)),
      ('Dirt + whisper', lambda: mix(crunch(0.35, 1.0), at(whisper(0.8, 0.6), 0.15))))
sound('mg_school', 'Magic', 'School of magic chosen', 'Picking Life, Death or Arcane',
      ('Choir swell “ah”', lambda: choir(['D3', 'A3', 'D4', 'F#4'], 2.4, 'ah', 1.0, 0.8)),
      ('Choir chord + bell', lambda: mix(choir(['D3', 'A3', 'F#4'], 2.2, 'o', 0.8, 0.5), at(bell(hz('D6'), 2.0, 0.8, vel=0.4), 0.3))),
      ('Organ-like chord', lambda: pad([hz('D3'), hz('A3'), hz('D4'), hz('F#4')], 2.4, 0.4, 2200, 1.6)))
# ---- warnings
sound('wn_exhaust', 'Warnings', 'Exhaustion warning', 'Army or Tyranny Exhaustion reaches 5 and 10',
      ('Single low bell', lambda: dark_bell(hz('A2'), 3.0)),
      ('Two low bells', lambda: seq((0, dark_bell(hz('A2'), 2.0) * 0.8), (0.6, dark_bell(hz('A2'), 3.0)))),
      ('Low bell + drum', lambda: mix(dark_bell(hz('A2'), 3.0), drum(48, 1.4, 0.9))))
sound('wn_unrest', 'Warnings', 'Army deserts / province abandoned', 'Exhaustion hits its limit',
      ('Angry crowd rises, door slams', lambda: seq((0, crowd(1.8, 24, 'angry', True, 1.0)), (1.8, mix(knock(200, 0.25, 1.2), thump(60, 0.3, 1.0))))),
      ('Angry crowd only', lambda: crowd(2.0, 28, 'angry', True, 1.0)),
      ('Crowd + crash', lambda: seq((0, crowd(1.5, 22, 'angry', True, 1.0)), (1.4, mix(crunch(0.4, 1.4), knock(300, 0.2, 1.0), jingle(0.3, 18, 0.8, 1500, 5000))))))
sound('wn_enemy', 'Warnings', 'Enemy enters your land', 'Hostile army crosses your border (once per 30 s)',
      ('Short warning horn', lambda: horn(hz('E4'), 0.7, bright=1.3)),
      ('Two short blasts', lambda: seq((0, horn(hz('E4'), 0.28, bright=1.3)), (0.36, horn(hz('E4'), 0.5, bright=1.3)))),
      ('Horn + drum roll', lambda: mix(horn(hz('E4'), 0.8, bright=1.2), seq(*[(i * 0.06, drum(70, 0.3, 0.35 + 0.03 * i)) for i in range(12)]))))
sound('wn_ally', 'Warnings', 'Ally joins your war', 'Your ally is pulled into a war on your side',
      ('Distant answering horn', lambda: seq((0, horn(hz('A3'), 0.6)), (0.75, lp(horn(hz('E4'), 0.9), 1400) * 0.6))),
      ('Friendly rising horn', lambda: seq((0, horn(hz('D4'), 0.25)), (0.28, horn(hz('E4'), 0.25)), (0.56, horn(hz('A4'), 0.8)))),
      ('Horn + distant cheer', lambda: mix(horn(hz('A3'), 0.8), at(lp(crowd(1.2, 14, 'cheer', False, 0.4), 1800), 0.4))))

# ================================================================ round 2: new takes after the first review
from scipy.signal import resample_poly
from fractions import Fraction

def cv(onset, v1, v2, d, f0a, f0b, breath=0.06, vel=1.0, end=None):
    """One consonant+vowel syllable at a natural pitch (sped up later for the cartoon voice)."""
    core = syl(v1, v2, d, f0a, f0b, breath, end=end)
    if onset in ('b', 'd', 'g'):
        hi = {'b': (200, 1500), 'd': (2500, 5000), 'g': (1200, 3000)}[onset]
        murmur = lp(glottal(f0a, 0.035, 0.02), 400) * 0.25
        burst = bp(N(0.012), *hi) * ex(T(0.012), 0.004) * 0.6
        core = np.concatenate([murmur, burst, core])
    elif onset in ('m', 'n'):
        nas = formants(glottal(np.linspace(f0a * 0.95, f0a, int(0.07 * SR)), 0.07, 0.02), 'm') * att(T(0.07), 0.015)
        core = np.concatenate([nas / (np.max(np.abs(nas)) + 1e-9) * 0.6, core])
    elif onset == 'h':
        core = np.concatenate([formants(N(0.05), v1) * np.linspace(0.1, 0.5, int(0.05 * SR)) / 6, core])
    elif onset == 'y':
        core = np.concatenate([syl('i', v1, 0.06, f0a, f0a, breath) * 0.8, core])
    elif onset == 'w':
        core = np.concatenate([syl('u', v1, 0.06, f0a, f0a, breath) * 0.8, core])
    elif onset == 'ch':
        core = np.concatenate([sil(0.02), hp(N(0.07), 2500) * att(T(0.07), 0.01) * ex(T(0.07), 0.04) * 0.9, core])
    return core * vel

def toon(syls, speed=1.6, gap=0.012, bright=1.0):
    """Join syllables and speed the whole thing up: pitch and formants rise together, which is what makes a voice
    sound small and cartoonish rather than robotic."""
    parts = []
    for s in syls: parts += [s, sil(gap)]
    x = np.concatenate(parts)
    fr = Fraction(1 / speed).limit_denominator(40)
    y = resample_poly(x, fr.numerator, fr.denominator)
    return lp(y, 7000) * bright

# --- character voices (Pit People-ish babble: short, bouncy, high) ---
def wf_voice(k):
    if k == 0: return toon([cv('h', 'u', 'u', 0.1, 200, 230, end='p'), cv('', 'a', 'a', 0.13, 260, 300)], 1.9)                        # "hup-ah!"
    if k == 1: return toon([cv('y', 'a', 'a', 0.1, 210, 250), cv('', 'i', 'i', 0.08, 270, 320), cv('h', 'u', 'u', 0.11, 300, 260)], 1.9)   # "ya-ee-hoo"
    return toon([cv('b', 'i', 'i', 0.07, 230, 240), cv('d', 'a', 'a', 0.07, 250, 260), cv('', 'i', 'i', 0.12, 280, 340)], 2.0)            # "bi-da-dee!"
def mason_voice(k):
    if k == 0: return toon([cv('h', 'uh', 'uh', 0.12, 120, 130), cv('m', 'uh', 'uh', 0.16, 135, 115)], 1.75)                           # "huh-muh" (gruff)
    if k == 1: return toon([cv('b', 'o', 'o', 0.1, 120, 125), cv('d', 'uh', 'uh', 0.18, 130, 110)], 1.75)                              # "bo-duh"
    return toon([cv('m', 'm', 'm', 0.12, 115, 125), cv('', 'a', 'a', 0.16, 130, 115, end='p')], 1.8)                                     # "mm-ap"
def soldier_voice(k):
    if k == 0: return toon([cv('h', 'u', 'u', 0.08, 160, 170, end='p'), cv('h', 'a', 'a', 0.12, 175, 160)], 1.7)                        # "hup-hah!"
    if k == 1: return toon([cv('y', 'a', 'a', 0.16, 160, 190), cv('', 'a', 'a', 0.08, 190, 150)], 1.7)                                  # "yah-ah!"
    return toon([cv('d', 'a', 'a', 0.08, 165, 170), cv('h', 'u', 'u', 0.12, 175, 150, end='t')], 1.75)                                   # "da-hut!"
def mage_voice(k):
    if k == 0: return toon([cv('w', 'i', 'i', 0.12, 230, 300), cv('', 'o', 'o', 0.16, 300, 240)], 1.8)                                  # "wee-oo"
    if k == 1: return toon([cv('m', 'i', 'i', 0.1, 260, 280), cv('m', 'i', 'i', 0.1, 300, 320), cv('', 'o', 'o', 0.14, 330, 280)], 1.8)  # "mi-mi-oh"
    return toon([cv('h', 'm', 'm', 0.18, 220, 290), cv('', 'a', 'a', 0.12, 290, 250)], 1.75)                                           # "hmm-ah?"

sound('sel_wayfinder', 'Units: select', 'Select Wayfinder', 'Clicking a Wayfinder',
      ('Chirpy “hup-ah!”', lambda: wf_voice(0)), ('Excited “ya-ee-hoo”', lambda: wf_voice(1)), ('Bouncy “bi-da-dee!”', lambda: wf_voice(2)))
sound('sel_mason', 'Units: select', 'Select Mason', 'Clicking a Mason',
      ('Gruff “huh-muh” + tool clink', lambda: mix(mason_voice(0), at(clink(2600, 0.25, 0.25), 0.2))), ('Grumbly “bo-duh”', lambda: mason_voice(1)), ('“Mm-ap!” + hammer tap', lambda: mix(mason_voice(2), at(knock(700, 0.08, 0.5), 0.25))))
sound('sel_soldier', 'Units: select', 'Select soldiers / army', 'Clicking an army',
      ('Barked “hup-hah!”', lambda: mix(soldier_voice(0), at(jingle(0.12, 8, 0.4, 2000, 4500), 0.05))), ('“Yah-ah!” + sword ring', lambda: mix(soldier_voice(1), at(clink(1500, 0.35, 0.25), 0.1))), ('Clipped “da-hut!” + shield tap', lambda: mix(at(soldier_voice(2), 0.05), knock(320, 0.12, 0.6))))
sound('sel_mage', 'Units: select', 'Select Mage', 'Clicking a Mage',
      ('Sing-song “wee-oo”', lambda: mix(mage_voice(0), at(sparkle(3, 3500, 6000) * 0.25, 0.1))), ('Wobbly “mi-mi-oh”', lambda: mage_voice(1)), ('Curious “hmm-ah?” + shimmer', lambda: mix(mage_voice(2), at(sparkle(3, 3500, 6000) * 0.2, 0.2))))

# --- heavy, crunchy marching (low, no bright jingles) ---
def heavy_crunch(d=0.16, vel=1.0, lo=150, hi=1400):
    o = sil(d + 0.05)
    for _ in range(int(140 * d)):
        s = int(R.uniform(0, d * 0.6) * SR); tt = T(0.025); g = bp(R.normal(0, 1, len(tt)), lo, hi) * ex(tt, 0.006) * R.uniform(0.2, 1); o[s:s + len(g)] += g
    return o * vel
def boot(vel=1.0, gravel=False):
    return mix(thump(52, 0.22, 1.1), heavy_crunch(0.16, 0.9 if gravel else 0.7, 120, 1100 if gravel else 900)) * vel
def heavy_march(n=6, gap=0.5, men=10, gravel=False, low_jingle=False):
    items = []
    for i in range(n):
        for m in range(men): items.append((i * gap + R.normal(0, 0.022), boot(R.uniform(0.3, 0.6) * (1 - 0.3 * i / n), gravel)))
        if low_jingle: items.append((i * gap + 0.03, lp(jingle(0.12, 8, 0.6, 1200, 2600), 2500)))
    return lp(seq(*items), 3200)
sound('mv_army', 'Units: move order', 'Army moves', 'Ordering an army to move',
      ('Heavy crunching march', lambda: heavy_march(6, 0.5, 10)),
      ('Heavier, on gravel', lambda: heavy_march(6, 0.52, 12, gravel=True)),
      ('Crunching march + low armor clank', lambda: heavy_march(6, 0.5, 10, low_jingle=True)))

# --- cavalry: horse snort, then crunching hooves ---
def snort(d=0.55, vel=1.0):
    t = T(d); flutter = 0.55 + 0.45 * np.sin(2 * np.pi * R.uniform(28, 38) * t)
    x = bp(N(d), 250, 2200) * flutter * att(t, 0.03) * ex(t, d * 0.4)
    return (x + lp(N(d), 300) * ex(t, 0.08) * 0.5) * vel
def hoof(vel=1.0):
    return mix(thump(80, 0.14, 0.7), knock(R.uniform(330, 420), 0.08, 0.5), heavy_crunch(0.1, 0.7, 150, 1300)) * vel
def hoof_steps(n=6, gap=0.26, pair=0.11):
    items = []
    for i in range(n):
        for o in (0, pair): items.append((i * gap + o + R.normal(0, 0.006), hoof(R.uniform(0.6, 1.0) * (1 - 0.35 * i / n))))
    return seq(*items)
sound('mv_cavalry', 'Units: move order', 'Cavalry moves', 'Ordering an army of riders',
      ('Snort + crunching walk', lambda: seq((0, snort()), (0.45, hoof_steps(6, 0.3, 0.13)))),
      ('Double snort + crunching trot', lambda: seq((0, snort(0.35)), (0.35, snort(0.45, 0.8)), (0.75, hoof_steps(7, 0.24, 0.1)))),
      ('Snort + crunching hooves + tack', lambda: seq((0, snort()), (0.45, mix(hoof_steps(6, 0.28, 0.12), lp(seq(*[(i * 0.28, jingle(0.08, 5, 0.5, 1500, 3000)) for i in range(6)]), 3000))))))

# --- mage: subtle ---
def soft_step(vel=1.0): return lp(mix(thump(75, 0.12, 0.5), crinkle(0.07, 60, 600, 3000) * 0.5), 1800) * vel
sound('mv_mage', 'Units: move order', 'Mage moves', 'Ordering a Mage to move',
      ('Barely-there soft shoes', lambda: seq(*[(i * 0.36 + R.normal(0, 0.01), soft_step(0.6 * (1 - 0.3 * i / 3))) for i in range(3)])),
      ('Soft shoes + muffled staff tap', lambda: seq(*[(i * 0.36, soft_step(0.6)) for i in range(3)], (0.02, lp(knock(500, 0.08, 0.35), 1500)))),
      ('Soft shoes + faint hum', lambda: mix(seq(*[(i * 0.36, soft_step(0.6)) for i in range(3)]), hum(140, 1.2, 0.25))))

# --- opening a panel: no parchment ---
sound('ui_panel', 'Interface', 'Open a panel', 'Opening Research, Armory or Diplomacy',
      ('Wooden drawer slides open', lambda: seq((0, lp(scrape(0.22, 300, 1600, 0.5), 2000)), (0.2, knock(260, 0.12, 0.6)))),
      ('Leather book flaps open', lambda: seq((0, lp(N(0.12), 600) * ex(T(0.12), 0.04) * 0.9), (0.04, creak(0.18, (40, 70), 0.25, (300, 700, 1400))))),
      ('Latch click + soft ting', lambda: seq((0, knock(1400, 0.04, 0.6)), (0.03, knock(900, 0.05, 0.4)), (0.08, chime(hz('E6'), 0.6) * 0.25))))

# --- building finished: the Mason says so ---
def mason_ok(k):
    if k == 0: return toon([cv('m', 'm', 'm', 0.1, 120, 135), cv('h', 'm', 'm', 0.12, 140, 115)], 1.75)        # "mm-hm!"
    if k == 1: return toon([cv('y', 'uh', 'uh', 0.13, 125, 140, end='p')], 1.75)                                # "yup!"
    return toon([cv('h', 'a', 'a', 0.16, 135, 120)], 1.75)                                                       # "hah!"
clunk = lambda: mix(thump(70, 0.25, 1), knock(260, 0.2, 0.9))
sound('bld_done', 'Building', 'Building finished', 'A building or upgrade completes',
      ('Clunk + Mason’s “mm-hm!”', lambda: seq((0, clunk()), (0.18, mason_ok(0)))),
      ('Clunk + Mason’s “yup!”', lambda: seq((0, clunk()), (0.18, mason_ok(1)))),
      ('Clunk + Mason’s “hah!” + chime', lambda: seq((0, clunk()), (0.18, mason_ok(2)), (0.45, chime(hz('A5'), 1.0) * 0.3))))

# --- battle: a war cry over smashing steel ---
def man_yell(vowel='a', d=0.9, f0=170, rise=1.15, onset='ch', end='j'):
    x = cv(onset, vowel, 'uh', d, f0, f0 * rise, 0.35)
    if end == 'j': x = np.concatenate([x, bp(N(0.08), 1800, 4500) * ex(T(0.08), 0.03) * 0.5])
    return x
def war_cry(men=14, word='charge', loud=1.0):
    items = []
    for m in range(men):
        f0 = R.uniform(120, 210); d = R.uniform(0.75, 1.05)
        if word == 'charge': y = man_yell('a', d, f0, R.uniform(1.0, 1.25), 'ch', 'j')
        else: y = man_yell('a', d, f0, R.uniform(0.9, 1.2), 'h', None)
        items.append((R.uniform(0, 0.12), y * R.uniform(0.5, 1)))
    return verb(lp(seq(*items), 4500), 0.6, 0.25) * loud
def steel(d=3.0, density=7):
    return lp(seq(*[(R.uniform(0, d - 0.3), mix(clink(R.uniform(900, 1500), 0.45, 1.0), scrape(0.1, 2500, 7000, 0.5), thump(90, 0.1, 0.4)) * R.uniform(0.3, 1)) for _ in range(int(density * d))]), 4200)
def leader(word='charge'):
    return toon([cv('ch', 'a', 'a', 0.55, 150, 185), np.concatenate([bp(N(0.07), 1800, 4500) * ex(T(0.07), 0.03) * 0.6])], 1.0)
sound('bat_loop', 'Battle', 'Battle starts (war cry), then the clash loops', 'A battle begins; the steel keeps going while it lasts',
      ('Army yells “CHAAARGE!” over smashing steel', lambda: mix(norm(war_cry(16), 1.0), at(steel(3.6, 7) * 0.4, 0.3))),
      ('Leader “CHARGE!”, army roars, steel', lambda: mix(norm(leader(), 0.9), at(norm(war_cry(16, 'roar'), 0.9), 0.65), at(steel(3.2, 8) * 0.4, 0.8))),
      ('Roaring charge + steel + war drums', lambda: mix(norm(war_cry(18, 'roar'), 1.0), at(steel(3.4, 7) * 0.38, 0.3), seq(*[(i * 0.45, drum(55, 0.6, 0.6)) for i in range(8)]))))

# --- battle won: a roaring cheer ---
def roar_cheer(d=2.4, n=30, vel=1.0):
    items = []
    for _ in range(n):
        f0 = R.uniform(140, 300); sd = R.uniform(0.5, 1.3)
        v = R.choice(['a', 'e', 'ah'])
        items.append((R.uniform(0, d * 0.45), syl(v, R.choice(['a', 'e', 'i']), sd, f0, f0 * R.uniform(1.15, 1.45), 0.3, h=0.04 if R.random() < 0.5 else 0) * R.uniform(0.4, 1)))
    x = seq(*items); x = mix(x, bp(N(len(x) / SR), 250, 3000) * 0.2 * np.sin(np.pi * np.arange(len(x)) / len(x)))
    return verb(lp(x, 5000), 0.7, 0.3) * vel
sound('bat_win', 'Battle', 'Battle won', 'Your side wins a battle',
      ('Roaring cheer', lambda: roar_cheer(2.4, 34)),
      ('Roaring cheer + victory horn', lambda: mix(roar_cheer(2.4, 30) * 0.9, at(horn(hz('D4'), 1.2) * 0.6, 0.1))),
      ('Cheer + weapons banged on shields', lambda: mix(roar_cheer(2.4, 28) * 0.85, seq(*[(i * 0.32, mix(knock(300, 0.15, 0.8), thump(100, 0.15, 0.6), clink(1200, 0.2, 0.3))) for i in range(6)]))))

# ---------------------------------------------------------------- render
ROOM = {'Battle': (0.5, 0.25), 'War and peace': (0.7, 0.3), 'Warnings': (0.7, 0.3), 'Magic': (0.8, 0.3), 'Progress': (0.4, 0.2), 'Building': (0.35, 0.15),
        'Interface': (0.2, 0.05), 'Units: select': (0.25, 0.12), 'Units: move order': (0.3, 0.12)}
def finish(x, cat):
    size, wet = ROOM[cat]
    y = verb(x, size, wet) if wet else x
    # trim the silent tail
    a = np.abs(y); keep = np.where(a > 0.006 * a.max())[0]; y = y[:keep[-1] + int(0.05 * SR)] if len(keep) else y
    y = hp(y, 35); return fade(norm(y, 0.89), 0.002, 0.04)

if __name__ == '__main__':
    out = sys.argv[1]; only = sys.argv[2:]; os.makedirs(out, exist_ok=True)
    import wave, subprocess
    meta = []
    for sid, s in S.items():
        if only and sid not in only: continue
        entry = dict(id=sid, cat=s['cat'], title=s['title'], when=s['when'], opts=[])
        for k, (label, fn) in enumerate(s['opts']):
            letter = 'ABC'[k]; x = finish(np.asarray(fn(), float), s['cat'])
            w = f'{out}/{sid}_{letter}.wav'
            with wave.open(w, 'wb') as f: f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((x * 32767).astype('<i2').tobytes())
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', w, '-c:a', 'libmp3lame', '-b:a', '96k', w.replace('.wav', '.mp3')], check=True)
            os.remove(w)
            entry['opts'].append(dict(letter=letter, label=label, file=f'{sid}_{letter}.mp3', secs=round(len(x) / SR, 2)))
        meta.append(entry); print(sid, [o['secs'] for o in entry['opts']])
    if not only: json.dump(meta, open(f'{out}/sounds.json', 'w'), indent=1)
