// Onglet 🗓 Plan — LE plan, à toutes ses échelles.
//
// R16.9 — fusion de 📅 Semaine dans cet onglet (5 onglets → 4). C'est « Plan » qui survit :
// il portait déjà la vue d'ensemble complète (saison, phases, décisions, exports) là où
// Semaine n'ajoutait qu'un recentrage sur la semaine courante. Ce qui a été porté ici, et
// qui n'existait pas : la carte « Ta semaine » (semaine courante, jour du jour marqué),
// l'échange de deux jours ⇄, et surtout la VRAIE coche — celle de Plan basculait un booléen
// en silence pendant que celle de Semaine ouvrait le feedback, la célébration et les badges.
// Cocher la même séance ne faisait donc pas la même chose selon l'onglet ; il n'en reste
// qu'une (`toggleDone`, dans session-life.js), et elle vaut pour TOUTE semaine affichée,
// pas seulement la courante.
//
// Ce qui relevait du QUOTIDIEN et non du plan (contenu du jour, bilan hebdo, rappel,
// déclaration de maladie, journal des adaptations, « modifier ma forme du jour ») a suivi
// l'autre chemin : 🎯 Aujourd'hui, qui est l'onglet du quotidien.
//
// La prédiction de course vit dans son propre sous-onglet (« 🎯 Prédiction », R28,
// 12/08/2026) — plus dans 🎯 Aujourd'hui, ni dans un repliable de la vue d'ensemble.
import { SPORTS } from "../config.js";
import { $, S, ebSave, esc, fmtDay, todayISO } from "../state.js";
import { curSteps, renderStep, reset, evalRules, rulesGrouped} from "./steps.js";
import { driverBand, downloadPlan, decisionsCardHTML, whyPlanCardHTML, sessDetailsHTML, predictionViewHTML, journaliserProjection, intensityCardHTML } from "./plan-view.js";
import { exportICS, exportJSON, exportPNG } from "../export.js";

// R23.5 — L'AVANCEMENT ET LE DECOMPTE, EN TETE DE L'ONGLET PLAN.
//
// Trois informations et rien d'autre : dans combien de jours, ou j'en suis, et de quoi partager.
// Le decompte ne s'affiche que si une date de course est declaree — sans elle il n'a pas d'objet,
// et inventer un « J−? » serait pire que se taire.
/** Replie une carte deja rendue derriere son titre. Meme mecanisme que le Profil depuis R5 :
 *  on transforme la carte plutot que de dupliquer son rendu — un second chemin serait un second
 *  endroit a corriger (R11.1). Si la carte est vide, on ne fabrique pas un titre pour rien. */
function replier(h, titre) {
  if (!h || !h.trim()) return h;
  return '<details class="load-card" style="margin-top:10px"><summary class="load-title" style="cursor:pointer">'
    + titre + "</summary>" + h + "</details>";
}
function avancementPlanHTML(plan, today) {
  const rd = S.answers.race_date;
  let tete = "";
  if (rd) {
    // R-ZENNA v5 — le décompte et le libellé de format sont EXTRAITS dans `app-header.js` :
    // l'en-tête partagé affiche le même « J−281 · 70.3 » en haut de chaque onglet, et deux
    // écritures du même calcul divergeraient (R11.1). Le rendu ci-dessous ne bouge pas.
    const c = raceCountdown(S.answers, today);
    const j = c.jours;
    const fmtLabel = c.format || "ta course";
    // R-ZENNA v7 — LE DÉCOMPTE EN HÉROS (décision du fondateur : suivre la maquette).
    // Il était en `--fs-xl` au milieu d'une carte parmi d'autres ; la maquette en fait la
    // première chose qu'on lit sur cet onglet, parce que c'est la seule qui ne change pas de
    // sens : « dans combien de jours ». Le sous-titre nomme la course, pas seulement le format.
    const dateJ = rd ? " · " + fmtDay(rd) + "/" + rd.slice(0, 4) : "";
    tete = j > 1 ? '<div class="zn-jminus">J−' + j + "</div>"
        + '<div class="zn-jminus-sub">avant ' + esc(fmtLabel) + esc(dateJ) + "</div>"
      : j === 1 ? '<div class="zn-jminus petit">Demain, jour J</div>'
      : j === 0 ? '<div class="zn-jminus petit">🏁 C’est aujourd’hui</div>'
      : '<div class="load-sub">Course passée le ' + esc(fmtDay(rd)) + "</div>";
  }
  let barre = "";
  try {
    const pg = globalThis.EBV2.progress(plan, S.answers, today);
    const pct = Math.max(0, Math.min(100, pg.pctLoad));
    barre = '<div class="zn-prog-line"><b>Semaine ' + pg.weekNow + " / " + pg.totalWeeks + "</b>"
      + ' · <span>' + pg.pctLoad + " % de la charge accomplie</span></div>"
      + '<div class="zn-prog-track"><div class="zn-prog-fill" style="width:' + pct + '%"></div></div>';
  } catch (e) {}
  return '<div class="load-card zn-count-hero">' + tete + barre
    + '<div class="nav" style="margin-top:13px"><button class="btn" id="expPng" type="button">📤 Partage</button></div></div>';
}
import { momentHTML, painBannerHTML, bindPainBanner, toggleDone } from "./session-life.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { ensurePlan, invalidatePlan, setTab } from "./tabs.js";
import { feasibilityCardHTML, bindFeasibility } from "./feasibility.js";
import { DISC } from "./icons.js";
import { raceCountdown } from "./app-header.js";

// R5 — le bandeau rouge « réserves » est retiré (retour utilisateur : langage de
// développeur, pas de client). Les limites éventuelles du plan restent lisibles dans
// « Les décisions du moteur » ci-dessous, en langage neutre.

