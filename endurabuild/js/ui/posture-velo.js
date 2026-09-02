// ÉCRAN 2d — LES RÉGLAGES DU VÉLO, PRIS SUR LE SCHÉMA.
//
// Le formulaire d'origine est « déjà jugé laborieux » (retour terrain, §6g du handoff du dépôt)
// et la refonte ne le raccourcit pas : elle le REND SITUABLE. Une cote sur un dessin dit ce
// qu'on mesure ; un libellé dans une colonne ne le dit pas.
//
// DEUX CONTRAINTES DU DÉPÔT D'ORIGINE, TENUES ICI :
//   · le champ s'appelle `deltas` mais contient des mesures ABSOLUES — le nom est conservé pour
//     ne pas casser les essais déjà persistés. Le titre de l'écran le dit à l'athlète (« des
//     mesures réelles, pas des écarts »), parce que c'est exactement le malentendu qui a produit
//     le retour terrain « ça marche pas ».
//   · les six réglages avancés restent REPLIÉS et hors du score. Le handoff l'écrit deux fois :
//     ne pas les remonter dans le flux principal, et ne pas les noter faute de seuil sourcé.
import { esc } from "../state.js";

// Les quatre cotes obligatoires, leur couleur sémantique et leur définition en une ligne.
// La convention de couleur vient du dépôt et le handoff demande de la garder synchronisée en
// trois endroits : orange = selle/confort, turquoise = cintre/aéro.
export const COTES = [
  { k: "saddleHeightMm", lab: "Hauteur de selle", def: "Du pédalier au haut de la selle", u: "mm", c: "selle" },
  { k: "saddleSetbackMm", lab: "Recul de selle", def: "Pointe de selle en arrière du pédalier", u: "mm", c: "selle" },
  { k: "reachMm", lab: "Reach", def: "Selle → coudières, à l’horizontale", u: "mm", c: "cintre" },
  { k: "dropMm", lab: "Drop", def: "Dénivelé selle → coudières", u: "mm", c: "cintre" },
];

// `saddleSetbackMm` est OPTIONNEL côté moteur (§6f : optionnel pour ne pas casser les essais
// déjà persistés). Il est demandé ici parce que le handoff le met dans les quatre cotes du
// schéma — mais il ne BLOQUE pas, sinon on transformerait une compatibilité en obligation.
const OBLIGATOIRES = ["saddleHeightMm", "reachMm", "dropMm"];

export const AVANCES = [
  { k: "saddleTiltDeg", lab: "Inclinaison de selle", u: "°" },
  { k: "extensionLengthMm", lab: "Longueur des prolongateurs", u: "mm" },
  { k: "padWidthMm", lab: "Écartement des coudières", u: "mm" },
  { k: "extensionTiltDeg", lab: "Angle des prolongateurs", u: "°" },
  { k: "crankLengthMm", lab: "Longueur de manivelle", u: "mm" },
  { k: "cleatPositionMm", lab: "Position de cale", u: "mm" },
];

/** Le schéma. Décoratif et NON à l'échelle — comme `BikeDeltasDiagram` d'origine, et c'est dit
 *  à l'athlète plutôt que suggéré par un dessin trop précis. Les quatre cotes sont cliquables :
 *  toucher une cote ouvre le champ correspondant, ce qui est la moitié de l'intérêt de l'écran. */
