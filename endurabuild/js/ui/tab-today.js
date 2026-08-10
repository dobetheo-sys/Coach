// Onglet 🎯 Aujourd'hui — l'onglet CENTRAL (retour utilisateur R5), mis en valeur dans la
// barre. Ordre imposé : 1) check-in du matin en diaporama (aucune séance avant d'avoir
// répondu, une fois par jour) ; 2) la séance du jour DÉJÀ adaptée au verdict ; 3) la
// prédiction de course ; 4) la courbe charge/fatigue/forme ; 5) la barre d'avancement de
// la prépa (liée à la même charge) ; 6) la répartition des intensités.
// R16.9 — la fusion de 📅 Semaine dans 🗓 Plan lui a aussi transmis le QUOTIDIEN, qui n'avait
// rien à faire dans une vue de saison : contenu du jour, bilan hebdo, réglage du rappel,
// déclaration de maladie, journal des adaptations, retouche de la forme du jour. Ils
// arrivent après le bloc « Ta préparation », donc après le check-in dont ils dépendent.
import { S, $, ebSave, fmtDay, todayISO } from "../state.js";
import { checkinSlideshowHTML, bindCheckinSlideshow, pointLabelInline } from "./checkin.js";
import { loadChartSVG, bindLoadChart, historyCardHTML, readinessCardHTML } from "./plan-view.js";
import { nutritionCardHTML, energyCardHTML } from "./tab-nutrition.js";
import { momentHTML, painBannerHTML, bindPainBanner, sickToggleHTML, bindSickToggle, heroSessionHTML, feedbackModal, showCongrats } from "./session-life.js";
import { readinessDoneToday, applyReadiness, fetchWeather } from "./readiness.js";
import { dailyContentHTML, microDefiHTML } from "./daily-content.js";
import { scheduleDailyNotification, weeklyReviewHTML, missedSessionsCheck } from "../notifications.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { ensurePlan } from "./tabs.js";
import { VERDICT_ICON } from "./icons.js";
import { noteRaceResult } from "../projection-log.js"; // A-5
import { bindFormRing, drawCheckOnButton, floatXP, xpSnapshot, xpDelta, bindStickyValidate, revealWeather } from "./motion.js"; // R25.3

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
// R23.12b — « SUIVRE MA SÉANCE EN DIRECT » EST SUPPRIMÉ.
//
// Décision du fondateur (06/08/2026) : « personne ne fait ça ». Le bloc proposait de cocher les
// étapes au fil de la séance ; il supposait qu'on tienne son téléphone en main pendant l'effort.
// La validation POST-séance reste, elle, et c'est elle qui nourrit la boucle (feedback → RPE →
// célébration). Rien d'autre ne consommait cette fonction.
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

