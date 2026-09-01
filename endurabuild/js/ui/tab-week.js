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
import { $, S, ebSave, esc, fmtDay, todayISO } from "../state.js";
import { weekGridHTML, weekHeaderHTML, currentWeek, handleSwapClick, _BEAT, _wait, _compte, _reduit, _fmtM } from "./tab-plan-general.js";
import { weekChargeChartSVG } from "./plan-view.js";
import { momentHTML, painBannerHTML, bindPainBanner, toggleDone } from "./session-life.js";
import { readinessDoneToday } from "./readiness.js";
import { pointLabelInline } from "./checkin.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { ensurePlan, setTab } from "./tabs.js";
import { DISC } from "./icons.js";
import { znDrawChart } from "./zenna-motion.js";

/** Semaine affichée. Non persistée : revenir sur l'onglet ramène à la semaine courante —
 *  c'est la semaine EN COURS qui est le sujet, la navigation n'est qu'une consultation.
 *
 *  ⚠ CETTE PROMESSE N'ÉTAIT TENUE PAR RIEN (retour du fondateur, 17/08/2026 : l'onglet
 *  affichait S5 un jour de S1). `vue` est au niveau module, posée par les flèches, remise à
 *  `null` par le seul bouton « semaine courante » — naviguer puis changer d'onglet laissait la
 *  vue COLLÉE sur la semaine consultée, pour toute la session. Le commentaire affirmait un
 *  invariant que le code n'implémentait pas ; `resetWeekView()` le rend vrai, appelée par
 *  `tabs.js` à CHAQUE ENTRÉE dans l'onglet depuis un autre (jamais sur un re-rendu interne :
 *  les flèches appellent `renderTabWeek` directement, la navigation reste fluide). */
let vue = null;
export function resetWeekView() { vue = null; }

function semaineAffichee(plan) {
  const w = plan.weeks.find((x) => x.num === vue);
  return w || currentWeek(plan);
}

/** Le bilan de la semaine REGARDÉE : ce qui est fait, ce qui reste, et la part de facile.
 *  Compté sur le plan, pas sur le DOM — la vue n'est jamais la source de vérité. */
/**
 * R-ZENNA v7 — LA SEMAINE PAR DISCIPLINE (décision du fondateur : suivre la maquette).
 * Trois anneaux : la part de séances VALIDÉES par discipline. Aucun calcul nouveau — on compte
 * sur le plan, comme le bilan le fait déjà ; la vue n'est jamais la source de vérité. Le brick
 * compte pour SES deux disciplines, comme partout ailleurs dans ce produit (R25 : « +5/+5 »),
 * sans quoi la discipline qui le porte disparaîtrait du bilan.
 * Les DISTANCES ne sont pas recalculées ici : voir la note plus bas.
 */
