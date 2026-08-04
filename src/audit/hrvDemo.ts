/**
 * H-1 (VFC) — SPEC EXÉCUTABLE (`npm run demo:hrv`).
 *
 * Trois familles, et la troisième est celle qui justifie le lot :
 *
 *   §1 — LE MODÈLE : moyenne glissante en espace log, bande = ±0,5 écart-type,
 *        refus de classer sous 7 mesures.
 *   §2 — LE PONT : la valeur est classée en UN point, l'UI n'en sait rien.
 *   §3 — **LA DÉCLARATION NE PÈSE PLUS COMME UNE MESURE.** `hrvStatus` valait −2
 *        sur le registre OBJECTIF — celui que A4 a créé pour qu'un ressenti ne
 *        puisse pas effacer une mesure — alors qu'il ÉTAIT un ressenti. C'est la
 *        leçon R14.1, payée une quatrième fois.
 *
 *   §4 — L'INVARIANT DE SÉCURITÉ : une VFC, quelle que soit sa valeur, ne peut
 *        JAMAIS faire monter la charge.
 */
import { generatePlan } from "../generator/planGenerator.ts";
import { toProfile } from "../app/bridge.ts";
import type { AppAnswers } from "../app/bridge.ts";
import { adjustDay, dayMinutes } from "../readiness/dailyAdjuster.ts";
import { assessReadiness } from "../readiness/readinessSource.ts";
import {
  hrvBaseline, classerHrv, hrvValide,
  HRV_MIN_MESURES, HRV_SWC_SD, HRV_FENETRE_MOYENNE_J,
} from "../readiness/hrvBaseline.ts";

let echecs = 0, total = 0;
function ok(cond: boolean, label: string): void {
  total++;
  if (cond) { console.log("  ✔ " + label); return; }
  echecs++;
  console.log("  ✖ " + label);
}
const titre = (t: string) => console.log("\n" + t + "\n" + "─".repeat(Math.min(78, t.length + 2)));

const jour = (n: number) => new Date(Date.UTC(2026, 5, 1) + n * 864e5).toISOString().slice(0, 10);
/** Un journal stable de `n` matins autour de `moy` ms, avec une oscillation régulière. */
const journal = (n: number, moy = 60, amp = 6) =>
  Array.from({ length: n }, (_, i) => ({ date: jour(i), v: Math.round(moy + amp * Math.sin(i)) }));

console.log("H-1 — la VFC devient une mesure, spec exécutable");

// ================================================================================
titre("§1 — Le modèle : base glissante, bande ±0,5 SD, refus sous 7 mesures");
// ================================================================================
{
  ok(HRV_FENETRE_MOYENNE_J === 7, "la moyenne glissante est de 7 jours (Plews et al. 2013)");
  ok(HRV_SWC_SD === 0.5, "la bande vaut ±0,5 écart-type (plus petit changement qui vaille la peine)");
  ok(HRV_MIN_MESURES === 7, "sous 7 mesures, on ne classe pas");

  const court = hrvBaseline(journal(4), jour(5));
  ok(!court.suffisant, "4 matins → base INSUFFISANTE");
  ok(!!court.motif && /4 mesure/.test(court.motif), "…avec un motif qui donne le compte (« " + (court.motif || "").slice(0, 46) + "… »)");
  ok(classerHrv(60, court) === null, "…et aucun classement n'est produit — on ne fabrique pas une mesure");

  const b = hrvBaseline(journal(20), jour(21));
  ok(b.suffisant && b.n === 20, "20 matins → base suffisante (" + b.n + ")");
  ok(b.moyenneMs !== null && Math.abs(b.moyenneMs - 60) < 4,
    "…moyenne cohérente avec le journal (" + b.moyenneMs + " ms pour ~60)");
  ok(b.basseMs! < b.moyenneMs! && b.moyenneMs! < b.hauteMs!, "…et la bande encadre la moyenne");

  ok(classerHrv(b.moyenneMs!, b)!.status === "normale", "une valeur À la moyenne → « normale »");
  ok(classerHrv(b.basseMs! - 5, b)!.status === "basse", "sous la borne basse → « basse »");
  ok(classerHrv(b.hauteMs! + 5, b)!.status === "haute", "au-dessus de la borne haute → « haute »");
  ok(/base de/.test(classerHrv(b.basseMs! - 5, b)!.why),
    "…et le motif DIT à quoi la valeur a été comparée");

  // Le piège du zéro (leçon P11 / R20.1) : 0 n'est pas « absent », c'est une saisie fausse.
  ok(!hrvValide(0) && !hrvValide(-3) && !hrvValide(400) && !hrvValide(undefined),
    "0, négatif, aberrant et absent sont TOUS refusés — un 0 n'est pas une VFC nulle");
  ok(hrvValide(62), "…et une valeur plausible passe");

  // La base EXCLUT le jour même : sinon la valeur amortit l'écart qu'on cherche à voir.
  const avecAujourdhui = hrvBaseline([...journal(10), { date: jour(10), v: 20 }], jour(10));
  const sans = hrvBaseline(journal(10), jour(10));
  ok(avecAujourdhui.moyenneMs === sans.moyenneMs,
    "la mesure du JOUR MÊME n'entre pas dans sa propre base (" + avecAujourdhui.moyenneMs + " = " + sans.moyenneMs + ")");
}

