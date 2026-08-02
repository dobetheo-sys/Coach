/**
 * R11 — LE CONTRAT D'ENTRÉE DU MOTEUR.
 *
 * Constat de l'audit amont du 30/07/2026 : sur 551 entrées fausses, le moteur a produit un plan
 * crédible 544 fois et planté 7 fois avec une `TypeError` nue. Il n'a JAMAIS refusé de générer.
 * `vol_max: "abc"` donnait un Ironman à 30 min hebdo de pic, sans un mot. C'était la
 * contradiction directe de la règle du projet : « un plan faux est plus dangereux que pas de
 * plan » — le garde-fou existait côté app, rien ne le déclenchait jamais.
 *
 * Ce module est la SOURCE DE VÉRITÉ UNIQUE des domaines de valeurs. Tant qu'ils sont écrits
 * deux fois (ici et dans le questionnaire), ils divergent : c'est exactement comme ça qu'une
 * énumération renommée entre deux versions a pu faire perdre 91 % du volume d'un plan trail,
 * en silence.
 *
 * TROIS SORTIES, JAMAIS UNE QUATRIÈME (R11.2) :
 *   1. `EBInputError` — valeur hors domaine, type faux, requis manquant. Refus MOTIVÉ.
 *   2. `warnings[]` porté par le plan et affiché — contradictions, plafonnements appliqués.
 *   3. `defaults[]` journalisé dans `decisions` — un défaut appliqué est visible, jamais tacite.
 * Interdit : rendre un plan sans qu'aucun des trois canaux ne se soit exprimé.
 */
import type { AthleteProfile } from "./types.ts";
import { MIN_WEEKS } from "./constraintMatrix.ts";
import { trailObjective, T6_MIN_WEEKS } from "./trailModel.ts";

/** Refus d'entrée : porteur de la clé, de la valeur reçue et de ce qui était attendu. */
export class EBInputError extends Error {
  code = "ENTREE_INVALIDE";
  key: string;
  value: unknown;
  expected: string;
  /** Message prêt à afficher à l'athlète — c'est lui qui répare, pas un développeur. */
  human: string;
  constructor(key: string, value: unknown, expected: string, human: string) {
    super("ENTREE_INVALIDE " + key + " = " + JSON.stringify(value) + " (attendu : " + expected + ")");
    this.name = "EBInputError";
    this.key = key; this.value = value; this.expected = expected; this.human = human;
  }
}

export type FieldType = "enum" | "csv" | "number" | "date";

/**
 * R12.6 — LA NATURE DE CHAQUE QUESTION, et ce qu'elle a le droit de piloter.
 *
 * L'audit grand public a nommé le vrai critère de conception d'une V1 : *est-ce que quelqu'un
 * peut répondre à cette question sans faire de test ?*
 *
 *   · `vecue`   — répondable par tout le monde, de mémoire. C'est la matière première.
 *   · `mesuree` — demande un test ou une montre. DOIT avoir (a) un repli qui DÉGRADE
 *                 proprement (zone, RPE, sensation) et (b) un chemin d'acquisition DANS l'outil.
 *   · `estimee` — auto-déclarée, invérifiable (« ton niveau »). Elle a le droit de moduler le
 *                 CONTENU d'une séance ; elle n'a PAS le droit de piloter une grandeur
 *                 numérique — c'est exactement là que ça a cassé, avec trois heures d'écart sur
 *                 une estimation de course selon la case cochée.
 */
export type QuestionNature = "vecue" | "mesuree" | "estimee";

export interface FieldSpec {
  type: FieldType;
  label: string;              // libellé humain — le message d'erreur parle à l'athlète
  domain?: string[];          // enum / csv
  min?: number; max?: number;  // number
  unit?: string;
  sports?: string[];          // pertinent seulement pour ces sports
  /** R12.6 — vécue / mesurée / estimée. Voir `QuestionNature`. */
  nature?: QuestionNature;
  /** Champ sans lequel le plan serait bâti sur une valeur que l'athlète n'a jamais donnée. */
  required?: boolean;
  /** … ou requis pour CES sports seulement (le trail décrit son objectif par ses données,
   *  le swimrun par son format : la même clé n'a pas le même statut partout). */
  requiredFor?: string[];
  /** Ce que le moteur prendra si le champ est absent. Sa seule raison d'être ici : le
   *  JOURNALISER (R11.2, canal 3). Un défaut tacite est un mensonge par omission. */
  fallback?: string;
}

/**
 * Les formats par sport — le domaine de `format`, UN SEUL endroit (R11.1). Ces listes sont
 * celles du questionnaire ; l'UI doit les lire ici (`EBV2.formatsBySport`) au lieu d'en garder
 * une copie littérale. Une énumération écrite deux fois est une énumération qui divergera.
 */
export const FORMATS_BY_SPORT: Record<string, string[]> = {
  run: ["5k", "10k", "semi", "marathon"],
  bike: ["crit", "route", "cyclo", "clm", "gravel"],
  swim: ["sprint", "demifond", "fond", "ow"],
  tri: ["S", "M", "70.3", "Full"],
  duathlon: ["S", "M", "L", "PM"],
  swimrun: ["experience", "sprint", "series", "championship"],
  trail: [], // le trail n'a PAS de format : sa catégorie d'effort est DÉDUITE des données de course (R7)
};