function disciplinesSemaine(w) {
  const par = { sw: { fait: 0, total: 0 }, bk: { fait: 0, total: 0 }, rn: { fait: 0, total: 0 } };
  w.days.forEach((d) => d.sessions.forEach((s, si) => {
    if (s.d === "rs") return;
    const fait = !!(S.answers.done && S.answers.done[w.num + "|" + d.jour + "|" + si]);
    const cibles = s.d === "br" ? ["bk", "rn"] : (par[s.d] ? [s.d] : []);
    cibles.forEach((k) => { par[k].total++; if (fait) par[k].fait++; });
  }));
  return par;
}
function anneauxHTML(w, ordre) {
  const par = disciplinesSemaine(w);
  let actives = Object.entries(par).filter(([, v]) => v.total > 0);
  // L'ORDRE VIENT DE LA LIGNE DE DISTANCES, quand elle est là : deux rangées superposées qui
  // listent les mêmes disciplines dans deux ordres différents se lisent comme deux sujets.
  // On ne crée pas une troisième convention d'ordre — on suit celle du moteur.
  if (ordre && ordre.length) {
    const rang = (k) => { const i = ordre.indexOf(k); return i < 0 ? 99 : i; };
    actives = actives.sort((a, b) => rang(a[0]) - rang(b[0]));
  }
  if (actives.length < 2) return ""; // un seul sport : l'anneau ne compare rien
  const R = 20, C = 2 * Math.PI * R;
  return '<div class="zn-disc-rings">' + actives.map(([k, v]) => {
    const pct = v.total ? v.fait / v.total : 0;
    const d = DISC[k];
    return '<div class="zn-ring"><svg viewBox="0 0 48 48" aria-hidden="true">'
      + '<circle cx="24" cy="24" r="' + R + '" fill="none" stroke="var(--zn-surface-3)" stroke-width="4"/>'
      + '<circle cx="24" cy="24" r="' + R + '" fill="none" stroke="' + d.ac + '" stroke-width="4" stroke-linecap="round"'
      + ' stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct)).toFixed(1) + '"'
      + ' transform="rotate(-90 24 24)"/></svg>'
      + '<span class="zn-ring-ico" aria-hidden="true">' + d.ic + "</span>"
      + '<span class="zn-ring-lab">' + v.fait + "/" + v.total + "</span></div>";
  }).join("") + "</div>";
}
// PAS de seconde ligne de distances ici. J'en avais écrit une, et elle CONTREDISAIT celle qui
// existe déjà : 🚴 1h18 en haut de l'onglet contre 1h30 dans la mienne, sur la même semaine.
// `EBV2.weekDistances` (R24.8, demande du fondateur) fait autorité — elle compte les mètres
// PRESCRITS exacts et ne convertit les minutes qu'avec les références MESURÉES, en marquant la
// conversion d'un « ~ ». Réécrire ce calcul dans la vue, c'était fabriquer un second jeu de
// chiffres sur l'écran qui affiche déjà l'autre (R11.1).
/** Le bilan de la semaine REGARDÉE : ce qui est fait, ce qui reste, et la part de facile.
 *  Compté sur le plan, pas sur le DOM — la vue n'est jamais la source de vérité.
 *  R29 — cette fonction ne rend plus de HTML : elle rend les CHIFFRES, lus par le sous-onglet
 *  Bilan (`bilanViewHTML`). La ligne qu'elle produisait ("X/Y séances validées…") quitte la
 *  grille (décision du fondateur, 12/08/2026, `ZENNA_SEMAINE_UPDATE.md` §1) — la grille
 *  redevient une vue d'action pure, le bilan vit dans son propre sous-onglet, enrichi. */
function bilanSemaine(w) {
  let total = 0, faites = 0, minutes = 0, minFacile = 0, minFait = 0, minFacileFait = 0;
  w.days.forEach((d) => d.sessions.forEach((s, si) => {
    if (s.d === "rs") return;
    total++;
    const fait = !!(S.answers.done && S.answers.done[w.num + "|" + d.jour + "|" + si]);
    // O-102 — l'étiquette LIVRÉE (chargeLivree, moteur) : un jour `facile2` portant une nage
    // seuil ne compte plus ses minutes dans la part de FACILE — la semaine était comptée plus
    // facile qu'elle n'est, sur la seule surface où l'athlète lit ce compte.
    const et = d.chargeLivree || d.charge;
    const facile = et === "facile" || et === "recup";
    if (fait) { faites++; minFait += s.min || 0; if (facile) minFacileFait += s.min || 0; }
    minutes += s.min || 0;
    if (facile) minFacile += s.min || 0;
  }));
  if (!total) return null;
  return {
    total, faites, minutes, minFait,
    pct: Math.round((faites / total) * 100),
    // CIBLE = part de facile PRESCRITE (toutes les séances de la semaine, comme aujourd'hui) ;
    // RÉALISÉ (R29, Bilan bloc 3) filtre la MÊME classification (`d.charge`, jour par jour) aux
    // seules séances validées — pas les tiers fins (facile/modéré/dur) de la carte Intensités
    // de Plan (`plan._v2.intensity`) : aucun classificateur PAR SÉANCE n'est exposé par le
    // moteur pour filtrer ce calcul plus fin aux séances faites, et en emprunter un pour la
    // cible tout en gardant celui-ci pour le réalisé aurait comparé deux méthodes différentes.
    pctFacile: minutes ? Math.round((minFacile / minutes) * 100) : 0,
    pctFacileFait: minFait ? Math.round((minFacileFait / minFait) * 100) : 0,
  };
}
/** Détail par discipline, en MINUTES PRESCRITES — prévu (toutes les séances) → réalisé (minutes
 *  prescrites des seules séances VALIDÉES). Ce n'est PAS un temps réellement chronométré : l'app
 *  ne suit qu'une validation binaire (fait / pas fait, `S.answers.done`), jamais une durée
 *  mesurée par séance — même réserve que pour la Prédiction (`ZENNA_PLAN_UPDATE.md` §3),
 *  vérifié en lisant `toggleDone`/`session-life.js` : aucun champ de durée réalisée n'existe.
 *  Inventer un chiffre plus précis serait plus faux qu'utile ; celui-ci reste vrai à 100%.
 *  Même règle que `disciplinesSemaine` pour le brick (R25 : il compte pour SES deux
 *  disciplines) — sans quoi la discipline qu'il porte disparaîtrait du détail. */
