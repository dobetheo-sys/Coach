/**
 * LE PIC LIVRÉ MAXIMUM — quatre questions du fondateur (22/08/2026).
 *
 *   §1  le maximum absolu, tous sports et tous formats, et sur quel profil
 *   §2  combien de profils atteignent leur `vol_max` DÉCLARÉ, à 10 % près
 *   §3  la distribution du nombre de créneaux réellement livrés dans la semaine de pic
 *   §4  sous neutralisation de TOUS les plafonds de durée de séance (`blockBounds`),
 *       quel pic maximum le moteur peut-il produire ?
 *
 * §4 ne s'écrit pas ici : il se joue par `npm run casser` sur `blockBounds` — la SEULE source
 * de bornes du moteur (CLAUDE.md, « séparation des rôles ») —, ce script étant relancé tel
 * quel. Un seul facteur varie, et on OBSERVE la sortie livrée au lieu de modéliser la borne
 * (règle 15).
 *
 * Le pic est LIVRÉ : maximum, sur les semaines de CHARGE, des minutes réellement présentes
 * dans le plan — jamais `volPeak`, qui est l'annonce.
 *
 *   node scripts/mesurePicMax.mjs
 */
import "../src/app/bridge.ts";
import { profiles } from "./goldenMaster.mjs";
import { estCharge } from "./lib/planMetrics.mjs";

const seances = (w) => (w.days ?? []).flatMap((d) => (d.sessions ?? []).filter((s) => s && s.d !== "rs" && !s.race));
const minSem = (w) => seances(w).reduce((t, s) => t + (s.min || 0), 0);

const lignes = [];
let refus = 0, population = 0;
for (const { key, sport, a } of profiles()) {
  population++;
  let p;
  try { p = globalThis.EBV2.buildPlan(sport, a); } catch { refus++; continue; }
  const ch = (p.weeks ?? []).filter(estCharge);
  if (!ch.length) continue;
  let pic = -1, semPic = null;
  for (const w of ch) { const m = minSem(w); if (m > pic) { pic = m; semPic = w; } }
  lignes.push({
    key, sport, format: a.format ?? null,
    picMin: pic, picH: pic / 60,
    creneaux: seances(semPic).length,
    semaine: semPic.num,
    // ⚠ FAUTE D'INSTRUMENT PUBLIÉE : ma première écriture testait `typeof a.vol_max === "number"`
    // et rendait §2 à 0/0 — un ZÉRO SATURÉ. Le corpus déclare `vol_max` en CHAÎNE ("10"), comme
    // le questionnaire le collecte. On convertit, on ne suppose pas.
    minParSeance: pic / Math.max(1, seances(semPic).length),
    volMax: Number.isFinite(Number(a.vol_max)) ? Number(a.vol_max) : null,
    annonce: p.volPeak ?? null,
    decisions: (p._v2?.decisions ?? []).map((d) => ({ id: d.id, val: String(d.val ?? "") })),
  });
}
if (!lignes.length) { console.error("✖ sonde vide — aucun plan mesuré"); process.exit(1); }

// ─── population ASSERTÉE : un zéro a besoin de sa population ───────────────────────────────
console.log(`population : ${population} profils balayés · ${lignes.length} plans mesurés · ${refus} refus typés`);

// ─── §1 ───────────────────────────────────────────────────────────────────────────────────
lignes.sort((x, y) => y.picMin - x.picMin);
console.log("\n§1 — LE PIC LIVRÉ MAXIMUM");
for (const l of lignes.slice(0, 8))
  console.log(`   ${l.picH.toFixed(2)} h  (${l.picMin} min)  ${l.creneaux} créneaux  S${l.semaine}  ${l.key}  [déclaré ${l.volMax ?? "—"} h · annoncé ${l.annonce ?? "—"} h]`);
const q = (p) => lignes[Math.min(lignes.length - 1, Math.floor((1 - p) * lignes.length))].picH;
console.log(`   médiane ${q(0.5).toFixed(2)} h · p90 ${q(0.9).toFixed(2)} h · p99 ${q(0.99).toFixed(2)} h · max ${lignes[0].picH.toFixed(2)} h`);

// ─── §2 ───────────────────────────────────────────────────────────────────────────────────
const avecDecl = lignes.filter((l) => l.volMax != null && l.volMax > 0);
const atteint = avecDecl.filter((l) => l.picH >= 0.9 * l.volMax);
console.log("\n§2 — LES PROFILS QUI ATTEIGNENT LEUR vol_max DÉCLARÉ (à 10 % près)");
console.log(`   ${atteint.length} / ${avecDecl.length} profils qui déclarent un vol_max (${((100 * atteint.length) / avecDecl.length).toFixed(1)} %)`);
const parDecl = new Map();
for (const l of avecDecl) {
  const e = parDecl.get(l.volMax) ?? { n: 0, ok: 0, ratios: [] };
  e.n++; if (l.picH >= 0.9 * l.volMax) e.ok++; e.ratios.push(l.picH / l.volMax);
  parDecl.set(l.volMax, e);
}
for (const [v, e] of [...parDecl].sort((x, y) => x[0] - y[0])) {
  const med = e.ratios.sort((x, y) => x - y)[Math.floor(e.ratios.length / 2)];
  console.log(`   vol_max ${String(v).padStart(4)} h : ${String(e.ok).padStart(4)}/${String(e.n).padStart(4)} atteints · ratio livré/déclaré médian ${(100 * med).toFixed(0)} %`);
}

