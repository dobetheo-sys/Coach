/**
 * T-16d — LE VOLUME DE COURSE HEBDOMADAIRE D'UN PLAN, DÉFINI UNE SEULE FOIS.
 *
 * Cette grandeur pilote l'exposant de Riegel (R14 P5, B-21) : elle décide À LA FOIS de la bande
 * « allure du jour J » PRESCRITE dans le texte des séances (`raceRunBand`, via `refs.runMara`) et
 * du chrono PRÉDIT pour le leg de course (`predict()`, via `opts.runHoursPerWeek`). Les deux
 * doivent donc lire le MÊME nombre — sans quoi le plan promet une allure que sa propre prédiction
 * contredit.
 *
 * Ils ne le lisaient pas. Mesuré le 19/08/2026 sur un tri/M (`audit:r18` T-16c) :
 *
 *     bande prescrite    moyenne des minutes de course sur TOUTES les semaines construites
 *                        (générateur, avant le point fixe)          →  1,26 h/sem
 *     leg prédit         MÉDIANE des semaines dev/spec/peak hors récup
 *                        (`runHoursPerWeekOf`, dans le pont)        →  1,62 h/sem
 *
 * Deux STATISTIQUES différentes (moyenne / médiane) sur deux POPULATIONS différentes (toutes les
 * semaines / les seules semaines de charge des trois dernières phases). C'est la forme exacte que
 * ce dépôt a fermée treize fois sur des BORNES — « générateur et auditeur lisent la même source »
 * (T-28) — jamais encore sur une grandeur DESCRIPTIVE.
 *
 * La définition retenue est celle qui existait déjà et qui est la plus défendable : la MÉDIANE des
 * semaines de charge de dev/spec/peak. La médiane parce qu'une semaine tronquée ou une décharge
 * mal classée ne doit pas déplacer une grandeur qui décrit un régime ; ces trois phases parce que
 * l'exposant décrit l'athlète tel qu'il ARRIVE à sa course, pas tel qu'il a démarré.
 */

/** La forme minimale qu'un plan doit avoir pour que le volume de course s'y mesure. */
export interface VolumeReadableWeek {
  isRecup?: boolean;
  phase?: { id?: string };
  days: { sessions: { d?: string; race?: boolean; min?: number; steps?: { d?: string; reps?: number; durationMin?: number }[] }[] }[];
}

/** Minutes de COURSE À PIED d'une semaine — la course objectif et le repos exclus (R13.4). */
export function runMinutesOfWeek(wk: VolumeReadableWeek): number {
  let min = 0;
  for (const d of wk.days) for (const s of d.sessions) {
    if (s.d === "rs" || s.race) continue;
    if (s.d === "rn") { min += s.min || 0; continue; }
    for (const st of s.steps ?? [])
      if ((st.d || s.d) === "rn" && st.durationMin) min += (st.reps || 1) * st.durationMin;
  }
  return min;
}

/**
 * Heures de course par semaine de CHARGE (dev/spec/peak), en médiane. `null` quand la grandeur
 * n'est pas mesurable — jamais 0 : un zéro se lirait comme « il ne court pas », ce qui est un
 * fait, alors que l'absence de semaine de charge est une propriété du plan.
 */
export function runHoursPerWeekOf(plan: { weeks: VolumeReadableWeek[] }): number | null {
  const w = plan.weeks.filter((x) => !x.isRecup && ["dev", "spec", "peak"].includes(String(x.phase && x.phase.id)));
  if (!w.length) return null;
  const parSemaine = w.map(runMinutesOfWeek).sort((a, b) => a - b);
  const med = parSemaine[Math.floor(parSemaine.length / 2)] / 60;
  return med > 0 ? med : null;
}
