/**
 * Ajusteur quotidien — Sprint 2. « Recalcul chaque matin » = à l'ouverture de l'appli.
 *
 * Logique (roadmap) :
 * - readiness ROUGE (HRV basse + sommeil mauvais, énergie très basse…) → la qualité est
 *   REMPLACÉE par de l'endurance ; un jour facile devient repos actif ; en affûtage → OFF.
 * - ORANGE → le corps de séance est RÉDUIT (×0.7), la structure est conservée.
 * - VERTE → la séance est GARDÉE, et on le dit (décision explicite, pas un silence).
 * - Écart prévu/réel : semaine réalisée >130% du prévu → verdict durci d'un cran ;
 *   <60% → on n'essaie JAMAIS de rattraper le volume manqué (règle de coach).
 *
 * Invariants (vérifiés par demo:readiness, en CI) : hors verte, jamais plus de minutes
 * qu'avant ; jamais d'intensité supérieure ; l'affûtage ne gagne jamais de charge ;
 * chaque ajustement porte un {id, what, val, why}.
 */
import type { Decision, ReasonedPlan, V1Day, V1Plan, V1Session } from "../engine/types.ts";
import { renderSess, type Refs } from "../generator/renderer.ts";
import { assessReadiness, type ReadinessSnapshot, type ReadinessVerdict, type ReadinessLevel } from "./readinessSource.ts";

export type AdjustAction = "keep" | "reduce" | "replace" | "rest" | "off";

export interface DayAdjustment {
  date: string;
  action: AdjustAction;
  verdict: ReadinessVerdict;
  originalMinutes: number;
  adjustedMinutes: number;
  decisions: Decision[];
}

type IntensityClass = "difficile" | "moderee" | "facile" | "repos";

const HARD_ZONES = [".vo2", ".thr", ".speed", ".css"];
const MODERATE_ZONES = [".ss", ".rp", ".frc", ".mara", ".tempo"];

export function sessionIntensity(s: V1Session): IntensityClass {
  if (s.d === "rs") return "repos";
  if (s.brick) return "difficile";
  const zones = (s.steps || []).filter((st) => st.role === "body" && typeof st.zone === "string").map((st) => st.zone as string);
  if (zones.some((z) => HARD_ZONES.some((h) => z.endsWith(h)))) return "difficile";
  if (zones.some((z) => MODERATE_ZONES.some((m) => z.endsWith(m)))) return "moderee";
  return "facile";
}

const dayMinutes = (d: V1Day) => d.sessions.reduce((t, s) => t + (s.min || 0), 0);

function findDay(plan: V1Plan, date: string): { day: V1Day; week: V1Plan["weeks"][0] } | null {
  for (const w of plan.weeks)
    for (const d of w.days) if ((d as { date?: string }).date === date) return { day: d, week: w };
  return null;
}

/** Charge des 7 jours précédant `date` : prévue par le plan vs réellement effectuée. */
function acuteGap(plan: V1Plan, snapshot: ReadinessSnapshot): { plannedMin: number; doneMin: number; ratio: number | null } {
  const end = new Date(snapshot.date + "T00:00:00Z").getTime();
  const start = end - 7 * 864e5;
  let plannedMin = 0;
  for (const w of plan.weeks)
    for (const d of w.days) {
      const t = new Date(((d as { date?: string }).date || "1970-01-01") + "T00:00:00Z").getTime();
      if (t >= start && t < end) plannedMin += dayMinutes(d);
    }
  const doneMin = (snapshot.completed || [])
    .filter((c) => {
      const t = new Date(c.date + "T00:00:00Z").getTime();
      return t >= start && t < end;
    })
    .reduce((t, c) => t + c.minutes, 0);
  return { plannedMin, doneMin, ratio: plannedMin > 0 && snapshot.completed ? doneMin / plannedMin : null };
}

function downgrade(level: ReadinessLevel): ReadinessLevel {
  return level === "verte" ? "orange" : "rouge";
}

