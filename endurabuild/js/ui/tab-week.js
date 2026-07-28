// Onglet 📅 Plan de la semaine — l'écran du quotidien. Ordre imposé (demande produit) :
// 1) Forme du jour d'abord (sommeil/VFC/énergie/ressenti) — jamais de séance affichée
//    avant d'avoir répondu, une fois par jour (S.answers.readiness.date). 2) la séance
//    du jour (ou la prochaine si repos), déjà adaptée au verdict. 3) toute la semaine.
import { S, $, ebSave } from "../state.js";
import { readinessCardHTML } from "./plan-view.js";
import { applyReadiness, fetchWeather, readinessDoneToday } from "./readiness.js";

const ic = { sw: "\u{1F3CA}", bk: "\u{1F6B4}", rn: "\u{1F3C3}", br: "\u{1F501}", rs: "\u{1F4AA}" };

function currentWeek(plan) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    plan.weeks.find((w) => w.days.some((d) => d.date === today)) ||
    plan.weeks.find((w) => w.days.some((d) => d.date >= today)) ||
    plan.weeks[0]
  );
}

// Célébrations « moment » (RESTE-A-FAIRE #6) : bannières ponctuelles aux instants qui
// comptent — jour de course, veille de course, entrée en affûtage. Purement visuel,
// calculé depuis le plan déjà généré ; dégrade proprement si les jours n'ont pas de date.
export function momentHTML(plan, todayISO) {
  const today = todayISO || new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(new Date(today + "T00:00:00Z").getTime() + 864e5).toISOString().slice(0, 10);
  const raceDates = (plan.races || []).map((r) => r.date);
  if (S.answers && S.answers.race_date) raceDates.push(S.answers.race_date);
  const B = (bg, txt) => '<div class="warn" style="background:' + bg + ';font-weight:600">' + txt + "</div>";
  if (raceDates.includes(today))
    return B("#ffe3e0", "\u{1F3C1} <b>Jour de course.</b> Tout le travail est fait — départ prudent, finis fort. Bonne course !");
  if (raceDates.includes(tomorrow))
    return B("#fff3d6", "\u{1F389} <b>Veille de course.</b> Objectif du jour : des jambes fraîches. Repos, hydratation, matériel préparé — demain tu récoltes.");
  let taperStart = null;
  plan.weeks.forEach((w) => w.days.forEach((d) => { if (!taperStart && (d.phaseId === "taper" || (w.phase && w.phase.id === "taper"))) taperStart = d.date; }));
  if (taperStart && taperStart === today)
    return B("#e9defc", "✂️ <b>L’affûtage commence.</b> Le volume descend, la forme monte — le plus dur est derrière toi. Ne rajoute rien.");
  return "";
}

