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
  shopPromptDue, shopEndOfPlanPromptDue, submitOrder, CADENCES, FLAVOR_OPTIONS, FORMAT_OPTIONS,
} from "../shop-order.js";
import { planEndDate } from "./session-life.js";
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
/** Le flacon du produit — sa capsule prend la couleur du goût choisi. Décoratif, mais il
 *  donne un objet à regarder : une page de vente sans produit vend une abstraction. */
const FLAVOR_CAP = {
  "neutre": "#B4B9C0", "fruits rouges": "#FF4B6E", "citron": "#FFD23D",
  "cola": "#8B5A2B", "peu d'importance": "#FF7A3D",
};
function productTileHTML(flavor) {
  return '<div class="product-tile" aria-hidden="true"><div class="pt-cap" id="ptCap" style="background:'
    + (FLAVOR_CAP[flavor] || FLAVOR_CAP.neutre) + '"></div><div class="pt-body"></div></div>';
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
    if (x.gelUnits) parts.push(x.gelUnits + " × " + esc(x.gelName || "gel") + (x.gelName ? "" : " (30 g)"));
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

function shopSubscriptionCardHTML(plan, today) {
  const sub = S.answers.shopSubscription || null;
  const view = subscriptionView(sub, today);
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  const abonneActif = view.status === "active" || view.status === "cancel_pending";

  // ── ABONNEMENT EN COURS ────────────────────────────────────────────────────
  if (abonneActif && !shopEditing) {
    const cad = CADENCES[sub.cadence] || CADENCES.hebdo;
    const echeance = nextEcheance(sub.startedAt, cad.days, today);
    const detail = estimatePeriodDetail(plan, wkg, cad.days, today);
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
  if (!abonneActif && !estimateTotalNeed(plan, wkg, today) && !planOver) return "";
  const cadenceSel = (sub && sub.cadence) || "hebdo";
  const flavorSel = (sub && sub.flavor) || FLAVOR_OPTIONS[0];
  const formatSel = (sub && sub.format) || FORMAT_OPTIONS[0];
  const detail = estimatePeriodDetail(plan, wkg, CADENCES[cadenceSel].days, today);
  const echeance = nextEcheance(sub && sub.startedAt ? sub.startedAt : today, CADENCES[cadenceSel].days, today);
  const cles = Object.keys(CADENCES);
  const iSel = Math.max(0, cles.indexOf(cadenceSel));
  const titre = abonneActif ? "Modifier l’abonnement" : planOver ? "Rester accompagné(e)" : "S’abonner au ravitaillement";
  const cta = abonneActif ? "Enregistrer les modifications"
    : (view.status === "cancelled" ? "Reprendre l’abonnement" : "Activer — 1er envoi le " + esc(fmtDay(echeance)));

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

  return '<div class="shop-card" id="shopCard">'
    + enTete
    + TRUST_ROW
    // Le sélecteur de cadence est un SEGMENTÉ, pas une liste déroulante : deux choix
    // mutuellement exclusifs qu'on compare se montrent côte à côte. La pastille glisse d'un
    // côté à l'autre — c'est ce mouvement qui dit « tu changes de régime », pas un menu.
    + '<div class="seg" id="cadSeg" role="tablist" aria-label="Cadence d’envoi">'
    + '<div class="seg-pill" style="left:calc(' + (iSel * 50) + '% + 3px)"></div>'
    + cles.map((k, i) => '<button type="button" role="tab" class="seg-opt' + (i === iSel ? " active" : "") + '" data-cadence="' + k + '" aria-selected="' + (i === iSel) + '">'
        + '<span class="so-l">' + esc(CADENCES[k].label) + '</span><span class="so-s">' + (CADENCES[k].days > 7 ? "envoi le 1er" : "envoi le samedi") + "</span></button>").join("")
    + "</div>"
    + '<div class="period-lab">D’après ce que tes séances affichent déjà, ta prochaine période :</div>'
    + (detail && detail.sessions.length
        ? periodLinesHTML(detail) + periodTotalHTML(detail)
        : '<div class="load-sub">Ce plan-ci n’a plus de séance à venir — le premier envoi s’ajustera à ton prochain plan ou à tes sorties libres.</div>')
    + '<div class="choice-lab">Goût préféré</div><div class="choice-row">'
    + FLAVOR_OPTIONS.map((f) => '<button type="button" class="choice' + (f === flavorSel ? " sel" : "") + '" data-flavor="' + esc(f) + '">' + esc(f) + "</button>").join("")
    + "</div>"
    + '<div class="choice-lab">Format préféré</div><div class="choice-row">'
    + FORMAT_OPTIONS.map((f) => '<button type="button" class="choice' + (f === formatSel ? " sel" : "") + '" data-format="' + esc(f) + '">' + esc(f) + "</button>").join("")
    + "</div>"
    + '<button type="button" class="shop-cta" id="shopOk">' + cta + "</button>"
    + (abonneActif ? '<div class="btn-row" style="margin-top:9px"><button class="btn" id="shopEditCancel" type="button">Annuler</button></div>' : "")
    // LA MAQUETTE AFFICHE ICI « 127 INTENTIONS DÉJÀ ENREGISTRÉES » AVEC TROIS AVATARS.
    // Ce chiffre n'existe pas : l'abonnement est stocké dans le `localStorage` de CHAQUE
    // appareil, il n'y a aucun serveur pour en compter un seul. Afficher une preuve sociale
    // fabriquée serait un mensonge commercial — et sur un produit dont le contre-positionnement
    // est « chaque décision est traçable », c'est la ligne qu'on ne franchit pas. Le créneau de
    // la maquette est gardé ; il dit ce qui est vrai.
    // Ma première écriture disait « …et te vaudra d'être prévenu·e à l'ouverture ». C'est une
    // promesse que le produit ne peut pas tenir : il n'y a ni compte, ni serveur, ni canal de
    // notification (CLAUDE.md : « pas de push app fermée sans backend »). Remplacer un chiffre
    // inventé par une promesse invérifiable, c'est refaire le défaut qu'on venait de corriger.
    + '<div class="soc-proof">Service en préparation — ton choix reste sur cet appareil, rien n’est envoyé nulle part.</div>'
    // Le prix est ESTIMÉ sur une référence générique. Le taire ferait lire les « 22,80 € »
    // comme un tarif ferme — c'est la phrase que l'ancienne carte portait, et l'omettre en
    // reprenant la composition aurait renforcé une promesse au lieu de la porter.
    + '<div class="shop-fine">Prix estimé sur une référence générique (30 g de glucides par gel, 500 ml par boisson) — remplacé par le vrai tarif dès qu’un fournisseur existe. '
    + "Aucun paiement, aucune expédition pour l’instant : le service de commande n’est pas encore actif. "
    + "Intention enregistrée sur cet appareil, résiliable à chaque échéance.</div>"
    + "</div>";
}

function bindShopSubscription(plan, today, rerender) {
  // Déplier la carte, c'est avoir vu la proposition : on repose l'ancre des 28 jours ici.
  // C'est le même signal que l'ancien `<details>` posait à l'ouverture — la carte se propose
  // d'elle-même, puis se tait, et c'est l'athlète qui la rouvre s'il veut.
  const exp = $("shopExpand");
  if (exp) exp.onclick = () => {
    shopExpanded = true;
    S.answers.shopSubscription = Object.assign({}, S.answers.shopSubscription || {}, { lastPromptAt: today });
    ebSave();
    rerender();
  };
  // Le segmenté remplace la liste déroulante : même effet (changer la cadence recalcule le
  // devis), même persistance. `lastPromptAt` est reposé à chaque geste sur la carte — une
  // proposition qu'on manipule est une proposition vue.
  document.querySelectorAll("#shopCard [data-cadence]").forEach((b) => {
    b.onclick = () => {
      S.answers.shopSubscription = Object.assign({}, S.answers.shopSubscription || {}, { cadence: b.dataset.cadence, lastPromptAt: today });
      ebSave();
      rerender();
    };
  });
  // Goût et format : un choix se pose et se voit tout de suite, il ne se valide pas deux fois.
  // La capsule du flacon change de couleur avec le goût — c'est le seul retour immédiat qu'on
  // puisse donner sur un produit qu'on ne peut pas encore montrer.
  for (const [attr, cle] of [["flavor", "flavor"], ["format", "format"]]) {
    document.querySelectorAll("#shopCard [data-" + attr + "]").forEach((b) => {
      b.onclick = () => {
        S.answers.shopSubscription = Object.assign({}, S.answers.shopSubscription || {}, { [cle]: b.dataset[attr], lastPromptAt: today });
        ebSave();
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

  if (todayDay) fetchWeather().then((wx) => {
    const el = $("nutCard");
    if (!el || !wx || wx.tmaxC == null) return;
    const h = nutritionCardHTML(todayDay, wx.tmaxC, el.open);
    if (h) el.outerHTML = h;
  });
}
