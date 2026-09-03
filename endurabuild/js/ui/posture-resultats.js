// ÉCRAN 2e — LE RÉSULTAT : UNE DÉCISION ET DEUX ALTERNATIVES.
//
// Il n'invente aucun chiffre : `runEngine` (le moteur porté du dépôt Bikefiting) rend les trois
// positions, leurs scores et leurs fourchettes. Cet écran les MET EN FORME, et c'est tout.
//
// ══ LA FOURCHETTE N'EST PAS UNE MARGE D'ERREUR, ET LE HANDOFF INTERDIT DE LE DIRE AUTREMENT ══
// `comfort_score_low/high` s'obtient en recalculant le score sous ±20 % sur les pondérations
// marquées `[DEFAULT]` — c'est-à-dire celles que la littérature ne tranche pas. C'est une
// SENSIBILITÉ à des réglages non validés, pas une estimation de la précision de la mesure :
// celle-là, personne ne sait la quantifier faute de données. Le libellé le dit, et le reformuler
// en « marge d'erreur » serait défaire une décision documentée du dépôt (§6c).
//
// ══ CE QUI MANQUE EST DIT, PAS COMBLÉ ══
// Le score AÉRO se calcule à partir de la surface frontale projetée (pFSA), qui vient de la
// photo de face segmentée par MediaPipe. Cette segmentation est bloquée dans cette app par la
// CSP (`script-src 'self'` sans `'wasm-unsafe-eval'`, et un gate le garde). Sans pFSA, le score
// aéro n'existe pas — on l'annonce plutôt que de le fabriquer, et le score confort, lui, est
// rendu parce qu'il ne dépend d'aucune photo.
import { esc } from "../state.js";

/** Pondérations neutres : le moteur les attend, et la boucle de feedback post-sortie les
 *  recalibre (`recalibrateWeights`). Tant qu'aucun retour n'existe, 1.0 partout est la seule
 *  valeur qui n'invente rien. */
export const POIDS_NEUTRES = { neck: 1, lowerBack: 1, hands: 1, knees: 1 };

/** Un essai a-t-il de quoi porter un score AÉRO ? La question se pose par essai et non par
 *  bilan : un athlète peut avoir photographié deux essais sur trois. */
export function aPFSA(t) {
  return !!(t && t.frontal && Number.isFinite(t.frontal.pFSA_cm2) && t.frontal.pFSA_cm2 > 0
    && Number.isFinite(t.frontal.athleteHeight_cm) && t.frontal.athleteHeight_cm > 0);
}

const n0 = (v) => (Number.isFinite(v) ? Math.round(v) : "—");

function carteHero(p, comparaison) {
  return '<div class="po-hero pr-hero">'
    + '<div class="po-hero-top"><span class="po-eyebrow">Le meilleur compromis</span>'
    + '<span class="po-eyebrow faible">essai ' + esc(p.trial_id) + "</span></div>"
    + '<div class="po-hero-titre">Selle ' + n0(p.deltas.saddleHeightMm)
    + "<br>drop " + n0(p.deltas.dropMm) + "</div>"
    + '<div class="pr-scores">' + scoreBloc("confort", p.comfort_score, p.comfort_score_low, p.comfort_score_high)
    + scoreBloc("aéro", p.aero_score, p.aero_score_low, p.aero_score_high) + "</div>"
    + (comparaison ? '<div class="po-hero-pied">' + esc(comparaison) + "</div>" : "")
    + "</div>";
}

function scoreBloc(nom, v, lo, hi) {
  return '<div class="pr-score"><b>' + n0(v) + "</b>"
    + '<i class="pr-plage">' + n0(lo) + "–" + n0(hi) + "</i>"
    + "<span>" + nom + "</span></div>";
}

function ligneAlt(titre, p) {
  const barre = (cls, v) => '<div class="pr-barre"><i class="' + cls + '" style="width:'
    + Math.max(0, Math.min(100, Number(v) || 0)) + '%"></i></div><b>' + n0(v) + "</b>";
  return '<div class="pr-alt"><div class="pr-alt-top">'
    + '<span class="pr-alt-lab">' + esc(titre) + " · essai " + esc(p.trial_id) + "</span>"
    + '<span class="pr-alt-reg">selle ' + n0(p.deltas.saddleHeightMm)
    + " · drop " + n0(p.deltas.dropMm) + "</span></div>"
    + '<div class="pr-alt-bar"><span>confort</span>' + barre("confort", p.comfort_score) + "</div>"
    + '<div class="pr-alt-bar"><span>aéro</span>' + barre("aero", p.aero_score) + "</div></div>";
}

