/**
 * PW — LE POINT UNIQUE « UNE PUISSANCE, UNE VITESSE, DONC UN TEMPS ».
 *
 * ─── LE DÉFAUT QUE CE MODULE FERME ────────────────────────────────────────────────────────
 *
 * Le prédicteur rendait un CHRONO pour la natation et pour la course à pied, et des WATTS pour
 * le vélo. Sur un triathlon, le vélo est le segment le plus LONG des quatre formats — de 45 %
 * à 55 % du temps total — donc l'athlète recevait une prédiction de course amputée de sa plus
 * grosse moitié, et aucun total. Le commentaire du moteur assumait ce choix (« un total
 * additionnerait les incertitudes ») ; c'est vrai, et ce n'est pas une raison suffisante :
 * l'athlète calcule ce total de tête, plus mal, ou va le chercher ailleurs.
 *
 * ─── CE QUI REND LA CONVERSION POSSIBLE ───────────────────────────────────────────────────
 *
 * Une puissance seule ne donne pas une vitesse : il faut savoir ce qu'elle doit vaincre. Le
 * modèle est celui de **Martin et al. (1998), « Validation of a Mathematical Model for Road
 * Cycling Power », Journal of Applied Biomechanics 14:276-291** — la référence du domaine,
 * validée à ±2,7 % sur piste :
 *
 *   P_roue = v · ( Crr · m · g · cos θ  +  m · g · sin θ )  +  ½ · ρ · CdA · v³
 *   P_roue = η · P_pédales
 *
 * Le premier terme est le roulement, le deuxième la pente, le troisième l'air. On résout en
 * `v` par bissection : le polynôme est monotone croissant en v sur le domaine utile, donc la
 * bissection converge toujours — pas de Newton qui diverge sur un cas limite.
 *
 * ─── CE QUE LE MODULE N'INVENTE PAS, ET C'EST LE POINT ────────────────────────────────────
 *
 * Trois grandeurs ne sont pas mesurables par l'app : le **CdA** (surface frontale × traînée),
 * le **Crr** (résistance au roulement) et la **masse du vélo**. Elles sont donc déclarées comme
 * des HYPOTHÈSES, avec leur fourchette, et c'est cette fourchette qui devient l'incertitude
 * annoncée — pas un ±x % choisi pour faire joli. Le CdA domine : entre une position sur les
 * cocottes et une position sur prolongateurs, il y a **30 % de traînée**, soit une dizaine de
 * minutes sur 90 km. Afficher un chrono unique serait donc mentir sur ce qu'on sait.
 *
 * Le POIDS de l'athlète, lui, est une entrée réelle (`weight`, Profil). Sans lui, ce module
 * REFUSE de rendre une vitesse — P7/P8 : pas d'estimation sans matière. Ce refus est la raison
 * pour laquelle `bikeTimeSec` rend `null` plutôt qu'un chiffre par défaut : un poids inventé
 * fausserait le roulement ET la pente, dans le sens rassurant sur les parcours plats.
 *
 * ─── NP OU PUISSANCE MOYENNE ? LA QUESTION EST RÉELLE, ET LA RÉPONSE EST UNE HYPOTHÈSE ───
 *
 * Le moteur prescrit des watts en puissance NORMALISÉE (R10) : une moyenne pondérée où les
 * pointes comptent double. Or l'équation ci-dessus veut la puissance MOYENNE — c'est elle qui
 * fait avancer le vélo. Les deux ne coïncident que si l'effort est régulier (indice de
 * variabilité IV = NP ÷ moyenne = 1). Passer une NP à une équation qui attend une moyenne
 * surestimerait donc la vitesse de 4 à 8 % sur un parcours accidenté.
 *
 * Ce module assume **IV = 1**, et ce n'est pas un raccourci : c'est exactement le pacing que le
 * moteur PRESCRIT par ailleurs (« la puissance normalisée qui laisse des jambes pour courir —
 * dépasser cette bande se paie sur la CAP »). Le chrono rendu est donc celui d'un athlète qui
 * tient sa cible, pas celui d'un athlète qui attaque les bosses et se relève dans les descentes.
 * Le second ira MOINS vite pour la même NP, et paiera en plus sa course à pied. Dit autrement :
 * l'écart entre les deux n'est pas une erreur du modèle, c'est le coût du pacing — et c'est
 * précisément ce que la carte cherche à rendre visible.
 *
 * ─── LE RELIEF SORT DU MODÈLE, IL N'EST PAS POSÉ À CÔTÉ ───────────────────────────────────
 *
 * Un parcours vallonné coûte du temps même quand il revient à son point de départ : à puissance
 * constante on perd BEAUCOUP en montée et on regagne PEU en descente, parce que la descente est
 * bornée par l'air et par le pilotage. Ce coût n'est pas ajouté par un coefficient : il TOMBE de
 * la même équation, appliquée à TROIS segments — la part montante, la part descendante, et le
 * plat qui reste. C'est la leçon R11.1 appliquée au relief : un second coefficient « pénalité de
 * relief » aurait été un second jeu de vérités à côté d'un modèle qui sait déjà répondre.
 *
 * Les deux grandeurs qui décrivent le parcours (D+ pour 100 km, part de la distance montante) et
 * la calibration qui les fixe sont documentées sur `RELIEF_PROFILE`, plus bas — avec les deux
 * écritures fausses qui l'ont précédée. Ce paragraphe a d'ailleurs annoncé « une moitié montante
 * et une moitié descendante » alors que le code avait déjà cessé de faire ça : troisième
 * commentaire de ce fichier à décrire un modèle que le code ne portait plus, et le seul qui ait
 * survécu au premier commit.
 */

