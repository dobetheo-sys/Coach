/**
 * Objet COURSE swimrun (§R10.3.2) — construit sur le modèle exact de `trailObjective` : le
 * format seul ne suffit pas, ce sont les DONNÉES de l'épreuve qui dimensionnent la préparation.
 *
 * Le temps estimé se décompose en TROIS POSTES, jamais un bloc :
 *     temps_total = temps_nage + temps_course + temps_transitions
 * Les transitions sont un poste à part entière (§R10.3.7) : à 20 transitions et 2 min l'unité,
 * c'est 40 min — plus que ce que la plupart des binômes croient perdre sur toute la course.
 */
import type { AthleteProfile } from "../../engine/types.ts";
import {
  S1_RACE_DEFAULTS, S4_GEAR_FACTORS, S5_TRANSITION_MIN, S6_TEAM, S7_COLD,
  SWIM_TIME_SHARE_HINT, type SwimrunCategory,
} from "./tables.ts";

export interface SwimrunObjective {
  category: SwimrunCategory;
  swimTotalM: number;
  runTotalKm: number;
  dplusM: number;
  segments: number;
  transitions: number;
  longestSwimM: number;
  waterTempC: number | null;
  teamMode: "solo" | "binome";
  /** Allure de nage EN TENUE (s/100 m) et allure de course EN TENUE (s/km). */
  swimPaceSec: number;
  runPaceSec: number;
  /** `false` = valeurs estimées d'un repli : à mentionner PARTOUT où elles apparaissent. */
  paceKnown: boolean;
  swimMin: number;
  runMin: number;
  transitionMin: number;
  totalMinLo: number;
  totalMinMid: number;
  totalMinHi: number;
  /** Part de nage dans le TEMPS (pas dans la distance) — le chiffre qui surprend. */
  swimTimeShare: number;
  why: string;
}