function schemaSVG() {
  const L = (x1, y1, x2, y2, cls) =>
    '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + cls + '"/>';
  return '<svg class="pv-schema" viewBox="0 0 360 250" role="img"'
    + ' aria-label="Schéma de vélo : les quatre cotes mesurées">'
    // silhouette — gris neutres, jamais un jeton de discipline : elle ne signifie rien
    + '<g class="pv-silhouette">'
    + '<circle cx="78" cy="196" r="40"/><circle cx="286" cy="196" r="40"/>'
    + L(78, 196, 168, 196, "pv-tube") + L(168, 196, 132, 96, "pv-tube")
    + L(168, 196, 250, 108, "pv-tube") + L(132, 96, 250, 108, "pv-tube")
    + L(250, 108, 286, 196, "pv-tube") + L(132, 96, 128, 78, "pv-tube")
    + '<rect x="98" y="70" width="62" height="9" rx="4"/>'
    + '<rect x="236" y="96" width="54" height="8" rx="4"/>'
    + "</g>"
    // les quatre cotes
    + '<g class="pv-cote" data-cote="saddleHeightMm">'
    + L(168, 196, 168, 79, "pv-t-selle") + L(140, 79, 196, 79, "pv-rappel")
    + '<text x="176" y="140" class="pv-lab pv-selle">hauteur</text></g>'
    + '<g class="pv-cote" data-cote="saddleSetbackMm">'
    + L(129, 79, 168, 79, "pv-t-selle") + L(129, 79, 129, 196, "pv-rappel")
    + '<text x="106" y="66" class="pv-lab pv-selle">recul</text></g>'
    + '<g class="pv-cote" data-cote="reachMm">'
    + L(129, 88, 263, 88, "pv-t-cintre")
    + '<text x="184" y="80" class="pv-lab pv-cintre">reach</text></g>'
    + '<g class="pv-cote" data-cote="dropMm">'
    + L(263, 79, 263, 100, "pv-t-cintre") + L(240, 100, 290, 100, "pv-rappel")
    + '<text x="272" y="120" class="pv-lab pv-cintre">drop</text></g>'
    + "</svg>";
}

function ligneCote(c, val) {
  const vide = val == null || val === "";
  const oblig = OBLIGATOIRES.includes(c.k);
  return '<button type="button" class="pv-ligne' + (vide && oblig ? " manque" : "") + '"'
    + ' data-champ="' + c.k + '">'
    + '<i class="pv-puce pv-p-' + c.c + '" aria-hidden="true"></i>'
    + '<span class="pv-txt"><span class="pv-lab2">' + esc(c.lab) + "</span>"
    + '<span class="pv-def">' + esc(c.def) + "</span></span>"
    + (vide
      ? '<span class="pv-asaisir">à saisir</span>'
      : '<span class="pv-val">' + esc(String(val)) + '<i>' + c.u + "</i></span>")
    + "</button>";
}

/**
 * @param {object} o
 * @param {HTMLElement} o.hote
 * @param {number} o.numero      numéro de l'essai en cours
 * @param {object} o.deltas      valeurs déjà saisies
 * @param {(d:object)=>void} o.onEnregistrer
 * @param {()=>void} o.onRetour
 */
