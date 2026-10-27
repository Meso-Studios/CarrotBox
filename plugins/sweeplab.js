/*
 * Sweep Lab - design FX sweeps (risers, uplifters, downlifters, impacts, tape
 * stops, ...) and drop them into the song on the beat.
 *
 * Sweeps come from the FLSweepers engine and are stored in the song as a short
 * key ("b:sw/..."), not as audio, so songs stay small. A riser ends exactly where
 * the chosen bar starts; a fall (downlifter, impact, sub drop) starts on it.
 * Sweeps longer than a bar are cut into Slicex slices, one per bar.
 *
 * Tool plugin: open(host) builds the window.
 */
(function () {
    "use strict";
    const B = window.beepbox;
    if (!B || !B.CarrotPlugins) return;
    const A = B.CarrotAPI;
    const { HTML, CarrotUI, Config, FLConfig, FLSampleBank, FLSweepers, flToast } = A;

    A.addStyle(`
.cb-window.cb-plugin-sweeplab { --cb-plugin-color: #4fc3f7; }
.cb-plugin-sweeplab .cb-window-body { background: #121820 !important; color: #dce8f2; }
.cb-window.cb-plugin-sweeplab .cb-section { background: #1a222d !important; border: 1px solid #2c3a4a !important; border-radius: 5px !important; }
.cb-window.cb-plugin-sweeplab .cb-section-title { color: #8fd3ff !important; letter-spacing: 0.12em; text-transform: uppercase; font-size: 10px; font-weight: 800; }
.cb-plugin-sweeplab .cb-knob .cb-arc { stroke: var(--sw-color, #4fc3f7); }
.cb-plugin-sweeplab .cb-knob .cb-track { stroke: #0c1117; }
.cb-plugin-sweeplab .cb-knob { width: 54px; }
.cb-plugin-sweeplab .cb-knob-label { text-transform: uppercase; font-size: 8.5px; color: #93a7b8; }
.cb-plugin-sweeplab .cb-canvas { background: #0b1016 !important; border: 1px solid #2c3a4a; border-radius: 4px; }
.cb-plugin-sweeplab .cb-row { justify-content: flex-start; flex-wrap: wrap; gap: 3px 6px; align-items: center; }
.cb-sw-types { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 5px; }
.cb-sw-type { text-align: left; border-radius: 4px; border: 1px solid #2c3a4a; background: #111820; color: #dce8f2; padding: 6px 7px; cursor: pointer; border-left: 4px solid var(--c); font-size: 11.5px; font-weight: 700; }
.cb-sw-type .cb-sw-sub { display: block; font-weight: 400; color: #8396a6; font-size: 9.5px; margin-top: 1px; }
.cb-sw-type.cb-on { background: color-mix(in srgb, var(--c) 22%, #111820); border-color: var(--c); }
.cb-sw-wave { display: block; width: 100%; height: 96px; }
.cb-sw-about { font-size: 11px; color: #93a7b8; min-height: 2.6em; margin: 2px 0 5px; }
.cb-sw-place input[type=number] { width: 64px; background: #0b1016; color: #e8f2fa; border: 1px solid #2c3a4a; border-radius: 3px; padding: 3px 5px; }
`);

    const LENGTHS = [1, 2, 4, 8, 16, 32];
    const STATE_KEY = "carrotSweepLab";
    function loadState() {
        try { const s = JSON.parse(localStorage.getItem(STATE_KEY) || "null"); if (s && FLSweepers.type(s.type)) return s; } catch (error) { }
        return null;
    }
    function saveState(state) {
        try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (error) { }
    }
    function fresh(typeId) {
        const t = FLSweepers.type(typeId) || FLSweepers.types()[0];
        return Object.assign({ type: t.id, beats: t.dir == "rise" ? 8 : 4, seed: 1, every: 0 }, t.def);
    }

    // ------------------------------------------------------------ placing a sweep in the song
    // Bars (0-based) a sweep of `beats` covers when it ends at / starts on `bar`.
    function span(song, dir, bar, beats) {
        const bpb = song.beatsPerBar;
        const start = dir == "rise" ? bar * bpb - beats : bar * bpb;
        return { start, end: start + beats, bpb };
    }
    function channelIsFree(song, channel, firstBar, lastBar) {
        for (let b = firstBar; b <= lastBar && b < channel.bars.length; b++) {
            const n = channel.bars[b];
            if (n > 0 && channel.patterns[n - 1] && channel.patterns[n - 1].notes.length > 0) return false;
        }
        return true;
    }
    // Places one or more sweeps; bars are 0-based bar indexes where each sweep lands.
    function place(doc, state, bars) {
        const song = doc.song;
        const type = FLSweepers.type(state.type);
        const spec = FLSweepers.normalize(Object.assign({}, state, { bpm: song.tempo, beats: state.beats }));
        const key = FLSweepers.keyFor(spec);
        const id = "b:" + key;
        const spans = [];
        for (const bar of bars) {
            const s = span(song, type.dir, bar, spec.beats);
            if (s.start < 0) continue;
            spans.push(s);
        }
        if (!spans.length) {
            flToast("A " + spec.beats + "-beat riser needs " + spec.beats + " beats before the bar it leads into. Pick a later bar.");
            return false;
        }
        const firstBar = Math.min(...spans.map(s => Math.floor(s.start / s.bpb)));
        const lastBar = Math.max(...spans.map(s => Math.ceil(s.end / s.bpb) - 1));
        const group = new A.ChangeGroup();
        if (lastBar + 1 > song.barCount) {
            if (lastBar + 1 > Config.barCountMax) { flToast("That would make the song longer than " + Config.barCountMax + " bars."); return false; }
            group.append(new A.ChangeBarCount(doc, lastBar + 1, false));
        }
        if (!song.patternInstruments) group.append(new A.ChangeInstrumentsFlags(doc, song.layeredInstruments, true));
        // reuse an "FX Sweeps" channel when those bars are empty on it and it has room for another instrument
        let channelIndex = -1;
        for (let c = 0; c < song.pitchChannelCount; c++) {
            const ch = song.channels[c];
            if (/^FX Sweeps/.test(ch.name || "") && ch.instruments.length < song.getMaxInstrumentsPerChannel() && channelIsFree(song, ch, firstBar, lastBar)) { channelIndex = c; break; }
        }
        let newChannel = false;
        if (channelIndex < 0) {
            const added = A.carrotNewChannel(doc, false);
            if (added == null) { flToast("No room for another channel."); return false; }
            group.append(added.group);
            channelIndex = added.index;
            newChannel = true;
        }
        group.append(new A.ChangeFL(doc, () => {
            const channel = song.channels[channelIndex];
            if (!/^FX Sweeps/.test(channel.name || "")) channel.name = "FX Sweeps";
            let instrumentIndex = 0;
            if (!newChannel) {
                channel.instruments.push(new A.Instrument(false));
                instrumentIndex = channel.instruments.length - 1;
            }
            const instrument = channel.instruments[instrumentIndex];
            instrument.setTypeAndReset(FLConfig.typeSlicex, false);
            const sampler = instrument.fl.sampler;
            sampler.sampleId = id;
            sampler.sampleName = FLSweepers.nameOf(spec);
            sampler.start = 0;
            sampler.end = 1;
            // one slice per bar the sweep touches (same cut points for every copy: they all line up with bars the same way)
            const s0 = spans[0];
            sampler.slices = [];
            for (let b = Math.floor(s0.start / s0.bpb) + 1; b * s0.bpb < s0.end; b++) sampler.slices.push((b * s0.bpb - s0.start) / spec.beats);
            instrument.preset = instrument.type;
            FLSampleBank.request(id);
            const ppb = Config.partsPerBeat;
            for (const s of spans) {
                let slice = 0;
                for (let b = Math.floor(s.start / s.bpb); b * s.bpb < s.end; b++, slice++) {
                    if (b >= song.barCount) break;
                    const from = Math.max(s.start, b * s.bpb) - b * s.bpb, to = Math.min(s.end, (b + 1) * s.bpb) - b * s.bpb;
                    const startPart = Math.round(from * ppb), endPart = Math.round(to * ppb);
                    if (endPart <= startPart) continue;
                    // an empty pattern nobody uses, or a new one
                    let index = -1;
                    for (let p = 0; p < song.patternsPerChannel; p++) {
                        if (channel.bars.indexOf(p + 1) == -1 && channel.patterns[p].notes.length == 0) { index = p; break; }
                    }
                    if (index == -1) {
                        if (song.patternsPerChannel >= Config.barCountMax) break;
                        for (const other of song.channels) other.patterns.push(new A.Pattern());
                        song.patternsPerChannel++;
                        index = song.patternsPerChannel - 1;
                    }
                    const pattern = channel.patterns[index];
                    pattern.notes = [new A.Note(48 + slice, startPart, endPart, Config.noteSizeMax, false)];
                    pattern.instruments = [instrumentIndex];
                    channel.bars[b] = index + 1;
                }
            }
        }, false));
        doc.record(group);
        flToast("Placed " + FLSweepers.nameOf(spec) + (spans.length > 1 ? " x" + spans.length : "") + " on \"" + (song.channels[channelIndex].name || "FX Sweeps") + "\"");
        return true;
    }
    // Re-renders every placed sweep at the song's current tempo (slice points are fractions, so they still line up).
    function retime(doc) {
        const song = doc.song;
        let changed = 0;
        doc.record(new A.ChangeFL(doc, () => {
            for (const channel of song.channels) for (const instrument of channel.instruments) {
                const sampler = instrument.fl && instrument.fl.sampler;
                if (!sampler || typeof sampler.sampleId != "string" || !sampler.sampleId.startsWith("b:sw/")) continue;
                const key = FLSweepers.withTempo(sampler.sampleId.slice(2), song.tempo);
                if ("b:" + key == sampler.sampleId) continue;
                sampler.sampleId = "b:" + key;
                const spec = FLSweepers.parseKey(key);
                if (spec) sampler.sampleName = FLSweepers.nameOf(spec);
                FLSampleBank.request(sampler.sampleId);
                changed++;
            }
        }, false));
        flToast(changed ? "Re-rendered " + changed + " sweep" + (changed == 1 ? "" : "s") + " at " + song.tempo + " BPM" : "Every sweep already matches the song tempo.");
    }

    // ------------------------------------------------------------ window
    function open(host) {
        const doc = host.doc;
        const state = loadState() || fresh("noise-riser");
        const root = HTML.div({ class: "cb-sw" });
        const save = () => saveState(state);
        const spec = () => FLSweepers.normalize(Object.assign({}, state, { bpm: doc.song.tempo, beats: state.beats }));
        const typeInfo = () => FLSweepers.type(state.type);

        // ---- types
        const typeButtons = [];
        const types = HTML.div({ class: "cb-sw-types" });
        for (const t of FLSweepers.types()) {
            const b = HTML.button({ type: "button", class: "cb-sw-type", style: "--c: " + t.color, title: t.about }, t.name, HTML.span({ class: "cb-sw-sub" }, t.dir == "rise" ? "rises into the bar" : "falls from the bar"));
            b.addEventListener("click", () => {
                const keep = { beats: state.beats, every: state.every, dir: typeInfo().dir };
                Object.assign(state, fresh(t.id));
                if (t.dir == keep.dir) state.beats = keep.beats;
                state.every = keep.every;
                save(); syncControls(); preview();
            });
            typeButtons.push([t, b]);
            types.appendChild(b);
        }

        // ---- shape controls (plain controls on local state, not on song params)
        const about = HTML.div({ class: "cb-sw-about" });
        const knobs = {};
        const knob = (keyName, spec) => (knobs[keyName] = CarrotUI.knob(Object.assign({ small: true, value: state[keyName], onInput: (v) => { state[keyName] = v; save(); draw(); }, onChange: () => preview() }, spec)));
        const pct = (v) => Math.round(v * 100) + "%";
        const lengthSel = CarrotUI.select({ label: "Length", options: LENGTHS.map(n => n + (n == 1 ? " beat" : " beats")), value: Math.max(0, LENGTHS.indexOf(state.beats)), onChange: (i) => { state.beats = LENGTHS[i]; save(); draw(); preview(); } });
        const curveSel = CarrotUI.select({ label: "Curve", options: FLSweepers.curves(), value: state.curve | 0, onChange: (i) => { state.curve = i; save(); draw(); preview(); } });
        const shape = CarrotUI.row(lengthSel, curveSel,
            knob("intensity", { label: "Intensity", min: 0, max: 1, format: pct }),
            knob("colour", { label: "Colour", min: 0, max: 1, format: pct, title: "Dark to bright" }),
            knob("res", { label: "Resonance", min: 0, max: 1, format: pct }),
            knob("pitch", { label: "Pitch range", min: 0, max: 48, step: 1, format: v => Math.round(v) + " st" }),
            knob("width", { label: "Width", min: 0, max: 1, format: pct }),
            knob("tail", { label: "Tail", min: 0, max: 1, format: pct, title: "Reverb / echo tail" }),
            knob("gap", { label: "Gap", min: 0, max: 2, step: 0.25, format: v => v ? v + " beat" + (v == 1 ? "" : "s") : "none", title: "Silence before the downbeat (risers): the classic drop gap" }));
        const syncControls = () => {
            for (const [t, b] of typeButtons) b.classList.toggle("cb-on", t.id == state.type);
            const t = typeInfo();
            root.style.setProperty("--sw-color", t.color);
            about.textContent = t.about;
            for (const k of Object.keys(knobs)) knobs[k].setValue && knobs[k].setValue(state[k]);
            if (lengthSel.menu) lengthSel.menu.selectedIndex = Math.max(0, LENGTHS.indexOf(state.beats));
            if (curveSel.menu) curveSel.menu.selectedIndex = state.curve | 0;
            placeHint();
            draw();
        };

        // ---- waveform
        const wave = HTML.canvas({ class: "cb-canvas cb-sw-wave", title: "Click to hear it" });
        let rendered = null, renderedKey = "";
        const ensure = () => {
            const key = FLSweepers.keyFor(spec());
            if (key != renderedKey) { rendered = FLSweepers.render(spec()); renderedKey = key; }
            return rendered;
        };
        let drawTimer = 0;
        const draw = () => { clearTimeout(drawTimer); drawTimer = setTimeout(paint, 60); };
        const paint = () => {
            if (!wave.isConnected) return;
            const r = ensure();
            const s = spec();
            const t = typeInfo();
            const { ctx, w, h } = CarrotUI.ctx(wave);
            ctx.fillStyle = "#0b1016"; ctx.fillRect(0, 0, w, h);
            // beat grid
            for (let b = 0; b <= s.beats; b++) {
                const x = b / s.beats * w;
                ctx.fillStyle = b % doc.song.beatsPerBar == 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)";
                ctx.fillRect(Math.round(x), 0, 1, h);
            }
            const n = r.length, step = n / w;
            ctx.fillStyle = t.color;
            for (let x = 0; x < w; x++) {
                let m = 0;
                for (let i = Math.floor(x * step), e = Math.min(n, Math.floor((x + 1) * step)); i < e; i += 3) m = Math.max(m, Math.abs(r.left[i]), Math.abs(r.right[i]));
                const a = m * (h / 2 - 4);
                ctx.fillRect(x, h / 2 - a, 1, Math.max(1, a * 2));
            }
            // where the beat is
            ctx.fillStyle = "#fff";
            ctx.font = "bold 10px sans-serif";
            if (t.dir == "rise") { ctx.fillRect(w - 2, 0, 2, h); ctx.fillText("bar ▸", w - 40, 12); }
            else { ctx.fillRect(0, 0, 2, h); ctx.fillText("◂ bar", 5, 12); }
            ctx.fillStyle = "#93a7b8"; ctx.font = "10px sans-serif";
            ctx.fillText(FLSweepers.nameOf(s), 6, h - 6);
        };
        const preview = () => { const r = ensure(); FLSampleBank.previewPcm(r.mono, r.rate); };
        wave.addEventListener("click", preview);

        // ---- placing
        const firstBar = () => typeInfo().dir == "rise" ? Math.max(doc.bar + 1, Math.ceil(state.beats / doc.song.beatsPerBar) + 1) : doc.bar + 1;
        const barInput = HTML.input({ type: "number", min: "1", value: String(firstBar()), title: "The bar the sweep leads into (risers end where it starts) or starts on (falls)" });
        const everySel = CarrotUI.select({ label: "Repeat", options: ["Once", "Every 4 bars", "Every 8 bars", "Every 16 bars"], value: state.every | 0, onChange: (i) => { state.every = i; save(); placeHint(); } });
        const hint = HTML.div({ class: "cb-sw-about" });
        const placeHint = () => {
            const t = typeInfo();
            const bar = Math.max(1, Math.round(+barInput.value || 1));
            const room = (bar - 1) * doc.song.beatsPerBar >= state.beats;
            hint.textContent = t.dir == "rise" ? (room ? "Ends right where bar " + bar + " starts (" + state.beats + " beats before it)." : "Bar " + bar + " is too early for a " + state.beats + "-beat riser: pick bar " + (Math.ceil(state.beats / doc.song.beatsPerBar) + 1) + " or later.") : "Starts on bar " + bar + " and lasts " + state.beats + " beats.";
        };
        barInput.addEventListener("input", placeHint);
        const targetBars = () => {
            const bar = Math.max(1, Math.round(+barInput.value || 1)) - 1;
            const every = [0, 4, 8, 16][state.every | 0];
            if (!every) return [bar];
            const out = [];
            for (let b = bar; b < doc.song.barCount + (typeInfo().dir == "rise" ? 1 : 0); b += every) out.push(b);
            return out;
        };
        const placeButton = CarrotUI.button("Place in song", () => place(doc, state, targetBars()), { primary: true, title: "Adds the sweep on an \"FX Sweeps\" channel" });
        const useBar = CarrotUI.button("Current bar", () => { barInput.value = String(firstBar()); placeHint(); }, { title: "Use the bar selected in the editor" });
        const variation = CarrotUI.button("New variation", () => { state.seed = 1 + Math.floor(Math.random() * 99998); save(); draw(); preview(); }, { title: "Same settings, different random details" });
        const retimeButton = CarrotUI.button("Fit sweeps to tempo", () => retime(doc), { title: "After changing the song tempo: re-render every placed sweep so it still lands on the beat" });

        root.append(
            CarrotUI.section("Sweep type", types, about),
            CarrotUI.section("Shape", wave, shape, CarrotUI.row(CarrotUI.button("Play", preview, { primary: true }), variation)),
            CarrotUI.section("Place", HTML.div({ class: "cb-row cb-sw-place" }, HTML.span("Bar"), barInput, useBar, everySel, placeButton, retimeButton), hint));
        syncControls();
        setTimeout(paint, 40);
        return root;
    }

    B.CarrotPlugins.register({
        id: "sweeplab",
        width: 820,
        defaultParams: () => ({}),
        open,
        // exposed for tests
        _place: place,
        _retime: retime,
    });
})();
