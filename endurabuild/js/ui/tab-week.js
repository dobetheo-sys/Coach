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
import { weekListHTML, weekHeaderHTML, currentWeek, handleSwapClick } from "./tab-plan-general.js";
import { momentHTML, painBannerHTML, bindPainBanner, toggleDone } from "./session-life.js";
import { readinessDoneToday } from "./readiness.js";
import { pointLabelInline } from "./checkin.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { ensurePlan, setTab } from "./tabs.js";
import { DISC } from "./icons.js";

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
    + '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;height:8px;overflow:hidden;margin-top:5px">'
    + '<div style="height:100%;width:' + pct + '%;background:' + (w.phase.c || "var(--z2)") + '"></div></div></div>';
}

/**
 * R25.5 — ANNEAUX DE COMPLÉTION PAR DISCIPLINE (maquette #tab-week, .disc-rings).
 *
 * « Combien de nages ai-je faites cette semaine, sur combien de prévues » — la grille le
 * contient, mais il fallait la lire jour par jour. Compté sur le PLAN et sur `answers.done`
 * (la même source que `bilanHTML` juste en dessous, pas une seconde comptabilité), jamais
 * sur le DOM : la vue n'est pas la source de vérité.
 *
 * Honnêteté des chiffres (§10 de l'audit) : une discipline ABSENTE de la semaine ne reçoit
 * pas d'anneau à 0/0 — on n'affiche pas une jauge vide pour faire joli. Le repos n'en a pas
 * non plus : il se valide (R4.2) mais ce n'est pas une discipline à doser.
 */
function discRingsHTML(w) {
  const ORDRE = ["sw", "bk", "rn", "br"];
  const compte = {};
  w.days.forEach((d) => d.sessions.forEach((s, si) => {
    if (!ORDRE.includes(s.d)) return;
    const c = compte[s.d] || (compte[s.d] = { done: 0, tot: 0 });
    c.tot++;
    if (S.answers.done && S.answers.done[w.num + "|" + d.jour + "|" + si]) c.done++;
  }));
  const discs = ORDRE.filter((k) => compte[k]);
  if (!discs.length) return "";
  const C = 2 * Math.PI * 11;
  return '<div class="disc-rings">' + discs.map((k, i) => {
    const c = compte[k], col = DISC[k].ac;
    const off = (C * (1 - c.done / c.tot)).toFixed(1);
    // L'anneau part VIDE et se remplit au rendu (transition CSS, neutralisée en
    // prefers-reduced-motion) — même mécanique que l'anneau « forme du jour » (R25.3).
    return '<div class="dring"><svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">'
      + '<circle class="dr-ring-bg" cx="15" cy="15" r="11" stroke-width="4" fill="none"/>'
      + '<circle class="dr-ring-fg" cx="15" cy="15" r="11" stroke="' + col + '" stroke-width="4" fill="none" stroke-linecap="round"'
      + ' stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '" data-off="' + off + '" style="transition-delay:' + (i * 90) + 'ms"/></svg>'
      + '<div class="dr-txt"><div class="dr-n" style="color:' + col + '">' + c.done + "/" + c.tot + '</div><div class="dr-l">' + DISC[k].label + "</div></div></div>";
  }).join("") + "</div>";
}
/** Déclenche le remplissage des anneaux (double rAF : sans ça la transition ne part pas). */
function bindDiscRings() {
  const arcs = document.querySelectorAll("#screen .dr-ring-fg[data-off]");
  if (!arcs.length) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    arcs.forEach((a) => { a.style.strokeDashoffset = a.dataset.off; });
  }));
}

