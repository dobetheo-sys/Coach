/**
 * Pont UI ↔ moteur V2 — exposé au produit HTML sous `globalThis.EBV2` par le bundle
 * (`npm run build:app`). L'UI n'appelle QUE ces trois fonctions ; aucune logique métier
 * dans les composants (manifeste, §9 Architecture).
 */
import type { AthleteProfile, V1Plan, V1Step } from "../engine/types.ts";
import { intensitySplit } from "../engine/loadModel.ts";
import { parsePaceSec, HISTORY_CAPS, UTIL, MARGIN, MIN_WEEKS, testDansBornes, PHYSIO_BOUNDS } from "../engine/constraintMatrix.ts";
import { trailObjective, TRAIL_HISTORY_CAPS, TRAIL_UTIL } from "../engine/trailModel.ts";
import { swimrunObjective } from "../sports/swimrun/objective.ts";
import { swimrunPrereqBlock } from "../sports/swimrun/index.ts";
import { generateAudited } from "../generator/repairLoop.ts";
import { knownSports, sportModule } from "../sports/registry.ts";
import { generatePlan } from "../generator/planGenerator.ts";
import { adjustDay, type DayAdjustment } from "../readiness/dailyAdjuster.ts";
import {
  predictRace, courseProfileOf, legProfileOf, type Prediction,
  SWIM_RACE, TRI_SWIM, TRI_BIKE, TRI_BIKE_KM, TRI_RUN, TRI_TRANSITION, bikeIFShift, riegelSecWith, RUN_KM,
} from "../engine/predictor.ts";
import { bikeTimeEstimate, assumedSetup, RELIEF_PROFILE } from "../engine/cyclingSpeed.ts";
import { DUA_RUN1, DUA_BIKE, DUA_RUN2, DUA_BIKE_POWER, DUA_BIKE_PREFATIGUE, DUA_TRANSITION } from "../sports/duathlon/tables.ts";
import { adherenceWindow, taperIsConform, margeOf } from "../engine/projection.ts";
import { onSessionIngested } from "../coach/proactiveCoach.ts";
import { InAppSink } from "../coach/notificationSink.ts";
import type { IngestedSession } from "../coach/deviationDetector.ts";
import { parseActivityText } from "../readiness/gpxTcxParser.ts";
import { assessReadiness, validateSnapshot, type CompletedSession, type ReadinessSnapshot } from "../readiness/readinessSource.ts";
import { importFitBytes, FIT_DERIVED_TESTS, ftpFromBest20 } from "../readiness/fitParser.ts";
import { MAX_IMPORT_BYTES, assertImportSize, EBImportTooLarge } from "../readiness/importLimits.ts";
import { hrvBaseline, classerHrv, hrvValide, type HrvMesure } from "../readiness/hrvBaseline.ts";
import { measuredFromSessions, measuredWeeklyHours, arbitrateVolRecent } from "../engine/measured.ts";
import { validateAnswers, assertPlanIsAPlan, EBInputError, ANSWER_SCHEMA, FORMATS_BY_SPORT } from "../engine/answerSchema.ts";
import { planTroncature, semainesRequises, PLANCHER_ABSOLU_SEM, type TruncatePlan } from "../engine/truncatedPrep.ts";
import { nutritionForSession } from "../nutrition/nutritionCalculator.ts";
import { dailyEnergy, energyRefusalNotice, type DailyEnergyEstimate } from "../nutrition/energyEstimator.ts";
import { DISCIPLINE_REGISTRY } from "../engine/disciplineRegistry.ts";
import { assessFeasibility, assessFeasibilityMulti, type FeasibilityLeg } from "../engine/feasibility.ts";
import { weekDistances } from "../engine/weekDistances.ts";
import { EDU_LIBRARY } from "../engine/eduLibrary.ts";

interface AppAnswers extends Record<string, unknown> {
  format?: string;
}

/** R21 — exportée : la spec du coach proactif construit ses profils comme le pont, pas autrement. */
export function toProfile(sport: string, answers: AppAnswers): AthleteProfile {
  return { ...(answers as object), sport } as AthleteProfile;
}

export interface V2PlanMeta {
  decisions: { id: string; what: string; val: string | number; why: string }[];
  warnings: string[];
  repairs: string[];
  score: number;
  hardViolations: string[];
  intensity: { easyPct: number; modPct: number; hardPct: number; weekly: { num: number; e: number; m: number; h: number }[] };
}

/** Les ✓ de l'UI (S.answers.done = {"sem|jour|idx": true}) → séances réellement effectuées.
 *  Ferme la boucle prévu/réel : l'ajusteur recalcule la fatigue depuis ce qui a VRAIMENT
 *  été fait (même logique qu'un import Strava — les minutes viennent du plan coché). */
export function completedFromDone(plan: V1Plan, answers: AppAnswers, beforeDate: string): CompletedSession[] {
  const done = (answers.done || {}) as Record<string, boolean>;
  const out: CompletedSession[] = [];
  if (!Object.keys(done).length) return out;
  for (const w of plan.weeks)
    for (const d of w.days) {
      const dd = (d as { date?: string }).date;
      if (!dd || dd >= beforeDate) continue;
      d.sessions.forEach((s, si) => {
        if (s.d === "rs" || !done[w.num + "|" + d.jour + "|" + si]) return;
        out.push({ date: dd, d: s.d, minutes: Math.round(s.min || 0) });
      });
    }
  return out;
}

/**
 * R22 — Prépare la troncature : rend les réponses AVEC une `plan_start` virtuelle, ou
 * `null` si le contournement n'a pas lieu d'être (drapeau absent, format qui ne le
 * permet pas, date lointaine). Ne décide rien : la règle vit dans `truncatedPrep.ts`.
 */
function prepareTroncature(sport: string, a: AppAnswers): { answers: AppAnswers; plan: TruncatePlan } | null {
  if (a.truncate_prep !== true || !a.race_date) return null;
  const today = localTodayISO();
  const anchor = a.plan_start && String(a.plan_start) < today ? String(a.plan_start) : today;
  const reste = Math.floor(
    (new Date(String(a.race_date) + "T00:00:00Z").getTime() - new Date(anchor + "T00:00:00Z").getTime()) / (7 * 864e5)
  ) + 1;
  const t = planTroncature(semainesRequises(sport, toProfile(sport, a)), reste);
  if (!t || !t.possible || t.aRetirer <= 0) return null;
  // La date de départ virtuelle. Le moteur compte sa travée INCLUSIVEMENT —
  // `span = semaines(ancre → lundi de course) + 1` (reasoningEngine) — donc pour obtenir
  // `need` semaines il faut reculer de `need − 1`, pas de `need`. Ma première écriture
  // reculait de `need` et livrait 15 semaines au lieu de 14 : la spec l'a attrapé.
  const lundiCourse = new Date(String(a.race_date) + "T00:00:00Z");
  lundiCourse.setUTCDate(lundiCourse.getUTCDate() - ((lundiCourse.getUTCDay() + 6) % 7));
  const virtuel = new Date(lundiCourse.getTime() - (t.need - 1) * 7 * 864e5).toISOString().slice(0, 10);
  return { answers: { ...a, plan_start: virtuel }, plan: t };
}

/**
 * R22 — Applique la troncature EN SORTIE : retire les `aRetirer` premières semaines,
 * renumérote de 1 à N, et laisse une trace explicite dans `plan.meta`.
 *
 * Les DATES ne sont pas retouchées : elles sont déjà les vraies dates calendaires, et
 * les semaines retirées sont précisément celles qui tombaient dans le passé (c'est tout
 * l'intérêt de la date virtuelle). Les réécrire les décalerait d'une semaine — le défaut
 * que R7 a corrigé.
 */
function applyTroncature(plan: V1Plan, t: TruncatePlan, res: { warnings: string[]; decisions: { id: string; what: string; val: string | number; why: string }[] }): void {
  const avant = plan.weeks.length;
  if (t.aRetirer <= 0 || t.aRetirer >= avant) return;
  plan.weeks = plan.weeks.slice(t.aRetirer);
  plan.weeks.forEach((w, i) => { w.num = i + 1; });
  (plan as V1Plan & { meta?: Record<string, unknown> }).meta = {
    ...((plan as V1Plan & { meta?: Record<string, unknown> }).meta || {}),
    truncated: true,
    original_weeks: avant,
    truncated_weeks: t.aRetirer,
    delivered_weeks: plan.weeks.length,
    floor_weeks: t.plancher,
  };
  res.decisions.push({
    id: "R22-troncature",
    what: "Préparation raccourcie",
    val: avant + " → " + plan.weeks.length + " semaines",
    why: "Ta course est proche : les " + t.aRetirer + " premières semaines de mise en route ont été "
      + "retirées plutôt que de comprimer la préparation entière. La progression est donc plus dense "
      + "dès la première semaine, et elle suppose une base déjà acquise.",
  });
}

