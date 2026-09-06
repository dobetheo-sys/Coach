// Onglet 🥗 Nutrition (retour utilisateur R5) — tout ce qui touche à l'assiette au même
// endroit : dépense théorique du jour (base + entraînement, N8–N9), répartition
// INDICATIVE des macros selon le profil et les séances (N10), ravitaillement d'effort de
// chaque séance (N1–N7, météo comprise), journal alimentaire (Open Food Facts + CSV MFP).
// La frontière ne bouge pas : des ESTIMATIONS et des photographies de consensus — jamais
// une cible d'apport, jamais un menu ; l'avertissement du moteur est TOUJOURS affiché.
import { S, $, esc, ebSave, todayISO, fmtDay } from "../state.js";
import { fetchWeather } from "./readiness.js";
import {
  estimateTotalNeed, estimatePeriodDetail, groupPeriodSessions, nextEcheance, subscriptionView,
  shopPromptDue, shopEndOfPlanPromptDue, submitOrder, CADENCES, FLAVOR_OPTIONS, FORMAT_OPTIONS, venteAutorisee,
} from "../shop-order.js";
import { planEndDate } from "./session-life.js";
import { sachetHTML, ATOUTS_GEL } from "./sachet.js";
import { GEL_ZENNA, SACHET_ARGUMENTS } from "../shop-catalog.js";
// R6 — le journal alimentaire (Open Food Facts + CSV) est RETIRÉ sur décision
// utilisateur : trop de saisie pour trop peu de valeur ; l'onglet reste
// estimations + ravitaillement. (Les données foodLog éventuelles restent
// inoffensives dans l'état — rien n'est perdu si l'avis change.)


/* ============================================================
   COMPOSITION DE LA MAQUETTE ZENNA — les briques de l'onglet Outils
   ============================================================
   La maquette compose cet onglet avec trois primitives, et elles ne sont pas décoratives :
     · `details.fold` — un repli dont le SOMMAIRE porte déjà la valeur (« ~2 600 kcal »), donc
       on lit l'essentiel sans ouvrir ;
     · `.kv` — une ligne intitulé/valeur, l'intitulé en petites capitales mono à gauche, la
       valeur alignée à droite. C'est ce qui rend une carte de chiffres lisible en diagonale,
       là où des phrases enchaînées obligent à tout lire ;
     · `.shop-card` — la carte de vente, composée d'un en-tête produit, d'une preuve, d'un
       sélecteur de cadence, d'un devis, de choix, d'un bouton.
   Elles sont écrites ici parce que c'est cet onglet qui les emploie ; si un autre en a besoin,
   elles remonteront d'un cran plutôt que d'être recopiées. */

/** Une ligne intitulé → valeur. `ton` : "accent" met la valeur en avant. */
function kvHTML(k, v, ton) {
  return '<div class="kv"><div class="kv-k">' + k + '</div><div class="kv-v' + (ton ? " " + ton : "") + '">' + v + "</div></div>";
}
/** Un repli dont le sommaire porte la valeur — on lit sans ouvrir. */
function foldHTML(titre, valeur, corps, open, id) {
  return '<details class="load-card fold"' + (id ? ' id="' + id + '"' : "") + (open ? " open" : "") + ">"
    + '<summary class="load-title"><span>' + titre
    + (valeur ? ' <span class="fold-sum-val">· ' + valeur + "</span>" : "")
    + '</span><span class="chev" aria-hidden="true">›</span></summary>'
    + '<div class="fold-body">' + corps + "</div></details>";
}
/**
 * LE PRODUIT SE MONTRE — le sachet des maquettes, à la saveur choisie.
 *
 * Ce créneau portait un « flacon » générique : un rectangle arrondi surmonté d'une pastille de
 * couleur, dessiné ici faute de produit à montrer. Les maquettes du fondateur (12/08/2026)
 * fixent le sachet réel ; `sachetHTML` le rend depuis `GEL_ZENNA`, donc la vignette, la rangée
 * de choix et le devis parlent tous du même objet (R11.1) — et la table des couleurs de capsule
 * qui vivait ici disparaît avec lui.
 *
 * « peu d'importance » ne rend AUCUN sachet : c'est une non-préférence valide, et lui inventer
 * un visuel ferait croire à une cinquième saveur. Le créneau reste alors vide plutôt que rempli
 * par défaut avec le sachet neutre, qui, lui, EXISTE.
 */
function productTileHTML(flavor, taille) {
  const s = sachetHTML(flavor, "grand", taille || 58);
  return s ? '<div class="product-tile">' + s + "</div>" : "";
}
/**
 * LE PACKSHOT DE LA PROPOSITION (22c/3a) — un sachet plus grand, seul, sans la pile de texte
 * du chip (qui vit à côté sur la carte repliée). Les quatre packshots du canevas pèsent
 * 540-570 Ko chacun (mesuré sur les fichiers du paquet), très au-dessus des ~150 Ko qui
 * justifieraient de les embarquer dans le précache — `sachetHTML` (SVG, quelques centaines
 * d'octets) reste donc le rendu réel, jamais un repli provisoire.
 */
function heroSachetHTML(flavor) {
  return sachetHTML(flavor, "grand", 128);
}
/** Intertitre de section, primitive `.zn-sec` du socle : un mot-clé mono, un filet, rien
 *  de plus — jamais réécrite ici, seulement composée (22c : « Ce qu'il y a dans le sachet »,
 *  « Cadence d'envoi », « Bon à savoir »). */
function znSecHTML(titre, droite) {
  return '<div class="zn-sec"><span>' + esc(titre) + "</span><i></i>" + (droite ? "<span>" + esc(droite) + "</span>" : "") + "</div>";
}
/**
 * « CE QU'IL Y A DANS LE SACHET » — les quatre arguments à nu de 22c/3a, lus depuis
 * `SACHET_ARGUMENTS` (shop-catalog.js, seul endroit qui les porte — R11.1). Liste À NU sur la
 * primitive `.zn-list`/`.zn-row` du socle : plus de carte autour, c'est le relevé qui reçoit
 * le relief de l'écran.
 */
function sachetArgumentsHTML() {
  return '<ul class="zn-list">' + SACHET_ARGUMENTS.map((a) =>
    '<li class="zn-row bq-arg-row"><span class="bq-arg-mot zn-mono">' + esc(a.mot) + '</span>'
    + '<span class="bq-arg-phrase">' + esc(a.phrase) + "</span></li>").join("") + "</ul>";
}
/** « BON À SAVOIR » — les trois faits courts de `ATOUTS_GEL` (sachet.js), en pied de carte
 *  (22c), sur la même primitive de liste que les arguments du haut. */
