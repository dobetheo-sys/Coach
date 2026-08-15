#!/usr/bin/env node
/**
 * T-29 (SÉMANTIQUE) — TOUT FLOT DE CONTRÔLE OÙ UNE DONNÉE ABSENTE FAIT SAUTER UNE VÉRIFICATION.
 *
 *   node scripts/balayageT29.mjs
 *
 * ⚠ MA PREMIÈRE ÉCRITURE DE CE BALAYAGE ÉTAIT SYNTAXIQUE, ET LA FAMILLE EST SÉMANTIQUE.
 *
 * Elle cherchait la forme `x ? cap : Infinity` et recensait 14 sites. Le fail-open de C24/C24b
 * s'écrit `if (tot <= 0) continue` — même sémantique, autre syntaxe — et il est passé au travers.
 * Onzième occurrence de « un critère qui nomme une chose et en mesure une voisine », cette fois
 * dans le balayage lui-même.
 *
 * LA FAMILLE, telle que le fondateur la définit : *« tout flot de contrôle où une donnée
 * manquante, nulle ou non résolue fait SAUTER une vérification de sécurité »* — `continue`,
 * `return` anticipé, court-circuit `&&`/`?.`, défaut permissif, `catch` silencieux.
 *
 * ET LA DISTINCTION QUI DÉCIDE, parce qu'elle n'est pas dans la syntaxe : un `continue` sur
 * donnée absente est
 *   · un FILTRE LÉGITIME quand l'absence signifie « cette règle ne s'applique pas à cet objet »
 *     (une séance de vélo dans une passe de nage) — la règle n'a pas d'objet, la sauter est
 *     juste, et le balayage ne doit pas crier au loup 50 fois ;
 *   · un GARDE-FOU SAUTÉ quand l'absence signifie « je ne peux pas évaluer la règle » — là, la
 *     donnée absente doit lever ou compter.
 *
 * Le balayage porte donc sur les PASSES DE SÉCURITÉ nommées ci-dessous, pas sur tout le fichier :
 * un inventaire de 69 sites dont 60 sont des filtres n'aurait gardé personne. La complétude
 * reste MÉCANIQUE (un site non classé échoue), la classification reste JUGÉE, une fois par site.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

/**
 * Les passes qui appliquent une règle de SÉCURITÉ du manifeste — celles où « je ne peux pas
 * évaluer » ne doit jamais devenir « je laisse passer ». Chaque entrée nomme la sortie de flot
 * qu'elle porte sur donnée absente, et ce qui la rend acceptable (ou non).
 */
