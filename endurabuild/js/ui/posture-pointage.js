// ÉCRAN 2c — LE POINTAGE, UN POINT À LA FOIS.
//
// Le handoff l'appelle « l'écran le plus important de la refonte », et le défaut qu'il corrige
// est nommé : les repères anatomiques EXISTAIENT dans le code (`JOINT_POINT_HINTS`) et
// n'étaient jamais montrés pendant le geste. Le module demandait six points d'affilée sous une
// seule consigne globale.
//
// AUTONOME, PILOTÉ PAR SES ENTRÉES — même contrat que le `PostureCaptureFlow` d'origine
// (« autonome, piloté par 3 props ») : il reçoit une image et une étape, il rend des ANGLES.
// Il ne lit ni n'écrit `S` : c'est son appelant qui décide où ranger le résultat.
//
// ══ LES POINTS SONT STOCKÉS EN PIXELS D'IMAGE, JAMAIS EN 0..1 ══
// C'est la décision qui décide de la justesse, et elle n'est pas évidente. Normaliser x par la
// largeur et y par la hauteur est le réflexe — et il DÉFORME les angles dès que l'image n'est
// pas carrée : un angle est un rapport entre dx et dy, et diviser les deux par des nombres
// différents change ce rapport. Un tronc à 11° mesuré sur une image 1920×1080 en rendrait 19.
// Les taps sont donc reconvertis en pixels NATURELS de l'image, où le zoom, le pan et la
// taille de l'écran n'ont plus aucune prise. Le moteur, lui, est invariant d'échelle
// (`angleAt` normalise ses deux vecteurs) : des pixels lui suffisent.
//
// CE QUI EST REPRIS DU CODE EXISTANT, parce que le handoff le demande explicitement :
//   · commit du point au RELÂCHEMENT, jamais au contact — on vise en glissant ;
//   · glisser-corriger seulement une fois TOUS les points posés ;
//   · deux doigts pour le déplacement (le pan ne doit jamais poser un point) ;
//   · marqueurs contre-scalés (`scale(1/zoom)`) : un point garde sa taille à l'écran.
import { esc } from "../state.js";
import { REPERES, ETAPES } from "./posture-repere.js";

const ZOOM_MIN = 1, ZOOM_MAX = 4, ZOOM_PAS = 0.5;
// La loupe se place AU-DESSUS du doigt, sauf quand le doigt est trop haut — sinon elle sort de
// l'écran, et une loupe hors écran est une loupe absente.
const LOUPE_BASCULE_PX = 140;
const LOUPE_ZOOM = 3.5;

/**
 * Ouvre le pointage dans un conteneur.
 * @param {object} o
 * @param {HTMLElement} o.hote       où rendre
 * @param {string}      o.imageUrl   l'image figée à pointer
 * @param {string}      o.etape      clé de `ETAPES` (pmh · pmb · aslr)
 * @param {string}      o.titreRetour texte du lien de retour
 * @param {boolean}     o.expert     mode « J'ai l'habitude » : consigne repliée
 * @param {(r:object)=>void} o.onTermine reçoit { points, angles }
 * @param {()=>void}    o.onAnnuler
 */
