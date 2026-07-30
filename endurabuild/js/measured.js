// Ingestion des données RÉALISÉES, côté app (décisions produit R6, §2-§3).
//
// L'app tient le rôle d'ADAPTATEUR : elle rassemble ce que l'athlète a apporté (fichiers FIT
// importés au Profil, séances cochées ✓) et en dérive l'instantané `answers.measured` que le
// moteur consomme. Le moteur, lui, ne sait pas d'où ça vient — c'est ce qui permettra de
// remplacer la source (Garmin, Coros, saisie) sans toucher au planificateur.
//
// CADENCE (§3.3) : on ne recalibre PAS tous les matins. Un plan qui bouge chaque jour est
// anxiogène et invérifiable. L'instantané est figé et ne se rafraîchit qu'à deux moments :
// la première fois qu'on a des données, puis à chaque SEMAINE DE DÉCHARGE du mésocycle — le
// moment où un entraîneur fait précisément ce point.
import { S, ebSave, todayISO } from "./state.js";

const WINDOW_DAYS = 28;

/** Les séances réalisées connues de l'app, toutes sources confondues, dédoublonnées. */
export function doneSessions() {
  const out = [];
  const seen = new Set();
  for (const c of Array.isArray(S.answers.fitSessions) ? S.answers.fitSessions : []) {
    if (!c || !c.date || !(c.minutes > 0)) continue;
    const k = c.date + "|" + c.d + "|" + c.minutes;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ date: c.date, d: c.d, minutes: c.minutes });
  }
  return out;
}

/** L'instantané qu'on obtiendrait AUJOURD'HUI — sans rien écrire. */
export function previewMeasured(today) {
  if (!globalThis.EBV2 || !globalThis.EBV2.measuredFromSessions) return null;
  return globalThis.EBV2.measuredFromSessions(doneSessions(), today || todayISO(), WINDOW_DAYS, "fit_import");
}

/** Volume hebdo mesuré, en heures (ou null). */
export function measuredHours(m) {
  return globalThis.EBV2 && globalThis.EBV2.measuredWeeklyHours ? globalThis.EBV2.measuredWeeklyHours(m) : null;
}

/**
 * Applique la cadence de recalibration. Retourne `true` si l'instantané stocké a changé —
 * l'appelant invalide alors le plan UNE fois. Aucun effet sans données : c'est le cas de tous
 * les athlètes qui n'importent rien, et leur plan doit rester exactement celui d'avant.
 */
export function refreshMeasured(plan, today) {
  const t = today || todayISO();
  const snap = previewMeasured(t);
  if (!snap) return false;
  const cur = S.answers.measured || null;
  if (!cur) { S.answers.measured = snap; ebSave(); return true; }
  // Semaine de décharge en cours ? C'est LE moment du point d'étape.
  const wk = plan && plan.weeks ? plan.weeks.find((w) => w.days.some((d) => d.date === t)) : null;
  const isDeload = !!(wk && wk.isRecup);
  const ageDays = (new Date(t + "T00:00:00Z") - new Date(String(cur.updated_at) + "T00:00:00Z")) / 864e5;
  if (!isDeload || !(ageDays >= 7)) return false;
  if (cur.vol_min === snap.vol_min && cur.sessions === snap.sessions) { S.answers.measured = snap; ebSave(); return false; }
  S.answers.measured = snap;
  ebSave();
  return true;
}

/** Oublier la mesure : on retombe sur la déclaration, sans discussion. */
export function clearMeasured() {
  if (!S.answers.measured) return false;
  delete S.answers.measured;
  ebSave();
  return true;
}
