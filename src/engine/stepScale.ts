/**
 * LE POINT UNIQUE DE « RÉDUIRE (OU AGRANDIR) UN STEP D'UN FACTEUR ».
 *
 * Avant ce fichier, cette opération était écrite 25 fois dans le dépôt, en 6 variantes qui
 * n'étaient pas d'accord entre elles : `Math.round` ici, `Math.floor` là, plancher 1, 5, 8,
 * 10, 150 ou 200 selon le site, et surtout — le clamp « ne remonte JAMAIS au-dessus de la
 * valeur d'origine » (A3, audit v6) posé sur `durationMin` et `distanceM` de `reduceDay`
 * mais PAS sur ses `reps` : mesuré, `reduceDay(f = 1.2)` faisait passer un bloc de 5 à
 * 6 répétitions pendant que son commentaire promettait le contraire. C'est le bug que la
 * garantie runtime de R21 attrapait à l'exécution ; il est désormais impossible à écrire.
 *
 * CE QUE CE POINT UNIQUE N'UNIFORMISE PAS, délibérément : les paramètres. Chaque site garde
 * son mode d'arrondi et ses planchers — ils sont sémantiques (un plancher de 200 m en nage
 * n'est pas un plancher de 8 min en course), et les écraser aurait déplacé le golden de
 * 900 profils pour du confort de lecture. Ce qui est unifié, c'est l'INVARIANT :
 *
 *   avec `clampToOriginal`, un facteur ≤ 1 ne peut JAMAIS augmenter reps, durée ou distance.
 *
 * L'ordre des cibles est celui de tout le dépôt (leçon I14) : les RÉPÉTITIONS d'abord —
 * dans un intervalle, la durée d'une répétition EST le stimulus, on n'y touche pas — puis
 * la durée, puis la distance (quantum 25 m, la convention piscine).
 */
import type { V1Step } from "./types.ts";

export interface StepScaleOpts {
  /** Arrondi des répétitions : `floor` (le choix prudent, majoritaire) ou `round`. */
  repsMode: "floor" | "round";
  /** Plancher de durée (min) après mise à l'échelle. */
  durFloor: number;
  /** Plancher de distance (m) après mise à l'échelle — quantum 25 m appliqué. */
  distFloor: number;
  /** A3 — ne remonte JAMAIS un champ au-dessus de sa valeur d'origine, quel que soit `f`.
   *  C'est la sémantique d'une RÉDUCTION : même appelée avec un facteur > 1 (bug d'appelant)
   *  ou avec un plancher absolu au-dessus de la valeur (`max(5, …)` sur 4 min), elle ne rend
   *  jamais plus qu'elle a reçu. Les passes d'AGRANDISSEMENT (R3.3 vers la courbe) ne posent
   *  pas ce drapeau. */
  clampToOriginal?: boolean;
}

/** Met à l'échelle le dosage d'un step `body`. Rend true si quelque chose a changé. */
export function scaleStepDose(st: V1Step, f: number, opts: StepScaleOpts): boolean {
  if (st.role !== "body") return false;
  const clamp = (orig: number, next: number) => (opts.clampToOriginal ? Math.min(orig, next) : next);
  if ((st.reps || 1) > 1) {
    const reps = st.reps as number;
    const next = clamp(reps, Math.max(1, Math[opts.repsMode](reps * f)));
    if (next === reps) return false;
    st.reps = next;
    return true;
  }
  if (st.durationMin) {
    const next = clamp(st.durationMin, Math.max(opts.durFloor, Math.round(st.durationMin * f)));
    if (next === st.durationMin) return false;
    st.durationMin = next;
    return true;
  }
  if (st.distanceM) {
    const next = clamp(st.distanceM, Math.max(opts.distFloor, Math.round((st.distanceM * f) / 25) * 25));
    if (next === st.distanceM) return false;
    st.distanceM = next;
    return true;
  }
  return false;
}
