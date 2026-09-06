// Onglet 🎯 Aujourd'hui — l'onglet CENTRAL (retour utilisateur R5), mis en valeur dans la
// barre. Ordre imposé : 1) check-in du matin en diaporama (aucune séance avant d'avoir
// répondu, une fois par jour) ; 2) la séance du jour DÉJÀ adaptée au verdict ; 3) la
// prédiction de course ; 4) la courbe charge/fatigue/forme ; 5) la barre d'avancement de
// la prépa (liée à la même charge) ; 6) la répartition des intensités.
// R16.9 — la fusion de 📅 Semaine dans 🗓 Plan lui a aussi transmis le QUOTIDIEN, qui n'avait
// rien à faire dans une vue de saison : contenu du jour, bilan hebdo, réglage du rappel,
// déclaration de maladie, journal des adaptations, retouche de la forme du jour. Ils
// arrivent après le bloc « Ta préparation », donc après le check-in dont ils dépendent.
//
// REFONTE 18a (06/09/2026) — L'ÉCRAN SUIT LE CANEVAS « NOIR APAISÉ » : un seul RELIEF (le
// héros), trois groupes À NU sur des filets (le détail de la séance, ton état du jour,
// l'intendance) et un CREUX (ta préparation). Six cartes deviennent un bloc et trois groupes ;
// rien n'est retiré — les fonctions de rendu existantes sont RESTRUCTURÉES, jamais doublées
// (R11.1). Tout vit sous `.zn-today`, le conteneur qui scope `zenna-aujourdhui.css` : les deux
// onglets qui partagent `momentHTML` (Semaine, Plan) ne voient aucune de ses règles.
import { S, $, ebSave, fmtDay, todayISO } from "../state.js";
import { checkinSlideshowHTML, bindCheckinSlideshow, pointLabelInline } from "./checkin.js";
import { chargeChartSVG, historyCardHTML, readinessCardHTML } from "./plan-view.js";
import { momentHTML, painBannerHTML, bindPainBanner, sickToggleHTML, bindSickToggle, heroSessionHTML, etatDuJourHTML, feedbackModal, showCongrats } from "./session-life.js";
import { readinessDoneToday, applyReadiness, fetchWeather } from "./readiness.js";
import { dailyContentHTML, microDefiHTML } from "./daily-content.js";
import { scheduleDailyNotification, weeklyReviewHTML, missedSessionsCheck } from "../notifications.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { ensurePlan, setTab } from "./tabs.js";
import { VERDICT_ICON } from "./icons.js";
import { noteRaceResult } from "../projection-log.js"; // A-5
import { estimatePeriodDetail, subscriptionView, CADENCES } from "../shop-order.js";
import { sachetHTML } from "./sachet.js";
import {
  znOn, znPlay, znDrawChart, znDrawFormRing, znCountHero, znConfetti, znXpFloat, znToast,
  znStickyCta, znClearStickyCta, znNavDot, znHeroParallax, znClearParallax, znWeatherReady,
} from "./zenna-motion.js"; // R-ZENNA

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

/** La coche du canevas (18a / 23c) : un trait qui se DESSINE (`check-draw`, zenna-today.css). */
const SVG_CHECK = (go) => '<svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true" style="flex:0 0 auto"><path class="check-draw' + (go ? " go" : "") + '" d="M4 10.5l4 4 8-9"/></svg>';

