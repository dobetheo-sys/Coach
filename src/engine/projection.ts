/**
 * PROJECTION DE FORME AU JOUR J (R14) — « où en seras-tu le jour de la course ».
 *
 * Le défaut mesuré par le handoff R14 : `predictRace` ne lisait que `refs = {ftp, thrPace, css}`,
 * c'est-à-dire les valeurs saisies AUJOURD'HUI. Sur un Ironman à 59 semaines, en simulant
 * 30 semaines intégralement cochées, la prédiction restait identique au caractère près —
 * l'athlète le plus assidu du monde voyait le même chrono après sept mois d'entraînement.
 * C'était le seul module du moteur qui ignorait le plan qu'il accompagne, et c'est aussi
 * celui qui décide du pacing du jour J.
 *
 * CE MODULE NE PRODUIT JAMAIS LE CHRONO LUI-MÊME : il produit des FRACTIONS DE GAIN et une
 * INCERTITUDE, que le prédicteur applique à ses propres méthodes. La séparation est
 * volontaire — la façon de passer d'une référence à un temps (Riegel, CSS, %FTP) est déjà
 * écrite une fois, et une projection ne doit pas en créer une seconde.
 *
 * ─── CE QUI FONDE LES CHIFFRES, ET CE QUI N'EST QU'UNE HEURISTIQUE ─────────────────────
 *
 * SOLIDE (source primaire) :
 *   - Affûtage : Bosquet, Montpetit, Arvisais & Mujika, MSSE 2007;39(8):1358-67 — méta-analyse
 *     de 27 études, gain moyen +1,96 % (plage −2,28 à +8,91 %), optimum à 2 semaines avec
 *     volume réduit de 41-60 % et INTENSITÉ MAINTENUE. C'est la seule constante de ce fichier
 *     qui vienne d'une méta-analyse, et c'est pour ça qu'elle est conditionnée (P4) : la
 *     promettre quand le plan n'affûte pas conformément serait la citer à faux.
 *   - Variabilité inter-individuelle : HERITAGE (Bouchard, 483 sujets, 20 semaines de
 *     programme IDENTIQUE) — gain moyen ~0,4 L/min, mais 7 % des sujets à ≤ +0,1 L/min et
 *     8 % à ≥ +0,7 L/min. C'est l'argument décisif de tout le chapitre : **une projection
 *     ponctuelle est fausse par construction, seule une fourchette est honnête.**
 *   - Ordre de grandeur de l'incertitude : Rüst et al., OAJSM 2011;2:121-129 (N=184) —
 *     prédiction du temps d'Ironman à r²=0,65, SEE = 57 min sur ~11 h, soit ±8 %. Notre borne
 *     haute (±12 %) ne peut pas être plus étroite que ça sans mentir.
 *
 * HEURISTIQUE CONVERGENTE (pas de source primaire — à réviser dès qu'on aura des données
 * internes, et REMPLAÇABLE par la mesure de l'athlète via P3) :
 *   - Les plafonds `G_INFINI` ci-dessous (~20-30 %/an débutant, 5-10 % intermédiaire,
 *     2-5 % avancé) : convergence de sources de coaching, pas d'étude princeps.
 *   - La constante de temps τ = 20 semaines de la saturation.
 *
 * EXPLICITEMENT REJETÉ (liste noire du handoff, et on ne la franchit pas) :
 *   - Dériver un chrono de la CTL/ATL/TSB. Coggan, concepteur du modèle, la qualifie
 *     d'indicateur RELATIF de forme, jamais d'un prédicteur absolu. La CTL reste une
 *     tendance de charge — jamais une entrée de ce module.
 *   - Le modèle de Banister : excellent ajustement rétrospectif, validité prédictive
 *     prospective non démontrée, paramètres instables.
 *   - Projeter une cible de PUISSANCE ou d'ALLURE (P6, dans le prédicteur) : c'est la règle
 *     de sécurité du chapitre. Le temps se projette, l'intensité s'ancre.
 */
import type { Decision } from "./types.ts";

/** Un point du journal de tests de l'athlète (`answers.tests`). */
export interface RefTest { type: string; value: number; date: string; source?: string }

export interface ProjectionInput {
  /** Semaines entre aujourd'hui et le jour J (= semaines de préparation qui RESTENT). */
  horizonWeeks: number;
  level?: string;
  history?: string;
  /**
   * R14.1 — les références MESURÉES, d'où se déduit la marge disponible (P2bis).
   * `ftp` en W, `thrPace` et `css` en secondes, `weightKg` pour les W/kg.
   */
  refs?: { ftp: number; thrPace: number; css: number };
  weightKg?: number | null;
  sex?: string | null;
  age?: number | null;
  /** P2bis-c — structure de l'entraînement des 12 derniers mois (question Profil). */
  trainingStructure?: string | null;
  /** P10 — volume hebdo moyen PRESCRIT en dev+spec+peak, et volume récent déclaré (heures). */
  prescribedMeanH?: number | null;
  volRecentH?: number | null;
  /** P9 — levier poids : n'existe QUE si l'athlète l'a demandé et a saisi une cible. */
  weightLeverAsked?: boolean;
  weightTargetKg?: number | null;
  heightCm?: number | null;
  medicalFlag?: boolean;
  /**
   * P1 — adhérence sur la fenêtre glissante des 6 dernières semaines ÉCOULÉES.
   * `null` = pas jugeable (aucun ✓ dans tout le plan : le journal n'est pas utilisé, ce
   * qui ne veut PAS dire que l'athlète ne s'entraîne pas).
   */
  adherence: number | null;
  /** Journal de tests datés (P3) — la mesure de l'athlète prime sur nos heuristiques. */
  tests?: RefTest[];
  /** P4 — le plan affûte-t-il CONFORMÉMENT (2-3 semaines, −41..60 % vs pic, intensité tenue) ? */
  taperConform: boolean;
  /** Âge (en semaines) de la référence la plus récente — alimente l'incertitude (P7). */
  refAgeWeeks: number | null;
  /** Date du jour J, telle qu'elle sera affichée à côté du chrono projeté (jamais de chiffre nu). */
  raceDate?: string;
}

