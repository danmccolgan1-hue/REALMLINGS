"""Realmlings tavern music: a calm, ~10 minute D-Dorian piece in 6/8 that moves from lute, to flute, to hand drums.
Everything is synthesized here: Karplus-Strong lute, additive flute with breath, frame drum, tambourine, a soft drone.
usage: python3 tavern.py out.wav [start_s end_s]
"""
import sys, numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 44100
rng = np.random.default_rng(7)
BEAT = 60 / 54                      # dotted quarter at 54 bpm: two beats per 6/8 bar
E8 = BEAT / 3                       # one eighth note
BAR = 6 * E8

NOTE = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
def hz(n):  # 'D4', 'Bb3'
    name, octv = n[:-1], int(n[-1]); semi = NOTE[name[0]] + (1 if '#' in name else -1 if 'b' in name[1:] else 0)
    return 440 * 2 ** ((semi + (octv - 4) * 12) / 12)

# ---------- instruments ----------
def lp(x, f, order=2): return sosfilt(butter(order, f / (SR / 2), 'low', output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f / (SR / 2), 'high', output='sos'), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)

def lute(f, dur, vel=1.0, bright=0.5):
    """Karplus-Strong pluck with a soft nylon/gut attack and a small wooden body."""
    n = int((dur + 1.6) * SR); P = SR / f; L = P - 0.5
    for _ in range(6): L = P - 0.5 + 0.5 * (L - int(L))      # the loop filter adds half a sample (plus half the fraction) of delay
    Li = int(L); frac = L - Li
    buf = rng.uniform(-1, 1, Li + 2)
    buf = lp(buf, 1200 + 3500 * bright)                     # softer finger, less pick
    p = max(2, int(Li * 0.18)); buf[p:] -= 0.6 * buf[:-p]   # plucking position
    y = np.zeros(n); y[:Li + 2] = buf[:Li + 2] if n > Li + 2 else buf[:n]
    decay = 0.996 ** (110 / f) if f > 110 else 0.996
    i = Li + 2
    while i < n:                                            # block-wise KS loop
        j = min(n, i + Li)
        a = y[i - Li:j - Li]; b = y[i - Li - 1:j - Li - 1]
        y[i:j] = decay * ((1 - frac) * (0.5 * a + 0.5 * b) + frac * b)
        i = j
    body = bp(y, 180, 420) * 0.6 + bp(y, 900, 2200) * 0.25
    out = hp((y + body) * vel, 70)
    env = np.ones(n); rel = int(0.08 * SR); stop = int(dur * SR + 1.2 * SR)
    if stop < n: env[stop:] = 0; env[max(0, stop - rel):stop] = np.linspace(1, 0, min(rel, stop))
    return out * env * 0.5

def flute(f, dur, vel=1.0):
    """Wooden flute: soft fundamental, a few harmonics, slow vibrato, breath noise and a little chiff."""
    n = int((dur + 0.25) * SR); t = np.arange(n) / SR
    vib_depth = 0.004 * np.clip((t - 0.35) / 0.6, 0, 1)
    ph = 2 * np.pi * f * np.cumsum(1 + vib_depth * np.sin(2 * np.pi * 5.1 * t + rng.uniform(0, 6))) / SR
    tone = np.sin(ph) + 0.32 * np.sin(2 * ph + 0.3) + 0.12 * np.sin(3 * ph + 1.1) + 0.04 * np.sin(4 * ph)
    att, rel = 0.09, 0.18
    env = np.clip(t / att, 0, 1) * np.clip((dur + 0.25 - t) / rel, 0, 1)
    env *= 1 + 0.05 * np.sin(2 * np.pi * 0.7 * t)
    breath = bp(rng.normal(0, 1, n), f * 0.9, min(f * 4, 9000)) * 0.12
    chiff = bp(rng.normal(0, 1, n), 1500, 6000) * np.exp(-t / 0.03) * 0.25
    return (tone + breath) * env * vel * 0.22 + chiff * vel * 0.08

