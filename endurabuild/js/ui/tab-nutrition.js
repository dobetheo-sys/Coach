// Onglet 🥗 Nutrition (retour utilisateur R5) — tout ce qui touche à l'assiette au même
// endroit : dépense théorique du jour (base + entraînement, N8–N9), répartition
// INDICATIVE des macros selon le profil et les séances (N10), ravitaillement d'effort de
// chaque séance (N1–N7, météo comprise), journal alimentaire (Open Food Facts + CSV MFP).
// La frontière ne bouge pas : des ESTIMATIONS et des photographies de consensus — jamais
// une cible d'apport, jamais un menu ; l'avertissement du moteur est TOUJOURS affiché.
import { S, $, esc, ebSave, todayISO, fmtDay } from "../state.js";
import { fetchWeather } from "./readiness.js";
import {
  estimateTotalNeed, estimatePeriodDetail, nextEcheance, subscriptionView,
  shopPromptDue, shopEndOfPlanPromptDue, submitOrder, CADENCES, FLAVOR_OPTIONS, FORMAT_OPTIONS, venteAutorisee,
} from "../shop-order.js";
import { planEndDate } from "./session-life.js";
import { sachetHTML, ATOUTS_GEL } from "./sachet.js";
import { GEL_ZENNA } from "../shop-catalog.js";
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
function productTileHTML(flavor) {
  const s = sachetHTML(flavor, "grand", 58);
  return s ? '<div class="product-tile">' + s + "</div>" : "";
}
/** Les trois promesses tenables — reprises de la maquette, formulées sur ce que le service
 *  fait RÉELLEMENT (livré avant la période, résiliable à l'échéance, calé sur le plan). */
const TRUST_ROW = '<div class="trust-row">'
  + '<div class="trust"><svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6h9v8H2zM11 9h4l3 3v2h-7z"/><circle cx="5.5" cy="16" r="1.6"/><circle cx="14.5" cy="16" r="1.6"/></svg><span>Livré avant<br>la période</span></div>'
  + '<div class="trust"><svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M7 11l2 2 4-4.5"/></svg><span>Résiliable à<br>chaque échéance</span></div>'
  + '<div class="trust"><svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4v4h-4M4 16v-4h4"/><path d="M16 8a6.5 6.5 0 0 0-11.5-2.5M4 12a6.5 6.5 0 0 0 11.5 2.5"/></svg><span>Calé sur<br>ton plan</span></div>'
  + "</div>";
const eur = (n) => n.toFixed(2).replace(".", ",") + " €";