// R6 — VALIDATION de la séance depuis Aujourd'hui : gros bouton par séance planifiée du
// jour (même clé « fait », même boucle feedback → célébration → partages que la grille).
//
// REFONTE 18a — LE GESTE EST LE CTA DU CANEVAS : 52 px, pleine largeur, « VALIDER · <nom de
// séance> », et dessous « Série en cours · N jours d'affilée ». Un jour de repos (19a) rend le
// bouton SECONDAIRE (« Cocher ma journée de repos ») : le repos se valide, il n'est pas la
// bonne nouvelle qu'on met en orange. Les attributs `data-vd`/`data-vrest` sont le contrat des
// suites (smoke-zenna, smoke-improvements, le CTA collant) et ne bougent pas.
function todayValidateHTML(plan, todayISO) {
  let w = null, d = null;
  plan.weeks.forEach((wk) => wk.days.forEach((dd) => { if (dd.date === todayISO) { w = wk; d = dd; } }));
  if (!w || !d) return "";
  let h = "";
  d.sessions.forEach((s, si) => {
    const k = w.num + "|" + d.jour + "|" + si;
    const dn = S.answers.done && S.answers.done[k];
    const repos = s.d === "rs";
    const label = repos ? "Cocher ma journée de repos" : "Valider · " + s.name;
    // R-ZENNA — LA COCHE SE DESSINE. Le `<path class="check-draw">` est tracé par CSS
    // (stroke-dashoffset) quand `.go` est posée au clic : c'est la récompense la plus
    // discrète du système, et la seule qui accompagne le geste au lieu de le commenter.
    // Le libellé reste dans un `<span>` pour que le SVG ne soit pas balayé quand on le change.
    h += '<button type="button" class="' + (dn || repos ? "zn-btn-2" : "zn-btn") + (dn ? " zn-btn--done" : "") + '" data-vd="' + k + '" data-vrest="' + (repos ? 1 : 0) + '"' + (dn ? " disabled" : "") + ">"
      + SVG_CHECK(dn)
      + "<span>" + (dn ? (repos ? "Repos validé" : "Séance validée — bravo") : label) + "</span></button>";
  });
  if (!h) return "";
  // La série en cours, affichée seulement quand elle existe (R4.2 : le repos validé compte).
  let streak = 0;
  try { streak = globalThis.EBV2.adherence(plan, S.answers, todayISO).days || 0; } catch (e) {}
  const repos = d.sessions.every((s) => s.d === "rs");
  const serie = streak > 1
    ? '<div class="zn-serie"><span>' + (repos ? "Le repos compte dans ta série" : "Série en cours") + "</span><b>" + streak + (repos ? " jours" : " jours d’affilée") + "</b></div>"
    : "";
  return '<div class="zn-geste">' + h + serie + "</div>";
}
function bindTodayValidate(plan, todayISO) {
  document.querySelectorAll("#screen [data-vd]").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.vd;
      if (S.answers.done && S.answers.done[k]) return;
      let badgesBefore = [];
      try { badgesBefore = globalThis.EBV2.badges(plan, S.answers, todayISO); } catch (e) {}
      // R-ZENNA — LA RÉCOMPENSE PART AVANT LE RE-RENDU, sur le bouton qu'on vient de toucher :
      // après `renderTabToday`, ce nœud n'existe plus et les confettis n'auraient plus d'origine.
      // Le « +10 XP » n'est pas un chiffre décoratif : c'est le barème du moteur
      // (`avatarTriCreditsOf` — repos 0, séance 10, brick 5+5), donc 10 pour toute séance
      // validée qui n'est pas du repos. Un repos ne reçoit rien, et n'annonce rien.
      const repos = b.dataset.vrest === "1";
      const chk = b.querySelector(".check-draw");
      if (chk) requestAnimationFrame(() => chk.classList.add("go"));
      znConfetti(b);
      if (!repos) znXpFloat(b, "+10 XP");
      znToast(repos ? "Repos validé — la série continue" : "Séance validée — elle nourrit l’ajusteur de demain");
      znClearStickyCta();
      if (!S.answers.done) S.answers.done = {};
      S.answers.done[k] = true;
      ebSave();
      const parts = k.split("|");
      const wk = plan.weeks.find((x) => String(x.num) === parts[0]);
      const dy = wk && wk.days.find((x) => x.jour === parts[1]);
      const sess = dy && dy.sessions[+parts[2]];
      if (!sess) { renderTabToday(plan); return; }
      const celebrate = () => {
        let newBadge = null;
        try {
          const after = globalThis.EBV2.badges(plan, S.answers, todayISO);
          newBadge = after.find((x) => !badgesBefore.some((y) => y.id === x.id)) || null;
        } catch (e) {}
        showCongrats(plan, sess, newBadge, todayISO);
      };
      if (sess.d === "rs") { renderTabToday(plan); celebrate(); }
      else feedbackModal(plan, sess, k, () => { renderTabToday(plan); celebrate(); });
    };
  });
}

