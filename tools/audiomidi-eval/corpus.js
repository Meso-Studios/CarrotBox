// Synthetic songs with known notes, rendered at 22,050 Hz mono, for scoring AudioMidi: makeSong(style,
// seed) -> { buf, truth: [{ t, dur, midi, role }], drums, bpm, ... }. Same style and seed, same song.
const SR = 22050;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function rng(seed) {
	let s = seed >>> 0 || 1;
	return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// ---------------------------------------------------------------- oscillators
const blep = (t, dt) => {
	if (t < dt) { t /= dt; return t + t - t * t - 1; }
	if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
	return 0;
};
function osc(kind, phase, dt, pw = 0.5) {
	switch (kind) {
		case "sine": return Math.sin(2 * Math.PI * phase);
		case "saw": return 2 * phase - 1 - blep(phase, dt);
		case "square": case "pulse": {
			let v = phase < pw ? 1 : -1;
			v += blep(phase, dt);
			v -= blep((phase - pw + 1) % 1, dt);
			return v;
		}
		case "tri": return 1 - 4 * Math.abs(phase - 0.5);
	}
	return 0;
}
// state variable filter (Chamberlin, 2x oversampled for stability)
function svf() {
	let lp = 0, bp = 0;
	return (x, fc, q) => {
		const f = 2 * Math.sin(Math.PI * Math.min(fc, SR * 0.2) / (2 * SR));
		for (let k = 0; k < 2; k++) { lp += f * bp; const hp = x - lp - q * bp; bp += f * hp; }
		return lp;
	};
}
const env = (i, a, d, s, r, len) => {
	// samples; len = gate length
	let v;
	if (i < a) v = i / a;
	else if (i < a + d) v = 1 - (1 - s) * (i - a) / d;
	else v = s;
	if (i >= len) v *= Math.max(0, 1 - (i - len) / r);
	return v;
};

// ---------------------------------------------------------------- instruments
// Each renders one note into buf (with a pitch curve for glides). opts.glideFrom (midi) makes it slide in.
const INSTR = {
	saw: { osc: ["saw"], a: 0.005, d: 0.1, s: 0.8, r: 0.06, cut: 4000, env: 0, q: 0.8 },
	square: { osc: ["square"], a: 0.004, d: 0.1, s: 0.75, r: 0.05, cut: 3500, env: 0, q: 1 },
	supersaw: { osc: ["saw"], voices: 7, detune: 0.18, a: 0.01, d: 0.2, s: 0.8, r: 0.12, cut: 5000, env: 0, q: 1.2 },
	pluck: { osc: ["saw"], a: 0.002, d: 0.25, s: 0.0, r: 0.08, cut: 900, env: 3500, envd: 0.12, q: 0.9 },
	pad: { osc: ["saw"], voices: 3, detune: 0.1, a: 0.25, d: 0.3, s: 0.8, r: 0.35, cut: 1500, env: 0, q: 1.2 },
	piano: { add: [1, 0.6, 0.35, 0.25, 0.15, 0.1, 0.06, 0.04], decay: 1.4, a: 0.002, r: 0.12 },
	rhodes: { add: [1, 0.35, 0.08, 0.05], decay: 1.8, a: 0.003, r: 0.15, trem: 0 },
	bell: { fm: [3.5, 2.2], decay: 0.9, a: 0.001, r: 0.15 },
	cowbell: { cow: true, decay: 0.35, a: 0.001, r: 0.05 },
	sub808: { osc: ["sine"], drive: 1.8, a: 0.003, d: 0.6, s: 0.55, r: 0.12, decay: 2.5, click: true },
	reese: { osc: ["saw"], voices: 2, detune: 0.12, a: 0.005, d: 0.1, s: 0.9, r: 0.05, cut: 700, env: 0, q: 1.2 },
	fingerbass: { add: [1, 0.5, 0.25, 0.12, 0.06], decay: 0.9, a: 0.004, r: 0.05 },
	flute: { add: [1, 0.2, 0.05], a: 0.05, d: 0.1, s: 0.9, r: 0.08, vib: 0.18, breath: 0.03 },
	vibsaw: { osc: ["saw"], a: 0.01, d: 0.1, s: 0.85, r: 0.08, cut: 3000, env: 0, q: 1, vib: 0.3 },
};

function renderNote(buf, inst, n, rand) {
	const I = INSTR[inst];
	const t0 = Math.floor(n.t * SR);
	const len = Math.floor(n.dur * SR);
	const rel = Math.floor((I.r || 0.05) * SR);
	const total = len + rel;
	const amp = n.amp;
	const f1 = hz(n.midi), f0 = n.glideFrom != null ? hz(n.glideFrom) : f1;
	const glide = n.glideFrom != null ? Math.floor((n.glideTime || 0.08) * SR) : 0;
	const voices = I.voices || 1;
	const phases = Array.from({ length: voices }, () => rand());
	const filt = svf();
	let modPh = 0, modPh2 = 0, carPh = rand(), cow2 = rand();
	const vibRate = 5.2 + rand();
	for (let i = 0; i < total; i++) {
		const j = t0 + i;
		if (j < 0) continue;
		if (j >= buf.length) break;
		let f = glide && i < glide ? f0 * Math.pow(f1 / f0, i / glide) : f1;
		// bends inside the note (truth: n.bendTo at n.bendAt fraction)
		if (n.bendTo != null && i > n.bendAt * len) f = f1 * Math.pow(2, (n.bendTo - n.midi) / 12 * Math.min(1, (i - n.bendAt * len) / (0.06 * SR)));
		if (I.vib) f *= Math.pow(2, I.vib / 12 * Math.sin(2 * Math.PI * vibRate * i / SR) * Math.min(1, i / (0.25 * SR)));
		let v = 0;
		if (I.osc) {
			for (let k = 0; k < voices; k++) {
				const det = voices > 1 ? (k / (voices - 1) - 0.5) * 2 * I.detune : 0;
				const fk = f * Math.pow(2, det / 12), dt = fk / SR;
				phases[k] += dt; if (phases[k] >= 1) phases[k] -= 1;
				v += osc(I.osc[0], phases[k], dt);
			}
			v /= Math.sqrt(voices);
			let e = env(i, I.a * SR, I.d * SR, I.s, rel, len);
			if (I.decay) e *= Math.exp(-i / (I.decay * SR));
			if (I.cut) {
				const fc = I.cut + (I.env ? I.env * Math.exp(-i / ((I.envd || 0.2) * SR)) : 0);
				v = filt(v, Math.max(80, fc * Math.min(1, f / 200 + 0.6)), I.q);
			}
			if (I.drive) v = Math.tanh(v * I.drive) / Math.tanh(I.drive);
			if (I.click && i < 0.004 * SR) v += 0.3 * Math.sin(2 * Math.PI * 1200 * i / SR) * (1 - i / (0.004 * SR));
			v *= e;
		}
		else if (I.add) {
			const e = (I.s != null ? env(i, I.a * SR, I.d * SR, I.s, rel, len) : Math.min(1, i / (I.a * SR)) * (i < len ? 1 : Math.max(0, 1 - (i - len) / rel)));
			carPh += f / SR; if (carPh >= 1) carPh -= 1;
			for (let h = 0; h < I.add.length; h++) {
				if (f * (h + 1) > SR * 0.45) break;
				const dec = I.decay ? Math.exp(-i * (1 + h * 0.6) / (I.decay * SR)) : 1;
				v += I.add[h] * Math.sin(2 * Math.PI * carPh * (h + 1)) * dec;
			}
			if (I.breath) v += I.breath * (rand() * 2 - 1);
			v *= e;
		}
		else if (I.fm) {
			const e = Math.min(1, i / (I.a * SR)) * Math.exp(-i / (I.decay * SR)) * (i < len ? 1 : Math.max(0, 1 - (i - len) / rel));
			modPh += f * I.fm[0] / SR;
			carPh += f / SR;
			v = Math.sin(2 * Math.PI * carPh + I.fm[1] * Math.exp(-i / (0.15 * SR)) * Math.sin(2 * Math.PI * modPh)) * e;
		}
		else if (I.cow) {
			// two detuned squares (808 cowbell: 540 and 800 Hz), band-passed, tuned to the note
			const e = Math.min(1, i / (I.a * SR)) * (0.65 * Math.exp(-i / (0.03 * SR)) + 0.35 * Math.exp(-i / (I.decay * SR))) * (i < len ? 1 : Math.max(0, 1 - (i - len) / rel));
			carPh += f / SR; if (carPh >= 1) carPh -= 1;
			cow2 += f * 1.48 / SR; if (cow2 >= 1) cow2 -= 1;
			v = 0.5 * (osc("square", carPh, f / SR) + osc("square", cow2, f * 1.48 / SR));
			v = filt(v, f * 2.2, 1.4) * e;
		}
		buf[j] += amp * v;
	}
}

// ---------------------------------------------------------------- drums
function drum(buf, kind, t, amp, rand) {
	const t0 = Math.floor(t * SR);
	let ph = 0, n1 = 0, n2 = 0;
	const L = { kick: 0.35, snare: 0.22, clap: 0.25, hat: 0.05, open: 0.3, cow: 0.3 }[kind] * SR;
	for (let i = 0; i < L && t0 + i < buf.length; i++) {
		let v = 0;
		if (kind == "kick") { ph += 2 * Math.PI * (48 + 120 * Math.exp(-i / (0.025 * SR))) / SR; v = Math.sin(ph) * Math.exp(-i / (0.15 * SR)); }
		else if (kind == "snare") v = (0.45 * (rand() * 2 - 1) * Math.exp(-i / (0.06 * SR)) + 0.4 * Math.sin(2 * Math.PI * 185 * i / SR) * Math.exp(-i / (0.035 * SR)));
		else if (kind == "clap") { const burst = [0, 0.011, 0.022].reduce((s, o) => s + (i >= o * SR ? Math.exp(-(i - o * SR) / (0.006 * SR)) : 0), 0) + 0.6 * Math.exp(-i / (0.07 * SR)); v = (rand() * 2 - 1) * burst * 0.5; }
		else if (kind == "hat" || kind == "open") { const r = rand() * 2 - 1, d1 = r - n1, d2 = d1 - n2; n1 = r; n2 = d1; v = 0.5 * d2 * Math.exp(-i / ((kind == "hat" ? 0.012 : 0.12) * SR)); }
		buf[t0 + i] += amp * v;
	}
}

// ---------------------------------------------------------------- effects
function reverb(buf, mix, size = 0.8) {
	const combs = [1116, 1188, 1277, 1356, 1422, 1491].map(n => ({ b: new Float32Array(Math.round(n / 2)), p: 0, s: 0 }));
	const aps = [556, 441, 341].map(n => ({ b: new Float32Array(Math.round(n / 2)), p: 0 }));
	const fb = 0.7 + 0.28 * size, damp = 0.3;
	for (let i = 0; i < buf.length; i++) {
		const x = buf[i] * 0.02;
		let o = 0;
		for (const c of combs) { const y = c.b[c.p]; c.s = y * (1 - damp) + c.s * damp; c.b[c.p] = x + c.s * fb; if (++c.p >= c.b.length) c.p = 0; o += y; }
		for (const a of aps) { const y = a.b[a.p]; const out = y - o; a.b[a.p] = o + y * 0.5; if (++a.p >= a.b.length) a.p = 0; o = out; }
		buf[i] += o * mix * 3;
	}
}
function delayFx(buf, time, fbk, mix) {
	const d = Math.round(time * SR), line = new Float32Array(d);
	let p = 0;
	for (let i = 0; i < buf.length; i++) { const y = line[p]; line[p] = buf[i] + y * fbk; buf[i] += y * mix; if (++p >= d) p = 0; }
}

// ---------------------------------------------------------------- songs
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10] };
const PROGS = { minor: [[0, 5, 2, 6], [0, 3, 4, 0], [0, 5, 3, 4], [0, 6, 5, 4]], major: [[0, 4, 5, 3], [0, 5, 3, 4], [1, 4, 0, 0], [0, 3, 4, 4]], phrygian: [[0, 1, 0, 6], [0, 1, 5, 6]] };
function degree(root, scale, d) {
	const oct = Math.floor(d / 7), k = ((d % 7) + 7) % 7;
	return root + 12 * oct + scale[k];
}