// ─── §3 ───────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 — CRÉNEAUX LIVRÉS DANS LA SEMAINE DE PIC");
const dist = new Map();
for (const l of lignes) dist.set(l.creneaux, (dist.get(l.creneaux) ?? 0) + 1);
for (const [c, n] of [...dist].sort((x, y) => x[0] - y[0]))
  console.log(`   ${String(c).padStart(2)} créneaux : ${String(n).padStart(4)} profils  ${"█".repeat(Math.round((60 * n) / lignes.length))}`);
const maxCren = Math.max(...lignes.map((l) => l.creneaux));
console.log(`   maximum ${maxCren} créneaux · les profils au maximum : ${lignes.filter((l) => l.creneaux === maxCren).length}`);
const auMax = lignes.filter((l) => l.creneaux === maxCren).sort((x, y) => y.picMin - x.picMin)[0];
console.log(`   le plus gros pic parmi eux : ${auMax.picH.toFixed(2)} h · ${auMax.key}`);

// ─── §3bis — DURÉE ou NOMBRE ? la grandeur qui bouge sous neutralisation ───────────────────
const tri = (f) => lignes.map(f).sort((x, y) => x - y);
const md = (arr) => arr[Math.floor(arr.length / 2)];
console.log("\n§3bis — MINUTES PAR SÉANCE DANS LA SEMAINE DE PIC");
console.log(`   médiane ${md(tri((l) => l.minParSeance)).toFixed(1)} min · max ${Math.max(...lignes.map((l) => l.minParSeance)).toFixed(1)} min`);
console.log(`   créneaux : médiane ${md(tri((l) => l.creneaux))} · moyenne ${(lignes.reduce((t, l) => t + l.creneaux, 0) / lignes.length).toFixed(2)}`);

// ─── §5 — LE CAS MODAL : les profils à 10 h qui n'atteignent pas leur déclaration ──────────
// PLAFOND_CALENDRIER §4 : « si le manque est publié, le produit est honnête ; sinon, N profils
// reçoivent 7 h en ayant demandé 10, sans explication. » On lit la DÉCISION livrée, jamais une
// règle relue à la main.
const modal = lignes.filter((l) => l.volMax === 10 && l.picH < 0.9 * 10);
console.log("\n§5 — LE CAS MODAL : vol_max = 10 h NON ATTEINT");
console.log(`   population : ${modal.length} profils`);
const has = (l, id) => l.decisions.some((d) => d.id === id);
const avecManque = modal.filter((l) => has(l, "manque"));
const avecR202 = modal.filter((l) => has(l, "R20.2"));
const muets = modal.filter((l) => !has(l, "manque") && !has(l, "R20.2"));
console.log(`   décision « manque » publiée ......... ${avecManque.length} (${((100 * avecManque.length) / modal.length).toFixed(1)} %)`);
console.log(`   décision « R20.2 » publiée .......... ${avecR202.length} (${((100 * avecR202.length) / modal.length).toFixed(1)} %)`);
console.log(`   AUCUNE des deux — profils MUETS ..... ${muets.length} (${((100 * muets.length) / modal.length).toFixed(1)} %)`);
const dm = new Map();
for (const l of modal) dm.set(l.creneaux, (dm.get(l.creneaux) ?? 0) + 1);
console.log(`   créneaux au pic : ${[...dm].sort((x, y) => x[0] - y[0]).map(([k, v]) => `${k} → ${v}`).join(" · ")}`);
const causes = new Map();
for (const l of avecR202) {
  const v = l.decisions.find((d) => d.id === "R20.2").val;
  const m = /ce qui borne, c'est ([^(]+)/.exec(v);
  const c = (m ? m[1] : v).trim();
  causes.set(c, (causes.get(c) ?? 0) + 1);
}
console.log("   ce que dit leur carte « ce qui borne » :");
for (const [c, n] of [...causes].sort((x, y) => y[1] - x[1]).slice(0, 8)) console.log(`      ${String(n).padStart(4)} × ${c}`);
if (muets.length) {
  const g = muets.map((l) => 10 - l.picH).sort((x, y) => x - y);
  console.log(`   MUETS — écart à la déclaration : médiane ${g[Math.floor(g.length / 2)].toFixed(2)} h · max ${g[g.length - 1].toFixed(2)} h · ${muets.filter((l) => l.picH < 8).length} sous 8 h`);
}
if (muets.length) console.log(`   exemples de muets : ${muets.slice(0, 5).map((l) => `${l.key} (${l.picH.toFixed(1)} h)`).join(" · ")}`);