// R6 — VALIDATION de la séance depuis Aujourd'hui : gros bouton par séance planifiée du
// jour (même clé « fait », même boucle feedback → célébration → partages que la grille).
function todayValidateHTML(plan, todayISO) {
  let w = null, d = null;
  plan.weeks.forEach((wk) => wk.days.forEach((dd) => { if (dd.date === todayISO) { w = wk; d = dd; } }));
  if (!w || !d) return "";
  let h = "";
  d.sessions.forEach((s, si) => {
    const k = w.num + "|" + d.jour + "|" + si;
    const dn = S.answers.done && S.answers.done[k];
    const label = s.d === "rs" ? "Récupération respectée" : "Valider : " + s.name;
    h += '<button type="button" class="btn ' + (dn ? "" : "primary") + '" data-vd="' + k + '" data-vrest="' + (s.d === "rs" ? 1 : 0) + '" style="width:100%;margin-top:8px;font-size:var(--fs-lg);padding:13px 16px"' + (dn ? " disabled" : "") + ">"
      + (dn ? "✓ " + (s.d === "rs" ? "Repos validé" : "Séance validée — bravo") : "✓ " + label) + "</button>";
  });
  return h ? '<div class="card"><div class="eyebrow">Valider ma journée · ' + d.jour + " " + fmtDay(d.date) + "</div>" + h + "</div>" : "";
}
// R25.3 — coche qui se dessine + "+X XP" flottant, APRÈS le re-rendu qui affiche le bouton
// dans son état "fait" (jamais sur l'ancien bouton, détruit par le innerHTML= de
// renderTabToday). Même motif que `badgesBefore/after` juste au-dessus, appliqué à
// EBV2.avatarTri via motion.js#xpSnapshot plutôt qu'aux badges — deux mesures indépendantes,
// chacune sur sa propre paire avant/après (mélanger les deux donnerait un delta qui ne
// correspond à aucune des deux grandeurs).
function playValidateMotion(plan, todayISO, k, xpBefore) {
  const btn = document.querySelector('[data-vd="' + CSS.escape(k) + '"]');
  drawCheckOnButton(k);
  const xpAfter = xpSnapshot(plan, todayISO);
  floatXP(btn, xpDelta(xpBefore, xpAfter));
}
function bindTodayValidate(plan, todayISO) {
  document.querySelectorAll("#screen [data-vd]").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.vd;
      if (S.answers.done && S.answers.done[k]) return;
      let badgesBefore = [];
      try { badgesBefore = globalThis.EBV2.badges(plan, S.answers, todayISO); } catch (e) {}
      const xpBefore = xpSnapshot(plan, todayISO); // R25.3 — AVANT d'écrire la coche
      if (!S.answers.done) S.answers.done = {};
      S.answers.done[k] = true;
      ebSave();
      const parts = k.split("|");
      const wk = plan.weeks.find((x) => String(x.num) === parts[0]);
      const dy = wk && wk.days.find((x) => x.jour === parts[1]);
      const sess = dy && dy.sessions[+parts[2]];
      if (!sess) { renderTabToday(plan); playValidateMotion(plan, todayISO, k, xpBefore); return; }
      const celebrate = () => {
        let newBadge = null;
        try {
          const after = globalThis.EBV2.badges(plan, S.answers, todayISO);
          newBadge = after.find((x) => !badgesBefore.some((y) => y.id === x.id)) || null;
        } catch (e) {}
        showCongrats(plan, sess, newBadge, todayISO);
      };
      if (sess.d === "rs") { renderTabToday(plan); playValidateMotion(plan, todayISO, k, xpBefore); celebrate(); }
      else feedbackModal(plan, sess, k, () => { renderTabToday(plan); playValidateMotion(plan, todayISO, k, xpBefore); celebrate(); });
    };
  });
}

// Course passée → saisie du chrono réel face à la prédiction (calibration honnête).
function raceResultCardHTML(plan) {
  const rd = S.answers.race_date, tIso = todayISO();
  if (!rd || rd > tIso) return "";
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

// Journal des adaptations quotidiennes (readinessLog) — la preuve que le plan réagit.
// R16.9 — venu de 📅 Semaine : il commente les check-ins, il appartient à l'écran du matin.
function readinessLogHTML() {
  const rlog = Array.isArray(S.answers.readinessLog) ? S.answers.readinessLog : [];
  if (!rlog.length) return "";
  const lblV = { keep: "maintenue", reduce: "réduite", replace: "remplacée par endurance", rest: "repos", off: "repos complet" };
  const nAdapt = rlog.filter((x) => x.action !== "keep").length;
  let h = '<details class="load-card"><summary class="load-title">🤖 Adaptations quotidiennes (' + rlog.length + " check-ins · " + nAdapt + " ajustement" + (nAdapt > 1 ? "s" : "") + ")</summary>";
  rlog.slice(-10).reverse().forEach((x) => { h += '<div style="font-size:var(--fs-sm);margin:4px 0">' + (VERDICT_ICON[x.level] || "") + " " + x.date + " — séance " + (lblV[x.action] || x.action) + "</div>"; });
  h += '<div class="load-sub" style="margin-top:4px">C’est la différence entre un plan PDF et un coach : chaque matin, la séance s’ajuste à ta forme réelle.</div></details>';
  return h;
}

/** Le jour courant du plan (null hors plan). */
function jourDuPlan(plan, today) {
  let day = null;
  plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date === today) day = d; }));
  return day;
}
/** Le ravito du jour, REPLIÉ : la carte de tab-nutrition, transformée en <details>. Le titre
 *  de cette carte ne contient pas de div imbriqué (leçon repliable/R24.1 vérifiée), donc le
 *  premier </div> ferme bien le titre. */
