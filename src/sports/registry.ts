/**
 * REGISTRE DE SPORTS (spec R10, phase 1) — un sport = un module, plus une branche de `if`.
 *
 * Pourquoi : `buildSessions()` faisait ~230 lignes de `if (sp === …)` pour 4 sports, et une
 * douzaine d'autres passes portaient leur propre test de sport en dur. Le trail (R7) avait déjà
 * pris la bonne sortie — un module à part — et ce précédent a révélé le vrai problème : à
 * chaque sport ajouté, il faut se SOUVENIR de tous les tests à étendre. On ne s'en souvient
 * pas. La preuve, mesurée avant ce chantier :
 *   - le plafond de jours d'impact ne s'appliquait pas au trail (D10-3) : périostite = 5 jours
 *     d'appui au lieu de 3 ;
 *   - la répartition d'intensité ne connaissait pas ses zones (D10-6) : 100 % « facile » ;
 *   - le générateur de repli ne le connaissait pas non plus (TypeError, phase 0).
 *
 * Le gain de ce registre n'est donc pas l'élégance : c'est qu'un garde-fou de SÉCURITÉ ne peut
 * plus manquer un sport par oubli. Chaque module DÉCLARE ce qui s'applique à lui (`guards`), et
 * un sport inconnu lève au lieu de produire un plan silencieux.
 */
import type { AthleteProfile, ReasonedPlan, Sport, V1Session } from "../engine/types.ts";

export type Slot = "dur1" | "dur2" | "durLong" | "facileR" | "facile2" | "recup" | "off";

/** Erreur porteuse — même contrat que l'UI (`EBGenerationError`) : on échoue en le DISANT. */
export class UnknownSportError extends Error {
  readonly code = "SPORT_INCONNU";
  constructor(sport: string) {
    super("Sport inconnu : " + sport + " — aucun module de sport ne le déclare");
    this.name = "UnknownSportError";
  }
}

/**
 * Garde-fous déclarés par sport. Un drapeau à `true` fait s'appliquer une passe ; l'absence de
 * drapeau est un choix EXPLICITE, pas un oubli. Toute passe gardée par un test de sport en dur
 * doit migrer ici — c'est la règle qui empêche la classe de bug D10-3 de revenir.
 */
export interface SportGuards {
  /** Plafond de jours d'appui (impact). Course ET trail — et tout futur sport qui court. */
  runImpactCap?: boolean;
  /** Le medHold retire aussi la séance longue (le brick tri EST de l'intensité). */
  stripLongOnMedHold?: boolean;
  /** Un seul « VO2max course » par semaine de pic (C18b) — multi-discipline uniquement. */
  singleRunVo2PerWeek?: boolean;
  /** Le lissage de volume se mesure sur la métrique de l'auditeur (sports à distance : nage). */
  smoothOnAuditMetric?: boolean;
  /** Passes de nage : plafonds/planchers de séance en MÈTRES (C15/C24/C24b). */
  swimSessionFloors?: boolean;
  /** Sonde de capacité : la promesse de volume suit les plafonds de séance (V2.1). */
  capacityProbe?: boolean;
  /** Le volume promis se convertit en temps DANS L'EAU (`SWIM_TIME_FACTOR`). */
  swimTimeFactor?: boolean;
}

/** Contrat d'un module de sport. `null` = « utiliser le générique ». */
export interface SportModule {
  id: Sport;
  /** Discipline principale (`rn` · `bk` · `sw`) — remplace les mappings sport→discipline. */
  mainDiscipline: "rn" | "bk" | "sw";
  /** Toutes les disciplines du sport. R4.6 : chacune doit apparaître dans une semaine de
   *  charge — un plan de duathlon sans vélo n'est pas un plan dégradé, c'est un autre plan. */
  disciplines: ("rn" | "bk" | "sw")[];
  /** Créneau facile de repli quand un jour dur est déclassé (anti-collage, medHold). */
  easyFallbackSlot: "facile2" | "facileR";
  /** Schéma de semaine spécifique (charge + créneau par jour), ou `null` pour le générique. */
  weekSchema: ((phase: string, isRecup: boolean, r: ReasonedPlan) => { charge: string; slot: string }[]) | null;
  /** LE point d'extension principal : quelles séances pour ce créneau, cette phase. */
  buildSessions: (kit: SessionKit) => V1Session[];
  /** Prédiction de course — `null` = ce sport n'en fournit pas (encore). */
  predict: ((kit: PredictKit) => void) | null;
  /** Références à retester (UI : `typesForSport`). */
  retestTypes: string[];
  guards: SportGuards;
}

