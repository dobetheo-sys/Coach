/**
 * loadModel — quantification de charge par séance (Sprint 0 : durée prescrite).
 *
 * FONDATION PARTAGÉE : la progression (+10%), le ratio aiguë/chronique (audit)
 * et CTL/ATL (analytics) dépendent tous du même métrique. Sprint 0 quantifie la
 * durée totale prescrite ; la pondération par intensité (TSS-like) viendra ensuite.
 *
 * Règle cardinale (note.md) : SOMMER réellement la séance —
 * N×M min + minutes isolées + échauffement/retour au calme + récup entre blocs —
 * jamais le max isolé, qui sous-estime massivement les séances structurées.
 * Natation : sommer les mètres et convertir via l'allure X'YY/100m du texte.
 */

export interface RawStep {
  role: "warmup" | "body" | "cooldown";
  durationMin?: number;
  distanceM?: number;
  reps?: number;
  zone?: string | null;
  recoveryText?: string;
  leg?: "bike" | "run";
  d?: string;
  // R7 TRAIL — l'auditeur doit pouvoir MESURER les deux axes verticaux, sinon il ne peut
  // pas vérifier les règles de dénivelé (T3/T4/T5) : elles resteraient déclaratives.
  gradient?: "up" | "down" | "flat" | "rolling";
  dplusM?: number;
  dmoinsM?: number;
  mode?: "run" | "hike" | "run_hike";
}

export interface RawSession {
  d: string; // rn | bk | sw | br | rs
  name: string;
  det: string;
  steps?: RawStep[]; // V1.5 : structure chiffrée (prioritaire sur le texte)
  min?: number; // estimation propre du générateur — recoupée, jamais crue
}

export type Confidence = "full" | "partial" | "nominal" | "rest";

export interface SessionLoad {
  minutes: number;
  meters: number | null; // natation uniquement
  dplusM?: number; // R7 TRAIL — dénivelé positif de la séance (2e axe de charge)
  dmoinsM?: number; // R7 TRAIL — dénivelé négatif (3e axe : la charge excentrique)
  recoveryMin?: number; // récup inter-répétitions comptée dans minutes (écart de métrique documenté)
  confidence: Confidence;
  flags: string[];
  generatorMin?: number; // s.min du générateur, pour le recoupement d'estimateurs
}

/** Références athlète pour convertir les distances en temps (mêmes entrées que stepMin V1.5, arithmétique à nous). */
export interface AthleteRefs {
  cssSecPer100m: number; // natation
  thrPaceSecPerKm: number; // course (et CAP du brick)
}
export const DEFAULT_REFS: AthleteRefs = { cssSecPer100m: 130, thrPaceSecPerKm: 330 };

/** Durées nominales quand rien n'est parsable (séance sans volume prescrit). */
const NOMINAL_MIN: Record<string, number> = { rn: 40, bk: 60, sw: 30, br: 60, rs: 0 };
/** Allure de repli si aucune allure /100m dans le texte (nageur loisir prudent). */
const DEFAULT_SWIM_PACE_S_PER_100M = 130;

/** Segments descriptifs sans volume additif propre (suffixes, consignes). */
const STOPWORD_SEGMENT = /^(termine par|navigation|endurance$|fractionne|familiarisation|souple |éducatifs @|mobilité|étirements|repos|marche|allure )/i;

const mid = (a: number, b?: number): number => (b !== undefined && !Number.isNaN(b) ? (a + b) / 2 : a);

/** "2min30" → 2.5 ; "6-10min" → 8 ; "45min" → 45. Utilisé sur un texte déjà nettoyé. */
const RE_REPS_MIN = /(\d+)\s*[×x]\s*(\d+)(?:-(\d+))?\s*min(\d{2})?/g;
const RE_LONE_MIN = /(\d+)(?:-(\d+))?\s*min(\d{2})?\b/g;
const RE_REPS_M = /(\d+)(?:-(\d+))?\s*[×x]\s*(\d+)\s*m\b(?!in)/g;
const RE_LONE_M = /(\d+)\s*m\b(?!in)/g;
const RE_PACE_100 = /(\d+)'(\d{2})\/100m/;

interface SegmentTime {
  minutes: number;
  parsed: boolean;
}