/** LES AVERTISSEMENTS SONT NON EXCLUSOIRES, et c'est une décision du moteur, pas d'ici : un
 *  poignet qui casse à 19° ne disqualifie pas l'essai, il se dit. On les rend tels que
 *  `validateTrial` les a produits — leur traduction en français vit ici parce que l'écran est
 *  le seul endroit qui parle à l'athlète, mais aucun seuil n'est réécrit. */
const MOT = { hip: "hanche", trunk: "tronc", knee: "genou", wrist: "poignet",
  shoulder: "épaule", elbow: "coude", ankle: "cheville" };
function ligneAvert(w) {
  const nom = MOT[w.param] || w.param;
  return '<div class="pr-avert"><i aria-hidden="true"></i><span>Ton <b>' + esc(nom)
    + "</b> est à " + n0(w.value) + "° sur cet essai — le repère est à " + n0(w.bound)
    + '°. <em class="pr-mono">' + esc(w.param) + " " + n0(w.value) + " / " + n0(w.bound)
    + "</em></span></div>";
}

/**
 * @param {object} o
 * @param {HTMLElement} o.hote
 * @param {Array} o.trials   les essais de la session, au format `Trial` du moteur
 * @param {object} o.profile `AthleteProfile`
 * @param {object} o.poids   `SubjectiveWeights`
 * @param {()=>void} o.onRetour
 */
export function ouvrirResultats(o) {
  const E = globalThis.EBV2 && globalThis.EBV2.postureEngine;
  const trials = o.trials || [];
  // Le compte des essais sans photo vient du MOTEUR quand il a tourné (`trials_without_frontal`)
  // et d'un recompte local seulement avant qu'il ne tourne : deux comptes de la même grandeur
  // finiraient par diverger, et c'est celui du moteur qui décide du classement.
  const sansPhotoLocal = trials.filter((t) => !aPFSA(t)).length;

  let html = '<div class="po-head">'
    + '<button type="button" class="po-retour" id="prRetour">‹ Position</button>'
    + '<span class="po-etape">' + trials.length + " essai" + (trials.length > 1 ? "s" : "") + "</span></div>";

  if (!E) {
    html += bloc("Le moteur de calcul n’est pas disponible",
      "Tes essais sont enregistrés et intacts — c’est l’affichage du résultat qui manque, pas la "
      + "mesure" + (sansPhotoLocal ? " (" + sansPhotoLocal + " sans photo de face)" : "") + ".");
    return poser(o, html);
  }

  const r = E.runEngine(trials, o.profile, o.poids || POIDS_NEUTRES);

  // AUCUNE SURFACE FRONTALE : le moteur refuse de comparer l'aéro, et il a raison — un zéro
  // n'est pas une traînée nulle. C'est le cas NORMAL tant que l'écran de photo de face n'existe
  // pas, donc il est traité pour lui-même et non comme une erreur.
  if (r.status === "insufficient_aero_trials") {
    html += bloc("Le confort est mesuré, l’aérodynamisme pas encore", r.message)
      + '<div class="po-mentions">La surface frontale se mesure sur une photo de face, que l’app '
      + "ne sait pas encore segmenter ici. <b>Tes essais et leurs angles sont intacts</b> : le "
      + "jour où cette mesure arrive, ils seront comparés sans que tu aies à les refaire.</div>";
    return poser(o, html);
  }

  if (r.status !== "ok") {
    // Le moteur DIT pourquoi chaque essai est écarté, avec sa valeur et son seuil. On le
    // recopie plutôt que de résumer : « il manque un essai » cache l'information utile.
    html += bloc("Pas encore de comparaison possible", r.message)
      + (r.excluded_trials && r.excluded_trials.length
        ? sec("Ce qui a été écarté") + '<div class="po-liste">'
          + r.excluded_trials.map((x) =>
            '<div class="po-ligne"><div class="po-ligne-txt">'
            + '<div class="po-ligne-titre">Essai ' + esc(x.trial_id) + "</div>"
            + '<div class="po-ligne-meta">' + x.violations.map((v) =>
              esc(v.param) + " " + n0(v.value) + " / seuil " + n0(v.bound)).join(" · ")
            + "</div></div></div>").join("") + "</div>"
        : "");
    return poser(o, html);
  }

  const p = r.profiles;
  html += carteHero(p.equilibre, comparaisonPhrase(p, trials));
  html += '<div class="po-cta-zone"><button type="button" class="po-cta" id="prGarder">Garder ce réglage</button>'
    + '<div class="po-cta-note"><span>On te redemandera</span> <b>comment tu l’as senti après ta prochaine sortie</b></div></div>';

  html += sec("Les deux autres retenues")
    + '<div class="po-liste">' + ligneAlt("Confort max", p.confort_max)
    + ligneAlt("Aéro max", p.aero_max) + "</div>";

  const avs = (p.equilibre.warnings || []);
  if (avs.length) html += '<div class="pr-averts">' + avs.map(ligneAvert).join("") + "</div>";

  const sansPhoto = (r.trials_without_frontal || []).length;
  if (sansPhoto) {
    html += '<div class="po-mentions"><b>' + sansPhoto + " essai" + (sansPhoto > 1 ? "s n’ont" : " n’a")
      + " pas de photo de face</b> : "
      + (sansPhoto > 1 ? "ils sont écartés" : "il est écarté") + " de la comparaison aéro — une "
      + "surface absente n’est pas une surface nulle — mais "
      + (sansPhoto > 1 ? "restent valides" : "reste valide") + " au titre du confort.</div>";
  }

  html += sec("Comment lire ces scores")
    + '<div class="po-mentions">La fourchette à côté de chaque score dit à quel point il dépend '
    + "de réglages internes que la littérature ne tranche pas. <b>Ce n’est pas une marge d’erreur "
    + "de mesure</b> : celle-là, on ne sait pas la quantifier."
    + '<div class="pr-mono" style="margin-top:8px">sensibilité ±20 % sur les pondérations '
    + "[DEFAULT] · spec §9</div></div>";
  html += '<div class="po-espaceur"></div>';
  poser(o, html);
}