/**
 * R15.7-C — ÉLIGIBILITÉ : ÂGE × FORMAT. Le moteur savait protéger un mineur (R6.3 : charge
 * ×0,70, zéro VO2max, récupération allongée) mais **rien ne croisait l'âge et le format**.
 * Mesuré : `age: 15` + `tri/Full` était accepté, 59 semaines, pic 7,7 h — une préparation
 * d'un an pour une épreuve où l'inscription est refusée.
 *
 * L'argument est celui qui existe déjà dans le refus de R11.4 : *« te vendre une préparation
 * d'Ironman en un mois serait te mentir »*. Préparer douze mois une épreuve à laquelle on ne
 * pourra pas s'inscrire relève exactement du même mensonge, en plus long.
 *
 * Les âges sont ceux des règlements d'inscription les plus répandus (IRONMAN et 70.3 : 18 ans ;
 * marathons de grandes villes : 18 à 20 ans ; ultras longs : 18 ans). Ils ne sont PAS une
 * limite physiologique — les formats courts restent ouverts et protégés par R6.3, qui reste
 * le bon outil pour la charge.
 */
export const AGE_MINI_FORMAT: Record<string, Record<string, number>> = {
  tri: { Full: 18, "70.3": 18 },
  run: { marathon: 18 },
  duathlon: { PM: 18 },
};
/** Trail : la règle porte sur la DISTANCE, pas sur un format (le trail n'en a pas). */
export const AGE_MINI_TRAIL_KM = 50;
/** Le format immédiatement accessible, pour ne jamais refuser sans proposer. */
const REPLI_FORMAT: Record<string, Record<string, string>> = {
  tri: { Full: "M ou 70.3 à 18 ans", "70.3": "S ou M" },
  run: { marathon: "10 km ou semi-marathon" },
  duathlon: { PM: "S, M ou L" },
};

/**
 * Durée MINIMALE de préparation (R11.4). La table existe DÉJÀ dans la matrice de contraintes,
 * avec sa provenance : on la LIT, on n'en recopie pas une seconde — c'est précisément le
 * défaut que R11.1 corrige. Elle était calculée et jamais appliquée : le moteur acceptait de
 * préparer un Ironman en 4 semaines. Un outil qui accepte ça cautionne la blessure.
 */
// (importée en tête de fichier — pas de seconde table.)

const OUI_NON = ["oui", "non"];
const enumF = (label: string, domain: string[], sports?: string[]): FieldSpec => ({ type: "enum", label, domain, sports });
const numF = (label: string, min: number, max: number, unit?: string, sports?: string[]): FieldSpec => ({ type: "number", label, min, max, unit, sports });

/**
 * LE SCHÉMA. Toute clé absente d'ici n'est pas validée (l'état de l'app porte quantité de
 * champs qui ne sont pas des réponses : journal, ✓, jetons…). Toute clé présente ici est
 * validée partout, sans exception.
 */