/** Extrait la récup entre blocs "(récup 2-3min ...)" / "(récup 15-20s ...)" en minutes unitaires. */
function extractRecovery(segment: string): { perBlockMin: number; cleaned: string } {
  const m = segment.match(/\((?:récup|repos)\s+([^()]*)/i);
  if (!m) return { perBlockMin: 0, cleaned: segment };
  const inner = m[1];
  let perBlockMin = 0;
  const asMin = inner.match(/(\d+)(?:-(\d+))?\s*min(\d{2})?/);
  const asSec = inner.match(/(\d+)(?:-(\d+))?\s*s\b/);
  if (asMin) {
    perBlockMin = mid(Number(asMin[1]), asMin[2] ? Number(asMin[2]) : undefined) + (asMin[3] ? Number(asMin[3]) / 60 : 0);
  } else if (asSec) {
    perBlockMin = mid(Number(asSec[1]), asSec[2] ? Number(asSec[2]) : undefined) / 60;
  }
  // Retire le parenthétique récup (gère la parenthèse imbriquée résiduelle)
  const cleaned = segment.replace(/\((?:récup|repos)[^()]*(?:\([^()]*\))?[^()]*\)?/gi, " ");
  return { perBlockMin, cleaned };
}

/** Temps prescrit d'un segment pour les sports en minutes (rn/bk/br/rs). */
function segmentMinutes(segRaw: string): SegmentTime {
  const seg = segRaw.trim();
  if (!seg || STOPWORD_SEGMENT.test(seg)) return { minutes: 0, parsed: true };

  const { perBlockMin, cleaned } = extractRecovery(seg);
  let text = cleaned
    .replace(/\([^()]*\)/g, " ") // parenthétiques restants
    .replace(/derniers?\s+\d+(?:-\d+)?\s*min/gi, " "); // "derniers 15-20min" = sous-ensemble de la durée principale

  let total = 0;
  let reps = 0;
  let parsedAny = false;

  text = text.replace(RE_REPS_MIN, (_all, r, m1, m2, sec) => {
    const n = Number(r);
    reps = Math.max(reps, n);
    total += n * (mid(Number(m1), m2 ? Number(m2) : undefined) + (sec ? Number(sec) / 60 : 0));
    parsedAny = true;
    return " ";
  });
  text.replace(RE_LONE_MIN, (_all, m1, m2, sec) => {
    total += mid(Number(m1), m2 ? Number(m2) : undefined) + (sec ? Number(sec) / 60 : 0);
    parsedAny = true;
    return " ";
  });

  if (reps > 1) total += perBlockMin * (reps - 1);
  return { minutes: total, parsed: parsedAny || total > 0 };
}

/** Mètres prescrits d'un segment natation (+ récup en secondes convertie). */
function segmentSwim(segRaw: string): { meters: number; recoveryMin: number; parsed: boolean } {
  let seg = segRaw.trim();
  if (!seg || STOPWORD_SEGMENT.test(seg)) return { meters: 0, recoveryMin: 0, parsed: true };

  // "nage continue fractionnée (ex 8-12×50m)" : le volume réel est dans le parenthétique
  const ex = seg.match(/\(ex\s+([^)]*)\)/i);
  if (ex) seg = seg.replace(/\(ex\s+[^)]*\)/i, " " + ex[1] + " ");

  const { perBlockMin, cleaned } = extractRecovery(seg);
  let text = cleaned.replace(/\([^()]*\)/g, " ").replace(/\/100m/g, " "); // ne pas compter le "100m" des allures

  let meters = 0;
  let reps = 0;
  let parsedAny = false;

  text = text.replace(RE_REPS_M, (_all, r1, r2, m1) => {
    const n = mid(Number(r1), r2 ? Number(r2) : undefined);
    reps = Math.max(reps, Math.round(n));
    meters += n * Number(m1);
    parsedAny = true;
    return " ";
  });
  text.replace(RE_LONE_M, (_all, m1) => {
    meters += Number(m1);
    parsedAny = true;
    return " ";
  });

  const recoveryMin = reps > 1 ? perBlockMin * (reps - 1) : 0;
  return { meters, recoveryMin, parsed: parsedAny || meters > 0 };
}

