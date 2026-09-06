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
//
// REFONTE « NOIR APAISÉ » (canevas 18b · 9b · 23d, 05/09/2026). La structure suit l'écran 18b :
// sous-onglets segmentés → navigation de semaine À NU (sur un filet) → « Volumes de la
// semaine » en CREUX → « Les sept journées » en LISTE à nu, dont seule la journée du jour est en
// RELIEF → légende des charges. La grille reste celle de `weekGridHTML` (un seul dessin pour Plan
// et Semaine) : ce module ne redessine pas les cases, il les HABILLE (`css/zenna-semaine.css`,
// scopée sous `.zn-week`) et leur ajoute deux choses APRÈS rendu, sans toucher au producteur
// partagé — l'aperçu du déroulé sous chaque titre (`poserApercus`, relu sur le contenu que
// `techListHTML` a déjà rendu : aucun texte n'est fabriqué ici) et la pilule « Aujourd'hui »
// (`poserPiluleDuJour`, qui dit l'état du point du matin, une donnée que ce module lit déjà).
// Retirés par rapport à la version R-ZENNA v7 : les anneaux « validées par discipline » (absents
// des écrans 9a/18b, le dernier tour qui montre l'écran gagne — le prévu → réalisé par discipline
// vit dans le Bilan) et l'en-tête de carte « Ta semaine » (la navigation porte désormais le
// numéro, la phase, le volume et les bornes calendaires de la semaine).
import { $, S, ebSave, esc, fmtDay, todayISO } from "../state.js";
import { weekGridHTML, currentWeek, handleSwapClick, _BEAT, _wait, _compte, _reduit, _fmtM } from "./tab-plan-general.js";
import { weekChargeChartSVG } from "./plan-view.js";
import { momentHTML, painBannerHTML, bindPainBanner, toggleDone } from "./session-life.js";
import { readinessDoneToday } from "./readiness.js";
import { pointLabelInline } from "./checkin.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { ensurePlan, setTab } from "./tabs.js";
import { DISC, CHARGE } from "./icons.js";
import { znDrawChart, znPlayDays } from "./zenna-motion.js";

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
/** 23d — le changement de semaine est le seul glissement LATÉRAL autorisé, parce qu'il dit la
 *  direction du temps. Le drapeau ne vit que le temps d'un rendu : posé par les flèches, lu et
 *  effacé par `renderTabWeek`. Une entrée dans l'onglet, un ⇄, une coche ne glissent pas. */
let glisse = 0;
export function resetWeekView() { vue = null; glisse = 0; }

function semaineAffichee(plan) {
  const w = plan.weeks.find((x) => x.num === vue);
  return w || currentWeek(plan);
}

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
 *  Le brick compte pour SES deux disciplines (R25 : « +5/+5 »), comme partout ailleurs dans ce
 *  produit — sans quoi la discipline qu'il porte disparaîtrait du détail. */
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

// ═══════════ LE CHROME DE LA SEMAINE (18b) ═══════════

/** La pastille carrée de discipline (canevas 18b/9b : 9 px, la couleur de `DISC[*].ac`). Elle est
 *  décorative — la discipline est déjà dans le libellé voisin —, donc `aria-hidden`, comme le
 *  badge de `badgeDisciplineHTML` dont elle reprend la source de couleur (R11.1). */
function pastilleHTML(k) {
  const d = DISC[k];
  return d ? '<i class="zn-disc-sq" aria-hidden="true" style="background:' + d.ac + '"></i>' : "";
}

/** Les sous-onglets « Cette semaine / Bilan » — la primitive `.zn-seg` de la fondation, le même
 *  balisage que 🧰 Outils (`.btn.subtab` restent : ce sont les crochets que les suites lisent). */
function subtabsHTML(sub) {
  const b = (id, lib) => '<button type="button" role="tab" class="btn subtab zn-seg-btn' + (sub === id ? " active" : "")
    + '" data-weeksub="' + id + '" aria-selected="' + (sub === id) + '">' + lib + "</button>";
  return '<div class="subtabs zn-seg" role="tablist" aria-label="Semaine">' + b("current", "Cette semaine") + b("bilan", "Bilan") + "</div>";
}

