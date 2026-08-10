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
    return '<details class="load-card"' + (open ? " open" : "") + '><summary class="load-title">🔥 Dépense estimée du jour</summary>'
      + '<div class="load-sub" style="margin-top:6px">'
      + (motif || "Renseigne ton <b>poids</b> dans l’onglet 📋 Profil pour voir l’estimation (taille, âge et sexe l’affinent). Aucune estimation sans donnée réelle.")
      + "</div></details>";
  }
  const f = (r) => r[0] === r[1] ? r[0] : r[0] + "–" + r[1];
  return '<details class="load-card"' + (open ? " open" : "") + '><summary class="load-title">🔥 Dépense estimée du jour <span style="font-weight:400">· ~' + f(e.total) + " kcal</span></summary>"
    + '<div style="font-size:var(--fs-sm);margin-top:8px">'
    + "<b>Base + vie quotidienne :</b> ~" + f(e.daily) + " kcal (métabolisme de base ~" + f(e.bmr) + ")<br>"
    + "<b>Entraînement du jour :</b> " + (e.training[1] ? "~" + f(e.training) + " kcal" : "repos — 0 kcal d’entraînement")
    // N11 — le repos de ces heures-là est déjà dans la ligne du dessus : on le retire, et on
    // le DIT. Retranché en silence, le total ne tomberait pas juste et la carte deviendrait
    // suspecte ; affiché, il explique au passage ce qu'est un MET.
    + (e.restOverlap > 0 ? '<br><span style="color:var(--muted)">− ' + e.restOverlap + " kcal : le repos de ces heures-là est déjà compté dans ta journée (un MET, c'est le repos)</span>" : "")
    + "<br><b>Total :</b> ~" + f(e.total) + " kcal"
    + (e.approximate ? '<br><span style="color:var(--gold)">Fourchette large : complète taille/âge au 📋 Profil pour l’affiner.</span>' : "")
    + "</div>"
    // R16.6 — une ligne par macro plutôt qu'un paragraphe de six lignes enchaînées.
    + '<div style="font-size:var(--fs-sm);margin-top:8px;color:var(--text2)">'
    + (e.macros.lines || []).map((l) => '<div style="margin:3px 0">• ' + l + "</div>").join("")
    + '<div style="margin-top:6px;color:var(--muted)">C’est une photographie de la littérature, pas un menu ni une consigne.</div>'
    + "</div>"
    + '<div class="load-sub" style="margin-top:8px">' + e.disclaimer + "</div></details>";
}

// Ravitaillement d'effort par séance (N1–N7) — la température arrive en différé.
//
// 07/08/2026 — le chip « achat immédiat » posé sur la séance du jour est RETIRÉ (décision
// utilisateur) : personne ne peut être livré le jour même, un lien de vente ici n'avait pas
// de sens. Le canal de vente réel vit désormais dans `shopSubscriptionCardHTML` — un
// abonnement récurrent, anticipé, pas un achat au coup par coup sur une séance passée.
export function nutritionCardHTML(day, tempC) {
  if (!day || !globalThis.EBV2 || !globalThis.EBV2.sessionNutrition) return "";
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  const advs = day.sessions
    .map((s) => ({ s, a: globalThis.EBV2.sessionNutrition(s, { tempC: tempC == null ? null : tempC, weightKg: wkg }) }))
    .filter((x) => x.a);
  if (!advs.length) return "";
  // Retour utilisateur (08/08/2026) : le résumé visible SANS ouvrir la carte n'affichait que la
  // météo — l'info qui compte (combien de glucides, combien boire) restait cachée un niveau plus
  // bas, dans le <summary> de CHAQUE séance. Reprise ici telle quelle (jamais une cible
  // inventée : même chiffre que ce que chaque séance affiche déjà, juste agrégé), la météo
  // reste affichée à la suite — elle affine, elle ne remplace pas.
  const carbSessions = advs.filter((x) => x.a.during.carbsGPerH);
  const hydrated = advs.filter((x) => x.a.during.drinkMlPerH[0] > 0);
  const drinkResume = hydrated.length
    ? Math.min(...hydrated.map((x) => x.a.during.drinkMlPerH[0])) + "–" + Math.max(...hydrated.map((x) => x.a.during.drinkMlPerH[1])) + " ml/h"
    : "eau à la soif";
  const resume = carbSessions.length
    ? Math.min(...carbSessions.map((x) => x.a.during.carbsGPerH[0])) + "–" + Math.max(...carbSessions.map((x) => x.a.during.carbsGPerH[1])) + " g/h de glucides, " + drinkResume
    : drinkResume;
  let h = '<div class="load-card" id="nutCard"><div class="load-title">🥤 Ravitaillement d’aujourd’hui'
    + ' <span style="font-weight:400">· ' + resume + (tempC != null ? " · " + Math.round(tempC) + "°C" : "") + "</span></div>";
  advs.forEach(({ s, a }) => {
    const drinkSummary = a.during.drinkMlPerH[0] === 0
      ? "eau à la soif"
      : a.during.drinkMlPerH[0] + "–" + a.during.drinkMlPerH[1] + " ml/h" + (a.during.sodium ? " + sodium" : "");
    h += '<details style="margin-top:6px;font-size:var(--fs-sm)"><summary style="cursor:pointer"><b>' + s.name + "</b> — "
      + (a.during.carbsGPerH ? a.during.carbsGPerH[0] + "–" + a.during.carbsGPerH[1] + " g/h de glucides, " + drinkSummary : drinkSummary) + "</summary>"
      + '<div style="margin:6px 0 0 2px;color:var(--text2)"><b>Avant :</b> ' + a.before
      + "<br><b>Pendant :</b> " + a.during.text
      + (a.after ? "<br><b>Après :</b> " + a.after : "")
      + '<br><span style="color:var(--muted)">Dépense estimée ~' + a.kcal[0] + "–" + a.kcal[1] + " kcal" + (wkg ? "" : " (renseigne ton poids dans 📋 Profil pour affiner)") + ".</span></div></details>";
  });
  h += '<div class="load-sub" style="margin-top:8px">' + advs[0].a.disclaimer + "</div></div>";
  return h;
}

