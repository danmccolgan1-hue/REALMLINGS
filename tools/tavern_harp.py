"""Realmlings tavern music, dream version: the same D-Dorian 6/8 tune as tavern_music.py (same chords, melodies and
form, ~21 minutes, loops seamlessly) on harp, flute and fiddle, in a large soft hall. (The bagpipes were tried and
taken out; their instruments are still defined below but not used.)
  harp      the chord accompaniment (the lute's part) and, in the first section, the melody; rolled chords open phrases
  (no octave doublings: each melody is played by one instrument at a time)
  flute     the melody in the middle sections
  fiddle    a quiet held-chord pad under everything, and the melody in places
Soft throughout: gentle attacks, notes that fade rather than stop, warm tones and a wide, dark hall.
usage: python3 tavern_harp.py out.wav [start_s end_s]
"""
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tavern_music import SR, BEAT, E8, BAR, hz, lp, hp, bp, PROG_A, PROG_B, MEL_A, MEL_B, MEL_C, PATTERNS, octave
from scipy.signal import fftconvolve

rng = np.random.default_rng(41)
USE_PIPES = False   # the bagpipes (drones and chanter) are off

# ---------- instruments ----------
def flute(f, dur, vel=1.0):
    """A soft wooden flute: breathy, a slow swell in and a long fade out, a slow vibrato, almost no chiff."""
    n = int((dur + 0.6) * SR); t = np.arange(n) / SR
    vib_depth = 0.0035 * np.clip((t - 0.4) / 0.7, 0, 1)
    ph = 2 * np.pi * f * np.cumsum(1 + vib_depth * np.sin(2 * np.pi * 4.8 * t + rng.uniform(0, 6))) / SR
    tone = np.sin(ph) + 0.22 * np.sin(2 * ph + 0.3) + 0.06 * np.sin(3 * ph + 1.1)
    env = np.clip(t / 0.16, 0, 1) ** 1.5 * np.clip((dur + 0.6 - t) / 0.5, 0, 1) ** 1.5
    breath = bp(rng.normal(0, 1, n), f * 0.9, min(f * 3, 6000)) * 0.1
    return lp((tone + breath) * env, 5000) * vel * 0.2

def harp(f, vel=1.0):
    """Gut-strung harp: plucked near the middle, so a strong fundamental and soft, fast-fading upper partials,
    a long ring for the low strings and a gentle finger attack."""
    dur = 6.0 if f < 400 else 4.0; n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n); tau0 = 2.6 * (220 / f) ** 0.35
    for k in range(1, 7):
        if k * f > 6000: break
        a = (0.45 if k == 2 else 1.0) / k ** 2.0                              # warm: the upper partials kept low
        x += a * np.sin(2 * np.pi * k * f * (1 + 0.0004 * k * k) * t + rng.uniform(0, 6)) * np.exp(-t / (tau0 / (1 + 0.9 * (k - 1))))
    x *= np.clip(t / 0.012, 0, 1) ** 2                                      # a soft finger, no snap
    x *= np.clip((dur - t) / 1.2, 0, 1)                                     # fades out instead of stopping
    return x * vel * 0.30

def fiddle(f, dur, vel=1.0, att=0.18):
    """Bowed fiddle: a bright sawtooth-like string through the body's resonances, slow bow attack, delayed vibrato
    and a little bow hiss."""
    n = int((dur + 0.35) * SR); t = np.arange(n) / SR
    vib = 0.0045 * np.clip((t - 0.25) / 0.5, 0, 1) * np.sin(2 * np.pi * 5.6 * t + rng.uniform(0, 6))
    ph = 2 * np.pi * f * np.cumsum(1 + vib) / SR
    x = sum(np.sin(k * ph) / k ** 1.15 for k in range(1, 12) if k * f < 11000)
    x = 0.6 * bp(x, 250, 600) + 0.45 * bp(x, 900, 2800) + 0.3 * x            # body resonances (kept warm)
    x += bp(rng.normal(0, 1, n), 2000, 6000) * 0.02                           # a little bow hiss
    att = max(att, 0.3)
    env = np.clip(t / att, 0, 1) ** 1.5 * np.clip((dur + 0.35 - t) / 0.45, 0, 1) ** 1.5
    return lp(x * env, 4200) * vel * 0.16