// Carte « Ravitaillement d'aujourd'hui » (module nutrition, périmètre ravitaillement
// d'effort uniquement — voir src/nutrition/). La température vient de la météo déjà
// intégrée (Open-Meteo) et arrive en différé : la carte se re-rend seule, dégrade
// proprement sans réseau/géoloc. L'avertissement du moteur est TOUJOURS affiché.
function nutritionCardHTML(day, tempC) {
  if (!day || !globalThis.EBV2 || !globalThis.EBV2.sessionNutrition) return "";
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  const advs = day.sessions
    .map((s) => ({ s, a: globalThis.EBV2.sessionNutrition(s, { tempC: tempC == null ? null : tempC, weightKg: wkg }) }))
    .filter((x) => x.a);
  if (!advs.length) return "";
  let h = '<div class="load-card" id="nutCard"><div class="load-title">\u{1F964} Ravitaillement d’aujourd’hui' + (tempC != null ? ' <span style="font-weight:400">· ' + Math.round(tempC) + "°C prévus</span>" : "") + "</div>";
  advs.forEach(({ s, a }) => {
    // Résumé court : sous 60min, « 0–500 ml/h » se lit mal (plancher à 0, et « /h » trompeur
    // sur une séance plus courte qu'une heure) — on reprend le cadrage « à la soif » du moteur.
    const drinkSummary = a.during.drinkMlPerH[0] === 0
      ? "eau à la soif"
      : a.during.drinkMlPerH[0] + "–" + a.during.drinkMlPerH[1] + " ml/h" + (a.during.sodium ? " + sodium" : "");
    h += '<details style="margin-top:6px;font-size:12px"><summary style="cursor:pointer"><b>' + s.name + "</b> — "
      + (a.during.carbsGPerH ? a.during.carbsGPerH[0] + "–" + a.during.carbsGPerH[1] + " g/h de glucides, " + drinkSummary : drinkSummary) + "</summary>"
      + '<div style="margin:6px 0 0 2px;color:#3f3a30"><b>Avant :</b> ' + a.before
      + "<br><b>Pendant :</b> " + a.during.text
      + (a.after ? "<br><b>Après :</b> " + a.after : "")
      + '<br><span style="color:#777">Dépense estimée ~' + a.kcal[0] + "–" + a.kcal[1] + " kcal" + (wkg ? "" : " (renseigne ton poids dans \u{1F4CB} Profil pour affiner)") + ".</span></div></details>";
  });
  h += '<div class="load-sub" style="margin-top:8px">' + advs[0].a.disclaimer + "</div></div>";
  return h;
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Debout tôt \u{1F319}" : h < 12 ? "Bonjour ☀️" : h < 18 ? "Bon après-midi" : h < 22 ? "Bonsoir \u{1F319}" : "Encore debout \u{1F989}";
}

// Écran de check-in : AUCUNE séance visible tant que la forme du jour n'est pas
// renseignée (demande produit). Une fois par jour — readinessDoneToday() le sait déjà.
function checkinGateHTML() {
  return '<div class="card"><div class="eyebrow">Avant de commencer</div><h2>' + greeting() + "</h2>"
    + '<div class="why">Quatre curseurs suffisent : le moteur adapte ta séance du jour à ta forme — jamais l’inverse.</div>'
    + readinessCardHTML({ title: "\u{1F321} Forme du jour", sub: "Sommeil, VFC, énergie, ressenti.", btnLabel: "Voir ma séance du jour →" })
    + "</div>";
}

// Séance du jour (déjà adaptée au verdict de forme) — ou, si repos, la prochaine séance
// à venir : « la séance à venir » demandée, jamais un écran vide sans direction.
const _verdictIc = { verte: "\u{1F7E2}", orange: "\u{1F7E0}", rouge: "\u{1F534}" };
const _verdictLbl = { keep: "séance maintenue", reduce: "volume réduit", replace: "endurance à la place", rest: "repos conseillé", off: "repos complet" };
function heroSessionHTML(plan, todayISO) {
  if (!globalThis.EBV2 || !globalThis.EBV2.adjustToday) return "";
  const snap = Object.assign({ date: todayISO }, S.answers.readiness || {});
  let res;
  try { res = globalThis.EBV2.adjustToday(S.sport, S.answers, snap); } catch (e) { console.warn(e); return ""; }
  const v = res.adjustment.verdict;
  const badge = '<span style="float:right;font-size:11px;font-weight:700;color:#555;margin-top:2px">' + _verdictIc[v.level] + " " + _verdictLbl[res.adjustment.action] + "</span>";
  let body;
  if (res.sessions.length) {
    body = res.sessions.map((x) => '<div style="margin-top:6px"><b>' + x.name + "</b>" + (x.det ? '<span class="gd-det">' + x.det + "</span>" : "") + "</div>").join("");
  } else {
    const upcoming = [];
    plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date > todayISO && d.sessions.some((s) => s.d !== "rs")) upcoming.push(d); }));
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    const nxt = upcoming[0];
    body = '<div style="margin-top:6px">\u{1F60C} Repos aujourd’hui.' + (nxt ? " Prochaine séance : <b>" + nxt.jour + "</b> · " + nxt.sessions.filter((s) => s.d !== "rs").map((s) => s.name).join(", ") : "") + "</div>";
  }
  return '<div class="card">' + badge + '<div class="eyebrow">Aujourd’hui' + (res.jour ? " · " + res.jour : "") + "</div>" + body + "</div>";
}