/**
 * P9 — le poids comme LEVIER OPTIONNEL, présenté en SENSIBILITÉ et jamais en objectif.
 * Le module ne produit ni calendrier, ni rythme de perte, ni apport : ces sujets restent
 * hors du périmètre du moteur, comme la frontière nutrition l'a déjà établi.
 */
export interface WeightLever {
  currentKg: number;
  targetKg: number;
  wkgNow: number | null;
  wkgTarget: number | null;
  runGainPct: number;
  why: string;
}

export interface ProjectionResult {
  applicable: boolean;
  horizonWeeks: number;
  adherence: number;
  gainPct: { ftp: number; thrPace: number; css: number; vam: number };
  /**
   * R14.1 §2 — LA FOURCHETTE PORTE SUR LE GAIN, et elle est ASYMÉTRIQUE.
   * `[g_lo, g_hi]` par référence : `spreadPct` (symétrique) a disparu du contrat.
   */
  gainBand: { ftp: [number, number]; thrPace: [number, number]; css: [number, number]; vam: [number, number] };
  gainSource: "prior" | "mesure" | "mixte";
  confidence: "faible" | "moyenne" | "bonne";
  weightLever: WeightLever | null;
  decisions: Decision[];
}

/**
 * P2bis (R14.1) — LE PLAFOND DE GAIN S'INDEXE SUR LA DISTANCE AU POTENTIEL.
 *
 * ── LE DÉFAUT CORRIGÉ ────────────────────────────────────────────────────────────────
 * La première version (R14) indexait le plafond sur `history`, et lisait `ancien` (pratique
 * de longue date) comme « proche du plafond physiologique ». C'est une confusion : des années
 * de pratique auto-encadrée ne donnent pas la trainabilité résiduelle d'un athlète structuré
 * depuis dix ans. Mesuré sur un écran de production — 70.3 à 43 semaines, FTP 230 W pour
 * 85 kg, soit **2,71 W/kg** — le moteur projetait +4,6 % sur la CAP et +5,1 % sur la nage.
 * Or 2,71 W/kg est en bas de la bande « fair » de Coggan et un CSS à 2'15/100 m est un profil
 * limité par la technique : **la marge est grande, la table disait l'inverse.** Le code était
 * juste, la table était fausse.
 *
 * C'est exactement la leçon R12 (« un adjectif auto-déclaré ne pilote plus aucun chiffre »),
 * qui n'avait été appliquée qu'à `level` : `history` faisait passer la même erreur par la
 * porte d'à côté. La marge se déduit désormais de ce qui est MESURÉ.
 *
 *     G∞(discipline) = G_plafond(discipline) × h(marge) × k_structure × f_volume
 *
 * ── LES BANDES ───────────────────────────────────────────────────────────────────────
 * Les bandes VÉLO suivent le profil de puissance de Coggan (publié). Les bandes CAP et NAGE
 * sont des **heuristiques convergentes de praticiens** — écrites comme telles, et remplaçables
 * par la mesure de l'athlète dès qu'il a deux tests datés (P3).
 *
 * `h` est ancré au MILIEU de chaque bande et interpolé linéairement entre les ancres : une
 * frontière franche ferait sauter la projection de 50 % pour 1 W d'écart.
 */
export const G_PLAFOND: Record<string, number> = {
  // 20-30 %/an chez le non-entraîné (heuristique convergente).
  ftp: 0.25,
  // Forte composante TECHNIQUE : la marge d'un nageur lent n'est pas aérobie, elle est dans
  // le geste — et c'est précisément ce qui se travaille le plus vite quand on part de loin.
  css: 0.22,
  // Barnes & Kilding, Sports Med Open 2015 : l'économie de course ne gagne que 2-4 % et
  // progresse lentement. La course est la discipline où l'on promet le moins.
  thrPace: 0.15,
  // Trail : même famille que la course (économie + aérobie), avec un peu plus de marge
  // technique en montée. Faute de bandes de VAM publiées, `h` reprend celui de la CAP.
  vam: 0.20,
};

/** Ancres `[valeur, h]` par discipline, du plus de marge au moins de marge. */
type Ancre = [number, number];
/** Vélo : W/kg au seuil (profil de puissance de Coggan). Plus haut = moins de marge. */
const ANCRES_WKG: Ancre[] = [[2.25, 1.0], [2.875, 0.75], [3.625, 0.5], [4.375, 0.28], [5.125, 0.12]];
/** CAP : allure seuil en s/km. Plus LENT = plus de marge (l'axe est inversé). */
const ANCRES_PACE: Ancre[] = [[360, 1.0], [307.5, 0.75], [262.5, 0.5], [225, 0.28], [195, 0.12]];
/** Nage : CSS en s/100 m. Plus LENT = plus de marge. */
const ANCRES_CSS: Ancre[] = [[150, 1.0], [127.5, 0.75], [112.5, 0.5], [97.5, 0.28], [82.5, 0.12]];

/** Interpolation linéaire sur une suite d'ancres monotone (croissante ou décroissante). */
function interpole(ancres: Ancre[], v: number): number {
  const croissant = ancres[ancres.length - 1][0] > ancres[0][0];
  const dans = (x: number, a: number, b: number) => (croissant ? x >= a && x <= b : x <= a && x >= b);
  if (dans(v, -Infinity as number, ancres[0][0]) || (croissant ? v <= ancres[0][0] : v >= ancres[0][0])) return ancres[0][1];
  const last = ancres[ancres.length - 1];
  if (croissant ? v >= last[0] : v <= last[0]) return last[1];
  for (let i = 1; i < ancres.length; i++) {
    const [v0, h0] = ancres[i - 1], [v1, h1] = ancres[i];
    if (dans(v, v0, v1)) return h0 + ((h1 - h0) * (v - v0)) / (v1 - v0);
  }
  return ancres[ancres.length - 1][1];
}

/**
 * P2bis-d — AJUSTEMENTS DE BANDES (heuristiques assumées).
 * On décale LA RÉFÉRENCE, jamais la marge de l'athlète : une femme de 3,0 W/kg n'est pas
 * « en retard », elle est à sa place dans une bande décalée — et sa marge résiduelle se lit
 * sur cette bande-là. Même raisonnement pour l'âge : après 35 ans, le déclin aérobie de
 * l'athlète qui maintient l'intensité décale la référence de ~5 % par décennie.
 */
