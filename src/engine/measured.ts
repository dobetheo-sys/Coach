/**
 * `measured` — L'INSTANTANÉ DE CE QUE L'ATHLÈTE A RÉELLEMENT FAIT (décisions produit R6, §2-§3).
 *
 * Trois règles fondent ce module, et aucune n'est négociable :
 *
 * 1. **Une observation ne remplace jamais une contrainte.** `vol_max`, `sessions_max`, `dispo`,
 *    `off_days`, `injury`, `history`, les drapeaux médicaux et l'objectif restent DÉCLARÉS : ce
 *    que quelqu'un a fait le mois dernier ne dit pas ce qu'il peut soutenir, et encore moins ce
 *    qu'il a le droit de faire. Seul `vol_recent` — le POINT DE DÉPART de la rampe R10 — est
 *    mesurable, et c'est le champ le plus souvent mal déclaré.
 *
 * 2. **Le moteur reste une fonction pure.** `measured` est un instantané de scalaires DÉRIVÉS,
 *    daté et versionné, rangé dans `answers.measured` — jamais un flux. C'est ce qui garde
 *    `audit_v7` possible : si la régénération cesse d'être reproductible, on perd la suite de
 *    régression sur 4 580 profils. Corollaire testé (`npm run demo:measured`) : **sans
 *    `measured`, le plan est EXACTEMENT celui d'avant.**
 *
 * 3. **La source est un adaptateur interchangeable.** Le moteur ne connaît que cet objet, jamais
 *    son origine. Voie par défaut : l'athlète apporte ses fichiers (FIT/GPX/TCX, export Garmin,
 *    saisie manuelle) — souverain, aucun plafond d'athlètes, aucune clause d'usage. Un
 *    connecteur de plateforme reste optionnel, par utilisateur, et le moteur ne doit JAMAIS
 *    supposer sa présence.
 */

export interface MeasuredSnapshot {
  updated_at: string;                     // ISO — date de l'instantané, pas de la dernière séance
  source: "fit_import" | "manual" | "connector";
  window_days: number;                    // fenêtre d'observation (28 par défaut)
  vol_min: number;                        // minutes réelles sur la fenêtre
  sessions: number;
  dplus_m?: number;
  split?: Record<string, number>;         // minutes par discipline
  longest_session_min?: number;
  /**
   * `high` : la fenêtre est couverte de bout en bout — la mesure vaut ce qu'elle dit.
   * `partial` : fenêtre incomplète ou sources mélangées — la mesure est un PLANCHER de ce qui a
   * été fait, jamais un plafond. L'arbitrage ci-dessous en tient compte.
   */
  confidence: "high" | "partial";
}

/** Séance réalisée, telle que la produit n'importe quel adaptateur (FIT, saisie, connecteur). */
export interface DoneSession { date: string; d: string; minutes: number; dplusM?: number }

const DAY_MS = 864e5;

/**
 * Construit l'instantané à partir des séances réalisées. Aucune magie : une somme sur une
 * fenêtre, et une confiance honnête sur la couverture de cette fenêtre.
 *
 * `confidence` vaut `high` quand les séances s'étalent sur au moins la moitié de la fenêtre —
 * en dessous, on a une photo d'un bout de mois, pas d'un mois, et on le dit.
 */
export function measuredFromSessions(
  sessions: DoneSession[] | null | undefined,
  todayISO: string,
  windowDays = 28,
  source: MeasuredSnapshot["source"] = "fit_import",
): MeasuredSnapshot | null {
  if (!sessions || !sessions.length) return null;
  const t0 = new Date(todayISO + "T00:00:00Z").getTime();
  if (!isFinite(t0)) return null;
  const from = t0 - (windowDays - 1) * DAY_MS;
  const inWin = sessions.filter((s) => {
    const t = new Date(String(s.date) + "T00:00:00Z").getTime();
    return isFinite(t) && t >= from && t <= t0 && Number(s.minutes) > 0;
  });
  if (!inWin.length) return null;
  const split: Record<string, number> = {};
  let vol = 0, dplus = 0, longest = 0;
  for (const s of inWin) {
    const m = Math.round(Number(s.minutes));
    vol += m;
    longest = Math.max(longest, m);
    dplus += Number(s.dplusM) > 0 ? Number(s.dplusM) : 0;
    split[s.d] = (split[s.d] || 0) + m;
  }
  const days = inWin.map((s) => new Date(String(s.date) + "T00:00:00Z").getTime()).sort((a, b) => a - b);
  const spanDays = Math.round((days[days.length - 1] - days[0]) / DAY_MS) + 1;
  return {
    updated_at: todayISO,
    source,
    window_days: windowDays,
    vol_min: vol,
    sessions: inWin.length,
    dplus_m: dplus > 0 ? Math.round(dplus) : undefined,
    split,
    longest_session_min: longest,
    confidence: spanDays >= windowDays / 2 ? "high" : "partial",
  };
}

