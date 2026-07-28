// Onglet 🎯 Aujourd'hui — l'onglet CENTRAL (retour utilisateur R5), mis en valeur dans la
// barre. Ordre imposé : 1) check-in du matin en diaporama (aucune séance avant d'avoir
// répondu, une fois par jour) ; 2) la séance du jour DÉJÀ adaptée au verdict ; 3) la
// prédiction de course ; 4) la courbe charge/fatigue/forme ; 5) la barre d'avancement de
// la prépa (liée à la même charge) ; 6) la répartition des intensités.
import { S, $, ebSave } from "../state.js";
import { checkinSlideshowHTML, bindCheckinSlideshow } from "./checkin.js";
import { readinessDoneToday } from "./readiness.js";
import { loadChartSVG, progressBarCardHTML, predictionCardHTML, intensityCardHTML, historyCardHTML } from "./plan-view.js";
import { momentHTML, painBannerHTML, bindPainBanner, sickToggleHTML, bindSickToggle, heroSessionHTML } from "./tab-week.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { missedSessionsCheck } from "../notifications.js";
import { ensurePlan } from "./tabs.js";

const ROLE_LABEL = { warmup: "Échauffement", body: "Corps de séance", cooldown: "Retour au calme" };
function stepGroupsFor(session) {
  const steps = session.steps || [];
  const present = ["warmup", "body", "cooldown"].filter((r) => steps.some((s) => s.role === r));
  return present.length ? present : null;
}
function checklistStore(dateISO) {
  if (!S.answers.sessionChecklist || S.answers.sessionChecklist.date !== dateISO) {
    S.answers.sessionChecklist = { date: dateISO, items: {} };
  }
  return S.answers.sessionChecklist.items;
}
// Suivi en direct de la séance (déplacé de l'ancien onglet Suivi) : cocher au fil de la
// séance ; tout coché → le ✓ « fait » se coche pour toutes les séances du jour.
function todayChecklistHTML(resSessions, todayISO) {
  if (!resSessions.length) return "";
  const state = checklistStore(todayISO);
  let h = '<details class="load-card"><summary class="load-title">⏱ Suivre ma séance en direct</summary><div class="load-sub" style="margin-top:6px">Coche au fil de la séance : une fois tout fait, elle passe automatiquement en « ✓ ».</div>';
  resSessions.forEach((s, si) => {
    const groups = stepGroupsFor(s);
    h += '<div style="margin-top:8px"><b style="font-size:12px">' + s.name + "</b>";
    (groups || ["all"]).forEach((r) => {
      const k = si + "|" + r;
      h += '<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px"><input type="checkbox" data-ck="' + k + '"' + (state[k] ? " checked" : "") + ' style="width:20px;height:20px"><span>' + (ROLE_LABEL[r] || "Fait") + "</span></label>";
    });
    h += "</div>";
  });
  h += "</details>";
  return h;
}
function syncDoneFromChecklist(resSessions, plan, todayISO) {
  if (!resSessions.length) return;
  let w = null, d = null;
  plan.weeks.forEach((wk) => wk.days.forEach((dd) => { if (dd.date === todayISO) { w = wk; d = dd; } }));
  if (!w || !d) return;
  const state = checklistStore(todayISO);
  const allDone = resSessions.every((s, si) => {
    const groups = stepGroupsFor(s);
    const keys = groups ? groups.map((r) => si + "|" + r) : [si + "|all"];
    return keys.every((k) => state[k]);
  });
  if (!allDone) return;
  if (!S.answers.done) S.answers.done = {};
  d.sessions.forEach((s, si) => { if (s.d !== "rs") S.answers.done[w.num + "|" + d.jour + "|" + si] = true; });
}