function bonASavoirHTML() {
  return znSecHTML("Bon à savoir") + '<ul class="zn-list">' + ATOUTS_GEL.map((a) =>
    '<li class="zn-row bq-savoir-row"><b class="bq-savoir-lab zn-mono">' + esc(a.t) + '</b>'
    + '<span class="bq-savoir-val">' + esc(a.d) + "</span></li>").join("") + "</ul>";
}
// Les « trois promesses » (livré avant la période / résiliable à l'échéance / calé sur le
// plan) n'apparaissent plus dans la direction retenue du canevas (22c/3a ne les dessinent
// plus — vérifié sur les deux écrans) : elles sont dites autrement, dans le pied de carte et
// la mention `.soc-proof`. Le bandeau `.trust-row`/`.trust` de `zenna-tabs.css` n'a donc plus
// d'appelant ici ; il n'a jamais eu d'autre consommateur (vérifié), une classe MORTE plutôt
// qu'une fonction — rien à retirer côté partagé pour autant (périmètre de cette zone).
const eur = (n) => n.toFixed(2).replace(".", ",") + " €";

/** Le devis de la période, ligne par ligne — le détail COMPLET, jamais résumé (c'est ce que
 *  `<summary>Voir les N séances</summary>` déplie en dessous du relevé groupé, écran 22c).
 *  Aucune quantité n'est inventée : `estimatePeriodDetail` les tire de ce que chaque séance
 *  affiche déjà dans sa carte de ravitaillement (R11.1). */
function periodLinesHTML(detail) {
  if (!detail || !detail.sessions.length) return "";
  return detail.sessions.map((x, i) => {
    const parts = [];
    // Le nom du produit vient de `GEL_ZENNA` tant qu'aucun fournisseur n'a de référence
    // propre — `x.gelName` (issu de `CATALOG`) reprend la main dès qu'il en existe une.
    if (x.gelUnits) parts.push(x.gelUnits + " × " + esc(x.gelName || GEL_ZENNA.nom) + " (" + GEL_ZENNA.glucidesG + " g)");
    if (x.drinkUnits) parts.push(x.drinkUnits + " × boisson (500 ml)");
    const eau = !parts.length;
    return '<div class="period-line' + (eau ? " water" : "") + '" style="animation-delay:' + (i * 90) + 'ms">'
      + '<span class="pl-n">' + esc(x.name) + '</span><span class="pl-q">' + (eau ? "eau seule" : parts.join(" + ")) + "</span></div>";
  }).join("");
}
/**
 * LE RELEVÉ GROUPÉ (22c/2a) — au plus quatre lignes, une par séance RÉPÉTÉE plutôt qu'une par
 * occurrence (`groupPeriodSessions`, shop-order.js — grouper par nom exact, jamais inventer une
 * catégorie). Même tableau que `periodLinesHTML`, un second AFFICHAGE seulement.
 */
function groupedPeriodLinesHTML(detail) {
  if (!detail || !detail.sessions.length) return "";
  // Format COMPACT (« 3 × Zenna gel glucide » plutôt que le poids en plus, réservé au détail
  // complet) mais le NOM DU PRODUIT reste écrit en toutes lettres, ici comme dans le détail —
  // smoke-shop §10 refuse un « gel » générique dans une ligne de devis (R11.1 : une seule
  // identité produit, jamais un raccourci qui la tait).
  return groupPeriodSessions(detail.sessions, 4).map((g) => {
    const parts = [];
    if (g.gelUnits) parts.push(g.gelUnits + " × " + esc(GEL_ZENNA.nom));
    if (g.drinkUnits) parts.push((parts.length ? "+ " : "") + g.drinkUnits + " boisson" + (g.drinkUnits > 1 ? "s" : ""));
    const eau = !parts.length;
    const nom = g.name ? esc(g.name) : g.count + " autres séances";
    const count = g.name && g.count > 1 ? '<span class="bq-count">× ' + g.count + "</span>" : "";
    return '<div class="period-line' + (eau ? " water" : "") + '">'
      + '<span class="pl-n">' + nom + count + '</span><span class="pl-q">' + (eau ? "eau seule" : parts.join("<br>")) + "</span></div>";
  }).join("");
}
function periodTotalHTML(detail) {
  if (!detail) return "";
  const t = detail.totals, parts = [];
  if (t.gelUnits) parts.push(t.gelUnits + " gels");
  if (t.drinkUnits) parts.push(t.drinkUnits + " boissons");
  const n = detail.sessions.filter((x) => x.gelUnits || x.drinkUnits).length;
  return '<div class="period-total"><span class="pt-lab">' + (parts.join(" + ") || "Rien à envoyer")
    + '</span><span class="pt-val">' + eur(t.priceEUR) + "</span></div>"
    // Le ramené « par séance » n'apparaît qu'à partir de DEUX séances couvertes : à une seule,
    // il répète le total au centime près sous un autre nom — mesuré (« 6,30 € » / « ≈ 6,30 €
    // par séance couverte »). Un chiffre qui se répète se lit comme un second argument.
    + (n >= 2 ? '<div class="per-session">soit <b>≈ ' + eur(t.priceEUR / n) + " / séance couverte</b></div>" : "");
}
/**
 * LE CORPS DU RELEVÉ — le relevé groupé (≤ 4 lignes), le total, puis le détail COMPLET replié
 * dessous (« Voir les N séances, une par une », 22c). Fonction PARTAGÉE par la proposition et
 * l'abonnement actif (R11.1) : les deux cartes montrent le même tableau `detail.sessions`,
 * seul l'EN-TÊTE qui l'introduit change de mots selon le contexte (voir `releveHTML`).
 */
function releveBodyHTML(detail) {
  const n = detail ? detail.sessions.length : 0;
  if (!detail || !n) {
    return '<div class="load-sub" style="padding:2px 0 0">Ce plan-ci n’a plus de séance à venir — le premier envoi s’ajustera à ton prochain plan ou à tes sorties libres.</div>';
  }
  return groupedPeriodLinesHTML(detail) + periodTotalHTML(detail)
    + (n > 1
        ? '<details class="bq-devis-detail"><summary><span>Voir les ' + n + " séances, une par une</span><span class=\"chev\" aria-hidden=\"true\">⌄</span></summary>"
          + periodLinesHTML(detail) + "</details>"
        : "");
}
/** Le panneau EN CREUX qui porte le relevé (22c : « le relevé […] devient l'unique objet en
 *  relief » de l'écran — posé un cran plus sombre que la carte qui le contient, la teinte du
 *  socle pour un bloc de lecture secondaire). `headHTML` est l'en-tête déjà composé : la
 *  proposition et l'abonnement actif n'annoncent pas la même chose au-dessus du même tableau. */
function releveHTML(detail, headHTML) {
  return '<div class="zn-creux bq-releve">' + headHTML + releveBodyHTML(detail) + "</div>";
}