function decalage(sex?: string | null, age?: number | null): { wkg: number; temps: number } {
  const femme = String(sex || "").toUpperCase().startsWith("F");
  const decennies = age && age > 35 ? (age - 35) / 10 : 0;
  return {
    wkg: (femme ? -0.45 : 0) - 0.05 * 4.0 * decennies, // −5 %/décennie sur une référence ~4 W/kg
    temps: (femme ? 0.10 : 0) + 0.05 * decennies,      // allures et CSS : +10 % femme, +5 %/décennie
  };
}

/** La marge disponible sur une référence mesurée. `null` = référence absente → pas de marge calculable. */
export function margeOf(
  discipline: "ftp" | "thrPace" | "css" | "vam",
  refs: { ftp: number; thrPace: number; css: number } | undefined,
  weightKg?: number | null,
  sex?: string | null,
  age?: number | null
): number | null {
  if (!refs) return null;
  const d = decalage(sex, age);
  if (discipline === "ftp") {
    if (!(refs.ftp > 0) || !(weightKg && weightKg > 0)) return null; // sans poids, pas de W/kg
    return interpole(ANCRES_WKG.map(([v, h]) => [v + d.wkg, h] as Ancre), refs.ftp / weightKg);
  }
  if (discipline === "css") {
    if (!(refs.css > 0)) return null;
    return interpole(ANCRES_CSS.map(([v, h]) => [v * (1 + d.temps), h] as Ancre), refs.css);
  }
  // thrPace et vam partagent la bande de la course (aucune bande de VAM publiée).
  if (!(refs.thrPace > 0)) return null;
  return interpole(ANCRES_PACE.map(([v, h]) => [v * (1 + d.temps), h] as Ancre), refs.thrPace);
}

/**
 * P2bis-c — `k_structure` : L'ANCIENNETÉ REDEVIENT UN SIMPLE MODIFICATEUR.
 * Ce qu'on mesure, c'est le STIMULUS DE LA STRUCTURE, pas les années de pratique : quelqu'un
 * qui s'entraîne au feeling depuis dix ans a encore tout le bénéfice d'un plan devant lui.
 */
export const K_STRUCTURE: Record<string, number> = { feeling: 1.0, intermittent: 0.85, suivi: 0.65 };
/** Repli quand la question n'a pas été posée/répondue — `history` ne sert plus qu'à ça. */
const K_PAR_HISTORY: Record<string, number> = { reprise: 1.0, confirme: 0.85, ancien: 0.75 };
const K_DEFAUT = 0.85;

/** P2bis-e — plafond absolu, non négociable, après TOUT calcul. */
export const GAIN_MAX_ABSOLU = 0.30;

/** P2 — constante de temps de la saturation : le gain ralentit, il ne s'accumule pas. */
export const TAU_WEEKS = 20;
/** P4 — Bosquet 2007, gain moyen d'un affûtage CONFORME. */
export const TAPER_GAIN = 0.0196;
/**
 * P10 — FACTEUR VOLUME (dose-réponse). Deux athlètes de même profil, l'un à 6 h et l'autre à
 * 14 h par semaine, recevaient la même projection : le plan lui-même n'entrait pas dans le
 * modèle. `r` = volume hebdo moyen PRESCRIT en dev+spec+peak ÷ volume récent déclaré.
 *
 * Le plafond à 1,15 est délibéré : au-delà, le volume supplémentaire ne se convertit pas
 * proportionnellement en performance et fait monter le risque de blessure. **Le moteur ne
 * doit pas récompenser la surcharge** — c'est la priorité n°2 du manifeste, dans un endroit
 * où l'on ne l'attendait pas.
 */
/**
 * P11 / RG — LE RÉGIME : le modèle de gain n'avait pas de version « débutant ».
 *
 * CE QUI L'A RÉVÉLÉ. Un cas réel : ancien sportif de haut niveau, cinq ans sans rien, première
 * course à 5'30/km sur 13 min terminée à 185 BPM, puis **46'30 au 10 km en 8 semaines**. Le
 * modèle, pour un départ à 5'45/km d'allure seuil, autorisait **56'09**. Dix minutes d'écart.
 *
 * Deux causes, toutes deux visibles dans les constantes ci-dessus :
 *
 * 1. **`G_PLAFOND` est un jeu de plafonds d'athlète ENTRAÎNÉ.** Pour la course, sa provenance
 *    (Barnes & Kilding 2015) mesure ce que gagne l'ÉCONOMIE DE COURSE — le raffinement à la
 *    marge d'un geste déjà acquis. Les premiers mois de quelqu'un qui part de zéro sont un autre
 *    phénomène : débit cardiaque, capillarisation, densité mitochondriale, apprentissage du
 *    geste. Pas le même phénomène, donc pas la même borne.
 *
 * 2. **`ANCRES_PACE` sature à 6'00/km** (h = 1,0 au-delà) : un coureur à 7'30 et un coureur à
 *    6'00 reçoivent la MÊME marge, exactement dans la zone où vivent les débutants.
 *
 * LE DÉCLENCHEUR EST MESURÉ, PAS DÉCLARÉ — c'est toute la leçon de R14.1, qui a dépouillé
 * `history` de son pouvoir sur les chiffres. Le régime se lit sur le volume récent, une donnée
 * que le questionnaire collecte déjà et rend obligatoire (R10).
 *
 * INTERPOLÉ, jamais à seuil franc : le commentaire de `G_PLAFOND` le dit déjà pour ses propres
 * bandes — « une frontière franche ferait sauter la projection de 50 % pour 1 W d'écart ».
 *
 * CE QUI EST ANCRÉ ET CE QUI NE L'EST PAS. `thrPace` est confronté à une trajectoire réelle
 * (voir ci-dessus) ; les trois autres reprennent le même RAPPORT (≈ ×2,3) et sont des
 * **heuristiques assumées**, au même statut que les bandes de marge course et nage de R14.1.
 * L'ordre de grandeur s'appuie sur un résultat ancien et répliqué — VO2max +15 à 25 % chez le
 * sédentaire sur 8 à 12 semaines — auquel s'ajoute, en PERFORMANCE, ce que gagnent l'économie et
 * la technique depuis une base basse. Ce ne sont pas des mesures, et le code le dit.
 */
