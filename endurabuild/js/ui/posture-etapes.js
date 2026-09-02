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

/* ============================================================
   3e — LE RÉSULTAT PROVISOIRE, DÈS DEUX ESSAIS
   ============================================================
   Variante de 2e quand il n'y a que deux essais. Son intérêt n'est pas de montrer un score
   plus tôt : c'est de dire ce qu'un TROISIÈME apporterait, en s'appuyant sur `margins` —
   la distance de chaque angle à son seuil, que `validateTrial` calcule depuis toujours et que
   RIEN n'affichait. « Ta hanche est à 1° du plancher » est une information qui existait déjà.

   ⚠ SANS FOURCHETTE. Les bornes de sensibilité se lisent contre une cohorte ; sur deux essais
   elles diraient une précision qu'on n'a pas. On montre les scores nus et on annonce le
   provisoire — c'est la même règle que P7/P8 ailleurs dans le dépôt. */
export function provisoireHTML(scored, margins) {
  const m = margins || {};
  const serres = Object.entries(m)
    .filter(([, v]) => Number.isFinite(v) && v >= 0 && v <= 5)
    .sort((a, b) => a[1] - b[1]);
  const MOT = { hip_floor: "ta hanche", trunk_min: "ton tronc", trunk_max: "ton tronc",
    knee_min: "ton genou", knee_max: "ton genou", wrist: "ton poignet" };
  return '<div class="po-head">'
    + '<button type="button" class="po-retour" id="poRetour">‹ Position</button>'
    + '<span class="pe-badge">provisoire</span></div>'
    + '<div class="po-hero">'
    + '<div class="po-hero-top"><span class="po-eyebrow">Le meilleur des deux</span>'
    + '<span class="po-eyebrow faible">essai ' + esc(scored.trial_id) + "</span></div>"
    + '<div class="po-hero-titre">Selle ' + Math.round(scored.deltas.saddleHeightMm)
    + "<br>drop " + Math.round(scored.deltas.dropMm) + "</div>"
    + '<div class="pr-scores"><div class="pr-score"><b>' + Math.round(scored.comfort_score)
    + "</b><span>confort</span></div>"
    + '<div class="pr-score"><b>' + Math.round(scored.aero_score) + "</b><span>aéro</span></div></div>"
    + '<div class="po-hero-pied">Tu peux rouler avec dès maintenant. Les fourchettes de '
    + "sensibilité arrivent au troisième essai — sur deux, elles diraient une précision qu’on "
    + "n’a pas.</div></div>"
    + sec("Ce qu’un 3ᵉ essai apporterait")
    + '<div class="po-liste">'
    + argument("gain", "Une frontière au lieu d’un duel",
      "À deux, on compare ; à trois, on peut dire qu’un réglage n’est dominé par aucun autre.")
    + argument("gain", "Les fourchettes de sensibilité",
      "Elles disent à quel point le score dépend de réglages que la littérature ne tranche pas.")
    // Le troisième argument sort de `margins` quand il a quelque chose à dire, et disparaît
    // sinon : un gabarit à trois lignes qui en invente une est pire que deux lignes vraies.
    + (serres.length
      ? argument("vigilance", (MOT[serres[0][0]] || "un de tes angles").replace(/^t/, "T")
        + " est à " + Math.round(serres[0][1]) + "° de son seuil",
        "Un réglage un peu plus marqué le ferait sortir. Un troisième essai dirait de quel côté.")
      : "")
    + "</div>"
    + '<div class="po-cta-zone" style="margin-top:20px">'
    + '<button type="button" class="po-cta" id="poTroisieme">Ajouter un 3ᵉ essai · 3 min</button>'
    + '<div class="po-cta-note"><span>ou garde celui-ci</span> <b>et reviens plus tard</b></div></div>'
    + '<div class="po-espaceur"></div>';
}

function argument(type, titre, texte) {
  return '<div class="pe-arg"><i class="pe-arg-p ' + type + '" aria-hidden="true"></i>'
    + '<span class="po-ligne-txt"><span class="po-ligne-titre">' + esc(titre) + "</span>"
    + '<span class="po-ligne-meta">' + esc(texte) + "</span></span></div>";
}

/* ============================================================
   3c — HISTORIQUE ET TENDANCE
   ============================================================
   Le graphe montre la FOURCHETTE en aire et la valeur en ligne. C'est la seule forme qui ne
   ment pas : tracer les valeurs seules ferait lire une progression là où les deux fourchettes
   se recouvrent — le défaut que `TrendChart` porte encore côté dépôt (« affiche les scores en
   point unique, pas en bandes », écart connu §7). */