// Abonnement de ravitaillement, RÉCURRENT (07/08/2026) — chaque semaine ou chaque mois, un
// envoi couvre la période à VENIR (livré en avance, jamais le jour même), résiliable
// uniquement à l'échéance (jamais en cours de période — rien n'est facturé pour le
// promettre autrement). État UI pur (repli formulaire) — jamais persisté, une nouvelle
// vue à chaque ouverture d'onglet comme le reste de ce module.
let shopEditing = false;
// R25.4 — résiliation en DEUX temps (bandeau Confirmer/Garder) : un clic sur « Résilier »
// ne résilie plus, il ouvre ce bandeau. État UI pur, comme `shopEditing` ci-dessus.
let shopConfirmingCancel = false;

// R25.4 — capsule du produit colorée par le goût choisi (FLAVOR_OPTIONS, shop-order.js).
// Purement décoratif (aucune donnée n'en dépend) : couleurs proches de la maquette, sur
// les VRAIS libellés de l'app plutôt que sa liste MAJUSCULE.
const FLAVOR_CAP = {
  "neutre": "#B4B9C0", "fruits rouges": "#FF4B6E", "citron": "#FFD23D",
  "cola": "#8B5A2B", "peu d'importance": "#FF7A3D",
};
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Détail séance par séance en UNITÉS de produit (gels, boissons), stagger `.period-line` —
 *  le nom du produit et son prix viennent de CATALOG dès qu'un vrai fournisseur existe pour
 *  la catégorie (REFERENCE_PRODUCTS.gel.unitPriceEUR sert de repli tant que non). */
