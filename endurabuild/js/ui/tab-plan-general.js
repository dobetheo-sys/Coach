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
import { driverBand, downloadPlan, decisionsCardHTML, whyPlanCardHTML, sessDetailsHTML, predictionViewHTML, journaliserProjection, intensityCardHTML, truncatedBannerHTML } from "./plan-view.js";
import { exportICS, exportJSON, sharePlanImage } from "../export.js";

// REFONTE 22a (05/09/2026) — LES BRIQUES DE LA VUE D'ENSEMBLE.
//
// Le canevas « Noir apaisé » (22a) ordonne l'écran ainsi : sous-onglets · bandeau R22 (s'il
// existe) · PANNEAU « Ta saison » (titre display, phrase, frise proportionnelle, « tu es ici ») ·
// LES PHASES à nu · CE QUI BORNE TON PLAN en creux · COURBE DE VOLUME en creux · SEMAINE EN
// COURS à nu. Chaque brique ci-dessous rend UNE de ces sections, avec les DONNÉES du moteur —
// jamais un chiffre du canevas. Les identifiants et classes que les gardes lisent (#expPng,
// .zn-jminus, .zn-prog-fill, .ph-line/.ph-seg[data-phseg], .ph-obj[data-ph], .vol-bars/.vb,
// .zn-wk-card/#openWk, #allW…) sont CONSERVÉS : c'est la forme qui change, pas les propriétés.

/** Un repli à nu (une ligne de liste qui s'ouvre) — remplace `replier`, qui posait une carte. */
function pli(h, titre, cls) {
  if (!h || !h.trim()) return h;
  return '<details class="zn-plan-fold' + (cls ? " " + cls : "") + '"><summary><span>' + titre
    + '</span><span class="zn-chev" aria-hidden="true">⌄</span></summary><div class="zn-plan-fold-b">' + h + "</div></details>";
}
/** Le nombre de semaines en toutes lettres pour un titre (« 10 semaines » reste en chiffres :
 *  c'est la forme du canevas, et un chiffre se lit plus vite qu'un mot dans un titre display). */
function fmtH(h) {
  if (h == null || isNaN(h)) return "";
  const t = Math.round(h * 60), hh = Math.floor(t / 60), mm = t % 60;
  return mm ? hh + " h " + String(mm).padStart(2, "0") : hh + " h";
}
/** Identifiant de phase → clé CSS (`--ph-<clé>`) : `id` d'abord, le nom en repli. */
function phaseKey(p) {
  const id = (p && p.id ? String(p.id) : "").toLowerCase();
  if (id) return id;
  const n = (p && p.nom ? p.nom : "").toLowerCase();
  return n.startsWith("dév") ? "dev" : n.startsWith("spé") ? "spec" : n.startsWith("aff") ? "taper" : n.startsWith("peak") || n.startsWith("pic") ? "peak" : "base";
}
const ABBR = { "Développement": "DÉV.", "Spécifique": "SPÉ.", "Affûtage": "AFF.", "Peak": "PIC", "Base": "BASE" };
/** « du spécifique », « de l'affûtage », « de la base », « du pic » — le nom du moteur, décliné. */
function deLaPhase(p) {
  const nom = p.nom === "Peak" ? "pic" : String(p.nom || "").toLowerCase();
  if (nom === "base") return "de la base";
  return (/^[aeiouyéèê]/.test(nom) ? "de l’" : "du ") + nom;
}

/** Le décompte et l'avancement (R23.5), portés par le panneau « Ta saison » (22a) : le J− garde
 *  sa classe `.zn-jminus` (entrée sur l'opacité, jamais sur le texte — voir `znPlanSequence`),
 *  la barre garde `.zn-prog-fill` (elle se remplit dans la chorégraphie). */
