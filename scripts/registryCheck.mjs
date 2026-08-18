/**
 * R15.9 — RENDRE LE REGISTRE EXÉCUTABLE (`npm run registry:check`).
 *
 * `BUGS_OUVERTS.md` dit de lui-même qu'« une dette qu'on ne peut pas re-mesurer en une ligne
 * n'est pas une dette, c'est un souvenir ». Ce script applique la phrase au document : il
 * exécute les vérifications que le registre porte et range chaque entrée dans une des trois
 * colonnes que le handoff R15.9 demande.
 *
 * TROIS ÉTATS, jamais deux (retour fondateur « INVENTAIRE DES PLANCHERS » §4, 18/08/2026) :
 *
 *   motif ABSENT      la commande tourne JUSQU'AU BOUT et le motif a disparu → l'entrée est
 *                     devenue fausse, elle passe au §4. C'est un VERDICT.
 *   motif INVALIDE    l'`attendu` n'est pas une regex lisible → le contrôle est CASSÉ.
 *                     (Il tuait le balayage entier avant le 18/08 : erreur d'OUTIL.)
 *   commande EN ÉCHEC le processus meurt (code ≠ 0) sans imprimer son motif → le contrôle
 *                     n'a PAS TOURNÉ. Erreur d'EXÉCUTION, jamais un verdict.
 *
 * Les deux derniers sortent en 1. Le premier sort en 0 — c'est une bonne nouvelle. Ce qu'il
 * ne faut jamais, c'est qu'une commande en échec et un motif absent rendent le même vert.
 *
 * Format des blocs, dans `BUGS_OUVERTS.md` :
 *
 *     ```verify
 *     id: O-3
 *     attendu: /25[.,]\\d %/
 *     cmd: npm run measure:fallback trail
 *     ```
 *
 * `attendu` est une expression régulière cherchée dans la sortie (stdout + stderr). Sa présence
 * signifie « le défaut est encore là, tel que décrit ». Une entrée FERMÉE écrit donc le motif
 * de sa CORRECTION : elle « reproduit » son état corrigé.
 *
 * Code de sortie : 1 dès qu'un contrôle est cassé ou en échec. Une entrée qui ne reproduit plus
 * n'est PAS une erreur — elle est signalée en clair et sort en 0, sauf avec `--strict`.
 * `--seul=<id>` n'exécute qu'une entrée (contre-preuves).
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOC = join(ROOT, "BUGS_OUVERTS.md");
const STRICT = process.argv.includes("--strict");
// `--seul <id>` : n'exécute qu'une entrée. Sert aux CONTRE-PREUVES (une garde qui ne peut se
// vérifier qu'en 10 minutes ne se vérifie pas) — jamais en CI, qui les veut toutes.
const SEUL = (process.argv.find((x) => x.startsWith("--seul=")) || "").slice(7);

function blocs(md) {
  const out = [];
  const re = /```verify\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md))) {
    const champs = {};
    for (const ligne of m[1].split("\n")) {
      const i = ligne.indexOf(":");
      if (i < 0) continue;
      champs[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim();
    }
    if (champs.id && champs.cmd && champs.attendu) out.push(champs);
    else if (Object.keys(champs).length) out.push({ ...champs, _malforme: true });
  }
  return out;
}

const md = readFileSync(DOC, "utf8");
const items = blocs(md).filter((it) => !SEUL || it.id === SEUL);
if (!items.length) {
  console.error("✖ Aucun bloc ```verify``` trouvé dans BUGS_OUVERTS.md — le registre n'est pas exécutable.");
  process.exit(1);
}

const cols = { reproduit: [], perime: [], casse: [] };
console.log("R15.9 — le registre, exécuté\n");
for (const it of items) {
  if (it._malforme) {
    cols.casse.push((it.id || "?") + " : bloc verify incomplet (il faut id, attendu, cmd)");
    console.log("  ✖ " + (it.id || "?").padEnd(12) + "bloc verify incomplet");
    continue;
  }
  let sortie = "", sortiOK = true;
  try {
    sortie = execSync(it.cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    sortie = String((e.stdout || "") + (e.stderr || ""));
    sortiOK = false;
  }
  const m = it.attendu.match(/^\/(.*)\/([a-z]*)$/);
  // Une regex INVALIDE dans un bloc `verify` classe l'ENTRÉE en cassée, elle ne tue pas le
  // balayage : un crash ici tronquait toutes les entrées suivantes en silence — la forme
  // exacte du défaut que ce script existe pour empêcher (règle 17, mesuré le 18/08/2026 sur
  // `attendu: /rabotés (O-54/`, parenthèse non fermée).
  let re;
  try {
    re = m ? new RegExp(m[1], m[2]) : new RegExp(it.attendu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  } catch (e) {
    cols.casse.push(it.id + " : attendu illisible — " + e.message);
    console.log("  ✖ " + it.id.padEnd(12) + "ATTENDU ILLISIBLE — " + e.message);
    continue;
  }
  const trouve = re.test(sortie);
  // LE TROISIÈME ÉTAT (retour fondateur « INVENTAIRE DES PLANCHERS » §4, 18/08/2026) —
  // « une commande qui échoue et une entrée qui ne reproduit plus ne doivent jamais rendre le
  // même vert ». Elles le rendaient : seule une sortie VIDE était classée cassée, donc une
  // commande qui MEURT en crachant une trace (le cas de `mesureO43`, sauvé par hasard par son
  // `2>/dev/null`) partait au filtre regex, n'y trouvait pas son motif, et sortait en
  // « ne reproduit plus » — c'est-à-dire en VERT, avec le sens « le défaut est réparé ».
  //
  // La règle est asymétrique parce que la preuve l'est : sur un processus MORT, l'absence du
  // motif ne prouve rien (le contrôle n'a pas rendu de verdict), tandis que sa PRÉSENCE prouve
  // encore quelque chose (le motif a été imprimé avant la sortie). Un code ≠ 0 n'autorise donc
  // qu'un verdict POSITIF ; il ne peut jamais produire un « ne reproduit plus ».
  // Ce qui reste servi : `audit:v6` sort en 1 quand il trouve une régression et son motif est
  // justement ce qu'on cherche — il continue de rendre « reproduit ».
  if (!sortiOK && !trouve) {
    cols.casse.push(it.id + " : « " + it.cmd + " » a ÉCHOUÉ (code ≠ 0) sans imprimer le motif — verdict impossible"
      + (sortie.trim() ? " · " + sortie.trim().split("\n").pop().slice(0, 120) : " (aucune sortie)"));
    console.log("  ✖ " + it.id.padEnd(12) + "COMMANDE EN ÉCHEC — le contrôle n'a pas rendu de verdict");
  } else if (trouve) {
    cols.reproduit.push(it.id);
    console.log("  ✔ " + it.id.padEnd(12) + "reproduit" + (it.quoi ? " — " + it.quoi : ""));
  } else {
    cols.perime.push(it.id + " : « " + it.attendu + " » ne se retrouve plus dans la sortie de « " + it.cmd + " »");
    console.log("  ~ " + it.id.padEnd(12) + "NE REPRODUIT PLUS → à passer au §4" + (it.quoi ? " — " + it.quoi : ""));
  }
}

console.log("\n" + "─".repeat(72));
console.log("  reproduit : " + cols.reproduit.length
  + "  ·  ne reproduit plus : " + cols.perime.length
  + "  ·  commande cassée : " + cols.casse.length);
if (cols.perime.length) {
  console.log("\n  Entrées devenues FAUSSES — à déplacer au §4 avec leur mesure :");
  for (const p of cols.perime) console.log("    · " + p);
}
if (cols.casse.length) {
  console.error("\n  Commandes cassées — le registre pointe dans le vide :");
  for (const c of cols.casse) console.error("    · " + c);
}
const ko = cols.casse.length > 0 || (STRICT && cols.perime.length > 0);
console.log(ko ? "\n✖ registry:check" : "\n✓ registry:check — le registre dit vrai");
process.exit(ko ? 1 : 0);