/** Volume hebdomadaire moyen mesuré, en heures — l'unité de `vol_recent`. */
export function measuredWeeklyHours(m: MeasuredSnapshot | null | undefined): number | null {
  if (!m || !(m.vol_min > 0) || !(m.window_days > 0)) return null;
  return Math.round(((m.vol_min / m.window_days) * 7 / 60) * 10) / 10;
}

export interface VolRecentArbitration {
  hours: number | null;              // la valeur retenue pour la rampe R10
  declared: number | null;
  measured: number | null;
  source: "declare" | "mesure" | "aucun";
  why: string;                       // la phrase qui part dans `decisions[]` — jamais silencieux
}

/**
 * L'ARBITRAGE — un seul endroit dans le projet décide du point de départ de la rampe.
 *
 * - `confidence: "high"` → la mesure remplace la déclaration, dans les DEUX sens. C'est la
 *   raison d'être de l'ingestion : `vol_recent` est le champ le plus souvent mal estimé, et il
 *   commande les premières semaines du plan.
 * - `confidence: "partial"` → la fenêtre est incomplète, donc la mesure SOUS-COMPTE. Elle ne
 *   peut alors servir qu'à prouver que l'athlète en a fait PLUS qu'il ne le dit ; l'utiliser
 *   pour descendre reviendrait à alléger un plan sur une donnée manquante, pas sur un fait.
 * - Aucune mesure → comportement d'avant, à l'identique.
 *
 * Ce que l'arbitrage ne fait JAMAIS : toucher à `vol_max` ou à un autre plafond. Le point de
 * départ n'est pas la capacité — les plafonds déclarés continuent de borner le plan en aval.
 */
export function arbitrateVolRecent(
  declaredRaw: string | number | null | undefined,
  m: MeasuredSnapshot | null | undefined,
): VolRecentArbitration {
  const dec = parseFloat(String(declaredRaw ?? ""));
  const declared = isFinite(dec) && dec > 0 ? dec : null;
  const meas = measuredWeeklyHours(m);
  if (meas == null) {
    return { hours: declared, declared, measured: null, source: declared == null ? "aucun" : "declare", why: "" };
  }
  const fmt = (h: number) => (Number.isInteger(h) ? h + "h" : Math.floor(h) + "h" + String(Math.round((h % 1) * 60)).padStart(2, "0"));
  if (m!.confidence === "high" || declared == null || meas > declared) {
    const why = declared == null
      ? "Départ calé sur " + fmt(meas) + "/sem mesurés sur tes " + m!.window_days + " derniers jours (" + m!.sessions + " séances importées) : tu n'avais pas déclaré de volume récent."
      : Math.abs(meas - declared) < 0.15
        ? ""
        : "Volume de départ ajusté de " + fmt(declared) + " déclarés à " + fmt(meas) + " mesurés sur tes " + m!.window_days + " derniers jours (" + m!.sessions + " séances importées)"
          + (m!.confidence === "partial" ? " — fenêtre incomplète, donc retenu seulement parce qu'il est PLUS haut que ta déclaration." : ".");
    return { hours: meas, declared, measured: meas, source: "mesure", why };
  }
  return {
    hours: declared, declared, measured: meas, source: "declare",
    why: "Tes imports ne couvrent qu'une partie des " + m!.window_days + " derniers jours : la mesure (" + fmt(meas)
      + "/sem) est plus basse que ta déclaration (" + fmt(declared) + "), mais une fenêtre incomplète ne prouve rien — c'est ta déclaration qui est retenue.",
  };
}
