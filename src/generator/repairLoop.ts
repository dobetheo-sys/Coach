/**
 * Boucle de réparation V2 — jamais de régénération aveugle (un générateur déterministe
 * reproduirait le même plan : boucle infinie par construction). L'audit dit QUOI est
 * cassé et OÙ ; la réparation vise ce point précis. Itérations plafonnées ; si les
 * contraintes sont insatisfaisables, on rend le MEILLEUR plan avec des avertissements
 * explicites — c'est un output de coaching précieux, pas un échec.
 */
import type { AthleteProfile, V1Plan } from "../engine/types.ts";
import { auditPlan, type AuditOpts, type PlanAudit } from "../audit/coherenceScorer.ts";
import { R313_TAPER_MAX_VS_PEAK } from "../engine/constraintMatrix.ts";
import { generatePlan } from "./planGenerator.ts";
import { renderSess, type Refs } from "./renderer.ts";

export interface AuditedPlan {
  plan: V1Plan;
  audit: PlanAudit;
  warnings: string[];
  repairs: string[];
  decisions: { id: string; what: string; val: string | number; why: string }[];
}

const MAX_ITERATIONS = 3;

/** Réparations ciblées : violation → action locale sur le plan. Exporté pour la démo de sabotage. */
export function applyTargetedRepairs(plan: V1Plan, audit: PlanAudit, refs: Refs, hz: Record<string, string>, baseRefs: Refs): string[] {
  const applied: string[] = [];

  // Affûtage trop lourd — deux visages du même mal : taperVsPeak > 0.6, ou une semaine
  // d'affûtage devenue la plus grosse du plan (échec « pic en phase peak »). Réparation :
  // rétrécir le CORPS des séances d'affûtage vers la cible R3.13, puis couper la fréquence.
  const wMinOf = (w: V1Plan["weeks"][0]) => w.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.min || 0), 0), 0);
  const taperWeeks = plan.weeks.filter((w) => w.phase.id === "taper");
  const chargeMax = Math.max(0, ...plan.weeks.filter((w) => !w.isRecup && w.phase.id !== "taper").map(wMinOf));
  const taperTooHeavy = (audit.taperVsPeak !== null && audit.taperVsPeak > 0.6) || (!audit.peakInPeakPhase && taperWeeks.some((w) => wMinOf(w) > chargeMax * R313_TAPER_MAX_VS_PEAK));
  if (taperTooHeavy && chargeMax > 0) {
    for (const w of taperWeeks) {
      const target = chargeMax * R313_TAPER_MAX_VS_PEAK;
      if (wMinOf(w) > target) {
        // 1) rétrécir les corps de séance proportionnellement
        const f = Math.max(0.2, target / wMinOf(w));
        for (const d of w.days)
          for (const s of d.sessions) {
            if (!s.steps || !s.steps.length) continue;
            for (const st of s.steps) {
              if (st.role !== "body") continue;
              if (st.durationMin) st.durationMin = Math.max(3, Math.round(st.durationMin * f));
              if (st.distanceM) st.distanceM = Math.max(100, Math.round((st.distanceM * f) / 25) * 25);
            }
            renderSess(s, refs, hz, baseRefs);
          }
        applied.push("S" + w.num + " : corps des séances d'affûtage ×" + f.toFixed(2) + " (affûtage plus lourd que permis)");
      }
      // 2) si les planchers bloquent encore : la fréquence cède (R3.13)
      for (let g = 0; g < 4 && wMinOf(w) > chargeMax * R313_TAPER_MAX_VS_PEAK; g++) {
        const cand = w.days.filter((d) => d.charge === "facile" && !d.forced && d.sessions.some((s) => s.d !== "rs") && !d.sessions.some((s) => s.long || s.brick));
        if (!cand.length) break;
        const dayMin = (d: (typeof cand)[0]) => d.sessions.reduce((t, s) => t + (s.min || 0), 0);
        const victim = cand.reduce((x, y) => (dayMin(y) < dayMin(x) ? y : x));
        victim.charge = "off";
        victim.slot = "off";
        victim.sessions = [{ d: "rs", name: "OFF (affûtage)", det: "repos — la fraîcheur du jour J se construit maintenant", steps: [] }];
        applied.push("S" + w.num + " : jour facile → OFF (affûtage trop lourd)");
      }
    }
  }

  // Séance muette → note générique honnête (le manifeste exige l'explication)
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions) {
        if (s.d === "rs" || s.note || (s.det || "").includes("💡")) continue;
        s.note = "Séance d'endurance au service du bloc en cours : régularité avant tout.";
        if (s.steps && s.steps.length) renderSess(s, refs, hz, baseRefs);
        else s.det = (s.det || "") + " — 💡 " + s.note;
        applied.push("S" + w.num + " : note ajoutée à « " + s.name + " »");
      }

  return applied;
}

/** Génère, audite, répare de façon ciblée, et rend toujours un résultat honnête. */
export function generateAudited(profile: AthleteProfile, auditOpts?: Partial<AuditOpts>): AuditedPlan {
  const { plan, reasoned } = generatePlan(profile);
  const opts: AuditOpts = {
    sport: profile.sport,
    format: profile.format,
    level: profile.level,
    refs: { cssSecPer100m: reasoned.baseRefs.css || 130, thrPaceSecPerKm: reasoned.baseRefs.thrPace || 330 },
    ...auditOpts,
  };
  const refs: Refs = { ...reasoned.baseRefs };
  let audit = auditPlan(plan, opts);
  const repairs: string[] = [];
  let best = { plan, audit };

  for (let it = 0; it < MAX_ITERATIONS && audit.hardViolations.length > 0; it++) {
    const applied = applyTargetedRepairs(plan, audit, refs, reasoned.hz, reasoned.baseRefs);
    if (!applied.length) break; // aucune réparation applicable : inutile de boucler
    repairs.push(...applied);
    audit = auditPlan(plan, opts);
    if (audit.hardViolations.length < best.audit.hardViolations.length || audit.score > best.audit.score) best = { plan, audit };
  }

  const warnings: string[] = [...(reasoned.warnings || [])];
  if (best.audit.hardViolations.length > 0) {
    warnings.push("Plan rendu avec réserves (contraintes insatisfaisables après " + MAX_ITERATIONS + " réparations) :");
    warnings.push(...best.audit.hardViolations.map((v) => "· " + v));
  }
  return { plan: best.plan, audit: best.audit, warnings, repairs, decisions: reasoned.decisions };
}