/** Réduit le corps des séances d'un jour (×f), re-rend, renvoie les minutes. */
function reduceDay(day: V1Day, f: number, refs: Refs, hz: Record<string, string>, baseRefs: Refs): void {
  for (const s of day.sessions) {
    if (!s.steps || !s.steps.length) continue;
    for (const st of s.steps) {
      if (st.role !== "body") continue;
      if (st.reps && st.reps > 1) st.reps = Math.max(1, Math.round(st.reps * f));
      else if (st.durationMin) st.durationMin = Math.max(10, Math.round(st.durationMin * f));
      else if (st.distanceM) st.distanceM = Math.max(200, Math.round((st.distanceM * f) / 25) * 25);
    }
    renderSess(s, refs, hz, baseRefs);
  }
}

function enduranceReplacement(disc: string, minutes: number, refs: Refs, hz: Record<string, string>, baseRefs: Refs, why: string): V1Session {
  const d = (disc === "br" ? "bk" : disc) as V1Session["d"];
  const zone = d === "rn" ? "rn.easy" : d === "sw" ? "sw.easy" : "bk.z2";
  const s: V1Session = d === "sw"
    ? { d, name: "Endurance souple (adaptée)", note: why, det: "", steps: [{ role: "body", distanceM: Math.max(750, Math.round(((minutes * 60) / (baseRefs.css || 130)) * 100 / 25) * 25), zone, d: "sw" }] }
    : { d, name: "Endurance facile (adaptée)", note: why, det: "", steps: [{ role: "body", durationMin: minutes, zone }] };
  renderSess(s, refs, hz, baseRefs);
  return s;
}