export const ANSWER_SCHEMA: Record<string, FieldSpec> = {
  // ---- Communes ----
  intent: { ...enumF("ton intention", ["competition", "finir", "plaisir"]), fallback: "plaisir/finir (marge de 0,9 sur le volume)" , nature: "vecue" },
  level: { ...enumF("ton niveau", ["debutant", "inter", "avance"]), fallback: "inter" , nature: "estimee" },
  history: { ...enumF("ton historique d'entraînement", ["reprise", "confirme", "ancien"]), fallback: "confirme" , nature: "vecue" },
  dispo: { ...enumF("ta disponibilité", ["quotidienne", "semaine", "partielle", "weekend"]), nature: "vecue" },
  doubles: { ...enumF("les doubles séances", ["oui", "parfois", "non"]), nature: "vecue" },
  off_days: { ...enumF("les jours bloqués", OUI_NON), nature: "vecue" },
  off_which: { type: "csv", label: "tes jours bloqués", domain: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] , nature: "vecue" },
  shift_ok: { ...enumF("le décalage de tes jours", OUI_NON), nature: "vecue" },
  sex: { ...enumF("ton sexe", ["F", "H", "np"]), nature: "vecue" },
  sleep: { ...enumF("ton sommeil", ["court", "moyen", "bon"]), nature: "vecue" },
  life_load: { ...enumF("ta charge de vie", ["legere", "normale", "lourde"]), nature: "vecue" },
  activity: { ...enumF("ton activité quotidienne", ["sedentaire", "modere", "actif"]), nature: "vecue" },
  // Le domaine COMPLET, tous sports confondus : ce sont les localisations proposées par le
  // questionnaire (`injuryOpts`). L'UI en montre un sous-ensemble par sport ; le moteur, lui,
  // doit accepter tout ce qui a pu être enregistré — y compris après un changement de sport.
  injury: { type: "csv", label: "tes zones fragiles", nature: "vecue",
    domain: ["aucune", "tibia", "genou", "pied", "hanche", "dos", "epaule", "cou", "course", "velo",
      "quadriceps", "cheville", "fascia"] },
  med_pain: { ...enumF("la douleur à l'effort", OUI_NON), nature: "vecue" },
  med_dizzy: { ...enumF("les vertiges à l'effort", OUI_NON), nature: "vecue" },
  med_treat: { ...enumF("ton suivi médical", OUI_NON), nature: "vecue" },
  cycle_sync: { ...enumF("la synchronisation avec ton cycle", OUI_NON), nature: "vecue" },
  cycle_start: { type: "date", label: "le 1er jour de tes dernières règles" , nature: "vecue" },
  cycle_len: { ...numF("la longueur de ton cycle", 21, 40, "jours"), nature: "vecue" },
  weight_lever: { ...enumF("le levier du poids", ["oui", "non", "coach"]), nature: "vecue" },
  age: { ...numF("ton âge", 10, 100, "ans"), nature: "vecue" },
  weight: { ...numF("ton poids", 25, 250, "kg"), nature: "vecue" },
  height: { ...numF("ta taille", 100, 250, "cm"), nature: "vecue" },
  hr_max: { ...numF("ta FC max", 120, 230, "bpm"), nature: "mesuree" },
  vol_max: { ...numF("ton volume max", 1, 40, "h/sem"), required: true , nature: "vecue" },
  vol_recent: { ...numF("ton volume récent", 0, 40, "h/sem"), nature: "vecue" },
  sessions_max: { ...numF("ton nombre de séances", 1, 14, "séances/sem"), fallback: "7" , nature: "vecue" },
  race_date: { type: "date", label: "la date de ta course" , nature: "vecue" },
  plan_start: { type: "date", label: "le départ de ton plan" , nature: "vecue" },
  // ---- Références mesurées ----
  ftp_known: { ...enumF("« connais-tu ta FTP »", OUI_NON, ["bike", "tri", "duathlon"]), nature: "vecue" },
  pace_known: { ...enumF("« connais-tu ton allure seuil »", OUI_NON, ["run", "trail", "tri", "duathlon", "swimrun"]), nature: "vecue" },
  css_known: { ...enumF("« connais-tu ton CSS »", OUI_NON, ["swim", "tri", "swimrun"]), nature: "vecue" },
  vam_known: { ...enumF("« connais-tu ta VAM »", OUI_NON, ["trail"]), nature: "vecue" },
  ftp: { ...numF("ta FTP", 50, 600, "W", ["bike", "tri", "duathlon"]), nature: "mesuree" },
  vam: { ...numF("ta VAM", 200, 2500, "m/h", ["trail"]), nature: "mesuree" },
  // R12.1 — la montée VÉCUE : deux chiffres que tout le monde peut donner, d'où l'on déduit
  // la VAM. Bornes larges à dessein : c'est un souvenir, pas un protocole.
  climb_dplus_m: { ...numF("le D+ de ta dernière grosse montée", 50, 3000, "m", ["trail"]), nature: "vecue" },
  climb_min: { ...numF("la durée de ta dernière grosse montée", 5, 300, "min", ["trail"]), nature: "vecue" },
  // ---- R14.1 — entrées de la PROJECTION (elles n'agissent pas sur le plan) ----
  // Ces deux clés ne modifient pas la génération : elles pilotent la prédiction PROJETÉE.
  // Elles vivent quand même dans le schéma — c'est la leçon de R14.3-a, où `course_profile`,
  // resté hors schéma, avait fini par diverger du domaine de `terrain` en silence.
  // `training_structure` mesure le STIMULUS DE LA STRUCTURE, pas les années de pratique :
  // quelqu'un qui s'entraîne au feeling depuis dix ans a encore tout le bénéfice d'un plan.
  training_structure: { ...enumF("la structure de ton entraînement récent", ["feeling", "intermittent", "suivi"]), nature: "vecue" },
  // Poids cible : JAMAIS proposé ni suggéré par l'outil (P9). Il n'existe que si l'athlète a
  // demandé le levier ET saisi la valeur lui-même, et il ne produit qu'une SENSIBILITÉ.
  weight_target: { ...numF("ton poids cible", 35, 200, "kg"), nature: "vecue" },
  // R20.1 — LES CLÉS SONT DÉCLARÉES POUR LES SPORTS OÙ ELLES ONT UN SENS, et pour eux seuls.
  // Le balayage dérivé du schéma (`audit:sensibilite`) a montré ce que coûtait l'inverse : la
  // FTP était déclarée pour la COURSE À PIED et la NATATION, `terrain` pour la natation et le
  // swimrun, l'accès au tapis pour les sept sports. Ces clés y étaient évidemment inertes —
  // et une clé inerte noyait le signal des VRAIES inerties dans le rapport. Un schéma qui
  // sur-déclare rend sa propre garde illisible.
  // ---- Terrain / milieu ----
  terrain: { ...enumF("ton terrain", ["plat", "vallonne", "montagne", "route", "trail", "piste", "mixte"], ["run", "bike", "tri", "duathlon"]), nature: "vecue" },
  // ---- R18.2 — LE PROFIL DE COURSE PAR DISCIPLINE ----
  // Retour du fondateur après test : « dans la construction avancée je veux qu'on définisse
  // le profil de la course (ex triathlon : eau vive, vélo montagneux, course plate) ».
  // Il a raison sur un point qu'aucune règle du dépôt ne couvrait : R14.3-a a unifié
  // `terrain` et `course_profile` en UNE clé — ce qui était le bon geste contre la divergence
  // silencieuse —, mais cette clé unique décrit le parcours comme s'il était homogène. Un
  // triathlon ne l'est jamais : on peut nager en eau vive, rouler en montagne et courir à
  // plat, et les trois corrections sont indépendantes. Une clé globale en applique une
  // troisième, fausse pour les trois.
  //
  // Ces clés ne remplacent pas la clé globale, elles la SPÉCIALISENT : `legProfileOf()`
  // retombe dessus quand un leg n'est pas renseigné, exactement comme `courseProfileOf`
  // retombe sur `terrain`. Un seul chemin, trois niveaux de précision — la leçon de R14.3-a
  // tient, on ne recrée pas deux vocabulaires.
  //
  // Le milieu de nage a son propre domaine parce que ce n'est PAS un relief : « montagneux »
  // ne veut rien dire dans l'eau, et l'incertitude n'y est pas de même nature (un courant
  // peut porter autant que freiner — voir SWIM_ENV dans `predictor.ts`).
  leg_swim_env: { ...enumF("le milieu de nage de ta course", ["bassin", "lac", "mer_calme", "mer_agitee", "eau_vive"], ["tri", "swimrun"]), nature: "vecue" },
  leg_bike_prof: { ...enumF("le profil du parcours vélo", ["plat", "vallonne", "montagne"], ["tri", "duathlon"]), nature: "vecue" },
  leg_run_prof: { ...enumF("le profil du parcours à pied", ["plat", "vallonne", "montagne"], ["tri", "duathlon", "swimrun"]), nature: "vecue" },
  milieu: { ...enumF("ton milieu", ["bassin", "ow", "mixte"], ["swim"]), nature: "vecue" },
  swim_limit: { ...enumF("ta limite en natation", ["technique", "respiration", "endurance", "peur"], ["swim"]), nature: "vecue" },
  treadmill: { ...enumF("l'accès au tapis", OUI_NON, ["trail"]), nature: "vecue" },
  // ---- Trail ----
  race_technicity: { ...enumF("la technicité de ta course", ["roulant", "mixte", "technique", "alpin"], ["trail"]), nature: "vecue" },
  race_night: { ...enumF("la part de nuit", ["non", "partielle", "majoritaire"], ["trail"]), nature: "vecue" },
  train_dplus_access: { ...enumF("le dénivelé accessible", ["plat", "collines", "montagne"], ["trail"]), nature: "vecue" },
  poles: { ...enumF("les bâtons", ["oui", "non", "a_decider"], ["trail"]), nature: "vecue" },
  race_distance_km: { ...numF("la distance de ta course", 1, 500, "km", ["trail"]), requiredFor: ["trail"] , nature: "vecue" },
  race_dplus_m: { ...numF("le D+ de ta course", 0, 30000, "m", ["trail"]), required: true , nature: "vecue" },
  race_cutoff_h: { ...numF("la barrière horaire", 1, 200, "h", ["trail"]), nature: "vecue" },
  // ---- Swimrun ----
  openwater_access: { ...enumF("ton accès à l'eau libre", ["aucun", "saisonnier", "toute_annee"], ["swimrun"]), nature: "vecue" },
  team_mode: { ...enumF("solo ou binôme", ["solo", "binome"], ["swimrun"]), fallback: "solo" , nature: "vecue" },
  swim_continuous: { ...enumF("la nage en continu", OUI_NON, ["swimrun"]), nature: "vecue" },
  run_continuous: { ...enumF("la course en continu", OUI_NON, ["swimrun"]), nature: "vecue" },
  gear_test: { ...enumF("le test en tenue", OUI_NON, ["swimrun"]), nature: "vecue" },
  swim_total_m: { ...numF("la nage totale de ta course", 100, 30000, "m", ["swimrun"]), nature: "vecue" },
  run_total_km: { ...numF("la course totale de ton épreuve", 1, 200, "km", ["swimrun"]), nature: "vecue" },
  longest_swim_m: { ...numF("ta plus longue nage", 50, 10000, "m", ["swimrun"]), nature: "vecue" },
  segments_n: { ...numF("le nombre de segments", 2, 60, "", ["swimrun"]), nature: "vecue" },
  // R19.2 — le triathlon aussi. La combinaison vaut 4 à 7 % de temps de nage et sa légalité
  // est un SEUIL RÉGLEMENTAIRE (24,5 °C) : c'est la variable dominante du leg natation, et
  // elle n'existait que pour le swimrun. R18.2 avait ajouté par-dessus un raffinement de
  // ±5 % (mer calme vs mer agitée) sur un modèle où ce facteur-là manquait — l'ordre de
  // grandeur était inversé.
  water_temp_c: { ...numF("la température de l'eau", -2, 35, "°C", ["swimrun", "tri"]), nature: "vecue" },
  team_swim_gap_sec: { ...numF("l'écart de nage du binôme", 0, 120, "s/100m", ["swimrun"]), nature: "mesuree" },
};

