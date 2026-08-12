// ZENNA_SPEC_COMPLETE.md — GÉNÉRÉ depuis les sources, jamais écrit à la main.
//
// POURQUOI GÉNÉRÉ. Le fondateur demande un « fichier source de vérité des tokens ». Un document
// écrit à la main qui RECOPIE des valeurs devient faux à la première retouche de CSS — et il est
// alors pire que rien, parce qu'on le croit. Ce dépôt a déjà payé ça (O-9 : une documentation
// qui disait vert pendant qu'un banc portait quatre familles d'échecs).
//
// La source de vérité reste donc le CODE ; ce document en est la PHOTOGRAPHIE, régénérée d'une
// commande, et `npm run check:spec` refuse un fichier périmé — même motif que `check:app` et
// `check:sw`. On lit ce fichier pour comprendre le système ; on modifie les valeurs dans les
// fichiers qu'il cite.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const lire = (p) => readFileSync(join(RACINE, p), "utf8");

/** Les déclarations `--x: v;` d'un bloc, dans l'ordre du fichier. */
function variables(src, ouverture) {
  const i = src.indexOf(ouverture);
  if (i < 0) return [];
  const bloc = src.slice(i, src.indexOf("}", i));
  return [...bloc.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gim)]
    .map((m) => ({ nom: m[1], valeur: m[2].trim() }));
}

/** Les commentaires de ROLE d'une échelle : `--fs-xs:11px;  /* … *\/` */
function commentaireDe(src, nom) {
  const m = src.match(new RegExp(nom.replace(/[-]/g, "\\-") + "\\s*:[^;]+;\\s*/\\*\\s*([^*]+?)\\s*\\*/"));
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

const zn = lire("endurabuild/css/zenna-today.css");
const st = lire("endurabuild/css/styles.css");
const icons = lire("endurabuild/js/ui/icons.js");
const shop = lire("endurabuild/js/shop-catalog.js");
const brand = lire("endurabuild/js/ui/brand.js");

const toutes = variables(zn, "body.theme-zenna {");
// TROIS FAMILLES dans un même bloc, et les distinguer change ce qu'on comprend du système :
//  · `--zn-*`      : la palette Zenna proprement dite ;
//  · le RELIAGE    : les variables du thème PAPIER redéfinies pour le sombre — c'est ce qui
//                    fait que tout le CSS historique (`var(--ink)`, `var(--bg2)`…) rend juste
//                    sans avoir été réécrit. Sans elles, la migration aurait touché tout le CSS ;
//  · le MOUVEMENT  : cadence, durées, courbes.
const PAPIER_RELIE = ["--text", "--text2", "--muted", "--ink", "--bg", "--bg2", "--bg3", "--acc", "--gold", "--line"];
const EST_MOUVEMENT = (n) => /^--(beat|dur-|stagger|ease)/.test(n);
const palette = toutes.filter((v) => v.nom.startsWith("--zn-"));
const reliage = toutes.filter((v) => PAPIER_RELIE.includes(v.nom));
const mouvement = toutes.filter((v) => EST_MOUVEMENT(v.nom));
const formes = toutes.filter((v) => !v.nom.startsWith("--zn-") && !PAPIER_RELIE.includes(v.nom) && !EST_MOUVEMENT(v.nom));
const papier = variables(st, ":root{");
const fs = papier.filter((v) => v.nom.startsWith("--fs-"));
const paperCouleurs = papier.filter((v) => !v.nom.startsWith("--fs-"));

const objets = (src, nom) => {
  const i = src.indexOf("export const " + nom);
  if (i < 0) return [];
  const bloc = src.slice(i, src.indexOf("\n};", i));
  return [...bloc.matchAll(/^\s{2,4}"?([a-zA-Z_ àéèêôûç'-]+)"?\s*:\s*\{([^}]+)\}/gm)]
    .map((m) => ({ cle: m[1].trim(), champs: m[2].replace(/\s+/g, " ").trim() }));
};

const disc = objets(icons, "DISC");
const charge = objets(icons, "CHARGE");
const saveurs = objets(shop, "GEL_ZENNA");

const tbl = (entetes, lignes) =>
  "| " + entetes.join(" | ") + " |\n|" + entetes.map(() => "---").join("|") + "|\n"
  + lignes.map((l) => "| " + l.join(" | ") + " |").join("\n");

