/**
 * Spec exécutable de l'ingestion des données réalisées — `npm run demo:measured`
 * (décisions produit R6, §2 priorité 1 + §3).
 *
 * Ce que cette spec protège, et pourquoi chaque point compte :
 *
 * 1. **`measured` absent ⇒ le plan d'avant, à l'octet près.** C'est le filet de tous les
 *    utilisateurs qui n'importeront jamais rien. Sans ce test, l'ingestion serait un
 *    changement de comportement déguisé.
 * 2. **Le moteur reste PUR** : deux appels avec la même entrée rendent le même plan. C'est ce
 *    qui rend `audit_v7` (4 580 profils) et le golden master possibles.
 * 3. **Une observation ne remplace jamais une contrainte** : `vol_max`, `sessions_max` et les
 *    drapeaux de sécurité ne bougent pas d'un iota quand `measured` arrive.
 * 4. **Une fenêtre incomplète n'allège jamais un plan** : elle sous-compte par construction,
 *    elle ne sert donc qu'à corriger une SOUS-estimation.
 * 5. **Toute recalibration est ANNONCÉE** : elle produit une entrée dans `decisions[]`.
 */
import { measuredFromSessions, measuredWeeklyHours, arbitrateVolRecent, type DoneSession } from "../engine/measured.ts";
import { generateAudited } from "../generator/repairLoop.ts";
import type { AthleteProfile, V1Plan } from "../engine/types.ts";

let failures = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) console.log("✓ " + label);
  else { console.error("✗ " + label + (detail ? " — " + detail : "")); failures++; }
};

const BASE: AthleteProfile = {
  sport: "run", format: "10k", intent: "competition", level: "inter", history: "confirme",
  injury: "aucune", sessions_max: "5", vol_max: "8", vol_recent: "6", dispo: "quotidienne",
  age: "32", sex: "H", weight: "72", med_pain: "non", med_dizzy: "non", med_treat: "non",
  off_days: "non", doubles: "oui", plan_start: "2026-08-03",
} as AthleteProfile;

const TODAY = "2026-07-30";
/** N séances régulières de `min` minutes, étalées sur `spanDays` jours jusqu'à `TODAY`. */
function sessionsOver(spanDays: number, perWeekMin: number): DoneSession[] {
  const out: DoneSession[] = [];
  const t0 = new Date(TODAY + "T00:00:00Z").getTime();
  const nSess = Math.max(1, Math.round((spanDays / 7) * 3));
  const per = Math.round((perWeekMin * (spanDays / 7)) / nSess);
  for (let i = 0; i < nSess; i++) {
    const d = new Date(t0 - Math.round((i * (spanDays - 1)) / Math.max(1, nSess - 1)) * 864e5);
    out.push({ date: d.toISOString().slice(0, 10), d: "rn", minutes: per });
  }
  return out;
}
const plan = (a: Partial<AthleteProfile>): V1Plan => generateAudited({ ...BASE, ...a } as AthleteProfile).plan;
const stripDates = (p: V1Plan) => JSON.stringify(p, (k, v) => (k === "date" ? undefined : v));
const week1Min = (p: V1Plan) => p.weeks[0].days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0);
const decisionIds = (a: Partial<AthleteProfile>) =>
  generateAudited({ ...BASE, ...a } as AthleteProfile).decisions.map((d) => d.id);

console.log("\n— Instantané : ce qu'on dérive des séances réalisées —");
const full = measuredFromSessions(sessionsOver(28, 240), TODAY);
check("28 jours couverts → confiance haute", full != null && full.confidence === "high", String(full && full.confidence));
check("volume hebdo dérivé ≈ 4h/sem", Math.abs((measuredWeeklyHours(full) || 0) - 4) < 0.6, String(measuredWeeklyHours(full)));
const partial = measuredFromSessions(sessionsOver(8, 240), TODAY);
check("8 jours seulement → confiance partielle", partial != null && partial.confidence === "partial", String(partial && partial.confidence));
check("aucune séance → aucun instantané (pas d'objet vide)", measuredFromSessions([], TODAY) === null);
check("séances hors fenêtre ignorées", measuredFromSessions([{ date: "2026-01-01", d: "rn", minutes: 300 }], TODAY) === null);

