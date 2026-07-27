/**
 * Source de readiness ENFICHABLE — Sprint 2 (roadmap amendée).
 *
 * ⚠️ L'accès Garmin Health API (HRV/Body Battery/Training Readiness) est un programme
 * B2B sous agrément, non garanti. L'architecture rend la source interchangeable :
 *   1. Saisie manuelle (MVP, ici) — « comment as-tu dormi ? / FC du matin / énergie »
 *   2. Upload FIT (à venir)
 *   3. API Garmin (si accès accordé)
 * La logique d'ajustement (dailyAdjuster) ne dépend JAMAIS de la provenance des chiffres.
 */

export type SleepQuality = "bon" | "moyen" | "mauvais";
export type HrvStatus = "basse" | "normale" | "haute"; // vs moyenne glissante 7j de l'athlète
export type Feel = "frais" | "normal" | "fatigue";

export interface CompletedSession {
  date: string; // ISO
  d: "rn" | "bk" | "sw" | "br" | "rs";
  minutes: number;
  intensity?: "facile" | "moderee" | "difficile";
}

/** Photo du matin — tous les champs optionnels sauf la date : la source remplit ce qu'elle sait. */
export interface ReadinessSnapshot {
  date: string; // ISO
  sleepQuality?: SleepQuality;
  sleepHours?: number;
  hrvStatus?: HrvStatus;
  restingHr?: number; // bpm du matin
  restingHrBaseline?: number; // moyenne habituelle
  energy?: number; // 0-100 (équivalent Body Battery)
  feel?: Feel;
  completed?: CompletedSession[]; // séances réellement effectuées (7 derniers jours)
}

export interface ReadinessSource {
  readonly name: string;
  getSnapshot(date: string): ReadinessSnapshot | null;
}

/** Verdict dérivé — la SEULE entrée du dailyAdjuster (agnostique de la source). */
export type ReadinessLevel = "verte" | "orange" | "rouge";
export interface ReadinessVerdict {
  level: ReadinessLevel;
  drivers: string[]; // pourquoi ce verdict — toujours explicable (manifeste)
}

/**
 * Verdict à partir d'une photo. Règles (roadmap) :
 * - HRV basse + sommeil mauvais → rouge (remplacer la qualité par de l'endurance)
 * - énergie très basse → rouge ; basse → orange
 * - FC repos élevée vs habitude (+8%) → au moins orange
 * - tout au vert (sommeil bon, HRV normale/haute, énergie haute) → verte, la qualité est GARDÉE
 * - information absente → prudence : jamais mieux que « orange » si un signal négatif existe
 */
export function assessReadiness(s: ReadinessSnapshot): ReadinessVerdict {
  const drivers: string[] = [];
  let score = 0; // négatif = fatigue
  if (s.sleepQuality === "mauvais" || (s.sleepHours != null && s.sleepHours < 5.5)) { score -= 2; drivers.push("sommeil dégradé"); }
  else if (s.sleepQuality === "moyen" || (s.sleepHours != null && s.sleepHours < 6.5)) { score -= 1; drivers.push("sommeil moyen"); }
  else if (s.sleepQuality === "bon") { score += 1; drivers.push("sommeil bon"); }
  if (s.hrvStatus === "basse") { score -= 2; drivers.push("HRV sous ta moyenne 7j"); }
  else if (s.hrvStatus === "haute") { score += 1; drivers.push("HRV au-dessus de ta moyenne"); }
  if (s.energy != null) {
    if (s.energy < 25) { score -= 2; drivers.push("énergie très basse (" + s.energy + "/100)"); }
    else if (s.energy < 45) { score -= 1; drivers.push("énergie basse (" + s.energy + "/100)"); }
    else if (s.energy >= 70) { score += 1; drivers.push("énergie haute (" + s.energy + "/100)"); }
  }
  if (s.restingHr != null && s.restingHrBaseline != null && s.restingHr >= s.restingHrBaseline * 1.08) {
    score -= 2;
    drivers.push("FC repos élevée (" + s.restingHr + " vs " + s.restingHrBaseline + " bpm habituels)");
  }
  if (s.feel === "fatigue") { score -= 1; drivers.push("sensation de fatigue déclarée"); }
  else if (s.feel === "frais") { score += 1; drivers.push("sensation de fraîcheur"); }

  const level: ReadinessLevel = score <= -3 ? "rouge" : score <= -1 ? "orange" : "verte";
  if (!drivers.length) drivers.push("aucun signal : on suit le plan");
  return { level, drivers };
}

/** MVP — saisie manuelle : trois questions au réveil suffisent. */
export class ManualEntrySource implements ReadinessSource {
  readonly name = "saisie-manuelle";
  private entries = new Map<string, ReadinessSnapshot>();
  record(snapshot: ReadinessSnapshot): void {
    this.entries.set(snapshot.date, snapshot);
  }
  getSnapshot(date: string): ReadinessSnapshot | null {
    return this.entries.get(date) ?? null;
  }
}
