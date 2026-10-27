    // ======================================================================
    // CarrotBox: real recorded samples (CC0).
    //
    // 56 one-shots from the Versilian Community Sample Library (VCSL) by
    // Versilian Studios, released under CC0 1.0 (public domain):
    // https://github.com/sgossner/VCSL
    // They were trimmed, made mono, normalized and stored as FLAC in
    // samples/vcsl/ (see samples/vcsl/LICENSE.txt).
    //
    // Unlike the rest of the library these are files, so they load
    // asynchronously: FLSampleBank fetches them the first time they are used.
    // They show up in "Real Recorded (CC0)" and as Real Drums / Real Perc /
    // Real Instruments folders inside the genre packs.
    // ======================================================================
    // [file, name, folder, rootKey (null = unpitched), VCSL instrument]
    const FL_CC0_SAMPLES = [
        ["kick-concert", "Concert Kick", "Drums", null, "Bass Drum 1"],
        ["kick-soft", "Soft Bass Drum", "Drums", null, "Bass Drum 1"],
        ["kick-boom", "Orchestral Boom", "Drums", null, "Bass Drum 2"],
        ["snare-crack", "Acoustic Snare", "Drums", null, "Snare Drum, Modern 1"],
        ["snare-ghost", "Ghost Snare", "Drums", null, "Snare Drum, Modern 1"],
        ["snare-off", "Snare (Snares Off)", "Drums", null, "Snare Drum, Modern 1"],
        ["rim-click", "Rim Click", "Drums", null, "Snare Drum, Modern 1"],
        ["snare-roll", "Snare Roll", "Drums", null, "Snare Drum, Modern 1"],
        ["hat-closed", "Closed Hi-Hat", "Drums", null, "Hi-Hat Cymbal"],
        ["hat-pedal", "Pedal Hi-Hat", "Drums", null, "Hi-Hat Cymbal"],
        ["hat-loose", "Loose Hi-Hat", "Drums", null, "Hi-Hat Cymbal"],
        ["hat-open", "Open Hi-Hat", "Drums", null, "Hi-Hat Cymbal"],
        ["clap-group", "Group Clap", "Drums", null, "Claps"],
        ["clap-solo", "Hand Clap", "Drums", null, "Claps"],
        ["crash", "Crash Cymbal", "Drums", null, "Suspended Cymbal 1"],
        ["ride-bell", "Cymbal Bell", "Drums", null, "Suspended Cymbal 1"],
        ["tom", "Floor Tom", "Drums", null, "Tom 1"],
        ["cowbell", "Cowbell", "Percussion", null, "Cowbells"],
        ["cowbell-muted", "Muted Cowbell", "Percussion", null, "Cowbells"],
        ["agogo-high", "Agogo High", "Percussion", null, "Agogo Bells"],
        ["agogo-low", "Agogo Low", "Percussion", null, "Agogo Bells"],
        ["tambourine", "Tambourine", "Percussion", null, "Tambourine 1"],
        ["tambourine-shake", "Tambourine Shake", "Percussion", null, "Tambourine 1"],
        ["shaker", "Shaker", "Percussion", null, "Shaker, Small"],
        ["shaker-double", "Shaker Double", "Percussion", null, "Shaker, Small"],
        ["woodblock", "Woodblock", "Percussion", null, "Woodblock"],
        ["claves", "Claves", "Percussion", null, "Claves"],
        ["bongo-high", "Bongo High", "Percussion", null, "Bongos"],
        ["bongo-low", "Bongo Low", "Percussion", null, "Bongos"],
        ["conga", "Conga Open", "Percussion", null, "Conga"],
        ["conga-slap", "Conga Slap", "Percussion", null, "Conga"],
        ["tumba", "Tumba", "Percussion", null, "Conga"],
        ["cajon-bass", "Cajon Bass", "Percussion", null, "Cajon"],
        ["cajon-slap", "Cajon Slap", "Percussion", null, "Cajon"],
        ["guiro", "Guiro", "Percussion", null, "Guiro"],
        ["vibraslap", "Vibraslap", "Percussion", null, "Vibraslap"],
        ["anvil", "Anvil Hit", "Percussion", null, "Anvil"],
        ["brake-drum", "Brake Drum", "Percussion", null, "Brake Drum"],
        ["finger-cymbal", "Finger Cymbal", "Percussion", null, "Finger Cymbals"],
        ["gong", "Gong", "FX", null, "Gong 1"],
        ["siren-whistle", "Siren Whistle", "FX", null, "Siren"],
        ["ocean-drum", "Ocean Drum", "FX", null, "Ocean Drum"],
        ["cymbal-swell", "Cymbal Swell", "FX", null, "Suspended Cymbal 1"],
        ["marimba-c5", "Marimba", "Keys & Mallets", 72, "Marimba"],
        ["glockenspiel-c6", "Glockenspiel", "Keys & Mallets", 84, "Glockenspiel"],
        ["vibraphone-c6", "Vibraphone", "Keys & Mallets", 84, "Vibraphone"],
        ["tubular-bell-c5", "Tubular Bell", "Keys & Mallets", 72, "Tubular Bells 1"],
        ["kalimba-cs5", "Kalimba", "Keys & Mallets", 73, "Kalimba, Kenya"],
        ["fm-piano-c4", "FM Piano (TX81Z)", "Keys & Mallets", 60, "FM Piano"],
        ["clavisynth-c6", "Clavisynth (TX81Z)", "Keys & Mallets", 84, "Clavisynth"],
        ["harpsichord-c5", "Harpsichord", "Keys & Mallets", 72, "Harpsichord, English"],
        ["harp-c5", "Concert Harp", "Keys & Mallets", 72, "Concert Harp"],
        ["organ-c5", "Pipe Organ", "Keys & Mallets", 72, "Pipe Organ"],
        ["tenor-sax-c5", "Tenor Sax", "Winds", 72, "Tenor Saxophone"],
        ["tenor-sax-stab-c5", "Tenor Sax Stab", "Winds", 72, "Tenor Saxophone"],
        ["wine-glass-ds5", "Wine Glass", "Winds", 75, "Wine Glasses"],
    ];
    class FLRealSamples {
        static list() {
            return FL_CC0_SAMPLES;
        }
        static url(file) {
            return "samples/vcsl/" + file + ".flac";
        }
        // Decoded {pcm, rate, name, rootKey} once loaded, else null (and the load starts).
        static cached(info) {
            const file = info.params.file;
            const hit = FLRealSamples._decoded.get(file);
            if (hit && hit.pcm)
                return { pcm: hit.pcm, rate: hit.rate, name: info.name, rootKey: info.rootKey == undefined ? null : info.rootKey, loop: null, bpm: null };
            FLRealSamples.load(info);
            return null;
        }
        // Resolves to {pcm, rate} or null when the file can't be fetched (offline, file:// pages).
        static load(info) {
            const file = info.params.file;
            let job = FLRealSamples._jobs.get(file);
            if (!job) {
                job = (async () => {
                    try {
                        const response = await fetch(FLRealSamples.url(file));
                        if (!response.ok)
                            throw new Error("HTTP " + response.status);
                        const bytes = new Uint8Array(await response.arrayBuffer());
                        const decoded = await FLSampleBank.decode(bytes, file + ".flac");
                        const entry = { pcm: null, rate: 44100 };
                        FLSampleBank._applyDecoded(entry, decoded);
                        if (!entry.pcm || entry.pcm.length < 2)
                            throw new Error("empty");
                        const result = { pcm: entry.pcm, rate: entry.rate };
                        FLRealSamples._decoded.set(file, result);
                        return result;
                    }
                    catch (error) {
                        console.warn("CarrotBox: couldn't load real sample", file, error.message || error);
                        FLRealSamples._jobs.delete(file); // try again next time
                        return null;
                    }
                })();
                FLRealSamples._jobs.set(file, job);
            }
            return job;
        }
        // Fills a sample bank entry for a "b:" id whose catalog item is a file.
        static async fill(entry, info) {
            const result = await FLRealSamples.load(info);
            if (!result) {
                entry.status = "missing";
            }
            else {
                entry.pcm = result.pcm;
                entry.rate = result.rate;
                entry.name = info.name;
                entry.rootKey = info.rootKey == undefined ? null : info.rootKey;
                entry.status = "ready";
            }
            FLSampleBank._notify();
        }
    }
    FLRealSamples._jobs = new Map();
    FLRealSamples._decoded = new Map();
    {
        const add = (path, s) => flAdd(path, "file", { file: s[0] }, Object.assign({ real: true }, s[3] == null ? {} : { rootKey: s[3] }));
        const byFile = new Map(FL_CC0_SAMPLES.map(s => [s[0], s]));
        for (const s of FL_CC0_SAMPLES)
            add("Real Recorded (CC0)/" + s[2] + "/" + s[1], s);
        // genre packs: a real drum kit, real percussion and real instruments where they fit the genre
        const KITS = {
            acoustic: ["kick-soft", "kick-concert", "snare-crack", "snare-ghost", "rim-click", "hat-closed", "hat-pedal", "hat-open", "tom", "crash", "ride-bell"],
            rock: ["kick-concert", "kick-boom", "snare-crack", "snare-off", "tom", "hat-closed", "hat-loose", "hat-open", "crash", "ride-bell", "snare-roll"],
            beat: ["kick-soft", "snare-crack", "rim-click", "clap-solo", "clap-group", "hat-closed", "hat-open", "tambourine", "shaker"],
        };
        const PERC = {
            latin: ["conga", "conga-slap", "tumba", "bongo-high", "bongo-low", "guiro", "claves", "cowbell", "agogo-high", "agogo-low", "shaker", "vibraslap"],
            afro: ["conga", "tumba", "bongo-high", "bongo-low", "shaker", "shaker-double", "agogo-high", "agogo-low", "woodblock", "cajon-bass", "cajon-slap"],
            phonk: ["cowbell", "cowbell-muted", "agogo-high", "agogo-low", "anvil", "brake-drum", "siren-whistle", "woodblock", "vibraslap"],
            street: ["rim-click", "clap-group", "woodblock", "cowbell-muted", "siren-whistle", "brake-drum", "shaker"],
            dance: ["tambourine", "tambourine-shake", "shaker", "shaker-double", "cowbell", "claves", "clap-group", "conga", "bongo-high"],
            soft: ["shaker", "tambourine", "woodblock", "finger-cymbal", "cajon-bass", "cajon-slap", "ocean-drum"],
            metal: ["anvil", "brake-drum", "gong", "cymbal-swell", "tom"],
            cinema: ["gong", "kick-boom", "cymbal-swell", "ocean-drum", "finger-cymbal", "snare-roll", "anvil"],
        };
        const INST = {
            jazz: ["vibraphone-c6", "tenor-sax-c5", "tenor-sax-stab-c5", "fm-piano-c4", "marimba-c5"],
            keys: ["fm-piano-c4", "vibraphone-c6", "kalimba-cs5", "marimba-c5", "glockenspiel-c6"],
            church: ["organ-c5", "tubular-bell-c5", "harp-c5", "harpsichord-c5"],
            dream: ["kalimba-cs5", "glockenspiel-c6", "wine-glass-ds5", "harp-c5", "vibraphone-c6"],
            retro: ["fm-piano-c4", "clavisynth-c6", "tenor-sax-stab-c5"],
            phonk: ["tubular-bell-c5", "glockenspiel-c6", "organ-c5"],
            world: ["kalimba-cs5", "marimba-c5", "harp-c5"],
            cinema: ["tubular-bell-c5", "harp-c5", "organ-c5", "wine-glass-ds5", "harpsichord-c5"],
        };
        // genre -> [kit, perc, instruments]
        const GENRE_REAL = {
            "Trap": ["beat", "street", null], "Drill": ["beat", "street", null], "UK Drill": ["beat", "street", null], "NY Drill": ["beat", "street", null],
            "Boom Bap": ["acoustic", "soft", "jazz"], "Lo-Fi": ["acoustic", "soft", "keys"], "R&B": ["beat", "soft", "keys"], "Pop": ["beat", "dance", "keys"],
            "House": ["beat", "dance", "keys"], "Deep House": ["beat", "latin", "keys"], "Tech House": ["beat", "latin", null], "Techno": [null, "metal", null],
            "Drum & Bass": ["acoustic", "latin", null], "Jungle": ["acoustic", "latin", null], "Dubstep": [null, "metal", null], "Future Bass": ["beat", null, "dream"],
            "Phonk": ["beat", "phonk", "phonk"], "Brazilian Phonk": ["beat", "phonk", "phonk"], "Memphis Rap": ["beat", "phonk", "phonk"],
            "Afrobeats": ["beat", "afro", "world"], "Amapiano": ["beat", "afro", "keys"], "Reggaeton": ["beat", "latin", null], "Dancehall": ["beat", "latin", null],
            "Baile Funk": ["beat", "latin", null], "Moombahton": ["beat", "latin", null], "Disco & Funk": ["acoustic", "dance", "retro"], "Synthwave": [null, "dance", "retro"],
            "City Pop": ["acoustic", "dance", "retro"], "Jazz": ["acoustic", "soft", "jazz"], "Neo Soul": ["acoustic", "soft", "jazz"], "Gospel": ["acoustic", "dance", "church"],
            "Rock": ["rock", "metal", null], "Indie": ["rock", "soft", "dream"], "Metal": ["rock", "metal", null], "Punk": ["rock", null, null], "Grunge": ["rock", "metal", null],
            "Shoegaze": ["rock", "soft", "dream"], "Bedroom Pop": ["acoustic", "soft", "dream"], "Cinematic": ["rock", "cinema", "cinema"], "Ambient": [null, "soft", "dream"],
            "Witch House": [null, "cinema", "church"], "K-Pop": ["beat", "dance", "keys"], "Hardstyle": [null, "metal", null], "Breakcore": ["acoustic", "street", null],
            "Breakbeat": ["acoustic", "dance", null], "Plugg": ["beat", "street", "dream"], "Pluggnb": ["beat", "street", "dream"], "Rage": ["beat", "street", null],
            "Emo Rap": ["beat", "soft", "dream"], "Underground UG": ["beat", "street", null], "Vaporwave": [null, "dance", "retro"], "Trance": [null, "dance", "dream"],
        };
        const genres = (FLPackKit.lib4 && FLPackKit.lib4.genres) || [];
        const genreSet = new Set(genres.concat(FLPackKit.lib3 ? FLPackKit.lib3.genres : []));
        for (const genre of Object.keys(GENRE_REAL)) {
            if (!genreSet.has(genre))
                continue;
            const [kit, perc, inst] = GENRE_REAL[genre];
            const base = "Packs/" + genre;
            if (kit)
                for (const f of KITS[kit]) add(base + "/Real Drums/" + byFile.get(f)[1], byFile.get(f));
            if (perc)
                for (const f of PERC[perc]) add(base + "/Real Perc/" + byFile.get(f)[1], byFile.get(f));
            if (inst)
                for (const f of INST[inst]) add(base + "/Real Instruments/" + byFile.get(f)[1], byFile.get(f));
        }
    }
