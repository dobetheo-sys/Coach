// Onglet 📈 Avancement — le suivi vivant : charge (CTL/ATL/TSB), régularité/badges,
// intensités, historique prévu vs réel, PRÉDICTION DE COURSE (déplacée ici — elle dépend
// du streak et de la charge accomplie), décisions du moteur.
import { $, S } from "../state.js";
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
}