const STYLES = {
	phonk: { bpm: [130, 145], mode: "phrygian", lead: ["cowbell", "bell", "square"], bass: "sub808", chords: ["pad", null], rhythm: "sixteenths", glide: 0.35, hats: 16, reverb: 0.25, kicks: "phonk", leadOct: 72 },
	trap: { bpm: [135, 150], mode: "minor", lead: ["bell", "pluck", "flute"], bass: "sub808", chords: ["pad", "piano"], rhythm: "sparse", glide: 0.25, hats: 16, reverb: 0.3, kicks: "trap", leadOct: 72 },
	pop: { bpm: [115, 125], mode: "major", lead: ["saw", "square", "vibsaw"], bass: "fingerbass", chords: ["piano"], rhythm: "eighths", glide: 0, hats: 8, reverb: 0.2, kicks: "four", leadOct: 72 },
	lofi: { bpm: [78, 90], mode: "minor", lead: ["rhodes", "flute"], bass: "fingerbass", chords: ["rhodes"], rhythm: "eighths", glide: 0, hats: 8, reverb: 0.45, kicks: "boom", leadOct: 72, swing: 0.12 },
	synthwave: { bpm: [100, 112], mode: "minor", lead: ["supersaw", "vibsaw"], bass: "reese", chords: ["pad"], rhythm: "quarters", glide: 0, hats: 8, reverb: 0.4, kicks: "four", leadOct: 72, delay: 0.25 },
	edm: { bpm: [124, 128], mode: "minor", lead: ["supersaw", "pluck"], bass: "reese", chords: ["supersaw"], rhythm: "eighths", glide: 0, hats: 8, reverb: 0.3, kicks: "four", leadOct: 72, chordStabs: true },
};