// Course passée → saisie du chrono réel face à la prédiction (calibration honnête).
function raceResultCardHTML(plan) {
  const rd = S.answers.race_date, todayISO = new Date().toISOString().slice(0, 10);
  if (!rd || rd > todayISO) return "";
  if (S.answers.raceResult) {
    return '<div class="load-card"><div class="load-title">🏁 Ta course du ' + S.answers.raceResult.date + '</div>'
      + '<div class="load-sub" style="margin-top:6px"><b>Réalisé : ' + S.answers.raceResult.time + "</b>"
      + (S.answers.raceResult.predicted ? " · prédiction du moteur à l'époque : " + S.answers.raceResult.predicted : "")
      + '<br>Ce résultat réel servira de point de calibration pour tes prochaines prédictions.</div></div>';
  }
  let predNow = "";
  try { const pr = globalThis.EBV2.predict(S.sport, S.answers, plan); if (pr.items.length) predNow = pr.items.map((i) => i.leg + " " + i.value).join(" · "); } catch (e) {}
  return '<div class="load-card"><div class="load-title">🏁 Ta course est passée — quel chrono ?</div>'
    + '<div class="load-sub" style="margin-top:6px">' + (predNow ? "Le moteur prédisait : <b>" + predNow + "</b>. " : "") + "Note ton temps réel : il servira de point de calibration.</div>"
    + '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input type="text" id="pgRaceTime" placeholder="ex. 44:30 ou 3:42:10" style="flex:1;min-width:120px"><button class="btn primary" id="pgRaceSave" type="button">Enregistrer</button></div></div>';
}

export function renderTabToday(plan) {
  const today = new Date().toISOString().slice(0, 10);
  const moment = momentHTML(plan, today);

  // 1. Le diaporama d'accueil — AUCUNE séance visible avant d'avoir répondu (1×/jour)
  if (!readinessDoneToday()) {
    $("screen").innerHTML = moment + painBannerHTML() + checkinSlideshowHTML() + '<div class="card">' + sickToggleHTML(today) + "</div>";
    bindCheckinSlideshow(() => renderTabToday(plan), () => renderTabToday(plan));
    bindPainBanner(plan, () => renderTabToday(plan));
    bindSickToggle(plan, today);
    return;
  }

  // 2..6 — séance du jour, prédiction, charge, avancement, intensités
  let resSessions = [];
  try {
    const res = globalThis.EBV2.adjustToday(S.sport, S.answers, Object.assign({ date: today }, S.answers.readiness || {}));
    resSessions = res.sessions || [];
  } catch (e) {}

  let _totalS = 0;
  plan.weeks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((s) => { if (s.d !== "rs") _totalS++; })));
  const _doneN = S.answers.done ? Object.keys(S.answers.done).filter((k) => S.answers.done[k]).length : 0;

  let html = moment;
  html += painBannerHTML();
  html += retestBannerHTML(today);
  html += missedSessionsCheck(plan);
  html += heroSessionHTML(plan, today); // la séance du jour, EN PREMIER
  html += todayChecklistHTML(resSessions, today);
  html += '<div class="card"><div class="eyebrow">Ta préparation</div>';
  html += predictionCardHTML(plan);
  html += raceResultCardHTML(plan);
  html += '<div class="load-card"><div class="load-title">Charge estimée — fitness · fatigue · forme</div>' + loadChartSVG(plan)
    + '<div class="load-leg"><span style="color:#2e6bff">▬ Fitness (CTL)</span> · <span style="color:#ff7a1a">▬ Fatigue (ATL)</span> · <span style="color:#00a376">▬ Forme (TSB)</span></div>'
    + '<div class="load-sub">Estimée depuis la durée et l’intensité de chaque séance. La forme remonte à l’affûtage — c’est le but. Séances cochées : <b>' + _doneN + " / " + _totalS + "</b>" + (_totalS ? " (" + Math.round((_doneN / _totalS) * 100) + "%)" : "") + ".</div></div>";
  html += progressBarCardHTML(plan); // la barre d'avancement, liée à la même charge
  html += intensityCardHTML(plan);
  html += historyCardHTML(plan);
  html += "</div>";
  $("screen").innerHTML = html;

  bindPainBanner(plan, () => renderTabToday(plan));
  bindRetestBanner(today, () => renderTabToday(ensurePlan()));
  document.querySelectorAll("#screen [data-ck]").forEach((cb) => {
    cb.onchange = () => {
      const state = checklistStore(today);
      state[cb.dataset.ck] = cb.checked;
      syncDoneFromChecklist(resSessions, plan, today);
      ebSave();
    };
  });
  const rsBtn = $("pgRaceSave");
  if (rsBtn) rsBtn.onclick = () => {
    const t = (($("pgRaceTime") || {}).value || "").trim();
    if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) { alert("Format attendu : mm:ss ou h:mm:ss"); return; }
    let predicted = "";
    try { const pr = globalThis.EBV2.predict(S.sport, S.answers, plan); if (pr.items.length) predicted = pr.items.map((i) => i.leg + " " + i.value).join(" · "); } catch (e) {}
    S.answers.raceResult = { date: S.answers.race_date, time: t, predicted };
    ebSave();
    renderTabToday(plan);
  };
}