function poser(o, html) {
  o.hote.innerHTML = html;
  const b = o.hote.querySelector("#prRetour");
  if (b) b.onclick = () => o.onRetour && o.onRetour();
  const g = o.hote.querySelector("#prGarder");
  if (g) g.onclick = () => {
    g.nextElementSibling.innerHTML = "<span>La boucle de retour post-sortie arrive au prochain "
      + "lot —</span> <b>ton choix est noté</b>";
  };
}

const bloc = (t, s) => '<div class="load-card"><div class="load-title">' + esc(t) + "</div>"
  + '<div class="load-sub" style="margin-top:7px">' + esc(s) + "</div></div>";
const sec = (t) => '<div class="po-sec espace"><span>' + esc(t) + "</span><i></i></div>";

/** LA PHRASE DE COMPARAISON — elle se DÉRIVE des deux essais, jamais d'un gabarit à trous
 *  rempli au hasard : si l'écart de drop est nul, on ne dit pas « 0 mm de drop en plus ». */
export function comparaisonPhrase(p, trials) {
  const ref = trials.find((t) => t.id !== p.equilibre.trial_id);
  if (!ref || !p.confort_max) return "";
  const base = p.confort_max;
  if (base.trial_id === p.equilibre.trial_id) return "";
  const dDrop = Math.round(p.equilibre.deltas.dropMm - base.deltas.dropMm);
  const dAero = Math.round(p.equilibre.aero_score - base.aero_score);
  const dConf = Math.round(base.comfort_score - p.equilibre.comfort_score);
  if (!dDrop || !Number.isFinite(dAero)) return "";
  return "Par rapport à ton essai " + base.trial_id + " : " + Math.abs(dDrop) + " mm de drop en "
    + (dDrop > 0 ? "plus" : "moins") + " t’ont fait " + (dAero >= 0 ? "gagner " : "perdre ")
    + Math.abs(dAero) + " points d’aéro pour " + Math.abs(dConf) + " points de confort.";
}
