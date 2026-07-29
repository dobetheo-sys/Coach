/**
 * Types du moteur V2 — Sprint 1.
 *
 * CONTRAT DE COMPATIBILITÉ : le moteur V2 émet des plans à la forme V1Plan
 * (mêmes semaines/jours/séances/steps que Coach_Pro_V1.5) pour que l'auditeur
 * de src/audit/ les valide SANS modification — l'auditeur est la spec.
 */
export type { V1Plan, V1Week, V1Day, V1Session, V1Step } from "../harness/v1Harness.ts";

export type Sport = "run" | "bike" | "swim" | "tri";
export type History = "reprise" | "confirme" | "ancien";
export type Level = "debutant" | "inter" | "avance";
export type Intent = "competition" | "finir" | "plaisir";

/** Miroir typé des clés S.answers utilisées par le moteur (mêmes noms qu'en V1.5). */
export interface AthleteProfile {
  sport: Sport;
  format: string;
  history?: History;
  level?: Level;
  intent?: Intent;
  vol_max?: string;
  vol_recent?: string; // R10 — volume moyen des 3-6 derniers mois (h/sem) : le POINT DE DÉPART de la montée en charge
  sessions_max?: string;
  dispo?: string; // "semaine" | "quotidienne" | …
  shift_ok?: string;
  off_which?: string; // "Lun,Mer" — jours bloqués
  injury?: string; // "genou,tibia" | "aucune"
  age?: string;
  hr_max?: string;
  hr_rest?: string;
  ftp_known?: string;
  ftp?: string;
  pace_known?: string;
  pace?: string; // "4:30" min/km au seuil
  css_known?: string;
  css?: string; // "1:55" par 100m
  race_date?: string;
  plan_start?: string; // ancre calendaire posée à la 1re génération (sinon la semaine 1 glisserait à chaque régénération)
  races?: string;
  race1_date?: string;
  race1_prio?: string;
  race2_date?: string;
  race2_prio?: string;
  sleep?: string; // "court" → volume réduit (1B)
  life_load?: string; // "lourde" → marge renforcée (1B)
  med_pain?: string;
  med_dizzy?: string;
  med_treat?: string;
  doubles?: string;
  terrain?: string;
  milieu?: string;
  epreuve?: string;
  swim_limit?: string;
  availability?: { day: string; status: string; durationMin?: number; load?: string }[];
  tests?: { type: string; date?: string; value: number }[];
}

/** Décision du moteur de raisonnement — le format {id, what, val, why} d'evalRules, étendu au plan entier. */
export interface Decision {
  id: string;
  what: string;
  val: string | number;
  why: string;
}

export interface Phase {
  id: "base" | "dev" | "spec" | "peak" | "taper";
  nom: string;
  pct: number;
  c: string;
  start: number;
  end: number;
  weeks: number;
}

/** Sortie du raisonnement : tout ce dont le générateur a besoin, chiffré et justifié. */
export interface ReasonedPlan {
  profile: AthleteProfile;
  decisions: Decision[];
  weeks: number;
  phases: Phase[];
  volPeak: number; // h — pic théorique affichable
  volBase: number;
  peakH: number; // h — pic de la courbe de charge (après C20/médical)
  sessionScale: number;
  use10: boolean;
  recupEvery: number;
  offDays: string[];
  budgetPerWeek: number; // séances actives max/semaine (budget déclaré ∧ implicite volume)
  maxRunDays: number | null; // run uniquement — plafond de jours d'impact
  medHold: boolean;
  beginner: boolean;
  finisher: boolean;
  comp: boolean;
  dbl: boolean;
  injuries: string[];
  /** R6 (audit v6) — lecture unique des blessures : localisations + drapeaux dérivés. */
  inj: import("./constraintMatrix.ts").InjuryInfo;
  /** Avertissements du raisonnement (blessures multiples, durée contrainte…) — fusionnés dans _v2.warnings. */
  warnings: string[];
  /** R6.3 (audit v6) — athlète mineur : aucune séance VO2max générée. */
  noVo2: boolean;
  /** C3 (audit v6) — course au-delà de 80 semaines : le plan s'ancre sur MAINTENANT, pas sur la course. */
  raceBeyondPlan: boolean;
  baseRefs: { ftp: number; thrPace: number; css: number };
  hz: Record<string, string> & { fcMax?: number };
}
