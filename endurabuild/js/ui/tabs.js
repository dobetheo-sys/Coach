// Conteneur d'onglets — navigation seule, AUCUNE logique métier (brief onglets).
// RÈGLE DE FOND : le plan est généré UNE fois (S.currentPlan) ; un changement
// d'onglet ne rappelle JAMAIS buildPlan — les onglets sont des vues du même objet.
import { S, $, ebSave, todayISO } from "../state.js";
import { refreshMeasured } from "../measured.js";
import { buildPlan, EBGenerationError } from "../app.js";
import { renderTabProfile } from "./tab-profile.js";
import { renderTabPlanGeneral } from "./tab-plan-general.js";
import { renderTabToday } from "./tab-today.js";
import { renderTabOutils } from "./tab-outils.js";
import { renderTabWeek } from "./tab-week.js";
import { brancherAide } from "./help.js";
import { znApplyNavDot, znClearStickyCta, znClearParallax } from "./zenna-motion.js"; // R-ZENNA
import { appHeaderHTML } from "./app-header.js";

// Refonte R5 (retour utilisateur) : l'onglet CENTRAL 🎯 Aujourd'hui est l'écran du
// quotidien (check-in diaporama → séance du jour → prédiction → charge → avancement),
// mis en valeur dans la barre (classe tab-central). L'ancien Avancement y est fondu,
// l'ancien Suivi est redistribué (avatar/badges → Profil, checklist → Aujourd'hui).
// R16.9 avait fondu 📅 Semaine dans 🗓 Plan (cinq onglets → quatre). R18.3 la RESTAURE, sur
// retour du fondateur après test : « je préférais 5 onglets que 4, l'œil humain aime les
// chiffres impairs ». Et il a une raison de plus que l'esthétique : 🎯 Aujourd'hui est
// l'onglet CENTRAL du produit depuis R5 — avec quatre onglets, « central » n'existe pas.
// L'ordre ci-dessous le place en TROISIÈME sur cinq, donc réellement au milieu.
//
// Ce que la restauration ne ramène PAS : la coche en deux versions. R16.9 avait découvert
// que cocher depuis Semaine et cocher depuis Plan ne faisaient pas la même chose — le
// nouveau `tab-week.js` consomme `weekGridHTML` et `toggleDone` comme 🗓 Plan, sans
// redessiner sa propre grille. Un identifiant d'onglet inconnu retombe sur le dernier onglet
// par le repli déjà en place dans `renderActiveTab`.
//
// R24.9 (retour fondateur, 06/08) — l'onglet Nutrition avait DISPARU de la barre : son
// contenu du JOUR (ravitaillement + dépense estimée) vit en version réduite dans
// 🎯 Aujourd'hui, rendu par les mêmes fonctions (tab-nutrition.js reste le module). Cette
// décision révisait la préférence « cinq onglets, l'œil aime les chiffres impairs » de R18.3.
//
// 🧰 Outils (retour utilisateur, 07/08/2026) : la version réduite ne loge pas tout — le
// ravitaillement sur l'ENSEMBLE du plan (tunnel de commande compris) n'a pas sa place dans
// un résumé du jour. Outils lui donne un foyer, à consulter plutôt qu'à suivre —
// `tab-outils.js` porte sa propre navigation en SOUS-onglets (Nutrition en premier
// arrivant), extensible sans toucher cette barre-ci. Le compte revient à CINQ (Outils prend
// la place de Nutrition) : la position centrale d'Aujourd'hui ne bouge pas.
const TABS = [
  ["profile", "\u{1F4CB}", "Profil", renderTabProfile],
  ["general", "\u{1F5D3}", "Plan", renderTabPlanGeneral],
  ["today", "\u{1F3AF}", "Aujourd’hui", renderTabToday],
  ["week", "\u{1F4C5}", "Semaine", renderTabWeek],
  ["outils", "\u{1F9F0}", "Outils", renderTabOutils],
];

let activeTab = "today"; // défaut : l'onglet central — le point du matin d'abord