export const RG_VOL_DEBUTANT_H = 1.5; // h/sem : en dessous, régime « part de zéro »
export const RG_VOL_ENTRAINE_H = 4;   // h/sem : au-dessus, le modèle publié s'applique tel quel
export const G_PLAFOND_DEBUTANT: Record<string, number> = {
  ftp: 0.32,     // heuristique — zéro impact, l'aérobie encaisse et progresse vite
  css: 0.30,     // heuristique — la technique domine chez le non-nageur, elle se gagne vite
  thrPace: 0.25, // voir la note de calibration ci-dessous
  vam: 0.27,     // heuristique — même famille que la course, un peu plus de marge technique
};
/** Le gain du débutant est bien plus PRÉCOCE : la constante de temps se raccourcit. */
export const RG_TAU_DEBUTANT = 9;
/** Le plafond absolu suit le régime — celui de l'entraîné a été écrit pour l'entraîné. */
export const RG_GAIN_MAX_DEBUTANT = 0.32;

/**
 * NOTE DE CALIBRATION de `thrPace: 0,25` — et de ce qu'elle N'EST PAS.
 *
 * CE QUE J'AI ESSAYÉ D'ABORD, ET POURQUOI JE L'AI RETIRÉ. Ma première écriture visait à faire
 * entrer la trajectoire réelle qui a déclenché P11 (0 → 46'30 au 10 km en 8 semaines) DANS la
 * fourchette basse : `thrPace = 0,35`, cap 0,42. Résultat mesuré : **32,1 % de gain projeté sur
 * 16 semaines**. Un tiers de son allure seuil en quatre mois, affiché à tout le monde. Ce n'est
 * pas défendable, et ça révèle la faute de méthode — calibrer un modèle sur UN cas, en
 * l'occurrence le plus favorable qui soit : ancien sélectionné en équipe de France junior,
 * cinq ans d'arrêt, donc une reconstruction sur un capital déjà bâti.
 *
 * HERITAGE (Bouchard, 483 sujets, programme identique) dit exactement pourquoi c'est une faute :
 * 7 % des sujets gagnent ≤ 0,1 L/min et 8 % ≥ 0,7 L/min. La variabilité inter-individuelle EST
 * le phénomène. Un modèle calé sur le 92ᵉ centile promet à tout le monde ce qu'un sur douze
 * obtiendra — et c'est la priorité n°2 du manifeste qui trinque, parce que l'athlète à qui on
 * promet ça va chercher la différence dans la charge.
 *
 * CE QUE 0,25 REPRÉSENTE. Un plafond de gain de PERFORMANCE pour quelqu'un qui part de zéro,
 * d'un ordre de grandeur cohérent avec le résultat ancien et répliqué « VO2max +15 à 25 % chez
 * le sédentaire sur 8 à 12 semaines », majoré de ce que gagnent l'économie de course et
 * l'apprentissage du geste depuis une base basse. Ce n'est PAS une mesure : c'est une borne
 * déclarée, du même statut assumé que les bandes de marge course et nage de R14.1.
 *
 * OÙ TOMBE LE CAS RÉEL, DIT FRANCHEMENT. Depuis 6'30/km à 8 semaines, le modèle projette
 * aujourd'hui **53'14 – 1 h 04** là où il autorisait **1 h 01 – 1 h 05** avant P11. Son 46'30
 * reste DEHORS, au-delà de la borne optimiste. C'est le comportement voulu : la fourchette
 * décrit ce qu'un plan suivi produit couramment, pas ce que le meilleur répondeur obtient. Le
 * défaut que P11 corrige n'était pas « le modèle ne prédit pas cet athlète-là », c'était « le
 * modèle applique un plafond d'athlète entraîné à quelqu'un qui n'en est pas un ».
 */

/** Position dans le régime : 0 = entraîné (modèle publié), 1 = part de zéro. Interpolé. */
export function regimeDebutant(volRecentH?: number | null): number {
  const v = volRecentH == null || !isFinite(volRecentH) ? RG_VOL_ENTRAINE_H : Math.max(0, volRecentH);
  if (v <= RG_VOL_DEBUTANT_H) return 1;
  if (v >= RG_VOL_ENTRAINE_H) return 0;
  return (RG_VOL_ENTRAINE_H - v) / (RG_VOL_ENTRAINE_H - RG_VOL_DEBUTANT_H);
}

const ANCRES_VOLUME: Ancre[] = [[1.0, 0.75], [1.2, 1.0], [1.5, 1.15]];
export function volumeFactor(prescribedMeanH?: number | null, volRecentH?: number | null): number | null {
  if (!(prescribedMeanH && prescribedMeanH > 0)) return null;
  // P11 — LE PIÈGE DU ZÉRO, DEUXIÈME OCCURRENCE (la troisième est dans `bridge.ts`).
  //
  // Le test était `volRecentH > 0` : `vol_recent = 0` retombait donc sur `null` et le facteur
  // volume disparaissait — pour exactement la population dont le plan multiplie le volume le
  // plus. Partir de zéro, c'est le rapport de dose le plus grand qui existe : le facteur va au
  // plafond de la table, pas à rien.
  //
  // ATTRIBUTION HONNÊTE. Ce défaut-ci était LATENT : sur le chemin livré, le zéro n'arrivait
  // même pas jusqu'ici (`bridge.ts` l'effaçait un maillon plus haut, avec un `|| null`). Il
  // aurait mordu dès la correction du pont. C'est ce qui rend la leçon utile : le piège se
  // corrige sur TOUT LE CHEMIN, pas à l'endroit où on le remarque.
  //
  // C'est le même piège que R20.1 a trouvé sur la rampe R10 (« le piège du `|| undefined` sur un
  // zéro »), jamais rejoué ailleurs jusqu'ici.
  if (!(volRecentH != null && isFinite(volRecentH) && volRecentH >= 0)) return null;
  if (volRecentH === 0) return ANCRES_VOLUME[ANCRES_VOLUME.length - 1][1];
  return interpole(ANCRES_VOLUME, prescribedMeanH / volRecentH);
}

