/**
 * U18 — LE POINT UNIQUE « UNE EXPLICATION SE DEMANDE, ELLE NE S'IMPOSE PAS ».
 *
 * Retour du fondateur (05/08/2026) : *« je trouve qu'il y a trop de texte explicatif, j'aimerais
 * les réduire, les cacher sous un bouton stylé "point d'interrogation" ou les dérouler »*.
 *
 * ─── CE QUE LA MESURE A DIT AVANT D'ÉCRIRE UNE LIGNE ───────────────────────────────────────
 *
 * Part de chaque écran occupée par de la prose explicative (`.load-sub`, `.q-sub`, `.q-def`),
 * mesurée au rendu sur un téléphone de 390 px :
 *
 *   🥗 Nutrition  342 px / 1 203  = 28 %   (2 blocs)
 *   📋 Profil     968 px / 4 045  = 24 %   (26 blocs)   ← le vrai gisement
 *   🗓 Plan       414 px / 3 381  = 12 %   (8 blocs)
 *   📅 Semaine    139 px / 1 784  =  8 %
 *   🎯 Aujourd'hui   0 px         =  0 %
 *   Questionnaire 520 px / 12 625 =  4 %   ← PAS le problème, contrairement à l'intuition
 *
 * Le questionnaire est donc laissé tel quel : ses `q-def` sont rares et ce sont elles qui
 * évitent une réponse à côté. Le gisement est le Profil, et il est fait de 26 petits blocs.
 *
 * ─── CE QUI NE SE REPLIE JAMAIS, ET C'EST LA MOITIÉ QUI COMPTE ─────────────────────────────
 *
 * Trois familles de texte cohabitent sous la même classe `.load-sub`, et les confondre serait
 * le vrai défaut :
 *
 *   1. **une EXPLICATION** — « le D+ compte autant que la distance : il décide de la catégorie
 *      d'effort ». Elle enseigne. On la lit une fois, puis elle encombre. → repliable.
 *   2. **un ÉTAT** — « Encore vide : il se remplira à chaque test », « Plan généré le … ».
 *      C'est une donnée sur SA situation à lui. → jamais repliée.
 *   3. **un AVERTISSEMENT** — le canal `warnings` (R11.2), le disclaimer nutrition (asserté en
 *      CI par `demo:nutrition`), un refus, une consigne de sécurité. → **jamais repliée, jamais
 *      derrière un « ? »**, et un critère E2E le vérifie. Cacher un avertissement derrière un
 *      geste, c'est le supprimer pour tous ceux qui ne font pas ce geste.
 *
 * La conversion est donc OPT-IN, appelant par appelant : rien ne se replie tout seul. Une passe
 * automatique sur `.load-sub` aurait replié les trois familles d'un coup — et le manifeste dit
 * l'inverse (« informer plutôt que bloquer » suppose que l'information ARRIVE).
 *
 * ─── LE « ? » NE PAIE QUE DANS UN TITRE — MESURÉ, ET MA DEUXIÈME PASSE A ÉTÉ RETIRÉE ──────
 *
 * Six blocs supplémentaires ont été convertis EN PLACE (le « ? » posé là où le paragraphe
 * était, au milieu d'une carte, sans titre où s'accrocher). Résultat mesuré : la prose tombe de
 * 770 à 645 px… et **l'onglet GRANDIT de 3 908 à 3 958 px**. Le bouton prend sa propre ligne :
 * il coûte à peu près ce qu'un paragraphe court rapportait. La passe a été retirée.
 *
 * La règle qui en sort, et c'est elle qui gouverne les conversions suivantes : **le « ? » ne
 * paie que s'il se glisse dans un titre DÉJÀ affiché** — là il coûte zéro hauteur et rend celle
 * du paragraphe (mesuré sur les trois premiers : 4 045 → 3 908 px pour 198 px de prose). Une
 * explication au milieu d'une carte demande donc d'abord un libellé auquel s'accrocher, pas un
 * bouton de plus. C'est un travail de structure, pas de repli.
 *
 * ─── POURQUOI PAS `<details>` ─────────────────────────────────────────────────────────────
 *
 * Le dépôt s'en sert déjà pour les SÉANCES (U16), où le repli porte sur un bloc entier qui a un
 * titre. Ici l'explication accompagne un titre qui existe déjà : lui donner un second titre
 * (« En savoir plus ») ajouterait une ligne pour en cacher deux. Le « ? » se pose DANS le titre
 * existant, ne coûte aucune hauteur, et se lit comme ce qu'il est.
 */
import { esc } from "../state.js";

let _n = 0;

/**
 * Rend un bouton « ? » et le bloc d'explication qu'il déroule, replié par défaut.
 *
 * @param {string} texte  L'explication. Passée telle quelle : c'est à l'appelant d'échapper
 *                        s'il injecte une valeur — même contrat que le reste des vues.
 * @param {{brut?: boolean, label?: string}} [opts]
 *        `brut` : le texte contient déjà du HTML (déjà échappé par l'appelant).
 *        `label` : ce que l'aide explique, pour le lecteur d'écran (« Aide : le dénivelé »).
 * @returns {string} HTML à coller À LA FIN d'un titre.
 */
export function aide(texte, opts = {}) {
  if (!texte) return "";
  const id = "aide" + ++_n;
  const corps = opts.brut ? texte : esc(String(texte));
  const quoi = opts.label ? esc(String(opts.label)) : "cette information";
  return '<button class="aide-btn" type="button" data-aide="' + id + '" aria-expanded="false"'
    + ' aria-controls="' + id + '" aria-label="Aide : ' + quoi + '">?</button>'
    + '<div class="aide-txt load-sub" id="' + id + '" hidden>' + corps + "</div>";
}

/**
 * Branche le déroulé. UN SEUL écouteur délégué sur le document : les vues se re-rendent en
 * permanence (chaque ✓ redessine un onglet), donc un écouteur posé sur chaque bouton fuirait
 * ou disparaîtrait au re-rendu. C'est le même choix que les autres gestes de l'app.
 */
export function brancherAide() {
  if (globalThis.__ebAideOn) return;
  globalThis.__ebAideOn = true;
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest ? e.target.closest(".aide-btn") : null;
    if (!b) return;
    const cible = document.getElementById(b.dataset.aide);
    if (!cible) return;
    const ouvert = !cible.hasAttribute("hidden");
    if (ouvert) cible.setAttribute("hidden", ""); else cible.removeAttribute("hidden");
    b.setAttribute("aria-expanded", ouvert ? "false" : "true");
    b.classList.toggle("on", !ouvert);
  });
}
