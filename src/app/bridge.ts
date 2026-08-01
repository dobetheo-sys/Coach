/**
 * Pont UI ↔ moteur V2 — exposé au produit HTML sous `globalThis.EBV2` par le bundle
 * (`npm run build:app`). L'UI n'appelle QUE ces trois fonctions ; aucune logique métier
 * dans les composants (manifeste, §9 Architecture).
 */
import type { AthleteProfile, V1Plan, V1Step } from "../engine/types.ts";
import { intensitySplit } from "../engine/loadModel.ts";
import { parsePaceSec, HISTORY_CAPS, UTIL, MARGIN, MIN_WEEKS } from "../engine/constraintMatrix.ts";
import { trailObjective, TRAIL_HISTORY_CAPS, TRAIL_UTIL } from "../engine/trailModel.ts";
import { swimrunObjective } from "../sports/swimrun/objective.ts";
import { swimrunPrereqBlock } from "../sports/swimrun/index.ts";
import { generateAudited } from "../generator/repairLoop.ts";
import { knownSports, sportModule } from "../sports/registry.ts";
import { generatePlan } from "../generator/planGenerator.ts";
import { adjustDay, type DayAdjustment } from "../readiness/dailyAdjuster.ts";
import { predictRace, courseProfileOf, type Prediction } from "../engine/predictor.ts";
import { adherenceWindow, taperIsConform } from "../engine/projection.ts";
import { assessReadiness, validateSnapshot, type CompletedSession, type ReadinessSnapshot } from "../readiness/readinessSource.ts";
import { importFitBytes, FIT_DERIVED_TESTS } from "../readiness/fitParser.ts";
import { measuredFromSessions, measuredWeeklyHours, arbitrateVolRecent } from "../engine/measured.ts";
import { validateAnswers, assertPlanIsAPlan, EBInputError, ANSWER_SCHEMA, FORMATS_BY_SPORT } from "../engine/answerSchema.ts";
import { nutritionForSession } from "../nutrition/nutritionCalculator.ts";
import { dailyEnergy, type DailyEnergyEstimate } from "../nutrition/energyEstimator.ts";
import { DISCIPLINE_REGISTRY } from "../engine/disciplineRegistry.ts";

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
  const res = generateAudited(toProfile(sport, vr.answers as unknown as AppAnswers));
  const plan = res.plan as V1Plan & { _v2?: V2PlanMeta };
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
    // R7 TRAIL — l'objectif décodé (catégorie, temps estimé, VAM) : Riegel ne s'applique pas
    trail: sport === "trail" ? trailObjective(toProfile(sport, answers)) : undefined,
    swimrun: sport === "swimrun" && typeof swimrunObjective === "function" ? swimrunObjective(toProfile(sport, answers)) : undefined,
    // R14 P5 — le volume de COURSE hebdomadaire pilote l'exposant de Riegel.
    runHoursPerWeek: sport === "run" ? parseFloat(String(answers.vol_max || "")) || undefined : undefined,
    projection: horizonWeeks == null ? undefined : {
      horizonWeeks,
      level: String(answers.level || "") || undefined,
      history: String(answers.history || "") || undefined,
      adherence: adherenceWindow(p as never, (answers.done || {}) as Record<string, boolean>, today),
      tests,
      taperConform: taperIsConform(p as never),
      refAgeWeeks: refAgeWeeks(tests, today),
      raceDate: String(answers.race_date || "") || undefined,
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

// R7 — date du jour en heure LOCALE de l'appareil (jamais toISOString/UTC : le plan
// vit dans le calendrier de l'athlète, pas celui de Greenwich).
function localTodayISO(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

declare const globalThis: { EBV2?: unknown } & Record<string, unknown>;
(globalThis as Record<string, unknown>).EBV2 = {
  buildPlan: buildPlanV2,
  adjustToday: adjustTodayV2,
  assessReadiness,
  progress: progressV2,
  predict: predictV2,
  badges: badgesV2,
  avatar: avatarV2,
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
  version: "v2-sprint9",
};
