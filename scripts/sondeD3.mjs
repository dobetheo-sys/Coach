#!/usr/bin/env node
/**
 * D3 — LA CONSÉQUENCE GRADUÉE, MESURÉE SUR LE PLAN LIVRÉ.
 *
 *   node scripts/sondeD3.mjs
 *
 * Trois branches à séparer, et la sonde doit montrer que les TROIS existent — un correctif qui
 * ne ferait plus JAMAIS rabattre serait aussi faux que celui qui rabat toujours, et les deux
 * rendraient un tableau « propre » (test de dépistage de la règle 15 : un taux saturé accuse
 * l'instrument, ou le modèle mental de ce qu'il observe).
 *
 *   gate satisfait                      → plan normal, aucune décision B17-continuite
 *   non satisfait, écart FRANCHISSABLE  → format DEMANDÉ conservé + progression + message
 *   écart NON franchissable             → rabattement, avec sa raison chiffrée
 *
 * On vérifie aussi que le FORMAT LIVRÉ suit la décision (le défaut `fmt` capté en `const` faisait
 * qu'un Full rabattu au sprint gardait l'horizon d'un Full — signature `R13.6-P1`).
 */
import "../src/app/bridge.ts";
import { MIN_WEEKS } from "../src/engine/constraintMatrix.ts";
import { TRI_SWIM } from "../src/engine/predictor.ts";

const BASE = {
  sport: "tri", intent: "competition", level: "inter", history: "confirme", dispo: "quotidienne",
  doubles: "non", sessions_max: "6", age: "35", sex: "H", weight: "75", vol_max: "12",
  vol_recent: "6", injury: "aucune", med_pain: "non", med_dizzy: "non", med_treat: "non",
  pace_known: "oui", pace: "5:00", ftp_known: "oui", ftp: "220", css_known: "oui", css: "1:50",
  terrain: "route", milieu: "bassin",
};
const lundi = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const dans = (n) => { const d = lundi(); d.setDate(d.getDate() + n * 7 - 1); return d.toISOString().slice(0, 10); };
const CONT = /^Nage continue/;
const TEST = /^Test de continuité/;

const cas = [];
for (const format of ["S", "M", "70.3", "Full"]) {
  const h = MIN_WEEKS.tri?.[format] ?? 20;
  for (const [nom, rep] of [
    ["continuité suffisante", { longest_swim_known: "oui", longest_swim_m: "2000" }],
    ["100 m déclarés", { longest_swim_known: "oui", longest_swim_m: "100" }],
    ["400 m déclarés", { longest_swim_known: "oui", longest_swim_m: "400" }],
    ["« je ne sais pas »", { longest_swim_known: "non" }],
    ["réponse ABSENTE", {}],
  ]) {
    let p;
    try { p = globalThis.EBV2.buildPlan("tri", { ...BASE, format, race_date: dans(h), ...rep }); }
    catch (e) { cas.push({ format, nom, verdict: "REFUS", detail: String(e.message || e).slice(0, 40) }); continue; }
    const dec = (p._v2?.decisions ?? []).find((x) => x.id === "B17-continuite");
    const rabat = dec && /rabattu/i.test(String(dec.what ?? ""));
    const paliers = [];
    let tests = 0;
    for (const w of p.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? []) {
      if (s.d !== "sw") continue;
      if (TEST.test(String(s.name ?? ""))) tests++;
      else if (CONT.test(String(s.name ?? ""))) paliers.push(+(String(s.name).match(/(\d+)\s*m/)?.[1] ?? 0));
    }
    cas.push({
      format, nom,
      verdict: !dec ? "gate satisfait" : rabat ? "RABATTU" : "format gardé",
      val: dec ? String(dec.val) : "—",
      sem: p.totalWeeks, paliers, tests,
    });
  }
}

console.log("D3 — LA CONSÉQUENCE GRADUÉE\n");
console.log("  format │ déclaration            │ verdict        │ décision                 │ sem │ paliers livrés");
for (const c of cas) {
  console.log(`  ${String(c.format).padEnd(6)} │ ${c.nom.padEnd(22)} │ ${String(c.verdict).padEnd(14)} │ ${String(c.val ?? c.detail ?? "").slice(0, 24).padEnd(24)} │ ${String(c.sem ?? "").padStart(3)} │ ${(c.paliers ?? []).join(" → ")}`);
}

