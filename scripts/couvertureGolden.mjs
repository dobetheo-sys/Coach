#!/usr/bin/env node
/**
 * A-2 — LE CORPUS COUVRE-T-IL LES BRANCHES DES RÈGLES, OU SEULEMENT DES FORMATS ET DES NIVEAUX ?
 *
 *   node scripts/couvertureGolden.mjs            # les couples les moins couverts
 *   node scripts/couvertureGolden.mjs --tout     # toute la matrice
 *
 * SIX OCCURRENCES NE SONT PLUS UNE SÉRIE DE DISTRACTIONS, C'EST UNE PROPRIÉTÉ DU CORPUS
 * (arbitrage du fondateur, 17/08/2026). Le golden a été construit pour couvrir des FORMATS et des
 * NIVEAUX, pas les BRANCHES des règles qui les lisent. Chaque fois qu'une règle apprend à lire une
 * nouvelle clé, le corpus devient muet sur son domaine — **et il l'est en silence, parce qu'un
 * corpus incomplet rend des résultats VERTS.**
 *
 * LA COUVERTURE PAR CLÉ NE SUFFIT PAS, ET C'EST LE POINT DE CETTE SONDE. Le dernier trou (O-54 §2)
 * aurait passé un contrôle par clé sans broncher : `level` portait ses 3 valeurs, `longest_swim_m`
 * ses 5 branches, et pourtant **aucun profil ne croisait `debutant` avec une continuité basse** —
 * exactement la cellule que C15 venait d'apprendre à lire. Une règle lit rarement une clé seule ;
 * elle lit un CROISEMENT. La sonde mesure donc les cellules du produit cartésien, par sport.
 *
 * CE QU'ELLE NE FAIT PAS, DIT PLUTÔT QUE TU : elle ne sait pas quels croisements le CODE lit
 * réellement — elle les énumère tous entre clés à petit domaine. Beaucoup de cellules vides sont
 * légitimes (une combinaison qui n'a pas de sens produit). Elle classe donc, elle ne juge pas :
 * c'est une liste à relire quand une règle apprend à lire une clé, pas un gate.
 * Volontairement HORS CI tant que sa sortie n'a pas été triée — c'est la leçon R20.6 : rendre
 * bloquant un banc dont on n'a pas trié les échecs fige la dette au lieu de la traiter.
 */
import { profiles as goldenProfiles } from "./goldenMaster.mjs";

const TOUT = process.argv.includes("--tout");
/** Une clé est « de branche » si son domaine observé est petit : c'est là qu'une règle bifurque. */
const MAX_DOMAINE = 6;

// ---- 1. Relever le corpus : quelles valeurs chaque clé prend, par sport --------------------
const parSport = new Map();
for (const { sport, a } of goldenProfiles()) {
  if (!parSport.has(sport)) parSport.set(sport, []);
  parSport.get(sport).push(a);
}

const norm = (v) => (v === undefined || v === null || v === "" ? "∅" : String(v));

console.log("A-2 — COUVERTURE DES BRANCHES DU CORPUS GOLDEN\n");
let totalCellules = 0, totalVides = 0;
const pire = [];

for (const [sport, profils] of [...parSport.entries()].sort()) {
  // domaine observé de chaque clé
  const dom = new Map();
  for (const a of profils) for (const k of Object.keys(a)) {
    if (!dom.has(k)) dom.set(k, new Set());
    dom.get(k).add(norm(a[k]));
  }
  // une clé absente de certains profils a une branche « ∅ » qui compte : l'absence EST une branche
  for (const [k, s] of dom) if (profils.some((a) => !(k in a))) s.add("∅");

  const cles = [...dom.entries()]
    .filter(([, s]) => s.size >= 2 && s.size <= MAX_DOMAINE)
    .map(([k]) => k).sort();
  if (cles.length < 2) continue;

  // ⚠ MA PREMIÈRE ÉCRITURE CLASSAIT DES CELLULES et rendait 1 015 lignes de bruit structurel par
  // sport (`age=16 × cycle_len=28` : la sous-passe `cycle` n'existe qu'à un seul âge, la cellule
  // est vide par CONSTRUCTION). La grandeur utile est le COUPLE, pas la cellule : un couple à
  // 100 % dit « ces deux clés sont croisées partout », un couple à 25 % dit « une seule branche
  // de l'une voit une seule branche de l'autre ». On classe donc les couples par leur taux, et on
  // montre les pires — un cas particulier vide se noie, un axe non croisé ressort.
  const couples = [];
  let cellules = 0, remplies = 0;
  for (let i = 0; i < cles.length; i++) for (let j = i + 1; j < cles.length; j++) {
    const k1 = cles[i], k2 = cles[j];
    const v1 = [...dom.get(k1)], v2 = [...dom.get(k2)];
    const vus = new Set(profils.map((a) => norm(a[k1]) + " " + norm(a[k2])));
    let n = 0, ok = 0; const manque = [];
    for (const x of v1) for (const y of v2) {
      n++; if (vus.has(x + " " + y)) ok++; else manque.push(`${x}×${y}`);
    }
    cellules += n; remplies += ok;
    couples.push({ k1, k2, n, ok, pct: ok / n, manque });
  }
  totalCellules += cellules; totalVides += cellules - remplies;
  console.log(`  ${sport.padEnd(9)} ${String(profils.length).padStart(4)} profils · ${cles.length} clés de branche · ` +
    `${remplies}/${cellules} cellules (${((100 * remplies) / (cellules || 1)).toFixed(0)} %)`);
  couples.sort((a, b) => a.pct - b.pct);
  const aMontrer = TOUT ? couples.filter((c) => c.pct < 1) : couples.filter((c) => c.pct < 0.5).slice(0, 5);
  for (const c of aMontrer)
    console.log(`       ${(100 * c.pct).toFixed(0).padStart(3)} % ${c.k1} × ${c.k2}  (${c.ok}/${c.n})` +
      (c.manque.length <= 3 ? `  manque ${c.manque.join(", ")}` : ""));
  const nVides = couples.filter((c) => c.ok < c.n).length;
  if (nVides > aMontrer.length) console.log(`       … ${nVides} couple(s) incomplets au total (\`--tout\` pour la liste)`);
  pire.push({ sport, n: nVides });
}

