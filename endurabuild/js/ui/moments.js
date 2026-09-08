// Chantier partage étape 3 — les « moments clés » de la saison (voir CLAUDE.md « chantier
// partage étape 3 »). Format A, ici : la déclaration du Jour 1 — nom de la course (ou repli
// dérivé du sport + de la date, jamais une table de libellés de format à tenir à jour, leçon
// U9), durée de préparation, 3 cumuls en km par discipline sur le plan ENTIER.
//
// Les cumuls somment `EBV2.weekDistances` semaine par semaine : ce n'est PAS une seconde
// conversion allure/puissance → distance (R11.1) — `weekDistances` lit déjà `stepMeters`/
// `stepDiscipline`, les mêmes fonctions canoniques que `s.distanceM` (préalable du chantier),
// juste agrégées par semaine plutôt que par séance. On somme un résultat déjà canonique.
import { S, ebSave, esc, todayISO } from "../state.js";
import { shareStatCard } from "../export.js";
import { SPORTS } from "../config.js";
import { trapModal } from "./modal.js";
import { raceCountdown } from "./app-header.js";

function cumulPlan(plan, answers) {
  const totals = { sw: 0, bk: 0, rn: 0 };
  const wd = globalThis.EBV2 && globalThis.EBV2.weekDistances;
  if (wd) for (const wk of plan.weeks || []) {
    let dists;
    try { dists = wd(wk, answers); } catch (e) { dists = []; }
    for (const d of dists || []) if (d.km != null && totals[d.d] !== undefined) totals[d.d] += d.km;
  }
  return {
    swim: Math.round(totals.sw * 10) / 10,
    bike: Math.round(totals.bk * 10) / 10,
    run: Math.round(totals.rn * 10) / 10,
  };
}

/** Instantané figé au Jour 1, écrit UNE fois par `ensurePlan()` (tabs.js) — même patron que le
 *  journal de projection (A-5) : jamais relu ni modifié par le moteur, une photo pour comparer
 *  plus tard (Format D, « prévu vs réalisé »). */
export function computePlanBaseline(plan, answers) {
  return {
    generatedAt: todayISO(),
    raceDate: answers.race_date || null,
    raceName: answers.race_name || null,
    weeks: (plan.weeks || []).length,
    raceCumKm: cumulPlan(plan, answers),
  };
}

function fmtDateLong(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  } catch (e) { return iso; }
}

/** Le titre : le nom déclaré par l'athlète, sinon un repli dérivé du sport + du format — le
 *  libellé du format vient de `SPORTS[sport].formats` (la table existante, R11.1 : jamais une
 *  seconde traduction du code « 70.3 »/« S » inventée ici). */
function titreCourse(base, sport, format) {
  if (base.raceName) return base.raceName;
  const sp = SPORTS[sport];
  const fmtLabel = sp && Array.isArray(sp.formats) ? (sp.formats.find((f) => f[0] === format) || [])[1] : null;
  const nom = sp ? sp.ico + " " + sp.nom + (fmtLabel ? " — " + fmtLabel : "") : String(sport || "");
  return nom;
}

function momentAOverlayHTML(base, sport, format) {
  const cum = base.raceCumKm || {};
  return '<div class="eb-modal" role="dialog" aria-label="Déclaration de saison">'
    + '<h2 style="text-align:center;margin:4px 0 2px">🎯 ' + esc(titreCourse(base, sport, format)) + "</h2>"
    + (base.raceDate ? '<div class="load-sub" style="text-align:center">' + esc(fmtDateLong(base.raceDate)) + "</div>" : "")
    + '<div class="load-sub" style="text-align:center;margin-top:2px">' + base.weeks + " semaines de préparation</div>"
    + '<div style="display:flex;justify-content:center;gap:18px;margin-top:16px;flex-wrap:wrap">'
    + '<div style="text-align:center"><div class="load-sub">🏊 Nage</div><b>' + cum.swim + " km</b></div>"
    + '<div style="text-align:center"><div class="load-sub">🚴 Vélo</div><b>' + cum.bike + " km</b></div>"
    + '<div style="text-align:center"><div class="load-sub">🏃 Course</div><b>' + cum.run + " km</b></div>"
    + "</div>"
    + '<div class="load-sub" style="text-align:center;margin-top:12px">C\'est la promesse du plan, pas un bilan — on se retrouve à la fin pour voir le chemin parcouru.</div>'
    + '<div class="nav" style="justify-content:center;margin-top:14px;gap:10px;flex-wrap:wrap">'
    + '<button class="btn gold" id="momentAShare" type="button">📸 Partager ma saison</button>'
    + '<button class="btn" id="momentAClose" type="button">Fermer</button></div></div>';
}

