// R24.8 — « un résumé de chaque distance en km par discipline en haut de la page »
// (retour fondateur, 06/08/2026, onglet 📅 Semaine).
//
// RÈGLE D'HONNÊTETÉ, la même que P7/P8 : un step qui prescrit des MÈTRES compte exact ;
// un step en MINUTES est converti par une vitesse dérivée des références MESURÉES de
// l'athlète — pas de référence, pas de kilomètres : on rend le temps seul plutôt qu'un
// chiffre inventé, et le drapeau `approx` dit qu'une conversion a eu lieu (l'UI affiche « ~ »).
//
// LES VITESSES, et d'où elles viennent :
//  · course et natation — la vitesse d'une zone est le RAPPORT à la vitesse seuil (CSS en nage).
//    C'est la définition même de l'IF de course (rTSS, Skiba : IF = allure normalisée / allure
//    seuil). O-42 — CE FICHIER NE PORTE PLUS SA TABLE : elle valait `sw.easy` 0,80 quand `ZDEF`
//    définit cette zone à ×1,12 sur l'allure CSS, soit 0,893 en vitesse — 10,4 % d'écart, et
//    8 zones sur 9 divergeaient. Il y avait TROIS conversions pour une grandeur (celle-ci, celle
//    de `stepMin`, celle de `loadModel`), toutes différentes, et aucune n'était celle qui produit
//    les allures que l'athlète LIT. L'autorité est `ZDEF`, via `zoneSpeedRatio` (R11.1).
//  · vélo — la vitesse NE SUIT PAS la puissance linéairement : on résout le modèle de
//    Martin (cyclingSpeed.ts, PW) à la puissance de zone. Il exige le poids : sans poids
//    ou sans FTP, pas de km vélo — le temps reste affiché. `BIKE_POWER_RATIO` reste ici : c'est
//    un rapport de PUISSANCE, pas de vitesse — il entre DANS le modèle au lieu de s'y substituer.
import { solveSpeedMs, BIKE_SETUP } from "./cyclingSpeed.ts";
import { zoneSpeedRatio } from "../generator/renderer.ts";
import type { V1Week } from "../harness/v1Harness.ts";

/** O-42 — le ratio de la zone, dérivé de `ZDEF`. Une zone inconnue retombe sur l'endurance :
 *  c'est la zone la plus fréquente, et l'erreur est alors dans le sens qui SOUS-compte les km. */
const ratioZone = (zone: string | undefined, ref: "css" | "thrPace"): number =>
  zoneSpeedRatio(zone, undefined, ref) ?? zoneSpeedRatio(ref === "css" ? "sw.easy" : "rn.easy", undefined, ref)!;
// Puissance de zone vélo = fraction de FTP (centre des bandes du moteur — mêmes valeurs que
// la table d'intensité du monolithe, où elles sont un IF de PUISSANCE, ce qui est correct ici).
const BIKE_POWER_RATIO: Record<string, number> = { "bk.z2": 0.65, "bk.ss": 0.90, "bk.vo2": 1.12, "bk.frc": 0.82, "bk.rp": 0.84, "bk.thr": 1.0 };

export interface DisciplineDistance { d: string; min: number; km: number | null; approx: boolean }

interface StepLike { d?: string; zone?: string; role?: string; reps?: number; durationMin?: number; distanceM?: number; recoveryMin?: number }
interface AnswersLike { pace?: unknown; pace_known?: unknown; css?: unknown; css_known?: unknown; ftp?: unknown; ftp_known?: unknown; weight?: unknown }