/** Génère le plan via le moteur V2 (raisonne → génère → audite → répare) — forme V1Plan. */
export function buildPlanV2(sport: string, answers: AppAnswers): V1Plan & { _v2?: V2PlanMeta } {
  // R11 — LE CONTRAT D'ENTRÉE, avant toute génération. Trois sorties possibles et jamais une
  // quatrième : refus motivé (`EBInputError`), avertissement porté par le plan, ou défaut
  // journalisé. Rendre un plan sans qu'aucun canal ne se soit exprimé était le défaut : le
  // moteur produisait un Ironman à 30 min de pic sur une saisie illisible, sans un mot.
  // Le SPORT est la première entrée à valider : un sport absent du bundle (R12 §0) doit donner
  // un refus lisible, pas une erreur de symbole manquant au fond du moteur.
  if (!knownSports().includes(sport)) {
    throw new EBInputError("sport", sport, knownSports().join(" / "),
      "Le sport « " + sport + " » n'est pas disponible dans cette version. Sports proposés : " + knownSports().join(", ") + ".");
  }
  const vr = validateAnswers(sport, answers as Record<string, unknown>, localTodayISO());
  // ── R22 — PRÉPARATION TRONQUÉE : date de départ VIRTUELLE en entrée ──
  //
  // Le brief est explicite et c'est la bonne contrainte : on ne touche PAS à la logique de
  // périodisation. On ment au générateur sur UNE seule chose — la date à laquelle la prépa
  // a commencé — puis on coupe le début de ce qu'il a produit. Entre les deux, il fabrique
  // exactement le plan qu'il aurait fait pour quelqu'un d'à l'heure, et l'auditeur le note
  // sur ses règles habituelles.
  //
  // La date virtuelle est `course − need`, pas `course − 16 semaines` : `need` vaut 6 pour
  // un 5 km et 36 pour un Ironman (voir `truncatedPrep.ts`).
  const troncature = prepareTroncature(sport, vr.answers as unknown as AppAnswers);
  const res = generateAudited(toProfile(sport, (troncature ? troncature.answers : vr.answers) as unknown as AppAnswers));
  const plan = res.plan as V1Plan & { _v2?: V2PlanMeta };
  if (troncature) applyTroncature(plan, troncature.plan, res);
  // R11.6 — un plan vide n'est pas un plan : le contrôle ne peut se faire qu'ICI, une fois
  // qu'on sait ce qui a réellement été produit.
  assertPlanIsAPlan(sport, vr.answers.format as string | undefined, plan.weeks as never);
  // Les contradictions et les défauts appliqués REJOIGNENT les canaux existants : ils
  // s'affichent là où l'athlète regarde déjà (« Pourquoi ce plan », décisions du moteur).
  // Les avertissements de SÉCURITÉ du moteur (barrière horaire, prérequis, médical) restent en
  // tête : ceux du contrat d'entrée sont des remarques de saisie, ils passent après.
  if (vr.warnings.length) res.warnings.push(...vr.warnings);
  if (vr.defaults.length) res.decisions.push(...vr.defaults);
  // Répartition des intensités par semaine (dashboard « manifeste ~80/20 »)
  const refs = { cssSecPer100m: 130, thrPaceSecPerKm: 330 };
  let cE = 0, cM = 0, cH = 0;
  const weekly = plan.weeks.map((w) => {
    let e = 0, m = 0, h = 0;
    for (const d of w.days)
      for (const s of d.sessions) {
        const sp = intensitySplit(s, refs);
        e += sp.easyMin; m += sp.modMin; h += sp.hardMin;
      }
    if (!w.isRecup && w.phase.id !== "taper") { cE += e; cM += m; cH += h; }
    return { num: w.num, e: Math.round(e), m: Math.round(m), h: Math.round(h) };
  });
  const tot = Math.max(1, cE + cM + cH);
  plan._v2 = {
    decisions: res.decisions,
    warnings: res.warnings,
    repairs: res.repairs,
    score: res.audit.score,
    hardViolations: res.audit.hardViolations,
    intensity: { easyPct: Math.round((cE / tot) * 100), modPct: Math.round((cM / tot) * 100), hardPct: Math.round((cH / tot) * 100), weekly },
  };
  return plan;
}

export interface TodayAdjustment {
  adjustment: DayAdjustment;
  sessions: { name: string; det: string; d: string; steps?: V1Step[] }[];
  jour: string | null;
}

/** Adapte la journée `snapshot.date` à l'état de forme — « recalcul du matin ». */
export function adjustTodayV2(sport: string, answers: AppAnswers, snapshot: ReadinessSnapshot): TodayAdjustment {
  // Validation de schéma (audit v6) : une clé inconnue = câblage cassé, pas un détail —
  // le signal serait ignoré sans le moindre bruit. On le dit, on ne bloque pas l'athlète.
  const unknown = validateSnapshot(snapshot as unknown as Record<string, unknown>);
  if (unknown.length) console.warn("Photo du matin : clé(s) non reconnue(s) et donc IGNORÉE(S) — " + unknown.join(", "));
  const { plan, reasoned } = generatePlan(toProfile(sport, answers));
  // R10 — les échanges de jours ⇄ de l'utilisateur (answers.daySwaps) s'appliquent AUSSI
  // ici : sans ça, la « séance du jour » montrait la séance d'AVANT échange pendant que
  // la grille montrait celle d'après (désalignement jour réel / jour du plan).
  const swaps = (answers.daySwaps as [number, string, string][] | undefined) || [];
  for (const [wn, jA, jB] of swaps) {
    const w = plan.weeks.find((x) => x.num === wn);
    if (!w) continue;
    const da = w.days.find((d) => d.jour === jA), db = w.days.find((d) => d.jour === jB);
    if (!da || !db) continue;
    const t = da.sessions; da.sessions = db.sessions; db.sessions = t;
  }
  // R4.5/R4.7 — le drapeau douleur et le RPE de la dernière séance validée entrent
  // AUTOMATIQUEMENT dans la photo du jour (aucun appelant ne peut les oublier) :
  // douleur active → rouge forcé ; RPE ≥8 hier → signal de fatigue annoncé.
  // H-1 — LA VFC EST CLASSÉE ICI, un seul point, comme le drapeau douleur et le RPE.
  //
  // L'UI collecte la VALEUR et tient le journal ; le MODÈLE décide. Classer côté interface
  // demanderait d'y recopier la fenêtre, l'écart-type et le seuil — trois constantes de plus
  // à faire diverger (R11.1). Et aucun appelant ne peut oublier de le faire.
  if (hrvValide(snapshot.hrvValue)) {
    const b = hrvBaseline(answers.hrvLog as HrvMesure[] | undefined, snapshot.date);
    const v = classerHrv(snapshot.hrvValue, b);
    snapshot = v
      ? { ...snapshot, hrvStatus: v.status, hrvSource: "mesure", hrvBaselineMs: b.moyenneMs ?? undefined }
      // Base trop courte : la valeur est notée, elle ne pilote rien, et la déclaration
      // reprend la main EN TANT QUE déclaration. On ne fabrique pas une mesure.
      : { ...snapshot, hrvSource: "declare" };
  } else if (snapshot.hrvStatus != null) {
    snapshot = { ...snapshot, hrvSource: "declare" };
  }
  const pf = answers.painFlag as { active?: boolean; location?: string } | undefined;
  if (snapshot.painFlag == null && pf && pf.active) snapshot = { ...snapshot, painFlag: true, painLocation: pf.location };
  if (snapshot.lastRpe == null && answers.completions) {
    const comps = Object.values(answers.completions as Record<string, { date?: string; rpe?: number }>)
      .filter((c) => c && c.date && c.date < snapshot.date && c.rpe != null)
      .sort((x, y) => String(y.date).localeCompare(String(x.date)));
    if (comps.length) snapshot = { ...snapshot, lastRpe: comps[0].rpe };
  }
  // Boucle prévu/réel : les séances cochées dans l'UI nourrissent le calcul de fatigue,
  // complétées par les séances importées d'un fichier FIT (answers.fitSessions) —
  // même contrat CompletedSession ; dédoublonnage date+sport (une séance cochée ET
  // importée ne compte qu'une fois, on garde la version cochée du plan).
  if (!snapshot.completed) {
    const completed = completedFromDone(plan, answers, snapshot.date);
    const fit = (answers.fitSessions || []) as CompletedSession[];
    for (const f of fit) {
      if (!f || !f.date || f.date >= snapshot.date || !f.minutes) continue;
      if (!completed.some((c) => c.date === f.date && c.d === f.d)) completed.push(f);
    }
    if (completed.length) snapshot = { ...snapshot, completed };
  }
  const adjustment = adjustDay(reasoned, plan, snapshot.date, snapshot);
  let sessions: TodayAdjustment["sessions"] = [];
  let jour: string | null = null;
  for (const w of plan.weeks)
    for (const d of w.days)
      if ((d as { date?: string }).date === snapshot.date) {
        sessions = d.sessions.map((s) => ({ name: s.name, det: s.det || "", d: s.d, steps: s.steps }));
        jour = d.jour;
      }
  return { adjustment, sessions, jour };
}

/** Régularité & avancement — gamification au service de la priorité n°3 du manifeste.
 *  Streak = semaines TERMINÉES consécutives avec ≥80% des séances faites (une séance
 *  loupée est pardonnée — la régularité n'est pas la perfection). Avancement = part de
 *  la CHARGE du plan accomplie (minutes cochées / minutes totales), pas un compte de séances. */
export interface ProgressReport {
  totalMin: number;
  doneMin: number;
  pctLoad: number;
  weekNow: number;
  totalWeeks: number;
  streakWeeks: number;
  weekly: { num: number; done: number; total: number; ok: boolean; complete: boolean; minDone: number; minTotal: number }[];
}
export function progressV2(plan: V1Plan, answers: AppAnswers, todayISO: string): ProgressReport {
  const done = (answers.done || {}) as Record<string, boolean>;
  let totalMin = 0, doneMin = 0;
  const weekly = plan.weeks.map((w) => {
    let t = 0, dn = 0, complete = true, wDone = 0, wTotal = 0;
    for (const d of w.days) {
      const dd = (d as { date?: string }).date || "";
      if (!dd || dd >= todayISO) complete = false;
      d.sessions.forEach((s, si) => {
        if (s.d === "rs") return;
        t++;
        totalMin += s.min || 0;
        wTotal += s.min || 0;
        if (done[w.num + "|" + d.jour + "|" + si]) {
          dn++;
          doneMin += s.min || 0;
          wDone += s.min || 0;
        }
      });
    }
    return { num: w.num, done: dn, total: t, ok: t > 0 && dn / t >= 0.8, complete, minDone: Math.round(wDone), minTotal: Math.round(wTotal) };
  });
  const completeWeeks = weekly.filter((w) => w.complete);
  let streakWeeks = 0;
  for (let i = completeWeeks.length - 1; i >= 0; i--) {
    if (completeWeeks[i].ok) streakWeeks++;
    else break;
  }
  return {
    totalMin: Math.round(totalMin),
    doneMin: Math.round(doneMin),
    pctLoad: totalMin > 0 ? Math.round((doneMin / totalMin) * 100) : 0,
    weekNow: Math.min(plan.totalWeeks, completeWeeks.length + 1),
    totalWeeks: plan.totalWeeks,
    streakWeeks,
    weekly,
  };
}

