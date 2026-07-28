/**
 * Pont UI ↔ moteur V2 — exposé au produit HTML sous `globalThis.EBV2` par le bundle
 * (`npm run build:app`). L'UI n'appelle QUE ces trois fonctions ; aucune logique métier
 * dans les composants (manifeste, §9 Architecture).
 */
import type { AthleteProfile, V1Plan, V1Step } from "../engine/types.ts";
import { intensitySplit } from "../engine/loadModel.ts";
import { generateAudited } from "../generator/repairLoop.ts";
import { generatePlan } from "../generator/planGenerator.ts";
import { adjustDay, type DayAdjustment } from "../readiness/dailyAdjuster.ts";
import { predictRace, type Prediction } from "../engine/predictor.ts";
import { assessReadiness, type CompletedSession, type ReadinessSnapshot } from "../readiness/readinessSource.ts";
import { importFitBytes } from "../readiness/fitParser.ts";
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
  const res = generateAudited(toProfile(sport, answers));
  const plan = res.plan as V1Plan & { _v2?: V2PlanMeta };
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
  const { plan, reasoned } = generatePlan(toProfile(sport, answers));
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
  levels: { level: number; name: string; icon: string; xp: number }[];
}
const AVATAR_LEVELS: { name: string; icon: string; xp: number }[] = [
  { name: "Premier pas", icon: "🥚", xp: 0 },
  { name: "Graine plantée", icon: "🌱", xp: 120 },
  { name: "Pousse", icon: "🌿", xp: 320 },
  { name: "Enraciné", icon: "🌳", xp: 700 },
  { name: "Sur la lancée", icon: "🔥", xp: 1300 },
  { name: "Confirmé", icon: "🥈", xp: 2200 },
  { name: "Vétéran", icon: "🏆", xp: 3500 },
];
export function avatarV2(plan: V1Plan, answers: AppAnswers, todayISO: string): AvatarState {
  const pg = progressV2(plan, answers, todayISO);
  const badges = badgesV2(plan, answers, todayISO);
  const regularWeeks = pg.weekly.filter((w) => w.complete && w.ok).length;
  // Semaines régulières (le cœur de la priorité n°3) + badges gagnés + charge accomplie :
  // trois signaux déjà calculés ailleurs, jamais un chiffre de performance brute (chrono/FTP).
  const xp = regularWeeks * 120 + badges.length * 80 + Math.round(pg.pctLoad * 3) + Math.round(pg.doneMin / 15);
  let idx = 0;
  for (let i = 0; i < AVATAR_LEVELS.length; i++) if (xp >= AVATAR_LEVELS[i].xp) idx = i;
  const cur = AVATAR_LEVELS[idx], next = AVATAR_LEVELS[idx + 1];
  const xpInLevel = xp - cur.xp;
  const xpToNext = next ? next.xp - cur.xp : 0;
  return {
    level: idx + 1, name: cur.name, icon: cur.icon, xp, xpInLevel, xpToNext,
    progressPct: next ? Math.max(0, Math.min(100, Math.round((xpInLevel / xpToNext) * 100))) : 100,
    // Teaser du niveau suivant (UI Profil) — l'XP reste 100% régularité, jamais un chrono.
    nextName: next ? next.name : null, nextIcon: next ? next.icon : null,
    levels: AVATAR_LEVELS.map((l, i) => ({ level: i + 1, name: l.name, icon: l.icon, xp: l.xp })),
  };
}

/** Prédiction de course — refs athlète + fiabilité issue du suivi réel (streak/charge). */
export function predictV2(sport: string, answers: AppAnswers, plan?: V1Plan & { _v2?: V2PlanMeta }): Prediction {
  const { reasoned, plan: p } = plan ? { reasoned: null, plan } : generatePlan(toProfile(sport, answers));
  const refs = reasoned
    ? reasoned.baseRefs
    : { ftp: parseInt(String(answers.ftp || "")) || 0, thrPace: 0, css: 0 };
  // Sans reasoned (plan fourni par l'UI), reconstruire les refs depuis les réponses
  const parse = (v: unknown) => { const m = String(v || "").trim().split(/[:h.]/); return m.length === 2 ? parseInt(m[0]) * 60 + parseInt(m[1]) : 0; };
  const finalRefs = reasoned ? refs : {
    ftp: answers.ftp_known === "oui" ? parseInt(String(answers.ftp || "")) || 0 : 0,
    thrPace: answers.pace_known === "oui" ? parse(answers.pace) : 0,
    css: answers.css_known === "oui" ? parse(answers.css) : 0,
  };
  const today = new Date().toISOString().slice(0, 10);
  const pg = progressV2(p, answers, today);
  return predictRace(sport, String(answers.format || ""), String(answers.intent || "") || undefined, finalRefs, {
    pctLoad: pg.pctLoad,
    streakWeeks: pg.streakWeeks,
    courseProfile: String(answers.course_profile || "") || undefined, // R6 — profil du parcours (Profil)
  });
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
  importFit: importFitBytes,
  sessionNutrition: nutritionForSession,
  dailyEnergy: dailyEnergyV2,
  version: "v2-sprint9",
};