function disciplinesMinutesSemaine(w) {
  const par = { sw: { prevu: 0, fait: 0 }, bk: { prevu: 0, fait: 0 }, rn: { prevu: 0, fait: 0 } };
  w.days.forEach((d) => d.sessions.forEach((s, si) => {
    if (s.d === "rs") return;
    const fait = !!(S.answers.done && S.answers.done[w.num + "|" + d.jour + "|" + si]);
    const cibles = s.d === "br" ? ["bk", "rn"] : (par[s.d] ? [s.d] : []);
    cibles.forEach((k) => { par[k].prevu += s.min || 0; if (fait) par[k].fait += s.min || 0; });
  }));
  return par;
}

// ═══════════ R29 — SOUS-ONGLET BILAN ═══════════
// Repris de `zenna-bilan-motion-demo.html` (fichier de référence en cas de doute sur un
// timing) et `ZENNA_SEMAINE_UPDATE.md`. Les trois points « à trancher » du brief sont
// résolus contre le CODE RÉEL, pas supposés :
//  1. Bloc 5 (prévu → réalisé) : l'app ne suit qu'une validation binaire (`S.answers.done`),
//     jamais une durée mesurée par séance — voir `disciplinesMinutesSemaine` ci-dessus.
//  2. Densité : non tranchée ici non plus (le brief le dit explicitement) — mesurée après
//     construction plutôt que devinée, voir le rapport de ce lot.
//  3. Déclencheur de badge (bloc 7) : AUCUNE nouvelle règle de déblocage écrite — on compare
//     ce que `EBV2.badges` (le système déjà utilisé au Profil) rend avant / après la semaine
//     regardée. Le moteur est gelé ; c'est la seule lecture possible sans y toucher.
function bilanViewHTML(plan, w) {
  const bil = bilanSemaine(w);
  let h = weekHeaderHTML(w);
  if (!bil) return h + '<div class="load-sub" style="margin-top:10px">Semaine de repos complet — rien à bilanter.</div>';

  // Bloc 1 — chip de série. RÉUTILISE `.zn-streak-chip` (celui d'Aujourd'hui, à l'échelle du
  // jour) — `.zn-in` est un simple modificateur d'entrée, la classe de base ne change pas.
  // `streakWeeks` EST déjà le nombre de semaines consécutives ≥80% d'adhérence : les badges
  // "streak3"/"streak6" du Profil s'en servent pour se déclencher, aucune seconde définition
  // de « série » n'est écrite ici (le seuil 80% affiché est celui de `progressV2`, `.ok`).
  let streakWeeks = 0;
  if (globalThis.EBV2 && globalThis.EBV2.progress) {
    try { streakWeeks = globalThis.EBV2.progress(plan, S.answers, todayISO()).streakWeeks || 0; } catch (e) {}
  }
  if (streakWeeks > 1) {
    h += '<div class="zn-streak-chip zn-in" id="bilStreak">🔥 ' + streakWeeks
      + " semaine" + (streakWeeks > 1 ? "s" : "") + " consécutives au-dessus de 80% d’adhérence</div>";
  }

  // Bloc 2 — deux chiffres héros.
  h += '<div class="zn-bilan-hero">'
    + '<div class="zn-bilan-num-card"><div class="zn-bilan-num" id="bilNumS" data-to="' + bil.faites + '" data-tot="' + bil.total + '">0/' + bil.total + "</div>"
    + '<div class="zn-bilan-num-lab">SÉANCES VALIDÉES</div></div>'
    + '<div class="zn-bilan-num-card"><div class="zn-bilan-num cy" id="bilNumV" data-to="' + bil.minutes + '">' + esc(_fmtM(0)) + "</div>"
    + '<div class="zn-bilan-num-lab">AU PROGRAMME</div></div></div>';

  // Bloc 3 — cible vs réalisé (part de temps facile). Cf. `bilanSemaine` pour la méthode.
  h += '<div class="load-card"><div class="eyebrow">Répartition des intensités — cible vs réalisé</div>'
    + '<div class="zn-bilan-bar-row"><div class="zn-bilan-bar-tag">CIBLE</div>'
    + '<div class="zn-bilan-bar-track"><div class="zn-bilan-bar-fill cible" id="bilBarCible" data-to="' + bil.pctFacile + '"></div></div>'
    + '<div class="zn-bilan-bar-val" id="bilValCible">' + bil.pctFacile + "%</div></div>"
    + '<div class="zn-bilan-bar-row"><div class="zn-bilan-bar-tag">RÉALISÉ</div>'
    + '<div class="zn-bilan-bar-track"><div class="zn-bilan-bar-fill reel" id="bilBarReel" data-to="' + bil.pctFacileFait + '"></div></div>'
    + '<div class="zn-bilan-bar-val" id="bilValReel" style="color:var(--zn-cyan)">' + bil.pctFacileFait + "%</div></div>"
    + '<div class="load-sub" style="margin-top:8px">part de temps facile — cible = toute la semaine prescrite, réalisé = les séances validées seulement</div></div>';

  // Bloc 4 — B1 (arbitrage du STOP de Phase 2) : la mini-courbe CTL/ATL/TSB et sa phrase
  // « ta forme a gagné N points » MEURENT ici. Le « point de forme » était un nombre issu d'un
  // modèle que le moteur rejette (R14) — le compenser par un autre indicateur est interdit par
  // l'arbitrage. À la place : la MÊME comptabilité que le plan (minutes par intensité, jour
  // par jour, prévu contre validé) — et une phrase qui dit ce que la semaine a réellement
  // porté, en minutes, jamais en points.
  {
    const dj = weekChargeChartSVG(plan, w.num);
    if (dj) {
      const min = (o) => o.e + o.m + o.h;
      let prevu = 0, fait = 0, faitDur = 0;
      const done = (S.answers && S.answers.done) || {};
      w.days.forEach((d) => d.sessions.forEach((s, si) => {
        if (s.d === "rs") return;
        prevu += s.min || 0;
        if (done[w.num + "|" + d.jour + "|" + si]) fait += s.min || 0;
      }));
      void min; void faitDur;
      h += '<div class="load-card"><div class="load-title" style="display:flex;align-items:center">Ce que cette semaine a porté'
        + '<span class="zn-new-tag">NOUVEAU</span></div>' + dj
        + '<div class="load-sub" style="margin-top:8px">' + fait + " min validées sur " + prevu
        + " prévues — teinte pâle = prévu, pleine = validé, par intensité (le même classificateur que ton plan). "
        + "La « forme » en points a été retirée : elle sortait d’un modèle que le moteur n’utilise pas.</div></div>";
    }
  }

  // Bloc 5 — détail par discipline, prévu → réalisé (en minutes PRESCRITES des séances
  // validées, voir la réserve dans le commentaire de `disciplinesMinutesSemaine`).
  const disc = disciplinesMinutesSemaine(w);
  const NOMS = { sw: ["🏊", "Natation"], bk: ["🚴", "Vélo"], rn: ["🏃", "Course"] };
  const lignes = Object.keys(NOMS).filter((k) => disc[k].prevu > 0);
  if (lignes.length) {
    h += '<div class="load-card"><div class="eyebrow">Par discipline — prévu → réalisé</div>';
    lignes.forEach((k) => {
      const v = disc[k], [ic, nom] = NOMS[k];
      h += '<div class="zn-bilan-disc-row"><div class="zn-bilan-disc-ico" aria-hidden="true">' + ic + "</div>"
        + '<div class="zn-bilan-disc-name">' + nom + "</div>"
        + '<div class="zn-bilan-disc-vals"><span class="prevu">' + esc(_fmtM(v.prevu)) + '</span><span class="arrow">→</span>'
        + '<span class="reel" id="bilDisc-' + k + '" data-to="' + v.fait + '">' + esc(_fmtM(0)) + "</span></div></div>";
    });
    h += "</div>";
  }

  // Bloc 6 — delta semaine précédente (lecture directe, pas de calcul affiché).
  const iW = plan.weeks.indexOf(w);
  const bilPrev = iW > 0 ? bilanSemaine(plan.weeks[iW - 1]) : null;
  if (bilPrev) {
    h += '<div class="zn-bilan-delta" id="bilDelta">↗ Semaine précédente : <b>' + bilPrev.faites + "/" + bilPrev.total + " séances</b>"
      + (bilPrev.pctFacile ? " · " + bilPrev.pctFacile + "% en facile" : "") + "</div>";
  }

  // Bloc 7 — badge de semaine. AUCUN nouveau déclencheur : on compare `EBV2.badges` (le
  // système du Profil) juste avant / juste après la semaine — un badge qui apparaît entre les
  // deux appels a été gagné PENDANT elle. N'apparaît que s'il y en a réellement un (pas de
  // bloc vide les semaines sans badge, comme demandé).
  if (globalThis.EBV2 && globalThis.EBV2.badges && w.days.length) {
    try {
      const debut = w.days[0].date;
      const next = plan.weeks[iW + 1];
      const today = todayISO();
      const fin = next && next.days[0] ? (next.days[0].date < today ? next.days[0].date : today) : today;
      if (debut && fin > debut) {
        const avant = globalThis.EBV2.badges(plan, S.answers, debut);
        const apres = globalThis.EBV2.badges(plan, S.answers, fin);
        const nouveau = apres.find((b) => !avant.some((x) => x.id === b.id));
        if (nouveau) {
          h += '<div class="zn-badge-earned" id="bilBadge"><div class="zn-badge-earned-ico" aria-hidden="true">' + nouveau.icon + "</div>"
            + '<div><div class="zn-badge-earned-tag">Badge gagné cette semaine</div>'
            + '<div class="zn-badge-earned-name">' + esc(nouveau.label) + "</div></div></div>";
        }
      }
    } catch (e) {}
  }

  return '<div class="zn-bilan">' + h + "</div>";
}

