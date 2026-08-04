/**
 * R22 — SPEC EXÉCUTABLE DE LA PRÉPARATION TRONQUÉE (`npm run demo:troncature`).
 *
 * Les trois cas demandés par le brief, plus ceux que le brief ne pouvait pas
 * prévoir parce qu'ils dépendent de tables qu'il ne connaissait pas :
 *
 *   §1 — SANS le drapeau, RIEN NE BOUGE. Le refus dur reste mot pour mot.
 *   §2 — AVEC le drapeau à 14 semaines sur un marathon : 14 semaines livrées,
 *        renumérotées de 1 à 14, `meta` renseignée.
 *   §3 — LE PLANCHER : à 10 semaines sur un marathon, même le contournement
 *        refuse, avec un motif dédié.
 *   §4 — LE PLANCHER EST PROPORTIONNÉ : un Ironman n'est pas préparable en
 *        14 semaines, quoi qu'on coche. C'est le point où un plancher absolu
 *        unique de 8 semaines aurait laissé passer le pire cas du dépôt.
 *   §5 — LA CONTRAINTE DU BRIEF : la logique de génération n'est pas touchée.
 *        Le plan tronqué est IDENTIQUE, au caractère près, aux 14 dernières
 *        semaines du plan qu'aurait reçu quelqu'un parti à l'heure.
 *
 * §5 est la garde qui compte. Sans elle, « on ne touche qu'à l'entrée et à la
 * sortie » serait une intention, pas une propriété.
 */
import { buildPlanV2, toProfile } from "../app/bridge.ts";
import type { AppAnswers } from "../app/bridge.ts";
import { planTroncature, semainesRequises, PLANCHER_ABSOLU_SEM } from "../engine/truncatedPrep.ts";

let echecs = 0, total = 0;
function ok(cond: boolean, label: string): void {
  total++;
  if (cond) { console.log("  ✔ " + label); return; }
  echecs++;
  console.log("  ✖ " + label);
}
const titre = (t: string) => console.log("\n" + t + "\n" + "─".repeat(Math.min(78, t.length + 2)));

// Dates ancrées au lundi (A-6) : sans ça le verdict dépendrait du jour d'exécution.
function lundiCourant(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}
const L0 = lundiCourant();
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Le dimanche situé exactement `n` semaines pleines après le lundi courant. */
const courseDans = (n: number) => iso(new Date(L0.getTime() + (n * 7 - 1) * 864e5));

const BASE: AppAnswers = {
  history: "confirme", level: "inter", intent: "competition",
  vol_max: "10", sessions_max: "6", dispo: "partielle", vol_recent: "8",
  pace_known: "oui", pace: "4:30", ftp_known: "non", css_known: "non",
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune",
  age: "38", sex: "H", terrain: "plat", off_days: "non", doubles: "non",
} as unknown as AppAnswers;

const marathon = (sem: number, extra: Record<string, unknown> = {}): AppAnswers =>
  ({ ...BASE, format: "marathon", race_date: courseDans(sem), ...extra }) as AppAnswers;

function tente(sport: string, a: AppAnswers) {
  try { return { plan: buildPlanV2(sport, a), err: null as null | { code?: string; human?: string; bypass?: unknown } }; }
  catch (e) { return { plan: null, err: e as { code?: string; human?: string; bypass?: unknown } }; }
}

console.log("R22 — la préparation tronquée, spec exécutable");
console.log("Lundi d'ancrage : " + iso(L0));

// ================================================================================
titre("§0 — La règle, sur table (le seuil n'est PAS 16 pour tout le monde)");
// ================================================================================
{
  const cas: [string, string, number, number, number][] = [
    // sport, format, need attendu, retirable attendu, plancher attendu
    ["run", "marathon", 16, 4, 12],
    ["run", "semi", 12, 3, 9],
    ["run", "5k", 6, 1, 5],
    ["tri", "Full", 36, 10, 26],
    ["tri", "S", 8, 2, 6],
  ];
  for (const [sp, fmt, need, retirable, plancher] of cas) {
    const n = semainesRequises(sp, toProfile(sp, { ...BASE, format: fmt } as AppAnswers));
    const t = planTroncature(n, 1)!;
    ok(n === need && t.retirable === retirable && t.plancher === plancher,
      sp + "/" + fmt + " : need " + n + " · retirable " + t.retirable + " · plancher " + t.plancher
      + " (attendus " + need + " / " + retirable + " / " + plancher + ")");
  }
  ok(PLANCHER_ABSOLU_SEM === 8, "le plancher absolu déclaré vaut 8 semaines");
  ok(planTroncature(6, 5)!.possible,
    "…et il ne s'applique PAS à un format dont le minimum est déjà sous 8 (5 km à 5 semaines : autorisé)");
}