// Course passée → saisie du chrono réel face à la prédiction (calibration honnête).
// REFONTE 20a — « Il manque ton résultat » : un creux à eyebrow orange, le champ, le CTA.
// Les identifiants `pgRaceTime`/`pgRaceSave` sont le contrat de smoke-improvements.
function raceResultCardHTML(plan) {
  const rd = S.answers.race_date, tIso = todayISO();
  if (!rd || rd > tIso) return "";
  if (S.answers.raceResult) {
    return '<div class="zn-creux zn-resultat"><div class="zn-resultat-eyebrow ok">Ta course du ' + S.answers.raceResult.date + '</div>'
      + '<div class="zn-resultat-txt"><b>Réalisé : ' + S.answers.raceResult.time + "</b>"
      + (S.answers.raceResult.predicted ? " · prédiction du moteur à l'époque : " + S.answers.raceResult.predicted : "")
      + '<br>Ce résultat réel servira de point de calibration pour tes prochaines prédictions.</div></div>';
  }
  let predNow = "";
  try { const pr = globalThis.EBV2.predict(S.sport, S.answers, plan); if (pr.items.length) predNow = pr.items.map((i) => i.leg + " " + i.value).join(" · "); } catch (e) {}
  return '<div class="zn-creux zn-resultat"><div class="zn-resultat-eyebrow">Il manque ton résultat</div>'
    + '<div class="zn-resultat-txt">' + (predNow ? "La prédiction disait <b>" + predNow + "</b>. " : "") + "Note ton temps réel : il servira de point de calibration.</div>"
    + '<div class="zn-resultat-form"><input type="text" id="pgRaceTime" placeholder="ex. 44:30 ou 3:42:10"><button class="zn-btn" id="pgRaceSave" type="button">Renseigner mon résultat</button></div></div>';
}

