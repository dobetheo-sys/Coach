// Onglet 📈 Avancement — le suivi vivant : charge (CTL/ATL/TSB), régularité/badges,
// intensités, historique prévu vs réel, PRÉDICTION DE COURSE (déplacée ici — elle dépend
// du streak et de la charge accomplie), décisions du moteur.
import { $, S, ebSave } from "../state.js";
import { loadChartSVG, progressCardsHTML } from "./plan-view.js";
import { evalRules, rulesGrouped } from "./steps.js";

export function renderTabProgress(plan) {
  let _totalS = 0;
  plan.weeks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((s) => { if (s.d !== "rs") _totalS++; })));
  const _doneN = S.answers.done ? Object.keys(S.answers.done).filter((k) => S.answers.done[k]).length : 0;
  let html = '<div class="card"><div class="eyebrow">Avancement</div><h2>Où tu en es</h2>';
  html += '<div class="load-card"><div class="load-title">Charge estimée — fitness · fatigue · forme</div>' + loadChartSVG(plan)
    + '<div class="load-leg"><span style="color:#2e6bff">▬ Fitness (CTL)</span> · <span style="color:#ff7a1a">▬ Fatigue (ATL)</span> · <span style="color:#00a376">▬ Forme (TSB)</span></div>'
    + '<div class="load-sub">Estimée sans capteur, depuis la durée et l’intensité de chaque séance (modèle TSS/CTL/ATL). La forme remonte à l’affûtage — c’est le but. Coche tes séances (○ → ✓ dans l’onglet 📅 Semaine) : <b>' + _doneN + " / " + _totalS + "</b> faites" + (_totalS ? " (" + Math.round((_doneN / _totalS) * 100) + "%)" : "") + ".</div></div>";
  // Historique des adaptations quotidiennes : le plan n'est pas un PDF — le montrer.
  const rlog = Array.isArray(S.answers.readinessLog) ? S.answers.readinessLog : [];
  if (rlog.length) {
    const ic = { verte: "🟢", orange: "🟠", rouge: "🔴" };
    const lbl = { keep: "maintenue", reduce: "réduite", replace: "remplacée par endurance", rest: "repos", off: "repos complet" };
    const nAdapt = rlog.filter((x) => x.action !== "keep").length;
    html += '<details class="load-card"><summary class="load-title">🤖 Adaptations quotidiennes (' + rlog.length + " check-ins · " + nAdapt + " ajustement" + (nAdapt > 1 ? "s" : "") + ")</summary>";
    rlog.slice(-10).reverse().forEach((x) => { html += '<div style="font-size:12px;margin:4px 0">' + (ic[x.level] || "") + " " + x.date + " — séance " + (lbl[x.action] || x.action) + "</div>"; });
    html += '<div class="load-sub" style="margin-top:4px">C’est la différence entre un plan PDF et un coach : chaque matin, la séance s’ajuste à ta forme réelle.</div></details>';
  }
  // Course passée → saisir le résultat réel, comparé à la prédiction (calibration honnête)
  const rd = S.answers.race_date, todayISO2 = new Date().toISOString().slice(0, 10);
  if (rd && rd <= todayISO2) {
    if (S.answers.raceResult) {
      html += '<div class="load-card"><div class="load-title">🏁 Ta course du ' + S.answers.raceResult.date + '</div>'
        + '<div class="load-sub" style="margin-top:6px"><b>Réalisé : ' + S.answers.raceResult.time + "</b>"
        + (S.answers.raceResult.predicted ? " · prédiction du moteur à l'époque : " + S.answers.raceResult.predicted : "")
        + '<br>Ce résultat réel servira de point de calibration pour tes prochaines prédictions.</div></div>';
    } else {
      let predNow = "";
      try { const pr = globalThis.EBV2.predict(S.sport, S.answers, plan); if (pr.items.length) predNow = pr.items.map((i) => i.leg + " " + i.value).join(" · "); } catch (e) {}
      html += '<div class="load-card"><div class="load-title">🏁 Ta course est passée — quel chrono ?</div>'
        + '<div class="load-sub" style="margin-top:6px">' + (predNow ? "Le moteur prédisait : <b>" + predNow + "</b>. " : "") + "Note ton temps réel : il servira de point de calibration.</div>"
        + '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input type="text" id="pgRaceTime" placeholder="ex. 44:30 ou 3:42:10" style="flex:1;min-width:120px"><button class="btn primary" id="pgRaceSave" type="button">Enregistrer</button></div></div>';
    }
  }
  html += progressCardsHTML(plan);
  // Conseils personnalisés (evalRules) — chaque réponse du questionnaire qui n'agit pas
  // directement sur le contenu du plan (ferritine, cycle menstruel, levier poids, garde-fous
  // santé…) doit quand même être VISIBLE quelque part : sinon répondre à la question ne sert
  // à rien pour l'utilisateur. Auparavant calculé mais affiché seulement dans l'export HTML.
  const rules = evalRules(S.answers, S.tier);
  if (rules.length) {
    html += '<details class="load-card"><summary class="load-title">\u{1F9ED} Conseils personnalisés (' + rules.length + ")</summary>"
      + '<div style="margin-top:8px">' + rulesGrouped(rules) + "</div></details>";
  }
  html += "</div>";
  $("screen").innerHTML = html;
  const rsBtn = $("pgRaceSave");
  if (rsBtn) rsBtn.onclick = () => {
    const t = ($("pgRaceTime") || {}).value.trim();
    if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) { alert("Format attendu : mm:ss ou h:mm:ss"); return; }
    let predicted = "";
    try { const pr = globalThis.EBV2.predict(S.sport, S.answers, plan); if (pr.items.length) predicted = pr.items.map((i) => i.leg + " " + i.value).join(" · "); } catch (e) {}
    S.answers.raceResult = { date: S.answers.race_date, time: t, predicted };
    ebSave();
    renderTabProgress(plan);
  };
  // R4-0.1 — ouvrir « Les décisions du moteur » acquitte les réserves du plan : le
  // bandeau d'alerte de l'onglet 🗓 Plan disparaît (jusqu'à de NOUVELLES réserves).
  const md = $("motorDecisions");
  if (md) md.addEventListener("toggle", () => {
    if (md.open && plan && plan._v2 && plan._v2.warnings && plan._v2.warnings.length) {
      S.answers.warningsAck = plan._v2.warnings.join("|");
      ebSave();
    }
  });
}