export function tendanceHTML(bilans) {
  const b = (bilans || []).filter((x) => x && Number.isFinite(x.confort));
  if (b.length < 2) {
    return '<div class="po-head">'
      + '<button type="button" class="po-retour" id="poRetour">‹ Position</button></div>'
      + '<div class="load-card"><div class="load-title">Pas encore de tendance</div>'
      + '<div class="load-sub" style="margin-top:7px">Il faut deux bilans pour qu’une courbe '
      + "veuille dire quelque chose. Tu en as " + b.length + ".</div></div>";
  }
  const dConf = Math.round(b[b.length - 1].confort - b[0].confort);
  const dAero = Math.round(b[b.length - 1].aero - b[0].aero);
  return '<div class="po-head">'
    + '<button type="button" class="po-retour" id="poRetour">‹ Position</button>'
    + '<span class="po-etape">' + b.length + " bilans</span></div>"
    + '<div class="po-hero"><div class="po-hero-top">'
    + '<span class="po-eyebrow">Depuis ton premier bilan</span></div>'
    + '<div class="po-hero-titre">' + (dAero >= 0 ? "+" : "") + dAero + " d’aéro,<br>"
    + (Math.abs(dConf) <= 3 ? "confort tenu" : (dConf >= 0 ? "+" : "") + dConf + " de confort") + "</div>"
    + '<div class="po-hero-pied">La bande autour de chaque courbe est la sensibilité du score, '
    + "pas une marge d’erreur de mesure.</div></div>"
    + '<div class="po-creux pe-graphe">' + grapheSVG(b) + "</div>"
    + '<div class="pe-legende"><span class="l-conf">confort</span>'
    + '<span class="l-aero">aéro</span><span class="l-sens">sensibilité</span></div>'
    + sec("Tes bilans")
    + '<div class="po-liste">' + b.slice().reverse().map((x) =>
      '<div class="po-ligne"><div class="po-ligne-txt">'
      + '<div class="po-ligne-titre">' + esc(fmtDay(x.date)) + "</div>"
      + '<div class="po-ligne-meta">' + esc(x.resume || "") + "</div></div>"
      + '<span class="pe-duo">' + Math.round(x.confort) + " / " + Math.round(x.aero) + "</span>"
      + '<span class="po-chevron">›</span></div>').join("") + "</div>"
    + '<div class="po-mentions">Tes retours après sortie changent la <b>pondération du confort</b> '
    + "des bilans suivants — jamais celle d’un score déjà affiché.</div>"
    + '<div class="po-espaceur"></div>';
}

function grapheSVG(b) {
  const W = 300, H = 140, PX = 8, PY = 12;
  const x = (i) => PX + (i / Math.max(1, b.length - 1)) * (W - 2 * PX);
  const y = (v) => H - PY - (Math.max(0, Math.min(100, v)) / 100) * (H - 2 * PY);
  const aire = (lo, hi) =>
    b.map((p, i) => x(i).toFixed(1) + "," + y(lo(p)).toFixed(1)).join(" ")
    + " " + b.slice().reverse().map((p, i) => x(b.length - 1 - i).toFixed(1) + "," + y(hi(p)).toFixed(1)).join(" ");
  const ligne = (f) => b.map((p, i) => x(i).toFixed(1) + "," + y(f(p)).toFixed(1)).join(" ");
  const pts = (f, cls) => b.map((p, i) =>
    '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(f(p)).toFixed(1) + '" r="3.5" class="' + cls + '"/>').join("");
  const lo = (k) => (p) => (Number.isFinite(p[k + "Lo"]) ? p[k + "Lo"] : p[k]);
  const hi = (k) => (p) => (Number.isFinite(p[k + "Hi"]) ? p[k + "Hi"] : p[k]);
  return '<svg viewBox="0 0 ' + W + " " + H + '" class="pe-svg" role="img"'
    + ' aria-label="Évolution du confort et de l’aéro sur ' + b.length + ' bilans">'
    + [25, 50, 75].map((v) =>
      '<line x1="' + PX + '" y1="' + y(v).toFixed(1) + '" x2="' + (W - PX)
      + '" y2="' + y(v).toFixed(1) + '" class="pe-grille"/>').join("")
    + '<polygon points="' + aire(lo("confort"), hi("confort")) + '" class="pe-aire-conf"/>'
    + '<polygon points="' + aire(lo("aero"), hi("aero")) + '" class="pe-aire-aero"/>'
    + '<polyline points="' + ligne((p) => p.confort) + '" class="pe-l-conf"/>'
    + '<polyline points="' + ligne((p) => p.aero) + '" class="pe-l-aero"/>'
    + pts((p) => p.confort, "pe-pt-conf") + pts((p) => p.aero, "pe-pt-aero")
    + "</svg>";
}