function periodLinesHTML(detail) {
  const ligne = (s, i) => {
    const parts = [];
    if (s.gelUnits) parts.push(s.gelUnits + " × " + esc(s.gelName || "gel") + (s.gelName ? "" : " (30 g)"));
    if (s.drinkUnits) parts.push(s.drinkUnits + " × boisson (500 ml)");
    return '<div class="period-line" style="animation:eb-rise .26s var(--ease-enter,ease) backwards;animation-delay:' + (i * 60) + 'ms"><span class="pl-n">' + esc(s.name) + '</span><span class="pl-q">' + parts.join(" + ") + "</span></div>";
  };
  return detail.sessions.map(ligne).join("");
}
function periodTotalHTML(detail) {
  const t = detail.totals;
  const totalParts = [];
  if (t.gelUnits) totalParts.push(t.gelUnits + " gel" + (t.gelUnits > 1 ? "s" : ""));
  if (t.drinkUnits) totalParts.push(t.drinkUnits + " boisson" + (t.drinkUnits > 1 ? "s" : ""));
  return '<div class="period-total"><span class="pt-lab">' + esc(totalParts.join(" + ")) + '</span><span class="pt-val">~' + t.priceEUR.toFixed(2).replace(".", ",") + " €</span></div>";
}
// R25.4 — « prix par séance couverte » (brief) : dérivé du MÊME détail, pas une seconde
// estimation. `detail.sessions` ne contient déjà que les séances à unités > 0
// (estimatePeriodDetail les filtre), donc leur nombre EST le compte de séances couvertes.
function perSessionHTML(detail) {
  if (!detail.sessions.length) return "";
  const eur = (detail.totals.priceEUR / detail.sessions.length).toFixed(2).replace(".", ",");
  return '<div class="per-session">Soit ≈ <b>' + eur + " € / séance couverte</b></div>";
}
function productTileHTML(flavor) {
  return '<div class="product-tile" title="Gel — goût ' + esc(flavor) + '" aria-hidden="true">'
    + '<div class="pt-cap" style="background:' + (FLAVOR_CAP[flavor] || FLAVOR_CAP.neutre) + '"></div>'
    + '<div class="pt-body"></div></div>';
}
// Trois engagements REPRIS mot pour mot de la copie déjà écrite plus bas dans ce fichier
// (fine print + phrase d'intro) — aucune promesse nouvelle, une forme en plus (brief §R25.4).
function trustRowHTML() {
  return '<div class="trust-row">'
    + '<div class="trust">Livré avant<br>le début de la période</div>'
    + '<div class="trust">Résiliable à<br>chaque échéance</div>'
    + '<div class="trust">Calé sur ce que<br>tes séances affichent</div>'
    + "</div>";
}
function choiceRowHTML(label, options, selected, key) {
  return '<div class="choice-lab">' + esc(label) + '</div><div class="choice-row" data-choice-group="' + key + '">'
    + options.map((o) => '<button type="button" class="choice" data-choice-val="' + esc(o) + '" aria-pressed="' + (o === selected) + '">' + esc(cap1(o)) + "</button>").join("")
    + "</div>";
}
// Pilule glissante sur les VRAIES options de CADENCES — le sous-libellé est la date réelle
// du prochain envoi POUR CETTE cadence (nextEcheance), pas un jour de semaine inventé.
function segCadenceHTML(cadenceSel, today) {
  const keys = Object.keys(CADENCES);
  return '<div class="seg" id="shopCadSeg">'
    + '<div class="seg-pill" id="shopSegPill" style="left:' + (cadenceSel === keys[0] ? "3px" : "calc(50% + 0px)") + '"></div>'
    + keys.map((k) => '<button type="button" class="seg-opt" data-cadence="' + k + '" aria-pressed="' + (k === cadenceSel) + '">'
        + '<span class="so-l">' + esc(cap1(CADENCES[k].label)) + '</span>'
        + '<span class="so-s">envoi le ' + fmtDay(nextEcheance(today, CADENCES[k].days, today)) + "</span></button>").join("")
    + "</div>";
}