// Journal des adaptations quotidiennes (readinessLog) — la preuve que le plan réagit.
// R16.9 — venu de 📅 Semaine : il commente les check-ins, il appartient à l'écran du matin.
function readinessLogHTML() {
  const rlog = Array.isArray(S.answers.readinessLog) ? S.answers.readinessLog : [];
  if (!rlog.length) return "";
  const lblV = { keep: "maintenue", reduce: "réduite", replace: "remplacée par endurance", rest: "repos", off: "repos complet" };
  const nAdapt = rlog.filter((x) => x.action !== "keep").length;
  let h = '<details class="load-card zn-row-details"><summary class="load-title">🤖 Adaptations quotidiennes (' + rlog.length + " check-ins · " + nAdapt + " ajustement" + (nAdapt > 1 ? "s" : "") + ')<span class="zn-chev" aria-hidden="true">›</span></summary>';
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

// ── L'INTENDANCE (18a) ─────────────────────────────────────────────────────────────────
//
// R24.9 (retour fondateur, 06/08) — « l'onglet nutrition passe dans l'onglet jours mais de
// manière réduite ». Le ravitaillement et la dépense sont des faits du JOUR : ils vivent ici.
// REFONTE 18a — la version réduite devient trois LIGNES À NU (ravitaillement du jour · gels
// prévus · dépense estimée), chacune menant à 🧰 Outils › Nutrition, qui porte la carte
// complète. Les chiffres viennent du CALCULATEUR existant (`EBV2.sessionNutrition`,
// `EBV2.dailyEnergy` — les mêmes appels que `nutritionCardHTML`/`energyCardHTML`, le même
// résumé min–max ; jamais un second calcul). Ce que ces lignes ne font plus : réécrire la
// carte repliée de tab-nutrition en la transformant — c'était la forme la plus fragile de
// couplage, et la carte complète reste à un geste, dans l'onglet qui la possède.
/** Le résumé « 60–90 g/h · 500–750 ml/h · 24 °C » des séances du jour — la règle d'agrégation
 *  de `nutritionCardHTML` (min des bornes basses, max des bornes hautes), sur les mêmes
 *  conseils. `null` quand aucune séance n'a de conseil (jour de repos). */
function ravitoResume(day, tempC) {
  if (!day || !globalThis.EBV2 || !globalThis.EBV2.sessionNutrition) return null;
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  const advs = day.sessions.map((s) => { try { return globalThis.EBV2.sessionNutrition(s, { tempC: tempC == null ? null : tempC, weightKg: wkg }); } catch (e) { return null; } }).filter(Boolean);
  if (!advs.length) return null;
  const carb = advs.filter((a) => a.during.carbsGPerH);
  const hyd = advs.filter((a) => a.during.drinkMlPerH[0] > 0);
  const boire = hyd.length ? Math.min(...hyd.map((a) => a.during.drinkMlPerH[0])) + "–" + Math.max(...hyd.map((a) => a.during.drinkMlPerH[1])) + " ml/h" : "eau à la soif";
  return (carb.length ? Math.min(...carb.map((a) => a.during.carbsGPerH[0])) + "–" + Math.max(...carb.map((a) => a.during.carbsGPerH[1])) + " g/h · " : "") + boire
    + (tempC != null ? " · " + Math.round(tempC) + " °C" : "");
}
/** La ligne « Ravitaillement du jour » — ré-rendue seule quand la météo arrive (`#nutRedu`). */
function ravitoRowHTML(day, tempC) {
  const resume = ravitoResume(day, tempC);
  if (!resume) return "";
  return '<button type="button" class="zn-row zn-intendance-row" data-outils="nutrition" data-intendance="ravito">'
    + '<div class="zn-row-main"><div class="zn-row-t">Ravitaillement du jour</div><div class="zn-row-s">' + resume + "</div></div>"
    + '<span class="zn-chev" aria-hidden="true">›</span></button>';
}
/** « N gels prévus pour cette séance » — SEULEMENT si un abonnement existe (18a : le sachet
 *  n'apparaît que quand l'envoi existe). Les unités sont celles du devis de l'abonnement
 *  (`estimatePeriodDetail`, R11.1), lues sur la journée d'aujourd'hui. */
function gelsRowHTML(plan, today) {
  const sub = S.answers.shopSubscription || null;
  const view = subscriptionView(sub, today);
  if (view.status !== "active" && view.status !== "cancel_pending") return "";
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  let det = null;
  try { det = estimatePeriodDetail(plan, wkg, 1, today, S.sport); } catch (e) { det = null; }
  const gels = det ? det.sessions.reduce((t, s) => t + (s.gelUnits || 0), 0) : 0;
  const cadence = sub && sub.cadence && CADENCES[sub.cadence] ? CADENCES[sub.cadence] : null;
  const sachet = sachetHTML(sub && sub.flavor, "vignette", 22) || "";
  return '<button type="button" class="zn-row zn-intendance-row" data-outils="nutrition" data-intendance="gels">'
    + (sachet ? '<span class="zn-row-ill">' + sachet + "</span>" : "")
    + '<div class="zn-row-main"><div class="zn-row-t">' + (gels ? gels + " gel" + (gels > 1 ? "s" : "") + " prévu" + (gels > 1 ? "s" : "") + " pour cette séance" : "Aucun gel prévu aujourd’hui") + "</div>"
    + '<div class="zn-row-s ok">' + (cadence && cadence.label ? "abonnement " + cadence.label.toLowerCase() : "dans ton abonnement") + "</div></div>"
    + '<span class="zn-chev" aria-hidden="true">›</span></button>';
}
/** « Dépense estimée · ~2 780 kcal sur la journée » — `EBV2.dailyEnergy`, la carte complète
 *  (N8–N11, macros, avertissement) restant dans 🧰 Outils. O-16 : sans estimation (poids absent,
 *  âge sous la borne), la ligne dit le MOTIF du refus — jamais un chiffre par défaut. */
function depenseRowHTML(day) {
  if (!globalThis.EBV2 || !globalThis.EBV2.dailyEnergy) return "";
  let e = null;
  try { e = globalThis.EBV2.dailyEnergy(S.answers, day ? day.sessions : []); } catch (err) { e = null; }
  let sous;
  if (e) { const f = (r) => r[0] === r[1] ? r[0] : r[0] + "–" + r[1]; sous = "~" + f(e.total) + " kcal sur la journée"; }
  else { let motif = ""; try { motif = (globalThis.EBV2.energyRefusal && globalThis.EBV2.energyRefusal(S.answers)) || ""; } catch (err) { motif = ""; }
    sous = motif || "Renseigne ton poids au 📋 Profil pour voir l’estimation"; }
  return '<button type="button" class="zn-row zn-intendance-row" data-outils="nutrition" data-intendance="depense">'
    + '<div class="zn-row-main"><div class="zn-row-t">Dépense estimée</div><div class="zn-row-s">' + sous + "</div></div>"
    + '<span class="zn-chev" aria-hidden="true">›</span></button>';
}
function intendanceHTML(plan, today) {
  const day = jourDuPlan(plan, today);
  const rav = ravitoRowHTML(day, null);
  const gels = gelsRowHTML(plan, today);
  const dep = depenseRowHTML(day);
  if (!rav && !gels && !dep) return "";
  return '<div class="zn-sec"><span>L’intendance</span><i></i></div>'
    + '<div class="zn-list zn-intendance"><div id="nutRedu">' + rav + "</div>" + gels + dep + "</div>";
}
function bindIntendance() {
  document.querySelectorAll('#screen [data-outils]').forEach((b) => {
    b.onclick = () => {
      // La ligne mène à l'outil qui porte la carte complète — le sous-onglet Nutrition d'Outils.
      // `S.toolsSubTab` est l'état que `renderTabOutils` lit (aucun second chemin).
      S.toolsSubTab = b.dataset.outils;
      setTab("outils");
    };
  });
}

// ── TA PRÉPARATION (18a) — le creux ───────────────────────────────────────────────────
//
// R23.7 / R23.9 / R23.12b — 🎯 AUJOURD'HUI REDEVIENT « CE QUE JE FAIS MAINTENANT ».
// La prédiction, la charge et la répartition des intensités sont des propriétés de la
// PRÉPARATION — elles vivent dans 🗓 Plan. Ce qui reste ici : l'avancement (« 32 / 60 séances
// cochées · 53 % »), la charge par intensité prévue et validée, le résultat d'une course du jour.
function preparationHTML(plan, today) {
  let _totalS = 0;
  plan.weeks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((s) => { if (s.d !== "rs") _totalS++; })));
  const _doneN = S.answers.done ? Object.keys(S.answers.done).filter((k) => S.answers.done[k]).length : 0;
  const pct = _totalS ? Math.round((_doneN / _totalS) * 100) : 0;
  let sem = "";
  try { const pg = globalThis.EBV2.progress(plan, S.answers, today); if (pg && pg.weekNow) sem = "semaine " + pg.weekNow + " / " + pg.totalWeeks; } catch (e) {}
  let h = '<div class="zn-sec"><span>Ta préparation</span><i></i>' + (sem ? "<span>" + sem + "</span>" : "") + "</div>";
  h += '<div class="zn-creux zn-prepa">';
  h += raceResultCardHTML(plan);
  h += '<div class="zn-prepa-head"><span class="zn-prepa-n">' + _doneN + '</span><span class="zn-prepa-den">/ ' + _totalS + '</span><span class="zn-prepa-lab">séances cochées' + (_totalS ? " · " + pct + " %" : "") + "</span></div>";
  h += '<div class="zn-gauge zn-prepa-bar"><i class="grow-x" style="width:' + pct + '%"></i></div>';
  h += '<div class="zn-prepa-eyebrow">Charge par intensité · prévu et validé</div>';
  // ── PREMIER JOUR, AUCUNE DONNÉE (refonte, chantier 3 ; 19b) ──
  //
  // Le graphique de charge se dessine même quand rien n'a été validé : trois courbes plates à
  // zéro, une légende, « 0 / 84 (0 %) ». Un graphique vide n'est pas neutre — il se lit comme
  // un échec, alors qu'il ne dit qu'une chose : le plan commence. On remplace donc le tracé par
  // ce qui va s'y afficher, en une phrase, tant qu'aucune séance n'est cochée. Dès la première,
  // le graphique revient de lui-même : aucun réglage, aucune bascule à gérer.
  if (!_doneN) {
    h += '<div class="zn-prepa-vide">Rien à tracer encore : ' + _totalS + ' séance'
      + (_totalS > 1 ? "s" : "") + ' au programme, aucune validée. La courbe se remplit à la première coche ✓, '
      + 'et compare alors ce qui était prévu à ce que tu as réellement fait.</div>';
  } else {
    h += '<div class="zn-prepa-chart">' + chargeChartSVG(plan) + "</div>";
    // La légende du canevas : quatre mots, quatre carrés — facile, modéré, dur (les trois
    // classes du classificateur du moteur, peintes des jetons qui portent ces valeurs) et
    // « à venir » (le prévu pâle du graphe). Le graphe est celui de plan-view.js, inchangé.
    h += '<div class="zn-prepa-legende"><span><i class="facile"></i>Facile</span><span><i class="mod"></i>Modéré</span><span><i class="dur"></i>Dur</span><span><i class="avenir"></i>À venir</span></div>';
  }
  h += historyCardHTML(plan);
  h += "</div>";
  return h;
}

