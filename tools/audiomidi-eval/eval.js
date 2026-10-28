// Scores AudioMidi's transcription on synthetic songs with known notes (tools/audiomidi-eval/corpus.js:
// phonk, trap, pop, lo-fi, synthwave and EDM arrangements with 808 glides, reverb and drums).
//
//   node tools/audiomidi-eval/eval.js [engine.js] [--songs=N] [--from=SEED] [--style=phonk] [--v] [--opts='{"precision":0.5}']
//
// engine.js defaults to plugins/audiomidi.js (pass an older copy to compare). Prints note F-measure
// (onset within 50 ms, exact pitch) for every note heard ("raw") and the clean arrangement ("arr"),
// "+off" also needs the note end within 20% of its length, per part, what the wrong notes are
// (octave, semitone, fragments of a held note, extra) and how many pitch bends were written.
const load = require("./engine.js");
const { makeSong, STYLES } = require("./corpus.js");
const args = process.argv.slice(2);
const flag = (k, d) => { const a = args.find(x => x.startsWith("--" + k)); return a ? (a.includes("=") ? a.split("=")[1] : true) : d; };
const file = args.find(a => !a.startsWith("--"));
const AM = load(file);
const perStyle = +flag("songs", 3);
const only = flag("style", null);
const verbose = flag("v", false);
const opts = JSON.parse(flag("opts", "{}"));

function match(ref, est, withOffset) {
	// greedy one-to-one by onset distance; same pitch, onset within 50 ms
	const pairs = [];
	for (let i = 0; i < ref.length; i++) for (let j = 0; j < est.length; j++) {
		if (ref[i].midi != est[j].midi) continue;
		const d = Math.abs(ref[i].t - est[j].t);
		if (d > 0.05) continue;
		if (withOffset) {
			const e1 = ref[i].t + ref[i].dur, e2 = est[j].t + est[j].dur;
			if (Math.abs(e1 - e2) > Math.max(0.05, 0.2 * ref[i].dur)) continue;
		}
		pairs.push([d, i, j]);
	}
	pairs.sort((a, b) => a[0] - b[0]);
	const ur = new Set(), ue = new Set();
	for (const [, i, j] of pairs) { if (ur.has(i) || ue.has(j)) continue; ur.add(i); ue.add(j); }
	return { tp: ur.size, ref: ref.length, est: est.length, ur, ue };
}
const prf = (m) => { const p = m.est ? m.tp / m.est : 0, r = m.ref ? m.tp / m.ref : 0; return { p, r, f: p + r ? 2 * p * r / (p + r) : 0 }; };
function errors(ref, est, m) {
	// what the unmatched estimates are
	const out = { octave: 0, semitone: 0, frag: 0, extra: 0 };
	est.forEach((e, j) => {
		if (m.ue.has(j)) return;
		if (ref.some(r => Math.abs(r.t - e.t) < 0.05 && Math.abs(r.midi - e.midi) % 12 == 0)) out.octave++;
		else if (ref.some(r => Math.abs(r.t - e.t) < 0.05 && Math.abs(r.midi - e.midi) <= 2)) out.semitone++;
		else if (ref.some(r => r.midi == e.midi && e.t > r.t + 0.05 && e.t < r.t + r.dur)) out.frag++;
		else out.extra++;
	});
	return out;
}

const tot = {};
const add = (k, m) => { const t = tot[k] || (tot[k] = { tp: 0, ref: 0, est: 0 }); t.tp += m.tp; t.ref += m.ref; t.est += m.est; };
const errTot = {};
const addErr = (k, e) => { const t = errTot[k] || (errTot[k] = { octave: 0, semitone: 0, frag: 0, extra: 0 }); for (const x in e) t[x] += e[x]; };
let bpmOk = 0, keyOk = 0, n = 0;
const t0 = Date.now();
(async () => {
	for (const style of Object.keys(STYLES)) {
		if (only && style != only) continue;
		for (let s = +flag("from", 1); s < +flag("from", 1) + perStyle; s++) {
			const song = makeSong(style, s);
			const r = await AM.analyze(song.buf, Object.assign({ instruments: false }, opts));
			n++;
			const okBpm = [1, 2, 0.5].some(k => Math.abs(r.bpm * k - song.bpm) < 1);
			if (okBpm) bpmOk++;
			const line = [song.name.padEnd(34), ("bpm " + r.bpm.toFixed(1) + "/" + song.bpm).padEnd(16)];
			const arr = r.arr ? r.arr.bass.concat(r.arr.lead, r.arr.chords) : [];
			for (const [label, est] of [["raw", r.notes], ["arr", arr]]) {
				const m = match(song.truth, est, false), mo = match(song.truth, est, true);
				add(label, m); add(label + "+off", mo);
				const e = errors(song.truth, est, m); addErr(label, e);
				const q = prf(m), qo = prf(mo);
				line.push(label + " F " + q.f.toFixed(2) + " (P " + q.p.toFixed(2) + " R " + q.r.toFixed(2) + ") off " + qo.f.toFixed(2));
				if (label == "arr") line.push("err " + JSON.stringify(e));
				const bends = est.filter(x => x.bend).length, glides = song.truth.filter(x => x.glide).length;
				tot.bends = (tot.bends || 0) + (label == "raw" ? bends : 0); tot.glides = (tot.glides || 0) + (label == "raw" ? glides : 0);
				if (label == "raw") line.push("bends " + bends + "/" + glides);
				// per role
				for (const role of ["bass", "lead", "chords"]) {
					const ref = song.truth.filter(x => x.role == role);
					if (!ref.length) continue;
					const estR = label == "arr" ? (r.arr[role] || []) : r.notes.filter(x => x.role == role);
					const mr = match(ref, estR, false), mro = match(ref, estR, true);
					add(label + ":" + role, mr); add(label + "+off:" + role, mro);
					addErr(label + ":" + role, errors(ref, estR, mr));
				}
			}
			if (verbose) console.log(line.join("  "));
		}
	}
	console.log("songs", n, "bpm ok", bpmOk, "time", ((Date.now() - t0) / 1000).toFixed(1) + "s");
	console.log("bends written", tot.bends, "true glides", tot.glides); delete tot.bends; delete tot.glides;
	for (const k of Object.keys(tot).sort()) { const q = prf(tot[k]); console.log(k.padEnd(18), "F", q.f.toFixed(3), "P", q.p.toFixed(3), "R", q.r.toFixed(3), errTot[k] ? JSON.stringify(errTot[k]) : ""); }
})();
