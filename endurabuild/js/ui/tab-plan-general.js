// Onglet 🗓 Plan général — vision macro de la saison, contenu stable consulté rarement :
// bandeau « ce qui pilote ton plan », phases, barres de volume, calendrier, exports.
// La prédiction de course N'EST PAS ici (brief onglets) — elle vit dans 📈 Avancement.
import { SPORTS } from "../config.js";
import { $, S, ebSave } from "../state.js";
import { curSteps, renderStep, reset } from "./steps.js";
import { driverBand, downloadPlan, decisionsCardHTML } from "./plan-view.js";
import { exportICS, exportJSON, exportPNG } from "../export.js";

const ic = { sw: "\u{1F3CA}", bk: "\u{1F6B4}", rn: "\u{1F3C3}", br: "\u{1F501}", rs: "\u{1F4AA}" };

// R5 — le bandeau rouge « réserves » est retiré (retour utilisateur : langage de
// développeur, pas de client). Les limites éventuelles du plan restent lisibles dans
// « Les décisions du moteur » ci-dessous, en langage neutre.

// R5 — chaque PHASE est un SOUS-OBJECTIF cliquable : son intention en une phrase, ses
// semaines, sa progression réelle (✓ des séances) et son état (validée / en cours / à
// venir). La validation d'une phase = toutes ses semaines passées ET régulières (≥80%).
const PHASE_GOALS = {
  base: "Construire la fondation : du volume facile, le corps apprend à encaisser.",
  dev: "Développer : les séances de qualité arrivent, la charge monte prudemment.",
  spec: "Se rapprocher de la course : intensités et formats spécifiques à ton objectif.",
  peak: "La semaine la plus haute — tout le travail se cristallise ici.",
  taper: "Affûtage : le volume descend, la forme monte. Ne rien rajouter.",
  recup: "Récupérer — c'est là que le corps progresse vraiment.",
};
function phaseObjectivesHTML(plan) {
  if (!globalThis.EBV2 || !globalThis.EBV2.progress) return "";
  let weekly = [];
  try { weekly = globalThis.EBV2.progress(plan, S.answers, new Date().toISOString().slice(0, 10)).weekly || []; } catch (e) { return ""; }
  const byNum = {};
  weekly.forEach((w) => { byNum[w.num] = w; });
  let h = '<div class="load-card"><div class="load-title">🎯 Sous-objectifs — une phase à la fois</div>';
  plan.phases.forEach((p) => {
    const wks = plan.weeks.filter((w) => w.phase && w.phase.nom === p.nom);
    const rows = wks.map((w) => byNum[w.num]).filter(Boolean);
    const past = rows.filter((r) => r.complete);
    const okN = past.filter((r) => r.ok).length;
    const started = past.length > 0;
    const validated = wks.length > 0 && past.length === rows.length && rows.length > 0 && okN === past.length;
    const pct = rows.length ? Math.round((okN / rows.length) * 100) : 0;
    const state = validated ? "✅ validée" : started ? "en cours" : "à venir";
    h += '<details class="ph-obj" style="margin-top:8px;border-left:4px solid ' + p.c + ';padding-left:10px"><summary style="cursor:pointer;font-size:13px"><b>' + p.nom + "</b> · " + wks.length + " sem — <i>" + state + "</i>"
      + '<div style="background:var(--bg2,#e8e0cf);border:1px solid #16130e;border-radius:4px;height:8px;overflow:hidden;margin-top:4px"><div style="height:100%;width:' + pct + "%;background:" + p.c + '"></div></div></summary>'
      + '<div class="load-sub" style="margin-top:6px">' + (PHASE_GOALS[(p.id || "").toLowerCase()] || PHASE_GOALS[p.nom ? p.nom.toLowerCase().slice(0, 4) : ""] || "Une étape du plan, au service de la suivante.") + "</div>";
    wks.forEach((w) => {
      const r = byNum[w.num];
      const mark = !r || !r.complete ? "○ à venir" : r.ok ? "✅ régulière" : "◐ " + r.done + "/" + r.total + " séances";
      h += '<div style="font-size:12px;margin-top:3px">Semaine ' + w.num + " · " + w.vol + "h" + (w.isRecup ? " (récup)" : "") + " — " + mark + "</div>";
    });
    h += "</details>";
  });
  h += '<div class="load-sub" style="margin-top:8px">Une phase se valide quand toutes ses semaines sont passées ET régulières (≥80% des séances) — la régularité, pas la perfection.</div></div>';
  return h;
}

export function renderTabPlanGeneral(plan) {
  const a = S.answers;
  let html = "";
  html += '<div class="card"><div class="eyebrow">Plan général — ' + SPORTS[S.sport].nom + "</div><h2>Ta saison en un coup d’œil</h2>"
    + '<div class="why">' + plan.totalWeeks + " semaines en " + (plan.use10 ? "cycles de 10 jours (qui glissent)" : "semaines de 7 jours") + ", volume " + plan.volBase + "h → " + plan.volPeak + "h.</div>";
  html += driverBand(a);
  html += '<div class="ph-line">';
  plan.phases.forEach((p) => { html += '<div class="ph-seg" style="flex:' + p.weeks + ";background:" + p.c + "22;border-color:" + p.c + '"><span>' + p.nom + "</span><em>" + p.weeks + "sem</em></div>"; });
  html += "</div>";
  html += phaseObjectivesHTML(plan);
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
        // R5 — séance cliquable partout (détail replié + affordance visuelle via CSS .gd-sess)
        return chk + (s.det
          ? '<details class="gd-sess"><summary><b>' + s.name + "</b></summary><span class=\"gd-det\">" + s.det + "</span></details>"
          : "<b>" + s.name + "</b>");
      }).join("");
      html += '<div class="gd ' + d.charge + '"><div class="gd-top"><b>' + d.jour + "</b>" + (plan.use10 ? "<i>C" + d.cyc + "J" + d.jc + "</i>" : "") + '</div><div class="gd-badges">' + bg + '</div><div class="gd-n">' + nm + "</div></div>";
    });
    html += "</div></div>";
  });
  html += decisionsCardHTML(plan); // « Les décisions du moteur » — la transparence, en langage neutre
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