export function ouvrirPointage(o) {
  const etape = ETAPES[o.etape];
  if (!etape) throw new Error("posture: étape inconnue « " + o.etape + " »");
  const noms = etape.points;

  // ── état local, jamais persisté : un pointage en cours n'est pas une mesure. C'est la même
  // décision que `pendingTrial` côté dépôt d'origine, appliquée un cran plus bas.
  const st = {
    poses: [],          // pixels NATURELS de l'image
    i: 0,               // index du point en cours
    zoom: 1, panX: 0, panY: 0,
    curseur: null,      // position ÉCRAN du doigt, pour la loupe
    expert: !!o.expert,
  };

  o.hote.innerHTML = squelette(o, etape, st);
  const q = (s) => o.hote.querySelector(s);
  const scene = q(".pt-scene");
  const img = q(".pt-img");
  const calque = q(".pt-calque");
  const loupe = q(".pt-loupe");

  /** Taille naturelle de l'image, connue seulement une fois chargée. Tant qu'elle ne l'est
   *  pas, aucun point n'est convertible — on refuse de poser plutôt que de poser faux. */
  let nat = null;
  const mesurerNat = () => {
    if (img.naturalWidth && img.naturalHeight) nat = { w: img.naturalWidth, h: img.naturalHeight };
  };
  img.addEventListener("load", () => { mesurerNat(); peindre(); });
  mesurerNat();

  /** LE RECTANGLE RÉELLEMENT PEINT, qui n'est PAS celui de l'élément.
   *
   *  `object-fit: contain` met l'image À L'ÉCHELLE DANS son élément et la CENTRE : dès que les
   *  deux ratios diffèrent, il reste des bandes vides. Mesuré sur le cadre du téléphone (362 ×
   *  600) avec une image 400 × 200 : l'image peinte fait 362 × 181 et il y a **210 px de vide
   *  en haut et en bas**. Diviser par la hauteur de l'ÉLÉMENT rend alors juste au centre — où
   *  les deux repères coïncident — et faux partout ailleurs : un tap au quart haut du cadre
   *  tombe hors de l'image, et la formule le range quand même à 50 sur 200.
   *
   *  C'est le piège habituel de cette famille : la faute est INVISIBLE au centre, donc un essai
   *  à la main la rate. `getBoundingClientRect` de l'image porte bien le zoom et le pan (ils
   *  sont appliqués par un `transform` sur son conteneur) — mais il ne sait rien de `contain`. */
  function boitePeinte() {
    if (!nat) return null;
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const k = Math.min(r.width / nat.w, r.height / nat.h);
    const w = nat.w * k, h = nat.h * k;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, w, h, k };
  }

  /** ÉCRAN → PIXELS D'IMAGE. Rend `null` hors de l'image : un tap dans la bande vide n'est pas
   *  un point, et le ranger comme s'il en était un poserait un repère que l'athlète n'a pas vu. */
  function versImage(clientX, clientY) {
    const b = boitePeinte();
    if (!b) return null;
    const x = ((clientX - b.left) / b.w) * nat.w;
    const y = ((clientY - b.top) / b.h) * nat.h;
    if (x < 0 || y < 0 || x > nat.w || y > nat.h) return null;
    return { x, y };
  }

  /** PIXELS D'IMAGE → % DU CADRE. Symétrique de la conversion ci-dessus, et elle doit l'être
   *  exactement : un marqueur posé avec une autre formule que celle qui l'a lu dériverait de la
   *  hauteur des bandes. Le pourcentage porte sur l'ÉLÉMENT (c'est lui qui positionne), donc on
   *  repasse par la boîte peinte. */
  function versPct(p) {
    const b = boitePeinte();
    if (!b) return { left: 50, top: 50 };
    const r = img.getBoundingClientRect();
    return {
      left: ((b.left - r.left) + (p.x / nat.w) * b.w) / r.width * 100,
      top: ((b.top - r.top) + (p.y / nat.h) * b.h) / r.height * 100,
    };
  }

  function peindre() {
    const contre = (1 / st.zoom).toFixed(3);
    calque.innerHTML = st.poses.map((p, k) => {
      const c = versPct(p);
      const enCours = k === st.i;
      return '<span class="pt-pt' + (enCours ? " encours" : "") + '" data-k="' + k + '"'
        + ' style="left:' + c.left.toFixed(2) + "%;top:" + c.top.toFixed(2) + "%;"
        + "transform:translate(-50%,-50%) scale(" + contre + ')">'
        + '<i class="pt-halo"></i><b class="pt-etiq">' + esc(noms[k]) + "</b></span>";
    }).join("");
    q(".pt-scene-wrap").style.transform =
      "translate(" + st.panX + "px," + st.panY + "px) scale(" + st.zoom + ")";
    q(".pt-zoom-val").textContent = Math.round(st.zoom * 100) + "%";
    majConsigne();
    majSegments();
  }

  function majSegments() {
    q(".pt-prog").innerHTML = noms.map((_, k) =>
      '<i class="' + (k < st.poses.length ? "fait" : k === st.i ? "encours" : "") + '"></i>').join("");
    q(".pt-compte").textContent = Math.min(st.i + 1, noms.length) + " / " + noms.length;
  }

  function majConsigne() {
    const fini = st.poses.length >= noms.length;
    const nom = noms[Math.min(st.i, noms.length - 1)];
    const r = REPERES[nom];
    q(".pt-eyebrow").textContent = fini
      ? "Les " + noms.length + " points sont posés"
      : "Point " + (st.i + 1) + " · " + nom;
    q(".pt-terme").textContent = fini ? "" : r.terme;
    q(".pt-titre").innerHTML = fini
      ? "Vérifie,<br>puis valide"
      : esc(r.titre).replace("\n", "<br>");
    q(".pt-hint").textContent = fini
      ? "Glisse un point pour le corriger. Les angles sont calculés à la validation."
      : r.hint;
    q(".pt-valider").textContent = fini ? "Valider la mesure" : "Poser ce point";
    // La règle du handoff : un bouton n'est jamais désactivé en silence. Ici il ne l'est
    // jamais du tout — tant qu'aucun point n'est posé, la ligne d'aide dit quoi faire.
    q(".pt-valider").disabled = !fini && st.poses.length <= st.i;
    q(".pt-aide").textContent = fini
      ? "Glisse un point pour le corriger · 2 doigts pour te déplacer"
      : st.poses.length > st.i
        ? "Glisse le point avant de valider · 2 doigts pour te déplacer"
        : "Touche l’image à l’endroit du repère · 2 doigts pour te déplacer";
  }

  // ── LA LOUPE. Elle n'est PAS un zoom du navigateur : c'est la même image, décalée pour que
  // le point visé tombe au centre du cercle, agrandie sans lissage (`image-rendering: pixelated`)
  // — lisser une loupe de pointage revient à inventer des pixels entre ceux qu'on vise.
  function majLoupe(clientX, clientY) {
    if (!nat) return;
    const rs = scene.getBoundingClientRect();
    const ri = img.getBoundingClientRect();
    const D = 104, k = LOUPE_ZOOM;
    const x = clientX - rs.left, y = clientY - rs.top;
    const haut = (clientY - rs.top) < LOUPE_BASCULE_PX;
    loupe.style.left = (x - D / 2) + "px";
    loupe.style.top = (haut ? y + 28 : y - D - 28) + "px";
    loupe.style.backgroundImage = 'url("' + o.imageUrl + '")';
    loupe.style.backgroundSize = (ri.width * k) + "px " + (ri.height * k) + "px";
    loupe.style.backgroundPosition =
      (-(clientX - ri.left) * k + D / 2) + "px " + (-(clientY - ri.top) * k + D / 2) + "px";
    loupe.hidden = false;
  }

  // ── GESTES. Un seul doigt vise ; deux doigts déplacent. La distinction est faite sur le
  // NOMBRE de points de contact et non sur la durée : un seuil de temps ferait poser un point
  // à qui commence un pan trop lentement.
  let actif = false, glisse = -1, pan = null;
  scene.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch" && e.isPrimary === false) return;
    const fini = st.poses.length >= noms.length;
    const cible = e.target.closest ? e.target.closest(".pt-pt") : null;
    // Glisser-corriger : seulement quand tout est posé (règle du dépôt d'origine).
    if (fini && cible) { glisse = +cible.dataset.k; }
    else if (fini) { return; }
    actif = true;
    scene.setPointerCapture(e.pointerId);
    st.curseur = { x: e.clientX, y: e.clientY };
    majLoupe(e.clientX, e.clientY);
    if (!fini) provisoire(e.clientX, e.clientY);
    e.preventDefault();
  });
  scene.addEventListener("pointermove", (e) => {
    if (!actif) return;
    majLoupe(e.clientX, e.clientY);
    if (glisse >= 0) { const p = versImage(e.clientX, e.clientY); if (p) { st.poses[glisse] = p; peindre(); } }
    else provisoire(e.clientX, e.clientY);
  });
  const relacher = () => {
    // COMMIT AU RELÂCHEMENT — jamais au contact. On vise en glissant, on valide en levant.
    actif = false; glisse = -1; loupe.hidden = true; peindre();
  };
  scene.addEventListener("pointerup", relacher);
  scene.addEventListener("pointercancel", relacher);

  function provisoire(cx, cy) {
    const p = versImage(cx, cy);
    if (!p) return;
    st.poses[st.i] = p;
    peindre();
  }

  // ── ZOOM. Bornes 100–400 % par pas de 50, comme le handoff les fixe.
  q(".pt-zoom-plus").onclick = () => { st.zoom = Math.min(ZOOM_MAX, st.zoom + ZOOM_PAS); peindre(); };
  q(".pt-zoom-moins").onclick = () => { st.zoom = Math.max(ZOOM_MIN, st.zoom - ZOOM_PAS); peindre(); };

  q(".pt-annuler").onclick = () => {
    // Annuler RECULE d'un point tant qu'il en reste ; c'est seulement au premier qu'il sort.
    if (st.poses.length > 0) { st.poses.pop(); st.i = st.poses.length; peindre(); }
    else if (o.onAnnuler) o.onAnnuler();
  };

  q(".pt-valider").onclick = () => {
    if (st.poses.length < noms.length) {
      if (st.poses.length > st.i) { st.i = st.poses.length; peindre(); }
      return;
    }
    o.onTermine && o.onTermine({ points: st.poses.slice(), angles: calculer(o.etape, st.poses) });
  };

  q(".pt-retour").onclick = () => { if (o.onAnnuler) o.onAnnuler(); };

  peindre();
  return st;
}