// Noms préfixés : le bundle concatène tout dans une portée unique (garde-fou de collision
// dans buildApp.mjs) — `num` et `paceToSec` existent déjà dans trailModel.
const srNum = (v: unknown): number => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Parseur local (évite une dépendance circulaire) : « 1:45 » / « 1'45 » → secondes. */
function srPaceToSec(v: unknown, max: number): number {
  const m = String(v ?? "").trim().match(/^(\d{1,3})\s*[:h.'′]\s*(\d{1,2})$/);
  if (!m) {
    const plain = srNum(v);
    return plain > 0 && plain <= max ? plain : 0;
  }
  const sec = +m[2];
  if (sec > 59) return 0;
  const t = +m[1] * 60 + sec;
  return t > 0 && t <= max ? t : 0;
}

/** Catégorie DÉDUITE des données réelles, jamais demandée : c'est le volume qui décide. */
function deduceCategory(swimM: number, runKm: number): SwimrunCategory {
  const total = runKm + swimM / 1000 * 4; // 1 km nagé ≈ 4 km couru en temps
  if (total >= 55) return "championship";
  if (total >= 28) return "series";
  if (total >= 13) return "sprint";
  return "experience";
}

export function swimrunObjective(a: AthleteProfile): SwimrunObjective {
  // Le format déclaré ne sert que de source de VALEURS PAR DÉFAUT : dès que l'athlète donne
  // les chiffres de sa course, ce sont eux qui comptent.
  const declared = (a.format as SwimrunCategory) || "sprint";
  const def = S1_RACE_DEFAULTS[declared] || S1_RACE_DEFAULTS.sprint;
  const swimTotalM = Math.max(200, srNum(a.swim_total_m) || def.swimM);
  const runTotalKm = Math.max(1, srNum(a.run_total_km) || def.runKm);
  const dplusM = srNum(a.race_dplus_m) > 0 ? srNum(a.race_dplus_m) : def.dplusM;
  const segments = Math.max(1, Math.round(srNum(a.segments_n) || def.segments));
  const transitions = segments * 2; // une entrée + une sortie d'eau par segment nagé
  const longestSwimM = Math.max(50, srNum(a.longest_swim_m) || def.longestSwimM);
  const waterTempC = srNum(a.water_temp_c) > 0 ? srNum(a.water_temp_c) : null;
  const teamMode: "solo" | "binome" = a.team_mode === "solo" ? "solo" : "binome";
  const category = deduceCategory(swimTotalM, runTotalKm);
  const level = a.level || "inter";

  // ---- Références EN TENUE : mesurées si le test est fait, estimées sinon (§R10.3.3) ----
  const measuredSwim = srPaceToSec(a.swimrun_swim_pace, 400);
  const measuredRun = srPaceToSec(a.swimrun_run_pace, 1200);
  const paceKnown = measuredSwim > 0 && measuredRun > 0;
  const cssSec = srPaceToSec(a.css, 300) || 130;
  const roadSec = srPaceToSec(a.pace, 1200) || (level === "debutant" ? 390 : level === "avance" ? 280 : 330);
  let swimPaceSec = measuredSwim || Math.round(cssSec * S4_GEAR_FACTORS.swim);
  let runPaceSec = measuredRun || Math.round(roadSec * S4_GEAR_FACTORS.run);

  // ---- Binôme : l'effet de longe est CALCULÉ (S6), pas mentionné ----
  if (teamMode === "binome") {
    // Le suiveur drafte, et attachée l'équipe se rapproche du nageur le plus rapide : la
    // vitesse d'équipe est donc meilleure que la moyenne des deux, sans atteindre le plus fort.
    const gap = srNum(a.team_swim_gap_sec); // écart déclaré (s/100 m) entre les deux
    if (gap > 0) {
      const pull = gap * (1 - S6_TEAM.fasterSwimmerWeight); // ce que le plus lent concède encore
      swimPaceSec = Math.round(swimPaceSec + pull - Math.min(S6_TEAM.swimSecPer100mGain, gap * 0.5));
    } else {
      swimPaceSec = Math.max(60, swimPaceSec - Math.round(S6_TEAM.swimSecPer100mGain * 0.4));
    }
  }

  // ---- Les trois postes ----
  const swimMin = (swimTotalM / 100) * swimPaceSec / 60;
  // Le terrain est du TRAIL : le D+ coûte du temps (repère usuel ~350-450 m/h en nature).
  const runMin = (runTotalKm * runPaceSec) / 60 + (dplusM / 400) * 60 * 0.6;
  const transitionMin = transitions * (S5_TRANSITION_MIN[level] ?? 1.5);
  // Le froid dégrade la nage : sous le seuil d'acclimatation, on l'ANNONCE dans l'estimation.
  const coldF = waterTempC != null && waterTempC < S7_COLD.acclimationBelowC ? 1.06 : 1;
  const mid = (swimMin * coldF + runMin + transitionMin);
  // Fourchette LARGE et annoncée comme telle, exactement comme le trail : afficher une
  // fourchette serrée sur une épreuve où le terrain, l'eau et le binôme commandent serait
  // le mensonge. Elle se resserre un peu quand les références sont MESURÉES en tenue.
  const spread = (category === "experience" || category === "sprint" ? 0.13 : 0.2) * (paceKnown ? 0.8 : 1.15);

  return {
    category, swimTotalM, runTotalKm, dplusM, segments, transitions, longestSwimM, waterTempC, teamMode,
    swimPaceSec, runPaceSec, paceKnown,
    swimMin: Math.round(swimMin * coldF), runMin: Math.round(runMin), transitionMin: Math.round(transitionMin),
    totalMinLo: Math.round(mid * (1 - spread)), totalMinMid: Math.round(mid), totalMinHi: Math.round(mid * (1 + spread)),
    swimTimeShare: Math.max(0.05, Math.min(0.7, (swimMin * coldF) / Math.max(1, mid))),
    why: swimTotalM + " m nagés + " + runTotalKm + " km courus (" + dplusM + " m D+) en "
      + segments + " segments = " + transitions + " transitions · "
      + (paceKnown
        ? "tes allures MESURÉES en tenue"
        : "allures ESTIMÉES depuis ton CSS et ton allure route (facteurs de repli) — fais le test en tenue complète pour les affiner")
      + (teamMode === "binome" ? " · en binôme, effet de longe compris" : " · en solo")
      + (coldF > 1 ? " · eau froide (+6 % sur la nage)" : ""),
  };
}

/** Part de nage attendue dans le temps, par catégorie — repère affiché quand rien n'est saisi. */
export function swimTimeShareHint(cat: SwimrunCategory): number {
  return SWIM_TIME_SHARE_HINT[cat] ?? 0.3;
}
