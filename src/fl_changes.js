    // Generic undoable-by-history change for FL settings: mutate inside the
    // callback, and the song is re-serialized into the URL history.
    class ChangeFL extends Change {
        constructor(doc, mutate, isInstrumentSetting = true) {
            super();
            const result = mutate();
            if (result !== false) {
                if (isInstrumentSetting) {
                    const instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
                    instrument.preset = instrument.type;
                }
                doc.notifier.changed();
                this._didSomething();
            }
        }
    }
    // Time signature (see carrotTimeSig in fl_settings.js): the numerator is BeepBox's beats per
    // bar (changed with ChangeBeatsPerBar; options.strategy is its conversion strategy, "splice" by
    // default, which cuts notes past a shorter bar), the denominator and the beat grouping live in
    // song.fl. A new denominator also converts the tempo so notes keep their speed (4/4 at 120 ->
    // 7/8 is 240 eighths per minute) unless options.convertTempo is false.
    // groups: an array (or "2+2+3"); [] for none; null/undefined keeps the current grouping when
    // the numerator does not change. num may be null to take the sum of the groups.
    class ChangeTimeSignature extends ChangeGroup {
        constructor(doc, num, den, groups, options = {}) {
            super();
            const song = doc.song;
            const old = carrotTimeSig(song);
            den = den == null ? old.den : carrotValidDenominator(den);
            let newGroups = groups == null ? null : (carrotValidGroups(groups, 0) || []);
            if (num == null || !(+num > 0))
                num = newGroups && newGroups.length > 0 ? newGroups.reduce((a, b) => a + b, 0) : old.num;
            num = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, Math.round(+num)));
            if (newGroups == null)
                newGroups = num == old.num ? old.groups : [];
            if (newGroups.reduce((a, b) => a + b, 0) != num)
                newGroups = [];
            if (num != song.beatsPerBar)
                this.append(new ChangeBeatsPerBar(doc, num, options.strategy || "splice"));
            if (den != old.den && options.convertTempo !== false) {
                const tempo = Math.max(Config.tempoMin, Math.min(Config.tempoMax, Math.round(song.tempo * den / old.den)));
                this.append(new ChangeTempo(doc, song.tempo, tempo));
            }
            if (den != song.fl.timeSigDen || newGroups.join("+") != song.fl.beatGroups.join("+")) {
                this.append(new ChangeFL(doc, () => {
                    song.fl.timeSigDen = den;
                    song.fl.beatGroups = newGroups.slice();
                }, false));
            }
        }
    }
    // For modules and plugins: set the time signature as one undo step. Returns the new carrotTimeSig().
    function carrotSetTimeSig(doc, num, den, groups, options) {
        doc.record(new ChangeTimeSignature(doc, num, den, groups, options));
        return carrotTimeSig(doc.song);
    }