// Estimation énergétique du jour (décision utilisateur 28/07/2026) — dépense, jamais cible.
export function energyCardHTML(day, open) {
  if (!globalThis.EBV2 || !globalThis.EBV2.dailyEnergy) return "";
  let e;
  try { e = globalThis.EBV2.dailyEnergy(S.answers, day ? day.sessions : []); } catch (err) { return ""; }
  if (!e) {
    // O-16 — dire POURQUOI. `dailyEnergy` rend null pour trois raisons distinctes (pas de
    // poids · âge sous la borne · gabarit hors bornes de validation) et cette carte les
    // confondait toutes dans « renseigne ton poids » : un adolescent, ou quelqu'un dont l'IMC
    // sort des bornes, était renvoyé corriger une donnée qui n'était pas en cause.
    let motif = "";
    try { motif = (globalThis.EBV2.energyRefusal && globalThis.EBV2.energyRefusal(S.answers)) || ""; } catch (err) { motif = ""; }
    return foldHTML("🔥 Dépense estimée du jour", "", '<div class="load-sub">'
      + (motif || "Renseigne ton <b>poids</b> dans l’onglet 📋 Profil pour voir l’estimation (taille, âge et sexe l’affinent). Aucune estimation sans donnée réelle.")
      + "</div>", open);
  }
  const f = (r) => r[0] === r[1] ? r[0] : r[0] + "–" + r[1];
  let corps = kvHTML("Base + vie quotidienne", "~" + f(e.daily) + " kcal")
    + kvHTML("Métabolisme de base", "~" + f(e.bmr) + " kcal")
    + kvHTML("Entraînement du jour", e.training[1] ? "~" + f(e.training) + " kcal" : "repos — 0 kcal");
  // N11 — le repos de ces heures-là est déjà dans la ligne du dessus : on le retire, et on le
  // DIT. Retranché en silence, le total ne tomberait pas juste et la carte deviendrait suspecte.
  if (e.restOverlap > 0) corps += kvHTML("− déjà compté", e.restOverlap + " kcal (un MET, c’est le repos)");
  corps += kvHTML("Total", "~" + f(e.total) + " kcal", "accent");
  // Les repères de macros ne sont pas des VALEURS mais des phrases sourcées :
  // « Protéines ~85–120 g/j — 1,2 à 1,7 g/kg (ACSM/AND/DC 2016) ». Poussées telles quelles dans
  // une `.kv`, elles s'alignaient à droite sur quatre lignes et cassaient la lecture en diagonale
  // que cette primitive existe pour donner (mesuré au rendu). On garde donc la ligne intitulé →
  // valeur pour le chiffre, et la JUSTIFICATION avec sa source passe en note — jamais reformulée,
  // jamais retirée : c'est ce qui distingue une photographie de consensus d'une consigne.
  (e.macros.lines || []).forEach((l) => {
    const d = l.indexOf("—");
    if (d < 0) { corps += kvHTML("Repère", l); return; } // la phrase a changé de forme : on n'invente pas
    const tete = l.slice(0, d).trim(), source = l.slice(d + 1).trim();
    const sp = tete.indexOf(" ");
    corps += sp > 0
      ? kvHTML(tete.slice(0, sp), tete.slice(sp + 1)) + '<div class="kv-src">' + source + "</div>"
      : kvHTML("Repère", l);
  });
  if (e.approximate) corps += '<div class="load-sub" style="color:var(--zn-gold,#8a6d00);margin-top:8px">Fourchette large : complète taille/âge au 📋 Profil pour l’affiner.</div>';
  corps += '<div class="load-sub" style="margin-top:8px">C’est une photographie de la littérature, pas un menu ni une consigne. ' + e.disclaimer + "</div>";
  return foldHTML("🔥 Dépense estimée du jour", "~" + f(e.total) + " kcal", corps, open);
}

// Ravitaillement d'effort par séance (N1–N7) — la température arrive en différé.
//
// 07/08/2026 — le chip « achat immédiat » posé sur la séance du jour est RETIRÉ (décision
// utilisateur) : personne ne peut être livré le jour même, un lien de vente ici n'avait pas
// de sens. Le canal de vente réel vit désormais dans `shopSubscriptionCardHTML` — un
// abonnement récurrent, anticipé, pas un achat au coup par coup sur une séance passée.
export function nutritionCardHTML(day, tempC, open) {
  if (!day || !globalThis.EBV2 || !globalThis.EBV2.sessionNutrition) return "";
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  const advs = day.sessions
    .map((s) => ({ s, a: globalThis.EBV2.sessionNutrition(s, { tempC: tempC == null ? null : tempC, weightKg: wkg }) }))
    .filter((x) => x.a);
  if (!advs.length) return "";
  // Retour utilisateur (08/08/2026) : le résumé visible SANS ouvrir la carte n'affichait que la
  // météo — l'info qui compte (combien de glucides, combien boire) restait cachée un niveau plus
  // bas. Reprise ici telle quelle (jamais une cible inventée : même chiffre que ce que chaque
  // séance affiche déjà, juste agrégé), la météo reste à la suite — elle affine, elle ne
  // remplace pas. La primitive `fold` de la maquette est faite pour ça : le sommaire porte la
  // valeur.
  const carbSessions = advs.filter((x) => x.a.during.carbsGPerH);
  const hydrated = advs.filter((x) => x.a.during.drinkMlPerH[0] > 0);
  const drinkResume = hydrated.length
    ? Math.min(...hydrated.map((x) => x.a.during.drinkMlPerH[0])) + "–" + Math.max(...hydrated.map((x) => x.a.during.drinkMlPerH[1])) + " ml/h"
    : "eau à la soif";
  const resume = (carbSessions.length
    ? Math.min(...carbSessions.map((x) => x.a.during.carbsGPerH[0])) + "–" + Math.max(...carbSessions.map((x) => x.a.during.carbsGPerH[1])) + " g/h · " + drinkResume
    : drinkResume) + (tempC != null ? " · " + Math.round(tempC) + "°C" : "");
  let corps = "";
  advs.forEach(({ s, a }) => {
    const boire = a.during.drinkMlPerH[0] === 0
      ? "eau à la soif"
      : a.during.drinkMlPerH[0] + "–" + a.during.drinkMlPerH[1] + " ml/h" + (a.during.sodium ? " + sodium" : "");
    corps += '<div class="zn-sess-lab">' + esc(s.name) + "</div>"
      + kvHTML("Avant", a.before)
      + kvHTML("Pendant", (a.during.carbsGPerH ? a.during.carbsGPerH[0] + "–" + a.during.carbsGPerH[1] + " g/h · " : "") + boire, "accent")
      + (a.after ? kvHTML("Après", a.after) : "")
      + kvHTML("Dépense estimée", "~" + a.kcal[0] + "–" + a.kcal[1] + " kcal" + (wkg ? "" : " (ajoute ton poids au 📋 Profil)"));
  });
  corps += '<div class="load-sub" style="margin-top:8px">' + advs[0].a.disclaimer + "</div>";
  return foldHTML("🥤 Ravitaillement d’aujourd’hui", resume, corps, open, "nutCard");
}

