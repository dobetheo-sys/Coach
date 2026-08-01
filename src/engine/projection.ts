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

export interface ProjectionResult {
  applicable: boolean;
  horizonWeeks: number;
  adherence: number;
  gainPct: { ftp: number; thrPace: number; css: number; vam: number };
  gainSource: "prior" | "mesure" | "mixte";
  spreadPct: number;
  confidence: "faible" | "moyenne" | "bonne";
  decisions: Decision[];
}

/**
 * P2 — PLAFONDS DE GAIN PAR PROFIL (fractions annuelles asymptotiques).
 *
 * La course reçoit un plafond plus bas que le vélo, et ce n'est pas un arrondi : l'économie
 * de course ne gagne que 2-4 % (Barnes & Kilding 2015) et progresse lentement, là où la FTP
 * répond vite à un bloc structuré. Nager progresse entre les deux — la technique offre de la
 * marge, mais elle s'acquiert lentement.
 *
 * ⚠ HEURISTIQUE CONVERGENTE, PAS UNE VÉRITÉ. Ces nombres n'ont pas de source primaire ; ils
 * sont écrits ici pour être remplacés par la mesure de l'athlète dès que P3 en a les moyens.
 */
export const G_INFINI: Record<string, { ftp: number; thrPace: number; css: number; vam: number }> = {
  debutant: { ftp: 0.24, thrPace: 0.18, css: 0.20, vam: 0.20 },
  inter: { ftp: 0.08, thrPace: 0.06, css: 0.07, vam: 0.07 },
  avance: { ftp: 0.04, thrPace: 0.03, css: 0.035, vam: 0.035 },
};
const BUCKET_BY_LEVEL: Record<string, string> = { debutant: "debutant", inter: "inter", avance: "avance" };
const BUCKET_BY_HISTORY: Record<string, string> = { reprise: "debutant", confirme: "inter", ancien: "avance" };
const BUCKET_ORDER = ["debutant", "inter", "avance"];

/** P2 — constante de temps de la saturation : le gain ralentit, il ne s'accumule pas. */
export const TAU_WEEKS = 20;
/** P4 — Bosquet 2007, gain moyen d'un affûtage CONFORME. */
export const TAPER_GAIN = 0.0196;
/** P7 — au-delà, on refuse d'afficher un chrono projeté (repère : SEE de Rüst 2011 ≈ ±8 %). */
export const SPREAD_MAX = 0.12;
export const SPREAD_MIN = 0.03;
/** P8 — en dessous, le plan ne peut pas produire le gain qu'il prévoyait. */
export const ADHERENCE_FLOOR = 0.5;
/**
 * Facteur appliqué quand l'adhérence n'est pas jugeable (aucun ✓ dans le plan). Ni 1,0
 * (qui promettrait un suivi parfait) ni 0 (qui accuserait quelqu'un qui n'a rien fait de mal) :
 * on projette un suivi NORMAL et on dit que c'est ce qu'on fait.
 */
const ADHERENCE_UNKNOWN_FACTOR = 0.9;

/**
 * Le plafond retenu est le PLUS BAS des deux que suggèrent `level` et `history`.
 *
 * Deux raisons, et la première suffit : la liste noire du handoff dit « ne jamais appliquer
 * un gain de débutant à un athlète expérimenté ». La seconde est la doctrine R12 — un
 * adjectif auto-déclaré (`level`) ne doit pas piloter un nombre plus haut que ce que la
 * réponse FACTUELLE (`history`, l'ancienneté de pratique) autorise. Un gain surestimé se
 * paie en promesse non tenue le jour J ; un gain sous-estimé se corrige au premier retest.
 */
export function gainCeiling(level?: string, history?: string): { bucket: string; g: typeof G_INFINI[string] } {
  const a = BUCKET_BY_LEVEL[String(level || "")] ?? null;
  const b = BUCKET_BY_HISTORY[String(history || "")] ?? null;
  const candidats = [a, b].filter((x): x is string => !!x);
  const bucket = candidats.length
    ? candidats.reduce((lo, x) => (BUCKET_ORDER.indexOf(x) > BUCKET_ORDER.indexOf(lo) ? x : lo))
    : "inter";
  return { bucket, g: G_INFINI[bucket] };
}

