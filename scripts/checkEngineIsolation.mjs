#!/usr/bin/env node
/**
 * Z-04 (révisé par l'arbitrage du STOP de Phase 2) — LE NO-OP EST UNE PROPRIÉTÉ PERMANENTE.
 *
 * Le protocole d'origine (« capturer, merger, recapturer, diff ») prouvait « CE merge-là n'a
 * rien changé » et expirait à l'instant de la mesure. La propriété gardée ici est plus forte :
 * « les fichiers graphiques NE PEUVENT PAS changer la sortie moteur », parce que le chemin
 * moteur (`src/`) n'importe rien d'`endurabuild/`. Prouvée une fois dynamiquement (mutation
 * des fichiers graphiques → golden 949, 0 écart — diffs/merge-noop.md) ; ce gate tient la
 * moitié STATIQUE à chaque commit. La liste blanche est LUE ici même, jamais recopiée
 * ailleurs : un seul croisement autorisé, le harnais CI de la démo avatar (module PUR,
 * contrainte documentée depuis R25).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
const SRC = resolve(import.meta.dirname, "..", "src");
const BLANC = new Set(["src/audit/avatarTriDemo.ts"]);
const fichiers = [];
(function walk(d) { for (const e of readdirSync(d)) { const p = join(d, e);
  if (statSync(p).isDirectory()) walk(p); else if (/\.ts$/.test(e)) fichiers.push(p); } })(SRC);
let echecs = 0;
for (const f of fichiers) {
  const rel = f.slice(f.indexOf("src/"));
  if (!/endurabuild/.test(readFileSync(f, "utf8"))) continue;
  const importe = /from\s+['"][^'"]*endurabuild/.test(readFileSync(f, "utf8"));
  if (importe && !BLANC.has(rel)) { echecs++; console.log(`✖ ${rel} importe endurabuild/ — la sortie moteur cesserait d'être une fonction de src/ seul`); }
}
console.log(echecs ? "✖ Z-04 : l'isolation moteur est rompue." : `✓ Z-04 : ${fichiers.length} fichiers src/, aucun import d'endurabuild hors liste blanche (${[...BLANC].join(", ")}).`);
process.exit(echecs ? 1 : 0);