/**
 * P7bis (R14.1) — LA FOURCHETTE DEVIENT ASYMÉTRIQUE, et porte sur le GAIN.
 *
 * La règle symétrique produisait une borne haute absurde : −42 s de natation sur 43 semaines,
 * parce que l'élargissement de l'incertitude annulait le gain du côté pessimiste. Or
 * **HERITAGE** (Bouchard, 483 sujets, programme identique) dit précisément ceci : 7 % des
 * sujets gagnent ≤ 0,1 L/min et 8 % ≥ 0,7 L/min. Le pire cas d'un plan suivi, ce n'est pas de
 * régresser — c'est de ne presque rien gagner. **La borne haute doit donc être ta forme
 * d'aujourd'hui**, et le texte le dit.
 */
export const GAIN_BAND_LO = 0.15;
export const GAIN_BAND_HI = 1.30;
/** Au-delà de cette largeur de fourchette, la projection n'apprend plus rien : on refuse. */
export const GAIN_BAND_MAX_WIDTH = 0.25;
/** P8 — en dessous, le plan ne peut pas produire le gain qu'il prévoyait. */
export const ADHERENCE_FLOOR = 0.5;
/**
 * Facteur appliqué quand l'adhérence n'est pas jugeable (aucun ✓ dans le plan). Ni 1,0
 * (qui promettrait un suivi parfait) ni 0 (qui accuserait quelqu'un qui n'a rien fait de mal) :
 * on projette un suivi NORMAL et on dit que c'est ce qu'on fait.
 */
const ADHERENCE_UNKNOWN_FACTOR = 0.9;

/** `k_structure` retenu, et d'où il vient (pour la traçabilité et le plafond de confiance). */
export function structureFactor(trainingStructure?: string | null, history?: string): { k: number; declared: boolean } {
  const s = String(trainingStructure || "");
  if (K_STRUCTURE[s] !== undefined) return { k: K_STRUCTURE[s], declared: true };
  const h = K_PAR_HISTORY[String(history || "")];
  return { k: h !== undefined ? h : K_DEFAUT, declared: false };
}

const LABEL_REF: Record<string, string> = { ftp: "FTP", thrPace: "allure seuil", css: "CSS", vam: "VAM" };
const LABEL_MARGE = (h: number): string =>
  h >= 0.85 ? "très grande" : h >= 0.62 ? "grande" : h >= 0.38 ? "moyenne" : h >= 0.2 ? "réduite" : "faible";
const LABEL_STRUCTURE: Record<string, string> = {
  feeling: "au feeling, sans plan", intermittent: "plan structuré par intermittence", suivi: "plan structuré suivi",
};

/**
 * P9 — LE LEVIER POIDS, sous gardes dures. Rien ici n'est proposé ni suggéré : le levier
 * n'existe QUE si l'athlète l'a demandé (`weight_lever`) ET a saisi lui-même une cible.
 * Aucun calendrier, aucun rythme de perte, aucun apport — la frontière nutrition du manifeste
 * s'applique telle quelle. Une sensibilité, jamais un objectif.
 */
function weightLeverOf(input: ProjectionInput): { lever: WeightLever | null; refus: string | null } {
  if (!input.weightLeverAsked || !(input.weightTargetKg && input.weightTargetKg > 0)) return { lever: null, refus: null };
  const now = input.weightKg || 0, cible = input.weightTargetKg;
  if (!(now > 0) || cible >= now) return { lever: null, refus: null };
  // Gardes DURES — chacune neutralise le levier en silence (afficher le refus serait déjà
  // parler du poids à quelqu'un à qui on a décidé de ne pas en parler).
  const h = input.heightCm && input.heightCm > 0 ? input.heightCm / 100 : 0;
  const imcCible = h > 0 ? cible / (h * h) : 0;
  if (h > 0 && imcCible < 18.5) return { lever: null, refus: "IMC cible sous 18,5" };
  if (input.age != null && input.age < 18) return { lever: null, refus: "athlète mineur" };
  if (input.medicalFlag) return { lever: null, refus: "drapeau médical actif" };
  const semaines = Math.max(1, input.horizonWeeks);
  if ((now - cible) / semaines > 0.5) return { lever: null, refus: "perte impliquée > 0,5 kg/semaine" };
  const ftp = input.refs ? input.refs.ftp : 0;
  // CAP : ~0,8 %/1 % de masse (fourchette 0,7-1,0 % dans la littérature sur le coût énergétique).
  const runGainPct = ((now - cible) / now) * 0.008 * 100;
  return {
    lever: {
      currentKg: Math.round(now * 10) / 10,
      targetKg: Math.round(cible * 10) / 10,
      wkgNow: ftp > 0 ? Math.round((ftp / now) * 100) / 100 : null,
      wkgTarget: ftp > 0 ? Math.round((ftp / cible) * 100) / 100 : null,
      runGainPct: Math.round(runGainPct * 100) / 100,
      why: "Sensibilité, pas une cible : à FTP identique, ton rapport W/kg passerait de "
        + (ftp > 0 ? Math.round((ftp / now) * 100) / 100 + " à " + Math.round((ftp / cible) * 100) / 100 + " W/kg" : "—")
        + ", et le coût énergétique de la course baisse d'environ 0,8 % par 1 % de masse. Sur le vélo, "
        + "l'effet ne se voit qu'en montée : à plat, c'est la puissance qui décide, pas le rapport. "
        + "Ce chiffre montre ce que la balance changerait — il ne dit ni comment, ni à quel rythme, "
        + "et ces questions-là se traitent avec un professionnel de santé, pas avec un plan d'entraînement.",
    },
    refus: null,
  };
}

