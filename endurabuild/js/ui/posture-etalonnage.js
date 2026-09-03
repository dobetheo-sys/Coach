// ÉCRAN 3b — L'ÉTALONNAGE DE LA PHOTO DE FACE.
//
// Deux taps sur un repère de longueur connue donnent l'échelle cm/pixel. C'est la seule
// grandeur de tout le bilan qui convertit des pixels en centimètres, et donc la seule qui rend
// la surface frontale comparable d'un bilan à l'autre.
//
// ⚠ CET ÉCRAN NE CALCULE PAS LA SURFACE, et il le dit. `computePFSA_cm2` attend un MASQUE
// binaire, que seule la segmentation MediaPipe produit — bloquée ici par la CSP
// (`script-src 'self'` sans `'wasm-unsafe-eval'`, et `smoke-securite.mjs:31` le garde).
// L'étalonnage, lui, est utile dès maintenant : il se mémorise d'un essai à l'autre, et c'est
// la moitié du travail qui ne dépend d'aucun modèle.
//
// GARDE-FOU CONSERVÉ DU DÉPÔT D'ORIGINE : deux taps distants de moins de 20 pixels natifs sont
// REFUSÉS, avec un message explicite. Ce n'est pas de la coquetterie — l'échelle est le
// rapport `longueur / distance`, donc une distance minuscule fait exploser le facteur, et une
// surface frontale absurde en découle sans qu'aucun signe ne l'annonce.
import { esc } from "../state.js";

export const DIST_MIN_PX = 20;

/** L'échelle, ou une raison de ne pas en rendre une. Fonction PURE : la garde se teste sans
 *  navigateur, ce qui est le seul moyen d'en être sûr. */
export function echelleCmParPx(a, b, longueurCm) {
  if (!a || !b) return { ok: false, motif: "deux points sont nécessaires" };
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (!Number.isFinite(d) || d < DIST_MIN_PX) {
    return { ok: false, distance: d,
      motif: "Tes deux points sont trop proches (" + Math.round(d || 0) + " px pour un minimum de "
        + DIST_MIN_PX + "). Écarte-les sur toute la longueur du repère : l’échelle en dépend "
        + "directement, et deux points collés la rendraient absurde." };
  }
  const L = Number(longueurCm);
  if (!Number.isFinite(L) || L <= 0) return { ok: false, motif: "la longueur réelle du repère manque" };
  return { ok: true, cmParPx: L / d, distance: d };
}

export function etalonnageHTML(etat) {
  const e = echelleCmParPx(etat.a, etat.b, etat.longueurCm);
  return '<div class="po-head">'
    + '<button type="button" class="po-retour" id="poRetour">‹ Position</button>'
    + '<span class="po-etape">étape 2 / 3</span></div>'
    + '<div class="po-hero-nu"><div class="po-eyebrow" style="color:var(--zn-faint)">Photo de face</div>'
    + "<h2>Deux points sur<br>un repère connu</h2>"
    + "<p>Touche les deux extrémités d’un objet dont tu connais la longueur — la largeur de ton "
    + "cintre suffit. C’est ce qui convertit les pixels en centimètres.</p></div>"
    + '<div class="pt-panneau pe-etal">'
    + '<div class="pt-panneau-top"><span class="pt-eyebrow">Longueur réelle du repère</span>'
    + '<span class="pt-terme">mémorisée d’un essai à l’autre</span></div>'
    + '<div class="pv-saisie-row" style="margin-top:12px">'
    + '<input id="poEtalLong" type="number" inputmode="numeric" step="any" value="'
    + esc(String(etat.longueurCm == null ? "" : etat.longueurCm)) + '"><span>cm</span></div>'
    + '<div class="pt-hint">' + (e.ok
      ? "Échelle obtenue : <b class=\"pr-mono\">" + e.cmParPx.toFixed(4) + " cm par pixel</b>."
      : esc(e.motif))
    + "</div></div>"
    + '<div class="po-mentions"><b>La surface frontale n’est pas encore calculée ici</b> : elle '
    + "demande un modèle de segmentation que l’app ne charge pas. L’étalonnage, lui, est "
    + "enregistré — le jour où la mesure arrive, il sera déjà là.</div>"
    + '<div class="po-espaceur"></div>';
}