// ===== Déplacement de séance persistant (spec §8) ======================================
// Échange de deux jours d'une même semaine. L'échange est stocké (answers.daySwaps) et
// réappliqué après chaque régénération ; les ✓ et feedbacks des deux jours sont remappés
// UNE fois à la création (ils suivent la séance).
function toggleSwap(wnum, jA, jB) {
  if (!Array.isArray(S.answers.daySwaps)) S.answers.daySwaps = [];
  const ix = S.answers.daySwaps.findIndex(([w2, a2, b2]) => w2 === wnum && ((a2 === jA && b2 === jB) || (a2 === jB && b2 === jA)));
  if (ix >= 0) S.answers.daySwaps.splice(ix, 1);
  else S.answers.daySwaps.push([wnum, jA, jB]);
  const remap = (obj) => {
    if (!obj) return;
    for (let i = 0; i < 8; i++) {
      const kA = wnum + "|" + jA + "|" + i, kB = wnum + "|" + jB + "|" + i;
      const tA = obj[kA], tB = obj[kB];
      if (tB !== undefined) obj[kA] = tB; else delete obj[kA];
      if (tA !== undefined) obj[kB] = tA; else delete obj[kB];
    }
  };
  remap(S.answers.done);
  remap(S.answers.completions);
}
// R18.3 — `rerender` est PARAMÉTRÉ depuis que 📅 Semaine est revenue : la fonction
// re-rendait `renderTabPlanGeneral` en dur, donc un ⇄ touché depuis Semaine faisait
// disparaître Semaine. C'est exactement la classe de bug que R16.9 avait trouvée dans la
// coche (un geste, deux comportements selon l'onglet) — on ne la réintroduit pas par
// l'autre bout. L'appelant dit ce qu'il faut redessiner ; le geste, lui, est unique.
export function handleSwapClick(plan, wnum, jour, rerender) {
  const redraw = (pl) => (rerender ? rerender(pl) : renderTabPlanGeneral(pl));
  const p = S._swapPending;
  if (!p || p.w !== wnum) { S._swapPending = { w: wnum, jour }; redraw(plan); return; }
  if (p.jour === jour) { S._swapPending = null; redraw(plan); return; }
  toggleSwap(wnum, p.jour, jour);
  S._swapPending = null;
  ebSave();
  invalidatePlan();
  let np = ensurePlan();
  // Garde-fou : l'échange ne doit pas créer deux jours durs consécutifs (récupération d'abord)
  const wk = np.weeks.find((x) => x.num === wnum);
  const adjacentHard = !!wk && wk.days.some((d, i) => i > 0 && d.charge === "dur" && wk.days[i - 1].charge === "dur");
  if (adjacentHard && !confirm("Cet échange crée deux jours durs consécutifs — le corps récupère mal comme ça. Garder quand même ?")) {
    toggleSwap(wnum, p.jour, jour); // annulation : on remet tout comme avant
    ebSave();
    invalidatePlan();
    np = ensurePlan();
  }
  redraw(np);
}

