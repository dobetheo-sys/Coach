#!/usr/bin/env node
/**
 * Z-05 (cliquet trivial mais bloquant) — AUCUN HÔTE EXTERNE NOUVEAU, plafond = 0.
 *
 * La liste blanche n'est PAS écrite ici : elle est LUE depuis la CSP de `index.html`
 * (`connect-src`) — la leçon de S-CACHE/smoke-securite, une garde qui porte sa propre copie
 * de la règle finit par mesurer sa copie. Tout `https://hôte` référencé par un fichier SERVI
 * et absent de la CSP est un échec : c'est exactement la régression que le prompt de merge
 * classe bloquante (police, CDN, icône distante).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
const ROOT = resolve(import.meta.dirname, "..", "endurabuild");
const html = readFileSync(join(ROOT, "index.html"), "utf8");
// LA LISTE SE LIT DANS LA BALISE <meta>, PAS À LA PREMIÈRE OCCURRENCE DU MOT : ma première
// écriture attrapait un COMMENTAIRE qui précède la CSP dans le fichier, rendait une liste
// blanche vide, et rougissait sur les hôtes que la CSP autorise — une garde qui mesurait sa
// propre erreur de lecture (la famille d'instruments de R20.1, dans la garde qui vient d'être
// écrite pour l'empêcher). Corrigée avant d'être commitée, et c'est écrit.
const meta = html.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/)?.[0] ?? "";
const csp = meta.match(/connect-src([^;]+)/)?.[1] ?? "";
const BLANCS = new Set((csp.match(/https:\/\/[^\s"']+/g) || []).map((u) => new URL(u.replace("*.", "x.")).host));
console.log("liste blanche (lue de la CSP) :", [...BLANCS].join(" · ") || "(vide)");

const fichiers = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) { if (!/node_modules|assets\/fonts/.test(p)) walk(p); }
    else if (/\.(js|css|html|json|webmanifest)$/.test(e)) fichiers.push(p);
  }
})(ROOT);

/** Une URL ne compte que si sa LIGNE porte un contexte qui DÉCLENCHE un chargement.
 *  Ma deuxième écriture comptait toute URL du code — et rougissait sur les 62 citations
 *  bibliographiques des Éducatifs (R26), du TEXTE affiché à l'athlète, jamais requêté.
 *  Une ancre cliquable est une navigation choisie, pas un chargement de page : hors sujet
 *  aussi. Restent les contextes qui font réellement partir une requête au rendu. */
const REQUETE = /fetch\s*\(|XMLHttpRequest|EventSource|WebSocket|sendBeacon|importScripts|\bsrc\s*=|<link[^>]*href|@import|url\s*\(\s*['"]?https?:/i;
let echecs = 0;
for (const f of fichiers) {
  const src = readFileSync(f, "utf8");
  const lignes = src.split("\n");
  lignes.forEach((l, i) => {
    if (!REQUETE.test(l)) return;
    for (const m of l.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
      const host = m[1].toLowerCase();
      if ([...BLANCS].some((b) => host === b || (b.startsWith("x.") && host.endsWith(b.slice(1))))) continue;
      if (/w3\.org/.test(host)) continue;                        // namespace SVG/XML, pas un hôte
      if (/^\s*(\/\/|\*|\/\*|<!--)/.test(l.trim())) continue; // commentaire : doc, pas requête
      console.log(`✖ ${f.replace(ROOT, "")}:${i + 1} — ${host} : ${l.trim().slice(0, 80)}`);
      echecs++;
    }
  });
}
console.log(echecs ? `\n✖ Z-05 : ${echecs} référence(s) d'hôte hors CSP.` : "\n✓ Z-05 : aucun hôte externe hors liste blanche (plafond 0).");
process.exit(echecs ? 1 : 0);