/**
 * P3 — LA MESURE DE L'ATHLÈTE PRIME SUR NOTRE HEURISTIQUE.
 *
 * Deux tests datés du même type, espacés d'au moins 6 semaines, donnent un taux RÉEL de
 * progression (%/semaine). On le rétrécit vers le prior (`w = n/(n+2)` — deux points ne
 * font pas une tendance, dix la font), puis on le BORNE par le plafond P2 : un athlète qui
 * a gagné 13 % en six mois ne gagnera pas 26 % en douze, la courbe sature.
 *
 * C'est la seule façon de sortir de l'heuristique : l'athlète devient sa propre référence.
 */
function measuredRate(tests: RefTest[] | undefined, type: string): { ratePerWeek: number; n: number } | null {
  const pts = (tests || [])
    .filter((t) => t && t.type === type && Number.isFinite(+t.value) && +t.value > 0 && t.date)
    .map((t) => ({ v: +t.value, d: Date.parse(t.date + "T00:00:00Z") }))
    .filter((t) => Number.isFinite(t.d))
    .sort((x, y) => x.d - y.d);
  if (pts.length < 2) return null;
  const first = pts[0], last = pts[pts.length - 1];
  const weeks = (last.d - first.d) / (7 * 864e5);
  if (weeks < 6) return null; // deux tests rapprochés mesurent le bruit, pas la progression
  // L'allure seuil est un temps : progresser, c'est BAISSER. On ramène tout à « fraction de
  // gain », positive quand l'athlète s'améliore, quel que soit le sens de la grandeur.
  const gain = type === "thrPace" ? (first.v - last.v) / first.v : (last.v - first.v) / first.v;
  return { ratePerWeek: gain / weeks, n: pts.length };
}

