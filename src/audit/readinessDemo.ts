/**
 * Démo/spec exécutable de l'adaptation readiness (Sprint 2) — npm run demo:readiness.
 * Chaque scénario de la roadmap est vérifié par assertion ; invariants de sécurité :
 * hors verte jamais plus de minutes, jamais d'intensité supérieure, affûtage jamais
 * chargé, chaque ajustement expliqué. Exit 1 au moindre écart.
 */
import type { AthleteProfile, V1Plan } from "../engine/types.ts";
import { generatePlan } from "../generator/planGenerator.ts";
import { adjustDay, sessionIntensity } from "../readiness/dailyAdjuster.ts";
import { ManualEntrySource, type ReadinessSnapshot } from "../readiness/readinessSource.ts";

const profile: AthleteProfile = {
  sport: "run", format: "marathon", history: "confirme", level: "inter", intent: "competition",
  vol_max: "10", sessions_max: "6", dispo: "semaine", off_which: "", injury: "", age: "35",
  ftp_known: "oui", ftp: "250", pace_known: "oui", pace: "4:30", css_known: "oui", css: "1:55", races: "non",
};

let failures = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) console.log("✓ " + label);
  else { console.error("✗ " + label + (detail ? " — " + detail : "")); failures++; }
};

function freshPlan(): ReturnType<typeof generatePlan> {
  return generatePlan(profile);
}
function dateOf(plan: V1Plan, pred: (d: V1Plan["weeks"][0]["days"][0], w: V1Plan["weeks"][0]) => boolean): string {
  for (const w of plan.weeks) for (const d of w.days) if (pred(d, w)) return (d as { date?: string }).date!;
  throw new Error("jour introuvable");
}

// La source est enfichable : la démo utilise le MVP saisie manuelle.
const source = new ManualEntrySource();
const snap = (s: Omit<ReadinessSnapshot, "date">, date: string): ReadinessSnapshot => {
  const full = { date, ...s };
  source.record(full);
  return source.getSnapshot(date)!;
};

// ---- 1. Jour VO2 + sommeil mauvais + HRV basse → REMPLACÉ par endurance ----
{
  const { plan, reasoned } = freshPlan();
  const date = dateOf(plan, (d, w) => !w.isRecup && d.sessions.some((s) => /VO2/i.test(s.name)));
  const before = plan.weeks.flatMap((w) => w.days).find((d) => (d as { date?: string }).date === date)!;
  const beforeMin = before.sessions.reduce((t, s) => t + (s.min || 0), 0);
  const adj = adjustDay(reasoned, plan, date, snap({ sleepQuality: "mauvais", hrvStatus: "basse" }, date));
  check("rouge sur jour VO2 → replace", adj.action === "replace", adj.action);
  check("  … la séance devient facile", before.sessions.every((s) => sessionIntensity(s) !== "difficile"));
  check("  … et plus courte (" + adj.adjustedMinutes + " vs " + beforeMin + "min)", adj.adjustedMinutes < beforeMin);
  check("  … avec une explication", before.sessions.every((s) => (s.det || "").includes("💡")));
}

// ---- 2. Même jour, tout au vert → GARDÉ, et dit explicitement ----
{
  const { plan, reasoned } = freshPlan();
  const date = dateOf(plan, (d, w) => !w.isRecup && d.sessions.some((s) => /VO2/i.test(s.name)));
  const adj = adjustDay(reasoned, plan, date, snap({ sleepQuality: "bon", hrvStatus: "haute", energy: 85, feel: "frais" }, date));
  check("verte sur jour VO2 → keep", adj.action === "keep" && adj.adjustedMinutes === adj.originalMinutes);
  check("  … décision explicite", adj.decisions.some((d) => d.id === "ADAPT-verte"));
}

// ---- 3. Jour facile + énergie 18 → OFF ----
{
  const { plan, reasoned } = freshPlan();
  const date = dateOf(plan, (d) => d.charge === "facile" && d.sessions.some((s) => s.d !== "rs"));
  const adj = adjustDay(reasoned, plan, date, snap({ energy: 18, sleepQuality: "mauvais" }, date));
  check("rouge profond sur jour facile → repos", adj.action === "rest" && adj.adjustedMinutes === 0);
}

// ---- 4. Orange sur jour qualité → RÉDUIT, structure conservée ----
{
  const { plan, reasoned } = freshPlan();
  const date = dateOf(plan, (d, w) => !w.isRecup && d.sessions.some((s) => /VO2/i.test(s.name)));
  const before = plan.weeks.flatMap((w) => w.days).find((d) => (d as { date?: string }).date === date)!;
  const nameBefore = before.sessions[0].name;
  const beforeMin = before.sessions.reduce((t, s) => t + (s.min || 0), 0);
  const adj = adjustDay(reasoned, plan, date, snap({ sleepQuality: "moyen", energy: 40 }, date));
  check("orange sur jour VO2 → reduce", adj.action === "reduce", adj.action);
  check("  … même séance (" + nameBefore + "), volume en baisse", before.sessions[0].name === nameBefore && adj.adjustedMinutes < beforeMin);
}

