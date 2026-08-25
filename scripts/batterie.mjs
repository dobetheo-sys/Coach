#!/usr/bin/env node
/**
 * BATTERIE — le batch de vérification qui possède ses CODES DE SORTIE.
 *
 *   npm run batterie                     → le socle (les gates que tout lot doit rejouer)
 *   npm run batterie -- audit:v1 audit:v6 …  → une sélection
 *
 * Deux fois, un batch improvisé au `;` a masqué des gates rouges : le code de sortie était
 * celui de la DERNIÈRE commande (famille O-9 — la première fois dans un banc, la seconde dans
 * mon propre batch de fermeture de lot, deux gates rouges publiés avec un « tout est vert »).
 * La parade est la même que pour `git checkout` (→ `npm run casser`) et le `sed` ad hoc :
 * **le mécanisme ne protège que le chemin qu'il couvre** — celui-ci couvre le chemin du batch.
 * Chaque gate est lancé séparément, son code de sortie est CAPTURÉ et AFFICHÉ, et la batterie
 * sort rouge si UN SEUL l'est. Aucun agrégat silencieux.
 *
 * Le SOCLE est la leçon d'O-85 §3 : les bancs R14.x lisent le plan livré à travers la
 * projection, et golden:verify vérifie la photo — tout lot qui change le LIVRÉ les concerne,
 * pas seulement les lots qui touchent leurs fichiers.
 */
import { spawnSync } from "node:child_process";

const SOCLE = [
  "audit:v1", "audit:invariants", "audit:v6", "audit:v7",
  "audit:r13", "audit:r14", "audit:r14.1", "audit:r18",
  "golden:verify", "golden:bundle",
  // Contrôle STATIQUE, pas un banc : il ne construit aucun plan, il refuse un MOTIF — une
  // fixture de banc gardé qui dérive une date de calendrier depuis « maintenant » (7 occurrences
  // de la famille R20.7/A-6, chacune ancrée individuellement, et la 8e serait arrivée).
  "check:dates",
];
const EXTRA = { lotPhysio: ["node", ["scripts/lotPhysio.mjs"]] };

const demandes = process.argv.slice(2);
const gates = demandes.length ? demandes : [...SOCLE, "lotPhysio"];
const resultats = [];
for (const g of gates) {
  const [cmd, args] = EXTRA[g] ?? ["npm", ["run", g]];
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 256e6 });
  const code = r.status ?? 1;
  resultats.push({ g, code });
  console.log(`${code === 0 ? "✓" : "✖"} ${g.padEnd(16)} exit=${code}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
  if (code !== 0) {
    const queue = ((r.stdout || "") + (r.stderr || "")).trim().split("\n").slice(-6);
    for (const l of queue) console.log("      " + l);
  }
}
const rouges = resultats.filter((x) => x.code !== 0);
console.log(`\n${resultats.length - rouges.length} gate(s) vert(s) · ${rouges.length} rouge(s)${rouges.length ? " : " + rouges.map((x) => x.g).join(", ") : ""}`);
process.exit(rouges.length ? 1 : 0);