/** Récup inter-blocs depuis recoveryText V1.5 ("2min trot", "15-20s", "repos libre…") en minutes. */
function recoveryMinFromText(txt: string | undefined): number {
  if (!txt) return 0;
  const asMin = txt.match(/(\d+)(?:-(\d+))?\s*min(\d{2})?/);
  if (asMin) return mid(Number(asMin[1]), asMin[2] ? Number(asMin[2]) : undefined) + (asMin[3] ? Number(asMin[3]) / 60 : 0);
  const asSec = txt.match(/(\d+)(?:-(\d+))?\s*s\b/);
  if (asSec) return mid(Number(asSec[1]), asSec[2] ? Number(asSec[2]) : undefined) / 60;
  return 0; // "repos libre" et consorts : non chiffré, non compté
}

/** Minutes d'un step (hors récup), discipline du step ou de la séance. */
function stepMinutes(st: RawStep, sessionD: string, refs: AthleteRefs): number {
  const reps = st.reps || 1;
  if (st.durationMin) return reps * st.durationMin;
  if (st.distanceM) {
    const d = st.d || sessionD;
    if (d === "sw") return (reps * st.distanceM * refs.cssSecPer100m) / 100 / 60;
    return (reps * st.distanceM * refs.thrPaceSecPerKm) / 1000 / 60;
  }
  return 0;
}

/**
 * Chemin structuré V1.5 : somme des steps + récup inter-blocs.
 * Différence méthodologique ASSUMÉE avec le stepMin du générateur : nous comptons
 * la récup entre répétitions (N-1 × récup), lui non — l'écart est un constat, pas un bug.
 * Échauffement chiffré : même clamp que renderSess (≤25min, ≤ corps) pour comparer à périmètre égal.
 */
export function sessionLoadFromSteps(s: RawSession, refs: AthleteRefs): SessionLoad {
  const flags: string[] = [];
  const steps = s.steps || [];
  const bodies = steps.filter((x) => x.role === "body");
  let bodyMin = 0;
  let recovery = 0;
  let meters = 0;
  for (const b of bodies) {
    bodyMin += stepMinutes(b, s.d, refs);
    const reps = b.reps || 1;
    if (reps > 1) recovery += recoveryMinFromText(b.recoveryText) * (reps - 1);
    if ((b.d || s.d) === "sw" && b.distanceM) meters += (b.reps || 1) * b.distanceM;
  }
  let auxMin = 0;
  for (const st of steps) {
    if (st.role === "body") continue;
    if (st.role === "warmup" && st.durationMin != null) {
      auxMin += Math.min(st.durationMin, 25, Math.max(3, Math.round(bodyMin) || st.durationMin));
    } else {
      auxMin += stepMinutes(st, s.d, refs);
    }
    if ((st.d || s.d) === "sw" && st.distanceM) meters += st.distanceM;
  }
  const minutes = bodyMin + recovery + auxMin;
  if (bodies.length > 0 && bodies.every((b) => b.durationMin == null && b.distanceM == null)) {
    flags.push("séance à steps sans durée ni distance chiffrée : « " + s.name + " »");
  }
  if (typeof s.min === "number" && s.min > 0) {
    const delta = minutes - s.min;
    if (Math.abs(delta) > Math.max(10, s.min * 0.25)) {
      flags.push("écart estimateur : nous " + minutes.toFixed(0) + "min vs générateur " + s.min + "min (« " + s.name + " »)");
    }
  }
  const dplusM = steps.reduce((t, x) => t + (x.dplusM || 0) * (x.reps || 1), 0);
  const dmoinsM = steps.reduce((t, x) => t + (x.dmoinsM || 0) * (x.reps || 1), 0);
  return {
    minutes,
    meters: s.d === "sw" || meters > 0 ? meters || null : null,
    dplusM: dplusM || undefined,
    dmoinsM: dmoinsM || undefined,
    recoveryMin: recovery,
    confidence: "full",
    flags,
    generatorMin: s.min,
  };
}

/** Charge d'une séance : chemin structuré V1.5 si steps présents, sinon parsing texte (endurabuild-3). */
export function sessionLoad(s: RawSession, refs: AthleteRefs = DEFAULT_REFS): SessionLoad {
  if (s.steps && s.steps.length > 0 && s.d !== "rs") return sessionLoadFromSteps(s, refs);
  return sessionLoadFromText(s);
}

/** Répartition d'intensité d'une séance (manifeste : « répartition des intensités »).
 * Facile = échauffement/retour au calme/récup inter-blocs/zones easy-rec-z2 ;
 * modéré = tempo/sweetspot/race-pace/force/mara ; dur = vo2/seuil/vitesse/css + legs de brick. */