def frame_drum(vel=1.0, tone=1.0):
    """Big frame drum / bodhran: a falling low tone with a skin thump."""
    n = int(0.9 * SR); t = np.arange(n) / SR
    f = 62 * tone + 50 * tone * np.exp(-t / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.32)
    skin = lp(rng.normal(0, 1, n), 900) * np.exp(-t / 0.025) * 0.6
    return (body + skin) * vel * 0.55

def tap(vel=1.0, pitch=1.0):
    """Finger tap near the rim."""
    n = int(0.25 * SR); t = np.arange(n) / SR
    x = bp(rng.normal(0, 1, n), 500 * pitch, 2200 * pitch) * np.exp(-t / 0.04)
    x += np.sin(2 * np.pi * 240 * pitch * t) * np.exp(-t / 0.06) * 0.5
    return x * vel * 0.35

def jingle(vel=1.0):
    """Tambourine zils."""
    n = int(0.35 * SR); t = np.arange(n) / SR
    x = hp(rng.normal(0, 1, n), 5000) * np.exp(-t / 0.07)
    for fr in (6900, 8300, 9700): x += 0.3 * np.sin(2 * np.pi * fr * t + rng.uniform(0, 6)) * np.exp(-t / 0.12)
    return x * vel * 0.07

def drone(f, dur, vel=1.0):
    """Very soft hurdy-gurdy-like drone that swells in and out."""
    n = int(dur * SR); t = np.arange(n) / SR
    saw = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.5 for k in range(1, 6))
    x = lp(saw, 450)
    env = np.clip(t / 3, 0, 1) * np.clip((dur - t) / 3, 0, 1) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.05 * t))
    return x * env * vel * 0.05

# ---------- the score ----------
PROG_A = [['D3', 'A3', 'D4', 'F4'], ['C3', 'G3', 'C4', 'E4'], ['G2', 'D3', 'G3', 'B3'], ['D3', 'A3', 'D4', 'F4'],
          ['F2', 'C3', 'F3', 'A3'], ['C3', 'G3', 'C4', 'E4'], ['A2', 'E3', 'A3', 'C4'], ['D3', 'A3', 'D4', 'F4']]
PROG_B = [['F2', 'C3', 'F3', 'A3'], ['G2', 'D3', 'G3', 'B3'], ['A2', 'E3', 'A3', 'C4'], ['D3', 'A3', 'D4', 'F4'],
          ['C3', 'G3', 'C4', 'E4'], ['G2', 'D3', 'G3', 'B3'], ['A2', 'E3', 'A3', 'C4'], ['D3', 'A3', 'D4', 'F4']]
# melodies: (note, eighths) per bar
MEL_A = [[('D5', 2), ('C5', 1), ('A4', 3)], [('G4', 2), ('A4', 1), ('E4', 3)], [('G4', 2), ('B4', 1), ('D5', 2), ('B4', 1)], [('A4', 6)],
         [('F4', 2), ('G4', 1), ('A4', 2), ('C5', 1)], [('C5', 2), ('D5', 1), ('E5', 3)], [('D5', 2), ('C5', 1), ('A4', 2), ('G4', 1)], [('A4', 2), ('E4', 1), ('D4', 3)]]
MEL_B = [[('C5', 3), ('A4', 3)], [('B4', 2), ('A4', 1), ('G4', 3)], [('E5', 3), ('C5', 2), ('A4', 1)], [('D5', 6)],
         [('E5', 2), ('D5', 1), ('C5', 2), ('E5', 1)], [('D5', 2), ('B4', 1), ('G4', 3)], [('A4', 2), ('B4', 1), ('C5', 2), ('E5', 1)], [('D5', 6)]]
