"""Realmlings tavern music, percussion version: the same D-Dorian 6/8 tune as tavern_music.py (same chords, melodies and
form, ~21 minutes, loops seamlessly), played on handpan, xylophone, congas, bongos and frame drum.
  handpan    the chord accompaniment (the lute's part), ringing and soft
  xylophone  the melodies (the lute's and the flute's), with rolls on the long notes in the flute sections
  congas     open tones, slaps and muted heel strokes (a 6/8 bembé-style groove)
  bongos     the martillo (finger pattern on macho and hembra), with fills every four bars
  frame drum the low pulse (the original's frame drum)
  snare      a backbeat on beat two, ghost notes and rolls into the fills
It opens with a four-bar bongo lead-in. Punchier than a straight re-voicing: drier room, shorter handpan ring, harder
attacks, percussion under nearly every phrase, and a compressed drum bus.
usage: python3 tavern_percussion.py out.wav [start_s end_s]
"""
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tavern_music as tm
from tavern_music import SR, BEAT, E8, BAR, hz, lp, hp, bp, PROG_A, PROG_B, MEL_A, MEL_B, MEL_C, PATTERNS, octave, frame_drum, room
from scipy.signal import fftconvolve

rng = np.random.default_rng(23)

# ---------- instruments ----------
def handpan(f, vel=1.0):
    """Handpan: fundamental, octave and compound fifth (the three tuned partials of a ding/tone field), a slight
    beating between the octave's two modes, a soft hand-strike thump, and a long ring."""
    n = int(3.6 * SR); t = np.arange(n) / SR
    ph = rng.uniform(0, 6, 4)
    x = (np.sin(2 * np.pi * f * t + ph[0]) * np.exp(-t / 1.25)
         + 0.42 * np.sin(2 * np.pi * 2 * f * 1.0012 * t + ph[1]) * np.exp(-t / 0.8)
         + 0.28 * np.sin(2 * np.pi * 2 * f * 0.9991 * t + ph[2]) * np.exp(-t / 0.7)
         + 0.22 * np.sin(2 * np.pi * 3 * f * t + ph[3]) * np.exp(-t / 0.4))
    att = np.clip(t / 0.002, 0, 1)                                   # a firm finger strike
    thump = lp(rng.normal(0, 1, n), 900) * np.exp(-t / 0.01) * 0.55
    x = x * att
    return hp(x + thump, 60) * vel * 0.30

def xylophone(f, vel=1.0):
    """Rosewood bar over a tube resonator: modes at 1, 3 and 6 times the fundamental (the tuned overtones of a
    xylophone bar), decaying fast, the higher ones faster, and a hard mallet click."""
    n = int(1.3 * SR); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.42)
         + 0.36 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.13)
         + 0.10 * np.sin(2 * np.pi * 6.02 * f * t) * np.exp(-t / 0.05))
    x += 0.25 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.9) * np.clip(t / 0.03, 0, 1)   # the resonator's swell
    click = bp(rng.normal(0, 1, n), 2200, 9000) * np.exp(-t / 0.005) * 0.6
    return (x + click) * vel * 0.26

CONGA = {'hi': 222, 'lo': 166}   # conga and tumba
def conga(stroke, vel=1.0):
    """Open tone (rings), slap (sharp crack) or mute (heel / muffled tone)."""
    n = int(0.6 * SR); t = np.arange(n) / SR
    drum = 'lo' if stroke.endswith('lo') else 'hi'; f0 = CONGA[drum]
    f = f0 * (1 + 0.18 * np.exp(-t / 0.012))                          # the skin's pitch drop as it settles
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    mode2 = np.sin(2 * np.pi * np.cumsum(f * 1.59) / SR)
    if stroke.startswith('open'):
        x = tone * np.exp(-t / 0.26) + 0.25 * mode2 * np.exp(-t / 0.09)
        x += bp(rng.normal(0, 1, n), 300, 2500) * np.exp(-t / 0.008) * 0.35
        g = 0.42
    elif stroke.startswith('slap'):
        x = bp(rng.normal(0, 1, n), 900, 5200) * np.exp(-t / 0.028) * 1.1 + 0.4 * np.sin(2 * np.pi * f0 * 1.6 * t) * np.exp(-t / 0.05)
        g = 0.34
    else:   # mute
        x = lp(tone * np.exp(-t / 0.05) + 0.6 * rng.normal(0, 1, n) * np.exp(-t / 0.01), 900)
        g = 0.36
    return hp(x, 70) * vel * g