function avancementHTML(plan, today) {
  const rd = S.answers.race_date;
  let tete = "";
  if (rd) {
    const c = raceCountdown(S.answers, today);
    const j = c.jours;
    const fmtLabel = c.format || "ta course";
    const dateJ = " · " + fmtDay(rd) + "/" + rd.slice(0, 4);
    tete = j > 1 ? '<div class="zn-jminus">J−' + j + '</div><div class="zn-jminus-sub">avant ' + esc(fmtLabel) + esc(dateJ) + "</div>"
      : j === 1 ? '<div class="zn-jminus petit">Demain, jour J</div>'
      : j === 0 ? '<div class="zn-jminus petit">🏁 C’est aujourd’hui</div>'
      : '<div class="zn-jminus-sub">Course passée le ' + esc(fmtDay(rd)) + "</div>";
  }
  let barre = "";
  try {
    const pg = globalThis.EBV2.progress(plan, S.answers, today);
    const pct = Math.max(0, Math.min(100, pg.pctLoad));
    barre = '<div class="zn-prog-line"><b>Semaine ' + pg.weekNow + " / " + pg.totalWeeks + "</b>"
      + ' · <span>' + pg.pctLoad + " % de la charge accomplie</span></div>"
      + '<div class="zn-prog-track"><div class="zn-prog-fill" style="width:' + pct + '%"></div></div>';
  } catch (e) {}
  return '<div class="zn-count-hero"><div class="zn-saison-av">' + tete + "</div>" + barre
    + '<button class="zn-btn-2 zn-saison-partage" id="expPng" type="button">Partager mon avancement</button></div>';
}
import { momentHTML, painBannerHTML, bindPainBanner, toggleDone } from "./session-life.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { maybeShowMomentA } from "./moments.js";
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
        // Refonte 22a — les couleurs papier (#3f3a30 / #999) posées en INLINE ici rendaient un
        // programme illisible sur le fond sombre (elles gagnaient sur toute règle de thème) ; la
        // ligne porte désormais des classes, `zenna-plan.css` leur donne l'encre du thème.
        h += '<div class="zn-prog-day"><b class="zn-prog-day-j">' + d.jour + '</b><span class="zn-prog-day-d">' + fmtDay(d.date) + "</span> " + items + "</div>";
    });
  });
  return h;
}


/** La semaine qui contient aujourd'hui (ou la première à venir) et sa PHASE — le repère de
 *  « tu es ici » (frise), de « en cours » (phases) et de la barre orange (courbe). */
function repereCourant(plan, today) {
  const sem = plan.weeks.find((w) => w.days.some((d) => d.date === today))
    || plan.weeks.find((w) => w.days.some((d) => d.date >= today)) || null;
  if (!sem) return { sem: null, phase: null, rang: 0 };
  const memePhase = plan.weeks.filter((w) => w.phase && w.phase.nom === sem.phase.nom);
  return { sem, phase: sem.phase, rang: memePhase.findIndex((w) => w.num === sem.num) + 1, sur: memePhase.length };
}

/** LES PHASES À NU (22a) : un rail de la couleur de la phase, le nom en display, la durée et
 *  l'état, l'intention. Chaque ligne reste le `<details class="ph-obj" data-ph>` de R6 — le
 *  clic déroule le PROGRAMME de la phase (coches ✓ comprises), construit à l'ouverture (audit UX
 *  du 11/08/2026). La phase est « validée » quand TOUTES ses séances sont cochées. */
function phaseObjectivesHTML(plan, today) {
  const rep = repereCourant(plan, today);
  let h = '<div class="zn-plan-phases">';
  plan.phases.forEach((p) => {
    const st = phaseStats(plan, p);
    if (!st.wks.length) return; // phase entièrement retirée par la troncature (R22)
    const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
    const enCours = rep.phase && rep.phase.nom === p.nom;
    const passee = !enCours && st.wks.length && st.wks.every((w) => w.days.length && w.days[w.days.length - 1].date < today);
    const etat = st.validated ? "validé" : enCours ? "en cours" : st.done > 0 ? st.done + "/" + st.total + " séances ✓" : passee ? "passée" : "à venir";
    const cls = st.validated ? " ok" : enCours ? " now" : "";
    const open = S._phOpen === p.nom;
    h += '<details class="ph-obj' + cls + '" data-ph="' + esc(p.nom) + '"' + (open ? " open" : "") + ' style="--ph:var(--ph-' + phaseKey(p) + ')">'
      + '<summary><i class="zn-rail" aria-hidden="true"></i><div class="zn-ph-body">'
      + '<div class="zn-ph-head"><b class="zn-ph-nom">' + esc(p.nom) + "</b><span class=\"zn-ph-meta\">" + st.wks.length + " sem. · <i>" + etat + "</i></span></div>"
      + '<div class="zn-ph-goal">' + (PHASE_GOALS[phaseKey(p)] || "Une étape du plan, au service de la suivante.") + "</div>"
      + (st.done > 0 ? '<div class="zn-ph-track" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' : "")
      + "</div></summary>";
    // LE PROGRAMME n'est construit QUE si la phase est ouverte (voir `programmePhaseHTML`).
    h += '<div class="ph-prog">' + (open ? programmePhaseHTML(st) : "") + "</div>";
    if (st.validated) h += '<div class="zn-ph-valide">Phase validée — tout est fait. La suivante s’appuie sur ce travail.</div>';
    h += "</details>";
  });
  // Le mode d'emploi, en pied (R5/R6) — la phrase « Sous-objectifs — une phase à la fois » est
  // celle que le produit tient depuis R5 ; `smoke-retention` la lit.
  h += '<div class="zn-plan-hint">Sous-objectifs — une phase à la fois : touche une phase pour dérouler son programme. Coche toutes ses séances, la phase se valide.</div>';
  return h + "</div>";
}

