#!/usr/bin/env node
/**
 * LA NOUVELLE BASE D'UN CLIQUET SE MESURE AVANT QUE LE MOTEUR BOUGE, JAMAIS APRÈS.
 *
 *   npm run base:cliquet            # rejoue les cliquets sur le corpus courant
 *   npm run base:cliquet -- --ref   # écrit la référence (à lancer AVANT d'élargir le corpus)
 *
 * LE PROBLÈME (arbitrage du fondateur, 17/08/2026) :
 *
 *   « Un cliquet qui monte parce qu'on a ÉLARGI la mesure et un cliquet qui monte parce que le
 *     MOTEUR a régressé se ressemblent exactement. »
 *
 * Je l'avais tranché par INFÉRENCE : S4 restait fixe pendant que S5 montait, donc la hausse venait
 * du corpus. L'inférence est juste et elle repose sur le fait qu'un cliquet au moins soit resté
 * immobile — **le jour où tous montent, elle disparaît**.
 *
 * LA PREUVE MÉCANIQUE COÛTE UNE PASSE :
 *
 *     élargissement du corpus  →  rejouer le NOUVEAU corpus contre le moteur INCHANGÉ
 *
 *       le cliquet monte pareil  →  c'est le CORPUS. Nouvelle base établie, on ré-épingle.
 *       il ne monte pas          →  c'est le MOTEUR. Et là c'est une régression.
 *
 * Cette sonde produit le membre gauche : elle rejoue les compteurs de cliquet sur le corpus
 * courant et les compare à une référence prise AVANT. Elle ne juge pas — elle donne les deux
 * nombres qui permettent de trancher, et elle refuse de conclure sans référence.
 *
 * Ce qu'elle NE fait PAS : reconstruire le moteur d'avant. C'est au lot de le faire (worktree ou
 * `git stash`), et c'est ce qui a rattaché O-48 à la famille des dépendances calendaires.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import "../src/app/bridge.ts";
import { profiles as goldenProfiles } from "./goldenMaster.mjs";

const REF = "/tmp/base-cliquet.json";
const ECRIRE = process.argv.includes("--ref");

/**
 * Les compteurs de cliquet du dépôt, relus ici sur le plan LIVRÉ. Ils DOIVENT être calculés de la
 * même façon que dans leur banc d'origine — sinon on comparerait deux grandeurs voisines, ce que
 * ce dépôt paie neuf fois. Chacun cite son banc.
 */
const mesure = () => {
  let profils = 0, epingles = 0, rabotes = 0, titres = 0, titresFaux = 0;
  for (const { sport, a } of goldenProfiles()) {
    let p; try { p = globalThis.EBV2.buildPlan(sport, a); } catch { continue; }
    profils++;
    for (const w of p.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
      const m = /— (\d+) m d'affilée/.exec(String(s.name || ""));   // T-40
      if (m) {
        titres++;
        const corps = (s.steps || []).filter((x) => x.role === "body" && x.distanceM != null);
        const livre = corps.length === 1 ? (corps[0].reps || 1) * (corps[0].distanceM || 0) : null;
        if (livre !== +m[1]) titresFaux++;
      }
      for (const st of s.steps ?? []) {                              // T-39
        if (!st.bnd?.pinned) continue;
        epingles++;
        const livre = st.distanceM != null ? st.distanceM : st.durationMin;
        if (livre !== st.bnd.cap) rabotes++;
      }
    }
  }
  return { profils, epingles, rabotes, titres, titresFaux };
};

const now = mesure();
if (ECRIRE) {
  writeFileSync(REF, JSON.stringify(now));
  console.log(`référence écrite : ${REF}`);
  console.log(`  ${now.profils} profils · ${now.epingles} blocs épinglés (${now.rabotes} rabotés) · ${now.titres} titres chiffrés (${now.titresFaux} faux)`);
  console.log("\n  → ÉLARGIS LE CORPUS MAINTENANT, puis relance SANS `--ref`, moteur INCHANGÉ.");
  process.exit(0);
}
if (!existsSync(REF)) {
  console.error("Aucune référence. Lancer `npm run base:cliquet -- --ref` AVANT d'élargir le corpus,");
  console.error("moteur inchangé — c'est tout l'objet de cette sonde : la base se mesure avant.");
  process.exit(2);
}
const ref = JSON.parse(readFileSync(REF, "utf8"));

console.log("BASE DES CLIQUETS — corpus élargi, moteur INCHANGÉ ?\n");
const ligne = (nom, a, b) => {
  const d = b - a;
  console.log(`  ${nom.padEnd(26)} ${String(a).padStart(6)} → ${String(b).padStart(6)}   ${d === 0 ? "=" : (d > 0 ? "+" : "") + d}`);
  return d;
};
const dProf = ligne("profils générés", ref.profils, now.profils);
const dEp = ligne("blocs épinglés", ref.epingles, now.epingles);
const dRab = ligne("…dont rabotés (T-39)", ref.rabotes, now.rabotes);
const dTit = ligne("titres chiffrés", ref.titres, now.titres);
const dFaux = ligne("…dont faux (T-40)", ref.titresFaux, now.titresFaux);

console.log("");
if (dProf === 0) {
  console.log("  Le corpus n'a PAS changé. Tout mouvement d'un cliquet vient donc du MOTEUR :");
  console.log(`  ${dRab || dFaux ? "✖ il y en a — c'est une RÉGRESSION, pas une nouvelle base." : "✓ aucun mouvement."}`);
  process.exit(dRab || dFaux ? 1 : 0);
}
console.log(`  Le corpus a grandi de ${dProf} profils, MOTEUR INCHANGÉ.`);
console.log(`  → les hausses ci-dessus sont la NOUVELLE BASE, pas une régression : ré-épingler avec`);
console.log(`    ce constat, et la distinction est PROUVÉE au lieu d'être inférée d'un témoin immobile.`);
