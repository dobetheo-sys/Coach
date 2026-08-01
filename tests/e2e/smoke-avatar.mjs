// R17.1 — GARDE DES DEUX CANAUX DE L'AVATAR.
//
// Le brief avatar pose trois critères exécutables ; ils sont ici, avec leurs identifiants
// d'origine pour qu'on puisse les relire côte à côte avec le document :
//
//   AV1-A  même palier, forme du jour différente → l'équipement et la couleur ne bougent
//          PAS, seules la posture et l'expression changent
//   AV1-B  même forme du jour, palier différent → la posture et l'expression ne bougent
//          PAS, seuls l'équipement et la couleur changent
//   AV6-A  la tête se pose sur un point d'ancrage FIXE, identique quel que soit le reste
//
// Ce sont les deux premiers qui portent la valeur : sans eux, « deux canaux séparés » est
// une intention, pas une propriété. Avant R17.1 la posture venait des séances des 7 derniers
// jours — un signal corrélé au palier — donc AV1-B était structurellement faux.
import { startServer, launchBrowser, makeReporter } from "./harness.mjs";

const PORT = 8592;
const server = await startServer(PORT);
const { ok, info, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });

const rendu = (etat) => page.evaluate(async (v) => {
  const m = await import("./js/ui/avatar.js");
  return m.avatarSVG(v, 120);
}, etat);

// ---- Contrat du module -----------------------------------------------------------------
const meta = await page.evaluate(async () => {
  const m = await import("./js/ui/avatar.js");
  return { moods: m.MOODS.map((x) => x.id), ancrage: m.HEAD_ANCHOR };
});
ok(meta.moods.length === 5, "cinq états de forme du jour (" + meta.moods.join(" · ") + ")");
ok(!!meta.ancrage && Number.isFinite(meta.ancrage.cx) && Number.isFinite(meta.ancrage.cy),
  "le point d'ancrage de la tête est DÉCLARÉ et exporté (" + JSON.stringify(meta.ancrage) + ")");

// ---- La forme du jour se lit depuis le check-in, pas depuis les séances ------------------
const moods = await page.evaluate(async () => {
  const m = await import("./js/ui/avatar.js");
  const jour = "2026-08-01";
  return {
    sansCheckin: m.moodOf(undefined, null, jour),
    feu: m.moodOf({ date: jour, energy: 85 }, null, jour),
    vide: m.moodOf({ date: jour, energy: 15 }, null, jour),
    douleur: m.moodOf({ date: jour, energy: 85 }, { active: true }, jour),
    perime: m.moodOf({ date: "2026-07-01", energy: 85 }, null, jour),
  };
});
ok(moods.sansCheckin === "normal", "sans check-in → état NEUTRE, jamais un visage content par défaut (" + moods.sansCheckin + ")");
ok(moods.feu === "feu" && moods.vide === "vide", "les bornes hautes et basses du check-in donnent bien les états extrêmes");
ok(moods.douleur !== "feu" && moods.douleur !== "frais",
  "drapeau douleur → l'avatar ne peut pas sourire pendant que le bandeau annonce une douleur (" + moods.douleur + ")");
ok(moods.perime === "normal", "un check-in d'un AUTRE jour ne pilote pas l'avatar d'aujourd'hui (" + moods.perime + ")");

