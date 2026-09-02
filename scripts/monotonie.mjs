/**
 * LE GATE DE MONOTONIE — approche C du diagnostic de la fiche 46, livrée par la fiche 47.
 *
 * CE QU'IL GARDE, et pourquoi il n'existait pas : quatre inversions de monotonie ont été
 * trouvées dans ce dépôt, sur quatre axes différents (I13/niveau · O-21/allure · O-93/phase ·
 * O-77/volume), et **aucune n'a été trouvée par un gate** — chacune l'a été parce que quelqu'un
 * a pensé, un jour, à faire varier cette entrée-là et à regarder la sortie. Le diagnostic de la
 * fiche 46 a mesuré que leurs racines sont DISTINCTES (le correctif positionnel leur est
 * orthogonal) : ce qu'elles partagent n'est pas un mécanisme, c'est une ABSENCE — le moteur n'a
 * aucun invariant global de monotonie. Ce banc est cette absence comblée.
 *
 * DEUX FAMILLES D'AXES, parce qu'elles n'ont pas la même propriété :
 *   `plus`       déclarer PLUS ne doit jamais livrer MOINS   (vol_max, level, history…)
 *   `invariant`  changer la valeur ne doit presque rien changer au VOLUME livré (allure, FTP,
 *                CSS — le contenu change d'unité, pas de taille : c'est la propriété d'O-21b)
 * plus un axe qui n'est pas une entrée mais une POSITION : la phase (une décharge ne pèse jamais
 * plus que la charge voisine — la propriété d'O-93, gardée par T-56).
 *
 * DÉRIVÉ DU SCHÉMA, PAS D'UNE LISTE FIGÉE : les VALEURS de chaque axe viennent d'`ANSWER_SCHEMA`
 * (`domain` pour un enum, `min`/`max` pour un nombre) — ajouter une valeur à un domaine étend le
 * banc sans y toucher. Ce qui ne peut PAS se dériver est le SENS de l'ordre : aucun champ du
 * schéma ne dit « avancé, c'est plus que débutant ». `AXES` ne déclare donc que ça — la clé, sa
 * famille, et l'ordre quand il existe. Une ligne par axe, et c'est la seule chose à écrire pour
 * en ajouter un.
 *
 * MESURÉ PAR POSITION, JAMAIS EN AGRÉGAT (règle 21). C'est la leçon la plus chère de ce
 * chantier : la médiane de la sortie longue d'O-77 est MONOTONE (82 → 93 → 93) pendant que la
 * semaine 1 s'effondre de 82 à 51 min. Un banc qui compare des agrégats aurait déclaré O-77
 * fermée. On compare donc semaine de charge par semaine de charge, à rang égal.
 *
 * DETTE DÉCLARÉE, comme au banc v6 : un critère `attendu: "rouge"` porte son ticket et ne bloque
 * pas ; une RÉGRESSION (un critère vert qui rougit) sort en code 1. Rendre bloquant un banc dont
 * la dette n'est pas triée fige la dette au lieu de la traiter (leçon R20.6).
 *
 *   npm run audit:monotonie
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const { courseDans } = require("../bench-dates.cjs");
const root = pathToFileURL(process.cwd() + "/").href;
const { ANSWER_SCHEMA } = await import(root + "src/engine/answerSchema.ts");
await import(root + "src/app/bridge.ts");
const build = globalThis.EBV2.buildPlan;

// ─────────── Les axes : leur FAMILLE et leur ORDRE (le schéma ne les porte pas) ───────────
/**
 * ⚠ LA PORTÉE APPARTIENT À L'AXE, et l'écrire large est une faute que ce banc a commise avant
 * d'être livré. Première écriture : tous les axes jugés sur la SEMAINE **et** sur la plus grosse
 * séance de chaque discipline. Mesuré, elle rendait 15 « inversions » sur `level` et `history` —
 * or un débutant qui reçoit une sortie facile PLUS LONGUE qu'un confirmé n'est pas une inversion,
 * c'est la restructuration voulue (moins de qualité, plus de foncier). La propriété défendable
 * sur ces axes est le VOLUME de la semaine ; celle qui vaut aussi séance par séance est
 * `vol_max` — déclarer plus de temps disponible ne doit RACCOURCIR aucune séance.
 */