function shopSubscriptionCardHTML(plan, today) {
  const sub = S.answers.shopSubscription || null;
  const view = subscriptionView(sub, today);
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  const abonneActif = view.status === "active" || view.status === "cancel_pending";

  if (abonneActif && !shopEditing) {
    const cad = CADENCES[sub.cadence] || CADENCES.hebdo;
    const echeance = nextEcheance(sub.startedAt, cad.days, today);
    const detail = estimatePeriodDetail(plan, wkg, cad.days, today);
    return '<div class="load-card shop-card" id="shopCard"><div class="shop-tag">Canal de vente · abonnement actif</div><div class="load-title">🛒 Abonnement ravitaillement</div>'
      + '<div class="sub-active-head"><div class="sub-badge" aria-hidden="true">🛒</div>'
      + '<div style="flex:1;min-width:0"><div class="sub-params">' + esc(cap1(cad.label)) + " · " + esc(cap1(sub.flavor)) + " · " + esc(cap1(sub.format)) + "</div></div>"
      + productTileHTML(sub.flavor) + "</div>"
      // Reformulé le 08/08/2026 (audit produit) : jamais une cible à couvrir, une PHOTOGRAPHIE
      // de ce que chaque séance affiche déjà (nutritionCardHTML), traduite en produits à
      // prévoir — même principe que la reformulation qui suit dans ce fichier.
      + '<div class="period-lab">Prochain envoi — livré avant le début de la période</div>'
      + (detail
          ? periodLinesHTML(detail) + periodTotalHTML(detail) + perSessionHTML(detail)
          : '<div class="load-sub">Rien à couvrir sur la période qui vient — le prochain envoi s’ajustera aux semaines qui en ont besoin.</div>')
      + '<div class="load-sub" style="margin-top:8px">Prochaine échéance : <b>' + fmtDay(echeance) + "</b></div>"
      + (view.status === "cancel_pending"
          ? '<div class="cancel-note">⚠ Résiliation prévue le ' + fmtDay(view.until) + " — le prochain envoi a lieu, rien après.</div>"
          : "")
      + (shopConfirmingCancel
          ? '<div class="confirm-strip"><span>Résilier à l’échéance ?</span><div style="display:flex;gap:7px"><button class="btn" id="shopCancelConfirm" type="button" style="border-color:var(--z5);color:var(--z5)">Confirmer</button><button class="btn gold" id="shopCancelKeep" type="button">Garder</button></div></div>'
          : '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'
            + '<button class="btn" id="shopEdit" type="button">Modifier</button>'
            + (view.status === "cancel_pending"
                ? '<button class="btn" id="shopUncancel" type="button">Continuer quand même</button>'
                : '<button class="btn" id="shopCancel" type="button">Résilier</button>')
            + "</div>")
      + '<div class="shop-fine">Le service de commande n’est pas encore actif — cet abonnement reste une intention enregistrée sur cet appareil, on te préviendra dès qu’il le sera.</div></div>';
  }

  // Formulaire : première proposition (aucun abonnement), reprise après résiliation, ou
  // édition d'un abonnement en cours.
  //
  // Retour utilisateur (08/08/2026) : « suggérer à l'athlète d'être accompagné avec nos
  // gels dès la fin du plan ». `estimateTotalNeed` ne trouve plus rien à chiffrer une fois
  // le plan terminé (plus aucune séance future) — c'est exactement le moment où la carte
  // disparaissait, alors que c'est celui où la question a un sens. `planOver` la maintient
  // visible (même signal de date que le bandeau d'affûtage/jour J, `planEndDate`, R11.1).
  const endDate = planEndDate(plan, S.answers);
  const planOver = !!endDate && today >= endDate;
  if (!abonneActif && !estimateTotalNeed(plan, wkg, today) && !planOver) return ""; // rien nulle part dans le plan, et le plan n'est pas fini
  const due = !abonneActif && (shopPromptDue(sub, S.answers.plan_start, today) || shopEndOfPlanPromptDue(sub, endDate, today));
  const cadenceSel = (sub && sub.cadence) || "hebdo";
  const flavorSel = (sub && sub.flavor) || FLAVOR_OPTIONS[0];
  const formatSel = (sub && sub.format) || FORMAT_OPTIONS[0];
  const periodDetail = estimatePeriodDetail(plan, wkg, CADENCES[cadenceSel].days, today);
  // R25.4 — CTA daté : la date affichée EST celle que `ok.onclick` posera comme `startedAt`
  // en cas d'activation/reprise (aujourd'hui), donc la même horloge que `nextEcheance` lit
  // partout ailleurs (R11.1) — jamais une deuxième date approximative.
  const nextShip = fmtDay(nextEcheance(today, CADENCES[cadenceSel].days, today));
  const submitLabel = abonneActif ? "Enregistrer les modifications"
    : (view.status === "cancelled" ? "Reprendre — 1er envoi le " + nextShip : "Activer — 1er envoi le " + nextShip);
  return '<details class="load-card shop-card" id="shopCard"' + (due ? " open" : "") + '>'
    + '<summary class="load-title" style="cursor:pointer">🛒 ' + (abonneActif ? "Modifier l’abonnement" : planOver ? "Rester accompagné(e) avec nos gels" : "S’abonner au ravitaillement") + '</summary>'
    + '<div class="load-sub" style="margin-top:6px">' + (planOver && !abonneActif
        ? "Ta préparation touche à sa fin — si tu continues à t’entraîner, tu peux rester accompagné(e), à la cadence de ton choix."
        : "Reçois tes gels à l’avance, à la cadence de ton choix — jamais le jour même, jamais en retard sur une séance.") + "</div>"
    + (abonneActif ? "" : trustRowHTML())
    + segCadenceHTML(cadenceSel, today)
    // Audit 08/08/2026 : « ta préparation demande environ X g » frôlait la cible d'apport que
    // CLAUDE.md interdit tant qu'aucun diététicien n'a validé le module. Même principe ici,
    // appliqué au détail en unités : la carte reste une PHOTOGRAPHIE de ce que chaque séance
    // affiche déjà (nutritionCardHTML), traduite en produits à prévoir — jamais une cible
    // personnelle à couvrir.
    + '<div class="period-lab">D’après ce que tes séances affichent déjà, ta prochaine période :</div>'
    + '<div id="shopPeriodLines">' + (periodDetail ? periodLinesHTML(periodDetail) : "") + "</div>"
    + '<div id="shopPeriodTotal">' + (periodDetail ? periodTotalHTML(periodDetail) : "") + "</div>"
    + '<div id="shopPerSession">' + (periodDetail ? perSessionHTML(periodDetail) : "") + "</div>"
    + (!periodDetail
        ? '<div class="load-sub" id="shopPeriodEmpty" style="margin-top:6px">' + (planOver
            ? "Ce plan-ci n’a plus de séance à venir — le premier envoi s’ajustera à ton prochain plan ou à tes sorties libres."
            : "Rien à couvrir sur la période qui vient — le prochain envoi s’ajustera aux semaines qui en ont besoin.") + "</div>"
        : '<div class="load-sub" id="shopPeriodEmpty" style="display:none"></div>')
    + productTileHTML(flavorSel)
    + choiceRowHTML("Goût préféré", FLAVOR_OPTIONS, flavorSel, "flavor")
    + choiceRowHTML("Format préféré", FORMAT_OPTIONS, formatSel, "format")
    + '<button class="shop-cta" id="shopOk" type="button">' + esc(submitLabel) + "</button>"
    + (abonneActif ? '<div style="margin-top:8px"><button class="btn" id="shopEditCancel" type="button">Annuler</button></div>' : "")
    + '<div class="shop-fine">Aucun paiement, aucune expédition pour l’instant : le service de commande n’est pas encore actif. '
    + "Ton abonnement sera enregistré sur cet appareil, résiliable à chaque échéance, jamais engagé au-delà.</div>"
    + "</details>";
}

