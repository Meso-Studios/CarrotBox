// Loads AudioMidi's amEngine() out of plugins/audiomidi.js so it runs in Node.
const fs = require("fs");
const path = require("path");
module.exports = function load(file) {
	const src = fs.readFileSync(file || path.join(__dirname, "..", "..", "plugins", "audiomidi.js"), "utf8");
	const a = src.indexOf("\tfunction amEngine() {");
	const b = src.indexOf("\t// ======================================================================= running the engine");
	if (a < 0 || b < 0) throw new Error("engine not found");
	const body = src.slice(a, b);
	const AM = new Function("\"use strict\";\n" + body + "\nreturn amEngine();")();
	AM.setPause(() => null);
	return AM;
};