const AXES = [
  { cle: "vol_max",   famille: "plus",       portee: "semaine+seance", valeurs: (s) => bornes(s, [0.10, 0.21, 0.31, 0.47]) },
  { cle: "level",     famille: "plus",       portee: "semaine",        valeurs: (s) => s.domain ?? [] },
  { cle: "history",   famille: "plus",       portee: "semaine",        valeurs: (s) => s.domain ?? [] },
  { cle: "pace",      famille: "invariant",  portee: "semaine",        valeurs: () => ["4:00", "5:30", "7:00"] },
  { cle: "css",       famille: "invariant",  portee: "semaine",        valeurs: () => ["1:35", "2:00", "2:25"] },
];
/**
 * Des valeurs prises DANS les bornes déclarées par le schéma — jamais des chiffres inventés.
 *
 * ⚠ MAIS LA BANDE COMPTE, et ce banc l'a appris sur lui-même : ma première écriture prenait
 * [0,35 · 0,6 · 0,9] des bornes de `vol_max` (1 à 40 h), soit **15, 24 et 36 h/sem** — trois
 * valeurs au-delà de tout ce qu'un plan peut livrer, donc trois plans IDENTIQUES. Le banc
 * rendait « monotone » et **ne voyait pas O-77**, l'inversion qu'il existe pour voir. Un axe ne
 * se balaie pas sur ses bornes déclarées mais sur la bande où il AGIT (angle mort A-2) : les
 * fractions ci-dessous couvrent 5 · 9 · 13 · 19 h, et 9 → 13 est exactement la reproduction du
 * ticket.
 */
const bornes = (spec, fractions) => {
  const lo = spec.min ?? 1, hi = spec.max ?? 40;
  return fractions.map((f) => String(Math.round(lo + (hi - lo) * f)));
};

const BASE = {
  intent: "competition", level: "inter", history: "confirme", dispo: "quotidienne", shift_ok: "non",
  doubles: "oui", off_days: "non", sex: "H", sleep: "moyen", life_load: "normale", injury: "aucune",
  med_pain: "non", med_dizzy: "non", med_treat: "non", weight_lever: "non", age: "32", weight: "75",
  height: "178", sessions_max: "8", vol_max: "12", vol_recent: "9",
  // ⚠ `vol_recent` est tenu FIXE et NON TRIVIAL, et c'est une condition de visibilité, pas un
  // réglage : c'est le plancher de départ O-69 (≈ 0,85 × volume récent) qui fige la cible de la
  // semaine 1 quelle que soit l'enveloppe déclarée. Sans lui, faire varier `vol_max` déplace la
  // cible ET le plafond ensemble, les deux effets se compensent, et l'axe paraît monotone.
  // Mesuré : à `vol_recent: 6` ce banc rendait `tri · vol_max` VERT — sur le profil même où
  // O-77 se reproduit.
  ftp_known: "oui", ftp: "230", pace_known: "oui", pace: "4:41", css_known: "oui", css: "2:00",
};
const PAR_SPORT = {
  run:      { format: "semi",     terrain: "route", race_date: courseDans(24) },
  bike:     { format: "cyclo",    terrain: "plat",  race_date: courseDans(24) },
  swim:     { format: "demifond", milieu: "bassin", race_date: courseDans(24) },
  tri:      { format: "70.3",     terrain: "vallonne", race_date: courseDans(30) },
  duathlon: { format: "M",        terrain: "plat",  race_date: courseDans(24) },
  swimrun:  { format: "sprint",   milieu: "mer",    race_date: courseDans(24), water_temp: "20" },
  trail:    { race_distance_km: "45", race_dplus_m: "2000", trail_tech: "moyenne", terrain: "montagne", race_date: courseDans(24) },
};
/** L'allure n'a de sens que là où la discipline existe ; le CSS de même. */
const AXE_SPORTS = { pace: ["run", "trail", "tri", "duathlon", "swimrun"], css: ["swim", "tri", "swimrun"] };

// ─────────── La sortie observée : PAR POSITION, jamais en agrégat (règle 21) ───────────
function mesures(plan) {
  const out = [];
  for (const w of plan.weeks ?? []) {
    if (w.isRecup || w.phase?.id === "taper") continue;
    const m = { total: 0, sw: 0, bk: 0, rn: 0 };
    for (const d of w.days) for (const s of d.sessions) {
      if (s.d === "rs" || s.race) continue;
      m.total += s.min || 0;
      if (s.d === "br") { for (const st of s.steps || []) {
        const k = st.leg === "bike" ? "bk" : st.leg === "run" ? "rn" : st.leg === "swim" ? "sw" : null;
        if (k) m[k] = Math.max(m[k], (st.reps || 1) * (st.durationMin || 0)); } }
      else if (m[s.d] != null) m[s.d] = Math.max(m[s.d], s.min || 0);   // la PLUS GROSSE séance
    }
    out.push(m);
  }
  return out;
}
/** Un écart se juge dans l'unité de sa CONSÉQUENCE : minutes ET pourcentage (règle 14). */
const franchi = (av, ap) => ap < av - 5 && ap < av * 0.92;