/** La navigation de semaine, À NU sur un filet (18b) : ‹ SEMAINE N › puis la ligne de situation
 *  — « tu es ici » sur la semaine courante, sa position dans la prépa, sa phase, son volume —
 *  puis ses bornes calendaires (R7 : chaque semaine annonce ses dates réelles). Tout vient de
 *  l'objet semaine du moteur ; rien n'est recalculé. `data-week-nav` / `data-week-title` sont les
 *  marqueurs que les suites lisent (règle 17 : un critère trouve sa cible par une PROPRIÉTÉ, pas
 *  par un libellé). */
function navHTML(plan, w) {
  const i = plan.weeks.indexOf(w);
  const prev = plan.weeks[i - 1], next = plan.weeks[i + 1];
  const cur = currentWeek(plan);
  const ici = w.num === cur.num;
  const situation = "sur " + plan.weeks.length + " · " + esc(w.phase.nom) + " · " + w.vol + " h" + (w.isRecup ? " · récup" : "");
  const tag = w.race ? '<span class="zn-wknav-race">\u{1F3C1} Course ' + esc(String(w.race)) + "</span>"
    : w.postRace ? '<span class="zn-wknav-post">↳ récup post-course</span>' : "";
  const range = w.days.length ? '<div class="zn-wknav-range">du ' + fmtDay(w.days[0].date) + " au " + fmtDay(w.days[w.days.length - 1].date) + "</div>" : "";
  return '<div class="zn-wknav" data-week-nav>'
    + '<button class="zn-wknav-btn" type="button" id="wkPrev" aria-label="Semaine précédente"' + (prev ? "" : " disabled") + ">‹</button>"
    + '<div class="zn-wknav-c">'
    + '<div class="zn-wknav-title zn-display' + (glisse ? " zn-wknav-in" : "") + '" data-week-title>Semaine ' + w.num + "</div>"
    + '<div class="zn-wknav-meta">' + (ici ? '<span class="zn-wknav-dot" aria-hidden="true"></span><span class="zn-wknav-here">Tu es ici</span> · ' : "")
    + '<span class="zn-wknav-sub">' + situation + "</span>" + tag + "</div>"
    + range
    + (ici ? "" : '<button class="btn zn-wknav-now" type="button" id="wkNow">⌖ Revenir à cette semaine</button>')
    + "</div>"
    + '<button class="zn-wknav-btn" type="button" id="wkNext" aria-label="Semaine suivante"' + (next ? "" : " disabled") + ">›</button>"
    + "</div>";
}

/** « Volumes de la semaine » — le CREUX de 18b : une colonne par discipline, distance en grand,
 *  temps et provenance dessous. Le calcul vit dans le MOTEUR (`EBV2.weekDistances`, R24.8) :
 *  mètres prescrits comptés exacts (« mesuré »), minutes converties par les références MESURÉES
 *  (« estimé », marqué « ~ ») — sans référence, pas de km inventé, le temps seul s'affiche. On ne
 *  redistribue rien : quand une discipline manque à la semaine, sa colonne manque aussi. L'ordre
 *  est celui de l'épreuve (nage → vélo → course), le seul qu'un triathlète lit sans y penser. */
