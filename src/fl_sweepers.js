    // ======================================================================
    // CarrotBox: FX Sweepers - transition effects synthesized on demand.
    //
    // Risers, uplifters, Shepard rises, snare-roll builds, builds into a drop,
    // reverse cymbals, reverse reverb swells, whooshes, tape stops, vinyl
    // spin-backs, downlifters, sub drops, filter-swept impacts and lasers.
    //
    // Every sweep is made from a small description and a seed, so it renders
    // the same audio every time. A tempo-synced sweep is exactly N beats long
    // at its tempo (rounded to the nearest sample at 44.1 kHz).
    //
    // A sweep can be used as a sample: the id "b:sw/<type>@<length>@<settings>"
    // renders it, so songs that use placed sweeps stay small and keep working.
    //   <length>   "<beats>b<bpm>" (16b128 = 16 beats at 128 BPM) or "<seconds>s"
    //   <settings> curve.intensity.colour.resonance.pitch.width.tail.gap.seed
    //              (curve 0 linear / 1 exponential / 2 S-curve; percentages;
    //              semitones; the silent gap at the end in hundredths of a beat)
    // ======================================================================
    // dir: "rise" sweeps lead into the beat they end on, "fall" sweeps start on it.
    const FL_SWEEP_TYPES = [
        { id: "noise-riser", name: "Noise Riser", dir: "rise", color: "#4fc3f7", about: "Pink and white noise whose filter, level and stereo width rise; resonance and pitch-tracked noise optional.",
            def: { curve: 1, intensity: 0.7, colour: 0.6, res: 0.25, pitch: 0, width: 0.7, tail: 0.25, gap: 0 } },
        { id: "uplifter", name: "Uplifter", dir: "rise", color: "#81c784", about: "A detuned supersaw chord gliding up through the pitch range with an opening filter, over a noise bed.",
            def: { curve: 1, intensity: 0.65, colour: 0.6, res: 0.2, pitch: 24, width: 0.8, tail: 0.3, gap: 0 } },
        { id: "shepard", name: "Shepard Rise", dir: "rise", color: "#ba68c8", about: "An endless Shepard-tone climb: octave-spaced tones that keep rising without ever leaving the range.",
            def: { curve: 0, intensity: 0.6, colour: 0.55, res: 0.1, pitch: 24, width: 0.6, tail: 0.35, gap: 0 } },
        { id: "snare-roll", name: "Snare Roll Riser", dir: "rise", color: "#ffb74d", about: "A snare roll locked to the beat grid that speeds up from quarters to 32nds while it rises in pitch and level.",
            def: { curve: 1, intensity: 0.7, colour: 0.6, res: 0.2, pitch: 12, width: 0.4, tail: 0.25, gap: 0 } },
        { id: "drop-build", name: "Build Into Drop", dir: "rise", color: "#ff8a65", about: "Noise, supersaw and sub rising together into the drop, with a silent gap before the downbeat.",
            def: { curve: 1, intensity: 0.8, colour: 0.7, res: 0.25, pitch: 24, width: 0.8, tail: 0.2, gap: 0.5 } },
        { id: "reverse-cymbal", name: "Reverse Cymbal", dir: "rise", color: "#fff176", about: "A crash cymbal played backwards, swelling into the beat.",
            def: { curve: 1, intensity: 0.6, colour: 0.7, res: 0, pitch: 0, width: 0.6, tail: 0.2, gap: 0 } },
        { id: "reverse-reverb", name: "Reverse Reverb Swell", dir: "rise", color: "#90caf9", about: "The reverb of a chord stab played backwards: a ghostly swell that sucks into the beat.",
            def: { curve: 1, intensity: 0.5, colour: 0.5, res: 0.2, pitch: 12, width: 0.8, tail: 0.8, gap: 0 } },
        { id: "whoosh", name: "Whoosh", dir: "rise", color: "#b0bec5", about: "Air rushing past: a band of noise that comes closer and moves away, with a Doppler shift and a pan across.",
            def: { curve: 0, intensity: 0.6, colour: 0.55, res: 0.3, pitch: 7, width: 0.9, tail: 0.15, gap: 0 } },
        { id: "tape-stop", name: "Tape Stop", dir: "rise", color: "#a1887f", about: "A chord groove that slows down to a stop like a tape machine losing power.",
            def: { curve: 0, intensity: 0.6, colour: 0.55, res: 0.1, pitch: 12, width: 0.5, tail: 0.1, gap: 0 } },
        { id: "spin-back", name: "Vinyl Spin-Back", dir: "rise", color: "#8d6e63", about: "A record pulled backwards: the groove whirls up in reverse and spins down, with needle scratch.",
            def: { curve: 1, intensity: 0.6, colour: 0.6, res: 0.2, pitch: 12, width: 0.5, tail: 0.15, gap: 0 } },
        { id: "downlifter", name: "Downlifter", dir: "fall", color: "#4db6ac", about: "Noise and an optional falling tone whose filter, level and width come down, with a reverb tail.",
            def: { curve: 1, intensity: 0.6, colour: 0.6, res: 0.2, pitch: 12, width: 0.7, tail: 0.4, gap: 0 } },
        { id: "sub-drop", name: "Sub Drop", dir: "fall", color: "#7986cb", about: "An 808-style sine that drops through the pitch range; Intensity adds drive so it reads on small speakers.",
            def: { curve: 1, intensity: 0.5, colour: 0.3, res: 0, pitch: 24, width: 0.2, tail: 0.1, gap: 0 } },
        { id: "impact", name: "Impact + Sweep Tail", dir: "fall", color: "#e57373", about: "A boom and a noise burst whose filter sweeps down, in a big reverb.",
            def: { curve: 1, intensity: 0.7, colour: 0.65, res: 0.15, pitch: 12, width: 0.7, tail: 0.5, gap: 0 } },
        { id: "laser", name: "Laser Zap", dir: "fall", color: "#f06292", about: "An FM laser that zaps down through the pitch range, with a ping-pong echo tail.",
            def: { curve: 1, intensity: 0.6, colour: 0.6, res: 0.3, pitch: 36, width: 0.6, tail: 0.3, gap: 0 } },
    ];
    const FL_SWEEP_CURVES = ["Linear", "Exponential", "S-curve"];
    // ------------------------------------------------------------ helpers
    const SW_SINE = new Float32Array(4097);
    for (let i = 0; i <= 4096; i++)
        SW_SINE[i] = Math.sin(2 * Math.PI * i / 4096);
    // sine of a phase in cycles (table with linear interpolation, error below 1e-6)
    function swSin(phase) {
        const p = (phase - Math.floor(phase)) * 4096;
        const i = p | 0;
        return SW_SINE[i] + (SW_SINE[i + 1] - SW_SINE[i]) * (p - i);
    }
    function swClamp(x, lo, hi) {
        return x < lo ? lo : x > hi ? hi : x;
    }
    function swDb(db) {
        return Math.pow(10, db / 20);
    }
    // 0..1 -> 0..1: linear, exponential (slow start, fast end) or an S-curve
    function swCurve(kind, x) {
        x = swClamp(x, 0, 1);
        if (kind == 1)
            return (Math.exp(4 * x) - 1) / (Math.exp(4) - 1);
        if (kind == 2)
            return x * x * (3 - 2 * x);
        return x;
    }
    // The same three shapes for things that fall: exponential falls fast first.
    function swFallCurve(kind, x) {
        x = swClamp(x, 0, 1);
        if (kind == 1)
            return 1 - Math.pow(1 - x, 3);
        if (kind == 2)
            return x * x * (3 - 2 * x);
        return x;
    }
    function swRand(spec, layer) {
        return flRng("sweep/" + spec.type + "/" + spec.seed + "/" + layer);
    }
    function swPink(rand) {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        return () => {
            const w = rand() * 2 - 1;
            b0 = 0.99886 * b0 + w * 0.0555179;
            b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.969 * b2 + w * 0.153852;
            b3 = 0.8665 * b3 + w * 0.3104856;
            b4 = 0.55 * b4 + w * 0.5329522;
            b5 = -0.7616 * b5 - w * 0.016898;
            const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
            b6 = w * 0.115926;
            return out * 0.11;
        };
    }
    // Topology-preserving state variable filter: stays stable while the cutoff moves every few samples.
    class SwSVF {
        constructor() {
            this.ic1 = 0;
            this.ic2 = 0;
            this.a1 = 1;
            this.a2 = 0;
            this.a3 = 0;
            this.k = 1.4;
            this.lp = 0;
            this.bp = 0;
            this.hp = 0;
        }
        set(cutoff, q) {
            const g = Math.tan(Math.PI * swClamp(cutoff, 16, FL_SR * 0.45) / FL_SR);
            this.k = 1 / Math.max(0.5, q);
            this.a1 = 1 / (1 + g * (g + this.k));
            this.a2 = g * this.a1;
            this.a3 = g * this.a2;
        }
        run(v0) {
            const v3 = v0 - this.ic2;
            const v1 = this.a1 * this.ic1 + this.a2 * v3;
            const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
            this.ic1 = 2 * v1 - this.ic1;
            this.ic2 = 2 * v2 - this.ic2;
            this.lp = v2;
            this.bp = v1 * this.k;
            this.hp = v0 - this.k * v1 - v2;
            return v2;
        }
    }
    function swRms(buffer) {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++)
            sum += buffer[i] * buffer[i];
        return Math.sqrt(sum / Math.max(1, buffer.length));
    }
    // A stereo comb/allpass reverb (wet only, same length as the input).
    function swReverbWet(inL, inR, seconds, damp = 0.3) {
        const n = inL.length;
        const wl = new Float32Array(n), wr = new Float32Array(n);
        const decay = Math.max(0.2, seconds);
        const combLengths = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
        const make = (length) => ({ buf: new Float32Array(length), i: 0, lp: 0, g: Math.pow(0.001, length / (FL_SR * decay)) });
        const combsL = combLengths.map(make), combsR = combLengths.map(d => make(d + 23));
        const allpassL = [556, 441, 341, 225].map(d => ({ buf: new Float32Array(d), i: 0 }));
        const allpassR = [579, 464, 364, 248].map(d => ({ buf: new Float32Array(d), i: 0 }));
        const keep = 1 - damp;
        const run = (combs, allpasses, input, out) => {
            for (let s = 0; s < n; s++) {
                const x = input[s] * 0.12;
                let sum = 0;
                for (let c = 0; c < combs.length; c++) {
                    const comb = combs[c];
                    const y = comb.buf[comb.i];
                    comb.lp = y * keep + comb.lp * damp;
                    comb.buf[comb.i] = x + comb.lp * comb.g;
                    if (++comb.i == comb.buf.length)
                        comb.i = 0;
                    sum += y;
                }
                for (let a = 0; a < allpasses.length; a++) {
                    const ap = allpasses[a];
                    const y = ap.buf[ap.i];
                    ap.buf[ap.i] = sum + y * 0.5;
                    if (++ap.i == ap.buf.length)
                        ap.i = 0;
                    sum = y - sum;
                }
                out[s] = sum;
            }
        };
        run(combsL, allpassL, inL, wl);
        run(combsR, allpassR, inR, wr);
        return { wl, wr };
    }
    // Adds reverb in place; the wet level follows the dry level so "mix" means the same for every sound.
    function swAddReverb(L, R, mix, seconds, damp = 0.3) {
        if (!(mix > 0.001))
            return;
        const { wl, wr } = swReverbWet(L, R, seconds, damp);
        const dry = (swRms(L) + swRms(R)) * 0.5, wet = (swRms(wl) + swRms(wr)) * 0.5;
        if (!(wet > 1e-9))
            return;
        const wetGain = mix * dry / wet, dryGain = 1 - mix * 0.45;
        for (let i = 0; i < L.length; i++) {
            L[i] = L[i] * dryGain + wl[i] * wetGain;
            R[i] = R[i] * dryGain + wr[i] * wetGain;
        }
    }
    // A ping-pong echo in place.
    function swPingPong(L, R, mix, delaySamples, feedback) {
        if (!(mix > 0.001) || delaySamples < 1)
            return;
        const d = Math.max(1, Math.round(delaySamples));
        const bl = new Float32Array(d), br = new Float32Array(d);
        let j = 0;
        for (let i = 0; i < L.length; i++) {
            const el = bl[j], er = br[j];
            const input = (L[i] + R[i]) * 0.5;
            bl[j] = input + er * feedback;
            br[j] = el * feedback;
            if (++j == d)
                j = 0;
            L[i] += el * mix;
            R[i] += er * mix;
        }
    }
    function swSaw(phase, dt) {
        return flSaw(phase, Math.min(0.5, Math.abs(dt)));
    }
    // ------------------------------------------------------------ generators
    // Each one adds `gain` x its sound into L and R (n samples). ctx: { n, seconds, beatSamples, beats }
    const FLSweepGen = {
        "noise-riser"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const rm = swRand(s, "nr-mid"), rs = swRand(s, "nr-side");
            const pinkM = swPink(rm), pinkS = swPink(rs);
            const lpM = new SwSVF(), lpS = new SwSVF(), airM = new SwSVF(), airS = new SwSVF(), toneA = new SwSVF(), toneB = new SwSVF();
            const fLo = 120 + 300 * s.colour, fHi = 3000 + 14000 * s.colour;
            const q = 0.7 + s.res * 9;
            const startDb = -(14 + 30 * s.intensity);
            const pitched = s.pitch > 0;
            const toneMix = pitched ? 0.35 + 0.6 * s.res : 0;
            const toneQ = 10 + 30 * s.res;
            const f0 = 110 * Math.pow(2, s.colour);
            let level = 0, width = 0, airMix = 0;
            for (let i = 0; i < n; i++) {
                if ((i & 15) == 0) {
                    const c = swCurve(s.curve, i / n);
                    const fc = fLo * Math.pow(fHi / fLo, c);
                    lpM.set(fc, q);
                    lpS.set(fc * 1.04, q);
                    const air = 1200 + 9000 * c * (0.4 + 0.6 * s.colour);
                    airM.set(air, 0.8);
                    airS.set(air * 1.06, 0.8);
                    if (pitched) {
                        const pf = f0 * Math.pow(2, s.pitch * c / 12);
                        toneA.set(pf, toneQ);
                        toneB.set(pf * 2, toneQ);
                    }
                    level = swDb(startDb * (1 - c)) * gain;
                    width = s.width * (0.15 + 0.85 * c);
                    airMix = 0.12 + 0.3 * c;
                }
                const wm = rm() * 2 - 1, ws = rs() * 2 - 1;
                lpM.run(pinkM());
                lpS.run(pinkS());
                airM.run(wm);
                airS.run(ws);
                let mid = lpM.lp + airM.hp * airMix;
                const side = lpS.lp + airS.hp * airMix;
                if (pitched) {
                    toneA.run(wm);
                    toneB.run(wm);
                    mid += (toneA.bp + toneB.bp * 0.6) * toneMix * 3;
                }
                L[i] += (mid + side * width) * level;
                R[i] += (mid - side * width) * level;
            }
        },
        "uplifter"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const rand = swRand(s, "up");
            const tones = [[0, 1], [7, 0.55], [12, 0.45]];
            const voices = 5;
            const spread = 0.1 + 0.35 * s.width;
            const base = 110 * Math.pow(2, s.colour - 0.5);
            const osc = [];
            for (const [semis, amp] of tones)
                for (let v = 0; v < voices; v++) {
                    const pos = v / (voices - 1) * 2 - 1;
                    osc.push({ ratio: Math.pow(2, (semis + pos * spread) / 12), amp: amp / voices, phase: rand(), pan: pos });
                }
            const lpL = new SwSVF(), lpR = new SwSVF();
            const fLo = 300 + 400 * s.colour, fHi = 2500 + 12000 * s.colour, q = 0.7 + s.res * 6;
            const startDb = -(18 + 26 * s.intensity);
            const drive = 1 + 3 * s.intensity;
            const driveNorm = 1 / Math.tanh(drive);
            let freq = base, level = 0, width = 0;
            for (let i = 0; i < n; i++) {
                if ((i & 15) == 0) {
                    const c = swCurve(s.curve, i / n);
                    freq = base * Math.pow(2, s.pitch * c / 12);
                    const fc = fLo * Math.pow(fHi / fLo, c);
                    lpL.set(fc, q);
                    lpR.set(fc * 1.02, q);
                    level = swDb(startDb * (1 - c)) * gain;
                    width = 0.25 + 0.75 * c;
                }
                let l = 0, r = 0;
                for (let k = 0; k < osc.length; k++) {
                    const o = osc[k];
                    const dt = freq * o.ratio / FL_SR;
                    o.phase += dt;
                    if (o.phase > 1e6)
                        o.phase -= 1e6;
                    const v = swSaw(o.phase, dt) * o.amp;
                    const p = o.pan * width * s.width;
                    l += v * (1 - p);
                    r += v * (1 + p);
                }
                l = Math.tanh(lpL.run(l) * drive) * driveNorm;
                r = Math.tanh(lpR.run(r) * drive) * driveNorm;
                L[i] += l * level;
                R[i] += r * level;
            }
            FLSweepGen["noise-riser"](Object.assign({}, s, { pitch: 0, res: s.res * 0.5 }), L, R, ctx, gain * 0.35);
        },
        "shepard"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const K = 9, sigma = 1.5, fmin = 30 * Math.pow(2, (s.colour - 0.5) * 0.8);
            const octaves = Math.max(1, s.pitch / 12);
            const rand = swRand(s, "sh");
            const phL = [], phR = [], freqs = new Float64Array(K), amps = new Float64Array(K);
            for (let k = 0; k < K; k++) {
                phL.push(rand());
                phR.push(rand());
            }
            const detune = 1 + 0.004 * s.width;
            const startDb = -(16 + 24 * s.intensity);
            let level = 0;
            for (let i = 0; i < n; i++) {
                if ((i & 15) == 0) {
                    const c = swCurve(s.curve, i / n);
                    const u = octaves * c;
                    for (let k = 0; k < K; k++) {
                        let o = (k + u) % K;
                        freqs[k] = fmin * Math.pow(2, o);
                        const z = (o - K / 2) / sigma;
                        amps[k] = Math.exp(-0.5 * z * z);
                    }
                    level = swDb(startDb * (1 - c)) * gain * 0.32;
                }
                let l = 0, r = 0;
                for (let k = 0; k < K; k++) {
                    const a = amps[k];
                    if (a < 1e-4) {
                        phL[k] += freqs[k] / FL_SR;
                        phR[k] += freqs[k] * detune / FL_SR;
                        continue;
                    }
                    phL[k] += freqs[k] / FL_SR;
                    phR[k] += freqs[k] * detune / FL_SR;
                    const pl = phL[k], pr = phR[k];
                    l += a * (swSin(pl) + 0.18 * swSin(3 * pl));
                    r += a * (swSin(pr) + 0.18 * swSin(3 * pr));
                }
                L[i] += l * level;
                R[i] += r * level;
            }
            FLSweepGen["noise-riser"](Object.assign({}, s, { pitch: 0 }), L, R, ctx, gain * (0.15 + 0.2 * s.intensity));
        },
        "snare-roll"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const beatSamples = ctx.beatSamples || FL_SR / 2;
            const B = ctx.beats || ctx.seconds * 2;
            const rand = swRand(s, "roll");
            // stages of quarters, eighths, sixteenths and 32nds (shorter rolls start faster)
            const first = B >= 8 ? 1 : B >= 4 ? 2 : B >= 2 ? 4 : 8;
            const rates = [first, first * 2, Math.min(16, first * 4), Math.min(16, first * 8)];
            const fractions = s.curve == 0 ? [0.25, 0.25, 0.25, 0.25] : s.curve == 2 ? [0.375, 0.25, 0.25, 0.125] : [0.5, 0.25, 0.125, 0.125];
            const hits = [];
            let at = 0, total = 0;
            for (let j = 0; j < 4; j++) {
                total += fractions[j] * B;
                const step = 1 / rates[j];
                const end = j == 3 ? B : Math.max(at, Math.round(total / step) * step);
                for (let t = at; t < end - 1e-9; t += step)
                    hits.push([t, rates[j]]);
                at = end;
            }
            const body = new SwSVF(), noiseHP = new SwSVF();
            hits.forEach(([beat, rate], k) => {
                const start = Math.round(beat * beatSamples);
                if (start >= n)
                    return;
                const progress = beat / B;
                const c = swCurve(s.curve == 0 ? 0 : 1, progress);
                const velocity = swDb(-(5 + 20 * s.intensity) * (1 - c)) * (0.92 + 0.08 * rand()) * gain;
                const pitch = Math.pow(2, s.pitch * c / 12);
                const decay = Math.min(0.13, 0.5 / rate + 0.02) * FL_SR;
                const length = Math.min(n - start, Math.floor(decay * 7));
                const f = 185 * pitch;
                const pan = (k % 2 == 0 ? -1 : 1) * 0.3 * s.width;
                const gl = 1 - pan, gr = 1 + pan;
                noiseHP.ic1 = noiseHP.ic2 = 0;
                noiseHP.set((900 + 3500 * s.colour) * (0.8 + 0.6 * c) * Math.sqrt(pitch), 0.7);
                body.ic1 = body.ic2 = 0;
                let phase = 0;
                for (let i = 0; i < length; i++) {
                    const t = i / decay;
                    phase += f * (1 + 0.5 * Math.exp(-i / (0.004 * FL_SR))) / FL_SR;
                    noiseHP.run(rand() * 2 - 1);
                    const tone = swSin(phase) * Math.exp(-t * 1.6) * (0.7 - 0.3 * s.colour);
                    const noise = noiseHP.hp * Math.exp(-t) * 1.1;
                    const v = (tone + noise) * velocity * Math.min(1, i / 24);
                    L[start + i] += v * gl;
                    R[start + i] += v * gr;
                }
            });
            if (s.intensity > 0.3)
                FLSweepGen["noise-riser"](Object.assign({}, s, { pitch: 0 }), L, R, ctx, gain * (s.intensity - 0.3) * 0.5);
            swAddReverb(L, R, s.tail * 0.5, 1.2);
        },
        "drop-build"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            FLSweepGen["noise-riser"](s, L, R, ctx, gain * 0.75);
            FLSweepGen["uplifter"](s, L, R, ctx, gain * 0.5);
            // a sub sine that rises with everything else
            let phase = 0;
            const startDb = -(20 + 20 * s.intensity);
            for (let i = 0; i < n; i++) {
                const c = swCurve(s.curve, i / n);
                phase += 55 * Math.pow(2, s.pitch * c / 12) / FL_SR;
                const v = swSin(phase) * swDb(startDb * (1 - c)) * gain * 0.3;
                L[i] += v;
                R[i] += v;
            }
            if (s.intensity > 0.55 && ctx.beatSamples)
                FLSweepGen["snare-roll"](Object.assign({}, s, { tail: 0 }), L, R, ctx, gain * (s.intensity - 0.4) * 0.6);
        },
        "reverse-cymbal"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const fl = new Float32Array(n), fr = new Float32Array(n);
            const ratios = [1, 1.483, 1.932, 2.546, 2.63, 3.897];
            const base = 330 * Math.pow(2, (s.colour - 0.5) * 0.7);
            const rl = swRand(s, "cym-l"), rr = swRand(s, "cym-r");
            const phl = ratios.map(() => rl()), phr = ratios.map(() => rr());
            const hpL = new SwSVF(), hpR = new SwSVF(), bpL = new SwSVF(), bpR = new SwSVF();
            hpL.set(3200 + 2600 * s.colour, 0.7);
            hpR.set(3300 + 2600 * s.colour, 0.7);
            bpL.set(7000 + 3000 * s.colour, 0.6);
            bpR.set(7300 + 3000 * s.colour, 0.6);
            const tau = n * [0.42, 0.24, 0.32][s.curve];
            const noiseAmt = 0.4 + 0.5 * s.intensity;
            for (let i = 0; i < n; i++) {
                let ml = 0, mr = 0;
                for (let k = 0; k < 6; k++) {
                    const f = base * ratios[k] / FL_SR;
                    phl[k] += f;
                    phr[k] += f * 1.0021;
                    ml += (phl[k] - Math.floor(phl[k])) < 0.5 ? 1 : -1;
                    mr += (phr[k] - Math.floor(phr[k])) < 0.5 ? 1 : -1;
                }
                const nl = rl() * 2 - 1, nr = rr() * 2 - 1;
                const env = Math.exp(-i / tau) * (0.55 + 0.45 * Math.exp(-i / (0.03 * FL_SR))) * Math.min(1, i / 40);
                hpL.run(ml / 6 + nl * noiseAmt);
                hpR.run(mr / 6 + nr * noiseAmt);
                bpL.run(hpL.hp);
                bpR.run(hpR.hp);
                const l = hpL.hp * 0.6 + bpL.bp * 0.8, r = hpR.hp * 0.6 + bpR.bp * 0.8;
                const mid = (l + r) * 0.5, side = (l - r) * 0.5 * s.width * 1.6;
                fl[i] = (mid + side) * env;
                fr[i] = (mid - side) * env;
            }
            swAddReverb(fl, fr, s.tail * 0.6, Math.max(0.6, ctx.seconds * 0.5), 0.2);
            for (let i = 0; i < n; i++) {
                L[i] += fl[n - 1 - i] * gain;
                R[i] += fr[n - 1 - i] * gain;
            }
        },
        "reverse-reverb"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const dl = new Float32Array(n), dr = new Float32Array(n);
            const root = 130.81 * Math.pow(2, s.pitch / 12);
            const rand = swRand(s, "rr");
            const chord = [0, 3, 7, 12, 19];
            const phases = chord.map(() => rand());
            const lp = new SwSVF();
            lp.set(1200 + 8000 * s.colour, 0.7 + 3 * s.res);
            const stab = Math.min(n, Math.floor(0.35 * FL_SR));
            for (let i = 0; i < stab; i++) {
                let v = 0;
                for (let k = 0; k < chord.length; k++) {
                    const dt = root * Math.pow(2, chord[k] / 12) / FL_SR;
                    phases[k] += dt;
                    v += swSaw(phases[k], dt) / chord.length;
                }
                v += (rand() * 2 - 1) * 0.6 * Math.exp(-i / (0.01 * FL_SR)) * s.intensity;
                v = lp.run(v) * Math.exp(-i / (0.09 * FL_SR)) * Math.min(1, i / 30);
                dl[i] = v;
                dr[i] = v;
            }
            const seconds = Math.max(0.8, ctx.seconds * (0.55 + 0.6 * s.tail));
            const { wl, wr } = swReverbWet(dl, dr, seconds, 0.45 - 0.3 * s.colour);
            // a little of the stab itself at the very end, reversed with its reverb
            const dryMix = 0.15 * (1 - s.tail);
            const peakWet = Math.max(swRms(wl), swRms(wr), 1e-9);
            const peakDry = Math.max(swRms(dl), 1e-9);
            const w = s.width;
            for (let i = 0; i < n; i++) {
                const j = n - 1 - i;
                const l = wl[j] / peakWet, r = wr[j] / peakWet;
                const mid = (l + r) * 0.5, side = (l - r) * 0.5 * (0.3 + 1.2 * w);
                const dry = dl[j] / peakDry * dryMix;
                L[i] += (mid + side + dry) * gain;
                R[i] += (mid - side + dry) * gain;
            }
        },
        "whoosh"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const peak = [0.5, 0.72, 0.32][s.curve];
            const rm = swRand(s, "wh-mid"), rs = swRand(s, "wh-side");
            const pinkM = swPink(rm);
            const bpM = new SwSVF(), bpS = new SwSVF(), whistle = new SwSVF();
            const base = 400 + 3600 * s.colour, q = 0.8 + 4 * s.res;
            let env = 0, gl = 1, gr = 1, sideAmt = 0;
            for (let i = 0; i < n; i++) {
                if ((i & 15) == 0) {
                    const x = i / n;
                    env = x < peak ? Math.pow(Math.sin(Math.PI / 2 * x / peak), 2.2) : Math.pow(Math.cos(Math.PI / 2 * (x - peak) / (1 - peak)), 1.6);
                    const doppler = (s.pitch / 12) * 0.5 * Math.tanh((peak - x) * 6);
                    const fc = base * Math.pow(2, doppler * 2) * (0.5 + 0.5 * env);
                    bpM.set(fc, q);
                    bpS.set(fc * 1.07, q);
                    whistle.set(fc * 2.1, 18 + 20 * s.res);
                    const pos = Math.tanh((x - peak) * 5) * s.width;
                    const angle = (pos + 1) * Math.PI / 4;
                    gl = Math.cos(angle) * 1.414 * gain;
                    gr = Math.sin(angle) * 1.414 * gain;
                    sideAmt = 0.35 * s.width * env;
                }
                const white = rm() * 2 - 1;
                bpM.run(pinkM() * 0.7 + white * 0.3);
                bpS.run(rs() * 2 - 1);
                whistle.run(white);
                const mid = (bpM.bp * (0.8 + 0.6 * s.intensity) + whistle.bp * s.res * 1.2) * env;
                const side = bpS.bp * sideAmt;
                L[i] += mid * gl + side * gain;
                R[i] += mid * gr - side * gain;
            }
            swAddReverb(L, R, s.tail * 0.6, 1.1);
        },
        // A chord groove at tape position tau (seconds of "source time"); shared by tape stop and spin-back.
        _groove(s, ctx, label) {
            const root = 65.41 * Math.pow(2, s.pitch / 12);
            const notes = [0, 7, 12, 15, 19].map(x => root * Math.pow(2, x / 12));
            const stepSeconds = (ctx.beatSamples ? ctx.beatSamples / FL_SR : 0.5) / 4;
            const detune = 1 + 0.003 * s.width;
            const rand = swRand(s, label);
            return (tau, out) => {
                let l = 0, r = 0;
                for (let k = 0; k < notes.length; k++) {
                    const pl = notes[k] * tau, pr = pl * detune;
                    l += (2 * (pl - Math.floor(pl)) - 1) / notes.length;
                    r += (2 * (pr - Math.floor(pr)) - 1) / notes.length;
                }
                const stepPos = tau / stepSeconds;
                const gate = Math.exp(-(stepPos - Math.floor(stepPos)) * 3.2) * (0.4 + 0.6 * s.intensity) + (1 - s.intensity) * 0.4;
                const sub = Math.sin(2 * Math.PI * root * 0.5 * tau) * 0.5;
                const hiss = (rand() * 2 - 1) * 0.02;
                out[0] = (l * gate + sub) * 0.8 + hiss;
                out[1] = (r * gate + sub) * 0.8 + hiss;
            };
        },
        "tape-stop"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const groove = FLSweepGen._groove(s, ctx, "tape");
            const lpL = new SwSVF(), lpR = new SwSVF();
            const out = [0, 0];
            let tau = 0, rate = 1;
            for (let i = 0; i < n; i++) {
                const x = i / n;
                if ((i & 15) == 0) {
                    rate = Math.max(0, 1 - swCurve(s.curve, x));
                    const fc = 120 + (1500 + 9000 * s.colour) * Math.pow(rate, 1.5);
                    lpL.set(fc, 0.7 + s.res * 2);
                    lpR.set(fc, 0.7 + s.res * 2);
                }
                tau += rate / FL_SR;
                groove(tau, out);
                const amp = Math.pow(Math.min(1, rate * 3), 0.7) * gain;
                L[i] += lpL.run(out[0]) * amp;
                R[i] += lpR.run(out[1]) * amp;
            }
            swAddReverb(L, R, s.tail * 0.5, 0.9);
        },
        "spin-back"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const groove = FLSweepGen._groove(s, ctx, "spin");
            const lpL = new SwSVF(), lpR = new SwSVF(), scratch = new SwSVF();
            const rand = swRand(s, "needle");
            const back = 2 + 3 * s.intensity;
            const x0 = 0.06, x1 = 0.24;
            const out = [0, 0];
            let tau = 4, rate = 1;
            for (let i = 0; i < n; i++) {
                const x = i / n;
                if ((i & 15) == 0) {
                    if (x < x0)
                        rate = 1;
                    else if (x < x1)
                        rate = 1 - (1 + back) * swCurve(2, (x - x0) / (x1 - x0));
                    else
                        rate = -back * (1 - swCurve(s.curve, (x - x1) / (1 - x1)));
                    const speed = Math.abs(rate);
                    const fc = 150 + (2000 + 9000 * s.colour) * Math.min(1, speed);
                    lpL.set(fc, 0.7 + s.res);
                    lpR.set(fc, 0.7 + s.res);
                    scratch.set(300 + 900 * speed, 2 + 6 * s.res);
                }
                tau += rate / FL_SR;
                groove(tau, out);
                const speed = Math.abs(rate);
                const amp = Math.pow(Math.min(1, speed * 2.5), 0.6) * gain;
                scratch.run(rand() * 2 - 1);
                const needle = scratch.bp * 0.5 * Math.min(1, speed) * (0.4 + s.intensity);
                L[i] += (lpL.run(out[0]) + needle) * amp;
                R[i] += (lpR.run(out[1]) + needle) * amp;
            }
            swAddReverb(L, R, s.tail * 0.5, 0.9);
        },
        "downlifter"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const rm = swRand(s, "dl-mid"), rs = swRand(s, "dl-side"), rt = swRand(s, "dl-tone");
            const pinkM = swPink(rm), pinkS = swPink(rs);
            const lpM = new SwSVF(), lpS = new SwSVF(), lpT = new SwSVF();
            const fHi = 3000 + 14000 * s.colour, fLo = 140 + 200 * s.colour, q = 0.7 + s.res * 8;
            const endDb = -(30 + 20 * s.intensity);
            const toned = s.pitch > 0;
            const f0 = 880 * Math.pow(2, s.colour - 0.5);
            const ph = [rt(), rt()];
            const attack = 0.004 * FL_SR;
            // the dry sound falls over most of the length and the reverb rings out after it
            const dryLength = n * (1 - 0.35 * s.tail);
            let level = 0, width = 0, freq = f0;
            for (let i = 0; i < n; i++) {
                if ((i & 15) == 0) {
                    const x = Math.min(1, i / dryLength);
                    const c = swFallCurve(s.curve, x);
                    const fc = fHi * Math.pow(fLo / fHi, c);
                    lpM.set(fc, q);
                    lpS.set(fc * 1.04, q);
                    lpT.set(Math.min(fc * 1.5, 16000), 0.8);
                    level = (x >= 1 ? 0 : swDb(endDb * c) * (1 - Math.pow(x, 8))) * gain;
                    width = s.width * (1 - 0.6 * c);
                    freq = f0 * Math.pow(2, -s.pitch * c / 12);
                }
                const a = i < attack ? i / attack : 1;
                lpM.run(pinkM());
                lpS.run(pinkS());
                let mid = lpM.lp;
                if (toned) {
                    const dt = freq / FL_SR;
                    ph[0] += dt;
                    ph[1] += dt * 1.006;
                    mid += lpT.run((swSaw(ph[0], dt) + swSaw(ph[1], dt * 1.006)) * 0.5) * 0.35;
                }
                const side = lpS.lp * width;
                L[i] += (mid + side) * level * a;
                R[i] += (mid - side) * level * a;
            }
            swAddReverb(L, R, s.tail * 0.7, Math.max(0.6, ctx.seconds * 0.45));
        },
        "sub-drop"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const fEnd = 30 + 14 * s.colour, octaves = s.pitch / 12;
            const drive = 1 + 6 * s.intensity, driveNorm = 1 / Math.tanh(drive);
            const rand = swRand(s, "sub");
            const click = new SwSVF();
            click.set(2500, 0.7);
            const clickLength = Math.floor(0.012 * FL_SR);
            let phase = 0;
            for (let i = 0; i < n; i++) {
                const x = i / n;
                const f = fEnd * Math.pow(2, octaves * (1 - swFallCurve(s.curve, x)));
                phase += f / FL_SR;
                const amp = x < 0.04 ? 1 : Math.pow(1 - (x - 0.04) / 0.96, 0.85);
                let v = Math.tanh(swSin(phase) * drive) * driveNorm * amp;
                if (i < clickLength) {
                    click.run(rand() * 2 - 1);
                    v += click.lp * (1 - i / clickLength) * s.intensity * 0.8;
                }
                L[i] += v * gain;
                R[i] += v * gain;
            }
            if (s.width > 0.05) {
                // a little stereo room on the harmonics only (the sub itself stays mono)
                const wl = new Float32Array(n), wr = new Float32Array(n);
                const hp = new SwSVF();
                hp.set(220, 0.7);
                for (let i = 0; i < n; i++) {
                    hp.run(L[i]);
                    wl[i] = hp.hp;
                    wr[i] = hp.hp;
                }
                const { wl: rl, wr: rr } = swReverbWet(wl, wr, 0.6, 0.4);
                const amount = s.width * 0.6 * (swRms(wl) / Math.max(1e-9, (swRms(rl) + swRms(rr)) / 2));
                for (let i = 0; i < n; i++) {
                    const side = (rl[i] - rr[i]) * 0.5 * amount;
                    L[i] += side;
                    R[i] -= side;
                }
            }
            swAddReverb(L, R, s.tail * 0.3, 0.8);
        },
        "impact"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const rl = swRand(s, "imp-l"), rr = swRand(s, "imp-r");
            const lpL = new SwSVF(), lpR = new SwSVF();
            const fTop = 3000 + 12000 * s.colour, fBottom = 140;
            const boomTau = Math.min(1.4, ctx.seconds * 0.3) * FL_SR;
            const noiseTau = Math.max(0.08, ctx.seconds * (0.12 + 0.2 * s.intensity)) * FL_SR;
            const dryLength = n * (1 - 0.3 * s.tail);
            const drive = 1 + 3 * s.intensity, driveNorm = 1 / Math.tanh(drive);
            const boomDrop = Math.pow(2, s.pitch / 12);
            let phase = 0;
            for (let i = 0; i < n; i++) {
                if ((i & 15) == 0) {
                    const c = swFallCurve(s.curve, Math.min(1, i / dryLength));
                    const fc = fTop * Math.pow(fBottom / fTop, c);
                    lpL.set(fc, 0.7 + s.res * 5);
                    lpR.set(fc * 1.03, 0.7 + s.res * 5);
                }
                const t = i / FL_SR;
                phase += 42 * (1 + (boomDrop - 1) * Math.exp(-t / 0.05)) / FL_SR;
                const boom = Math.tanh(swSin(phase) * drive) * driveNorm * Math.exp(-i / boomTau);
                const env = Math.exp(-i / noiseTau) * Math.min(1, i / 20);
                lpL.run(rl() * 2 - 1);
                lpR.run(rr() * 2 - 1);
                const nl = lpL.lp * env, nr = lpR.lp * env;
                const mid = (nl + nr) * 0.5, side = (nl - nr) * 0.5 * s.width * 1.5;
                const clickEnv = i < 200 ? (1 - i / 200) * 0.6 * s.intensity : 0;
                L[i] += (boom * 0.9 + (mid + side) * 1.2 + clickEnv * (rl() * 2 - 1)) * gain;
                R[i] += (boom * 0.9 + (mid - side) * 1.2 + clickEnv * (rr() * 2 - 1)) * gain;
            }
            swAddReverb(L, R, s.tail * 0.7, Math.max(0.6, Math.min(3, ctx.seconds * 0.6)), 0.25);
        },
        "laser"(s, L, R, ctx, gain = 1) {
            const n = ctx.n;
            const f0 = 1500 + 4500 * s.colour, span = Math.max(12, s.pitch) / 12;
            const detune = 1 + 0.009 * s.width;
            const dryLength = n * (1 - 0.6 * s.tail);
            let pc = 0, pm = 0, pc2 = 0, pm2 = 0;
            for (let i = 0; i < n; i++) {
                const x = Math.min(1, i / dryLength);
                const f = f0 * Math.pow(2, -span * swFallCurve(s.curve, x));
                const index = (1 + 6 * s.intensity) * (1 - x);
                pc += f / FL_SR;
                pm += f * 2.01 / FL_SR;
                pc2 += f * detune / FL_SR;
                pm2 += f * detune * 2.01 / FL_SR;
                const env = x >= 1 ? 0 : Math.exp(-x * 3) * (1 - Math.pow(x, 6)) * Math.min(1, i / 40) * gain;
                const sub = (pc * 0.5 - Math.floor(pc * 0.5)) < 0.5 ? 0.25 : -0.25;
                const l = swSin(pc + index * swSin(pm) / (2 * Math.PI)) + sub * s.intensity;
                const r = swSin(pc2 + index * swSin(pm2) / (2 * Math.PI)) + sub * s.intensity;
                L[i] += l * env;
                R[i] += r * env;
            }
            const delay = ctx.beatSamples ? ctx.beatSamples / 4 : 0.11 * FL_SR;
            swPingPong(L, R, s.tail * 0.7, delay, 0.45);
        },
    };
    // ------------------------------------------------------------ the library interface
    class FLSweepers {
        static types() {
            return FL_SWEEP_TYPES;
        }
        static curves() {
            return FL_SWEEP_CURVES;
        }
        static type(id) {
            return FL_SWEEP_TYPES.find(t => t.id == id) || null;
        }
        // A complete description of a sweep: { type, beats, bpm, seconds, curve, intensity, colour, res, pitch, width, tail, gap, seed }.
        // Values are rounded to what a key can hold, so a key always renders exactly what was asked.
        static normalize(spec = {}) {
            const type = FLSweepers.type(spec.type) || FL_SWEEP_TYPES[0];
            const d = type.def;
            const num = (value, def, lo, hi, step) => {
                const v = +value;
                const x = Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
                return Math.round(x / step) * step;
            };
            const out = { type: type.id };
            if (+spec.beats > 0 && +spec.bpm > 0) {
                out.bpm = Math.round(num(spec.bpm, 120, Config.tempoMin, Config.tempoMax, 1));
                out.beats = +num(spec.beats, 4, 0.25, Math.floor(160 * out.bpm / 60), 0.25).toFixed(2);
                out.seconds = out.beats * 60 / out.bpm;
            }
            else {
                out.beats = 0;
                out.bpm = 0;
                out.seconds = +num(spec.seconds, 2, 0.05, 160, 0.001).toFixed(3);
            }
            out.curve = [0, 1, 2].indexOf(spec.curve) != -1 ? spec.curve : d.curve;
            for (const key of ["intensity", "colour", "res", "width", "tail"])
                out[key] = +num(spec[key], d[key], 0, 1, 0.01).toFixed(2);
            out.pitch = num(spec.pitch, d.pitch, 0, 48, 1);
            out.gap = out.bpm ? +num(spec.gap, d.gap, 0, Math.max(0, out.beats - 0.25), 0.01).toFixed(2) : 0;
            out.seed = num(spec.seed, 1, 0, 99999, 1);
            return out;
        }
        static defaults(typeId, extra = {}) {
            const type = FLSweepers.type(typeId) || FL_SWEEP_TYPES[0];
            return FLSweepers.normalize(Object.assign({ type: type.id, seed: 1 }, type.def, extra));
        }
        static keyFor(spec) {
            const s = FLSweepers.normalize(spec);
            const length = s.bpm ? s.beats + "b" + s.bpm : s.seconds + "s";
            const pc = (v) => Math.round(v * 100);
            return "sw/" + s.type + "@" + length + "@" + [s.curve, pc(s.intensity), pc(s.colour), pc(s.res), s.pitch, pc(s.width), pc(s.tail), pc(s.gap), s.seed].join(".");
        }
        static parseKey(key) {
            const m = /^sw\/([a-z-]+)@(?:([\d.]+)b(\d+)|([\d.]+)s)@([012])\.(\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(key || "");
            if (!m || !FLSweepers.type(m[1]))
                return null;
            const spec = { type: m[1], curve: +m[5], intensity: m[6] / 100, colour: m[7] / 100, res: m[8] / 100, pitch: +m[9], width: m[10] / 100, tail: m[11] / 100, gap: m[12] / 100, seed: +m[13] };
            if (m[2] != undefined) {
                spec.beats = +m[2];
                spec.bpm = +m[3];
            }
            else
                spec.seconds = +m[4];
            return FLSweepers.normalize(spec);
        }
        // The key of the same sweep at another tempo (for re-rendering after a tempo change).
        static withTempo(key, bpm) {
            const spec = FLSweepers.parseKey(key);
            if (!spec || !spec.bpm)
                return key;
            spec.bpm = bpm;
            return FLSweepers.keyFor(spec);
        }
        static lengthSamples(spec) {
            const s = FLSweepers.normalize(spec);
            return Math.max(1, Math.round(s.seconds * FL_SR));
        }
        static nameOf(spec) {
            const s = FLSweepers.normalize(spec);
            const type = FLSweepers.type(s.type);
            const plural = (x, word) => (+x).toString() + " " + word + (x == 1 ? "" : "s");
            return type.name + " (" + (s.bpm ? plural(s.beats, "beat") + " at " + s.bpm + " BPM" : s.seconds + " s") + ")";
        }
        static infoForKey(key) {
            const spec = FLSweepers.parseKey(key);
            return spec ? { key, name: FLSweepers.nameOf(spec), rootKey: 60, bpm: spec.bpm || null } : null;
        }
        // { left, right, mono, rate, length } (cached; the arrays must not be changed)
        static render(spec) {
            const key = FLSweepers.keyFor(spec);
            const cached = FLSweepers._cache.get(key);
            if (cached) {
                FLSweepers._cache.delete(key);
                FLSweepers._cache.set(key, cached);
                return cached;
            }
            const result = FLSweepers._render(FLSweepers.normalize(spec));
            FLSweepers._cache.set(key, result);
            FLSweepers._cacheSamples += result.length;
            while (FLSweepers._cacheSamples > 8000000 && FLSweepers._cache.size > 1) {
                const oldest = FLSweepers._cache.keys().next().value;
                FLSweepers._cacheSamples -= FLSweepers._cache.get(oldest).length;
                FLSweepers._cache.delete(oldest);
            }
            return result;
        }
        // For the sample bank ("b:sw/..." ids).
        static renderKey(key) {
            const spec = FLSweepers.parseKey(key);
            if (!spec)
                return null;
            const r = FLSweepers.render(spec);
            return { pcm: r.mono, rate: FL_SR, name: FLSweepers.nameOf(spec), rootKey: 60, loop: null, bpm: spec.bpm || null, beats: spec.beats || null };
        }
        static _render(s) {
            const n = Math.max(1, Math.round(s.seconds * FL_SR));
            const L = new Float32Array(n), R = new Float32Array(n);
            const ctx = { n, seconds: n / FL_SR, beats: s.beats, beatSamples: s.bpm ? FL_SR * 60 / s.bpm : 0 };
            FLSweepGen[s.type](s, L, R, ctx, 1);
            // the silent gap before the downbeat
            if (s.gap > 0 && ctx.beatSamples) {
                const from = Math.max(1, n - Math.round(s.gap * ctx.beatSamples));
                const fade = Math.min(from, Math.round(0.006 * FL_SR));
                for (let i = from - fade; i < from; i++) {
                    const k = (from - i) / fade;
                    L[i] *= k;
                    R[i] *= k;
                }
                L.fill(0, from);
                R.fill(0, from);
            }
            // remove DC (12 Hz high-pass), clean up anything that is not a number, then level and edges
            let xl = 0, yl = 0, xr = 0, yr = 0;
            const a = Math.exp(-2 * Math.PI * 12 / FL_SR);
            let peak = 0;
            for (let i = 0; i < n; i++) {
                let l = L[i], r = R[i];
                if (!(l > -1e6 && l < 1e6))
                    l = 0;
                if (!(r > -1e6 && r < 1e6))
                    r = 0;
                yl = l - xl + a * yl;
                xl = l;
                yr = r - xr + a * yr;
                xr = r;
                L[i] = yl;
                R[i] = yr;
                peak = Math.max(peak, Math.abs(yl), Math.abs(yr));
            }
            const scale = peak > 0 ? 0.89 / peak : 0;
            const fadeIn = Math.min(n >> 1, Math.round(0.0015 * FL_SR)), fadeOut = Math.min(n >> 1, Math.round(0.003 * FL_SR));
            const mono = new Float32Array(n);
            let monoPeak = 0;
            for (let i = 0; i < n; i++) {
                let g = scale;
                if (i < fadeIn)
                    g *= i / fadeIn;
                if (i >= n - fadeOut)
                    g *= (n - 1 - i) / fadeOut;
                L[i] *= g;
                R[i] *= g;
                mono[i] = (L[i] + R[i]) * 0.5;
                monoPeak = Math.max(monoPeak, Math.abs(mono[i]));
            }
            if (monoPeak > 0) {
                const k = 0.89 / monoPeak;
                for (let i = 0; i < n; i++)
                    mono[i] *= k;
            }
            return { left: L, right: R, mono, rate: FL_SR, length: n };
        }
    }
    FLSweepers._cache = new Map();
    FLSweepers._cacheSamples = 0;
    // Library sounds use the same engine (catalog params are a sweep description).
    FLGen.sweeper = (p) => FLSweepers._render(FLSweepers.normalize(p)).mono;

    // ------------------------------------------------------------ phonk FX
    // FL-style phonk effects: tuned cowbells, cowbell rolls, a drifting car pass, sirens,
    // a shot with a room tail, radio tuning, cassette rewind, crackle beds and 808 slides.
    function phBiquad(type, f, q) {
        const w = 2 * Math.PI * Math.min(f, FL_SR * 0.45) / FL_SR, a = Math.sin(w) / (2 * q), c = Math.cos(w);
        let b0, b1, b2;
        if (type == "bp") { b0 = a; b1 = 0; b2 = -a; }
        else if (type == "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
        else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
        const a0 = 1 + a, a1 = -2 * c / a0, a2 = (1 - a) / a0;
        b0 /= a0; b1 /= a0; b2 /= a0;
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        return (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
    }
    // a band-limited square: odd harmonics up to Nyquist
    function phSquare(phase, f) {
        let v = 0;
        for (let k = 1; k <= 15 && k * f < FL_SR * 0.45; k += 2) v += Math.sin(2 * Math.PI * phase * k) / k;
        return v;
    }
    function phCowbellHit(out, at, f, decay, gain, drive) {
        const f2 = f * 1.4815, n = Math.min(out.length - at, Math.round((decay * 4 + 0.05) * FL_SR));
        const bp = phBiquad("bp", f * 2.6, 0.8), hp = phBiquad("hp", f * 0.7, 0.7);
        let p1 = 0, p2 = 0;
        for (let i = 0; i < n; i++) {
            const t = i / FL_SR;
            const env = Math.min(1, t / 0.0015) * (0.55 * Math.exp(-t / 0.012) + 0.45 * Math.exp(-t / decay));
            p1 += f / FL_SR; p2 += f2 / FL_SR;
            let v = hp(bp(phSquare(p1 % 1, f) + phSquare(p2 % 1, f2))) * env;
            if (drive > 0) v = Math.tanh(v * (1 + drive)) / Math.tanh(1 + drive);
            out[at + i] += v * gain;
        }
    }
    FLGen.phonk = (p) => {
        const rand = flRng("phonk/" + p.kind + "/" + (p.seed || 1));
        const len = Math.round((p.len || 1) * FL_SR), x = new Float32Array(len);
        const noise = () => rand() * 2 - 1;
        switch (p.kind) {
            case "cowbell":
                phCowbellHit(x, 0, p.f || 523.25, p.decay || 0.3, 1, p.drive || 0);
                break;
            case "cowroll": {
                // cowbell hits that speed up (and rise) into the drop
                let t = 0;
                const total = p.len - 0.05;
                while (t < total) {
                    const u = t / total, gap = 0.25 * Math.pow(1 - u, 1.6) + 0.035;
                    phCowbellHit(x, Math.round(t * FL_SR), (p.f || 523.25) * Math.pow(2, u * (p.rise || 0) / 12), 0.12, 0.35 + 0.65 * u, p.drive || 1.5);
                    t += gap;
                }
                break;
            }
            case "drift": {
                // an engine revving past: rising saw harmonics, a Doppler drop as it passes, tyre screech
                const mid = 0.55 * len, lp = phBiquad("lp", 900, 0.9), screech = phBiquad("bp", 2300, 9);
                let ph = 0, wob = 0;
                for (let i = 0; i < len; i++) {
                    const t = i / FL_SR, u = i / len;
                    const rev = 55 + 85 * Math.pow(u, 0.8) + 12 * Math.sin(2 * Math.PI * 3.1 * t);
                    const doppler = i < mid ? 1.12 : 0.86, near = Math.exp(-Math.pow((i - mid) / (0.22 * len), 2));
                    ph += rev * doppler / FL_SR;
                    let saw = 0;
                    for (let k = 1; k <= 12; k++) saw += Math.sin(2 * Math.PI * ph * k) / k;
                    wob += 0.002 * (noise() - wob * 0.01);
                    const sc = screech(noise()) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 7 * t + wob)) * Math.max(0, near - 0.25) * 1.4;
                    x[i] = (Math.tanh(lp(saw) * 2.2) * 0.8 + sc * 0.5) * (0.12 + 0.88 * near);
                }
                break;
            }
            case "siren": {
                const lo = phBiquad("hp", 350, 0.7), hi = phBiquad("lp", 3200, 0.7);
                let ph = 0;
                for (let i = 0; i < len; i++) {
                    const t = i / FL_SR;
                    const f = p.wail ? 650 + 550 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / 1.6)) : (Math.floor(t / 0.45) % 2 ? 960 : 720);
                    ph += f / FL_SR;
                    const v = 0.6 * Math.sin(2 * Math.PI * ph) + 0.4 * phSquare(ph % 1, f);
                    x[i] = hi(lo(Math.tanh(v * 2))) * Math.min(1, t / 0.05) * Math.min(1, (len - i) / (0.3 * FL_SR));
                }
                break;
            }
            case "shot": {
                // a sharp crack, a low thump and a slap-back room
                const crack = phBiquad("hp", 1200, 0.7);
                let ph = 0;
                for (let i = 0; i < len; i++) {
                    const t = i / FL_SR;
                    const c = crack(noise()) * Math.exp(-t / 0.006) * 1.6 + noise() * Math.exp(-t / 0.05) * 0.35;
                    ph += (55 + 90 * Math.exp(-t / 0.02)) / FL_SR;
                    x[i] = Math.tanh((c + Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.16)) * 1.8);
                }
                break;
            }
            case "radio": {
                // tuning across stations: static, whistles and a voice-band hum
                const bp = phBiquad("bp", 1400, 0.9);
                let ph = 0;
                for (let i = 0; i < len; i++) {
                    const t = i / FL_SR, u = i / len;
                    ph += (300 + 2600 * Math.abs(Math.sin(Math.PI * u * 2.3))) / FL_SR;
                    const whistle = Math.sin(2 * Math.PI * ph) * 0.35 * Math.pow(Math.sin(Math.PI * u * 5), 2);
                    const am = 0.6 + 0.4 * Math.sin(2 * Math.PI * 50 * t);
                    x[i] = Math.tanh(bp(noise() * am + whistle) * 2.5) * Math.min(1, t / 0.02) * Math.min(1, (len - i) / (0.05 * FL_SR));
                }
                break;
            }
            case "rewind": {
                // a cassette whirring backwards: chirps that speed up
                const bp = phBiquad("bp", 3000, 3);
                let ph = 0;
                for (let i = 0; i < len; i++) {
                    const t = i / FL_SR, u = i / len;
                    ph += (6 + 34 * u) / FL_SR;
                    const chirp = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * ph), 6);
                    x[i] = bp(noise()) * (0.25 + 0.75 * chirp) * 2.5 * Math.min(1, t / 0.03) * Math.min(1, (len - i) / (0.08 * FL_SR));
                }
                break;
            }
            case "crackle": {
                // a vinyl bed: dust clicks over a soft hiss (loops cleanly: no fades)
                const lp = phBiquad("lp", 5000, 0.7), hp = phBiquad("hp", 400, 0.7);
                for (let i = 0; i < len; i++) {
                    let v = hp(lp(noise())) * 0.06;
                    if (rand() < 0.0009) { const amp = 0.3 + rand() * 0.7, n = 8 + Math.floor(rand() * 40); for (let k = 0; k < n && i + k < len; k++) x[i + k] += noise() * amp * Math.exp(-k / 6); }
                    x[i] += v;
                }
                break;
            }
            case "slide": {
                // a distorted 808 that slides between two notes
                let ph = 0;
                const f0 = p.f || 65.41, f1 = f0 * Math.pow(2, (p.semi || -12) / 12);
                for (let i = 0; i < len; i++) {
                    const t = i / FL_SR, u = Math.min(1, Math.max(0, (t - 0.25) / 0.35));
                    const f = f0 * Math.pow(f1 / f0, u * u * (3 - 2 * u));
                    ph += f / FL_SR;
                    const env = Math.min(1, t / 0.004) * Math.exp(-Math.max(0, t - 0.6) / 0.5);
                    x[i] = Math.tanh(Math.sin(2 * Math.PI * ph) * (1 + (p.drive || 4))) * env;
                }
                break;
            }
        }
        if (p.room > 0) {
            const L = x.slice(), R = x.slice();
            swAddReverb(L, R, p.room, p.roomLen || 1.2);
            for (let i = 0; i < len; i++) x[i] = 0.5 * (L[i] + R[i]);
        }
        if (p.crush) { const q = Math.pow(2, p.crush - 1); for (let i = 0; i < len; i++) x[i] = Math.round(x[i] * q) / q; }
        let peak = 0;
        for (const v of x) peak = Math.max(peak, Math.abs(v));
        if (peak > 0) for (let i = 0; i < len; i++) x[i] *= 0.89 / peak;
        if (p.kind != "crackle") { const fade = Math.min(len, Math.round(0.01 * FL_SR)); for (let i = 0; i < fade; i++) x[len - 1 - i] *= i / fade; }
        return x;
    };
    // ------------------------------------------------------------ the library
    {
        const K = FLPackKit;
        const { PK, pad2 } = K;
        const SW = PK + "/FX Sweepers";
        const beatsLabel = (beats) => beats % 4 == 0 && beats >= 8 ? (beats / 4) + " Bars" : beats + (beats == 1 ? " Beat" : " Beats");
        const seedOf = (text) => {
            let h = 2166136261;
            for (let i = 0; i < text.length; i++)
                h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
            return h % 9973 + 1;
        };
        const addSweep = (path, spec) => {
            const s = FLSweepers.normalize(Object.assign({ seed: seedOf(path) }, FLSweepers.type(spec.type).def, spec));
            flAdd(path, "sweeper", s, s.bpm ? { bpm: s.bpm } : {});
        };
        // ---- the FX Sweepers folder: tempo-synced versions at four common tempos, plus one-shots in seconds
        const TEMPOS = [120, 128, 140, 174];
        // each tempo gets its own colour so the four versions are not just stretched copies
        const LOOK = { 120: { colour: -0.08, intensity: -0.05 }, 128: {}, 140: { colour: 0.05, res: 0.05 }, 174: { colour: 0.1, intensity: 0.08 } };
        const SETS = [
            ["Noise Risers", "noise-riser", [1, 2, 4, 8], {}],
            ["Uplifters", "uplifter", [2, 4, 8], {}],
            ["Snare Roll Risers", "snare-roll", [4, 8], {}],
            ["Builds Into Drop", "drop-build", [8, 16], {}],
            ["Shepard Rises", "shepard", [8], {}],
            ["Reverse Cymbals", "reverse-cymbal", [1, 2], {}],
            ["Reverse Reverb Swells", "reverse-reverb", [2, 4], {}],
            ["Downlifters", "downlifter", [2, 4, 8], {}],
            ["Sub Drops", "sub-drop", [2, 4], {}],
            ["Impacts", "impact", [4], {}],
            ["Tape Stops", "tape-stop", [1, 2], {}],
            ["Spin-Backs", "spin-back", [1, 2], {}],
        ];
        for (const [folder, type, lengths, mods] of SETS) {
            const name = FLSweepers.type(type).name;
            for (const beats of lengths)
                for (const bpm of TEMPOS) {
                    const look = LOOK[bpm], def = FLSweepers.type(type).def;
                    const spec = Object.assign({ type, beats, bpm }, mods);
                    for (const key of Object.keys(look))
                        spec[key] = swClamp(def[key] + look[key], 0, 1);
                    if (type == "drop-build")
                        spec.gap = beats >= 16 ? 1 : 0.5;
                    addSweep(SW + "/" + folder + "/" + name + " " + beatsLabel(beats) + " " + bpm + " BPM", spec);
                }
        }
        const WHOOSH = [["Fast", 0.35, 0, 0.7], ["Short", 0.6, 0, 0.6], ["Pass", 1, 0, 0.55], ["Slow", 1.5, 0, 0.45], ["Long", 2.5, 0, 0.4]];
        for (const [label, seconds, curve, colour] of WHOOSH) {
            addSweep(SW + "/Whooshes/Whoosh " + label + " " + seconds + "s", { type: "whoosh", seconds, curve, colour });
            addSweep(SW + "/Whooshes/Whoosh In " + label + " " + seconds + "s", { type: "whoosh", seconds, curve: 1, colour: colour + 0.1, pitch: 12 });
        }
        for (const [label, seconds] of [["Short", 0.15], ["Mid", 0.3], ["Long", 0.6]]) {
            addSweep(SW + "/Lasers/Laser " + label + " " + seconds + "s", { type: "laser", seconds, tail: 0.1 });
            addSweep(SW + "/Lasers/Laser Echo " + label + " " + seconds + "s", { type: "laser", seconds: seconds * 2, tail: 0.55, pitch: 24 });
        }
        // ---- a few sweepers in every genre pack (Packs/<genre>/FX/Sweepers), voiced and timed for the genre
        const LOOP_BPM = new Map(FL_LOOP_GENRES.map(g => [g.name, g.bpm]));
        const GENRE_BPM = {
            "Breakcore": 170, "Underground UG": 145, "UK Drill": 142, "NY Drill": 140, "Rock": 120, "Indie": 115, "Webcore": 150, "Digicore": 155, "Rage": 150, "Plugg": 145,
            "Pluggnb": 140, "Emo Rap": 140, "Glitchcore": 160, "Nightcore": 170, "Metal": 160, "Punk": 170, "Grunge": 110, "Shoegaze": 100, "Bedroom Pop": 95, "Jazz": 120,
            "Neo Soul": 85, "Gospel": 80, "City Pop": 110, "K-Pop": 120, "Vaporwave": 90, "Chiptune": 140, "Gabber": 180, "Footwork": 160, "Baile Funk": 130, "Dancehall": 100,
            "Moombahton": 110, "Brazilian Phonk": 130, "Hard Techno": 150, "Trance": 138, "Big Room": 128, "Cinematic": 90, "Ambient": 80, "Witch House": 70, "Grime": 140,
            "Breakbeat": 136, "Electro": 128, "Memphis Rap": 130,
        };
        const BIG = new Set(["Trap", "House", "Deep House", "Tech House", "Techno", "Drum & Bass", "Jungle", "Dubstep", "Future Bass", "Hardstyle", "Trance", "Big Room", "Hard Techno", "Electro"]);
        const SOFT = new Set(["Lo-Fi", "Boom Bap", "R&B", "Jazz", "Neo Soul", "Gospel", "Bedroom Pop", "Ambient", "Vaporwave", "Shoegaze", "Indie", "City Pop", "Witch House", "Cinematic", "Deep House", "Disco & Funk", "Afrobeats", "Amapiano", "Synthwave"]);
        const HARD = new Set(["Hardstyle", "Gabber", "Hard Techno", "Big Room", "Dubstep", "Metal", "Punk", "Rage", "Breakcore", "Digicore", "Glitchcore", "Drum & Bass", "Jungle", "Grime"]);
        const RAP = new Set(["Trap", "Drill", "UK Drill", "NY Drill", "Phonk", "Brazilian Phonk", "Memphis Rap", "Rage", "Plugg", "Pluggnb", "Emo Rap", "Underground UG", "Jersey Club", "Footwork", "Baile Funk"]);
        const genres = (K.lib4 && K.lib4.genres) || [];
        for (const genre of genres) {
            const bpm = GENRE_BPM[genre] || LOOP_BPM.get(genre) || 120;
            const look = SOFT.has(genre) ? { colour: 0.38, intensity: 0.45, tail: 0.5 } : HARD.has(genre) ? { colour: 0.78, intensity: 0.88, res: 0.35 } : { colour: 0.6, intensity: 0.65 };
            const prefix = genre.replace(/ & /g, " ").replace(/[^A-Za-z0-9 ]/g, "");
            let set;
            if (BIG.has(genre)) {
                set = [["noise-riser", 16], ["uplifter", 8], ["snare-roll", 8], ["drop-build", 16, { gap: 1 }], ["reverse-cymbal", 2], ["downlifter", 8], ["impact", 4],
                    RAP.has(genre) ? ["sub-drop", 4] : ["whoosh", 4]];
            }
            else if (SOFT.has(genre))
                set = [["reverse-reverb", 4], ["downlifter", 4], ["tape-stop", 2]];
            else if (RAP.has(genre))
                set = [["noise-riser", 8], ["sub-drop", 4], ["reverse-cymbal", 2]];
            else if (HARD.has(genre))
                set = [["noise-riser", 8], ["downlifter", 4], ["impact", 4]];
            else
                set = [["noise-riser", 8], ["downlifter", 4], ["reverse-cymbal", 2]];
            set.forEach(([type, beats, mods], i) => {
                const def = FLSweepers.type(type).def;
                const spec = Object.assign({ type, beats, bpm }, def, look, mods || {});
                // a sub drop stays dark and a reverse swell keeps its long tail, whatever the genre
                if (type == "sub-drop")
                    spec.colour = def.colour;
                if (type == "reverse-reverb")
                    spec.tail = Math.max(spec.tail, def.tail);
                addSweep(PK + "/" + genre + "/FX/Sweepers/" + prefix + " " + FLSweepers.type(type).name + " " + beatsLabel(beats) + " " + pad2(i + 1), spec);
            });
        }

        // ---- Phonk FX (FL-style): its own folder, and a copy in the phonk genre packs
        {
            const C5 = 523.25, C2 = 65.41;
            const PH = [
                ["Cowbells/Phonk Cowbell", { kind: "cowbell", f: C5, decay: 0.28, drive: 1.5, len: 1.4 }, 72],
                ["Cowbells/Phonk Cowbell Driven", { kind: "cowbell", f: C5, decay: 0.32, drive: 5, len: 1.5 }, 72],
                ["Cowbells/Phonk Cowbell Lo-fi", { kind: "cowbell", f: C5, decay: 0.3, drive: 2, crush: 7, len: 1.4 }, 72],
                ["Cowbells/Phonk Cowbell Short", { kind: "cowbell", f: C5, decay: 0.12, drive: 2, len: 0.7 }, 72],
                ["Cowbells/Phonk Cowbell Long", { kind: "cowbell", f: C5, decay: 0.6, drive: 1, room: 0.25, len: 2.6 }, 72],
                ["Cowbells/Phonk Cowbell Low", { kind: "cowbell", f: C5 / 2, decay: 0.35, drive: 3, len: 1.6 }, 60],
                ["Risers/Cowbell Roll 2s", { kind: "cowroll", f: C5, rise: 7, drive: 2, len: 2 }],
                ["Risers/Cowbell Roll 4s", { kind: "cowroll", f: C5, rise: 12, drive: 2, len: 4 }],
                ["Car & Drift/Drift Pass", { kind: "drift", len: 3.2, seed: 1 }],
                ["Car & Drift/Drift Pass Long", { kind: "drift", len: 5, seed: 2, room: 0.15 }],
                ["Car & Drift/Drift Pass Lo-fi", { kind: "drift", len: 3.2, seed: 3, crush: 8 }],
                ["Sirens/Siren Two-Tone", { kind: "siren", len: 3 }],
                ["Sirens/Siren Wail", { kind: "siren", wail: 1, len: 3.4 }],
                ["Sirens/Siren Wail Echo", { kind: "siren", wail: 1, len: 3.4, room: 0.4, roomLen: 2 }],
                ["Hits/Phonk Shot", { kind: "shot", len: 1.6, room: 0.3, roomLen: 0.9 }],
                ["Hits/Phonk Shot Dry", { kind: "shot", len: 0.7 }],
                ["Hits/Phonk Shot Big Room", { kind: "shot", len: 2.6, room: 0.55, roomLen: 2 }],
                ["Textures/Radio Tuning", { kind: "radio", len: 2.5, seed: 1 }],
                ["Textures/Radio Tuning Long", { kind: "radio", len: 4.5, seed: 2 }],
                ["Textures/Cassette Rewind", { kind: "rewind", len: 1.6 }],
                ["Textures/Vinyl Crackle Bed", { kind: "crackle", len: 4, seed: 1 }],
                ["Textures/Vinyl Crackle Dusty", { kind: "crackle", len: 4, seed: 2, crush: 9 }],
                ["808 Slides/808 Slide Down Octave", { kind: "slide", f: C2, semi: -12, drive: 4, len: 1.8 }, 36],
                ["808 Slides/808 Slide Up Fifth", { kind: "slide", f: C2, semi: 7, drive: 4, len: 1.8 }, 36],
                ["808 Slides/808 Slide Down Fifth Blown", { kind: "slide", f: C2, semi: -5, drive: 10, len: 1.8 }, 36],
                ["808 Slides/808 Slide Up Octave", { kind: "slide", f: C2, semi: 12, drive: 5, len: 1.8 }, 36],
            ];
            for (const [name, params, root] of PH)
                flAdd(PK + "/Phonk FX/" + name, "phonk", params, root ? { rootKey: root } : {});
            const tempoFx = [["Tape Stop", "tape-stop", 2], ["Reverse Cymbal", "reverse-cymbal", 2], ["Sub Drop", "sub-drop", 4], ["Downlifter", "downlifter", 4]];
            for (const [name, type, beats] of tempoFx)
                addSweep(PK + "/Phonk FX/Transitions/Phonk " + name + " " + beatsLabel(beats) + " 130 BPM", { type, beats, bpm: 130, colour: 0.45, intensity: 0.7 });
            for (const genre of ["Phonk", "Brazilian Phonk", "Memphis Rap"]) {
                if (!genres.includes(genre) && genre != "Phonk")
                    continue;
                for (const [name, params, root] of PH.filter((_, i) => i % 2 == 0))
                    flAdd(PK + "/" + genre + "/FX/Phonk FX/" + name.split("/").pop(), "phonk", params, root ? { rootKey: root } : {});
            }
        }
    }
