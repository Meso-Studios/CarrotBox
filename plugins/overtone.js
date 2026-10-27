/*
 * Overtone - an additive / resynthesis synth for CarrotBox (Harmor-style).
 *
 * Every note is a stack of harmonics. Each module edits the harmonic
 * amplitudes, not the waveform, so filters, phasers and plucks are exact
 * and never alias:
 *
 *  - Timbre: two spectra (saw, square, choir, organ, user drawn, resynthesized
 *    from a sample, ...) with a mix between them
 *  - Harmonizer (harmonic clones), Prism (stretched, inharmonic partials)
 *  - two spectral filters (low/high/band pass, notch, comb, vowel) in series or parallel
 *  - Phaser (moving notches across the spectrum), Pluck (high harmonics die first),
 *    Blur (per-harmonic smear), Tremolo (harmonic shimmer)
 *  - Unison, glide, vibrato, amp envelope
 *  - a graph editor: every target has a drawable envelope and an LFO
 *  - two parts (A and B), each a full synth, with a balance between them
 *
 * Instrument plugin: every note creates one voice (see createVoice/render).
 * The spectrum is turned into a single-cycle table with an inverse FFT every
 * CONTROL samples and crossfaded, so the cost hardly depends on harmonic count.
 */
(function () {
    "use strict";
    const B = window.beepbox;
    if (!B || !B.CarrotPlugins) return;
    const A = B.CarrotAPI;
    const { HTML, CarrotUI, CarrotFX, CarrotDSP, CarrotADSR, CarrotDelayLine, FLSampleBank, carrotFxRack, carrotSyncOptions, carrotSyncBeats } = A;

    A.addStyle(`
.cb-window.cb-plugin-overtone { --cb-plugin-color: #e53935; }
.cb-plugin-overtone .cb-window-body { background: #231c1d !important; color: #eadede; }
.cb-window.cb-plugin-overtone .cb-section { background: #2f2526 !important; border: 1px solid #4a3133 !important; border-top: 3px solid #e53935 !important; border-radius: 3px !important; padding: 5px 6px 6px !important; }
.cb-window.cb-plugin-overtone .cb-section-title { color: #ff6f6a !important; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; font-size: 10px; }
.cb-plugin-overtone .cb-knob .cb-track { stroke: #170f10; }
.cb-plugin-overtone .cb-knob .cb-arc { stroke: #ff3d33; }
.cb-plugin-overtone .cb-knob .cb-dot { fill: #fff; }
.cb-plugin-overtone .cb-knob { width: 52px; }
.cb-plugin-overtone .cb-knob-label { text-transform: uppercase; font-size: 8.5px; color: #c9a9a8; max-width: 60px; }
.cb-plugin-overtone .cb-window-body select, .cb-plugin-overtone .cb-window-body .cb-select { background: #170f10 !important; color: #f3e6e6 !important; border: 1px solid #5c3a3c !important; border-radius: 3px; }
.cb-plugin-overtone .cb-canvas { background: #120b0c !important; border: 1px solid #5c3a3c; border-radius: 3px; }
.cb-plugin-overtone .cb-toggle.cb-on { background: #e53935; }
.cb-plugin-overtone .cb-row { justify-content: flex-start; flex-wrap: wrap; gap: 2px 4px; }
.cb-ov-top { display: flex; align-items: center; gap: 8px; background: linear-gradient(#c62828, #8e1b1b); border-radius: 4px; padding: 5px 8px; margin-bottom: 6px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.18); }
.cb-ov-logo { font-weight: 900; letter-spacing: 0.22em; font-size: 15px; color: #fff; text-shadow: 0 1px 0 #5a0d0d; margin-right: 6px; }
.cb-ov-part { min-width: 40px; font-weight: 800; border-radius: 3px; border: 1px solid #5a0d0d; background: #3a1010; color: #ffb3ae; padding: 4px 10px; cursor: pointer; }
.cb-ov-part.cb-on { background: #fff; color: #b71c1c; }
.cb-ov-top .cb-knob-label { color: #ffe0de; }
.cb-ov-top .cb-knob .cb-arc { stroke: #fff; }
.cb-ov-top .cb-knob .cb-track { stroke: #5a0d0d; }
.cb-ov-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.cb-ov-wide { grid-column: span 2; }
.cb-ov-full { grid-column: 1 / -1; }
.cb-ov-spec { display: block; width: 100%; height: 70px; margin-bottom: 4px; }
.cb-ov-draw { display: block; width: 100%; height: 54px; cursor: crosshair; touch-action: none; }
.cb-ov-graph { display: block; width: 100%; height: 120px; cursor: crosshair; touch-action: none; }
.cb-ov-graphbar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
.cb-ov-graphbar .cb-ov-title { font-weight: 800; color: #fff; background: #e53935; border-radius: 3px; padding: 2px 8px; letter-spacing: 0.06em; }
.cb-ov-keys { display: flex; height: 38px; margin-top: 6px; user-select: none; }
.cb-ov-keys div { flex: 1; border: 1px solid #3a2a2b; background: #f6eded; border-radius: 0 0 3px 3px; cursor: pointer; }
.cb-ov-keys div.cb-black { background: #1b1213; flex: 0.7; margin: 0 -0.35%; height: 62%; z-index: 1; }
.cb-ov-keys div:active, .cb-ov-keys div.cb-on { background: #e53935; }
.cb-ov-status { font-size: 10.5px; color: #c9a9a8; margin-top: 3px; }
@media (max-width: 720px) { .cb-ov-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`);

    // ------------------------------------------------------------ constants
    const CONTROL = 512;      // samples between spectrum rebuilds (crossfaded)
    const SUB = 32;           // samples between pitch / volume updates
    const MAX_H = 256;        // harmonics per spectrum
    const MAX_UNISON = 8;
    const PRISM_PARTIALS = 24;
    const DRAW_BARS = 32;
    const RS_H = 64;          // harmonics kept per resynthesis frame
    const RS_MAX_FRAMES = 240;
    const TIMBRES = ["Saw", "Square", "Triangle", "Sine", "Pulse 25%", "Pulse 12%", "Organ", "Choir Ah", "Choir Oo", "Brass", "Strings", "Bell", "Hollow", "Bright", "Reed", "Sub stack", "Drawn", "Resynth"];
    const T_DRAWN = 16, T_RESYNTH = 17;
    // timbres played with spread phases (the classic shapes keep their textbook waveform)
    const SPREAD = new Set([7, 8, 9, 10, 11, 13, 14, T_DRAWN, T_RESYNTH]);
    const FILTERS = ["Off", "Low pass 12", "Low pass 24", "High pass 12", "High pass 24", "Band pass", "Notch", "Comb", "Vowel", "Peak"];
    const ROUTES = ["Serial", "Parallel"];
    const PHASER_MODES = ["Octaves (log)", "Linear (Hz)"];
    const LFO_SHAPES = ["Sine", "Triangle", "Saw up", "Saw down", "Square", "Random"];
    // Mod targets: name, range (what amount 100% does), unit
    const TARGETS = [
        ["Volume", 1, ""],
        ["Timbre mix", 1, ""],
        ["Filter 1 cutoff", 6, "oct"],
        ["Filter 2 cutoff", 6, "oct"],
        ["Phaser offset", 3, "oct"],
        ["Pluck", 1, ""],
        ["Harmonizer", 1, ""],
        ["Prism", 1, ""],
        ["Pitch", 24, "st"],
        ["Unison detune", 1, ""],
        ["Tremolo depth", 1, ""],
        ["Blur", 1, ""],
    ];
    const M_VOL = 0, M_MIX = 1, M_F1 = 2, M_F2 = 3, M_PH = 4, M_PLUCK = 5, M_HARM = 6, M_PRISM = 7, M_PITCH = 8, M_DETUNE = 9, M_TREM = 10, M_BLUR = 11;
    const NT = TARGETS.length;

    // ------------------------------------------------------------ defaults
    function modSlot(i) {
        return {
            env: { on: false, amt: i == M_VOL ? 1 : 0.5, pts: i == M_VOL ? [[0, 0], [0.01, 1], [0.4, 0.6], [1.2, 0]] : [[0, 0], [0.02, 1], [0.6, 0.25], [1.5, 0]], sus: 2 },
            lfo: { on: false, amt: 0.2, shape: 0, rate: 3, sync: false, div: 9, key: true },
        };
    }
    function partDefaults(on) {
        return {
            on,
            timbre: { a: 0, b: 3, mix: 0, draw: Array.from({ length: DRAW_BARS }, (_, i) => +(1 / (i + 1)).toFixed(3)), rs: null, rsSpeed: 1, rsLoop: false },
            harm: { level: 0, clones: 3, decay: 0.55, oct: false },
            prism: { amt: 0, curve: 0.5 },
            uni: { voices: 1, detune: 0.2, rand: 1 },
            pluck: { amt: 0, time: 0.6, tilt: 0.6 },
            blur: { amt: 0, time: 0.25, tilt: 0.5 },
            trem: { depth: 0, rate: 4, spread: 0.3 },
            f1: { type: 1, cutoff: 9000, res: 0.15, key: 0.3, mix: 1 },
            f2: { type: 0, cutoff: 1500, res: 0.3, key: 0, mix: 1 },
            route: 0,
            phaser: { depth: 0, mode: 0, offset: 500, count: 2, width: 0.5 },
            amp: { a: 0.005, d: 0.5, s: 0.85, r: 0.3 },
            pitch: { semi: 0, fine: 0, glide: 0, vib: 0, vibRate: 5.2, vibDelay: 0.25 },
            level: 0.8,
            vel: 0.5,
            mods: Array.from({ length: NT }, (_, i) => modSlot(i)),
        };
    }
    function defaults() {
        return { parts: [partDefaults(true), partDefaults(false)], bal: 0.5, level: 0.85, width: 0.3, fx: [] };
    }
    const clone = (x) => JSON.parse(JSON.stringify(x));
    function merge(target, source) {
        for (const key of Object.keys(source)) {
            const s = source[key];
            if (Array.isArray(s)) {
                // arrays of plain objects merge item by item (sparse arrays leave the rest alone); other arrays are replaced
                if (!s.some(item => item && typeof item == "object" && !Array.isArray(item))) { target[key] = clone(s); continue; }
                if (!Array.isArray(target[key])) target[key] = [];
                s.forEach((item, i) => { target[key][i] = merge(target[key][i] && typeof target[key][i] == "object" ? target[key][i] : {}, item); });
            }
            else if (s && typeof s == "object") target[key] = merge(target[key] && typeof target[key] == "object" ? target[key] : {}, s);
            else target[key] = s;
        }
        return target;
    }
    // Fills in anything missing (older songs, hand-edited params) in place.
    function fill(params) {
        if (params._ovFilled) return params;
        const fillObject = (target, base) => {
            for (const key of Object.keys(base)) {
                const b = base[key];
                if (target[key] === undefined || (target[key] === null && b !== null)) target[key] = (b && typeof b == "object") ? clone(b) : b;
                else if (Array.isArray(b)) {
                    if (!Array.isArray(target[key])) target[key] = clone(b);
                    else if (b.length && b[0] && typeof b[0] == "object" && !Array.isArray(b[0])) b.forEach((item, i) => {
                        if (!target[key][i] || typeof target[key][i] != "object") target[key][i] = clone(item);
                        else fillObject(target[key][i], item);
                    });
                }
                else if (b && typeof b == "object") {
                    if (typeof target[key] != "object" || target[key] === null) target[key] = {};
                    fillObject(target[key], b);
                }
            }
        };
        fillObject(params, defaults());
        Object.defineProperty(params, "_ovFilled", { value: true, enumerable: false, configurable: true });
        return params;
    }
    // A part patch: {timbre: {...}, f1: {...}, ...} over part defaults.
    function part(over, on = true) {
        return merge(partDefaults(on), over || {});
    }
    // mod(target, {env: {...}, lfo: {...}}) -> sparse mods array for a part patch
    function mods(list) {
        const out = [];
        for (const [i, m] of list) out[i] = { env: Object.assign({ on: !!m.env }, m.env || {}), lfo: Object.assign({ on: !!m.lfo }, m.lfo || {}) };
        return out;
    }
    function make(a, b, top) {
        const p = defaults();
        p.parts[0] = part(a, true);
        p.parts[1] = b ? part(b, true) : partDefaults(false);
        return merge(p, top || {});
    }

    // ------------------------------------------------------------ resynthesis encoding (1.5 dB steps, 64 symbols)
    const ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const CODE = new Map(Array.from(ALPH, (c, i) => [c, i]));
    const encDb = (list) => Array.from(list, v => ALPH[Math.max(0, Math.min(63, Math.round(-(Number.isFinite(v) ? v : -95) / 1.5)))]).join("");
    const rsCache = new WeakMap();
    // Decoded linear amplitudes for a stored resynthesis: Float32Array(frames * RS_H)
    function rsFrames(rs) {
        if (!rs || typeof rs.data != "string") return null;
        let cached = rsCache.get(rs);
        if (cached && cached.src == rs.data) return cached.frames;
        const n = Math.floor(rs.data.length / RS_H);
        const frames = new Float32Array(n * RS_H);
        for (let i = 0; i < n * RS_H; i++) {
            const c = CODE.get(rs.data[i]) || 0;
            frames[i] = c >= 63 ? 0 : Math.pow(10, -1.5 * c / 20);
        }
        let ref = 1e-9;
        for (let f = 0; f < n; f++) { let e = 0; for (let k = 0; k < RS_H; k++) e += frames[f * RS_H + k] * frames[f * RS_H + k]; ref = Math.max(ref, e); }
        frames.ref = ref;
        rsCache.set(rs, { src: rs.data, frames });
        return frames;
    }

    // ------------------------------------------------------------ timbres
    // Formant bump (Gaussian on log frequency).
    const bump = (f, center, width, gain) => gain * Math.exp(-Math.pow(Math.log2(f / center) / width, 2));
    const VOWELS = [[800, 1150, 2900], [400, 1600, 2700], [350, 2300, 3000], [450, 800, 2830], [325, 700, 2530]]; // A E I O U
    function vowelGain(f, pos) {
        const x = Math.max(0, Math.min(VOWELS.length - 1.001, pos * (VOWELS.length - 1)));
        const i = Math.floor(x), t = x - i;
        let g = 0.06;
        for (let k = 0; k < 3; k++) {
            const c = VOWELS[i][k] * (1 - t) + VOWELS[i + 1][k] * t;
            g += bump(f, c, 0.16 + k * 0.03, k == 0 ? 1 : k == 1 ? 0.7 : 0.35);
        }
        return g;
    }
    const ORGAN = { 1: 1, 2: 0.8, 3: 0.65, 4: 0.6, 6: 0.4, 8: 0.45, 10: 0.2, 12: 0.25, 16: 0.18 };
    const BELL = { 1: 1, 2: 0.65, 3: 0.2, 5: 0.5, 7: 0.25, 9: 0.3, 12: 0.15, 15: 0.12 };
    // Amplitude of harmonic k (1-based) for a timbre at fundamental f0.
    function timbreAmp(t, k, f0, part) {
        const f = k * f0;
        switch (t) {
            case 0: return 1 / k;
            case 1: return k & 1 ? 1 / k : 0;
            case 2: return k & 1 ? 1 / (k * k) : 0;
            case 3: return k == 1 ? 1 : 0;
            case 4: return Math.abs(Math.sin(Math.PI * k * 0.25)) / k * 1.4;
            case 5: return Math.abs(Math.sin(Math.PI * k * 0.125)) / k * 2.2;
            case 6: return ORGAN[k] || 0;
            case 7: return (1 / Math.sqrt(k)) * vowelGain(f, 0) * 1.6;
            case 8: return (1 / Math.sqrt(k)) * vowelGain(f, 1) * 1.8;
            case 9: return (1 / Math.pow(k, 0.7)) * (0.25 + bump(f, 1200, 0.9, 1) + bump(f, 2600, 0.5, 0.4));
            case 10: return (1 / k) * (0.7 + 0.3 * Math.cos(k * 1.3)) * (1 + bump(f, 3000, 0.6, 0.6));
            case 11: return BELL[k] || 0;
            case 12: return k & 1 ? Math.pow(0.55, (k - 1) / 2) : 0.05 / k;
            case 13: return 1 / Math.pow(k, 0.55) * 0.6;
            case 14: return (k & 1 ? 1 : 0.35) / Math.pow(k, 0.85) * (1 + bump(f, 1500, 0.7, 0.8));
            case 15: return k == 1 ? 1 : k == 2 ? 0.5 : k == 4 ? 0.25 : k == 3 ? 0.12 : 0;
            case T_DRAWN: { const d = part.timbre.draw; return k <= DRAW_BARS && d ? Math.max(0, +d[k - 1] || 0) : 0; }
        }
        return 0;
    }

    // ------------------------------------------------------------ spectral filters
    function filterGain(type, f, cutoff, res) {
        if (type == 0) return 1;
        const x = Math.max(1e-4, f / cutoff);
        const q = 0.55 + res * res * 11;
        const x2 = x * x;
        const den = Math.sqrt((1 - x2) * (1 - x2) + (x / q) * (x / q));
        switch (type) {
            case 1: return 1 / den;
            case 2: { const q2 = 0.55 + res * res * 4; const d2 = Math.sqrt((1 - x2) * (1 - x2) + (x / q2) * (x / q2)); const d1 = Math.sqrt((1 - x2) * (1 - x2) + 2 * x2); return 1 / (d2 * d1); }
            case 3: return x2 / den;
            case 4: { const q2 = 0.55 + res * res * 4; const d2 = Math.sqrt((1 - x2) * (1 - x2) + (x / q2) * (x / q2)); const d1 = Math.sqrt((1 - x2) * (1 - x2) + 2 * x2); return (x2 * x2) / (d2 * d1); }
            case 5: return (x / q) / den * Math.min(1, 1.2 / Math.sqrt(q));
            case 6: return Math.abs(1 - x2) / Math.sqrt((1 - x2) * (1 - x2) + (x / (0.3 + res * 2)) * (x / (0.3 + res * 2)));
            case 7: { const c = 0.5 + 0.5 * Math.cos(2 * Math.PI * (f / cutoff)); return Math.pow(c, 0.5 + res * 6); }
            case 8: return vowelGain(f, Math.max(0, Math.min(1, Math.log2(cutoff / 100) / Math.log2(100)))) * (0.8 + res);
            case 9: return 1 + bump(f, cutoff, 0.25 - res * 0.2, 1.5 + res * 8);
        }
        return 1;
    }
    function phaserGain(ph, f, offset) {
        const x = ph.mode == 1 ? f / Math.max(10, offset) : Math.log2(Math.max(1, f) / Math.max(10, offset)) * Math.max(0.25, ph.count);
        const c = 0.5 + 0.5 * Math.cos(2 * Math.PI * x);
        return 1 - ph.depth * Math.pow(c, 1 + (1 - ph.width) * 24);
    }

    // ------------------------------------------------------------ mod sources
    // Graph envelope: pts [[seconds, 0..1], ...], sus = index held while the note is down (-1: none).
    function envValue(env, t, released, tRel) {
        const pts = env.pts;
        if (!pts || pts.length == 0) return 0;
        let time = t;
        const sus = env.sus | 0;
        if (sus >= 0 && sus < pts.length) {
            time = released ? pts[sus][0] + tRel : Math.min(t, pts[sus][0]);
        }
        if (time <= pts[0][0]) return pts[0][1];
        for (let i = 1; i < pts.length; i++) {
            if (time <= pts[i][0]) {
                const t0 = pts[i - 1][0], t1 = pts[i][0];
                const u = t1 > t0 ? (time - t0) / (t1 - t0) : 1;
                return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u;
            }
        }
        return pts[pts.length - 1][1];
    }
    // Releases whose envelope never comes back to zero would ring forever; this is when the last point is reached.
    function envEnd(env) {
        const pts = env.pts || [];
        const sus = env.sus | 0;
        if (!pts.length) return 0;
        return pts[pts.length - 1][0] - (sus >= 0 && sus < pts.length ? pts[sus][0] : 0);
    }

    // ------------------------------------------------------------ FFT table builder
    const tableCache = {};
    function scratch(n) {
        return tableCache[n] || (tableCache[n] = { re: new Float64Array(n), im: new Float64Array(n) });
    }
    // Writes one cycle of sum(amps[k] * sin(2 pi k t + phase_k)) into out (length n + 3 guard samples).
    // spread: Schroeder phases (pi k^2 / count) for dense, bright spectra, so the wave isn't one tall spike.
    function buildTable(amps, count, out, spread) {
        const n = out.length - 3;
        const { re, im } = scratch(n);
        re.fill(0); im.fill(0);
        for (let k = 1; k <= count && k < n / 2; k++) {
            if (!spread) { im[k] = -amps[k]; continue; }
            const ph = Math.PI * k * k / Math.max(8, count);
            re[k] = amps[k] * Math.sin(ph);
            im[k] = -amps[k] * Math.cos(ph);
        }
        CarrotDSP.fft(re, im, true);
        for (let i = 0; i < n; i++) out[i] = re[i] * n;
        out[n] = out[0]; out[n + 1] = out[1]; out[n + 2] = out[2];
    }
    // Cubic (Catmull-Rom) read from a wrapped table with 3 guard samples.
    function readTable(tab, n, pos) {
        let i = pos | 0;
        const f = pos - i;
        const x0 = i == 0 ? tab[n - 1] : tab[i - 1], x1 = tab[i], x2 = tab[i + 1], x3 = tab[i + 2];
        return x1 + 0.5 * f * (x2 - x0 + f * (2 * x0 - 5 * x1 + 4 * x2 - x3 + f * (3 * (x1 - x2) + x3 - x0)));
    }
    const SINE = (() => { const t = new Float32Array(4097); for (let i = 0; i <= 4096; i++) t[i] = Math.sin(i / 4096 * 2 * Math.PI); return t; })();
    const fastSin = (ph) => { const x = (ph - Math.floor(ph)) * 4096; const i = x | 0; return SINE[i] + (SINE[i + 1] - SINE[i]) * (x - i); };

    // ------------------------------------------------------------ voice
    function partVoice(pp, info, sr) {
        const pv = {
            amp: new CarrotADSR(), released: false, tRel: 0,
            phases: new Float64Array(MAX_UNISON), prismPh: new Float64Array(PRISM_PARTIALS * 3),
            tabSize: 0, tabOld: null, tabNew: null, xf: 1, untilRebuild: 0, lastKey: "",
            amps: new Float64Array(MAX_H + 1), smooth: new Float64Array(MAX_H + 1), smoothInit: false,
            prismAmps: new Float64Array(PRISM_PARTIALS + 1), prismOld: new Float64Array(PRISM_PARTIALS + 1),
            lfoPh: new Float64Array(NT), hold: new Float64Array(NT), mod: new Float64Array(NT), glide: 0,
            norm: 1, tremPh: 0, noteHz: info.freq,
        };
        const rnd = CarrotDSP.rng(((info.midi | 0) * 7919) ^ 0x5eed);
        for (let v = 0; v < MAX_UNISON; v++) pv.phases[v] = v == 0 ? 0 : (pp.uni.rand ? Math.random() : rnd());
        for (let i = 0; i < NT; i++) { pv.lfoPh[i] = pp.mods[i] && pp.mods[i].lfo.key ? 0 : Math.random(); pv.hold[i] = Math.random() * 2 - 1; }
        pv.amp.set(pp.amp.a, pp.amp.d, pp.amp.s, pp.amp.r, sr);
        pv.amp.trigger();
        if (pp.pitch.glide > 0.001 && info.prevDelta != null && info.prevGap != null && info.prevGap < 0.06 && Math.abs(info.prevDelta) <= 24) pv.glide = -info.prevDelta;
        return pv;
    }
    function createVoice(params, info) {
        const p = fill(params);
        const sr = info.sampleRate;
        const voice = { sr, age: 0, done: false, parts: [], midi: info.midi, velocity: info.velocity == undefined ? 1 : info.velocity, tmp: new Float32Array(SUB) };
        for (let i = 0; i < 2; i++) voice.parts.push(p.parts[i] && p.parts[i].on ? partVoice(p.parts[i], info, sr) : null);
        if (!voice.parts[0] && !voice.parts[1]) voice.parts[0] = partVoice(p.parts[0], info, sr);
        return voice;
    }

    // Evaluates every mod target of a part at time t (seconds since note on).
    function evalMods(pp, pv, t, dt, bpm) {
        for (let i = 0; i < NT; i++) {
            const m = pp.mods[i];
            let v = i == M_VOL ? 1 : 0;
            if (!m) { pv.mod[i] = v; continue; }
            if (m.env.on) {
                const e = envValue(m.env, t, pv.released, pv.tRel);
                v = i == M_VOL ? 1 - Math.min(1, Math.abs(m.env.amt)) + Math.min(1, Math.abs(m.env.amt)) * e : e * m.env.amt;
            }
            if (m.lfo.on) {
                const l = m.lfo;
                const hz = l.sync ? (bpm / 60) / carrotSyncBeats(l.div | 0) : l.rate;
                let ph = pv.lfoPh[i] + hz * dt;
                if (ph >= 1) { ph -= Math.floor(ph); pv.hold[i] = Math.random() * 2 - 1; }
                pv.lfoPh[i] = ph;
                const s = (l.shape | 0) == 5 ? pv.hold[i] : CarrotDSP.lfo(l.shape | 0, ph);
                if (i == M_VOL) v *= Math.max(0, 1 - Math.abs(l.amt) * (0.5 - 0.5 * s));
                else v += s * l.amt;
            }
            pv.mod[i] = v;
        }
    }

    // Builds the harmonic amplitudes (pv.amps[1..count]) for the current control block.
    function buildSpectrum(pp, pv, f0, t, dtBlock, count, sr) {
        const amps = pv.amps;
        const md = pv.mod;
        const tb = pp.timbre;
        const mix = Math.max(0, Math.min(1, tb.mix + md[M_MIX]));
        let rs = null, rsN = 0, rsPos = 0;
        if ((tb.a == T_RESYNTH || tb.b == T_RESYNTH) && tb.rs) {
            rs = rsFrames(tb.rs);
            rsN = rs ? rs.length / RS_H : 0;
            if (rsN > 0) {
                rsPos = t * Math.max(0.05, tb.rsSpeed) / Math.max(0.001, tb.rs.hop || 0.02);
                rsPos = tb.rsLoop ? rsPos % rsN : Math.min(rsN - 1, rsPos);
            }
            else rs = null;
        }
        const rsAmp = (k) => {
            if (!rs || k > RS_H) return 0;
            const i = Math.floor(rsPos), u = rsPos - i, j = Math.min(rsN - 1, i + 1);
            return rs[i * RS_H + k - 1] * (1 - u) + rs[j * RS_H + k - 1] * u;
        };
        const ta = tb.a | 0, tbb = tb.b | 0;
        // loudness: every timbre plays at about the same level before the filters
        // (a resynthesized sound is measured at its loudest frame so its own envelope stays)
        let eA = ta == T_RESYNTH && rs ? rs.ref : 0, eB = tbb == T_RESYNTH && rs ? rs.ref : 0;
        for (let k = 1; k <= count; k++) {
            const a = mix >= 0.999 ? 0 : (ta == T_RESYNTH ? rsAmp(k) : timbreAmp(ta, k, f0, pp));
            const b = mix <= 0.001 ? 0 : (tbb == T_RESYNTH ? rsAmp(k) : timbreAmp(tbb, k, f0, pp));
            if (ta != T_RESYNTH) eA += a * a;
            if (tbb != T_RESYNTH) eB += b * b;
            amps[k] = a * (1 - mix) + b * mix;
        }
        const level = (1 - mix) * Math.sqrt(mix >= 0.999 ? 0 : eA) + mix * Math.sqrt(mix <= 0.001 ? 0 : eB);
        pv.norm = level > 1e-6 ? 0.42 / (Math.SQRT1_2 * level) : 0;
        // Harmonizer: integer clones of every harmonic
        const hl = Math.max(0, Math.min(1.5, pp.harm.level + md[M_HARM]));
        if (hl > 0.001) {
            const src = Float64Array.from(amps.subarray(0, count + 1));
            const clones = Math.max(1, Math.min(8, pp.harm.clones | 0));
            for (let c = 0; c < clones; c++) {
                const m = pp.harm.oct ? (2 << c) : c + 2;
                const g = hl * Math.pow(pp.harm.decay, c);
                for (let k = 1; k * m <= count; k++) amps[k * m] += src[k] * g;
            }
        }
        // spectral modules: filters, phaser, pluck, tremolo
        const keyOct = (pp.f1.key || 0) * (pv.midi0 - 60) / 12, keyOct2 = (pp.f2.key || 0) * (pv.midi0 - 60) / 12;
        const c1 = Math.max(16, Math.min(sr * 0.5, pp.f1.cutoff * Math.pow(2, keyOct + md[M_F1] * 6)));
        const c2 = Math.max(16, Math.min(sr * 0.5, pp.f2.cutoff * Math.pow(2, keyOct2 + md[M_F2] * 6)));
        const t1 = pp.f1.type | 0, t2 = pp.f2.type | 0;
        const ph = pp.phaser;
        const phOffset = ph.offset * Math.pow(2, md[M_PH] * 3);
        const pluck = Math.max(0, Math.min(1, pp.pluck.amt + md[M_PLUCK]));
        const tremD = Math.max(0, Math.min(1, pp.trem.depth + md[M_TREM]));
        pv.tremPh += pp.trem.rate * dtBlock;
        for (let k = 1; k <= count; k++) {
            let a = amps[k];
            if (a <= 0) continue;
            const f = k * f0;
            let g1 = t1 ? filterGain(t1, f, c1, pp.f1.res) : 1, g2 = t2 ? filterGain(t2, f, c2, pp.f2.res) : 1;
            g1 = 1 - pp.f1.mix + pp.f1.mix * g1;
            g2 = 1 - pp.f2.mix + pp.f2.mix * g2;
            a *= pp.route == 1 && t1 && t2 ? (g1 + g2) * 0.5 : g1 * g2;
            if (ph.depth > 0.001) a *= phaserGain(ph, f, phOffset);
            if (pluck > 0.001) {
                const tau = Math.max(0.01, pp.pluck.time) / (1 + (k - 1) * pp.pluck.tilt * 0.35);
                a *= 1 - pluck + pluck * Math.exp(-t / tau);
            }
            if (tremD > 0.001) a *= 1 - tremD * (0.5 + 0.5 * Math.sin(2 * Math.PI * (pv.tremPh + k * pp.trem.spread * 0.37)));
            amps[k] = a;
        }
        // Blur: each harmonic follows its target slowly (higher ones slower)
        const blur = Math.max(0, Math.min(1, pp.blur.amt + md[M_BLUR]));
        if (blur > 0.001 && dtBlock > 0) {
            const sm = pv.smooth;
            if (!pv.smoothInit) { sm.fill(0); pv.smoothInit = true; }
            for (let k = 1; k <= count; k++) {
                const tau = Math.max(0.005, pp.blur.time * blur * (1 + (k - 1) * pp.blur.tilt * 0.08));
                const c = 1 - Math.exp(-dtBlock / tau);
                sm[k] += (amps[k] - sm[k]) * c;
                amps[k] = sm[k];
            }
        }
        else pv.smoothInit = false;
    }

    function renderPart(pp, pv, p, out, start, len, info, voice, partGain) {
        const sr = info.sampleRate;
        const bpm = info.bpm || 120;
        if (!info.gate && !pv.released) {
            pv.released = true;
            pv.amp.release();
        }
        pv.amp.set(pp.amp.a, pp.amp.d, pp.amp.s, pp.amp.r, sr);
        pv.midi0 = info.midi;
        const velocity = voice.velocity;
        const velAmp = 1 - pp.vel + pp.vel * velocity;
        const gain = pp.level * velAmp * partGain * p.level * 1.15;
        const glideCoef = pp.pitch.glide > 0.001 ? Math.exp(-SUB / (pp.pitch.glide * sr * 0.35)) : 0;
        const tmp = voice.tmp;
        let freq = info.freq;
        const freqStep = Math.pow(info.freqScale || 1, SUB);
        let i = start;
        const end = start + len;
        let ageS = voice.age;
        while (i < end) {
            const n = Math.min(SUB, end - i);
            const t = ageS / sr;
            if (pv.released) pv.tRel += n / sr;
            evalMods(pp, pv, t, n / sr, bpm);
            // pitch
            pv.glide *= glideCoef;
            const vib = pp.pitch.vib > 0 ? pp.pitch.vib * Math.min(1, Math.max(0, (t - pp.pitch.vibDelay) / 0.4)) * Math.sin(2 * Math.PI * pp.pitch.vibRate * t) : 0;
            const semis = pp.pitch.semi + pp.pitch.fine / 100 + pv.glide + vib + pv.mod[M_PITCH] * 24;
            const f0 = freq * Math.pow(2, semis / 12);
            const uni = Math.max(1, Math.min(MAX_UNISON, pp.uni.voices | 0));
            const detune = Math.max(0, Math.min(1.5, pp.uni.detune + pv.mod[M_DETUNE])) * 60;
            const topHz = f0 * Math.pow(2, (uni > 1 ? detune : 0) / 1200);
            // rebuild the spectrum table every CONTROL samples
            if (pv.untilRebuild <= 0) {
                const count = Math.max(1, Math.min(MAX_H, Math.floor(sr * 0.46 / topHz)));
                let size = 256;
                while (size < count * 4 && size < 4096) size <<= 1;
                if (size != pv.tabSize) {
                    pv.tabSize = size;
                    pv.tabOld = new Float32Array(size + 3);
                    pv.tabNew = new Float32Array(size + 3);
                    pv.xf = 1;
                    pv.fresh = true;
                }
                const dtBlock = CONTROL / sr;
                buildSpectrum(pp, pv, f0, t, dtBlock, count, sr);
                // Prism: the lowest partials are played as separate, stretched sines
                const prism = Math.max(-1, Math.min(1, pp.prism.amt + pv.mod[M_PRISM]));
                pv.prism = Math.abs(prism) > 0.002 ? prism : 0;
                pv.prismOld.set(pv.prismAmps);
                if (pv.prism) {
                    for (let k = 1; k <= PRISM_PARTIALS; k++) { pv.prismAmps[k] = k <= count ? pv.amps[k] : 0; if (k <= count) pv.amps[k] = 0; }
                }
                else pv.prismAmps.fill(0);
                const swap = pv.tabOld; pv.tabOld = pv.tabNew; pv.tabNew = swap;
                const tb = pp.timbre;
                const spread = (tb.mix < 0.5 ? SPREAD.has(tb.a | 0) : SPREAD.has(tb.b | 0)) || pp.harm.level > 0.2;
                buildTable(pv.amps, count, pv.tabNew, spread);
                if (pv.fresh) { pv.tabOld.set(pv.tabNew); pv.prismOld.set(pv.prismAmps); pv.fresh = false; }
                pv.xf = 0;
                pv.untilRebuild = CONTROL;
                pv.count = count;
            }
            const size = pv.tabSize;
            const norm = pv.norm;
            const xfStep = 1 / CONTROL;
            tmp.fill(0, 0, n);
            for (let v = 0; v < uni; v++) {
                const spread = uni == 1 ? 0 : (v / (uni - 1)) * 2 - 1;
                const hz = f0 * Math.pow(2, spread * detune / 1200);
                const inc = hz / sr * size;
                let pos = pv.phases[v] * size;
                const w = (uni == 1 ? 1 : 1 / Math.sqrt(uni)) * norm;
                let xf = pv.xf;
                const told = pv.tabOld, tnew = pv.tabNew;
                for (let j = 0; j < n; j++) {
                    const a = readTable(told, size, pos), b = readTable(tnew, size, pos);
                    tmp[j] += (a + (b - a) * xf) * w;
                    pos += inc;
                    if (pos >= size) pos -= size;
                    xf = Math.min(1, xf + xfStep);
                }
                pv.phases[v] = pos / size;
            }
            if (pv.prism) {
                const curve = 1 + pp.prism.curve * 2;
                const pu = Math.min(uni, 3);
                for (let v = 0; v < pu; v++) {
                    const spread = pu == 1 ? 0 : (v / (pu - 1)) * 2 - 1;
                    const hz = f0 * Math.pow(2, spread * detune / 1200);
                    const w = (pu == 1 ? 1 : 1 / Math.sqrt(pu)) * norm;
                    for (let k = 1; k <= PRISM_PARTIALS; k++) {
                        const a0 = pv.prismOld[k], a1 = pv.prismAmps[k];
                        if (a0 < 1e-5 && a1 < 1e-5) continue;
                        // stretched partial: k -> k * (1 + prism * ((k-1)/23)^curve * 0.5)
                        const ratio = k * (1 + pv.prism * Math.pow((k - 1) / (PRISM_PARTIALS - 1), curve) * 0.5);
                        const fk = hz * ratio;
                        if (fk >= sr * 0.46) continue;
                        const inc = fk / sr;
                        const idx = v * PRISM_PARTIALS + k - 1;
                        let ph = pv.prismPh[idx], xf = pv.xf;
                        for (let j = 0; j < n; j++) {
                            tmp[j] += fastSin(ph) * (a0 + (a1 - a0) * xf) * w;
                            ph += inc;
                            xf = Math.min(1, xf + xfStep);
                        }
                        pv.prismPh[idx] = ph - Math.floor(ph);
                    }
                }
            }
            pv.xf = Math.min(1, pv.xf + n * xfStep);
            pv.untilRebuild -= n;
            const vol = Math.max(0, pv.mod[M_VOL]) * gain;
            for (let j = 0; j < n; j++) out[i + j] += tmp[j] * pv.amp.next() * vol;
            ageS += n;
            freq *= freqStep;
            i += n;
        }
        // done when the amp envelope is over (and a volume envelope can't bring it back)
        if (pv.released && pv.amp.done) pv.done = true;
        const ve = pp.mods[M_VOL] && pp.mods[M_VOL].env;
        if (pv.released && ve && ve.on && ve.amt > 0.99 && pv.tRel > envEnd(ve) + 0.01) {
            const last = ve.pts[ve.pts.length - 1];
            if (!last || last[1] < 0.001) pv.done = true;
        }
    }

    function render(voice, out, start, len, info) {
        const p = fill(info.params);
        const a = voice.parts[0], b = voice.parts[1];
        const both = a && b;
        const bal = Math.max(0, Math.min(1, p.bal));
        if (a && !a.done) renderPart(p.parts[0], a, p, out, start, len, info, voice, both ? Math.min(1, 2 * (1 - bal)) : 1);
        if (b && !b.done) renderPart(p.parts[1], b, p, out, start, len, info, voice, both ? Math.min(1, 2 * bal) : 1);
        voice.age += len;
        if ((!a || a.done) && (!b || b.done)) voice.done = true;
        // safety: a released voice never lasts longer than 30 s
        if (!info.gate && voice.age > info.sampleRate * 60) voice.done = true;
    }

    // ------------------------------------------------------------ instrument effects
    function createInstrumentState(sampleRate) {
        return { fxStates: [], dl: new CarrotDelayLine(Math.ceil(sampleRate * 0.04)), dr: new CarrotDelayLine(Math.ceil(sampleRate * 0.04)), phase: 0 };
    }
    function processInstrument(state, params, L, R, start, end, ctx) {
        const p = fill(params);
        const w = p.width;
        if (w > 0.001) {
            const sr = ctx.sampleRate;
            const inc = 0.27 / sr;
            let phase = state.phase;
            for (let i = start; i < end; i++) {
                const m = (L[i] + R[i]) * 0.5;
                state.dl.write(m);
                state.dr.write(m);
                const lfo = Math.sin(phase * 6.283185307179586);
                const wl = state.dl.read(sr * (0.0081 + 0.0012 * lfo));
                const wr = state.dr.read(sr * (0.0127 - 0.0014 * lfo));
                L[i] = L[i] * (1 - w * 0.45) + wl * w * 0.55 - wr * w * 0.1;
                R[i] = R[i] * (1 - w * 0.45) + wr * w * 0.55 - wl * w * 0.1;
                phase += inc; if (phase >= 1) phase -= 1;
            }
            state.phase = phase;
        }
        if (p.fx.length > 0) CarrotFX.processChain(state.fxStates, p.fx, L, R, start, end, ctx);
    }

    // ------------------------------------------------------------ resynthesis analysis
    // Harmonic amplitudes (dB) every hop seconds, measured at the detected fundamental.
    function analyze(pcm, rate) {
        const len = Math.min(pcm.length, Math.floor(rate * 12));
        // fundamental: median of several pitch reads in the loud part
        const reads = [];
        for (let s = Math.floor(rate * 0.03); s + 4096 < len && reads.length < 12; s += Math.max(2048, Math.floor((len - 4096) / 12))) {
            const hz = CarrotDSP.detectPitch(pcm, rate, s, 4096);
            if (hz && hz > 30 && hz < 2000) reads.push(hz);
        }
        reads.sort((x, y) => x - y);
        const f0 = reads.length ? reads[reads.length >> 1] : 130.81;
        const hop = Math.max(0.01, len / rate / RS_MAX_FRAMES, 0.015);
        const hopS = Math.floor(hop * rate);
        const N = 4096;
        const win = new Float64Array(N);
        for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
        const re = new Float64Array(N), im = new Float64Array(N);
        const frames = [];
        let peak = 1e-9;
        for (let s = 0; s < len && frames.length < RS_MAX_FRAMES; s += hopS) {
            for (let i = 0; i < N; i++) { const x = s - N / 2 + i; re[i] = (x >= 0 && x < len ? pcm[x] : 0) * win[i]; im[i] = 0; }
            CarrotDSP.fft(re, im, false);
            const mag = (bin) => { const b = Math.round(bin); return b > 0 && b < N / 2 ? Math.hypot(re[b], im[b]) : 0; };
            const amps = new Float64Array(RS_H);
            for (let k = 1; k <= RS_H; k++) {
                const bin = k * f0 * N / rate;
                if (bin >= N / 2 - 2) break;
                // strongest bin near the harmonic (tolerates a little detune)
                let m = 0;
                for (let d = -2; d <= 2; d++) m = Math.max(m, mag(bin + d * Math.min(1, bin / 40)));
                amps[k - 1] = m;
                peak = Math.max(peak, m);
            }
            frames.push(amps);
        }
        let data = "";
        for (const f of frames) data += encDb(Array.from(f, v => 20 * Math.log10(Math.max(1e-9, v / peak))));
        return { f0: +f0.toFixed(2), hop: +(hopS / rate).toFixed(5), data, frames: frames.length };
    }

    // ------------------------------------------------------------ presets
    const env = (pts, sus = 2, amt = 0.5) => ({ pts, sus, amt });
    const PRESETS = [
        // Leads
        { group: "Leads", name: "Red Saw Lead", params: make({ timbre: { a: 0, b: 13, mix: 0.3 }, uni: { voices: 3, detune: 0.18 }, f1: { type: 2, cutoff: 5200, res: 0.25, key: 0.5 }, pitch: { vib: 0.18, vibRate: 5.5, vibDelay: 0.35, glide: 0.06 }, amp: { a: 0.004, d: 0.4, s: 0.85, r: 0.25 } }, null, { width: 0.4, fx: [Object.assign(CarrotFX.defaults("delay"), { mix: 0.22 })] }) },
        { group: "Leads", name: "Phaser Lead", params: make({ timbre: { a: 0 }, uni: { voices: 2, detune: 0.1 }, phaser: { depth: 0.9, count: 2, width: 0.35, offset: 400 }, f1: { type: 1, cutoff: 7000 }, mods: mods([[M_PH, { lfo: { amt: 0.45, rate: 0.35, shape: 1 } }]]) }) },
        { group: "Leads", name: "Hollow Flute", params: make({ timbre: { a: 12, b: 3, mix: 0.4 }, f1: { type: 1, cutoff: 3500, res: 0.1, key: 0.6 }, pitch: { vib: 0.12, vibRate: 5, vibDelay: 0.3 }, amp: { a: 0.05, d: 0.3, s: 0.9, r: 0.2 }, blur: { amt: 0.25, time: 0.12 } }) },
        { group: "Leads", name: "Vowel Talker", params: make({ timbre: { a: 0 }, f1: { type: 8, cutoff: 400, res: 0.3 }, uni: { voices: 2, detune: 0.12 }, mods: mods([[M_F1, { lfo: { amt: 0.35, rate: 1, sync: true, div: 9, shape: 1 } }]]) }) },
        { group: "Leads", name: "Glass Prism Lead", params: make({ timbre: { a: 13 }, prism: { amt: 0.25, curve: 0.6 }, f1: { type: 1, cutoff: 9000 }, pluck: { amt: 0.4, time: 1, tilt: 0.5 } }, null, { fx: [CarrotFX.defaults("reverb")] }) },
        { group: "Leads", name: "Wide Trance Lead", params: make({ timbre: { a: 0 }, uni: { voices: 7, detune: 0.35 }, harm: { level: 0.3, clones: 1, oct: true }, f1: { type: 2, cutoff: 8000, res: 0.15 } }, null, { width: 0.7, fx: [CarrotFX.defaults("delay"), CarrotFX.defaults("reverb")] }) },
        // Chords and keys
        { group: "Chords", name: "Additive Chord Stab", params: make({ timbre: { a: 0, b: 1, mix: 0.4 }, uni: { voices: 4, detune: 0.22 }, f1: { type: 2, cutoff: 2600, res: 0.2 }, pluck: { amt: 0.75, time: 0.5, tilt: 0.8 }, amp: { a: 0.002, d: 0.6, s: 0.3, r: 0.25 } }, null, { width: 0.6, fx: [CarrotFX.defaults("reverb")] }) },
        { group: "Chords", name: "Future Bass Swell", params: make({ timbre: { a: 0 }, uni: { voices: 6, detune: 0.3 }, f1: { type: 2, cutoff: 900, res: 0.3 }, mods: mods([[M_F1, { env: env([[0, 0], [0.45, 1], [1, 0.8], [1.6, 0.2]], 2, 0.45) }]]) }, null, { width: 0.75, fx: [CarrotFX.defaults("chorus"), CarrotFX.defaults("reverb")] }) },
        { group: "Chords", name: "Choir Chords", params: make({ timbre: { a: 7, b: 8, mix: 0.2 }, uni: { voices: 4, detune: 0.16 }, blur: { amt: 0.4, time: 0.3 }, amp: { a: 0.25, d: 1, s: 0.85, r: 0.8 }, mods: mods([[M_MIX, { lfo: { amt: 0.3, rate: 0.2 } }]]) }, null, { width: 0.7, fx: [CarrotFX.defaults("reverb")] }) },
        { group: "Chords", name: "Organ Drawbars", params: make({ timbre: { a: 6 }, f1: { type: 0 }, amp: { a: 0.005, d: 0.1, s: 1, r: 0.06 }, vel: 0.1, trem: { depth: 0.2, rate: 6, spread: 0.2 } }, null, { width: 0.4 }) },
        { group: "Chords", name: "Electric Tines", params: make({ timbre: { a: 3, b: 11, mix: 0.25 }, harm: { level: 0.15, clones: 2, decay: 0.4 }, pluck: { amt: 0.85, time: 1.4, tilt: 0.9 }, amp: { a: 0.002, d: 2, s: 0.2, r: 0.4 }, vel: 0.8, trem: { depth: 0.12, rate: 4.5 } }, null, { width: 0.5, fx: [CarrotFX.defaults("chorus")] }) },
        { group: "Chords", name: "Brass Section", params: make({ timbre: { a: 9 }, uni: { voices: 3, detune: 0.12 }, f1: { type: 2, cutoff: 1500, res: 0.1, key: 0.5 }, amp: { a: 0.06, d: 0.4, s: 0.8, r: 0.2 }, mods: mods([[M_F1, { env: env([[0, 0], [0.08, 1], [0.4, 0.55], [0.8, 0.2]], 2, 0.4) }]]) }) },
        // Pads
        { group: "Pads", name: "Harmor Pad", params: make({ timbre: { a: 0, b: 7, mix: 0.5 }, uni: { voices: 6, detune: 0.3 }, phaser: { depth: 0.6, count: 1.5, width: 0.5, offset: 300 }, blur: { amt: 0.5, time: 0.4 }, amp: { a: 0.8, d: 1.5, s: 0.85, r: 1.8 }, mods: mods([[M_PH, { lfo: { amt: 0.5, rate: 0.12 } }]]) }, null, { width: 0.85, fx: [CarrotFX.defaults("reverb")] }) },
        { group: "Pads", name: "Evolving Resynth Air", params: make({ timbre: { a: 10, b: 8, mix: 0.3 }, uni: { voices: 5, detune: 0.25 }, trem: { depth: 0.45, rate: 0.6, spread: 0.6 }, blur: { amt: 0.6, time: 0.6 }, amp: { a: 1.2, d: 2, s: 0.9, r: 2.5 } }, null, { width: 0.9, fx: [CarrotFX.defaults("reverb")] }) },
        { group: "Pads", name: "Prism Shimmer", params: make({ timbre: { a: 13 }, prism: { amt: 0.12, curve: 0.3 }, harm: { level: 0.4, clones: 2, oct: true }, trem: { depth: 0.35, rate: 2, spread: 0.8 }, amp: { a: 0.6, d: 1, s: 0.8, r: 2 } }, null, { width: 0.8, fx: [CarrotFX.defaults("reverb")] }) },
        { group: "Pads", name: "Sweep Pad", params: make({ timbre: { a: 0 }, uni: { voices: 5, detune: 0.28 }, f1: { type: 2, cutoff: 1100, res: 0.35, key: 0.7 }, amp: { a: 0.6, d: 1, s: 0.9, r: 1.5 }, mods: mods([[M_F1, { lfo: { amt: 0.4, rate: 0.08, shape: 1 } }]]) }, null, { width: 0.8, fx: [CarrotFX.defaults("chorus"), CarrotFX.defaults("reverb")] }) },
        // Plucks and bells
        { group: "Plucks", name: "Spectral Pluck", params: make({ timbre: { a: 0 }, pluck: { amt: 1, time: 0.45, tilt: 1 }, amp: { a: 0.001, d: 0.7, s: 0, r: 0.3 }, uni: { voices: 2, detune: 0.1 } }, null, { fx: [Object.assign(CarrotFX.defaults("delay"), { mix: 0.25 })] }) },
        { group: "Plucks", name: "Kalimba", params: make({ timbre: { a: 3, b: 11, mix: 0.4 }, prism: { amt: 0.35, curve: 0.2 }, pluck: { amt: 0.9, time: 0.8, tilt: 1 }, amp: { a: 0.001, d: 1.1, s: 0, r: 0.4 }, vel: 0.7 }) },
        { group: "Plucks", name: "Tubular Bell", params: make({ timbre: { a: 11 }, prism: { amt: 0.45, curve: 0.5 }, pluck: { amt: 0.7, time: 2.5, tilt: 0.5 }, amp: { a: 0.001, d: 4, s: 0, r: 2 } }, null, { fx: [CarrotFX.defaults("reverb")] }) },
        { group: "Plucks", name: "Harp", params: make({ timbre: { a: 2, b: 0, mix: 0.3 }, pluck: { amt: 0.95, time: 0.9, tilt: 0.9 }, amp: { a: 0.001, d: 1.6, s: 0, r: 0.6 }, f1: { type: 1, cutoff: 6000, key: 0.6 } }, null, { fx: [CarrotFX.defaults("reverb")] }) },
        // Bass
        { group: "Bass", name: "Additive Sub", params: make({ timbre: { a: 15 }, f1: { type: 1, cutoff: 600 }, amp: { a: 0.003, d: 0.2, s: 0.95, r: 0.12 }, vel: 0.3 }, null, { width: 0 }) },
        { group: "Bass", name: "Phaser Reese", params: make({ timbre: { a: 0 }, uni: { voices: 2, detune: 0.18 }, f1: { type: 2, cutoff: 1300, res: 0.2 }, phaser: { depth: 0.85, count: 3, width: 0.4, offset: 200 }, mods: mods([[M_PH, { lfo: { amt: 0.6, rate: 0.25, shape: 1 } }]]) }, null, { width: 0.15 }) },
        { group: "Bass", name: "Pluck Bass", params: make({ timbre: { a: 1, b: 0, mix: 0.5 }, pluck: { amt: 0.9, time: 0.25, tilt: 1 }, f1: { type: 2, cutoff: 3000, res: 0.3 }, amp: { a: 0.002, d: 0.5, s: 0.4, r: 0.12 } }, null, { width: 0 }) },
        { group: "Bass", name: "Growl Comb", params: make({ timbre: { a: 0 }, f1: { type: 7, cutoff: 700, res: 0.4, mix: 0.8 }, f2: { type: 2, cutoff: 2500, res: 0.2 }, mods: mods([[M_F1, { lfo: { amt: 0.3, rate: 2, sync: true, div: 7, shape: 0 } }]]) }, null, { width: 0.1 }) },
        // FX and layered A/B
        { group: "FX", name: "Blur Riser", params: make({ timbre: { a: 0 }, uni: { voices: 8, detune: 0.6 }, blur: { amt: 0.8, time: 1 }, amp: { a: 2, d: 1, s: 1, r: 1.5 }, mods: mods([[M_PITCH, { env: env([[0, 0], [4, 0.5]], -1, 1) }], [M_PH, { lfo: { amt: 0.5, rate: 0.5 } }]]), phaser: { depth: 0.6 } }, null, { width: 0.9, fx: [CarrotFX.defaults("reverb")] }) },
        { group: "FX", name: "Spectral Zap", params: make({ timbre: { a: 1 }, f1: { type: 9, cutoff: 1500, res: 0.6 }, amp: { a: 0.001, d: 0.3, s: 0, r: 0.1 }, mods: mods([[M_PITCH, { env: env([[0, 1], [0.25, 0]], -1, 1) }], [M_F1, { env: env([[0, 1], [0.3, 0]], -1, 0.5) }]]) }) },
        { group: "Layers", name: "A/B Pluck + Pad", params: make({ timbre: { a: 0 }, pluck: { amt: 1, time: 0.4, tilt: 1 }, amp: { a: 0.001, d: 0.6, s: 0, r: 0.3 } }, { timbre: { a: 7, b: 0, mix: 0.3 }, uni: { voices: 4, detune: 0.25 }, amp: { a: 0.5, d: 1, s: 0.8, r: 1.2 }, f1: { type: 2, cutoff: 2200 }, level: 0.6 }, { bal: 0.45, width: 0.7, fx: [CarrotFX.defaults("reverb")] }) },
        { group: "Layers", name: "A/B Bell + Sub", params: make({ timbre: { a: 11 }, prism: { amt: 0.3 }, pluck: { amt: 0.8, time: 1.5, tilt: 0.6 }, amp: { a: 0.001, d: 2.5, s: 0, r: 1 } }, { timbre: { a: 3 }, pitch: { semi: -12 }, amp: { a: 0.01, d: 0.5, s: 0.8, r: 0.3 }, level: 0.7 }, { bal: 0.5, fx: [CarrotFX.defaults("reverb")] }) },
    ];

    // ------------------------------------------------------------ randomize
    function randomize() {
        const r = Math.random;
        const pick = (list) => list[Math.floor(r() * list.length)];
        const p = defaults();
        const pp = p.parts[0];
        pp.timbre.a = pick([0, 0, 1, 2, 7, 9, 10, 12, 13, 14]);
        pp.timbre.b = pick([0, 3, 6, 8, 11, 13, 15]);
        pp.timbre.mix = +(r() * 0.7).toFixed(2);
        pp.uni.voices = pick([1, 1, 2, 3, 4, 6]);
        pp.uni.detune = +(0.05 + r() * 0.35).toFixed(2);
        pp.f1.type = pick([1, 1, 2, 2, 5, 8, 9]);
        pp.f1.cutoff = Math.round(400 * Math.pow(20, r()));
        pp.f1.res = +(r() * 0.6).toFixed(2);
        pp.f1.key = 0.6;
        if (r() < 0.4) Object.assign(pp.phaser, { depth: +(0.4 + r() * 0.5).toFixed(2), count: pick([1, 1.5, 2, 3]), offset: Math.round(150 * Math.pow(10, r())) });
        if (r() < 0.4) Object.assign(pp.pluck, { amt: +(0.5 + r() * 0.5).toFixed(2), time: +(0.2 + r()).toFixed(2) });
        if (r() < 0.3) pp.harm.level = +(r() * 0.5).toFixed(2);
        if (r() < 0.25) pp.prism.amt = +(r() * 0.4 - 0.1).toFixed(2);
        if (r() < 0.3) pp.blur.amt = +(r() * 0.6).toFixed(2);
        if (r() < 0.3) pp.mods[pick([M_F1, M_PH, M_MIX])].lfo = { on: true, amt: +(0.2 + r() * 0.3).toFixed(2), shape: pick([0, 1]), rate: +(0.1 + r() * 3).toFixed(2), sync: false, div: 9, key: true };
        const slow = r() < 0.35;
        pp.amp = slow ? { a: +(0.2 + r()).toFixed(2), d: 1, s: 0.85, r: +(0.5 + r() * 1.5).toFixed(2) } : { a: 0.003, d: +(0.2 + r()).toFixed(2), s: +(r() * 0.9).toFixed(2), r: +(0.1 + r() * 0.4).toFixed(2) };
        p.width = +(r() * 0.8).toFixed(2);
        return p;
    }

    // ------------------------------------------------------------ editor drawing
    function drawSpectrum(canvas, pp, sr) {
        const { ctx, w, h } = CarrotUI.ctx(canvas);
        ctx.fillStyle = "#120b0c";
        ctx.fillRect(0, 0, w, h);
        // a static picture of the part's spectrum at C4, one second in
        const f0 = 261.63, count = 64;
        const pv = { amps: new Float64Array(MAX_H + 1), smooth: new Float64Array(MAX_H + 1), mod: new Float64Array(NT), tremPh: 0, midi0: 60 };
        pv.mod[M_VOL] = 1;
        buildSpectrum(pp, pv, f0, 0.02, 0, count, sr);
        let peak = 1e-9;
        for (let k = 1; k <= count; k++) peak = Math.max(peak, pv.amps[k]);
        const bw = w / count;
        for (let k = 1; k <= count; k++) {
            const db = 20 * Math.log10(Math.max(1e-6, pv.amps[k] / peak));
            const v = Math.max(0, 1 + db / 60);
            const bh = v * (h - 4);
            ctx.fillStyle = k == 1 ? "#ffffff" : "hsl(" + (2 + k * 0.25) + ", 85%, " + (45 + v * 20) + "%)";
            ctx.fillRect((k - 1) * bw + 1, h - bh, Math.max(1, bw - 1.5), bh);
        }
        // filter and phaser curves across the same harmonics
        const curve = (fn, color) => {
            ctx.beginPath();
            for (let x = 0; x <= w; x += 2) {
                const f = (x / bw + 0.5) * f0;
                const g = Math.max(1e-4, fn(f));
                const y = h * (1 - Math.max(0, 1 + 20 * Math.log10(g) / 60) * 0.9);
                if (x == 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.stroke();
        };
        if (pp.f1.type) curve(f => filterGain(pp.f1.type, f, pp.f1.cutoff * Math.pow(2, pp.f1.key * 0), pp.f1.res), "rgba(255,255,255,0.75)");
        if (pp.f2.type) curve(f => filterGain(pp.f2.type, f, pp.f2.cutoff, pp.f2.res), "rgba(155,255,140,0.7)");
        if (pp.phaser.depth > 0.001) curve(f => phaserGain(pp.phaser, f, pp.phaser.offset), "rgba(255,200,60,0.75)");
    }
    function drawBars(canvas, values) {
        const { ctx, w, h } = CarrotUI.ctx(canvas);
        ctx.fillStyle = "#120b0c"; ctx.fillRect(0, 0, w, h);
        const bw = w / values.length;
        values.forEach((v, i) => {
            const bh = Math.max(0, Math.min(1, v)) * (h - 2);
            ctx.fillStyle = i == 0 ? "#fff" : "#e53935";
            ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
        });
    }

    // ------------------------------------------------------------ editor
    function buildEditor(host) {
        const P = () => fill(host.params());
        P();
        const root = HTML.div({ class: "cb-ov-panel" });
        let partIndex = 0;
        let target = M_F1;
        const redraws = [];
        const redraw = () => redraws.forEach(f => f());
        const pct = (v) => Math.round(v * 100) + "%";
        const pctSigned = (v) => (v > 0 ? "+" : "") + Math.round(v * 100) + "%";
        const sr = 44100;

        // ---- top strip: logo, parts, global level
        const partButtons = [0, 1].map(i => {
            const b = HTML.button({ type: "button", class: "cb-ov-part", title: i == 0 ? "Edit part A" : "Edit part B (switch it on with the toggle in its Part section)" }, i == 0 ? "A" : "B");
            b.addEventListener("click", () => { partIndex = i; buildBody(); });
            return b;
        });
        const top = HTML.div({ class: "cb-ov-top" },
            HTML.span({ class: "cb-ov-logo" }, "OVERTONE"),
            ...partButtons,
            host.knob("bal", { label: "A / B", min: 0, max: 1, def: 0.5, small: true, format: v => v < 0.5 ? "A " + Math.round((1 - v) * 200 - 100) + "%" : v > 0.5 ? "B " + Math.round(v * 200 - 100) + "%" : "50/50", title: "Balance between part A and part B (when B is on)" }),
            host.knob("level", { label: "Volume", min: 0, max: 1.5, def: 0.85, small: true, format: pct }),
            host.knob("width", { label: "Width", min: 0, max: 1, def: 0.3, small: true, format: pct, title: "Stereo spread after the voices" }));
        root.appendChild(top);
        const body = HTML.div();
        root.appendChild(body);

        function buildBody() {
            partButtons.forEach((b, i) => b.classList.toggle("cb-on", i == partIndex));
            redraws.length = 0;
            body.textContent = "";
            const base = "parts." + partIndex + ".";
            const pp = () => P().parts[partIndex];
            const k = (path, spec) => host.knob(base + path, Object.assign({ small: true, onInput: () => redraw() }, spec));
            const s = (path, spec) => host.select(base + path, Object.assign({ onChange: () => redraw() }, spec));

            // Timbre
            const spec = HTML.canvas({ class: "cb-canvas cb-ov-spec", title: "Harmonics of this part at middle C (white: fundamental). Lines: filter 1 (white), filter 2 (green), phaser (yellow)." });
            redraws.push(() => drawSpectrum(spec, pp(), sr));
            const draw = HTML.canvas({ class: "cb-canvas cb-ov-draw", title: "Drawn timbre: drag to set the first 32 harmonics (pick \"Drawn\" as timbre A or B)" });
            redraws.push(() => drawBars(draw, pp().timbre.draw));
            let drawing = false;
            const paint = (e) => {
                const rect = draw.getBoundingClientRect();
                const i = Math.max(0, Math.min(DRAW_BARS - 1, Math.floor((e.clientX - rect.left) / rect.width * DRAW_BARS)));
                const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                pp().timbre.draw[i] = +v.toFixed(3);
                host.changed(false);
                redraw();
            };
            draw.addEventListener("pointerdown", (e) => { drawing = true; draw.setPointerCapture(e.pointerId); paint(e); });
            draw.addEventListener("pointermove", (e) => { if (drawing) paint(e); });
            draw.addEventListener("pointerup", () => { if (drawing) { drawing = false; host.commitNow(); } });
            const status = HTML.div({ class: "cb-ov-status" });
            const showStatus = () => {
                const rs = pp().timbre.rs;
                status.textContent = rs ? "Resynth: " + (rs.name || "sample") + " - " + Math.round(rs.data.length / RS_H) + " frames, root " + rs.f0 + " Hz" : "Resynth: no sample yet. Load one, then pick \"Resynth\" as timbre A or B.";
            };
            redraws.push(showStatus);
            const loadSample = async (picked) => {
                if (!picked) return;
                const entry = await FLSampleBank.whenReady(picked.id);
                if (!entry || entry.status != "ready" || !entry.pcm) { host.toast("Couldn't read that file."); return; }
                const rs = analyze(entry.pcm, entry.rate);
                if (!rs.frames) { host.toast("That sound is too short."); return; }
                rs.name = picked.name || "sample";
                const t = pp().timbre;
                t.rs = rs;
                if (t.a != T_RESYNTH && t.b != T_RESYNTH) { t.a = T_RESYNTH; t.mix = 0; }
                host.changed(true);
                host.refresh();
                redraw();
                host.toast("Resynthesized " + rs.name + " (" + rs.frames + " frames)");
            };
            const loadButton = CarrotUI.button("Load sample...", async () => loadSample(await host.pickAudioFile()), { title: "Analyze a sound into harmonics over time and play it back additively (single notes work best)" });
            host.acceptSampleDrops(spec, (sample) => loadSample(sample));
            const timbre = CarrotUI.section("Timbre",
                spec,
                CarrotUI.row(s("timbre.a", { label: "Timbre A", options: TIMBRES, def: 0 }), s("timbre.b", { label: "Timbre B", options: TIMBRES, def: 3 }),
                    k("timbre.mix", { label: "A > B mix", min: 0, max: 1, def: 0, format: pct })),
                draw,
                CarrotUI.row(loadButton, k("timbre.rsSpeed", { label: "RS speed", min: 0.1, max: 4, curve: "exp", def: 1, format: v => v.toFixed(2) + "x" }), host.toggle(base + "timbre.rsLoop", { label: "Loop", def: false })),
                status);
            timbre.classList.add("cb-ov-wide");

            const partSec = CarrotUI.section("Part " + (partIndex == 0 ? "A" : "B"),
                partIndex == 1 ? host.toggle(base + "on", { label: "Part B on", def: false, title: "Layer a second full synth (new notes)" }) : HTML.div({ class: "cb-ov-status" }, "Part A always plays."),
                CarrotUI.row(k("level", { label: "Level", min: 0, max: 1.5, def: 0.8, format: pct }), k("vel", { label: "Velocity", min: 0, max: 1, def: 0.5, format: pct })),
                CarrotUI.row(k("pitch.semi", { label: "Semi", min: -24, max: 24, step: 1, def: 0 }), k("pitch.fine", { label: "Fine", min: -100, max: 100, step: 1, def: 0, unit: "c" }), k("pitch.glide", { label: "Glide", min: 0, max: 1, def: 0, unit: "s" })),
                CarrotUI.row(k("pitch.vib", { label: "Vibrato", min: 0, max: 1, def: 0, unit: "st" }), k("pitch.vibRate", { label: "Vib rate", min: 0.5, max: 12, def: 5.2, format: v => (v < 10 ? v.toFixed(2) : v.toFixed(1)) + " Hz" }), k("pitch.vibDelay", { label: "Vib delay", min: 0, max: 2, def: 0.25, unit: "s" })),
                CarrotUI.button("Copy to other part", () => {
                    const p = P();
                    const copy = clone(p.parts[partIndex]);
                    copy.on = partIndex == 0 ? true : p.parts[0].on;
                    if (partIndex == 0) copy.on = true;
                    p.parts[1 - partIndex] = copy;
                    if (partIndex == 0) p.parts[1].on = true;
                    host.changed(true); host.toast("Copied part " + (partIndex == 0 ? "A to B (B is on now)" : "B to A"));
                }, { title: "Copy this whole part over the other one" }));

            const harm = CarrotUI.section("Harmonizer",
                CarrotUI.row(k("harm.level", { label: "Level", min: 0, max: 1.5, def: 0, format: pct, title: "Adds copies of every harmonic at 2x, 3x, 4x... its frequency" }), k("harm.clones", { label: "Clones", min: 1, max: 8, step: 1, def: 3 }), k("harm.decay", { label: "Order fall", min: 0, max: 1, def: 0.55, format: pct })),
                host.toggle(base + "harm.oct", { label: "Octaves only", def: false, onChange: redraw }));
            const prism = CarrotUI.section("Prism",
                CarrotUI.row(k("prism.amt", { label: "Amount", min: -1, max: 1, def: 0, format: pctSigned, title: "Stretches (or squeezes) the lowest 24 partials away from whole harmonics: bells, metal, pianos" }), k("prism.curve", { label: "Curve", min: 0, max: 1, def: 0.5, format: pct })));
            const uni = CarrotUI.section("Unison",
                CarrotUI.row(k("uni.voices", { label: "Voices", min: 1, max: MAX_UNISON, step: 1, def: 1 }), k("uni.detune", { label: "Detune", min: 0, max: 1.5, def: 0.2, format: pct }), host.toggle(base + "uni.rand", { label: "Random phase", def: true })));
            const pluck = CarrotUI.section("Pluck",
                CarrotUI.row(k("pluck.amt", { label: "Amount", min: 0, max: 1, def: 0, format: pct, title: "High harmonics die away faster than low ones, like a plucked string" }), k("pluck.time", { label: "Decay", min: 0.02, max: 5, curve: "exp", def: 0.6, unit: "s" }), k("pluck.tilt", { label: "Tilt", min: 0, max: 1, def: 0.6, format: pct })));
            const blur = CarrotUI.section("Blur",
                CarrotUI.row(k("blur.amt", { label: "Amount", min: 0, max: 1, def: 0, format: pct, title: "Smears every harmonic over time: soft attacks and spectral tails" }), k("blur.time", { label: "Time", min: 0.01, max: 2, curve: "exp", def: 0.25, unit: "s" }), k("blur.tilt", { label: "Tilt", min: 0, max: 1, def: 0.5, format: pct })));
            const trem = CarrotUI.section("Tremolo",
                CarrotUI.row(k("trem.depth", { label: "Depth", min: 0, max: 1, def: 0, format: pct }), k("trem.rate", { label: "Rate", min: 0.05, max: 20, curve: "exp", def: 4, format: v => (v < 10 ? v.toFixed(2) : v.toFixed(1)) + " Hz" }), k("trem.spread", { label: "Harm spread", min: 0, max: 1, def: 0.3, format: pct, title: "0 = plain tremolo; higher = every harmonic moves on its own (shimmer)" })));
            const filt = (n) => CarrotUI.section("Filter " + n,
                CarrotUI.row(s("f" + n + ".type", { label: "Type", options: FILTERS, def: n == 1 ? 1 : 0 }), k("f" + n + ".cutoff", { label: "Cutoff", min: 20, max: 20000, curve: "exp", unit: "Hz", def: n == 1 ? 9000 : 1500 })),
                CarrotUI.row(k("f" + n + ".res", { label: "Resonance", min: 0, max: 1, def: n == 1 ? 0.15 : 0.3, format: pct }), k("f" + n + ".key", { label: "Key track", min: 0, max: 1, def: n == 1 ? 0.3 : 0, format: pct }), k("f" + n + ".mix", { label: "Mix", min: 0, max: 1, def: 1, format: pct })));
            const f2 = filt(2);
            f2.appendChild(CarrotUI.row(s("route", { label: "Routing", options: ROUTES, def: 0 })));
            const phaser = CarrotUI.section("Phaser",
                CarrotUI.row(k("phaser.depth", { label: "Depth", min: 0, max: 1, def: 0, format: pct, title: "Moving notches across the harmonics. Animate \"Phaser offset\" in the graph editor below." }), k("phaser.offset", { label: "Offset", min: 20, max: 8000, curve: "exp", unit: "Hz", def: 500 }), k("phaser.count", { label: "Count", min: 0.25, max: 8, def: 2, title: "Notches per octave (log) - spacing in Hz units for linear" })),
                CarrotUI.row(k("phaser.width", { label: "Width", min: 0, max: 1, def: 0.5, format: pct }), s("phaser.mode", { label: "Mode", options: PHASER_MODES, def: 0 })));
            const ampSec = CarrotUI.section("Amp envelope", host.envelope(base + "amp", { value: { a: 0.005, d: 0.5, s: 0.85, r: 0.3 }, label: "Amp envelope" }));

            ampSec.classList.add("cb-ov-full");
            const grid = HTML.div({ class: "cb-ov-grid" }, timbre, partSec, filt(1), f2, phaser, harm, prism, pluck, blur, trem, uni, ampSec);
            body.appendChild(grid);
            body.appendChild(graphEditor(base, pp));
            body.appendChild(keyboard());
            body.appendChild(CarrotUI.section("Effects", carrotFxRack(host, "fx", { max: 6 })));
            setTimeout(redraw, 30);
        }

        // ---- graph editor: one envelope + LFO per target
        function graphEditor(base, pp) {
            const canvas = HTML.canvas({ class: "cb-canvas cb-ov-graph", title: "Click to add a point, drag to move, right-click (or double-click) to delete. Shift+click sets the sustain point." });
            const title = HTML.span({ class: "cb-ov-title" });
            const targetSel = CarrotUI.select({ label: "Target", options: TARGETS.map(t => t[0]), value: target, onChange: (v) => { target = v; rebuild(); } });
            const controls = HTML.div({ class: "cb-row" });
            const wrap = CarrotUI.section("Graph editor", HTML.div({ class: "cb-ov-graphbar" }, title, targetSel), canvas, controls);
            wrap.classList.add("cb-ov-graphsec");
            const slot = () => pp().mods[target];
            const MAX_T = () => Math.max(2, ...slot().env.pts.map(p => p[0] + 0.5));
            const paint = () => {
                const m = slot();
                title.textContent = TARGETS[target][0] + (m.env.on ? "" : " (envelope off)");
                const { ctx, w, h } = CarrotUI.ctx(canvas);
                ctx.fillStyle = "#120b0c"; ctx.fillRect(0, 0, w, h);
                const T = MAX_T();
                ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1;
                for (let s = 0; s <= T; s += T > 6 ? 1 : 0.25) { const x = s / T * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
                for (let v = 0; v <= 4; v++) { const y = v / 4 * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
                const pts = m.env.pts;
                const X = (t) => t / T * w, Y = (v) => 6 + (1 - v) * (h - 12);
                ctx.beginPath();
                ctx.moveTo(X(0), Y(pts[0][1]));
                pts.forEach(p => ctx.lineTo(X(p[0]), Y(p[1])));
                ctx.lineTo(w, Y(pts[pts.length - 1][1]));
                ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
                ctx.fillStyle = m.env.on ? "rgba(229,57,53,0.28)" : "rgba(160,160,160,0.12)"; ctx.fill();
                ctx.beginPath();
                pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])));
                ctx.strokeStyle = m.env.on ? "#ff4b42" : "#8b7778"; ctx.lineWidth = 2; ctx.stroke();
                pts.forEach((p, i) => {
                    ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), i == (m.env.sus | 0) ? 5.5 : 4, 0, Math.PI * 2);
                    ctx.fillStyle = i == (m.env.sus | 0) ? "#ffd166" : "#fff"; ctx.fill();
                });
                if ((m.env.sus | 0) >= 0 && pts[m.env.sus | 0]) {
                    const x = X(pts[m.env.sus | 0][0]);
                    ctx.setLineDash([3, 3]); ctx.strokeStyle = "#ffd166"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.setLineDash([]);
                }
                ctx.fillStyle = "#c9a9a8"; ctx.font = "10px sans-serif";
                ctx.fillText(T.toFixed(1) + " s", w - 34, h - 4);
            };
            let drag = -1;
            const toPoint = (e) => {
                const rect = canvas.getBoundingClientRect();
                const T = MAX_T();
                return [Math.max(0, (e.clientX - rect.left) / rect.width * T), Math.max(0, Math.min(1, 1 - ((e.clientY - rect.top) - 6) / (rect.height - 12)))];
            };
            const nearest = (e) => {
                const rect = canvas.getBoundingClientRect();
                const T = MAX_T();
                let best = -1, bestD = 12;
                slot().env.pts.forEach((p, i) => {
                    const d = Math.hypot(p[0] / T * rect.width - (e.clientX - rect.left), 6 + (1 - p[1]) * (rect.height - 12) - (e.clientY - rect.top));
                    if (d < bestD) { bestD = d; best = i; }
                });
                return best;
            };
            const remove = (i) => {
                const env = slot().env;
                if (i <= 0 || env.pts.length <= 2) return;
                env.pts.splice(i, 1);
                if ((env.sus | 0) >= i) env.sus = (env.sus | 0) - 1;
                host.changed(true); paint();
            };
            canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); remove(nearest(e)); });
            canvas.addEventListener("dblclick", (e) => remove(nearest(e)));
            canvas.addEventListener("pointerdown", (e) => {
                if (e.button != 0) return;
                const env = slot().env;
                let i = nearest(e);
                if (e.shiftKey && i >= 0) { env.sus = (env.sus | 0) == i ? -1 : i; host.changed(true); paint(); return; }
                if (i < 0) {
                    const p = toPoint(e);
                    i = env.pts.findIndex(q => q[0] > p[0]);
                    if (i < 0) i = env.pts.length;
                    if (i == 0) i = 1;
                    env.pts.splice(i, 0, [+p[0].toFixed(3), +p[1].toFixed(3)]);
                    if ((env.sus | 0) >= i) env.sus = (env.sus | 0) + 1;
                }
                if (!env.on) { env.on = true; host.refresh(); }
                drag = i;
                canvas.setPointerCapture(e.pointerId);
                host.changed(false); paint();
            });
            canvas.addEventListener("pointermove", (e) => {
                if (drag < 0) return;
                const env = slot().env;
                const p = toPoint(e);
                const lo = drag == 0 ? 0 : env.pts[drag - 1][0], hi = drag == env.pts.length - 1 ? 1e9 : env.pts[drag + 1][0];
                env.pts[drag] = [drag == 0 ? 0 : +Math.max(lo, Math.min(hi, p[0])).toFixed(3), +p[1].toFixed(3)];
                host.changed(false); paint();
            });
            canvas.addEventListener("pointerup", () => { if (drag >= 0) { drag = -1; host.commitNow(); paint(); } });
            const rebuild = () => {
                controls.textContent = "";
                const mb = base + "mods." + target + ".";
                const range = TARGETS[target];
                const amtFormat = target == M_VOL ? pct : (v) => (v > 0 ? "+" : "") + (range[2] ? (v * range[1]).toFixed(range[1] >= 6 ? 1 : 2) + " " + range[2] : Math.round(v * 100) + "%");
                controls.append(
                    host.toggle(mb + "env.on", { label: "Envelope", def: false, onChange: paint }),
                    host.knob(mb + "env.amt", { label: "Env amount", min: target == M_VOL ? 0 : -1, max: 1, def: 0.5, small: true, format: amtFormat }),
                    host.toggle(mb + "lfo.on", { label: "LFO", def: false }),
                    host.knob(mb + "lfo.amt", { label: "LFO amount", min: target == M_VOL ? 0 : -1, max: 1, def: 0.2, small: true, format: amtFormat }),
                    host.select(mb + "lfo.shape", { label: "Shape", options: LFO_SHAPES, def: 0 }),
                    host.knob(mb + "lfo.rate", { label: "Rate", min: 0.02, max: 30, curve: "exp", format: v => (v < 10 ? v.toFixed(2) : v.toFixed(1)) + " Hz", def: 3, small: true }),
                    host.toggle(mb + "lfo.sync", { label: "Sync", def: false }),
                    host.select(mb + "lfo.div", { label: "Sync rate", options: carrotSyncOptions(), def: 9 }),
                    CarrotUI.button("Reset", () => { pp().mods[target] = modSlot(target); host.changed(true); host.refresh(); paint(); }, { title: "Put this target's envelope and LFO back to default (off)" }));
                paint();
            };
            redraws.push(paint);
            rebuild();
            return wrap;
        }

        // ---- little keyboard to audition
        function keyboard() {
            const keys = HTML.div({ class: "cb-ov-keys", title: "Click to hear the instrument" });
            for (let i = 0; i < 25; i++) {
                const black = [1, 3, 6, 8, 10].includes(i % 12);
                const key = HTML.div({ class: black ? "cb-black" : "" });
                const pitch = 36 + i;
                key.addEventListener("pointerdown", (e) => { e.preventDefault(); host.noteOn(pitch); key.classList.add("cb-on"); });
                const up = () => { host.noteOff(pitch); key.classList.remove("cb-on"); };
                key.addEventListener("pointerup", up);
                key.addEventListener("pointerleave", () => { if (key.classList.contains("cb-on")) up(); });
                keys.appendChild(key);
            }
            return keys;
        }

        host.onRefresh(redraw);
        buildBody();
        return root;
    }

    B.CarrotPlugins.register({
        id: "overtone",
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