// ---- AV1-A — même palier, forme différente ---------------------------------------------
// PRÉCISION APPORTÉE PAR L'IMPLÉMENTATION, et elle compte : « équipement identique » ne peut
// pas vouloir dire « aux mêmes coordonnées ». Les chaussures se posent au bout des jambes ;
// si les jambes bougent, elles bougent. Le critère porte donc sur les PIÈCES PRÉSENTES et
// leur couleur — ce qu'on possède —, pas sur leur position — où le corps les porte. Un test
// écrit sur les coordonnées aurait forcé des chaussures flottantes pour rester vert.
const pieces = (svg) => (svg.match(/data-piece="([^"]+)"/g) || []).sort().join(",");
const couleurs = (svg) => [...new Set(svg.match(/#[0-9a-f]{6}/gi) || [])].sort().join(",");
const calque = (svg, nom) => {
  const re = new RegExp('<g data-layer="' + nom + '">([\\s\\S]*?)</g></g>|<g data-layer="' + nom + '">([\\s\\S]*?)</g>');
  const m = re.exec(svg);
  return m ? (m[1] || m[2] || "") : "ABSENT";
};

const bas = await rendu({ level: 9, accent: "#ff7a1a", streak: 4, mood: "vide" });
const haut = await rendu({ level: 9, accent: "#ff7a1a", streak: 4, mood: "feu" });
ok(bas !== haut, "AV1-A — deux formes du jour différentes produisent bien deux rendus différents");
ok(/data-mood="vide"/.test(bas) && /data-mood="feu"/.test(haut), "AV1-A — le calque visage porte l'état rendu");
ok(pieces(bas) === pieces(haut) && pieces(bas).length > 0,
  "AV1-A — à palier égal, les MÊMES pièces d'équipement sont portées (" + pieces(bas).replace(/data-piece=|"/g, "") + ")");
ok(couleurs(bas) === couleurs(haut),
  "AV1-A — à palier égal, la palette est identique : la forme du jour ne change aucune couleur");
ok(calque(bas, "decor") === calque(haut, "decor"), "AV1-A — le décor ne dépend pas de la forme du jour");

// ---- AV1-B — même forme, palier différent ----------------------------------------------
// Symétrique, et c'est LE critère que l'implémentation précédente ne pouvait pas satisfaire :
// la posture venait des séances des 7 derniers jours, donc elle était corrélée au palier.
const n2 = await rendu({ level: 2, accent: "#ff7a1a", streak: 0, mood: "frais" });
const n15 = await rendu({ level: 15, accent: "#ff7a1a", streak: 7, mood: "frais" });
ok(n2 !== n15, "AV1-B — deux paliers différents produisent bien deux rendus différents");
ok(calque(n2, "posture") === calque(n15, "posture") && calque(n2, "posture") !== "ABSENT",
  "AV1-B — à forme du jour égale, la POSTURE est identique quel que soit le palier");
const visageDe = (svg) => (/<g data-mood="[^"]*">([\s\S]*?)<\/g>/.exec(svg) || [, "ABSENT"])[1];
ok(visageDe(n2) === visageDe(n15) && visageDe(n2) !== "ABSENT",
  "AV1-B — à forme du jour égale, l'EXPRESSION est identique quel que soit le palier");
ok(pieces(n2) !== pieces(n15), "AV1-B — et l'équipement, lui, a bien changé avec le palier");

// ---- AV6-A — l'ancrage de la tête ne bouge jamais ---------------------------------------
const ancrages = [];
for (const mood of meta.moods)
  for (const level of [1, 9, 16]) {
    const svg = await rendu({ level, accent: "#ff7a1a", streak: 3, mood });
    const m = /<circle cx="(\d+)" cy="(\d+)" r="(\d+)" fill="#f6efe0"\/>/.exec(svg);
    ancrages.push(m ? m[1] + "," + m[2] + "," + m[3] : "ABSENT");
  }
ok(new Set(ancrages).size === 1,
  "AV6-A — le crâne se pose au MÊME point sur les 15 combinaisons état × palier (" + [...new Set(ancrages)].join(" / ") + ")");
ok(ancrages[0] === meta.ancrage.cx + "," + meta.ancrage.cy + "," + meta.ancrage.r,
  "AV6-A — et ce point est bien celui que le module DÉCLARE, pas une valeur recopiée");

// ---- Accessibilité : l'état est dit, pas seulement dessiné -------------------------------
const aria = /aria-label="([^"]*)"/.exec(await rendu({ level: 9, accent: "#ff7a1a", streak: 4, mood: "vide" }));
ok(!!aria && /vid/i.test(aria[1]), "l'état de forme est annoncé aux lecteurs d'écran (" + (aria ? aria[1] : "—") + ")");

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");
await browser.close();
server.close();
report();
