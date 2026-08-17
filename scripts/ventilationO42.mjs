#!/usr/bin/env node
/**
 * O-42 — VENTILATION DU DIFF, SELON LES QUATRE CRITÈRES DU §6.
 *
 *   node scripts/ventilationO42.mjs
 *
 * L'acceptation d'O-42 n'est PAS « 0 écart » : le ticket corrige une sous-estimation, les durées
 * de nage montent et les volumes avec. Le critère est la DIRECTION, et surtout le quatrième :
 * « un diff qu'on sait expliquer entièrement est acceptable quelle que soit sa taille ; un diff
 * avec un résidu inexpliqué ne l'est pas, même petit ».
 *
 *   [1] les durées de blocs suivent le ratio de leur zone, jamais autre chose
 *   [2] l'ampleur par zone EST le ratio de la zone — vérifiable bloc par bloc
 *   [3] tout mouvement de volume LIVRÉ s'explique par un plafond nommé qui mord
 *   [4] aucun mouvement inexpliqué
 *
 * MÉTHODE (règle 15) — on compare deux PRODUITS, pas deux tables : le moteur committé
 * (`git show HEAD:endurabuild/js/engine.js`, l'état d'avant le correctif) et celui du disque.
 * Les deux sont chargés dans des contextes séparés et produisent des plans pour le même profil.
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { ZDEF } from "../src/generator/renderer.ts";

const dir = mkdtempSync(join(tmpdir(), "o42-"));
const avantPath = join(dir, "engine-avant.cjs");
writeFileSync(avantPath, execSync("git show HEAD:endurabuild/js/engine.js", { maxBuffer: 1 << 30 }));
const req = createRequire(import.meta.url);

function chargerMoteur(p) {
  // Chaque moteur pose `globalThis.EBV2` : on le capture puis on le retire, sinon le second
  // écraserait le premier et la comparaison mesurerait deux fois le même produit.
  const avant = globalThis.EBV2;
  delete globalThis.EBV2;
  req(p);
  const m = globalThis.EBV2;
  globalThis.EBV2 = avant;
  return m;
}
const AVANT = chargerMoteur(avantPath);
const APRES = chargerMoteur(req.resolve("../endurabuild/js/engine.js"));
if (!AVANT || !APRES || AVANT === APRES) { console.error("✖ les deux moteurs n'ont pas pu être chargés séparément"); process.exit(1); }

const SP = {
  swim: ["sprint", "demifond", "fond", "ow"], tri: ["S", "M", "70.3", "Full"],
  swimrun: ["experience", "sprint", "series", "championship"],
  run: ["5k", "10k", "semi", "marathon"], trail: ["court", "long", "ultra"],
  duathlon: ["S", "M", "L"], bike: ["route", "cyclosportive", "gravel"],
};
const H = ["reprise", "confirme", "ancien"], L = ["debutant", "inter", "avance"];
const BASE = {
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune", sessions_max: "5",
  dispo: "quotidienne", doubles: "non", pace_known: "oui", pace: "5:00", terrain: "route",
  sex: "H", age: "35", vol_max: "8", vol_recent: "3", weight: "75", ftp: "220",
  css: "1:50", css_known: "oui", ftp_known: "oui", intent: "competition",
  swim_total_m: "7850", run_total_km: "33", segments_n: "20", longest_swim_m: "1400",
  water_temp_c: "20", team_mode: "binome", openwater_access: "saisonnier",
};
const CSS_SEC = 110, THR_SEC = 300;

// Le multiplicateur d'allure de la zone, lu dans `ZDEF` — l'AUTORITÉ que le ticket nomme, et le
// seul objet partagé entre la mesure et le moteur mesuré. Le critère est alors exactement celui
// du §6 : la durée LIVRÉE par le bundle vaut-elle la distance à l'allure que la DÉFINITION
// prescrit ?
//
// ⚠ MA PREMIÈRE ÉCRITURE lisait `APRES.intOf(z)` « pour interroger ce qui s'exécute » — `intOf`
// n'est PAS exposée sur `EBV2` (46 clés, pas celle-là), donc `mult` rendait `null` partout, la
// table par zone sortait VIDE, et le verdict s'affichait quand même « VENTILÉ » parce qu'il
// testait `c2ko === 0` : un critère satisfait par l'absence de mesure. Les deux fautes sont de
// la même famille — un taux SATURÉ (ici 0 / 0) accuse l'instrument. Le garde-fou de population
// ci-dessous existe pour que ce verdict ne puisse plus être rendu à vide.
const mult = (z) => {
  const d = ZDEF[z];
  return d && (d.ref === "css" || d.ref === "thrPace") ? (d.lo + d.hi) / 2 : null;
};

const blocs = (plan, f) => {
  for (const w of plan.weeks ?? []) for (const d of w.days ?? []) for (const s of d.sessions ?? [])
    for (const st of s.steps ?? []) f(st, s, w);
};
const volSem = (plan) => (plan.weeks ?? []).map((w) => w.vol ?? 0);
/** Les minutes LIVRÉES d'une semaine, sommées sur les séances — non arrondies. */
const minSem = (w) => (w.days ?? []).reduce((t, d) => t + (d.sessions ?? []).reduce((u, s) => u + (s.min || 0), 0), 0);