const rabats = cas.filter((c) => c.verdict === "RABATTU");
const gardes = cas.filter((c) => c.verdict === "format gardé");
const ok = cas.filter((c) => c.verdict === "gate satisfait");
console.log(`\n  gate satisfait : ${ok.length} · format GARDÉ malgré l'écart : ${gardes.length} · RABATTU : ${rabats.length}`);

// NON-VACUITÉ — les trois branches doivent EXISTER, sans quoi le tableau est propre pour la
// mauvaise raison (règle 19 : quel est le correctif le moins coûteux qui ferait passer ce test ?).
const manquantes = [];
if (!ok.length) manquantes.push("aucun gate satisfait");
if (!gardes.length) manquantes.push("aucun format gardé — le correctif D3 est inerte");
if (!rabats.length) manquantes.push("aucun rabattement — la branche de sécurité a disparu");
// La montée doit rester stricte et finir sur la distance de course du format LIVRÉ.
const montees = [];
for (const c of gardes.concat(ok)) {
  const pl = c.paliers ?? [];
  for (let i = 1; i < pl.length; i++) if (pl[i] <= pl[i - 1]) montees.push(`${c.format}/${c.nom} : ${pl[i]} ≤ ${pl[i - 1]}`);
  if (pl.length && pl[pl.length - 1] !== TRI_SWIM[c.format].dist) montees.push(`${c.format}/${c.nom} : dernier ${pl[pl.length - 1]} ≠ ${TRI_SWIM[c.format].dist}`);
}
// ⚠ CE CRITÈRE MANQUAIT, ET SANS LUI LA SONDE EST SATISFAITE PAR LE DÉFAUT QU'ELLE SURVEILLE.
// Contre-preuve : en rétablissant le rabattement d'origine (la cible ne cherche que `satisfait`),
// les rabattements passent de 5 à 12 sur ce balayage et de 5 à 21 sur le golden — et la sonde
// restait VERTE, parce que « au moins un format gardé » suffisait à la contenter. C'est la
// règle 19 : le correctif le moins coûteux qui fait passer ce test ne résout pas le problème.
// Le verdict de CHAQUE cas est donc ÉPINGLÉ. Un cliquet, pas un seuil.
const ATTENDU = {
  "S/continuité suffisante": "gate satisfait", "S/100 m déclarés": "format gardé",
  "S/400 m déclarés": "format gardé", "S/« je ne sais pas »": "format gardé", "S/réponse ABSENTE": "format gardé",
  "M/continuité suffisante": "gate satisfait", "M/100 m déclarés": "RABATTU",
  "M/400 m déclarés": "RABATTU", "M/« je ne sais pas »": "format gardé", "M/réponse ABSENTE": "format gardé",
  "70.3/continuité suffisante": "gate satisfait", "70.3/100 m déclarés": "RABATTU",
  "70.3/400 m déclarés": "RABATTU", "70.3/« je ne sais pas »": "format gardé", "70.3/réponse ABSENTE": "format gardé",
  "Full/continuité suffisante": "gate satisfait", "Full/100 m déclarés": "RABATTU",
  "Full/400 m déclarés": "format gardé", "Full/« je ne sais pas »": "format gardé", "Full/réponse ABSENTE": "format gardé",
};
const derives = cas.filter((c) => ATTENDU[c.format + "/" + c.nom] && ATTENDU[c.format + "/" + c.nom] !== c.verdict)
  .map((c) => `${c.format}/${c.nom} : ${c.verdict} au lieu de ${ATTENDU[c.format + "/" + c.nom]}`);