// ===== La grille d'UNE semaine — le SEUL producteur de cases ============================
// R16.9 — Plan et Semaine dessinaient chacun sa grille : deux chemins, deux jeux
// d'affordances, et la divergence qui va avec (Semaine avait le ⇄ et la coche complète,
// Plan ni l'un ni l'autre). Il n'en reste qu'un, et il porte partout les mêmes gestes :
// cocher (✓ → feedback → célébration), échanger (⇄), ouvrir le détail.
// `openDetails` : au choix de l'APPELANT (Plan la laisse repliée, Semaine l'ouvre d'office —
// voir le commentaire de `sessDetailsHTML` dans plan-view.js).
export function weekGridHTML(plan, w, today, openDetails) {
  let h = '<div class="gw-grid">';
  w.days.forEach((d) => {
    // La rangée `.gd-badges` répétait les pictogrammes des séances du jour, JUSTE au-dessus des
    // séances qui les portent désormais elles-mêmes (`badgeDisciplineHTML`). Deux fois la même
    // information à deux lignes d'intervalle : elle tombe.
    const nm = d.sessions.map((s, si) => {
      const k = w.num + "|" + d.jour + "|" + si;
      const dn = S.answers.done && S.answers.done[k];
      // R4.2 — le REPOS se valide aussi (« récupération respectée ✓ », 1 tap) : un jour
      // de repos validé compte STRICTEMENT autant qu'un jour de séance dans la streak.
      const title = s.d === "rs" ? "Récupération respectée" : "Marquer fait";
      const chk = '<button class="doneBtn' + (dn ? " done" : "") + '" type="button" data-dk="' + k + '" data-rest="' + (s.d === "rs" ? 1 : 0) + '" title="' + title + '" aria-label="' + title + " : " + s.name.replace(/"/g, "") + '">' + (dn ? "✓" : "○") + "</button> ";
      // R5 — séance cliquable partout (détail replié + affordance visuelle via CSS .gd-sess)
      // UNE LIGNE PAR SÉANCE : badge · titre · métrique · coche, la coche à DROITE comme sur la
      // maquette. Elle occupait sa propre ligne au-dessus de la séance — un tiers de la hauteur
      // de la carte pour un rond de 26 px. L'ordre du DOM garde la séance AVANT la coche : on
      // lit ce qu'on valide avant le bouton qui le valide.
      return '<div class="gd-row">' + sessDetailsHTML(s, undefined, openDetails) + chk + "</div>";
    }).join("");
    // R7 — chaque jour du plan est annoté de sa VRAIE date calendrier (retour utilisateur)
    const mark = "<i>" + (d.date === today ? "auj. · " : "") + fmtDay(d.date) + "</i>";
    // §8 — déplacement de séance : ⇄ sur chaque jour, deux taps = échange persistant.
    const pend = S._swapPending && S._swapPending.w === w.num && S._swapPending.jour === d.jour;
    const swapBtn = '<button class="swapBtn" type="button" data-swap="' + w.num + "|" + d.jour + '" title="Échanger ce jour avec un autre" aria-label="Échanger ' + d.jour + ' avec un autre jour" style="border:none;background:' + (pend ? "#2e6bff" : "transparent") + ";color:" + (pend ? "#fff" : "#b3ab9b") + ';border-radius:5px;font-size:var(--fs-sm);cursor:pointer;padding:2px 6px">⇄</button>';
    h += '<div class="gd ' + (d.chargeLivree || d.charge) + (d.date === today ? " today" : "") + (pend ? " swap-pend" : "") + '"' + (pend ? ' style="outline:2px dashed #2e6bff"' : "") + '><div class="gd-top"><b>' + d.jour + "</b>" + mark + swapBtn + '</div><div class="gd-n">' + nm + "</div></div>";
  });
  h += "</div>";
  if (S._swapPending && S._swapPending.w === w.num)
    h += '<div class="load-sub" style="margin-top:6px">⇄ <b>' + S._swapPending.jour + "</b> sélectionné — touche le jour avec lequel l’échanger (ou re-touche ⇄ pour annuler).</div>";
  return h;
}
export function weekHeaderHTML(w) {
  const raceTag = w.race
    ? ' <span style="background:#ff3b30;color:#fff;border-radius:5px;padding:1px 7px;font-size:var(--fs-micro);font-weight:700">\u{1F3C1} COURSE ' + w.race + "</span>"
    : w.postRace ? ' <span style="color:#9b72ff;font-size:var(--fs-micro)">↳ récup post-course</span>' : "";
  const wRange = w.days.length ? ' <span style="font-size:var(--fs-micro);color:var(--muted);font-weight:400">du ' + fmtDay(w.days[0].date) + " au " + fmtDay(w.days[w.days.length - 1].date) + "</span>" : "";
  return '<div class="gw-h"><b>Semaine ' + w.num + "</b>" + wRange + '<span style="color:' + (w.phase.c || "#555") + '">' + w.phase.nom + "</span>" + raceTag + "<em>" + w.vol + "h" + (w.isRecup ? " récup" : "") + "</em></div>";
}

export function currentWeek(plan) {
  const today = todayISO();
  return (
    plan.weeks.find((w) => w.days.some((d) => d.date === today)) ||
    plan.weeks.find((w) => w.days.some((d) => d.date >= today)) ||
    plan.weeks[0]
  );
}

// R18.3 — la carte « Ta semaine » est repartie dans l'onglet 📅 Semaine, restauré : elle y
// gagne la navigation de semaine en semaine, que cette carte ne pouvait pas porter. 🗓 Plan
// redevient ce qu'il fait le mieux — la SAISON : frise de phases, sous-objectifs, courbe de
// volume, décisions du moteur, exports. La grille elle-même reste produite ici
// (`weekGridHTML`), et l'onglet Semaine la consomme : un seul dessin, deux points de vue.

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
// Le clic (sur le segment coloré OU sur la ligne de la phase) DÉROULE LE PROGRAMME de la
// phase : ses semaines, jour par jour, avec les mêmes coches ✓ que partout. La phase est
// « ✅ validée » quand TOUTES ses séances sont cochées (retour utilisateur R6).
function phaseStats(plan, p) {
  const wks = plan.weeks.filter((w) => w.phase && w.phase.nom === p.nom);
  let total = 0, done = 0;
  wks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((s, si) => {
    if (s.d === "rs") return;
    total++;
    if (S.answers.done && S.answers.done[w.num + "|" + d.jour + "|" + si]) done++;
  })));
  return { wks, total, done, validated: total > 0 && done === total };
}
function phaseObjectivesHTML(plan) {
  let h = '<div class="load-card"><div class="load-title">🎯 Sous-objectifs — une phase à la fois</div>'
    + '<div class="load-sub" style="margin-top:4px">Touche une phase (ici ou dans la frise ci-dessus) pour dérouler son programme. Coche toutes ses séances : la phase se valide.</div>';
  plan.phases.forEach((p) => {
    const st = phaseStats(plan, p);
    const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
    const state = st.validated ? "✅ Phase validée" : st.done > 0 ? st.done + "/" + st.total + " séances ✓" : "à venir";
    const open = S._phOpen === p.nom;
    h += '<details class="ph-obj" data-ph="' + p.nom + '"' + (open ? " open" : "") + ' style="margin-top:8px;border-left:4px solid ' + p.c + ';padding-left:10px"><summary style="cursor:pointer;font-size:var(--fs-md)"><b>' + p.nom + "</b> · " + st.wks.length + " sem — <i>" + state + "</i>"
      + '<div style="background:var(--bg2,#e8e0cf);border:1px solid #16130e;border-radius:4px;height:8px;overflow:hidden;margin-top:4px"><div style="height:100%;width:' + pct + "%;background:" + p.c + '"></div></div></summary>'
      + '<div class="load-sub" style="margin-top:6px">' + (PHASE_GOALS[(p.id || "").toLowerCase()] || PHASE_GOALS[p.nom ? p.nom.toLowerCase().slice(0, 4) : ""] || "Une étape du plan, au service de la suivante.") + "</div>";
    // LE PROGRAMME n'est construit QUE si la phase est ouverte (voir `programmePhaseHTML`).
    h += '<div class="ph-prog">' + (open ? programmePhaseHTML(st) : "") + "</div>";
    if (st.validated) h += '<div style="margin-top:8px;font-size:var(--fs-md);font-weight:700;color:#00734f">✅ Phase validée — tout est fait. La suivante s’appuie sur ce travail.</div>';
    h += "</details>";
  });
  h += "</div>";
  return h;
}

/**
 * AUDIT UX 11/08/2026 — LE PROGRAMME D'UNE PHASE SE CONSTRUIT À SON OUVERTURE.
 *
 * Mesuré : **201 des 227 éléments cliquables** de l'onglet 🗓 Plan étaient des coches. Les cinq
 * sous-objectifs montaient la grille des 40 SEMAINES dans le DOM — repliée, donc invisible et
 * correctement ignorée par les lecteurs d'écran (le contenu d'un `<details>` fermé n'est pas
 * rendu), mais bel et bien créée : 201 boutons construits et 201 gestionnaires de clic liés
 * À CHAQUE RENDU de l'onglet, pour un contenu qu'on n'ouvre qu'une phase à la fois.
 *
 * `S._phOpen` garantit déjà qu'une seule phase est ouverte : on ne construit donc que
 * celle-là, et le `toggle` remplit la suivante. Les coches sont liées par `bindDoneButtons`
 * après remplissage, exactement comme au rendu.
 */