// ---- CONTRE-PREUVE — la sonde voit-elle le trou qu'elle existe pour voir ? -----------------
// Sans elle, cette mesure ne prouve que sa propre exécution. On rejoue le corpus tri AMPUTÉ des
// profils `debutant` de la sous-passe B-17 — c'est-à-dire l'état d'AVANT le correctif d'O-54 §2 —
// et le couple `level × longest_swim_known` doit y être INCOMPLET, puis complet avec eux.
{
  const tri = parSport.get("tri") ?? [];
  const taux = (l) => {
    const vus = new Set(l.map((a) => norm(a.level) + " " + norm(a.longest_swim_known)));
    const lv = [...new Set(l.map((a) => norm(a.level)))], ks = [...new Set(l.map((a) => norm(a.longest_swim_known)))];
    let n = 0, ok = 0;
    for (const x of lv) for (const y of ks) { n++; if (vus.has(x + " " + y)) ok++; }
    return { ok, n };
  };
  const avant = taux(tri.filter((a) => !(a.level === "debutant" && a.longest_swim_known === "non")));
  const apres = taux(tri);
  console.log(`\n  CONTRE-PREUVE — \`level × longest_swim_known\` sur tri :`);
  console.log(`     corpus AMPUTÉ des débutants à continuité inconnue : ${avant.ok}/${avant.n}` +
    (avant.ok < avant.n ? "  ✔ la sonde VOIT le trou" : "  ✖ la sonde ne le voit pas — instrument à revoir"));
  // LA CELLULE QUI COMPTE EST NOMMÉE, pas le taux global : `debutant × non` est celle que C15
  // venait d'apprendre à lire, et c'est elle que le correctif devait faire exister. Rendre un
  // verdict sur le taux ferait dire « le trou subsiste » alors que le trou VISÉ est comblé et
  // que ce qui reste (`avance × non`, `avance × ∅`) est une autre cellule, non concernée.
  const vusLK = new Set(tri.map((a) => norm(a.level) + "×" + norm(a.longest_swim_known)));
  const manquantes = [];
  for (const l of ["debutant", "inter", "avance"]) for (const k of ["oui", "non", "∅"])
    if (!vusLK.has(l + "×" + k)) manquantes.push(l + "×" + k);
  console.log(`     corpus complet                                   : ${apres.ok}/${apres.n}` +
    (vusLK.has("debutant×non") ? "  ✔ `debutant × non` existe — la cellule visée" : "  ✖ `debutant × non` MANQUE toujours"));
  if (manquantes.length) console.log(`     cellules encore absentes (autres, non visées par O-54 §2) : ${manquantes.join(", ")}`);
}

console.log(`\n  TOTAL : ${totalCellules - totalVides}/${totalCellules} cellules peuplées ` +
  `(${(100 * (totalCellules - totalVides) / (totalCellules || 1)).toFixed(0)} %) · ${totalVides} vides\n`);
console.log("  → À RELIRE QUAND UNE RÈGLE APPREND À LIRE UNE CLÉ : si le croisement qu'elle lit est");
console.log("    dans cette liste, le corpus ne l'exerce pas, et un correctif faux y passera VERT.");
console.log("    C'est ce qui est arrivé six fois — la dernière avec `level × longest_swim_m`, où");
console.log("    une écriture qui donnait 4 150 m de nage à qui déclare 400 m n'aurait rien fait");
console.log("    bouger dans le golden.");