export function renderTabToday(plan) {
  const today = todayISO();
  const moment = momentHTML(plan, today);

  // 1. Le diaporama d'accueil — AUCUNE séance visible avant d'avoir répondu (1×/jour)
  if (!readinessDoneToday()) {
    znClearStickyCta(); znClearParallax(); // le portillon n'a ni séance à valider ni héros
    // ── LE POINT DU MATIN, FAIT L'APRÈS-MIDI (refonte, chantier 3 ; 20c) ──
    //
    // Le portillon pose les mêmes questions à 7 h et à 18 h : « comment as-tu dormi », « comment
    // te sens-tu ». À 18 h, la journée est derrière : la réponse ne sert plus à ADAPTER la
    // séance (elle est faite, ou elle ne le sera pas), elle sert à la NOTER. Sans le dire, l'app
    // a l'air de n'avoir pas remarqué l'heure.
    //
    // Ce qui NE change pas : le portillon lui-même. On ne saute pas le point du jour parce
    // qu'il est tard — c'est lui qui nourrit l'ajusteur de DEMAIN, et une journée trouée vaut
    // moins qu'une journée répondue tard. On change le CADRAGE, pas la règle. Le bandeau prend
    // la forme 20c : un creux à pastille grise, « AUCUNE FORME DU JOUR », la phrase, la note.
    let tardif = "";
    const h = new Date().getHours();
    if (h >= 14) {
      tardif = '<div class="warn zn-bandeau zn-bandeau--tardif" style="background:var(--zn-bg-late,#fff3d6);font-weight:600"><i class="zn-bandeau-dot" aria-hidden="true"></i><div>'
        + '<div class="zn-bandeau-eyebrow">Aucune forme du jour</div>'
        + "\u{1F551} <b>Il est " + h + " h.</b> Ton point du jour ne décalera plus la séance d’aujourd’hui — "
        + "il sert à caler celle de demain. Deux questions, et ta séance est juste derrière."
        + '<div class="zn-bandeau-note">Fait après midi, il compte pour ton historique mais n’adapte plus la séance du jour.</div></div></div>';
    }
    $("screen").innerHTML = '<div class="zn-today zn-today--portillon">' + moment + painBannerHTML() + tardif + checkinSlideshowHTML() + '<div class="card zn-today-sick">' + sickToggleHTML(today) + "</div></div>";
    bindCheckinSlideshow(() => renderTabToday(plan), () => renderTabToday(plan));
    bindPainBanner(plan, () => renderTabToday(plan));
    bindSickToggle(plan, today);
    znPlay($("screen").firstElementChild);
    return;
  }

  // 2..6 — séance du jour, prédiction, charge, avancement, intensités
  let resSessions = [];
  try {
    // Même correction qu'en tête de `heroSessionHTML` (voir son commentaire) : la date
    // CALENDAIRE passe en dernier, sinon la journée d'entraînement (`readiness.date`, qui
    // recule avant 4 h) l'écrase et l'ajusteur travaille sur la séance d'HIER.
    const res = globalThis.EBV2.adjustToday(S.sport, S.answers, Object.assign({}, S.answers.readiness || {}, { date: today }));
    resSessions = res.sessions || [];
  } catch (e) {}

  // L'ORDRE EST CELUI DU CANEVAS 18a (et 23b, « la séance d'abord, le geste ensuite, le reste
  // après ») : bandeaux du moment · héros · le geste · micro-défi · le détail de la séance ·
  // ton état du jour · l'intendance · ta préparation · le contenu du jour.
  let html = '<div class="zn-today">';
  html += moment;
  html += painBannerHTML();
  html += retestBannerHTML(today);
  html += missedSessionsCheck(plan);
  // `heroSessionHTML` rend le RELIEF et, à sa suite, les sections « Le détail de la séance »
  // — le geste s'intercale entre les deux : le canevas le pose sous le héros, avant le détail.
  const hero = heroSessionHTML(plan, today);
  const cut = hero.indexOf('<div class="zn-sec zn-sec-detail">');
  const relief = cut < 0 ? hero : hero.slice(0, cut);
  const detail = cut < 0 ? "" : hero.slice(cut);
  html += relief;
  html += todayValidateHTML(plan, today); // R6 — valider directement ici (feedback → partages)
  // Retour du fondateur (07/08/2026) : « j'aime bien l'idée de micro-défi, mets-le en valeur
  // juste sous la séance du jour. » Sa propre carte (mêmes règles de sécurité qu'avant :
  // jamais sous drapeau douleur, jamais la veille d'une séance de qualité, jamais un jour de
  // repos), plutôt que noyé 1 fois sur 4 dans « contenu du jour » (dailyContentHTML, plus bas).
  html += microDefiHTML(plan, today);
  html += detail;
  // R6 — le check-in du matin doit rester accessible : celui qui a déjà répondu (ou dont
  // l'état vient d'une ancienne version) peut refaire son point sans attendre demain.
  // R16.9 — LE QUOTIDIEN QUI VIVAIT DANS 📅 SEMAINE atterrit ici, parce que c'est ce qu'il
  // est : la retouche de la forme du jour, le journal des adaptations, la déclaration de
  // maladie n'ont jamais parlé du PLAN — ils parlent de la JOURNÉE. Sous « TON ÉTAT DU JOUR ».
  html += '<div class="zn-sec"><span>Ton état du jour</span><i></i></div>';
  html += '<div class="zn-list zn-etat">';
  html += etatDuJourHTML(plan, today);
  html += '<details class="load-card zn-row-details"><summary class="load-title">\u{1F321} Modifier ma forme du jour<span class="zn-chev" aria-hidden="true">›</span></summary>' + readinessCardHTML({ btnLabel: "Mettre à jour" }) + "</details>";
  html += readinessLogHTML();
  html += '<div class="zn-row zn-row-sick">' + sickToggleHTML(today) + "</div>";
  html += '<div class="zn-row zn-row-redo"><button class="zn-btn-2" id="tdRedoCheckin" type="button">↻ Refaire mon ' + pointLabelInline() + "</button></div>";
  html += "</div>";
  html += intendanceHTML(plan, today);
  html += preparationHTML(plan, today);
  html += dailyContentHTML(plan, today);       // R4.9 — anecdote / physio / stat perso (le micro-défi a sa propre carte, plus haut)
  html += weeklyReviewHTML(plan);              // R4.10 — bilan hebdo (dimanche)
  // R24.7 — le réglage du rappel a quitté Aujourd'hui (retour fondateur, 06/08 : « je veux que
  // l'onglet rappel de séance bascule dans profil »). C'est un RÉGLAGE de l'app, pas un fait du
  // jour — et le Profil porte déjà sa carte « 🔔 Rappel quotidien » (R23.11). L'y laisser aussi
  // ici, c'était deux chemins vers le même geste dans deux onglets (la forme que R23.12b a
  // retirée). La carte de premier réglage (notifySetupHTML) est supprimée avec son appelant.
  html += "</div>";
  $("screen").innerHTML = html;
  bindSickToggle(plan, today);
  bindIntendance();
  // R24.9 — la météo affine le ravito en différé, sans re-rendre l'onglet ni défaire le repli.
  // R-ZENNA — et ce différé se VOIT : quand la température arrive, la ligne se rejoue en fondu
  // (`zn-wx-in`) au lieu de changer sous les yeux sans prévenir — un chiffre qui se remplace
  // tout seul, sans transition, se lit comme un bug.
  //
  // Le shimmer de la maquette (`wx-slot.loading`) n'est PAS posé ici, et c'est délibéré : il
  // met le texte en `transparent`, or `#nutRedu` porte toute la ligne, pas une pastille de
  // température. Masquer une ligne entière en attendant une donnée d'appoint, c'est le défaut
  // qu'U7 a corrigé — la séance ne doit jamais attendre la météo.
  {
    const zone = $("nutRedu");
    const day = jourDuPlan(plan, today);
    if (zone && day) fetchWeather().then((wx) => {
      if (!wx || wx.tmaxC == null) return;
      const el = $("nutRedu");
      if (!el) return;
      el.innerHTML = ravitoRowHTML(day, wx.tmaxC);
      bindIntendance();
      znWeatherReady(el);
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
    znConfetti(rsBtn);
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

  // ============================================================
  // R-ZENNA — LA MISE EN MOUVEMENT, une fois le DOM en place.
  // ============================================================
  // L'ordre compte, et il suit celui de la maquette (23b) : la cascade d'abord (les sections
  // entrent, dans l'ordre de lecture — le héros, le geste, le reste), puis les tracés qui vivent
  // DANS ces sections (le profil de zones se dresse, la barre de préparation se remplit —
  // `grow-y`/`grow-x`, au tempo `--beat` de la fondation, aucune durée nouvelle). Tout est
  // no-op hors du thème sombre. La cascade est posée sur les enfants de `.zn-today` : c'est
  // l'ordre du DOM, qui EST l'ordre de lecture.
  znPlay($("screen").firstElementChild);
  znCountHero();
  znDrawFormRing();
  znDrawChart();
  znHeroParallax();

  // Le CTA collant et la pastille d'onglet parlent de la MÊME chose : une séance est planifiée
  // aujourd'hui et n'est pas encore validée. Un seul calcul pour les deux (R11.1) — sinon
  // l'un des deux finirait par dire l'inverse de l'autre.
  const boutons = [...document.querySelectorAll("#screen [data-vd]")];
  const aValider = boutons.filter((b) => !b.disabled && b.dataset.vrest !== "1");
  znNavDot(aValider.length > 0);
  if (aValider.length) {
    const cible = aValider[0];
    // Le libellé reprend le NOM de la séance, pas un « valider » générique : c'est ce qui
    // distingue un rappel utile d'un bouton qui traîne en bas d'écran.
    const nom = (cible.querySelector("span") || {}).textContent || "Valider ma séance";
    znStickyCta({
      label: "✓ " + nom,
      onClick: () => {
        // On délègue au VRAI bouton (même chemin, même feedback, même célébration) plutôt que
        // de dupliquer la validation : deux chemins vers la même coche, c'est exactement ce
        // que R16.9 a retiré du produit.
        cible.scrollIntoView({ behavior: "smooth", block: "center" });
        cible.click();
      },
    });
  } else {
    znClearStickyCta();
  }
}
