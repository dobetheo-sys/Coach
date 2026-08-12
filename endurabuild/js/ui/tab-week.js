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
import { $, S, ebSave, fmtDay, todayISO } from "../state.js";
import { weekGridHTML, weekHeaderHTML, currentWeek, handleSwapClick } from "./tab-plan-general.js";
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
  return '<div class="zn-prog-line" style="margin-top:12px"><b>' + faites + "/" + total + " séances</b> validées · "
    + Math.round(minutes / 6) / 10 + " h au programme"
    + (pctFacile ? ' · <span style="color:var(--zn-cyan)">' + pctFacile + " % en facile</span>" : "") + "</div>"
    + '<div class="zn-prog-track"><div class="zn-prog-fill vert" style="width:' + pct + '%"></div></div>';
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
        const fmtMin = (m) => (m >= 60 ? Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0") : m + " min");
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
  html += bilanHTML(plan, w);
  html += navHTML(plan, w);
  html += "</div>";

  $("screen").innerHTML = html;
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
