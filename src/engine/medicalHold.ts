/**
 * DRAPEAU MÉDICAL — LE POINT UNIQUE OÙ UNE SÉANCE ACQUIERT SON INTENSITÉ.
 *
 * R4.0 avait fermé le contournement. Il s'est rouvert DEUX FOIS : une fois par le module trail
 * (R7, nouvelles zones `tr.*` que la vérification locale ne connaissait pas), une fois par
 * l'insertion de course (N1, qui écrivait `.thr` sans passer par la bibliothèque). Un garde qui
 * se rouvre à chaque nouveau producteur de séances n'est pas un garde : c'est une vérification
 * locale que le producteur suivant oubliera.
 *
 * La règle est donc portée par le MOTEUR, à l'endroit où une zone est écrite, et par un filet
 * final qui rattrape tout écrivain futur (`enforceMedicalHold`). Les deux ensemble : la porte
 * pour que ce soit gratuit, le filet pour que ce soit vrai.
 *
 * Sous drapeau, aucune séance d'aucun plan ne porte de zone au-dessus de l'ENDURANCE — courses,
 * tests et retests compris. Un plan de maintien n'inscrit pas de course : la règle appartient
 * au moteur, pas à l'appelant.
 */
import type { V1Plan, V1Step } from "./types.ts";

/** Zones d'ENDURANCE, les seules autorisées sous drapeau médical. Tout le reste est au-dessus. */
const EASY_ZONES = new Set([
  "rn.easy", "rn.rec", "bk.z2", "sw.easy", "sw.aero",
  "tr.flat", "tr.hike", "tr.easyup",
]);
/** Repli par discipline — la zone facile de la discipline du bloc. */
const EASY_BY_PREFIX: Record<string, string> = { rn: "rn.easy", bk: "bk.z2", sw: "sw.easy", tr: "tr.easyup" };

export function isEasyZone(zone: string | null | undefined): boolean {
  return !zone || EASY_ZONES.has(zone);
}

/** LA PORTE : toute zone écrite sous drapeau médical redescend à l'endurance de sa discipline. */
export function medicalZone(zone: string | null | undefined, medHold: boolean): string | null | undefined {
  if (!medHold || isEasyZone(zone)) return zone;
  const pfx = String(zone).split(".")[0];
  return EASY_BY_PREFIX[pfx] || "rn.easy";
}

/**
 * LE FILET : appelé au point de convergence, il rattrape toute zone écrite hors de la porte —
 * une passe tardive, un module futur, une séance construite à la main. C'est lui qui rend la
 * garantie non-réouvrable : le prochain producteur n'a pas besoin de connaître la règle.
 */
export function enforceMedicalHold(plan: V1Plan, medHold: boolean): number {
  if (!medHold) return 0;
  let fixed = 0;
  for (const w of plan.weeks)
    for (const d of w.days)
      for (const s of d.sessions)
        for (const st of (s.steps || []) as V1Step[]) {
          const next = medicalZone(st.zone, true);
          if (next !== st.zone) { st.zone = next as string; fixed++; }
        }
  return fixed;
}
