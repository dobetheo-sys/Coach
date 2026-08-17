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

// ── O-56 §3 — LA DÉCLARATION DE DIVERGENCE ────────────────────────────────────────────────
// Elle doit être VRAIE SOUS LES DEUX LECTURES (« il n'a pas nagé » / « il n'a pas journalisé »),
// donc n'énoncer que des faits. Ces critères gardent exactement ça : ce qu'elle dit, quand elle
// se tait, et ce qu'elle ne dit JAMAIS.
const { swimDivergence } = await import("/home/user/Coach/src/engine/swimContinuity.ts");
const P = (paliers) => ({ weeks: paliers.map(([num, m, fait]) => ({
  num, days: [{ jour: "Lun", sessions: [{ d: "sw", steps: [{ role: "body", bnd: { pinned: true }, distanceM: m, reps: 1 }] }] }], _fait: fait })) });
const D = (paliers) => Object.fromEntries(paliers.filter(([, , f]) => f).map(([n]) => [n + "|Lun|0", true]));
const casD = [
  ["se tait tant qu'aucun palier passé n'a été manqué", [[2, 800, true], [6, 1200, false]], 4, null],
  ["parle au PREMIER palier manqué",                     [[2, 800, false]],                 4, /Aucune nage continue/],
  ["énonce la capacité VALIDÉE",                          [[2, 800, true], [3, 1200, false]], 5, /validée est de 800 m/],
  ["annonce le palier que le PLAN contient",              [[2, 800, true], [3, 1200, false], [8, 1500, false]], 5, /1500 m, en semaine 8/],
  ["se tait si la capacité a dépassé le palier manqué",   [[2, 1200, false], [3, 1500, true]], 5, null],
  ["ne reproche RIEN — aucun « sauté », aucun « tu »",    [[2, 800, false]],                 4, /^(?!.*(sauté|manqué|aurais|devais)).*$/],
];
let badD = 0;
for (const [nom, paliers, wk, attendu] of casD) {
  const r = swimDivergence(P(paliers), D(paliers), wk);
  const ok = attendu === null ? r.message === null : attendu.test(String(r.message || ""));
  if (!ok) badD++;
  console.log(`  ${ok ? "✔" : "✖"} ${nom.padEnd(52)} → ${r.message ? '"' + r.message.slice(0, 58) + '…"' : "(silence)"}`);
}
console.log(badD ? `\n  ✖ ${badD} cas rompu(s)` : "\n  ✓ elle ne parle qu'au palier PASSÉ et manqué, énonce des faits, et ne reproche rien");
process.exit(bad + badD ? 1 : 0);
