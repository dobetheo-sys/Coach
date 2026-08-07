// Onglet 🥗 Nutrition (retour utilisateur R5) — tout ce qui touche à l'assiette au même
// endroit : dépense théorique du jour (base + entraînement, N8–N9), répartition
// INDICATIVE des macros selon le profil et les séances (N10), ravitaillement d'effort de
// chaque séance (N1–N7, météo comprise), journal alimentaire (Open Food Facts + CSV MFP).
// La frontière ne bouge pas : des ESTIMATIONS et des photographies de consensus — jamais
// une cible d'apport, jamais un menu ; l'avertissement du moteur est TOUJOURS affiché.
import { S, $, esc, ebSave, todayISO } from "../state.js";
import { fetchWeather } from "./readiness.js";
import {
  estimateTotalNeed, estimatePeriodNeed, needSummary, nextEcheance, subscriptionView,
  shopPromptDue, submitOrder, CADENCES, FLAVOR_OPTIONS, FORMAT_OPTIONS,
} from "../shop-order.js";
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
    + (e.approximate ? '<br><span style="color:#8a6d00">Fourchette large : complète taille/âge au 📋 Profil pour l’affiner.</span>' : "")
    + "</div>"
    // R16.6 — une ligne par macro plutôt qu'un paragraphe de six lignes enchaînées.
    + '<div style="font-size:var(--fs-sm);margin-top:8px;color:#3f3a30">'
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
  let h = '<div class="load-card" id="nutCard"><div class="load-title">🥤 Ravitaillement d’aujourd’hui' + (tempC != null ? ' <span style="font-weight:400">· ' + Math.round(tempC) + "°C prévus</span>" : "") + "</div>";
  advs.forEach(({ s, a }) => {
    const drinkSummary = a.during.drinkMlPerH[0] === 0
      ? "eau à la soif"
      : a.during.drinkMlPerH[0] + "–" + a.during.drinkMlPerH[1] + " ml/h" + (a.during.sodium ? " + sodium" : "");
    h += '<details style="margin-top:6px;font-size:var(--fs-sm)"><summary style="cursor:pointer"><b>' + s.name + "</b> — "
      + (a.during.carbsGPerH ? a.during.carbsGPerH[0] + "–" + a.during.carbsGPerH[1] + " g/h de glucides, " + drinkSummary : drinkSummary) + "</summary>"
      + '<div style="margin:6px 0 0 2px;color:#3f3a30"><b>Avant :</b> ' + a.before
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

function shopSubscriptionCardHTML(plan, today) {
  const sub = S.answers.shopSubscription || null;
  const view = subscriptionView(sub, today);
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  const abonneActif = view.status === "active" || view.status === "cancel_pending";

  if (abonneActif && !shopEditing) {
    const cad = CADENCES[sub.cadence] || CADENCES.hebdo;
    const echeance = nextEcheance(sub.startedAt, cad.days, today);
    const need = estimatePeriodNeed(plan, wkg, cad.days, today);
    const summary = needSummary(need);
    return '<div class="load-card" id="shopCard"><div class="load-title">🛒 Abonnement ravitaillement</div>'
      + '<div class="load-sub" style="margin-top:6px">' + esc(cad.label) + " · goût <b>" + esc(sub.flavor) + "</b> · format <b>" + esc(sub.format) + "</b>"
      + (summary ? "<br>Prochain envoi : <b>" + esc(summary) + "</b> — livré avant le début de la période" : "<br>Rien à couvrir sur la période qui vient — le prochain envoi s'ajustera")
      + "<br>Prochaine échéance : <b>" + esc(echeance) + "</b>"
      + (view.status === "cancel_pending"
          ? '<br><span style="color:#8a6d00">Résiliation prévue le ' + esc(view.until) + " — le prochain envoi a lieu, rien après.</span>"
          : "")
      + '<br><span style="color:var(--muted)">Le service de commande n’est pas encore actif — cet abonnement reste une intention enregistrée sur cet appareil, on te préviendra dès qu’il le sera.</span></div>'
      + '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'
      + '<button class="btn" id="shopEdit" type="button">Modifier</button>'
      + (view.status === "cancel_pending"
          ? '<button class="btn" id="shopUncancel" type="button">Continuer quand même</button>'
          : '<button class="btn" id="shopCancel" type="button">Résilier</button>')
      + "</div></div>";
  }

  // Formulaire : première proposition (aucun abonnement), reprise après résiliation, ou
  // édition d'un abonnement en cours.
  if (!abonneActif && !estimateTotalNeed(plan, wkg)) return ""; // rien nulle part dans le plan
  const due = !abonneActif && shopPromptDue(sub, S.answers.plan_start, today);
  const cadenceSel = (sub && sub.cadence) || "hebdo";
  const flavorSel = sub && sub.flavor;
  const formatSel = sub && sub.format;
  const periodNeed = estimatePeriodNeed(plan, wkg, CADENCES[cadenceSel].days, today);
  const submitLabel = abonneActif ? "Enregistrer les modifications" : (view.status === "cancelled" ? "Reprendre l’abonnement" : "Activer mon abonnement");
  return '<details class="load-card" id="shopCard"' + (due ? " open" : "") + '>'
    + '<summary class="load-title" style="cursor:pointer">🛒 ' + (abonneActif ? "Modifier l’abonnement" : "S’abonner au ravitaillement") + '</summary>'
    + '<div class="load-sub" style="margin-top:6px">Reçois tes gels à l’avance, à la cadence de ton choix — jamais le jour même, jamais en retard sur une séance.</div>'
    + '<div class="q"><span class="q-label">Cadence</span><select id="shopCadence">'
    + Object.keys(CADENCES).map((k) => '<option value="' + k + '"' + (k === cadenceSel ? " selected" : "") + '>' + esc(CADENCES[k].label[0].toUpperCase() + CADENCES[k].label.slice(1)) + "</option>").join("")
    + '</select></div>'
    + '<div class="load-sub" style="margin-top:6px">' + (periodNeed
        ? "Ta prochaine période demande environ <b>" + esc(needSummary(periodNeed)) + "</b>."
        : "Rien à couvrir sur la période qui vient — l’abonnement s’ajustera aux semaines qui en ont besoin.")
    + "</div>"
    + '<div class="q"><span class="q-label">Goût préféré</span><select id="shopFlavor">'
    + FLAVOR_OPTIONS.map((f) => '<option value="' + esc(f) + '"' + (f === flavorSel ? " selected" : "") + '>' + esc(f) + "</option>").join("")
    + '</select></div>'
    + '<div class="q"><span class="q-label">Format préféré</span><select id="shopFormat">'
    + FORMAT_OPTIONS.map((f) => '<option value="' + esc(f) + '"' + (f === formatSel ? " selected" : "") + '>' + esc(f) + "</option>").join("")
    + '</select></div>'
    + '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'
    + '<button class="btn primary" id="shopOk" type="button">' + esc(submitLabel) + "</button>"
    + (abonneActif ? '<button class="btn" id="shopEditCancel" type="button">Annuler</button>' : "")
    + "</div>"
    + '<div class="load-sub" style="margin-top:6px">Aucun paiement, aucune expédition pour l’instant : le service de commande n’est pas encore actif. '
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
  const cadenceSel = $("shopCadence");
  if (cadenceSel) cadenceSel.onchange = () => {
    // Le formulaire est OUVERT quand on touche à ce champ : `rerender()` reconstruit la
    // carte depuis zéro et redéciderait de la replier (aucun abonnement encore actif ⇒
    // `shopPromptDue` la trouverait "pas due"). Une prévisualisation en direct qui se
    // referme sous les doigts serait pire que pas de prévisualisation — on force l'ouverture
    // qu'on vient de perdre.
    const ouverte = card && card.tagName === "DETAILS" && card.open;
    S.answers.shopSubscription = Object.assign({}, S.answers.shopSubscription || {}, { cadence: cadenceSel.value });
    ebSave();
    rerender();
    if (ouverte) { const c2 = $("shopCard"); if (c2 && c2.tagName === "DETAILS") c2.open = true; }
  };
  const ok = $("shopOk");
  if (ok) ok.onclick = async () => {
    const cadence = ($("shopCadence") || {}).value || "hebdo";
    const flavor = ($("shopFlavor") || {}).value || FLAVOR_OPTIONS[0];
    const format = ($("shopFormat") || {}).value || FORMAT_OPTIONS[0];
    const existing = S.answers.shopSubscription;
    const v = subscriptionView(existing, today);
    // Édition d'un abonnement en cours (actif ou en résiliation programmée) : on garde
    // `startedAt` (et `cancelEffectiveAt` s'il existe) — modifier goût/format/cadence ne
    // relance ni ne défait une résiliation déjà programmée. Nouvel abonnement ou reprise
    // après résiliation effective : nouveau départ, aujourd'hui.
    const sub = (v.status === "active" || v.status === "cancel_pending")
      ? Object.assign({}, existing, { cadence, flavor, format })
      : { startedAt: today, cadence, flavor, format, lastPromptAt: today };
    await submitOrder(sub); // stub — aucun réseau pour l'instant
    S.answers.shopSubscription = sub;
    shopEditing = false;
    ebSave();
    rerender();
  };
  const edit = $("shopEdit");
  if (edit) edit.onclick = () => { shopEditing = true; rerender(); };
  const editCancel = $("shopEditCancel");
  if (editCancel) editCancel.onclick = () => { shopEditing = false; rerender(); };
  const cancel = $("shopCancel");
  if (cancel) cancel.onclick = () => {
    const sub = S.answers.shopSubscription;
    const cad = CADENCES[sub.cadence] || CADENCES.hebdo;
    S.answers.shopSubscription = Object.assign({}, sub, { cancelEffectiveAt: nextEcheance(sub.startedAt, cad.days, today) });
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

  let html = '<div class="card"><div class="eyebrow">Nutrition</div><h2>Ton carburant, expliqué</h2>'
    + '<div class="why">Des estimations et des repères issus des consensus publiés — jamais un régime, jamais une cible d’apport. Ce qui compte : manger assez pour t’entraîner.</div>';
  html += energyCardHTML(todayDay, true); // dépense théorique + macros indicatives, ouvert
  html += nutritionCardHTML(todayDay, null); // ravitaillement par séance (météo en différé)
  html += shopSubscriptionCardHTML(plan, today); // abonnement récurrent, anticipé
  html += "</div>";
  $("screen").innerHTML = html;
  bindShopSubscription(plan, today, () => renderTabNutrition(plan));

  if (todayDay) fetchWeather().then((wx) => {
    const el = $("nutCard");
    if (!el || !wx || wx.tmaxC == null) return;
    const h = nutritionCardHTML(todayDay, wx.tmaxC);
    if (h) el.outerHTML = h;
  });
}