/**
 * U11 — LE JOUR OÙ LE PLAN EST CRÉÉ, ON MONTRE LE PLAN.
 *
 * Mesuré en traversant l'app comme un nouvel utilisateur : **8 écrans, 30 gestes** pour arriver
 * au bout du questionnaire — et le tout premier écran affiché ensuite était le check-in, donc
 * TROIS QUESTIONS DE PLUS. La personne vient de payer trente réponses pour voir son plan ; on
 * lui en redemande.
 *
 * Le check-in en diaporama est juste — pour quelqu'un qui REVIENT. Il est faux à la seconde
 * zéro, et c'est cette seconde-là qui décide si la personne reste. Même famille qu'U1, où
 * consoler quelqu'un d'un décrochage qui n'avait pas eu lieu était pire qu'un reproche : une
 * mécanique bonne au régime permanent, appliquée à un instant où elle n'a pas de sens.
 *
 * CE QUI NE CHANGE PAS : le portillon lui-même. 🎯 Aujourd'hui continue de demander le point du
 * jour avant de montrer la séance, tous les jours, y compris le premier. On change l'onglet
 * d'ARRIVÉE, pas la règle — et seulement le jour de la création (`plan_start`), parce qu'un
 * check-in n'a de toute façon rien à adapter sur un plan qui n'a pas encore d'historique.
 *
 * ATTENTION À L'ORDRE, ET J'AI DÛ LE MESURER POUR LE VOIR. Ma première écriture testait
 * `!!S.answers.plan_start && … === todayISO()` en commentant « ensurePlan a déjà posé
 * plan_start à ce stade ». Faux : `renderPlan()` fait `invalidatePlan(); renderTabs();` et c'est
 * `renderTabs` → `renderActiveTab` → `ensurePlan` qui pose l'ancre. Au moment du test, elle
 * n'existe pas encore — la garde E2E est sortie rouge sur les trois critères. L'ancre ABSENTE
 * est donc, elle aussi, le signe d'une création à l'instant.
 */
function jourDeCreation() {
  return !S.answers.plan_start || S.answers.plan_start === todayISO();
}