// ─────────── Les critères ───────────
/**
 * LA DETTE DÉCLARÉE — triée AVANT de rendre le banc bloquant (leçon R20.6 : rendre bloquant un
 * banc dont la dette n'est pas triée fige la dette au lieu de la traiter). Chaque entrée porte
 * son ticket ET l'attribution qui l'y range, mesurée par neutralisation à facteur unique de
 * `_capScale` (fiche 47, tâche 2).
 */
const DETTES = {
  // FICHE 52 — `MONO-bike-vol_max` (O-113) est PAYÉE. La dette restante des fiches 49-51 est
  // fermée non pas en retouchant `sessionScale` (fiche 51 : calibration discontinue, payée en
  // fréquence) mais en bornant le RÉCEPTEUR : la sortie longue rend aux séances faciles de sa
  // semaine tout ce qu'elle porte au-delà de sa part. Le registre du gate est vide — toute
  // inversion qui apparaîtra désormais est une régression, pas une dette.
};



const RESULTATS = [];
let comparaisons = 0;
function T(id, attendu, quoi, fn) {
  let r; try { r = fn(); } catch (e) { r = { ok: false, detail: "EXCEPTION " + (e && e.message ? e.message : e) }; }
  RESULTATS.push({ id, attendu, quoi, ok: r.ok, detail: r.detail });
}

for (const sport of Object.keys(PAR_SPORT)) {
  const profil = (over) => ({ ...BASE, ...PAR_SPORT[sport], ...over });
  for (const axe of AXES) {
    const spec = ANSWER_SCHEMA[axe.cle];
    if (!spec) continue;
    if (spec.sports && !spec.sports.includes(sport)) continue;
    if (AXE_SPORTS[axe.cle] && !AXE_SPORTS[axe.cle].includes(sport)) continue;
    const valeurs = axe.valeurs(spec);
    if (valeurs.length < 2) continue;
    const ticket = { vol_max: "O-77", level: "I13", history: null, pace: "O-21", css: "O-21" }[axe.cle];
    const attendu = DETTES[`MONO-${sport}-${axe.cle}`] ? "rouge" : "vert";
    T(`MONO-${sport}-${axe.cle}`, attendu,
      `${sport} · ${axe.cle} (${axe.famille})${ticket ? " — " + ticket : ""}`, () => {
      const plans = [];
      for (const v of valeurs) {
        let p; try { p = build(sport, profil({ [axe.cle]: v })); } catch { p = null; }
        if (p) plans.push({ v, m: mesures(p) });
      }
      if (plans.length < 2) return { ok: false, detail: "moins de deux plans générés — le critère ne mesure rien" };
      const bad = [];
      for (let i = 1; i < plans.length; i++) {
        const A = plans[i - 1], B = plans[i];
        const n = Math.min(A.m.length, B.m.length);
        if (!n) return { ok: false, detail: "aucune semaine de charge comparable" };
        const champs = axe.portee === "semaine" ? ["total"] : ["total", "sw", "bk", "rn"];
        for (let k = 0; k < n; k++) for (const champ of champs) {
          const av = A.m[k][champ], ap = B.m[k][champ];
          if (av <= 0 && ap <= 0) continue;
          comparaisons++;
          if (axe.famille === "plus") {
            if (franchi(av, ap)) bad.push(`S${k + 1} ${champ} ${A.v}→${B.v} : ${Math.round(av)}→${Math.round(ap)} min`);
          } else if (franchi(av, ap) || franchi(ap, av)) {
            bad.push(`S${k + 1} ${champ} ${A.v}→${B.v} : ${Math.round(av)}→${Math.round(ap)} min`);
          }
        }
      }
      return { ok: bad.length === 0, detail: bad.length ? `${bad.length} inversion(s) · ${bad.slice(0, 3).join(" ; ")}` : "monotone à toutes les positions" };
    });
  }
  // AXE DE POSITION — la phase : une décharge ne pèse jamais plus que la charge voisine (O-93).
  //
  // ⚠ CE CRITÈRE A ÉTÉ RÉÉCRIT PARCE QU'IL ÉTAIT VACUEUX, et c'est la contre-preuve qui l'a dit :
  // sa première écriture comparait le TOTAL de la semaine, et retirer la garde T-56 la laissait
  // VERTE. O-93 ne porte pas sur le total — il porte sur le TYPE (« VO2 6×4 en récup contre 5×4
  // en charge ») et sur la DISCIPLINE. Le total, lui, est déjà tenu par une autre règle
  // (`recupHeavier`, auditeur) : mon critère mesurait une propriété que quelqu'un d'autre garde.
  T(`MONO-${sport}-phase`, DETTES[`MONO-${sport}-phase`] ? "rouge" : "vert", `${sport} · phase (position) — O-93`, () => {
    let p; try { p = build(sport, profil({})); } catch { return { ok: false, detail: "plan non généré" }; }
    const bad = []; const ws = p.weeks ?? [];
    const parDisc = (w) => { const m = {}; for (const d of w.days) for (const s of d.sessions) {
      if (s.d === "rs" || s.race) continue; m[s.d] = (m[s.d] || 0) + (s.min || 0); } return m; };
    // ⚠ LA GRANDEUR EST CELLE DE LA GARDE, pas la mienne. Première écriture : `s.min`, le total
    // de la séance — échauffement et retour au calme compris. T-56, qui DÉTIENT cette propriété,
    // compare la DOSE DU CORPS. Deux grandeurs pour une propriété, c'est R11.1 commis dans le
    // banc qui surveille R11.1 : le gate signalait « récup 38 > charge 32 » sur des séances dont
    // le corps était plus petit en récup — l'écart venait de l'échauffement.
    const doseDe = (s) => (s.steps || []).filter((st) => st.role === "body")
      .reduce((t, st) => t + (st.reps || 1) * (st.durationMin || 0), 0);
    const parType = (w) => { const m = {}; for (const d of w.days) for (const s of d.sessions) {
      if (s.d === "rs" || s.race) continue; m[s.name] = Math.max(m[s.name] || 0, doseDe(s)); } return m; };
    for (let i = 1; i < ws.length; i++) {
      if (!ws[i].isRecup || ws[i - 1].isRecup || ws[i - 1].phase?.id === "taper") continue;
      const dR = parDisc(ws[i]), dC = parDisc(ws[i - 1]);
      for (const k of Object.keys(dR)) {
        if (dC[k] == null) continue; comparaisons++;
        if (dR[k] > dC[k] + 5 && dR[k] > dC[k] * 1.08)
          bad.push(`S${ws[i].num} récup ${k} ${Math.round(dR[k])} > S${ws[i - 1].num} charge ${Math.round(dC[k])} min`);
      }
      const tR = parType(ws[i]), tC = parType(ws[i - 1]);
      for (const k of Object.keys(tR)) {
        if (tC[k] == null) continue; comparaisons++;
        if (tR[k] > tC[k] + 5 && tR[k] > tC[k] * 1.08)
          bad.push(`S${ws[i].num} récup « ${k} » ${Math.round(tR[k])} > charge ${Math.round(tC[k])} min`);
      }
    }
    return { ok: bad.length === 0, detail: bad.length ? `${bad.length} inversion(s) · ${bad.slice(0, 3).join(" ; ")}` : "aucune discipline ni aucun type au-dessus de sa charge voisine" };
  });
}