// Abonnement de ravitaillement, RÉCURRENT (07/08/2026) — chaque semaine ou chaque mois, un
// envoi couvre la période à VENIR (livré en avance, jamais le jour même), résiliable
// uniquement à l'échéance (jamais en cours de période — rien n'est facturé pour le
// promettre autrement). État UI pur (repli formulaire) — jamais persisté, une nouvelle
// vue à chaque ouverture d'onglet comme le reste de ce module.
let shopEditing = false;
let shopConfirmCancel = false; // bandeau « Résilier à l’échéance ? » — état d’écran, jamais persisté
// La maquette ne dessine la carte de vente QUE dépliée. Or `shopPromptDue` énonce une
// restriction délibérée : « le tunnel se propose une fois puis se tait 4 semaines ». L'ancienne
// carte la tenait par l'attribut `open` de son `<details>` ; en passant à la composition de la
// maquette (plus de `<details>`), la tenir demande un état. Sans lui, une carte de VENTE
// resterait dépliée en permanence dans l'onglet — exactement le rappel permanent que ce
// commentaire interdit. Replié, c'est la même carte, réduite à son en-tête : rien n'est caché,
// et un bouton la rouvre (consulter reste gratuit).
let shopExpanded = false;

/** Un groupe de choix mutuellement exclusifs — libellé RELIÉ au groupe, sélection ANNONCÉE. */
function choixHTML(libelle, attr, options, choisi, vignette) {
  const id = "choix-" + attr;
  return '<div class="choice-lab" id="' + id + '">' + esc(libelle) + "</div>"
    + '<div class="choice-row' + (vignette ? " avec-sachet" : "") + '" role="radiogroup" aria-labelledby="' + id + '">'
    + options.map((f) => {
      // L'illustration est DÉCORATIVE (`aria-hidden` dans `sachetHTML`) et le libellé reste dans
      // le bouton : un lecteur d'écran entend « Citron », pas « image, Citron ». Une saveur sans
      // sachet (« peu d'importance ») garde exactement le même bouton, sans trou dans la rangée.
      const ill = vignette ? vignette(f) : "";
      return '<button type="button" role="radio" class="choice' + (f === choisi ? " sel" : "")
        + (ill ? " a-sachet" : "") + '" aria-checked="' + (f === choisi) + '" data-' + attr + '="' + esc(f) + '">'
        + ill + "<span>" + esc(f) + "</span></button>";
    }).join("")
    + "</div>";
}