const pastille = (v) => {
  const hex = (v.match(/#[0-9a-fA-F]{3,8}/) || [])[0];
  return hex ? "`" + hex + "`" : "`" + v.replace(/\|/g, "\\|") + "`";
};

let d = `# ZENNA — spécification des tokens de design

> **CE FICHIER EST GÉNÉRÉ.** \`npm run build:spec\` le régénère depuis le code ;
> \`npm run check:spec\` refuse un fichier périmé (même motif que \`check:app\` / \`check:sw\`).
> **Ne pas l'éditer à la main** : une valeur changée ici ne changerait rien à l'application, et
> un document qu'on croit à jour est plus dangereux que pas de document du tout.
>
> La source de vérité est le CODE. Ce document en est la carte : il dit *où* modifier.

---

## Comment lire ce système

Zenna peint sur **deux surfaces**, et c'est la clé de tout le reste :

| Surface | Où | Fond | Qui la sert |
|---|---|---|---|
| **Sombre** | l'application (les 5 onglets) | \`#000\` → \`#20252c\` | les variables \`--zn-*\`, posées sur \`body.theme-zenna\` |
| **Papier** | le document exporté (imprimable) | \`#f1eadb\` crème | des valeurs **littérales** — ce document est autonome et ne charge aucune variable (R16.8) |

\`body.theme-zenna\` est posée au démarrage et **n'est jamais retirée** : dans l'app, la surface
papier n'est plus atteinte. Ses valeurs subsistent comme repli et pour le document exporté.

Un token qui doit servir les **deux** surfaces se déclare donc en deux temps : la variable pour
le sombre, et une valeur littérale interpolée depuis une table JS pour le papier. C'est le cas
de l'axe de charge ci-dessous, et c'est le seul motif qui traverse les deux.

---

## 1 · Tokens du thème sombre — \`endurabuild/css/zenna-today.css\`

Tout est déclaré sur \`body.theme-zenna\` : **${toutes.length} variables**, en trois familles.

### 1a · Palette Zenna — ${palette.length} tokens

${tbl(["Token", "Valeur"], palette.map((v) => ["`" + v.nom + "`", pastille(v.valeur)]))}

### 1b · Reliage du thème papier — ${reliage.length} tokens

**C'est le mécanisme qui a rendu la migration possible.** Le thème sombre ne réécrit pas le CSS
historique : il REDÉFINIT les variables que ce CSS consomme déjà. Une règle écrite en 2026 avec
\`var(--ink)\` rend donc juste sur les deux surfaces, sans avoir été touchée.

${tbl(["Token papier", "Valeur en sombre"], reliage.map((v) => ["`" + v.nom + "`", pastille(v.valeur)]))}

### 1c · Mouvement — ${mouvement.length} tokens

${tbl(["Token", "Valeur"], mouvement.map((v) => ["`" + v.nom + "`", "`" + v.valeur + "`"]))}

### 1d · Formes et plans — ${formes.length} tokens

${tbl(["Token", "Valeur"], formes.map((v) => ["`" + v.nom + "`", "`" + v.valeur.slice(0, 70) + "`"]))}

---

## 2 · Axe de CHARGE — \`endurabuild/js/ui/icons.js\` → \`CHARGE\`

La lecture « d'un coup d'œil » de la semaine : dur / facile / récup. **C'est le seul token qui
existe sur les deux surfaces**, donc le seul qui porte deux valeurs.

${tbl(["Charge", "Champs (source JS)"], charge.map((c) => ["`" + c.cle + "`", "`" + c.champs + "`"]))}

Le jumeau CSS (\`--zn-charge-*-rgb\`, \`--zn-charge-*-papier\`) est déclaré dans \`zenna-today.css\`
et **ne peut pas diverger** : \`tests/e2e/smoke-charge.mjs\` compare les deux sur le rendu réel,
vérifie que les bordures descendent bien du token, que le document exporté porte les valeurs
papier, et qu'aucune règle de charge ne porte de littéral.

*Le triplet (\`255 61 0\`) plutôt qu'une couleur finie : le sombre l'emploie à plusieurs
opacités, une couleur figée obligerait à en déclarer une par opacité.*

---

## 3 · Accents de DISCIPLINE — \`endurabuild/js/ui/icons.js\` → \`DISC\`

Un athlète qui a vu son vélo en bleu doit le retrouver bleu partout : avatar, cartes de sport,
badge de la carte de séance, anneaux de la semaine.

${tbl(["Code", "Champs"], disc.map((c) => ["`" + c.cle + "`", "`" + c.champs + "`"]))}

*\`trail\` et \`swimrun\` n'ont pas de code propre — le moteur les émet en \`rn\`/\`sw\` — et héritent
donc de ces accents.*

**Contrainte mesurée** : sur le fond de carte sombre (\`--zn-surface-3\`), un badge qui porte de
l'information doit atteindre **3:1** (WCAG 1.4.11). Aucune dilution n'y arrive — le bleu du vélo
plafonne à 3,33:1 **en plein**. Les badges sont donc des tuiles pleines, jamais des teintes.

---

## 4 · Échelle typographique — \`endurabuild/css/styles.css\`

Sept paliers, **un par rôle**. L'échelle gouverne le TEXTE ; un glyphe décoratif se dimensionne
en \`em\` relativement à son porteur (R16.8). Plancher de lisibilité : **9 px**, gardé par
\`smoke-typo.mjs\` sur les cinq onglets.

${tbl(["Token", "Valeur", "Rôle"], fs.map((v) => ["`" + v.nom + "`", "`" + v.valeur + "`", commentaireDe(st, v.nom) || "—"]))}

---

## 5 · Palette papier — \`endurabuild/css/styles.css\`

Sert le document exporté et le repli. ${paperCouleurs.length} variables.

${tbl(["Token", "Valeur"], paperCouleurs.map((v) => ["`" + v.nom + "`", pastille(v.valeur)]))}

---

## 6 · Marque — \`endurabuild/js/ui/brand.js\`

${tbl(["Élément", "Valeur"], [
  ["mot-marque", "`" + ((brand.match(/mot:\s*"([^"]+)"/) || [])[1] || "?") + "`"],
  ["encre du logo", "`" + ((brand.match(/encre:\s*"([^"]+)"/) || [])[1] || "?") + "` — échantillonnée sur le logo fourni"],
  ["fond d'icône", "`" + ((brand.match(/fondIcone:\s*"([^"]+)"/) || [])[1] || "?") + "`"],
  ["géométrie", "`MARQUE.contours` — deux contours (0-100), lus par le SVG de l'app **et** le générateur d'icônes PNG"],
])}