function volumesHTML(w) {
  if (!(globalThis.EBV2 && globalThis.EBV2.weekDistances)) return "";
  let dists;
  try { dists = globalThis.EBV2.weekDistances(w, S.answers); } catch (e) { return ""; }
  // Distance : seules rn/bk/sw en portent une (br/rs n'ont pas d'unité de distance).
  const ORDRE = ["sw", "bk", "rn"];
  dists = (dists || []).filter((x) => ORDRE.includes(x.d) && (x.min > 0 || x.km)).sort((a, b) => ORDRE.indexOf(a.d) - ORDRE.indexOf(b.d));
  if (!dists.length) return "";
  const fmtH = (m) => { const t = Math.round(m); return t >= 60 ? Math.floor(t / 60) + " h " + String(t % 60).padStart(2, "0") : t + " min"; };
  const cols = dists.map((x) => {
    const km = x.km != null;
    const gros = km ? (x.approx ? "~" : "") + String(x.km).replace(".", ",") + '<span class="zn-vol-unit"> km</span>' : esc(fmtH(x.min));
    const meta = km ? (x.min > 0 ? fmtH(x.min) + " · " : "") + (x.approx ? "estimé" : "mesuré") : "temps seul";
    return '<div class="zn-vol-col" data-disc="' + x.d + '"' + (km ? ' data-km="' + x.km + '" data-approx="' + (x.approx ? 1 : 0) + '"' : "") + ">"
      + '<div class="zn-vol-head">' + pastilleHTML(x.d) + "<span>" + esc(DISC[x.d].label) + "</span></div>"
      + '<div class="zn-vol-num zn-display">' + gros + "</div>"
      + '<div class="zn-vol-meta">' + esc(meta) + "</div></div>";
  }).join("");
  return '<div class="zn-sec zn-week-sec"><span>Volumes de la semaine</span><i></i></div>'
    + '<div class="zn-creux zn-vol"><div class="zn-vol-cols">' + cols + "</div>"
    + '<div class="zn-vol-note">« Mesuré » = distance prescrite par le plan. « Estimé » = convertie depuis une durée avec tes références ; sans référence, seul le temps s’affiche.</div></div>';
}

/** La légende des charges (18b, bas de liste) — les libellés viennent de la table `CHARGE`
 *  (icons.js), le repos de `DISC.rs` ; les couleurs sont posées par la feuille de zone depuis les
 *  mêmes jetons que les rails (`smoke-charge` garde l'identité table ↔ jetons). */
function legendeHTML() {
  return '<div class="zn-legend" aria-label="Légende des charges">'
    + Object.entries(CHARGE).map(([k, v]) => '<span class="zn-leg-item"><i class="zn-leg-rail ' + k + '" aria-hidden="true"></i>' + esc(v.label) + "</span>").join("")
    + '<span class="zn-leg-item"><i class="zn-leg-rail off" aria-hidden="true"></i>' + esc(DISC.rs.label) + "</span></div>";
}

/** L'aperçu du déroulé sous chaque titre de séance (18b : « Éch. 300 m · 8 × 100 m au CSS… » en
 *  mono, toujours visible). AUCUN texte fabriqué : on relit ce que `techListHTML` a déjà rendu
 *  dans le `<details>` (la liste U16, ou le bloc unique) et on le recompose avec le séparateur
 *  que le moteur pose lui-même. La carte reste REPLIÉE par défaut (décision du 12/08/2026,
 *  `smoke-carte-seance` §1) : l'aperçu tient en deux lignes au plus (CSS), le détail complet —
 *  le POURQUOI puis la liste — s'ouvre au tap, et l'aperçu s'efface alors (`[open]`). La classe
 *  n'est PAS `.gd-det` : c'est le nom du corps technique déplié, et un `querySelector(".gd-det")`
 *  tombant sur le résumé est exactement le piège que U16 a déjà payé une fois. */
function poserApercus(root) {
  root.querySelectorAll("details.gd-sess").forEach((d) => {
    const li = [...d.querySelectorAll(".gd-steps li")].map((x) => x.textContent.trim()).filter(Boolean);
    const det = d.querySelector(".gd-det");
    const txt = li.length ? li.join(" · ") : (det ? det.textContent.trim() : "");
    const sum = d.querySelector("summary");
    if (!txt || !sum) return;
    const sp = document.createElement("span");
    sp.className = "gd-prev";
    sp.textContent = txt;
    sum.appendChild(sp);
  });
}

/** La pilule de la journée en relief (18b : « AUJOURD'HUI · … »). Ce qu'elle dit après le point
 *  médian est l'état du POINT DU MATIN — la seule chose que cet onglet sait de la journée qui
 *  distingue « adaptée » de « pas encore » (la séance adaptée elle-même vit dans 🎯 Aujourd'hui,
 *  on ne prétend pas ici qu'elle l'est). */
