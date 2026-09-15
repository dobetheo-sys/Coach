/**
 * B2 — LE VOCABULAIRE INTERNE NE SORT PAS VERS L'ATHLÈTE.
 *
 * GATE SUR LA SORTIE, JAMAIS SUR LA SOURCE, et c'est le point qui décide. Ce dépôt a payé
 * trois fois la faute inverse (« une CSP lue dans un commentaire », règle 15) — et le rapport
 * 06 lui-même l'a commise une quatrième : il annonçait « le premier avertissement affiche
 * quatre astérisques » en citant une chaîne trouvée dans un COMMENTAIRE, quand la mesure sur
 * le livré donne 28 profils sur 1 080. Un motif lu dans `src/` ne dit rien de ce qui s'affiche :
 * les identifiants de règle vivent légitimement dans les commentaires, les champs `id` des
 * décisions, les bancs et les registres. Ce qui est interdit, c'est qu'ils atteignent un ÉCRAN.
 *
 * On génère donc le corpus et on lit les champs RÉELLEMENT lus par l'athlète :
 * `decisions.what/val/why`, `warnings`, et pour chaque séance `name`, `det`, `note`.
 *
 * DEUX FAMILLES, DEUX TRAITEMENTS.
 *
 * 1. LES IDENTIFIANTS SONT DÉRIVÉS PAR MOTIF (`C22`, `R6.3`, `V2.1`, `O-17`, `B-17`, `T-46`) —
 *    jamais une liste écrite à la main, qui divergerait du registre à la première règle ajoutée
 *    (R11.1). Le prix de la dérivation est le faux positif, et il se paie en EXCLUSIONS NOMMÉES,
 *    une par une, avec leur raison — jamais en rétrécissant le motif jusqu'à ne plus rien voir.
 *
 * 2. LES MOTS DE MÉTIER n'ont aucune source dérivable : ils sont déclarés ICI, et le
 *    dictionnaire porte LE REMPLACEMENT FRANÇAIS à côté du terme. Ce n'est pas un interdit,
 *    c'est une traduction : celui qui rouvre ce fichier après avoir fait rougir le gate y
 *    trouve la phrase à écrire, pas seulement celle à ne pas écrire.
 *
 * LA POPULATION EST ÉPINGLÉE ET PUBLIÉE (« un zéro a besoin de sa population ») : le succès de
 * ce gate est « 0 fuite », c'est-à-dire la valeur qu'un balayage VIDE rendrait aussi. Le compte
 * de profils est donc vérifié contre une constante, et le nombre de champs réellement lus est
 * imprimé — la MESURE se prouve séparément de son RÉSULTAT.
 *
 *   node scripts/lintAthlete.mjs                 # le gate
 *   node scripts/lintAthlete.mjs --contrepreuve  # injecte une fuite et EXIGE le rouge
 */
import { profiles } from "./goldenMaster.mjs";

const CONTREPREUVE = process.argv.includes("--contrepreuve");
const POPULATION = 1080; // même corpus que `golden:verify` / `golden:bundle` (goldenMaster.mjs)

/** Identifiants de règle, DÉRIVÉS. Un motif par forme réellement employée dans le registre. */
const MOTIFS = [
  { nom: "Cn / Cnx", re: /\bC\d{1,3}[a-z]?\b/g },
  { nom: "Rn.m", re: /\bR\d{1,2}\.\d{1,2}[a-zA-Z-]*\b/g },
  { nom: "Vn.m", re: /\bV\d\.\d\b/g },
  { nom: "X-n", re: /\b[OTBSNUFIDPAH]-\d{1,3}[a-z]?\b/g },
  { nom: "In", re: /\bI\d{1,2}[a-z]?\b/g },
];

/**
 * EXCLUSIONS NOMMÉES — des chaînes qui RESSEMBLENT à un identifiant et n'en sont pas. Chacune
 * porte sa raison ; sans elles le gate rougirait sur du français correct, et le réflexe serait
 * de rétrécir le motif, c'est-à-dire de rendre le gate aveugle pour le faire taire.
 */
const FAUX_AMIS = [
  { mot: "R1", pourquoi: "première transition d'un duathlon (course → vélo) — vocabulaire de l'épreuve" },
  { mot: "R2", pourquoi: "seconde course d'un duathlon — vocabulaire de l'épreuve" },
  { mot: "T1", pourquoi: "première transition d'un triathlon" },
  { mot: "T2", pourquoi: "seconde transition d'un triathlon" },
  { mot: "D1", pourquoi: "dénivelé positif abrégé dans certaines notes de trail" },
  { mot: "I1", pourquoi: "intensité 1 dans le vocabulaire de zones de quelques notes" },
];

/**
 * DICTIONNAIRE — terme interne → ce qu'on écrit à la place. La colonne de droite EST le
 * livrable de cette garde : un gate qui dit seulement « non » fait réécrire au hasard.
 */
