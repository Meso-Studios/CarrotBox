    // ======================================================================
    // CarrotBox: My Songs - songs uploaded from this computer and local saves.
    //
    // Audio songs (WAV, MP3, OGG, FLAC, M4A, AIFF, WebM) and song files (CarrotBox / BeepBox
    // .json projects, .mid, a .txt holding a song URL) are kept in this browser (IndexedDB:
    // the "mySongs" store holds the list, "mySongFiles" the bytes). Nothing leaves the
    // computer. From the list an audio song can be played, transcribed with AudioMidi, put on
    // a reference track, loaded into the sampler or added to the Sound Browser; a project opens.
    // ======================================================================
    const CARROT_MY_SONGS_CSS = `
.cb-ms-top { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
.cb-ms-top input[type=text] { flex: 1 1 140px; min-width: 0; }
.cb-ms-drop { border: 2px dashed rgba(127,127,127,0.45); border-radius: 10px; padding: 10px; text-align: center; font-size: 12px; opacity: 0.85; cursor: pointer; margin-bottom: 6px; }
.cb-ms-drop.cb-hover { background: rgba(255,155,33,0.12); border-color: #ff9b21; }
.cb-ms-list { display: flex; flex-direction: column; gap: 4px; max-height: 52vh; overflow-y: auto; }
.cb-ms-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 5px 7px; border-radius: 8px; background: rgba(127,127,127,0.09); }
.cb-ms-row.cb-on { box-shadow: 0 0 0 1px var(--cb-plugin-color) inset; }
.cb-ms-kind { font-size: 10px; font-weight: 700; text-align: center; padding: 5px 0; border-radius: 6px; background: rgba(255,255,255,0.08); }
.cb-ms-main { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cb-ms-name { font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cb-ms-sub { font-size: 10.5px; opacity: 0.65; }
.cb-ms-main canvas { width: 100%; height: 26px; display: block; border-radius: 4px; background: rgba(0,0,0,0.3); cursor: pointer; }
.cb-ms-actions { display: flex; gap: 3px; flex-wrap: wrap; justify-content: flex-end; max-width: 330px; }
.cb-ms-actions .cb-button { padding: 2px 7px; font-size: 11px; }
.cb-ms-meter { font-size: 11px; opacity: 0.75; }
`;
    class CarrotMySongs extends CarrotFloatingWindow {
        static open(editor) {
            return CarrotWindows.openPanel("mySongs", () => new CarrotMySongs(editor));
        }
        static install(editor) {
            CarrotMySongs._editor = editor;
            if (!CarrotMySongs._styled) {
                CarrotMySongs._styled = true;
                document.head.appendChild(HTML.style({ type: "text/css" }, CARROT_MY_SONGS_CSS));
            }
        }
        // ---------------------------------------------------------------- storage
        static kindOf(name, type) {
            const ext = (/\.([a-z0-9]+)$/i.exec(name || "") || [])[1];
            const e = ext ? ext.toLowerCase() : "";
            if (/^(wav|wave|mp3|ogg|oga|opus|flac|m4a|aac|aif|aiff|webm|weba|mp4)$/.test(e) || /^audio\//.test(type || ""))
                return "audio";
            if (e == "mid" || e == "midi")
                return "midi";
            if (e == "json")
                return "project";
            if (e == "txt")
                return "url";
            return null;
        }
        static async list() {
            try {
                return (await FLStore.getAll("mySongs")) || [];
            }
            catch (error) {
                return [];
            }
        }
        static async bytes(id) {
            const blob = await FLStore.get("mySongFiles", id);
            if (!blob)
                return null;
            return new Uint8Array(blob instanceof Blob ? await blob.arrayBuffer() : blob);
        }
        // Stores a file; resolves with its entry. options: name, kind (else from the name).
        static async add(file, options = {}) {
            const name = options.name || file.name || "Song";
            const kind = options.kind || CarrotMySongs.kindOf(name, file.type);
            if (!kind)
                throw new Error(name + " is not an audio song or a song file");
            const bytes = new Uint8Array(await file.arrayBuffer());
            const entry = { id: "ms:" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36), name, kind, size: bytes.length, added: Date.now(), tags: [], duration: 0, peaks: null };
            if (kind == "audio") {
                const info = await CarrotMySongs._analyze(bytes, name);
                entry.duration = info.duration;
                entry.peaks = info.peaks;
            }
            else if (kind == "url" || kind == "project") {
                const text = flTextDecoder.decode(bytes).trim();
                if (kind == "url" && !/#?[0-9A-Za-z]/.test(text))
                    throw new Error(name + " does not hold a song URL");
            }
            await FLStore.run(["mySongs", "mySongFiles"], "readwrite", (tx) => {
                tx.objectStore("mySongFiles").put(new Blob([bytes]), entry.id);
                tx.objectStore("mySongs").put(entry);
            });
            CarrotMySongs._changed();
            return entry;
        }
        static async remove(id) {
            await FLStore.run(["mySongs", "mySongFiles"], "readwrite", (tx) => {
                tx.objectStore("mySongs").delete(id);
                tx.objectStore("mySongFiles").delete(id);
            });
            CarrotMySongs._changed();
        }
        static async update(entry) {
            await FLStore.put("mySongs", entry);
            CarrotMySongs._changed();
        }
        static _changed() {
            for (const listener of CarrotMySongs._listeners)
                try {
                    listener();
                }
                catch (error) {
                    console.warn(error);
                }
        }
        // duration and a waveform overview (200 peaks)
        static async _analyze(bytes, name) {
            let mono = null, rate = 22050;
            try {
                const ctx = new OfflineAudioContext(1, 1, 22050);
                const buffer = await ctx.decodeAudioData(bytes.slice().buffer);
                mono = buffer.getChannelData(0);
                rate = buffer.sampleRate;
            }
            catch (error) {
                const decoded = await FLSampleBank.decode(bytes, name);
                mono = decoded.channels[0];
                rate = decoded.sampleRate;
            }
            const peaks = [];
            const n = 200;
            let top = 1e-9;
            for (let i = 0; i < n; i++) {
                const a = Math.floor(i * mono.length / n), b = Math.floor((i + 1) * mono.length / n);
                let m = 0;
                for (let k = a; k < b; k += 7)
                    m = Math.max(m, Math.abs(mono[k]));
                peaks.push(m);
                top = Math.max(top, m);
            }
            return { duration: mono.length / rate, peaks: peaks.map(v => +(v / top).toFixed(3)) };
        }
        // A My Songs audio song as a sample id (for drags onto pads and the browser).
        static async toSampleId(id) {
            const entries = await CarrotMySongs.list();
            const entry = entries.find(e => e.id == id);
            const bytes = await CarrotMySongs.bytes(id);
            if (!entry || !bytes)
                return null;
            return FLSampleBank.addBytes(bytes, entry.name);
        }
        static async saveCurrentSong(doc, name) {
            const { json } = await flProjectJson(doc);
            const file = new Blob([JSON.stringify(json)], { type: "application/json" });
            return CarrotMySongs.add(file, { name: (name || "My song") + ".json", kind: "project" });
        }
        // ---------------------------------------------------------------- window
        constructor(editor) {
            super(editor, { key: "mySongs", title: "My Songs", icon: "MS", color: "#ff9b21", width: 720 });
            CarrotMySongs.install(editor);
            this._filter = "all";
            this._sort = "date";
            this._query = "";
            this._entries = [];
            this._audio = null;
            this._playing = null;
            const fileInput = HTML.input({ type: "file", multiple: true, accept: "audio/*,.wav,.mp3,.ogg,.oga,.opus,.flac,.m4a,.aac,.aif,.aiff,.webm,.json,.mid,.midi,.txt", style: "display: none;" });
            fileInput.addEventListener("change", () => { const files = Array.from(fileInput.files || []); fileInput.value = ""; this._upload(files); });
            const upload = CarrotUI.button("Upload songs...", () => fileInput.click(), { primary: true, title: "Audio songs (WAV, MP3, OGG, FLAC, M4A, AIFF) or song files (.json, .mid, a .txt with a song URL)" });
            const saveCurrent = CarrotUI.button("Save current song", async () => {
                const name = await CarrotUI.ask({ title: "Save to My Songs", label: "A name for this version of the song", value: (this.doc.song.channels[0] && this.doc.song.channels[0].name) || "My song", okLabel: "Save" });
                if (name == null)
                    return;
                try {
                    await CarrotMySongs.saveCurrentSong(this.doc, name.trim() || "My song");
                    flToast("Saved \"" + (name.trim() || "My song") + "\" to My Songs");
                }
                catch (error) {
                    flToast("Could not save: " + (error.message || error));
                }
            }, { title: "Keep the song as it is now (with its imported samples) in this browser" });
            const search = HTML.input({ type: "text", placeholder: "Search", spellcheck: "false" });
            for (const type of ["keydown", "keyup", "keypress"])
                search.addEventListener(type, (e) => e.stopPropagation());
            search.addEventListener("input", () => { this._query = search.value.trim().toLowerCase(); this._render(); });
            const filter = CarrotUI.select({ label: "", options: ["All", "Audio songs", "Song files"], value: 0, onChange: (v) => { this._filter = ["all", "audio", "files"][v]; this._render(); } });
            const sort = CarrotUI.select({ label: "", options: ["Newest", "Name", "Longest", "Biggest"], value: 0, onChange: (v) => { this._sort = ["date", "name", "duration", "size"][v]; this._render(); } });
            this._meter = HTML.span({ class: "cb-ms-meter" });
            const drop = HTML.div({ class: "cb-ms-drop" }, "Drop songs here, or click to choose files. They stay on this computer.");
            drop.addEventListener("click", () => fileInput.click());
            const over = (e) => { if (flDragHasFiles(e)) { e.preventDefault(); drop.classList.add("cb-hover"); } };
            this.container.addEventListener("dragover", over);
            this.container.addEventListener("dragleave", (e) => { if (!this.container.contains(e.relatedTarget)) drop.classList.remove("cb-hover"); });
            this.container.addEventListener("drop", (e) => {
                if (!flDragHasFiles(e))
                    return;
                e.preventDefault();
                e.stopPropagation();
                drop.classList.remove("cb-hover");
                this._upload(Array.from(e.dataTransfer.files || []));
            });
            this._status = HTML.div({ class: "cb-hint", style: "min-height: 15px;" });
            this._list = HTML.div({ class: "cb-ms-list" });
            this.setBody(HTML.div(HTML.div({ class: "cb-ms-top" }, upload, saveCurrent, search, filter, sort), drop, fileInput, this._status, this._list, HTML.div({ class: "cb-row", style: "justify-content: space-between; margin-top: 6px;" }, this._meter, CarrotUI.hint("Kept in this browser only. Use Download to move a song elsewhere."))));
            this._listener = () => this._reload();
            CarrotMySongs._listeners.add(this._listener);
            this.mount();
            this._reload();
        }
        onClose() {
            CarrotMySongs._listeners.delete(this._listener);
            this._stopAudio();
        }
        async _reload() {
            this._entries = await CarrotMySongs.list();
            this._render();
            try {
                if (navigator.storage && navigator.storage.estimate) {
                    const est = await navigator.storage.estimate();
                    const mb = (v) => (v / 1048576).toFixed(v > 1e9 ? 0 : 1) + " MB";
                    const mine = this._entries.reduce((s, e) => s + (e.size || 0), 0);
                    this._meter.textContent = this._entries.length + " song" + (this._entries.length == 1 ? "" : "s") + ", " + mb(mine) + " (browser storage: " + mb(est.usage || 0) + " of " + mb(est.quota || 0) + ")";
                }
            }
            catch (error) { }
        }
        async _upload(files) {
            const ok = [], bad = [];
            for (const file of files) {
                const kind = CarrotMySongs.kindOf(file.name, file.type);
                if (!kind) {
                    bad.push(file.name);
                    continue;
                }
                if (file.size > 80 * 1048576 && !window.confirm(file.name + " is " + Math.round(file.size / 1048576) + " MB. Keep it in this browser anyway?"))
                    continue;
                this._status.textContent = "Adding " + file.name + "...";
                try {
                    await CarrotMySongs.add(file);
                    ok.push(file.name);
                }
                catch (error) {
                    console.warn(error);
                    bad.push(file.name + (error && error.name == "QuotaExceededError" ? " (no room left in this browser)" : ""));
                }
            }
            this._status.textContent = (ok.length ? "Added " + ok.length + " song" + (ok.length == 1 ? "" : "s") + ". " : "") + (bad.length ? "Could not add: " + bad.join(", ") : "");
        }
        _visible() {
            let list = this._entries.slice();
            if (this._filter == "audio")
                list = list.filter(e => e.kind == "audio");
            else if (this._filter == "files")
                list = list.filter(e => e.kind != "audio");
            if (this._query)
                list = list.filter(e => (e.name + " " + (e.tags || []).join(" ")).toLowerCase().includes(this._query));
            const by = { date: (a, b) => b.added - a.added, name: (a, b) => a.name.localeCompare(b.name), duration: (a, b) => (b.duration || 0) - (a.duration || 0), size: (a, b) => b.size - a.size }[this._sort];
            return list.sort(by);
        }
        _render() {
            this._list.innerHTML = "";
            const list = this._visible();
            if (!list.length) {
                this._list.appendChild(CarrotUI.hint(this._entries.length ? "No song matches." : "No songs yet. Upload audio songs to play them, transcribe them with AudioMidi or use them as a reference track; save versions of your own songs here too."));
                return;
            }
            for (const entry of list)
                this._list.appendChild(this._row(entry));
        }
        _row(entry) {
            const time = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");
            const size = entry.size > 1048576 ? (entry.size / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(entry.size / 1024)) + " KB";
            const label = { audio: "AUDIO", project: "SONG", midi: "MIDI", url: "URL" }[entry.kind] || "?";
            const name = HTML.div({ class: "cb-ms-name", title: entry.name + " (double-click to rename)" }, entry.name);
            name.addEventListener("dblclick", async () => {
                const v = await CarrotUI.ask({ title: "Rename", value: entry.name, okLabel: "Rename" });
                if (v && v.trim()) {
                    entry.name = v.trim();
                    await CarrotMySongs.update(entry);
                }
            });
            const sub = HTML.div({ class: "cb-ms-sub" }, (entry.kind == "audio" ? time(entry.duration || 0) + "  ·  " : "") + size + "  ·  added " + new Date(entry.added).toLocaleDateString());
            const main = HTML.div({ class: "cb-ms-main" }, name, sub);
            const actions = [];
            const act = (text, fn, title) => actions.push(CarrotUI.button(text, async () => {
                try {
                    await fn();
                }
                catch (error) {
                    console.warn(error);
                    flToast("My Songs: " + (error.message || error));
                }
            }, { title }));
            if (entry.kind == "audio") {
                const canvas = HTML.canvas({ width: 400, height: 26 });
                main.appendChild(canvas);
                entry._canvas = canvas;
                this._drawWave(entry);
                canvas.addEventListener("click", (e) => {
                    const r = canvas.getBoundingClientRect();
                    this._play(entry, Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
                });
                act(this._playing == entry.id ? "Stop" : "Play", () => this._playing == entry.id ? this._stopAudio() : this._play(entry, 0), "Listen (click the waveform to start somewhere else)");
                act("AudioMidi", () => this._toAudioMidi(entry), "Turn this song into notes with AudioMidi");
                act("Reference track", () => this._referenceTrack(entry), "Put this song on a new muted channel, playing from bar 1, to compare with your song");
                act("Sampler", () => this._toSampler(entry), "Load it into the current instrument as a sample");
                act("To browser", async () => { await CarrotMySongs.toSampleId(entry.id); flToast("Added " + entry.name + " to the Sound Browser (Your sounds)"); }, "Add it to the Sound Browser as one of your sounds");
            }
            else
                act("Open", () => this._openSong(entry), "Open this song (replaces the current one; Z undoes)");
            act("Download", async () => { const bytes = await CarrotMySongs.bytes(entry.id); save(new Blob([bytes]), entry.name); }, "Save the file back to your computer");
            act("Delete", async () => {
                if (!window.confirm("Delete " + entry.name + " from My Songs?"))
                    return;
                if (this._playing == entry.id)
                    this._stopAudio();
                await CarrotMySongs.remove(entry.id);
            }, "Remove it from this browser");
            return HTML.div({ class: "cb-ms-row" + (this._playing == entry.id ? " cb-on" : "") }, HTML.div({ class: "cb-ms-kind" }, label), main, HTML.div({ class: "cb-ms-actions" }, ...actions));
        }
        _drawWave(entry) {
            const canvas = entry._canvas;
            if (!canvas || !entry.peaks)
                return;
            const g = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
            g.clearRect(0, 0, w, h);
            const pos = this._playing == entry.id && this._audio && this._audio.duration ? this._audio.currentTime / this._audio.duration : -1;
            entry.peaks.forEach((v, i) => {
                const x = i * w / entry.peaks.length;
                g.fillStyle = pos >= 0 && i / entry.peaks.length <= pos ? "#ff9b21" : "rgba(255,255,255,0.5)";
                g.fillRect(x, h / 2 - v * h * 0.45, Math.max(1, w / entry.peaks.length - 0.5), Math.max(1, v * h * 0.9));
            });
        }
        async _play(entry, at) {
            this._stopAudio();
            if (this.doc.synth.playing)
                this.doc.performance.pause();
            const bytes = await CarrotMySongs.bytes(entry.id);
            if (!bytes)
                return;
            const url = URL.createObjectURL(new Blob([bytes]));
            const audio = new Audio(url);
            this._audio = audio;
            this._audioUrl = url;
            this._playing = entry.id;
            audio.addEventListener("loadedmetadata", () => { if (at > 0 && audio.duration) audio.currentTime = at * audio.duration; });
            audio.addEventListener("ended", () => this._stopAudio());
            audio.play().catch(() => this._stopAudio());
            const tick = () => {
                if (this._audio != audio)
                    return;
                // the song's own playback wins
                if (this.doc.synth.playing) {
                    this._stopAudio();
                    return;
                }
                this._drawWave(entry);
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            this._render();
        }
        _stopAudio() {
            if (this._audio) {
                this._audio.pause();
                this._audio = null;
            }
            if (this._audioUrl) {
                URL.revokeObjectURL(this._audioUrl);
                this._audioUrl = null;
            }
            const was = this._playing;
            this._playing = null;
            if (was)
                this._render();
        }
        async _file(entry) {
            const bytes = await CarrotMySongs.bytes(entry.id);
            if (!bytes)
                throw new Error("the file is missing from this browser");
            return new File([bytes], entry.name);
        }
        async _toAudioMidi(entry) {
            const file = await this._file(entry);
            this._stopAudio();
            window.__carrotPendingAudioMidiFile = file;
            carrotOpenTool(this.editor, "audiomidi");
            window.dispatchEvent(new CustomEvent("carrot-audiomidi-load", { detail: { file } }));
        }
        async _toSampler(entry) {
            const id = await CarrotMySongs.toSampleId(entry.id);
            const doc = this.doc;
            doc.record(new ChangeFL(doc, () => {
                const instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
                instrument.setTypeAndReset(FLConfig.typeSampler, doc.song.getChannelIsNoise(doc.channel));
                instrument.fl.sampler.sampleId = id;
                instrument.fl.sampler.sampleName = entry.name;
            }));
            flToast("Loaded " + entry.name + " into the current instrument");
        }
        async _referenceTrack(entry) {
            const doc = this.doc;
            const id = await CarrotMySongs.toSampleId(entry.id);
            await FLSampleBank.whenReady(id);
            const added = carrotNewChannel(doc, false);
            if (!added) {
                flToast("No room for another channel");
                return;
            }
            const group = new ChangeGroup();
            group.append(added.group);
            const channel = added.index;
            group.append(new ChangeFL(doc, () => {
                const ch = doc.song.channels[channel];
                const instrument = ch.instruments[0];
                instrument.setTypeAndReset(FLConfig.typeSampler, false);
                instrument.fl.sampler.sampleId = id;
                instrument.fl.sampler.sampleName = entry.name;
                instrument.fl.sampler.oneShot = true;
                instrument.fl.sampler.keytrack = false;
                ch.name = "Reference: " + entry.name;
                ch.muted = true;
            }));
            doc.record(group);
            carrotWriteNotes(doc, [[{ start: 0, end: Config.partsPerBeat, pitches: [48], size: Config.noteSizeMax }]], { channel, startBar: 0, replace: true, freshPatterns: true });
            flToast("Reference track added (muted): unmute it to compare");
        }
        async _openSong(entry) {
            const doc = this.doc;
            const bytes = await CarrotMySongs.bytes(entry.id);
            if (!bytes)
                throw new Error("the file is missing from this browser");
            if (doc.flDirty && !window.confirm("Open " + entry.name + "? Your current song has changes that haven't been saved."))
                return;
            if (doc.synth.playing)
                doc.performance.pause();
            doc.goBackToStart();
            if (entry.kind == "midi")
                new ImportPrompt(doc)._parseMidiFile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
            else {
                let text = flTextDecoder.decode(bytes).trim();
                if (entry.kind == "url") {
                    const hash = text.indexOf("#");
                    text = hash >= 0 ? text.slice(hash + 1) : text;
                }
                doc.record(new ChangeSong(doc, text), true, true);
            }
            doc.flDirty = false;
            flToast("Opened " + entry.name + " (Z undoes)");
        }
    }
    CarrotMySongs._listeners = new Set();
    CarrotMySongs._styled = false;