MEL_C = [[('A4', 1), ('D5', 1), ('E5', 1), ('F5', 3)], [('E5', 2), ('D5', 1), ('C5', 3)], [('B4', 2), ('C5', 1), ('D5', 3)], [('A4', 3), ('G4', 1), ('A4', 2)],
         [('C5', 3), ('F5', 3)], [('E5', 2), ('C5', 1), ('G4', 3)], [('A4', 1), ('B4', 1), ('C5', 1), ('E5', 2), ('D5', 1)], [('D5', 6)]]
PATTERNS = [[0, 1, 2, 3, 2, 1], [0, 2, 3, 1, 3, 2], [0, 1, 3, 2, 3, 1]]

def octave(n, d): return n[:-1] + str(int(n[-1]) + d)

def score():
    """Events: (time, kind, args). 36 phrases of 8 bars, about 10 minutes."""
    srng = np.random.default_rng(11); ev = []; bar = 0; TR = [0]
    F = lambda n: hz(n) * 2 ** (TR[0] / 12)
    def phrase(prog, mel=None, mel_inst=None, mel_oct=0, lute_vel=0.8, pat=0, drums=0, sparse=False, jingles=False):
        nonlocal bar
        for b in range(8):
            t0 = bar * BAR; chord = prog[b]
            # lute accompaniment
            p = PATTERNS[(pat + (b // 2)) % len(PATTERNS)]
            for k, idx in enumerate(p):
                if sparse and k % 2: continue
                note = chord[idx]; v = lute_vel * (1.0 if k == 0 else 0.62) * srng.uniform(0.85, 1.05)
                ev.append((t0 + k * E8 + srng.normal(0, 0.006), 'lute', (F(note), E8 * (2 if k == 0 else 1.4), v, 0.35 if k else 0.25)))
            # melody
            if mel:
                tt = t0
                for (nn, d) in mel[b]:
                    nn = octave(nn, mel_oct)
                    if mel_inst == 'flute': ev.append((tt + srng.normal(0, 0.008), 'flute', (F(nn), d * E8 * 0.96, srng.uniform(0.85, 1.0))))
                    else: ev.append((tt + srng.normal(0, 0.004), 'lute', (F(nn), d * E8, 0.95 * srng.uniform(0.9, 1.05), 0.6)))
                    tt += d * E8
            # drums
            if drums:
                pattern = [(0, 'drum', 1.0), (2, 'tap', 0.6), (3, 'drum', 0.65), (5, 'tap', 0.5)] if drums == 1 else \
                          [(0, 'drum', 1.0), (1, 'tap', 0.45), (2, 'tap', 0.7), (3, 'drum', 0.8), (4, 'tap', 0.4), (5, 'tap', 0.6)]
                if drums >= 2 and b % 4 == 3:   # a small fill to close every four bars
                    pattern = [(0, 'drum', 1.0), (2, 'tap', 0.6), (3, 'tap', 0.7), (3.5, 'tap', 0.5), (4, 'tap', 0.75), (4.5, 'tap', 0.55), (5, 'drum', 0.85)]
                for (pos, kind, v) in pattern:
                    ev.append((t0 + pos * E8 + srng.normal(0, 0.005), kind, (v * srng.uniform(0.88, 1.05),)))
                if jingles:
                    for k in range(6): ev.append((t0 + k * E8 + srng.normal(0, 0.004), 'jingle', ((1.0 if k in (0, 3) else 0.55) * srng.uniform(0.8, 1.1),)))
            bar += 1
    def part_lute():
        phrase(PROG_A, lute_vel=0.75, pat=0, sparse=True)
        phrase(PROG_A, lute_vel=0.8, pat=1)
        phrase(PROG_A, MEL_A, 'lute', 0, lute_vel=0.55, pat=0)
        phrase(PROG_B, MEL_B, 'lute', 0, lute_vel=0.55, pat=2)
        phrase(PROG_A, MEL_A, 'lute', 0, lute_vel=0.55, pat=1)
        phrase(PROG_A, lute_vel=0.75, pat=2)
        phrase(PROG_B, MEL_B, 'lute', -1, lute_vel=0.5, pat=0)
        phrase(PROG_A, MEL_C, 'lute', 0, lute_vel=0.55, pat=1)
        phrase(PROG_A, lute_vel=0.75, pat=0)
        phrase(PROG_A, MEL_A, 'lute', 0, lute_vel=0.5, pat=2)
        phrase(PROG_B, lute_vel=0.7, pat=1, sparse=True)
        phrase(PROG_A, lute_vel=0.65, pat=0)
    def part_flute():
        phrase(PROG_A, MEL_A, 'flute', 0, lute_vel=0.5, pat=0)
        phrase(PROG_B, MEL_B, 'flute', 0, lute_vel=0.5, pat=1)
        phrase(PROG_A, MEL_C, 'flute', 0, lute_vel=0.5, pat=2)
        phrase(PROG_A, lute_vel=0.6, pat=0, sparse=True)
        phrase(PROG_B, MEL_B, 'flute', 1, lute_vel=0.45, pat=1)
        phrase(PROG_A, MEL_A, 'flute', 0, lute_vel=0.45, pat=2)
        phrase(PROG_A, MEL_C, 'flute', 0, lute_vel=0.45, pat=0)
        phrase(PROG_B, lute_vel=0.6, pat=1)
        phrase(PROG_A, MEL_A, 'flute', 1, lute_vel=0.45, pat=2)
        phrase(PROG_B, MEL_B, 'flute', 0, lute_vel=0.45, pat=0)
        phrase(PROG_A, MEL_C, 'flute', 0, lute_vel=0.45, pat=1, drums=1)
        phrase(PROG_A, MEL_A, 'flute', 0, lute_vel=0.45, pat=2, drums=1)
    def part_drums():
        phrase(PROG_A, lute_vel=0.45, pat=0, sparse=True, drums=1)
        phrase(PROG_A, lute_vel=0.45, pat=1, sparse=True, drums=2)
        phrase(PROG_B, lute_vel=0.45, pat=2, sparse=True, drums=2, jingles=True)
        phrase(PROG_A, lute_vel=0.45, pat=0, sparse=True, drums=2, jingles=True)
        phrase(PROG_A, MEL_A, 'flute', -1, lute_vel=0.4, pat=1, sparse=True, drums=2, jingles=True)
        phrase(PROG_B, lute_vel=0.45, pat=2, sparse=True, drums=2)
        phrase(PROG_A, lute_vel=0.45, pat=0, sparse=True, drums=2, jingles=True)
        phrase(PROG_B, MEL_B, 'flute', -1, lute_vel=0.4, pat=1, sparse=True, drums=2, jingles=True)
        phrase(PROG_A, lute_vel=0.45, pat=2, sparse=True, drums=2)
        phrase(PROG_A, lute_vel=0.5, pat=0, sparse=True, drums=1, jingles=True)
        phrase(PROG_B, lute_vel=0.55, pat=1, drums=1)
        phrase(PROG_A, lute_vel=0.6, pat=2, sparse=True)       # winds down to lute alone, so the loop back to the start is seamless
    # two passes: the first in D Dorian, the second with each part in a new key (G, E, A), resolving back to D on the loop
    plan = [(part_lute, 0, 'Lute · D'), (part_flute, 0, 'Flute · D'), (part_drums, 0, 'Drums · D'),
            (part_lute, 5, 'Lute · G'), (part_flute, 2, 'Flute · E'), (part_drums, 7, 'Drums · A')]
    marks = []
    for f, tr, name in plan:
        TR[0] = tr; t0 = bar * BAR; f(); t1 = bar * BAR; marks.append((name, t0, t1))
        for nn in (('D2', 'A2') if f is not part_drums else ('D2',)): ev.append((t0, 'drone', (F(nn) if True else 0, t1 - t0)))
    return sorted(ev, key=lambda e: e[0]), marks

PAN = {'lute': -0.25, 'flute': 0.3, 'drum': 0.0, 'tap': 0.12, 'jingle': 0.35, 'drone': 0.0}
GAIN = {'lute': 1.0, 'flute': 0.6, 'drum': 0.8, 'tap': 0.8, 'jingle': 0.8, 'drone': 1.0}   # evened out so no part jumps out

IR = None
def room():
    global IR
    if IR is None:
        r = np.random.default_rng(3); ir_n = int(2.2 * SR); tt = np.arange(ir_n) / SR
        irs = []
        for _ in range(2):
            ir = lp(r.normal(0, 1, ir_n), 4500) * np.exp(-tt / 0.55); ir[0] = 0; irs.append(ir / np.sqrt(np.sum(ir ** 2)))
        IR = irs
    return IR

def render_window(t0, t1, tail=4.5):
    """Dry-plus-room audio for the events that start in [t0, t1); the buffer runs on past t1 so notes ring out."""
    ev, marks = score()
    n = int((t1 - t0 + tail) * SR); L = np.zeros(n); R = np.zeros(n)
    for (t, kind, a) in ev:
        if t < t0 or t >= t1: continue
        if kind == 'lute': x = lute(a[0], a[1], a[2], a[3])
        elif kind == 'flute': x = flute(a[0], a[1], a[2])
        elif kind == 'drum': x = frame_drum(a[0])
        elif kind == 'tap': x = tap(a[0])
        elif kind == 'jingle': x = jingle(a[0])
        elif kind == 'drone': x = drone(a[0], a[1], 1.0)
        start = int((t - t0) * SR); x = x[:n - start] * GAIN[kind]; p = PAN[kind]
        L[start:start + len(x)] += x * np.sqrt((1 - p) / 2); R[start:start + len(x)] += x * np.sqrt((1 + p) / 2)
    irL, irR = room(); wet = 0.22
    out = np.stack([L + wet * fftconvolve(L, irL)[:n], R + wet * fftconvolve(R, irR)[:n]], 1)
    return lp(out.T, 9000).T.astype(np.float32)

def _job(args): return args[0], render_window(args[1], args[2])

def render_full(workers=6, chunk=60.0):
    """The whole track, rendered in parallel chunks and overlap-added. The ringing tail past the end is wrapped
    onto the start so the track loops without a seam."""
    from multiprocessing import Pool
    ev, marks = score(); end = marks[-1][2]
    jobs = [(m[1], m[1], m[2]) for m in marks]   # one job per part, so each part's drone stays whole
    total = int((end + 5) * SR); out = np.zeros((total, 2), np.float32)
    with Pool(workers) as pool:
        for t0, x in pool.imap_unordered(_job, jobs):
            s0 = int(t0 * SR); m = min(len(x), total - s0); out[s0:s0 + m] += x[:m]
    n_end = int(end * SR); tailpart = out[n_end:].copy(); out = out[:n_end]; out[:len(tailpart)] += tailpart
    out /= np.max(np.abs(out)) / 0.8
    return out, marks

def render(t0=0, t1=None):
    out = render_window(t0, t1); out = out / (np.max(np.abs(out)) / 0.8); return out, score()[1]

if __name__ == '__main__':
    import wave
    path = sys.argv[1]; t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0; t1 = float(sys.argv[3]) if len(sys.argv) > 3 else None
    out, marks = render(t0, t1) if t1 is not None else render_full()
    if t1 is not None:   # fade the excerpt in and out
        f = int(1.5 * SR); out[:f] *= np.linspace(0, 1, f)[:, None]; out[-f * 2:] *= np.linspace(1, 0, f * 2)[:, None]
    pcm = (out * 32767).astype('<i2')
    with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('parts:', [(m[0], round(m[1] / 60, 2)) for m in marks], 'wrote', round(len(out) / SR, 1), 's')