/** LA FRISE (22a) : un segment par phase, large comme sa durée (`flex: p.weeks`), coloré par la
 *  phase, avec le marqueur « tu es ici » dans le segment courant. Chaque segment reste le
 *  bouton `[data-phseg]` de R6 (il ouvre le programme de la phase), avec ses deux libellés
 *  (R16.4 : le long et l'abrégé, `title`/`aria-label` portent toujours le nom complet). */
function phaseFriseHTML(plan, today) {
  const rep = repereCourant(plan, today);
  let html = '<div class="ph-line">';
  plan.phases.forEach((p) => {
    // Le nombre de semaines LIVRÉES de la phase (une prépa raccourcie, R22, retire des semaines
    // de base : `p.weeks` est l'original) ; une phase entièrement retirée n'a pas de segment.
    const nb = phaseStats(plan, p).wks.length;
    if (!nb) return;
    const ici = rep.phase && rep.phase.nom === p.nom;
    const pos = ici ? ((rep.rang - 0.5) / nb) * 100 : 0;
    html += '<button type="button" class="ph-seg' + (ici ? " now" : "") + '" data-phseg="' + esc(p.nom) + '" title="' + esc(p.nom) + '" aria-label="' + esc(p.nom) + ", " + nb + ' semaines" style="flex:' + nb + ";--ph:var(--ph-" + phaseKey(p) + ')">'
      + '<span class="ph-full">' + esc(p.nom) + '</span><span class="ph-abbr">' + esc(ABBR[p.nom] || p.nom) + "</span><em>" + p.weeks + "sem</em>"
      + (ici ? '<i class="zn-ici" aria-hidden="true" style="left:' + pos.toFixed(1) + '%"></i>' : "") + "</button>";
  });
  html += "</div>";
  const note = rep.phase ? " Tu es à la " + rep.rang + (rep.rang === 1 ? "re" : "e") + " semaine " + deLaPhase(rep.phase) + "." : "";
  return '<div class="zn-plan-frise">' + html + '<div class="zn-saison-note">La largeur d’un segment est sa durée réelle.' + note + "</div></div>";
}

/** LE PANNEAU « TA SAISON » (22a) — le seul bloc en surface bordée de la vue : titre display
 *  « N SEMAINES, DE X H À Y H », la phrase, la frise, puis le décompte et l'avancement (R23.5)
 *  et « ce qui pilote ton plan » (R4, conservé en pilules). */
function saisonPanelHTML(plan, today) {
  return '<section class="zn-panel zn-saison">'
    + '<div class="zn-eyebrow">Ta saison</div>'
    // `plan.weeks.length`, pas `plan.totalWeeks` : sur une prépa raccourcie (R22) `totalWeeks`
    // reste l'original (20) quand 17 semaines sont livrées — le titre dit ce que l'athlète reçoit,
    // et le bandeau R22 juste au-dessus dit la même chose (« raccourcie à 17 semaines »).
    + '<div class="zn-saison-titre zn-display">' + plan.weeks.length + " semaines,<br>de " + esc(fmtH(plan.volBase)) + " à " + esc(fmtH(plan.volPeak)) + "</div>"
    + '<div class="zn-saison-p">Semaines de 7 jours. Le volume monte jusqu’au pic, puis l’affûtage le fait redescendre.</div>'
    + phaseFriseHTML(plan, today)
    + avancementHTML(plan, today)
    + driverBand(S.answers)
    + "</section>";
}