export function adjustDay(reasoned: ReasonedPlan, plan: V1Plan, date: string, snapshot: ReadinessSnapshot): DayAdjustment {
  const decisions: Decision[] = [];
  const D = (id: string, what: string, val: string | number, why: string) => decisions.push({ id, what, val, why });
  const refs: Refs = { ...reasoned.baseRefs };
  const found = findDay(plan, date);
  const verdictBase = assessReadiness(snapshot);
  let level = verdictBase.level;
  const drivers = [...verdictBase.drivers];

  // Écart prévu/réel — recalcul de la fatigue accumulée
  const gap = acuteGap(plan, snapshot);
  if (gap.ratio !== null) {
    if (gap.ratio > 1.3) {
      level = downgrade(level);
      drivers.push("charge réelle 7j = " + Math.round(gap.ratio * 100) + "% du prévu — fatigue accumulée");
      D("ADAPT-charge", "Fatigue recalculée", Math.round(gap.doneMin) + "min réalisées vs " + Math.round(gap.plannedMin) + "min prévues", "Tu en as fait beaucoup plus que prévu : le verdict du jour est durci d'un cran");
    } else if (gap.ratio < 0.6) {
      D("ADAPT-rattrapage", "Volume manqué", Math.round(gap.doneMin) + "/" + Math.round(gap.plannedMin) + "min", "On ne rattrape JAMAIS le volume manqué : la semaine reprend comme prévu, sans compensation");
    }
  }
  // Météo (manifeste §6) — la canicule durcit le verdict pour les séances en extérieur ;
  // la chaleur et la pluie produisent des consignes, pas des interdictions.
  const wx = snapshot.weather;
  const outdoor = found ? found.day.sessions.some((s) => s.d === "rn" || s.d === "bk" || s.d === "br") : false;
  if (wx?.tmaxC != null && found) {
    if (wx.tmaxC >= 35 && outdoor) {
      level = downgrade(level);
      drivers.push("canicule prévue (" + Math.round(wx.tmaxC) + "°C)");
      D("ADAPT-canicule", "Canicule", Math.round(wx.tmaxC) + "°C", "≥35°C : intensité réduite ou repos pour les séances extérieures — la piscine reste une excellente option aujourd'hui");
    } else if (wx.tmaxC >= 30 && outdoor) {
      drivers.push("forte chaleur (" + Math.round(wx.tmaxC) + "°C)");
      D("ADAPT-chaleur", "Forte chaleur", Math.round(wx.tmaxC) + "°C", "Démarre tôt le matin, hydrate-toi, et réduis d'un cran si la dérive cardiaque monte");
    }
  }
  if (wx?.precipMm != null && wx.precipMm >= 5 && found && found.day.sessions.some((s) => s.d === "rn")) {
    D("ADAPT-pluie", "Pluie annoncée", Math.round(wx.precipMm) + "mm", "Surface glissante : évite piste peinte et racines, rallonge l'échauffement, foulée prudente");
  }
  const verdict: ReadinessVerdict = { level, drivers };

  if (!found) {
    D("ADAPT-jour", "Jour hors plan", date, "Aucune séance planifiée à cette date : rien à adapter");
    return { date, action: "keep", verdict, originalMinutes: 0, adjustedMinutes: 0, decisions };
  }
  const { day, week } = found;
  const originalMinutes = dayMinutes(day);
  const intensity = day.sessions.map(sessionIntensity).reduce<IntensityClass>((a, b) => {
    const order: IntensityClass[] = ["repos", "facile", "moderee", "difficile"];
    return order.indexOf(b) > order.indexOf(a) ? b : a;
  }, "repos");
  const inTaper = week.phase.id === "taper";

  let action: AdjustAction = "keep";
  if (intensity === "repos") {
    D("ADAPT-repos", "Jour de repos", "inchangé", "Jour de repos planifié — parfait quel que soit l'état de forme");
  } else if (level === "verte") {
    D("ADAPT-verte", "Readiness verte", "séance maintenue", drivers.join(" · ") + " — la qualité prévue est gardée telle quelle");
  } else if (level === "orange") {
    action = "reduce";
    reduceDay(day, 0.7, refs, reasoned.hz, reasoned.baseRefs);
    D("ADAPT-orange", "Readiness orange", "corps de séance ×0.7", drivers.join(" · ") + " — la structure est conservée, le volume baisse");
  } else {
    // rouge
    if (inTaper) {
      action = "off";
      day.charge = "off";
      day.sessions = [{ d: "rs", name: "OFF (readiness)", det: "repos — 💡 " + drivers.join(" · ") + ". En affûtage, la fraîcheur prime sur tout : repos complet.", steps: [] }];
      D("ADAPT-rouge-taper", "Rouge en affûtage", "OFF", "À quelques jours de la course, on ne force jamais sur un signal rouge");
    } else if (intensity === "difficile" || intensity === "moderee") {
      action = "replace";
      const main = day.sessions.find((s) => s.d !== "rs")!;
      const why = drivers.join(" · ") + " — la séance de qualité est remplacée par de l'endurance : l'intensité un jour rouge coûte plus qu'elle ne rapporte.";
      const replacementMin = Math.max(25, Math.round(originalMinutes * 0.5));
      day.sessions = [enduranceReplacement(main.d, replacementMin, refs, reasoned.hz, reasoned.baseRefs, why)];
      day.charge = "facile";
      D("ADAPT-rouge", "Readiness rouge", "qualité → endurance (" + replacementMin + "min)", why);
    } else {
      action = "rest";
      const deepRed = (snapshot.energy != null && snapshot.energy < 20) || (snapshot.sleepQuality === "mauvais" && snapshot.hrvStatus === "basse");
      day.charge = deepRed ? "off" : "facile";
      day.sessions = deepRed
        ? [{ d: "rs", name: "OFF (readiness)", det: "repos total — 💡 " + drivers.join(" · ") + ". La récupération EST l'entraînement aujourd'hui.", steps: [] }]
        : [{ d: "rs", name: "Repos actif", det: "20-30min marche ou mobilité douce — 💡 " + drivers.join(" · ") + ". On bouge sans charger.", steps: [] }];
      D("ADAPT-rouge-facile", "Readiness rouge", deepRed ? "OFF" : "repos actif", "Même un jour facile se transforme en récupération quand les signaux sont rouges");
    }
  }

  return { date, action, verdict, originalMinutes, adjustedMinutes: dayMinutes(day), decisions };
}
