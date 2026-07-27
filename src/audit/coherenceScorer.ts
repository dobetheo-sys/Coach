/**
 * coherenceScorer — audit « coach de charge » (Sprint 0).
 *
 * INDÉPENDANT DU GÉNÉRATEUR par construction : la charge est recalculée
 * bottom-up depuis les textes de séances (loadModel), jamais depuis les
 * variables internes du générateur. C'est la condition pour que l'audit
 * ne valide pas trivialement ses propres règles.
 *
 * Seuils indicatifs (note.md) :
 * - ratio prescrit/déclaré > 1.4 → sur-prescrit ; < 0.5 → sous-prescrit
 * - part de la séance longue > 45-55% de la semaine → alerte
 */
import type { V1Plan, V1Week } from "../harness/v1Harness.ts";
import { sessionLoad, type SessionLoad } from "../engine/loadModel.ts";

export const THRESHOLDS = {
  overPrescribed: 1.4,
  underPrescribed: 0.5,
  softOver: 1.2,
  softUnder: 0.7,
  longShareAlert: 0.55,
  longShareWatch: 0.45,
} as const;

export interface WeekAudit {
  num: number;
  phaseId: string;
  isRecup: boolean;
  declaredMin: number;
  prescribedMin: number;
  ratio: number;
  longestSessionMin: number;
  longShare: number;
  nominalSessions: number; // séances sans volume prescrit (comptées au nominal)
  fullMinutes: number; // minutes issues d'un parsing complet (couverture)
}

export interface PlanAudit {
  weeks: WeekAudit[];
  peak: WeekAudit; // semaine au volume déclaré max (hors récup)
  score: number; // provisoire — pondération à calibrer, voir ROADMAP-V2
  hardViolations: string[]; // bloquants indépendamment du score
  softIssues: string[];
  adjacentHardDays: number;
  recupHeavierCount: number;
  weeksOver: number; // semaines (hors récup/taper) au ratio > overPrescribed
  weeksUnder: number; // semaines (hors récup/taper) au ratio < underPrescribed
  taperRatio: number | null; // dernière semaine d'affûtage : prescrit/déclaré
  taperVsPeak: number | null; // prescrit affûtage / prescrit pic (doit être << 1)
  nominalSessionsTotal: number;
  coverage: number; // part des minutes prescrites issues d'un parsing fiable (full + rest)
  flags: string[];
}

function auditWeek(w: V1Week): WeekAudit {
  let prescribed = 0;
  let longest = 0;
  let nominal = 0;
  let fullMin = 0;
  const loads: SessionLoad[] = [];
  for (const day of w.days) {
    let dayMin = 0;
    for (const s of day.sessions) {
      const load = sessionLoad(s);
      loads.push(load);
      dayMin += load.minutes;
      if (load.confidence === "nominal") nominal++;
      // "rest" = minutes explicites d'un renfo greffé → parsing fiable aussi
      if (load.confidence === "full" || load.confidence === "rest") fullMin += load.minutes;
    }
    // La « séance longue » au sens de l'audit = le plus gros JOUR d'entraînement
    if (dayMin > longest) longest = dayMin;
    prescribed += dayMin;
  }
  const declaredMin = w.vol * 60;
  return {
    num: w.num,
    phaseId: w.phase.id,
    isRecup: w.isRecup,
    declaredMin,
    prescribedMin: Math.round(prescribed),
    ratio: declaredMin > 0 ? prescribed / declaredMin : 0,
    longestSessionMin: Math.round(longest),
    longShare: prescribed > 0 ? longest / prescribed : 0,
    nominalSessions: nominal,
    fullMinutes: fullMin,
  };
}