// ─────────── Rapport ───────────
console.log("\nEnduraBuild — gate de MONOTONIE (fiche 47)\n");
let verts = 0, dettes = 0, regressions = 0;
for (const r of RESULTATS) {
  const dette = r.attendu === "rouge";
  const marque = r.ok ? "✔" : (dette ? "·" : "✖");
  if (r.ok && !dette) verts++;
  else if (!r.ok && dette) dettes++;
  else if (!r.ok) { regressions++; }
  else if (r.ok && dette) { regressions++; }   // une dette qui passe : à re-épingler, jamais à ignorer
  console.log(`  ${marque} ${r.id.padEnd(24)} ${r.quoi}`);
  if (!r.ok || dette) console.log(`      ${r.detail}${r.ok && dette ? "  ← LA DETTE EST PAYÉE : repasser attendu à \"vert\"" : ""}`);
}
// UN ZÉRO A BESOIN DE SA POPULATION : sans ce compte, un banc qui ne compare RIEN serait vert.
console.log(`\n  ${verts} vert(s) · ${dettes} dette(s) déclarée(s) · ${regressions} régression(s)`);
console.log(`  population : ${comparaisons} comparaisons de position sur ${RESULTATS.length} critères`);
if (comparaisons < 500) { console.error("\n✖ population insuffisante — le verdict n'a pas de base"); process.exit(1); }
if (regressions) { console.error("\n✖ RÉGRESSION de monotonie : un axe qui tenait ne tient plus (ou une dette est payée sans être ré-épinglée)."); process.exit(1); }
console.log("\n✓ aucune régression de monotonie.");
