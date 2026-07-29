// Conteneur d'onglets — navigation seule, AUCUNE logique métier (brief onglets).
// RÈGLE DE FOND : le plan est généré UNE fois (S.currentPlan) ; un changement
// d'onglet ne rappelle JAMAIS buildPlan — les onglets sont des vues du même objet.
import { S, $, ebSave, todayISO } from "../state.js";
import { buildPlan } from "../app.js";
import { renderTabProfile } from "./tab-profile.js";
import { renderTabPlanGeneral } from "./tab-plan-general.js";
import { renderTabToday } from "./tab-today.js";
import { renderTabWeek } from "./tab-week.js";
import { renderTabNutrition } from "./tab-nutrition.js";

// Refonte R5 (retour utilisateur) : l'onglet CENTRAL 🎯 Aujourd'hui est l'écran du
// quotidien (check-in diaporama → séance du jour → prédiction → charge → avancement),
// mis en valeur dans la barre (classe tab-central). L'ancien Avancement y est fondu,
// l'ancien Suivi est redistribué (avatar/badges → Profil, checklist → Aujourd'hui),
// et 🥗 Nutrition devient un onglet à part entière.
const TABS = [
  ["profile", "\u{1F4CB}", "Profil", renderTabProfile],
  ["general", "\u{1F5D3}", "Plan", renderTabPlanGeneral],
  ["today", "\u{1F3AF}", "Aujourd’hui", renderTabToday],
  ["week", "\u{1F4C5}", "Semaine", renderTabWeek],
  ["nutrition", "\u{1F957}", "Nutrition", renderTabNutrition],
];

let activeTab = "today"; // défaut : l'onglet central — le point du matin d'abord

/** Le SEUL endroit où le plan se (re)calcule. Invalidé par reset/Modifier/édition profil. */
export function ensurePlan() {
  if (!S.currentPlan) {
    // Ancre calendaire : posée UNE fois à la première génération — sans elle, la semaine 1
    // re-glisserait au lundi courant à chaque ouverture et le plan n'avancerait jamais.
    if (!S.answers.plan_start) { S.answers.plan_start = todayISO(); ebSave(); }
    S.currentPlan = buildPlan(S.answers);
    applyDaySwaps(S.currentPlan); // déplacements de séances persistants (voir plus bas)
  }
  return S.currentPlan;
}

// Déplacement de séance persistant (spec rétention §8) : l'utilisateur peut échanger deux
// jours d'une même semaine. Les échanges sont stockés (answers.daySwaps) et RÉAPPLIQUÉS à
// l'identique après chaque régénération (le plan est recalculé à chaque ouverture) — le
// moteur garde la main sur la structure, l'utilisateur sur le calendrier de sa semaine.
export function applyDaySwaps(plan) {
  const swaps = Array.isArray(S.answers.daySwaps) ? S.answers.daySwaps : [];
  for (const [wn, jA, jB] of swaps) {
    const w = plan.weeks.find((x) => x.num === wn);
    if (!w) continue;
    const a = w.days.find((d) => d.jour === jA), b = w.days.find((d) => d.jour === jB);
    if (!a || !b) continue;
    [a.sessions, b.sessions] = [b.sessions, a.sessions];
    [a.charge, b.charge] = [b.charge, a.charge];
    [a.slot, b.slot] = [b.slot, a.slot];
  }
}
export function invalidatePlan() {
  S.currentPlan = null;
}

function tabbarHTML() {
  return TABS.map(
    ([id, ico, label]) =>
      '<button type="button" role="tab" class="tabbtn' + (id === activeTab ? " active" : "") + (id === "today" ? " tab-central" : "") + '" data-tab="' + id + '" aria-selected="' + (id === activeTab) + '" aria-label="' + label + '">' +
      '<span class="tabico" aria-hidden="true">' + ico + '</span><span class="tablbl">' + label + "</span></button>"
  ).join("");
}

function renderActiveTab() {
  const plan = ensurePlan();
  const screen = $("screen");
  if (screen) screen.setAttribute("role", "tabpanel");
  const tab = TABS.find((t) => t[0] === activeTab) || TABS[TABS.length - 1];
  tab[3](plan);
  const bar = $("ebTabbar");
  if (bar) bar.innerHTML = tabbarHTML();
  bindTabbar();
  window.scrollTo(0, 0);
}

function bindTabbar() {
  document.querySelectorAll("#ebTabbar .tabbtn").forEach((b) => {
    b.onclick = () => setTab(b.dataset.tab);
  });
}

export function setTab(id) {
  activeTab = id;
  renderActiveTab(); // re-rend la VUE seulement — S.currentPlan est réutilisé tel quel
}

/** Point d'entrée après génération (remplace l'ancien renderPlan monolithique). */
export function renderTabs() {
  S.onPlan = true;
  ebSave();
  document.body.classList.add("has-tabs");
  let bar = $("ebTabbar");
  if (!bar) {
    bar = document.createElement("nav");
    bar.id = "ebTabbar";
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", "Navigation du plan");
    document.body.appendChild(bar);
  }
  renderActiveTab();
}

/** Sortie de la vue plan (retour questionnaire / reset) : la barre disparaît. */
export function hideTabs() {
  document.body.classList.remove("has-tabs");
  const bar = $("ebTabbar");
  if (bar) bar.remove();
}