function makeSong(style, seed, bars = 8) {
	const S = STYLES[style], rand = rng(seed * 7919 + 13);
	const pick = (a) => a[Math.floor(rand() * a.length)];
	const bpm = Math.round(S.bpm[0] + rand() * (S.bpm[1] - S.bpm[0]));
	const beat = 60 / bpm, six = beat / 4;
	const root = 45 + Math.floor(rand() * 7) - 3; // around A2
	const scale = SCALES[S.mode];
	const prog = pick(PROGS[S.mode]);
	const leadInst = pick(S.lead), chordInst = pick(S.chords);
	const start = 0.3;
	const len = start + bars * 4 * beat + 1.2;
	const buf = new Float32Array(Math.ceil(len * SR));
	const truth = [];
	const swing = S.swing || 0;
	const at = (bar, st) => start + bar * 4 * beat + st * six + (st % 2 ? swing * six * 2 : 0);
	// motif: a one-bar (or two-bar) rhythm and contour that repeats with variations, like real music
	const motifs = [];
	for (let m = 0; m < 2; m++) {
		const steps = [];
		let s = 0;
		while (s < 16) {
			const lens = S.rhythm == "sixteenths" ? [1, 1, 2, 2, 3] : S.rhythm == "sparse" ? [2, 3, 4, 6] : S.rhythm == "quarters" ? [4, 4, 2, 6, 8] : [2, 2, 4, 1, 3];
			const L = Math.min(16 - s, pick(lens));
			if (rand() < (S.rhythm == "sixteenths" ? 0.12 : 0.2) && steps.length) { s += L; continue; } // rest
			steps.push({ s, L, d: Math.floor(rand() * 9) - 2 });
			s += L;
		}
		motifs.push(steps);
	}
	// lead
	const leadBase = degree(S.leadOct - 12 + ((root % 12) + 12) % 12 - 12, scale, 7) ; // tonic near leadOct
	for (let bar = 0; bar < bars; bar++) {
		const motif = motifs[(bar >> 1) % 2];
		const chordDeg = prog[bar % prog.length];
		for (const st of motif) {
			let d = st.d + (bar % 4 == 3 ? 1 : 0) + chordDeg * (rand() < 0.3 ? 1 : 0);
			const midi = degree(leadBase, scale, d);
			const t = at(bar, st.s), dur = st.L * six * (leadInst == "pluck" || leadInst == "bell" || leadInst == "cowbell" ? 0.9 : 0.92);
			const n = { t, dur, midi, amp: 0.16, role: "lead" };
			if (leadInst == "vibsaw" || leadInst == "flute") n.amp = 0.14;
			renderNote(buf, leadInst, n, rand);
			truth.push({ t, dur, midi, role: "lead" });
		}
	}
	// bass: roots of the chord, rhythm per style, 808 glides
	let prevBass = null;
	for (let bar = 0; bar < bars; bar++) {
		const chordDeg = prog[bar % prog.length];
		const r = degree(root - 12 + (root < 40 ? 12 : 0), scale, chordDeg);
		const bassMidi = r < 31 ? r + 12 : r;
		let pattern;
		if (S.bass == "sub808") pattern = pick([[[0, 6], [6, 4], [10, 6]], [[0, 10], [10, 6]], [[0, 3], [3, 5], [8, 8]], [[0, 16]]]);
		else if (style == "pop" || style == "edm") pattern = [[0, 2], [2, 2], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2]];
		else if (style == "synthwave") pattern = [[0, 2], [2, 2], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2]];
		else pattern = [[0, 6], [6, 2], [8, 6], [14, 2]];
		for (const [s, L] of pattern) {
			let midi = bassMidi;
			if (S.bass == "sub808" && s > 0 && rand() < 0.35) midi = bassMidi + pick([12, 7, -2, 3]);
			if (style == "synthwave" && s % 4 == 2) midi = bassMidi + 12;
			const t = at(bar, s), dur = L * six * (S.bass == "sub808" ? 0.98 : 0.85);
			const n = { t, dur, midi, amp: S.bass == "sub808" ? 0.38 : 0.28, role: "bass" };
			if (S.glide && prevBass != null && prevBass != midi && rand() < S.glide && Math.abs(prevBass - midi) <= 12) { n.glideFrom = prevBass; n.glideTime = 0.07; }
			renderNote(buf, S.bass, n, rand);
			truth.push({ t, dur, midi, role: "bass", glide: n.glideFrom != null });
			prevBass = midi;
		}
	}
	// chords
	if (chordInst) {
		for (let bar = 0; bar < bars; bar++) {
			const d = prog[bar % prog.length];
			const tones = [0, 2, 4].map(k => degree(root + 12, scale, d + k));
			const hits = S.chordStabs ? [[0, 3], [3, 3], [6, 4], [10, 3], [13, 3]] : chordInst == "piano" ? [[0, 8], [8, 8]] : [[0, 16]];
			for (const [s, L] of hits) {
				for (const m of tones) {
					const t = at(bar, s), dur = L * six * 0.95;
					renderNote(buf, chordInst, { t, dur, midi: m, amp: chordInst == "pad" ? 0.06 : chordInst == "supersaw" ? 0.06 : 0.08 }, rand);
					truth.push({ t, dur, midi: m, role: "chords" });
				}
			}
		}
	}
	// drums
	const drums = [];
	for (let bar = 0; bar < bars; bar++) {
		for (let s = 0; s < 16; s++) {
			const t = at(bar, s);
			let kick = false, snare = false;
			if (S.kicks == "four") kick = s % 4 == 0;
			else if (S.kicks == "phonk") kick = [0, 3, 6, 10].includes(s);
			else if (S.kicks == "trap") kick = [0, 7, 10].includes(s);
			else kick = [0, 7, 10].includes(s);
			snare = s == 4 || s == 12;
			if (S.kicks == "trap" || S.kicks == "phonk") snare = s == 8;
			if (kick) { drum(buf, "kick", t, 0.55, rand); drums.push({ t, kind: "kick" }); }
			if (snare) { drum(buf, style == "trap" || style == "phonk" ? "clap" : "snare", t, 0.45, rand); drums.push({ t, kind: "snare" }); }
			const hstep = 16 / S.hats;
			if (s % hstep == 0) { drum(buf, "hat", t, 0.18 * (s % 4 == 0 ? 1 : 0.7), rand); drums.push({ t, kind: "hat" }); }
			if (style == "phonk" && s % 2 == 1 && rand() < 0.15) { drum(buf, "hat", t + six / 2, 0.12, rand); }
		}
	}
	if (S.delay) delayFx(buf, beat * 0.75, 0.35, S.delay);
	if (S.reverb) reverb(buf, S.reverb);
	// master: soft clip, normalize to -1 dBFS
	let peak = 0;
	for (let i = 0; i < buf.length; i++) { buf[i] = Math.tanh(buf[i] * 1.2); peak = Math.max(peak, Math.abs(buf[i])); }
	const g = 0.89 / (peak || 1);
	for (let i = 0; i < buf.length; i++) buf[i] *= g;
	return { name: style + "-" + seed + "-" + leadInst + (chordInst ? "-" + chordInst : ""), style, bpm, buf, truth: truth.sort((a, b) => a.t - b.t), drums, leadInst, chordInst, key: root % 12 };
}

module.exports = { makeSong, STYLES, SR };
