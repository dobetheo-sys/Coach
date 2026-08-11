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
    // R-ZENNA — LA COCHE SE DESSINE. Le `<path class="check-draw">` est tracé par CSS
    // (stroke-dashoffset) quand `.go` est posée au clic : c'est la récompense la plus
    // discrète du système, et la seule qui accompagne le geste au lieu de le commenter.
    // Le libellé reste dans un `<span>` pour que le SVG ne soit pas balayé quand on le change.
    h += '<button type="button" class="btn ' + (dn ? "zn-done" : "primary") + '" data-vd="' + k + '" data-vrest="' + (s.d === "rs" ? 1 : 0) + '" style="width:100%;margin-top:8px;font-size:var(--fs-lg);padding:13px 16px"' + (dn ? " disabled" : "") + ">"
      + '<svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true" style="flex:0 0 auto"><path class="check-draw' + (dn ? " go" : "") + '" d="M4 10.5l4 4 8-9"/></svg>'
      + "<span>" + (dn ? (s.d === "rs" ? "Repos validé" : "Séance validée — bravo") : label) + "</span></button>";
  });
  if (!h) return "";
  // La série en cours, affichée seulement quand elle existe (R4.2 : le repos validé compte).
  let streak = 0;
  try { streak = globalThis.EBV2.adherence(plan, S.answers, todayISO).days || 0; } catch (e) {}
  const chip = streak > 1 ? '<div class="zn-streak-chip">🔥 Série : ' + streak + " jours d’affilée</div>" : "";
  return '<div class="card"><div class="eyebrow">Valider ma journée · ' + d.jour + " " + fmtDay(d.date) + "</div>" + h + chip + "</div>";
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
function nutritionReduiteHTML(plan, today) {
  const day = jourDuPlan(plan, today);
  const rav = ravitoReplie(day, null);
  const energie = energyCardHTML(day, false); // repliée : la version réduite demandée
  if (!rav && !energie) return "";
  return '<div class="card"><div class="eyebrow">🥗 Nutrition du jour</div><div id="nutRedu">' + rav + "</div>" + energie + "</div>";
}

export function renderTabToday(plan) {
  const today = todayISO();
  const moment = momentHTML(plan, today);

  // 1. Le diaporama d'accueil — AUCUNE séance visible avant d'avoir répondu (1×/jour)
  if (!readinessDoneToday()) {
    znClearStickyCta(); znClearParallax(); // le portillon n'a ni séance à valider ni héros
    $("screen").innerHTML = moment + painBannerHTML() + checkinSlideshowHTML() + '<div class="card">' + sickToggleHTML(today) + "</div>";
    bindCheckinSlideshow(() => renderTabToday(plan), () => renderTabToday(plan));
    bindPainBanner(plan, () => renderTabToday(plan));
    bindSickToggle(plan, today);
    znPlay();
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
  html += '<div class="card"><div class="eyebrow">Ta préparation</div>';
  html += raceResultCardHTML(plan);
  html += '<div class="load-card"><div class="load-title">Charge estimée — fitness · fatigue · forme</div>' + loadChartSVG(plan)
    + '<div class="load-leg"><span style="color:var(--zn-swim,#2e6bff)">▬ Fitness (CTL)</span> · <span style="color:var(--zn-fatigue,#ff7a1a)">▬ Fatigue (ATL)</span> · <span style="color:var(--zn-form,#00a376)">▬ Forme (TSB)</span></div>'
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
  // R-ZENNA — et ce différé se VOIT : quand la température arrive, le bloc se rejoue en fondu
  // (`zn-wx-in`) au lieu de changer sous les yeux sans prévenir — un chiffre qui se remplace
  // tout seul, sans transition, se lit comme un bug.
  //
  // Le shimmer de la maquette (`wx-slot.loading`) n'est PAS posé ici, et c'est délibéré : il
  // met le texte en `transparent`, or `#nutRedu` porte toute la carte ravitaillement, pas une
  // pastille de température. Masquer une carte entière en attendant une donnée d'appoint,
  // c'est le défaut qu'U7 a corrigé — la séance ne doit jamais attendre la météo.
  {
    const zone = $("nutRedu");
    const day = jourDuPlan(plan, today);
    if (zone && day) fetchWeather().then((wx) => {
      if (!wx || wx.tmaxC == null) return;
      const el = $("nutRedu");
      if (!el) return;
      el.innerHTML = ravitoReplie(day, wx.tmaxC);
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
  // L'ordre compte, et il suit celui de la maquette : la cascade d'abord (les cartes entrent),
  // puis les tracés qui vivent DANS ces cartes. Tout est no-op hors du thème sombre.
  znPlay();
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