/** Badges — célébrations au service de la régularité (jamais de culpabilisation :
 *  un badge se gagne, il ne se perd pas ; aucun badge « raté » n'est affiché). */
export interface Badge { id: string; icon: string; label: string; why: string }
export function badgesV2(plan: V1Plan, answers: AppAnswers, todayISO: string): Badge[] {
  const pg = progressV2(plan, answers, todayISO);
  const out: Badge[] = [];
  const cw = pg.weekly.filter((w) => w.complete);
  if (cw.some((w) => w.ok)) out.push({ id: "premiere", icon: "🏁", label: "Première semaine régulière", why: "≥80% des séances faites sur une semaine complète" });
  if (pg.streakWeeks >= 3) out.push({ id: "streak3", icon: "🔥", label: pg.streakWeeks + " semaines d'affilée", why: "La régularité est ta priorité n°3 — c'est elle qui fait progresser" });
  if (pg.streakWeeks >= 6) out.push({ id: "streak6", icon: "🏆", label: "6+ semaines : métronome", why: "La constance sur la durée, la marque des athlètes qui arrivent au départ en forme" });
  const base = plan.phases?.find((p) => p.id === "base");
  if (base && base.weeks > 0 && cw.filter((w) => w.num <= base.end).length >= base.weeks && cw.filter((w) => w.num <= base.end).every((w) => w.ok))
    out.push({ id: "bloc-base", icon: "🧱", label: "Bloc de base terminé", why: "Les fondations aérobies sont posées — tout le reste s'appuie dessus" });
  if (pg.pctLoad >= 50) out.push({ id: "mi-parcours", icon: "⛰", label: "Mi-parcours de charge", why: "Plus de la moitié de la charge du plan est derrière toi" });
  if (cw.length >= 2) {
    const last = cw[cw.length - 1];
    if (last.minDone > 0 && last.minDone > Math.max(...cw.slice(0, -1).map((w) => w.minDone))) out.push({ id: "record", icon: "📈", label: "Record de volume", why: "Ta plus grosse semaine réellement faite — construit, pas subie" });
  }
  for (const [i, w] of plan.weeks.entries()) {
    if (w.isRecup && pg.weekly[i]?.complete && pg.weekly[i]?.ok) {
      out.push({ id: "recup", icon: "😴", label: "Récup respectée", why: "La récupération EST un entraînement — la faire en entier demande plus de discipline que forcer" });
      break;
    }
  }
  return out;
}

/** R4.2 — Streak d'adhérence par JOUR (spec rétention). L'unité est le jour global
 *  complété : TOUTES les séances planifiées du jour validées — Y COMPRIS le repos
 *  (« récupération respectée ✓ », qui compte STRICTEMENT autant qu'un jour de séance).
 *  GEL (jamais de perte) : douleur signalée ou maladie déclarée — ces jours ne comptent
 *  ni ne cassent. Déborder du plan ne rapporte RIEN (seules les séances planifiées
 *  comptent — il n'existe aucun chemin de gratification pour du volume hors plan). */
export interface Adherence {
  days: number;
  todayComplete: boolean;
  frozenToday: boolean;
}
export function adherenceV2(plan: V1Plan, answers: AppAnswers, todayISO: string): Adherence {
  const done = (answers.done || {}) as Record<string, boolean>;
  const sick = (answers.sickDates || []) as string[];
  const pf = answers.painFlag as { active?: boolean; since?: string } | undefined;
  const frozen = (date: string) => sick.includes(date) || !!(pf && pf.active && pf.since && date >= pf.since);
  const days: { date: string; complete: boolean }[] = [];
  for (const w of plan.weeks)
    for (const d of w.days) {
      const dd = (d as { date?: string }).date;
      if (!dd || dd > todayISO) continue;
      const complete = d.sessions.every((s, si) => done[w.num + "|" + d.jour + "|" + si]);
      days.push({ date: dd, complete });
    }
  days.sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (d.complete) streak++;
    else if (frozen(d.date) || d.date === todayISO) continue; // gel, ou journée pas finie
    else break;
  }
  const today = days.find((d) => d.date === todayISO);
  return { days: streak, todayComplete: !!(today && today.complete), frozenToday: frozen(todayISO) };
}

/** Avatar évolutif — gamification (onglet 🎮 Suivi). MÊME philosophie que les badges :
 *  l'XP est CUMULATIF et ne redescend jamais (une semaine ratée n'efface rien), calculé
 *  depuis les métriques déjà existantes (progressV2/badgesV2) — aucune nouvelle collecte,
 *  aucun jugement de valeur ajouté au-delà de ce que le manifeste autorise (priorité n°3 :
 *  régularité, jamais performance pure). Ne redescend jamais — mêmes garde-fous. */
export interface AvatarState {
  level: number;
  name: string;
  icon: string;
  xp: number;
  xpInLevel: number;
  xpToNext: number;
  progressPct: number;
  nextName: string | null;
  nextIcon: string | null;
  nextUnlock: string | null;
  levels: { level: number; name: string; icon: string; xp: number; unlock: string }[];
}
// R9 — 16 niveaux (mix « l'athlète s'équipe » + « le décor évolue », choix utilisateur).
// Seuils NON linéaires : les premiers paliers tombent en 1-3 séances (engouement), les
// derniers se méritent sur des mois. Chaque niveau change UN paramètre visuel (`unlock`,
// rendu par avatar.js) — équipement de l'athlète en alternance avec le décor.
const AVATAR_LEVELS: { name: string; icon: string; xp: number; unlock: string }[] = [
  { name: "Départ", icon: "🥚", xp: 0, unlock: "la silhouette, prête à éclore" },
  { name: "Premières foulées", icon: "👟", xp: 10, unlock: "chaussures à ta couleur" },
  { name: "Sentier du parc", icon: "🌳", xp: 25, unlock: "décor : le parc" },
  { name: "Bandana", icon: "🎽", xp: 50, unlock: "bandana noué" },
  { name: "La piste", icon: "🛤", xp: 90, unlock: "décor : la piste" },
  { name: "Première aura", icon: "✨", xp: 150, unlock: "aura d'entraînement" },
  { name: "Lunettes de sport", icon: "🕶", xp: 230, unlock: "lunettes de sport" },
  { name: "Le stade", icon: "🏟", xp: 340, unlock: "décor : le stade et ses gradins" },
  { name: "Maillot de course", icon: "👕", xp: 480, unlock: "maillot bicolore" },
  { name: "Dossard", icon: "🔖", xp: 660, unlock: "dossard à ton niveau" },
  { name: "Sous les projecteurs", icon: "🌃", xp: 900, unlock: "décor : la nocturne aux projecteurs" },
  { name: "Pleine vitesse", icon: "💨", xp: 1200, unlock: "aura pleine + traînée de vitesse" },
  { name: "Étoiles", icon: "⭐", xp: 1600, unlock: "étoiles autour de toi" },
  { name: "Médaille", icon: "🥇", xp: 2100, unlock: "médaille au cou" },
  { name: "Arche d'arrivée", icon: "🏁", xp: 2700, unlock: "décor : l'arche d'arrivée" },
  { name: "Légende", icon: "🏆", xp: 3500, unlock: "couronne de laurier + piédestal doré" },
];
export function avatarV2(plan: V1Plan, answers: AppAnswers, todayISO: string): AvatarState {
  const pg = progressV2(plan, answers, todayISO);
  const badges = badgesV2(plan, answers, todayISO);
  const regularWeeks = pg.weekly.filter((w) => w.complete && w.ok).length;
  // R9 — XP 100% régularité, avec récompense IMMÉDIATE : +10 par jour validé (repos
  // respecté compris — le repos est une séance), +80 par badge, +120 par semaine
  // régulière. Jamais un chiffre de performance brute (chrono/FTP), jamais de volume
  // hors plan (seules les cases ✓ du plan comptent).
  const doneRec = (answers.done as Record<string, boolean>) || {};
  let doneDays = 0; // seules les coches correspondant à une VRAIE séance du plan comptent
  for (const w of plan.weeks) for (const d of w.days) d.sessions.forEach((s, si) => { if (doneRec[w.num + "|" + d.jour + "|" + si]) doneDays++; });
  const xp = doneDays * 10 + badges.length * 80 + regularWeeks * 120;
  let idx = 0;
  for (let i = 0; i < AVATAR_LEVELS.length; i++) if (xp >= AVATAR_LEVELS[i].xp) idx = i;
  const cur = AVATAR_LEVELS[idx], next = AVATAR_LEVELS[idx + 1];
  const xpInLevel = xp - cur.xp;
  const xpToNext = next ? next.xp - cur.xp : 0;
  return {
    level: idx + 1, name: cur.name, icon: cur.icon, xp, xpInLevel, xpToNext,
    progressPct: next ? Math.max(0, Math.min(100, Math.round((xpInLevel / xpToNext) * 100))) : 100,
    // Teaser du niveau suivant (UI Profil) : ce que le prochain palier DÉBLOQUE.
    nextName: next ? next.name : null, nextIcon: next ? next.icon : null,
    nextUnlock: next ? next.unlock : null,
    levels: AVATAR_LEVELS.map((l, i) => ({ level: i + 1, name: l.name, icon: l.icon, xp: l.xp, unlock: l.unlock })),
  };
}

