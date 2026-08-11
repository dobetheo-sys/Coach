// ============================================================================
// R-ZENNA v5 — L'EN-TÊTE PARTAGÉ DES CINQ ONGLETS
// ============================================================================
// La maquette pose UN en-tête au-dessus des cinq onglets, hors de tout onglet : marque à
// gauche, puce de course + salutation datée à droite. L'app n'avait rien à cet endroit —
// `body.has-tabs .hero { display: none }` masque le titre du questionnaire, et rien ne le
// remplace : on arrive donc directement sur le contenu, sans jamais savoir de quelle course
// on parle ni à combien de jours elle est.
//
// C'est le seul élément STRUCTUREL commun aux cinq écrans de la maquette qui n'avait aucun
// équivalent — d'où un composant unique plutôt que cinq copies.
//
// IL NE CALCULE RIEN QUI EXISTE DÉJÀ (R11.1). Le décompte et le libellé de format vivaient
// dans `avancementPlanHTML` (onglet Plan) ; ils sont EXTRAITS ici et cet onglet les importe,
// plutôt que d'en obtenir une seconde écriture qui dériverait. Le salut vient de `greeting()`
// (check-in), la semaine courante de `EBV2.progress` — les mêmes sources qu'ailleurs.
//
// CE QUE L'EN-TÊTE NE DIT PAS. La maquette écrit « Salut Théo » et « ZENNA ». Le produit ne
// collecte AUCUN prénom (vérifié : aucune clé de ce genre dans le questionnaire), donc le
// salut reste sans nom — inventer « Salut champion » serait une familiarité que personne n'a
// demandée. Et la marque est ENDURABUILD : « Zenna » est le nom de la maquette, pas du
// produit ; le reprendre renommerait l'app par accident.
import { S, esc, fmtDay } from "../state.js";
import { SPORTS } from "../config.js";

/** Le salut suit l'heure — cinq versions, déjà écrites pour le check-in (R11.1). */
export function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Debout tôt 🌙" : h < 12 ? "Salut ☀️" : h < 18 ? "Bon après-midi" : h < 22 ? "Bonsoir 🌙" : "Encore debout 🦉";
}

/**
 * Le décompte jusqu'à la course et le libellé lisible de son format.
 * Rend `null` s'il n'y a pas de date déclarée : R23.5 l'a tranché pour l'onglet Plan et la
 * raison vaut ici — « inventer un J−? serait pire que se taire ».
 */
export function raceCountdown(answers, today) {
  const rd = answers && answers.race_date;
  if (!rd || !today) return null;
  const jours = Math.round((new Date(rd + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 864e5);
  // Le format en CODE BRUT (« S ») ne veut rien dire : le libellé vient de SPORTS[sport].formats,
  // seule source (R11.1) — jamais une seconde table de noms.
  const fmts = (SPORTS[S.sport] && SPORTS[S.sport].formats) || [];
  const entree = fmts.find((f) => f[0] === answers.format);
  const format = entree ? entree[1].split(" (")[0] : (answers.format || "");
  return { jours, format, date: rd };
}

const JOURS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const MOIS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

/** « MAR 11 AOÛT · S6 » — la date du jour, et où l'on en est dans le plan. */
function ligneDate(plan, today) {
  const d = new Date(today + "T12:00:00");
  let s = JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()];
  try {
    const pg = globalThis.EBV2.progress(plan, S.answers, today);
    if (pg && pg.weekNow) s += " · S" + pg.weekNow;
  } catch (e) { /* pas de progression calculable : la date seule reste juste */ }
  return s;
}

/**
 * L'en-tête complet. `onglet` sert seulement à savoir si la puce de course doit être
 * cliquable — sur l'onglet Plan elle mènerait là où l'on est déjà.
 */
export function appHeaderHTML(plan, today, onglet) {
  const c = raceCountdown(S.answers, today);
  let puce = "";
  if (c) {
    // Le libellé suit le moment, comme dans l'onglet Plan : un « J−0 » le matin de la course
    // serait exact et illisible.
    const j = c.jours > 1 ? "J−" + c.jours
      : c.jours === 1 ? "Demain"
      : c.jours === 0 ? "🏁 Aujourd’hui"
      : "Course passée";
    const sous = c.jours < 0 ? fmtDay(c.date) : (c.format || "ta course");
    const versPlan = onglet !== "general";
    puce = '<div class="zn-race-chip"' + (versPlan ? ' role="button" tabindex="0" data-goto="general" title="Voir le plan"' : "")
      + '><div><div class="rc-j">' + esc(j) + '</div><div class="rc-l">' + esc(sous) + "</div></div></div>";
  }
  return '<div class="zn-brand"><div class="zn-logo-mark" aria-hidden="true">E</div>'
    + '<div class="zn-brand-word">ENDURABUILD</div></div>'
    + '<div class="zn-header-right-wrap">' + puce
    + '<div class="zn-header-right"><div class="zn-greet">' + esc(greeting()) + "</div>"
    + '<div class="zn-date-mono">' + esc(ligneDate(plan, today)) + "</div></div></div>";
}