function shopSubscriptionCardHTML(plan, today) {
  // Un mineur ne se voit rien proposer à la vente (voir `venteAutorisee`). Le test passe AVANT
  // tout le reste : rien de la carte n'est construit, donc rien ne peut fuiter par un état
  // particulier (abonnement déjà pris, fin de plan…). Le ravitaillement de la séance, lui,
  // reste intégralement affiché ailleurs dans l'onglet — c'est la VENTE qui se retire.
  if (!venteAutorisee(S.answers)) return "";
  const sub = S.answers.shopSubscription || null;
  const view = subscriptionView(sub, today);
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  const abonneActif = view.status === "active" || view.status === "cancel_pending";

  // ── PRÉLÈVEMENT REFUSÉ ─────────────────────────────────────────────────────
  //
  // ⚠ CONTRAT À TENIR LE JOUR OÙ LE SERVICE EXISTE. Aucun paiement n'est encore encaissé (voir
  // la mention en pied de carte) : cet état ne peut donc pas se produire tout seul aujourd'hui.
  // Il est écrit maintenant parce que c'est le moment où l'abonnement se dessine, et qu'un
  // échec de prélèvement traité après coup se traite mal — on y bricole une alerte rouge et on
  // perd la seule chose qui compte ici : dire que rien n'est annulé.
  //
  // Le prestataire de paiement devra écrire `S.answers.shopSubscription.paymentFailure` :
  //   { at: "AAAA-MM-JJ",        (obligatoire — date du refus)
  //     amountEur: 34,           (optionnel)
  //     reason: "carte expirée", (optionnel, en clair, jamais un code)
  //     dueBy: "AAAA-MM-JJ",     (optionnel — date après laquelle l'envoi saute)
  //     shipmentAt: "AAAA-MM-JJ" } (optionnel — l'envoi suspendu)
  // Effacer la clé = le problème est réglé. Rien d'autre à faire, aucun statut à synchroniser :
  // `subscriptionView` continue de dériver le reste, cet état se pose PAR-DESSUS sans le
  // remplacer — l'abonnement n'est pas résilié, c'est tout le propos.
  //
  // TON : l'envoi est SUSPENDU, pas annulé. La date limite est dite, ce qui se passe après
  // aussi, et une seule action est proposée. Pas de rouge plein, pas de majuscules d'alarme :
  // quelqu'un dont la carte a expiré n'a rien fait de mal.
  const echec = sub && sub.paymentFailure && sub.paymentFailure.at ? sub.paymentFailure : null;
  if (echec && abonneActif && !shopEditing) {
    const cad = CADENCES[sub.cadence] || CADENCES.hebdo;
    // « Avant / après » (19e) : le panneau ne s'affiche que si une date-limite EXISTE
    // (`dueBy`) — sans elle, dessiner un seuil serait inventer une échéance que le prestataire
    // n'a pas fournie (le contrat de `paymentFailure` la déclare optionnelle).
    const avantApres = echec.dueBy ? '<div class="zn-creux bq-pay-panel">'
      + '<div class="bq-pay-row"><span class="bq-pay-when soon zn-mono">Avant le ' + esc(fmtDay(echec.dueBy).replace(/^\S+\s/, "")) + '</span>'
      + '<span class="bq-pay-txt">Tu mets le paiement à jour' + (echec.shipmentAt ? ", l’envoi part le " + esc(fmtDay(echec.shipmentAt).replace(/^\S+\s/, "")) + " comme prévu." : ".") + "</span></div>"
      + '<div class="bq-pay-row"><span class="bq-pay-when late zn-mono">Après</span>'
      + '<span class="bq-pay-txt">L’envoi glisse à la période suivante. Tu n’es pas prélevé entre-temps.</span></div>'
      + "</div>" : "";
    return '<div class="shop-card" id="shopCard" data-payment="failed">'
      + '<div class="pay-head"><svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--zn-bad)"><circle cx="10" cy="10" r="7.5"></circle><path d="M7.5 12.5l5-5M7.5 7.5l5 5"></path></svg>'
      + '<span class="pay-lab">Prélèvement refusé</span></div>'
      + '<div class="pay-title">' + (echec.shipmentAt ? "Envoi du " + esc(fmtDay(echec.shipmentAt)) : "Prochain envoi")
      + "<br>suspendu</div>"
      + '<div class="pay-body">'
      + (echec.reason ? esc(echec.reason).replace(/^./, (c) => c.toUpperCase()) + ". " : "")
      + "Le prélèvement" + (echec.amountEur ? " de " + esc(String(echec.amountEur)) + " €" : "")
      + " du " + esc(fmtDay(echec.at)) + " n’est pas passé. "
      + "<b>Rien n’est annulé</b> : ton abonnement " + esc(cad.label.toLowerCase()) + " reste en place, "
      + "l’envoi part dès que le paiement aboutit"
      + (echec.dueBy ? ". Passé le " + esc(fmtDay(echec.dueBy)) + ", il saute et reprend à la période suivante." : ".")
      + "</div>"
      + avantApres
      + '<button type="button" class="zn-btn" id="shopFixPayment" style="margin-top:14px">Mettre à jour le paiement</button>'
      // 19e — « l'accès au plan n'est pas pris en otage » : le rappel explicite EST la garde
      // contre l'inquiétude la plus probable d'un paiement refusé (« est-ce que je perds mon
      // plan ? »), donc affirmé ici plutôt que laissé implicite.
      + '<div class="bq-pay-note">Ton plan d’entraînement n’est pas concerné : il reste accessible, l’abonnement ne porte que sur la nutrition. Aucune relance automatique — le prélèvement n’est retenté qu’après ta mise à jour.</div>'
      // « Modifier » / « Résilier » restent atteignables MÊME en paiement refusé (O-17,
      // informer plutôt que bloquer) : mêmes ids que la carte active, la même liaison
      // (`bindShopSubscription`) les active déjà sans code nouveau — `shopEditing`/
      // `shopConfirmCancel` font sortir de CETTE branche au prochain rendu, exactement le
      // comportement voulu (le paiement en échec n'empêche ni l'un ni l'autre).
      + '<div class="zn-list" style="margin-top:16px">'
      + znSecHTML("Ton abonnement")
      + '<button type="button" class="zn-row bq-row-btn" id="shopEdit"><div style="flex:1;min-width:0;text-align:left"><div style="font-size:var(--fs-sm);font-weight:600;color:var(--zn-text)">Modifier le contenu de l’envoi</div>'
      + '<div class="zn-mono" style="font-size:var(--fs-micro);color:var(--zn-faint2);margin-top:3px">' + esc(cad.label) + " · " + esc(sub.flavor) + " · " + esc(sub.format) + '</div></div><span class="zn-chev">›</span></button>'
      + '<button type="button" class="zn-row bq-row-btn" id="shopAskCancel"><div style="flex:1;min-width:0;text-align:left"><div style="font-size:var(--fs-sm);font-weight:600;color:var(--zn-text)">Suspendre ou résilier</div>'
      + '<div class="zn-mono" style="font-size:var(--fs-micro);color:var(--zn-faint2);margin-top:3px">Sans frais, à la prochaine échéance</div></div><span class="zn-chev">›</span></button>'
      + "</div>"
      + "</div>";
  }

  // ── ABONNEMENT EN COURS ────────────────────────────────────────────────────
  if (abonneActif && !shopEditing) {
    const cad = CADENCES[sub.cadence] || CADENCES.hebdo;
    const echeance = nextEcheance(sub.startedAt, cad.days, today);
    const detail = estimatePeriodDetail(plan, wkg, cad.days, today, S.sport);
    const enteteReleve = '<div class="period-lab"><span>Prochain envoi</span><span class="bq-releve-range" style="color:var(--zn-good);text-transform:none;font-weight:600">livré avant le début de la période</span></div>';
    return '<div class="shop-card" id="shopCard">'
      + '<div class="sub-active-head">'
      + productTileHTML(sub.flavor, 46)
      + '<div style="flex:1;min-width:0"><div class="sub-state"><span class="sub-active-dot" aria-hidden="true"></span>Abonnement actif</div>'
      + '<div class="sub-params">' + esc(sub.flavor) + " · " + esc(sub.format) + "</div>"
      + '<div class="sub-since">' + esc(cad.label) + " · depuis le " + esc(fmtDay(sub.startedAt)) + "</div></div>"
      + "</div>"
      + releveHTML(detail, enteteReleve)
      + kvHTML("Prochaine échéance", esc(fmtDay(echeance)))
      + (view.status === "cancel_pending"
          ? '<div class="cancel-note">⚠ Résiliation prévue le ' + esc(fmtDay(view.until)) + " — le prochain envoi a lieu, rien après.</div>"
          : "")
      + (shopConfirmCancel
          ? '<div class="confirm-strip"><span>Résilier à l’échéance ?</span><div style="display:flex;gap:7px">'
            + '<button class="zn-btn" id="shopCancel" type="button">Confirmer</button>'
            + '<button class="zn-btn-2" id="shopKeep" type="button">Garder</button></div></div>'
          : '<div class="btn-row">'
            + '<button class="zn-btn-2" id="shopEdit" type="button">Modifier</button>'
            + (view.status === "cancel_pending"
                ? '<button class="zn-btn" id="shopUncancel" type="button">Continuer quand même</button>'
                : '<button class="zn-btn-2" id="shopAskCancel" type="button">Résilier</button>')
            + "</div>")
      // Cette carte-ci affiche AUSSI un prix : elle porte donc la même réserve. Ne la mettre
      // que sur la proposition laisserait le chiffre se durcir une fois l'abonnement pris —
      // exactement le moment où il compte le plus.
      + '<div class="shop-fine">Prix estimé sur une référence générique (30 g de glucides par gel, 500 ml par boisson). '
      + "Service de commande pas encore actif — intention enregistrée sur cet appareil, résiliable à chaque échéance, jamais engagé au-delà.</div>"
      + "</div>";
  }

  // ── PROPOSITION / ÉDITION ──────────────────────────────────────────────────
  const endDate = planEndDate(plan, S.answers);
  const planOver = !!endDate && today >= endDate;
  if (!abonneActif && !estimateTotalNeed(plan, wkg, today, S.sport) && !planOver) return "";
  const cadenceSel = (sub && sub.cadence) || "hebdo";
  const flavorSel = (sub && sub.flavor) || FLAVOR_OPTIONS[0];
  const formatSel = (sub && sub.format) || FORMAT_OPTIONS[0];
  const detail = estimatePeriodDetail(plan, wkg, CADENCES[cadenceSel].days, today, S.sport);
  const echeance = nextEcheance(sub && sub.startedAt ? sub.startedAt : today, CADENCES[cadenceSel].days, today);
  const debutPeriode = sub && sub.startedAt ? sub.startedAt : today;
  const cles = Object.keys(CADENCES);
  const iSel = Math.max(0, cles.indexOf(cadenceSel));
  const titre = abonneActif ? "Modifier l’abonnement" : planOver ? "Rester accompagné(e)" : "S’abonner au ravitaillement";
  // « 1er ENVOI le 19/08 » ANNONÇAIT UNE EXPÉDITION QUI N'AURA PAS LIEU. Aucun fournisseur
  // n'existe (`CATALOG` est vide) et `submitOrder` ne fait aucune requête : le bouton portait
  // donc, en capitales, la promesse que la mention légale dessous venait démentir. Ce que cette
  // date désigne réellement, c'est le début de la première PÉRIODE couverte — un fait vrai, que
  // le calcul tient. Le bouton le dit ; l'envoi reviendra dans ce libellé le jour où il existe.
  const cta = abonneActif ? "Enregistrer les modifications"
    : (view.status === "cancelled" ? "Reprendre l’abonnement" : "Activer — 1re période le " + esc(fmtDay(echeance)));

  // La cadence anti-spam est celle du moteur de vente, pas une seconde règle écrite ici (R11.1).
  const due = shopPromptDue(sub, S.answers.plan_start, today) || shopEndOfPlanPromptDue(sub, endDate, today);
  const deplie = abonneActif || shopEditing || shopExpanded || due;

  const enTete = '<div class="shop-head-row"><div style="flex:1;min-width:0">'
    + '<div class="shop-tag">Ravitaillement · abonnement</div>'
    + '<div class="shop-title">' + titre + "</div>"
    + '<div class="shop-lead">' + (planOver && !abonneActif
        ? "Ta préparation touche à sa fin — si tu continues à t’entraîner, tu peux rester accompagné(e), à la cadence de ton choix."
        : "Reçois tes gels à l’avance, à la cadence de ton choix — jamais le jour même, jamais en retard sur une séance.") + "</div>"
    + "</div>" + productTileHTML(flavorSel) + "</div>";

  if (!deplie) {
    return '<div class="shop-card shop-card-min" id="shopCard">' + enTete
      + '<button type="button" class="shop-cta" id="shopExpand">Voir ce que ça donne pour mon plan</button>'
      + "</div>";
  }

  // ── LE HÉROS (22c/3a) — le packshot (repli SVG, voir `heroSachetHTML`), un eyebrow, un
  // titre display dont le dernier segment porte l'accent, un paragraphe. ------------------
  // Le titre marketing de la maquette ne vaut QUE pour la proposition standard : la fin de
  // plan et l'édition d'un abonnement en cours restent CONTEXTUELLES (smoke-shop §2 vérifie
  // « touche à sa fin » / « Rester accompagné » — un slogan fixe les aurait fait disparaître).
  // `<br>` ne produit AUCUN espace en `textContent` (mesuré : smoke-shop lit « Rester
  // accompagné » avec un espace littéral) — les deux mots contextuels restent sur UNE ligne.
  const heroTitreHTML = (planOver && !abonneActif) ? "Rester <em>accompagné(e).</em>"
    : abonneActif ? "Modifier <em>l’abonnement.</em>"
    : "Des gels pensés<br>pour <em>ton effort.</em>";
  const heroLeadTxt = (planOver && !abonneActif)
    ? "Ta préparation touche à sa fin — si tu continues à t’entraîner, tu peux rester accompagné(e), à la cadence de ton choix."
    : abonneActif ? "Modifie goût, format ou cadence — l’abonnement continue, rien n’est relancé ni perdu."
    : "Des glucides simples et efficaces pour t’accompagner à chaque étape de ton entraînement et de ta progression.";
  const hero = '<div class="bq-hero">' + heroSachetHTML(flavorSel)
    + '<div class="bq-hero-tag zn-mono">Nutrition · abonnement</div>'
    + '<div class="bq-hero-title zn-display">' + heroTitreHTML + "</div>"
    + '<div class="bq-hero-lead">' + heroLeadTxt + "</div>"
    + "</div>";

  // ── LA CADENCE ET LE RELEVÉ (22c) — chaque pilule annonce déjà son compte de séances
  // couvertes ; le relevé, groupé, est LE panneau en creux de l'écran. --------------------
  const compteParCadence = {};
  cles.forEach((k) => { const d = estimatePeriodDetail(plan, wkg, CADENCES[k].days, today, S.sport); compteParCadence[k] = d ? d.sessions.length : 0; });
  const seg = '<div class="seg" id="cadSeg" role="radiogroup" aria-label="Cadence d’envoi">'
    + cles.map((k, i) => '<button type="button" role="radio" class="seg-opt' + (i === iSel ? " active" : "") + '" data-cadence="' + k + '" aria-checked="' + (i === iSel) + '">'
        + '<span class="so-l">' + esc(CADENCES[k].label) + '</span><span class="so-s">tous les ' + CADENCES[k].days + " jours</span>"
        // Le compte de séances par cadence — présent dans le canevas (« 3 séances couvertes »
        // / « 13 séances couvertes »), lu dans le TEXTE et non dans `.so-s` (que smoke-shop §8
        // exige au format « N jours » — R11.1 : deux faits, deux porteurs).
        + '<span class="zn-mono" style="display:block;font-size:var(--fs-micro);margin-top:2px;opacity:.85">' + compteParCadence[k] + " séance" + (compteParCadence[k] === 1 ? "" : "s") + " couverte" + (compteParCadence[k] === 1 ? "" : "s") + "</span>"
        + "</button>").join("")
    + "</div>";
  const enteteReleveProp = '<div class="period-lab"><span>Relevé · ' + esc(CADENCES[cadenceSel].label.replace(/^chaque /i, "1 ")) + "</span>"
    + '<span class="bq-releve-range">' + esc(fmtDay(today)) + " → " + esc(fmtDay(new Date(Date.parse(today) + (CADENCES[cadenceSel].days - 1) * 86400000).toISOString().slice(0, 10))) + "</span></div>";
  const cadencePanel = '<div class="bq-cadence-panel">' + seg + releveHTML(detail, enteteReleveProp)
    + '<button type="button" class="bq-cta-scroll" id="shopScrollFlavor">Choisir ma saveur <span aria-hidden="true">→</span></button>'
    + '<div class="shop-fine">Le service de commande n’est pas encore actif : aucun paiement, aucune expédition. Prix estimé sur une référence générique.</div>'
    + "</div>";

  // ── LES RÉGLAGES (3b, réunis dans LA MÊME carte — smoke-shop §7 exige trois groupes de
  // choix exclusifs réunis, jamais un second écran). -------------------------------------
  const blocSaveur = '<div class="bq-block" id="bqFlavorBlock">'
    + '<div class="bq-block-head"><span class="bq-block-num zn-mono">2</span>'
    // GOÛT ET FORMAT : le choix se voyait, mais ne s'ENTENDAIT pas. Mesuré : 8 boutons, 0
    // `aria-pressed`, 0 `role="radio"` — la sélection n'était portée que par la classe `.sel`,
    // c'est-à-dire par de la couleur. `radiogroup` + `aria-checked` + `aria-labelledby` disent
    // les trois choses qui manquaient : que les choix s'excluent, lequel est pris, de quoi le
    // groupe parle.
    + '<span class="choice-lab" style="margin:0">Saveur</span><span class="bq-block-hint zn-mono">4 au lancement</span></div>'
    + choixHTML("Goût préféré", "flavor", FLAVOR_OPTIONS, flavorSel, (f) => sachetHTML(f, "vignette", 52))
    + "</div>";
  const blocFormat = '<div class="bq-block">'
    + '<div class="bq-block-head"><span class="bq-block-num zn-mono">3</span><span class="choice-lab" style="margin:0">Format et départ</span></div>'
    + choixHTML("Format préféré", "format", FORMAT_OPTIONS, formatSel)
    + '<ul class="zn-list" style="margin-top:6px">'
    + '<li class="zn-row">' + kvRowInline("1re période", esc(fmtDay(debutPeriode))) + "</li>"
    + '<li class="zn-row">' + kvRowInline("Prochaine échéance", esc(fmtDay(echeance))) + "</li>"
    + "</ul>"
    + "</div>";

  return '<div class="shop-card" id="shopCard">'
    + hero
    + sachetArgumentsHTML()
    + znSecHTML("Cadence d’envoi")
    + cadencePanel
    + blocSaveur
    + blocFormat
    // LA RÉSERVE QUI COMPTE PASSE AVANT LE BOUTON, PAS APRÈS (héritée de V1 : un fait qui
    // décide se lit avant qu'on s'engage, jamais en petits caractères après).
    + '<div class="soc-proof">Le service de commande n’est pas encore actif : <b>aucun paiement, aucune expédition</b>. Tu enregistres une intention, sur cet appareil.</div>'
    + '<button type="button" id="shopOk">' + cta + "</button>"
    + (abonneActif ? '<div class="btn-row" style="margin-top:9px"><button class="zn-btn-2" id="shopEditCancel" type="button">Annuler</button></div>' : "")
    // (La maquette affiche ici « 127 INTENTIONS DÉJÀ ENREGISTRÉES » avec trois avatars. Ce
    // chiffre n'existe pas : l'abonnement vit dans le `localStorage` de CHAQUE appareil, aucun
    // serveur n'en compte un seul. Fabriquer une preuve sociale est la ligne qu'on ne franchit
    // pas sur un produit dont le contre-positionnement est « chaque décision est traçable ».)
    + '<div class="shop-fine">Prix estimé sur une référence générique (gel de 30 g, boisson de 500 ml), remplacé par le vrai tarif dès qu’un fournisseur existe. Résiliable à chaque échéance, jamais engagé au-delà.</div>'
    + bonASavoirHTML()
    + "</div>";
}
/** Une ligne intitulé/valeur au format `.zn-row` (période / échéance) — plus dense que
 *  `.kv` (générique, partagée par d'autres sous-onglets d'Outils), et sans en dépendre. */