/** CE QUI BORNE TON PLAN (22a) — les maillons R20.2 en creux : le pic livré, les séances par
 *  semaine (prescrites ET livrées, O-87/O-96), le départ (la rampe R10/O-69), les jours d'appui.
 *  Chaque ligne cite la DÉCISION du moteur qui la produit ; aucun chiffre n'est calculé ici. La
 *  dernière ligne ouvre le détail : « Pourquoi ce plan » (le résumé, R6/R23.6), « Les décisions
 *  du moteur » (le détail, #motorDecisions) et les conseils personnalisés (R23.10). */
function bornesHTML(plan) {
  const v2 = plan && plan._v2;
  const D = {};
  ((v2 && v2.decisions) || []).forEach((d) => { D[d.id] = d; });
  const rows = [];
  const row = (val, lab, txt) => rows.push('<div class="zn-borne"><b class="zn-borne-v zn-display">' + val + '</b><span class="zn-borne-t"><b>' + lab + "</b> — " + txt + "</span></div>");
  // Pic : la phrase du maillon R20.2 quand il existe (il nomme ce qui borne ET le levier),
  // sinon les deux plafonds dont le pic est le minimum (R20.2 / whyPlanCardHTML).
  const pic = D["R20.2"] ? esc(D["R20.2"].val) + "."
    : D.capacite && D.utile ? "le plus petit de ce que ton historique encaisse (" + esc(D.capacite.val) + ") et de ce que ton objectif demande vraiment (" + esc(D.utile.val) + ")."
    : D.capacite ? "le plafond que ton historique encaisse (" + esc(D.capacite.val) + ")." : "la semaine la plus haute du plan.";
  row(esc(fmtH(plan.volPeak)), "Pic", pic);
  if (D.budget) {
    const livre = D.budget.livre != null ? D.budget.livre : D.budget.val;
    row(esc(String(livre)), "Séances / sem.", "le rythme que ta semaine tient"
      + (D.recup ? ", avec une semaine allégée " + esc(D.recup.val) : "")
      + (D.budget.livre != null && D.budget.livre !== +D.budget.val ? " — " + esc(String(D.budget.val)) + " prescrites, ta semaine la plus fournie en livre " + esc(String(D.budget.livre)) : "") + ".");
  }
  const depart = D["R10-depart"] ? "ton volume réel des derniers mois, pas ta cible : " + esc(D["R10-depart"].val) + "."
    : D["O69-ancrage"] ? esc(D["O69-ancrage"].val) + "." : "la première semaine du plan, d’où la courbe monte.";
  row(esc(fmtH(plan.volBase)), "Départ", depart);
  if (D.impact) row(esc(String(D.impact.val).split("/")[0]), "Jours d’appui", "au plus par semaine : c’est l’impact qui blesse, pas le volume.");
  const nD = (v2 && v2.decisions && v2.decisions.length) || 0, nW = (v2 && v2.warnings && v2.warnings.length) || 0;
  const rules = evalRules(S.answers, S.tier);
  let more = whyPlanCardHTML(plan) + decisionsCardHTML(plan);
  if (rules.length)
    more += '<details class="load-card zn-conseils"><summary class="load-title" style="cursor:pointer">🧭 Conseils personnalisés ('
      + rules.length + ")</summary><div style=\"margin-top:8px\"><div class=\"load-sub\">Issus de tes réponses au questionnaire — avant génération, ce qu'elles impliquent.</div>" + rulesGrouped(rules) + "</div></details>";
  return '<div class="zn-creux zn-bornes">' + rows.join("")
    + '<details class="zn-bornes-more"><summary><span>' + nD + " décision" + (nD > 1 ? "s" : "") + " · " + nW + " limite" + (nW > 1 ? "s" : "") + " connue" + (nW > 1 ? "s" : "")
    + '</span><span class="zn-chev" aria-hidden="true">⌄</span></summary><div class="zn-bornes-more-b">' + more + "</div></details></div>";
}

/** LA COURBE DE VOLUME (22a) — une barre par semaine, colorée par son RÔLE et non par sa
 *  phase (audit UX du 11/08/2026 : cinq teintes sur quarante barres saturent) : récup en
 *  violet, semaine courante en orange, pic en jaune, le reste en gris ; le FILET sous les
 *  barres reprend les couleurs de la frise, c'est lui qui dit quelle phase porte quel volume.
 *  Les hauteurs sont des pourcentages du pic LIVRÉ (`plan.volPeak`). */