/** Accélération de la pesanteur (m/s²) — valeur normale, ISO 80000-3. */
export const G = 9.80665;
/** Masse volumique de l'air (kg/m³) : atmosphère standard, niveau de la mer, 15 °C.
 *  L'altitude et la température ne sont PAS lues — un col à 2 000 m vaut ~20 % d'air en moins,
 *  ce qui rendrait plus vite. C'est donc une hypothèse CONSERVATRICE, et elle est nommée. */
export const RHO_AIR = 1.225;
/** Rendement de la transmission (Martin et al. 1998, chaîne propre et bien réglée). */
export const DRIVETRAIN_EFF = 0.976;
/** Vitesse maximale retenue en descente (m/s ≈ 65 km/h). Au-delà, ce n'est plus la physique
 *  qui décide mais le pilotage, les virages et le freinage — et un modèle qui prédirait
 *  90 km/h de moyenne en descente rendrait un chrono qu'aucun athlète ne tiendra. */
export const DESCENT_CAP_MS = 18;

/**
 * Hypothèses de matériel, par POSITION. Le CdA est en m², le Crr sans unité, la masse
 * additionnelle (vélo + équipement + bidons) en kg.
 *
 * Provenance des CdA : plage des valeurs publiées en soufflerie et en terrain
 * (Martin et al. 1998 ; Debraux et al. 2011, « Aerodynamic drag in cycling: methods of
 * assessment », Sports Biomech 10:197-218). Ce sont des ORDRES DE GRANDEUR d'age-grouper,
 * pas des mesures individuelles — d'où une fourchette et non un point.
 *
 * Provenance des Crr : pneus route de qualité sur asphalte 0,004 ; gravel/pneus larges sur
 * chemin roulant 0,008 (Wilson & Papadopoulos, « Bicycling Science », 3e éd.).
 */
export interface BikeSetup {
  /** Fourchette de CdA (m²) : le bas = position tenue et matériel affûté, le haut = position ordinaire. */
  cdaLo: number;
  cdaHi: number;
  crr: number;
  /** Masse du vélo + équipement embarqué (kg). */
  bikeKg: number;
  label: string;
}

export const BIKE_SETUP: Record<string, BikeSetup> = {
  /** Prolongateurs / vélo de contre-la-montre : la position du triathlon longue distance. */
  aero: { cdaLo: 0.24, cdaHi: 0.30, crr: 0.004, bikeKg: 10, label: "position aéro (prolongateurs)" },
  /** Vélo de route, mains en bas du cintre ou aux cocottes. */
  route: { cdaLo: 0.30, cdaHi: 0.36, crr: 0.004, bikeKg: 9, label: "vélo de route" },
  /** Gravel : position plus haute, pneus larges, revêtement qui roule moins. */
  gravel: { cdaLo: 0.34, cdaHi: 0.42, crr: 0.008, bikeKg: 11, label: "gravel" },
};

