// Onglet 🥗 Nutrition (retour utilisateur R5) — tout ce qui touche à l'assiette au même
// endroit : dépense théorique du jour (base + entraînement, N8–N9), répartition
// INDICATIVE des macros selon le profil et les séances (N10), ravitaillement d'effort de
// chaque séance (N1–N7, météo comprise), journal alimentaire (Open Food Facts + CSV MFP).
// La frontière ne bouge pas : des ESTIMATIONS et des photographies de consensus — jamais
// une cible d'apport, jamais un menu ; l'avertissement du moteur est TOUJOURS affiché.
import { S, $, esc, ebSave, todayISO } from "../state.js";
import { fetchWeather } from "./readiness.js";
import { productCategoryFor, CATALOG, CATEGORY_LABELS } from "../shop-catalog.js";
import { estimatePlanNeed, needSummary, shopPromptDue, submitOrder, FLAVOR_OPTIONS, FORMAT_OPTIONS } from "../shop-order.js";
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
    const cat = productCategoryFor(a.during);
    const chip = cat
      ? '<div class="shop-chip" style="margin-top:6px;font-size:var(--fs-sm)">'
        + (CATALOG[cat]
            ? '🛒 <a href="' + esc(CATALOG[cat].url) + '">' + esc(CATALOG[cat].name) + " — " + CATALOG[cat].priceEUR + "€</a>"
            : "🕐 Catégorie : " + esc(CATEGORY_LABELS[cat]) + ' · <a href="#" data-waitlist>Rejoindre la liste d\'attente</a>')
      + "</div>"
      : "";
    h += '<details style="margin-top:6px;font-size:var(--fs-sm)"><summary style="cursor:pointer"><b>' + s.name + "</b> — "
      + (a.during.carbsGPerH ? a.during.carbsGPerH[0] + "–" + a.during.carbsGPerH[1] + " g/h de glucides, " + drinkSummary : drinkSummary) + "</summary>"
      + '<div style="margin:6px 0 0 2px;color:#3f3a30"><b>Avant :</b> ' + a.before
      + "<br><b>Pendant :</b> " + a.during.text
      + (a.after ? "<br><b>Après :</b> " + a.after : "")
      + '<br><span style="color:var(--muted)">Dépense estimée ~' + a.kcal[0] + "–" + a.kcal[1] + " kcal" + (wkg ? "" : " (renseigne ton poids dans 📋 Profil pour affiner)") + ".</span>"
      + chip + "</div></details>";
  });
  h += '<div class="load-sub" style="margin-top:8px">' + advs[0].a.disclaimer + "</div></div>";
  return h;
}

// Tunnel de commande — goût/format, sur l'ensemble du plan (07/08/2026). Ponctuel : la
// carte reste toujours accessible repliée, et ne s'ouvre d'elle-même qu'au premier passage
// puis tous les 28 jours tant que rien n'est commandé (shopPromptDue) — jamais un rappel
// permanent (H-1b), jamais un refus définitif. PAS DE SERVEUR pour l'instant : submitOrder()
// est un stub local, et la carte le DIT plutôt que de simuler une confirmation.
function shopOrderCardHTML(plan, today) {
  const order = S.answers.shopOrder || null;
  if (order && order.status === "ordered") {
    const summary = needSummary(order.grams);
    if (!summary) return "";
    return '<div class="load-card" id="shopCard"><div class="load-title">🛒 Ta demande de ravitaillement</div>'
      + '<div class="load-sub" style="margin-top:6px">Enregistrée le ' + esc(order.orderedAt) + " — " + esc(summary)
      + " · goût <b>" + esc(order.flavor) + "</b> · format <b>" + esc(order.format) + "</b>"
      + '<br><span style="color:var(--muted)">Le service de commande n’est pas encore actif — ta demande reste sur cet appareil, on te préviendra dès qu’il le sera.</span></div>'
      + '<button class="btn" id="shopEdit" type="button" style="margin-top:8px">Modifier ma demande</button></div>';
  }
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  const need = estimatePlanNeed(plan, wkg);
  if (!need) return ""; // aucune séance de plus d'1h dans ce plan : rien à proposer
  const due = shopPromptDue(order, S.answers.plan_start, today);
  const flavorSel = order && order.flavor;
  const formatSel = order && order.format;
  return '<details class="load-card" id="shopCard"' + (due ? " open" : "") + '>'
    + '<summary class="load-title" style="cursor:pointer">🛒 Ravitailler ce plan</summary>'
    + '<div class="load-sub" style="margin-top:6px">Sur l’ensemble du plan, tes séances de plus d’une heure demandent environ <b>'
    + esc(needSummary(need)) + '</b> de glucides à couvrir.</div>'
    + '<div class="q"><span class="q-label">Goût préféré</span><select id="shopFlavor">'
    + FLAVOR_OPTIONS.map((f) => '<option value="' + esc(f) + '"' + (f === flavorSel ? " selected" : "") + '>' + esc(f) + "</option>").join("")
    + '</select></div>'
    + '<div class="q"><span class="q-label">Format préféré</span><select id="shopFormat">'
    + FORMAT_OPTIONS.map((f) => '<option value="' + esc(f) + '"' + (f === formatSel ? " selected" : "") + '>' + esc(f) + "</option>").join("")
    + '</select></div>'
    + '<button class="btn primary" id="shopOk" type="button" style="margin-top:8px">Réserver ma demande</button>'
    + '<div class="load-sub" style="margin-top:6px">Aucun paiement, aucune expédition pour l’instant : le service de commande n’est pas encore actif. '
    + "Ta demande sera enregistrée sur cet appareil, on te préviendra dès qu’il le sera.</div>"
    + "</details>";
}

function bindShopOrder(plan, today, rerender) {
  const card = $("shopCard");
  if (card && card.tagName === "DETAILS" && !card.dataset.shopBound) {
    card.dataset.shopBound = "1";
    card.addEventListener("toggle", () => {
      if (!card.open) {
        S.answers.shopOrder = Object.assign({}, S.answers.shopOrder || {}, { lastPromptAt: today });
        ebSave();
      }
    });
  }
  const ok = $("shopOk");
  if (ok) ok.onclick = async () => {
    const flavor = ($("shopFlavor") || {}).value || FLAVOR_OPTIONS[0];
    const format = ($("shopFormat") || {}).value || FORMAT_OPTIONS[0];
    const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
    const need = estimatePlanNeed(plan, wkg) || {};
    await submitOrder({ flavor, format, grams: need }); // stub — aucun réseau pour l'instant
    S.answers.shopOrder = { status: "ordered", flavor, format, grams: need, orderedAt: today, lastPromptAt: today };
    ebSave();
    rerender();
  };
  const edit = $("shopEdit");
  if (edit) edit.onclick = () => {
    S.answers.shopOrder = Object.assign({}, S.answers.shopOrder || {}, { status: undefined, lastPromptAt: today });
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
  html += shopOrderCardHTML(plan, today); // tunnel de commande — sur l'ensemble du plan
  html += "</div>";
  $("screen").innerHTML = html;
  bindShopOrder(plan, today, () => renderTabNutrition(plan));

  if (todayDay) fetchWeather().then((wx) => {
    const el = $("nutCard");
    if (!el || !wx || wx.tmaxC == null) return;
    const h = nutritionCardHTML(todayDay, wx.tmaxC);
    if (h) el.outerHTML = h;
  });
}
