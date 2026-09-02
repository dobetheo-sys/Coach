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
  // FICHE 55 (tâche 0) — `vol_max`, `pace` et `css` portent désormais `niveaux` : un axe qui
  // n'agit QUE sous une condition dérivée (ici `beginner`, via `swimCapDebutantM`) est invisible
  // tant qu'on ne le balaie qu'au niveau par défaut du banc (`inter`). C'est exactement ce qui a
  // laissé la discontinuité CSS≈2:06 et l'inversion vol_max invisibles (fiche 54, A.4c) : le
  // mécanisme concerné n'existe qu'en débutant, le banc ne testait que `inter`.
  { cle: "vol_max",   famille: "plus",       portee: "semaine+seance", valeurs: (s) => bornes(s, [0.10, 0.21, 0.31, 0.47]), niveaux: ["inter", "debutant"] },
  { cle: "level",     famille: "plus",       portee: "semaine",        valeurs: (s) => s.domain ?? [] },
  { cle: "history",   famille: "plus",       portee: "semaine",        valeurs: (s) => s.domain ?? [] },
  { cle: "pace",      famille: "invariant",  portee: "semaine",        valeurs: () => ["4:00", "5:30", "7:00"], niveaux: ["inter", "debutant"] },
  { cle: "css",       famille: "invariant",  portee: "semaine",        valeurs: () => ["1:35", "2:00", "2:25"], niveaux: ["inter", "debutant"] },
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
  // semaine tout ce qu'elle porte au-delà de sa part.
  //
  // FICHE 55 (tâche 0) — les axes `css`/`pace` étaient MORTS depuis la fiche 47 (aucune entrée
  // dans `ANSWER_SCHEMA`, sautés en silence) et le croisement `level: debutant` n'existait pas.
  // Les réparer fait apparaître d'un coup 9 critères rouges qui n'ont jamais pu être vus — ce
  // n'est PAS une régression du moteur, c'est un instrument qui se met enfin à mesurer. Chacun
  // est attribué à son ticket, aucun n'est inventé pour l'occasion :
  "MONO-swim-css-debutant": "O-83/O-21 — la fiche 55 (tâche 2) a fermé le SAUT instantané à CSS≈2:06 (`swimSessionCapCoherenceAtWeek`, une progression au taux C22 plutôt qu'un jump) mais le profil de CE critère (CSS 2:00, hérité de BASE) ne franchit JAMAIS le seuil de déclenchement (19,0 min < 20 min de plancher) — la garde qui protège les nageurs rapides (D5, banc v6 externe) l'exclut EXPLICITEMENT. Ce qui reste est le résidu O-21 (mètres→minutes), inchangé.",
  "MONO-swim-vol_max-debutant": "O-83/O-77 — même situation : le profil de ce critère (CSS 2:00) ne franchit jamais le seuil qui active la progression de la tâche 2 (la garde D5 l'exige). Mesuré sur le corpus réel : 0 des 78 profils d'O-83 ne franchissent ce seuil non plus (tous déclarent un CSS ≤ 2:00) — la tâche 2 ferme le MÉCANISME, mais ne change AUCUN plan livré du corpus actuel. Résidu O-77 mineur (1 inversion sur 3230 comparaisons), inchangé.",
  "MONO-swim-css-inter": "O-21 — la nage est prescrite en MÈTRES (C15/C24b/CAP_SWIM), donc un nageur plus lent met mécaniquement plus de MINUTES pour le même volume déclaré : la famille exacte que la fiche 21 documente sur l'allure course à pied, jamais mesurée sur la natation faute d'axe vivant. Résidu connu, hors périmètre de la fiche 55 (qui ne touche pas la conversion mètres↔minutes).",
  "MONO-run-pace-debutant": "O-21 — résidu déjà connu (« ramené à +5,0 % », registre), mesuré ici pour la première fois au croisement débutant. Hors périmètre de la fiche 55.",
  "MONO-trail-pace-debutant": "O-21 — même résidu, mesuré pour la première fois sur trail/débutant. Hors périmètre de la fiche 55.",
  "MONO-trail-vol_max-debutant": "O-77 — résidu non balayé jusqu'ici sur le croisement trail/débutant (1 inversion sur 3230 comparaisons, S12 course 180→156 min). Hors périmètre de la fiche 55 : le lot O-77/capScaleAtWeek ne portait pas sur cette combinaison.",
  "MONO-swimrun-pace-inter": "O-21 — même résidu, jamais mesuré sur swimrun faute d'axe vivant. Hors périmètre de la fiche 55.",
  "MONO-swimrun-pace-debutant": "O-21 — idem, au croisement débutant.",
  "MONO-swimrun-css-debutant": "O-21 — même mécanisme mètres↔minutes que MONO-swim-css-inter, sur le leg nage du swimrun. Hors périmètre de la fiche 55.",
};