/** Chorégraphie du Bilan (reprise de `zenna-bilan-motion-demo.html`) : le chip ouvre, les deux
 *  chiffres héros comptent en parallèle, les deux barres se remplissent l'une après l'autre,
 *  la courbe se trace (`znDrawChart()`, MÊME mécanisme que la carte d'Aujourd'hui — pas un
 *  second système d'animation de courbe), les lignes de discipline comptent en cascade (le
 *  delta de semaine précédente apparaît en retrait, en parallèle), et le badge referme en
 *  dernier avec un léger rebond — seul moment de célébration franche de l'écran. */
async function znBilanSequence() {
  const streak = document.getElementById("bilStreak");
  const numS = document.getElementById("bilNumS"), numV = document.getElementById("bilNumV");
  const barCible = document.getElementById("bilBarCible"), barReel = document.getElementById("bilBarReel");
  const valCible = document.getElementById("bilValCible"), valReel = document.getElementById("bilValReel");
  const discRows = [...document.querySelectorAll(".zn-bilan-disc-vals .reel")];
  const delta = document.getElementById("bilDelta");
  const badge = document.getElementById("bilBadge");

  if (_reduit()) {
    // Repli — comme `znPredSequence` : une animation désactivée sans repli laisserait les
    // compteurs à leur texte de départ ("0/5", "0'"), ce qui serait un écran FAUX, pas un écran
    // sans mouvement (la même faute que le J− de R28 a nommée pour un tout autre élément).
    if (streak) streak.classList.add("on");
    if (numS) numS.textContent = Math.round(+numS.dataset.to) + "/" + numS.dataset.tot;
    if (numV) numV.textContent = _fmtM(+numV.dataset.to);
    if (barCible) barCible.style.width = barCible.dataset.to + "%";
    if (barReel) barReel.style.width = barReel.dataset.to + "%";
    if (valCible) valCible.classList.add("on");
    if (valReel) valReel.classList.add("on");
    discRows.forEach((el) => { el.textContent = _fmtM(+el.dataset.to); });
    if (delta) delta.classList.add("on");
    if (badge) badge.classList.add("on");
    znDrawChart();
    return;
  }

  if (streak) streak.classList.remove("on");
  if (valCible) valCible.classList.remove("on");
  if (valReel) valReel.classList.remove("on");
  if (delta) delta.classList.remove("on");
  if (badge) badge.classList.remove("on");
  if (barCible) barCible.style.width = "0%";
  if (barReel) barReel.style.width = "0%";

  if (streak) { void streak.offsetWidth; streak.classList.add("on"); }
  await _wait(300);

  const compteHero = [];
  if (numS) compteHero.push(_compte(numS, 0, +numS.dataset.to, _BEAT * 10, (v) => Math.round(v) + "/" + numS.dataset.tot));
  if (numV) compteHero.push(_compte(numV, 0, +numV.dataset.to, _BEAT * 10, (v) => _fmtM(v)));
  await Promise.all(compteHero);

  if (barCible) {
    barCible.style.width = barCible.dataset.to + "%";
    await _wait(_BEAT * 7);
    if (valCible) valCible.classList.add("on");
  }
  if (barReel) {
    barReel.style.width = barReel.dataset.to + "%";
    await _wait(_BEAT * 7);
    if (valReel) valReel.classList.add("on");
  }

  // `znDrawChart()` gère elle-même le tracé et le décalage des trois courbes (voir
  // `zenna-motion.js`) — sa cadence propre, pas celle du brief, pour la même raison que le
  // brief le demande : réutiliser le composant, pas cloner sa chorégraphie de démo.
  znDrawChart();
  await _wait(_BEAT * 16);

  discRows.forEach((el, i) => setTimeout(() => _compte(el, 0, +el.dataset.to, _BEAT * 8, (v) => _fmtM(v)), i * 150));
  setTimeout(() => { if (delta) delta.classList.add("on"); }, 200);
  await _wait(150 * Math.max(0, discRows.length - 1) + _BEAT * 8);

  if (badge) badge.classList.add("on");
}