function ravitoReplie(day, tempC) {
  const ravito = nutritionCardHTML(day, tempC);
  return ravito
    ? ravito.replace('<div class="load-card" id="nutCard"><div class="load-title">', '<details class="load-card" id="nutCard"><summary class="load-title" style="cursor:pointer">')
        .replace("</div>", "</summary>").replace(/<\/div>$/, "</details>")
    : "";
}
/**
 * R25.7 — POURQUOI IL N'Y A RIEN À RAVITAILLER, PLUTÔT QU'UNE BOÎTE QUI SCINTILLE.
 *
 * Le motif est nommé, pas générique : renvoyer « renseigne ton poids » quand la vraie raison
 * est un jour de repos, c'est envoyer l'athlète corriger une donnée qui n'est pas en cause —
 * le défaut exact qu'O-16 a fermé sur la carte 🔥 (`energyRefusalNotice`). Mesuré sur l'état
 * signalé : le ravito était vide parce que la journée est un REPOS, pas faute de poids (0
 * conseil rendu avec 72 kg comme sans). Le poids, lui, ne bloque que l'ESTIMATION
 * ÉNERGÉTIQUE — et cette carte-là porte déjà son propre motif depuis O-16.
 */
function ravitoVideHTML(day) {
  const repos = !day || !day.sessions.length || day.sessions.every((s) => s.d === "rs");
  return '<div class="load-sub">' + (repos
    ? "Jour de repos — rien à prévoir pendant l’effort. L’assiette du jour reste celle d’une journée normale."
    : "Rien à prévoir pendant l’effort aujourd’hui : la séance est trop courte pour demander un apport.")
    + "</div>";
}
function nutritionReduiteHTML(plan, today) {
  const day = jourDuPlan(plan, today);
  const rav = ravitoReplie(day, null);
  const energie = energyCardHTML(day, false); // repliée : la version réduite demandée
  if (!rav && !energie) return "";
  // R25.3 — `loading` : le contenu affiché ici n'a pas encore la météo (tempC=null ci-dessus),
  // il va se raffiner dès que fetchWeather répond (revealWeather, plus bas). Shimmer CSS pur.
  //
  // R25.7 — LE SHIMMER NE SE POSE QUE S'IL Y A QUELQUE CHOSE À RAFFINER. Sans ravito, il
  // n'annonçait aucune arrivée : c'était une boîte grise vide qui scintillait pour rien (et
  // `.loading` met `color:transparent`, donc même un contenu présent restait INVISIBLE tant
  // que la météo n'était pas là). L'état vide s'affiche tout de suite, en clair.
  const corps = rav ? '<div id="nutRedu" class="loading">' + rav + "</div>" : '<div id="nutRedu">' + ravitoVideHTML(day) + "</div>";
  // R25.8 — fente de droite (spec Aujourd'hui, bloc 5 : « 🥗 NUTRITION DU JOUR / VERSION
  // RÉDUITE »). Elle dit que ce n'est PAS toute la nutrition, et où trouver le reste : sans
  // elle, la carte se lisait comme la vue complète et l'onglet Outils passait inaperçu.
  return '<div class="card"><div class="eyebrow">🥗 Nutrition du jour<span class="eb-r">version réduite</span></div>' + corps + energie + "</div>";
}