/** Le devis de la période : une ligne par séance, puis le total. C'est la pièce centrale de la
 *  maquette — elle montre D'OÙ vient le chiffre, séance par séance, au lieu d'annoncer un prix.
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

  // ── ABONNEMENT EN COURS ────────────────────────────────────────────────────
  if (abonneActif && !shopEditing) {
    const cad = CADENCES[sub.cadence] || CADENCES.hebdo;
    const echeance = nextEcheance(sub.startedAt, cad.days, today);
    const detail = estimatePeriodDetail(plan, wkg, cad.days, today, S.sport);
    return '<div class="shop-card" id="shopCard">'
      + '<div class="sub-active-head">'
      + '<div class="sub-badge" aria-hidden="true">🛒</div>'
      + '<div style="flex:1;min-width:0"><div class="sub-state">Abonnement actif</div>'
      + '<div class="sub-params">' + esc(cad.label) + " · " + esc(sub.flavor) + " · " + esc(sub.format) + "</div></div>"
      + productTileHTML(sub.flavor)
      + "</div>"
      + '<div class="period-lab">Prochain envoi — livré avant le début de la période</div>'
      + periodLinesHTML(detail) + periodTotalHTML(detail)
      + kvHTML("Prochaine échéance", esc(fmtDay(echeance)), "cy")
      + (view.status === "cancel_pending"
          ? '<div class="cancel-note">⚠ Résiliation prévue le ' + esc(fmtDay(view.until)) + " — le prochain envoi a lieu, rien après.</div>"
          : "")
      + (shopConfirmCancel
          ? '<div class="confirm-strip"><span>Résilier à l’échéance ?</span><div style="display:flex;gap:7px">'
            + '<button class="btn" id="shopCancel" type="button">Confirmer</button>'
            + '<button class="btn gold" id="shopKeep" type="button">Garder</button></div></div>'
          : '<div class="btn-row" style="margin-top:13px">'
            + '<button class="btn" id="shopEdit" type="button">Modifier</button>'
            + (view.status === "cancel_pending"
                ? '<button class="btn gold" id="shopUncancel" type="button">Continuer quand même</button>'
                : '<button class="btn" id="shopAskCancel" type="button">Résilier</button>')
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

  // Les arguments du produit, tels que les maquettes les portent — vérifiables sur le sachet
  // (une composition, un poids, une origine) et jamais un effet promis à l'athlète.
  const atouts = '<div class="gel-facts">' + ATOUTS_GEL
    .map((a) => '<div class="gel-fact"><b>' + esc(a.t) + "</b><span>" + esc(a.d) + "</span></div>").join("")
    + "</div>";
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

  return '<div class="shop-card" id="shopCard">'
    + enTete
    + atouts
    + TRUST_ROW
    // Le sélecteur de cadence est un SEGMENTÉ, pas une liste déroulante : deux choix
    // mutuellement exclusifs qu'on compare se montrent côte à côte. La pastille glisse d'un
    // côté à l'autre — c'est ce mouvement qui dit « tu changes de régime », pas un menu.
    // `role="tablist"` PROMETTAIT DES ONGLETS QUI N'EXISTENT PAS. Un tablist annonce à son
    // lecteur qu'il pilote des `tabpanel` et qu'il se parcourt aux FLÈCHES ; mesuré, la carte
    // n'en contient aucun (0 `role="tabpanel"`) et rien n'écoute les flèches. Deux choix
    // mutuellement exclusifs qui ne révèlent pas de panneau, c'est un groupe de BOUTONS RADIO —
    // et ce rôle-là porte l'information qui manquait vraiment : lequel est choisi (`aria-checked`).
    + '<div class="seg" id="cadSeg" role="radiogroup" aria-label="Cadence d’envoi">'
    + '<div class="seg-pill" style="left:calc(' + (iSel * 50) + '% + 3px)"></div>'
    // LE SOUS-TITRE DISAIT UN JOUR FIXE, ET C'ÉTAIT FAUX. Il annonçait « envoi le samedi » et
    // « envoi le 1er » — deux promesses qu'aucun calcul ne tient : `nextEcheance` compte des
    // MULTIPLES DE LA CADENCE depuis `startedAt`, donc l'envoi tombe le jour où l'on s'est
    // abonné. Mesuré sur les sept jours : abonné un lundi → échéance un lundi, un mardi → un
    // mardi… « samedi » n'est vrai que pour qui s'abonne un samedi, soit 1 cas sur 7. Et le
    // mensuel vaut 30 JOURS FIXES, pas un mois : abonné le 01/08, les échéances tombent les
    // 31, 30, 30 — « le 1er » n'arrive jamais. Le sous-titre dit désormais ce que le code fait,
    // ce qui a le mérite d'expliquer aussi pourquoi « chaque mois » n'est pas un quantième.
    + cles.map((k, i) => '<button type="button" role="radio" class="seg-opt' + (i === iSel ? " active" : "") + '" data-cadence="' + k + '" aria-checked="' + (i === iSel) + '">'
        + '<span class="so-l">' + esc(CADENCES[k].label) + '</span><span class="so-s">tous les ' + CADENCES[k].days + " jours</span></button>").join("")
    + "</div>"
    + '<div class="period-lab">D’après ce que tes séances affichent déjà, ta prochaine période :</div>'
    + (detail && detail.sessions.length
        ? periodLinesHTML(detail) + periodTotalHTML(detail)
        : '<div class="load-sub">Ce plan-ci n’a plus de séance à venir — le premier envoi s’ajustera à ton prochain plan ou à tes sorties libres.</div>')
    // GOÛT ET FORMAT : le choix se voyait, mais ne s'ENTENDAIT pas. Mesuré : 8 boutons, 0
    // `aria-pressed`, 0 `role="radio"` — la sélection n'était portée que par la classe `.sel`,
    // c'est-à-dire par de la couleur. Un lecteur d'écran annonçait huit boutons identiques sans
    // dire lequel est actif, et le libellé du groupe (« Goût préféré ») n'était relié à rien.
    // `radiogroup` + `aria-checked` + `aria-labelledby` disent les trois choses qui manquaient :
    // que les choix s'excluent, lequel est pris, et de quoi le groupe parle.
    + choixHTML("Goût préféré", "flavor", FLAVOR_OPTIONS, flavorSel, (f) => sachetHTML(f, "vignette", 24))
    + choixHTML("Format préféré", "format", FORMAT_OPTIONS, formatSel)
    // LA RÉSERVE QUI COMPTE PASSE AVANT LE BOUTON, PAS APRÈS.
    //
    // Elle vivait sous le bouton, diluée dans 313 caractères de mention légale — le bloc le
    // plus DENSE de toute l'app (3,63 car./px de hauteur rendue ; le pire relevé de l'audit
    // par onglet était 3,00). Et elle était dite DEUX FOIS, dans deux paragraphes voisins de
    // style identique (9 px, même gris, même interligne) : « rien n'est envoyé nulle part » /
    // « aucune expédition », « reste sur cet appareil » / « intention enregistrée sur cet
    // appareil ». Un fait répété dans deux blocs indistinguables se lit moins bien qu'une fois
    // au bon endroit.
    //
    // Ce fait-là — le service n'existe pas encore — est celui qui décide. Il se lit donc AVANT
    // qu'on s'engage, pas en petits caractères après. C'est la même règle que la carte applique
    // déjà à la preuve sociale : on ne remplace pas un chiffre inventé par une promesse
    // invérifiable, et une promesse qu'on ne peut pas tenir ne se met pas sous le bouton.
    // Le créneau `.soc-proof` de la maquette est CONSERVÉ (il porte la décision « ce qui est
    // vrai à la place d'une preuve fabriquée ») ; il change seulement de place.
    + '<div class="soc-proof">Le service de commande n’est pas encore actif : <b>aucun paiement, aucune expédition</b>. Tu enregistres une intention, sur cet appareil.</div>'
    + '<button type="button" class="shop-cta" id="shopOk">' + cta + "</button>"
    + (abonneActif ? '<div class="btn-row" style="margin-top:9px"><button class="btn" id="shopEditCancel" type="button">Annuler</button></div>' : "")
    // (La maquette affiche ici « 127 INTENTIONS DÉJÀ ENREGISTRÉES » avec trois avatars. Ce
    // chiffre n'existe pas : l'abonnement vit dans le `localStorage` de CHAQUE appareil, aucun
    // serveur n'en compte un seul. Fabriquer une preuve sociale est la ligne qu'on ne franchit
    // pas sur un produit dont le contre-positionnement est « chaque décision est traçable ».)
    //
    // Ce qui reste ici est la SEULE réserve qui n'a pas besoin d'être lue avant de cliquer :
    // le prix est un ordre de grandeur, et l'engagement est réversible. Le taire ferait lire
    // les « 68,10 € » comme un tarif ferme.
    + '<div class="shop-fine">Prix estimé sur une référence générique (gel de 30 g, boisson de 500 ml), remplacé par le vrai tarif dès qu’un fournisseur existe. Résiliable à chaque échéance, jamais engagé au-delà.</div>'
    + "</div>";
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
