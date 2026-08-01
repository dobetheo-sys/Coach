// Onglet 📅 Semaine — LA semaine, et rien d'autre.
//
// R18.3 — retour à cinq onglets (retour du fondateur après test : « je préférais 5 onglets
// que 4, l'œil humain aime les chiffres impairs »). 🎯 Aujourd'hui reprend la position
// CENTRALE, la troisième sur cinq — ce qui était l'intention de R5 et qu'un nombre pair
// rendait impossible à tenir.
//
// CE QU'ON NE RESTAURE PAS. R16.9 avait fondu cet onglet dans 🗓 Plan et, ce faisant, avait
// trouvé un vrai défaut : la coche existait en DEUX versions. Celle de Semaine ouvrait le
// feedback RPE, la célébration et les badges ; celle de Plan basculait un booléen en silence.
// Conséquence invisible et sérieuse : cocher depuis Plan ne produisait aucun `completion`,
// donc aucun RPE, donc l'ajusteur du lendemain sous-estimait la fatigue et le drapeau douleur
// ne pouvait jamais se poser. Cet onglet-ci ne redessine RIEN : il consomme `weekGridHTML` et
// `toggleDone`, les mêmes que 🗓 Plan. Un geste, une implémentation — c'est la seule façon de
// rendre un onglet sans rendre aussi sa divergence.
//
// Ce qui relève du QUOTIDIEN (check-in, contenu du jour, bilan hebdo, rappel, journal des
// adaptations) reste dans 🎯 Aujourd'hui : cet onglet ne le duplique pas non plus. Il apporte
// ce que ni Plan ni Aujourd'hui ne donnent — la NAVIGATION de semaine en semaine, avec le
// bilan de celle qu'on regarde.
import { $, S, ebSave, fmtDay, todayISO } from "../state.js";
import { weekGridHTML, weekHeaderHTML, currentWeek, handleSwapClick } from "./tab-plan-general.js";
import { momentHTML, painBannerHTML, bindPainBanner, toggleDone } from "./session-life.js";
import { readinessDoneToday } from "./readiness.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { ensurePlan, setTab } from "./tabs.js";

/** Semaine affichée. Non persistée : revenir sur l'onglet ramène à la semaine courante —
 *  c'est la semaine EN COURS qui est le sujet, la navigation n'est qu'une consultation. */
let vue = null;

function semaineAffichee(plan) {
  const w = plan.weeks.find((x) => x.num === vue);
  return w || currentWeek(plan);
}

/** Le bilan de la semaine REGARDÉE : ce qui est fait, ce qui reste, et la part de facile.
 *  Compté sur le plan, pas sur le DOM — la vue n'est jamais la source de vérité. */
function bilanHTML(plan, w) {
  let total = 0, faites = 0, minutes = 0, minFacile = 0;
  w.days.forEach((d) => d.sessions.forEach((s, si) => {
    if (s.d === "rs") return;
    total++;
    if (S.answers.done && S.answers.done[w.num + "|" + d.jour + "|" + si]) faites++;
    minutes += s.min || 0;
    if (d.charge === "facile" || d.charge === "recup") minFacile += s.min || 0;
  }));
  if (!total) return '<div class="load-sub">Semaine de repos complet.</div>';
  const pct = Math.round((faites / total) * 100);
  const pctFacile = minutes ? Math.round((minFacile / minutes) * 100) : 0;
  return '<div class="load-sub" style="margin-top:8px">'
    + "<b>" + faites + "/" + total + " séances</b> validées · " + Math.round(minutes / 6) / 10 + " h au programme"
    + (pctFacile ? " · " + pctFacile + " % en facile" : "")
    + '<div style="background:var(--bg2,#e8e0cf);border:1px solid #16130e;border-radius:4px;height:8px;overflow:hidden;margin-top:5px">'
    + '<div style="height:100%;width:' + pct + '%;background:' + (w.phase.c || "#00a376") + '"></div></div></div>';
}