/** Affiche l'overlay UNE fois (`answers.momentA_montre`), jamais relancé — même patron de
 *  dédoublonnage que les autres « moments » du dépôt (`lastWeeklyNotif`, `retestNotifLastWeek`…,
 *  notifications.js). Appelé depuis `renderTabPlanGeneral()`, atteint le jour de création parce
 *  que `jourDeCreation()` y redirige déjà l'atterrissage (tabs.js). */
export function maybeShowMomentA(plan) {
  if (!S.answers.planBaseline || S.answers.momentA_montre) return false;
  S.answers.momentA_montre = true;
  ebSave();
  const base = S.answers.planBaseline;
  const ov = document.createElement("div");
  ov.className = "eb-overlay";
  ov.innerHTML = momentAOverlayHTML(base, S.sport, S.answers.format);
  document.body.appendChild(ov);
  const untrap = trapModal(ov, () => ov.remove());
  const close = () => { untrap(); ov.remove(); };
  ov.querySelector("#momentAClose").onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector("#momentAShare").onclick = async () => {
    const b = ov.querySelector("#momentAShare");
    b.disabled = true; b.textContent = "Génération…";
    try {
      const cum = base.raceCumKm || {};
      await shareStatCard({
        eyebrow: "MA SAISON",
        title: titreCourse(base, S.sport, S.answers.format),
        subtitle: base.raceDate ? fmtDateLong(base.raceDate) + " · " + base.weeks + " semaines" : base.weeks + " semaines",
        rows: [
          { label: "🏊 Nage", value: cum.swim + " km" },
          { label: "🚴 Vélo", value: cum.bike + " km" },
          { label: "🏃 Course", value: cum.run + " km" },
        ],
        footer: "La promesse du plan — rendez-vous à la fin pour le bilan.",
        accent: (SPORTS[S.sport] && SPORTS[S.sport].accent) || "#ff7a1a",
      }, "story", "zenna-saison.png", "Ma saison — Zenna");
    } catch (e) { console.warn(e); }
    b.disabled = false; b.textContent = "📸 Partager ma saison";
  };
  return true;
}

// ── Format B — carte hebdo légère ────────────────────────────────────────────────────────
//
// Contenu volontairement minimal (décision de conception, le document laisse le détail
// ouvert) : un seul chiffre — le total km de la semaine, tous disciplines confondues, ou les
// heures si aucune référence ne permet de convertir en km. ~38 déclenchements possibles sur
// un plan complet contre 4-5 pour les autres moments (contrainte explicite du document) :
// pas de détail par discipline ici, ce serait répliquer le niveau du Format A.

function weekSummary(week, answers) {
  const wd = globalThis.EBV2 && globalThis.EBV2.weekDistances;
  let totalKm = 0, anyKm = false, totalMin = 0;
  if (wd) {
    let dists;
    try { dists = wd(week, answers); } catch (e) { dists = []; }
    for (const d of dists || []) {
      totalMin += d.min || 0;
      if (d.km != null) { totalKm += d.km; anyKm = true; }
    }
  }
  return {
    totalKm: Math.round(totalKm * 10) / 10,
    anyKm,
    totalH: Math.round((totalMin / 60) * 10) / 10,
  };
}

/** La semaine dont AUJOURD'HUI est le premier jour — pas nécessairement la semaine 1 (elle a
 *  presque toujours déjà commencé quand le plan est créé, R8/R9 : « le plan démarre au lundi
 *  de la semaine en cours »). `null` la plupart des jours — c'est voulu, un jour sur sept. */
function weekStartingToday(plan, todayIso) {
  for (const wk of plan.weeks || []) {
    if (wk.days && wk.days[0] && wk.days[0].date === todayIso) return wk;
  }
  return null;
}

function momentBOverlayHTML(wk, resume) {
  const chiffre = resume.anyKm ? resume.totalKm + " km" : resume.totalH + " h";
  return '<div class="eb-modal" role="dialog" aria-label="Résumé de la semaine">'
    + '<h2 style="text-align:center;margin:4px 0 2px">📅 Semaine ' + wk.num + "</h2>"
    + '<div style="text-align:center;margin-top:10px;font-size:1.7em;font-weight:800">' + chiffre + "</div>"
    + '<div class="load-sub" style="text-align:center;margin-top:4px">prévus cette semaine</div>'
    + '<div class="nav" style="justify-content:center;margin-top:14px;gap:10px;flex-wrap:wrap">'
    + '<button class="btn gold" id="momentBShare" type="button">📸 Partager</button>'
    + '<button class="btn" id="momentBCloseBtn" type="button">Fermer</button></div></div>';
}