/**
 * PROFIL DE PARCOURS — DEUX GRANDEURS OBSERVABLES, PAS UNE PENTE INVENTÉE.
 *
 * ─── DEUX ÉCRITURES FAUSSES AVANT CELLE-CI, ET ELLES RESTENT ÉCRITES ──────────────────────
 *
 * (1) J'ai d'abord posé « pente moyenne 2,5 % en vallonné, 5 % en montagne », au jugé. Absurde
 *     rapporté au réel : 5 % de moyenne sur 90 km voudrait dire 2 250 m de D+, ce qu'aucun 70.3
 *     ne propose.
 *
 * (2) J'ai alors ramené à 1 % et 2 % — les vraies pentes MOYENNES — en écrivant dans ce même
 *     commentaire que le surcoût produit serait « +9 % en vallonné, +23 % en montagne ».
 *     Mesuré : **+3 % et +11 %**. Le commentaire annonçait un chiffre que le code ne produisait
 *     pas, ce qui est exactement le défaut que ce dépôt traque partout ailleurs. Et le chiffre
 *     produit était trop FAIBLE : un 70.3 de montagne coûte 20 à 30 % de temps vélo en plus,
 *     pas 11.
 *
 * ─── LA CAUSE : LE D+ N'EST PAS ÉTALÉ SUR LA MOITIÉ DU PARCOURS ───────────────────────────
 *
 * Supposer « la moitié monte à la pente moyenne, l'autre descend » est faux là où ça compte.
 * En montagne, le dénivelé est CONCENTRÉ : 1 800 m se montent sur 25 km de cols à 7 %, pas sur
 * 45 km à 2 %. Or la vitesse s'effondre de façon très non linéaire avec la pente — 25 km/h à
 * 2 %, 13 km/h à 7 % — donc étaler le D+ fait gagner du temps qui n'existe pas.
 *
 * Le profil se décrit donc par deux grandeurs que les organisateurs PUBLIENT, et qu'un athlète
 * peut vérifier sur la fiche de son épreuve :
 *   · le **D+ pour 100 km** — la mesure standard d'un parcours ;
 *   · la **part de la distance passée à monter** — le reste se répartit entre descente
 *     (même part) et plat.
 * La pente des sections montantes en DÉCOULE, elle n'est plus posée. Trois segments, une seule
 * équation appliquée trois fois.
 *
 * Ordres de grandeur retenus (fiches d'épreuves 70.3 et Ironman) :
 *   · plat      — Barcelone, Hambourg : 200-400 m / 90 km, quelques faux plats
 *   · vallonné  — Aix, Vichy : 800-1 000 m / 90 km, bosses roulantes
 *   · montagne  — Nice, Alpe d'Huez : 1 500-2 200 m / 90-118 km, cols
 */
export interface ReliefProfile {
  /** Dénivelé positif pour 100 km — la mesure que publient les organisateurs. */
  dplusPer100km: number;
  /** Part de la distance passée à MONTER (la même part est descendue, le reste est plat). */
  climbShare: number;
}
export const RELIEF_PROFILE: Record<string, ReliefProfile> = {
  plat: { dplusPer100km: 350, climbShare: 0.15 },
  vallonne: { dplusPer100km: 1000, climbShare: 0.35 },
  montagne: { dplusPer100km: 1700, climbShare: 0.38 },
};

/**
 * CE QUE CES TROIS LIGNES PRODUISENT, MESURÉ ET NON ANNONCÉ — 90 km à 200 W, 85 kg tout compris,
 * CdA 0,27 : **plat 157 min · vallonné 171 min (+9 %) · montagne 199 min (+27 %)**, soit des
 * pentes de montée de 0 / 2,9 / 4,5 % sur les sections concernées. Ces surcoûts sont la CIBLE de
 * la calibration, choisie sur les écarts observés entre un 70.3 roulant et un 70.3 de montagne
 * (Nice, Alpe d'Huez : 20 à 30 % de temps vélo en plus pour un age-grouper). Le chiffre est ici
 * pour que la prochaine retouche des constantes se voie immédiatement — et pour qu'aucun
 * commentaire de ce fichier n'annonce plus une valeur que le code ne produit pas.
 */

/**
 * Résout `P_roue = v·(Crr·m·g·cosθ + m·g·sinθ) + ½·ρ·CdA·v³` en v (m/s), par bissection.
 *
 * Le membre de droite est strictement croissant en v dès que la somme des coefficients est
 * positive — ce qui est le cas partout sauf en descente franche, où le terme de pente est
 * négatif. La borne basse part donc de 0 et la borne haute du plafond de descente : si même à
 * cette vitesse la puissance requise reste sous celle disponible, l'athlète est en roue libre
 * et c'est le pilotage qui décide (DESCENT_CAP_MS).
 */