/** La bascule est un état LOCAL : on re-rend l'onglet, la séquence de la vue visée rejoue. */
function bindWeekSubtabs(plan) {
  document.querySelectorAll("[data-weeksub]").forEach((b) => {
    b.onclick = () => { S._weekSub = b.dataset.weeksub; renderTabWeek(plan); window.scrollTo(0, 0); };
  });
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
    html += '<div class="card"><div class="eyebrow">Ton ' + pointLabelInline() + '</div>'
      + '<div class="load-sub">Pas encore fait — la séance d’aujourd’hui n’est donc pas encore adaptée à ta forme. '
      + "Une minute suffit, et tu récupères une semaine juste.</div>"
      + '<div class="nav" style="margin-top:10px"><button class="btn primary" id="wkGoCheckin" type="button">→ Faire mon ' + pointLabelInline() + '</button></div></div>';
  }

  // R29 — SOUS-ONGLET BILAN (décision du fondateur, 12/08/2026, ZENNA_SEMAINE_UPDATE.md).
  // Composant repris À L'IDENTIQUE de celui de Plan/Outils (`.subtabs`/`.subtab`, fondu
  // `.zn-fadeview`) — on n'invente pas une seconde forme de bascule pour la même idée.
  const sub = S._weekSub === "bilan" ? "bilan" : "current";
  html += '<div class="subtabs" role="tablist">'
    + '<button type="button" class="subtab' + (sub === "current" ? " active" : "") + '" data-weeksub="current"'
    + ' role="tab" aria-selected="' + (sub === "current") + '">📅 Cette semaine</button>'
    + '<button type="button" class="subtab' + (sub === "bilan" ? " active" : "") + '" data-weeksub="bilan"'
    + ' role="tab" aria-selected="' + (sub === "bilan") + '">📊 Bilan</button></div>';
  if (sub === "bilan") {
    html += '<div class="zn-fadeview" id="weekBilan">' + bilanViewHTML(plan, w) + "</div>";
    $("screen").innerHTML = html;
    bindPainBanner(plan, rerender);
    bindRetestBanner(today, () => renderTabWeek(ensurePlan()));
    { const g = $("wkGoCheckin"); if (g) g.onclick = () => setTab("today"); }
    bindWeekSubtabs(plan);
    znBilanSequence();
    ebSave();
    return;
  }

  html += '<div class="card"><div class="eyebrow">📅 Ta semaine</div>';
  // R24.8 (retour fondateur, 06/08) — « un résumé de chaque distance en km par discipline en
  // haut de la page ». Le calcul vit dans le MOTEUR (EBV2.weekDistances) : mètres prescrits
  // comptés exacts, minutes converties par les références MESURÉES — sans référence, pas de
  // km inventé, le temps seul s'affiche. Le « ~ » signale une conversion.
  let ordreDistances = null;
  if (globalThis.EBV2 && globalThis.EBV2.weekDistances) {
    try {
      // Distance : seules rn/bk/sw en portent une (br/rs n'ont pas d'unité de distance) —
      // allow-list distincte du pictogramme, lui repris de DISC (R11.1).
      const DISTANCE_DISC = ["rn", "bk", "sw"];
      const dists = globalThis.EBV2.weekDistances(w, S.answers).filter((x) => DISTANCE_DISC.includes(x.d) && (x.min > 0 || x.km));
      if (dists.length) {
        ordreDistances = dists.map((x) => x.d);
        const fmtKm = (x) => (x.approx ? "~" : "") + String(x.km).replace(".", ",") + " km";
        const fmtMin = (m) => { const t = Math.round(m); return t >= 60 ? Math.floor(t / 60) + "h" + String(t % 60).padStart(2, "0") : t + " min"; };
        html += '<div class="load-sub" style="display:flex;gap:14px;flex-wrap:wrap;margin:2px 0 8px;font-size:var(--fs-md)">'
          + dists.map((x) => "<span><b>" + DISC[x.d].ic + " " + (x.km != null ? fmtKm(x) : fmtMin(x.min)) + "</b>"
            + (x.km != null && x.min > 0 ? ' <span style="color:var(--muted)">· ' + fmtMin(x.min) + "</span>" : "") + "</span>").join("")
          + "</div>";
      }
    } catch (e) {}
  }
  // R-ZENNA v7 — les anneaux se posent juste sous les distances, comme dans la maquette : on
  // situe la semaine (où j'en suis par discipline, ce que ça représente) avant d'entrer dans le
  // détail jour par jour.
  html += anneauxHTML(w, ordreDistances);
  // Retour utilisateur (08/08/2026, 2e passage) : « Afficher d'office le détail des séances » —
  // Semaine n'affiche jamais qu'UNE semaine (contrairement à Plan, qui peut en déplier N), donc
  // le repli par défaut de U16 n'a pas la même justification ici. `openDetails=true`.
  // R-ZENNA v7 — les anneaux et les distances se posent AVANT la grille, comme dans la
  // maquette : on situe la semaine (où j'en suis par discipline, combien ça représente), puis
  // on entre dans le détail jour par jour.
  // REPLIÉ PAR DÉFAUT — renversement ASSUMÉ de la demande du 08/08/2026 (« afficher d'office le
  // détail des séances », qui visait précisément cet onglet). Nouvelle demande du fondateur,
  // 12/08/2026, maquette « structure interne réelle » à l'appui : la carte de séance expose par
  // défaut un résumé d'une ligne, et le détail (conseil, blocs, échauffement) n'apparaît qu'au
  // tap. Mesuré avant le lot : 7 séances sur 7 dépliées d'office, 161 px par jour, 2 009 px
  // d'onglet. L'ancienne raison reste vraie (Semaine n'affiche qu'UNE semaine, contrairement à
  // Plan) — elle ne suffisait simplement pas à justifier d'ouvrir sept blocs techniques à la
  // fois. La bascule reste un état LOCAL du `<details>` : aucun rendu ni recalcul au tap.
  html += '<div class="gw">' + weekHeaderHTML(w) + weekGridHTML(plan, w, today) + "</div>";
  if (S._swapPending && S._swapPending.w === w.num)
    html += '<div class="load-sub" style="margin-top:6px">⇄ <b>' + S._swapPending.jour + "</b> sélectionné — touche le jour avec lequel l’échanger (ou re-touche ⇄ pour annuler).</div>";
  else
    html += '<div class="load-sub" style="margin-top:6px">⇄ pour échanger deux jours · ○ pour valider une séance · touche une séance pour son détail.</div>';
  html += navHTML(plan, w);
  html += "</div>";

  $("screen").innerHTML = html;
  bindPainBanner(plan, rerender);
  bindRetestBanner(today, () => renderTabWeek(ensurePlan()));
  {
    const g = $("wkGoCheckin");
    if (g) g.onclick = () => setTab("today");
  }
  bindWeekSubtabs(plan);
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
