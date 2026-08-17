#!/usr/bin/env node
// O-56 §2 — LE MAILLON COMPLET : ✓ sur une continuité → journal → `longest_swim_m` → plan.
// On rejoue la LOGIQUE de `syncRefsFromTests` telle qu'écrite (lue depuis le fichier), pas une
// copie : une seconde écriture divergerait, c'est R11.1.
import { readFileSync } from "node:fs";
const src = readFileSync("/home/user/Coach/endurabuild/js/state.js", "utf8");
const bloc = src.slice(src.indexOf("const debutPlan"), src.indexOf("return n;\n}"));
const cas = [
  ["cliquet MONTE sur un palier validé",        { longest_swim_m: "400", plan_start: "2026-01-01" }, [{type:"swimContinuity",value:800,date:"2026-03-01"}], "800"],
  ["il ne DESCEND jamais",                       { longest_swim_m: "2000", plan_start: "2026-01-01" }, [{type:"swimContinuity",value:800,date:"2026-03-01"}], "2000"],
  ["le PLUS HAUT, pas le plus récent",           { longest_swim_m: "400", plan_start: "2026-01-01" }, [{type:"swimContinuity",value:1400,date:"2026-03-01"},{type:"swimContinuity",value:900,date:"2026-05-01"}], "1400"],
  ["hors du plan : ignoré",                      { longest_swim_m: "400", plan_start: "2026-01-01" }, [{type:"swimContinuity",value:2000,date:"2023-06-01"}], "400"],
  ["aucun palier validé : rien ne bouge",        { longest_swim_m: "400", plan_start: "2026-01-01" }, [{type:"css",value:130,date:"2026-03-01"}], "400"],
];
let bad = 0;
for (const [nom, ans, tests, attendu] of cas) {
  const S = { answers: { ...ans, tests } };
  const f = new Function("S", "tests", "isFinite", "let n=0;" + bloc + "\nreturn S.answers.longest_swim_m;");
  const got = f(S, tests, isFinite);
  const ok = String(got) === attendu;
  if (!ok) bad++;
  console.log(`  ${ok ? "✔" : "✖"} ${nom.padEnd(42)} → ${got} (attendu ${attendu})`);
}
console.log(bad ? `\n  ✖ ${bad} cas rompu(s)` : "\n  ✓ le cliquet monte, ne descend jamais, prend le PLUS HAUT, et ignore ce qui précède le plan");
process.exit(bad ? 1 : 0);
