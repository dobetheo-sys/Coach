/**
 * H-1 (VFC) — LA VARIABILITÉ CARDIAQUE DEVIENT UNE MESURE, PLUS UN ADJECTIF.
 *
 * ================================================================================
 * LE DÉFAUT, ET IL N'EST PAS « LE HRV MANQUE »
 * ================================================================================
 *
 * `hrvStatus` existe depuis le Sprint 2, il est collecté au check-in, et il pèse
 * **−2 sur le registre OBJECTIF** de `assessReadiness` — le registre que A4 a créé
 * précisément pour qu'*« un ressenti déclaratif ne puisse pas effacer une
 * mesure »*.
 *
 * Sauf que `hrvStatus` EST un ressenti déclaratif. Le type le dit lui-même —
 * `"basse" | "normale" | "haute" // vs moyenne glissante 7j de l'athlète` — mais
 * **rien dans le dépôt ne calcule cette moyenne glissante**. L'athlète regarde sa
 * montre et coche une case à l'œil. Un adjectif auto-déclaré, rangé parmi les
 * mesures, qui pilote deux points du verdict du jour.
 *
 * C'est la leçon de **R14.1**, payée une quatrième fois : *« un adjectif
 * auto-déclaré ne pilote aucun chiffre »*. Et l'ironie est que le signal juste à
 * côté, la FC de repos, fait la bonne chose depuis l'audit v6 — il se compare à
 * une baseline glissante calculée depuis l'historique.
 *
 * ================================================================================
 * CE QUE CE MODULE FAIT
 * ================================================================================
 *
 * Il transforme une VALEUR (le rMSSD en millisecondes que rend la montre) en
 * statut, par comparaison à la propre base de l'athlète. Et quand il n'y a pas
 * assez d'historique, **il refuse de classer et le dit** — la déclaration reprend
 * alors la main, mais elle passe au registre SUBJECTIF, là où elle a toujours dû
 * être.
 *
 * ================================================================================
 * LE MODÈLE, ET SA PROVENANCE
 * ================================================================================
 *
 * **1. On travaille sur le LOGARITHME.** Le rMSSD est distribué de façon très
 * asymétrique ; la littérature de monitoring utilise `ln(rMSSD)` (souvent
 * ×20 pour l'échelle des montres). Faire la moyenne des millisecondes brutes
 * donnerait un poids excessif aux valeurs hautes.
 *
 * **2. La moyenne glissante de 7 JOURS est l'unité qui signifie quelque chose.**
 * C'est le résultat central de Plews et al. (2013, *Sports Medicine*, « Training
 * adaptation and heart rate variability in elite endurance athletes ») : la valeur
 * d'un matin isolé est trop bruitée pour décider quoi que ce soit ; c'est sa
 * moyenne sur une semaine qui suit l'adaptation. Le champ le disait déjà, sans
 * personne pour le calculer.
 *
 * **3. La bande « normale » est le plus petit changement qui vaille la peine.**
 * Convention de Hopkins, largement reprise en monitoring VFC : `SWC = 0,5 × écart-
 * type intra-athlète`. En dessous de la borne basse → « basse » ; au-dessus →
 * « haute » ; entre les deux → « normale », c'est-à-dire *rien à signaler*, ce qui
 * est le cas le plus fréquent et doit le rester.
 *
 * L'écart-type se mesure sur une fenêtre PLUS LONGUE que la moyenne (28 jours) :
 * la variabilité propre d'un athlète ne se lit pas sur sept points, et une bande
 * calculée sur la même fenêtre que la moyenne se rétrécirait à chaque semaine
 * calme — le plan deviendrait alors hypersensible au moment où l'athlète va bien.
 *
 * **4. Sous 7 mesures, on ne classe pas.** Une « moyenne sur 7 jours » calculée sur
 * trois points n'est pas une moyenne sur 7 jours. C'est la règle P7/P8 du
 * prédicteur appliquée ici : refuser d'estimer en donnant le motif vaut mieux
 * qu'un chiffre qui a l'air d'une mesure.
 *
 * ================================================================================
 * CE QUE CE MODULE NE FAIT PAS
 * ================================================================================
 *
 * Il ne prescrit RIEN. Il rend un statut ; c'est `assessReadiness` qui décide de
 * son poids, et l'ajusteur qui décide de la séance. Une VFC basse ne peut, par
 * construction, que faire baisser la charge (invariant du Sprint 2) — jamais
 * l'augmenter, quelle que soit sa valeur.
 */
import type { HrvStatus } from "./readinessSource.ts";

/** Bornes physiologiques du rMSSD au réveil, en ms. Hors de là, c'est une saisie fausse
 *  ou un artefact de capteur — on refuse plutôt que d'empoisonner la base. */
export const HRV_MS_MIN = 5;
export const HRV_MS_MAX = 250;

