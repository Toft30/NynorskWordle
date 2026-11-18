// Hentar alle oppslagsord frå Nynorskordboka (ord.uib.no) og lagar ordlista
// som spelet brukar (ordliste.js).
//
// Køyr:  node verktoy/lag-ordliste.js
//
// - GYLDIGE: alle oppslagsord på nøyaktig 5 bokstavar (a–å) – godtekne som gjetting.
// - SVAR:    substantiv og adjektiv på 5 bokstavar – kandidatar til dagens ord.

const fs = require("fs");
const path = require("path");

const KJELDE = "https://ord.uib.no/nn/fil/lemma.json";
const UT = path.join(__dirname, "..", "ordliste.js");
const FEM = /^[a-zæøå]{5}$/;
const SJELDNE_BOKSTAVAR = /[cqwxz]/; // ikkje som dagens ord

async function main() {
  console.log("Hentar " + KJELDE + " ...");
  const res = await fetch(KJELDE);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const lemma = await res.json(); // [ord, artikkel-id, ordklasse, bøyingsklasse]

  const gyldige = new Set();
  const svar = new Set();
  for (const [ord, , ordklasse] of lemma) {
    if (!FEM.test(ord)) continue;
    gyldige.add(ord);
    if ((ordklasse === "NOUN" || ordklasse === "ADJ") && !SJELDNE_BOKSTAVAR.test(ord)) {
      svar.add(ord);
    }
  }

  const sorter = (s) => [...s].sort((a, b) => a.localeCompare(b, "nn"));
  const innhald =
    "// Generert av verktoy/lag-ordliste.js frå Nynorskordboka (ord.uib.no).\n" +
    "// Kjelde: Nynorskordboka, Språkrådet og Universitetet i Bergen.\n" +
    "// Generert: " + new Date().toISOString().slice(0, 10) + "\n" +
    "const SVAR = " + JSON.stringify(sorter(svar)) + ";\n" +
    "const GYLDIGE = new Set(" + JSON.stringify(sorter(gyldige)) + ");\n";
  fs.writeFileSync(UT, innhald, "utf8");
  console.log(`Ferdig: ${svar.size} svarord, ${gyldige.size} gyldige ord -> ${UT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