function courbeVolumeHTML(plan, today) {
  const rep = repereCourant(plan, today);
  const semC = rep.sem;
  const peak = Math.max(0.1, plan.volPeak || Math.max(...plan.weeks.map((w) => w.vol)));
  const iPic = plan.weeks.reduce((best, w, i) => (w.vol > plan.weeks[best].vol ? i : best), 0);
  const n = plan.weeks.length, pas = Math.max(1, Math.ceil(n / 10));
  let bars = "", axe = "";
  plan.weeks.forEach((w, i) => {
    const pct = Math.max(4, Math.round((w.vol / peak) * 100));
    const ici = semC && w.num === semC.num, pic = i === iPic;
    const cls = ici ? " now" : pic ? " pic" : w.isRecup ? " recup" : "";
    bars += '<div class="vb' + cls + '" style="height:' + pct + '%;--i:' + i + '" title="S' + w.num + " " + w.vol + "h · " + esc(w.phase.nom) + (w.isRecup ? " · récup" : "") + '"></div>';
    const lab = ici || pic || i === 0 || i === n - 1 || (i % pas === 0);
    axe += '<span' + (ici ? ' class="now"' : pic ? ' class="pic"' : "") + ">" + (lab ? w.num : "") + "</span>";
  });
  let filet = "";
  plan.phases.forEach((p) => { const nb = phaseStats(plan, p).wks.length; if (nb) filet += '<i style="flex:' + nb + ";--ph:var(--ph-" + phaseKey(p) + ')"></i>'; });
  const recupW = plan.weeks.filter((w) => w.isRecup);
  const recupRef = recupW.length ? (semC ? recupW.reduce((b, w) => (Math.abs(w.num - semC.num) < Math.abs(b.num - semC.num) ? w : b), recupW[0]) : recupW[0]) : null;
  const basePct = Math.round((plan.volBase / peak) * 100);
  let legende = "";
  if (semC) legende += '<span><i class="now"></i>Semaine ' + semC.num + " · " + esc(fmtH(semC.vol)) + "</span>";
  legende += '<span><i class="pic"></i>Pic · ' + esc(fmtH(plan.weeks[iPic].vol)) + "</span>";
  if (recupRef) legende += '<span><i class="recup"></i>Récup · ' + esc(fmtH(recupRef.vol)) + "</span>";
  // `.dense` : au-delà de 20 semaines, la gouttière de 4 px du canevas (dessiné sur 10 barres)
  // mangerait la moitié des barres — la feuille la resserre à 2 px.
  return '<div class="zn-creux zn-courbe' + (n > 20 ? " dense" : "") + '">'
    + '<div class="zn-courbe-plot"><span class="zn-courbe-ymax">' + esc(fmtH(plan.weeks[iPic].vol)) + "</span>"
    + '<i class="zn-courbe-lmax" aria-hidden="true"></i>'
    + '<div class="zn-courbe-zone"><i class="zn-courbe-lbase" style="bottom:' + basePct + '%" aria-hidden="true"></i><span class="zn-courbe-ybase" style="bottom:' + basePct + '%">' + esc(fmtH(plan.volBase)) + "</span>"
    + '<div class="vol-bars">' + bars + "</div></div>"
    + '<div class="zn-courbe-filet" aria-hidden="true">' + filet + "</div>"
    + '<div class="zn-courbe-axe" aria-hidden="true">' + axe + "</div></div>"
    + '<div class="zn-courbe-leg">' + legende + "</div>"
    + '<div class="zn-courbe-note">Le filet sous les barres reprend les couleurs de la frise : tu vois d’un coup quelle phase porte quel volume.</div>'
    + "</div>";
}

/** SEMAINE EN COURS (22a) — une ligne à nu, rail orange, qui OUVRE 📅 Semaine (R-ZENNA v6 : la
 *  grille et la coche vivent là-bas, un seul dessin, un seul geste). `.zn-wk-card` et `#openWk`
 *  sont les crochets que les gardes lisent (U15, smoke-checkin). */