export function renderTabWeek(plan) {
  const today = new Date().toISOString().slice(0, 10);
  const moment = momentHTML(plan, today);

  if (!readinessDoneToday()) {
    $("screen").innerHTML = moment + checkinGateHTML();
    const rb = $("rdApply");
    if (rb) rb.onclick = async () => { await applyReadiness(); renderTabWeek(plan); };
    return;
  }

  const w = currentWeek(plan);
  const raceTag = w.race
    ? ' <span style="background:#ff3b30;color:#fff;border-radius:5px;padding:1px 7px;font-size:10px;font-weight:700">\u{1F3C1} COURSE ' + w.race + "</span>"
    : w.postRace ? ' <span style="color:#9b72ff;font-size:10px">↳ récup post-course</span>' : "";
  let html = moment;
  html += heroSessionHTML(plan, today);
  html += '<div class="card"><div class="eyebrow">Ta semaine</div>';
  html += '<div class="gw"><div class="gw-h"><b>Semaine ' + w.num + "</b><span style=\"color:" + (w.phase.c || "#555") + '">' + w.phase.nom + "</span>" + raceTag + "<em>" + w.vol + "h" + (w.isRecup ? " récup" : "") + "</em></div>";
  html += '<div class="gw-grid">';
  w.days.forEach((d) => {
    const bg = d.sessions.map((s) => "<span>" + ic[s.d] + "</span>").join("");
    const nm = d.sessions
      .map((s, si) => {
        const k = w.num + "|" + d.jour + "|" + si;
        const dn = S.answers.done && S.answers.done[k];
        const chk = s.d !== "rs" ? '<button class="doneBtn' + (dn ? " done" : "") + '" type="button" data-dk="' + k + '" title="Marquer fait" aria-label="Marquer ' + s.name.replace(/"/g, "") + ' comme faite">' + (dn ? "✓" : "○") + "</button> " : "";
        return chk + "<b>" + s.name + "</b>" + (s.det ? '<span class="gd-det">' + s.det + "</span>" : "");
      })
      .join("");
    const mark = d.date === today ? "<i>aujourd’hui</i>" : (plan.use10 ? "<i>C" + d.cyc + "J" + d.jc + "</i>" : "");
    html += '<div class="gd ' + d.charge + (d.date === today ? " today" : "") + '"><div class="gd-top"><b>' + d.jour + "</b>" + mark + '</div><div class="gd-badges">' + bg + '</div><div class="gd-n">' + nm + "</div></div>";
  });
  html += "</div></div>";
  const todayDay = w.days.find((d) => d.date === today) || null;
  html += nutritionCardHTML(todayDay, null);
  html += '<details class="load-card"><summary class="load-title">\u{1F321} Modifier ma forme du jour</summary>' + readinessCardHTML({ btnLabel: "Mettre à jour" }) + "</details>";
  html += "</div>";
  $("screen").innerHTML = html;
  // Météo en différé : affine l'hydratation (chaleur → sodium) sans bloquer le rendu.
  if (todayDay) fetchWeather().then((wx) => {
    const el = $("nutCard");
    if (!el || !wx || wx.tmaxC == null) return;
    const h = nutritionCardHTML(todayDay, wx.tmaxC);
    if (h) el.outerHTML = h;
  });
  const _rb = $("rdApply");
  if (_rb) _rb.onclick = async () => { await applyReadiness(); renderTabWeek(plan); };
  document.querySelectorAll("#screen .doneBtn").forEach((b) => {
    b.onclick = () => {
      if (!S.answers.done) S.answers.done = {};
      const k = b.dataset.dk;
      if (S.answers.done[k]) delete S.answers.done[k];
      else S.answers.done[k] = true;
      ebSave();
      const sc = window.pageYOffset;
      renderTabWeek(plan); // re-rend la VUE — le plan n'est pas recalculé
      window.scrollTo(0, sc);
    };
  });
}