/** Affiche l'overlay au premier jour de chaque semaine (`answers.momentB_semaine`, une clé par
 *  semaine — jamais la même semaine deux fois). N'agit pas si Format A vient de s'afficher à
 *  l'instant (`dejaMontreA`) : la semaine 1 démarre parfois un lundi, le seul jour où les deux
 *  déclencheurs peuvent coïncider — deux overlays à la suite serait exactement la surcharge
 *  que la légèreté du format B cherche à éviter. */
export function maybeShowMomentB(plan, dejaMontre) {
  if (dejaMontre) return false;
  const wk = weekStartingToday(plan, todayISO());
  if (!wk) return false;
  const key = "sem-" + wk.num;
  if (S.answers.momentB_semaine === key) return false;
  S.answers.momentB_semaine = key;
  ebSave();
  const resume = weekSummary(wk, S.answers);
  const ov = document.createElement("div");
  ov.className = "eb-overlay";
  ov.innerHTML = momentBOverlayHTML(wk, resume);
  document.body.appendChild(ov);
  const untrap = trapModal(ov, () => ov.remove());
  const close = () => { untrap(); ov.remove(); };
  ov.querySelector("#momentBCloseBtn").onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector("#momentBShare").onclick = async () => {
    const b = ov.querySelector("#momentBShare");
    b.disabled = true; b.textContent = "Génération…";
    try {
      const chiffre = resume.anyKm ? resume.totalKm + " km" : resume.totalH + " h";
      await shareStatCard({
        eyebrow: "CETTE SEMAINE",
        title: "Semaine " + wk.num,
        rows: [{ label: "Prévu", value: chiffre }],
        footer: "Zenna — plan raisonné, chaque décision justifiée.",
        accent: (SPORTS[S.sport] && SPORTS[S.sport].accent) || "#ff7a1a",
      }, "story", "zenna-semaine.png", "Ma semaine — Zenna");
    } catch (e) { console.warn(e); }
    b.disabled = false; b.textContent = "📸 Partager";
  };
  return true;
}

// ── Format D — bilan de fin de prépa ─────────────────────────────────────────────────────
//
// Déclenché à J-1 (réutilise `raceCountdown`, R23.5 — même mécanisme que le bandeau « Veille
// de course » de session-life.js, pas un second décompte). Boucle avec le Format A : compare
// les cumuls RÉELS (séances marquées faites, `answers.done`) aux cumuls PRÉVUS gelés dans
// `answers.planBaseline` au Jour 1.

/** Les cumuls réels par discipline, restreints aux séances marquées faites — même mécanisme
 *  que `cumulPlan` (EBV2.weekDistances), sur un conteneur synthétique ne portant QUE les
 *  séances de `answers.done` (le format attendu par `weekDistances` est `{days:[{sessions}]}`,
 *  peu importe qu'elles viennent de plusieurs semaines). Même clé que la coche ✓
 *  (`session-life.js` : `weekNum|jour|indexDeSéance`, tab-plan-general.js). */
function cumulReel(plan, answers) {
  const doneSessions = [];
  for (const wk of plan.weeks || []) {
    for (const day of wk.days || []) {
      (day.sessions || []).forEach((s, si) => {
        if (answers.done && answers.done[wk.num + "|" + day.jour + "|" + si]) doneSessions.push(s);
      });
    }
  }
  const wd = globalThis.EBV2 && globalThis.EBV2.weekDistances;
  const totals = { sw: 0, bk: 0, rn: 0 };
  if (wd) {
    let dists;
    try { dists = wd({ days: [{ sessions: doneSessions }] }, answers); } catch (e) { dists = []; }
    for (const d of dists || []) if (d.km != null && totals[d.d] !== undefined) totals[d.d] += d.km;
  }
  return {
    swim: Math.round(totals.sw * 10) / 10,
    bike: Math.round(totals.bk * 10) / 10,
    run: Math.round(totals.rn * 10) / 10,
  };
}

/** Nombre de retests mesurés PENDANT cette préparation (pas toute la carrière de l'athlète) —
 *  bornés à la fenêtre ouverte par `planBaseline.generatedAt`. */
