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
  if (!S.answers.planBaseline || S.answers.momentA_montre) return;
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
}