/**
 * Boîte à outils passée aux modules : tout ce que l'ancienne fonction monolithique avait dans
 * sa portée. Les modules la DÉSTRUCTURENT en une ligne, ce qui a permis de déplacer les corps
 * de séances sans en changer un caractère — condition de l'extraction mécanique (golden master).
 */
export interface SessionKit {
  r: ReasonedPlan;
  a: AthleteProfile;
  sp: string;
  fmt: string | undefined;
  slot: Slot;
  phase: string;
  prog: number;
  /** Numéro de semaine — le trail en a besoin (progression des côtes, répétitions ravito). */
  weekNum: number;
  lvl: string;
  finisher: boolean;
  beginner: boolean;
  medHold: boolean;
  dbl: boolean;
  sessionScale: number;
  inj: ReasonedPlan["inj"];
  noVo2: boolean;
  G: string;
  swimDrillGlossary: string;
  S2: V1Session[];
  P: (lo: number, hi: number) => number;
  W: (min: number, txt?: string) => import("../engine/types.ts").V1Step;
  Wm: (dist: number, txt?: string) => import("../engine/types.ts").V1Step;
  C: (min: number, txt?: string) => import("../engine/types.ts").V1Step;
  Cm: (dist: number, txt?: string) => import("../engine/types.ts").V1Step;
  B: (reps: number, dur: number, zone: string | null, recTxt?: string, sfx?: string) => import("../engine/types.ts").V1Step;
  Bd: (reps: number, dist: number, zone: string | null, recTxt?: string, sfx?: string, unitKm?: boolean, disc?: string) => import("../engine/types.ts").V1Step;
}

/**
 * Boîte à outils du PRÉDICTEUR — même principe que `SessionKit` : les fourchettes, le
 * formatage et le journal de décisions sont communs (les erreurs de méthode se paient
 * partout), la MÉTHODE est propre à chaque sport. Les modules poussent dans `items`,
 * `advice` et `decisions` ; ils ne retournent rien.
 */
export interface PredictKit {
  format: string;
  refs: { thrPace: number; ftp: number; css: number };
  items: { leg: string; value: string; why: string }[];
  advice: string[];
  D: (id: string, what: string, val: string, why: string) => void;
  /** Fourchette brute (secondes → texte). */
  range: (sec: number) => string;
  /** Fourchette course, élargie par le profil du parcours (PRED-parcours). */
  runRange: (sec: number) => string;
  riegelSec: (thrPace: number, km: number) => number;
  /** Mention « + vallonné (+3–6%) » à coller aux fourchettes course. */
  profWhy: string;
  /** Objectif SWIMRUN décodé (trois postes) — présent seulement pour ce sport. */
  swimrun?: {
    category: string; swimTotalM: number; runTotalKm: number; segments: number; transitions: number;
    longestSwimM: number; teamMode: string; paceKnown: boolean; swimMin: number; runMin: number;
    transitionMin: number; totalMinLo: number; totalMinMid: number; totalMinHi: number;
    swimTimeShare: number; why: string;
  };
}

const MODULES = new Map<string, SportModule>();

/** Enregistrement d'un module — appelé une fois par sport, à l'import. */
export function registerSport(mod: SportModule): void {
  MODULES.set(mod.id, mod);
}

/** Accès au module d'un sport. Lève sur un sport inconnu : jamais de plan par défaut. */
export function sportModule(sport: string): SportModule {
  const mod = MODULES.get(sport);
  if (!mod) throw new UnknownSportError(sport);
  return mod;
}

export function knownSports(): string[] {
  return [...MODULES.keys()];
}

/** Un garde-fou s'applique-t-il à ce sport ? Une seule façon de poser la question. */
export function guard(sport: string, flag: keyof SportGuards): boolean {
  return MODULES.get(sport)?.guards[flag] === true;
}