const DICTIONNAIRE = [
  { re: /bandes? normalis(é|e)e?s?/i, mot: "bandes normalisées", ecrire: "« la charge monte puis redescend » — décrire la FORME de la courbe, pas sa normalisation" },
  { re: /\blissage\b/i, mot: "lissage", ecrire: "« sans jamais monter de plus de 10 % d'une semaine à l'autre »" },
  { re: /budget implicite/i, mot: "budget implicite", ecrire: "« ce que ton volume permet », en donnant le calcul en clair" },
  { re: /sonde de capacit(é|e)/i, mot: "sonde de capacité", ecrire: "« ce que tes séances peuvent réellement contenir »" },
  { re: /\breadiness\b/i, mot: "readiness", ecrire: "« ta forme du jour » — le nom que l'écran emploie déjà" },
  { re: /point fixe/i, mot: "point fixe", ecrire: "ne pas mentionner la mécanique : dire l'effet sur le plan" },
  { re: /\bpooled\b/i, mot: "pooled", ecrire: "« toutes disciplines confondues »" },
  { re: /\bfallback\b/i, mot: "fallback", ecrire: "« séance de repli »" },
  { re: /\*\*/, mot: "** (gras Markdown)", ecrire: "rien : l'écran ne rend pas le Markdown, les astérisques s'affichent telles quelles" },
  { re: /∧|∨/, mot: "∧ / ∨ (symboles logiques)", ecrire: "« et » / « ou »" },
];

let nProfils = 0, nRefus = 0, nChamps = 0, nCar = 0;
const fuites = new Map();

function lire(txt, ou, cle) {
  if (typeof txt !== "string" || !txt) return;
  nChamps++; nCar += txt.length;
  let t = txt;
  if (CONTREPREUVE && ou === "decision.why") t = t + " (C22, readiness)";
  for (const { nom, re } of MOTIFS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t))) {
      if (FAUX_AMIS.some((f) => f.mot === m[0])) continue;
      noter("identifiant " + nom + " : « " + m[0] + " »", ou, t, cle);
    }
  }
  for (const d of DICTIONNAIRE) if (d.re.test(t)) noter("jargon : « " + d.mot + " » → " + d.ecrire, ou, t, cle);
}

function noter(quoi, ou, txt, cle) {
  const k = ou + " | " + quoi;
  if (!fuites.has(k)) fuites.set(k, { plans: new Set(), occ: 0, ex: txt.replace(/\s+/g, " ").slice(0, 160) });
  const f = fuites.get(k);
  f.plans.add(cle); f.occ++;
}

console.log("LINT ATHLÈTE — le vocabulaire interne ne sort pas vers l'écran (B2)\n");
const t0 = Date.now();
for (const p of profiles()) {
  let plan;
  try { plan = globalThis.EBV2.buildPlan(p.sport, p.a); } catch { nRefus++; continue; } // refus typé : aucun écran à lire
  nProfils++;
  const v2 = plan && plan._v2;
  if (!v2) continue;
  for (const d of v2.decisions || []) {
    lire(d.what, "decision.what", p.key);
    lire(String(d.val), "decision.val", p.key);
    lire(d.why, "decision.why", p.key);
  }
  for (const w of v2.warnings || []) lire(w, "warning", p.key);
  for (const wk of plan.weeks || []) for (const dy of wk.days || []) for (const s of dy.sessions || []) {
    lire(s.name, "seance.name", p.key); lire(s.det, "seance.det", p.key); lire(s.note, "seance.note", p.key);
  }
}
// LA MESURE SE PROUVE SÉPARÉMENT DE SON RÉSULTAT : un corpus tronqué et un balayage vide
// rendraient tous deux « 0 fuite ».
console.log(`  population : ${nProfils} plans générés + ${nRefus} refus typés = ${nProfils + nRefus} profils (${POPULATION} attendus)`);
console.log(`  couverture : ${nChamps.toLocaleString("fr-FR")} champs athlète lus · ${nCar.toLocaleString("fr-FR")} caractères  [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
console.log(`  motifs     : ${MOTIFS.length} familles d'identifiants dérivées · ${DICTIONNAIRE.length} termes au dictionnaire · ${FAUX_AMIS.length} faux amis nommés\n`);

let sortie = 0;
// Le compte est ÉPINGLÉ et ne se déduit pas du balayage : un corpus tronqué et un balayage
// tronqué se valideraient mutuellement. Plans générés ET refus typés doivent boucler sur la
// population déclarée du golden.
if (nProfils + nRefus !== POPULATION) {
  console.error(`✖ ${nProfils + nRefus} profils balayés pour ${POPULATION} attendus : le « 0 fuite » ne prouverait rien.`);
  sortie = 2;
}
if (!nChamps) { console.error("✖ aucun champ lu — le balayage est vide."); sortie = 2; }

if (fuites.size) {
  const rows = [...fuites.entries()].sort((a, b) => b[1].plans.size - a[1].plans.size);
  console.error(`✖ ${fuites.size} fuite(s) de vocabulaire interne vers l'écran :\n`);
  for (const [k, f] of rows) {
    console.error(`  ${String(f.plans.size).padStart(5)} plans · ${String(f.occ).padStart(6)} occ · ${k}`);
    console.error(`        « ${f.ex} »`);
  }
  sortie = sortie || 1;
} else {
  console.log("✓ 0 fuite — aucun identifiant de règle, aucun terme interne dans un champ lu par l'athlète.");
}
if (CONTREPREUVE) {
  if (fuites.size) { console.log("\n✓ CONTRE-PREUVE : la fuite injectée a été vue. Le gate mesure bien ce qu'il annonce."); process.exit(0); }
  console.error("\n✖ CONTRE-PREUVE : la fuite injectée n'a PAS été vue — le gate est aveugle.");
  process.exit(2);
}
process.exit(sortie);