export function projectForm(input: ProjectionInput): ProjectionResult {
  const decisions: Decision[] = [];
  const D = (id: string, what: string, val: string, why: string) => decisions.push({ id, what, val, why });
  const w = Math.max(0, input.horizonWeeks);

  // ---- P2bis : la marge se lit sur les références MESURÉES, plus sur un adjectif ----
  // P11 — et le RÉGIME décide de QUEL modèle de gain s'applique : celui de l'entraîné (publié)
  // ou celui de quelqu'un qui part de zéro. Interpolé entre les deux, déclenché par le volume
  // récent MESURÉ, jamais par un adjectif.
  const rg = regimeDebutant(input.volRecentH);
  const tau = TAU_WEEKS + rg * (RG_TAU_DEBUTANT - TAU_WEEKS);
  const capAbsolu = GAIN_MAX_ABSOLU + rg * (RG_GAIN_MAX_DEBUTANT - GAIN_MAX_ABSOLU);
  const sat = 1 - Math.exp(-w / tau);
  const marge = {
    ftp: margeOf("ftp", input.refs, input.weightKg, input.sex, input.age),
    thrPace: margeOf("thrPace", input.refs, input.weightKg, input.sex, input.age),
    css: margeOf("css", input.refs, input.weightKg, input.sex, input.age),
    vam: margeOf("vam", input.refs, input.weightKg, input.sex, input.age),
  };
  const { k, declared: kDit } = structureFactor(input.trainingStructure, input.history);
  const fVol = volumeFactor(input.prescribedMeanH, input.volRecentH);
  const mDite = marge.ftp ?? marge.thrPace ?? marge.css;
  D("P2", "Marge de progression retenue", mDite == null ? "non calculable" : LABEL_MARGE(mDite),
    "Elle se lit sur tes références MESURÉES, pas sur ton ancienneté : des années de pratique au "
    // Volontairement SANS unité rapportée au poids : quelqu'un qui n'a pas ouvert la question du
    // poids (P9) ne doit pas la voir arriver par la porte d'une explication de marge. Le rapport
    // puissance/masse n'apparaît que dans le levier, et seulement s'il a été demandé.
    + "feeling ne rapprochent pas du plafond physiologique. Quelqu'un encore loin de son plafond a "
    + "beaucoup de marge, quelqu'un qui en est proche en a peu — et c'est ça qui décide, pas le "
    + "nombre d'années de pratique. La courbe "
    + "SATURE (constante de temps " + TAU_WEEKS + " semaines) : les premières semaines rapportent bien "
    + "plus que les dernières. Bandes vélo d'après le profil de puissance de Coggan ; bandes course et "
    + "nage heuristiques — tes propres tests les remplacent (P3).");
  D("P2-structure", "Structure de ton entraînement récent",
    kDit ? LABEL_STRUCTURE[String(input.trainingStructure)] : "non renseignée (estimée)",
    "Ce qui compte n'est pas depuis combien d'années tu t'entraînes, mais si tu as suivi un PLAN. "
    + (kDit
      ? "Un plan déjà suivi a consommé une partie du bénéfice qu'un plan apporte — la marge restante est plus petite, et c'est une bonne nouvelle sur ton niveau."
      : "Sans ta réponse, on estime prudemment et la confiance de la projection reste plafonnée : renseigne-la au Profil pour l'affiner."));
  if (fVol != null)
    D("P10", "Volume du plan vs ton volume récent", "×" + fVol.toFixed(2) + " sur le gain",
      "Un plan qui MONTE le volume produit plus qu'un plan de maintien : c'est la dose qui fait "
      + "l'adaptation. Le facteur est plafonné à 1,15 volontairement — au-delà, le volume "
      + "supplémentaire ne se convertit plus proportionnellement en performance et fait monter le "
      + "risque de blessure. Le moteur ne récompense pas la surcharge.");

  // ---- P1 : adhérence, fenêtre glissante — jamais le % du plan entier ----
  let adhFactor: number;
  let adherence: number;
  if (input.adherence == null) {
    adherence = ADHERENCE_UNKNOWN_FACTOR;
    adhFactor = ADHERENCE_UNKNOWN_FACTOR;
    D("P1", "Adhérence récente", "pas encore mesurable",
      "Aucune séance cochée pour l'instant : on projette un suivi NORMAL, ni parfait ni absent. "
      + "Dès que tu coches tes séances, cette projection se cale sur ton adhérence RÉELLE des "
      + "6 dernières semaines — et elle deviendra plus fiable.");
  } else {
    adherence = input.adherence;
    // Sous le plancher, le gain tombe à ~0. Ce n'est pas une punition, c'est une conséquence :
    // un plan à moitié fait ne produit pas l'adaptation qu'il prévoyait, et le dire à l'avance
    // vaut mieux que de le découvrir sur la ligne de départ.
    adhFactor = adherence < ADHERENCE_FLOOR ? 0 : Math.min(1, adherence);
    D("P1", "Adhérence des 6 dernières semaines", Math.round(adherence * 100) + "% des minutes prévues",
      adherence < ADHERENCE_FLOOR
        ? "Sur les 6 dernières semaines, moins de la moitié des séances ont été faites — le plan ne "
          + "peut pas produire le gain qu'il prévoyait, et te projeter un chrono en progrès serait te "
          + "mentir. Rien n'est perdu : la régularité se reprend, et la projection avec elle."
        : "Mesurée sur les semaines ÉCOULÉES uniquement (les séances à venir ne comptent ni pour "
          + "ni contre toi) : c'est ce qui a été fait qui produit l'adaptation.");
  }

  // ---- P4 : le bénéfice d'affûtage ne s'ajoute que si l'affûtage EXISTE ----
  const taper = input.taperConform ? TAPER_GAIN : 0;
  D("P4", "Bénéfice d'affûtage", input.taperConform ? "+" + (TAPER_GAIN * 100).toFixed(1) + "%" : "non compté",
    input.taperConform
      ? "Ton plan affûte conformément (2-3 semaines, volume réduit de 41 à 60 % du pic, intensité "
        + "MAINTENUE) : méta-analyse Bosquet 2007 (27 études), gain moyen +1,96 % le jour J. C'est "
        + "l'affûtage qui transforme l'entraînement en performance."
      : "Le plan ne contient pas d'affûtage conforme (2-3 semaines, −41 à −60 % de volume, intensité "
        + "maintenue) : promettre le gain d'affûtage sans l'affûtage serait citer la littérature à faux.");

  // ---- P3 puis composition finale, référence par référence ----
  const gainPct = { ftp: 0, thrPace: 0, css: 0, vam: 0 };
  const gainBand = {
    ftp: [0, 0], thrPace: [0, 0], css: [0, 0], vam: [0, 0],
  } as ProjectionResult["gainBand"];
  let mesures = 0, priors = 0;
  for (const key of ["ftp", "thrPace", "css", "vam"] as const) {
    // P2bis — sans marge calculable (référence absente, ou poids manquant pour les W/kg), on
    // retombe sur une marge MOYENNE plutôt que sur zéro : ne rien projeter du tout parce qu'on
    // ignore le poids serait une punition administrative, pas un raisonnement d'entraîneur.
    const h = marge[key] ?? 0.5;
    // P11 — le plafond de la discipline suit le RÉGIME (interpolé, jamais à seuil franc).
    const plafondDisc = G_PLAFOND[key] + rg * ((G_PLAFOND_DEBUTANT[key] ?? G_PLAFOND[key]) - G_PLAFOND[key]);
    const plafond = plafondDisc * h * k * (fVol ?? 1);
    const prior = plafond * sat;
    let brut = prior;
    const m = measuredRate(input.tests, key);
    if (m) {
      const wm = m.n / (m.n + 2); // rétrécissement vers le prior : 2 points → 0,5 ; 10 points → 0,83
      const mesure = Math.max(0, m.ratePerWeek * w);
      brut = Math.min(wm * mesure + (1 - wm) * prior, prior); // BORNÉ par P2 : la courbe sature
      mesures++;
      D("P3", "Ta progression mesurée sur " + LABEL_REF[key],
        (m.ratePerWeek * 100).toFixed(2) + "%/semaine sur " + m.n + " tests datés",
        "Tes propres tests remplacent notre heuristique, pondérés à " + Math.round(wm * 100) + "% "
        + "(deux points ne font pas une tendance, dix la font) et bornés par le plafond de ton profil — "
        + "prolonger un taux mesuré en ligne droite sur un an ferait de toi un champion du monde sur le papier.");
    } else priors++;
    const g4 = (x: number) => Math.round(Math.min(capAbsolu, Math.max(0, x)) * 10000) / 10000;
    const ref = g4(brut * adhFactor + taper);
    gainPct[key] = ref;
    // P7bis — fourchette ASYMÉTRIQUE sur le gain : le pire cas d'un plan suivi n'est pas de
    // régresser, c'est de ne presque rien gagner (HERITAGE).
    gainBand[key] = [g4(GAIN_BAND_LO * ref), g4(GAIN_BAND_HI * ref)];
  }
  const gainSource: ProjectionResult["gainSource"] = mesures === 0 ? "prior" : priors === 0 ? "mesure" : "mixte";

  // ---- P7 : l'incertitude se calcule et s'affiche ----
  // Elle monte avec l'horizon (plus c'est loin, moins on sait) et avec l'ÂGE de la référence
  // (un test d'il y a un an ne décrit plus personne), et elle descend avec la régularité.
  const refAge = input.refAgeWeeks == null ? 0 : Math.max(0, input.refAgeWeeks);
  const largeur = Math.max(...(["ftp", "thrPace", "css"] as const).map((x) => gainBand[x][1] - gainBand[x][0]));
  D("P7", "Fourchette de la projection", "gain entre ×" + GAIN_BAND_LO.toFixed(2) + " et ×" + GAIN_BAND_HI.toFixed(2) + " de la valeur de référence",
    "Un même programme produit des gains très différents d'une personne à l'autre — sur 483 sujets "
    + "suivis 20 semaines avec le MÊME programme (HERITAGE), 7 % n'ont presque rien gagné et 8 % "
    + "ont énormément gagné. Une projection ponctuelle serait fausse par construction. La fourchette "
    + "est volontairement ASYMÉTRIQUE : au pire, ta forme d'aujourd'hui — le plan ne te rend pas plus "
    + "lent, il peut seulement rapporter moins que prévu.");

  let applicable = true;
  if (largeur > GAIN_BAND_MAX_WIDTH) {
    applicable = false;
    D("P7-refus", "Pas de chrono projeté", "fourchette de " + (largeur * 100).toFixed(0) + " points",
      "Trop tôt pour projeter un chrono : à cet horizon et avec ce qu'on sait de toi, la fourchette "
      + "honnête serait si large qu'elle n'apprendrait rien. Voici ta forme d'AUJOURD'HUI — reviens "
      + "quand la course approchera, la projection s'affinera d'elle-même.");
  }
  if (refAge > 52)
    D("P7-age-ref", "Ancienneté de ta dernière référence", Math.round(refAge / 4.35) + " mois",
      "Un test d'il y a plus d'un an ne décrit plus vraiment personne : la projection part d'un point "
      + "de départ incertain. Un retest la rendrait nettement plus fiable — et c'est gratuit.");

  // R14.1 — LA CONFIANCE EST HONNÊTE AU JOUR 0. Un plan jamais commencé affichait « confiance
  // moyenne » : c'est une promesse que rien ne soutient encore. Tant qu'aucune semaine ne s'est
  // écoulée, la seule valeur défendable est « faible ».
  let confidence: ProjectionResult["confidence"];
  if (!applicable || input.adherence == null || adhFactor === 0) confidence = "faible";
  else if (largeur <= 0.10 && adherence >= 0.8 && (gainSource !== "prior" || refAge <= 26)) confidence = "bonne";
  else confidence = "moyenne";
  // Sans la question de structure, on ne sait pas ce que le plan a déjà consommé de marge :
  // la confiance ne peut pas monter à « bonne ».
  if (!kDit && confidence === "bonne") confidence = "moyenne";

  const { lever, refus } = weightLeverOf(input);
  if (lever)
    D("P9", "Levier poids (à ta demande)", lever.currentKg + " → " + lever.targetKg + " kg",
      "Tu as demandé à voir ce levier et tu as saisi la cible toi-même : on montre une SENSIBILITÉ, "
      + "jamais un objectif, et sans aucun rythme ni aucune consigne alimentaire — ce terrain revient "
      + "à un professionnel de santé, pas à un plan d'entraînement.");
  else if (refus)
    D("P9-garde", "Levier poids neutralisé", refus,
      "Ce levier ne s'affiche pas dans ce cas de figure. La priorité n°1 du manifeste est la santé, et "
      + "elle passe avant une optimisation de quelques pourcents.");

  return {
    applicable, horizonWeeks: Math.round(w * 10) / 10, adherence, gainPct, gainBand, gainSource,
    confidence, weightLever: lever, decisions,
  };
}

