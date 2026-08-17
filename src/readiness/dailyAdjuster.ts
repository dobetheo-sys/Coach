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
import { scaleStepDose } from "../engine/stepScale.ts";
import { R6_PAIN_CONTRAINDICATION } from "../engine/constraintMatrix.ts";
import { renderSess, zoneSpeedRatio, type Refs } from "../generator/renderer.ts";
import { assessReadiness, type CompletedSession, type ReadinessSnapshot, type ReadinessVerdict, type ReadinessLevel } from "./readinessSource.ts";

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

export const dayMinutes = (d: V1Day) => d.sessions.reduce((t, s) => t + (s.min || 0), 0);

function findDay(plan: V1Plan, date: string): { day: V1Day; week: V1Plan["weeks"][0] } | null {
  for (const w of plan.weeks)
    for (const d of w.days) if ((d as { date?: string }).date === date) return { day: d, week: w };
  return null;
}

/**
 * Charge des `days` jours précédant `date` : prévue par le plan vs réellement effectuée.
 *
 * R21 — exportée pour que le détecteur de déviation lise le MÊME chiffre que l'ajusteur.
 * Deux calculs de « charge des 7 derniers jours » finiraient par diverger, et c'est
 * exactement le genre de divergence qu'O-23 vient d'exposer entre le moteur et l'UI (R11.1).
 * `ratio` est `null` quand rien n'a été effectué OU quand rien n'était prévu : un ratio
 * calculé sur un dénominateur nul serait un chiffre inventé.
 */
export function loadWindow(plan: V1Plan, completed: CompletedSession[] | undefined, date: string, days = 7):
{ plannedMin: number; doneMin: number; ratio: number | null } {
  const end = new Date(date + "T00:00:00Z").getTime();
  const start = end - days * 864e5;
  let plannedMin = 0;
  for (const w of plan.weeks)
    for (const d of w.days) {
      const t = new Date(((d as { date?: string }).date || "1970-01-01") + "T00:00:00Z").getTime();
      if (t >= start && t < end) plannedMin += dayMinutes(d);
    }
  const doneMin = (completed || [])
    .filter((c) => {
      const t = new Date(c.date + "T00:00:00Z").getTime();
      return t >= start && t < end;
    })
    .reduce((t, c) => t + c.minutes, 0);
  return { plannedMin, doneMin, ratio: plannedMin > 0 && completed ? doneMin / plannedMin : null };
}

function acuteGap(plan: V1Plan, snapshot: ReadinessSnapshot): { plannedMin: number; doneMin: number; ratio: number | null } {
  return loadWindow(plan, snapshot.completed, snapshot.date, 7);
}

function downgrade(level: ReadinessLevel): ReadinessLevel {
  return level === "verte" ? "orange" : "rouge";
}

/** Réduit le corps des séances d'un jour (×f), re-rend, renvoie les minutes.
 *  R21 — exportée : le recalcul de fenêtre réduit EXACTEMENT comme l'ajusteur du matin.
 *  Une seconde façon de réduire une séance serait une seconde définition de « réduire ». */
export function reduceDay(day: V1Day, f: number, refs: Refs, hz: Record<string, string>, baseRefs: Refs): void {
  for (const s of day.sessions) {
    if (!s.steps || !s.steps.length) continue;
    for (const st of s.steps) {
      if (st.role !== "body") continue;
      // A3 (audit v6) — les planchers ne remontent JAMAIS au-dessus de la valeur d'origine :
      // une réduction est une réduction, même sur une séance déjà courte. `clampToOriginal`
      // porte cette promesse pour les TROIS champs — l'ancienne écriture la posait sur la
      // durée et la distance mais pas sur `reps` : mesuré, f = 1,2 faisait passer un bloc de
      // 5 à 6 répétitions pendant que ce commentaire promettait le contraire (trouvé par la
      // garantie runtime de R21, fermé par le point unique `stepScale`).
      scaleStepDose(st, f, { repsMode: "round", durFloor: 10, distFloor: 200, clampToOriginal: true });
    }
    renderSess(s, refs, hz, baseRefs);
  }
}