function retestsPendantPrepa(answers, base) {
  if (!Array.isArray(answers.tests) || !base.generatedAt) return 0;
  return answers.tests.filter((t) => t.date && t.date >= base.generatedAt).length;
}

function momentDOverlayHTML(plan, base, reel, nRetests) {
  const prevu = base.raceCumKm || {};
  const ligne = (icone, lab, r, p) => '<div style="display:flex;justify-content:space-between;gap:14px;padding:6px 0;border-bottom:1px solid var(--zn-border,rgba(255,255,255,.12))">'
    + "<span>" + icone + " " + lab + "</span><span><b>" + r + "</b> km <span class=\"load-sub\">/ " + p + " prévus</span></span></div>";
  return '<div class="eb-modal" role="dialog" aria-label="Bilan de fin de préparation">'
    + '<h2 style="text-align:center;margin:4px 0 2px">🏁 Bilan de ta préparation</h2>'
    + '<div class="load-sub" style="text-align:center">' + plan.weeks.length + " semaines réalisées"
    + (base.weeks && base.weeks !== plan.weeks.length ? " (" + base.weeks + " prévues au départ)" : "") + "</div>"
    + '<div style="margin-top:14px">'
    + ligne("🏊", "Nage", reel.swim, prevu.swim ?? 0)
    + ligne("🚴", "Vélo", reel.bike, prevu.bike ?? 0)
    + ligne("🏃", "Course", reel.run, prevu.run ?? 0)
    + "</div>"
    + (nRetests > 0 ? '<div class="load-sub" style="text-align:center;margin-top:10px">' + nRetests + " test" + (nRetests > 1 ? "s" : "") + " de référence pendant la préparation.</div>" : "")
    + '<div class="load-sub" style="text-align:center;margin-top:10px">Demain, c\'est le jour J. Le travail est fait.</div>'
    + '<div class="nav" style="justify-content:center;margin-top:14px;gap:10px;flex-wrap:wrap">'
    + '<button class="btn gold" id="momentDShare" type="button">📸 Partager mon bilan</button>'
    + '<button class="btn" id="momentDClose" type="button">Fermer</button></div></div>';
}

/** Affiche l'overlay une fois, à J-1 (`answers.momentD_montre`). Sans `planBaseline` (plan créé
 *  avant ce chantier, ou baseline indisponible), on n'a rien à comparer — on ne montre rien
 *  plutôt que d'inventer un « prévu ». */
export function maybeShowMomentD(plan, dejaMontre) {
  if (dejaMontre) return false;
  if (!S.answers.planBaseline || S.answers.momentD_montre) return false;
  const cd = raceCountdown(S.answers, todayISO());
  if (!cd || cd.jours !== 1) return false;
  S.answers.momentD_montre = true;
  ebSave();
  const base = S.answers.planBaseline;
  const reel = cumulReel(plan, S.answers);
  const nRetests = retestsPendantPrepa(S.answers, base);
  const ov = document.createElement("div");
  ov.className = "eb-overlay";
  ov.innerHTML = momentDOverlayHTML(plan, base, reel, nRetests);
  document.body.appendChild(ov);
  const untrap = trapModal(ov, () => ov.remove());
  const close = () => { untrap(); ov.remove(); };
  ov.querySelector("#momentDClose").onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector("#momentDShare").onclick = async () => {
    const b = ov.querySelector("#momentDShare");
    b.disabled = true; b.textContent = "Génération…";
    try {
      const prevu = base.raceCumKm || {};
      await shareStatCard({
        eyebrow: "BILAN DE PRÉPARATION",
        title: plan.weeks.length + " semaines",
        subtitle: nRetests > 0 ? nRetests + " test" + (nRetests > 1 ? "s" : "") + " de référence" : undefined,
        rows: [
          { label: "🏊 Nage", value: reel.swim + " / " + (prevu.swim ?? 0) + " km" },
          { label: "🚴 Vélo", value: reel.bike + " / " + (prevu.bike ?? 0) + " km" },
          { label: "🏃 Course", value: reel.run + " / " + (prevu.run ?? 0) + " km" },
        ],
        footer: "Le travail est fait. Rendez-vous demain.",
        accent: (SPORTS[S.sport] && SPORTS[S.sport].accent) || "#ff7a1a",
      }, "story", "zenna-bilan.png", "Mon bilan de préparation — Zenna");
    } catch (e) { console.warn(e); }
    b.disabled = false; b.textContent = "📸 Partager mon bilan";
  };
  return true;
}
