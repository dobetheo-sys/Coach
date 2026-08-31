#!/usr/bin/env node
/**
 * CASSER — le harnais de contre-preuve qui possède le CYCLE DE VIE de sa mutation.
 *
 *   npm run casser -- --fichier src/x.ts --avant 'motif' --apres 'remplacement' -- npm run gate
 *   npm run casser -- --fichier a.ts --avant '…' --apres '…' --fichier b.ts --avant '…' --apres '…' -- cmd
 *
 * Trois fois, une cassure volontaire a été défaite À LA MAIN et le geste manuel a raté :
 * `git checkout` sur un fichier NON COMMITÉ a emporté du travail (V2, puis deux récidives dont
 * une qui a poussé `check:chemins` rouge sur son propre gate, sur main, en déploiement). La
 * règle opératoire — committer avant de casser — est écrite depuis V2 et a échoué trois fois.
 * **Une règle qui échoue trois fois n'est pas une règle mal écrite : c'est un mécanisme
 * manquant** (arbitrage du fondateur, 17/08/2026). Le défaut n'était jamais la cassure, c'était
 * le « défaire à la main » — ce harnais le supprime :
 *
 *     il lit l'original EN MÉMOIRE · applique la mutation · lance la commande ·
 *     RESTAURE DANS UN `finally`, y compris sur Ctrl-C, y compris si la commande explose.
 *
 * Ce qu'il REFUSE, délibérément :
 *   · muter un fichier dont le motif est introuvable — une contre-preuve qui n'a pas perturbé
 *     rendrait le même verdict que « le correctif tient » (leçon de la contre-preuve O-67, qui
 *     a refusé de tourner sur `C22_MAX_WEEKLY_GROWTH` devenu `rule(...)`) ;
 *   · muter un fichier qui a DÉJÀ des modifications non commitées — c'est exactement l'état
 *     dans lequel les trois pertes ont eu lieu, et la restauration mémoire protégerait la
 *     mutation mais pas le travail antérieur si ce processus est tué à froid (SIGKILL).
 *
 * Le code de sortie est celui de la commande : une contre-preuve attend un ROUGE, l'appelant
 * décide de ce que le code veut dire.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { resolve, join } from "node:path";

const RACINE = join(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
if (sep < 0) {
  console.error("usage : npm run casser -- --fichier F --avant 'motif' --apres 'remplacement' [--fichier …] -- commande…");
  process.exit(2);
}
const spec = argv.slice(0, sep), cmd = argv.slice(sep + 1);
const mutations = [];
for (let i = 0; i < spec.length; i += 6) {
  if (spec[i] !== "--fichier" || spec[i + 2] !== "--avant" || spec[i + 4] !== "--apres") {
    console.error(`✖ triplet attendu : --fichier F --avant M --apres R (reçu : ${spec.slice(i, i + 6).join(" ")})`);
    process.exit(2);
  }
  mutations.push({ fichier: resolve(RACINE, spec[i + 1]), avant: spec[i + 3], apres: spec[i + 5] });
}
if (!mutations.length || !cmd.length) { console.error("✖ il faut au moins une mutation ET une commande"); process.exit(2); }

// REFUS 2 — l'état exact des trois pertes : un fichier déjà modifié, non commité.
for (const m of mutations) {
  const rel = m.fichier.slice(RACINE.length + 1);
  const sale = execSync(`git status --porcelain -- "${rel}"`, { cwd: RACINE }).toString().trim();
  if (sale) {
    console.error(`✖ ${rel} porte des modifications NON COMMITÉES — committer d'abord, casser ensuite.`);
    console.error("   (C'est l'état dans lequel les trois pertes ont eu lieu : la restauration mémoire ne");
    console.error("   protégerait pas ce travail si le processus était tué à froid.)");
    process.exit(2);
  }
}

// La mutation, originaux en mémoire.
//
// ⚠ DEUX MUTATIONS SUR LE MÊME FICHIER S'ÉCRASAIENT EN SILENCE (corrigé le 25/08/2026).
// Chaque mutation partait de l'ORIGINAL (`originaux.get(f).replace(...)`), donc sur un même
// fichier seule la DERNIÈRE survivait — pendant que la boucle imprimait « ⚡ cassé » une fois
// par mutation, ce qui se lit comme « les deux sont appliquées ». C'est exactement la classe
// que ce harnais existe pour fermer : une contre-preuve partiellement appliquée rend un verdict
// qui a l'air complet. Mesuré le jour même — une variante de schéma annoncée à deux entrées
// n'en portait qu'une, et le chiffre publié décrivait un état intermédiaire que personne
// n'avait demandé. Les mutations s'appliquent désormais CUMULATIVEMENT, et chaque motif est
// cherché dans le contenu COURANT (donc une mutation peut viser ce qu'une précédente a écrit).
const originaux = new Map();
const courant = new Map();
for (const m of mutations) {
  if (!originaux.has(m.fichier)) {
    const src = readFileSync(m.fichier, "utf8");
    originaux.set(m.fichier, src);
    courant.set(m.fichier, src);
  }
  const src = courant.get(m.fichier);
  if (!src.includes(m.avant)) {
    console.error(`✖ motif introuvable dans ${m.fichier} — la contre-preuve n'aurait rien perturbé, on refuse de tourner.`);
    process.exit(2);
  }
  courant.set(m.fichier, src.replace(m.avant, m.apres));
}

let restaure = false;
const restaurer = () => {
  if (restaure) return;
  restaure = true;
  for (const [f, src] of originaux) writeFileSync(f, src);
  console.error(`↩ ${originaux.size} fichier(s) restauré(s) par le harnais — aucun geste manuel.`);
};
process.on("SIGINT", () => { restaurer(); process.exit(130); });
process.on("SIGTERM", () => { restaurer(); process.exit(143); });
process.on("exit", restaurer);

for (const [f, src] of courant) {
  writeFileSync(f, src);
  const n = mutations.filter((m) => m.fichier === f).length;
  console.error(`⚡ cassé : ${f.slice(RACINE.length + 1)}${n > 1 ? ` (${n} mutations)` : ""}`);
}
const r = spawnSync(cmd[0], cmd.slice(1), { cwd: RACINE, stdio: "inherit", shell: false });
restaurer();
process.exit(r.status ?? 1);