const LABEL_BUCKET: Record<string, string> = {
  debutant: "débutant ou en reprise", inter: "intermédiaire / confirmé", avance: "avancé / longue date",
};
const LABEL_REF: Record<string, string> = { ftp: "FTP", thrPace: "allure seuil", css: "CSS", vam: "VAM" };

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

  // ---- P2 : plafond par profil, saturation exponentielle ----
  const { bucket, g } = gainCeiling(input.level, input.history);
  const sat = 1 - Math.exp(-w / TAU_WEEKS);
  D("P2", "Marge de progression retenue", LABEL_BUCKET[bucket],
    "Plafond du profil le plus prudent entre ton niveau et ton ancienneté de pratique — un gain "
    + "surestimé se paie le jour J. La courbe SATURE (constante de temps " + TAU_WEEKS + " semaines) : "
    + "les premières semaines rapportent beaucoup plus que les dernières. Ces plafonds sont des "
    + "heuristiques de coaching, pas une loi : tes propres tests les remplacent (P3).");

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
  let mesures = 0, priors = 0;
  for (const k of ["ftp", "thrPace", "css", "vam"] as const) {
    const prior = g[k] * sat;
    let brut = prior;
    const m = measuredRate(input.tests, k);
    if (m) {
      const wm = m.n / (m.n + 2); // rétrécissement vers le prior : 2 points → 0,5 ; 10 points → 0,83
      const mesure = Math.max(0, m.ratePerWeek * w);
      brut = Math.min(wm * mesure + (1 - wm) * prior, g[k] * sat); // BORNÉ par P2 : la courbe sature
      mesures++;
      D("P3", "Ta progression mesurée sur " + LABEL_REF[k],
        (m.ratePerWeek * 100).toFixed(2) + "%/semaine sur " + m.n + " tests datés",
        "Tes propres tests remplacent notre heuristique, pondérés à " + Math.round(wm * 100) + "% "
        + "(deux points ne font pas une tendance, dix la font) et bornés par le plafond de ton profil — "
        + "prolonger un taux mesuré en ligne droite sur un an ferait de toi un champion du monde sur le papier.");
    } else priors++;
    gainPct[k] = Math.round((brut * adhFactor + taper) * 10000) / 10000;
  }
  const gainSource: ProjectionResult["gainSource"] = mesures === 0 ? "prior" : priors === 0 ? "mesure" : "mixte";

  // ---- P7 : l'incertitude se calcule et s'affiche ----
  // Elle monte avec l'horizon (plus c'est loin, moins on sait) et avec l'ÂGE de la référence
  // (un test d'il y a un an ne décrit plus personne), et elle descend avec la régularité.
  const refAge = input.refAgeWeeks == null ? 0 : Math.max(0, input.refAgeWeeks);
  const spreadBrut = 0.03 + 0.05 * (w / 52) + 0.03 * (refAge / 52) - 0.02 * (adherence - 0.5);
  const spreadPct = Math.min(SPREAD_MAX, Math.max(SPREAD_MIN, spreadBrut));
  const tropLoin = spreadBrut > SPREAD_MAX;
  D("P7", "Incertitude de la projection", "±" + (spreadPct * 100).toFixed(1) + "%",
    "Un même programme produit des gains très différents d'une personne à l'autre — sur 483 sujets "
    + "suivis 20 semaines (HERITAGE), 7 % n'ont presque rien gagné et 8 % ont énormément gagné. Une "
    + "projection ponctuelle serait fausse par construction : seule une fourchette est honnête. "
    + "Elle s'élargit avec l'horizon (" + Math.round(w) + " semaines)"
    + (refAge > 0 ? " et avec l'âge de ta dernière référence (" + Math.round(refAge) + " semaines)" : "")
    + ", et se resserre avec ta régularité.");

  let applicable = true;
  if (tropLoin) {
    applicable = false;
    D("P7-refus", "Pas de chrono projeté", "±" + (spreadBrut * 100).toFixed(1) + "% > ±" + SPREAD_MAX * 100 + "%",
      "Trop tôt pour projeter un chrono : à cet horizon, la fourchette honnête serait si large "
      + "qu'elle n'apprendrait rien. Voici ta forme d'AUJOURD'HUI — reviens quand la course "
      + "approchera, la projection s'affinera d'elle-même.");
  }

  const confidence: ProjectionResult["confidence"] =
    !applicable || spreadPct >= 0.09 || adhFactor === 0 ? "faible"
      : spreadPct <= 0.05 && (gainSource !== "prior" || adherence >= 0.8) ? "bonne"
        : "moyenne";

  return { applicable, horizonWeeks: Math.round(w * 10) / 10, adherence, gainPct, gainSource, spreadPct, confidence, decisions };
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