def pipes_drone(f, dur, vel=1.0):
    """The bagpipe drones: a bass drone and a tenor drone an octave up, buzzy and steady, swelling in and out."""
    n = int(dur * SR); t = np.arange(n) / SR
    x = 0
    for mult, a in ((1, 1.0), (2, 0.6)):
        ph = 2 * np.pi * f * mult * t * (1 + 0.0007 * (mult - 1)) + rng.uniform(0, 6)
        x = x + a * sum(np.sin(k * ph) / k ** 0.9 for k in range(1, 14) if k * f * mult < 9000)
    x = lp(x, 1500)
    env = np.clip(t / 3.0, 0, 1) ** 2 * np.clip((dur - t) / 3.0, 0, 1) ** 2
    return x * env * vel * 0.018

def chanter(f, dur, vel=1.0):
    """The bagpipe chanter: a loud, reedy, nasal tone (odd and even harmonics, a bright formant), no dynamics but on/off."""
    n = int((dur + 0.12) * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * f * t + 0.003 * np.sin(2 * np.pi * 5 * t) + rng.uniform(0, 6)
    x = sum((1 / k if k % 2 else 0.7 / k) * np.sin(k * ph) for k in range(1, 12) if k * f < 7000)
    x = 0.6 * x + 0.5 * bp(x, 1000, 2200)
    env = np.clip(t / 0.03, 0, 1) * np.clip((dur + 0.12 - t) / 0.1, 0, 1)
    return lp(x * env, 3800) * vel * 0.07

# ---------- the score ----------
def score():
    srng = np.random.default_rng(43); ev = []; bar = 0; TR = [0]
    F = lambda n: hz(n) * 2 ** (TR[0] / 12)
    def phrase(prog, mel=None, lead='harp', mel_oct=0, harp_vel=0.75, pat=0, sparse=False, pad=0.0, counter=False, drone=False, pipes=False):
        nonlocal bar
        for b in range(8):
            t0 = bar * BAR; chord = prog[b]
            # harp: a rolled chord (low to high, quickly) at the head of each phrase, then the lute's arpeggio
            if b == 0:
                for k, nn in enumerate(chord): ev.append((t0 + k * 0.07, 'harp', (F(nn), harp_vel * (0.75 - 0.05 * k))))
            p = PATTERNS[(pat + (b // 2)) % len(PATTERNS)]
            for k, idx in enumerate(p):
                if b == 0 and k == 0: continue
                if sparse and k % 2: continue
                v = harp_vel * (0.95 if k == 0 else 0.6) * srng.uniform(0.85, 1.05)
                ev.append((t0 + k * E8 + srng.normal(0, 0.008), 'harp', (F(chord[idx]), v)))
            # fiddle pad: the chord's upper two notes held through the bar, very soft
            if pad:
                for nn in chord[2:]: ev.append((t0, 'fiddle', (F(nn), BAR * 1.02, pad, 0.6)))
            # melody
            if mel:
                tt = t0
                for (nn, d) in mel[b]:
                    f = F(octave(nn, mel_oct)); dur = d * E8
                    if lead == 'harp':
                        ev.append((tt + srng.normal(0, 0.004), 'harp', (f, srng.uniform(0.85, 1.0))))
                    elif lead == 'flute': ev.append((tt + srng.normal(0, 0.008), 'flute', (f, dur * 0.96, srng.uniform(0.85, 1.0))))
                    elif lead == 'fiddle': ev.append((tt + srng.normal(0, 0.006), 'fiddle', (f, dur * 0.98, srng.uniform(0.8, 0.95), 0.12)))
                    if pipes and USE_PIPES:   # the chanter doubles the tune, with a quick high-G grace note on the longer notes
                        if d >= 2: ev.append((tt - 0.05, 'chanter', (hz('G5') * 2 ** (TR[0] / 12), 0.045, 0.8)))
                        ev.append((tt, 'chanter', (f, dur * 0.97, 0.9)))
                    tt += dur
            bar += 1
        if drone and USE_PIPES:
            t1 = bar * BAR; ev.append((t1 - 8 * BAR, 'drone', (F('D2'), 8 * BAR + 1.5)))
    def pipes_solo(bars, lead_drone=0):
        """The pipes alone over their drones: the chanter plays the tune (with grace notes on the longer notes)."""
        nonlocal bar
        t_start = bar * BAR; bar += lead_drone
        for mb in bars:
            tt = bar * BAR
            for (nn, d) in mb:
                f = F(nn); dur = d * E8
                if d >= 2: ev.append((tt - 0.06, 'chanter', (F('G5'), 0.05, 0.7)))
                ev.append((tt, 'chanter', (f, dur * 0.97, 0.95)))
                tt += dur
            bar += 1
        ev.append((t_start, 'drone', (F('D2'), (bar - t_start / BAR) * BAR + 2.5, 1.4)))
    SOLO = MEL_A + MEL_C[4:]   # 12 bars, about 27 seconds
    SOLO2 = MEL_B + MEL_A[4:]
    def part_harp():   # the lute's part: harp alone, then the harp carries the melody over a fiddle pad
        phrase(PROG_A, harp_vel=0.7, pat=0, sparse=True)
        phrase(PROG_A, harp_vel=0.75, pat=1, pad=0.25)
        phrase(PROG_A, MEL_A, 'harp', 0, harp_vel=0.5, pat=0, pad=0.25)
        phrase(PROG_B, MEL_B, 'harp', 0, harp_vel=0.5, pat=2, pad=0.3)
        phrase(PROG_A, MEL_A, 'flute', 0, harp_vel=0.55, pat=1, pad=0.25)
        phrase(PROG_A, harp_vel=0.7, pat=2, pad=0.3)
        phrase(PROG_B, MEL_B, 'harp', -1, harp_vel=0.5, pat=0, pad=0.3)
        phrase(PROG_A, MEL_C, 'flute', 0, harp_vel=0.5, pat=1, pad=0.25)
        phrase(PROG_A, harp_vel=0.7, pat=0)
        phrase(PROG_A, MEL_A, 'harp', 0, harp_vel=0.5, pat=2, pad=0.25)
        phrase(PROG_B, harp_vel=0.65, pat=1, sparse=True, pad=0.3)
        phrase(PROG_A, harp_vel=0.6, pat=0)
    def part_flute():   # the flute leads, the fiddle answers
        phrase(PROG_A, MEL_A, 'flute', 0, harp_vel=0.5, pat=0, pad=0.25)
        phrase(PROG_B, MEL_B, 'flute', 0, harp_vel=0.5, pat=1, pad=0.25)
        phrase(PROG_A, MEL_C, 'fiddle', 0, harp_vel=0.5, pat=2, pad=0.2)
        phrase(PROG_A, harp_vel=0.6, pat=0, sparse=True, pad=0.3, drone=True)
        phrase(PROG_B, MEL_B, 'flute', 1, harp_vel=0.45, pat=1, counter=False, drone=True)
        phrase(PROG_A, MEL_A, 'fiddle', 0, harp_vel=0.45, pat=2, pad=0.2)
        phrase(PROG_A, MEL_C, 'flute', 0, harp_vel=0.45, pat=0, counter=False)
        phrase(PROG_B, harp_vel=0.6, pat=1, pad=0.3)
        phrase(PROG_A, MEL_A, 'flute', 1, harp_vel=0.45, pat=2, pad=0.2)
        phrase(PROG_B, MEL_B, 'fiddle', 0, harp_vel=0.45, pat=0, pad=0.2)
        phrase(PROG_A, MEL_C, 'flute', 0, harp_vel=0.45, pat=1, counter=False, drone=True)
        phrase(PROG_A, MEL_A, 'flute', 0, harp_vel=0.45, pat=2, pad=0.25)
    def part_pipes():   # the drum part becomes the fiddle's and flute's quiet moment, then it all drifts off
        phrase(PROG_A, harp_vel=0.5, pat=0, sparse=True, pad=0.3, drone=True)
        phrase(PROG_A, MEL_A, 'fiddle', -1, harp_vel=0.45, pat=1, sparse=True, drone=True)
        phrase(PROG_B, MEL_B, 'flute', 0, harp_vel=0.45, pat=2, sparse=True, drone=True)
        phrase(PROG_A, harp_vel=0.5, pat=0, sparse=True, pad=0.3, drone=True)
        phrase(PROG_A, MEL_A, 'flute', 0, harp_vel=0.4, pat=1, sparse=True, drone=True)
        phrase(PROG_B, harp_vel=0.5, pat=2, sparse=True, pad=0.3)
        phrase(PROG_A, MEL_C, 'fiddle', 0, harp_vel=0.45, pat=0, sparse=True, pad=0.15)
        phrase(PROG_B, MEL_B, 'flute', -1, harp_vel=0.4, pat=1, sparse=True, counter=False)
        phrase(PROG_A, harp_vel=0.5, pat=2, sparse=True, pad=0.3)
        phrase(PROG_A, MEL_A, 'harp', 0, harp_vel=0.45, pat=0, sparse=True, pad=0.25)
        phrase(PROG_B, harp_vel=0.55, pat=1, pad=0.25)
        phrase(PROG_A, harp_vel=0.6, pat=2, sparse=True)       # harp alone at the end, so the loop back to the start is seamless
    plan = [(part_harp, 0, 'Harp · D'), (part_flute, 0, 'Flute and fiddle · D'), (part_pipes, 0, 'Fiddle · D'),
            (part_harp, 5, 'Harp · G'), (part_flute, 2, 'Flute and fiddle · E'), (part_pipes, 7, 'Fiddle · A')]
    marks = []
    for f, tr, name in plan:
        TR[0] = tr; t0 = bar * BAR; f(); t1 = bar * BAR; marks.append((name, t0, t1))
    return sorted(ev, key=lambda e: e[0]), marks

PAN = {'harp': -0.22, 'flute': 0.25, 'fiddle': 0.12, 'drone': -0.05, 'chanter': 0.3}
GAIN = {'harp': 0.5, 'flute': 1.0, 'fiddle': 1.3, 'drone': 1.2, 'chanter': 2.2}   # evened out: the melody on top (drone and chanter unused)

IR = None
def hall():
    """A large, soft hall: a long, darkening tail with a short pre-delay, a little different on each side."""
    global IR
    if IR is None:
        r = np.random.default_rng(5); n = int(4.8 * SR); t = np.arange(n) / SR; irs = []
        for _ in range(2):
            ir = r.normal(0, 1, n) * np.exp(-t / 1.25)
            ir = 0.6 * lp(ir, 5000) + 0.4 * lp(ir, 1600) * np.exp(t / 2.5) / np.exp(4.8 / 2.5)   # the tail grows darker
            pre = int(0.035 * SR); ir = np.concatenate([np.zeros(pre), ir[:-pre]]); irs.append(ir / np.sqrt(np.sum(ir ** 2)))
        IR = irs
    return IR

def render_window(t0, t1, tail=7.0):
    ev, marks = score()
    n = int((t1 - t0 + tail) * SR); L = np.zeros(n); R = np.zeros(n)
    for (t, kind, a) in ev:
        if t < t0 or t >= t1: continue
        if kind == 'harp': x = harp(a[0], a[1])
        elif kind == 'flute': x = flute(a[0], a[1], a[2])
        elif kind == 'fiddle': x = fiddle(a[0], a[1], a[2], a[3])
        elif kind == 'drone': x = pipes_drone(a[0], a[1], a[2] if len(a) > 2 else 1.0)
        elif kind == 'chanter': x = chanter(a[0], a[1], a[2])
        start = max(0, int((t - t0) * SR)); x = x[:n - start] * GAIN[kind]; p = PAN[kind]
        L[start:start + len(x)] += x * np.sqrt((1 - p) / 2); R[start:start + len(x)] += x * np.sqrt((1 + p) / 2)
    irL, irR = hall(); wet = 0.58
    out = np.stack([L * 0.8 + wet * fftconvolve(L, irL)[:n], R * 0.8 + wet * fftconvolve(R, irR)[:n]], 1)
    return lp(out.T, 6500).T.astype(np.float32)

def _job(args): return args[0], render_window(args[1], args[2])

def render_full(workers=2):
    from multiprocessing import Pool
    ev, marks = score(); end = marks[-1][2]
    jobs = [(m[1], m[1], m[2]) for m in marks]
    total = int((end + 8) * SR); out = np.zeros((total, 2), np.float32)
    with Pool(workers) as pool:
        for t0, x in pool.imap_unordered(_job, jobs):
            s0 = int(t0 * SR); m = min(len(x), total - s0); out[s0:s0 + m] += x[:m]
    n_end = int(end * SR); tailpart = out[n_end:].copy(); out = out[:n_end]; out[:len(tailpart)] += tailpart
    out /= np.max(np.abs(out)) / 0.8
    return out, marks

if __name__ == '__main__':
    import wave
    path = sys.argv[1]; t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0; t1 = float(sys.argv[3]) if len(sys.argv) > 3 else None
    if t1 is not None:
        out = render_window(t0, t1); out = out / (np.max(np.abs(out)) / 0.8); marks = score()[1]
        f = int(1.5 * SR); out[:f] *= np.linspace(0, 1, f)[:, None]; out[-f * 2:] *= np.linspace(1, 0, f * 2)[:, None]
    else: out, marks = render_full()
    pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('parts:', [(m[0], round(m[1] / 60, 2)) for m in marks], 'wrote', round(len(out) / SR, 1), 's')