// ---- 5. Rouge en affûtage → OFF (la fraîcheur prime) ----
{
  const { plan, reasoned } = freshPlan();
  const date = dateOf(plan, (d, w) => w.phase.id === "taper" && d.sessions.some((s) => s.d !== "rs"));
  const adj = adjustDay(reasoned, plan, date, snap({ sleepQuality: "mauvais", hrvStatus: "basse" }, date));
  check("rouge en affûtage → OFF", adj.action === "off" && adj.adjustedMinutes === 0);
}

// ---- 6. Semaine sur-réalisée (150% du prévu) + signaux verts → verdict durci ----
{
  const { plan, reasoned } = freshPlan();
  const date = dateOf(plan, (d, w) => w.num === 3 && d.sessions.some((s) => /VO2|Seuil/i.test(s.name)));
  const end = new Date(date + "T00:00:00Z").getTime();
  let planned = 0;
  for (const w of plan.weeks) for (const d of w.days) {
    const t = new Date(((d as { date?: string }).date || "1970") + "T00:00:00Z").getTime();
    if (t >= end - 7 * 864e5 && t < end) planned += d.sessions.reduce((x, s) => x + (s.min || 0), 0);
  }
  const completed = [{ date: new Date(end - 2 * 864e5).toISOString().slice(0, 10), d: "rn" as const, minutes: Math.round(planned * 1.5) }];
  const adj = adjustDay(reasoned, plan, date, snap({ sleepQuality: "bon", energy: 80, completed }, date));
  check("sur-réalisation 150% → verdict durci (verte→orange, reduce)", adj.action === "reduce" && adj.verdict.level === "orange", adj.action + "/" + adj.verdict.level);
  check("  … fatigue recalculée et expliquée", adj.decisions.some((d) => d.id === "ADAPT-charge"));
}

// ---- 7. Semaine sous-réalisée (40%) → on ne rattrape JAMAIS ----
{
  const { plan, reasoned } = freshPlan();
  const date = dateOf(plan, (d, w) => w.num === 3 && d.sessions.some((s) => s.d !== "rs"));
  const end = new Date(date + "T00:00:00Z").getTime();
  let planned = 0;
  for (const w of plan.weeks) for (const d of w.days) {
    const t = new Date(((d as { date?: string }).date || "1970") + "T00:00:00Z").getTime();
    if (t >= end - 7 * 864e5 && t < end) planned += d.sessions.reduce((x, s) => x + (s.min || 0), 0);
  }
  const completed = [{ date: new Date(end - 3 * 864e5).toISOString().slice(0, 10), d: "rn" as const, minutes: Math.round(planned * 0.4) }];
  const adj = adjustDay(reasoned, plan, date, snap({ sleepQuality: "bon", energy: 75, completed }, date));
  check("sous-réalisation 40% → aucune compensation, règle énoncée", adj.adjustedMinutes === adj.originalMinutes && adj.decisions.some((d) => d.id === "ADAPT-rattrapage"));
}

// ---- Invariants globaux : sur 30 jours × 3 états, jamais plus de minutes hors verte ----
{
  const { plan, reasoned } = freshPlan();
  const states: Omit<ReadinessSnapshot, "date">[] = [
    { sleepQuality: "bon", energy: 80 },
    { sleepQuality: "moyen", energy: 40 },
    { sleepQuality: "mauvais", hrvStatus: "basse" },
  ];
  let ok = true;
  const dates = plan.weeks.flatMap((w) => w.days).map((d) => (d as { date?: string }).date!).filter(Boolean).slice(0, 30);
  for (const [i, date] of dates.entries()) {
    const { plan: p2, reasoned: r2 } = freshPlan();
    const adj = adjustDay(r2, p2, date, { date, ...states[i % 3] });
    if (adj.verdict.level !== "verte" && adj.adjustedMinutes > adj.originalMinutes) ok = false;
    if (!adj.decisions.length) ok = false;
  }
  check("invariants 30 jours : hors verte jamais plus de minutes, toujours une décision", ok);
}

if (failures > 0) { console.error("\n✗ " + failures + " scénario(s) readiness en échec"); process.exitCode = 1; }
else console.log("\n✓ Adaptation readiness : tous les scénarios de la roadmap passent.");
