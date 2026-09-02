// TOUR 3 — LES ÉCRANS QUI MANQUAIENT AU PARCOURS.
//
// 3a (souplesse) · 3f (type d'essai) · 3h (relecture des angles) · 3d (retour post-sortie)
// · 3e (résultat provisoire à deux essais) · 3c (historique et tendance).
//
// Chacun est recréé d'après la référence de design, sur les jetons du dépôt et l'échelle
// `--fs-*`. Les contenus qui existent déjà dans le code d'origine sont REPRIS, jamais réécrits.
import { esc, fmtDay } from "../state.js";

/* ============================================================
   3a — LE TEST DE SOUPLESSE
   ============================================================
   La carte en relief porte un AVERTISSEMENT et non une donnée : c'est le seul écran du bilan
   où l'on peut se faire mal, et la hiérarchie de surface doit le dire.

   ⚠ CINQ ÉTAPES ET NON QUATRE, et l'écart est assumé. La référence en dessine quatre ; sa
   propre légende annonce « les cinq règles de cadrage » ; et la source (`MODES.aslr_test.
   checklist`, que le handoff demande de reprendre) en porte SEPT. Les quatre du dessin sont une
   condensation fidèle de six d'entre elles — la septième, « reste dans la même pièce que le
   téléphone et évite le contre-jour », n'y est nulle part. Elle ne décore pas : une vidéo en
   contre-jour est une vidéo qu'on ne peut pas pointer. On la remet. */
export const PLACEMENT = [
  ["Sur le dos, téléphone au sol, vue de côté",
    "En mode paysage : plus de largeur, tu peux te rapprocher."],
  ["Hanche, jambe et pied dans le cadre",
    "Même en haut de la levée. Plus tu es grand dans l’image, plus la mesure est fiable."],
  ["L’autre jambe reste tendue, à plat",
    "Si elle se plie ou décolle, la mesure est faussée."],
  ["Même pièce que le téléphone, pas de contre-jour",
    "Ni filmé depuis une pièce voisine, ni une fenêtre juste derrière toi."],
  ["Monte la jambe, genou verrouillé",
    "Lentement, jusqu’au point où le genou commencerait à plier."],
];

export function souplesseHTML(session) {
  const a = session && session.aslrAngle;
  const E = globalThis.EBV2 && globalThis.EBV2.postureEngine;
  const score = (E && Number.isFinite(a)) ? E.aslrToFlexScore(a) : null;
  return '<div class="po-head">'
    + '<button type="button" class="po-retour" id="poRetour">‹ Position</button>'
    + '<span class="po-etape">étape 1 / 3</span></div>'
    + '<div class="po-hero-nu"><div class="po-eyebrow" style="color:var(--zn-faint)">Souplesse de hanche</div>'
    + "<h2>Allongé au sol,<br>une jambe monte</h2>"
    + "<p>Cet angle fixe la limite de fermeture de hanche que ta position devra respecter. "
    + "Sans lui, aucun essai ne peut être noté.</p></div>"
    // LE RELIEF PORTE LA SÉCURITÉ. Ailleurs il porte la décision du moment ; ici c'est
    // délibérément l'inverse, parce que c'est le seul écran où l'erreur fait mal.
    + '<div class="po-hero po-hero-secu">'
    + '<div class="po-hero-top"><span class="po-eyebrow">Avant tout</span></div>'
    + '<div class="po-hero-titre">Arrête si ça tire<br>ou si ça fait mal</div>'
    + '<div class="po-hero-pied">Le but est de mesurer ta souplesse <b>du jour</b>, pas de la '
    + "forcer. Une mesure honnête vaut mieux qu’un degré gagné.</div></div>"
    + sec("Comment te placer")
    + '<div class="po-liste">' + PLACEMENT.map((p, i) =>
      '<div class="pe-etape"><span class="pe-num">' + String(i + 1).padStart(2, "0") + "</span>"
      + '<span class="po-ligne-txt"><span class="po-ligne-titre">' + esc(p[0]) + "</span>"
      + '<span class="po-ligne-meta">' + esc(p[1]) + "</span></span></div>").join("") + "</div>"
    + '<div class="po-mentions">Tu choisiras toi-même l’image où ta jambe est le plus haut, puis '
    + "tu placeras trois points : hanche, genou, cheville. <b>Aucune détection automatique</b> — "
    + "elle s’est révélée fausse sur ce type de vidéo.</div>"
    + (Number.isFinite(a)
      ? sec("Ton dernier test") + '<div class="po-liste"><div class="pe-dernier">'
        + "<b>" + Math.round(a) + "°</b><span>" + (score ? score + "/5 · " : "")
        + "le " + esc(fmtDay(session.aslrTestedAt || session.updatedAt))
        + " · seuil de raideur 80°</span></div></div>"
      : "")
    + '<div class="po-cta-zone" style="margin-top:22px">'
    + '<button type="button" class="po-cta" id="poSouplesse">'
    + (Number.isFinite(a) ? "Refaire le test" : "Faire le test") + "</button>"
    + '<div class="po-cta-note"><span>tu choisis l’image, tu poses trois points</span></div></div>'
    + '<div class="po-espaceur"></div>';
}

