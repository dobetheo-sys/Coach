// ============================================================================
// R-ZENNA v5 — L'EN-TÊTE PARTAGÉ DES CINQ ONGLETS
// ============================================================================
// La maquette pose UN en-tête au-dessus des cinq onglets, hors de tout onglet : marque à
// gauche, puce de course + salutation datée à droite. FOUNDATION (04/09/2026) : la forme
// suit désormais le canevas « Noir apaisé » — à droite le NOM de l'onglet et une ligne mono
// « HALF · 70.3 · J−25 » (18b, 22a-c, 16a), ou sur Aujourd'hui la date, le format et la
// tuile J−28 / RESTANTS (18a). Le salut a quitté l'en-tête : aucun écran du canevas ne le
// porte ; `greeting()` reste exportée. L'app n'avait rien à cet endroit —
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
// demandée. Et la marque est ZENNA : « Zenna » est le nom de la maquette, pas du
// produit ; le reprendre renommerait l'app par accident.
import { S, esc, fmtDay } from "../state.js";
import { SPORTS } from "../config.js";
import { brandHTML } from "./brand.js";

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
  const format = entree ? libelleFormat(entree) : (answers.format || "");
  return { jours, format, date: rd };
}

/**
 * « Half · 70.3 » (18a, 18b, 22a-c, 16a) : le canevas écrit le nom du format PUIS son code
 * quand ce code est un NOMBRE qui nomme l'épreuve (70.3 — c'est ainsi que les triathlètes
 * l'appellent). Un code-lettre (« S », « M », « Full ») ou un code qui répète le libellé
 * (« 5k » pour « 5 km ») n'apporte rien et n'est pas ajouté. Source unique : SPORTS[].formats.
 */
function libelleFormat(entree) {
  const nom = entree[1].split(" (")[0];
  return /^\d+(\.\d+)?$/.test(entree[0]) ? nom + " · " + entree[0] : nom;
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

/** Le libellé du décompte, qui suit le moment (un « J−0 » le matin de la course serait
 *  exact et illisible) — UNE écriture pour la tuile ET pour la ligne mono. */
function libelleJ(c) {
  return c.jours > 1 ? "J−" + c.jours
    : c.jours === 1 ? "Demain"
    : c.jours === 0 ? "🏁 Aujourd’hui"
    : "Course passée";
}

/** Ce qu'on sait de l'épreuve SANS date : le format déclaré, sinon le sport (SPORTS[].nom,
 *  seule source) — jamais un « J−? » inventé (R23.5). */
function libelleEpreuve() {
  const fmts = (SPORTS[S.sport] && SPORTS[S.sport].formats) || [];
  const entree = fmts.find((f) => f[0] === S.answers.format);
  if (entree) return libelleFormat(entree);
  return (SPORTS[S.sport] && SPORTS[S.sport].nom) || "";
}

/**
 * L'en-tête complet — la forme du canevas (18a pour Aujourd'hui, 18b/22a/22b/22c/16a pour
 * les quatre autres). `onglet` décide de deux choses : si la puce de course est cliquable
 * (sur l'onglet Plan elle mènerait là où l'on est déjà) et quelle forme prend la droite.
 * `libelle` est le NOM de l'onglet, passé par tabs.js depuis sa table TABS (une seule
 * source — le recopier ici ferait deux listes qui divergent, R11.1).
 *
 * LA PUCE VIT SUR LES CINQ ONGLETS (c'est ce que smoke-zenna garde : présente dès qu'une
 * date est déclarée, ≥ 44 px, cliquable sauf sur Plan). Sur Aujourd'hui c'est la TUILE
 * J−28 / RESTANTS du canevas ; sur les quatre autres, le canevas n'a qu'une ligne mono
 * « HALF · 70.3 · J−25 » sous le nom de l'onglet — le bloc de droite ENTIER porte donc la
 * classe et le rôle : la propriété gardée est un décompte tactile, pas une tuile.
 */
export function appHeaderHTML(plan, today, onglet, libelle) {
  const c = raceCountdown(S.answers, today);
  const versPlan = onglet !== "general";
  const attrsPuce = (classes) => '<div class="' + classes + '"'
    + (versPlan ? ' role="button" tabindex="0" data-goto="general" title="Voir le plan"' : "") + ">";
  let droite;
  if (onglet === "today") {
    // 18a : « MAR 11 AOÛT · S6 » / « Half · 70.3 », puis la tuile du décompte.
    const sous = c ? (c.jours < 0 ? fmtDay(c.date) : (c.format || libelleEpreuve())) : libelleEpreuve();
    droite = '<div class="zn-header-right"><div class="zn-date-mono">' + esc(ligneDate(plan, today)) + "</div>"
      + (sous ? '<div class="zn-header-fmt">' + esc(sous) + "</div>" : "") + "</div>"
      + (c ? attrsPuce("zn-race-chip") + '<span class="rc-j">' + esc(libelleJ(c)) + '</span><span class="rc-l">'
        + (c.jours > 1 ? "restants" : c.jours >= 0 ? "course" : "passée") + "</span></div>" : "");
  } else {
    // 18b / 22a / 22b / 22c / 16a : le nom de l'onglet, et dessous « HALF · 70.3 · J−25 »
    // (ou le format seul, ou le sport, quand aucune date n'est déclarée).
    const parts = c
      ? [c.format || libelleEpreuve(), c.jours < 0 ? fmtDay(c.date) : libelleJ(c)].filter(Boolean)
      : [libelleEpreuve()].filter(Boolean);
    droite = (c ? attrsPuce("zn-header-right zn-race-chip zn-race-chip--texte") : '<div class="zn-header-right">')
      + '<div class="zn-tab-name">' + esc(libelle || "") + "</div>"
      + (parts.length ? '<div class="zn-date-mono">' + esc(parts.join(" · ")) + "</div>" : "")
      + "</div>";
  }
  // R-ZENNA v7 — la marque vient de `brand.js`, point unique. Cet en-tête la DESSINAIT (une
  // tuile « E » écrite ici), ce qui en faisait la deuxième des quatre versions coexistantes.
  // 24 px : la taille du logo dans l'en-tête du canevas (18a-22c).
  return brandHTML("petit", 24) + '<div class="zn-header-right-wrap">' + droite + "</div>";
}