function kvRowInline(k, v) {
  return '<span style="font-size:var(--fs-sm);color:var(--zn-text)">' + esc(k) + '</span>'
    + '<span class="zn-mono" style="font-size:var(--fs-sm);font-weight:600;color:var(--zn-text);margin-left:auto">' + v + "</span>";
}

/**
 * UN GESTE SUR LA CARTE : on note le choix, ET on note que la carte est OUVERTE.
 *
 * LE DÉFAUT QUE CE POINT UNIQUE FERME — le tunnel était INFRANCHISSABLE. Mesuré, geste par
 * geste, sur un plan en cours dont l'ancre des 28 jours est échue :
 *
 *   1. j'ouvre Outils › Nutrition   → dépliée, 811 px, devis + bouton d'activation présents
 *   2. je clique « chaque mois »    → REPLIÉE, 190 px, plus de devis, plus de bouton
 *   3. je clique « citron »         → sans effet (le bouton n'existe plus)
 *   4. je clique « Activer »        → sans effet (le bouton n'existe plus)
 *
 * Il était donc IMPOSSIBLE de s'abonner par le chemin où le produit propose lui-même l'offre.
 * Les trois gestes écrivaient `lastPromptAt: today` — ce qui est juste, « une proposition qu'on
 * manipule est une proposition vue » — mais c'est le MÊME champ que lit `shopPromptDue` pour
 * décider si la carte s'ouvre d'elle-même. Au rendu suivant, `due` retombait à faux ; et
 * `shopExpanded`, la seule autre raison de rester ouverte, n'était posé QUE par le bouton
 * `#shopExpand`. La carte se refermait donc sur l'athlète au premier choix.
 *
 * Un geste qui détruit la raison pour laquelle la carte est ouverte doit poser l'autre raison :
 * on ne peut manipuler que ce qui est ouvert. Écrit UNE fois ici plutôt que dans chacun des
 * quatre gestionnaires (R11.1) — c'est l'oubli dans l'un d'eux qui a produit le défaut.
 */