BONGO = {'hi': 430, 'lo': 305}   # macho and hembra
def bongo(drum, vel=1.0):
    n = int(0.3 * SR); t = np.arange(n) / SR; f0 = BONGO[drum]
    f = f0 * (1 + 0.12 * np.exp(-t / 0.008))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.085) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 1.62) / SR) * np.exp(-t / 0.04)
    x += bp(rng.normal(0, 1, n), 1200, 7000) * np.exp(-t / 0.006) * 0.5
    return hp(x, 120) * vel * 0.28

def snare(vel=1.0, kind='hit'):
    """Snare drum: a short shell tone and the rattle of the wires; 'ghost' is a soft wrist note, 'rim' a cross-stick click."""
    n = int(0.45 * SR); t = np.arange(n) / SR
    if kind == 'rim':
        x = bp(rng.normal(0, 1, n), 1500, 6000) * np.exp(-t / 0.006) + 0.6 * np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.02)
        return x * vel * 0.18
    f = 185 * (1 + 0.25 * np.exp(-t / 0.006))
    shell = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.045) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.7) / SR) * np.exp(-t / 0.03)
    wires = bp(rng.normal(0, 1, n), 1800, 9500) * np.exp(-t / (0.09 if kind == 'hit' else 0.05))
    crack = hp(rng.normal(0, 1, n), 3000) * np.exp(-t / 0.004) * 0.8
    x = 0.8 * shell + 0.75 * wires + crack
    return hp(x, 90) * vel * (0.34 if kind == 'hit' else 0.14)

# ---------- grooves (positions in eighths within a 6/8 bar) ----------
CONGA_1 = [(2, 'open_hi', 0.55), (3, 'mute_lo', 0.40), (5, 'open_lo', 0.65)]
CONGA_2 = [(0, 'mute_lo', 0.50), (1, 'slap_hi', 0.48), (2, 'open_hi', 0.68), (3, 'mute_lo', 0.42), (4, 'open_lo', 0.62), (5, 'open_lo', 0.78)]
BONGO_1 = [(0, 'hi', 0.62), (1.5, 'lo', 0.32), (3, 'hi', 0.55), (4.5, 'lo', 0.32)]
BONGO_2 = [(0, 'hi', 0.70), (1, 'lo', 0.38), (2, 'hi', 0.50), (3, 'hi', 0.68), (4, 'lo', 0.40), (5, 'lo', 0.58)]
BONGO_FILL = [(0, 'hi', 0.75), (2, 'hi', 0.55), (2.5, 'lo', 0.5), (3, 'hi', 0.65), (3.5, 'hi', 0.5), (4, 'lo', 0.6), (4.5, 'lo', 0.55), (5, 'hi', 0.7), (5.5, 'lo', 0.65)]
FRAME_1 = [(0, 0.75, 1.0), (3, 0.45, 1.05)]
FRAME_2 = [(0, 1.0, 1.0), (3, 0.7, 1.05), (5, 0.35, 1.25)]
SNARE_1 = [(3, 'rim', 0.8)]                                                             # cross-stick on beat two
SNARE_2 = [(3, 'hit', 0.85), (4.5, 'ghost', 0.5), (5.5, 'ghost', 0.45)]                 # backbeat with ghost notes
SNARE_3 = [(1.5, 'ghost', 0.45), (3, 'hit', 0.95), (4.5, 'ghost', 0.55), (5.5, 'ghost', 0.5)]
SNARE_FILL = [(3, 'hit', 0.9)] + [(4 + k / 4, 'hit', 0.4 + 0.12 * k) for k in range(8)]   # a roll into the next downbeat
# the lead-in: four bars of bongos, the congas joining, a snare roll into the first downbeat
INTRO = [
  [(0, 'bongo', 'hi', 0.8), (2, 'bongo', 'lo', 0.55), (3, 'bongo', 'hi', 0.7), (5, 'bongo', 'lo', 0.6)],
  [(0, 'bongo', 'hi', 0.75), (1, 'bongo', 'lo', 0.4), (1.5, 'bongo', 'lo', 0.45), (2, 'bongo', 'hi', 0.55), (3, 'bongo', 'hi', 0.75), (4, 'bongo', 'lo', 0.45), (4.5, 'bongo', 'hi', 0.5), (5, 'bongo', 'lo', 0.65)],
  [(0, 'bongo', 'hi', 0.8), (1, 'bongo', 'lo', 0.4), (2, 'bongo', 'hi', 0.55), (3, 'bongo', 'hi', 0.75), (4, 'bongo', 'lo', 0.45), (5, 'bongo', 'lo', 0.65),
   (0, 'conga', 'mute_lo', 0.5), (2, 'conga', 'open_hi', 0.65), (3, 'snare', 0.8, 'rim'), (5, 'conga', 'open_lo', 0.75), (0, 'frame', 0.8, 1.0)],
  [(0, 'bongo', 'hi', 0.85), (0.5, 'bongo', 'lo', 0.5), (1, 'bongo', 'hi', 0.6), (1.5, 'bongo', 'lo', 0.55), (2, 'bongo', 'hi', 0.7), (2.5, 'bongo', 'lo', 0.6),
   (0, 'frame', 0.9, 1.0), (1, 'conga', 'slap_hi', 0.6), (2, 'conga', 'open_hi', 0.7), (2.5, 'conga', 'open_lo', 0.75)]
   + [(3 + k / 4, 'snare', 0.35 + 0.08 * k, 'hit') for k in range(12)]]

