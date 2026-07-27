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

export interface RawSession {
  d: string; // rn | bk | sw | br | rs
  name: string;
  det: string;
}

export type Confidence = "full" | "partial" | "nominal" | "rest";

export interface SessionLoad {
  minutes: number;
  meters: number | null; // natation uniquement
  confidence: Confidence;
  flags: string[];
}

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

/** Charge d'une séance V1 : minutes prescrites totales + traçabilité du parsing. */
export function sessionLoad(s: RawSession): SessionLoad {
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
    return { minutes, meters, confidence: allParsed && paceMatch ? "full" : "partial", flags };
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
