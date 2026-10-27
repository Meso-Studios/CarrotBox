/*
 * Nebula - a granular synth for CarrotBox.
 *
 * Every note sprays a cloud of tiny grains read out of a source sound:
 *  - eight built-in sources (generated, nothing to download) or any sample
 *    (load, drop from the sound browser or your files)
 *  - position, spray, scan and freeze; grain size, density and jitter
 *  - per-grain pitch scatter, octave jumps and reverse grains, five grain windows
 *  - multimode filter, amp envelope, an LFO with four destinations, stereo width
 *    and an effect rack
 *
 * Instrument plugin: every note creates one voice (see createVoice/render).
 */
(function () {
    "use strict";
    const B = window.beepbox;
    if (!B || !B.CarrotPlugins) return;
    const A = B.CarrotAPI;
    const { HTML, CarrotUI, CarrotFX, CarrotDSP, CarrotADSR, CarrotSVF, CarrotDelayLine, FLSampleBank, carrotFxRack, carrotSyncOptions, carrotSyncBeats } = A;

    A.addStyle(`
.cb-window.cb-plugin-nebula { --cb-plugin-color: #9d7bff; }
.cb-plugin-nebula .cb-window-body { background: radial-gradient(ellipse at 20% 0%, #2a1f4d 0%, #14112a 55%, #0c0b18 100%) !important; color: #e4dcff; }
.cb-window.cb-plugin-nebula .cb-section { background: rgba(32, 26, 64, 0.72) !important; border: 1px solid #3c3270 !important; border-radius: 6px !important; box-shadow: 0 0 18px rgba(120, 90, 255, 0.08) inset; }
.cb-window.cb-plugin-nebula .cb-section-title { color: #b9a6ff !important; letter-spacing: 0.14em; text-transform: uppercase; font-size: 10px; font-weight: 800; }
.cb-plugin-nebula .cb-knob .cb-track { stroke: #191433; }
.cb-plugin-nebula .cb-knob .cb-arc { stroke: #a98bff; }
.cb-plugin-nebula .cb-knob .cb-dot { fill: #fff; }
.cb-plugin-nebula .cb-knob { width: 54px; }
.cb-plugin-nebula .cb-knob-label { text-transform: uppercase; font-size: 8.5px; color: #a99fd6; max-width: 62px; }
.cb-plugin-nebula .cb-window-body select, .cb-plugin-nebula .cb-window-body .cb-select { background: #120f26 !important; color: #ece6ff !important; border: 1px solid #4a3f86 !important; border-radius: 4px; }
.cb-plugin-nebula .cb-canvas { background: #07061a !important; border: 1px solid #3c3270; border-radius: 5px; }
.cb-plugin-nebula .cb-toggle.cb-on { background: #7c5cff; }
.cb-plugin-nebula .cb-row { justify-content: flex-start; flex-wrap: wrap; gap: 2px 4px; }
.cb-neb-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.cb-neb-logo { font-weight: 900; font-size: 18px; letter-spacing: 0.3em; background: linear-gradient(90deg, #7cf3ff, #a98bff 45%, #ff7ad9); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cb-neb-cloud { display: block; width: 100%; height: 150px; cursor: crosshair; touch-action: none; }
.cb-neb-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.cb-neb-wide { grid-column: span 2; }
.cb-neb-win { display: block; width: 100%; height: 34px; }
.cb-neb-status { font-size: 10.5px; color: #a99fd6; }
@media (max-width: 720px) { .cb-neb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`);

    const SUB = 32;
    const MAX_GRAINS = 64;
    const SOURCES = ["Glass Choir", "Shimmer Pad", "Bell Cloud", "Wind", "Vocal Ahh", "Felt Piano", "Strings", "Metal Drone"];
    const WINDOWS = ["Smooth (Hann)", "Flat (Tukey)", "Triangle", "Percussive", "Reverse swell"];
    const FILTERS = ["Off", "Low pass", "High pass", "Band pass"];
    const LFO_SHAPES = ["Sine", "Triangle", "Saw up", "Saw down", "Square", "Random"];

    function defaults() {
        return {
            src: { kind: 0, builtin: 1, id: null, name: "", root: 60 },
            pos: 0.35, spray: 0.08, scan: 0, freeze: false,
            size: 0.09, sizeRand: 0.2, density: 24, jitter: 0.4,
            pitchRand: 8, octProb: 0, octUp: 0.7, revProb: 0, window: 0, keyTrack: true, semi: 0, fine: 0,
            filter: { type: 1, cutoff: 9000, res: 0.1, key: 0.2 },
            amp: { a: 0.08, d: 0.6, s: 0.85, r: 0.8 },
            lfo: { rate: 0.4, shape: 0, sync: false, div: 9, toPos: 0, toSize: 0, toCutoff: 0, toDensity: 0 },
            vel: 0.5, level: 0.8, width: 0.55,
            fx: [],
        };
    }
    const clone = (x) => JSON.parse(JSON.stringify(x));
    function merge(target, source) {
        for (const key of Object.keys(source)) {
            const s = source[key];
            if (Array.isArray(s)) target[key] = clone(s);
            else if (s && typeof s == "object") target[key] = merge(target[key] && typeof target[key] == "object" ? target[key] : {}, s);
            else target[key] = s;
        }
        return target;
    }
    function fill(params) {
        const d = defaults();
        for (const key of Object.keys(d)) {
            if (params[key] === undefined || params[key] === null) params[key] = clone(d[key]);
            else if (d[key] && typeof d[key] == "object" && !Array.isArray(d[key])) {
                for (const k of Object.keys(d[key])) if (params[key][k] === undefined) params[key][k] = d[key][k];
            }
        }
        return params;
    }
    const make = (over) => merge(defaults(), over);

    // ------------------------------------------------------------ built-in sources (generated once, 4 s at 44.1 kHz, root C4)
    const SRC_RATE = 44100, SRC_LEN = SRC_RATE * 4, ROOT_HZ = 261.6256;
    const builtCache = [];
    function builtin(index) {
        if (builtCache[index]) return builtCache[index];
        const pcm = new Float32Array(SRC_LEN);
        const rnd = CarrotDSP.rng(1000 + index);
        const add = (ratio, amp, opts = {}) => {
            const det = opts.detune || 0;
            const decay = opts.decay || 0;
            const vib = opts.vib || 0;
            let ph = rnd();
            for (let i = 0; i < SRC_LEN; i++) {
                const t = i / SRC_RATE;
                const f = ROOT_HZ * ratio * (1 + det) * (1 + vib * Math.sin(2 * Math.PI * (4.8 + ratio * 0.03) * t));
                ph += f / SRC_RATE;
                let g = amp;
                if (decay) g *= Math.exp(-t / decay);
                if (opts.swell) g *= 0.5 - 0.5 * Math.cos(2 * Math.PI * Math.min(1, t / 4) * opts.swell);
                pcm[i] += Math.sin(2 * Math.PI * ph) * g;
            }
        };
        const formant = (f, centers) => centers.reduce((g, [c, w, a]) => g + a * Math.exp(-Math.pow(Math.log2(f / c) / w, 2)), 0.04);
        switch (index) {
            case 0: // glass choir: vowel morph over harmonics, two detuned layers
                for (const det of [-0.003, 0.0035]) for (let k = 1; k <= 30; k++) {
                    const f = k * ROOT_HZ;
                    add(k, 0.25 / Math.sqrt(k) * formant(f, [[700, 0.2, 1], [1200, 0.2, 0.6], [2800, 0.25, 0.35]]), { detune: det, vib: 0.002 });
                }
                break;
            case 1: // shimmer pad: detuned saw stack with octave sparkle
                for (const det of [-0.006, -0.002, 0.002, 0.0065]) for (let k = 1; k <= 40; k++) add(k, 0.16 / k * (k > 8 ? 0.6 : 1), { detune: det });
                for (let k = 1; k <= 6; k++) add(k * 2, 0.05 / k, { detune: 0.001, swell: 1 });
                break;
            case 2: // bell cloud: inharmonic partials, staggered strikes
                for (const [r, a, d] of [[1, 0.5, 3], [2.01, 0.3, 2], [2.76, 0.28, 1.6], [4.07, 0.2, 1.2], [5.43, 0.15, 0.9], [6.8, 0.1, 0.7], [8.21, 0.08, 0.5]]) add(r, a, { decay: d });
                break;
            case 3: { // wind: band-passed noise with a slow sweep
                const f = new CarrotSVF();
                for (let i = 0; i < SRC_LEN; i++) {
                    const t = i / SRC_RATE;
                    if ((i & 63) == 0) f.set(500 * Math.pow(6, 0.5 + 0.5 * Math.sin(t * 1.3) * Math.sin(t * 0.41)), 0.6, SRC_RATE);
                    pcm[i] = f.process(rnd() * 2 - 1, 2) * 1.4;
                }
                break;
            }
            case 4: // vocal ahh
                for (let k = 1; k <= 36; k++) {
                    const f = k * ROOT_HZ;
                    add(k, 0.4 / Math.sqrt(k) * formant(f, [[780, 0.15, 1], [1150, 0.15, 0.55], [2600, 0.2, 0.3], [3300, 0.2, 0.15]]), { vib: 0.004 });
                }
                break;
            case 5: // felt piano: soft hammer, decaying harmonics, a strike every second
                for (let n = 0; n < 4; n++) {
                    const off = n * SRC_RATE;
                    for (let k = 1; k <= 16; k++) {
                        const ratio = k * (1 + 0.0004 * k * k);
                        let ph = 0;
                        const amp = 0.3 / Math.pow(k, 1.4), dec = 1.6 / (1 + k * 0.35);
                        for (let i = off; i < SRC_LEN; i++) {
                            const t = (i - off) / SRC_RATE;
                            ph += ROOT_HZ * ratio / SRC_RATE;
                            pcm[i] += Math.sin(2 * Math.PI * ph) * amp * Math.exp(-t / dec) * Math.min(1, t * 400);
                        }
                    }
                }
                break;
            case 6: // strings: bowed saw ensemble with vibrato
                for (const det of [-0.004, 0, 0.0042]) for (let k = 1; k <= 30; k++) add(k, 0.2 / k * (1 + 0.6 * Math.exp(-Math.pow(Math.log2(k * ROOT_HZ / 2800), 2) / 0.3)), { detune: det, vib: 0.003 });
                break;
            case 7: // metal drone: clustered inharmonic partials beating against each other
                for (const r of [0.5, 1, 1.003, 1.49, 2.24, 2.252, 3.17, 4.5, 6.33]) add(r, 0.18 / Math.sqrt(r), { swell: 2 });
                break;
        }
        let peak = 1e-9;
        for (let i = 0; i < SRC_LEN; i++) peak = Math.max(peak, Math.abs(pcm[i]));
        for (let i = 0; i < SRC_LEN; i++) pcm[i] *= 0.9 / peak;
        // fade the edges so grains near them don't click
        for (let i = 0; i < 2000; i++) { const g = i / 2000; pcm[i] *= g; pcm[SRC_LEN - 1 - i] *= g; }
        return (builtCache[index] = { pcm, rate: SRC_RATE, root: 60 });
    }
    // {pcm, rate, root} for the current source, or null while a sample loads.
    function source(p) {
        if (p.src.kind == 1 && p.src.id) {
            const entry = FLSampleBank.request(p.src.id);
            if (entry && entry.status == "ready" && entry.pcm && entry.pcm.length > 64) return { pcm: entry.pcm, rate: entry.rate, root: p.src.root };
            return null;
        }
        return builtin(Math.max(0, Math.min(SOURCES.length - 1, p.src.builtin | 0)));
    }

    // ------------------------------------------------------------ grain windows (x in 0..1)
    function windowAt(type, x) {
        switch (type) {
            case 1: return x < 0.25 ? 0.5 - 0.5 * Math.cos(Math.PI * x / 0.25) : x > 0.75 ? 0.5 - 0.5 * Math.cos(Math.PI * (1 - x) / 0.25) : 1;
            case 2: return 1 - Math.abs(2 * x - 1);
            case 3: return x < 0.04 ? x / 0.04 : Math.exp(-(x - 0.04) * 5) * (1 - Math.pow(x, 8));
            case 4: return x > 0.96 ? (1 - x) / 0.04 : Math.exp(-(0.96 - x) * 5) * (1 - Math.pow(1 - x, 8));
        }
        return 0.5 - 0.5 * Math.cos(2 * Math.PI * x);
    }

    // window lookup tables, read per sample
    const WIN_N = 1024;
    const WIN_TABLES = WINDOWS.map((_, t) => { const tab = new Float32Array(WIN_N + 1); for (let i = 0; i <= WIN_N; i++) tab[i] = windowAt(t, i / WIN_N); return tab; });

    // ------------------------------------------------------------ voice
    function createVoice(params, info) {
        const p = fill(params);
        const sr = info.sampleRate;
        const voice = {
            sr, age: 0, done: false, released: false,
            grains: [], active: [], next: 0, scan: 0, lfoPh: 0, hold: 0,
            amp: new CarrotADSR(), filt: new CarrotSVF(),
            rnd: CarrotDSP.rng(((info.midi | 0) * 131 + Math.floor(Math.random() * 1e6)) >>> 0),
            velocity: info.velocity == undefined ? 1 : info.velocity,
            glide: 0,
        };
        for (let i = 0; i < MAX_GRAINS; i++) voice.grains.push({ on: false, pos: 0, inc: 0, len: 1, age: 0, gain: 0 });
        voice.amp.set(p.amp.a, p.amp.d, p.amp.s, p.amp.r, sr);
        voice.amp.trigger();
        return voice;
    }
    function spawn(voice, p, src, sr, f0, lfo) {
        if (voice.active.length >= MAX_GRAINS) return;
        const g = voice.grains.find(x => !x.on);
        if (!g) return;
        voice.active.push(g);
        const r = voice.rnd;
        const n = src.pcm.length;
        const sizeS = Math.max(0.004, Math.min(2, p.size * Math.pow(2, lfo * p.lfo.toSize * 2) * (1 + (r() * 2 - 1) * p.sizeRand * 0.8)));
        let cents = (r() * 2 - 1) * p.pitchRand;
        if (p.octProb > 0 && r() < p.octProb) cents += r() < p.octUp ? 1200 : -1200;
        const keyRatio = p.keyTrack ? f0 / (440 * Math.pow(2, (src.root - 69) / 12)) : Math.pow(2, (p.semi + p.fine / 100) / 12);
        const rate = (src.rate / sr) * keyRatio * Math.pow(2, cents / 1200);
        const reverse = p.revProb > 0 && r() < p.revProb;
        let center = p.pos + lfo * p.lfo.toPos * 0.5 + voice.scan + (r() * 2 - 1) * p.spray;
        center -= Math.floor(center);
        const lenOut = Math.max(16, Math.floor(sizeS * sr));
        const span = lenOut * rate;
        let start = center * n - (reverse ? -span / 2 : span / 2);
        start = Math.max(1, Math.min(n - 2, start));
        g.on = true;
        g.pos = start;
        g.inc = reverse ? -rate : rate;
        g.len = lenOut;
        g.age = 0;
        g.win = WIN_TABLES[Math.max(0, Math.min(WINDOWS.length - 1, p.window | 0))];
        g.wstep = WIN_N / lenOut;
        g.gain = 0.75 + r() * 0.25;
    }
    function render(voice, out, start, len, info) {
        const p = fill(info.params);
        const sr = info.sampleRate;
        if (!info.gate && !voice.released) { voice.released = true; voice.amp.release(); }
        voice.amp.set(p.amp.a, p.amp.d, p.amp.s, p.amp.r, sr);
        const src = source(p);
        if (!src) { voice.age += len; if (voice.released) voice.done = true; return; }
        const pcm = src.pcm, n = pcm.length;
        const bpm = info.bpm || 120;
        let f0 = info.freq * Math.pow(2, (p.keyTrack ? p.semi + p.fine / 100 : 0) / 12);
        const freqStep = Math.pow(info.freqScale || 1, SUB);
        const velAmp = 1 - p.vel + p.vel * voice.velocity;
        const keyOct = p.filter.key * ((info.midi | 0) - 60) / 12;
        let i = start;
        const end = start + len;
        while (i < end) {
            const m = Math.min(SUB, end - i);
            // LFO (control rate)
            const l = p.lfo;
            const hz = l.sync ? (bpm / 60) / carrotSyncBeats(l.div | 0) : l.rate;
            voice.lfoPh += hz * m / sr;
            if (voice.lfoPh >= 1) { voice.lfoPh -= Math.floor(voice.lfoPh); voice.hold = voice.rnd() * 2 - 1; }
            const lfo = (l.shape | 0) == 5 ? voice.hold : CarrotDSP.lfo(l.shape | 0, voice.lfoPh);
            // scan moves the read position through the source (in source lengths per second)
            if (!p.freeze && p.scan) voice.scan += p.scan * m / sr * (src.rate * 1) / Math.max(1, n);
            // density and grain gain: overlapping grains add up, so the level is kept steady
            const density = Math.max(0.5, Math.min(400, p.density * Math.pow(2, lfo * l.toDensity * 2)));
            const overlap = Math.max(1, density * p.size);
            const norm = 1.9 / Math.sqrt(overlap);
            const active = voice.active;
            const type = p.filter.type | 0;
            if (type) voice.filt.set(Math.max(20, Math.min(sr * 0.45, p.filter.cutoff * Math.pow(2, keyOct + lfo * l.toCutoff * 4))), p.filter.res, sr);
            for (let j = 0; j < m; j++) {
                if (--voice.next <= 0 && !(voice.released && voice.amp.done)) {
                    spawn(voice, p, src, sr, f0, lfo);
                    const period = sr / density;
                    voice.next = Math.max(1, period * (1 + (voice.rnd() * 2 - 1) * p.jitter * 0.9));
                }
                let s = 0;
                for (let a = active.length - 1; a >= 0; a--) {
                    const g = active[a];
                    const k = g.pos | 0;
                    if (k < 0 || k >= n - 1 || g.age >= g.len) { g.on = false; active[a] = active[active.length - 1]; active.pop(); continue; }
                    s += (pcm[k] + (pcm[k + 1] - pcm[k]) * (g.pos - k)) * g.win[(g.age * g.wstep) | 0] * g.gain;
                    g.pos += g.inc;
                    g.age++;
                }
                s *= norm;
                if (type) s = voice.filt.process(s, type - 1);
                out[i + j] += s * voice.amp.next() * velAmp * p.level;
            }
            voice.age += m;
            f0 *= freqStep;
            i += m;
        }
        if (voice.released && voice.amp.done && voice.active.length == 0) voice.done = true;
    }

    // ------------------------------------------------------------ instrument effects
    function createInstrumentState(sampleRate) {
        return { fxStates: [], dl: new CarrotDelayLine(Math.ceil(sampleRate * 0.05)), dr: new CarrotDelayLine(Math.ceil(sampleRate * 0.05)), phase: 0 };
    }
    function processInstrument(state, params, L, R, start, end, ctx) {
        const p = fill(params);
        const w = p.width;
        if (w > 0.001) {
            const sr = ctx.sampleRate;
            const inc = 0.21 / sr;
            let phase = state.phase;
            for (let i = start; i < end; i++) {
                const mono = (L[i] + R[i]) * 0.5;
                state.dl.write(mono);
                state.dr.write(mono);
                const lfo = Math.sin(phase * 6.283185307179586);
                const wl = state.dl.read(sr * (0.0093 + 0.0017 * lfo));
                const wr = state.dr.read(sr * (0.0151 - 0.0019 * lfo));
                L[i] = L[i] * (1 - w * 0.5) + wl * w * 0.6 - wr * w * 0.12;
                R[i] = R[i] * (1 - w * 0.5) + wr * w * 0.6 - wl * w * 0.12;
                phase += inc; if (phase >= 1) phase -= 1;
            }
            state.phase = phase;
        }
        if (p.fx.length > 0) CarrotFX.processChain(state.fxStates, p.fx, L, R, start, end, ctx);
    }

    // ------------------------------------------------------------ presets
    const verb = (mix) => Object.assign(CarrotFX.defaults("reverb"), mix == undefined ? {} : { mix });
    const delay = (mix) => Object.assign(CarrotFX.defaults("delay"), mix == undefined ? {} : { mix });
    const PRESETS = [
        { group: "Pads", name: "Nebula Pad", params: make({ src: { builtin: 1 }, pos: 0.4, spray: 0.1, size: 0.12, density: 30, pitchRand: 6, amp: { a: 0.6, d: 1, s: 0.9, r: 1.6 }, fx: [verb()] }) },
        { group: "Pads", name: "Glass Cathedral", params: make({ src: { builtin: 0 }, pos: 0.3, spray: 0.2, size: 0.2, density: 22, octProb: 0.15, octUp: 1, amp: { a: 0.9, d: 1, s: 0.9, r: 2.2 }, width: 0.8, fx: [verb(0.45)] }) },
        { group: "Pads", name: "Frozen Strings", params: make({ src: { builtin: 6 }, pos: 0.5, freeze: true, spray: 0.03, size: 0.15, density: 28, pitchRand: 4, amp: { a: 0.4, d: 1, s: 0.95, r: 1.2 }, fx: [verb(0.3)] }) },
        { group: "Pads", name: "Choir Drift", params: make({ src: { builtin: 4 }, pos: 0.2, scan: 0.08, spray: 0.06, size: 0.18, density: 20, pitchRand: 10, lfo: { rate: 0.15, toCutoff: 0.3 }, amp: { a: 0.7, d: 1, s: 0.9, r: 1.8 }, fx: [verb()] }) },
        { group: "Textures", name: "Bell Dust", params: make({ src: { builtin: 2 }, pos: 0.05, spray: 0.25, size: 0.05, density: 40, jitter: 0.9, pitchRand: 0, octProb: 0.3, window: 3, amp: { a: 0.01, d: 1, s: 0.8, r: 1.5 }, fx: [delay(0.25), verb(0.4)] }) },
        { group: "Textures", name: "Wind Tunnel", params: make({ src: { builtin: 3 }, keyTrack: true, pos: 0.5, spray: 0.4, size: 0.25, density: 18, filter: { type: 3, cutoff: 1400, res: 0.5, key: 0.8 }, lfo: { rate: 0.2, toCutoff: 0.5 }, amp: { a: 0.8, d: 1, s: 1, r: 2 } }) },
        { group: "Textures", name: "Metal Swarm", params: make({ src: { builtin: 7 }, pos: 0.6, spray: 0.3, size: 0.03, density: 90, jitter: 1, pitchRand: 30, revProb: 0.3, window: 2, amp: { a: 0.3, d: 1, s: 0.9, r: 1 }, width: 0.8, fx: [verb(0.35)] }) },
        { group: "Textures", name: "Reverse Halo", params: make({ src: { builtin: 0 }, pos: 0.45, spray: 0.15, size: 0.35, density: 10, revProb: 0.8, window: 4, amp: { a: 0.5, d: 1, s: 0.9, r: 1.5 }, fx: [verb(0.5)] }) },
        { group: "Keys", name: "Grain Piano", params: make({ src: { builtin: 5 }, pos: 0.01, spray: 0.005, size: 0.14, density: 35, pitchRand: 3, window: 1, scan: 0.25, amp: { a: 0.003, d: 1.6, s: 0.2, r: 0.6 }, vel: 0.8, fx: [verb(0.25)] }) },
        { group: "Keys", name: "Music Box Cloud", params: make({ src: { builtin: 2 }, pos: 0.02, spray: 0.02, size: 0.06, density: 26, octProb: 0.5, octUp: 1, window: 3, amp: { a: 0.002, d: 1.2, s: 0, r: 0.8 }, fx: [delay(0.3), verb(0.3)] }) },
        { group: "Leads", name: "Granular Vox Lead", params: make({ src: { builtin: 4 }, pos: 0.4, spray: 0.02, size: 0.07, density: 60, pitchRand: 3, amp: { a: 0.02, d: 0.4, s: 0.9, r: 0.3 }, width: 0.3, fx: [delay(0.2)] }) },
        { group: "Leads", name: "Stutter Lead", params: make({ src: { builtin: 1 }, pos: 0.3, size: 0.04, density: 8, jitter: 0, window: 3, lfo: { sync: true, div: 7, toDensity: 0.5 }, amp: { a: 0.005, d: 0.3, s: 0.8, r: 0.2 }, fx: [delay(0.25)] }) },
        { group: "Bass", name: "Grain Bass", params: make({ src: { builtin: 6 }, pos: 0.5, spray: 0.01, size: 0.09, density: 45, pitchRand: 0, filter: { type: 1, cutoff: 900, res: 0.2, key: 0.3 }, amp: { a: 0.005, d: 0.5, s: 0.8, r: 0.15 }, width: 0.1 }) },
        { group: "FX", name: "Rising Nebula", params: make({ src: { builtin: 7 }, scan: 0.2, spray: 0.3, size: 0.1, density: 30, pitchRand: 40, lfo: { rate: 0.12, shape: 2, toDensity: 0.8, toCutoff: 0.6 }, amp: { a: 3, d: 1, s: 1, r: 2 }, width: 0.9, fx: [verb(0.5)] }) },
        { group: "FX", name: "Glitch Spray", params: make({ src: { builtin: 3 }, spray: 0.5, size: 0.015, density: 70, jitter: 1, pitchRand: 300, revProb: 0.5, window: 2, amp: { a: 0.01, d: 0.3, s: 0.7, r: 0.3 }, fx: [delay(0.3)] }) },
        { group: "FX", name: "Ghost Hum", params: make({ src: { builtin: 4 }, keyTrack: true, pos: 0.7, spray: 0.3, size: 0.4, density: 6, pitchRand: 15, window: 0, filter: { type: 1, cutoff: 2000 }, amp: { a: 1.5, d: 1, s: 1, r: 3 }, fx: [verb(0.6)] }) },
    ];
    function randomize() {
        const r = Math.random;
        const pick = (list) => list[Math.floor(r() * list.length)];
        const p = defaults();
        p.src.builtin = Math.floor(r() * SOURCES.length);
        p.pos = +r().toFixed(2);
        p.spray = +(r() * r() * 0.4).toFixed(3);
        p.scan = r() < 0.3 ? +((r() - 0.3) * 0.3).toFixed(2) : 0;
        p.size = +(0.02 + r() * r() * 0.35).toFixed(3);
        p.density = Math.round(6 + r() * 60);
        p.jitter = +r().toFixed(2);
        p.pitchRand = r() < 0.6 ? Math.round(r() * 20) : Math.round(r() * 200);
        p.octProb = r() < 0.25 ? +(r() * 0.4).toFixed(2) : 0;
        p.revProb = r() < 0.3 ? +(r() * 0.6).toFixed(2) : 0;
        p.window = pick([0, 0, 1, 2, 3, 4]);
        p.filter.type = pick([0, 1, 1, 2, 3]);
        p.filter.cutoff = Math.round(500 * Math.pow(30, r()));
        p.amp = r() < 0.5 ? { a: +(0.2 + r()).toFixed(2), d: 1, s: 0.9, r: +(0.6 + r() * 2).toFixed(2) } : { a: 0.005, d: +(0.3 + r()).toFixed(2), s: +(r() * 0.8).toFixed(2), r: +(0.2 + r()).toFixed(2) };
        if (r() < 0.4) Object.assign(p.lfo, { rate: +(0.05 + r() * 2).toFixed(2), toPos: +(r() * 0.4).toFixed(2), toCutoff: +(r() * 0.4).toFixed(2) });
        p.width = +(0.3 + r() * 0.6).toFixed(2);
        p.fx = [verb(+(0.2 + r() * 0.3).toFixed(2))];
        return p;
    }

    // ------------------------------------------------------------ editor
    function buildEditor(host) {
        const P = () => fill(host.params());
        P();
        const root = HTML.div({ class: "cb-neb-panel" });
        const pct = (v) => Math.round(v * 100) + "%";
        const redraws = [];
        const redraw = () => redraws.forEach(f => f());
        const k = (path, spec) => host.knob(path, Object.assign({ small: true, onInput: redraw }, spec));

        // ---- cloud view: waveform, read region and drifting grains
        const cloud = HTML.canvas({ class: "cb-canvas cb-neb-cloud", title: "Drag to move the grain position. Drop a sample here to use it." });
        const stars = [];
        let peaks = null, peaksKey = "";
        let lastT = performance.now();
        const peaksFor = (src, w) => {
            const key = (src ? src.pcm.length + ":" + src.pcm[Math.floor(src.pcm.length / 3)] : "none") + ":" + w;
            if (key == peaksKey) return peaks;
            peaksKey = key;
            if (!src) return (peaks = null);
            peaks = new Float32Array(w);
            const n = src.pcm.length, step = n / w;
            for (let x = 0; x < w; x++) {
                let m = 0;
                for (let i = Math.floor(x * step), e = Math.min(n, Math.floor((x + 1) * step)); i < e; i += 4) m = Math.max(m, Math.abs(src.pcm[i]));
                peaks[x] = m;
            }
            return peaks;
        };
        const paintCloud = () => {
            if (!cloud.isConnected) return;
            const p = P();
            const { ctx, w, h } = CarrotUI.ctx(cloud);
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, "#0b0920"); g.addColorStop(1, "#05040f");
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
            const src = source(p);
            const pk = peaksFor(src, Math.floor(w));
            if (pk) {
                ctx.fillStyle = "rgba(124, 92, 255, 0.35)";
                for (let x = 0; x < pk.length; x++) { const a = pk[x] * (h * 0.42); ctx.fillRect(x, h / 2 - a, 1, a * 2); }
            }
            else {
                ctx.fillStyle = "#a99fd6"; ctx.font = "12px sans-serif";
                ctx.fillText(p.src.kind == 1 ? "Loading sample..." : "", 10, 20);
            }
            // read region (position +/- spray)
            const x0 = (p.pos - p.spray) * w, x1 = (p.pos + p.spray) * w;
            const rg = ctx.createLinearGradient(x0, 0, x1, 0);
            rg.addColorStop(0, "rgba(124,243,255,0)"); rg.addColorStop(0.5, "rgba(124,243,255,0.22)"); rg.addColorStop(1, "rgba(124,243,255,0)");
            ctx.fillStyle = rg;
            ctx.fillRect(Math.min(x0, x1 - 2), 0, Math.max(2, x1 - x0), h);
            ctx.strokeStyle = "#7cf3ff"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(p.pos * w, 0); ctx.lineTo(p.pos * w, h); ctx.stroke();
            // drifting grains: a picture of the cloud (density, size and spray), not the audio itself
            const now = performance.now();
            const dt = Math.min(0.1, (now - lastT) / 1000);
            lastT = now;
            const want = Math.min(4, p.density * dt * 0.6);
            for (let n = 0; n < want || Math.random() < want - n; n++) {
                const c = p.pos + (Math.random() * 2 - 1) * p.spray;
                stars.push({ x: (c - Math.floor(c)) * w, y: h / 2 + (Math.random() * 2 - 1) * h * 0.3, life: 0, max: Math.max(0.15, p.size * 6), r: 1.5 + Math.min(8, p.size * 40), hue: 250 + (Math.random() * 2 - 1) * (30 + p.pitchRand * 0.2), rev: Math.random() < p.revProb });
            }
            for (let s = stars.length - 1; s >= 0; s--) {
                const st = stars[s];
                st.life += dt;
                if (st.life > st.max || stars.length > 220) { stars.splice(s, 1); continue; }
                const a = Math.sin(Math.PI * st.life / st.max);
                st.y -= dt * 14 * (st.rev ? -1 : 1);
                const gr = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, st.r * 2.4);
                gr.addColorStop(0, "hsla(" + st.hue + ", 100%, 82%, " + (0.9 * a) + ")");
                gr.addColorStop(1, "hsla(" + st.hue + ", 100%, 60%, 0)");
                ctx.fillStyle = gr;
                ctx.beginPath(); ctx.arc(st.x, st.y, st.r * 2.4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = "#a99fd6"; ctx.font = "10px sans-serif";
            ctx.fillText((p.src.kind == 1 ? (p.src.name || "sample") : SOURCES[p.src.builtin | 0]) + "  |  " + Math.round(p.density) + " grains/s  |  " + Math.round(p.size * 1000) + " ms", 8, h - 7);
        };
        let raf = 0;
        const loop = () => { if (!root.isConnected && raf) { raf = 0; return; } paintCloud(); raf = requestAnimationFrame(loop); };
        setTimeout(() => { raf = requestAnimationFrame(loop); }, 30);
        let dragging = false;
        const setPos = (e) => {
            const rect = cloud.getBoundingClientRect();
            P().pos = +Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)).toFixed(4);
            host.changed(false);
            host.refresh();
        };
        cloud.addEventListener("pointerdown", (e) => { dragging = true; cloud.setPointerCapture(e.pointerId); setPos(e); });
        cloud.addEventListener("pointermove", (e) => { if (dragging) setPos(e); });
        cloud.addEventListener("pointerup", () => { if (dragging) { dragging = false; host.commitNow(); } });

        // ---- source
        const status = HTML.div({ class: "cb-neb-status" });
        const showStatus = () => {
            const p = P();
            status.textContent = p.src.kind == 1 ? "Sample: " + (p.src.name || FLSampleBank.getName(p.src.id)) + " (root " + p.src.root + ")" : "Built-in source: " + SOURCES[p.src.builtin | 0];
        };
        redraws.push(showStatus);
        const useSample = async (picked) => {
            if (!picked) return;
            const entry = await FLSampleBank.whenReady(picked.id);
            if (!entry || entry.status != "ready" || !entry.pcm) { host.toast("Couldn't read that file."); return; }
            let root = entry.rootKey != null ? entry.rootKey : 60;
            if (entry.rootKey == null) {
                const hz = CarrotDSP.detectPitch(entry.pcm, entry.rate, Math.min(Math.max(0, entry.pcm.length - 4097), Math.floor(entry.pcm.length * 0.2)), 4096);
                if (hz) root = Math.round(69 + 12 * Math.log2(hz / 440));
            }
            const p = P();
            p.src = { kind: 1, builtin: p.src.builtin, id: picked.id, name: picked.name || FLSampleBank.getName(picked.id), root: Math.max(0, Math.min(127, root)) };
            host.changed(true);
            host.refresh();
            redraw();
            host.toast("Nebula now grains " + p.src.name);
        };
        host.acceptSampleDrops(cloud, useSample);
        const builtinSel = CarrotUI.select({ label: "Built-in", options: SOURCES, value: P().src.builtin | 0, onChange: (v) => { const p = P(); p.src.kind = 0; p.src.builtin = v; host.changed(true); redraw(); } });
        builtinSel.setValue = (v) => { if (builtinSel.menu) builtinSel.menu.selectedIndex = v; };
        host._bind(builtinSel, "src.builtin", 1);
        const srcSec = CarrotUI.section("Source",
            CarrotUI.row(builtinSel, CarrotUI.button("Load sample...", async () => useSample(await host.pickAudioFile()), { primary: true, title: "Use any sound (longer, evolving sounds make the best clouds)" })),
            CarrotUI.row(host.knob("src.root", { label: "Root key", min: 0, max: 127, step: 1, def: 60, small: true, format: v => ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][v % 12] + (Math.floor(v / 12) - 1), title: "The pitch of the sample (built-ins are C4)" }),
                host.toggle("keyTrack", { label: "Key track", def: true, title: "Off: every key plays the source at its own pitch (textures, drones)" }),
                k("semi", { label: "Semi", min: -24, max: 24, step: 1, def: 0 }), k("fine", { label: "Fine", min: -100, max: 100, step: 1, def: 0, unit: "c" })),
            status);
        const cloudSec = CarrotUI.section("Cloud", cloud,
            CarrotUI.row(k("pos", { label: "Position", min: 0, max: 1, def: 0.35, format: pct }), k("spray", { label: "Spray", min: 0, max: 0.5, def: 0.08, format: pct, title: "Random spread around the position" }),
                k("scan", { label: "Scan", min: -1, max: 1, def: 0, format: v => (v > 0 ? "+" : "") + v.toFixed(2) + "x", title: "Moves the position through the source while a note plays (1x = real time)" }),
                host.toggle("freeze", { label: "Freeze", def: false, title: "Stop the scan" }),
                k("size", { label: "Grain size", min: 0.005, max: 1, curve: "exp", def: 0.09, unit: "s" }), k("sizeRand", { label: "Size rand", min: 0, max: 1, def: 0.2, format: pct }),
                k("density", { label: "Density", min: 1, max: 200, curve: "exp", def: 24, format: v => Math.round(v) + "/s" }), k("jitter", { label: "Jitter", min: 0, max: 1, def: 0.4, format: pct, title: "0 = grains on a steady clock, 100% = random timing" })));
        cloudSec.classList.add("cb-neb-wide");
        cloudSec.style.gridRow = "span 2";

        const winCanvas = HTML.canvas({ class: "cb-canvas cb-neb-win" });
        redraws.push(() => {
            const { ctx, w, h } = CarrotUI.ctx(winCanvas);
            ctx.fillStyle = "#07061a"; ctx.fillRect(0, 0, w, h);
            ctx.beginPath();
            for (let x = 0; x <= w; x++) { const y = h - 3 - windowAt(P().window | 0, x / w) * (h - 6); if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
            ctx.strokeStyle = "#7cf3ff"; ctx.lineWidth = 1.5; ctx.stroke();
        });
        const grainSec = CarrotUI.section("Grains",
            CarrotUI.row(k("pitchRand", { label: "Pitch scatter", min: 0, max: 1200, curve: "exp", def: 8, unit: "c" }), k("octProb", { label: "Octave jumps", min: 0, max: 1, def: 0, format: pct }), k("octUp", { label: "Jumps up", min: 0, max: 1, def: 0.7, format: pct, title: "Share of octave jumps that go up (the rest go down)" }), k("revProb", { label: "Reverse", min: 0, max: 1, def: 0, format: pct, title: "Chance that a grain plays backwards" })),
            host.select("window", { label: "Window", options: WINDOWS, def: 0, onChange: redraw }), winCanvas);
        const filterSec = CarrotUI.section("Filter",
            CarrotUI.row(host.select("filter.type", { label: "Type", options: FILTERS, def: 1 }), k("filter.cutoff", { label: "Cutoff", min: 20, max: 20000, curve: "exp", unit: "Hz", def: 9000 }), k("filter.res", { label: "Resonance", min: 0, max: 1, def: 0.1, format: pct }), k("filter.key", { label: "Key track", min: 0, max: 1, def: 0.2, format: pct })));
        const lfoSec = CarrotUI.section("LFO",
            CarrotUI.row(host.select("lfo.shape", { label: "Shape", options: LFO_SHAPES, def: 0 }), k("lfo.rate", { label: "Rate", min: 0.02, max: 20, curve: "exp", format: v => (v < 10 ? v.toFixed(2) : v.toFixed(1)) + " Hz", def: 0.4 }), host.toggle("lfo.sync", { label: "Sync", def: false }), host.select("lfo.div", { label: "Sync rate", options: carrotSyncOptions(), def: 9 })),
            CarrotUI.row(k("lfo.toPos", { label: "> Position", min: -1, max: 1, def: 0, format: pct }), k("lfo.toSize", { label: "> Size", min: -1, max: 1, def: 0, format: pct }), k("lfo.toCutoff", { label: "> Cutoff", min: -1, max: 1, def: 0, format: pct }), k("lfo.toDensity", { label: "> Density", min: -1, max: 1, def: 0, format: pct })));
        const ampSec = CarrotUI.section("Amp envelope", host.envelope("amp", { value: { a: 0.08, d: 0.6, s: 0.85, r: 0.8 }, label: "Amp envelope" }),
            CarrotUI.row(k("level", { label: "Volume", min: 0, max: 1.5, def: 0.8, format: pct }), k("vel", { label: "Velocity", min: 0, max: 1, def: 0.5, format: pct }), k("width", { label: "Width", min: 0, max: 1, def: 0.55, format: pct })));

        root.append(
            HTML.div({ class: "cb-neb-head" }, HTML.span({ class: "cb-neb-logo" }, "NEBULA"), HTML.span({ class: "cb-neb-status" }, "granular synth")),
            HTML.div({ class: "cb-neb-grid" }, cloudSec, srcSec, grainSec, filterSec, lfoSec, ampSec),
            CarrotUI.section("Effects", carrotFxRack(host, "fx", { max: 6 })));
        host.onRefresh(redraw);
        setTimeout(redraw, 30);
        return root;
    }

    B.CarrotPlugins.register({
        id: "nebula",
        width: 860,
        defaultParams: defaults,
        presets: PRESETS,
        randomize,
        createVoice,
        render,
        createInstrumentState,
        processInstrument,
        buildEditor,
    });
})();
