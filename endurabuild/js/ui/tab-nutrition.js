// Onglet 🥗 Nutrition (retour utilisateur R5) — tout ce qui touche à l'assiette au même
// endroit : dépense théorique du jour (base + entraînement, N8–N9), répartition
// INDICATIVE des macros selon le profil et les séances (N10), ravitaillement d'effort de
// chaque séance (N1–N7, météo comprise), journal alimentaire (Open Food Facts + CSV MFP).
// La frontière ne bouge pas : des ESTIMATIONS et des photographies de consensus — jamais
// une cible d'apport, jamais un menu ; l'avertissement du moteur est TOUJOURS affiché.
import { S, $, todayISO } from "../state.js";
import { fetchWeather } from "./readiness.js";
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
    return '<details class="load-card"' + (open ? " open" : "") + '><summary class="load-title">🔥 Dépense estimée du jour</summary>'
      + '<div class="load-sub" style="margin-top:6px">Renseigne ton <b>poids</b> dans l’onglet 📋 Profil pour voir l’estimation (taille, âge et sexe l’affinent). Aucune estimation sans donnée réelle.</div></details>';
  }
  const f = (r) => r[0] === r[1] ? r[0] : r[0] + "–" + r[1];
  return '<details class="load-card"' + (open ? " open" : "") + '><summary class="load-title">🔥 Dépense estimée du jour <span style="font-weight:400">· ~' + f(e.total) + " kcal</span></summary>"
    + '<div style="font-size:var(--fs-sm);margin-top:8px">'
    + "<b>Base + vie quotidienne :</b> ~" + f(e.daily) + " kcal (métabolisme de base ~" + f(e.bmr) + ")<br>"
    + "<b>Entraînement du jour :</b> " + (e.training[1] ? "~" + f(e.training) + " kcal" : "repos — 0 kcal d’entraînement")
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

export function renderTabNutrition(plan) {
  const today = todayISO();
  let todayDay = null;
  plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date === today) todayDay = d; }));

  let html = '<div class="card"><div class="eyebrow">Nutrition</div><h2>Ton carburant, expliqué</h2>'
    + '<div class="why">Des estimations et des repères issus des consensus publiés — jamais un régime, jamais une cible d’apport. Ce qui compte : manger assez pour t’entraîner.</div>';
  html += energyCardHTML(todayDay, true); // dépense théorique + macros indicatives, ouvert
  html += nutritionCardHTML(todayDay, null); // ravitaillement par séance (météo en différé)
  html += "</div>";
  $("screen").innerHTML = html;

  if (todayDay) fetchWeather().then((wx) => {
    const el = $("nutCard");
    if (!el || !wx || wx.tmaxC == null) return;
    const h = nutritionCardHTML(todayDay, wx.tmaxC);
    if (h) el.outerHTML = h;
  });
}