// ================================================================================
titre("§1 — SANS le drapeau : le refus dur est intact, mot pour mot");
// ================================================================================
{
  const r = tente("run", marathon(14));
  ok(r.plan === null, "14 semaines sans `truncate_prep` → aucun plan généré");
  ok(r.err?.code === "ENTREE_INVALIDE", "…et c'est un refus TYPÉ, pas un plantage (" + r.err?.code + ")");
  ok(/Il reste 14 semaine\(s\) avant ta course/.test(String(r.err?.human)),
    "le message historique est inchangé (« Il reste 14 semaine(s) avant ta course »)");
  ok(/serait te mentir, et te blesser/.test(String(r.err?.human)),
    "…jusqu'à sa dernière phrase");
  ok(/viser un format plus court|viser une course à partir du/.test(String(r.err?.human)),
    "…et les deux issues existantes sont toujours proposées");
  const bp = r.err?.bypass as { possible?: boolean } | undefined;
  ok(!!bp && bp.possible === true,
    "le refus PORTE de quoi savoir qu'une troisième sortie existe (`bypass.possible`)");
  const f = tente("run", marathon(14, { truncate_prep: false }));
  ok(f.plan === null, "`truncate_prep: false` est traité comme absent (toujours refusé)");
}

// ================================================================================
titre("§2 — AVEC le drapeau, 14 semaines sur un marathon");
// ================================================================================
let planTronque: ReturnType<typeof buildPlanV2> | null = null;
{
  const r = tente("run", marathon(14, { truncate_prep: true }));
  ok(!!r.plan, "un plan EST généré" + (r.err ? " (échec : " + r.err.human + ")" : ""));
  planTronque = r.plan;
  const p = r.plan!;
  ok(p.weeks.length === 14, "il fait 14 semaines (" + p.weeks.length + ")");
  ok(p.weeks.every((w, i) => w.num === i + 1), "les semaines sont renumérotées de 1 à " + p.weeks.length);
  ok(p.weeks[0].num === 1, "la première semaine affichée est la « semaine 1 », pas la 3");
  const meta = (p as unknown as { meta?: Record<string, unknown> }).meta || {};
  ok(meta.truncated === true, "meta.truncated = true");
  ok(meta.original_weeks === 16, "meta.original_weeks = 16 (" + meta.original_weeks + ")");
  ok(meta.truncated_weeks === 2, "meta.truncated_weeks = 2 (" + meta.truncated_weeks + ")");
  ok(meta.delivered_weeks === 14, "meta.delivered_weeks = 14");
  const dec = (p._v2?.decisions || []).find((d) => d.id === "R22-troncature");
  ok(!!dec, "une décision `R22-troncature` est journalisée");
  ok(!!dec && /base déjà acquise/.test(dec.why), "…et elle dit ce que la troncature SUPPOSE");
  ok((p._v2?.warnings || []).some((w) => /raccourcie/.test(w)), "un avertissement est porté par le plan");
  ok((p._v2?.hardViolations || []).length === 0,
    "et le plan tronqué reste SAIN : 0 violation dure (" + (p._v2?.hardViolations || []).length + ")");
  // La première semaine livrée doit démarrer à la date réelle, pas dans le passé.
  const d0 = (p.weeks[0].days[0] as { date?: string }).date || "";
  ok(d0 >= iso(L0), "la première semaine commence AUJOURD'HUI ou après (" + d0 + "), jamais dans le passé");
}

