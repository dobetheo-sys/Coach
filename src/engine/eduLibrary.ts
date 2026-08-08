// R11.1 — la bibliothèque d'éducatifs par discipline (onglet 🧰 Outils, retour utilisateur du
// 08/08/2026, reportée une première fois faute de scope). Le glossaire nage existait déjà,
// mais comme une PHRASE collée aux séances « Nage éducatifs » (sessionLibrary.ts) — sans
// source structurée, l'exposer à l'UI aurait voulu dire l'écrire une seconde fois, avec le
// risque de divergence que ce principe interdit ailleurs dans le dépôt. Ce module en fait la
// SOURCE UNIQUE (`swimDrillGlossaryText` reproduit le texte injecté dans les notes, au
// caractère près — voir sessionLibrary.ts), et l'étend aux autres disciplines avec des gestes
// du même niveau de généralité.
//
// Chaque entrée reprend un geste que le générateur NOMME déjà dans un plan réel — les gammes
// de course (`G` dans sessionLibrary.ts), « Force basse cadence » / « moulinage » côté vélo
// (src/sports/bike/index.ts, src/sports/tri/index.ts), la VAM et la descente en contrôle côté
// trail (trailLibrary.ts, HILL_PROGRESSION) — la bibliothèque explique ce que le plan demande
// déjà, elle n'invente pas un vocabulaire à côté.

export interface EduDrill { name: string; how: string }

// Noms en MINUSCULE et sans ponctuation finale : c'est le format que `swimDrillGlossaryText`
// recompose en une phrase (« rattrapé (…), poings fermés (…) »). L'UI capitalise à l'affichage,
// une transformation de PRÉSENTATION, pas une seconde donnée.
export const SWIM_DRILLS: EduDrill[] = [
  { name: "rattrapé", how: "le bras devant reste tendu jusqu'au contact des mains avant de repartir : corrige le timing" },
  { name: "poings fermés", how: "main fermée : force l'appui par l'avant-bras" },
  { name: "battements planche", how: "jambes seules, planche tenue devant : isole et muscle le battement" },
];

export const RUN_DRILLS: EduDrill[] = [
  { name: "strides", how: "15 à 20 secondes, on monte en vitesse SANS forcer, relâché jusqu'au bout — travaille la fréquence et le relâchement, pas la puissance" },
  { name: "gammes — montée de genoux", how: "petits appuis rapides, genou à hauteur de hanche, buste droit — active la chaîne avant sans chercher l'amplitude" },
  { name: "gammes — talons-fesses", how: "le talon remonte vite vers la fesse, appui sous le bassin — travaille la fréquence de la phase de ramené" },
  { name: "foulées bondissantes", how: "amplitude et temps de suspension recherchés, poussée complète au sol — pliométrie légère, réservée aux phases spécifique/pic (jamais si l'impact est contre-indiqué)" },
];

export const BIKE_DRILLS: EduDrill[] = [
  { name: "force basse cadence", how: "gros braquet, 50 à 60 rpm, sans forcer sur les genoux : le travail est musculaire, pas cardio-vasculaire" },
  { name: "moulinage", how: "cadence élevée, braquet léger, appui rond recherché : travaille la coordination du pédalage, pas la puissance" },
];

export const TRAIL_DRILLS: EduDrill[] = [
  { name: "montée en VAM", how: "buste droit, poussée complète à chaque appui : la vitesse ascensionnelle est la référence qui compte en trail, pas l'allure" },
  { name: "descente en contrôle", how: "elle fait partie du travail : foulées courtes, regard loin devant, on freine avec les appuis, pas les cuisses en butée" },
  { name: "marche rapide bâtons", how: "poussée des bâtons synchronisée avec le pas opposé : soulage les jambes en montée soutenue sans perdre de vitesse ascensionnelle" },
];

export const EDU_LIBRARY: { key: string; drills: EduDrill[] }[] = [
  { key: "rn", drills: RUN_DRILLS },
  { key: "bk", drills: BIKE_DRILLS },
  { key: "sw", drills: SWIM_DRILLS },
  { key: "trail", drills: TRAIL_DRILLS },
];

/** Recompose le texte injecté dans les notes de « Nage éducatifs » (sessionLibrary.ts) — la
 *  SEULE fonction qui écrit cette phrase ; le générateur l'appelle, l'UI la lit. */
export function swimDrillGlossaryText(drills: EduDrill[] = SWIM_DRILLS): string {
  return drills.map((d) => d.name + " (" + d.how + ")").join(", ");
}