/**
 * R25 étape 2 — L'AVATAR COMPOSITE : l'XP PAR DISCIPLINE (spec validée 07-08/08/2026).
 *
 * Trois jauges indépendantes (natation / vélo / course), 0-30 chacune. L'XP n'est PAS
 * stocké : comme `avatarV2`, il est RECALCULÉ depuis les coches ✓ — c'est ce qui rend la
 * « migration » exacte plutôt que forfaitaire (décision fondateur n°1) : chaque séance du
 * plan porte sa discipline (`s.d`), on recompte l'historique existant par discipline. Un
 * triathlète qui a validé trente nages ne redémarre pas nageur niveau 0, et rien n'est
 * dumpé arbitrairement dans `course`.
 *
 * Décisions fondateur (08/08/2026) :
 *   2. le REPOS validé ne donne PAS d'XP (il compte pour la streak, pas pour les jauges) ;
 *   4. badges (+80) et semaines régulières (+120) créditent la discipline identifiable,
 *      sinon les trois à parts égales — or ni les badges actuels ni une semaine régulière
 *      ne portent de discipline : ils partent donc en tiers (Math.floor, déterministe).
 *
 * NIVEAU 0 EXISTE (l'état « silhouette nue » des maquettes) : le niveau n (1-30) se gagne.
 * Conséquence assumée : les seuils sont ceux du brief DÉCALÉS d'un cran — l'ancien
 * « niveau 1 Départ » (0 XP, rien de visible) devient le niveau 0, et l'ancien « niveau 2 »
 * (10 XP, premier équipement) devient le niveau 1. À XP ÉGAL, l'athlète voit donc la même
 * chose qu'avant : la non-régression du critère 11 du brief se lit en XP, pas en numéro de
 * niveau. Le 30ᵉ seuil (120 000) prolonge la suite du brief (×1,25) — comme les seuils
 * 17-29, il est une EXTRAPOLATION NON CALIBRÉE sur l'économie XP réelle, à recalibrer
 * produit (§4 du brief, inchangé).
 */
export type AvatarDiscipline = "natation" | "velo" | "course";
export interface AvatarDiscState {
  xp: number; level: number; xpInLevel: number; xpToNext: number; progressPct: number;
}
export interface AvatarTriState {
  natation: AvatarDiscState; velo: AvatarDiscState; course: AvatarDiscState;
  /** La discipline meneuse = max des trois (partagés : lumière au sol, étoiles, médaille). */
  meneuse: AvatarDiscipline;
  /** Légende : les TROIS à 30 — jamais avant (critères 7-8 du brief). */
  legende: boolean;
}
// Seuils des niveaux 1..30 (niveau 0 = 0 XP, rien à gagner). 1-15 = les seuils existants
// décalés d'un cran ; 16-30 = l'extrapolation du brief + un 30ᵉ prolongé (NON calibrés).
const AVATAR_TRI_XP: number[] = [
  10, 25, 50, 90, 150, 230, 340, 480, 660, 900, 1200, 1600, 2100, 2700, 3500,
  4500, 5800, 7400, 9400, 12000, 15200, 19300, 24500, 31000, 39000, 49000, 61500, 77000, 96000, 120000,
];
/** Niveau ← XP, fonction PURE (testée isolément par demo:avatartri). */
export function avatarTriLevel(xp: number): number {
  let n = 0;
  for (const seuil of AVATAR_TRI_XP) if (xp >= seuil) n++;
  return n; // 0..30
}
/**
 * Crédits d'XP d'une séance validée — LA source unique du mapping discipline.
 * `[]` = aucun (décision n°2 : le repos). Le BRICK (`br`) crédite les deux disciplines
 * qu'il enchaîne, +5/+5 — même précédent que les niveaux par discipline du Profil, qui le
 * comptent pour les deux depuis R5, et la somme reste 10 : l'invariant
 * « Σ XP directs = (séances − repos) × 10 » tient.
 */
export function avatarTriCreditsOf(d: string | undefined): [AvatarDiscipline, number][] {
  if (!d || d === "rs") return [];
  if (d === "sw") return [["natation", 10]];
  if (d === "bk") return [["velo", 10]];
  if (d === "rn") return [["course", 10]];
  if (d === "br") return [["velo", 5], ["course", 5]];
  // Repli pour l'inclassable (renfo…) — décision n°1 : `course` par défaut, jamais perdu.
  return [["course", 10]];
}
/** XP → état complet (niveau, XP dans le niveau, XP jusqu'au prochain) — la SEULE dérivation
 *  du barème, utilisée aussi bien pour un plan que pour un total agrégé (`avatarTriMulti`). */
function avatarTriFromXp(xp: Record<AvatarDiscipline, number>): AvatarTriState {
  const etat = (total: number): AvatarDiscState => {
    const level = avatarTriLevel(total);
    const cur = level > 0 ? AVATAR_TRI_XP[level - 1] : 0;
    const next = level < 30 ? AVATAR_TRI_XP[level] : null;
    const xpInLevel = total - cur;
    const xpToNext = next !== null ? next - cur : 0;
    return {
      xp: total, level, xpInLevel, xpToNext,
      progressPct: next !== null ? Math.max(0, Math.min(100, Math.round((xpInLevel / xpToNext) * 100))) : 100,
    };
  };
  const natation = etat(xp.natation), velo = etat(xp.velo), course = etat(xp.course);
  const meneuse: AvatarDiscipline = velo.xp >= natation.xp && velo.xp >= course.xp ? "velo"
    : natation.xp >= course.xp ? "natation" : "course";
  return { natation, velo, course, meneuse, legende: natation.level >= 30 && velo.level >= 30 && course.level >= 30 };
}
export function avatarTriV2(plan: V1Plan, answers: AppAnswers, todayISO: string): AvatarTriState {
  const doneRec = (answers.done as Record<string, boolean>) || {};
  const xp: Record<AvatarDiscipline, number> = { natation: 0, velo: 0, course: 0 };
  for (const w of plan.weeks) for (const d of w.days) d.sessions.forEach((s, si) => {
    if (!doneRec[w.num + "|" + d.jour + "|" + si]) return;
    for (const [disc, pts] of avatarTriCreditsOf((s as { d?: string }).d)) xp[disc] += pts;
  });
  // Partagés (décision n°4) : tiers plancher — déterministe, et personne ne reçoit plus
  // que sa part (le reste de la division n'est attribué à personne plutôt qu'à quelqu'un).
  const badges = badgesV2(plan, answers, todayISO);
  const pg = progressV2(plan, answers, todayISO);
  const regularWeeks = pg.weekly.filter((w) => w.complete && w.ok).length;
  const tiers = Math.floor((badges.length * 80 + regularWeeks * 120) / 3);
  return avatarTriFromXp({ natation: xp.natation + tiers, velo: xp.velo + tiers, course: xp.course + tiers });
}
/**
 * Retour utilisateur (08/08/2026) : « l'XP de l'avatar n'est pas conservé en changeant de
 * plan ». `avatarTriV2` lit `answers.done`, qui est le journal du plan ACTIF SEULEMENT
 * (`S.answers`, remplacé par `ebActivate` à chaque bascule) — cohérent avec « chaque plan
 * garde son propre journal », mais ça contredit la promesse même de l'avatar : « XP
 * cumulatif, jamais décroissant » (§ décisions fondateur ci-dessus) décrit LA PERSONNE, pas
 * le plan affiché. Un athlète qui crée un deuxième plan ne doit pas voir son avatar repartir
 * de zéro. Somme les XP (tiers compris) de CHAQUE plan de l'athlète — `avatarTriV2` sait déjà
 * calculer un total honnête pour un plan, on ne le recalcule pas une seconde fois — puis
 * redérive les niveaux depuis ce total via la même fonction que le calcul mono-plan
 * (`avatarTriFromXp`, jamais un second barème).
 */
export function avatarTriMulti(entries: { plan: V1Plan; answers: AppAnswers }[], todayISO: string): AvatarTriState {
  const total: Record<AvatarDiscipline, number> = { natation: 0, velo: 0, course: 0 };
  for (const e of entries) {
    const one = avatarTriV2(e.plan, e.answers, todayISO);
    total.natation += one.natation.xp;
    total.velo += one.velo.xp;
    total.course += one.course.xp;
  }
  return avatarTriFromXp(total);
}

/**
 * R17.2 — LE TROISIÈME CANAL : LA FORME PHYSIQUE, MONTRÉE SANS RIEN RETIRER.
 *
 * Le brief avatar (AV3/AV4) voulait piloter l'ÉQUIPEMENT par un palier de performance. Refusé,
 * et la raison tient en une phrase : une allure seuil monte ET DESCEND. Une blessure, une
 * maladie, une grossesse, une charge de travail, ou simplement l'âge la font baisser — et
 * l'athlète verrait son avatar se déshabiller au moment précis où il a le plus besoin d'être
 * encouragé à revenir. L'équipement reste donc la RÉGULARITÉ (cumulatif, jamais décroissant,
 * priorité n°3 du manifeste).
 *
 * Mais l'information de performance est réelle et l'athlète a le droit de la voir. Elle a
 * donc son propre canal, construit pour être RÉVERSIBLE SANS PERTE : un repère qui se
 * DÉPLACE. Il peut reculer sans que rien ne disparaisse — c'est une position sur une échelle,
 * pas une possession qu'on retire.
 *
 * La source n'est PAS un nouveau calcul : c'est `margeOf` (R14.1), déjà sourcé (profil de
 * puissance Coggan pour le vélo, heuristiques assumées pour course et nage) et déjà DÉCALÉ
 * par sexe et par âge — donc un master de 55 ans n'est pas jugé contre une référence de
 * 25 ans, et une femme n'est pas jugée contre une référence masculine. On décale la
 * RÉFÉRENCE, jamais la personne.
 *
 * `null` quand la référence n'est pas mesurée : pas de palier par défaut, pas de zéro. On ne
 * montre pas une position qu'on n'a pas mesurée.
 */