def score():
    """Events: (time, kind, args). The same form as the original: three parts, twice (second time in new keys)."""
    srng = np.random.default_rng(31); ev = []; bar = 0; TR = [0]
    for b, notes in enumerate(INTRO):   # the bongo lead-in
        for e in notes:
            pos, kind, *a = e
            ev.append((b * BAR + pos * E8 + srng.normal(0, 0.004), kind, tuple(a)))
    bar = len(INTRO)
    F = lambda n: hz(n) * 2 ** (TR[0] / 12)
    def up_to_pan(note):   # a handpan's range is about D3 to F5: lift the low chord tones
        while int(note[-1]) < 3: note = octave(note, 1)
        return note
    def phrase(prog, mel=None, rolls=False, mel_oct=0, pan_vel=0.8, pat=0, perc=0, sparse=False):
        nonlocal bar
        for b in range(8):
            t0 = bar * BAR; chord = prog[b]
            # handpan: the lute's arpeggio, a little sparser (it rings far longer than a plucked string)
            p = PATTERNS[(pat + (b // 2)) % len(PATTERNS)]
            for k, idx in enumerate(p):
                if (sparse and k % 2) or (not sparse and k in (1, 4) and srng.random() < 0.5): continue
                v = pan_vel * (1.0 if k == 0 else 0.6) * srng.uniform(0.85, 1.05)
                ev.append((t0 + k * E8 + srng.normal(0, 0.007), 'handpan', (F(up_to_pan(chord[idx])), v)))
            # xylophone: the melody; long notes are rolled in the flute's sections
            if mel:
                tt = t0
                for (nn, d) in mel[b]:
                    f = F(octave(nn, mel_oct)); v = srng.uniform(0.85, 1.0)
                    ev.append((tt + srng.normal(0, 0.004), 'xylo', (f, v)))
                    if rolls and d >= 3:
                        step = E8 / 4; k = 1
                        while k * step < d * E8 - step * 0.5:
                            ev.append((tt + k * step + srng.normal(0, 0.003), 'xylo', (f, v * (0.42 + 0.12 * (k % 2)) * srng.uniform(0.9, 1.05))))
                            k += 1
                    tt += d * E8
            # percussion
            if perc >= 1:
                for (pos, s, v) in (CONGA_2 if perc >= 2 else CONGA_1):
                    ev.append((t0 + pos * E8 + srng.normal(0, 0.005), 'conga', (s, v * srng.uniform(0.88, 1.05))))
                for (pos, v, tone) in (FRAME_2 if perc >= 2 else FRAME_1):
                    ev.append((t0 + pos * E8 + srng.normal(0, 0.004), 'frame', (v * srng.uniform(0.9, 1.05), tone)))
                fill = perc >= 3 and b % 4 == 3
                for (pos, k, v) in (SNARE_FILL if fill else SNARE_3 if perc >= 3 else SNARE_2 if perc >= 2 else SNARE_1):
                    ev.append((t0 + pos * E8 + srng.normal(0, 0.003), 'snare', (v * srng.uniform(0.9, 1.05), k)))
            if perc >= 2:
                pat_b = BONGO_FILL if (perc >= 3 and b % 4 == 3) else (BONGO_2 if perc >= 3 else BONGO_1)
                for (pos, d, v) in pat_b:
                    ev.append((t0 + pos * E8 + srng.normal(0, 0.004), 'bongo', (d, v * srng.uniform(0.85, 1.05))))
            bar += 1
    def part_handpan():   # the lute's part: handpan with the melody on xylophone, a soft conga pulse later on
        phrase(PROG_A, pan_vel=0.75, pat=0, sparse=True, perc=2)
        phrase(PROG_A, pan_vel=0.8, pat=1, perc=1)
        phrase(PROG_A, MEL_A, False, 0, pan_vel=0.55, pat=0, perc=1)
        phrase(PROG_B, MEL_B, False, 0, pan_vel=0.55, pat=2, perc=2)
        phrase(PROG_A, MEL_A, False, 0, pan_vel=0.55, pat=1, perc=2)
        phrase(PROG_A, pan_vel=0.75, pat=2, perc=1)
        phrase(PROG_B, MEL_B, False, -1, pan_vel=0.5, pat=0, perc=2)
        phrase(PROG_A, MEL_C, False, 0, pan_vel=0.55, pat=1, perc=2)
        phrase(PROG_A, pan_vel=0.75, pat=0, perc=1)
        phrase(PROG_A, MEL_A, False, 0, pan_vel=0.5, pat=2, perc=2)
        phrase(PROG_B, pan_vel=0.7, pat=1, sparse=True, perc=1)
        phrase(PROG_A, pan_vel=0.65, pat=0, perc=1)
    def part_xylophone():   # the flute's part: the xylophone leads, rolling its long notes; congas and light bongos
        phrase(PROG_A, MEL_A, True, 0, pan_vel=0.5, pat=0, perc=2)
        phrase(PROG_B, MEL_B, True, 0, pan_vel=0.5, pat=1, perc=2)
        phrase(PROG_A, MEL_C, True, 0, pan_vel=0.5, pat=2, perc=2)
        phrase(PROG_A, pan_vel=0.6, pat=0, sparse=True, perc=3)
        phrase(PROG_B, MEL_B, True, 1, pan_vel=0.45, pat=1, perc=2)
        phrase(PROG_A, MEL_A, True, 0, pan_vel=0.45, pat=2, perc=2)
        phrase(PROG_A, MEL_C, True, 0, pan_vel=0.45, pat=0, perc=2)
        phrase(PROG_B, pan_vel=0.6, pat=1, perc=3)
        phrase(PROG_A, MEL_A, True, 1, pan_vel=0.45, pat=2, perc=2)
        phrase(PROG_B, MEL_B, True, 0, pan_vel=0.45, pat=0, perc=2)
        phrase(PROG_A, MEL_C, True, 0, pan_vel=0.45, pat=1, perc=2)
        phrase(PROG_A, MEL_A, True, 0, pan_vel=0.45, pat=2, perc=2)
    def part_drums():   # the drum part: the full groove, bongo fills, the handpan sparse underneath
        phrase(PROG_A, pan_vel=0.45, pat=0, sparse=True, perc=2)
        phrase(PROG_A, pan_vel=0.45, pat=1, sparse=True, perc=3)
        phrase(PROG_B, pan_vel=0.45, pat=2, sparse=True, perc=3)
        phrase(PROG_A, pan_vel=0.45, pat=0, sparse=True, perc=3)
        phrase(PROG_A, MEL_A, True, -1, pan_vel=0.4, pat=1, sparse=True, perc=3)
        phrase(PROG_B, pan_vel=0.45, pat=2, sparse=True, perc=3)
        phrase(PROG_A, pan_vel=0.45, pat=0, sparse=True, perc=3)
        phrase(PROG_B, MEL_B, True, -1, pan_vel=0.4, pat=1, sparse=True, perc=3)
        phrase(PROG_A, pan_vel=0.45, pat=2, sparse=True, perc=3)
        phrase(PROG_A, pan_vel=0.5, pat=0, sparse=True, perc=2)
        phrase(PROG_B, pan_vel=0.55, pat=1, perc=2)
        phrase(PROG_A, pan_vel=0.6, pat=2, sparse=True, perc=1)       # eases off, so the loop back into the bongo lead-in is smooth
    plan = [(part_handpan, 0, 'Handpan · D'), (part_xylophone, 0, 'Xylophone · D'), (part_drums, 0, 'Drums · D'),
            (part_handpan, 5, 'Handpan · G'), (part_xylophone, 2, 'Xylophone · E'), (part_drums, 7, 'Drums · A')]
    marks = [('Bongo lead-in', 0, len(INTRO) * BAR)]
    for f, tr, name in plan:
        TR[0] = tr; t0 = bar * BAR; f(); t1 = bar * BAR; marks.append((name, t0, t1))
    return sorted(ev, key=lambda e: e[0]), marks

PAN = {'handpan': -0.18, 'xylo': 0.28, 'conga': 0.32, 'bongo': -0.38, 'frame': 0.0, 'snare': 0.08}
DRUMS = {'conga', 'bongo', 'frame', 'snare'}
GAIN = {'handpan': 0.85, 'xylo': 1.1, 'conga': 1.05, 'bongo': 1.5, 'frame': 0.95, 'snare': 1.6}   # evened out so the melody sits on top
CONGA_PAN = {'hi': 0.42, 'lo': 0.22}

def render_window(t0, t1, tail=4.5):
    ev, marks = score()
    n = int((t1 - t0 + tail) * SR); L = np.zeros(n); R = np.zeros(n); DL = np.zeros(n); DR = np.zeros(n)
    for (t, kind, a) in ev:
        if t < t0 or t >= t1: continue
        if kind == 'handpan': x = handpan(a[0], a[1])
        elif kind == 'xylo': x = xylophone(a[0], a[1])
        elif kind == 'conga': x = conga(a[0], a[1])
        elif kind == 'bongo': x = bongo(a[0], a[1])
        elif kind == 'frame': x = frame_drum(a[0], a[1])
        elif kind == 'snare': x = snare(a[0], a[1])
        p = CONGA_PAN['lo' if a[0].endswith('lo') else 'hi'] if kind == 'conga' else PAN[kind]
        start = max(0, int((t - t0) * SR)); x = x[:n - start] * GAIN[kind]
        BL, BR = (DL, DR) if kind in DRUMS else (L, R)
        BL[start:start + len(x)] += x * np.sqrt((1 - p) / 2); BR[start:start + len(x)] += x * np.sqrt((1 + p) / 2)
    DL, DR = punch(DL, DR); L += DL; R += DR
    irL, irR = room(); wet = 0.11
    out = np.stack([L + wet * fftconvolve(L, irL)[:n], R + wet * fftconvolve(R, irR)[:n]], 1)
    return lp(out.T, 11000).T.astype(np.float32)

def punch(L, R, thresh=0.05, ratio=3.0, att=0.004, rel=0.12, makeup=1.6):
    """Drum bus compressor: holds the peaks down so the hits sit closer together in level, then brings it all up."""
    lvl = np.maximum(np.abs(L), np.abs(R)); env = np.empty_like(lvl); a, r = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); e = 0.0
    # block-wise follower (a peak envelope per 64 samples is plenty, and fast)
    B = 64; nb = len(lvl) // B + 1; pk = np.array([lvl[i * B:(i + 1) * B].max() if i * B < len(lvl) else 0 for i in range(nb)])
    ab, rb = a ** B, r ** B; envb = np.empty(nb)
    for i, v in enumerate(pk): e = v + (e - v) * (ab if v > e else rb); envb[i] = e
    env = np.repeat(envb, B)[:len(lvl)]
    gain = np.where(env > thresh, (thresh + (env - thresh) / ratio) / np.maximum(env, 1e-9), 1.0) * makeup
    return L * gain, R * gain

def _job(args): return args[0], render_window(args[1], args[2])

def render_full(workers=2):
    """The whole track, one job per part, overlap-added; the tail past the end wraps onto the start so it loops."""
    from multiprocessing import Pool
    ev, marks = score(); end = marks[-1][2]
    jobs = [(m[1], m[1], m[2]) for m in marks]
    total = int((end + 5) * SR); out = np.zeros((total, 2), np.float32)
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