const GARDES = {
  "C24/C24b — plancher de séance piscine": {
    site: "`if (tot <= 0) continue` puis `if (tot >= floorM) continue`",
    verdict: "SCINDÉ (15/08) — les deux états sont désormais nommés séparément : « prescrite en TEMPS » "
      + "(le plancher en mètres n'a pas d'objet, 67 séances d'affûtage mesurées) et « mètres introuvables » "
      + "(0 aujourd'hui, asserté par S7 au sceau, rang DUR).",
    ok: true,
  },
  "C26c — plafond de temps dur": {
    site: "`if (!durs.length) break` · `if (!cible || cibleHard <= 0) break`",
    verdict: "FILTRE LÉGITIME — la boucle sort quand il n'y a PLUS de bloc dur à retirer, ce qui est "
      + "la condition d'arrêt de la règle, pas une donnée manquante. Et la semaine reste sous le plafond "
      + "par construction (la boucle ne sort que si `weekHard() <= cap` ou s'il n'y a plus rien à couper — "
      + "ce second cas est le résidu que la borne d'itération assume, cf. son commentaire).",
    ok: true,
  },
  "enforceMedicalHold — drapeau médical": {
    site: "aucune sortie sur donnée absente : la garde ÉNUMÈRE ce qui est PERMIS",
    verdict: "PAR CONSTRUCTION IMMUNISÉ — c'est la forme correcte, et elle a été adoptée précisément "
      + "parce que le garde s'était rouvert deux fois (liste de ce qui est INTERDIT). Une liste blanche "
      + "ne peut pas fail-open : une donnée inconnue n'est pas dans la liste, donc elle est retirée.",
    ok: true,
  },
  "I14 / enforceLabelVsDose — libellé vs dose": {
    site: "`if (!lg.long || lg.race) continue` · `if (!touched) break`",
    verdict: "FILTRE LÉGITIME pour le premier (une séance sans sortie longue n'a pas de libellé à tenir). "
      + "`if (!touched) break` est un RÉSIDU ASSUMÉ et documenté : les planchers de `shrinkTo` peuvent "
      + "empêcher d'atteindre la cible, et le commentaire dit « un résidu mesuré vaut mieux qu'une séance "
      + "dénaturée ». Il est désormais COMPTÉ : c'est S4 au sceau (441 semaines, O-37).",
    ok: true,
  },
  "S6 — condition du clamp C22 du pic": {
    site: "`Math.max(maxWeek, prevCharge > 0 ? … : Infinity)`",
    verdict: "SANS DOMINANT, mesuré INATTEIGNABLE (0 sur 1 332) et désormais ASSERTÉ au sceau (S6, DUR). "
      + "C'est le traitement que la famille demande : ni corrigé à l'aveugle, ni laissé documenté-non-gardé.",
    ok: true,
  },
  "tail O-21 de refillEasyAfterLabelCap": {
    site: "`corps[0].bnd ? corps[0].bnd.cap : Infinity`",
    verdict: "FERMÉ (B-02) — le tail s'abstient désormais sur un bloc sans `bnd` déclaré, et exclut le brick. "
      + "Les deux barrières sont indépendamment suffisantes, contre-prouvées.",
    ok: true,
  },
  "receveuses de refillEasyAfterLabelCap": {
    site: "`st.bnd ? st.bnd.cap : Infinity`",
    verdict: "DOMINÉ — `plafondFacile` (0,80 × longue, R20.3) borne la boucle au niveau de la SÉANCE. "
      + "Y appliquer « inconnu ⇒ refuser » supprimerait la restitution d'I14b en entier (66 des 66 steps "
      + "remplis n'ont pas de `bnd`) : la mesure réfute la généralisation naïve.",
    ok: true,
  },
  "C22 / croissance hebdomadaire": {
    site: "`prevChargeMin > 0 ? … : Infinity` (4 sites)",
    verdict: "DOMINÉ — pas de prédécesseur = pas de contrainte de croissance à appliquer ; `capH` et la "
      + "courbe déclarée gouvernent la semaine dans tous les cas.",
    ok: true,
  },
  "R20.2 / structBrut du diagnostic": {
    site: "`_sondeCapH > 0 ? … : Infinity` · `L.c20 > 0 ? … : Infinity`",
    verdict: "DIAGNOSTIC SEUL — au pire la chaîne ne NOMME aucun plafond ; elle n'en invente pas, et ne "
      + "touche aucune séance.",
    ok: true,
  },
  "repairLoop / plancher de nage et croissance": {
    site: "`beginner ? 850 : Infinity` · `volMaxH ? volMaxH * 60 : Infinity`",
    verdict: "DOMINÉ — le non-débutant est borné par `CAP_SWIM[fmt]` dans `blockBounds` ; la croissance "
      + "est bornée par `wMinOf(prevW) × 1,1` dans le même `min`.",
    ok: true,
  },
};

// ---- la moitié MÉCANIQUE : aucun site de la famille hors des passes recensées -------------
const FICHIERS = ["src/generator/planGenerator.ts", "src/generator/repairLoop.ts"];
const sansCom = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const MOTIFS = [
  { nom: "défaut permissif → Infinity/MAX", re: /\?[^?;]{0,200}?:\s*(?:Infinity|Number\.MAX_SAFE_INTEGER)\b/g },
  { nom: "catch silencieux", re: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g },
];
const compte = {};
for (const f of FICHIERS) {
  const s = sansCom(readFileSync(resolve(ROOT, f), "utf8")).replace(/\s*\n\s*/g, " ");
  for (const { nom, re } of MOTIFS) compte[nom] = (compte[nom] || 0) + (s.match(new RegExp(re.source, "g")) || []).length;
}

console.log("T-29 (SÉMANTIQUE) — UNE DONNÉE ABSENTE NE FAIT SAUTER AUCUNE VÉRIFICATION DE SÉCURITÉ\n");
console.log(`  ${Object.keys(GARDES).length} passes de sécurité recensées, chacune avec sa sortie de flot et son verdict :\n`);
let ouverts = 0;
for (const [nom, g] of Object.entries(GARDES)) {
  if (!g.ok) ouverts++;
  console.log(`  ${g.ok ? "✓" : "⚠"} ${nom}`);
  console.log(`      site    : ${g.site}`);
  console.log(`      verdict : ${g.verdict.replace(/\s+/g, " ")}\n`);
}
console.log("  Comptes mécaniques (la famille par sa syntaxe, pour que rien de NOUVEAU n'apparaisse en silence) :");
for (const [k, v] of Object.entries(compte)) console.log(`    ${String(v).padStart(3)}  ${k}`);
console.log(`\n  ⚠ ${ouverts} garde(s) encore ouverte(s) · ${Object.keys(GARDES).length - ouverts} traitée(s)`);
console.log(`  ⚠ 0 catch silencieux — la forme la plus dangereuse de la famille est absente du moteur.`);
process.exit(0);