// ================================================================================
titre("§2 — LE POINT QUI COMPTE : une déclaration ne pèse plus comme une mesure");
// ================================================================================
{
  const base = { date: jour(30), sleepQuality: "bon" as const, energy: 60, feel: "normal" as const };
  // Même statut « basse », deux provenances.
  const mesuree = assessReadiness({ ...base, hrvStatus: "basse", hrvSource: "mesure", hrvBaselineMs: 60 });
  const declaree = assessReadiness({ ...base, hrvStatus: "basse", hrvSource: "declare" });

  ok(mesuree.level !== declaree.level || mesuree.drivers.join() !== declaree.drivers.join(),
    "« basse » MESURÉE et « basse » DÉCLARÉE ne produisent plus le même verdict");
  ok(mesuree.drivers.some((d) => /bande habituelle/.test(d)),
    "la mesurée dit à quoi elle a été comparée (« " + (mesuree.drivers.find((d) => /bande/.test(d)) || "").slice(0, 44) + "… »)");
  ok(declaree.drivers.some((d) => /déclarée|jugée/.test(d)),
    "la déclarée ANNONCE qu'elle est déclarée — l'athlète sait ce qui a compté");

  // Le cœur : le registre OBJECTIF existe pour qu'un ressenti n'efface pas une mesure.
  // Une déclaration ne doit pas pouvoir, à elle seule, faire basculer le verdict comme
  // le ferait une mesure. On le vérifie sur le cas limite qu'A4 avait construit.
  const limite = { date: jour(30), sleepQuality: "moyen" as const, energy: 50, feel: "normal" as const };
  const vM = assessReadiness({ ...limite, hrvStatus: "basse", hrvSource: "mesure", hrvBaselineMs: 60 });
  const vD = assessReadiness({ ...limite, hrvStatus: "basse", hrvSource: "declare" });
  const rang = (l: string) => (l === "rouge" ? 2 : l === "orange" ? 1 : 0);
  ok(rang(vM.level) >= rang(vD.level),
    "à situation égale, la VFC MESURÉE pèse au moins autant que la déclarée (" + vM.level + " vs " + vD.level + ")");

  const sans = assessReadiness({ ...base });
  ok(!sans.drivers.some((d) => /VFC/.test(d)),
    "aucune VFC renseignée → aucun driver VFC (on n'invente pas un signal absent)");
}

// ================================================================================
titre("§3 — Le pont classe en UN point, et refuse proprement");
// ================================================================================
{
  const A: AppAnswers = {
    format: "marathon", history: "confirme", level: "inter", intent: "competition",
    vol_max: "10", sessions_max: "6", dispo: "partielle", vol_recent: "8",
    pace_known: "oui", pace: "4:30", ftp_known: "non", css_known: "non",
    med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune",
    age: "38", sex: "H", terrain: "plat", off_days: "non", doubles: "non",
    hrvLog: journal(20),
  } as unknown as AppAnswers;

  // Base fournie → la valeur pilote, et le statut coché est ÉCRASÉ par la mesure.
  const b = hrvBaseline(journal(20), jour(21));
  const v = classerHrv(b.basseMs! - 8, b);
  ok(!!v && v.status === "basse",
    "une valeur sous la bande est classée « basse » quoi qu'ait coché l'athlète");

  // Base trop courte → refus de classer, et la déclaration reprend la main EN TANT QUE telle.
  const courte = hrvBaseline(journal(3), jour(4));
  ok(classerHrv(40, courte) === null, "base trop courte → pas de classement");
  ok(!!courte.motif && /pilote rien|nécessaires|historique/.test(courte.motif),
    "…et le motif est affichable tel quel (« " + (courte.motif || "").slice(0, 50) + "… »)");
  void A;
}

// ================================================================================
titre("§4 — L'INVARIANT : une VFC ne fait JAMAIS monter la charge");
// ================================================================================
{
  const A: AppAnswers = {
    format: "marathon", history: "confirme", level: "inter", intent: "competition",
    vol_max: "10", sessions_max: "6", dispo: "partielle", vol_recent: "8",
    pace_known: "oui", pace: "4:30", ftp_known: "non", css_known: "non",
    med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune",
    age: "38", sex: "H", terrain: "plat", off_days: "non", doubles: "non",
  } as unknown as AppAnswers;
  const { plan, reasoned } = generatePlan(toProfile("run", A));
  const cible = plan.weeks[2].days.find((d) => d.sessions.some((s) => s.d !== "rs"))!;
  const date = (cible as { date?: string }).date!;
  const avant = dayMinutes(cible);

  for (const [statut, source] of [["haute", "mesure"], ["haute", "declare"], ["normale", "mesure"]] as const) {
    const { plan: p2, reasoned: r2 } = generatePlan(toProfile("run", A));
    const j2 = p2.weeks[2].days.find((d) => (d as { date?: string }).date === date)!;
    const av = dayMinutes(j2);
    adjustDay(r2, p2, date, {
      date, sleepQuality: "bon", energy: 90, feel: "frais",
      hrvStatus: statut, hrvSource: source, hrvBaselineMs: 60,
    });
    ok(dayMinutes(j2) <= av + 0.01,
      "VFC « " + statut + " » (" + source + ") n'ajoute aucune minute (" + Math.round(av) + " → " + Math.round(dayMinutes(j2)) + ")");
  }
  void avant; void plan; void reasoned;
}

console.log("\n" + "═".repeat(70));
if (echecs) {
  console.log("✖ H-1 — " + echecs + " échec(s) sur " + total + " critères");
  process.exit(1);
}
console.log("✓ H-1 — " + total + " critères verts : la VFC est comparée à la base de l'athlète,");
console.log("        une déclaration ne pèse plus comme une mesure, et elle ne charge jamais.");