/* ───────────────────────── Normalisation numérique (R11.3) ───────────────────────── */

/**
 * Un nombre, ou `null` s'il n'y en a pas. Plus JAMAIS de `Number(x) || défaut` : le défaut
 * était un PLANCHER, si bien qu'une saisie illisible faisait tomber tout le plan dessus au
 * lieu de le refuser. Vide / null / undefined / NaN = ABSENT, jamais 0.
 * La virgule française est normalisée AVANT parsing (« 12,5 » valait 12, et sur un D+ de
 * course « 2,200 » faisait basculer la catégorie trail entière).
 */
export function parseNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  // « 12,5 » → 12.5 ; « 2,200 » (séparateur de milliers) → 2200 ; « 1 200 » → 1200
  const cleaned = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "")
    : s.replace(/\s/g, "").replace(",", ".");
  if (!/^[+-]?\d*\.?\d+$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

/** Une date ISO stricte `AAAA-MM-JJ`, ou `null`. Le format FR « 13/06/2027 » n'est PAS une date ISO. */
export function parseISODate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = new Date(s + "T00:00:00Z");
  if (!isFinite(t.getTime())) return null;
  // Rejette « 2027-02-31 » : le mois aurait débordé.
  return t.toISOString().slice(0, 10) === s ? s : null;
}