function programmePhaseHTML(st) {
  let h = "";
  st.wks.forEach((w) => {
      const pr = w.days.length ? " · du " + fmtDay(w.days[0].date) + " au " + fmtDay(w.days[w.days.length - 1].date) : "";
      h += '<div style="font-size:var(--fs-sm);margin-top:8px;font-weight:700">Semaine ' + w.num + " · " + w.vol + "h" + (w.isRecup ? " (récup)" : "") + pr + "</div>";
      w.days.forEach((d) => {
        const items = d.sessions.map((s, si) => {
          const k = w.num + "|" + d.jour + "|" + si;
          const dn = S.answers.done && S.answers.done[k];
          const chk = s.d !== "rs" ? '<button class="doneBtn' + (dn ? " done" : "") + '" type="button" data-dk="' + k + '" title="Marquer fait">' + (dn ? "✓" : "○") + "</button> " : "";
          return chk + s.name;
        }).join(" · ");
        h += '<div style="font-size:var(--fs-sm);margin:3px 0 0 4px;color:#3f3a30"><b style="display:inline-block;width:34px">' + d.jour + '</b><span style="display:inline-block;width:44px;color:#999">' + fmtDay(d.date) + "</span> " + items + "</div>";
    });
  });
  return h;
}


// R28 — LA FRISE DE PHASES, extraite pour pouvoir être émise en 2e position (elle vivait au
// milieu du rendu). Le contenu est INCHANGÉ, seule sa place bouge.
function phaseFriseHTML(plan) {
  let html = "";
  html += '<div class="ph-line">';
  // R16.4 — LES PASTILLES DE PHASE TRONQUAIENT SUR MOBILE (« SPÉCIFIQ… », « P… » à 390 px).
  // La frise est PROPORTIONNELLE à la longueur des phases (`flex: p.weeks`), ce qui est une
  // information en soi : on la garde, et c'est le LIBELLÉ qui s'abrège. Les deux versions sont
  // émises, le CSS bascule ; `title` + `aria-label` portent toujours le nom complet, donc rien
  // n'est perdu ni pour la souris ni pour un lecteur d'écran.
  const ABBR = { "Développement": "DÉV.", "Spécifique": "SPÉ.", "Affûtage": "AFF.", "Peak": "PIC", "Base": "BASE" };
  plan.phases.forEach((p) => { html += '<button type="button" class="ph-seg" data-phseg="' + p.nom + '" title="' + p.nom + '" aria-label="' + p.nom + ", " + p.weeks + ' semaines" style="flex:' + p.weeks + ";background:" + p.c + "22;border-color:" + p.c + ';cursor:pointer;font:inherit"><span class="ph-full">' + p.nom + '</span><span class="ph-abbr">' + (ABBR[p.nom] || p.nom) + "</span><em>" + p.weeks + "sem</em></button>"; });
  html += "</div>";
  return '<div class="zn-plan-frise">' + html + "</div>";
}