function paceSec(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v) && v > 0) return v;
  const m = String(v ?? "").trim().match(/^(\d{1,2})[:'](\d{2})$/);
  return m ? +m[1] * 60 + +m[2] : null;
}

/** Discipline d'un step : son `d` s'il le porte, sinon le préfixe de sa zone, sinon celle de la séance. */
function discOf(st: StepLike, sessionD: string): string {
  if (st.d) return st.d;
  if (st.zone) { const p = String(st.zone).split(".")[0]; if (p === "rn" || p === "bk" || p === "sw") return p; }
  return sessionD;
}

/** Les distances d'UNE semaine, par discipline (rn/bk/sw), temps toujours, km si les
 *  références le permettent. Le jour J (course, `min: 0`) et le repos ne comptent pas. */
export function weekDistances(week: V1Week, answers: AnswersLike): DisciplineDistance[] {
  const acc: Record<string, { min: number; km: number; approx: boolean; convertible: boolean }> = {};
  const thr = answers.pace_known === "oui" ? paceSec(answers.pace) : null; // s/km
  const css = answers.css_known === "oui" ? paceSec(answers.css) : null;  // s/100m
  const ftp = answers.ftp_known === "oui" && isFinite(+String(answers.ftp)) ? +String(answers.ftp) : null;
  const kg = isFinite(parseFloat(String(answers.weight))) && parseFloat(String(answers.weight)) > 0 ? parseFloat(String(answers.weight)) : null;
  const bikeSetup = BIKE_SETUP.route; // même hypothèse déclarée que la prédiction (PW)
  const bikeCda = (bikeSetup.cdaLo + bikeSetup.cdaHi) / 2; // milieu de la fourchette déclarée

  const add = (d: string, min: number, km: number | null, approx: boolean) => {
    if (!acc[d]) acc[d] = { min: 0, km: 0, approx: false, convertible: true };
    acc[d].min += min;
    if (km == null) acc[d].convertible = false;
    else { acc[d].km += km; if (approx) acc[d].approx = true; }
  };

  for (const day of week.days) for (const s of day.sessions) {
    if (s.d === "rs" || !s.steps || !s.steps.length) continue;
    for (const st of s.steps as StepLike[]) {
      const reps = st.reps || 1;
      const d = discOf(st, s.d);
      if (d !== "rn" && d !== "bk" && d !== "sw") continue;
      if (st.distanceM != null) {
        const km = (reps * st.distanceM) / 1000;
        // La nage se prescrit en MÈTRES (sessionLibrary.ts, `Bd`/`Wm`/`Cm`) : c'est le seul
        // chemin qui passe ici en génération normale, et il ne portait AUCUNE estimation de
        // temps — « toujours pas de temps en récap pour la natation » (retour utilisateur,
        // 08/08/2026, 2e passage). Le temps se déduit de la même RÉFÉRENCE MESURÉE (CSS) que
        // l'inverse (durée → km) trois lignes plus bas — même honnêteté : sans CSS, pas de
        // minutes inventées, seule la distance (exacte, prescrite en mètres) s'affiche.
        const min = d === "sw" && css ? (km * 10 * css / 60) / ratioZone(st.zone, "css") : 0;
        add(d, min, km, false);
        continue;
      }
      const min = reps * (st.durationMin || 0);
      if (!min) continue;
      if (st.role !== "body") { add(d, min, 0, false); continue; } // échauffement/retour au calme : temps compté, km non prétendus
      let km: number | null = null;
      if (d === "rn" && thr) km = (min * 60 / thr) * ratioZone(st.zone, "thrPace");
      else if (d === "sw" && css) km = (min * 60 / css / 10) * ratioZone(st.zone, "css");
      else if (d === "bk" && ftp && kg) {
        const w = ftp * (BIKE_POWER_RATIO[st.zone || ""] ?? BIKE_POWER_RATIO["bk.z2"]);
        km = (solveSpeedMs(w, kg + bikeSetup.bikeKg, bikeCda, bikeSetup.crr, 0) * min * 60) / 1000;
      }
      add(d, min, km, km != null);
    }
  }
  return Object.keys(acc).map((d) => ({
    d, min: Math.round(acc[d].min),
    km: acc[d].convertible && acc[d].km > 0 ? Math.round(acc[d].km * 10) / 10 : null,
    approx: acc[d].approx,
  }));
}