function semaineEnCoursHTML(courante) {
  const d0 = courante.days[0], dN = courante.days[courante.days.length - 1];
  return '<div class="zn-list"><button type="button" class="zn-row zn-wk-card" id="openWk"><i class="zn-rail" aria-hidden="true"></i>'
    + '<div class="zn-wk-body"><div class="zn-wk-title">S' + courante.num + " · " + esc(courante.phase.nom) + (courante.isRecup ? " · récup" : "") + "</div>"
    + '<div class="zn-wk-range">' + (d0 ? fmtDay(d0.date) + " – " + fmtDay(dN.date) : "") + " · " + esc(fmtH(courante.vol)) + " au programme</div></div>"
    + '<span class="zn-chev" aria-hidden="true">›</span></button></div>';
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
  // Chantier partage étape 3, Format A — la déclaration de saison, une fois, le jour où le plan
  // est créé (jourDeCreation() y redirige déjà l'atterrissage — tabs.js). Effet de bord DOM
  // pur (un overlay), sans rapport avec `html` : peut se poser avant tout calcul de rendu.
  maybeShowMomentA(plan);
  let html = momentHTML(plan, today) + painBannerHTML() + retestBannerHTML(today);
  // R28 — PLAN GAGNE DEUX SOUS-ONGLETS (décision du fondateur, 12/08/2026). Le composant est
  // repris À L'IDENTIQUE de celui d'Outils — depuis la FOUNDATION (04/09/2026) c'est la
  // primitive `.zn-seg > .zn-seg-btn` du canevas (22a : « VUE D'ENSEMBLE / PRÉDICTION ») ;
  // `.subtab`, `.btn` et `data-plansub` restent, ce sont eux que les gardes lisent.
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
  html += '<div class="subtabs zn-seg" role="tablist" aria-label="Plan">'
    + '<button type="button" class="btn subtab zn-seg-btn' + (sub === "overview" ? " active" : "") + '" data-plansub="overview"'
    + ' role="tab" aria-selected="' + (sub === "overview") + '">Vue d’ensemble</button>'
    + '<button type="button" class="btn subtab zn-seg-btn' + (sub === "pred" ? " active" : "") + '" data-plansub="pred"'
    + ' role="tab" aria-selected="' + (sub === "pred") + '">Prédiction</button></div>';
  if (sub === "pred") {
    html += '<div class="zn-fadeview zn-plan" id="planPred">' + predictionViewHTML(plan, prJournal) + "</div>";
    $("screen").innerHTML = html;
    bindPlanSubtabs(plan);
    znPredSequence();
    return;
  }
  // ═══ LA VUE D'ENSEMBLE (22a) — l'ORDRE est celui du canevas, et il tient les arbitrages
  // antérieurs : le décompte et l'avancement viennent en tête (R23.5, dans le panneau « Ta
  // saison »), « Pourquoi ce plan » vient APRÈS (R23.6, derrière « ce qui borne »), la prédiction
  // a son sous-onglet (R28), la grille vit dans 📅 Semaine (R-ZENNA v6) et le plan ENTIER reste
  // à un bouton (U15). ═══
  const courante = currentWeek(plan);
  const rep = repereCourant(plan, today);
  html += '<div class="zn-plan">';
  // R22 — le bandeau de préparation tronquée, en tête et hors de tout repliable.
  html += truncatedBannerHTML(plan);
  html += saisonPanelHTML(plan, today);
  const nPhases = plan.phases.filter((p) => phaseStats(plan, p).wks.length).length;
  html += '<div class="zn-sec"><span>Les ' + nPhases + " phases</span><i></i><span>" + (rep.phase ? esc(rep.phase.nom) + " en cours" : "") + "</span></div>";
  html += phaseObjectivesHTML(plan, today);
  html += '<div class="zn-sec zn-sec-espace"><span>Ce qui borne ton plan</span><i></i></div>';
  html += bornesHTML(plan);
  // RV — le chrono visé et son verdict, juste après ce qui borne : c'est la même question posée
  // dans l'autre sens. Absente hors des sports que le prototype sait inverser.
  html += feasibilityCardHTML(plan);
  html += '<div class="zn-sec zn-sec-espace"><span>Courbe de volume</span><i></i><span>' + esc(fmtH(plan.volBase)) + " → " + esc(fmtH(plan.volPeak))
    + (plan.weeks.length ? " → " + esc(fmtH(plan.weeks[plan.weeks.length - 1].vol)) : "") + "</span></div>";
  html += courbeVolumeHTML(plan, today);
  // R23.7 / R23.9 — la répartition des intensités appartient au plan, repliée (« une version
  // plus compacte, puis un déroulable avec les explications »).
  html += '<div class="zn-list zn-plan-folds">' + pli(intensityCardHTML(plan), "Répartition des intensités") + "</div>";
  if (S.showAllWeeks) {
    // U15 — LA VUE COMPLÈTE : toutes les semaines, avec leurs grilles (le SEUL producteur de
    // cases est `weekGridHTML`, consommé aussi par 📅 Semaine — un seul dessin).
    html += '<div class="zn-sec zn-sec-espace"><span>Les ' + plan.weeks.length + " semaines</span><i></i></div>";
    // R16.5 — le raccourci vers la semaine en cours n'a d'objet que dans cette vue.
    const cur = plan.weeks.find((w) => w.days.some((d) => d.date === today));
    if (cur) html += '<div class="zn-plan-actions"><button class="zn-btn-2" id="goCurWk" type="button" data-wk="' + cur.num + '">↓ Aller à la semaine en cours (S' + cur.num + ")</button></div>";
    plan.weeks.forEach((w) => {
      html += '<div class="gw" id="gw' + w.num + '">' + weekHeaderHTML(w) + weekGridHTML(plan, w, today) + "</div>";
    });
  } else {
    html += '<div class="zn-sec zn-sec-espace"><span>Semaine en cours</span><i></i></div>';
    html += semaineEnCoursHTML(courante);
  }
  // Les gestes sur le plan entier, puis les gestes de COMPTE derrière un repli (R23.12b : un
  // seul chemin pour éditer ses réponses ou changer de sport, qu'on CHERCHE et qu'on ne subit pas).
  html += '<div class="zn-plan-actions"><button class="zn-btn-2" id="allW" type="button">' + (S.showAllWeeks ? "Revenir à la semaine en cours" : "Voir les " + plan.weeks.length + " semaines") + "</button>"
    + '<div class="zn-plan-actions-2"><button class="zn-btn-2" id="prn" type="button">Version imprimable</button><button class="zn-btn-2" id="expIcs" type="button">Ajouter à mon agenda</button></div></div>'
    + '<div class="zn-plan-fine">Intensités calibrées sur tes données. Les exports fonctionnent depuis cet onglet, quel que soit l’onglet consulté ensuite.</div>'
    + '<details class="zn-plan-fold zn-plan-reglages"><summary><span>Réglages avancés — réponses, export brut, changer de sport</span><span class="zn-chev" aria-hidden="true">⌄</span></summary>'
    + '<div class="zn-plan-fold-b zn-plan-actions-2"><button class="zn-btn-2" id="backBp" type="button">← Modifier mes réponses</button><button class="zn-btn-2" id="expJson" type="button">{ } JSON</button><button class="zn-btn-2" id="restartBtn" type="button">Changer de sport</button></div></details>';
  html += "</div>";
  $("screen").innerHTML = html;
  bindPlanSubtabs(plan);
  znPlanSequence();
  const rerender = () => renderTabPlanGeneral(plan);
  bindPainBanner(plan, rerender);
  bindFeasibility(rerender);
  bindRetestBanner(today, () => renderTabPlanGeneral(ensurePlan())); // le retest a pu régénérer le plan
  {
    const g = document.getElementById("goCurWk");
    if (g) g.onclick = () => {
      const aller = () => { const el = document.getElementById("gw" + g.dataset.wk); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
      if (!document.getElementById("gw" + g.dataset.wk)) { S.showAllWeeks = true; renderTabPlanGeneral(plan); setTimeout(aller, 60); }
      else aller();
    };
  }
  // R6 — la frise de phases est cliquable : ouvre le programme de la phase et y descend.
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
  // R-ZENNA v6 — la ligne « semaine en cours » emmène vers 📅 Semaine, où vivent la grille et la coche.
  const ouvrirSem = $("openWk");
  if (ouvrirSem) ouvrirSem.onclick = () => setTab("week");
  $("prn").onclick = () => downloadPlan();
  $("expIcs").onclick = () => exportICS();
  $("expJson").onclick = () => exportJSON();
  // Chantier partage, étape A (07/09/2026) — même mécanisme que les 6 autres visuels du
  // produit : partage natif si le navigateur le permet, repli téléchargement sinon
  // (`sharePlanImage`, `export.js`). Avant cette étape, ce bouton téléchargeait directement.
  $("expPng").onclick = () => sharePlanImage();
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