function poserPiluleDuJour(root) {
  const n = root.querySelector(".gd.today .gd-n");
  if (!n) return;
  const p = document.createElement("span");
  p.className = "gd-today-pill";
  p.textContent = "Aujourd’hui · " + (readinessDoneToday() ? pointLabelInline() + " fait" : pointLabelInline() + " à faire");
  n.appendChild(p);
}

// ═══════════ R29 — SOUS-ONGLET BILAN (9b) ═══════════
// Repris de `zenna-bilan-motion-demo.html` (fichier de référence en cas de doute sur un
// timing) et `ZENNA_SEMAINE_UPDATE.md` ; structure et textes d'interface alignés sur l'écran 9b
// du canevas (05/09/2026) — les six blocs du code, dans l'ordre : série, les deux chiffres héros,
// cible contre réalisé, ce que la semaine a porté, par discipline, l'écart avec la semaine passée.
// Les trois points « à trancher » du brief sont résolus contre le CODE RÉEL, pas supposés :
//  1. Bloc 5 (prévu → réalisé) : l'app ne suit qu'une validation binaire (`S.answers.done`),
//     jamais une durée mesurée par séance — voir `disciplinesMinutesSemaine` ci-dessus.
//  2. Densité : non tranchée ici non plus (le brief le dit explicitement) — mesurée après
//     construction plutôt que devinée, voir le rapport de ce lot.
//  3. Déclencheur de badge (bloc 7) : AUCUNE nouvelle règle de déblocage écrite — on compare
//     ce que `EBV2.badges` (le système déjà utilisé au Profil) rend avant / après la semaine
//     regardée. Le moteur est gelé ; c'est la seule lecture possible sans y toucher.
const SVG_FLAMME = '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17c3 0 5-2 5-4.5S12 8 12 3c0 0-1.5 3-3.5 4.5S5 10 5 12.5C5 15 7 17 10 17z"/></svg>';
const SVG_TENDANCE = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13l5-5 3 3 5-6"/><path d="M17 5h-3.5M17 5v3.5"/></svg>';

