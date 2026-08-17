#!/usr/bin/env node
// Contre-preuve O-52(b) : `countDiff` doit distinguer un mouvement d'UN champ d'un mouvement
// de plusieurs, et rendre l'amplitude NUMERIQUE — pas une amplitude inventee sur des chaines.
import { readFileSync } from "node:fs";
import { join } from "node:path";
// ⚠ CHEMIN DÉRIVÉ, JAMAIS ABSOLU. Ce fichier portait « /home/user/Coach/… » codé en dur : il
// tournait dans le bac à sable où il a été écrit et NULLE PART AILLEURS — ni en CI, ni chez le
// fondateur. Mesuré le 17/08/2026, sur le premier passage en CI après le merge : ENOENT sur
// `/home/user/Coach/endurabuild/js/state.js`, sur un runner où ce chemin n'existe évidemment
// pas. Une garde qui ne peut s'exécuter qu'à un seul endroit ne garde rien.
const RACINE = join(import.meta.dirname, "..");
const src = (readFileSync)(join(RACINE, "scripts/goldenMaster.mjs"), "utf8");
const m = src.match(/function countDiff[\s\S]*?\n\}/);
const countDiff = eval("(" + m[0].replace(/^function countDiff/, "function") + ")");
const cas = [
  ["identique",            {a:1,b:2},            {a:1,b:2},            0, 0],
  ["un seul champ",        {a:1,b:2},            {a:1,b:5},            1, 3],
  ["deux champs",          {a:1,b:2},            {a:9,b:5},            2, 8],
  ["imbrique",             {w:[{h:10},{h:20}]},  {w:[{h:10},{h:33}]},  1, 13],
  ["chaine : pas d'amplitude", {s:"caps"},       {s:"boucle-growth"},  1, 0],
  ["profond, 3 feuilles",  {w:[{e:1,h:2},{e:3}]},{w:[{e:9,h:9},{e:9}]},3, 8],
];
let bad = 0;
for (const [nom, a, b, n, max] of cas) {
  const r = countDiff(a, b);
  const ok = r.n === n && Math.abs(r.max - max) < 1e-9;
  if (!ok) bad++;
  console.log(`  ${ok ? "✔" : "✖"} ${nom.padEnd(28)} n=${r.n} (attendu ${n})  max=${r.max} (attendu ${max})`);
}
console.log(bad ? `\n  ✖ ${bad} cas rompu(s)` : "\n  ✓ les 6 cas tiennent : le compte distingue 1 de N, et l'amplitude ne s'invente pas sur une chaine");
process.exit(bad ? 1 : 0);