console.log("\n— Arbitrage : la mesure corrige la déclaration, elle ne la contredit pas à l'aveugle —");
const aHigh = arbitrateVolRecent("6", full);
check("mesure fiable plus BASSE que la déclaration → la mesure gagne", aHigh.source === "mesure" && (aHigh.hours || 0) < 6, JSON.stringify(aHigh.hours));
check("… et le changement est motivé par une phrase", /ajusté de .* à .* mesurés/.test(aHigh.why), aHigh.why);
const aPartLow = arbitrateVolRecent("6", partial);
check("fenêtre incomplète plus basse → la DÉCLARATION est retenue", aPartLow.source === "declare" && aPartLow.hours === 6);
check("… et le refus est expliqué, pas silencieux", /fenêtre incomplète ne prouve rien/.test(aPartLow.why), aPartLow.why);
// Une fenêtre partielle est moyennée sur la fenêtre ENTIÈRE (28 j), pas sur les jours couverts :
// c'est ce qui la rend structurellement sous-estimée, et c'est voulu.
const aPartHigh = arbitrateVolRecent("0.5", partial);
check("fenêtre incomplète plus HAUTE → retenue (elle prouve un plancher)", aPartHigh.source === "mesure" && (aPartHigh.hours || 0) > 0.5, JSON.stringify(aPartHigh));
check("sans mesure : la déclaration, inchangée", arbitrateVolRecent("6", null).hours === 6 && arbitrateVolRecent("6", null).why === "");
check("sans mesure ni déclaration : rien (pas de rampe inventée)", arbitrateVolRecent("", null).hours === null);

console.log("\n— Le filet : sans `measured`, RIEN ne change —");
const ref = plan({});
check("plan de référence reproductible (moteur pur)", stripDates(plan({})) === stripDates(ref));
check("`measured: null` ⇒ plan identique au bit près", stripDates(plan({ measured: null })) === stripDates(ref));
check("instantané vide (0 minute) ⇒ plan identique",
  stripDates(plan({ measured: { updated_at: TODAY, source: "manual", window_days: 28, vol_min: 0, sessions: 0, confidence: "high" } })) === stripDates(ref));
check("aucune décision `measured-vol` sans mesure", !decisionIds({}).includes("measured-vol"));

console.log("\n— Effet mesuré : le départ suit ce qui a été fait —");
// 1h30/sem mesurées contre 6h déclarées : l'écart est celui d'un athlète qui déclare son
// volume « d'avant l'hiver ». C'est exactement le cas que la rampe R10 doit attraper.
const lowMeas = measuredFromSessions(sessionsOver(28, 90), TODAY);
const low = { ...BASE, measured: lowMeas };
const planLow = plan({ measured: lowMeas });
check("semaine 1 plus légère avec une mesure plus basse", week1Min(planLow) < week1Min(ref),
  week1Min(planLow) + "min vs " + week1Min(ref) + "min");
check("la recalibration apparaît dans les décisions (§3.4)", decisionIds({ measured: lowMeas }).includes("measured-vol"));
check("le départ mesuré est marqué comme tel",
  generateAudited(low as AthleteProfile).decisions.some((d) => d.id === "R10-depart" && /mesuré/.test(String(d.val))));
check("mesure partielle plus basse ⇒ plan inchangé (elle n'allège rien)",
  stripDates(plan({ measured: partial })) === stripDates(ref));

console.log("\n— Une observation ne remplace jamais une contrainte —");
const capped = generateAudited({ ...BASE, vol_max: "5", measured: measuredFromSessions(sessionsOver(28, 900), TODAY) } as AthleteProfile);
const peakH = Math.max(...capped.plan.weeks.map((w) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0))) / 60;
check("15h/sem mesurées ne font pas sauter un plafond déclaré à 5h", peakH <= 5 * 1.15, peakH.toFixed(1) + "h");
const budg = generateAudited({ ...BASE, sessions_max: "3", measured: measuredFromSessions(sessionsOver(28, 900), TODAY) } as AthleteProfile);
const maxSess = Math.max(...budg.plan.weeks.map((w) => w.days.reduce((t, d) => t + d.sessions.filter((s) => s.d !== "rs").length, 0)));
check("… ni un budget de séances déclaré à 3", maxSess <= 3, String(maxSess));
const med = generateAudited({ ...BASE, med_dizzy: "oui", measured: full } as AthleteProfile);
const hard = med.plan.weeks.flatMap((w) => w.days.flatMap((d) => d.sessions))
  .filter((s) => (s.steps || []).some((b) => /\.(vo2|thr|css|rp|frc|speed)$/.test(String(b.zone || ""))));
check("… ni le drapeau médical (aucune intensité malgré l'import)", hard.length === 0, String(hard.length));

console.log(failures === 0 ? "\n✓ Ingestion `measured` : toutes les garanties tiennent.\n" : "\n✗ " + failures + " garantie(s) rompue(s).\n");
process.exit(failures === 0 ? 0 : 1);