export interface PerfTier { tier: number; disciplines: Record<string, number>; }
const DISC_TO_REF: Record<string, "ftp" | "thrPace" | "css"> = { rn: "thrPace", sw: "css", bk: "ftp" };
export function perfTierV2(sport: string, answers: AppAnswers): PerfTier | null {
  const parse = parsePaceSec;
  const refs = {
    ftp: answers.ftp_known === "oui" ? parseInt(String(answers.ftp || "")) || 0 : 0,
    thrPace: answers.pace_known === "oui" ? parse(answers.pace, "run") : 0,
    css: answers.css_known === "oui" ? parse(answers.css, "swim") : 0,
  };
  const poids = parseFloat(String(answers.weight || "")) || null;
  const age = parseInt(String(answers.age || "")) || null;
  const sexe = (answers.sex as string) || null;
  const discs = knownSports().includes(sport) ? sportModule(sport).disciplines : [];
  const out: Record<string, number> = {};
  for (const d of discs) {
    const cle = DISC_TO_REF[d];
    if (!cle) continue;
    const marge = margeOf(cle, refs, poids, sexe, age);
    if (marge == null) continue;
    // marge 1.0 = loin du potentiel · 0.12 = proche. Le palier est l'inverse, sur 1-10.
    out[d] = Math.max(1, Math.min(10, Math.round((1 - marge) * 10) || 1));
  }
  const vals = Object.values(out);
  if (!vals.length) return null; // aucune référence mesurée → aucun palier, pas un palier 1
  return { tier: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), disciplines: out };
}

/** Prédiction de course — refs athlète + fiabilité issue du suivi réel (streak/charge). */
export function predictV2(sport: string, answers: AppAnswers, plan?: V1Plan & { _v2?: V2PlanMeta }): Prediction {
  const { reasoned, plan: p } = plan ? { reasoned: null, plan } : generatePlan(toProfile(sport, answers));
  const refs = reasoned
    ? reasoned.baseRefs
    : { ftp: parseInt(String(answers.ftp || "")) || 0, thrPace: 0, css: 0 };
  // Sans reasoned (plan fourni par l'UI), reconstruire les refs depuis les réponses
  const parse = parsePaceSec; // E1/E2 (audit v6) — un seul parseur : plan et prédiction ne peuvent plus diverger
  const finalRefs = reasoned ? refs : {
    ftp: answers.ftp_known === "oui" ? parseInt(String(answers.ftp || "")) || 0 : 0,
    thrPace: answers.pace_known === "oui" ? parse(answers.pace, "run") : 0,
    css: answers.css_known === "oui" ? parse(answers.css, "swim") : 0,
  };
  const today = localTodayISO();
  const pg = progressV2(p, answers, today);
  // ---- R14 — ENTRÉES DU PROJECTEUR (« où en seras-tu le jour J »).
  // Trois données que le prédicteur n'avait jamais vues : le temps qui RESTE, ce qui a été
  // RÉELLEMENT fait, et le journal de tests. Elles vivent ici parce que c'est le pont qui
  // connaît le plan livré et les réponses de l'athlète — le prédicteur reste une fonction
  // des références qu'on lui donne.
  const horizonWeeks = weeksUntilRace(p, answers, today);
  const tests = Array.isArray(answers.tests) ? (answers.tests as { type: string; value: number; date: string }[]) : [];
  return predictRace(sport, String(answers.format || ""), String(answers.intent || "") || undefined, finalRefs, {
    pctLoad: pg.pctLoad,
    streakWeeks: pg.streakWeeks,
    // R6 — profil du parcours (Profil) · R14.3-a — résolveur UNIQUE, partagé avec le jour J :
    // `course_profile` (le parcours visé) prime, `terrain` prend le relais à défaut.
    courseProfile: courseProfileOf(answers as never),
    // R18.2 — trois profils au lieu d'un : un triathlon n'est pas homogène.
    legProfiles: { swim: legProfileOf(answers as never, "swim"), bike: legProfileOf(answers as never, "bike"), run: legProfileOf(answers as never, "run") },
    // R19.2 — la combinaison : seuil réglementaire à 24,5 °C, 4 à 7 % de temps de nage.
    // R20.1-a — `isFinite`, pas `||` : 0 est une réponse. Même piège que `vol_recent`.
    waterTempC: (() => { const t = parseFloat(String(answers.water_temp_c ?? "")); return isFinite(t) ? t : undefined; })(),
    // PW — le poids, pour convertir une puissance en vitesse. Optionnel au Profil : absent, le
    // prédicteur REFUSE le chrono vélo et le dit, plutôt que d'inventer une masse.
    athleteKg: (() => { const w = parseFloat(String(answers.weight ?? "")); return isFinite(w) && w > 0 ? w : undefined; })(),
    // R7 TRAIL — l'objectif décodé (catégorie, temps estimé, VAM) : Riegel ne s'applique pas
    trail: sport === "trail" ? trailObjective(toProfile(sport, answers)) : undefined,
    swimrun: sport === "swimrun" && typeof swimrunObjective === "function" ? swimrunObjective(toProfile(sport, answers)) : undefined,
    // R14 P5 — le volume de COURSE hebdomadaire pilote l'exposant de Riegel.
    // B-21 — la course sèche garde `vol_max` (la réponse de l'athlète, qui EST son volume de
    // course) ; partout ailleurs la grandeur n'existe dans aucune réponse et se MESURE sur le
    // plan livré. Sans cette seconde branche, décloisonner l'exposant ne changerait rien.
    runHoursPerWeek: sport === "run"
      ? parseFloat(String(answers.vol_max || "")) || undefined
      : runHoursPerWeekOf(p as V1Plan) ?? undefined,
    projection: horizonWeeks == null ? undefined : {
      horizonWeeks,
      level: String(answers.level || "") || undefined,
      history: String(answers.history || "") || undefined,
      adherence: adherenceWindow(p as never, (answers.done || {}) as Record<string, boolean>, today),
      tests,
      taperConform: taperIsConform(p as never),
      refAgeWeeks: refAgeWeeks(tests, today),
      raceDate: String(answers.race_date || "") || undefined,
      // R14.1 P2bis — la MARGE se lit sur les références mesurées : elles montent donc jusqu'au
      // projecteur, avec le poids (sans lui, pas de W/kg) et les décalages de bandes.
      refs: finalRefs,
      weightKg: parseFloat(String(answers.weight || "")) || null,
      heightCm: parseFloat(String(answers.height || "")) || null,
      sex: typeof answers.sex === "string" ? answers.sex : null,
      age: parseInt(String(answers.age || "")) || null,
      trainingStructure: String(answers.training_structure || "") || null,
      // R14.1 P10 — dose-réponse : ce que le plan PRESCRIT face à ce que l'athlète fait déjà.
      prescribedMeanH: prescribedMeanHours(p),
      // P11 — LE PIÈGE DU ZÉRO, TROISIÈME OCCURRENCE, ET LA SEULE QUI SE VOYAIT À L'ÉCRAN.
      //
      // `parseFloat("0") || null` vaut `null` : « je ne m'entraîne pas du tout » arrivait au
      // projecteur comme « je n'ai pas répondu ». Les deux corrections faites en amont
      // (`volumeFactor`, le régime P11) ne servaient donc À RIEN dans le produit livré — le
      // chiffre n'atteignait jamais le modèle. Mesuré sur la prédiction affichée, 10 km à
      // 16 semaines depuis 7'00/km : **0 h → 7,4 % de gain, 1 h → 21,5 %**. Déclarer zéro
      // donnait trois fois moins que déclarer une heure, sur la carte que l'athlète lit.
      //
      // Troisième fois : R20.1 (rampe R10), P11 (`volumeFactor`), ici. La leçon n'est pas
      // « corriger le piège » mais « le corriger sur TOUT LE CHEMIN » — une valeur légitime
      // effacée à n'importe quel maillon est effacée pour de bon.
      volRecentH: readNumber(answers.vol_recent),
      // R14.1 P9 — le levier poids n'existe que si l'athlète l'a demandé ET a saisi sa cible.
      weightLeverAsked: answers.weight_lever === "oui",
      weightTargetKg: parseFloat(String(answers.weight_target || "")) || null,
      medicalFlag: answers.med_pain === "oui" || answers.med_dizzy === "oui" || answers.med_treat === "oui",
    },
    // R7 TRAIL — l'objectif rejoué avec une VAM et une allure à plat projetées : le prédicteur
    // ne sait pas reconstruire un `TrailObjective`, il vit dans `trailModel`.
    projectTrail: sport === "trail"
      ? (gVam: number, gPace: number) => {
        const prof = toProfile(sport, answers) as Record<string, unknown>;
        const base = trailObjective(prof as never);
        return trailObjective({ ...prof, vam_known: "oui", vam: String(Math.round(base.vam * (1 + gVam))),
          pace_known: "oui", pace: secToPace(base.flatPaceSec / (1 + gPace)) } as never);
      }
      : undefined,
  });
}

/**
 * R14.1 P10 — volume hebdomadaire moyen PRESCRIT sur les phases qui construisent (dev, spéc,
 * pic). L'affûtage et la base sont exclus à dessein : le premier réduit par définition, le
 * second n'est pas encore la dose du plan. C'est le rapport de ce chiffre au volume récent qui
 * dit si le plan MONTE la charge ou la maintient — et un plan de maintien ne fait pas
 * progresser autant, quoi qu'on affiche.
 */
/**
 * P11 — lecture d'un nombre qui SAIT que zéro est une réponse.
 *
 * `parseFloat(x) || null` confond « 0 » et « rien ». Sur un volume d'entraînement récent, ces
 * deux cas sont l'exact opposé l'un de l'autre : l'un est l'information la plus forte que le
 * questionnaire puisse recevoir (« je pars de zéro »), l'autre est son absence. Point unique,
 * pour que la prochaine lecture de ce genre n'ait pas à réinventer la garde.
 */
function readNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v));
  return isFinite(n) ? n : null;
}

function prescribedMeanHours(plan: V1Plan): number | null {
  const w = plan.weeks.filter((x) => !x.isRecup && ["dev", "spec", "peak"].includes(String(x.phase && x.phase.id)));
  if (!w.length) return null;
  let min = 0;
  for (const wk of w)
    for (const d of wk.days)
      for (const s of d.sessions) if (s.d !== "rs" && !s.race) min += s.min || 0;
  return min > 0 ? min / 60 / w.length : null;
}

