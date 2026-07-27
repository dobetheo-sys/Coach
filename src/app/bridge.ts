/**
 * Pont UI ↔ moteur V2 — exposé au produit HTML sous `globalThis.EBV2` par le bundle
 * (`npm run build:app`). L'UI n'appelle QUE ces trois fonctions ; aucune logique métier
 * dans les composants (manifeste, §9 Architecture).
 */
import type { AthleteProfile, V1Plan } from "../engine/types.ts";
import { generateAudited } from "../generator/repairLoop.ts";
import { generatePlan } from "../generator/planGenerator.ts";
import { adjustDay, type DayAdjustment } from "../readiness/dailyAdjuster.ts";
import { assessReadiness, type ReadinessSnapshot } from "../readiness/readinessSource.ts";

interface AppAnswers extends Record<string, unknown> {
  format?: string;
}

function toProfile(sport: string, answers: AppAnswers): AthleteProfile {
  return { ...(answers as object), sport } as AthleteProfile;
}

export interface V2PlanMeta {
  decisions: { id: string; what: string; val: string | number; why: string }[];
  warnings: string[];
  repairs: string[];
  score: number;
  hardViolations: string[];
}

/** Génère le plan via le moteur V2 (raisonne → génère → audite → répare) — forme V1Plan. */
export function buildPlanV2(sport: string, answers: AppAnswers): V1Plan & { _v2?: V2PlanMeta } {
  const res = generateAudited(toProfile(sport, answers));
  const plan = res.plan as V1Plan & { _v2?: V2PlanMeta };
  plan._v2 = {
    decisions: res.decisions,
    warnings: res.warnings,
    repairs: res.repairs,
    score: res.audit.score,
    hardViolations: res.audit.hardViolations,
  };
  return plan;
}

export interface TodayAdjustment {
  adjustment: DayAdjustment;
  sessions: { name: string; det: string; d: string }[];
  jour: string | null;
}

/** Adapte la journée `snapshot.date` à l'état de forme — « recalcul du matin ». */
export function adjustTodayV2(sport: string, answers: AppAnswers, snapshot: ReadinessSnapshot): TodayAdjustment {
  const { plan, reasoned } = generatePlan(toProfile(sport, answers));
  const adjustment = adjustDay(reasoned, plan, snapshot.date, snapshot);
  let sessions: TodayAdjustment["sessions"] = [];
  let jour: string | null = null;
  for (const w of plan.weeks)
    for (const d of w.days)
      if ((d as { date?: string }).date === snapshot.date) {
        sessions = d.sessions.map((s) => ({ name: s.name, det: s.det || "", d: s.d }));
        jour = d.jour;
      }
  return { adjustment, sessions, jour };
}

declare const globalThis: { EBV2?: unknown } & Record<string, unknown>;
(globalThis as Record<string, unknown>).EBV2 = {
  buildPlan: buildPlanV2,
  adjustToday: adjustTodayV2,
  assessReadiness,
  version: "v2-sprint3",
};