export interface ValidationResult {
  answers: AthleteProfile;                             // valeurs NORMALISÉES (virgule FR, etc.)
  warnings: string[];                                  // contradictions et plafonnements
  defaults: { id: string; what: string; val: string; why: string }[]; // défauts appliqués, journalisés
}

const MAX_HORIZON_WEEKS = 104; // R11.5 — au-delà de 2 ans, ce n'est plus une préparation

/**
 * Valide et normalise les réponses. Lève `EBInputError` au premier refus — un plan bâti sur
 * une entrée fausse est plus dangereux qu'un refus, et le refus est réparable par l'athlète.
 */
export function validateAnswers(sport: string, raw: Record<string, unknown>, todayISO?: string): ValidationResult {
  const a: Record<string, unknown> = { ...raw };
  const warnings: string[] = [];
  const defaults: ValidationResult["defaults"] = [];

  // ---- 1. format : domaine PAR SPORT (B4) ----
  const formats = FORMATS_BY_SPORT[sport];
  if (formats && formats.length) {
    const f = a.format == null || a.format === "" ? null : String(a.format);
    if (f == null) {
      throw new EBInputError("format", a.format, formats.join(" / "),
        "Il manque le format de ta course. Choisis-en un : " + formats.join(", ") + ".");
    }
    if (!formats.includes(f)) {
      // La casse est une faute de frappe fréquente (« full » vs « Full ») : on la rattrape en
      // le DISANT, plutôt que de laisser passer un format inconnu qui fausse tout en aval.
      const fixed = formats.find((x) => x.toLowerCase() === f.toLowerCase());
      if (fixed) {
        a.format = fixed;
        defaults.push({ id: "R11-format-casse", what: "Format corrigé", val: f + " → " + fixed, why: "La casse ne correspondait pas — corrigé plutôt que refusé, mais le plan est bien celui du format " + fixed });
      } else {
        throw new EBInputError("format", f, formats.join(" / "),
          "« " + f + " » n'est pas un format de " + sport + ". Les formats possibles : " + formats.join(", ") + ".");
      }
    }
  }

  // ---- 2. champs du schéma : type + domaine ----
  for (const [key, spec] of Object.entries(ANSWER_SCHEMA)) {
    if (spec.sports && !spec.sports.includes(sport)) continue;
    const v = a[key];
    if (v == null || v === "") {
      // R11.2 — un champ REQUIS absent est un refus : sans lui, le plan serait bâti sur une
      // valeur que l'athlète n'a jamais donnée (`vol_max` absent donnait un plafond de format
      // que personne n'avait demandé, et l'athlète ne pouvait pas le savoir).
      if (spec.required || (spec.requiredFor || []).includes(sport)) {
        throw new EBInputError(key, v, "une valeur" + (spec.unit ? " en " + spec.unit : ""),
          "Il manque " + spec.label + " : c'est une donnée sans laquelle le plan serait construit sur une hypothèse, pas sur toi. Renseigne-la au Profil.");
      }
      // … et un défaut appliqué est JOURNALISÉ, jamais tacite (canal 3).
      if (spec.fallback) {
        defaults.push({ id: "R11-defaut-" + key, what: "Valeur par défaut : " + spec.label,
          val: spec.fallback,
          why: "Tu n'as pas répondu à cette question — le moteur a pris cette valeur. Elle est modifiable au Profil, et elle change le plan." });
      }
      continue;
    }
    if (spec.type === "enum") {
      const s = String(v);
      if (!spec.domain!.includes(s)) {
        const fixed = spec.domain!.find((x) => x.toLowerCase() === s.toLowerCase());
        if (fixed) { a[key] = fixed; continue; }
        throw new EBInputError(key, v, spec.domain!.join(" / "),
          "La réponse à « " + spec.label + " » (« " + s + " ») n'est pas une valeur attendue. Choisis parmi : " + spec.domain!.join(", ") + ".");
      }
    } else if (spec.type === "csv") {
      const parts = String(v).split(",").map((x) => x.trim()).filter(Boolean);
      const bad = parts.find((p) => !spec.domain!.includes(p) && !spec.domain!.some((d) => d.toLowerCase() === p.toLowerCase()));
      if (bad) {
        throw new EBInputError(key, v, spec.domain!.join(" / "),
          "« " + bad + " » n'est pas une valeur attendue pour " + spec.label + ". Choisis parmi : " + spec.domain!.join(", ") + ".");
      }
      a[key] = parts.map((p) => spec.domain!.find((d) => d.toLowerCase() === p.toLowerCase()) || p).join(",");
    } else if (spec.type === "number") {
      const n = parseNum(v);
      if (n == null) {
        throw new EBInputError(key, v, "un nombre" + (spec.unit ? " en " + spec.unit : ""),
          "« " + String(v) + " » n'est pas un nombre : impossible d'en déduire " + spec.label + ". Corrige la valeur"
          + (spec.unit ? " (en " + spec.unit + ")" : "") + ".");
      }
      if (n < spec.min! || n > spec.max!) {
        throw new EBInputError(key, v, spec.min + "–" + spec.max + (spec.unit ? " " + spec.unit : ""),
          spec.label.charAt(0).toUpperCase() + spec.label.slice(1) + " vaut " + n + (spec.unit ? " " + spec.unit : "")
          + " : hors de ce qu'un plan peut prendre au sérieux (" + spec.min + " à " + spec.max + (spec.unit ? " " + spec.unit : "") + ").");
      }
      a[key] = String(n); // normalisé : la virgule FR ne se propage plus
    } else if (spec.type === "date") {
      const d = parseISODate(v);
      if (!d) {
        throw new EBInputError(key, v, "AAAA-MM-JJ",
          "« " + String(v) + " » n'est pas une date lisible pour " + spec.label + ". Format attendu : AAAA-MM-JJ (par exemple 2027-06-13).");
      }
      a[key] = d;
    }
  }

  // ---- 2bis. éligibilité ÂGE × FORMAT (R15.7-C) ----
  // Placé APRÈS la validation du schéma : `age` doit avoir été borné (R13.1) avant qu'on
  // décide quoi que ce soit avec lui. Placé AVANT `minWeeks` : refuser sur la durée de
  // préparation d'une course à laquelle on ne peut pas s'inscrire serait le mauvais motif.
  {
    const age = parseNum(a.age);
    const fmt = String(a.format || "");
    const distKm = parseNum(a.race_distance_km);
    const mini = sport === "trail"
      ? (distKm != null && distKm >= AGE_MINI_TRAIL_KM ? 18 : null)
      : ((AGE_MINI_FORMAT[sport] || {})[fmt] ?? null);
    if (mini != null && age != null && age < mini) {
      const objet = sport === "trail" ? "un trail de " + distKm + " km" : "le format « " + fmt + " »";
      const repli = sport === "trail"
        ? "des distances plus courtes (jusqu'à " + (AGE_MINI_TRAIL_KM - 1) + " km)"
        : ((REPLI_FORMAT[sport] || {})[fmt] || "un format plus court");
      throw new EBInputError("format", fmt || String(distKm) + " km", "un format ouvert à " + age + " ans",
        "À " + age + " ans, l'inscription à " + objet + " est refusée par la quasi-totalité des organisateurs : "
        + "l'âge minimum y est de " + mini + " ans. Te construire une préparation de plusieurs mois pour une "
        + "épreuve où tu ne pourras pas prendre le départ serait te mentir. Ce qui est possible tout de suite : "
        + repli + " — et le plan long redeviendra disponible à tes " + mini + " ans, sans rien perdre de ce que "
        + "tu auras construit d'ici là. C'est une règle d'inscription, pas un jugement sur ton niveau.");
    }
  }

  // ---- 3. contrat `race_date` (B3, B7 — R11.5) ----
  const today = parseISODate(todayISO) || new Date().toISOString().slice(0, 10);
  if (a.race_date) {
    const race = String(a.race_date);
    // Une course PASSÉE n'a pas le même sens selon le moment. Si le plan a été créé AVANT elle,
    // c'est simplement une course qui a eu lieu : on le dit, l'app purge la date à la reprise
    // d'état (R11.5), et le plan continue de s'afficher — refuser au lendemain d'une course
    // serait absurde. Si le plan n'a jamais existé avant elle, c'est une saisie fausse.
    const started = parseISODate(a.plan_start);
    if (race < today) {
      if (started && race >= started) {
        warnings.push("Ta course du " + race + " est passée. Renseigne ta prochaine échéance au Profil pour recaler ton plan — celui-ci reste consultable en attendant.");
      } else {
        throw new EBInputError("race_date", race, "une date future",
          "Ta course du " + race + " est déjà passée. Renseigne ta prochaine échéance — ou retire la date pour un plan sans course.");
      }
    }
    const weeksAway = Math.floor((new Date(race + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / (7 * 864e5));
    if (weeksAway > MAX_HORIZON_WEEKS) {
      warnings.push("Ta course est dans " + weeksAway + " semaines. Au-delà de deux ans, personne ne planifie une séance précise : le plan couvre les " + MAX_HORIZON_WEEKS + " dernières semaines utiles, reviens caler le reste plus près de l'échéance.");
    }
    // ---- 4. `minWeeks` (B2 — R11.4) : LA règle de sécurité qui n'était jamais lue ----
    // Le trail n'a pas de format : son horizon minimal suit la CATÉGORIE D'EFFORT déduite de
    // ses données de course (T6). Sans ça, un 45 km / 2 200 m D+ acceptait 4 semaines de prépa.
    // L'horizon se mesure depuis le DÉPART DU PLAN, pas depuis aujourd'hui : un plan créé il y
    // a vingt semaines pour une course demain est parfaitement valide, et le refuser à trois
    // jours de l'échéance serait absurde. C'est à la CRÉATION que la durée doit suffire.
    const anchor = parseISODate(a.plan_start) && String(a.plan_start) < today ? String(a.plan_start) : today;
    const weeksFromAnchor = Math.floor((new Date(race + "T00:00:00Z").getTime() - new Date(anchor + "T00:00:00Z").getTime()) / (7 * 864e5));
    const need = sport === "trail"
      ? T6_MIN_WEEKS[trailObjective(a as unknown as AthleteProfile).category]
      : (MIN_WEEKS[sport] || {})[String(a.format || "")];
    // On ne refuse que pour une course À VENIR : le jour J et les jours d'après, la durée de
    // préparation n'est plus une décision, c'est une histoire.
    if (need && weeksFromAnchor >= 1 && weeksFromAnchor + 1 < need) {
      const shorter = (formats || []).slice(0, Math.max(0, (formats || []).indexOf(String(a.format))));
      const okDate = new Date(new Date(today + "T00:00:00Z").getTime() + need * 7 * 864e5).toISOString().slice(0, 10);
      const reste = weeksFromAnchor + 1;
      // U9 — LE REFUS NOMME CE QUE L'ATHLÈTE A DEMANDÉ, PAS UN IRONMAN.
      //
      // La dernière phrase était écrite en dur : « Te vendre une préparation d'Ironman en un
      // mois serait te mentir ». Mesuré : **9 refus sur 9** la servaient, sur les SEPT sports —
      // un nageur qui prépare un 1500 m et un coureur qui prépare un 10 km s'entendaient parler
      // d'Ironman. C'est le moment le plus honnête du produit (il refuse une préparation pour
      // ne pas blesser) et il montrait qu'il ne lisait pas la réponse saisie : la crédibilité
      // d'un « non » tient entièrement à ça.
      //
      // On ne fabrique PAS de table de libellés ici : les noms lisibles des formats vivent dans
      // `config.js`, côté UI, et en dupliquer une seconde copie dans le schéma créerait deux
      // sources de vérité pour la même chose. La phrase se passe du libellé — « cette
      // préparation », c'est la sienne, et c'est plus juste qu'une étiquette de catalogue.
      //
      // U9b — et on ne propose plus « un format plus court » quand il n'en existe aucun : sur
      // le format le plus court du sport (tri/S mesuré), l'ancienne phrase envoyait chercher
      // une issue qui n'existe pas.
      const issues = sport === "trail"
        ? ["viser une course plus courte (distance et D+)"]
        : shorter.length ? ["viser un format plus court (" + shorter.join(", ") + ")"] : [];
      issues.push("viser une course à partir du " + okDate);
      throw new EBInputError("race_date", race, "au moins " + need + " semaines avant la course",
        "Il reste " + reste + " semaine(s) avant ta course, et une préparation honnête de ce format en demande au moins " + need + ". "
        + (issues.length > 1 ? "Deux issues : " + issues[0] + ", ou " + issues[1] : "Une seule issue : " + issues[0])
        + ". Te vendre cette préparation en " + reste + " semaine" + (reste > 1 ? "s" : "") + " serait te mentir, et te blesser.");
    }
  }

  if (!a.race_date) {
    // Canal 3, pas canal 2 : ce n'est pas une limite du plan, c'est un DÉFAUT appliqué. Le
    // ranger dans les avertissements le ferait lire comme « ce que le moteur n'a pas pu faire ».
    defaults.push({ id: "R11-defaut-race_date", what: "Durée du plan, sans date de course",
      val: "durée minimale de préparation du format, à partir de cette semaine",
      why: "Tu n'as pas donné d'échéance — renseigne-la au Profil pour que l'affûtage tombe au bon moment plutôt qu'à la fin d'un compte à rebours arbitraire" });
  }

  // ---- 5. contradictions entre valeurs individuellement valides (B8 — canal `warnings`) ----
  const volMax = parseNum(a.vol_max), volRec = parseNum(a.vol_recent), sess = parseNum(a.sessions_max);
  if (volMax != null && volRec != null && volRec > volMax) {
    warnings.push("Tu déclares faire déjà " + volRec + " h/sem alors que ton maximum disponible est " + volMax + " h/sem. Le plan retient le plafond (" + volMax + " h) — si c'est l'inverse que tu voulais dire, corrige l'un des deux au Profil.");
  }
  if (volMax != null && sess != null) {
    // Une contrainte gagne toujours sur l'autre : elle doit être NOMMÉE, sinon l'athlète voit
    // un volume qu'il n'a pas demandé sans savoir laquelle de ses réponses l'a produit.
    if (volMax / sess > 2.5) warnings.push("Avec " + sess + " séances pour " + volMax + " h, chaque séance ferait plus de 2 h 30 en moyenne. C'est le NOMBRE DE SÉANCES qui borne ton plan : le volume réel sera inférieur à ton plafond.");
    else if (volMax / sess < 0.5) warnings.push("Avec " + sess + " séances pour " + volMax + " h, chaque séance ferait moins de 30 min. C'est le VOLUME qui borne ton plan : certaines séances prévues seront remplacées par du repos plutôt que d'être trop courtes pour valoir le déplacement.");
  }
  if (a.ftp_known === "oui" && parseNum(a.ftp) == null) {
    warnings.push("Tu as répondu connaître ta FTP mais aucune valeur n'est enregistrée : le plan travaille sur une estimation. Renseigne-la au Profil pour des zones justes.");
  }
  if (a.pace_known === "oui" && (a.pace == null || a.pace === "")) {
    warnings.push("Tu as répondu connaître ton allure seuil mais aucune valeur n'est enregistrée : le plan travaille sur une estimation. Renseigne-la au Profil pour des allures justes.");
  }
  if (a.css_known === "oui" && (a.css == null || a.css === "")) {
    warnings.push("Tu as répondu connaître ton CSS mais aucune valeur n'est enregistrée : le plan travaille sur une estimation.");
  }
  const needW = (MIN_WEEKS[sport] || {})[String(a.format || "")];
  if (needW != null && needW >= 20 && (a.level === "debutant" || a.history === "reprise")) {
    warnings.push("Tu vises un format long en te déclarant " + (a.level === "debutant" ? "débutant" : "en reprise")
      + ". Le plan reste construit sur tes réponses, mais il part volontairement bas et monte lentement : sur ce type d'objectif, la blessure vient de la marche d'escalier, jamais du plafond.");
  }

  // ---- 6. plan sans aucun jour disponible (B6, en amont) ----
  if (a.off_days === "oui") {
    const off = String(a.off_which || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (off.length >= 7) {
      throw new EBInputError("off_which", a.off_which, "au plus 5 jours bloqués",
        "Tu as bloqué les sept jours de la semaine : il ne reste aucun jour pour t'entraîner. Libère au moins deux jours — un plan sans séance n'est pas un plan.");
    }
    if (off.length >= 5) {
      warnings.push("Avec " + off.length + " jours bloqués sur 7, il reste " + (7 - off.length) + " jour(s) d'entraînement : le plan sera très en dessous de ton objectif. Un cycle de 10 jours (Profil → décalage) répartirait mieux le peu de créneaux disponibles.");
    }
  }
  return { answers: a as AthleteProfile, warnings, defaults };
}

/**
 * R11.6 — un plan vide n'est pas un plan. Contrôle APRÈS génération : c'est le seul moment où
 * l'on sait ce qui a réellement été produit. Un plan à 0 séance, ou un format long dont le pic
 * tient en une heure par semaine, est un échec de génération — pas un résultat.
 */
export function assertPlanIsAPlan(sport: string, format: string | undefined, weeks: { days: { sessions: { d: string; min?: number }[] }[] }[]): void {
  let nSess = 0, peakMin = 0;
  for (const w of weeks) {
    let wm = 0;
    for (const d of w.days) for (const s of d.sessions) { if (s.d === "rs") continue; nSess++; wm += s.min || 0; }
    peakMin = Math.max(peakMin, wm);
  }
  if (nSess === 0) {
    throw new EBInputError("plan", 0, "au moins une séance",
      "Le plan généré ne contient aucune séance : tes contraintes (jours bloqués, volume, budget de séances) ne laissent pas de place à l'entraînement. Relâche l'une d'elles au Profil.");
  }
  const need = (MIN_WEEKS[sport] || {})[String(format || "")];
  const isLong = need != null && need >= 16; // marathon, 70.3, Full, series/championship, L…
  if (isLong && peakMin < 60) {
    throw new EBInputError("vol_max", peakMin, "un pic d'au moins 1 h/sem",
      "La semaine la plus chargée du plan ne fait que " + Math.round(peakMin) + " min : c'est sans rapport avec l'objectif visé. Vérifie ton volume disponible et ton nombre de séances au Profil — mieux vaut pas de plan qu'un plan qui ment.");
  }
}