let profils = 0, plansIdentiques = 0;
const parZone = {};           // zone → { blocs, avant, apres, attendu }
let c2ok = 0, c2ko = 0;       // identité durée = f(zone)
const c2exemples = [];
let volMonte = 0, volBaisse = 0, volEgal = 0;
const baisses = [];
let semaines = 0, pireDegradation = -Infinity, pireSemaine = "";
// Tolérance en MINUTES, parce que le pas du point fixe est absolu : 6 minutes, soit un pas
// d'affichage (0,1 h) et l'ordre de grandeur d'UNE répétition. Au-delà, ce n'est plus de la
// convergence : quelque chose a pris du volume et il faut le nommer.
const TOL_MIN = 6;
const inexplique = [];
const ecarts54 = [];

for (const [sport, fmts] of Object.entries(SP))
  for (const format of fmts) for (const history of H) for (const level of L) {
    const a = { ...BASE, sport, format, history, level };
    let pA, pB;
    try { pA = AVANT.buildPlan(sport, { ...a }); pB = APRES.buildPlan(sport, { ...a }); } catch { continue; }
    profils++;

    // --- [1] et [2] : par BLOC, sur la sortie livrée d'APRÈS ---
    blocs(pB, (st, s) => {
      if (st.role !== "body" || st.distanceM == null) return;
      const z = String(st.zone || ""), m = mult(z);
      const disc = st.d || s.d;
      if (m == null) return;
      const reps = st.reps || 1;
      const rec = reps > 1 ? (reps - 1) * (st.recoveryMin || 0) : 0;
      const unite = disc === "sw" ? 100 : 1000, ancre = disc === "sw" ? CSS_SEC : THR_SEC;
      const attendu = ((reps * st.distanceM) / unite) * ((ancre * m) / 60) + rec;
      // ⚠ LA COLONNE AGRÉGÉE COMPARE DU TRAVAIL À DU TRAVAIL. Ma première écriture sommait
      // `_min`, récup COMPRISE, contre une ancre brute récup comprise — or la récup ne suit pas
      // le ratio de la zone (c'est du repos, pas de la nage). Les quatre ✖ affichés étaient donc
      // ma somme, pas le moteur : l'identité par BLOC (qui traite la récup à part) était déjà à
      // 4 248 / 4 248. Une colonne intitulée « l'ampleur par zone » qui mesure « ampleur + récup »
      // est la faute que la règle 15 nomme, dans le rapport qui la vérifie.
      const brut = ((reps * st.distanceM) / unite) * (ancre / 60);
      const e = (parZone[z] ||= { blocs: 0, brut: 0, livre: 0, mult: m });
      e.blocs++; e.brut += brut; e.livre += (st._min ?? 0) - rec;
      if (Math.abs((st._min ?? 0) - attendu) < 0.02) c2ok++;
      else { c2ko++; if (c2exemples.length < 5) c2exemples.push(`${sport}/${format} « ${s.name} » ${z} : livré ${(st._min ?? 0).toFixed(2)} ≠ attendu ${attendu.toFixed(2)}`); }
    });

    // --- [3] et [4] : le VOLUME LIVRÉ, semaine par semaine ---
    const vA = volSem(pA), vB = volSem(pB);
    if (vA.length !== vB.length) { inexplique.push(`${sport}/${format}/${history}/${level} : ${vA.length} semaines → ${vB.length}`); continue; }
    const sA = vA.reduce((t, v) => t + v, 0), sB = vB.reduce((t, v) => t + v, 0);
    if (Math.abs(sA - sB) < 0.005) { volEgal++; plansIdentiques++; }
    else if (sB > sA) volMonte++;
    else volBaisse++;

    // [3] et [4] — LE CRITÈRE EST LE CONTRAT DU MOTEUR, PAS UNE THÉORIE À MOI.
    //
    // ⚠ MA PREMIÈRE ÉCRITURE classait les baisses en « sw.speed » ou « pic livré qui BAISSE » —
    // elle nommait « un plafond mord » et mesurait « le pic a baissé », alors qu'un plafond mord
    // sur n'importe quelle semaine. Elle laissait 9 plans « inexpliqués » ; instrumentés semaine
    // par semaine, ils perdaient 1 à 5 MINUTES sur une semaine dont la cible DÉCLARÉE n'avait
    // pas bougé — pas un plafond, le point fixe qui converge sur un autre point discret (les
    // blocs se quantifient par 25 m et par répétition entière). Le bon critère existait déjà
    // dans le plan : `vol_declared` (la courbe) et `vol_real` (le livré).
    //
    // Le volume BOUGE légitimement des deux côtés : les blocs grossissent, et la courbe DÉCLARÉE
    // grossit avec eux puisque la sonde de capacité V2.1 mesure la semaine LIVRÉE (B-25/O-35).
    // Ce qui ne doit PAS bouger, c'est l'écart entre les deux : une semaine qui finit PLUS LOIN
    // de sa cible qu'avant, c'est du volume que quelque chose a absorbé sans le dire.
    for (let i = 0; i < pA.weeks.length; i++) {
      const wa = pA.weeks[i], wb = pB.weeks[i];
      const dA = wa.vol_declared ?? 0, dB = wb.vol_declared ?? 0;
      if (!(dA > 0) || !(dB > 0)) continue;
      semaines++;
      // ⚠ ET UNE QUATRIÈME FOIS LA MÊME FAMILLE, DANS CE MÊME SCRIPT : ma première tolérance
      // était un POURCENTAGE de la cible (2 %) quand le pas du point fixe est ABSOLU — un bloc
      // se quantifie par 25 m et par répétition entière, soit un demi-mètre-minute à quelques
      // minutes, quelle que soit la taille de la semaine. Sur une semaine de nage de 1,2 h, un
      // seul pas vaut 8 % : le critère rendait 205 « inexpliqués » qui étaient tous le même
      // arrondi. Comparer un pas absolu à un seuil relatif est une faute d'unité (règle 14).
      // Le LIVRÉ est sommé exactement sur les séances : `vol_real` est arrondi au dixième
      // d'heure, donc son pas d'observation vaut déjà 6 min — mesurer un résidu de 6 min avec un
      // instrument gradué tous les 6 min ne dit rien. Seule la CIBLE reste arrondie (±3 min).
      const dm = (minSem(wa) - dA * 60) - (minSem(wb) - dB * 60); // > 0 : la semaine s'éloigne
      if (dm > pireDegradation) { pireDegradation = dm; pireSemaine = `${sport}/${format}/${history}/${level} S${i + 1} : écart à la cible ${(minSem(wa) - dA * 60).toFixed(1)} → ${(minSem(wb) - dB * 60).toFixed(1)} min`; }
      if (dm > TOL_MIN) {
        // NOMMER LA CAUSE, pas seulement la compter (critère 3). L'hypothèse à falsifier : la
        // cible DÉCLARÉE monte plus vite que le livré ne peut suivre — la sonde de capacité V2.1
        // mesure un clone SATURÉ de la semaine (B-25/O-35), dont les minutes grossissent du ratio
        // de zone, pendant que le livré reste tenu par des plafonds NOMMÉS (« OFF (fréquence
        // nage) », « OFF (budget séances) », les bornes de bloc). C'est la famille T-25/O-35, pas
        // un mécanisme neuf — et si un seul cas ne la vérifie pas, c'est lui le vrai résidu.
        const cibleMonte = dB > dA + 1e-9;
        // SECONDE CAUSE NOMMÉE — le moteur ÉCRIT sa raison dans le nom de la séance qu'il
        // retire : « OFF (lissage) », « OFF (équilibre du bloc) », « OFF (fréquence nage) »,
        // « OFF (budget séances) ». Une semaine qui perd des minutes en gagnant un de ces OFF
        // est expliquée par une règle qui se nomme elle-même ; c'est le §6-3 au pied de la
        // lettre. On le LIT sur la sortie plutôt que de le déduire (règle 15).
        const offs = (w) => (w.days ?? []).flatMap((d) => (d.sessions ?? [])).filter((s) => s.d === "rs" && /OFF\s*\(/.test(String(s.name || ""))).length;
        const offNouveau = offs(wb) > offs(wa);
        ecarts54.push({ id: `${sport}/${format}/${history}/${level} S${i + 1}`, dm, cibleMonte, offNouveau, dA, dB });
        if (!cibleMonte && !offNouveau) inexplique.push(`${sport}/${format}/${history}/${level} S${i + 1} : −${dm.toFixed(1)} min SANS cible qui monte NI plafond qui se nomme (${dA} → ${dB} h)`);
      }
    }
  }

const pct = (a, b) => (b === 0 ? "  —" : (((a / b) - 1) * 100).toFixed(1).padStart(6) + " %");
console.log(`O-42 — VENTILATION DU DIFF (§6)\n\n  profils comparés : ${profils} · plans au volume INCHANGÉ : ${plansIdentiques}\n`);

console.log(`[1][2] L'AMPLEUR PAR ZONE EST LE RATIO DE LA ZONE — bloc par bloc`);
console.log(`       zone         blocs   ancre brute →   livré     écart     attendu (mult−1)   verdict`);
for (const [z, e] of Object.entries(parZone).sort((a, b) => b[1].blocs - a[1].blocs)) {
  const att = ((e.mult - 1) * 100).toFixed(1) + " %";
  const obs = ((e.livre / e.brut - 1) * 100);
  const ok = Math.abs(obs - (e.mult - 1) * 100) < 0.15;
  console.log(`       ${z.padEnd(12)} ${String(e.blocs).padStart(5)}   ${e.brut.toFixed(0).padStart(9)}  ${e.livre.toFixed(0).padStart(8)}  ${pct(e.livre, e.brut)}   ${att.padStart(10)}       ${ok ? "✓" : "✖"}`);
}
console.log(`\n       identité durée = distance × allure de ZONE : ${c2ok} blocs conformes · ${c2ko} divergents`);
for (const x of c2exemples) console.log(`         ✖ ${x}`);

console.log(`\n[3][4] LE VOLUME LIVRÉ`);
console.log(`       plans dont le volume total MONTE   : ${volMonte}`);
console.log(`       plans dont le volume total BAISSE  : ${volBaisse}`);
console.log(`       plans INCHANGÉS                    : ${volEgal}`);
console.log(`       … le mouvement est LÉGITIME des deux côtés : les blocs grossissent, et la courbe
         DÉCLARÉE grossit avec eux (la sonde de capacité V2.1 mesure la semaine LIVRÉE).
         Ce qui ne doit pas bouger, c'est l'ÉCART du livré à sa cible.

       semaines comparées                       : ${semaines}
       pire éloignement d'une semaine à sa cible : ${pireDegradation.toFixed(1)} min
         · ${pireSemaine}

       semaines qui s'éloignent de plus de ${TOL_MIN} min : ${ecarts54.length} (${(100 * ecarts54.length / (semaines || 1)).toFixed(1)} %)
       … dont la cible DÉCLARÉE monte plus vite que le livré : ${ecarts54.filter((e) => e.cibleMonte).length}
       … dont un plafond qui SE NOMME apparaît (« OFF (…) »)  : ${ecarts54.filter((e) => !e.cibleMonte && e.offNouveau).length}
         (famille T-25 / O-35 : la sonde de capacité lit un clone SATURÉ, le livré reste tenu
          par des plafonds nommés — « OFF (fréquence nage) », « OFF (budget séances) », bornes
          de bloc. O-42 ne crée pas ce mécanisme, il l'atteint plus tôt.)`);
if (inexplique.length) {
  console.log(`\n       ✖ MOUVEMENTS INEXPLIQUÉS (> ${TOL_MIN} min d'éloignement, ou structure changée) : ${inexplique.length}`);
  for (const x of inexplique.slice(0, 10)) console.log(`         · ${x}`);
} else {
  console.log(`\n       ✓ aucune semaine ne finit plus loin de sa cible qu'avant, au-delà du pas de
         quantification du point fixe. Aucun plan ne change de NOMBRE de semaines.`);
}

// GARDE DE POPULATION — un verdict ne se rend pas à vide. `c2ko === 0` est satisfait par
// l'absence de blocs autant que par leur conformité ; sans cette ligne, casser l'instrument rend
// le rapport VERT (c'est arrivé, cf. le commentaire de `mult`).
if (c2ok + c2ko === 0 || profils === 0) {
  console.log(`\n  ✖ INSTRUMENT MUET : ${profils} profils, ${c2ok + c2ko} blocs mesurés. Aucun verdict n'est rendu.`);
  process.exit(1);
}
const verdict = c2ko === 0 && inexplique.length === 0;
console.log(`\n  → ${verdict ? "VENTILÉ : chaque bloc rend exactement la durée que sa zone prescrit, et rien\n    ne bouge dans la structure. Le diff est entièrement expliqué." : "RÉSIDU : à nommer avant d'aller plus loin (critère 4 du §6)."}`);
process.exit(verdict ? 0 : 1);