// ================================================================================
titre("§3 — LE PLANCHER : 10 semaines sur un marathon, même le bypass refuse");
// ================================================================================
{
  const r = tente("run", marathon(10, { truncate_prep: true }));
  ok(r.plan === null, "10 semaines + drapeau → toujours refusé");
  ok(/n'est pas préparable en moins de 12 semaines/.test(String(r.err?.human)),
    "…avec un motif DÉDIÉ qui nomme le plancher (12 semaines)");
  const bp = r.err?.bypass as { possible?: boolean; plancher?: number } | undefined;
  ok(!!bp && bp.possible === false && bp.plancher === 12,
    "et le refus dit à l'UI de ne PAS proposer le bouton (`bypass.possible = false`)");
  ok(tente("run", marathon(12, { truncate_prep: true })).plan !== null,
    "12 semaines pile — le plancher exact — passe");
  ok(tente("run", marathon(11, { truncate_prep: true })).plan === null,
    "11 semaines ne passe pas : la borne est stricte");
}

// ================================================================================
titre("§4 — LE PLANCHER EST PROPORTIONNÉ (le point où « 8 » aurait été dangereux)");
// ================================================================================
{
  const iron = { ...BASE, format: "Full", race_date: courseDans(14), truncate_prep: true } as AppAnswers;
  const r = tente("tri", iron);
  ok(r.plan === null, "Ironman à 14 semaines + drapeau → REFUSÉ");
  ok(/moins de 26 semaines/.test(String(r.err?.human)), "…plancher 26 semaines, pas 8");
  const ok30 = tente("tri", { ...iron, race_date: courseDans(30) } as AppAnswers);
  ok(!!ok30.plan && ok30.plan.weeks.length === 30,
    "…et un Ironman à 30 semaines passe, tronqué de 6 (" + (ok30.plan ? ok30.plan.weeks.length : "—") + " semaines)");
}

// ================================================================================
titre("§5 — LA CONTRAINTE DU BRIEF : la génération n'est pas touchée");
// ================================================================================
{
  // Le témoin : quelqu'un parti À L'HEURE, 16 semaines avant la même course.
  const course = courseDans(14);
  // Même arithmétique que le pont : travée inclusive, donc `need − 1` semaines de recul
  // depuis le LUNDI de la course. Recopier `− need` ici aurait donné 17 semaines au témoin
  // et rendu la comparaison de §5 fausse dans le sens rassurant.
  const lundiC = new Date(course + "T00:00:00Z");
  lundiC.setUTCDate(lundiC.getUTCDate() - ((lundiC.getUTCDay() + 6) % 7));
  const depart16 = new Date(lundiC.getTime() - 15 * 7 * 864e5).toISOString().slice(0, 10);
  const temoin = tente("run", { ...BASE, format: "marathon", race_date: course, plan_start: depart16 } as AppAnswers);
  ok(!!temoin.plan && temoin.plan.weeks.length === 16, "témoin : 16 semaines générées normalement");
  if (temoin.plan && planTronque) {
    const empreinte = (w: { days: { sessions: { name: string; det: string; min?: number }[] }[] }) =>
      JSON.stringify(w.days.map((d) => d.sessions.map((s) => [s.name, s.det, Math.round(s.min || 0)])));
    const attendu = temoin.plan.weeks.slice(2).map(empreinte);
    const livre = planTronque.weeks.map(empreinte);
    const diff = attendu.filter((x, i) => x !== livre[i]).length;
    ok(diff === 0,
      "le plan tronqué est IDENTIQUE aux semaines 3-16 du témoin, séance par séance (" + diff + " écart)");
    // Et l'instrument SAIT voir : sans quoi « identique » serait dit par une mesure aveugle.
    ok(empreinte(temoin.plan.weeks[0]) !== empreinte(temoin.plan.weeks[8]),
      "…et l'empreinte SAIT distinguer deux semaines différentes (contrôle de l'instrument)");
  }
}

console.log("\n" + "═".repeat(70));
if (echecs) {
  console.log("✖ R22 — " + echecs + " échec(s) sur " + total + " critères");
  process.exit(1);
}
console.log("✓ R22 — " + total + " critères verts : le refus est intact sans le drapeau,");
console.log("        la troncature est bornée par format, et la génération n'a pas bougé.");
