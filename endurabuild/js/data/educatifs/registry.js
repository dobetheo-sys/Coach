// Registre Éducatifs (lot R26, voir CLAUDE.md) — combine les six disciplines et expose
// l'affichage conditionnel (§4 du brief). Un seul point de vérité pour « quelles disciplines
// pour quel sport » : aucun composant de rendu n'a de branche `if (discipline === …)`.
import { natation } from "./natation.js";
import { velo } from "./velo.js";
import { course } from "./course.js";
import { trail } from "./trail.js";
import { enchainements } from "./enchainements.js";
import { swimrun } from "./swimrun.js";

export const EDUCATIFS = [natation, velo, course, trail, enchainements, swimrun];

// Table exacte du brief §4. Clé = `S.sport` (PAS `S.answers.format`, qui est la distance de
// course — confirmé par exploration : `config.js`/`state.js`/`bridge.ts` séparent les deux
// axes). Une clé absente (sport inconnu, plan pas encore créé) rend un tableau vide plutôt
// que de deviner.
const PAR_SPORT = {
  tri: ["natation", "velo", "course", "enchainements"],
  duathlon: ["velo", "course", "enchainements"],
  swimrun: ["natation", "trail", "swimrun"],
  trail: ["course", "trail"],
  run: ["course"],
  bike: ["velo"],
  swim: ["natation"],
};

/** Les disciplines à afficher dans la barre, dans l'ordre du brief, pour un `S.sport` donné. */
export function disciplinesForSport(sport) {
  const ids = PAR_SPORT[sport] || [];
  return ids.map((id) => EDUCATIFS.find((d) => d.discipline === id)).filter(Boolean);
}

/**
 * Le module Enchaînements n'est jamais affiché seul (§4) — déjà garanti par `PAR_SPORT` (aucune
 * clé n'associe `enchainements` à un sport seul). Son bloc `duathlon` n'apparaît que pour le
 * format duathlon : filtré ICI, pas dans les données (`enchainements.js` reste une donnée pure),
 * pour que la règle de visibilité vive à un seul endroit.
 */
export function sectionsFor(discipline, sport) {
  if (discipline.discipline !== "enchainements") return discipline.sections;
  return discipline.sections.filter((s) => s.id !== "duathlon" || sport === "duathlon");
}
