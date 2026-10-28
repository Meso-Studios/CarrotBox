    // ======================================================================
    // CarrotBox: plugin registry, shared DSP building blocks and the effect
    // engine used by plugins, the master chain and the audio recorder.
    //
    // Plugins live in separate files (plugins/<id>.js) that are only loaded
    // when installed, and register themselves with CarrotPlugins.register().
    // ======================================================================
    const CARROT_PLUGIN_CATALOG = [
        {
            id: "swarm", name: "Swarm", kind: "instrument", file: "plugins/swarm.js", alt: "Hive 2", icon: "Sw", color: "#ffb02e", sizeKB: 44,
            blurb: "Fast, friendly hybrid synth: 3 oscillators with up to 8-voice unison, sub & noise, two filters (serial/parallel), amp + mod envelopes, 2 LFOs, a mod matrix and built-in FX.",
        },
        {
            id: "prism", name: "Prism", kind: "instrument", file: "plugins/prism.js", alt: "Serum", icon: "Pr", color: "#4fc3f7", sizeKB: 57,
            blurb: "Wavetable synth: two morphing wavetable oscillators with warp modes, 3D wavetable view, draw or import your own tables, sub & noise, filter, 3 envelopes, 4 LFOs, mod matrix and an FX rack.",
        },
        {
            id: "seedling", name: "Seedling", kind: "instrument", file: "plugins/seedling.js", alt: "Synplant", icon: "Sd", color: "#7bd88f", sizeKB: 44,
            blurb: "Grow sounds instead of programming them: plant a seed, explore its mutated branches, edit the sound's DNA, or let it grow a patch that imitates a sample.",
        },
        {
            id: "synthvault", name: "Synth Vault", kind: "instrument", file: "plugins/synthvault.js", alt: "Analog Lab Pro", icon: "SV", color: "#ff8a2a", sizeKB: 125,
            blurb: "114 ready-to-play sounds from nine classic-instrument engines (ladder monosynth, poly analog, dual-layer CS, 6-op FM, tine and reed electric pianos and a clav, acoustic piano, tonewheel organ with rotary speaker, string machine, tape replay) in one browser with types, characters, likes and previews, four macros, Multi split/layer and an FX rack.",
        },
        {
            id: "overtone", name: "Overtone", kind: "instrument", file: "plugins/overtone.js", alt: "Harmor", icon: "Ov", color: "#e53935", sizeKB: 70,
            blurb: "Additive and resynthesis synth: every note is a stack of harmonics shaped by two timbres (or a resynthesized sample), harmonizer, prism, spectral filters, phaser, pluck, blur and tremolo, with a graph editor of envelopes and LFOs for every target, unison and two layered parts.",
        },
        {
            id: "nebula", name: "Nebula", kind: "instrument", file: "plugins/nebula.js", alt: "Portal / Granulator", icon: "Nb", color: "#9d7bff", sizeKB: 36,
            blurb: "Granular synth: every note sprays a cloud of tiny grains from one of eight built-in sources or any sample. Position, spray, scan and freeze, grain size, density and jitter, pitch scatter, octave jumps, reverse grains, five grain windows, filter, LFO and an FX rack, with a live cloud view.",
        },
        {
            id: "chopshop", name: "Chop Shop", kind: "instrument", file: "plugins/chopshop.js", alt: "Serato Sample", icon: "Cs", color: "#ff6b6b", sizeKB: 45,
            blurb: "Sample chopper: finds 16 cues for you, detects key & BPM, shifts key without changing speed, time-stretches to your song and plays cues from pads or keys.",
        },
        {
            id: "sketchpad", name: "Sketchpad", kind: "tool", file: "plugins/sketchpad.js", alt: "MidiSketch", icon: "Sk", color: "#c792ea", sizeKB: 36,
            blurb: "Sketch ideas fast: draw a melody line and it snaps to your scale, build chord progressions, bass lines and arps, then drop them straight into patterns.",
        },
        {
            id: "utawa", name: "Utawa", kind: "instrument", file: "plugins/utawa.js", alt: "VOCALOID 6", icon: "Ut", color: "#ff7eb6", sizeKB: 92,
            blurb: "Singing synthesizer: type lyrics (English, Japanese romaji, Spanish or Chinese pinyin) and every note sings the next syllable, glides between notes, with consonants, vowels, vibrato, scoops, breath, choir unison and nine voice presets.",
        },
        {
            id: "sweeplab", name: "Sweep Lab", kind: "tool", file: "plugins/sweeplab.js", alt: "FL Studio transition FX", icon: "SL", color: "#4fc3f7", sizeKB: 18,
            blurb: "FX sweeps on the beat: 14 risers, uplifters, Shepard rises, snare rolls, drop builds, reverse cymbals, whooshes, tape stops, downlifters, sub drops, impacts and lasers. Shape them, hear them, then drop them into the song so they end exactly on the bar (or start on it), once or every few bars.",
        },
        {
            id: "liveloops", name: "Live Loops", kind: "tool", file: "plugins/liveloops.js", alt: "GarageBand Live Loops", icon: "LL", color: "#2ecc71", sizeKB: 47,
            blurb: "A 16 x 16 loop launcher with 1,248 loops in 24 genres, composed at your song's tempo and key. Launch cells and scenes, then record the performance into the song.",
        },
        {
            id: "bouncify", name: "Bouncify", kind: "tool", file: "plugins/bouncify.js", icon: "Bc", color: "#ffd166", sizeKB: 19,
            blurb: "Makes a lead, bass or any part bouncy: staccato, swing, octave hops, accents, pitch scoops, bouncing-ball echoes, chops, pushes and an optional sidechain pump. Eight styles, one undo step.",
        },
        {
            id: "audiomidi", name: "AudioMidi", kind: "tool", file: "plugins/audiomidi.js", icon: "AM", color: "#00c8ff", sizeKB: 220,
            blurb: "Turns a WAV, MP3, OGG or FLAC into a song: finds the tempo (even when it drifts), beat, meter and key, hears every drum hit and matches it to the closest CarrotBox drum, and writes the bass, lead and chords as notes with velocity, glides and bends (the original stays muted on its own channel for A/B).",
        },
        {
            id: "replica", name: "Replica", kind: "instrument", file: "plugins/replica.js", icon: "Rp", color: "#7fdbff", sizeKB: 58,
            blurb: "Instruments rebuilt from a recording (AudioMidi measures them): the harmonics of a note at ten moments, its level curve, release, breath noise and vibrato, played back as morphing wavetables in up to two key zones; drums rebuilt as a sweeping body plus 32 noise bands. Everything is editable (draw harmonics, reshape drums) and can be kept in My instruments.",
        },
        {
            id: "curvebox", name: "Curvebox", kind: "effect", file: "plugins/curvebox.js", alt: "ShaperBox 3", icon: "Cv", color: "#ffd54f", sizeKB: 64,
            blurb: "Draw the movement: 11 shapers (Time, Pitch, Filter, Liquid, Drive, Crush, Noise, Volume, Pan, Width and Reverb), each with its own curve that loops with the song or restarts on every hit, with swing, smoothing and low/mid/high band processing. 24 presets, from sidechain pumps and trance gates to tape stops and dub throws.",
        },
        {
            id: "spstation", name: "SP Station", kind: "instrument", file: "plugins/spstation.js", alt: "SP-404MKII", icon: "SP", color: "#e34234", sizeKB: 177,
            blurb: "The plugin for the Roland SP-404MKII (works while one is connected): a working copy of its panel with 160 pads in 10 banks, sample modes and editing, sampling, resampling and skip-back, 4 buses with 44 effects, the pattern sequencer with TR-REC, DJ mode, every SHIFT + pad function and projects. Mirrors the device's pads, banks, knobs and patterns over USB MIDI, and patterns can be written into the song.",
        },
        {
            id: "mangler", name: "Mangler FX", kind: "effect", file: "plugins/mangler.js", alt: "UGFX", icon: "Mg", color: "#f78c6c", sizeKB: 25,
            blurb: "Creative multi-effect rack: chain up to 8 effects (distortion, crusher, filter sweeps, chorus, phaser, flanger, delay, reverb, glitch repeats, tape stop...) with macros and presets.",
        },
    ];
    const CARROT_BUILTIN_PLUGINS = [
        { name: "Sampler", kind: "instrument", icon: "Sm", blurb: "Plays any sample across the keyboard, with loop points, reverse and lo-fi mode." },
        { name: "3x Osc", kind: "instrument", icon: "3x", blurb: "Classic three-oscillator synth." },
        { name: "FPC", kind: "instrument", icon: "FP", blurb: "12 drum pads with choke groups." },
        { name: "Slicex", kind: "instrument", icon: "Sx", blurb: "Chops loops into slices across the keyboard." },
        { name: "Parametric EQ 2", kind: "effect", icon: "EQ", blurb: "7-band EQ with analyzer." },
        { name: "Gross Beat", kind: "effect", icon: "GB", blurb: "Beat-synced volume gates, stutters and time effects." },
        { name: "Soundgoodizer", kind: "effect", icon: "Sg", blurb: "One-knob compressor/maximizer." },
    ];
    class CarrotPlugins {
        static info(id) {
            return CARROT_PLUGIN_CATALOG.find(p => p.id == id) || null;
        }
        static installedIds() {
            let ids = null;
            try {
                const stored = window.localStorage.getItem("carrotPluginsInstalled");
                if (stored != null)
                    ids = JSON.parse(stored);
            }
            catch (error) { }
            if (!Array.isArray(ids))
                ids = CARROT_PLUGIN_CATALOG.map(p => p.id);
            else {
                // Plugins added to CarrotBox after the list was saved are installed by default too.
                let seen = null;
                try {
                    seen = JSON.parse(window.localStorage.getItem("carrotPluginsSeen") || "null");
                }
                catch (error) { }
                if (!Array.isArray(seen))
                    seen = ["swarm", "prism", "seedling", "chopshop", "sketchpad", "mangler"];
                const fresh = CARROT_PLUGIN_CATALOG.map(p => p.id).filter(id => !seen.includes(id) && !ids.includes(id));
                if (fresh.length > 0) {
                    ids = ids.concat(fresh);
                    CarrotPlugins._saveInstalled(ids);
                }
            }
            return ids.filter(id => CarrotPlugins.info(id) != null);
        }
        static _saveInstalled(ids) {
            try {
                window.localStorage.setItem("carrotPluginsSeen", JSON.stringify(CARROT_PLUGIN_CATALOG.map(p => p.id)));
                window.localStorage.setItem("carrotPluginsInstalled", JSON.stringify(ids));
            }
            catch (error) { }
        }
        static isInstalled(id) {
            return CarrotPlugins.installedIds().indexOf(id) != -1;
        }
        static isLoaded(id) {
            return CarrotPlugins._defs.has(id);
        }
        // The registered plugin, or null when it isn't installed/loaded yet.
        static get(id) {
            return CarrotPlugins._defs.get(id) || null;
        }
        static loaded(kind = null) {
            const result = [];
            for (const info of CARROT_PLUGIN_CATALOG) {
                const def = CarrotPlugins._defs.get(info.id);
                if (def && (kind == null || def.kind == kind))
                    result.push(def);
            }
            return result;
        }
        static install(id) {
            const ids = CarrotPlugins.installedIds();
            if (ids.indexOf(id) == -1) {
                ids.push(id);
                CarrotPlugins._saveInstalled(ids);
            }
            return CarrotPlugins.load(id);
        }
        static uninstall(id) {
            CarrotPlugins._saveInstalled(CarrotPlugins.installedIds().filter(other => other != id));
            CarrotPlugins._defs.delete(id);
            CarrotPlugins._loading.delete(id);
            const script = document.querySelector('script[data-carrot-plugin="' + id + '"]');
            if (script)
                script.remove();
            CarrotPlugins._notify();
        }
        static load(id) {
            if (CarrotPlugins._defs.has(id))
                return Promise.resolve(CarrotPlugins._defs.get(id));
            const pending = CarrotPlugins._loading.get(id);
            if (pending)
                return pending.promise;
            const info = CarrotPlugins.info(id);
            if (info == null)
                return Promise.reject(new Error("Unknown plugin " + id));
            const entry = {};
            entry.promise = new Promise((resolve, reject) => {
                entry.resolve = resolve;
                entry.reject = reject;
            });
            CarrotPlugins._loading.set(id, entry);
            const script = document.createElement("script");
            script.src = info.file + "?v=" + CarrotPlugins.version;
            script.async = true;
            script.setAttribute("data-carrot-plugin", id);
            script.onload = () => {
                if (!CarrotPlugins._defs.has(id)) {
                    CarrotPlugins._loading.delete(id);
                    entry.reject(new Error(info.name + " didn't load correctly."));
                }
            };
            script.onerror = () => {
                CarrotPlugins._loading.delete(id);
                script.remove();
                entry.reject(new Error("Couldn't download " + info.name + ". Make sure the plugins folder sits next to index.html."));
            };
            CarrotPlugins._status = "loading";
            document.head.appendChild(script);
            return entry.promise;
        }
        static loadInstalled() {
            const ids = CarrotPlugins.installedIds();
            return Promise.all(ids.map(id => CarrotPlugins.load(id).catch(error => {
                console.warn(error);
                return null;
            })));
        }
        // Called by plugin files.
        static register(def) {
            if (!def || typeof def.id != "string" || CarrotPlugins.info(def.id) == null)
                throw new Error("CarrotPlugins.register: unknown plugin id");
            const info = CarrotPlugins.info(def.id);
            def.name = def.name || info.name;
            def.kind = info.kind;
            def.icon = def.icon || info.icon;
            def.color = def.color || info.color;
            if (!def.defaultParams)
                def.defaultParams = () => ({});
            if (def.kind == "instrument" && (typeof def.createVoice != "function" || typeof def.render != "function"))
                throw new Error(def.id + ": instruments need createVoice() and render()");
            if (def.kind == "effect" && (typeof def.createState != "function" || typeof def.process != "function"))
                throw new Error(def.id + ": effects need createState() and process()");
            if (!CarrotPlugins.isInstalled(def.id))
                return;
            CarrotPlugins._defs.set(def.id, def);
            const pending = CarrotPlugins._loading.get(def.id);
            CarrotPlugins._loading.delete(def.id);
            if (pending)
                pending.resolve(def);
            CarrotPlugins._notify();
        }
        static onChange(listener) {
            CarrotPlugins._listeners.push(listener);
        }
        static _notify() {
            for (const listener of CarrotPlugins._listeners) {
                try {
                    listener();
                }
                catch (error) {
                    console.error(error);
                }
            }
        }
        static defaultInstrumentId() {
            const loaded = CarrotPlugins.loaded("instrument");
            if (loaded.length > 0)
                return loaded[0].id;
            const installed = CarrotPlugins.installedIds().filter(id => CarrotPlugins.info(id).kind == "instrument");
            return installed.length > 0 ? installed[0] : null;
        }
        static defaultParams(id) {
            const def = CarrotPlugins.get(id);
            return def ? flCloneJson(def.defaultParams()) : {};
        }
        static reportError(plugin, error) {
            const key = (plugin && plugin.id) + ":" + (error && error.message);
            if (CarrotPlugins._reported.has(key))
                return;
            CarrotPlugins._reported.add(key);
            console.error("Plugin " + (plugin && plugin.name) + " failed:", error);
            setTimeout(() => flToast((plugin && plugin.name) + " plugin error: " + (error && error.message)), 0);
        }
        static songPluginIds(song) {
            const ids = new Set();
            for (const channel of song.channels)
                for (const instrument of channel.instruments)
                    instrument.fl.collectPluginIds(instrument.type, ids);
            for (const insert of song.fl.masterInserts)
                ids.add(insert.id);
            return ids;
        }
        static missingForSong(song) {
            const missing = [];
            for (const id of CarrotPlugins.songPluginIds(song)) {
                if (!CarrotPlugins.isLoaded(id))
                    missing.push(id);
            }
            return missing;
        }
    }
    CarrotPlugins.version = "1.0.0";
    CarrotPlugins.catalog = CARROT_PLUGIN_CATALOG;
    CarrotPlugins.builtins = CARROT_BUILTIN_PLUGINS;
    CarrotPlugins._defs = new Map();
    CarrotPlugins._loading = new Map();
    CarrotPlugins._listeners = [];
    CarrotPlugins._reported = new Set();
    // ====================================================================== DSP
    class CarrotDSP {
        static clamp(x, min, max) {
            return x < min ? min : x > max ? max : x;
        }
        static lerp(a, b, t) {
            return a + (b - a) * t;
        }
        static dbToGain(db) {
            return Math.pow(10, db / 20);
        }
        static gainToDb(gain) {
            return 20 * Math.log10(Math.max(1e-9, gain));
        }
        static midiToHz(midi) {
            return 440 * Math.pow(2, (midi - 69) / 12);
        }
        static hzToMidi(hz) {
            return 69 + 12 * Math.log2(Math.max(1e-6, hz) / 440);
        }
        // Maps 0..1 onto min..max exponentially (for frequencies & times).
        static expMap(norm, min, max) {
            return min * Math.pow(max / min, CarrotDSP.clamp(norm, 0, 1));
        }
        static expUnmap(value, min, max) {
            return Math.log(Math.max(min, value) / min) / Math.log(max / min);
        }
        static polyBlep(t, dt) {
            return flPolyBlep(t, dt);
        }
        // Band-limited basic oscillator. shape: 0 sine, 1 triangle, 2 saw, 3 square, 4 pulse(width), 5 noise
        static osc(shape, t, dt, width = 0.5) {
            switch (shape) {
                case 0: return Math.sin(t * 6.283185307179586);
                case 1: return 1 - 4 * Math.abs(t - 0.5);
                case 2: return 2 * t - 1 - flPolyBlep(t, dt);
                case 3: {
                    let v = t < 0.5 ? 1 : -1;
                    v += flPolyBlep(t, dt);
                    v -= flPolyBlep((t + 0.5) % 1, dt);
                    return v;
                }
                case 4: {
                    let v = t < width ? 1 : -1;
                    v += flPolyBlep(t, dt);
                    v -= flPolyBlep((t + 1 - width) % 1, dt);
                    return v - (2 * width - 1);
                }
                case 5: return Math.random() * 2 - 1;
            }
            return 0;
        }
        // LFO shapes on phase 0..1: 0 sine, 1 triangle, 2 saw up, 3 saw down, 4 square, 5 random (needs hold)
        static lfo(shape, t) {
            switch (shape) {
                case 0: return Math.sin(t * 6.283185307179586);
                case 1: return 1 - 4 * Math.abs(t - 0.5);
                case 2: return 2 * t - 1;
                case 3: return 1 - 2 * t;
                case 4: return t < 0.5 ? 1 : -1;
            }
            return 0;
        }
        // In-place radix-2 complex FFT. Inverse divides by n.
        static fft(re, im, inverse = false) {
            const n = re.length;
            for (let i = 1, j = 0; i < n; i++) {
                let bit = n >> 1;
                for (; j & bit; bit >>= 1)
                    j ^= bit;
                j ^= bit;
                if (i < j) {
                    let t = re[i];
                    re[i] = re[j];
                    re[j] = t;
                    t = im[i];
                    im[i] = im[j];
                    im[j] = t;
                }
            }
            for (let len = 2; len <= n; len <<= 1) {
                const angle = 2 * Math.PI / len * (inverse ? 1 : -1);
                const wlr = Math.cos(angle), wli = Math.sin(angle);
                const half = len >> 1;
                for (let i = 0; i < n; i += len) {
                    let wr = 1, wi = 0;
                    for (let j = 0; j < half; j++) {
                        const a = i + j, b = a + half;
                        const vr = re[b] * wr - im[b] * wi;
                        const vi = re[b] * wi + im[b] * wr;
                        re[b] = re[a] - vr;
                        im[b] = im[a] - vi;
                        re[a] += vr;
                        im[a] += vi;
                        const nwr = wr * wlr - wi * wli;
                        wi = wr * wli + wi * wlr;
                        wr = nwr;
                    }
                }
            }
            if (inverse) {
                for (let i = 0; i < n; i++) {
                    re[i] /= n;
                    im[i] /= n;
                }
            }
        }
        // Magnitude spectrum frames (Hann window) of a mono signal.
        static spectrogram(pcm, frameSize, hop, maxFrames = 1e9) {
            const frames = [];
            const hann = new Float64Array(frameSize);
            for (let i = 0; i < frameSize; i++)
                hann[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / frameSize);
            const re = new Float64Array(frameSize), im = new Float64Array(frameSize);
            for (let start = 0; start + frameSize <= pcm.length && frames.length < maxFrames; start += hop) {
                for (let i = 0; i < frameSize; i++) {
                    re[i] = pcm[start + i] * hann[i];
                    im[i] = 0;
                }
                CarrotDSP.fft(re, im, false);
                const mags = new Float32Array(frameSize >> 1);
                for (let k = 0; k < mags.length; k++)
                    mags[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
                frames.push(mags);
            }
            return frames;
        }
        // Rough fundamental estimate (Hz) via normalized autocorrelation.
        static detectPitch(pcm, sampleRate, start = 0, length = 4096) {
            const n = Math.min(length, pcm.length - start);
            if (n < 256)
                return null;
            const minLag = Math.floor(sampleRate / 1500), maxLag = Math.min(n >> 1, Math.floor(sampleRate / 40));
            let bestLag = -1, best = 0;
            let energy = 0;
            for (let i = 0; i < n; i++)
                energy += pcm[start + i] * pcm[start + i];
            if (energy < 1e-6)
                return null;
            const scores = new Float64Array(maxLag + 2);
            for (let lag = minLag; lag <= maxLag; lag++) {
                let sum = 0;
                for (let i = 0; i + lag < n; i++)
                    sum += pcm[start + i] * pcm[start + i + lag];
                scores[lag] = sum / energy;
            }
            const peak = Math.max(...scores.subarray(minLag, maxLag + 1));
            for (let lag = minLag + 1; lag < maxLag; lag++) {
                if (scores[lag] > peak * 0.86 && scores[lag] >= scores[lag - 1] && scores[lag] >= scores[lag + 1]) {
                    bestLag = lag;
                    best = scores[lag];
                    break;
                }
            }
            if (bestLag < 0 || best < 0.3)
                return null;
            const a = scores[bestLag - 1], b = scores[bestLag], c = scores[bestLag + 1];
            const offset = (a - c) / (2 * (a - 2 * b + c) || 1);
            return sampleRate / (bestLag + offset);
        }
        // Deterministic pseudo random numbers (mulberry32).
        static rng(seed) {
            let a = seed >>> 0;
            return () => {
                a = (a + 0x6D2B79F5) >>> 0;
                let t = a;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }
    }
    // Linear-attack, exponential decay/release envelope. Times in seconds.
    class CarrotADSR {
        constructor() {
            this.stage = 0;
            this.level = 0;
            this.attackInc = 1;
            this.decayCoef = 0;
            this.releaseCoef = 0;
            this.sustain = 1;
        }
        set(attack, decay, sustain, release, sampleRate) {
            this.attackInc = 1 / (Math.max(0.0008, attack) * sampleRate);
            this.decayCoef = Math.exp(-4.6 / (Math.max(0.002, decay) * sampleRate));
            this.sustain = sustain;
            this.releaseCoef = Math.exp(-4.6 / (Math.max(0.003, release) * sampleRate));
        }
        trigger() {
            this.stage = 1;
        }
        release() {
            if (this.stage != 0 && this.stage != 4)
                this.stage = 4;
        }
        next() {
            switch (this.stage) {
                case 1:
                    this.level += this.attackInc;
                    if (this.level >= 1) {
                        this.level = 1;
                        this.stage = 2;
                    }
                    break;
                case 2:
                    this.level = this.sustain + (this.level - this.sustain) * this.decayCoef;
                    if (Math.abs(this.level - this.sustain) < 1e-4) {
                        this.level = this.sustain;
                        this.stage = 3;
                    }
                    break;
                case 3:
                    this.level = this.sustain;
                    if (this.sustain <= 0.0001) {
                        this.stage = 0;
                        this.level = 0;
                    }
                    break;
                case 4:
                    this.level *= this.releaseCoef;
                    if (this.level < 1e-4) {
                        this.level = 0;
                        this.stage = 0;
                    }
                    break;
            }
            return this.level;
        }
        get done() {
            return this.stage == 0;
        }
    }
    // Topology-preserving state variable filter.
    // modes: 0 low pass, 1 high pass, 2 band pass, 3 notch, 4 peak
    class CarrotSVF {
        constructor() {
            this.ic1 = 0;
            this.ic2 = 0;
            this.a1 = 1;
            this.a2 = 0;
            this.a3 = 0;
            this.k = 2;
        }
        set(cutoff, resonance, sampleRate) {
            const fc = Math.max(12, Math.min(cutoff, sampleRate * 0.47));
            const g = Math.tan(Math.PI * fc / sampleRate);
            this.k = 2 - 1.96 * Math.max(0, Math.min(1, resonance));
            this.a1 = 1 / (1 + g * (g + this.k));
            this.a2 = g * this.a1;
            this.a3 = g * this.a2;
        }
        process(v0, mode) {
            const v3 = v0 - this.ic2;
            const v1 = this.a1 * this.ic1 + this.a2 * v3;
            const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
            this.ic1 = 2 * v1 - this.ic1;
            this.ic2 = 2 * v2 - this.ic2;
            switch (mode) {
                case 0: return v2;
                case 1: return v0 - this.k * v1 - v2;
                case 2: return v1 * this.k;
                case 3: return v0 - this.k * v1;
                default: return v0 - this.k * v1 - 2 * v2;
            }
        }
        reset() {
            this.ic1 = this.ic2 = 0;
        }
    }
    class CarrotBiquad {
        constructor() {
            this.c = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
            this.x1 = this.x2 = this.y1 = this.y2 = 0;
        }
        set(type, freq, gainDb, q, sampleRate) {
            flBiquad(type, freq, gainDb, q, sampleRate, this.c);
        }
        process(x) {
            const c = this.c;
            const y = c.b0 * x + c.b1 * this.x1 + c.b2 * this.x2 - c.a1 * this.y1 - c.a2 * this.y2;
            this.x2 = this.x1;
            this.x1 = x;
            this.y2 = this.y1;
            this.y1 = y;
            return y;
        }
    }
    // Simple circular delay line with fractional reads.
    class CarrotDelayLine {
        constructor(maxSamples) {
            let size = 1;
            while (size < maxSamples + 4)
                size <<= 1;
            this.data = new Float32Array(size);
            this.mask = size - 1;
            this.pos = 0;
        }
        write(x) {
            this.data[this.pos] = x;
            this.pos = (this.pos + 1) & this.mask;
        }
        // delay in samples (>= 1)
        read(delay) {
            const p = this.pos - delay;
            const i = Math.floor(p);
            const f = p - i;
            const a = this.data[i & this.mask], b = this.data[(i + 1) & this.mask];
            return a + (b - a) * f;
        }
        clear() {
            this.data.fill(0);
        }
    }
    // Band-limited wavetables built from harmonic series. Every frame keeps a
    // few copies with fewer and fewer harmonics, and playback picks the copy
    // that fits the note's frequency, so wavetable synths never alias.
    class CarrotWavetable {
        // amps[h - 1] is the amplitude of harmonic h, phases[h - 1] its phase (radians).
        static build(amps, phases = null, normalize = true) {
            const N = CarrotWavetable.size;
            const mips = [];
            const re = new Float64Array(N), im = new Float64Array(N);
            let scale = 1;
            for (let m = 0; m < CarrotWavetable.mipCount; m++) {
                re.fill(0);
                im.fill(0);
                const maxHarmonic = Math.max(1, (N >> 2) >> m);
                const count = Math.min(amps.length, maxHarmonic);
                for (let h = 1; h <= count; h++) {
                    const a = amps[h - 1];
                    if (!a)
                        continue;
                    const ph = phases ? (phases[h - 1] || 0) : 0;
                    const k = N * a * 0.5;
                    const sn = Math.sin(ph), cs = Math.cos(ph);
                    re[h] = k * sn;
                    im[h] = -k * cs;
                    re[N - h] = k * sn;
                    im[N - h] = k * cs;
                }
                CarrotDSP.fft(re, im, true);
                const table = new Float32Array(N + 1);
                for (let i = 0; i < N; i++)
                    table[i] = re[i];
                if (m == 0) {
                    let peak = 0;
                    for (let i = 0; i < N; i++)
                        peak = Math.max(peak, Math.abs(table[i]));
                    scale = (normalize && peak > 1e-9) ? 1 / peak : 1;
                }
                for (let i = 0; i < N; i++)
                    table[i] *= scale;
                table[N] = table[0];
                mips.push(table);
            }
            return mips;
        }
        // Harmonic amplitudes for common shapes (index 0 = fundamental).
        static shape(name, count = 128) {
            const amps = new Float64Array(count);
            const phases = new Float64Array(count);
            for (let h = 1; h <= count; h++) {
                switch (name) {
                    case "sine":
                        amps[h - 1] = h == 1 ? 1 : 0;
                        break;
                    case "saw":
                        amps[h - 1] = 1 / h;
                        phases[h - 1] = Math.PI;
                        break;
                    case "square":
                        amps[h - 1] = (h & 1) ? 1 / h : 0;
                        break;
                    case "triangle":
                        amps[h - 1] = (h & 1) ? 1 / (h * h) : 0;
                        phases[h - 1] = ((h - 1) >> 1) & 1 ? Math.PI : 0;
                        break;
                }
            }
            return { amps, phases };
        }
        // The mip level to use for a phase increment (cycles per sample).
        static mipFor(dt) {
            const m = Math.ceil(Math.log2(Math.max(1e-9, dt) * 1024));
            return m < 0 ? 0 : m >= CarrotWavetable.mipCount ? CarrotWavetable.mipCount - 1 : m;
        }
        // phase must be in [0, 1).
        static read(mips, mip, phase) {
            const table = mips[mip];
            const pos = phase * 2048;
            const i = (pos | 0) & 2047;
            const f = pos - Math.floor(pos);
            return table[i] + (table[i + 1] - table[i]) * f;
        }
    }
    CarrotWavetable.size = 2048;
    CarrotWavetable.mipCount = 10;
    // A morphable set of wavetable frames.
    class CarrotWavetableBank {
        constructor(frames) {
            this.frames = frames;
        }
        get count() {
            return this.frames.length;
        }
        // position 0..1 across the frames.
        read(position, phase, mip) {
            const n = this.frames.length;
            if (n == 1)
                return CarrotWavetable.read(this.frames[0], mip, phase);
            const x = Math.max(0, Math.min(0.999999, position)) * (n - 1);
            const i = x | 0;
            const f = x - i;
            const a = CarrotWavetable.read(this.frames[i], mip, phase);
            if (f < 1e-4)
                return a;
            return a + (CarrotWavetable.read(this.frames[i + 1], mip, phase) - a) * f;
        }
    }
    // ============================================================== FX engine
    // Note values for beat-synced parameters, in beats.
    const CARROT_SYNC_DIVISIONS = [
        ["1/64", 1 / 16], ["1/32", 1 / 8], ["1/16T", 1 / 6], ["1/16", 1 / 4], ["1/16D", 3 / 8], ["1/8T", 1 / 3], ["1/8", 1 / 2], ["1/8D", 3 / 4],
        ["1/4T", 2 / 3], ["1/4", 1], ["1/4D", 1.5], ["1/2", 2], ["1/2D", 3], ["1 bar", 4], ["2 bars", 8], ["4 bars", 16],
    ];
    function carrotSyncOptions() {
        return CARROT_SYNC_DIVISIONS.map(d => d[0]);
    }
    function carrotSyncBeats(index) {
        const d = CARROT_SYNC_DIVISIONS[Math.max(0, Math.min(CARROT_SYNC_DIVISIONS.length - 1, index | 0))];
        return d[1];
    }
    // Each effect: name, params (key,label,min,max,def,unit,curve|options), and a class with process().
    class CarrotFX {
        static defaults(type) {
            const def = CarrotFX.types[type];
            const o = { type: type, on: true };
            if (!def)
                return o;
            for (const p of def.params)
                o[p.key] = p.def;
            return o;
        }
        static createState(type, sampleRate) {
            const def = CarrotFX.types[type];
            return def ? new def.impl(sampleRate) : null;
        }
        // Runs a chain of effect slots ({type,on,...params}). `states` holds one state per slot.
        static processChain(states, chain, left, right, start, end, ctx) {
            if (!Array.isArray(chain))
                return;
            for (let i = 0; i < chain.length; i++) {
                const slot = chain[i];
                if (!slot || !CarrotFX.types[slot.type]) {
                    states[i] = null;
                    continue;
                }
                let state = states[i];
                if (state == null || state.type != slot.type || state.sampleRate != ctx.sampleRate) {
                    state = states[i] = { type: slot.type, sampleRate: ctx.sampleRate, fx: CarrotFX.createState(slot.type, ctx.sampleRate) };
                }
                if (slot.on === false)
                    continue;
                state.fx.process(slot, left, right, start, end, ctx);
            }
            states.length = chain.length;
        }
        // Reads a parameter with its default as fallback.
        static p(params, type, key) {
            const value = params[key];
            if (typeof value == "number" && Number.isFinite(value))
                return value;
            const def = CarrotFX.types[type].params.find(p => p.key == key);
            return def ? def.def : 0;
        }
        // Offline: run a chain over whole buffers (used by the recorder).
        static renderChain(chain, left, right, sampleRate, bpm = 120) {
            const states = [];
            const block = 256;
            const ctx = { sampleRate, beatPos: 0, samplesPerBeat: sampleRate * 60 / bpm, bpm, beatsPerBar: 4, playing: true };
            for (let start = 0; start < left.length; start += block) {
                const end = Math.min(left.length, start + block);
                ctx.beatPos = start / ctx.samplesPerBeat;
                CarrotFX.processChain(states, chain, left, right, start, end, ctx);
            }
        }
    }
    function carrotMix(dry, wet, mix) {
        return dry + (wet - dry) * mix;
    }
    class CarrotFXDistortion {
        constructor(sampleRate) {
            this.sampleRate = sampleRate;
            this.lpL = 0;
            this.lpR = 0;
            // 2x oversampling (the previous input, for the in-between sample) and a DC blocker
            this.xL = 0;
            this.xR = 0;
            this.dcxL = this.dcyL = this.dcxR = this.dcyR = 0;
        }
        static shape(mode, x) {
            switch (mode) {
                case 0: return Math.tanh(x);
                case 1: return x > 1 ? 1 : x < -1 ? -1 : x;
                case 2: return x >= 0 ? Math.tanh(x * 1.2) : Math.tanh(x * 0.6) * 0.9;
                case 3: {
                    let y = x;
                    for (let i = 0; i < 6 && (y > 1 || y < -1); i++)
                        y = y > 1 ? 2 - y : -2 - y;
                    return y;
                }
                case 4: return Math.abs(x) * 1.6 - 0.6;
                case 5: return Math.sin(x * 1.5707963);
            }
            return x;
        }
        process(p, L, R, start, end, ctx) {
            const mode = p.mode | 0;
            const drive = CarrotDSP.dbToGain(CarrotFX.p(p, "distortion", "drive"));
            const out = CarrotDSP.dbToGain(CarrotFX.p(p, "distortion", "out")) / Math.max(1, Math.sqrt(drive) * 0.7);
            const tone = CarrotFX.p(p, "distortion", "tone");
            const coef = 1 - Math.exp(-2 * Math.PI * tone / ctx.sampleRate);
            const mix = CarrotFX.p(p, "distortion", "mix");
            // The shaper runs at twice the rate (the in-between sample interpolated, the two results
            // averaged), which keeps the harmonics it makes above the top of the spectrum from folding
            // back down as harsh aliasing; a DC blocker takes out the offset of the uneven shapers.
            const shape = CarrotFXDistortion.shape, dc = 1 - 2 * Math.PI * 12 / ctx.sampleRate;
            let lpL = this.lpL, lpR = this.lpR, xL = this.xL, xR = this.xR;
            let dcxL = this.dcxL, dcyL = this.dcyL, dcxR = this.dcxR, dcyR = this.dcyR;
            for (let i = start; i < end; i++) {
                const l = L[i], r = R[i];
                const sl = 0.5 * (shape(mode, (xL + l) * 0.5 * drive) + shape(mode, l * drive));
                const sr = 0.5 * (shape(mode, (xR + r) * 0.5 * drive) + shape(mode, r * drive));
                xL = l;
                xR = r;
                dcyL = sl - dcxL + dc * dcyL;
                dcxL = sl;
                dcyR = sr - dcxR + dc * dcyR;
                dcxR = sr;
                lpL += (dcyL - lpL) * coef;
                lpR += (dcyR - lpR) * coef;
                L[i] = carrotMix(l, lpL * out, mix);
                R[i] = carrotMix(r, lpR * out, mix);
            }
            this.lpL = lpL;
            this.lpR = lpR;
            this.xL = xL;
            this.xR = xR;
            this.dcxL = dcxL;
            this.dcyL = dcyL;
            this.dcxR = dcxR;
            this.dcyR = dcyR;
        }
    }
    class CarrotFXCrusher {
        constructor(sampleRate) {
            this.holdL = 0;
            this.holdR = 0;
            this.counter = 0;
        }
        process(p, L, R, start, end, ctx) {
            const bits = CarrotFX.p(p, "crusher", "bits");
            const steps = Math.pow(2, bits - 1);
            const down = Math.max(1, CarrotFX.p(p, "crusher", "rate"));
            const mix = CarrotFX.p(p, "crusher", "mix");
            for (let i = start; i < end; i++) {
                this.counter += 1;
                if (this.counter >= down) {
                    this.counter -= down;
                    this.holdL = Math.round(L[i] * steps) / steps;
                    this.holdR = Math.round(R[i] * steps) / steps;
                }
                L[i] = carrotMix(L[i], this.holdL, mix);
                R[i] = carrotMix(R[i], this.holdR, mix);
            }
        }
    }
    class CarrotFXFilter {
        constructor(sampleRate) {
            this.l1 = new CarrotSVF();
            this.l2 = new CarrotSVF();
            this.r1 = new CarrotSVF();
            this.r2 = new CarrotSVF();
        }
        process(p, L, R, start, end, ctx) {
            const mode = p.mode | 0;
            const cutoff = CarrotFX.p(p, "filter", "cutoff");
            const res = CarrotFX.p(p, "filter", "res");
            const lfoDepth = CarrotFX.p(p, "filter", "lfo");
            const lfoBeats = carrotSyncBeats(p.rate != undefined ? p.rate : 13);
            const mix = CarrotFX.p(p, "filter", "mix");
            const svfMode = [0, 0, 1, 2, 3][mode];
            const cascade = mode == 1;
            for (let block = start; block < end; block += 32) {
                const blockEnd = Math.min(end, block + 32);
                const beat = ctx.beatPos + (block - start) / ctx.samplesPerBeat;
                const lfo = lfoDepth > 0 ? Math.sin(2 * Math.PI * beat / lfoBeats) : 0;
                const f = cutoff * Math.pow(2, lfo * lfoDepth * 4);
                this.l1.set(f, res, ctx.sampleRate);
                this.r1.set(f, res, ctx.sampleRate);
                if (cascade) {
                    this.l2.set(f, res * 0.5, ctx.sampleRate);
                    this.r2.set(f, res * 0.5, ctx.sampleRate);
                }
                for (let i = block; i < blockEnd; i++) {
                    let l = this.l1.process(L[i], svfMode);
                    let r = this.r1.process(R[i], svfMode);
                    if (cascade) {
                        l = this.l2.process(l, 0);
                        r = this.r2.process(r, 0);
                    }
                    L[i] = carrotMix(L[i], l, mix);
                    R[i] = carrotMix(R[i], r, mix);
                }
            }
        }
    }
    class CarrotFXModDelay {
        constructor(sampleRate, kind) {
            this.kind = kind;
            this.dl = new CarrotDelayLine(Math.ceil(sampleRate * 0.06));
            this.dr = new CarrotDelayLine(Math.ceil(sampleRate * 0.06));
            this.phase = 0;
            this.fbL = 0;
            this.fbR = 0;
        }
        process(p, L, R, start, end, ctx) {
            const type = this.kind;
            const rate = CarrotFX.p(p, type, "rate");
            const depth = CarrotFX.p(p, type, "depth");
            const feedback = CarrotFX.p(p, type, "feedback");
            const mix = CarrotFX.p(p, type, "mix");
            const sr = ctx.sampleRate;
            const baseMs = type == "chorus" ? CarrotFX.p(p, type, "delay") : 0.6;
            const depthMs = type == "chorus" ? depth * 7 : depth * 6;
            const inc = rate / sr;
            let phase = this.phase;
            for (let i = start; i < end; i++) {
                const lfoL = Math.sin(phase * 6.283185307179586);
                const lfoR = Math.sin((phase + 0.25) * 6.283185307179586);
                const dL = Math.max(1, (baseMs + depthMs * (0.5 + 0.5 * lfoL)) * sr / 1000);
                const dR = Math.max(1, (baseMs + depthMs * (0.5 + 0.5 * lfoR)) * sr / 1000);
                const l = L[i], r = R[i];
                this.dl.write(l + this.fbL * feedback);
                this.dr.write(r + this.fbR * feedback);
                const wl = this.dl.read(dL), wr = this.dr.read(dR);
                this.fbL = wl;
                this.fbR = wr;
                if (type == "chorus") {
                    L[i] = l * (1 - mix * 0.5) + wl * mix * 0.7;
                    R[i] = r * (1 - mix * 0.5) + wr * mix * 0.7;
                }
                else {
                    L[i] = carrotMix(l, (l + wl) * 0.6, mix);
                    R[i] = carrotMix(r, (r + wr) * 0.6, mix);
                }
                phase += inc;
                if (phase >= 1)
                    phase -= 1;
            }
            this.phase = phase;
        }
    }
    class CarrotFXPhaser {
        constructor(sampleRate) {
            this.stL = new Float64Array(12);
            this.stR = new Float64Array(12);
            this.phase = 0;
            this.fbL = 0;
            this.fbR = 0;
        }
        process(p, L, R, start, end, ctx) {
            const rate = CarrotFX.p(p, "phaser", "rate");
            const depth = CarrotFX.p(p, "phaser", "depth");
            const feedback = CarrotFX.p(p, "phaser", "feedback");
            const stages = [4, 6, 8, 12][p.stages | 0] || 6;
            const mix = CarrotFX.p(p, "phaser", "mix");
            const sr = ctx.sampleRate;
            const inc = rate / sr;
            let phase = this.phase;
            const stL = this.stL, stR = this.stR;
            for (let i = start; i < end; i++) {
                const lfoL = 0.5 + 0.5 * Math.sin(phase * 6.283185307179586);
                const lfoR = 0.5 + 0.5 * Math.sin((phase + 0.2) * 6.283185307179586);
                const fL = 200 * Math.pow(30, lfoL * depth + (1 - depth) * 0.3);
                const fR = 200 * Math.pow(30, lfoR * depth + (1 - depth) * 0.3);
                const tL = Math.tan(Math.PI * Math.min(fL, sr * 0.45) / sr);
                const tR = Math.tan(Math.PI * Math.min(fR, sr * 0.45) / sr);
                const aL = (tL - 1) / (tL + 1), aR = (tR - 1) / (tR + 1);
                let xl = L[i] + this.fbL * feedback, xr = R[i] + this.fbR * feedback;
                for (let s = 0; s < stages; s++) {
                    const yl = aL * xl + stL[s];
                    stL[s] = xl - aL * yl;
                    xl = yl;
                    const yr = aR * xr + stR[s];
                    stR[s] = xr - aR * yr;
                    xr = yr;
                }
                this.fbL = Math.tanh(xl);
                this.fbR = Math.tanh(xr);
                L[i] = carrotMix(L[i], (L[i] + xl) * 0.6, mix);
                R[i] = carrotMix(R[i], (R[i] + xr) * 0.6, mix);
                phase += inc;
                if (phase >= 1)
                    phase -= 1;
            }
            this.phase = phase;
        }
    }
    class CarrotFXDelay {
        constructor(sampleRate) {
            this.dl = new CarrotDelayLine(Math.ceil(sampleRate * 4.2));
            this.dr = new CarrotDelayLine(Math.ceil(sampleRate * 4.2));
            this.lpL = 0;
            this.lpR = 0;
            this.smoothDelay = 0;
        }
        process(p, L, R, start, end, ctx) {
            const beats = carrotSyncBeats(p.time != undefined ? p.time : 7);
            const target = Math.min(ctx.sampleRate * 4, beats * ctx.samplesPerBeat);
            if (this.smoothDelay == 0)
                this.smoothDelay = target;
            const feedback = CarrotFX.p(p, "delay", "feedback");
            const ping = (p.pingpong | 0) == 1;
            const tone = CarrotFX.p(p, "delay", "tone");
            const coef = 1 - Math.exp(-2 * Math.PI * tone / ctx.sampleRate);
            const mix = CarrotFX.p(p, "delay", "mix");
            for (let i = start; i < end; i++) {
                this.smoothDelay += (target - this.smoothDelay) * 0.0005;
                const d = Math.max(1, this.smoothDelay);
                const wl = this.dl.read(d), wr = this.dr.read(d);
                this.lpL += (wl - this.lpL) * coef;
                this.lpR += (wr - this.lpR) * coef;
                const l = L[i], r = R[i];
                if (ping) {
                    this.dl.write((l + r) * 0.5 + this.lpR * feedback);
                    this.dr.write(this.lpL * feedback);
                }
                else {
                    this.dl.write(l + this.lpL * feedback);
                    this.dr.write(r + this.lpR * feedback);
                }
                L[i] = l + wl * mix;
                R[i] = r + wr * mix;
            }
        }
    }
    // Freeverb-style reverb.
    class CarrotFXReverb {
        constructor(sampleRate) {
            const scale = sampleRate / 44100;
            const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
            const allpasses = [556, 441, 341, 225];
            const spread = 23;
            this.combL = combs.map(n => ({ buf: new Float32Array(Math.round(n * scale)), pos: 0, store: 0 }));
            this.combR = combs.map(n => ({ buf: new Float32Array(Math.round((n + spread) * scale)), pos: 0, store: 0 }));
            this.apL = allpasses.map(n => ({ buf: new Float32Array(Math.round(n * scale)), pos: 0 }));
            this.apR = allpasses.map(n => ({ buf: new Float32Array(Math.round((n + spread) * scale)), pos: 0 }));
            this.pre = new CarrotDelayLine(Math.ceil(sampleRate * 0.25));
            this.preR = new CarrotDelayLine(Math.ceil(sampleRate * 0.25));
        }
        static comb(c, input, feedback, damp) {
            const out = c.buf[c.pos];
            c.store = out * (1 - damp) + c.store * damp;
            c.buf[c.pos] = input + c.store * feedback;
            if (++c.pos >= c.buf.length)
                c.pos = 0;
            return out;
        }
        static allpass(a, input) {
            const buffered = a.buf[a.pos];
            const out = buffered - input;
            a.buf[a.pos] = input + buffered * 0.5;
            if (++a.pos >= a.buf.length)
                a.pos = 0;
            return out;
        }
        process(p, L, R, start, end, ctx) {
            const size = CarrotFX.p(p, "reverb", "size");
            const damp = CarrotFX.p(p, "reverb", "damp") * 0.4;
            const width = CarrotFX.p(p, "reverb", "width");
            const mix = CarrotFX.p(p, "reverb", "mix");
            const predelay = Math.max(1, CarrotFX.p(p, "reverb", "predelay") * ctx.sampleRate / 1000);
            const feedback = 0.7 + size * 0.28;
            const wet1 = width / 2 + 0.5, wet2 = (1 - width) / 2;
            for (let i = start; i < end; i++) {
                this.pre.write(L[i]);
                this.preR.write(R[i]);
                const input = (this.pre.read(predelay) + this.preR.read(predelay)) * 0.015;
                let outL = 0, outR = 0;
                for (let c = 0; c < 8; c++) {
                    outL += CarrotFXReverb.comb(this.combL[c], input, feedback, damp);
                    outR += CarrotFXReverb.comb(this.combR[c], input, feedback, damp);
                }
                for (let a = 0; a < 4; a++) {
                    outL = CarrotFXReverb.allpass(this.apL[a], outL);
                    outR = CarrotFXReverb.allpass(this.apR[a], outR);
                }
                const wl = outL * wet1 + outR * wet2;
                const wr = outR * wet1 + outL * wet2;
                L[i] = L[i] * (1 - mix * 0.4) + wl * mix * 3;
                R[i] = R[i] * (1 - mix * 0.4) + wr * mix * 3;
            }
        }
    }
    // Beat repeat: on random grid steps, loops a tiny slice of audio.
    class CarrotFXGlitch {
        constructor(sampleRate) {
            this.bufL = new Float32Array(Math.ceil(sampleRate * 2));
            this.bufR = new Float32Array(Math.ceil(sampleRate * 2));
            this.write = 0;
            this.step = -1;
            this.active = false;
            this.captureStart = 0;
            this.sinceStep = 0;
            this.fade = 0;
        }
        process(p, L, R, start, end, ctx) {
            const chance = CarrotFX.p(p, "glitch", "chance");
            const grid = [1, 0.5, 0.25, 0.125][p.grid | 0] || 0.25;
            const repeat = [0.25, 0.125, 0.0625, 0.03125][p.repeat | 0] || 0.0625;
            const pitchDrop = CarrotFX.p(p, "glitch", "drop");
            const mix = CarrotFX.p(p, "glitch", "mix");
            const size = this.bufL.length;
            const repeatSamples = Math.max(32, Math.min(size - 1, Math.round(repeat * ctx.samplesPerBeat)));
            const seed = (p.seed | 0) * 7919;
            for (let i = start; i < end; i++) {
                const beat = ctx.beatPos + (i - start) / ctx.samplesPerBeat;
                const step = Math.floor(beat / grid + 1e-9);
                if (step != this.step) {
                    this.step = step;
                    const rand = CarrotDSP.rng((step * 2654435761 + seed) >>> 0)();
                    this.active = rand < chance;
                    this.captureStart = this.write;
                    this.sinceStep = 0;
                }
                const l = L[i], r = R[i];
                this.bufL[this.write] = l;
                this.bufR[this.write] = r;
                this.write = (this.write + 1) % size;
                this.fade += ((this.active ? 1 : 0) - this.fade) * 0.01;
                if (this.fade > 0.001) {
                    const loops = Math.floor(this.sinceStep / repeatSamples);
                    const speed = Math.pow(1 - pitchDrop * 0.12, loops);
                    const offset = Math.floor((this.sinceStep % repeatSamples) * speed);
                    const index = (this.captureStart + offset) % size;
                    const edge = Math.min(1, (this.sinceStep % repeatSamples) / 48, (repeatSamples - this.sinceStep % repeatSamples) / 48);
                    const gl = this.bufL[index] * edge, gr = this.bufR[index] * edge;
                    L[i] = carrotMix(l, gl, this.fade * mix);
                    R[i] = carrotMix(r, gr, this.fade * mix);
                }
                this.sinceStep++;
            }
        }
    }
    // Slows the sound to a halt at the end of every N bars.
    class CarrotFXTapeStop {
        constructor(sampleRate) {
            this.dl = new CarrotDelayLine(Math.ceil(sampleRate * 8));
            this.dr = new CarrotDelayLine(Math.ceil(sampleRate * 8));
        }
        process(p, L, R, start, end, ctx) {
            const every = [1, 2, 4, 8][p.every | 0] || 2;
            const lengthBeats = CarrotFX.p(p, "tapestop", "length");
            const period = every * ctx.beatsPerBar;
            const maxDelay = this.dl.data.length - 8;
            for (let i = start; i < end; i++) {
                const beat = ctx.beatPos + (i - start) / ctx.samplesPerBeat;
                const inPeriod = ((beat % period) + period) % period;
                const stopStart = period - lengthBeats;
                this.dl.write(L[i]);
                this.dr.write(R[i]);
                if (inPeriod > stopStart && ctx.playing) {
                    const u = (inPeriod - stopStart) / lengthBeats;
                    const delay = Math.min(maxDelay, 0.5 * u * u * lengthBeats * ctx.samplesPerBeat + 1);
                    const gain = Math.max(0, 1 - u * u);
                    L[i] = this.dl.read(delay) * gain;
                    R[i] = this.dr.read(delay) * gain;
                }
            }
        }
    }
    class CarrotFXRingMod {
        constructor(sampleRate) {
            this.phase = 0;
        }
        process(p, L, R, start, end, ctx) {
            const freq = CarrotFX.p(p, "ringmod", "freq");
            const mix = CarrotFX.p(p, "ringmod", "mix");
            const inc = freq / ctx.sampleRate;
            for (let i = start; i < end; i++) {
                const m = Math.sin(this.phase * 6.283185307179586);
                L[i] = carrotMix(L[i], L[i] * m, mix);
                R[i] = carrotMix(R[i], R[i] * m, mix);
                this.phase += inc;
                if (this.phase >= 1)
                    this.phase -= 1;
            }
        }
    }
    class CarrotFXTremolo {
        constructor(sampleRate) { }
        process(p, L, R, start, end, ctx) {
            const beats = carrotSyncBeats(p.rate != undefined ? p.rate : 6);
            const depth = CarrotFX.p(p, "tremolo", "depth");
            const shape = p.shape | 0;
            const pan = (p.pan | 0) == 1;
            for (let i = start; i < end; i++) {
                const beat = ctx.beatPos + (i - start) / ctx.samplesPerBeat;
                const t = ((beat / beats) % 1 + 1) % 1;
                const v = shape == 1 ? (t < 0.5 ? 1 : -1) : shape == 2 ? 1 - 2 * t : Math.sin(t * 6.283185307179586);
                if (pan) {
                    const x = v * depth;
                    L[i] *= Math.min(1, 1 - x);
                    R[i] *= Math.min(1, 1 + x);
                }
                else {
                    const g = 1 - depth * (0.5 - 0.5 * v);
                    L[i] *= g;
                    R[i] *= g;
                }
            }
        }
    }
    class CarrotFXCompressor {
        constructor(sampleRate) {
            this.env = 0;
        }
        process(p, L, R, start, end, ctx) {
            const threshold = CarrotFX.p(p, "compressor", "threshold");
            const ratio = CarrotFX.p(p, "compressor", "ratio");
            const attack = Math.exp(-1 / (Math.max(0.1, CarrotFX.p(p, "compressor", "attack")) * 0.001 * ctx.sampleRate));
            const release = Math.exp(-1 / (Math.max(5, CarrotFX.p(p, "compressor", "release")) * 0.001 * ctx.sampleRate));
            const makeup = CarrotDSP.dbToGain(CarrotFX.p(p, "compressor", "makeup"));
            const mix = CarrotFX.p(p, "compressor", "mix");
            let env = this.env;
            for (let i = start; i < end; i++) {
                const level = Math.max(Math.abs(L[i]), Math.abs(R[i]));
                env = level > env ? level + (env - level) * attack : level + (env - level) * release;
                const db = CarrotDSP.gainToDb(env);
                const over = db - threshold;
                const gain = over > 0 ? CarrotDSP.dbToGain(-over * (1 - 1 / ratio)) * makeup : makeup;
                L[i] = carrotMix(L[i], L[i] * gain, mix);
                R[i] = carrotMix(R[i], R[i] * gain, mix);
            }
            this.env = env;
        }
    }
    // Three-band upward/downward compressor ("OTT" style squash).
    class CarrotFXMultiband {
        constructor(sampleRate) {
            this.lowL = new CarrotSVF();
            this.lowR = new CarrotSVF();
            this.highL = new CarrotSVF();
            this.highR = new CarrotSVF();
            this.lowL.set(120, 0, sampleRate);
            this.lowR.set(120, 0, sampleRate);
            this.highL.set(2500, 0, sampleRate);
            this.highR.set(2500, 0, sampleRate);
            this.env = [0, 0, 0];
        }
        process(p, L, R, start, end, ctx) {
            const depth = CarrotFX.p(p, "multiband", "depth");
            const time = CarrotFX.p(p, "multiband", "time");
            const up = CarrotFX.p(p, "multiband", "upward");
            const down = CarrotFX.p(p, "multiband", "downward");
            const out = CarrotDSP.dbToGain(CarrotFX.p(p, "multiband", "out"));
            const coef = Math.exp(-1 / ((2 + time * 120) * 0.001 * ctx.sampleRate));
            const target = 0.18;
            const env = this.env;
            for (let i = start; i < end; i++) {
                const l = L[i], r = R[i];
                const lowL = this.lowL.process(l, 0), lowR = this.lowR.process(r, 0);
                const highL = this.highL.process(l, 1), highR = this.highR.process(r, 1);
                const midL = l - lowL - highL, midR = r - lowR - highR;
                const bands = [[lowL, lowR], [midL, midR], [highL, highR]];
                let sumL = 0, sumR = 0;
                for (let b = 0; b < 3; b++) {
                    const level = Math.max(Math.abs(bands[b][0]), Math.abs(bands[b][1]));
                    env[b] = level + (env[b] - level) * coef;
                    const e = Math.max(1e-5, env[b]);
                    let gain = 1;
                    if (e > target)
                        gain = Math.pow(target / e, down * 0.7);
                    else
                        gain = Math.min(8, Math.pow(target / e, up * 0.5));
                    gain = 1 + (gain - 1) * depth;
                    sumL += bands[b][0] * gain;
                    sumR += bands[b][1] * gain;
                }
                L[i] = Math.tanh(sumL * out);
                R[i] = Math.tanh(sumR * out);
            }
        }
    }
    class CarrotFXWidener {
        constructor(sampleRate) { }
        process(p, L, R, start, end, ctx) {
            const width = CarrotFX.p(p, "widener", "width");
            for (let i = start; i < end; i++) {
                const mid = (L[i] + R[i]) * 0.5, side = (L[i] - R[i]) * 0.5 * width;
                L[i] = mid + side;
                R[i] = mid - side;
            }
        }
    }
    class CarrotFXLofi {
        constructor(sampleRate) {
            this.lpL = 0;
            this.lpR = 0;
            this.wow = 0;
            this.dl = new CarrotDelayLine(Math.ceil(sampleRate * 0.05));
            this.dr = new CarrotDelayLine(Math.ceil(sampleRate * 0.05));
            this.random = CarrotDSP.rng(1234);
        }
        process(p, L, R, start, end, ctx) {
            const crackle = CarrotFX.p(p, "lofi", "crackle");
            const hiss = CarrotFX.p(p, "lofi", "hiss");
            const wowDepth = CarrotFX.p(p, "lofi", "wow");
            const tone = CarrotFX.p(p, "lofi", "tone");
            const mix = CarrotFX.p(p, "lofi", "mix");
            const coef = 1 - Math.exp(-2 * Math.PI * tone / ctx.sampleRate);
            const inc = 0.55 / ctx.sampleRate;
            const rand = this.random;
            for (let i = start; i < end; i++) {
                this.wow += inc;
                if (this.wow >= 1)
                    this.wow -= 1;
                const delay = 2 + (0.5 + 0.5 * Math.sin(this.wow * 6.283185307179586)) * wowDepth * ctx.sampleRate * 0.004;
                this.dl.write(L[i]);
                this.dr.write(R[i]);
                let l = this.dl.read(delay), r = this.dr.read(delay);
                this.lpL += (l - this.lpL) * coef;
                this.lpR += (r - this.lpR) * coef;
                let noise = (rand() * 2 - 1) * hiss * 0.02;
                if (rand() < crackle * 0.0006)
                    noise += (rand() * 2 - 1) * 0.35 * crackle;
                L[i] = carrotMix(L[i], this.lpL + noise, mix);
                R[i] = carrotMix(R[i], this.lpR + noise, mix);
            }
        }
    }
    class CarrotFXEQ3 {
        constructor(sampleRate) {
            this.bands = [0, 1, 2].map(() => [new CarrotBiquad(), new CarrotBiquad()]);
            this.hash = "";
        }
        process(p, L, R, start, end, ctx) {
            const low = CarrotFX.p(p, "eq3", "low"), mid = CarrotFX.p(p, "eq3", "mid"), high = CarrotFX.p(p, "eq3", "high");
            const midFreq = CarrotFX.p(p, "eq3", "midfreq");
            const hash = low + "," + mid + "," + high + "," + midFreq + "," + ctx.sampleRate;
            if (hash != this.hash) {
                this.hash = hash;
                for (const b of this.bands[0])
                    b.set(1, 200, low, 0.71, ctx.sampleRate);
                for (const b of this.bands[1])
                    b.set(2, midFreq, mid, 0.8, ctx.sampleRate);
                for (const b of this.bands[2])
                    b.set(5, 5000, high, 0.71, ctx.sampleRate);
            }
            const active = [low != 0, mid != 0, high != 0];
            for (let i = start; i < end; i++) {
                let l = L[i], r = R[i];
                for (let b = 0; b < 3; b++) {
                    if (!active[b])
                        continue;
                    l = this.bands[b][0].process(l);
                    r = this.bands[b][1].process(r);
                }
                L[i] = l;
                R[i] = r;
            }
        }
    }
    class CarrotFXUtility {
        constructor(sampleRate) { }
        process(p, L, R, start, end, ctx) {
            const gain = CarrotDSP.dbToGain(CarrotFX.p(p, "utility", "gain"));
            const pan = CarrotFX.p(p, "utility", "pan");
            const mono = (p.mono | 0) == 1;
            const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
            for (let i = start; i < end; i++) {
                let l = L[i], r = R[i];
                if (mono)
                    l = r = (l + r) * 0.5;
                L[i] = l * gl;
                R[i] = r * gr;
            }
        }
    }
    class CarrotFXGate {
        constructor(sampleRate) {
            this.env = 0;
            this.gain = 0;
        }
        process(p, L, R, start, end, ctx) {
            const threshold = CarrotDSP.dbToGain(CarrotFX.p(p, "gate", "threshold"));
            const release = Math.exp(-1 / (Math.max(5, CarrotFX.p(p, "gate", "release")) * 0.001 * ctx.sampleRate));
            const attack = Math.exp(-1 / (0.002 * ctx.sampleRate));
            const floor = CarrotDSP.dbToGain(CarrotFX.p(p, "gate", "floor"));
            for (let i = start; i < end; i++) {
                const level = Math.max(Math.abs(L[i]), Math.abs(R[i]));
                this.env = Math.max(level, this.env * 0.9995);
                const target = this.env > threshold ? 1 : floor;
                this.gain = target + (this.gain - target) * (target > this.gain ? attack : release);
                L[i] *= this.gain;
                R[i] *= this.gain;
            }
        }
    }
    class CarrotFXDeesser {
        constructor(sampleRate) {
            this.bpL = new CarrotSVF();
            this.bpR = new CarrotSVF();
            this.env = 0;
            this.sampleRate = 0;
        }
        process(p, L, R, start, end, ctx) {
            const freq = CarrotFX.p(p, "deesser", "freq");
            const amount = CarrotFX.p(p, "deesser", "amount");
            this.bpL.set(freq, 0.3, ctx.sampleRate);
            this.bpR.set(freq, 0.3, ctx.sampleRate);
            const coef = Math.exp(-1 / (0.01 * ctx.sampleRate));
            for (let i = start; i < end; i++) {
                const sl = this.bpL.process(L[i], 1), sr = this.bpR.process(R[i], 1);
                const level = Math.max(Math.abs(sl), Math.abs(sr));
                this.env = level + (this.env - level) * coef;
                const reduce = Math.min(0.9, Math.max(0, this.env * 6 - 0.15) * amount);
                L[i] -= sl * reduce;
                R[i] -= sr * reduce;
            }
        }
    }
    // Plate reverb (Dattorro): the input is smeared by four diffusers, then circulates in a
    // figure-eight tank of two delay lines with modulated allpasses and damping; the stereo output
    // is read from taps all over the tank. Dense, smooth and wide, without the metallic ring of a
    // comb-filter reverb.
    class CarrotFXPlate {
        constructor(sampleRate) {
            const k = sampleRate / 29761, MAXSIZE = 1.5;
            const line = (n) => new CarrotDelayLine(Math.ceil(n * k * MAXSIZE) + 40);
            this.k = k;
            this.pre = new CarrotDelayLine(Math.ceil(sampleRate * 0.25));
            this.inAp = [142, 107, 379, 277].map(n => ({ n, d: line(n) }));
            this.tank = [
                { mod: { n: 672, d: line(672 + 32) }, d1: { n: 4453, d: line(4453) }, ap: { n: 1800, d: line(1800) }, d2: { n: 3720, d: line(3720) }, lp: 0, phase: 0 },
                { mod: { n: 908, d: line(908 + 32) }, d1: { n: 4217, d: line(4217) }, ap: { n: 2656, d: line(2656) }, d2: { n: 3163, d: line(3163) }, lp: 0, phase: 0.25 },
            ];
            this.bw = 0;
            this.fb = [0, 0];
        }
        static allpass(a, x, g, len) {
            const delayed = a.d.read(len);
            const v = x + g * delayed;
            a.d.write(v);
            return delayed - g * v;
        }
        process(p, L, R, start, end, ctx) {
            const sr = ctx.sampleRate, k = this.k;
            const size = 0.5 + CarrotFX.p(p, "plate", "size");
            const decay = Math.min(0.97, CarrotFX.p(p, "plate", "decay"));
            const damp = CarrotFX.p(p, "plate", "damp");
            const mod = CarrotFX.p(p, "plate", "mod");
            const width = CarrotFX.p(p, "plate", "width");
            const mix = CarrotFX.p(p, "plate", "mix");
            const predelay = Math.max(1, CarrotFX.p(p, "plate", "predelay") * sr / 1000);
            const bwCoef = 0.9995 - 0.3 * damp, dampCoef = 0.05 + 0.75 * damp;
            const len = (n) => Math.max(1, n * k * size);
            const inLen = this.inAp.map(a => len(a.n));
            const T = this.tank;
            const tl = T.map(t => ({ mod: len(t.mod.n), d1: len(t.d1.n), ap: len(t.ap.n), d2: len(t.d2.n) }));
            // output taps (Dattorro's positions), scaled with the size and kept inside their lines
            const at = (n, max) => Math.max(1, Math.min(n * k * size, max - 1));
            const a = T[0], b = T[1], la = tl[0], lb = tl[1];
            const tL = [at(266, lb.d1), at(2974, lb.d1), at(1913, lb.ap), at(1996, lb.d2), at(1990, la.d1), at(187, la.ap), at(1066, la.d2)];
            const tR = [at(353, la.d1), at(3627, la.d1), at(1228, la.ap), at(2673, la.d2), at(2111, lb.d1), at(335, lb.ap), at(121, lb.d2)];
            const lfoInc = 0.9 / sr, excursion = 16 * k * mod;
            for (let i = start; i < end; i++) {
                this.pre.write((L[i] + R[i]) * 0.5);
                let x = this.pre.read(predelay);
                this.bw += (x - this.bw) * bwCoef;
                x = this.bw;
                x = CarrotFXPlate.allpass(this.inAp[0], x, 0.75, inLen[0]);
                x = CarrotFXPlate.allpass(this.inAp[1], x, 0.75, inLen[1]);
                x = CarrotFXPlate.allpass(this.inAp[2], x, 0.625, inLen[2]);
                x = CarrotFXPlate.allpass(this.inAp[3], x, 0.625, inLen[3]);
                const fb0 = this.fb[1], fb1 = this.fb[0];
                for (let h = 0; h < 2; h++) {
                    const t = T[h], l = tl[h];
                    t.phase += lfoInc;
                    if (t.phase >= 1) t.phase -= 1;
                    const m = l.mod + excursion * Math.sin(t.phase * 6.283185307179586);
                    let v = x + (h == 0 ? fb0 : fb1) * decay;
                    v = CarrotFXPlate.allpass(t.mod, v, -0.7, Math.max(1, m));
                    t.d1.d.write(v);
                    v = t.d1.d.read(l.d1);
                    t.lp += (v - t.lp) * (1 - dampCoef);
                    v = t.lp * decay;
                    v = CarrotFXPlate.allpass(t.ap, v, 0.5, l.ap);
                    t.d2.d.write(v);
                    this.fb[h] = t.d2.d.read(l.d2);
                }
                let wl = b.d1.d.read(tL[0]) + b.d1.d.read(tL[1]) - b.ap.d.read(tL[2]) + b.d2.d.read(tL[3]) - a.d1.d.read(tL[4]) - a.ap.d.read(tL[5]) - a.d2.d.read(tL[6]);
                let wr = a.d1.d.read(tR[0]) + a.d1.d.read(tR[1]) - a.ap.d.read(tR[2]) + a.d2.d.read(tR[3]) - b.d1.d.read(tR[4]) - b.ap.d.read(tR[5]) - b.d2.d.read(tR[6]);
                const mid = (wl + wr) * 0.5, side = (wl - wr) * 0.5 * width;
                wl = (mid + side) * 0.6;
                wr = (mid - side) * 0.6;
                L[i] = L[i] * (1 - mix * 0.5) + wl * mix;
                R[i] = R[i] * (1 - mix * 0.5) + wr * mix;
            }
        }
    }
    // Tape: saturation that leans to one side (even harmonics, like a hot tape), the low "head
    // bump", high frequencies rolling off, wow and flutter, and a little hiss.
    class CarrotFXTape {
        constructor(sampleRate) {
            this.dl = new CarrotDelayLine(Math.ceil(sampleRate * 0.03));
            this.dr = new CarrotDelayLine(Math.ceil(sampleRate * 0.03));
            this.bump = [new CarrotBiquad(), new CarrotBiquad()];
            this.lpL = this.lpR = this.lp2L = this.lp2R = 0;
            this.xL = this.xR = 0;
            this.dcxL = this.dcyL = this.dcxR = this.dcyR = 0;
            this.wow = 0;
            this.flutter = 0;
            this.drift = 0;
            this.hash = "";
            this.random = CarrotDSP.rng(4242);
        }
        static sat(x, bias) {
            return Math.tanh(x + bias) - Math.tanh(bias);
        }
        process(p, L, R, start, end, ctx) {
            const sr = ctx.sampleRate;
            const drive = CarrotDSP.dbToGain(CarrotFX.p(p, "tape", "drive"));
            const warmth = CarrotFX.p(p, "tape", "warmth");
            const tone = CarrotFX.p(p, "tape", "tone");
            const wowDepth = CarrotFX.p(p, "tape", "wow");
            const flutterDepth = CarrotFX.p(p, "tape", "flutter");
            const hiss = CarrotFX.p(p, "tape", "hiss");
            const mix = CarrotFX.p(p, "tape", "mix");
            const hash = warmth + "," + sr;
            if (hash != this.hash) {
                this.hash = hash;
                for (const b of this.bump) b.set(2, 90, warmth * 6, 0.9, sr);
            }
            const coef = 1 - Math.exp(-2 * Math.PI * tone / sr);
            const out = 1 / Math.max(1, Math.tanh(drive) * 1.1 + 0.2 * Math.log(drive + 1));
            const bias = 0.18, dc = 1 - 2 * Math.PI * 12 / sr, rand = this.random;
            const shape = CarrotFXTape.sat;
            for (let i = start; i < end; i++) {
                this.wow += 0.6 / sr;
                if (this.wow >= 1) this.wow -= 1;
                this.flutter += 7.5 / sr;
                if (this.flutter >= 1) this.flutter -= 1;
                this.drift += ((rand() * 2 - 1) - this.drift) * 0.0005;
                const delay = 2 + sr * 0.001 * (wowDepth * 2.5 * (1 + Math.sin(this.wow * 6.283185307179586) + 0.4 * this.drift) + flutterDepth * 0.25 * (1 + Math.sin(this.flutter * 6.283185307179586)));
                const l = L[i], r = R[i];
                this.dl.write(this.bump[0].process(l));
                this.dr.write(this.bump[1].process(r));
                const il = this.dl.read(delay) * drive, ir = this.dr.read(delay) * drive;
                // saturation at twice the rate, then the DC from the bias out
                let yl = 0.5 * (shape((this.xL + il) * 0.5, bias) + shape(il, bias));
                let yr = 0.5 * (shape((this.xR + ir) * 0.5, bias) + shape(ir, bias));
                this.xL = il;
                this.xR = ir;
                this.dcyL = yl - this.dcxL + dc * this.dcyL;
                this.dcxL = yl;
                this.dcyR = yr - this.dcxR + dc * this.dcyR;
                this.dcxR = yr;
                // high-frequency loss: two gentle poles
                this.lpL += (this.dcyL - this.lpL) * coef;
                this.lp2L += (this.lpL - this.lp2L) * coef;
                this.lpR += (this.dcyR - this.lpR) * coef;
                this.lp2R += (this.lpR - this.lp2R) * coef;
                const n = hiss > 0 ? (rand() * 2 - 1) * hiss * 0.006 : 0;
                L[i] = carrotMix(l, this.lp2L * out + n, mix);
                R[i] = carrotMix(r, this.lp2R * out + n, mix);
            }
        }
    }
    // Tape echo: a beat-synced delay whose repeats get darker, thinner, warmer and a little wobbly
    // each time round (filters and saturation inside the feedback loop).
    class CarrotFXTapeEcho {
        constructor(sampleRate) {
            this.dl = new CarrotDelayLine(Math.ceil(sampleRate * 4.2));
            this.dr = new CarrotDelayLine(Math.ceil(sampleRate * 4.2));
            this.lpL = this.lpR = this.hpL = this.hpR = 0;
            this.smooth = 0;
            this.wow = 0;
        }
        process(p, L, R, start, end, ctx) {
            const sr = ctx.sampleRate;
            const beats = carrotSyncBeats(p.time != undefined ? p.time : 7);
            const target = Math.min(sr * 4, beats * ctx.samplesPerBeat);
            if (this.smooth == 0) this.smooth = target;
            const feedback = CarrotFX.p(p, "tapeecho", "feedback");
            const tone = CarrotFX.p(p, "tapeecho", "tone");
            const low = CarrotFX.p(p, "tapeecho", "lowcut");
            const drive = 1 + 3 * CarrotFX.p(p, "tapeecho", "drive");
            const wowDepth = CarrotFX.p(p, "tapeecho", "wow");
            const spread = CarrotFX.p(p, "tapeecho", "spread");
            const mix = CarrotFX.p(p, "tapeecho", "mix");
            const lpc = 1 - Math.exp(-2 * Math.PI * tone / sr), hpc = 1 - Math.exp(-2 * Math.PI * low / sr);
            for (let i = start; i < end; i++) {
                this.smooth += (target - this.smooth) * 0.0004;
                this.wow += 0.8 / sr;
                if (this.wow >= 1) this.wow -= 1;
                const w = wowDepth * sr * 0.0025 * Math.sin(this.wow * 6.283185307179586);
                const dL = Math.max(1, this.smooth + w), dR = Math.max(1, this.smooth * (1 + 0.04 * spread) - w);
                let el = this.dl.read(dL), er = this.dr.read(dR);
                // darker and thinner each pass
                this.lpL += (el - this.lpL) * lpc;
                this.lpR += (er - this.lpR) * lpc;
                this.hpL += (this.lpL - this.hpL) * hpc;
                this.hpR += (this.lpR - this.hpR) * hpc;
                el = this.lpL - this.hpL;
                er = this.lpR - this.hpR;
                const l = L[i], r = R[i];
                this.dl.write(Math.tanh((l + el * feedback) * drive) / drive);
                this.dr.write(Math.tanh((r + er * feedback) * drive) / drive);
                L[i] = l + el * mix;
                R[i] = r + er * mix;
            }
        }
    }
    // Sidechain pump: the level ducks on every beat (or any note value) and comes back up, like a
    // compressor keyed from a four-on-the-floor kick.
    class CarrotFXPump {
        constructor(sampleRate) {
            this.gain = 1;
        }
        process(p, L, R, start, end, ctx) {
            const beats = carrotSyncBeats(p.rate != undefined ? p.rate : 9);
            const depth = CarrotFX.p(p, "pump", "depth");
            const release = CarrotFX.p(p, "pump", "release");
            const curve = CarrotFX.p(p, "pump", "curve");
            const offset = CarrotFX.p(p, "pump", "offset");
            const smooth = 1 - Math.exp(-1 / (0.0015 * ctx.sampleRate));
            for (let i = start; i < end; i++) {
                const beat = ctx.beatPos + (i - start) / ctx.samplesPerBeat;
                const ph = (((beat / beats) - offset) % 1 + 1) % 1;
                const u = Math.min(1, ph / Math.max(0.02, release));
                const target = 1 - depth * (1 - Math.pow(u, curve));
                this.gain += (target - this.gain) * smooth;
                L[i] *= this.gain;
                R[i] *= this.gain;
            }
        }
    }
    // Transient shaper: more (or less) attack and more (or less) tail, whatever the level.
    class CarrotFXTransient {
        constructor(sampleRate) {
            this.fast = 0;
            this.slow = 0;
            this.gain = 1;
        }
        process(p, L, R, start, end, ctx) {
            const sr = ctx.sampleRate;
            const attack = CarrotFX.p(p, "transient", "attack");
            const sustain = CarrotFX.p(p, "transient", "sustain");
            const out = CarrotDSP.dbToGain(CarrotFX.p(p, "transient", "out"));
            const fa = 1 - Math.exp(-1 / (0.0008 * sr)), fr = 1 - Math.exp(-1 / (0.03 * sr));
            const sa = 1 - Math.exp(-1 / (0.02 * sr)), srl = 1 - Math.exp(-1 / (0.25 * sr));
            const smooth = 1 - Math.exp(-1 / (0.001 * sr));
            for (let i = start; i < end; i++) {
                const level = Math.max(Math.abs(L[i]), Math.abs(R[i]));
                this.fast += (level - this.fast) * (level > this.fast ? fa : fr);
                this.slow += (level - this.slow) * (level > this.slow ? sa : srl);
                const ratio = (this.fast + 1e-5) / (this.slow + 1e-5);
                let g = ratio > 1 ? Math.pow(ratio, attack * 0.6) : Math.pow(1 / ratio, sustain * 0.8);
                g = Math.max(0.25, Math.min(3, g));
                this.gain += (g - this.gain) * smooth;
                L[i] *= this.gain * out;
                R[i] *= this.gain * out;
            }
        }
    }
    // Ensemble: three slowly moving delay lines, a third of a cycle apart, plus a fast shimmer (the
    // string-machine and Juno chorus sound): thick and wide, with no single wobble to hear.
    class CarrotFXEnsemble {
        constructor(sampleRate) {
            this.d = new CarrotDelayLine(Math.ceil(sampleRate * 0.04));
            this.slow = 0;
            this.fast = 0;
        }
        process(p, L, R, start, end, ctx) {
            const sr = ctx.sampleRate;
            const rate = CarrotFX.p(p, "ensemble", "rate");
            const depth = CarrotFX.p(p, "ensemble", "depth");
            const width = CarrotFX.p(p, "ensemble", "width");
            const mix = CarrotFX.p(p, "ensemble", "mix");
            const base = 0.008 * sr, slowAmt = depth * 0.004 * sr, fastAmt = depth * 0.0004 * sr;
            const TAU = 6.283185307179586;
            for (let i = start; i < end; i++) {
                this.slow += rate / sr;
                if (this.slow >= 1) this.slow -= 1;
                this.fast += rate * 7.3 / sr;
                if (this.fast >= 1) this.fast -= 1;
                const l = L[i], r = R[i];
                this.d.write((l + r) * 0.5);
                const v = [];
                for (let k = 0; k < 3; k++) {
                    const ph = k / 3;
                    const dly = base + slowAmt * (1 + Math.sin((this.slow + ph) * TAU)) + fastAmt * (1 + Math.sin((this.fast + ph) * TAU));
                    v.push(this.d.read(dly));
                }
                const c = v[0] * 0.5;
                const wl = c + v[1] * (0.5 + 0.5 * width) + v[2] * (0.5 - 0.5 * width);
                const wr = c + v[2] * (0.5 + 0.5 * width) + v[1] * (0.5 - 0.5 * width);
                L[i] = l * (1 - mix * 0.5) + wl * mix * 0.6;
                R[i] = r * (1 - mix * 0.5) + wr * mix * 0.6;
            }
        }
    }
    const CARROT_PERCENT = (v) => Math.round(v * 100) + "%";
    CarrotFX.types = {
        distortion: {
            name: "Distortion", impl: CarrotFXDistortion, params: [
                { key: "mode", label: "Type", options: ["Soft clip", "Hard clip", "Tube", "Wavefold", "Rectify", "Sine shaper"], def: 0 },
                { key: "drive", label: "Drive", min: 0, max: 48, def: 12, unit: "dB" },
                { key: "tone", label: "Tone", min: 300, max: 20000, def: 12000, unit: "Hz", curve: "exp" },
                { key: "out", label: "Output", min: -24, max: 6, def: 0, unit: "dB" },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 1, format: CARROT_PERCENT },
            ],
        },
        crusher: {
            name: "Bitcrusher", impl: CarrotFXCrusher, params: [
                { key: "bits", label: "Bits", min: 1, max: 16, def: 8, step: 0.1 },
                { key: "rate", label: "Downsample", min: 1, max: 40, def: 4, step: 0.1, unit: "x" },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 1, format: CARROT_PERCENT },
            ],
        },
        filter: {
            name: "Filter", impl: CarrotFXFilter, params: [
                { key: "mode", label: "Type", options: ["Low pass 12", "Low pass 24", "High pass", "Band pass", "Notch"], def: 1 },
                { key: "cutoff", label: "Cutoff", min: 30, max: 20000, def: 2000, unit: "Hz", curve: "exp" },
                { key: "res", label: "Resonance", min: 0, max: 1, def: 0.3, format: CARROT_PERCENT },
                { key: "rate", label: "LFO rate", options: carrotSyncOptions(), def: 13 },
                { key: "lfo", label: "LFO depth", min: 0, max: 1, def: 0, format: CARROT_PERCENT },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 1, format: CARROT_PERCENT },
            ],
        },
        chorus: {
            name: "Chorus", impl: class extends CarrotFXModDelay {
                constructor(sr) { super(sr, "chorus"); }
            }, params: [
                { key: "rate", label: "Rate", min: 0.05, max: 6, def: 0.8, unit: "Hz", curve: "exp" },
                { key: "depth", label: "Depth", min: 0, max: 1, def: 0.5, format: CARROT_PERCENT },
                { key: "delay", label: "Delay", min: 4, max: 30, def: 12, unit: "ms" },
                { key: "feedback", label: "Feedback", min: 0, max: 0.9, def: 0.1, format: CARROT_PERCENT },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 0.5, format: CARROT_PERCENT },
            ],
        },
        flanger: {
            name: "Flanger", impl: class extends CarrotFXModDelay {
                constructor(sr) { super(sr, "flanger"); }
            }, params: [
                { key: "rate", label: "Rate", min: 0.02, max: 5, def: 0.25, unit: "Hz", curve: "exp" },
                { key: "depth", label: "Depth", min: 0, max: 1, def: 0.7, format: CARROT_PERCENT },
                { key: "feedback", label: "Feedback", min: -0.95, max: 0.95, def: 0.6, format: CARROT_PERCENT },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 0.7, format: CARROT_PERCENT },
            ],
        },
        phaser: {
            name: "Phaser", impl: CarrotFXPhaser, params: [
                { key: "rate", label: "Rate", min: 0.02, max: 6, def: 0.4, unit: "Hz", curve: "exp" },
                { key: "depth", label: "Depth", min: 0, max: 1, def: 0.7, format: CARROT_PERCENT },
                { key: "feedback", label: "Feedback", min: 0, max: 0.9, def: 0.4, format: CARROT_PERCENT },
                { key: "stages", label: "Stages", options: ["4", "6", "8", "12"], def: 1 },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 0.7, format: CARROT_PERCENT },
            ],
        },
        delay: {
            name: "Delay", impl: CarrotFXDelay, params: [
                { key: "time", label: "Time", options: carrotSyncOptions(), def: 7 },
                { key: "feedback", label: "Feedback", min: 0, max: 0.95, def: 0.4, format: CARROT_PERCENT },
                { key: "pingpong", label: "Ping-pong", options: ["Off", "On"], def: 1 },
                { key: "tone", label: "Tone", min: 300, max: 20000, def: 6000, unit: "Hz", curve: "exp" },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 0.3, format: CARROT_PERCENT },
            ],
        },
        reverb: {
            name: "Reverb", impl: CarrotFXReverb, params: [
                { key: "size", label: "Size", min: 0, max: 1, def: 0.6, format: CARROT_PERCENT },
                { key: "damp", label: "Damping", min: 0, max: 1, def: 0.5, format: CARROT_PERCENT },
                { key: "width", label: "Width", min: 0, max: 1, def: 1, format: CARROT_PERCENT },
                { key: "predelay", label: "Pre-delay", min: 0, max: 200, def: 10, unit: "ms" },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 0.3, format: CARROT_PERCENT },
            ],
        },
        glitch: {
            name: "Glitch Repeat", impl: CarrotFXGlitch, params: [
                { key: "chance", label: "Chance", min: 0, max: 1, def: 0.3, format: CARROT_PERCENT },
                { key: "grid", label: "Grid", options: ["1/4", "1/8", "1/16", "1/32"], def: 1 },
                { key: "repeat", label: "Repeat", options: ["1/16", "1/32", "1/64", "1/128"], def: 1 },
                { key: "drop", label: "Pitch drop", min: 0, max: 1, def: 0, format: CARROT_PERCENT },
                { key: "seed", label: "Variation", min: 0, max: 99, def: 1, step: 1 },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 1, format: CARROT_PERCENT },
            ],
        },
        tapestop: {
            name: "Tape Stop", impl: CarrotFXTapeStop, params: [
                { key: "every", label: "Every", options: ["1 bar", "2 bars", "4 bars", "8 bars"], def: 1 },
                { key: "length", label: "Length", min: 0.25, max: 4, def: 1, unit: " beats", step: 0.25 },
            ],
        },
        ringmod: {
            name: "Ring Mod", impl: CarrotFXRingMod, params: [
                { key: "freq", label: "Frequency", min: 20, max: 5000, def: 440, unit: "Hz", curve: "exp" },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 0.5, format: CARROT_PERCENT },
            ],
        },
        tremolo: {
            name: "Tremolo / Pan", impl: CarrotFXTremolo, params: [
                { key: "rate", label: "Rate", options: carrotSyncOptions(), def: 6 },
                { key: "depth", label: "Depth", min: 0, max: 1, def: 0.6, format: CARROT_PERCENT },
                { key: "shape", label: "Shape", options: ["Sine", "Square", "Saw"], def: 0 },
                { key: "pan", label: "Mode", options: ["Tremolo", "Auto-pan"], def: 0 },
            ],
        },
        compressor: {
            name: "Compressor", impl: CarrotFXCompressor, params: [
                { key: "threshold", label: "Threshold", min: -60, max: 0, def: -18, unit: "dB" },
                { key: "ratio", label: "Ratio", min: 1, max: 20, def: 4, unit: ":1" },
                { key: "attack", label: "Attack", min: 0.1, max: 100, def: 5, unit: "ms", curve: "exp" },
                { key: "release", label: "Release", min: 10, max: 1000, def: 120, unit: "ms", curve: "exp" },
                { key: "makeup", label: "Makeup", min: 0, max: 24, def: 4, unit: "dB" },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 1, format: CARROT_PERCENT },
            ],
        },
        multiband: {
            name: "Multiband (OTT)", impl: CarrotFXMultiband, params: [
                { key: "depth", label: "Depth", min: 0, max: 1, def: 0.6, format: CARROT_PERCENT },
                { key: "time", label: "Time", min: 0, max: 1, def: 0.4, format: CARROT_PERCENT },
                { key: "upward", label: "Upward", min: 0, max: 1, def: 0.8, format: CARROT_PERCENT },
                { key: "downward", label: "Downward", min: 0, max: 1, def: 1, format: CARROT_PERCENT },
                { key: "out", label: "Output", min: -12, max: 12, def: 0, unit: "dB" },
            ],
        },
        widener: {
            name: "Stereo Width", impl: CarrotFXWidener, params: [
                { key: "width", label: "Width", min: 0, max: 2, def: 1.5, format: CARROT_PERCENT },
            ],
        },
        lofi: {
            name: "Lo-fi / Vinyl", impl: CarrotFXLofi, params: [
                { key: "crackle", label: "Crackle", min: 0, max: 1, def: 0.4, format: CARROT_PERCENT },
                { key: "hiss", label: "Hiss", min: 0, max: 1, def: 0.3, format: CARROT_PERCENT },
                { key: "wow", label: "Wow", min: 0, max: 1, def: 0.4, format: CARROT_PERCENT },
                { key: "tone", label: "Tone", min: 800, max: 20000, def: 5000, unit: "Hz", curve: "exp" },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 1, format: CARROT_PERCENT },
            ],
        },
        eq3: {
            name: "3-Band EQ", impl: CarrotFXEQ3, params: [
                { key: "low", label: "Low", min: -15, max: 15, def: 0, unit: "dB" },
                { key: "mid", label: "Mid", min: -15, max: 15, def: 0, unit: "dB" },
                { key: "midfreq", label: "Mid freq", min: 200, max: 8000, def: 1000, unit: "Hz", curve: "exp" },
                { key: "high", label: "High", min: -15, max: 15, def: 0, unit: "dB" },
            ],
        },
        gate: {
            name: "Noise Gate", impl: CarrotFXGate, params: [
                { key: "threshold", label: "Threshold", min: -80, max: -10, def: -50, unit: "dB" },
                { key: "release", label: "Release", min: 5, max: 500, def: 80, unit: "ms", curve: "exp" },
                { key: "floor", label: "Floor", min: -80, max: 0, def: -60, unit: "dB" },
            ],
        },
        deesser: {
            name: "De-esser", impl: CarrotFXDeesser, params: [
                { key: "freq", label: "Frequency", min: 3000, max: 12000, def: 6500, unit: "Hz", curve: "exp" },
                { key: "amount", label: "Amount", min: 0, max: 1, def: 0.5, format: CARROT_PERCENT },
            ],
        },
        plate: {
            name: "Plate Reverb", impl: CarrotFXPlate, params: [
                { key: "size", label: "Size", min: 0, max: 1, def: 0.5, format: CARROT_PERCENT },
                { key: "decay", label: "Decay", min: 0, max: 0.97, def: 0.6, format: CARROT_PERCENT },
                { key: "damp", label: "Damping", min: 0, max: 1, def: 0.35, format: CARROT_PERCENT },
                { key: "predelay", label: "Pre-delay", min: 0, max: 200, def: 15, unit: "ms" },
                { key: "mod", label: "Movement", min: 0, max: 1, def: 0.5, format: CARROT_PERCENT },
                { key: "width", label: "Width", min: 0, max: 1.5, def: 1, format: CARROT_PERCENT },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 0.3, format: CARROT_PERCENT },
            ],
        },
        tape: {
            name: "Tape Saturation", impl: CarrotFXTape, params: [
                { key: "drive", label: "Drive", min: -6, max: 24, def: 6, unit: "dB" },
                { key: "warmth", label: "Warmth", min: 0, max: 1, def: 0.5, format: CARROT_PERCENT },
                { key: "tone", label: "Tone", min: 1500, max: 20000, def: 11000, unit: "Hz", curve: "exp" },
                { key: "wow", label: "Wow", min: 0, max: 1, def: 0.15, format: CARROT_PERCENT },
                { key: "flutter", label: "Flutter", min: 0, max: 1, def: 0.15, format: CARROT_PERCENT },
                { key: "hiss", label: "Hiss", min: 0, max: 1, def: 0.1, format: CARROT_PERCENT },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 1, format: CARROT_PERCENT },
            ],
        },
        tapeecho: {
            name: "Tape Echo", impl: CarrotFXTapeEcho, params: [
                { key: "time", label: "Time", options: carrotSyncOptions(), def: 7 },
                { key: "feedback", label: "Feedback", min: 0, max: 1.05, def: 0.5, format: CARROT_PERCENT },
                { key: "tone", label: "Tone", min: 500, max: 12000, def: 3200, unit: "Hz", curve: "exp" },
                { key: "lowcut", label: "Low cut", min: 20, max: 1500, def: 180, unit: "Hz", curve: "exp" },
                { key: "drive", label: "Drive", min: 0, max: 1, def: 0.35, format: CARROT_PERCENT },
                { key: "wow", label: "Wow", min: 0, max: 1, def: 0.3, format: CARROT_PERCENT },
                { key: "spread", label: "Spread", min: 0, max: 1, def: 0.4, format: CARROT_PERCENT },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 0.35, format: CARROT_PERCENT },
            ],
        },
        pump: {
            name: "Sidechain Pump", impl: CarrotFXPump, params: [
                { key: "rate", label: "Every", options: carrotSyncOptions(), def: 9 },
                { key: "depth", label: "Depth", min: 0, max: 1, def: 0.7, format: CARROT_PERCENT },
                { key: "release", label: "Release", min: 0.05, max: 1, def: 0.6, format: CARROT_PERCENT },
                { key: "curve", label: "Curve", min: 0.3, max: 4, def: 1.6, step: 0.05 },
                { key: "offset", label: "Offset", min: 0, max: 0.5, def: 0, format: CARROT_PERCENT },
            ],
        },
        transient: {
            name: "Transient Shaper", impl: CarrotFXTransient, params: [
                { key: "attack", label: "Attack", min: -1, max: 1, def: 0.4, format: CARROT_PERCENT },
                { key: "sustain", label: "Sustain", min: -1, max: 1, def: 0, format: CARROT_PERCENT },
                { key: "out", label: "Output", min: -12, max: 12, def: 0, unit: "dB" },
            ],
        },
        ensemble: {
            name: "Ensemble", impl: CarrotFXEnsemble, params: [
                { key: "rate", label: "Rate", min: 0.1, max: 3, def: 0.6, unit: "Hz", curve: "exp" },
                { key: "depth", label: "Depth", min: 0, max: 1, def: 0.6, format: CARROT_PERCENT },
                { key: "width", label: "Width", min: 0, max: 1, def: 0.8, format: CARROT_PERCENT },
                { key: "mix", label: "Mix", min: 0, max: 1, def: 0.5, format: CARROT_PERCENT },
            ],
        },
        utility: {
            name: "Utility", impl: CarrotFXUtility, params: [
                { key: "gain", label: "Gain", min: -24, max: 24, def: 0, unit: "dB" },
                { key: "pan", label: "Pan", min: -1, max: 1, def: 0, format: (v) => v == 0 ? "C" : Math.round(Math.abs(v) * 100) + (v < 0 ? "L" : "R") },
                { key: "mono", label: "Mono", options: ["Off", "On"], def: 0 },
            ],
        },
    };
    CarrotFX.typeOrder = ["distortion", "tape", "crusher", "filter", "eq3", "chorus", "ensemble", "flanger", "phaser", "delay", "tapeecho", "reverb", "plate", "glitch", "tapestop", "ringmod", "tremolo", "pump", "compressor", "multiband", "transient", "widener", "lofi", "gate", "deesser", "utility"];
