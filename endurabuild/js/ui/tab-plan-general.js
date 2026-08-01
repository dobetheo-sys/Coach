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
// La prédiction de course N'EST PAS ici (brief onglets) — elle vit dans 🎯 Aujourd'hui.
import { SPORTS } from "../config.js";
import { $, S, ebSave, fmtDay, todayISO } from "../state.js";
import { curSteps, renderStep, reset } from "./steps.js";
import { driverBand, downloadPlan, decisionsCardHTML, whyPlanCardHTML, sessDetailsHTML } from "./plan-view.js";
import { exportICS, exportJSON, exportPNG } from "../export.js";
import { momentHTML, painBannerHTML, bindPainBanner, toggleDone } from "./session-life.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { ensurePlan, invalidatePlan } from "./tabs.js";

const ic = { sw: "\u{1F3CA}", bk: "\u{1F6B4}", rn: "\u{1F3C3}", br: "\u{1F501}", rs: "\u{1F4AA}" };

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
export function weekGridHTML(plan, w, today) {
  let h = '<div class="gw-grid">';
  w.days.forEach((d) => {
    const bg = d.sessions.map((s) => "<span>" + ic[s.d] + "</span>").join("");
    const nm = d.sessions.map((s, si) => {
      const k = w.num + "|" + d.jour + "|" + si;
      const dn = S.answers.done && S.answers.done[k];
      // R4.2 — le REPOS se valide aussi (« récupération respectée ✓ », 1 tap) : un jour
      // de repos validé compte STRICTEMENT autant qu'un jour de séance dans la streak.
      const title = s.d === "rs" ? "Récupération respectée" : "Marquer fait";
      const chk = '<button class="doneBtn' + (dn ? " done" : "") + '" type="button" data-dk="' + k + '" data-rest="' + (s.d === "rs" ? 1 : 0) + '" title="' + title + '" aria-label="' + title + " : " + s.name.replace(/"/g, "") + '">' + (dn ? "✓" : "○") + "</button> ";
      // R5 — séance cliquable partout (détail replié + affordance visuelle via CSS .gd-sess)
      return chk + sessDetailsHTML(s);
    }).join("");
    // R7 — chaque jour du plan est annoté de sa VRAIE date calendrier (retour utilisateur)
    const mark = "<i>" + (d.date === today ? "auj. · " : "") + fmtDay(d.date) + (plan.use10 ? " · C" + d.cyc + "J" + d.jc : "") + "</i>";
    // §8 — déplacement de séance : ⇄ sur chaque jour, deux taps = échange persistant.
    const pend = S._swapPending && S._swapPending.w === w.num && S._swapPending.jour === d.jour;
    const swapBtn = '<button class="swapBtn" type="button" data-swap="' + w.num + "|" + d.jour + '" title="Échanger ce jour avec un autre" aria-label="Échanger ' + d.jour + ' avec un autre jour" style="border:none;background:' + (pend ? "#2e6bff" : "transparent") + ";color:" + (pend ? "#fff" : "#b3ab9b") + ';border-radius:5px;font-size:var(--fs-sm);cursor:pointer;padding:0 4px">⇄</button>';
    h += '<div class="gd ' + d.charge + (d.date === today ? " today" : "") + (pend ? " swap-pend" : "") + '"' + (pend ? ' style="outline:2px dashed #2e6bff"' : "") + '><div class="gd-top"><b>' + d.jour + "</b>" + mark + swapBtn + '</div><div class="gd-badges">' + bg + '</div><div class="gd-n">' + nm + "</div></div>";
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
    // LE PROGRAMME : chaque semaine de la phase, jour par jour, coches comprises
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
    if (st.validated) h += '<div style="margin-top:8px;font-size:var(--fs-md);font-weight:700;color:#00734f">✅ Phase validée — tout est fait. La suivante s’appuie sur ce travail.</div>';
    h += "</details>";
  });
  h += "</div>";
  return h;
}

export function renderTabPlanGeneral(plan) {
  const a = S.answers;
  const today = todayISO();
  let html = momentHTML(plan, today) + painBannerHTML() + retestBannerHTML(today);
  html += '<div class="card"><div class="eyebrow">Plan général — ' + SPORTS[S.sport].nom + "</div><h2>Ta saison en un coup d’œil</h2>"
    + '<div class="why">' + plan.totalWeeks + " semaines en " + (plan.use10 ? "cycles de 10 jours (qui glissent)" : "semaines de 7 jours") + ", volume " + plan.volBase + "h → " + plan.volPeak + "h.</div>";
  html += driverBand(a);
  // §5 (R6) — « Pourquoi ce plan » EN TÊTE, dépliée : l'explicabilité est le
  // contre-positionnement du produit, pas une option de confort. Le détail complet des
  // décisions reste en bas de l'onglet (`decisionsCardHTML`), à un lien d'ici.
  html += whyPlanCardHTML(plan);
  // R16.5 — RACCOURCI VERS LA SEMAINE EN COURS. Sur un plan de 59 semaines, l'atteindre
  // depuis le haut de l'onglet demande de passer devant les badges, le « pourquoi », la frise
  // et le graphique. Le repère est la vraie date du jour (`todayISO`, la même ancre que partout
  // depuis R7) : le bouton n'apparaît que si cette semaine existe dans ce qui est affiché.
  {
    const cur = plan.weeks.find((w) => w.days.some((d) => d.date === today));
    if (cur) html += '<div style="margin:6px 0 2px"><button class="btn" id="goCurWk" type="button" '
      + 'data-wk="' + cur.num + '">↓ Aller à la semaine en cours (S' + cur.num + ")</button></div>";
  }
  // R16.9-a — la frise s'ouvre APRÈS le bouton. Émis à l'intérieur de `.ph-line` (flex), il
  // en devenait un item et raflait la place : les cinq segments se tassaient à droite et
  // s'abrégeaient tous, y compris sur grand écran. Défaut introduit par R16.5, visible sur
  // la capture de contrôle de R16.8 — deux corrections successives d'un même symptôme (les
  // libellés tronqués) dont aucune ne regardait la vraie cause : la largeur disponible.
  html += '<div class="ph-line">';
  // R16.4 — LES PASTILLES DE PHASE TRONQUAIENT SUR MOBILE (« SPÉCIFIQ… », « P… » à 390 px).
  // La frise est PROPORTIONNELLE à la longueur des phases (`flex: p.weeks`), ce qui est une
  // information en soi : on la garde, et c'est le LIBELLÉ qui s'abrège. Les deux versions sont
  // émises, le CSS bascule ; `title` + `aria-label` portent toujours le nom complet, donc rien
  // n'est perdu ni pour la souris ni pour un lecteur d'écran.
  const ABBR = { "Développement": "DÉV.", "Spécifique": "SPÉ.", "Affûtage": "AFF.", "Peak": "PIC", "Base": "BASE" };
  plan.phases.forEach((p) => { html += '<button type="button" class="ph-seg" data-phseg="' + p.nom + '" title="' + p.nom + '" aria-label="' + p.nom + ", " + p.weeks + ' semaines" style="flex:' + p.weeks + ";background:" + p.c + "22;border-color:" + p.c + ';cursor:pointer;font:inherit"><span class="ph-full">' + p.nom + '</span><span class="ph-abbr">' + (ABBR[p.nom] || p.nom) + "</span><em>" + p.weeks + "sem</em></button>"; });
  html += "</div>";
  html += phaseObjectivesHTML(plan);
  html += '<div class="vol-bars">';
  plan.weeks.forEach((w) => { const h = Math.max(8, Math.round((w.vol / plan.volPeak) * 52)); html += '<div class="vb" style="height:' + h + "px;background:" + (w.isRecup ? "#9b72ff" : w.phase.c) + '" title="S' + w.num + " " + w.vol + 'h"></div>'; });
  html += '</div><div class="vol-cap">1 barre = 1 semaine · violet = récup</div>';
  const show = S.showAllWeeks ? plan.weeks : [...plan.weeks.slice(0, 3), plan.weeks[plan.weeks.length - 1]];
  show.forEach((w, ix) => {
    if (!S.showAllWeeks && ix === 3) html += '<div class="wk-skip">⋯ semaines 4 à ' + (plan.totalWeeks - 1) + " ⋯</div>";
    html += '<div class="gw" id="gw' + w.num + '">' + weekHeaderHTML(w) + weekGridHTML(plan, w, today) + "</div>";
  });
  html += decisionsCardHTML(plan); // « Les décisions du moteur » — la transparence, en langage neutre
  html += '<div class="warn" style="background:var(--bg2)">Intensités calibrées sur tes données. Les exports fonctionnent depuis cet onglet, quel que soit l’onglet consulté ensuite.</div>'
    + '<div class="nav" style="flex-wrap:wrap;gap:10px"><button class="btn" id="backBp" type="button">← Modifier</button><button class="btn gold" id="allW" type="button">' + (S.showAllWeeks ? "Réduire" : "Voir les " + plan.totalWeeks + " semaines") + '</button><button class="btn" id="prn" type="button">🖨 HTML</button><button class="btn" id="expIcs" type="button">📅 Agenda (.ics)</button><button class="btn" id="expJson" type="button">{ } JSON</button><button class="btn" id="expPng" type="button">🖼 PNG</button><button class="btn" id="restartBtn" type="button">Changer de sport</button></div></div>';
  $("screen").innerHTML = html;
  const rerender = () => renderTabPlanGeneral(plan);
  bindPainBanner(plan, rerender);
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
    dt.addEventListener("toggle", () => { if (dt.open) S._phOpen = dt.dataset.ph; else if (S._phOpen === dt.dataset.ph) S._phOpen = null; });
  });
  $("backBp").onclick = () => { S.step = curSteps().length - 1; renderStep(); };
  $("allW").onclick = () => { S.showAllWeeks = !S.showAllWeeks; renderTabPlanGeneral(plan); window.scrollTo(0, 0); }; // re-rend la VUE — pas de buildPlan
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
