/**
 * Démo de la boucle de réparation — preuve des deux garanties :
 * 1. RÉPARATION CIBLÉE : un plan saboté (affûtage regonflé, séances rendues muettes)
 *    est diagnostiqué par l'audit et réparé en ≤3 itérations, jamais régénéré à l'aveugle.
 * 2. HONNÊTETÉ : une violation irréparable produit un « meilleur plan + avertissements »,
 *    jamais une boucle infinie ni un silence.
 * Exécution : node src/audit/repairDemo.ts (exit 1 si une des garanties échoue).
 */
import type { AthleteProfile } from "../engine/types.ts";
import { auditPlan, type AuditOpts } from "./coherenceScorer.ts";
import { generatePlan } from "../generator/planGenerator.ts";
import { applyTargetedRepairs } from "../generator/repairLoop.ts";

const profile: AthleteProfile = {
  sport: "run", format: "marathon", history: "confirme", level: "inter", intent: "competition",
  vol_max: "10", sessions_max: "6", dispo: "semaine", off_which: "", injury: "", age: "35",
  ftp_known: "oui", ftp: "250", pace_known: "oui", pace: "4:30", css_known: "oui", css: "1:55", races: "non",
};
const opts: AuditOpts = { sport: "run", format: "marathon", level: "inter", refs: { cssSecPer100m: 115, thrPaceSecPerKm: 270 } };

let ok = true;

// ---- 1. Sabotage : regonfler l'affûtage + rendre des séances muettes ----
{
  const { plan, reasoned } = generatePlan(profile);
  for (const w of plan.weeks) {
    if (w.phase.id !== "taper") continue;
    for (const d of w.days)
      for (const s of d.sessions) {
        if (!s.steps) continue;
        for (const st of s.steps) if (st.role === "body" && st.durationMin) st.durationMin = Math.round(st.durationMin * 4);
        s.min = s.steps.reduce((t, st) => t + (st.durationMin ? (st.reps || 1) * st.durationMin : st._min || 0), 0);
        delete (s as { note?: string }).note;
        s.det = (s.det || "").split(" — 💡")[0];
      }
  }
  let audit = auditPlan(plan, opts);
  console.log("Après sabotage :", audit.hardViolations.length, "violation(s) dure(s) —", audit.hardViolations.join(" ; "));
  if (audit.hardViolations.length === 0) { console.error("✗ le sabotage aurait dû déclencher l'audit"); ok = false; }
  let iterations = 0;
  const allRepairs: string[] = [];
  while (audit.hardViolations.length > 0 && iterations < 3) {
    iterations++;
    const applied = applyTargetedRepairs(plan, audit, reasoned.baseRefs, reasoned.hz, reasoned.baseRefs);
    if (!applied.length) break;
    allRepairs.push(...applied);
    audit = auditPlan(plan, opts);
  }
  console.log("Réparé en " + iterations + " itération(s), " + allRepairs.length + " action(s) ciblée(s) ; violations restantes : " + audit.hardViolations.length);
  if (audit.hardViolations.length !== 0) { console.error("✗ la réparation ciblée aurait dû converger"); ok = false; }
  else console.log("✓ Garantie 1 : réparation ciblée convergente (pas de régénération aveugle)");
}

// ---- 2. Insatisfaisable : violation qu'aucune réparation ne couvre → avertissements ----
{
  const { plan, reasoned } = generatePlan(profile);
  // Sabotage irréparable pour la boucle actuelle : deux jours durs adjacents
  const wd = plan.weeks[4].days;
  const dur = wd.findIndex((d) => d.charge === "dur");
  if (dur >= 0 && wd[dur + 1]) wd[dur + 1].charge = "dur";
  let audit = auditPlan(plan, opts);
  const before = audit.hardViolations.length;
  let iterations = 0;
  while (audit.hardViolations.length > 0 && iterations < 3) {
    iterations++;
    const applied = applyTargetedRepairs(plan, audit, reasoned.baseRefs, reasoned.hz, reasoned.baseRefs);
    if (!applied.length) break;
    audit = auditPlan(plan, opts);
  }
  const warnings = audit.hardViolations.map((v) => "· " + v);
  console.log("\nCas irréparable : " + before + " violation(s), boucle arrêtée après " + iterations + " itération(s) (pas d'action applicable) :");
  for (const w of warnings) console.log("  " + w);
  if (audit.hardViolations.length === 0 || iterations >= 3) { console.error("✗ attendu : arrêt propre avec avertissements explicites"); ok = false; }
  else console.log("✓ Garantie 2 : meilleur plan + avertissements explicites, jamais de boucle infinie");
}

if (!ok) process.exitCode = 1;