function bindShopSubscription(plan, today, rerender) {
  const card = $("shopCard");
  if (card && card.tagName === "DETAILS") {
    card.addEventListener("toggle", () => {
      if (!card.open) {
        S.answers.shopSubscription = Object.assign({}, S.answers.shopSubscription || {}, { lastPromptAt: today });
        ebSave();
      }
    });
  }
  const cadSeg = $("shopCadSeg");
  if (cadSeg) cadSeg.querySelectorAll("[data-cadence]").forEach((btn) => {
    btn.onclick = () => {
      const val = btn.dataset.cadence;
      if (btn.getAttribute("aria-pressed") === "true") return;
      // Le formulaire est OUVERT quand on touche à ce champ : `rerender()` reconstruit la
      // carte depuis zéro et redéciderait de la replier (aucun abonnement encore actif ⇒
      // `shopPromptDue` la trouverait "pas due"). Une prévisualisation en direct qui se
      // referme sous les doigts serait pire que pas de prévisualisation — on force l'ouverture
      // qu'on vient de perdre.
      const ouverte = card && card.tagName === "DETAILS" && card.open;
      S.answers.shopSubscription = Object.assign({}, S.answers.shopSubscription || {}, { cadence: val });
      ebSave();
      rerender();
      if (ouverte) { const c2 = $("shopCard"); if (c2 && c2.tagName === "DETAILS") c2.open = true; }
    };
  });
  // Goût/format : préférence de PRÉVISUALISATION lue au clic « Activer » (comme l'ancien
  // <select>.value) — pas de rerender, juste l'état visuel du groupe de pilules + la
  // capsule du produit qui suit le goût en direct.
  document.querySelectorAll('[data-choice-group="flavor"] .choice, [data-choice-group="format"] .choice').forEach((btn) => {
    btn.onclick = () => {
      btn.parentElement.querySelectorAll(".choice").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      if (btn.parentElement.dataset.choiceGroup === "flavor") {
        const cap = document.querySelector("#shopCard .pt-cap");
        if (cap) cap.style.background = FLAVOR_CAP[btn.dataset.choiceVal] || FLAVOR_CAP.neutre;
      }
    };
  });
  const ok = $("shopOk");
  if (ok) ok.onclick = async () => {
    const cadenceBtn = cadSeg && cadSeg.querySelector('[aria-pressed="true"]');
    const flavorBtn = document.querySelector('[data-choice-group="flavor"] [aria-pressed="true"]');
    const formatBtn = document.querySelector('[data-choice-group="format"] [aria-pressed="true"]');
    const cadenceVal = (cadenceBtn && cadenceBtn.dataset.cadence) || "hebdo";
    const flavor = (flavorBtn && flavorBtn.dataset.choiceVal) || FLAVOR_OPTIONS[0];
    const format = (formatBtn && formatBtn.dataset.choiceVal) || FORMAT_OPTIONS[0];
    const existing = S.answers.shopSubscription;
    const v = subscriptionView(existing, today);
    // Édition d'un abonnement en cours (actif ou en résiliation programmée) : on garde
    // `startedAt` (et `cancelEffectiveAt` s'il existe) — modifier goût/format/cadence ne
    // relance ni ne défait une résiliation déjà programmée. Nouvel abonnement ou reprise
    // après résiliation effective : nouveau départ, aujourd'hui.
    const sub = (v.status === "active" || v.status === "cancel_pending")
      ? Object.assign({}, existing, { cadence: cadenceVal, flavor, format })
      : { startedAt: today, cadence: cadenceVal, flavor, format, lastPromptAt: today };
    await submitOrder(sub); // stub — aucun réseau pour l'instant
    S.answers.shopSubscription = sub;
    shopEditing = false;
    ebSave();
    rerender();
  };
  const edit = $("shopEdit");
  if (edit) edit.onclick = () => { shopEditing = true; shopConfirmingCancel = false; rerender(); };
  const editCancel = $("shopEditCancel");
  if (editCancel) editCancel.onclick = () => { shopEditing = false; rerender(); };
  // R25.4 — résiliation en deux temps : « Résilier » n'ouvre QUE le bandeau de confirmation,
  // il ne pose jamais `cancelEffectiveAt` lui-même (garde E2E dédiée, smoke-shop.mjs).
  const cancel = $("shopCancel");
  if (cancel) cancel.onclick = () => { shopConfirmingCancel = true; rerender(); };
  const cancelConfirm = $("shopCancelConfirm");
  if (cancelConfirm) cancelConfirm.onclick = () => {
    const sub = S.answers.shopSubscription;
    const cad = CADENCES[sub.cadence] || CADENCES.hebdo;
    S.answers.shopSubscription = Object.assign({}, sub, { cancelEffectiveAt: nextEcheance(sub.startedAt, cad.days, today) });
    shopConfirmingCancel = false;
    ebSave();
    rerender();
  };
  const cancelKeep = $("shopCancelKeep");
  if (cancelKeep) cancelKeep.onclick = () => { shopConfirmingCancel = false; rerender(); };
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

  let html = '<div class="card"><div class="eyebrow">Nutrition</div><h2>Ton carburant, expliqué</h2>'
    + '<div class="why">Des estimations et des repères issus des consensus publiés — jamais un régime, jamais une cible d’apport. Ce qui compte : manger assez pour t’entraîner.</div>'
    // R25.8 — la carte d'intro se ferme ici ; les trois blocs qui suivent sont des cartes de
    // premier niveau (spec Outils › Nutrition, r1 intro / r2 dépense / r3 ravitaillement /
    // r4 canal de vente), plus des cartes dans une carte.
    + "</div>";
  html += energyCardHTML(todayDay, true); // dépense théorique + macros indicatives, ouvert
  html += nutritionCardHTML(todayDay, null); // ravitaillement par séance (météo en différé)
  html += shopSubscriptionCardHTML(plan, today); // abonnement récurrent, anticipé
  $("screen").innerHTML = html;
  bindShopSubscription(plan, today, () => renderTabNutrition(plan));

  if (todayDay) fetchWeather().then((wx) => {
    const el = $("nutCard");
    if (!el || !wx || wx.tmaxC == null) return;
    const h = nutritionCardHTML(todayDay, wx.tmaxC);
    if (h) el.outerHTML = h;
  });
}