/** Le SEUL endroit où le plan se (re)calcule. Invalidé par reset/Modifier/édition profil. */
export function ensurePlan() {
  if (!S.currentPlan) {
    // Ancre calendaire : posée UNE fois à la première génération — sans elle, la semaine 1
    // re-glisserait au lundi courant à chaque ouverture et le plan n'avancerait jamais.
    if (!S.answers.plan_start) { S.answers.plan_start = todayISO(); ebSave(); }
    S.currentPlan = buildPlan(S.answers);
    // R6 §3.3 — cadence de recalibration : l'instantané des données réalisées ne se rafraîchit
    // qu'en semaine de décharge (ou à la toute première fois). S'il a bougé, on régénère UNE
    // fois — jamais en boucle, le plan reste une fonction pure de ses entrées.
    if (refreshMeasured(S.currentPlan)) S.currentPlan = buildPlan(S.answers);
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

/**
 * Écran d'échec de génération (spec R10 § R10.0.2). Volontairement PAS un `console.warn` :
 * l'athlète doit savoir qu'il n'a pas de plan, et savoir que son profil est intact. Le
 * générateur de repli produisait un plan dégradé en silence — c'est exactement ce qu'on
 * refuse maintenant.
 */
function renderGenerationFailure(err) {
  const screen = $("screen");
  if (!screen) return;
  const cause = err && err.cause;
  // R11 — refus d'ENTRÉE : la cause est une réponse, pas un bug. On la nomme, on explique
  // comment la corriger, et on emmène l'athlète là où il peut le faire. Un refus motivé vaut
  // infiniment mieux qu'un plan bâti sur une valeur fausse.
  if (err && err.code === "ENTREE_INVALIDE" && cause) {
    screen.innerHTML =
      '<div class="card" role="alert" style="border-color:#c0392b">'
      + '<h2 style="margin-top:0">Le plan n’a pas été généré</h2>'
      + "<p>" + String(cause.human || cause.message) + "</p>"
      + "<p><b>Ton profil est conservé</b> — rien n’a été perdu.</p>"
      + '<div class="nav" style="gap:10px"><button type="button" class="btn primary" id="ebFixInput">Corriger ma réponse</button>'
      + '<button type="button" class="btn" id="ebRetryGen">Réessayer</button></div>'
      // R22 — LA TROISIÈME SORTIE, et seulement quand elle existe VRAIMENT.
      // `cause.bypass` est calculé par le moteur (`truncatedPrep`) et voyage sur l'erreur :
      // décider ici si le bouton s'affiche demanderait de recopier la règle de plancher,
      // donc d'en avoir deux (R11.1). Sur un Ironman à 14 semaines, `possible` est faux et
      // le bouton n'apparaît pas — proposer une issue qui sera refusée serait pire que rien.
      + (cause.bypass && cause.bypass.possible
        ? '<div class="why" style="margin-top:12px;border-top:1px solid var(--line,#ddd);padding-top:12px">'
          + "<b>Tu es déjà en préparation ?</b> Le plan peut démarrer directement en charge, en "
          + "retirant les " + cause.bypass.aRetirer + " premières semaines de mise en route. "
          + "Cela suppose une base d'entraînement déjà acquise."
          + '<div style="margin-top:8px"><button type="button" class="btn" id="ebTruncate">'
          + "Continuer quand même (prépa déjà avancée)</button></div></div>"
        : "")
      + '<div class="why" style="margin-top:10px">Réponse concernée : <code>' + String(cause.key)
      + "</code> = <code>" + JSON.stringify(cause.value) + "</code> — attendu : " + String(cause.expected) + "</div></div>";
    // On renvoie au QUESTIONNAIRE, pas au Profil : le Profil est une vue du plan, et il n'y a
    // justement pas de plan. Import différé — `steps.js` importe déjà ce module.
    const fix = $("ebFixInput");
    if (fix) fix.onclick = async () => {
      invalidatePlan();
      const st = await import("./steps.js");
      hideTabs(); S.onPlan = false; ebSave();
      // ── LE BOUTON VISE LA RÉPONSE EN CAUSE, PLUS LA DERNIÈRE ÉTAPE ──
      //
      // Il envoyait à `curSteps().length - 1` quelle que soit la clé refusée : sur un refus
      // `race_date`, l'athlète atterrissait sur une étape qui ne contient pas de date et
      // devait la chercher. Le refus nomme pourtant la clé, et l'affiche à l'écran.
      //
      // L'étape est TROUVÉE, pas déclarée : on cherche laquelle rend un champ portant cette
      // clé. Une table « clé → numéro d'étape » serait une seconde source de vérité, et elle
      // deviendrait fausse à la première réorganisation du questionnaire — U14 en a justement
      // réorganisé l'ordre, et quatre suites E2E codaient la séquence en dur.
      const key = String(cause.key || "").replace(/[^\w-]/g, "");
      const steps = st.curSteps();
      let idx = -1;
      if (key) {
        const motif = new RegExp('data-(?:input|key)="' + key + '"');
        for (let i = 0; i < steps.length; i++) {
          let html = "";
          try { html = steps[i].render() || ""; } catch (e) { html = ""; }
          if (motif.test(html)) { idx = i; break; }
        }
      }
      S.step = idx >= 0 ? idx : Math.max(0, steps.length - 1);
      st.renderStep();
      // …et le champ s'OUVRE. Pour une date, c'est le calendrier natif : demander de corriger
      // une date puis laisser l'athlète chercher le champ, c'est faire la moitié du chemin.
      requestAnimationFrame(() => {
        const el = key && document.querySelector('[data-input="' + key + '"], [data-key="' + key + '"]');
        if (!el) return;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        if (typeof el.focus === "function") el.focus({ preventScroll: true });
        // `showPicker()` exige une activation transitoire : le clic la fournit, mais l'import
        // dynamique peut l'avoir consommée. On tente, et le focus reste le repli — jamais
        // d'exception qui remonterait pour un confort d'affichage.
        if (el.tagName === "INPUT" && typeof el.showPicker === "function") {
          try { el.showPicker(); } catch (e) { /* le champ est focalisé, ça suffit */ }
        }
      });
    };
    const rb = $("ebRetryGen");
    if (rb) rb.onclick = () => { invalidatePlan(); renderActiveTab(); };
    // R22 — le drapeau est posé DANS les réponses, donc il persiste : sans ça, la moindre
    // régénération (changement d'onglet, réouverture) ramènerait le refus, et l'athlète
    // devrait re-cliquer chaque fois. Il reste réversible depuis le questionnaire.
    const tb = $("ebTruncate");
    if (tb) tb.onclick = () => {
      S.answers.truncate_prep = true;
      ebSave();
      invalidatePlan();
      renderActiveTab();
    };
    return;
  }
  screen.innerHTML =
    '<div class="card" role="alert" style="border-color:#c0392b">'
    + '<h2 style="margin-top:0">La génération du plan a échoué</h2>'
    + "<p>Rien n’a été enregistré — <b>ton profil est conservé</b>. Réessaie ; si le problème "
    + "persiste, signale-le.</p>"
    + '<button type="button" class="btn" id="ebRetryGen">Réessayer</button>'
    + '<div class="why" style="margin-top:10px">Détail technique : <code>'
    + String((err && err.code) || "INCONNU") + "</code>"
    + (err && err.cause && err.cause.message ? " — " + String(err.cause.message).slice(0, 200) : "")
    + "</div></div>";
  const btn = $("ebRetryGen");
  if (btn) btn.onclick = () => { invalidatePlan(); renderActiveTab(); };
  const bar = $("ebTabbar");
  if (bar) bar.remove(); // aucune vue de plan n'a de sens sans plan
}

function renderActiveTab() {
  let plan;
  try {
    plan = ensurePlan();
  } catch (e) {
    if (e instanceof EBGenerationError) { renderGenerationFailure(e); return; }
    throw e;
  }
  const screen = $("screen");
  if (screen) { screen.setAttribute("role", "tabpanel"); screen.dataset.tab = activeTab; } // desktop — cible le CSS par onglet
  // R-ZENNA — reskin visuel scopé à l'onglet Aujourd'hui (voir css/zenna-today.css). Purement
  // cosmétique : aucune classe/aucun id fonctionnel ne dépend de `theme-zenna`, seule la
  // feuille de style le lit. Retirée dès qu'on quitte l'onglet — les quatre autres gardent
  // l'habillage papier/collage au caractère près.
  // R-ZENNA (extension) — LE THÈME VAUT MAINTENANT POUR TOUS LES ONGLETS.
  //
  // Il n'était posé que sur « Aujourd'hui » tant que le reskin était une preuve de concept
  // scopée. Le produit n'a pas à changer d'identité visuelle en changeant d'onglet : la classe
  // est désormais permanente tant qu'on est dans la vue à onglets, et `hideTabs()` la retire
  // au retour au questionnaire.
  //
  // CE QUI RESTE PROPRE À AUJOURD'HUI, et c'est délibéré : la CASCADE d'entrée (`znPlay`), le
  // CTA collant et le parallax du héros. La cascade est le geste d'ARRIVÉE — pertinent sur
  // l'écran qu'on ouvre chaque matin, coûteux sur un onglet de consultation qu'on parcourt en
  // aller-retour (`.rise` met le contenu à opacité 0 en attendant son animation, donc chaque
  // retour rejouerait une attente). Les quatre autres onglets prennent la PALETTE, pas le
  // mouvement d'entrée.
  document.body.classList.add("theme-zenna");
  // Les deux éléments FLOTTANTS du reskin vivent hors de `#screen` : ils survivraient donc à un
  // changement d'onglet, qui ne remplace que `#screen`. L'onglet Aujourd'hui les repose lui-même.
  if (activeTab !== "today") { znClearStickyCta(); znClearParallax(); }
  // R-ZENNA v5 — l'en-tête partagé. Il vit HORS de `#screen` (comme la barre d'onglets) parce
  // que `#screen` est remplacé à chaque changement d'onglet ; mais il est re-rendu à chaque
  // fois, car son contenu dépend du JOUR (décompte, date, semaine) ET de l'onglet actif (la
  // puce ne pointe pas vers l'onglet où l'on se trouve déjà).
  const entete = $("ebAppHeader");
  if (entete) {
    entete.innerHTML = appHeaderHTML(plan, todayISO(), activeTab);
    const puce = entete.querySelector("[data-goto]");
    if (puce) {
      const aller = () => setTab(puce.dataset.goto);
      puce.onclick = aller;
      puce.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); aller(); } };
    }
  }
  const tab = TABS.find((t) => t[0] === activeTab) || TABS[TABS.length - 1];
  tab[3](plan);
  const bar = $("ebTabbar");
  if (bar) bar.innerHTML = tabbarHTML();
  bindTabbar();
  // R-ZENNA — la pastille « une séance t'attend » se repose APRÈS la reconstruction de la
  // barre : posée pendant le rendu de l'onglet, la ligne du dessus l'effacerait aussitôt.
  // Son état vit dans `zenna-motion.js`, pas dans le DOM, précisément pour survivre à ça.
  znApplyNavDot();
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
  // U18 — l'écouteur délégué du « ? » est branché ici, une fois : chaque re-rendu d'onglet
  // remplace le HTML, donc un écouteur posé sur les boutons eux-mêmes disparaîtrait avec eux.
  brancherAide();

  S.onPlan = true;
  ebSave();
  // U11 — l'arrivée sur le plan le jour de sa création.
  if (jourDeCreation() && activeTab === "today") activeTab = "general";
  document.body.classList.add("has-tabs");
  let entete = $("ebAppHeader");
  if (!entete) {
    entete = document.createElement("header");
    entete.id = "ebAppHeader";
    const ecran = $("screen");
    ecran.parentNode.insertBefore(entete, ecran);
  }
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
  document.body.classList.remove("theme-zenna");
  const bar = $("ebTabbar");
  if (bar) bar.remove();
  const entete = $("ebAppHeader");
  if (entete) entete.remove();
}