/* ============================================================
   3f — LE TYPE D'ESSAI
   ============================================================
   « La photo de face demande 5 m de recul et un objet dont tu connais la longueur : hors de
   portée dans un garage. » L'écran ne cache pas ce qu'on perd — c'est tout son objet, et c'est
   ce que le correctif moteur rend vrai : un essai rapide est écarté du front AÉRO et reste
   valide au titre du confort. */
export function typeEssaiHTML(numero, session) {
  const trials = (session && session.trials) || [];
  const complets = trials.filter((t) => t.frontal && t.frontal.pFSA_cm2 > 0).length;
  return '<div class="po-head">'
    + '<button type="button" class="po-retour" id="poRetour">‹ Position</button>'
    + '<span class="po-etape">nouvel essai</span></div>'
    + '<div class="po-hero-nu"><div class="po-eyebrow" style="color:var(--zn-faint)">Essai '
    + numero + "</div><h2>Tu as la place<br>de reculer ?</h2>"
    + "<p>La photo de face demande 5 m de recul et un objet dont tu connais la longueur. "
    + "Sans elle, l’essai reste utile — il ne sera juste <b>pas noté en aéro</b>.</p></div>"
    + '<div class="pe-choix">'
    + carteType("complet", "Essai complet", "~4 min", "Confort et aéro",
      "Vidéo de profil, photo de face étalonnée, mesures du vélo. C’est le seul type d’essai qui "
      + "peut sortir en « aéro max ».", ["5 m de recul", "repère mesuré"], true)
    + carteType("rapide", "Essai rapide", "~2 min", "Confort seul",
      "Vidéo de profil et mesures du vélo. Les angles suffisent à dire si la position tient sur "
      + "la durée — pas à mesurer ce que tu opposes au vent.", ["3 m de recul", "score aéro absent"], false)
    + "</div>"
    // La phrase se DÉRIVE des essais déjà faits : dire « tes essais 1 et 2 sont complets » quand
    // il n'y en a aucun serait un gabarit rempli au hasard.
    + (trials.length
      ? sec("Sur tes essais précédents") + '<div class="po-mentions">'
        + (complets === trials.length
          ? "Tes " + trials.length + " essai" + (trials.length > 1 ? "s sont complets" : " est complet") + ". "
          : complets + " de tes " + trials.length + " essais " + (complets > 1 ? "sont complets" : "est complet") + ". ")
        + "Un essai rapide restera comparable en confort, et apparaîtra <b>sans score aéro</b> "
        + "dans le tableau final.</div>"
      : "")
    + '<div class="po-cta-zone" style="margin-top:22px">'
    + '<button type="button" class="po-cta" id="poLancer">Lancer l’essai complet</button>'
    + '<div class="po-cta-note"><span>tu peux changer d’avis en touchant l’autre carte</span></div></div>'
    + '<div class="po-espaceur"></div>';
}

function carteType(k, titre, duree, quoi, texte, pilules, actif) {
  return '<button type="button" class="pe-type' + (actif ? " actif" : "") + '" data-type="' + k + '"'
    + ' aria-pressed="' + (actif ? "true" : "false") + '">'
    + '<span class="pe-type-top"><b>' + esc(titre) + "</b><i>" + esc(duree) + "</i></span>"
    + '<span class="pe-type-quoi">' + esc(quoi) + "</span>"
    + '<span class="pe-type-txt">' + esc(texte) + "</span>"
    + '<span class="pe-pilules">' + pilules.map((p) =>
      "<em>" + esc(p) + "</em>").join("") + "</span></button>";
}

/* ============================================================
   3h — LA RELECTURE DES ANGLES
   ============================================================
   Écran intercalé entre le sixième point et la validation. Sa raison d'être tient dans une
   phrase du handoff : « un angle qui te surprend vient presque toujours d'un point décalé d'un
   cran ». Sans lui, une erreur de pointage ne se voit qu'au score, où elle n'est plus
   attribuable.

   ⚠ VOCABULAIRE : « fléchissement sagittal », JAMAIS « déviation ulnaire ». La déviation
   clinique est une rotation hors du plan sagittal, non mesurable depuis une vue de profil —
   c'est écrit en tête de `captureProcessing.ts` et repris tel quel. */
export const LECTURE = [
  { k: "hip", lab: "Hanche", note: "plancher selon ta souplesse", zone: [40, 180] },
  { k: "trunk", lab: "Tronc", note: "zone cible de la position aéro", zone: [5, 15] },
  { k: "shoulder", lab: "Épaule", note: "informatif, pas noté", zone: null },
  { k: "elbow", lab: "Coude", note: "informatif, pas noté", zone: null },
  { k: "wrist", lab: "Poignet", note: "fléchissement sagittal — alerte au-delà de 15°", zone: [0, 15] },
];