function navHTML(plan, w) {
  const i = plan.weeks.indexOf(w);
  const prev = plan.weeks[i - 1], next = plan.weeks[i + 1];
  const cur = currentWeek(plan);
  return '<div class="nav" style="gap:8px;margin-top:12px;flex-wrap:wrap">'
    // R25.8 — mesuré en semaine 1 : le bouton précédent affichait « ← Semaine — », un libellé
    // qui nomme une semaine qui n'existe pas. Désactivé, il n'a pas à porter de numéro.
    // Et « ⌖ cette semaine » n'apparaissait QUE hors de la semaine courante : la spec le veut
    // toujours présent, désactivé quand on y est déjà — trois positions stables valent mieux
    // qu'une rangée dont le milieu apparaît et disparaît selon où l'on se trouve.
    + '<button class="btn" type="button" id="wkPrev"' + (prev ? "" : " disabled") + ">← " + (prev ? "S" + prev.num : "début") + "</button>"
    + '<button class="btn gold" type="button" id="wkNow"' + (w.num === cur.num ? " disabled" : "") + ">⌖ cette semaine</button>"
    + '<button class="btn" type="button" id="wkNext"' + (next ? "" : " disabled") + ">" + (next ? "S" + next.num : "fin") + " →</button></div>";
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

  // `card-flush` : marge intérieure réduite pour cette carte-ci — la liste par jour a besoin
  // de la largeur, et 30 px de chaque côté sur un écran de 390 en mangent 15 % (mesuré).
  // R25.8 — l'en-tête porte le NUMÉRO et la fente de droite (spec Semaine : « 📅 TA SEMAINE ·
  // S[N] » + plage de dates et phase à droite). Ces trois informations existaient déjà, mais
  // à l'intérieur de la grille : la carte s'annonçait « Ta semaine » sans dire LAQUELLE, ce
  // qui compte dès qu'on navigue avec ← / → entre 21 semaines.
  html += '<div class="card card-flush"><div class="eyebrow">📅 Ta semaine · S' + w.num
    + '<span class="eb-r">' + esc(w.phase.nom) + "</span></div>";
  html += discRingsHTML(w); // R25.5 — fait/prévu par discipline, en tête (maquette #tab-week)
  // R24.8 (retour fondateur, 06/08) — « un résumé de chaque distance en km par discipline en
  // haut de la page ». Le calcul vit dans le MOTEUR (EBV2.weekDistances) : mètres prescrits
  // comptés exacts, minutes converties par les références MESURÉES — sans référence, pas de
  // km inventé, le temps seul s'affiche. Le « ~ » signale une conversion.
  if (globalThis.EBV2 && globalThis.EBV2.weekDistances) {
    try {
      // Distance : seules rn/bk/sw en portent une (br/rs n'ont pas d'unité de distance) —
      // allow-list distincte du pictogramme, lui repris de DISC (R11.1).
      const DISTANCE_DISC = ["rn", "bk", "sw"];
      const dists = globalThis.EBV2.weekDistances(w, S.answers).filter((x) => DISTANCE_DISC.includes(x.d) && (x.min > 0 || x.km));
      if (dists.length) {
        const fmtKm = (x) => (x.approx ? "~" : "") + String(x.km).replace(".", ",") + " km";
        const fmtMin = (m) => (m >= 60 ? Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0") : m + " min");
        // R25.5 — passe en `.dist-line` (maquette) : mono, couleur de discipline sur la
        // valeur, temps en atténué. Mêmes CHIFFRES, même source moteur — c'est la forme qui
        // change, pas la mesure.
        html += '<div class="dist-line">'
          + dists.map((x) => '<span><b style="color:' + DISC[x.d].ac + '">' + DISC[x.d].ic + " " + (x.km != null ? fmtKm(x) : fmtMin(x.min)) + "</b>"
            + (x.km != null && x.min > 0 ? ' <span class="sub">· ' + fmtMin(x.min) + "</span>" : "") + "</span>").join("")
          + "</div>";
      }
    } catch (e) {}
  }
  // R25.5 — liste compacte par jour au lieu de la grille en cartes teintées (voir
  // `weekListHTML` pour l'arbitrage sur le détail replié, et pourquoi les deux mises en page
  // partagent les mêmes émetteurs de coche et de ⇄).
  html += '<div class="gw">' + weekHeaderHTML(w) + weekListHTML(plan, w, today) + "</div>";
  if (S._swapPending && S._swapPending.w === w.num)
    html += '<div class="load-sub" style="margin-top:6px">⇄ <b>' + S._swapPending.jour + "</b> sélectionné — touche le jour avec lequel l’échanger (ou re-touche ⇄ pour annuler).</div>";
  else
    html += '<div class="load-sub" style="margin-top:6px">⇄ pour échanger deux jours · ○ pour valider une séance · touche une séance pour son détail.</div>';
  html += bilanHTML(plan, w);
  html += navHTML(plan, w);
  html += "</div>";

  $("screen").innerHTML = html;
  bindDiscRings();
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
