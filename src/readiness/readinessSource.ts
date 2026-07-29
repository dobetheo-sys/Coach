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
  weather?: WeatherInfo; // prévision du jour (Open-Meteo côté app ; absent = pas d'effet)
  /** R4.5 — drapeau douleur actif (posé au feedback post-séance) : verrouille TOUTE
   *  intensité >Z2 tant qu'il n'est pas explicitement levé. Santé = priorité n°1. */
  painFlag?: boolean;
  painLocation?: string;
  /** R4.7 — RPE de la dernière séance validée (1-10) : un 8+ hier pèse sur aujourd'hui,
   *  et l'ajustement est ANNONCÉ (c'est la différence entre un PDF et un coach). */
  lastRpe?: number;
}

/** Météo du jour — manifeste §6 : canicule → repos/intensité réduite, chaleur → tôt le matin, pluie → surface. */
export interface WeatherInfo {
  tmaxC?: number;
  precipMm?: number;
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
 * - A4 (audit v6) : deux registres — un signal OBJECTIF négatif (HRV, FC repos, heures de
 *   sommeil mesurées) ne peut PAS être annulé par du déclaratif positif (énergie, ressenti,
 *   qualité de sommeil perçue) ; le subjectif ne fait alors qu'aggraver.
 * - information absente : le signal est nommé dans `drivers` s'il est exploitable avec un
 *   seuil absolu (FC repos), sinon il est simplement ignoré — jamais jeté en silence.
 */
export function assessReadiness(s: ReadinessSnapshot): ReadinessVerdict {
  const drivers: string[] = [];
  // A4 (audit v6) — DEUX REGISTRES SÉPARÉS. Un ressenti déclaratif ne peut pas effacer une
  // mesure : « HRV basse + je me sens bien » restait ORANGE au mieux, jamais VERTE (avant,
  // trois bonus subjectifs annulaient le −2 de la HRV et rendaient le verdict vert).
  let objectif = 0; // HRV, FC repos, heures de sommeil MESURÉES
  let subjectif = 0; // énergie, sensation, qualité de sommeil déclarée
  // R4.5 — douleur signalée : rouge FORCÉ, quels que soient les autres signaux. La qualité
  // (>Z2) est remplacée par de la récupération tant que le drapeau n'est pas levé.
  if (s.painFlag) {
    drivers.push("douleur signalée" + (s.painLocation ? " (" + s.painLocation + ")" : "") + " — intensité verrouillée, consulte médecin/kiné si ça persiste");
    return { level: "rouge", drivers };
  }
  // R4.7 — la séance d'hier était très dure (RPE ≥8) : signal de fatigue annoncé.
  if (s.lastRpe != null && s.lastRpe >= 8) { objectif -= 1; drivers.push("séance d'hier très dure (RPE " + s.lastRpe + "/10)"); }
  // A5 (audit v6) — une nuit VRAIMENT courte est un signal rouge en soi : 3h de sommeil
  // ne se compense pas par une bonne humeur (avant : orange seulement).
  if (s.sleepHours != null && s.sleepHours < 4.5) { objectif -= 3; drivers.push("nuit très courte (" + s.sleepHours + "h) — le sommeil est le premier levier de récupération"); }
  else if (s.sleepQuality === "mauvais" || (s.sleepHours != null && s.sleepHours < 5.5)) {
    if (s.sleepHours != null && s.sleepHours < 5.5) objectif -= 2; else subjectif -= 2;
    drivers.push("sommeil dégradé");
  } else if (s.sleepQuality === "moyen" || (s.sleepHours != null && s.sleepHours < 6.5)) {
    if (s.sleepHours != null && s.sleepHours < 6.5) objectif -= 1; else subjectif -= 1;
    drivers.push("sommeil moyen");
  } else if (s.sleepQuality === "bon") { subjectif += 1; drivers.push("sommeil bon"); }
  if (s.hrvStatus === "basse") { objectif -= 2; drivers.push("HRV sous ta moyenne 7j"); }
  else if (s.hrvStatus === "haute") { objectif += 1; drivers.push("HRV au-dessus de ta moyenne"); }
  if (s.energy != null) {
    if (s.energy < 25) { subjectif -= 2; drivers.push("énergie très basse (" + s.energy + "/100)"); }
    else if (s.energy < 45) { subjectif -= 1; drivers.push("énergie basse (" + s.energy + "/100)"); }
    else if (s.energy >= 70) { subjectif += 1; drivers.push("énergie haute (" + s.energy + "/100)"); }
  }
  // A6 (audit v6) — la FC de repos ne se perd plus faute de baseline : baseline connue →
  // comparaison relative (+8%) ; sinon seuil absolu prudent (≥70 bpm au réveil chez un
  // athlète d'endurance mérite au moins un orange), et le signal est NOMMÉ dans les drivers.
  if (s.restingHr != null) {
    if (s.restingHrBaseline != null) {
      if (s.restingHr >= s.restingHrBaseline * 1.08) {
        objectif -= 2;
        drivers.push("FC repos élevée (" + s.restingHr + " vs " + s.restingHrBaseline + " bpm habituels)");
      }
    } else if (s.restingHr >= 70) {
      objectif -= 2;
      drivers.push("FC repos élevée au réveil (" + s.restingHr + " bpm, sans historique de comparaison — renseigne-la quelques matins pour affiner)");
    } else if (s.restingHr >= 60) {
      objectif -= 1;
      drivers.push("FC repos un peu haute (" + s.restingHr + " bpm, pas encore de moyenne personnelle)");
    }
  }
  if (s.feel === "fatigue") { subjectif -= 1; drivers.push("sensation de fatigue déclarée"); }
  else if (s.feel === "frais") { subjectif += 1; drivers.push("sensation de fraîcheur"); }

  // A4 — quand la mesure est négative, le déclaratif ne peut qu'AGGRAVER, jamais compenser.
  const score = objectif + (objectif < 0 ? Math.min(0, subjectif) : subjectif);
  const level: ReadinessLevel = score <= -3 ? "rouge" : score <= -1 ? "orange" : "verte";
  if (!drivers.length) drivers.push("aucun signal : on suit le plan");
  return { level, drivers };
}

/** Clés reconnues d'une photo du matin — toute autre clé est une ERREUR DE CÂBLAGE :
 *  sans cette validation, une faute de frappe côté UI faisait disparaître un signal de
 *  sécurité en silence (audit v6). En dev, on veut du bruit ; en prod, une trace. */
export const SNAPSHOT_KEYS = [
  "date", "sleepQuality", "sleepHours", "hrvStatus", "restingHr", "restingHrBaseline",
  "energy", "feel", "completed", "weather", "painFlag", "painLocation", "lastRpe",
] as const;
export function validateSnapshot(s: Record<string, unknown>): string[] {
  return Object.keys(s || {}).filter((k) => !(SNAPSHOT_KEYS as readonly string[]).includes(k));
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
