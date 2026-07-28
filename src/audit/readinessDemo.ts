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

// ---- 8. Boucle prévu/réel via les ✓ de l'UI : peu coché → règle « jamais rattraper » ----
{
  const { adjustTodayV2, completedFromDone } = await import("../app/bridge.ts");
  const { plan } = freshPlan();
  const date = dateOf(plan, (d, w) => w.num === 3 && d.sessions.some((s) => s.d !== "rs"));
  const done: Record<string, boolean> = {};
  const w1 = plan.weeks[0];
  const d1 = w1.days.find((d) => d.sessions.some((s) => s.d !== "rs"))!;
  done[w1.num + "|" + d1.jour + "|" + d1.sessions.findIndex((s) => s.d !== "rs")] = true; // une seule séance cochée
  const answers = { ...profile, done } as unknown as Record<string, unknown>;
  const derived = completedFromDone(plan, answers, date);
  check("✓ UI → séances réalisées dérivées (" + derived.length + " séance, " + (derived[0]?.minutes ?? 0) + "min)", derived.length === 1 && (derived[0]?.minutes ?? 0) > 0);
  const res = adjustTodayV2("run", answers, { date, sleepQuality: "bon", energy: 80 });
  check("  … sous-réalisation détectée → « on ne rattrape jamais »", res.adjustment.decisions.some((d) => d.id === "ADAPT-rattrapage"));
}

// ---- 9. Canicule (36°C) sur jour VO2 extérieur + signaux verts → verdict durci ----
{
  const { plan, reasoned } = freshPlan();
  const date = dateOf(plan, (d, w) => !w.isRecup && d.sessions.some((s) => /VO2/i.test(s.name)));
  const adj = adjustDay(reasoned, plan, date, snap({ sleepQuality: "bon", energy: 80, weather: { tmaxC: 36 } }, date));
  check("canicule 36°C sur VO2 extérieur → verdict durci + consigne", adj.verdict.level === "orange" && adj.action === "reduce" && adj.decisions.some((d) => d.id === "ADAPT-canicule"), adj.verdict.level + "/" + adj.action);
}

// ---- 10. Pluie 8mm sur jour course + verte → séance gardée, consigne surface ----
{
  const { plan, reasoned } = freshPlan();
  const date = dateOf(plan, (d) => d.charge === "facile" && d.sessions.some((s) => s.d === "rn"));
  const adj = adjustDay(reasoned, plan, date, snap({ sleepQuality: "bon", energy: 80, weather: { tmaxC: 18, precipMm: 8 } }, date));
  check("pluie 8mm → keep + consigne surface", adj.action === "keep" && adj.decisions.some((d) => d.id === "ADAPT-pluie"), adj.action);
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

// ---- R4.5 (spec rétention §14) : le drapeau douleur verrouille TOUTE intensité >Z2 ----
{
  const HARD = [".vo2", ".thr", ".speed", ".css", ".ss", ".rp", ".frc", ".mara"];
  const isHardSession = (s: { d: string; steps?: { role: string; zone?: string | null }[] }) =>
    (s.steps || []).some((st) => st.role === "body" && typeof st.zone === "string" && HARD.some((z) => (st.zone as string).endsWith(z)));
  const { plan, reasoned } = freshPlan();
  // un jour de qualité (dur) du plan, testé avec TOUT au vert sauf la douleur
  const hardDay = plan.weeks.flatMap((w) => w.days).find((d) => d.sessions.some(isHardSession) && (d as { date?: string }).date);
  const date = (hardDay as { date?: string }).date!;
  const adj = adjustDay(reasoned, plan, date, { date, sleepQuality: "bon", energy: 90, feel: "frais", painFlag: true, painLocation: "tibia" });
  check("douleur signalée → verdict rouge malgré des signaux tous verts", adj.verdict.level === "rouge", adj.verdict.level);
  check("douleur → plus AUCUNE séance >Z2 ce jour (qualité remplacée/repos)", !hardDay!.sessions.some(isHardSession), hardDay!.sessions.map((s) => s.name).join(", "));
  check("douleur → le verdict s'explique (driver douleur + consulte)", adj.verdict.drivers.some((d) => /douleur/.test(d) && /médecin|kiné/.test(d)));
  // R4.7 — RPE 8+ hier : signal annoncé (jamais silencieux)
  const { plan: p3, reasoned: r3 } = freshPlan();
  const d3 = p3.weeks.flatMap((w) => w.days).map((d) => (d as { date?: string }).date!).filter(Boolean)[5];
  const adj3 = adjustDay(r3, p3, d3, { date: d3, sleepQuality: "bon", energy: 80, lastRpe: 9 });
  check("RPE 9 hier → signal de fatigue présent dans les drivers", adj3.verdict.drivers.some((d) => /RPE 9/.test(d)));
}

if (failures > 0) { console.error("\n✗ " + failures + " scénario(s) readiness en échec"); process.exitCode = 1; }
else console.log("\n✓ Adaptation readiness : tous les scénarios de la roadmap passent.");