/** Fenêtre de la moyenne glissante — Plews et al. 2013. */
export const HRV_FENETRE_MOYENNE_J = 7;
/** Fenêtre de l'écart-type intra-athlète. Volontairement plus longue : voir l'en-tête. */
export const HRV_FENETRE_SD_J = 28;
/** Plus petit changement qui vaille la peine, en écarts-types (convention Hopkins). */
export const HRV_SWC_SD = 0.5;
/** Sous ce nombre de mesures, on refuse de classer et on dit pourquoi. */
export const HRV_MIN_MESURES = 7;

export interface HrvMesure { date: string; v: number }

export interface HrvBaseline {
  /** Nombre de mesures exploitables dans la fenêtre. */
  n: number;
  /** Base assez fournie pour classer ? */
  suffisant: boolean;
  /** Moyenne glissante 7 j, en ms (retour à l'échelle lisible). */
  moyenneMs: number | null;
  /** Bornes de la bande « normale », en ms. */
  basseMs: number | null;
  hauteMs: number | null;
  /** Le motif, quand on ne peut pas classer. Jamais un silence. */
  motif: string | null;
}

const ln = Math.log;

/** Valeur exploitable ? Un 0 n'est pas « absent » : c'est une saisie fausse, et on le sait. */
export const hrvValide = (v: unknown): v is number =>
  typeof v === "number" && isFinite(v) && v >= HRV_MS_MIN && v <= HRV_MS_MAX;

const joursEntre = (a: string, b: string) =>
  Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 864e5);

/**
 * La base de l'athlète à une date donnée, calculée sur SON historique.
 * Les mesures du jour même sont EXCLUES : comparer une valeur à une moyenne qui la
 * contient amortit précisément l'écart qu'on cherche à détecter.
 */
export function hrvBaseline(journal: HrvMesure[] | undefined, date: string): HrvBaseline {
  const vide: HrvBaseline = { n: 0, suffisant: false, moyenneMs: null, basseMs: null, hauteMs: null,
    motif: "Pas encore d'historique de VFC : il faut " + HRV_MIN_MESURES + " matins pour que ta base veuille dire quelque chose." };
  if (!Array.isArray(journal) || !journal.length) return vide;

  const propres = journal.filter((x) => x && typeof x.date === "string" && hrvValide(x.v) && x.date < date);
  const dansFenetre = (j: number) => propres.filter((x) => joursEntre(x.date, date) <= j);

  const pourMoyenne = dansFenetre(HRV_FENETRE_MOYENNE_J);
  const pourSd = dansFenetre(HRV_FENETRE_SD_J);
  const n = pourSd.length;
  if (n < HRV_MIN_MESURES) {
    return { ...vide, n,
      motif: n === 0
        ? vide.motif
        : "Base insuffisante : " + n + " mesure" + (n > 1 ? "s" : "") + " sur les " + HRV_MIN_MESURES
          + " nécessaires. En attendant, ta VFC ne pilote rien — elle est notée, pas utilisée." };
  }

  // Moyenne sur 7 j si la fenêtre courte est fournie, sinon sur ce qu'on a (déjà ≥ 7 points).
  const base = pourMoyenne.length >= 3 ? pourMoyenne : pourSd;
  const moyLn = base.reduce((t, x) => t + ln(x.v), 0) / base.length;
  const moySdLn = pourSd.reduce((t, x) => t + ln(x.v), 0) / n;
  const varLn = pourSd.reduce((t, x) => t + (ln(x.v) - moySdLn) ** 2, 0) / (n - 1);
  const sdLn = Math.sqrt(varLn);

  return {
    n, suffisant: true, motif: null,
    moyenneMs: Math.round(Math.exp(moyLn) * 10) / 10,
    basseMs: Math.round(Math.exp(moyLn - HRV_SWC_SD * sdLn) * 10) / 10,
    hauteMs: Math.round(Math.exp(moyLn + HRV_SWC_SD * sdLn) * 10) / 10,
  };
}

export interface HrvVerdict {
  status: HrvStatus;
  /** Écart à la moyenne, en %, pour l'afficher — jamais pour le recalculer ailleurs. */
  ecartPct: number;
  /** Une phrase, sans jargon, qui dit à quoi la valeur a été comparée. */
  why: string;
}

/**
 * Classe une valeur du jour contre la base. `null` quand on ne peut pas — et
 * l'appelant doit alors retomber sur la déclaration, en la traitant comme telle.
 */
export function classerHrv(valeurMs: unknown, b: HrvBaseline): HrvVerdict | null {
  if (!hrvValide(valeurMs) || !b.suffisant || b.moyenneMs == null || b.basseMs == null || b.hauteMs == null) return null;
  const ecartPct = Math.round(((valeurMs - b.moyenneMs) / b.moyenneMs) * 1000) / 10;
  const ref = " (" + valeurMs + " ms pour une base de " + b.moyenneMs + " ms sur " + b.n + " matins)";
  if (valeurMs < b.basseMs)
    return { status: "basse", ecartPct, why: "VFC sous ta bande habituelle" + ref };
  if (valeurMs > b.hauteMs)
    return { status: "haute", ecartPct, why: "VFC au-dessus de ta bande habituelle" + ref };
  return { status: "normale", ecartPct, why: "VFC dans ta bande habituelle" + ref };
}