function noterGesteCarte(patch, today, focus) {
  shopExpanded = true;
  shopFocus = focus || null;
  S.answers.shopSubscription = Object.assign({}, S.answers.shopSubscription || {}, patch, { lastPromptAt: today });
  ebSave();
}

/**
 * LE FOCUS SE PERDAIT À CHAQUE CHOIX. `renderTabNutrition` réécrit `#screen.innerHTML` en
 * entier : le bouton qu'on vient d'activer est DÉTRUIT, et le focus retombe sur `<body>`
 * (mesuré : `document.activeElement` = BODY après un clic sur la cadence). À la souris ça ne
 * se voit pas ; au clavier, on est renvoyé en haut du document à chaque choix, c'est-à-dire
 * qu'on ne peut pas enchaîner cadence → goût → format sans re-parcourir tout l'onglet.
 * On repose donc le focus sur le MÊME contrôle après reconstruction — jamais au premier rendu
 * (`shopFocus` est nul), pour ne pas voler le focus à quelqu'un qui arrive sur l'onglet.
 */
let shopFocus = null;
function rendreFocusCarte() {
  if (!shopFocus) return;
  const el = document.querySelector(shopFocus);
  shopFocus = null;
  if (el) el.focus({ preventScroll: true });
}

function bindShopSubscription(plan, today, rerender) {
  // Déplier la carte, c'est avoir vu la proposition : on repose l'ancre des 28 jours ici.
  // C'est le même signal que l'ancien `<details>` posait à l'ouverture — la carte se propose
  // d'elle-même, puis se tait, et c'est l'athlète qui la rouvre s'il veut.
  const exp = $("shopExpand");
  if (exp) exp.onclick = () => { noterGesteCarte({}, today); rerender(); };
  // Le segmenté remplace la liste déroulante : même effet (changer la cadence recalcule le
  // devis), même persistance.
  document.querySelectorAll("#shopCard [data-cadence]").forEach((b) => {
    b.onclick = () => {
      noterGesteCarte({ cadence: b.dataset.cadence }, today, '#shopCard [data-cadence="' + b.dataset.cadence + '"]');
      rerender();
    };
  });
  // « Choisir ma saveur → » (22c) fait défiler jusqu'au bloc « 2 · Saveur » — il ne soumet
  // rien : les trois groupes de choix restent réunis dans LA carte (smoke-shop §7), le seul
  // point de conversion reste `#shopOk` en bas.
  const scrollFlavor = $("shopScrollFlavor");
  if (scrollFlavor) scrollFlavor.onclick = () => {
    const b = $("bqFlavorBlock");
    const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (b) b.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
  };
  // Goût et format : un choix se pose et se voit tout de suite, il ne se valide pas deux fois.
  // La capsule du flacon change de couleur avec le goût — c'est le seul retour immédiat qu'on
  // puisse donner sur un produit qu'on ne peut pas encore montrer.
  for (const [attr, cle] of [["flavor", "flavor"], ["format", "format"]]) {
    document.querySelectorAll("#shopCard [data-" + attr + "]").forEach((b) => {
      b.onclick = () => {
        noterGesteCarte({ [cle]: b.dataset[attr] }, today, '#shopCard [data-' + attr + '="' + b.dataset[attr].replace(/"/g, '\\"') + '"]');
        rerender();
      };
    });
  }
  const ok = $("shopOk");
  if (ok) ok.onclick = async () => {
    const draft = S.answers.shopSubscription || {};
    const cadence = draft.cadence || "hebdo";
    const flavor = draft.flavor || FLAVOR_OPTIONS[0];
    const format = draft.format || FORMAT_OPTIONS[0];
    const v = subscriptionView(draft.startedAt ? draft : null, today);
    // Édition d'un abonnement en cours : on garde `startedAt` (et `cancelEffectiveAt` s'il
    // existe) — modifier goût/format/cadence ne relance ni ne défait une résiliation déjà
    // programmée. Nouvel abonnement ou reprise : nouveau départ, aujourd'hui.
    const sub = (v.status === "active" || v.status === "cancel_pending")
      ? Object.assign({}, draft, { cadence, flavor, format })
      : { startedAt: today, cadence, flavor, format, lastPromptAt: today };
    await submitOrder(sub); // stub — aucun réseau pour l'instant
    S.answers.shopSubscription = sub;
    shopEditing = false;
    shopConfirmCancel = false;
    ebSave();
    rerender();
  };
  const edit = $("shopEdit");
  if (edit) edit.onclick = () => { shopEditing = true; rerender(); };
  const editCancel = $("shopEditCancel");
  if (editCancel) editCancel.onclick = () => { shopEditing = false; rerender(); };
  // Résilier demande une confirmation EN PLACE (bandeau « Confirmer / Garder ») plutôt qu'un
  // `confirm()` natif : c'est la composition de la maquette, et c'est aussi ce que R23.3 a
  // retenu ailleurs dans le produit — une modale native est intestable et brutale.
  const ask = $("shopAskCancel");
  if (ask) ask.onclick = () => { shopConfirmCancel = true; rerender(); };
  // ⚠ POINT DE BRANCHEMENT DU PRESTATAIRE DE PAIEMENT — à remplacer, pas à garder tel quel.
  //
  // Le jour où un prestataire existe, ce clic doit ouvrir SON parcours de mise à jour de moyen
  // de paiement, et c'est le retour du prestataire (webhook ou retour d'appel) qui effacera
  // `paymentFailure`. En attendant, le bouton fait exactement ce que ferait un paiement réussi :
  // il efface la clé et re-rend. Ça rend l'état ATTEIGNABLE et TESTABLE de bout en bout — on
  // pose `paymentFailure` à la main, on voit la carte, on en sort — au lieu d'un écran mort que
  // personne ne pourra vérifier avant la mise en service.
  const fixPay = $("shopFixPayment");
  if (fixPay) fixPay.onclick = () => {
    const sub = S.answers.shopSubscription;
    if (!sub) return;
    S.answers.shopSubscription = Object.assign({}, sub, { paymentFailure: undefined });
    ebSave();
    rerender();
  };
  const keep = $("shopKeep");
  if (keep) keep.onclick = () => { shopConfirmCancel = false; rerender(); };
  const cancel = $("shopCancel");
  if (cancel) cancel.onclick = () => {
    const sub = S.answers.shopSubscription;
    const cad = CADENCES[sub.cadence] || CADENCES.hebdo;
    S.answers.shopSubscription = Object.assign({}, sub, { cancelEffectiveAt: nextEcheance(sub.startedAt, cad.days, today) });
    shopConfirmCancel = false;
    ebSave();
    rerender();
  };
  const uncancel = $("shopUncancel");
  if (uncancel) uncancel.onclick = () => {
    const sub = S.answers.shopSubscription;
    S.answers.shopSubscription = Object.assign({}, sub, { cancelEffectiveAt: undefined });
    ebSave();
    rerender();
  };
}

export function renderTabNutrition(plan) {
  const today = todayISO();
  let todayDay = null;
  plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date === today) todayDay = d; }));

  let html = '<div class="card"><div class="eyebrow">Outils · Nutrition</div>'
    + '<div class="zn-tab-title">Ton carburant, expliqué</div>'
    + '<div class="card-note">Des estimations issues des consensus publiés — jamais un régime, jamais une cible d’apport. Ce qui compte : manger assez pour t’entraîner.</div></div>';
  html += energyCardHTML(todayDay, true); // dépense théorique + macros indicatives, ouvert
  html += nutritionCardHTML(todayDay, null, true); // ravitaillement par séance (météo en différé)
  html += shopSubscriptionCardHTML(plan, today); // abonnement récurrent, anticipé
  $("screen").innerHTML = html;
  bindShopSubscription(plan, today, () => renderTabNutrition(plan));
  rendreFocusCarte();

  if (todayDay) fetchWeather().then((wx) => {
    const el = $("nutCard");
    if (!el || !wx || wx.tmaxC == null) return;
    const h = nutritionCardHTML(todayDay, wx.tmaxC, el.open);
    if (h) el.outerHTML = h;
  });
}