// ═══════════════ R28 — LES DEUX CHORÉGRAPHIES ═══════════════
// Reprises des démos animées fournies par le fondateur (`zenna-plan-motion-demo.html`,
// `zenna-prediction-motion-demo.html`), qui sont la référence : ce sont des fichiers
// FONCTIONNELS, pas des maquettes, et le brief dit de s'y référer plutôt qu'à sa propre prose
// en cas de doute sur un timing.
//
// `prefers-reduced-motion` saute à l'état final — et ce n'est pas une politesse : la séquence
// part de valeurs à ZÉRO et de barres vides. Sans repli, un mouvement désactivé n'afficherait
// pas « la même chose sans animation », il afficherait un écran FAUX (J−0, 0 %). C'est le
// piège symétrique déjà documenté en tête de `zenna-today.css`.
const _BEAT = 120;
const _reduit = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const _wait = (ms) => new Promise((r) => setTimeout(r, ms));
function _compte(el, de, a, dur, fmt) {
  if (_reduit()) { el.textContent = fmt(a); return Promise.resolve(); }
  return new Promise((res) => {
    const t0 = performance.now();
    (function f(t) {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = fmt(de + (a - de) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(f); else { el.textContent = fmt(a); res(); }
    })(t0);
  });
}
const _fmtM = (m) => { const t = Math.round(m); return t < 60 ? t + "'" : Math.floor(t / 60) + "h" + String(t % 60).padStart(2, "0"); };

/** Vue d'ensemble : J− compte → la frise grandit → la barre se remplit → les rayures partent. */
async function znPlanSequence() {
  const num = document.querySelector(".zn-count-hero .zn-jminus");
  const segs = [...document.querySelectorAll(".ph-line .ph-seg")];
  const fill = document.querySelector(".zn-prog-fill");
  if (_reduit()) { segs.forEach((s) => s.classList.add("vu")); if (fill) fill.classList.add("vu"); return; }
  // LE COMPTEUR J− NE MUTE PLUS LE TEXTE, ET C'EST UNE CORRECTION, PAS UN RENONCEMENT.
  // Ma première écriture faisait défiler `textContent` de 0 à J−281 sur 1,3 s. Conséquence
  // mesurée : `RV-UI-B` (smoke-feasibility) compare DEUX EMPREINTES DU DOM pour garantir que le
  // chrono visé ne déplace pas le plan — et l'empreinte prise pendant l'animation ne vaut pas
  // celle prise après. La garde s'est mise à mesurer mon mouvement au lieu du plan, et quatre
  // autres suites avec elle. C'est la famille R20.7 : une dimension que la mesure ne contrôle
  // pas — ici le TEMPS — décide de son verdict.
  // La règle qui en sort : une animation d'entrée ne doit jamais être la source de vérité d'un
  // texte affiché. Le J− porte donc sa valeur finale dès le premier octet rendu, et son entrée
  // se joue sur l'OPACITÉ et l'ÉCHELLE (des propriétés CSS, invisibles à une empreinte de
  // texte). La frise et la barre, elles, animaient déjà `transform`/`width` — elles ne posaient
  // pas ce problème et gardent leur chorégraphie exacte.
  if (num) { num.classList.remove("zn-jm-in"); void num.offsetWidth; num.classList.add("zn-jm-in"); }
  if (fill) { fill.dataset.w = fill.style.width; fill.style.width = "0%"; }
  segs.forEach((s) => s.classList.remove("vu"));
  await _wait(80);
  await _wait(_BEAT * 11); // le J− prend sa place, puis la frise démarre — cadence inchangée
  segs.forEach((s, i) => setTimeout(() => s.classList.add("vu"), i * 114));
  await _wait(114 * Math.max(0, segs.length - 1) + _BEAT * 4);
  if (fill) { fill.style.transition = "width " + (_BEAT * 10) + "ms cubic-bezier(.25,.46,.45,.94)"; fill.style.width = fill.dataset.w || "0%"; }
  await _wait(_BEAT * 10);
  document.querySelectorAll(".ph-line .ph-seg.now, .ph-line .ph-seg[data-phseg].en-cours").forEach((s) => s.classList.add("striping"));
}

/** Prédiction : le hero compte → les colonnes → le delta → chaque discipline compte À REBOURS.
 *  ARBITRAGE DU FONDATEUR (12/08/2026) : le compteur monte jusqu'à la borne BASSE, puis la
 *  borne haute se pose à côté — l'état final porte donc la fourchette entière, jamais un
 *  chiffre nu. J'avais signalé que la borne basse seule, le temps de l'animation, se lit comme
 *  une promesse optimiste ; c'est su et assumé. */
async function znPredSequence() {
  const hero = document.querySelector(".zn-pred-num");
  const cols = [...document.querySelectorAll(".zn-pred-col")];
  const delta = document.querySelector(".zn-pred-delta");
  const rows = [...document.querySelectorAll(".zn-pd-v")];
  const hi = (el) => el.querySelector(".zn-pred-hi");
  if (_reduit()) {
    cols.forEach((c) => c.classList.add("on")); if (delta) delta.classList.add("on");
    [hero, ...rows].forEach((e) => { if (e && hi(e)) hi(e).classList.add("on"); });
    return;
  }
  cols.forEach((c) => c.classList.remove("on"));
  if (delta) delta.classList.remove("on");
  [hero, ...rows].forEach((e) => { if (e && hi(e)) hi(e).classList.remove("on"); });
  await _wait(100);
  if (hero) {
    const lo = parseFloat(hero.dataset.lo);
    const garde = hi(hero) ? hi(hero).outerHTML : "";
    await _compte(hero, 0, lo, _BEAT * 9, (v) => _fmtM(v));
    hero.innerHTML = _fmtM(lo) + garde;
    if (hi(hero)) hi(hero).classList.add("on");
  }
  cols.forEach((c, i) => setTimeout(() => c.classList.add("on"), i * 100));
  await _wait(320);
  if (delta) delta.classList.add("on");
  await _wait(360);
  rows.forEach((el, i) => setTimeout(async () => {
    const de = parseFloat(el.dataset.from), a = parseFloat(el.dataset.lo);
    const garde = hi(el) ? hi(el).outerHTML : "";
    el.classList.add("compte");
    await _compte(el, de, a, _BEAT * 6, (v) => _fmtM(v));
    el.innerHTML = _fmtM(a) + garde;
    el.classList.remove("compte");
    if (hi(el)) hi(el).classList.add("on");
  }, i * 150));
}

// R29 — exportés pour que la chorégraphie du Bilan (onglet Semaine) réutilise EXACTEMENT le
// même battement et le même compteur que Prédiction, plutôt que d'en écrire une seconde copie
// (R11.1) : même `_BEAT`, même easing de count-up, même repli `prefers-reduced-motion`.
export { _BEAT, _wait, _compte, _reduit, _fmtM };

/** La bascule est un état LOCAL : on re-rend l'onglet, la séquence de la vue visée rejoue. */
function bindPlanSubtabs(plan) {
  document.querySelectorAll("[data-plansub]").forEach((b) => {
    b.onclick = () => { S._planSub = b.dataset.plansub; renderTabPlanGeneral(plan); };
  });
}

export function renderTabPlanGeneral(plan) {
  const a = S.answers;
  const today = todayISO();
  let html = momentHTML(plan, today) + painBannerHTML() + retestBannerHTML(today);
  // R28 — PLAN GAGNE DEUX SOUS-ONGLETS (décision du fondateur, 12/08/2026). Le composant est
  // repris À L'IDENTIQUE de celui d'Outils (`.subtabs`/`.subtab`) — même classes, même
  // comportement : on n'invente pas une seconde forme de bascule pour la même idée.
  const sub = S._planSub === "pred" ? "pred" : "overview";
  // CORRECTION D'UNE RÉGRESSION (12/08/2026) — le journal A-5 s'appelait UNIQUEMENT depuis
  // `predictionViewHTML`, donc UNIQUEMENT quand l'athlète clique sur le sous-onglet Prédiction.
  // Avant R28, la prédiction se recalculait (et se journalisait) à chaque rendu de Plan ;
  // A-5 existe précisément pour qu'aucune semaine ne manque à l'appel, et un athlète qui ne
  // visite jamais ce sous-onglet une semaine donnée en aurait laissé le journal troué. On
  // journalise donc ICI, une fois par rendu de l'onglet, QUEL QUE SOIT le sous-onglet affiché
  // — et on passe le résultat à `predictionViewHTML` pour ne pas appeler `predict()` deux fois
  // quand `sub === "pred"`.
  const prJournal = journaliserProjection(plan);
  html += '<div class="subtabs" role="tablist">'
    + '<button type="button" class="subtab' + (sub === "overview" ? " active" : "") + '" data-plansub="overview"'
    + ' role="tab" aria-selected="' + (sub === "overview") + '">📊 Vue d’ensemble</button>'
    + '<button type="button" class="subtab' + (sub === "pred" ? " active" : "") + '" data-plansub="pred"'
    + ' role="tab" aria-selected="' + (sub === "pred") + '">🎯 Prédiction</button></div>';
  if (sub === "pred") {
    html += '<div class="zn-fadeview" id="planPred">' + predictionViewHTML(plan, prJournal) + "</div>";
    $("screen").innerHTML = html;
    bindPlanSubtabs(plan);
    znPredSequence();
    return;
  }
  // R28 — L'ORDRE DES BLOCS : le DÉCOMPTE ouvre la vue, la frise suit, l'intro recule en 3e.
  // Ce qu'on vient chercher en premier est « dans combien de jours, et où j'en suis » — pas la
  // description du plan, qui ne change jamais.
  html += avancementPlanHTML(plan, today);
  html += phaseFriseHTML(plan);
  html += '<div class="card"><div class="eyebrow">Plan général — ' + SPORTS[S.sport].nom + "</div><h2>Ta saison en un coup d’œil</h2>"
    + '<div class="why">' + plan.totalWeeks + " semaines en " + "semaines de 7 jours" + ", volume " + plan.volBase + "h → " + plan.volPeak + "h.</div>";
  html += driverBand(a);
  // R23.5 / R23.12 — CE QU'ON VIENT VOIR EN PREMIER : ou j'en suis, et dans combien de jours.
  //
  // Retour du fondateur (06/08/2026) : « je veux en haut de la page la vision de l'avancement du
  // plan avec le decompte des jours avant la course », et « l'export PNG est interessant dans
  // l'idee mais mal nomme et devrait peut-etre etre sous l'avancement du plan sous le nom
  // Partage ». Les deux vont ensemble : on partage ce qu'on vient de regarder.
  // (`avancementPlanHTML` est désormais émis EN TÊTE — R28.)
  // R23.6 — « POURQUOI CE PLAN » DESCEND, ET C'EST UNE DECISION QUI EN REVISE UNE AUTRE.
  //
  // R6 l'avait mise EN TETE, dépliée, au motif que « l'explicabilité est le contre-positionnement
  // du produit, pas une option de confort ». Le fondateur tranche l'inverse (06/08/2026) :
  // « Pourquoi ce plan trop tot, l'utilisateur veut d'abord les infos ». Les deux ont raison sur
  // leur objet — l'explicabilité RESTE (elle n'est ni repliée ni retirée), elle cesse seulement
  // d'etre ce qu'on lit AVANT son plan. Elle se place donc juste avant le détail des décisions,
  // dont elle est le résumé : les deux vivent cote a cote au lieu d'encadrer tout l'onglet.
  // RV — le chrono visé et son verdict, juste après « pourquoi ce plan » : c'est la même
  // question posée dans l'autre sens. Absente hors course à pied (le prototype inverse Riegel).
  html += feasibilityCardHTML(plan);
  // R16.5 — RACCOURCI VERS LA SEMAINE EN COURS. Sur un plan de 59 semaines, l'atteindre
  // depuis le haut de l'onglet demande de passer devant les badges, le « pourquoi », la frise
  // et le graphique. Le repère est la vraie date du jour (`todayISO`, la même ancre que partout
  // depuis R7) : le bouton n'apparaît que si cette semaine existe dans ce qui est affiché.
  {
    // U15 — le raccourci n'a d'objet que dans la vue COMPLÈTE : en vue par défaut, la semaine
    // en cours est la seule affichée, donc « y aller » n'a plus de sens.
    const cur = S.showAllWeeks && plan.weeks.find((w) => w.days.some((d) => d.date === today));
    if (cur) html += '<div style="margin:6px 0 2px"><button class="btn" id="goCurWk" type="button" '
      + 'data-wk="' + cur.num + '">↓ Aller à la semaine en cours (S' + cur.num + ")</button></div>";
  }
  // R16.9-a — la frise s'ouvre APRÈS le bouton. Émis à l'intérieur de `.ph-line` (flex), il
  // en devenait un item et raflait la place : les cinq segments se tassaient à droite et
  // s'abrégeaient tous, y compris sur grand écran. Défaut introduit par R16.5, visible sur
  // la capture de contrôle de R16.8 — deux corrections successives d'un même symptôme (les
  // libellés tronqués) dont aucune ne regardait la vraie cause : la largeur disponible.
  // (la frise est émise EN TÊTE — R28, `phaseFriseHTML`.)
  // R23.7 / R23.9 — LA PREDICTION ET LA REPARTITION DES INTENSITES APPARTIENNENT AU PLAN.
  //
  // « L'onglet prediction et charge devrait apparaitre dans plan juste sous l'etat d'avancement
  // du plan, pas dans aujourd'hui » · « repartition des intensites appartient a l'onglet plan et
  // pas aujourd'hui ». C'est juste : ce sont des proprietes de la PREPARATION, pas du jour. Elles
  // sont retirees de 🎯 Aujourd'hui, qui redevient « ce que je fais maintenant ».
  // ... et elles arrivent REPLIEES, comme la demande le precise : « dans une version plus compacte
  // avec juste les temps actuels et les temps projetes, puis un deroulable avec les explications ».
  // Mesure a l'appui : deployees, l'onglet passait de 3,8 a 5,2 ecrans — la garde U15 (« le Plan
  // tient sous 5 ecrans ») est passee ROUGE, ce qui est exactement son role. On ne relache pas la
  // garde, on tient la demande : `<details>` ferme, un geste pour tout voir.
  // R28 — la prédiction a quitté cette vue : elle est le sous-onglet « 🎯 Prédiction ».
  html += replier(intensityCardHTML(plan), "⚡ Répartition des intensités");
  html += phaseObjectivesHTML(plan);
  html += '<div class="vol-bars">';
  // AUDIT UX 11/08/2026 — DEUX TEINTES, PAS CINQ (décision du fondateur).
  // Le graphique portait la couleur de PHASE : 40 barres en 5 teintes, pour une légende qui
  // n'en expliquait qu'une (« violet = récup »). La couleur de phase porte du sens — mais elle
  // le porte déjà sur la FRISE, juste au-dessus, où cinq segments larges se lisent. Répétée
  // sur 40 barres de 3 px, elle sature au lieu d'informer. Ici on garde les deux seules
  // distinctions qui aident à lire une COURBE DE CHARGE : ce qui est une décharge, et où j'en
  // suis. C'est le parti de la maquette.
  const semCourante = plan.weeks.find((w) => w.days.some((d) => d.date === today));
  plan.weeks.forEach((w) => {
    const h = Math.max(8, Math.round((w.vol / plan.volPeak) * 52));
    const ici = semCourante && w.num === semCourante.num;
    const c = ici ? "var(--zn-orange, #ff3d00)" : w.isRecup ? "#9b72ff" : "var(--zn-surface-3, #20252c)";
    html += '<div class="vb" style="height:' + h + "px;background:" + c + '" title="S' + w.num + " " + w.vol + "h · " + esc(w.phase.nom) + '"></div>';
  });
  html += '</div><div class="vol-cap">1 barre = 1 semaine · violet = récup'
    + (semCourante ? " · orange = où tu en es" : "") + "</div>";
  // U15 — L'ONGLET S'OUVRE SUR LA SEMAINE EN COURS, PAS SUR QUATRE SEMAINES.
  //
  // Mesuré sur un marathon à 390 px : l'onglet faisait 5 164 px (6,1 écrans de défilement) et
  // **56 % de cette hauteur était les grilles de semaines** — quatre étaient dépliées d'office
  // (les trois premières, plus la dernière). Ce n'est ni le « pourquoi » (10 %) ni le graphique
  // (1 %) qui font le mur : ce sont les semaines qu'on ne regarde pas.
  //
  // La semaine 1 n'a d'intérêt qu'au premier jour ; ensuite c'est la semaine COURANTE qu'on
  // vient voir. Le bouton « Voir les N semaines » n'a pas bougé — on change le défaut, pas la
  // possibilité.
  const courante = plan.weeks.find((w) => w.days.some((d) => d.date === today)) || plan.weeks[0];
  // R-ZENNA v6 — LA GRILLE QUITTE LA VUE PAR DÉFAUT DE 🗓 PLAN (décision du fondateur,
  // 11/08/2026 : « suivre la maquette »). Elle y résumait la semaine en cours ; la maquette
  // met à sa place une CARTE de résumé et un bouton qui ouvre 📅 Semaine.
  //
  // CE QUE ÇA NE FAIT PAS, et c'est ce qui rend la décision peu coûteuse : ça ne crée AUCUN
  // second chemin de rendu. R16.9 avait trouvé un vrai défaut — la coche existait en deux
  // versions, celle de Plan basculant un booléen en silence sans produire de `completion`, donc
  // sans RPE, donc l'ajusteur du lendemain sous-estimait la fatigue. On RETIRE un consommateur
  // de `weekGridHTML`, on n'en ajoute pas : le danger que R16.9 nommait ne peut pas revenir.
  // La maquette dit d'ailleurs elle-même, dans cette carte, « même dessin, même geste, jamais
  // deux comportements » — c'est le principe de R16.9, appliqué à une seule vue.
  //
  // Ce qu'on PERD est réel et assumé : le geste « je coche depuis Plan sans changer d'onglet ».
  // La vue complète (« Voir les N semaines ») garde les grilles — rien ne devient inatteignable.
  if (S.showAllWeeks) {
    plan.weeks.forEach((w) => {
      html += '<div class="gw" id="gw' + w.num + '">' + weekHeaderHTML(w) + weekGridHTML(plan, w, today) + "</div>";
    });
  } else {
    const d0 = courante.days[0], dN = courante.days[courante.days.length - 1];
    html += '<div class="load-card zn-wk-card">'
      + '<div class="zn-wk-head"><div class="zn-wk-title">Semaine en cours · S' + courante.num + "</div>"
      + '<div class="zn-wk-range">' + (d0 ? fmtDay(d0.date) + " – " + fmtDay(dN.date) : "")
      + " · " + esc(courante.phase.nom) + (courante.isRecup ? " · récup" : "") + "</div></div>"
      + '<div class="load-sub">' + courante.vol + " h au programme. La grille complète et la coche vivent dans 📅 Semaine — un seul dessin, un seul geste.</div>"
      + '<div class="nav" style="margin-top:12px"><button class="btn" id="openWk" type="button">📅 Ouvrir la semaine</button></div>'
      + "</div>";
  }
  // Retour utilisateur (08/08/2026) : « on redonne la semaine du jour ? double emploi ? ».
  // C'est un doublon ASSUMÉ (R16.9 : « un seul dessin, deux points de vue », weekGridHTML sert
  // les deux onglets), pas un oubli — retirer la grille d'ici casserait le geste « je coche
  // depuis Plan sans changer d'onglet », et R16.9 documente déjà pourquoi un DEUXIÈME chemin de
  // rendu serait pire (deux comportements pour un même clic). Ce que 📅 Semaine ajoute
  // (navigation semaine par semaine, bilan chiffré) n'existe nulle part ici : un pointeur plutôt
  // qu'une duplication silencieuse.
  if (!S.showAllWeeks && plan.totalWeeks > 1)
    html += '<div class="wk-skip">⋯ ' + (plan.totalWeeks - 1) + " autre" + (plan.totalWeeks > 2 ? "s" : "")
      + " semaine" + (plan.totalWeeks > 2 ? "s" : "") + " — « Voir les " + plan.totalWeeks + " semaines » ci-dessous ⋯</div>";
  // R23.10 — LES CONSEILS PERSONNALISÉS ARRIVENT ICI, venus du Profil : ce sont des conseils sur
  // la PRÉPARATION, pas des données d'identité. Repliés, comme au Profil — on ne les impose pas.
  //
  // Retour utilisateur (08/08/2026) : « Conseils personnalisés / Pourquoi ce plan / Décisions du
  // moteur se répètent beaucoup ». Vérifié : « Pourquoi ce plan » EST le résumé de « Décisions du
  // moteur » par construction (R23.6, même source `plan._v2.decisions[]`, l'un cite l'autre) —
  // un sommaire redit forcément une partie du détail, ce n'est pas le doublon visé. « Conseils
  // personnalisés » est la vraie source SÉPARÉE : `evalRules` relit `S.answers` (le
  // QUESTIONNAIRE), pas le plan calculé — deux moteurs, un même sujet (ex. plafond de volume),
  // qui peuvent se répéter en substance sans jamais se contredire (une seule source de vérité au
  // niveau du CALCUL, R11.1 ; deux niveaux de LECTURE : ce que tu as répondu / ce que le plan en
  // a fait). Nommer la différence plutôt que fusionner deux moteurs à la logique distincte —
  // une fusion mal faite risquerait de faire disparaître un garde-fou de sécurité (ferritine,
  // cycle) que `evalRules` porte seul.
  {
    const rules = evalRules(a, S.tier);
    if (rules.length)
      html += '<details class="load-card"><summary class="load-title" style="cursor:pointer">🧭 Conseils personnalisés ('
        + rules.length + ")</summary><div style=\"margin-top:8px\"><div class=\"load-sub\">Issus de tes réponses au questionnaire — avant génération, ce qu'elles impliquent.</div>" + rulesGrouped(rules) + "</div></details>";
  }
  html += whyPlanCardHTML(plan); // R23.6 — descendue ici, juste avant le détail dont elle est le résumé
  html += decisionsCardHTML(plan); // « Les décisions du moteur » — la transparence, en langage neutre
  // Retour utilisateur (08/08/2026, 2e passage) : « n'ont toujours pas leur place ici, à
  // effacer ». MAIS R23.12b (06/08) les avait explicitement fait QUITTER le Profil pour ici,
  // avec la raison inverse : les garder aux deux endroits, c'était « deux chemins vers le même
  // geste, dans deux onglets ». Les remettre au Profil referait exactement ce que R23.12b vient
  // de corriger — et les supprimer purement et simplement retirerait le SEUL chemin pour éditer
  // ses réponses ou changer de sport. Ils restent donc ICI (seul chemin, R11.1), mais derrière
  // un repli fermé par défaut au lieu d'une rangée atténuée toujours visible : ce sont des
  // gestes de compte (éditer ses réponses, exporter les données brutes, tout réinitialiser),
  // pas des actions sur CE plan — on les CHERCHE, on ne les subit pas à chaque ouverture.
  html += '<div class="warn" style="background:var(--bg2)">Intensités calibrées sur tes données. Les exports fonctionnent depuis cet onglet, quel que soit l’onglet consulté ensuite.</div>'
    + '<div class="nav" style="flex-wrap:wrap;gap:10px"><button class="btn gold" id="allW" type="button">' + (S.showAllWeeks ? "Revenir à la semaine en cours" : "Voir tout le plan (" + plan.totalWeeks + " semaines)") + '</button><button class="btn" id="prn" type="button">🖨 Version imprimable</button><button class="btn" id="expIcs" type="button">📅 Ajouter à mon agenda</button></div>'
    + '<details style="margin-top:8px"><summary class="load-sub" style="cursor:pointer">⚙ Réglages avancés (réponses, export brut, changer de sport)</summary><div class="nav" style="flex-wrap:wrap;gap:8px;margin-top:8px"><button class="btn" id="backBp" type="button" style="font-size:var(--fs-sm);padding:9px 12px">← Modifier mes réponses</button><button class="btn" id="expJson" type="button" style="font-size:var(--fs-sm);padding:9px 12px">{ } JSON</button><button class="btn" id="restartBtn" type="button" style="font-size:var(--fs-sm);padding:9px 12px">Changer de sport</button></div></details></div>';
  $("screen").innerHTML = html;
  bindPlanSubtabs(plan);
  znPlanSequence();
  const rerender = () => renderTabPlanGeneral(plan);
  bindPainBanner(plan, rerender);
  bindFeasibility(rerender);
  bindFeasibility(rerender);
  bindRetestBanner(today, () => renderTabPlanGeneral(ensurePlan())); // le retest a pu régénérer le plan
  // R6 — la frise de phases est cliquable : ouvre le programme de la phase et y descend.
  {
    const g = document.getElementById("goCurWk");
    if (g) g.onclick = () => {
      // Si la semaine n'est pas rendue (vue repliée), on déplie d'abord puis on y va.
      const aller = () => { const el = document.getElementById("gw" + g.dataset.wk); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
      if (!document.getElementById("gw" + g.dataset.wk)) { S.showAllWeeks = true; renderTabPlanGeneral(plan); setTimeout(aller, 60); }
      else aller();
    };
  }
  document.querySelectorAll("#screen [data-phseg]").forEach((b) => {
    b.onclick = () => {
      S._phOpen = S._phOpen === b.dataset.phseg ? null : b.dataset.phseg;
      renderTabPlanGeneral(plan);
      const el = document.querySelector('#screen .ph-obj[data-ph="' + b.dataset.phseg + '"]');
      if (el && S._phOpen) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  });
  document.querySelectorAll("#screen .ph-obj").forEach((dt) => {
    dt.addEventListener("toggle", () => {
      if (dt.open) S._phOpen = dt.dataset.ph; else if (S._phOpen === dt.dataset.ph) S._phOpen = null;
      // AUDIT UX — le programme se construit MAINTENANT, pas au rendu de l'onglet (voir
      // `programmePhaseHTML`). Ses coches doivent être liées comme celles du rendu : on
      // n'attache que sur les boutons NEUFS, sinon on relierait tout l'onglet à chaque
      // ouverture — l'inverse de ce que ce correctif cherche.
      const hote = dt.querySelector(".ph-prog");
      if (!dt.open || !hote || hote.innerHTML.trim()) return;
      const ph = plan.phases.find((x) => x.nom === dt.dataset.ph);
      if (!ph) return;
      hote.innerHTML = programmePhaseHTML(phaseStats(plan, ph));
      hote.querySelectorAll(".doneBtn").forEach((b) => {
        b.onclick = () => toggleDone(plan, b.dataset.dk, today, rerender);
      });
    });
  });
  $("backBp").onclick = () => { S.step = curSteps().length - 1; renderStep(); };
  $("allW").onclick = () => { S.showAllWeeks = !S.showAllWeeks; renderTabPlanGeneral(plan); window.scrollTo(0, 0); }; // re-rend la VUE — pas de buildPlan
  // R-ZENNA v6 — la carte de résumé emmène vers 📅 Semaine, où vivent la grille et la coche.
  const ouvrirSem = $("openWk");
  if (ouvrirSem) ouvrirSem.onclick = () => setTab("week");
  $("prn").onclick = () => downloadPlan();
  $("expIcs").onclick = () => exportICS();
  $("expJson").onclick = () => exportJSON();
  $("expPng").onclick = () => exportPNG();
  $("restartBtn").onclick = () => reset();
  document.querySelectorAll("#screen [data-swap]").forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const [wn, jour] = b.dataset.swap.split("|");
      handleSwapClick(plan, +wn, jour);
    };
  });
  document.querySelectorAll("#screen .doneBtn").forEach((b) => {
    b.onclick = () => toggleDone(plan, b.dataset.dk, today, rerender);
  });
}