/** LE CALCUL PASSE PAR LE MOTEUR PORTÉ, jamais par une géométrie réécrite ici. `EBV2` peut être
 *  absent (bundle non chargé) : on rend alors `null` et l'appelant le DIT, plutôt que de
 *  fabriquer un angle avec une seconde formule — ce serait deux vérités pour la même mesure. */
export function calculer(etape, pts) {
  const A = globalThis.EBV2 && globalThis.EBV2.postureAngles;
  if (!A) return null;
  if (etape === "pmh") return A.computeManualTrialPmh(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
  if (etape === "pmb") return A.computeManualTrialPmb(pts[0], pts[1], pts[2]);
  if (etape === "aslr") return A.computeManualAslrAngle(pts[0], pts[1], pts[2]);
  return null;
}

function squelette(o, etape, st) {
  return '<div class="pt-wrap">'
    + '<div class="pt-head"><button type="button" class="pt-retour">‹ '
    + esc(o.titreRetour || "Retour") + " · " + esc(etape.titre) + "</button>"
    + '<span class="pt-compte"></span></div>'
    + '<div class="pt-prog"></div>'
    + '<div class="pt-scene">'
    + '<div class="pt-scene-wrap"><img class="pt-img" alt="" src="' + esc(o.imageUrl) + '">'
    + '<div class="pt-calque"></div></div>'
    + '<div class="pt-loupe" hidden></div>'
    + '<div class="pt-zoom"><button type="button" class="pt-zoom-plus">+</button>'
    + '<span class="pt-zoom-val">100%</span>'
    + '<button type="button" class="pt-zoom-moins">−</button></div>'
    + "</div>"
    + '<div class="pt-panneau' + (st.expert ? " expert" : "") + '">'
    + '<div class="pt-panneau-top"><span class="pt-eyebrow"></span><span class="pt-terme"></span></div>'
    + '<div class="pt-titre"></div><div class="pt-hint"></div>'
    + '<div class="pt-actions"><button type="button" class="pt-annuler">Annuler</button>'
    + '<button type="button" class="pt-valider"></button></div>'
    + '<div class="pt-aide"></div></div></div>';
}

/* ============================================================
   3g — LA SILHOUETTE DE RÉFÉRENCE
   ============================================================
   Elle répond au retour terrain « les critères sont très précis, j'ai dû tricher un peu pour
   aligner les points » : on compare à un cycliste type au lieu de deviner.

   ⚠ LE MÉCANISME EST LÀ, LA DONNÉE N'Y EST PAS, ET C'EST DÉLIBÉRÉ. Le handoff est explicite
   dans sa section Assets : le tracé doit être « dérivé d'une photo réelle annotée par un
   fitter plutôt que dessiné à l'estime ». Or une silhouette dessinée au jugé produirait
   EXACTEMENT le décalage qu'elle est censée corriger — l'athlète alignerait ses points sur une
   erreur, avec la confiance en plus. Tant que `SILHOUETTE_REF` est vide, l'interrupteur
   n'existe pas : proposer un repère absent serait pire que ne rien proposer.

   Quand la donnée arrivera : une entrée par étape, `{ nom: [x, y] }` en fraction du cadre, et
   le paragraphe de consigne devra dire que **les cercles indiquent une ZONE, pas une cible** —
   sans cette phrase, la silhouette redevient la faute qu'elle corrige. */
export const SILHOUETTE_REF = {};

export function silhouetteDisponible(etape) {
  const s = SILHOUETTE_REF[etape];
  return !!(s && Object.keys(s).length);
}

export function silhouetteSVG(etape, noms) {
  const s = SILHOUETTE_REF[etape];
  if (!s) return "";
  const pts = noms.map((n) => s[n]).filter(Boolean);
  if (pts.length < 2) return "";
  return '<svg class="pt-ref" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'
    + '<polyline points="' + pts.map((p) => (p[0] * 100).toFixed(1) + "," + (p[1] * 100).toFixed(1)).join(" ")
    + '"/></svg>'
    + pts.map((p) => '<span class="pt-ref-pt" style="left:' + (p[0] * 100).toFixed(1)
      + "%;top:" + (p[1] * 100).toFixed(1) + '%"></span>').join("");
}