export function relectureHTML(angles) {
  const val = (k) => {
    const a = angles && angles[k];
    return a && Number.isFinite(a.mean) ? a.mean : (Number.isFinite(angles && angles[k]) ? angles[k] : null);
  };
  return '<div class="po-head">'
    + '<button type="button" class="po-retour" id="poRelRefaire">‹ Refaire le pointage</button>'
    + '<span class="po-etape">relecture</span></div>'
    + '<div class="po-hero-nu"><h2>Ce que tes<br>points donnent</h2>'
    + "<p>Un angle qui te surprend vient presque toujours d’un point décalé d’un cran.</p></div>"
    + '<div class="po-liste">' + LECTURE.map((L) => {
      const v = val(L.k);
      const cls = L.zone == null ? "info"
        : v == null ? "info"
          : (v >= L.zone[0] && v <= L.zone[1]) ? "dans"
            : "hors";
      return '<div class="po-ligne"><div class="po-ligne-txt">'
        + '<div class="po-ligne-titre">' + esc(L.lab) + "</div>"
        + '<div class="po-ligne-meta">' + esc(L.note) + "</div></div>"
        + '<span class="pe-angle ' + cls + '">' + (v == null ? "—" : Math.round(v) + "°") + "</span></div>";
    }).join("") + "</div>"
    + '<div class="po-mentions">Un angle hors zone n’est pas une faute : c’est soit un point à '
    + "reprendre, soit une position à changer. <b>Le bilan ne tranche pas ici</b> — il le fera "
    + "quand les trois essais seront comparables.</div>"
    + '<div class="pe-deux"><button type="button" class="pe-secondaire" id="poRelRefaire2">Refaire</button>'
    + '<button type="button" class="po-cta" id="poRelOk">C’est juste</button></div>'
    + '<div class="po-espaceur"></div>';
}

/* ============================================================
   3d — LE RETOUR POST-SORTIE
   ============================================================
   Quatre zones, une échelle de 1 à 5. La règle est DITE : deux sorties concordantes avant qu'un
   poids ne bouge, et jamais de rétroactivité sur un score déjà affiché. C'est ce qui distingue
   une boucle de feedback d'un score qui change tout seul. */
export const ZONES = [
  ["neck", "Nuque et cervicales"], ["lowerBack", "Bas du dos"],
  ["hands", "Mains et poignets"], ["knees", "Genoux"],
];

export function feedbackHTML(etat, contexte) {
  const rempli = ZONES.filter(([k]) => Number.isFinite(etat[k])).length;
  return '<div class="po-head">'
    + '<button type="button" class="po-retour" id="poRetour">‹ Position</button>'
    + '<span class="po-etape">après ta sortie</span></div>'
    + '<div class="po-hero-nu"><h2>Où ça a tiré,<br>et combien ?</h2>'
    + "<p>" + esc(contexte || "Réponds à chaud, c’est plus juste que demain matin.") + "</p></div>"
    + '<div class="po-liste">' + ZONES.map(([k, lab]) => {
      const v = etat[k];
      const st = !Number.isFinite(v) ? ["à répondre", "att"]
        : v <= 2 ? ["rien à signaler", "ok"] : v <= 3 ? ["gênant", "moyen"] : ["ça fait mal", "dur"];
      return '<div class="pe-zone"><div class="pe-zone-top">'
        + '<span class="po-ligne-titre">' + esc(lab) + "</span>"
        + '<span class="pe-etat ' + st[1] + '">' + st[0] + "</span></div>"
        + '<div class="pe-segs">' + [1, 2, 3, 4, 5].map((n) =>
          '<button type="button" class="pe-seg' + (v === n ? " on n" + n : "") + '"'
          + ' data-zone="' + k + '" data-niv="' + n + '" aria-label="' + esc(lab) + " : " + n
          + ' sur 5" aria-pressed="' + (v === n) + '"></button>').join("") + "</div></div>";
    }).join("") + "</div>"
    + '<div class="pe-echelle"><span>rien</span><span>insupportable</span></div>'
    + '<div class="po-mentions">Une zone signalée <b>deux sorties de suite</b> pèsera davantage '
    + "dans ton prochain bilan. "
    + '<span class="pr-mono">jamais rétroactif sur un score déjà affiché</span></div>'
    + '<div class="po-cta-zone" style="margin-top:20px">'
    + '<button type="button" class="po-cta" id="poFbEnvoyer">Envoyer mon retour</button>'
    + '<div class="po-cta-note"><span>' + rempli + " zone" + (rempli > 1 ? "s" : "")
    + " sur 4 renseignée" + (rempli > 1 ? "s" : "") + "</span></div></div>"
    + '<div class="po-espaceur"></div>';
}

const sec = (t) => '<div class="po-sec espace"><span>' + esc(t) + "</span><i></i></div>";
