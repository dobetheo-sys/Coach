#!/usr/bin/env node
/**
 * POURQUOI LA NAGE PROGRESSE ET PAS LE BRICK — la mesure demandée AVANT tout correctif.
 *
 *   npm run mesure:progression [profil.json]
 *
 * Constat du fondateur sur son plan (17/08/2026) : **dix bricks strictement identiques** sur
 * quarante semaines (3 h 32 chacun, mêmes puissances), **69 footings sur ~110 à exactement
 * 30 minutes**, pendant que la nage monte (775 → 881 → 1 325 m). Donc ce n'est pas une limite
 * du moteur : certains types de séance montent en charge, d'autres sont figés à leur forme
 * finale dès la première occurrence.
 *
 * ── CE QUE CETTE SONDE MESURE, ET CE QU'ELLE NE DÉDUIT PAS ────────────────────────────────
 *
 * Elle ne cherche PAS « quelle passe fige le brick » — ce serait modéliser. Elle observe, pour
 * chaque type de séance et chaque semaine, la valeur LIVRÉE et sa position par rapport aux
 * BORNES du bloc qui la porte (`bnd.floor`, `bnd.cap`). Trois états possibles, et un seul
 * explique un plateau :
 *
 *     au PLANCHER   la séance ne peut pas descendre ; si elle y est toutes les semaines,
 *                   c'est le plancher qui la fixe, pas la périodisation
 *     au PLAFOND    idem par le haut — la séance est saturée dès sa première occurrence
 *     LIBRE         la valeur vient de la courbe : elle peut progresser
 *
 * La question « où se décide la différence » a donc une réponse OBSERVABLE : un type figé est
 * un type dont les bornes ne varient pas avec la semaine ET dont le livré est collé à l'une
 * d'elles. Un type qui progresse est soit libre, soit borné par une valeur qui BOUGE (c'est ce
 * que B-17 fait pour la nage continue : sa cible est recalculée à chaque palier).
 *
 * ── LA PRÉCAUTION QUI DÉCIDE DU VERDICT ───────────────────────────────────────────────────
 *
 * Un plateau se mesure PAR TYPE et PAR SEMAINE, jamais en agrégeant d'abord (règle 21) : la
 * moyenne d'un type figé et la moyenne d'un type qui progresse peuvent être identiques. On
 * compare donc la PREMIÈRE et la DERNIÈRE occurrence de chaque type, et on compte les valeurs
 * distinctes — un type à une seule valeur distincte sur dix occurrences est figé, quelle que
 * soit sa moyenne.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import "../src/app/bridge.ts";

const arg = process.argv.slice(2).find((x) => !x.startsWith("-"));
const PROFIL_DEFAUT = {
  sport: "tri", intent: "competition", format: "70.3", history: "confirme", level: "inter",
  vol_max: "10", vol_recent: "6", sessions_max: "8", dispo: "semaine", off_days: "non",
  doubles: "non", injury: "aucune", age: "35", sex: "H", weight: "85", med_pain: "non",
  med_dizzy: "non", med_treat: "non", terrain: "vallonne", leg_swim_env: "lac", milieu: "bassin",
  longest_swim_m: "1000", longest_swim_known: "oui", pace_known: "oui", pace: "5:00",
  ftp_known: "oui", ftp: "227", css_known: "oui", css: "2:05",
  plan_start: "2026-08-18", race_date: "2027-05-23",
};
const a = arg && existsSync(resolve(arg)) ? JSON.parse(readFileSync(resolve(arg), "utf8")) : PROFIL_DEFAUT;
const sport = String(a.sport || "tri");
if (arg && !existsSync(resolve(arg))) { console.error(`✖ introuvable : ${arg}`); process.exit(2); }

const p = globalThis.EBV2.buildPlan(sport, a);
console.log(`PROGRESSION PAR TYPE DE SÉANCE — ${sport}/${a.format} · ${p.weeks.length} semaines`
  + (arg ? ` · profil ${arg}` : " · profil par défaut (aucun fixture fourni)") + "\n");

// Le TYPE, c'est le nom débarrassé de ce que le contenu y a écrit : une continue « — 1250 m
// d'affilée » et une « — 1900 m » sont le même type, et c'est justement leur écart qui nous
// intéresse. Sans cette normalisation, chaque palier serait un type à une occurrence.
const typeDe = (n) => String(n || "")
  .replace(/ — \d+\s*m d'affilée/, " — <dist>")
  .replace(/\s*\(matin\)/, "")
  .trim();

const parType = new Map();
for (const w of p.weeks) for (const d of w.days) for (const s of d.sessions) {
  if (s.d === "rs" || s.race) continue;
  const t = typeDe(s.name);
  if (!parType.has(t)) parType.set(t, []);
  // La position par rapport aux bornes, bloc de CORPS par bloc de corps. On retient l'état le
  // plus contraignant de la séance : un seul bloc collé à sa borne suffit à la figer.
  let etat = "libre";
  const corps = (s.steps || []).filter((st) => st.role === "body");
  for (const st of corps) {
    const v = st.durationMin != null ? st.durationMin : st.distanceM;
    if (v == null || !st.bnd) continue;
    const { floor, cap } = st.bnd;
    if (floor != null && cap != null && Math.abs(cap - floor) < 1e-6) { etat = "épinglé"; break; }
    if (cap != null && v >= cap - 0.51) etat = etat === "libre" ? "au plafond" : etat;
    else if (floor != null && v <= floor + 0.51) etat = etat === "libre" ? "au plancher" : etat;
  }
  // LA BORNE ELLE-MÊME VARIE-T-ELLE ? C'est la question qui décide : un livré collé à un
  // plafond CONSTANT est figé par ce plafond ; collé à un plafond qui MONTE, il progresserait.
  const bornes = corps.filter((st) => st.bnd).map((st) => `${st.bnd.floor}..${st.bnd.cap}`);
  parType.get(t).push({ sem: w.num, min: Math.round(s.min || 0), phase: w.phase.id, etat,
    bornes: bornes.join("|"),
    dist: corps.reduce((x, st) => x + (st.distanceM || 0) * (st.reps || 1), 0) });
}

const lignes = [...parType.entries()]
  .filter(([, v]) => v.length >= 3)
  .map(([t, v]) => {
    v.sort((x, y) => x.sem - y.sem);
    const mins = v.map((x) => x.min);
    const distincts = new Set(mins).size;
    const premier = mins[0], dernier = mins[mins.length - 1];
    const etats = {};
    for (const x of v) etats[x.etat] = (etats[x.etat] || 0) + 1;
    const dominant = Object.entries(etats).sort((x, y) => y[1] - x[1])[0];
    const bornesDistinctes = new Set(v.map((x) => x.bornes)).size;
    return { t, n: v.length, distincts, premier, dernier, bornesDistinctes,
      bornesEx: [...new Set(v.map((x) => x.bornes))].slice(0, 3).join("  "),
      croissance: premier ? Math.round((100 * (dernier - premier)) / premier) : 0,
      etat: dominant[0], partEtat: Math.round((100 * dominant[1]) / v.length),
      distDistincts: new Set(v.map((x) => x.dist)).size, v };
  })
  .sort((x, y) => x.distincts / x.n - y.distincts / y.n);

console.log("  type de séance                          n  valeurs   1ʳᵉ→dern.   état dominant");
console.log("  ────────────────────────────────────────────────────────────────────────────");
for (const L of lignes) {
  const fige = L.distincts === 1;
  console.log(`  ${fige ? "✖" : "·"} ${L.t.slice(0, 36).padEnd(36)} ${String(L.n).padStart(3)}  ${String(L.distincts).padStart(3)} val.  `
    + `${String(L.premier).padStart(4)}→${String(L.dernier).padStart(4)} ${String(L.croissance >= 0 ? "+" + L.croissance : L.croissance).padStart(5)}%  `
    + `${L.etat} (${L.partEtat} %)  bornes: ${L.bornesDistinctes} distincte(s)`);
}

const figes = lignes.filter((L) => L.distincts === 1);
const montent = lignes.filter((L) => L.distincts > 1 && L.croissance > 5);
console.log(`\n  ${figes.length} type(s) FIGÉ(S) — une seule valeur sur toutes leurs occurrences`);
console.log(`  ${montent.length} type(s) qui MONTENT de plus de 5 % entre la première et la dernière\n`);

// ── LA QUESTION POSÉE : OÙ SE DÉCIDE LA DIFFÉRENCE ? ──────────────────────────────────────
console.log("── ce qui distingue les deux groupes ──────────────────────────────────────────\n");
const tab = (g, nom) => {
  if (!g.length) { console.log(`  ${nom} : aucun`); return; }
  const etats = {};
  for (const L of g) etats[L.etat] = (etats[L.etat] || 0) + 1;
  console.log(`  ${nom} (${g.length}) — état dominant : ${Object.entries(etats).map(([k, n]) => `${k} ×${n}`).join(" · ")}`);
  for (const L of g.slice(0, 6)) console.log(`      ${L.t.slice(0, 40).padEnd(40)} ${L.etat} ${L.partEtat} % · ${L.distincts} valeur(s) sur ${L.n} · bornes ${L.bornesDistinctes} distincte(s) : ${L.bornesEx || "aucune"}`);
};
tab(figes, "FIGÉS");
tab(montent, "QUI MONTENT");

console.log("\n  Lecture : un type figé dont l'état dominant est « au plafond » ou « épinglé » est");
console.log("  saturé dès sa première occurrence — la courbe de volume ne peut plus le faire monter.");
console.log("  Un type figé « au plancher » est retenu par le bas. Un type qui monte est soit libre,");
console.log("  soit borné par une valeur qui VARIE avec la semaine (c'est ce que B-17 fait).\n");

// Les deux cas que le fondateur a nommés, en clair.
for (const motif of [/^Brick/i, /Footing/i, /^Nage continue/i]) {
  const L = lignes.find((x) => motif.test(x.t));
  if (!L) continue;
  const vals = [...new Set(L.v.map((x) => x.min))];
  console.log(`  ${L.t} — ${L.n} occurrences, ${L.distincts} valeur(s) : ${vals.slice(0, 8).join(", ")}${vals.length > 8 ? "…" : ""} min`);
  console.log(`      semaines ${L.v.map((x) => "S" + x.sem + ":" + x.min).slice(0, 10).join(" ")}`);
  console.log(`      états : ${Object.entries(L.v.reduce((m, x) => ((m[x.etat] = (m[x.etat] || 0) + 1), m), {})).map(([k, n]) => k + " ×" + n).join(" · ")}`);
}
process.exit(0);