/**
 * B-21 — LES HEURES DE COURSE PAR SEMAINE, MESURÉES SUR LE PLAN LIVRÉ.
 *
 * `riegelExponent` a besoin du volume de COURSE. En course sèche on le lisait dans `vol_max`,
 * la réponse de l'athlète ; en tri et en duathlon **aucune réponse du questionnaire ne le
 * donne** — on demande un volume total, pas sa répartition. Le pont passait donc `undefined`,
 * et `riegelExponent(undefined)` rend 1,06 par repli : décloisonner l'exposant sans ce
 * mesureur aurait été un correctif INERTE (le défaut que V-10 a nommé sur la branche A du
 * ticket, et que ce dépôt a déjà payé deux fois — C23b, ma première écriture de C30b).
 *
 * On mesure donc sur ce que le plan PRODUIT, à la médiane des semaines de charge — le pic
 * décrit un instant, la médiane décrit ce que l'athlète vit. Les minutes de course d'un brick
 * sont comptées : elles sont dans ses steps, et un enchaînement fait courir.
 */
/**
 * B1 (arbitrage du STOP de Phase 2) — LE CLASSIFICATEUR DU MOTEUR, EXPOSÉ À L'AFFICHAGE.
 *
 * Le graphe de charge de l'UI comptait ses minutes avec sa propre table (`_IFZ`) et sa propre
 * convolution : un modèle entier côté affichage, que R14 rejette côté moteur. Il consomme
 * désormais `intensitySplit` — LE classificateur de C26 — pour les séances validées ; les
 * minutes PRÉVUES viennent déjà de `_v2.intensity.weekly`. Les refs suivent les réponses
 * courantes (mêmes parseurs que le plan) ; sans référence, les défauts d'`intensitySplit`
 * s'appliquent (le comportement du moteur, jamais un second choix ici).
 */
function sessionSplitForUI(s: unknown, answers?: AppAnswers): { easyMin: number; modMin: number; hardMin: number } {
  const a = answers ?? ({} as AppAnswers);
  const css = a.css ? parsePaceSec(String(a.css), "swim") : 0;
  const pace = a.pace ? parsePaceSec(String(a.pace), "run") : 0;
  const refs = {
    cssSecPer100m: css > 0 ? css : 130,
    thrPaceSecPerKm: pace > 0 ? pace : 330,
  };
  return intensitySplit(s as never, refs as never);
}

function runHoursPerWeekOf(plan: V1Plan): number | null {
  const w = plan.weeks.filter((x) => !x.isRecup && ["dev", "spec", "peak"].includes(String(x.phase && x.phase.id)));
  if (!w.length) return null;
  const parSemaine: number[] = [];
  for (const wk of w) {
    let min = 0;
    for (const d of wk.days) for (const s of d.sessions) {
      if (s.d === "rs" || s.race) continue;
      if (s.d === "rn") { min += s.min || 0; continue; }
      for (const st of (s.steps ?? []) as { d?: string; reps?: number; durationMin?: number }[])
        if ((st.d || s.d) === "rn" && st.durationMin) min += (st.reps || 1) * st.durationMin;
    }
    parSemaine.push(min);
  }
  parSemaine.sort((a, b) => a - b);
  const med = parSemaine[Math.floor(parSemaine.length / 2)] / 60;
  return med > 0 ? med : null;
}

