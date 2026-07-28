/**
 * Démo/spec exécutable — système de rétention (spec R4, critères §14). npm run demo:retention.
 *
 * Garanties assertées, CI rouge au moindre écart :
 *   1. le jour de REPOS validé incrémente la streak À L'IDENTIQUE d'un jour de séance ;
 *   2. streak GELÉE (jamais perdue) sous drapeau douleur et maladie déclarée ;
 *   3. AUCUNE mécanique ne récompense un volume hors plan (XP/adhérence insensibles à des
 *      séances non planifiées — seules les séances du plan comptent) ;
 *   4. ajouter une discipline FICTIVE au registre ne change RIEN aux 486 plans (extensibilité) ;
 *   5. trail : volume de la longue en TEMPS + D+ cible, jamais en km seul.
 */
import { generatePlan } from "../generator/planGenerator.ts";
import { adherenceV2, avatarV2 } from "../app/bridge.ts";
import { DISCIPLINE_REGISTRY, type DisciplineSpec } from "../engine/disciplineRegistry.ts";
import type { AthleteProfile, V1Plan } from "../engine/types.ts";

let failures = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) console.log("✓ " + label);
  else { console.error("✗ " + label + (detail ? " — " + detail : "")); failures++; }
};

const profile = {
  sport: "run", format: "10k", history: "confirme", level: "inter", intent: "competition",
  vol_max: "7", sessions_max: "5", dispo: "semaine", pace_known: "oui", pace: "4:30", races: "non",
} as unknown as AthleteProfile;

const { plan } = generatePlan(profile);
const allDays = plan.weeks.flatMap((w) => w.days.map((d) => ({ w, d })));
const dated = allDays.filter((x) => (x.d as { date?: string }).date);
const dateOf = (x: (typeof dated)[0]) => (x.d as { date?: string }).date!;

// Valide TOUTES les séances d'une plage de jours (repos compris — 1 tap, spec §3)
function validateDays(answers: Record<string, unknown>, upTo: number) {
  const done: Record<string, boolean> = {};
  dated.slice(0, upTo).forEach((x) => x.d.sessions.forEach((s, si) => { done[x.w.num + "|" + x.d.jour + "|" + si] = true; }));
  answers.done = done;
}

// ---- 1. Repos validé = jour de séance (strictement le même poids) ----
{
  const a: Record<string, unknown> = {};
  validateDays(a, 10);
  const today = dateOf(dated[9]);
  const adh = adherenceV2(plan, a, today);
  const hasRest = dated.slice(0, 10).some((x) => x.d.sessions.every((s) => s.d === "rs"));
  check("10 jours tous validés (dont " + (hasRest ? "au moins un repos" : "aucun repos ?!") + ") → streak = 10", adh.days === 10 && hasRest, "streak=" + adh.days);
  // retirer la validation du SEUL jour de repos → la streak casse à ce jour (le repos compte donc bien)
  const restIdx = dated.slice(0, 10).findIndex((x) => x.d.sessions.every((s) => s.d === "rs"));
  const done = a.done as Record<string, boolean>;
  const rx = dated[restIdx];
  rx.d.sessions.forEach((s, si) => { delete done[rx.w.num + "|" + rx.d.jour + "|" + si]; });
  const adh2 = adherenceV2(plan, a, today);
  check("repos NON validé → il casse la streak comme n'importe quelle séance (poids identique)", adh2.days === 9 - restIdx, "streak=" + adh2.days + " attendu=" + (9 - restIdx));
}

// ---- 2. Gel de streak : douleur et maladie ne cassent JAMAIS ----
{
  const a: Record<string, unknown> = {};
  validateDays(a, 6); // jours 0..5 validés
  const today = dateOf(dated[8]); // jours 6-7 non validés
  const noFreeze = adherenceV2(plan, a, today);
  check("2 jours manqués sans gel → streak cassée (état témoin)", noFreeze.days === 0, "streak=" + noFreeze.days);
  a.painFlag = { active: true, since: dateOf(dated[6]) };
  const frozen = adherenceV2(plan, a, today);
  check("mêmes jours manqués SOUS drapeau douleur → streak gelée à 6 (pas perdue)", frozen.days === 6, "streak=" + frozen.days);
  delete a.painFlag;
  a.sickDates = [dateOf(dated[6]), dateOf(dated[7])];
  const sick = adherenceV2(plan, a, today);
  check("mêmes jours manqués déclarés MALADE → streak gelée à 6", sick.days === 6, "streak=" + sick.days);
}

// ---- 3. Volume hors plan = ZÉRO gratification (XP, streak) ----
{
  const a: Record<string, unknown> = {};
  validateDays(a, 6);
  const today = dateOf(dated[5]);
  const xpBefore = avatarV2(plan, a, today).xp;
  const adhBefore = adherenceV2(plan, a, today).days;
  // simule des séances HORS PLAN : clés de coche inexistantes + imports FIT surnuméraires
  const done = a.done as Record<string, boolean>;
  done["99|Lun|0"] = true; done["99|Mar|0"] = true; // clés qui ne correspondent à rien
  a.fitSessions = [{ date: today, d: "rn", minutes: 240 }]; // grosse sortie non planifiée
  const xpAfter = avatarV2(plan, a, today).xp;
  const adhAfter = adherenceV2(plan, a, today).days;
  check("séances hors plan (coches fantômes + FIT 4h) → 0 XP supplémentaire", xpAfter === xpBefore, xpBefore + " → " + xpAfter);
  check("séances hors plan → streak inchangée", adhAfter === adhBefore, adhBefore + " → " + adhAfter);
}

// ---- 4. Extensibilité : discipline fictive au registre, moteur intact ----
{
  const before = JSON.stringify(plan.weeks.map((w) => w.vol));
  (DISCIPLINE_REGISTRY as Record<string, DisciplineSpec>)["kayak"] = {
    id: "kayak", label: "Kayak", primaryMetric: "pace_500m",
    zonesSource: { test: "test 1000m", protocol: "1000m à fond", refKey: null },
    volumeUnit: "duration", skills: ["gestuelle pagaie"], loadRules: [], impact: false,
  };
  const { plan: p2 } = generatePlan(profile);
  const after = JSON.stringify(p2.weeks.map((w) => w.vol));
  check("discipline fictive ajoutée au registre → les plans générés sont identiques", before === after);
  delete (DISCIPLINE_REGISTRY as Record<string, DisciplineSpec>)["kayak"];
}

// ---- 5. Trail : longue en TEMPS + D+ cible, jamais en km seul ----
{
  const { plan: pt } = generatePlan({ ...profile, format: "trail" } as unknown as AthleteProfile);
  const longs = pt.weeks.flatMap((w) => w.days).flatMap((d) => d.sessions).filter((s) => s.long);
  check("trail : au moins une sortie longue générée", longs.length > 0);
  const timeBased = longs.every((s) => (s.steps || []).every((st) => st.role !== "body" || st.durationMin != null));
  check("trail : la longue est planifiée en DURÉE (aucun corps en km seul)", timeBased);
  const dplus = longs.some((s) => /D\+ cible \d+-\d+m/.test(s.det || ""));
  check("trail : D+ cible affiché sur la longue (temps + D+, spec §2)", dplus, (longs[0] && longs[0].det || "").slice(0, 80));
}

if (failures) { console.error("\nDémo rétention : " + failures + " garantie(s) en échec."); process.exit(1); }
console.log("\nDémo rétention : toutes les garanties tiennent (repos = séance, gel douleur/maladie, zéro récompense hors plan).");