const RESULTATS = [];
let comparaisons = 0;
function T(id, attendu, quoi, fn) {
  let r; try { r = fn(); } catch (e) { r = { ok: false, detail: "EXCEPTION " + (e && e.message ? e.message : e) }; }
  RESULTATS.push({ id, attendu, quoi, ok: r.ok, detail: r.detail });
}

// FICHE 55 (tâche 0) — UN AXE DÉCLARÉ QUI NE PEUT PAS SE RÉSOUDRE ÉCHOUE BRUYAMMENT, IL NE SE
// SAUTE PLUS EN SILENCE. C'est exactement le défaut trouvé en fiche 54 (A.4b) : `pace` et `css`
// n'ont pas d'entrée dans `ANSWER_SCHEMA` (ce sont des valeurs LIBRES, saisies quand
// `pace_known`/`css_known` valent « oui », jamais un champ à `min`/`max`/`domain`) — la ligne
// `if (!spec) continue;` les a donc sautés pour LES DEUX sports où ils existent, depuis la
// création de ce gate (fiche 47), sans qu'aucun compteur ne le signale : « 28 verts / 1628
// comparaisons » ne dit jamais QUELS axes ont contribué. Un axe sans entrée de schéma déclare
// donc désormais sa résolution ICI, dans `AXE_SPORTS` — la seule liste de portée qui existe pour
// ces deux axes — et l'absence des DEUX (ANSWER_SCHEMA ET AXE_SPORTS) est un ARRÊT, pas un skip.
for (const axe of AXES) {
  if (!ANSWER_SCHEMA[axe.cle] && !AXE_SPORTS[axe.cle]) {
    console.error(`✖✖ AXE ${axe.cle} SANS RÉSOLUTION : ni ANSWER_SCHEMA["${axe.cle}"] ni AXE_SPORTS["${axe.cle}"] ne le portent — cet axe serait sauté en SILENCE sur tous les sports (la faute exacte qui a rendu pace/css invisibles depuis la fiche 47). Corrige l'un des deux avant de relancer.`);
    process.exitCode = 1;
  }
}

for (const sport of Object.keys(PAR_SPORT)) {
  const profil = (over) => ({ ...BASE, ...PAR_SPORT[sport], ...over });
  for (const axe of AXES) {
    const spec = ANSWER_SCHEMA[axe.cle] ?? (AXE_SPORTS[axe.cle] ? { sports: AXE_SPORTS[axe.cle] } : null);
    if (!spec) continue; // déjà signalé bruyamment ci-dessus, avec exitCode
    if (spec.sports && !spec.sports.includes(sport)) continue;
    const valeurs = axe.valeurs(spec);
    if (valeurs.length < 2) continue;
    const ticket = { vol_max: "O-77", level: "I13", history: null, pace: "O-21", css: "O-21" }[axe.cle];
    // FICHE 55 — le CROISEMENT DE NIVEAU (fiche 54, A.4c) : un axe qui n'agit que sous une
    // condition dérivée (`beginner`, via `swimCapDebutantM`) est invisible tant qu'on ne le
    // balaie qu'au niveau par défaut (`inter`). `niveaux` fait tourner le MÊME critère à chaque
    // niveau demandé, sous un identifiant distinct — jamais en silence sous le même id.
    for (const niveau of axe.niveaux ?? [null]) {
      const suffixe = niveau ? `-${niveau}` : "";
      const id = `MONO-${sport}-${axe.cle}${suffixe}`;
      const attendu = DETTES[id] ? "rouge" : "vert";
      T(id, attendu,
        `${sport} · ${axe.cle}${niveau ? ` (niveau ${niveau})` : ""} (${axe.famille})${ticket ? " — " + ticket : ""}`, () => {
        const plans = [];
        for (const v of valeurs) {
          let p; try { p = build(sport, profil({ [axe.cle]: v, ...(niveau ? { level: niveau } : {}) })); } catch { p = null; }
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
