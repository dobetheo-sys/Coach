/**
 * B-17 — LA NAGE CONTINUE À LA DISTANCE DE COURSE, EN TRIATHLON.
 *
 * MESURÉ AVANT D'ÊTRE ÉCRIT (registre `BUGS_OUVERTS.md` « B-17 ») : sur `tri/Full`, **4 profils
 * sur 56** reçoivent une nage continue (`reps === 1`) à la distance de course — par accident de
 * composition, aucune règle ne la visant. Le VOLUME est là (jusqu'à 7 125 m en une séance), la
 * CONTINUITÉ n'y est pas : ce sont deux adaptations différentes, et c'est la seconde qui décide
 * du jour J.
 *
 * POURQUOI C'EST UNE RÈGLE DE SÉCURITÉ ET PAS DE PERFORMANCE — critère O-17, membre « l'athlète
 * ne peut pas évaluer le risque » : en eau libre, **le risque n'est pas observable avant d'être
 * réalisé**. En course à pied on ralentit, on marche, on s'arrête — le signal arrive
 * progressivement et des options restent à chaque étape. En eau libre, le choc thermique, la
 * désorganisation du geste et la panique surviennent vite, et loin du bord. Le milieu ne rend
 * aucune information utilisable en temps voulu.
 *
 * Le précédent interne est **S10** (swimrun) : il exige 30 min de nage continue pour un format
 * long, avec sa justification écrite — « on est parfois à 700 m du rivage ». Elle vaut mot pour
 * mot pour un 70.3 en lac ou un Full en mer ; le triathlon n'avait pas d'équivalent.
 *
 * ZÉRO CONSTANTE NOUVELLE : le plancher de 30 min vient de `S10_PREREQ`, les distances de
 * `TRI_SWIM`, les paliers s'en dérivent, la vitesse de repli est le `130` déjà en place.
 */
import { TRI_SWIM } from "./predictor.ts";
import { S10_PREREQ } from "../sports/swimrun/tables.ts";

/** Vitesse de repli — la MÊME que `stepMin` (`baseRefs.css || 130`). Voir la note d'unité ci-dessous. */
export const B17_CSS_FALLBACK_SEC = 130;

/**
 * B-17 — LES PALIERS. Fractions croissantes de la distance de course, dérivées d'elle : aucune
 * constante de distance n'est posée ici. La FORME compte plus que les valeurs (arbitrage du
 * fondateur) : une MONTÉE, pas un test unique à la fin — un athlète qui découvre la distance
 * trois semaines avant l'épreuve n'a plus le temps de corriger ce qu'il y apprend.
 */
export const B17_PALIERS = [0.5, 0.7, 0.9, 1.0] as const;

export interface ContinuityGate {
  /** Le seuil, en minutes : `min(30, durée de nage estimée en course)`. */
  seuilMin: number;
  /** La continuité déclarée, convertie par la MÊME vitesse. `null` = « je ne sais pas ». */
  declareMin: number | null;
  /** Durée de nage estimée en course, minutes. */
  courseMin: number;
  satisfait: boolean;
  /** Ce qui manque, en minutes (0 si satisfait). */
  manqueMin: number;
}