function enduranceReplacement(disc: string, minutes: number, refs: Refs, hz: Record<string, string>, baseRefs: Refs, why: string): V1Session {
  const d = (disc === "br" ? "bk" : disc) as V1Session["d"];
  const zone = d === "rn" ? "rn.easy" : d === "sw" ? "sw.easy" : "bk.z2";
  // A3 (audit v6) — un remplacement de récupération n'est PAS une séance de plan : le
  // plancher C24 (750m) ne s'y applique pas. La distance est DÉRIVÉE des minutes allouées
  // (arrondi à 25m vers le bas) pour ne jamais dépasser la séance qu'elle remplace.
  //
  // O-42 — CINQUIÈME SITE DE CONVERSION, et c'est la garde A3 qui l'a trouvé. La distance se
  // dérivait de l'ancre CSS BRUTE pendant que `stepMin` compte désormais à l'allure de la ZONE :
  // `sw.easy` étant nagé à ×1,12 du CSS, la séance de remplacement durait 12 % de plus que les
  // minutes qu'on lui allouait — 23 min demandées, 25 livrées, sur un jour ROUGE, c'est-à-dire
  // exactement là où l'invariant « jamais plus de minutes qu'avant ajustement » protège
  // l'athlète. La vitesse vient donc de la même dérivation que partout ailleurs (R11.1).
  const vSw = zoneSpeedRatio("sw.easy", undefined, "css") ?? 1;
  const s: V1Session = d === "sw"
    ? { d, name: "Endurance souple (adaptée)", note: why, det: "", steps: [{ role: "body", distanceM: Math.max(200, Math.floor(((minutes * 60 * vSw) / (baseRefs.css || 130)) * 100 / 25) * 25), zone, d: "sw" }] }
    : { d, name: "Endurance facile (adaptée)", note: why, det: "", steps: [{ role: "body", durationMin: minutes, zone }] };
  renderSess(s, refs, hz, baseRefs);
  return s;
}

/** A2 (audit v6, R6.1) — la localisation de la douleur choisit la discipline de
 * remplacement : on retire la contrainte qui sollicite la zone, on ne la réduit pas.
 * Renvoie null quand AUCUNE discipline d'endurance n'épargne la zone → repos complet. */
function resolvePainDiscipline(mainDisc: string, painLocation: string | undefined): { disc: string | null; swapped: boolean } {
  const base = mainDisc === "br" ? "bk" : mainDisc;
  const contra = painLocation ? R6_PAIN_CONTRAINDICATION[painLocation] : undefined;
  if (!contra || !contra.forbid.includes(base)) return { disc: base, swapped: false };
  const alt = contra.prefer.find((d2) => !contra.forbid.includes(d2)) ?? null;
  return { disc: alt, swapped: true };
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
      const main = day.sessions.find((s) => s.d !== "rs")!;
      // A3 — jamais plus de minutes qu'avant : le plancher de 25min cède si la séance
      // d'origine était plus courte.
      const replacementMin = Math.min(Math.max(1, Math.round(originalMinutes)), Math.max(25, Math.round(originalMinutes * 0.5)));
      // A2/R6.1 — la douleur localisée retire la discipline qui sollicite la zone
      const pain = snapshot.painFlag ? resolvePainDiscipline(main.d, snapshot.painLocation) : { disc: main.d === "br" ? "bk" : main.d, swapped: false };
      if (pain.disc === null) {
        action = "rest";
        day.charge = "off";
        day.sessions = [{ d: "rs", name: "Repos complet (douleur)", det: "repos — 💡 douleur " + (snapshot.painLocation || "signalée") + " : aucune discipline d'endurance n'épargne cette zone aujourd'hui. Le repos EST la bonne séance.", steps: [] }];
        D("ADAPT-rouge-douleur", "Douleur " + (snapshot.painLocation || "signalée"), "repos complet", "Aucune discipline disponible n'épargne la zone douloureuse — on ne dégrade pas la séance, on l'annule (R6.1)");
      } else {
        action = "replace";
        const why = pain.swapped
          ? "douleur " + (snapshot.painLocation || "") + " signalée — l'appui sur la zone est retiré aujourd'hui : la séance passe en " + (pain.disc === "bk" ? "vélo" : pain.disc === "sw" ? "nage" : "course") + " souple (R6.1)."
          : drivers.join(" · ") + " — la séance de qualité est remplacée par de l'endurance : l'intensité un jour rouge coûte plus qu'elle ne rapporte.";
        day.sessions = [enduranceReplacement(pain.disc, replacementMin, refs, reasoned.hz, reasoned.baseRefs, why)];
        day.charge = "facile";
        D("ADAPT-rouge", "Readiness rouge", "qualité → endurance (" + replacementMin + "min)", why);
      }
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

  // A3 (audit v6) — l'invariant d'en-tête est ASSERTÉ, plus seulement documenté :
  // hors « keep », un ajustement ne produit jamais plus de minutes que la séance d'origine.
  const adjustedMinutes = dayMinutes(day);
  if (action !== "keep" && adjustedMinutes > originalMinutes + 0.01) {
    throw new Error("Invariant readiness violé : " + originalMinutes.toFixed(1) + " → " + adjustedMinutes.toFixed(1) + "min (" + action + ")");
  }
  return { date, action, verdict, originalMinutes, adjustedMinutes, decisions };
}