export interface IntensitySplit {
  easyMin: number;
  modMin: number;
  hardMin: number;
}
const HARD_SUFFIX = [".vo2", ".thr", ".speed", ".css"];
const MOD_SUFFIX = [".ss", ".rp", ".frc", ".mara"];
export function intensitySplit(s: RawSession, refs: AthleteRefs = DEFAULT_REFS): IntensitySplit {
  const out: IntensitySplit = { easyMin: 0, modMin: 0, hardMin: 0 };
  if (!s.steps || !s.steps.length || s.d === "rs") {
    out.easyMin = sessionLoad(s, refs).minutes; // texte/repos : compté facile (prudence)
    return out;
  }
  for (const st of s.steps) {
    const reps = st.reps || 1;
    const stMin = st.durationMin
      ? reps * st.durationMin
      : st.distanceM
        ? ((st.d || s.d) === "sw" ? (reps * st.distanceM * refs.cssSecPer100m) / 100 / 60 : (reps * st.distanceM * refs.thrPaceSecPerKm) / 1000 / 60)
        : 0;
    if (st.role !== "body") {
      out.easyMin += stMin;
      continue;
    }
    const zone = typeof st.zone === "string" ? st.zone : "";
    // Brick : legs classés par leur zone (bk.rp = modéré) ; le leg CAP « allure cible » = modéré.
    const cls = HARD_SUFFIX.some((z) => zone.endsWith(z))
      ? "hard"
      : MOD_SUFFIX.some((z) => zone.endsWith(z)) || st.leg === "run"
        ? "mod"
        : "easy";
    if (cls === "hard") out.hardMin += stMin;
    else if (cls === "mod") out.modMin += stMin;
    else out.easyMin += stMin;
    if (reps > 1) out.easyMin += recoveryMinFromText(st.recoveryText) * (reps - 1); // la récup est facile
  }
  return out;
}

/** Chemin texte historique (endurabuild-3, et recoupement) : minutes prescrites + traçabilité. */
export function sessionLoadFromText(s: RawSession): SessionLoad {
  const flags: string[] = [];
  const det = (s.det || "").split("— 💡")[0]; // la note pédago ne porte pas de volume
  const segments = det.split("·");

  if (s.d === "rs") {
    // Repos / renfo greffé : seules les minutes explicites comptent ("20min en fin de footing")
    let minutes = 0;
    for (const seg of segments) minutes += segmentMinutes(seg).minutes;
    return { minutes, meters: null, confidence: "rest", flags };
  }

  if (s.d === "sw") {
    let meters = 0;
    let recoveryMin = 0;
    let allParsed = true;
    for (const seg of segments) {
      const r = segmentSwim(seg);
      meters += r.meters;
      recoveryMin += r.recoveryMin;
      if (!r.parsed) allParsed = false;
    }
    if (meters === 0) {
      flags.push("natation sans métrage prescrit : « " + s.name + " » → nominal " + NOMINAL_MIN.sw + "min");
      return { minutes: NOMINAL_MIN.sw, meters: null, confidence: "nominal", flags };
    }
    const paceMatch = det.match(RE_PACE_100);
    let paceS = DEFAULT_SWIM_PACE_S_PER_100M;
    if (paceMatch) paceS = Number(paceMatch[1]) * 60 + Number(paceMatch[2]);
    else flags.push("allure /100m absente du texte → repli " + DEFAULT_SWIM_PACE_S_PER_100M + "s/100m");
    const minutes = (meters / 100) * (paceS / 60) + recoveryMin;
    return { minutes, meters, recoveryMin, confidence: allParsed && paceMatch ? "full" : "partial", flags };
  }

  // Sports en minutes : rn / bk / br
  let minutes = 0;
  let allParsed = true;
  for (const seg of segments) {
    const r = segmentMinutes(seg);
    minutes += r.minutes;
    if (!r.parsed) allParsed = false;
  }
  if (minutes === 0) {
    const nominal = NOMINAL_MIN[s.d] ?? 45;
    flags.push("séance sans durée prescrite : « " + s.name + " » (" + s.d + ") → nominal " + nominal + "min");
    return { minutes: nominal, meters: null, confidence: "nominal", flags };
  }
  return { minutes, meters: null, confidence: allParsed ? "full" : "partial", flags };
}