/**
 * P1 — L'ADHÉRENCE EST UNE FENÊTRE GLISSANTE, PAS UN POURCENTAGE DE PLAN.
 *
 * `pctLoad` (barre d'avancement) vaut `doneMin / totalMin` sur le plan ENTIER, futur compris :
 * 30 semaines parfaites sur 59 donnent 43 %, sous le seuil de 60 % qui resserrait la fourchette.
 * La condition était donc mécaniquement inatteignable en début de préparation et devenait vraie
 * en fin de plan pour une raison qui n'a rien à voir avec la régularité. Il reste ce qu'il est
 * pour la barre d'avancement, mais il ne pilote plus rien ici.
 *
 * Deux garde-fous sur la mesure elle-même :
 *  - seules les journées ÉCOULÉES comptent (une séance de mardi prochain n'est pas « ratée ») ;
 *  - AUCUN ✓ dans tout le plan → `null` (non jugeable) plutôt que 0. Quelqu'un qui n'utilise pas
 *    les coches n'est pas quelqu'un qui ne s'entraîne pas, et le manifeste interdit le reproche.
 */
export function adherenceWindow(
  plan: { weeks: { num: number; days: { jour: string; date?: string; sessions: { d: string; min?: number; race?: boolean }[] }[] }[] },
  done: Record<string, boolean>,
  todayISO: string,
  weeks = 6
): number | null {
  if (!done || Object.keys(done).length === 0) return null;
  const cut = new Date(Date.parse(todayISO + "T00:00:00Z") - weeks * 7 * 864e5).toISOString().slice(0, 10);
  let prescrit = 0, fait = 0;
  for (const wk of plan.weeks)
    for (const d of wk.days) {
      if (!d.date || d.date >= todayISO || d.date < cut) continue;
      d.sessions.forEach((s, si) => {
        if (s.d === "rs" || s.race) return; // le repos ne se « rate » pas, une course n'est pas une séance
        const min = Math.max(0, s.min || 0);
        prescrit += min;
        if (done[wk.num + "|" + d.jour + "|" + si]) fait += min;
      });
    }
  if (prescrit <= 0) return null;
  return Math.min(1, fait / prescrit);
}

/**
 * P4 — L'AFFÛTAGE EST-IL CONFORME ? Les trois critères de Bosquet 2007, vérifiés sur le plan
 * LIVRÉ et pas sur la présence d'une phase nommée « taper » : c'est la réduction réelle qui
 * produit le gain, pas l'étiquette. Le jour J lui-même est exclu du calcul (il porte `min: 0`
 * depuis R13.4 et fausserait la moyenne de la dernière semaine).
 */
export function taperIsConform(plan: {
  weeks: { num: number; phase?: { id?: string }; days: { sessions: { min?: number; race?: boolean; steps?: unknown[] }[] }[] }[];
}): boolean {
  const semaines = plan.weeks || [];
  if (!semaines.length) return false;
  const charge = (wk: (typeof semaines)[number]) =>
    wk.days.reduce((t, d) => t + d.sessions.reduce((u, s) => u + (s.race ? 0 : Math.max(0, s.min || 0)), 0), 0);
  const taper = semaines.filter((wk) => wk.phase && wk.phase.id === "taper");
  if (taper.length < 2 || taper.length > 3) return false; // Bosquet : 8-14 jours, ~3 semaines max
  const pic = Math.max(...semaines.filter((wk) => !taper.includes(wk)).map(charge), 0);
  if (pic <= 0) return false;
  // Réduction de 41 à 60 % du volume du pic, mesurée sur la MOYENNE des semaines d'affûtage :
  // c'est la dose totale d'affûtage qui compte, pas le creux d'une semaine isolée.
  const moy = taper.reduce((t, wk) => t + charge(wk), 0) / taper.length;
  const reduction = 1 - moy / pic;
  return reduction >= 0.41 && reduction <= 0.60;
}