export function auditPlan(plan: V1Plan): PlanAudit {
  const weeks = plan.weeks.map(auditWeek);
  const hard: string[] = [];
  const soft: string[] = [];
  const flags: string[] = [];

  // ---- Contrainte dure : jamais deux jours durs adjacents ----
  const allDays = plan.weeks.flatMap((w) => w.days);
  let adjacentHardDays = 0;
  for (let i = 0; i < allDays.length - 1; i++) {
    if (allDays[i].charge === "dur" && allDays[i + 1].charge === "dur") adjacentHardDays++;
  }
  if (adjacentHardDays > 0) hard.push(adjacentHardDays + " paire(s) de jours durs adjacents");

  // ---- Contrainte dure : semaine de récup jamais plus chargée que la précédente ----
  let recupHeavier = 0;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i].isRecup && !weeks[i - 1].isRecup && weeks[i].prescribedMin > weeks[i - 1].prescribedMin) {
      recupHeavier++;
      flags.push("S" + weeks[i].num + " (récup) plus chargée que S" + weeks[i - 1].num);
    }
  }
  if (recupHeavier > 0) hard.push(recupHeavier + " semaine(s) de récup plus chargée(s) que la semaine précédente");

  // ---- Semaine du pic : ratio prescrit/déclaré ----
  const candidates = weeks.filter((w) => !w.isRecup);
  const peak = candidates.reduce((a, b) => (b.declaredMin > a.declaredMin ? b : a), candidates[0]);

  // ---- Toutes les semaines normales : combien sortent de la bande ? ----
  // (le pic seul sous-estime : en base, bike prescrit jusqu'à 2× le déclaré)
  const normal = weeks.filter((w) => !w.isRecup && w.phaseId !== "taper");
  const weeksOver = normal.filter((w) => w.ratio > THRESHOLDS.overPrescribed).length;
  const weeksUnder = normal.filter((w) => w.ratio < THRESHOLDS.underPrescribed).length;

  // ---- Affûtage : le déclaré chute, les séances suivent-elles ? ----
  // Défaut V1 connu : sess() ne gère pas la phase "taper" → séances pleine taille.
  const taperWeeks = weeks.filter((w) => w.phaseId === "taper");
  const lastTaper = taperWeeks.length > 0 ? taperWeeks[taperWeeks.length - 1] : null;
  const taperRatio = lastTaper ? lastTaper.ratio : null;
  const taperVsPeak = lastTaper && peak.prescribedMin > 0 ? lastTaper.prescribedMin / peak.prescribedMin : null;
  if (taperVsPeak !== null && taperVsPeak > 0.85) {
    hard.push(
      "affûtage inopérant : dernière semaine prescrite à " +
        Math.round(taperVsPeak * 100) +
        "% du pic (l'athlète arrive fatigué le jour J)"
    );
  }

  let score = 100;
  if (peak.ratio > THRESHOLDS.overPrescribed) {
    score -= 25;
    soft.push("pic S" + peak.num + " SUR-prescrit : ratio " + peak.ratio.toFixed(2));
  } else if (peak.ratio < THRESHOLDS.underPrescribed) {
    score -= 25;
    soft.push("pic S" + peak.num + " SOUS-prescrit : ratio " + peak.ratio.toFixed(2));
  } else if (peak.ratio > THRESHOLDS.softOver || peak.ratio < THRESHOLDS.softUnder) {
    score -= 10;
    soft.push("pic S" + peak.num + " ratio limite : " + peak.ratio.toFixed(2));
  }

  const outOfBand = normal.length > 0 ? (weeksOver + weeksUnder) / normal.length : 0;
  if (outOfBand > 0) {
    score -= Math.min(25, Math.round(outOfBand * 50));
    soft.push(weeksOver + weeksUnder + "/" + normal.length + " semaines normales hors bande [0.5, 1.4]");
  }

  if (peak.longShare > THRESHOLDS.longShareAlert) {
    score -= 15;
    soft.push("séance longue = " + Math.round(peak.longShare * 100) + "% de la semaine du pic");
  } else if (peak.longShare > THRESHOLDS.longShareWatch) {
    score -= 5;
  }

  score -= Math.min(20, adjacentHardDays * 10);
  score -= Math.min(10, recupHeavier * 5);
  if (taperVsPeak !== null && taperVsPeak > 0.85) score -= 20;

  const nominalTotal = weeks.reduce((n, w) => n + w.nominalSessions, 0);
  const totalPrescribed = weeks.reduce((n, w) => n + w.prescribedMin, 0);
  const totalFull = weeks.reduce((n, w) => n + w.fullMinutes, 0);

  return {
    weeks,
    peak,
    score: Math.max(0, score),
    hardViolations: hard,
    softIssues: soft,
    adjacentHardDays,
    recupHeavierCount: recupHeavier,
    weeksOver,
    weeksUnder,
    taperRatio,
    taperVsPeak,
    nominalSessionsTotal: nominalTotal,
    coverage: totalPrescribed > 0 ? totalFull / totalPrescribed : 0,
    flags,
  };
}
