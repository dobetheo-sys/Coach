// Onglet 🗓 Plan général — vision macro de la saison, contenu stable consulté rarement :
// bandeau « ce qui pilote ton plan », phases, barres de volume, calendrier, exports.
// La prédiction de course N'EST PAS ici (brief onglets) — elle vit dans 📈 Avancement.
import { SPORTS } from "../config.js";
import { $, S, ebSave } from "../state.js";
import { curSteps, renderStep, reset } from "./steps.js";
import { driverBand, downloadPlan } from "./plan-view.js";
import { exportICS, exportJSON, exportPNG } from "../export.js";

const ic = { sw: "\u{1F3CA}", bk: "\u{1F6B4}", rn: "\u{1F3C3}", br: "\u{1F501}", rs: "\u{1F4AA}" };

// R4-0.1 — les réserves du moteur (plan._v2.warnings : contrainte insatisfaisable après
// réparation, ex. drapeau médical) étaient noyées dans le <details> « Décisions du
// moteur », replié par défaut : un athlète pouvait ne JAMAIS voir que son plan est
// structurellement incomplet. Bandeau non-repliable ici, tant que le repli n'a pas été
// explicitement ouvert (S.answers.warningsAck mémorise LE TEXTE acquitté — de nouvelles
// réserves après régénération font revenir le bandeau, pas juste au premier rendu).
export function warningsBannerHTML(plan) {
  const warns = (plan && plan._v2 && plan._v2.warnings) || [];
  if (!warns.length) return "";
  if (S.answers.warningsAck === warns.join("|")) return "";
  return '<div class="warn" style="background:#ffe3e0;font-weight:600">⚠️ <b>Ce plan a des réserves.</b> '
    + warns.map((w) => '<div style="font-weight:500;margin-top:4px">• ' + w + "</div>").join("")
    + '<div style="font-weight:500;margin-top:6px;font-size:12px">Détail et justifications dans 📈 Avancement → « Les décisions du moteur » — ce bandeau restera affiché tant que tu ne les auras pas ouvertes.</div></div>';
}

export function renderTabPlanGeneral(plan) {
  const a = S.answers;
  let html = warningsBannerHTML(plan);
  html += '<div class="card"><div class="eyebrow">Plan général — ' + SPORTS[S.sport].nom + "</div><h2>Ta saison en un coup d’œil</h2>"
    + '<div class="why">' + plan.totalWeeks + " semaines en " + (plan.use10 ? "cycles de 10 jours (qui glissent)" : "semaines de 7 jours") + ", volume " + plan.volBase + "h → " + plan.volPeak + "h.</div>";
  html += driverBand(a);
  html += '<div class="ph-line">';
  plan.phases.forEach((p) => { html += '<div class="ph-seg" style="flex:' + p.weeks + ";background:" + p.c + "22;border-color:" + p.c + '"><span>' + p.nom + "</span><em>" + p.weeks + "sem</em></div>"; });
  html += "</div>";
  html += '<div class="vol-bars">';
  plan.weeks.forEach((w) => { const h = Math.max(8, Math.round((w.vol / plan.volPeak) * 52)); html += '<div class="vb" style="height:' + h + "px;background:" + (w.isRecup ? "#9b72ff" : w.phase.c) + '" title="S' + w.num + " " + w.vol + 'h"></div>'; });
  html += '</div><div class="vol-cap">1 barre = 1 semaine · violet = récup</div>';
  const show = S.showAllWeeks ? plan.weeks : [...plan.weeks.slice(0, 3), plan.weeks[plan.weeks.length - 1]];
  show.forEach((w, ix) => {
    if (!S.showAllWeeks && ix === 3) html += '<div class="wk-skip">⋯ semaines 4 à ' + (plan.totalWeeks - 1) + " ⋯</div>";
    const raceTag = w.race ? ' <span style="background:#ff3b30;color:#fff;border-radius:5px;padding:1px 7px;font-size:10px;font-weight:700">🏁 COURSE ' + w.race + "</span>" : (w.postRace ? ' <span style="color:#9b72ff;font-size:10px">↳ récup post-course</span>' : "");
    html += '<div class="gw"><div class="gw-h"><b>Semaine ' + w.num + '</b><span style="color:' + w.phase.c + '">' + w.phase.nom + "</span>" + raceTag + "<em>" + w.vol + "h" + (w.isRecup ? " récup" : "") + '</em></div><div class="gw-grid">';
    w.days.forEach((d) => {
      const bg = d.sessions.map((s) => "<span>" + ic[s.d] + "</span>").join("");
      const nm = d.sessions.map((s, si) => {
        const k = w.num + "|" + d.jour + "|" + si;
        const dn = S.answers.done && S.answers.done[k];
        const chk = s.d !== "rs" ? '<button class="doneBtn' + (dn ? " done" : "") + '" type="button" data-dk="' + k + '" title="Marquer fait">' + (dn ? "✓" : "○") + "</button> " : "";
        return chk + "<b>" + s.name + "</b>" + (s.det ? '<span class="gd-det">' + s.det + "</span>" : "");
      }).join("");
      html += '<div class="gd ' + d.charge + '"><div class="gd-top"><b>' + d.jour + "</b>" + (plan.use10 ? "<i>C" + d.cyc + "J" + d.jc + "</i>" : "") + '</div><div class="gd-badges">' + bg + '</div><div class="gd-n">' + nm + "</div></div>";
    });
    html += "</div></div>";
  });
  html += '<div class="warn" style="background:var(--bg2)">Intensités calibrées sur tes données. Les exports fonctionnent depuis cet onglet, quel que soit l’onglet consulté ensuite.</div>'
    + '<div class="nav" style="flex-wrap:wrap;gap:10px"><button class="btn" id="backBp" type="button">← Modifier</button><button class="btn gold" id="allW" type="button">' + (S.showAllWeeks ? "Réduire" : "Voir les " + plan.totalWeeks + " semaines") + '</button><button class="btn primary" id="prn" type="button">🖨 HTML</button><button class="btn" id="expIcs" type="button">📅 Agenda (.ics)</button><button class="btn" id="expJson" type="button">{ } JSON</button><button class="btn" id="expPng" type="button">🖼 PNG</button><button class="btn" id="restartBtn" type="button">Changer de sport</button></div></div>';
  $("screen").innerHTML = html;
  $("backBp").onclick = () => { S.step = curSteps().length - 1; renderStep(); };
  $("allW").onclick = () => { S.showAllWeeks = !S.showAllWeeks; renderTabPlanGeneral(plan); window.scrollTo(0, 0); }; // re-rend la VUE — pas de buildPlan
  $("prn").onclick = () => downloadPlan();
  $("expIcs").onclick = () => exportICS();
  $("expJson").onclick = () => exportJSON();
  $("expPng").onclick = () => exportPNG();
  $("restartBtn").onclick = () => reset();
  document.querySelectorAll("#screen .doneBtn").forEach((b) => {
    b.onclick = () => {
      if (!S.answers.done) S.answers.done = {};
      const k = b.dataset.dk;
      if (S.answers.done[k]) delete S.answers.done[k];
      else S.answers.done[k] = true;
      ebSave();
      const sc = window.pageYOffset;
      renderTabPlanGeneral(plan); // re-rend la VUE — le plan n'est pas recalculé
      window.scrollTo(0, sc);
    };
  });
}