export function ouvrirReglages(o) {
  const d = Object.assign({}, o.deltas || {});
  o.hote.innerHTML = "";
  const rendre = () => {
    const manquants = OBLIGATOIRES.filter((k) => d[k] == null || d[k] === "");
    o.hote.innerHTML = '<div class="po-head">'
      + '<button type="button" class="po-retour" id="pvRetour">‹ Essai ' + o.numero + "</button>"
      + '<span class="po-etape">étape 3 / 3</span></div>'
      + '<div class="po-hero-nu"><div class="po-eyebrow" style="color:var(--zn-faint)">Réglages du vélo</div>'
      + "<h2>Où en est<br>ton vélo, là ?</h2>"
      + "<p>Des mesures <b>réelles</b>, pas des écarts. Touche une cote sur le schéma pour la saisir.</p></div>"
      + '<div class="po-creux pv-creux">' + schemaSVG() + "</div>"
      + '<div class="po-liste pv-liste">' + COTES.map((c) => ligneCote(c, d[c.k])).join("") + "</div>"
      + '<details class="pv-avances"><summary><b>Réglages avancés</b>'
      + "<span>manivelles, cales, coudières · " + AVANCES.length + " champs</span></summary>"
      + '<div class="po-liste">' + AVANCES.map((c) =>
        '<button type="button" class="pv-ligne" data-champ="' + c.k + '">'
        + '<span class="pv-txt"><span class="pv-lab2">' + esc(c.lab) + "</span></span>"
        + (d[c.k] == null || d[c.k] === ""
          ? '<span class="pv-asaisir">à saisir</span>'
          : '<span class="pv-val">' + esc(String(d[c.k])) + "<i>" + c.u + "</i></span>")
        + "</button>").join("") + "</div>"
      // La phrase du handoff, mot pour mot dans son intention : ils sont enregistrés et NON
      // notés, et la raison est dite. Un champ demandé sans dire à quoi il sert est un champ
      // qu'on remplit au hasard.
      + '<div class="pv-note">Enregistrés pour la traçabilité, mais <b>pas utilisés dans le '
      + "score</b> : aucun seuil sourcé ne permet de les noter.</div></details>"
      + '<div class="po-cta-zone" style="margin-top:20px">'
      + '<button type="button" class="po-cta" id="pvSave"' + (manquants.length ? " disabled" : "")
      + ">Enregistrer l’essai " + o.numero + "</button>"
      + '<div class="po-cta-note">' + (manquants.length
        ? "<span>Il manque</span> <b>" + manquants.map(nomDe).join(", ") + "</b>"
        : "<b>Les quatre cotes sont là</b>")
      + "</div></div><div class=\"po-espaceur\"></div>";

    o.hote.querySelectorAll("[data-champ]").forEach((b) => { b.onclick = () => saisir(b.dataset.champ); });
    o.hote.querySelectorAll("[data-cote]").forEach((g) => { g.onclick = () => saisir(g.dataset.cote); });
    o.hote.querySelector("#pvRetour").onclick = () => o.onRetour && o.onRetour();
    const sv = o.hote.querySelector("#pvSave");
    sv.onclick = () => { if (!manquants.length) o.onEnregistrer && o.onEnregistrer(d); };
  };

  /** LE PAVÉ NUMÉRIQUE EST CELUI DU SYSTÈME. `inputmode="numeric"` sur un champ focalisé fait
   *  ouvrir le clavier chiffré du téléphone — en dessiner un serait réécrire ce que l'OS fait
   *  mieux, et perdre l'accessibilité qui va avec. */
  function saisir(k) {
    const c = COTES.concat(AVANCES).find((x) => x.k === k);
    if (!c) return;
    const zone = document.createElement("div");
    zone.className = "pv-saisie";
    zone.innerHTML = '<label for="pvIn">' + esc(c.lab) + "</label>"
      + '<div class="pv-saisie-row"><input id="pvIn" type="number" inputmode="numeric" '
      + 'step="any" value="' + (d[k] == null ? "" : esc(String(d[k]))) + '">'
      + "<span>" + c.u + "</span>"
      + '<button type="button" class="pv-ok">OK</button></div>';
    o.hote.appendChild(zone);
    const inp = zone.querySelector("#pvIn");
    inp.focus();
    const valider = () => {
      const v = inp.value === "" ? null : Number(inp.value);
      // Un nombre illisible n'écrase pas une valeur bonne : on refuse plutôt que d'écrire NaN,
      // qui empoisonnerait `Math.max` de toute la cohorte côté moteur (le défaut que
      // `runEngine` documente et filtre — on ne le lui envoie pas).
      if (v !== null && !Number.isFinite(v)) { zone.remove(); return; }
      d[k] = v;
      zone.remove();
      rendre();
    };
    zone.querySelector(".pv-ok").onclick = valider;
    inp.onkeydown = (e) => { if (e.key === "Enter") valider(); };
  }

  rendre();
  return { valeurs: () => d };
}

function nomDe(k) {
  const c = COTES.find((x) => x.k === k);
  return c ? c.lab.toLowerCase() : k;
}
