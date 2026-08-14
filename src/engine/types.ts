/**
 * Types du moteur V2 — Sprint 1.
 *
 * CONTRAT DE COMPATIBILITÉ : le moteur V2 émet des plans à la forme V1Plan
 * (mêmes semaines/jours/séances/steps que Coach_Pro_V1.5) pour que l'auditeur
 * de src/audit/ les valide SANS modification — l'auditeur est la spec.
 */
export type { V1Plan, V1Week, V1Day, V1Session, V1Step } from "../harness/v1Harness.ts";
import type { MeasuredSnapshot } from "./measured.ts";
export type { MeasuredSnapshot, DoneSession } from "./measured.ts";

export type Sport = "run" | "bike" | "swim" | "tri" | "trail" | "duathlon" | "swimrun";
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
  /**
   * R6 §3 — instantané de ce qui a été RÉELLEMENT fait (import souverain de fichiers, saisie,
   * ou connecteur optionnel). Namespace séparé, jamais fusionné dans les champs déclarés :
   * une observation ne remplace jamais une contrainte. Absent = comportement d'avant.
   */
  measured?: MeasuredSnapshot | null;
  /** R11.7 — périodisation sur le cycle : date du 1er jour des dernières règles + longueur. */
  cycle_sync?: string;
  cycle_start?: string;
  cycle_len?: string;
  /** R12.1 — la montée VÉCUE d'où l'on déduit la VAM (personne ne connaît sa VAM). */
  climb_dplus_m?: string;
  climb_min?: string;
  sessions_max?: string;
  dispo?: string; // "semaine" | "quotidienne" | …
  shift_ok?: string;
  off_which?: string; // "Lun,Mer" — jours bloqués
  injury?: string; // "genou,tibia" | "aucune" (+ quadriceps/cheville/fascia en trail)
  // ---- R7 TRAIL : l'objectif est décrit par ses DONNÉES, pas par un format ----
  race_distance_km?: string;
  race_dplus_m?: string; // LA donnée centrale d'une prépa trail
  race_dmoins_m?: string; // par défaut = D+ (parcours en boucle)
  race_altitude_max_m?: string;
  race_cutoff_h?: string; // barrière horaire globale
  race_technicity?: string; // roulant | mixte | technique | alpin
  race_night?: string; // non | partielle | majoritaire
  vam_known?: string;
  vam?: string; // vitesse ascensionnelle seuil (m D+/h) — la référence d'intensité EN MONTÉE
  train_dplus_access?: string; // montagne | collines | plat — la contrainte la plus déterminante
  train_dplus_travel_min?: string;
  poles?: string; // oui | non | a_decider
  treadmill?: string; // tapis inclinable disponible
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
  /** R6.2/R6.3 (audit v6) — facteur blessures × âge, appliqué sur peakH APRÈS la sonde de capacité. */
  loadFactor: number;
  /** R7 TRAIL — objectif décodé (catégorie déduite, temps estimé, VAM) et cibles verticales. */
  trail?: import("./trailModel.ts").TrailObjective;
  trailVert?: { dplusPeak: number; dmoinsPeak: number; capped: boolean; accessCap: number };
  /** T4 — plafond de la sortie longue, en % du temps de course estimé (0 hors trail). */
  trailLongCapMin?: number;
  baseRefs: { ftp: number; thrPace: number; css: number };
  hz: Record<string, string> & { fcMax?: number };
  /**
   * R20.2 — LA CHAÎNE DE RÉDUCTION DU VOLUME, MAILLON PAR MAILLON.
   *
   * Le raisonnement calcule `min(volMax, caps, util) × marge × récup × tempsDansLEau` et n'en
   * garde que le résultat : en aval, le générateur constatait un pic bas sans pouvoir dire
   * POURQUOI, et la question « volume max ? » restait posée comme si elle décidait alors
   * qu'au-delà d'un seuil elle ne décidait plus rien (O-10).
   *
   * Garder les maillons séparés permet au générateur de dire la vérité sur le pic. Les deux
   * NATURES ne se traitent pas pareil (DOC_UNIQUE §2, 14/08/2026) : les PLAFONDS (declared,
   * caps, util, c20 — plus la rampe et la sonde structurelle, mesurées côté générateur) sont
   * PARALLÈLES — un min(), dont l'argmin est CE QUI BORNE, les autres contribuant zéro — et
   * les FACTEURS (marg, recup, swimTime, med, load) composent réellement, en produit. Ma
   * première écriture traitait les plafonds en chaîne séquentielle : l'attribution dépendait
   * de l'ORDRE des appels (permuter caps/util changeait le coupable sur le même plan), et la
   * « plus grosse baisse » se faisait passer pour « ce qui borne » — un plafond à 13 h annoncé
   * comme la borne d'un pic à 7,5 h. Ces valeurs ne changent aucun calcul : elles rendent le
   * calcul explicable, et le record `plan._r202` les expose pour que T-25/T-26 les vérifient.
   */
  volLimits: {
    declared: number;    // h — `vol_max` tel que l'athlète l'a demandé (plafond)
    caps: number;        // h — plafond de l'historique
    util: number;        // h — volume utile du format (au-delà, les heures ne servent plus l'objectif)
    marg: number;        // × — marge de sécurité hors compétition
    recup: number;       // × — 1B : sommeil court / charge de vie lourde
    swimTime: number;    // × — le volume promis se convertit en temps DANS L'EAU
    med: number;         // × — drapeau médical (plan de maintien)
    c20: number;         // h — plafond STRUCTUREL C20 (nage débutant : nSess × durée C15), 0 si inactif
    sessionsMax: number; // séances/sem déclarées
    budget: number;      // séances/sem retenues (déclaré ∧ implicite du volume)
  };
}