// D3 (arbitrage « je ne sais pas n'est pas une valeur ») — L'INCONNU PRODUIT UN TEST, JAMAIS UN
// LAISSEZ-PASSER. Sans ce critère, la sonde ne verrait pas la différence entre « on garde le
// format et on prescrit la mesure » et « on garde le format et on ne demande rien » — or c'est
// exactement cette différence qui referme l'inversion. Et le miroir compte autant : une continuité
// MESURÉE ne doit pas recevoir de test, sinon le test devient décoratif.
const tests = [];
for (const c of cas) {
  if (c.verdict === "REFUS") continue;
  const inconnu = c.nom === "« je ne sais pas »" || c.nom === "réponse ABSENTE";
  if (inconnu && !(c.tests > 0)) tests.push(`${c.format}/${c.nom} : AUCUN test prescrit`);
  if (!inconnu && c.tests > 0) tests.push(`${c.format}/${c.nom} : un test prescrit alors que la continuité est MESURÉE`);
  // …et le test ne remplace pas la progression : il faut aussi au moins un palier chiffré.
  if (inconnu && c.verdict !== "RABATTU" && !(c.paliers ?? []).length) tests.push(`${c.format}/${c.nom} : test seul, aucune progression derrière`);
}
console.log(`  mesure       : ${tests.length ? "✖ " + tests.slice(0, 3).join(" · ") : "✓ l'inconnu prescrit un test (et lui seul), suivi de sa progression"}`);
console.log(`  cliquet      : ${derives.length ? "✖ " + derives.slice(0, 4).join(" · ") : "✓ les 20 verdicts sont ceux épinglés"}`);

// D3 §3b — LA PROGRESSION PART-ELLE DE L'ATHLÈTE ? Sans ce critère, la sonde reste VERTE quand
// les paliers repartent de 50 % de la distance de course (vérifié : la cassure passe inaperçue).
// C'est la règle 19 — quel est le correctif le moins coûteux qui ferait passer ce test ? Ici :
// remettre la table de fractions que ce lot supprime. Le premier palier d'une déclaration BASSE
// doit être BAS, et deux déclarations différentes doivent donner deux premiers paliers différents.
const departs = [];
for (const c of gardes) {
  const m = String(c.val ?? "").match(/^(\d+) m →/);
  if (!m) continue;
  const p1 = (c.paliers ?? [])[0];
  if (p1 == null) continue;
  const dep = +m[1];
  // le premier palier ne s'éloigne pas du départ de plus d'un cran de rampe (×2 est déjà large)
  if (p1 > Math.max(300, dep * 2.2)) departs.push(`${c.format}/${c.nom} : 1er palier ${p1} m pour un départ de ${dep} m`);
}
console.log(`  départ       : ${departs.length ? "✖ " + departs.slice(0, 3).join(" · ") : "✓ le premier palier suit le point de départ de l'athlète"}`);
console.log(`  non-vacuité : ${manquantes.length ? "✖ " + manquantes.join(" · ") : "✓ les trois branches existent"}`);
console.log(`  montée       : ${montees.length ? "✖ " + montees.slice(0, 4).join(" · ") : "✓ strictement croissante, dernier palier = distance de course"}`);
// D3-c — L'HONNÊTETÉ EST-ELLE PUNIE ? Le critère a CHANGÉ DE FORME avec l'arbitrage « je ne sais
// pas n'est pas une valeur », et l'ancien serait devenu faux : il comparait des VERDICTS
// (« RABATTU » contre « format gardé ») et comptait 5 inversions. Or l'inconnu ne reçoit plus un
// laissez-passer mais un REPORT assorti d'une obligation — le test — au terme duquel la
// conséquence graduée s'applique, rabattement compris. La question juste n'est donc pas « qui est
// rabattu aujourd'hui » mais **« le silence produit-il une tâche ou une permission »**.
// L'écart brut reste AFFICHÉ, en information : il dit combien de profils attendent encore leur
// mesure, et il doit tendre vers zéro quand les athlètes répondent — pas être caché.
const passeDroit = cas.filter((c) => (c.nom === "« je ne sais pas »" || c.nom === "réponse ABSENTE")
  && c.verdict === "format gardé" && !(c.tests > 0));
const reports = cas.filter((c) => (c.nom === "« je ne sais pas »" || c.nom === "réponse ABSENTE") && c.tests > 0);
console.log(`  honnêteté    : ${passeDroit.length
  ? "✖ " + passeDroit.length + " profil(s) gardent leur format SANS aucune obligation — le silence devient un laissez-passer"
  : "✓ aucun laissez-passer : les " + reports.length + " profils sans mesure portent tous un test, et la conséquence graduée s'appliquera dessus"}`);

console.log(`\n  → ${!manquantes.length && !montees.length
  && !departs.length && !derives.length && !tests.length && !passeDroit.length
  ? "LA CONSÉQUENCE EST GRADUÉE : le rabattement est réservé à l'écart NON franchissable."
  : "AU MOINS UN CRITÈRE EST ROMPU."}`);