const secOf = (v: unknown): number | null => {
  if (typeof v === "number" && isFinite(v) && v > 0) return v;
  const m = String(v ?? "").trim().match(/^(\d{1,2})[:'](\d{2})$/);
  return m ? +m[1] * 60 + +m[2] : null;
};

/**
 * LE GATE — `min(30 min, durée de nage estimée en course)`.
 *
 * POURQUOI PAS UN SEUIL UNIFORME À 30 MIN, ni une indexation par FORMAT : trois mécanismes font
 * le risque en eau libre et ils ne s'échelonnent pas pareil — le choc thermique (3 premières
 * minutes, identique pour tous), la désorganisation du geste par refroidissement (10 à 30 min),
 * la panique par méconnaissance (via l'écart). Pour un sprint de 15-25 min d'eau, seuls le
 * premier et le troisième pèsent ; pour un Full de 60-90 min, les trois pèsent lourdement.
 * 30 min uniformes seraient AU-DESSUS de ce que le sprint exige et EN DESSOUS de ce que le Full
 * mérite. La bonne grandeur n'est ni le format ni la distance : c'est **la durée d'exposition**,
 * que le prédicteur produit déjà.
 *   · formats courts — il faut tenir aussi longtemps que la course durera, ni plus ni moins ;
 *   · formats longs  — exiger la durée de course à l'ENTRÉE serait absurde (c'est l'objectif,
 *     pas le prérequis) : les 30 min de S10 servent de plancher, la progression construit le reste.
 *
 * ⚠ NOTE D'UNITÉ — LE SENS DE L'ERREUR DU REPLI EST LE BON, ET IL NE FAUT PAS LE « CORRIGER ».
 * Sans CSS déclaré, la conversion emploie `130 s/100 m`, qui est **plus RAPIDE** qu'un vrai
 * débutant. Le seuil converti en mètres est donc PLUS GRAND que ce que ce débutant couvrirait
 * réellement en 30 min : le gate lui demande un peu plus que son équivalent-30-minutes. Pour un
 * garde-fou de sécurité c'est la direction souhaitable — et c'est la SEULE occurrence de ce
 * dépôt où le biais connu de cette constante joue en faveur de l'athlète. Quelqu'un pourrait la
 * « corriger » ici en croyant bien faire : ce serait le défaut symétrique de celui qu'O-25 a fermé.
 *
 * ⚠ LE GATE ACCEPTE UNE PREUVE EN BASSIN, ET C'EST ASSUMÉ. `longest_swim_m` sera presque toujours
 * une nage en bassin — mur tous les 25 m, ligne d'eau, fond visible, arrêt possible à chaque
 * longueur —, alors que le seuil est dérivé d'une nage en EAU LIBRE (facteur `TRI_SWIM`). D'où la
 * surcharge : 780 m de bassin pour couvrir 750 m d'eau libre, soit le facteur du milieu (×1,04) et
 * rien d'autre. Elle disparaît quand `milieu === "ow"` : la preuve est alors déjà dans le bon
 * milieu. Ce que cette permissivité coûte est validé par la séance en conditions réelles.
 *
 * « JE NE SAIS PAS » NE SATISFAIT PAS LE GATE. C'est l'INVERSE du réflexe de tout le reste du
 * moteur, où l'absence a longtemps valu permission (le piège du zéro, R20.1-a). Justifié par O-17
 * lui-même : qui ne sait pas ce qu'il a nagé de plus long est, par définition, dans le membre
 * « ne peut pas évaluer le risque ». Le CSS absent, LUI, ne bloque pas — c'est une vitesse que le
 * moteur estime déjà partout ailleurs, pas une inconnue irréductible.
 */
export function continuityGate(a: {
  format?: unknown; css?: unknown; css_known?: unknown; longest_swim_m?: unknown; milieu?: unknown;
}): ContinuityGate | null {
  const leg = TRI_SWIM[String(a.format ?? "")];
  if (!leg) return null; // format inconnu : pas de distance de course, pas de gate
  const css = (a.css_known === "oui" ? secOf(a.css) : null) ?? B17_CSS_FALLBACK_SEC;
  // `milieu === "ow"` : la continuité déclarée est DÉJÀ en eau libre, la surcharge n'a pas lieu.
  // `mixte` ou absent : origine ambiguë, on prend le conservateur (avec surcharge).
  const facteur = a.milieu === "ow" ? 1 : leg.factor;
  const courseMin = ((leg.dist / 100) * css * leg.factor) / 60;
  const seuilMin = Math.min(S10_PREREQ.minSwimContinuousMin, ((leg.dist / 100) * css * facteur) / 60);
  const m = parseFloat(String(a.longest_swim_m ?? ""));
  const declareMin = isFinite(m) && m > 0 ? ((m / 100) * css) / 60 : null;
  const satisfait = declareMin != null && declareMin >= seuilMin - 0.05;
  return { seuilMin, declareMin, courseMin, satisfait, manqueMin: satisfait ? 0 : Math.max(0, seuilMin - (declareMin ?? 0)) };
}

/**
 * LE NOMBRE DE PALIERS EST PROPORTIONNÉ À L'ÉCART, jamais fixe (arbitrage du fondateur, après la
 * mesure des occurrences disponibles). Mesuré : `tri/S` ne porte JAMAIS quatre « Nage seuil » en
 * phase spécifique, même à 22 semaines (1 à 3), alors que `tri/Full` en porte 8 à 14 dès son
 * horizon minimal. Un nombre fixe aurait donc refusé tous les `tri/S`.
 *
 * Le cas se dissout de lui-même parce que les deux grandeurs dérivent de la durée de nage du
 * format : **là où les paliers sont rares, l'écart est petit** (un sprint dont le gate exige déjà
 * la durée de course n'a presque rien à construire — 1 à 2 confirmations suffisent) ; **là où
 * l'écart est grand, les paliers abondent** (un Full entré à 30 min et devant atteindre 75).
 */
export function palierCount(g: ContinuityGate): number {
  if (!g) return 0;
  const reste = Math.max(0, g.courseMin - (g.declareMin ?? 0));
  if (reste <= 0.05) return 1;                 // rien à construire : une confirmation
  const ratio = reste / Math.max(1, g.courseMin);
  return ratio < 0.25 ? 2 : ratio < 0.5 ? 3 : B17_PALIERS.length;
}

/** La fraction de distance de course du palier `i` sur `n` — dérivée, jamais tabulée. */
export function palierFraction(i: number, n: number): number {
  if (n <= 1) return B17_PALIERS[B17_PALIERS.length - 1];
  const step = (B17_PALIERS.length - 1) / (n - 1);
  return B17_PALIERS[Math.min(B17_PALIERS.length - 1, Math.round(i * step))];
}

/**
 * LE MESSAGE « BASSIN + EAU LIBRE » — restreint aux formats M et au-dessus.
 *
 * `milieu` décrit où l'athlète S'ENTRAÎNE, jamais où l'épreuve se nage, et **aucune clé ne porte
 * le second** (suivi en O-47 : `TRI_SWIM` applique déjà son facteur d'eau libre au sprint aussi,
 * donc un sprint nagé en piscine est prédit 4 % trop lent — une hypothèse silencieuse qui vaut son
 * ticket). M, 70.3 et Full se nagent en eau libre dans la quasi-totalité des cas : l'affirmation y
 * est vraie SANS cette clé. Le sprint est le seul format ambigu, et c'est précisément celui où le
 * message serait faux une fois sur deux — il n'y est donc pas affiché.
 *
 * Le conditionnel (« si ta course se nage en eau libre… ») a été écarté : un message qui s'ouvre
 * sur une réserve se lit comme une clause juridique et se saute. Mieux vaut un message qu'on
 * n'affiche que quand il est vrai qu'un message qu'on nuance.
 *
 * Les TROIS autres pièces (gate, séance en eau libre, surcharge) restent actives sur sprint : ce
 * sont des défauts CONSERVATEURS, et on peut se tromper par prudence. Le message, lui, AFFIRME —
 * et on ne peut pas se tromper en affirmant.
 */
export function poolOnlyNotice(a: { format?: unknown; milieu?: unknown }): string | null {
  const fmt = String(a.format ?? "");
  if (fmt !== "M" && fmt !== "70.3" && fmt !== "Full") return null;
  if (a.milieu !== "bassin") return null;
  return "Ta course se nage en eau libre et tu t'entraînes en bassin. Ton plan peut construire la "
    + "distance, pas le milieu — pas de mur, pas de ligne, pas de fond visible, et il faut lever la "
    + "tête pour se repérer. Une seule sortie en eau libre avant le jour J change tout, et plus "
    + "elle est tôt, mieux c'est.";
}