*La géométrie ne vit qu'ici. Elle a existé en trois endroits (SVG, icônes, favicone en data-URI
de 21,6 Ko) — c'est ce que R-ZENNA v8 a corrigé.*

---

## 7 · Produit — \`endurabuild/js/shop-catalog.js\` → \`GEL_ZENNA\`

${tbl(["Saveur", "Champs"], saveurs.map((c) => ["`" + c.cle + "`", "`" + c.champs + "`"]))}

**Deux encres par saveur, et ce n'est pas de la coquetterie** : \`bloc\` est la couleur vive de la
maquette (le pan diagonal), \`texte\` sa version assombrie pour écrire sur le crème du sachet.
Mesuré : l'olive du citron rend **3,08:1** sur le crème, sous le seuil AA de 4,5.

---

## Ce qui N'EXISTE PAS — à savoir avant d'en chercher

| Famille | État |
|---|---|
| Espacement (\`--zn-space-*\`) | **aucun token.** Tout \`padding\`/\`margin\` du dépôt est littéral. |
| Rayon (\`--zn-radius-*\`) | **aucun token.** Idem pour \`border-radius\`. |
| Ombre, élévation | aucun token ; les ombres sont littérales. |
| Durées d'animation | **elles existent** — voir §1c. |

*Le dire explicitement évite la question suivante : « où est le token d'espacement ? » — il n'y
en a pas, et poser une échelle d'espacement est un chantier à part entière.*

---

## Les gardes qui tiennent ces tokens

| Garde | Ce qu'elle tient |
|---|---|
| \`npm run check:spec\` | ce document est à jour avec le code |
| \`tests/e2e/smoke-charge.mjs\` | l'axe de charge : table ≡ tokens ≡ rendu ≡ export, et zéro littéral |
| \`tests/e2e/smoke-carte-seance.mjs\` | les badges de discipline atteignent 3:1 sur le fond sombre |
| \`tests/e2e/smoke-typo.mjs\` | l'échelle typographique et son plancher de 9 px |
| \`tests/e2e/smoke-zenna.mjs\` | aucun texte sous le seuil AA sur les cinq onglets |
| \`tests/e2e/smoke-shop.mjs\` | les saveurs produit et leurs illustrations |
`;

const CIBLE = join(RACINE, "ZENNA_SPEC_COMPLETE.md");
if (process.argv.includes("--check")) {
  let actuel = "";
  try { actuel = readFileSync(CIBLE, "utf8"); } catch (e) { actuel = ""; }
  if (actuel !== d) {
    console.error("✗ ZENNA_SPEC_COMPLETE.md est PÉRIMÉ — relance `npm run build:spec`.");
    console.error("  (le document recopie des valeurs du code ; périmé, il ment.)");
    process.exit(1);
  }
  console.log("✓ ZENNA_SPEC_COMPLETE.md à jour — " + toutes.length + " tokens sombres, "
    + charge.length + " charges, " + disc.length + " disciplines, " + fs.length + " paliers typographiques.");
} else {
  writeFileSync(CIBLE, d);
  console.log("✓ ZENNA_SPEC_COMPLETE.md écrit — " + d.length + " car., "
    + toutes.length + " tokens sombres, " + charge.length + " charges, " + disc.length + " disciplines.");
}