/** Secondes/km → « 4:50 » : le parseur d'allure est unique (E1/E2), son inverse doit l'être aussi. */
function secToPace(secPerKm: number): string {
  const s = Math.max(1, Math.round(secPerKm));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

/**
 * R14 — L'HORIZON : semaines entre aujourd'hui et le jour J. La date de course prime (c'est
 * l'échéance réelle) ; à défaut on prend la fin du plan. `null` = pas d'échéance connue, donc
 * pas de projection — on ne projette pas vers une date qu'on ne connaît pas.
 */
function weeksUntilRace(plan: V1Plan, answers: AppAnswers, todayISO: string): number | null {
  const rd = String(answers.race_date || "").trim();
  let cible = /^\d{4}-\d{2}-\d{2}$/.test(rd) ? rd : "";
  if (!cible) {
    for (const w of plan.weeks) for (const d of w.days) if ((d as { date?: string }).date) cible = (d as { date?: string }).date as string;
  }
  if (!cible) return null;
  const jours = (Date.parse(cible + "T00:00:00Z") - Date.parse(todayISO + "T00:00:00Z")) / 864e5;
  if (!Number.isFinite(jours) || jours < 0) return null; // course passée : rien à projeter
  return jours / 7;
}

/** P7 — âge (en semaines) de la référence la plus récente : un test d'il y a un an ne décrit plus personne. */
function refAgeWeeks(tests: { date?: string }[], todayISO: string): number | null {
  const dates = (tests || []).map((t) => Date.parse(String(t.date) + "T00:00:00Z")).filter((n) => Number.isFinite(n));
  if (!dates.length) return null; // références déclarées sans date : on n'invente pas leur ancienneté
  return Math.max(0, (Date.parse(todayISO + "T00:00:00Z") - Math.max(...dates)) / (7 * 864e5));
}

/** Estimation énergétique du jour (décision utilisateur 28/07/2026 — estimation, jamais
 *  de conseil d'apport). Somme les dépenses N7 des séances du jour puis délègue à
 *  l'estimateur ; null sans poids au Profil (l'UI renvoie vers le Profil). */
function dailyEnergyV2(answers: AppAnswers, sessions?: { d: string; min?: number; long?: boolean }[] | null): DailyEnergyEstimate | null {
  const w = parseFloat(String(answers.weight || ""));
  if (!(w > 0)) return null;
  let kcal: [number, number] = [0, 0];
  let tMin = 0;
  for (const s of sessions || []) {
    if (!s || s.d === "rs") continue;
    const a = nutritionForSession(s as never, { weightKg: w });
    if (a) { kcal = [kcal[0] + a.kcal[0], kcal[1] + a.kcal[1]]; tMin += Math.round(s.min || 0); }
  }
  return dailyEnergy({
    weightKg: w,
    heightCm: parseFloat(String(answers.height || "")) || null,
    age: parseInt(String(answers.age || "")) || null,
    sex: typeof answers.sex === "string" ? answers.sex : null,
    trainingKcal: kcal,
    trainingMin: tMin,
  });
}

/** O-16 — POURQUOI l'estimation n'est pas affichée, quand elle ne l'est pas. `dailyEnergy`
 *  retourne `null` dans trois cas très différents : pas de poids saisi, âge sous la borne
 *  (O-16), gabarit hors des bornes de validation des équations (E4). L'UI montrait le même
 *  repli « renseigne ton poids » dans les trois — donc elle envoyait un mineur et une personne
 *  hors bornes corriger une donnée qui n'était pas en cause. Null ici = « aucun motif à
 *  expliquer », c'est-à-dire la donnée manquante. */
function energyRefusalV2(answers: AppAnswers): string | null {
  return energyRefusalNotice({
    weightKg: parseFloat(String(answers.weight || "")) || null,
    heightCm: parseFloat(String(answers.height || "")) || null,
    age: parseInt(String(answers.age || "")) || null,
  });
}

// R7 — date du jour en heure LOCALE de l'appareil (jamais toISOString/UTC : le plan
// vit dans le calendrier de l'athlète, pas celui de Greenwich).
function localTodayISO(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** Références mesurées, lues des réponses — même lecture que `predictV2`/`perfTierV2`
 *  (E1/E2 : un seul PARSEUR d'allure, `parsePaceSec` — cette lecture answers→refs, elle, est
 *  un motif répété trois fois dans ce pont, pas encore factorisé ; ce n'est pas cette entrée
 *  qui doit le faire). */
function refsFromAnswers(answers: AppAnswers): { ftp: number; thrPace: number; css: number } {
  return {
    ftp: answers.ftp_known === "oui" ? parseInt(String(answers.ftp || "")) || 0 : 0,
    thrPace: answers.pace_known === "oui" ? parsePaceSec(answers.pace, "run") : 0,
    css: answers.css_known === "oui" ? parsePaceSec(answers.css, "swim") : 0,
  };
}

/**
 * RVm — LES SEGMENTS D'UN FORMAT MULTI-DISCIPLINE, pour `assessFeasibilityMulti`.
 *
 * Chaque temps ACTUEL est calculé avec EXACTEMENT les briques que `predictSwim`/`predictTri`/
 * `predictDuathlon` (`src/sports/<sport>/index.ts`) appellent pour construire la prédiction du jour —
 * jamais une resaisie du modèle (R11.1). `predictRace` ne les expose pas telles quelles (ses
 * items ne portent qu'un texte déjà formaté, jamais le nombre de secondes) : reparser une
 * chaîne comme « 1h23–1h31 » serait fragile, donc ce pont rappelle les mêmes fonctions
 * EXPORTÉES, au même titre qu'un troisième module de sport le ferait.
 *
 * Volontairement SANS le relief/l'environnement (profil de parcours, milieu de nage,
 * combinaison) : le verdict compare une forme MESURÉE à un objectif, pas une fourchette de
 * course prête à afficher — la version course à pied (`assessFeasibility`) fait le même choix,
 * elle n'appelle jamais `runRange`.
 */
function legsForFeasibility(sport: string, format: string, answers: AppAnswers)
  : { legs: FeasibilityLeg[]; fixedSec: number } | null {
  const refs = refsFromAnswers(answers);
  const relief = courseProfileOf(answers as never);
  const bikeRelief = legProfileOf(answers as never, "bike") ?? relief;
  const athleteKg = readNumber(answers.weight);

  if (sport === "swim") {
    const sw = SWIM_RACE[format];
    if (!sw || !(refs.css > 0)) return null;
    return { legs: [{ key: "swim", label: "Natation " + sw.dist + "m", refType: "css", refValue: refs.css,
      currentSec: (sw.dist / 100) * refs.css * sw.factor }], fixedSec: 0 };
  }

  if (sport === "tri") {
    const sw = TRI_SWIM[format], bk = TRI_BIKE[format], rn = TRI_RUN[format], tr = TRI_TRANSITION[format];
    if (!sw || !bk || !rn || !tr) return null;
    const legs: FeasibilityLeg[] = [];
    if (refs.css > 0) legs.push({ key: "swim", label: "Natation " + sw.dist + "m", refType: "css", refValue: refs.css,
      currentSec: (sw.dist / 100) * refs.css * sw.factor });
    if (refs.ftp > 0 && athleteKg) {
      const shift = bikeIFShift(bikeRelief);
      const est = bikeTimeEstimate(TRI_BIKE_KM[format], refs.ftp * (bk.lo + shift), refs.ftp * (bk.hi + shift),
        athleteKg, assumedSetup("tri", format), bikeRelief);
      if (est) legs.push({ key: "bike", label: "Vélo " + TRI_BIKE_KM[format] + "km", refType: "ftp",
        refValue: refs.ftp, currentSec: (est.lo + est.hi) / 2 });
    }
    if (refs.thrPace > 0) legs.push({ key: "run", label: "CAP " + rn.km + "km", refType: "thrPace",
      refValue: refs.thrPace, currentSec: riegelSecWith(1.06, refs.thrPace, rn.km) * rn.fatigue });
    return legs.length ? { legs, fixedSec: tr.t1 + tr.t2 } : null;
  }

  if (sport === "duathlon") {
    const r1 = DUA_RUN1[format], bk = DUA_BIKE[format], pw = DUA_BIKE_POWER[format], r2 = DUA_RUN2[format], tr = DUA_TRANSITION[format];
    if (!r1 || !bk || !pw || !r2 || !tr) return null;
    const pf = DUA_BIKE_PREFATIGUE[format] ?? 0.97;
    const legs: FeasibilityLeg[] = [];
    if (refs.thrPace > 0) {
      const t1 = riegelSecWith(1.06, refs.thrPace, r1.km);
      const t2 = riegelSecWith(1.06, refs.thrPace, r2.km) * r2.fatigue;
      legs.push({ key: "run", label: "Course (R1+R2, " + (r1.km + r2.km).toFixed(1) + "km)", refType: "thrPace",
        refValue: refs.thrPace, currentSec: t1 + t2 });
    }
    if (refs.ftp > 0 && athleteKg) {
      const shift = bikeIFShift(bikeRelief);
      const est = bikeTimeEstimate(bk.km, refs.ftp * (pw.lo + shift) * pf, refs.ftp * (pw.hi + shift) * pf,
        athleteKg, assumedSetup("duathlon", format), bikeRelief);
      if (est) legs.push({ key: "bike", label: "Vélo " + bk.km + "km", refType: "ftp", refValue: refs.ftp,
        currentSec: (est.lo + est.hi) / 2 });
    }
    return legs.length ? { legs, fixedSec: tr.t1 + tr.t2 } : null;
  }

  return null;
}

/**
 * RV — LE DIAGNOSTIC DE FAISABILITÉ, exposé à l'UI.
 *
 * Une seule chose est à comprendre en lisant ce pont : **il ne rend qu'un verdict**. Le chrono
 * visé n'entre dans AUCUNE des entrées de `buildPlan` — le plan est construit d'abord, il est
 * passé ici en lecture pour connaître le volume prescrit et l'horizon, et le verdict s'écrit
 * par-dessus. Laisser un objectif de temps augmenter une charge, ce serait la priorité n°5 du
 * manifeste qui écrase les quatre premières. `RV-INVARIANT` (`demo:faisabilite`) mesure cette
 * propriété au bit près, et `RV-UI` (E2E) la remesure sur le plan affiché.
 *
 * Audit 08/08/2026 — étendu de la course seule à swim/tri/duathlon (`assessFeasibilityMulti`,
 * `legsForFeasibility`). Le vélo seul et le trail restent hors périmètre et le disent :
 * · vélo — aucun format ne porte de DISTANCE connue (PW l'a déjà nommé : « le questionnaire ne
 *   demande pas la distance d'une cyclosportive ») donc aucun chrono actuel à comparer ;
 * · trail/swimrun — leur modèle de temps n'est pas une combinaison marge/plafond par référence
 *   mesurée (trail : temps à plat + VAM ; swimrun : quota de minutes par segment) — les
 *   étendre demande sa propre inversion, pas cette généralisation-ci. Suivi dans
 *   `BUGS_OUVERTS.md`.
 */
export function feasibilityV2(sport: string, answers: AppAnswers, plan?: V1Plan & { _v2?: V2PlanMeta }) {
  if (!["run", "swim", "tri", "duathlon"].includes(sport)) return null;
  const targetSec = parseChronoSec(answers.target_time, sport);
  if (targetSec == null) return null;
  const p = plan ?? generatePlan(toProfile(sport, answers)).plan;
  const today = localTodayISO();
  const horizonWeeks = weeksUntilRace(p, answers, today);
  const format = String(answers.format || "");

  if (sport === "run") {
    return assessFeasibility({
      format,
      targetSec,
      thrPaceSecPerKm: answers.pace_known === "oui" ? parsePaceSec(answers.pace, "run") : 0,
      horizonWeeks: horizonWeeks ?? 0,
      runHoursPerWeek: readNumber(answers.vol_recent),
      prescribedMeanH: prescribedMeanHours(p),
      weightKg: readNumber(answers.weight),
      sex: typeof answers.sex === "string" ? answers.sex : null,
      age: readNumber(answers.age),
      trainingStructure: String(answers.training_structure || "") || null,
      history: String(answers.history || "") || undefined,
    });
  }

  const composed = legsForFeasibility(sport, format, answers);
  if (!composed) return null;
  return assessFeasibilityMulti({
    targetSec,
    legs: composed.legs,
    fixedSec: composed.fixedSec,
    horizonWeeks: horizonWeeks ?? 0,
    prescribedMeanH: prescribedMeanHours(p),
    volRecentH: readNumber(answers.vol_recent),
    weightKg: readNumber(answers.weight),
    sex: typeof answers.sex === "string" ? answers.sex : null,
    age: readNumber(answers.age),
    trainingStructure: String(answers.training_structure || "") || null,
    history: String(answers.history || "") || undefined,
  });
}

/**
 * « 3:30:00 », « 45:00 », « 46'30 » → secondes. `null` sur tout le reste, y compris une saisie
 * en cours de frappe — le champ est OPTIONNEL, une saisie incomplète ne doit rien afficher et
 * surtout pas un verdict sur un chrono deviné.
 *
 * Hors `ANSWER_SCHEMA`, au même titre que `pace` et `css` : le schéma ne connaît pas le type
 * « durée », et lui en inventer un pour un champ qui ne pilote aucune séance serait payer le
 * prix d'une clé de schéma (validation dure, refus d'entrée typé) pour un affichage.
 */
export function parseChronoSec(v: unknown, sport?: string): number | null {
  const s = String(v ?? "").trim().replace(/'/g, ":").replace(/\s/g, "");
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (!m) return null;
  if (m[3] != null) {
    const sec = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]); // h:mm:ss, sans ambiguïté
    return sec >= 600 && sec <= 43200 ? sec : null;
  }
  // `X:YY` est ambigu — « 46:30 » veut dire 46 min 30, « 3:30 » veut dire 3 h 30. On ne DEVINE
  // pas : on écarte la lecture qui est hors domaine. Aucun format de course à pied du moteur
  // n'est courable en moins de 10 minutes, donc une lecture mm:ss sous ce plancher n'est pas un
  // chrono — c'est la lecture h:mm qui est la bonne. Une seule des deux tient debout à la fois.
  //
  // Retour utilisateur (08/08/2026) : ce plancher casse sur un temps TOTAL tri/duathlon dont
  // l'heure s'écrit sur deux chiffres (Ironman : 9 à 12 h) — « 10:30 » se lisait 10 min 30 au
  // lieu de 10 h 30, d'où un écart de gain absurde (98,6 %) et un « défendable » sans rapport
  // avec la saisie. Borné à m[1] ∈ [10,12] : c'est la SEULE zone où l'ancienne heuristique
  // choisissait à tort mm:ss (elle est déjà correcte pour m[1] ≤ 9, où mmss < 600 quel que soit
  // le sport) — l'élargir à tout m[1] casserait un Sprint tapé « 55:00 » pour 55 MINUTES.
  if ((sport === "tri" || sport === "duathlon") && +m[1] >= 10 && +m[1] <= 12) {
    const sec = (+m[1]) * 3600 + (+m[2]) * 60;
    return sec <= 43200 ? sec : null;
  }
  const mmss = (+m[1]) * 60 + (+m[2]);
  const sec = mmss >= 600 ? mmss : (+m[1]) * 3600 + (+m[2]) * 60;
  // Au-delà de 12 h on sort du domaine de Riegel et des formats déclarés.
  return sec >= 600 && sec <= 43200 ? sec : null;
}

/**
 * Retour utilisateur (08/08/2026) : « toujours pas de référence D+ dans Profil / Ta course ».
 * Le moteur n'a AUCUN chemin numérique pour le D+ hors trail — `RELIEF`/`RELIEF_BIKE_IF`
 * (predictor.ts) ne lisent QUE la catégorie qualitative plat/vallonné/montagneux, résolue par
 * `courseProfileOf`/`legProfileOf`, le chemin unique (R14.3-a). Lui ajouter un second chemin
 * numérique dans le moteur créerait deux sources de vérité. Ces deux fonctions sont donc des
 * CALCULATRICES côté UI, hors ANSWER_SCHEMA (même statut que `target_time`/`pace`/`css`) : elles
 * convertissent un D+ saisi vers la MÊME catégorie déjà lue partout, elles n'inventent rien de
 * nouveau que le moteur devrait apprendre.
 *
 * `raceDistanceKm` réutilise les tables de distance DÉJÀ calibrées par sport/format (RUN_KM,
 * TRI_BIKE_KM/TRI_RUN, DUA_BIKE/DUA_RUN1+2) — une seule écriture de ces chiffres (R11.1).
 */
export function raceDistanceKm(sport: string, format: string, leg?: string): number | null {
  if (sport === "run") return RUN_KM[format] ?? null;
  if (sport === "tri") {
    if (leg === "bike") return TRI_BIKE_KM[format] ?? null;
    if (leg === "run") return TRI_RUN[format] ? TRI_RUN[format].km : null;
    return null;
  }
  if (sport === "duathlon") {
    if (leg === "bike") return DUA_BIKE[format] ? DUA_BIKE[format].km : null;
    if (leg === "run") {
      const r1 = DUA_RUN1[format], r2 = DUA_RUN2[format];
      return r1 && r2 ? r1.km + r2.km : null;
    }
    return null;
  }
  return null;
}
/**
 * Catégorie suggérée pour un D+ VÉLO (m) sur une distance (km) — ancrée sur `RELIEF_PROFILE`
 * (fiches d'épreuves réelles : Barcelone/Hambourg, Aix/Vichy, Nice/Alpe d'Huez), jamais un seuil
 * inventé pour l'occasion. Les bornes sont le MILIEU entre deux catégories publiées : ni l'une
 * ni l'autre n'a de raison objective d'être « la » frontière, mais les deux valent mieux qu'une
 * absence de repère. `null` si la distance est inconnue — aucune conversion honnête possible.
 *
 * Course à pied délibérément SANS équivalent : aucune calibration D+/km ↔ catégorie n'existe
 * dans ce dépôt pour la course (contrairement au vélo, source ci-dessus) — en inventer une
 * serait répéter l'erreur que ce fichier corrige deux fois de suite pour le relief vélo
 * (commentaire de RELIEF_PROFILE : deux pentes inventées avant la bonne écriture).
 */
export function bikeReliefFromDplus(dplusM: number, km: number): "plat" | "vallonne" | "montagne" | null {
  if (!(km > 0) || !(dplusM >= 0)) return null;
  const per100 = (dplusM / km) * 100;
  const seuilPlatVallonne = (RELIEF_PROFILE.plat.dplusPer100km + RELIEF_PROFILE.vallonne.dplusPer100km) / 2;
  const seuilVallonneMontagne = (RELIEF_PROFILE.vallonne.dplusPer100km + RELIEF_PROFILE.montagne.dplusPer100km) / 2;
  if (per100 < seuilPlatVallonne) return "plat";
  if (per100 < seuilVallonneMontagne) return "vallonne";
  return "montagne";
}

declare const globalThis: { EBV2?: unknown } & Record<string, unknown>;
/**
 * R21 — LE COACH PROACTIF, côté application.
 *
 * Appelé APRÈS chaque ingestion de séance (FIT, GPX, TCX, Strava). Il régénère le
 * plan depuis les réponses — comme `adjustTodayV2` —, détecte les déviations, et
 * ne recalcule QUE la fenêtre de 14 jours, uniquement à la baisse.
 *
 * Ce qu'il rend est une PROPOSITION : le pont ne persiste rien. C'est l'appelant
 * (l'UI) qui décide d'écrire, et l'athlète qui voit ce qui a changé — un plan qui
 * se réécrirait tout seul dans le stockage, sans un écran, serait exactement le
 * produit opaque que ce dépôt refuse d'être.
 */
function coachOnIngestV2(sport: string, answers: AppAnswers, ingested: IngestedSession[], today: string) {
  const { plan, reasoned } = generatePlan(toProfile(sport, answers));
  const completed = (answers.completed as CompletedSession[] | undefined)
    || completedFromDone(plan, answers, today);
  const sink = new InAppSink();
  const res = onSessionIngested({
    reasoned, plan, refs: reasoned.baseRefs, ingested,
    done: (answers.done || {}) as Record<string, boolean>,
    completed, today, sink,
  });
  return { ...res, inbox: sink.inbox, plan };
}

(globalThis as Record<string, unknown>).EBV2 = {
  buildPlan: buildPlanV2,
  // B1 — le classificateur d'intensité du moteur, pour le graphe de charge (jamais une table UI)
  sessionSplit: sessionSplitForUI,
  // B2 — la règle « FTP ≈ 95 % des 20 min » : UNE écriture (fitParser), deux consommateurs
  ftpFromBest20,
  adjustToday: adjustTodayV2,
  coachOnIngest: coachOnIngestV2,
  // S-8 — l'UI contrôle la taille AVANT de lire le fichier : la borne est celle du moteur,
  // pas une seconde valeur écrite dans l'interface.
  maxImportBytes: MAX_IMPORT_BYTES,
  assertImportSize,
  // H-1 — l'UI affiche la base et le motif de refus ; elle ne les RECALCULE pas.
  hrvBaseline: (log: HrvMesure[] | undefined, date: string) => hrvBaseline(log, date),
  parseActivityText,
  assessReadiness,
  progress: progressV2,
  predict: predictV2,
  badges: badgesV2,
  avatar: avatarV2,
  // R25 — l'avatar composite (3 jauges 0-30). `avatar` (16 niveaux) reste exposé tel quel
  // tant que le rendu composite n'a pas remplacé l'ancien (non-régression de l'étape 3).
  avatarTri: avatarTriV2,
  // Retour utilisateur (08/08/2026) : l'XP ne doit pas repartir de zéro au changement de
  // plan — somme les XP (tiers compris) de tous les plans de l'athlète (voir sa définition).
  avatarTriMulti,
  perfTier: perfTierV2,
  adherence: adherenceV2,
  disciplines: DISCIPLINE_REGISTRY,
  // R7 — l'UI a besoin de la catégorie d'effort déduite et des plafonds trail pour
  // expliquer ses règles pédagogiques : les exposer évite de dupliquer les chiffres
  // (une table de plafonds recopiée dans l'UI, c'est une table qui divergera).
  trailObjective: (answers: Record<string, unknown>) => trailObjective(toProfile("trail", answers)),
  trailCaps: { history: TRAIL_HISTORY_CAPS, util: TRAIL_UTIL },
  // S10 — prérequis d'entrée swimrun : l'UI refuse un format long en dessous, et DIT pourquoi.
  // C'est la priorité n°1 du manifeste (santé) dans un sport où l'on est loin du bord.
  // R12 §0 — le module swimrun peut être ABSENT du bundle V1 : ces ponts le tolèrent au lieu
  // de faire tomber tout l'objet `EBV2` au chargement.
  swimrunPrereq: (answers: Record<string, unknown>) => (typeof swimrunPrereqBlock === "function" ? swimrunPrereqBlock(answers as { format?: string }) : ""),
  swimrunObjective: (answers: Record<string, unknown>) => (typeof swimrunObjective === "function" ? swimrunObjective(toProfile("swimrun", answers)) : null),
  // R10 phase 0 (§ R10.0.3) — SOURCE UNIQUE des plafonds de volume. L'UI en gardait une copie
  // littérale (`capsBySport`/`utilBySport` dans steps.js) qui avait déjà DIVERGÉ : elle
  // annonçait 8h/sem là où le moteur en applique 9 (vélo/route/reprise). Les règles
  // pédagogiques expliquent des décisions : elles doivent lire les chiffres qui décident.
  volumeCaps: { history: HISTORY_CAPS, util: UTIL, margin: MARGIN },
  // R10 phase 1 — le REGISTRE DE SPORTS exposé à l'UI : elle n'a plus à savoir quel sport
  // teste quoi (`typesForSport` recopiait la liste). Un sport ajouté au moteur devient
  // automatiquement complet côté interface.
  sports: Object.fromEntries(knownSports().map((id) => {
    const m = sportModule(id);
    return [id, { id: m.id, mainDiscipline: m.mainDiscipline, retestTypes: m.retestTypes, guards: m.guards }];
  })),
  // R11 — le schéma d'entrée est la SOURCE DE VÉRITÉ des domaines : l'UI doit générer ses
  // options depuis lui, jamais l'inverse (tant qu'ils sont écrits deux fois, ils divergent).
  answerSchema: ANSWER_SCHEMA,
  // R12.6 — la NATURE de chaque question (vécue / mesurée / estimée) est exposée : c'est ce
  // qui permet à un banc de vérifier qu'aucune question estimée ne pilote un chiffre.
  formatsBySport: FORMATS_BY_SPORT,
  minWeeks: MIN_WEEKS,
  validateAnswers,
  EBInputError,
  importFit: importFitBytes,
  fitDerivedTests: FIT_DERIVED_TESTS,
  // R6 §3 — l'adaptateur de données réalisées, exposé à l'UI. Le moteur ne connaît que
  // l'instantané ; l'UI décide QUAND le rafraîchir (cadence = semaine de décharge).
  measuredFromSessions,
  measuredWeeklyHours,
  arbitrateVolRecent,
  sessionNutrition: nutritionForSession,
  dailyEnergy: dailyEnergyV2,
  energyRefusal: energyRefusalV2,
  // RV — le diagnostic de faisabilité (chrono visé). Rend `null` hors course à pied et sans
  // chrono saisi. Il ne touche jamais le plan : c'est un VERDICT, pas une entrée.
  feasibility: feasibilityV2,
  parseChronoSec,
  // Retour utilisateur (08/08/2026) : la référence D+ au Profil — calculatrices, pas une
  // nouvelle donnée pilotée (voir leur définition).
  raceDistanceKm,
  bikeReliefFromDplus,
  // R23.1 — LE POINT UNIQUE « cette mesure est-elle humaine ? », exposé à l'UI. Les quatre
  // écritures du journal de tests (FIT, Strava, retest, saisie manuelle) passent par lui : la
  // règle E3 ne vivait que dans le moteur, et les trois écritures côté UI ne la voyaient pas.
  testDansBornes,
  physioBounds: PHYSIO_BOUNDS,
  // R24.8 — les distances de la semaine par discipline (temps exact, km si les références
  // le permettent — jamais un chiffre inventé). Sert l'en-tête de l'onglet 📅 Semaine.
  weekDistances,
  // Bibliothèque d'éducatifs par discipline (🧰 Outils, retour utilisateur 08/08/2026) — mêmes
  // gestes que ceux nommés dans les séances réelles, jamais un contenu écrit à côté.
  eduLibrary: EDU_LIBRARY,
  version: "v2-sprint9",
};