export function renderTabToday(plan) {
  const today = todayISO();
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
  // Retour du fondateur (07/08/2026) : « j'aime bien l'idée de micro-défi, mets-le en valeur
  // juste sous la séance du jour. » Sa propre carte (mêmes règles de sécurité qu'avant :
  // jamais sous drapeau douleur, jamais la veille d'une séance de qualité, jamais un jour de
  // repos), plutôt que noyé 1 fois sur 4 dans « contenu du jour » (dailyContentHTML, plus bas).
  html += microDefiHTML(plan, today);
  html += todayValidateHTML(plan, today); // R6 — valider directement ici (feedback → partages)
  // R24.9 (retour fondateur, 06/08) — « l'onglet nutrition passe dans l'onglet jours mais de
  // manière réduite ». Le ravitaillement et la dépense sont des faits du JOUR : ils vivent ici,
  // repliés (la version « réduite » demandée), rendus par les MÊMES fonctions que portait
  // l'onglet Nutrition — déplacées, pas dupliquées (R23.12b). La météo affine en différé.
  html += nutritionReduiteHTML(plan, today);
  // R23.7 / R23.9 / R23.12b — 🎯 AUJOURD'HUI REDEVIENT « CE QUE JE FAIS MAINTENANT ».
  //
  // Retour du fondateur (06/08/2026) : la prédiction, la charge et la répartition des intensités
  // sont des propriétés de la PRÉPARATION — elles remontent dans 🗓 Plan, sous l'avancement.
  // « Régularité d'avancement » est supprimée (« peu visuelle et importante pour l'utilisation »),
  // et « suivre ma séance en direct » aussi (« personne ne fait ça »). Ce qui reste ici est ce
  // qui se décide aujourd'hui : la séance, sa validation, et le résultat d'une course du jour.
  html += '<div class="card"><div class="eyebrow">Ta préparation<span class="eb-r">charge estimée</span></div>';
  html += raceResultCardHTML(plan);
  html += '<div class="load-card"><div class="load-title">Charge estimée — fitness · fatigue · forme</div>' + loadChartSVG(plan)
    + '<div class="load-leg"><span style="color:var(--swim)">▬ Fitness (CTL)</span> · <span style="color:var(--orange-2)">▬ Fatigue (ATL)</span> · <span style="color:var(--z2)">▬ Forme (TSB)</span></div>'
    + '<div class="load-sub">Estimée depuis la durée et l’intensité de chaque séance. La forme remonte à l’affûtage — c’est le but. Séances cochées : <b>' + _doneN + " / " + _totalS + "</b>" + (_totalS ? " (" + Math.round((_doneN / _totalS) * 100) + "%)" : "") + ".</div></div>";
  html += historyCardHTML(plan);
  html += "</div>";
  // R6 — le check-in du matin doit rester accessible : celui qui a déjà répondu (ou dont
  // l'état vient d'une ancienne version) peut refaire son point sans attendre demain.
  // R16.9 — LE QUOTIDIEN QUI VIVAIT DANS 📅 SEMAINE atterrit ici, parce que c'est ce qu'il
  // est : le contenu du jour, le bilan de la semaine écoulée, le réglage du rappel, la
  // déclaration de maladie, le journal des adaptations et la retouche de la forme du jour
  // n'ont jamais parlé du PLAN — ils parlent de la JOURNÉE. L'onglet Plan garde la saison
  // et les semaines ; ces cartes suivent le check-in dont elles dépendent.
  html += dailyContentHTML(plan, today);       // R4.9 — anecdote / physio / stat perso (le micro-défi a sa propre carte, plus haut)
  html += weeklyReviewHTML(plan);              // R4.10 — bilan hebdo (dimanche)
  // R24.7 — le réglage du rappel a quitté Aujourd'hui (retour fondateur, 06/08 : « je veux que
  // l'onglet rappel de séance bascule dans profil »). C'est un RÉGLAGE de l'app, pas un fait du
  // jour — et le Profil porte déjà sa carte « 🔔 Rappel quotidien » (R23.11). L'y laisser aussi
  // ici, c'était deux chemins vers le même geste dans deux onglets (la forme que R23.12b a
  // retirée). La carte de premier réglage (notifySetupHTML) est supprimée avec son appelant.
  html += '<div class="card">' + sickToggleHTML(today);
  html += readinessLogHTML();
  html += '<details class="load-card"><summary class="load-title">\u{1F321} Modifier ma forme du jour</summary>' + readinessCardHTML({ btnLabel: "Mettre à jour" }) + "</details>";
  html += "</div>";
  html += '<div style="text-align:center;margin:4px 0 10px"><button class="btn" id="tdRedoCheckin" type="button" style="font-size:var(--fs-sm);padding:8px 14px;min-height:44px">↻ Refaire mon ' + pointLabelInline() + '</button></div>';
  $("screen").innerHTML = html;
  bindLoadChart();
  bindSickToggle(plan, today);
  // R24.9 — la météo affine le ravito en différé, sans re-rendre l'onglet ni défaire le repli.
  {
    const zone = $("nutRedu");
    const day = jourDuPlan(plan, today);
    // R25.7 — LE SHIMMER SE TERMINE TOUJOURS, MÊME QUAND LA MÉTÉO N'ARRIVE PAS.
    // `if (!wx) return;` laissait `.loading` posé À VIE — donc, avec `color:transparent`,
    // le ravito RESTAIT INVISIBLE dès que la géolocalisation était refusée, hors ligne ou
    // en timeout (mesuré : encore en shimmer à 5 s, pour un timeout de 3,5 s). Un état
    // d'attente doit avoir une sortie sur CHAQUE branche, y compris celle de l'échec :
    // sans météo on affiche simplement le contenu non affiné, qui est déjà juste.
    if (zone && day) fetchWeather().then((wx) => {
      const el = $("nutRedu");
      if (!el || !el.classList.contains("loading")) return; // l'onglet a été re-rendu entre-temps
      const chaud = wx && wx.tmaxC != null;
      revealWeather(el, ravitoReplie(day, chaud ? wx.tmaxC : null) || ravitoVideHTML(day));
    }).catch(() => {
      const el = $("nutRedu");
      if (el) revealWeather(el, ravitoReplie(day, null) || ravitoVideHTML(day));
    });
  }
  scheduleDailyNotification(plan);
  {
    const rb = $("rdApply");
    if (rb) rb.onclick = async () => { await applyReadiness(); renderTabToday(plan); };
  }

  const redo = $("tdRedoCheckin");
  if (redo) redo.onclick = () => {
    delete S.answers.readiness; // la date saute → le diaporama revient (le journal des verdicts garde l'historique)
    S._ck = null;
    ebSave();
    renderTabToday(plan);
  };
  bindTodayValidate(plan, today);
  bindPainBanner(plan, () => renderTabToday(plan));
  bindRetestBanner(today, () => renderTabToday(ensurePlan()));
  bindFormRing(); // R25.3 — anneau "forme du jour" du héros, s'il vient d'être rendu
  bindStickyValidate(); // R25.3 — CTA collant, redéclenche le bouton natif (aucun second chemin)
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
    // A-5 — ON REFERME LA BOUCLE. `predicted` ci-dessus est la prédiction RECALCULÉE
    // aujourd'hui, le jour de la course : elle ne dit rien de ce que le moteur annonçait il y
    // a quatre mois, et c'est justement ce couple-là — annoncé à H semaines / réalisé — qui
    // permettra un jour de calibrer P2bis et P11. `noteRaceResult` attache le temps réel à la
    // dernière projection JOURNALISÉE, à son horizon d'origine.
    noteRaceResult(t);
    ebSave();
    renderTabToday(plan);
  };
}