function navHTML(plan, w) {
  const i = plan.weeks.indexOf(w);
  const prev = plan.weeks[i - 1], next = plan.weeks[i + 1];
  const cur = currentWeek(plan);
  return '<div class="nav" style="gap:8px;margin-top:12px;flex-wrap:wrap">'
    + '<button class="btn" type="button" id="wkPrev"' + (prev ? "" : " disabled") + ">← Semaine " + (prev ? prev.num : "—") + "</button>"
    + (w.num !== cur.num ? '<button class="btn gold" type="button" id="wkNow">⌖ Revenir à cette semaine</button>' : "")
    + '<button class="btn" type="button" id="wkNext"' + (next ? "" : " disabled") + ">Semaine " + (next ? next.num : "—") + " →</button></div>";
}

export function renderTabWeek(plan) {
  const today = todayISO();
  const w = semaineAffichee(plan);
  const rerender = (pl) => renderTabWeek(pl || plan);

  let html = momentHTML(plan, today) + painBannerHTML() + retestBannerHTML(today);

  // R16.9 avait remplacé la REDIRECTION brutale vers Aujourd'hui par une invitation, et
  // c'était le bon geste : consulter sa semaine n'est pas dangereux, montrer une séance du
  // jour NON adaptée à la forme du matin, si. On garde l'invitation, la grille reste lisible.
  if (!readinessDoneToday()) {
    html += '<div class="card"><div class="eyebrow">Ton point du matin</div>'
      + '<div class="load-sub">Pas encore fait — la séance d’aujourd’hui n’est donc pas encore adaptée à ta forme. '
      + "Une minute suffit, et tu récupères une semaine juste.</div>"
      + '<div class="nav" style="margin-top:10px"><button class="btn primary" id="wkGoCheckin" type="button">→ Faire mon point du matin</button></div></div>';
  }

  html += '<div class="card"><div class="eyebrow">📅 Ta semaine</div>'
    + '<div class="gw">' + weekHeaderHTML(w) + weekGridHTML(plan, w, today) + "</div>";
  if (S._swapPending && S._swapPending.w === w.num)
    html += '<div class="load-sub" style="margin-top:6px">⇄ <b>' + S._swapPending.jour + "</b> sélectionné — touche le jour avec lequel l’échanger (ou re-touche ⇄ pour annuler).</div>";
  else
    html += '<div class="load-sub" style="margin-top:6px">⇄ pour échanger deux jours · ○ pour valider une séance · touche une séance pour son détail.</div>';
  html += bilanHTML(plan, w);
  html += navHTML(plan, w);
  html += "</div>";

  $("screen").innerHTML = html;
  bindPainBanner(plan, rerender);
  bindRetestBanner(today, () => renderTabWeek(ensurePlan()));
  {
    const g = $("wkGoCheckin");
    if (g) g.onclick = () => setTab("today");
  }
  const i = plan.weeks.indexOf(w);
  const go = (n) => { vue = n; renderTabWeek(plan); window.scrollTo(0, 0); };
  const p = $("wkPrev"); if (p && plan.weeks[i - 1]) p.onclick = () => go(plan.weeks[i - 1].num);
  const n = $("wkNext"); if (n && plan.weeks[i + 1]) n.onclick = () => go(plan.weeks[i + 1].num);
  const c = $("wkNow"); if (c) c.onclick = () => { vue = null; renderTabWeek(plan); window.scrollTo(0, 0); };
  document.querySelectorAll("#screen [data-swap]").forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const [wn, jour] = b.dataset.swap.split("|");
      handleSwapClick(plan, +wn, jour, rerender);
    };
  });
  document.querySelectorAll("#screen .doneBtn").forEach((b) => {
    b.onclick = () => toggleDone(plan, b.dataset.dk, today, rerender);
  });
  ebSave();
}
