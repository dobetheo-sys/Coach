// Onglet 📅 Plan de la semaine — l'écran du quotidien, LÉGER : uniquement la semaine
// en cours, la coche des séances, et « Forme du jour » au plus près de l'action.
import { S, $, ebSave } from "../state.js";
import { readinessCardHTML } from "./plan-view.js";
import { applyReadiness } from "./readiness.js";

const ic = { sw: "\u{1F3CA}", bk: "\u{1F6B4}", rn: "\u{1F3C3}", br: "\u{1F501}", rs: "\u{1F4AA}" };

function currentWeek(plan) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    plan.weeks.find((w) => w.days.some((d) => d.date === today)) ||
    plan.weeks.find((w) => w.days.some((d) => d.date >= today)) ||
    plan.weeks[0]
  );
}

export function renderTabWeek(plan) {
  const w = currentWeek(plan);
  const raceTag = w.race
    ? ' <span style="background:#ff3b30;color:#fff;border-radius:5px;padding:1px 7px;font-size:10px;font-weight:700">\u{1F3C1} COURSE ' + w.race + "</span>"
    : w.postRace ? ' <span style="color:#9b72ff;font-size:10px">↳ récup post-course</span>' : "";
  let html = '<div class="card"><div class="eyebrow">Ta semaine</div>';
  html += '<div class="gw"><div class="gw-h"><b>Semaine ' + w.num + "</b><span style=\"color:" + (w.phase.c || "#555") + '">' + w.phase.nom + "</span>" + raceTag + "<em>" + w.vol + "h" + (w.isRecup ? " récup" : "") + "</em></div>";
  const today = new Date().toISOString().slice(0, 10);
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
    html += '<div class="gd ' + d.charge + (d.date === today ? " today" : "") + '"><div class="gd-top"><b>' + d.jour + "</b>" + (d.date === today ? "<i>aujourd’hui</i>" : "") + '</div><div class="gd-badges">' + bg + '</div><div class="gd-n">' + nm + "</div></div>";
  });
  html += "</div></div>";
  html += readinessCardHTML();
  html += "</div>";
  $("screen").innerHTML = html;
  const _rb = $("rdApply");
  if (_rb) _rb.onclick = applyReadiness;
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