function bilanViewHTML(plan, w) {
  const bil = bilanSemaine(w);
  let h = navHTML(plan, w);
  if (!bil) return h + '<div class="zn-week-hint">Semaine de repos complet — rien à bilanter.</div>';

  // Bloc 1 — chip de série. `streakWeeks` EST déjà le nombre de semaines consécutives ≥80%
  // d'adhérence : les badges "streak3"/"streak6" du Profil s'en servent pour se déclencher,
  // aucune seconde définition de « série » n'est écrite ici (le seuil 80% est celui de
  // `progressV2`, `.ok`) — « régularité » est le mot du canevas pour cette même grandeur.
  let streakWeeks = 0;
  if (globalThis.EBV2 && globalThis.EBV2.progress) {
    try { streakWeeks = globalThis.EBV2.progress(plan, S.answers, todayISO()).streakWeeks || 0; } catch (e) {}
  }
  if (streakWeeks > 1) {
    h += '<div class="zn-streak-chip zn-in zn-bil-streak" id="bilStreak">' + SVG_FLAMME
      + "<span><b>" + streakWeeks + " semaines</b> de régularité d’affilée (≥ 80 % des séances validées)</span></div>";
  }

  // Bloc 2 — deux chiffres héros. Le dénominateur vit HORS de l'élément compté : la séquence
  // écrit `textContent` sur `#bilNumS`, un `<span>` dedans ne survivrait pas au comptage.
  h += '<div class="zn-bilan-hero">'
    + '<div class="zn-panel zn-bilan-num-card"><div class="zn-bilan-numline"><span class="zn-bilan-num zn-display" id="bilNumS" data-to="' + bil.faites + '" data-tot="' + bil.total + '">0</span><span class="zn-bilan-den">/' + bil.total + "</span></div>"
    + '<div class="zn-bilan-num-lab">Séances validées</div></div>'
    + '<div class="zn-panel zn-bilan-num-card"><div class="zn-bilan-numline"><span class="zn-bilan-num zn-display cy" id="bilNumV" data-to="' + bil.minutes + '">' + esc(_fmtM(0)) + "</span></div>"
    + '<div class="zn-bilan-num-lab">Au programme</div></div></div>';

  // Bloc 3 — cible vs réalisé (part de temps facile). Cf. `bilanSemaine` pour la méthode.
  h += '<div class="zn-panel zn-bil-panel"><div class="zn-bil-eyebrow">Part de temps facile</div>'
    + '<div class="zn-bilan-bar-row"><div class="zn-bilan-bar-tag">Cible</div>'
    + '<div class="zn-bilan-bar-track"><div class="zn-bilan-bar-fill cible" id="bilBarCible" data-to="' + bil.pctFacile + '"></div></div>'
    + '<div class="zn-bilan-bar-val zn-display" id="bilValCible">' + bil.pctFacile + "%</div></div>"
    + '<div class="zn-bilan-bar-row"><div class="zn-bilan-bar-tag">Réalisé</div>'
    + '<div class="zn-bilan-bar-track"><div class="zn-bilan-bar-fill reel" id="bilBarReel" data-to="' + bil.pctFacileFait + '"></div></div>'
    + '<div class="zn-bilan-bar-val zn-display reel" id="bilValReel">' + bil.pctFacileFait + "%</div></div>"
    + '<div class="zn-creux zn-bil-note">La <b class="c">cible</b> porte sur toute la semaine prescrite. Le <b>réalisé</b> ne compte que '
    + (bil.faites ? "tes " + bil.faites + " séance" + (bil.faites > 1 ? "s" : "") + " validée" + (bil.faites > 1 ? "s" : "") : "les séances validées — aucune pour l’instant")
    + " — il bougera quand tu cocheras les suivantes.</div></div>";

  // Bloc 4 — B1 (arbitrage du STOP de Phase 2) : la mini-courbe CTL/ATL/TSB et sa phrase
  // « ta forme a gagné N points » MEURENT ici. Le « point de forme » était un nombre issu d'un
  // modèle que le moteur rejette (R14) — le compenser par un autre indicateur est interdit par
  // l'arbitrage. À la place : la MÊME comptabilité que le plan (minutes par intensité, jour
  // par jour, prévu contre validé) — et le total « fait / prévu » en minutes, jamais en points.
  {
    const dj = weekChargeChartSVG(plan, w.num);
    if (dj) {
      let prevu = 0, fait = 0;
      const done = (S.answers && S.answers.done) || {};
      const today = todayISO();
      w.days.forEach((d) => d.sessions.forEach((s, si) => {
        if (s.d === "rs") return;
        prevu += s.min || 0;
        if (done[w.num + "|" + d.jour + "|" + si]) fait += s.min || 0;
      }));
      // Les lettres des jours sous les barres (9b), aujourd'hui en orange : dérivées des jours du
      // plan, dans l'ordre où le graphe les dessine (même tableau `w.days`).
      const lettres = w.days.map((d) => '<span' + (d.date === today ? ' class="on"' : "") + ">" + esc(d.jour.slice(0, 1)) + "</span>").join("");
      h += '<div class="zn-panel zn-bil-panel"><div class="zn-bil-head"><span class="zn-bil-eyebrow">Ce que la semaine a porté</span>'
        + '<span class="zn-bil-right">' + fait + " / " + prevu + " min</span></div>"
        + '<div class="zn-bil-chart">' + dj + "</div>"
        + '<div class="zn-bil-days">' + lettres + "</div>"
        + '<div class="zn-bil-foot">Teinte pleine = validé, pâle = encore à venir. Même classificateur d’intensité que ton plan.</div></div>';
    }
  }

  // Bloc 5 — détail par discipline, prévu → réalisé (en minutes PRESCRITES des séances
  // validées, voir la réserve dans le commentaire de `disciplinesMinutesSemaine`). Un réalisé
  // NUL s'écrit « — » (9b) et ne porte pas la classe `.reel` : la séquence ne compte que ce qui
  // a une valeur à atteindre.
  const disc = disciplinesMinutesSemaine(w);
  const lignes = ["sw", "bk", "rn"].filter((k) => disc[k].prevu > 0);
  if (lignes.length) {
    h += '<div class="zn-panel zn-bil-panel zn-bil-disc"><div class="zn-bil-eyebrow">Par discipline · prévu → réalisé</div>';
    lignes.forEach((k) => {
      const v = disc[k];
      h += '<div class="zn-bilan-disc-row">' + pastilleHTML(k)
        + '<div class="zn-bilan-disc-name">' + esc(DISC[k].label) + "</div>"
        + '<div class="zn-bilan-disc-vals"><span class="prevu">' + esc(_fmtM(v.prevu)) + '</span><span class="arrow" aria-hidden="true">→</span>'
        + (v.fait > 0
          ? '<span class="reel" id="bilDisc-' + k + '" data-to="' + v.fait + '" style="color:' + DISC[k].ac + '">' + esc(_fmtM(0)) + "</span>"
          : '<span class="reel-none">—</span>')
        + "</div></div>";
    });
    h += "</div>";
  }

  // Bloc 6 — delta semaine précédente (lecture directe, pas de calcul affiché).
  const iW = plan.weeks.indexOf(w);
  const bilPrev = iW > 0 ? bilanSemaine(plan.weeks[iW - 1]) : null;
  if (bilPrev) {
    h += '<div class="zn-creux zn-bilan-delta" id="bilDelta">' + SVG_TENDANCE + "<span>Semaine précédente : <b>" + bilPrev.faites + "/" + bilPrev.total + " séances</b>"
      + (bilPrev.pctFacile ? " · " + bilPrev.pctFacile + " % en facile" : "") + "</span></div>";
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
    // compteurs à leur texte de départ ("0", "0'"), ce qui serait un écran FAUX, pas un écran
    // sans mouvement (la même faute que le J− de R28 a nommée pour un tout autre élément).
    if (streak) streak.classList.add("on");
    if (numS) numS.textContent = String(Math.round(+numS.dataset.to));
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
  if (numS) compteHero.push(_compte(numS, 0, +numS.dataset.to, _BEAT * 10, (v) => String(Math.round(v))));
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

function bindNav(plan, w) {
  const i = plan.weeks.indexOf(w);
  // 23d — les flèches posent le drapeau de glissement ; le sens est celui du temps (la semaine
  // suivante entre par la droite, la précédente par la gauche).
  const go = (n, sens) => { vue = n; glisse = sens; renderTabWeek(plan); window.scrollTo(0, 0); };
  const p = $("wkPrev"); if (p && plan.weeks[i - 1]) p.onclick = () => go(plan.weeks[i - 1].num, -1);
  const n = $("wkNext"); if (n && plan.weeks[i + 1]) n.onclick = () => go(plan.weeks[i + 1].num, 1);
  const c = $("wkNow"); if (c) c.onclick = () => { vue = null; glisse = 0; renderTabWeek(plan); window.scrollTo(0, 0); };
}

export function renderTabWeek(plan) {
  const today = todayISO();
  const w = semaineAffichee(plan);
  const rerender = (pl) => renderTabWeek(pl || plan);
  const sens = _reduit() ? 0 : glisse;
  glisse = 0;

  let html = '<div class="zn-week' + (sens ? (sens > 0 ? " zn-week-next" : " zn-week-prev") : "") + '">';
  html += momentHTML(plan, today) + painBannerHTML() + retestBannerHTML(today);

  // R16.9 avait remplacé la REDIRECTION brutale vers Aujourd'hui par une invitation, et
  // c'était le bon geste : consulter sa semaine n'est pas dangereux, montrer une séance du
  // jour NON adaptée à la forme du matin, si. On garde l'invitation, la grille reste lisible.
  if (!readinessDoneToday()) {
    html += '<div class="zn-panel zn-week-invite"><div class="zn-week-invite-eyebrow">Ton ' + pointLabelInline() + '</div>'
      + '<div class="zn-week-invite-txt">Pas encore fait — la séance d’aujourd’hui n’est donc pas encore adaptée à ta forme. '
      + "Une minute suffit, et tu récupères une semaine juste.</div>"
      + '<button class="zn-btn" id="wkGoCheckin" type="button">→ Faire mon ' + pointLabelInline() + '</button></div>';
  }

  // R29 — SOUS-ONGLET BILAN (décision du fondateur, 12/08/2026, ZENNA_SEMAINE_UPDATE.md).
  // Primitive `.zn-seg` de la fondation, comme Outils — on n'invente pas une seconde forme de
  // bascule pour la même idée.
  const sub = S._weekSub === "bilan" ? "bilan" : "current";
  html += subtabsHTML(sub);
  if (sub === "bilan") {
    html += '<div class="zn-fadeview" id="weekBilan">' + bilanViewHTML(plan, w) + "</div></div>";
    $("screen").innerHTML = html;
    bindPainBanner(plan, rerender);
    bindRetestBanner(today, () => renderTabWeek(ensurePlan()));
    { const g = $("wkGoCheckin"); if (g) g.onclick = () => setTab("today"); }
    bindWeekSubtabs(plan);
    bindNav(plan, w);
    znBilanSequence();
    ebSave();
    return;
  }

  // 18b — navigation à nu, volumes en creux, puis les sept journées en liste. La grille est
  // celle de `weekGridHTML` (un seul dessin pour Plan et Semaine), REPLIÉE par défaut
  // (décision du fondateur, 12/08/2026, maquette « structure interne réelle » : la carte expose
  // un résumé, le détail — conseil, blocs — n'apparaît qu'au tap ; mesuré avant : 7 séances
  // sur 7 dépliées, 161 px par jour, 2 009 px d'onglet). La bascule reste un état LOCAL du
  // `<details>` : aucun rendu ni recalcul au tap.
  html += navHTML(plan, w);
  html += volumesHTML(w);
  html += '<div class="zn-sec zn-week-sec zn-week-sec-days"><span>Les sept journées</span><i></i></div>';
  html += weekGridHTML(plan, w, today);
  html += legendeHTML();
  if (!(S._swapPending && S._swapPending.w === w.num))
    html += '<div class="zn-week-hint">⇄ pour échanger deux jours · ○ pour valider une séance · touche une séance pour son détail.</div>';
  html += "</div>";

  $("screen").innerHTML = html;
  const root = $("screen").querySelector(".zn-week");
  poserApercus(root);
  poserPiluleDuJour(root);
  bindPainBanner(plan, rerender);
  bindRetestBanner(today, () => renderTabWeek(ensurePlan()));
  // R-ZENNA (motion) — la grille arrive jour par jour. Ici et pas dans `renderActiveTab` :
  // les flèches de semaine re-rendent l'onglet SANS repasser par `setTab`, et c'est justement
  // ce geste-là que le mouvement doit accompagner (sept cases se remplacent au même endroit).
  //
  // ARBITRAGE DU FONDATEUR (02/09/2026, voir `tabs.js` pour le détail) — à la toute première
  // arrivée sur l'onglet dans la session, ceci joue EN MÊME TEMPS que la montée du conteneur
  // (`znPlayOnce`). Trois captures vidéo du geste réel ont tranché : imperceptible, gardé tel
  // quel — retirer l'un ou l'autre casserait une promesse ailleurs pour un effet que personne
  // ne voit. 23d : quand le rendu vient d'une flèche, le conteneur porte `.zn-week-next` /
  // `.zn-week-prev` et la feuille de zone fait entrer les journées LATÉRALEMENT, dans le sens
  // du temps ; sinon la cascade verticale de `zenna-tabs.css` reste celle de toujours.
  znPlayDays();
  {
    const g = $("wkGoCheckin");
    if (g) g.onclick = () => setTab("today");
  }
  bindWeekSubtabs(plan);
  bindNav(plan, w);
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