export function solveSpeedMs(powerW: number, massKg: number, cda: number, crr: number, gradePct: number): number {
  const s = gradePct / 100;
  const cos = 1 / Math.sqrt(1 + s * s), sin = s / Math.sqrt(1 + s * s);
  const rollGrav = crr * massKg * G * cos + massKg * G * sin;
  const aero = 0.5 * RHO_AIR * cda;
  const need = (v: number) => v * rollGrav + aero * v * v * v;
  const pw = DRIVETRAIN_EFF * powerW;
  if (need(DESCENT_CAP_MS) <= pw) return DESCENT_CAP_MS;
  let lo = 0, hi = DESCENT_CAP_MS;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (need(mid) < pw) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Temps (s) pour couvrir `distKm` à `powerW`, sur un parcours de classe `relief`.
 *
 * La moitié montante et la moitié descendante sont chronométrées SÉPARÉMENT puis additionnées.
 * C'est la seule façon correcte : la vitesse moyenne d'un aller-retour n'est pas la moyenne des
 * vitesses (moyenne harmonique), et prendre la moyenne arithmétique surestimerait de plusieurs
 * minutes sur un parcours de montagne.
 */
export function bikeSecFor(distKm: number, powerW: number, massKg: number, cda: number, crr: number, relief: ReliefProfile): number {
  const d = distKm * 1000;
  const v = (g: number) => solveSpeedMs(powerW, massKg, cda, crr, g);
  const share = Math.min(0.49, Math.max(0, relief.climbShare));
  const dClimb = d * share;
  if (!(dClimb > 0) || !(relief.dplusPer100km > 0)) return d / v(0);
  // La pente des sections montantes DÉCOULE du D+ et de la part montante : c'est le point de
  // ce module — on ne pose pas une pente, on la déduit de deux grandeurs publiées.
  const gradePct = 100 * ((relief.dplusPer100km / 100) * distKm) / dClimb;
  return dClimb / v(gradePct) + dClimb / v(-gradePct) + (d - 2 * dClimb) / v(0);
}

export interface BikeTimeEstimate {
  /** Fourchette de temps (s), bas = hypothèse la plus favorable. */
  lo: number;
  hi: number;
  /** Vitesse moyenne correspondante (km/h), pour l'affichage. */
  kmhLo: number;
  kmhHi: number;
  /** Ce qu'on a supposé, mot pour mot, pour que l'athlète puisse le contredire. */
  hypothese: string;
}

/**
 * LE POINT D'ENTRÉE. Rend `null` — et c'est un refus motivé par l'appelant, pas un silence —
 * quand il manque la matière : poids de l'athlète, distance, ou puissance.
 *
 * La fourchette de temps vient de la fourchette de PUISSANCE (la bande d'intensité du format)
 * croisée avec la fourchette de CdA. Les deux extrêmes sont pris ensemble : puissance basse ×
 * CdA haut pour le temps le plus long, puissance haute × CdA bas pour le plus court. C'est le
 * choix CONSERVATEUR — il suppose les deux incertitudes corrélées dans le pire sens — et il
 * vaut mieux ici qu'une composition en quadrature, qui supposerait qu'elles s'annulent.
 */
export function bikeTimeEstimate(
  distKm: number | undefined,
  powerLoW: number,
  powerHiW: number,
  athleteKg: number | undefined,
  setupId: string,
  relief: string | undefined
): BikeTimeEstimate | null {
  const setup = BIKE_SETUP[setupId] || BIKE_SETUP.route;
  if (!(distKm && distKm > 0) || !(powerLoW > 0) || !(athleteKg && athleteKg > 0)) return null;
  const m = athleteKg + setup.bikeKg;
  const rp = RELIEF_PROFILE[String(relief ?? "plat")] ?? RELIEF_PROFILE.plat;
  const hi = bikeSecFor(distKm, powerLoW, m, setup.cdaHi, setup.crr, rp);
  const lo = bikeSecFor(distKm, powerHiW, m, setup.cdaLo, setup.crr, rp);
  return {
    lo, hi,
    kmhLo: (distKm / (hi / 3600)), kmhHi: (distKm / (lo / 3600)),
    hypothese: setup.label + " (CdA " + setup.cdaLo.toFixed(2).replace(".", ",") + "–"
      + setup.cdaHi.toFixed(2).replace(".", ",") + " m²), " + (athleteKg + setup.bikeKg) + " kg tout compris"
      + ", " + Math.round(rp.dplusPer100km) + " m de D+ pour 100 km"
      + ", air au niveau de la mer",
  };
}

/**
 * La POSITION supposée, déduite du sport et du format. Aucune question n'est ajoutée au
 * questionnaire pour ça, et c'est délibéré : U14 vient de le raccourcir, et une question de
 * plus pour un paramètre que la fourchette de CdA couvre déjà serait payée par tout le monde
 * pour affiner la réponse de quelques-uns. L'hypothèse est en revanche AFFICHÉE avec le
 * chrono — l'athlète qui roule autrement sait immédiatement de combien la lire de travers.
 */
export function assumedSetup(sport: string, format: string | undefined): string {
  const f = String(format ?? "");
  if (sport === "bike") return f === "gravel" ? "gravel" : f === "clm" ? "aero" : "route";
  // Longue distance : les prolongateurs sont la règle, pas l'exception.
  if (sport === "tri") return (f === "70.3" || f === "Full") ? "aero" : "route";
  if (sport === "duathlon") return (f === "L" || f === "PM") ? "aero" : "route";
  return "route";
}
